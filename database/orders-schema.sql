-- =====================================================
-- ORDERS MODULE - DATABASE SCHEMA
-- =====================================================
-- This schema is for the orders/transactions module
-- Synced from Hyperzod API order data
-- =====================================================

-- =====================================================
-- 1. ORDERS TABLE (main orders data)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Hyperzod identifiers
  order_id integer UNIQUE NOT NULL,
  order_uuid text UNIQUE NOT NULL,
  tenant_id integer NOT NULL,
  
  -- Relationships
  user_id integer REFERENCES public.clients(hyperzod_id) ON DELETE SET NULL,
  merchant_id text NOT NULL,
  
  -- Order details
  order_status integer NOT NULL, -- 0=pending, 1=confirmed, 2=preparing, 3=ready, 4=out_for_delivery, 5=delivered, 6=cancelled
  order_type text NOT NULL, -- delivery, pickup, custom_1
  order_amount decimal(10,2) NOT NULL,
  currency_code text NOT NULL DEFAULT 'INR',
  
  -- Payment
  payment_mode_id integer,
  payment_mode_name text,
  online_payment_status text,
  online_payment_label text,
  
  -- Flags
  is_scheduled boolean DEFAULT false,
  is_user_first_order boolean DEFAULT false,
  
  -- Timestamps
  delivery_timestamp bigint,
  created_timestamp bigint NOT NULL,
  hyperzod_updated_at timestamp with time zone,
  synced_at timestamp with time zone DEFAULT now(),
  
  -- Metadata
  locale text DEFAULT 'en',
  timezone text,
  device text,
  ip text,
  meta jsonb,
  order_note text,
  
  -- Delivery address (embedded for quick access)
  delivery_address_id uuid,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- =====================================================
-- 2. ORDER ITEMS TABLE (cart items)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id integer NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
  
  -- Product details
  merchant_id text NOT NULL,
  product_id text NOT NULL,
  product_name text NOT NULL,
  item_image_url text,
  
  -- Quantity and pricing
  quantity integer NOT NULL DEFAULT 1,
  product_price decimal(10,2) NOT NULL,
  sub_total_amount decimal(10,2) NOT NULL,
  
  -- Tax and discounts
  tax_percent decimal(5,2) DEFAULT 0,
  discount_percent decimal(5,2) DEFAULT 0,
  tax decimal(10,2) DEFAULT 0,
  taxable_amount decimal(10,2),
  
  -- Product options (JSONB for flexibility)
  product_options jsonb,
  
  -- Cost tracking
  product_cost_price decimal(10,2),
  sub_total_cost_amount decimal(10,2),
  
  created_at timestamp with time zone DEFAULT now()
);

-- =====================================================
-- 3. ORDER STATUS HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id integer NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
  
  order_status integer NOT NULL,
  timestamp timestamp with time zone NOT NULL,
  local_timestamp timestamp with time zone,
  
  -- Who made the change
  client_medium integer, -- 1=mobile, 2=web, 3=admin, 4=api, 5=system
  referer text,
  user_info jsonb,
  
  created_at timestamp with time zone DEFAULT now()
);

-- =====================================================
-- 4. DELIVERY ADDRESSES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.delivery_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Hyperzod identifier
  hyperzod_address_id text UNIQUE,
  
  -- User relationship
  user_id integer REFERENCES public.clients(hyperzod_id) ON DELETE SET NULL,
  tenant_id integer,
  
  -- Address details
  address_type text, -- home, work, other
  address text NOT NULL,
  building text,
  area text,
  landmark text,
  city text,
  region text,
  zip_code text,
  country text,
  country_code text DEFAULT 'IN',
  
  -- Geolocation
  location_lat decimal(10,7),
  location_lon decimal(10,7),
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- =====================================================
-- 5. INDEXES
-- =====================================================

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON public.orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_timestamp ON public.orders(created_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON public.orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON public.orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_payment_mode ON public.orders(payment_mode_id);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_merchant_id ON public.order_items(merchant_id);

-- Order status history indexes
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_timestamp ON public.order_status_history(timestamp DESC);

-- Delivery addresses indexes
CREATE INDEX IF NOT EXISTS idx_delivery_addresses_user_id ON public.delivery_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_addresses_hyperzod_id ON public.delivery_addresses(hyperzod_address_id);

-- =====================================================
-- 6. TRIGGERS
-- =====================================================

-- Update updated_at timestamp for orders
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp for delivery addresses
CREATE TRIGGER update_delivery_addresses_updated_at BEFORE UPDATE ON public.delivery_addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_addresses ENABLE ROW LEVEL SECURITY;

-- Admins can view all orders
CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Admins can insert orders
CREATE POLICY "Admins can insert orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Admins can update orders
CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Similar policies for other tables
CREATE POLICY "Admins full access to order_items"
  ON public.order_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins full access to order_status_history"
  ON public.order_status_history FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins full access to delivery_addresses"
  ON public.delivery_addresses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- =====================================================
-- NOTES
-- =====================================================
-- Order Status Values:
-- 0 = Pending
-- 1 = Confirmed
-- 2 = Preparing
-- 3 = Ready
-- 4 = Out for Delivery
-- 5 = Delivered
-- 6 = Cancelled
--
-- Client Medium Values:
-- 1 = Mobile App
-- 2 = Web
-- 3 = Admin Panel
-- 4 = API
-- 5 = System/Automated
