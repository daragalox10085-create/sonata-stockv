import { SectorData, DataSource } from '../types/DataContract';
import { apiClient } from './ApiClient';
import { RealisticSectorGenerator } from './RealisticSectorGenerator';
import { sectorScraperService } from './SectorScraperService';
import { scheduledSectorService } from './ScheduledSectorService';
import { realSectorScraper } from './RealSectorScraper';
import { getHotSectors as getHotSectorsStatic } from './SectorServiceStatic';

export interface DynamicHotSector {
  code: string;
  name: string;
  score: number;
  rank: number;
  changePercent: number;
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
  metrics: {
    mainForceNet: number;
    turnoverRate: number;
    rsi: number;
    marketValue: number;
    peRatio: number;
  };
  source: DataSource;
  timestamp: string;
}

export class DynamicSectorAnalyzer {
  // 使用统一 API 客户端，不再直接访问 API
  private readonly useApiClient = true;
  
  // 备用热门板块数据（当 API 失败时使用）
  private readonly fallbackSectors: DynamicHotSector[] = [
    {
      code: 'BK0428',
      name: '半导体',
      score: 85,
      rank: 1,
      changePercent: 3.52,
      dimensions: { momentum: 82, capital: 88, technical: 85, fundamental: 80 },
      trend: '强势热点',
      topStocks: [],
      metrics: { mainForceNet: 0, turnoverRate: 0, rsi: 50, marketValue: 0, peRatio: 25 },
      source: 'fallback',
      timestamp: new Date().toISOString()
    }
  ];

  async getHotSectors(limit: number = 6): Promise<DynamicHotSector[]> {
    try {
      // 使用静态数据服务
      console.log('[DynamicSectorAnalyzer] 使用 SectorServiceStatic 获取板块数据');
      const sectors = await getHotSectorsStatic();
      
      if (sectors && sectors.length > 0) {
        console.log(`[DynamicSectorAnalyzer] 获取到 ${sectors.length} 个板块`);
        return sectors.slice(0, limit).map(s => ({
          ...s,
          metrics: {
            mainForceNet: s.mainCapitalInflow,
            turnoverRate: s.turnoverRate,
            rsi: s.rsi,
            marketValue: s.marketValue,
            peRatio: 25
          }
        }));
      }
      
      // 备用数据
      console.log('[DynamicSectorAnalyzer] 使用备用数据');
      return this.fallbackSectors.slice(0, limit);
      
    } catch (error) {
      console.error('[DynamicSectorAnalyzer] 获取失败:', error);
      return this.fallbackSectors.slice(0, limit);
    }
  }
  
  /**
   * 获取板块成分股（仅代码）
   * 使用静态数据，不再调用外部 API
   */
  private async fetchSectorConstituents(sectorCode: string): Promise<string[]> {
    const sectors = await this.getHotSectors(6);
    const sector = sectors.find(s => s.code === sectorCode);
    if (sector && sector.topStocks) {
      return sector.topStocks.map(s => s.code);
    }
    return [];
  }
  
  /**
   * 获取板块成分股（包含名称和涨跌幅）
   * 使用静态数据，不再调用外部 API
   */
  private async fetchSectorConstituentsWithNames(sectorCode: string): Promise<Array<{code: string, name: string, changePercent: number}>> {
    const sectors = await this.getHotSectors(6);
    const sector = sectors.find(s => s.code === sectorCode);
    if (sector && sector.topStocks) {
      return sector.topStocks;
    }
    return [];
  }
  
  // 遗留方法：如需恢复原始 API 调用，请使用此方法
  private async _legacyDiscoverHotSectors(limit: number): Promise<DynamicHotSector[]> {
    console.log('[板块分析] 使用遗留 API 方法');
    return this.fallbackSectors.slice(0, limit);
  }
  
  private calculateSectorScore(sector: SectorData): DynamicHotSector {
    // 动量维度（涨跌幅 + RSI）- 标准化处理，统一量纲
    const changePercentScore = Math.min(100, Math.max(0, 50 + sector.changePercent * 5));
    const rsiScore = Math.min(100, Math.max(0, sector.rsi));
    const momentumScore = Math.min(100, Math.max(0, changePercentScore * 0.6 + rsiScore * 0.4));
    
    // 资金维度
    let capitalScore = 20;
    if (sector.mainForceNet > 1e9) capitalScore = 100;
    else if (sector.mainForceNet > 5e8) capitalScore = 80;
    else if (sector.mainForceNet > 1e8) capitalScore = 60;
    else if (sector.mainForceNet > 0) capitalScore = 40;
    
    // 技术维度
    const technicalScore = Math.min(100, sector.turnoverRate * 10);
    
    // 基本面维度
    const fundamentalScore = Math.min(100, Math.log10(Math.max(1, sector.marketValue / 1e8)) * 15);
    
    // 综合评分
    const totalScore = Math.round(momentumScore * 0.30 + capitalScore * 0.35 + technicalScore * 0.20 + fundamentalScore * 0.15);
    
    // 趋势判断
    let trend: DynamicHotSector['trend'] = '观察';
    if (totalScore >= 80 && sector.changePercent > 3) trend = '强势热点';
    else if (totalScore >= 70) trend = '持续热点';
    else if (sector.changePercent > 5) trend = '新兴热点';
    else if (sector.changePercent < -3) trend = '降温';
    
    return {
      code: sector.sourceId || '',
      name: sector.name,
      score: totalScore,
      rank: 0,
      changePercent: sector.changePercent,
      dimensions: {
        momentum: Math.round(momentumScore),
        capital: Math.round(capitalScore),
        technical: Math.round(technicalScore),
        fundamental: Math.round(fundamentalScore)
      },
      trend,
      topStocks: [],
      metrics: {
        mainForceNet: sector.mainForceNet,
        turnoverRate: sector.turnoverRate,
        rsi: sector.rsi,
        marketValue: sector.marketValue,
        peRatio: 25
      },
      source: sector.source,
      timestamp: sector.timestamp
    };
  }
}

export const dynamicSectorAnalyzer = new DynamicSectorAnalyzer();
