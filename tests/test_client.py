#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
API 测试客户端基类
提供统一的请求处理和响应验证
"""

import requests
import json
import time
from typing import Dict, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum


class TestStatus(Enum):
    """测试状态枚举"""
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"
    ERROR = "error"


@dataclass
class TestResult:
    """测试结果数据类"""
    name: str
    status: TestStatus
    duration_ms: float
    message: str = ""
    details: Optional[Dict] = None
    error: Optional[str] = None


class APITestClient:
    """API 测试客户端"""
    
    def __init__(self, base_url: str, timeout: int = 10):
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/plain, */*',
        })
        self.results: list[TestResult] = []
    
    def request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict] = None,
        headers: Optional[Dict] = None,
        timeout: Optional[int] = None,
        expected_status: int = 200
    ) -> Tuple[requests.Response, float]:
        """
        发送 HTTP 请求
        
        Args:
            method: HTTP 方法
            endpoint: API 端点路径
            params: URL 参数
            headers: 请求头
            timeout: 超时时间
            expected_status: 预期状态码
            
        Returns:
            (response, duration_ms)
        """
        url = f"{self.base_url}{endpoint}"
        timeout = timeout or self.timeout
        
        start_time = time.time()
        response = self.session.request(
            method=method,
            url=url,
            params=params,
            headers=headers,
            timeout=timeout
        )
        duration_ms = (time.time() - start_time) * 1000
        
        return response, duration_ms
    
    def add_result(self, result: TestResult):
        """添加测试结果"""
        self.results.append(result)
    
    def assert_status_code(
        self,
        response: requests.Response,
        expected: int,
        test_name: str
    ) -> TestResult:
        """验证状态码"""
        passed = response.status_code == expected
        return TestResult(
            name=test_name,
            status=TestStatus.PASSED if passed else TestStatus.FAILED,
            duration_ms=0,
            message=f"Expected {expected}, got {response.status_code}",
            details={'expected': expected, 'actual': response.status_code}
        )
    
    def assert_response_time(
        self,
        duration_ms: float,
        max_ms: float,
        test_name: str
    ) -> TestResult:
        """验证响应时间"""
        passed = duration_ms <= max_ms
        return TestResult(
            name=test_name,
            status=TestStatus.PASSED if passed else TestStatus.FAILED,
            duration_ms=duration_ms,
            message=f"Response time: {duration_ms:.2f}ms (max: {max_ms}ms)",
            details={'actual_ms': duration_ms, 'max_ms': max_ms}
        )
    
    def assert_json_response(
        self,
        response: requests.Response,
        test_name: str,
        required_fields: Optional[list] = None
    ) -> TestResult:
        """验证 JSON 响应"""
        try:
            data = response.json()
            details = {'has_data': True}
            
            if required_fields:
                missing = [f for f in required_fields if f not in data]
                if missing:
                    return TestResult(
                        name=test_name,
                        status=TestStatus.FAILED,
                        duration_ms=0,
                        message=f"Missing fields: {missing}",
                        details={'missing_fields': missing}
                    )
                details['required_fields'] = required_fields
            
            return TestResult(
                name=test_name,
                status=TestStatus.PASSED,
                duration_ms=0,
                message="Valid JSON response",
                details=details
            )
        except json.JSONDecodeError as e:
            return TestResult(
                name=test_name,
                status=TestStatus.FAILED,
                duration_ms=0,
                message=f"Invalid JSON: {str(e)}",
                error=str(e)
            )
    
    def assert_no_error(
        self,
        response_data: Dict,
        test_name: str
    ) -> TestResult:
        """验证响应中没有错误"""
        error = response_data.get('error')
        if error:
            return TestResult(
                name=test_name,
                status=TestStatus.FAILED,
                duration_ms=0,
                message=f"Error in response: {error}",
                details={'error': error}
            )
        return TestResult(
            name=test_name,
            status=TestStatus.PASSED,
            duration_ms=0,
            message="No error in response"
        )
    
    def get_summary(self) -> Dict[str, Any]:
        """获取测试摘要"""
        total = len(self.results)
        passed = sum(1 for r in self.results if r.status == TestStatus.PASSED)
        failed = sum(1 for r in self.results if r.status == TestStatus.FAILED)
        errors = sum(1 for r in self.results if r.status == TestStatus.ERROR)
        skipped = sum(1 for r in self.results if r.status == TestStatus.SKIPPED)
        
        return {
            'total': total,
            'passed': passed,
            'failed': failed,
            'errors': errors,
            'skipped': skipped,
            'success_rate': (passed / total * 100) if total > 0 else 0
        }
