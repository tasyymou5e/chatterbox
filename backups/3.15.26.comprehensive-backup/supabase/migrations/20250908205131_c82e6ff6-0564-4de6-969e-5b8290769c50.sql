-- Add indexes for better analytics performance
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at_user_id ON public.user_activity_logs(created_at, user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_activity_type ON public.user_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_families_created_at ON public.families(created_at);
CREATE INDEX IF NOT EXISTS idx_engagement_metrics_date_user ON public.engagement_metrics(date_recorded, user_id);
CREATE INDEX IF NOT EXISTS idx_system_errors_created_at ON public.system_errors(created_at);

-- Populate some sample data for analytics testing (backfill)
DO $$
DECLARE
  sample_date date;
  i integer;
BEGIN
  -- Only insert if there's no existing data to avoid duplicates
  IF NOT EXISTS (SELECT 1 FROM public.engagement_metrics LIMIT 1) THEN
    -- Generate sample engagement metrics for the last 30 days
    FOR i IN 0..29 LOOP
      sample_date := CURRENT_DATE - (i || ' days')::interval;
      
      -- Insert sample engagement metrics
      INSERT INTO public.engagement_metrics (
        user_id, 
        family_id, 
        session_duration, 
        pages_visited, 
        actions_performed, 
        engagement_score, 
        date_recorded
      )
      SELECT 
        (SELECT user_id FROM public.profiles ORDER BY random() LIMIT 1),
        (SELECT id FROM public.families ORDER BY random() LIMIT 1),
        (60 + random() * 300)::integer, -- 1-6 minutes
        (3 + random() * 10)::integer, -- 3-13 pages
        (10 + random() * 50)::integer, -- 10-60 actions
        (3 + random() * 7)::numeric, -- 3-10 engagement score
        sample_date
      FROM generate_series(1, (5 + random() * 15)::integer); -- 5-20 sessions per day
    END LOOP;
  END IF;
  
  -- Populate daily analytics data if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM public.daily_analytics_data LIMIT 1) THEN
    FOR i IN 0..29 LOOP
      sample_date := CURRENT_DATE - (i || ' days')::interval;
      
      INSERT INTO public.daily_analytics_data (
        date,
        total_users,
        active_users,
        new_signups,
        total_families,
        engagement_score,
        chores_completed,
        points_earned,
        achievements_unlocked,
        avg_session_duration
      ) VALUES (
        sample_date,
        (SELECT COUNT(*) FROM public.profiles WHERE created_at::date <= sample_date),
        (10 + random() * 50)::bigint, -- 10-60 active users
        (0 + random() * 5)::bigint, -- 0-5 new signups
        (SELECT COUNT(*) FROM public.families WHERE created_at::date <= sample_date),
        (5 + random() * 5)::numeric, -- 5-10 engagement score
        (20 + random() * 100)::bigint, -- 20-120 chores completed
        (200 + random() * 1000)::bigint, -- 200-1200 points earned
        (1 + random() * 10)::bigint, -- 1-11 achievements
        (180 + random() * 300)::numeric -- 180-480 seconds average session
      );
    END LOOP;
  END IF;
END;
$$;