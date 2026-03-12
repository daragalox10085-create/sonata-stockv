/**
 * 股票搜索 API 服务
 * 提供东方财富股票搜索功能
 */

import type { StockSearchResult } from '../types';

// 常见股票本地数据（作为 API 不可用时的后备）
const LOCAL_STOCK_DATABASE: StockSearchResult[] = [
  { code: '600519', name: '贵州茅台', market: '沪市主板' },
  { code: '000858', name: '五粮液', market: '深市主板' },
  { code: '300750', name: '宁德时代', market: '创业板' },
  { code: '002594', name: '比亚迪', market: '深市主板' },
  { code: '510300', name: '沪深 300ETF', market: 'ETF 基金' },
  { code: '513310', name: '中韩半导体 ETF', market: 'ETF 基金' },
  { code: '002772', name: '众兴菌业', market: '深市主板' },
  { code: '600760', name: '中航光电', market: '沪市主板' },
];

export async function searchStockByName(keyword: string): Promise<StockSearchResult[]> {
  if (!keyword.trim()) {
    return [];
  }
  
  try {
    // 首先尝试本地搜索（快速响应）
    const localResults = LOCAL_STOCK_DATABASE.filter(stock => 
      stock.name.includes(keyword) || 
      stock.code.includes(keyword) ||
      stock.market.includes(keyword)
    );
    
    if (localResults.length > 0) {
      console.log('本地搜索结果:', localResults);
      return localResults;
    }
    
    // 如果本地没有结果，尝试 API 搜索
    const url = `/api/eastmoney/api/suggest?input=${encodeURIComponent(keyword)}&type=14&markettype=9`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.warn('股票搜索 API 请求失败:', response.status, response.statusText);
      return [];
    }
    
    const data = await response.json();
    console.log('东方财富 API 响应:', data);
    
    if (data && data.Data && Array.isArray(data.Data)) {
      return data.Data.map((item: any) => ({
        code: item.Code || '',
        name: item.Name || '',
        market: item.Market || ''
      })).filter((item: StockSearchResult) => item.code && item.name);
    }
    
    return [];
  } catch (error) {
    console.error('股票搜索失败:', error);
    return [];
  }
}
