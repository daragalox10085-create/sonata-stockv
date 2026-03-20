/**
 * API 兼容层
 * 为旧版 API 提供向后兼容支持
 *
 * @module services/api/compatibility
 * @version 3.0.0
 */

import { unifiedApiClient } from './client/UnifiedApiClient';
import { DataSource } from './types';
import type { StockData, KLinePoint, StockSearchResult } from '../../types';

// ============================================================================
// 兼容层类
// ============================================================================

export class ApiCompatibilityLayer {
  private client = unifiedApiClient;

  /**
   * 兼容旧版 fetchRealTimeData
   * @deprecated 使用 unifiedApiClient.get('/quote', { symbol }) 替代
   */
  async fetchRealTimeData(
    symbol: string
  ): Promise<{ data: StockData | null; source: string }> {
    try {
      // 使用新 API 获取实时行情
      const response = await this.client.get<StockData>('/quote', { symbol });

      if (response.success && response.data) {
        return {
          data: response.data,
          source: response.meta.source,
        };
      }

      return { data: null, source: '' };
    } catch (error) {
      console.error('[Compatibility] fetchRealTimeData error:', error);
      return { data: null, source: '' };
    }
  }

  /**
   * 兼容旧版 fetchKLineData
   * @deprecated 使用 unifiedApiClient.get('/kline', { symbol, days }) 替代
   */
  async fetchKLineData(
    symbol: string,
    days: number = 360
  ): Promise<KLinePoint[] | null> {
    try {
      const response = await this.client.get<KLinePoint[]>('/kline', {
        symbol,
        days: days.toString(),
      });

      return response.success ? response.data : null;
    } catch (error) {
      console.error('[Compatibility] fetchKLineData error:', error);
      return null;
    }
  }

  /**
   * 兼容旧版 searchStockByName
   * @deprecated 使用 unifiedApiClient.get('/search', { keyword }) 替代
   */
  async searchStockByName(keyword: string): Promise<StockSearchResult[]> {
    try {
      const response = await this.client.get<StockSearchResult[]>('/search', {
        keyword,
      });

      return response.success ? response.data || [] : [];
    } catch (error) {
      console.error('[Compatibility] searchStockByName error:', error);
      return [];
    }
  }

  /**
   * 兼容旧版 getApiLogs
   * @deprecated 使用 unifiedApiClient.getLogs() 替代
   */
  getApiLogs(symbol?: string) {
    const logs = this.client.getLogs();
    return symbol
      ? logs.filter(log => log.endpoint.includes(symbol))
      : logs;
  }
}

// ============================================================================
// 导出兼容 API 实例
// ============================================================================

export const legacyApi = new ApiCompatibilityLayer();

// ============================================================================
// 重新导出旧版 API 函数（保持模块导出兼容）
// ============================================================================

/**
 * @deprecated 使用 unifiedApiClient 替代
 */
export async function fetchRealTimeData(
  symbol: string
): Promise<{ data: StockData | null; source: string }> {
  return legacyApi.fetchRealTimeData(symbol);
}

/**
 * @deprecated 使用 unifiedApiClient 替代
 */
export async function fetchKLineData(
  symbol: string,
  days: number = 360
): Promise<KLinePoint[] | null> {
  return legacyApi.fetchKLineData(symbol, days);
}

/**
 * @deprecated 使用 unifiedApiClient 替代
 */
export async function searchStockByName(keyword: string): Promise<StockSearchResult[]> {
  return legacyApi.searchStockByName(keyword);
}

/**
 * @deprecated 使用 unifiedApiClient.getLogs() 替代
 */
export function getApiLogs(symbol?: string) {
  return legacyApi.getApiLogs(symbol);
}
