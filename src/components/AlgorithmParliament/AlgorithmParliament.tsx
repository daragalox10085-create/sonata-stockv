import React, { useState, useEffect } from 'react';
import { AlgorithmCard } from './AlgorithmCard';
import { ConsensusIndicator } from './ConsensusIndicator';
import { AlgorithmParliamentData } from './types';
import { fetchAlgorithmPredictions } from '../../services/algorithmService';

interface AlgorithmParliamentProps {
  stockSymbol: string;
  stockName?: string;
  currentPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
  timeHorizon?: number;
}

export const AlgorithmParliament: React.FC<AlgorithmParliamentProps> = ({
  stockSymbol,
  stockName,
  currentPrice = 0,
  priceChange = 0,
  priceChangePercent = 0,
  timeHorizon = 5
}) => {
  const [data, setData] = useState<AlgorithmParliamentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  
  useEffect(() => {
    loadData();
    
    // 每5分钟自动更新
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [stockSymbol, timeHorizon]);
  
  const loadData = async () => {
    try {
      setLoading(true);
      const result = await fetchAlgorithmPredictions(stockSymbol, timeHorizon);
      
      // 使用传入的股票数据覆盖模拟数据
      if (stockName || currentPrice) {
        result.stock.name = stockName || result.stock.name;
        result.stock.currentPrice = currentPrice || result.stock.currentPrice;
        result.stock.priceChange = priceChange || result.stock.priceChange;
        result.stock.priceChangePercent = priceChangePercent || result.stock.priceChangePercent;
      }
      
      setData(result);
      setError(null);
    } catch (err) {
      setError('算法数据加载失败，请稍后重试');
      console.error('Algorithm parliament data error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCardToggle = (algorithmId: string) => {
    setExpandedCard(expandedCard === algorithmId ? null : algorithmId);
  };
  
  if (loading) {
    return (
      <div className="w-full bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
          <span className="ml-3 text-sm text-slate-600">算法议会计算中...</span>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="w-full bg-white rounded-lg border border-slate-200 p-6">
        <div className="text-center">
          <div className="text-red-500 text-sm mb-2">{error}</div>
          <button
            onClick={loadData}
            className="px-3 py-1 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 rounded"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }
  
  if (!data) return null;
  
  return (
    <div className="w-full bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* 头部 */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">
                算法议会：{data.stock.name} ({data.stock.symbol})
              </div>
              <div className="text-xs text-slate-500">
                基于{data.predictions.length}个独立算法的民主投票
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm font-semibold text-slate-900">
              ¥{data.stock.currentPrice.toFixed(2)}
            </div>
            <div className={`text-xs ${data.stock.priceChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {data.stock.priceChange >= 0 ? '+' : ''}{data.stock.priceChange.toFixed(2)} 
              ({data.stock.priceChange >= 0 ? '+' : ''}{data.stock.priceChangePercent.toFixed(2)}%)
            </div>
          </div>
        </div>
      </div>
      
      {/* 内容区 */}
      <div className="p-6">
        {/* 共识指示器 */}
        <div className="mb-6">
          <ConsensusIndicator 
            consensus={data.consensus}
            timeHorizon={timeHorizon}
          />
        </div>
        
        {/* 算法卡片网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.predictions.map(prediction => (
            <AlgorithmCard
              key={prediction.algorithmId}
              prediction={prediction}
              isExpanded={expandedCard === prediction.algorithmId}
              onToggle={() => handleCardToggle(prediction.algorithmId)}
            />
          ))}
        </div>
        
        {/* 底部信息 */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <div className="text-xs text-slate-500">
            <div className="flex items-center justify-between">
              <span>最后更新: {new Date(data.lastCalculated).toLocaleString('zh-CN')}</span>
              <span>数据延迟: &lt; 15分钟</span>
            </div>
            <div className="mt-2 text-slate-400">
              注：算法议会基于历史数据计算，不构成投资建议。投资有风险，决策需谨慎。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlgorithmParliament;
