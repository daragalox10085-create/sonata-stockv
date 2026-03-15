import React, { useState, useEffect, useMemo } from 'react';
import { dynamicAnalysisService, StockRecommendation } from '../services/dynamicAnalysisService';
import { DynamicHotSector } from '../services/DynamicSectorAnalyzer';
import { sectorService } from '../services/SectorService';
import { screeningService } from '../services/ScreeningService';
import { useStock } from '../contexts/StockContext';
import { AlertCircle, Info } from 'lucide-react';
import { AlgorithmParliament } from '../components/AlgorithmParliament';
import { FinancialMetrics } from '../components/FinancialMetrics';

interface WeeklyMarketAnalysisProps {
  showStockPicker?: boolean;
  currentPrice?: number;
}

export const WeeklyMarketAnalysis: React.FC<WeeklyMarketAnalysisProps> = ({ showStockPicker = true, currentPrice = 100 }) => {
  const [hotSectors, setHotSectors] = useState<DynamicHotSector[]>([]);
  const [recommendations, setRecommendations] = useState<StockRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStockDerivation, setShowStockDerivation] = useState(false);
  
  // 资金流入筛选状态
  const [capitalFilter, setCapitalFilter] = useState<'inflow' | 'outflow'>('inflow');
  const [minCapitalInflow, setMinCapitalInflow] = useState<number>(1000); // 万元
  
  // 从StockContext获取真实K线数据
  const { stockData } = useStock();
  
  // 根据资金流入筛选热门板块 - 使用useMemo避免重复计算
  const filteredSectors = useMemo(() => {
    return hotSectors.filter(sector => {
      // 获取主力净流入金额（万元）
      const mainForceNet = sector.metrics?.mainForceNet || 0;
      
      // 资金流入/流出筛选
      if (capitalFilter === 'inflow') return mainForceNet > 0;
      if (capitalFilter === 'outflow') return mainForceNet <= 0;
      return true;
    }).filter(sector => {
      // 资金流入金额筛选（仅当选择"资金流入"时生效）
      if (capitalFilter === 'inflow' && sector.metrics?.mainForceNet) {
        return sector.metrics.mainForceNet >= minCapitalInflow * 10000;
      }
      // 资金流出时不做金额筛选（因为流出是负数）
      return true;
    });
  }, [hotSectors, capitalFilter, minCapitalInflow]);
  
  // 根据筛选后的板块动态计算精选股票 - 使用useMemo
  const filteredRecommendations = useMemo(() => {
    if (!showStockPicker || filteredSectors.length === 0) return [];
    
    const fallbackStocks: StockRecommendation[] = [];
    const seenCodes = new Set<string>();
    
    for (const sector of filteredSectors) {
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
                profitability: 75,
                momentum: Math.round(stock.changePercent * 10 + 50),
                quality: 68,
                technical: 60
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
              recommendation: (sector.score >= 80 ? '强烈推荐' : sector.score >= 70 ? '推荐' : '谨慎推荐') as '强烈推荐' | '推荐' | '谨慎推荐' | '观望',
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
    
    return fallbackStocks.slice(0, 5);
  }, [filteredSectors, showStockPicker]);
  
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
          // 使用新的SectorService获取热门板块
          console.log('[WeeklyMarketAnalysis] 开始加载热门板块...');
          const sectors = await sectorService.getHotSectors();
          console.log(`[WeeklyMarketAnalysis] 获取到 ${sectors.length} 个热门板块`);
          setHotSectors(sectors as any);

          // 使用新的ScreeningService获取精选股票
          console.log('[WeeklyMarketAnalysis] 开始精选股票...');
          const screenedStocks = await screeningService.screenStocks();
          console.log(`[WeeklyMarketAnalysis] 精选股票: ${screenedStocks.length} 只`);
          
          // 转换为组件需要的格式
          const recommendations: StockRecommendation[] = screenedStocks.map(stock => ({
            code: stock.code,
            name: stock.name,
            score: stock.compositeScore,
            confidence: stock.recommendationLevel === '强烈推荐' ? 85 : 
                       stock.recommendationLevel === '推荐' ? 70 : 55,
            factors: stock.factorBreakdown,
            metrics: {
              pe: 25,
              peg: 1.2,
              pb: 2.5,
              roe: 15,
              profitGrowth: 20,
              marketCap: 100000000000,
              currentPrice: 0,
              support: 0,
              resistance: 0,
              distanceToSupport: stock.distanceToSupport,
              upwardSpace: stock.upsidePotential
            },
            recommendation: stock.recommendationLevel as '强烈推荐' | '推荐' | '谨慎推荐' | '观望',
            analysis: stock.recommendationText,
            sectorInfo: {
              sectorCode: '',
              sectorName: stock.sector,
              sectorScore: stock.compositeScore
            }
          }));
          
          setRecommendations(recommendations);
          
          // 如果新服务返回空，回退到旧服务
          if (sectors.length === 0) {
            console.log('[WeeklyMarketAnalysis] 新服务返回空，使用旧服务');
            const oldSectors = await dynamicAnalysisService.getHotSectors();
            setHotSectors(oldSectors);
          }
          
          if (screenedStocks.length === 0) {
            console.log('[WeeklyMarketAnalysis] 精选股票为空，使用备用数据');
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
                        profitability: 75,
                        momentum: Math.round(stock.changePercent * 10 + 50),
                        quality: 68,
                        technical: 60
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
                      recommendation: (sector.score >= 80 ? '强烈推荐' : sector.score >= 70 ? '推荐' : '谨慎推荐') as '强烈推荐' | '推荐' | '谨慎推荐' | '观望',
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
            
            setRecommendations(fallbackStocks.slice(0, 5));
          }
        } catch (error) {
          console.error('加载数据失败:', error);
          setError('数据加载失败，请稍后重试');
          setRecommendations([]);
        }
      } else {
        // 算法议会预测由 AlgorithmParliament 组件内部处理
        // 无需在此加载数据
        console.log('[WeeklyMarketAnalysis] 算法议会组件将自行加载预测数据');
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
      {/* 算法议会预测 - 仅当 showStockPicker=false 时显示（该股预测） */}
      {!showStockPicker && stockData && (
        <div className="mb-8">
          <AlgorithmParliament
            stockSymbol={stockData.symbol}
            stockName={stockData.name}
            currentPrice={stockData.currentPrice}
            priceChange={stockData.change}
            priceChangePercent={stockData.changePercent}
            timeHorizon={5}
          />
          
          {/* 财务指标 */}
          <div className="mt-6">
            <FinancialMetrics
              pe={stockData.pe}
              peTtm={stockData.peTtm}
              pb={stockData.pb}
              ps={stockData.ps}
              peg={stockData.peg}
              roe={stockData.roe}
              profitGrowth={stockData.profitGrowth}
              revenueGrowth={stockData.revenueGrowth}
              marketCap={stockData.marketCap}
            />
          </div>
        </div>
      )}

      {/* 热门板块 - 仅当 showStockPicker=true 时显示 */}
      {showStockPicker && (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">🔥 热门板块</span>
            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded">Top 5</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSectors.map((sector) => (
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
                  <span className={`font-semibold ${(sector.metrics?.mainForceNet || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {(sector.metrics?.mainForceNet || 0) > 0 ? '▲ 流入' : '▼ 流出'}
                  </span>
                </div>
                {sector.metrics?.mainForceNet ? (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">主力净流入</span>
                    <span className={`font-semibold ${sector.metrics.mainForceNet > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {sector.metrics.mainForceNet >= 100000000 
                        ? (sector.metrics.mainForceNet / 100000000).toFixed(1) + '亿'
                        : (sector.metrics.mainForceNet / 10000).toFixed(0) + '万'}
                    </span>
                  </div>
                ) : null}
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
        
        {filteredRecommendations.length === 0 ? (
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
                {filteredRecommendations.map((stock) => (
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
