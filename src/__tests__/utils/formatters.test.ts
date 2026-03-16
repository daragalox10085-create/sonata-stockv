/**
 * 格式化工具函数单元测试
 */
import {
  formatPrice,
  formatMarketCap,
  formatVolume,
  formatPercentWithColor,
  formatPercent,
  formatRiskRewardRatio,
  getRiskRewardRating
} from '../../utils/formatters';

describe('formatters', () => {
  describe('formatPrice', () => {
    it('应正确格式化价格', () => {
      expect(formatPrice(100.5)).toBe('¥100.50');
      expect(formatPrice(0)).toBe('¥0.00');
      expect(formatPrice(9999.99)).toBe('¥9999.99');
    });

    it('应正确处理负数价格', () => {
      expect(formatPrice(-50.25)).toBe('¥-50.25');
    });
  });

  describe('formatMarketCap', () => {
    it('应正确格式化万亿市值', () => {
      expect(formatMarketCap(2500000000000)).toBe('2.50万亿');
      expect(formatMarketCap(1000000000000)).toBe('1.00万亿');
    });

    it('应正确格式化亿市值', () => {
      expect(formatMarketCap(5000000000)).toBe('50.0亿');
      expect(formatMarketCap(100000000)).toBe('1.0亿');
    });

    it('应正确格式化万市值', () => {
      expect(formatMarketCap(5000000)).toBe('500万');
      expect(formatMarketCap(10000)).toBe('1万');
    });

    it('应正确处理小数值', () => {
      expect(formatMarketCap(5000)).toBe('5000');
    });
  });

  describe('formatVolume', () => {
    it('应正确格式化亿级成交量', () => {
      expect(formatVolume(2500000000)).toBe('25.0亿');
      expect(formatVolume(100000000)).toBe('1.0亿');
    });

    it('应正确格式化万级成交量', () => {
      expect(formatVolume(5000000)).toBe('500万');
      expect(formatVolume(10000)).toBe('1万');
    });

    it('应正确处理小成交量', () => {
      expect(formatVolume(5000)).toBe('5000');
    });
  });

  describe('formatPercentWithColor', () => {
    it('应正确格式化正百分比', () => {
      expect(formatPercentWithColor(5.5)).toBe('+5.50%');
      expect(formatPercentWithColor(0)).toBe('+0.00%');
    });

    it('应正确格式化负百分比', () => {
      expect(formatPercentWithColor(-3.25)).toBe('-3.25%');
    });
  });

  describe('formatPercent', () => {
    it('应正确格式化正百分比', () => {
      expect(formatPercent(5.5)).toBe('+5.50%');
    });

    it('应正确格式化负百分比', () => {
      expect(formatPercent(-3.25)).toBe('-3.25%');
    });
  });

  describe('formatRiskRewardRatio', () => {
    it('应正确格式化盈亏比', () => {
      expect(formatRiskRewardRatio(2.5)).toBe('1:2.50');
      expect(formatRiskRewardRatio(1)).toBe('1:1.00');
    });
  });

  describe('getRiskRewardRating', () => {
    it('应返回优秀评级（>=3）', () => {
      const result = getRiskRewardRating(3);
      expect(result.color).toBe('text-green-600');
      expect(result.description).toBe('盈亏比优秀');
    });

    it('应返回良好评级（>=2）', () => {
      const result = getRiskRewardRating(2.5);
      expect(result.color).toBe('text-green-500');
      expect(result.description).toBe('盈亏比良好');
    });

    it('应返回一般评级（>=1）', () => {
      const result = getRiskRewardRating(1.5);
      expect(result.color).toBe('text-yellow-600');
      expect(result.description).toBe('盈亏比一般');
    });

    it('应返回较差评级（<1）', () => {
      const result = getRiskRewardRating(0.5);
      expect(result.color).toBe('text-red-600');
      expect(result.description).toBe('盈亏比较差');
    });
  });
});
