# Sonata V2.5 运维能力文档

## 概述

本版本实现了完整的健康检查、容错和限流机制，确保服务稳定性和第三方API的可靠访问。

## 功能模块

### 1. 健康检查 (health.py)

#### /api/health 接口

返回完整的健康状态信息：

```json
{
  "status": "healthy|degraded|unhealthy",
  "version": "2.5.0",
  "uptime": "1h 30m 45s",
  "uptime_seconds": 5445,
  "timestamp": "2026-03-16T20:30:00",
  "apis": {
    "eastmoney": {
      "status": "healthy",
      "response_time_ms": 156.32,
      "last_check": "2026-03-16T20:29:55"
    },
    "tencent": {
      "status": "healthy",
      "response_time_ms": 89.45,
      "last_check": "2026-03-16T20:29:55"
    }
  },
  "rate_limiting": {
    "ip": {
      "allowed": true,
      "remaining": 28,
      "client_ip": "127.0.0.1"
    },
    "user_limiter": {
      "current_requests": 5,
      "max_requests": 100,
      "remaining": 95,
      "window_seconds": 60
    }
  },
  "circuit_breakers": {
    "eastmoney": {
      "state": "closed",
      "failure_count": 0,
      "success_count": 0
    },
    "tencent": {
      "state": "closed",
      "failure_count": 0,
      "success_count": 0
    }
  }
}
```

### 2. 容错与限流 (rate_limiter.py)

#### 2.1 指数退避重试机制 (ExponentialBackoff)

- **最大重试次数**: 3次
- **基础延迟**: 1秒
- **最大延迟**: 60秒
- **指数基数**: 2
- **抖动**: 20%随机抖动避免同步重试

#### 2.2 API客户端 (APIClientWithRetry)

自动重试的HTTP客户端：
- GET请求自动重试
- POST请求自动重试
- 超时设置：5秒

#### 2.3 限流器 (RateLimiter)

**请求频率限制**:
- 每秒10次请求

**IP限流**:
- 每60秒30次请求

**用户限流**:
- 每60秒100次请求

#### 2.4 熔断器 (CircuitBreaker)

**配置**:
- 失败阈值: 5次
- 恢复超时: 30秒
- 成功阈值: 3次（半开状态恢复）

**状态**:
- `closed`: 正常状态
- `open`: 熔断状态
- `half_open`: 半开状态（测试恢复）

## API端点限流配置

| 端点 | 限流策略 | 限制 |
|------|----------|------|
| /api/stock-analysis | IP限流 | 60秒30次 |
| /api/hot-sectors | IP限流 | 60秒30次 |
| /api/stock/{code}/monte-carlo | IP限流 | 60秒30次 |
| /api/health | 无限制 | - |
| /api/test | 无限制 | - |

## 响应头

限流保护的端点会返回以下响应头：

```
X-RateLimit-Remaining: 28
```

## 限流错误响应

当请求超过限制时：

```json
{
  "error": "请求过于频繁，请稍后再试",
  "retry_after": 45
}
```

HTTP状态码: 429 (Too Many Requests)

## 熔断保护

东方财富和腾讯API都有独立的熔断器保护：

1. 连续5次失败触发熔断
2. 熔断后30秒内拒绝请求
3. 30秒后进入半开状态
4. 连续3次成功后恢复关闭状态

## 降级策略

当API熔断时，系统会自动切换到备用数据源：

1. 东方财富 (主)
2. 腾讯 (备用1)
3. 新浪财经 (备用2)
4. 网易财经 (备用3)
5. AkShare (备用4)

## 监控建议

建议定期监控以下指标：

1. **健康检查**: 定期调用 `/api/health`
2. **API响应时间**: 关注 `response_time_ms`
3. **熔断状态**: 监控 `circuit_breakers` 状态
4. **限流命中率**: 监控 429 错误率

## 故障排查

### API返回503
- 检查第三方API状态
- 查看熔断器是否触发

### API返回429
- 客户端请求过于频繁
- 检查限流配置

### 数据获取失败
- 查看服务器日志
- 检查熔断器状态
- 验证网络连接
