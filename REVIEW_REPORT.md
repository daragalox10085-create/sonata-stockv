# Sonata 1.3 代码审阅报告

**审阅日期**: 2026-03-13  
**审阅人员**: Danny (主审) + 资深股民Agent + 项目工程师Agent

---

## 一、严重问题 (Critical) - 必须修复

### 1. 🚨 Web Search 后备数据源产生模拟数据
- **位置**: `src/services/webSearchApi.ts`
- **问题**: 当所有API失败时，使用Tavily Web Search会生成估算的技术指标
- **影响**: 支撑/阻力/止损/止盈等关键数据不是真实计算
- **修复**: 删除Web Search后备，API失败时返回null并显示错误

### 2. 🚨 stockApi.ts 技术指标估算
- **位置**: `src/services/stockApi.ts` 第 280-290 行
- **问题**: `createStockData` 函数中支撑/阻力等数据是估算的
```typescript
const support = low * 0.98;
const resistance = high * 1.02;
```
- **修复**: 使用RealDataFetcher.calculateSupportResistance()获取真实技术位

### 3. 🚨 量化评分硬编码
- **位置**: `src/services/stockApi.ts` 第 300-320 行
- **问题**: 所有评分都是50分硬编码
- **修复**: 移除默认值，从真实数据计算

### 4. 🚨 MonteCarloPanel.tsx 组件损坏
- **位置**: `src/components/MonteCarloPanel.tsx` 第 85-88 行
- **问题**: 标题显示为"200"，代码不完整
- **修复**: 修复组件渲染逻辑

---

## 二、高优先级问题 (High) - 建议修复

### 5. ⚠️ 蒙特卡洛概率计算不一致
- **位置**: `src/services/MonteCarloService.ts`
- **问题**: 情景概率归一化处理有问题
- **修复**: 添加概率归一化方法

### 6. ⚠️ 标准差计算错误
- **位置**: `src/services/MonteCarloService.ts` 第 142 行
- **问题**: 使用p50(中位数)而非均值计算
- **修复**: 改为使用均值

### 7. ⚠️ 情景分析定义不清晰
- **位置**: `src/services/MonteCarloService.ts`
- **问题**: 乐观情景定义与金融常识矛盾
- **修复**: 重新定义情景边界

---

## 三、中优先级问题 (Medium)

### 8. ⚠️ StockAnalysis.tsx 价格区间与蒙特卡洛脱节
- **位置**: `src/sections/StockAnalysis.tsx` 第 25-27 行
- **问题**: 使用支撑阻力计算，而非蒙特卡洛结果
- **修复**: 统一使用蒙特卡洛结果

### 9. ⚠️ 缓存时间过长
- **位置**: `src/controllers/AnalysisController.ts` 第 67 行
- **问题**: 热门板块缓存7天过于陈旧
- **修复**: 缩短缓存时间

---

## 四、数据真实性评估

### ✅ 真实数据源
- 东方财富API (push2.eastmoney.com)
- 新浪财经API (hq.sinajs.cn)
- K线历史数据 (push2his.eastmoney.com)

### ❌ 模拟/估算数据
- Web Search后备数据 (Tavily)
- stockApi.ts中的技术指标估算
- 硬编码的量化评分

---

## 五、修复计划

### 阶段1: 立即修复 (今天)
1. 删除webSearchApi.ts或标记为废弃
2. 修复stockApi.ts使用真实技术位
3. 修复MonteCarloPanel.tsx组件

### 阶段2: 高优先级 (明天)
4. 修复蒙特卡洛概率计算
5. 修复标准差计算
6. 修复情景分析定义

### 阶段3: 优化 (本周)
7. 统一价格显示逻辑
8. 调整缓存时间

---

## 六、交付判断

**当前状态**: ❌ **不可交付**

**原因**:
1. 存在模拟数据混入
2. 关键技术指标是估算而非真实计算
3. 组件代码损坏

**修复后可交付**
