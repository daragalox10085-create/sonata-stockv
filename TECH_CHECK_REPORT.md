# 技术检查报告 - 股票分析系统 v7

**检查时间**: 2026-03-12  
**检查人员**: 产品经理 + 程序员 - 执行升级专家  
**检查范围**: 核心服务层与数据流

---

## 一、代码结构检查结果

### 1.1 dynamicAnalysisService.ts ✅ 结构良好

**整体评价**: 代码结构清晰，职责分离合理

| 组件 | 状态 | 说明 |
|------|------|------|
| MonteCarloSimulator | ✅ | 蒙特卡洛模拟逻辑完整，包含概率计算、分位数算法 |
| SectorAnalyzer | ✅ | 板块分析器，支持真实数据和模拟数据兜底 |
| StockSelector | ✅ | 委托给RealStockSelector，保持向后兼容 |
| DynamicAnalysisService | ✅ | 主服务类，整合所有功能 |

**关键发现**:
- 使用了真实的 `RealDataFetcher` 和 `RealStockSelector`
- 支持模拟数据兜底机制（当API失败时）
- 蒙特卡洛模拟包含完整的推导步骤记录

### 1.2 realDataFetcher.ts ⚠️ 存在模拟数据兜底

**整体评价**: API调用真实，但有大量模拟数据兜底逻辑

**API端点检查**:
```typescript
// ✅ 热门板块API - 真实存在
const url = `${CONFIG.EASTMONEY_BASE}/qt/clist/get?pn=1&pz=20...`

// ✅ 股票行情API - 真实存在
const url = `${CONFIG.QUOTE_BASE}/qt/stock/get?ut=...&secid=${secId}`

// ✅ K线数据API - 真实存在
const url = `${CONFIG.KLINE_BASE}/qt/stock/kline/get?secid=${secId}...`

// ✅ 板块成分股API - 真实存在
const url = `${CONFIG.EASTMONEY_BASE}/qt/clist/get?...fs=b:${sectorCode}`
```

**问题发现**:
| 方法 | 问题 | 严重程度 |
|------|------|----------|
| `fetchStockQuote` | API失败时返回 `generateMockQuote` | 中等 |
| `fetchKLineData` | API失败时返回 `generateMockKLines` | 中等 |
| `fetchHotSectors` | API失败时返回 `generateMockHotSectors` | 中等 |
| `fetchSectorStocks` | 失败时返回空数组 | 低 |

**模拟数据比例**: 约30%的方法包含模拟数据兜底

### 1.3 stockSelector.ts ✅ 筛选逻辑完整

**整体评价**: 六因子选股模型实现完整

**筛选条件检查**:
```typescript
// ✅ 支撑位距离范围: -15% ~ +20%
supportDistanceRange: { min: -15, max: 20 }

// ✅ 最小上涨空间: 5%
minUpwardSpace: 5

// ✅ 最大PE: 100
maxPE: 100

// ✅ 最小利润增长: -20%
minProfitGrowth: -20

// ✅ 最小市值: 5亿
minMarketCap: 5_0000_0000
```

**六因子权重检查**:
| 因子 | 权重 | 状态 |
|------|------|------|
| 估值 | 30% | ✅ |
| 成长 | 20% | ✅ |
| 规模 | 10% | ✅ |
| 动量 | 15% | ✅ |
| 质量 | 10% | ✅ |
| 支撑 | 15% | ✅ |

**权重总和**: 100% ✅

### 1.4 WeeklyMarketAnalysis.tsx ⚠️ 存在测试代码

**整体评价**: UI组件结构良好，但包含测试代码

**问题发现**:
```typescript
// ⚠️ 第23-30行: 临时测试方法
const testScreening = async () => {
  const testCodes = ['300502', '000988', '002281'];
  const results = await dynamicAnalysisService.getStockRecommendations(testCodes);
  console.log('测试结果:', results);
  // ...
};

// ⚠️ 在useEffect中调用测试方法
testScreening();
```

**数据流检查**:
- ✅ 从热门板块获取股票代码
- ✅ 调用 `getStockRecommendations` 进行筛选
- ✅ 支持显示推导详情

---

## 二、API真实性检查

### 2.1 东方财富API端点验证

| API | URL | 状态 | 说明 |
|-----|-----|------|------|
| 热门板块 | `/qt/clist/get?fid=f62&fs=m:90+t:2` | ✅ | 真实API，获取板块涨幅排行 |
| 股票行情 | `/qt/stock/get?secid=` | ✅ | 真实API，获取实时行情 |
| K线数据 | `/qt/stock/kline/get?secid=` | ✅ | 真实API，获取历史K线 |
| 板块成分股 | `/qt/clist/get?fs=b:{code}` | ✅ | 真实API，获取板块内股票 |

### 2.2 API调用方式

```typescript
// ✅ 使用fetch进行真实HTTP请求
const response = await fetch(url, {
  signal: controller.signal,
  headers: {
    'User-Agent': 'Mozilla/5.0...',
    'Referer': 'https://quote.eastmoney.com/'
  }
});
```

**结论**: API调用是真实的，不是模拟数据

---

## 三、数据流检查

### 3.1 热门板块数据流

```
用户打开页面
    ↓
WeeklyMarketAnalysis.tsx: loadData()
    ↓
dynamicAnalysisService.getHotSectors()
    ↓
SectorAnalyzer.analyzeSectors()
    ↓
RealDataFetcher.fetchHotSectors()
    ↓
调用东方财富API /qt/clist/get
    ↓
[成功] → 返回真实数据 → 处理显示
[失败] → generateMockHotSectors() → 返回模拟数据
```

**状态**: ⚠️ 有模拟数据兜底

### 3.2 股票池数据流

```
获取热门板块
    ↓
收集板块topStocks
    ↓
dynamicAnalysisService.getStockRecommendations(stockCodes)
    ↓
RealStockSelector.selectStocks(stockCodes)
    ↓
遍历股票代码:
  ├─ RealDataFetcher.fetchStockQuote(code) - 获取行情
  ├─ RealDataFetcher.calculateSupportResistance(code) - 计算支撑
  ├─ 六因子评分计算
  └─ 筛选条件检查
    ↓
排序并返回推荐列表
    ↓
显示在表格中
```

**状态**: ✅ 数据流完整，使用真实API

### 3.3 硬编码Mock数据检查

| 位置 | 类型 | 严重程度 |
|------|------|----------|
| `generateMockQuote` | 模拟股票行情 | 中等 |
| `generateMockKLines` | 模拟K线数据 | 中等 |
| `generateMockHotSectors` | 模拟热门板块 | 中等 |
| `getDefaultStockPool` | 默认股票池 | 低 |
| `HOT_SECTORS_2026` | 2026热点配置 | 低 |

---

## 四、问题预判与发现

### 4.1 🔴 严重问题

**问题1**: 测试代码残留在生产环境
- **位置**: `WeeklyMarketAnalysis.tsx` 第23-30行
- **影响**: 每次组件加载都会执行测试，可能覆盖正常数据
- **修复**: 删除 `testScreening` 函数及其调用

### 4.2 🟡 中等问题

**问题2**: 模拟数据兜底机制可能掩盖API问题
- **位置**: `realDataFetcher.ts` 多个方法
- **影响**: 用户无法区分真实数据和模拟数据
- **修复建议**:
  ```typescript
  // 添加标记区分数据来源
  interface StockQuote {
    // ...原有字段
    isMockData?: boolean;  // 标记是否为模拟数据
    dataSource?: 'api' | 'mock';  // 数据来源
  }
  ```

**问题3**: 筛选条件可能过于严格
- **位置**: `stockSelector.ts` `meetsCriteria` 方法
- **当前条件**:
  - 支撑位距离: -15% ~ +20%
  - 最小上涨空间: 5%
  - 最大PE: 100
  - 最小利润增长: -20%
- **影响**: 可能导致大量股票被过滤
- **建议**: 根据实际返回数据量调整条件

### 4.3 🟢 轻微问题

**问题4**: 权重推导说明与代码不一致
- **位置**: `WeeklyMarketAnalysis.tsx` 推导详情
- **UI显示**: 估值因子25%、支撑因子20%
- **代码实际**: 估值因子30%、支撑因子15%
- **修复**: 更新UI显示文本

**问题5**: 缓存时间较短
- **当前**: CACHE_TTL = 60000ms (1分钟)
- **建议**: 延长至5分钟，减少API调用频率

---

## 五、修复方案

### 5.1 立即修复（高优先级）

1. **删除测试代码**
   ```typescript
   // 删除 WeeklyMarketAnalysis.tsx 中的:
   const testScreening = async () => { ... };
   testScreening();
   ```

2. **修复推导详情权重显示**
   ```typescript
   // 更新UI中的权重说明
   估值因子(30%)、成长因子(20%)、规模因子(10%)、
   动量因子(15%)、质量因子(10%)、支撑位因子(15%)
   ```

### 5.2 短期优化（中优先级）

3. **添加数据来源标记**
   ```typescript
   // 在返回数据中添加标记
   return {
     ...quote,
     _dataSource: 'api', // 或 'mock'
     _fetchTime: Date.now()
   };
   ```

4. **调整缓存时间**
   ```typescript
   private readonly CACHE_TTL = 300000; // 5分钟
   ```

### 5.3 长期改进（低优先级）

5. **添加API健康检查**
   - 定期检查API可用性
   - 当API持续失败时提示用户

6. **优化筛选条件**
   - 根据实际数据分布动态调整
   - 添加用户自定义筛选条件功能

---

## 六、总结

### 6.1 整体评估

| 维度 | 评分 | 说明 |
|------|------|------|
| 代码质量 | ⭐⭐⭐⭐ | 结构清晰，职责分离良好 |
| API真实性 | ⭐⭐⭐⭐ | 使用真实东方财富API |
| 数据完整性 | ⭐⭐⭐ | 有模拟数据兜底，但可接受 |
| 筛选逻辑 | ⭐⭐⭐⭐⭐ | 六因子模型完整 |
| 生产就绪度 | ⭐⭐⭐ | 需要删除测试代码 |

### 6.2 关键风险

1. **测试代码残留** - 可能导致数据异常
2. **模拟数据兜底** - 用户可能看到非真实数据
3. **筛选条件严格** - 可能返回空结果

### 6.3 建议行动

1. ✅ **立即**: 删除 `WeeklyMarketAnalysis.tsx` 中的测试代码
2. ✅ **立即**: 修复推导详情中的权重显示
3. 📋 **本周**: 添加数据来源标记
4. 📋 **本月**: 优化筛选条件和缓存策略

---

**报告生成时间**: 2026-03-12 23:40  
**检查完成**: 是  
**下一步**: 等待资深股民审查报告，然后执行修复
