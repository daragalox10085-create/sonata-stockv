# Sonata 模块 API 调用统一重构报告

**日期**: 2026-03-19  
**重构目标**: 统一所有模块的 API 调用，使用统一的 ApiClient 客户端

---

## 重构概览

### 重构的模块

| 模块 | 文件 | 重构内容 | 状态 |
|------|------|----------|------|
| SectorService | `src/services/SectorService.ts` | 使用 ApiClient 替代直接 fetch | ✅ 完成 |
| KLine API | `src/services/klineApi.ts` | 使用 ApiClient 替代直接 fetch | ✅ 完成 |
| TechnicalService | `src/services/TechnicalService.ts` | 统一错误处理和日志 | ✅ 完成 |
| UnifiedStockDataService | `src/services/UnifiedStockDataService.ts` | 验证并统一使用 ApiClient | ✅ 完成 |
| Stock API | `src/services/stockApi.ts` | 使用 ApiClient 替代直接 fetch | ✅ 完成 |

---

## 重构详情

### 1. SectorService.ts

**重构前**:
- 直接使用 `fetch()` 调用 API
- 硬编码 URL 和参数
- 重复的重试逻辑

**重构后**:
```typescript
// 使用统一 API 客户端
const response: ApiResponse<any> = await apiClient.getWithRetry(url, {
  timeout: 10000,
  retries: 3,
  retryDelay: 1000
});

// 统一错误处理
if (!response.success || !response.data?.data?.diff) {
  throw new AppError(ErrorCode.API_ERROR, response.error || '获取板块数据失败');
}
```

**改进**:
- ✅ 移除重复的 fetch 逻辑
- ✅ 使用统一的重试机制
- ✅ 统一的错误处理
- ✅ 使用 logger 替代 console

---

### 2. klineApi.ts

**重构前**:
- 多个独立的 fetch 函数
- 重复的超时和错误处理逻辑
- 硬编码的 API 配置

**重构后**:
```typescript
// 统一的 API 调用
const response: ApiResponse<any> = await apiClient.getWithRetry(url, {
  timeout: config.timeout,
  retries: 3,
  retryDelay: 1000
});

// 统一的数据验证
if (!validateKLineData(response.data)) {
  logger.warn(`[KLine API] 数据格式无效`, { symbol });
  return null;
}
```

**改进**:
- ✅ 使用 ApiClient 统一请求
- ✅ 统一的数据验证函数
- ✅ 统一的日志记录
- ✅ 多源回退策略保持不变

---

### 3. TechnicalService.ts

**重构前**:
- 纯计算逻辑，无统一错误处理
- 使用 console 输出日志

**重构后**:
```typescript
// 统一错误处理
analyzeTechnical(klineData: KLineData[], currentPrice: number): TechnicalAnalysis {
  try {
    if (!klineData || klineData.length === 0) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'K 线数据为空');
    }
    // ... 计算逻辑
  } catch (error) {
    logger.error('[TechnicalService] 技术分析失败', error);
    throw error instanceof AppError ? error : new AppError(ErrorCode.UNKNOWN_ERROR, '技术分析失败');
  }
}
```

**改进**:
- ✅ 添加输入验证
- ✅ 使用 AppError 统一错误类型
- ✅ 使用 logger 替代 console
- ✅ 保持原有计算逻辑不变

---

### 4. UnifiedStockDataService.ts

**重构前**:
- 已部分使用 ApiClient
- 但存在不一致的调用方式

**重构后**:
```typescript
// 统一使用 apiClient.get()
const response: ApiResponse<any> = await apiClient.get(url, { timeout });

if (!response.success || !response.data) return null;

return parseEastmoneyQuote(symbol, response.data);
```

**改进**:
- ✅ 统一所有 API 调用使用 apiClient.get()
- ✅ 移除直接 fetch 调用
- ✅ 统一的响应处理
- ✅ 保持 3 级回退策略

---

### 5. stockApi.ts

**重构前**:
- 直接使用 fetch() 调用
- 重复的超时处理逻辑
- 多个独立的错误处理

**重构后**:
```typescript
// 统一的请求函数
async function fetchFromSource<T>(
  url: string, name: string, timeout: number,
  parser: (symbol: string, response: any) => T | null,
  symbol: string
): Promise<T | null> {
  const response: ApiResponse<any> = await apiClient.get(url, { timeout });
  if (!response.success || !response.data) return null;
  return parser(symbol, response.data);
}

// 使用统一请求函数
const tencentData = await fetchFromSource(
  API_CONFIG.TENCENT.buildUrl(symbol),
  API_CONFIG.TENCENT.name,
  API_CONFIG.TENCENT.timeout,
  parseTencentResponse,
  symbol
);
```

**改进**:
- ✅ 使用统一的请求函数
- ✅ 移除重复的 fetch 逻辑
- ✅ 统一的错误处理
- ✅ 保持 3 级回退策略

---

## 统一错误处理

所有模块现在使用统一的错误处理模式:

```typescript
import { AppError, ErrorCode } from '../utils/errors';
import { logger } from '../utils/logger';

try {
  // API 调用
  const response = await apiClient.get(url);
  
  if (!response.success) {
    throw new AppError(ErrorCode.API_ERROR, response.error);
  }
  
  return response.data;
} catch (error) {
  logger.error('[Module] 操作失败', error);
  throw error instanceof AppError ? error : new AppError(ErrorCode.UNKNOWN_ERROR, '操作失败');
}
```

---

## 统一日志记录

所有模块现在使用统一的 logger:

```typescript
import { logger } from '../utils/logger';

// 信息日志
logger.info('[Service] 操作成功', { symbol, duration });

// 警告日志
logger.warn('[Service] 操作失败，使用备用方案', { symbol, error });

// 错误日志
logger.error('[Service] 操作异常', error, { symbol });
```

---

## 验证结果

### 构建验证
```bash
npm run build
```
**结果**: ✅ 构建成功

### 代码检查
- ✅ 所有模块使用 ApiClient
- ✅ 无直接 fetch 调用（除 ApiClient 内部）
- ✅ 统一错误处理
- ✅ 统一日志记录

---

## 收益

1. **代码复用**: 移除重复的 fetch、超时、重试逻辑
2. **一致性**: 所有模块使用相同的错误处理和日志格式
3. **可维护性**: 集中管理 API 配置和错误处理
4. **可测试性**: 统一的接口便于 Mock 和测试
5. **可扩展性**: 新增 API 调用只需使用 apiClient

---

## 后续建议

1. **添加单元测试**: 为每个服务的错误处理添加测试
2. **监控集成**: 考虑将 logger 连接到监控服务
3. **性能优化**: 考虑添加请求去重和缓存层
4. **文档更新**: 更新 API 文档说明新的调用方式

---

**重构完成时间**: 2026-03-19  
**重构负责人**: Sonata Team  
**验证状态**: ✅ 通过
