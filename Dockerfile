# Sonata Frontend Dockerfile
# 多阶段构建优化镜像大小

# ==========================================
# 阶段1: 依赖安装
# ==========================================
FROM node:18-alpine AS deps

# 设置工作目录
WORKDIR /app

# 安装依赖（利用缓存层）
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# ==========================================
# 阶段2: 构建
# ==========================================
FROM node:18-alpine AS builder

WORKDIR /app

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# ==========================================
# 阶段3: 生产环境
# ==========================================
FROM nginx:alpine AS runner

# 安装必要的工具
RUN apk add --no-cache curl

# 复制自定义 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 创建健康检查脚本
RUN echo '#!/bin/sh\ncurl -f http://localhost:80/ || exit 1' > /healthcheck.sh && \
    chmod +x /healthcheck.sh

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD /healthcheck.sh

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
