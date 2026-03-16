// src/services/ApiClient.ts
// 统一API客户端 - 封装所有数据源调用

import { StockConfig } from '../config/stock.config';

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  source: string;
  timestamp: string;
}

export class ApiClient {
  private static instance: ApiClient;
  private readonly TIMEOUT = 10000;
  private readonly RETRY_COUNT = 3;
  private readonly RETRY_DELAY = 1000;

  // API基础URL（通过Vite代理）
  private readonly API_BASE = {
    eastmoney: '/api/eastmoney',
    tencent: '/api/tencent',
    sina: '/api/sina'
  };

  private constructor() {}

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  /**
   * 统一GET请求
   */
  private async get<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          ...options?.headers
        },
        ...options
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        data,
        error: null,
        source: this.extractSource(url),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[ApiClient] 请求失败: ${url}`, error);
      return {
        data: null,
        error: error instanceof Error ? error.message : '未知错误',
        source: this.extractSource(url),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 带重试的请求
   */
  private async getWithRetry<T>(url: string, retries: number = this.RETRY_COUNT): Promise<ApiResponse<T>> {
    let lastError: string | null = null;
    
    for (let i = 0; i < retries; i++) {
      const result = await this.get<T>(url);
      
      if (result.data !== null) {
        return result;
      }
      
      lastError = result.error;
      
      if (i < retries - 1) {
        console.log(`[ApiClient] 重试 ${i + 1}/${retries}: ${url}`);
        await this.delay(this.RETRY_DELAY * (i + 1));
      }
    }
    
    return {
      data: null,
      error: `重试${retries}次后失败: ${lastError}`,
      source: this.extractSource(url),
      timestamp: new Date().toISOString()
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private extractSource(url: string): string {
    if (url.includes('eastmoney')) return 'eastmoney';
    if (url.includes('tencent')) return 'tencent';
    if (url.includes('sina')) return 'sina';
    return 'unknown';
  }

  // ========== 东方财富API ==========

  /**
   * 获取板块列表
   */
  async getSectorList(): Promise<ApiResponse<any>> {
    const url = `${this.API_BASE.eastmoney}/sector?pn=1&pz=100&po=1&np=1&fltt=2&invt=2&fid=f62&fs=m:90+t:2&fields=f12,f14,f3,f62,f8,f20,f184`;
    return this.getWithRetry(url);
  }

  /**
   * 获取板块成分股
   */
  async getSectorConstituents(sectorCode: string): Promise<ApiResponse<any>> {
    const url = `${this.API_BASE.eastmoney}/sector/constituents?code=${sectorCode}`;
    return this.getWithRetry(url);
  }

  /**
   * 获取股票行情
   */
  async getStockQuote(secid: string, fields: string): Promise<ApiResponse<any>> {
    const url = `${this.API_BASE.eastmoney}/quote?secid=${secid}&fields=${fields}`;
    return this.getWithRetry(url);
  }

  /**
   * 获取K线数据
   */
  async getKLineData(secid: string, klt: string, fqt: string, lmt: number): Promise<ApiResponse<any>> {
    const fields1 = 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13';
    const fields2 = 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61';
    const url = `${this.API_BASE.eastmoney}/kline?secid=${secid}&fields1=${fields1}&fields2=${fields2}&klt=${klt}&fqt=${fqt}&lmt=${lmt}&end=20500101`;
    return this.getWithRetry(url);
  }

  // ========== 腾讯API ==========

  /**
   * 获取腾讯K线数据
   */
  async getTencentKLine(code: string, start: string, end: string, limit: number, adjust: string = 'qfq'): Promise<ApiResponse<any>> {
    const url = `${this.API_BASE.tencent}/kline?code=${code}&start=${start}&end=${end}&limit=${limit}&adjust=${adjust}`;
    return this.getWithRetry(url);
  }

  /**
   * 获取腾讯实时行情
   */
  async getTencentQuote(symbols: string): Promise<ApiResponse<any>> {
    const url = `${this.API_BASE.tencent}/quote?s=${symbols}`;
    return this.getWithRetry(url);
  }

  // ========== 多源数据获取（带优先级） ==========

  /**
   * 获取K线数据（多源优先级）
   * 优先级: 东方财富 -> 腾讯
   */
  async getKLineDataWithFallback(symbol: string, timeframe: string, days: number): Promise<ApiResponse<any>> {
    const secid = symbol.startsWith('6') ? `1.${symbol}` : `0.${symbol}`;
    const klt = timeframe === '60' ? '60' : timeframe === '240' ? '240' : '101';
    
    // 尝试东方财富
    const emResult = await this.getKLineData(secid, klt, '1', days);
    if (emResult.data?.klines && emResult.data.klines.length > 0) {
      console.log('[ApiClient] 东方财富K线数据成功');
      return emResult;
    }
    
    console.warn('[ApiClient] 东方财富K线失败，尝试腾讯');
    
    // 尝试腾讯
    const market = symbol.startsWith('6') ? 'sh' : 'sz';
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const tencentResult = await this.getTencentKLine(`${market}${symbol}`, startDate, endDate, days);
    if (tencentResult.data) {
      console.log('[ApiClient] 腾讯K线数据成功');
      return tencentResult;
    }
    
    return {
      data: null,
      error: '所有数据源均失败',
      source: 'all',
      timestamp: new Date().toISOString()
    };
  }
}

// 导出单例实例
export const apiClient = ApiClient.getInstance();
