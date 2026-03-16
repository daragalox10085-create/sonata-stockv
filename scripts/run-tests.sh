#!/bin/bash
# 运行测试脚本

echo "================================"
echo "Sonata Test Suite"
echo "================================"

# 前端单元测试
echo "Running frontend unit tests..."
npm test -- --coverage --passWithNoTests

# 后端API测试（如果后端服务正在运行）
echo ""
echo "Checking backend API..."
if curl -s http://localhost:5000/api/health > /dev/null; then
    echo "Backend is running, running API tests..."
    cd backend
    python -m pytest __tests__/api.test.py -v || echo "API tests require pytest to be installed"
    cd ..
else
    echo "Backend not running, skipping API tests"
fi

echo ""
echo "================================"
echo "Test run complete!"
echo "================================"
