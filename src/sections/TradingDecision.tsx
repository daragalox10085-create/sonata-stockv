import { useState, useEffect, useCallback } from 'react';
import { StockData } from '../contexts/StockContext';
import { validatePriceInput, getValidPrice, validateTradingLevels } from '../utils/validators';
import { formatPrice, formatRiskRewardRatio, getRiskRewardRating } from '../utils/formatters';
import { TRADING_RATIO_CONFIG, getStorageKey } from '../constants/config';

interface TradingDecisionProps {
  data: StockData;
}

interface UserCustomLevels {
  buyPrice: string;
  stopLoss: string;
  takeProfit1: string;
  takeProfit2: string;
}

export default function TradingDecision({ data }: TradingDecisionProps) {
  // 状态管理
  const [isManualEdit, setIsManualEdit] = useState(false);
  const [useCustomLevels, setUseCustomLevels] = useState(false);
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [inputErrors, setInputErrors] = useState<Partial<Record<keyof UserCustomLevels, string>>>({});
  const [inputValueErrors, setInputValueErrors] = useState<Partial<Record<keyof UserCustomLevels, string>>>({});
  const [showDerivation, setShowDerivation] = useState(false);

  // 计算默认价格水平（基于当前价格）
  const getDefaultLevels = useCallback(() => {
    const currentPrice = data.currentPrice || 0;
    return {
      buyPrice: currentPrice > 0 ? (currentPrice * TRADING_RATIO_CONFIG.DEFAULT_BUY_RATIO).toFixed(2) : '0.00',
      stopLoss: currentPrice > 0 ? (currentPrice * TRADING_RATIO_CONFIG.DEFAULT_STOP_LOSS_RATIO).toFixed(2) : '0.00',
      takeProfit1: currentPrice > 0 ? (currentPrice * TRADING_RATIO_CONFIG.DEFAULT_TAKE_PROFIT_1_RATIO).toFixed(2) : '0.00',
      takeProfit2: currentPrice > 0 ? (currentPrice * TRADING_RATIO_CONFIG.DEFAULT_TAKE_PROFIT_2_RATIO).toFixed(2) : '0.00',
    };
  }, [data.currentPrice]);

  const [customLevels, setCustomLevels] = useState<UserCustomLevels>(getDefaultLevels());

  // 从 localStorage 加载用户自定义设置
  useEffect(() => {
    const saved = localStorage.getItem(getStorageKey(data.symbol));
    const defaultLevels = getDefaultLevels();
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const buyPrice = (parsed.buyPrice > 0 ? parsed.buyPrice : parseFloat(defaultLevels.buyPrice)).toFixed(2);
        const stopLoss = (parsed.stopLoss > 0 ? parsed.stopLoss : parseFloat(defaultLevels.stopLoss)).toFixed(2);
        const takeProfit1 = (parsed.takeProfit1 > 0 ? parsed.takeProfit1 : parseFloat(defaultLevels.takeProfit1)).toFixed(2);
        const takeProfit2 = (parsed.takeProfit2 > 0 ? parsed.takeProfit2 : parseFloat(defaultLevels.takeProfit2)).toFixed(2);
        
        setCustomLevels({ buyPrice, stopLoss, takeProfit1, takeProfit2 });
        setUseCustomLevels(true);
      } catch (e) {
        console.error('Failed to load saved levels:', e);
        setCustomLevels({
          buyPrice: defaultLevels.buyPrice,
          stopLoss: defaultLevels.stopLoss,
          takeProfit1: defaultLevels.takeProfit1,
          takeProfit2: defaultLevels.takeProfit2,
        });
        setUseCustomLevels(false);
      }
    } else {
      setCustomLevels({
        buyPrice: (data.support > 0 ? data.support : parseFloat(defaultLevels.buyPrice)).toFixed(2),
        stopLoss: (data.stopLoss > 0 ? data.stopLoss : parseFloat(defaultLevels.stopLoss)).toFixed(2),
        takeProfit1: (data.takeProfit1 > 0 ? data.takeProfit1 : parseFloat(defaultLevels.takeProfit1)).toFixed(2),
        takeProfit2: (data.takeProfit2 > 0 ? data.takeProfit2 : parseFloat(defaultLevels.takeProfit2)).toFixed(2),
      });
      setUseCustomLevels(false);
    }
  }, [data.symbol, data.support, data.stopLoss, data.takeProfit1, data.takeProfit2, getDefaultLevels]);

  // 保存用户自定义设置到 localStorage
  const saveCustomLevels = useCallback(() => {
    const levelsToSave = {
      buyPrice: parseFloat(customLevels.buyPrice),
      stopLoss: parseFloat(customLevels.stopLoss),
      takeProfit1: parseFloat(customLevels.takeProfit1),
      takeProfit2: parseFloat(customLevels.takeProfit2),
    };
    localStorage.setItem(getStorageKey(data.symbol), JSON.stringify(levelsToSave));
  }, [customLevels, data.symbol]);

  // 检查所有输入是否有效
  const allInputsValid = useCallback((): boolean => {
    const fields: (keyof UserCustomLevels)[] = ['buyPrice', 'stopLoss', 'takeProfit1', 'takeProfit2'];
    return fields.every(field => {
      const validation = validatePriceInput(customLevels[field]);
      return validation.valid;
    });
  }, [customLevels]);

  // 确认并计算
  const confirmAndCalculate = useCallback(() => {
    const errors: Partial<Record<keyof UserCustomLevels, string>> = {};
    const valueErrors: Partial<Record<keyof UserCustomLevels, string>> = {};
    let hasError = false;
    
    const fields: (keyof UserCustomLevels)[] = ['buyPrice', 'stopLoss', 'takeProfit1', 'takeProfit2'];
    fields.forEach(field => {
      const validation = validatePriceInput(customLevels[field]);
      if (!validation.valid) {
        errors[field] = validation.error || '输入无效';
        valueErrors[field] = validation.error || '输入无效';
        hasError = true;
      }
    });
    
    if (hasError) {
      setInputErrors(errors);
      setInputValueErrors(valueErrors);
      return;
    }
    
    const buyPrice = parseFloat(customLevels.buyPrice);
    const stopLoss = parseFloat(customLevels.stopLoss);
    const takeProfit1 = parseFloat(customLevels.takeProfit1);
    
    const validation = validateTradingLevels(buyPrice, stopLoss, takeProfit1);
    if (!validation.valid) {
      setInputErrors(validation.errors);
      setInputValueErrors(validation.errors);
      return;
    }
    
    setInputErrors({});
    setInputValueErrors({});
    setUseCustomLevels(true);
    saveCustomLevels();
    
    setShowUpdateNotification(true);
    setTimeout(() => setShowUpdateNotification(false), 3000);
  }, [customLevels, saveCustomLevels]);

  // 重置为系统推荐
  const resetToSystem = useCallback(() => {
    const defaultLevels = getDefaultLevels();
    setCustomLevels({
      buyPrice: (data.support > 0 ? data.support : parseFloat(defaultLevels.buyPrice)).toFixed(2),
      stopLoss: (data.stopLoss > 0 ? data.stopLoss : parseFloat(defaultLevels.stopLoss)).toFixed(2),
      takeProfit1: (data.takeProfit1 > 0 ? data.takeProfit1 : parseFloat(defaultLevels.takeProfit1)).toFixed(2),
      takeProfit2: (data.takeProfit2 > 0 ? data.takeProfit2 : parseFloat(defaultLevels.takeProfit2)).toFixed(2),
    });
    setUseCustomLevels(false);
    setInputErrors({});
    setInputValueErrors({});
  }, [data.support, data.stopLoss, data.takeProfit1, data.takeProfit2, getDefaultLevels]);

  // 处理输入变化
  const handleInputChange = (field: keyof UserCustomLevels, value: string) => {
    const filteredValue = value.replace(/[^\d.]/g, '');
    const parts = filteredValue.split('.');
    const cleanedValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : filteredValue;
    
    if (inputErrors[field] || inputValueErrors[field]) {
      setInputErrors(prev => ({ ...prev, [field]: undefined }));
      setInputValueErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    setCustomLevels(prev => ({ ...prev, [field]: cleanedValue }));
  };

  // 获取显示的价格
  const displayLevels = useCustomLevels 
    ? {
        buyPrice: getValidPrice(parseFloat(customLevels.buyPrice), data.support, 'buyPrice'),
        stopLoss: getValidPrice(parseFloat(customLevels.stopLoss), data.stopLoss, 'stopLoss'),
        takeProfit1: getValidPrice(parseFloat(customLevels.takeProfit1), data.takeProfit1, 'takeProfit1'),
        takeProfit2: getValidPrice(parseFloat(customLevels.takeProfit2), data.takeProfit2, 'takeProfit2'),
      }
    : {
        buyPrice: getValidPrice(data.support, parseFloat(getDefaultLevels().buyPrice), 'buyPrice'),
        stopLoss: getValidPrice(data.stopLoss, parseFloat(getDefaultLevels().stopLoss), 'stopLoss'),
        takeProfit1: getValidPrice(data.takeProfit1, parseFloat(getDefaultLevels().takeProfit1), 'takeProfit1'),
        takeProfit2: getValidPrice(data.takeProfit2, parseFloat(getDefaultLevels().takeProfit2), 'takeProfit2'),
      };

  // 计算盈亏比
  const calculateRiskRewardRatio = (): string => {
    const currentPrice = data.currentPrice || 10;
    const defaultBuy = currentPrice * TRADING_RATIO_CONFIG.DEFAULT_BUY_RATIO;
    const defaultStop = currentPrice * TRADING_RATIO_CONFIG.DEFAULT_STOP_LOSS_RATIO;
    const defaultTake = currentPrice * TRADING_RATIO_CONFIG.DEFAULT_TAKE_PROFIT_1_RATIO;

    const getSafePrice = (customValue: string, dataValue: number, defaultValue: number): number => {
      if (useCustomLevels && customValue) {
        const parsed = parseFloat(customValue);
        if (isFinite(parsed) && parsed > 0) return parsed;
      }
      if (isFinite(dataValue) && dataValue > 0) return dataValue;
      return defaultValue;
    };

    const buyPrice = getSafePrice(customLevels.buyPrice, data.support, defaultBuy);
    const stopLoss = getSafePrice(customLevels.stopLoss, data.stopLoss, defaultStop);
    const takeProfit = getSafePrice(customLevels.takeProfit1, data.takeProfit1, defaultTake);
    
    if (!isFinite(buyPrice) || !isFinite(stopLoss) || !isFinite(takeProfit)) return '无效';
    if (buyPrice <= 0 || stopLoss <= 0 || takeProfit <= 0) return '无效';
    if (buyPrice <= stopLoss || takeProfit <= buyPrice) return '无效';
    
    const ratio = (takeProfit - buyPrice) / (buyPrice - stopLoss);
    return isFinite(ratio) ? ratio.toFixed(2) : '无效';
  };
  
  const riskRewardRatio = calculateRiskRewardRatio();
  const riskRewardRating = getRiskRewardRating(parseFloat(riskRewardRatio));

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6 shadow-sm">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900">🎯 五维决策引擎</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsManualEdit(!isManualEdit)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isManualEdit ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {isManualEdit ? '✓ 编辑中' : '✏️ 手动编辑'}
            </button>
            <button
              onClick={() => setShowDerivation(!showDerivation)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                showDerivation ? 'bg-purple-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {showDerivation ? '📐 已展开' : '📐 查看推导'}
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-600 leading-6">💡 五维：趋势 + 位置 + 盈亏比 + 动量 + 情绪</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {/* 买入价 - 优化间距 */}
        <div className={`rounded-xl p-5 transition-all border-2 ${
          isManualEdit ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-100'
        }`}>
          <div className="text-sm text-gray-600 mb-3 font-medium">💡 建议买入价</div>
          {isManualEdit ? (
            <div>
              <input
                type="text"
                inputMode="decimal"
                value={customLevels.buyPrice}
                onChange={(e) => handleInputChange('buyPrice', e.target.value)}
                placeholder="0.00"
                className={`w-full text-xl font-bold text-blue-600 bg-white rounded-lg px-3 py-2.5 border focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors ${
                  inputErrors.buyPrice ? 'border-red-500 bg-red-50' : 'border-gray-200'
                }`}
              />
              {inputErrors.buyPrice && (
                <div className="text-xs text-red-600 mt-2 flex items-center gap-1">
                  <span>⚠️</span>
                  <span>{inputErrors.buyPrice}</span>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2 items-center">
                <button onClick={resetToSystem} className="px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
                  🔄 重置
                </button>
                <button
                  onClick={confirmAndCalculate}
                  disabled={!allInputsValid()}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    allInputsValid() ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-300 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  ✓ 确认并计算
                </button>
                {showUpdateNotification && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">✓ 已更新</span>
                )}
                {useCustomLevels && !showUpdateNotification && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">✓ 已加载自定义</span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-2xl font-bold text-blue-600 mb-2">{formatPrice(displayLevels.buyPrice)}</div>
          )}
          <div className="text-sm text-gray-500 mt-2 leading-6">
            {isManualEdit ? '输入价格后确认' : '支撑位附近建仓'}
          </div>
        </div>

        {/* 止损位 - 优化间距 */}
        <div className={`rounded-xl p-5 transition-all border-2 ${
          isManualEdit ? 'bg-red-50 border-red-500' : 'bg-gray-50 border-gray-100'
        }`}>
          <div className="text-sm text-gray-600 mb-3 font-medium">🛑 止损位</div>
          {isManualEdit ? (
            <div>
              <input
                type="text"
                inputMode="decimal"
                value={customLevels.stopLoss}
                onChange={(e) => handleInputChange('stopLoss', e.target.value)}
                placeholder="0.00"
                className={`w-full text-xl font-bold text-red-600 bg-white rounded-lg px-3 py-2.5 border focus:outline-none focus:ring-2 focus:ring-red-200 transition-colors ${
                  inputErrors.stopLoss ? 'border-red-500 bg-red-50' : 'border-gray-200'
                }`}
              />
              {inputErrors.stopLoss && (
                <div className="text-xs text-red-600 mt-2 flex items-center gap-1">
                  <span>⚠️</span>
                  <span>{inputErrors.stopLoss}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-2xl font-bold text-red-600 mb-2">{formatPrice(displayLevels.stopLoss)}</div>
          )}
          <div className="text-sm text-gray-500 mt-2 leading-6">
            {isManualEdit ? '点击编辑价格' : (() => {
              const currentPrice = data.currentPrice || 0;
              const stopLoss = displayLevels.stopLoss || 0;
              if (currentPrice > 0 && stopLoss > 0 && stopLoss < currentPrice) {
                const dropPercent = ((1 - stopLoss / currentPrice) * 100);
                const validPercent = Math.max(0, Math.min(50, dropPercent));
                return `跌破${validPercent.toFixed(1)}% 止损`;
              }
              return '止损位待设置';
            })()}
          </div>
        </div>

        {/* 止盈位 - 优化间距 */}
        <div className={`rounded-xl p-5 transition-all border-2 ${
          isManualEdit ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-100'
        }`}>
          <div className="text-sm text-gray-600 mb-3 font-medium">🎯 止盈目标</div>
          {isManualEdit ? (
            <div className="space-y-3">
              <div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={customLevels.takeProfit1}
                  onChange={(e) => handleInputChange('takeProfit1', e.target.value)}
                  placeholder="第一目标"
                  className={`w-full text-lg font-bold text-green-600 bg-white rounded-lg px-3 py-2.5 border focus:outline-none focus:ring-2 focus:ring-green-200 transition-colors ${
                    inputErrors.takeProfit1 ? 'border-red-500 bg-red-50' : 'border-gray-200'
                  }`}
                />
                {inputErrors.takeProfit1 && (
                  <div className="text-xs text-red-600 mt-2 flex items-center gap-1">
                    <span>⚠️</span>
                    <span>{inputErrors.takeProfit1}</span>
                  </div>
                )}
              </div>
              <div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={customLevels.takeProfit2}
                  onChange={(e) => handleInputChange('takeProfit2', e.target.value)}
                  placeholder="第二目标"
                  className={`w-full text-lg font-bold text-green-600 bg-white rounded-lg px-3 py-2.5 border focus:outline-none focus:ring-2 focus:ring-green-200 transition-colors ${
                    inputErrors.takeProfit2 ? 'border-red-500 bg-red-50' : 'border-gray-200'
                  }`}
                />
                {inputErrors.takeProfit2 && (
                  <div className="text-xs text-red-600 mt-2 flex items-center gap-1">
                    <span>⚠️</span>
                    <span>{inputErrors.takeProfit2}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-lg font-bold text-green-600 mb-2">
              {formatPrice(displayLevels.takeProfit1)} / {formatPrice(displayLevels.takeProfit2)}
            </div>
          )}
          {!isManualEdit && (
            <div className="text-sm text-gray-500 mt-2 leading-6">
              {(() => {
                const currentPrice = data.currentPrice || 0;
                const takeProfit1 = displayLevels.takeProfit1 || 0;
                const takeProfit2 = displayLevels.takeProfit2 || 0;
                if (currentPrice > 0 && takeProfit1 > 0 && takeProfit2 > 0) {
                  const gain1 = ((takeProfit1 / currentPrice - 1) * 100);
                  const gain2 = ((takeProfit2 / currentPrice - 1) * 100);
                  const validGain1 = Math.max(-50, Math.min(200, gain1));
                  const validGain2 = Math.max(-50, Math.min(200, gain2));
                  return `第一目标 +${validGain1.toFixed(1)}% / 第二目标 +${validGain2.toFixed(1)}%`;
                }
                return '止盈目标待设置';
              })()}
            </div>
          )}
        </div>
      </div>

      {/* 盈亏比 */}
      <div className="mt-4 bg-bg-surface rounded p-4 border border-border-light">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-text-secondary mb-1">⚖️ 盈亏比</div>
            <div className={`text-lg font-bold ${riskRewardRatio === '无效' ? 'text-danger' : 'text-primary'}`}>
              {formatRiskRewardRatio(parseFloat(riskRewardRatio))}
            </div>
            {riskRewardRatio === '无效' && (
              <div className="text-xs text-red-600 mt-1">请确保：止盈 &gt; 买入价 &gt; 止损</div>
            )}
            {riskRewardRatio !== '无效' && (
              <div className={`text-xs mt-1 ${riskRewardRating.color}`}>{riskRewardRating.description}</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm text-text-secondary mb-1">📊 量化评分</div>
            <div className={`text-lg font-bold ${data.quantScore >= 60 ? 'text-green-600' : 'text-red-600'}`}>
              {data.quantScore}/100
            </div>
          </div>
        </div>
      </div>

      {/* 风险提示 */}
      <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded p-3">
        <div className="flex items-start gap-2">
          <span className="text-base">⚠️</span>
          <div className="text-xs text-warning">
            <strong>风险提示：</strong>
            以上分析仅供参考，不构成投资建议。股市有风险，投资需谨慎。建议仓位控制在总资金的 20% 以内。
          </div>
        </div>
      </div>
    </div>
  );
}
