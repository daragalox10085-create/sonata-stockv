/**
 * 数据真实性契约 - 所有数据必须遵循此接口
 * 禁止任何 source === 'none' 的数据流入业务层
 */

export type DataSource = 'eastmoney' | 'tencent' | 'sina' | 'cache' | 'none';

// K 线数据点
export interface KLinePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface DataVerification {
  source: DataSource;
  timestamp: string;
  isReal: boolean;
  checksum?: string;
}

export class DataIntegrityError extends Error {
  constructor(message: string, public readonly missingFields: string[]) {
    super(`[数据完整性错误] ${message}`);
    this.name = 'DataIntegrityError';
  }
}

/**
 * 数据验证守卫函数 - 在业务层入口处调用
 */
export function verifyRealData<T extends { source: DataSource }>(
  data: T | null,
  requiredFields: (keyof T)[]
): asserts data is T & { isReal: true } {
  if (!data) {
    throw new DataIntegrityError('数据获取失败，拒绝返回mock数据', ['entire object']);
  }
  if (data.source === 'none' || !data.source) {
    throw new DataIntegrityError('数据源标记为none，可能使用了fallback数据', ['source']);
  }
  const missing = requiredFields.filter(f => !data[f] && data[f] !== 0);
  if (missing.length > 0) {
    throw new DataIntegrityError(`字段缺失: ${missing.join(', ')}`, missing as string[]);
  }
}

// 股票数据接口
export interface StockQuote {
  symbol: string;
  code: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  close: number;
  // 估值指标
  pe: number;
  peTtm?: number;
  pb: number;
  ps?: number;
  peg: number;
  // 盈利能力
  roe: number;
  profitGrowth: number;
  revenueGrowth: number;
  // 市值
  marketCap: number;
  totalShares?: number;
  floatShares?: number;
  // 动量
  twentyDayChange?: number;
  sixtyDayChange?: number;
  volume?: number;
  // 资金流向
  mainForceNet?: number;
  source: DataSource;
  timestamp: string;
}

// 板块数据接口
export interface SectorData {
  code: string;
  name: string;
  changePercent: number;
  mainForceNet: number;
  turnoverRate: number;
  marketValue: number;
  rsi: number;
  source: DataSource;
  timestamp: string;
}

// 蒙特卡洛结果接口（概率一致性版本）
export interface MonteCarloResult {
  scenarios: Array<{
    type: '乐观' | '基准' | '悲观';
    probability: number;
    priceRange: [number, number];
    expectedReturn: number;
    description: string;
  }>;
  upProbability: number;
  downProbability: number;
  expectedPrice: number;
  riskRewardRatio: number;
  derivationSteps: string[];
  statistics: {
    median: number;
    mean: number;
    stdDev: number;
  };
}

// 选股推荐接口
export interface StockRecommendation {
  code: string;
  name: string;
  score: number;
  confidence: number;
  factors: {
    valuation: number;
    growth: number;
    profitability: number;
    quality: number;
    momentum: number;
    technical: number;
  };
  metrics: {
    pe: number;
    peg: number;
    pb: number;
    roe: number;
    profitGrowth: number;
    marketCap: number;
    currentPrice: number;
    support: number;
    resistance: number;
    distanceToSupport: number;
    upwardSpace: number;
  };
  recommendation: '强烈推荐' | '推荐' | '谨慎推荐' | '观望';
  analysis: string;
  sectorInfo?: {
    sectorCode: string;
    sectorName: string;
    sectorScore: number;
  };
}

// API 相关类型
export interface ApiLog {
  apiName: string;
  symbol: string;
  timestamp: string | Date;
  duration: number;
  status: 'success' | 'error' | 'timeout';
  errorMessage?: string;
  responseData?: any;
}

export interface ApiConfig {
  name: string;
  url: string | ((...args: any[]) => string);
  timeout: number;
  headers?: Record<string, string>;
}

export interface StockSearchResult {
  code: string;
  name: string;
  market: string;
  type?: string;
}

// 向后兼容的 StockData（包含 K 线数据）
export interface StockData extends StockQuote {
  kLineData?: KLinePoint[];
  quantScore?: number;
  quantSummary?: string;
  detailedAdvice?: string;
  analysis?: string | any;
  dataSource?: string;
  dataQuality?: 'real' | 'fallback';
  updateTime?: string;
  support?: number;
  resistance?: number;
  stopLoss?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  importance?: 'high' | 'medium' | 'low';
  trendAnalysis?: string;
  supportPrice?: number;
  resistancePrice?: number;
  actionAdvice?: string;
  riskWarning?: string;
  recommendation?: string;
  recommendationReason?: string;
}