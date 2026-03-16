/**
 * 新浪财经数据获取器
 */

import { StockQuote, KLinePoint } from '../../types/DataContract';
import { BaseDataFetcher } from './base.fetcher';
import { FetchOptions, FetchResult } from './types';

// 股票名称映射
const stockNameMap: Record<string, string> = {
  '600519': '贵州茅台',
  '000858': '五粮液',
  '300750': '宁德时代',
  '002594': '比亚迪',
  '510300': '沪深 300ETF',
  '513310': '中韩半导体 ETF',
};

// 股票总股本映射
const stockTotalSharesMap: Record<string, number> = {
  '600519': 1250000000,
  '000858': 3880000000,
  '300750': 4400000000,
  '002594': 2900000000,
  '510300': 8000000000,
  '513310': 1000000000,
};

export class SinaDataFetcher extends BaseDataFetcher {
  readonly sourceName = 'sina';
  readonly priority = 3;
  protected readonly baseUrl = '/api/sina';
  protected readonly timeout = 5000;
  protected readonly retryCount = 2;
  protected readonly retryDelay = 1000;

  /**
   * 获取市场前缀
   */
  private getMarketPrefix(symbol: string): 'sh' | 'sz' {
    const prefix = symbol.substring(0, 3);
    const shanghai = ['600', '601', '603', '605', '688', '510', '511', '512', '513', '515', '516', '518', '519'];
    return shanghai.includes(prefix) ? 'sh' : 'sz';
  }

  /**
   * 获取股票实时行情
   */
  async fetchStockQuote(symbol: string, options: FetchOptions = {}): Promise<FetchResult<StockQuote>> {
    const cacheKey = this.generateCacheKey('quote', symbol);
    
    // 尝试从缓存获取
    if (options.useCache !== false) {
      const cached = this.getFromCache<StockQuote>(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          error: null,
          source: this.sourceName,
          timestamp: new Date().toISOString(),
        };
      }
    }

    const market = this.getMarketPrefix(symbol);
    const url = `${this.baseUrl}?list=${market}${symbol}`;
    
    const result = await this.fetchWithRetry<string>(url, options);
    
    if (!result.success || !result.data) {
      return {
        success: false,
        data: null,
        error: result.error,
        source: this.sourceName,
        timestamp: result.timestamp,
      };
    }

    try {
      const quote = this.parseQuoteResponse(symbol, result.data);
      
      // 缓存结果
      if (options.useCache !== false) {
        this.setCache(cacheKey, quote, 30000); // 30秒缓存
      }
      
      return {
        success: true,
        data: quote,
        error: null,
        source: this.sourceName,
        timestamp: result.timestamp,
        duration: result.duration,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: `Parse error: ${error instanceof Error ? error.message : String(error)}`,
        source: this.sourceName,
        timestamp: result.timestamp,
      };
    }
  }

  /**
   * 解析行情响应
   */
  private parseQuoteResponse(symbol: string, text: string): StockQuote {
    const match = text.match(/var hq_str_\w+="([^"]*)";/);
    if (!match || !match[1]) {
      throw new Error('Invalid response format');
    }

    const parts = match[1].split(',');
    if (parts.length < 8) {
      throw new Error('Insufficient data fields');
    }

    const name = parts[0];
    const open = parseFloat(parts[1]);
    const close = parseFloat(parts[2]);
    const currentPrice = parseFloat(parts[3]);
    const high = parseFloat(parts[4]);
    const low = parseFloat(parts[5]);
    const volume = parseInt(parts[8]) || 0;
    const change = currentPrice - close;
    const changePercent = close > 0 ? (change / close) * 100 : 0;
    const totalShares = stockTotalSharesMap[symbol] || 100000000;
    const marketCap = currentPrice * totalShares;

    return {
      code: symbol,
      symbol: symbol,
      name: name || stockNameMap[symbol] || symbol,
      currentPrice,
      change,
      changePercent,
      open,
      high,
      low,
      close,
      volume,
      pe: 0,
      peg: 0,
      pb: 0,
      roe: 0,
      profitGrowth: 0,
      revenueGrowth: 0,
      marketCap,
      totalShares,
      source: this.sourceName,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取K线数据
   */
  async fetchKLineData(
    symbol: string,
    timeframe: string,
    days: number,
    options: FetchOptions = {}
  ): Promise<FetchResult<KLinePoint[]>> {
    // 新浪财经暂不支持K线数据
    return {
      success: false,
      data: null,
      error: 'K-line data not supported by Sina API',
      source: this.sourceName,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取板块列表
   */
  async fetchSectorList(options: FetchOptions = {}): Promise<FetchResult<any[]>> {
    // 新浪财经暂不支持板块列表
    return {
      success: false,
      data: null,
      error: 'Sector list not supported by Sina API',
      source: this.sourceName,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取板块成分股
   */
  async fetchSectorConstituents(sectorCode: string, options: FetchOptions = {}): Promise<FetchResult<any[]>> {
    // 新浪财经暂不支持板块成分股
    return {
      success: false,
      data: null,
      error: 'Sector constituents not supported by Sina API',
      source: this.sourceName,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.fetchStockQuote('600519', { timeout: 3000, retryCount: 1 });
      return result.success;
    } catch {
      return false;
    }
  }
}
