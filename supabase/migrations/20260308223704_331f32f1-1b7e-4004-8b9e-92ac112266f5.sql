
-- Life skill catalog: curated activities for daily plans
CREATE TABLE public.life_skill_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- e.g. 'social', 'motor', 'communication', 'daily-living', 'cognitive', 'emotional'
  difficulty TEXT NOT NULL DEFAULT 'beginner', -- beginner, intermediate, advanced
  age_group TEXT NOT NULL DEFAULT 'all', -- child, adult, all
  estimated_duration_minutes INT DEFAULT 15,
  instructions JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User daily plans: AI-generated personalized plans
CREATE TABLE public.user_daily_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, expired
  ai_summary TEXT, -- AI explanation of why these items were chosen
  assessment_snapshot JSONB, -- snapshot of assessment data used to generate
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, plan_date)
);

-- Individual items within a daily plan
CREATE TABLE public.user_daily_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.user_daily_plans(id) ON DELETE CASCADE,
  catalog_item_id UUID REFERENCES public.life_skill_catalog(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  priority INT NOT NULL DEFAULT 0, -- ordering within the plan
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, skipped
  ai_reasoning TEXT, -- why AI recommended this specific item
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.life_skill_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_plan_items ENABLE ROW LEVEL SECURITY;

-- RLS: life_skill_catalog - readable by all authenticated users, writable by admins via service_role
CREATE POLICY "Authenticated users can read catalog"
  ON public.life_skill_catalog FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role manages catalog"
  ON public.life_skill_catalog FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS: user_daily_plans - users can only see their own plans
CREATE POLICY "Users can view own plans"
  ON public.user_daily_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plans"
  ON public.user_daily_plans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plans"
  ON public.user_daily_plans FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages plans"
  ON public.user_daily_plans FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS: user_daily_plan_items - users access via plan ownership
CREATE POLICY "Users can view own plan items"
  ON public.user_daily_plan_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_daily_plans p
      WHERE p.id = plan_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own plan items"
  ON public.user_daily_plan_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_daily_plans p
      WHERE p.id = plan_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role manages plan items"
  ON public.user_daily_plan_items FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admin read access for all plans (using has_role function)
CREATE POLICY "Admins can view all plans"
  ON public.user_daily_plans FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all plan items"
  ON public.user_daily_plan_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_daily_plans p
      WHERE p.id = plan_id
    ) AND public.has_role(auth.uid(), 'admin')
  );

-- Indexes for performance
CREATE INDEX idx_user_daily_plans_user_date ON public.user_daily_plans(user_id, plan_date);
CREATE INDEX idx_user_daily_plan_items_plan ON public.user_daily_plan_items(plan_id);
CREATE INDEX idx_life_skill_catalog_category ON public.life_skill_catalog(category, is_active);
