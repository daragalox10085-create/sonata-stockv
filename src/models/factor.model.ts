/**
 * 六因子模型数据定义
 */

export interface FactorScores {
  valuation: number;     // 估值因子 (0-100)
  growth: number;       // 成长因子 (0-100)
  profitability: number; // 盈利能力 (0-100)
  quality: number;      // 质量因子 (0-100)
  momentum: number;     // 动量因子 (0-100)
  technical: number;    // 技术因子 (0-100)
}

export interface StockFactors {
  stockCode: string;
  stockName: string;
  sector: string;
  factors: FactorScores;
  compositeScore: number;
  lastUpdated: Date;
}

export interface FinancialData {
  peRatio?: number;
  pbRatio?: number;
  psRatio?: number;
  dividendYield?: number;
  revenueGrowth?: number;
  netProfitGrowth?: number;
  roeGrowth?: number;
  roe?: number;
  roa?: number;
  grossMargin?: number;
  netMargin?: number;
  debtToAsset?: number;
  operatingCashFlow?: number;
  netProfit?: number;
  receivablesTurnover?: number;
  sectorAvgPE?: number;
  sectorAvgPB?: number;
  sectorAvgPS?: number;
  sector?: string;
}

export interface TechnicalData {
  priceChange20d?: number;
  priceChange60d?: number;
  rsi?: number;
  distanceToSupport?: number;
  maAlignment?: number;
  volumeRatio?: number;
  bollingerPosition?: number;
}

export interface MarketData {
  indexPerformance?: number;
  currentPrice: number;
  historicalPrices: number[];
}
