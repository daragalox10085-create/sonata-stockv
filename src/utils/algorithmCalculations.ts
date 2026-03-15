// src/utils/algorithmCalculations.ts

import { 
  AlgorithmPrediction, 
  ConsensusMetrics,
} from '../components/AlgorithmParliament/types';
import { CONSENSUS_THRESHOLDS, COLOR_SCHEME } from './constants';

/**
 * 计算加权共识概率
 * 科学依据：贝叶斯模型平均
 */
export function calculateConsensus(predictions: AlgorithmPrediction[]): ConsensusMetrics {
  let bullishWeighted = 0;
  let bearishWeighted = 0;
  let neutralWeighted = 0;
  
  let bullishCount = 0;
  let bearishCount = 0;
  let neutralCount = 0;
  
  // 计算加权概率
  predictions.forEach(prediction => {
    const weight = prediction.weight;
    const confidence = prediction.confidence / 100; // 转换为0-1
    
    switch (prediction.prediction) {
      case 'bullish':
        bullishWeighted += weight * confidence;
        bullishCount++;
        break;
      case 'bearish':
        bearishWeighted += weight * confidence;
        bearishCount++;
        break;
      case 'neutral':
        neutralWeighted += weight * confidence;
        neutralCount++;
        break;
    }
  });
  
  // 归一化处理
  const total = bullishWeighted + bearishWeighted + neutralWeighted;
  const bullishProbability = total > 0 ? (bullishWeighted / total) * 100 : 0;
  const bearishProbability = total > 0 ? (bearishWeighted / total) * 100 : 0;
  const neutralProbability = total > 0 ? (neutralWeighted / total) * 100 : 0;
  
  // 计算共识度
  const totalAlgorithms = predictions.length;
  const maxAgreement = Math.max(bullishCount, bearishCount, neutralCount);
  const agreementRatio = maxAgreement / totalAlgorithms;
  
  let consensusLevel: 'high' | 'medium' | 'low' | 'conflict';
  if (agreementRatio >= CONSENSUS_THRESHOLDS.HIGH) {
    consensusLevel = 'high';
  } else if (agreementRatio >= CONSENSUS_THRESHOLDS.MEDIUM) {
    consensusLevel = 'medium';
  } else if (agreementRatio >= CONSENSUS_THRESHOLDS.LOW) {
    consensusLevel = 'low';
  } else {
    consensusLevel = 'conflict';
  }
  
  // 计算共识分数 (考虑权重和置信度)
  const consensusScore = predictions.reduce((score, pred) => {
    const algorithmScore = pred.confidence * pred.weight;
    return score + algorithmScore;
  }, 0);
  
  return {
    bullishProbability: Math.round(bullishProbability),
    bearishProbability: Math.round(bearishProbability),
    neutralProbability: Math.round(neutralProbability),
    consensusLevel,
    consensusScore: Math.round(consensusScore),
    algorithmsInAgreement: maxAgreement,
    totalAlgorithms,
  };
}

/**
 * 获取预测方向对应的颜色
 */
export function getPredictionColor(prediction: 'bullish' | 'bearish' | 'neutral'): string {
  const colorKey = prediction.toUpperCase() as 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  return COLOR_SCHEME[colorKey]?.primary || COLOR_SCHEME.NEUTRAL.primary;
}

/**
 * 格式化置信度显示
 */
export function formatConfidence(confidence: number): string {
  if (confidence >= 80) return '高';
  if (confidence >= 60) return '中';
  return '低';
}

/**
 * 获取共识等级描述
 */
export function getConsensusDescription(level: 'high' | 'medium' | 'low' | 'conflict'): string {
  const descriptions = {
    high: '高度共识',
    medium: '中等共识',
    low: '低度共识',
    conflict: '算法分歧',
  };
  return descriptions[level];
}
