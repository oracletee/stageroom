/**
 * Performance optimization utilities for the Stageroom
 */

/**
 * Debounce function to limit rate of function calls
 * @param func Function to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return function(this: ThisParameterType<T>, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Throttle function to limit function calls to once per interval
 * @param func Function to throttle
 * @param limit Time limit in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function(this: ThisParameterType<T>, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Request animation frame wrapper for smoother animations
 * @param callback Callback function
 * @returns Animation frame request ID
 */
export function requestAnimationFramePolyfill(callback: FrameRequestCallback): number {
  return window.requestAnimationFrame(callback);
}

/**
 * Cancel animation frame
 * @param requestID Animation frame request ID
 */
export function cancelAnimationFramePolyfill(requestID: number): void {
  window.cancelAnimationFrame(requestID);
}

/**
 * Measure component render performance
 * @param componentName Name of the component
 * @param callback Render function
 * @returns Result of callback and logs timing
 */
export function measureRender<T>(
  componentName: string,
  callback: () => T
): T {
  const start = performance.now();
  const result = callback();
  const end = performance.now();
  
  console.debug(`[Performance] ${componentName} rendered in ${end - start}ms`);
  
  return result;
}

/**
 * Lazy load image with placeholder
 * @param src Image source URL
 * @param placeholder Placeholder URL or color
 * @returns Promise that resolves when image loads
 */
export function lazyLoadImage(
  src: string,
  placeholder: string = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmZmYiLz48L3N2Zz4='
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = reject;
    
    // Set placeholder while loading
    img.src = placeholder;
    
    // Load actual image after a short delay to avoid blocking UI
    setTimeout(() => {
      img.src = src;
    }, 100);
  });
}

/**
 * Virtual scroll helper for large lists
 * @param items Array of items
 * @param visibleCount Number of visible items
 * @param startIndex Starting index
 * @returns Slice of items for virtual scrolling
 */
export function virtualScroll<T>(
  items: T[],
  visibleCount: number,
  startIndex: number
): T[] {
  const endIndex = Math.min(startIndex + visibleCount, items.length);
  return items.slice(startIndex, endIndex);
}

/**
 * Cache function results with TTL
 * @param fn Function to cache
 * @param ttl Time to live in milliseconds
 * @returns Cached function
 */
export function cacheWithTTL<T extends (...args: any[]) => any>(
  fn: T,
  ttl: number
): T {
  const cache = new Map<string, { value: any; expiry: number }>();
  
  return function(this: ThisParameterType<T>, ...args: Parameters<T>) {
    const key = JSON.stringify(args);
    const cached = cache.get(key);
    
    if (cached && Date.now() < cached.expiry) {
      return cached.value;
    }
    
    const result = fn.apply(this, args);
    cache.set(key, {
      value: result,
      expiry: Date.now() + ttl
    });
    
    // Clean up expired entries periodically
    if (cache.size > 100) {
      for (const [key, value] of cache.entries()) {
        if (Date.now() > value.expiry) {
          cache.delete(key);
        }
      }
    }
    
    return result;
  } as T;
}