/**
 * 数据获取模块类型定义
 * 统一的数据获取接口
 */

import { StockQuote, KLinePoint } from '../../types/DataContract';

// 获取选项
export interface FetchOptions {
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  cacheKey?: string;
  useCache?: boolean;
}

// 获取结果
export interface FetchResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  source: string;
  timestamp: string;
  duration?: number;
}

// 数据获取器接口
export interface DataFetcher {
  // 数据源名称
  readonly sourceName: string;
  
  // 数据源优先级（数字越小优先级越高）
  readonly priority: number;
  
  // 是否可用
  readonly isAvailable: boolean;

  /**
   * 获取股票实时行情
   */
  fetchStockQuote(symbol: string, options?: FetchOptions): Promise<FetchResult<StockQuote>>;

  /**
   * 获取K线数据
   */
  fetchKLineData(
    symbol: string,
    timeframe: string,
    days: number,
    options?: FetchOptions
  ): Promise<FetchResult<KLinePoint[]>>;

  /**
   * 获取板块列表
   */
  fetchSectorList(options?: FetchOptions): Promise<FetchResult<any[]>>;

  /**
   * 获取板块成分股
   */
  fetchSectorConstituents(sectorCode: string, options?: FetchOptions): Promise<FetchResult<any[]>>;

  /**
   * 测试连接
   */
  testConnection(): Promise<boolean>;
}

// 批量获取选项
export interface BatchFetchOptions extends FetchOptions {
  concurrency?: number;
  delayBetweenRequests?: number;
}

// 批量获取结果
export interface BatchFetchResult<T> {
  results: Map<string, FetchResult<T>>;
  successCount: number;
  failureCount: number;
  totalDuration: number;
}

// 数据转换器接口
export interface DataTransformer<T, R> {
  transform(data: T): R;
  validate(data: T): boolean;
}

// 缓存接口
export interface DataCache {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttl?: number): void;
  delete(key: string): void;
  clear(): void;
  has(key: string): boolean;
}

// 请求去重选项
export interface DeduplicationOptions {
  enabled?: boolean;
  keyGenerator?: (...args: any[]) => string;
  windowMs?: number;
}

// 防抖节流选项
export interface ThrottleDebounceOptions {
  throttleMs?: number;
  debounceMs?: number;
  leading?: boolean;
  trailing?: boolean;
}
