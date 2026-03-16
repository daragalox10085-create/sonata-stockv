/**
 * 服务模块入口
 * 统一导出所有服务
 */

// 配置
export { config, apiConfig, appConfig } from '../config';

// 数据获取器
export {
  DataFetcherFactory,
  PriorityDataFetcher,
  dataFetcherFactory,
  createPriorityFetcher,
} from './data-fetchers';
export type { DataFetcher, FetchOptions, FetchResult } from './data-fetchers';

// 数据处理器
export {
  DataProcessorFactory,
  dataProcessorFactory,
} from './data-processors';
export type { DataProcessor, ProcessOptions, ProcessResult } from './data-processors';

// 缓存
export {
  MemoryCacheManager,
  getCacheManager,
  resetCacheManager,
  cacheManager,
  RequestDeduplicator,
  getRequestDeduplicator,
  resetRequestDeduplicator,
  requestDeduplicator,
  debounce,
  throttle,
  debounceWithCache,
  throttleWithCache,
  RequestQueue,
  getRequestQueue,
  resetRequestQueue,
  requestQueue,
} from './cache';

// 统一数据服务（向后兼容）
export { UnifiedStockDataService, unifiedStockDataService } from './UnifiedStockDataService';

// API客户端（向后兼容）
export { ApiClient, apiClient } from './ApiClient';

// 其他服务（向后兼容）
export * from './stockApi';
