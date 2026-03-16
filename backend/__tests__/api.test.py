"""
API接口功能测试
使用pytest和requests进行测试
"""
import pytest
import requests
import json
from datetime import datetime

# 基础URL配置
BASE_URL = "http://localhost:5000"
API_PREFIX = "/api"


class TestHealthEndpoints:
    """健康检查端点测试"""
    
    def test_health_check(self):
        """测试健康检查端点"""
        response = requests.get(f"{BASE_URL}{API_PREFIX}/health", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "dataSource" in data
        assert "timestamp" in data
    
    def test_test_endpoint(self):
        """测试基础测试端点"""
        response = requests.get(f"{BASE_URL}{API_PREFIX}/test", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "OK"
        assert "message" in data


class TestStockAnalysisEndpoints:
    """股票分析端点测试"""
    
    def test_stock_analysis_basic(self):
        """测试基础股票分析"""
        stock_code = "sh600519"  # 贵州茅台
        response = requests.get(
            f"{BASE_URL}{API_PREFIX}/stock-analysis",
            params={"code": stock_code},
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        assert "current_price" in data
        assert "predicted_price" in data
        assert "scenarios" in data or "change_pct" in data
    
    def test_stock_analysis_invalid_code(self):
        """测试无效股票代码"""
        response = requests.get(
            f"{BASE_URL}{API_PREFIX}/stock-analysis",
            params={"code": "invalid"},
            timeout=30
        )
        # 应该返回错误或者400状态码
        assert response.status_code in [200, 400]
    
    def test_stock_analysis_missing_code(self):
        """测试缺少股票代码参数"""
        response = requests.get(
            f"{BASE_URL}{API_PREFIX}/stock-analysis",
            timeout=30
        )
        # 应该使用默认代码
        assert response.status_code == 200


class TestMonteCarloEndpoints:
    """蒙特卡洛分析端点测试"""
    
    def test_monte_carlo_analysis(self):
        """测试蒙特卡洛分析"""
        stock_code = "600519"
        response = requests.get(
            f"{BASE_URL}{API_PREFIX}/stock/{stock_code}/monte-carlo",
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "stock" in data
        assert "monteCarlo" in data
        assert "scenarios" in data["monteCarlo"]
    
    def test_monte_carlo_invalid_stock(self):
        """测试无效股票的蒙特卡洛分析"""
        stock_code = "999999"  # 无效代码
        response = requests.get(
            f"{BASE_URL}{API_PREFIX}/stock/{stock_code}/monte-carlo",
            timeout=30
        )
        assert response.status_code in [200, 400]
        if response.status_code == 200:
            data = response.json()
            assert data["success"] == False


class TestHotSectorsEndpoints:
    """热门板块端点测试"""
    
    def test_hot_sectors_basic(self):
        """测试获取热门板块"""
        response = requests.get(
            f"{BASE_URL}{API_PREFIX}/hot-sectors",
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        if data["success"]:
            assert "data" in data
            assert isinstance(data["data"], list)
    
    def test_hot_sectors_structure(self):
        """测试热门板块数据结构"""
        response = requests.get(
            f"{BASE_URL}{API_PREFIX}/hot-sectors",
            timeout=30
        )
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and len(data.get("data", [])) > 0:
                sector = data["data"][0]
                # 检查必要字段
                assert "sector" in sector or "code" in sector


class TestDataIntegrity:
    """数据完整性测试"""
    
    def test_response_timestamp(self):
        """测试响应包含时间戳"""
        response = requests.get(f"{BASE_URL}{API_PREFIX}/health", timeout=10)
        data = response.json()
        assert "timestamp" in data
        # 验证时间戳格式
        try:
            datetime.fromisoformat(data["timestamp"].replace('Z', '+00:00'))
        except ValueError:
            pytest.fail("Invalid timestamp format")
    
    def test_response_json_format(self):
        """测试响应为有效JSON"""
        endpoints = [
            f"{BASE_URL}{API_PREFIX}/health",
            f"{BASE_URL}{API_PREFIX}/test",
            f"{BASE_URL}{API_PREFIX}/hot-sectors"
        ]
        for endpoint in endpoints:
            response = requests.get(endpoint, timeout=30)
            try:
                json.loads(response.text)
            except json.JSONDecodeError:
                pytest.fail(f"Invalid JSON response from {endpoint}")


class TestErrorHandling:
    """错误处理测试"""
    
    def test_404_response(self):
        """测试404响应"""
        response = requests.get(f"{BASE_URL}/nonexistent", timeout=10)
        assert response.status_code == 404
    
    def test_cors_headers(self):
        """测试CORS头（如果启用）"""
        response = requests.options(f"{BASE_URL}{API_PREFIX}/health", timeout=10)
        # 如果启用了CORS，应该返回适当的头


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
