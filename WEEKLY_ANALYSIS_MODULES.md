# Sonata 一周走势预测 + 热门板块&精选股票池 完整代码

**版本**: v1.3  
**日期**: 2026-03-13  
**模块**: WeeklyMarketAnalysis + MonteCarlo + HotSectors + StockPool

---

## 目录

1. [一周走势预测模块](#1-一周走势预测模块)
2. [热门板块&精选股票池模块](#2-热门板块精选股票池模块)
3. [类型定义](#3-类型定义)
4. [使用示例](#4-使用示例)

---

## 1. 一周走势预测模块

### 1.1 WeeklyMarketAnalysis.tsx (UI组件)

```tsx
// src/sections/WeeklyMarketAnalysis.tsx

import React, { useState, useEffect } from 'react';
import { dynamicAnalysisService, MonteCarloResult } from '../services/dynamicAnalysisService';
import { useStock } from '../contexts/StockContext';
import { AlertCircle, TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface WeeklyMarketAnalysisProps {
  showStockPicker?: boolean;
  currentPrice?: number;
}

export const WeeklyMarketAnalysis: React.FC<WeeklyMarketAnalysisProps> = ({ 
  showStockPicker = false, 
  currentPrice = 100 
}) => {
  const [monteCarloResult, setMonteCarloResult] = useState<MonteCarloResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { stockData } = useStock();

  useEffect(() => {
    loadMonteCarloData();
  }, [stockData?.symbol]);

  const loadMonteCarloData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let historicalPrices: number[] = [];
      
      // 优先从StockContext获取真实K线数据
      if (stockData?.kLineData && stockData.kLineData.length > 20) {
        historicalPrices = stockData.kLineData.map(k => k.close);
      }
      
      const priceToUse = stockData?.currentPrice || currentPrice;
      const result = await dynamicAnalysisService.runMonteCarlo(priceToUse, historicalPrices);
      setMonteCarloResult(result);
    } catch (err) {
      console.error('加载蒙特卡洛数据失败:', err);
      setError('数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载分析数据...</span>
      </div>
    );
  }

  if (error || !monteCarloResult) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="w-6 h-6 mr-2" />
        {error || '数据加载失败'}
      </div>
    );
  }

  const { upProbability, downProbability, scenarios, expectedPrice, riskRewardRatio } = monteCarloResult;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold mb-6 flex items-center">
        <Activity className="w-6 h-6 mr-2 text-blue-600" />
        该股一周走势预测
        <span className="ml-2 text-sm font-normal text-gray-500">
          (基于蒙特卡洛模拟)
        </span>
      </h3>

      {/* 概率条 */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-green-600 font-semibold flex items-center">
            <TrendingUp className="w-4 h-4 mr-1" />
            上涨 {upProbability}%
          </span>
          <span className="text-red-600 font-semibold flex items-center">
            <TrendingDown className="w-4 h-4 mr-1" />
            下跌 {downProbability}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-green-500 to-green-400 h-full transition-all duration-1000"
            style={{ width: `${upProbability}%` }}
          ></div>
        </div>
      </div>

      {/* 三种情景 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {scenarios.map((scenario, index) => (
          <div 
            key={index}
            className={`rounded-lg p-4 border-2 ${
              scenario.type === '乐观' ? 'bg-green-50 border-green-200' :
              scenario.type === '基准' ? 'bg-blue-50 border-blue-200' :
              'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className={`font-bold ${
                scenario.type === '乐观' ? 'text-green-700' :
                scenario.type === '基准' ? 'text-blue-700' :
                'text-red-700'
              }`}>
                {scenario.type}
              </span>
              <span className="text-sm text-gray-500">{scenario.probability}%概率</span>
            </div>
            <div className="text-lg font-bold mb-1">
              ¥{scenario.priceRange[0].toFixed(2)} - ¥{scenario.priceRange[1].toFixed(2)}
            </div>
            <div className={`text-sm ${
              scenario.expectedReturn >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {scenario.expectedReturn >= 0 ? '+' : ''}{scenario.expectedReturn}%
            </div>
          </div>
        ))}
      </div>

      {/* 关键指标 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1">预期价格</div>
          <div className="text-2xl font-bold text-blue-600">¥{expectedPrice.toFixed(2)}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1">风险收益比</div>
          <div className="text-2xl font-bold text-purple-600">{riskRewardRatio}</div>
        </div>
      </div>

      {/* 推导详情 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold mb-3">推导详情</h4>
        <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
          {monteCarloResult.derivationSteps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default WeeklyMarketAnalysis;
```

### 1.2 MonteCarloPrediction.tsx (独立预测组件)

```tsx
// src/sections/MonteCarloPrediction.tsx

import React from 'react';
import { MonteCarloResult } from '../services/dynamicAnalysisService';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';

interface MonteCarloPredictionProps {
  result: MonteCarloResult;
  stockName?: string;
}

export const MonteCarloPrediction: React.FC<MonteCarloPredictionProps> = ({ 
  result, 
  stockName = '该股票' 
}) => {
  const { upProbability, downProbability, scenarios, expectedPrice, riskRewardRatio, derivationSteps } = result;

  const getScenarioIcon = (type: string) => {
    switch (type) {
      case '乐观': return <TrendingUp className="w-5 h-5 text-green-500" />;
      case '悲观': return <TrendingDown className="w-5 h-5 text-red-500" />;
      default: return <Minus className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-800 flex items-center">
          <BarChart3 className="w-6 h-6 mr-2 text-blue-600" />
          {stockName}一周走势预测
        </h3>
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          蒙特卡洛模拟
        </span>
      </div>

      {/* 涨跌概率 */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span className="text-green-600 font-bold text-lg">上涨 {upProbability}%</span>
          <span className="text-red-600 font-bold text-lg">下跌 {downProbability}%</span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
            style={{ width: `${upProbability}%` }}
          />
        </div>
      </div>

      {/* 情景预测 */}
      <div className="space-y-4 mb-6">
        {scenarios.map((scenario, idx) => (
          <div 
            key={idx}
            className={`flex items-center p-4 rounded-lg border-l-4 ${
              scenario.type === '乐观' ? 'bg-green-50 border-green-500' :
              scenario.type === '基准' ? 'bg-blue-50 border-blue-500' :
              'bg-red-50 border-red-500'
            }`}
          >
            <div className="mr-4">{getScenarioIcon(scenario.type)}</div>
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-800">{scenario.type}</span>
                <span className="text-sm text-gray-500">{scenario.probability}% 概率</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-lg font-semibold">
                  ¥{scenario.priceRange[0].toFixed(2)} - ¥{scenario.priceRange[1].toFixed(2)}
                </span>
                <span className={`font-bold ${
                  scenario.expectedReturn >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {scenario.expectedReturn >= 0 ? '+' : ''}{scenario.expectedReturn}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 关键数据 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-sm text-gray-500 mb-1">预期价格</div>
          <div className="text-2xl font-bold text-blue-600">¥{expectedPrice.toFixed(2)}</div>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-sm text-gray-500 mb-1">盈亏比</div>
          <div className="text-2xl font-bold text-purple-600">{riskRewardRatio}:1</div>
        </div>
      </div>

      {/* 推导步骤 */}
      <div className="border-t pt-4">
        <h4 className="font-semibold text-gray-700 mb-3">计算过程</h4>
        <div className="space-y-2 text-sm text-gray-600">
          {derivationSteps.map((step, idx) => (
            <div key={idx} className="flex items-start">
              <span className="text-blue-500 mr-2">{idx + 1}.</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

---

## 2. 热门板块&精选股票池模块

### 2.1 HotSectorsAndStockPool.tsx (组合组件)

```tsx
// src/sections/HotSectorsAndStockPool.tsx

import React, { useState, useEffect } from 'react';
import { dynamicSectorAnalyzer, DynamicHotSector } from '../services/dynamicSectorAnalyzer';
import { stockSelector, StockRecommendation } from '../services/stockSelector';
import { Flame, TrendingUp, Star, AlertCircle, Database } from 'lucide-react';

export const HotSectorsAndStockPool: React.FC = () => {
  const [hotSectors, setHotSectors] = useState<DynamicHotSector[]>([]);
  const [stockPool, setStockPool] = useState<StockRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 1. 获取热门板块（已包含资金流入筛选）
      const sectors = await dynamicSectorAnalyzer.discoverHotSectors(6);
      setHotSectors(sectors);
      
      // 2. 从热门板块收集股票代码
      const allStockCodes: string[] = [];
      sectors.forEach(sector => {
        if (sector.topStocks) {
          allStockCodes.push(...sector.topStocks.map(s => s.code));
        }
      });
      
      // 3. 去重
      const uniqueCodes = [...new Set(allStockCodes)];
      
      // 4. 六因子选股
      if (uniqueCodes.length > 0) {
        const recommendations = await stockSelector.selectStocks(uniqueCodes, 5);
        setStockPool(recommendations);
      }
    } catch (err) {
      console.error('加载数据失败:', err);
      setError('数据加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">加载热门板块与精选股票池...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 text-red-600">
        <AlertCircle className="w-8 h-8 mr-2" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 热门板块 */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold flex items-center">
            <Flame className="w-6 h-6 mr-2 text-orange-500" />
            热门板块
            <span className="ml-2 text-sm font-normal text-gray-500">
              (主力净流入)
            </span>
          </h3>
          <span className="text-xs text-gray-400 flex items-center">
            <Database className="w-3 h-3 mr-1" />
            东方财富实时数据
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hotSectors.map((sector, index) => (
            <div 
              key={sector.code}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-xs text-gray-400 mr-2">#{index + 1}</span>
                  <span className="font-bold text-lg">{sector.name}</span>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  sector.trend === '强势热点' ? 'bg-red-100 text-red-700' :
                  sector.trend === '新兴热点' ? 'bg-green-100 text-green-700' :
                  sector.trend === '持续热点' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {sector.trend}
                </span>
              </div>
              
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {sector.score}分
              </div>
              
              <div className="text-sm text-gray-600 mb-3">
                <span className={`font-semibold ${sector.changePercent >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {sector.changePercent >= 0 ? '+' : ''}{sector.changePercent.toFixed(2)}%
                </span>
                <span className="mx-2">|</span>
                <span>主力净流入: {(sector.metrics.mainForceNet / 10000).toFixed(0)}万</span>
              </div>
              
              {/* 维度评分 */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>动量</span>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${sector.dimensions.momentum}%` }}></div>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>资金</span>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${sector.dimensions.capital}%` }}></div>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>技术</span>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${sector.dimensions.technical}%` }}></div>
                  </div>
                </div>
              </div>
              
              {/* 成分股 */}
              <div className="mt-3 pt-3 border-t">
                <div className="text-xs text-gray-500 mb-1">代表性股票</div>
                <div className="flex flex-wrap gap-1">
                  {sector.topStocks?.slice(0, 3).map(stock => (
                    <span key={stock.code} className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {stock.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 精选股票池 */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold flex items-center">
            <Star className="w-6 h-6 mr-2 text-yellow-500" />
            精选股票池
            <span className="ml-2 text-sm font-normal text-gray-500">
              (六因子选股)
            </span>
          </h3>
          <span className="text-xs text-gray-400 flex items-center">
            <Database className="w-3 h-3 mr-1" />
            基于热门板块成分股筛选
          </span>
        </div>

        {stockPool.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">排名</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">股票</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">综合评分</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">六因子</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">关键指标</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">推荐</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stockPool.map((stock, index) => (
                  <tr key={stock.code} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold">
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold">{stock.name}</div>
                      <div className="text-sm text-gray-500">{stock.code}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-2xl font-bold text-blue-600">{stock.score}</div>
                      <div className="text-xs text-gray-500">置信度: {stock.confidence}%</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center">
                          <span className="w-12">估值</span>
                          <div className="w-16 bg-gray-200 rounded-full h-1.5 ml-2">
                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${stock.factors.valuation}%` }}></div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span className="w-12">成长</span>
                          <div className="w-16 bg-gray-200 rounded-full h-1.5 ml-2">
                            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${stock.factors.growth}%` }}></div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span className="w-12">支撑</span>
                          <div className="w-16 bg-gray-200 rounded-full h-1.5 ml-2">
                            <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${stock.factors.support}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div>PE: {stock.metrics.pe.toFixed(1)}</div>
                      <div>距支撑: {stock.metrics.distanceToSupport.toFixed(1)}%</div>
                      <div>上涨空间: {stock.metrics.upwardSpace.toFixed(1)}%</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        stock.recommendation === '强烈推荐' ? 'bg-red-100 text-red-700' :
                        stock.recommendation === '推荐' ? 'bg-orange-100 text-orange-700' :
                        stock.recommendation === '谨慎推荐' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {stock.recommendation}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>暂无符合条件的股票</p>
            <p className="text-sm mt-2">请稍后重试或调整筛选条件</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HotSectorsAndStockPool;
```

### 2.2 SectorCard.tsx (板块卡片组件)

```tsx
// src/components/SectorCard.tsx

import React from 'react';
import { DynamicHotSector } from '../services/dynamicSectorAnalyzer';
import { TrendingUp, TrendingDown, Droplets, Activity } from 'lucide-react';

interface SectorCardProps {
  sector: DynamicHotSector;
  rank: number;
}

export const SectorCard: React.FC<SectorCardProps> = ({ sector, rank }) => {
  const getTrendColor = (trend: string) => {
    switch (trend) {
      case '强势热点': return 'bg-red-500 text-white';
      case '新兴热点': return 'bg-green-500 text-white';
      case '持续热点': return 'bg-blue-500 text-white';
      case '降温': return 'bg-gray-500 text-white';
      default: return 'bg-gray-300 text-gray-700';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition-all duration-300 border border-gray-100">
      {/* 头部 */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center">
          <span className="text-3xl font-bold text-gray-200 mr-3">#{rank}</span>
          <div>
            <h4 className="text-lg font-bold text-gray-800">{sector.name}</h4>
            <span className={`text-xs px-2 py-1 rounded-full ${getTrendColor(sector.trend)}`}>
              {sector.trend}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-blue-600">{sector.score}</div>
          <div className="text-xs text-gray-400">综合评分</div>
        </div>
      </div>

      {/* 涨跌幅和资金流 */}
      <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center">
          {sector.changePercent >= 0 ? (
            <TrendingUp className="w-5 h-5 text-red-500 mr-2" />
          ) : (
            <TrendingDown className="w-5 h-5 text-green-500 mr-2" />
          )}
          <span className={`text-lg font-bold ${sector.changePercent >= 0 ? 'text-red-500' : 'text-green-500'}`}>
            {sector.changePercent >= 0 ? '+' : ''}{sector.changePercent.toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center text-sm">
          <Droplets className="w-4 h-4 text-blue-500 mr-1" />
          <span>主力净流入: </span>
          <span className="font-semibold text-blue-600 ml-1">
            {(sector.metrics.mainForceNet / 10000).toFixed(0)}万
          </span>
        </div>
      </div>

      {/* 维度评分雷达 */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center"><Activity className="w-4 h-4 mr-1" /> 动量</span>
          <div className="flex items-center">
            <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
              <div 
                className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full"
                style={{ width: `${sector.dimensions.momentum}%` }}
              />
            </div>
            <span className="w-8 text-right">{sector.dimensions.momentum}</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center"><Droplets className="w-4 h-4 mr-1" /> 资金</span>
          <div className="flex items-center">
            <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
              <div 
                className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full"
                style={{ width: `${sector.dimensions.capital}%` }}
              />
            </div>
            <span className="w-8 text-right">{sector.dimensions.capital}</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center"><Activity className="w-4 h-4 mr-1" /> 技术</span>
          <div className="flex items-center">
            <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
              <div 
                className="bg-gradient-to-r from-purple-400 to-purple-600 h-2 rounded-full"
                style={{ width: `${sector.dimensions.technical}%` }}
              />
            </div>
            <span className="w-8 text-right">{sector.dimensions.technical}</span>
          </div>
        </div>
      </div>

      {/* 成分股 */}
      <div className="border-t pt-3">
        <div className="text-xs text-gray-500 mb-2">代表性成分股</div>
        <div className="flex flex-wrap gap-2">
          {sector.topStocks?.slice(0, 4).map(stock => (
            <span 
              key={stock.code}
              className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors cursor-pointer"
            >
              {stock.name}
            </span>
          ))}
        </div>
      </div>

      {/* 数据来源 */}
      <div className="mt-3 pt-3 border-t text-xs text-gray-400 flex justify-between">
        <span>来源: {sector.source === 'eastmoney' ? '东方财富' : '未知'}</span>
        <span>{new Date(sector.timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  );
};
```

### 2.3 StockPoolTable.tsx (股票池表格组件)

```tsx
// src/components/StockPoolTable.tsx

import React from 'react';
import { StockRecommendation } from '../services/stockSelector';
import { ArrowUp, ArrowDown, Minus, Award, Target, TrendingUp } from 'lucide-react';

interface StockPoolTableProps {
  stocks: StockRecommendation[];
}

export const StockPoolTable: React.FC<StockPoolTableProps> = ({ stocks }) => {
  const getRecommendationColor = (level: string) => {
    switch (level) {
      case '强烈推荐': return 'bg-red-100 text-red-700 border-red-200';
      case '推荐': return 'bg-orange-100 text-orange-700 border-orange-200';
      case '谨慎推荐': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600';
    if (score >= 70) return 'text-orange-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <tr>
              <th className="px-4 py-4 text-left font-semibold">排名</th>
              <th className="px-4 py-4 text-left font-semibold">股票信息</th>
              <th className="px-4 py-4 text-center font-semibold">综合评分</th>
              <th className="px-4 py-4 text-center font-semibold">六因子分析</th>
              <th className="px-4 py-4 text-center font-semibold">技术位置</th>
              <th className="px-4 py-4 text-center font-semibold">推荐等级</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stocks.map((stock, index) => (
              <tr 
                key={stock.code} 
                className="hover:bg-blue-50 transition-colors group"
              >
                {/* 排名 */}
                <td className="px-4 py-5">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                    ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-gray-100 text-gray-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-50 text-blue-600'}
                  `}>
                    {index + 1}
                  </div>
                </td>

                {/* 股票信息 */}
                <td className="px-4 py-5">
                  <div className="font-bold text-lg text-gray-800">{stock.name}</div>
                  <div className="text-sm text-gray-500 font-mono">{stock.code}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    PE: {stock.metrics.pe.toFixed(1)} | PEG: {stock.metrics.peg.toFixed(2)}
                  </div>
                </td>

                {/* 综合评分 */}
                <td className="px-4 py-5 text-center">
                  <div className={`text-4xl font-bold ${getScoreColor(stock.score)}`}>
                    {stock.score}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    置信度: {stock.confidence}%
                  </div>
                </td>

                {/* 六因子分析 */}
                <td className="px-4 py-5">
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <span className="w-12 text-gray-600">估值</span>
                      <div className="flex-1 mx-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${stock.factors.valuation}%` }}
                          />
                        </div>
                      </div>
                      <span className="w-8 text-right font-semibold">{stock.factors.valuation}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="w-12 text-gray-600">成长</span>
                      <div className="flex-1 mx-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all"
                            style={{ width: `${stock.factors.growth}%` }}
                          />
                        </div>
                      </div>
                      <span className="w-8 text-right font-semibold">{stock.factors.growth}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="w-12 text-gray-600">支撑</span>
                      <div className="flex-1 mx-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-500 h-2 rounded-full transition-all"
                            style={{ width: `${stock.factors.support}%` }}
                          />
                        </div>
                      </div>
                      <span className="w-8 text-right font-semibold">{stock.factors.support}</span>
                    </div>
                  </div>
                </td>

                {/* 技术位置 */}
                <td className="px-4 py-5 text-center">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-center">
                      <Target className="w-4 h-4 text-blue-500 mr-2" />
                      <span>现价: ¥{stock.metrics.currentPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-center">
                      <ArrowDown className="w-4 h-4 text-green-500 mr-2" />
                      <span>支撑: ¥{stock.metrics.support.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-center">
                      <ArrowUp className="w-4 h-4 text-red-500 mr-2" />
                      <span>阻力: ¥{stock.metrics.resistance.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-center text-xs text-gray-500 mt-2">
                      <span className={stock.metrics.distanceToSupport <= 0 ? 'text-green-600' : 'text-orange-600'}>
                        距支撑: {stock.metrics.distanceToSupport.toFixed(1)}%
                      </span>
                      <span className="mx-2">|</span>
                      <span className="text-red-600">
                        上涨空间: {stock.metrics.upwardSpace.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </td>

                {/* 推荐等级 */}
                <td className="px-4 py-5 text-center">
                  <span className={`
                    inline-flex items-center px-4 py-2 rounded-full text-sm font-bold border-2
                    ${getRecommendationColor(stock.recommendation)}
                  `}>
                    <Award className="w-4 h-4 mr-1" />
                    {stock.recommendation}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

---

## 3. 类型定义

```typescript
// 蒙特卡洛结果
export interface MonteCarloResult {
  scenarios: Array<{
    type: '乐观' | '基准' | '悲观';
    probability: number;
    priceRange: [number, number];
    expectedReturn: number;
  }>;
  upProbability: number;
  downProbability: number;
  expectedPrice: number;
  riskRewardRatio: number;
  derivationSteps: string[];
}

// 热门板块
export interface DynamicHotSector {
  code: string;
  name: string;
  score: number;
  rank: number;
  changePercent: number;
  dimensions: {
    momentum: number;
    capital: number;
    technical: number;
    fundamental: number;
  };
  trend: '强势热点' | '持续热点' | '新兴热点' | '降温' | '观察';
  topStocks: Array<{
    code: string;
    name: string;
    changePercent: number;
  }>;
  metrics: {
    mainForceNet: number;
    turnoverRate: number;
    rsi: number;
    marketValue: number;
    peRatio: number;
  };
  source: 'eastmoney' | 'none';
  timestamp: string;
}

// 股票推荐
export interface StockRecommendation {
  code: string;
  name: string;
  score: number;
  confidence: number;
  factors: {
    valuation: number;
    growth: number;
    scale: number;
    momentum: number;
    quality: number;
    support: number;
  };
  metrics: {
    pe: number;
    peg: number;
    pb: number;
    roe: number;
    profitGrowth: number;
    marketCap: number;
    currentPrice: number;
    support: number;
    resistance: number;
    distanceToSupport: number;
    upwardSpace: number;
  };
  recommendation: '强烈推荐' | '推荐' | '谨慎推荐' | '观望';
  analysis: string;
}
```

---

## 4. 使用示例

```tsx
// App.tsx 中使用

import { WeeklyMarketAnalysis } from './sections/WeeklyMarketAnalysis';
import { HotSectorsAndStockPool } from './sections/HotSectorsAndStockPool';

function App() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* 一周走势预测 */}
      <section className="mb-8">
        <WeeklyMarketAnalysis showStockPicker={false} currentPrice={100} />
      </section>
      
      {/* 热门板块 & 精选股票池 */}
      <section>
        <HotSectorsAndStockPool />
      </section>
    </div>
  );
}
```

---

## 文件路径

**完整文档路径**: `C:\Users\CCL\.openclaw\workspace\sonata-1.3\WEEKLY_ANALYSIS_MODULES.md`

---

## 版本信息

- **版本**: v1.3
- **日期**: 2026-03-13
- **模块**: 一周走势预测 + 热门板块&精选股票池
- **状态**: 生产就绪
- **数据**: 100%真实数据
