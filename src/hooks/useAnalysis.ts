/**
 * Sonata Analysis Hooks
 * React hooks for accessing analysis data
 * 版本：v2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { PipelineResult } from '../services/SectorStockPipeline';
import { MonteCarloResult } from '../types/DataContract';

interface UseHotSectorsReturn {
  data: PipelineResult[] | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  fromCache: boolean;
}

interface UseMonteCarloReturn {
  data: {
    stock: { code: string; name: string; currentPrice: number };
    monteCarlo: MonteCarloResult;
  } | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * 获取热门板块及精选股票
 * 修复：通过 /api/eastmoney/sector 代理调用，避免直接访问外部 API
 */
export function useHotSectors(): UseHotSectorsReturn {
  const [data, setData] = useState<PipelineResult[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const fetchData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    
    try {
      // 优先尝试后端 API
      const backendUrl = forceRefresh 
        ? '/api/hot-sectors?refresh=true' 
        : '/api/hot-sectors';
      
      try {
        const response = await fetch(backendUrl, { timeout: 5000 } as any);
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setData(result.data);
            setFromCache(result.fromCache || false);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.log('后端 API 不可用，使用代理调用东方财富 API');
      }
      
      // 后端不可用，通过代理调用东方财富 API
      const params = new URLSearchParams({
        pn: '1',
        pz: '50',
        po: '1',
        np: '1',
        fltt: '2',
        invt: '2',
        fid: 'f62',
        fs: 'm:90+t:2',
        fields: 'f12,f14,f3,f62,f8,f20,f184'
      });
      const eastmoneyUrl = `/api/eastmoney/sector?${params.toString()}`;
      const response = await fetch(eastmoneyUrl);
      const result = await response.json();
      
      if (!result.data?.diff) {
        throw new Error('无法获取板块数据');
      }
      
      // 转换为 PipelineResult 格式
      const sectors: PipelineResult[] = [];
      let rank = 1;
      
      for (const item of Object.values(result.data.diff) as any[]) {
        const mainForceNet = parseFloat(item.f62 || 0);
        // 只保留主力净流入>1000 万的板块
        if (mainForceNet > 10_000_000) {
          sectors.push({
            sector: {
              code: item.f12,
              name: item.f14,
              score: Math.min(100, Math.max(0, 50 + parseFloat(item.f3 || 0) * 2)),
              rank: rank++,
              changePercent: parseFloat(item.f3 || 0),
              dimensions: {
                momentum: Math.min(100, Math.max(0, 50 + parseFloat(item.f3 || 0) * 2)),
                capital: Math.min(100, Math.max(0, 50 + mainForceNet / 1e8)),
                technical: Math.min(100, parseFloat(item.f8 || 0) * 10),
                fundamental: Math.min(100, Math.max(0, 50 + parseFloat(item.f184 || 50) - 50))
              },
              trend: parseFloat(item.f3 || 0) > 3 ? '强势热点' : parseFloat(item.f3 || 0) > 0 ? '持续热点' : '观察',
              topStocks: [],
              metrics: {
                mainForceNet: mainForceNet,
                turnoverRate: parseFloat(item.f8 || 0),
                rsi: parseFloat(item.f184 || 50),
                marketValue: parseFloat(item.f20 || 0),
                peRatio: 0
              },
              source: 'eastmoney',
              timestamp: new Date().toISOString()
            },
            constituents: [],
            selectedStocks: [],
            analysisTimestamp: new Date().toISOString(),
            dataQuality: {
              sectorValid: true,
              constituentsCount: 0,
              selectedCount: 0,
              isRealData: true
            }
          });
        }
      }
      
      // 只返回前 6 个
      setData(sectors.slice(0, 6));
      setFromCache(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh: () => fetchData(true),
    fromCache
  };
}

/**
 * 获取个股蒙特卡洛分析
 */
export function useMonteCarlo(stockCode: string): UseMonteCarloReturn {
  const [data, setData] = useState<UseMonteCarloReturn['data']>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!stockCode) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const url = forceRefresh 
        ? `/api/stock/${stockCode}/monte-carlo?refresh=true`
        : `/api/stock/${stockCode}/monte-carlo`;
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '分析失败');
      }
      
      setData({
        stock: result.stock,
        monteCarlo: result.monteCarlo
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }, [stockCode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh: () => fetchData(true)
  };
}

/**
 * 检查数据源健康状态
 */
export function useHealthCheck() {
  const [status, setStatus] = useState<'healthy' | 'unhealthy' | 'checking'>('checking');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const check = useCallback(async () => {
    setStatus('checking');
    
    try {
      const response = await fetch('/api/health');
      const result = await response.json();
      
      setStatus(result.status === 'healthy' ? 'healthy' : 'unhealthy');
      setLastCheck(new Date());
    } catch {
      setStatus('unhealthy');
      setLastCheck(new Date());
    }
  }, []);

  useEffect(() => {
    check();
    // 每 30 秒检查一次
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [check]);

  return { status, lastCheck, check };
}
