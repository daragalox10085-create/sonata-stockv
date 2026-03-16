/**
 * 统一API客户端
 * 封装所有数据源调用，提供统一的错误处理和重试机制
 *
 * @module services/ApiClient
 * @version 2.0.0
 */

import { logger } from '../utils/logger';
import {
  AppError,
  ErrorCode,
  createNetworkError,
} from '../utils/errors';
import type { ErrorResponse } from '../types/api';

/**
 * API 响应接口
 */
export interface ApiResponse<T> {
  /** 响应数据 */
  data: T | null;
  /** 错误信息 */
  error: string | null;
  /** 数据来源 */
  source: string;
  /** 时间戳 */
  timestamp: string;
  /** 是否成功 */
  success: boolean;
}

/**
 * 请求配置选项
 */
interface RequestOptions {
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 请求头 */
  headers?: Record<string, string>;
}

/**
 * 默认请求配置
 */
const DEFAULT_OPTIONS: Required<RequestOptions> = {
  timeout: 10000,
  retries: 3,
  retryDelay: 1000,
  headers: {},
};

/**
 * API 客户端类
 * 单例模式实现
 */
export class ApiClient {
  private static instance: ApiClient;

  /**
   * 私有构造函数
   */
  private constructor() {}

  /**
   * 获取单例实例
   * @returns ApiClient 实例
   */
  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  /**
   * 延迟函数
   * @param ms - 延迟毫秒数
   * @returns Promise
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 从URL提取数据源名称
   * @param url - 请求URL
   * @returns 数据源名称
   */
  private extractSource(url: string): string {
    if (url.includes('eastmoney')) return 'eastmoney';
    if (url.includes('tencent')) return 'tencent';
    if (url.includes('sina')) return 'sina';
    if (url.includes('akshare')) return 'akshare';
    return 'backend';
  }

  /**
   * 创建超时信号
   * @param timeoutMs - 超时毫秒数
   * @returns AbortSignal
   */
  private createTimeoutSignal(timeoutMs: number): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeoutMs);
    return controller.signal;
  }

  /**
   * 执行 fetch 请求
   * @param url - 请求URL
   * @param options - 请求选项
   * @returns Response
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit & { timeout?: number }
  ): Promise<Response> {
    const { timeout = DEFAULT_OPTIONS.timeout, ...fetchOptions } = options;

    const response = await fetch(url, {
      ...fetchOptions,
      signal: this.createTimeoutSignal(timeout),
    });

    return response;
  }

  /**
   * 处理 HTTP 响应
   * @param response - fetch Response
   * @returns 解析后的数据
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData: ErrorResponse = await response.json().catch(() => ({
        code: ErrorCode.UNKNOWN_ERROR,
        message: `HTTP ${response.status}: ${response.statusText}`,
        timestamp: new Date().toISOString(),
      }));

      throw new AppError(
        errorData.code as ErrorCode,
        errorData.message,
        errorData.details
      );
    }

    const data = await response.json();

    // 处理后端统一响应格式
    if (data.success === false) {
      throw new AppError(
        data.error?.code || ErrorCode.UNKNOWN_ERROR,
        data.error?.message || '请求失败',
        data.error?.details
      );
    }

    return data.data || data;
  }

  /**
   * 统一 GET 请求
   * @param url - 请求URL
   * @param options - 请求选项
   * @returns API 响应
   */
  async get<T>(url: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    const source = this.extractSource(url);

    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...options?.headers,
        },
        timeout: options?.timeout || DEFAULT_OPTIONS.timeout,
      });

      const data = await this.handleResponse<T>(response);
      const duration = Date.now() - startTime;

      logger.info(`API 请求成功: ${source}`, {
        url,
        duration,
        source,
      });

      return {
        data,
        error: null,
        source,
        timestamp: new Date().toISOString(),
        success: true,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const appError = error instanceof AppError ? error : createNetworkError(String(error));

      logger.error(`API 请求失败: ${source}`, error, {
        url,
        duration,
        source,
        errorCode: appError.code,
      });

      return {
        data: null,
        error: appError.message,
        source,
        timestamp: new Date().toISOString(),
        success: false,
      };
    }
  }

  /**
   * 带重试的 GET 请求
   * @param url - 请求URL
   * @param options - 请求选项
   * @returns API 响应
   */
  async getWithRetry<T>(url: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError: string | null = null;

    for (let i = 0; i < opts.retries; i++) {
      const result = await this.get<T>(url, opts);

      if (result.success && result.data !== null) {
        return result;
      }

      lastError = result.error;

      if (i < opts.retries - 1) {
        logger.warn(`API 请求重试 ${i + 1}/${opts.retries}: ${url}`);
        await this.delay(opts.retryDelay * (i + 1));
      }
    }

    logger.error(`API 请求重试耗尽: ${url}`, new Error(lastError || 'Unknown error'));

    return {
      data: null,
      error: `重试${opts.retries}次后失败: ${lastError}`,
      source: this.extractSource(url),
      timestamp: new Date().toISOString(),
      success: false,
    };
  }

  /**
   * POST 请求
   * @param url - 请求URL
   * @param body - 请求体
   * @param options - 请求选项
   * @returns API 响应
   */
  async post<T>(
    url: string,
    body: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    const source = this.extractSource(url);

    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...options?.headers,
        },
        body: JSON.stringify(body),
        timeout: options?.timeout || DEFAULT_OPTIONS.timeout,
      });

      const data = await this.handleResponse<T>(response);
      const duration = Date.now() - startTime;

      logger.info(`API POST 请求成功: ${source}`, {
        url,
        duration,
        source,
      });

      return {
        data,
        error: null,
        source,
        timestamp: new Date().toISOString(),
        success: true,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const appError = error instanceof AppError ? error : createNetworkError(String(error));

      logger.error(`API POST 请求失败: ${source}`, error, {
        url,
        duration,
        source,
        errorCode: appError.code,
      });

      return {
        data: null,
        error: appError.message,
        source,
        timestamp: new Date().toISOString(),
        success: false,
      };
    }
  }
}

/**
 * 导出单例实例
 */
export const apiClient = ApiClient.getInstance();
