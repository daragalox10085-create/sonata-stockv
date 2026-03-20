#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
东方财富 API 测试套件
覆盖：/api/eastmoney/quote, /api/eastmoney/kline, /api/eastmoney/sector
"""

import pytest
from .test_client import APITestClient, TestStatus
from .config import BASE_URL, API_ENDPOINTS, TEST_SYMBOLS, TIMEOUT_CONFIG


class TestEastMoneyQuote:
    """东方财富实时行情 API 测试"""
    
    @pytest.fixture
    def client(self):
        return APITestClient(BASE_URL, timeout=TIMEOUT_CONFIG['default'])
    
    def test_quote_normal_sh(self, client):
        """测试正常 A 股上海行情 (sh600519)"""
        symbol = TEST_SYMBOLS['a_shares']['sh600519']
        response, duration_ms = client.request(
            'GET', API_ENDPOINTS['eastmoney_quote'],
            params={'secid': symbol['secid']}
        )
        assert response.status_code == 200
        data = response.json()
        assert 'data' in data or 'f43' in str(data)
        result = client.assert_response_time(duration_ms, 5000, "Response time")
        assert result.status == TestStatus.PASSED
    
    def test_quote_normal_sz(self, client):
        """测试正常 A 股深圳行情 (sz002594)"""
        symbol = TEST_SYMBOLS['a_shares']['sz002594']
        response, _ = client.request(
            'GET', API_ENDPOINTS['eastmoney_quote'],
            params={'secid': symbol['secid']}
        )
        assert response.status_code == 200
    
    def test_quote_with_fields(self, client):
        """测试带指定字段的行情请求"""
        symbol = TEST_SYMBOLS['a_shares']['sh600519']
        response, _ = client.request(
            'GET', API_ENDPOINTS['eastmoney_quote'],
            params={'secid': symbol['secid'], 'fields': 'f43,f44,f45,f46,f57,f58'}
        )
        assert response.status_code == 200
    
    def test_quote_invalid_secid(self, client):
        """测试无效 secid"""
        response, _ = client.request(
            'GET', API_ENDPOINTS['eastmoney_quote'],
            params={'secid': '999.999999'}
        )
        assert response.status_code in [200, 404, 500]
    
    def test_quote_missing_secid(self, client):
        """测试缺少 secid 参数"""
        response, _ = client.request('GET', API_ENDPOINTS['eastmoney_quote'])
        assert response.status_code in [200, 400, 404]
    
    def test_quote_empty_secid(self, client):
        """测试空 secid"""
        response, _ = client.request(
            'GET', API_ENDPOINTS['eastmoney_quote'],
            params={'secid': ''}
        )
        assert response.status_code in [200, 400]
    
    def test_quote_index_sh(self, client):
        """测试指数行情 (上证指数)"""
        symbol = TEST_SYMBOLS['a_shares']['sh000001']
        response, _ = client.request(
            'GET', API_ENDPOINTS['eastmoney_quote'],
            params={'secid': symbol['secid']}
        )
        assert response.status_code == 200


class TestEastMoneyKline:
    """东方财富 K 线 API 测试"""
    
    @pytest.fixture
    def client(self):
        return APITestClient(BASE_URL, timeout=TIMEOUT_CONFIG['default'])
    
    def test_kline_normal(self, client):
        """测试正常 K 线请求"""
        symbol = TEST_SYMBOLS['a_shares']['sh600519']
        response, _ = client.request(
            'GET', API_ENDPOINTS['eastmoney_kline'],
            params={'secid': symbol['secid'], 'klt': '101', 'fqt': '1', 'lmt': '100'}
        )
        assert response.status_code == 200
        data = response.json()
        klines = data.get('data', {}).get('klines', []) if isinstance(data.get('data'), dict) else []
        assert isinstance(klines, list)
    
    def test_kline_different_periods(self, client):
        """测试不同周期 K 线"""
        symbol = TEST_SYMBOLS['a_shares']['sz002594']
        for period in ['101', '102', '103']:
            response, _ = client.request(
                'GET', API_ENDPOINTS['eastmoney_kline'],
                params={'secid': symbol['secid'], 'klt': period, 'lmt': '30'}
            )
            assert response.status_code == 200
    
    def test_kline_adjustment_types(self, client):
        """测试不同复权类型"""
        symbol = TEST_SYMBOLS['a_shares']['sh600519']
        for adj in ['0', '1', '2']:
            response, _ = client.request(
                'GET', API_ENDPOINTS['eastmoney_kline'],
                params={'secid': symbol['secid'], 'klt': '101', 'fqt': adj, 'lmt': '30'}
            )
            assert response.status_code == 200
    
    def test_kline_invalid_secid(self, client):
        """测试无效股票代码"""
        response, _ = client.request(
            'GET', API_ENDPOINTS['eastmoney_kline'],
            params={'secid': '999.999999', 'klt': '101'}
        )
        assert response.status_code in [200, 404]
    
    def test_kline_missing_params(self, client):
        """测试缺少必要参数"""
        response, _ = client.request('GET', API_ENDPOINTS['eastmoney_kline'])
        assert response.status_code in [200, 400]
    
    def test_kline_large_limit(self, client):
        """测试大数据量请求"""
        symbol = TEST_SYMBOLS['a_shares']['sh600519']
        response, duration_ms = client.request(
            'GET', API_ENDPOINTS['eastmoney_kline'],
            params={'secid': symbol['secid'], 'klt': '101', 'lmt': '1000'},
            timeout=TIMEOUT_CONFIG['long']
        )
        assert response.status_code == 200
        assert duration_ms < 30000


class TestEastMoneySector:
    """东方财富板块数据 API 测试"""
    
    @pytest.fixture
    def client(self):
        return APITestClient(BASE_URL, timeout=TIMEOUT_CONFIG['default'])
    
    def test_sector_list(self, client):
        """测试板块列表"""
        response, duration_ms = client.request(
            'GET', API_ENDPOINTS['eastmoney_sector'],
            params={
                'pn': '1', 'pz': '20', 'po': '1', 'np': '1',
                'fltt': '2', 'invt': '2', 'fid': 'f12',
                'fs': 'm:0+t:6,m:0+t:13,m:1+t:2,m:1+t:23',
                'fields': 'f1,f2,f3,f4,f5,f6,f12,f13,f14'
            }
        )
        assert response.status_code == 200
    
    def test_sector_industry(self, client):
        """测试行业板块"""
        response, _ = client.request(
            'GET', API_ENDPOINTS['eastmoney_sector'],
            params={
                'pn': '1', 'pz': '20', 'po': '1', 'np': '1',
                'ut': 'bd1d9ddb04089700cf9c27f6f7426281',
                'fltt': '2', 'invt': '2', 'fid': 'f12',
                'fs': 'm:90+t:2',
                'fields': 'f1,f2,f3,f4,f5,f6,f12,f13,f14'
            }
        )
        assert response.status_code == 200
    
    def test_sector_concept(self, client):
        """测试概念板块"""
        response, _ = client.request(
            'GET', API_ENDPOINTS['eastmoney_sector'],
            params={
                'pn': '1', 'pz': '20', 'po': '1', 'np': '1',
                'ut': 'bd1d9ddb04089700cf9c27f6f7426281',
                'fltt': '2', 'invt': '2', 'fid': 'f12',
                'fs': 'm:90+t:3',
                'fields': 'f1,f2,f3,f4,f5,f6,f12,f13,f14'
            }
        )
        assert response.status_code == 200
    
    def test_sector_invalid_fs(self, client):
        """测试无效 fs 参数"""
        response, _ = client.request(
            'GET', API_ENDPOINTS['eastmoney_sector'],
            params={'fs': 'invalid'}
        )
        assert response.status_code in [200, 400, 404]
    
    def test_sector_missing_params(self, client):
        """测试缺少参数"""
        response, _ = client.request('GET', API_ENDPOINTS['eastmoney_sector'])
        assert response.status_code in [200, 400]
    
    def test_sector_pagination(self, client):
        """测试分页"""
        for page in [1, 2, 5]:
            response, _ = client.request(
                'GET', API_ENDPOINTS['eastmoney_sector'],
                params={
                    'pn': str(page), 'pz': '20', 'po': '1', 'np': '1',
                    'fltt': '2', 'invt': '2', 'fid': 'f12',
                    'fs': 'm:0+t:6',
                    'fields': 'f1,f2,f3,f4,f5,f6,f12,f13,f14'
                }
            )
            assert response.status_code == 200
