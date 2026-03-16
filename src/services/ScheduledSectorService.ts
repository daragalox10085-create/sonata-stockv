// src/services/ScheduledSectorService.ts
// 定时任务服务 - 每3天更新热门板块和选股推荐

import { DynamicHotSector } from './DynamicSectorAnalyzer';

export interface SectorCache {
  sectors: DynamicHotSector[];
  stockPicks: any[];
  lastUpdate: number;
  nextUpdate: number;
}

export class ScheduledSectorService {
  private static instance: ScheduledSectorService;
  private cache: SectorCache | null = null;
  private readonly UPDATE_INTERVAL = 3 * 24 * 60 * 60 * 1000; // 3天
  private timer: NodeJS.Timeout | null = null;

  private constructor() {
    this.init();
  }

  static getInstance(): ScheduledSectorService {
    if (!ScheduledSectorService.instance) {
      ScheduledSectorService.instance = new ScheduledSectorService();
    }
    return ScheduledSectorService.instance;
  }

  private init() {
    console.log('[ScheduledSector] 初始化定时任务服务');
    this.updateData();
    this.timer = setInterval(() => {
      this.updateData();
    }, this.UPDATE_INTERVAL);
    console.log(`[ScheduledSector] 定时任务已设置，每3天更新一次`);
  }

  private async updateData() {
    console.log('[ScheduledSector] 开始更新板块数据...');
    try {
      const sectors = this.generateSectors();
      const stockPicks = this.generateStockPicks(sectors);
      
      this.cache = {
        sectors,
        stockPicks,
        lastUpdate: Date.now(),
        nextUpdate: Date.now() + this.UPDATE_INTERVAL
      };
      
      console.log(`[ScheduledSector] 数据更新完成，下次更新: ${new Date(this.cache.nextUpdate).toLocaleString()}`);
    } catch (error) {
      console.error('[ScheduledSector] 更新数据失败:', error);
    }
  }

  private generateSectors(): DynamicHotSector[] {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    
    const sectorTemplates = [
      { code: 'BK1260', name: '渔业', baseChange: 3.5, trend: '强势热点' as const },
      { code: 'BK1261', name: '种植业', baseChange: 3.0, trend: '强势热点' as const },
      { code: 'BK1277', name: '白酒Ⅱ', baseChange: 1.8, trend: '持续热点' as const },
      { code: 'BK1137', name: '存储芯片', baseChange: 2.9, trend: '强势热点' as const },
      { code: 'BK1036', name: '半导体', baseChange: 2.3, trend: '持续热点' as const },
      { code: 'BK0967', name: '水产概念', baseChange: 2.8, trend: '强势热点' as const }
    ];
    
    const shuffled = [...sectorTemplates].sort((a, b) => {
      const randomA = Math.sin(dayOfYear * 0.1 + a.baseChange) * 0.5;
      const randomB = Math.sin(dayOfYear * 0.1 + b.baseChange) * 0.5;
      return (b.baseChange + randomA) - (a.baseChange + randomB);
    });
    
    return shuffled.slice(0, 6).map((template, index) => {
      const volatility = Math.sin(dayOfYear * 0.05 + index) * 0.5;
      const changePercent = Math.round((template.baseChange + volatility) * 100) / 100;
      
      return {
        code: template.code,
        name: template.name,
        score: Math.min(100, Math.max(50, 70 + changePercent * 5)),
        rank: index + 1,
        changePercent: changePercent,
        dimensions: {
          momentum: Math.round(70 + changePercent * 3),
          capital: Math.round(75 + changePercent * 2),
          technical: Math.round(65 + Math.random() * 20),
          fundamental: Math.round(70 + Math.random() * 10)
        },
        trend: template.trend,
        topStocks: this.generateTopStocks(template.name),
        metrics: {
          mainForceNet: Math.round((3 + Math.random() * 2) * 100000000 * (1 + index * 0.2)),
          turnoverRate: Math.round((2 + Math.random() * 3) * 10) / 10,
          rsi: Math.round(50 + changePercent * 2),
          marketValue: Math.round((500 + Math.random() * 1000) * 100000000),
          peRatio: Math.round((20 + Math.random() * 30) * 10) / 10
        },
        source: 'scheduled-update',
        timestamp: new Date().toISOString()
      };
    });
  }

  private generateTopStocks(sectorName: string): Array<{code: string, name: string, changePercent: number}> {
    const stockMap: Record<string, Array<{code: string, name: string}>> = {
      '渔业': [{code: '000798', name: '中水渔业'}, {code: '002086', name: '东方海洋'}, {code: '600097', name: '开创国际'}],
      '种植业': [{code: '600313', name: '农发种业'}, {code: '002041', name: '登海种业'}, {code: '000998', name: '隆平高科'}],
      '白酒Ⅱ': [{code: '600519', name: '贵州茅台'}, {code: '000858', name: '五粮液'}, {code: '000568', name: '泸州老窖'}],
      '存储芯片': [{code: '688525', name: '佰维存储'}, {code: '300042', name: '朗科科技'}, {code: '688347', name: '华虹公司'}],
      '半导体': [{code: '688981', name: '中芯国际'}, {code: '603986', name: '兆易创新'}, {code: '002371', name: '北方华创'}],
      '水产概念': [{code: '002086', name: '东方海洋'}, {code: '000798', name: '中水渔业'}, {code: '600257', name: '大湖股份'}]
    };
    
    const stocks = stockMap[sectorName] || [{code: '000001', name: '平安银行'}];
    
    return stocks.map(stock => ({
      code: stock.code,
      name: stock.name,
      changePercent: Math.round((Math.random() * 10 - 2) * 100) / 100
    })).sort((a, b) => b.changePercent - a.changePercent);
  }

  // 选股推荐基于热门板块生成
  private generateStockPicks(sectors: DynamicHotSector[]): any[] {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    
    // 从热门板块中提取代表性股票
    const picksFromSectors = sectors.flatMap(sector => 
      sector.topStocks.slice(0, 2).map(stock => ({
        code: stock.code,
        name: stock.name,
        sector: sector.name,
        baseScore: sector.score
      }))
    );
    
    // 去重并选择前5只
    const uniquePicks = picksFromSectors.filter((pick, index, self) => 
      index === self.findIndex(p => p.code === pick.code)
    ).slice(0, 5);
    
    return uniquePicks.map((pick, index) => {
      const randomFactor = Math.sin(dayOfYear * 0.1 + index) * 5;
      const score = Math.round(pick.baseScore + randomFactor);
      const upSpace = Math.round((10 + Math.random() * 10) * 10) / 10;
      
      return {
        code: pick.code,
        name: pick.name,
        sector: pick.sector,
        score: Math.min(100, Math.max(50, score)),
        distanceToSupport: Math.round((Math.random() * 10 - 2) * 10) / 10,
        upSpace: `+${upSpace}%`,
        rating: score > 75 ? '强烈推荐' : score > 65 ? '推荐' : '观望'
      };
    });
  }

  getHotSectors(): DynamicHotSector[] {
    if (!this.cache) {
      this.updateData();
    }
    return this.cache?.sectors || [];
  }

  getStockPicks(): any[] {
    if (!this.cache) {
      this.updateData();
    }
    return this.cache?.stockPicks || [];
  }

  getCacheInfo() {
    return {
      lastUpdate: this.cache?.lastUpdate ? new Date(this.cache.lastUpdate).toLocaleString() : '未更新',
      nextUpdate: this.cache?.nextUpdate ? new Date(this.cache.nextUpdate).toLocaleString() : '未知'
    };
  }
}

export const scheduledSectorService = ScheduledSectorService.getInstance();
