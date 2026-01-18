-- Create function to get top performing chefs
-- Run this in Supabase SQL Editor

DROP FUNCTION IF EXISTS get_top_performing_chefs(integer);

CREATE OR REPLACE FUNCTION get_top_performing_chefs(limit_count integer DEFAULT 10)
RETURNS TABLE (
    merchant_id text,
    name text,
    city text,
    total_revenue numeric,
    order_count bigint,
    avg_order_value numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.merchant_id::text,
        m.name,
        m.city,
        COALESCE(SUM(o.order_amount), 0) as total_revenue,
        COUNT(o.order_id) as order_count,
        CASE 
            WHEN COUNT(o.order_id) > 0 THEN COALESCE(SUM(o.order_amount), 0) / COUNT(o.order_id)
            ELSE 0
        END as avg_order_value
    FROM merchants m
    LEFT JOIN orders o ON m.merchant_id::text = o.merchant_id::text
        AND o.order_status = 5  -- Only completed orders
    GROUP BY m.merchant_id, m.name, m.city
    HAVING COUNT(o.order_id) > 0  -- Only merchants with at least one order
    ORDER BY total_revenue DESC, order_count DESC
    LIMIT limit_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_top_performing_chefs TO anon, authenticated;
