/**
 * Unified Stock Data Service
 * 统一股票数据服务 - 3 级冗余策略
 * 
 * 优先级:
 * 1. 腾讯财经 (主要)
 * 2. 东方财富 (备用)
 * 3. 新浪财经 (备用)
 */

import { StockQuote, KLinePoint } from '../types/DataContract';

// API 配置 - 使用 Vite 代理路径
const API_CONFIG = {
  TENCENT: {
    name: '腾讯财经',
    quoteUrl: (symbol: string) => {
      const market = getMarketPrefix(symbol);
      return `/api/tencent/quote?q=${market}${symbol}`;
    },
    timeout: 5000
  },
  EASTMONEY: {
    name: '东方财富',
    quoteUrl: (symbol: string) => {
      const secid = symbol.startsWith('6') ? `1.${symbol}` : `0.${symbol}`;
      return `/api/eastmoney/quote?secid=${secid}&fields=f43,f44,f45,f46,f47,f48,f49,f57,f58,f60,f169,f170`;
    },
    timeout: 8000
  },
  SINA: {
    name: '新浪财经',
    quoteUrl: (symbol: string) => {
      const market = getMarketPrefix(symbol);
      return `/api/sina?list=${market}${symbol}`;
    },
    timeout: 5000
  }
};

// 获取市场前缀
function getMarketPrefix(symbol: string): 'sh' | 'sz' {
  const prefix = symbol.substring(0, 3);
  const shanghai = ['600', '601', '603', '605', '688', '510', '511', '512', '513', '515', '516', '518', '519'];
  return shanghai.includes(prefix) ? 'sh' : 'sz';
}

// 股票名称映射（备用）
const stockNameMap: Record<string, string> = {
  '600519': '贵州茅台',
  '000858': '五粮液',
  '300750': '宁德时代',
  '002594': '比亚迪',
  '510300': '沪深 300ETF',
  '513310': '中韩半导体 ETF'
};

// 股票总股本映射（用于市值计算）
const stockTotalSharesMap: Record<string, number> = {
  '600519': 1250000000,
  '000858': 3880000000,
  '300750': 4400000000,
  '002594': 2900000000,
  '510300': 8000000000,
  '513310': 1000000000
};

export class UnifiedStockDataService {
  /**
   * 获取股票实时行情
   * 优先级：东方财富 > 腾讯 > 新浪（东方财富有完整财务指标）
   */
  async fetchQuote(symbol: string): Promise<StockQuote | null> {
    try {
      // 1. 尝试东方财富（优先，有完整财务指标）
      const eastmoneyQuote = await this.fetchEastmoneyQuote(symbol);
      if (eastmoneyQuote) {
        console.log('[统一数据服务] 东方财富行情成功');
        return eastmoneyQuote;
      }

      // 2. 尝试腾讯财经
      const tencentQuote = await this.fetchTencentQuote(symbol);
      if (tencentQuote) {
        console.log('[统一数据服务] 腾讯行情成功');
        return tencentQuote;
      }

      // 3. 尝试新浪财经
      const sinaQuote = await this.fetchSinaQuote(symbol);
      if (sinaQuote) {
        console.log('[统一数据服务] 新浪财经行情成功');
        return sinaQuote;
      }

      console.warn('[统一数据服务] 所有 API 失败');
      return null;
    } catch (error) {
      console.error('[统一数据服务] 获取行情失败:', error);
      return null;
    }
  }

  /**
   * 腾讯财经 API - 获取实时行情
   * 腾讯API返回文本格式：v_sh600519="1~贵州茅台~600519~1452.46~..."
   */
  private async fetchTencentQuote(symbol: string): Promise<StockQuote | null> {
    try {
      const market = getMarketPrefix(symbol);
      const url = `/api/tencent/quote?q=${market}${symbol}`;
      
      const response = await fetch(url);
      if (!response.ok) return null;
      
      // 腾讯API返回文本格式，不是JSON
      const text = await response.text();
      const match = text.match(/v_\w+="([^"]+)"/);
      if (!match) return null;
      
      const parts = match[1].split('~');
      if (parts.length < 32) return null;
      
      // 腾讯格式: 0=市场, 1=名称, 2=代码, 3=当前价, 4=昨收, 5=开盘, 6=成交量, ...
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
        name: name || symbol,
        currentPrice: currentPrice,
        change: change,
        changePercent: changePercent,
        open: open,
        high: high,
        low: low,
        close: close,
        volume: volume,
        pe: 0,
        peg: 0,
        pb: 0,
        roe: 0,
        profitGrowth: 0,
        revenueGrowth: 0,
        marketCap: marketCap,
        totalShares: totalShares,
        source: 'tencent',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.warn('[腾讯行情] 获取失败:', error);
      return null;
    }
  }

  /**
   * 东方财富 API - 获取实时行情（增强版，包含财务指标）
   */
  private async fetchEastmoneyQuote(symbol: string): Promise<StockQuote | null> {
    try {
      const secid = symbol.startsWith('6') ? `1.${symbol}` : `0.${symbol}`;
      // 扩展字段：添加财务指标字段
      const url = `/api/eastmoney/quote?secid=${secid}&fields=f9,f43,f44,f45,f46,f47,f48,f49,f57,f58,f60,f116,f152,f162,f163,f164,f169,f170`;
      
      const response = await fetch(url);
      if (!response.ok) return null;
      
      const json = await response.json();
      const data = json.data;
      if (!data) return null;

      // 东方财富 API 字段说明：
      // f43=当前价(分), f44=最高价(分), f45=最低价(分), f46=开盘价(分)
      // f47=成交量(手), f48=成交额(元), f49=总市值(万元)
      // f57=股票代码, f58=股票名称, f60=昨收(分)
      // f116=总市值(元), f169=涨跌额(分), f170=涨跌幅(0.01%)
      const currentPrice = (data.f43 || 0) / 100;
      const openPrice = (data.f46 || 0) / 100;
      const highPrice = (data.f44 || 0) / 100;
      const lowPrice = (data.f45 || 0) / 100;  // f45是最低价，不是f47
      const closePrice = (data.f60 || 0) / 100;
      const change = (data.f169 || 0) / 100;  // f169是涨跌额(分)
      const changePercent = (data.f170 || 0) / 100;  // f170是涨跌幅(0.01%)
      
      return {
        code: symbol,
        symbol: symbol,
        name: data.f58 || symbol,
        currentPrice: currentPrice,
        change: change,
        changePercent: changePercent,
        open: openPrice,
        high: highPrice,
        low: lowPrice,
        close: closePrice,
        volume: data.f47 || 0,  // 成交量(手)
        // 财务指标 - 东方财富返回的是原始值，需要除以100
        pe: (data.f9 || 0) / 100,           // 市盈率
        peTtm: (data.f162 || 0) / 100,      // 市盈率TTM
        ps: (data.f163 || 0) / 100,         // 市销率
        pb: (data.f152 || 0) / 100,         // 市净率
        roe: (data.f164 || 0) / 100,        // ROE(%)
        profitGrowth: 0,            // 需要其他API获取
        revenueGrowth: 0,           // 需要其他API获取
        peg: (data.f163 || 0) / 100,        // PEG（市销率作为近似）
        marketCap: data.f116 || 0,  // 市值单位是元
        totalShares: stockTotalSharesMap[symbol],
        source: 'eastmoney',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.warn('[东方财富行情] 获取失败:', error);
      return null;
    }
  }

  /**
   * 新浪财经 API - 获取实时行情
   */
  private async fetchSinaQuote(symbol: string): Promise<StockQuote | null> {
    try {
      const market = getMarketPrefix(symbol);
      const url = `/api/sina?list=${market}${symbol}`;
      
      const response = await fetch(url);
      if (!response.ok) return null;
      
      const text = await response.text();
      const match = text.match(/="([^"]+)"/);
      if (!match) return null;

      const parts = match[1].split(',');
      if (parts.length < 32) return null;

      return {
        code: symbol,
        symbol: symbol,
        name: parts[0] || symbol,
        currentPrice: parseFloat(parts[3]) || 0,
        change: parseFloat(parts[8]) || 0,
        changePercent: parseFloat(parts[32]) || 0,
        open: parseFloat(parts[1]) || 0,
        high: parseFloat(parts[4]) || 0,
        low: parseFloat(parts[5]) || 0,
        close: parseFloat(parts[2]) || 0,
        volume: parseInt(parts[6]) || 0,
        pe: 0,
        peg: 0,
        pb: 0,
        roe: 0,
        profitGrowth: 0,
        revenueGrowth: 0,
        marketCap: parseFloat(parts[44]) || 0,
        totalShares: stockTotalSharesMap[symbol],
        source: 'sina',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.warn('[新浪财经行情] 获取失败:', error);
      return null;
    }
  }

  /**
   * 获取 K 线数据（指定周期）
   * 使用东方财富 API（更稳定）
   */
  async fetchKLineDataByPeriod(symbol: string, timeframe: string, days: number): Promise<KLinePoint[] | null> {
    // 首先尝试东方财富K线API
    const emData = await this.fetchEastmoneyKLine(symbol, timeframe, days);
    if (emData && emData.length > 0) {
      return emData;
    }
    
    // 如果东方财富失败，尝试腾讯K线API
    const tencentData = await this.fetchTencentKLine(symbol, days);
    if (tencentData && tencentData.length > 0) {
      return tencentData;
    }
    
    return null;
  }

  /**
   * 东方财富 K 线 API
   */
  private async fetchEastmoneyKLine(symbol: string, timeframe: string, days: number): Promise<KLinePoint[] | null> {
    try {
      const secid = symbol.startsWith('6') ? `1.${symbol}` : `0.${symbol}`;
      const klt = timeframe === '60' ? '60' : timeframe === '240' ? '240' : '101';
      const fields1 = 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13';
      const fields2 = 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61';
      // end参数是必需的，否则返回rc=102
      const url = `/api/eastmoney/kline?secid=${secid}&fields1=${fields1}&fields2=${fields2}&klt=${klt}&fqt=1&lmt=${days}&end=20500101`;
      
      const response = await fetch(url);
      if (!response.ok) return null;
      
      const json = await response.json();
      const klines = json.data?.klines;
      if (!klines || !Array.isArray(klines) || klines.length === 0) {
        console.warn('[东方财富K线] 无数据，尝试腾讯K线');
        return null;
      }

      return klines.map((kline: string) => {
        const parts = kline.split(',');
        return {
          date: parts[0],
          open: parseFloat(parts[1]),
          close: parseFloat(parts[2]),
          low: parseFloat(parts[3]),
          high: parseFloat(parts[4]),
          volume: parseInt(parts[5]) || 0
        };
      }).filter((k: KLinePoint) => !isNaN(k.open) && k.open > 0);
    } catch (error) {
      console.warn('[东方财富K线] 获取失败:', error);
      return null;
    }
  }

  /**
   * 腾讯 K 线 API (备选)
   */
  private async fetchTencentKLine(symbol: string, days: number): Promise<KLinePoint[] | null> {
    try {
      const market = symbol.startsWith('6') ? 'sh' : 'sz';
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const url = `/api/tencent/kline?code=${market}${symbol}&start=${startDate}&end=${endDate}&limit=${days}&adjust=qfq`;
      console.log('[腾讯K线] 请求URL:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        console.warn('[腾讯K线] HTTP错误:', response.status);
        return null;
      }
      
      const json = await response.json();
      console.log('[腾讯K线] 响应:', json);
      
      const key = market + symbol;
      const data = json.data?.[key]?.day;
      
      if (!data) {
        console.warn('[腾讯K线] data字段为空, json:', json);
        return null;
      }
      
      if (!Array.isArray(data)) {
        console.warn('[腾讯K线] data不是数组:', data);
        return null;
      }
      
      if (data.length === 0) {
        console.warn('[腾讯K线] 数据为空数组');
        return null;
      }

      console.log('[腾讯K线] 获取到', data.length, '条数据');
      
      // 腾讯格式: [日期, 开盘, 收盘, 最低, 最高, 成交量]
      const result = data.map((item: any[]) => ({
        date: item[0],
        open: parseFloat(item[1]),
        close: parseFloat(item[2]),
        low: parseFloat(item[3]),
        high: parseFloat(item[4]),
        volume: parseInt(item[5]) || 0
      })).filter((k: KLinePoint) => !isNaN(k.open) && k.open > 0);
      
      console.log('[腾讯K线] 解析后', result.length, '条有效数据');
      return result;
    } catch (error) {
      console.warn('[腾讯K线] 获取失败:', error);
      return null;
    }
  }

  // ===== 获取多周期 K 线数据（用于切换） =====
  async fetchMultiPeriodKLineData(symbol: string, days: number = 365): Promise<{
    '60': KLinePoint[];
    '240': KLinePoint[];
    '101': KLinePoint[];
  } | null> {
    try {
      // 获取数据：日线一年，小时线 90 天
      const [k1h, k4h, k1d] = await Promise.all([
        this.fetchKLineDataByPeriod(symbol, '60', 90),    // 1 小时线：90 天
        this.fetchKLineDataByPeriod(symbol, '240', 90),   // 4 小时线：90 天
        this.fetchKLineDataByPeriod(symbol, '101', 365)   // 日线：一年
      ]);
      
      return {
        '60': k1h || [],
        '240': k4h || [],
        '101': k1d || []
      };
    } catch (error) {
      console.error('[多周期 K 线] 获取失败:', error);
      return null;
    }
  }

  // ===== 向后兼容的别名方法 =====
  fetchStockQuote = this.fetchQuote;
  fetchKLineData = this.fetchKLineDataByPeriod;
}

// 导出单例
export const unifiedStockDataService = new UnifiedStockDataService();
