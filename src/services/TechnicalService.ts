/**
 * TechnicalService - 技术面分析服务
 * 支撑位、阻力位、趋势分析
 */

import { StockConfig } from '../config/stock.config';
import { SupportLevel, TechnicalAnalysis } from '../models/screening.model';

export interface KLineData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class TechnicalService {
  /**
   * 分析股票技术面
   */
  analyzeTechnical(klineData: KLineData[], currentPrice: number): TechnicalAnalysis {
    const supportLevels = this.calculateSupportLevels(klineData);
    const resistanceLevels = this.calculateResistanceLevels(klineData);
    
    return {
      supportLevels,
      resistanceLevels,
      trendAnalysis: this.analyzeTrend(klineData),
      momentumIndicators: this.calculateMomentumIndicators(klineData),
      volumeAnalysis: this.analyzeVolume(klineData),
      positionAnalysis: this.analyzePosition(klineData, currentPrice),
    };
  }

  /**
   * 计算支撑位
   */
  private calculateSupportLevels(klineData: KLineData[]): SupportLevel[] {
    const supports: SupportLevel[] = [];
    const recentData = klineData.slice(-60); // 最近60根K线
    
    // 1. 近期低点支撑
    const recentLows = this.findRecentLows(recentData, 5);
    recentLows.forEach(low => {
      supports.push({
        price: low.price,
        strength: 80,
        type: 'recent_low',
        confidence: 0.8,
      });
    });
    
    // 2. 均线支撑
    const maSupports = this.calculateMASupports(klineData);
    supports.push(...maSupports);
    
    // 3. 黄金分割位支撑
    const fibonacciSupports = this.calculateFibonacciSupports(klineData);
    supports.push(...fibonacciSupports);
    
    // 按强度排序
    return supports.sort((a, b) => b.strength - a.strength);
  }

  /**
   * 计算阻力位
   */
  private calculateResistanceLevels(klineData: KLineData[]): SupportLevel[] {
    const resistances: SupportLevel[] = [];
    const recentData = klineData.slice(-60);
    
    // 1. 近期高点阻力
    const recentHighs = this.findRecentHighs(recentData, 5);
    recentHighs.forEach(high => {
      resistances.push({
        price: high.price,
        strength: 80,
        type: 'recent_low',
        confidence: 0.8,
      });
    });
    
    // 2. 均线阻力
    const maResistances = this.calculateMAResistances(klineData);
    resistances.push(...maResistances);
    
    return resistances.sort((a, b) => b.strength - a.strength);
  }

  /**
   * 寻找近期低点
   */
  private findRecentLows(data: KLineData[], count: number): Array<{price: number; date: string}> {
    const lows = data.map(k => ({ price: k.low, date: k.date }));
    return lows.sort((a, b) => a.price - b.price).slice(0, count);
  }

  /**
   * 寻找近期高点
   */
  private findRecentHighs(data: KLineData[], count: number): Array<{price: number; date: string}> {
    const highs = data.map(k => ({ price: k.high, date: k.date }));
    return highs.sort((a, b) => b.price - a.price).slice(0, count);
  }

  /**
   * 计算均线支撑
   */
  private calculateMASupports(klineData: KLineData[]): SupportLevel[] {
    const supports: SupportLevel[] = [];
    const ma20 = this.calculateMA(klineData, 20);
    const ma60 = this.calculateMA(klineData, 60);
    
    if (ma20 > 0) {
      supports.push({
        price: ma20,
        strength: 70,
        type: 'ma_support',
        confidence: 0.7,
      });
    }
    
    if (ma60 > 0) {
      supports.push({
        price: ma60,
        strength: 75,
        type: 'ma_support',
        confidence: 0.75,
      });
    }
    
    return supports;
  }

  /**
   * 计算均线阻力
   */
  private calculateMAResistances(klineData: KLineData[]): SupportLevel[] {
    // 与支撑计算类似，但关注上方均线
    return this.calculateMASupports(klineData);
  }

  /**
   * 计算黄金分割位支撑
   */
  private calculateFibonacciSupports(klineData: KLineData[]): SupportLevel[] {
    const supports: SupportLevel[] = [];
    const recentData = klineData.slice(-60);
    
    const high = Math.max(...recentData.map(k => k.high));
    const low = Math.min(...recentData.map(k => k.low));
    const range = high - low;
    
    if (range <= 0) return supports;
    
    const fibLevels = [0.236, 0.382, 0.5, 0.618];
    fibLevels.forEach(level => {
      supports.push({
        price: high - range * level,
        strength: 75,
        type: 'fibonacci',
        confidence: 0.75,
      });
    });
    
    return supports;
  }

  /**
   * 分析趋势
   */
  private analyzeTrend(klineData: KLineData[]): string {
    const ma5 = this.calculateMA(klineData, 5);
    const ma20 = this.calculateMA(klineData, 20);
    const ma60 = this.calculateMA(klineData, 60);
    
    if (ma5 > ma20 && ma20 > ma60) {
      return '强势上涨';
    } else if (ma5 > ma20) {
      return '短期上涨';
    } else if (ma5 < ma20 && ma20 < ma60) {
      return '弱势下跌';
    } else if (ma5 < ma20) {
      return '短期下跌';
    }
    return '震荡整理';
  }

  /**
   * 计算动量指标
   */
  private calculateMomentumIndicators(klineData: KLineData[]): any {
    const prices = klineData.map(k => k.close);
    const rsi = this.calculateRSI(prices);
    
    return {
      rsi,
      isOversold: rsi <= StockConfig.TECHNICAL_ANALYSIS.RSI_OVERSOLD,
      isOverbought: rsi >= StockConfig.TECHNICAL_ANALYSIS.RSI_OVERBOUGHT,
    };
  }

  /**
   * 分析成交量
   */
  private analyzeVolume(klineData: KLineData[]): any {
    const recentVolume = klineData.slice(-5).reduce((sum, k) => sum + k.volume, 0) / 5;
    const avgVolume = klineData.reduce((sum, k) => sum + k.volume, 0) / klineData.length;
    const volumeRatio = recentVolume / avgVolume;
    
    return {
      volumeRatio,
      isVolumeExpanding: volumeRatio >= StockConfig.TECHNICAL_ANALYSIS.VOLUME_MULTIPLIER,
    };
  }

  /**
   * 分析位置
   */
  private analyzePosition(klineData: KLineData[], currentPrice: number): any {
    const prices = klineData.map(k => k.close);
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const range = high - low;
    
    const positionInRange = range > 0 ? (currentPrice - low) / range : 0.5;
    
    return {
      positionInRange,
      isAtLowPosition: positionInRange <= StockConfig.TECHNICAL_ANALYSIS.LOW_POSITION_THRESHOLD,
    };
  }

  /**
   * 判断是否位于低位
   */
  isAtLowPosition(klineData: KLineData[], currentPrice: number): boolean {
    const positionAnalysis = this.analyzePosition(klineData, currentPrice);
    const momentumIndicators = this.calculateMomentumIndicators(klineData);
    
    return positionAnalysis.isAtLowPosition || momentumIndicators.isOversold;
  }

  /**
   * 计算上涨空间
   */
  calculateUpsidePotential(currentPrice: number, resistanceLevels: SupportLevel[]): number {
    if (resistanceLevels.length === 0) return 0;
    
    // 找到最近的阻力位（高于当前价格）
    const validResistances = resistanceLevels
      .filter(r => r.price > currentPrice)
      .sort((a, b) => a.price - b.price);
    
    if (validResistances.length === 0) return 0;
    
    const nearestResistance = validResistances[0];
    return (nearestResistance.price - currentPrice) / currentPrice;
  }

  /**
   * 计算距离支撑位
   */
  calculateDistanceToSupport(currentPrice: number, supportLevels: SupportLevel[]): number {
    if (supportLevels.length === 0) return 0;
    
    const strongestSupport = supportLevels[0];
    return (currentPrice - strongestSupport.price) / currentPrice;
  }

  /**
   * 判断是否接近强力支撑位
   */
  isNearStrongSupport(currentPrice: number, supportLevels: SupportLevel[]): boolean {
    if (supportLevels.length === 0) return false;
    
    const distance = this.calculateDistanceToSupport(currentPrice, supportLevels);
    const strongestSupport = supportLevels[0];
    
    return distance <= StockConfig.TECHNICAL_ANALYSIS.SUPPORT_LEVEL_THRESHOLD &&
           strongestSupport.strength >= 70;
  }

  /**
   * 计算移动平均线
   */
  private calculateMA(klineData: KLineData[], period: number): number {
    if (klineData.length < period) return 0;
    
    const sum = klineData
      .slice(-period)
      .reduce((acc, k) => acc + k.close, 0);
    
    return sum / period;
  }

  /**
   * 计算RSI
   */
  private calculateRSI(prices: number[]): number {
    if (prices.length < 2) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    if (losses === 0) return 100;
    
    const rs = gains / losses;
    return 100 - (100 / (1 + rs));
  }
}

export const technicalService = new TechnicalService();