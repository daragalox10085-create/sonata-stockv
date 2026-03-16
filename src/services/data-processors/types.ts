/**
 * 数据处理模块类型定义
 */

// 处理器类型
export type ProcessorType = 'stock' | 'kline' | 'sector' | 'indicator' | 'screening';

// 处理选项
export interface ProcessOptions {
  // 是否验证数据
  validate?: boolean;
  // 是否清洗数据
  clean?: boolean;
  // 是否标准化数据
  normalize?: boolean;
  // 是否填充缺失值
  fillMissing?: boolean;
  // 额外参数
  params?: Record<string, any>;
}

// 处理结果
export interface ProcessResult<T> {
  success: boolean;
  data: T | null;
  errors: string[];
  warnings: string[];
  metadata: {
    inputCount: number;
    outputCount: number;
    processingTime: number;
    timestamp: string;
  };
}

// 数据处理器接口
export interface DataProcessor<T, R> {
  // 处理器名称
  readonly name: string;
  
  // 处理器类型
  readonly type: ProcessorType;

  /**
   * 处理数据
   */
  process(data: T, options?: ProcessOptions): ProcessResult<R>;

  /**
   * 验证数据
   */
  validate(data: T): boolean;

  /**
   * 清洗数据
   */
  clean(data: T): T;

  /**
   * 标准化数据
   */
  normalize(data: T): T;
}

// 数据质量报告
export interface DataQualityReport {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  missingFields: Map<string, number>;
  outliers: Map<string, number>;
  duplicates: number;
  score: number; // 0-100
}

// 数据转换选项
export interface TransformOptions {
  // 输入格式
  inputFormat?: 'raw' | 'normalized' | 'standardized';
  // 输出格式
  outputFormat?: 'raw' | 'normalized' | 'standardized';
  // 字段映射
  fieldMapping?: Record<string, string>;
  // 数据类型转换
  typeConversion?: Record<string, 'string' | 'number' | 'boolean' | 'date'>;
}

// 批量处理选项
export interface BatchProcessOptions extends ProcessOptions {
  // 并发数
  concurrency?: number;
  // 批处理大小
  batchSize?: number;
  // 错误处理策略
  errorStrategy?: 'continue' | 'stop' | 'skip';
}

// 批量处理结果
export interface BatchProcessResult<T> {
  results: ProcessResult<T>[];
  summary: {
    total: number;
    success: number;
    failed: number;
    totalTime: number;
  };
}
