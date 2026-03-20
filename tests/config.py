#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Sonata API 测试配置
"""

import os

# API 基础 URL
BASE_URL = os.getenv('SONATA_API_BASE_URL', 'http://localhost:8787')

# API 端点配置
API_ENDPOINTS = {
    # 东方财富 API
    'eastmoney_quote': '/api/eastmoney/quote',
    'eastmoney_kline': '/api/eastmoney/kline',
    'eastmoney_sector': '/api/eastmoney/sector',
    
    # 腾讯 API
    'tencent_quote': '/api/tencent/quote',
    'tencent_kline': '/api/tencent/kline',
    
    # 新浪 API
    'sina_quote': '/api/sina/quote',
}

# 测试股票代码
TEST_SYMBOLS = {
    # A 股
    'a_shares': {
        'sh600519': {'name': '贵州茅台', 'secid': '1.600519', 'market': 'sh'},
        'sz002594': {'name': '比亚迪', 'secid': '0.002594', 'market': 'sz'},
        'sh000001': {'name': '上证指数', 'secid': '1.000001', 'market': 'sh'},
    },
    # 港股
    'hk_shares': {
        '00700': {'name': '腾讯控股', 'code': 'hk00700'},
        '03690': {'name': '美团', 'code': 'hk03690'},
    },
    # ETF
    'etfs': {
        'sh513310': {'name': '中韩半导体ETF', 'secid': '1.513310', 'market': 'sh'},
        'sh510300': {'name': '沪深300ETF', 'secid': '1.510300', 'market': 'sh'},
    },
    # 无效代码（用于错误测试）
    'invalid': {
        'INVALID': {'name': '无效代码'},
        '': {'name': '空代码'},
        '99999999': {'name': '不存在的代码'},
    }
}

# 超时配置 (秒)
TIMEOUT_CONFIG = {
    'default': 10,
    'short': 1,      # 用于超时测试
    'long': 30,      # 用于大数据量请求
}

# 重试配置
RETRY_CONFIG = {
    'max_retries': 3,
    'retry_delay': 1,  # 秒
}

# 测试报告配置
REPORT_CONFIG = {
    'output_dir': 'test_reports',
    'html_report': True,
    'json_report': True,
    'console_report': True,
}
