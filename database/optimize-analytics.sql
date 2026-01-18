-- Optimizes analytics queries by moving logic to database
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_weekly_analytics_v2(
  start_ts bigint,
  end_ts bigint,
  city_filter text DEFAULT NULL
) 
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- run with privileges of creator (service role) to start, or adjust RLS
AS $$
DECLARE
  completed_orders_count bigint;
  unique_customers_count bigint;
  new_customers_count bigint;
  total_revenue numeric;
  active_chefs_count bigint;
  manual_rev numeric;
  orders_rev numeric;
  
  -- New KPI variables
  average_order_value numeric;
  cancellation_rate numeric;
  on_time_delivery_rate numeric;
  total_orders_count bigint;
  cancelled_orders_count bigint;
  on_time_orders_count bigint;
  
  -- Internal variables
  matching_address_ids uuid[];
  all_period_order_ids integer[]; -- user_ids
  active_chefs_amsterdam bigint;
  completed_orders_amsterdam bigint;
BEGIN

  -- 1. Identify matching address IDs if city filter is present
  IF city_filter IS NOT NULL THEN
    SELECT array_agg(id) INTO matching_address_ids
    FROM delivery_addresses
    WHERE city ILIKE '%' || city_filter || '%' OR address ILIKE '%' || city_filter || '%';
    
    -- If city filter provided but no addresses found, return zeros (except manual revenue if we include it)
    IF matching_address_ids IS NULL THEN
        matching_address_ids := '{}'; -- empty array
    END IF;
  END IF;

  -- 2. Calculate Order Metrics (Revenue, Count, Active Chefs)
  -- using a Common Table Expression (CTE) for filtered orders
  WITH filtered_orders AS (
    SELECT 
      o.user_id, 
      o.order_status, 
      o.order_amount,
      o.merchant_id,
      o.delivery_address_id,
      o.delivery_timestamp,
      o.created_timestamp
    FROM orders o
    WHERE o.created_timestamp >= start_ts 
      AND o.created_timestamp <= end_ts
      -- Apply city filter if needed
      AND (city_filter IS NULL OR o.delivery_address_id = ANY(matching_address_ids))
  ),
  period_stats AS (
    SELECT
      count(*) FILTER (WHERE order_status BETWEEN 1 AND 5) as comp_orders,
      coalesce(sum(order_amount) FILTER (WHERE order_status BETWEEN 1 AND 5), 0) as rev,
      count(DISTINCT merchant_id) FILTER (WHERE order_status BETWEEN 1 AND 5) as chefs,
      array_agg(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as users,
      -- New KPI calculations
      count(*) as total_orders,
      count(*) FILTER (WHERE order_status = 6) as cancelled_orders,
      count(*) FILTER (WHERE order_status = 5 AND delivery_timestamp IS NOT NULL AND delivery_timestamp <= created_timestamp + 3600) as on_time_orders
    FROM filtered_orders
  )
  SELECT 
    comp_orders, 
    rev, 
    chefs,
    users,
    total_orders,
    cancelled_orders,
    on_time_orders
  INTO 
    completed_orders_count, 
    orders_rev, 
    active_chefs_count, 
    all_period_order_ids,
    total_orders_count,
    cancelled_orders_count,
    on_time_orders_count
  FROM period_stats;

  -- Handle nulls
  completed_orders_count := coalesce(completed_orders_count, 0);
  orders_rev := coalesce(orders_rev, 0);
  active_chefs_count := coalesce(active_chefs_count, 0);
  total_orders_count := coalesce(total_orders_count, 0);
  cancelled_orders_count := coalesce(cancelled_orders_count, 0);
  on_time_orders_count := coalesce(on_time_orders_count, 0);

  -- Calculate new KPIs
  IF completed_orders_count > 0 THEN
    average_order_value := orders_rev / completed_orders_count;
  ELSE
    average_order_value := 0;
  END IF;

  IF total_orders_count > 0 THEN
    cancellation_rate := (cancelled_orders_count::numeric / total_orders_count::numeric) * 100;
  ELSE
    cancellation_rate := 0;
  END IF;

  IF completed_orders_count > 0 THEN
    on_time_delivery_rate := (on_time_orders_count::numeric / completed_orders_count::numeric) * 100;
  ELSE
    on_time_delivery_rate := 0;
  END IF;

  -- 3. Calculate New Customers
  -- Users who ordered in this period AND their FIRST order ever is in this period
  IF array_length(all_period_order_ids, 1) > 0 THEN
    SELECT count(*)
    INTO new_customers_count
    FROM (
      SELECT user_id, min(created_timestamp) as first_order_ts
      FROM orders
      WHERE user_id = ANY(all_period_order_ids)
      GROUP BY user_id
    ) user_first_orders
    WHERE first_order_ts >= start_ts AND first_order_ts <= end_ts;
  ELSE
    new_customers_count := 0;
  END IF;

  -- 4. Calculate Manual Revenue
  -- Including it even if city filtered to match legacy behavior (otherwise charts look weird if manual revenue disappears)
  SELECT coalesce(sum(amount), 0)
  INTO manual_rev
  FROM manual_revenue_entries
  WHERE entry_date >= to_timestamp(start_ts)::date 
    AND entry_date <= to_timestamp(end_ts)::date;

  total_revenue := orders_rev + manual_rev;

  -- 5. Calculate Amsterdam Specifics (if we are in 'all' view or 'amsterdam' view)
  -- Needed for specific UI displays sometimes, or just for parity
  -- Actually, the UI usually filters by city, so if city='Amsterdam', the main metrics are Amsterdam.
  -- But the return type `WeeklyAnalytics` has fields `completed_orders_amsterdam` and `active_chefs_amsterdam`.
  -- We should calculate these regardless of filter? Or optimize?
  -- Legacy logic calculated them explicitly.
  
  -- Get Amsterdam address IDs
  WITH amsterdam_addresses AS (
    SELECT id FROM delivery_addresses 
    WHERE city ILIKE '%amsterdam%' OR address ILIKE '%amsterdam%'
  ),
  amsterdam_orders AS (
    SELECT o.merchant_id, o.order_status
    FROM orders o
    WHERE o.created_timestamp >= start_ts 
      AND o.created_timestamp <= end_ts
      AND o.delivery_address_id IN (SELECT id FROM amsterdam_addresses)
      AND o.order_status BETWEEN 1 AND 5
  )
  SELECT 
    count(*),
    count(DISTINCT merchant_id)
  INTO 
    completed_orders_amsterdam,
    active_chefs_amsterdam
  FROM amsterdam_orders;

  -- 6. Construct Result
  RETURN jsonb_build_object(
    'new_customers', new_customers_count,
    'activation_rate', 0, -- Ratios are calculated on frontend or need complex logic here? 
                          -- Frontend `getWeeklyAnalyticsFallback` calls `getActivationRate` which queries clients table.
                          -- For V2 speed, we can return 0 and let frontend handle it or port that too. 
                          -- Porting activation rate is complex (needs user signup date). 
                          -- Let's return basics and let frontend fetch ratios if needed, OR 
                          -- keep fallback for ratios? 
                          -- Frontend `analytics.ts` expects `WeeklyAnalytics` object.
    'completed_orders', completed_orders_count,
    'completed_orders_amsterdam', coalesce(completed_orders_amsterdam, 0),
    'repeat_rate_30d', 0, -- Same as activation rate
    'active_chefs', active_chefs_count,
    'active_chefs_amsterdam', coalesce(active_chefs_amsterdam, 0),
    'average_order_value', average_order_value,
    'cancellation_rate', cancellation_rate,
    'on_time_delivery_rate', on_time_delivery_rate,
    'cac_per_customer', 0, -- Frontend calculates this from config
    'contribution_margin_per_order', 0, -- Frontend calculates this from total revenue
    'total_revenue', total_revenue, -- Added this to return object!
    'orders_revenue', orders_rev,   -- Useful debug
    'manual_revenue', manual_rev
  );
END;
$$;
