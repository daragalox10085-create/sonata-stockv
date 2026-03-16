# Sonata V2.5 - 专业级股票分析平台

[![Version](https://img.shields.io/badge/version-2.5.0-blue.svg)](https://github.com/yourusername/sonata)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Coverage](https://img.shields.io/badge/coverage->80%25-brightgreen.svg)](./coverage)

Sonata 是一款专业级股票分析平台，提供实时行情、技术分析、蒙特卡洛预测、热门板块追踪等功能。

## ✨ 核心功能

- 📊 **实时行情** - 多数据源冗余获取，100%真实数据保证
- 📈 **技术分析** - K线图、技术指标、支撑位/阻力位计算
- 🎲 **蒙特卡洛预测** - 基于几何布朗运动的价格概率分布预测
- 🔥 **热门板块** - 实时追踪市场热点板块及精选股票
- 🤖 **算法议会** - 多算法共识决策系统
- 📱 **响应式设计** - 完美适配桌面和移动设备

## 🚀 快速开始

### 环境要求

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **Python**: >= 3.9 (后端服务)
- **Docker**: >= 20.0 (可选，用于容器化部署)

### 安装步骤

#### 1. 克隆仓库

```bash
git clone https://github.com/yourusername/sonata.git
cd sonata
```

#### 2. 安装前端依赖

```bash
npm install
```

#### 3. 安装后端依赖

```bash
cd backend
pip install -r requirements.txt
cd ..
```

#### 4. 启动开发服务器

```bash
# 启动前端（端口5179）
npm run dev

# 启动后端（端口5000）
cd backend
python app.py
```

#### 5. 访问应用

打开浏览器访问: http://localhost:5179

## 🐳 Docker 部署

### 使用 Docker Compose（推荐）

```bash
# 一键启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 手动构建

```bash
# 构建前端镜像
docker build -t sonata-frontend:latest .

# 构建后端镜像
docker build -t sonata-backend:latest -f backend/Dockerfile backend/

# 运行容器
docker run -d -p 5179:5179 sonata-frontend:latest
docker run -d -p 5000:5000 sonata-backend:latest
```

## 📚 文档

- [API文档](./docs/API.md) - RESTful API 接口说明
- [配置说明](./docs/CONFIG.md) - 环境变量和配置项说明
- [部署指南](./docs/DEPLOYMENT.md) - 生产环境部署指南
- [测试报告](./coverage/lcov-report/index.html) - 单元测试覆盖率报告

## 🧪 测试

### 运行单元测试

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 持续监听模式
npm run test:watch
```

### 后端 API 测试

```bash
cd backend
pytest __tests__/api.test.py -v
```

## 📁 项目结构

```
sonata/
├── src/                    # 前端源代码
│   ├── components/         # React 组件
│   ├── services/           # 业务逻辑服务
│   ├── utils/              # 工具函数
│   ├── hooks/              # 自定义 Hooks
│   ├── types/              # TypeScript 类型定义
│   └── __tests__/          # 单元测试
├── backend/                # Python Flask 后端
│   ├── app.py              # 主应用入口
│   ├── requirements.txt    # Python 依赖
│   └── __tests__/          # API 测试
├── docs/                   # 文档
├── docker-compose.yml      # Docker Compose 配置
├── Dockerfile              # 前端 Docker 镜像
└── README.md               # 本文件
```

## 🔧 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NODE_ENV` | 运行环境 | `development` |
| `VITE_API_BASE_URL` | 后端 API 地址 | `http://localhost:5000` |
| `PORT` | 后端服务端口 | `5000` |
| `FRONTEND_PORT` | 前端服务端口 | `5179` |

### 前端配置

编辑 `src/config/stock.config.ts` 修改股票相关配置：

```typescript
export const STOCK_CONFIG = {
  // 默认股票代码
  DEFAULT_STOCK_CODE: '000001',
  // 缓存时间（毫秒）
  CACHE_TTL: 60000,
  // 刷新间隔
  REFRESH_INTERVAL: 30000
};
```

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 [MIT](LICENSE) 许可证。

## 🙏 致谢

- 数据来源：[东方财富](https://www.eastmoney.com/)、[腾讯财经](https://finance.qq.com/)
- 图表库：[ECharts](https://echarts.apache.org/)
- UI组件：[Lucide React](https://lucide.dev/)

---

**Sonata V2.5** - 专业投资，从数据开始
