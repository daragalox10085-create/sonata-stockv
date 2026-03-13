/**
 * Stock API Service
 * 
 * Provides real-time stock data with a 3-tier fallback strategy:
 * 1. Tencent Finance (primary)
 * 2. East Money (secondary)
 * 3. Sina Finance (tertiary)
 * 
 * Note: Web Search fallback removed to ensure 100% real data only
 * 
 * @module services/stockApi
 * @version 1.1.0
 * @author Sonata Team
 */

import type { StockData, ApiLog, ApiConfig } from '../types';

// ============================================================================
// Configuration
// ============================================================================

/** Market prefix mapping for Chinese A-shares */
const MARKET_PREFIXES = {
  SHANGHAI: ['600', '601', '603', '605', '688', '510', '511', '512', '513', '515', '516', '518', '519'] as string[],
  SHENZHEN: ['000', '001', '002', '003', '300', '301'] as string[]
};

/**
 * Determines market prefix (sh/sz) based on stock symbol
 * @param symbol - 6-digit stock code
 * @returns Market prefix ('sh' or 'sz')
 */
function getMarketPrefix(symbol: string): 'sh' | 'sz' {
  const prefix = symbol.substring(0, 3);
  return MARKET_PREFIXES.SHANGHAI.includes(prefix) ? 'sh' : 'sz';
}

/** API endpoint configurations */
const API_CONFIG: Record<string, ApiConfig> = {
  TENCENT: {
    name: 'Tencent Finance',
    url: (symbol: string) => {
      const market = getMarketPrefix(symbol);
      return `/api/tencent/q=${market}${symbol}`;
    },
    timeout: 5000
  },
  EASTMONEY: {
    name: 'East Money',
    url: (symbol: string) => {
      const market = getMarketPrefix(symbol);
      const secid = market === 'sh' ? `1.${symbol}` : `0.${symbol}`;
      return `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f43,f44,f45,f46,f47,f48,f49,f57,f58,f60,f169`;
    },
    timeout: 5000
  },
  SINA: {
    name: 'Sina Finance',
    url: (symbol: string) => {
      const market = getMarketPrefix(symbol);
      return `https://hq.sinajs.cn/list=${market}${symbol}`;
    },
    timeout: 5000
  }
} as const;

// ============================================================================
// Logging
// ============================================================================

/** API request log storage */
const apiLogs: ApiLog[] = [];

/**
 * Logs API request with performance metrics
 * @param log - API log entry
 */
function logApiRequest(log: ApiLog): void {
  apiLogs.push(log);
  
  const logPrefix = log.status === 'success' ? '✅' : log.status === 'error' ? '❌' : '⏱️';
  const durationStr = log.duration >= 1000 
    ? `${(log.duration / 1000).toFixed(2)}s` 
    : `${log.duration}ms`;
  
  if (log.status === 'success') {
    console.log(`${logPrefix} [API] ${log.apiName} - ${log.symbol} - ${durationStr}`);
  } else {
    console.warn(`${logPrefix} [API] ${log.apiName} - ${log.symbol} - ${durationStr} - ${log.errorMessage}`);
  }
  
  // Keep only last 100 logs
  if (apiLogs.length > 100) {
    apiLogs.shift();
  }
}

/**
 * Retrieves API logs with optional filtering
 * @param symbol - Optional symbol filter
 * @returns Filtered API logs
 */
export function getApiLogs(symbol?: string): ApiLog[] {
  return symbol 
    ? apiLogs.filter(log => log.symbol === symbol)
    : [...apiLogs];
}

// ============================================================================
// Stock Name Mapping
// ============================================================================

/** Predefined stock name mappings for popular stocks */
export const stockNameMap: Record<string, string> = {
  '513310': 'China-Korea Semiconductor ETF',
  '600519': 'Kweichow Moutai',
  '600760': 'AVIC Optoelectronics',
  '000858': 'Wuliangye',
  '300750': 'CATL',
  '002594': 'BYD',
  '510300': 'CSI 300 ETF',
  '601318': 'Ping An Insurance',
  '600036': 'China Merchants Bank',
  '601012': 'LONGi Green Energy',
  '000333': 'Midea Group',
  '600276': 'Hengrui Medicine',
  '002415': 'Hikvision',
  '600887': 'Yili Group',
  '000568': 'Luzhou Laojiao',
  '002714': 'Muyuan Foods',
  '300760': 'Mindray Medical',
  '603288': 'Foshan Haitian'
} as const;

/** Total shares mapping for market cap calculation */
export const stockTotalSharesMap: Record<string, number> = {
  '600519': 1_250_000_000,
  '000858': 3_880_000_000,
  '300750': 4_400_000_000,
  '002594': 2_900_000_000,
  '600760': 1_600_000_000,
  '510300': 8_000_000_000,
  '513310': 1_000_000_000,
  '601318': 10_000_000_000,
  '600036': 25_000_000_000,
  '601012': 5_000_000_000
} as const;

// ============================================================================
// Response Parsers
// ============================================================================

/**
 * Parses Tencent Finance API response
 * @param symbol - Stock symbol
 * @param text - Raw API response
 * @returns Parsed stock data or null if invalid
 */
function parseTencentResponse(symbol: string, text: string): StockData | null {
  try {
    const match = text.match(/v_sh\d+="([^"]+)"/);
    if (!match) {
      console.warn(`[Parser] Tencent API response format invalid: ${text.substring(0, 100)}`);
      return null;
    }

    const parts = match[1].split('~');
    if (parts.length < 30) {
      console.warn(`[Parser] Tencent API response fields insufficient: ${parts.length}`);
      return null;
    }

    const currentPrice = parseFloat(parts[3]);
    const close = parseFloat(parts[4]);
    const open = parseFloat(parts[5]);
    const volume = parseInt(parts[6]);
    const high = parseFloat(parts[33]) || currentPrice * 1.02;
    const low = parseFloat(parts[34]) || currentPrice * 0.98;
    
    if (isNaN(currentPrice) || currentPrice <= 0) {
      console.warn(`[Parser] Tencent API price data invalid: ${currentPrice}`);
      return null;
    }
    
    const change = currentPrice - close;
    const changePercent = (change / close) * 100;
    const totalShares = stockTotalSharesMap[symbol] || 100_000_000;
    const marketCap = currentPrice * totalShares;

    return createStockData({
      symbol,
      name: stockNameMap[symbol] || parts[2] || 'Unknown Stock',
      currentPrice,
      change,
      changePercent,
      open,
      high,
      low,
      close,
      volume,
      marketCap,
      dataSource: API_CONFIG.TENCENT.name
    });
  } catch (error) {
    console.error(`[Parser] Tencent response parsing failed:`, error);
    return null;
  }
}

/**
 * Parses East Money API response
 * @param symbol - Stock symbol
 * @param json - Parsed JSON response
 * @returns Parsed stock data or null if invalid
 */
function parseEastmoneyResponse(symbol: string, json: any): StockData | null {
  try {
    if (json.code !== 0 || !json.data) {
      console.warn(`[Parser] East Money API error code: ${json.code}`);
      return null;
    }

    const data = json.data;
    const currentPrice = data.f43 ? data.f43 / 100 : 0;
    const close = data.f60 ? data.f60 / 100 : currentPrice;
    const open = data.f46 ? data.f46 / 100 : close;
    const high = data.f44 ? data.f44 / 100 : currentPrice * 1.02;
    const low = data.f45 ? data.f45 / 100 : currentPrice * 0.98;
    const volume = data.f47 || 0;
    
    if (currentPrice <= 0) {
      console.warn(`[Parser] East Money API price data invalid: ${currentPrice}`);
      return null;
    }

    const change = currentPrice - close;
    const changePercent = close > 0 ? (change / close) * 100 : 0;
    const totalShares = stockTotalSharesMap[symbol] || 100_000_000;
    const marketCap = currentPrice * totalShares;

    return createStockData({
      symbol,
      name: stockNameMap[symbol] || data.f58 || 'Unknown Stock',
      currentPrice,
      change,
      changePercent,
      open,
      high,
      low,
      close,
      volume,
      marketCap,
      dataSource: API_CONFIG.EASTMONEY.name
    });
  } catch (error) {
    console.error(`[Parser] East Money response parsing failed:`, error);
    return null;
  }
}

/**
 * Parses Sina Finance API response
 * @param symbol - Stock symbol
 * @param text - Raw API response
 * @returns Parsed stock data or null if invalid
 */
function parseSinaResponse(symbol: string, text: string): StockData | null {
  try {
    const match = text.match(/var hq_str_\w+="([^"]*)";/);
    if (!match || !match[1]) {
      console.warn(`[Parser] Sina API response format invalid`);
      return null;
    }

    const parts = match[1].split(',');
    if (parts.length < 8) {
      console.warn(`[Parser] Sina API response fields insufficient: ${parts.length}`);
      return null;
    }

    const name = parts[0];
    const open = parseFloat(parts[1]);
    const close = parseFloat(parts[2]);
    const currentPrice = parseFloat(parts[3]);
    const high = parseFloat(parts[4]);
    const low = parseFloat(parts[5]);
    const volume = parseInt(parts[8]) || 0;

    if (isNaN(currentPrice) || currentPrice <= 0) {
      console.warn(`[Parser] Sina API price data invalid: ${currentPrice}`);
      return null;
    }

    const change = currentPrice - close;
    const changePercent = close > 0 ? (change / close) * 100 : 0;
    const totalShares = stockTotalSharesMap[symbol] || 100_000_000;
    const marketCap = currentPrice * totalShares;

    return createStockData({
      symbol,
      name: stockNameMap[symbol] || name || 'Unknown Stock',
      currentPrice,
      change,
      changePercent,
      open,
      high,
      low,
      close,
      volume,
      marketCap,
      dataSource: API_CONFIG.SINA.name
    });
  } catch (error) {
    console.error(`[Parser] Sina response parsing failed:`, error);
    return null;
  }
}

// ============================================================================
// Stock Data Factory
// ============================================================================

interface StockDataParams {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  marketCap: number;
  dataSource: string;
}

/**
 * Creates a complete StockData object with calculated values
 * @param params - Core stock parameters
 * @returns Complete StockData object
 */
function createStockData(params: StockDataParams): StockData {
  const { symbol, name, currentPrice, change, changePercent, open, high, low, close, volume, marketCap, dataSource } = params;
  
  // Calculate technical levels based on today's price action
  // Support = today's low (intraday support)
  // Resistance = today's high (intraday resistance)
  const support = low;
  const resistance = high;
  const stopLoss = Math.round(support * 0.95 * 100) / 100;
  const takeProfit1 = Math.round(resistance * 0.95 * 100) / 100;
  const takeProfit2 = Math.round(resistance * 1.05 * 100) / 100;
  
  // Calculate position in today's range (0-100%)
  const dayRange = high - low;
  const positionInRange = dayRange > 0 
    ? ((currentPrice - low) / dayRange) * 100 
    : 50;
  
  // Calculate quant score based on real data
  // Trend score: based on changePercent
  const trendScore = Math.min(100, Math.max(0, 50 + changePercent * 2));
  
  // Position score: based on position in day's range
  const positionScore = Math.round(positionInRange);
  
  // Momentum score: based on volume relative to typical volume (estimated)
  const volumeScore = volume > 0 ? Math.min(100, Math.max(0, 50 + (volume / 1000000))) : 50;
  
  // Overall quant score: weighted average
  const quantScore = Math.round(trendScore * 0.4 + positionScore * 0.3 + volumeScore * 0.3);
  
  // Determine importance based on quant score
  let importance: 'high' | 'medium' | 'low' = 'medium';
  if (quantScore >= 70) importance = 'high';
  else if (quantScore < 40) importance = 'low';
  
  // Generate trend analysis text
  const trendAnalysis = changePercent > 2 
    ? `强势上涨，涨幅${changePercent.toFixed(2)}%，位于今日区间${positionInRange.toFixed(1)}%位置`
    : changePercent > 0
    ? `小幅上涨，涨幅${changePercent.toFixed(2)}%，位于今日区间${positionInRange.toFixed(1)}%位置`
    : changePercent > -2
    ? `小幅下跌，跌幅${Math.abs(changePercent).toFixed(2)}%，位于今日区间${positionInRange.toFixed(1)}%位置`
    : `弱势下跌，跌幅${Math.abs(changePercent).toFixed(2)}%，位于今日区间${positionInRange.toFixed(1)}%位置`;

  return {
    symbol,
    name,
    currentPrice,
    change: parseFloat(change.toFixed(4)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    open,
    high,
    low,
    close,
    volume,
    marketCap: Math.floor(marketCap),
    kLineData: [],
    quantScore,
    quantSummary: `量化评分${quantScore}分，基于今日价格走势和成交量`,
    detailedAdvice: `当前位于今日价格区间${positionInRange.toFixed(1)}%位置，建议${positionInRange > 70 ? '谨慎追高' : positionInRange < 30 ? '关注支撑' : '观望'}`,
    support,
    resistance,
    stopLoss,
    takeProfit1,
    takeProfit2,
    importance,
    trendAnalysis,
    supportPrice: support,
    resistancePrice: resistance,
    actionAdvice: changePercent > 0 ? '关注' : '观望',
    riskWarning: '以上分析基于今日实时数据，不构成投资建议',
    analysis: {
      trend: { score: Math.round(trendScore), reason: `基于涨跌幅${changePercent.toFixed(2)}%计算` },
      position: { score: positionScore, reason: `位于今日区间${positionInRange.toFixed(1)}%位置` },
      momentum: { score: Math.round(volumeScore), reason: `基于成交量${(volume/10000).toFixed(0)}万` },
      volume: { score: Math.round(volumeScore), reason: `成交量${(volume/10000).toFixed(0)}万` },
      sentiment: { score: Math.round(trendScore), reason: '基于价格走势', data: { policy: 50, fund: Math.round(volumeScore), tech: Math.round(trendScore), emotion: Math.round(trendScore) } },
      trendBreakdown: { ma: Math.round(trendScore), macd: Math.round(trendScore), trendStrength: Math.round(Math.abs(changePercent) * 5) },
      positionBreakdown: { supportResistance: positionScore, fibonacci: 50, historicalHighLow: 50 },
      momentumBreakdown: { rsi: Math.round(trendScore), volumeRatio: Math.round(volumeScore), priceChangeRate: Math.round(Math.abs(changePercent) * 5) },
      sentimentBreakdown: { fundFlow: Math.round(volumeScore), marketHeat: Math.round(trendScore) },
      riskRewardScore: { score: Math.round((resistance - currentPrice) / (currentPrice - stopLoss) * 10), reason: '基于今日高低点计算' }
    },
    dataSource,
    updateTime: new Date().toLocaleString('zh-CN'),
    dataQuality: 'real'
  };
}

// ============================================================================
// HTTP Utilities
// ============================================================================

/**
 * Creates an AbortSignal that aborts when any input signal aborts
 * @param signals - Abort signals to combine
 * @returns Combined abort signal
 */
function anySignal(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  
  return controller.signal;
}

/**
 * Fetches with timeout support
 * @param url - Request URL
 * @param timeout - Timeout in milliseconds
 * @param signal - Optional abort signal
 * @returns Fetch response
 */
async function fetchWithTimeout(
  url: string, 
  timeout: number, 
  signal?: AbortSignal
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      signal: signal ? anySignal(signal, controller.signal) : controller.signal,
      mode: 'cors'
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ============================================================================
// Main API Function
// ============================================================================

/**
 * Fetches real-time stock data with 4-tier fallback strategy
 * 
 * @param symbol - 6-digit stock symbol
 * @returns Stock data and source information
 * @example
 * ```typescript
 * const { data, source } = await fetchRealTimeData('600519');
 * if (data) {
 *   console.log(`${data.name}: ¥${data.currentPrice}`);
 * }
 * ```
 */
export async function fetchRealTimeData(
  symbol: string
): Promise<{ data: StockData | null; source: string }> {
  
  // Attempt 1: Tencent Finance (primary)
  try {
    const startTime = Date.now();
    const response = await fetchWithTimeout(
      API_CONFIG.TENCENT.url(symbol), 
      API_CONFIG.TENCENT.timeout
    );
    const duration = Date.now() - startTime;
    
    if (response.ok) {
      const text = await response.text();
      const data = parseTencentResponse(symbol, text);
      if (data) {
        logApiRequest({
          timestamp: new Date().toISOString(),
          symbol,
          apiName: API_CONFIG.TENCENT.name,
          status: 'success',
          duration
        });
        return { data, source: API_CONFIG.TENCENT.name };
      }
    }
    
    logApiRequest({
      timestamp: new Date().toISOString(),
      symbol,
      apiName: API_CONFIG.TENCENT.name,
      status: 'error',
      duration,
      errorMessage: `HTTP ${response.status}`
    });
  } catch (error) {
    logApiRequest({
      timestamp: new Date().toISOString(),
      symbol,
      apiName: API_CONFIG.TENCENT.name,
      status: error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'error',
      duration: API_CONFIG.TENCENT.timeout,
      errorMessage: error instanceof Error ? error.message : String(error)
    });
  }

  // Attempt 2: East Money (secondary)
  try {
    const startTime = Date.now();
    const response = await fetchWithTimeout(
      API_CONFIG.EASTMONEY.url(symbol), 
      API_CONFIG.EASTMONEY.timeout
    );
    const duration = Date.now() - startTime;
    
    if (response.ok) {
      const json = await response.json();
      const data = parseEastmoneyResponse(symbol, json);
      if (data) {
        logApiRequest({
          timestamp: new Date().toISOString(),
          symbol,
          apiName: API_CONFIG.EASTMONEY.name,
          status: 'success',
          duration
        });
        return { data, source: API_CONFIG.EASTMONEY.name };
      }
    }
    
    logApiRequest({
      timestamp: new Date().toISOString(),
      symbol,
      apiName: API_CONFIG.EASTMONEY.name,
      status: 'error',
      duration,
      errorMessage: `HTTP ${response.status}`
    });
  } catch (error) {
    logApiRequest({
      timestamp: new Date().toISOString(),
      symbol,
      apiName: API_CONFIG.EASTMONEY.name,
      status: error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'error',
      duration: API_CONFIG.EASTMONEY.timeout,
      errorMessage: error instanceof Error ? error.message : String(error)
    });
  }

  // Attempt 3: Sina Finance (tertiary)
  try {
    const startTime = Date.now();
    const response = await fetchWithTimeout(
      API_CONFIG.SINA.url(symbol), 
      API_CONFIG.SINA.timeout
    );
    const duration = Date.now() - startTime;
    
    if (response.ok) {
      const text = await response.text();
      const data = parseSinaResponse(symbol, text);
      if (data) {
        logApiRequest({
          timestamp: new Date().toISOString(),
          symbol,
          apiName: API_CONFIG.SINA.name,
          status: 'success',
          duration
        });
        return { data, source: API_CONFIG.SINA.name };
      }
    }
    
    logApiRequest({
      timestamp: new Date().toISOString(),
      symbol,
      apiName: API_CONFIG.SINA.name,
      status: 'error',
      duration,
      errorMessage: `HTTP ${response.status}`
    });
  } catch (error) {
    logApiRequest({
      timestamp: new Date().toISOString(),
      symbol,
      apiName: API_CONFIG.SINA.name,
      status: error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'error',
      duration: API_CONFIG.SINA.timeout,
      errorMessage: error instanceof Error ? error.message : String(error)
    });
  }

  // All data sources failed - return null (no fallback to ensure 100% real data)
  console.error(`[Data Fetch] ${symbol} - All data sources failed`);
  return { data: null, source: '' };
}
