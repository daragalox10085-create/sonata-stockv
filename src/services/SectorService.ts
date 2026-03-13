/**
 * SectorService - 热门板块服务
 * 规范代码结构，使用配置管理，避免Magic Number
 */

import { StockConfig } from '../config/stock.config';
import { Sector, HotSector } from '../models/sector.model';

export class SectorService {
  private readonly EASTMONEY_BASE = StockConfig.DATA_SOURCES.EASTMONEY.BASE_URL;
  private cache: Map<string, { data: HotSector[]; timestamp: number }> = new Map();
  
  /**
   * 获取实时热门板块
   */
  async getHotSectors(): Promise<HotSector[]> {
    const cacheKey = 'hot_sectors';
    const cached = this.cache.get(cacheKey);
    
    // 检查缓存是否有效
    if (cached && Date.now() - cached.timestamp < StockConfig.HOT_SECTORS.UPDATE_INTERVAL * 1000) {
      console.log('[SectorService] 使用缓存数据');
      return cached.data;
    }

    try {
      // 从数据源获取板块数据
      const sectors = await this.fetchSectorData();
      
      // 应用筛选条件
      const filteredSectors = this.filterHotSectors(sectors);
      
      // 按热度排序并取前N个
      const hotSectors = this.sortAndLimitSectors(filteredSectors);
      
      // 获取成分股
      for (const sector of hotSectors) {
        try {
          const constituents = await this.fetchSectorConstituents(sector.code);
          sector.topStocks = constituents.slice(0, 6).map(stock => ({
            code: stock.code,
            name: stock.name,
            changePercent: stock.changePercent
          }));
        } catch (e) {
          console.warn(`[SectorService] 获取${sector.name}成分股失败:`, e);
          sector.topStocks = [];
        }
      }
      
      // 缓存结果
      this.cache.set(cacheKey, { data: hotSectors, timestamp: Date.now() });
      
      return hotSectors;
    } catch (error) {
      console.error('[SectorService] 获取热门板块失败:', error);
      // 如果有缓存，返回过期缓存
      if (cached) return cached.data;
      throw error;
    }
  }

  /**
   * 从东方财富获取板块数据
   */
  private async fetchSectorData(): Promise<Sector[]> {
    const url = `${this.EASTMONEY_BASE}/qt/clist/get?pn=1&pz=20&po=1&np=1&fltt=2&invt=2&fid=f62&fs=m:90+t:2&fields=f12,f14,f3,f62,f8,f20,f184`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    
    if (!data.data?.diff) {
      throw new Error('无数据返回');
    }
    
    return Object.values(data.data.diff).map((s: any) => ({
      code: s.f12,
      name: s.f14,
      changePercent: Number(s.f3) || 0,
      heatScore: Math.min(100, Math.max(0, 50 + Number(s.f3 || 0) * 2)),
      capitalInflow: Number(s.f62) || 0,
      mainCapitalInflow: Number(s.f62) || 0,
      turnoverRate: Number(s.f8) || 0,
      marketValue: Number(s.f20) || 0,
      rsi: Number(s.f184) || 50,
      momentumScore: Math.min(100, Math.max(0, 50 + Number(s.f3 || 0) * 2)),
      consecutiveDays: 1,
      source: 'eastmoney',
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * 筛选热门板块
   */
  private filterHotSectors(sectors: Sector[]): Sector[] {
    return sectors.filter(sector => {
      // 基础筛选条件
      const meetsHeatScore = sector.heatScore >= StockConfig.HOT_SECTORS.MIN_HEAT_SCORE;
      const meetsCapitalInflow = sector.mainCapitalInflow >= StockConfig.HOT_SECTORS.MIN_CAPITAL_INFLOW;
      const hasMainCapitalInflow = sector.mainCapitalInflow > 0;
      
      return meetsHeatScore && meetsCapitalInflow && hasMainCapitalInflow;
    });
  }

  /**
   * 排序并限制板块数量
   */
  private sortAndLimitSectors(sectors: Sector[]): HotSector[] {
    return sectors
      .sort((a, b) => {
        // 综合排序：热度分数 + 资金流入 + 动量
        const scoreA = this.calculateSectorScore(a);
        const scoreB = this.calculateSectorScore(b);
        return scoreB - scoreA;
      })
      .slice(0, StockConfig.HOT_SECTORS.TOP_N)
      .map(sector => this.enrichSectorData(sector));
  }

  /**
   * 计算板块综合评分
   */
  private calculateSectorScore(sector: Sector): number {
    const weights = {
      heat: 0.4,
      capital: 0.4,
      momentum: 0.2
    };
    
    // 归一化处理
    const normalizedHeat = sector.heatScore / 100;
    const normalizedCapital = Math.min(sector.mainCapitalInflow / 5000000000, 1);
    const normalizedMomentum = sector.momentumScore || 0.5;
    
    return (
      normalizedHeat * weights.heat +
      normalizedCapital * weights.capital +
      normalizedMomentum * weights.momentum
    ) * 100;
  }

  /**
   * 丰富板块数据
   */
  private enrichSectorData(sector: Sector): HotSector {
    // 计算各维度分数
    const changeScore = Math.min(100, Math.max(0, 50 + sector.changePercent * 5));
    const rsiScore = Math.min(100, Math.max(0, sector.rsi));
    const momentumScore = changeScore * 0.6 + rsiScore * 0.4;
    
    // 资金评分
    let capitalScore = 20;
    if (sector.mainCapitalInflow > 1e9) capitalScore = 100;
    else if (sector.mainCapitalInflow > 5e8) capitalScore = 80;
    else if (sector.mainCapitalInflow > 1e8) capitalScore = 60;
    else if (sector.mainCapitalInflow > 0) capitalScore = 40;
    
    // 技术评分
    const technicalScore = Math.min(100, sector.turnoverRate * 10);
    
    // 基本面评分
    const marketValueYi = sector.marketValue / 1e8;
    const fundamentalScore = Math.min(100, Math.log10(Math.max(1, marketValueYi)) * 15);
    
    // 综合评分
    const totalScore = Math.round(
      momentumScore * 0.30 +
      capitalScore * 0.35 +
      technicalScore * 0.20 +
      fundamentalScore * 0.15
    );
    
    // 趋势判断
    let trend: HotSector['trend'] = '观察';
    if (totalScore >= 80 && sector.changePercent > 3 && sector.mainCapitalInflow > 5e8) {
      trend = '强势热点';
    } else if (totalScore >= 70 && sector.mainCapitalInflow > 1e8) {
      trend = '持续热点';
    } else if (sector.changePercent > 5 && sector.mainCapitalInflow > 0) {
      trend = '新兴热点';
    } else if (sector.changePercent < -3 || sector.mainCapitalInflow < -5e8) {
      trend = '降温';
    }
    
    return {
      ...sector,
      score: totalScore,
      isHotSpot: sector.heatScore >= 70,
      isContinuousHot: sector.consecutiveDays >= 3,
      recommendation: this.generateSectorRecommendation(sector),
      dimensions: {
        momentum: Math.round(momentumScore),
        capital: Math.round(capitalScore),
        technical: Math.round(technicalScore),
        fundamental: Math.round(fundamentalScore)
      },
      trend,
      topStocks: []
    };
  }

  /**
   * 生成板块推荐
   */
  private generateSectorRecommendation(sector: Sector): string {
    if (sector.heatScore >= 80) return '强烈关注';
    if (sector.heatScore >= 70) return '重点关注';
    if (sector.heatScore >= 60) return '谨慎关注';
    return '一般关注';
  }

  /**
   * 获取板块成分股
   */
  private async fetchSectorConstituents(sectorCode: string): Promise<Array<{code: string; name: string; changePercent: number}>> {
    const url = `${this.EASTMONEY_BASE}/qt/clist/get?pn=1&pz=20&po=1&np=1&fltt=2&invt=2&fid=f12&fs=b:${sectorCode}&fields=f12,f14,f3`;
    
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        
        if (data.data?.diff && Object.keys(data.data.diff).length > 0) {
          return Object.values(data.data.diff).map((item: any) => ({
            code: item.f12 as string,
            name: item.f14 as string,
            changePercent: Number(item.f3) || 0
          }));
        }
        
        if (attempt === maxRetries) return [];
        
      } catch (error) {
        console.warn(`[SectorService] 获取成分股失败 ${sectorCode} (尝试 ${attempt}/${maxRetries})`);
        if (attempt === maxRetries) return [];
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    return [];
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const sectorService = new SectorService();