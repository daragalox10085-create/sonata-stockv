/**
 * K 线数据 API 服务
 * 使用统一 API 客户端，提供新浪财经 K 线数据获取
 * 
 * @module services/klineApi
 * @version 2.0.0
 */

import type { KLinePoint } from '../types';
import { apiClient, ApiResponse } from './ApiClient';
import { logger } from '../utils/logger';
import { AppError, ErrorCode } from '../utils/errors';

/**
 * 市场前缀映射
 */
const MARKET_PREFIXES = {
  SHANGHAI: ['600', '601', '603', '605', '688', '510', '511', '512', '513', '515', '516', '518', '519'],
  SHENZHEN: ['000', '001', '002', '003', '300', '301']
};

/**
 * 获取市场前缀
 */
function getMarketPrefix(symbol: string): 'sh' | 'sz' {
  const prefix = symbol.substring(0, 3);
  return MARKET_PREFIXES.SHANGHAI.includes(prefix) ? 'sh' : 'sz';
}

/**
 * API 配置
 */
const KLINE_API_CONFIG = {
  SINA: {
    name: '新浪财经',
    timeout: 10000,
    buildUrl: (symbol: string, days: number) => {
      const market = getMarketPrefix(symbol);
      return `/api/sina/kline?symbol=${market}${symbol}&scale=240&ma=no&datalen=${days}`;
    }
  },
  TENCENT: {
    name: '腾讯财经',
    timeout: 10000,
    buildUrl: (symbol: string, days: number) => {
      const market = getMarketPrefix(symbol);
      const endDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0].replace(/-/g, '');
      return `/api/tencent/kline?code=${market}${symbol}&start=${startDate}&end=${endDate}&limit=${days}&adjust=qfq`;
    }
  }
};

/**
 * 验证 K 线数据格式
 */
function validateKLineData(data: any[]): boolean {
  if (!Array.isArray(data) || data.length === 0) return false;
  const firstItem = data[0];
  const requiredFields = ['day', 'open', 'high', 'low', 'close'];
  return requiredFields.every(field => field in firstItem);
}

/**
 * 解析 K 线数据
 */
function parseKLineData(data: any[]): KLinePoint[] {
  const klineData: KLinePoint[] = data.map((item: any) => {
    const open = parseFloat(item.open);
    const high = parseFloat(item.high);
    const low = parseFloat(item.low);
    const close = parseFloat(item.close);
    const volume = parseInt(item.volume) || 0;
    
    return { date: item.day, open, high, low, close, volume };
  });
  
  const validData = klineData.filter(k => 
    !isNaN(k.open) && !isNaN(k.high) && !isNaN(k.low) && !isNaN(k.close) && k.open > 0 && k.close > 0
  );
  
  return validData;
}

/**
 * 获取新浪财经 K 线数据
 */
export async function fetchSinaKLineData(symbol: string, days: number = 360): Promise<KLinePoint[] | null> {
  const startTime = Date.now();
  const config = KLINE_API_CONFIG.SINA;
  const url = config.buildUrl(symbol, days);
  
  logger.info(`[KLine API] 请求 ${config.name} K线数据`, { symbol, days, url });
  
  try {
    const response: ApiResponse<any> = await apiClient.getWithRetry(url, {
      timeout: config.timeout,
      retries: 3,
      retryDelay: 1000
    });
    
    const duration = Date.now() - startTime;
    
    if (!response.success || !response.data) {
      logger.warn(`[KLine API] ${config.name} 请求失败`, { 
        symbol, error: response.error, duration 
      });
      return null;
    }
    
    if (!validateKLineData(response.data)) {
      logger.warn(`[KLine API] ${config.name} 数据格式无效`, { symbol, duration });
      return null;
    }
    
    const validData = parseKLineData(response.data);
    
    if (validData.length === 0) {
      logger.warn(`[KLine API] ${config.name} 无有效数据`, { symbol, duration });
      return null;
    }
    
    logger.info(`[KLine API] ${config.name} 获取成功`, {
      symbol, count: validData.length, duration,
      range: `${validData[0].date} 至 ${validData[validData.length - 1].date}`
    });
    
    return validData;
  } catch (error) {
    logger.error(`[KLine API] ${config.name} 请求异常`, error, { symbol });
    return null;
  }
}

/**
 * 获取腾讯财经 K 线数据（备选）
 */
export async function fetchTencentKLineData(symbol: string, days: number = 360): Promise<KLinePoint[] | null> {
  const startTime = Date.now();
  const config = KLINE_API_CONFIG.TENCENT;
  const url = config.buildUrl(symbol, days);
  
  logger.info(`[KLine API] 请求 ${config.name} K线数据`, { symbol, days, url });
  
  try {
    const response: ApiResponse<any> = await apiClient.getWithRetry(url, {
      timeout: config.timeout,
      retries: 2,
      retryDelay: 1000
    });
    
    const duration = Date.now() - startTime;
    
    if (!response.success || !response.data) {
      logger.warn(`[KLine API] ${config.name} 请求失败`, { 
        symbol, error: response.error, duration 
      });
      return null;
    }
    
    // 腾讯数据格式处理
    const market = getMarketPrefix(symbol);
    const key = market + symbol;
    const dayData = response.data.data?.[key]?.day || response.data;
    
    if (!Array.isArray(dayData) || dayData.length === 0) {
      logger.warn(`[KLine API] ${config.name} 数据为空`, { symbol, duration });
      return null;
    }
    
    // 腾讯格式: [日期, 开盘, 收盘, 最低, 最高, 成交量]
    const parsedData = dayData.map((item: any[]) => ({
      day: item[0],
      open: item[1],
      close: item[2],
      low: item[3],
      high: item[4],
      volume: item[5]
    }));
    
    const validData = parseKLineData(parsedData);
    
    if (validData.length === 0) {
      logger.warn(`[KLine API] ${config.name} 无有效数据`, { symbol, duration });
      return null;
    }
    
    logger.info(`[KLine API] ${config.name} 获取成功`, {
      symbol, count: validData.length, duration,
      range: `${validData[0].date} 至 ${validData[validData.length - 1].date}`
    });
    
    return validData;
  } catch (error) {
    logger.error(`[KLine API] ${config.name} 请求异常`, error, { symbol });
    return null;
  }
}

/**
 * 获取 K 线数据（带多源回退）
 * 优先使用新浪财经，失败时回退到腾讯财经
 */
export async function fetchKLineData(symbol: string, days: number = 360): Promise<KLinePoint[] | null> {
  // 首先尝试新浪财经
  const sinaData = await fetchSinaKLineData(symbol, days);
  if (sinaData && sinaData.length > 0) {
    return sinaData;
  }
  
  // 新浪财经失败，尝试腾讯财经
  logger.warn(`[KLine API] 新浪财经失败，尝试腾讯财经`, { symbol });
  const tencentData = await fetchTencentKLineData(symbol, days);
  if (tencentData && tencentData.length > 0) {
    return tencentData;
  }
  
  logger.error(`[KLine API] 所有数据源均失败`, { symbol });
  return null;
}

// 向后兼容导出
export { fetchKLineData as fetchSinaKLine };
