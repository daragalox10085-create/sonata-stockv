/**
 * FactorService - 六因子选股模型服务
 * 估值、成长、盈利能力、质量、动量、技术
 */

import { StockConfig } from '../config/stock.config';
import { FactorScores, FinancialData, TechnicalData, MarketData } from '../models/factor.model';

export class FactorService {
  /**
   * 计算六因子得分
   */
  calculateSixFactorScore(
    financial: FinancialData,
    technical: TechnicalData,
    marketData: MarketData
  ): FactorScores {
    return {
      valuation: this.calculateValuationFactor(financial),
      growth: this.calculateGrowthFactor(financial),
      profitability: this.calculateProfitabilityFactor(financial),
      quality: this.calculateQualityFactor(financial),
      momentum: this.calculateMomentumFactor(technical, marketData),
      technical: this.calculateTechnicalFactor(technical),
    };
  }

  /**
   * 估值因子：PE、PB等
   */
  private calculateValuationFactor(financial: FinancialData): number {
    const factors: number[] = [];
    
    // PE估值
    if (financial.peRatio && financial.sectorAvgPE) {
      const peScore = this.normalizePE(financial.peRatio, financial.sectorAvgPE);
      factors.push(peScore);
    }
    
    // PB估值
    if (financial.pbRatio && financial.sectorAvgPB) {
      const pbScore = this.normalizePB(financial.pbRatio, financial.sectorAvgPB);
      factors.push(pbScore);
    }
    
    return factors.length > 0 
      ? factors.reduce((sum, score) => sum + score, 0) / factors.length
      : 50;
  }

  /**
   * 成长因子
   */
  private calculateGrowthFactor(financial: FinancialData): number {
    const growthRates: number[] = [];
    
    if (financial.revenueGrowth) {
      growthRates.push(this.normalizeGrowthRate(financial.revenueGrowth, 0.30));
    }
    
    if (financial.netProfitGrowth) {
      growthRates.push(this.normalizeGrowthRate(financial.netProfitGrowth, 0.25));
    }
    
    return growthRates.length > 0
      ? growthRates.reduce((sum, score) => sum + score, 0) / growthRates.length
      : 50;
  }

  /**
   * 盈利能力因子
   */
  private calculateProfitabilityFactor(financial: FinancialData): number {
    const metrics: number[] = [];
    
    if (financial.roe) {
      metrics.push(this.normalizeROE(financial.roe));
    }
    
    if (financial.roa) {
      metrics.push(this.normalizeROA(financial.roa));
    }
    
    if (financial.grossMargin) {
      metrics.push(Math.min(100, financial.grossMargin * 100));
    }
    
    return metrics.length > 0
      ? metrics.reduce((sum, score) => sum + score, 0) / metrics.length
      : 50;
  }

  /**
   * 质量因子
   */
  private calculateQualityFactor(financial: FinancialData): number {
    const metrics: number[] = [];
    
    if (financial.debtToAsset) {
      const debtScore = Math.max(0, 100 - financial.debtToAsset * 100);
      metrics.push(debtScore);
    }
    
    if (financial.operatingCashFlow && financial.netProfit && financial.netProfit > 0) {
      const cashFlowRatio = financial.operatingCashFlow / financial.netProfit;
      const cashFlowScore = Math.min(100, Math.max(0, cashFlowRatio * 50));
      metrics.push(cashFlowScore);
    }
    
    return metrics.length > 0
      ? metrics.reduce((sum, score) => sum + score, 0) / metrics.length
      : 50;
  }

  /**
   * 动量因子
   */
  private calculateMomentumFactor(technical: TechnicalData, marketData: MarketData): number {
    const metrics: number[] = [];
    
    if (technical.priceChange20d) {
      metrics.push(this.normalizeMomentum(technical.priceChange20d, 0.15));
    }
    
    if (technical.priceChange60d) {
      metrics.push(this.normalizeMomentum(technical.priceChange60d, 0.25));
    }
    
    if (technical.rsi) {
      metrics.push(this.normalizeRSI(technical.rsi));
    }
    
    return metrics.length > 0
      ? metrics.reduce((sum, score) => sum + score, 0) / metrics.length
      : 50;
  }

  /**
   * 技术因子
   */
  private calculateTechnicalFactor(technical: TechnicalData): number {
    const metrics: number[] = [];
    
    if (technical.distanceToSupport !== undefined) {
      const supportScore = this.normalizeSupportDistance(technical.distanceToSupport);
      metrics.push(supportScore);
    }
    
    if (technical.volumeRatio) {
      const volumeScore = Math.min(100, technical.volumeRatio * 50);
      metrics.push(volumeScore);
    }
    
    return metrics.length > 0
      ? metrics.reduce((sum, score) => sum + score, 0) / metrics.length
      : 50;
  }

  /**
   * 计算综合得分
   */
  calculateCompositeScore(factors: FactorScores): number {
    const weights = StockConfig.SIX_FACTOR_WEIGHTS;
    
    return Math.round(
      factors.valuation * weights.VALUATION +
      factors.growth * weights.GROWTH +
      factors.profitability * weights.PROFITABILITY +
      factors.quality * weights.QUALITY +
      factors.momentum * weights.MOMENTUM +
      factors.technical * weights.TECHNICAL
    );
  }

  // 归一化函数
  private normalizePE(pe: number, sectorAvg: number): number {
    if (!sectorAvg || sectorAvg <= 0) return 50;
    const ratio = pe / sectorAvg;
    if (ratio < 0.5) return 100;
    if (ratio < 0.8) return 80;
    if (ratio < 1.0) return 60;
    if (ratio < 1.2) return 50;
    if (ratio < 1.5) return 40;
    if (ratio < 2.0) return 20;
    return 0;
  }

  private normalizePB(pb: number, sectorAvg: number): number {
    if (!sectorAvg || sectorAvg <= 0) return 50;
    const ratio = pb / sectorAvg;
    if (ratio < 0.5) return 100;
    if (ratio < 0.8) return 80;
    if (ratio < 1.0) return 60;
    if (ratio < 1.2) return 50;
    if (ratio < 1.5) return 40;
    return 20;
  }

  private normalizeGrowthRate(growth: number, excellentThreshold: number): number {
    if (growth >= excellentThreshold) return 100;
    if (growth >= excellentThreshold * 0.7) return 80;
    if (growth >= excellentThreshold * 0.4) return 60;
    if (growth >= 0) return 40;
    if (growth >= -0.1) return 20;
    return 0;
  }

  private normalizeROE(roe: number): number {
    if (roe >= 0.20) return 100;
    if (roe >= 0.15) return 80;
    if (roe >= 0.10) return 60;
    if (roe >= 0.05) return 40;
    if (roe >= 0) return 20;
    return 0;
  }

  private normalizeROA(roa: number): number {
    if (roa >= 0.10) return 100;
    if (roa >= 0.07) return 80;
    if (roa >= 0.04) return 60;
    if (roa >= 0.01) return 40;
    return 20;
  }

  private normalizeMomentum(momentum: number, excellentThreshold: number): number {
    if (momentum >= excellentThreshold) return 100;
    if (momentum >= excellentThreshold * 0.5) return 70;
    if (momentum >= 0) return 50;
    if (momentum >= -0.1) return 30;
    return 10;
  }

  private normalizeRSI(rsi: number): number {
    if (rsi >= 70) return 30; // 超买
    if (rsi >= 60) return 60;
    if (rsi >= 40) return 100; // 最佳区间
    if (rsi >= 30) return 60;
    return 30; // 超卖
  }

  private normalizeSupportDistance(distance: number): number {
    const threshold = StockConfig.TECHNICAL_ANALYSIS.SUPPORT_LEVEL_THRESHOLD;
    
    // distance为正值表示高于支撑位，负值表示跌破支撑位
    if (distance <= 0 && distance >= -threshold * 0.5) return 100;
    if (distance <= 0 && distance >= -threshold) return 80;
    if (distance <= threshold * 0.5) return 60;
    if (distance <= threshold) return 40;
    return 20;
  }
}

export const factorService = new FactorService();
