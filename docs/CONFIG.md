# Sonata 配置说明文档

本文档详细说明 Sonata 股票分析平台的所有配置项。

## 📋 环境变量

### 前端环境变量

创建 `.env` 文件在项目根目录：

```bash
# .env

# 运行环境
NODE_ENV=development

# API 基础地址
VITE_API_BASE_URL=http://localhost:5000

# 前端端口（开发模式）
VITE_PORT=5179

# 是否启用 Mock 数据
VITE_ENABLE_MOCK=false

# 日志级别: debug | info | warn | error
VITE_LOG_LEVEL=info
```

### 后端环境变量

创建 `.env` 文件在 `backend/` 目录：

```bash
# backend/.env

# 服务端口
PORT=5000

# Flask 环境: development | production
FLASK_ENV=development

# 调试模式
FLASK_DEBUG=false

# 日志级别
LOG_LEVEL=INFO

# 请求超时（秒）
REQUEST_TIMEOUT=10

# 缓存目录
CACHE_DIR=./cache

# 是否启用缓存
ENABLE_CACHE=true

# 热门板块缓存时间（秒）
HOT_SECTORS_CACHE_TTL=604800

# 股票数据缓存时间（秒）
STOCK_DATA_CACHE_TTL=3600
```

---

## ⚙️ 配置文件

### 前端配置

#### `src/config/stock.config.ts`

```typescript
export const STOCK_CONFIG = {
  // 默认股票代码
  DEFAULT_STOCK_CODE: '000001',
  
  // 默认市场
  DEFAULT_MARKET: 'sz',
  
  // 缓存时间（毫秒）
  CACHE_TTL: {
    QUOTE: 60000,        // 行情数据：1分钟
    KLINE: 300000,       // K线数据：5分钟
    SECTOR: 604800000,   // 板块数据：7天
    MONTE_CARLO: 3600000 // 蒙特卡洛：1小时
  },
  
  // 自动刷新间隔（毫秒）
  REFRESH_INTERVAL: {
    QUOTE: 30000,    // 行情：30秒
    SECTOR: 3600000  // 板块：1小时
  },
  
  // 蒙特卡洛配置
  MONTE_CARLO: {
    SIMULATIONS: 10000,  // 模拟次数
    DAYS: 7,             // 预测天数
    CONFIDENCE_LEVEL: 0.90 // 置信水平
  },
  
  // 图表配置
  CHART: {
    DEFAULT_DAYS: 60,    // 默认显示天数
    COLORS: {
      UP: '#FF6B00',     // 上涨颜色
      DOWN: '#00B894',   // 下跌颜色
      NEUTRAL: '#999999' // 中性颜色
    }
  }
};
```

#### `src/constants/config.ts`

```typescript
// API 配置
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  TIMEOUT: 30000,
  RETRY_COUNT: 3,
  RETRY_DELAY: 1000
};

// 股票代码前缀映射
export const MARKET_PREFIXES = {
  SH: ['600', '601', '603', '605', '688'],  // 沪市
  SZ: ['000', '001', '002', '003', '300', '301'], // 深市
  ETF: ['510', '511', '512', '513', '515', '516', '518', '519', '520', '521', '522']
};

// 六因子权重配置
export const FACTOR_WEIGHTS = {
  VALUATION: 0.30,   // 估值
  GROWTH: 0.20,      // 成长
  SCALE: 0.10,       // 规模
  MOMENTUM: 0.15,    // 动量
  QUALITY: 0.10,     // 质量
  SUPPORT: 0.15      // 支撑
};

// 共识阈值
export const CONSENSUS_THRESHOLDS = {
  HIGH: 0.7,    // 高度共识
  MEDIUM: 0.5,  // 中等共识
  LOW: 0.3      // 低度共识
};
```

---

### 后端配置

#### `backend/config.py`

```python
import os

class Config:
    """基础配置"""
    
    # Flask 配置
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key-here'
    
    # 数据库配置（如需要）
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # 缓存配置
    CACHE_TYPE = 'simple'
    CACHE_DEFAULT_TIMEOUT = 3600
    
    # API 配置
    API_PREFIX = '/api'
    
    # 数据源优先级
    DATA_SOURCES = [
        'eastmoney',  # 东方财富（首选）
        'tencent',    # 腾讯财经
        'sina',       # 新浪财经
        '163',        # 网易财经
        'akshare'     # AkShare
    ]
    
    # 请求配置
    REQUEST_TIMEOUT = int(os.environ.get('REQUEST_TIMEOUT', 10))
    
    # 日志配置
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    
    # CORS 配置
    CORS_ORIGINS = [
        'http://localhost:5179',
        'http://localhost:3000',
        'http://127.0.0.1:5179'
    ]


class DevelopmentConfig(Config):
    """开发环境配置"""
    DEBUG = True
    LOG_LEVEL = 'DEBUG'


class ProductionConfig(Config):
    """生产环境配置"""
    DEBUG = False
    LOG_LEVEL = 'WARNING'
    
    # 生产环境 CORS
    CORS_ORIGINS = [
        'https://your-domain.com',
        'https://app.your-domain.com'
    ]


class TestingConfig(Config):
    """测试环境配置"""
    TESTING = True
    DEBUG = True
    
    # 测试使用 Mock 数据
    USE_MOCK_DATA = True


# 配置映射
config_map = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
```

---

## 🔧 高级配置

### Vite 配置

#### `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  
  // 开发服务器配置
  server: {
    port: 5179,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  },
  
  // 构建配置
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'echarts': ['echarts'],
          'vendor': ['react', 'react-dom']
        }
      }
    }
  },
  
  // 路径别名
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  
  // CSS 配置
  css: {
    postcss: './postcss.config.js'
  }
});
```

### Tailwind CSS 配置

#### `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF6B00',
          dark: '#E55A00',
          light: '#FF8533'
        },
        success: '#00B894',
        warning: '#FDCB6E',
        danger: '#FF7675',
        info: '#74B9FF'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
```

### Jest 配置

#### `jest.config.js`

```javascript
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

---

## 🐳 Docker 配置

### `docker-compose.yml` 环境变量

```yaml
version: '3.8'

services:
  frontend:
    environment:
      - NODE_ENV=production
      - VITE_API_BASE_URL=http://backend:5000
    
  backend:
    environment:
      - FLASK_ENV=production
      - PORT=5000
      - LOG_LEVEL=WARNING
      - ENABLE_CACHE=true
```

### Dockerfile 构建参数

```dockerfile
# 前端 Dockerfile
ARG NODE_VERSION=18
ARG APP_ENV=production

# 后端 Dockerfile
ARG PYTHON_VERSION=3.11
ARG FLASK_ENV=production
```

---

## 📊 性能调优

### 前端优化

```typescript
// src/config/performance.config.ts
export const PERFORMANCE_CONFIG = {
  // 虚拟滚动阈值
  VIRTUAL_SCROLL_THRESHOLD: 100,
  
  // 防抖延迟（毫秒）
  DEBOUNCE_DELAY: 300,
  
  // 节流延迟（毫秒）
  THROTTLE_DELAY: 100,
  
  // 图片懒加载偏移
  LAZY_LOAD_OFFSET: 200,
  
  // 预加载路由
  PRELOAD_ROUTES: ['/analysis', '/sectors'],
  
  // 组件懒加载
  LAZY_COMPONENTS: [
    'MonteCarloPanel',
    'HotSectorsPanel',
    'StockChart'
  ]
};
```

### 后端优化

```python
# backend/config.py

# 连接池配置
CONNECTION_POOL_SIZE = 10
CONNECTION_MAX_OVERFLOW = 20

# 缓存配置
CACHE_CONFIG = {
    'CACHE_TYPE': 'redis',
    'CACHE_REDIS_URL': 'redis://localhost:6379/0',
    'CACHE_DEFAULT_TIMEOUT': 3600
}

# 限流配置
RATE_LIMIT = {
    'DEFAULT': '100/minute',
    'STOCK_API': '60/minute',
    'MONTE_CARLO': '30/minute'
}
```

---

## 🔒 安全配置

### 前端安全

```typescript
// src/config/security.config.ts
export const SECURITY_CONFIG = {
  // CSP 配置
  CSP_DIRECTIVES: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:'],
    'connect-src': ["'self'", 'https://*.eastmoney.com']
  },
  
  // 敏感关键词过滤
  SENSITIVE_KEYWORDS: ['password', 'token', 'secret'],
  
  // XSS 防护
  SANITIZE_OPTIONS: {
    allowedTags: ['b', 'i', 'em', 'strong', 'a'],
    allowedAttributes: {
      'a': ['href', 'target']
    }
  }
};
```

### 后端安全

```python
# backend/config.py

# CORS 安全
CORS_CONFIG = {
    'origins': ['https://your-domain.com'],
    'methods': ['GET', 'POST'],
    'allow_headers': ['Content-Type', 'Authorization'],
    'supports_credentials': True
}

# 请求限制
REQUEST_LIMITS = {
    'max_content_length': 16 * 1024 * 1024,  # 16MB
    'max_form_memory_size': 1024 * 1024       # 1MB
}

# API 密钥（如需要）
API_KEYS = {
    'EASTMONEY': os.environ.get('EASTMONEY_API_KEY'),
    'TENCENT': os.environ.get('TENCENT_API_KEY')
}
```

---

## 📝 配置检查清单

部署前请确认以下配置：

- [ ] `.env` 文件已创建并配置正确
- [ ] 后端 `PORT` 与前端的 `VITE_API_BASE_URL` 匹配
- [ ] `NODE_ENV` / `FLASK_ENV` 设置为正确的环境
- [ ] 生产环境已禁用调试模式
- [ ] CORS 配置包含正确的域名
- [ ] 缓存配置已根据需求调整
- [ ] 日志级别设置正确
- [ ] 敏感信息（API密钥等）使用环境变量

---

## 🆘 故障排除

### 常见问题

#### 前端无法连接后端

检查 `VITE_API_BASE_URL` 是否指向正确的后端地址。

#### CORS 错误

确保后端 `CORS_ORIGINS` 包含前端域名。

#### 缓存不生效

检查 `ENABLE_CACHE` 是否设置为 `true`，以及缓存目录权限。

#### 测试失败

确保 `NODE_ENV` 不是 `production`，或检查测试配置。

---

**注意**: 生产环境部署前，请务必修改默认的 `SECRET_KEY` 和其他敏感配置！
