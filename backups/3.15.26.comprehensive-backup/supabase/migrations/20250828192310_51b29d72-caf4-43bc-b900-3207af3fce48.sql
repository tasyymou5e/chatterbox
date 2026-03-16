-- Daily Task and Chore Tracking System - Comprehensive Schema
-- Phase 1: Core Tables and Gamification Infrastructure

-- Create enums for chore system
CREATE TYPE chore_difficulty AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE chore_status AS ENUM ('assigned', 'in_progress', 'completed', 'verified', 'overdue');
CREATE TYPE reward_type AS ENUM ('points', 'custom', 'privilege', 'activity');
CREATE TYPE achievement_type AS ENUM ('streak', 'skill', 'collaboration', 'milestone', 'special');

-- Core chore categories table
CREATE TABLE public.chore_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#6366f1',
  autism_friendly_features JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- System chore templates (admin managed)
CREATE TABLE public.chore_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.chore_categories(id),
  estimated_duration INTEGER DEFAULT 15, -- minutes
  difficulty chore_difficulty DEFAULT 'medium',
  base_points INTEGER DEFAULT 10,
  age_min INTEGER DEFAULT 3,
  age_max INTEGER DEFAULT 18,
  autism_accommodations JSONB DEFAULT '{}',
  instructions JSONB DEFAULT '[]', -- step-by-step instructions
  sensory_considerations JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Family-specific chores (based on templates or custom)
CREATE TABLE public.chores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.chore_templates(id),
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.chore_categories(id),
  estimated_duration INTEGER DEFAULT 15,
  difficulty chore_difficulty DEFAULT 'medium',
  base_points INTEGER DEFAULT 10,
  instructions JSONB DEFAULT '[]',
  custom_settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Chore assignments to family members
CREATE TABLE public.chore_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chore_id UUID REFERENCES public.chores(id) ON DELETE CASCADE,
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL, -- user_id
  assigned_by UUID NOT NULL, -- parent user_id
  due_date DATE,
  recurrence_pattern JSONB DEFAULT '{}', -- daily, weekly, etc.
  status chore_status DEFAULT 'assigned',
  points_earned INTEGER DEFAULT 0,
  time_bonus INTEGER DEFAULT 0,
  streak_bonus INTEGER DEFAULT 0,
  completion_notes TEXT,
  parent_feedback TEXT,
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID,
  verified_at TIMESTAMP WITH TIME ZONE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Track individual chore completion instances
CREATE TABLE public.chore_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID REFERENCES public.chore_assignments(id) ON DELETE CASCADE,
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  chore_id UUID REFERENCES public.chores(id),
  completion_date DATE NOT NULL DEFAULT CURRENT_DATE,
  time_started TIMESTAMP WITH TIME ZONE,
  time_completed TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  actual_duration INTEGER, -- minutes taken
  points_earned INTEGER DEFAULT 0,
  difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  completion_photos TEXT[], -- array of photo URLs
  completion_notes TEXT,
  mini_game_scores JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User XP and level tracking
CREATE TABLE public.user_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  current_level INTEGER DEFAULT 1,
  current_xp INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,
  level_name TEXT DEFAULT 'Rookie Helper',
  next_level_xp INTEGER DEFAULT 100,
  level_up_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, family_id)
);

-- Points tracking per user per family
CREATE TABLE public.user_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  current_points INTEGER DEFAULT 0,
  lifetime_points INTEGER DEFAULT 0,
  points_spent INTEGER DEFAULT 0,
  weekly_points INTEGER DEFAULT 0,
  monthly_points INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, family_id)
);

-- Achievement system
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  achievement_type achievement_type NOT NULL,
  unlock_criteria JSONB NOT NULL, -- flexible criteria system
  point_reward INTEGER DEFAULT 0,
  xp_reward INTEGER DEFAULT 0,
  rarity TEXT DEFAULT 'common', -- common, rare, epic, legendary
  is_secret BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User achievements
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES public.achievements(id),
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  progress JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, achievement_id, family_id)
);

-- Wishlist and rewards system
CREATE TABLE public.wishlist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT,
  point_cost INTEGER NOT NULL,
  reward_type reward_type DEFAULT 'custom',
  image_url TEXT,
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  is_redeemed BOOLEAN DEFAULT false,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Reward redemptions
CREATE TABLE public.reward_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  wishlist_item_id UUID REFERENCES public.wishlist_items(id),
  points_spent INTEGER NOT NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_by UUID,
  approval_notes TEXT,
  fulfillment_status TEXT DEFAULT 'pending', -- pending, fulfilled, denied
  fulfilled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Daily streaks tracking
CREATE TABLE public.daily_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  streak_type TEXT NOT NULL, -- 'daily_chores', 'specific_category', etc.
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  streak_start_date DATE,
  bonus_multiplier NUMERIC DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, family_id, streak_type)
);

-- Family collaboration and challenges
CREATE TABLE public.family_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT DEFAULT 'collaboration', -- collaboration, competition, milestone
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  target_criteria JSONB NOT NULL,
  reward_points INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  participant_count INTEGER DEFAULT 0,
  progress JSONB DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Family leaderboards
CREATE TABLE public.family_leaderboards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  leaderboard_type TEXT NOT NULL, -- weekly, monthly, all_time
  points INTEGER DEFAULT 0,
  rank INTEGER DEFAULT 1,
  chores_completed INTEGER DEFAULT 0,
  achievements_unlocked INTEGER DEFAULT 0,
  collaboration_score NUMERIC DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(family_id, user_id, leaderboard_type, period_start)
);

-- Motivation journal entries
CREATE TABLE public.motivation_journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood_before INTEGER CHECK (mood_before >= 1 AND mood_before <= 5),
  mood_after INTEGER CHECK (mood_after >= 1 AND mood_after <= 5),
  reflection_text TEXT,
  voice_note_url TEXT,
  photo_urls TEXT[],
  proud_moments TEXT[],
  challenges_faced TEXT[],
  goals_for_tomorrow TEXT[],
  gratitude_notes TEXT[],
  parent_comments TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Mini-game scores and achievements
CREATE TABLE public.mini_game_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  score INTEGER NOT NULL,
  completion_time INTEGER, -- seconds
  difficulty_level TEXT DEFAULT 'normal',
  bonus_points INTEGER DEFAULT 0,
  chore_context UUID REFERENCES public.chores(id),
  played_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Peer recognition system
CREATE TABLE public.peer_recognitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  recognition_type TEXT DEFAULT 'high_five', -- high_five, kudos, help, encouragement
  message TEXT,
  points_awarded INTEGER DEFAULT 1,
  chore_context UUID REFERENCES public.chores(id),
  given_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.chore_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chore_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chore_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chore_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motivation_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mini_game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_recognitions ENABLE ROW LEVEL SECURITY;

-- Create updated_at triggers
CREATE TRIGGER update_chore_categories_updated_at BEFORE UPDATE ON public.chore_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_chore_templates_updated_at BEFORE UPDATE ON public.chore_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_chores_updated_at BEFORE UPDATE ON public.chores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_chore_assignments_updated_at BEFORE UPDATE ON public.chore_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_levels_updated_at BEFORE UPDATE ON public.user_levels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_points_updated_at BEFORE UPDATE ON public.user_points FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_achievements_updated_at BEFORE UPDATE ON public.achievements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wishlist_items_updated_at BEFORE UPDATE ON public.wishlist_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_daily_streaks_updated_at BEFORE UPDATE ON public.daily_streaks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_family_challenges_updated_at BEFORE UPDATE ON public.family_challenges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_motivation_journal_entries_updated_at BEFORE UPDATE ON public.motivation_journal_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- Chore Categories (Public read, admin write)
CREATE POLICY "Anyone can view active chore categories" ON public.chore_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage chore categories" ON public.chore_categories FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Chore Templates (Public read, admin write)
CREATE POLICY "Anyone can view active chore templates" ON public.chore_templates FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage chore templates" ON public.chore_templates FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Chores (Family-scoped)
CREATE POLICY "Family members can view family chores" ON public.chores FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = chores.family_id AND fm.user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Parents can manage family chores" ON public.chores FOR ALL USING (
  (has_role(auth.uid(), 'parent'::app_role) AND EXISTS (SELECT 1 FROM public.families f WHERE f.id = chores.family_id AND f.created_by = auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Chore Assignments (Family-scoped)
CREATE POLICY "Family members can view assignments" ON public.chore_assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = chore_assignments.family_id AND fm.user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Parents can manage assignments" ON public.chore_assignments FOR ALL USING (
  (has_role(auth.uid(), 'parent'::app_role) AND EXISTS (SELECT 1 FROM public.families f WHERE f.id = chore_assignments.family_id AND f.created_by = auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Children can update their assignments" ON public.chore_assignments FOR UPDATE USING (
  assigned_to = auth.uid() AND EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = chore_assignments.family_id AND fm.user_id = auth.uid())
);

-- Chore Completions (Family-scoped)
CREATE POLICY "Family members can view completions" ON public.chore_completions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = chore_completions.family_id AND fm.user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Users can create their own completions" ON public.chore_completions FOR INSERT WITH CHECK (
  user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = chore_completions.family_id AND fm.user_id = auth.uid())
);

-- User Levels (Family-scoped)
CREATE POLICY "Family members can view levels" ON public.user_levels FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = user_levels.family_id AND fm.user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "System can manage user levels" ON public.user_levels FOR ALL USING (true);

-- User Points (Family-scoped)
CREATE POLICY "Family members can view points" ON public.user_points FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = user_points.family_id AND fm.user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "System can manage user points" ON public.user_points FOR ALL USING (true);

-- Achievements (Public read)
CREATE POLICY "Anyone can view active achievements" ON public.achievements FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage achievements" ON public.achievements FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- User Achievements (Family-scoped)
CREATE POLICY "Family members can view achievements" ON public.user_achievements FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = user_achievements.family_id AND fm.user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "System can manage user achievements" ON public.user_achievements FOR ALL USING (true);

-- Wishlist Items (Family-scoped)
CREATE POLICY "Family members can view wishlist" ON public.wishlist_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = wishlist_items.family_id AND fm.user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Users can manage their wishlist" ON public.wishlist_items FOR ALL USING (
  user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = wishlist_items.family_id AND fm.user_id = auth.uid())
);
CREATE POLICY "Parents can approve wishlist items" ON public.wishlist_items FOR UPDATE USING (
  has_role(auth.uid(), 'parent'::app_role) AND EXISTS (SELECT 1 FROM public.families f WHERE f.id = wishlist_items.family_id AND f.created_by = auth.uid())
);

-- Apply similar policies to remaining tables
CREATE POLICY "Family members can view redemptions" ON public.reward_redemptions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = reward_redemptions.family_id AND fm.user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Users can create redemptions" ON public.reward_redemptions FOR INSERT WITH CHECK (
  user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = reward_redemptions.family_id AND fm.user_id = auth.uid())
);

CREATE POLICY "Family members can view streaks" ON public.daily_streaks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = daily_streaks.family_id AND fm.user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "System can manage streaks" ON public.daily_streaks FOR ALL USING (true);

CREATE POLICY "Family members can view challenges" ON public.family_challenges FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = family_challenges.family_id AND fm.user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Parents can manage challenges" ON public.family_challenges FOR ALL USING (
  (has_role(auth.uid(), 'parent'::app_role) AND EXISTS (SELECT 1 FROM public.families f WHERE f.id = family_challenges.family_id AND f.created_by = auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Family members can view leaderboards" ON public.family_leaderboards FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = family_leaderboards.family_id AND fm.user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "System can manage leaderboards" ON public.family_leaderboards FOR ALL USING (true);

CREATE POLICY "Family members can view journal entries" ON public.motivation_journal_entries FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = motivation_journal_entries.family_id AND fm.user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Users can manage their journal" ON public.motivation_journal_entries FOR ALL USING (
  user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = motivation_journal_entries.family_id AND fm.user_id = auth.uid())
);

CREATE POLICY "Family members can view game scores" ON public.mini_game_scores FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = mini_game_scores.family_id AND fm.user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Users can create game scores" ON public.mini_game_scores FOR INSERT WITH CHECK (
  user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = mini_game_scores.family_id AND fm.user_id = auth.uid())
);

CREATE POLICY "Family members can view recognitions" ON public.peer_recognitions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = peer_recognitions.family_id AND fm.user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Users can give recognitions" ON public.peer_recognitions FOR INSERT WITH CHECK (
  from_user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = peer_recognitions.family_id AND fm.user_id = auth.uid())
);

-- Create custom functions for gamification logic
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

CREATE OR REPLACE FUNCTION public.calculate_level_progression(current_xp INTEGER)
RETURNS TABLE(level INTEGER, level_name TEXT, next_level_xp INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.check_and_award_achievements(
  p_user_id UUID,
  p_family_id UUID,
  p_completion_data JSONB DEFAULT '{}'
)
RETURNS TABLE(achievement_id UUID, achievement_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.update_user_gamification_stats(
  p_user_id UUID,
  p_family_id UUID,
  p_points_earned INTEGER,
  p_xp_earned INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.update_family_leaderboard(p_family_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
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