// ============================================
// StockChart.tsx - 动态支撑位压力位实现 V2.3
// 功能：
// 1. 双层级动态支撑位（基于ATR，确保合理间距）
// 2. 动态压力位
// 3. 智能止损
// ============================================
import { useEffect, useRef, useState, useCallback } from 'react';
import * as echarts from 'echarts';
import { KLinePoint } from '../contexts/StockContext';

interface StockChartProps {
  data: KLinePoint[];
  currentPrice: number;
  stopLoss: number;
  support?: number;
  resistance?: number;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  entryPrice?: number;
}

export default function StockChart({ 
  data, currentPrice, stopLoss, support, resistance,
  isLoading = false, error = null, onRetry, entryPrice
}: StockChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  
  // 保存缩放状态 - 默认显示全部数据（一年）
  const [zoomState, setZoomState] = useState({ start: 0, end: 100 });
  
  // 双层级支撑位（基于ATR）
  const [support1, setSupport1] = useState(support || 0);
  const [support2, setSupport2] = useState(0);
  
  // 动态压力位
  const [dynamicResistance, setDynamicResistance] = useState(resistance || 0);
  
  // ATR值
  const [atrValue, setAtrValue] = useState(0);
  
  // 智能止损
  const [smartStopLoss, setSmartStopLoss] = useState(stopLoss);

  // ============================================
  // 核心算法1：计算ATR（平均真实波幅）
  // ============================================
  const calculateATR = useCallback((data: KLinePoint[], period: number = 14): number => {
    if (data.length < period) return 0;
    
    let atrSum = 0;
    for (let i = data.length - period; i < data.length; i++) {
      const high = data[i].high;
      const low = data[i].low;
      const prevClose = data[i - 1]?.close || data[i].open;
      
      // 真实波幅 = max(High-Low, |High-PrevClose|, |Low-PrevClose|)
      const tr1 = high - low;
      const tr2 = Math.abs(high - prevClose);
      const tr3 = Math.abs(low - prevClose);
      const trueRange = Math.max(tr1, tr2, tr3);
      
      atrSum += trueRange;
    }
    
    return atrSum / period;
  }, []);

  // ============================================
  // 核心算法2：基于ATR的双层级支撑位 + 压力位
  // ============================================
  const calculateATRLevels = useCallback((data: KLinePoint[], startIdx: number, endIdx: number) => {
    if (!data.length || startIdx >= endIdx) {
      return { support1: 0, support2: 0, resistance: 0, atr: 0 };
    }

    // 获取可见区域的数据
    const visibleData = data.slice(startIdx, endIdx + 1);
    
    // 计算ATR
    const atr = calculateATR(visibleData, 14);
    
    // 获取当前价格
    const currentClose = visibleData[visibleData.length - 1].close;
    
    // 获取可见区域的极值
    const highs = visibleData.map(d => d.high);
    const lows = visibleData.map(d => d.low);
    const maxHigh = Math.max(...highs);
    const minLow = Math.min(...lows);
    
    // 压力位 = 最高高点 或 当前价 + 1.5×ATR（取较高者）
    const resistanceFromHigh = maxHigh * 0.95; // 略低于最高高点
    const resistanceFromATR = currentClose + atr * 1.5;
    const finalResistance = Math.max(resistanceFromHigh, resistanceFromATR);
    
    // 支撑1 = 当前价 - 1×ATR（第一支撑，较近）
    const support1FromATR = currentClose - atr * 1;
    
    // 支撑2 = 最低低点 或 当前价 - 2×ATR（取较低者，较远）
    const support2FromLow = minLow;
    const support2FromATR = currentClose - atr * 2;
    const finalSupport2 = Math.min(support2FromLow, support2FromATR);
    
    // 确保支撑1 > 支撑2（支撑1更近，支撑2更远）
    const finalSupport1 = Math.max(support1FromATR, finalSupport2 * 1.02);
    
    return {
      support1: finalSupport1,
      support2: finalSupport2,
      resistance: finalResistance,
      atr
    };
  }, [calculateATR]);

  // ============================================
  // 核心算法3：智能止损计算
  // ============================================
  const calculateSmartStopLoss = useCallback((data: KLinePoint[], support2: number, atr: number) => {
    if (!data.length) return stopLoss;
    
    // 1. 固定止损
    const fixedStop = stopLoss;
    
    // 2. 移动止损（最高点回撤5%）
    const recentData = data.slice(-20);
    const recentHighs = recentData.map(d => d.high);
    const highest = Math.max(...recentHighs);
    const trailingStop = highest * 0.95;
    
    // 3. 支撑位止损（支撑2下方1×ATR）
    const supportStop = support2 - atr * 0.5;
    
    // 4. 入场价止损（如果有）
    let entryStop = 0;
    if (entryPrice && entryPrice > 0) {
      entryStop = entryPrice * 0.92;
    }
    
    // 智能止损 = 取所有止损方式的最大值（但不超过现价的95%）
    let smartStop = Math.max(fixedStop, trailingStop, supportStop);
    
    if (entryStop > 0) {
      smartStop = Math.max(smartStop, entryStop);
    }
    
    // 确保止损 < 当前价（限制在85%-95%之间）
    const minStop = currentPrice * 0.85;
    const maxStop = currentPrice * 0.95;
    
    return Math.max(minStop, Math.min(smartStop, maxStop));
  }, [stopLoss, entryPrice, currentPrice]);

  // ============================================
  // 生成标注线数据
  // ============================================
  const getMarkLineData = useCallback(() => {
    const lines: any[] = [
      // 现价线
      {
        name: '现价',
        yAxis: currentPrice,
        lineStyle: { color: '#1E40AF', width: 2, type: 'solid' },
        label: { formatter: `现价 ¥${currentPrice.toFixed(2)}`, position: 'end', color: '#1E40AF', fontSize: 10 }
      },
    ];
    
    // 智能止损
    if (smartStopLoss > 0 && smartStopLoss < currentPrice) {
      lines.push({
        name: '止损',
        yAxis: smartStopLoss,
        lineStyle: { color: '#DC2626', width: 2, type: 'dashed' },
        label: { formatter: `止损 ¥${smartStopLoss.toFixed(2)}`, position: 'end', color: '#DC2626', fontSize: 10 }
      });
    }
    
    // 支撑1（较近，1×ATR）
    if (support1 > 0 && support1 < currentPrice) {
      lines.push({
        name: '支撑1',
        yAxis: support1,
        lineStyle: { color: '#10B981', width: 2, type: 'dotted' },
        label: { formatter: `支撑1 ¥${support1.toFixed(2)}`, position: 'end', color: '#10B981', fontSize: 10 }
      });
    }
    
    // 支撑2（较远，2×ATR或最低低点）
    if (support2 > 0 && support2 < currentPrice && support2 < support1) {
      lines.push({
        name: '支撑2',
        yAxis: support2,
        lineStyle: { color: '#059669', width: 1.5, type: 'dotted' },
        label: { formatter: `支撑2 ¥${support2.toFixed(2)}`, position: 'end', color: '#059669', fontSize: 9 }
      });
    }
    
    // 压力位
    if (dynamicResistance > 0 && dynamicResistance > currentPrice) {
      lines.push({
        name: '压力',
        yAxis: dynamicResistance,
        lineStyle: { color: '#F59E0B', width: 2, type: 'dotted' },
        label: { formatter: `压力 ¥${dynamicResistance.toFixed(2)}`, position: 'end', color: '#F59E0B', fontSize: 10 }
      });
    }
    
    return lines;
  }, [currentPrice, smartStopLoss, support1, support2, dynamicResistance]);

  // ============================================
  // 初始化图表
  // ============================================
  useEffect(() => {
    if (!chartRef.current) return;
    
    // 如果已有实例，先销毁
    if (chartInstance.current) {
      try {
        chartInstance.current.dispose();
      } catch (e) {
        console.warn('[StockChart] 销毁旧图表实例时出错:', e);
      }
      chartInstance.current = null;
    }
    
    // 创建新实例
    chartInstance.current = echarts.init(chartRef.current, 'light', { renderer: 'canvas' });
    
    return () => {
      if (chartInstance.current) {
        try {
          // 移除所有事件监听器
          chartInstance.current.off('dataZoom');
          // 销毁实例
          chartInstance.current.dispose();
        } catch (e) {
          console.warn('[StockChart] 销毁图表实例时出错:', e);
        }
        chartInstance.current = null;
      }
    };
  }, []);

  // ============================================
  // 核心：监听缩放事件并动态更新
  // ============================================
  useEffect(() => {
    if (!chartInstance.current || !data.length) return;
    const chart = chartInstance.current;

    // 定义事件处理函数
    const handleDataZoom = (params: any) => {
      const option = chart.getOption();
      const dataZoomOption = option?.dataZoom;
      const dataZoom = Array.isArray(dataZoomOption) ? dataZoomOption[0] : dataZoomOption;
      const start = dataZoom?.start ?? 50;
      const end = dataZoom?.end ?? 100;
      
      setZoomState({ start, end });

      // 计算当前可见的数据索引
      const startIndex = Math.floor((start / 100) * data.length);
      const endIndex = Math.floor((end / 100) * data.length);

      // 基于ATR计算支撑/压力
      const levels = calculateATRLevels(data, startIndex, endIndex);
      setSupport1(levels.support1);
      setSupport2(levels.support2);
      setDynamicResistance(levels.resistance);
      setAtrValue(levels.atr);
      
      // 计算智能止损
      const stopLoss = calculateSmartStopLoss(data, levels.support2, levels.atr);
      setSmartStopLoss(stopLoss);
    };

    // 监听 dataZoom 事件
    chart.on('dataZoom', handleDataZoom);

    // 初始计算
    const initialStartIdx = Math.floor((zoomState.start / 100) * data.length);
    const initialEndIdx = Math.floor((zoomState.end / 100) * data.length);
    
    const initialLevels = calculateATRLevels(data, initialStartIdx, initialEndIdx);
    setSupport1(initialLevels.support1);
    setSupport2(initialLevels.support2);
    setDynamicResistance(initialLevels.resistance);
    setAtrValue(initialLevels.atr);
    
    const initialStopLoss = calculateSmartStopLoss(data, initialLevels.support2, initialLevels.atr);
    setSmartStopLoss(initialStopLoss);

    return () => {
      // 安全地移除事件监听器
      if (chart && !chart.isDisposed()) {
        chart.off('dataZoom', handleDataZoom);
      }
    };
  }, [data, calculateATRLevels, calculateSmartStopLoss, zoomState.start, zoomState.end]);

  // ============================================
  // 更新图表配置
  // ============================================
  useEffect(() => {
    if (!chartInstance.current || !data.length) return;

    const dates = data.map(item => item.date.substring(5));
    const kLineData = data.map(item => [item.open, item.close, item.low, item.high]);
    const volumes = data.map(item => item.volume);
    const macdData = calculateMACD(data.map(d => d.close));

    const option: echarts.EChartsOption = {
      animation: false,
      legend: { 
        show: false  // 隐藏 legend，不显示 K线/VOL/MACD 字样
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        formatter: (params: any) => {
          let html = `<div style="font-size:11px;">`;
          html += `<div style="font-weight:bold;margin-bottom:4px;">${params[0].axisValue}</div>`;

          const kLine = params.find((p: any) => p.seriesName === 'K 线');
          if (kLine) {
            const close = kLine.data[1];
            const isUp = close >= kLine.data[0];
            html += `<div style="color:${isUp ? '#DC2626' : '#059669'};font-weight:bold;">价格: ¥${Number(close).toFixed(2)}</div>`;
          }

          html += `<div style="margin-top:4px;border-top:1px solid #eee;padding-top:4px;">`;
          if (smartStopLoss > 0 && smartStopLoss < currentPrice) {
            html += `<div style="color:#DC2626;">止损: ¥${smartStopLoss.toFixed(2)}</div>`;
          }
          if (support1 > 0) html += `<div style="color:#10B981;">支撑1: ¥${support1.toFixed(2)}</div>`;
          if (support2 > 0 && support2 < support1) html += `<div style="color:#059669;">支撑2: ¥${support2.toFixed(2)}</div>`;
          if (dynamicResistance > 0) html += `<div style="color:#F59E0B;">压力: ¥${dynamicResistance.toFixed(2)}</div>`;
          if (atrValue > 0) html += `<div style="color:#8B5CF6;">ATR: ¥${atrValue.toFixed(2)}</div>`;
          html += `</div>`;

          const vol = params.find((p: any) => p.seriesName === 'VOL');
          if (vol) {
            const v = vol.value;
            const volStr = v >= 100000000 ? (v/100000000).toFixed(1)+'亿' : v >= 10000 ? (v/10000).toFixed(0)+'万' : v.toString();
            html += `<div style="margin-top:4px;color:#666;">成交量: ${volStr}</div>`;
          }

          html += `</div>`;
          return html;
        }
      },
      grid: [
        { left: '8%', right: '8%', top: '8%', height: '50%' },
        { left: '8%', right: '8%', top: '62%', height: '12%' },
        { left: '8%', right: '8%', top: '77%', height: '12%' }
      ],
      xAxis: [
        { type: 'category', data: dates, gridIndex: 0, axisLabel: { show: false } },
        { type: 'category', data: dates, gridIndex: 1, axisLabel: { show: false } },
        { type: 'category', data: dates, gridIndex: 2, axisLabel: { fontSize: 10, color: '#6b7280' } }
      ],
      yAxis: [
        { type: 'value', gridIndex: 0, scale: true, axisLabel: { fontSize: 10, color: '#6b7280', formatter: '¥{value}' }, splitLine: { lineStyle: { color: '#f3f4f6' } } },
        { type: 'value', gridIndex: 1, axisLabel: { fontSize: 10, color: '#6b7280', formatter: (v: number) => v >= 100000000 ? (v/100000000).toFixed(1)+'亿' : v >= 10000 ? (v/10000).toFixed(0)+'万' : v.toString() }, splitLine: { lineStyle: { color: '#f3f4f6' } } },
        { type: 'value', gridIndex: 2, axisLabel: { fontSize: 10, color: '#6b7280' }, splitLine: { lineStyle: { color: '#f3f4f6' } } }
      ],
      dataZoom: [
        { type: 'inside', xAxisIndex: [0, 1, 2], start: zoomState.start, end: zoomState.end },
        { type: 'slider', xAxisIndex: [0, 1, 2], start: zoomState.start, end: zoomState.end, height: 15, bottom: 5 }
      ],
      series: [
        {
          name: 'K 线',
          type: 'candlestick',
          xAxisIndex: 0,
          yAxisIndex: 0,
          data: kLineData,
          itemStyle: { color: '#DC2626', color0: '#059669', borderColor: '#DC2626', borderColor0: '#059669' },
          markLine: { symbol: ['none', 'none'], animation: false, data: getMarkLineData(), silent: false }
        },
        {
          name: 'VOL',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: volumes.map((v, i) => ({ value: v, itemStyle: { color: data[i].close >= data[i].open ? '#DC2626' : '#059669' } }))
        },
        {
          name: 'MACD',
          type: 'bar',
          xAxisIndex: 2,
          yAxisIndex: 2,
          data: macdData.map(d => ({ value: d.macd, itemStyle: { color: d.macd >= 0 ? '#DC2626' : '#059669' } }))
        },
        {
          name: 'DIF',
          type: 'line',
          xAxisIndex: 2,
          yAxisIndex: 2,
          data: macdData.map(d => d.dif),
          smooth: true,
          lineStyle: { color: '#3B82F6', width: 1.5 },
          showSymbol: false
        },
        {
          name: 'DEA',
          type: 'line',
          xAxisIndex: 2,
          yAxisIndex: 2,
          data: macdData.map(d => d.dea),
          smooth: true,
          lineStyle: { color: '#F97316', width: 1.5 },
          showSymbol: false
        }
      ]
    };

    // 检查图表实例是否有效
    if (chartInstance.current && !chartInstance.current.isDisposed()) {
      chartInstance.current.setOption(option, { notMerge: true });
    }

    const handleResize = () => {
      if (chartInstance.current && !chartInstance.current.isDisposed()) {
        chartInstance.current.resize();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); };
  }, [data, zoomState, support1, support2, dynamicResistance, smartStopLoss, atrValue, currentPrice, getMarkLineData]);

  // 加载/错误/空状态 - 静默处理，不显示错误UI
  if (isLoading) return (
    <div className="w-full h-[400px] bg-gray-50 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto mb-3"></div>
        <p className="text-gray-500 text-sm">加载 K 线数据...</p>
      </div>
    </div>
  );
  
  // 错误状态静默处理，返回null让父组件统一处理
  if (error || !data.length) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium text-gray-600">4 小时 K 线</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">现价：</span>
          <span className="text-sm font-mono font-semibold text-slate-800">¥{currentPrice.toFixed(2)}</span>
        </div>
      </div>
      
      {/* 图表区域 */}
      <div ref={chartRef} className="w-full h-[400px]" />
      
      {/* 标注线说明 */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs bg-gray-50 px-3 py-2 rounded-lg">
        <span className="font-medium text-gray-700">标注线：</span>
        <div className="flex items-center gap-1.5"><div className="w-5 h-0.5 bg-blue-800"></div><span className="text-gray-600">现价</span></div>
        <div className="flex items-center gap-1.5"><div className="w-5 h-0.5 bg-red-600 border-t-2 border-dashed border-red-600"></div><span className="text-gray-600">止损</span></div>
        <div className="flex items-center gap-1.5"><div className="w-5 h-0.5 bg-green-500 border-t-2 border-dotted border-green-500"></div><span className="text-gray-600">支撑1</span></div>
        <div className="flex items-center gap-1.5"><div className="w-5 h-0.5 bg-green-700 border-t-2 border-dotted border-green-700"></div><span className="text-gray-600">支撑2</span></div>
        <div className="flex items-center gap-1.5"><div className="w-5 h-0.5 bg-yellow-600 border-t-2 border-dotted border-yellow-600"></div><span className="text-gray-600">压力</span></div>
      </div>
    </div>
  );
}

// ============================================
// MACD 计算函数
// ============================================
function calculateMACD(prices: number[]): { dif: number; dea: number; macd: number }[] {
  const ema12: number[] = [], ema26: number[] = [], dif: number[] = [], dea: number[] = [], macd: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i === 0) { ema12[i] = ema26[i] = prices[i]; }
    else { 
      ema12[i] = prices[i] * 2 / 13 + ema12[i - 1] * 11 / 13; 
      ema26[i] = prices[i] * 2 / 27 + ema26[i - 1] * 25 / 27; 
    }
    dif[i] = ema12[i] - ema26[i];
    if (i === 0) { dea[i] = dif[i]; } 
    else { dea[i] = dif[i] * 2 / 10 + dea[i - 1] * 8 / 10; }
    macd[i] = (dif[i] - dea[i]) * 2;
  }
  return prices.map((_, i) => ({ dif: dif[i], dea: dea[i], macd: macd[i] }));
}
