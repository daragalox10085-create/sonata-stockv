/**
 * 验证工具函数
 */

// 默认总股本（1 亿股）
export const DEFAULT_TOTAL_SHARES = 100000000;

/**
 * 验证股票代码格式
 */
export function validateStockSymbolFormat(symbol: string): { valid: boolean; error?: 'format'; message?: string } {
  const trimmed = symbol.trim();
  
  if (!trimmed) {
    return { valid: true };
  }
  
  if (!/^\d{6}$/.test(trimmed)) {
    if (!/^\d+$/.test(trimmed)) {
      return { valid: false, error: 'format', message: '股票代码必须为 6 位数字' };
    }
    return { 
      valid: false, 
      error: 'format', 
      message: trimmed.length < 6 ? '股票代码长度不足 6 位' : '股票代码长度超过 6 位' 
    };
  }
  
  return { valid: true };
}

/**
 * 验证股票代码是否存在
 */
export function validateStockSymbolExists(symbol: string): { valid: boolean; error?: 'invalid'; message?: string; market?: string } {
  const trimmed = symbol.trim();
  
  if (trimmed.length !== 6) {
    return { valid: true };
  }
  
  const prefix = trimmed.substring(0, 3);
  const stockPrefixMap: Record<string, string> = {
    '600': '沪市主板', '601': '沪市主板', '603': '沪市主板', '605': '沪市主板',
    '688': '科创板',
    '000': '深市主板', '001': '深市主板', '002': '深市中小板', '003': '深市主板',
    '300': '创业板', '301': '创业板',
    '510': 'ETF 基金', '511': 'ETF 基金', '512': 'ETF 基金', '513': 'ETF 基金',
    '515': 'ETF 基金', '516': 'ETF 基金', '518': 'ETF 基金', '519': 'ETF 基金',
    '520': 'ETF 基金', '521': 'ETF 基金', '522': 'ETF 基金'
  };
  
  const market = stockPrefixMap[prefix];
  
  if (!market) {
    return { 
      valid: false, 
      error: 'invalid', 
      message: '该股票代码不存在或非 A 股代码',
      market: undefined
    };
  }
  
  return { valid: true, market };
}

/**
 * 完整的股票验证
 */
export function validateStockSymbol(symbol: string): { 
  valid: boolean; 
  errorType?: 'format' | 'invalid'; 
  error?: string; 
  market?: string 
} {
  const formatValidation = validateStockSymbolFormat(symbol);
  if (!formatValidation.valid) {
    return { valid: false, errorType: 'format', error: formatValidation.message || '股票代码必须为 6 位数字' };
  }
  
  const existsValidation = validateStockSymbolExists(symbol);
  if (!existsValidation.valid) {
    return { valid: false, errorType: 'invalid', error: existsValidation.message || '该股票代码不存在或非 A 股代码', market: existsValidation.market };
  }
  
  return { valid: true, market: existsValidation.market };
}

/**
 * 获取有效价格（防止 0 或负数）
 */
export function getValidPrice(price: number | undefined, defaultValue: number, _fieldName?: string): number {
  if (!price || price <= 0 || !isFinite(price)) {
    return defaultValue;
  }
  return price;
}

/**
 * 验证交易价格水平
 */
export function validateTradingLevels(buyPrice: number, stopLoss: number, takeProfit1: number): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  
  if (!buyPrice || buyPrice <= 0) {
    errors.buyPrice = '买入价必须为正数';
  }
  if (!stopLoss || stopLoss <= 0) {
    errors.stopLoss = '止损价必须为正数';
  }
  if (!takeProfit1 || takeProfit1 <= 0) {
    errors.takeProfit1 = '止盈价必须为正数';
  }
  if (buyPrice <= stopLoss) {
    errors.buyPrice = '买入价必须高于止损价';
  }
  if (takeProfit1 <= buyPrice) {
    errors.takeProfit1 = '止盈价必须高于买入价';
  }
  
  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * 验证价格输入
 */
export function validatePriceInput(value: string): { valid: boolean; error?: string } {
  if (!value || value.trim() === '') {
    return { valid: false, error: '请输入价格' };
  }
  const parsed = parseFloat(value);
  if (!isFinite(parsed) || parsed <= 0) {
    return { valid: false, error: '价格必须为正数' };
  }
  return { valid: true };
}
