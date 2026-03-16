/**
 * 数据处理器基类
 */

import { 
  DataProcessor, 
  ProcessOptions, 
  ProcessResult, 
  ProcessorType,
  DataQualityReport 
} from './types';

export abstract class BaseDataProcessor<T, R> implements DataProcessor<T, R> {
  abstract readonly name: string;
  abstract readonly type: ProcessorType;

  /**
   * 处理数据的主方法
   */
  process(data: T, options: ProcessOptions = {}): ProcessResult<R> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 验证数据
      if (options.validate !== false) {
        if (!this.validate(data)) {
          errors.push('Data validation failed');
          return this.createErrorResult(errors, warnings, startTime);
        }
      }

      // 清洗数据
      let cleanedData = data;
      if (options.clean !== false) {
        cleanedData = this.clean(data);
      }

      // 标准化数据
      let normalizedData = cleanedData;
      if (options.normalize !== false) {
        normalizedData = this.normalize(cleanedData);
      }

      // 执行具体处理逻辑
      const result = this.doProcess(normalizedData as unknown as T, options);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: result,
        errors,
        warnings,
        metadata: {
          inputCount: this.countInput(data),
          outputCount: this.countOutput(result),
          processingTime,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      return this.createErrorResult(errors, warnings, startTime);
    }
  }

  /**
   * 创建错误结果
   */
  protected createErrorResult(
    errors: string[], 
    warnings: string[], 
    startTime: number
  ): ProcessResult<R> {
    return {
      success: false,
      data: null,
      errors,
      warnings,
      metadata: {
        inputCount: 0,
        outputCount: 0,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * 统计输入数据量
   */
  protected abstract countInput(data: T): number;

  /**
   * 统计输出数据量
   */
  protected abstract countOutput(data: R): number;

  /**
   * 执行具体处理逻辑（子类实现）
   */
  protected abstract doProcess(data: T, options: ProcessOptions): R;

  /**
   * 验证数据（子类实现）
   */
  abstract validate(data: T): boolean;

  /**
   * 清洗数据（子类实现）
   */
  abstract clean(data: T): T;

  /**
   * 标准化数据（子类实现）
   */
  abstract normalize(data: T): T;

  /**
   * 生成数据质量报告
   */
  abstract generateQualityReport(data: T): DataQualityReport;

  /**
   * 检查数值是否有效
   */
  protected isValidNumber(value: any): boolean {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
  }

  /**
   * 检查字符串是否有效
   */
  protected isValidString(value: any): boolean {
    return typeof value === 'string' && value.trim().length > 0;
  }

  /**
   * 安全解析数字
   */
  protected safeParseNumber(value: any, defaultValue: number = 0): number {
    if (value === null || value === undefined) return defaultValue;
    const parsed = parseFloat(String(value));
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * 安全解析整数
   */
  protected safeParseInt(value: any, defaultValue: number = 0): number {
    if (value === null || value === undefined) return defaultValue;
    const parsed = parseInt(String(value), 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * 标准化价格（保留2位小数）
   */
  protected normalizePrice(price: number): number {
    return Math.round(price * 100) / 100;
  }

  /**
   * 标准化百分比（保留2位小数）
   */
  protected normalizePercent(percent: number): number {
    return Math.round(percent * 100) / 100;
  }

  /**
   * 检测异常值
   */
  protected detectOutliers(values: number[], threshold: number = 3): number[] {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length);
    
    return values.map((value, index) => {
      const zScore = Math.abs((value - mean) / std);
      return zScore > threshold ? index : -1;
    }).filter(i => i !== -1);
  }
}
