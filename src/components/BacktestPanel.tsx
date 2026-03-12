import { useState, useEffect } from 'react';

interface Signal {
  id: string;
  symbol: string;
  name: string;
  timestamp: number;
  type: 'buy' | 'sell';
  price: number;
  quantScore: number;
  stopLoss: number;
  takeProfit: number;
  result?: 'win' | 'loss' | 'pending';
  profitLoss?: number;
}

interface BacktestPanelProps {
  symbol: string;
  name: string;
}

export default function BacktestPanel({ symbol, name }: BacktestPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | '180d'>('90d');
  const [signals, setSignals] = useState<Signal[]>([]);

  useEffect(() => {
    // 从 localStorage 加载历史信号
    const loadSignals = () => {
      const stored = localStorage.getItem(`backtest_${symbol}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSignals(parsed);
      } else {
        // 生成模拟数据用于演示
        const mockSignals: Signal[] = [
          {
            id: '1',
            symbol,
            name,
            timestamp: Date.now() - 86400000 * 5,
            type: 'buy',
            price: 1400,
            quantScore: 75,
            stopLoss: 1288,
            takeProfit: 1540,
            result: 'pending',
            profitLoss: 0
          },
          {
            id: '2',
            symbol,
            name,
            timestamp: Date.now() - 86400000 * 30,
            type: 'buy',
            price: 1350,
            quantScore: 72,
            stopLoss: 1242,
            takeProfit: 1485,
            result: 'win',
            profitLoss: 5.2
          },
          {
            id: '3',
            symbol,
            name,
            timestamp: Date.now() - 86400000 * 60,
            type: 'sell',
            price: 1420,
            quantScore: 35,
            stopLoss: 1562,
            takeProfit: 1278,
            result: 'win',
            profitLoss: 3.8
          }
        ];
        setSignals(mockSignals);
        localStorage.setItem(`backtest_${symbol}`, JSON.stringify(mockSignals));
      }
    };

    loadSignals();
  }, [symbol, name]);

  const filteredSignals = signals.filter(signal => {
    const days = (Date.now() - signal.timestamp) / 86400000;
    if (timeRange === '30d') return days <= 30;
    if (timeRange === '90d') return days <= 90;
    return days <= 180;
  });

  const stats = {
    total: filteredSignals.length,
    wins: filteredSignals.filter(s => s.result === 'win').length,
    losses: filteredSignals.filter(s => s.result === 'loss').length,
    winRate: (filteredSignals.filter(s => s.result === 'win').length / Math.max(1, filteredSignals.filter(s => s.result !== 'pending').length) * 100) || 0,
    avgProfit: (filteredSignals.filter(s => s.result === 'win').reduce((sum, s) => sum + (s.profitLoss || 0), 0) / Math.max(1, filteredSignals.filter(s => s.result === 'win').length)) || 0
  };

  return (
    <div className="mt-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-bg-surface hover:bg-bg-primary border border-border-light rounded-lg font-medium text-left transition-colors flex items-center justify-between"
      >
        <span>📊 历史回测</span>
        <span className="text-gray-400">{isExpanded ? '▲ 收起' : '▼ 展开'}</span>
      </button>

      {isExpanded && (
        <div className="mt-4 p-4 bg-bg-surface border border-border-light rounded-lg">
          {/* 时间范围选择 */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                timeRange === '30d' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              30 天
            </button>
            <button
              onClick={() => setTimeRange('90d')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                timeRange === '90d' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              90 天
            </button>
            <button
              onClick={() => setTimeRange('180d')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                timeRange === '180d' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              180 天
            </button>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="p-3 bg-white rounded border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">信号次数</div>
              <div className="text-xl font-bold text-gray-800">{stats.total}</div>
            </div>
            <div className="p-3 bg-white rounded border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">胜率</div>
              <div className={`text-xl font-bold ${stats.winRate >= 60 ? 'text-green-600' : stats.winRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                {stats.winRate.toFixed(1)}%
              </div>
            </div>
            <div className="p-3 bg-white rounded border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">平均盈利</div>
              <div className={`text-xl font-bold ${stats.avgProfit >= 5 ? 'text-green-600' : 'text-yellow-600'}`}>
                {stats.avgProfit.toFixed(1)}%
              </div>
            </div>
            <div className="p-3 bg-white rounded border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">盈亏比</div>
              <div className="text-xl font-bold text-gray-800">
                {(stats.wins / Math.max(1, stats.losses)).toFixed(1)}:1
              </div>
            </div>
          </div>

          {/* 信号列表 */}
          <div className="space-y-2">
            {filteredSignals.slice(0, 10).map((signal, _idx) => (
              <div
                key={signal.id}
                className="flex items-center justify-between p-3 bg-bg-surface rounded border border-border-light"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    signal.type === 'buy' ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    {signal.type === 'buy' ? '买' : '卖'}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-800">
                      {signal.name} ({signal.symbol})
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(signal.timestamp).toLocaleDateString()} | 量化评分 {signal.quantScore}分
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-800">
                    ¥{signal.price.toFixed(2)}
                  </div>
                  {signal.result && (
                    <div className={`text-xs font-medium ${
                      signal.result === 'win' ? 'text-green-600' : signal.result === 'loss' ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {signal.result === 'win' ? `+${signal.profitLoss?.toFixed(1)}%` : signal.result === 'loss' ? `${signal.profitLoss?.toFixed(1)}%` : '持仓中'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 免责声明 */}
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            ⚠️ 历史回测数据仅供参考，不构成投资建议。过往业绩不代表未来表现。
          </div>
        </div>
      )}
    </div>
  );
}
