// Phase 3: Virtual Scrolling Hook for Large Datasets
import { useState, useMemo, useCallback } from 'react';

interface VirtualScrollConfig {
  itemHeight: number;
  containerHeight: number;
  itemsPerRow: number;
  overscan?: number; // Number of items to render outside visible area
  buffer?: number;   // Additional buffer for smooth scrolling
}

interface VirtualScrollResult<T> {
  visibleItems: Array<{
    item: T;
    index: number;
    style: React.CSSProperties;
  }>;
  totalHeight: number;
  scrollToIndex: (index: number) => void;
  handleScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  containerProps: {
    style: React.CSSProperties;
    onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  };
  listProps: {
    style: React.CSSProperties;
  };
}

export function useVirtualScrolling<T>(
  items: T[],
  config: VirtualScrollConfig
): VirtualScrollResult<T> {
  const {
    itemHeight,
    containerHeight,
    itemsPerRow,
    overscan = 3,
    buffer = 2
  } = config;

  const [scrollTop, setScrollTop] = useState(0);

  // Calculate virtual scrolling metrics
  const virtualMetrics = useMemo(() => {
    const totalRows = Math.ceil(items.length / itemsPerRow);
    const totalHeight = totalRows * itemHeight;
    
    const visibleRowCount = Math.ceil(containerHeight / itemHeight);
    const startRow = Math.floor(scrollTop / itemHeight);
    const endRow = Math.min(
      startRow + visibleRowCount + overscan + buffer,
      totalRows
    );
    
    const startIndex = Math.max(0, (startRow - overscan) * itemsPerRow);
    const endIndex = Math.min(endRow * itemsPerRow, items.length);

    return {
      totalHeight,
      startIndex,
      endIndex,
      startRow: Math.max(0, startRow - overscan),
      visibleRowCount,
      totalRows
    };
  }, [items.length, itemHeight, containerHeight, itemsPerRow, scrollTop, overscan, buffer]);

  // Generate visible items with positioning
  const visibleItems = useMemo(() => {
    const result = [];
    
    for (let i = virtualMetrics.startIndex; i < virtualMetrics.endIndex; i++) {
      if (i >= items.length) break;
      
      const row = Math.floor(i / itemsPerRow);
      const col = i % itemsPerRow;
      
      const top = row * itemHeight;
      const left = `${(col / itemsPerRow) * 100}%`;
      const width = `${100 / itemsPerRow}%`;
      
      result.push({
        item: items[i],
        index: i,
        style: {
          position: 'absolute' as const,
          top,
          left,
          width,
          height: itemHeight,
          transform: 'translateZ(0)', // Force GPU acceleration
          willChange: 'transform'       // Hint for browser optimization
        }
      });
    }
    
    return result;
  }, [items, virtualMetrics, itemHeight, itemsPerRow]);

  // Handle scroll events with throttling
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
  }, []);

  // Scroll to specific index
  const scrollToIndex = useCallback((index: number) => {
    const row = Math.floor(index / itemsPerRow);
    const targetScrollTop = row * itemHeight;
    setScrollTop(targetScrollTop);
    
    // If there's a container reference, scroll it too
    const container = document.querySelector('[data-virtual-scroll-container]');
    if (container) {
      container.scrollTop = targetScrollTop;
    }
  }, [itemHeight, itemsPerRow]);

  // Container props for the scrollable area
  const containerProps = useMemo(() => ({
    style: {
      height: containerHeight,
      overflow: 'auto' as const,
      position: 'relative' as const,
      willChange: 'scroll-position'
    } as React.CSSProperties,
    onScroll: handleScroll,
    'data-virtual-scroll-container': true
  }), [containerHeight, handleScroll]);

  // List props for the content area
  const listProps = useMemo(() => ({
    style: {
      position: 'relative' as const,
      height: virtualMetrics.totalHeight,
      width: '100%'
    } as React.CSSProperties
  }), [virtualMetrics.totalHeight]);

  return {
    visibleItems,
    totalHeight: virtualMetrics.totalHeight,
    scrollToIndex,
    handleScroll,
    containerProps,
    listProps
  };
}