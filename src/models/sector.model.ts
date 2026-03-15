/**
 * 板块数据模型
 */

export interface Sector {
  code: string;
  name: string;
  changePercent: number;
  heatScore: number;
  capitalInflow: number;
  mainCapitalInflow: number;
  turnoverRate: number;
  marketValue: number;
  rsi: number;
  momentumScore?: number;
  consecutiveDays: number;
  source: string;
  timestamp: string;
}

export interface HotSector extends Sector {
  score: number;  // 综合评分
  isHotSpot: boolean;
  isContinuousHot: boolean;
  recommendation: string;
  dimensions: {
    momentum: number;
    capital: number;
    technical: number;
    fundamental: number;
  };
  trend: '强势热点' | '持续热点' | '新兴热点' | '降温' | '观察';
  topStocks: Array<{
    code: string;
    name: string;
    changePercent: number;
  }>;
}

export interface SectorStock {
  code: string;
  name: string;
  sector: string;
  sectorCode: string;
  sectorHeat: number;
}
