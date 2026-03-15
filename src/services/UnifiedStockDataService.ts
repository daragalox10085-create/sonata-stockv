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
   */
  private async fetchTencentQuote(symbol: string): Promise<StockQuote | null> {
    try {
      const market = getMarketPrefix(symbol);
      const url = `/api/tencent/quote?q=${market}${symbol}`;
      
      const response = await fetch(url);
      if (!response.ok) return null;
      
      const json = await response.json();
      const data = json.data?.[`${market}${symbol}`];
      if (!data) return null;

      return {
        code: symbol,
        symbol: symbol,
        name: data.name || symbol,
        currentPrice: data.price || 0,
        change: data.price - data.open || 0,
        changePercent: data.change_percent || 0,
        open: data.open || 0,
        high: data.high || 0,
        low: data.low || 0,
        close: data.prev_close || 0,
        pe: data.pe || 0,
        peg: 0,
        pb: data.pb || 0,
        roe: 0,
        profitGrowth: 0,
        revenueGrowth: 0,
        marketCap: data.total_market_cap || data.market_cap || 0,
        totalShares: stockTotalSharesMap[symbol],
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

      return {
        code: symbol,
        symbol: symbol,
        name: data.f58 || symbol,
        currentPrice: data.f43 || 0,
        change: (data.f43 - data.f44) || 0,
        changePercent: data.f170 || 0,
        open: data.f46 || 0,
        high: data.f44 || 0,
        low: data.f47 || 0,
        close: data.f44 || 0,
        // 财务指标
        pe: data.f9 || 0,           // 市盈率
        peTtm: data.f162 || 0,      // 市盈率TTM
        ps: data.f163 || 0,         // 市销率
        pb: data.f152 || 0,         // 市净率
        roe: data.f164 || 0,        // ROE
        profitGrowth: data.f169 || 0,  // 净利润增长率
        revenueGrowth: data.f170 || 0, // 营收增长率
        peg: data.f163 || 0,        // PEG（市销率作为近似）
        marketCap: data.f116 || 0,
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
   */
  async fetchKLineDataByPeriod(symbol: string, timeframe: string, days: number): Promise<KLinePoint[] | null> {
    try {
      // 使用腾讯财经 API
      const market = getMarketPrefix(symbol);
      const url = `/api/tencent/kline?q=${market}${symbol}&period=${timeframe}&days=${days}`;
      
      const response = await fetch(url);
      if (!response.ok) return null;
      
      const json = await response.json();
      const data = json.data?.[`${market}${symbol}`]?.day;
      if (!data || !Array.isArray(data)) return null;

      return data.map((item: any[]) => ({
        date: new Date(item[0] * 1000).toISOString().split('T')[0],
        open: item[1],
        high: item[3],
        low: item[4],
        close: item[2],
        volume: item[5] || 0
      })).filter((k: KLinePoint) => !isNaN(k.open) && k.open > 0);
    } catch (error) {
      console.warn('[K 线数据] 获取失败:', error);
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
