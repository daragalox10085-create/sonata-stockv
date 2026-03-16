# Sonata 数据源修复报告

## 修复时间
2026-03-16 11:48

## 问题描述
股价数据显示异常，贵州茅台显示为 ¥145,246（实际应为 ¥1,452.46），价格偏离实际 100 倍。

## 根本原因
东方财富 API 返回的价格数据单位是"分"（如 145246 表示 1452.46 元），但 `UnifiedStockDataService.ts` 中**没有进行单位转换**（除以 100），导致价格显示错误。

## 修复文件

### 1. src/services/UnifiedStockDataService.ts
**问题**: `fetchEastmoneyQuote` 方法中直接使用 `data.f43` 作为价格，没有除以 100

**修复前**:
```typescript
return {
  code: symbol,
  symbol: symbol,
  name: data.f58 || symbol,
  currentPrice: data.f43 || 0,  // ❌ 错误：单位是分
  change: (data.f43 - data.f44) || 0,
  changePercent: data.f170 || 0,
  open: data.f46 || 0,  // ❌ 错误
  high: data.f44 || 0,  // ❌ 错误
  low: data.f47 || 0,   // ❌ 错误
  close: data.f44 || 0, // ❌ 错误
  // ...
}
```

**修复后**:
```typescript
// 东方财富 API 返回的价格单位是"分"，需要除以 100 转换为"元"
const currentPrice = (data.f43 || 0) / 100;
const openPrice = (data.f46 || 0) / 100;
const highPrice = (data.f44 || 0) / 100;
const lowPrice = (data.f47 || 0) / 100;
const closePrice = (data.f60 || 0) / 100;
const change = currentPrice - closePrice;
const changePercent = closePrice > 0 ? (change / closePrice) * 100 : 0;

return {
  code: symbol,
  symbol: symbol,
  name: data.f58 || symbol,
  currentPrice: currentPrice,  // ✅ 正确：单位是元
  change: change,
  changePercent: changePercent,
  open: openPrice,
  high: highPrice,
  low: lowPrice,
  close: closePrice,
  // ...
}
```

## 验证结果
修复后数据正确：
- 贵州茅台: ¥1452.46 ✅
- 涨跌: ▲ 38.82 (2.75%) ✅
- 开盘价: ¥1420.00 ✅
- 最高价: ¥1466.00 ✅
- 昨收: ¥1413.64 ✅

## 其他文件检查
以下文件已确认正确处理价格单位（都除以了 100）：
- ✅ src/services/stockApi.ts - `parseEastmoneyResponse` 方法
- ✅ src/services/realDataFetcher.ts - 所有价格字段
- ✅ src/services/marketAnalysisService.ts - 价格转换
- ✅ src/services/MonteCarloService.ts - 价格转换

## 东方财富 API 字段说明
| 字段 | 含义 | 单位 | 转换 |
|------|------|------|------|
| f43 | 当前价 | 分 | ÷ 100 |
| f44 | 最高价 | 分 | ÷ 100 |
| f45 | 最低价 | 分 | ÷ 100 |
| f46 | 开盘价 | 分 | ÷ 100 |
| f60 | 昨收价 | 分 | ÷ 100 |
| f116 | 市值 | 元 | 不转换 |
| f170 | 涨跌幅 | % | 不转换 |

## 后续建议
1. 统一封装价格转换函数，避免类似问题
2. 添加数据验证：价格应在合理范围内（如 0.01 - 100000）
3. 添加单元测试验证价格转换逻辑

---
_修复完成时间: 2026-03-16 11:48_
