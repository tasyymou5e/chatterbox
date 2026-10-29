-- Objects that `supabase db dump` leaves out because they live in Supabase-managed
-- schemas (auth, storage, cron, realtime publication). Applied by
-- scripts/local/pull-supabase.sh after the schema + data restore. Idempotent.
-- Generated from the live project schema; keep in sync if these change.

SET search_path = public, extensions;

-- Create profile/role rows when a user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('parent-voice-recordings', 'parent-voice-recordings', false, NULL, NULL),
  ('chore-photos', 'chore-photos', false, 5242880, '{image/jpeg,image/png,image/webp}'),
  ('avatars', 'avatars', true, 2097152, '{image/jpeg,image/png,image/webp,image/gif}')
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Children can upload completion photos" ON storage.objects;
CREATE POLICY "Children can upload completion photos" ON storage.objects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((bucket_id = 'chore-photos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
DROP POLICY IF EXISTS "Family members can view chore photos" ON storage.objects;
CREATE POLICY "Family members can view chore photos" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING (((bucket_id = 'chore-photos'::text) AND (auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM family_members fm
  WHERE ((fm.user_id = auth.uid()) AND ((fm.family_id)::text = (storage.foldername(objects.name))[2]))))));
DROP POLICY IF EXISTS "Parents can delete family chore photos" ON storage.objects;
CREATE POLICY "Parents can delete family chore photos" ON storage.objects AS PERMISSIVE FOR DELETE TO public
  USING (((bucket_id = 'chore-photos'::text) AND (EXISTS ( SELECT 1
   FROM family_members fm
  WHERE ((fm.user_id = auth.uid()) AND (fm.role = 'parent'::app_role) AND ((fm.family_id)::text = (storage.foldername(objects.name))[2]))))));
DROP POLICY IF EXISTS "Parents can delete own recordings" ON storage.objects;
CREATE POLICY "Parents can delete own recordings" ON storage.objects AS PERMISSIVE FOR DELETE TO public
  USING (((bucket_id = 'parent-voice-recordings'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
DROP POLICY IF EXISTS "Parents can read own recordings" ON storage.objects;
CREATE POLICY "Parents can read own recordings" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING (((bucket_id = 'parent-voice-recordings'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
DROP POLICY IF EXISTS "Parents can upload voice recordings" ON storage.objects;
CREATE POLICY "Parents can upload voice recordings" ON storage.objects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((bucket_id = 'parent-voice-recordings'::text) AND (auth.uid() IS NOT NULL) AND has_role(auth.uid(), 'parent'::app_role)));
DROP POLICY IF EXISTS "Public avatar access" ON storage.objects;
CREATE POLICY "Public avatar access" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING ((bucket_id = 'avatars'::text));
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar" ON storage.objects AS PERMISSIVE FOR DELETE TO public
  USING (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
DROP POLICY IF EXISTS "Users can delete own chore photos" ON storage.objects;
CREATE POLICY "Users can delete own chore photos" ON storage.objects AS PERMISSIVE FOR DELETE TO public
  USING (((bucket_id = 'chore-photos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar" ON storage.objects AS PERMISSIVE FOR UPDATE TO public
  USING (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar" ON storage.objects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

-- Realtime
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['content_categories', 'content_items', 'family_content_access'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- Scheduled jobs. The hourly edge-function health check is left out locally: in
-- production it calls the hosted functions URL.
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('cleanup-old-health-logs-daily', '0 3 * * *', 'SELECT public.cleanup_old_health_logs();');
