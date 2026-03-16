/**
 * 数据处理模块入口
 * 统一的数据处理和清洗接口
 */

export * from './types';
export * from './stock.processor';
export * from './kline.processor';
export * from './sector.processor';

// 数据处理器工厂
import { DataProcessor, ProcessorType } from './types';
import { StockDataProcessor } from './stock.processor';
import { KLineDataProcessor } from './kline.processor';
import { SectorDataProcessor } from './sector.processor';

export class DataProcessorFactory {
  private static instances: Map<ProcessorType, DataProcessor<any, any>> = new Map();

  /**
   * 获取数据处理器实例
   */
  static getProcessor<T, R>(type: ProcessorType): DataProcessor<T, R> {
    if (!this.instances.has(type)) {
      const processor = this.createProcessor<T, R>(type);
      this.instances.set(type, processor);
    }
    return this.instances.get(type) as DataProcessor<T, R>;
  }

  /**
   * 创建数据处理器
   */
  private static createProcessor<T, R>(type: ProcessorType): DataProcessor<T, R> {
    switch (type) {
      case 'stock':
        return new StockDataProcessor() as unknown as DataProcessor<T, R>;
      case 'kline':
        return new KLineDataProcessor() as unknown as DataProcessor<T, R>;
      case 'sector':
        return new SectorDataProcessor() as unknown as DataProcessor<T, R>;
      default:
        throw new Error(`Unknown processor type: ${type}`);
    }
  }

  /**
   * 清除所有缓存实例
   */
  static clearInstances(): void {
    this.instances.clear();
  }
}

// 导出便捷方法
export const dataProcessorFactory = DataProcessorFactory;
