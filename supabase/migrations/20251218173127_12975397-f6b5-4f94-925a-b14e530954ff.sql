-- Add missing FK covering index for content_items.category_id
CREATE INDEX IF NOT EXISTS idx_content_items_category_id 
ON public.content_items(category_id);