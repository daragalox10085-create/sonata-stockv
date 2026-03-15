/**
 * StockPickerService - 精选股票池服务
 * 基于热门板块 + 支撑位算法推荐股票
 */

import { hotSectorService, SectorData } from './HotSectorService';
import { unifiedStockDataService } from './UnifiedStockDataService';

export interface StockRecommendation {
  code: string;
  name: string;
  sector: string; // 所属板块
  sectorCode: string;
  score: number; // 综合评分 0-100
  confidence: 'high' | 'medium' | 'low';
  
  // 价格相关
  currentPrice: number;
  supportPrice: number; // 支撑位
  resistancePrice: number; // 压力位
  stopLossPrice: number; // 止损位
  
  // 涨幅
  changePercent: number;
  sectorChangePercent: number;
  
  // 资金流向
  mainForceNet: number;
  
  // 推荐理由
  reason: string;
  
  // 技术指标
  technicals: {
    rsi: number;
    isNearSupport: boolean; // 是否在支撑位附近
    supportDistance: number; // 距离支撑位的百分比
    trend: 'up' | 'down' | 'sideways';
  };
}

export class StockPickerService {
  /**
   * 从热门板块中精选股票
   * 算法：
   * 1. 获取热门板块前6名
   * 2. 获取每个板块的成分股
   * 3. 筛选出接近支撑位的股票（距离<5%）
   * 4. 按综合评分排序
   */
  async pickStocksFromHotSectors(
    maxStocks: number = 5,
    supportThreshold: number = 0.05 // 距离支撑位5%以内
  ): Promise<StockRecommendation[]> {
    
    console.log('[精选股票池] 开始从热门板块选股...');
    
    // 1. 获取热门板块
    const hotSectors = await hotSectorService.fetchHotSectors(6);
    console.log(`[精选股票池] 获取到 ${hotSectors.length} 个热门板块`);
    
    if (hotSectors.length === 0) {
      return [];
    }
    
    // 2. 从每个板块获取成分股详情
    const allCandidates: StockRecommendation[] = [];
    
    for (const sector of hotSectors) {
      if (!sector.topStocks || sector.topStocks.length === 0) continue;
      
      console.log(`[精选股票池] 分析板块 ${sector.name} (${sector.topStocks.length}只成分股)`);
      
      for (const stock of sector.topStocks) {
        try {
          // 获取股票详细数据
          const recommendation = await this.analyzeStock(
            stock.code,
            stock.name,
            sector
          );
          
          if (recommendation) {
            allCandidates.push(recommendation);
          }
        } catch (e) {
          console.warn(`[精选股票池] 分析股票 ${stock.code} 失败:`, e);
        }
      }
    }
    
    console.log(`[精选股票池] 共分析 ${allCandidates.length} 只候选股票`);
    
    // 3. 筛选：只保留接近支撑位的股票
    const nearSupportStocks = allCandidates.filter(
      s => s.technicals.supportDistance <= supportThreshold
    );
    
    console.log(`[精选股票池] 接近支撑位的股票: ${nearSupportStocks.length} 只`);
    
    // 4. 按综合评分排序，取前N
    const sortedStocks = nearSupportStocks
      .sort((a, b) => b.score - a.score)
      .slice(0, maxStocks);
    
    console.log(`[精选股票池] 最终推荐: ${sortedStocks.length} 只股票`);
    
    return sortedStocks;
  }
  
  /**
   * 分析单只股票
   */
  private async analyzeStock(
    code: string,
    name: string,
    sector: any
  ): Promise<StockRecommendation | null> {
    
    // 获取实时行情
    const quote = await unifiedStockDataService.fetchQuote(code);
    if (!quote) return null;
    
    // 获取K线数据计算支撑位
    const klineData = await unifiedStockDataService.fetchKLineData(code, '101', 60);
    if (!klineData || klineData.length < 20) return null;
    
    // 计算支撑位（使用近期低点）
    const recentLow = Math.min(...klineData.slice(-20).map(k => k.low));
    const recentHigh = Math.max(...klineData.slice(-20).map(k => k.high));
    
    // 计算ATR（平均真实波幅）
    const atr = this.calculateATR(klineData.slice(-14));
    
    // 支撑位 = 近期低点 - 0.5 * ATR
    const supportPrice = recentLow - 0.5 * atr;
    
    // 压力位 = 近期高点 + 0.5 * ATR
    const resistancePrice = recentHigh + 0.5 * atr;
    
    // 止损位 = 支撑位 - 1 * ATR
    const stopLossPrice = supportPrice - atr;
    
    // 计算距离支撑位的百分比
    const supportDistance = (quote.currentPrice - supportPrice) / supportPrice;
    
    // 计算RSI（简化版）
    const rsi = this.calculateRSI(klineData.slice(-14));
    
    // 判断趋势
    const ma5 = this.calculateMA(klineData, 5);
    const ma20 = this.calculateMA(klineData, 20);
    let trend: 'up' | 'down' | 'sideways' = 'sideways';
    if (ma5 > ma20 * 1.02) trend = 'up';
    else if (ma5 < ma20 * 0.98) trend = 'down';
    
    // 计算综合评分
    let score = 50; // 基础分
    
    // 板块热度加分
    score += sector.score * 0.3;
    
    // 接近支撑位加分（越接近分数越高）
    if (supportDistance <= 0.02) score += 20;
    else if (supportDistance <= 0.05) score += 15;
    else if (supportDistance <= 0.08) score += 10;
    
    // 趋势加分
    if (trend === 'up') score += 10;
    
    // RSI加分（40-60为最佳区间）
    if (rsi >= 40 && rsi <= 60) score += 10;
    else if (rsi >= 30 && rsi <= 70) score += 5;
    
    // 涨跌幅调整（避免追高）
    if (quote.changePercent > 5) score -= 10;
    else if (quote.changePercent > 3) score -= 5;
    else if (quote.changePercent < -5) score -= 5;
    
    score = Math.min(100, Math.max(0, Math.round(score)));
    
    // 确定置信度
    let confidence: 'high' | 'medium' | 'low' = 'medium';
    if (score >= 80 && supportDistance <= 0.03) confidence = 'high';
    else if (score < 60 || supportDistance > 0.08) confidence = 'low';
    
    // 生成推荐理由
    const reasons: string[] = [];
    if (supportDistance <= 0.03) reasons.push('接近强力支撑位');
    if (sector.score >= 75) reasons.push(`所属${sector.name}板块强势`);
    if (trend === 'up') reasons.push('短期趋势向上');
    if (rsi >= 40 && rsi <= 60) reasons.push('RSI处于合理区间');
    
    return {
      code,
      name,
      sector: sector.name,
      sectorCode: sector.code,
      score,
      confidence,
      currentPrice: quote.currentPrice,
      supportPrice,
      resistancePrice,
      stopLossPrice,
      changePercent: quote.changePercent,
      sectorChangePercent: sector.changePercent,
      mainForceNet: sector.metrics.mainForceNet,
      reason: reasons.join('，'),
      technicals: {
        rsi,
        isNearSupport: supportDistance <= 0.05,
        supportDistance,
        trend
      }
    };
  }
  
  /**
   * 计算ATR（平均真实波幅）
   */
  private calculateATR(klineData: any[]): number {
    if (klineData.length < 2) return 0;
    
    let sum = 0;
    for (let i = 1; i < klineData.length; i++) {
      const high = klineData[i].high;
      const low = klineData[i].low;
      const prevClose = klineData[i - 1].close;
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      sum += tr;
    }
    
    return sum / (klineData.length - 1);
  }
  
  /**
   * 计算RSI（使用 Wilder's smoothing）
   * @param klineData - K线数据数组
   * @param period - 计算周期，默认14
   * @returns RSI 值 (0-100)
   */
  private calculateRSI(klineData: any[], period: number = 14): number {
    if (klineData.length < period + 1) return 50;
    
    // 计算价格变化
    const changes: number[] = [];
    for (let i = 1; i < klineData.length; i++) {
      changes.push(klineData[i].close - klineData[i - 1].close);
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
  
  /**
   * 计算移动平均线
   */
  private calculateMA(klineData: any[], period: number): number {
    if (klineData.length < period) return 0;
    
    const sum = klineData
      .slice(-period)
      .reduce((acc, k) => acc + k.close, 0);
    
    return sum / period;
  }
}

export const stockPickerService = new StockPickerService();
