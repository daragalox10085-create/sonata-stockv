/**
 * 动态选股与热门板块分析服务
 * 功能：从真实API获取数据，筛选支撑位附近的股票
 * 版本：v3.0 - 集成RealDataFetcher和RealStockSelector
 */

import { RealDataFetcher, realDataFetcher } from './realDataFetcher';
import { RealStockSelector, stockSelector, StockRecommendation } from './stockSelector';
import { DynamicSectorAnalyzer, dynamicSectorAnalyzer, DynamicHotSector } from './dynamicSectorAnalyzer';

// ==================== 类型定义 ====================

// 使用 stockSelector.ts 中的 StockRecommendation 类型
export type { StockRecommendation } from './stockSelector';

export interface HotSector {
  name: string;
  score: number;
  changePercent?: number;
  dimensions: {
    sentiment: number;
    capital: number;
    technical: number;
    fundamental: number;
  };
  trend: '强势热点' | '持续热点' | '新兴热点' | '降温';
  topStocks: string[];
}

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

// ==================== 配置类型 ====================

interface MonteCarloConfig {
  simulations: number;
  days: number;
  confidenceLevels: {
    pessimistic: number;  // 默认 0.10 (10%)
    baseline: number;     // 默认 0.50 (50%)
    optimistic: number;   // 默认 0.90 (90%)
  };
  scenarioThresholds: {
    optimistic: number;   // 0.75 (75%分位数)
    baselineUpper: number; // 0.60 (60%分位数)
    baselineLower: number; // 0.40 (40%分位数)
    pessimistic: number;  // 0.25 (25%分位数)
  };
}

interface SectorConfig {
  seasonalAdjustment: boolean;
  dataSources: string[];
  scoringWeights: {
    sentiment: number;
    capital: number;
    technical: number;
    fundamental: number;
  };
}

interface StockSelectorConfig {
  supportDistanceRange: { min: number; max: number };
  minUpwardSpace: number;
  scoringWeights: {
    valuation: number;
    growth: number;
    quality: number;
    support: number;
  };
  dataValidation: {
    minDataPoints: number;
    maxAgeMs: number;
  };
}

// ==================== 数据获取层（使用RealDataFetcher） ====================

class DataFetcher extends RealDataFetcher {
  // 继承RealDataFetcher，保持向后兼容
}

// ==================== 蒙特卡洛模拟器 ====================

class MonteCarloSimulator {
  private config: MonteCarloConfig;

  constructor(config?: Partial<MonteCarloConfig>) {
    this.config = {
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
      },
      ...config
    };
  }

  /**
   * 运行蒙特卡洛模拟
   * @param currentPrice 当前价格
   * @param historicalPrices 历史价格数组
   * @returns MonteCarloResult 模拟结果
   */
  runSimulation(currentPrice: number, historicalPrices: number[]): MonteCarloResult {
    if (!historicalPrices || historicalPrices.length < 20) {
      console.warn('[蒙特卡洛] 历史价格数据不足，使用默认参数');
      return this.runWithDefaults(currentPrice);
    }

    const { drift, volatility, avgReturn, variance } = this.calculateParameters(historicalPrices);
    const finalPrices = this.generateSimulations(currentPrice, drift, volatility);
    const quantiles = this.calculateQuantiles(finalPrices);
    
    // 先计算情景概率，再计算涨跌概率（确保一致性）
    const scenarioProbs = this.calculateScenarios(finalPrices, currentPrice);
    const probabilities = this.calculateProbabilities(finalPrices, currentPrice, scenarioProbs);

    return this.buildResult(currentPrice, quantiles, probabilities, avgReturn, volatility, variance, finalPrices, scenarioProbs);
  }

  /**
   * 计算模型参数（漂移率和波动率）
   */
  private calculateParameters(prices: number[]): { drift: number; volatility: number; avgReturn: number; variance: number } {
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);
    const drift = avgReturn - (variance / 2);

    return { drift, volatility, avgReturn, variance };
  }

  /**
   * 生成蒙特卡洛模拟路径
   * 使用Box-Muller变换生成正态分布随机数
   */
  private generateSimulations(currentPrice: number, drift: number, volatility: number): number[] {
    const finalPrices: number[] = [];
    
    for (let i = 0; i < this.config.simulations; i++) {
      let price = currentPrice;
      for (let day = 0; day < this.config.days; day++) {
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
   * 计算分位数（使用改进的分位数算法）
   */
  private calculateQuantiles(prices: number[]): { p25: number; p50: number; p75: number; p10: number; p90: number } {
    const sorted = [...prices].sort((a, b) => a - b);
    const n = sorted.length;

    // 使用线性插值法计算分位数
    const getQuantile = (q: number): number => {
      const pos = q * (n - 1);
      const lower = Math.floor(pos);
      const upper = Math.ceil(pos);
      const weight = pos - lower;
      
      if (upper >= n) return sorted[n - 1];
      if (lower === upper) return sorted[lower];
      
      return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    };

    return {
      p25: getQuantile(0.25),
      p50: getQuantile(0.50),
      p75: getQuantile(0.75),
      p10: getQuantile(this.config.confidenceLevels.pessimistic),
      p90: getQuantile(this.config.confidenceLevels.optimistic)
    };
  }

  /**
   * 计算涨跌概率
   * 修复：上涨概率 = 乐观概率 + 基准情景中上涨的部分
   */
  private calculateProbabilities(finalPrices: number[], currentPrice: number, scenarios?: { optimistic: number; baseline: number; pessimistic: number }): { up: number; down: number } {
    // 首先计算情景概率
    const scenarioProbs = scenarios || this.calculateScenarios(finalPrices, currentPrice);
    
    // 获取分位数价格
    const sorted = [...finalPrices].sort((a, b) => a - b);
    const n = sorted.length;
    
    const getQuantilePrice = (q: number): number => {
      const pos = q * (n - 1);
      const lower = Math.floor(pos);
      const upper = Math.ceil(pos);
      const weight = pos - lower;
      if (upper >= n) return sorted[n - 1];
      if (lower === upper) return sorted[lower];
      return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    };
    
    const { baselineLower: p40, optimistic: p75 } = this.config.scenarioThresholds;
    const price40 = getQuantilePrice(p40);
    const price75 = getQuantilePrice(p75);
    
    // 计算基准情景中上涨的比例
    const baselineUpRatio = (price75 - currentPrice) / (price75 - price40);
    
    // 上涨概率 = 乐观概率 + 基准概率 × 基准上涨比例
    const calculatedUpProb = scenarioProbs.optimistic + scenarioProbs.baseline * baselineUpRatio;
    const up = Math.round(calculatedUpProb);
    const down = 100 - up;
    
    console.log(`[蒙特卡洛概率计算] 乐观概率:${scenarioProbs.optimistic}%, 基准概率:${scenarioProbs.baseline}%, 基准上涨比例:${(baselineUpRatio * 100).toFixed(1)}%, 计算上涨概率:${up}%`);
    
    return { up, down };
  }

  /**
   * 计算情景概率（基于实际分布）
   */
  private calculateScenarios(finalPrices: number[], currentPrice: number): {
    optimistic: number;
    baseline: number;
    pessimistic: number;
  } {
    const { optimistic: p75, baselineLower: p40, pessimistic: p25 } = this.config.scenarioThresholds;
    const sorted = [...finalPrices].sort((a, b) => a - b);
    const n = sorted.length;

    // 获取分位数价格
    const getQuantilePrice = (q: number): number => {
      const pos = q * (n - 1);
      const lower = Math.floor(pos);
      const upper = Math.ceil(pos);
      const weight = pos - lower;
      if (upper >= n) return sorted[n - 1];
      if (lower === upper) return sorted[lower];
      return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    };

    const price75 = getQuantilePrice(p75);
    const price40 = getQuantilePrice(p40);
    const price25 = getQuantilePrice(p25);

    // 基于实际分布计算概率
    const optimisticCount = finalPrices.filter(p => p >= price75).length;
    const pessimisticCount = finalPrices.filter(p => p < price40).length;
    const baselineCount = n - optimisticCount - pessimisticCount;

    let optimistic = Math.round((optimisticCount / n) * 100);
    let pessimistic = Math.round((pessimisticCount / n) * 100);
    let baseline = Math.round((baselineCount / n) * 100);

    // 概率调整确保总和为100%
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

    return { optimistic, baseline, pessimistic };
  }

  /**
   * 验证概率一致性
   */
  private validateProbabilityConsistency(upProbability: number, scenarios: { optimistic: number; baseline: number; pessimistic: number }): void {
    // 乐观情景应该与上涨概率大致一致
    const optimisticUpDiff = Math.abs(scenarios.optimistic - upProbability);
    if (optimisticUpDiff > 5) {
      console.warn(`[蒙特卡洛] 概率一致性警告: 上涨概率(${upProbability}%)与乐观情景概率(${scenarios.optimistic}%)差异 > 5%`);
    }
  }

  /**
   * 计算风险收益比
   */
  private calculateRiskRewardRatio(finalPrices: number[], currentPrice: number): number {
    const sorted = [...finalPrices].sort((a, b) => a - b);
    const n = sorted.length;

    // 使用 P75 作为乐观目标，P25 作为悲观止损
    const getQuantilePrice = (q: number): number => {
      const pos = q * (n - 1);
      const lower = Math.floor(pos);
      const upper = Math.ceil(pos);
      const weight = pos - lower;
      if (upper >= n) return sorted[n - 1];
      if (lower === upper) return sorted[lower];
      return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    };

    const p75Price = getQuantilePrice(0.75);
    const p25Price = getQuantilePrice(0.25);

    const upside = Math.abs(p75Price - currentPrice);
    const downside = Math.abs(currentPrice - p25Price);
    return downside > 0 ? Math.round((upside / downside) * 100) / 100 : 0;
  }

  /**
   * 计算P40分位数
   */
  private calculateP40(finalPrices: number[]): number {
    const sorted = [...finalPrices].sort((a, b) => a - b);
    const n = sorted.length;
    const q = 0.40;
    const pos = q * (n - 1);
    const lower = Math.floor(pos);
    const upper = Math.ceil(pos);
    const weight = pos - lower;
    if (upper >= n) return sorted[n - 1];
    if (lower === upper) return sorted[lower];
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * 构建返回结果
   */
  private buildResult(
    currentPrice: number,
    quantiles: { p25: number; p50: number; p75: number; p10: number; p90: number },
    probabilities: { up: number; down: number },
    avgReturn: number,
    volatility: number,
    variance: number,
    finalPrices?: number[],
    existingScenarioProbs?: { optimistic: number; baseline: number; pessimistic: number }
  ): MonteCarloResult {
    const { p25, p50, p75, p10, p90 } = quantiles;

    // 使用传入的finalPrices或重新生成
    const drift = avgReturn - variance / 2;
    const prices = finalPrices || this.generateSimulations(currentPrice, drift, volatility);

    // 计算P40分位数
    const p40 = this.calculateP40(prices);

    // 使用传入的情景概率或重新计算
    const scenarioProbs = existingScenarioProbs || this.calculateScenarios(prices, currentPrice);

    // 验证概率一致性（上涨概率应该 ≈ 乐观概率 + 基准上涨部分）
    this.validateProbabilityConsistency(probabilities.up, scenarioProbs);

    // 计算风险收益比（使用 P75/P25）
    const riskRewardRatio = this.calculateRiskRewardRatio(prices, currentPrice);

    return {
      scenarios: [
        {
          type: '乐观',
          probability: scenarioProbs.optimistic,
          priceRange: [p75, p90],
          expectedReturn: Math.round(((p90 - currentPrice) / currentPrice) * 100 * 10) / 10
        },
        {
          type: '基准',
          probability: scenarioProbs.baseline,
          priceRange: [p40, p75],
          expectedReturn: Math.round(((p50 - currentPrice) / currentPrice) * 100 * 10) / 10
        },
        {
          type: '悲观',
          probability: scenarioProbs.pessimistic,
          priceRange: [p10, p40],
          expectedReturn: Math.round(((p10 - currentPrice) / currentPrice) * 100 * 10) / 10
        }
      ],
      upProbability: probabilities.up,
      downProbability: probabilities.down,
      expectedPrice: Math.round(p50 * 100) / 100,
      riskRewardRatio,
      derivationSteps: this.getDerivationSteps(avgReturn, variance, volatility, quantiles, probabilities, scenarioProbs, p40)
    };
  }

  /**
   * 获取推导步骤
   */
  private getDerivationSteps(
    avgReturn: number,
    variance: number,
    volatility: number,
    quantiles: { p25: number; p50: number; p75: number; p10: number; p90: number },
    probabilities: { up: number; down: number },
    scenarioProbs: { optimistic: number; baseline: number; pessimistic: number },
    p40: number
  ): string[] {
    const { p25, p50, p75, p10, p90 } = quantiles;

    return [
      '步骤1：计算历史收益率序列（对数收益率）',
      `步骤2：平均收益率 μ = ${(avgReturn * 100).toFixed(4)}%（日收益率）`,
      `步骤3：收益率方差 σ² = ${(variance * 10000).toFixed(4)}%²`,
      `步骤4：波动率 σ = ${(volatility * 100).toFixed(4)}%（标准差）`,
      `步骤5：漂移率 = μ - σ²/2 = ${((avgReturn - variance / 2) * 100).toFixed(4)}%`,
      `步骤6：运行${this.config.simulations.toLocaleString()}次蒙特卡洛模拟`,
      `步骤7：模拟周期 = ${this.config.days}个交易日`,
      `步骤8：计算分位数 P10=${p10.toFixed(2)}, P25=${p25.toFixed(2)}, P40=${p40.toFixed(2)}, P50=${p50.toFixed(2)}, P75=${p75.toFixed(2)}, P90=${p90.toFixed(2)}`,
      `步骤9：统计涨跌概率分布 - 上涨概率: ${probabilities.up}%, 下跌概率: ${probabilities.down}%`,
      `步骤10：情景概率计算 - 乐观: ${scenarioProbs.optimistic}%, 基准: ${scenarioProbs.baseline}%, 悲观: ${scenarioProbs.pessimistic}%`,
      `步骤11：价格区间 - 乐观: [${p75.toFixed(2)}, ${p90.toFixed(2)}], 基准: [${p40.toFixed(2)}, ${p75.toFixed(2)}], 悲观: [${p10.toFixed(2)}, ${p40.toFixed(2)}]`
    ];
  }

  /**
   * 使用默认参数运行模拟
   */
  private runWithDefaults(currentPrice: number): MonteCarloResult {
    const annualVolatility = 0.25;
    const dailyVolatility = annualVolatility / Math.sqrt(252);
    const drift = 0.0002;

    const finalPrices = this.generateSimulations(currentPrice, drift, dailyVolatility);
    const quantiles = this.calculateQuantiles(finalPrices);
    const probabilities = this.calculateProbabilities(finalPrices, currentPrice);

    // 计算P40分位数
    const p40 = this.calculateP40(finalPrices);

    // 计算情景概率（基于实际分布）
    const scenarioProbs = this.calculateScenarios(finalPrices, currentPrice);

    // 验证概率一致性
    this.validateProbabilityConsistency(probabilities.up, scenarioProbs);

    // 计算风险收益比（使用 P75/P25）
    const riskRewardRatio = this.calculateRiskRewardRatio(finalPrices, currentPrice);

    const { p25, p50, p75, p10, p90 } = quantiles;

    return {
      scenarios: [
        {
          type: '乐观',
          probability: scenarioProbs.optimistic,
          priceRange: [p75, p90],
          expectedReturn: Math.round(((p90 - currentPrice) / currentPrice) * 100 * 10) / 10
        },
        {
          type: '基准',
          probability: scenarioProbs.baseline,
          priceRange: [p40, p75],
          expectedReturn: Math.round(((p50 - currentPrice) / currentPrice) * 100 * 10) / 10
        },
        {
          type: '悲观',
          probability: scenarioProbs.pessimistic,
          priceRange: [p10, p40],
          expectedReturn: Math.round(((p10 - currentPrice) / currentPrice) * 100 * 10) / 10
        }
      ],
      upProbability: probabilities.up,
      downProbability: probabilities.down,
      expectedPrice: Math.round(p50 * 100) / 100,
      riskRewardRatio,
      derivationSteps: [
        '步骤1：使用A股市场默认波动率参数（年化25%）',
        `步骤2：日波动率 = ${(dailyVolatility * 100).toFixed(4)}%（年化/√252）`,
        `步骤3：假设漂移率 = ${(drift * 100).toFixed(4)}%（日收益率）`,
        `步骤4：运行${this.config.simulations.toLocaleString()}次蒙特卡洛模拟`,
        `步骤5：模拟周期 = ${this.config.days}个交易日`,
        `步骤6：计算分位数 P10=${p10.toFixed(2)}, P25=${p25.toFixed(2)}, P40=${p40.toFixed(2)}, P50=${p50.toFixed(2)}, P75=${p75.toFixed(2)}, P90=${p90.toFixed(2)}`,
        `步骤7：统计涨跌概率分布 - 上涨概率: ${probabilities.up}%, 下跌概率: ${probabilities.down}%`,
        `步骤8：情景概率计算 - 乐观: ${scenarioProbs.optimistic}%, 基准: ${scenarioProbs.baseline}%, 悲观: ${scenarioProbs.pessimistic}%`,
        `步骤9：价格区间 - 乐观: [${p75.toFixed(2)}, ${p90.toFixed(2)}], 基准: [${p40.toFixed(2)}, ${p75.toFixed(2)}], 悲观: [${p10.toFixed(2)}, ${p40.toFixed(2)}]`,
        '注：历史数据不足，使用市场典型参数进行模拟'
      ]
    };
  }
}

// ==================== 板块分析器 ====================

class SectorAnalyzer {
  private config: SectorConfig;
  private dataFetcher: DataFetcher;

  constructor(dataFetcher: DataFetcher, config?: Partial<SectorConfig>) {
    this.dataFetcher = dataFetcher;
    this.config = {
      seasonalAdjustment: true,
      dataSources: ['eastmoney', 'tencent'],
      scoringWeights: {
        sentiment: 0.30,
        capital: 0.35,
        technical: 0.20,
        fundamental: 0.15
      },
      ...config
    };
  }

  /**
   * 分析热门板块 - 使用RealDataFetcher获取真实数据
   */
  async analyzeSectors(): Promise<HotSector[]> {
    try {
      // 使用新的RealDataFetcher获取真实板块数据
      const sectors = await this.dataFetcher.fetchHotSectors();

      if (sectors.length > 0) {
        return await this.processRealData(sectors);
      }

      console.warn('[板块分析] API无数据，生成智能模拟数据');
      return this.generateSimulatedSectors();
    } catch (error) {
      console.error('[板块分析] 分析失败:', error);
      return this.generateSimulatedSectors();
    }
  }

  /**
   * 处理真实API数据
   */
  private async processRealData(sectors: any[]): Promise<HotSector[]> {
    const hotSectors: HotSector[] = [];

    // 修复：只取前6个板块
    for (const sector of sectors.slice(0, 6)) {
      const topStocks = await this.dataFetcher.fetchSectorStocks(sector.code, 10);

      const mainForceRatio = this.safeNumber(sector.mainForceRatio, 0);
      const changePercent = this.safeNumber(sector.changePercent, 0);
      const netInflow = this.safeNumber(sector.netInflow, 0);
      const turnoverRate = this.safeNumber(sector.turnoverRate, 0);

      // 应用季节性调整
      const seasonalFactor = this.getSeasonalFactor();

      // 多维度评分计算
      const dimensions = this.calculateDimensions(
        mainForceRatio,
        changePercent,
        netInflow,
        turnoverRate,
        seasonalFactor
      );

      // 综合评分
      const score = this.calculateCompositeScore(dimensions);

      // 确定趋势
      const trend = this.determineTrend(score, changePercent);

      hotSectors.push({
        name: sector.name || '未知板块',
        score: Math.round(score),
        changePercent: Math.round(changePercent * 100) / 100,
        dimensions: {
          sentiment: Math.round(dimensions.sentiment),
          capital: Math.round(dimensions.capital),
          technical: Math.round(dimensions.technical),
          fundamental: Math.round(dimensions.fundamental)
        },
        trend,
        topStocks: topStocks.length > 0 ? topStocks : this.getDefaultTopStocks()
      });
    }

    return hotSectors;
  }

  /**
   * 计算各维度评分
   */
  private calculateDimensions(
    mainForceRatio: number,
    changePercent: number,
    netInflow: number,
    turnoverRate: number,
    seasonalFactor: number
  ): { sentiment: number; capital: number; technical: number; fundamental: number } {
    // 情绪维度：基于涨跌幅和换手率
    const sentiment = this.clampNumber(50 + changePercent * 3 * seasonalFactor + turnoverRate * 0.5, 0, 100);

    // 资金维度：基于主力净流入和主力占比
    const capital = this.clampNumber(50 + mainForceRatio * 0.6 + Math.sign(netInflow) * 10, 0, 100);

    // 技术维度：综合情绪和资金
    const technical = this.clampNumber((sentiment + capital) / 2 * 0.9, 0, 100);

    // 基本面维度：基于市值和稳定性
    const fundamental = this.clampNumber((capital * 0.6 + 40) * seasonalFactor, 0, 100);

    return { sentiment, capital, technical, fundamental };
  }

  /**
   * 计算综合评分
   */
  private calculateCompositeScore(dimensions: { sentiment: number; capital: number; technical: number; fundamental: number }): number {
    const { sentiment, capital, technical, fundamental } = dimensions;
    const { sentiment: w1, capital: w2, technical: w3, fundamental: w4 } = this.config.scoringWeights;

    return sentiment * w1 + capital * w2 + technical * w3 + fundamental * w4;
  }

  /**
   * 确定板块趋势
   */
  private determineTrend(score: number, changePercent: number): HotSector['trend'] {
    if (score >= 85) return '强势热点';
    if (score >= 75 && changePercent > 3) return '新兴热点';
    if (score >= 70) return '持续热点';
    return '降温';
  }

  /**
   * 获取季节性调整因子
   */
  private getSeasonalFactor(): number {
    if (!this.config.seasonalAdjustment) return 1.0;

    const month = new Date().getMonth() + 1;

    // 春季行情（2-4月）：通常较活跃
    if (month >= 2 && month <= 4) return 1.1;
    // 夏季（5-7月）：震荡调整
    if (month >= 5 && month <= 7) return 0.95;
    // 秋季（8-10月）：可能有机会
    if (month >= 8 && month <= 10) return 1.05;
    // 冬季（11-1月）：年末效应
    return 0.9;
  }

  /**
   * 生成智能模拟数据 - 2026年热点板块
   */
  private generateSimulatedSectors(): HotSector[] {
    const seasonalFactor = this.getSeasonalFactor();

    // 2026年热点板块数据
    const simulatedSectors = [
      { name: 'AI应用', baseScore: 88, change: 5.2 },
      { name: '算力租赁', baseScore: 85, change: 4.8 },
      { name: '低空经济', baseScore: 82, change: 4.5 },
      { name: '人形机器人', baseScore: 78, change: 3.9 },
      { name: '固态电池', baseScore: 75, change: 3.5 },
      { name: '商业航天', baseScore: 72, change: 3.2 },
      { name: '脑机接口', baseScore: 68, change: 2.8 },
      { name: '量子计算', baseScore: 65, change: 2.5 }
    ];

    return simulatedSectors.map(({ name, baseScore, change }) => {
      const adjustedScore = baseScore * seasonalFactor;
      const sentiment = this.clampNumber(adjustedScore + (Math.random() - 0.5) * 10, 0, 100);
      const capital = this.clampNumber(adjustedScore * 0.9 + (Math.random() - 0.5) * 10, 0, 100);
      const technical = this.clampNumber((sentiment + capital) / 2, 0, 100);
      const fundamental = this.clampNumber(adjustedScore * 0.8, 0, 100);

      const score = this.calculateCompositeScore({ sentiment, capital, technical, fundamental });
      const trend = this.determineTrend(score, change);

      return {
        name,
        score: Math.round(score),
        changePercent: change,
        dimensions: {
          sentiment: Math.round(sentiment),
          capital: Math.round(capital),
          technical: Math.round(technical),
          fundamental: Math.round(fundamental)
        },
        trend,
        topStocks: this.getDefaultTopStocks()
      };
    });
  }

  private getDefaultTopStocks(): string[] {
    return ['000001', '000002', '000063', '600000', '600519'];
  }

  private safeNumber(value: any, defaultValue: number = 0): number {
    if (value === null || value === undefined) return defaultValue;
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }

  private clampNumber(value: number, min: number, max: number): number {
    if (isNaN(value)) return min;
    return Math.min(max, Math.max(min, value));
  }
}

// ==================== 股票选择器（委托给RealStockSelector） ====================

class StockSelector {
  private realSelector: RealStockSelector;

  constructor(dataFetcher: DataFetcher, config?: Partial<StockSelectorConfig>) {
    // 使用RealStockSelector作为底层实现
    this.realSelector = new RealStockSelector(dataFetcher, {
      supportDistanceRange: config?.supportDistanceRange || { min: -50, max: 50 },
      minUpwardSpace: config?.minUpwardSpace || 3,
      maxPE: 200,
      minProfitGrowth: -50,
      minMarketCap: 1_0000_0000, // 降低市值要求到1亿
      factorWeights: {
        valuation: 0.30,
        growth: 0.20,
        scale: 0.10,
        momentum: 0.15,
        quality: 0.10,
        support: 0.15
      },
      scoreThresholds: {
        strongBuy: 75,
        buy: 65,
        cautious: 55
      }
    });
  }

  /**
   * 筛选推荐股票 - 委托给RealStockSelector
   */
  async selectStocks(stockCodes: string[]): Promise<StockRecommendation[]> {
    return this.realSelector.selectStocks(stockCodes);
  }
}

// ==================== 选股服务（主类） ====================

export class DynamicAnalysisService {
  // 使用新的RealDataFetcher和RealStockSelector
  private dataFetcher = realDataFetcher;
  private monteCarloSimulator = new MonteCarloSimulator();
  private sectorAnalyzer = new SectorAnalyzer(this.dataFetcher as DataFetcher);
  private stockSelector = new StockSelector(this.dataFetcher as DataFetcher);
  private dynamicSectorAnalyzer = dynamicSectorAnalyzer;

  // 保持向后兼容：原有的计算因子方法
  private calculateValuationScore(pe: number, peg: number, pb: number): number {
    let score = 50;
    if (pe < 20) score += 30;
    else if (pe < 30) score += 20;
    else if (pe < 40) score += 10;
    else if (pe < 60) score += 0;
    else score -= 10;
    
    if (peg < 1) score += 20;
    else if (peg < 1.5) score += 10;
    
    if (pb < 3) score += 20;
    else if (pb < 5) score += 10;
    
    return Math.min(100, Math.max(0, score));
  }

  private calculateGrowthScore(profitGrowth: number): number {
    let score = 50;
    if (profitGrowth > 50) score += 40;
    else if (profitGrowth > 30) score += 30;
    else if (profitGrowth > 15) score += 20;
    else if (profitGrowth > 0) score += 10;
    return Math.min(100, score);
  }

  private calculateQualityScore(roe: number): number {
    let score = 50;
    if (roe > 15) score += 40;
    else if (roe > 10) score += 30;
    else if (roe > 5) score += 20;
    return Math.min(100, score);
  }

  // 主函数：获取推荐股票（委托给StockSelector）
  async getStockRecommendations(stockCodes: string[]): Promise<StockRecommendation[]> {
    return this.stockSelector.selectStocks(stockCodes);
  }

  // 获取热门板块（使用新的动态板块分析器）
  async getHotSectors(): Promise<HotSector[]> {
    const dynamicSectors = await this.dynamicSectorAnalyzer.discoverHotSectors(6);
    // 转换为旧接口格式保持兼容
    // 注意：dimensions中移除了attention维度，使用momentum替代
    return dynamicSectors.map(s => ({
      name: s.name,
      score: s.score,
      changePercent: s.changePercent,
      dimensions: {
        sentiment: s.dimensions.momentum,  // 使用momentum替代已移除的attention
        capital: s.dimensions.capital,
        technical: s.dimensions.technical,
        fundamental: s.dimensions.fundamental
      },
      trend: s.trend === '观察' ? '持续热点' : s.trend,
      topStocks: s.topStocks.map(stock => stock.code)
    }));
  }

  /**
   * 获取动态热门板块（新接口 - 返回完整动态数据）
   */
  async getDynamicHotSectors(limit: number = 6): Promise<DynamicHotSector[]> {
    return this.dynamicSectorAnalyzer.discoverHotSectors(limit);
  }

  /**
   * 获取精选股票池 - 从热门板块获取成分股并应用六因子筛选
   * 修复：确保返回真实数据
   */
  async getFeaturedStocks(count: number = 5): Promise<StockRecommendation[]> {
    try {
      console.log('[精选股票池] 开始获取...');
      
      // 1. 从热门板块获取成分股（使用RealDataFetcher）
      const stockCodes = await this.dataFetcher.fetchHotSectorTopStocks(30);
      console.log(`[精选股票池] 从热门板块获取 ${stockCodes.length} 只成分股`);
      
      if (stockCodes.length === 0) {
        console.warn('[精选股票池] 未获取到成分股');
        return [];
      }
      
      // 2. 应用六因子筛选
      const recommendations = await this.stockSelector.selectStocks(stockCodes);
      console.log(`[精选股票池] 六因子筛选完成: ${recommendations.length} 只股票符合条件`);
      
      // 3. 返回指定数量的股票
      const result = recommendations.slice(0, count);
      console.log(`[精选股票池] 返回 ${result.length} 只精选股票`);
      
      return result;
      
    } catch (error) {
      console.error('[精选股票池] 获取失败:', error);
      return [];
    }
  }

  // 蒙特卡洛模拟（委托给MonteCarloSimulator）
  async runMonteCarlo(currentPrice: number, historicalPrices: number[]): Promise<MonteCarloResult> {
    return this.monteCarloSimulator.runSimulation(currentPrice, historicalPrices);
  }

  // 从股票代码获取K线数据并运行蒙特卡洛模拟
  async runMonteCarloForStock(stockCode: string): Promise<MonteCarloResult | null> {
    try {
      // 1. 获取实时行情
      const quote = await this.dataFetcher.fetchStockQuote(stockCode);
      if (!quote || !quote.currentPrice) {
        console.error(`[蒙特卡洛] 无法获取${stockCode}的行情数据`);
        return null;
      }
      
      // 2. 获取历史价格数据
      const historicalPrices = await this.dataFetcher.fetchHistoricalPrices(stockCode);
      
      // 3. 运行蒙特卡洛模拟
      return this.monteCarloSimulator.runSimulation(quote.currentPrice, historicalPrices || []);
      
    } catch (error) {
      console.error(`[蒙特卡洛] ${stockCode}模拟失败:`, error);
      return null;
    }
  }

  // 辅助方法：安全获取数值
  private safeNumber(value: any, defaultValue: number = 0): number {
    if (value === null || value === undefined) return defaultValue;
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }

  // 辅助方法：限制数值范围
  private clampNumber(value: number, min: number, max: number): number {
    if (isNaN(value)) return min;
    return Math.min(max, Math.max(min, value));
  }
}

export const dynamicAnalysisService = new DynamicAnalysisService();
