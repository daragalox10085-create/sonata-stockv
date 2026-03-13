/**
 * ScreeningService - 股票筛选主服务
 * 整合板块、因子、技术面分析
 */

import { StockConfig } from '../config/stock.config';
import { sectorService } from './SectorService';
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
    const hotSectors = await sectorService.getHotSectors();
    console.log(`[ScreeningService] 获取到 ${hotSectors.length} 个热门板块`);
    
    // 2. 获取板块内股票
    const sectorStocks = await this.getStocksBySectors(hotSectors);
    console.log(`[ScreeningService] 获取到 ${sectorStocks.length} 只候选股票`);
    
    // 3. 应用六因子模型筛选
    const factorScreened = await this.applyFactorScreening(sectorStocks);
    console.log(`[ScreeningService] 六因子筛选后剩余 ${factorScreened.length} 只`);
    
    // 4. 应用技术面筛选
    const technicalScreened = await this.applyTechnicalScreening(factorScreened);
    console.log(`[ScreeningService] 技术面筛选后剩余 ${technicalScreened.length} 只`);
    
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
        const klineData = await unifiedStockDataService.fetchKLineData(stock.code, 60);
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
        if (upsidePotential >= StockConfig.SCREENING_THRESHOLDS.MIN_UPSIDE_POTENTIAL) {
          screened.push({
            ...stock,
            technicalAnalysis,
            distanceToSupport,
            upsidePotential,
            isAtLowPosition: atLowPosition,
            nearSupport,
          });
        }
      } catch (error) {
        console.warn(`[ScreeningService] 股票${stock.code}技术分析失败:`, error);
      }
    }
    
    return screened;
  }

  /**
   * 股票排序
   */
  private rankStocks(stocks: any[]): any[] {
    return stocks.sort((a, b) => {
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
   * 确定推荐等级
   */
  private determineRecommendationLevel(stock: any, rank: number): { level: string; text: string } {
    const { compositeScore, upsidePotential, distanceToSupport } = stock;
    
    if (compositeScore >= 80 && upsidePotential >= 0.20 && distanceToSupport <= -0.03) {
      return { level: '强烈推荐', text: '基本面优秀，技术面支撑强劲，上涨空间大' };
    }
    
    if (compositeScore >= 70 && upsidePotential >= 0.15 && distanceToSupport <= -0.02) {
      return { level: '推荐', text: '基本面良好，技术面有支撑，具备上涨潜力' };
    }
    
    if (compositeScore >= 60 && upsidePotential >= 0.10 && distanceToSupport <= -0.01) {
      return { level: '谨慎推荐', text: '基本面尚可，技术面有支撑，需关注风险' };
    }
    
    if (compositeScore >= 50 && upsidePotential >= 0.08) {
      return { level: '观察', text: '基本面一般，技术面有待观察' };
    }
    
    return { level: '观望', text: '需进一步观察确认' };
  }
}

export const screeningService = new ScreeningService();
