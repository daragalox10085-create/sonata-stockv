/**
 * API配置管理
 * 集中管理所有API相关配置，支持多数据源和故障转移
 */

import { ENV, IS_DEV } from './index';

// API源配置
export interface ApiSourceConfig {
  name: string;
  baseUrl: string;
  timeout: number;
  priority: number; // 优先级，数字越小优先级越高
  enabled: boolean;
  retryCount: number;
  retryDelay: number;
}

// API缓存配置
export interface ApiCacheConfig {
  enabled: boolean;
  ttl: number; // 缓存时间（毫秒）
  maxSize: number; // 最大缓存条目数
}

// API限流配置
export interface ApiRateLimitConfig {
  enabled: boolean;
  maxRequests: number; // 最大请求数
  windowMs: number; // 时间窗口（毫秒）
}

// API配置主接口
export interface ApiConfig {
  // 环境
  env: string;
  
  // 数据源配置
  sources: {
    tencent: ApiSourceConfig;
    eastmoney: ApiSourceConfig;
    sina: ApiSourceConfig;
  };
  
  // 缓存配置
  cache: ApiCacheConfig;
  
  // 限流配置
  rateLimit: ApiRateLimitConfig;
  
  // 通用配置
  defaultTimeout: number;
  defaultRetryCount: number;
  defaultRetryDelay: number;
  
  // 日志配置
  logging: {
    enabled: boolean;
    maxLogs: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}

// 基础配置
const baseConfig: Omit<ApiConfig, 'env'> = {
  sources: {
    tencent: {
      name: '腾讯财经',
      baseUrl: '/api/tencent',
      timeout: 5000,
      priority: 1,
      enabled: true,
      retryCount: 3,
      retryDelay: 1000,
    },
    eastmoney: {
      name: '东方财富',
      baseUrl: '/api/eastmoney',
      timeout: 8000,
      priority: 2,
      enabled: true,
      retryCount: 3,
      retryDelay: 1000,
    },
    sina: {
      name: '新浪财经',
      baseUrl: '/api/sina',
      timeout: 5000,
      priority: 3,
      enabled: true,
      retryCount: 2,
      retryDelay: 1000,
    },
  },
  
  cache: {
    enabled: true,
    ttl: IS_DEV ? 30000 : 60000, // 开发环境30秒，生产环境60秒
    maxSize: 1000,
  },
  
  rateLimit: {
    enabled: true,
    maxRequests: 100,
    windowMs: 60000, // 1分钟
  },
  
  defaultTimeout: 10000,
  defaultRetryCount: 3,
  defaultRetryDelay: 1000,
  
  logging: {
    enabled: true,
    maxLogs: 100,
    logLevel: IS_DEV ? 'debug' : 'info',
  },
};

// 环境特定配置
const envConfigs: Record<string, Partial<ApiConfig>> = {
  development: {
    cache: {
      enabled: true,
      ttl: 30000,
      maxSize: 500,
    },
    logging: {
      enabled: true,
      maxLogs: 200,
      logLevel: 'debug',
    },
  },
  production: {
    cache: {
      enabled: true,
      ttl: 120000, // 2分钟
      maxSize: 2000,
    },
    rateLimit: {
      enabled: true,
      maxRequests: 200,
      windowMs: 60000,
    },
    logging: {
      enabled: true,
      maxLogs: 100,
      logLevel: 'warn',
    },
  },
  test: {
    cache: {
      enabled: false,
      ttl: 0,
      maxSize: 0,
    },
    rateLimit: {
      enabled: false,
      maxRequests: 999999,
      windowMs: 1000,
    },
    logging: {
      enabled: true,
      maxLogs: 500,
      logLevel: 'debug',
    },
  },
};

// 合并配置
export const apiConfig: ApiConfig = {
  env: ENV,
  ...baseConfig,
  ...envConfigs[ENV],
};

// 获取按优先级排序的数据源
export function getEnabledSources(): ApiSourceConfig[] {
  return Object.values(apiConfig.sources)
    .filter(source => source.enabled)
    .sort((a, b) => a.priority - b.priority);
}

// 获取指定名称的数据源
export function getSource(name: keyof ApiConfig['sources']): ApiSourceConfig | null {
  return apiConfig.sources[name] || null;
}

// 导出默认配置
export default apiConfig;
