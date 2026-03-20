/**
 * 统一 API 客户端
 * 封装所有数据源调用，提供统一的接口、错误处理和重试机制
 *
 * @module services/api/client
 * @version 3.0.0
 */

import {
  DataSource,
  ApiRequest,
  ApiResponse,
  RequestOptions,
  ApiError,
  ResponseMeta,
  UnifiedApiConfig,
  ApiLogEntry,
  ApiMetrics,
  DataSourceStatus,
  HttpMethod,
  ApiErrorCode,
} from '../types';

import { defaultConfig, mergeConfig, getEnvironmentConfig, getCacheTtlForEndpoint } from '../config';
import {
  createNetworkError,
  createTimeoutError,
  createHttpError,
  createParseError,
  createUnknownError,
  isRetryableError,
  errorToString,
} from '../errors';

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 生成唯一请求 ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 创建超时信号
 */
function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

/**
 * 从 URL 提取数据源名称
 */
function extractSource(url: string): DataSource {
  if (url.includes('eastmoney')) return DataSource.EASTMONEY;
  if (url.includes('tencent')) return DataSource.TENCENT;
  if (url.includes('sina')) return DataSource.SINA;
  if (url.includes('akshare')) return DataSource.AKSHARE;
  return DataSource.EASTMONEY; // 默认
}

// ============================================================================
// 缓存管理器（简化版）
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl: number): void {
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// ============================================================================
// 日志管理器（简化版）
// ============================================================================

class SimpleLogger {
  private logs: ApiLogEntry[] = [];
  private maxLogs: number;
  private enabled: boolean;
  private level: 'debug' | 'info' | 'warn' | 'error';

  constructor(enabled: boolean, level: 'debug' | 'info' | 'warn' | 'error', maxLogs: number) {
    this.enabled = enabled;
    this.level = level;
    this.maxLogs = maxLogs;
  }

  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    if (!this.enabled) return false;
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.level];
  }

  private addLog(log: ApiLogEntry): void {
    if (!this.shouldLog(log.status === 'success' ? 'info' : 'error')) return;

    this.logs.push(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // 开发环境输出控制台
    if (this.level === 'debug') {
      const status = log.status === 'success' ? '✅' : log.status === 'error' ? '❌' : '⏱️';
      console.log(`${status} [API] ${log.method} ${log.endpoint} - ${log.source} - ${log.duration}ms`);
      if (log.errorMessage) {
        console.error(`   Error: ${log.errorMessage}`);
      }
    }
  }

  logSuccess(
    method: HttpMethod,
    endpoint: string,
    source: DataSource,
    duration: number,
    requestId: string
  ): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      requestId,
      method,
      endpoint,
      source,
      status: 'success',
      duration,
    });
  }

  logError(
    method: HttpMethod,
    endpoint: string,
    source: DataSource,
    duration: number,
    error: ApiError,
    requestId: string
  ): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      requestId,
      method,
      endpoint,
      source,
      status: 'error',
      duration,
      errorCode: error.code,
      errorMessage: error.message,
    });
  }

  getLogs(): ApiLogEntry[] {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }
}

// ============================================================================
// 统一 API 客户端
// ============================================================================

export class UnifiedApiClient {
  private static instance: UnifiedApiClient;

  private config: UnifiedApiConfig;
  private cache: SimpleCache;
  private logger: SimpleLogger;
  private metrics: ApiMetrics;

  private constructor() {
    // 合并环境配置
    const envConfig = getEnvironmentConfig();
    this.config = mergeConfig(defaultConfig, envConfig);

    // 初始化缓存
    this.cache = new SimpleCache(this.config.cache.maxSize);

    // 初始化日志
    this.logger = new SimpleLogger(
      this.config.logging.enabled,
      this.config.logging.level,
      this.config.logging.maxLogs
    );

    // 初始化指标
    this.metrics = {
      totalRequests: 0,
      successRequests: 0,
      failedRequests: 0,
      timeoutRequests: 0,
      avgResponseTime: 0,
      sourceSuccessRates: {} as Record<DataSource, number>,
      sourceAvgResponseTimes: {} as Record<DataSource, number>,
    };
  }

  /**
   * 获取单例实例
   */
  static getInstance(): UnifiedApiClient {
    if (!UnifiedApiClient.instance) {
      UnifiedApiClient.instance = new UnifiedApiClient();
    }
    return UnifiedApiClient.instance;
  }

  /**
   * 更新配置
   */
  updateConfig(override: Partial<UnifiedApiConfig>): void {
    this.config = mergeConfig(this.config, override);
  }

  /**
   * 获取当前配置
   */
  getConfig(): UnifiedApiConfig {
    return { ...this.config };
  }

  /**
   * 执行通用请求
   */
  async request<T>(request: ApiRequest): Promise<ApiResponse<T>> {
    const requestId = generateRequestId();
    const startTime = Date.now();
    const source = request.source || this.selectBestSource(request.endpoint);

    try {
      // 检查数据源是否启用
      if (!this.config.dataSources[source].enabled) {
        throw createUnknownError(`数据源 ${source} 已禁用`);
      }

      // 构建完整 URL
      const url = this.buildUrl(request, source);

      // 检查缓存
      const cacheKey = this.getCacheKey(url, request.params);
      if (request.options?.useCache !== false) {
        const cached = this.cache.get<T>(cacheKey);
        if (cached) {
          return this.createSuccessResponse(cached, source, Date.now() - startTime, requestId);
        }
      }

      // 执行请求（带重试）
      const result = await this.executeRequestWithRetry<T>(url, request, source, requestId);

      // 缓存结果
      if (request.options?.useCache !== false && result.success && result.data) {
        const ttl = request.options.cacheTtl || getCacheTtlForEndpoint(request.endpoint);
        this.cache.set(cacheKey, result.data, ttl);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const apiError = error instanceof Error
        ? this.mapErrorToApiError(error)
        : createUnknownError(error);

      this.logger.logError(request.method, request.endpoint, source, duration, apiError, requestId);
      this.updateMetrics(source, duration, false);

      return this.createErrorResponse(apiError, source, duration, requestId);
    }
  }

  /**
   * GET 请求快捷方法
   */
  async get<T>(
    endpoint: string,
    params?: Record<string, unknown>,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'GET',
      endpoint,
      params: params as Record<string, string | number | boolean>,
      options,
    });
  }

  /**
   * POST 请求快捷方法
   */
  async post<T>(
    endpoint: string,
    body: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'POST',
      endpoint,
      body,
      options,
    });
  }

  /**
   * 批量请求
   */
  async batch<T>(
    requests: ApiRequest[],
    options?: RequestOptions
  ): Promise<ApiResponse<T>[]> {
    const concurrency = options?.concurrency || 5;
    const results: ApiResponse<T>[] = [];

    // 限制并发数
    const chunks = this.chunkArray(requests, concurrency);

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(req => this.request<T>(req))
      );
      results.push(...chunkResults);

      // 请求间隔
      if (options?.delayBetweenRequests) {
        await delay(options.delayBetweenRequests);
      }
    }

    return results;
  }

  /**
   * 选择最佳数据源
   */
  private selectBestSource(endpoint: string): DataSource {
    // 根据端点选择支持的数据源
    const capability = this.getCapabilityFromEndpoint(endpoint);
    const sources = Object.entries(this.config.dataSources) as Array<[DataSource, typeof this.config.dataSources[DataSource]]>;
    const enabledSources = sources
      .filter(([, config]) => config.enabled)
      .sort(([, a], [, b]) => a.priority - b.priority);

    // 返回优先级最高的启用数据源
    return (enabledSources[0]?.[0] as DataSource) || DataSource.EASTMONEY;
  }

  /**
   * 从端点获取能力类型
   */
  private getCapabilityFromEndpoint(endpoint: string): 'quote' | 'kline' | 'sector' | 'constituents' | 'search' {
    if (endpoint.includes('/quote')) return 'quote';
    if (endpoint.includes('/kline')) return 'kline';
    if (endpoint.includes('/constituents')) return 'constituents';
    if (endpoint.includes('/sector')) return 'sector';
    if (endpoint.includes('/search')) return 'search';
    return 'quote';
  }

  /**
   * 构建完整 URL
   */
  private buildUrl(request: ApiRequest, source: DataSource): string {
    const baseUrl = this.config.dataSources[source].baseUrl;
    let url = `${baseUrl}${request.endpoint}`;

    // 添加查询参数
    if (request.params && Object.keys(request.params).length > 0) {
      const queryString = new URLSearchParams(
        request.params as Record<string, string>
      ).toString();
      url += `?${queryString}`;
    }

    return url;
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(url: string, params?: Record<string, unknown>): string {
    const paramStr = params ? JSON.stringify(params) : '';
    return `${url}${paramStr}`;
  }

  /**
   * 执行请求（带重试）
   */
  private async executeRequestWithRetry<T>(
    url: string,
    request: ApiRequest,
    source: DataSource,
    requestId: string
  ): Promise<ApiResponse<T>> {
    const maxRetries = request.options?.retries || this.config.defaultRetries;
    const retryDelay = request.options?.retryDelay || this.config.defaultRetryDelay;
    const timeout = request.options?.timeout || this.config.dataSources[source].timeout;

    let lastError: ApiError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.executeSingleRequest<T>(url, request, timeout, source, requestId);

        if (result.success) {
          return result;
        }

        // 检查是否可重试
        if (result.error && !isRetryableError(result.error)) {
          return result;
        }

        lastError = result.error;
      } catch (error) {
        lastError = error instanceof Error
          ? this.mapErrorToApiError(error)
          : createUnknownError(error);

        if (!isRetryableError(lastError)) {
          throw error;
        }
      }

      // 重试前延迟
      if (attempt < maxRetries) {
        await delay(retryDelay * (attempt + 1));
      }
    }

    // 重试耗尽
    throw lastError || createUnknownError('重试耗尽');
  }

  /**
   * 执行单个请求
   */
  private async executeSingleRequest<T>(
    url: string,
    request: ApiRequest,
    timeout: number,
    source: DataSource,
    requestId: string
  ): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: request.method,
        headers: {
          'Accept': 'application/json',
          ...request.options?.headers,
        },
        body: request.body ? JSON.stringify(request.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw createHttpError(response.status, response.statusText);
      }

      // 解析响应
      const contentType = response.headers.get('content-type');
      let data: T;

      if (contentType?.includes('application/json')) {
        const json = await response.json();
        // 处理后端统一响应格式
        data = json.data || json;
      } else {
        data = await response.text() as unknown as T;
      }

      const duration = Date.now() - startTime;
      this.logger.logSuccess(request.method, request.endpoint, source, duration, requestId);
      this.updateMetrics(source, duration, true);

      return this.createSuccessResponse(data, source, duration, requestId);
    } catch (error) {
      clearTimeout(timeoutId);

      if ((error as Error).name === 'AbortError') {
        throw createTimeoutError(timeout);
      }

      throw error;
    }
  }

  /**
   * 创建成功响应
   */
  private createSuccessResponse<T>(
    data: T,
    source: DataSource,
    duration: number,
    requestId: string
  ): ApiResponse<T> {
    return {
      success: true,
      data,
      error: null,
      meta: {
        source,
        timestamp: new Date().toISOString(),
        duration,
        requestId,
      },
    };
  }

  /**
   * 创建错误响应
   */
  private createErrorResponse<T>(
    error: ApiError,
    source: DataSource,
    duration: number,
    requestId: string
  ): ApiResponse<T> {
    return {
      success: false,
      data: null,
      error,
      meta: {
        source,
        timestamp: new Date().toISOString(),
        duration,
        requestId,
      },
    };
  }

  /**
   * 映射错误类型
   */
  private mapErrorToApiError(error: unknown): ApiError {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return createTimeoutError();
      }
      if (error.message.includes('Failed to fetch')) {
        return createNetworkError();
      }
      if (error.message.includes('JSON')) {
        return createParseError(error.message);
      }
    }
    return createUnknownError(error);
  }

  /**
   * 更新指标
   */
  private updateMetrics(source: DataSource, duration: number, success: boolean): void {
    this.metrics.totalRequests++;

    if (success) {
      this.metrics.successRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    // 更新平均响应时间
    this.metrics.avgResponseTime =
      (this.metrics.avgResponseTime * (this.metrics.totalRequests - 1) + duration) /
      this.metrics.totalRequests;

    // 更新数据源指标
    if (!this.metrics.sourceSuccessRates[source]) {
      this.metrics.sourceSuccessRates[source] = 0;
      this.metrics.sourceAvgResponseTimes[source] = 0;
    }

    // 简化处理：实际应该维护计数
    this.metrics.sourceSuccessRates[source] = success ? 100 : 0;
    this.metrics.sourceAvgResponseTimes[source] = duration;
  }

  /**
   * 数组分块
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // ============================================================================
  // 公共方法 - 监控和管理
  // ============================================================================

  /**
   * 获取 API 日志
   */
  getLogs(): ApiLogEntry[] {
    return this.logger.getLogs();
  }

  /**
   * 清除日志
   */
  clearLogs(): void {
    this.logger.clear();
  }

  /**
   * 获取性能指标
   */
  getMetrics(): ApiMetrics {
    return { ...this.metrics };
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  getCacheSize(): number {
    return this.cache.size();
  }

  /**
   * 获取数据源状态
   */
  getDataSourceStatus(): DataSourceStatus[] {
    return Object.entries(this.config.dataSources).map(([source, config]) => ({
      source: source as DataSource,
      isAvailable: config.enabled,
      lastCheckTime: new Date().toISOString(),
      avgResponseTime: this.metrics.sourceAvgResponseTimes[source as DataSource] || 0,
      successRate: this.metrics.sourceSuccessRates[source as DataSource] || 0,
    }));
  }

  /**
   * 测试数据源连接
   */
  async testDataSource(source: DataSource): Promise<boolean> {
    try {
      const config = this.config.dataSources[source];
      const url = `${config.baseUrl}/health`;

      const response = await fetch(url, {
        method: 'GET',
        signal: createTimeoutSignal(3000),
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// 导出单例实例
// ============================================================================

export const unifiedApiClient = UnifiedApiClient.getInstance();
