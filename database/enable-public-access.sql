-- Unlock permissions for PUBLIC/ANONYMOUS access
-- Use this if you have no authentication system yet

-- 1. Email Templates
DROP POLICY IF EXISTS "Allow authenticated full access to templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admins full access to templates" ON public.email_templates;
CREATE POLICY "Allow PUBLIC full access to templates" 
ON public.email_templates FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- 2. Segments
DROP POLICY IF EXISTS "Allow authenticated full access to segments" ON public.segments;
DROP POLICY IF EXISTS "Admins full access to segments" ON public.segments;
CREATE POLICY "Allow PUBLIC full access to segments" 
ON public.segments FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- 3. Campaigns
DROP POLICY IF EXISTS "Allow authenticated full access to campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Admins full access to campaigns" ON public.campaigns;
CREATE POLICY "Allow PUBLIC full access to campaigns" 
ON public.campaigns FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- 4. Segment Members
DROP POLICY IF EXISTS "Allow authenticated full access to segment members" ON public.segment_members;
DROP POLICY IF EXISTS "Admins full access to segment members" ON public.segment_members;
CREATE POLICY "Allow PUBLIC full access to segment members" 
ON public.segment_members FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);
