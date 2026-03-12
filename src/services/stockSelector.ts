/**
 * 六因子选股模型服务
 * 功能：基于六因子评分模型筛选优质股票
 * 版本：v1.0 - 智能选股与每周推荐
 */

import { RealDataFetcher, StockQuote, SupportResistance, realDataFetcher } from './realDataFetcher';

// ==================== 类型定义 ====================

export interface StockRecommendation {
  code: string;
  name: string;
  score: number;
  confidence: number;
  factors: {
    valuation: number;    // 估值因子 30%
    growth: number;       // 成长因子 20%
    scale: number;        // 规模因子 10%
    momentum: number;     // 动量因子 15%
    quality: number;      // 质量因子 10%
    support: number;      // 支撑因子 15%
  };
  metrics: {
    pe: number;
    peg: number;
    pb: number;
    roe: number;
    profitGrowth: number;
    revenueGrowth: number;
    marketCap: number;
    currentPrice: number;
    support: number;
    resistance: number;
    distanceToSupport: number;
    upwardSpace: number;
    sector?: string;
    turnoverRate?: number;
    volume?: number;
  };
  technical: {
    ma20: number;
    ma60: number;
    rsi14: number;
    trend: 'up' | 'down' | 'sideways';
    supportConfidence: number;
  };
  recommendation: '强烈推荐' | '推荐' | '谨慎推荐' | '观望';
  analysis: string;
}

export interface WeeklyAnalysis {
  week: string;
  dateRange: { start: string; end: string };
  marketSentiment: '乐观' | '中性' | '谨慎';
  topPicks: StockRecommendation[];
  sectorRotation: string[];
  riskLevel: '低' | '中' | '高';
  summary: string;
}

export interface SelectorConfig {
  // 筛选条件
  supportDistanceRange: { min: number; max: number };
  minUpwardSpace: number;
  maxPE: number;
  minProfitGrowth: number;
  minMarketCap: number;

  // 六因子权重
  factorWeights: {
    valuation: number;
    growth: number;
    scale: number;
    momentum: number;
    quality: number;
    support: number;
  };

  // 评分阈值
  scoreThresholds: {
    strongBuy: number;
    buy: number;
    cautious: number;
  };
}

// ==================== 默认配置 ====================

const DEFAULT_CONFIG: SelectorConfig = {
  supportDistanceRange: { min: -50, max: 50 }, // 放宽支撑位距离范围
  minUpwardSpace: 3, // 降低最小上涨空间要求
  maxPE: 200, // 放宽PE限制
  minProfitGrowth: -50, // 放宽利润增长要求
  minMarketCap: 5_0000_0000, // 5亿

  // 六因子权重（总和100%）
  factorWeights: {
    valuation: 0.30,   // 估值 30%
    growth: 0.20,      // 成长 20%
    scale: 0.10,       // 规模 10%
    momentum: 0.15,    // 动量 15%
    quality: 0.10,     // 质量 10%
    support: 0.15      // 支撑 15%
  },

  scoreThresholds: {
    strongBuy: 75,
    buy: 65,
    cautious: 55
  }
};

// ==================== 六因子选股器 ====================

export class RealStockSelector {
  private dataFetcher: RealDataFetcher;
  private config: SelectorConfig;

  constructor(dataFetcher?: RealDataFetcher, config?: Partial<SelectorConfig>) {
    this.dataFetcher = dataFetcher || realDataFetcher;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.validateWeights();
  }

  private validateWeights(): void {
    const { valuation, growth, scale, momentum, quality, support } = this.config.factorWeights;
    const total = valuation + growth + scale + momentum + quality + support;
    if (Math.abs(total - 1) > 0.001) {
      console.warn(`[StockSelector] 权重总和不为1: ${total}, 自动归一化`);
      this.config.factorWeights = {
        valuation: valuation / total,
        growth: growth / total,
        scale: scale / total,
        momentum: momentum / total,
        quality: quality / total,
        support: support / total
      };
    }
  }

  // ==================== 核心选股方法 ====================

  /**
   * 从股票池中筛选推荐股票
   */
  async selectStocks(stockCodes: string[]): Promise<StockRecommendation[]> {
    console.log(`[StockSelector] 开始分析 ${stockCodes.length} 只股票...`);

    const recommendations: StockRecommendation[] = [];
    const errors: string[] = [];

    // 批量获取数据
    for (let i = 0; i < stockCodes.length; i++) {
      const code = stockCodes[i];
      try {
        const recommendation = await this.analyzeStock(code);
        if (recommendation) {
          recommendations.push(recommendation);
        }
      } catch (error) {
        const errorMsg = `[StockSelector] 分析${code}失败: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }

      // 每5只打印一次进度
      if ((i + 1) % 5 === 0) {
        console.log(`[StockSelector] 进度: ${i + 1}/${stockCodes.length}`);
      }
    }

    // 多维度排序
    const sorted = this.sortRecommendations(recommendations);

    console.log(`[StockSelector] 分析完成: ${sorted.length}只通过筛选, ${errors.length}只失败`);
    return sorted;
  }

  /**
   * 分析单个股票
   */
  private async analyzeStock(code: string): Promise<StockRecommendation | null> {
    // 1. 获取实时行情
    const quote = await this.dataFetcher.fetchStockQuote(code);
    if (!quote || !quote.currentPrice) {
      console.log(`[StockSelector] ${code}: 无法获取行情`);
      return null;
    }

    // 2. 获取支撑位数据
    const sr = await this.dataFetcher.calculateSupportResistance(code, quote.currentPrice);
    if (!sr) {
      console.log(`[StockSelector] ${code}: 无法计算支撑阻力`);
      return null;
    }

    // 3. 计算关键指标
    const currentPrice = quote.currentPrice;
    const support = sr.support;
    const resistance = sr.resistance;
    const distanceToSupport = ((currentPrice - support) / support) * 100;
    const upwardSpace = ((resistance - currentPrice) / currentPrice) * 100;

    // 4. 智能筛选条件
    if (!this.meetsCriteria(quote, distanceToSupport, upwardSpace)) {
      return null;
    }

    // 5. 计算技术指标
    const technical = this.calculateTechnicalMetrics(sr.klines);

    // 6. 六因子评分
    const factors = this.calculateSixFactors(quote, distanceToSupport, technical);
    const finalScore = this.calculateWeightedScore(factors);

    // 7. 确定推荐等级
    const recommendation = this.determineRecommendation(finalScore, distanceToSupport, factors);

    // 8. 生成分析报告
    const analysis = this.generateAnalysis(quote, factors, distanceToSupport, upwardSpace);

    // 9. 计算置信度
    const confidence = this.calculateConfidence(factors, sr.confidence);

    return {
      code,
      name: quote.name,
      score: finalScore,
      confidence,
      factors,
      metrics: {
        pe: Math.round(quote.pe * 100) / 100,
        peg: Math.round(quote.peg * 100) / 100,
        pb: Math.round(quote.pb * 100) / 100,
        roe: Math.round(quote.roe * 100) / 100,
        profitGrowth: Math.round(quote.profitGrowth * 100) / 100,
        revenueGrowth: Math.round(quote.revenueGrowth * 100) / 100,
        marketCap: quote.marketCap,
        currentPrice: Math.round(currentPrice * 100) / 100,
        support: Math.round(support * 100) / 100,
        resistance: Math.round(resistance * 100) / 100,
        distanceToSupport: Math.round(distanceToSupport * 10) / 10,
        upwardSpace: Math.round(upwardSpace * 10) / 10,
        turnoverRate: quote.turnoverRate,
        volume: quote.volume
      },
      technical: {
        ma20: technical.ma20,
        ma60: technical.ma60,
        rsi14: technical.rsi14,
        trend: technical.trend,
        supportConfidence: sr.confidence
      },
      recommendation,
      analysis
    };
  }

  // ==================== 筛选条件 ====================

  private meetsCriteria(quote: StockQuote, distanceToSupport: number, upwardSpace: number): boolean {
    const { supportDistanceRange, minUpwardSpace, maxPE, minProfitGrowth, minMarketCap } = this.config;

    // 支撑位距离检查
    if (distanceToSupport < supportDistanceRange.min || distanceToSupport > supportDistanceRange.max) {
      console.log(`[StockSelector] ${quote.code}: 距离支撑${distanceToSupport.toFixed(1)}%超出范围`);
      return false;
    }

    // 上涨空间检查
    if (upwardSpace < minUpwardSpace) {
      console.log(`[StockSelector] ${quote.code}: 上涨空间${upwardSpace.toFixed(1)}%不足`);
      return false;
    }

    // 估值检查（允许负PE）
    if (quote.pe > maxPE && quote.pe > 0) {
      console.log(`[StockSelector] ${quote.code}: PE ${quote.pe.toFixed(1)}过高`);
      return false;
    }

    // 成长性检查
    if (quote.profitGrowth < minProfitGrowth) {
      console.log(`[StockSelector] ${quote.code}: 利润增长${quote.profitGrowth.toFixed(1)}%过低`);
      return false;
    }

    // 市值检查
    if (quote.marketCap > 0 && quote.marketCap < minMarketCap) {
      console.log(`[StockSelector] ${quote.code}: 市值${(quote.marketCap / 1e8).toFixed(1)}亿过小`);
      return false;
    }

    return true;
  }

  // ==================== 六因子评分 ====================

  private calculateSixFactors(
    quote: StockQuote,
    distanceToSupport: number,
    technical: any
  ): StockRecommendation['factors'] {
    return {
      valuation: this.calculateValuationFactor(quote),
      growth: this.calculateGrowthFactor(quote),
      scale: this.calculateScaleFactor(quote),
      momentum: this.calculateMomentumFactor(quote, technical),
      quality: this.calculateQualityFactor(quote),
      support: this.calculateSupportFactor(distanceToSupport, technical.supportConfidence)
    };
  }

  /**
   * 估值因子 (30%)
   * 基于PE、PEG、PB综合评分
   */
  private calculateValuationFactor(quote: StockQuote): number {
    let score = 50;

    // PE评分
    if (quote.pe > 0) {
      if (quote.pe < 15) score += 25;
      else if (quote.pe < 25) score += 20;
      else if (quote.pe < 35) score += 15;
      else if (quote.pe < 50) score += 5;
      else score -= 10;
    } else if (quote.pe < 0) {
      // 亏损企业，基于其他指标调整
      score -= 5;
    }

    // PEG评分
    if (quote.peg > 0) {
      if (quote.peg < 0.8) score += 20;
      else if (quote.peg < 1.0) score += 15;
      else if (quote.peg < 1.5) score += 10;
      else if (quote.peg < 2.0) score += 5;
      else score -= 5;
    }

    // PB评分
    if (quote.pb > 0) {
      if (quote.pb < 2) score += 15;
      else if (quote.pb < 3) score += 10;
      else if (quote.pb < 5) score += 5;
      else score -= 5;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * 成长因子 (20%)
   * 基于利润增长和收入增长
   */
  private calculateGrowthFactor(quote: StockQuote): number {
    let score = 50;

    // 利润增长
    if (quote.profitGrowth > 100) score += 35;
    else if (quote.profitGrowth > 50) score += 30;
    else if (quote.profitGrowth > 30) score += 25;
    else if (quote.profitGrowth > 15) score += 20;
    else if (quote.profitGrowth > 0) score += 10;
    else if (quote.profitGrowth > -10) score -= 5;
    else score -= 15;

    // 收入增长
    if (quote.revenueGrowth > 50) score += 15;
    else if (quote.revenueGrowth > 30) score += 10;
    else if (quote.revenueGrowth > 15) score += 5;
    else if (quote.revenueGrowth < 0) score -= 5;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * 规模因子 (10%)
   * 基于市值规模
   */
  private calculateScaleFactor(quote: StockQuote): number {
    const marketCapB = quote.marketCap / 1e8; // 转换为亿

    if (marketCapB > 1000) return 85; // 大盘股
    if (marketCapB > 500) return 80;
    if (marketCapB > 200) return 75;
    if (marketCapB > 100) return 70;
    if (marketCapB > 50) return 65;
    if (marketCapB > 20) return 60;
    return 50; // 小盘股
  }

  /**
   * 动量因子 (15%)
   * 基于技术指标和趋势
   */
  private calculateMomentumFactor(quote: StockQuote, technical: any): number {
    let score = 50;

    // RSI评分
    if (technical.rsi14 < 30) score += 15; // 超卖，可能反弹
    else if (technical.rsi14 < 40) score += 10;
    else if (technical.rsi14 > 70) score -= 10; // 超买
    else if (technical.rsi14 > 60) score -= 5;

    // 趋势评分
    if (technical.trend === 'up') score += 20;
    else if (technical.trend === 'sideways') score += 10;
    else score -= 5;

    // 换手率评分（适中为佳）
    if (quote.turnoverRate) {
      if (quote.turnoverRate > 1 && quote.turnoverRate < 10) score += 10;
      else if (quote.turnoverRate > 0.5) score += 5;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * 质量因子 (10%)
   * 基于ROE等质量指标
   */
  private calculateQualityFactor(quote: StockQuote): number {
    let score = 50;

    // ROE评分
    if (quote.roe > 20) score += 40;
    else if (quote.roe > 15) score += 35;
    else if (quote.roe > 10) score += 25;
    else if (quote.roe > 5) score += 15;
    else if (quote.roe > 0) score += 5;
    else score -= 10;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * 支撑因子 (15%)
   * 基于与支撑位的距离
   */
  private calculateSupportFactor(distanceToSupport: number, supportConfidence: number): number {
    let score = 50;

    const absDistance = Math.abs(distanceToSupport);

    // 距离支撑越近得分越高
    if (absDistance <= 2) score = 95;
    else if (absDistance <= 5) score = 85;
    else if (absDistance <= 8) score = 75;
    else if (absDistance <= 12) score = 65;
    else if (absDistance <= 15) score = 60;
    else score = 55;

    // 在支撑位下方（超跌）加分
    if (distanceToSupport < 0 && absDistance < 10) {
      score += 5;
    }

    // 支撑置信度调整
    score = score * (0.7 + supportConfidence / 100 * 0.3);

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  private calculateWeightedScore(factors: StockRecommendation['factors']): number {
    const { valuation, growth, scale, momentum, quality, support } = this.config.factorWeights;

    const score =
      factors.valuation * valuation +
      factors.growth * growth +
      factors.scale * scale +
      factors.momentum * momentum +
      factors.quality * quality +
      factors.support * support;

    return Math.round(score);
  }

  private calculateConfidence(factors: StockRecommendation['factors'], supportConfidence: number): number {
    // 基于各因子离散程度计算置信度
    const values = [factors.valuation, factors.growth, factors.scale, factors.momentum, factors.quality, factors.support];
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // 标准差越小，因子越一致，置信度越高
    const consistencyScore = Math.max(0, 100 - stdDev);

    // 综合支撑置信度
    return Math.round((consistencyScore * 0.6 + supportConfidence * 0.4) * 10) / 10;
  }

  // ==================== 技术指标计算 ====================

  private calculateTechnicalMetrics(klines: any[]): {
    ma20: number;
    ma60: number;
    rsi14: number;
    trend: 'up' | 'down' | 'sideways';
    supportConfidence: number;
  } {
    if (!klines || klines.length < 20) {
      return { ma20: 0, ma60: 0, rsi14: 50, trend: 'sideways', supportConfidence: 30 };
    }

    const closes = klines.map(k => k.close);

    // 计算MA
    const ma20 = this.calculateMA(closes, 20);
    const ma60 = klines.length >= 60 ? this.calculateMA(closes, 60) : ma20;

    // 计算RSI
    const rsi14 = this.calculateRSI(closes, 14);

    // 判断趋势
    const recentCloses = closes.slice(-5);
    const prevCloses = closes.slice(-10, -5);
    const recentAvg = recentCloses.reduce((a, b) => a + b, 0) / recentCloses.length;
    const prevAvg = prevCloses.reduce((a, b) => a + b, 0) / prevCloses.length;

    let trend: 'up' | 'down' | 'sideways' = 'sideways';
    if (recentAvg > prevAvg * 1.02) trend = 'up';
    else if (recentAvg < prevAvg * 0.98) trend = 'down';

    return { ma20, ma60, rsi14, trend, supportConfidence: 70 };
  }

  private calculateMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0;
    const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
    return sum / period;
  }

  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  // ==================== 推荐等级与分析 ====================

  private determineRecommendation(
    score: number,
    distanceToSupport: number,
    factors: StockRecommendation['factors']
  ): StockRecommendation['recommendation'] {
    const { strongBuy, buy, cautious } = this.config.scoreThresholds;
    const absDistance = Math.abs(distanceToSupport);

    // 综合评分和距离判断
    if (score >= strongBuy && absDistance <= 8 && factors.support >= 70) return '强烈推荐';
    if (score >= buy && absDistance <= 12) return '推荐';
    if (score >= cautious && absDistance <= 15) return '谨慎推荐';
    return '观望';
  }

  private generateAnalysis(
    quote: StockQuote,
    factors: StockRecommendation['factors'],
    distanceToSupport: number,
    upwardSpace: number
  ): string {
    const parts: string[] = [];

    // 估值分析
    if (factors.valuation >= 80) parts.push('估值处于合理偏低水平');
    else if (factors.valuation >= 60) parts.push('估值相对合理');
    else parts.push('估值偏高，需谨慎');

    // 成长分析
    if (factors.growth >= 80) parts.push('成长性优异');
    else if (factors.growth >= 60) parts.push('成长性良好');
    else parts.push('成长性一般');

    // 支撑分析
    if (Math.abs(distanceToSupport) <= 5) {
      parts.push(`股价距支撑位${Math.abs(distanceToSupport).toFixed(1)}%，处于理想买入区间`);
    } else if (distanceToSupport < 0) {
      parts.push(`股价低于支撑位${Math.abs(distanceToSupport).toFixed(1)}%，可能存在超跌反弹机会`);
    } else {
      parts.push(`股价距支撑位${distanceToSupport.toFixed(1)}%，可等待回调`);
    }

    // 上涨空间
    parts.push(`上方阻力空间约${upwardSpace.toFixed(1)}%`);

    return parts.join('；');
  }

  // ==================== 排序与筛选 ====================

  private sortRecommendations(recommendations: StockRecommendation[]): StockRecommendation[] {
    return recommendations.sort((a, b) => {
      // 1. 按推荐等级排序
      const levelOrder = { '强烈推荐': 4, '推荐': 3, '谨慎推荐': 2, '观望': 1 };
      const levelDiff = levelOrder[b.recommendation] - levelOrder[a.recommendation];
      if (levelDiff !== 0) return levelDiff;

      // 2. 按综合评分排序
      if (b.score !== a.score) return b.score - a.score;

      // 3. 按支撑位距离排序（越近越好）
      const distA = Math.abs(a.metrics.distanceToSupport);
      const distB = Math.abs(b.metrics.distanceToSupport);
      if (distA !== distB) return distA - distB;

      // 4. 按上涨空间排序
      return b.metrics.upwardSpace - a.metrics.upwardSpace;
    });
  }

  // ==================== 每周分析 ====================

  /**
   * 生成每周分析报告
   */
  async generateWeeklyAnalysis(stockCodes: string[]): Promise<WeeklyAnalysis> {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const recommendations = await this.selectStocks(stockCodes);
    const topPicks = recommendations.slice(0, 10);

    // 计算市场情绪
    const avgScore = recommendations.length > 0
      ? recommendations.reduce((sum, r) => sum + r.score, 0) / recommendations.length
      : 50;

    let marketSentiment: WeeklyAnalysis['marketSentiment'] = '中性';
    if (avgScore >= 70) marketSentiment = '乐观';
    else if (avgScore < 55) marketSentiment = '谨慎';

    // 识别板块轮动
    const sectorRotation = this.identifySectorRotation(topPicks);

    // 风险等级
    let riskLevel: WeeklyAnalysis['riskLevel'] = '中';
    const highRiskCount = recommendations.filter(r => r.factors.valuation < 40).length;
    if (highRiskCount > recommendations.length * 0.3) riskLevel = '高';
    else if (highRiskCount < recommendations.length * 0.1) riskLevel = '低';

    // 生成总结
    const summary = this.generateWeeklySummary(topPicks, marketSentiment, sectorRotation);

    return {
      week: this.getWeekNumber(now),
      dateRange: {
        start: weekStart.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0]
      },
      marketSentiment,
      topPicks,
      sectorRotation,
      riskLevel,
      summary
    };
  }

  private identifySectorRotation(recommendations: StockRecommendation[]): string[] {
    // 基于推荐股票识别可能的板块热点
    const sectors: string[] = [];

    // 根据股票特征推断板块
    recommendations.forEach(r => {
      if (r.factors.growth > 80) sectors.push('成长股');
      if (r.factors.valuation > 75 && r.metrics.pe < 20) sectors.push('价值股');
      if (r.metrics.marketCap > 1000e8) sectors.push('大盘股');
      if (r.metrics.marketCap < 100e8) sectors.push('小盘股');
    });

    // 去重并返回前3
    return [...new Set(sectors)].slice(0, 3);
  }

  private generateWeeklySummary(
    topPicks: StockRecommendation[],
    sentiment: WeeklyAnalysis['marketSentiment'],
    sectors: string[]
  ): string {
    const parts: string[] = [];

    parts.push(`本周市场情绪${sentiment === '乐观' ? '积极' : sentiment === '谨慎' ? '偏谨慎' : '平稳'}`);

    if (topPicks.length > 0) {
      const strongBuyCount = topPicks.filter(p => p.recommendation === '强烈推荐').length;
      const buyCount = topPicks.filter(p => p.recommendation === '推荐').length;
      parts.push(`精选股票池中${strongBuyCount}只强烈推荐，${buyCount}只推荐`);
    }

    if (sectors.length > 0) {
      parts.push(`建议关注${sectors.join('、')}板块`);
    }

    parts.push('建议控制仓位，严格止损');

    return parts.join('，');
  }

  private getWeekNumber(date: Date): string {
    const start = new Date(date.getFullYear(), 0, 1);
    const diff = date.getTime() - start.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    const weekNum = Math.floor(diff / oneWeek) + 1;
    return `${date.getFullYear()}年第${weekNum}周`;
  }

  // ==================== 配置更新 ====================

  updateConfig(config: Partial<SelectorConfig>): void {
    this.config = { ...this.config, ...config };
    this.validateWeights();
  }

  getConfig(): SelectorConfig {
    return { ...this.config };
  }
}

// 导出单例实例
export const stockSelector = new RealStockSelector();
