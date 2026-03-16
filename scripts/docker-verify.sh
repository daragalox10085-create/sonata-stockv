#!/bin/bash
# Docker 部署验证脚本

set -e

echo "================================"
echo "Sonata Docker Verification"
echo "================================"

# 检查容器状态
echo "Checking container status..."
docker-compose ps

# 等待服务启动
echo ""
echo "Waiting for services to start..."
sleep 5

# 测试前端
echo ""
echo "Testing frontend..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5179/ || echo "000")
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✓ Frontend is running on http://localhost:5179"
else
    echo "✗ Frontend check failed (status: $FRONTEND_STATUS)"
fi

# 测试后端
echo ""
echo "Testing backend..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health || echo "000")
if [ "$BACKEND_STATUS" = "200" ]; then
    echo "✓ Backend is running on http://localhost:5000"
    echo ""
    echo "Health check response:"
    curl -s http://localhost:5000/api/health | python -m json.tool 2>/dev/null || curl -s http://localhost:5000/api/health
else
    echo "✗ Backend check failed (status: $BACKEND_STATUS)"
fi

# 测试API端点
echo ""
echo "Testing API endpoints..."

# Test endpoint
TEST_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/test || echo "000")
if [ "$TEST_STATUS" = "200" ]; then
    echo "✓ /api/test is accessible"
else
    echo "✗ /api/test check failed (status: $TEST_STATUS)"
fi

# Hot sectors endpoint
HOT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/hot-sectors || echo "000")
if [ "$HOT_STATUS" = "200" ]; then
    echo "✓ /api/hot-sectors is accessible"
else
    echo "✗ /api/hot-sectors check failed (status: $HOT_STATUS)"
fi

echo ""
echo "================================"
echo "Verification complete!"
echo "================================"
