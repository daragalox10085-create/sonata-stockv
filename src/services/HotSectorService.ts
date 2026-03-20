/**
 * HotSectorService - 热门板块服务
 * 使用静态数据，每3天通过搜索更新
 */

import type { DynamicHotSector } from './DynamicSectorAnalyzer';
import { getHotSectors, getSectorDetail, getSectorConstituents } from './SectorServiceStatic';

export interface SectorData {
  code: string;
  name: string;
  changePercent: number;
  mainForceNet: number;
  turnoverRate: number;
  marketValue: number;
  rsi: number;
  source: string;
  timestamp: string;
}

export class HotSectorService {
  /**
   * 获取热门板块
   * 使用 SectorServiceStatic 的静态数据
   */
  async fetchHotSectors(limit: number = 6): Promise<DynamicHotSector[]> {
    try {
      console.log('[HotSectorService] 获取热门板块...');
      
      // 使用静态数据服务
      const sectors = await getHotSectors();
      
      if (!sectors || sectors.length === 0) {
        console.warn('[HotSectorService] 无板块数据');
        return [];
      }
      
      console.log(`[HotSectorService] 获取到 ${sectors.length} 个板块`);
      
      // 转换为 DynamicHotSector 格式
      return sectors.slice(0, limit).map(sector => ({
        code: sector.code,
        name: sector.name,
        score: sector.score,
        rank: 0, // 后面会重新排序
        changePercent: sector.changePercent,
        dimensions: sector.dimensions,
        trend: sector.trend,
        topStocks: sector.topStocks || [],
        metrics: {
          mainForceNet: sector.mainCapitalInflow,
          turnoverRate: sector.turnoverRate,
          rsi: sector.rsi,
          marketValue: sector.marketValue,
          peRatio: 25 // 默认值
        },
        source: 'static',
        timestamp: sector.timestamp
      }));
      
    } catch (error) {
      console.error('[HotSectorService] 获取失败:', error);
      return [];
    }
  }
}

export const hotSectorService = new HotSectorService();
