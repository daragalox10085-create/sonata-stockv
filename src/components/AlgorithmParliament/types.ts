// src/components/AlgorithmParliament/types.ts

export interface AlgorithmPrediction {
  algorithmId: string;
  algorithmName: string;
  algorithmDescription: string;
  prediction: 'bullish' | 'bearish' | 'neutral';
  confidence: number; // 0-100
  weight: number; // 0-1, sum to 1
  reasoning: string[];
  historicalAccuracy: {
    last7Days: number;
    last30Days: number;
    last90Days: number;
    stockSpecific: number;
  };
  lastUpdated: string;
}

export interface ConsensusMetrics {
  bullishProbability: number; // 0-100
  bearishProbability: number; // 0-100
  neutralProbability: number; // 0-100
  consensusLevel: 'high' | 'medium' | 'low' | 'conflict';
  consensusScore: number; // 0-100
  algorithmsInAgreement: number;
  totalAlgorithms: number;
}

export interface StockData {
  symbol: string;
  name: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  timestamp: string;
}

export interface AlgorithmParliamentData {
  stock: StockData;
  predictions: AlgorithmPrediction[];
  consensus: ConsensusMetrics;
  timeHorizon: number; // 预测天数
  lastCalculated: string;
}
