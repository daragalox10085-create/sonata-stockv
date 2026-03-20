#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
新浪财经 API 测试套件
覆盖：/api/sina/quote
"""

import pytest
from .test_client import APITestClient, TestStatus
from .config import BASE_URL, API_ENDPOINTS, TEST_SYMBOLS, TIMEOUT_CONFIG


class TestSinaQuote:
    """新浪财经实时行情 API 测试"""
    
    @pytest.fixture
    def client(self):
        return APITestClient(BASE_URL, timeout=TIMEOUT_CONFIG['default'])
    
    def test_quote_normal_sh(self, client):
        """测试正常 A 股上海行情 (sh600519)"""
        response, duration_ms = client.request(
            'GET', API_ENDPOINTS['sina_quote'],
            params={'symbol': 'sh600519'}
        )
        assert response.status_code == 200
        # 新浪返回 JavaScript 变量格式
        assert 'sh600519' in response.text or '贵州茅台' in response.text
    
    def test_quote_normal_sz(self, client):
        """测试正常 A 股深圳行情 (sz002594)"""
        response, _ = client.request(
            'GET', API_ENDPOINTS['sina_quote'],
            params={'symbol': 'sz002594'}
        )
        assert response.status_code == 200
    
    def test_quote_multiple_stocks(self, client):
        """测试多只股票同时查询"""
        response, _ = client.request(
            'GET', API_ENDPOINTS['sina_quote'],
            params={'symbol': 'sh600519,sz002594'}
        )
        assert response.status_code == 200
    
    def test_quote_index(self, client):
        """测试指数行情"""
        response, _ = client.request(
            'GET', API_ENDPOINTS['sina_quote'],
            params={'symbol': 'sh000001'}
        )
        assert response.status_code == 200
    
    def test_quote_etf(self, client):
        """测试 ETF 行情"""
        response, _ = client.request(
            'GET', API_ENDPOINTS['sina_quote'],
            params={'symbol': 'sh513310'}
        )
        assert response.status_code == 200
    
    def test_quote_invalid_symbol(self, client):
        """测试无效股票代码"""
        response, _ = client.request(
            'GET', API_ENDPOINTS['sina_quote'],
            params={'symbol': 'INVALID'}
        )
        assert response.status_code in [200, 404]
    
    def test_quote_missing_symbol(self, client):
        """测试缺少股票代码参数"""
        response, _ = client.request('GET', API_ENDPOINTS['sina_quote'])
        assert response.status_code in [200, 400]
    
    def test_quote_empty_symbol(self, client):
        """测试空股票代码"""
        response, _ = client.request(
            'GET', API_ENDPOINTS['sina_quote'],
            params={'symbol': ''}
        )
        assert response.status_code in [200, 400]
    
    def test_quote_response_format(self, client):
        """测试响应格式"""
        response, _ = client.request(
            'GET', API_ENDPOINTS['sina_quote'],
            params={'symbol': 'sh600519'}
        )
        assert response.status_code == 200
        # 检查是否包含预期字段 (开盘、收盘、最高、最低等)
        text = response.text
        # 新浪格式：var hq_str_sh600519="名称，开盘，收盘，当前，最高，最低，..."
        assert 'hq_str_' in text
    
    def test_quote_special_chars(self, client):
        """测试特殊字符"""
        response, _ = client.request(
            'GET', API_ENDPOINTS['sina_quote'],
            params={'symbol': 'sh600519<script>'}
        )
        # 应该安全处理
        assert response.status_code in [200, 400, 404]
