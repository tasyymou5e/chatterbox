export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          achievement_type: Database["public"]["Enums"]["achievement_type"]
          created_at: string
          description: string
          icon: string | null
          id: string
          is_active: boolean | null
          is_secret: boolean | null
          name: string
          point_reward: number | null
          rarity: string | null
          unlock_criteria: Json
          updated_at: string
          xp_reward: number | null
        }
        Insert: {
          achievement_type: Database["public"]["Enums"]["achievement_type"]
          created_at?: string
          description: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_secret?: boolean | null
          name: string
          point_reward?: number | null
          rarity?: string | null
          unlock_criteria: Json
          updated_at?: string
          xp_reward?: number | null
        }
        Update: {
          achievement_type?: Database["public"]["Enums"]["achievement_type"]
          created_at?: string
          description?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_secret?: boolean | null
          name?: string
          point_reward?: number | null
          rarity?: string | null
          unlock_criteria?: Json
          updated_at?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          admin_user_id: string
          created_at: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          operation_type: string
          session_id: string | null
          target_id: string | null
          target_table: string | null
          user_agent: string | null
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          operation_type: string
          session_id?: string | null
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          operation_type?: string
          session_id?: string | null
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      analytics_metrics: {
        Row: {
          created_at: string | null
          date_recorded: string
          id: string
          metadata: Json | null
          metric_name: string
          metric_type: string
          metric_value: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date_recorded?: string
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_type: string
          metric_value: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date_recorded?: string
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_type?: string
          metric_value?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      archived_system_errors: {
        Row: {
          archived_at: string
          browser_info: Json | null
          component_name: string | null
          device_info: Json | null
          error_type: string
          id: string
          message: string
          metadata: Json | null
          original_created_at: string
          original_id: string
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          route_path: string | null
          session_id: string | null
          severity: string
          stack_trace: string | null
          user_id: string | null
        }
        Insert: {
          archived_at?: string
          browser_info?: Json | null
          component_name?: string | null
          device_info?: Json | null
          error_type: string
          id?: string
          message: string
          metadata?: Json | null
          original_created_at: string
          original_id: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          route_path?: string | null
          session_id?: string | null
          severity: string
          stack_trace?: string | null
          user_id?: string | null
        }
        Update: {
          archived_at?: string
          browser_info?: Json | null
          component_name?: string | null
          device_info?: Json | null
          error_type?: string
          id?: string
          message?: string
          metadata?: Json | null
          original_created_at?: string
          original_id?: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          route_path?: string | null
          session_id?: string | null
          severity?: string
          stack_trace?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      archived_user_activity_logs: {
        Row: {
          activity_type: string
          archived_at: string
          device_info: Json | null
          failure_reason: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          original_created_at: string
          original_id: string
          session_id: string | null
          success: boolean | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          archived_at?: string
          device_info?: Json | null
          failure_reason?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          original_created_at: string
          original_id: string
          session_id?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          archived_at?: string
          device_info?: Json | null
          failure_reason?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          original_created_at?: string
          original_id?: string
          session_id?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      child_accounts: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          family_code: string
          family_id: string
          first_name: string
          generated_email: string
          id: string
          last_name: string
          metadata: Json | null
          status: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          family_code: string
          family_id: string
          first_name: string
          generated_email: string
          id?: string
          last_name: string
          metadata?: Json | null
          status?: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          family_code?: string
          family_id?: string
          first_name?: string
          generated_email?: string
          id?: string
          last_name?: string
          metadata?: Json | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "child_accounts_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      chore_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          assigned_to: string
          chore_id: string | null
          completed_at: string | null
          completion_notes: string | null
          created_at: string
          due_date: string | null
          family_id: string | null
          id: string
          is_verified: boolean | null
          parent_feedback: string | null
          points_earned: number | null
          recurrence_pattern: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["chore_status"] | null
          streak_bonus: number | null
          time_bonus: number | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
          visibility_settings: Json | null
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          assigned_to: string
          chore_id?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          due_date?: string | null
          family_id?: string | null
          id?: string
          is_verified?: boolean | null
          parent_feedback?: string | null
          points_earned?: number | null
          recurrence_pattern?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["chore_status"] | null
          streak_bonus?: number | null
          time_bonus?: number | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          visibility_settings?: Json | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          assigned_to?: string
          chore_id?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          due_date?: string | null
          family_id?: string | null
          id?: string
          is_verified?: boolean | null
          parent_feedback?: string | null
          points_earned?: number | null
          recurrence_pattern?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["chore_status"] | null
          streak_bonus?: number | null
          time_bonus?: number | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          visibility_settings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chore_assignments_chore_id_fkey"
            columns: ["chore_id"]
            isOneToOne: false
            referencedRelation: "chores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chore_assignments_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      chore_categories: {
        Row: {
          autism_friendly_features: Json | null
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          autism_friendly_features?: Json | null
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          autism_friendly_features?: Json | null
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      chore_completions: {
        Row: {
          actual_duration: number | null
          assignment_id: string | null
          chore_id: string | null
          completion_date: string
          completion_notes: string | null
          completion_photos: string[] | null
          created_at: string
          difficulty_rating: number | null
          family_id: string | null
          id: string
          metadata: Json | null
          mini_game_scores: Json | null
          points_earned: number | null
          satisfaction_rating: number | null
          time_completed: string
          time_started: string | null
          user_id: string
        }
        Insert: {
          actual_duration?: number | null
          assignment_id?: string | null
          chore_id?: string | null
          completion_date?: string
          completion_notes?: string | null
          completion_photos?: string[] | null
          created_at?: string
          difficulty_rating?: number | null
          family_id?: string | null
          id?: string
          metadata?: Json | null
          mini_game_scores?: Json | null
          points_earned?: number | null
          satisfaction_rating?: number | null
          time_completed?: string
          time_started?: string | null
          user_id: string
        }
        Update: {
          actual_duration?: number | null
          assignment_id?: string | null
          chore_id?: string | null
          completion_date?: string
          completion_notes?: string | null
          completion_photos?: string[] | null
          created_at?: string
          difficulty_rating?: number | null
          family_id?: string | null
          id?: string
          metadata?: Json | null
          mini_game_scores?: Json | null
          points_earned?: number | null
          satisfaction_rating?: number | null
          time_completed?: string
          time_started?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chore_completions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "chore_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chore_completions_chore_id_fkey"
            columns: ["chore_id"]
            isOneToOne: false
            referencedRelation: "chores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chore_completions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      chore_templates: {
        Row: {
          age_max: number | null
          age_min: number | null
          autism_accommodations: Json | null
          base_points: number | null
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: Database["public"]["Enums"]["chore_difficulty"] | null
          estimated_duration: number | null
          id: string
          instructions: Json | null
          is_active: boolean | null
          sensory_considerations: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          autism_accommodations?: Json | null
          base_points?: number | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["chore_difficulty"] | null
          estimated_duration?: number | null
          id?: string
          instructions?: Json | null
          is_active?: boolean | null
          sensory_considerations?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          autism_accommodations?: Json | null
          base_points?: number | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["chore_difficulty"] | null
          estimated_duration?: number | null
          id?: string
          instructions?: Json | null
          is_active?: boolean | null
          sensory_considerations?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chore_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "chore_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chores: {
        Row: {
          base_points: number | null
          category_id: string | null
          created_at: string
          created_by: string
          custom_settings: Json | null
          description: string | null
          difficulty: Database["public"]["Enums"]["chore_difficulty"] | null
          estimated_duration: number | null
          family_id: string | null
          id: string
          instructions: Json | null
          is_active: boolean | null
          template_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          base_points?: number | null
          category_id?: string | null
          created_at?: string
          created_by: string
          custom_settings?: Json | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["chore_difficulty"] | null
          estimated_duration?: number | null
          family_id?: string | null
          id?: string
          instructions?: Json | null
          is_active?: boolean | null
          template_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          base_points?: number | null
          category_id?: string | null
          created_at?: string
          created_by?: string
          custom_settings?: Json | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["chore_difficulty"] | null
          estimated_duration?: number | null
          family_id?: string | null
          id?: string
          instructions?: Json | null
          is_active?: boolean | null
          template_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chores_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "chore_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chores_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chores_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "chore_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      content_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      content_favorites: {
        Row: {
          content_item_id: string | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content_item_id?: string | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content_item_id?: string | null
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_favorites_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      content_interactions: {
        Row: {
          content_item_id: string | null
          device_info: Json | null
          family_id: string | null
          id: string
          interaction_type: Database["public"]["Enums"]["interaction_type"]
          metadata: Json | null
          session_duration: number | null
          timestamp: string
          user_id: string
        }
        Insert: {
          content_item_id?: string | null
          device_info?: Json | null
          family_id?: string | null
          id?: string
          interaction_type: Database["public"]["Enums"]["interaction_type"]
          metadata?: Json | null
          session_duration?: number | null
          timestamp?: string
          user_id: string
        }
        Update: {
          content_item_id?: string | null
          device_info?: Json | null
          family_id?: string | null
          id?: string
          interaction_type?: Database["public"]["Enums"]["interaction_type"]
          metadata?: Json | null
          session_duration?: number | null
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_interactions_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          age_max: number | null
          age_min: number | null
          approval_status: Database["public"]["Enums"]["approval_status"] | null
          approved_by: string | null
          autism_features: Json | null
          category_id: string | null
          content_rating: string | null
          content_type: Database["public"]["Enums"]["content_type"]
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_free: boolean | null
          platform: string | null
          sort_order: number | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          approved_by?: string | null
          autism_features?: Json | null
          category_id?: string | null
          content_rating?: string | null
          content_type: Database["public"]["Enums"]["content_type"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_free?: boolean | null
          platform?: string | null
          sort_order?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          approved_by?: string | null
          autism_features?: Json | null
          category_id?: string | null
          content_rating?: string | null
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_free?: boolean | null
          platform?: string | null
          sort_order?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "content_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_analytics_data: {
        Row: {
          achievements_unlocked: number | null
          active_users: number
          avg_session_duration: number | null
          chores_completed: number | null
          computed_at: string
          date: string
          engagement_score: number | null
          id: string
          metadata: Json | null
          new_signups: number
          points_earned: number | null
          total_families: number
          total_users: number
          updated_at: string
        }
        Insert: {
          achievements_unlocked?: number | null
          active_users?: number
          avg_session_duration?: number | null
          chores_completed?: number | null
          computed_at?: string
          date: string
          engagement_score?: number | null
          id?: string
          metadata?: Json | null
          new_signups?: number
          points_earned?: number | null
          total_families?: number
          total_users?: number
          updated_at?: string
        }
        Update: {
          achievements_unlocked?: number | null
          active_users?: number
          avg_session_duration?: number | null
          chores_completed?: number | null
          computed_at?: string
          date?: string
          engagement_score?: number | null
          id?: string
          metadata?: Json | null
          new_signups?: number
          points_earned?: number | null
          total_families?: number
          total_users?: number
          updated_at?: string
        }
        Relationships: []
      }
      daily_streaks: {
        Row: {
          bonus_multiplier: number | null
          created_at: string
          current_streak: number | null
          family_id: string | null
          id: string
          last_activity_date: string | null
          longest_streak: number | null
          streak_start_date: string | null
          streak_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bonus_multiplier?: number | null
          created_at?: string
          current_streak?: number | null
          family_id?: string | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          streak_start_date?: string | null
          streak_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bonus_multiplier?: number | null
          created_at?: string
          current_streak?: number | null
          family_id?: string | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          streak_start_date?: string | null
          streak_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_streaks_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_metrics: {
        Row: {
          actions_performed: number | null
          created_at: string | null
          date_recorded: string | null
          engagement_score: number | null
          family_id: string | null
          id: string
          metadata: Json | null
          pages_visited: number | null
          session_duration: number | null
          user_id: string | null
        }
        Insert: {
          actions_performed?: number | null
          created_at?: string | null
          date_recorded?: string | null
          engagement_score?: number | null
          family_id?: string | null
          id?: string
          metadata?: Json | null
          pages_visited?: number | null
          session_duration?: number | null
          user_id?: string | null
        }
        Update: {
          actions_performed?: number | null
          created_at?: string | null
          date_recorded?: string | null
          engagement_score?: number | null
          family_id?: string | null
          id?: string
          metadata?: Json | null
          pages_visited?: number | null
          session_duration?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      error_patterns: {
        Row: {
          affected_users_count: number | null
          created_at: string
          error_message_pattern: string
          first_seen: string
          id: string
          last_seen: string
          occurrence_count: number | null
          pattern_hash: string
          resolution_status: string | null
          updated_at: string
        }
        Insert: {
          affected_users_count?: number | null
          created_at?: string
          error_message_pattern: string
          first_seen?: string
          id?: string
          last_seen?: string
          occurrence_count?: number | null
          pattern_hash: string
          resolution_status?: string | null
          updated_at?: string
        }
        Update: {
          affected_users_count?: number | null
          created_at?: string
          error_message_pattern?: string
          first_seen?: string
          id?: string
          last_seen?: string
          occurrence_count?: number | null
          pattern_hash?: string
          resolution_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      families: {
        Row: {
          created_at: string
          created_by: string
          display_name: string
          family_code: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          display_name: string
          family_code: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          display_name?: string
          family_code?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      family_activity_logs: {
        Row: {
          activity_details: Json | null
          activity_type: string
          created_at: string
          family_id: string | null
          id: string
          member_role: Database["public"]["Enums"]["app_role"]
          parent_user_id: string | null
          timestamp: string
          user_id: string
        }
        Insert: {
          activity_details?: Json | null
          activity_type: string
          created_at?: string
          family_id?: string | null
          id?: string
          member_role: Database["public"]["Enums"]["app_role"]
          parent_user_id?: string | null
          timestamp?: string
          user_id: string
        }
        Update: {
          activity_details?: Json | null
          activity_type?: string
          created_at?: string
          family_id?: string | null
          id?: string
          member_role?: Database["public"]["Enums"]["app_role"]
          parent_user_id?: string | null
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_activity_logs_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      family_challenges: {
        Row: {
          challenge_type: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          end_date: string
          family_id: string | null
          id: string
          is_active: boolean | null
          is_completed: boolean | null
          participant_count: number | null
          progress: Json | null
          reward_points: number | null
          start_date: string
          target_criteria: Json
          title: string
          updated_at: string
        }
        Insert: {
          challenge_type?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_date: string
          family_id?: string | null
          id?: string
          is_active?: boolean | null
          is_completed?: boolean | null
          participant_count?: number | null
          progress?: Json | null
          reward_points?: number | null
          start_date: string
          target_criteria: Json
          title: string
          updated_at?: string
        }
        Update: {
          challenge_type?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string
          family_id?: string | null
          id?: string
          is_active?: boolean | null
          is_completed?: boolean | null
          participant_count?: number | null
          progress?: Json | null
          reward_points?: number | null
          start_date?: string
          target_criteria?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_challenges_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      family_connections: {
        Row: {
          connected_at: string | null
          connected_user_id: string
          connection_metadata: Json | null
          connection_role: Database["public"]["Enums"]["app_role"]
          created_at: string
          expires_at: string | null
          family_id: string
          id: string
          invited_by: string
          permissions: Json
          status: string
          updated_at: string
        }
        Insert: {
          connected_at?: string | null
          connected_user_id: string
          connection_metadata?: Json | null
          connection_role: Database["public"]["Enums"]["app_role"]
          created_at?: string
          expires_at?: string | null
          family_id: string
          id?: string
          invited_by: string
          permissions?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          connected_at?: string | null
          connected_user_id?: string
          connection_metadata?: Json | null
          connection_role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          expires_at?: string | null
          family_id?: string
          id?: string
          invited_by?: string
          permissions?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_connections_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      family_invitations: {
        Row: {
          accepted_at: string | null
          connection_role: Database["public"]["Enums"]["app_role"]
          created_at: string
          expires_at: string
          family_id: string
          id: string
          invitation_message: string | null
          invited_by: string
          invited_email: string
          permissions: Json
        }
        Insert: {
          accepted_at?: string | null
          connection_role: Database["public"]["Enums"]["app_role"]
          created_at?: string
          expires_at?: string
          family_id: string
          id?: string
          invitation_message?: string | null
          invited_by: string
          invited_email: string
          permissions?: Json
        }
        Update: {
          accepted_at?: string | null
          connection_role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          expires_at?: string
          family_id?: string
          id?: string
          invitation_message?: string | null
          invited_by?: string
          invited_email?: string
          permissions?: Json
        }
        Relationships: [
          {
            foreignKeyName: "family_invitations_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      family_leaderboards: {
        Row: {
          achievements_unlocked: number | null
          chores_completed: number | null
          collaboration_score: number | null
          family_id: string | null
          id: string
          last_updated: string
          leaderboard_type: string
          period_end: string
          period_start: string
          points: number | null
          rank: number | null
          user_id: string
        }
        Insert: {
          achievements_unlocked?: number | null
          chores_completed?: number | null
          collaboration_score?: number | null
          family_id?: string | null
          id?: string
          last_updated?: string
          leaderboard_type: string
          period_end: string
          period_start: string
          points?: number | null
          rank?: number | null
          user_id: string
        }
        Update: {
          achievements_unlocked?: number | null
          chores_completed?: number | null
          collaboration_score?: number | null
          family_id?: string | null
          id?: string
          last_updated?: string
          leaderboard_type?: string
          period_end?: string
          period_start?: string
          points?: number | null
          rank?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_leaderboards_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          connection_metadata: Json | null
          created_at: string
          family_id: string
          id: string
          invited_by: string | null
          joined_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          connection_metadata?: Json | null
          created_at?: string
          family_id: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          connection_metadata?: Json | null
          created_at?: string
          family_id?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      mini_game_scores: {
        Row: {
          bonus_points: number | null
          chore_context: string | null
          completion_time: number | null
          difficulty_level: string | null
          family_id: string | null
          game_type: string
          id: string
          metadata: Json | null
          played_at: string
          score: number
          user_id: string
        }
        Insert: {
          bonus_points?: number | null
          chore_context?: string | null
          completion_time?: number | null
          difficulty_level?: string | null
          family_id?: string | null
          game_type: string
          id?: string
          metadata?: Json | null
          played_at?: string
          score: number
          user_id: string
        }
        Update: {
          bonus_points?: number | null
          chore_context?: string | null
          completion_time?: number | null
          difficulty_level?: string | null
          family_id?: string | null
          game_type?: string
          id?: string
          metadata?: Json | null
          played_at?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mini_game_scores_chore_context_fkey"
            columns: ["chore_context"]
            isOneToOne: false
            referencedRelation: "chores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mini_game_scores_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      motivation_journal_entries: {
        Row: {
          challenges_faced: string[] | null
          created_at: string
          entry_date: string
          family_id: string | null
          goals_for_tomorrow: string[] | null
          gratitude_notes: string[] | null
          id: string
          metadata: Json | null
          mood_after: number | null
          mood_before: number | null
          parent_comments: string | null
          photo_urls: string[] | null
          proud_moments: string[] | null
          reflection_text: string | null
          updated_at: string
          user_id: string
          voice_note_url: string | null
        }
        Insert: {
          challenges_faced?: string[] | null
          created_at?: string
          entry_date?: string
          family_id?: string | null
          goals_for_tomorrow?: string[] | null
          gratitude_notes?: string[] | null
          id?: string
          metadata?: Json | null
          mood_after?: number | null
          mood_before?: number | null
          parent_comments?: string | null
          photo_urls?: string[] | null
          proud_moments?: string[] | null
          reflection_text?: string | null
          updated_at?: string
          user_id: string
          voice_note_url?: string | null
        }
        Update: {
          challenges_faced?: string[] | null
          created_at?: string
          entry_date?: string
          family_id?: string | null
          goals_for_tomorrow?: string[] | null
          gratitude_notes?: string[] | null
          id?: string
          metadata?: Json | null
          mood_after?: number | null
          mood_before?: number | null
          parent_comments?: string | null
          photo_urls?: string[] | null
          proud_moments?: string[] | null
          reflection_text?: string | null
          updated_at?: string
          user_id?: string
          voice_note_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "motivation_journal_entries_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_recognitions: {
        Row: {
          chore_context: string | null
          family_id: string | null
          from_user_id: string
          given_at: string
          id: string
          message: string | null
          points_awarded: number | null
          recognition_type: string | null
          to_user_id: string
        }
        Insert: {
          chore_context?: string | null
          family_id?: string | null
          from_user_id: string
          given_at?: string
          id?: string
          message?: string | null
          points_awarded?: number | null
          recognition_type?: string | null
          to_user_id: string
        }
        Update: {
          chore_context?: string | null
          family_id?: string | null
          from_user_id?: string
          given_at?: string
          id?: string
          message?: string | null
          points_awarded?: number | null
          recognition_type?: string | null
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_recognitions_chore_context_fkey"
            columns: ["chore_context"]
            isOneToOne: false
            referencedRelation: "chores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_recognitions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_metrics: {
        Row: {
          component_name: string | null
          created_at: string
          id: string
          metadata: Json | null
          metric_type: string
          route_path: string | null
          threshold_exceeded: boolean | null
          user_id: string | null
          value: number
        }
        Insert: {
          component_name?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_type: string
          route_path?: string | null
          threshold_exceeded?: boolean | null
          user_id?: string | null
          value: number
        }
        Update: {
          component_name?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_type?: string
          route_path?: string | null
          threshold_exceeded?: boolean | null
          user_id?: string | null
          value?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reward_redemptions: {
        Row: {
          approval_notes: string | null
          approved_by: string | null
          created_at: string
          family_id: string | null
          fulfilled_at: string | null
          fulfillment_status: string | null
          id: string
          points_spent: number
          redeemed_at: string
          user_id: string
          wishlist_item_id: string | null
        }
        Insert: {
          approval_notes?: string | null
          approved_by?: string | null
          created_at?: string
          family_id?: string | null
          fulfilled_at?: string | null
          fulfillment_status?: string | null
          id?: string
          points_spent: number
          redeemed_at?: string
          user_id: string
          wishlist_item_id?: string | null
        }
        Update: {
          approval_notes?: string | null
          approved_by?: string | null
          created_at?: string
          family_id?: string | null
          fulfilled_at?: string | null
          fulfillment_status?: string | null
          id?: string
          points_spent?: number
          redeemed_at?: string
          user_id?: string
          wishlist_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_wishlist_item_id_fkey"
            columns: ["wishlist_item_id"]
            isOneToOne: false
            referencedRelation: "wishlist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_logs: {
        Row: {
          created_at: string
          event_details: Json
          event_type: string
          id: string
          ip_address: unknown | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          session_id: string | null
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_details?: Json
          event_type: string
          id?: string
          ip_address?: unknown | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_details?: Json
          event_type?: string
          id?: string
          ip_address?: unknown | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      system_alerts: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          resolved: boolean | null
          resolved_at: string | null
          severity: string
          title: string
          triggered_by: string | null
          updated_at: string
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          severity: string
          title: string
          triggered_by?: string | null
          updated_at?: string
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          severity?: string
          title?: string
          triggered_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      system_errors: {
        Row: {
          browser_info: Json | null
          component_name: string | null
          created_at: string
          device_info: Json | null
          error_type: string
          id: string
          message: string
          metadata: Json | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          route_path: string | null
          session_id: string | null
          severity: string
          stack_trace: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          browser_info?: Json | null
          component_name?: string | null
          created_at?: string
          device_info?: Json | null
          error_type: string
          id?: string
          message: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          route_path?: string | null
          session_id?: string | null
          severity: string
          stack_trace?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          browser_info?: Json | null
          component_name?: string | null
          created_at?: string
          device_info?: Json | null
          error_type?: string
          id?: string
          message?: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          route_path?: string | null
          session_id?: string | null
          severity?: string
          stack_trace?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      system_health_metrics: {
        Row: {
          error_rate: number | null
          id: string
          metadata: Json | null
          response_time: number | null
          service_name: string
          status: string
          timestamp: string | null
          uptime_percentage: number | null
        }
        Insert: {
          error_rate?: number | null
          id?: string
          metadata?: Json | null
          response_time?: number | null
          service_name: string
          status: string
          timestamp?: string | null
          uptime_percentage?: number | null
        }
        Update: {
          error_rate?: number | null
          id?: string
          metadata?: Json | null
          response_time?: number | null
          service_name?: string
          status?: string
          timestamp?: string | null
          uptime_percentage?: number | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string | null
          family_id: string | null
          id: string
          metadata: Json | null
          progress: Json | null
          shared_with_connections: Json | null
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id?: string | null
          family_id?: string | null
          id?: string
          metadata?: Json | null
          progress?: Json | null
          shared_with_connections?: Json | null
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string | null
          family_id?: string | null
          id?: string
          metadata?: Json | null
          progress?: Json | null
          shared_with_connections?: Json | null
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_logs: {
        Row: {
          activity_type: string
          created_at: string
          device_info: Json | null
          failure_reason: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          session_id: string | null
          success: boolean
          timestamp: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          device_info?: Json | null
          failure_reason?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          session_id?: string | null
          success?: boolean
          timestamp?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          device_info?: Json | null
          failure_reason?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          session_id?: string | null
          success?: boolean
          timestamp?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_levels: {
        Row: {
          created_at: string
          current_level: number | null
          current_xp: number | null
          family_id: string | null
          id: string
          level_name: string | null
          level_up_date: string | null
          next_level_xp: number | null
          total_xp: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_level?: number | null
          current_xp?: number | null
          family_id?: string | null
          id?: string
          level_name?: string | null
          level_up_date?: string | null
          next_level_xp?: number | null
          total_xp?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_level?: number | null
          current_xp?: number | null
          family_id?: string | null
          id?: string
          level_name?: string | null
          level_up_date?: string | null
          next_level_xp?: number | null
          total_xp?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_levels_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      user_points: {
        Row: {
          created_at: string
          current_points: number | null
          family_id: string | null
          id: string
          last_reset_date: string | null
          lifetime_points: number | null
          monthly_points: number | null
          points_spent: number | null
          updated_at: string
          user_id: string
          weekly_points: number | null
        }
        Insert: {
          created_at?: string
          current_points?: number | null
          family_id?: string | null
          id?: string
          last_reset_date?: string | null
          lifetime_points?: number | null
          monthly_points?: number | null
          points_spent?: number | null
          updated_at?: string
          user_id: string
          weekly_points?: number | null
        }
        Update: {
          created_at?: string
          current_points?: number | null
          family_id?: string | null
          id?: string
          last_reset_date?: string | null
          lifetime_points?: number | null
          monthly_points?: number | null
          points_spent?: number | null
          updated_at?: string
          user_id?: string
          weekly_points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_points_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          device_info: Json | null
          ended_at: string | null
          family_id: string | null
          id: string
          ip_address: unknown | null
          is_active: boolean
          last_activity: string
          session_id: string
          started_at: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          ended_at?: string | null
          family_id?: string | null
          id?: string
          ip_address?: unknown | null
          is_active?: boolean
          last_activity?: string
          session_id: string
          started_at?: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          ended_at?: string | null
          family_id?: string | null
          id?: string
          ip_address?: unknown | null
          is_active?: boolean
          last_activity?: string
          session_id?: string
          started_at?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_items: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          description: string | null
          family_id: string | null
          id: string
          image_url: string | null
          is_approved: boolean | null
          is_redeemed: boolean | null
          item_name: string
          point_cost: number
          redeemed_at: string | null
          reward_type: Database["public"]["Enums"]["reward_type"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          family_id?: string | null
          id?: string
          image_url?: string | null
          is_approved?: boolean | null
          is_redeemed?: boolean | null
          item_name: string
          point_cost: number
          redeemed_at?: string | null
          reward_type?: Database["public"]["Enums"]["reward_type"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          family_id?: string | null
          id?: string
          image_url?: string | null
          is_approved?: boolean | null
          is_redeemed?: boolean | null
          item_name?: string
          point_cost?: number
          redeemed_at?: string | null
          reward_type?: Database["public"]["Enums"]["reward_type"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      daily_analytics: {
        Row: {
          active_users: number | null
          date: string | null
          engagement_score: number | null
          new_signups: number | null
          total_families: number | null
          total_users: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      archive_old_activity_logs: {
        Args: { days_to_keep?: number }
        Returns: number
      }
      archive_old_system_errors: {
        Args: { days_to_keep?: number }
        Returns: number
      }
      calculate_chore_points: {
        Args: {
          base_points: number
          completion_time?: number
          difficulty: Database["public"]["Enums"]["chore_difficulty"]
          estimated_time?: number
          streak_count?: number
        }
        Returns: number
      }
      calculate_level_progression: {
        Args: { current_xp: number }
        Returns: {
          level: number
          level_name: string
          next_level_xp: number
        }[]
      }
      calculate_user_retention: {
        Args: { days_back?: number }
        Returns: {
          cohort_date: string
          retention_day_1: number
          retention_day_30: number
          retention_day_7: number
          users_count: number
        }[]
      }
      check_and_award_achievements: {
        Args: {
          p_completion_data?: Json
          p_family_id: string
          p_user_id: string
        }
        Returns: {
          achievement_id: string
          achievement_name: string
        }[]
      }
      cleanup_expired_data: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      compute_daily_analytics: {
        Args: { target_date?: string }
        Returns: undefined
      }
      detect_suspicious_activity: {
        Args: { p_activity_type: string; p_metadata?: Json; p_user_id: string }
        Returns: boolean
      }
      end_user_session: {
        Args: { session_id: string }
        Returns: undefined
      }
      generate_child_account_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_family_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_daily_analytics_for_admins: {
        Args: { days_back?: number }
        Returns: {
          active_users: number
          date: string
          engagement_score: number
          new_signups: number
          total_families: number
          total_users: number
        }[]
      }
      get_engagement_analytics: {
        Args: { days_back?: number }
        Returns: {
          change_percentage: number
          current_value: number
          metric: string
          previous_value: number
          trend: string
        }[]
      }
      get_error_statistics: {
        Args: { days_back?: number }
        Returns: {
          critical_errors: number
          error_rate_trend: number[]
          high_errors: number
          low_errors: number
          medium_errors: number
          resolved_errors: number
          top_error_components: string[]
          total_errors: number
        }[]
      }
      has_connection_permission: {
        Args: {
          family_id_param: string
          permission_key: string
          user_id_param: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_family_connection: {
        Args: { family_id_param: string; user_id_param: string }
        Returns: boolean
      }
      is_family_creator: {
        Args: { family_id_param: string; user_id_param: string }
        Returns: boolean
      }
      is_family_member: {
        Args: { family_id_param: string; user_id_param: string }
        Returns: boolean
      }
      log_admin_operation: {
        Args: {
          p_admin_user_id: string
          p_metadata?: Json
          p_new_values?: Json
          p_old_values?: Json
          p_operation_type: string
          p_target_id?: string
          p_target_table?: string
        }
        Returns: string
      }
      log_family_activity: {
        Args: {
          p_activity_details?: Json
          p_activity_type: string
          p_family_id: string
          p_member_role: Database["public"]["Enums"]["app_role"]
          p_parent_user_id?: string
          p_user_id: string
        }
        Returns: string
      }
      log_security_event: {
        Args: {
          p_event_details?: Json
          p_event_type: string
          p_session_id?: string
          p_severity: string
          p_user_id: string
        }
        Returns: string
      }
      log_system_error: {
        Args: {
          p_browser_info?: Json
          p_component_name?: string
          p_device_info?: Json
          p_error_type: string
          p_message: string
          p_metadata?: Json
          p_route_path?: string
          p_session_id?: string
          p_severity: string
          p_stack_trace?: string
          p_user_id?: string
        }
        Returns: string
      }
      log_user_activity: {
        Args: {
          p_activity_type: string
          p_device_info?: Json
          p_failure_reason?: string
          p_ip_address?: unknown
          p_metadata?: Json
          p_session_id?: string
          p_success?: boolean
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      refresh_analytics_automated: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      refresh_daily_analytics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_daily_analytics_secure: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      resolve_system_error: {
        Args: { error_id: string }
        Returns: boolean
      }
      update_family_leaderboard: {
        Args: { p_family_id: string }
        Returns: undefined
      }
      update_user_gamification_stats: {
        Args: {
          p_family_id: string
          p_points_earned: number
          p_user_id: string
          p_xp_earned?: number
        }
        Returns: undefined
      }
      validate_password_strength: {
        Args: { password_text: string }
        Returns: Json
      }
      validate_user_permissions: {
        Args: {
          p_action: string
          p_resource_id: string
          p_resource_type: string
          p_user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      achievement_type:
        | "streak"
        | "skill"
        | "collaboration"
        | "milestone"
        | "special"
      app_role:
        | "admin"
        | "parent"
        | "child"
        | "therapist"
        | "teacher"
        | "grandparent"
        | "family_friend"
      approval_status: "pending" | "approved" | "rejected"
      chore_difficulty: "easy" | "medium" | "hard"
      chore_status:
        | "assigned"
        | "in_progress"
        | "completed"
        | "verified"
        | "overdue"
      content_type: "game" | "video" | "website" | "app"
      interaction_type: "view" | "click" | "launch" | "complete" | "favorite"
      reward_type: "points" | "custom" | "privilege" | "activity"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      achievement_type: [
        "streak",
        "skill",
        "collaboration",
        "milestone",
        "special",
      ],
      app_role: [
        "admin",
        "parent",
        "child",
        "therapist",
        "teacher",
        "grandparent",
        "family_friend",
      ],
      approval_status: ["pending", "approved", "rejected"],
      chore_difficulty: ["easy", "medium", "hard"],
      chore_status: [
        "assigned",
        "in_progress",
        "completed",
        "verified",
        "overdue",
      ],
      content_type: ["game", "video", "website", "app"],
      interaction_type: ["view", "click", "launch", "complete", "favorite"],
      reward_type: ["points", "custom", "privilege", "activity"],
    },
  },
} as const
