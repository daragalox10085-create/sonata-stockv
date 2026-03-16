"""
容错与限流模块
提供请求重试机制和限流功能
"""

import time
import random
import requests
from functools import wraps
from collections import defaultdict
from threading import Lock


class ExponentialBackoff:
    """指数退避重试机制"""
    
    def __init__(self, max_retries=3, base_delay=1.0, max_delay=60.0, exponential_base=2):
        """
        初始化指数退避
        
        Args:
            max_retries: 最大重试次数
            base_delay: 基础延迟（秒）
            max_delay: 最大延迟（秒）
            exponential_base: 指数基数
        """
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
    
    def calculate_delay(self, attempt):
        """计算第attempt次的延迟时间"""
        delay = self.base_delay * (self.exponential_base ** attempt)
        # 添加随机抖动（0-20%）避免同步重试
        jitter = delay * 0.2 * random.random()
        return min(delay + jitter, self.max_delay)
    
    def retry(self, func, *args, **kwargs):
        """
        执行带重试的函数
        
        Args:
            func: 要执行的函数
            *args, **kwargs: 函数参数
            
        Returns:
            函数执行结果
            
        Raises:
            Exception: 所有重试都失败时抛出最后一次异常
        """
        last_exception = None
        
        for attempt in range(self.max_retries + 1):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                last_exception = e
                if attempt < self.max_retries:
                    delay = self.calculate_delay(attempt)
                    time.sleep(delay)
                else:
                    break
        
        raise last_exception


class APIClientWithRetry:
    """带重试机制的API客户端"""
    
    def __init__(self, max_retries=3, timeout=5):
        self.max_retries = max_retries
        self.timeout = timeout
        self.backoff = ExponentialBackoff(max_retries=max_retries)
    
    def get(self, url, **kwargs):
        """带重试的GET请求"""
        def _request():
            response = requests.get(url, timeout=self.timeout, **kwargs)
            response.raise_for_status()
            return response
        
        return self.backoff.retry(_request)
    
    def post(self, url, **kwargs):
        """带重试的POST请求"""
        def _request():
            response = requests.post(url, timeout=self.timeout, **kwargs)
            response.raise_for_status()
            return response
        
        return self.backoff.retry(_request)


class RateLimiter:
    """请求频率限制器"""
    
    def __init__(self, max_requests=10, window_seconds=1):
        """
        初始化限流器
        
        Args:
            max_requests: 时间窗口内允许的最大请求数
            window_seconds: 时间窗口（秒）
        """
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = defaultdict(list)
        self._lock = Lock()
    
    def is_allowed(self, key="default"):
        """
        检查是否允许请求
        
        Args:
            key: 限流键（如IP地址、用户ID等）
            
        Returns:
            (allowed, remaining, reset_time)
            allowed: 是否允许请求
            remaining: 剩余可用请求数
            reset_time: 窗口重置时间戳
        """
        now = time.time()
        window_start = now - self.window_seconds
        
        with self._lock:
            # 清理过期请求记录
            self.requests[key] = [req_time for req_time in self.requests[key] if req_time > window_start]
            
            current_count = len(self.requests[key])
            
            if current_count < self.max_requests:
                self.requests[key].append(now)
                return True, self.max_requests - current_count - 1, window_start + self.window_seconds
            else:
                reset_time = self.requests[key][0] + self.window_seconds
                return False, 0, reset_time
    
    def get_status(self, key="default"):
        """获取当前限流状态"""
        now = time.time()
        window_start = now - self.window_seconds
        
        with self._lock:
            self.requests[key] = [req_time for req_time in self.requests[key] if req_time > window_start]
            current_count = len(self.requests[key])
            
            return {
                "current_requests": current_count,
                "max_requests": self.max_requests,
                "remaining": max(0, self.max_requests - current_count),
                "window_seconds": self.window_seconds
            }


class IPRateLimiter(RateLimiter):
    """基于IP的限流器"""
    
    def __init__(self, max_requests=30, window_seconds=60):
        super().__init__(max_requests, window_seconds)
    
    def is_ip_allowed(self, ip_address):
        """检查IP是否允许请求"""
        return self.is_allowed(ip_address)


class UserRateLimiter(RateLimiter):
    """基于用户的限流器"""
    
    def __init__(self, max_requests=100, window_seconds=60):
        super().__init__(max_requests, window_seconds)
    
    def is_user_allowed(self, user_id):
        """检查用户是否允许请求"""
        return self.is_allowed(user_id)


class CircuitBreaker:
    """熔断器 - 防止级联故障"""
    
    STATE_CLOSED = "closed"      # 正常状态
    STATE_OPEN = "open"          # 熔断状态
    STATE_HALF_OPEN = "half_open"  # 半开状态（测试恢复）
    
    def __init__(self, failure_threshold=5, recovery_timeout=30, success_threshold=3):
        """
        初始化熔断器
        
        Args:
            failure_threshold: 触发熔断的失败次数阈值
            recovery_timeout: 熔断后恢复等待时间（秒）
            success_threshold: 半开状态下成功次数阈值（恢复关闭）
        """
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.success_threshold = success_threshold
        
        self.failure_count = 0
        self.success_count = 0
        self.state = self.STATE_CLOSED
        self.last_failure_time = None
        self._lock = Lock()
    
    def can_execute(self):
        """检查是否可以执行请求"""
        with self._lock:
            if self.state == self.STATE_CLOSED:
                return True
            elif self.state == self.STATE_OPEN:
                if time.time() - self.last_failure_time >= self.recovery_timeout:
                    self.state = self.STATE_HALF_OPEN
                    self.success_count = 0
                    return True
                return False
            elif self.state == self.STATE_HALF_OPEN:
                return True
        
        return False
    
    def record_success(self):
        """记录成功"""
        with self._lock:
            self.failure_count = 0
            
            if self.state == self.STATE_HALF_OPEN:
                self.success_count += 1
                if self.success_count >= self.success_threshold:
                    self.state = self.STATE_CLOSED
                    self.success_count = 0
    
    def record_failure(self):
        """记录失败"""
        with self._lock:
            self.failure_count += 1
            self.last_failure_time = time.time()
            
            if self.state == self.STATE_HALF_OPEN:
                self.state = self.STATE_OPEN
            elif self.failure_count >= self.failure_threshold:
                self.state = self.STATE_OPEN
    
    def get_state(self):
        """获取当前状态"""
        with self._lock:
            return {
                "state": self.state,
                "failure_count": self.failure_count,
                "success_count": self.success_count
            }


# 全局限流器实例
# 请求频率限制：每秒10次
request_rate_limiter = RateLimiter(max_requests=10, window_seconds=1)

# IP限流：每60秒30次
ip_rate_limiter = IPRateLimiter(max_requests=30, window_seconds=60)

# 用户限流：每60秒100次
user_rate_limiter = UserRateLimiter(max_requests=100, window_seconds=60)

# API熔断器实例
# 东方财富API熔断器：5次失败熔断，30秒后尝试恢复
eastmoney_circuit_breaker = CircuitBreaker(failure_threshold=5, recovery_timeout=30, success_threshold=3)

# 腾讯API熔断器
tencent_circuit_breaker = CircuitBreaker(failure_threshold=5, recovery_timeout=30, success_threshold=3)


def with_retry(max_retries=3, fallback_func=None):
    """
    装饰器：为函数添加重试机制
    
    Args:
        max_retries: 最大重试次数
        fallback_func: 失败时的降级函数
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            backoff = ExponentialBackoff(max_retries=max_retries)
            try:
                return backoff.retry(func, *args, **kwargs)
            except Exception as e:
                if fallback_func:
                    return fallback_func(*args, **kwargs)
                raise e
        return wrapper
    return decorator


def with_rate_limit(limiter=None, key_func=None):
    """
    装饰器：为函数添加限流
    
    Args:
        limiter: 限流器实例
        key_func: 获取限流键的函数
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            nonlocal limiter
            if limiter is None:
                limiter = request_rate_limiter
            
            key = key_func(*args, **kwargs) if key_func else "default"
            allowed, remaining, reset_time = limiter.is_allowed(key)
            
            if not allowed:
                raise RateLimitExceeded(f"Rate limit exceeded. Try again after {reset_time}")
            
            return func(*args, **kwargs)
        return wrapper
    return decorator


class RateLimitExceeded(Exception):
    """限流异常"""
    pass


class APIUnavailableException(Exception):
    """API不可用异常"""
    pass