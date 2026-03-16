-- Phase 3: Consolidate multiple permissive policies for improved performance
-- This migration drops duplicate policies and consolidates them into single policies per table/action

-- ==========================================
-- 1. error_patterns - Consolidate SELECT policies
-- ==========================================
DROP POLICY IF EXISTS "Admins can view error patterns" ON public.error_patterns;
-- Keep "Authenticated system can manage error patterns" as ALL covers SELECT
-- But update it to include read_only for SELECT access
DROP POLICY IF EXISTS "Authenticated system can manage error patterns" ON public.error_patterns;

CREATE POLICY "error_patterns_access" ON public.error_patterns
FOR ALL TO public
USING (
  (SELECT auth.role()) = 'service_role'
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
  OR has_role((SELECT auth.uid()), 'read_only'::app_role)
);

-- ==========================================
-- 2. family_activity_logs - Consolidate SELECT policies
-- ==========================================
DROP POLICY IF EXISTS "Admins can view all family activity logs" ON public.family_activity_logs;
DROP POLICY IF EXISTS "Parents and admins can view family activity logs" ON public.family_activity_logs;

CREATE POLICY "family_activity_logs_select" ON public.family_activity_logs
FOR SELECT TO public
USING (
  has_role((SELECT auth.uid()), 'admin'::app_role)
  OR (
    has_role((SELECT auth.uid()), 'parent'::app_role) 
    AND EXISTS (
      SELECT 1 FROM public.families f 
      WHERE f.id = family_activity_logs.family_id 
      AND f.created_by = (SELECT auth.uid())
    )
  )
);

-- ==========================================
-- 3. family_challenges - SELECT covered by ALL, remove duplicate SELECT
-- ==========================================
DROP POLICY IF EXISTS "Family members can view challenges" ON public.family_challenges;
DROP POLICY IF EXISTS "Parents can manage challenges" ON public.family_challenges;

CREATE POLICY "family_challenges_access" ON public.family_challenges
FOR ALL TO public
USING (
  has_role((SELECT auth.uid()), 'admin'::app_role)
  OR (
    has_role((SELECT auth.uid()), 'parent'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.families f 
      WHERE f.id = family_challenges.family_id 
      AND f.created_by = (SELECT auth.uid())
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.family_members fm 
    WHERE fm.family_id = family_challenges.family_id 
    AND fm.user_id = (SELECT auth.uid())
  )
);

-- ==========================================
-- 4. family_content_access - Consolidate SELECT with ALL
-- ==========================================
DROP POLICY IF EXISTS "Family members can view content access" ON public.family_content_access;
DROP POLICY IF EXISTS "Parents can manage content access" ON public.family_content_access;

CREATE POLICY "family_content_access_policy" ON public.family_content_access
FOR ALL TO public
USING (
  is_family_member(family_id, (SELECT auth.uid()))
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
)
WITH CHECK (
  (has_role((SELECT auth.uid()), 'parent'::app_role) AND is_family_creator(family_id, (SELECT auth.uid())))
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
);

-- ==========================================
-- 5. family_leaderboards - Consolidate SELECT with ALL
-- ==========================================
DROP POLICY IF EXISTS "Family members can view leaderboards" ON public.family_leaderboards;
DROP POLICY IF EXISTS "Authenticated system can manage leaderboards" ON public.family_leaderboards;

CREATE POLICY "family_leaderboards_access" ON public.family_leaderboards
FOR ALL TO public
USING (
  (SELECT auth.role()) = 'service_role'
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.family_members fm 
    WHERE fm.family_id = family_leaderboards.family_id 
    AND fm.user_id = (SELECT auth.uid())
  )
);

-- ==========================================
-- 6. gamification_effectiveness - Consolidate
-- ==========================================
DROP POLICY IF EXISTS "Family members can view gamification data" ON public.gamification_effectiveness;
DROP POLICY IF EXISTS "System can manage gamification data" ON public.gamification_effectiveness;

CREATE POLICY "gamification_effectiveness_access" ON public.gamification_effectiveness
FOR ALL TO public
USING (
  (SELECT auth.role()) = 'service_role'
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.family_members fm 
    WHERE fm.family_id = gamification_effectiveness.family_id 
    AND fm.user_id = (SELECT auth.uid())
  )
);

-- ==========================================
-- 7. milestone_tracking - Consolidate
-- ==========================================
DROP POLICY IF EXISTS "Family members can view milestones" ON public.milestone_tracking;
DROP POLICY IF EXISTS "System can manage milestones" ON public.milestone_tracking;

CREATE POLICY "milestone_tracking_access" ON public.milestone_tracking
FOR ALL TO public
USING (
  (SELECT auth.role()) = 'service_role'
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.family_members fm 
    WHERE fm.family_id = milestone_tracking.family_id 
    AND fm.user_id = (SELECT auth.uid())
  )
);

-- ==========================================
-- 8. motivation_journal_entries - Remove duplicate ALL policies
-- ==========================================
DROP POLICY IF EXISTS "Users can manage their journal" ON public.motivation_journal_entries;
DROP POLICY IF EXISTS "Users can manage their journal entries" ON public.motivation_journal_entries;
DROP POLICY IF EXISTS "Family members can view journal entries" ON public.motivation_journal_entries;

CREATE POLICY "motivation_journal_access" ON public.motivation_journal_entries
FOR ALL TO public
USING (
  has_role((SELECT auth.uid()), 'admin'::app_role)
  OR (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.family_members fm 
      WHERE fm.family_id = motivation_journal_entries.family_id 
      AND fm.user_id = (SELECT auth.uid())
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.family_members fm 
    WHERE fm.family_id = motivation_journal_entries.family_id 
    AND fm.user_id = (SELECT auth.uid())
  )
);

-- ==========================================
-- 9. popular_content_cache - Remove redundant SELECT (ALL covers it)
-- ==========================================
DROP POLICY IF EXISTS "Only admins can view popular content cache" ON public.popular_content_cache;
DROP POLICY IF EXISTS "Only admins can manage popular content cache" ON public.popular_content_cache;

CREATE POLICY "popular_content_cache_admin" ON public.popular_content_cache
FOR ALL TO public
USING (has_role((SELECT auth.uid()), 'admin'::app_role));

-- ==========================================
-- 10. profiles DELETE - Consolidate
-- ==========================================
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin_only" ON public.profiles;

CREATE POLICY "profiles_delete" ON public.profiles
FOR DELETE TO authenticated
USING (has_role((SELECT auth.uid()), 'admin'::app_role));

-- ==========================================
-- 11. profiles INSERT - Consolidate
-- ==========================================
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_controlled" ON public.profiles;
-- Keep Service role can insert profiles as it has different role

CREATE POLICY "profiles_insert" ON public.profiles
FOR INSERT TO public
WITH CHECK (
  (SELECT auth.uid()) = user_id
  OR (SELECT auth.role()) = 'service_role'
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
);

-- ==========================================
-- 12. profiles SELECT - Consolidate into one comprehensive policy
-- ==========================================
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Family members can view each others profiles" ON public.profiles;
DROP POLICY IF EXISTS "Read-only admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_secure_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_strict_access" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
FOR SELECT TO public
USING (
  user_id = (SELECT auth.uid())
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
  OR has_role((SELECT auth.uid()), 'read_only'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.family_members fm_viewer
    JOIN public.family_members fm_profile ON fm_viewer.family_id = fm_profile.family_id
    WHERE fm_viewer.user_id = (SELECT auth.uid())
    AND fm_profile.user_id = profiles.user_id
  )
);

-- ==========================================
-- 13. profiles UPDATE - Consolidate
-- ==========================================
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;

CREATE POLICY "profiles_update" ON public.profiles
FOR UPDATE TO public
USING (
  (SELECT auth.uid()) = user_id
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
)
WITH CHECK (
  (SELECT auth.uid()) = user_id
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
);

-- ==========================================
-- 14. progress_snapshots - Consolidate
-- ==========================================
DROP POLICY IF EXISTS "Family members can view progress snapshots" ON public.progress_snapshots;
DROP POLICY IF EXISTS "System can manage progress snapshots" ON public.progress_snapshots;

CREATE POLICY "progress_snapshots_access" ON public.progress_snapshots
FOR ALL TO public
USING (
  (SELECT auth.role()) = 'service_role'
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.family_members fm 
    WHERE fm.family_id = progress_snapshots.family_id 
    AND fm.user_id = (SELECT auth.uid())
  )
);

-- ==========================================
-- 15. site_settings - Consolidate (keep anon access separate)
-- ==========================================
DROP POLICY IF EXISTS "Admins can manage site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can view site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Authenticated users can view site settings" ON public.site_settings;
-- Keep "Allow anonymous read for public site settings"

CREATE POLICY "site_settings_admin" ON public.site_settings
FOR ALL TO public
USING (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "site_settings_authenticated_read" ON public.site_settings
FOR SELECT TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

-- ==========================================
-- 16. system_health_metrics - Consolidate
-- ==========================================
DROP POLICY IF EXISTS "Admins can view system health metrics" ON public.system_health_metrics;
DROP POLICY IF EXISTS "Authenticated system can manage health metrics" ON public.system_health_metrics;

CREATE POLICY "system_health_metrics_access" ON public.system_health_metrics
FOR ALL TO public
USING (
  (SELECT auth.role()) = 'service_role'
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
  OR has_role((SELECT auth.uid()), 'read_only'::app_role)
);

-- ==========================================
-- 17. user_achievements - Consolidate
-- ==========================================
DROP POLICY IF EXISTS "Family members can view achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Authenticated system can manage user achievements" ON public.user_achievements;

CREATE POLICY "user_achievements_access" ON public.user_achievements
FOR ALL TO public
USING (
  (SELECT auth.role()) = 'service_role'
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.family_members fm 
    WHERE fm.family_id = user_achievements.family_id 
    AND fm.user_id = (SELECT auth.uid())
  )
);

-- ==========================================
-- 18. user_levels - Consolidate
-- ==========================================
DROP POLICY IF EXISTS "Family members can view levels" ON public.user_levels;
DROP POLICY IF EXISTS "Authenticated system can manage user levels" ON public.user_levels;

CREATE POLICY "user_levels_access" ON public.user_levels
FOR ALL TO public
USING (
  (SELECT auth.role()) = 'service_role'
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.family_members fm 
    WHERE fm.family_id = user_levels.family_id 
    AND fm.user_id = (SELECT auth.uid())
  )
);

-- ==========================================
-- 19. user_points - Consolidate
-- ==========================================
DROP POLICY IF EXISTS "Family members can view points" ON public.user_points;
DROP POLICY IF EXISTS "Authenticated system can manage user points" ON public.user_points;

CREATE POLICY "user_points_access" ON public.user_points
FOR ALL TO public
USING (
  (SELECT auth.role()) = 'service_role'
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.family_members fm 
    WHERE fm.family_id = user_points.family_id 
    AND fm.user_id = (SELECT auth.uid())
  )
);

-- ==========================================
-- 20. user_privacy_settings - Consolidate
-- ==========================================
DROP POLICY IF EXISTS "privacy_settings_admin_view_only" ON public.user_privacy_settings;
DROP POLICY IF EXISTS "privacy_settings_user_only_manage" ON public.user_privacy_settings;

CREATE POLICY "user_privacy_settings_access" ON public.user_privacy_settings
FOR ALL TO public
USING (
  (SELECT auth.uid()) = user_id
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
)
WITH CHECK ((SELECT auth.uid()) = user_id);

-- ==========================================
-- 21. user_roles SELECT - Consolidate
-- ==========================================
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "user_roles_select" ON public.user_roles
FOR SELECT TO public
USING (
  user_id = (SELECT auth.uid())
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
);

-- ==========================================
-- 22. user_sessions - Remove duplicate ALL policies
-- ==========================================
DROP POLICY IF EXISTS "Authenticated system can manage sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "System manage sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.user_sessions;

CREATE POLICY "user_sessions_manage" ON public.user_sessions
FOR ALL TO public
USING (
  (SELECT auth.role()) = 'service_role'
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
  OR user_id = (SELECT auth.uid())
);