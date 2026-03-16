/**
 * 缓存管理器
 * 提供内存缓存功能，支持TTL和LRU淘汰策略
 */

import { apiConfig } from '../../config';

// 缓存项接口
interface CacheItem<T> {
  value: T;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
}

// 缓存配置
export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
  checkInterval?: number;
}

// 缓存统计
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

// 数据缓存接口
export interface DataCache {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttl?: number): void;
  delete(key: string): void;
  clear(): void;
  has(key: string): boolean;
  getStats(): CacheStats;
}

/**
 * 内存缓存管理器
 */
export class MemoryCacheManager implements DataCache {
  private cache: Map<string, CacheItem<any>> = new Map();
  private stats = { hits: 0, misses: 0 };
  private config: CacheConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      enabled: apiConfig.cache.enabled,
      ttl: apiConfig.cache.ttl,
      maxSize: apiConfig.cache.maxSize,
      checkInterval: 60000, // 1分钟检查一次
      ...config,
    };

    if (this.config.enabled) {
      this.startCleanup();
    }
  }

  /**
   * 获取缓存值
   */
  get<T>(key: string): T | null {
    if (!this.config.enabled) return null;

    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }

    // 检查是否过期
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // 更新访问信息
    item.accessCount++;
    item.lastAccessed = Date.now();
    
    this.stats.hits++;
    return item.value as T;
  }

  /**
   * 设置缓存值
   */
  set<T>(key: string, value: T, ttl?: number): void {
    if (!this.config.enabled) return;

    // 检查是否需要淘汰
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    const effectiveTtl = ttl || this.config.ttl;
    
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + effectiveTtl,
      accessCount: 1,
      lastAccessed: Date.now(),
    });
  }

  /**
   * 删除缓存项
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * 检查是否存在
   */
  has(key: string): boolean {
    if (!this.config.enabled) return false;

    const item = this.cache.get(key);
    if (!item) return false;

    // 检查是否过期
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 获取统计信息
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0,
    };
  }

  /**
   * 获取所有键
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * LRU淘汰策略
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * 清理过期项
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 启动定时清理
   */
  private startCleanup(): void {
    if (this.cleanupInterval) return;
    
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.checkInterval);
  }

  /**
   * 停止定时清理
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * 销毁缓存管理器
   */
  destroy(): void {
    this.stopCleanup();
    this.clear();
  }
}

// 单例实例
let globalCacheManager: MemoryCacheManager | null = null;

/**
 * 获取全局缓存管理器
 */
export function getCacheManager(): MemoryCacheManager {
  if (!globalCacheManager) {
    globalCacheManager = new MemoryCacheManager();
  }
  return globalCacheManager;
}

/**
 * 重置全局缓存管理器
 */
export function resetCacheManager(): void {
  if (globalCacheManager) {
    globalCacheManager.destroy();
    globalCacheManager = null;
  }
}

// 导出默认实例
export const cacheManager = getCacheManager();
