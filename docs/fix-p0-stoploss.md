# P0 问题 #3 修复报告：止损位高于支撑位（逻辑矛盾）

## 问题描述

**问题**：止损位（stopLoss）高于支撑位（support），违反基本交易逻辑。

**预期关系**：止损位 < 支撑位 < 当前价

**根本原因**：
- 原代码中止损位基于当前价计算（`currentPrice * 0.92`），而不是基于支撑位
- 当支撑位接近当前价时（如 `currentPrice * 0.95`），会出现 `stopLoss (0.92) > support (0.95)` 的矛盾

## 修复方案

### 1. 修改止损位计算逻辑

**修复前**：
```typescript
stopLoss: stopLoss || currentPrice * 0.92  // 错误：基于当前价
```

**修复后**：
```typescript
// 止损位 = 支撑位下方 8%（确保：止损位 < 支撑位 < 当前价）
let stopLoss = support * 0.92;
```

### 2. 添加数值验证

增加了 5 层验证确保逻辑正确：

```typescript
// 1. 止损位必须小于支撑位
if (stopLoss >= support) {
  stopLoss = support * 0.92;
}

// 2. 支撑位必须小于当前价
if (support >= currentPrice) {
  support = currentPrice * 0.95;
  stopLoss = support * 0.92; // 重新计算止损位
}

// 3. 止损位必须小于当前价（最终保护）
if (stopLoss >= currentPrice) {
  stopLoss = currentPrice * 0.88; // 当前价下方 12%
}

// 4. 止损位不能低于当前价的 80%（防止过度止损）
const minStopLoss = currentPrice * 0.80;
if (stopLoss < minStopLoss) {
  stopLoss = minStopLoss;
}

// 5. 最终验证：确保逻辑关系成立
if (!(stopLoss < support && support < currentPrice)) {
  // 如果仍然不满足，强制调整
  support = currentPrice * 0.95;
  stopLoss = support * 0.92;
  console.warn(`[止损位] 数值验证失败，已强制调整`);
}
```

### 3. 更新返回语句

**修复前**：
```typescript
stopLoss: stopLoss || currentPrice * 0.92  // 回退逻辑会覆盖正确计算
```

**修复后**：
```typescript
stopLoss, // 已在上游计算：支撑位下方 8%
```

## 测试验证

测试了 6 种场景，全部通过验证：

| 场景 | 当前价 | 支撑位 | 止损位 | 验证结果 |
|------|--------|--------|--------|----------|
| 正常场景 | ¥100 | ¥95.00 (-5%) | ¥87.40 (-8%) | ✅ 87.40 < 95.00 < 100 |
| 支撑位高于当前价 | ¥100 | ¥95.00 (-5%) | ¥87.40 (-8%) | ✅ 87.40 < 95.00 < 100 |
| 支撑位等于当前价 | ¥100 | ¥95.00 (-5%) | ¥87.40 (-8%) | ✅ 87.40 < 95.00 < 100 |
| 支撑位过低 | ¥100 | ¥95.00 (-5%) | ¥87.40 (-8%) | ✅ 87.40 < 95.00 < 100 |
| 高价股 | ¥1000 | ¥950.00 (-5%) | ¥874.00 (-8%) | ✅ 874.00 < 950.00 < 1000 |
| 低价股 | ¥10 | ¥9.50 (-5%) | ¥8.74 (-8%) | ✅ 8.74 < 9.50 < 10 |

## 修改文件

- `C:\Users\CCL\.openclaw\workspace\stock-analysis-v7\src\contexts\StockContext.tsx`
  - 函数：`calculateQuantMetrics`
  - 修改位置：第 1152-1197 行（新增止损位计算逻辑）
  - 修改位置：第 1346 行（更新返回语句）

## 验证要点

1. ✅ 止损位 = 支撑位 × 0.92（支撑位下方 8%）
2. ✅ 确保止损位 < 支撑位 < 当前价
3. ✅ 添加了 5 层数值验证
4. ✅ 测试了所有边界场景
5. ✅ 移除了错误的回退逻辑

## 后续建议

1. 在生产环境监控日志中的 `[止损位] 数值验证失败` 警告
2. 如果出现警告，说明输入数据异常，需要检查 K 线数据质量
3. 考虑将止损位比例（8%）配置化，允许用户自定义

---

**修复时间**：2026-03-06 20:40
**修复者**：Danny (AI Assistant)
**状态**：✅ 已完成并测试通过
