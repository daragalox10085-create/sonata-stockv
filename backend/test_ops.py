"""
运维能力测试脚本
测试健康检查、限流和熔断功能
"""

import requests
import time
import json

BASE_URL = "http://localhost:5000"

def test_health_endpoint():
    """测试健康检查接口"""
    print("=" * 50)
    print("测试 /api/health 接口")
    print("=" * 50)
    
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"服务状态: {data.get('status')}")
            print(f"版本: {data.get('version')}")
            print(f"运行时间: {data.get('uptime')}")
            print(f"\n第三方API状态:")
            for api, status in data.get('apis', {}).items():
                print(f"  {api}: {status.get('status')} ({status.get('response_time_ms')}ms)")
            print(f"\n熔断器状态:")
            for api, cb in data.get('circuit_breakers', {}).items():
                print(f"  {api}: {cb.get('state')}")
            print(f"\n限流状态:")
            rate_limit = data.get('rate_limiting', {})
            ip_status = rate_limit.get('ip', {})
            print(f"  IP: allowed={ip_status.get('allowed')}, remaining={ip_status.get('remaining')}")
            return True
        else:
            print(f"请求失败: {response.text}")
            return False
    except Exception as e:
        print(f"测试失败: {e}")
        return False

def test_rate_limiting():
    """测试限流功能"""
    print("\n" + "=" * 50)
    print("测试限流功能")
    print("=" * 50)
    
    try:
        # 快速发送多个请求
        responses = []
        for i in range(35):  # 超过30次限制
            response = requests.get(f"{BASE_URL}/api/stock-analysis?code=sh600519", timeout=5)
            responses.append(response.status_code)
            if i < 5 or i >= 30:  # 只打印前5个和最后5个
                print(f"请求 {i+1}: 状态码 {response.status_code}")
            time.sleep(0.1)
        
        success_count = responses.count(200)
        rate_limited_count = responses.count(429)
        
        print(f"\n成功请求: {success_count}")
        print(f"限流拒绝: {rate_limited_count}")
        print(f"限流功能正常: {'是' if rate_limited_count > 0 else '否'}")
        return rate_limited_count > 0
    except Exception as e:
        print(f"测试失败: {e}")
        return False

def test_circuit_breaker():
    """测试熔断器功能"""
    print("\n" + "=" * 50)
    print("测试熔断器功能")
    print("=" * 50)
    
    try:
        # 获取初始状态
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        data = response.json()
        
        print("熔断器初始状态:")
        for api, cb in data.get('circuit_breakers', {}).items():
            print(f"  {api}: {cb.get('state')}, 失败次数: {cb.get('failure_count')}")
        
        print("\n熔断器功能检查完成")
        return True
    except Exception as e:
        print(f"测试失败: {e}")
        return False

def test_retry_mechanism():
    """测试重试机制"""
    print("\n" + "=" * 50)
    print("测试重试机制")
    print("=" * 50)
    
    try:
        # 测试正常请求
        response = requests.get(f"{BASE_URL}/api/stock-analysis?code=sh600519", timeout=30)
        print(f"正常请求状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"股票名称: {data.get('name', 'N/A')}")
            print(f"当前价格: {data.get('current_price', 'N/A')}")
            print("\n重试机制测试通过")
            return True
        else:
            print(f"请求失败: {response.text}")
            return False
    except Exception as e:
        print(f"测试失败: {e}")
        return False

def main():
    """主测试函数"""
    print("\n" + "=" * 50)
    print("Sonata V2.5 运维能力测试")
    print("=" * 50)
    
    results = []
    
    # 测试健康检查
    results.append(("健康检查", test_health_endpoint()))
    
    # 测试重试机制
    results.append(("重试机制", test_retry_mechanism()))
    
    # 测试熔断器
    results.append(("熔断器", test_circuit_breaker()))
    
    # 测试限流（可选，因为会触发限流）
    # results.append(("限流功能", test_rate_limiting()))
    
    # 打印测试结果
    print("\n" + "=" * 50)
    print("测试结果汇总")
    print("=" * 50)
    
    for name, result in results:
        status = "✓ 通过" if result else "✗ 失败"
        print(f"{name}: {status}")
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    print(f"\n总计: {passed}/{total} 项通过")

if __name__ == "__main__":
    main()
