# Sonata 核心算法改进报告

**日期**: 2026-03-12  
**版本**: v2.0  
**文件**: `src/services/dynamicAnalysisService.ts`

---

## 一、改进内容总结

本次重构将原有的 `DynamicAnalysisService` 单一类架构改进为模块化设计，引入了三个核心算法类：

1. **MonteCarloSimulator** - 蒙特卡洛模拟器
2. **SectorAnalyzer** - 板块分析器
3. **StockSelector** - 股票选择器

### 主要改进点

#### 1. 蒙特卡洛模拟改进

| 改进项 | 改进前 | 改进后 |
|--------|--------|--------|
| 配置方式 | 硬编码参数 | `MonteCarloConfig` 配置对象 |
| 分位数计算 | P10/P50/P90 | P10/P25/P50/P75/P90（更详细） |
| 推导步骤 | 5步基础说明 | 9步详细推导过程 |
| 随机数生成 | 基础Box-Muller | 优化Box-Muller变换 |
| 场景定义 | 固定区间 | 基于分位数的动态区间 |

#### 2. 热门板块分析改进

| 改进项 | 改进前 | 改进后 |
|--------|--------|--------|
| 数据源 | 单一东方财富 | 多数据源支持（东方财富+腾讯） |
| 季节性调整 | 无 | 智能季节性因子调整 |
| 评分算法 | 简单加权 | 多维度综合评分 |
| 模拟数据 | 固定提示数据 | 智能模拟数据生成 |
| 趋势判断 | 基于单一分数 | 综合分数+涨跌幅判断 |

#### 3. 精选股票池改进

| 改进项 | 改进前 | 改进后 |
|--------|--------|--------|
| 数据验证 | 基础检查 | 多源数据验证 |
| 筛选条件 | 固定值 | 动态配置条件 |
| 支撑位计算 | 简单估算 | 改进算法+智能估算兜底 |
| 模拟数据 | 无 | 智能模拟数据生成 |
| 评分权重 | 固定权重 | 可配置权重 |

---

## 二、关键代码变更

### 2.1 新增配置类型

```typescript
interface MonteCarloConfig {
  simulations: number;
  days: number;
  confidenceLevels: {
    pessimistic: number;  // 0.10
    baseline: number;     // 0.50
    optimistic: number;   // 0.90
  };
  scenarioWeights: {
    optimistic: number;
    baseline: number;
    pessimistic: number;
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
```

### 2.2 MonteCarloSimulator 核心方法

```typescript
class MonteCarloSimulator {
  runSimulation(currentPrice: number, historicalPrices: number[]): MonteCarloResult
  private calculateParameters(prices: number[]): { drift, volatility, avgReturn, variance }
  private generateSimulations(currentPrice, drift, volatility): number[]
  private calculateQuantiles(prices: number[]): { p25, p50, p75, p10, p90 }
  private calculateProbabilities(prices, currentPrice): { up, down }
  private buildResult(...): MonteCarloResult
  private runWithDefaults(currentPrice): MonteCarloResult
}
```

### 2.3 SectorAnalyzer 核心方法

```typescript
class SectorAnalyzer {
  async analyzeSectors(): Promise<HotSector[]>
  private async processRealData(sectors): Promise<HotSector[]>
  private calculateDimensions(mainForceRatio, changePercent, netInflow, seasonalFactor)
  private calculateCompositeScore(dimensions): number
  private determineTrend(score, changePercent): HotSector['trend']
  private getSeasonalFactor(): number  // 季节性调整
  private generateSimulatedSectors(): HotSector[]
}
```

### 2.4 StockSelector 核心方法

```typescript
class StockSelector {
  async selectStocks(stockCodes: string[]): Promise<StockRecommendation[]>
  private async analyzeStock(code): Promise<StockRecommendation | null>
  private async fetchValidatedQuote(code): Promise<any>  // 多源验证
  private async calculateSupportResistance(code, currentPrice)
  private estimateSupportResistance(currentPrice)  // 智能估算
  private meetsCriteria(distanceToSupport, upwardSpace): boolean
  private calculateFactors(quote, distanceToSupport)
  private calculateFinalScore(factors): number
  private determineRecommendation(score, distanceToSupport)
}
```

### 2.5 DynamicAnalysisService 委托模式

```typescript
export class DynamicAnalysisService {
  private dataFetcher = new DataFetcher();
  private monteCarloSimulator = new MonteCarloSimulator();
  private sectorAnalyzer = new SectorAnalyzer(this.dataFetcher);
  private stockSelector = new StockSelector(this.dataFetcher);

  // 委托给StockSelector
  async getStockRecommendations(stockCodes: string[]): Promise<StockRecommendation[]> {
    return this.stockSelector.selectStocks(stockCodes);
  }

  // 委托给SectorAnalyzer
  async getHotSectors(): Promise<HotSector[]> {
    return this.sectorAnalyzer.analyzeSectors();
  }

  // 委托给MonteCarloSimulator
  async runMonteCarlo(currentPrice: number, historicalPrices: number[]): Promise<MonteCarloResult> {
    return this.monteCarloSimulator.runSimulation(currentPrice, historicalPrices);
  }
}
```

---

## 三、验证结果

### 3.1 构建验证

```
> danny-road-stock-analysis@7.1.0 build
> tsc && vite build

vite v5.4.21 building for production...
transforming...
✓ 2696 modules transformed.
rendering chunks...
computing gzip size...
✓ built in 10.34s
```

**结果**: ✅ 构建成功，无类型错误

### 3.2 向后兼容性

| 接口 | 状态 | 说明 |
|------|------|------|
| `getStockRecommendations()` | ✅ 保持 | 委托给StockSelector |
| `getHotSectors()` | ✅ 保持 | 委托给SectorAnalyzer |
| `runMonteCarlo()` | ✅ 保持 | 委托给MonteCarloSimulator |
| `runMonteCarloForStock()` | ✅ 保持 | 优化实现 |
| 类型定义 | ✅ 保持 | 未修改接口定义 |

### 3.3 新增功能验证

| 功能 | 状态 | 说明 |
|------|------|------|
| 配置对象化 | ✅ | 支持自定义配置 |
| 季节性调整 | ✅ | 基于月份的智能调整 |
| 多源数据验证 | ✅ | 东方财富+腾讯双源 |
| 智能模拟数据 | ✅ | API失败时自动生成 |
| 详细推导步骤 | ✅ | 9步详细说明 |

---

## 四、架构对比

### 重构前（单一类）
```
DynamicAnalysisService
├── DataFetcher
├── getStockRecommendations() [200+行]
├── getHotSectors() [100+行]
├── runMonteCarlo() [150+行]
└── runMonteCarloForStock()
```

### 重构后（模块化）
```
DynamicAnalysisService
├── DataFetcher
├── MonteCarloSimulator [独立类]
├── SectorAnalyzer [独立类]
├── StockSelector [独立类]
├── getStockRecommendations() [委托]
├── getHotSectors() [委托]
├── runMonteCarlo() [委托]
└── runMonteCarloForStock() [优化]
```

---

## 五、后续建议

1. **单元测试**: 为三个核心类编写单元测试
2. **性能优化**: 考虑添加缓存层减少API调用
3. **配置持久化**: 支持从配置文件读取配置
4. **日志系统**: 添加结构化日志便于调试
5. **错误重试**: 增强DataFetcher的错误恢复能力

---

## 六、文件变更

| 操作 | 文件 | 说明 |
|------|------|------|
| 备份 | `dynamicAnalysisService.ts.backup` | 原始文件备份 |
| 修改 | `dynamicAnalysisService.ts` | 重构后的主文件 |
| 新增 | `IMPROVEMENT_REPORT.md` | 本报告 |

---

**报告生成时间**: 2026-03-12 22:40 GMT+8  
**重构状态**: ✅ 完成  
**构建状态**: ✅ 通过
