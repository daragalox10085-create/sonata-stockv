import { SectorStockPipeline, PipelineResult } from '../services/SectorStockPipeline';
import { MonteCarloSimulator } from '../services/MonteCarloService';
import { realDataFetcher } from '../services/RealDataFetcher';
import { verifyRealData } from '../types/DataContract';

// 简单的内存缓存（实际项目中使用Redis）
const cache = new Map<string, { data: any; expiry: number }>();

export class AnalysisController {
  private pipeline = new SectorStockPipeline();
  private mcSimulator = new MonteCarloSimulator();

  /**
   * GET /api/hot-sectors
   * 获取热门板块及精选股票（缓存7天）
   */
  async getHotSectors(req: any, res: any) {
    try {
      const cacheKey = 'hot_sectors_pipeline';
      const now = Date.now();
      const cacheMs = 4 * 60 * 60 * 1000; // 4小时缓存（原为7天，过于陈旧）
      
      // 检查缓存
      const cached = cache.get(cacheKey);
      if (cached && cached.expiry > now && !req.query.refresh) {
        return res.json({
          success: true,
          data: cached.data,
          fromCache: true,
          nextUpdate: new Date(cached.expiry).toISOString()
        });
      }
      
      // 执行管道分析（100%真实数据）
      const results = await this.pipeline.execute({
        topNSectors: 6,
        stocksPerSector: 3,
        minCapitalInflow: 1000
      });
      
      // 验证数据真实性
      const allReal = results.every(r => 
        r.sector.metrics.mainForceNet !== undefined &&
        r.selectedStocks.every(s => s.metrics.currentPrice > 0)
      );
      
      if (!allReal) {
        throw new Error('数据完整性验证失败，可能存在mock数据');
      }
      
      // 写入缓存（4小时）
      cache.set(cacheKey, { data: results, expiry: now + cacheMs });
      
      res.json({
        success: true,
        data: results,
        updatePolicy: '每4小时自动更新',
        isRealData: true,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('[API] 热门板块获取失败:', error);
      res.status(500).json({
        success: false,
        error: '分析失败，请检查数据源连接',
        details: error instanceof Error ? error.message : 'Unknown error',
        isRealData: false
      });
    }
  }

  /**
   * GET /api/stock/:code/monte-carlo
   * 个股蒙特卡洛分析（缓存1小时）
   */
  async getMonteCarlo(req: any, res: any) {
    const { code } = req.params;
    
    try {
      const cacheKey = `mc_${code}`;
      const cached = cache.get(cacheKey);
      const hourMs = 60 * 60 * 1000;
      
      if (cached && cached.expiry > Date.now() && !req.query.refresh) {
        return res.json({
          success: true,
          ...cached.data,
          fromCache: true
        });
      }
      
      // 1. 获取真实历史数据
      const history = await realDataFetcher.fetchHistoricalPrices(code, 120);
      if (!history || history.length < 20) {
        return res.status(400).json({
          error: '历史数据不足（需要至少20个交易日）',
          isRealData: false
        });
      }
      
      // 2. 获取当前价格
      const quote = await realDataFetcher.fetchStockQuote(code);
      if (!quote) {
        return res.status(400).json({
          error: '无法获取当前股价',
          isRealData: false
        });
      }
      
      // 3. 执行蒙特卡洛（概率一致版本）
      const result = await this.mcSimulator.runMonteCarlo(quote.currentPrice, history);
      if (!result) {
        throw new Error('蒙特卡洛计算失败');
      }
      
      // 4. 验证数据真实性
      verifyRealData(quote, ['currentPrice', 'source']);
      
      const response = {
        success: true,
        stock: {
          code,
          name: quote.name,
          currentPrice: quote.currentPrice
        },
        monteCarlo: result,
        dataSource: quote.source,
        isRealData: true,
        timestamp: new Date().toISOString()
      };
      
      // 缓存1小时
      cache.set(cacheKey, { data: response, expiry: Date.now() + hourMs });
      
      res.json(response);
      
    } catch (error) {
      console.error(`[API] 蒙特卡洛分析失败 ${code}:`, error);
      res.status(500).json({
        success: false,
        error: '分析失败',
        isRealData: false
      });
    }
  }

  /**
   * GET /api/health
   * 健康检查：验证数据源连接
   */
  async healthCheck(req: any, res: any) {
    try {
      // 测试获取一个真实数据
      const testStock = '000001';  // 平安银行
      const quote = await realDataFetcher.fetchStockQuote(testStock);
      const healthy = quote !== null && quote.source === 'eastmoney';
      
      res.json({
        status: healthy ? 'healthy' : 'unhealthy',
        dataSource: 'eastmoney',
        connection: healthy ? 'ok' : 'failed',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: '数据连接异常'
      });
    }
  }
}
