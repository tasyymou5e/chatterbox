-- Add foreign key constraint for family_id -> families (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chores_family_id_fkey'
  ) THEN
    ALTER TABLE public.chores
    ADD CONSTRAINT chores_family_id_fkey
    FOREIGN KEY (family_id)
    REFERENCES public.families(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraint for template_id -> chore_templates (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chores_template_id_fkey'
  ) THEN
    ALTER TABLE public.chores
    ADD CONSTRAINT chores_template_id_fkey
    FOREIGN KEY (template_id)
    REFERENCES public.chore_templates(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Add foreign key constraint for category_id -> chore_categories (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chores_category_id_fkey'
  ) THEN
    ALTER TABLE public.chores
    ADD CONSTRAINT chores_category_id_fkey
    FOREIGN KEY (category_id)
    REFERENCES public.chore_categories(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Add foreign key constraint for created_by -> profiles (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chores_created_by_fkey'
  ) THEN
    ALTER TABLE public.chores
    ADD CONSTRAINT chores_created_by_fkey
    FOREIGN KEY (created_by)
    REFERENCES public.profiles(user_id)
    ON DELETE CASCADE;
  END IF;
END $$;