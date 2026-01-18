-- Setup cron jobs for automatic data synchronization
-- Run this in Supabase SQL Editor

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- ============================================
-- SYNC ORDERS - Every 10 minutes
-- ============================================
-- This calls the sync-orders Edge Function every 10 minutes
-- to fetch recent orders from Hyperzod API

SELECT cron.schedule(
    'sync-orders-job',           -- Job name
    '*/10 * * * *',              -- Every 10 minutes
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
-- SYNC CLIENTS - Every 30 minutes
-- ============================================
-- This calls the sync-clients Edge Function every 30 minutes
-- to fetch recent clients from Hyperzod API

SELECT cron.schedule(
    'sync-clients-job',          -- Job name
    '*/30 * * * *',              -- Every 30 minutes
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
-- SYNC MERCHANTS - Every hour
-- ============================================
-- This calls the sync-merchants Edge Function every hour
-- to keep merchant online/offline status up to date

SELECT cron.schedule(
    'sync-merchants-job',        -- Job name
    '0 * * * *',                 -- Every hour (at minute 0)
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

-- ============================================
-- To REMOVE a cron job (if needed)
-- ============================================
-- SELECT cron.unschedule('sync-orders-job');
-- SELECT cron.unschedule('sync-clients-job');
-- SELECT cron.unschedule('sync-merchants-job');

-- ============================================
-- NOTES:
-- ============================================
-- 1. The service_role key is used (not anon key) for cron jobs
-- 2. Cron schedule format: minute hour day month day-of-week
--    */10 * * * * = every 10 minutes
--    */30 * * * * = every 30 minutes
--    0 * * * * = every hour (at minute 0)
-- 3. Jobs run in UTC timezone
-- 4. You can adjust the schedule as needed
-- 5. Monitor job_run_details to check for errors
