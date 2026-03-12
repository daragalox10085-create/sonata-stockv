import { useState, useMemo } from 'react';
import { StockData, KLinePoint } from '../contexts/StockContext';

interface MonteCarloPredictionProps {
  data: StockData;
  compact?: boolean;
}

interface Scenario {
  name: string;
  probability: number;
  targetPrice: number;
  percentile: number;
  color: 'green' | 'blue' | 'red';
}

interface DerivationStep {
  title: string;
  value: string;
  detail?: string;
}

interface SimulationResult {
  upProbability: number;
  downProbability: number;
  scenarios: Scenario[];
  meanPrice: number;
  confidenceInterval: [number, number];
  derivation: DerivationStep[];
  gbmParams: {
    drift: number;
    volatility: number;
    meanReturn: number;
  };
}

/**
 * Box-Muller 变换生成标准正态分布随机数
 */
function boxMullerRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * 几何布朗运动蒙特卡洛模拟
 * 
 * 模型: dS = μS dt + σS dW
 * 离散化: S(t+Δt) = S(t) * exp((μ - 0.5σ²)Δt + σ√Δt * Z)
 * 
 * 其中:
 * - μ: 日均收益率 (drift)
 * - σ: 日波动率 (volatility)
 * - Z: 标准正态分布随机变量
 */
function runSimulation(currentPrice: number, kLineData: KLinePoint[]): SimulationResult {
  const historicalData = kLineData.slice(-360);
  const dataPoints = historicalData.length;
  
  // 数据不足时使用保守估计
  if (dataPoints < 30) {
    return {
      upProbability: 50,
      downProbability: 50,
      scenarios: [
        { name: '乐观情景', probability: 20, targetPrice: currentPrice * 1.08, percentile: 80, color: 'green' },
        { name: '基准情景', probability: 50, targetPrice: currentPrice * 1.02, percentile: 50, color: 'blue' },
        { name: '悲观情景', probability: 30, targetPrice: currentPrice * 0.94, percentile: 20, color: 'red' }
      ],
      meanPrice: currentPrice,
      confidenceInterval: [currentPrice * 0.9, currentPrice * 1.1],
      derivation: [
        { title: '数据不足', value: `${dataPoints}天`, detail: '使用保守估计' }
      ],
      gbmParams: { drift: 0, volatility: 0.02, meanReturn: 0 }
    };
  }
  
  // Step 1: 计算每日收益率
  const dailyReturns: number[] = [];
  for (let i = 1; i < historicalData.length; i++) {
    const prev = historicalData[i - 1].close;
    const curr = historicalData[i].close;
    if (prev > 0) dailyReturns.push((curr - prev) / prev);
  }
  
  // Step 2: 计算统计参数
  const meanReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / dailyReturns.length;
  const volatility = Math.sqrt(variance);
  
  // Step 3: 伊藤引理修正漂移项
  // drift = μ - 0.5σ²
  const drift = meanReturn - 0.5 * variance;
  
  // Step 4: 蒙特卡洛模拟 (10000次路径)
  const simulatedPrices: number[] = [];
  const daysToSimulate = 5; // 一周
  
  for (let sim = 0; sim < 10000; sim++) {
    let price = currentPrice;
    for (let day = 0; day < daysToSimulate; day++) {
      // 使用 Box-Muller 生成标准正态分布随机数
      const z = boxMullerRandom();
      // GBM 离散化公式
      price *= Math.exp(drift + volatility * z);
    }
    simulatedPrices.push(price);
  }
  
  // Step 5: 统计分析
  simulatedPrices.sort((a, b) => a - b);
  const upCount = simulatedPrices.filter(p => p > currentPrice).length;
  const meanPrice = simulatedPrices.reduce((a, b) => a + b, 0) / simulatedPrices.length;
  
  // 计算百分位数
  const optimisticPrice = simulatedPrices[8000];  // 80%分位
  const baselinePrice = simulatedPrices[5000];    // 50%分位 (中位数)
  const pessimisticPrice = simulatedPrices[2000]; // 20%分位
  
  // 构建推导过程
  const derivation: DerivationStep[] = [
    {
      title: '历史数据',
      value: `${dataPoints}天`,
      detail: `使用过去${dataPoints}个交易日计算参数`
    },
    {
      title: '日均收益率 μ',
      value: `${(meanReturn * 100).toFixed(4)}%`,
      detail: `μ = Σ(rᵢ) / n = ${dailyReturns.length}个收益率的平均值`
    },
    {
      title: '日波动率 σ',
      value: `${(volatility * 100).toFixed(4)}%`,
      detail: `σ = √[Σ(rᵢ-μ)²/n] = 收益率标准差`
    },
    {
      title: '年化波动率',
      value: `${(volatility * Math.sqrt(252) * 100).toFixed(2)}%`,
      detail: `σ_annual = σ × √252`
    },
    {
      title: '漂移项 (伊藤引理)',
      value: `${(drift * 100).toFixed(4)}%`,
      detail: `drift = μ - 0.5σ² = ${(meanReturn * 100).toFixed(4)}% - 0.5×${(variance * 10000).toFixed(4)}%`
    },
    {
      title: '模拟参数',
      value: '10000次 × 5天',
      detail: '使用Box-Muller变换生成标准正态分布随机数'
    },
    {
      title: '上涨概率',
      value: `${Math.round((upCount / 10000) * 100)}%`,
      detail: `${upCount}次模拟最终价格 > 当前价格${currentPrice.toFixed(2)}`
    },
    {
      title: '目标价格 (80%分位)',
      value: `¥${optimisticPrice.toFixed(2)}`,
      detail: '80%的模拟结果低于此价格'
    },
    {
      title: '目标价格 (50%分位)',
      value: `¥${baselinePrice.toFixed(2)}`,
      detail: '中位数价格'
    },
    {
      title: '目标价格 (20%分位)',
      value: `¥${pessimisticPrice.toFixed(2)}`,
      detail: '20%的模拟结果低于此价格'
    }
  ];
  
  return {
    upProbability: Math.round((upCount / 10000) * 100),
    downProbability: Math.round(((10000 - upCount) / 10000) * 100),
    scenarios: [
      { name: '乐观情景', probability: 20, targetPrice: optimisticPrice, percentile: 80, color: 'green' },
      { name: '基准情景', probability: 50, targetPrice: baselinePrice, percentile: 50, color: 'blue' },
      { name: '悲观情景', probability: 30, targetPrice: pessimisticPrice, percentile: 20, color: 'red' }
    ],
    meanPrice,
    confidenceInterval: [simulatedPrices[500], simulatedPrices[9500]],
    derivation,
    gbmParams: { drift, volatility, meanReturn }
  };
}

export default function MonteCarloPrediction({ data, compact }: MonteCarloPredictionProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showDerivation, setShowDerivation] = useState(false);

  const result = useMemo(() => {
    return runSimulation(data.currentPrice, data.kLineData);
  }, [data.currentPrice, data.kLineData]);

  const { upProbability, downProbability, scenarios, meanPrice, confidenceInterval, derivation, gbmParams } = result;

  if (compact) {
    return (
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">蒙特卡洛预测</h3>
          <span className="text-xs text-gray-500">5 日预测</span>
        </div>
        
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-green-600 font-medium">上涨 {upProbability}%</span>
          <span className="text-red-600 font-medium">下跌 {downProbability}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden flex mb-3">
          <div className="h-full bg-green-500" style={{ width: `${upProbability}%` }} />
          <div className="h-full bg-red-500" style={{ width: `${downProbability}%` }} />
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-center">
          {scenarios.map((s) => (
            <div key={s.name} className={`p-2 rounded ${
              s.color === 'green' ? 'bg-green-50' : s.color === 'blue' ? 'bg-blue-50' : 'bg-red-50'
            }`}>
              <div className="text-xs text-gray-600 mb-1">{s.name}</div>
              <div className={`text-sm font-bold ${
                s.color === 'green' ? 'text-green-600' : s.color === 'blue' ? 'text-blue-600' : 'text-red-600'
              }`}>
                ¥{s.targetPrice.toFixed(0)}
              </div>
              <div className="text-xs text-gray-500">{s.probability}%</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span>📊</span>
            一周走势预测
          </h2>
          <p className="text-sm text-gray-500 mt-1">蒙特卡洛模拟 · 几何布朗运动模型</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDerivation(!showDerivation)}
            className="px-3 py-1.5 text-sm bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md transition-colors font-medium flex items-center gap-1"
          >
            <span>🔍</span>
            {showDerivation ? '收起推导' : '推导详情'}
          </button>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-3 py-1.5 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors font-medium"
          >
            {showDetails ? '收起' : '详情'}
          </button>
        </div>
      </div>

      {/* 概率条 - 仿 K 线图样式 */}
      <div className="mb-6 p-4 bg-gradient-to-r from-green-50 via-white to-red-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="text-sm font-medium text-green-700">上涨 {upProbability}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-red-700">下跌 {downProbability}%</span>
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
          </div>
        </div>
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500" 
            style={{ width: `${upProbability}%` }} 
          />
          <div 
            className="h-full bg-gradient-to-r from-red-400 to-red-500 transition-all duration-500" 
            style={{ width: `${downProbability}%` }} 
          />
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          基于 {Math.min(data.kLineData.length, 360)} 天历史数据 · GBM模型
        </p>
      </div>

      {/* 推导过程 */}
      {showDerivation && (
        <div className="mb-6 bg-slate-50 rounded-lg p-4 border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <span>🔍</span>
            推导过程
          </h3>
          <div className="space-y-2">
            {derivation.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3 p-2 bg-white rounded border border-slate-100">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600">{step.title}</span>
                    <span className="text-xs font-bold text-slate-800">{step.value}</span>
                  </div>
                  {step.detail && (
                    <p className="text-xs text-slate-500 mt-1">{step.detail}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* GBM 公式说明 */}
          <div className="mt-4 p-3 bg-white rounded border border-slate-200">
            <div className="text-xs font-medium text-slate-700 mb-2">几何布朗运动 (GBM) 模型</div>
            <div className="text-xs text-slate-600 font-mono bg-slate-100 p-2 rounded">
              dS = μS dt + σS dW
            </div>
            <div className="text-xs text-slate-600 font-mono bg-slate-100 p-2 rounded mt-1">
              S(t+Δt) = S(t) × exp[(μ - 0.5σ²)Δt + σ√Δt × Z]
            </div>
            <div className="text-xs text-slate-500 mt-2">
              其中: μ={gbmParams.meanReturn.toFixed(6)}, σ={gbmParams.volatility.toFixed(6)}, drift={gbmParams.drift.toFixed(6)}
            </div>
          </div>
        </div>
      )}

      {/* 情景卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {scenarios.map((scenario) => (
          <div
            key={scenario.name}
            className={`rounded-lg p-4 border-2 ${
              scenario.color === 'green' 
                ? 'bg-green-50 border-green-200' 
                : scenario.color === 'blue' 
                ? 'bg-blue-50 border-blue-200' 
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{scenario.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                scenario.color === 'green' 
                  ? 'bg-green-200 text-green-800' 
                  : scenario.color === 'blue' 
                  ? 'bg-blue-200 text-blue-800' 
                  : 'bg-red-200 text-red-800'
              }`}>
                {scenario.probability}%
              </span>
            </div>
            <div className={`text-2xl font-bold mb-1 ${
              scenario.color === 'green' 
                ? 'text-green-600' 
                : scenario.color === 'blue' 
                ? 'text-blue-600' 
                : 'text-red-600'
            }`}>
              ¥{scenario.targetPrice.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500">
              {scenario.percentile}% 分位数
            </div>
          </div>
        ))}
      </div>

      {/* 统计信息 */}
      {showDetails && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">模拟统计</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-500 mb-1">平均价格</div>
              <div className="font-medium text-gray-900">¥{meanPrice.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">95% 置信区间</div>
              <div className="font-medium text-gray-900">
                ¥{confidenceInterval[0].toFixed(0)} - ¥{confidenceInterval[1].toFixed(0)}
              </div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">当前价格</div>
              <div className="font-medium text-gray-900">¥{data.currentPrice.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">数据基础</div>
              <div className="font-medium text-gray-900">{Math.min(data.kLineData.length, 360)}天</div>
            </div>
          </div>
        </div>
      )}

      {/* 综合建议 */}
      <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <div className="text-sm font-medium text-amber-800 mb-1">综合建议</div>
        <p className="text-sm text-amber-700">
          {upProbability > 60 
            ? `上涨概率${upProbability}%较高，建议积极关注，基准情景目标价¥${scenarios[1].targetPrice.toFixed(0)}` 
            : upProbability > 40 
            ? `涨跌概率接近，建议观望等待，基准情景目标价¥${scenarios[1].targetPrice.toFixed(0)}` 
            : `下跌概率${downProbability}%较高，建议谨慎操作，基准情景目标价¥${scenarios[1].targetPrice.toFixed(0)}`}
        </p>
      </div>
    </div>
  );
}
