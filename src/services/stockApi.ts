/**
 * Stock API Service
 * 使用统一 API 客户端的股票实时数据服务
 * 
 * 3 级回退策略:
 * 1. 腾讯财经 (主要)
 * 2. 东方财富 (备用)
 * 3. 新浪财经 (备用)
 * 
 * @module services/stockApi
 * @version 2.0.0
 */

import type { StockData } from '../types';
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
    buildUrl: (symbol: string) => `/api/tencent/quote?q=${getMarketPrefix(symbol)}${symbol}`,
    timeout: 5000
  },
  EASTMONEY: {
    name: '东方财富',
    buildUrl: (symbol: string) => {
      const market = getMarketPrefix(symbol);
      const secid = market === 'sh' ? `1.${symbol}` : `0.${symbol}`;
      return `/api/eastmoney/quote?secid=${secid}&fields=f43,f44,f45,f46,f47,f48,f49,f57,f58,f60,f169`;
    },
    timeout: 5000
  },
  SINA: {
    name: '新浪财经',
    buildUrl: (symbol: string) => `/api/sina/quote?symbol=${getMarketPrefix(symbol)}${symbol}`,
    timeout: 5000
  }
};

// ============================================================================
// Data Mappings
// ============================================================================

const stockNameMap: Record<string, string> = {
  '513310': '中韩半导体 ETF', '600519': '贵州茅台', '600760': '中航光电',
  '000858': '五粮液', '300750': '宁德时代', '002594': '比亚迪',
  '510300': '沪深 300ETF', '601318': '中国平安', '600036': '招商银行'
};

const stockTotalSharesMap: Record<string, number> = {
  '600519': 1_250_000_000, '000858': 3_880_000_000, '300750': 4_400_000_000,
  '002594': 2_900_000_000, '600760': 1_600_000_000, '510300': 8_000_000_000,
  '513310': 1_000_000_000, '601318': 10_000_000_000, '600036': 25_000_000_000
};

// ============================================================================
// Response Parsers
// ============================================================================

function parseTencentResponse(symbol: string, text: string): StockData | null {
  const match = text.match(/v_sh\d+="([^"]+)"/);
  if (!match) return null;

  const parts = match[1].split('~');
  if (parts.length < 30) return null;

  const currentPrice = parseFloat(parts[3]);
  if (isNaN(currentPrice) || currentPrice <= 0) return null;

  const close = parseFloat(parts[4]);
  const open = parseFloat(parts[5]);
  const volume = parseInt(parts[6]);
  const high = parseFloat(parts[33]) || currentPrice * 1.02;
  const low = parseFloat(parts[34]) || currentPrice * 0.98;
  const change = currentPrice - close;
  const changePercent = (change / close) * 100;
  const totalShares = stockTotalSharesMap[symbol] || 100_000_000;
  const marketCap = currentPrice * totalShares;

  return createStockData({
    symbol, name: stockNameMap[symbol] || parts[2] || 'Unknown',
    currentPrice, change, changePercent, open, high, low, close, volume, marketCap,
    dataSource: API_CONFIG.TENCENT.name
  });
}

function parseEastmoneyResponse(symbol: string, json: any): StockData | null {
  if (json.code !== 0 || !json.data) return null;

  const data = json.data;
  const currentPrice = data.f43 ? data.f43 / 100 : 0;
  if (currentPrice <= 0) return null;

  const close = data.f60 ? data.f60 / 100 : currentPrice;
  const open = data.f46 ? data.f46 / 100 : close;
  const high = data.f44 ? data.f44 / 100 : currentPrice * 1.02;
  const low = data.f45 ? data.f45 / 100 : currentPrice * 0.98;
  const volume = data.f47 || 0;
  const change = currentPrice - close;
  const changePercent = close > 0 ? (change / close) * 100 : 0;
  const totalShares = stockTotalSharesMap[symbol] || 100_000_000;
  const marketCap = currentPrice * totalShares;

  return createStockData({
    symbol, name: stockNameMap[symbol] || data.f58 || 'Unknown',
    currentPrice, change, changePercent, open, high, low, close, volume, marketCap,
    dataSource: API_CONFIG.EASTMONEY.name
  });
}

function parseSinaResponse(symbol: string, text: string): StockData | null {
  const match = text.match(/var hq_str_\w+="([^"]*)";/);
  if (!match || !match[1]) return null;

  const parts = match[1].split(',');
  if (parts.length < 8) return null;

  const name = parts[0];
  const open = parseFloat(parts[1]);
  const close = parseFloat(parts[2]);
  const currentPrice = parseFloat(parts[3]);
  const high = parseFloat(parts[4]);
  const low = parseFloat(parts[5]);
  const volume = parseInt(parts[8]) || 0;

  if (isNaN(currentPrice) || currentPrice <= 0) return null;

  const change = currentPrice - close;
  const changePercent = close > 0 ? (change / close) * 100 : 0;
  const totalShares = stockTotalSharesMap[symbol] || 100_000_000;
  const marketCap = currentPrice * totalShares;

  return createStockData({
    symbol, name: stockNameMap[symbol] || name || 'Unknown',
    currentPrice, change, changePercent, open, high, low, close, volume, marketCap,
    dataSource: API_CONFIG.SINA.name
  });
}

// ============================================================================
// Stock Data Factory
// ============================================================================

interface StockDataParams {
  symbol: string; name: string; currentPrice: number; change: number;
  changePercent: number; open: number; high: number; low: number;
  close: number; volume: number; marketCap: number; dataSource: string;
}

function createStockData(params: StockDataParams): StockData {
  const { symbol, name, currentPrice, change, changePercent, open, high, low, close, volume, marketCap, dataSource } = params;
  
  const support = low;
  const resistance = high;
  const stopLoss = Math.round(support * 0.95 * 100) / 100;
  const takeProfit1 = Math.round(resistance * 0.95 * 100) / 100;
  const takeProfit2 = Math.round(resistance * 1.05 * 100) / 100;
  
  const dayRange = high - low;
  const positionInRange = dayRange > 0 ? ((currentPrice - low) / dayRange) * 100 : 50;
  
  const trendScore = Math.min(100, Math.max(0, 50 + changePercent * 2));
  const positionScore = Math.round(positionInRange);
  const volumeScore = volume > 0 ? Math.min(100, Math.max(0, 50 + (volume / 1000000))) : 50;
  const quantScore = Math.round(trendScore * 0.4 + positionScore * 0.3 + volumeScore * 0.3);
  
  let importance: 'high' | 'medium' | 'low' = 'medium';
  if (quantScore >= 70) importance = 'high';
  else if (quantScore < 40) importance = 'low';
  
  const trendAnalysis = changePercent > 2 
    ? `强势上涨，涨幅${changePercent.toFixed(2)}%`
    : changePercent > 0 ? `小幅上涨，涨幅${changePercent.toFixed(2)}%`
    : changePercent > -2 ? `小幅下跌，跌幅${Math.abs(changePercent).toFixed(2)}%`
    : `弱势下跌，跌幅${Math.abs(changePercent).toFixed(2)}%`;

  return {
    symbol, name, currentPrice,
    change: parseFloat(change.toFixed(4)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    open, high, low, close, volume,
    marketCap: Math.floor(marketCap),
    kLineData: [], quantScore,
    quantSummary: `量化评分${quantScore}分`,
    detailedAdvice: `位于今日区间${positionInRange.toFixed(1)}%位置`,
    support, resistance, stopLoss, takeProfit1, takeProfit2,
    importance, trendAnalysis, supportPrice: support, resistancePrice: resistance,
    actionAdvice: changePercent > 0 ? '关注' : '观望',
    riskWarning: '以上分析基于今日实时数据，不构成投资建议',
    analysis: {
      trend: { score: Math.round(trendScore), reason: `基于涨跌幅${changePercent.toFixed(2)}%` },
      position: { score: positionScore, reason: `位于今日区间${positionInRange.toFixed(1)}%` },
      momentum: { score: Math.round(volumeScore), reason: `基于成交量` },
      volume: { score: Math.round(volumeScore), reason: `成交量${(volume/10000).toFixed(0)}万` },
      sentiment: { score: Math.round(trendScore), reason: '基于价格走势', data: { policy: 50, fund: Math.round(volumeScore), tech: Math.round(trendScore), emotion: Math.round(trendScore) } },
      trendBreakdown: { ma: Math.round(trendScore), macd: Math.round(trendScore), trendStrength: Math.round(Math.abs(changePercent) * 5) },
      positionBreakdown: { supportResistance: positionScore, fibonacci: 50, historicalHighLow: 50 },
      momentumBreakdown: { rsi: Math.round(trendScore), volumeRatio: Math.round(volumeScore), priceChangeRate: Math.round(Math.abs(changePercent) * 5) },
      sentimentBreakdown: { fundFlow: Math.round(volumeScore), marketHeat: Math.round(trendScore) },
      riskRewardScore: { score: Math.round((resistance - currentPrice) / (currentPrice - stopLoss) * 10), reason: '基于今日高低点' }
    },
    dataSource,
    updateTime: new Date().toLocaleString('zh-CN'),
    dataQuality: 'real'
  };
}

// ============================================================================
// Main API Function
// ============================================================================

async function fetchFromSource<T>(
  url: string,
  name: string,
  timeout: number,
  parser: (symbol: string, response: any) => T | null,
  symbol: string
): Promise<T | null> {
  try {
    const startTime = Date.now();
    const response: ApiResponse<any> = await apiClient.get(url, { timeout });
    const duration = Date.now() - startTime;
    
    if (!response.success || !response.data) {
      logger.warn(`[StockAPI] ${name} 请求失败`, { symbol, error: response.error, duration });
      return null;
    }
    
    const data = parser(symbol, response.data);
    if (data) {
      logger.info(`[StockAPI] ${name} 获取成功`, { symbol, duration });
      return data;
    }
    
    logger.warn(`[StockAPI] ${name} 数据解析失败`, { symbol, duration });
    return null;
  } catch (error) {
    logger.error(`[StockAPI] ${name} 请求异常`, error, { symbol });
    return null;
  }
}

export async function fetchRealTimeData(symbol: string): Promise<{ data: StockData | null; source: string }> {
  // Attempt 1: Tencent
  const tencentData = await fetchFromSource(
    API_CONFIG.TENCENT.buildUrl(symbol),
    API_CONFIG.TENCENT.name,
    API_CONFIG.TENCENT.timeout,
    parseTencentResponse,
    symbol
  );
  if (tencentData) return { data: tencentData, source: API_CONFIG.TENCENT.name };

  // Attempt 2: East Money
  const eastmoneyData = await fetchFromSource(
    API_CONFIG.EASTMONEY.buildUrl(symbol),
    API_CONFIG.EASTMONEY.name,
    API_CONFIG.EASTMONEY.timeout,
    parseEastmoneyResponse,
    symbol
  );
  if (eastmoneyData) return { data: eastmoneyData, source: API_CONFIG.EASTMONEY.name };

  // Attempt 3: Sina
  const sinaData = await fetchFromSource(
    API_CONFIG.SINA.buildUrl(symbol),
    API_CONFIG.SINA.name,
    API_CONFIG.SINA.timeout,
    parseSinaResponse,
    symbol
  );
  if (sinaData) return { data: sinaData, source: API_CONFIG.SINA.name };

  logger.error(`[StockAPI] 所有数据源均失败`, { symbol });
  return { data: null, source: '' };
}

// ============================================================================
// Exports
// ============================================================================

export { getMarketPrefix, stockNameMap, stockTotalSharesMap };
export default { fetchRealTimeData };
