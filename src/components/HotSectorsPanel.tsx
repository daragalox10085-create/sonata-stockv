/**
 * Hot Sectors Panel - 热门板块展示组件
 * 版本: v2.0
 */

import React from 'react';
import { useHotSectors } from '../hooks/useAnalysis';
import { Flame, TrendingUp, Database, RefreshCw } from 'lucide-react';

export const HotSectorsPanel: React.FC = () => {
  const { data, loading, error, refresh, fromCache } = useHotSectors();

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">分析热门板块...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center py-12 text-red-600">
          <p className="mb-4">{error}</p>
          <button 
            onClick={refresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center py-12 text-gray-500">
          <p>暂无符合条件的板块数据</p>
          <p className="text-sm text-gray-400 mt-2">可能原因：当前市场无主力资金流入超1000万的板块</p>
          <button 
            onClick={refresh}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            刷新重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center">
          <Flame className="w-6 h-6 mr-2 text-orange-500" />
          热门板块
          <span className="ml-2 text-sm font-normal text-gray-500">
            (主力净流入 &gt; 1000万)
          </span>
        </h2>
        <div className="flex items-center space-x-3">
          {fromCache && (
            <span className="text-xs text-gray-400 flex items-center">
              <Database className="w-3 h-3 mr-1" />
              缓存数据
            </span>
          )}
          <button 
            onClick={refresh}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="刷新数据"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* 板块网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((item, index) => (
          <div 
            key={item.sector.code}
            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            {/* 板块头部 */}
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-2xl font-bold text-gray-200 mr-2">#{index + 1}</span>
                <span className="font-bold text-lg">{item.sector.name}</span>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                item.sector.trend === '强势热点' ? 'bg-red-100 text-red-700' :
                item.sector.trend === '新兴热点' ? 'bg-green-100 text-green-700' :
                item.sector.trend === '持续热点' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {item.sector.trend}
              </span>
            </div>

            {/* 评分 */}
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {item.sector.score}分
            </div>

            {/* 涨跌幅和资金流 */}
            <div className="text-sm text-gray-600 mb-3">
              <span className={`font-semibold ${item.sector.changePercent >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                {item.sector.changePercent >= 0 ? '+' : ''}{item.sector.changePercent.toFixed(2)}%
              </span>
              <span className="mx-2">|</span>
              <span>主力净流入: {(item.sector.metrics.mainForceNet / 10000).toFixed(0)}万</span>
            </div>

            {/* 维度评分 */}
            <div className="space-y-1 text-xs mb-4">
              <div className="flex justify-between">
                <span>动量</span>
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${item.sector.dimensions.momentum}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between">
                <span>资金</span>
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${item.sector.dimensions.capital}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between">
                <span>技术</span>
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full" 
                    style={{ width: `${item.sector.dimensions.technical}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 精选股票 */}
            {item.selectedStocks.length > 0 && (
              <div className="border-t pt-3">
                <div className="text-xs text-gray-500 mb-2">精选股票</div>
                <div className="space-y-2">
                  {item.selectedStocks.map(stock => (
                    <div 
                      key={stock.code}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="font-medium">{stock.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-600 font-bold">{stock.score}分</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          stock.recommendation === '强烈推荐' ? 'bg-red-100 text-red-700' :
                          stock.recommendation === '推荐' ? 'bg-orange-100 text-orange-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          评级：{stock.recommendation}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HotSectorsPanel;
