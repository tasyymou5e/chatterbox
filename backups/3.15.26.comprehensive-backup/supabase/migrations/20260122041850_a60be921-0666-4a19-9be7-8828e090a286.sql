-- Create child_avatars table for customizable avatar configurations
CREATE TABLE public.child_avatars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
  
  -- Avatar type: 'illustrated' (built-in characters) or 'uploaded' (custom photo)
  avatar_type TEXT NOT NULL DEFAULT 'illustrated' CHECK (avatar_type IN ('illustrated', 'uploaded')),
  
  -- For illustrated avatars - character customization
  base_character TEXT DEFAULT 'kid1', -- kid1, kid2, kid3, etc.
  skin_tone TEXT DEFAULT 'medium', -- light, medium, tan, dark
  hair_color TEXT DEFAULT 'brown', -- brown, black, blonde, red, blue, purple, etc.
  hair_style TEXT DEFAULT 'short', -- short, long, curly, spiky, ponytail, etc.
  eye_color TEXT DEFAULT 'brown', -- brown, blue, green, hazel
  accessory TEXT, -- glasses, hat, bow, headband, etc.
  outfit_color TEXT DEFAULT 'blue', -- primary color for outfit
  
  -- For uploaded avatars
  uploaded_url TEXT, -- Storage URL for custom photo
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one avatar per user
  CONSTRAINT unique_user_avatar UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.child_avatars ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own avatar
CREATE POLICY "Users can view own avatar"
ON public.child_avatars
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own avatar
CREATE POLICY "Users can create own avatar"
ON public.child_avatars
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own avatar
CREATE POLICY "Users can update own avatar"
ON public.child_avatars
FOR UPDATE
USING (auth.uid() = user_id);

-- Parents can view avatars of children in their family
CREATE POLICY "Parents can view family avatars"
ON public.child_avatars
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = child_avatars.family_id
    AND fm.user_id = auth.uid()
    AND fm.role IN ('parent', 'admin')
  )
);

-- Parents can manage avatars for children in their family
CREATE POLICY "Parents can manage family child avatars"
ON public.child_avatars
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = child_avatars.family_id
    AND fm.user_id = auth.uid()
    AND fm.role IN ('parent', 'admin')
  )
  AND
  EXISTS (
    SELECT 1 FROM public.family_members child_fm
    WHERE child_fm.user_id = child_avatars.user_id
    AND child_fm.role = 'child'
  )
);

-- Create updated_at trigger
CREATE TRIGGER update_child_avatars_updated_at
BEFORE UPDATE ON public.child_avatars
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for avatar uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars', 
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Storage policies for avatars bucket
-- Anyone can view public avatars
CREATE POLICY "Public avatar access"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

-- Users can upload their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create index for faster lookups
CREATE INDEX idx_child_avatars_user_id ON public.child_avatars(user_id);
CREATE INDEX idx_child_avatars_family_id ON public.child_avatars(family_id);