-- =====================================================
-- Comprehensive Database Performance Optimization
-- Part 1: Add Missing Foreign Key Indexes (26 total)
-- Part 2: Remove Unused Indexes (50+ total)
-- =====================================================

-- =====================================================
-- PART 1: ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

-- child_accounts
CREATE INDEX IF NOT EXISTS idx_child_accounts_user_id ON public.child_accounts(user_id);

-- chore_assignments
CREATE INDEX IF NOT EXISTS idx_chore_assignments_chore_id ON public.chore_assignments(chore_id);

-- chore_completions
CREATE INDEX IF NOT EXISTS idx_chore_completions_assignment_id ON public.chore_completions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_chore_completions_chore_id ON public.chore_completions(chore_id);

-- chore_templates
CREATE INDEX IF NOT EXISTS idx_chore_templates_category_id ON public.chore_templates(category_id);

-- chores
CREATE INDEX IF NOT EXISTS idx_chores_category_id ON public.chores(category_id);
CREATE INDEX IF NOT EXISTS idx_chores_family_id ON public.chores(family_id);
CREATE INDEX IF NOT EXISTS idx_chores_template_id ON public.chores(template_id);

-- daily_streaks
CREATE INDEX IF NOT EXISTS idx_daily_streaks_family_id ON public.daily_streaks(family_id);

-- family_challenges
CREATE INDEX IF NOT EXISTS idx_family_challenges_family_id ON public.family_challenges(family_id);

-- family_content_access
CREATE INDEX IF NOT EXISTS idx_family_content_access_added_by ON public.family_content_access(added_by);
CREATE INDEX IF NOT EXISTS idx_family_content_access_content_item_id ON public.family_content_access(content_item_id);

-- llm_api_calls
CREATE INDEX IF NOT EXISTS idx_llm_api_calls_user_id ON public.llm_api_calls(user_id);

-- mini_game_scores
CREATE INDEX IF NOT EXISTS idx_mini_game_scores_chore_context ON public.mini_game_scores(chore_context);
CREATE INDEX IF NOT EXISTS idx_mini_game_scores_family_id ON public.mini_game_scores(family_id);

-- motivation_journal_entries
CREATE INDEX IF NOT EXISTS idx_motivation_journal_entries_family_id ON public.motivation_journal_entries(family_id);

-- peer_recognitions
CREATE INDEX IF NOT EXISTS idx_peer_recognitions_chore_context ON public.peer_recognitions(chore_context);
CREATE INDEX IF NOT EXISTS idx_peer_recognitions_family_id ON public.peer_recognitions(family_id);

-- popular_content_cache
CREATE INDEX IF NOT EXISTS idx_popular_content_cache_content_item_id ON public.popular_content_cache(content_item_id);

-- reward_redemptions
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_family_id ON public.reward_redemptions(family_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_wishlist_item_id ON public.reward_redemptions(wishlist_item_id);

-- user_achievements
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON public.user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_family_id ON public.user_achievements(family_id);

-- user_levels
CREATE INDEX IF NOT EXISTS idx_user_levels_family_id ON public.user_levels(family_id);

-- user_points
CREATE INDEX IF NOT EXISTS idx_user_points_family_id ON public.user_points(family_id);

-- wishlist_items
CREATE INDEX IF NOT EXISTS idx_wishlist_items_family_id ON public.wishlist_items(family_id);

-- =====================================================
-- PART 2: REMOVE UNUSED INDEXES
-- =====================================================

-- security_alerts (3 unused)
DROP INDEX IF EXISTS idx_security_alerts_severity;
DROP INDEX IF EXISTS idx_security_alerts_type;
DROP INDEX IF EXISTS idx_security_alerts_user;

-- security_test_results (1 unused)
DROP INDEX IF EXISTS idx_security_test_results_run;

-- family_members (1 unused)
DROP INDEX IF EXISTS idx_family_members_family_user;

-- admin_audit_logs (4 unused)
DROP INDEX IF EXISTS idx_admin_audit_logs_admin_user_id;
DROP INDEX IF EXISTS idx_admin_audit_logs_created_at;
DROP INDEX IF EXISTS idx_admin_audit_logs_operation_type;
DROP INDEX IF EXISTS idx_admin_audit_logs_target_table_id;

-- analytics_metrics (1 unused)
DROP INDEX IF EXISTS idx_analytics_metrics_name_date;

-- child_accounts (7 unused - keeping new user_id index we just created)
DROP INDEX IF EXISTS idx_child_accounts_created_by;
DROP INDEX IF EXISTS idx_child_accounts_expires_at;
DROP INDEX IF EXISTS idx_child_accounts_family_code;
DROP INDEX IF EXISTS idx_child_accounts_family_created_by;
DROP INDEX IF EXISTS idx_child_accounts_family_id;
DROP INDEX IF EXISTS idx_child_accounts_generated_email;
DROP INDEX IF EXISTS idx_child_accounts_status;

-- chore_assignments (2 unused)
DROP INDEX IF EXISTS idx_chore_assignments_assigned_to_status;
DROP INDEX IF EXISTS idx_chore_assignments_family_id_due_date;

-- chore_completions (2 unused)
DROP INDEX IF EXISTS idx_chore_completions_family_id_completion_date;
DROP INDEX IF EXISTS idx_chore_completions_user_id_completion_date;

-- content_favorites (1 unused)
DROP INDEX IF EXISTS idx_content_favorites_user_lookup;

-- content_interactions (3 unused)
DROP INDEX IF EXISTS idx_content_interactions_content_item_id;
DROP INDEX IF EXISTS idx_content_interactions_user_content;
DROP INDEX IF EXISTS idx_content_interactions_user_family;

-- content_items (3 unused)
DROP INDEX IF EXISTS idx_content_items_active_approved;
DROP INDEX IF EXISTS idx_content_items_category_age;
DROP INDEX IF EXISTS idx_content_items_category_id;

-- daily_analytics_data (2 unused)
DROP INDEX IF EXISTS idx_daily_analytics_computed_at;
DROP INDEX IF EXISTS idx_daily_analytics_date;

-- engagement_metrics (2 unused)
DROP INDEX IF EXISTS idx_engagement_metrics_date_user;
DROP INDEX IF EXISTS idx_engagement_metrics_user_date;

-- error_patterns (1 unused)
DROP INDEX IF EXISTS idx_error_patterns_hash;

-- families (2 unused)
DROP INDEX IF EXISTS idx_families_created_at;
DROP INDEX IF EXISTS idx_families_created_by;

-- family_activity_logs (3 unused)
DROP INDEX IF EXISTS idx_family_activity_logs_family_id;
DROP INDEX IF EXISTS idx_family_activity_logs_timestamp;
DROP INDEX IF EXISTS idx_family_activity_logs_user_id;

-- family_connections (1 unused)
DROP INDEX IF EXISTS idx_family_connections_family_id_status;

-- Add comments for documentation
COMMENT ON INDEX idx_child_accounts_user_id IS 'FK covering index for child_accounts_user_id_fkey';
COMMENT ON INDEX idx_chore_assignments_chore_id IS 'FK covering index for chore_assignments_chore_id_fkey';
COMMENT ON INDEX idx_chores_family_id IS 'FK covering index for chores_family_id_fkey';