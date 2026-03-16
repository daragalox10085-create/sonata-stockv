"""
Sonata Backend API
股票分析和数据服务后端

@module backend/app
@version 2.5.0
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import numpy as np
import requests
import re
import os
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List

# 导入自定义模块
from logger import init_logger, get_logger, LogLevel
from errors import (
    AppError, ApiError, DataError, ErrorCode,
    create_network_error, create_timeout_error, create_stock_not_found_error,
    handle_exception, error_response
)
from middleware import init_middleware, api_response, error_handler

# 初始化 Flask 应用
app = Flask(__name__)
CORS(app)

# 初始化日志和中间件
init_logger(name="sonata", level=LogLevel.INFO)
logger = get_logger()
init_middleware(app)

# 导入健康检查和限流模块
try:
    from health import get_health_status, check_eastmoney_api, check_tencent_api
    from rate_limiter import (
        APIClientWithRetry, ip_rate_limiter, user_rate_limiter,
        eastmoney_circuit_breaker, tencent_circuit_breaker,
        with_retry, RateLimitExceeded
    )
    HAS_RATE_LIMITER = True
except ImportError:
    HAS_RATE_LIMITER = False
    logger.warning("Rate limiter module not found, running without rate limiting")

# 创建带重试的API客户端
if HAS_RATE_LIMITER:
    api_client = APIClientWithRetry(max_retries=3, timeout=5)
else:
    api_client = None


def convert_to_eastmoney_code(code: str) -> str:
    """
    转换为东方财富代码格式

    Args:
        code: 股票代码（如 'sh600519' 或 '600519'）

    Returns:
        东方财富格式的代码（如 '1.600519'）
    """
    if code.startswith('sh'):
        return f"1.{code[2:]}"
    elif code.startswith('sz'):
        return f"0.{code[2:]}"
    elif code.startswith('6'):
        return f"1.{code}"
    else:
        return f"0.{code}"


def convert_to_tencent_code(code: str) -> str:
    """
    转换为腾讯代码格式

    Args:
        code: 股票代码（如 'sh600519' 或 '600519'）

    Returns:
        腾讯格式的代码（如 'sh600519'）
    """
    if code.startswith('sh'):
        return f"sh{code[2:]}"
    elif code.startswith('sz'):
        return f"sz{code[2:]}"
    elif code.startswith('6'):
        return f"sh{code}"
    else:
        return f"sz{code}"


class DataFetcher:
    """
    多层级数据获取器 - 5层冗余 + 熔断保护

    提供从多个数据源获取股票数据的能力，包括：
    1. 东方财富（主要）
    2. 腾讯财经
    3. 新浪财经
    4. 网易财经
    5. AkShare
    """

    @staticmethod
    def fetch_from_eastmoney(stock_code: str) -> Optional[Dict[str, Any]]:
        """
        从东方财富获取数据（带熔断保护）

        Args:
            stock_code: 股票代码

        Returns:
            股票数据字典或 None
        """
        if HAS_RATE_LIMITER and not eastmoney_circuit_breaker.can_execute():
            logger.warning("东方财富API熔断中，跳过请求")
            return None

        try:
            secid = convert_to_eastmoney_code(stock_code)
            url = f'https://push2.eastmoney.com/api/qt/stock/get?secid={secid}&fields=f43,f44,f45,f46,f47,f48,f49,f50,f51,f52,f57,f58,f60,f170'

            if HAS_RATE_LIMITER:
                response = api_client.get(url, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                })
            else:
                response = requests.get(url, timeout=5, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                })

            data = response.json()

            if data.get('data'):
                d = data['data']
                if HAS_RATE_LIMITER:
                    eastmoney_circuit_breaker.record_success()

                logger.info(f"东方财富数据获取成功: {stock_code}")
                return {
                    'name': d.get('f58', ''),
                    'current_price': float(d.get('f43', 0)) / 100,
                    'open': float(d.get('f46', 0)) / 100,
                    'high': float(d.get('f44', 0)) / 100,
                    'low': float(d.get('f45', 0)) / 100,
                    'volume': int(d.get('f47', 0)),
                    'market_cap': float(d.get('f57', 0)) / 100000000,
                    'yesterday_close': float(d.get('f60', 0)) / 100,
                    'change_percent': float(d.get('f170', 0)) / 100
                }
            else:
                if HAS_RATE_LIMITER:
                    eastmoney_circuit_breaker.record_failure()
                logger.warning(f"东方财富API返回空数据: {stock_code}")

        except Exception as e:
            logger.error(f"东方财富API失败: {e}", exc_info=True)
            if HAS_RATE_LIMITER:
                eastmoney_circuit_breaker.record_failure()

        return None

    @staticmethod
    def fetch_from_tencent(stock_code: str) -> Optional[Dict[str, Any]]:
        """从腾讯获取数据（带熔断保护）"""
        if HAS_RATE_LIMITER and not tencent_circuit_breaker.can_execute():
            logger.warning("腾讯API熔断中，跳过请求")
            return None

        try:
            tencent_code = convert_to_tencent_code(stock_code)
            url = f'http://qt.gtimg.cn/q={tencent_code}'

            if HAS_RATE_LIMITER:
                response = api_client.get(url, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                })
            else:
                response = requests.get(url, timeout=5, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                })

            text = response.text
            match = re.search(r'v_(?:sh|sz)(\d+)="([^"]+)"', text)

            if match:
                fields = match.group(2).split('~')
                if HAS_RATE_LIMITER:
                    tencent_circuit_breaker.record_success()

                logger.info(f"腾讯数据获取成功: {stock_code}")
                return {
                    'name': fields[1],
                    'current_price': float(fields[3]),
                    'open': float(fields[4]),
                    'high': float(fields[5]),
                    'low': float(fields[6]),
                    'volume': int(float(fields[7])),
                    'market_cap': float(fields[15]) if len(fields) > 15 else 0,
                    'yesterday_close': float(fields[2]),
                    'change_percent': float(fields[32]) if len(fields) > 32 else 0
                }
            else:
                if HAS_RATE_LIMITER:
                    tencent_circuit_breaker.record_failure()
                logger.warning(f"腾讯API返回格式异常: {stock_code}")

        except Exception as e:
            logger.error(f"腾讯API失败: {e}", exc_info=True)
            if HAS_RATE_LIMITER:
                tencent_circuit_breaker.record_failure()

        return None

    @staticmethod
    def fetch_from_sina(stock_code: str) -> Optional[Dict[str, Any]]:
        """从新浪财经获取数据"""
        try:
            sina_code = convert_to_tencent_code(stock_code)
            url = f'https://hq.sinajs.cn/list={sina_code}'
            headers = {'Referer': 'https://finance.sina.com.cn'}

            response = requests.get(url, timeout=5, headers=headers)
            text = response.text

            match = re.search(r'var hq_str_(?:sh|sz)(\d+)="([^"]*)"', text)
            if match and match.group(2):
                fields = match.group(2).split(',')
                if len(fields) >= 8:
                    logger.info(f"新浪数据获取成功: {stock_code}")
                    return {
                        'name': fields[0],
                        'current_price': float(fields[3]),
                        'open': float(fields[1]),
                        'high': float(fields[4]),
                        'low': float(fields[5]),
                        'volume': int(float(fields[8])),
                        'market_cap': 0,
                        'yesterday_close': float(fields[2]),
                        'change_percent': float(fields[3]) / float(fields[2]) * 100 - 100 if float(fields[2]) > 0 else 0
                    }
            logger.warning(f"新浪API返回格式异常: {stock_code}")
        except Exception as e:
            logger.error(f"新浪API失败: {e}")

        return None

    @staticmethod
    def fetch_from_163(stock_code: str) -> Optional[Dict[str, Any]]:
        """从网易财经获取数据"""
        try:
            url = f'http://api.money.126.net/data/feed/{convert_to_tencent_code(stock_code)}'
            response = requests.get(url, timeout=5)
            data = response.json()

            key = list(data.keys())[0] if data else None
            if key and data[key]:
                d = data[key]
                logger.info(f"网易数据获取成功: {stock_code}")
                return {
                    'name': d.get('name', ''),
                    'current_price': float(d.get('price', 0)),
                    'open': float(d.get('open', 0)),
                    'high': float(d.get('high', 0)),
                    'low': float(d.get('low', 0)),
                    'volume': int(d.get('volume', 0)),
                    'market_cap': 0,
                    'yesterday_close': float(d.get('yestclose', 0)),
                    'change_percent': float(d.get('updown', 0)) / float(d.get('yestclose', 1)) * 100
                }
            logger.warning(f"网易API返回空数据: {stock_code}")
        except Exception as e:
            logger.error(f"网易API失败: {e}")

        return None

    @staticmethod
    def fetch_from_akshare(stock_code: str) -> Optional[Dict[str, Any]]:
        """从AkShare获取数据"""
        try:
            import akshare as ak
            code = stock_code[2:] if stock_code.startswith(('sh', 'sz')) else stock_code

            df = ak.stock_zh_a_spot_em()
            stock_row = df[df['代码'] == code]

            if not stock_row.empty:
                row = stock_row.iloc[0]
                logger.info(f"AkShare数据获取成功: {stock_code}")
                return {
                    'name': row['名称'],
                    'current_price': float(row['最新价']),
                    'open': float(row['开盘价']),
                    'high': float(row['最高价']),
                    'low': float(row['最低价']),
                    'volume': int(row['成交量']),
                    'market_cap': float(row['总市值']) / 100000000,
                    'yesterday_close': float(row['昨收']),
                    'change_percent': float(row['涨跌幅'])
                }
            logger.warning(f"AkShare未找到股票: {stock_code}")
        except Exception as e:
            logger.error(f"AkShare失败: {e}")

        return None

    @staticmethod
    def fetch_historical_from_eastmoney(stock_code: str, days: int = 60) -> Optional[List[Dict[str, Any]]]:
        """从东方财富获取历史K线数据"""
        try:
            secid = convert_to_eastmoney_code(stock_code)
            url = f'https://push2his.eastmoney.com/api/qt/stock/kline/get?secid={secid}&fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=101&fqt=0&end=20500101&lmt={days}'

            response = requests.get(url, timeout=10, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            data = response.json()

            if data.get('data') and data['data'].get('klines'):
                klines = data['data']['klines']
                prices = []
                for line in klines:
                    parts = line.split(',')
                    if len(parts) >= 6:
                        prices.append({
                            'date': parts[0],
                            'open': float(parts[1]),
                            'close': float(parts[2]),
                            'high': float(parts[3]),
                            'low': float(parts[4]),
                            'volume': int(float(parts[5]))
                        })
                logger.info(f"历史数据获取成功: {stock_code}, {len(prices)}条")
                return prices
            logger.warning(f"历史数据API返回空: {stock_code}")
        except Exception as e:
            logger.error(f"东方财富历史数据失败: {e}")

        return None

    @staticmethod
    def fetch_all_data(stock_code: str) -> tuple:
        """
        多层级数据获取 - 5层冗余

        Args:
            stock_code: 股票代码

        Returns:
            (数据, 历史数据, 数据源名称) 元组
        """
        sources = [
            ('eastmoney', DataFetcher.fetch_from_eastmoney),
            ('tencent', DataFetcher.fetch_from_tencent),
            ('sina', DataFetcher.fetch_from_sina),
            ('163', DataFetcher.fetch_from_163),
            ('akshare', DataFetcher.fetch_from_akshare)
        ]

        data = None
        source_name = None

        for name, fetch_func in sources:
            try:
                data = fetch_func(stock_code)
                if data is not None:
                    source_name = name
                    logger.info(f"数据获取成功: {name}")
                    break
            except Exception as e:
                logger.warning(f"数据源 {name} 失败: {e}")
                continue

        historical = DataFetcher.fetch_historical_from_eastmoney(stock_code)

        return data, historical, source_name


def monte_carlo_simulation(stock_code: str, days: int = 7, simulations: int = 10000) -> Optional[Dict[str, Any]]:
    """
    蒙特卡洛模拟股票未来价格

    Args:
        stock_code: 股票代码
        days: 模拟天数
        simulations: 模拟次数

    Returns:
        模拟结果字典
    """
    data, historical, source = DataFetcher.fetch_all_data(stock_code)

    if data is None:
        logger.error(f"无法获取股票数据: {stock_code}")
        return None

    if historical and len(historical) >= 30:
        returns = []
        for i in range(1, len(historical)):
            ret = (historical[i]['close'] - historical[i-1]['close']) / historical[i-1]['close']
            returns.append(ret)

        mean_return = np.mean(returns)
        std_return = np.std(returns)
        current_price = historical[-1]['close']

        today_data = {
            'open': historical[-1]['open'],
            'high': historical[-1]['high'],
            'low': historical[-1]['low'],
            'volume': int(historical[-1]['volume'] / 10000),
            'market_cap': data.get('market_cap', 0),
            'yesterday_close': historical[-2]['close'] if len(historical) > 1 else current_price
        }
    else:
        mean_return = 0.001
        std_return = 0.02
        current_price = data['current_price']
        today_data = {
            'open': data['open'],
            'high': data['high'],
            'low': data['low'],
            'volume': int(data['volume'] / 10000),
            'market_cap': data.get('market_cap', 0),
            'yesterday_close': data['yesterday_close']
        }

    # 运行模拟
    simulation_results = []
    for _ in range(simulations):
        daily_returns = np.random.normal(mean_return, std_return, days)
        price_series = [current_price]
        for ret in daily_returns:
            price_series.append(price_series[-1] * (1 + ret))
        simulation_results.append(price_series[-1])

    sim_array = np.array(simulation_results)
    predicted_price = np.median(sim_array)
    price_5th = np.percentile(sim_array, 5)
    price_95th = np.percentile(sim_array, 95)

    change_pct = ((predicted_price - current_price) / current_price) * 100

    # 生成建议
    if change_pct > 5:
        suggestion = "强烈看多"
        suggestion_detail = f"价格¥{current_price:.2f}具有较大上涨空间，建议分批买入，仓位30-50%，止损¥{price_5th:.2f}"
        suggestion_color = "#FF6B00"
    elif change_pct > 2:
        suggestion = "中等"
        suggestion_detail = f"价格¥{current_price:.2f}位于支撑附近，建议分批买入，仓位30-50%，止损¥{price_5th:.2f}"
        suggestion_color = "#FF9500"
    elif change_pct > -2:
        suggestion = "观望"
        suggestion_detail = "技术面良好，价格处于震荡区间，具备较好安全边际。趋势向上，建议分批买入。"
        suggestion_color = "#999999"
    else:
        suggestion = "谨慎"
        suggestion_detail = "价格面临下行压力，建议观望或减仓，注意控制仓位，严格止损。"
        suggestion_color = "#999999"

    logger.info(f"蒙特卡洛模拟完成: {stock_code}, 预测价格: {predicted_price:.2f}")

    return {
        "current_price": round(current_price, 2),
        "predicted_price": round(predicted_price, 2),
        "change_pct": round(change_pct, 2),
        "price_range": {
            "low": round(price_5th, 2),
            "high": round(price_95th, 2)
        },
        "support": round(price_5th * 0.98, 2),
        "resistance": round(price_95th * 1.02, 2),
        "suggestion": suggestion,
        "suggestion_detail": suggestion_detail,
        "suggestion_color": suggestion_color,
        "today_data": {
            "open": round(today_data['open'], 2),
            "high": round(today_data['high'], 2),
            "low": round(today_data['low'], 2),
            "volume": today_data['volume'],
            "market_cap": round(today_data['market_cap'], 2),
            "yesterday_close": round(today_data['yesterday_close'], 2)
        },
        "data_source": source
    }


# ============================================================================
# API 路由
# ============================================================================

@app.route('/api/stock-analysis', methods=['GET'])
@error_handler
def stock_analysis():
    """股票分析 API"""
    stock_code = request.args.get('code', 'sh600519')
    logger.info(f"股票分析请求: {stock_code}")

    result = monte_carlo_simulation(stock_code)
    if result is None:
        raise create_stock_not_found_error(stock_code)

    return jsonify(api_response(data=result))


@app.route('/api/hot-sectors', methods=['GET'])
@error_handler
def hot_sectors():
    """获取热门板块及精选股票"""
    logger.info("热门板块请求")

    try:
        url = 'https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=50&po=1&np=1&fltt=2&invt=2&fid=f62&fs=m:90+t:2&fields=f12,f14,f3,f62,f8,f20,f184'
        response = requests.get(url, timeout=10, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        data = response.json()

        if not data.get('data') or not data['data'].get('diff'):
            raise AppError(ErrorCode.API_RESPONSE_INVALID, "无法获取板块数据")

        sectors = []
        for item in data['data']['diff'].values():
            main_force_net = float(item.get('f62', 0))
            if main_force_net > 10_000_000:
                sectors.append({
                    "sector": {
                        "code": item.get('f12', ''),
                        "name": item.get('f14', ''),
                        "score": min(100, max(0, 50 + float(item.get('f3', 0)) * 2)),
                        "changePercent": float(item.get('f3', 0)),
                        "dimensions": {
                            "momentum": min(100, max(0, 50 + float(item.get('f3', 0)) * 2)),
                            "capital": min(100, max(0, 50 + main_force_net / 1e8)),
                            "technical": min(100, float(item.get('f8', 0)) * 10),
                            "fundamental": min(100, max(0, 50 + float(item.get('f184', 50)) - 50))
                        },
                        "trend": "强势热点" if float(item.get('f3', 0)) > 3 else "持续热点" if float(item.get('f3', 0)) > 0 else "观察",
                        "metrics": {
                            "mainForceNet": main_force_net,
                            "turnoverRate": float(item.get('f8', 0)),
                            "rsi": float(item.get('f184', 50)),
                            "marketValue": float(item.get('f20', 0)),
                            "peRatio": 0
                        }
                    },
                    "constituents": [],
                    "selectedStocks": [],
                    "analysisTimestamp": datetime.now().isoformat(),
                    "dataQuality": {
                        "sectorValid": True,
                        "constituentsCount": 0,
                        "selectedCount": 0,
                        "isRealData": True
                    }
                })

        sectors = sectors[:6]
        logger.info(f"热门板块获取成功: {len(sectors)}个")

        return jsonify(api_response(data=sectors))

    except AppError:
        raise
    except Exception as e:
        logger.error(f"获取热门板块失败: {e}", exc_info=True)
        raise AppError(ErrorCode.API_REQUEST_FAILED, "获取热门板块失败", original_error=e)


@app.route('/api/health', methods=['GET'])
@error_handler
def health_check():
    """健康检查"""
    try:
        test_data = DataFetcher.fetch_from_eastmoney('000001')
        if test_data:
            logger.debug("健康检查通过")
            return jsonify(api_response(data={
                "status": "healthy",
                "dataSource": "eastmoney",
                "connection": "ok"
            }))
    except Exception as e:
        logger.error(f"健康检查失败: {e}")

    raise AppError(ErrorCode.API_UNAVAILABLE, "数据连接异常")


@app.route('/api/test', methods=['GET'])
@error_handler
def test():
    """测试接口"""
    return jsonify(api_response(message="Sonata API running"))


@app.route('/api/stock/<stock_code>/monte-carlo', methods=['GET'])
@error_handler
def get_stock_monte_carlo(stock_code: str):
    """获取个股蒙特卡洛分析"""
    logger.info(f"蒙特卡洛分析请求: {stock_code}")

    stock_data = DataFetcher.fetch_from_eastmoney(stock_code)
    if not stock_data:
        stock_data = DataFetcher.fetch_from_tencent(stock_code)

    if not stock_data:
        raise create_stock_not_found_error(stock_code)

    mc_result = monte_carlo_simulation(stock_code)
    if not mc_result:
        raise AppError(ErrorCode.ANALYSIS_FAILED, "蒙特卡洛模拟失败")

    return jsonify(api_response(data={
        "stock": {
            "code": stock_code,
            "name": stock_data.get('name', ''),
            "currentPrice": stock_data.get('current_price', 0)
        },
        "monteCarlo": {
            "scenarios": [
                {
                    "type": "乐观",
                    "probability": 25,
                    "priceRange": [mc_result.get('predicted_price', 0) * 1.05, mc_result.get('predicted_price', 0) * 1.15],
                    "expectedReturn": 10.0,
                    "description": f"价格有25%概率上涨"
                },
                {
                    "type": "基准",
                    "probability": 50,
                    "priceRange": [mc_result.get('predicted_price', 0) * 0.95, mc_result.get('predicted_price', 0) * 1.05],
                    "expectedReturn": 0.0,
                    "description": "价格在基准区间震荡"
                },
                {
                    "type": "悲观",
                    "probability": 25,
                    "priceRange": [mc_result.get('predicted_price', 0) * 0.85, mc_result.get('predicted_price', 0) * 0.95],
                    "expectedReturn": -10.0,
                    "description": "价格有25%概率下跌"
                }
            ],
            "upProbability": 50 + mc_result.get('change_pct', 0),
            "downProbability": 50 - mc_result.get('change_pct', 0),
            "expectedPrice": mc_result.get('predicted_price', 0),
            "riskRewardRatio": 1.0,
            "suggestion": mc_result.get('suggestion', ''),
            "suggestionDetail": mc_result.get('suggestion_detail', '')
        }
    }))


# ============================================================================
# 主程序入口
# ============================================================================

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'

    logger.info(f"Starting Flask backend on http://0.0.0.0:{port}")
    logger.info(f"Debug mode: {debug}")

    app.run(host='0.0.0.0', port=port, debug=debug, threaded=True)
