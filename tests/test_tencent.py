#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
腾讯财经 API 测试套件
覆盖：/api/tencent/quote, /api/tencent/kline
"""

import pytest
from .test_client import APITestClient, TestStatus
from .config import BASE_URL, API_ENDPOINTS, TEST_SYMBOLS, TIMEOUT_CONFIG


class TestTencentQuote:
    """腾讯财经实时行情 API 测试"""
    
    @pytest.fixture
    def client(self):
        return APITestClient(BASE_URL, timeout=TIMEOUT_CONFIG['default'])
    
    def test_quote_normal_sh(self, client):
        """测试正常 A 股上海行情 (sh600519)"""
        response, duration_ms = client.request(
            'GET', API_ENDPOINTS['tencent_quote'],
            params={'q': 'sh600519'}
        )
        assert response.status_code == 200
        # 腾讯返回 JavaScript 变量格式
        assert 'v_sh600519' in response.text or '贵州茅台' in response.text
    
    def test_quote_normal_sz(self, client):
        """测试正常 A 股深圳行情 (sz002594)"""
        response, _ = client.request(
            'GET', API_ENDPOINTS['tencent_quote'],
            params={'q': 'sz002594'}
        )
        assert response.status_code == 200
        assert 'v_sz002594' in response.text or '比亚迪' in response.text
    
    def test_quote_hk_stock(self, client):
        """测试港股行情 (00700)"""
        response, _ = client.request(
            'GET', API_ENDPOINTS['tencent_quote'],
            params={'q': 'hk00700'}
        )
        assert response.status_code == 200
        assert 'v_hk00700' in response.text or '腾讯控股' in response.text
    
    def test_quote_multiple_stocks(self, client):
        """测试多只股票同时查询"""
        response, _ = client.request(
            'GET', API_ENDPOINTS['tencent_quote'],
            params={'q': 'sh600519,sz002594,hk00700'}
        )
        assert response.status_code == 200
        assert 'v_sh600519' in response.text
        assert 'v_sz002594' in response.text
    
    def test_quote_invalid_symbol(self, client):
        """测试无效股票代码"""
        response, _ = client.request(
            'GET', API_ENDPOINTS['tencent_quote'],
            params={'q': 'INVALID'}
        )
        assert response.status_code in [200, 404]
    
    def test_quote_missing_symbol(self, client):
        """测试缺少股票代码参数"""
        response, _ = client.request('GET', API_ENDPOINTS['tencent_quote'])
        assert response.status_code in [200, 400]
    
    def test_quote_empty_symbol(self, client):
        """测试空股票代码"""
        response, _ = client.request(
            'GET', API_ENDPOINTS['tencent_quote'],
            params={'q': ''}
        )
        assert response.status_code in [200, 400]
    
    def test_quote_etf(self, client):
        """测试 ETF 行情"""
        response, _ = client.request(
            'GET', API_ENDPOINTS['tencent_quote'],
            params={'q': 'sh513310'}
        )
        assert response.status_code == 200


class TestTencentKline:
    """腾讯财经 K 线 API 测试"""
    
    @pytest.fixture
    def client(self):
        return APITestClient(BASE_URL, timeout=TIMEOUT_CONFIG['default'])
    
    def test_kline_normal(self, client):
        """测试正常 K 线请求"""
        response, duration_ms = client.request(
            'GET', API_ENDPOINTS['tencent_kline'],
            params={'code': 'sz002594', 'start': '', 'end': '', 'limit': '100'}
        )
        assert response.status_code == 200
        data = response.json()
        # 腾讯 K 线返回格式检查
        assert data is not None
    
    def test_kline_a_share(self, client):
        """测试 A 股 K 线"""
        response, _ = client.request(
            'GET', API_ENDPOINTS['tencent_kline'],
            params={'code': 'sh600519', 'limit': '50'}
        )
        assert response.status_code == 200
    
    def test_kline_hk_share(self, client):
        """测试港股 K 线"""
        response, _ = client.request(
            'GET', API_ENDPOINTS['tencent_kline'],
            params={'code': 'hk00700', 'limit': '50'}
        )
        assert response.status_code == 200
    
    def test_kline_etf(self, client):
        """测试 ETF K 线"""
        response, _ = client.request(
            'GET', API_ENDPOINTS['tencent_kline'],
            params={'code': 'sh513310', 'limit': '50'}
        )
        assert response.status_code == 200
    
    def test_kline_with_date_range(self, client):
        """测试带日期范围的 K 线"""
        response, _ = client.request(
            'GET', API_ENDPOINTS['tencent_kline'],
            params={
                'code': 'sz002594',
                'start': '20250101',
                'end': '20251231',
                'limit': '250'
            }
        )
        assert response.status_code == 200
    
    def test_kline_different_limits(self, client):
        """测试不同数据量限制"""
        for limit in ['10', '50', '100']:
            response, _ = client.request(
                'GET', API_ENDPOINTS['tencent_kline'],
                params={'code': 'sh600519', 'limit': limit}
            )
            assert response.status_code == 200
    
    def test_kline_invalid_code(self, client):
        """测试无效股票代码"""
        response, _ = client.request(
            'GET', API_ENDPOINTS['tencent_kline'],
            params={'code': 'INVALID', 'limit': '50'}
        )
        assert response.status_code in [200, 404]
    
    def test_kline_missing_code(self, client):
        """测试缺少股票代码参数"""
        response, _ = client.request(
            'GET', API_ENDPOINTS['tencent_kline'],
            params={'limit': '50'}
        )
        assert response.status_code in [200, 400]
    
    def test_kline_large_limit(self, client):
        """测试大数据量请求"""
        response, duration_ms = client.request(
            'GET', API_ENDPOINTS['tencent_kline'],
            params={'code': 'sh600519', 'limit': '1000'},
            timeout=TIMEOUT_CONFIG['long']
        )
        assert response.status_code == 200
        assert duration_ms < 30000
    
    def test_kline_zero_limit(self, client):
        """测试 limit=0"""
        response, _ = client.request(
            'GET', API_ENDPOINTS['tencent_kline'],
            params={'code': 'sh600519', 'limit': '0'}
        )
        assert response.status_code in [200, 400]
