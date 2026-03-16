/**
 * 错误处理工具模块
 * 提供统一的错误类型和错误处理功能
 *
 * @module utils/errors
 * @version 1.0.0
 */

import type { ErrorResponse } from '../types/api';

/**
 * 应用错误代码枚举
 */
export enum ErrorCode {
  // 通用错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // API 错误
  API_REQUEST_FAILED = 'API_REQUEST_FAILED',
  API_RESPONSE_INVALID = 'API_RESPONSE_INVALID',
  API_RATE_LIMITED = 'API_RATE_LIMITED',
  API_UNAVAILABLE = 'API_UNAVAILABLE',

  // 数据错误
  DATA_NOT_FOUND = 'DATA_NOT_FOUND',
  DATA_PARSE_ERROR = 'DATA_PARSE_ERROR',
  DATA_VALIDATION_FAILED = 'DATA_VALIDATION_FAILED',

  // 业务错误
  STOCK_NOT_FOUND = 'STOCK_NOT_FOUND',
  SECTOR_NOT_FOUND = 'SECTOR_NOT_FOUND',
  ANALYSIS_FAILED = 'ANALYSIS_FAILED',

  // 配置错误
  CONFIG_MISSING = 'CONFIG_MISSING',
  CONFIG_INVALID = 'CONFIG_INVALID',
}

/**
 * HTTP 状态码映射
 */
export const ErrorHttpStatus: Record<ErrorCode, number> = {
  [ErrorCode.UNKNOWN_ERROR]: 500,
  [ErrorCode.NETWORK_ERROR]: 503,
  [ErrorCode.TIMEOUT_ERROR]: 504,
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.API_REQUEST_FAILED]: 502,
  [ErrorCode.API_RESPONSE_INVALID]: 502,
  [ErrorCode.API_RATE_LIMITED]: 429,
  [ErrorCode.API_UNAVAILABLE]: 503,
  [ErrorCode.DATA_NOT_FOUND]: 404,
  [ErrorCode.DATA_PARSE_ERROR]: 500,
  [ErrorCode.DATA_VALIDATION_FAILED]: 400,
  [ErrorCode.STOCK_NOT_FOUND]: 404,
  [ErrorCode.SECTOR_NOT_FOUND]: 404,
  [ErrorCode.ANALYSIS_FAILED]: 500,
  [ErrorCode.CONFIG_MISSING]: 500,
  [ErrorCode.CONFIG_INVALID]: 500,
};

/**
 * 应用基础错误类
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;
  readonly originalError?: Error;

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
    originalError?: Error
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = ErrorHttpStatus[code] || 500;
    this.details = details;
    this.originalError = originalError;

    if (originalError?.stack) {
      this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
    }
  }

  toResponse(): ErrorResponse {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: new Date().toISOString(),
    };
  }
}

export class ApiError extends AppError {
  readonly apiName: string;
  readonly url?: string;
  readonly duration?: number;

  constructor(
    code: ErrorCode,
    message: string,
    apiName: string,
    url?: string,
    duration?: number,
    originalError?: Error
  ) {
    super(code, message, { apiName, url, duration }, originalError);
    this.name = 'ApiError';
    this.apiName = apiName;
    this.url = url;
    this.duration = duration;
  }
}

export class DataError extends AppError {
  readonly dataType: string;
  readonly identifier?: string;

  constructor(
    code: ErrorCode,
    message: string,
    dataType: string,
    identifier?: string,
    originalError?: Error
  ) {
    super(code, message, { dataType, identifier }, originalError);
    this.name = 'DataError';
    this.dataType = dataType;
    this.identifier = identifier;
  }
}

export class ValidationError extends AppError {
  readonly field?: string;
  readonly expected?: unknown;
  readonly actual?: unknown;

  constructor(message: string, field?: string, expected?: unknown, actual?: unknown) {
    super(ErrorCode.VALIDATION_ERROR, message, { field, expected, actual });
    this.name = 'ValidationError';
    this.field = field;
    this.expected = expected;
    this.actual = actual;
  }
}

export function createNetworkError(message?: string, originalError?: Error): AppError {
  return new AppError(
    ErrorCode.NETWORK_ERROR,
    message || '网络连接失败，请检查网络设置',
    undefined,
    originalError
  );
}

export function createTimeoutError(message?: string, originalError?: Error): AppError {
  return new AppError(
    ErrorCode.TIMEOUT_ERROR,
    message || '请求超时，请稍后重试',
    undefined,
    originalError
  );
}

export function createApiRequestError(
  apiName: string,
  message?: string,
  originalError?: Error
): ApiError {
  return new ApiError(
    ErrorCode.API_REQUEST_FAILED,
    message || `${apiName} 请求失败`,
    apiName,
    undefined,
    undefined,
    originalError
  );
}

export function createDataNotFoundError(dataType: string, identifier?: string): DataError {
  return new DataError(
    ErrorCode.DATA_NOT_FOUND,
    `${dataType}${identifier ? ` "${identifier}"` : ''} 未找到`,
    dataType,
    identifier
  );
}

export function createStockNotFoundError(symbol: string): DataError {
  return new DataError(
    ErrorCode.STOCK_NOT_FOUND,
    `股票 "${symbol}" 未找到或数据不可用`,
    'Stock',
    symbol
  );
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(ErrorCode.UNKNOWN_ERROR, error.message, undefined, error);
  }

  return new AppError(
    ErrorCode.UNKNOWN_ERROR,
    typeof error === 'string' ? error : '发生未知错误'
  );
}

export function handleApiError(error: unknown, apiName: string): ErrorResponse {
  const appError = toAppError(error);

  if (appError instanceof ApiError) {
    return appError.toResponse();
  }

  if (error instanceof TypeError && error.message.includes('fetch')) {
    const networkError = createNetworkError(
      `${apiName} 网络请求失败`,
      error instanceof Error ? error : undefined
    );
    return networkError.toResponse();
  }

  const apiError = new ApiError(
    appError.code,
    appError.message,
    apiName,
    undefined,
    undefined,
    appError.originalError
  );

  return apiError.toResponse();
}
