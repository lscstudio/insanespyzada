do $$
begin
  if exists (select 1 from cron.job where jobname = 'adspy-collect-every-4h') then
    perform cron.unschedule('adspy-collect-every-4h');
  end if;

  if exists (select 1 from cron.job where jobname = 'adspy-collect-hourly') then
    perform cron.unschedule('adspy-collect-hourly');
  end if;
end $$;

select cron.schedule(
  'adspy-collect-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://project--0e595d07-d346-44f1-b286-e2780562b9ee.lovable.app/api/public/hooks/collect',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXAiOiJwdnNldGJhdmZndmRhYXR5aXFtbCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzgxNzE3ODI4LCJleHAiOjIwOTcyOTM4Mjh9.Ik8wV1eHOZaN0LY_UjCU42rEmImDtlAQvZ_Gu4O3rdk"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  ) as request_id;
  $$
);