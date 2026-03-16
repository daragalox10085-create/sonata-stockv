/**
 * 数据获取器基类
 * 提供通用的数据获取功能：缓存、重试、超时、日志
 */

import { apiConfig } from '../../config';
import { DataCache } from '../cache/CacheManager';
import { DataFetcher, FetchOptions, FetchResult } from './types';

// 请求日志
interface RequestLog {
  timestamp: string;
  url: string;
  duration: number;
  success: boolean;
  error?: string;
}

export abstract class BaseDataFetcher implements DataFetcher {
  abstract readonly sourceName: string;
  abstract readonly priority: number;
  protected abstract readonly baseUrl: string;
  protected abstract readonly timeout: number;
  protected abstract readonly retryCount: number;
  protected abstract readonly retryDelay: number;

  private requestLogs: RequestLog[] = [];
  private cache: DataCache | null = null;

  constructor(cache?: DataCache) {
    if (cache) {
      this.cache = cache;
    }
  }

  get isAvailable(): boolean {
    return true;
  }

  /**
   * 设置缓存实例
   */
  setCache(cache: DataCache): void {
    this.cache = cache;
  }

  /**
   * 生成缓存键
   */
  protected generateCacheKey(operation: string, ...params: string[]): string {
    return `${this.sourceName}:${operation}:${params.join(':')}`;
  }

  /**
   * 从缓存获取数据
   */
  protected getFromCache<T>(key: string): T | null {
    if (!this.cache || !apiConfig.cache.enabled) return null;
    return this.cache.get<T>(key);
  }

  /**
   * 保存数据到缓存
   */
  protected setCache<T>(key: string, value: T, ttl?: number): void {
    if (!this.cache || !apiConfig.cache.enabled) return;
    this.cache.set(key, value, ttl || apiConfig.cache.ttl);
  }

  /**
   * 执行HTTP请求（带超时和重试）
   */
  protected async fetchWithRetry<T>(
    url: string,
    options: FetchOptions = {}
  ): Promise<FetchResult<T>> {
    const timeout = options.timeout || this.timeout;
    const retryCount = options.retryCount || this.retryCount;
    const retryDelay = options.retryDelay || this.retryDelay;

    const startTime = Date.now();
    let lastError: string | null = null;

    for (let attempt = 0; attempt < retryCount; attempt++) {
      try {
        const result = await this.executeFetch<T>(url, timeout);
        const duration = Date.now() - startTime;
        
        this.logRequest({
          timestamp: new Date().toISOString(),
          url,
          duration,
          success: result.success,
          error: result.error,
        });

        return { ...result, duration };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        
        if (attempt < retryCount - 1) {
          await this.delay(retryDelay * (attempt + 1));
        }
      }
    }

    const duration = Date.now() - startTime;
    this.logRequest({
      timestamp: new Date().toISOString(),
      url,
      duration,
      success: false,
      error: lastError,
    });

    return {
      success: false,
      data: null,
      error: `Failed after ${retryCount} attempts: ${lastError}`,
      source: this.sourceName,
      timestamp: new Date().toISOString(),
      duration,
    };
  }

  /**
   * 执行单个HTTP请求
   */
  private async executeFetch<T>(url: string, timeout: number): Promise<FetchResult<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json, text/plain, */*',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      let data: any;

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      return {
        success: true,
        data,
        error: null,
        source: this.sourceName,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * 延迟函数
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 记录请求日志
   */
  private logRequest(log: RequestLog): void {
    if (!apiConfig.logging.enabled) return;

    this.requestLogs.push(log);

    // 保持日志数量在限制内
    if (this.requestLogs.length > apiConfig.logging.maxLogs) {
      this.requestLogs.shift();
    }

    // 开发环境输出日志
    if (apiConfig.logging.logLevel === 'debug') {
      const status = log.success ? '✅' : '❌';
      console.log(`${status} [${this.sourceName}] ${log.url} - ${log.duration}ms`);
      if (log.error) {
        console.error(`   Error: ${log.error}`);
      }
    }
  }

  /**
   * 获取请求日志
   */
  getRequestLogs(): RequestLog[] {
    return [...this.requestLogs];
  }

  /**
   * 清除请求日志
   */
  clearRequestLogs(): void {
    this.requestLogs = [];
  }

  // 抽象方法 - 子类必须实现
  abstract fetchStockQuote(symbol: string, options?: FetchOptions): Promise<FetchResult<any>>;
  abstract fetchKLineData(symbol: string, timeframe: string, days: number, options?: FetchOptions): Promise<FetchResult<any[]>>;
  abstract fetchSectorList(options?: FetchOptions): Promise<FetchResult<any[]>>;
  abstract fetchSectorConstituents(sectorCode: string, options?: FetchOptions): Promise<FetchResult<any[]>>;
  abstract testConnection(): Promise<boolean>;
}
