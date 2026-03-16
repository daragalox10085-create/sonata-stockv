"""
Flask 中间件模块 - 提供全局错误处理和请求日志

@module backend/middleware
@version 1.0.0
"""

import time
import traceback
from functools import wraps
from typing import Any, Callable, Dict, Tuple

from flask import Flask, request, jsonify, Response

from logger import get_logger, LogLevel
from errors import AppError, ErrorCode, error_response, handle_exception


logger = get_logger()


class ErrorHandlerMiddleware:
    """全局错误处理中间件"""

    def __init__(self, app: Flask):
        self.app = app
        self._register_handlers()

    def _register_handlers(self) -> None:
        """注册错误处理器"""

        @self.app.errorhandler(AppError)
        def handle_app_error(error: AppError) -> Tuple[Response, int]:
            """处理应用错误"""
            logger.error(
                f"AppError: {error.code.value} - {error.message}",
                exc_info=True,
                extra={"error_code": error.code.value, "details": error.details}
            )
            return jsonify(error.to_dict()), error.status_code

        @self.app.errorhandler(404)
        def handle_not_found(error) -> Tuple[Response, int]:
            """处理 404 错误"""
            app_error = AppError(
                ErrorCode.DATA_NOT_FOUND,
                f"接口不存在: {request.path}",
                {"path": request.path, "method": request.method}
            )
            logger.warning(f"404 Not Found: {request.path}")
            return jsonify(app_error.to_dict()), 404

        @self.app.errorhandler(500)
        def handle_server_error(error) -> Tuple[Response, int]:
            """处理 500 错误"""
            logger.critical(
                f"500 Server Error: {str(error)}",
                exc_info=True
            )
            app_error = AppError(
                ErrorCode.UNKNOWN_ERROR,
                "服务器内部错误",
                {"traceback": traceback.format_exc()}
            )
            return jsonify(app_error.to_dict()), 500

        @self.app.errorhandler(Exception)
        def handle_generic_error(error: Exception) -> Tuple[Response, int]:
            """处理通用异常"""
            app_error = handle_exception(error)
            logger.error(
                f"Unhandled Exception: {str(error)}",
                exc_info=True,
                extra={"error_type": type(error).__name__}
            )
            return jsonify(app_error.to_dict()), app_error.status_code


class RequestLoggingMiddleware:
    """请求日志中间件"""

    def __init__(self, app: Flask):
        self.app = app
        self._register_middleware()

    def _register_middleware(self) -> None:
        """注册请求日志中间件"""

        @self.app.before_request
        def before_request() -> None:
            """请求开始处理"""
            request.start_time = time.time()  # type: ignore

        @self.app.after_request
        def after_request(response: Response) -> Response:
            """请求结束处理"""
            duration = time.time() - getattr(request, 'start_time', time.time())
            duration_ms = duration * 1000

            # 构建日志消息
            log_data = {
                "method": request.method,
                "path": request.path,
                "status": response.status_code,
                "duration_ms": round(duration_ms, 2),
                "ip": request.remote_addr,
                "user_agent": request.user_agent.string if request.user_agent else None
            }

            # 根据状态码选择日志级别
            if response.status_code >= 500:
                logger.error(f"Request failed: {request.method} {request.path} - {response.status_code}", extra=log_data)
            elif response.status_code >= 400:
                logger.warning(f"Request warning: {request.method} {request.path} - {response.status_code}", extra=log_data)
            else:
                logger.info(f"Request: {request.method} {request.path} - {response.status_code} ({duration_ms:.2f}ms)", extra=log_data)

            # 添加响应头
            response.headers['X-Request-ID'] = request.environ.get('REQUEST_ID', 'unknown')
            response.headers['X-Response-Time'] = f"{duration_ms:.2f}ms"

            return response


def api_response(success: bool = True, data: Any = None, message: str = None) -> Dict[str, Any]:
    """
    创建标准 API 响应

    Args:
        success: 是否成功
        data: 响应数据
        message: 消息

    Returns:
        标准响应字典
    """
    response: Dict[str, Any] = {
        "success": success,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S")
    }

    if data is not None:
        response["data"] = data

    if message is not None:
        response["message"] = message

    return response


def error_handler(f: Callable) -> Callable:
    """
    装饰器：自动捕获和处理函数中的异常

    Usage:
        @app.route('/api/test')
        @error_handler
        def test():
            # 如果发生异常，会自动处理
            return api_response(data={"test": True})
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except AppError as e:
            logger.error(f"AppError in {f.__name__}: {e.message}", extra={"error_code": e.code.value})
            return jsonify(e.to_dict()), e.status_code
        except Exception as e:
            logger.error(f"Exception in {f.__name__}: {str(e)}", exc_info=True)
            app_error = handle_exception(e)
            return jsonify(app_error.to_dict()), app_error.status_code

    return decorated


def init_middleware(app: Flask) -> None:
    """初始化所有中间件"""
    ErrorHandlerMiddleware(app)
    RequestLoggingMiddleware(app)
    logger.info("Middleware initialized")
