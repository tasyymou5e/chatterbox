-- Phase 1: Enable Realtime Infrastructure
-- Enable realtime replication for content tables
ALTER TABLE content_items REPLICA IDENTITY FULL;
ALTER TABLE content_categories REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE content_items;
ALTER PUBLICATION supabase_realtime ADD TABLE content_categories;