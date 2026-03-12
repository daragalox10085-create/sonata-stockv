/**
 * PositionAnalysis V2.2 - 持仓/买入分析（确定按钮版）
 */

import { useState, useMemo } from 'react';
import { StockData } from '../contexts/StockContext';

interface PositionAnalysisProps {
  data: StockData;
}

export default function PositionAnalysis({ data }: PositionAnalysisProps) {
  const [isExpanded, setIsExpanded] = useState(true); // 默认展开
  const [costPrice, setCostPrice] = useState('');
  const [shares, setShares] = useState('');
  const [activeTab, setActiveTab] = useState<'position' | 'buy'>('buy'); // 默认买入分析
  const [showAnalysis, setShowAnalysis] = useState(true); // 默认显示分析

  const currentPrice = data.currentPrice || 0;
  const stopLoss = data.stopLoss || 0;
  const takeProfit1 = data.takeProfit1 || 0;
  const support = data.support || 0;
  const resistance = data.resistance || 0;
  
  const cost = parseFloat(costPrice);
  const shareCount = parseFloat(shares);

  // 持仓分析
  const positionAnalysis = useMemo(() => {
    if (!cost || !shareCount || !currentPrice) return null;
    const totalCost = cost * shareCount;
    const marketValue = currentPrice * shareCount;
    const pnl = marketValue - totalCost;
    const pnlPercent = (pnl / totalCost) * 100;
    
    let suggestion = { action: '', detail: '', color: '' };
    if (pnlPercent >= 10) {
      suggestion = { action: '分批止盈', detail: `盈利 ${pnlPercent.toFixed(1)}%，建议减仓锁定利润`, color: 'green' };
    } else if (pnlPercent >= 5) {
      suggestion = { action: '持有待涨', detail: `盈利 ${pnlPercent.toFixed(1)}%，趋势向好`, color: 'blue' };
    } else if (pnlPercent >= -3) {
      suggestion = { action: '持有观望', detail: '成本附近，等待方向明确', color: 'gray' };
    } else if (pnlPercent >= -8) {
      suggestion = { action: '谨慎持有', detail: `浮亏 ${Math.abs(pnlPercent).toFixed(1)}%，观察支撑位表现`, color: 'yellow' };
    } else {
      suggestion = { action: '严格止损', detail: `浮亏 ${Math.abs(pnlPercent).toFixed(1)}%，建议执行止损`, color: 'red' };
    }

    return { totalCost, marketValue, pnl, pnlPercent, suggestion };
  }, [cost, shareCount, currentPrice]);

  // 买入分析 - 专注于执行层面的计算
  const buyAnalysis = useMemo(() => {
    if (!currentPrice) return null;
    const riskAmount = currentPrice - stopLoss;
    const rewardAmount = takeProfit1 - currentPrice;
    const ratio = riskAmount > 0 ? rewardAmount / riskAmount : 0;
    
    // 计算入场区间
    const entryLow = support;
    const entryHigh = Math.min(currentPrice, support * 1.02);
    
    // 计算分批建仓计划
    const firstBatch = currentPrice <= support * 1.01 ? '50%' : '30%';
    const secondBatch = currentPrice <= support * 1.01 ? '50%' : '70%';
    
    return { 
      riskAmount, 
      rewardAmount, 
      ratio, 
      entryLow, 
      entryHigh,
      firstBatch,
      secondBatch
    };
  }, [currentPrice, stopLoss, takeProfit1, support]);

  const handleConfirm = () => {
    if (activeTab === 'position' && cost && shareCount) {
      setShowAnalysis(true);
    } else if (activeTab === 'buy') {
      setShowAnalysis(true);
    }
  };

  const handleReset = () => {
    setCostPrice('');
    setShares('');
    setShowAnalysis(false);
  };

  return (
    <div className="bg-slate-50 rounded-lg overflow-hidden">
      {/* 折叠头部 */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">持仓/买入分析</span>
          {showAnalysis && positionAnalysis && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              positionAnalysis.pnlPercent >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {positionAnalysis.pnlPercent >= 0 ? '+' : ''}{positionAnalysis.pnlPercent.toFixed(1)}%
            </span>
          )}
        </div>
        <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 展开内容 */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-200">
          {/* Tab 切换 */}
          <div className="flex gap-1 mt-3 mb-3">
            <button
              onClick={() => { setActiveTab('position'); setShowAnalysis(true); }}
              className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
                activeTab === 'position' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
            >
              持仓分析
            </button>
            <button
              onClick={() => { setActiveTab('buy'); setShowAnalysis(true); }}
              className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
                activeTab === 'buy' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
            >
              现价买入分析
            </button>
          </div>

          {activeTab === 'position' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">成本价</label>
                  <input
                    type="number"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="¥"
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm focus:outline-none focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">持股数量</label>
                  <input
                    type="number"
                    value={shares}
                    onChange={(e) => setShares(e.target.value)}
                    placeholder="股"
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm focus:outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              {/* 分析结果 - 持仓分析需要输入后才显示 */}
              {showAnalysis && positionAnalysis && cost && shareCount && (
                <div className="space-y-2 mt-3 pt-3 border-t border-slate-200">
                  <div className={`p-2 rounded ${positionAnalysis.pnlPercent >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">盈亏</span>
                      <span className={`font-medium ${positionAnalysis.pnlPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {positionAnalysis.pnlPercent >= 0 ? '+' : ''}¥{positionAnalysis.pnl.toFixed(0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-slate-400">比例</span>
                      <span className={positionAnalysis.pnlPercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {positionAnalysis.pnlPercent >= 0 ? '+' : ''}{positionAnalysis.pnlPercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <div className={`p-2 rounded text-xs ${
                    positionAnalysis.suggestion.color === 'green' ? 'bg-green-100 text-green-800' :
                    positionAnalysis.suggestion.color === 'red' ? 'bg-red-100 text-red-800' :
                    positionAnalysis.suggestion.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    <span className="font-medium">{positionAnalysis.suggestion.action}</span>
                    <p className="mt-1 text-slate-600">{positionAnalysis.suggestion.detail}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'buy' && (
            <div className="space-y-3">
              {/* 现价买入分析 - 专注于执行层面 */}
              {showAnalysis && buyAnalysis && (
                <div className="space-y-3">
                  {/* 入场区间 */}
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <div className="text-xs text-blue-600 mb-1">建议入场区间</div>
                    <div className="text-lg font-bold text-blue-700">
                      ¥{buyAnalysis.entryLow.toFixed(2)} - ¥{buyAnalysis.entryHigh.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-blue-500 mt-1">
                      当前价¥{currentPrice.toFixed(2)} {currentPrice <= support * 1.02 ? '（接近支撑，可建仓）' : '（建议等待回调）'}
                    </div>
                  </div>

                  {/* 分批建仓计划 */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <div className="text-xs text-slate-600 mb-2">分批建仓计划</div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">第一批 @ 现价 ¥{currentPrice.toFixed(2)}</span>
                        <span className="font-medium text-slate-700">{buyAnalysis.firstBatch}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">第二批 @ 支撑 ¥{support.toFixed(2)}</span>
                        <span className="font-medium text-slate-700">{buyAnalysis.secondBatch}</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                      建议买入区间：¥{buyAnalysis.entryLow.toFixed(2)} - ¥{buyAnalysis.entryHigh.toFixed(2)}
                    </div>
                  </div>

                  {/* 风险控制 */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <div className="text-xs text-slate-600 mb-2">风险控制</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center">
                        <span className="text-[10px] text-slate-500 block">止损位</span>
                        <span className="text-sm font-medium text-red-600">¥{stopLoss.toFixed(2)}</span>
                        <span className="text-[10px] text-red-400 block">-¥{buyAnalysis.riskAmount.toFixed(2)}/股</span>
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] text-slate-500 block">第一止盈</span>
                        <span className="text-sm font-medium text-green-600">¥{takeProfit1.toFixed(2)}</span>
                        <span className="text-[10px] text-green-400 block">+¥{buyAnalysis.rewardAmount.toFixed(2)}/股</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 text-center">
                      <span className="text-[10px] text-slate-500">盈亏比 </span>
                      <span className={`text-sm font-bold ${buyAnalysis.ratio >= 2 ? 'text-green-600' : buyAnalysis.ratio >= 1 ? 'text-amber-600' : 'text-slate-600'}`}>
                        {buyAnalysis.ratio.toFixed(2)}:1
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
