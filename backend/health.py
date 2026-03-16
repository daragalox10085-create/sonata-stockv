"""
健康检查与监控模块
提供/health接口和第三方API可达性检查
"""

import time
import requests
from datetime import datetime
from functools import wraps

# 服务启动时间
START_TIME = time.time()

# 版本信息
VERSION = "2.5.0"

# 第三方API健康状态缓存
_api_health_cache = {
    "eastmoney": {"status": "unknown", "last_check": None, "response_time": None},
    "tencent": {"status": "unknown", "last_check": None, "response_time": None},
}

# 缓存过期时间（秒）
CACHE_TTL = 30


def get_uptime():
    """获取服务运行时间"""
    uptime_seconds = int(time.time() - START_TIME)
    days = uptime_seconds // 86400
    hours = (uptime_seconds % 86400) // 3600
    minutes = (uptime_seconds % 3600) // 60
    seconds = uptime_seconds % 60
    
    if days > 0:
        return f"{days}d {hours}h {minutes}m {seconds}s"
    elif hours > 0:
        return f"{hours}h {minutes}m {seconds}s"
    elif minutes > 0:
        return f"{minutes}m {seconds}s"
    else:
        return f"{seconds}s"


def check_eastmoney_api():
    """检查东方财富API可达性"""
    try:
        start_time = time.time()
        url = 'https://push2.eastmoney.com/api/qt/stock/get?secid=0.000001&fields=f43,f57,f58'
        response = requests.get(url, timeout=5, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        response_time = round((time.time() - start_time) * 1000, 2)  # ms
        
        if response.status_code == 200:
            data = response.json()
            if data.get('data'):
                return {
                    "status": "healthy",
                    "response_time_ms": response_time,
                    "last_check": datetime.now().isoformat()
                }
        
        return {
            "status": "degraded",
            "response_time_ms": response_time,
            "last_check": datetime.now().isoformat(),
            "error": f"HTTP {response.status_code}"
        }
    except requests.exceptions.Timeout:
        return {
            "status": "unhealthy",
            "response_time_ms": None,
            "last_check": datetime.now().isoformat(),
            "error": "Timeout"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "response_time_ms": None,
            "last_check": datetime.now().isoformat(),
            "error": str(e)
        }


def check_tencent_api():
    """检查腾讯API可达性"""
    try:
        start_time = time.time()
        url = 'http://qt.gtimg.cn/q=sz000001'
        response = requests.get(url, timeout=5, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        response_time = round((time.time() - start_time) * 1000, 2)  # ms
        
        if response.status_code == 200 and 'v_sz000001=' in response.text:
            return {
                "status": "healthy",
                "response_time_ms": response_time,
                "last_check": datetime.now().isoformat()
            }
        
        return {
            "status": "degraded",
            "response_time_ms": response_time,
            "last_check": datetime.now().isoformat(),
            "error": f"HTTP {response.status_code}"
        }
    except requests.exceptions.Timeout:
        return {
            "status": "unhealthy",
            "response_time_ms": None,
            "last_check": datetime.now().isoformat(),
            "error": "Timeout"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "response_time_ms": None,
            "last_check": datetime.now().isoformat(),
            "error": str(e)
        }


def get_health_status():
    """获取完整的健康状态"""
    # 检查第三方API
    eastmoney_status = check_eastmoney_api()
    tencent_status = check_tencent_api()
    
    # 确定整体状态
    api_statuses = [eastmoney_status["status"], tencent_status["status"]]
    if all(s == "healthy" for s in api_statuses):
        overall_status = "healthy"
    elif any(s == "healthy" for s in api_statuses):
        overall_status = "degraded"
    else:
        overall_status = "unhealthy"
    
    return {
        "status": overall_status,
        "version": VERSION,
        "uptime": get_uptime(),
        "uptime_seconds": int(time.time() - START_TIME),
        "timestamp": datetime.now().isoformat(),
        "apis": {
            "eastmoney": eastmoney_status,
            "tencent": tencent_status
        }
    }
