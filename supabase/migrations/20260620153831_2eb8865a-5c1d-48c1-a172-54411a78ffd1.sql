do $$
begin
  perform cron.unschedule(jobname)
  from cron.job
  where jobname in (
    'adspy-collect-hourly',
    'adspy-collect-hourly-retry-1',
    'adspy-collect-hourly-retry-2',
    'adspy-collect-hourly-retry-3',
    'adspy-collect-hourly-retry-4'
  );
exception when others then
  null;
end $$;

select cron.schedule(
  'adspy-collect-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://project--0e595d07-d346-44f1-b286-e2780562b9ee.lovable.app/api/public/hooks/heartbeat-7f3a9b2e8c1d4a6b',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2c2V0YmF2Zmd2ZGFhdHlpcW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MTc4MjgsImV4cCI6MjA5NzI5MzgyOH0.Ik8wV1eHOZaN0LY_UjCU42rEmImDtlAQvZ_Gu4O3rdk"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) as request_id;
  $$
);

select cron.schedule(
  'adspy-collect-hourly-retry-1',
  '3 * * * *',
  $$
  select net.http_post(
    url := 'https://project--0e595d07-d346-44f1-b286-e2780562b9ee.lovable.app/api/public/hooks/heartbeat-7f3a9b2e8c1d4a6b',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2c2V0YmF2Zmd2ZGFhdHlpcW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MTc4MjgsImV4cCI6MjA5NzI5MzgyOH0.Ik8wV1eHOZaN0LY_UjCU42rEmImDtlAQvZ_Gu4O3rdk"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) as request_id;
  $$
);

select cron.schedule(
  'adspy-collect-hourly-retry-2',
  '8 * * * *',
  $$
  select net.http_post(
    url := 'https://project--0e595d07-d346-44f1-b286-e2780562b9ee.lovable.app/api/public/hooks/heartbeat-7f3a9b2e8c1d4a6b',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2c2V0YmF2Zmd2ZGFhdHlpcW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MTc4MjgsImV4cCI6MjA5NzI5MzgyOH0.Ik8wV1eHOZaN0LY_UjCU42rEmImDtlAQvZ_Gu4O3rdk"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) as request_id;
  $$
);

select cron.schedule(
  'adspy-collect-hourly-retry-3',
  '15 * * * *',
  $$
  select net.http_post(
    url := 'https://project--0e595d07-d346-44f1-b286-e2780562b9ee.lovable.app/api/public/hooks/heartbeat-7f3a9b2e8c1d4a6b',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2c2V0YmF2Zmd2ZGFhdHlpcW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MTc4MjgsImV4cCI6MjA5NzI5MzgyOH0.Ik8wV1eHOZaN0LY_UjCU42rEmImDtlAQvZ_Gu4O3rdk"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) as request_id;
  $$
);

select cron.schedule(
  'adspy-collect-hourly-retry-4',
  '30 * * * *',
  $$
  select net.http_post(
    url := 'https://project--0e595d07-d346-44f1-b286-e2780562b9ee.lovable.app/api/public/hooks/heartbeat-7f3a9b2e8c1d4a6b',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2c2V0YmF2Zmd2ZGFhdHlpcW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MTc4MjgsImV4cCI6MjA5NzI5MzgyOH0.Ik8wV1eHOZaN0LY_UjCU42rEmImDtlAQvZ_Gu4O3rdk"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) as request_id;
  $$
);