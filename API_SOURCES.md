# Sonata 1.3 - 数据来源API清单

## 一、股票数据API

### 1. 腾讯财经 API（主要）
- **实时行情**: `https://qt.gtimg.cn/q={market}{code}`
  - market: sh (沪市), sz (深市)
  - 示例: `https://qt.gtimg.cn/q=sh600519`
  - 字段: 名称、当前价、开盘价、最高价、最低价、成交量、市值等

- **K线数据**: `https://web.ifzq.gtimg.cn/appstock/v3/kline`
  - 用途: 获取历史K线数据
  - 代理路径: `/api/tencent/kline`

### 2. 东方财富 API（主要）
- **实时行情**: `https://push2.eastmoney.com/api/qt/stock/get`
  - 参数: secid (1.xxx=沪市, 0.xxx=深市), fields
  - 示例: `secid=1.600519&fields=f43,f57,f58,...`
  - 字段: f43=当前价, f57=代码, f58=名称, f162=PE, f163=PEG, f167=PB等

- **K线数据**: `https://push2his.eastmoney.com/api/qt/stock/kline/get`
  - 参数: secid, klt (101=日线), beg, end, lmt
  - 示例: `secid=1.600519&klt=101&lmt=60`
  - 代理路径: `/api/eastmoney/kline`

- **搜索建议**: `https://searchapi.eastmoney.com/api/suggest/get`
  - 参数: input, type=14, count=10
  - 代理路径: `/api/eastmoney/suggest`

### 3. 新浪财经 API（备用）
- **实时行情**: `https://hq.sinajs.cn/list={market}{code}`
  - market: sh (沪市), sz (深市)
  - 示例: `https://hq.sinajs.cn/list=sh600519`
  - 需要Referer头: `https://finance.sina.com.cn`

---

## 二、板块数据API

### 1. 东方财富板块API
- **板块列表**: `https://push2.eastmoney.com/api/qt/clist/get`
  - 参数: fs=m:90+t:2 (行业板块), fid=f62 (按主力净流入排序)
  - 字段: f12=板块代码, f14=板块名称, f3=涨跌幅, f62=主力净流入
  - 用途: 获取热门板块

- **板块成分股**: `https://push2.eastmoney.com/api/qt/clist/get`
  - 参数: fs=b:{sectorCode} (板块代码)
  - 字段: f12=股票代码, f14=股票名称, f3=涨跌幅
  - 用途: 获取板块内的股票列表

---

## 三、后端API（Flask）

### 1. 股票分析API
- **股票分析**: `GET /api/stock-analysis?code={stockCode}`
  - 返回: 蒙特卡洛分析结果、技术指标等

- **个股蒙特卡洛**: `GET /api/stock/{stockCode}/monte-carlo`
  - 返回: 蒙特卡洛模拟结果

### 2. 热门板块API
- **热门板块**: `GET /api/hot-sectors`
  - 参数: refresh=true (强制刷新)
  - 返回: 热门板块列表及精选股票

---

## 四、Vite代理配置

在 `vite.config.ts` 中配置的代理:

```typescript
'/api/tencent/kline': {
  target: 'https://web.ifzq.gtimg.cn',
  rewrite: (path) => path.replace(/^\/api\/tencent\/kline/, '/appstock/v3/kline')
},
'/api/tencent/quote': {
  target: 'https://qt.gtimg.cn',
  rewrite: (path) => path.replace(/^\/api\/tencent\/quote/, '/q')
},
'/api/eastmoney/kline': {
  target: 'https://push2his.eastmoney.com',
  rewrite: (path) => path.replace(/^\/api\/eastmoney\/kline/, '/api/qt/stock/kline/get')
},
'/api/eastmoney/quote': {
  target: 'https://push2.eastmoney.com',
  rewrite: (path) => path.replace(/^\/api\/eastmoney\/quote/, '/api/qt/stock/get')
},
'/api/sina': {
  target: 'https://hq.sinajs.cn',
  rewrite: (path) => path.replace(/^\/api\/sina/, '')
}
```

---

## 五、API优先级

### 股票实时数据
1. 腾讯财经 (主要)
2. 东方财富 (备用)
3. 新浪财经 (备用)

### K线历史数据
1. 腾讯财经K线 (主要)
2. 东方财富K线 (备用)

### 板块数据
1. 东方财富板块API (主要)
2. 备用数据 (当API失败时)

---

## 六、数据真实性保证

- ✅ 100%真实数据，无模拟数据
- ✅ 多层级冗余策略
- ✅ API失败时返回空数据，不使用mock
- ✅ 所有数据来源明确标注

---

*最后更新: 2026-03-13*