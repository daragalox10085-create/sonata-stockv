/**
 * 数据获取模块入口
 * 统一的数据获取接口和依赖注入容器
 */

import { apiConfig } from '../../config';
import { DataFetcher, FetchOptions, FetchResult } from './types';
import { TencentDataFetcher } from './tencent.fetcher';
import { EastmoneyDataFetcher } from './eastmoney.fetcher';
import { SinaDataFetcher } from './sina.fetcher';

// 导出类型
export * from './types';

// 导出具体实现
export { TencentDataFetcher } from './tencent.fetcher';
export { EastmoneyDataFetcher } from './eastmoney.fetcher';
export { SinaDataFetcher } from './sina.fetcher';

// 数据获取器工厂
export class DataFetcherFactory {
  private static instances: Map<string, DataFetcher> = new Map();

  /**
   * 获取数据获取器实例
   */
  static getFetcher(name: 'tencent' | 'eastmoney' | 'sina'): DataFetcher {
    if (!this.instances.has(name)) {
      const fetcher = this.createFetcher(name);
      this.instances.set(name, fetcher);
    }
    return this.instances.get(name)!;
  }

  /**
   * 创建数据获取器
   */
  private static createFetcher(name: 'tencent' | 'eastmoney' | 'sina'): DataFetcher {
    switch (name) {
      case 'tencent':
        return new TencentDataFetcher();
      case 'eastmoney':
        return new EastmoneyDataFetcher();
      case 'sina':
        return new SinaDataFetcher();
      default:
        throw new Error(`Unknown fetcher: ${name}`);
    }
  }

  /**
   * 获取所有启用的数据获取器
   */
  static getAllEnabledFetchers(): DataFetcher[] {
    const enabledSources = Object.entries(apiConfig.sources)
      .filter(([, config]) => config.enabled)
      .sort(([, a], [, b]) => a.priority - b.priority);

    return enabledSources.map(([name]) => this.getFetcher(name as 'tencent' | 'eastmoney' | 'sina'));
  }

  /**
   * 清除所有缓存实例
   */
  static clearInstances(): void {
    this.instances.clear();
  }
}

// 优先级的数据获取器（带故障转移）
export class PriorityDataFetcher {
  private fetchers: DataFetcher[];

  constructor(fetchers?: DataFetcher[]) {
    this.fetchers = fetchers || DataFetcherFactory.getAllEnabledFetchers();
  }

  /**
   * 按优先级获取数据
   */
  async fetchWithFallback<T>(
    fetcher: (fetcher: DataFetcher) => Promise<FetchResult<T>>
  ): Promise<FetchResult<T>> {
    const errors: string[] = [];

    for (const fetcherInstance of this.fetchers) {
      try {
        const result = await fetcher(fetcherInstance);
        if (result.success && result.data !== null) {
          return result;
        }
        if (result.error) {
          errors.push(`${fetcherInstance.sourceName}: ${result.error}`);
        }
      } catch (error) {
        errors.push(`${fetcherInstance.sourceName}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      success: false,
      data: null,
      error: `All data sources failed: ${errors.join('; ')}`,
      source: 'fallback',
      timestamp: new Date().toISOString(),
    };
  }
}

// 导出便捷方法
export const dataFetcherFactory = DataFetcherFactory;
export const createPriorityFetcher = (fetchers?: DataFetcher[]) => new PriorityDataFetcher(fetchers);
