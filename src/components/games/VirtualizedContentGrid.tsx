// Phase 3: Virtual Scrolling Content Grid for 10K+ Items
import React, { useMemo, useCallback } from 'react';
import { useVirtualScrolling } from '@/hooks/useVirtualScrolling';
import { ContentCard } from './ContentCard';

interface ContentItem {
  id: string;
  title: string;
  description: string;
  content_type: string;
  category_id: string;
  url: string;
  thumbnail_url: string;
  age_min: number;
  age_max: number;
  autism_features: any;
  tags: string[];
  is_free: boolean;
  content_categories?: {
    name: string;
    icon: string;
  };
}

interface VirtualizedContentGridProps {
  items: ContentItem[];
  favorites: string[];
  onFavorite: (contentId: string) => void;
  onContentClick: (item: ContentItem) => void;
  showCurationControls?: boolean;
  onContentCuration?: (contentId: string, accessType: 'allowed' | 'blocked' | 'featured') => void;
  containerHeight?: number;
}

// Constants for virtual scrolling
const ITEM_HEIGHT = 400; // Height of each content card + margin
const CONTAINER_HEIGHT = 800; // Height of the scrollable container
const ITEMS_PER_ROW_MAP = {
  sm: 1,
  md: 2,
  lg: 3,
  xl: 4
} as const;

function VirtualizedContentGridComponent({
  items,
  favorites,
  onFavorite,
  onContentClick,
  showCurationControls = false,
  onContentCuration,
  containerHeight = CONTAINER_HEIGHT
}: VirtualizedContentGridProps) {
  
  // Responsive items per row calculation
  const itemsPerRow = useMemo(() => {
    const width = window.innerWidth;
    if (width >= 1280) return ITEMS_PER_ROW_MAP.xl; // xl breakpoint
    if (width >= 1024) return ITEMS_PER_ROW_MAP.lg; // lg breakpoint
    if (width >= 768) return ITEMS_PER_ROW_MAP.md;  // md breakpoint
    return ITEMS_PER_ROW_MAP.sm;                     // sm and below
  }, []);

  // Virtual scrolling configuration
  const virtualScrollConfig = useMemo(() => ({
    itemHeight: ITEM_HEIGHT,
    containerHeight,
    itemsPerRow,
    overscan: 2, // Render 2 extra rows above/below visible area
    buffer: 1    // Additional buffer for smooth scrolling
  }), [itemsPerRow, containerHeight]);

  // Use virtual scrolling hook
  const {
    visibleItems,
    containerProps,
    listProps,
    scrollToIndex
  } = useVirtualScrolling(items, virtualScrollConfig);

  // Memoized handlers to prevent unnecessary re-renders
  const handleFavorite = useCallback((contentId: string) => {
    onFavorite(contentId);
  }, [onFavorite]);

  const handleContentClick = useCallback((item: ContentItem) => {
    onContentClick(item);
  }, [onContentClick]);

  const handleContentCuration = useCallback((contentId: string, accessType: 'allowed' | 'blocked' | 'featured') => {
    if (onContentCuration) {
      onContentCuration(contentId, accessType);
    }
  }, [onContentCuration]);

  // Performance optimization: search functionality - exposed for future use
  const scrollToItem = useCallback((itemId: string) => {
    void itemId; // Kept for future use
    const index = items.findIndex(item => item.id === itemId);
    if (index !== -1) {
      scrollToIndex(index);
    }
  }, [items, scrollToIndex]);
  void scrollToItem; // Kept for future use

  // Loading state for empty items
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold mb-2">No content found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filter criteria
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Debug info for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
          Virtual Grid: {items.length} total items, {visibleItems.length} visible, {itemsPerRow} per row
        </div>
      )}
      
      {/* Virtual scrolling container */}
      <div {...containerProps} className="relative">
        <div {...listProps}>
          {visibleItems.map(({ item, style }) => (
            <div
              key={item.id}
              style={style}
              className="px-3 py-3" // Add consistent padding
            >
              <ContentCard
                item={item}
                isFavorited={favorites.includes(item.id)}
                onFavorite={() => handleFavorite(item.id)}
                onClick={() => handleContentClick(item)}
                showCurationControls={showCurationControls}
                onContentCuration={handleContentCuration}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Performance indicator */}
      {items.length > 1000 && (
        <div className="mt-4 text-center text-sm text-muted-foreground">
          🚀 Virtual scrolling active - showing {visibleItems.length} of {items.length} items
        </div>
      )}
    </div>
  );
}

// Phase 3: Enhanced memoization for large datasets
export const VirtualizedContentGrid = React.memo(VirtualizedContentGridComponent, (prevProps, nextProps) => {
  // Deep comparison for items array (check if items have actually changed)
  const itemsChanged = prevProps.items.length !== nextProps.items.length ||
    prevProps.items.some((item, index) => 
      item.id !== nextProps.items[index]?.id ||
      item.title !== nextProps.items[index]?.title
    );

  // Quick comparison for favorites array
  const favoritesChanged = prevProps.favorites.length !== nextProps.favorites.length ||
    prevProps.favorites.some((fav, index) => fav !== nextProps.favorites[index]);

  return !itemsChanged &&
    !favoritesChanged &&
    prevProps.showCurationControls === nextProps.showCurationControls &&
    prevProps.containerHeight === nextProps.containerHeight;
});

export default VirtualizedContentGrid;