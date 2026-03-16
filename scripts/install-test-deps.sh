#!/bin/bash
# 安装测试依赖脚本

echo "Installing test dependencies..."

# 安装前端测试依赖
npm install --save-dev \
    @types/jest \
    jest \
    jest-environment-jsdom \
    ts-jest \
    @types/supertest \
    supertest \
    identity-obj-proxy

# 安装生产依赖
npm install --save axios

echo "Test dependencies installed!"
