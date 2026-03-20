#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Pytest 配置文件
"""

import pytest
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


def pytest_configure(config):
    """Pytest 配置"""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "api: marks tests as API tests"
    )


@pytest.fixture(scope="session")
def api_base_url():
    """API 基础 URL fixture"""
    import os
    return os.getenv('SONATA_API_BASE_URL', 'http://localhost:8787')


@pytest.fixture
def test_symbols():
    """测试股票代码 fixture"""
    return {
        'a_shares': {
            'sh600519': '贵州茅台',
            'sz002594': '比亚迪',
            'sh000001': '上证指数',
        },
        'hk_shares': {
            'hk00700': '腾讯控股',
        },
        'etfs': {
            'sh513310': '中韩半导体 ETF',
        }
    }
