/**
 * Dynamic Analysis Service - 统一导出
 * 版本：v2.0
 */

// 先导入类型
import type { DynamicHotSector } from './DynamicSectorAnalyzer';

export { RealDataFetcher, realDataFetcher } from './RealDataFetcher';
export { MonteCarloSimulator } from './MonteCarloService';
export { StockSelector } from './StockSelector';
export { DynamicSectorAnalyzer } from './DynamicSectorAnalyzer';
export { SectorStockPipeline } from './SectorStockPipeline';

// 类型导出
export type { MonteCarloResult } from '../types/DataContract';
export type { StockRecommendation } from '../types/DataContract';
export type { DynamicHotSector } from './DynamicSectorAnalyzer';

// 兼容旧版类型
export type HotSector = DynamicHotSector;

// 创建单例实例供 UI 使用
import { RealDataFetcher } from './RealDataFetcher';
import { MonteCarloSimulator } from './MonteCarloService';
import { StockSelector } from './StockSelector';
import { DynamicSectorAnalyzer } from './DynamicSectorAnalyzer';
import { SectorStockPipeline } from './SectorStockPipeline';

const dataFetcher = new RealDataFetcher();
const mcSimulator = new MonteCarloSimulator();
const stockSelector = new StockSelector();
const sectorAnalyzer = new DynamicSectorAnalyzer();
const pipeline = new SectorStockPipeline();

// 兼容旧的 API
export const dynamicAnalysisService = {
  runMonteCarlo: async (currentPrice: number, historicalPrices: number[]) => {
    return mcSimulator.runMonteCarlo(currentPrice, historicalPrices);
  },
  
  runMonteCarloForStock: async (stockCode: string) => {
    const quote = await dataFetcher.fetchStockQuote(stockCode);
    if (!quote) return null;
    const history = await dataFetcher.fetchHistoricalPrices(stockCode, 120);
    if (!history) return null;
    return mcSimulator.runMonteCarlo(quote.currentPrice, history);
  },
  
  selectStocks: async (codes: string[], limit: number = 5) => {
    return stockSelector.selectStocks(codes, limit);
  },
  
  getStockRecommendations: async (codes: string[], limit: number = 5) => {
    return stockSelector.selectStocks(codes, limit);
  },
  
  discoverHotSectors: async (limit: number = 6) => {
    return sectorAnalyzer.discoverHotSectors(limit);
  },
  
  getHotSectors: async (limit: number = 6) => {
    return sectorAnalyzer.discoverHotSectors(limit);
  },
  
  fetchStockQuote: async (code: string) => {
    return dataFetcher.fetchStockQuote(code);
  },
  
  fetchHistoricalPrices: async (code: string, days: number = 120) => {
    return dataFetcher.fetchHistoricalPrices(code, days);
  },
  
  executePipeline: async (options?: { topNSectors?: number; stocksPerSector?: number }) => {
    return pipeline.execute(options);
  }
};
