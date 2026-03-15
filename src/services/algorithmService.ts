// src/services/algorithmService.ts

import { 
  AlgorithmParliamentData, 
  AlgorithmPrediction,
  StockData,
} from '../components/AlgorithmParliament/types';
import { ALGORITHM_CONFIG, TIME_HORIZONS } from '../utils/constants';
import { calculateConsensus } from '../utils/algorithmCalculations';

// 模拟股票数据
const mockStockData: Record<string, StockData> = {
  '000858': {
    symbol: '000858',
    name: '五粮液',
    currentPrice: 102.95,
    priceChange: 0.68,
    priceChangePercent: 0.66,
    timestamp: new Date().toISOString(),
  },
  '688660': {
    symbol: '688660',
    name: '电气风电',
    currentPrice: 15.32,
    priceChange: 0.42,
    priceChangePercent: 2.82,
    timestamp: new Date().toISOString(),
  },
};

// 主服务函数
export async function fetchAlgorithmPredictions(
  stockSymbol: string,
  timeHorizon: number = TIME_HORIZONS.SHORT_TERM
): Promise<AlgorithmParliamentData> {
  // 模拟API延迟
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // 获取股票数据
  const stockData: StockData = {
    symbol: stockSymbol,
    name: mockStockData[stockSymbol]?.name || stockSymbol,
    currentPrice: mockStockData[stockSymbol]?.currentPrice || 100,
    priceChange: mockStockData[stockSymbol]?.priceChange || 0,
    priceChangePercent: mockStockData[stockSymbol]?.priceChangePercent || 0,
    timestamp: new Date().toISOString(),
  };
  
  // 模拟历史价格数据
  const historicalPrices = Array.from({length: 60}, (_, i) => 
    stockData.currentPrice * (1 + (Math.random() - 0.5) * 0.02 * i)
  );
  
  // 模拟基本面数据
  const fundamentalData = {
    peRatio: 25,
    pbRatio: 4.5,
    psRatio: 8.2,
    revenueGrowth: 0.12,
    profitGrowth: 0.08,
    roeGrowth: 0.05,
    roe: 0.22,
    roa: 0.08,
    debtRatio: 0.35,
  };
  
  // 模拟情绪数据
  const sentimentData = {
    newsSentiment: 0.62 + Math.random() * 0.1,
    socialSentiment: 0.58 + Math.random() * 0.1,
    institutionalFlow: (Math.random() - 0.5) * 10000000,
    retailFlow: (Math.random() - 0.3) * 5000000,
  };
  
  // 生成各算法预测
  const predictions: AlgorithmPrediction[] = [
    {
      algorithmId: ALGORITHM_CONFIG.LSTM.id,
      algorithmName: ALGORITHM_CONFIG.LSTM.name,
      algorithmDescription: ALGORITHM_CONFIG.LSTM.description,
      prediction: Math.random() > 0.5 ? 'bullish' : 'bearish',
      confidence: 65 + Math.floor(Math.random() * 20),
      weight: ALGORITHM_CONFIG.LSTM.defaultWeight,
      reasoning: [
        'RSI指标: 45.2 (中性)',
        'MACD状态: 多头排列',
        '量价关系: 量增价稳',
        `识别到${timeHorizon}天周期内的趋势延续信号`,
      ],
      historicalAccuracy: {
        last7Days: 71,
        last30Days: 68,
        last90Days: 66,
        stockSpecific: 72,
      },
      lastUpdated: new Date().toISOString(),
    },
    {
      algorithmId: ALGORITHM_CONFIG.XGBOOST.id,
      algorithmName: ALGORITHM_CONFIG.XGBOOST.name,
      algorithmDescription: ALGORITHM_CONFIG.XGBOOST.description,
      prediction: Math.random() > 0.5 ? 'bullish' : 'neutral',
      confidence: 60 + Math.floor(Math.random() * 25),
      weight: ALGORITHM_CONFIG.XGBOOST.defaultWeight,
      reasoning: [
        `估值评分: ${fundamentalData.peRatio}/100 (合理)`,
        `成长评分: ${(fundamentalData.revenueGrowth * 100).toFixed(0)}/100 (良好)`,
        `质量评分: ${(fundamentalData.roe * 100).toFixed(0)}/100 (优质)`,
        `动量评分: 65/100 (强势)`,
      ],
      historicalAccuracy: {
        last7Days: 65,
        last30Days: 65,
        last90Days: 63,
        stockSpecific: 68,
      },
      lastUpdated: new Date().toISOString(),
    },
    {
      algorithmId: ALGORITHM_CONFIG.TIME_SERIES.id,
      algorithmName: ALGORITHM_CONFIG.TIME_SERIES.name,
      algorithmDescription: ALGORITHM_CONFIG.TIME_SERIES.description,
      prediction: Math.random() > 0.6 ? 'bullish' : 'neutral',
      confidence: 62 + Math.floor(Math.random() * 20),
      weight: ALGORITHM_CONFIG.TIME_SERIES.defaultWeight,
      reasoning: [
        '平均日收益率: 0.052%',
        '历史波动率: 1.85%',
        '预测波动率: 2.12%',
        '分布特征: 偏度-0.15 峰度3.25',
      ],
      historicalAccuracy: {
        last7Days: 58,
        last30Days: 62,
        last90Days: 61,
        stockSpecific: 65,
      },
      lastUpdated: new Date().toISOString(),
    },
    {
      algorithmId: ALGORITHM_CONFIG.MARKET_SENTIMENT.id,
      algorithmName: ALGORITHM_CONFIG.MARKET_SENTIMENT.name,
      algorithmDescription: ALGORITHM_CONFIG.MARKET_SENTIMENT.description,
      prediction: sentimentData.newsSentiment > 0.5 ? 'bullish' : 'bearish',
      confidence: 55 + Math.floor(Math.random() * 20),
      weight: ALGORITHM_CONFIG.MARKET_SENTIMENT.defaultWeight,
      reasoning: [
        `新闻情感指数: ${(sentimentData.newsSentiment * 100).toFixed(0)}/100`,
        `社交情绪指数: ${(sentimentData.socialSentiment * 100).toFixed(0)}/100`,
        `机构资金流向: ${sentimentData.institutionalFlow > 0 ? '净流入' : '净流出'}`,
        `散户资金流向: ${sentimentData.retailFlow > 0 ? '净流入' : '净流出'}`,
      ],
      historicalAccuracy: {
        last7Days: 52,
        last30Days: 58,
        last90Days: 57,
        stockSpecific: 60,
      },
      lastUpdated: new Date().toISOString(),
    },
  ];
  
  // 计算共识
  const consensus = calculateConsensus(predictions);
  
  return {
    stock: stockData,
    predictions,
    consensus,
    timeHorizon,
    lastCalculated: new Date().toISOString(),
  };
}
