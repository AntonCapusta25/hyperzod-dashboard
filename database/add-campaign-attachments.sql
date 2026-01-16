-- Add attachments column to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.campaigns.attachments IS 'Array of {name, url, type} objects for campaign attachments';

-- Create Storage Buckets for assets and attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('campaign-assets', 'campaign-assets', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('campaign-attachments', 'campaign-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for Storage Access
-- 1. Public Read Access
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id IN ('campaign-assets', 'campaign-attachments') );

-- 2. Authenticated Upload Access
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK ( bucket_id IN ('campaign-assets', 'campaign-attachments') );

-- 3. Authenticated Delete Access (Optional, for cleanup)
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
CREATE POLICY "Authenticated Delete" 
ON storage.objects FOR DELETE 
TO authenticated 
USING ( bucket_id IN ('campaign-assets', 'campaign-attachments') );
