-- Create storage bucket for chore completion photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chore-photos',
  'chore-photos', 
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- RLS policies for chore-photos bucket
-- Children can upload photos for their own assignments
CREATE POLICY "Children can upload completion photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chore-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Family members can view photos from their family
CREATE POLICY "Family members can view chore photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chore-photos' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.user_id = auth.uid()
    AND fm.family_id::text = (storage.foldername(name))[2]
  )
);

-- Users can delete their own photos
CREATE POLICY "Users can delete own chore photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chore-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Parents can delete any family chore photos
CREATE POLICY "Parents can delete family chore photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chore-photos' AND
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.user_id = auth.uid()
    AND fm.role = 'parent'
    AND fm.family_id::text = (storage.foldername(name))[2]
  )
);

-- Add 'needs_redo' status to chore_status enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'needs_redo' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'chore_status')
  ) THEN
    ALTER TYPE chore_status ADD VALUE 'needs_redo';
  END IF;
END$$;

-- Helper function to calculate next due date for recurring chores
CREATE OR REPLACE FUNCTION public.calculate_next_due_date(
  pattern jsonb,
  current_due_date date
) RETURNS date
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  freq text;
  interval_days int;
  next_date date;
  day_of_week int;
  target_days int[];
  i int;
  found_day boolean := false;
BEGIN
  IF pattern IS NULL OR current_due_date IS NULL THEN
    RETURN NULL;
  END IF;

  freq := pattern->>'frequency';
  
  CASE freq
    WHEN 'daily' THEN
      next_date := current_due_date + INTERVAL '1 day';
      
    WHEN 'weekly' THEN
      IF pattern->'daysOfWeek' IS NOT NULL AND jsonb_array_length(pattern->'daysOfWeek') > 0 THEN
        -- Get target days from pattern
        SELECT ARRAY(SELECT (jsonb_array_elements_text(pattern->'daysOfWeek'))::int)
        INTO target_days;
        
        -- Find next matching day
        next_date := current_due_date + INTERVAL '1 day';
        FOR i IN 1..14 LOOP
          day_of_week := EXTRACT(DOW FROM next_date)::int;
          IF day_of_week = ANY(target_days) THEN
            found_day := true;
            EXIT;
          END IF;
          next_date := next_date + INTERVAL '1 day';
        END LOOP;
        
        IF NOT found_day THEN
          next_date := current_due_date + INTERVAL '7 days';
        END IF;
      ELSE
        next_date := current_due_date + INTERVAL '7 days';
      END IF;
      
    WHEN 'custom' THEN
      interval_days := COALESCE((pattern->>'interval')::int, 1);
      IF interval_days < 1 THEN interval_days := 1; END IF;
      next_date := current_due_date + (interval_days || ' days')::interval;
      
    ELSE
      RETURN NULL;
  END CASE;
  
  -- Check end date constraint
  IF pattern->>'endDate' IS NOT NULL THEN
    IF next_date > (pattern->>'endDate')::date THEN
      RETURN NULL;
    END IF;
  END IF;
  
  -- Check max occurrences (if tracked)
  IF pattern->>'maxOccurrences' IS NOT NULL THEN
    IF (pattern->>'currentOccurrence')::int >= (pattern->>'maxOccurrences')::int THEN
      RETURN NULL;
    END IF;
  END IF;
  
  RETURN next_date;
END;
$$;

-- Function to create next recurring assignment
CREATE OR REPLACE FUNCTION public.create_next_recurring_assignment(
  p_assignment_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment RECORD;
  v_next_due date;
  v_new_id uuid;
  v_updated_pattern jsonb;
BEGIN
  -- Get the original assignment
  SELECT * INTO v_assignment
  FROM public.chore_assignments
  WHERE id = p_assignment_id;
  
  IF v_assignment IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Calculate next due date
  v_next_due := public.calculate_next_due_date(
    v_assignment.recurrence_pattern,
    COALESCE(v_assignment.due_date::date, CURRENT_DATE)
  );
  
  IF v_next_due IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Update pattern with occurrence count
  v_updated_pattern := v_assignment.recurrence_pattern;
  IF v_updated_pattern->>'currentOccurrence' IS NOT NULL THEN
    v_updated_pattern := jsonb_set(
      v_updated_pattern,
      '{currentOccurrence}',
      to_jsonb((v_updated_pattern->>'currentOccurrence')::int + 1)
    );
  ELSE
    v_updated_pattern := jsonb_set(v_updated_pattern, '{currentOccurrence}', '1');
  END IF;
  
  -- Create new assignment
  INSERT INTO public.chore_assignments (
    chore_id,
    family_id,
    assigned_to,
    assigned_by,
    due_date,
    status,
    recurrence_pattern
  ) VALUES (
    v_assignment.chore_id,
    v_assignment.family_id,
    v_assignment.assigned_to,
    v_assignment.assigned_by,
    v_next_due::timestamp with time zone,
    'assigned',
    v_updated_pattern
  ) RETURNING id INTO v_new_id;
  
  RETURN v_new_id;
END;
$$;