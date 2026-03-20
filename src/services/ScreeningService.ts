/**
 * ScreeningService - 股票筛选主服务
 * 整合板块、因子、技术面分析
 */

import { StockConfig } from '../config/stock.config';
import { getHotSectors as getHotSectorsStatic } from './SectorServiceStatic';
import { factorService } from './FactorService';
import { technicalService, KLineData } from './TechnicalService';
import { unifiedStockDataService } from './UnifiedStockDataService';
import { ScreenedStock } from '../models/screening.model';
import { FinancialData, TechnicalData } from '../models/factor.model';

export class ScreeningService {
  /**
   * 主筛选流程
   */
  async screenStocks(): Promise<ScreenedStock[]> {
    console.log('[ScreeningService] 开始股票筛选流程');
    
    // 1. 获取热门板块
    const hotSectors = await getHotSectorsStatic();
    console.log(`[ScreeningService] 获取到 ${hotSectors.length} 个热门板块`);
    
    // 2. 获取板块内股票
    const sectorStocks = await this.getStocksBySectors(hotSectors);
    console.log(`[ScreeningService] 获取到 ${sectorStocks.length} 只候选股票`);
    
    // 3. 应用六因子模型筛选（失败时返回原始数据）
    let factorScreened = await this.applyFactorScreening(sectorStocks);
    console.log(`[ScreeningService] 六因子筛选后剩余 ${factorScreened.length} 只`);
    
    // 如果六因子筛选结果为空，使用原始数据
    if (factorScreened.length === 0 && sectorStocks.length > 0) {
      console.log('[ScreeningService] 六因子筛选为空，使用原始数据');
      factorScreened = sectorStocks.map(s => ({
        ...s,
        currentPrice: 0,
        factorScores: { valuation: 50, growth: 50, profitability: 50, quality: 50, momentum: 50, technical: 50 },
        compositeScore: 50
      }));
    }
    
    // 4. 应用技术面筛选（失败时返回原始数据）
    let technicalScreened = await this.applyTechnicalScreening(factorScreened);
    console.log(`[ScreeningService] 技术面筛选后剩余 ${technicalScreened.length} 只`);
    
    // 如果技术面筛选结果为空，使用原始数据
    if (technicalScreened.length === 0 && factorScreened.length > 0) {
      console.log('[ScreeningService] 技术面筛选为空，使用原始数据');
      technicalScreened = factorScreened.map(s => ({
        ...s,
        technicalAnalysis: null,
        distanceToSupport: 5,
        upsidePotential: 10,
        isAtLowPosition: false,
        nearSupport: true
      }));
    }
    
    // 5. 综合评分排序
    const sortedStocks = this.rankStocks(technicalScreened);
    
    // 6. 生成推荐等级
    const recommendations = this.generateRecommendations(sortedStocks);
    console.log(`[ScreeningService] 最终推荐 ${recommendations.length} 只股票`);
    
    return recommendations;
  }

  /**
   * 获取板块内股票
   */
  private async getStocksBySectors(sectors: any[]): Promise<any[]> {
    const allStocks = [];
    
    for (const sector of sectors) {
      if (sector.topStocks && sector.topStocks.length > 0) {
        allStocks.push(...sector.topStocks.map((stock: any) => ({
          ...stock,
          sector: sector.name,
          sectorCode: sector.code,
          sectorHeat: sector.score,
        })));
      }
    }
    
    // 去重
    const uniqueStocks = [];
    const seenCodes = new Set<string>();
    
    for (const stock of allStocks) {
      if (!seenCodes.has(stock.code)) {
        seenCodes.add(stock.code);
        uniqueStocks.push(stock);
      }
    }
    
    return uniqueStocks;
  }

  /**
   * 应用六因子筛选
   */
  private async applyFactorScreening(stocks: any[]): Promise<any[]> {
    const screened = [];
    
    for (const stock of stocks) {
      try {
        // 获取股票数据
        const quote = await unifiedStockDataService.fetchQuote(stock.code);
        if (!quote) continue;
        
        // 构建财务数据（简化版）
        const financialData: FinancialData = {
          peRatio: quote.pe,
          pbRatio: quote.pb,
          roe: quote.roe,
          sector: stock.sector,
        };
        
        // 构建技术数据
        const technicalData: TechnicalData = {
          priceChange20d: quote.changePercent,
        };
        
        // 构建市场数据
        const marketData = {
          currentPrice: quote.currentPrice,
          historicalPrices: [],
        };
        
        // 计算六因子得分
        const factorScores = factorService.calculateSixFactorScore(
          financialData,
          technicalData,
          marketData
        );
        
        // 计算综合得分
        const compositeScore = factorService.calculateCompositeScore(factorScores);
        
        // 应用阈值筛选
        if (compositeScore >= StockConfig.SCREENING_THRESHOLDS.MIN_COMPOSITE_SCORE) {
          screened.push({
            ...stock,
            currentPrice: quote.currentPrice,
            factorScores,
            compositeScore,
          });
        }
      } catch (error) {
        console.warn(`[ScreeningService] 股票${stock.code}因子分析失败:`, error);
      }
    }
    
    return screened;
  }

  /**
   * 应用技术面筛选
   */
  private async applyTechnicalScreening(stocks: any[]): Promise<any[]> {
    const screened = [];
    
    for (const stock of stocks) {
      try {
        // 获取K线数据
        const klineData = await unifiedStockDataService.fetchKLineData(stock.code, '101', 60);
        if (!klineData || klineData.length < 20) continue;
        
        // 技术面分析
        const technicalAnalysis = technicalService.analyzeTechnical(
          klineData as KLineData[],
          stock.currentPrice
        );
        
        // 检查是否位于强力支撑位
        const nearSupport = technicalService.isNearStrongSupport(
          stock.currentPrice,
          technicalAnalysis.supportLevels
        );
        
        // 检查是否位于低位
        const atLowPosition = technicalService.isAtLowPosition(
          klineData as KLineData[],
          stock.currentPrice
        );
        
        // 计算上涨空间
        const upsidePotential = technicalService.calculateUpsidePotential(
          stock.currentPrice,
          technicalAnalysis.resistanceLevels
        );
        
        // 计算距离支撑位
        const distanceToSupport = technicalService.calculateDistanceToSupport(
          stock.currentPrice,
          technicalAnalysis.supportLevels
        );
        
        // 应用技术面筛选条件
        // P0: 风控筛选 - 排除跌破支撑位的股票
        if (distanceToSupport < 0) {
          console.log(`[风控] 排除 ${stock.name}(${stock.code})：已跌破支撑位 ${(distanceToSupport * 100).toFixed(1)}%`);
          continue;
        }
        
        // P1: 优先选择接近支撑位的股票（距离 < 8%）
        // 即使上涨空间不大，只要接近支撑位就推荐
        const isNearSupport = distanceToSupport <= 0.08;
        const hasUpsidePotential = upsidePotential >= StockConfig.SCREENING_THRESHOLDS.MIN_UPSIDE_POTENTIAL;
        
        if (isNearSupport || hasUpsidePotential) {
          screened.push({
            ...stock,
            technicalAnalysis,
            distanceToSupport,
            upsidePotential,
            isAtLowPosition: atLowPosition,
            nearSupport: isNearSupport,
          });
        }
      } catch (error) {
        console.warn(`[ScreeningService] 股票${stock.code}技术分析失败:`, error);
      }
    }
    
    return screened;
  }

  /**
   * 股票排序 - P0: 优先推荐接近支撑位的股票
   */
  private rankStocks(stocks: any[]): any[] {
    return stocks.sort((a, b) => {
      // P0: 距离支撑位越近越好（但不为负）
      const distanceA = a.distanceToSupport;
      const distanceB = b.distanceToSupport;
      
      // 优先选择距离支撑位近的股票（0-5% 最佳）
      const isOptimalA = distanceA >= 0 && distanceA <= 0.05;
      const isOptimalB = distanceB >= 0 && distanceB <= 0.05;
      
      if (isOptimalA && !isOptimalB) return -1;
      if (!isOptimalA && isOptimalB) return 1;
      
      // 都在最佳区间或都不在，按距离排序（近的优先）
      if (Math.abs(distanceA - distanceB) > 0.001) {
        return distanceA - distanceB;
      }
      
      // 距离相近，按综合得分排序
      const scoreA = this.calculateTotalScore(a);
      const scoreB = this.calculateTotalScore(b);
      return scoreB - scoreA;
    });
  }

  /**
   * 计算总分
   */
  private calculateTotalScore(stock: any): number {
    const weights = {
      factorScore: 0.5,
      technicalScore: 0.3,
      sectorHeat: 0.2,
    };
    
    const technicalScore = stock.isAtLowPosition ? 80 : 50;
    const sectorHeatScore = stock.sectorHeat || 50;
    
    return (
      stock.compositeScore * weights.factorScore +
      technicalScore * weights.technicalScore +
      sectorHeatScore * weights.sectorHeat
    );
  }

  /**
   * 生成推荐
   */
  private generateRecommendations(stocks: any[]): ScreenedStock[] {
    return stocks.slice(0, 5).map((stock, index) => {
      const recommendation = this.determineRecommendationLevel(stock, index);
      
      return {
        code: stock.code,
        name: stock.name,
        sector: stock.sector,
        compositeScore: Math.round(stock.compositeScore),
        distanceToSupport: Math.round(stock.distanceToSupport * 1000) / 10,
        upsidePotential: Math.round(stock.upsidePotential * 1000) / 10,
        recommendationLevel: recommendation.level,
        recommendationText: recommendation.text,
        factorBreakdown: stock.factorScores,
        technicalSummary: stock.technicalAnalysis?.trendAnalysis,
        lastUpdated: new Date(),
      };
    });
  }

  /**
   * 确定推荐等级（P1: 根据距离支撑位分级）
   */
  private determineRecommendationLevel(stock: any, rank: number): { level: string; text: string } {
    const { compositeScore, upsidePotential, distanceToSupport } = stock;
    
    // P1: 根据距离支撑位计算推荐等级
    // distanceToSupport 是百分比（如 0.05 表示 5%）
    const distancePercent = distanceToSupport * 100;
    
    // 距离支撑位 < 3%：强烈推荐（低风险）
    if (distancePercent <= 3 && compositeScore >= 75) {
      return { level: '强烈推荐', text: '距离支撑位近，安全边际高，上涨空间大' };
    }
    
    // 距离支撑位 3-8%：推荐（中风险）
    if (distancePercent <= 8 && compositeScore >= 65) {
      return { level: '推荐', text: '距离支撑位适中，具备上涨潜力' };
    }
    
    // 距离支撑位 > 8%：观望（高风险）
    if (distancePercent > 8) {
      return { level: '观望', text: `距离支撑位较远（${distancePercent.toFixed(1)}%），追高风险较高` };
    }
    
    // 默认情况
    return { level: '观望', text: '需进一步观察确认' };
  }
}

export const screeningService = new ScreeningService();
