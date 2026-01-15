/**
 * Types for content management and display
 */

import type { AutismFeatures } from './autism';

export interface ContentItem {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  url: string;
  thumbnail_url: string | null;
  age_min: number | null;
  age_max: number | null;
  autism_features: AutismFeatures | null;
  tags: string[] | null;
  is_free: boolean | null;
  is_active?: boolean | null;
  category_id?: string | null;
  skill_levels?: string[] | null;
  platform?: string | null;
  content_rating?: string | null;
  sort_order?: number | null;
  created_at?: string;
  updated_at?: string;
  content_categories?: {
    name: string;
    icon: string | null;
  } | null;
}

export interface ContentCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_active: boolean | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

export interface ContentFilters {
  category?: string;
  contentType?: string;
  ageRange?: [number, number];
  isFree?: boolean;
  searchQuery?: string;
  tags?: string[];
  autismFeatures?: (keyof AutismFeatures)[];
}

export interface ContentInteraction {
  id: string;
  content_item_id: string;
  user_id: string;
  family_id?: string;
  interaction_type: 'view' | 'play' | 'complete' | 'favorite' | 'share';
  session_duration?: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}
