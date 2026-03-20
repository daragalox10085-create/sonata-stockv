/**
 * 统一 API 类型定义
 * @module services/api/types
 * @version 3.0.0
 */

// ============================================================================
// 数据源枚举
// ============================================================================

/**
 * 数据源类型
 */
export enum DataSource {
  EASTMONEY = 'eastmoney',
  TENCENT = 'tencent',
  SINA = 'sina',
  AKSHARE = 'akshare',
}

/**
 * HTTP 方法类型
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// ============================================================================
// 请求相关类型
// ============================================================================

/**
 * 请求选项
 */
export interface RequestOptions {
  /** 超时时间（毫秒），默认 10000 */
  timeout?: number;
  /** 重试次数，默认 3 */
  retries?: number;
  /** 重试延迟（毫秒），默认 1000 */
  retryDelay?: number;
  /** 是否使用缓存，默认 true */
  useCache?: boolean;
  /** 缓存时间（毫秒），默认 30000 */
  cacheTtl?: number;
  /** 自定义请求头 */
  headers?: Record<string, string>;
  /** 指定数据源 */
  source?: DataSource;
}

/**
 * API 请求对象
 */
export interface ApiRequest<T = unknown> {
  /** 请求方法 */
  method: HttpMethod;
  /** 请求路径（相对路径，如 /quote, /kline） */
  endpoint: string;
  /** 查询参数 */
  params?: Record<string, string | number | boolean>;
  /** 请求体（POST/PUT） */
  body?: T;
  /** 数据源（可选，默认自动选择） */
  source?: DataSource;
  /** 请求选项 */
  options?: RequestOptions;
}

/**
 * 批量请求选项
 */
export interface BatchRequestOptions extends RequestOptions {
  /** 最大并发数 */
  concurrency?: number;
  /** 请求间隔（毫秒） */
  delayBetweenRequests?: number;
}

// ============================================================================
// 响应相关类型
// ============================================================================

/**
 * 错误代码枚举
 */
export enum ApiErrorCode {
  // 网络错误
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',

  // HTTP 错误
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVER_ERROR = 'SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // 数据错误
  PARSE_ERROR = 'PARSE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATA_NOT_FOUND = 'DATA_NOT_FOUND',
  DATA_EXPIRED = 'DATA_EXPIRED',

  // 配置错误
  CONFIG_ERROR = 'CONFIG_ERROR',
  SOURCE_NOT_AVAILABLE = 'SOURCE_NOT_AVAILABLE',
  SOURCE_DISABLED = 'SOURCE_DISABLED',

  // 未知错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * API 错误对象
 */
export interface ApiError {
  /** 错误代码 */
  code: ApiErrorCode;
  /** 错误消息 */
  message: string;
  /** 错误详情 */
  details?: Record<string, unknown>;
}

/**
 * 响应元数据
 */
export interface ResponseMeta {
  /** 数据源 */
  source: DataSource;
  /** 请求时间戳 */
  timestamp: string;
  /** 请求耗时（毫秒） */
  duration: number;
  /** 请求ID（用于追踪） */
  requestId: string;
}

/**
 * API 响应对象
 */
export interface ApiResponse<T> {
  /** 是否成功 */
  success: boolean;
  /** 响应数据 */
  data: T | null;
  /** 错误信息（失败时） */
  error: ApiError | null;
  /** 元数据 */
  meta: ResponseMeta;
}

// ============================================================================
// 配置相关类型
// ============================================================================

/**
 * 数据源配置
 */
export interface DataSourceConfig {
  /** 数据源名称 */
  name: string;
  /** 优先级（数字越小优先级越高） */
  priority: number;
  /** 基础 URL */
  baseUrl: string;
  /** 超时时间（毫秒） */
  timeout: number;
  /** 重试次数 */
  retryCount: number;
  /** 重试延迟（毫秒） */
  retryDelay: number;
  /** 是否启用 */
  enabled: boolean;
}

/**
 * 错误处理配置
 */
export interface ErrorHandlingConfig {
  /** 是否自动重试 */
  autoRetry: boolean;
  /** 可重试的错误代码 */
  retryableCodes: ApiErrorCode[];
  /** 是否自动降级到其他数据源 */
  autoFallback: boolean;
  /** 降级顺序 */
  fallbackOrder: DataSource[];
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  /** 是否启用缓存 */
  enabled: boolean;
  /** 默认缓存时间（毫秒） */
  defaultTtl: number;
  /** 最大缓存条目数 */
  maxSize: number;
}

/**
 * 日志配置
 */
export interface LoggingConfig {
  /** 是否启用日志 */
  enabled: boolean;
  /** 日志级别 */
  level: 'debug' | 'info' | 'warn' | 'error';
  /** 最大日志条目数 */
  maxLogs: number;
}

/**
 * 统一 API 配置
 */
export interface UnifiedApiConfig {
  /** 默认超时 */
  defaultTimeout: number;
  /** 默认重试次数 */
  defaultRetries: number;
  /** 默认重试延迟 */
  defaultRetryDelay: number;
  /** 缓存配置 */
  cache: CacheConfig;
  /** 日志配置 */
  logging: LoggingConfig;
  /** 数据源配置 */
  dataSources: Record<DataSource, DataSourceConfig>;
  /** 错误处理配置 */
  errorHandling: ErrorHandlingConfig;
}

// ============================================================================
// 日志相关类型
// ============================================================================

/**
 * API 日志条目
 */
export interface ApiLogEntry {
  /** ISO 格式时间戳 */
  timestamp: string;
  /** 请求ID */
  requestId: string;
  /** 请求方法 */
  method: HttpMethod;
  /** 请求端点 */
  endpoint: string;
  /** 数据源 */
  source: DataSource;
  /** 请求状态 */
  status: 'success' | 'error' | 'timeout';
  /** 请求耗时（毫秒） */
  duration: number;
  /** 错误代码 */
  errorCode?: ApiErrorCode;
  /** 错误消息 */
  errorMessage?: string;
}

/**
 * API 性能指标
 */
export interface ApiMetrics {
  /** 总请求数 */
  totalRequests: number;
  /** 成功请求数 */
  successRequests: number;
  /** 失败请求数 */
  failedRequests: number;
  /** 超时请求数 */
  timeoutRequests: number;
  /** 平均响应时间 */
  avgResponseTime: number;
  /** 各数据源成功率 */
  sourceSuccessRates: Record<DataSource, number>;
  /** 各数据源平均响应时间 */
  sourceAvgResponseTimes: Record<DataSource, number>;
}

// ============================================================================
// 数据源状态类型
// ============================================================================

/**
 * 数据源状态
 */
export interface DataSourceStatus {
  /** 数据源 */
  source: DataSource;
  /** 是否可用 */
  isAvailable: boolean;
  /** 最后检查时间 */
  lastCheckTime: string;
  /** 平均响应时间 */
  avgResponseTime: number;
  /** 成功率 */
  successRate: number;
  /** 错误信息 */
  errorMessage?: string;
}

// ============================================================================
// 业务数据类型
// ============================================================================

/**
 * 股票实时行情
 */
export interface StockQuote {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  marketCap: number;
  pe?: number;
  peTtm?: number;
  pb?: number;
  ps?: number;
  roe?: number;
  totalShares?: number;
  turnoverRate?: number;
  source: DataSource;
  timestamp: string;
}

/**
 * K线数据点
 */
export interface KLinePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount?: number;
  amplitude?: number;
  changePercent?: number;
  change?: number;
  turnoverRate?: number;
}

/**
 * 板块信息
 */
export interface SectorInfo {
  code: string;
  name: string;
  changePercent: number;
  capitalInflow?: number;
  turnoverRate?: number;
  totalMarketCap?: number;
  heatScore?: number;
}

/**
 * 板块成分股
 */
export interface SectorConstituent {
  code: string;
  name: string;
  changePercent: number;
  capitalInflow?: number;
  turnoverRate?: number;
  marketCap?: number;
}

/**
 * 搜索结果
 */
export interface SearchResult {
  code: string;
  name: string;
  market: string;
  pinyin?: string;
}
