"""
错误处理模块 - 提供统一的错误类型和处理

@module backend/errors
@version 1.0.0
"""

from enum import Enum
from typing import Any, Dict, Optional
from datetime import datetime


class ErrorCode(Enum):
    """错误代码枚举"""
    # 通用错误
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
    NETWORK_ERROR = "NETWORK_ERROR"
    TIMEOUT_ERROR = "TIMEOUT_ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"

    # API 错误
    API_REQUEST_FAILED = "API_REQUEST_FAILED"
    API_RESPONSE_INVALID = "API_RESPONSE_INVALID"
    API_RATE_LIMITED = "API_RATE_LIMITED"
    API_UNAVAILABLE = "API_UNAVAILABLE"

    # 数据错误
    DATA_NOT_FOUND = "DATA_NOT_FOUND"
    DATA_PARSE_ERROR = "DATA_PARSE_ERROR"
    DATA_VALIDATION_FAILED = "DATA_VALIDATION_FAILED"

    # 业务错误
    STOCK_NOT_FOUND = "STOCK_NOT_FOUND"
    SECTOR_NOT_FOUND = "SECTOR_NOT_FOUND"
    ANALYSIS_FAILED = "ANALYSIS_FAILED"


# HTTP 状态码映射
ERROR_HTTP_STATUS: Dict[ErrorCode, int] = {
    ErrorCode.UNKNOWN_ERROR: 500,
    ErrorCode.NETWORK_ERROR: 503,
    ErrorCode.TIMEOUT_ERROR: 504,
    ErrorCode.VALIDATION_ERROR: 400,
    ErrorCode.API_REQUEST_FAILED: 502,
    ErrorCode.API_RESPONSE_INVALID: 502,
    ErrorCode.API_RATE_LIMITED: 429,
    ErrorCode.API_UNAVAILABLE: 503,
    ErrorCode.DATA_NOT_FOUND: 404,
    ErrorCode.DATA_PARSE_ERROR: 500,
    ErrorCode.DATA_VALIDATION_FAILED: 400,
    ErrorCode.STOCK_NOT_FOUND: 404,
    ErrorCode.SECTOR_NOT_FOUND: 404,
    ErrorCode.ANALYSIS_FAILED: 500,
}


class AppError(Exception):
    """应用基础错误类"""

    def __init__(
        self,
        code: ErrorCode,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        original_error: Optional[Exception] = None
    ):
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}
        self.original_error = original_error
        self.status_code = ERROR_HTTP_STATUS.get(code, 500)
        self.timestamp = datetime.now().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "success": False,
            "error": {
                "code": self.code.value,
                "message": self.message,
                "details": self.details,
                "timestamp": self.timestamp
            }
        }

    def __str__(self) -> str:
        return f"[{self.code.value}] {self.message}"


class ApiError(AppError):
    """API 错误类"""

    def __init__(
        self,
        code: ErrorCode,
        message: str,
        api_name: str,
        url: Optional[str] = None,
        duration: Optional[float] = None,
        original_error: Optional[Exception] = None
    ):
        details = {"api_name": api_name}
        if url:
            details["url"] = url
        if duration is not None:
            details["duration_ms"] = duration

        super().__init__(code, message, details, original_error)
        self.api_name = api_name
        self.url = url
        self.duration = duration


class DataError(AppError):
    """数据错误类"""

    def __init__(
        self,
        code: ErrorCode,
        message: str,
        data_type: str,
        identifier: Optional[str] = None,
        original_error: Optional[Exception] = None
    ):
        details = {"data_type": data_type}
        if identifier:
            details["identifier"] = identifier

        super().__init__(code, message, details, original_error)
        self.data_type = data_type
        self.identifier = identifier


class ValidationError(AppError):
    """验证错误类"""

    def __init__(
        self,
        message: str,
        field: Optional[str] = None,
        expected: Optional[Any] = None,
        actual: Optional[Any] = None
    ):
        details = {}
        if field:
            details["field"] = field
        if expected is not None:
            details["expected"] = expected
        if actual is not None:
            details["actual"] = actual

        super().__init__(ErrorCode.VALIDATION_ERROR, message, details)
        self.field = field
        self.expected = expected
        self.actual = actual


def create_network_error(
    message: Optional[str] = None,
    original_error: Optional[Exception] = None
) -> AppError:
    """创建网络错误"""
    return AppError(
        ErrorCode.NETWORK_ERROR,
        message or "网络连接失败，请检查网络设置",
        original_error=original_error
    )


def create_timeout_error(
    message: Optional[str] = None,
    original_error: Optional[Exception] = None
) -> AppError:
    """创建超时错误"""
    return AppError(
        ErrorCode.TIMEOUT_ERROR,
        message or "请求超时，请稍后重试",
        original_error=original_error
    )


def create_api_error(
    api_name: str,
    message: Optional[str] = None,
    url: Optional[str] = None,
    duration: Optional[float] = None,
    original_error: Optional[Exception] = None
) -> ApiError:
    """创建 API 错误"""
    return ApiError(
        ErrorCode.API_REQUEST_FAILED,
        message or f"{api_name} 请求失败",
        api_name,
        url,
        duration,
        original_error
    )


def create_data_not_found_error(
    data_type: str,
    identifier: Optional[str] = None
) -> DataError:
    """创建数据未找到错误"""
    return DataError(
        ErrorCode.DATA_NOT_FOUND,
        f'{data_type}{f" \"{identifier}\"" if identifier else ""} 未找到',
        data_type,
        identifier
    )


def create_stock_not_found_error(symbol: str) -> DataError:
    """创建股票未找到错误"""
    return DataError(
        ErrorCode.STOCK_NOT_FOUND,
        f'股票 "{symbol}" 未找到或数据不可用',
        "Stock",
        symbol
    )


def handle_exception(error: Exception) -> AppError:
    """将异常转换为 AppError"""
    if isinstance(error, AppError):
        return error

    if isinstance(error, TimeoutError):
        return create_timeout_error(original_error=error)

    if isinstance(error, ConnectionError):
        return create_network_error(original_error=error)

    return AppError(
        ErrorCode.UNKNOWN_ERROR,
        str(error) or "发生未知错误",
        original_error=error
    )


def error_response(error: Exception) -> Dict[str, Any]:
    """生成错误响应"""
    app_error = handle_exception(error)
    return app_error.to_dict()
