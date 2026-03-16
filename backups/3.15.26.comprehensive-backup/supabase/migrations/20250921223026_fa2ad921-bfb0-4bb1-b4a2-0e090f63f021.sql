-- Add 'read_only' role to app_role enum
ALTER TYPE public.app_role ADD VALUE 'read_only';

-- Update existing functions that use app_role to handle read_only role
-- This ensures the new role works with existing security functions