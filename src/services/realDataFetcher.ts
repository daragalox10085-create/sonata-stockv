import { StockQuote, SectorData, DataSource } from '../types/DataContract';

export class RealDataFetcher {
  private readonly EASTMONEY_BASE = 'https://push2.eastmoney.com/api';
  private readonly KLINE_BASE = 'https://push2his.eastmoney.com/api';

  /**
   * 获取板块成分股 - 关键修复：建立板块到股票的映射
   */
  async fetchSectorConstituents(sectorCode: string): Promise<string[]> {
    const url = `https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=500&po=1&np=1&fltt=2&invt=2&fid=f12&fs=b:${sectorCode}&fields=f12,f14`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      if (data.data?.diff) {
        const stocks = Object.values(data.data.diff).map((item: any) => item.f12 as string);
        console.log(`[板块成分股] ${sectorCode}: 获取到 ${stocks.length} 只成分股`);
        return stocks;
      }
    } catch (error) {
      console.error(`[板块成分股] 获取失败 ${sectorCode}:`, error);
    }
    
    return []; // 严格返回空数组，禁止mock数据
  }

  /**
   * 获取股票实时行情（严格版本）
   * 失败返回null，禁止任何fallback/mock数据
   */
  async fetchStockQuote(stockCode: string): Promise<StockQuote | null> {
    const secid = stockCode.startsWith('6') ? `1.${stockCode}` : `0.${stockCode}`;
    // 添加更多字段：f3=涨跌幅, f20=市值, f21=成交量, f170=涨跌额, f171=振幅
    // f20日/60日涨跌幅需要从K线数据计算
    const fields = 'f43,f57,f58,f162,f163,f167,f169,f170,f164,f116,f171,f172,f173,f174,f175,f176,f177,f20,f21,f3';
    const url = `${this.EASTMONEY_BASE}/qt/stock/get?secid=${secid}&fields=${fields}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });
      
      if (!response.ok) {
        console.error(`[RealDataFetcher] HTTP错误 ${stockCode}: ${response.status}`);
        return null;
      }
      
      const data = await response.json();
      if (!data.data) return null;
      
      // 获取当日涨跌幅
      const changePercent = this.safeNumber(data.data.f3) / 100;  // f3是涨跌幅*100
      
      // 获取20日/60日涨跌幅（从K线数据计算）
      let twentyDayChange: number | undefined;
      let sixtyDayChange: number | undefined;
      
      try {
        const historicalPrices = await this.fetchHistoricalPrices(stockCode, 60);
        if (historicalPrices && historicalPrices.length >= 20) {
          const currentPrice = this.safeNumber(data.data.f43) / 100;  // f43是当前价*100
          const price20DaysAgo = historicalPrices[historicalPrices.length - 20];
          twentyDayChange = ((currentPrice - price20DaysAgo) / price20DaysAgo) * 100;
          
          if (historicalPrices.length >= 60) {
            const price60DaysAgo = historicalPrices[historicalPrices.length - 60];
            sixtyDayChange = ((currentPrice - price60DaysAgo) / price60DaysAgo) * 100;
          }
        }
      } catch (e) {
        console.warn(`[RealDataFetcher] 获取历史价格失败 ${stockCode}:`, e);
      }
      
      const quote: StockQuote = {
        code: stockCode,
        name: data.data.f57 || '未知',
        currentPrice: this.safeNumber(data.data.f43) / 100,  // f43是当前价*100
        pe: this.safeNumber(data.data.f162),
        peg: this.safeNumber(data.data.f163),
        pb: this.safeNumber(data.data.f167),
        roe: this.safeNumber(data.data.f164),
        profitGrowth: this.safeNumber(data.data.f169),
        revenueGrowth: this.safeNumber(data.data.f170),
        marketCap: this.safeNumber(data.data.f116),
        // 动量相关字段
        changePercent: changePercent,
        twentyDayChange: twentyDayChange,
        sixtyDayChange: sixtyDayChange,
        volume: this.safeNumber(data.data.f21),
        source: 'eastmoney',
        timestamp: new Date().toISOString()
      };
      
      // 严格验证：价格必须>0，否则视为无效数据
      if (quote.currentPrice <= 0) {
        console.error(`[RealDataFetcher] 无效价格数据 ${stockCode}`);
        return null;
      }
      
      return quote;
    } catch (error) {
      console.error(`[RealDataFetcher] 异常 ${stockCode}:`, error);
      return null;
    }
  }

  /**
   * 获取历史K线数据（用于蒙特卡洛计算）
   */
  async fetchHistoricalPrices(stockCode: string, days: number = 120): Promise<number[] | null> {
    const secid = stockCode.startsWith('6') ? `1.${stockCode}` : `0.${stockCode}`;
    const url = `${this.KLINE_BASE}/qt/stock/kline/get?secid=${secid}&klt=101&fqt=1&lmt=${days}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.data?.klines) {
        return data.data.klines.map((kline: string) => {
          const parts = kline.split(',');
          return parseFloat(parts[2]); // 收盘价
        });
      }
    } catch (error) {
      console.error(`[RealDataFetcher] K线获取失败 ${stockCode}:`, error);
    }
    
    return null;
  }

  /**
   * 获取热门板块数据（带完整指标）
   */
  async fetchHotSectors(): Promise<SectorData[]> {
    // f3=涨跌幅, f62=主力净流入, f8=换手率, f20=总市值, f184=RSI
    const url = `${this.EASTMONEY_BASE}/qt/clist/get?pn=1&pz=100&po=1&np=1&fltt=2&invt=2&fid=f62&fs=m:90+t:2&fields=f12,f14,f3,f62,f8,f20,f184`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.data?.diff) {
        return Object.values(data.data.diff).map((sector: any) => ({
          code: sector.f12,
          name: sector.f14,
          changePercent: this.safeNumber(sector.f3),
          mainForceNet: this.safeNumber(sector.f62),
          turnoverRate: this.safeNumber(sector.f8),
          marketValue: this.safeNumber(sector.f20),
          rsi: this.safeRSI(sector.f184), // 使用safeRSI处理RSI字段
          source: 'eastmoney' as DataSource,
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('[RealDataFetcher] 板块数据获取失败:', error);
    }
    
    return [];
  }

  /**
   * 计算技术支撑位（基于真实K线）
   */
  async calculateSupportResistance(stockCode: string): Promise<{support: number, resistance: number, confidence: number} | null> {
    const prices = await this.fetchHistoricalPrices(stockCode, 60);
    if (!prices || prices.length < 20) return null;
    
    const currentPrice = prices[prices.length - 1];
    const ma20 = this.calculateMA(prices, 20);
    const ma60 = this.calculateMA(prices, 60);
    const recentLow = Math.min(...prices.slice(-20));
    const recentHigh = Math.max(...prices.slice(-20));
    
    // 布林带下轨计算
    const bbLower = this.calculateBollingerLower(prices, 20);
    
    // 多方法综合支撑位（取最接近当前价格的）
    const supports = [ma20, ma60, recentLow, bbLower].filter(s => s > 0 && s < currentPrice);
    const resistances = [recentHigh, currentPrice * 1.1].filter(r => r > currentPrice);
    
    if (supports.length === 0 || resistances.length === 0) return null;
    
    const support = Math.max(...supports); // 最强支撑（最高位置的支撑）
    const resistance = Math.min(...resistances);
    
    return {
      support: Math.round(support * 100) / 100,
      resistance: Math.round(resistance * 100) / 100,
      confidence: Math.min(100, supports.length * 25)
    };
  }

  private calculateMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    const recent = prices.slice(-period);
    return recent.reduce((a, b) => a + b, 0) / period;
  }

  private calculateBollingerLower(prices: number[], period: number): number {
    const recent = prices.slice(-period);
    const ma = recent.reduce((a, b) => a + b, 0) / period;
    const variance = recent.reduce((sum, p) => sum + Math.pow(p - ma, 2), 0) / period;
    return ma - (2 * Math.sqrt(variance));
  }

  private safeNumber(val: any, defaultValue: number = 0): number {
    if (val === '-' || val === '' || val === null || val === undefined) return defaultValue;
    const num = Number(val);
    return isNaN(num) ? defaultValue : num;
  }
  
  /**
   * 安全获取RSI值（RSI为0时返回50表示中性）
   */
  private safeRSI(val: any): number {
    const num = this.safeNumber(val, 50);
    // RSI正常范围0-100，如果为0或超出范围，返回50（中性）
    if (num === 0 || num < 0 || num > 100) return 50;
    return num;
  }
}

// 单例导出
export const realDataFetcher = new RealDataFetcher();
