-- =====================================================
-- MERCHANT OVERRIDES - Manual Status Override System
-- =====================================================
-- Allows dashboard admins to override merchant online/offline
-- status when Hyperzod API data is stale or incorrect
-- =====================================================

CREATE TABLE IF NOT EXISTS public.merchant_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Merchant identification
  merchant_id text NOT NULL UNIQUE,
  merchant_name text,
  
  -- Override fields
  override_online_status boolean,
  override_reason text,
  
  -- Metadata
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_merchant_overrides_merchant_id 
  ON public.merchant_overrides(merchant_id);

-- Enable RLS
ALTER TABLE public.merchant_overrides ENABLE ROW LEVEL SECURITY;

-- Allow public access for development (change to authenticated in production)
CREATE POLICY "Allow public full access to merchant overrides"
  ON public.merchant_overrides FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_merchant_overrides_updated_at 
  BEFORE UPDATE ON public.merchant_overrides
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
