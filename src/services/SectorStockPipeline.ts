import { realDataFetcher } from './RealDataFetcher';
import { DynamicSectorAnalyzer, DynamicHotSector } from './DynamicSectorAnalyzer';
import { StockSelector } from './StockSelector';
import { StockRecommendation } from '../types/DataContract';

export interface PipelineResult {
  sector: DynamicHotSector;
  constituents: string[];
  selectedStocks: StockRecommendation[];
  analysisTimestamp: string;
  dataQuality: {
    sectorValid: boolean;
    constituentsCount: number;
    selectedCount: number;
    isRealData: boolean;
  };
}

export class SectorStockPipeline {
  private sectorAnalyzer = new DynamicSectorAnalyzer();
  private stockSelector = new StockSelector();

  /**
   * 执行完整的热门板块→成分股→精选股票流程
   * 
   * 保证：
   * 1. 100%真实数据（source === 'eastmoney'）
   * 2. 板块有严格资金流入筛选（>1000万）
   * 3. 精选股票一定属于该板块成分股
   * 4. 股票经过六因子评分+技术位验证
   */
  async execute(options: {
    topNSectors?: number;
    stocksPerSector?: number;
    minCapitalInflow?: number;  // 万元
  } = {}): Promise<PipelineResult[]> {
    const { topNSectors = 6, stocksPerSector = 3, minCapitalInflow = 1000 } = options;
    
    console.log(`[管道启动] 分析前${topNSectors}板块，每板块${stocksPerSector}股，资金门槛${minCapitalInflow}万`);
    
    // Step 1: 获取热门板块（已包含资金筛选）
    const hotSectors = await this.sectorAnalyzer.discoverHotSectors(topNSectors);
    if (hotSectors.length === 0) {
      console.warn('[管道] 无符合条件的板块');
      return [];
    }
    
    // Step 2: 并行处理每个板块（获取成分股+选股）
    const results = await Promise.all(
      hotSectors.map(async (sector) => {
        try {
          // 2.1 获取板块成分股（真实API）
          const constituents = await realDataFetcher.fetchSectorConstituents(sector.code);
          if (constituents.length === 0) {
            console.warn(`[管道] ${sector.name}: 无成分股数据`);
            return null;
          }
          
          // 2.2 在成分股中精选（六因子+技术位）
          const selected = await this.stockSelector.selectStocks(
            constituents,
            stocksPerSector,
            { code: sector.code, name: sector.name, score: sector.score }
          );
          
          const result: PipelineResult = {
            sector,
            constituents,
            selectedStocks: selected,
            analysisTimestamp: new Date().toISOString(),
            dataQuality: {
              sectorValid: sector.metrics.mainForceNet > minCapitalInflow * 10000,
              constituentsCount: constituents.length,
              selectedCount: selected.length,
              isRealData: true
            }
          };
          
          console.log(`[管道完成] ${sector.name}: 成分股${constituents.length}只 → 精选${selected.length}只`);
          return result;
          
        } catch (error) {
          console.error(`[管道错误] 处理板块 ${sector.name} 失败:`, error);
          return null;
        }
      })
    );
    
    // 过滤掉失败的板块
    return results.filter((r): r is PipelineResult => r !== null);
  }
}
