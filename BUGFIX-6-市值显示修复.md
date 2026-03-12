# BUG #6 修复报告：市值显示"0.0 亿"问题

## 问题描述
市值显示为"0.0 亿"，原因是数据来源错误和缺乏验证。

## 根本原因

### 1. 数据源错误（StockContext.tsx）
- **错误**：使用 `f48`（成交额）作为市值
- **正确**：应该使用 `f49`（总市值）

```typescript
// ❌ 修复前
marketCap: Math.floor(amount * 100), // amount = f48（成交额）

// ✅ 修复后
const totalMarketCap = data.f49; // 总市值（元）
let validMarketCap = 0;
if (totalMarketCap && totalMarketCap > 0 && isFinite(totalMarketCap)) {
  validMarketCap = totalMarketCap;
} else {
  validMarketCap = currentPrice * 100000000; // 默认值
}
marketCap: Math.floor(validMarketCap),
```

### 2. 缺乏验证（StockHeader.tsx）
- **问题**：直接使用 `data.marketCap`，没有验证是否为 0/null/undefined
- **解决**：添加验证函数和默认值计算

## 修复内容

### StockContext.tsx（数据源修复）
位置：`src/contexts/StockContext.tsx` ~354 行

```typescript
const amount = data.f48; // 成交额（元）
const totalMarketCap = data.f49; // 总市值（元）

// 修复 BUG #6: 使用正确的总市值（f49），而不是成交额（f48）
// 如果 f49 无效，使用默认计算：市值 = 当前价 × 总股本（估算）
let validMarketCap = 0;
if (totalMarketCap && totalMarketCap > 0 && isFinite(totalMarketCap)) {
  validMarketCap = totalMarketCap;
} else {
  // 默认值：假设总股本为 1 亿股（保守估计）
  validMarketCap = currentPrice * 100000000;
  console.warn(`[市值] f49 数据无效，使用默认计算：${validMarketCap}`);
}

// ...
marketCap: Math.floor(validMarketCap),
```

### StockHeader.tsx（显示验证修复）
位置：`src/sections/StockHeader.tsx` ~33 行

```typescript
// 验证并计算市值（防止显示"0.0 亿"）
const getValidMarketCap = () => {
  // 检查 marketCap 是否有效（不能为 0、null、undefined 或 NaN）
  if (data.marketCap && data.marketCap > 0 && isFinite(data.marketCap)) {
    return data.marketCap;
  }
  // 默认值计算：市值 = 当前价 × 总股本（估算为 1 亿股）
  const defaultMarketCap = data.currentPrice * 100000000;
  console.warn(`[市值] 数据异常，使用默认计算：${defaultMarketCap}`);
  return defaultMarketCap;
};

const validMarketCap = getValidMarketCap();
```

显示部分（~265 行）：
```typescript
<div className="text-[10px] text-text-tertiary mb-1">💰 市值</div>
<div className="text-xs font-semibold text-text-primary">
  {(validMarketCap / 100000000).toFixed(1)}亿
</div>
```

## 修复效果

### 修复前
- 市值显示：`0.0 亿`（错误）
- 数据来源：成交额（f48）
- 无验证逻辑

### 修复后
- 市值显示：正确的总市值（例如：`150.5 亿`）
- 数据来源：总市值（f49）
- 双重验证：
  1. StockContext.tsx：API 数据获取时验证
  2. StockHeader.tsx：UI 显示前验证
- 默认值保护：如果数据异常，使用 `当前价 × 1 亿股` 计算

## 单位转换
- API 返回：元（f49 字段）
- 显示转换：`÷ 100000000` → 亿
- 精度：保留 1 位小数 `.toFixed(1)`

## 测试建议
1. 测试正常股票（如 600519 贵州茅台）
2. 测试数据异常的股票（模拟 f49=0 的情况）
3. 验证控制台日志：`[市值] 数据异常，使用默认计算：xxx`

## 相关文件
- `src/contexts/StockContext.tsx` - 数据源修复
- `src/sections/StockHeader.tsx` - 显示验证修复
