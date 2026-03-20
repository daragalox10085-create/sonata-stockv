/**
 * API 模块统一导出
 * @module services/api
 * @version 3.0.0
 */

// 类型导出
export * from './types';

// 配置导出
export {
  defaultConfig,
  cacheStrategies,
  getCacheTtlForEndpoint,
  dataSourceCapabilities,
  hasCapability,
  getSourcesForCapability,
  getEnvironmentConfig,
  mergeConfig,
} from './config';

// 错误处理导出
export * from './errors';

// 客户端导出
export { UnifiedApiClient, unifiedApiClient } from './client/UnifiedApiClient';

// 兼容层导出
export {
  ApiCompatibilityLayer,
  legacyApi,
  fetchRealTimeData,
  fetchKLineData,
  searchStockByName,
  getApiLogs,
} from './compatibility';
