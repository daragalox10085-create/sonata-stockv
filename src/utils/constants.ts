// src/utils/constants.ts

// 算法配置
export const ALGORITHM_CONFIG = {
  LSTM: {
    id: 'lstm',
    name: 'LSTM深度学习',
    description: '基于长短期记忆网络的时序预测模型',
    defaultWeight: 0.35,
    minConfidenceThreshold: 60,
    maxConfidenceThreshold: 95,
  },
  XGBOOST: {
    id: 'xgboost',
    name: 'XGBoost集成学习',
    description: '基于梯度提升树的多因子评分模型',
    defaultWeight: 0.30,
    minConfidenceThreshold: 58,
    maxConfidenceThreshold: 92,
  },
  TIME_SERIES: {
    id: 'time_series',
    name: '时间序列分析',
    description: '基于ARIMA-GARCH的统计时序模型',
    defaultWeight: 0.20,
    minConfidenceThreshold: 55,
    maxConfidenceThreshold: 90,
  },
  MARKET_SENTIMENT: {
    id: 'market_sentiment',
    name: '市场情绪分析',
    description: '基于新闻情感和资金流向的情绪模型',
    defaultWeight: 0.15,
    minConfidenceThreshold: 50,
    maxConfidenceThreshold: 85,
  },
} as const;

// 共识阈值
export const CONSENSUS_THRESHOLDS = {
  HIGH: 0.75,      // 75%以上算法同意
  MEDIUM: 0.60,    // 60-75%算法同意
  LOW: 0.40,       // 40-60%算法同意
  CONFLICT: 0.40,  // 低于40%算法同意
} as const;

// 预测周期
export const TIME_HORIZONS = {
  SHORT_TERM: 5,   // 5天
  MEDIUM_TERM: 10, // 10天
  LONG_TERM: 20,   // 20天
} as const;

// 颜色配置
export const COLOR_SCHEME = {
  BULLISH: {
    primary: '#10b981',    // emerald-500
    light: '#d1fae5',      // emerald-100
    dark: '#059669',       // emerald-600
  },
  BEARISH: {
    primary: '#ef4444',    // red-500
    light: '#fee2e2',      // red-100
    dark: '#dc2626',       // red-600
  },
  NEUTRAL: {
    primary: '#6b7280',    // gray-500
    light: '#f3f4f6',      // gray-100
    dark: '#4b5563',       // gray-600
  },
  CONSENSUS: {
    high: '#10b981',       // emerald-500
    medium: '#f59e0b',     // amber-500
    low: '#6b7280',        // gray-500
    conflict: '#ef4444',   // red-500
  },
} as const;
