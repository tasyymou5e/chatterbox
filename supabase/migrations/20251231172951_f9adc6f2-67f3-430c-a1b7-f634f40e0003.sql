-- Create skill_level enum type
CREATE TYPE public.skill_level AS ENUM ('beginner', 'intermediate', 'advanced');

-- Create lesson_progress table to track per-category progress for each child
CREATE TABLE public.lesson_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.content_categories(id) ON DELETE CASCADE,
  current_stars INTEGER NOT NULL DEFAULT 0,
  stars_to_moon INTEGER NOT NULL DEFAULT 10,
  moons_earned INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  total_attempts INTEGER NOT NULL DEFAULT 0,
  current_level public.skill_level NOT NULL DEFAULT 'beginner',
  unlocked_levels TEXT[] NOT NULL DEFAULT '{beginner}'::TEXT[],
  accuracy_percentage NUMERIC(5,2) DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, category_id)
);

-- Create lesson_history table for audit trail of every answer
CREATE TABLE public.lesson_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.content_categories(id) ON DELETE CASCADE,
  content_item_id UUID REFERENCES public.content_items(id) ON DELETE SET NULL,
  was_correct BOOLEAN NOT NULL,
  stars_earned INTEGER NOT NULL DEFAULT 0,
  response_time_ms INTEGER,
  skill_level_at_time public.skill_level NOT NULL DEFAULT 'beginner',
  answered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create certificates table for storing earned certificates
CREATE TABLE public.certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.content_categories(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  skill_level_completed public.skill_level NOT NULL,
  child_name TEXT NOT NULL,
  certificate_data JSONB DEFAULT '{}'::JSONB,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add skill_levels column to content_items
ALTER TABLE public.content_items 
ADD COLUMN IF NOT EXISTS skill_levels TEXT[] DEFAULT '{beginner}'::TEXT[];

-- Enable RLS on all new tables
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_lesson_progress_user_category ON public.lesson_progress(user_id, category_id);
CREATE INDEX idx_lesson_progress_family ON public.lesson_progress(family_id);
CREATE INDEX idx_lesson_history_user_category ON public.lesson_history(user_id, category_id);
CREATE INDEX idx_lesson_history_answered_at ON public.lesson_history(answered_at DESC);
CREATE INDEX idx_certificates_user ON public.certificates(user_id);
CREATE INDEX idx_certificates_family ON public.certificates(family_id);
CREATE INDEX idx_content_items_skill_levels ON public.content_items USING GIN(skill_levels);

-- RLS Policies for lesson_progress
CREATE POLICY "lesson_progress_select" ON public.lesson_progress
  FOR SELECT USING (
    user_id = auth.uid() OR
    has_role(auth.uid(), 'admin'::app_role) OR
    (has_role(auth.uid(), 'parent'::app_role) AND EXISTS (
      SELECT 1 FROM public.families f 
      WHERE f.id = lesson_progress.family_id AND f.created_by = auth.uid()
    ))
  );

CREATE POLICY "lesson_progress_insert" ON public.lesson_progress
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "lesson_progress_update" ON public.lesson_progress
  FOR UPDATE USING (
    user_id = auth.uid() OR
    has_role(auth.uid(), 'admin'::app_role) OR
    (has_role(auth.uid(), 'parent'::app_role) AND EXISTS (
      SELECT 1 FROM public.families f 
      WHERE f.id = lesson_progress.family_id AND f.created_by = auth.uid()
    ))
  );

-- RLS Policies for lesson_history
CREATE POLICY "lesson_history_select" ON public.lesson_history
  FOR SELECT USING (
    user_id = auth.uid() OR
    has_role(auth.uid(), 'admin'::app_role) OR
    (has_role(auth.uid(), 'parent'::app_role) AND EXISTS (
      SELECT 1 FROM public.families f 
      WHERE f.id = lesson_history.family_id AND f.created_by = auth.uid()
    ))
  );

CREATE POLICY "lesson_history_insert" ON public.lesson_history
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- RLS Policies for certificates
CREATE POLICY "certificates_select" ON public.certificates
  FOR SELECT USING (
    user_id = auth.uid() OR
    has_role(auth.uid(), 'admin'::app_role) OR
    (has_role(auth.uid(), 'parent'::app_role) AND EXISTS (
      SELECT 1 FROM public.families f 
      WHERE f.id = certificates.family_id AND f.created_by = auth.uid()
    ))
  );

CREATE POLICY "certificates_insert" ON public.certificates
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR
    (has_role(auth.uid(), 'parent'::app_role) AND EXISTS (
      SELECT 1 FROM public.families f 
      WHERE f.id = certificates.family_id AND f.created_by = auth.uid()
    )))
  );

-- Create trigger to update updated_at on lesson_progress
CREATE TRIGGER update_lesson_progress_updated_at
  BEFORE UPDATE ON public.lesson_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();