/**
 * Unified Stock Data Service
 * 统一股票数据服务 - 使用统一 API 客户端
 * 
 * 优先级:
 * 1. 东方财富 (主要，有完整财务指标)
 * 2. 腾讯财经 (备用)
 * 3. 新浪财经 (备用)
 * 
 * @module services/UnifiedStockDataService
 * @version 2.0.0
 */

import { StockQuote, KLinePoint } from '../types/DataContract';
import { apiClient, ApiResponse } from './ApiClient';
import { logger } from '../utils/logger';
import { AppError, ErrorCode } from '../utils/errors';

// ============================================================================
// Configuration
// ============================================================================

const MARKET_PREFIXES = {
  SHANGHAI: ['600', '601', '603', '605', '688', '510', '511', '512', '513', '515', '516', '518', '519'],
  SHENZHEN: ['000', '001', '002', '003', '300', '301']
};

function getMarketPrefix(symbol: string): 'sh' | 'sz' {
  return MARKET_PREFIXES.SHANGHAI.includes(symbol.substring(0, 3)) ? 'sh' : 'sz';
}

const API_CONFIG = {
  TENCENT: {
    name: '腾讯财经',
    quoteUrl: (symbol: string) => `/api/tencent/quote?q=${getMarketPrefix(symbol)}${symbol}`,
    klineUrl: (symbol: string, days: number) => {
      const market = getMarketPrefix(symbol);
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      return `/api/tencent/kline?code=${market}${symbol}&start=${startDate}&end=${endDate}&limit=${days}&adjust=qfq`;
    },
    timeout: 5000
  },
  EASTMONEY: {
    name: '东方财富',
    quoteUrl: (symbol: string) => {
      const secid = symbol.startsWith('6') ? `1.${symbol}` : `0.${symbol}`;
      return `/api/eastmoney/quote?secid=${secid}&fields=f9,f43,f44,f45,f46,f47,f48,f49,f57,f58,f60,f116,f152,f162,f163,f164,f169,f170`;
    },
    klineUrl: (symbol: string, timeframe: string, days: number) => {
      const secid = symbol.startsWith('6') ? `1.${symbol}` : `0.${symbol}`;
      const klt = timeframe === '60' ? '60' : timeframe === '240' ? '240' : '101';
      return `/api/eastmoney/kline?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=${klt}&fqt=1&lmt=${days}&end=20500101`;
    },
    timeout: 8000
  },
  SINA: {
    name: '新浪财经',
    quoteUrl: (symbol: string) => `/api/sina/quote?list=${getMarketPrefix(symbol)}${symbol}`,
    timeout: 5000
  }
};

const stockTotalSharesMap: Record<string, number> = {
  '600519': 1250000000, '000858': 3880000000, '300750': 4400000000,
  '002594': 2900000000, '510300': 8000000000, '513310': 1000000000
};

// ============================================================================
// Response Parsers
// ============================================================================

function parseTencentQuote(symbol: string, text: string): StockQuote | null {
  const match = text.match(/v_\w+="([^"]+)"/);
  if (!match) return null;
  
  const parts = match[1].split('~');
  if (parts.length < 32) return null;
  
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
    code: symbol, symbol, name: name || symbol,
    currentPrice, change, changePercent, open, high, low, close, volume,
    pe: 0, peg: 0, pb: 0, roe: 0, profitGrowth: 0, revenueGrowth: 0,
    marketCap, totalShares, source: 'tencent', timestamp: new Date().toISOString()
  };
}

function parseEastmoneyQuote(symbol: string, json: any): StockQuote | null {
  const data = json.data;
  if (!data) return null;

  const currentPrice = (data.f43 || 0) / 100;
  const openPrice = (data.f46 || 0) / 100;
  const highPrice = (data.f44 || 0) / 100;
  const lowPrice = (data.f45 || 0) / 100;
  const closePrice = (data.f60 || 0) / 100;
  const change = (data.f169 || 0) / 100;
  const changePercent = (data.f170 || 0) / 100;

  return {
    code: symbol, symbol, name: data.f58 || symbol,
    currentPrice, change, changePercent,
    open: openPrice, high: highPrice, low: lowPrice, close: closePrice,
    volume: data.f47 || 0,
    pe: (data.f9 || 0) / 100, peTtm: (data.f162 || 0) / 100,
    ps: (data.f163 || 0) / 100, pb: (data.f152 || 0) / 100,
    roe: (data.f164 || 0) / 100,
    profitGrowth: 0, revenueGrowth: 0, peg: (data.f163 || 0) / 100,
    marketCap: data.f116 || 0, totalShares: stockTotalSharesMap[symbol],
    source: 'eastmoney', timestamp: new Date().toISOString()
  };
}

function parseSinaQuote(symbol: string, text: string): StockQuote | null {
  const match = text.match(/="([^"]+)"/);
  if (!match) return null;

  const parts = match[1].split(',');
  if (parts.length < 32) return null;

  return {
    code: symbol, symbol, name: parts[0] || symbol,
    currentPrice: parseFloat(parts[3]) || 0,
    change: parseFloat(parts[8]) || 0,
    changePercent: parseFloat(parts[32]) || 0,
    open: parseFloat(parts[1]) || 0,
    high: parseFloat(parts[4]) || 0,
    low: parseFloat(parts[5]) || 0,
    close: parseFloat(parts[2]) || 0,
    volume: parseInt(parts[6]) || 0,
    pe: 0, peg: 0, pb: 0, roe: 0, profitGrowth: 0, revenueGrowth: 0,
    marketCap: parseFloat(parts[44]) || 0,
    totalShares: stockTotalSharesMap[symbol],
    source: 'sina', timestamp: new Date().toISOString()
  };
}

function parseEastmoneyKLine(json: any): KLinePoint[] | null {
  // 处理多种可能的返回格式
  let klines = json.data?.klines || json.data?.Klines || json.result?.data || json.result?.klines;
  
  // 如果是字符串，尝试解析
  if (typeof klines === 'string') {
    try { klines = JSON.parse(klines); } catch { return null; }
  }
  
  if (!klines || !Array.isArray(klines) || klines.length === 0) {
    console.warn('[parseEastmoneyKLine] 无 K 线数据', json);
    return null;
  }

  return klines.map((kline: any) => {
    // 处理字符串格式 "日期,开盘,收盘,最高,最低,成交量"
    if (typeof kline === 'string') {
      const parts = kline.split(',');
      if (parts.length < 6) return null;
      return {
        date: parts[0],
        open: parseFloat(parts[1]) || 0,
        close: parseFloat(parts[2]) || 0,
        high: parseFloat(parts[3]) || 0,
        low: parseFloat(parts[4]) || 0,
        volume: parseInt(parts[5]) || 0
      };
    }
    // 处理对象格式
    return {
      date: kline.day || kline.date || kline[0],
      open: parseFloat(kline.open || kline[1]) || 0,
      close: parseFloat(kline.close || kline[2]) || 0,
      high: parseFloat(kline.high || kline[3]) || 0,
      low: parseFloat(kline.low || kline[4]) || 0,
      volume: parseInt(kline.volume || kline[5]) || 0
    };
  }).filter((k: KLinePoint | null) => k && !isNaN(k.open) && k.open > 0);
}

function parseTencentKLine(json: any, symbol: string): KLinePoint[] | null {
  const market = getMarketPrefix(symbol);
  const key = market + symbol;
  
  // 处理多种可能的返回格式
  let data = json.data?.[key]?.day || json.data?.[key]?.qfq || json.data?.[key]?.qfqday ||
             json.data?.day || json.data?.qfq || json.data?.qfqday ||
             json.result?.data || json.result?.day;
  
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.warn('[parseTencentKLine] 无 K 线数据', json);
    return null;
  }
  
  return data.map((item: any) => {
    // 处理数组格式 [日期, 开盘, 收盘, 最低, 最高, 成交量]
    if (Array.isArray(item)) {
      return {
        date: item[0],
        open: parseFloat(item[1]) || 0,
        close: parseFloat(item[2]) || 0,
        low: parseFloat(item[3]) || 0,
        high: parseFloat(item[4]) || 0,
        volume: parseInt(item[5]) || 0
      };
    }
    // 处理对象格式
    return {
      date: item.date || item.day || item[0],
      open: parseFloat(item.open || item[1]) || 0,
      close: parseFloat(item.close || item[2]) || 0,
      low: parseFloat(item.low || item[3]) || 0,
      high: parseFloat(item.high || item[4]) || 0,
      volume: parseInt(item.volume || item[5]) || 0
    };
  }).filter((k: KLinePoint) => !isNaN(k.open) && k.open > 0);
}

// ============================================================================
// Main Service Class
// ============================================================================

export class UnifiedStockDataService {
  /**
   * 获取股票实时行情（3 级回退）
   */
  async fetchQuote(symbol: string): Promise<StockQuote | null> {
    try {
      // 1. 东方财富（优先）
      const eastmoneyQuote = await this.fetchEastmoneyQuote(symbol);
      if (eastmoneyQuote) {
        logger.info('[统一数据服务] 东方财富行情成功', { symbol });
        return eastmoneyQuote;
      }

      // 2. 腾讯财经
      const tencentQuote = await this.fetchTencentQuote(symbol);
      if (tencentQuote) {
        logger.info('[统一数据服务] 腾讯行情成功', { symbol });
        return tencentQuote;
      }

      // 3. 新浪财经
      const sinaQuote = await this.fetchSinaQuote(symbol);
      if (sinaQuote) {
        logger.info('[统一数据服务] 新浪财经行情成功', { symbol });
        return sinaQuote;
      }

      logger.warn('[统一数据服务] 所有 API 失败', { symbol });
      return null;
    } catch (error) {
      logger.error('[统一数据服务] 获取行情失败', error, { symbol });
      return null;
    }
  }

  private async fetchTencentQuote(symbol: string): Promise<StockQuote | null> {
    try {
      const url = API_CONFIG.TENCENT.quoteUrl(symbol);
      const response: ApiResponse<any> = await apiClient.get(url, { timeout: API_CONFIG.TENCENT.timeout });
      
      if (!response.success || !response.data) return null;
      
      return parseTencentQuote(symbol, response.data);
    } catch (error) {
      logger.warn('[腾讯行情] 获取失败', error, { symbol });
      return null;
    }
  }

  private async fetchEastmoneyQuote(symbol: string): Promise<StockQuote | null> {
    try {
      const url = API_CONFIG.EASTMONEY.quoteUrl(symbol);
      const response: ApiResponse<any> = await apiClient.get(url, { timeout: API_CONFIG.EASTMONEY.timeout });
      
      if (!response.success || !response.data) return null;
      
      return parseEastmoneyQuote(symbol, response.data);
    } catch (error) {
      logger.warn('[东方财富行情] 获取失败', error, { symbol });
      return null;
    }
  }

  private async fetchSinaQuote(symbol: string): Promise<StockQuote | null> {
    try {
      const url = API_CONFIG.SINA.quoteUrl(symbol);
      const response: ApiResponse<any> = await apiClient.get(url, { timeout: API_CONFIG.SINA.timeout });
      
      if (!response.success || !response.data) return null;
      
      return parseSinaQuote(symbol, response.data);
    } catch (error) {
      logger.warn('[新浪财经行情] 获取失败', error, { symbol });
      return null;
    }
  }

  /**
   * 获取 K 线数据（指定周期）
   */
  async fetchKLineDataByPeriod(symbol: string, timeframe: string, days: number): Promise<KLinePoint[] | null> {
    try {
      const emData = await this.fetchEastmoneyKLine(symbol, timeframe, days);
      if (emData && emData.length > 0) {
        logger.info('[fetchKLineDataByPeriod] 东方财富 K 线成功', { symbol, count: emData.length });
        return emData;
      }
      
      logger.warn('[fetchKLineDataByPeriod] 东方财富 K 线失败，尝试腾讯', { symbol });
      const tencentData = await this.fetchTencentKLine(symbol, days);
      if (tencentData && tencentData.length > 0) {
        logger.info('[fetchKLineDataByPeriod] 腾讯 K 线成功', { symbol, count: tencentData.length });
        return tencentData;
      }
      
      logger.warn('[fetchKLineDataByPeriod] 所有 API 均失败', { symbol });
      return null;
    } catch (error) {
      logger.error('[fetchKLineDataByPeriod] 获取 K 线数据异常', error, { symbol });
      return null;
    }
  }

  private async fetchEastmoneyKLine(symbol: string, timeframe: string, days: number): Promise<KLinePoint[] | null> {
    try {
      const url = API_CONFIG.EASTMONEY.klineUrl(symbol, timeframe, days);
      const response: ApiResponse<any> = await apiClient.get(url, { timeout: API_CONFIG.EASTMONEY.timeout });
      
      if (!response.success || !response.data) return null;
      
      return parseEastmoneyKLine(response.data);
    } catch (error) {
      logger.warn('[东方财富 K 线] 获取失败', error, { symbol });
      return null;
    }
  }

  private async fetchTencentKLine(symbol: string, days: number): Promise<KLinePoint[] | null> {
    try {
      const url = API_CONFIG.TENCENT.klineUrl(symbol, days);
      const response: ApiResponse<any> = await apiClient.get(url, { timeout: API_CONFIG.TENCENT.timeout });
      
      if (!response.success || !response.data) return null;
      
      return parseTencentKLine(response.data, symbol);
    } catch (error) {
      logger.warn('[腾讯 K 线] 获取失败', error, { symbol });
      return null;
    }
  }

  /**
   * 获取多周期 K 线数据
   */
  async fetchMultiPeriodKLineData(symbol: string, days: number = 365): Promise<{
    '60': KLinePoint[];
    '240': KLinePoint[];
    '101': KLinePoint[];
  } | null> {
    try {
      logger.info('[fetchMultiPeriodKLineData] 开始获取多周期 K 线', { symbol, days });
      
      const [k1h, k4h, k1d] = await Promise.all([
        this.fetchKLineDataByPeriod(symbol, '60', 90),
        this.fetchKLineDataByPeriod(symbol, '240', 90),
        this.fetchKLineDataByPeriod(symbol, '101', 365)
      ]);
      
      const result = { '60': k1h || [], '240': k4h || [], '101': k1d || [] };
      
      const totalPoints = result['60'].length + result['240'].length + result['101'].length;
      logger.info('[fetchMultiPeriodKLineData] 获取完成', { symbol, totalPoints });
      
      return result;
    } catch (error) {
      logger.error('[fetchMultiPeriodKLineData] 获取多周期 K 线失败', error, { symbol });
      return null;
    }
  }

  // 向后兼容别名 - 使用箭头函数确保 this 绑定
  fetchStockQuote = async (symbol: string): Promise<StockQuote | null> => {
    return this.fetchQuote(symbol);
  };
  
  fetchKLineData = async (symbol: string, timeframe: string, days: number): Promise<KLinePoint[] | null> => {
    return this.fetchKLineDataByPeriod(symbol, timeframe, days);
  };
}

export const unifiedStockDataService = new UnifiedStockDataService();
