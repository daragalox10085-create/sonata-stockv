# A股数据真实性全面审查报告

**审查日期**: 2026-03-13  
**审查目标**: Sonata平台A股数据真实性验证  
**审查人员**: AI Subagent

---

## 执行摘要

经过全面代码审查和浏览器验证，发现Sonata平台在数据获取方面存在**严重问题**：

| 审查项目 | 状态 | 严重程度 |
|---------|------|---------|
| 热门板块API调用 | ⚠️ 部分实现 | 高 |
| 股票行情API调用 | ✅ 已实现 | 低 |
| K线数据API调用 | ✅ 已实现 | 低 |
| 硬编码模拟数据 | ❌ 存在多处 | 严重 |
| 模拟数据标识 | ⚠️ 部分标识 | 中 |
| 错误处理机制 | ⚠️ 返回模拟数据 | 高 |

**总体结论**: 平台确实调用了东方财富API，但在API失败时会返回**硬编码的模拟数据**，且热门板块数据存在**预设的2026年热点板块列表**。

---

## 1. 热门板块数据真实性审查

### 1.1 审查文件
- `src/services/dynamicSectorAnalyzer.ts`
- `src/services/realDataFetcher.ts`
- `src/services/dynamicAnalysisService.ts`

### 1.2 发现的问题

#### 🔴 问题1: 硬编码的2026年热点板块列表

**位置**: `src/services/realDataFetcher.ts` (第28-38行)

```typescript
// 2026年热点板块配置
HOT_SECTORS_2026: [
  { code: 'BK0910', name: 'AI应用', keywords: ['人工智能', '大模型', 'AIGC'] },
  { code: 'BK0901', name: '算力租赁', keywords: ['算力', '数据中心', '云计算'] },
  { code: 'BK0920', name: '低空经济', keywords: ['无人机', 'eVTOL', '通用航空'] },
  { code: 'BK0903', name: '人形机器人', keywords: ['机器人', '具身智能', '自动化'] },
  { code: 'BK0905', name: '固态电池', keywords: ['固态电池', '新能源', '储能'] },
  { code: 'BK0912', name: '商业航天', keywords: ['卫星', '火箭', '航天'] },
  { code: 'BK0915', name: '脑机接口', keywords: ['脑机', '神经科技', '医疗AI'] },
  { code: 'BK0925', name: '量子计算', keywords: ['量子', '量子通信', '量子芯片'] }
]
```

**问题描述**: 代码中硬编码了8个"2026年热点板块"，这些板块名称是预设的，而非从API动态获取。

#### 🔴 问题2: 多处硬编码模拟数据

**位置1**: `src/services/dynamicSectorAnalyzer.ts` (第525-550行)
```typescript
private generateSimulatedSectors(limit: number): DynamicHotSector[] {
  const sectors = [
    { name: 'AI应用', change: 5.2 },
    { name: '算力租赁', change: 4.8 },
    { name: '低空经济', change: 4.5 },
    { name: '人形机器人', change: 3.9 },
    { name: '固态电池', change: 3.5 },
    { name: '商业航天', change: 3.2 }
  ];
  // ...
}
```

**位置2**: `src/services/realDataFetcher.ts` (第385-405行)
```typescript
private generateMockHotSectors(): HotSectorData[] {
  const sectors = [
    { name: 'AI应用', change: 5.2 },
    { name: '算力租赁', change: 4.8 },
    // ... 相同的数据
  ];
}
```

**位置3**: `src/services/dynamicAnalysisService.ts` (第320-345行)
```typescript
private generateSimulatedSectors(): HotSector[] {
  const simulatedSectors = [
    { name: 'AI应用', baseScore: 88, change: 5.2 },
    { name: '算力租赁', baseScore: 85, change: 4.8 },
    // ... 相同的数据
  ];
}
```

**问题描述**: 三个文件中存在几乎相同的硬编码板块数据，当API调用失败时作为"兜底"数据返回。

#### 🟡 问题3: 模拟数据标识不完整

虽然部分模拟数据有`dataQuality: 'simulated'`标识（如`DynamicHotSector`类型），但并非所有模拟数据都明确标识。

**有标识的情况**:
- `DynamicHotSector.dataQuality` 字段
- `StockQuote._source` 字段

**无标识的情况**:
- `HotSector` 类型没有数据源标识字段
- 部分模拟板块数据没有明确标识为模拟

### 1.3 API调用验证

#### ✅ 真实API调用存在

代码中确实存在东方财富API的真实调用：

```typescript
// 板块列表API
const url = `${CONFIG.EASTMONEY_BASE}/qt/clist/get?pn=1&pz=100&po=1&np=1&fltt=2&invt=2&fid=f62&fs=m:90+t:2&fields=f12,f13,f14,f20,f62,f128,f136,f140,f141,f142,f143,f144,f145,f146,f147,f148,f149`;

// 板块资金流API
const url = `${CONFIG.EASTMONEY_BASE}/qt/club/fflow/get?secid=90.${sectorCode}`;

// 板块K线API
const klineUrl = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=90.${sectorCode}&klt=101...`;
```

**API端点验证**:
- `https://push2.eastmoney.com/api` - 东方财富实时数据API ✅
- `https://push2his.eastmoney.com/api` - 东方财富历史数据API ✅

### 1.4 浏览器网络请求验证

由于后端代理配置问题，浏览器中API请求返回`ERR_CONNECTION_REFUSED`，无法直接观察到真实的东方财富API响应。

**观察到的请求**:
- `/api/tencent?code=sh600519&timeframe=60&days=120` - 腾讯财经API代理
- `/api/eastmoney/suggest?input=...` - 东方财富搜索API代理

**问题**: Vite代理配置存在，但请求未能正确转发到目标API。

---

## 2. 股票数据真实性审查

### 2.1 审查文件
- `src/services/realDataFetcher.ts`
- `src/services/stockSelector.ts`
- `src/contexts/StockContext.tsx`

### 2.2 发现的问题

#### 🔴 问题4: 股票行情模拟数据兜底

**位置**: `src/services/realDataFetcher.ts` (第195-275行)

```typescript
private generateMockQuote(stockCode: string): StockQuote {
  const basePrice = 10 + Math.random() * 90;
  const mockNames: Record<string, string> = {
    '000001': '平安银行', '000002': '万科A', ... // 100+硬编码股票名称
  };
  return {
    code: stockCode,
    name: mockNames[stockCode] || `股票${stockCode}`,
    currentPrice: Math.round(basePrice * 100) / 100,
    pe: 15 + Math.random() * 40,
    // ...
    _source: 'mock'  // ✅ 有标识
  };
}
```

**问题描述**: 当API调用失败时，返回随机生成的模拟数据，但股票名称是硬编码的。

#### 🔴 问题5: K线数据模拟兜底

**位置**: `src/services/realDataFetcher.ts` (第305-340行)

```typescript
private generateMockKLines(stockCode: string, period: number): KLineData[] {
  // 随机生成K线数据
  const volatility = 0.02;
  const change = (Math.random() - 0.5) * volatility;
  // ...
}
```

#### 🟡 问题6: 支撑位计算使用模拟数据

当K线数据不足时，使用估算值而非真实数据：
```typescript
private getEstimatedSupportResistance(currentPrice?: number): SupportResistance | null {
  if (!currentPrice || currentPrice <= 0) return null;
  return {
    support: Math.round(currentPrice * 0.88 * 100) / 100,
    resistance: Math.round(currentPrice * 1.15 * 100) / 100,
    // ...
    confidence: 30  // 低置信度
  };
}
```

### 2.3 真实API调用验证

#### ✅ 股票行情API

```typescript
const url = `${CONFIG.QUOTE_BASE}/qt/stock/get?ut=fa5fd1943c7b386f172d6893dbfba10b&fltt=2&invt=2&volt=2&fields=${fields}&secid=${secId}`;
```

#### ✅ K线数据API

```typescript
const url = `${CONFIG.KLINE_BASE}/qt/stock/kline/get?secid=${secId}&klt=101&fqt=1&lmt=${period}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61`;
```

#### ✅ 腾讯财经API（备选）

```typescript
const url = `https://qt.gtimg.cn/q=${prefix}${symbol}`;  // 实时行情
const url = `/api/tencent?code=${code}&timeframe=${timeframeParam}&days=${days}`;  // K线
```

### 2.4 六因子评分数据来源

六因子评分基于以下数据计算：
1. **估值因子**: 基于PE、PEG、PB（来自API）
2. **成长因子**: 基于利润增长和收入增长（来自API）
3. **规模因子**: 基于市值（来自API）
4. **动量因子**: 基于RSI、趋势、换手率（部分计算）
5. **质量因子**: 基于ROE（来自API）
6. **支撑因子**: 基于支撑位距离（部分模拟）

**结论**: 六因子评分确实基于真实API数据，但当API失败时会使用模拟数据。

---

## 3. 蒙特卡洛模拟数据真实性审查

### 3.1 审查文件
- `src/services/dynamicAnalysisService.ts`

### 3.2 发现的问题

#### 🟡 问题7: 默认参数未明确标识

**位置**: `src/services/dynamicAnalysisService.ts` (第430-480行)

```typescript
private runWithDefaults(currentPrice: number): MonteCarloResult {
  const annualVolatility = 0.25;  // 默认年化波动率25%
  const dailyVolatility = annualVolatility / Math.sqrt(252);
  const drift = 0.0002;  // 默认漂移率
  // ...
}
```

**问题描述**: 当历史价格数据不足时，使用默认参数运行模拟，但推导步骤中有明确标注"历史数据不足，使用市场典型参数"。

### 3.3 波动率计算验证

当有足够历史数据时，波动率计算是基于真实数据的：

```typescript
private calculateParameters(prices: number[]): { drift: number; volatility: number; avgReturn: number; variance: number } {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push(Math.log(prices[i] / prices[i - 1]));  // 对数收益率
  }
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance);
  // ...
}
```

**结论**: 蒙特卡洛模拟确实使用真实K线数据计算波动率，但当数据不足时会使用默认参数。

---

## 4. 代码审查详细发现

### 4.1 模拟数据生成函数清单

| 文件 | 函数名 | 用途 | 是否有标识 |
|-----|-------|------|----------|
| dynamicSectorAnalyzer.ts | `generateSimulatedSectors()` | 热门板块兜底 | ✅ `dataQuality: 'simulated'` |
| realDataFetcher.ts | `generateMockQuote()` | 股票行情兜底 | ✅ `_source: 'mock'` |
| realDataFetcher.ts | `generateMockKLines()` | K线数据兜底 | ❌ 无标识 |
| realDataFetcher.ts | `generateMockHotSectors()` | 热门板块兜底 | ❌ 无标识 |
| dynamicAnalysisService.ts | `generateSimulatedSectors()` | 热门板块兜底 | ❌ 无标识 |

### 4.2 硬编码数据清单

| 数据类型 | 位置 | 内容 | 严重程度 |
|---------|------|------|---------|
| 热点板块列表 | realDataFetcher.ts:28-38 | 8个预设板块 | 🔴 高 |
| 模拟板块数据 | dynamicSectorAnalyzer.ts:525 | 6个板块名称和涨跌幅 | 🔴 高 |
| 模拟板块数据 | realDataFetcher.ts:385 | 8个板块名称和涨跌幅 | 🔴 高 |
| 模拟板块数据 | dynamicAnalysisService.ts:320 | 8个板块名称和涨跌幅 | 🔴 高 |
| 股票名称映射 | realDataFetcher.ts:200-260 | 100+股票代码和名称 | 🟡 中 |
| 默认股票池 | realDataFetcher.ts:420-430 | 17只A股代码 | 🟡 中 |

### 4.3 API调用统计

| API类型 | 调用位置 | 状态 |
|--------|---------|------|
| 东方财富板块列表 | dynamicSectorAnalyzer.ts:fetchAllSectors() | ✅ 存在 |
| 东方财富板块资金流 | dynamicSectorAnalyzer.ts:fetchCapitalFlowData() | ✅ 存在 |
| 东方财富板块K线 | dynamicSectorAnalyzer.ts:fetchTechnicalData() | ✅ 存在 |
| 东方财富股票行情 | realDataFetcher.ts:fetchStockQuote() | ✅ 存在 |
| 东方财富K线数据 | realDataFetcher.ts:fetchKLineData() | ✅ 存在 |
| 东方财富热门板块 | realDataFetcher.ts:fetchHotSectors() | ✅ 存在 |
| 腾讯财经实时行情 | StockContext.tsx:fetchTencentData() | ✅ 存在 |
| 腾讯财经K线数据 | StockContext.tsx:fetchTencentKLineWithTimeframe() | ✅ 存在 |

---

## 5. 修复建议

### 5.1 高优先级修复

#### 修复1: 移除或隔离硬编码热点板块
**文件**: `src/services/realDataFetcher.ts`
**建议**:
```typescript
// 移除硬编码的 HOT_SECTORS_2026 配置
// 如果必须保留作为fallback，添加明确的警告标识
const FALLBACK_SECTORS_WARNING = 
  '⚠️ 使用备用板块数据（非实时）';
```

#### 修复2: 统一模拟数据标识
**文件**: 所有服务文件
**建议**:
- 所有模拟数据必须包含 `dataSource: 'simulated'` 或 `_source: 'mock'`
- UI层显示数据来源标识

#### 修复3: 错误处理改进
**文件**: `src/services/dynamicSectorAnalyzer.ts`, `src/services/realDataFetcher.ts`
**建议**:
```typescript
// 当前代码
} catch (error) {
  console.error('[...] 获取失败:', error);
  return this.generateMockHotSectors();  // 直接返回模拟数据
}

// 建议改进
} catch (error) {
  console.error('[...] 获取失败:', error);
  return {
    success: false,
    error: 'API请求失败',
    data: this.generateMockHotSectors(),
    isSimulated: true  // 明确标识
  };
}
```

### 5.2 中优先级修复

#### 修复4: 添加数据来源UI标识
**文件**: `src/sections/WeeklyMarketAnalysis.tsx`
**建议**:
在热门板块和精选股票池卡片上添加数据来源标签：
- 绿色: "实时数据"
- 黄色: "部分模拟"
- 红色: "模拟数据"

#### 修复5: 配置化股票池
**文件**: `src/services/realDataFetcher.ts`
**建议**:
将硬编码的默认股票池移至配置文件或环境变量：
```typescript
// config/stockPool.json
{
  "fallbackPool": ["000001", "000002", ...],
  "lastUpdated": "2026-03-01"
}
```

### 5.3 低优先级修复

#### 修复6: 增强日志记录
- 记录每次API调用的成功/失败状态
- 记录模拟数据的使用次数和原因
- 添加数据新鲜度时间戳

#### 修复7: 添加数据质量指标
```typescript
interface DataQuality {
  source: 'api' | 'cache' | 'simulated';
  freshness: number;  // 数据新鲜度（秒）
  confidence: number;  // 置信度（0-100）
  lastUpdated: string;
}
```

---

## 6. 验证清单

### 6.1 修复后验证步骤

- [ ] 断开网络连接，验证UI是否显示"模拟数据"警告
- [ ] 检查浏览器Network标签，确认东方财富API请求真实发出
- [ ] 验证API响应数据与显示数据一致性
- [ ] 确认模拟数据有明确的视觉标识
- [ ] 测试错误处理流程，确保用户知晓数据状态

### 6.2 长期监控建议

- 监控API成功率，低于阈值时触发告警
- 定期审查模拟数据使用频率
- 建立数据质量报告机制

---

## 7. 结论

### 7.1 数据真实性评估

| 数据类型 | 真实性评级 | 说明 |
|---------|-----------|------|
| 股票实时行情 | ⭐⭐⭐⭐☆ | 有真实API调用，失败时有模拟兜底 |
| K线历史数据 | ⭐⭐⭐⭐☆ | 有真实API调用，失败时有模拟兜底 |
| 热门板块数据 | ⭐⭐☆☆☆ | 有API调用，但存在大量硬编码模拟数据 |
| 板块成分股 | ⭐⭐⭐☆☆ | 有API调用，失败时使用默认股票池 |
| 蒙特卡洛模拟 | ⭐⭐⭐⭐☆ | 基于真实K线数据计算，默认参数有标识 |

### 7.2 关键问题总结

1. **硬编码热点板块**: 代码中存在预设的2026年8个热点板块，这些不是从API动态获取的
2. **多处模拟数据**: 三个服务文件中存在几乎相同的模拟板块数据
3. **模拟数据标识不一致**: 部分模拟数据没有明确的数据源标识
4. **错误处理返回模拟数据**: API失败时静默返回模拟数据，用户可能不知情

### 7.3 建议行动

**立即行动**:
1. 修复硬编码热点板块问题
2. 统一模拟数据标识
3. 添加数据来源UI显示

**短期行动**:
1. 改进错误处理机制
2. 添加数据质量监控
3. 配置化股票池

**长期行动**:
1. 建立数据质量报告
2. 优化API调用策略
3. 添加数据缓存机制

---

**报告生成时间**: 2026-03-13 00:25 GMT+8  
**报告版本**: v1.0
