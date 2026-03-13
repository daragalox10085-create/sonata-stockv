/**
 * HotSectorService - 热门板块实时数据服务
 * 从多个数据源获取真实热门板块数据
 */

import type { DynamicHotSector } from './DynamicSectorAnalyzer';

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
  private readonly EASTMONEY_BASE = 'https://push2.eastmoney.com/api';
  
  /**
   * 获取实时热门板块（按资金流入排序）
   */
  async fetchHotSectors(limit: number = 6): Promise<DynamicHotSector[]> {
    try {
      // 1. 获取板块列表（按主力净流入排序）
      const sectors = await this.fetchSectorListFromEastMoney();
      
      if (!sectors || sectors.length === 0) {
        console.warn('[热门板块] API返回空数据');
        return [];
      }
      
      console.log(`[热门板块] 获取到 ${sectors.length} 个板块`);
      
      // 2. 计算评分并排序
      const scoredSectors = sectors.map(s => this.calculateSectorScore(s));
      
      // 3. 获取前N个板块的成分股
      const topSectors = scoredSectors.slice(0, limit);
      
      for (const sector of topSectors) {
        try {
          const constituents = await this.fetchSectorConstituents(sector.code);
          sector.topStocks = constituents.slice(0, 6).map(stock => ({
            code: stock.code,
            name: stock.name,
            changePercent: stock.changePercent
          }));
        } catch (e) {
          console.warn(`[热门板块] 获取${sector.name}成分股失败:`, e);
          sector.topStocks = [];
        }
      }
      
      return topSectors;
      
    } catch (error) {
      console.error('[热门板块] 获取失败:', error);
      return [];
    }
  }
  
  /**
   * 从东方财富获取板块列表
   */
  private async fetchSectorListFromEastMoney(): Promise<SectorData[]> {
    // 获取行业板块，按主力净流入排序
    // fs=m:90+t:2 表示行业板块
    // fid=f62 表示按主力净流入排序
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
      mainForceNet: Number(s.f62) || 0,
      turnoverRate: Number(s.f8) || 0,
      marketValue: Number(s.f20) || 0,
      rsi: Number(s.f184) || 50,
      source: 'eastmoney',
      timestamp: new Date().toISOString()
    }));
  }
  
  /**
   * 计算板块综合评分
   */
  private calculateSectorScore(sector: SectorData): DynamicHotSector {
    // 动量评分（涨跌幅 + RSI）
    const changeScore = Math.min(100, Math.max(0, 50 + sector.changePercent * 5));
    const rsiScore = Math.min(100, Math.max(0, sector.rsi));
    const momentumScore = changeScore * 0.6 + rsiScore * 0.4;
    
    // 资金评分（主力净流入）
    // 将净流入转换为评分：>10亿=100分，>5亿=80分，>1亿=60分，>0=40分，<0=20分
    let capitalScore = 20;
    if (sector.mainForceNet > 1e9) capitalScore = 100;
    else if (sector.mainForceNet > 5e8) capitalScore = 80;
    else if (sector.mainForceNet > 1e8) capitalScore = 60;
    else if (sector.mainForceNet > 0) capitalScore = 40;
    
    // 技术评分（换手率）
    // 换手率 0-10% 映射到 0-100分
    const technicalScore = Math.min(100, sector.turnoverRate * 10);
    
    // 基本面评分（市值规模）
    // 市值越大分数越高
    const marketValueYi = sector.marketValue / 1e8; // 转换为亿
    const fundamentalScore = Math.min(100, Math.log10(Math.max(1, marketValueYi)) * 15);
    
    // 综合评分
    const totalScore = Math.round(
      momentumScore * 0.30 +
      capitalScore * 0.35 +
      technicalScore * 0.20 +
      fundamentalScore * 0.15
    );
    
    // 趋势判断
    let trend: DynamicHotSector['trend'] = '观察';
    if (totalScore >= 80 && sector.changePercent > 3 && sector.mainForceNet > 5e8) {
      trend = '强势热点';
    } else if (totalScore >= 70 && sector.mainForceNet > 1e8) {
      trend = '持续热点';
    } else if (sector.changePercent > 5 && sector.mainForceNet > 0) {
      trend = '新兴热点';
    } else if (sector.changePercent < -3 || sector.mainForceNet < -5e8) {
      trend = '降温';
    }
    
    return {
      code: sector.code,
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
        peRatio: 0
      },
      source: sector.source as any,
      timestamp: sector.timestamp
    };
  }
  
  /**
   * 获取板块成分股（包含名称和涨跌幅）
   */
  private async fetchSectorConstituents(sectorCode: string): Promise<Array<{code: string, name: string, changePercent: number}>> {
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
        console.warn(`[板块成分股] 获取失败 ${sectorCode} (尝试 ${attempt}/${maxRetries})`);
        if (attempt === maxRetries) return [];
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    return [];
  }
}

export const hotSectorService = new HotSectorService();
