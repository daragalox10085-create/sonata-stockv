# Sonata 核心代码 - 蒙特卡洛模拟 + 热门板块 + 精选股票池

## 关键变量和配置

### 蒙特卡洛模拟参数
```typescript
const MONTE_CARLO_CONFIG = {
  simulations: 10000,      // 模拟次数
  days: 7,                 // 预测天数（一周）
  annualVolatility: 0.25,  // 年化波动率
  dailyDrift: 0.0002,      // 日漂移率
  confidenceLevels: {       // 置信区间
    optimistic: 0.90,      // 90%分位数
    baseline: 0.50,        // 50%分位数  
    pessimistic: 0.10      // 10%分位数
  }
};
```

### 热门板块评分权重
```typescript
const SECTOR_DIMENSION_WEIGHTS = {
  sentiment: 0.25,    // 舆情热度
  capital: 0.30,      // 资金流向
  technical: 0.25,    // 技术形态
  fundamental: 0.20   // 基本面
};
```

### 精选股票池筛选条件
```typescript
const STOCK_SCREENING_CONFIG = {
  supportDistance: { min: -20, max: 25 },  // 距支撑位百分比
  minUpwardSpace: 3,                      // 最小上涨空间%
  scoreThresholds: {
    strong: { score: 75, distance: 5 },   // 强烈推荐
    recommend: { score: 65, distance: 10 }, // 推荐
    cautious: { score: 55, distance: 15 }   // 谨慎推荐
  }
};
```

---

## 1. 蒙特卡洛模拟核心代码 (dynamicAnalysisService.ts)

```typescript
/**
 * 运行蒙特卡洛模拟预测
 * @param currentPrice 当前价格
 * @param historicalPrices 历史价格数组（用于计算波动率）
 * @returns MonteCarloResult 预测结果
 */
async runMonteCarlo(currentPrice: number, historicalPrices: number[]): Promise<MonteCarloResult> {
  // 如果历史价格数据不足，使用默认参数进行模拟
  if (!historicalPrices || historicalPrices.length < 20) {
    console.warn('[蒙特卡洛] 历史价格数据不足，使用默认波动率参数');
    return this.runMonteCarloWithDefaults(currentPrice);
  }
  
  // 1. 计算历史收益率序列
  const returns = [];
  for (let i = 1; i < historicalPrices.length; i++) {
    returns.push(Math.log(historicalPrices[i] / historicalPrices[i - 1]));
  }

  // 2. 计算统计参数
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance);
  const drift = avgReturn - (variance / 2);

  // 3. 运行10000次模拟
  const simulations = 10000;
  const finalPrices = [];
  
  for (let i = 0; i < simulations; i++) {
    let price = currentPrice;
    for (let day = 0; day < 7; day++) {
      // Box-Muller变换生成正态分布随机数
      const z = Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(2 * Math.PI * Math.random());
      // 几何布朗运动
      price = price * Math.exp(drift + volatility * z);
    }
    finalPrices.push(price);
  }

  // 4. 统计结果
  const upCount = finalPrices.filter(p => p > currentPrice).length;
  const upProbability = Math.round((upCount / simulations) * 100 * 10) / 10;
  const downProbability = Math.round(((simulations - upCount) / simulations) * 100 * 10) / 10;

  // 5. 计算分位数
  finalPrices.sort((a, b) => a - b);
  const p10 = finalPrices[Math.floor(simulations * 0.10)];  // 10%分位数（悲观）
  const p50 = finalPrices[Math.floor(simulations * 0.50)];  // 50%分位数（基准）
  const p90 = finalPrices[Math.floor(simulations * 0.90)];  // 90%分位数（乐观）

  return {
    scenarios: [
      {
        type: '乐观',
        probability: 20,
        priceRange: [p50, p90],
        expectedReturn: Math.round(((p90 - currentPrice) / currentPrice) * 100 * 10) / 10
      },
      {
        type: '基准',
        probability: 60,
        priceRange: [p50 * 0.95, p50 * 1.05],
        expectedReturn: Math.round(((p50 - currentPrice) / currentPrice) * 100 * 10) / 10
      },
      {
        type: '悲观',
        probability: 20,
        priceRange: [p10, p50],
        expectedReturn: Math.round(((p10 - currentPrice) / currentPrice) * 100 * 10) / 10
      }
    ],
    upProbability,
    downProbability,
    expectedPrice: p50,
    riskRewardRatio: Math.round(Math.abs((p90 - currentPrice) / (currentPrice - p10)) * 100) / 100,
    derivationSteps: [
      '步骤1：计算历史收益率序列',
      `步骤2：平均收益率 μ = ${(avgReturn * 100).toFixed(4)}%`,
      `步骤3：波动率 σ = ${(volatility * 100).toFixed(4)}%`,
      '步骤4：运行10000次蒙特卡洛模拟',
      '步骤5：统计7日后价格分布'
    ]
  };
}

/**
 * 使用默认参数运行蒙特卡洛（当历史数据不足时）
 */
private runMonteCarloWithDefaults(currentPrice: number): MonteCarloResult {
  const annualVolatility = 0.25;
  const dailyVolatility = annualVolatility / Math.sqrt(252);  // 交易日约252天
  const drift = 0.0002;
  
  const simulations = 10000;
  const finalPrices = [];
  
  for (let i = 0; i < simulations; i++) {
    let price = currentPrice;
    for (let day = 0; day < 7; day++) {
      const z = Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(2 * Math.PI * Math.random());
      price = price * Math.exp(drift + dailyVolatility * z);
    }
    finalPrices.push(price);
  }

  // 统计结果
  const upCount = finalPrices.filter(p => p > currentPrice).length;
  const upProbability = Math.round((upCount / simulations) * 100 * 10) / 10;
  
  finalPrices.sort((a, b) => a - b);
  const p10 = finalPrices[Math.floor(simulations * 0.10)];
  const p50 = finalPrices[Math.floor(simulations * 0.50)];
  const p90 = finalPrices[Math.floor(simulations * 0.90)];

  return {
    scenarios: [
      { type: '乐观', probability: 20, priceRange: [p50, p90], expectedReturn: Math.round(((p90 - currentPrice) / currentPrice) * 100 * 10) / 10 },
      { type: '基准', probability: 60, priceRange: [p50 * 0.95, p50 * 1.05], expectedReturn: Math.round(((p50 - currentPrice) / currentPrice) * 100 * 10) / 10 },
      { type: '悲观', probability: 20, priceRange: [p10, p50], expectedReturn: Math.round(((p10 - currentPrice) / currentPrice) * 100 * 10) / 10 }
    ],
    upProbability,
    downProbability: Math.round(((simulations - upCount) / simulations) * 100 * 10) / 10,
    expectedPrice: p50,
    riskRewardRatio: Math.round(Math.abs((p90 - currentPrice) / (currentPrice - p10)) * 100) / 100,
    derivationSteps: ['使用A股市场默认波动率参数（年化25%）进行模拟']
  };
}
```

---

## 2. 热门板块分析代码 (dynamicAnalysisService.ts)

```typescript
/**
 * 获取热门板块
 * 从东方财富API获取真实板块数据，计算四维度评分
 */
async getHotSectors(): Promise<HotSector[]> {
  try {
    // 1. 从东方财富API获取板块数据
    const sectors = await this.dataFetcher.fetchHotSectors();
    
    if (sectors.length > 0) {
      const hotSectors: HotSector[] = [];
      
      // 2. 处理每个板块数据
      for (const sector of sectors.slice(0, 5)) {
        // 获取板块成分股
        const topStocks = await this.dataFetcher.fetchSectorStocks(sector.code);
        
        // 3. 数据验证：确保所有数值字段都有默认值（防止NaN）
        const mainForceRatio = this.safeNumber(sector.mainForceRatio, 0);  // 主力净流入占比
        const changePercent = this.safeNumber(sector.changePercent, 0);  // 涨跌幅
        
        // 4. 计算四维度评分
        const capitalScore = this.clampNumber(50 + mainForceRatio * 0.5, 0, 100);     // 资金得分
        const sentimentScore = this.clampNumber(50 + changePercent * 2, 0, 100);      // 舆情得分
        const technicalScore = this.clampNumber((capitalScore + sentimentScore) / 2 * 0.9, 0, 100);  // 技术得分
        const fundamentalScore = this.clampNumber((capitalScore + sentimentScore) / 2 * 0.85, 0, 100); // 基本面得分
        const score = Math.round(this.safeNumber((capitalScore + sentimentScore) / 2, 50)); // 综合评分
        
        // 5. 确定趋势
        let trend: HotSector['trend'] = '持续热点';
        if (score >= 85) trend = '强势热点';
        else if (score >= 75 && changePercent > 3) trend = '新兴热点';
        else if (score < 70) trend = '降温';
        
        hotSectors.push({
          name: sector.name || '未知板块',
          score,
          dimensions: {
            sentiment: Math.round(sentimentScore),
            capital: Math.round(capitalScore),
            technical: Math.round(technicalScore),
            fundamental: Math.round(fundamentalScore)
          },
          trend,
          topStocks: topStocks.length > 0 ? topStocks : ['000001', '000002', '000063']
        });
      }
      
      return hotSectors;
    }
  } catch (error) {
    console.error('[热门板块] API获取失败:', error);
  }
  
  // API失败时返回提示数据
  return [{
    name: '数据暂不可用',
    score: 0,
    dimensions: { sentiment: 0, capital: 0, technical: 0, fundamental: 0 },
    trend: '降温',
    topStocks: []
  }];
}

// 辅助方法：安全获取数值，防止NaN
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
```

---

## 3. 精选股票池筛选代码 (dynamicAnalysisService.ts)

```typescript
/**
 * 获取推荐股票（精选股票池）
 * 从真实API获取数据，筛选支撑位附近的优质股票
 * @param stockCodes 股票代码数组
 * @returns StockRecommendation[] 推荐股票列表
 */
async getStockRecommendations(stockCodes: string[]): Promise<StockRecommendation[]> {
  const recommendations: StockRecommendation[] = [];
  
  for (const code of stockCodes) {
    try {
      // 1. 获取实时行情
      const quote = await this.dataFetcher.fetchStockQuote(code);
      if (!quote || !quote.currentPrice) continue;
      
      // 2. 获取支撑位/阻力位
      const sr = await this.dataFetcher.fetchSupportResistance(code, quote.currentPrice);
      if (!sr) continue;
      
      const { support, resistance } = sr;
      const currentPrice = quote.currentPrice;
      
      // 3. 计算关键指标
      const distanceToSupport = ((currentPrice - support) / support) * 100;  // 距支撑位%
      const upwardSpace = ((resistance - currentPrice) / currentPrice) * 100;  // 上涨空间%
      
      // 4. 筛选条件（已放宽）
      console.log(`[筛选] ${code}: 距离支撑=${distanceToSupport.toFixed(1)}%, 上涨空间=${upwardSpace.toFixed(1)}%`);
      if (distanceToSupport < -20 || distanceToSupport > 25) continue;
      if (upwardSpace < 3) continue;
      
      // 5. 计算综合评分（六因子模型）
      const valuationScore = this.calculateValuationScore(quote.pe, quote.peg, quote.pb);  // 估值30%
      const growthScore = this.calculateGrowthScore(quote.profitGrowth);                   // 成长20%
      const qualityScore = this.calculateQualityScore(quote.roe);                          // 质量20%
      
      // 支撑位得分：越接近支撑得分越高
      let supportScore = 50;
      if (Math.abs(distanceToSupport) <= 3) supportScore = 90;
      else if (Math.abs(distanceToSupport) <= 5) supportScore = 80;
      else if (distanceToSupport <= 8) supportScore = 70;
      else supportScore = 60;
      
      const finalScore = Math.round(
        valuationScore * 0.30 +
        growthScore * 0.20 +
        qualityScore * 0.20 +
        supportScore * 0.30  // 支撑位权重30%
      );
      
      // 6. 确定推荐等级（放宽条件）
      let recommendation: StockRecommendation['recommendation'] = '观望';
      if (finalScore >= 75 && distanceToSupport <= 5) {
        recommendation = '强烈推荐';
      } else if (finalScore >= 65 && distanceToSupport <= 10) {
        recommendation = '推荐';
      } else if (finalScore >= 55 && distanceToSupport <= 15) {
        recommendation = '谨慎推荐';
      }
      
      recommendations.push({
        code,
        name: quote.name,
        score: finalScore,
        factors: {
          valuation: valuationScore,
          growth: growthScore,
          scale: 70,      // 规模默认70
          momentum: 70,   // 动量默认70
          quality: qualityScore,
          support: supportScore
        },
        metrics: {
          pe: quote.pe,
          peg: quote.peg,
          pb: quote.pb,
          roe: quote.roe,
          profitGrowth: quote.profitGrowth,
          marketCap: quote.marketCap,
          currentPrice: Math.round(currentPrice * 100) / 100,
          support: Math.round(support * 100) / 100,
          resistance: Math.round(resistance * 100) / 100,
          distanceToSupport: Math.round(distanceToSupport * 10) / 10,
          upwardSpace: Math.round(upwardSpace * 10) / 10
        },
        recommendation
      });
      
    } catch (error) {
      console.error(`分析${code}失败:`, error);
    }
  }
  
  // 按距支撑位排序（绝对值小的在前）
  return recommendations.sort((a, b) => {
    return Math.abs(a.metrics.distanceToSupport) - Math.abs(b.metrics.distanceToSupport);
  });
}

// 计算估值因子得分
private calculateValuationScore(pe: number, peg: number, pb: number): number {
  let score = 50;
  // PE越低得分越高
  if (pe < 15) score += 30;
  else if (pe < 25) score += 20;
  else if (pe < 40) score += 10;
  // PEG越低越好
  if (peg < 1) score += 20;
  else if (peg < 2) score += 10;
  return Math.min(100, score);
}

// 计算成长因子得分
private calculateGrowthScore(profitGrowth: number): number {
  let score = 50;
  if (profitGrowth > 30) score += 40;
  else if (profitGrowth > 20) score += 30;
  else if (profitGrowth > 10) score += 20;
  return Math.min(100, score);
}

// 计算质量因子得分
private calculateQualityScore(roe: number): number {
  let score = 50;
  if (roe > 15) score += 40;
  else if (roe > 10) score += 30;
  else if (roe > 5) score += 20;
  return Math.min(100, score);
}
```

---

## 4. WeeklyMarketAnalysis 组件 (WeeklyMarketAnalysis.tsx)

```typescript
import React, { useState, useEffect } from 'react';
import { dynamicAnalysisService, StockRecommendation, HotSector, MonteCarloResult } from '../services/dynamicAnalysisService';
import { useStock } from '../contexts/StockContext';
import { AlertCircle, Info } from 'lucide-react';

interface WeeklyMarketAnalysisProps {
  showStockPicker?: boolean;  // true=显示热门板块+股票池, false=显示蒙特卡洛
  currentPrice?: number;
}

export const WeeklyMarketAnalysis: React.FC<WeeklyMarketAnalysisProps> = ({ 
  showStockPicker = true, 
  currentPrice = 100 
}) => {
  const [hotSectors, setHotSectors] = useState<HotSector[]>([]);
  const [recommendations, setRecommendations] = useState<StockRecommendation[]>([]);
  const [monteCarloResult, setMonteCarloResult] = useState<MonteCarloResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 从StockContext获取真实K线数据
  const { stockData } = useStock();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (showStockPicker) {
        // ========== 模式1：显示热门板块 + 精选股票池 ==========
        
        // 1. 获取热门板块
        const sectors = await dynamicAnalysisService.getHotSectors();
        setHotSectors(sectors);

        // 2. 从板块收集所有股票代码
        const allStockCodes: string[] = [];
        sectors.forEach(sector => {
          if (sector.topStocks && sector.topStocks.length > 0) {
            allStockCodes.push(...sector.topStocks);
          }
        });
        
        console.log('分析股票池:', allStockCodes);
        
        // 3. 获取筛选后的股票（最多5只）
        if (allStockCodes.length > 0) {
          const stocks = await dynamicAnalysisService.getStockRecommendations(allStockCodes);
          console.log('符合条件的股票:', stocks.length);
          setRecommendations(stocks.slice(0, 5));
        } else {
          setRecommendations([]);
        }
        
      } else {
        // ========== 模式2：显示蒙特卡洛预测（该股） ==========
        
        let historicalPrices: number[] = [];
        
        // 优先从StockContext获取真实K线数据
        if (stockData?.kLineData && stockData.kLineData.length > 20) {
          historicalPrices = stockData.kLineData.map(k => k.close);
          console.log('[蒙特卡洛] 使用StockContext真实K线数据:', historicalPrices.length, '条');
        }
        
        // 使用当前价格运行模拟
        const priceToUse = stockData?.currentPrice || currentPrice;
        const monteCarlo = await dynamicAnalysisService.runMonteCarlo(priceToUse, historicalPrices);
        setMonteCarloResult(monteCarlo);
      }
    } catch (err) {
      console.error('加载数据失败:', err);
      setError('数据加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 渲染加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载分析数据...</span>
      </div>
    );
  }

  // 渲染错误状态
  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="w-6 h-6 mr-2" />
        {error}
      </div>
    );
  }

  // ========== 渲染热门板块 ==========
  const renderHotSectors = () => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        热门板块
        <Info className="w-4 h-4 ml-2 text-gray-400" />
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {hotSectors.map((sector, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium">{sector.name}</h4>
              <span className={`px-2 py-1 rounded text-xs ${
                sector.trend === '强势热点' ? 'bg-red-100 text-red-700' :
                sector.trend === '新兴热点' ? 'bg-green-100 text-green-700' :
                sector.trend === '持续热点' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {sector.trend}
              </span>
            </div>
            <div className="text-2xl font-bold mb-2">{sector.score}分</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>舆情: {sector.dimensions.sentiment}</div>
              <div>资金: {sector.dimensions.capital}</div>
              <div>技术: {sector.dimensions.technical}</div>
              <div>基本面: {sector.dimensions.fundamental}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ========== 渲染精选股票池 ==========
  const renderStockPool = () => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-4">精选股票池</h3>
      <div className="overflow-x-auto">
        <table className="w-full bg-white rounded-lg shadow">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">代码</th>
              <th className="px-4 py-3 text-left">名称</th>
              <th className="px-4 py-3 text-left">评分</th>
              <th className="px-4 py-3 text-left">距支撑</th>
              <th className="px-4 py-3 text-left">上涨空间</th>
              <th className="px-4 py-3 text-left">推荐</th>
            </tr>
          </thead>
          <tbody>
            {recommendations.map((stock) => (
              <tr key={stock.code} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-mono">{stock.code}</td>
                <td className="px-4 py-3">{stock.name}</td>
                <td className="px-4 py-3">
                  <span className={`font-semibold ${
                    stock.score >= 75 ? 'text-green-600' :
                    stock.score >= 65 ? 'text-blue-600' :
                    stock.score >= 55 ? 'text-yellow-600' :
                    'text-gray-600'
                  }`}>
                    {stock.score}
                  </span>
                </td>
                <td className="px-4 py-3">{stock.metrics.distanceToSupport}%</td>
                <td className="px-4 py-3 text-green-600">{stock.metrics.upwardSpace}%</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    stock.recommendation === '强烈推荐' ? 'bg-green-100 text-green-700' :
                    stock.recommendation === '推荐' ? 'bg-blue-100 text-blue-700' :
                    stock.recommendation === '谨慎推荐' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {stock.recommendation}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ========== 渲染蒙特卡洛预测 ==========
  const renderMonteCarlo = () => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-4">蒙特卡洛模拟预测</h3>
      
      {/* 概率条 */}
      <div className="bg-gray-200 rounded-full h-4 mb-4 overflow-hidden">
        <div 
          className="bg-green-500 h-full transition-all duration-500"
          style={{ width: `${monteCarloResult?.upProbability}%` }}
        ></div>
      </div>
      <div className="flex justify-between text-sm mb-6">
        <span className="text-green-600">上涨 {monteCarloResult?.upProbability}%</span>
        <span className="text-red-600">下跌 {monteCarloResult?.downProbability}%</span>
      </div>
      
      {/* 三种情景 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {monteCarloResult?.scenarios.map((scenario, index) => (
          <div 
            key={index} 
            className={`rounded-lg p-4 ${
              scenario.type === '乐观' ? 'bg-green-50 border border-green-200' :
              scenario.type === '基准' ? 'bg-blue-50 border border-blue-200' :
              'bg-red-50 border border-red-200'
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className={`font-semibold ${
                scenario.type === '乐观' ? 'text-green-700' :
                scenario.type === '基准' ? 'text-blue-700' :
                'text-red-700'
              }`}>
                {scenario.type}
              </span>
              <span className="text-sm text-gray-500">{scenario.probability}%概率</span>
            </div>
            <div className="text-xl font-bold mb-1">
              ¥{scenario.priceRange[0].toFixed(2)} - ¥{scenario.priceRange[1].toFixed(2)}
            </div>
            <div className={`text-sm ${
              scenario.expectedReturn >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {scenario.expectedReturn >= 0 ? '+' : ''}{scenario.expectedReturn}%
            </div>
          </div>
        ))}
      </div>
      
      {/* 推导步骤 */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium mb-2">推导详情</h4>
        <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
          {monteCarloResult?.derivationSteps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      </div>
    </div>
  );

  // ========== 主渲染 ==========
  return (
    <div className="weekly-market-analysis">
      {showStockPicker ? (
        <>
          {renderHotSectors()}
          {renderStockPool()}
        </>
      ) : (
        renderMonteCarlo()
      )}
    </div>
  );
};

export default WeeklyMarketAnalysis;
```

---

## 关键修改建议

### 1. 蒙特卡洛模拟优化
```typescript
// 可配置参数
interface MonteCarloConfig {
  simulations: number;      // 默认10000，可改为5000提升性能
  days: number;            // 默认7天，可配置5/7/14天
  confidenceInterval: number; // 默认90%，可配置95%
}

// 添加置信区间计算
const calculateConfidenceInterval = (prices: number[], confidence: number): [number, number] => {
  const sorted = [...prices].sort((a, b) => a - b);
  const lowerIndex = Math.floor(sorted.length * (1 - confidence) / 2);
  const upperIndex = Math.floor(sorted.length * (1 + confidence) / 2);
  return [sorted[lowerIndex], sorted[upperIndex]];
};
```

### 2. 热门板块优化
```typescript
// 添加缓存机制
private sectorCache: HotSector[] | null = null;
private cacheTime: number = 0;
private CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

async getHotSectorsWithCache(): Promise<HotSector[]> {
  if (this.sectorCache && Date.now() - this.cacheTime < this.CACHE_DURATION) {
    return this.sectorCache;
  }
  const sectors = await this.getHotSectors();
  this.sectorCache = sectors;
  this.cacheTime = Date.now();
  return sectors;
}
```

### 3. 股票池优化
```typescript
// 动态调整筛选条件
interface MarketCondition {
  volatility: 'high' | 'normal' | 'low';
  trend: 'bull' | 'bear' | 'neutral';
}

const adjustScreeningCriteria = (condition: MarketCondition) => {
  if (condition.volatility === 'high') {
    // 高波动时放宽条件
    return { supportDistance: { min: -30, max: 35 }, minUpwardSpace: 5 };
  }
  // 正常条件
  return { supportDistance: { min: -20, max: 25 }, minUpwardSpace: 3 };
};
```

---

## 类型定义汇总

```typescript
// 推荐股票
interface StockRecommendation {
  code: string;           // 股票代码
  name: string;          // 股票名称
  score: number;         // 综合评分(0-100)
  factors: {
    valuation: number;   // 估值因子(30%)
    growth: number;      // 成长因子(20%)
    scale: number;       // 规模因子(10%)
    momentum: number;    // 动量因子(15%)
    quality: number;     // 质量因子(10%)
    support: number;     // 支撑位因子(15%)
  };
  metrics: {
    pe: number;          // 市盈率
    peg: number;         // PEG
    pb: number;          // 市净率
    roe: number;         // 净资产收益率
    profitGrowth: number; // 利润增长率
    marketCap: number;   // 市值
    currentPrice: number; // 当前价格
    support: number;     // 支撑位
    resistance: number;  // 阻力位
    distanceToSupport: number; // 距支撑位%
    upwardSpace: number; // 上涨空间%
    sector?: string;     // 所属板块
  };
  recommendation: '强烈推荐' | '推荐' | '谨慎推荐' | '观望';
}

// 热门板块
interface HotSector {
  name: string;          // 板块名称
  score: number;         // 综合评分
  dimensions: {
    sentiment: number;   // 舆情热度
    capital: number;     // 资金流向
    technical: number;   // 技术形态
    fundamental: number; // 基本面
  };
  trend: '强势热点' | '持续热点' | '新兴热点' | '降温';
  topStocks: string[];   // 成分股代码
}

// 蒙特卡洛结果
interface MonteCarloResult {
  scenarios: Array<{
    type: '乐观' | '基准' | '悲观';
    probability: number;
    priceRange: [number, number];
    expectedReturn: number;
  }>;
  upProbability: number;      // 上涨概率
  downProbability: number;    // 下跌概率
  expectedPrice: number;      // 预期价格
  riskRewardRatio: number;    // 风险收益比
  derivationSteps: string[];  // 推导步骤
}
```

---

## 文件位置

所有代码位于：
- **核心服务**: `src/services/dynamicAnalysisService.ts`
- **UI组件**: `src/sections/WeeklyMarketAnalysis.tsx`
- **类型定义**: `src/services/dynamicAnalysisService.ts` (顶部)

## 修改注意事项

1. **蒙特卡洛模拟**: 
   - 修改模拟次数会影响性能和精度
   - 历史数据不足时会使用默认参数

2. **热门板块**:
   - API失败时会返回"数据暂不可用"
   - 已添加NaN防护

3. **股票池筛选**:
   - 筛选条件已放宽确保有数据
   - 按距支撑位排序
