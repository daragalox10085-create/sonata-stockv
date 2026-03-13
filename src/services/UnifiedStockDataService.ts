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
  '002594': '比亚迪',
  '300750': '宁德时代',
  '510300': '沪深 300ETF',
  '513310': '中韩半导体 ETF'
};

export class UnifiedStockDataService {
  /**
   * 获取股票实时行情 - 3 级冗余
   */
  async fetchStockQuote(symbol: string): Promise<StockQuote | null> {
    console.log(`[UnifiedStockData] 开始获取 ${symbol} 行情数据`);
    
    // 第 1 层：腾讯财经
    try {
      const tencentData = await this.fetchFromTencent(symbol);
      if (tencentData) {
        console.log(`[UnifiedStockData] ✅ 腾讯财经成功：${symbol}`);
        return tencentData;
      }
    } catch (error) {
      console.warn(`[UnifiedStockData] 腾讯财经失败：${symbol}`, error);
    }
    
    // 第 2 层：东方财富
    try {
      const eastmoneyData = await this.fetchFromEastmoney(symbol);
      if (eastmoneyData) {
        console.log(`[UnifiedStockData] ✅ 东方财富成功：${symbol}`);
        return eastmoneyData;
      }
    } catch (error) {
      console.warn(`[UnifiedStockData] 东方财富失败：${symbol}`, error);
    }
    
    // 第 3 层：新浪财经
    try {
      const sinaData = await this.fetchFromSina(symbol);
      if (sinaData) {
        console.log(`[UnifiedStockData] ✅ 新浪财经成功：${symbol}`);
        return sinaData;
      }
    } catch (error) {
      console.warn(`[UnifiedStockData] 新浪财经失败：${symbol}`, error);
    }
    
    console.error(`[UnifiedStockData] ❌ 所有 API 失败：${symbol}`);
    return null;
  }

  /**
   * 获取 K 线数据 - 2 级冗余 + 交叉验证
   * 优先使用腾讯 API，获取一年数据（240个交易日）
   */
  async fetchKLineData(symbol: string, days: number = 240): Promise<KLinePoint[] | null> {
    console.log(`[UnifiedStockData] 开始获取 ${symbol} K 线数据，天数：${days}`);
    
    // 同时获取两个数据源进行交叉验证
    let tencentKLine: KLinePoint[] | null = null;
    let eastmoneyKLine: KLinePoint[] | null = null;
    
    // 第 1 层：腾讯 K 线（优先）
    try {
      tencentKLine = await this.fetchKLineFromTencent(symbol, days);
      if (tencentKLine && tencentKLine.length > 0) {
        console.log(`[UnifiedStockData] ✅ 腾讯 K 线成功：${symbol}, ${tencentKLine.length}条`);
      }
    } catch (error) {
      console.warn(`[UnifiedStockData] 腾讯 K 线失败：${symbol}`, error);
    }
    
    // 第 2 层：东方财富 K 线（备用+验证）
    try {
      eastmoneyKLine = await this.fetchKLineFromEastmoney(symbol, days);
      if (eastmoneyKLine && eastmoneyKLine.length > 0) {
        console.log(`[UnifiedStockData] ✅ 东方财富 K 线成功：${symbol}, ${eastmoneyKLine.length}条`);
      }
    } catch (error) {
      console.warn(`[UnifiedStockData] 东方财富 K 线失败：${symbol}`, error);
    }
    
    // 交叉验证
    if (tencentKLine && eastmoneyKLine && tencentKLine.length > 0 && eastmoneyKLine.length > 0) {
      const validation = this.validateKLineData(tencentKLine, eastmoneyKLine, symbol);
      if (validation.isValid) {
        console.log(`[UnifiedStockData] ✅ 交叉验证通过，使用腾讯数据：${symbol}`);
        return tencentKLine;
      } else {
        console.warn(`[UnifiedStockData] ⚠️ 交叉验证失败：${validation.reason}，使用东方财富数据`);
        return eastmoneyKLine;
      }
    }
    
    // 返回可用的数据
    if (tencentKLine && tencentKLine.length > 0) return tencentKLine;
    if (eastmoneyKLine && eastmoneyKLine.length > 0) return eastmoneyKLine;
    
    console.error(`[UnifiedStockData] ❌ 所有 K 线 API 失败：${symbol}`);
    return null;
  }
  
  /**
   * K线数据交叉验证
   */
  private validateKLineData(
    tencentData: KLinePoint[], 
    eastmoneyData: KLinePoint[], 
    symbol: string
  ): { isValid: boolean; reason?: string } {
    // 1. 检查数据条数差异
    const countDiff = Math.abs(tencentData.length - eastmoneyData.length);
    if (countDiff > 5) {
      return { isValid: false, reason: `数据条数差异过大: 腾讯${tencentData.length} vs 东方财富${eastmoneyData.length}` };
    }
    
    // 2. 检查最新价格差异（取最近5天的平均差异）
    const sampleSize = Math.min(5, tencentData.length, eastmoneyData.length);
    let totalDiffPercent = 0;
    
    for (let i = 0; i < sampleSize; i++) {
      const tencentPrice = tencentData[tencentData.length - 1 - i].close;
      const eastmoneyPrice = eastmoneyData[eastmoneyData.length - 1 - i].close;
      const diffPercent = Math.abs(tencentPrice - eastmoneyPrice) / tencentPrice * 100;
      totalDiffPercent += diffPercent;
    }
    
    const avgDiffPercent = totalDiffPercent / sampleSize;
    if (avgDiffPercent > 2) { // 允许2%的差异
      return { isValid: false, reason: `价格差异过大: ${avgDiffPercent.toFixed(2)}%` };
    }
    
    console.log(`[UnifiedStockData] ✅ ${symbol} 交叉验证通过，价格差异: ${avgDiffPercent.toFixed(2)}%`);
    return { isValid: true };
  }

  // ===== 腾讯财经 =====
  private async fetchFromTencent(symbol: string): Promise<StockQuote | null> {
    const url = API_CONFIG.TENCENT.quoteUrl(symbol);
    const response = await fetch(url, { 
      method: 'GET',
      headers: { 'Accept': '*/*' }
    });
    
    if (!response.ok) {
      console.log(`[腾讯行情] HTTP ${response.status}`);
      return null;
    }
    
    const text = await response.text();
    console.log(`[腾讯行情] 响应：${text.substring(0, 100)}...`);
    
    const match = text.match(/v_(sh|sz)\d+="([^"]+)"/);
    if (!match) {
      console.log('[腾讯行情] 正则匹配失败');
      return null;
    }
    
    const parts = match[2].split('~');
    if (parts.length < 30) return null;
    
    const currentPrice = parseFloat(parts[3]);
    const close = parseFloat(parts[4]);
    if (isNaN(currentPrice) || currentPrice <= 0) return null;
    
    const change = currentPrice - close;
    const changePercent = (change / close) * 100;
    
    return {
      code: symbol,
      name: parts[2] || stockNameMap[symbol] || '',
      currentPrice,
      change,
      changePercent,
      open: parseFloat(parts[5]),
      high: parseFloat(parts[33]) || currentPrice * 1.02,
      low: parseFloat(parts[34]) || currentPrice * 0.98,
      volume: parseInt(parts[7]) || 0,
      marketCap: (parseFloat(parts[15]) || parseFloat(parts[14]) || 0) * 10000, // 转换为元（API返回单位是万）
      pe: 0,
      peg: 0,
      pb: 0,
      roe: 0,
      profitGrowth: 0,
      revenueGrowth: 0,
      source: 'tencent',
      timestamp: new Date().toISOString()
    };
  }

  // ===== 东方财富 =====
  private async fetchFromEastmoney(symbol: string): Promise<StockQuote | null> {
    const url = API_CONFIG.EASTMONEY.quoteUrl(symbol);
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      console.log(`[东方财富行情] HTTP ${response.status}`);
      return null;
    }
    
    const json = await response.json();
    const data = json.data;
    if (!data) {
      console.log('[东方财富行情] 无 data 字段');
      return null;
    }
    
    const currentPrice = data.f43 ? data.f43 / 100 : 0;
    if (currentPrice <= 0) return null;
    
    return {
      code: symbol,
      name: data.f58 || stockNameMap[symbol] || '',
      currentPrice,
      change: data.f44 ? data.f44 / 100 : 0,
      changePercent: data.f45 ? data.f45 / 100 : 0,
      open: data.f46 ? data.f46 / 100 : 0,
      high: data.f47 ? data.f47 / 100 : 0,
      low: data.f48 ? data.f48 / 100 : 0,
      volume: data.f47 || 0,
      marketCap: data.f49 ? data.f49 * 100000000 : 0,
      pe: data.f162 || 0,
      peg: data.f163 || 0,
      pb: data.f167 || 0,
      roe: data.f164 || 0,
      profitGrowth: data.f169 || 0,
      revenueGrowth: data.f170 || 0,
      source: 'eastmoney',
      timestamp: new Date().toISOString()
    };
  }

  // ===== 新浪财经 =====
  private async fetchFromSina(symbol: string): Promise<StockQuote | null> {
    const url = API_CONFIG.SINA.quoteUrl(symbol);
    const response = await fetch(url, {
      method: 'GET',
      headers: { 
        'Accept': '*/*',
        'Referer': 'https://finance.sina.com.cn'
      }
    });
    
    if (!response.ok) return null;
    
    const text = await response.text();
    const match = text.match(/var hq_str_(?:sh|sz)\d+="([^"]*)"/);
    if (!match || !match[1]) return null;
    
    const fields = match[1].split(',');
    if (fields.length < 8) return null;
    
    const currentPrice = parseFloat(fields[3]);
    if (isNaN(currentPrice) || currentPrice <= 0) return null;
    
    const close = parseFloat(fields[2]);
    const change = currentPrice - close;
    const changePercent = (change / close) * 100;
    
    return {
      code: symbol,
      name: fields[0] || stockNameMap[symbol] || '',
      currentPrice,
      change,
      changePercent,
      open: parseFloat(fields[1]),
      high: parseFloat(fields[4]),
      low: parseFloat(fields[5]),
      volume: parseInt(fields[8]) || 0,
      marketCap: 0,
      pe: 0,
      peg: 0,
      pb: 0,
      roe: 0,
      profitGrowth: 0,
      revenueGrowth: 0,
      source: 'sina',
      timestamp: new Date().toISOString()
    };
  }

  // ===== K 线数据 =====
  private async fetchKLineFromEastmoney(symbol: string, days: number): Promise<KLinePoint[] | null> {
    try {
      const secid = symbol.startsWith('6') ? `1.${symbol}` : `0.${symbol}`;
      
      // 计算日期范围
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const beg = startDate.toISOString().slice(0, 10).replace(/-/g, '');
      const end = endDate.toISOString().slice(0, 10).replace(/-/g, '');
      
      const url = `/api/eastmoney/kline?secid=${secid}&klt=101&fqt=1&beg=${beg}&end=${end}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60`;
      
      console.log(`[K 线 - 东方财富] 请求：${url}`);
      
      const response = await fetch(url);
      console.log(`[K 线 - 东方财富] 状态：${response.status}`);
      
      if (!response.ok) return null;
      
      const json = await response.json();
      console.log(`[K 线 - 东方财富] klines: ${json.data?.klines?.length || 0}条`);
      
      const klines = json.data?.klines;
      if (!klines || !Array.isArray(klines)) return null;
      
      return klines.map((item: string) => {
        const parts = item.split(',');
        return {
          date: parts[0],
          open: parseFloat(parts[1]),
          close: parseFloat(parts[2]),
          high: parseFloat(parts[3]),
          low: parseFloat(parts[4]),
          volume: parseInt(parts[5]) || 0
        };
      }).filter(k => !isNaN(k.open) && !isNaN(k.close) && k.open > 0);
    } catch (error) {
      console.error('[K 线 - 东方财富] 错误:', error);
      return null;
    }
  }

  private async fetchKLineFromTencent(symbol: string, days: number): Promise<KLinePoint[] | null> {
    try {
      const market = getMarketPrefix(symbol);
      const code = `${market}${symbol}`;
      
      // 使用腾讯 FQ K 线 API
      // 格式: param=sz002594,day,2025-01-01,2026-03-13,240,qfq
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const startStr = startDate.toISOString().slice(0, 10);
      const endStr = endDate.toISOString().slice(0, 10);
      
      // 腾讯 FQ K 线 API - 使用正确的 URL 格式
      const url = `/api/tencent/kline?code=${code}&start=${startStr}&end=${endStr}&limit=${days}&adjust=qfq`;
      
      console.log(`[K 线 - 腾讯] 请求：${url}`);
      
      const response = await fetch(url);
      console.log(`[K 线 - 腾讯] 状态：${response.status}`);
      
      if (!response.ok) return null;
      
      const json = await response.json();
      
      // 腾讯返回格式: data[code].qfqday
      const klineData = json.data?.[code]?.qfqday;
      
      if (!klineData || !Array.isArray(klineData)) {
        console.warn('[K 线 - 腾讯] 无 K 线数据:', code, json);
        return null;
      }
      
      console.log(`[K 线 - 腾讯] ✅ 成功：${klineData.length} 条`);
      
      return klineData.map((item: string[]) => ({
        date: item[0],
        open: parseFloat(item[1]),
        close: parseFloat(item[2]),
        high: parseFloat(item[3]),
        low: parseFloat(item[4]),
        volume: parseInt(item[5]) || 0
      })).filter(k => !isNaN(k.open) && !isNaN(k.close) && k.open > 0);
    } catch (error) {
      console.error('[K 线 - 腾讯] 错误:', error);
      return null;
    }
  }
}

// 导出单例
export const unifiedStockDataService = new UnifiedStockDataService();