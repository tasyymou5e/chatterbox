-- Create storage bucket for parent voice recordings
INSERT INTO storage.buckets (id, name, public) 
VALUES ('parent-voice-recordings', 'parent-voice-recordings', false);

-- RLS policies for the bucket
CREATE POLICY "Parents can upload voice recordings" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'parent-voice-recordings' 
  AND auth.uid() IS NOT NULL
  AND has_role(auth.uid(), 'parent'::app_role)
);

CREATE POLICY "Parents can read own recordings" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'parent-voice-recordings' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Parents can delete own recordings" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'parent-voice-recordings' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Metadata table for voice recordings
CREATE TABLE public.parent_voice_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  phrase_key TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  duration_seconds NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(family_id, phrase_key)
);

-- Enable RLS
ALTER TABLE public.parent_voice_recordings ENABLE ROW LEVEL SECURITY;

-- RLS policies for parent_voice_recordings
CREATE POLICY "parent_voice_recordings_access" 
ON public.parent_voice_recordings 
FOR ALL 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (
    has_role(auth.uid(), 'parent'::app_role) 
    AND EXISTS (
      SELECT 1 FROM families f 
      WHERE f.id = parent_voice_recordings.family_id 
      AND f.created_by = auth.uid()
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (
    has_role(auth.uid(), 'parent'::app_role) 
    AND user_id = auth.uid()
  )
);

-- Add updated_at trigger
CREATE TRIGGER update_parent_voice_recordings_updated_at
BEFORE UPDATE ON public.parent_voice_recordings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();