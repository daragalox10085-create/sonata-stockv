/**
 * Monte Carlo Panel - 蒙特卡洛预测展示组件
 * 版本: v2.0
 */

import React, { useState } from 'react';
import { useMonteCarlo } from '../hooks/useAnalysis';
import { Activity, RefreshCw, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface MonteCarloPanelProps {
  stockCode: string;
}

export const MonteCarloPanel: React.FC<MonteCarloPanelProps> = ({ stockCode }) => {
  const { data, loading, error, refresh } = useMonteCarlo(stockCode);
  const [showDerivation, setShowDerivation] = useState(false);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">运行蒙特卡洛模拟...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={refresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" 
          >
            测试连接
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center py-12 text-gray-500">
          暂无数据，请点击刷新按钮获取最新分析
        </div>
      </div>
    );
  }

  const { stock, monteCarlo } = data;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center">
          <Activity className="w-6 h-6 mr-2 text-blue-600" />
          蒙特卡洛预测分析
        </h2>
        <button
          onClick={refresh}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          title="刷新数据"
        >
          <RefreshCw className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="space-y-6">
        {/* 当前股价 */}
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-500 mb-1">{stock.name} ({stock.code})</div>
          <div className="text-3xl font-bold text-blue-600">¥{stock.currentPrice}</div>
        </div>

        {/* 概率条 */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-green-600 font-semibold flex items-center">
              <TrendingUp className="w-4 h-4 mr-1" />
              上涨 {monteCarlo.upProbability}%
            </span>
            <span className="text-red-600 font-semibold flex items-center">
              <TrendingDown className="w-4 h-4 mr-1" />
              下跌 {monteCarlo.downProbability}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-green-500 to-green-400 h-full transition-all duration-1000"
              style={{ width: `${monteCarlo.upProbability}%` }}
            />
          </div>
        </div>

        {/* 三种情景 */}
        <div className="grid grid-cols-3 gap-4">
          {monteCarlo.scenarios.map((scenario, idx) => (
            <div 
              key={scenario.type}
              className={`p-4 rounded-lg border-2 ${
                scenario.type === '乐观' ? 'bg-green-50 border-green-200' :
                scenario.type === '基准' ? 'bg-blue-50 border-blue-200' :
                'bg-red-50 border-red-200'
              }`}
            >
              <div className="text-sm font-semibold mb-1">{scenario.type}</div>
              <div className="text-2xl font-bold mb-1">{scenario.probability}%</div>
              <div className="text-xs text-gray-600">
                ¥{scenario.priceRange[0].toFixed(2)} - ¥{scenario.priceRange[1].toFixed(2)}
              </div>
              <div className={`text-sm font-semibold mt-2 ${
                scenario.expectedReturn >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {scenario.expectedReturn >= 0 ? '+' : ''}{scenario.expectedReturn}%
              </div>
            </div>
          ))}
        </div>

        {/* 关键指标 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg text-center">
            <div className="text-sm text-gray-500 mb-1">预期价格</div>
            <div className="text-2xl font-bold text-blue-600">
              ¥{monteCarlo.expectedPrice.toFixed(2)}
            </div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg text-center">
            <div className="text-sm text-gray-500 mb-1">风险收益比</div>
            <div className="text-2xl font-bold text-purple-600">
              {monteCarlo.riskRewardRatio}:1
            </div>
          </div>
        </div>

        {/* 推导详情 */}
        <div className="border-t pt-4">
          <button
            onClick={() => setShowDerivation(!showDerivation)}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
          >
            {showDerivation ? '隐藏' : '查看'}推导详情
          </button>
          
          {showDerivation && (
            <div className="mt-3 p-4 bg-gray-50 rounded-lg text-sm space-y-2">
              {monteCarlo.derivationSteps.map((step, idx) => (
                <div key={idx} className="text-gray-700">{step}</div>
              ))}
            </div>
          )}
        </div>

        {/* 统计信息 */}
        <div className="text-xs text-gray-400 text-center">
          基于{monteCarlo.statistics.mean.toFixed(0)}次模拟 | 
          标准差: {(monteCarlo.statistics.stdDev / stock.currentPrice * 100).toFixed(2)}%
        </div>
      </div>
    </div>
  );
};

export default MonteCarloPanel;
