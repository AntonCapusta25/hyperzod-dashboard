-- Setup cron jobs for automatic data synchronization
-- Run this in Supabase SQL Editor

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- ============================================
-- SYNC ORDERS - Once daily at 2 AM
-- ============================================
-- This calls the sync-orders Edge Function once per day
-- to fetch recent orders from Hyperzod API
-- Runs at 2 AM to avoid peak hours

SELECT cron.schedule(
    'sync-orders-job',           -- Job name
    '0 2 * * *',              -- Once daily at 2:00 AM
    $$
    SELECT
      net.http_post(
          url:='https://oyeqtiovqtkwduzkvomr.supabase.co/functions/v1/sync-orders',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95ZXF0aW92cXRrd2R1emt2b21yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMxOTI3MiwiZXhwIjoyMDgzODk1MjcyfQ.LNYzKdJUYYdCOvMqKdHwHPLxYsGBbRQcOjMPUxPQqnI"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
);

-- ============================================
-- SYNC CLIENTS - Once daily at 2:30 AM
-- ============================================
-- This calls the sync-clients Edge Function once per day
-- to fetch recent clients from Hyperzod API
-- Runs at 2:30 AM to avoid peak hours

SELECT cron.schedule(
    'sync-clients-job',          -- Job name
    '30 2 * * *',              -- Once daily at 2:30 AM
    $$
    SELECT
      net.http_post(
          url:='https://oyeqtiovqtkwduzkvomr.supabase.co/functions/v1/sync-clients',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95ZXF0aW92cXRrd2R1emt2b21yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMxOTI3MiwiZXhwIjoyMDgzODk1MjcyfQ.LNYzKdJUYYdCOvMqKdHwHPLxYsGBbRQcOjMPUxPQqnI"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
);

-- ============================================
-- SYNC MERCHANTS - Once daily at 3 AM
-- ============================================
-- This calls the sync-merchants Edge Function once per day
-- to keep merchant online/offline status up to date
-- Runs at 3 AM to avoid peak hours

SELECT cron.schedule(
    'sync-merchants-job',        -- Job name
    '0 3 * * *',                 -- Once daily at 3:00 AM
    $$
    SELECT
      net.http_post(
          url:='https://oyeqtiovqtkwduzkvomr.supabase.co/functions/v1/sync-merchants',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95ZXF0aW92cXRrd2R1emt2b21yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMxOTI3MiwiZXhwIjoyMDgzODk1MjcyfQ.LNYzKdJUYYdCOvMqKdHwHPLxYsGBbRQcOjMPUxPQqnI"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
);

-- ============================================
-- View all scheduled jobs
-- ============================================
-- Run this to see all active cron jobs
SELECT * FROM cron.job;

-- ============================================
-- View job run history
-- ============================================
-- Run this to see execution history and any errors
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 20;
