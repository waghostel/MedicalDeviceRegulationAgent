/**
 * Lazy Loading Components and Utilities
 *
 * Provides components and hooks for implementing lazy loading of images,
 * components, and data to improve initial page load performance.
 */

import React, {
  Suspense,
  lazy,
  useState,
  useEffect,
  useRef,
  useCallback,
  memo,
  ComponentType,
} from 'react';
import { useIntersectionObserver } from '@/lib/performance/optimization';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Lazy Image Component with intersection observer
interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  fallback?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const LazyImage = memo(function LazyImage({
  src,
  alt,
  placeholder,
  fallback,
  threshold = 0.1,
  rootMargin = '50px',
  onLoad,
  onError,
  className,
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | undefined>(placeholder);
  const imgRef = useRef<HTMLImageElement>(null);

  const { isIntersecting, hasIntersected } = useIntersectionObserver(imgRef, {
    threshold,
    rootMargin,
  });

  useEffect(() => {
    if (hasIntersected && !imageSrc && !hasError) {
      setImageSrc(src);
    }
  }, [hasIntersected, src, imageSrc, hasError]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  if (hasError && fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {!isLoaded && <Skeleton className="absolute inset-0 w-full h-full" />}
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        {...props}
      />
    </div>
  );
});

// Lazy Component Wrapper
interface LazyComponentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
  delay?: number;
}

export const LazyComponent = memo(function LazyComponent({
  children,
  fallback = <Skeleton className="w-full h-32" />,
  threshold = 0.1,
  rootMargin = '100px',
  delay = 0,
}: LazyComponentProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { hasIntersected } = useIntersectionObserver(containerRef, {
    threshold,
    rootMargin,
  });

  useEffect(() => {
    if (hasIntersected) {
      if (delay > 0) {
        const timer = setTimeout(() => setShouldRender(true), delay);
        return () => clearTimeout(timer);
      } else {
        setShouldRender(true);
      }
    }
  }, [hasIntersected, delay]);

  return <div ref={containerRef}>{shouldRender ? children : fallback}</div>;
});

// Higher-order component for lazy loading
export function withLazyLoading<P extends object>(
  Component: ComponentType<P>,
  fallback?: React.ReactNode
) {
  const LazyWrappedComponent = memo((props: P) => (
    <LazyComponent fallback={fallback}>
      <Component {...props} />
    </LazyComponent>
  ));

  LazyWrappedComponent.displayName = `withLazyLoading(${Component.displayName || Component.name})`;

  return LazyWrappedComponent;
}

// Lazy loading for data fetching
interface LazyDataProps<T> {
  fetchData: () => Promise<T>;
  children: (data: T) => React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: (error: Error) => React.ReactNode;
  threshold?: number;
  rootMargin?: string;
}

export function LazyData<T>({
  fetchData,
  children,
  fallback = <Skeleton className="w-full h-32" />,
  errorFallback,
  threshold = 0.1,
  rootMargin = '100px',
}: LazyDataProps<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { hasIntersected } = useIntersectionObserver(containerRef, {
    threshold,
    rootMargin,
  });

  useEffect(() => {
    if (hasIntersected && !data && !loading && !error) {
      setLoading(true);
      fetchData()
        .then(setData)
        .catch(setError)
        .finally(() => setLoading(false));
    }
  }, [hasIntersected, data, loading, error, fetchData]);

  return (
    <div ref={containerRef}>
      {error && errorFallback
        ? errorFallback(error)
        : loading || !data
          ? fallback
          : children(data)}
    </div>
  );
}

// Lazy loading for route-based code splitting
export function createLazyRoute<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  fallback?: React.ReactNode
) {
  const LazyRouteComponent = lazy(importFn);

  return memo((props: P) => (
    <Suspense fallback={fallback || <div>Loading...</div>}>
      <LazyRouteComponent {...props} />
    </Suspense>
  ));
}

// Preload utilities for better UX
export class PreloadManager {
  private static preloadedComponents = new Set<string>();
  private static preloadedImages = new Set<string>();

  static preloadComponent(importFn: () => Promise<any>, key: string) {
    if (!this.preloadedComponents.has(key)) {
      this.preloadedComponents.add(key);
      importFn().catch(console.error);
    }
  }

  static preloadImage(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.preloadedImages.has(src)) {
        resolve();
        return;
      }

      const img = new Image();
      img.onload = () => {
        this.preloadedImages.add(src);
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  static preloadImages(srcs: string[]): Promise<void[]> {
    return Promise.all(srcs.map((src) => this.preloadImage(src)));
  }
}

// Hook for preloading on hover
export function usePreloadOnHover<T>(
  preloadFn: () => Promise<T>,
  delay: number = 100
) {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      preloadFn().catch(console.error);
    }, delay);
  }, [preloadFn, delay]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { handleMouseEnter, handleMouseLeave };
}

// Lazy loading for large lists with pagination
interface LazyListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  pageSize?: number;
  loadingComponent?: React.ReactNode;
  hasMore?: boolean;
  onLoadMore?: () => void;
  className?: string;
}

export function LazyList<T>({
  items,
  renderItem,
  pageSize = 20,
  loadingComponent = <Skeleton className="w-full h-16" />,
  hasMore = false,
  onLoadMore,
  className,
}: LazyListProps<T>) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { hasIntersected } = useIntersectionObserver(loadMoreRef, {
    threshold: 0.1,
    rootMargin: '100px',
  });

  useEffect(() => {
    if (hasIntersected && visibleCount < items.length) {
      setVisibleCount((prev) => Math.min(prev + pageSize, items.length));
    }
  }, [hasIntersected, visibleCount, items.length, pageSize]);

  useEffect(() => {
    if (hasIntersected && hasMore && onLoadMore) {
      onLoadMore();
    }
  }, [hasIntersected, hasMore, onLoadMore]);

  const visibleItems = items.slice(0, visibleCount);

  return (
    <div className={className}>
      {visibleItems.map((item, index) => (
        <div key={index}>{renderItem(item, index)}</div>
      ))}

      {(visibleCount < items.length || hasMore) && (
        <div ref={loadMoreRef} className="py-4">
          {loadingComponent}
        </div>
      )}
    </div>
  );
}

// Example usage components
export const LazyProjectCard = withLazyLoading(
  ({ project }: { project: any }) => (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-semibold">{project.name}</h3>
        <p className="text-sm text-muted-foreground">{project.description}</p>
      </CardContent>
    </Card>
  ),
  <Skeleton className="w-full h-32" />
);

export const LazyChart = memo(function LazyChart({
  data,
  type = 'line',
}: {
  data: any[];
  type?: string;
}) {
  return (
    <LazyComponent fallback={<Skeleton className="w-full h-64" />}>
      <div className="w-full h-64 flex items-center justify-center border rounded">
        <p>
          Chart Component ({type}) - {data.length} data points
        </p>
      </div>
    </LazyComponent>
  );
});
