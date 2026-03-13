import React from 'react';
import { TrendingUp, TrendingDown, BarChart3, DollarSign, Activity, Flame } from 'lucide-react';
import { StockData } from '../contexts/StockContext';

interface StockAnalysisProps {
  stockData: StockData;
}

const StockAnalysis: React.FC<StockAnalysisProps> = ({ stockData }) => {
  const {
    name,
    symbol,
    currentPrice,
    changePercent,
    open,
    high,
    low,
    volume,
    marketCap,
    support,
    resistance,
    stopLoss,
    takeProfit1,
    recommendation,
    recommendationReason,
    trendAnalysis
  } = stockData;

  const isPositive = changePercent >= 0;

  // 计算预测价格区间（基于支撑阻力位）
  const predictedLow = support * 0.95;
  const predictedHigh = resistance * 1.05;
  const predictedPrice = (predictedLow + predictedHigh) / 2;

  // 根据量化评分确定建议颜色
  const getSuggestionColor = () => {
    if (stockData.quantScore >= 60) return '#10B981'; // 绿色 - 强烈买入
    if (stockData.quantScore >= 50) return '#F59E0B'; // 橙色 - 买入
    if (stockData.quantScore >= 40) return '#6B7280'; // 灰色 - 观望
    return '#EF4444'; // 红色 - 卖出
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* 标题栏 */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{name || '该股'}一周走势预测</h2>
          <p className="text-sm text-gray-500 mt-1">蒙特卡洛模拟 · {symbol}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-gray-900">
            ¥{currentPrice.toFixed(2)}
          </div>
          <div className={`text-lg font-semibold ${isPositive ? 'text-red-500' : 'text-green-500'}`}>
            {isPositive ? '▲' : '▼'} {Math.abs(changePercent).toFixed(2)}%
          </div>
        </div>
      </div>

      {/* 建议卡片 */}
      <div 
        className="mb-6 p-4 rounded-lg text-white"
        style={{ backgroundColor: getSuggestionColor() }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="px-3 py-1 bg-white bg-opacity-20 rounded text-sm font-medium">
            评级：{recommendation || '观望'}
          </span>
          <span className="text-sm">量化建议</span>
        </div>
        <p className="text-base leading-relaxed">{recommendationReason || '建议观望，等待明确信号'}</p>
      </div>

      {/* 价格区间 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="text-sm text-gray-600 mb-1">预测价格区间</div>
          <div className="text-lg font-semibold text-gray-900">
            ¥{predictedLow.toFixed(2)} - ¥{predictedHigh.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            预测中位数: ¥{predictedPrice.toFixed(2)}
          </div>
        </div>
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="text-sm text-gray-600 mb-1">关键价位</div>
          <div className="text-lg font-semibold text-gray-900">
            支撑¥{support.toFixed(2)} / 阻力¥{resistance.toFixed(2)}
          </div>
        </div>
      </div>

      {/* 技术分析说明 */}
      <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-medium text-amber-800">技术分析</span>
        </div>
        <p className="text-sm text-amber-700 leading-relaxed">
          {trendAnalysis || '基于蒙特卡洛模拟（10000次路径），预测未来7天价格走势。'}
        </p>
        <p className="text-xs text-amber-600 mt-2">
          ⚠️ 注意控制仓位，严格止损。以上分析仅供参考，不构成投资建议。
        </p>
      </div>

      {/* 今日数据 */}
      <div className="grid grid-cols-6 gap-4">
        <DataItem icon={<Activity size={16} />} label="开盘" value={`¥${open.toFixed(2)}`} />
        <DataItem icon={<TrendingUp size={16} />} label="最高" value={`¥${high.toFixed(2)}`} />
        <DataItem icon={<TrendingDown size={16} />} label="最低" value={`¥${low.toFixed(2)}`} />
        <DataItem icon={<BarChart3 size={16} />} label="成交量" value={`${(volume / 10000).toFixed(0)}万`} />
        <DataItem icon={<Flame size={16} />} label="市值" value={`${(marketCap / 100000000).toFixed(1)}亿`} />
        <DataItem icon={<DollarSign size={16} />} label="止损" value={`¥${stopLoss.toFixed(2)}`} />
      </div>
    </div>
  );
};

interface DataItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const DataItem: React.FC<DataItemProps> = ({ icon, label, value }) => (
  <div className="text-center p-2 bg-slate-50 rounded-lg">
    <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
      {icon}
      <span className="text-xs">{label}</span>
    </div>
    <div className="text-sm font-semibold text-gray-900">{value}</div>
  </div>
);

export default StockAnalysis;
