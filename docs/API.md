# Sonata API 文档

本文档描述 Sonata 股票分析平台的所有 RESTful API 接口。

## 基础信息

- **基础URL**: `http://localhost:5000/api`
- **数据格式**: JSON
- **字符编码**: UTF-8

## 接口概览

| 端点 | 方法 | 说明 | 缓存 |
|------|------|------|------|
| `/health` | GET | 健康检查 | 无 |
| `/test` | GET | 测试端点 | 无 |
| `/stock-analysis` | GET | 股票分析（含蒙特卡洛） | 1小时 |
| `/stock/{code}/monte-carlo` | GET | 蒙特卡洛预测 | 1小时 |
| `/hot-sectors` | GET | 热门板块列表 | 7天 |

---

## 1. 健康检查

### GET /api/health

检查后端服务健康状态。

#### 请求参数

无

#### 响应示例

```json
{
  "status": "healthy",
  "dataSource": "eastmoney",
  "connection": "ok",
  "timestamp": "2026-03-16T20:30:00.000000"
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `status` | string | 服务状态：`healthy` / `unhealthy` |
| `dataSource` | string | 当前使用的数据源 |
| `connection` | string | 连接状态 |
| `timestamp` | string | ISO 8601 格式时间戳 |

#### 错误响应

```json
{
  "status": "unhealthy",
  "error": "数据连接异常"
}
```

HTTP状态码: 503

---

## 2. 测试端点

### GET /api/test

简单的测试端点，用于验证 API 是否正常运行。

#### 响应示例

```json
{
  "status": "OK",
  "message": "Sonata API running"
}
```

---

## 3. 股票分析

### GET /api/stock-analysis

获取股票综合分析，包括当前价格、蒙特卡洛预测等。

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `code` | string | 否 | 股票代码，默认 `sh600519` |

#### 股票代码格式

- 沪市: `sh600519` 或 `600519`
- 深市: `sz000001` 或 `000001`

#### 响应示例

```json
{
  "current_price": 1680.50,
  "predicted_price": 1725.30,
  "change_pct": 2.66,
  "price_range": {
    "low": 1580.20,
    "high": 1820.80
  },
  "support": 1548.60,
  "resistance": 1857.22,
  "suggestion": "中等",
  "suggestion_detail": "价格¥1680.50位于支撑附近，建议分批买入，仓位30-50%，止损¥1580.20",
  "suggestion_color": "#FF9500",
  "today_data": {
    "open": 1675.00,
    "high": 1690.50,
    "low": 1668.20,
    "volume": 15234,
    "market_cap": 21120.50,
    "yesterday_close": 1670.30
  },
  "data_source": "eastmoney"
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `current_price` | number | 当前价格 |
| `predicted_price` | number | 预测价格（蒙特卡洛中位数） |
| `change_pct` | number | 预期涨跌幅（%） |
| `price_range.low` | number | 5%分位数价格 |
| `price_range.high` | number | 95%分位数价格 |
| `support` | number | 支撑位 |
| `resistance` | number | 阻力位 |
| `suggestion` | string | 投资建议：强烈看多/中等/观望/谨慎 |
| `suggestion_detail` | string | 详细建议说明 |
| `suggestion_color` | string | 建议颜色代码 |
| `today_data` | object | 今日行情数据 |
| `data_source` | string | 数据来源 |

#### 错误响应

```json
{
  "error": "无法获取股票数据，所有API源均失败"
}
```

HTTP状态码: 400

---

## 4. 蒙特卡洛预测

### GET /api/stock/{code}/monte-carlo

获取股票的蒙特卡洛模拟预测结果。

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `code` | string | 6位股票代码，如 `600519` |

#### 响应示例

```json
{
  "success": true,
  "stock": {
    "code": "600519",
    "name": "贵州茅台",
    "currentPrice": 1680.50
  },
  "monteCarlo": {
    "scenarios": [
      {
        "type": "乐观",
        "probability": 25,
        "priceRange": [1750.00, 1850.00],
        "expectedReturn": 8.5,
        "description": "价格有25%概率上涨至￥1750.00-￥1850.00"
      },
      {
        "type": "基准",
        "probability": 50,
        "priceRange": [1620.00, 1750.00],
        "expectedReturn": 1.2,
        "description": "价格在￥1620.00-￥1750.00区间震荡"
      },
      {
        "type": "悲观",
        "probability": 25,
        "priceRange": [1520.00, 1620.00],
        "expectedReturn": -5.3,
        "description": "价格有25%概率下跌至￥1520.00-￥1620.00"
      }
    ],
    "upProbability": 62,
    "downProbability": 38,
    "expectedPrice": 1695.30,
    "riskRewardRatio": 1.85,
    "derivationSteps": [
      "基于60天历史价格数据计算统计参数",
      "年化波动率：25.50%（日波动率：1.6056%）",
      "年化漂移率：8.20%（日漂移率：0.0325%）",
      "使用几何布朗运动模型：S_t = S_0 * exp((μ - σ²/2)*t + σ*√t*Z)",
      "运行10,000次蒙特卡洛模拟",
      "预测7天后价格分布",
      "上涨概率：62%，下跌概率：38%"
    ],
    "statistics": {
      "median": 1695.30,
      "mean": 1698.50,
      "stdDev": 0.255
    }
  }
}
```

#### 响应字段说明

##### 情景对象 (Scenario)

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | string | 情景类型：乐观/基准/悲观 |
| `probability` | number | 情景发生概率（%） |
| `priceRange` | array | 价格区间 [最小值, 最大值] |
| `expectedReturn` | number | 预期收益率（%） |
| `description` | string | 情景描述 |

##### 统计信息 (Statistics)

| 字段 | 类型 | 说明 |
|------|------|------|
| `median` | number | 预测价格中位数 |
| `mean` | number | 预测价格均值 |
| `stdDev` | number | 标准差 |

#### 错误响应

```json
{
  "success": false,
  "error": "无法获取股票数据"
}
```

HTTP状态码: 400

---

## 5. 热门板块

### GET /api/hot-sectors

获取当前热门板块列表及精选股票。

#### 请求参数

无

#### 响应示例

```json
{
  "success": true,
  "data": [
    {
      "sector": {
        "code": "BK0428",
        "name": "光伏设备",
        "score": 85,
        "rank": 1,
        "changePercent": 3.52,
        "dimensions": {
          "momentum": 82,
          "capital": 88,
          "technical": 75,
          "fundamental": 80
        },
        "trend": "强势热点",
        "topStocks": [
          {"code": "601012", "name": "隆基绿能", "changePercent": 4.2},
          {"code": "600438", "name": "通威股份", "changePercent": 3.8}
        ],
        "metrics": {
          "mainForceNet": 2500000000,
          "turnoverRate": 5.2,
          "rsi": 68,
          "marketValue": 1500000000000
        }
      },
      "constituents": ["601012", "600438", "002459"],
      "selectedStocks": [
        {
          "code": "601012",
          "name": "隆基绿能",
          "score": 78,
          "confidence": 75,
          "recommendation": "推荐"
        }
      ],
      "analysisTimestamp": "2026-03-16T20:30:00",
      "dataQuality": {
        "sectorValid": true,
        "constituentsCount": 45,
        "selectedCount": 3,
        "isRealData": true
      }
    }
  ],
  "updatePolicy": "每4小时自动更新",
  "isRealData": true,
  "timestamp": "2026-03-16T20:30:00"
}
```

#### 响应字段说明

##### 板块对象 (Sector)

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | string | 板块代码 |
| `name` | string | 板块名称 |
| `score` | number | 综合评分 (0-100) |
| `rank` | number | 排名 |
| `changePercent` | number | 涨跌幅（%） |
| `dimensions` | object | 多维度评分 |
| `trend` | string | 趋势判断 |
| `topStocks` | array | 领涨股票 |
| `metrics` | object | 板块指标 |

##### 维度评分 (Dimensions)

| 字段 | 类型 | 说明 |
|------|------|------|
| `momentum` | number | 动量评分 |
| `capital` | number | 资金评分 |
| `technical` | number | 技术评分 |
| `fundamental` | number | 基本面评分 |

##### 板块指标 (Metrics)

| 字段 | 类型 | 说明 |
|------|------|------|
| `mainForceNet` | number | 主力净流入（元） |
| `turnoverRate` | number | 换手率（%） |
| `rsi` | number | RSI指标 |
| `marketValue` | number | 总市值（元） |

#### 错误响应

```json
{
  "success": false,
  "error": "无法获取板块数据",
  "isRealData": false
}
```

HTTP状态码: 400 或 500

---

## 错误处理

### 错误响应格式

所有 API 错误都遵循以下格式：

```json
{
  "success": false,
  "error": "错误描述",
  "code": "ERROR_CODE",
  "timestamp": "2026-03-16T20:30:00"
}
```

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |
| 503 | 服务不可用 |

### 错误代码

| 代码 | 说明 |
|------|------|
| `INVALID_STOCK_CODE` | 无效的股票代码 |
| `DATA_SOURCE_ERROR` | 数据源错误 |
| `CALCULATION_ERROR` | 计算错误 |
| `RATE_LIMIT_EXCEEDED` | 请求频率超限 |

---

## 数据限制

### 频率限制

| 端点 | 限制 |
|------|------|
| `/api/health` | 无限制 |
| `/api/stock-analysis` | 60次/分钟 |
| `/api/stock/*/monte-carlo` | 30次/分钟 |
| `/api/hot-sectors` | 10次/分钟 |

### 数据时效性

| 数据类型 | 更新频率 |
|----------|----------|
| 实时行情 | 30秒 |
| 历史K线 | 每日收盘后 |
| 热门板块 | 4小时 |
| 蒙特卡洛 | 1小时 |

---