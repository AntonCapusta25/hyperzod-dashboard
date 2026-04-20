-- =====================================================
-- BYPASS DETECTION SYSTEM - DATABASE SCHEMA (RESILLIENT V4 - ORCHESTRATION)
-- =====================================================

-- 1. Bypass Flags Table
CREATE TABLE IF NOT EXISTS public.bypass_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_type text NOT NULL,
  user_id integer REFERENCES public.clients(hyperzod_id) ON DELETE CASCADE,
  merchant_id text NOT NULL,
  evidence_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'false_positive', 'confirmed')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Update Check Constraint for all supported anomaly types
ALTER TABLE public.bypass_flags DROP CONSTRAINT IF EXISTS bypass_flags_flag_type_check;
ALTER TABLE public.bypass_flags ADD CONSTRAINT bypass_flags_flag_type_check 
  CHECK (flag_type IN (
    'poached_customer', 
    'high_churn_chef', 
    'suspicious_cart_value', 
    'contact_leak', 
    'aov_crash',
    'phantom_merchant',
    'voucher_abuse',
    'refund_predator',
    'multi_account'
  ));

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
CREATE TABLE IF NOT EXISTS public.security_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id integer REFERENCES public.clients(hyperzod_id) ON DELETE CASCADE,
  merchant_id text,
  reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_security_exceptions_unique 
ON public.security_exceptions (COALESCE(user_id, -1), COALESCE(merchant_id, 'ALL'));

ALTER TABLE public.security_exceptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full access to security_exceptions" ON public.security_exceptions;
CREATE POLICY "Admins full access to security_exceptions" ON public.security_exceptions FOR ALL TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role can read exceptions" ON public.security_exceptions;
CREATE POLICY "Service role can read exceptions" ON public.security_exceptions FOR SELECT TO service_role USING (true);


-- =====================================================
-- 3. Analysis Functions (Standard Detections)
-- =====================================================

DROP FUNCTION IF EXISTS detect_poached_customers();
DROP FUNCTION IF EXISTS detect_high_churn_chefs();
DROP FUNCTION IF EXISTS detect_contact_leaks();
DROP FUNCTION IF EXISTS detect_aov_crash();
DROP FUNCTION IF EXISTS detect_platform_churn();

-- Detect Platform Churn (Lost Customers)
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


-- =====================================================
-- 4. Advanced Anomaly Detection (Highly Suspicious Patterns)
-- =====================================================

DROP FUNCTION IF EXISTS detect_multi_account();
DROP FUNCTION IF EXISTS detect_phantom_merchants();
DROP FUNCTION IF EXISTS detect_refund_predators();

-- Detect Multi-Accounting (IP/Device Reuse)
CREATE OR REPLACE FUNCTION detect_multi_account()
RETURNS TABLE (
    p_ip text,
    p_device text,
    user_ids integer[],
    order_count bigint,
    last_event timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.ip,
        o.device,
        array_agg(DISTINCT o.user_id) as u_ids,
        COUNT(*) as o_count,
        MAX(to_timestamp(o.created_timestamp)) as l_event
    FROM public.orders o
    WHERE o.ip IS NOT NULL AND o.user_id IS NOT NULL
    GROUP BY o.ip, o.device
    HAVING COUNT(DISTINCT o.user_id) >= 2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Detect Phantom Merchants (Revenue Concentration)
CREATE OR REPLACE FUNCTION detect_phantom_merchants()
RETURNS TABLE (
    p_merchant_id text,
    p_merchant_name text,
    total_revenue numeric,
    top_customer_share numeric,
    customer_count bigint
) AS $$
BEGIN
    RETURN QUERY
    WITH merchant_stats AS (
        SELECT 
            merchant_id,
            SUM(order_amount) as total_amt,
            COUNT(DISTINCT user_id) as c_count
        FROM public.orders
        WHERE order_status = 5
        GROUP BY merchant_id
    ),
    top_customer AS (
        SELECT 
            merchant_id,
            user_id,
            SUM(order_amount) as customer_amt,
            ROW_NUMBER() OVER(PARTITION BY merchant_id ORDER BY SUM(order_amount) DESC) as rank
        FROM public.orders
        WHERE order_status = 5
        GROUP BY merchant_id, user_id
    )
    SELECT 
        ms.merchant_id,
        COALESCE(m.name, ms.merchant_id) as p_merchant_name,
        ms.total_amt::numeric,
        ROUND((tc.customer_amt / ms.total_amt) * 100, 2) as share,
        ms.c_count
    FROM merchant_stats ms
    JOIN top_customer tc ON ms.merchant_id = tc.merchant_id
    LEFT JOIN public.merchants m ON (ms.merchant_id = m.hyperzod_merchant_id OR ms.merchant_id = m.merchant_id)
    WHERE tc.rank = 1 
      AND ms.c_count >= 1
      AND (tc.customer_amt / ms.total_amt) >= 0.80 -- 80% revenue from one customer
      AND ms.total_amt > 50; -- Minimum threshold to avoid noise
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Detect Refund Predators (High Cancellation Rate)
CREATE OR REPLACE FUNCTION detect_refund_predators()
RETURNS TABLE (
    p_user_id integer,
    total_orders bigint,
    cancelled_orders bigint,
    refund_rate numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.user_id,
        COUNT(*) as t_orders,
        SUM(CASE WHEN o.order_status IN (4, 6) THEN 1 ELSE 0 END) as c_orders,
        ROUND((SUM(CASE WHEN o.order_status IN (4, 6) THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric) * 100, 2) as r_rate
    FROM public.orders o
    WHERE o.user_id IS NOT NULL
    GROUP BY o.user_id
    HAVING COUNT(*) >= 3 AND (SUM(CASE WHEN o.order_status IN (4, 6) THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric) >= 0.50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 5. AUDIT ORCHESTRATOR (RPC-ONLY MODE)
-- =====================================================

DROP FUNCTION IF EXISTS run_security_audit();

CREATE OR REPLACE FUNCTION run_security_audit()
RETURNS json AS $$
DECLARE
    v_count int := 0;
    r record;
BEGIN
    -- 1. Poached Customers
    FOR r IN SELECT * FROM detect_poached_customers() LOOP
        INSERT INTO bypass_flags (flag_type, user_id, merchant_id, evidence_data)
        VALUES ('poached_customer', r.p_user_id, r.p_merchant_id, 
               jsonb_build_object('total_orders', r.pair_orders, 'days_since_chef', r.days_since_merchant, 'days_since_platform', r.days_since_platform))
        ON CONFLICT (flag_type, merchant_id, COALESCE(user_id, -1)) 
        DO UPDATE SET evidence_data = EXCLUDED.evidence_data, updated_at = now();
        v_count := v_count + 1;
    END LOOP;

    -- 2. Contact Leaks
    FOR r IN SELECT * FROM detect_contact_leaks() LOOP
        INSERT INTO bypass_flags (flag_type, user_id, merchant_id, evidence_data)
        VALUES ('contact_leak', r.p_user_id, r.p_merchant_id, 
               jsonb_build_object('note', r.leaked_note, 'order_id', r.p_order_id))
        ON CONFLICT (flag_type, merchant_id, COALESCE(user_id, -1)) 
        DO UPDATE SET evidence_data = EXCLUDED.evidence_data, updated_at = now();
        v_count := v_count + 1;
    END LOOP;

    -- 3. Multi-Account
    FOR r IN SELECT * FROM detect_multi_account() LOOP
        INSERT INTO bypass_flags (flag_type, user_id, merchant_id, evidence_data)
        VALUES ('multi_account', r.user_ids[1], 'GLOBAL', 
               jsonb_build_object('shared_ip', r.p_ip, 'shared_device', r.p_device, 'linked_accounts', array_length(r.user_ids, 1), 'total_orders', r.order_count))
        ON CONFLICT (flag_type, merchant_id, COALESCE(user_id, -1)) 
        DO UPDATE SET evidence_data = EXCLUDED.evidence_data, updated_at = now();
        v_count := v_count + 1;
    END LOOP;

    -- 4. Phantom Merchant
    FOR r IN SELECT * FROM detect_phantom_merchants() LOOP
        INSERT INTO bypass_flags (flag_type, user_id, merchant_id, evidence_data)
        VALUES ('phantom_merchant', NULL, r.p_merchant_id, 
               jsonb_build_object('total_revenue', r.total_revenue, 'concentration', r.top_customer_share, 'unique_customers', r.customer_count))
        ON CONFLICT (flag_type, merchant_id, COALESCE(user_id, -1)) 
        DO UPDATE SET evidence_data = EXCLUDED.evidence_data, updated_at = now();
        v_count := v_count + 1;
    END LOOP;

    -- 5. Refund Predators
    FOR r IN SELECT * FROM detect_refund_predators() LOOP
        INSERT INTO bypass_flags (flag_type, user_id, merchant_id, evidence_data)
        VALUES ('refund_predator', r.p_user_id, 'GLOBAL', 
               jsonb_build_object('total_orders', r.total_orders, 'cancelled', r.cancelled_orders, 'refund_rate', r.refund_rate))
        ON CONFLICT (flag_type, merchant_id, COALESCE(user_id, -1)) 
        DO UPDATE SET evidence_data = EXCLUDED.evidence_data, updated_at = now();
        v_count := v_count + 1;
    END LOOP;

    RETURN json_build_object('success', true, 'count', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 6. Backfill & Setup
-- =====================================================

-- Backfill Initial Client Statistics
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

-- Ensure pg_cron job is set (Now calls the RPC directly!)
DO $$
BEGIN
  PERFORM cron.schedule(
      'run-security-audit-cron',
      '30 23 * * 0',
      'SELECT public.run_security_audit()'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
