-- Add child account tracking table
CREATE TABLE public.child_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  created_by UUID NOT NULL, -- Parent who created this child account
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  generated_email TEXT NOT NULL UNIQUE,
  family_code TEXT NOT NULL, -- Code for child to complete signup
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'disabled')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Set when child completes signup
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  
  -- Ensure unique child accounts per family
  UNIQUE(family_id, generated_email)
);

-- Enable RLS
ALTER TABLE public.child_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for child_accounts
CREATE POLICY "Parents can manage child accounts in their families"
  ON public.child_accounts
  FOR ALL
  USING (
    has_role(auth.uid(), 'parent'::app_role) AND 
    EXISTS (
      SELECT 1 FROM public.families 
      WHERE id = child_accounts.family_id AND created_by = auth.uid()
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'parent'::app_role) AND 
    EXISTS (
      SELECT 1 FROM public.families 
      WHERE id = child_accounts.family_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Admins can view all child accounts"
  ON public.child_accounts
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Children can view their own account record"
  ON public.child_accounts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_child_accounts_family_id ON public.child_accounts(family_id);
CREATE INDEX idx_child_accounts_created_by ON public.child_accounts(created_by);
CREATE INDEX idx_child_accounts_family_code ON public.child_accounts(family_code);
CREATE INDEX idx_child_accounts_status ON public.child_accounts(status);

-- Function to generate unique child account codes
CREATE OR REPLACE FUNCTION public.generate_child_account_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a 8-character code with letters and numbers
    new_code := 'CHILD-' || upper(substring(gen_random_uuid()::text from 1 for 8));
    
    -- Check if code exists
    SELECT EXISTS(
      SELECT 1 FROM public.child_accounts WHERE family_code = new_code
    ) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;