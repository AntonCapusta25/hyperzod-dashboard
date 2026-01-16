-- Check Amsterdam orders for this week
-- This week: 2026-01-13 to 2026-01-19

SELECT 
    COUNT(*) as total_orders,
    COUNT(DISTINCT user_id) as unique_customers,
    SUM(order_amount) as total_revenue,
    AVG(order_amount) as avg_order_value
FROM orders o
LEFT JOIN delivery_addresses da ON o.delivery_address_id = da.id
WHERE 
    o.created_timestamp >= EXTRACT(EPOCH FROM TIMESTAMP '2026-01-13 00:00:00')
    AND o.created_timestamp <= EXTRACT(EPOCH FROM TIMESTAMP '2026-01-19 23:59:59')
    AND da.city ILIKE '%Amsterdam%';

-- Breakdown by order status
SELECT 
    o.order_status,
    CASE o.order_status
        WHEN 0 THEN 'Pending'
        WHEN 1 THEN 'Confirmed'
        WHEN 2 THEN 'Preparing'
        WHEN 3 THEN 'Ready'
        WHEN 4 THEN 'Out for Delivery'
        WHEN 5 THEN 'Delivered'
        WHEN 6 THEN 'Cancelled'
        ELSE 'Unknown'
    END as status_name,
    COUNT(*) as count
FROM orders o
LEFT JOIN delivery_addresses da ON o.delivery_address_id = da.id
WHERE 
    o.created_timestamp >= EXTRACT(EPOCH FROM TIMESTAMP '2026-01-13 00:00:00')
    AND o.created_timestamp <= EXTRACT(EPOCH FROM TIMESTAMP '2026-01-19 23:59:59')
    AND da.city ILIKE '%Amsterdam%'
GROUP BY o.order_status
ORDER BY o.order_status;
