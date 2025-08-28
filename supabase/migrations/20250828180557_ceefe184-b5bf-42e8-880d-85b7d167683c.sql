-- Add missing foreign key indexes to improve query performance
-- These indexes support the content catalog and family management functionality

-- Foreign key indexes for content catalog
CREATE INDEX IF NOT EXISTS idx_content_interactions_content_item_id 
ON public.content_interactions (content_item_id);

CREATE INDEX IF NOT EXISTS idx_content_items_category_id 
ON public.content_items (category_id);

-- Foreign key indexes for family management
CREATE INDEX IF NOT EXISTS idx_families_created_by 
ON public.families (created_by);

CREATE INDEX IF NOT EXISTS idx_family_members_invited_by 
ON public.family_members (invited_by);

CREATE INDEX IF NOT EXISTS idx_family_members_user_id 
ON public.family_members (user_id);

-- Strategic composite indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_content_interactions_user_content 
ON public.content_interactions (user_id, content_item_id);

CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_date 
ON public.user_activity_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_family_members_family_role 
ON public.family_members (family_id, role);