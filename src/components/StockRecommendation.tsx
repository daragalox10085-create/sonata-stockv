// src/components/StockRecommendation.tsx
// 改进版股票推荐组件 - 增加风控提示

import React from 'react';

interface StockPick {
  code: string;
  name: string;
  sector: string;
  score: number;
  distanceToSupport: number;
  upSpace: string;
  rating: string;
  riskLevel: string;
  warning: string;
  sectorChange: number;
}

interface StockRecommendationProps {
  stocks: StockPick[];
}

export const StockRecommendation: React.FC<StockRecommendationProps> = ({ stocks }) => {
  // 获取评级样式
  const getRatingStyle = (rating: string) => {
    switch (rating) {
      case '强烈推荐':
        return 'bg-green-100 text-green-800 border-green-300';
      case '推荐':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case '观望':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case '回避':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // 获取风险等级样式
  const getRiskStyle = (riskLevel: string) => {
    switch (riskLevel) {
      case '低':
        return 'text-green-600';
      case '中':
        return 'text-yellow-600';
      case '高':
        return 'text-orange-600';
      case '极高':
        return 'text-red-600 font-bold';
      default:
        return 'text-gray-600';
    }
  };

  // 获取距离支撑位样式
  const getDistanceStyle = (distance: number) => {
    if (distance < 0) return 'text-red-600 font-bold';
    if (distance <= 3) return 'text-green-600';
    if (distance <= 8) return 'text-yellow-600';
    return 'text-orange-600';
  };

  return (
    <div className="space-y-4">
      {/* 风险提示标题 */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-amber-600">⚠️</span>
          <span className="text-amber-800 font-medium">风险提示</span>
        </div>
        <p className="text-amber-700 text-sm mt-1">
          以下推荐已过滤跌破支撑位的股票。距离支撑位&gt;8%的股票评级自动降级为"观望"，请谨慎追高。
        </p>
      </div>

      {/* 股票列表 */}
      <div className="grid gap-3">
        {stocks.map((stock, index) => (
          <div 
            key={stock.code}
            className={`border rounded-lg p-4 ${
              stock.rating === '回避' ? 'bg-red-50 border-red-200' : 
              stock.rating === '观望' ? 'bg-yellow-50 border-yellow-200' :
              'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              {/* 左侧：基本信息 */}
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-900">
                    {stock.name}
                  </span>
                  <span className="text-sm text-gray-500">
                    {stock.code}
                  </span>
                  <span className="text-xs text-gray-400">
                    {stock.sector}
                  </span>
                </div>
                
                {/* 评分和上涨空间 */}
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-sm">
                    评分: <span className="font-semibold text-blue-600">{stock.score}分</span>
                  </span>
                  <span className="text-sm">
                    上涨空间: <span className="font-semibold text-green-600">{stock.upSpace}</span>
                  </span>
                </div>
              </div>

              {/* 右侧：评级和风险 */}
              <div className="text-right space-y-2">
                {/* 评级标签 */}
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getRatingStyle(stock.rating)}`}>
                  {stock.rating}
                </span>
                
                {/* 风险等级 */}
                <div className="text-sm">
                  风险: <span className={getRiskStyle(stock.riskLevel)}>{stock.riskLevel}</span>
                </div>
              </div>
            </div>

            {/* 距离支撑位 */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  距支撑位: 
                  <span className={getDistanceStyle(stock.distanceToSupport)}>
                    {stock.distanceToSupport > 0 ? '+' : ''}{stock.distanceToSupport}%
                  </span>
                </span>
                
                {/* 警告信息 */}
                {stock.warning && (
                  <span className="text-sm text-red-600 font-medium flex items-center gap-1">
                    ⚠️ {stock.warning}
                  </span>
                )}
              </div>
            </div>

            {/* 板块涨幅提示 */}
            {stock.sectorChange > 3 && stock.distanceToSupport > 5 && (
              <div className="mt-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                所属板块近期涨幅{stock.sectorChange}%，追高风险较高
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 底部说明 */}
      <div className="text-xs text-gray-500 mt-4 pt-3 border-t">
        <p>评级规则：距离支撑位&lt;3%为"强烈推荐"，3-8%为"推荐"，&gt;8%为"观望"，跌破支撑为"回避"</p>
        <p className="mt-1">已自动过滤跌破支撑位的股票</p>
      </div>
    </div>
  );
};

export default StockRecommendation;
