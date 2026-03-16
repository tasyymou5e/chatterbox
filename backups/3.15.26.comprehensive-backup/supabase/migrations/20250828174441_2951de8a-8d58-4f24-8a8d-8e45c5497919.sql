-- Create enum for content types
CREATE TYPE public.content_type AS ENUM ('game', 'video', 'website', 'app');

-- Create enum for approval status
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Create enum for interaction types
CREATE TYPE public.interaction_type AS ENUM ('view', 'click', 'launch', 'complete', 'favorite');

-- Create content categories table
CREATE TABLE public.content_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create content items table
CREATE TABLE public.content_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content_type public.content_type NOT NULL,
  category_id UUID REFERENCES public.content_categories(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  age_min INTEGER DEFAULT 3,
  age_max INTEGER DEFAULT 18,
  autism_features JSONB DEFAULT '{}',
  platform TEXT DEFAULT 'web',
  is_free BOOLEAN DEFAULT true,
  content_rating TEXT DEFAULT 'E',
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_by UUID,
  approved_by UUID,
  approval_status public.approval_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create content interactions table for logging
CREATE TABLE public.content_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_item_id UUID REFERENCES public.content_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  family_id UUID,
  interaction_type public.interaction_type NOT NULL,
  session_duration INTEGER DEFAULT 0,
  device_info JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Create content favorites table
CREATE TABLE public.content_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_item_id UUID REFERENCES public.content_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(content_item_id, user_id)
);

-- Enable RLS
ALTER TABLE public.content_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for content_categories
CREATE POLICY "Anyone can view active categories" 
ON public.content_categories 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage categories" 
ON public.content_categories 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for content_items
CREATE POLICY "Anyone can view approved active content" 
ON public.content_items 
FOR SELECT 
USING (is_active = true AND approval_status = 'approved');

CREATE POLICY "Admins can manage all content" 
ON public.content_items 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for content_interactions
CREATE POLICY "Users can log their own interactions" 
ON public.content_interactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own interactions" 
ON public.content_interactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all interactions" 
ON public.content_interactions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Parents can view their family interactions" 
ON public.content_interactions 
FOR SELECT 
USING (
  has_role(auth.uid(), 'parent'::app_role) AND 
  EXISTS (
    SELECT 1 FROM public.families f 
    WHERE f.id = content_interactions.family_id AND f.created_by = auth.uid()
  )
);

-- RLS Policies for content_favorites
CREATE POLICY "Users can manage their own favorites" 
ON public.content_favorites 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all favorites" 
ON public.content_favorites 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_content_categories_updated_at
BEFORE UPDATE ON public.content_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_items_updated_at
BEFORE UPDATE ON public.content_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.content_categories (name, description, icon, sort_order) VALUES
('Communication & AAC', 'Augmentative and Alternative Communication tools', 'MessageCircle', 1),
('Educational Learning', 'Interactive learning games and activities', 'GraduationCap', 2),
('Social Skills', 'Social stories and interaction practice', 'Users', 3),
('Speech Therapy', 'Speech development and articulation exercises', 'Mic', 4),
('Daily Routines', 'Visual schedules and routine planning', 'Calendar', 5),
('Storytelling', 'Interactive stories and narrative tools', 'Book', 6),
('Progress Tracking', 'Behavior monitoring and progress tools', 'TrendingUp', 7),
('Interactive Games', 'Fun puzzles and matching activities', 'Gamepad2', 8),
('Emotional Regulation', 'Emotion identification and coping tools', 'Heart', 9),
('Cognitive Development', 'Memory and cognitive training games', 'Brain', 10);