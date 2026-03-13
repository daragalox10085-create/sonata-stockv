# Sonata 1.3 Agent团队审阅任务

**任务时间**: 2026-03-13  
**目标**: 全面审视蒙特卡洛模拟和热门板块功能，找出问题并修复

## 已知问题
1. 上涨/下跌概率和情景对不上
2. 热门板块&精选股票池无法显示

## Agent分工

### Agent 1: 量化算法专家 (QuantAgent)
**专长**: 金融量化模型、蒙特卡洛模拟、概率统计
**任务**:
- 审查蒙特卡洛算法逻辑
- 验证上涨/下跌概率计算
- 检查情景分析（乐观/基准/悲观）是否正确
- 验证概率总和是否为100%
- 找出概率和情景对不上的原因

### Agent 2: 代码工程师 (CodeAgent)
**专长**: TypeScript/React、前后端调试、API集成
**任务**:
- 审查热门板块&精选股票池的前后端代码
- 检查API调用和数据流
- 找出无法显示的原因
- 检查组件渲染逻辑
- 验证数据传递是否正确

### Agent 3: 资深股民 (InvestorAgent)
**专长**: 股票投资经验、市场分析、用户需求
**任务**:
- 从用户角度验证功能合理性
- 检查预测结果是否符合市场常识
- 验证热门板块排序是否合理
- 检查推荐股票是否符合投资逻辑
- 提出用户体验改进建议

### Agent 4: 网页项目总经理 (ManagerAgent)
**专长**: 项目管理、整体架构、交付标准
**任务**:
- 统筹各Agent的发现
- 评估修复优先级
- 协调跨Agent的修复工作
- 验证修复后的整体功能
- 做出最终交付判断

## 审阅范围

### 蒙特卡洛模块
- `src/services/MonteCarloService.ts`
- `src/components/MonteCarloPanel.tsx`
- `src/sections/StockAnalysis.tsx`
- `src/hooks/useAnalysis.ts`

### 热门板块模块
- `src/services/DynamicSectorAnalyzer.ts`
- `src/services/StockSelector.ts`
- `src/components/HotSectorsPanel.tsx`
- `src/sections/WeeklyMarketAnalysis.tsx`
- `src/controllers/AnalysisController.ts`

## 输出要求
每个Agent需提交:
1. 发现的问题清单（按优先级）
2. 问题根因分析
3. 修复建议
4. 修复后的验证结果

## 协作流程
1. 各Agent并行审阅（15分钟）
2. ManagerAgent汇总问题
3. 分配修复任务
4. 各Agent执行修复
5. 交叉验证
6. 最终报告
