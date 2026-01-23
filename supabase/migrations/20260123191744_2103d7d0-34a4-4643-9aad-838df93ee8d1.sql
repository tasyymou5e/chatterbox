-- Schedule hourly edge function health check
SELECT cron.schedule(
  'edge-function-health-check-hourly',
  '0 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://lxuqfgbukrrickanmmic.supabase.co/functions/v1/edge-function-health-check',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4dXFmZ2J1a3JyaWNrYW5tbWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzOTQyMTgsImV4cCI6MjA3MTk3MDIxOH0.OonibLO1o5uCtVX2EHeCLCWcBbF64oYGmE4IK1ZfcQE"}'::jsonb,
        body:='{"checkType": "scheduled"}'::jsonb
    ) as request_id;
  $$
);

-- Schedule daily cleanup of old health logs (runs at 3 AM)
SELECT cron.schedule(
  'cleanup-old-health-logs-daily',
  '0 3 * * *',
  $$
  SELECT public.cleanup_old_health_logs();
  $$
);