# 🔧 V7.2.1 问题修复清单

## P0 - 严重问题（必须立即修复）

### 1. TypeScript 编译错误 (8 个)

**文件**: `src/App.tsx` (第 112 行)
```typescript
// 错误：returnType 参数不存在
pdf.save(fileName, {
  returnType: 'blob',  // ❌ 删除此行
  saveAs: true
});

// 修复：
pdf.save(fileName);  // ✅
```

**文件**: `src/contexts/StockContext.tsx` (第 424 行)
```typescript
// 错误：days 参数未使用
async function fetchEastmoneyKLine(symbol: string, days: number): Promise<KLinePoint[] | null> {
  // 修复：删除未使用的参数或添加 eslint-disable 注释
  async function fetchEastmoneyKLine(symbol: string /* days: number */): Promise<KLinePoint[] | null> {
```

**文件**: `src/sections/StockChart-4H.tsx` (第 253, 381, 399, 406 行)
```typescript
// 错误 1: ECharts 类型不匹配
// 修复：添加类型断言或使用正确的类型

// 错误 2: fontWeight 属性不存在
label: {
  formatter: '  现价 ¥{c}',
  position: 'end',
  color: '#1E40AF',
  fontWeight: 'bold',  // ❌ 删除或使用 fontWeights
  fontSize: 12
}

// 错误 3: 数组索引类型问题
// 修复：添加类型检查或断言
```

**文件**: `src/sections/TechnicalAnalysis.tsx` (第 381 行)
```typescript
// 错误：idx 未使用
{dimensions.map((dim, idx) => {  // ❌
// 修复：
{dimensions.map((dim) => {  // ✅
```

### 2. K 线数据源不稳定

**问题**: 部分股票（如贵州茅台）K 线数据返回 0 条

**修复方案**:
1. 检查腾讯 API 响应格式
2. 增强东方财富 API 作为主要数据源
3. 添加数据质量检查和降级策略

---

## P1 - 重要问题（尽快修复）

### 1. 按钮禁用状态逻辑错误

**文件**: `src/sections/StockSearch.tsx`

**问题**: 输入 5 位数字时，"开始分析"按钮未保持禁用

**修复**:
```typescript
// 检查按钮禁用逻辑
const isButtonDisabled = !validateStockSymbolFormat(inputValue).valid || 
                         !validateStockSymbolExists(inputValue).valid;
```

### 2. 高德 API Key 暴露

**文件**: 客户端代码中硬编码

**修复方案**:
1. 将 API 调用移至后端代理
2. 使用环境变量（Vite: `VITE_` 前缀）
3. 实现 API 密钥轮换机制

### 3. ECharts 类型定义不匹配

**文件**: `src/sections/StockChart-4H.tsx`

**修复**:
```typescript
// 安装正确的类型定义
npm install -D @types/echarts

// 或使用类型断言
const option = { ... } as echarts.EChartsOption;
```

---

## P2 - 优化建议（有时间则修复）

### 1. 代码质量改进
- [ ] 移除所有未使用变量
- [ ] 添加函数级 JSDoc 注释
- [ ] 统一错误处理模式
- [ ] 添加单元测试

### 2. UI/UX 改进
- [ ] 添加 ARIA 属性
- [ ] 统一图标大小
- [ ] 优化加载动画
- [ ] 添加错误边界组件

### 3. 性能优化
- [ ] 实现代码分割
- [ ] 优化图片加载
- [ ] 添加 Service Worker
- [ ] 优化 bundle 大小

### 4. 测试覆盖
- [ ] 添加单元测试（Jest/Vitest）
- [ ] 添加 E2E 测试（Playwright）
- [ ] 添加性能测试
- [ ] 添加可访问性测试

---

## 修复优先级

### 第一阶段（今天完成）
- [ ] 修复所有 TypeScript 编译错误
- [ ] 修复按钮禁用状态逻辑
- [ ] 验证 K 线数据源

### 第二阶段（本周完成）
- [ ] 重构 API 密钥管理
- [ ] 添加错误边界
- [ ] 优化 ECharts 类型定义

### 第三阶段（下周完成）
- [ ] 添加单元测试
- [ ] 改进可访问性
- [ ] 性能优化

---

## 验证步骤

修复后执行：
```bash
# 1. TypeScript 编译检查
npm run build

# 2. 开发服务器测试
npm run dev

# 3. 手动测试关键功能
- 股票代码输入验证
- 热门股票点击
- K 线图显示
- 术语表快捷键
- PDF 下载
```

---

**创建时间**: 2026-03-07 21:30  
**负责人**: Danny  
**状态**: 待修复
