-- =====================================================
-- EMAIL CAMPAIGN SYSTEM - DATABASE SCHEMA
-- =====================================================
-- This schema is for the marketing/email campaign module ONLY
-- It does NOT modify any existing chef/internal tables
-- =====================================================

-- =====================================================
-- 0. ENUM TYPES (create if not exists)
-- =====================================================

-- Create app_role enum if it doesn't exist (for RLS policies)
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('chef', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create segment_type enum
DO $$ BEGIN
  CREATE TYPE segment_type AS ENUM ('static', 'dynamic');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create campaign_status enum
DO $$ BEGIN
  CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create email_event_type enum
DO $$ BEGIN
  CREATE TYPE email_event_type AS ENUM (
    'sent', 'delivered', 'opened', 'clicked', 
    'bounced', 'spam', 'unsubscribed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 1. CLIENTS TABLE (synced from Hyperzod API)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Hyperzod API fields (exact mapping)
  hyperzod_id integer UNIQUE NOT NULL,  -- id from API
  tenant_id integer,
  first_name text,
  last_name text,
  mobile text,
  mobile_verified_at timestamp with time zone,
  email text,
  email_verified_at timestamp with time zone,
  country_code text DEFAULT 'NL',
  is_new_user boolean DEFAULT false,
  status integer DEFAULT 1,
  tenants_limit integer DEFAULT 3,
  utm_data jsonb,
  referer text,
  import_id integer,
  meta jsonb,  -- Custom form data and other metadata
  
  -- Computed/derived fields (populated via triggers)
  full_name text,
  status_name text DEFAULT 'active',
  is_email_verified boolean DEFAULT false,
  is_mobile_verified boolean DEFAULT false,
  
  -- Engagement tracking (for email campaigns)
  last_email_opened_at timestamp with time zone,
  last_email_clicked_at timestamp with time zone,
  email_bounce_count integer DEFAULT 0,
  email_unsubscribed boolean DEFAULT false,
  email_unsubscribed_at timestamp with time zone,
  
  -- Order analytics (to be populated from order API)
  total_orders integer DEFAULT 0,
  total_spent numeric(10,2) DEFAULT 0,
  last_order_date timestamp with time zone,
  average_order_value numeric(10,2) DEFAULT 0,
  
  -- Sync tracking
  synced_at timestamp with time zone DEFAULT now(),
  hyperzod_created_at timestamp with time zone,
  hyperzod_updated_at timestamp with time zone,
  hyperzod_deleted_at timestamp with time zone,
  
  -- Internal timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_hyperzod_id ON public.clients(hyperzod_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_mobile ON public.clients(mobile) WHERE mobile IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON public.clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_last_order_date ON public.clients(last_order_date);
CREATE INDEX IF NOT EXISTS idx_clients_total_spent ON public.clients(total_spent);
CREATE INDEX IF NOT EXISTS idx_clients_email_unsubscribed ON public.clients(email_unsubscribed);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_clients_search ON public.clients 
  USING gin(to_tsvector('english', COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') || ' ' || COALESCE(email, '')));

-- =====================================================
-- 2. CLIENT TAGS (for segmentation)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.client_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  color text DEFAULT '#3B82F6',
  description text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_tag_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.client_tags(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamp with time zone DEFAULT now(),
  UNIQUE(client_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_client_tag_assignments_client ON public.client_tag_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_tag_assignments_tag ON public.client_tag_assignments(tag_id);

-- =====================================================
-- 3. SEGMENTS (dynamic customer groups)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type segment_type DEFAULT 'dynamic',
  
  -- Dynamic segment rules (JSON query builder format)
  -- Example: {"operator": "AND", "rules": [{"field": "total_spent", "operator": ">", "value": 100}]}
  filter_rules jsonb DEFAULT '{}'::jsonb,
  
  -- Cached count for performance
  client_count integer DEFAULT 0,
  last_calculated_at timestamp with time zone,
  
  -- Metadata
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- For static segments (manually added clients)
CREATE TABLE IF NOT EXISTS public.segment_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id uuid NOT NULL REFERENCES public.segments(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  added_by uuid REFERENCES auth.users(id),
  added_at timestamp with time zone DEFAULT now(),
  UNIQUE(segment_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_segment_members_segment ON public.segment_members(segment_id);
CREATE INDEX IF NOT EXISTS idx_segment_members_client ON public.segment_members(client_id);

-- =====================================================
-- 4. EMAIL TEMPLATES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  
  -- Template content
  html_content text NOT NULL,
  text_content text,  -- Plain text fallback
  
  -- Template variables (e.g., {{first_name}}, {{total_orders}})
  variables jsonb DEFAULT '[]'::jsonb,
  
  -- Preview
  thumbnail_url text,
  
  -- Metadata
  created_by uuid REFERENCES auth.users(id),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_active ON public.email_templates(is_active);

-- =====================================================
-- 5. CAMPAIGNS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  
  -- Template and recipients
  template_id uuid REFERENCES public.email_templates(id),
  segment_id uuid REFERENCES public.segments(id),
  
  -- Scheduling
  status campaign_status DEFAULT 'draft',
  scheduled_at timestamp with time zone,
  sent_at timestamp with time zone,
  
  -- Sender info
  from_name text DEFAULT 'Hyperzod',
  from_email text DEFAULT 'noreply@hyperzod.com',
  reply_to text,
  
  -- Tracking stats
  total_recipients integer DEFAULT 0,
  emails_sent integer DEFAULT 0,
  emails_delivered integer DEFAULT 0,
  emails_opened integer DEFAULT 0,
  emails_clicked integer DEFAULT 0,
  emails_bounced integer DEFAULT 0,
  emails_unsubscribed integer DEFAULT 0,
  
  -- Metadata
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled ON public.campaigns(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON public.campaigns(created_by);

-- =====================================================
-- 6. CAMPAIGN EVENTS (detailed email tracking)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.campaign_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  
  event_type email_event_type NOT NULL,
  
  -- Event details
  link_url text,  -- For click events
  user_agent text,
  ip_address text,
  
  -- SendGrid webhook data
  sendgrid_event_id text,
  sendgrid_message_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_events_campaign ON public.campaign_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_events_client ON public.campaign_events(client_id);
CREATE INDEX IF NOT EXISTS idx_campaign_events_type ON public.campaign_events(event_type);
CREATE INDEX IF NOT EXISTS idx_campaign_events_created ON public.campaign_events(created_at);

-- =====================================================
-- 7. WEBHOOK SYNC LOG (debugging and replay)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.webhook_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,  -- 'hyperzod' or 'sendgrid'
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed boolean DEFAULT false,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_webhook_sync_log_processed ON public.webhook_sync_log(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_sync_log_source ON public.webhook_sync_log(source);
CREATE INDEX IF NOT EXISTS idx_webhook_sync_log_created ON public.webhook_sync_log(created_at);

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segment_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_sync_log ENABLE ROW LEVEL SECURITY;

-- Clients: Admins can view all
CREATE POLICY "Admins can view all clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert clients"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Similar policies for other tables (simplified - all admin access)
CREATE POLICY "Admins full access to tags"
  ON public.client_tags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins full access to tag assignments"
  ON public.client_tag_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins full access to segments"
  ON public.segments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins full access to segment members"
  ON public.segment_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins full access to templates"
  ON public.email_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins full access to campaigns"
  ON public.campaigns FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view campaign events"
  ON public.campaign_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Service role can insert campaign events"
  ON public.campaign_events FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Admins can view webhook logs"
  ON public.webhook_sync_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Service role can insert webhook logs"
  ON public.webhook_sync_log FOR ALL
  TO service_role
  USING (true);

-- =====================================================
-- 9. FUNCTIONS & TRIGGERS
-- =====================================================

-- Update computed fields for clients
CREATE OR REPLACE FUNCTION update_client_computed_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Update full_name
  NEW.full_name = TRIM(CONCAT(COALESCE(NEW.first_name, ''), ' ', COALESCE(NEW.last_name, '')));
  
  -- Update verification flags
  NEW.is_email_verified = (NEW.email_verified_at IS NOT NULL);
  NEW.is_mobile_verified = (NEW.mobile_verified_at IS NOT NULL);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply computed fields trigger to clients
CREATE TRIGGER update_clients_computed_fields BEFORE INSERT OR UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION update_client_computed_fields();

-- Apply to all tables with updated_at
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_tags_updated_at BEFORE UPDATE ON public.client_tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_segments_updated_at BEFORE UPDATE ON public.segments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. SAMPLE DATA (for testing)
-- =====================================================

-- Insert some sample tags
INSERT INTO public.client_tags (name, color, description) VALUES
  ('VIP', '#FFD700', 'High-value customers'),
  ('New Customer', '#3B82F6', 'Recently registered'),
  ('Inactive', '#EF4444', 'No orders in 90+ days'),
  ('Amsterdam', '#10B981', 'Based in Amsterdam'),
  ('Rotterdam', '#8B5CF6', 'Based in Rotterdam')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Verify all tables are created
-- 3. Test RLS policies with authenticated user
-- 4. Set up Supabase client in frontend
-- =====================================================
