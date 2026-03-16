/**
 * 算法计算工具函数单元测试
 */
import {
  calculateConsensus,
  getPredictionColor,
  formatConfidence,
  getConsensusDescription
} from '../../utils/algorithmCalculations';
import { AlgorithmPrediction } from '../../components/AlgorithmParliament/types';
import { COLOR_SCHEME } from '../../utils/constants';

describe('algorithmCalculations', () => {
  describe('calculateConsensus', () => {
    const createPrediction = (
      prediction: 'bullish' | 'bearish' | 'neutral',
      confidence: number,
      weight: number
    ): AlgorithmPrediction => ({
      id: 'test',
      name: 'Test Algorithm',
      prediction,
      confidence,
      weight,
      reasoning: 'Test reasoning',
      accuracy: 0.8,
      recentPerformance: { last30Days: 0.8, last90Days: 0.75 }
    });

    it('应计算看涨共识', () => {
      const predictions: AlgorithmPrediction[] = [
        createPrediction('bullish', 80, 0.4),
        createPrediction('bullish', 70, 0.3),
        createPrediction('neutral', 60, 0.3)
      ];

      const result = calculateConsensus(predictions);
      expect(result.bullishProbability).toBeGreaterThan(50);
      expect(result.consensusLevel).toBe('high');
    });

    it('应计算看跌共识', () => {
      const predictions: AlgorithmPrediction[] = [
        createPrediction('bearish', 80, 0.4),
        createPrediction('bearish', 70, 0.3),
        createPrediction('neutral', 60, 0.3)
      ];

      const result = calculateConsensus(predictions);
      expect(result.bearishProbability).toBeGreaterThan(50);
    });

    it('应计算中性共识', () => {
      const predictions: AlgorithmPrediction[] = [
        createPrediction('neutral', 80, 0.5),
        createPrediction('bullish', 60, 0.25),
        createPrediction('bearish', 60, 0.25)
      ];

      const result = calculateConsensus(predictions);
      expect(result.neutralProbability).toBeGreaterThan(30);
    });

    it('应检测算法分歧', () => {
      const predictions: AlgorithmPrediction[] = [
        createPrediction('bullish', 80, 0.33),
        createPrediction('bearish', 80, 0.33),
        createPrediction('neutral', 80, 0.34)
      ];

      const result = calculateConsensus(predictions);
      expect(result.consensusLevel).toBe('conflict');
    });

    it('应处理空预测数组', () => {
      const result = calculateConsensus([]);
      expect(result.bullishProbability).toBe(0);
      expect(result.bearishProbability).toBe(0);
      expect(result.neutralProbability).toBe(0);
    });

    it('应正确计算算法数量', () => {
      const predictions: AlgorithmPrediction[] = [
        createPrediction('bullish', 80, 0.5),
        createPrediction('bullish', 70, 0.5)
      ];

      const result = calculateConsensus(predictions);
      expect(result.totalAlgorithms).toBe(2);
      expect(result.algorithmsInAgreement).toBe(2);
    });
  });

  describe('getPredictionColor', () => {
    it('应返回看涨颜色', () => {
      const color = getPredictionColor('bullish');
      expect(color).toBe(COLOR_SCHEME.BULLISH.primary);
    });

    it('应返回看跌颜色', () => {
      const color = getPredictionColor('bearish');
      expect(color).toBe(COLOR_SCHEME.BEARISH.primary);
    });

    it('应返回中性颜色', () => {
      const color = getPredictionColor('neutral');
      expect(color).toBe(COLOR_SCHEME.NEUTRAL.primary);
    });
  });

  describe('formatConfidence', () => {
    it('应格式化高置信度', () => {
      expect(formatConfidence(85)).toBe('高');
      expect(formatConfidence(80)).toBe('高');
    });

    it('应格式化中等置信度', () => {
      expect(formatConfidence(79)).toBe('中');
      expect(formatConfidence(60)).toBe('中');
    });

    it('应格式化低置信度', () => {
      expect(formatConfidence(59)).toBe('低');
      expect(formatConfidence(30)).toBe('低');
    });
  });

  describe('getConsensusDescription', () => {
    it('应返回高度共识描述', () => {
      expect(getConsensusDescription('high')).toBe('高度共识');
    });

    it('应返回中等共识描述', () => {
      expect(getConsensusDescription('medium')).toBe('中等共识');
    });

    it('应返回低度共识描述', () => {
      expect(getConsensusDescription('low')).toBe('低度共识');
    });

    it('应返回算法分歧描述', () => {
      expect(getConsensusDescription('conflict')).toBe('算法分歧');
    });
  });
});
