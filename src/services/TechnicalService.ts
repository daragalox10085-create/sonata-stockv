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
   * 计算支撑位 - 增强版
   * 综合多种方法：近期低点、均线、斐波那契、成交量加权、布林带、心理关口
   */
  private calculateSupportLevels(klineData: KLineData[]): SupportLevel[] {
    const supports: SupportLevel[] = [];
    const recentData = klineData.slice(-60); // 最近60根K线
    const currentPrice = klineData[klineData.length - 1]?.close || 0;
    
    // 1. 近期低点支撑
    const recentLows = this.findRecentLows(recentData, 5);
    recentLows.forEach((low, index) => {
      supports.push({
        price: low.price,
        strength: 85 - index * 5, // 最近低点强度递减
        type: 'recent_low',
        confidence: 0.85,
      });
    });
    
    // 2. 均线支撑
    const maSupports = this.calculateMASupports(klineData);
    supports.push(...maSupports);
    
    // 3. 黄金分割位支撑
    const fibonacciSupports = this.calculateFibonacciSupports(klineData);
    supports.push(...fibonacciSupports);
    
    // 4. 成交量加权支撑
    const volumeWeightedSupports = this.calculateVolumeWeightedSupports(klineData);
    supports.push(...volumeWeightedSupports);
    
    // 5. 布林带下轨支撑
    const bollingerSupport = this.calculateBollingerSupport(klineData);
    if (bollingerSupport) supports.push(bollingerSupport);
    
    // 6. 心理关口支撑
    const psychologicalSupports = this.calculatePsychologicalSupports(currentPrice);
    supports.push(...psychologicalSupports);
    
    // 去重并排序（价格接近的合并）
    return this.consolidateLevels(supports).sort((a, b) => b.strength - a.strength);
  }

  /**
   * 计算阻力位 - 增强版
   * 综合多种方法：近期高点、均线、斐波那契、布林带、心理关口
   */
  private calculateResistanceLevels(klineData: KLineData[]): SupportLevel[] {
    const resistances: SupportLevel[] = [];
    const recentData = klineData.slice(-60);
    const currentPrice = klineData[klineData.length - 1]?.close || 0;
    
    // 1. 近期高点阻力
    const recentHighs = this.findRecentHighs(recentData, 5);
    recentHighs.forEach((high, index) => {
      resistances.push({
        price: high.price,
        strength: 85 - index * 5,
        type: 'recent_high',
        confidence: 0.85,
      });
    });
    
    // 2. 均线阻力
    const maResistances = this.calculateMAResistances(klineData);
    resistances.push(...maResistances);
    
    // 3. 斐波那契阻力位
    const fibonacciResistances = this.calculateFibonacciResistances(klineData);
    resistances.push(...fibonacciResistances);
    
    // 4. 布林带上轨阻力
    const bollingerResistance = this.calculateBollingerResistance(klineData);
    if (bollingerResistance) resistances.push(bollingerResistance);
    
    // 5. 心理关口阻力
    const psychologicalResistances = this.calculatePsychologicalResistances(currentPrice);
    resistances.push(...psychologicalResistances);
    
    // 去重并排序
    return this.consolidateLevels(resistances).sort((a, b) => b.strength - a.strength);
  }

  /**
   * 计算成交量加权支撑位
   * 在成交量大的价格区域形成强支撑
   */
  private calculateVolumeWeightedSupports(klineData: KLineData[]): SupportLevel[] {
    const supports: SupportLevel[] = [];
    const recentData = klineData.slice(-20); // 最近20天
    
    // 计算成交量加权平均价格 (VWAP)
    let totalVolume = 0;
    let totalValue = 0;
    
    for (const k of recentData) {
      const typicalPrice = (k.high + k.low + k.close) / 3;
      totalVolume += k.volume;
      totalValue += typicalPrice * k.volume;
    }
    
    if (totalVolume > 0) {
      const vwap = totalValue / totalVolume;
      supports.push({
        price: Math.round(vwap * 100) / 100,
        strength: 75,
        type: 'volume_weighted',
        confidence: 0.75,
      });
    }
    
    // 找出高成交量低点
    const avgVolume = recentData.reduce((sum, k) => sum + k.volume, 0) / recentData.length;
    const highVolumeLows = recentData
      .filter(k => k.volume > avgVolume * 1.5)
      .sort((a, b) => a.low - b.low)
      .slice(0, 3);
    
    highVolumeLows.forEach((k, index) => {
      supports.push({
        price: k.low,
        strength: 70 - index * 5,
        type: 'high_volume_low',
        confidence: 0.7,
      });
    });
    
    return supports;
  }

  /**
   * 计算布林带支撑
   */
  private calculateBollingerSupport(klineData: KLineData[]): SupportLevel | null {
    const period = 20;
    if (klineData.length < period) return null;
    
    const prices = klineData.map(k => k.close);
    const recent = prices.slice(-period);
    const ma = recent.reduce((a, b) => a + b, 0) / period;
    const variance = recent.reduce((sum, p) => sum + Math.pow(p - ma, 2), 0) / (period - 1);
    const std = Math.sqrt(variance);
    const lower = ma - 2 * std;
    
    return {
      price: Math.round(lower * 100) / 100,
      strength: 72,
      type: 'bollinger',
      confidence: 0.72,
    };
  }

  /**
   * 计算布林带阻力
   */
  private calculateBollingerResistance(klineData: KLineData[]): SupportLevel | null {
    const period = 20;
    if (klineData.length < period) return null;
    
    const prices = klineData.map(k => k.close);
    const recent = prices.slice(-period);
    const ma = recent.reduce((a, b) => a + b, 0) / period;
    const variance = recent.reduce((sum, p) => sum + Math.pow(p - ma, 2), 0) / (period - 1);
    const std = Math.sqrt(variance);
    const upper = ma + 2 * std;
    
    return {
      price: Math.round(upper * 100) / 100,
      strength: 72,
      type: 'bollinger',
      confidence: 0.72,
    };
  }

  /**
   * 计算心理关口支撑
   * 整数位和心理价位形成支撑
   */
  private calculatePsychologicalSupports(currentPrice: number): SupportLevel[] {
    const supports: SupportLevel[] = [];
    const priceLevel = Math.floor(currentPrice);
    
    // 主要整数位
    const majorLevels = [100, 50, 20, 10, 5];
    for (const level of majorLevels) {
      const supportPrice = Math.floor(priceLevel / level) * level;
      if (supportPrice > 0 && supportPrice < currentPrice) {
        supports.push({
          price: supportPrice,
          strength: 65,
          type: 'psychological',
          confidence: 0.65,
        });
      }
    }
    
    // 当前价格的0.9倍作为心理支撑
    supports.push({
      price: Math.round(currentPrice * 0.9 * 100) / 100,
      strength: 60,
      type: 'psychological',
      confidence: 0.6,
    });
    
    return supports;
  }

  /**
   * 计算心理关口阻力
   */
  private calculatePsychologicalResistances(currentPrice: number): SupportLevel[] {
    const resistances: SupportLevel[] = [];
    const priceLevel = Math.ceil(currentPrice);
    
    // 主要整数位
    const majorLevels = [100, 50, 20, 10, 5];
    for (const level of majorLevels) {
      const resistancePrice = Math.ceil(priceLevel / level) * level;
      if (resistancePrice > currentPrice) {
        resistances.push({
          price: resistancePrice,
          strength: 65,
          type: 'psychological',
          confidence: 0.65,
        });
      }
    }
    
    // 当前价格的1.1倍作为心理阻力
    resistances.push({
      price: Math.round(currentPrice * 1.1 * 100) / 100,
      strength: 60,
      type: 'psychological',
      confidence: 0.6,
    });
    
    return resistances;
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
   * 计算斐波那契支撑位
   */
  private calculateFibonacciSupports(klineData: KLineData[]): SupportLevel[] {
    const supports: SupportLevel[] = [];
    const recentData = klineData.slice(-60);
    
    const high = Math.max(...recentData.map(k => k.high));
    const low = Math.min(...recentData.map(k => k.low));
    const range = high - low;
    
    if (range <= 0) return supports;
    
    // 斐波那契回调位
    const fibLevels = [
      { level: 0.236, strength: 68 },
      { level: 0.382, strength: 75 },
      { level: 0.5, strength: 78 },
      { level: 0.618, strength: 80 },
      { level: 0.786, strength: 72 }
    ];
    
    fibLevels.forEach(({ level, strength }) => {
      supports.push({
        price: Math.round((high - range * level) * 100) / 100,
        strength,
        type: 'fibonacci',
        confidence: strength / 100,
      });
    });
    
    return supports;
  }

  /**
   * 计算斐波那契阻力位
   */
  private calculateFibonacciResistances(klineData: KLineData[]): SupportLevel[] {
    const resistances: SupportLevel[] = [];
    const recentData = klineData.slice(-60);
    
    const high = Math.max(...recentData.map(k => k.high));
    const low = Math.min(...recentData.map(k => k.low));
    const range = high - low;
    
    if (range <= 0) return resistances;
    
    // 斐波那契扩展位
    const fibExtensions = [
      { level: 1.272, strength: 75 },
      { level: 1.618, strength: 80 },
      { level: 2.0, strength: 72 }
    ];
    
    fibExtensions.forEach(({ level, strength }) => {
      resistances.push({
        price: Math.round((high + range * (level - 1)) * 100) / 100,
        strength,
        type: 'fibonacci_extension',
        confidence: strength / 100,
      });
    });
    
    return resistances;
  }

  /**
   * 合并价格接近的支撑位/阻力位
   * @param levels - 价格水平数组
   * @param threshold - 合并阈值（默认2%）
   * @returns 合并后的价格水平
   */
  private consolidateLevels(levels: SupportLevel[], threshold: number = 0.02): SupportLevel[] {
    if (levels.length === 0) return levels;
    
    // 按价格排序
    const sorted = [...levels].sort((a, b) => a.price - b.price);
    const result: SupportLevel[] = [];
    
    let current = sorted[0];
    
    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];
      const diff = Math.abs(next.price - current.price) / current.price;
      
      if (diff < threshold) {
        // 合并，取强度更高的
        if (next.strength > current.strength) {
          current = {
            ...next,
            price: (current.price * current.strength + next.price * next.strength) / 
                   (current.strength + next.strength), // 加权平均
            strength: Math.max(current.strength, next.strength),
            type: current.type === next.type ? current.type : 'consolidated',
          };
        }
      } else {
        result.push({
          ...current,
          price: Math.round(current.price * 100) / 100
        });
        current = next;
      }
    }
    
    result.push({
      ...current,
      price: Math.round(current.price * 100) / 100
    });
    
    return result;
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
   * 计算RSI (Relative Strength Index)
   * 使用 Wilder's smoothing 方法，符合标准 RSI 计算规范
   * @param prices - 价格数组
   * @param period - 计算周期，默认14
   * @returns RSI 值 (0-100)
   */
  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;
    
    // 计算价格变化
    const changes: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }
    
    // 取最近 period 个变化值计算初始平均
    const recentChanges = changes.slice(-period);
    
    let avgGain = 0;
    let avgLoss = 0;
    
    for (const change of recentChanges) {
      if (change > 0) {
        avgGain += change;
      } else {
        avgLoss += Math.abs(change);
      }
    }
    
    avgGain /= period;
    avgLoss /= period;
    
    // 使用 Wilder's smoothing 计算后续平均值
    const remainingChanges = changes.slice(0, -period);
    for (const change of remainingChanges) {
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;
      
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
}

export const technicalService = new TechnicalService();