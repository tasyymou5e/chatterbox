-- Create edge function for Supabase analytics query
-- This helps the DatabaseLogs component fetch logs from Supabase analytics

-- We need to create an edge function to query Supabase analytics
-- since direct queries to analytics may not be accessible from client-side