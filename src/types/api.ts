/**
 * API 类型定义
 * @module types/api
 */

/**
 * API 日志条目
 */
export interface ApiLog {
  /** ISO 格式时间戳 */
  timestamp: string;
  /** 股票代码 */
  symbol: string;
  /** API 名称 */
  apiName: string;
  /** 请求状态 */
  status: 'success' | 'error' | 'timeout';
  /** 请求耗时（毫秒） */
  duration: number;
  /** 错误信息（可选） */
  errorMessage?: string;
}

/**
 * API 配置
 */
export interface ApiConfig {
  /** API 名称 */
  name: string;
  /** URL 生成函数 */
  url: (symbol: string) => string;
  /** 超时时间（毫秒） */
  timeout: number;
}

/**
 * API 响应包装
 */
export interface ApiResponse<T> {
  /** 是否成功 */
  success: boolean;
  /** 响应数据 */
  data?: T;
  /** 错误信息 */
  error?: string;
  /** 时间戳 */
  timestamp?: string;
}

/**
 * 错误响应格式
 */
export interface ErrorResponse {
  /** 错误代码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 错误详情 */
  details?: Record<string, unknown>;
  /** 时间戳 */
  timestamp: string;
}

/**
 * HTTP 方法类型
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * 请求配置
 */
export interface RequestConfig {
  /** 请求方法 */
  method?: HttpMethod;
  /** 请求头 */
  headers?: Record<string, string>;
  /** 请求体 */
  body?: unknown;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
}
