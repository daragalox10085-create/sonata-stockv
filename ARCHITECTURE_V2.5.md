# Sonata V2.5 架构重构文档

## 概述

本文档描述了 Sonata V2.5 版本的架构重构，主要目标是实现配置集中管理和代码模块化。

## 架构变更

### 1. 配置集中管理

#### 1.1 配置文件结构
```
src/config/
├── index.ts          # 主配置入口
├── api.config.ts     # API配置
└── app.config.ts     # 应用配置
```

#### 1.2 环境变量文件
```
.env.development     # 开发环境配置
.env.production      # 生产环境配置
.env.test           # 测试环境配置
```

#### 1.3 配置特性
- **多环境支持**: 自动根据 `VITE_APP_ENV` 加载对应配置
- **类型安全**: 所有配置都有 TypeScript 类型定义
- **环境特定覆盖**: 基础配置 + 环境特定配置合并
- **敏感信息隔离**: API keys 和连接字符串通过环境变量管理

### 2. 代码模块化

#### 2.1 数据获取模块
```
src/services/data-fetchers/
├── index.ts              # 模块入口
├── types.ts              # 类型定义
├── base.fetcher.ts       # 基类
├── tencent.fetcher.ts    # 腾讯财经获取器
├── eastmoney.fetcher.ts  # 东方财富获取器
└── sina.fetcher.ts       # 新浪财经获取器
```

**特性**:
- 统一的数据获取接口 `DataFetcher`
- 基类提供通用功能：缓存、重试、超时、日志
- 工厂模式创建获取器实例
- 优先级故障转移机制

#### 2.2 数据处理模块
```
src/services/data-processors/
├── index.ts              # 模块入口
├── types.ts              # 类型定义
├── base.processor.ts     # 基类
├── stock.processor.ts    # 股票数据处理器
├── kline.processor.ts    # K线数据处理器
└── sector.processor.ts   # 板块数据处理器
```

**特性**:
- 统一的数据处理接口 `DataProcessor`
- 数据验证、清洗、标准化流程
- 数据质量报告生成
- 技术指标计算（MA、RSI、MACD、布林带）

#### 2.3 缓存模块
```
src/services/cache/
├── index.ts                  # 模块入口
├── CacheManager.ts           # 内存缓存管理器
├── RequestDeduplicator.ts    # 请求去重器
└── ThrottleDebounce.ts       # 防抖节流工具
```

**特性**:
- LRU 淘汰策略
- TTL 过期机制
- 请求去重（防止重复请求）
- 防抖节流（优化高频操作）
- 请求队列（控制并发）

### 3. 依赖注入

#### 3.1 DI 容器
```
src/di/
├── index.ts       # 模块入口
├── container.ts   # DI容器实现
└── providers.ts   # 服务注册
```

**特性**:
- 服务定位器模式
- 单例/瞬态生命周期管理
- 装饰器支持 `@Inject`、`@Injectable`
- 作用域管理

### 4. 性能监控

```
src/utils/performance.ts
```

**特性**:
- 自动性能指标收集
- 装饰器 `@measurePerformance`
- 慢查询分析
- 性能报告导出

## 使用指南

### 使用配置

```typescript
import { config, apiConfig, appConfig, IS_DEV } from './config';

// 访问配置
const timeout = apiConfig.defaultTimeout;
const hotSectorsConfig = appConfig.stockAnalysis.hotSectors;
```

### 使用数据获取器

```typescript
import { DataFetcherFactory, PriorityDataFetcher } from './services/data-fetchers';

// 获取特定获取器
const tencentFetcher = DataFetcherFactory.getFetcher('tencent');
const quote = await tencentFetcher.fetchStockQuote('600519');

// 使用优先级获取器（自动故障转移）
const priorityFetcher = new PriorityDataFetcher();
const result = await priorityFetcher.fetchWithFallback(
  fetcher => fetcher.fetchStockQuote('600519')
);
```

### 使用数据处理器

```typescript
import { DataProcessorFactory } from './services/data-processors';

// 获取处理器
const stockProcessor = DataProcessorFactory.getProcessor('stock');
const result = stockProcessor.process(quoteData);
```

### 使用缓存

```typescript
import { getCacheManager, getRequestDeduplicator } from './services/cache';

// 缓存数据
const cache = getCacheManager();
cache.set('key', value, 60000);
const value = cache.get('key');

// 请求去重
const dedup = getRequestDeduplicator();
const result = await dedup.execute('unique-key', () => fetchData());
```

### 使用依赖注入

```typescript
import { container, Inject } from './di';

// 直接解析
const cacheManager = container.resolve('cacheManager');

// 装饰器注入
class MyService {
  @Inject('cacheManager')
  private cache!: MemoryCacheManager;
}
```

### 性能监控

```typescript
import { performanceMonitor, measurePerformance } from './utils/performance';

// 手动监控
performanceMonitor.startTimer('operation');
// ... 执行操作
performanceMonitor.endTimer('operation');

// 装饰器监控
class MyService {
  @measurePerformance('fetchData')
  async fetchData() {
    // ...
  }
}
```

## 性能优化

### 1. 数据缓存
- 内存缓存，TTL 过期
- 30-120 秒缓存时间（根据环境）
- LRU 淘汰策略

### 2. 请求去重
- 5 秒窗口期
- 自动合并相同请求
- 减少重复网络请求

### 3. 防抖节流
- 输入防抖：300ms
- 请求节流：100ms
- 优化高频操作

### 4. 并发控制
- 最大并发请求数：5（生产环境）
- 请求队列管理
- 防止请求风暴

## 向后兼容

所有原有服务仍然可用：
- `UnifiedStockDataService`
- `ApiClient`
- `stockApi`

新架构通过服务包装器提供增强功能，同时保持原有 API 不变。

## 目录结构

```
src/
├── config/                 # 配置管理
│   ├── index.ts
│   ├── api.config.ts
│   └── app.config.ts
├── di/                     # 依赖注入
│   ├── index.ts
│   ├── container.ts
│   └── providers.ts
├── services/
│   ├── cache/              # 缓存模块
│   │   ├── index.ts
│   │   ├── CacheManager.ts
│   │   ├── RequestDeduplicator.ts
│   │   └── ThrottleDebounce.ts
│   ├── data-fetchers/      # 数据获取模块
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── base.fetcher.ts
│   │   ├── tencent.fetcher.ts
│   │   ├── eastmoney.fetcher.ts
│   │   └── sina.fetcher.ts
│   ├── data-processors/    # 数据处理模块
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── base.processor.ts
│   │   ├── stock.processor.ts
│   │   ├── kline.processor.ts
│   │   └── sector.processor.ts
│   └── index.ts            # 服务入口
├── utils/
│   └── performance.ts      # 性能监控
└── ...
```

## 总结

本次重构实现了：
1. ✅ 配置集中管理（多环境支持）
2. ✅ 代码模块化（数据获取/处理分离）
3. ✅ 统一模块间接口（依赖注入）
4. ✅ 数据缓存（TTL + LRU）
5. ✅ 请求去重（防抖节流）
6. ✅ 性能监控（自动收集指标）

架构更加清晰，可维护性和可测试性显著提升。
