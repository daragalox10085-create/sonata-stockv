// src/services/AutoUpdateSectorService.ts
// 自动更新板块数据服务 - 支持定时任务和手动更新

import { DynamicHotSector } from './DynamicSectorAnalyzer';

export interface SectorUpdateConfig {
  // 定时任务配置
  autoUpdate: boolean;
  updateDay: number; // 0=周日, 1=周一, 2=周二...
  updateHour: number; // 11=11点
  updateMinute: number;
}

export class AutoUpdateSectorService {
  private static instance: AutoUpdateSectorService;
  private config: SectorUpdateConfig = {
    autoUpdate: true,
    updateDay: 2, // 周二
    updateHour: 11, // 11点
    updateMinute: 0
  };
  private checkTimer: NodeJS.Timeout | null = null;
  private lastUpdateTime: number = 0;
  private isUpdating: boolean = false;

  private constructor() {
    this.init();
  }

  static getInstance(): AutoUpdateSectorService {
    if (!AutoUpdateSectorService.instance) {
      AutoUpdateSectorService.instance = new AutoUpdateSectorService();
    }
    return AutoUpdateSectorService.instance;
  }

  /**
   * 初始化服务
   */
  private init() {
    console.log('[AutoUpdateSector] 初始化自动更新服务');
    console.log(`[AutoUpdateSector] 配置: 每周${this.getDayName(this.config.updateDay)} ${this.config.updateHour}:${this.config.updateMinute.toString().padStart(2, '0')}`);
    
    // 启动定时检查
    this.startAutoCheck();
  }

  /**
   * 启动自动检查
   */
  private startAutoCheck() {
    // 每分钟检查一次是否需要更新
    this.checkTimer = setInterval(() => {
      this.checkAndUpdate();
    }, 60 * 1000); // 每分钟检查

    console.log('[AutoUpdateSector] 自动检查已启动');
  }

  /**
   * 检查是否需要更新
   */
  private async checkAndUpdate() {
    if (!this.config.autoUpdate) {
      return;
    }

    if (this.isUpdating) {
      return;
    }

    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // 检查是否是设定的更新时间
    if (currentDay === this.config.updateDay && 
        currentHour === this.config.updateHour && 
        currentMinute === this.config.updateMinute) {
      
      // 检查是否已经更新过（避免重复更新）
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      if (this.lastUpdateTime >= today) {
        return;
      }

      console.log('[AutoUpdateSector] 到达更新时间，开始自动更新...');
      await this.performUpdate();
    }
  }

  /**
   * 执行更新
   */
  private async performUpdate(): Promise<void> {
    if (this.isUpdating) {
      console.log('[AutoUpdateSector] 正在更新中，跳过');
      return;
    }

    this.isUpdating = true;

    try {
      console.log('[AutoUpdateSector] 开始联网搜索板块数据...');
      
      // 这里应该调用爬虫或API获取真实数据
      // 由于网络限制，目前使用模拟数据
      const sectors = await this.fetchSectorsFromWeb();
      
      if (sectors && sectors.length > 0) {
        // 保存到本地文件
        await this.saveSectorsToFile(sectors);
        this.lastUpdateTime = Date.now();
        console.log(`[AutoUpdateSector] 更新完成，获取到 ${sectors.length} 个板块`);
      } else {
        console.log('[AutoUpdateSector] 未获取到数据，保持现有数据');
      }
    } catch (error) {
      console.error('[AutoUpdateSector] 更新失败:', error);
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * 从网络获取板块数据
   * 注意：这里应该实现真实的爬虫逻辑
   */
  private async fetchSectorsFromWeb(): Promise<DynamicHotSector[]> {
    // TODO: 实现真实的网络爬虫
    // 由于网络限制，返回null表示未获取到
    console.log('[AutoUpdateSector] 网络获取暂未实现，返回空');
    return [];
  }

  /**
   * 保存板块数据到文件
   */
  private async saveSectorsToFile(sectors: DynamicHotSector[]): Promise<void> {
    // 这里应该写入文件
    // 实际实现需要在Node.js环境中
    console.log('[AutoUpdateSector] 数据已准备保存:', sectors.length);
  }

  /**
   * 手动触发更新
   */
  async manualUpdate(): Promise<boolean> {
    console.log('[AutoUpdateSector] 手动更新触发');
    await this.performUpdate();
    return true;
  }

  /**
   * 获取下次更新时间
   */
  getNextUpdateTime(): Date {
    const now = new Date();
    const currentDay = now.getDay();
    const daysUntilUpdate = (this.config.updateDay - currentDay + 7) % 7;
    
    const nextUpdate = new Date(now);
    nextUpdate.setDate(now.getDate() + daysUntilUpdate);
    nextUpdate.setHours(this.config.updateHour, this.config.updateMinute, 0, 0);
    
    // 如果今天已经过了更新时间，设置为下周
    if (daysUntilUpdate === 0 && (now.getHours() > this.config.updateHour || 
        (now.getHours() === this.config.updateHour && now.getMinutes() >= this.config.updateMinute))) {
      nextUpdate.setDate(nextUpdate.getDate() + 7);
    }
    
    return nextUpdate;
  }

  /**
   * 获取最后更新时间
   */
  getLastUpdateTime(): Date | null {
    if (this.lastUpdateTime === 0) {
      return null;
    }
    return new Date(this.lastUpdateTime);
  }

  /**
   * 获取状态信息
   */
  getStatus() {
    return {
      autoUpdate: this.config.autoUpdate,
      updateSchedule: `每周${this.getDayName(this.config.updateDay)} ${this.config.updateHour}:${this.config.updateMinute.toString().padStart(2, '0')}`,
      nextUpdate: this.getNextUpdateTime().toLocaleString(),
      lastUpdate: this.getLastUpdateTime()?.toLocaleString() || '从未更新',
      isUpdating: this.isUpdating
    };
  }

  /**
   * 星期几名称
   */
  private getDayName(day: number): string {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return days[day];
  }
}

// 导出单例
export const autoUpdateSectorService = AutoUpdateSectorService.getInstance();
