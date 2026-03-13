/**
 * 数据真实性契约 - 所有数据必须遵循此接口
 * 禁止任何 source === 'none' 的数据流入业务层
 */

export type DataSource = 'eastmoney' | 'tencent' | 'sina' | 'cache' | 'none';

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
  code: string;
  name: string;
  currentPrice: number;
  pe: number;
  peg: number;
  pb: number;
  roe: number;
  profitGrowth: number;
  revenueGrowth: number;
  marketCap: number;
  totalShares?: number;
  floatShares?: number;
  // 动量相关字段
  changePercent?: number;      // 当日涨跌幅%
  twentyDayChange?: number;    // 20日涨跌幅%
  sixtyDayChange?: number;     // 60日涨跌幅%
  volume?: number;             // 成交量
  source: DataSource;
  timestamp: string;
}

// 板块数据接口
export interface SectorData {
  code: string;
  name: string;
  changePercent: number;
  mainForceNet: number;  // 主力净流入（元）
  turnoverRate: number;  // 换手率%
  marketValue: number;   // 总市值
  rsi: number;          // RSI指标
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
    valuation: number;   // 估值 30%
    growth: number;      // 成长 20%
    scale: number;       // 规模 10%
    momentum: number;    // 动量 15%
    quality: number;     // 质量 10%
    support: number;     // 支撑 15%
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
