/**
 * Virtual Scrolling Components
 *
 * Provides high-performance virtual scrolling components for large datasets
 * to maintain smooth performance with thousands of items.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  memo,
  CSSProperties,
} from 'react';

import { useVirtualScrolling } from '@/lib/performance/optimization';
import { cn } from '@/lib/utils';

// Base virtual scrolling container
interface VirtualScrollContainerProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  getItemKey?: (item: T, index: number) => string | number;
}

export function VirtualScrollContainer<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className,
  onScroll,
  getItemKey = (_, index) => index,
}: VirtualScrollContainerProps<T>) {
  const { visibleItems, totalHeight, offsetY, handleScroll } =
    useVirtualScrolling(items, itemHeight, containerHeight, overscan);

  const handleScrollWithCallback = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      handleScroll(event);
      onScroll?.(event.currentTarget.scrollTop);
    },
    [handleScroll, onScroll]
  );

  return (
    <div
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScrollWithCallback}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map(({ item, index }) => (
            <div
              key={getItemKey(item, index)}
              style={{ height: itemHeight }}
              className="flex items-center"
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Virtual grid for card layouts
interface VirtualGridProps<T> {
  items: T[];
  itemHeight: number;
  itemWidth: number;
  containerHeight: number;
  containerWidth: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  gap?: number;
  overscan?: number;
  className?: string;
  getItemKey?: (item: T, index: number) => string | number;
}

export function VirtualGrid<T>({
  items,
  itemHeight,
  itemWidth,
  containerHeight,
  containerWidth,
  renderItem,
  gap = 16,
  overscan = 5,
  className,
  getItemKey = (_, index) => index,
}: VirtualGridProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);

  const columnsCount = Math.floor((containerWidth + gap) / (itemWidth + gap));
  const rowsCount = Math.ceil(items.length / columnsCount);
  const rowHeight = itemHeight + gap;

  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visibleRows = Math.ceil(containerHeight / rowHeight);
    const end = Math.min(rowsCount, start + visibleRows + overscan * 2);
    return { start, end };
  }, [scrollTop, rowHeight, containerHeight, rowsCount, overscan]);

  const visibleItems = useMemo(() => {
    const result: Array<{ item: T; index: number; row: number; col: number }> =
      [];

    for (let row = visibleRange.start; row < visibleRange.end; row++) {
      for (let col = 0; col < columnsCount; col++) {
        const index = row * columnsCount + col;
        if (index < items.length) {
          result.push({
            item: items[index],
            index,
            row,
            col,
          });
        }
      }
    }

    return result;
  }, [items, visibleRange, columnsCount]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  const totalHeight = rowsCount * rowHeight;
  const offsetY = visibleRange.start * rowHeight;

  return (
    <div
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map(({ item, index, row, col }) => (
            <div
              key={getItemKey(item, index)}
              style={{
                position: 'absolute',
                top: (row - visibleRange.start) * rowHeight,
                left: col * (itemWidth + gap),
                width: itemWidth,
                height: itemHeight,
              }}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Variable height virtual scrolling (more complex but handles dynamic heights)
interface VariableVirtualScrollProps<T> {
  items: T[];
  estimatedItemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemHeight?: (item: T, index: number) => number;
  overscan?: number;
  className?: string;
  getItemKey?: (item: T, index: number) => string | number;
}

export function VariableVirtualScroll<T>({
  items,
  estimatedItemHeight,
  containerHeight,
  renderItem,
  getItemHeight,
  overscan = 5,
  className,
  getItemKey = (_, index) => index,
}: VariableVirtualScrollProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [itemHeights, setItemHeights] = useState<Map<number, number>>(
    new Map()
  );
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Calculate item positions based on measured heights
  const itemPositions = useMemo(() => {
    const positions: number[] = [];
    let totalHeight = 0;

    for (let i = 0; i < items.length; i++) {
      positions[i] = totalHeight;
      const height =
        itemHeights.get(i) ||
        (getItemHeight ? getItemHeight(items[i], i) : estimatedItemHeight);
      totalHeight += height;
    }

    return { positions, totalHeight };
  }, [items, itemHeights, getItemHeight, estimatedItemHeight]);

  // Find visible range based on scroll position
  const visibleRange = useMemo(() => {
    const { positions } = itemPositions;

    let start = 0;
    let end = items.length;

    // Binary search for start
    let left = 0;
    let right = positions.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (positions[mid] < scrollTop) {
        start = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    // Find end
    const viewportBottom = scrollTop + containerHeight;
    for (let i = start; i < positions.length; i++) {
      if (positions[i] > viewportBottom) {
        end = i;
        break;
      }
    }

    // Apply overscan
    start = Math.max(0, start - overscan);
    end = Math.min(items.length, end + overscan);

    return { start, end };
  }, [scrollTop, containerHeight, itemPositions, items.length, overscan]);

  // Measure item heights after render
  useEffect(() => {
    const newHeights = new Map(itemHeights);
    let hasChanges = false;

    itemRefs.current.forEach((element, index) => {
      if (element) {
        const height = element.offsetHeight;
        if (height !== itemHeights.get(index)) {
          newHeights.set(index, height);
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      setItemHeights(newHeights);
    }
  });

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  const visibleItems = useMemo(() => {
    const result: Array<{ item: T; index: number; top: number }> = [];

    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      result.push({
        item: items[i],
        index: i,
        top: itemPositions.positions[i],
      });
    }

    return result;
  }, [items, visibleRange, itemPositions]);

  return (
    <div
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: itemPositions.totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, top }) => (
          <div
            key={getItemKey(item, index)}
            ref={(el) => {
              if (el) {
                itemRefs.current.set(index, el);
              } else {
                itemRefs.current.delete(index);
              }
            }}
            style={{
              position: 'absolute',
              top,
              left: 0,
              right: 0,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// Optimized project list with virtual scrolling
interface VirtualizedProjectListProps {
  projects: Array<{
    id: number;
    name: string;
    description?: string;
    device_type?: string;
    status: string;
  }>;
  onSelectProject?: (project: any) => void;
  onEditProject?: (project: any) => void;
  containerHeight?: number;
  itemHeight?: number;
  className?: string;
}

export const VirtualizedProjectList = memo(({
  projects,
  onSelectProject,
  onEditProject,
  containerHeight = 600,
  itemHeight = 120,
  className,
}: VirtualizedProjectListProps) => {
  const renderProject = useCallback(
    (project: any, index: number) => (
      <div
        className="flex items-center justify-between p-4 border-b hover:bg-muted/50 cursor-pointer"
        onClick={() => onSelectProject?.(project)}
      >
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{project.name}</h3>
          {project.description && (
            <p className="text-sm text-muted-foreground truncate">
              {project.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            {project.device_type && (
              <span className="text-xs bg-secondary px-2 py-1 rounded">
                {project.device_type}
              </span>
            )}
            <span
              className={cn(
                'text-xs px-2 py-1 rounded',
                project.status === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : project.status === 'in_progress'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
              )}
            >
              {project.status}
            </span>
          </div>
        </div>
        {onEditProject && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditProject(project);
            }}
            className="ml-4 px-3 py-1 text-sm border rounded hover:bg-muted"
          >
            Edit
          </button>
        )}
      </div>
    ),
    [onSelectProject, onEditProject]
  );

  // Use regular rendering for small lists to avoid complexity
  if (projects.length <= 50) {
    return (
      <div className={cn('border rounded-lg', className)}>
        {projects.map((project, index) => (
          <div key={project.id}>{renderProject(project, index)}</div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('border rounded-lg', className)}>
      <VirtualScrollContainer
        items={projects}
        itemHeight={itemHeight}
        containerHeight={containerHeight}
        renderItem={renderProject}
        getItemKey={(project) => project.id}
      />
    </div>
  );
});

// Hook for dynamic virtual scrolling configuration
export function useVirtualScrollConfig(itemCount: number) {
  return useMemo(() => {
    // Adjust configuration based on item count and device capabilities
    const isLargeDataset = itemCount > 1000;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    return {
      shouldUseVirtualScrolling: itemCount > (isMobile ? 20 : 50),
      itemHeight: isMobile ? 100 : 120,
      containerHeight: isMobile ? 400 : 600,
      overscan: isLargeDataset ? 3 : 5,
      pageSize: isMobile ? 10 : 20,
    };
  }, [itemCount]);
}

// Performance monitoring for virtual scrolling
export function useVirtualScrollPerformance(componentName: string) {
  const renderCountRef = useRef(0);
  const lastRenderTime = useRef(Date.now());

  useEffect(() => {
    renderCountRef.current++;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    lastRenderTime.current = now;

    // Log performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`${componentName} Virtual Scroll Performance:`, {
        renderCount: renderCountRef.current,
        timeSinceLastRender,
        timestamp: now,
      });
    }

    // Record performance metric
    if (typeof window !== 'undefined' && window.performance) {
      window.performance.mark(`${componentName}-virtual-scroll-render`);
    }
  });

  return {
    renderCount: renderCountRef.current,
    resetMetrics: () => {
      renderCountRef.current = 0;
      lastRenderTime.current = Date.now();
    },
  };
}
