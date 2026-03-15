
-- Drop unused custom indexes on log tables to reduce write overhead
-- These indexes have idx_scan = 0 (never used)

DROP INDEX IF EXISTS idx_security_audit_logs_user_events;
DROP INDEX IF EXISTS idx_content_items_skill_levels;
DROP INDEX IF EXISTS idx_life_skill_catalog_category;
DROP INDEX IF EXISTS idx_life_skill_catalog_domain;
DROP INDEX IF EXISTS idx_llm_providers_active;

-- Add missing indexes for common query patterns on edge_function_health_logs
-- This is the highest-write table and queries filter by function_name + created_at
CREATE INDEX IF NOT EXISTS idx_efhl_function_created 
  ON public.edge_function_health_logs (function_name, created_at DESC);

-- Add comment documenting future partitioning plan
COMMENT ON TABLE public.edge_function_health_logs IS 
  'High-write monitoring table. Consider range partitioning by created_at when exceeding 100K rows.';
