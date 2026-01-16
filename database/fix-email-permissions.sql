-- Unlock permissions for Email Marketing tables
-- This replaces strict Admin-only checks with standard Authenticated User checks
-- Useful for development or when user_roles isn't fully configured

-- 1. Segments
DROP POLICY IF EXISTS "Admins full access to segments" ON public.segments;
CREATE POLICY "Allow authenticated full access to segments" 
ON public.segments FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 2. Email Templates
DROP POLICY IF EXISTS "Admins full access to templates" ON public.email_templates;
CREATE POLICY "Allow authenticated full access to templates" 
ON public.email_templates FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 3. Campaigns
DROP POLICY IF EXISTS "Admins full access to campaigns" ON public.campaigns;
CREATE POLICY "Allow authenticated full access to campaigns" 
ON public.campaigns FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 4. Segment Members
DROP POLICY IF EXISTS "Admins full access to segment members" ON public.segment_members;
CREATE POLICY "Allow authenticated full access to segment members" 
ON public.segment_members FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
