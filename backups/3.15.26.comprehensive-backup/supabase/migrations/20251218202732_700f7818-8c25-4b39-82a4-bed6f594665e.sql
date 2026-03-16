-- Phase 4: Fix remaining auth_rls_initplan and multiple_permissive_policies issues
-- This migration consolidates all duplicate policies and fixes auth.uid()/auth.role() performance

-- ==========================================
-- 1. security_alerts - Fix auth.uid() performance and consolidate
-- ==========================================
DROP POLICY IF EXISTS "Admins can view all security alerts" ON public.security_alerts;
DROP POLICY IF EXISTS "System can create security alerts" ON public.security_alerts;

CREATE POLICY "security_alerts_select" ON public.security_alerts
FOR SELECT TO public
USING (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "security_alerts_insert" ON public.security_alerts
FOR INSERT TO public
WITH CHECK (
  (SELECT auth.role()) = 'service_role'
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
);

-- ==========================================
-- 2. security_monitoring_config - Fix auth.uid() performance
-- ==========================================
DROP POLICY IF EXISTS "Admins can manage monitoring config" ON public.security_monitoring_config;

CREATE POLICY "security_monitoring_config_admin" ON public.security_monitoring_config
FOR ALL TO public
USING (has_role((SELECT auth.uid()), 'admin'::app_role));

-- ==========================================
-- 3. security_test_results - Fix auth.uid() performance
-- ==========================================
DROP POLICY IF EXISTS "Admins can view test results" ON public.security_test_results;
DROP POLICY IF EXISTS "System can insert test results" ON public.security_test_results;

CREATE POLICY "security_test_results_select" ON public.security_test_results
FOR SELECT TO public
USING (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "security_test_results_insert" ON public.security_test_results
FOR INSERT TO public
WITH CHECK (
  (SELECT auth.role()) = 'service_role'
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
);

-- ==========================================
-- 4. user_activity_logs - Fix and consolidate all policies
-- ==========================================
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON public.user_activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert_authenticated" ON public.user_activity_logs;
DROP POLICY IF EXISTS "Admins can view all user activity logs" ON public.user_activity_logs;
DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.user_activity_logs;
DROP POLICY IF EXISTS "activity_logs_strict_user_admin_access" ON public.user_activity_logs;

CREATE POLICY "user_activity_logs_insert" ON public.user_activity_logs
FOR INSERT TO public
WITH CHECK (
  (SELECT auth.role()) = 'service_role'
  OR (SELECT auth.uid()) = user_id
);

CREATE POLICY "user_activity_logs_select" ON public.user_activity_logs
FOR SELECT TO public
USING (
  (SELECT auth.uid()) = user_id
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
  OR has_role((SELECT auth.uid()), 'read_only'::app_role)
);

-- ==========================================
-- 5. system_errors - Fix and consolidate all policies
-- ==========================================
DROP POLICY IF EXISTS "Admins can manage errors" ON public.system_errors;
DROP POLICY IF EXISTS "Authenticated users can insert errors" ON public.system_errors;
DROP POLICY IF EXISTS "system_errors_service_insert" ON public.system_errors;
DROP POLICY IF EXISTS "Admins can view all errors" ON public.system_errors;
DROP POLICY IF EXISTS "Users can view their own errors" ON public.system_errors;
DROP POLICY IF EXISTS "system_errors_admin_select" ON public.system_errors;
DROP POLICY IF EXISTS "system_errors_admin_manage" ON public.system_errors;

CREATE POLICY "system_errors_insert" ON public.system_errors
FOR INSERT TO public
WITH CHECK (
  (SELECT auth.role()) = 'service_role'
  OR (SELECT auth.uid()) IS NOT NULL
);

CREATE POLICY "system_errors_select" ON public.system_errors
FOR SELECT TO public
USING (
  user_id = (SELECT auth.uid())
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
  OR has_role((SELECT auth.uid()), 'read_only'::app_role)
);

CREATE POLICY "system_errors_update" ON public.system_errors
FOR UPDATE TO public
USING (has_role((SELECT auth.uid()), 'admin'::app_role))
WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "system_errors_delete" ON public.system_errors
FOR DELETE TO public
USING (has_role((SELECT auth.uid()), 'admin'::app_role));

-- ==========================================
-- 6. user_sessions - Fix auth.uid() and consolidate SELECT policies
-- ==========================================
DROP POLICY IF EXISTS "user_sessions_manage" ON public.user_sessions;
DROP POLICY IF EXISTS "Admins view all sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Parents can view their children's sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users view own sessions" ON public.user_sessions;

CREATE POLICY "user_sessions_all" ON public.user_sessions
FOR ALL TO public
USING (
  (SELECT auth.role()) = 'service_role'
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
  OR user_id = (SELECT auth.uid())
);

CREATE POLICY "user_sessions_select" ON public.user_sessions
FOR SELECT TO public
USING (
  user_id = (SELECT auth.uid())
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
  OR has_role((SELECT auth.uid()), 'read_only'::app_role)
  OR (
    has_role((SELECT auth.uid()), 'parent'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.families f
      JOIN public.family_members fm ON f.id = fm.family_id
      WHERE f.created_by = (SELECT auth.uid())
      AND fm.user_id = user_sessions.user_id
    )
  )
);

-- ==========================================
-- 7. achievements - Consolidate policies
-- ==========================================
DROP POLICY IF EXISTS "Admins can manage achievements" ON public.achievements;
DROP POLICY IF EXISTS "Authenticated users can view active achievements" ON public.achievements;

CREATE POLICY "achievements_access" ON public.achievements
FOR ALL TO public
USING (
  has_role((SELECT auth.uid()), 'admin'::app_role)
  OR (is_active = true AND (SELECT auth.uid()) IS NOT NULL)
)
WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));

-- ==========================================
-- 8. admin_audit_logs - Consolidate policies
-- ==========================================
DROP POLICY IF EXISTS "Admins can manage audit logs" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "Admin audit logs admin only" ON public.admin_audit_logs;

CREATE POLICY "admin_audit_logs_access" ON public.admin_audit_logs
FOR ALL TO public
USING (
  has_role((SELECT auth.uid()), 'admin'::app_role)
  OR has_role((SELECT auth.uid()), 'read_only'::app_role)
);

-- ==========================================
-- 9. analytics_insights - Consolidate policies
-- ==========================================
DROP POLICY IF EXISTS "System can manage insights" ON public.analytics_insights;
DROP POLICY IF EXISTS "Family members can view insights" ON public.analytics_insights;

CREATE POLICY "analytics_insights_access" ON public.analytics_insights
FOR ALL TO public
USING (
  (SELECT auth.role()) = 'service_role'
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = analytics_insights.family_id
    AND fm.user_id = (SELECT auth.uid())
  )
);

-- ==========================================
-- 10. analytics_metrics - Consolidate policies
-- ==========================================
DROP POLICY IF EXISTS "Admins can view all analytics metrics" ON public.analytics_metrics;
DROP POLICY IF EXISTS "Only admins can view analytics metrics" ON public.analytics_metrics;
-- Keep insert policy

CREATE POLICY "analytics_metrics_select" ON public.analytics_metrics
FOR SELECT TO public
USING (
  has_role((SELECT auth.uid()), 'admin'::app_role)
  OR has_role((SELECT auth.uid()), 'read_only'::app_role)
);

-- ==========================================
-- 11. chore_assignments - Consolidate policies
-- ==========================================
DROP POLICY IF EXISTS "Parents can manage assignments" ON public.chore_assignments;
DROP POLICY IF EXISTS "Family members can view assignments" ON public.chore_assignments;
DROP POLICY IF EXISTS "Children can update their assignments" ON public.chore_assignments;

CREATE POLICY "chore_assignments_access" ON public.chore_assignments
FOR ALL TO public
USING (
  has_role((SELECT auth.uid()), 'admin'::app_role)
  OR (
    has_role((SELECT auth.uid()), 'parent'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.families f
      WHERE f.id = chore_assignments.family_id
      AND f.created_by = (SELECT auth.uid())
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = chore_assignments.family_id
    AND fm.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  has_role((SELECT auth.uid()), 'admin'::app_role)
  OR (
    has_role((SELECT auth.uid()), 'parent'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.families f
      WHERE f.id = chore_assignments.family_id
      AND f.created_by = (SELECT auth.uid())
    )
  )
  OR assigned_to = (SELECT auth.uid())
);

-- ==========================================
-- 12. chore_categories - Consolidate policies
-- ==========================================
DROP POLICY IF EXISTS "Admins can manage chore categories" ON public.chore_categories;
DROP POLICY IF EXISTS "Authenticated users can view active chore categories" ON public.chore_categories;

CREATE POLICY "chore_categories_access" ON public.chore_categories
FOR ALL TO public
USING (
  has_role((SELECT auth.uid()), 'admin'::app_role)
  OR (is_active = true AND (SELECT auth.uid()) IS NOT NULL)
)
WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));

-- ==========================================
-- 13. chore_templates - Consolidate policies
-- ==========================================
DROP POLICY IF EXISTS "Admins can manage chore templates" ON public.chore_templates;
DROP POLICY IF EXISTS "Authenticated users can view active chore templates" ON public.chore_templates;

CREATE POLICY "chore_templates_access" ON public.chore_templates
FOR ALL TO public
USING (
  has_role((SELECT auth.uid()), 'admin'::app_role)
  OR (is_active = true AND (SELECT auth.uid()) IS NOT NULL)
)
WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));

-- ==========================================
-- 14. chores - Consolidate policies
-- ==========================================
DROP POLICY IF EXISTS "Parents can manage family chores" ON public.chores;
DROP POLICY IF EXISTS "Family members can view family chores" ON public.chores;

CREATE POLICY "chores_access" ON public.chores
FOR ALL TO public
USING (
  has_role((SELECT auth.uid()), 'admin'::app_role)
  OR (
    has_role((SELECT auth.uid()), 'parent'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.families f
      WHERE f.id = chores.family_id
      AND f.created_by = (SELECT auth.uid())
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = chores.family_id
    AND fm.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  has_role((SELECT auth.uid()), 'admin'::app_role)
  OR (
    has_role((SELECT auth.uid()), 'parent'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.families f
      WHERE f.id = chores.family_id
      AND f.created_by = (SELECT auth.uid())
    )
  )
);

-- ==========================================
-- 15. comparative_benchmarks - Consolidate policies
-- ==========================================
DROP POLICY IF EXISTS "Admin users can manage benchmarks" ON public.comparative_benchmarks;
DROP POLICY IF EXISTS "Admin users can view benchmarks" ON public.comparative_benchmarks;

CREATE POLICY "comparative_benchmarks_access" ON public.comparative_benchmarks
FOR ALL TO public
USING (
  has_role((SELECT auth.uid()), 'admin'::app_role)
  OR has_role((SELECT auth.uid()), 'read_only'::app_role)
)
WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));

-- ==========================================
-- 16. content_categories - Consolidate policies
-- ==========================================
DROP POLICY IF EXISTS "Admins can manage categories" ON public.content_categories;
DROP POLICY IF EXISTS "Everyone can view active categories" ON public.content_categories;

CREATE POLICY "content_categories_access" ON public.content_categories
FOR ALL TO public
USING (
  has_role((SELECT auth.uid()), 'admin'::app_role)
  OR is_active = true
)
WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));

-- ==========================================
-- 17. content_favorites - Consolidate policies
-- ==========================================
DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.content_favorites;
DROP POLICY IF EXISTS "Admins can view all favorites" ON public.content_favorites;

CREATE POLICY "content_favorites_access" ON public.content_favorites
FOR ALL TO public
USING (
  (SELECT auth.uid()) = user_id
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
)
WITH CHECK ((SELECT auth.uid()) = user_id);

-- ==========================================
-- 18. content_interactions - Consolidate policies
-- ==========================================
DROP POLICY IF EXISTS "Users can log their own interactions" ON public.content_interactions;
DROP POLICY IF EXISTS "Admins can view all interactions" ON public.content_interactions;
DROP POLICY IF EXISTS "Parents can view their family interactions" ON public.content_interactions;
DROP POLICY IF EXISTS "Users can view their own interactions" ON public.content_interactions;

CREATE POLICY "content_interactions_insert" ON public.content_interactions
FOR INSERT TO public
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "content_interactions_select" ON public.content_interactions
FOR SELECT TO public
USING (
  (SELECT auth.uid()) = user_id
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
  OR (
    has_role((SELECT auth.uid()), 'parent'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.families f
      WHERE f.id = content_interactions.family_id
      AND f.created_by = (SELECT auth.uid())
    )
  )
);

-- ==========================================
-- 19. content_items - Consolidate policies (keep anon policy separate)
-- ==========================================
DROP POLICY IF EXISTS "Admins can manage all content" ON public.content_items;
DROP POLICY IF EXISTS "Authenticated users can view approved content" ON public.content_items;
-- Keep "Anonymous users can view basic catalog info only"

CREATE POLICY "content_items_admin" ON public.content_items
FOR ALL TO public
USING (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "content_items_authenticated_view" ON public.content_items
FOR SELECT TO authenticated
USING (
  is_active = true
  AND approval_status = 'approved'
  AND (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR NOT EXISTS (
      SELECT 1 FROM public.family_content_access
      WHERE content_item_id = content_items.id
    )
    OR EXISTS (
      SELECT 1 FROM public.family_content_access fca
      JOIN public.family_members fm ON fm.family_id = fca.family_id
      WHERE fca.content_item_id = content_items.id
      AND fm.user_id = (SELECT auth.uid())
      AND fca.access_type = ANY(ARRAY['allowed', 'featured'])
    )
  )
);

-- ==========================================
-- 20. daily_analytics_data - Consolidate policies
-- ==========================================
DROP POLICY IF EXISTS "System can manage daily analytics" ON public.daily_analytics_data;
DROP POLICY IF EXISTS "Admins can view daily analytics" ON public.daily_analytics_data;

CREATE POLICY "daily_analytics_data_access" ON public.daily_analytics_data
FOR ALL TO public
USING (
  (SELECT auth.role()) = 'service_role'
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
);

-- ==========================================
-- 21. daily_streaks - Consolidate policies
-- ==========================================
DROP POLICY IF EXISTS "Authenticated system can manage streaks" ON public.daily_streaks;
DROP POLICY IF EXISTS "Family members can view streaks" ON public.daily_streaks;

CREATE POLICY "daily_streaks_access" ON public.daily_streaks
FOR ALL TO public
USING (
  (SELECT auth.role()) = 'service_role'
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = daily_streaks.family_id
    AND fm.user_id = (SELECT auth.uid())
  )
);

-- ==========================================
-- 22. engagement_metrics - Consolidate policies
-- ==========================================
DROP POLICY IF EXISTS "Admins can view engagement metrics" ON public.engagement_metrics;
DROP POLICY IF EXISTS "engagement_metrics_strict_access" ON public.engagement_metrics;
-- Keep insert policy

CREATE POLICY "engagement_metrics_select" ON public.engagement_metrics
FOR SELECT TO public
USING (
  (SELECT auth.uid()) = user_id
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
  OR (
    has_role((SELECT auth.uid()), 'parent'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.families f
      JOIN public.family_members fm ON f.id = fm.family_id
      WHERE f.created_by = (SELECT auth.uid())
      AND fm.user_id = engagement_metrics.user_id
      AND fm.family_id = engagement_metrics.family_id
    )
  )
);

-- ==========================================
-- 23. site_settings - Consolidate policies
-- ==========================================
DROP POLICY IF EXISTS "site_settings_admin" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_authenticated_read" ON public.site_settings;
-- Keep "Allow anonymous read for public site settings"

CREATE POLICY "site_settings_access" ON public.site_settings
FOR ALL TO public
USING (
  has_role((SELECT auth.uid()), 'admin'::app_role)
  OR (SELECT auth.uid()) IS NOT NULL
)
WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));

-- ==========================================
-- 24. user_roles - Consolidate policies
-- ==========================================
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON public.user_roles;
-- Keep "Allow bootstrap admin creation and admin role management" for bootstrap

CREATE POLICY "user_roles_admin_manage" ON public.user_roles
FOR ALL TO public
USING (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "user_roles_user_select" ON public.user_roles
FOR SELECT TO public
USING (
  user_id = (SELECT auth.uid())
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
);

-- ==========================================
-- 25. wishlist_items - Consolidate policies
-- ==========================================
DROP POLICY IF EXISTS "Users can manage their wishlist" ON public.wishlist_items;
DROP POLICY IF EXISTS "Family members can view wishlist" ON public.wishlist_items;
DROP POLICY IF EXISTS "Parents can approve wishlist items" ON public.wishlist_items;

CREATE POLICY "wishlist_items_access" ON public.wishlist_items
FOR ALL TO public
USING (
  has_role((SELECT auth.uid()), 'admin'::app_role)
  OR (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_id = wishlist_items.family_id
      AND fm.user_id = (SELECT auth.uid())
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = wishlist_items.family_id
    AND fm.user_id = (SELECT auth.uid())
  )
  OR (
    has_role((SELECT auth.uid()), 'parent'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.families f
      WHERE f.id = wishlist_items.family_id
      AND f.created_by = (SELECT auth.uid())
    )
  )
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
  OR (
    has_role((SELECT auth.uid()), 'parent'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.families f
      WHERE f.id = wishlist_items.family_id
      AND f.created_by = (SELECT auth.uid())
    )
  )
);