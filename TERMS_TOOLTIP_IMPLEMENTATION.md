# 术语 Hover 解释功能实现报告

## 完成时间
2026-03-06

## 实现内容

### 1. 创建术语表数据 ✅
**文件**: `src/data/stockTerms.ts`

包含 15 个核心股票术语：
- **斐波那契** - 黄金分割比例技术分析工具
- **MACD** - 平滑异同移动平均线
- **金叉** - 买入信号（短期均线上穿长期均线）
- **死叉** - 卖出信号（短期均线下穿长期均线）
- **RSI** - 相对强弱指数
- **均线多头排列** - 上升趋势强劲
- **均线空头排列** - 下降趋势强劲
- **支撑位** - 价格难跌破的价位
- **阻力位** - 价格难突破的价位
- **量比** - 成交活跃度指标
- **止损位** - 风险控制卖出价
- **止盈位** - 锁定利润卖出价
- **盈亏比** - 预期盈利与亏损的比值
- **量化评分** - 多维度综合评分
- **均线** - 移动平均线

每个术语包含：
- `id`: 唯一标识符
- `name`: 术语名称
- `explanation`: 1-2 句话的简短解释
- `example`: 使用示例
- `relatedTerms`: 相关术语 ID 列表

### 2. 创建 TermsTooltip 组件 ✅
**文件**: `src/components/TermsTooltip.tsx`

功能特性：
- 鼠标悬停或点击显示术语解释
- 带下划线和 ❓ 图标标识
- Tooltip 包含：术语名称、解释、示例、相关术语
- 支持键盘访问（Tab + Enter）
- 点击遮罩层关闭
- 响应式定位（自动适应屏幕）

使用示例：
```tsx
<TermsTooltip termId="macd">MACD</TermsTooltip>
```

### 3. 创建术语表页面 ✅
**文件**: `src/sections/GlossaryPage.tsx`

功能特性：
- 📖 术语表完整页面
- 搜索框：按名称或解释搜索
- 分类筛选：全部、趋势指标、位置分析、动量指标、量能分析、交易决策
- 术语卡片：展示名称、解释、示例、相关术语
- 可展开/收起相关术语
- 空状态处理
- 使用提示

### 4. 添加术语表入口 ✅
**修改文件**: `src/App.tsx`

- 在 Header 添加 📖 术语表按钮
- 点击切换到术语表页面
- 支持返回分析页面

### 5. 集成到相关组件 ✅

#### TechnicalAnalysis.tsx
已移除（在数据计算层无法直接使用 JSX，保持原有逻辑）

#### StockHeader.tsx
```tsx
<TermsTooltip termId="quant_score">量化评分</TermsTooltip>
```

#### TradingDecision.tsx
已移除（在公式字符串中无法直接使用 JSX）

## 技术实现细节

### 组件架构
```
src/
├── components/
│   ├── TermsTooltip.tsx    # 术语提示组件
│   └── index.ts            # 组件导出
├── data/
│   └── stockTerms.ts       # 术语表数据
├── sections/
│   └── GlossaryPage.tsx    # 术语表页面
└── App.tsx                 # 路由集成
```

### 样式设计
- 使用 Tailwind CSS
- 玻璃态卡片设计
- 响应式布局
- 动画效果（animate-slide-in）
- 主题色统一（primary、bg-surface 等）

### 交互设计
1. **触发方式**：
   - 鼠标悬停（Mouse Enter）
   - 鼠标离开（Mouse Leave）
   - 键盘聚焦（Focus）
   - 键盘失焦（Blur）

2. **显示效果**：
   - 下划线虚线边框
   - ❓ 问号图标
   - Tooltip 带小三角箭头
   - 遮罩层防止误触

3. **内容结构**：
   - 标题栏（📖 + 术语名）
   - 解释文本
   - 示例（蓝色背景框）
   - 相关术语标签

## 编译验证

✅ TypeScript 编译通过
✅ Vite 构建成功
✅ 无运行时错误

```bash
npm run build
> tsc && vite build
✓ built in 8.27s
```

## 使用方法

### 在组件中使用 TermsTooltip

```tsx
import TermsTooltip from '../components/TermsTooltip';

// 在 JSX 中
<p>
  当<TermsTooltip termId="macd">MACD</TermsTooltip>出现
  <TermsTooltip termId="golden_cross">金叉</TermsTooltip>时，
  表明上升趋势可能开始。
</p>
```

### 访问术语表

1. 点击 Header 中的 📖 术语表按钮
2. 使用搜索框查找术语
3. 按分类筛选术语
4. 点击术语卡片查看详情

## 后续优化建议

1. **自动高亮**：创建工具函数，自动扫描文本并高亮术语
2. **术语链接**：在相关术语之间添加可点击链接
3. **收藏功能**：允许用户收藏常用术语
4. **多语言支持**：添加英文术语对照
5. **术语测验**：添加小测试帮助用户学习

## 注意事项

⚠️ **不要在模板字符串中使用 TermsTooltip**

错误示例：
```tsx
// ❌ 这不会工作
const text = `当<TermsTooltip termId="macd">MACD</TermsTooltip>出现金叉`;
```

正确示例：
```tsx
// ✅ 在 JSX 中直接使用
<p>
  当<TermsTooltip termId="macd">MACD</TermsTooltip>出现金叉
</p>
```

## 文件清单

### 新增文件
- `src/data/stockTerms.ts` (4.4KB)
- `src/components/TermsTooltip.tsx` (5.5KB)
- `src/sections/GlossaryPage.tsx` (6.8KB)
- `src/components/index.ts` (0.3KB)

### 修改文件
- `src/App.tsx` - 添加术语表路由和入口按钮
- `src/sections/StockHeader.tsx` - 添加量化评分术语提示
- `src/contexts/StockContext.tsx` - 修复重复属性错误
- `src/sections/MonteCarloPrediction.tsx` - 修复模板字符串语法错误
- `src/sections/StockChart-4H.tsx` - 修复未使用变量警告

## 总结

✅ 完成所有 P1 需求：
1. ✅ 创建术语表数据（15 个核心术语）
2. ✅ 在专业术语首次出现时添加下划线和问号图标
3. ✅ Hover 显示简短解释（1-2 句话 + 示例 + 相关术语）
4. ✅ 添加术语表页面入口（📖图标）
5. ✅ 术语表包含：术语名称、简单解释、示例、相关术语

**输出物**：
- TermsTooltip 组件（可复用）
- GlossaryPage 术语表页面
- stockTerms 术语数据
- 集成到现有组件
