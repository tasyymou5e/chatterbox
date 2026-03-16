-- Phase 1: Fix auth_rls_initplan performance issues
-- This migration wraps all auth.uid() calls in (SELECT auth.uid()) subqueries

-- =====================================================
-- achievements table
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view active achievements" ON public.achievements;
CREATE POLICY "Authenticated users can view active achievements"
ON public.achievements FOR SELECT
USING ((is_active = true) AND ((SELECT auth.uid()) IS NOT NULL));

-- =====================================================
-- admin_audit_logs table
-- =====================================================
DROP POLICY IF EXISTS "Admin audit logs admin only" ON public.admin_audit_logs;
CREATE POLICY "Admin audit logs admin only"
ON public.admin_audit_logs FOR SELECT
USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'read_only'::app_role));

DROP POLICY IF EXISTS "Admins can manage audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can manage audit logs"
ON public.admin_audit_logs FOR ALL
USING (has_role((SELECT auth.uid()), 'admin'::app_role));

-- =====================================================
-- analytics_insights table
-- =====================================================
DROP POLICY IF EXISTS "Family members can view insights" ON public.analytics_insights;
CREATE POLICY "Family members can view insights"
ON public.analytics_insights FOR SELECT
USING ((EXISTS ( SELECT 1 FROM family_members fm WHERE ((fm.family_id = analytics_insights.family_id) AND (fm.user_id = (SELECT auth.uid()))))) OR has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "System can manage insights" ON public.analytics_insights;
CREATE POLICY "System can manage insights"
ON public.analytics_insights FOR ALL
USING (((SELECT auth.role()) = 'service_role'::text) OR has_role((SELECT auth.uid()), 'admin'::app_role));

-- =====================================================
-- analytics_metrics table
-- =====================================================
DROP POLICY IF EXISTS "Admins can view all analytics metrics" ON public.analytics_metrics;
CREATE POLICY "Admins can view all analytics metrics"
ON public.analytics_metrics FOR SELECT
USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'read_only'::app_role));

DROP POLICY IF EXISTS "Only admins can view analytics metrics" ON public.analytics_metrics;
CREATE POLICY "Only admins can view analytics metrics"
ON public.analytics_metrics FOR SELECT
USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'read_only'::app_role));

DROP POLICY IF EXISTS "Authenticated system can insert analytics metrics" ON public.analytics_metrics;
CREATE POLICY "Authenticated system can insert analytics metrics"
ON public.analytics_metrics FOR INSERT
WITH CHECK (((SELECT auth.role()) = 'service_role'::text) OR ((SELECT auth.uid()) IS NOT NULL));

-- =====================================================
-- archived_system_errors table
-- =====================================================
DROP POLICY IF EXISTS "Admins can view archived errors" ON public.archived_system_errors;
CREATE POLICY "Admins can view archived errors"
ON public.archived_system_errors FOR SELECT
USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'read_only'::app_role));

DROP POLICY IF EXISTS "System can manage archived errors" ON public.archived_system_errors;
CREATE POLICY "System can manage archived errors"
ON public.archived_system_errors FOR INSERT
WITH CHECK ((SELECT auth.role()) = 'service_role'::text);

-- =====================================================
-- archived_user_activity_logs table
-- =====================================================
DROP POLICY IF EXISTS "Admins can view archived logs" ON public.archived_user_activity_logs;
CREATE POLICY "Admins can view archived logs"
ON public.archived_user_activity_logs FOR SELECT
USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'read_only'::app_role));

DROP POLICY IF EXISTS "System can manage archived logs" ON public.archived_user_activity_logs;
CREATE POLICY "System can manage archived logs"
ON public.archived_user_activity_logs FOR INSERT
WITH CHECK ((SELECT auth.role()) = 'service_role'::text);

-- =====================================================
-- behavioral_events table
-- =====================================================
DROP POLICY IF EXISTS "behavioral_events_user_admin_only_select" ON public.behavioral_events;
CREATE POLICY "behavioral_events_user_admin_only_select"
ON public.behavioral_events FOR SELECT
USING ((user_id = (SELECT auth.uid())) OR has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "behavioral_events_user_only_insert" ON public.behavioral_events;
CREATE POLICY "behavioral_events_user_only_insert"
ON public.behavioral_events FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

-- =====================================================
-- child_accounts table
-- =====================================================
DROP POLICY IF EXISTS "child_accounts_secure_delete" ON public.child_accounts;
CREATE POLICY "child_accounts_secure_delete"
ON public.child_accounts FOR DELETE
USING ((created_by = (SELECT auth.uid())) OR has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "child_accounts_secure_insert" ON public.child_accounts;
CREATE POLICY "child_accounts_secure_insert"
ON public.child_accounts FOR INSERT
WITH CHECK ((has_role((SELECT auth.uid()), 'parent'::app_role) AND (created_by = (SELECT auth.uid()))) OR has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "child_accounts_secure_select" ON public.child_accounts;
CREATE POLICY "child_accounts_secure_select"
ON public.child_accounts FOR SELECT
USING ((created_by = (SELECT auth.uid())) OR has_role((SELECT auth.uid()), 'admin'::app_role) OR ((user_id = (SELECT auth.uid())) AND (status = 'completed'::text)));

DROP POLICY IF EXISTS "child_accounts_secure_update" ON public.child_accounts;
CREATE POLICY "child_accounts_secure_update"
ON public.child_accounts FOR UPDATE
USING ((created_by = (SELECT auth.uid())) OR has_role((SELECT auth.uid()), 'admin'::app_role) OR ((user_id = (SELECT auth.uid())) AND (status = 'pending'::text)))
WITH CHECK ((created_by = (SELECT auth.uid())) OR has_role((SELECT auth.uid()), 'admin'::app_role) OR ((user_id = (SELECT auth.uid())) AND (status = ANY (ARRAY['pending'::text, 'completed'::text]))));

-- =====================================================
-- chore_assignments table
-- =====================================================
DROP POLICY IF EXISTS "Children can update their assignments" ON public.chore_assignments;
CREATE POLICY "Children can update their assignments"
ON public.chore_assignments FOR UPDATE
USING ((assigned_to = (SELECT auth.uid())) AND (EXISTS ( SELECT 1 FROM family_members fm WHERE ((fm.family_id = chore_assignments.family_id) AND (fm.user_id = (SELECT auth.uid()))))));

DROP POLICY IF EXISTS "Family members can view assignments" ON public.chore_assignments;
CREATE POLICY "Family members can view assignments"
ON public.chore_assignments FOR SELECT
USING ((EXISTS ( SELECT 1 FROM family_members fm WHERE ((fm.family_id = chore_assignments.family_id) AND (fm.user_id = (SELECT auth.uid()))))) OR has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Parents can manage assignments" ON public.chore_assignments;
CREATE POLICY "Parents can manage assignments"
ON public.chore_assignments FOR ALL
USING ((has_role((SELECT auth.uid()), 'parent'::app_role) AND (EXISTS ( SELECT 1 FROM families f WHERE ((f.id = chore_assignments.family_id) AND (f.created_by = (SELECT auth.uid())))))) OR has_role((SELECT auth.uid()), 'admin'::app_role));

-- =====================================================
-- chore_categories table
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage chore categories" ON public.chore_categories;
CREATE POLICY "Admins can manage chore categories"
ON public.chore_categories FOR ALL
USING (has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can view active chore categories" ON public.chore_categories;
CREATE POLICY "Authenticated users can view active chore categories"
ON public.chore_categories FOR SELECT
USING ((is_active = true) AND ((SELECT auth.uid()) IS NOT NULL));

-- =====================================================
-- chore_completions table
-- =====================================================
DROP POLICY IF EXISTS "Family members can view completions" ON public.chore_completions;
CREATE POLICY "Family members can view completions"
ON public.chore_completions FOR SELECT
USING ((EXISTS ( SELECT 1 FROM family_members fm WHERE ((fm.family_id = chore_completions.family_id) AND (fm.user_id = (SELECT auth.uid()))))) OR has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can create their own completions" ON public.chore_completions;
CREATE POLICY "Users can create their own completions"
ON public.chore_completions FOR INSERT
WITH CHECK ((user_id = (SELECT auth.uid())) AND (EXISTS ( SELECT 1 FROM family_members fm WHERE ((fm.family_id = chore_completions.family_id) AND (fm.user_id = (SELECT auth.uid()))))));

-- =====================================================
-- chore_templates table
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage chore templates" ON public.chore_templates;
CREATE POLICY "Admins can manage chore templates"
ON public.chore_templates FOR ALL
USING (has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can view active chore templates" ON public.chore_templates;
CREATE POLICY "Authenticated users can view active chore templates"
ON public.chore_templates FOR SELECT
USING ((is_active = true) AND ((SELECT auth.uid()) IS NOT NULL));

-- =====================================================
-- chores table
-- =====================================================
DROP POLICY IF EXISTS "Family members can view family chores" ON public.chores;
CREATE POLICY "Family members can view family chores"
ON public.chores FOR SELECT
USING ((EXISTS ( SELECT 1 FROM family_members fm WHERE ((fm.family_id = chores.family_id) AND (fm.user_id = (SELECT auth.uid()))))) OR has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Parents can manage family chores" ON public.chores;
CREATE POLICY "Parents can manage family chores"
ON public.chores FOR ALL
USING ((has_role((SELECT auth.uid()), 'parent'::app_role) AND (EXISTS ( SELECT 1 FROM families f WHERE ((f.id = chores.family_id) AND (f.created_by = (SELECT auth.uid())))))) OR has_role((SELECT auth.uid()), 'admin'::app_role));

-- =====================================================
-- comparative_benchmarks table
-- =====================================================
DROP POLICY IF EXISTS "Admin users can manage benchmarks" ON public.comparative_benchmarks;
CREATE POLICY "Admin users can manage benchmarks"
ON public.comparative_benchmarks FOR ALL
USING (has_role((SELECT auth.uid()), 'admin'::app_role))
WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Admin users can view benchmarks" ON public.comparative_benchmarks;
CREATE POLICY "Admin users can view benchmarks"
ON public.comparative_benchmarks FOR SELECT
USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'read_only'::app_role));

-- =====================================================
-- content_categories table
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage categories" ON public.content_categories;
CREATE POLICY "Admins can manage categories"
ON public.content_categories FOR ALL
USING (has_role((SELECT auth.uid()), 'admin'::app_role));

-- =====================================================
-- content_favorites table
-- =====================================================
DROP POLICY IF EXISTS "Admins can view all favorites" ON public.content_favorites;
CREATE POLICY "Admins can view all favorites"
ON public.content_favorites FOR SELECT
USING (has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.content_favorites;
CREATE POLICY "Users can manage their own favorites"
ON public.content_favorites FOR ALL
USING ((SELECT auth.uid()) = user_id);

-- =====================================================
-- content_interactions table
-- =====================================================
DROP POLICY IF EXISTS "Admins can view all interactions" ON public.content_interactions;
CREATE POLICY "Admins can view all interactions"
ON public.content_interactions FOR SELECT
USING (has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Parents can view their family interactions" ON public.content_interactions;
CREATE POLICY "Parents can view their family interactions"
ON public.content_interactions FOR SELECT
USING (has_role((SELECT auth.uid()), 'parent'::app_role) AND (EXISTS ( SELECT 1 FROM families f WHERE ((f.id = content_interactions.family_id) AND (f.created_by = (SELECT auth.uid()))))));

DROP POLICY IF EXISTS "Users can log their own interactions" ON public.content_interactions;
CREATE POLICY "Users can log their own interactions"
ON public.content_interactions FOR INSERT
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own interactions" ON public.content_interactions;
CREATE POLICY "Users can view their own interactions"
ON public.content_interactions FOR SELECT
USING ((SELECT auth.uid()) = user_id);

-- =====================================================
-- content_items table
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage all content" ON public.content_items;
CREATE POLICY "Admins can manage all content"
ON public.content_items FOR ALL
USING (has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can view approved content" ON public.content_items;
CREATE POLICY "Authenticated users can view approved content"
ON public.content_items FOR SELECT TO authenticated
USING ((is_active = true) AND (approval_status = 'approved'::approval_status) AND (has_role((SELECT auth.uid()), 'admin'::app_role) OR ((NOT (EXISTS ( SELECT 1 FROM family_content_access WHERE (family_content_access.content_item_id = content_items.id)))) OR (EXISTS ( SELECT 1 FROM (family_content_access fca JOIN family_members fm ON ((fm.family_id = fca.family_id))) WHERE ((fca.content_item_id = content_items.id) AND (fm.user_id = (SELECT auth.uid())) AND (fca.access_type = ANY (ARRAY['allowed'::text, 'featured'::text]))))))));

-- =====================================================
-- daily_analytics_data table
-- =====================================================
DROP POLICY IF EXISTS "Admins can view daily analytics" ON public.daily_analytics_data;
CREATE POLICY "Admins can view daily analytics"
ON public.daily_analytics_data FOR SELECT
USING (has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "System can manage daily analytics" ON public.daily_analytics_data;
CREATE POLICY "System can manage daily analytics"
ON public.daily_analytics_data FOR ALL
USING (((SELECT auth.role()) = 'service_role'::text) OR has_role((SELECT auth.uid()), 'admin'::app_role));

-- =====================================================
-- daily_streaks table
-- =====================================================
DROP POLICY IF EXISTS "Authenticated system can manage streaks" ON public.daily_streaks;
CREATE POLICY "Authenticated system can manage streaks"
ON public.daily_streaks FOR ALL
USING (((SELECT auth.role()) = 'service_role'::text) OR (((SELECT auth.uid()) IS NOT NULL) AND has_role((SELECT auth.uid()), 'admin'::app_role)));

DROP POLICY IF EXISTS "Family members can view streaks" ON public.daily_streaks;
CREATE POLICY "Family members can view streaks"
ON public.daily_streaks FOR SELECT
USING ((EXISTS ( SELECT 1 FROM family_members fm WHERE ((fm.family_id = daily_streaks.family_id) AND (fm.user_id = (SELECT auth.uid()))))) OR has_role((SELECT auth.uid()), 'admin'::app_role));

-- =====================================================
-- engagement_metrics table
-- =====================================================
DROP POLICY IF EXISTS "Admins can view engagement metrics" ON public.engagement_metrics;
CREATE POLICY "Admins can view engagement metrics"
ON public.engagement_metrics FOR SELECT
USING (has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated system can insert engagement metrics" ON public.engagement_metrics;
CREATE POLICY "Authenticated system can insert engagement metrics"
ON public.engagement_metrics FOR INSERT
WITH CHECK (((SELECT auth.role()) = 'service_role'::text) OR ((SELECT auth.uid()) IS NOT NULL));

DROP POLICY IF EXISTS "engagement_metrics_strict_access" ON public.engagement_metrics;
CREATE POLICY "engagement_metrics_strict_access"
ON public.engagement_metrics FOR SELECT
USING (((SELECT auth.uid()) = user_id) OR (has_role((SELECT auth.uid()), 'parent'::app_role) AND (EXISTS ( SELECT 1 FROM (families f JOIN family_members fm ON ((f.id = fm.family_id))) WHERE ((f.created_by = (SELECT auth.uid())) AND (fm.user_id = engagement_metrics.user_id) AND (fm.family_id = engagement_metrics.family_id))))) OR has_role((SELECT auth.uid()), 'admin'::app_role));

-- =====================================================
-- error_patterns table
-- =====================================================
DROP POLICY IF EXISTS "Admins can view error patterns" ON public.error_patterns;
CREATE POLICY "Admins can view error patterns"
ON public.error_patterns FOR SELECT
USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'read_only'::app_role));

DROP POLICY IF EXISTS "Authenticated system can manage error patterns" ON public.error_patterns;
CREATE POLICY "Authenticated system can manage error patterns"
ON public.error_patterns FOR ALL
USING (((SELECT auth.role()) = 'service_role'::text) OR (((SELECT auth.uid()) IS NOT NULL) AND has_role((SELECT auth.uid()), 'admin'::app_role)));

-- =====================================================
-- families table
-- =====================================================
DROP POLICY IF EXISTS "Enhanced family access control" ON public.families;
CREATE POLICY "Enhanced family access control"
ON public.families FOR ALL
USING (has_family_access(id, (SELECT auth.uid())))
WITH CHECK (((SELECT auth.uid()) = created_by) OR has_role((SELECT auth.uid()), 'admin'::app_role));

-- =====================================================
-- family_activity_logs table
-- =====================================================
DROP POLICY IF EXISTS "Admins can view all family activity logs" ON public.family_activity_logs;
CREATE POLICY "Admins can view all family activity logs"
ON public.family_activity_logs FOR SELECT
USING (has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated system can insert family activity logs" ON public.family_activity_logs;
CREATE POLICY "Authenticated system can insert family activity logs"
ON public.family_activity_logs FOR INSERT
WITH CHECK (((SELECT auth.role()) = 'service_role'::text) OR ((SELECT auth.uid()) IS NOT NULL));

DROP POLICY IF EXISTS "Parents and admins can view family activity logs" ON public.family_activity_logs;
CREATE POLICY "Parents and admins can view family activity logs"
ON public.family_activity_logs FOR SELECT
USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR (has_role((SELECT auth.uid()), 'parent'::app_role) AND (EXISTS ( SELECT 1 FROM families f WHERE ((f.id = family_activity_logs.family_id) AND (f.created_by = (SELECT auth.uid())))))));

-- =====================================================
-- family_challenges table
-- =====================================================
DROP POLICY IF EXISTS "Family members can view challenges" ON public.family_challenges;
CREATE POLICY "Family members can view challenges"
ON public.family_challenges FOR SELECT
USING ((EXISTS ( SELECT 1 FROM family_members fm WHERE ((fm.family_id = family_challenges.family_id) AND (fm.user_id = (SELECT auth.uid()))))) OR has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Parents can manage challenges" ON public.family_challenges;
CREATE POLICY "Parents can manage challenges"
ON public.family_challenges FOR ALL
USING ((has_role((SELECT auth.uid()), 'parent'::app_role) AND (EXISTS ( SELECT 1 FROM families f WHERE ((f.id = family_challenges.family_id) AND (f.created_by = (SELECT auth.uid())))))) OR has_role((SELECT auth.uid()), 'admin'::app_role));

-- =====================================================
-- family_connections table
-- =====================================================
DROP POLICY IF EXISTS "Secure family connections management" ON public.family_connections;
CREATE POLICY "Secure family connections management"
ON public.family_connections FOR ALL
USING ((is_family_creator_secure(family_id, (SELECT auth.uid())) AND has_role((SELECT auth.uid()), 'parent'::app_role)) OR (connected_user_id = (SELECT auth.uid())) OR has_role((SELECT auth.uid()), 'admin'::app_role))
WITH CHECK ((is_family_creator_secure(family_id, (SELECT auth.uid())) AND has_role((SELECT auth.uid()), 'parent'::app_role)) OR has_role((SELECT auth.uid()), 'admin'::app_role));

-- =====================================================
-- family_content_access table
-- =====================================================
DROP POLICY IF EXISTS "Family members can view content access" ON public.family_content_access;
CREATE POLICY "Family members can view content access"
ON public.family_content_access FOR SELECT
USING (is_family_member(family_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "Parents can manage content access" ON public.family_content_access;
CREATE POLICY "Parents can manage content access"
ON public.family_content_access FOR ALL
USING (has_role((SELECT auth.uid()), 'parent'::app_role) AND is_family_creator(family_id, (SELECT auth.uid())));

-- =====================================================
-- family_invitations table
-- =====================================================
DROP POLICY IF EXISTS "Secure family invitations management" ON public.family_invitations;
CREATE POLICY "Secure family invitations management"
ON public.family_invitations FOR ALL
USING ((is_family_creator_secure(family_id, (SELECT auth.uid())) AND has_role((SELECT auth.uid()), 'parent'::app_role)) OR has_role((SELECT auth.uid()), 'admin'::app_role))
WITH CHECK ((is_family_creator_secure(family_id, (SELECT auth.uid())) AND has_role((SELECT auth.uid()), 'parent'::app_role)) OR has_role((SELECT auth.uid()), 'admin'::app_role));

-- =====================================================
-- family_leaderboards table
-- =====================================================
DROP POLICY IF EXISTS "Authenticated system can manage leaderboards" ON public.family_leaderboards;
CREATE POLICY "Authenticated system can manage leaderboards"
ON public.family_leaderboards FOR ALL
USING (((SELECT auth.role()) = 'service_role'::text) OR (((SELECT auth.uid()) IS NOT NULL) AND has_role((SELECT auth.uid()), 'admin'::app_role)));

DROP POLICY IF EXISTS "Family members can view leaderboards" ON public.family_leaderboards;
CREATE POLICY "Family members can view leaderboards"
ON public.family_leaderboards FOR SELECT
USING ((EXISTS ( SELECT 1 FROM family_members fm WHERE ((fm.family_id = family_leaderboards.family_id) AND (fm.user_id = (SELECT auth.uid()))))) OR has_role((SELECT auth.uid()), 'admin'::app_role));

-- =====================================================
-- family_members table
-- =====================================================
DROP POLICY IF EXISTS "Secure family members deletion" ON public.family_members;
CREATE POLICY "Secure family members deletion"
ON public.family_members FOR DELETE
USING ((is_family_creator_secure(family_id, (SELECT auth.uid())) AND has_role((SELECT auth.uid()), 'parent'::app_role)) OR has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Secure family members management" ON public.family_members;
CREATE POLICY "Secure family members management"
ON public.family_members FOR INSERT
WITH CHECK ((is_family_creator_secure(family_id, (SELECT auth.uid())) AND has_role((SELECT auth.uid()), 'parent'::app_role)) OR has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Secure family members updates" ON public.family_members;
CREATE POLICY "Secure family members updates"
ON public.family_members FOR UPDATE
USING ((is_family_creator_secure(family_id, (SELECT auth.uid())) AND has_role((SELECT auth.uid()), 'parent'::app_role)) OR has_role((SELECT auth.uid()), 'admin'::app_role))
WITH CHECK ((is_family_creator_secure(family_id, (SELECT auth.uid())) AND has_role((SELECT auth.uid()), 'parent'::app_role)) OR has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "family_members_strict_access" ON public.family_members;
CREATE POLICY "family_members_strict_access"
ON public.family_members FOR SELECT
USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR is_family_member(family_id, (SELECT auth.uid())));

-- =====================================================
-- gamification_effectiveness table
-- =====================================================
DROP POLICY IF EXISTS "Family members can view gamification data" ON public.gamification_effectiveness;
CREATE POLICY "Family members can view gamification data"
ON public.gamification_effectiveness FOR SELECT
USING ((EXISTS ( SELECT 1 FROM family_members fm WHERE ((fm.family_id = gamification_effectiveness.family_id) AND (fm.user_id = (SELECT auth.uid()))))) OR has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "System can manage gamification data" ON public.gamification_effectiveness;
CREATE POLICY "System can manage gamification data"
ON public.gamification_effectiveness FOR ALL
USING (((SELECT auth.role()) = 'service_role'::text) OR has_role((SELECT auth.uid()), 'admin'::app_role));

-- =====================================================
-- milestone_tracking table
-- =====================================================
DROP POLICY IF EXISTS "Family members can view milestones" ON public.milestone_tracking;
CREATE POLICY "Family members can view milestones"
ON public.milestone_tracking FOR SELECT
USING ((EXISTS ( SELECT 1 FROM family_members fm WHERE ((fm.family_id = milestone_tracking.family_id) AND (fm.user_id = (SELECT auth.uid()))))) OR has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "System can manage milestones" ON public.milestone_tracking;
CREATE POLICY "System can manage milestones"
ON public.milestone_tracking FOR ALL
USING (((SELECT auth.role()) = 'service_role'::text) OR has_role((SELECT auth.uid()), 'admin'::app_role));

-- =====================================================
-- mini_game_scores table
-- =====================================================
DROP POLICY IF EXISTS "Family members can view game scores" ON public.mini_game_scores;
CREATE POLICY "Family members can view game scores"
ON public.mini_game_scores FOR SELECT
USING ((EXISTS ( SELECT 1 FROM family_members fm WHERE ((fm.family_id = mini_game_scores.family_id) AND (fm.user_id = (SELECT auth.uid()))))) OR has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can create game scores" ON public.mini_game_scores;
CREATE POLICY "Users can create game scores"
ON public.mini_game_scores FOR INSERT
WITH CHECK ((user_id = (SELECT auth.uid())) AND (EXISTS ( SELECT 1 FROM family_members fm WHERE ((fm.family_id = mini_game_scores.family_id) AND (fm.user_id = (SELECT auth.uid()))))));

-- =====================================================
-- motivation_journal_entries table
-- =====================================================
DROP POLICY IF EXISTS "Family members can view journal entries" ON public.motivation_journal_entries;
CREATE POLICY "Family members can view journal entries"
ON public.motivation_journal_entries FOR SELECT
USING ((EXISTS ( SELECT 1 FROM family_members fm WHERE ((fm.family_id = motivation_journal_entries.family_id) AND (fm.user_id = (SELECT auth.uid()))))) OR has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can manage their journal entries" ON public.motivation_journal_entries;
CREATE POLICY "Users can manage their journal entries"
ON public.motivation_journal_entries FOR ALL
USING ((user_id = (SELECT auth.uid())) AND (EXISTS ( SELECT 1 FROM family_members fm WHERE ((fm.family_id = motivation_journal_entries.family_id) AND (fm.user_id = (SELECT auth.uid()))))));

-- =====================================================
-- peer_recognitions table
-- =====================================================
DROP POLICY IF EXISTS "Family members can view recognitions" ON public.peer_recognitions;
CREATE POLICY "Family members can view recognitions"
ON public.peer_recognitions FOR SELECT
USING ((EXISTS ( SELECT 1 FROM family_members fm WHERE ((fm.family_id = peer_recognitions.family_id) AND (fm.user_id = (SELECT auth.uid()))))) OR has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can give recognitions" ON public.peer_recognitions;
CREATE POLICY "Users can give recognitions"
ON public.peer_recognitions FOR INSERT
WITH CHECK ((from_user_id = (SELECT auth.uid())) AND (EXISTS ( SELECT 1 FROM family_members fm WHERE ((fm.family_id = peer_recognitions.family_id) AND (fm.user_id = (SELECT auth.uid()))))));

-- =====================================================
-- performance_metrics table
-- =====================================================
DROP POLICY IF EXISTS "Admins can view performance metrics" ON public.performance_metrics;
CREATE POLICY "Admins can view performance metrics"
ON public.performance_metrics FOR SELECT
USING (has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated system can insert performance metrics" ON public.performance_metrics;
CREATE POLICY "Authenticated system can insert performance metrics"
ON public.performance_metrics FOR INSERT
WITH CHECK (((SELECT auth.role()) = 'service_role'::text) OR ((SELECT auth.uid()) IS NOT NULL));

-- =====================================================
-- popular_content_cache table
-- =====================================================
DROP POLICY IF EXISTS "Only admins can manage popular content cache" ON public.popular_content_cache;
CREATE POLICY "Only admins can manage popular content cache"
ON public.popular_content_cache FOR ALL
USING (has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Only admins can view popular content cache" ON public.popular_content_cache;
CREATE POLICY "Only admins can view popular content cache"
ON public.popular_content_cache FOR SELECT
USING (has_role((SELECT auth.uid()), 'admin'::app_role));

-- =====================================================
-- profiles table
-- =====================================================
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Family members can view each others profiles" ON public.profiles;
CREATE POLICY "Family members can view each others profiles"
ON public.profiles FOR SELECT
USING (EXISTS ( SELECT 1 FROM family_members fm1 WHERE ((fm1.user_id = (SELECT auth.uid())) AND (EXISTS ( SELECT 1 FROM family_members fm2 WHERE ((fm2.family_id = fm1.family_id) AND (fm2.user_id = profiles.user_id)))))));

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING ((SELECT auth.uid()) = user_id);

-- =====================================================
-- progress_snapshots table
-- =====================================================
DROP POLICY IF EXISTS "Family members can view progress snapshots" ON public.progress_snapshots;
CREATE POLICY "Family members can view progress snapshots"
ON public.progress_snapshots FOR SELECT
USING ((EXISTS ( SELECT 1 FROM family_members fm WHERE ((fm.family_id = progress_snapshots.family_id) AND (fm.user_id = (SELECT auth.uid()))))) OR has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "System can manage progress snapshots" ON public.progress_snapshots;
CREATE POLICY "System can manage progress snapshots"
ON public.progress_snapshots FOR ALL
USING (((SELECT auth.role()) = 'service_role'::text) OR has_role((SELECT auth.uid()), 'admin'::app_role));

-- =====================================================
-- reward_redemptions table
-- =====================================================
DROP POLICY IF EXISTS "Family members can view redemptions" ON public.reward_redemptions;
CREATE POLICY "Family members can view redemptions"
ON public.reward_redemptions FOR SELECT
USING ((EXISTS ( SELECT 1 FROM family_members fm WHERE ((fm.family_id = reward_redemptions.family_id) AND (fm.user_id = (SELECT auth.uid()))))) OR has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can create redemptions" ON public.reward_redemptions;
CREATE POLICY "Users can create redemptions"
ON public.reward_redemptions FOR INSERT
WITH CHECK ((user_id = (SELECT auth.uid())) AND (EXISTS ( SELECT 1 FROM family_members fm WHERE ((fm.family_id = reward_redemptions.family_id) AND (fm.user_id = (SELECT auth.uid()))))));

DROP POLICY IF EXISTS "Parents can manage redemptions" ON public.reward_redemptions;
CREATE POLICY "Parents can manage redemptions"
ON public.reward_redemptions FOR UPDATE
USING ((has_role((SELECT auth.uid()), 'parent'::app_role) AND (EXISTS ( SELECT 1 FROM families f WHERE ((f.id = reward_redemptions.family_id) AND (f.created_by = (SELECT auth.uid())))))) OR has_role((SELECT auth.uid()), 'admin'::app_role));

-- =====================================================
-- security_audit_logs table
-- =====================================================
DROP POLICY IF EXISTS "Admins can view security audit logs" ON public.security_audit_logs;
CREATE POLICY "Admins can view security audit logs"
ON public.security_audit_logs FOR SELECT
USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'read_only'::app_role));

DROP POLICY IF EXISTS "Admins can update security audit logs" ON public.security_audit_logs;
CREATE POLICY "Admins can update security audit logs"
ON public.security_audit_logs FOR UPDATE
USING (has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "System can insert security audit logs" ON public.security_audit_logs;
CREATE POLICY "System can insert security audit logs"
ON public.security_audit_logs FOR INSERT
WITH CHECK (((SELECT auth.role()) = 'service_role'::text) OR ((SELECT auth.uid()) IS NOT NULL));

-- =====================================================
-- site_settings table
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage site settings" ON public.site_settings;
CREATE POLICY "Admins can manage site settings"
ON public.site_settings FOR ALL
USING (has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can view site settings" ON public.site_settings;
CREATE POLICY "Authenticated users can view site settings"
ON public.site_settings FOR SELECT
USING ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- system_alerts table
-- =====================================================
DROP POLICY IF EXISTS "Admins can update system alerts" ON public.system_alerts;
CREATE POLICY "Admins can update system alerts"
ON public.system_alerts FOR UPDATE
USING (has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view system alerts" ON public.system_alerts;
CREATE POLICY "Admins can view system alerts"
ON public.system_alerts FOR SELECT
USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'read_only'::app_role));

DROP POLICY IF EXISTS "Authenticated system can insert alerts" ON public.system_alerts;
CREATE POLICY "Authenticated system can insert alerts"
ON public.system_alerts FOR INSERT
WITH CHECK (((SELECT auth.role()) = 'service_role'::text) OR ((SELECT auth.uid()) IS NOT NULL));

-- =====================================================
-- system_errors table
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage errors" ON public.system_errors;
CREATE POLICY "Admins can manage errors"
ON public.system_errors FOR ALL
USING (has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all errors" ON public.system_errors;
CREATE POLICY "Admins can view all errors"
ON public.system_errors FOR SELECT
USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'read_only'::app_role));

DROP POLICY IF EXISTS "Authenticated users can insert errors" ON public.system_errors;
CREATE POLICY "Authenticated users can insert errors"
ON public.system_errors FOR INSERT
WITH CHECK (((SELECT auth.role()) = 'service_role'::text) OR ((SELECT auth.uid()) IS NOT NULL));

DROP POLICY IF EXISTS "Users can view their own errors" ON public.system_errors;
CREATE POLICY "Users can view their own errors"
ON public.system_errors FOR SELECT
USING (user_id = (SELECT auth.uid()));

-- =====================================================
-- system_health_metrics table
-- =====================================================
DROP POLICY IF EXISTS "Admins can view system health metrics" ON public.system_health_metrics;
CREATE POLICY "Admins can view system health metrics"
ON public.system_health_metrics FOR SELECT
USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'read_only'::app_role));

DROP POLICY IF EXISTS "Authenticated system can manage health metrics" ON public.system_health_metrics;
CREATE POLICY "Authenticated system can manage health metrics"
ON public.system_health_metrics FOR ALL
USING (((SELECT auth.role()) = 'service_role'::text) OR (((SELECT auth.uid()) IS NOT NULL) AND has_role((SELECT auth.uid()), 'admin'::app_role)));

-- =====================================================
-- task_performance_metrics table
-- =====================================================
DROP POLICY IF EXISTS "Family members can view performance metrics" ON public.task_performance_metrics;
CREATE POLICY "Family members can view performance metrics"
ON public.task_performance_metrics FOR SELECT
USING ((EXISTS ( SELECT 1 FROM family_members fm WHERE ((fm.family_id = task_performance_metrics.family_id) AND (fm.user_id = (SELECT auth.uid()))))) OR has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can insert their performance metrics" ON public.task_performance_metrics;
CREATE POLICY "Users can insert their performance metrics"
ON public.task_performance_metrics FOR INSERT
WITH CHECK ((user_id = (SELECT auth.uid())) AND (EXISTS ( SELECT 1 FROM family_members fm WHERE ((fm.family_id = task_performance_metrics.family_id) AND (fm.user_id = (SELECT auth.uid()))))));

-- =====================================================
-- user_achievements table
-- =====================================================
DROP POLICY IF EXISTS "Authenticated system can manage user achievements" ON public.user_achievements;
CREATE POLICY "Authenticated system can manage user achievements"
ON public.user_achievements FOR ALL
USING (((SELECT auth.role()) = 'service_role'::text) OR (((SELECT auth.uid()) IS NOT NULL) AND has_role((SELECT auth.uid()), 'admin'::app_role)));

DROP POLICY IF EXISTS "Family members can view achievements" ON public.user_achievements;
CREATE POLICY "Family members can view achievements"
ON public.user_achievements FOR SELECT
USING ((EXISTS ( SELECT 1 FROM family_members fm WHERE ((fm.family_id = user_achievements.family_id) AND (fm.user_id = (SELECT auth.uid()))))) OR has_role((SELECT auth.uid()), 'admin'::app_role));

-- =====================================================
-- user_activity_logs table
-- =====================================================
DROP POLICY IF EXISTS "Admins can view all user activity logs" ON public.user_activity_logs;
CREATE POLICY "Admins can view all user activity logs"
ON public.user_activity_logs FOR SELECT
USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'read_only'::app_role));

DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON public.user_activity_logs;
CREATE POLICY "Authenticated users can insert activity logs"
ON public.user_activity_logs FOR INSERT
WITH CHECK (((SELECT auth.role()) = 'service_role'::text) OR (user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.user_activity_logs;
CREATE POLICY "Users can view their own activity logs"
ON public.user_activity_logs FOR SELECT
USING (user_id = (SELECT auth.uid()));

-- =====================================================
-- user_levels table
-- =====================================================
DROP POLICY IF EXISTS "Authenticated system can manage user levels" ON public.user_levels;
CREATE POLICY "Authenticated system can manage user levels"
ON public.user_levels FOR ALL
USING (((SELECT auth.role()) = 'service_role'::text) OR (((SELECT auth.uid()) IS NOT NULL) AND has_role((SELECT auth.uid()), 'admin'::app_role)));

DROP POLICY IF EXISTS "Family members can view levels" ON public.user_levels;
CREATE POLICY "Family members can view levels"
ON public.user_levels FOR SELECT
USING ((EXISTS ( SELECT 1 FROM family_members fm WHERE ((fm.family_id = user_levels.family_id) AND (fm.user_id = (SELECT auth.uid()))))) OR has_role((SELECT auth.uid()), 'admin'::app_role));

-- =====================================================
-- user_points table
-- =====================================================
DROP POLICY IF EXISTS "Authenticated system can manage user points" ON public.user_points;
CREATE POLICY "Authenticated system can manage user points"
ON public.user_points FOR ALL
USING (((SELECT auth.role()) = 'service_role'::text) OR (((SELECT auth.uid()) IS NOT NULL) AND has_role((SELECT auth.uid()), 'admin'::app_role)));

DROP POLICY IF EXISTS "Family members can view points" ON public.user_points;
CREATE POLICY "Family members can view points"
ON public.user_points FOR SELECT
USING ((EXISTS ( SELECT 1 FROM family_members fm WHERE ((fm.family_id = user_points.family_id) AND (fm.user_id = (SELECT auth.uid()))))) OR has_role((SELECT auth.uid()), 'admin'::app_role));

-- =====================================================
-- user_roles table
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (user_id = (SELECT auth.uid()));

-- =====================================================
-- user_sessions table
-- =====================================================
DROP POLICY IF EXISTS "Admins view all sessions" ON public.user_sessions;
CREATE POLICY "Admins view all sessions"
ON public.user_sessions FOR SELECT
USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'read_only'::app_role));

DROP POLICY IF EXISTS "Authenticated system can manage sessions" ON public.user_sessions;
CREATE POLICY "Authenticated system can manage sessions"
ON public.user_sessions FOR ALL
USING (((SELECT auth.role()) = 'service_role'::text) OR (((SELECT auth.uid()) IS NOT NULL) AND has_role((SELECT auth.uid()), 'admin'::app_role)));

DROP POLICY IF EXISTS "Parents can view their children's sessions" ON public.user_sessions;
CREATE POLICY "Parents can view their children's sessions"
ON public.user_sessions FOR SELECT
USING (has_role((SELECT auth.uid()), 'parent'::app_role) AND (EXISTS ( SELECT 1 FROM (families f JOIN family_members fm ON ((f.id = fm.family_id))) WHERE ((f.created_by = (SELECT auth.uid())) AND (fm.user_id = user_sessions.user_id)))));

DROP POLICY IF EXISTS "System manage sessions" ON public.user_sessions;
CREATE POLICY "System manage sessions"
ON public.user_sessions FOR ALL
USING (((SELECT auth.role()) = 'service_role'::text) OR has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.user_sessions;
CREATE POLICY "Users can manage their own sessions"
ON public.user_sessions FOR ALL
USING (user_id = (SELECT auth.uid()));

-- =====================================================
-- wishlist_items table
-- =====================================================
DROP POLICY IF EXISTS "Family members can view wishlist" ON public.wishlist_items;
CREATE POLICY "Family members can view wishlist"
ON public.wishlist_items FOR SELECT
USING ((EXISTS ( SELECT 1 FROM family_members fm WHERE ((fm.family_id = wishlist_items.family_id) AND (fm.user_id = (SELECT auth.uid()))))) OR has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Parents can approve wishlist items" ON public.wishlist_items;
CREATE POLICY "Parents can approve wishlist items"
ON public.wishlist_items FOR UPDATE
USING ((has_role((SELECT auth.uid()), 'parent'::app_role) AND (EXISTS ( SELECT 1 FROM families f WHERE ((f.id = wishlist_items.family_id) AND (f.created_by = (SELECT auth.uid())))))) OR has_role((SELECT auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can manage their wishlist" ON public.wishlist_items;
CREATE POLICY "Users can manage their wishlist"
ON public.wishlist_items FOR ALL
USING ((user_id = (SELECT auth.uid())) AND (EXISTS ( SELECT 1 FROM family_members fm WHERE ((fm.family_id = wishlist_items.family_id) AND (fm.user_id = (SELECT auth.uid()))))));