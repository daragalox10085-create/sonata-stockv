# Sonata API 统一化设计文档

## 1. 概述

### 1.1 目标
统一化 Sonata 项目中的所有 API 调用方式，提供一致的接口规范、错误处理和重试机制。

### 1.2 当前问题
- 多个 API 调用方式不统一（/api/eastmoney, /api/tencent, /api/sina）
- 错误处理分散在各处
- 超时和重试机制不一致
- 响应格式不统一

### 1.3 设计原则
1. **统一接口**: 所有 API 调用通过统一客户端
2. **向后兼容**: 现有代码可平滑迁移
3. **类型安全**: 完整的 TypeScript 类型支持
4. **可扩展**: 易于添加新的数据源

---

## 2. 统一 API 接口规范

### 2.1 请求格式

```typescript
interface ApiRequest<T = unknown> {
  // 请求方法
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  
  // 请求路径（相对路径，如 /quote, /kline）
  endpoint: string;
  
  // 查询参数
  params?: Record<string, string | number | boolean>;
  
  // 请求体（POST/PUT）
  body?: T;
  
  // 数据源（可选，默认自动选择）
  source?: DataSource;
  
  // 请求选项
  options?: RequestOptions;
}

interface RequestOptions {
  // 超时时间（毫秒），默认 10000
  timeout?: number;
  
  // 重试次数，默认 3
  retries?: number;
  
  // 重试延迟（毫秒），默认 1000
  retryDelay?: number;
  
  // 是否使用缓存，默认 true
  useCache?: boolean;
  
  // 缓存时间（毫秒），默认 30000
  cacheTtl?: number;
  
  // 自定义请求头
  headers?: Record<string, string>;
}
```

### 2.2 响应格式

```typescript
interface ApiResponse<T> {
  // 是否成功
  success: boolean;
  
  // 响应数据
  data: T | null;
  
  // 错误信息（失败时）
  error: ApiError | null;
  
  // 元数据
  meta: ResponseMeta;
}

interface ApiError {
  // 错误代码
  code: string;
  
  // 错误消息
  message: string;
  
  // 错误详情
  details?: Record<string, unknown>;
}

interface ResponseMeta {
  // 数据源
  source: string;
  
  // 请求时间戳
  timestamp: string;
  
  // 请求耗时（毫秒）
  duration: number;
  
  // 请求ID（用于追踪）
  requestId: string;
}
```

### 2.3 错误处理

```typescript
// 错误代码枚举
enum ApiErrorCode {
  // 网络错误
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // HTTP 错误
  HTTP_400 = 'BAD_REQUEST',
  HTTP_401 = 'UNAUTHORIZED',
  HTTP_403 = 'FORBIDDEN',
  HTTP_404 = 'NOT_FOUND',
  HTTP_429 = 'RATE_LIMITED',
  HTTP_500 = 'SERVER_ERROR',
  HTTP_503 = 'SERVICE_UNAVAILABLE',
  
  // 数据错误
  PARSE_ERROR = 'PARSE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATA_NOT_FOUND = 'DATA_NOT_FOUND',
  
  // 配置错误
  CONFIG_ERROR = 'CONFIG_ERROR',
  SOURCE_NOT_AVAILABLE = 'SOURCE_NOT_AVAILABLE',
  
  // 未知错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// 错误处理策略
interface ErrorHandlingConfig {
  // 是否自动重试
  autoRetry: boolean;
  
  // 可重试的错误代码
  retryableCodes: ApiErrorCode[];
  
  // 是否自动降级到其他数据源
  autoFallback: boolean;
  
  // 降级顺序
  fallbackOrder: DataSource[];
}
```

---

## 3. 数据源配置

### 3.1 数据源枚举

```typescript
enum DataSource {
  EASTMONEY = 'eastmoney',    // 东方财富 - 优先级 1
  TENCENT = 'tencent',        // 腾讯财经 - 优先级 2
  SINA = 'sina',              // 新浪财经 - 优先级 3
  AKSHARE = 'akshare',        // AkShare - 优先级 4（备用）
}

interface DataSourceConfig {
  name: string;
  priority: number;
  baseUrl: string;
  timeout: number;
  retryCount: number;
  retryDelay: number;
  enabled: boolean;
}
```

### 3.2 数据源能力矩阵

| 数据源 | 实时行情 | K线数据 | 板块列表 | 板块成分股 | 搜索 |
|--------|----------|---------|----------|------------|------|
| EastMoney | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tencent | ✅ | ✅ | ❌ | ❌ | ❌ |
| Sina | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 4. UnifiedApiClient 实现

### 4.1 核心类设计

```typescript
class UnifiedApiClient {
  // 单例实例
  private static instance: UnifiedApiClient;
  
  // 配置
  private config: UnifiedApiConfig;
  
  // 缓存管理器
  private cacheManager: CacheManager;
  
  // 请求去重器
  private deduplicator: RequestDeduplicator;
  
  // 日志记录器
  private logger: ApiLogger;
  
  // 获取实例
  static getInstance(): UnifiedApiClient;
  
  // 初始化配置
  initialize(config: UnifiedApiConfig): void;
  
  // 通用请求方法
  request<T>(request: ApiRequest): Promise<ApiResponse<T>>;
  
  // GET 请求快捷方法
  get<T>(endpoint: string, params?: Record<string, unknown>, options?: RequestOptions): Promise<ApiResponse<T>>;
  
  // POST 请求快捷方法
  post<T>(endpoint: string, body: unknown, options?: RequestOptions): Promise<ApiResponse<T>>;
  
  // 批量请求
  batch<T>(requests: ApiRequest[]): Promise<ApiResponse<T>[]>;
  
  // 获取数据源状态
  getDataSourceStatus(): DataSourceStatus[];
  
  // 测试数据源连接
  testDataSource(source: DataSource): Promise<boolean>;
}
```

### 4.2 配置选项

```typescript
interface UnifiedApiConfig {
  // 默认超时
  defaultTimeout: number;
  
  // 默认重试次数
  defaultRetries: number;
  
  // 默认重试延迟
  defaultRetryDelay: number;
  
  // 缓存配置
  cache: {
    enabled: boolean;
    defaultTtl: number;
    maxSize: number;
  };
  
  // 日志配置
  logging: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
    maxLogs: number;
  };
  
  // 数据源配置
  dataSources: Record<DataSource, DataSourceConfig>;
  
  // 错误处理配置
  errorHandling: ErrorHandlingConfig;
}
```

---

## 5. Functions 端点规范

### 5.1 统一端点设计

```
/api/v1/quote          - 获取实时行情
/api/v1/kline          - 获取K线数据
/api/v1/sector         - 获取板块列表
/api/v1/sector/:code   - 获取板块成分股
/api/v1/search         - 搜索股票
/api/v1/batch          - 批量请求
```

### 5.2 端点参数规范

#### /api/v1/quote
```typescript
interface QuoteRequest {
  symbol: string;           // 股票代码（必填）
  source?: DataSource;      // 指定数据源（可选）
  fields?: string[];        // 指定字段（可选）
}

interface QuoteResponse {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  marketCap: number;
  pe?: number;
  pb?: number;
  // ... 其他字段
}
```

#### /api/v1/kline
```typescript
interface KLineRequest {
  symbol: string;           // 股票代码（必填）
  timeframe?: '1' | '5' | '15' | '30' | '60' | '240' | '101';  // 时间周期
  limit?: number;           // 返回条数
  start?: string;           // 开始日期
  end?: string;             // 结束日期
  adjust?: 'qfq' | 'hfq';   // 复权方式
}

interface KLinePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
```

---

## 6. 向后兼容性

### 6.1 兼容层设计

```typescript
// 兼容层 - 包装旧 API 调用
class ApiCompatibilityLayer {
  private client: UnifiedApiClient;
  
  // 旧版 fetchRealTimeData 兼容
  async fetchRealTimeData(symbol: string): Promise<{ data: StockData | null; source: string }>;
  
  // 旧版 fetchKLineData 兼容
  async fetchKLineData(symbol: string, days: number): Promise<KLinePoint[] | null>;
  
  // 旧版 searchStockByName 兼容
  async searchStockByName(keyword: string): Promise<StockSearchResult[]>;
}

// 导出兼容 API
export const legacyApi = new ApiCompatibilityLayer();
```

### 6.2 迁移路径

1. **阶段 1**: 部署 UnifiedApiClient，保持旧 API 不变
2. **阶段 2**: 逐步迁移到新 API，旧 API 添加 deprecation 警告
3. **阶段 3**: 完全切换到新 API，移除兼容层

---

## 7. 性能优化

### 7.1 缓存策略

```typescript
interface CacheStrategy {
  // 实时行情 - 30秒
  quote: { ttl: 30000 };
  
  // K线数据 - 1分钟
  kline: { ttl: 60000 };
  
  // 板块列表 - 5分钟
  sector: { ttl: 300000 };
  
  // 板块成分股 - 2分钟
  constituents: { ttl: 120000 };
}
```

### 7.2 请求去重

```typescript
// 相同请求在窗口期内只发送一次
interface DeduplicationConfig {
  enabled: boolean;
  windowMs: number;  // 默认 100ms
}
```

### 7.3 并发控制

```typescript
interface ConcurrencyConfig {
  // 最大并发数
  maxConcurrency: number;
  
  // 请求间隔（毫秒）
  delayBetweenRequests: number;
}
```

---

## 8. 监控与日志

### 8.1 日志格式

```typescript
interface ApiLogEntry {
  timestamp: string;
  requestId: string;
  method: string;
  endpoint: string;
  source: DataSource;
  status: 'success' | 'error' | 'timeout';
  duration: number;
  errorCode?: string;
  errorMessage?: string;
}
```

### 8.2 性能指标

```typescript
interface ApiMetrics {
  // 总请求数
  totalRequests: number;
  
  // 成功请求数
  successRequests: number;
  
  // 失败请求数
  failedRequests: number;
  
  // 平均响应时间
  avgResponseTime: number;
  
  // 各数据源成功率
  sourceSuccessRates: Record<DataSource, number>;
}
```

---

## 9. 实现文件结构

```
src/services/api/
├── client/
│   └── UnifiedApiClient.ts    # 核心客户端实现
├── types.ts                    # 类型定义
├── config.ts                   # 配置管理
├── errors.ts                   # 错误处理工具
├── compatibility.ts            # 向后兼容层
└── index.ts                    # 模块导出
```

---

## 10. 使用示例

### 10.1 基本使用

```typescript
import { unifiedApiClient, DataSource } from '@/services/api';

// GET 请求
const response = await unifiedApiClient.get<StockQuote>('/quote', {
  symbol: '600519',
});

if (response.success) {
  console.log(response.data);
} else {
  console.error(response.error);
}

// POST 请求
const postResponse = await unifiedApiClient.post('/order', {
  symbol: '600519',
  action: 'buy',
});

// 批量请求
const requests = [
  { method: 'GET' as const, endpoint: '/quote', params: { symbol: '600519' } },
  { method: 'GET' as const, endpoint: '/quote', params: { symbol: '000858' } },
];

const results = await unifiedApiClient.batch(requests);
```

### 10.2 自定义请求选项

```typescript
// 自定义超时和重试
const response = await unifiedApiClient.get('/quote', { symbol: '600519' }, {
  timeout: 15000,
  retries: 5,
  retryDelay: 2000,
  useCache: false,  // 禁用缓存
});

// 指定数据源
const response = await unifiedApiClient.get('/quote', { symbol: '600519' }, {
  source: DataSource.TENCENT,
});
```

### 10.3 错误处理

```typescript
import {
  unifiedApiClient,
  isRetryableError,
  isNetworkError,
  formatErrorMessage,
  getRecoverySuggestion,
} from '@/services/api';

const response = await unifiedApiClient.get('/quote', { symbol: '600519' });

if (!response.success) {
  const error = response.error!;
  
  // 检查错误类型
  if (isNetworkError(error)) {
    console.log('网络错误，尝试重试...');
  }
  
  if (isRetryableError(error)) {
    console.log('可重试错误');
  }
  
  // 格式化错误消息
  console.log(formatErrorMessage(error));
  
  // 获取恢复建议
  const suggestion = getRecoverySuggestion(error);
  if (suggestion) {
    console.log('建议:', suggestion);
  }
}
```

### 10.4 监控和日志

```typescript
// 获取 API 日志
const logs = unifiedApiClient.getLogs();
console.log('API Logs:', logs);

// 获取性能指标
const metrics = unifiedApiClient.getMetrics();
console.log('Metrics:', metrics);

// 获取数据源状态
const status = unifiedApiClient.getDataSourceStatus();
console.log('Data Source Status:', status);

// 测试数据源连接
const isAvailable = await unifiedApiClient.testDataSource(DataSource.EASTMONEY);
console.log('EastMoney available:', isAvailable);

// 清除缓存
unifiedApiClient.clearCache();

// 清除日志
unifiedApiClient.clearLogs();
```

### 10.5 旧代码迁移

```typescript
// 旧代码
import { fetchRealTimeData } from '@/services/stockApi';
const { data, source } = await fetchRealTimeData('600519');

// 新代码（推荐）
import { unifiedApiClient } from '@/services/api';
const response = await unifiedApiClient.get('/quote', { symbol: '600519' });

// 兼容层（临时过渡）
import { legacyApi } from '@/services/api';
const { data, source } = await legacyApi.fetchRealTimeData('600519');
```

---

## 11. 迁移计划

### 阶段 1: 部署（Week 1）
- [x] 创建统一 API 类型定义
- [x] 创建配置管理
- [x] 创建错误处理工具
- [x] 实现 UnifiedApiClient
- [x] 创建兼容层
- [ ] 部署到生产环境

### 阶段 2: 逐步迁移（Week 2-3）
- [ ] 更新 stockApi.ts 使用新客户端
- [ ] 更新 klineApi.ts 使用新客户端
- [ ] 更新 searchApi.ts 使用新客户端
- [ ] 添加 deprecation 警告

### 阶段 3: 完成迁移（Week 4）
- [ ] 移除旧版 API 函数
- [ ] 清理兼容层
- [ ] 更新文档

---

## 12. 性能基准

| 指标 | 目标 | 当前 |
|------|------|------|
| 平均响应时间 | < 500ms | - |
| 成功率 | > 99% | - |
| 缓存命中率 | > 80% | - |
| 错误恢复时间 | < 2s | - |

---

## 13. 常见问题 (FAQ)

### Q: 如何禁用缓存？
A: 在请求选项中设置 `useCache: false`

### Q: 如何指定数据源？
A: 在请求选项中设置 `source: DataSource.TENCENT`

### Q: 如何处理超时？
A: 设置 `timeout` 选项，或捕获 `TIMEOUT_ERROR` 错误

### Q: 如何添加新的数据源？
A: 在配置中添加新的 `DataSourceConfig`，实现对应的数据获取器

### Q: 兼容层会一直保留吗？
A: 不会，兼容层是临时方案，计划在 3 个版本后移除

---

## 14. 版本历史

### v3.0.0 (2026-03-19)
- ✨ 新增 UnifiedApiClient
- ✨ 新增统一错误处理
- ✨ 新增缓存管理
- ✨ 新增性能监控
- ♻️ 重构 API 模块结构
- ⚠️ 标记旧版 API 为 deprecated

### v2.0.0 (之前版本)
- 分散的 API 调用方式
- 不统一的错误处理
- 有限的缓存支持