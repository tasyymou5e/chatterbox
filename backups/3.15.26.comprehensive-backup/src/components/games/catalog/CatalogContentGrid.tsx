/**
 * Content grid component with support for standard and virtualized rendering
 */

import React from 'react';
import { ContentCard } from '@/components/games/ContentCard';
import { VirtualizedContentGrid } from '@/components/games/VirtualizedContentGrid';
import { CatalogContentItem, CurationAccessType } from '../types/catalog';
import { EmptyState } from './EmptyState';

interface CatalogContentGridProps {
  items: CatalogContentItem[];
  favorites: string[];
  onFavorite: (contentId: string) => void;
  onContentClick: (item: CatalogContentItem) => void;
  showCurationControls: boolean;
  onContentCuration: (contentId: string, accessType: CurationAccessType) => void;
  useVirtualScrolling: boolean;
}

export const CatalogContentGrid = React.memo(function CatalogContentGrid({
  items,
  favorites,
  onFavorite,
  onContentClick,
  showCurationControls,
  onContentCuration,
  useVirtualScrolling
}: CatalogContentGridProps) {
  if (items.length === 0) {
    return <EmptyState />;
  }

  if (useVirtualScrolling) {
    return (
      <VirtualizedContentGrid
        items={items as Parameters<typeof VirtualizedContentGrid>[0]['items']}
        favorites={favorites}
        onFavorite={onFavorite}
        onContentClick={onContentClick as Parameters<typeof VirtualizedContentGrid>[0]['onContentClick']}
        showCurationControls={showCurationControls}
        onContentCuration={onContentCuration}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {items.map((item) => (
        <ContentCard
          key={item.id}
          item={item as Parameters<typeof ContentCard>[0]['item']}
          isFavorited={favorites.includes(item.id)}
          onFavorite={() => onFavorite(item.id)}
          onClick={() => onContentClick(item)}
          showCurationControls={showCurationControls}
          onContentCuration={onContentCuration}
        />
      ))}
    </div>
  );
});

export default CatalogContentGrid;
