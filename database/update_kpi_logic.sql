-- Update get_weekly_analytics function to include Confirmed(1), Preparing(2), Ready(3), Out for delivery(4), Delivered(5) orders
-- Previously it likely only counted Delivered(5)

CREATE OR REPLACE FUNCTION get_weekly_analytics(start_ts BIGINT, end_ts BIGINT)
RETURNS TABLE (
    total_orders BIGINT,
    completed_orders BIGINT,
    unique_customers BIGINT,
    total_revenue NUMERIC,
    amsterdam_orders BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH filtered_orders AS (
        SELECT 
            o.order_id,
            o.order_status,
            o.order_amount,
            o.user_id,
            o.delivery_address_id
        FROM orders o
        WHERE o.created_timestamp >= start_ts 
          AND o.created_timestamp <= end_ts
    ),
    completed_orders_set AS (
        SELECT * FROM filtered_orders 
        WHERE order_status BETWEEN 1 AND 5 -- Include Confirmed(1) to Delivered(5)
    )
    SELECT
        (SELECT COUNT(*) FROM filtered_orders) as total_orders,
        
        (SELECT COUNT(*) FROM completed_orders_set) as completed_orders,
        
        (SELECT COUNT(DISTINCT user_id) FROM filtered_orders) as unique_customers,
        
        (SELECT COALESCE(SUM(order_amount), 0) FROM completed_orders_set) as total_revenue,
        
        (SELECT COUNT(*) 
         FROM completed_orders_set co
         JOIN delivery_addresses da ON co.delivery_address_id = da.id
         WHERE da.city ILIKE '%amsterdam%') as amsterdam_orders;
END;
$$ LANGUAGE plpgsql;
