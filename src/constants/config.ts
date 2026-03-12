/**
 * 配置常量
 */

// 股票名称映射
export const STOCK_NAME_MAP: Record<string, string> = {
  '513310': '中韩半导体 ETF',
  '600519': '贵州茅台',
  '000858': '五粮液',
  '300750': '宁德时代',
  '002594': '比亚迪',
  '510300': '沪深 300ETF'
};

// 股票总股本映射（单位：股）
export const STOCK_TOTAL_SHARES_MAP: Record<string, number> = {
  '600519': 1250000000,
  '000858': 3880000000,
  '300750': 4400000000,
  '002594': 2900000000,
  '510300': 8000000000,
  '513310': 1000000000
};

// 默认总股本
export const DEFAULT_TOTAL_SHARES = 100000000;

// 交易比率配置
export const TRADING_RATIO_CONFIG = {
  DEFAULT_BUY_RATIO: 0.95,
  DEFAULT_STOP_LOSS_RATIO: 0.92,
  DEFAULT_TAKE_PROFIT_1_RATIO: 1.05,
  DEFAULT_TAKE_PROFIT_2_RATIO: 1.10
};

// 量化评分阈值
export const QUANT_SCORE_THRESHOLDS = {
  BUY_THRESHOLD: 60,
  HOLD_MIN_THRESHOLD: 40,
  HOLD_MAX_THRESHOLD: 60,
  SELL_THRESHOLD: 40
};

// 维度权重
export const DIMENSION_WEIGHTS = {
  TREND: 0.25,
  POSITION: 0.20,
  MOMENTUM: 0.20,
  VOLUME: 0.15,
  SENTIMENT: 0.20
};

// 斐波那契数列
export const FIBONACCI_LEVELS = [0.236, 0.382, 0.5, 0.618, 0.786];
export const FIBONACCI_EXTENSIONS = [1.236, 1.382, 1.5, 1.618, 1.786];

// 斐波那契评分配置
export const FIBONACCI_SCORE_CONFIG = {
  SUPPORT_WEIGHT: 0.6,
  RESISTANCE_WEIGHT: 0.4
};

// 均线周期
export const MA_PERIODS = {
  MA5: 5,
  MA10: 10,
  MA20: 20,
  MA60: 60
};

// MACD 配置
export const MACD_CONFIG = {
  FAST_PERIOD: 12,
  SLOW_PERIOD: 26,
  SIGNAL_PERIOD: 9
};

// RSI 配置
export const RSI_CONFIG = {
  PERIOD: 14,
  OVERBOUGHT: 70,
  OVERSOLD: 30
};

// 支撑阻力配置
export const SUPPORT_RESISTANCE_CONFIG = {
  SUPPORT_RATIO: 0.95,
  RESISTANCE_RATIO: 1.05
};

// 盈亏比评分配置
export const RISK_REWARD_SCORE_CONFIG = {
  EXCELLENT_THRESHOLD: 3,
  GOOD_THRESHOLD: 2,
  FAIR_THRESHOLD: 1
};

// 平均日成交量
export const AVG_DAILY_VOLUME = 10000000;

// 成交量比率配置
export const VOLUME_RATIO_CONFIG = {
  HIGH_THRESHOLD: 2,
  LOW_THRESHOLD: 0.5
};

// 存储键前缀
export const STORAGE_KEY_PREFIX = 'danny_road_';

// 获取存储键
export function getStorageKey(key: string): string {
  return `${STORAGE_KEY_PREFIX}${key}`;
}

// API 超时配置
export const API_TIMEOUT_CONFIG = {
  TENCENT: 5000,
  EASTMONEY: 5000,
  SINA_KLINE: 10000
};

// 最大 API 日志数
export const MAX_API_LOGS = 100;
