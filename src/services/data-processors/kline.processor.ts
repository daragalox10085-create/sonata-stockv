/**
 * K线数据处理器
 */

import { KLinePoint } from '../../types/DataContract';
import { BaseDataProcessor } from './base.processor';
import { ProcessOptions, DataQualityReport } from './types';

export interface ProcessedKLineData {
  data: KLinePoint[];
  // 技术指标
  indicators: {
    ma5: number[];
    ma10: number[];
    ma20: number[];
    ma60: number[];
    rsi: number[];
    macd: {
      dif: number[];
      dea: number[];
      histogram: number[];
    };
    bollinger: {
      upper: number[];
      middle: number[];
      lower: number[];
    };
  };
  // 统计信息
  statistics: {
    highest: number;
    lowest: number;
    avgVolume: number;
    volatility: number;
    trend: 'up' | 'down' | 'sideways';
  };
  // 质量标记
  isValid: boolean;
  qualityScore: number;
}

export class KLineDataProcessor extends BaseDataProcessor<KLinePoint[], ProcessedKLineData> {
  readonly name = 'KLineDataProcessor';
  readonly type = 'kline' as const;

  /**
   * 执行具体处理逻辑
   */
  protected doProcess(data: KLinePoint[], options: ProcessOptions): ProcessedKLineData {
    // 计算移动平均线
    const ma5 = this.calculateMA(data, 5);
    const ma10 = this.calculateMA(data, 10);
    const ma20 = this.calculateMA(data, 20);
    const ma60 = this.calculateMA(data, 60);

    // 计算RSI
    const rsi = this.calculateRSI(data, 14);

    // 计算MACD
    const macd = this.calculateMACD(data);

    // 计算布林带
    const bollinger = this.calculateBollinger(data, 20);

    // 计算统计信息
    const statistics = this.calculateStatistics(data);

    // 计算质量分数
    const qualityScore = this.calculateQualityScore(data);

    return {
      data,
      indicators: {
        ma5,
        ma10,
        ma20,
        ma60,
        rsi,
        macd,
        bollinger,
      },
      statistics,
      isValid: qualityScore >= 70,
      qualityScore,
    };
  }

  /**
   * 计算移动平均线
   */
  private calculateMA(data: KLinePoint[], period: number): number[] {
    const result: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(NaN);
        continue;
      }
      
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      result.push(this.normalizePrice(sum / period));
    }
    
    return result;
  }

  /**
   * 计算RSI
   */
  private calculateRSI(data: KLinePoint[], period: number = 14): number[] {
    const result: number[] = [];
    let gains = 0;
    let losses = 0;

    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        result.push(50);
        continue;
      }

      const change = data[i].close - data[i - 1].close;
      
      if (i <= period) {
        if (change > 0) gains += change;
        else losses += Math.abs(change);
        
        if (i === period) {
          gains /= period;
          losses /= period;
        }
        result.push(50);
        continue;
      }

      const currentGain = change > 0 ? change : 0;
      const currentLoss = change < 0 ? Math.abs(change) : 0;

      gains = (gains * (period - 1) + currentGain) / period;
      losses = (losses * (period - 1) + currentLoss) / period;

      const rs = losses === 0 ? 100 : gains / losses;
      const rsi = 100 - (100 / (1 + rs));
      result.push(this.normalizePrice(rsi));
    }

    return result;
  }

  /**
   * 计算MACD
   */
  private calculateMACD(data: KLinePoint[]): { dif: number[]; dea: number[]; histogram: number[] } {
    const ema12 = this.calculateEMA(data.map(d => d.close), 12);
    const ema26 = this.calculateEMA(data.map(d => d.close), 26);
    
    const dif: number[] = [];
    for (let i = 0; i < data.length; i++) {
      dif.push(this.normalizePrice(ema12[i] - ema26[i]));
    }
    
    const dea = this.calculateEMA(dif, 9);
    
    const histogram: number[] = [];
    for (let i = 0; i < data.length; i++) {
      histogram.push(this.normalizePrice((dif[i] || 0) - (dea[i] || 0)));
    }

    return { dif, dea, histogram };
  }

  /**
   * 计算EMA
   */
  private calculateEMA(data: number[], period: number): number[] {
    const result: number[] = [];
    const multiplier = 2 / (period + 1);

    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        result.push(data[i]);
      } else {
        const ema = (data[i] - result[i - 1]) * multiplier + result[i - 1];
        result.push(ema);
      }
    }

    return result;
  }

  /**
   * 计算布林带
   */
  private calculateBollinger(data: KLinePoint[], period: number = 20): { upper: number[]; middle: number[]; lower: number[] } {
    const middle = this.calculateMA(data, period);
    const upper: number[] = [];
    const lower: number[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        upper.push(NaN);
        lower.push(NaN);
        continue;
      }

      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += Math.pow(data[i - j].close - (middle[i] || 0), 2);
      }
      const std = Math.sqrt(sum / period);

      upper.push(this.normalizePrice((middle[i] || 0) + 2 * std));
      lower.push(this.normalizePrice((middle[i] || 0) - 2 * std));
    }

    return { upper, middle, lower };
  }

  /**
   * 计算统计信息
   */
  private calculateStatistics(data: KLinePoint[]): { highest: number; lowest: number; avgVolume: number; volatility: number; trend: 'up' | 'down' | 'sideways' } {
    const closes = data.map(d => d.close);
    const volumes = data.map(d => d.volume);
    
    const highest = Math.max(...data.map(d => d.high));
    const lowest = Math.min(...data.map(d => d.low));
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    
    // 计算波动率（标准差/均值）
    const mean = closes.reduce((a, b) => a + b, 0) / closes.length;
    const variance = closes.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / closes.length;
    const volatility = (Math.sqrt(variance) / mean) * 100;

    // 判断趋势
    const firstPrice = data[0]?.close || 0;
    const lastPrice = data[data.length - 1]?.close || 0;
    const changePercent = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
    
    let trend: 'up' | 'down' | 'sideways' = 'sideways';
    if (changePercent > 5) trend = 'up';
    else if (changePercent < -5) trend = 'down';

    return {
      highest: this.normalizePrice(highest),
      lowest: this.normalizePrice(lowest),
      avgVolume: Math.round(avgVolume),
      volatility: this.normalizePercent(volatility),
      trend,
    };
  }

  /**
   * 计算质量分数
   */
  private calculateQualityScore(data: KLinePoint[]): number {
    if (data.length === 0) return 0;

    let score = 100;

    // 检查数据量
    if (data.length < 5) score -= 30;
    else if (data.length < 20) score -= 10;

    // 检查数据完整性
    let invalidCount = 0;
    for (const point of data) {
      if (!this.isValidNumber(point.open) || point.open <= 0) invalidCount++;
      if (!this.isValidNumber(point.close) || point.close <= 0) invalidCount++;
      if (!this.isValidNumber(point.high) || point.high <= 0) invalidCount++;
      if (!this.isValidNumber(point.low) || point.low <= 0) invalidCount++;
      if (point.high < point.low) invalidCount++;
    }

    if (invalidCount > 0) {
      score -= Math.min(50, (invalidCount / data.length) * 50);
    }

    return Math.max(0, score);
  }

  /**
   * 验证数据
   */
  validate(data: KLinePoint[]): boolean {
    if (!Array.isArray(data) || data.length === 0) return false;
    
    // 至少要有5条数据
    if (data.length < 5) return false;

    // 检查数据有效性
    for (const point of data) {
      if (!this.isValidNumber(point.open) || point.open <= 0) return false;
      if (!this.isValidNumber(point.close) || point.close <= 0) return false;
      if (!this.isValidNumber(point.high) || point.high <= 0) return false;
      if (!this.isValidNumber(point.low) || point.low <= 0) return false;
      if (point.high < point.low) return false;
    }

    return true;
  }

  /**
   * 清洗数据
   */
  clean(data: KLinePoint[]): KLinePoint[] {
    return data.map(point => ({
      date: String(point.date || '').trim(),
      open: this.safeParseNumber(point.open, 0),
      close: this.safeParseNumber(point.close, 0),
      high: this.safeParseNumber(point.high, 0),
      low: this.safeParseNumber(point.low, 0),
      volume: this.safeParseInt(point.volume, 0),
    })).filter(point => 
      point.open > 0 && 
      point.close > 0 && 
      point.high > 0 && 
      point.low > 0 &&
      point.date.length > 0
    );
  }

  /**
   * 标准化数据
   */
  normalize(data: KLinePoint[]): KLinePoint[] {
    return data.map(point => {
      // 确保价格一致性
      const actualHigh = Math.max(point.open, point.close, point.high);
      const actualLow = Math.min(point.open, point.close, point.low);
      
      return {
        ...point,
        high: actualHigh,
        low: actualLow,
        open: this.normalizePrice(point.open),
        close: this.normalizePrice(point.close),
      };
    });
  }

  /**
   * 生成数据质量报告
   */
  generateQualityReport(data: KLinePoint[]): DataQualityReport {
    const missingFields = new Map<string, number>();
    const outliers = new Map<string, number>();

    let invalidCount = 0;
    let outlierCount = 0;

    for (const point of data) {
      // 检查缺失字段
      if (!point.date) missingFields.set('date', (missingFields.get('date') || 0) + 1);
      if (!this.isValidNumber(point.open)) missingFields.set('open', (missingFields.get('open') || 0) + 1);
      if (!this.isValidNumber(point.close)) missingFields.set('close', (missingFields.get('close') || 0) + 1);

      // 检查异常值
      const priceRange = point.high - point.low;
      if (priceRange > point.close * 0.2) { // 日内振幅超过20%
        outlierCount++;
      }

      if (!this.validate([point])) {
        invalidCount++;
      }
    }

    if (outlierCount > 0) {
      outliers.set('highVolatility', outlierCount);
    }

    const qualityScore = this.calculateQualityScore(data);

    return {
      totalRecords: data.length,
      validRecords: data.length - invalidCount,
      invalidRecords: invalidCount,
      missingFields,
      outliers,
      duplicates: 0,
      score: qualityScore,
    };
  }

  /**
   * 统计输入数据量
   */
  protected countInput(data: KLinePoint[]): number {
    return data.length;
  }

  /**
   * 统计输出数据量
   */
  protected countOutput(data: ProcessedKLineData): number {
    return data.data.length;
  }
}