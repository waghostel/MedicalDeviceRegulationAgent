/**
 * Lazy Loading Image Component with performance optimizations
 */

import { useState, useRef, memo, useCallback } from 'react';
import { useIntersectionObserver } from '@/lib/performance/optimization';
import { cn } from '@/lib/utils';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  fallback?: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
}

export const LazyImage = memo(function LazyImage({
  src,
  alt,
  className,
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxvYWRpbmcuLi48L3RleHQ+PC9zdmc+',
  fallback = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4=',
  width,
  height,
  loading = 'lazy',
  onLoad,
  onError,
}: LazyImageProps) {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>(
    'loading'
  );
  const [imageSrc, setImageSrc] = useState(placeholder);
  const imgRef = useRef<HTMLImageElement>(null);

  const { isIntersecting, hasIntersected } = useIntersectionObserver(imgRef, {
    threshold: 0.1,
    rootMargin: '50px',
  });

  const handleLoad = useCallback(() => {
    setImageState('loaded');
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setImageState('error');
    setImageSrc(fallback);
    onError?.();
  }, [fallback, onError]);

  // Load image when it comes into view
  useState(() => {
    if (
      hasIntersected &&
      imageState === 'loading' &&
      imageSrc === placeholder
    ) {
      setImageSrc(src);
    }
  }, [hasIntersected, imageState, imageSrc, placeholder, src]);

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={cn(
        'transition-opacity duration-300',
        imageState === 'loading' && 'opacity-50',
        imageState === 'loaded' && 'opacity-100',
        imageState === 'error' && 'opacity-75',
        className
      )}
      width={width}
      height={height}
      loading={loading}
      onLoad={handleLoad}
      onError={handleError}
      decoding="async"
    />
  );
});

/**
 * Lazy loading background image component
 */
interface LazyBackgroundImageProps {
  src: string;
  className?: string;
  children?: React.ReactNode;
  placeholder?: string;
  fallback?: string;
}

export const LazyBackgroundImage = memo(function LazyBackgroundImage({
  src,
  className,
  children,
  placeholder = 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  fallback = 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
}: LazyBackgroundImageProps) {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>(
    'loading'
  );
  const [backgroundImage, setBackgroundImage] = useState(placeholder);
  const divRef = useRef<HTMLDivElement>(null);

  const { hasIntersected } = useIntersectionObserver(divRef, {
    threshold: 0.1,
    rootMargin: '50px',
  });

  useState(() => {
    if (hasIntersected && imageState === 'loading') {
      const img = new Image();
      img.onload = () => {
        setImageState('loaded');
        setBackgroundImage(`url(${src})`);
      };
      img.onerror = () => {
        setImageState('error');
        setBackgroundImage(fallback);
      };
      img.src = src;
    }
  }, [hasIntersected, imageState, src, fallback]);

  return (
    <div
      ref={divRef}
      className={cn(
        'transition-all duration-500 bg-cover bg-center bg-no-repeat',
        imageState === 'loading' && 'animate-pulse',
        className
      )}
      style={{ backgroundImage }}
    >
      {children}
    </div>
  );
});

/**
 * Progressive image loading with blur effect
 */
interface ProgressiveImageProps {
  src: string;
  lowQualitySrc?: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
}

export const ProgressiveImage = memo(function ProgressiveImage({
  src,
  lowQualitySrc,
  alt,
  className,
  width,
  height,
}: ProgressiveImageProps) {
  const [imageState, setImageState] = useState<'loading' | 'loaded'>('loading');
  const imgRef = useRef<HTMLImageElement>(null);

  const { hasIntersected } = useIntersectionObserver(imgRef, {
    threshold: 0.1,
    rootMargin: '50px',
  });

  useState(() => {
    if (hasIntersected && imageState === 'loading') {
      const img = new Image();
      img.onload = () => setImageState('loaded');
      img.src = src;
    }
  }, [hasIntersected, imageState, src]);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Low quality placeholder */}
      {lowQualitySrc && imageState === 'loading' && (
        <img
          src={lowQualitySrc}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-110"
          width={width}
          height={height}
        />
      )}

      {/* High quality image */}
      <img
        ref={imgRef}
        src={hasIntersected ? src : undefined}
        alt={alt}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-500',
          imageState === 'loaded' ? 'opacity-100' : 'opacity-0'
        )}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
      />

      {/* Loading indicator */}
      {imageState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
});
