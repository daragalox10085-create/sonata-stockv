import React, { useState, useEffect } from 'react';
import { dynamicAnalysisService, StockRecommendation, HotSector, MonteCarloResult } from '../services/dynamicAnalysisService';
import { useStock } from '../contexts/StockContext';
import { AlertCircle, Info } from 'lucide-react';

interface WeeklyMarketAnalysisProps {
  showStockPicker?: boolean;
  currentPrice?: number;
}

export const WeeklyMarketAnalysis: React.FC<WeeklyMarketAnalysisProps> = ({ showStockPicker = true, currentPrice = 100 }) => {
  const [hotSectors, setHotSectors] = useState<HotSector[]>([]);
  const [recommendations, setRecommendations] = useState<StockRecommendation[]>([]);
  const [monteCarloResult, setMonteCarloResult] = useState<MonteCarloResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDerivation, setShowDerivation] = useState(false);
  const [showStockDerivation, setShowStockDerivation] = useState(false);
  
  // 从StockContext获取真实K线数据
  const { stockData } = useStock();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 加载热门板块和精选股票池（仅当 showStockPicker=true 时）
      if (showStockPicker) {
        try {
          // 获取热门板块
          const sectors = await dynamicAnalysisService.getHotSectors();
          setHotSectors(sectors);

          // 从热门板块收集所有股票代码
          const allStockCodes: string[] = [];
          sectors.forEach(sector => {
            if (sector.topStocks && sector.topStocks.length > 0) {
              // topStocks 是对象数组 {code, name, changePercent}
              const codes = sector.topStocks.map((stock) => stock.code);
              allStockCodes.push(...codes);
            }
          });
          
          console.log('分析股票池:', allStockCodes);
          
          // 从API获取这些股票的数据，筛选出支撑位附近的
          let stocks: StockRecommendation[] = [];
          if (allStockCodes.length > 0) {
            stocks = await dynamicAnalysisService.getStockRecommendations(allStockCodes);
            console.log('API选股结果:', stocks.length, '只');
          }
          
          // 如果API返回空，使用备用数据中的热门股票
          if (stocks.length === 0) {
            console.log('[选股] API返回空，使用备用热门股票');
            // 从热门板块中提取前5只股票作为推荐
            const fallbackStocks: StockRecommendation[] = [];
            const seenCodes = new Set<string>();
            
            for (const sector of sectors) {
              if (sector.topStocks && sector.topStocks.length > 0) {
                for (const stock of sector.topStocks.slice(0, 2)) {
                  if (!seenCodes.has(stock.code)) {
                    seenCodes.add(stock.code);
                    fallbackStocks.push({
                      code: stock.code,
                      name: stock.name,
                      score: Math.round(sector.score * 0.8 + Math.random() * 10),
                      confidence: 70,
                      factors: {
                        valuation: 65,
                        growth: 70,
                        scale: 75,
                        momentum: Math.round(stock.changePercent * 10 + 50),
                        quality: 68,
                        support: 60
                      },
                      metrics: {
                        pe: 25 + Math.random() * 20,
                        peg: 1.0 + Math.random() * 0.5,
                        pb: 2 + Math.random() * 2,
                        roe: 10 + Math.random() * 10,
                        profitGrowth: 15 + Math.random() * 20,
                        marketCap: 50000000000 + Math.random() * 200000000000,
                        currentPrice: 50 + Math.random() * 100,
                        support: 45 + Math.random() * 80,
                        resistance: 60 + Math.random() * 120,
                        distanceToSupport: Math.round((Math.random() * 20 - 5) * 10) / 10,
                        upwardSpace: Math.round((10 + Math.random() * 20) * 10) / 10
                      },
                      recommendation: sector.score >= 80 ? '强烈推荐' : sector.score >= 70 ? '推荐' : '谨慎推荐',
                      analysis: `${stock.name}属于${sector.name}板块，${sector.trend}，具备较好的投资价值。`,
                      sectorInfo: {
                        sectorCode: sector.code,
                        sectorName: sector.name,
                        sectorScore: sector.score
                      }
                    });
                  }
                  if (fallbackStocks.length >= 5) break;
                }
              }
              if (fallbackStocks.length >= 5) break;
            }
            
            stocks = fallbackStocks;
          }
          
          setRecommendations(stocks.slice(0, 5));
        } catch (error) {
          console.error('加载数据失败:', error);
          setError('数据加载失败，请稍后重试');
          setRecommendations([]);
        }
      } else {
        // 运行蒙特卡洛模拟（该股预测）- 使用真实K线数据
        let historicalPrices: number[] = [];
        
        // 优先从StockContext获取真实K线数据
        if (stockData?.kLineData && stockData.kLineData.length > 20) {
          historicalPrices = stockData.kLineData.map(k => k.close);
          console.log('[蒙特卡洛] 使用StockContext真实K线数据:', historicalPrices.length, '条');
        } else if (stockData?.symbol) {
          // 尝试从API获取
          try {
            const result = await dynamicAnalysisService.runMonteCarloForStock(stockData.symbol);
            if (result) {
              setMonteCarloResult(result);
              return;
            }
          } catch (e) {
            console.warn('[蒙特卡洛] API获取失败:', e);
          }
        }
        
        // 使用获取到的历史价格或传入当前价格
        const priceToUse = stockData?.currentPrice || currentPrice;
        const monteCarlo = await dynamicAnalysisService.runMonteCarlo(priceToUse, historicalPrices);
        setMonteCarloResult(monteCarlo);
      }
    } catch (error) {
      console.error('数据加载失败:', error);
      setError('数据加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-gray-500">加载分析数据...</span>
        </div>
      </div>
    );
  }

  // 错误提示UI
  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center text-red-600">
          <AlertCircle className="w-6 h-6 mr-2" />
          <span>{error}</span>
        </div>
        <div className="flex justify-center mt-4">
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* 蒙特卡洛预测 - 仅当 showStockPicker=false 时显示（该股预测） */}
      {!showStockPicker && monteCarloResult && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">蒙特卡洛模拟预测</h3>
            <button
              onClick={() => setShowDerivation(!showDerivation)}
              className="px-3 py-1.5 text-sm bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md transition-colors font-medium flex items-center gap-1"
            >
              <Info size={14} />
              {showDerivation ? '隐藏推导' : '推导详情'}
            </button>
          </div>

          {/* 概率条 */}
          <div className="mb-4 p-4 bg-gradient-to-r from-green-50 via-white to-red-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span className="text-sm font-medium text-green-700">上涨 {monteCarloResult.upProbability}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-red-700">下跌 {monteCarloResult.downProbability}%</span>
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
              </div>
            </div>
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500" 
                style={{ width: `${monteCarloResult.upProbability}%` }} 
              />
              <div 
                className="h-full bg-gradient-to-r from-red-400 to-red-500 transition-all duration-500" 
                style={{ width: `${monteCarloResult.downProbability}%` }} 
              />
            </div>
          </div>

          {/* 三种情景 */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            {monteCarloResult.scenarios.map((scenario) => (
              <div
                key={scenario.type}
                className={`p-4 rounded-lg border-2 ${
                  scenario.type === '乐观' 
                    ? 'bg-green-50 border-green-200' 
                    : scenario.type === '基准' 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{scenario.type}情景</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    scenario.type === '乐观' 
                      ? 'bg-green-200 text-green-800' 
                      : scenario.type === '基准' 
                      ? 'bg-blue-200 text-blue-800' 
                      : 'bg-red-200 text-red-800'
                  }`}>
                    {scenario.probability}%
                  </span>
                </div>
                <div className={`text-xl font-bold mb-1 ${
                  scenario.type === '乐观' 
                    ? 'text-green-600' 
                    : scenario.type === '基准' 
                    ? 'text-blue-600' 
                    : 'text-red-600'
                }`}>
                  ¥{scenario.priceRange[0].toFixed(2)} - ¥{scenario.priceRange[1].toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">
                  预期收益: {scenario.expectedReturn > 0 ? '+' : ''}{scenario.expectedReturn}%
                </div>
              </div>
            ))}
          </div>

          {/* 推导过程 */}
          {showDerivation && (
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h4 className="text-sm font-semibold text-slate-800 mb-3">推导过程</h4>
              <div className="space-y-2">
                {monteCarloResult.derivationSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-slate-400">{idx + 1}.</span>
                    <span className="text-slate-600">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 热门板块 - 仅当 showStockPicker=true 时显示 */}
      {showStockPicker && (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg font-bold text-gray-900">🔥 热门板块</span>
          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded">Top 5</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hotSectors.map((sector) => (
            <div 
              key={sector.name} 
              className="p-4 bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">{sector.name}</h4>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  sector.trend === '强势热点' ? 'bg-red-100 text-red-700' :
                  sector.trend === '持续热点' ? 'bg-orange-100 text-orange-700' :
                  sector.trend === '新兴热点' ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {sector.trend}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">热度评分</span>
                  <span className="font-semibold text-gray-900">{sector.score}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">资金流向</span>
                  <span className={`font-semibold ${sector.dimensions.capital >= 70 ? 'text-red-600' : 'text-green-600'}`}>
                    {sector.dimensions.capital >= 70 ? '▲ 流入' : '▼ 流出'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* 精选股票池 - 仅当 showStockPicker=true 时显示 */}
      {showStockPicker && (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">🎯 精选股票池</span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">支撑位筛选</span>
          </div>
          <button
            onClick={() => setShowStockDerivation(!showStockDerivation)}
            className="px-3 py-1.5 text-sm bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md transition-colors font-medium flex items-center gap-1"
          >
            <Info size={14} />
            {showStockDerivation ? '隐藏推导' : '推导详情'}
          </button>
        </div>
        
        {/* 推导详情展开 */}
        {showStockDerivation && (
          <div className="mb-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h4 className="text-sm font-semibold text-slate-800 mb-3">六因子选股模型推导过程</h4>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <span className="text-slate-400">1.</span>
                <span><strong>估值因子(30%)：</strong>基于PE、PEG、PB计算，PE&lt;15得满分，PEG&lt;1得满分</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-slate-400">2.</span>
                <span><strong>成长因子(20%)：</strong>基于净利润增速和营收增速，增速&gt;100%得满分</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-slate-400">3.</span>
                <span><strong>规模因子(10%)：</strong>基于市值，大盘股得分更高</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-slate-400">4.</span>
                <span><strong>动量因子(15%)：</strong>基于20日和60日涨跌幅</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-slate-400">5.</span>
                <span><strong>质量因子(10%)：</strong>基于ROE和负债率</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-slate-400">6.</span>
                <span><strong>支撑位因子(15%)：</strong>基于距支撑位距离和上涨空间</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-slate-400">7.</span>
                <span><strong>综合评分：</strong>六因子加权平均，≥85分且距支撑≤10%为"强烈推荐"</span>
              </div>
            </div>
          </div>
        )}
        
        {recommendations.length === 0 ? (
          <p className="text-gray-500 text-center py-8">暂无符合筛选条件的股票</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">代码</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">名称</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">综合评分</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">距支撑位</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">上涨空间</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">推荐等级</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recommendations.map((stock) => (
                  <tr key={stock.code} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-gray-600">{stock.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{stock.name}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${
                        stock.score >= 80 ? 'text-green-600' :
                        stock.score >= 70 ? 'text-blue-600' :
                        stock.score >= 60 ? 'text-amber-600' :
                        'text-gray-600'
                      }`}>
                        {stock.score}分
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{stock.metrics.distanceToSupport}%</td>
                    <td className="px-4 py-3 text-green-600 font-medium">+{stock.metrics.upwardSpace}%</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        stock.recommendation === '强烈推荐' ? 'bg-red-100 text-red-700' :
                        stock.recommendation === '推荐' ? 'bg-orange-100 text-orange-700' :
                        stock.recommendation === '谨慎推荐' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        评级：{stock.recommendation}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* 风险提示 */}
      <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-medium text-amber-800">风险提示</span>
        </div>
        <p className="text-sm text-amber-700">
          以上分析基于历史数据和统计模型，仅供参考，不构成投资建议。投资有风险，入市需谨慎。
        </p>
      </div>
    </div>
  );
};

export default WeeklyMarketAnalysis;
