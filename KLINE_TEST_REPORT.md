# K 线图功能深度测试报告

**测试对象**：众兴菌业（002772）  
**测试时间**：2026-03-06 18:21 GMT+8  
**测试人员**：Danny (AI Subagent)

---

## 📊 一、真实股价数据（基准）

### 东方财富网站数据
| 项目 | 数值 |
|------|------|
| 股票代码 | 002772 |
| 股票名称 | 众兴菌业 |
| **最新价** | **18.23 元** ✅ |
| 涨跌额 | +0.31 元 |
| 涨跌幅 | +1.73% |
| 今开 | 17.92 元 |
| 最高 | 18.58 元 |
| 最低 | 17.77 元 |
| 昨收 | 17.92 元 |
| 成交量 | 11.67 万手 |
| 成交额 | 2.136 亿元 |
| 总市值 | 71.69 亿元 |
| 流通市值 | 71.12 亿元 |

---

## 🔍 二、API 响应验证

### 2.1 腾讯财经 API
**请求 URL**：`http://qt.gtimg.cn/q=sz002772`

**实际响应**：
```
v_sz002772="51~众兴菌业~002772~18.23~17.92~17.92~116721~..."
```

**数据解析**：
| 字段索引 | 含义 | 值 | 验证 |
|---------|------|-----|------|
| parts[2] | 股票名称 | 众兴菌业 | ✅ |
| parts[3] | 当前价 | 18.23 | ✅ |
| parts[4] | 昨收 | 17.92 | ✅ |
| parts[5] | 开盘价 | 17.92 | ✅ |
| parts[33] | 最高价 | 18.58 | ✅ |
| parts[34] | 最低价 | 17.77 | ✅ |

### 2.2 东方财富 API
**请求 URL**：`https://push2.eastmoney.com/api/qt/stock/get?secid=0.002772&fields=f43,f44,f45,f46,f47,f48,f49,f57,f58,f60,f169`

**实际响应**：
```json
{
  "data": {
    "f43": 1823,
    "f44": 1858,
    "f45": 1777,
    "f46": 1792,
    "f47": 116721,
    "f48": 213576948.41,
    "f57": "002772",
    "f58": "众兴菌业",
    "f60": 1792,
    "f169": 31
  }
}
```

**数据解析**（注意单位转换）：
| 字段 | 原始值 | 正确转换（÷100） | 代码错误转换（÷1000） |
|------|--------|-----------------|---------------------|
| f43（当前价） | 1823 | 18.23 ✅ | 1.823 ❌ |
| f44（最高价） | 1858 | 18.58 ✅ | 1.858 ❌ |
| f45（最低价） | 1777 | 17.77 ✅ | 1.777 ❌ |
| f46（开盘价） | 1792 | 17.92 ✅ | 1.792 ❌ |
| f60（昨收） | 1792 | 17.92 ✅ | 1.792 ❌ |
| f169（涨跌额） | 31 | 0.31 ✅ | 0.031 ❌ |

### 2.3 新浪财经 K 线 API
**请求 URL**：`http://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=sz002772&scale=240&ma=no&datalen=360`

**验证结果**：✅ 正常
- 返回 360 条 K 线数据
- 最新数据（2026-03-06）：开 17.920，高 18.580，低 17.770，收 18.230
- 数据格式正确，解析逻辑无问题

---

## 🐛 三、发现的 BUG

### BUG #1: parseTencentResponse 正则表达式错误 【严重】

**位置**：`StockContext.tsx` 第 225 行

**当前代码**：
```typescript
const match = text.match(/v_sh\d+="([^"]+)"/);
```

**问题描述**：
- 正则表达式只匹配 `v_sh` 开头的腾讯 API 响应
- 深市股票（002772）的响应格式为 `v_sz002772="..."`
- 导致所有深市股票（000/001/002/003/300/301 开头）的腾讯 API 解析失败

**影响范围**：
- 所有深市股票无法使用腾讯 API 获取数据
- 系统会自动降级到东方财富 API
- 但由于 BUG #2，东方财富 API 的价格计算也是错误的

**修复方案**：
```typescript
const match = text.match(/v_(sh|sz)\d+="([^"]+)"/);
```

---

### BUG #2: parseEastmoneyResponse 价格计算错误 【严重】

**位置**：`StockContext.tsx` 第 287-291 行

**当前代码**：
```typescript
const currentPrice = data.f43 / 1000;  // ❌ 错误
const close = data.f60 / 1000;         // ❌ 错误
const open = data.f46 / 1000;          // ❌ 错误
const high = data.f44 / 1000;          // ❌ 错误
const low = data.f45 / 1000;           // ❌ 错误
```

**问题描述**：
- 东方财富 API 返回的价格单位是「分」（1823 = 18.23 元）
- 代码错误地除以 1000，导致价格显示为实际值的 1/10
- 例如：18.23 元会显示为 1.823 元

**影响范围**：
- 所有通过东方财富 API 获取的股价数据都错误
- 当腾讯 API 失败时（如深市股票因 BUG #1 失败），降级到东方财富 API 会显示错误价格

**修复方案**：
```typescript
const currentPrice = data.f43 / 100;  // ✅ 正确
const close = data.f60 / 100;         // ✅ 正确
const open = data.f46 / 100;          // ✅ 正确
const high = data.f44 / 100;          // ✅ 正确
const low = data.f45 / 100;           // ✅ 正确
```

---

### BUG #3: parseEastmoneyResponse 涨跌额计算错误

**位置**：`StockContext.tsx` 第 301 行

**当前代码**：
```typescript
const change = (data.f169 || 0) / 1000;  // ❌ 错误
```

**问题描述**：
- f169 字段单位同样是「分」（31 = 0.31 元）
- 除以 1000 会得到 0.031，实际应为 0.31

**修复方案**：
```typescript
const change = (data.f169 || 0) / 100;  // ✅ 正确
```

---

## ✅ 四、验证正确的函数

### 4.1 getMarketPrefix 函数
**位置**：`StockContext.tsx` 第 158-164 行

**代码**：
```typescript
function getMarketPrefix(symbol: string): string {
  const prefix = symbol.substring(0, 3);
  if (['600', '601', '603', '605', '688', '510', '511', '512', '513', '515', '516', '518', '519'].includes(prefix)) {
    return 'sh';
  }
  return 'sz';
}
```

**验证结果**：✅ **正确**
- 002772 前缀 '002' 不在沪市列表中，返回 'sz' ✅
- 深市股票前缀识别正确

---

### 4.2 fetchSinaKLineData 函数
**位置**：`StockContext.tsx` 第 420-488 行

**验证结果**：✅ **正确**
- 使用 `getMarketPrefix(symbol)` 生成正确的市场前缀
- API 请求 URL 格式正确：`symbol=sz002772`
- 数据解析逻辑正确
- K 线数据字段映射正确（day, open, high, low, close, volume）

---

## 📋 五、测试总结

### 5.1 问题汇总
| 编号 | 问题 | 严重程度 | 状态 |
|------|------|----------|------|
| BUG #1 | parseTencentResponse 正则只匹配沪市 | 🔴 严重 | 待修复 |
| BUG #2 | parseEastmoneyResponse 价格除以 1000 | 🔴 严重 | 待修复 |
| BUG #3 | parseEastmoneyResponse 涨跌额除以 1000 | 🟠 中等 | 待修复 |

### 5.2 正确功能
| 功能 | 状态 |
|------|------|
| getMarketPrefix 深市识别 | ✅ 正确 |
| fetchSinaKLineData K 线获取 | ✅ 正确 |
| K 线数据解析 | ✅ 正确 |
| 量化指标计算 | ✅ 正确（基于正确价格数据） |

### 5.3 修复优先级
1. **立即修复**：BUG #2（东方财富价格计算）- 影响所有降级到东方财富的股票
2. **立即修复**：BUG #1（腾讯正则表达式）- 影响所有深市股票
3. **尽快修复**：BUG #3（东方财富涨跌额）- 影响涨跌幅显示

---

## 🔧 六、修复代码建议

### 修复 parseTencentResponse
```typescript
function parseTencentResponse(symbol: string, text: string): StockData | null {
  try {
    // 修复：支持 sh 和 sz 两种前缀
    const match = text.match(/v_(sh|sz)\d+="([^"]+)"/);
    if (!match) {
      console.warn(`[解析] 腾讯 API 响应格式异常：${text.substring(0, 100)}`);
      return null;
    }

    const parts = match[2].split('~');  // 注意：match[2] 是第二个捕获组
    // ... 后续代码不变
  } catch (error) {
    logException(symbol, 'parseTencentResponse', error);
    return null;
  }
}
```

### 修复 parseEastmoneyResponse
```typescript
function parseEastmoneyResponse(symbol: string, json: any): StockData | null {
  try {
    const data = json.data;
    if (!data) {
      console.warn(`[解析] 东方财富 API 无数据`);
      return null;
    }

    // 修复：除以 100 而不是 1000
    const currentPrice = data.f43 / 100;
    const close = data.f60 / 100;
    const open = data.f46 / 100;
    const high = data.f44 / 100;
    const low = data.f45 / 100;
    const volume = data.f47;
    const amount = data.f48;

    if (isNaN(currentPrice) || currentPrice <= 0) {
      console.warn(`[解析] 东方财富 API 价格数据异常：${currentPrice}`);
      return null;
    }

    // 修复：涨跌额也除以 100
    const change = (data.f169 || 0) / 100;
    const changePercent = (change / close) * 100;

    // ... 后续代码不变
  } catch (error) {
    logException(symbol, 'parseEastmoneyResponse', error);
    return null;
  }
}
```

---

**报告完成时间**：2026-03-06 18:30 GMT+8  
**测试结论**：发现 3 个严重 BUG，需立即修复
