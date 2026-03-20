/**
 * API 错误处理工具
 * @module services/api/errors
 * @version 3.0.0
 */

import { ApiError, ApiErrorCode } from './types';

// ============================================================================
// 错误工厂函数
// ============================================================================

/**
 * 创建网络错误
 */
export function createNetworkError(message?: string): ApiError {
  return {
    code: ApiErrorCode.NETWORK_ERROR,
    message: message || '网络连接失败',
  };
}

/**
 * 创建超时错误
 */
export function createTimeoutError(timeout?: number): ApiError {
  return {
    code: ApiErrorCode.TIMEOUT_ERROR,
    message: `请求超时${timeout ? `(${timeout}ms)` : ''}`,
  };
}

/**
 * 创建连接错误
 */
export function createConnectionError(message?: string): ApiError {
  return {
    code: ApiErrorCode.CONNECTION_ERROR,
    message: message || '无法连接到服务器',
  };
}

/**
 * 创建 HTTP 错误
 */
export function createHttpError(status: number, statusText?: string): ApiError {
  const codeMap: Record<number, ApiErrorCode> = {
    400: ApiErrorCode.BAD_REQUEST,
    401: ApiErrorCode.UNAUTHORIZED,
    403: ApiErrorCode.FORBIDDEN,
    404: ApiErrorCode.NOT_FOUND,
    429: ApiErrorCode.RATE_LIMITED,
    500: ApiErrorCode.SERVER_ERROR,
    503: ApiErrorCode.SERVICE_UNAVAILABLE,
  };

  return {
    code: codeMap[status] || ApiErrorCode.UNKNOWN_ERROR,
    message: `HTTP ${status}${statusText ? `: ${statusText}` : ''}`,
  };
}

/**
 * 创建解析错误
 */
export function createParseError(message?: string): ApiError {
  return {
    code: ApiErrorCode.PARSE_ERROR,
    message: message || '响应数据解析失败',
  };
}

/**
 * 创建验证错误
 */
export function createValidationError(message: string, details?: Record<string, unknown>): ApiError {
  return {
    code: ApiErrorCode.VALIDATION_ERROR,
    message,
    details,
  };
}

/**
 * 创建数据未找到错误
 */
export function createDataNotFoundError(entity?: string, id?: string): ApiError {
  return {
    code: ApiErrorCode.DATA_NOT_FOUND,
    message: entity && id ? `${entity}(${id}) 未找到` : '数据未找到',
  };
}

/**
 * 创建配置错误
 */
export function createConfigError(message: string): ApiError {
  return {
    code: ApiErrorCode.CONFIG_ERROR,
    message,
  };
}

/**
 * 创建数据源不可用错误
 */
export function createSourceNotAvailableError(source: string): ApiError {
  return {
    code: ApiErrorCode.SOURCE_NOT_AVAILABLE,
    message: `数据源 ${source} 不可用`,
  };
}

/**
 * 创建未知错误
 */
export function createUnknownError(originalError?: unknown): ApiError {
  const message = originalError instanceof Error
    ? originalError.message
    : typeof originalError === 'string'
    ? originalError
    : '未知错误';

  return {
    code: ApiErrorCode.UNKNOWN_ERROR,
    message,
    details: originalError instanceof Error ? {
      name: originalError.name,
      stack: originalError.stack,
    } : undefined,
  };
}

// ============================================================================
// 错误分类工具
// ============================================================================

/**
 * 判断错误是否可重试
 */
export function isRetryableError(error: ApiError): boolean {
  const retryableCodes: ApiErrorCode[] = [
    ApiErrorCode.NETWORK_ERROR,
    ApiErrorCode.TIMEOUT_ERROR,
    ApiErrorCode.CONNECTION_ERROR,
    ApiErrorCode.SERVER_ERROR,
    ApiErrorCode.SERVICE_UNAVAILABLE,
  ];

  return retryableCodes.includes(error.code);
}

/**
 * 判断错误是否为网络相关错误
 */
export function isNetworkError(error: ApiError): boolean {
  const networkCodes: ApiErrorCode[] = [
    ApiErrorCode.NETWORK_ERROR,
    ApiErrorCode.TIMEOUT_ERROR,
    ApiErrorCode.CONNECTION_ERROR,
  ];

  return networkCodes.includes(error.code);
}

/**
 * 判断错误是否为用户错误（4xx）
 */
export function isClientError(error: ApiError): boolean {
  const clientCodes: ApiErrorCode[] = [
    ApiErrorCode.BAD_REQUEST,
    ApiErrorCode.UNAUTHORIZED,
    ApiErrorCode.FORBIDDEN,
    ApiErrorCode.NOT_FOUND,
    ApiErrorCode.RATE_LIMITED,
    ApiErrorCode.VALIDATION_ERROR,
  ];

  return clientCodes.includes(error.code);
}

/**
 * 判断错误是否为服务器错误（5xx）
 */
export function isServerError(error: ApiError): boolean {
  const serverCodes: ApiErrorCode[] = [
    ApiErrorCode.SERVER_ERROR,
    ApiErrorCode.SERVICE_UNAVAILABLE,
  ];

  return serverCodes.includes(error.code);
}

// ============================================================================
// 错误格式化
// ============================================================================

/**
 * 格式化错误为人类可读的消息
 */
export function formatErrorMessage(error: ApiError): string {
  const messages: Record<ApiErrorCode, string> = {
    [ApiErrorCode.NETWORK_ERROR]: '网络连接失败，请检查网络设置',
    [ApiErrorCode.TIMEOUT_ERROR]: '请求超时，请稍后重试',
    [ApiErrorCode.CONNECTION_ERROR]: '无法连接到服务器',
    [ApiErrorCode.BAD_REQUEST]: '请求参数错误',
    [ApiErrorCode.UNAUTHORIZED]: '未授权访问',
    [ApiErrorCode.FORBIDDEN]: '禁止访问',
    [ApiErrorCode.NOT_FOUND]: '资源未找到',
    [ApiErrorCode.RATE_LIMITED]: '请求过于频繁，请稍后重试',
    [ApiErrorCode.SERVER_ERROR]: '服务器错误，请稍后重试',
    [ApiErrorCode.SERVICE_UNAVAILABLE]: '服务暂时不可用',
    [ApiErrorCode.PARSE_ERROR]: '数据解析失败',
    [ApiErrorCode.VALIDATION_ERROR]: '数据验证失败',
    [ApiErrorCode.DATA_NOT_FOUND]: '数据未找到',
    [ApiErrorCode.DATA_EXPIRED]: '数据已过期',
    [ApiErrorCode.CONFIG_ERROR]: '配置错误',
    [ApiErrorCode.SOURCE_NOT_AVAILABLE]: '数据源不可用',
    [ApiErrorCode.SOURCE_DISABLED]: '数据源已禁用',
    [ApiErrorCode.UNKNOWN_ERROR]: '发生未知错误',
  };

  const baseMessage = messages[error.code] || error.message;
  
  if (error.details) {
    const detailsStr = Object.entries(error.details)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    return `${baseMessage} (${detailsStr})`;
  }

  return baseMessage;
}

/**
 * 将错误转换为适合日志的字符串
 */
export function errorToString(error: ApiError): string {
  return `[${error.code}] ${error.message}${error.details ? ` | Details: ${JSON.stringify(error.details)}` : ''}`;
}

// ============================================================================
// 错误恢复建议
// ============================================================================

/**
 * 获取错误恢复建议
 */
export function getRecoverySuggestion(error: ApiError): string | null {
  const suggestions: Record<ApiErrorCode, string | null> = {
    [ApiErrorCode.NETWORK_ERROR]: '检查网络连接，确认防火墙设置',
    [ApiErrorCode.TIMEOUT_ERROR]: '增加超时时间或检查网络延迟',
    [ApiErrorCode.CONNECTION_ERROR]: '确认服务器地址正确，检查 DNS 设置',
    [ApiErrorCode.BAD_REQUEST]: '检查请求参数格式',
    [ApiErrorCode.UNAUTHORIZED]: '检查认证 token 是否有效',
    [ApiErrorCode.FORBIDDEN]: '确认是否有访问权限',
    [ApiErrorCode.NOT_FOUND]: '检查资源 ID 是否正确',
    [ApiErrorCode.RATE_LIMITED]: '降低请求频率，实现请求节流',
    [ApiErrorCode.SERVER_ERROR]: '等待服务器恢复，或切换到备用数据源',
    [ApiErrorCode.SERVICE_UNAVAILABLE]: '等待服务恢复，或切换到备用数据源',
    [ApiErrorCode.PARSE_ERROR]: '检查 API 响应格式是否变更',
    [ApiErrorCode.VALIDATION_ERROR]: '检查输入数据格式',
    [ApiErrorCode.DATA_NOT_FOUND]: '确认数据是否存在',
    [ApiErrorCode.DATA_EXPIRED]: '刷新数据或重新请求',
    [ApiErrorCode.CONFIG_ERROR]: '检查配置文件',
    [ApiErrorCode.SOURCE_NOT_AVAILABLE]: '切换到备用数据源',
    [ApiErrorCode.SOURCE_DISABLED]: '启用数据源或切换到其他数据源',
    [ApiErrorCode.UNKNOWN_ERROR]: '查看详细错误日志',
  };

  return suggestions[error.code] || null;
}
