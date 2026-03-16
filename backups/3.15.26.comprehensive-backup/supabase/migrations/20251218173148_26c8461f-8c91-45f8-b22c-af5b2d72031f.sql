-- Add missing FK covering index for content_interactions.content_item_id
CREATE INDEX IF NOT EXISTS idx_content_interactions_content_item_id 
ON public.content_interactions(content_item_id);