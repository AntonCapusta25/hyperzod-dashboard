-- =====================================================
-- BYPASS DETECTION SYSTEM - DATABASE SCHEMA (RESILLIENT V2)
-- =====================================================

-- 1. Bypass Flags Table
CREATE TABLE IF NOT EXISTS public.bypass_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_type text NOT NULL CHECK (flag_type IN ('poached_customer', 'high_churn_chef', 'suspicious_cart_value', 'contact_leak', 'aov_crash')),
  user_id integer REFERENCES public.clients(hyperzod_id) ON DELETE CASCADE,
  merchant_id text NOT NULL,
  evidence_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'false_positive', 'confirmed')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Unique index to prevent duplicates
DROP INDEX IF EXISTS idx_bypass_flags_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_bypass_flags_unique 
ON public.bypass_flags (flag_type, merchant_id, COALESCE(user_id, -1));

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_bypass_flags_updated_at ON public.bypass_flags;
CREATE TRIGGER update_bypass_flags_updated_at BEFORE UPDATE ON public.bypass_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.bypass_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full access to bypass_flags" ON public.bypass_flags;
CREATE POLICY "Admins full access to bypass_flags" ON public.bypass_flags FOR ALL TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role can orchestrate bypass flags" ON public.bypass_flags;
CREATE POLICY "Service role can orchestrate bypass flags" ON public.bypass_flags FOR ALL TO service_role USING (true);


-- 2. Security Exceptions Table
-- Entities to ignore in automated scanning
CREATE TABLE IF NOT EXISTS public.security_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id integer REFERENCES public.clients(hyperzod_id) ON DELETE CASCADE,
  merchant_id text,
  reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Unique constraint: an exception for a client, a merchant, or a specific pair
CREATE UNIQUE INDEX IF NOT EXISTS idx_security_exceptions_unique 
ON public.security_exceptions (COALESCE(user_id, -1), COALESCE(merchant_id, 'ALL'));

-- Enable RLS
ALTER TABLE public.security_exceptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full access to security_exceptions" ON public.security_exceptions;
CREATE POLICY "Admins full access to security_exceptions" ON public.security_exceptions FOR ALL TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role can read exceptions" ON public.security_exceptions;
CREATE POLICY "Service role can read exceptions" ON public.security_exceptions FOR SELECT TO service_role USING (true);


-- =====================================================
-- 3. Analysis Functions (Improved RPCs for Phase 2)
-- =====================================================

-- Drop existing functions first to allow changing return types
DROP FUNCTION IF EXISTS detect_poached_customers();
DROP FUNCTION IF EXISTS detect_high_churn_chefs();
DROP FUNCTION IF EXISTS detect_contact_leaks();
DROP FUNCTION IF EXISTS detect_aov_crash();
DROP FUNCTION IF EXISTS detect_platform_churn();

-- [NEW] Detect Platform Churn (Lost Customers)
CREATE OR REPLACE FUNCTION detect_platform_churn(p_days_threshold int DEFAULT 1)
RETURNS TABLE (
    p_user_id integer,
    p_full_name text,
    p_email text,
    p_mobile text,
    p_last_order_date timestamp with time zone,
    p_total_spent numeric,
    p_total_orders int,
    p_days_since_last int
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.hyperzod_id,
        c.full_name,
        c.email,
        c.mobile,
        c.last_order_date,
        c.total_spent::numeric,
        c.total_orders,
        EXTRACT(DAY FROM (now() - c.last_order_date))::int as days_since_last
    FROM public.clients c
    WHERE c.last_order_date < (now() - (p_days_threshold || ' days')::interval)
      AND c.email_unsubscribed = false
      AND c.total_orders > 0
      -- Exclude users already in the exceptions list (global ignore)
      AND NOT EXISTS (
        SELECT 1 FROM public.security_exceptions se 
        WHERE se.user_id = c.hyperzod_id AND se.merchant_id IS NULL
      )
    ORDER BY c.total_spent DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Detect Poached Customers
CREATE OR REPLACE FUNCTION detect_poached_customers()
RETURNS TABLE (
    p_user_id integer,
    p_merchant_id text,
    p_merchant_name text,
    pair_orders bigint,
    last_pair_order timestamp with time zone,
    last_overall_order timestamp with time zone,
    days_since_merchant int,
    days_since_platform int
) AS $$
BEGIN
    RETURN QUERY
    WITH pairs AS (
        SELECT user_id, merchant_id, COUNT(*) as p_orders, MAX(to_timestamp(created_timestamp)) as p_last_order
        FROM public.orders 
        WHERE order_status = 5 AND user_id IS NOT NULL
        GROUP BY user_id, merchant_id
    ),
    overall AS (
        SELECT user_id, MAX(to_timestamp(created_timestamp)) as o_last_order
        FROM public.orders 
        WHERE order_status = 5 AND user_id IS NOT NULL
        GROUP BY user_id
    )
    SELECT 
        p.user_id, 
        p.merchant_id, 
        COALESCE(m.name, p.merchant_id) as p_merchant_name,
        p.p_orders, 
        p.p_last_order, 
        o.o_last_order,
        EXTRACT(DAY FROM (now() - p.p_last_order))::int as days_since_merchant,
        EXTRACT(DAY FROM (now() - o.o_last_order))::int as days_since_platform
    FROM pairs p 
    JOIN overall o ON p.user_id = o.user_id
    LEFT JOIN public.merchants m ON (p.merchant_id = m.hyperzod_merchant_id OR p.merchant_id = m.merchant_id)
    WHERE p.p_orders >= 3 
      AND p.p_last_order < (now() - INTERVAL '1 day')
      AND o.o_last_order > (p.p_last_order + INTERVAL '10 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Detect High Churn Chefs
CREATE OR REPLACE FUNCTION detect_high_churn_chefs()
RETURNS TABLE (
    p_merchant_id text,
    p_merchant_name text,
    total_customers bigint,
    one_time_customers bigint,
    churn_rate numeric,
    last_order_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    WITH chef_customers AS (
       SELECT merchant_id, user_id, COUNT(*) as orders_count
       FROM public.orders 
       WHERE order_status = 5 AND user_id IS NOT NULL
       GROUP BY merchant_id, user_id
    ),
    chef_stats AS (
       SELECT 
          c.merchant_id, 
          COUNT(c.user_id) as t_customers,
          SUM(CASE WHEN c.orders_count = 1 THEN 1 ELSE 0 END) as o_customers
       FROM chef_customers c
       GROUP BY c.merchant_id
    ),
    chef_last_order AS (
        SELECT merchant_id, MAX(to_timestamp(created_timestamp)) as l_order
        FROM public.orders
        WHERE order_status = 5
        GROUP BY merchant_id
    )
    SELECT 
        s.merchant_id, 
        COALESCE(m.name, s.merchant_id) as p_merchant_name,
        s.t_customers, 
        s.o_customers, 
        ROUND((s.o_customers::numeric / s.t_customers::numeric) * 100, 2) as c_rate,
        l.l_order
    FROM chef_stats s
    LEFT JOIN public.merchants m ON (s.merchant_id = m.hyperzod_merchant_id OR s.merchant_id = m.merchant_id)
    LEFT JOIN chef_last_order l ON s.merchant_id = l.merchant_id
    WHERE s.t_customers >= 10 
      AND (s.o_customers::numeric / s.t_customers::numeric) >= 0.85;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Detect Contact Leaks
CREATE OR REPLACE FUNCTION detect_contact_leaks()
RETURNS TABLE (
    p_user_id integer,
    p_merchant_id text,
    p_merchant_name text,
    p_order_id integer,
    leaked_note text,
    event_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.user_id, 
        o.merchant_id, 
        COALESCE(m.name, o.merchant_id) as p_merchant_name,
        o.order_id,
        o.order_note,
        to_timestamp(o.created_timestamp) as event_at
    FROM public.orders o
    LEFT JOIN public.merchants m ON (o.merchant_id = m.hyperzod_merchant_id OR o.merchant_id = m.merchant_id)
    WHERE o.order_note ~* '(\+?[0-9]{10,13}|WhatsApp|PayPal|Zelle|Venmo|@)'
      AND o.created_at > (now() - INTERVAL '1 day');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Detect AOV Crash
CREATE OR REPLACE FUNCTION detect_aov_crash()
RETURNS TABLE (
    p_user_id integer,
    p_merchant_id text,
    p_merchant_name text,
    prev_avg_amount numeric,
    last_order_amount numeric,
    drop_percentage numeric,
    event_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    WITH user_merchant_history AS (
        SELECT 
            user_id, 
            merchant_id, 
            order_amount,
            to_timestamp(created_timestamp) as o_time,
            ROW_NUMBER() OVER(PARTITION BY user_id, merchant_id ORDER BY created_timestamp DESC) as order_rank,
            AVG(order_amount) OVER(PARTITION BY user_id, merchant_id) as overall_avg
        FROM public.orders
        WHERE order_status = 5 AND user_id IS NOT NULL
    ),
    last_orders AS (
        SELECT * FROM user_merchant_history WHERE order_rank = 1
    ),
    previous_stats AS (
        SELECT 
            user_id, 
            merchant_id, 
            AVG(order_amount) as h_avg,
            COUNT(*) as h_count
        FROM user_merchant_history
        WHERE order_rank > 1
        GROUP BY user_id, merchant_id
    )
    SELECT 
        l.user_id, 
        l.merchant_id, 
        COALESCE(m.name, l.merchant_id) as p_merchant_name,
        p.h_avg::numeric,
        l.order_amount::numeric,
        ROUND((1 - (l.order_amount / p.h_avg)) * 100, 2) as drop_percentage,
        l.o_time
    FROM last_orders l
    JOIN previous_stats p ON l.user_id = p.user_id AND l.merchant_id = p.merchant_id
    LEFT JOIN public.merchants m ON (l.merchant_id = m.hyperzod_merchant_id OR l.merchant_id = m.merchant_id)
    WHERE p.h_count >= 2      
      AND p.h_avg >= 15       
      AND l.order_amount <= (p.h_avg * 0.25) 
      AND l.o_time > (now() - INTERVAL '1 day');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 3. Set up pg_cron execution
-- =====================================================

DO $$
BEGIN
  -- We schedule the edge function to run every week on Sunday night at 23:30
  PERFORM cron.schedule(
      'analyze-bypass-behavior-job',   -- Job name
      '30 23 * * 0',                   -- Every Sunday at 23:30 hours
      $q$
      SELECT
        net.http_post(
            url:='https://oyeqtiovqtkwduzkvomr.supabase.co/functions/v1/analyze-bypass-behavior',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95ZXF0aW92cXRrd2R1emt2b21yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMxOTI3MiwiZXhwIjoyMDgzODk1MjcyfQ.LNYzKdJUYYdCOvMqKdHwHPLxYsGBbRQcOjMPUxPQqnI"}'::jsonb,
            body:='{}'::jsonb
        ) as request_id;
      $q$
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 4. Backfill Initial Client Statistics
UPDATE public.clients c
SET 
  last_order_date = stats.last_order,
  total_orders = stats.order_count,
  total_spent = stats.sum_amount
FROM (
  SELECT 
    user_id, 
    MAX(to_timestamp(created_timestamp)) as last_order,
    COUNT(*) as order_count,
    SUM(order_amount) as sum_amount
  FROM public.orders
  WHERE order_status = 5 AND user_id IS NOT NULL
  GROUP BY user_id
) AS stats
WHERE c.hyperzod_id = stats.user_id;
