/**
 * 统一 API 配置
 * @module services/api/config
 * @version 3.0.0
 */

import {
  DataSource,
  UnifiedApiConfig,
  ApiErrorCode,
} from './types';

// ============================================================================
// 默认配置
// ============================================================================

/**
 * 默认统一 API 配置
 */
export const defaultConfig: UnifiedApiConfig = {
  // 默认超时 10 秒
  defaultTimeout: 10000,
  
  // 默认重试 3 次
  defaultRetries: 3,
  
  // 默认重试延迟 1 秒
  defaultRetryDelay: 1000,
  
  // 缓存配置
  cache: {
    enabled: true,
    defaultTtl: 30000,  // 30 秒
    maxSize: 1000,
  },
  
  // 日志配置
  logging: {
    enabled: true,
    level: 'info',
    maxLogs: 100,
  },
  
  // 数据源配置
  dataSources: {
    [DataSource.EASTMONEY]: {
      name: '东方财富',
      priority: 1,
      baseUrl: '/api/eastmoney',
      timeout: 8000,
      retryCount: 3,
      retryDelay: 1000,
      enabled: true,
    },
    [DataSource.TENCENT]: {
      name: '腾讯财经',
      priority: 2,
      baseUrl: '/api/tencent',
      timeout: 5000,
      retryCount: 3,
      retryDelay: 1000,
      enabled: true,
    },
    [DataSource.SINA]: {
      name: '新浪财经',
      priority: 3,
      baseUrl: '/api/sina',
      timeout: 5000,
      retryCount: 2,
      retryDelay: 1000,
      enabled: true,
    },
    [DataSource.AKSHARE]: {
      name: 'AkShare',
      priority: 4,
      baseUrl: '/api/akshare',
      timeout: 10000,
      retryCount: 2,
      retryDelay: 1000,
      enabled: false,  // 默认禁用
    },
  },
  
  // 错误处理配置
  errorHandling: {
    autoRetry: true,
    retryableCodes: [
      ApiErrorCode.NETWORK_ERROR,
      ApiErrorCode.TIMEOUT_ERROR,
      ApiErrorCode.CONNECTION_ERROR,
      ApiErrorCode.SERVER_ERROR,
      ApiErrorCode.SERVICE_UNAVAILABLE,
    ],
    autoFallback: true,
    fallbackOrder: [
      DataSource.EASTMONEY,
      DataSource.TENCENT,
      DataSource.SINA,
    ],
  },
};

// ============================================================================
// 缓存策略配置
// ============================================================================

/**
 * 缓存策略 - 按端点类型
 */
export const cacheStrategies: Record<string, { ttl: number }> = {
  // 实时行情 - 30秒
  quote: { ttl: 30000 },
  
  // K线数据 - 1分钟
  kline: { ttl: 60000 },
  
  // 板块列表 - 5分钟
  sector: { ttl: 300000 },
  
  // 板块成分股 - 2分钟
  constituents: { ttl: 120000 },
  
  // 搜索结果 - 10分钟
  search: { ttl: 600000 },
};

/**
 * 获取端点类型的缓存时间
 * @param endpoint - API 端点
 * @returns 缓存时间（毫秒）
 */
export function getCacheTtlForEndpoint(endpoint: string): number {
  // 从端点路径中提取类型
  const path = endpoint.split('?')[0];  // 移除查询参数
  
  if (path.includes('/quote')) return cacheStrategies.quote.ttl;
  if (path.includes('/kline')) return cacheStrategies.kline.ttl;
  if (path.includes('/sector') && !path.includes('/constituents')) return cacheStrategies.sector.ttl;
  if (path.includes('/constituents')) return cacheStrategies.constituents.ttl;
  if (path.includes('/search')) return cacheStrategies.search.ttl;
  
  // 默认缓存时间
  return defaultConfig.cache.defaultTtl;
}

// ============================================================================
// 数据源能力配置
// ============================================================================

/**
 * 数据源能力矩阵
 */
export const dataSourceCapabilities: Record<DataSource, {
  quote: boolean;
  kline: boolean;
  sector: boolean;
  constituents: boolean;
  search: boolean;
}> = {
  [DataSource.EASTMONEY]: {
    quote: true,
    kline: true,
    sector: true,
    constituents: true,
    search: true,
  },
  [DataSource.TENCENT]: {
    quote: true,
    kline: true,
    sector: false,
    constituents: false,
    search: false,
  },
  [DataSource.SINA]: {
    quote: true,
    kline: false,
    sector: false,
    constituents: false,
    search: false,
  },
  [DataSource.AKSHARE]: {
    quote: true,
    kline: true,
    sector: true,
    constituents: true,
    search: true,
  },
};

/**
 * 检查数据源是否支持特定能力
 * @param source - 数据源
 * @param capability - 能力类型
 * @returns 是否支持
 */
export function hasCapability(
  source: DataSource,
  capability: 'quote' | 'kline' | 'sector' | 'constituents' | 'search'
): boolean {
  return dataSourceCapabilities[source]?.[capability] ?? false;
}

/**
 * 获取支持特定能力的数据源列表
 * @param capability - 能力类型
 * @returns 数据源列表（按优先级排序）
 */
export function getSourcesForCapability(
  capability: 'quote' | 'kline' | 'sector' | 'constituents' | 'search'
): DataSource[] {
  return Object.entries(dataSourceCapabilities)
    .filter(([, caps]) => caps[capability])
    .map(([source]) => source as DataSource)
    .sort((a, b) => {
      const priorityA = defaultConfig.dataSources[a].priority;
      const priorityB = defaultConfig.dataSources[b].priority;
      return priorityA - priorityB;
    });
}

// ============================================================================
// 环境配置
// ============================================================================

/**
 * 根据环境获取配置
 * @returns 环境特定的配置
 */
export function getEnvironmentConfig(): Partial<UnifiedApiConfig> {
  // 使用更兼容的方式检查环境
  const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';
  
  if (isDev) {
    return {
      // 开发环境：更长的超时，更多的日志
      defaultTimeout: 15000,
      logging: {
        ...defaultConfig.logging,
        level: 'debug',
      },
    };
  }
  
  // 生产环境配置
  return {
    defaultTimeout: 8000,
    logging: {
      ...defaultConfig.logging,
      level: 'warn',
    },
  };
}

// ============================================================================
// 配置合并
// ============================================================================

/**
 * 合并配置
 * @param base - 基础配置
 * @param override - 覆盖配置
 * @returns 合并后的配置
 */
export function mergeConfig(
  base: UnifiedApiConfig,
  override: Partial<UnifiedApiConfig>
): UnifiedApiConfig {
  return {
    ...base,
    ...override,
    cache: {
      ...base.cache,
      ...override.cache,
    },
    logging: {
      ...base.logging,
      ...override.logging,
    },
    dataSources: {
      ...base.dataSources,
      ...override.dataSources,
    },
    errorHandling: {
      ...base.errorHandling,
      ...override.errorHandling,
    },
  };
}
