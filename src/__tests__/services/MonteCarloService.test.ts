/**
 * 蒙特卡洛服务单元测试
 */
import { MonteCarloAnalyzer, MonteCarloSimulator } from '../../services/MonteCarloService';

// 模拟 axios
jest.mock('axios', () => ({
  get: jest.fn()
}));

import axios from 'axios';

describe('MonteCarloService', () => {
  let analyzer: MonteCarloAnalyzer;
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    analyzer = new MonteCarloAnalyzer();
    jest.clearAllMocks();
  });

  describe('MonteCarloAnalyzer', () => {
    describe('analyzeStockWithData', () => {
      it('应使用历史数据进行分析', async () => {
        const currentPrice = 100;
        const historicalPrices = Array.from({ length: 60 }, (_, i) => 
          100 + Math.sin(i / 10) * 10 + (Math.random() - 0.5) * 5
        );

        const result = await analyzer.analyzeStockWithData(currentPrice, historicalPrices);

        expect(result).toBeDefined();
        expect(result.currentPrice).toBe(currentPrice);
        expect(result.scenarios).toHaveLength(3);
        expect(result.scenarios.map(s => s.type)).toContain('乐观');
        expect(result.scenarios.map(s => s.type)).toContain('基准');
        expect(result.scenarios.map(s => s.type)).toContain('悲观');
      });

      it('应处理数据不足的情况', async () => {
        const currentPrice = 100;
        const historicalPrices: number[] = [];

        const result = await analyzer.analyzeStockWithData(currentPrice, historicalPrices);

        expect(result).toBeDefined();
        expect(result.currentPrice).toBe(currentPrice);
        expect(result.technicalIndicators.volatility).toBeGreaterThan(0);
      });

      it('应计算情景概率总和为100%', async () => {
        const currentPrice = 100;
        const historicalPrices = Array.from({ length: 60 }, (_, i) => 
          100 + Math.sin(i / 10) * 10
        );

        const result = await analyzer.analyzeStockWithData(currentPrice, historicalPrices);

        const totalProbability = result.scenarios.reduce((sum, s) => sum + s.probability, 0);
        expect(totalProbability).toBe(100);
      });

      it('应生成合理的上涨概率', async () => {
        const currentPrice = 100;
        const historicalPrices = Array.from({ length: 60 }, (_, i) => 100 + i * 0.5);

        const result = await analyzer.analyzeStockWithData(currentPrice, historicalPrices);

        expect(result.upProbability).toBeGreaterThanOrEqual(0);
        expect(result.upProbability).toBeLessThanOrEqual(100);
        expect(result.downProbability).toBe(100 - result.upProbability);
      });

      it('应生成技术指标', async () => {
        const currentPrice = 100;
        const historicalPrices = Array.from({ length: 60 }, (_, i) => 
          100 + Math.sin(i / 10) * 10
        );

        const result = await analyzer.analyzeStockWithData(currentPrice, historicalPrices);

        expect(result.technicalIndicators.volatility).toBeGreaterThan(0);
        expect(result.technicalIndicators.drift).toBeDefined();
        expect(result.technicalIndicators.sharpeRatio).toBeDefined();
        expect(result.technicalIndicators.maxDrawdown).toBeGreaterThanOrEqual(0);
        expect(result.technicalIndicators.skewness).toBeDefined();
        expect(result.technicalIndicators.kurtosis).toBeDefined();
      });

      it('应生成投资建议', async () => {
        const currentPrice = 100;
        const historicalPrices = Array.from({ length: 60 }, (_, i) => 100 + i * 0.5);

        const result = await analyzer.analyzeStockWithData(currentPrice, historicalPrices);

        expect(result.recommendation.level).toBeDefined();
        expect(['强烈买入', '买入', '持有', '减持', '卖出']).toContain(result.recommendation.level);
        expect(result.recommendation.confidence).toBeGreaterThanOrEqual(0);
        expect(result.recommendation.confidence).toBeLessThanOrEqual(100);
        expect(result.recommendation.stopLoss).toBeGreaterThan(0);
        expect(result.recommendation.takeProfit).toBeGreaterThan(0);
      });

      it('应生成推导步骤', async () => {
        const currentPrice = 100;
        const historicalPrices = Array.from({ length: 60 }, (_, i) => 100);

        const result = await analyzer.analyzeStockWithData(currentPrice, historicalPrices);

        expect(result.derivationSteps).toBeDefined();
        expect(result.derivationSteps.length).toBeGreaterThan(0);
        expect(result.derivationSteps.some(step => step.includes('波动率'))).toBe(true);
      });

      it('应生成验证报告', async () => {
        const currentPrice = 100;
        const historicalPrices = Array.from({ length: 60 }, (_, i) => 100);

        const result = await analyzer.analyzeStockWithData(currentPrice, historicalPrices);

        expect(result.validationReport).toBeDefined();
        expect(result.validationReport.hasIssues).toBeDefined();
        expect(Array.isArray(result.validationReport.issues)).toBe(true);
      });

      it('应包含时间戳', async () => {
        const currentPrice = 100;
        const historicalPrices = Array.from({ length: 60 }, (_, i) => 100);

        const result = await analyzer.analyzeStockWithData(currentPrice, historicalPrices);

        expect(result.timestamp).toBeDefined();
        expect(new Date(result.timestamp).getTime()).toBeLessThanOrEqual(Date.now());
      });
    });

    describe('情景价格区间', () => {
      it('乐观情景价格应高于当前价格', async () => {
        const currentPrice = 100;
        const historicalPrices = Array.from({ length: 60 }, (_, i) => 100);

        const result = await analyzer.analyzeStockWithData(currentPrice, historicalPrices);
        const optimisticScenario = result.scenarios.find(s => s.type === '乐观');

        expect(optimisticScenario).toBeDefined();
        expect(optimisticScenario!.priceRange[0]).toBeGreaterThanOrEqual(currentPrice);
      });

      it('悲观情景价格应低于当前价格', async () => {
        const currentPrice = 100;
        const historicalPrices = Array.from({ length: 60 }, (_, i) => 100);

        const result = await analyzer.analyzeStockWithData(currentPrice, historicalPrices);
        const pessimisticScenario = result.scenarios.find(s => s.type === '悲观');

        expect(pessimisticScenario).toBeDefined();
        expect(pessimisticScenario!.priceRange[1]).toBeLessThanOrEqual(currentPrice);
      });

      it('价格区间应有效（最小值<最大值）', async () => {
        const currentPrice = 100;
        const historicalPrices = Array.from({ length: 60 }, (_, i) => 100);

        const result = await analyzer.analyzeStockWithData(currentPrice, historicalPrices);

        result.scenarios.forEach(scenario => {
          expect(scenario.priceRange[0]).toBeLessThan(scenario.priceRange[1]);
        });
      });
    });
  });

  describe('MonteCarloSimulator', () => {
    it('应运行蒙特卡洛模拟', async () => {
      const simulator = new MonteCarloSimulator();
      const currentPrice = 100;
      const historicalPrices = Array.from({ length: 60 }, (_, i) => 
        100 + Math.sin(i / 10) * 10
      );

      const result = await simulator.runMonteCarlo(currentPrice, historicalPrices);

      expect(result).toBeDefined();
      expect(result!.scenarios).toHaveLength(3);
      expect(result!.upProbability).toBeGreaterThanOrEqual(0);
    });

    it('应在历史数据不足时返回null', async () => {
      const simulator = new MonteCarloSimulator();
      const currentPrice = 100;
      const historicalPrices = Array.from({ length: 10 }, (_, i) => 100);

      const result = await simulator.runMonteCarlo(currentPrice, historicalPrices);

      expect(result).toBeNull();
    });
  });
});
