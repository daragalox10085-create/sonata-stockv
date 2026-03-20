import React, { createContext, useContext, useState, useCallback } from 'react';
import { getStockName } from '../services/stockNameService';
import { unifiedStockDataService } from '../services/UnifiedStockDataService';

export interface StockData {
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
  // 财务指标
  pe?: number;
  peTtm?: number;
  pb?: number;
  ps?: number;
  peg?: number;
  roe?: number;
  profitGrowth?: number;
  revenueGrowth?: number;
  // K线数据
  kLineData: KLinePoint[];
  kLineDataMulti?: KLineData;
  currentTimeframe?: KLineTimeframe;
  // 量化分析
  quantScore: number;
  quantSummary: string;
  support: number;
  resistance: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  importance: 'high' | 'medium' | 'low';
  trendAnalysis: string;
  coreLogic?: string;
  positionSize?: string;
  supportPrice: number;
  resistancePrice: number;
  actionAdvice: string;
  riskWarning: string;
  recommendation?: string;
  recommendationReason?: string;
  dataSource?: string;
  dataQuality?: 'real' | 'fallback';
  updateTime?: string;
  analysis: {
    trend: { score: number; reason: string; };
    position: { score: number; reason: string; };
    momentum: { score: number; reason: string; };
    volume: { score: number; reason: string; };
    sentiment: { score: number; reason: string; data: { policy: number; fund: number; tech: number; emotion: number; }; };
  };
}

export interface KLinePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// K 线时间周期枚举
export type KLineTimeframe = '60' | '240' | '101';

export interface KLineData {
  '60': KLinePoint[];
  '240': KLinePoint[];
  '101': KLinePoint[];
}

interface StockContextType {
  stockData: StockData | null;
  isLoading: boolean;
  error: string | null;
  errorType: 'format' | 'invalid' | 'network' | null;
  loadStock: (symbol: string, name?: string) => Promise<void>;
  clearStock: () => void;
  refreshStock: () => Promise<void>;
  changeTimeframe: (timeframe: KLineTimeframe) => void;
}

const StockContext = createContext<StockContextType | undefined>(undefined);

// 股票名称映射（备用）
const stockNameMap: Record<string, string> = {
  '513310': '中韩半导体 ETF',
  '600519': '贵州茅台',
  '000858': '五粮液',
  '300750': '宁德时代',
  '002594': '比亚迪',
  '510300': '沪深 300ETF'
};

// 使用映射
console.log('Stock name map loaded:', Object.keys(stockNameMap).length, 'stocks');

// 股票总股本映射（用于市值计算）
const stockTotalSharesMap: Record<string, number> = {
  '600519': 1250000000,
  '000858': 3880000000,
  '300750': 4400000000,
  '002594': 2900000000,
  '510300': 8000000000,
  '513310': 1000000000
};



// 验证股票代码格式
function validateStockSymbolFormat(symbol: string): { valid: boolean; error?: 'format'; message?: string } {
  const trimmed = symbol.trim();
  if (!trimmed) return { valid: true };
  if (!/^\d{6}$/.test(trimmed)) {
    if (!/^\d+$/.test(trimmed)) {
      return { valid: false, error: 'format', message: '股票代码必须为 6 位数字' };
    }
    return { valid: false, error: 'format', message: trimmed.length < 6 ? '股票代码长度不足 6 位' : '股票代码长度超过 6 位' };
  }
  return { valid: true };
}

// 验证股票代码是否存在
function validateStockSymbolExists(symbol: string): { valid: boolean; error?: 'invalid'; message?: string; market?: string } {
  const trimmed = symbol.trim();
  if (trimmed.length !== 6) return { valid: true };
  
  const prefix = trimmed.substring(0, 3);
  const stockPrefixMap: Record<string, string> = {
    '600': '沪市主板', '601': '沪市主板', '603': '沪市主板', '605': '沪市主板',
    '688': '科创板',
    '000': '深市主板', '001': '深市主板', '002': '深市中小板', '003': '深市主板',
    '300': '创业板', '301': '创业板',
    '510': 'ETF 基金', '511': 'ETF 基金', '512': 'ETF 基金', '513': 'ETF 基金',
    '515': 'ETF 基金', '516': 'ETF 基金', '518': 'ETF 基金', '519': 'ETF 基金',
    '520': 'ETF 基金', '521': 'ETF 基金', '522': 'ETF 基金'
  };
  
  const market = stockPrefixMap[prefix];
  if (!market) {
    return { valid: false, error: 'invalid', message: '该股票代码不存在或非 A 股代码', market: undefined };
  }
  return { valid: true, market };
}

// 完整的股票验证
function validateStockSymbol(symbol: string): { valid: boolean; errorType?: 'format' | 'invalid'; error?: string; market?: string } {
  const formatValidation = validateStockSymbolFormat(symbol);
  if (!formatValidation.valid) {
    return { valid: false, errorType: 'format', error: formatValidation.message || '股票代码必须为 6 位数字' };
  }
  const existsValidation = validateStockSymbolExists(symbol);
  if (!existsValidation.valid) {
    return { valid: false, errorType: 'invalid', error: existsValidation.message || '该股票代码不存在或非 A 股代码', market: existsValidation.market };
  }
  return { valid: true, market: existsValidation.market };
}

// 计算量化指标
function calculateQuantMetrics(stockData: StockData): Partial<StockData> {
  const { currentPrice, kLineData } = stockData;
  if (!kLineData || kLineData.length < 20) {
    // 数据不足时使用保守估计
    const conservativeStopLoss = currentPrice * 0.95; // 当前价下方 5%
    const conservativeSupport = currentPrice * 0.97; // 当前价下方 3%
    const conservativeResistance = currentPrice * 1.05; // 当前价上方 5%
    const conservativeTakeProfit1 = currentPrice * 1.05; // 当前价上方 5%
    const conservativeTakeProfit2 = currentPrice * 1.10; // 当前价上方 10%
    
    return {
      quantScore: 50,
      quantSummary: '数据不足',
      coreLogic: '数据不足，无法生成分析',
      positionSize: '0%',
      support: conservativeSupport,
      resistance: conservativeResistance,
      stopLoss: conservativeStopLoss,
      takeProfit1: conservativeTakeProfit1,
      takeProfit2: conservativeTakeProfit2,
      importance: 'medium' as const,
      trendAnalysis: '数据不足',
      supportPrice: conservativeSupport,
      resistancePrice: conservativeResistance,
      actionAdvice: '等待数据完整',
      riskWarning: '当前数据不完整，分析结果仅供参考',
      analysis: {
        trend: { score: 50, reason: 'K 线数据不足' },
        position: { score: 50, reason: 'K 线数据不足' },
        momentum: { score: 50, reason: 'K 线数据不足' },
        volume: { score: 50, reason: 'K 线数据不足' },
        sentiment: { score: 50, reason: 'K 线数据不足', data: { policy: 50, fund: 50, tech: 50, emotion: 50 } }
      }
    };
  }
  
  const recentPrices = kLineData.slice(-20).map(k => k.close);
  const ma5 = recentPrices.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const ma20 = recentPrices.reduce((a, b) => a + b, 0) / 20;
  const isAboveMA20 = currentPrice > ma20;
  const isAboveMA5 = currentPrice > ma5;
  const isBullish = isAboveMA20 && isAboveMA5;
  
  const trendScore = isBullish ? 75 : 35;
  const priceChangePercent = ((currentPrice - recentPrices[0]) / recentPrices[0]) * 100;
  const momentumScore = Math.min(100, Math.max(0, 50 + priceChangePercent * 2));
  const volumeScore = 50;
  const sentimentScore = 50 + (isBullish ? 10 : -10);
  const quantScore = Math.round((trendScore + momentumScore + volumeScore + sentimentScore) / 4);
  
  // ========== 动态支撑/阻力位计算 ==========
  // 使用最近60个交易日的数据进行分析（更全面的时间窗口）
  const analysisWindow = Math.min(kLineData.length, 60);
  const recentData = kLineData.slice(-analysisWindow);
  const lows = recentData.map(k => k.low);
  const highs = recentData.map(k => k.high);
  
  // 动态支撑位：使用近期低点加权平均（最近10天权重更高）
  const recent10Lows = lows.slice(-10);
  const recent30Lows = lows.slice(-30);
  const minLow10 = recent10Lows.length > 0 ? Math.min(...recent10Lows) : currentPrice * 0.9;
  const avgLow10 = recent10Lows.length > 0 ? recent10Lows.reduce((a, b) => a + b, 0) / recent10Lows.length : currentPrice * 0.9;
  // 支撑位 = 近期最低点 × 0.7 + 10日平均低点 × 0.3
  const dynamicSupport = minLow10 * 0.7 + avgLow10 * 0.3;
  
  // 动态阻力位：使用近期高点加权平均
  const recent10Highs = highs.slice(-10);
  const maxHigh10 = recent10Highs.length > 0 ? Math.max(...recent10Highs) : currentPrice * 1.1;
  const avgHigh10 = recent10Highs.length > 0 ? recent10Highs.reduce((a, b) => a + b, 0) / recent10Highs.length : currentPrice * 1.1;
  // 阻力位 = 近期最高点 × 0.7 + 10日平均高点 × 0.3
  const dynamicResistance = maxHigh10 * 0.7 + avgHigh10 * 0.3;
  
  // 支撑位：最近10天的动态低点
  const recentSupport = dynamicSupport;
  // 阻力位：最近10天的动态高点
  const recentResistance = dynamicResistance;
  
  // 确保支撑位合理（不低于当前价的85%，避免极端下跌建议）
  const support = Math.max(recentSupport, currentPrice * 0.85);
  // 确保阻力位合理（不高于当前价的115%）
  const resistance = Math.min(recentResistance, currentPrice * 1.15);
  
  // 计算相对于支撑位的位置（0-100，0表示在支撑位，100表示在阻力位）
  const positionInRange = Math.min(100, Math.max(0, ((currentPrice - support) / (resistance - support)) * 100));
  const isNearSupport = positionInRange <= 35; // 在支撑位附近
  
  // ========== KIMI修复：量化建议逻辑 ==========
  // 计算位置因素（作为权重加成，而非门槛）
  const positionBonus = positionInRange <= 30 ? 5 : positionInRange <= 50 ? 0 : -5;
  
  // 最终评分（加入位置权重）
  const finalScore = Math.min(100, quantScore + positionBonus);
  
  // 修复后的建议判断（移除双重条件限制）
  let recommendationLevel: '强烈买入' | '买入' | '建仓' | '观望' | '减仓' | '卖出' = '观望';
  let isQuantBullish = false;
  
  if (finalScore >= 60) {
    recommendationLevel = '强烈买入';
    isQuantBullish = true;
  } else if (finalScore >= 50) {
    recommendationLevel = '买入';
    isQuantBullish = true;
  } else if (finalScore >= 40) {
    recommendationLevel = '建仓';
    isQuantBullish = true;
  } else if (finalScore >= 30) {
    recommendationLevel = '观望';
    isQuantBullish = false;
  } else {
    recommendationLevel = '卖出';
    isQuantBullish = false;
  }
  
  // 建仓位：当前价或支撑位上方2%（避免建议过低的建仓位）
  const buyPrice = Math.min(currentPrice, support * 1.02);
  
  // 止损位：建仓位下方5-8%（标准止损范围）
  const stopLoss = buyPrice * 0.95;
  
  // 止盈位：基于合理盈亏比（1:2 到 1:3）
  const risk = buyPrice - stopLoss;
  const takeProfit1 = buyPrice + risk * 2; // 第一目标：2倍风险
  const takeProfit2 = buyPrice + risk * 3; // 第二目标：3倍风险
  
  // 确保止盈位不超过阻力位太多（最多阻力位上方10%）
  const maxTakeProfit = resistance * 1.1;
  const finalTakeProfit1 = Math.min(takeProfit1, maxTakeProfit);
  const finalTakeProfit2 = Math.min(takeProfit2, maxTakeProfit * 1.1);
  
  const importance = quantScore >= 70 ? 'high' : quantScore >= 40 ? 'medium' : 'low';
  
  // 生成仓位建议（必须先定义，因为后面的函数依赖它）
  const getPositionSize = () => {
    switch (recommendationLevel) {
      case '强烈买入':
        return '50-70%';
      case '买入':
        return '30-50%';
      case '建仓':
        return '10-20%';
      case '观望':
        return '0%';
      case '卖出':
        return '0%';
      default:
        return '0%';
    }
  };
  
  const positionSize = getPositionSize();
  
  // 生成综合量化建议总结
  const getQuantSummary = () => {
    const trendDesc = trendScore >= 60 ? '趋势向上' : trendScore >= 40 ? '趋势震荡' : '趋势向下';
    const positionDesc = isNearSupport ? '接近支撑位' : positionInRange >= 70 ? '接近阻力位' : '位于区间中部';
    const volumeDesc = volumeScore >= 60 ? '量能配合' : volumeScore >= 40 ? '量能正常' : '量能萎缩';
    
    switch (recommendationLevel) {
      case '强烈买入':
        return `${trendDesc}，${positionDesc}，${volumeDesc}。量化评分${finalScore}分，建议积极布局，仓位${positionSize}。`;
      case '买入':
        return `${trendDesc}，${positionDesc}，${volumeDesc}。量化评分${finalScore}分，建议分批买入，仓位${positionSize}。`;
      case '建仓':
        return `${trendDesc}，${positionDesc}，${volumeDesc}。量化评分${finalScore}分，建议小仓位试探，仓位${positionSize}。`;
      case '观望':
        return `${trendDesc}，${positionDesc}。量化评分${finalScore}分，建议观望等待，回调至支撑¥${support.toFixed(2)}附近可建仓。`;
      case '卖出':
        return `${trendDesc}，${positionDesc}。量化评分${finalScore}分，趋势走弱，建议离场观望。`;
      default:
        return `技术面震荡，建议观望等待。`;
    }
  };
  
  const coreLogic = getQuantSummary();
  
  // 生成详细的趋势分析（用于模块3）
  const getTrendAnalysis = () => {
    switch (recommendationLevel) {
      case '强烈买入':
        return '技术面强势，价格接近支撑位，风险收益比极佳。均线系统多头排列，成交量配合良好。';
      case '买入':
        return '技术面良好，价格处于支撑位附近，具备较好安全边际。';
      case '建仓':
        return '技术面中性偏多，价格处于合理区间。';
      case '观望':
        return '技术面震荡，方向不明。关注关键支撑阻力位突破情况。';
      case '卖出':
        return '技术面弱势，趋势向下。';
      default:
        return '技术面震荡。';
    }
  };
  
  const trendAnalysis = getTrendAnalysis();
  
  // 生成操作建议（简洁版，用于模块1）
  const getActionAdvice = () => {
    switch (recommendationLevel) {
      case '强烈买入':
        return `建议积极买入，仓位${positionSize}`;
      case '买入':
        return `建议分批买入，仓位${positionSize}`;
      case '建仓':
        return `建议小仓位试探，仓位${positionSize}`;
      case '观望':
        return '建议观望等待';
      case '卖出':
        return '建议清仓离场';
      default:
        return '建议观望';
    }
  };
  
  const actionAdvice = getActionAdvice();
  
  const riskWarning = volumeScore < 40 
    ? '成交量萎缩，警惕变盘风险。' 
    : isNearSupport 
      ? '价格接近支撑，风险可控。'
      : '注意控制仓位，严格止损。';
  
  // 简洁的量化摘要（用于模块1）
  const quantSummary = `${recommendationLevel} | ${coreLogic} | 仓位${positionSize}`;
  
  return {
    quantScore,
    quantSummary,
    support,
    resistance,
    stopLoss,
    takeProfit1: finalTakeProfit1,
    takeProfit2: finalTakeProfit2,
    importance,
    trendAnalysis,
    coreLogic,  // 一句话核心逻辑
    positionSize,  // 建议仓位
    supportPrice: support,
    resistancePrice: resistance,
    actionAdvice,
    riskWarning,
    recommendation: recommendationLevel,  // 用于App.tsx显示
    recommendationReason: actionAdvice,  // 用于App.tsx显示
    analysis: {
      trend: { score: trendScore, reason: isBullish ? '均线系统呈多头排列' : '均线系统呈空头排列' },
      position: { score: 65, reason: '位于支撑位附近' },
      momentum: { score: Math.round(momentumScore), reason: priceChangePercent > 0 ? '动能偏强' : '动能偏弱' },
      volume: { score: volumeScore, reason: '成交量正常' },
      sentiment: { score: Math.round(sentimentScore), reason: isBullish ? '市场情绪乐观' : '市场情绪谨慎', data: { policy: 65, fund: 50, tech: isBullish ? 70 : 40, emotion: isBullish ? 60 : 45 } }
    }
  };
}

// 获取腾讯财经数据
async function fetchTencentData(symbol: string): Promise<{ data: Partial<StockData> | null; source: string }> {
  try {
    const market = symbol.substring(0, 3);
    const prefix = ['600', '601', '603', '605', '688', '510', '511', '512', '513', '515', '516', '518', '519'].includes(market) ? 'sh' : 'sz';
    const url = `https://qt.gtimg.cn/q=${prefix}${symbol}`;
    const response = await fetch(url, { method: 'GET', headers: { 'Accept': '*/*' } });
    if (!response.ok) return { data: null, source: '' };
    const text = await response.text();
    const match = text.match(/v_(sh|sz)\d+="([^"]+)"/);
    if (!match) return { data: null, source: '' };
    const parts = match[2].split('~');
    if (parts.length < 30) return { data: null, source: '' };
    // 腾讯 API 返回格式：parts[1]是股票代码，parts[2]是股票名称
    // 优先使用API返回的名称，如果不存在则使用多源冗余服务
    const stockNameFromAPI = parts[2];
    let stockName = stockNameFromAPI;
    if (!stockName || stockName === '' || stockName === symbol) {
      // 使用多源冗余服务获取名称
      stockName = getStockName(symbol);
    }
    const currentPrice = parseFloat(parts[3]);
    const close = parseFloat(parts[4]);
    const open = parseFloat(parts[5]);
    const high = parseFloat(parts[33]) || currentPrice * 1.02;
    const low = parseFloat(parts[34]) || currentPrice * 0.98;
    const volume = parseInt(parts[6]);
    if (isNaN(currentPrice) || currentPrice <= 0) return { data: null, source: '' };
    const change = currentPrice - close;
    const changePercent = (change / close) * 100;
    const totalShares = stockTotalSharesMap[symbol] || 100000000;
    const marketCap = currentPrice * totalShares;
    return {
      data: {
        symbol,
        name: stockName,
        currentPrice,
        change: parseFloat(change.toFixed(4)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        open,
        high,
        low,
        close,
        volume,
        marketCap: Math.floor(marketCap),
        dataSource: '腾讯财经',
        dataQuality: 'real' as const,
        updateTime: new Date().toLocaleString('zh-CN')
      },
      source: '腾讯财经'
    };
  } catch (error) {
    console.error('[腾讯 API] 获取数据失败:', error);
    return { data: null, source: '' };
  }
}

// 获取东方财富数据
async function fetchEastmoneyData(symbol: string): Promise<{ data: Partial<StockData> | null; source: string }> {
  try {
    const market = symbol.substring(0, 3);
    const secid = ['600', '601', '603', '605', '688', '510', '511', '512', '513', '515', '516', '518', '519'].includes(market) ? `1.${symbol}` : `0.${symbol}`;
    const url = `/api/eastmoney/quote?secid=${secid}&fields=f43,f44,f45,f46,f47,f48,f49,f57,f58,f60,f169`;
    const response = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
    if (!response.ok) return { data: null, source: '' };
    const json = await response.json();
    const data = json.data;
    if (!data || !data.f57) return { data: null, source: '' };
    
    // 东方财富 API 字段说明：
    // f43=当前价(分), f44=最高价(分), f45=最低价(分), f46=开盘价(分), f47=成交量(手)
    // f48=成交额(元), f49=总市值(万元), f57=股票代码, f58=股票名称, f60=昨收(分)
    // f169=涨跌额(元), f170=涨跌幅(%)
    const currentPrice = (data.f43 || 0) / 100;  // 分 -> 元
    const change = data.f169 || 0;  // f169是涨跌额，单位已经是元
    const changePercent = data.f170 || 0;  // f170是涨跌幅，单位是%
    const open = (data.f46 || 0) / 100;  // 分 -> 元
    const high = (data.f44 || 0) / 100;  // 分 -> 元
    const low = (data.f45 || 0) / 100;   // 分 -> 元
    const close = (data.f60 || 0) / 100;  // 昨收，分 -> 元
    const volume = data.f47 || 0;  // 成交量(手)
    const marketCap = (data.f49 || 0) * 10000;  // 市值单位是万元，转换为元
    
    if (isNaN(currentPrice) || currentPrice <= 0) return { data: null, source: '' };
    let validMarketCap = marketCap;
    if (!validMarketCap || validMarketCap <= 0) {
      const totalShares = stockTotalSharesMap[symbol] || 100000000;
      validMarketCap = currentPrice * totalShares;
    }
    // 优先使用API返回的名称，如果不存在则使用多源冗余服务
    let stockName = data.f58;
    if (!stockName || stockName === '' || stockName === symbol) {
      stockName = getStockName(symbol);
    }
    return {
      data: {
        symbol,
        name: stockName,
        currentPrice,
        change: parseFloat(change.toFixed(4)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        open,
        high,
        low,
        close,
        volume,
        marketCap: Math.floor(validMarketCap),
        dataSource: '东方财富',
        dataQuality: 'real' as const,
        updateTime: new Date().toLocaleString('zh-CN')
      },
      source: '东方财富'
    };
  } catch (error) {
    console.error('[东方财富 API] 获取数据失败:', error);
    return { data: null, source: '' };
  }
}

// 获取腾讯 K 线数据（支持多时间周期）
async function fetchTencentKLineWithTimeframe(symbol: string, timeframe: KLineTimeframe, days: number = 360): Promise<KLinePoint[] | null> {
  try {
    // 判断市场并拼接前缀
    const market = symbol.substring(0, 3);
    const prefix = ['600', '601', '603', '605', '688', '510', '511', '512', '513', '515', '516', '518', '519'].includes(market) ? 'sh' : 'sz';
    const code = `${prefix}${symbol}`;
    
    // timeframe: 60=1 分钟，101=日线，240=4 小时线
    // 深市股票日线需要用 'day' 而不是 '101'
    const timeframeParam = String(timeframe) === '101' ? 'day' : timeframe;
    
    // 使用 Vite 代理解决 CORS - 变量已嵌入
    const url = `/api/tencent?code=${code}&timeframe=${timeframeParam}&days=${days}`;
    console.log('[腾讯 K 线] 请求 URL:', url);
    
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const json = await response.json();
    
    // 腾讯API：沪市用 qfq，深市用 qfqday
    const klineData = json.data?.[code]?.qfq || json.data?.[code]?.qfqday;
    if (!klineData || !Array.isArray(klineData) || klineData.length === 0) {
      console.warn('[腾讯 K 线] 无数据:', json);
      return null;
    }
    
    console.log('[腾讯 K 线] 原始数据条数:', klineData.length);
    
    // 腾讯格式：[日期，开盘，收盘，最高，最低，成交量]
    const result: KLinePoint[] = klineData.map((item: string[]) => ({
      date: item[0],
      open: parseFloat(item[1]),
      close: parseFloat(item[2]),
      high: parseFloat(item[3]),
      low: parseFloat(item[4]),
      volume: parseInt(item[5]) || 0
    })).filter((k: KLinePoint) => !isNaN(k.open) && !isNaN(k.high) && !isNaN(k.low) && !isNaN(k.close) && k.open > 0);
    
    console.log('[腾讯 K 线] 过滤后数据条数:', result.length);
    return result.length > 0 ? result : null;
  } catch (error) {
    console.warn('[腾讯财经 API] 获取 K 线数据失败:', error);
    return null;
  }
}

// 获取多时间周期 K 线数据
async function fetchMultiTimeframeKLine(symbol: string): Promise<KLineData | null> {
  // 并发请求三个时间周期
  const [k60Result, k240Result, k101Result] = await Promise.allSettled([
    fetchTencentKLineWithTimeframe(symbol, '60', 1000),   // 1 小时线，1000 周期（约一年）
    fetchTencentKLineWithTimeframe(symbol, '240', 360),  // 4 小时线，360 周期
    fetchTencentKLineWithTimeframe(symbol, '101', 360)   // 日线，360 周期（约一年）
  ]);
  
  const kLineData: KLineData = {
    '60': [],
    '240': [],
    '101': []
  };
  
  if (k60Result.status === 'fulfilled' && k60Result.value) {
    kLineData['60'] = k60Result.value;
    console.log('[K 线 API] 1 小时线数据成功，条数:', k60Result.value.length);
  }
  
  if (k240Result.status === 'fulfilled' && k240Result.value) {
    kLineData['240'] = k240Result.value;
    console.log('[K 线 API] 4 小时线数据成功，条数:', k240Result.value.length);
  }
  
  if (k101Result.status === 'fulfilled' && k101Result.value) {
    kLineData['101'] = k101Result.value;
    console.log('[K 线 API] 日线数据成功，条数:', k101Result.value.length);
  }
  
  // 至少需要一个时间周期成功
  if (Object.keys(kLineData).length === 0) {
    console.error('[K 线 API] 所有时间周期数据均失败');
    return null;
  }
  
  return kLineData as KLineData;
}

// 东方财富 K 线 API（推荐，稳定可用）
async function fetchEastmoneyKLine(symbol: string, days: number = 360): Promise<KLinePoint[] | null> {
  try {
    // 判断市场：沪市 1.，深市 0.
    const market = symbol.substring(0, 3);
    const marketPrefix = ['600', '601', '603', '605', '688', '510', '511', '512', '513', '515', '516', '518', '519'].includes(market) ? '1.' : '0.';
    const secid = marketPrefix + symbol;
    
    // 计算日期范围
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const beg = startDate.toISOString().slice(0, 10).replace(/-/g, '');
    const end = endDate.toISOString().slice(0, 10).replace(/-/g, '');
    
    // 正确构建 URL - 变量已嵌入
    const url = `/api/eastmoney/kline?secid=${secid}&klt=101&fqt=1&beg=${beg}&end=${end}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60`;
    console.log('[东方财富 K 线] 请求 URL:', url);
    
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const json = await response.json();
    
    const klineData = json.data?.klines;
    if (!klineData || !Array.isArray(klineData) || klineData.length === 0) {
      console.warn('[东方财富 K 线] 无数据:', json);
      return null;
    }
    
    console.log('[东方财富 K 线] 原始数据条数:', klineData.length);
    
    // 东方财富格式："2024-01-02,4.10,4.20,4.00,4.13,1234567,..."
    const result: KLinePoint[] = klineData.map((item: string) => {
      const parts = item.split(',');
      return {
        date: parts[0],
        open: parseFloat(parts[1]),
        close: parseFloat(parts[2]),
        high: parseFloat(parts[3]),
        low: parseFloat(parts[4]),
        volume: parseInt(parts[5]) || 0
      };
    }).filter((k: KLinePoint) => !isNaN(k.open) && !isNaN(k.high) && !isNaN(k.low) && !isNaN(k.close) && k.open > 0);
    
    console.log('[东方财富 K 线] 过滤后数据条数:', result.length);
    return result.length > 0 ? result : null;
  } catch (error) {
    console.warn('[东方财富 K 线] 获取失败:', error);
    return null;
  }
}

// 获取 K 线数据 - 腾讯 + 东方财富双源
async function fetchSinaKLineData(symbol: string, days: number = 360): Promise<KLinePoint[] | null> {
  // 方案1：腾讯 API
  console.log('[K 线 API] 尝试腾讯财经 API:', symbol);
  const tencentResult = await fetchTencentKLine(symbol, days);
  if (tencentResult && tencentResult.length > 0) {
    console.log('[K 线 API] 腾讯财经成功，条数:', tencentResult.length);
    return tencentResult;
  }
  
  // 方案2：东方财富 API（备用，支持深市）
  console.log('[K 线 API] 腾讯失败，尝试东方财富 API:', symbol);
  const eastmoneyResult = await fetchEastmoneyKLine(symbol, days);
  if (eastmoneyResult && eastmoneyResult.length > 0) {
    console.log('[K 线 API] 东方财富成功，条数:', eastmoneyResult.length);
    return eastmoneyResult;
  }
  
  console.error('[K 线 API] 所有API均失败');
  return null;
}

// 腾讯财经 K 线 API
async function fetchTencentKLine(symbol: string, days: number): Promise<KLinePoint[] | null> {
  try {
    // 判断市场并拼接前缀
    const market = symbol.substring(0, 3);
    const prefix = ['600', '601', '603', '605', '688', '510', '511', '512', '513', '515', '516', '518', '519'].includes(market) ? 'sh' : 'sz';
    const code = `${prefix}${symbol}`;
    
    // ✅ 使用正确的 Vite 代理路径
    const url = `/api/tencent/kline?code=${code}&timeframe=day&days=${days}`;
    console.log('[腾讯 K 线] 请求 URL:', url);
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      console.warn('[腾讯 K 线] HTTP 错误:', response.status);
      throw new Error('HTTP ' + response.status);
    }
    const json = await response.json();
    
    console.log('[腾讯 K 线] API 响应:', JSON.stringify(json).substring(0, 200));
    
    // 腾讯 API 返回的是 qfq（前复权）数据，沪市用 qfq，深市用 qfqday
    const klineData = json.data?.[code]?.qfq || json.data?.[code]?.qfqday || json.data?.[code]?.day;
    if (!klineData || !Array.isArray(klineData) || klineData.length === 0) {
      console.warn('[腾讯 K 线] 无数据:', json);
      return null;
    }
    
    console.log('[腾讯 K 线] 原始数据条数:', klineData.length);
    
    // 腾讯格式：[日期，开盘，收盘，最高，最低，成交量]
    const result: KLinePoint[] = klineData.map((item: string[]) => ({
      date: item[0],
      open: parseFloat(item[1]),
      close: parseFloat(item[2]),
      high: parseFloat(item[3]),
      low: parseFloat(item[4]),
      volume: parseInt(item[5]) || 0
    })).filter((k: KLinePoint) => !isNaN(k.open) && !isNaN(k.high) && !isNaN(k.low) && !isNaN(k.close) && k.open > 0);
    
    console.log('[腾讯 K 线] 过滤后数据条数:', result.length);
    return result.length > 0 ? result : null;
  } catch (error) {
    console.warn('[腾讯财经 API] 获取失败:', error);
    return null;
  }
}

// 股票数据 Provider
export function StockProvider({ children }: { children: React.ReactNode }) {
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'format' | 'invalid' | 'network' | null>(null);
  const [lastSymbol, setLastSymbol] = useState<string | null>(null);

  const loadStock = useCallback(async (symbol: string, name?: string) => {
    setIsLoading(true);
    setError(null);
    setErrorType(null);
    setLastSymbol(symbol);
    
    const validation = validateStockSymbol(symbol);
    if (!validation.valid) {
      setError(validation.error || '股票代码无效');
      setErrorType(validation.errorType || 'invalid');
      setIsLoading(false);
      return;
    }
    
    try {
      // 使用统一数据服务获取实时行情（3级冗余）
      const quote = await unifiedStockDataService.fetchStockQuote(symbol);
      if (!quote) {
        setError('无法获取实时数据，请稍后重试');
        setErrorType('network');
        setIsLoading(false);
        return;
      }
      
      // 使用统一数据服务获取多周期K线数据（一年数据）
      const multiKLineData = await unifiedStockDataService.fetchMultiPeriodKLineData(symbol, 365);
      
      // 默认使用日线
      const defaultTimeframe: KLineTimeframe = '101';
      const kLineData = multiKLineData?.[defaultTimeframe] || [];
      
      // 构建StockData对象
      const stockDataBase: Partial<StockData> = {
        symbol: quote.code,
        name: name || quote.name || getStockName(symbol) || symbol,
        currentPrice: quote.currentPrice,
        change: quote.change,
        changePercent: quote.changePercent,
        open: quote.open,
        high: quote.high,
        low: quote.low,
        close: quote.currentPrice - quote.change,
        volume: quote.volume,
        marketCap: quote.marketCap,
        // 财务指标
        pe: quote.pe,
        peTtm: quote.peTtm,
        pb: quote.pb,
        ps: quote.ps,
        peg: quote.peg,
        roe: quote.roe,
        profitGrowth: quote.profitGrowth,
        revenueGrowth: quote.revenueGrowth,
        kLineData: kLineData,
        kLineDataMulti: multiKLineData || { '60': [], '240': [], '101': [] },
        currentTimeframe: defaultTimeframe,
        dataSource: quote.source,
        dataQuality: kLineData && kLineData.length >= 30 ? 'real' : 'fallback',
        updateTime: new Date().toLocaleString('zh-CN')
      };
      
      // 计算量化指标
      const metrics = calculateQuantMetrics(stockDataBase as StockData);
      const finalData: StockData = { ...stockDataBase, ...metrics } as StockData;
      
      setStockData(finalData);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '加载失败';
      setError(`加载失败：${errorMsg}`);
      setErrorType('network');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshStock = useCallback(async () => {
    if (lastSymbol) await loadStock(lastSymbol);
  }, [lastSymbol, loadStock]);

  // 切换 K 线图时间周期
  const changeTimeframe = useCallback((timeframe: KLineTimeframe) => {
    if (!stockData || !stockData.kLineDataMulti) return;
    
    const newKLineData = stockData.kLineDataMulti[timeframe];
    if (newKLineData && newKLineData.length > 0) {
      setStockData({
        ...stockData,
        kLineData: newKLineData,
        currentTimeframe: timeframe
      });
      console.log('[K 线 API] 切换到', timeframe === '60' ? '1 小时线' : timeframe === '240' ? '4 小时线' : '日线', '数据条数:', newKLineData.length);
    }
  }, [stockData]);

  const clearStock = useCallback(() => {
    setStockData(null);
    setError(null);
    setErrorType(null);
    setLastSymbol(null);
  }, []);

  return (
    <StockContext.Provider value={{ stockData, isLoading, error, errorType, loadStock, clearStock, refreshStock, changeTimeframe }}>
      {children}
    </StockContext.Provider>
  );
}

// useStock hook - 必须在 StockProvider 内使用
const useStock = function() {
  const context = useContext(StockContext);
  if (context === undefined) {
    throw new Error('useStock must be used within a StockProvider');
  }
  return context;
};

export { useStock };
