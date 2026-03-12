/**
 * K 线数据 API 服务
 * 提供新浪财经 K 线数据获取
 */

import type { KLinePoint, ApiLog } from '../types';

const API_CONFIG = {
  SINA_KLINE: {
    name: '新浪财经',
    url: (symbol: string, days: number = 360) => {
      const prefix = symbol.substring(0, 3);
      const market = ['600', '601', '603', '605', '688', '510', '511', '512', '513', '515', '516', '518', '519'].includes(prefix) ? 'sh' : 'sz';
      return `/api/sina/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=${market}${symbol}&scale=240&ma=no&datalen=${days}`;
    },
    timeout: 10000
  }
};

const apiLogs: ApiLog[] = [];

function logApiRequest(log: ApiLog) {
  apiLogs.push(log);
  const logPrefix = log.status === 'success' ? '✅' : log.status === 'error' ? '❌' : '⏱️';
  const durationStr = log.duration >= 1000 ? `${(log.duration/1000).toFixed(2)}s` : `${log.duration}ms`;
  
  if (log.status === 'success') {
    console.log(`${logPrefix} [API] ${log.apiName} - ${log.symbol} - ${durationStr}`);
  } else {
    console.warn(`${logPrefix} [API] ${log.apiName} - ${log.symbol} - ${durationStr} - ${log.errorMessage}`);
  }
  
  if (apiLogs.length > 100) {
    apiLogs.shift();
  }
}

async function fetchWithTimeout(url: string, timeout: number, signal?: AbortSignal): Promise<Response> {
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

export async function fetchSinaKLineData(symbol: string, days: number = 360): Promise<KLinePoint[] | null> {
  try {
    const startTime = Date.now();
    const url = API_CONFIG.SINA_KLINE.url(symbol, days);
    console.log(`🔄 [K 线 API] 请求 URL: ${url}`);
    
    const response = await fetchWithTimeout(url, API_CONFIG.SINA_KLINE.timeout);
    const duration = Date.now() - startTime;
    
    console.log(`📊 [K 线 API] 响应状态：${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      logApiRequest({
        timestamp: new Date().toISOString(),
        symbol,
        apiName: API_CONFIG.SINA_KLINE.name + ' K 线',
        status: 'error',
        duration,
        errorMessage: `HTTP ${response.status}: ${errorText.substring(0, 100)}`
      });
      console.warn(`⚠️ [K 线] API 返回错误状态：${response.status}`);
      return null;
    }
    
    let data: any;
    try {
      data = await response.json();
    } catch (parseError) {
      const parseErrorMsg = parseError instanceof Error ? parseError.message : String(parseError);
      logApiRequest({
        timestamp: new Date().toISOString(),
        symbol,
        apiName: API_CONFIG.SINA_KLINE.name + ' K 线',
        status: 'error',
        duration,
        errorMessage: `JSON 解析失败：${parseErrorMsg}`
      });
      console.error(`❌ [K 线] JSON 解析失败:`, parseErrorMsg);
      return null;
    }
    
    console.log(`📦 [K 线 API] 响应数据长度：${Array.isArray(data) ? data.length : '非数组'}`);
    
    if (!Array.isArray(data) || data.length === 0) {
      logApiRequest({
        timestamp: new Date().toISOString(),
        symbol,
        apiName: API_CONFIG.SINA_KLINE.name + ' K 线',
        status: 'error',
        duration,
        errorMessage: '数据格式异常或空数组'
      });
      console.warn(`⚠️ [K 线] API 返回空数据或非数组格式`, data);
      return null;
    }
    
    const firstItem = data[0];
    const requiredFields = ['day', 'open', 'high', 'low', 'close'];
    const hasRequiredFields = requiredFields.every(field => field in firstItem);
    if (!hasRequiredFields) {
      const missingFields = requiredFields.filter(field => !(field in firstItem));
      logApiRequest({
        timestamp: new Date().toISOString(),
        symbol,
        apiName: API_CONFIG.SINA_KLINE.name + ' K 线',
        status: 'error',
        duration,
        errorMessage: `缺少必需字段：${missingFields.join(', ')}`
      });
      console.error(`❌ [K 线] 数据格式错误，缺少字段:`, missingFields);
      return null;
    }
    
    const klineData: KLinePoint[] = data.map((item: any) => {
      const open = parseFloat(item.open);
      const high = parseFloat(item.high);
      const low = parseFloat(item.low);
      const close = parseFloat(item.close);
      const volume = parseInt(item.volume) || 0;
      
      return {
        date: item.day,
        open,
        high,
        low,
        close,
        volume
      };
    });
    
    const validData = klineData.filter(k => 
      !isNaN(k.open) && !isNaN(k.high) && !isNaN(k.low) && !isNaN(k.close) && k.open > 0 && k.close > 0
    );
    
    if (validData.length !== klineData.length) {
      console.warn(`⚠️ [K 线] ${klineData.length - validData.length} 条数据无效，已过滤`);
    }
    
    if (validData.length === 0) {
      logApiRequest({
        timestamp: new Date().toISOString(),
        symbol,
        apiName: API_CONFIG.SINA_KLINE.name + ' K 线',
        status: 'error',
        duration,
        errorMessage: '所有数据均无效'
      });
      console.error(`❌ [K 线] 所有数据均无效`);
      return null;
    }
    
    logApiRequest({
      timestamp: new Date().toISOString(),
      symbol,
      apiName: API_CONFIG.SINA_KLINE.name + ' K 线',
      status: 'success',
      duration
    });
    
    console.log(`✅ [K 线] 获取到 ${validData.length} 条有效数据 (共 ${klineData.length} 条)`);
    console.log(`   数据范围：${validData[0]?.date} 至 ${validData[validData.length - 1]?.date}`);
    
    return validData;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logApiRequest({
      timestamp: new Date().toISOString(),
      symbol,
      apiName: API_CONFIG.SINA_KLINE.name + ' K 线',
      status: 'error',
      duration: API_CONFIG.SINA_KLINE.timeout,
      errorMessage: errorMsg
    });
    console.error(`❌ [K 线] 请求失败:`, errorMsg);
    return null;
  }
}
