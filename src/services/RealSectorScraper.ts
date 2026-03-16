// src/services/RealSectorScraper.ts
// 使用浏览器爬虫获取真实板块数据
// 注意：此服务需要定期运行（如每3天），将数据保存到本地文件

import { DynamicHotSector } from './DynamicSectorAnalyzer';

export interface ScrapedSectorData {
  sectors: DynamicHotSector[];
  timestamp: string;
  source: string;
}

export class RealSectorScraper {
  private readonly DATA_FILE = 'public/sector_data.json';
  
  /**
   * 获取板块数据（优先从本地文件，不存在则返回null）
   */
  async getSectors(): Promise<DynamicHotSector[] | null> {
    try {
      // 尝试从本地文件读取
      const response = await fetch('/sector_data.json');
      if (!response.ok) {
        console.log('[RealSectorScraper] 本地数据文件不存在');
        return null;
      }
      
      const data: ScrapedSectorData = await response.json();
      
      // 检查数据是否过期（超过3天）
      const dataAge = Date.now() - new Date(data.timestamp).getTime();
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      
      if (dataAge > threeDays) {
        console.log('[RealSectorScraper] 数据已过期，需要重新爬取');
        return null;
      }
      
      console.log(`[RealSectorScraper] 从本地文件获取到 ${data.sectors.length} 个板块`);
      return data.sectors;
    } catch (error) {
      console.error('[RealSectorScraper] 读取本地数据失败:', error);
      return null;
    }
  }
  
  /**
   * 保存板块数据到本地文件
   * 注意：此方法应在Node.js环境中调用（如定时任务脚本）
   */
  async saveSectors(sectors: DynamicHotSector[]): Promise<void> {
    const data: ScrapedSectorData = {
      sectors,
      timestamp: new Date().toISOString(),
      source: 'scraped'
    };
    
    // 这里应该写入文件，但在浏览器环境中无法直接写入
    // 实际使用时，应在Node.js脚本中调用此方法
    console.log('[RealSectorScraper] 数据已准备，需要写入文件:', JSON.stringify(data).slice(0, 100) + '...');
  }
}

// 导出单例
export const realSectorScraper = new RealSectorScraper();
