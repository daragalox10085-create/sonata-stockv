/**
 * 板块数据处理器
 */

import { BaseDataProcessor } from './base.processor';
import { ProcessOptions, DataQualityReport } from './types';

export interface SectorData {
  code: string;
  name: string;
  changePercent: number;
  capitalInflow: number;
  turnoverRate: number;
  totalMarketCap: number;
  heatScore?: number;
}

export interface ProcessedSectorData {
  sectors: SectorData[];
  // 排名信息
  rankings: {
    byChange: SectorData[];
    byCapitalInflow: SectorData[];
    byTurnover: SectorData[];
    byHeat: SectorData[];
  };
  // 统计信息
  statistics: {
    avgChange: number;
    avgCapitalInflow: number;
    totalMarketCap: number;
    leaderSector: string;
    risingCount: number;
    fallingCount: number;
  };
  // 质量标记
  isValid: boolean;
  qualityScore: number;
}

export class SectorDataProcessor extends BaseDataProcessor<SectorData[], ProcessedSectorData> {
  readonly name = 'SectorDataProcessor';
  readonly type = 'sector' as const;

  /**
   * 执行具体处理逻辑
   */
  protected doProcess(data: SectorData[], options: ProcessOptions): ProcessedSectorData {
    // 按不同维度排序
    const byChange = [...data].sort((a, b) => b.changePercent - a.changePercent);
    const byCapitalInflow = [...data].sort((a, b) => b.capitalInflow - a.capitalInflow);
    const byTurnover = [...data].sort((a, b) => b.turnoverRate - a.turnoverRate);
    const byHeat = [...data].sort((a, b) => (b.heatScore || 0) - (a.heatScore || 0));

    // 计算统计信息
    const statistics = this.calculateStatistics(data);

    // 计算质量分数
    const qualityScore = this.calculateQualityScore(data);

    return {
      sectors: data,
      rankings: {
        byChange,
        byCapitalInflow,
        byTurnover,
        byHeat,
      },
      statistics,
      isValid: qualityScore >= 60,
      qualityScore,
    };
  }

  /**
   * 计算统计信息
   */
  private calculateStatistics(data: SectorData[]): { avgChange: number; avgCapitalInflow: number; totalMarketCap: number; leaderSector: string; risingCount: number; fallingCount: number } {
    const changes = data.map(s => s.changePercent);
    const capitalInflows = data.map(s => s.capitalInflow);
    const marketCaps = data.map(s => s.totalMarketCap);

    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
    const avgCapitalInflow = capitalInflows.reduce((a, b) => a + b, 0) / capitalInflows.length;
    const totalMarketCap = marketCaps.reduce((a, b) => a + b, 0);

    // 找出领涨板块
    const leader = data.reduce((max, sector) => 
      sector.changePercent > max.changePercent ? sector : max
    , data[0]);

    const risingCount = data.filter(s => s.changePercent > 0).length;
    const fallingCount = data.filter(s => s.changePercent < 0).length;

    return {
      avgChange: this.normalizePercent(avgChange),
      avgCapitalInflow: Math.round(avgCapitalInflow),
      totalMarketCap: Math.round(totalMarketCap),
      leaderSector: leader?.name || '',
      risingCount,
      fallingCount,
    };
  }

  /**
   * 计算质量分数
   */
  private calculateQualityScore(data: SectorData[]): number {
    if (data.length === 0) return 0;

    let score = 100;

    // 检查数据量
    if (data.length < 3) score -= 30;

    // 检查数据完整性
    let invalidCount = 0;
    for (const sector of data) {
      if (!this.isValidString(sector.code)) invalidCount++;
      if (!this.isValidString(sector.name)) invalidCount++;
      if (!this.isValidNumber(sector.changePercent)) invalidCount++;
      if (!this.isValidNumber(sector.capitalInflow)) invalidCount++;
    }

    if (invalidCount > 0) {
      score -= Math.min(50, (invalidCount / data.length) * 50);
    }

    return Math.max(0, score);
  }

  /**
   * 验证数据
   */
  validate(data: SectorData[]): boolean {
    if (!Array.isArray(data) || data.length === 0) return false;

    for (const sector of data) {
      if (!this.isValidString(sector.code)) return false;
      if (!this.isValidString(sector.name)) return false;
      if (!this.isValidNumber(sector.changePercent)) return false;
    }

    return true;
  }

  /**
   * 清洗数据
   */
  clean(data: SectorData[]): SectorData[] {
    return data.map(sector => ({
      code: String(sector.code || '').trim(),
      name: String(sector.name || '').trim(),
      changePercent: this.safeParseNumber(sector.changePercent, 0),
      capitalInflow: this.safeParseNumber(sector.capitalInflow, 0),
      turnoverRate: this.safeParseNumber(sector.turnoverRate, 0),
      totalMarketCap: this.safeParseNumber(sector.totalMarketCap, 0),
      heatScore: this.safeParseNumber(sector.heatScore, 0),
    })).filter(sector => 
      sector.code.length > 0 && 
      sector.name.length > 0
    );
  }

  /**
   * 标准化数据
   */
  normalize(data: SectorData[]): SectorData[] {
    return data.map(sector => ({
      ...sector,
      changePercent: this.normalizePercent(sector.changePercent),
      capitalInflow: Math.round(sector.capitalInflow),
      turnoverRate: this.normalizePercent(sector.turnoverRate),
      totalMarketCap: Math.round(sector.totalMarketCap),
    }));
  }

  /**
   * 生成数据质量报告
   */
  generateQualityReport(data: SectorData[]): DataQualityReport {
    const missingFields = new Map<string, number>();
    const outliers = new Map<string, number>();

    let invalidCount = 0;
    let outlierCount = 0;

    for (const sector of data) {
      // 检查缺失字段
      if (!sector.code) missingFields.set('code', (missingFields.get('code') || 0) + 1);
      if (!sector.name) missingFields.set('name', (missingFields.get('name') || 0) + 1);
      if (!this.isValidNumber(sector.changePercent)) {
        missingFields.set('changePercent', (missingFields.get('changePercent') || 0) + 1);
      }

      // 检查异常值
      if (Math.abs(sector.changePercent) > 20) {
        outlierCount++;
      }

      if (!this.validate([sector])) {
        invalidCount++;
      }
    }

    if (outlierCount > 0) {
      outliers.set('extremeChange', outlierCount);
    }

    const qualityScore = this.calculateQualityScore(data);

    return {
      totalRecords: data.length,
      validRecords: data.length - invalidCount,
      invalidRecords: invalidCount,
      missingFields,
      outliers,
      duplicates: 0,
      score: qualityScore,
    };
  }

  /**
   * 统计输入数据量
   */
  protected countInput(data: SectorData[]): number {
    return data.length;
  }

  /**
   * 统计输出数据量
   */
  protected countOutput(data: ProcessedSectorData): number {
    return data.sectors.length;
  }
}
