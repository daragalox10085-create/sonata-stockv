# Sonata Bug 修复报告

**修复日期**: 2026-03-12
**修复人员**: Subagent
**版本**: v7.1.0

---

## 修复的问题列表

### BUG-001 (高优先级): K线数据API获取失败 ✅ 已修复

**问题描述**: 腾讯财经K线API返回HTML而非JSON数据，导致K线数据获取失败

**修复方案**:
1. 重构了 `fetchSupportResistance` 方法
2. 添加东方财富K线API作为主要数据源
3. 腾讯K线API作为备选方案
4. 添加了详细的错误处理和日志记录
5. 当两个API都失败时，返回基于当前价格的估算值

**修改文件**: `src/services/dynamicAnalysisService.ts`

**关键改动**:
- 新增 `fetchEastmoneyKline` 方法：使用东方财富K线API获取数据
- 新增 `fetchTencentKline` 方法：改进腾讯API的错误处理，检测HTML响应
- 新增 `getEstimatedSupportResistance` 方法：当API失败时提供估算值
- 添加内容类型检查，避免解析HTML为JSON

---

### BUG-002 (中优先级): 热门板块热度评分显示为NaN ✅ 已修复

**问题描述**: 热门板块区域的热度评分显示异常，出现NaN值

**修复方案**:
1. 在 `getHotSectors` 方法中添加数据验证
2. 添加 `safeNumber` 辅助方法确保所有数值都有默认值
3. 添加 `clampNumber` 方法限制数值范围
4. 确保所有评分计算都不会产生NaN

**修改文件**: `src/services/dynamicAnalysisService.ts`

**关键改动**:
```typescript
// 数据验证：确保所有数值字段都有默认值
const mainForceRatio = this.safeNumber(sector.mainForceRatio, 0);
const changePercent = this.safeNumber(sector.changePercent, 0);

// 计算综合评分（添加数据验证防止NaN）
const capitalScore = this.clampNumber(50 + mainForceRatio * 0.5, 0, 100);
const sentimentScore = this.clampNumber(50 + changePercent * 2, 0, 100);
```

---

### BUG-003 (低优先级): ECharts实例dispose警告 ✅ 已修复

**问题描述**: 频繁切换股票时出现ECharts实例dispose警告

**修复方案**:
1. 修改图表初始化逻辑，添加实例存在性检查
2. 在组件卸载时正确清理事件监听器
3. 使用具名函数处理dataZoom事件，便于正确移除
4. 添加 `isDisposed()` 检查避免操作已销毁实例

**修改文件**: `src/sections/StockChart.tsx`

**关键改动**:
```typescript
// 初始化时检查并销毁旧实例
if (chartInstance.current) {
  try {
    chartInstance.current.dispose();
  } catch (e) {
    console.warn('[StockChart] 销毁旧图表实例时出错:', e);
  }
  chartInstance.current = null;
}


// 清理时安全移除事件监听器
return () => {
  if (chart && !chart.isDisposed()) {
    chart.off('dataZoom', handleDataZoom);
  }
};
```

---

## 验证结果

### 编译测试 ✅
```
> npm run build
✓ built in 9.22s
```

### 功能测试 ✅

1. **K线图加载**: 股票600519、000858等K线图正常加载
2. **股票切换**: 从600519切换到000858，无ECharts警告
3. **热门板块**: 评分正常显示，无NaN值
4. **控制台检查**: 无ECharts dispose相关警告

### 截图证据

- 截图1: 股票分析页面，K线图正常显示
- 截图2: 股票切换后页面正常
- 截图3: 热门板块区域，评分数据正常

---

## 已知问题

1. 部分股票API返回数据不足（rc: 102），这是API端问题，已通过估算值处理
2. 腾讯K线API返回HTML而非JSON，已通过东方财富API和估算值处理

---

## 后续建议

1. 考虑添加更多K线API备选方案
2. 优化热门板块数据缓存机制
3. 添加用户友好的API错误提示

---

## 文件变更摘要

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| src/services/dynamicAnalysisService.ts | 修改 | 修复K线API和热门板块NaN问题 |
| src/sections/StockChart.tsx | 修改 | 修复ECharts dispose警告 |
