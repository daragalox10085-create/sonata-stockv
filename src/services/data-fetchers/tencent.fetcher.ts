/**
 * 腾讯财经数据获取器
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

export class TencentDataFetcher extends BaseDataFetcher {
  readonly sourceName = 'tencent';
  readonly priority = 1;
  protected readonly baseUrl = '/api/tencent';
  protected readonly timeout = 5000;
  protected readonly retryCount = 3;
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
    const url = `${this.baseUrl}/quote?q=${market}${symbol}`;
    
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
    const match = text.match(/v_\w+="([^"]+)"/);
    if (!match) {
      throw new Error('Invalid response format');
    }

    const parts = match[1].split('~');
    if (parts.length < 32) {
      throw new Error('Insufficient data fields');
    }

    const name = parts[1];
    const currentPrice = parseFloat(parts[3]) || 0;
    const close = parseFloat(parts[4]) || 0;
    const open = parseFloat(parts[5]) || 0;
    const volume = parseInt(parts[6]) || 0;
    const high = parseFloat(parts[33]) || currentPrice * 1.02;
    const low = parseFloat(parts[34]) || currentPrice * 0.98;
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
    const cacheKey = this.generateCacheKey('kline', symbol, timeframe, String(days));
    
    // 尝试从缓存获取
    if (options.useCache !== false) {
      const cached = this.getFromCache<KLinePoint[]>(cacheKey);
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
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const url = `${this.baseUrl}/kline?code=${market}${symbol}&start=${startDate}&end=${endDate}&limit=${days}&adjust=qfq`;
    
    const result = await this.fetchWithRetry<any>(url, options);
    
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
      const klines = this.parseKLineResponse(market + symbol, result.data);
      
      // 缓存结果
      if (options.useCache !== false) {
        this.setCache(cacheKey, klines, 60000); // 1分钟缓存
      }
      
      return {
        success: true,
        data: klines,
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
   * 解析K线响应
   */
  private parseKLineResponse(key: string, json: any): KLinePoint[] {
    const data = json.data?.[key]?.day;
    
    if (!data || !Array.isArray(data)) {
      throw new Error('Invalid K-line data format');
    }

    // 腾讯格式: [日期, 开盘, 收盘, 最低, 最高, 成交量]
    return data.map((item: any[]) => ({
      date: item[0],
      open: parseFloat(item[1]),
      close: parseFloat(item[2]),
      low: parseFloat(item[3]),
      high: parseFloat(item[4]),
      volume: parseInt(item[5]) || 0,
    })).filter((k: KLinePoint) => !isNaN(k.open) && k.open > 0);
  }

  /**
   * 获取板块列表
   */
  async fetchSectorList(options: FetchOptions = {}): Promise<FetchResult<any[]>> {
    // 腾讯财经暂不支持板块列表
    return {
      success: false,
      data: null,
      error: 'Sector list not supported by Tencent API',
      source: this.sourceName,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取板块成分股
   */
  async fetchSectorConstituents(sectorCode: string, options: FetchOptions = {}): Promise<FetchResult<any[]>> {
    // 腾讯财经暂不支持板块成分股
    return {
      success: false,
      data: null,
      error: 'Sector constituents not supported by Tencent API',
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
