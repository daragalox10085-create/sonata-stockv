/**
 * 股票分析配置管理
 * 避免Magic Number，集中管理所有配置参数
 */

export const StockConfig = {
  // 热门板块配置
  HOT_SECTORS: {
    TOP_N: 6, // 获取前6个热门板块
    MIN_HEAT_SCORE: 60, // 最低热度分数
    MIN_CAPITAL_INFLOW: 100000000, // 最低资金流入（1亿）
    UPDATE_INTERVAL: 300, // 5分钟更新一次（秒）
  },
  
  // 六因子模型权重配置
  SIX_FACTOR_WEIGHTS: {
    VALUATION: 0.20, // 估值因子
    GROWTH: 0.20,    // 成长因子
    PROFITABILITY: 0.15, // 盈利能力
    QUALITY: 0.15,   // 质量因子
    MOMENTUM: 0.15,  // 动量因子
    TECHNICAL: 0.15, // 技术因子
  },
  
  // 技术面配置
  TECHNICAL_ANALYSIS: {
    SUPPORT_LEVEL_THRESHOLD: 0.05, // 距支撑位5%以内
    LOW_POSITION_THRESHOLD: 0.30,  // 位于历史低位30%区间
    RSI_OVERSOLD: 30,              // RSI超卖阈值
    RSI_OVERBOUGHT: 70,            // RSI超买阈值
    VOLUME_MULTIPLIER: 1.5,        // 成交量放大倍数
  },
  
  // 筛选阈值
  SCREENING_THRESHOLDS: {
    MIN_COMPOSITE_SCORE: 40,       // 最低综合评分（放宽到40）
    MIN_UPSIDE_POTENTIAL: 0.05,    // 最低上涨空间5%（放宽）
    MAX_DRAWDOWN_RISK: 0.20,       // 最大回撤风险20%（放宽）
  },
  
  // 数据源配置 - 使用 Cloudflare Functions 代理
  DATA_SOURCES: {
    SINA: {
      BASE_URL: '/api/sina',
      TIMEOUT: 5000,
    },
    EASTMONEY: {
      BASE_URL: '/api/eastmoney',
      TIMEOUT: 5000,
    },
    TENCENT: {
      BASE_URL: '/api/tencent',
      TIMEOUT: 5000,
    },
  },
} as const;

// 类型导出
export type StockConfigType = typeof StockConfig;
