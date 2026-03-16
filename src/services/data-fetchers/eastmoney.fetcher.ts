/**
 * 东方财富数据获取器
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

export class EastmoneyDataFetcher extends BaseDataFetcher {
  readonly sourceName = 'eastmoney';
  readonly priority = 2;
  protected readonly baseUrl = '/api/eastmoney';
  protected readonly timeout = 8000;
  protected readonly retryCount = 3;
  protected readonly retryDelay = 1000;

  /**
   * 获取secid
   */
  private getSecid(symbol: string): string {
    return symbol.startsWith('6') ? `1.${symbol}` : `0.${symbol}`;
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

    const secid = this.getSecid(symbol);
    const url = `${this.baseUrl}/quote?secid=${secid}&fields=f9,f43,f44,f45,f46,f47,f48,f49,f57,f58,f60,f116,f152,f162,f163,f164,f169,f170`;
    
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
  private parseQuoteResponse(symbol: string, json: any): StockQuote {
    const data = json.data;
    if (!data) {
      throw new Error('No data in response');
    }

    // 东方财富 API 字段说明：
    // f43=当前价(分), f44=最高价(分), f45=最低价(分), f46=开盘价(分)
    // f47=成交量(手), f48=成交额(元), f49=总市值(万元)
    // f57=股票代码, f58=股票名称, f60=昨收(分)
    // f116=总市值(元), f169=涨跌额(分), f170=涨跌幅(0.01%)
    const currentPrice = (data.f43 || 0) / 100;
    const openPrice = (data.f46 || 0) / 100;
    const highPrice = (data.f44 || 0) / 100;
    const lowPrice = (data.f45 || 0) / 100;
    const closePrice = (data.f60 || 0) / 100;
    const change = (data.f169 || 0) / 100;
    const changePercent = (data.f170 || 0) / 100;

    return {
      code: symbol,
      symbol: symbol,
      name: data.f58 || stockNameMap[symbol] || symbol,
      currentPrice,
      change,
      changePercent,
      open: openPrice,
      high: highPrice,
      low: lowPrice,
      close: closePrice,
      volume: data.f47 || 0,
      // 财务指标
      pe: (data.f9 || 0) / 100,
      peTtm: (data.f162 || 0) / 100,
      ps: (data.f163 || 0) / 100,
      pb: (data.f152 || 0) / 100,
      roe: (data.f164 || 0) / 100,
      profitGrowth: 0,
      revenueGrowth: 0,
      peg: (data.f163 || 0) / 100,
      marketCap: data.f116 || 0,
      totalShares: stockTotalSharesMap[symbol],
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

    const secid = this.getSecid(symbol);
    const klt = timeframe === '60' ? '60' : timeframe === '240' ? '240' : '101';
    const fields1 = 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13';
    const fields2 = 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61';
    
    const url = `${this.baseUrl}/kline?secid=${secid}&fields1=${fields1}&fields2=${fields2}&klt=${klt}&fqt=1&lmt=${days}&end=20500101`;
    
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
      const klines = this.parseKLineResponse(result.data);
      
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
  private parseKLineResponse(json: any): KLinePoint[] {
    const klines = json.data?.klines;
    
    if (!klines || !Array.isArray(klines) || klines.length === 0) {
      throw new Error('Invalid K-line data format');
    }

    // 东方财富格式: "日期,开盘,收盘,最低,最高,成交量,成交额,振幅,涨跌幅,涨跌额,换手率"
    return klines.map((kline: string) => {
      const parts = kline.split(',');
      return {
        date: parts[0],
        open: parseFloat(parts[1]),
        close: parseFloat(parts[2]),
        low: parseFloat(parts[3]),
        high: parseFloat(parts[4]),
        volume: parseInt(parts[5]) || 0,
      };
    }).filter((k: KLinePoint) => !isNaN(k.open) && k.open > 0);
  }

  /**
   * 获取板块列表
   */
  async fetchSectorList(options: FetchOptions = {}): Promise<FetchResult<any[]>> {
    const cacheKey = this.generateCacheKey('sectors');
    
    // 尝试从缓存获取
    if (options.useCache !== false) {
      const cached = this.getFromCache<any[]>(cacheKey);
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

    const url = `${this.baseUrl}/sector?pn=1&pz=100&po=1&np=1&fltt=2&invt=2&fid=f62&fs=m:90+t:2&fields=f12,f14,f3,f62,f8,f20,f184`;
    
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
      const sectors = this.parseSectorListResponse(result.data);
      
      // 缓存结果
      if (options.useCache !== false) {
        this.setCache(cacheKey, sectors, 300000); // 5分钟缓存
      }
      
      return {
        success: true,
        data: sectors,
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
   * 解析板块列表响应
   */
  private parseSectorListResponse(json: any): any[] {
    const data = json.data?.diff;
    if (!data || !Array.isArray(data)) {
      throw new Error('Invalid sector list format');
    }

    return data.map((item: any) => ({
      code: item.f12,
      name: item.f14,
      changePercent: item.f3,
      capitalInflow: item.f62,
      turnoverRate: item.f8,
      totalMarketCap: item.f20,
      heatScore: item.f184,
    }));
  }

  /**
   * 获取板块成分股
   */
  async fetchSectorConstituents(sectorCode: string, options: FetchOptions = {}): Promise<FetchResult<any[]>> {
    const cacheKey = this.generateCacheKey('constituents', sectorCode);
    
    // 尝试从缓存获取
    if (options.useCache !== false) {
      const cached = this.getFromCache<any[]>(cacheKey);
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

    const url = `${this.baseUrl}/sector/constituents?pn=1&pz=100&po=1&np=1&fltt=2&invt=2&fid=f62&fs=b:${sectorCode}&fields=f12,f14,f3,f62,f8,f20`;
    
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
      const constituents = this.parseSectorConstituentsResponse(result.data);
      
      // 缓存结果
      if (options.useCache !== false) {
        this.setCache(cacheKey, constituents, 120000); // 2分钟缓存
      }
      
      return {
        success: true,
        data: constituents,
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
   * 解析板块成分股响应
   */
  private parseSectorConstituentsResponse(json: any): any[] {
    const data = json.data?.diff;
    if (!data || !Array.isArray(data)) {
      throw new Error('Invalid constituents format');
    }

    return data.map((item: any) => ({
      code: item.f12,
      name: item.f14,
      changePercent: item.f3,
      capitalInflow: item.f62,
      turnoverRate: item.f8,
      marketCap: item.f20,
    }));
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