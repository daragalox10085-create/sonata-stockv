/**
 * 股票数据处理器
 */

import { StockQuote } from '../../types/DataContract';
import { BaseDataProcessor } from './base.processor';
import { ProcessOptions, DataQualityReport } from './types';

export interface ProcessedStockData {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  marketCap: number;
  pe: number;
  pb: number;
  // 计算指标
  dayRange: number;
  positionInRange: number;
  volatility: number;
  // 质量标记
  isValid: boolean;
  qualityScore: number;
}

export class StockDataProcessor extends BaseDataProcessor<StockQuote, ProcessedStockData> {
  readonly name = 'StockDataProcessor';
  readonly type = 'stock' as const;

  /**
   * 执行具体处理逻辑
   */
  protected doProcess(data: StockQuote, options: ProcessOptions): ProcessedStockData {
    const dayRange = data.high - data.low;
    const positionInRange = dayRange > 0 
      ? ((data.currentPrice - data.low) / dayRange) * 100 
      : 50;
    
    // 计算波动率（基于日内振幅）
    const volatility = data.close > 0 
      ? ((data.high - data.low) / data.close) * 100 
      : 0;

    // 计算质量分数
    const qualityScore = this.calculateQualityScore(data);

    return {
      symbol: data.symbol,
      name: data.name,
      currentPrice: this.normalizePrice(data.currentPrice),
      change: this.normalizePrice(data.change),
      changePercent: this.normalizePercent(data.changePercent),
      open: this.normalizePrice(data.open),
      high: this.normalizePrice(data.high),
      low: this.normalizePrice(data.low),
      close: this.normalizePrice(data.close),
      volume: data.volume,
      marketCap: data.marketCap,
      pe: data.pe || 0,
      pb: data.pb || 0,
      dayRange: this.normalizePrice(dayRange),
      positionInRange: this.normalizePercent(positionInRange),
      volatility: this.normalizePercent(volatility),
      isValid: qualityScore >= 60,
      qualityScore,
    };
  }

  /**
   * 计算质量分数
   */
  private calculateQualityScore(data: StockQuote): number {
    let score = 100;

    // 检查必要字段
    if (!this.isValidNumber(data.currentPrice) || data.currentPrice <= 0) score -= 30;
    if (!this.isValidNumber(data.volume) || data.volume < 0) score -= 20;
    if (!this.isValidString(data.name)) score -= 10;
    if (!this.isValidString(data.symbol)) score -= 10;

    // 检查价格合理性
    if (data.high < data.low) score -= 20;
    if (data.currentPrice > data.high * 1.1 || data.currentPrice < data.low * 0.9) score -= 15;

    // 检查成交量合理性
    if (data.volume === 0) score -= 10;

    return Math.max(0, score);
  }

  /**
   * 验证数据
   */
  validate(data: StockQuote): boolean {
    if (!data) return false;
    
    // 检查必要字段
    if (!this.isValidString(data.symbol)) return false;
    if (!this.isValidNumber(data.currentPrice) || data.currentPrice <= 0) return false;
    if (!this.isValidNumber(data.high) || !this.isValidNumber(data.low)) return false;
    
    return true;
  }

  /**
   * 清洗数据
   */
  clean(data: StockQuote): StockQuote {
    return {
      ...data,
      symbol: String(data.symbol || '').trim(),
      name: String(data.name || '').trim() || data.symbol,
      currentPrice: this.safeParseNumber(data.currentPrice, 0),
      change: this.safeParseNumber(data.change, 0),
      changePercent: this.safeParseNumber(data.changePercent, 0),
      open: this.safeParseNumber(data.open, data.currentPrice),
      high: this.safeParseNumber(data.high, data.currentPrice),
      low: this.safeParseNumber(data.low, data.currentPrice),
      close: this.safeParseNumber(data.close, data.currentPrice),
      volume: this.safeParseInt(data.volume, 0),
      marketCap: this.safeParseNumber(data.marketCap, 0),
      pe: this.safeParseNumber(data.pe, 0),
      pb: this.safeParseNumber(data.pb, 0),
    };
  }

  /**
   * 标准化数据
   */
  normalize(data: StockQuote): StockQuote {
    // 确保价格一致性
    let { high, low, open, close, currentPrice } = data;
    
    // 修正高低点
    const actualHigh = Math.max(high, low, open, close, currentPrice);
    const actualLow = Math.min(high, low, open, close, currentPrice);
    
    return {
      ...data,
      high: actualHigh,
      low: actualLow,
    };
  }

  /**
   * 生成数据质量报告
   */
  generateQualityReport(data: StockQuote): DataQualityReport {
    const missingFields = new Map<string, number>();
    const outliers = new Map<string, number>();

    // 检查缺失字段
    if (!this.isValidNumber(data.currentPrice)) missingFields.set('currentPrice', 1);
    if (!this.isValidNumber(data.volume)) missingFields.set('volume', 1);
    if (!this.isValidString(data.name)) missingFields.set('name', 1);

    // 检查异常值
    if (data.changePercent > 20 || data.changePercent < -20) {
      outliers.set('changePercent', 1);
    }
    if (data.pe > 1000 || data.pe < 0) {
      outliers.set('pe', 1);
    }

    const qualityScore = this.calculateQualityScore(data);

    return {
      totalRecords: 1,
      validRecords: qualityScore >= 60 ? 1 : 0,
      invalidRecords: qualityScore < 60 ? 1 : 0,
      missingFields,
      outliers,
      duplicates: 0,
      score: qualityScore,
    };
  }

  /**
   * 统计输入数据量
   */
  protected countInput(data: StockQuote): number {
    return 1;
  }

  /**
   * 统计输出数据量
   */
  protected countOutput(data: ProcessedStockData): number {
    return 1;
  }
}
