-- =====================================================
-- EMAIL AUTOMATIONS / DRIP CAMPAIGNS - DATABASE SCHEMA
-- =====================================================

-- 1. Automations Table
CREATE TABLE IF NOT EXISTS public.automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Automation Steps Table
-- defines each step in an automation sequence
CREATE TABLE IF NOT EXISTS public.automation_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.email_templates(id),
  step_order integer NOT NULL, -- 1, 2, 3...
  delay_value integer NOT NULL DEFAULT 0, -- e.g. 0, 24, 7
  delay_unit text NOT NULL DEFAULT 'hours' CHECK (delay_unit IN ('hours', 'days')),
  subject_override text, -- Optional override for template subject
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE (automation_id, step_order)
);

-- 3. Automation Enrollments Table
-- tracks which clients are in which automation and their status
CREATE TABLE IF NOT EXISTS public.automation_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  automation_id uuid NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  current_step_order integer DEFAULT 1,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  next_execution_at timestamp with time zone,
  enrolled_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE (client_id, automation_id) -- A client can only be enrolled once per automation
);

-- Trigger functions for updated_at
CREATE TRIGGER update_automations_updated_at BEFORE UPDATE ON public.automations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automation_steps_updated_at BEFORE UPDATE ON public.automation_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automation_enrollments_updated_at BEFORE UPDATE ON public.automation_enrollments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_enrollments ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Admins have full access, similar to other marketing tables)
CREATE POLICY "Admins full access to automations" ON public.automations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins full access to automation_steps" ON public.automation_steps FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins full access to automation_enrollments" ON public.automation_enrollments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role can insert enrollments" ON public.automation_enrollments FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update enrollments" ON public.automation_enrollments FOR UPDATE TO service_role USING (true);


-- =====================================================
-- 4. Trigger to enroll new clients
-- =====================================================

-- This function looks for an active "Welcome Series" automation and auto-enrolls new clients
CREATE OR REPLACE FUNCTION enroll_new_client_in_welcome_series()
RETURNS TRIGGER AS $$
DECLARE
  v_automation_id uuid;
  v_first_step record;
  v_next_execution timestamp with time zone;
BEGIN
  -- Find the active 'Welcome Series' automation (you can change name logic later or use a flag)
  SELECT id INTO v_automation_id FROM public.automations 
  WHERE name ILIKE '%Welcome Series%' AND is_active = true 
  LIMIT 1;

  IF v_automation_id IS NOT NULL THEN
    -- Get the first step to calculate initial delay
    SELECT * INTO v_first_step FROM public.automation_steps 
    WHERE automation_id = v_automation_id AND step_order = 1;

    IF FOUND THEN
      IF v_first_step.delay_unit = 'hours' THEN
        v_next_execution := now() + (v_first_step.delay_value || ' hours')::interval;
      ELSE
        v_next_execution := now() + (v_first_step.delay_value || ' days')::interval;
      END IF;
      
      -- Insert enrollment
      INSERT INTO public.automation_enrollments (client_id, automation_id, current_step_order, next_execution_at)
      VALUES (NEW.id, v_automation_id, 1, v_next_execution)
      ON CONFLICT DO NOTHING; -- prevent duplicates if trigger fires twice
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on public.clients
DROP TRIGGER IF EXISTS trigger_enroll_new_client ON public.clients;
CREATE TRIGGER trigger_enroll_new_client
  AFTER INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION enroll_new_client_in_welcome_series();


-- =====================================================
-- 5. Set up pg_cron execution
-- =====================================================

-- Note: Ensure pg_cron is enabled
-- We schedule the edge function to run every hour at minute 0
SELECT cron.schedule(
    'process-automations-job',     -- Job name
    '0 * * * *',                   -- Every hour
    $$
    SELECT
      net.http_post(
          url:='https://oyeqtiovqtkwduzkvomr.supabase.co/functions/v1/process-automations',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95ZXF0aW92cXRrd2R1emt2b21yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMxOTI3MiwiZXhwIjoyMDgzODk1MjcyfQ.LNYzKdJUYYdCOvMqKdHwHPLxYsGBbRQcOjMPUxPQqnI"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
);

-- =====================================================
-- 6. Insert Default Skeletons
-- =====================================================
INSERT INTO public.automations (name, description, is_active) 
VALUES ('Welcome Series', 'Automated email sequence for new registrations', false)
ON CONFLICT DO NOTHING;
