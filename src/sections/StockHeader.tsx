import { StockData } from '../contexts/StockContext';

interface StockHeaderProps {
  data: StockData;
}

/**
 * StockHeader Component
 * Displays stock basic information and key metrics
 */
export default function StockHeader({ data }: StockHeaderProps) {
  // Guard against undefined data
  if (!data || !data.currentPrice) {
    return (
      <div className="glass-card rounded-2xl p-6 mb-6">
        <div className="text-center text-gray-500">Loading stock data...</div>
      </div>
    );
  }

  const isPositive = (data.change || 0) >= 0;
  const currentPrice = data.currentPrice || 0;
  const change = data.change || 0;
  const changePercent = data.changePercent || 0;
  const supportPrice = data.supportPrice || 0;
  const resistancePrice = data.resistancePrice || 0;
  const open = data.open || 0;
  const high = data.high || 0;
  const low = data.low || 0;
  const volume = data.volume || 0;
  const marketCap = data.marketCap || 0;
  const close = data.close || 0;

  return (
    <div className="glass-card rounded-2xl p-6 mb-6 animate-slide-in">
      {/* 股票基本信息 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{data.name || '-'} ({data.symbol || '-'})</h1>
        </div>
        <div className="mt-2 md:mt-0 text-right">
          <div className="text-3xl font-bold text-gray-800">
            ¥{currentPrice.toFixed(2)}
          </div>
          <div className={`text-lg font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '▲' : '▼'} {Math.abs(change).toFixed(2)} ({Math.abs(changePercent).toFixed(2)}%)
          </div>
        </div>
      </div>

      {/* 量化总结 - 战略决策中心 */}
      <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-200">
        {/* 标题行 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
              data.importance === 'high' ? 'bg-red-100 text-red-700' :
              data.importance === 'medium' ? 'bg-amber-100 text-amber-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              评级：{data.importance === 'high' ? '强烈' : data.importance === 'medium' ? '中等' : '一般'}
            </span>
            <span className="text-xs text-slate-600 font-medium">量化建议</span>
          </div>
          <span className={`text-lg font-bold ${
            data.recommendation?.includes('买入') ? 'text-green-600' :
            data.recommendation?.includes('建仓') ? 'text-amber-600' :
            data.recommendation?.includes('卖出') ? 'text-red-600' :
            'text-slate-600'
          }`}>
            评级：{data.recommendation || '观望'}
          </span>
        </div>
        
        {/* 核心逻辑 - 一句话 */}
        <div className="mb-3 p-3 bg-amber-500 rounded-lg">
          <p className="text-sm text-slate-900 font-medium">{data.coreLogic || data.trendAnalysis || '-'}</p>
        </div>
        
        {/* 关键信息网格 - 紧凑 */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white p-2 rounded border border-slate-100">
            <span className="text-slate-500 block mb-0.5">建议仓位</span>
            <span className="text-slate-800 font-medium">
              {data.positionSize || '0%'}
            </span>
          </div>
          <div className="bg-white p-2 rounded border border-slate-100">
            <span className="text-slate-500 block mb-0.5">关键价位</span>
            <span className="text-slate-800 font-medium">
              支撑¥{supportPrice.toFixed(2)} / 阻力¥{resistancePrice.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* 六宫格数据 - 响应式优化（手机 3 列，平板 3 列，电脑 6 列） */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-4">
        <div className="text-center p-2 md:p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="text-[10px] md:text-xs text-gray-500 mb-1">📈 开盘</div>
          <div className="text-xs md:text-sm font-semibold text-gray-900">¥{open.toFixed(2)}</div>
        </div>
        <div className="text-center p-2 md:p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="text-[10px] md:text-xs text-gray-500 mb-1">📊 最高</div>
          <div className="text-xs md:text-sm font-semibold text-gray-900">¥{high.toFixed(2)}</div>
        </div>
        <div className="text-center p-2 md:p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="text-[10px] md:text-xs text-gray-500 mb-1">📉 最低</div>
          <div className="text-xs md:text-sm font-semibold text-gray-900">¥{low.toFixed(2)}</div>
        </div>
        <div className="text-center p-2 md:p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="text-[10px] md:text-xs text-gray-500 mb-1">📊 成交量</div>
          <div className="text-xs md:text-sm font-semibold text-gray-900">{(volume / 10000).toFixed(0)}万</div>
        </div>
        <div className="text-center p-2 md:p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="text-[10px] md:text-xs text-gray-500 mb-1">💰 市值</div>
          <div className="text-xs md:text-sm font-semibold text-gray-900">
            {marketCap > 100000000 
              ? `${(marketCap / 100000000).toFixed(1)}亿`
              : marketCap > 10000 
                ? `${(marketCap / 10000).toFixed(0)}万`
                : marketCap > 0 
                  ? `${marketCap.toFixed(0)}`
                  : '-'
            }
          </div>
        </div>
        <div className="text-center p-2 md:p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="text-[10px] md:text-xs text-gray-500 mb-1">📊 昨收</div>
          <div className="text-xs md:text-sm font-semibold text-gray-900">¥{close.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}
