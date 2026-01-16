-- Check what admin_status values exist in chefs table
SELECT admin_status, COUNT(*) as count
FROM chefs
GROUP BY admin_status
ORDER BY count DESC;

-- Check a sample of cities in delivery_addresses
SELECT city, COUNT(*) as count
FROM delivery_addresses
WHERE city IS NOT NULL
GROUP BY city
ORDER BY count DESC
LIMIT 20;

-- Check if delivery_address_id is being set in orders
SELECT 
    COUNT(*) as total_orders,
    COUNT(delivery_address_id) as orders_with_address,
    COUNT(*) - COUNT(delivery_address_id) as orders_without_address
FROM orders
WHERE order_status = 5;
