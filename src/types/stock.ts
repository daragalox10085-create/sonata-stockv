/**
 * 股票数据类型定义
 */

export interface KLinePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockData {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  marketCap: number;
  kLineData: KLinePoint[];
  quantScore: number;
  quantSummary: string;
  detailedAdvice: string;
  support: number;
  resistance: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  importance: 'high' | 'medium' | 'low';
  trendAnalysis: string;
  supportPrice: number;
  resistancePrice: number;
  actionAdvice: string;
  riskWarning: string;
  analysis: {
    trend: { score: number; reason: string; };
    position: { score: number; reason: string; };
    momentum: { score: number; reason: string; };
    volume: { score: number; reason: string; };
    sentiment: { 
      score: number; 
      reason: string; 
      data: { 
        policy: number; 
        fund: number; 
        tech: number; 
        emotion: number; 
      }; 
    };
    trendBreakdown?: { 
      ma: number; 
      macd: number; 
      trendStrength: number; 
    };
    positionBreakdown?: { 
      supportResistance: number; 
      fibonacci: number; 
      historicalHighLow: number; 
    };
    momentumBreakdown?: { 
      rsi: number; 
      volumeRatio: number; 
      priceChangeRate: number; 
    };
    sentimentBreakdown?: { 
      fundFlow: number; 
      marketHeat: number; 
    };
    riskRewardScore?: { 
      score: number; 
      reason: string; 
    };
  };
  dataSource: string;
  updateTime?: string;
  dataQuality: 'real' | 'fallback' | 'error';
}
