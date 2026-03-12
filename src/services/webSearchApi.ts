/**
 * Web Search Fallback Service
 * 
 * Provides stock data via Tavily web search when all API sources fail.
 * This is the final fallback in the 4-tier data strategy.
 * 
 * @module services/webSearchApi
 * @version 1.0.0
 * @author Sonata Team
 */

import type { StockData } from '../types';

// ============================================================================
// Configuration
// ============================================================================

/** Tavily API configuration */
const TAVILY_CONFIG = {
  apiKey: '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',
  endpoint: 'https://api.tavily.com/search',
  timeout: 10000
} as const;

// ============================================================================
// Types
// ============================================================================

/** Tavily search result item */
interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

/** Tavily API response */
interface TavilyResponse {
  query: string;
  results: TavilySearchResult[];
  answer?: string;
}

/** Extracted price information */
interface PriceInfo {
  price: number;
  changePercent?: number;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Searches for stock data using Tavily web search
 * 
 * @param symbol - Stock symbol (e.g., '600519')
 * @param stockName - Optional stock name for better search results
 * @returns Stock data or null if extraction fails
 * 
 * @example
 * ```typescript
 * const data = await searchStockData('600519', 'Kweichow Moutai');
 * if (data) {
 *   console.log(`Price: ¥${data.currentPrice}`);
 * }
 * ```
 */
export async function searchStockData(
  symbol: string, 
  stockName?: string
): Promise<StockData | null> {
  try {
    const query = stockName 
      ? `${stockName} ${symbol} stock real-time price current`
      : `${symbol} stock real-time price current`;
    
    console.log(`[Web Search] Query: ${query}`);
    
    const response = await fetch(TAVILY_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TAVILY_CONFIG.apiKey}`
      },
      body: JSON.stringify({
        query,
        search_depth: 'basic',
        include_answer: true,
        max_results: 5
      })
    });
    
    if (!response.ok) {
      console.warn(`[Web Search] API error: ${response.status}`);
      return null;
    }
    
    const data: TavilyResponse = await response.json();
    const priceInfo = extractPriceFromResults(data, symbol);
    
    if (priceInfo) {
      console.log(`[Web Search] Successfully extracted ${symbol} data`);
      return createStockDataFromSearch(symbol, stockName || symbol, priceInfo);
    }
    
    return null;
  } catch (error) {
    console.error('[Web Search] Failed:', error);
    return null;
  }
}

/**
 * Extracts price information from search results
 * 
 * @param data - Tavily API response
 * @param symbol - Stock symbol for context
 * @returns Price info or null if extraction fails
 */
function extractPriceFromResults(data: TavilyResponse, _symbol: string): PriceInfo | null {
  // Try to extract from AI answer first
  if (data.answer) {
    const priceMatch = data.answer.match(/(\d+\.?\d*)\s*元/);
    if (priceMatch) {
      const price = parseFloat(priceMatch[1]);
      const changeMatch = data.answer.match(/([+-]?\d+\.?\d*)%/);
      const changePercent = changeMatch ? parseFloat(changeMatch[1]) : 0;
      
      if (price > 0 && price < 100000) {
        return { price, changePercent };
      }
    }
  }
  
  // Try to extract from search results
  const pricePatterns = [
    /[¥￥]\s*(\d+\.?\d+)/,
    /价格[：:]\s*(\d+\.?\d+)/,
    /现价[：:]\s*(\d+\.?\d+)/,
    /(\d+\.?\d+)\s*元/,
    /(\d+\.?\d+)[\s,]+(?:上涨|下跌|涨|跌)/
  ];
  
  for (const result of data.results) {
    const content = result.content || result.title || '';
    
    for (const pattern of pricePatterns) {
      const match = content.match(pattern);
      if (match) {
        const price = parseFloat(match[1]);
        if (price > 0 && price < 100000) {
          const changeMatch = content.match(/([+-]?\d+\.?\d*)%/);
          const changePercent = changeMatch ? parseFloat(changeMatch[1]) : 0;
          return { price, changePercent };
        }
      }
    }
  }
  
  return null;
}

/**
 * Creates StockData from extracted search information
 * 
 * @param symbol - Stock symbol
 * @param name - Stock name
 * @param priceInfo - Extracted price information
 * @returns Complete StockData object
 */
function createStockDataFromSearch(
  symbol: string, 
  name: string, 
  priceInfo: PriceInfo
): StockData {
  const currentPrice = priceInfo.price;
  const changePercent = priceInfo.changePercent || 0;
  const change = currentPrice * (changePercent / 100);
  const close = currentPrice - change;
  
  // Estimate technical levels
  const support = currentPrice * 0.95;
  const resistance = currentPrice * 1.05;
  const stopLoss = support * 0.98;
  const takeProfit1 = resistance * 0.95;
  const takeProfit2 = resistance * 1.05;
  
  return {
    symbol,
    name,
    currentPrice,
    change: parseFloat(change.toFixed(4)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    open: close,
    high: currentPrice * 1.01,
    low: currentPrice * 0.99,
    close,
    volume: 0,
    marketCap: 0,
    kLineData: [],
    quantScore: 50,
    quantSummary: 'Data from web search',
    detailedAdvice: 'Data sourced from web search, for reference only',
    support,
    resistance,
    stopLoss,
    takeProfit1,
    takeProfit2,
    importance: 'medium',
    trendAnalysis: 'Insufficient data',
    supportPrice: support,
    resistancePrice: resistance,
    actionAdvice: changePercent > 0 ? 'Watch' : 'Watch',
    riskWarning: 'Web search data may be incomplete',
    analysis: {
      trend: { score: 50, reason: 'Data from web search' },
      position: { score: 50, reason: 'Data from web search' },
      momentum: { score: 50, reason: 'Data from web search' },
      volume: { score: 50, reason: 'Data from web search' },
      sentiment: { score: 50, reason: 'Data from web search', data: { policy: 50, fund: 50, tech: 50, emotion: 50 } },
      trendBreakdown: { ma: 50, macd: 50, trendStrength: 50 },
      positionBreakdown: { supportResistance: 50, fibonacci: 50, historicalHighLow: 50 },
      momentumBreakdown: { rsi: 50, volumeRatio: 50, priceChangeRate: 50 },
      sentimentBreakdown: { fundFlow: 50, marketHeat: 50 },
      riskRewardScore: { score: 50, reason: 'Data from web search' }
    },
    dataSource: 'Web Search (Tavily)',
    updateTime: new Date().toLocaleString('zh-CN'),
    dataQuality: 'fallback'
  };
}

/**
 * Attempts to search for K-line historical data
 * 
 * Note: Web search typically cannot provide complete historical K-line data.
 * This function returns null to allow the system to use simulated data.
 * 
 * @param symbol - Stock symbol
 * @param days - Number of days requested
 * @returns Always returns null (not supported)
 */
export async function searchKLineData(
  _symbol: string, 
  _days: number = 360
): Promise<null> {
  console.log(`[Web Search] K-line data not supported`);
  return null;
}
