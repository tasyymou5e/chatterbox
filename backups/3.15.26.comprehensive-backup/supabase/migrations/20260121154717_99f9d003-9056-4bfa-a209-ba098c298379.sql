-- Create helper functions for child game assignments management

-- Function to get child game assignments
CREATE OR REPLACE FUNCTION public.get_child_game_assignments(
  p_child_id UUID,
  p_family_id UUID
)
RETURNS TABLE (
  content_item_id UUID,
  is_required BOOLEAN,
  difficulty_override VARCHAR(20),
  due_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cga.content_item_id,
    cga.is_required,
    cga.difficulty_override,
    cga.due_date
  FROM child_game_assignments cga
  WHERE cga.child_id = p_child_id
    AND cga.family_id = p_family_id;
END;
$$;

-- Function to upsert child game assignment
CREATE OR REPLACE FUNCTION public.upsert_child_game_assignment(
  p_child_id UUID,
  p_content_item_id UUID,
  p_family_id UUID,
  p_assigned_by UUID,
  p_is_required BOOLEAN DEFAULT false,
  p_difficulty_override VARCHAR(20) DEFAULT NULL,
  p_due_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO child_game_assignments (
    child_id,
    content_item_id,
    family_id,
    assigned_by,
    is_required,
    difficulty_override,
    due_date,
    status
  ) VALUES (
    p_child_id,
    p_content_item_id,
    p_family_id,
    p_assigned_by,
    p_is_required,
    p_difficulty_override,
    p_due_date,
    'assigned'
  )
  ON CONFLICT (child_id, content_item_id) 
  DO UPDATE SET
    is_required = EXCLUDED.is_required,
    difficulty_override = EXCLUDED.difficulty_override,
    due_date = EXCLUDED.due_date,
    updated_at = NOW();
END;
$$;

-- Function to delete child game assignment
CREATE OR REPLACE FUNCTION public.delete_child_game_assignment(
  p_child_id UUID,
  p_family_id UUID,
  p_content_item_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM child_game_assignments
  WHERE child_id = p_child_id
    AND family_id = p_family_id
    AND content_item_id = p_content_item_id;
END;
$$;