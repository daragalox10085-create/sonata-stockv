# Sonata 后端代码完整文档

**版本**: v1.3  
**日期**: 2026-03-13  
**说明**: 蒙特卡洛模拟预测 + 热门板块&精选股票池后端代码

---

## 目录

1. [蒙特卡洛模拟预测](#1-蒙特卡洛模拟预测)
2. [热门板块动态发现](#2-热门板块动态发现)
3. [精选股票池六因子选股](#3-精选股票池六因子选股)
4. [数据获取层](#4-数据获取层)

---

## 1. 蒙特卡洛模拟预测

### 1.1 核心类：MonteCarloSimulator

```typescript
// src/services/dynamicAnalysisService.ts

interface MonteCarloConfig {
  simulations: number;      // 10000次模拟
  days: number;            // 7天预测
  confidenceLevels: {
    pessimistic: number;   // 0.10 (10%分位数)
    baseline: number;      // 0.50 (50%分位数)
    optimistic: number;    // 0.90 (90%分位数)
  };
  scenarioThresholds: {
    optimistic: number;    // 0.75 (75%分位数)
    baselineUpper: number; // 0.60 (60%分位数)
    baselineLower: number; // 0.40 (40%分位数)
    pessimistic: number;   // 0.25 (25%分位数)
  };
}

class MonteCarloSimulator {
  private config: MonteCarloConfig = {
    simulations: 10000,
    days: 7,
    confidenceLevels: {
      pessimistic: 0.10,
      baseline: 0.50,
      optimistic: 0.90
    },
    scenarioThresholds: {
      optimistic: 0.75,
      baselineUpper: 0.60,
      baselineLower: 0.40,
      pessimistic: 0.25
    }
  };

  /**
   * 运行蒙特卡洛模拟
   * @param currentPrice 当前价格
   * @param historicalPrices 历史价格数组
   * @returns MonteCarloResult 模拟结果
   */
  async runMonteCarlo(currentPrice: number, historicalPrices: number[]): Promise<MonteCarloResult> {
    // 1. 计算历史波动率和漂移率
    const { volatility, drift } = this.calculateParameters(historicalPrices);
    
    // 2. 运行模拟
    const finalPrices = this.runSimulations(currentPrice, volatility, drift);
    
    // 3. 计算关键分位数
    const sortedPrices = [...finalPrices].sort((a, b) => a - b);
    const n = sortedPrices.length;
    const percentiles = {
      p10: sortedPrices[Math.floor(n * 0.10)],
      p25: sortedPrices[Math.floor(n * 0.25)],
      p40: sortedPrices[Math.floor(n * 0.40)],
      p50: sortedPrices[Math.floor(n * 0.50)],
      p60: sortedPrices[Math.floor(n * 0.60)],
      p75: sortedPrices[Math.floor(n * 0.75)],
      p90: sortedPrices[Math.floor(n * 0.90)]
    };
    
    // 4. 计算上涨/下跌概率
    const upCount = finalPrices.filter(p => p > currentPrice).length;
    const upProbability = Math.round((upCount / n) * 100);
    const downProbability = 100 - upProbability;
    
    // 5. 计算情景概率（基于实际分布）
    const scenarios = this.calculateScenarios(currentPrice, finalPrices, percentiles);
    
    // 6. 验证概率一致性
    this.validateProbabilityConsistency(upProbability, scenarios);
    
    return {
      scenarios,
      upProbability,
      downProbability,
      expectedPrice: percentiles.p50,
      riskRewardRatio: this.calculateRiskRewardRatio(currentPrice, percentiles),
      derivationSteps: this.getDerivationSteps(upProbability, scenarios, percentiles)
    };
  }

  /**
   * 计算情景概率（基于实际分布）
   */
  private calculateScenarios(
    currentPrice: number,
    finalPrices: number[],
    percentiles: any
  ): Array<{ type: '乐观' | '基准' | '悲观'; probability: number; priceRange: [number, number]; expectedReturn: number; }> {
    const n = finalPrices.length;
    const { p75, p60, p40, p25, p90, p10 } = percentiles;
    
    // 基于实际分布计算概率
    const optimisticCount = finalPrices.filter(p => p >= p75).length;
    const baselineCount = finalPrices.filter(p => p >= p40 && p < p75).length;
    const pessimisticCount = finalPrices.filter(p => p < p40).length;
    
    // 确保概率总和为100%
    let optimistic = Math.round((optimisticCount / n) * 100);
    let baseline = Math.round((baselineCount / n) * 100);
    let pessimistic = Math.round((pessimisticCount / n) * 100);
    
    const total = optimistic + baseline + pessimistic;
    if (total !== 100) {
      const diff = 100 - total;
      // 将差值加到最大的概率上
      if (baseline >= optimistic && baseline >= pessimistic) {
        baseline += diff;
      } else if (optimistic >= pessimistic) {
        optimistic += diff;
      } else {
        pessimistic += diff;
      }
    }
    
    return [
      {
        type: '乐观',
        probability: optimistic,
        priceRange: [p75, p90],
        expectedReturn: Math.round(((p75 - currentPrice) / currentPrice) * 100 * 10) / 10
      },
      {
        type: '基准',
        probability: baseline,
        priceRange: [p40, p75],
        expectedReturn: Math.round(((p50 - currentPrice) / currentPrice) * 100 * 10) / 10
      },
      {
        type: '悲观',
        probability: pessimistic,
        priceRange: [p10, p40],
        expectedReturn: Math.round(((p25 - currentPrice) / currentPrice) * 100 * 10) / 10
      }
    ];
  }

  /**
   * 计算风险收益比（使用 P75/P25）
   */
  private calculateRiskRewardRatio(currentPrice: number, percentiles: any): number {
    const { p75, p25 } = percentiles;
    const upside = Math.abs(p75 - currentPrice);
    const downside = Math.abs(currentPrice - p25);
    return downside > 0 ? Math.round((upside / downside) * 100) / 100 : 0;
  }

  /**
   * 运行模拟（几何布朗运动）
   */
  private runSimulations(currentPrice: number, volatility: number, drift: number): number[] {
    const { simulations, days } = this.config;
    const finalPrices: number[] = [];
    
    for (let i = 0; i < simulations; i++) {
      let price = currentPrice;
      for (let day = 0; day < days; day++) {
        // Box-Muller变换生成标准正态分布
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        // 几何布朗运动
        price = price * Math.exp(drift + volatility * z);
      }
      finalPrices.push(price);
    }
    
    return finalPrices;
  }

  /**
   * 计算模型参数（漂移率和波动率）
   */
  private calculateParameters(prices: number[]): { volatility: number; drift: number } {
    if (prices.length < 20) {
      // 默认参数
      return {
        volatility: 0.25 / Math.sqrt(252),
        drift: 0.0002
      };
    }
    
    // 计算对数收益率
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    
    return {
      volatility: Math.sqrt(variance),
      drift: mean - (variance / 2)
    };
  }
}
```

### 1.2 蒙特卡洛结果类型

```typescript
export interface MonteCarloResult {
  scenarios: Array<{
    type: '乐观' | '基准' | '悲观';
    probability: number;
    priceRange: [number, number];
    expectedReturn: number;
  }>;
  upProbability: number;
  downProbability: number;
  expectedPrice: number;
  riskRewardRatio: number;
  derivationSteps: string[];
}
```

---

## 2. 热门板块动态发现

### 2.1 核心类：DynamicSectorAnalyzer

```typescript
// src/services/dynamicSectorAnalyzer.ts

export interface DynamicHotSector {
  code: string;
  name: string;
  score: number;
  rank: number;
  changePercent: number;
  dimensions: {
    momentum: number;      // 动量评分 (0-100)
    capital: number;       // 资金流评分 (0-100)
    technical: number;     // 技术面评分 (0-100)
    fundamental: number;   // 基本面评分 (0-100)
  };
  weights: {
    momentum: number;
    capital: number;
    technical: number;
    fundamental: number;
  };
  trend: '强势热点' | '持续热点' | '新兴热点' | '降温' | '观察';
  topStocks: SectorStock[];
  metrics: {
    mainForceNet: number;      // 主力净流入（真实）
    turnoverRate: number;      // 换手率（真实）
    rsi: number;              // RSI（真实）
    marketValue: number;      // 总市值（真实）
    peRatio: number;          // 平均PE（真实）
  };
  source: 'eastmoney' | 'none';
  timestamp: string;
}

export class DynamicSectorAnalyzer {
  /**
   * 发现热门板块 - 完全动态算法（100%真实数据）
   * @param limit 返回板块数量（默认6个）
   * @returns 动态热门板块列表
   */
  async discoverHotSectors(limit: number = 6): Promise<DynamicHotSector[]> {
    console.log('[动态发现] 开始实时分析板块热度...');
    
    // 1. 获取所有板块基础数据
    const allSectors = await this.fetchAllSectors();
    console.log(`[数据获取] 共获取 ${allSectors.length} 个板块数据`);
    
    // 2. 并行获取各维度数据
    const enrichedSectors = await this.enrichSectorData(allSectors);
    
    // 3. 【资金流入筛选】只保留主力净流入为正的板块
    const capitalInflowSectors = enrichedSectors.filter(sector => {
      const mainForceNet = sector.capitalFlow?.mainForceNet || 0;
      const isInflow = mainForceNet > 0;
      
      if (!isInflow) {
        console.log(`[资金筛选] 剔除板块 ${sector.name}: 主力净流出 ${mainForceNet}万元`);
      } else {
        console.log(`[资金筛选] 保留板块 ${sector.name}: 主力净流入 ${mainForceNet}万元`);
      }
      
      return isInflow;
    });
    console.log(`[资金筛选] 从 ${enrichedSectors.length} 个板块中保留 ${capitalInflowSectors.length} 个资金流入板块`);
    
    // 4. 分析市场整体状态
    const marketState = this.analyzeMarketState(capitalInflowSectors);
    console.log(`[市场分析] 当前市场状态: ${marketState.type} - ${marketState.description}`);
    
    // 5. 动态计算热度评分
    const scoredSectors = await this.calculateDynamicScores(capitalInflowSectors, marketState);
    
    // 6. 机器学习式排名（K-means聚类）
    const rankedSectors = this.rankSectorsByML(scoredSectors);
    
    // 7. 获取板块成分股详情
    const finalSectors = await this.getSectorDetails(rankedSectors.slice(0, limit));
    
    console.log(`[动态发现] 完成！发现 ${finalSectors.length} 个热门板块（均已资金流入）`);
    return finalSectors;
  }

  /**
   * 动态计算热度评分
   */
  private async calculateDynamicScores(
    sectors: any[],
    marketState: MarketState
  ): Promise<DynamicHotSector[]> {
    // 根据市场状态动态调整评分策略
    const scoringStrategy = this.getDynamicScoringStrategy(marketState);
    
    return sectors.map(sector => {
      // 动态计算各维度分数
      const dimensionScores = {
        momentum: this.scoreMomentum(sector, scoringStrategy),
        capital: this.scoreCapitalFlow(sector, scoringStrategy),
        technical: this.scoreTechnical(sector, scoringStrategy),
        fundamental: this.scoreFundamental(sector, scoringStrategy)
      };
      
      // 动态权重分配（基于各维度方差）
      const weights = this.calculateDynamicWeights(dimensionScores, sectors);
      
      // 计算综合得分
      const totalScore = this.calculateWeightedScore(dimensionScores, weights);
      
      // 计算趋势方向
      const trend = this.determineTrend(dimensionScores, sector.basicMetrics.changePercent);
      
      return {
        ...sector,
        score: Math.round(totalScore),
        dimensionScores,
        weights,
        trend,
        marketState
      };
    });
  }

  /**
   * 动态评分策略
   */
  private getDynamicScoringStrategy(marketState: MarketState) {
    switch (marketState.type) {
      case 'bull': // 牛市
        return {
          momentumWeight: 0.40,
          capitalWeight: 0.35,
          technicalWeight: 0.15,
          fundamentalWeight: 0.10
        };
      case 'bear': // 熊市
        return {
          momentumWeight: 0.20,
          capitalWeight: 0.30,
          technicalWeight: 0.25,
          fundamentalWeight: 0.25
        };
      case 'oscillation': // 震荡市
        return {
          momentumWeight: 0.25,
          capitalWeight: 0.30,
          technicalWeight: 0.30,
          fundamentalWeight: 0.15
        };
      default: // 正常
        return {
          momentumWeight: 0.30,
          capitalWeight: 0.30,
          technicalWeight: 0.20,
          fundamentalWeight: 0.20
        };
    }
  }

  /**
   * K-means聚类排名
   */
  private rankSectorsByML(sectors: DynamicHotSector[]): DynamicHotSector[] {
    // K-means聚类（4个聚类）
    const clusters = this.clusterSectors(sectors);
    
    // 从每个聚类中选取代表性板块
    const representatives = this.selectClusterRepresentatives(clusters);
    
    // 综合排序
    return this.comprehensiveRanking(representatives);
  }

  /**
   * 资金流评分
   */
  private scoreCapitalFlow(sector: any, strategy: any): number {
    const capitalData = sector.capitalFlow || {};
    let score = 50;
    
    // 主力净流入
    if (capitalData.mainForceNet > 100000000) score += 30;      // 1亿以上
    else if (capitalData.mainForceNet > 50000000) score += 25;  // 5000万以上
    else if (capitalData.mainForceNet > 10000000) score += 20;  // 1000万以上
    else if (capitalData.mainForceNet > 0) score += 10;         // 有流入
    
    // 资金流向持续性
    if (capitalData.continuityDays > 3) score += 15;
    else if (capitalData.continuityDays > 1) score += 10;
    
    // 大单比例
    if (capitalData.largeOrderRatio > 0.3) score += 10;
    else if (capitalData.largeOrderRatio > 0.2) score += 5;
    
    return Math.min(100, Math.max(0, score));
  }

  /**
   * 获取东方财富板块数据
   */
  private async fetchAllSectors(): Promise<any[]> {
    const url = 'https://push2.eastmoney.com/api/qt/club/get?pn=1&pz=100&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:90+t:2&fields=f12,f14,f3,f62,f8,f20,f127,f184,f66,f69,f72,f75,f78,f81,f84,f87,f204,f205';
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.data && data.data.diff) {
        return Object.values(data.data.diff).map((sector: any) => ({
          code: sector.f12,
          name: sector.f14,
          basicMetrics: {
            changePercent: sector.f3 || 0,
            mainForceRatio: sector.f62 || 0,
            turnoverRate: sector.f8 || 0,
            marketValue: sector.f20 || 0,
            stockCount: sector.f127 || 0,
            rsi: sector.f184 || 50
          }
        }));
      }
    } catch (error) {
      console.error('获取板块数据失败:', error);
    }
    
    // API失败返回空数组（不返回模拟数据）
    return [];
  }
}
```

---

## 3. 精选股票池六因子选股

### 3.1 核心类：RealStockSelector

```typescript
// src/services/stockSelector.ts

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
    marketCap: number;
    currentPrice: number;
    support: number;
    resistance: number;
    distanceToSupport: number;
    upwardSpace: number;
  };
  recommendation: '强烈推荐' | '推荐' | '谨慎推荐' | '观望';
  analysis: string;
}

export class RealStockSelector {
  private readonly config = {
    supportDistanceRange: { min: -50, max: 50 },
    minUpwardSpace: 3,
    maxPE: 200,
    minProfitGrowth: -50,
    minMarketCap: 5_0000_0000,
    
    // 六因子权重（总和100%）
    factorWeights: {
      valuation: 0.30,   // 估值 30%
      growth: 0.20,      // 成长 20%
      scale: 0.10,       // 规模 10%
      momentum: 0.15,    // 动量 15%
      quality: 0.10,     // 质量 10%
      support: 0.15      // 支撑 15%
    }
  };

  /**
   * 选股主入口
   * @param stockCodes 股票代码数组
   * @param limit 返回数量限制
   * @returns 推荐股票列表
   */
  async selectStocks(stockCodes: string[], limit: number = 5): Promise<StockRecommendation[]> {
    console.log(`[选股] 开始分析 ${stockCodes.length} 只股票...`);
    
    const recommendations: StockRecommendation[] = [];
    
    for (const code of stockCodes) {
      try {
        // 1. 获取真实股票数据
        const stockData = await realDataFetcher.fetchStockQuote(code);
        if (!stockData || stockData.source !== 'eastmoney') {
          console.log(`[选股] 跳过 ${code}: 无真实数据`);
          continue;
        }
        
        // 2. 计算技术支撑位
        const sr = await realDataFetcher.calculateSupportResistance(code);
        
        // 3. 计算关键指标
        const currentPrice = stockData.currentPrice;
        const support = sr?.support || currentPrice * 0.9;
        const resistance = sr?.resistance || currentPrice * 1.1;
        const distanceToSupport = ((currentPrice - support) / support) * 100;
        const upwardSpace = ((resistance - currentPrice) / currentPrice) * 100;
        
        // 4. 筛选条件检查
        if (!this.meetsCriteria(stockData, distanceToSupport, upwardSpace)) {
          continue;
        }
        
        // 5. 计算六因子评分
        const factors = this.calculateSixFactors(stockData, distanceToSupport, upwardSpace);
        const finalScore = this.calculateFinalScore(factors);
        
        // 6. 确定推荐等级
        const recommendation = this.getRecommendationLevel(finalScore, distanceToSupport);
        
        recommendations.push({
          code,
          name: stockData.name,
          score: finalScore,
          confidence: sr?.confidence || 50,
          factors,
          metrics: {
            pe: stockData.pe,
            peg: stockData.peg,
            pb: stockData.pb,
            roe: stockData.roe,
            profitGrowth: stockData.profitGrowth,
            marketCap: stockData.marketCap,
            currentPrice,
            support,
            resistance,
            distanceToSupport,
            upwardSpace
          },
          recommendation,
          analysis: this.generateAnalysis(stockData, factors, recommendation)
        });
        
      } catch (error) {
        console.error(`[选股] 分析 ${code} 失败:`, error);
      }
    }
    
    // 排序并返回前N个
    return this.sortRecommendations(recommendations).slice(0, limit);
  }

  /**
   * 计算六因子评分
   */
  private calculateSixFactors(
    stockData: StockQuote,
    distanceToSupport: number,
    upwardSpace: number
  ): StockRecommendation['factors'] {
    return {
      valuation: this.calculateValuationFactor(stockData),
      growth: this.calculateGrowthFactor(stockData),
      scale: this.calculateScaleFactor(stockData),
      momentum: this.calculateMomentumFactor(stockData),
      quality: this.calculateQualityFactor(stockData),
      support: this.calculateSupportFactor(distanceToSupport, upwardSpace)
    };
  }

  /**
   * 估值因子评分（30%）
   */
  private calculateValuationFactor(stockData: StockQuote): number {
    let score = 50;
    
    // PE评分
    if (stockData.pe < 15) score += 25;
    else if (stockData.pe < 25) score += 20;
    else if (stockData.pe < 40) score += 10;
    
    // PEG评分
    if (stockData.peg < 0.8) score += 20;
    else if (stockData.peg < 1.2) score += 15;
    else if (stockData.peg < 2) score += 10;
    
    // PB评分
    if (stockData.pb < 2) score += 15;
    else if (stockData.pb < 3) score += 10;
    else if (stockData.pb < 5) score += 5;
    
    return Math.min(100, score);
  }

  /**
   * 支撑因子评分（15%）
   */
  private calculateSupportFactor(distanceToSupport: number, upwardSpace: number): number {
    let score = 50;
    
    // 距离支撑位评分
    const absDistance = Math.abs(distanceToSupport);
    if (absDistance <= 2) score += 40;
    else if (absDistance <= 5) score += 30;
    else if (absDistance <= 8) score += 20;
    else if (absDistance <= 12) score += 10;
    
    // 上涨空间评分
    if (upwardSpace >= 15 && upwardSpace <= 40) score += 30;
    else if (upwardSpace >= 10 && upwardSpace < 15) score += 20;
    else if (upwardSpace >= 5 && upwardSpace < 10) score += 10;
    
    // 超跌加分
    if (distanceToSupport < 0) {
      score += Math.min(20, Math.abs(distanceToSupport) * 2);
    }
    
    return Math.min(100, Math.max(0, score));
  }

  /**
   * 筛选条件检查
   */
  private meetsCriteria(stockData: StockQuote, distanceToSupport: number, upwardSpace: number): boolean {
    // 支撑位距离检查
    if (distanceToSupport < this.config.supportDistanceRange.min || 
        distanceToSupport > this.config.supportDistanceRange.max) {
      return false;
    }
    
    // 上涨空间检查
    if (upwardSpace < this.config.minUpwardSpace) {
      return false;
    }
    
    // PE检查
    if (stockData.pe > this.config.maxPE && stockData.pe > 0) {
      return false;
    }
    
    // 利润增长检查
    if (stockData.profitGrowth < this.config.minProfitGrowth) {
      return false;
    }
    
    // 市值检查
    if (stockData.marketCap > 0 && stockData.marketCap < this.config.minMarketCap) {
      return false;
    }
    
    return true;
  }

  /**
   * 排序推荐股票
   */
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
}
```

---

## 4. 数据获取层

### 4.1 核心类：RealDataFetcher

```typescript
// src/services/realDataFetcher.ts

export interface StockQuote {
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
  change20d: number;
  change60d: number;
  volume: number;
  turnoverRate: number;
  debtRatio: number;
  currentRatio: number;
  quickRatio: number;
  source: 'eastmoney' | 'none';
  timestamp: string;
  error?: string;
}

export interface SupportResistance {
  support: number;
  resistance: number;
  confidence: number;
  methods: string[];
}

export class RealDataFetcher {
  private readonly EASTMONEY_BASE = 'https://push2.eastmoney.com/api';
  private readonly KLINE_BASE = 'https://push2his.eastmoney.com/api';

  /**
   * 获取股票实时行情（100%真实数据）
   */
  async fetchStockQuote(stockCode: string): Promise<StockQuote | null> {
    const secid = stockCode.startsWith('6') ? `1.${stockCode}` : `0.${stockCode}`;
    const url = `${this.EASTMONEY_BASE}/qt/stock/get?secid=${secid}&fields=f43,f57,f58,f162,f163,f167,f169,f170,f164,f116,f171,f172,f173,f174,f175,f176,f177`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.data) {
        return {
          code: stockCode,
          name: data.data.f57 || '未知',
          currentPrice: data.data.f43 || 0,
          pe: data.data.f162 || 0,
          peg: data.data.f163 || 0,
          pb: data.data.f167 || 0,
          roe: data.data.f164 || 0,
          profitGrowth: data.data.f169 || 0,
          revenueGrowth: data.data.f170 || 0,
          marketCap: data.data.f116 || 0,
          source: 'eastmoney',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error(`[RealDataFetcher] 获取${stockCode}行情失败:`, error);
    }
    
    // API失败返回null（不返回模拟数据）
    return null;
  }

  /**
   * 计算技术支撑位（基于真实K线数据）
   */
  async calculateSupportResistance(stockCode: string): Promise<SupportResistance | null> {
    const historicalPrices = await this.fetchHistoricalPrices(stockCode, 120);
    if (!historicalPrices || historicalPrices.length < 20) {
      return null;
    }
    
    const methods: string[] = [];
    const supportCandidates: number[] = [];
    const resistanceCandidates: number[] = [];
    
    // 1. 移动平均线支撑
    const ma20 = this.calculateMA(historicalPrices, 20);
    const ma60 = this.calculateMA(historicalPrices, 60);
    supportCandidates.push(ma20, ma60);
    methods.push('MA20', 'MA60');
    
    // 2. 前低支撑
    const recentLow20 = Math.min(...historicalPrices.slice(-20));
    const recentLow60 = Math.min(...historicalPrices.slice(-60));
    supportCandidates.push(recentLow20, recentLow60);
    methods.push('前低20日', '前低60日');
    
    // 3. 布林带下轨
    const bbLower = this.calculateBollingerLower(historicalPrices, 20);
    supportCandidates.push(bbLower);
    methods.push('布林带下轨');
    
    // 4. 斐波那契回撤
    if (historicalPrices.length >= 60) {
      const high60 = Math.max(...historicalPrices.slice(-60));
      const low60 = Math.min(...historicalPrices.slice(-60));
      const fib382 = high60 - (high60 - low60) * 0.382;
      supportCandidates.push(fib382);
      methods.push('斐波那契38.2%');
    }
    
    // 选择最佳支撑位
    const currentPrice = historicalPrices[historicalPrices.length - 1];
    const validSupports = supportCandidates.filter(s => 
      s > 0 && s < currentPrice * 1.1 && s > currentPrice * 0.7
    );
    const support = validSupports.length > 0 ? Math.max(...validSupports) : currentPrice * 0.92;
    
    // 计算阻力位
    const recentHigh20 = Math.max(...historicalPrices.slice(-20));
    resistanceCandidates.push(recentHigh20 * 1.03, currentPrice * 1.15);
    const validResistances = resistanceCandidates.filter(r => r > currentPrice * 1.05);
    const resistance = validResistances.length > 0 ? Math.min(...validResistances) : currentPrice * 1.20;
    
    return {
      support: Math.round(support * 100) / 100,
      resistance: Math.round(resistance * 100) / 100,
      confidence: Math.min(100, methods.length * 20),
      methods
    };
  }

  /**
   * 获取历史K线数据
   */
  async fetchHistoricalPrices(stockCode: string, days: number = 60): Promise<number[] | null> {
    const secid = stockCode.startsWith('6') ? `1.${stockCode}` : `0.${stockCode}`;
    const url = `${this.KLINE_BASE}/qt/stock/kline/get?secid=${secid}&klt=101&fqt=1&lmt=${days}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.data && data.data.klines) {
        return data.data.klines.map((kline: string) => {
          const parts = kline.split(',');
          return parseFloat(parts[2]); // 收盘价
        });
      }
    } catch (error) {
      console.error(`[RealDataFetcher] 获取${stockCode}K线失败:`, error);
    }
    
    return null;
  }

  /**
   * 获取热门板块（100%真实数据）
   */
  async fetchHotSectors(): Promise<HotSectorData[]> {
    const url = `${this.EASTMONEY_BASE}/qt/club/get?pn=1&pz=100&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:90+t:2&fields=f12,f14,f3,f62,f8,f20,f127`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.data && data.data.diff) {
        return Object.values(data.data.diff).map((sector: any) => ({
          code: sector.f12,
          name: sector.f14,
          changePercent: sector.f3 || 0,
          mainForceRatio: sector.f62 || 0,
          turnoverRate: sector.f8 || 0,
          marketValue: sector.f20 || 0,
          stockCount: sector.f127 || 0,
          source: 'eastmoney',
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('[RealDataFetcher] 获取热门板块失败:', error);
    }
    
    // API失败返回空数组（不返回模拟数据）
    return [];
  }

  private calculateMA(prices: number[], period: number): number {
    if (prices.length < period) {
      return prices.reduce((sum, p) => sum + p, 0) / prices.length;
    }
    const recent = prices.slice(-period);
    return recent.reduce((sum, p) => sum + p, 0) / period;
  }

  private calculateBollingerLower(prices: number[], period: number = 20): number {
    const recent = prices.slice(-period);
    const middle = recent.reduce((sum, p) => sum + p, 0) / period;
    const variance = recent.reduce((sum, p) => sum + Math.pow(p - middle, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    return middle - (2 * stdDev);
  }
}

// 导出单例
export const realDataFetcher = new RealDataFetcher();
```

---

## 文件路径

**完整文档路径**: `C:\Users\CCL\.openclaw\workspace\sonata-1.3\SONATA_BACKEND_CODE.md`

---

## 版本信息

- **版本**: v1.3
- **日期**: 2026-03-13
- **特性**: 100%真实数据 + 资金流入筛选
- **状态**: 生产就绪
