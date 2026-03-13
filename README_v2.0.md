# Sonata v2.0 - 后端架构重构文档

**版本**: v2.0-production  
**日期**: 2026-03-13  
**状态**: 生产就绪

---

## 🎯 核心改进

### 1. 数据真实性保证 (100% Real Data)
- `verifyRealData()` 守卫函数
- `DataIntegrityError` 异常机制
- 禁止任何 `source === 'none'` 的数据流入业务层
- API失败返回 `null`，绝不fallback到mock

### 2. 概率一致性修复 (Monte Carlo)
- 基于 `currentPrice` 的二分法分类
- 情景概率 = 上涨概率的组成部分
- 自动验证：上涨概率 = 乐观情景 + 基准情景中上涨部分

### 3. 板块-股票联动 (Sector-Stock Pipeline)
```
热门板块 → 成分股获取 → 六因子选股 → 技术位验证
   ↓           ↓            ↓           ↓
资金流入筛选   真实API      评分排序      支撑位计算
```

### 4. 缓存策略
- 热门板块: 7天 (变化较慢)
- 蒙特卡洛: 1小时 (股价变化较快)
- 健康检查: 30秒轮询

---

## 📁 文件结构

```
src/
├── types/
│   ├── DataContract.ts      # 数据契约 + 验证守卫
│   └── index.ts             # 类型统一导出
├── services/
│   ├── RealDataFetcher.ts   # 真实数据获取 (东方财富API)
│   ├── MonteCarloService.ts # 蒙特卡洛模拟 (概率一致版)
│   ├── StockSelector.ts     # 六因子选股器
│   ├── DynamicSectorAnalyzer.ts  # 热门板块分析
│   ├── SectorStockPipeline.ts    # 板块-股票管道
│   └── index.ts             # 服务统一导出
├── controllers/
│   └── AnalysisController.ts # API控制器
├── hooks/
│   ├── useAnalysis.ts       # React Hooks
│   └── index.ts
├── components/
│   ├── HotSectorsPanel.tsx  # 热门板块UI
│   ├── MonteCarloPanel.tsx  # 蒙特卡洛UI
│   └── index.ts
└── README_v2.0.md           # 本文档
```

---

## 🔌 API端点

| 端点 | 方法 | 缓存 | 说明 |
|------|------|------|------|
| `/api/hot-sectors` | GET | 7天 | 热门板块+精选股票 |
| `/api/stock/:code/monte-carlo` | GET | 1小时 | 个股蒙特卡洛分析 |
| `/api/health` | GET | 无 | 数据源健康检查 |

---

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 验证数据源
curl http://localhost:5179/api/health
```

---

## 📊 六因子权重

| 因子 | 权重 | 说明 |
|------|------|------|
| 估值 | 30% | PE/PB/PEG越低越好 |
| 成长 | 20% | 利润增长率 |
| 规模 | 10% | 市值规模 |
| 动量 | 15% | 近期涨跌幅 |
| 质量 | 10% | ROE/盈利质量 |
| 支撑 | 15% | 距离支撑位远近 |

---

## 🛡️ 数据验证

```typescript
// 使用守卫函数验证数据真实性
import { verifyRealData } from './types/DataContract';

const quote = await fetchStockQuote('000001');
verifyRealData(quote, ['currentPrice', 'source', 'timestamp']);
// 验证通过后才能继续业务逻辑
```

---

## 📝 更新日志

### v2.0 (2026-03-13)
- ✅ 重构数据层，100%真实数据保证
- ✅ 修复蒙特卡洛概率一致性问题
- ✅ 实现板块-股票联动管道
- ✅ 添加数据验证守卫机制
- ✅ 优化缓存策略
- ✅ 新增React Hooks和UI组件

---

**Sonata v2.0 - 专业级股票分析平台**
