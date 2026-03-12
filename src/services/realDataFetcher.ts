/**
 * 真实数据获取服务
 * 功能：从东方财富API获取真实股票数据
 * 版本：v2.0 - 100%真实数据，移除所有模拟数据
 */

// ==================== 类型定义 ====================

export interface StockQuote {
  code: string;
  name: string;
  currentPrice: number;
  pe: number;
  peg: number;
  pb: number;
  profitGrowth: number;
  revenueGrowth: number;
  roe: number;
  marketCap: number;
  turnoverRate?: number;
  volume?: number;
  amplitude?: number;
  source: 'eastmoney' | 'none';
  timestamp: string;
  error?: string;
}

export interface KLineData {
  date: string;
  open: number;
  close: number;
  low: number;
  high: number;
  volume: number;
  amount?: number;
}

export interface SupportResistance {
  support: number;
  resistance: number;
  klines: KLineData[];
  method: string;
  confidence: number;
  source: 'eastmoney' | 'estimated' | 'none';
  timestamp: string;
  error?: string;
}

export interface HotSectorData {
  code: string;
  name: string;
  changePercent: number;
  marketCap: number;
  netInflow: number;
  mainForceRatio: number;
  turnoverRate: number;
  volume: number;
  leadingStocks?: string[];
  source: 'eastmoney' | 'none';
  timestamp: string;
  error?: string;
}

export interface TechnicalIndicators {
  ma5: number;
  ma10: number;
  ma20: number;
  ma60: number;
  upperBand: number;
  lowerBand: number;
  middleBand: number;
  rsi14: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  source: 'calculated' | 'none';
  timestamp: string;
}

// ==================== 配置常量 ====================

const CONFIG = {
  EASTMONEY_BASE: 'https://push2.eastmoney.com/api',
  KLINE_BASE: 'https://push2his.eastmoney.com/api',
  QUOTE_BASE: 'https://push2.eastmoney.com/api',
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  TIMEOUT: 10000
};

// ==================== 真实数据获取类 ====================

export class RealDataFetcher {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60000; // 1分钟缓存

  // ==================== 工具方法 ====================

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getSecId(stockCode: string): string {
    if (stockCode.startsWith('6')) return `1.${stockCode}`;
    if (stockCode.startsWith('0') || stockCode.startsWith('3')) return `0.${stockCode}`;
    if (stockCode.startsWith('8') || stockCode.startsWith('4')) return `0.${stockCode}`; // 北交所/新三板
    return `0.${stockCode}`;
  }

  private getCacheKey(type: string, code: string): string {
    return `${type}:${code}`;
  }

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data as T;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private async fetchWithRetry(url: string, retries: number = CONFIG.MAX_RETRIES): Promise<Response> {
    let lastError: Error | null = null;

    for (let i = 0; i < retries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://quote.eastmoney.com/'
          }
        });

        clearTimeout(timeoutId);

        if (response.ok) return response;

        if (response.status >= 500) {
          throw new Error(`Server error: ${response.status}`);
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`[RealDataFetcher] 请求失败 (${i + 1}/${retries}):`, lastError.message);

        if (i < retries - 1) {
          await this.delay(CONFIG.RETRY_DELAY * (i + 1));
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  // ==================== 股票行情获取 ====================

  /**
   * 获取股票实时行情
   * 返回真实数据或null（不再返回模拟数据）
   */
  async fetchStockQuote(stockCode: string): Promise<StockQuote | null> {
    const cacheKey = this.getCacheKey('quote', stockCode);
    const cached = this.getCached<StockQuote>(cacheKey);
    if (cached) return cached;

    try {
      const secId = this.getSecId(stockCode);
      const fields = 'f43,f57,f58,f162,f163,f167,f169,f170,f164,f116,f168,f171,f172,f173,f174,f175,f176,f177,f178';
      const url = `${CONFIG.QUOTE_BASE}/qt/stock/get?ut=fa5fd1943c7b386f172d6893dbfba10b&fltt=2&invt=2&volt=2&fields=${fields}&secid=${secId}`;

      console.log(`[RealDataFetcher] 获取行情: ${stockCode}`);

      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (!data.data || !data.data.f43) {
        console.warn(`[RealDataFetcher] ${stockCode}: 无有效数据`);
        return null;
      }

      const quote: StockQuote = {
        code: stockCode,
        name: data.data.f58 || stockCode,
        currentPrice: this.parsePrice(data.data.f43),
        pe: this.parseIndicator(data.data.f162, 100),
        peg: this.parseIndicator(data.data.f163, 100),
        pb: this.parseIndicator(data.data.f167, 100),
        profitGrowth: this.parseIndicator(data.data.f169, 100),
        revenueGrowth: this.parseIndicator(data.data.f170, 100),
        roe: this.parseIndicator(data.data.f164, 100),
        marketCap: data.data.f116 || 0,
        turnoverRate: this.parseIndicator(data.data.f168, 100),
        volume: data.data.f171 || 0,
        amplitude: this.parseIndicator(data.data.f172, 100),
        source: 'eastmoney',
        timestamp: new Date().toISOString()
      };

      console.log(`[RealDataFetcher] ${stockCode} 成功: ${quote.name} ¥${quote.currentPrice}`);
      this.setCache(cacheKey, quote);
      return quote;

    } catch (error) {
      console.error(`[RealDataFetcher] 获取${stockCode}失败:`, error);
      return null;
    }
  }

  private parsePrice(value: any): number {
    if (!value) return 0;
    const num = parseFloat(value);
    if (isNaN(num)) return 0;
    
    if (num < 0.1 && num > 0) {
      return num * 100;
    }
    
    return num;
  }

  private parseIndicator(value: any, divisor: number = 1): number {
    if (!value) return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num / divisor;
  }

  // ==================== K线数据获取 ====================

  /**
   * 获取股票K线数据
   * 返回真实数据或null（不再返回模拟数据）
   */
  async fetchKLineData(stockCode: string, period: number = 60): Promise<KLineData[] | null> {
    const cacheKey = this.getCacheKey('kline', stockCode);
    const cached = this.getCached<KLineData[]>(cacheKey);
    if (cached) return cached;

    try {
      const secId = this.getSecId(stockCode);
      const url = `${CONFIG.KLINE_BASE}/qt/stock/kline/get?secid=${secId}&klt=101&fqt=1&lmt=${period}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61`;

      console.log(`[RealDataFetcher] 获取K线: ${stockCode}`);

      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (!data.data || !data.data.klines || data.data.klines.length < 20) {
        console.warn(`[RealDataFetcher] ${stockCode}: K线数据不足`);
        return null;
      }

      const klines: KLineData[] = data.data.klines.map((k: string) => {
        const parts = k.split(',');
        return {
          date: parts[0],
          open: parseFloat(parts[1]),
          close: parseFloat(parts[2]),
          low: parseFloat(parts[3]),
          high: parseFloat(parts[4]),
          volume: parseFloat(parts[5]),
          amount: parseFloat(parts[6]) || 0
        };
      });

      console.log(`[RealDataFetcher] ${stockCode} K线成功: ${klines.length}条`);
      this.setCache(cacheKey, klines);
      return klines;

    } catch (error) {
      console.error(`[RealDataFetcher] 获取${stockCode}K线失败:`, error);
      return null;
    }
  }

  // ==================== 技术指标计算 ====================

  /**
   * 计算技术指标
   */
  calculateTechnicalIndicators(klines: KLineData[]): TechnicalIndicators {
    const closes = klines.map(k => k.close);
    const highs = klines.map(k => k.high);
    const lows = klines.map(k => k.low);

    const ma5 = this.calculateMA(closes, 5);
    const ma10 = this.calculateMA(closes, 10);
    const ma20 = this.calculateMA(closes, 20);
    const ma60 = this.calculateMA(closes, 60);

    const bollinger = this.calculateBollinger(closes, 20, 2);
    const rsi14 = this.calculateRSI(closes, 14);
    const macd = this.calculateMACD(closes);

    return {
      ma5,
      ma10,
      ma20,
      ma60,
      upperBand: bollinger.upper,
      lowerBand: bollinger.lower,
      middleBand: bollinger.middle,
      rsi14,
      macd: macd.macd,
      macdSignal: macd.signal,
      macdHistogram: macd.histogram,
      source: 'calculated',
      timestamp: new Date().toISOString()
    };
  }

  private calculateMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0;
    const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
    return sum / period;
  }

  private calculateBollinger(prices: number[], period: number = 20, stdDev: number = 2): { upper: number; middle: number; lower: number } {
    if (prices.length < period) {
      const lastPrice = prices[prices.length - 1] || 0;
      return { upper: lastPrice * 1.05, middle: lastPrice, lower: lastPrice * 0.95 };
    }

    const sma = this.calculateMA(prices, period);
    const squaredDiffs = prices.slice(-period).map(p => Math.pow(p - sma, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
    const std = Math.sqrt(variance);

    return {
      upper: sma + stdDev * std,
      middle: sma,
      lower: sma - stdDev * std
    };
  }

  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macdLine = ema12 - ema26;
    const signalLine = this.calculateEMA([...prices.slice(0, -1), macdLine], 9);

    return {
      macd: macdLine,
      signal: signalLine,
      histogram: macdLine - signalLine
    };
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0;

    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  // ==================== 支撑位计算（多方法） ====================

  /**
   * 计算支撑位和阻力位（综合多方法）
   * 基于真实K线数据计算
   */
  async calculateSupportResistance(stockCode: string, currentPrice?: number): Promise<SupportResistance | null> {
    try {
      const klines = await this.fetchKLineData(stockCode, 60);
      if (!klines || klines.length < 20) {
        return null;
      }

      const prices = klines.map(k => k.close);
      const lows = klines.map(k => k.low);
      const highs = klines.map(k => k.high);

      const methods: { support: number; weight: number; name: string }[] = [];

      const ma20 = this.calculateMA(prices, 20);
      const ma60 = this.calculateMA(prices, 60);
      methods.push({ support: ma20, weight: 0.25, name: 'MA20' });
      methods.push({ support: ma60, weight: 0.15, name: 'MA60' });

      const recentLows = lows.slice(-20);
      const prevLow = Math.min(...recentLows);
      methods.push({ support: prevLow * 0.98, weight: 0.20, name: '前低' });

      const bollinger = this.calculateBollinger(prices, 20, 2);
      methods.push({ support: bollinger.lower, weight: 0.20, name: '布林带下轨' });

      const fibSupport = this.calculateFibonacciSupport(prices);
      methods.push({ support: fibSupport, weight: 0.20, name: '斐波那契' });

      const totalWeight = methods.reduce((sum, m) => sum + m.weight, 0);
      const weightedSupport = methods.reduce((sum, m) => sum + m.support * m.weight, 0) / totalWeight;

      const recentHighs = highs.slice(-20);
      const prevHigh = Math.max(...recentHighs);
      const resistance = Math.max(prevHigh * 1.02, bollinger.upper, currentPrice ? currentPrice * 1.15 : 0);

      const variance = methods.reduce((sum, m) => sum + Math.pow(m.support - weightedSupport, 2), 0) / methods.length;
      const stdDev = Math.sqrt(variance);
      const confidence = Math.max(0, Math.min(100, 100 - (stdDev / weightedSupport) * 100));

      console.log(`[RealDataFetcher] ${stockCode} 支撑计算:`);
      methods.forEach(m => console.log(`  - ${m.name}: ¥${m.support.toFixed(2)} (权重${m.weight})`));
      console.log(`  - 加权支撑: ¥${weightedSupport.toFixed(2)}, 阻力: ¥${resistance.toFixed(2)}, 置信度: ${confidence.toFixed(1)}%`);

      return {
        support: Math.round(weightedSupport * 100) / 100,
        resistance: Math.round(resistance * 100) / 100,
        klines,
        method: methods.map(m => m.name).join('+'),
        confidence: Math.round(confidence * 10) / 10,
        source: 'eastmoney',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`[RealDataFetcher] 计算${stockCode}支撑阻力失败:`, error);
      return null;
    }
  }

  private calculateFibonacciSupport(prices: number[]): number {
    if (prices.length < 20) return prices[prices.length - 1] * 0.9;

    const high = Math.max(...prices.slice(-20));
    const low = Math.min(...prices.slice(-20));
    const range = high - low;

    const fib382 = high - range * 0.382;
    const fib500 = high - range * 0.5;
    const fib618 = high - range * 0.618;

    return fib382 * 0.4 + fib500 * 0.35 + fib618 * 0.25;
  }

  // ==================== 热门板块获取 ====================

  /**
   * 获取热门板块数据
   * 返回真实数据或空数组（不再返回模拟数据）
   */
  async fetchHotSectors(): Promise<HotSectorData[]> {
    try {
      const url = `${CONFIG.EASTMONEY_BASE}/qt/clist/get?pn=1&pz=20&po=1&np=1&fltt=2&invt=2&fid=f62&fs=m:90+t:2&fields=f12,f13,f14,f20,f62,f128,f136,f140,f141,f142,f143,f144,f145,f146,f147,f148,f149`;

      console.log('[RealDataFetcher] 获取热门板块...');

      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (!data.data || !data.data.diff) {
        console.warn('[RealDataFetcher] 热门板块数据为空');
        return [];
      }

      const sectors: HotSectorData[] = data.data.diff.map((item: any) => ({
        code: item.f12,
        name: item.f14,
        changePercent: this.parseIndicator(item.f136, 100),
        marketCap: item.f20 || 0,
        netInflow: item.f62 || 0,
        mainForceRatio: this.parseIndicator(item.f128, 100),
        turnoverRate: this.parseIndicator(item.f140, 100),
        volume: item.f141 || 0,
        source: 'eastmoney',
        timestamp: new Date().toISOString()
      })).slice(0, 6);

      console.log(`[RealDataFetcher] 热门板块成功: ${sectors.length}个`);
      return sectors;

    } catch (error) {
      console.error('[RealDataFetcher] 获取热门板块失败:', error);
      return [];
    }
  }

  /**
   * 获取板块成分股
   */
  async fetchSectorStocks(sectorCode: string, limit: number = 10): Promise<string[]> {
    try {
      const url = `${CONFIG.EASTMONEY_BASE}/qt/clist/get?pn=1&pz=${limit}&po=1&np=1&fltt=2&invt=2&fid=f20&fs=b:${sectorCode}&fields=f12,f13,f14`;

      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (!data.data || !data.data.diff) return [];

      return data.data.diff.map((item: any) => item.f12).slice(0, limit);

    } catch (error) {
      console.error(`[RealDataFetcher] 获取板块${sectorCode}成分股失败:`, error);
      return [];
    }
  }

  /**
   * 获取热门板块Top股票 - 用于精选股票池
   * 从多个热门板块获取成分股并合并
   * API失败时返回空数组（不再使用默认股票池）
   */
  async fetchHotSectorTopStocks(totalLimit: number = 30): Promise<string[]> {
    try {
      const sectors = await this.fetchHotSectors();
      if (!sectors || sectors.length === 0) {
        console.warn('[RealDataFetcher] 无热门板块数据');
        return [];
      }

      const allStocks: string[] = [];
      
      for (const sector of sectors.slice(0, 4)) {
        try {
          const stocks = await this.fetchSectorStocks(sector.code, 10);
          if (stocks && stocks.length > 0) {
            allStocks.push(...stocks);
            console.log(`[RealDataFetcher] 板块 ${sector.name} 获取 ${stocks.length} 只成分股`);
          }
        } catch (e) {
          console.warn(`[RealDataFetcher] 获取板块${sector.name}成分股失败:`, e);
        }
      }

      const uniqueStocks = [...new Set(allStocks)].slice(0, totalLimit);
      
      console.log(`[RealDataFetcher] 精选股票池: 从热门板块获取 ${uniqueStocks.length} 只股票`);
      return uniqueStocks;

    } catch (error) {
      console.error('[RealDataFetcher] 获取热门板块Top股票失败:', error);
      return [];
    }
  }

  /**
   * 获取历史价格数据（用于蒙特卡洛模拟）
   */
  async fetchHistoricalPrices(stockCode: string, days: number = 60): Promise<number[] | null> {
    const klines = await this.fetchKLineData(stockCode, days);
    if (!klines) return null;
    return klines.map(k => k.close);
  }

  // ==================== 批量获取方法 ====================

  /**
   * 批量获取股票行情
   */
  async fetchBatchQuotes(stockCodes: string[]): Promise<StockQuote[]> {
    const quotes: StockQuote[] = [];

    const batchSize = 5;
    for (let i = 0; i < stockCodes.length; i += batchSize) {
      const batch = stockCodes.slice(i, i + batchSize);
      const batchPromises = batch.map(code => this.fetchStockQuote(code));
      const batchResults = await Promise.all(batchPromises);

      batchResults.forEach(quote => {
        if (quote) quotes.push(quote);
      });

      if (i + batchSize < stockCodes.length) {
        await this.delay(200);
      }
    }

    return quotes;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[RealDataFetcher] 缓存已清除');
  }
}

// 导出单例实例
export const realDataFetcher = new RealDataFetcher();
