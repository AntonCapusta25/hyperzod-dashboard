-- Temporarily disable RLS on orders tables for testing
-- This will allow the frontend to read the data

ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_addresses DISABLE ROW LEVEL SECURITY;

-- Note: You should re-enable RLS and configure proper policies later
-- For now, this allows you to see the data in your dashboard
