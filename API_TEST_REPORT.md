# API 测试结果报告

## 测试时间
2026-03-13 14:37

---

## 1. 腾讯财经 API ✅

### 实时行情 API
- **URL**: `https://qt.gtimg.cn/q=sh600519,sz002594`
- **状态**: ✅ 正常
- **响应格式**: JavaScript 变量赋值
- **数据字段**:
  - 股票名称
  - 最新价
  - 开盘价
  - 最高价
  - 最低价
  - 成交量
  - 成交额
  - 买卖盘数据

### K线数据 API (FQ Kline)
- **URL**: `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=sz002594,day,2025-09-01,2026-03-13,120,qfq`
- **状态**: ✅ 正常
- **响应格式**: JSON
- **数据条数**: 120条（半年数据）
- **字段**: 日期、开盘价、收盘价、最高价、最低价、成交量

---

## 2. 东方财富 API ✅

### 实时行情 API
- **URL**: `https://push2.eastmoney.com/api/qt/stock/get?secid=1.600519&fields=f43,f44,f45,f46,f47,f48,f49,f57,f58,f60,f169,f170`
- **状态**: ✅ 正常
- **响应格式**: JSON
- **字段说明**:
  - f43: 最新价（需除以100）
  - f44: 最高价
  - f45: 最低价
  - f46: 开盘价
  - f47: 成交量
  - f48: 成交额
  - f57: 股票代码
  - f58: 股票名称

### K线数据 API
- **URL**: `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=0.002594&klt=101&fqt=1&beg=20250318&end=20260313`
- **状态**: ✅ 正常
- **响应格式**: JSON
- **数据条数**: 240条（一年数据）

---

## 3. 新浪财经 API ❌

### 实时行情 API
- **URL**: `https://hq.sinajs.cn/list=sh600519,sz002594`
- **状态**: ❌ Forbidden
- **说明**: 需要Referer或Cookie验证，直接访问被拒绝

---

## 4. AkShare Python库 ❌

### 安装状态
- **版本**: 1.18.39
- **安装**: ✅ 成功

### 连接测试
- **状态**: ❌ 连接被远程服务器关闭
- **错误**: `RemoteDisconnected('Remote end closed connection without response')`
- **说明**: AkShare依赖的东方财富API服务器拒绝了连接请求

---

## 推荐API使用策略

### 优先级排序

| 优先级 | API | 用途 | 状态 |
|-------|-----|------|------|
| 1 | 腾讯财经实时行情 | 实时价格、买卖盘 | ✅ 稳定 |
| 2 | 腾讯FQ K线 | 历史K线数据 | ✅ 稳定 |
| 3 | 东方财富实时行情 | 备用实时数据 | ✅ 稳定 |
| 4 | 东方财富K线 | 备用K线数据 | ✅ 稳定 |
| 5 | 新浪财经 | 备用数据源 | ❌ 不可用 |
| 6 | AkShare | Python数据获取 | ❌ 不可用 |

### 实际使用建议

1. **实时行情**: 优先使用腾讯财经 `qt.gtimg.cn`
2. **K线数据**: 优先使用腾讯FQ Kline `web.ifzq.gtimg.cn`
3. **故障转移**: 腾讯失败时切换到东方财富
4. **避免使用**: 新浪财经和AkShare（当前不可用）

---

## 整合计划

### 前端整合
1. 更新 `UnifiedStockDataService.ts`
   - 优先调用腾讯API
   - 失败时切换到东方财富
   
2. 更新 `vite.config.ts`
   - 配置腾讯K线代理
   - 配置东方财富代理

### 后端整合（可选）
1. 创建 Python API 服务
   - 封装腾讯API调用
   - 封装东方财富API调用
   - 提供统一接口给前端

---

## 注意事项

1. **频率限制**: 各API可能有访问频率限制，建议添加缓存
2. **数据格式**: 腾讯返回JavaScript变量，需要解析
3. **复权数据**: 腾讯FQ Kline提供前复权数据
4. **错误处理**: 需要完善的错误处理和重试机制
