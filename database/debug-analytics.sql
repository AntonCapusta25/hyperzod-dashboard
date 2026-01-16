-- Check what cities exist in delivery_addresses
SELECT city, COUNT(*) as count
FROM delivery_addresses
WHERE city IS NOT NULL
GROUP BY city
ORDER BY count DESC
LIMIT 30;

-- Check chef statuses
SELECT admin_status, COUNT(*) as count
FROM chefs
GROUP BY admin_status;

-- Check if orders have delivery_address_id set
SELECT 
    order_status,
    COUNT(*) as total,
    COUNT(delivery_address_id) as with_address,
    COUNT(*) - COUNT(delivery_address_id) as without_address
FROM orders
GROUP BY order_status
ORDER BY order_status;
