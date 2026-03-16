-- Phase 1: Extended Family Networks - Database Schema Extensions

-- Extend app_role enum to include connection roles
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'therapist';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'teacher';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'grandparent';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'family_friend';

-- Create family_connections table
CREATE TABLE public.family_connections (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    connected_user_id UUID NOT NULL,
    connection_role app_role NOT NULL,
    invited_by UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),
    permissions JSONB NOT NULL DEFAULT '{"can_view_progress": true, "can_comment": false, "can_assign_tasks": false}'::jsonb,
    connection_metadata JSONB DEFAULT '{}'::jsonb,
    expires_at TIMESTAMP WITH TIME ZONE,
    connected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(family_id, connected_user_id),
    CONSTRAINT valid_connection_role CHECK (connection_role IN ('therapist', 'teacher', 'grandparent', 'family_friend'))
);

-- Create family_invitations table for pending invites
CREATE TABLE public.family_invitations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    invited_email TEXT NOT NULL,
    connection_role app_role NOT NULL,
    invited_by UUID NOT NULL,
    invitation_message TEXT,
    permissions JSONB NOT NULL DEFAULT '{"can_view_progress": true, "can_comment": false, "can_assign_tasks": false}'::jsonb,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(family_id, invited_email),
    CONSTRAINT valid_invitation_role CHECK (connection_role IN ('therapist', 'teacher', 'grandparent', 'family_friend'))
);

-- Extend existing tables with connection-related JSONB fields
ALTER TABLE public.chore_assignments 
ADD COLUMN visibility_settings JSONB DEFAULT '{"visible_to_connections": [], "connection_permissions": {}}'::jsonb;

ALTER TABLE public.user_achievements 
ADD COLUMN shared_with_connections JSONB DEFAULT '{"shared_connections": [], "sharing_preferences": {"auto_share": false}}'::jsonb;

ALTER TABLE public.family_members 
ADD COLUMN connection_metadata JSONB DEFAULT '{}'::jsonb;

-- Create connection-specific security functions
CREATE OR REPLACE FUNCTION public.is_family_connection(family_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_connections 
    WHERE family_id = family_id_param 
    AND connected_user_id = user_id_param 
    AND status = 'accepted'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_connection_permission(family_id_param UUID, user_id_param UUID, permission_key TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_connections 
    WHERE family_id = family_id_param 
    AND connected_user_id = user_id_param 
    AND status = 'accepted'
    AND (permissions->permission_key)::boolean = true
  );
$$;

-- Enable RLS on new tables
ALTER TABLE public.family_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for family_connections
CREATE POLICY "Family creators can manage connections" 
ON public.family_connections 
FOR ALL 
USING (
  has_role(auth.uid(), 'parent'::app_role) AND 
  EXISTS (SELECT 1 FROM public.families WHERE id = family_id AND created_by = auth.uid())
) 
WITH CHECK (
  has_role(auth.uid(), 'parent'::app_role) AND 
  EXISTS (SELECT 1 FROM public.families WHERE id = family_id AND created_by = auth.uid())
);

CREATE POLICY "Connected users can view their connections" 
ON public.family_connections 
FOR SELECT 
USING (connected_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Family members can view connections" 
ON public.family_connections 
FOR SELECT 
USING (is_family_member(family_id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for family_invitations
CREATE POLICY "Family creators can manage invitations" 
ON public.family_invitations 
FOR ALL 
USING (
  has_role(auth.uid(), 'parent'::app_role) AND 
  EXISTS (SELECT 1 FROM public.families WHERE id = family_id AND created_by = auth.uid())
) 
WITH CHECK (
  has_role(auth.uid(), 'parent'::app_role) AND 
  EXISTS (SELECT 1 FROM public.families WHERE id = family_id AND created_by = auth.uid())
);

CREATE POLICY "Admins can view all invitations" 
ON public.family_invitations 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add triggers for updated_at
CREATE TRIGGER update_family_connections_updated_at
  BEFORE UPDATE ON public.family_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_family_connections_family_user ON public.family_connections(family_id, connected_user_id);
CREATE INDEX idx_family_connections_status ON public.family_connections(status);
CREATE INDEX idx_family_invitations_family_email ON public.family_invitations(family_id, invited_email);
CREATE INDEX idx_family_invitations_expires ON public.family_invitations(expires_at) WHERE expires_at IS NOT NULL;