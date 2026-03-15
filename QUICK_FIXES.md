# 快速修复指南

## 剩余关键问题 (15 个错误)

### 1. 方法名不匹配 (2 处)

**文件**: `src/contexts/StockContext.tsx:751`
```typescript
// 错误：fetchStockQuote 不存在
const quote = await unifiedStockDataService.fetchStockQuote(symbol);

// 修复：改为 fetchQuote
const quote = await unifiedStockDataService.fetchQuote(symbol);
```

**文件**: `src/services/ScreeningService.ts:145`, `src/services/StockPickerService.ts:125`
```typescript
// 错误：fetchKLineData 不存在
const kline = await unifiedStockDataService.fetchKLineData(...);

// 修复：改为 fetchKLineDataByPeriod
const kline = await unifiedStockDataService.fetchKLineDataByPeriod(...);
```

### 2. 添加方法别名 (推荐方案)

在 `src/services/UnifiedStockDataService.ts` 类中添加：

```typescript
// 向后兼容的别名
fetchStockQuote = this.fetchQuote;
fetchKLineData = this.fetchKLineDataByPeriod;
```

### 3. RealDataFetcher.ts 修复

**文件**: `src/services/RealDataFetcher.ts:94`
```typescript
// 添加缺失的字段
return {
  code: symbol,
  name: ...,
  currentPrice: ...,
  change: currentPrice - open,  // 新增
  open: ...,                     // 新增
  high: ...,                     // 新增
  low: ...,                      // 新增
  close: ...,                    // 新增
  // ... 其他字段
};
```

### 4. dynamicAnalysisService.ts 导入修复

**文件**: `src/services/dynamicAnalysisService.ts:18`
```typescript
// 错误：Cannot find name 'DynamicHotSector'

// 修复：添加导入
import type { DynamicHotSector } from './DynamicSectorAnalyzer';

// 并在接口导出中使用
export type { DynamicHotSector } from './DynamicSectorAnalyzer';
```

### 5. WeeklyMarketAnalysis.tsx 类型修复

**文件**: `src/sections/WeeklyMarketAnalysis.tsx:128`
```typescript
// recommendation 类型不匹配
recommendation: (sector.score >= 80 ? '强烈推荐' : ...) as '强烈推荐' | '推荐' | '谨慎推荐' | '观望',
```

---

## 执行顺序

1. ✅ 先修复 UnifiedStockDataService 添加别名方法
2. ✅ 修复 RealDataFetcher 添加缺失字段
3. ✅ 修复 dynamicAnalysisService 导入
4. ✅ 修复 WeeklyMarketAnalysis 类型断言

---

## 预计修复时间：15 分钟
