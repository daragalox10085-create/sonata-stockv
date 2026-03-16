/**
 * 服务提供者
 * 注册所有服务到依赖注入容器
 */

import { container } from './container';
import { MemoryCacheManager, RequestDeduplicator, RequestQueue } from '../services/cache';
import { DataFetcherFactory } from '../services/data-fetchers';
import { DataProcessorFactory } from '../services/data-processors';
import { apiConfig, appConfig } from '../config';

/**
 * 初始化依赖注入容器
 */
export function initializeContainer(): void {
  // 注册缓存管理器
  container.registerSingleton('cacheManager', () => {
    return new MemoryCacheManager({
      enabled: apiConfig.cache.enabled,
      ttl: apiConfig.cache.ttl,
      maxSize: apiConfig.cache.maxSize,
    });
  });

  // 注册请求去重器
  container.registerSingleton('requestDeduplicator', () => {
    return new RequestDeduplicator({
      enabled: true,
      windowMs: 5000,
    });
  });

  // 注册请求队列
  container.registerSingleton('requestQueue', () => {
    return new RequestQueue(appConfig.performance.maxConcurrentRequests);
  });

  // 注册数据获取器
  container.registerSingleton('tencentFetcher', () => {
    const fetcher = DataFetcherFactory.getFetcher('tencent');
    const cacheManager = container.tryResolve<MemoryCacheManager>('cacheManager');
    if (cacheManager) {
      fetcher.setCache(cacheManager);
    }
    return fetcher;
  });

  container.registerSingleton('eastmoneyFetcher', () => {
    const fetcher = DataFetcherFactory.getFetcher('eastmoney');
    const cacheManager = container.tryResolve<MemoryCacheManager>('cacheManager');
    if (cacheManager) {
      fetcher.setCache(cacheManager);
    }
    return fetcher;
  });

  container.registerSingleton('sinaFetcher', () => {
    const fetcher = DataFetcherFactory.getFetcher('sina');
    const cacheManager = container.tryResolve<MemoryCacheManager>('cacheManager');
    if (cacheManager) {
      fetcher.setCache(cacheManager);
    }
    return fetcher;
  });

  // 注册数据处理器
  container.registerSingleton('stockProcessor', () => {
    return DataProcessorFactory.getProcessor('stock');
  });

  container.registerSingleton('klineProcessor', () => {
    return DataProcessorFactory.getProcessor('kline');
  });

  container.registerSingleton('sectorProcessor', () => {
    return DataProcessorFactory.getProcessor('sector');
  });

  console.log('[DI] Container initialized with services:', container.getRegisteredTokens());
}

/**
 * 获取缓存管理器
 */
export function getCacheManager(): MemoryCacheManager {
  return container.resolve<MemoryCacheManager>('cacheManager');
}

/**
 * 获取请求去重器
 */
export function getRequestDeduplicator(): RequestDeduplicator {
  return container.resolve<RequestDeduplicator>('requestDeduplicator');
}

/**
 * 获取请求队列
 */
export function getRequestQueue(): RequestQueue {
  return container.resolve<RequestQueue>('requestQueue');
}

/**
 * 获取数据获取器
 */
export function getDataFetcher(source: 'tencent' | 'eastmoney' | 'sina') {
  return container.resolve(`{source}Fetcher`);
}

/**
 * 获取数据处理器
 */
export function getDataProcessor(type: 'stock' | 'kline' | 'sector') {
  return container.resolve(`{type}Processor`);
}

// 自动初始化
initializeContainer();
