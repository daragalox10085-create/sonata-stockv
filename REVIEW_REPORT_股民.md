# Sonata股票分析平台 - 资深股民审查报告

**审查日期**: 2026年3月12日  
**审查人**: 资深股民（20年投资经验）  
**审查文件**: 
- `src/services/dynamicAnalysisService.ts` - 核心算法
- `src/services/realDataFetcher.ts` - 数据获取
- `src/services/stockSelector.ts` - 股票筛选
- `src/sections/WeeklyMarketAnalysis.tsx` - UI组件

---

## 总体评价

**严重警告**: 该平台存在多处**严重逻辑错误和数据真实性问题**，不建议在实际投资决策中使用。以下按模块详细分析。

---

## 一、蒙特卡洛模拟模块审查

### 1.1 概率计算逻辑自洽性 ❌ 严重问题

**问题描述**:
```typescript
// 当前实现（第260-285行）
private calculateProbabilities(finalPrices: number[], currentPrice: number, scenarios?: {...}): { up: number; down: number } {
  const scenarioProbs = scenarios || this.calculateScenarios(finalPrices, currentPrice);
  
  // 获取P40和P75价格
  const price40 = getQuantilePrice(p40);
  const price75 = getQuantilePrice(p75);
  
  // 计算基准情景中上涨的比例
  const baselineUpRatio = (price75 - currentPrice) / (price75 - price40);
  
  // 上涨概率 = 乐观概率 + 基准概率 × 基准上涨比例
  const calculatedUpProb = scenarioProbs.optimistic + scenarioProbs.baseline * baselineUpRatio;
  const up = Math.round(calculatedUpProb * 10) / 10;  // ❌ 这里乘以10再除以10？
  const down = Math.round((100 - up) * 10) / 10;
}
```

**严重错误**:
1. **概率计算错误**: `Math.round(calculatedUpProb * 10) / 10` 这个操作意图是保留一位小数，但对于百分比值（如65.3%），结果会变成6.5%，**下跌概率会变成93.5%**！
   - 正确应该是: `Math.round(calculatedUpProb * 10) / 10` 对于65.3会得到653，再/10=65.3，这没问题
   - 但问题在于 `calculatedUpProb` 本身已经是百分比形式（如65.3），乘以10再除以10是多余的
   - **真正的问题是**: 如果 `calculatedUpProb` 是小数形式（0.653），那么结果会变成6.5，这是错误的

2. **概率一致性检查失败**: 
   ```typescript
   // 验证函数（第308-313行）
   private validateProbabilityConsistency(upProbability: number, scenarios: {...}): void {
     const optimisticUpDiff = Math.abs(scenarios.optimistic - upProbability);
     if (optimisticUpDiff > 5) {
       console.warn(`[蒙特卡洛] 概率一致性警告...`);
     }
   }
   ```
   这个检查只是打印警告，**没有实际修正概率**，而且阈值设置过宽（5%）。

**建议修复**:
```typescript
// 正确的概率计算
const up = Math.round(calculatedUpProb);  // 直接四舍五入到整数
const down = 100 - up;  // 确保总和为100

// 或者如果是小数形式
const up = Math.round(calculatedUpProb * 100);  // 转换为百分比
```

### 1.2 分位数计算问题 ⚠️ 中度问题

**问题描述**:
```typescript
// 配置（第56-63行）
scenarioThresholds: {
  optimistic: 0.75,    // P75
  baselineUpper: 0.60, // P60
  baselineLower: 0.40, // P40
  pessimistic: 0.25    // P25
}
```

**问题**:
- P40/P60作为基准情景的边界是合理的
- 但**乐观情景使用P75而非P90**（配置中optimistic: 0.75对应P75，但注释写的是90%分位数）
- 这导致乐观情景的定义与配置不符

**建议**: 统一使用P25/P40/P60/P75/P90五档分位数，并确保配置与注释一致。

### 1.3 风险收益比计算 ❌ 严重问题

**问题描述**:
```typescript
// 第317-332行
private calculateRiskRewardRatio(finalPrices: number[], currentPrice: number): number {
  const p75Price = getQuantilePrice(0.75);
  const p25Price = getQuantilePrice(0.25);
  
  const upside = Math.abs(p75Price - currentPrice);
  const downside = Math.abs(currentPrice - p25Price);
  return downside > 0 ? Math.round((upside / downside) * 100) / 100 : 0;
}
```

**严重错误**:
- 风险收益比应该是 **收益/风险**（upside/downside），但这里计算的是 **潜在收益/潜在损失**
- 如果upside=10，downside=5，风险收益比应该是 2:1 或 2.0
- 但代码返回的是 `upside/downside`，这是正确的
- **真正的问题是**: 如果 upside < downside（亏损概率大），比值应该小于1，但用户可能误解为"风险比收益"

**建议**: 明确标注为"收益风险比"或"盈亏比"，避免混淆。

### 1.4 推导步骤完整性 ✅ 基本完整

推导步骤（第400-418行）涵盖了：
- ✅ 历史收益率计算
- ✅ 平均收益率、方差、波动率
- ✅ 漂移率计算
- ✅ 模拟次数和周期
- ✅ 分位数计算
- ✅ 涨跌概率分布
- ✅ 情景概率
- ✅ 价格区间

**缺失**: 没有展示具体的随机数生成方法（Box-Muller变换）的数学公式。

---

## 二、热门板块模块审查

### 2.1 API数据真实性 ⚠️ 中度问题

**问题描述**:
```typescript
// 第530-560行
async fetchHotSectors(): Promise<HotSectorData[]> {
  try {
    const url = `${CONFIG.EASTMONEY_BASE}/qt/clist/get?...`;
    const response = await this.fetchWithRetry(url);
    const data = await response.json();

    if (!data.data || !data.data.diff) {
      console.warn('[RealDataFetcher] 热门板块数据为空');
      return this.generateMockHotSectors();  // ❌ 使用模拟数据兜底
    }
    // ...
  } catch (error) {
    console.error('[RealDataFetcher] 获取热门板块失败:', error);
    return this.generateMockHotSectors();  // ❌ 错误时使用模拟数据
  }
}
```

**问题**:
1. **兜底机制导致数据不真实**: 当API失败或返回空数据时，系统会返回模拟数据（第875-893行的`generateMockHotSectors`），但**用户无法区分真实数据和模拟数据**。

2. **模拟数据硬编码**:
   ```typescript
   // 第875-893行
   private generateMockHotSectors(): HotSectorData[] {
     const sectors = [
       { name: 'AI应用', change: 5.2 },
       { name: '算力租赁', change: 4.8 },
       // ... 硬编码的2026年热点板块
     ];
   }
   ```

**建议**:
- 在UI中明确标注数据来源（真实API/模拟数据）
- 提供"强制刷新"按钮，允许用户手动获取真实数据
- 模拟数据应添加明显标识（如"[模拟]"前缀）

### 2.2 板块数量 ✅ 符合要求

```typescript
// 第557行
}).slice(0, 6); // 修复：返回6个板块
```

✅ 确实返回6个板块。

### 2.3 评分维度合理性 ⚠️ 轻度问题

**评分维度**（第590-620行）:
- 舆情(sentiment): 30%
- 资金(capital): 35%
- 技术(technical): 20%
- 基本面(fundamental): 15%

**问题**:
1. **权重分配主观**: 资金占比35%过高，对于长期投资者可能不合理
2. **基本面权重过低**: 15%的基本面权重在价值投资框架下明显不足
3. **缺乏透明度**: 用户无法调整权重或查看各维度的详细计算过程

**建议**: 提供权重自定义功能，或针对不同投资风格（价值/成长/动量）提供预设权重。

### 2.4 趋势判断逻辑 ⚠️ 轻度问题

```typescript
// 第622-628行
private determineTrend(score: number, changePercent: number): HotSector['trend'] {
  if (score >= 85) return '强势热点';
  if (score >= 75 && changePercent > 3) return '新兴热点';
  if (score >= 70) return '持续热点';
  return '降温';
}
```

**问题**:
- 阈值（85/75/70）是硬编码的，缺乏动态调整机制
- `changePercent > 3` 的3%阈值没有考虑市场整体波动率
- 在牛市中3%可能偏低，在熊市中可能偏高

**建议**: 基于市场历史波动率动态调整阈值。

---

## 三、精选股票池模块审查

### 3.1 API数据真实性 ❌ 严重问题

**问题描述**:
```typescript
// realDataFetcher.ts 第795-830行
async fetchHotSectorTopStocks(totalLimit: number = 30): Promise<string[]> {
  try {
    const sectors = await this.fetchHotSectors();
    if (!sectors || sectors.length === 0) {
      console.warn('[RealDataFetcher] 无热门板块数据，使用默认股票');
      return this.getDefaultStockPool();  // ❌ 使用硬编码默认股票
    }
    // ...
  } catch (error) {
    console.error('[RealDataFetcher] 获取热门板块Top股票失败:', error);
    return this.getDefaultStockPool();  // ❌ 错误时使用默认股票
  }
}

// 第832-850行 - 硬编码默认股票池
private getDefaultStockPool(): string[] {
  return [
    '000063', '002230', '300033', '300059',  // AI/科技
    '002594', '300750', '601012', '600438',  // 新能源
    // ... 17只硬编码股票
  ];
}
```

**严重问题**:
1. **默认股票池硬编码**: 当API失败时，系统返回17只固定股票，**用户完全不知情**
2. **缺乏数据来源标识**: UI没有显示当前数据是实时获取的还是默认的
3. **可能误导用户**: 用户以为看到的是基于实时数据的精选股票，实则是固定列表

### 3.2 六因子模型 ⚠️ 中度问题

**因子权重**（stockSelector.ts 第47-55行）:
```typescript
factorWeights: {
  valuation: 0.30,   // 估值 30%
  growth: 0.20,      // 成长 20%
  scale: 0.10,       // 规模 10%
  momentum: 0.15,    // 动量 15%
  quality: 0.10,     // 质量 10%
  support: 0.15      // 支撑 15%
}
```

**问题**:
1. **规模因子权重过低**: 10%的市值权重可能不足以过滤小盘股风险
2. **动量和支撑共占30%**: 过于侧重技术面，对于基本面投资者可能不合适
3. **质量因子(ROE)仅10%**: 巴菲特最看重的ROE指标权重过低

**因子计算问题**:
```typescript
// 估值因子计算（第268-293行）
private calculateValuationFactor(quote: StockQuote): number {
  let score = 50;
  if (quote.pe < 15) score += 25;
  else if (quote.pe < 25) score += 20;
  // ...
  if (quote.peg < 0.8) score += 20;
  // ...
  if (quote.pb < 2) score += 15;
}
```

- **起始分50分不合理**: 应该是0-100分的标准评分
- **PE/PEG/PB加分逻辑**: 如果一只股票的PE=14（+25分）、PEG=0.7（+20分）、PB=1.5（+15分），总分将达到110分，超过100分上限
- 虽然有 `Math.min(100, ...)` 截断，但**评分逻辑不公平**

### 3.3 筛选条件 ⚠️ 中度问题

**筛选条件**（第218-250行）:
```typescript
private meetsCriteria(quote: StockQuote, distanceToSupport: number, upwardSpace: number): boolean {
  // 支撑位距离检查: -15% 到 +20%
  if (distanceToSupport < supportDistanceRange.min || distanceToSupport > supportDistanceRange.max) return false;
  
  // 上涨空间检查: 至少5%
  if (upwardSpace < minUpwardSpace) return false;
  
  // 估值检查: PE < 100
  if (quote.pe > maxPE && quote.pe > 0) return false;
  
  // 成长性检查: 利润增长 > -20%
  if (quote.profitGrowth < minProfitGrowth) return false;
  
  // 市值检查: > 5亿
  if (quote.marketCap > 0 && quote.marketCap < minMarketCap) return false;
}
```

**问题**:
1. **PE上限100过高**: 对于价值投资者，PE>30可能就已经过高
2. **允许亏损企业**: `minProfitGrowth: -20` 允许利润下滑20%的企业通过
3. **支撑位距离范围过宽**: -15%到+20%意味着即使股价远低于支撑位也能入选（超跌反弹逻辑）

### 3.4 排序逻辑 ✅ 基本合理

```typescript
// 第478-494行
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
```

✅ 排序逻辑合理，优先级清晰。

---

## 四、数据真实性检查

### 4.1 API调用情况

| API端点 | 用途 | 状态 |
|---------|------|------|
| `https://push2.eastmoney.com/api/qt/stock/get` | 股票行情 | ✅ 真实调用 |
| `https://push2his.eastmoney.com/api/qt/stock/kline/get` | K线数据 | ✅ 真实调用 |
| `https://push2.eastmoney.com/api/qt/clist/get` | 热门板块 | ✅ 真实调用 |
| `https://push2.eastmoney.com/api/qt/clist/get` | 板块成分股 | ✅ 真实调用 |

### 4.2 模拟数据使用情况 ❌ 严重问题

**模拟数据函数列表**:

1. `generateMockQuote()` - 行情数据兜底（第305-360行）
2. `generateMockKLines()` - K线数据兜底（第400-425行）
3. `generateMockHotSectors()` - 热门板块兜底（第875-893行）
4. `getDefaultStockPool()` - 默认股票池（第832-850行）
5. `getEstimatedSupportResistance()` - 支撑阻力估算（第770-780行）

**问题**:
- 所有API都有模拟数据兜底机制
- **用户无法区分真实数据和模拟数据**
- 模拟数据可能误导投资决策

### 4.3 错误处理机制 ⚠️ 中度问题

**当前实现**:
```typescript
// 统一的错误处理模式
try {
  const response = await this.fetchWithRetry(url);
  // ...
} catch (error) {
  console.error('[RealDataFetcher] 获取失败:', error);
  return this.generateMockData();  // 返回模拟数据
}
```

**问题**:
- 错误时返回模拟数据而不是抛出错误
- 没有重试机制（虽然有fetchWithRetry，但最终还是会返回模拟数据）
- 没有向用户展示数据获取失败的信息

---

## 五、问题汇总（按严重程度排序）

### 🔴 严重问题（必须修复）

| 序号 | 问题 | 位置 | 影响 |
|------|------|------|------|
| 1 | **蒙特卡洛概率计算错误** | dynamicAnalysisService.ts:280 | 涨跌概率显示错误，可能完全相反 |
| 2 | **模拟数据无标识** | realDataFetcher.ts多处 | 用户无法区分真实/模拟数据，可能误导决策 |
| 3 | **默认股票池硬编码** | realDataFetcher.ts:832-850 | API失败时返回固定股票，用户不知情 |

### 🟡 中度问题（建议修复）

| 序号 | 问题 | 位置 | 影响 |
|------|------|------|------|
| 4 | 六因子权重分配主观 | stockSelector.ts:47-55 | 可能不适合所有投资风格 |
| 5 | 筛选条件过于宽松 | stockSelector.ts:218-250 | 可能筛选出低质量股票 |
| 6 | 估值因子评分逻辑不公平 | stockSelector.ts:268-293 | 高分股票可能估值并不低 |
| 7 | 趋势判断阈值硬编码 | dynamicAnalysisService.ts:622-628 | 缺乏市场适应性 |

### 🟢 轻度问题（可选优化）

| 序号 | 问题 | 位置 | 影响 |
|------|------|------|------|
| 8 | 分位数配置与注释不符 | dynamicAnalysisService.ts:56-63 | 配置一致性 |
| 9 | 风险收益比命名可能混淆 | dynamicAnalysisService.ts:317-332 | 术语清晰度 |
| 10 | 推导步骤缺少数学公式 | dynamicAnalysisService.ts:400-418 | 透明度 |

---

## 六、改进建议

### 6.1 立即修复（高优先级）

1. **修复蒙特卡洛概率计算**:
   ```typescript
   // 修改前
   const up = Math.round(calculatedUpProb * 10) / 10;
   
   // 修改后
   const up = Math.round(calculatedUpProb);  // 确保是百分比整数
   const down = 100 - up;
   ```

2. **添加数据来源标识**:
   ```typescript
   // 在返回数据中添加source字段
   return {
     ...data,
     _source: 'api', // 或 'mock'
     _timestamp: Date.now()
   };
   ```

3. **UI显示数据来源**:
   ```tsx
   {data._source === 'mock' && (
     <span className="text-amber-500 text-xs">[模拟数据]</span>
   )}
   ```

### 6.2 短期改进（中优先级）

4. **提供投资风格预设**:
   - 价值投资: 估值40%/质量30%/成长20%/其他10%
   - 成长投资: 成长40%/动量25%/估值15%/其他20%
   - 动量投资: 动量35%/技术30%/成长20%/其他15%

5. **收紧筛选条件**:
   ```typescript
   maxPE: 50,              // 从100降低到50
   minProfitGrowth: 0,     // 从-20提高到0（要求正增长）
   minMarketCap: 20_0000_0000, // 从5亿提高到20亿
   ```

6. **改进估值因子评分**:
   ```typescript
   // 使用加权平均而非累加
   const peScore = quote.pe < 15 ? 100 : quote.pe < 25 ? 80 : ...;
   const pegScore = quote.peg < 0.8 ? 100 : ...;
   const pbScore = quote.pb < 2 ? 100 : ...;
   const valuationScore = peScore * 0.5 + pegScore * 0.3 + pbScore * 0.2;
   ```

### 6.3 长期优化（低优先级）

7. **动态阈值调整**:
   - 基于市场VIX指数或历史波动率调整趋势判断阈值

8. **增加更多数据源**:
   - 集成多个数据提供商（东方财富、同花顺、雪球等）
   - 实现数据交叉验证

9. **回测验证**:
   - 对选股策略进行历史回测
   - 提供策略胜率、夏普比率等指标

---

## 七、结论

**该平台目前不适合用于实际投资决策**，主要原因：

1. **蒙特卡洛概率计算存在严重bug**，可能导致涨跌概率显示完全相反
2. **模拟数据缺乏标识**，用户无法区分真实数据和模拟数据
3. **选股模型参数设置过于宽松**，可能筛选出低质量股票
4. **缺乏回测验证**，无法证明策略有效性

**建议**:
- 修复上述严重问题后再投入使用
- 增加"模拟盘验证"功能，让用户先用虚拟资金测试策略
- 添加免责声明，明确说明算法局限性和风险

---

**审查人签名**: 资深股民  
**审查日期**: 2026年3月12日
