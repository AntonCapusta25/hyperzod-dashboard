-- Fix foreign key constraint for orders table
-- This allows orders to reference users that may not be in the clients table yet

-- Drop the existing foreign key constraint
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

-- Recreate it with ON DELETE SET NULL to handle missing users gracefully
-- Or we can just remove the foreign key entirely since user_id can be null
-- and we're syncing from an external system

-- Option: Keep the constraint but make it not enforced for sync
-- We'll just remove it entirely for now since this is external data
-- ALTER TABLE public.orders 
-- ADD CONSTRAINT orders_user_id_fkey 
-- FOREIGN KEY (user_id) 
-- REFERENCES public.clients(hyperzod_id) 
-- ON DELETE SET NULL
-- NOT VALID;

-- For now, let's just ensure user_id can be null
ALTER TABLE public.orders 
ALTER COLUMN user_id DROP NOT NULL;
