-- Create function to get top spending clients for VIP Club
-- Run this in Supabase SQL Editor

-- Drop existing function first (needed when changing return types)
DROP FUNCTION IF EXISTS get_top_spending_clients(integer);

CREATE OR REPLACE FUNCTION get_top_spending_clients(limit_count integer DEFAULT 50)
RETURNS TABLE (
    hyperzod_id integer,
    first_name text,
    last_name text,
    email text,
    mobile text,
    total_spent numeric,
    order_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.hyperzod_id,
        c.first_name,
        c.last_name,
        c.email,
        c.mobile,
        COALESCE(SUM(o.order_amount), 0) as total_spent,
        COUNT(o.order_id) as order_count
    FROM clients c
    LEFT JOIN orders o ON c.hyperzod_id = o.user_id 
        AND o.order_status = 5  -- Only completed orders
    GROUP BY c.hyperzod_id, c.first_name, c.last_name, c.email, c.mobile
    HAVING COUNT(o.order_id) > 0  -- Only clients with at least one order
    ORDER BY total_spent DESC
    LIMIT limit_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_top_spending_clients TO anon, authenticated;
