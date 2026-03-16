#!/bin/bash
# Docker 构建脚本

set -e

echo "================================"
echo "Sonata Docker Build"
echo "================================"

# 构建前端镜像
echo "Building frontend image..."
docker build -t sonata-frontend:latest .

# 构建后端镜像
echo ""
echo "Building backend image..."
docker build -t sonata-backend:latest -f backend/Dockerfile backend/

echo ""
echo "================================"
echo "Build complete!"
echo ""
echo "Images created:"
echo "  - sonata-frontend:latest"
echo "  - sonata-backend:latest"
echo ""
echo "To run: docker-compose up -d"
echo "================================"
