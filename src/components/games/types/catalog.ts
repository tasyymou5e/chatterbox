/**
 * Shared type definitions for the Games Catalog feature
 */

import { AutismFeatures } from '@/types/autism';

/**
 * Content item type for the catalog
 * Replaces inline ContentItem definitions across catalog components
 */
export interface CatalogContentItem {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  category_id: string | null;
  url: string;
  thumbnail_url: string | null;
  age_min: number | null;
  age_max: number | null;
  autism_features: AutismFeatures | null;
  tags: string[] | null;
  is_free: boolean | null;
  content_categories?: {
    name: string;
    icon: string | null;
  } | null;
}

/**
 * Category type for the catalog
 */
export interface CatalogCategory {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
}

/**
 * Filter state for catalog
 */
export interface CatalogFiltersState {
  searchTerm: string;
  selectedCategory: string;
  ageFilter: string;
}

/**
 * Curation access types for family content management
 */
export type CurationAccessType = 'allowed' | 'blocked' | 'featured';

/**
 * Props for catalog content grid components
 */
export interface CatalogGridProps {
  items: CatalogContentItem[];
  favorites: string[];
  onFavorite: (contentId: string) => void;
  onContentClick: (item: CatalogContentItem) => void;
  showCurationControls?: boolean;
  onContentCuration?: (contentId: string, accessType: CurationAccessType) => void;
}

/**
 * Cache statistics type
 */
export interface CatalogCacheStats {
  memoryItems: number;
  totalSize: number;
  oldestItem?: number;
  newestItem?: number;
  size?: number;
  hits?: number;
  misses?: number;
}
