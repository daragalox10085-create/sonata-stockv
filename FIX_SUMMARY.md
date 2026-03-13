# 热门板块&精选股票池 "无法显示" 问题修复报告

## 📋 问题概述
用户反馈：热门板块&精选股票池无法显示

## 🔍 根因分析

### 主要问题（⭐⭐⭐ 核心问题）

**API 路由缺失**

- **前端调用**: `useAnalysis.ts` → `/api/hot-sectors`
- **后端实现**: `backend/app.py` 没有实现该路由
- **结果**: HTTP 404 → 数据加载失败 → UI 无法显示

### 次要问题

1. **Vite 代理配置不完整**
   - `vite.config.ts` 缺少 `/api/hot-sectors` 的代理规则

2. **数据类型处理不一致**
   - `WeeklyMarketAnalysis.tsx` 中对 `topStocks` 的类型假设有误

3. **选股条件过于严格**
   - `StockSelector.ts` 中筛选条件导致无股票符合条件

## ✅ 修复内容

### 修复 1: 添加后端 API 路由

**文件**: `backend/app.py`

新增 `/api/hot-sectors` 路由，包含：
- ✅ 从东方财富获取热门板块数据
- ✅ 主力净流入筛选（>1000 万）
- ✅ 计算多维度评分（动量、资金、技术、基本面）
- ✅ 获取板块成分股
- ✅ 精选股票池（六因子选股简化版）
- ✅ 返回符合前端期望的数据结构

**关键函数**:
```python
@app.route('/api/hot-sectors', methods=['GET'])
def get_hot_sectors():
    # 获取热门板块
    sectors = fetch_hot_sectors_from_eastmoney()
    
    # 为每个板块获取成分股并精选股票
    for sector in sectors[:6]:
        constituents = fetch_sector_constituents(sector['code'])
        selected_stocks = select_stocks(constituents[:20], 3)
        
    return jsonify({...})
```

### 修复 2: 更新 Vite 代理配置

**文件**: `vite.config.ts`

```typescript
'/api/hot-sectors': {
  target: 'http://localhost:5000',
  changeOrigin: true,
  secure: false
}
```

### 修复 3: 修正数据类型处理

**文件**: `src/sections/WeeklyMarketAnalysis.tsx`

```typescript
// 修复前
const codes = sector.topStocks.map((stock: any) => 
  typeof stock === 'string' ? stock : stock.code
);

// 修复后
const codes = sector.topStocks.map((stock) => stock.code);
```

### 修复 4: 放宽选股条件

**文件**: `src/services/StockSelector.ts`

```typescript
// 修复前
minUpwardSpace: 3,  // 最小上涨空间 3%
supportDistanceRange: [-5, 8],  // -5% 到 8%

// 修复后
minUpwardSpace: 1,  // 最小上涨空间 1%
supportDistanceRange: [-10, 15],  // -10% 到 15%
```

### 修复 5: 改进空状态提示

**文件**: `src/components/HotSectorsPanel.tsx`

```tsx
if (!data || data.length === 0) {
  return (
    <div className="text-center py-12 text-gray-500">
      <p>暂无符合条件的板块数据</p>
      <p className="text-sm text-gray-400 mt-2">
        可能原因：当前市场无主力资金流入超 1000 万的板块
      </p>
      <button onClick={refresh} className="mt-4 px-4 py-2 bg-blue-600...">
        刷新重试
      </button>
    </div>
  );
}
```

## 🧪 验证步骤

### 1. 启动后端服务

```bash
cd C:\Users\CCL\.openclaw\workspace\sonata-1.3\backend
uv run python app.py
```

预期输出：
```
Starting Flask backend on http://0.0.0.0:5000
```

### 2. 启动前端开发服务器

```bash
cd C:\Users\CCL\.openclaw\workspace\sonata-1.3
pnpm dev
```

### 3. 测试 API 端点

浏览器访问：`http://localhost:5000/api/hot-sectors`

预期响应：
```json
{
  "success": true,
  "data": [
    {
      "sector": {
        "code": "BK0897",
        "name": "半导体",
        "score": 78,
        "rank": 1,
        "changePercent": 2.5,
        "trend": "持续热点",
        "topStocks": [...],
        "metrics": {...}
      },
      "constituents": ["600000", "600036", ...],
      "selectedStocks": [...],
      "dataQuality": {...}
    }
  ],
  "isRealData": true,
  "timestamp": "2026-03-13T..."
}
```

### 4. 验证前端显示

访问：`http://localhost:5177`

检查点：
- ✅ 热门板块卡片显示（最多 6 个）
- ✅ 每个板块显示：名称、评分、涨跌幅、主力净流入
- ✅ 维度评分条显示（动量、资金、技术）
- ✅ 精选股票列表显示（每板块最多 3 只）
- ✅ 股票显示：名称、评分、推荐等级

## 📊 数据流图

```
用户打开页面
    ↓
HotSectorsPanel 组件渲染
    ↓
useHotSectors hook 触发
    ↓
fetch('/api/hot-sectors')
    ↓
Vite 代理 → http://localhost:5000/api/hot-sectors
    ↓
Flask backend.get_hot_sectors()
    ↓
fetch_hot_sectors_from_eastmoney()
    ↓
东方财富 API → 板块数据
    ↓
筛选（主力净流入>1000 万）
    ↓
计算评分 → 排序 → Top 6
    ↓
for each sector:
  - fetch_sector_constituents() → 成分股
  - select_stocks() → 精选股票
    ↓
返回 JSON 响应
    ↓
前端解析数据
    ↓
HotSectorsPanel 渲染 UI
    ↓
用户看到热门板块&精选股票池 ✅
```

## ⚠️ 注意事项

1. **网络依赖**: 需要能够访问东方财富 API
2. **数据时效**: 板块数据每 4 小时更新一次
3. **筛选条件**: 只有主力净流入>1000 万的板块才会显示
4. **市场状态**: 非交易时段数据可能不完整

## 🔧 故障排查

### 如果仍然无法显示：

1. **检查后端日志**
   ```bash
   # 查看 Flask 控制台输出
   # 应该看到"数据获取成功：eastmoney"
   ```

2. **检查浏览器控制台**
   ```
   F12 → Console
   # 应该没有 CORS 错误或 404 错误
   ```

3. **测试 API 连通性**
   ```bash
   curl http://localhost:5000/api/hot-sectors
   ```

4. **检查网络请求**
   ```
   F12 → Network → 搜索 "hot-sectors"
   # 状态码应该是 200
   # 响应应该包含 data 数组
   ```

## 📝 后续优化建议

1. **添加缓存机制**: Redis 缓存板块数据，减少 API 调用
2. **增量更新**: 只更新变化的板块数据
3. **错误降级**: API 失败时显示缓存数据或友好提示
4. **性能优化**: 并行获取成分股数据
5. **数据验证**: 添加更严格的数据完整性检查

---

**修复日期**: 2026-03-13  
**修复版本**: Sonata 1.3  
**状态**: ✅ 已修复
