/**
 * 验证工具函数单元测试
 */
import {
  validateStockSymbolFormat,
  validateStockSymbolExists,
  validateStockSymbol,
  getValidPrice,
  validateTradingLevels,
  validatePriceInput
} from '../../utils/validators';

describe('validators', () => {
  describe('validateStockSymbolFormat', () => {
    it('应验证空字符串为有效', () => {
      const result = validateStockSymbolFormat('');
      expect(result.valid).toBe(true);
    });

    it('应验证6位数字代码为有效', () => {
      expect(validateStockSymbolFormat('000001').valid).toBe(true);
      expect(validateStockSymbolFormat('600519').valid).toBe(true);
      expect(validateStockSymbolFormat('300750').valid).toBe(true);
    });

    it('应验证非数字代码为无效', () => {
      const result = validateStockSymbolFormat('abc123');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('format');
    });

    it('应验证长度不足6位的代码为无效', () => {
      const result = validateStockSymbolFormat('12345');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('长度不足');
    });

    it('应验证长度超过6位的代码为无效', () => {
      const result = validateStockSymbolFormat('1234567');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('长度超过');
    });
  });

  describe('validateStockSymbolExists', () => {
    it('应验证沪市主板代码为有效', () => {
      const result = validateStockSymbolExists('600519');
      expect(result.valid).toBe(true);
      expect(result.market).toBe('沪市主板');
    });

    it('应验证科创板代码为有效', () => {
      const result = validateStockSymbolExists('688981');
      expect(result.valid).toBe(true);
      expect(result.market).toBe('科创板');
    });

    it('应验证深市主板代码为有效', () => {
      const result = validateStockSymbolExists('000001');
      expect(result.valid).toBe(true);
      expect(result.market).toBe('深市主板');
    });

    it('应验证创业板代码为有效', () => {
      const result = validateStockSymbolExists('300750');
      expect(result.valid).toBe(true);
      expect(result.market).toBe('创业板');
    });

    it('应验证ETF代码为有效', () => {
      const result = validateStockSymbolExists('510300');
      expect(result.valid).toBe(true);
      expect(result.market).toBe('ETF 基金');
    });

    it('应验证无效代码前缀为无效', () => {
      const result = validateStockSymbolExists('999999');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('不存在');
    });

    it('应验证非6位代码为有效（跳过验证）', () => {
      const result = validateStockSymbolExists('12345');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateStockSymbol', () => {
    it('应完整验证有效股票代码', () => {
      const result = validateStockSymbol('600519');
      expect(result.valid).toBe(true);
      expect(result.market).toBe('沪市主板');
    });

    it('应返回格式错误信息', () => {
      const result = validateStockSymbol('abc');
      expect(result.valid).toBe(false);
      expect(result.errorType).toBe('format');
    });

    it('应返回无效错误信息', () => {
      const result = validateStockSymbol('999999');
      expect(result.valid).toBe(false);
      expect(result.errorType).toBe('invalid');
    });
  });

  describe('getValidPrice', () => {
    it('应返回有效价格', () => {
      expect(getValidPrice(100.5, 50)).toBe(100.5);
    });

    it('应在价格为0时返回默认值', () => {
      expect(getValidPrice(0, 50)).toBe(50);
    });

    it('应在价格为负数时返回默认值', () => {
      expect(getValidPrice(-10, 50)).toBe(50);
    });

    it('应在价格为undefined时返回默认值', () => {
      expect(getValidPrice(undefined, 50)).toBe(50);
    });

    it('应在价格为NaN时返回默认值', () => {
      expect(getValidPrice(NaN, 50)).toBe(50);
    });

    it('应在价格为Infinity时返回默认值', () => {
      expect(getValidPrice(Infinity, 50)).toBe(50);
    });
  });

  describe('validateTradingLevels', () => {
    it('应验证有效的交易水平', () => {
      const result = validateTradingLevels(100, 90, 110);
      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('应检测买入价低于止损价', () => {
      const result = validateTradingLevels(90, 100, 110);
      expect(result.valid).toBe(false);
      expect(result.errors.buyPrice).toContain('高于止损价');
    });

    it('应检测止盈价低于买入价', () => {
      const result = validateTradingLevels(100, 90, 95);
      expect(result.valid).toBe(false);
      expect(result.errors.takeProfit1).toContain('高于买入价');
    });

    it('应检测无效价格', () => {
      const result = validateTradingLevels(0, 0, 0);
      expect(result.valid).toBe(false);
      expect(result.errors.buyPrice).toBeDefined();
      expect(result.errors.stopLoss).toBeDefined();
      expect(result.errors.takeProfit1).toBeDefined();
    });
  });

  describe('validatePriceInput', () => {
    it('应验证有效价格输入', () => {
      const result = validatePriceInput('100.5');
      expect(result.valid).toBe(true);
    });

    it('应检测空输入', () => {
      const result = validatePriceInput('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('请输入价格');
    });

    it('应检测非数字输入', () => {
      const result = validatePriceInput('abc');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('价格必须为正数');
    });

    it('应检测负数输入', () => {
      const result = validatePriceInput('-50');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('价格必须为正数');
    });

    it('应检测零输入', () => {
      const result = validatePriceInput('0');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('价格必须为正数');
    });
  });
});
