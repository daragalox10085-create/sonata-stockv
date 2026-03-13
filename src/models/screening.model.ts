/**
 * 股票筛选结果模型
 */

import { FactorScores } from './factor.model';

export interface ScreenedStock {
  code: string;
  name: string;
  sector: string;
  compositeScore: number;
  distanceToSupport: number; // 百分比
  upsidePotential: number;   // 百分比
  recommendationLevel: string;
  recommendationText: string;
  factorBreakdown: FactorScores;
  technicalSummary?: string;
  lastUpdated: Date;
}

export interface SupportLevel {
  price: number;
  strength: number;
  type: 'recent_low' | 'ma_support' | 'volume_support' | 'fibonacci' | 'psychological';
  confidence: number;
}

export interface TechnicalAnalysis {
  supportLevels: SupportLevel[];
  resistanceLevels: SupportLevel[];
  trendAnalysis: string;
  momentumIndicators: any;
  volumeAnalysis: any;
  positionAnalysis: any;
}
