-- Phase 1: Extended Family Networks - Step 1: Extend enum only
-- This must be done separately due to PostgreSQL enum constraints

ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'therapist';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'teacher';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'grandparent';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'family_friend';