-- Fix security warnings: Add search_path to all functions

-- Fix calculate_chore_points function
CREATE OR REPLACE FUNCTION public.calculate_chore_points(
  base_points INTEGER,
  difficulty chore_difficulty,
  completion_time INTEGER DEFAULT NULL,
  estimated_time INTEGER DEFAULT NULL,
  streak_count INTEGER DEFAULT 0
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  final_points INTEGER;
  difficulty_multiplier NUMERIC;
  time_bonus NUMERIC := 0;
  streak_bonus NUMERIC := 0;
BEGIN
  -- Base points with difficulty multiplier
  CASE difficulty
    WHEN 'easy' THEN difficulty_multiplier := 1.0;
    WHEN 'medium' THEN difficulty_multiplier := 1.5;
    WHEN 'hard' THEN difficulty_multiplier := 2.0;
    ELSE difficulty_multiplier := 1.0;
  END CASE;
  
  final_points := ROUND(base_points * difficulty_multiplier);
  
  -- Time bonus for completing faster than estimated
  IF completion_time IS NOT NULL AND estimated_time IS NOT NULL THEN
    IF completion_time < estimated_time THEN
      time_bonus := ROUND(final_points * 0.2); -- 20% bonus for speed
    END IF;
  END IF;
  
  -- Streak bonus
  IF streak_count > 0 THEN
    streak_bonus := LEAST(streak_count * 2, final_points * 0.5); -- Max 50% streak bonus
  END IF;
  
  RETURN final_points + time_bonus::INTEGER + streak_bonus::INTEGER;
END;
$$;

-- Fix calculate_level_progression function
CREATE OR REPLACE FUNCTION public.calculate_level_progression(current_xp INTEGER)
RETURNS TABLE(level INTEGER, level_name TEXT, next_level_xp INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  calculated_level INTEGER;
  level_names TEXT[] := ARRAY[
    'Rookie Helper', 'Task Learner', 'Chore Champion', 'Daily Hero', 'Family Star',
    'Organization Expert', 'Time Master', 'Responsibility Leader', 'Household Guardian', 'Family Champion'
  ];
BEGIN
  -- Simple XP to level calculation (exponential growth)
  calculated_level := LEAST(FLOOR(SQRT(current_xp / 100.0)) + 1, 10);
  
  RETURN QUERY SELECT 
    calculated_level,
    COALESCE(level_names[calculated_level], 'Ultimate Champion'),
    (calculated_level * calculated_level * 100)::INTEGER;
END;
$$;

-- Fix check_and_award_achievements function
CREATE OR REPLACE FUNCTION public.check_and_award_achievements(
  p_user_id UUID,
  p_family_id UUID,
  p_completion_data JSONB DEFAULT '{}'
)
RETURNS TABLE(achievement_id UUID, achievement_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  achievement_record RECORD;
  criteria JSONB;
  user_stats RECORD;
BEGIN
  -- Get user stats for achievement checking
  SELECT 
    COALESCE(SUM(cc.points_earned), 0) as total_points,
    COUNT(*) as total_completions,
    COUNT(DISTINCT DATE(cc.completion_date)) as unique_days,
    MAX(ds.current_streak) as max_streak
  INTO user_stats
  FROM public.chore_completions cc
  LEFT JOIN public.daily_streaks ds ON ds.user_id = cc.user_id AND ds.family_id = cc.family_id
  WHERE cc.user_id = p_user_id AND cc.family_id = p_family_id;

  -- Check each achievement
  FOR achievement_record IN 
    SELECT * FROM public.achievements 
    WHERE is_active = true 
    AND id NOT IN (SELECT achievement_id FROM public.user_achievements WHERE user_id = p_user_id AND family_id = p_family_id)
  LOOP
    criteria := achievement_record.unlock_criteria;
    
    -- Check various achievement types
    IF achievement_record.achievement_type = 'streak' THEN
      IF (criteria->>'required_streak')::INTEGER <= COALESCE(user_stats.max_streak, 0) THEN
        INSERT INTO public.user_achievements (user_id, family_id, achievement_id)
        VALUES (p_user_id, p_family_id, achievement_record.id);
        
        RETURN QUERY SELECT achievement_record.id, achievement_record.name;
      END IF;
    ELSIF achievement_record.achievement_type = 'milestone' THEN
      IF (criteria->>'required_completions')::INTEGER <= user_stats.total_completions THEN
        INSERT INTO public.user_achievements (user_id, family_id, achievement_id)
        VALUES (p_user_id, p_family_id, achievement_record.id);
        
        RETURN QUERY SELECT achievement_record.id, achievement_record.name;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Fix update_user_gamification_stats function
CREATE OR REPLACE FUNCTION public.update_user_gamification_stats(
  p_user_id UUID,
  p_family_id UUID,
  p_points_earned INTEGER,
  p_xp_earned INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  calculated_xp INTEGER;
  level_info RECORD;
BEGIN
  -- Default XP calculation if not provided
  calculated_xp := COALESCE(p_xp_earned, p_points_earned);
  
  -- Update user points
  INSERT INTO public.user_points (user_id, family_id, current_points, lifetime_points, weekly_points, monthly_points)
  VALUES (p_user_id, p_family_id, p_points_earned, p_points_earned, p_points_earned, p_points_earned)
  ON CONFLICT (user_id, family_id) DO UPDATE SET
    current_points = user_points.current_points + p_points_earned,
    lifetime_points = user_points.lifetime_points + p_points_earned,
    weekly_points = user_points.weekly_points + p_points_earned,
    monthly_points = user_points.monthly_points + p_points_earned,
    updated_at = now();
  
  -- Update user level
  INSERT INTO public.user_levels (user_id, family_id, current_xp, total_xp)
  VALUES (p_user_id, p_family_id, calculated_xp, calculated_xp)
  ON CONFLICT (user_id, family_id) DO UPDATE SET
    current_xp = user_levels.current_xp + calculated_xp,
    total_xp = user_levels.total_xp + calculated_xp,
    updated_at = now();
    
  -- Get updated level info
  SELECT * INTO level_info FROM public.calculate_level_progression(
    (SELECT total_xp FROM public.user_levels WHERE user_id = p_user_id AND family_id = p_family_id)
  );
  
  -- Update level details if level changed
  UPDATE public.user_levels 
  SET 
    current_level = level_info.level,
    level_name = level_info.level_name,
    next_level_xp = level_info.next_level_xp,
    level_up_date = CASE 
      WHEN current_level < level_info.level THEN now() 
      ELSE level_up_date 
    END
  WHERE user_id = p_user_id AND family_id = p_family_id;
END;
$$;

-- Fix update_family_leaderboard function
CREATE OR REPLACE FUNCTION public.update_family_leaderboard(p_family_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update weekly leaderboard
  INSERT INTO public.family_leaderboards (
    family_id, user_id, leaderboard_type, points, chores_completed, 
    achievements_unlocked, period_start, period_end
  )
  SELECT 
    p_family_id,
    fm.user_id,
    'weekly',
    COALESCE(up.weekly_points, 0),
    COALESCE(weekly_completions.count, 0),
    COALESCE(ua_count.count, 0),
    date_trunc('week', CURRENT_DATE)::DATE,
    (date_trunc('week', CURRENT_DATE) + interval '6 days')::DATE
  FROM public.family_members fm
  LEFT JOIN public.user_points up ON up.user_id = fm.user_id AND up.family_id = fm.family_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as count
    FROM public.chore_completions 
    WHERE family_id = p_family_id 
    AND completion_date >= date_trunc('week', CURRENT_DATE)
    GROUP BY user_id
  ) weekly_completions ON weekly_completions.user_id = fm.user_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as count
    FROM public.user_achievements 
    WHERE family_id = p_family_id
    GROUP BY user_id
  ) ua_count ON ua_count.user_id = fm.user_id
  WHERE fm.family_id = p_family_id
  ON CONFLICT (family_id, user_id, leaderboard_type, period_start) DO UPDATE SET
    points = EXCLUDED.points,
    chores_completed = EXCLUDED.chores_completed,
    achievements_unlocked = EXCLUDED.achievements_unlocked,
    last_updated = now();
    
  -- Update ranks
  WITH ranked_users AS (
    SELECT 
      family_id, user_id, leaderboard_type, period_start,
      ROW_NUMBER() OVER (PARTITION BY family_id, leaderboard_type, period_start ORDER BY points DESC) as new_rank
    FROM public.family_leaderboards
    WHERE family_id = p_family_id AND leaderboard_type = 'weekly'
    AND period_start = date_trunc('week', CURRENT_DATE)::DATE
  )
  UPDATE public.family_leaderboards fl
  SET rank = ru.new_rank
  FROM ranked_users ru
  WHERE fl.family_id = ru.family_id 
  AND fl.user_id = ru.user_id 
  AND fl.leaderboard_type = ru.leaderboard_type
  AND fl.period_start = ru.period_start;
END;
$$;