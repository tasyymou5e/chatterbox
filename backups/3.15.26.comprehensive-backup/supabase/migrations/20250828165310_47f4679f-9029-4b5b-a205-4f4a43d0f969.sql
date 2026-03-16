-- Create comprehensive logging tables for parent and child authentication

-- User activity logs table for detailed login/logout tracking
CREATE TABLE public.user_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('login', 'logout', 'signup', 'failed_login', 'password_reset', 'session_expired')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  device_info JSONB DEFAULT '{}',
  session_id TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Family activity logs for family-specific tracking
CREATE TABLE public.family_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  member_role app_role NOT NULL,
  parent_user_id UUID, -- For child logins, track which parent owns the family
  activity_type TEXT NOT NULL,
  activity_details JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User sessions table for active session tracking
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id TEXT NOT NULL UNIQUE,
  family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
  device_info JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_activity_logs
CREATE POLICY "Users can view their own activity logs" 
ON public.user_activity_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Parents can view their children's activity logs" 
ON public.user_activity_logs 
FOR SELECT 
USING (
  has_role(auth.uid(), 'parent'::app_role) AND 
  EXISTS (
    SELECT 1 FROM public.family_members fm 
    JOIN public.families f ON fm.family_id = f.id 
    WHERE f.created_by = auth.uid() AND fm.user_id = user_activity_logs.user_id
  )
);

CREATE POLICY "Admins can view all activity logs" 
ON public.user_activity_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert activity logs" 
ON public.user_activity_logs 
FOR INSERT 
WITH CHECK (true);

-- RLS Policies for family_activity_logs
CREATE POLICY "Family members can view family activity logs" 
ON public.family_activity_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm 
    WHERE fm.family_id = family_activity_logs.family_id AND fm.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all family activity logs" 
ON public.family_activity_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert family activity logs" 
ON public.family_activity_logs 
FOR INSERT 
WITH CHECK (true);

-- RLS Policies for user_sessions
CREATE POLICY "Users can view their own sessions" 
ON public.user_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Parents can view their children's sessions" 
ON public.user_sessions 
FOR SELECT 
USING (
  has_role(auth.uid(), 'parent'::app_role) AND 
  EXISTS (
    SELECT 1 FROM public.family_members fm 
    JOIN public.families f ON fm.family_id = f.id 
    WHERE f.created_by = auth.uid() AND fm.user_id = user_sessions.user_id
  )
);

CREATE POLICY "Admins can view all sessions" 
ON public.user_sessions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage sessions" 
ON public.user_sessions 
FOR ALL 
USING (true);

-- Create indexes for performance
CREATE INDEX idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);
CREATE INDEX idx_user_activity_logs_timestamp ON public.user_activity_logs(timestamp DESC);
CREATE INDEX idx_user_activity_logs_activity_type ON public.user_activity_logs(activity_type);
CREATE INDEX idx_user_activity_logs_session_id ON public.user_activity_logs(session_id);

CREATE INDEX idx_family_activity_logs_family_id ON public.family_activity_logs(family_id);
CREATE INDEX idx_family_activity_logs_user_id ON public.family_activity_logs(user_id);
CREATE INDEX idx_family_activity_logs_timestamp ON public.family_activity_logs(timestamp DESC);

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_id ON public.user_sessions(session_id);
CREATE INDEX idx_user_sessions_is_active ON public.user_sessions(is_active);
CREATE INDEX idx_user_sessions_family_id ON public.user_sessions(family_id);

-- Create function to automatically end sessions on logout
CREATE OR REPLACE FUNCTION public.end_user_session(session_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.user_sessions 
  SET ended_at = now(), is_active = false, updated_at = now()
  WHERE user_sessions.session_id = end_user_session.session_id AND is_active = true;
END;
$$;

-- Create function to log user activity
CREATE OR REPLACE FUNCTION public.log_user_activity(
  p_user_id UUID,
  p_activity_type TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_device_info JSONB DEFAULT '{}',
  p_session_id TEXT DEFAULT NULL,
  p_success BOOLEAN DEFAULT true,
  p_failure_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.user_activity_logs (
    user_id, activity_type, ip_address, user_agent, device_info, 
    session_id, success, failure_reason, metadata
  ) VALUES (
    p_user_id, p_activity_type, p_ip_address, p_user_agent, p_device_info,
    p_session_id, p_success, p_failure_reason, p_metadata
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Create function to log family activity
CREATE OR REPLACE FUNCTION public.log_family_activity(
  p_family_id UUID,
  p_user_id UUID,
  p_member_role app_role,
  p_parent_user_id UUID DEFAULT NULL,
  p_activity_type TEXT,
  p_activity_details JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.family_activity_logs (
    family_id, user_id, member_role, parent_user_id, activity_type, activity_details
  ) VALUES (
    p_family_id, p_user_id, p_member_role, p_parent_user_id, p_activity_type, p_activity_details
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Add trigger for updating user_sessions.updated_at
CREATE TRIGGER update_user_sessions_updated_at
BEFORE UPDATE ON public.user_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();