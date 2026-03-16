-- Phase 3: Database Optimizations for 10K+ Users
-- Add composite indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_items_active_approved 
ON content_items (is_active, approval_status) 
WHERE is_active = true AND approval_status = 'approved';

CREATE INDEX IF NOT EXISTS idx_content_items_category_age 
ON content_items (category_id, age_min, age_max) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_family_content_access_lookup 
ON family_content_access (family_id, content_item_id, access_type);

CREATE INDEX IF NOT EXISTS idx_content_favorites_user_lookup
ON content_favorites (user_id, content_item_id);

CREATE INDEX IF NOT EXISTS idx_content_interactions_user_family
ON content_interactions (user_id, family_id, timestamp);

-- Create materialized view for popular content
CREATE MATERIALIZED VIEW IF NOT EXISTS popular_content AS
SELECT 
  ci.id,
  ci.title,
  ci.category_id,
  ci.age_min,
  ci.age_max,
  COALESCE(COUNT(DISTINCT cf.id), 0) as favorite_count,
  COALESCE(COUNT(DISTINCT cint.id), 0) as interaction_count,
  (COALESCE(COUNT(DISTINCT cf.id), 0) * 2 + COALESCE(COUNT(DISTINCT cint.id), 0)) as popularity_score
FROM content_items ci
LEFT JOIN content_favorites cf ON ci.id = cf.content_item_id
LEFT JOIN content_interactions cint ON ci.id = cint.content_item_id
WHERE ci.is_active = true AND ci.approval_status = 'approved'
GROUP BY ci.id, ci.title, ci.category_id, ci.age_min, ci.age_max
ORDER BY popularity_score DESC;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_popular_content_id ON popular_content (id);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_popular_content()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY popular_content;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for auto-refresh (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'refresh_popular_content_on_favorite') THEN
    CREATE TRIGGER refresh_popular_content_on_favorite
      AFTER INSERT OR DELETE ON content_favorites
      FOR EACH STATEMENT EXECUTE FUNCTION refresh_popular_content();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'refresh_popular_content_on_interaction') THEN
    CREATE TRIGGER refresh_popular_content_on_interaction
      AFTER INSERT ON content_interactions
      FOR EACH STATEMENT EXECUTE FUNCTION refresh_popular_content();
  END IF;
END $$;