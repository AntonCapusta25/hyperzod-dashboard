-- Check actual order count in database
SELECT COUNT(*) as total_orders FROM public.orders;

-- Check order count by status
SELECT 
  order_status,
  COUNT(*) as count
FROM public.orders
GROUP BY order_status
ORDER BY order_status;

-- Check if there are any duplicates
SELECT 
  order_id,
  COUNT(*) as count
FROM public.orders
GROUP BY order_id
HAVING COUNT(*) > 1;
