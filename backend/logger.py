"""
日志模块 - 提供统一的日志记录功能
支持不同级别、文件输出和格式化

@module backend/logger
@version 1.0.0
"""

import logging
import logging.handlers
import os
import sys
from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional


class LogLevel(Enum):
    """日志级别枚举"""
    DEBUG = logging.DEBUG
    INFO = logging.INFO
    WARNING = logging.WARNING
    ERROR = logging.ERROR
    CRITICAL = logging.CRITICAL


class AppLogger:
    """应用日志器"""

    _instance: Optional['AppLogger'] = None
    _logger: Optional[logging.Logger] = None

    def __new__(cls) -> 'AppLogger':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(
        self,
        name: str = "sonata",
        level: LogLevel = LogLevel.INFO,
        log_dir: str = "./logs",
        max_bytes: int = 10 * 1024 * 1024,  # 10MB
        backup_count: int = 5
    ):
        if AppLogger._logger is not None:
            return

        self._logger = logging.getLogger(name)
        self._logger.setLevel(level.value)
        self._logger.handlers = []  # 清除现有处理器

        # 创建日志目录
        os.makedirs(log_dir, exist_ok=True)

        # 格式化器
        formatter = logging.Formatter(
            '[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )

        # 控制台处理器
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(level.value)
        console_handler.setFormatter(formatter)
        self._logger.addHandler(console_handler)

        # 文件处理器（按大小轮转）
        log_file = os.path.join(log_dir, f"{name}.log")
        file_handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=max_bytes,
            backupCount=backup_count,
            encoding='utf-8'
        )
        file_handler.setLevel(level.value)
        file_handler.setFormatter(formatter)
        self._logger.addHandler(file_handler)

        # 错误日志单独文件
        error_file = os.path.join(log_dir, f"{name}_error.log")
        error_handler = logging.handlers.RotatingFileHandler(
            error_file,
            maxBytes=max_bytes,
            backupCount=backup_count,
            encoding='utf-8'
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(formatter)
        self._logger.addHandler(error_handler)

        AppLogger._logger = self._logger

    @property
    def logger(self) -> logging.Logger:
        """获取日志器实例"""
        if self._logger is None:
            raise RuntimeError("Logger not initialized")
        return self._logger

    def debug(self, message: str, extra: Optional[Dict[str, Any]] = None) -> None:
        """记录调试日志"""
        self.logger.debug(message, extra=extra)

    def info(self, message: str, extra: Optional[Dict[str, Any]] = None) -> None:
        """记录信息日志"""
        self.logger.info(message, extra=extra)

    def warning(self, message: str, extra: Optional[Dict[str, Any]] = None) -> None:
        """记录警告日志"""
        self.logger.warning(message, extra=extra)

    def error(
        self,
        message: str,
        exc_info: bool = False,
        extra: Optional[Dict[str, Any]] = None
    ) -> None:
        """记录错误日志"""
        self.logger.error(message, exc_info=exc_info, extra=extra)

    def critical(
        self,
        message: str,
        exc_info: bool = True,
        extra: Optional[Dict[str, Any]] = None
    ) -> None:
        """记录严重错误日志"""
        self.logger.critical(message, exc_info=exc_info, extra=extra)

    def log_api_request(
        self,
        api_name: str,
        method: str,
        url: str,
        status: str,
        duration_ms: float,
        error: Optional[str] = None
    ) -> None:
        """记录 API 请求日志"""
        message = f"API [{api_name}] {method} {url} - {status} ({duration_ms:.2f}ms)"
        if error:
            message += f" - Error: {error}"
            self.warning(message)
        else:
            self.info(message)


# 全局日志器实例
_logger_instance: Optional[AppLogger] = None


def init_logger(
    name: str = "sonata",
    level: LogLevel = LogLevel.INFO,
    log_dir: str = "./logs"
) -> AppLogger:
    """初始化日志器"""
    global _logger_instance
    _logger_instance = AppLogger(name, level, log_dir)
    return _logger_instance


def get_logger() -> AppLogger:
    """获取日志器实例"""
    global _logger_instance
    if _logger_instance is None:
        _logger_instance = init_logger()
    return _logger_instance


# 便捷函数
def debug(message: str, extra: Optional[Dict[str, Any]] = None) -> None:
    """记录调试日志"""
    get_logger().debug(message, extra)


def info(message: str, extra: Optional[Dict[str, Any]] = None) -> None:
    """记录信息日志"""
    get_logger().info(message, extra)


def warning(message: str, extra: Optional[Dict[str, Any]] = None) -> None:
    """记录警告日志"""
    get_logger().warning(message, extra)


def error(message: str, exc_info: bool = False, extra: Optional[Dict[str, Any]] = None) -> None:
    """记录错误日志"""
    get_logger().error(message, exc_info, extra)


def critical(message: str, exc_info: bool = True, extra: Optional[Dict[str, Any]] = None) -> None:
    """记录严重错误日志"""
    get_logger().critical(message, exc_info, extra)
