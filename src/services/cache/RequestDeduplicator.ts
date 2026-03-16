/**
 * 请求去重器
 * 防止重复请求相同的数据
 */

import { apiConfig } from '../../config';

// 进行中的请求
interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

// 去重配置
export interface DeduplicatorConfig {
  enabled: boolean;
  windowMs: number;
}

/**
 * 请求去重器
 */
export class RequestDeduplicator {
  private pendingRequests: Map<string, PendingRequest<any>> = new Map();
  private config: DeduplicatorConfig;

  constructor(config?: Partial<DeduplicatorConfig>) {
    this.config = {
      enabled: true,
      windowMs: 5000, // 5秒窗口
      ...config,
    };
  }

  /**
   * 执行请求（自动去重）
   */
  async execute<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (!this.config.enabled) {
      return requestFn();
    }

    // 检查是否有进行中的相同请求
    const pending = this.pendingRequests.get(key);
    if (pending && Date.now() - pending.timestamp < this.config.windowMs) {
      return pending.promise as Promise<T>;
    }

    // 创建新请求
    const promise = requestFn().finally(() => {
      // 请求完成后清理
      setTimeout(() => {
        this.pendingRequests.delete(key);
      }, this.config.windowMs);
    });

    // 保存进行中的请求
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });

    return promise;
  }

  /**
   * 检查是否有进行中的请求
   */
  hasPending(key: string): boolean {
    const pending = this.pendingRequests.get(key);
    if (!pending) return false;
    
    // 检查是否过期
    if (Date.now() - pending.timestamp > this.config.windowMs) {
      this.pendingRequests.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 取消进行中的请求
   */
  cancel(key: string): void {
    this.pendingRequests.delete(key);
  }

  /**
   * 清空所有进行中的请求
   */
  clear(): void {
    this.pendingRequests.clear();
  }

  /**
   * 获取进行中的请求数量
   */
  getPendingCount(): number {
    // 清理过期的请求
    const now = Date.now();
    for (const [key, pending] of this.pendingRequests.entries()) {
      if (now - pending.timestamp > this.config.windowMs) {
        this.pendingRequests.delete(key);
      }
    }
    
    return this.pendingRequests.size;
  }

  /**
   * 生成请求键
   */
  static generateKey(...parts: string[]): string {
    return parts.join(':');
  }
}

// 单例实例
let globalDeduplicator: RequestDeduplicator | null = null;

/**
 * 获取全局请求去重器
 */
export function getRequestDeduplicator(): RequestDeduplicator {
  if (!globalDeduplicator) {
    globalDeduplicator = new RequestDeduplicator({
      enabled: true,
      windowMs: 5000,
    });
  }
  return globalDeduplicator;
}

/**
 * 重置全局请求去重器
 */
export function resetRequestDeduplicator(): void {
  if (globalDeduplicator) {
    globalDeduplicator.clear();
    globalDeduplicator = null;
  }
}

// 导出默认实例
export const requestDeduplicator = getRequestDeduplicator();
