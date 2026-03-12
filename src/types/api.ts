/**
 * API 相关类型定义
 */

export interface StockSearchResult {
  code: string;
  name: string;
  market: string;
}

export interface ApiLog {
  timestamp: string;
  symbol: string;
  apiName: string;
  status: 'success' | 'error' | 'timeout';
  duration: number;
  errorMessage?: string;
}

export interface ApiConfig {
  name: string;
  url: (symbol: string, ...args: any[]) => string;
  timeout: number;
}

export interface TrendBreakdown {
  ma: number;
  macd: number;
  trendStrength: number;
}

export interface PositionBreakdown {
  supportResistance: number;
  fibonacci: number;
  historicalHighLow: number;
}

export interface MomentumBreakdown {
  rsi: number;
  volumeRatio: number;
  priceChangeRate: number;
}

export interface SentimentBreakdown {
  fundFlow: number;
  marketHeat: number;
}
