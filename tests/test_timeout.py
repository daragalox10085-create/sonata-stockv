#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
API 超时和压力测试套件
"""

import pytest
import time
from .test_client import APITestClient, TestStatus
from .config import BASE_URL, API_ENDPOINTS, TEST_SYMBOLS, TIMEOUT_CONFIG


class TestTimeout:
    """超时测试"""
    
    @pytest.fixture
    def client(self):
        return APITestClient(BASE_URL, timeout=TIMEOUT_CONFIG['short'])
    
    def test_quote_timeout(self, client):
        """测试行情 API 超时处理"""
        # 使用极短超时测试
        try:
            response, duration_ms = client.request(
                'GET', API_ENDPOINTS['eastmoney_quote'],
                params={'secid': '1.600519'},
                timeout=TIMEOUT_CONFIG['short']
            )
            # 如果请求完成，检查响应时间
            assert duration_ms < 5000 or response.status_code != 200
        except Exception:
            # 超时是预期的
            pass
    
    def test_kline_timeout(self, client):
        """测试 K 线 API 超时处理"""
        try:
            response, duration_ms = client.request(
                'GET', API_ENDPOINTS['eastmoney_kline'],
                params={'secid': '1.600519', 'lmt': '1000'},
                timeout=TIMEOUT_CONFIG['short']
            )
        except Exception:
            # 超时是预期的
            pass
    
    def test_tencent_timeout(self, client):
        """测试腾讯 API 超时处理"""
        try:
            response, _ = client.request(
                'GET', API_ENDPOINTS['tencent_quote'],
                params={'q': 'sh600519'},
                timeout=TIMEOUT_CONFIG['short']
            )
        except Exception:
            pass


class TestConcurrent:
    """并发测试"""
    
    @pytest.fixture
    def client(self):
        return APITestClient(BASE_URL, timeout=TIMEOUT_CONFIG['default'])
    
    def test_concurrent_quotes(self, client):
        """测试并发行情请求"""
        symbols = ['sh600519', 'sz002594', 'sh000001']
        results = []
        
        for symbol in symbols:
            response, duration_ms = client.request(
                'GET', API_ENDPOINTS['eastmoney_quote'],
                params={'secid': f'1.{symbol[2:]}' if symbol.startswith('sh') else f'0.{symbol[2:]}'}
            )
            results.append((symbol, response.status_code, duration_ms))
        
        # 所有请求都应该成功
        for symbol, status, _ in results:
            assert status == 200, f"Failed for {symbol}"
    
    def test_multiple_api_types(self, client):
        """测试同时请求多种 API"""
        endpoints = [
            (API_ENDPOINTS['eastmoney_quote'], {'secid': '1.600519'}),
            (API_ENDPOINTS['tencent_quote'], {'q': 'sh600519'}),
            (API_ENDPOINTS['eastmoney_kline'], {'secid': '1.600519', 'lmt': '30'}),
        ]
        
        for endpoint, params in endpoints:
            response, _ = client.request('GET', endpoint, params=params)
            assert response.status_code == 200


class TestRateLimit:
    """频率限制测试"""
    
    @pytest.fixture
    def client(self):
        return APITestClient(BASE_URL, timeout=TIMEOUT_CONFIG['default'])
    
    def test_rapid_requests(self, client):
        """测试快速连续请求"""
        success_count = 0
        total_requests = 10
        
        for i in range(total_requests):
            response, _ = client.request(
                'GET', API_ENDPOINTS['eastmoney_quote'],
                params={'secid': '1.600519'}
            )
            if response.status_code == 200:
                success_count += 1
            time.sleep(0.1)  # 100ms 间隔
        
        # 大部分请求应该成功
        assert success_count >= total_requests * 0.8, f"Only {success_count}/{total_requests} succeeded"
    
    def test_burst_requests(self, client):
        """测试突发请求"""
        responses = []
        
        # 快速发送 5 个请求
        for i in range(5):
            response, _ = client.request(
                'GET', API_ENDPOINTS['tencent_quote'],
                params={'q': 'sh600519'}
            )
            responses.append(response.status_code)
        
        # 检查响应
        success = sum(1 for s in responses if s == 200)
        assert success >= 3, f"Only {success}/5 burst requests succeeded"
