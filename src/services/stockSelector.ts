import { StockRecommendation } from '../types/DataContract';

interface StockQuote {
  code: string;
  name: string;
  currentPrice: number;
  pe: number;
  peg: number;
  pb: number;
  roe: number;
  profitGrowth: number;
  revenueGrowth: number;
  marketCap: number;
  // 动量相关字段
  changePercent?: number;  // 当日涨跌幅
  twentyDayChange?: number;  // 20日涨跌幅
  sixtyDayChange?: number;  // 60日涨跌幅
  volume?: number;  // 成交量
  source: string;
  timestamp: string;
}
import { realDataFetcher } from './RealDataFetcher';

export class StockSelector {
  private readonly config = {
    minUpwardSpace: -50,  // 最小上涨空间-50%（允许下跌空间大的股票，用于做空或等待反弹）
    supportDistanceRange: [-30, 30],  // 支撑位距离范围（%）放宽到-30%~30%
    factorWeights: {
      valuation: 0.30,
      growth: 0.20,
      scale: 0.10,
      momentum: 0.15,
      quality: 0.10,
      support: 0.15
    }
  };

  /**
   * 六因子选股（仅接受属于热门板块的股票）
   * 
   * @param stockCodes 股票代码列表（应是板块成分股）
   * @param sectorInfo 所属板块信息（用于关联）
   */
  async selectStocks(
    stockCodes: string[],
    limit: number = 5,
    sectorInfo?: { code: string; name: string; score: number }
  ): Promise<StockRecommendation[]> {
    console.log(`[选股] 开始分析 ${stockCodes.length} 只股票，目标${limit}只`);
    
    const recommendations: StockRecommendation[] = [];
    
    // 并行获取数据（限制并发数避免被封）
    const batchSize = 10;
    for (let i = 0; i < stockCodes.length; i += batchSize) {
      const batch = stockCodes.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(code => this.analyzeSingleStock(code, sectorInfo))
      );
      recommendations.push(...batchResults.filter((r): r is StockRecommendation => r !== null));
    }
    
    // 多维度排序
    return this.sortRecommendations(recommendations).slice(0, limit);
  }

  private async analyzeSingleStock(
    code: string,
    sectorInfo?: any
  ): Promise<StockRecommendation | null> {
    try {
      // 1. 获取真实数据
      const quote = await realDataFetcher.fetchStockQuote(code);
      if (!quote) return null;
      
      // 2. 计算技术位
      const sr = await realDataFetcher.calculateSupportResistance(code);
      if (!sr) return null;
      
      const currentPrice = quote.currentPrice;
      const distanceToSupport = ((currentPrice - sr.support) / sr.support) * 100;
      const upwardSpace = ((sr.resistance - currentPrice) / currentPrice) * 100;
      
      // 3. 严格筛选条件
      if (!this.meetsCriteria(quote, distanceToSupport, upwardSpace)) {
        return null;
      }
      
      // 4. 六因子评分
      const factors = this.calculateFactors(quote, distanceToSupport, upwardSpace);
      const finalScore = Math.round(
        factors.valuation * this.config.factorWeights.valuation +
        factors.growth * this.config.factorWeights.growth +
        factors.scale * this.config.factorWeights.scale +
        factors.momentum * this.config.factorWeights.momentum +
        factors.quality * this.config.factorWeights.quality +
        factors.support * this.config.factorWeights.support
      );
      
      // 5. 确定推荐等级
      const recommendation = this.getRecommendation(finalScore, distanceToSupport);
      
      return {
        code,
        name: quote.name,
        score: finalScore,
        confidence: sr.confidence,
        factors,
        metrics: {
          pe: quote.pe,
          peg: quote.peg,
          pb: quote.pb,
          roe: quote.roe,
          profitGrowth: quote.profitGrowth,
          marketCap: quote.marketCap,
          currentPrice,
          support: sr.support,
          resistance: sr.resistance,
          distanceToSupport,
          upwardSpace
        },
        recommendation,
        analysis: this.generateAnalysis(quote, factors, sr),
        sectorInfo: sectorInfo ? {
          sectorCode: sectorInfo.code,
          sectorName: sectorInfo.name,
          sectorScore: sectorInfo.score
        } : undefined
      };
    } catch (error) {
      console.error(`[选股] 分析${code}失败:`, error);
      return null;
    }
  }

  private meetsCriteria(quote: StockQuote, distSupport: number, upSpace: number): boolean {
    // 上涨空间检查（放宽条件，允许负值）
    if (upSpace < this.config.minUpwardSpace) return false;
    
    // 支撑位距离检查（放宽到-30%~30%）
    if (distSupport < this.config.supportDistanceRange[0] || distSupport > this.config.supportDistanceRange[1]) return false;
    
    // 基础财务检查（大幅放宽）
    if (quote.pe > 500 || quote.pe < -100) return false;  // 排除极端估值和严重亏损
    if (quote.marketCap < 10_0000_0000) return false;  // 最小10亿市值
    
    return true;
  }

  private calculateFactors(q: StockQuote, distSupport: number, upSpace: number) {
    // 估值因子（30%）- 越低越好
    let valuation = 50;
    if (q.pe > 0 && q.pe < 15) valuation += 40;
    else if (q.pe < 25) valuation += 30;
    else if (q.pe < 40) valuation += 15;
    
    if (q.peg > 0 && q.peg < 0.8) valuation += 20;
    else if (q.peg < 1.2) valuation += 10;
    
    if (q.pb > 0 && q.pb < 2) valuation += 15;
    else if (q.pb < 3) valuation += 10;
    
    // 成长因子（20%）
    let growth = 50;
    if (q.profitGrowth > 30) growth += 40;
    else if (q.profitGrowth > 20) growth += 30;
    else if (q.profitGrowth > 10) growth += 20;
    else if (q.profitGrowth > 0) growth += 10;
    
    // 规模因子（10%）
    let scale = 60;
    if (q.marketCap > 1000_0000_0000) scale = 90;  // >1000亿
    
    // 动量因子（15%）- 基于实际价格动量计算
    // 优先使用20日/60日涨跌幅，其次使用当日涨跌幅
    let momentum = 50;
    
    // 20日涨跌幅评分（如果有数据）
    if (q.twentyDayChange !== undefined) {
      if (q.twentyDayChange > 20) momentum += 25;
      else if (q.twentyDayChange > 10) momentum += 20;
      else if (q.twentyDayChange > 5) momentum += 15;
      else if (q.twentyDayChange > 0) momentum += 10;
      else if (q.twentyDayChange > -5) momentum += 5;
      else momentum -= 10;
    }
    // 60日涨跌幅评分（如果有数据）
    else if (q.sixtyDayChange !== undefined) {
      if (q.sixtyDayChange > 30) momentum += 20;
      else if (q.sixtyDayChange > 15) momentum += 15;
      else if (q.sixtyDayChange > 5) momentum += 10;
      else if (q.sixtyDayChange > -5) momentum += 5;
      else momentum -= 5;
    }
    // 当日涨跌幅评分（备选）
    else if (q.changePercent !== undefined) {
      if (q.changePercent > 5) momentum += 15;
      else if (q.changePercent > 2) momentum += 10;
      else if (q.changePercent > 0) momentum += 5;
      else if (q.changePercent > -2) momentum += 0;
      else momentum -= 5;
    }
    
    // 成交量验证（如果有数据）
    // 上涨时放量 = 确认动量；上涨时缩量 = 动量存疑
    if (q.volume !== undefined && q.volume > 1000000) {
      momentum += 5;  // 有成交量数据且充足，加分
    }
    
    // 质量因子（10%）
    let quality = 50;
    if (q.roe > 15) quality += 40;
    else if (q.roe > 10) quality += 30;
    else if (q.roe > 5) quality += 15;
    
    // 支撑因子（15%）- 距离支撑位近且上涨空间大
    let support = 50;
    const absDist = Math.abs(distSupport);
    if (absDist <= 2) support += 35;  // 非常接近支撑
    else if (absDist <= 5) support += 25;
    else if (absDist <= 8) support += 15;
    
    if (upSpace >= 15 && upSpace <= 40) support += 25;
    else if (upSpace >= 10) support += 15;
    else if (upSpace >= 5) support += 10;
    
    // 超跌反弹加成
    if (distSupport < 0) support += Math.min(15, Math.abs(distSupport) * 2);
    
    return {
      valuation: Math.min(100, valuation),
      growth: Math.min(100, growth),
      scale: Math.min(100, scale),
      momentum: Math.min(100, momentum),
      quality: Math.min(100, quality),
      support: Math.min(100, support)
    };
  }

  private getRecommendation(score: number, distSupport: number): StockRecommendation['recommendation'] {
    if (score >= 85 && Math.abs(distSupport) <= 3) return '强烈推荐';
    if (score >= 75) return '推荐';
    if (score >= 65) return '谨慎推荐';
    return '观望';
  }

  private sortRecommendations(list: StockRecommendation[]): StockRecommendation[] {
    const levelOrder = { '强烈推荐': 4, '推荐': 3, '谨慎推荐': 2, '观望': 1 };
    
    return list.sort((a, b) => {
      // 1. 推荐等级
      const levelDiff = levelOrder[b.recommendation] - levelOrder[a.recommendation];
      if (levelDiff !== 0) return levelDiff;
      
      // 2. 综合评分
      if (b.score !== a.score) return b.score - a.score;
      
      // 3. 支撑位距离（越近越好）
      const distA = Math.abs(a.metrics.distanceToSupport);
      const distB = Math.abs(b.metrics.distanceToSupport);
      if (distA !== distB) return distA - distB;
      
      // 4. 上涨空间（越大越好）
      return b.metrics.upwardSpace - a.metrics.upwardSpace;
    });
  }

  private generateAnalysis(q: StockQuote, f: any, sr: any): string {
    const parts: string[] = [];
    
    if (f.valuation >= 80) parts.push('估值处于历史低位');
    else if (f.valuation >= 60) parts.push('估值合理');
    
    if (f.growth >= 70) parts.push('业绩高速增长');
    if (f.quality >= 70) parts.push('盈利质量优秀');
    
    parts.push(`技术支撑位${sr.support}，当前距离${((q.currentPrice - sr.support)/sr.support*100).toFixed(1)}%`);
    parts.push(`上涨空间${((sr.resistance - q.currentPrice)/q.currentPrice*100).toFixed(1)}%`);
    
    return parts.join('；');
  }
}
