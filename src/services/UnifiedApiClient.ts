/**
 * UnifiedApiClient - 统一化 Sonata API 接口
 * 
 * 统一调用 eastmoney/quote, eastmoney/kline, tencent/quote
 * 统一响应格式: { success: boolean, data: any, error?: string }
 * 统一错误处理: 超时、网络错误、API 错误
 * 
 * @module services/UnifiedApiClient
 * @version 1.0.0
 */

import { EastmoneyDataFetcher } from './data-fetchers/eastmoney.fetcher';
import { TencentDataFetcher } from './data-fetchers/tencent.fetcher';
import { StockQuote, KLinePoint } from '../types/DataContract';
import { DataCache } from './cache/CacheManager';

// ============================================================================
// 类型定义
// ============================================================================

/** API 数据源类型 */
export type ApiSource = 'eastmoney' | 'tencent' | 'auto';

/** 统一响应格式 */
export interface UnifiedResponse<T> {
  success: boolean;
  data: T | null;
  error?: string;
  source?: ApiSource;
  duration?: number;
  timestamp: string;
}

/** 请求配置选项 */
export interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  useCache?: boolean;
  cacheTtl?: number;
  source?: ApiSource;
}

/** K线请求参数 */
export interface KLineParams {
  symbol: string;
  timeframe?: string;
  days?: number;
}

/** 错误类型枚举 */
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  API_ERROR = 'API_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  PARAM_ERROR = 'PARAM_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/** API 错误类 */
export class ApiError extends Error {
  public readonly type: ErrorType;
  public readonly originalError?: unknown;

  constructor(message: string, type: ErrorType = ErrorType.UNKNOWN_ERROR, originalError?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
    this.originalError = originalError;
  }

  static network(message: string, originalError?: unknown): ApiError {
    return new ApiError(message, ErrorType.NETWORK_ERROR, originalError);
  }
  static timeout(message: string, originalError?: unknown): ApiError {
    return new ApiError(message, ErrorType.TIMEOUT_ERROR, originalError);
  }
  static api(message: string, originalError?: unknown): ApiError {
    return new ApiError(message, ErrorType.API_ERROR, originalError);
  }
  static parse(message: string, originalError?: unknown): ApiError {
    return new ApiError(message, ErrorType.PARSE_ERROR, originalError);
  }
  static param(message: string, originalError?: unknown): ApiError {
    return new ApiError(message, ErrorType.PARAM_ERROR, originalError);
  }
}

// ============================================================================
// UnifiedApiClient 类
// ============================================================================

export class UnifiedApiClient {
  private eastmoneyFetcher: EastmoneyDataFetcher;
  private tencentFetcher: TencentDataFetcher;
  private cache?: DataCache;

  private defaultConfig: RequestConfig = {
    timeout: 10000,
    retries: 3,
    retryDelay: 1000,
    useCache: true,
    cacheTtl: 30000,
    source: 'auto',
  };

  constructor(cache?: DataCache) {
    this.eastmoneyFetcher = new EastmoneyDataFetcher(cache);
    this.tencentFetcher = new TencentDataFetcher(cache);
    this.cache = cache;
  }

  setCache(cache: DataCache): void {
    this.cache = cache;
    this.eastmoneyFetcher.setCache(cache);
    this.tencentFetcher.setCache(cache);
  }

  setDefaultConfig(config: Partial<RequestConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  getDefaultConfig(): RequestConfig {
    return { ...this.defaultConfig };
  }

  // ============================================================================
  // 核心 API 方法
  // ============================================================================

  /**
   * 获取股票实时行情 (eastmoney/quote, tencent/quote)
   * 统一响应: { success: boolean, data: StockQuote, error?: string }
   */
  async getQuote(symbol: string, config: RequestConfig = {}): Promise<UnifiedResponse<StockQuote>> {
    const startTime = Date.now();
    const options = this.mergeConfig(config);

    try {
      // 参数验证
      if (!symbol || typeof symbol !== 'string') {
        throw ApiError.param('Stock symbol is required');
      }
      const cleanSymbol = symbol.trim();
      if (!/^[0-9]{6}$/.test(cleanSymbol)) {
        throw ApiError.param(`Invalid symbol: ${symbol}. Expected 6-digit code.`);
      }

      const fetcher = this.selectFetcher(options.source);
      const result = await fetcher.fetchStockQuote(cleanSymbol, {
        timeout: options.timeout,
        retryCount: options.retries,
        retryDelay: options.retryDelay,
        useCache: options.useCache,
      });

      const duration = Date.now() - startTime;

      if (result.success && result.data) {
        return {
          success: true,
          data: result.data,
          source: result.source as ApiSource,
          duration,
          timestamp: new Date().toISOString(),
        };
      }

      // auto 模式下尝试备用数据源
      if (options.source === 'auto') {
        const fallbackFetcher = fetcher === this.eastmoneyFetcher ? this.tencentFetcher : this.eastmoneyFetcher;
        const fallbackResult = await fallbackFetcher.fetchStockQuote(cleanSymbol, {
          timeout: options.timeout,
          retryCount: 1,
          useCache: options.useCache,
        });

        if (fallbackResult.success && fallbackResult.data) {
          return {
            success: true,
            data: fallbackResult.data,
            source: fallbackResult.source as ApiSource,
            duration: Date.now() - startTime,
            timestamp: new Date().toISOString(),
          };
        }
      }

      return {
        success: false,
        data: null,
        error: result.error || 'Unknown error',
        source: result.source as ApiSource,
        duration,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return this.handleError(error, options, startTime);
    }
  }

  /**
   * 获取K线数据 (eastmoney/kline)
   * 统一响应: { success: boolean, data: KLinePoint[], error?: string }
   */
  async getKLine(params: KLineParams, config: RequestConfig = {}): Promise<UnifiedResponse<KLinePoint[]>> {
    const startTime = Date.now();
    const options = this.mergeConfig(config);

    try {
      const { symbol, timeframe = '101', days = 30 } = params;
      
      if (!symbol || typeof symbol !== 'string') {
        throw ApiError.param('Stock symbol is required');
      }
      const cleanSymbol = symbol.trim();
      if (!/^[0-9]{6}$/.test(cleanSymbol)) {
        throw ApiError.param(`Invalid symbol: ${symbol}`);
      }

      const result = await this.eastmoneyFetcher.fetchKLineData(
        cleanSymbol,
        timeframe,
        days,
        {
          timeout: options.timeout,
          retryCount: options.retries,
          retryDelay: options.retryDelay,
          useCache: options.useCache,
        }
      );

      const duration = Date.now() - startTime;

      if (result.success && result.data) {
        return {
          success: true,
          data: result.data,
          source: 'eastmoney',
          duration,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: false,
        data: null,
        error: result.error || 'Failed to fetch K-line data',
        source: 'eastmoney',
        duration,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return this.handleError(error, options, startTime);
    }
  }

  /**
   * 批量获取股票行情
   * 统一响应: { success: boolean, data: Map<symbol, StockQuote>, error?: string }
   */
  async getBatchQuotes(
    symbols: string[],
    config: RequestConfig = {}
  ): Promise<UnifiedResponse<Map<string, StockQuote>>> {
    const startTime = Date.now();
    const options = this.mergeConfig(config);

    try {
      if (!Array.isArray(symbols) || symbols.length === 0) {
        throw ApiError.param('Symbols must be non-empty array');
      }

      const results = new Map<string, StockQuote>();
      const errors: string[] = [];

      for (const symbol of symbols) {
        const response = await this.getQuote(symbol, { ...options, source: config.source });
        if (response.success && response.data) {
          results.set(symbol, response.data);
        } else {
          errors.push(`${symbol}: ${response.error}`);
        }
      }

      const duration = Date.now() - startTime;

      if (results.size === 0) {
        return {
          success: false,
          data: null,
          error: `All failed: ${errors.join('; ')}`,
          duration,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: true,
        data: results,
        error: errors.length > 0 ? `Partial: ${errors.join('; ')}` : undefined,
        duration,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return this.handleError(error, options, startTime);
    }
  }

  async testConnection(source: ApiSource = 'auto'): Promise<boolean> {
    try {
      if (source === 'eastmoney' || source === 'auto') {
        return await this.eastmoneyFetcher.testConnection();
      }
      if (source === 'tencent') {
        return await this.tencentFetcher.testConnection();
      }
      return false;
    } catch {
      return false;
    }
  }

  async getDataSourceStatus(): Promise<{ eastmoney: boolean; tencent: boolean }> {
    const [eastmoney, tencent] = await Promise.all([
      this.eastmoneyFetcher.testConnection(),
      this.tencentFetcher.testConnection(),
    ]);
    return { eastmoney, tencent };
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  private mergeConfig(config: RequestConfig): Required<RequestConfig> {
    return {
      timeout: config.timeout ?? this.defaultConfig.timeout ?? 10000,
      retries: config.retries ?? this.defaultConfig.retries ?? 3,
      retryDelay: config.retryDelay ?? this.defaultConfig.retryDelay ?? 1000,
      useCache: config.useCache ?? this.defaultConfig.useCache ?? true,
      cacheTtl: config.cacheTtl ?? this.defaultConfig.cacheTtl ?? 30000,
      source: config.source ?? this.defaultConfig.source ?? 'auto',
    };
  }

  private selectFetcher(source: ApiSource): EastmoneyDataFetcher | TencentDataFetcher {
    switch (source) {
      case 'eastmoney':
        return this.eastmoneyFetcher;
      case 'tencent':
        return this.tencentFetcher;
      case 'auto':
      default:
        return this.eastmoneyFetcher;
    }
  }

  private normalizeError(error: unknown): ApiError {
    if (error instanceof ApiError) return error;
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('timeout') || msg.includes('abort')) {
        return ApiError.timeout(error.message, error);
      }
      if (msg.includes('network') || msg.includes('fetch') || msg.includes('connection')) {
        return ApiError.network(error.message, error);
      }
      if (msg.includes('parse') || msg.includes('json')) {
        return ApiError.parse(error.message, error);
      }
      if (msg.includes('param') || msg.includes('invalid')) {
        return ApiError.param(error.message, error);
      }
      return ApiError.api(error.message, error);
    }
    return ApiError.api(String(error), error);
  }

  private handleError(
    error: unknown,
    options: Required<RequestConfig>,
    startTime: number
  ): UnifiedResponse<null> {
    const duration = Date.now() - startTime;
    const apiError = this.normalizeError(error);
    return {
      success: false,
      data: null,
      error: apiError.message,
      source: options.source === 'auto' ? undefined : options.source,
      duration,
      timestamp: new Date().toISOString(),
    };
  }
}

// ============================================================================
// 单例导出
// ============================================================================

let defaultClient: UnifiedApiClient | null = null;

export function getDefaultClient(): UnifiedApiClient {
  if (!defaultClient) {
    defaultClient = new UnifiedApiClient();
  }
  return defaultClient;
}

export function resetDefaultClient(): void {
  defaultClient = null;
}

export default UnifiedApiClient;