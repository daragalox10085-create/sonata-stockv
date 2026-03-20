/**
 * TechnicalService - 技术面分析服务
 * 支撑位、阻力位、趋势分析
 * 
 * 统一错误处理和日志记录
 * 
 * @module services/TechnicalService
 * @version 2.0.0
 */

import { StockConfig } from '../config/stock.config';
import { SupportLevel, TechnicalAnalysis } from '../models/screening.model';
import { logger } from '../utils/logger';
import { AppError, ErrorCode } from '../utils/errors';

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
    try {
      if (!klineData || klineData.length === 0) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'K 线数据为空', { currentPrice });
      }

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
    } catch (error) {
      logger.error('[TechnicalService] 技术分析失败', error, { currentPrice });
      throw error instanceof AppError ? error : new AppError(ErrorCode.UNKNOWN_ERROR, '技术分析失败');
    }
  }

  private calculateSupportLevels(klineData: KLineData[]): SupportLevel[] {
    const supports: SupportLevel[] = [];
    const recentData = klineData.slice(-60);
    const currentPrice = klineData[klineData.length - 1]?.close || 0;
    
    // 1. 近期低点支撑
    const recentLows = this.findRecentLows(recentData, 5);
    recentLows.forEach((low, index) => {
      supports.push({ price: low.price, strength: 85 - index * 5, type: 'recent_low', confidence: 0.85 });
    });
    
    // 2. 均线支撑
    supports.push(...this.calculateMASupports(klineData));
    
    // 3. 黄金分割位支撑
    supports.push(...this.calculateFibonacciSupports(klineData));
    
    // 4. 成交量加权支撑
    supports.push(...this.calculateVolumeWeightedSupports(klineData));
    
    // 5. 布林带下轨支撑
    const bollingerSupport = this.calculateBollingerSupport(klineData);
    if (bollingerSupport) supports.push(bollingerSupport);
    
    // 6. 心理关口支撑
    supports.push(...this.calculatePsychologicalSupports(currentPrice));
    
    return this.consolidateLevels(supports).sort((a, b) => b.strength - a.strength);
  }

  private calculateResistanceLevels(klineData: KLineData[]): SupportLevel[] {
    const resistances: SupportLevel[] = [];
    const recentData = klineData.slice(-60);
    const currentPrice = klineData[klineData.length - 1]?.close || 0;
    
    // 1. 近期高点阻力
    const recentHighs = this.findRecentHighs(recentData, 5);
    recentHighs.forEach((high, index) => {
      resistances.push({ price: high.price, strength: 85 - index * 5, type: 'recent_high', confidence: 0.85 });
    });
    
    // 2. 均线阻力
    resistances.push(...this.calculateMAResistances(klineData));
    
    // 3. 斐波那契阻力位
    resistances.push(...this.calculateFibonacciResistances(klineData));
    
    // 4. 布林带上轨阻力
    const bollingerResistance = this.calculateBollingerResistance(klineData);
    if (bollingerResistance) resistances.push(bollingerResistance);
    
    // 5. 心理关口阻力
    resistances.push(...this.calculatePsychologicalResistances(currentPrice));
    
    return this.consolidateLevels(resistances).sort((a, b) => b.strength - a.strength);
  }

  private calculateVolumeWeightedSupports(klineData: KLineData[]): SupportLevel[] {
    const supports: SupportLevel[] = [];
    const recentData = klineData.slice(-20);
    
    let totalVolume = 0;
    let totalValue = 0;
    
    for (const k of recentData) {
      const typicalPrice = (k.high + k.low + k.close) / 3;
      totalVolume += k.volume;
      totalValue += typicalPrice * k.volume;
    }
    
    if (totalVolume > 0) {
      const vwap = totalValue / totalVolume;
      supports.push({ price: Math.round(vwap * 100) / 100, strength: 75, type: 'volume_weighted', confidence: 0.75 });
    }
    
    const avgVolume = recentData.reduce((sum, k) => sum + k.volume, 0) / recentData.length;
    const highVolumeLows = recentData
      .filter(k => k.volume > avgVolume * 1.5)
      .sort((a, b) => a.low - b.low)
      .slice(0, 3);
    
    highVolumeLows.forEach((k, index) => {
      supports.push({ price: k.low, strength: 70 - index * 5, type: 'high_volume_low', confidence: 0.7 });
    });
    
    return supports;
  }

  private calculateBollingerSupport(klineData: KLineData[]): SupportLevel | null {
    const period = 20;
    if (klineData.length < period) return null;
    
    const prices = klineData.map(k => k.close).slice(-period);
    const ma = prices.reduce((a, b) => a + b, 0) / period;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - ma, 2), 0) / (period - 1);
    const std = Math.sqrt(variance);
    
    return { price: Math.round((ma - 2 * std) * 100) / 100, strength: 72, type: 'bollinger', confidence: 0.72 };
  }

  private calculateBollingerResistance(klineData: KLineData[]): SupportLevel | null {
    const period = 20;
    if (klineData.length < period) return null;
    
    const prices = klineData.map(k => k.close).slice(-period);
    const ma = prices.reduce((a, b) => a + b, 0) / period;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - ma, 2), 0) / (period - 1);
    const std = Math.sqrt(variance);
    
    return { price: Math.round((ma + 2 * std) * 100) / 100, strength: 72, type: 'bollinger', confidence: 0.72 };
  }

  private calculatePsychologicalSupports(currentPrice: number): SupportLevel[] {
    const supports: SupportLevel[] = [];
    const priceLevel = Math.floor(currentPrice);
    
    [100, 50, 20, 10, 5].forEach(level => {
      const supportPrice = Math.floor(priceLevel / level) * level;
      if (supportPrice > 0 && supportPrice < currentPrice) {
        supports.push({ price: supportPrice, strength: 65, type: 'psychological', confidence: 0.65 });
      }
    });
    
    supports.push({ price: Math.round(currentPrice * 0.9 * 100) / 100, strength: 60, type: 'psychological', confidence: 0.6 });
    return supports;
  }

  private calculatePsychologicalResistances(currentPrice: number): SupportLevel[] {
    const resistances: SupportLevel[] = [];
    const priceLevel = Math.ceil(currentPrice);
    
    [100, 50, 20, 10, 5].forEach(level => {
      const resistancePrice = Math.ceil(priceLevel / level) * level;
      if (resistancePrice > currentPrice) {
        resistances.push({ price: resistancePrice, strength: 65, type: 'psychological', confidence: 0.65 });
      }
    });
    
    resistances.push({ price: Math.round(currentPrice * 1.1 * 100) / 100, strength: 60, type: 'psychological', confidence: 0.6 });
    return resistances;
  }

  private findRecentLows(data: KLineData[], count: number) {
    return data.map(k => ({ price: k.low, date: k.date })).sort((a, b) => a.price - b.price).slice(0, count);
  }

  private findRecentHighs(data: KLineData[], count: number) {
    return data.map(k => ({ price: k.high, date: k.date })).sort((a, b) => b.price - a.price).slice(0, count);
  }

  private calculateMASupports(klineData: KLineData[]): SupportLevel[] {
    const supports: SupportLevel[] = [];
    const ma20 = this.calculateMA(klineData, 20);
    const ma60 = this.calculateMA(klineData, 60);
    
    if (ma20 > 0) supports.push({ price: ma20, strength: 70, type: 'ma_support', confidence: 0.7 });
    if (ma60 > 0) supports.push({ price: ma60, strength: 75, type: 'ma_support', confidence: 0.75 });
    
    return supports;
  }

  private calculateMAResistances(klineData: KLineData[]): SupportLevel[] {
    return this.calculateMASupports(klineData);
  }

  private calculateFibonacciSupports(klineData: KLineData[]): SupportLevel[] {
    const supports: SupportLevel[] = [];
    const recentData = klineData.slice(-60);
    const high = Math.max(...recentData.map(k => k.high));
    const low = Math.min(...recentData.map(k => k.low));
    const range = high - low;
    
    if (range <= 0) return supports;
    
    [
      { level: 0.236, strength: 68 }, { level: 0.382, strength: 75 },
      { level: 0.5, strength: 78 }, { level: 0.618, strength: 80 },
      { level: 0.786, strength: 72 }
    ].forEach(({ level, strength }) => {
      supports.push({
        price: Math.round((high - range * level) * 100) / 100,
        strength, type: 'fibonacci', confidence: strength / 100
      });
    });
    
    return supports;
  }

  private calculateFibonacciResistances(klineData: KLineData[]): SupportLevel[] {
    const resistances: SupportLevel[] = [];
    const recentData = klineData.slice(-60);
    const high = Math.max(...recentData.map(k => k.high));
    const low = Math.min(...recentData.map(k => k.low));
    const range = high - low;
    
    if (range <= 0) return resistances;
    
    [
      { level: 1.272, strength: 75 }, { level: 1.618, strength: 80 },
      { level: 2.0, strength: 72 }
    ].forEach(({ level, strength }) => {
      resistances.push({
        price: Math.round((high + range * (level - 1)) * 100) / 100,
        strength, type: 'fibonacci_extension', confidence: strength / 100
      });
    });
    
    return resistances;
  }

  private consolidateLevels(levels: SupportLevel[], threshold: number = 0.02): SupportLevel[] {
    if (levels.length === 0) return levels;
    
    const sorted = [...levels].sort((a, b) => a.price - b.price);
    const result: SupportLevel[] = [];
    let current = sorted[0];
    
    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];
      const diff = Math.abs(next.price - current.price) / current.price;
      
      if (diff < threshold) {
        if (next.strength > current.strength) {
          current = {
            ...next,
            price: (current.price * current.strength + next.price * next.strength) / (current.strength + next.strength),
            strength: Math.max(current.strength, next.strength),
            type: current.type === next.type ? current.type : 'consolidated'
          };
        }
      } else {
        result.push({ ...current, price: Math.round(current.price * 100) / 100 });
        current = next;
      }
    }
    
    result.push({ ...current, price: Math.round(current.price * 100) / 100 });
    return result;
  }

  private analyzeTrend(klineData: KLineData[]): string {
    const ma5 = this.calculateMA(klineData, 5);
    const ma20 = this.calculateMA(klineData, 20);
    const ma60 = this.calculateMA(klineData, 60);
    
    if (ma5 > ma20 && ma20 > ma60) return '强势上涨';
    if (ma5 > ma20) return '短期上涨';
    if (ma5 < ma20 && ma20 < ma60) return '弱势下跌';
    if (ma5 < ma20) return '短期下跌';
    return '震荡整理';
  }

  private calculateMomentumIndicators(klineData: KLineData[]) {
    const prices = klineData.map(k => k.close);
    const rsi = this.calculateRSI(prices);
    
    return {
      rsi,
      isOversold: rsi <= StockConfig.TECHNICAL_ANALYSIS.RSI_OVERSOLD,
      isOverbought: rsi >= StockConfig.TECHNICAL_ANALYSIS.RSI_OVERBOUGHT
    };
  }

  private analyzeVolume(klineData: KLineData[]) {
    const recentVolume = klineData.slice(-5).reduce((sum, k) => sum + k.volume, 0) / 5;
    const avgVolume = klineData.reduce((sum, k) => sum + k.volume, 0) / klineData.length;
    const volumeRatio = recentVolume / avgVolume;
    
    return {
      volumeRatio,
      isVolumeExpanding: volumeRatio >= StockConfig.TECHNICAL_ANALYSIS.VOLUME_MULTIPLIER
    };
  }

  private analyzePosition(klineData: KLineData[], currentPrice: number) {
    const prices = klineData.map(k => k.close);
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const range = high - low;
    const positionInRange = range > 0 ? (currentPrice - low) / range : 0.5;
    
    return {
      positionInRange,
      isAtLowPosition: positionInRange <= StockConfig.TECHNICAL_ANALYSIS.LOW_POSITION_THRESHOLD
    };
  }

  isAtLowPosition(klineData: KLineData[], currentPrice: number): boolean {
    const { isAtLowPosition } = this.analyzePosition(klineData, currentPrice);
    const { isOversold } = this.calculateMomentumIndicators(klineData);
    return isAtLowPosition || isOversold;
  }

  calculateUpsidePotential(currentPrice: number, resistanceLevels: SupportLevel[]): number {
    if (resistanceLevels.length === 0) return 0;
    const validResistances = resistanceLevels.filter(r => r.price > currentPrice).sort((a, b) => a.price - b.price);
    if (validResistances.length === 0) return 0;
    return (validResistances[0].price - currentPrice) / currentPrice;
  }

  calculateDistanceToSupport(currentPrice: number, supportLevels: SupportLevel[]): number {
    if (supportLevels.length === 0) return 0;
    return (currentPrice - supportLevels[0].price) / currentPrice;
  }

  isNearStrongSupport(currentPrice: number, supportLevels: SupportLevel[]): boolean {
    if (supportLevels.length === 0) return false;
    const distance = this.calculateDistanceToSupport(currentPrice, supportLevels);
    return distance <= StockConfig.TECHNICAL_ANALYSIS.SUPPORT_LEVEL_THRESHOLD && supportLevels[0].strength >= 70;
  }

  private calculateMA(klineData: KLineData[], period: number): number {
    if (klineData.length < period) return 0;
    return klineData.slice(-period).reduce((acc, k) => acc + k.close, 0) / period;
  }

  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;
    
    const changes: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }
    
    const recentChanges = changes.slice(-period);
    let avgGain = 0;
    let avgLoss = 0;
    
    for (const change of recentChanges) {
      if (change > 0) avgGain += change;
      else avgLoss += Math.abs(change);
    }
    
    avgGain /= period;
    avgLoss /= period;
    
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
