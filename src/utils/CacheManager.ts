// Phase 3: Advanced Caching Strategy
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxItems?: number; // Maximum number of items to cache
}

class CacheManager {
  private static instance: CacheManager;
  private memoryCache = new Map<string, CacheItem<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes
  private readonly defaultMaxItems = 100;

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  // Set data with automatic expiration
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const ttl = options.ttl || this.defaultTTL;
    const maxItems = options.maxItems || this.defaultMaxItems;

    // Clean up expired items first
    this.cleanup();

    // If we're at capacity, remove oldest item
    if (this.memoryCache.size >= maxItems) {
      const oldestKey = this.memoryCache.keys().next().value as string | undefined;
      if (oldestKey) this.memoryCache.delete(oldestKey);
    }

    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl
    };

    // Store in memory
    this.memoryCache.set(key, item);

    // Store in localStorage for persistence
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify(item));
    } catch (error) {
      // Silent fail for localStorage errors in production
    }
  }

  // Get data with automatic expiration check
  get<T>(key: string): T | null {
    // Check memory cache first
    const memoryItem = this.memoryCache.get(key);
    if (memoryItem && !this.isExpired(memoryItem)) {
      return memoryItem.data as T;
    }

    // Check localStorage cache
    try {
      const stored = localStorage.getItem(`cache_${key}`);
      if (stored) {
        const item: CacheItem<T> = JSON.parse(stored);
        
        if (!this.isExpired(item)) {
          // Restore to memory cache
          this.memoryCache.set(key, item);
          return item.data;
        } else {
          // Remove expired item
          localStorage.removeItem(`cache_${key}`);
        }
      }
    } catch (error) {
      // Silent fail for localStorage errors in production
    }

    return null;
  }

  // Check if item exists and is not expired
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  // Remove specific item
  delete(key: string): void {
    this.memoryCache.delete(key);
    try {
      localStorage.removeItem(`cache_${key}`);
    } catch (error) {
      // Silent fail for localStorage errors in production
    }
  }

  // Clear all cache
  clear(): void {
    this.memoryCache.clear();
    
    // Clear localStorage cache
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      // Silent fail for localStorage errors in production
    }
  }

  // Clean up expired items
  private cleanup(): void {
    for (const [key, item] of this.memoryCache) {
      if (this.isExpired(item)) {
        this.memoryCache.delete(key);
        try {
          localStorage.removeItem(`cache_${key}`);
        } catch (error) {
          // Silent fail for localStorage errors in production
        }
      }
    }
  }

  // Check if cache item is expired
  private isExpired(item: CacheItem<any>): boolean {
    return Date.now() - item.timestamp > item.ttl;
  }

  // Get cache statistics
  getStats() {
    return {
      memoryItems: this.memoryCache.size,
      totalSize: new Blob([JSON.stringify([...this.memoryCache.values()])]).size,
      oldestItem: Math.min(...[...this.memoryCache.values()].map(item => item.timestamp)),
      newestItem: Math.max(...[...this.memoryCache.values()].map(item => item.timestamp))
    };
  }
}

export const cacheManager = CacheManager.getInstance();
export default CacheManager;