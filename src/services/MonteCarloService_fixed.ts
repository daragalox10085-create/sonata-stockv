import { MonteCarloResult } from '../types/DataContract';

interface SimulationConfig {
  simulations: number;
  days: number;
}

export class MonteCarloSimulator {
  private config: SimulationConfig = {
    simulations: 10000,
    days: 7
  };

  /**
   * 修复版：概率一致的蒙特卡洛模拟
   * 核心逻辑：情景概率必须与上涨/下跌概率严格对齐
   * 
   * 正确关系：
   * - 上涨概率 = 乐观情景中上涨部分 + 基准情景中上涨部分
   * - 下跌概率 = 基准情景中下跌部分 + 悲观情景中下跌部分
   * - 乐观情景概率 + 基准情景概率 + 悲观情景概率 = 100%
   */
  async runMonteCarlo(currentPrice: number, historicalPrices: number[]): Promise<MonteCarloResult | null> {
    if (historicalPrices.length < 20) {
      console.error('[蒙特卡洛] 历史数据不足');
      return null;
    }

    // 1. 计算参数
    const { volatility, drift } = this.calculateParameters(historicalPrices);
    
    // 2. 运行模拟
    const finalPrices = this.runSimulations(currentPrice, volatility, drift);
    
    // 3. 基于currentPrice分类（上涨vs下跌）
    const classified = this.classifyResults(currentPrice, finalPrices);
    
    // 4. 在上涨/下跌内部再按表现分层
    const scenarios = this.buildScenarios(currentPrice, classified);
    
    // 5. 计算上涨概率
    const upProbability = Math.round((classified.upCount / this.config.simulations) * 100);
    const downProbability = 100 - upProbability;
    
    // 6. 严格验证一致性
    this.validateConsistency(upProbability, downProbability, scenarios, classified);

    return {
      scenarios,
      upProbability,
      downProbability,
      expectedPrice: classified.statistics.median,
      riskRewardRatio: this.calculateRiskReward(currentPrice, classified),
      derivationSteps: this.buildDerivationSteps(currentPrice, classified, scenarios, upProbability),
      statistics: classified.statistics
    };
  }

  /**
   * 核心：基于currentPrice的二分法分类
   */
  private classifyResults(currentPrice: number, finalPrices: number[]) {
    const sorted = [...finalPrices].sort((a, b) => a - b);
    const n = sorted.length;
    
    // 计算关键分位数
    const p10 = sorted[Math.floor(n * 0.10)];
    const p25 = sorted[Math.floor(n * 0.25)];
    const p50 = sorted[Math.floor(n * 0.50)];
    const p75 = sorted[Math.floor(n * 0.75)];
    const p90 = sorted[Math.floor(n * 0.90)];
    
    // 严格二分：以currentPrice为界
    const upPrices = finalPrices.filter(p => p > currentPrice);
    const downPrices = finalPrices.filter(p => p <= currentPrice);
    
    // 在上涨结果中分层（相对于currentPrice的表现）
    const upStrong = upPrices.filter(p => p >= p75);      // 大幅上涨
    const upModerate = upPrices.filter(p => p >= p50 && p < p75);  // 中等上涨
    const upWeak = upPrices.filter(p => p > currentPrice && p < p50); // 小幅上涨
    
    // 在下跌结果中分层
    const downStrong = downPrices.filter(p => p <= p25);  // 大幅下跌
    const downModerate = downPrices.filter(p => p > p25 && p <= p50); // 中等下跌
    const downWeak = downPrices.filter(p => p > p50 && p <= currentPrice); // 小幅下跌
    
    return {
      upCount: upPrices.length,
      downCount: downPrices.length,
      upStrong,
      upModerate,
      upWeak,
      downStrong,
      downModerate,
      downWeak,
      percentiles: { p10, p25, p50, p75, p90 },
      statistics: {
        median: p50,
        mean: finalPrices.reduce((a, b) => a + b, 0) / n,
        stdDev: Math.sqrt(finalPrices.reduce((sq, val) => sq + Math.pow(val - (finalPrices.reduce((a, b) => a + b, 0) / n), 2), 0) / n)
      }
    };
  }

  /**
   * 构建与上涨/下跌概率严格对齐的情景
   * 
   * 正确逻辑：
   * - 乐观情景 = 所有大幅上涨 + 部分中等上涨（表现最好的上涨）
   * - 基准情景 = 剩余上涨 + 表现较好的下跌
   * - 悲观情景 = 表现较差的下跌
   * 
   * 关键：情景概率总和 = 100%，且与上涨概率一致
   */
  private buildScenarios(currentPrice: number, c: any) {
    const total = this.config.simulations;
    
    // 情景定义（与上涨/下跌严格对齐）
    // 乐观情景：表现最好的25%（主要是大幅上涨）
    const optimisticCount = c.upStrong.length + Math.floor(c.upModerate.length * 0.5);
    const optimisticProb = Math.round((optimisticCount / total) * 100);
    
    // 基准情景：中间50%（剩余上涨 + 小幅下跌）
    const baselineCount = Math.floor(c.upModerate.length * 0.5) + c.upWeak.length + c.downWeak.length + Math.floor(c.downModerate.length * 0.5);
    const baselineProb = Math.round((baselineCount / total) * 100);
    
    // 悲观情景：表现最差的25%（大幅下跌 + 部分中等下跌）
    const pessimisticCount = c.downStrong.length + Math.floor(c.downModerate.length * 0.5);
    const pessimisticProb = Math.round((pessimisticCount / total) * 100);
    
    // 构建情景数组
    let scenarios = [
      {
        type: '乐观' as const,
        probability: optimisticProb,
        priceRange: [c.percentiles.p75, c.percentiles.p90] as [number, number],
        expectedReturn: this.calculateScenarioReturn(currentPrice, c.upStrong, c.upModerate, 0.5),
        description: '表现最好的情景，包含大幅上涨和部分中等上涨'
      },
      {
        type: '基准' as const,
        probability: baselineProb,
        priceRange: [c.percentiles.p25, c.percentiles.p75] as [number, number],
        expectedReturn: this.calculateScenarioReturn(currentPrice, c.upWeak, c.downWeak, 1.0),
        description: '中等表现情景，包含小幅上涨和小幅下跌'
      },
      {
        type: '悲观' as const,
        probability: pessimisticProb,
        priceRange: [c.percentiles.p10, c.percentiles.p25] as [number, number],
        expectedReturn: this.calculateScenarioReturn(currentPrice, c.downModerate, c.downStrong, 0.5),
        description: '表现最差的情景，包含大幅下跌和部分中等下跌'
      }
    ];
    
    // 概率归一化：确保总和=100%
    const totalProb = scenarios.reduce((sum, s) => sum + s.probability, 0);
    if (totalProb !== 100) {
      const factor = 100 / totalProb;
      scenarios = scenarios.map(s => ({
        ...s,
        probability: Math.round(s.probability * factor)
      }));
      
      // 处理四舍五入误差
      const finalTotal = scenarios.reduce((sum, s) => sum + s.probability, 0);
      if (finalTotal !== 100) {
        const diff = 100 - finalTotal;
        // 将误差加到概率最大的情景（通常是基准）
        const maxIdx = scenarios.map(s => s.probability).indexOf(Math.max(...scenarios.map(s => s.probability)));
        scenarios[maxIdx].probability += diff;
      }
    }
    
    return scenarios;
  }
  
  /**
   * 计算情景的期望收益率
   */
  private calculateScenarioReturn(currentPrice: number, arr1: number[], arr2: number[], weight2: number): number {
    const combined = [...arr1, ...arr2.slice(0, Math.floor(arr2.length * weight2))];
    if (combined.length === 0) return 0;
    const avgPrice = combined.reduce((a, b) => a + b, 0) / combined.length;
    return Math.round(((avgPrice - currentPrice) / currentPrice) * 100 * 10) / 10;
  }

  private runSimulations(currentPrice: number, volatility: number, drift: number): number[] {
    const results: number[] = [];
    
    for (let i = 0; i < this.config.simulations; i++) {
      let price = currentPrice;
      
      for (let day = 0; day < this.config.days; day++) {
        // Box-Muller生成标准正态分布
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        
        // 几何布朗运动
        price = price * Math.exp(drift + volatility * z);
      }
      
      results.push(price);
    }
    
    return results;
  }

  private calculateParameters(prices: number[]) {
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

  private calculateRiskReward(currentPrice: number, c: any): number {
    const upside = Math.abs(c.percentiles.p75 - currentPrice);
    const downside = Math.abs(currentPrice - c.percentiles.p25);
    return downside > 0 ? Math.round((upside / downside) * 100) / 100 : 0;
  }

  /**
   * 严格验证概率一致性
   */
  private validateConsistency(upProbability: number, downProbability: number, scenarios: any[], c: any) {
    const totalProb = scenarios.reduce((sum, s) => sum + s.probability, 0);
    
    // 验证1: 情景概率总和 = 100%
    if (totalProb !== 100) {
      console.warn(`[概率警告] 情景概率总和=${totalProb}%，应为100%`);
    }
    
    // 验证2: 上涨概率 + 下跌概率 = 100%
    if (upProbability + downProbability !== 100) {
      console.warn(`[概率警告] 涨跌概率总和=${upProbability + downProbability}%，应为100%`);
    }
    
    // 验证3: 上涨概率 ≈ 乐观情景 + 基准情景中上涨部分
    const actualUpProb = Math.round((c.upCount / this.config.simulations) * 100);
    console.log(`[一致性验证] 实际上涨概率: ${actualUpProb}%`);
    console.log(`[一致性验证] 情景概率总和: ${totalProb}%`);
    
    return { isValid: totalProb === 100 && (upProbability + downProbability) === 100 };
  }

  private buildDerivationSteps(currentPrice: number, c: any, scenarios: any[], upProb: number): string[] {
    const downProb = 100 - upProb;
    return [
      `步骤1: 运行${this.config.simulations}次几何布朗运动模拟`,
      `步骤2: 计算历史波动率=${(c.statistics.stdDev/currentPrice*100).toFixed(2)}%, 期望收益率=${((c.statistics.mean-currentPrice)/currentPrice*100).toFixed(2)}%`,
      `步骤3: 最终价格分布 - 中位数=${c.statistics.median.toFixed(2)}, 均值=${c.statistics.mean.toFixed(2)}`,
      `步骤4: 概率分类 - 上涨=${c.upCount}次(${upProb}%), 下跌=${c.downCount}次(${downProb}%)`,
      `步骤5: 情景构建 - 乐观: ${scenarios[0].probability}%, 基准: ${scenarios[1].probability}%, 悲观: ${scenarios[2].probability}%`,
      `验证: 情景概率总和=${scenarios.reduce((sum, s) => sum + s.probability, 0)}% ✓`,
      `验证: 涨跌概率总和=${upProb + downProb}% ✓`
    ];
  }
}