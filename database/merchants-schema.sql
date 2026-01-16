-- Merchants table schema (based on actual Hyperzod API response)
CREATE TABLE IF NOT EXISTS public.merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Hyperzod identifiers
  hyperzod_merchant_id text UNIQUE NOT NULL,
  tenant_id integer,
  merchant_id text,
  
  -- Business info
  name text NOT NULL,
  slug text,
  email text,
  phone text,
  type text, -- 'ecommerce', etc.
  
  -- Location
  country text,
  country_code text DEFAULT 'NL',
  city text,
  state text,
  address text,
  post_code text,
  merchant_address_location numeric[],
  merchant_location jsonb,
  
  -- Delivery settings
  delivery_by text,
  delivery_location_type text,
  delivery_radius numeric,
  delivery_radius_meters numeric,
  delivery_radius_unit text,
  delivery_amount numeric DEFAULT 0,
  min_order_amount numeric DEFAULT 0,
  accepted_order_types text[] DEFAULT '{}',
  
  -- Status
  status boolean DEFAULT true,
  is_accepting_orders boolean DEFAULT false,
  is_open boolean DEFAULT false,
  is_contactable boolean DEFAULT false,
  is_pos_managed boolean DEFAULT false,
  share_customer_details boolean DEFAULT false,
  
  -- Financial
  commission numeric,
  tax_method text,
  currency text,
  
  -- Categories
  merchant_category_ids text[] DEFAULT '{}',
  merchant_categories jsonb DEFAULT '[]',
  
  -- Rating
  average_rating numeric DEFAULT 0,
  
  -- Images
  images jsonb DEFAULT '{}',
  cover_image_url text,
  logo_image_url text,
  
  -- Settings
  scheduling_setting jsonb DEFAULT '{}',
  language_translation jsonb DEFAULT '[]',
  language_translate_columns text[] DEFAULT '{}',
  storefront_message text,
  
  -- Timestamps
  hyperzod_created_at timestamptz,
  hyperzod_updated_at timestamptz,
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_merchants_hyperzod_id ON public.merchants(hyperzod_merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchants_merchant_id ON public.merchants(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchants_city ON public.merchants(city);
CREATE INDEX IF NOT EXISTS idx_merchants_status ON public.merchants(status, is_accepting_orders, is_open);
CREATE INDEX IF NOT EXISTS idx_merchants_rating ON public.merchants(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_merchants_slug ON public.merchants(slug);

-- RLS Policies
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON public.merchants
  FOR SELECT USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access" ON public.merchants
  FOR ALL USING (auth.role() = 'service_role');
