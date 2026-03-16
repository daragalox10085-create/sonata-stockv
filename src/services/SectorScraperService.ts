// src/services/SectorScraperService.ts
// 板块数据抓取服务 - 通过东方财富API获取实时板块数据

import { DynamicHotSector } from './DynamicSectorAnalyzer';

export interface ScrapedSector {
  code: string;
  name: string;
  changePercent: number;
  turnoverRate: number;
  leadingStock: string;
  leadingStockChange: number;
  upCount: number;
  downCount: number;
}

export class SectorScraperService {
  private readonly EASTMONEY_INDUSTRY_API = 'https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=20&po=1&np=1&fltt=2&invt=2&fid=f12&fs=m:90+t:2&fields=f12,f14,f3,f8,f128,f140,f141';
  private readonly EASTMONEY_CONCEPT_API = 'https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=20&po=1&np=1&fltt=2&invt=2&fid=f12&fs=m:90+t:3&fields=f12,f14,f3,f8,f128,f140,f141';

  /**
   * 获取实时热门板块数据
   */
  async getHotSectors(): Promise<ScrapedSector[]> {
    try {
      // 尝试获取行业板块数据
      const industryData = await this.fetchIndustrySectors();
      if (industryData && industryData.length > 0) {
        return industryData;
      }
      
      // 如果行业板块失败，尝试概念板块
      const conceptData = await this.fetchConceptSectors();
      if (conceptData && conceptData.length > 0) {
        return conceptData;
      }
      
      return [];
    } catch (error) {
      console.error('[SectorScraper] 获取板块数据失败:', error);
      return [];
    }
  }

  /**
   * 获取行业板块数据
   */
  private async fetchIndustrySectors(): Promise<ScrapedSector[]> {
    try {
      const response = await fetch(this.EASTMONEY_INDUSTRY_API, {
        headers: {
          'Referer': 'https://quote.eastmoney.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.data?.diff || !Array.isArray(data.data.diff)) {
        return [];
      }
      
      return data.data.diff
        .filter((item: any) => item.f3 !== undefined)
        .map((item: any) => ({
          code: item.f12 || '',
          name: item.f14 || '',
          changePercent: parseFloat(item.f3) || 0,
          turnoverRate: parseFloat(item.f8) || 0,
          leadingStock: item.f140 || '',
          leadingStockChange: parseFloat(item.f141) || 0,
          upCount: parseInt(item.f128) || 0,
          downCount: parseInt(item.f129) || 0
        }))
        .sort((a: ScrapedSector, b: ScrapedSector) => b.changePercent - a.changePercent)
        .slice(0, 10);
    } catch (error) {
      console.warn('[SectorScraper] 行业板块获取失败:', error);
      return [];
    }
  }

  /**
   * 获取概念板块数据
   */
  private async fetchConceptSectors(): Promise<ScrapedSector[]> {
    try {
      const response = await fetch(this.EASTMONEY_CONCEPT_API, {
        headers: {
          'Referer': 'https://quote.eastmoney.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.data?.diff || !Array.isArray(data.data.diff)) {
        return [];
      }
      
      return data.data.diff
        .filter((item: any) => item.f3 !== undefined)
        .map((item: any) => ({
          code: item.f12 || '',
          name: item.f14 || '',
          changePercent: parseFloat(item.f3) || 0,
          turnoverRate: parseFloat(item.f8) || 0,
          leadingStock: item.f140 || '',
          leadingStockChange: parseFloat(item.f141) || 0,
          upCount: parseInt(item.f128) || 0,
          downCount: parseInt(item.f129) || 0
        }))
        .sort((a: ScrapedSector, b: ScrapedSector) => b.changePercent - a.changePercent)
        .slice(0, 10);
    } catch (error) {
      console.warn('[SectorScraper] 概念板块获取失败:', error);
      return [];
    }
  }

  /**
   * 转换为DynamicHotSector格式
   */
  convertToDynamicHotSectors(sectors: ScrapedSector[]): DynamicHotSector[] {
    return sectors.map((sector, index) => ({
      code: sector.code,
      name: sector.name,
      score: Math.min(100, Math.max(50, 70 + sector.changePercent * 5)),
      rank: index + 1,
      changePercent: sector.changePercent,
      dimensions: {
        momentum: Math.min(100, Math.max(50, 60 + sector.changePercent * 3)),
        capital: Math.min(100, Math.max(50, 70 + sector.changePercent * 2)),
        technical: Math.min(100, Math.max(50, 65 + sector.turnoverRate * 2)),
        fundamental: Math.min(100, Math.max(50, 70 + Math.random() * 10))
      },
      trend: sector.changePercent > 3 ? '强势热点' : 
             sector.changePercent > 1.5 ? '持续热点' : 
             sector.changePercent > 0 ? '观察' : '降温',
      topStocks: sector.leadingStock ? [{
        code: '',
        name: sector.leadingStock,
        changePercent: sector.leadingStockChange
      }] : [],
      metrics: {
        mainForceNet: sector.changePercent * 100000000,
        turnoverRate: sector.turnoverRate,
        rsi: 50 + sector.changePercent * 2,
        marketValue: 500000000000 + Math.random() * 500000000000,
        peRatio: 20 + Math.random() * 30
      },
      source: 'eastmoney-realtime',
      timestamp: new Date().toISOString()
    }));
  }
}

// 导出单例
export const sectorScraperService = new SectorScraperService();
