import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { KLinePoint } from '../contexts/StockContext';

interface StockChart4HProps {
  data: KLinePoint[];
  currentPrice: number;
  stopLoss: number;
  support?: number;
  resistance?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  dataSource?: string;
  updateTime?: string;
}

export default function StockChart4H({ 
  data, 
  currentPrice, 
  stopLoss, 
  support,
  resistance,
  isLoading = false,
  error = null,
  onRetry,
  dataSource,
  updateTime
}: StockChart4HProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [_internalLoading, setInternalLoading] = useState(false);

  useEffect(() => {
    if (!chartRef.current) return;

    // 如果正在加载或出错，不初始化图表
    if (isLoading || error) {
      setInternalLoading(isLoading);
      return;
    }

    if (!data.length) return;

    setInternalLoading(false);

    // 初始化图表
    chartInstance.current = echarts.init(chartRef.current, 'light', {
      renderer: 'canvas',
      devicePixelRatio: window.devicePixelRatio || 1
    });

    // 准备数据
    const dates = data.map(item => item.date.substring(5)); // 只显示 MM-DD
    const kLineData = data.map(item => [
      item.open,
      item.close,
      item.low,
      item.high
    ]);

    // 计算均线
    const ma5 = calculateMA(data, 5);
    const ma10 = calculateMA(data, 10);
    const ma20 = calculateMA(data, 20);

    // 计算斐波那契回调位（基于过去 20 日或 360 天的真实高低点）
    const fibLevels = calculateFibonacciLevels(data, 360);

    // 构建标注线数据
    const markLineData: any[] = [];
    
    // 现价线 - 深蓝色（主色）
    markLineData.push({
      name: '现价',
      yAxis: currentPrice,
      lineStyle: {
        color: '#1E40AF',
        width: 2,
        type: 'solid'
      },
      label: {
        formatter: '现价 ¥{c}',
        position: 'end',
        color: '#1E40AF',
        fontWeight: 'bold',
        fontSize: 12
      }
    });

    // 止损位 - 红色（警示色）
    markLineData.push({
      name: '止损位',
      yAxis: stopLoss,
      lineStyle: {
        color: '#DC2626',
        width: 2,
        type: 'dashed'
      },
      label: {
        formatter: '止损 ¥{c}',
        position: 'end',
        color: '#DC2626',
        fontWeight: 'bold',
        fontSize: 12
      }
    });

    // 支撑位 - 灰色（中性色）
    if (support) {
      markLineData.push({
        name: '支撑位',
        yAxis: support,
        lineStyle: {
          color: '#6B7280',
          width: 2,
          type: 'dotted'
        },
        label: {
          formatter: '支撑 ¥{c}',
          position: 'end',
          color: '#6B7280',
          fontWeight: 'bold',
          fontSize: 12
        }
      });
    }

    // 压力位 - 灰色（中性色）
    if (resistance) {
      markLineData.push({
        name: '压力位',
        yAxis: resistance,
        lineStyle: {
          color: '#6B7280',
          width: 2,
          type: 'dotted'
        },
        label: {
          formatter: '压力 ¥{c}',
          position: 'end',
          color: '#6B7280',
          fontWeight: 'bold',
          fontSize: 12
        }
      });
    }

    // 斐波那契支撑/压力位 - 紫色系
    const fibColors = ['#9333EA', '#7C3AED', '#6D28D9', '#5B21B6'];
    const fibNames = ['F23.6%', 'F38.2%', 'F50%', 'F61.8%'];
    fibLevels.forEach((level, index) => {
      markLineData.push({
        name: fibNames[index],
        yAxis: level,
        lineStyle: {
          color: fibColors[index],
          width: 1,
          type: 'dotted'
        },
        label: {
          formatter: `${fibNames[index]} ¥{c}`,
          position: 'end',
          color: fibColors[index],
          fontSize: 10
        }
      });
    });

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      legend: {
        data: ['K 线', 'MA5', 'MA10', 'MA20', '现价', '止损位', '支撑位', '压力位', '斐波那契'],
        bottom: 10,
        textStyle: {
          fontSize: 11,
          color: '#6b7280'
        }
      },
      grid: {
        left: '3%',
        right: '8%',
        top: '10%',
        bottom: '15%'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        formatter: (params: any) => {
          const item = params[0];
          return `
            <div style="font-weight:bold">${item.name}</div>
            开：${item.data[1]}<br/>
            收：${item.data[2]}<br/>
            低：${item.data[3]}<br/>
            高：${item.data[4]}
          `;
        }
      },
      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: false,
        axisLine: {
          lineStyle: {
            color: '#e5e7eb'
          }
        },
        axisLabel: {
          color: '#6b7280',
          fontSize: 10
        }
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLine: {
          lineStyle: {
            color: '#e5e7eb'
          }
        },
        axisLabel: {
          color: '#6b7280',
          fontSize: 10,
          formatter: (value: number) => `¥${value.toFixed(2)}`
        },
        splitLine: {
          lineStyle: {
            color: '#f3f4f6'
          }
        }
      },
      dataZoom: [
        {
          type: 'inside',
          start: 50,
          end: 100,
          throttle: 50
        },
        {
          type: 'slider',
          start: 50,
          end: 100,
          height: 20,
          bottom: 0,
          throttle: 50
        }
      ],
      series: [
        {
          name: 'K 线',
          type: 'candlestick',
          data: kLineData,
          itemStyle: {
            color: '#DC2626',      // K 线阳 - A 股红色
            color0: '#059669',     // K 线阴 - A 股绿色
            borderColor: '#DC2626',
            borderColor0: '#059669'
          }
        },
        {
          name: 'MA5',
          type: 'line',
          data: ma5,
          smooth: true,
          lineStyle: {
            color: '#F59E0B',      // 琥珀色
            width: 1
          },
          showSymbol: false
        },
        {
          name: 'MA10',
          type: 'line',
          data: ma10,
          smooth: true,
          lineStyle: {
            color: '#8B5CF6',      // 紫色
            width: 1
          },
          showSymbol: false
        },
        {
          name: 'MA20',
          type: 'line',
          data: ma20,
          smooth: true,
          lineStyle: {
            color: '#06B6D4',      // 青色
            width: 1
          },
          showSymbol: false
        },
        // 现价线 - 使用动态数据，随缩放变动
        {
          name: '现价',
          type: 'line',
          data: data.map(() => currentPrice),
          smooth: false,
          lineStyle: {
            color: '#1E40AF',
            width: 2,
            type: 'solid'
          },
          showSymbol: false,
          label: {
            show: true,
            position: 'right',
            formatter: '  现价 ¥{c}',
            color: '#1E40AF',
            fontSize: 12,
            backgroundColor: 'rgba(255,255,255,0.8)',
            padding: [2, 4],
            borderRadius: 3
          }
        },
        // 止损线
        {
          name: '止损位',
          type: 'line',
          data: data.map(() => stopLoss),
          smooth: false,
          lineStyle: {
            color: '#DC2626',
            width: 2,
            type: 'dashed'
          },
          showSymbol: false,
          label: {
            show: true,
            position: 'right',
            formatter: '  止损 ¥{c}',
            color: '#DC2626',
            fontSize: 12,
            backgroundColor: 'rgba(255,255,255,0.8)',
            padding: [2, 4],
            borderRadius: 3
          }
        }
      ]
    };

    // 添加斐波那契标注线（使用 markLine）
    if (fibLevels.length > 0) {
      const fibMarkLineData = fibLevels.map((level, index) => ({
        name: `F${['23.6%', '38.2%', '50%', '61.8%'][index]}`,
        yAxis: level,
        lineStyle: {
          color: ['#9333EA', '#7C3AED', '#6D28D9', '#5B21B6'][index],
          width: 1,
          type: 'dotted'
        },
        label: {
          formatter: `F${['23.6%', '38.2%', '50%', '61.8%'][index]} ¥{c}`,
          position: 'end',
          color: ['#9333EA', '#7C3AED', '#6D28D9', '#5B21B6'][index],
          fontSize: 10
        }
      }));

      // 添加支撑/压力位
      if (support) {
        fibMarkLineData.push({
          name: '支撑位',
          yAxis: support,
          lineStyle: {
            color: '#6B7280',
            width: 2,
            type: 'dotted'
          },
          label: {
            formatter: '支撑 ¥{c}',
            position: 'end',
            color: '#6B7280',
            fontSize: 12
          }
        });
      }
      if (resistance) {
        fibMarkLineData.push({
          name: '压力位',
          yAxis: resistance,
          lineStyle: {
            color: '#6B7280',
            width: 2,
            type: 'dotted'
          },
          label: {
            formatter: '压力 ¥{c}',
            position: 'end',
            color: '#6B7280',
            fontSize: 12
          }
        });
      }

      // 将标注线添加到最后一个系列（现价线）
      const seriesArray = option.series as any[];
      if (seriesArray && seriesArray.length > 0) {
        seriesArray[seriesArray.length - 1].markLine = {
          symbol: 'none',
          silent: true,
          animation: false,
          data: fibMarkLineData
        };
      }
    }

    chartInstance.current.setOption(option);

    // 响应式调整
    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, [data, currentPrice, stopLoss, support, resistance, isLoading, error]);

  // 骨架屏加载动画
  const SkeletonLoader = () => (
    <div className="w-full h-[400px] animate-pulse">
      <div className="flex flex-col h-full justify-between py-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-full flex gap-2">
            <div className="h-px bg-gray-200 flex-1"></div>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
          <p className="text-gray-500 text-sm font-medium">数据获取中...</p>
        </div>
      </div>
    </div>
  );

  // 错误状态显示
  const ErrorState = () => (
    <div className="w-full h-[400px] flex flex-col items-center justify-center bg-red-50 border border-red-200 rounded-lg">
      <div className="text-center p-6">
        <div className="text-red-500 text-4xl mb-3">⚠️</div>
        <h3 className="text-red-800 font-bold text-lg mb-2">数据加载失败</h3>
        <p className="text-red-600 text-sm mb-4 max-w-md">{error || '无法获取 K 线数据'}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 mx-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            重试
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="glass-card rounded p-6 mb-6 animate-slide-in">
      {/* 标题和 Badge */}
      <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
        <h2 className="text-lg font-bold text-gray-800">📊 K 线图</h2>
        <div className="flex gap-2 flex-wrap items-center">
          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
            4 小时 K 线图
          </span>
          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded flex items-center gap-1">
            🔄 延迟约 15 分钟
          </span>
          
          {/* 数据源标识 */}
          {dataSource && (
            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded flex items-center gap-1" title={dataSource}>
              📡 {dataSource.length > 20 ? dataSource.substring(0, 20) + '...' : dataSource}
            </span>
          )}
          
          {/* 更新时间 */}
          {updateTime && (
            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded flex items-center gap-1" title={updateTime}>
              🕐 {updateTime}
            </span>
          )}
        </div>
      </div>

      {/* 图表区域 */}
      <div className="relative">
        {/* 加载中状态 */}
        {isLoading && <SkeletonLoader />}
        
        {/* 错误状态 */}
        {error && <ErrorState />}
        
        {/* 正常图表 */}
        {!isLoading && !error && (
          <div ref={chartRef} className="w-full h-[400px]" />
        )}
      </div>

      {/* 图例说明 */}
      {!error && (
        <div className="mt-4 p-4 bg-bg-surface border border-border-light rounded">
          <h3 className="text-sm font-bold text-text-primary mb-3">📌 标注线说明</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-primary"></div>
              <span className="text-xs text-text-secondary">现价 (深蓝实线)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 border-b-2 border-dashed border-danger"></div>
              <span className="text-xs text-text-secondary">止损位 (红色虚线)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 border-b-2 border-dotted border-text-tertiary"></div>
              <span className="text-xs text-text-secondary">支撑/压力 (灰色点线)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 border-b-2 border-dotted" style={{borderColor: '#9333EA'}}></div>
              <span className="text-xs text-text-secondary">斐波那契 23.6% (紫点线)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 border-b-2 border-dotted" style={{borderColor: '#7C3AED'}}></div>
              <span className="text-xs text-text-secondary">斐波那契 38.2% (紫点线)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 border-b-2 border-dotted" style={{borderColor: '#6D28D9'}}></div>
              <span className="text-xs text-text-secondary">斐波那契 50% (紫点线)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 border-b-2 border-dotted" style={{borderColor: '#5B21B6'}}></div>
              <span className="text-xs text-text-secondary">斐波那契 61.8% (紫点线)</span>
            </div>
          </div>
        </div>
      )}

      {/* 关键价位标注 */}
      {!error && data.length > 0 && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded">
            <span className="text-base">💜</span>
            <div>
              <div className="text-xs text-text-tertiary">现价</div>
              <div className="text-sm font-bold text-primary">¥{currentPrice.toFixed(2)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded">
            <span className="text-base">🔴</span>
            <div>
              <div className="text-xs text-text-tertiary">止损位</div>
              <div className="text-sm font-bold text-danger">¥{stopLoss.toFixed(2)}</div>
            </div>
          </div>
          {support && (
            <div className="flex items-center gap-2 p-2 bg-bg-surface border border-border-light rounded">
              <span className="text-base">🟣</span>
              <div>
                <div className="text-xs text-text-tertiary">支撑位</div>
                <div className="text-sm font-bold text-text-secondary">¥{support.toFixed(2)}</div>
              </div>
            </div>
          )}
          {resistance && (
            <div className="flex items-center gap-2 p-2 bg-bg-surface border border-border-light rounded">
              <span className="text-base">🟠</span>
              <div>
                <div className="text-xs text-text-tertiary">压力位</div>
                <div className="text-sm font-bold text-text-secondary">¥{resistance.toFixed(2)}</div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded">
            <span className="text-base">📐</span>
            <div>
              <div className="text-xs text-text-tertiary">斐波那契</div>
              <div className="text-sm font-bold text-purple-700">23.6% - 61.8%</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 计算移动平均线
function calculateMA(data: KLinePoint[], days: number): (number | '-')[] {
  const result: (number | '-')[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < days - 1) {
      result.push('-');
      continue;
    }
    let sum = 0;
    for (let j = 0; j < days; j++) {
      sum += data[i - j].close;
    }
    result.push(parseFloat((sum / days).toFixed(4)));
  }
  return result;
}

// 计算斐波那契回调位（基于过去 N 天的真实高低点）
function calculateFibonacciLevels(data: KLinePoint[], days: number = 360): number[] {
  if (data.length === 0) return [];
  
  // 限制时间范围：使用过去 N 天的数据（或全部数据如果不足 N 天）
  const lookbackCount = Math.min(days, data.length);
  const recentData = data.slice(-lookbackCount);
  
  // 找到最高价和最低价
  let highest = -Infinity;
  let lowest = Infinity;
  
  recentData.forEach(point => {
    if (point.high > highest) highest = point.high;
    if (point.low < lowest) lowest = point.low;
  });
  
  // 数值验证：防止最高价等于最低价（除以 0 或无效计算）
  if (highest === lowest || !isFinite(highest) || !isFinite(lowest)) {
    // 如果价格没有波动，返回当前价格作为所有斐波那契位
    const currentPrice = recentData[recentData.length - 1]?.close || 0;
    return [currentPrice, currentPrice, currentPrice, currentPrice];
  }
  
  const range = highest - lowest;
  
  // 计算斐波那契回调位：从高点往下回调（下跌趋势）
  // 公式：斐波那契位 = 最高价 - (最高价 - 最低价) × 斐波那契比例
  const fibRatios = [0.236, 0.382, 0.5, 0.618];
  return fibRatios.map(ratio => highest - range * ratio);
}
