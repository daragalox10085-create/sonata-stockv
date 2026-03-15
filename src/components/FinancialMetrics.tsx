/**
 * FinancialMetrics - 财务指标显示组件
 * 显示股票的估值和盈利能力指标
 */

import React from 'react';

interface FinancialMetricsProps {
  pe?: number;
  peTtm?: number;
  pb?: number;
  ps?: number;
  peg?: number;
  roe?: number;
  profitGrowth?: number;
  revenueGrowth?: number;
  marketCap?: number;
}

export const FinancialMetrics: React.FC<FinancialMetricsProps> = ({
  pe,
  peTtm,
  pb,
  ps,
  peg,
  roe,
  profitGrowth,
  revenueGrowth,
  marketCap
}) => {
  // 格式化数值
  const formatValue = (value: number | undefined, suffix: string = ''): string => {
    if (value === undefined || value === null || value === 0) return '--';
    return `${value.toFixed(2)}${suffix}`;
  };

  // 格式化市值
  const formatMarketCap = (value: number | undefined): string => {
    if (!value) return '--';
    if (value >= 1e12) return `${(value / 1e12).toFixed(2)}万亿`;
    if (value >= 1e8) return `${(value / 1e8).toFixed(2)}亿`;
    return `${(value / 1e4).toFixed(2)}万`;
  };

  // 获取估值等级颜色
  const getValuationColor = (pe: number | undefined): string => {
    if (!pe || pe <= 0) return 'text-gray-500';
    if (pe < 15) return 'text-emerald-600'; // 低估
    if (pe < 30) return 'text-blue-600';   // 合理
    if (pe < 50) return 'text-amber-600';  // 偏高
    return 'text-red-600';                  // 高估
  };

  // 获取ROE等级颜色
  const getRoeColor = (roe: number | undefined): string => {
    if (!roe) return 'text-gray-500';
    if (roe > 15) return 'text-emerald-600'; // 优秀
    if (roe > 10) return 'text-blue-600';    // 良好
    if (roe > 5) return 'text-amber-600';    // 一般
    return 'text-red-600';                   // 较差
  };

  // 获取增长率颜色
  const getGrowthColor = (growth: number | undefined): string => {
    if (!growth) return 'text-gray-500';
    if (growth > 30) return 'text-emerald-600'; // 高增长
    if (growth > 10) return 'text-blue-600';    // 稳健增长
    if (growth > 0) return 'text-amber-600';    // 低速增长
    return 'text-red-600';                      // 负增长
  };

  const metrics = [
    { label: '市盈率(PE)', value: formatValue(pe), color: getValuationColor(pe) },
    { label: '市盈率TTM', value: formatValue(peTtm), color: getValuationColor(peTtm) },
    { label: '市净率(PB)', value: formatValue(pb), color: 'text-slate-700' },
    { label: '市销率(PS)', value: formatValue(ps), color: 'text-slate-700' },
    { label: 'PEG', value: formatValue(peg), color: peg && peg < 1 ? 'text-emerald-600' : 'text-amber-600' },
    { label: 'ROE', value: formatValue(roe, '%'), color: getRoeColor(roe) },
    { label: '净利润增长', value: formatValue(profitGrowth, '%'), color: getGrowthColor(profitGrowth) },
    { label: '营收增长', value: formatValue(revenueGrowth, '%'), color: getGrowthColor(revenueGrowth) },
    { label: '总市值', value: formatMarketCap(marketCap), color: 'text-slate-700' },
  ];

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">财务指标</h3>
        <span className="text-xs text-slate-500">数据来源: 东方财富</span>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        {metrics.map((metric, index) => (
          <div key={index} className="text-center">
            <div className="text-xs text-slate-500 mb-1">{metric.label}</div>
            <div className={`text-sm font-semibold ${metric.color}`}>
              {metric.value}
            </div>
          </div>
        ))}
      </div>
      
      {/* 估值评价 */}
      {pe && pe > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">估值评价:</span>
            <span className={`font-medium ${getValuationColor(pe)}`}>
              {pe < 15 ? '低估' : pe < 30 ? '合理' : pe < 50 ? '偏高' : '高估'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialMetrics;
