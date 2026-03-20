/**
 * WeeklyMarketAnalysis - 每周市场分析（纯静态版本）
 * 完全使用静态数据，无需任何API调用
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';

// 静态数据 - 六大潜力板块
const STATIC_SECTORS = [
  {
    code: 'BK0464',
    name: '石油石化',
    changePercent: 0.26,
    score: 68,
    trend: '温和上涨',
    topStocks: [
      { code: '920088', name: '科力股份', changePercent: 8.48 },
      { code: '603798', name: '康普顿', changePercent: -4.09 },
      { code: '603727', name: '博迈科', changePercent: -0.45 }
    ]
  },
  {
    code: 'BK1359',
    name: '金融控股',
    changePercent: 1.59,
    score: 80,
    trend: '强势上涨',
    topStocks: [
      { code: '600830', name: '香溢融通', changePercent: -1.36 },
      { code: '600643', name: '爱建集团', changePercent: 1.12 },
      { code: '600599', name: '*ST熊猫', changePercent: 4.92 }
    ]
  },
  {
    code: 'BK0427',
    name: '公用事业',
    changePercent: 1.26,
    score: 74,
    trend: '稳步上涨',
    topStocks: [
      { code: '920014', name: '特瑞斯', changePercent: 13.25 },
      { code: '920010', name: '凯添燃气', changePercent: 19.74 },
      { code: '900937', name: '华电B股', changePercent: 1.09 }
    ]
  },
  {
    code: 'BK0738',
    name: '多元金融',
    changePercent: -0.41,
    score: 56,
    trend: '震荡整理',
    topStocks: [
      { code: '603300', name: '海南华铁', changePercent: 0.55 },
      { code: '603123', name: '翠微股份', changePercent: -4.5 },
      { code: '603093', name: '南华期货', changePercent: -1.51 }
    ]
  },
  {
    code: 'BK1419',
    name: '煤化工',
    changePercent: -1.6,
    score: 44,
    trend: '弱势下跌',
    topStocks: [
      { code: '900921', name: '金煤B股', changePercent: 0.0 },
      { code: '900909', name: '华谊B股', changePercent: -1.43 },
      { code: '600989', name: '宝丰能源', changePercent: 2.41 }
    ]
  },
  {
    code: 'BK1294',
    name: '门户网站',
    changePercent: -0.04,
    score: 51,
    trend: '横盘震荡',
    topStocks: [
      { code: '603888', name: '新华网', changePercent: -0.9 },
      { code: '603000', name: '人民网', changePercent: 0.87 },
      { code: '600228', name: '*ST返利', changePercent: -2.96 }
    ]
  }
];

// 静态股票池
const STATIC_STOCKS = [
  { code: '920088', name: '科力股份', sector: '石油石化', changePercent: 8.48 },
  { code: '603798', name: '康普顿', sector: '石油石化', changePercent: -4.09 },
  { code: '920014', name: '特瑞斯', sector: '公用事业', changePercent: 13.25 },
  { code: '920010', name: '凯添燃气', sector: '公用事业', changePercent: 19.74 },
  { code: '600830', name: '香溢融通', sector: '金融控股', changePercent: -1.36 },
  { code: '600643', name: '爱建集团', sector: '金融控股', changePercent: 1.12 },
  { code: '603300', name: '海南华铁', sector: '多元金融', changePercent: 0.55 },
  { code: '603123', name: '翠微股份', sector: '多元金融', changePercent: -4.5 },
  { code: '603888', name: '新华网', sector: '门户网站', changePercent: -0.9 },
  { code: '603000', name: '人民网', sector: '门户网站', changePercent: 0.87 },
  { code: '600989', name: '宝丰能源', sector: '煤化工', changePercent: 2.41 },
  { code: '600844', name: '金煤科技', sector: '煤化工', changePercent: -2.58 }
];

interface WeeklyMarketAnalysisProps {
  showStockPicker?: boolean;
  currentPrice?: number;
}

export const WeeklyMarketAnalysis: React.FC<WeeklyMarketAnalysisProps> = ({ showStockPicker = true }) => {
  if (!showStockPicker) return null;
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* 潜力板块 */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4">🚀 潜力板块</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {STATIC_SECTORS.map((sector) => (
            <div 
              key={sector.code}
              className="p-4 bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900">{sector.name}</h4>
                <span className={`text-sm font-medium ${
                  sector.changePercent > 0 ? 'text-red-500' : 
                  sector.changePercent < 0 ? 'text-green-500' : 'text-gray-500'
                }`}>
                  {sector.changePercent > 0 ? '+' : ''}{sector.changePercent.toFixed(2)}%
                </span>
              </div>
              <div className="text-xs text-gray-500 mb-2">{sector.trend}</div>
              <div className="space-y-1">
                {sector.topStocks.map((stock) => (
                  <div key={stock.code} className="flex justify-between text-sm">
                    <span className="text-gray-700">{stock.name}</span>
                    <span className={`${
                      stock.changePercent > 0 ? 'text-red-500' : 
                      stock.changePercent < 0 ? 'text-green-500' : 'text-gray-500'
                    }`}>
                      {stock.changePercent > 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 精选股票池 */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">📊 精选股票池</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">股票</th>
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">板块</th>
                <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">涨跌幅</th>
              </tr>
            </thead>
            <tbody>
              {STATIC_STOCKS.map((stock) => (
                <tr key={stock.code} className="border-b border-gray-100">
                  <td className="py-2 px-3">
                    <span className="font-medium text-gray-900">{stock.name}</span>
                    <span className="text-xs text-gray-500 ml-2">{stock.code}</span>
                  </td>
                  <td className="py-2 px-3 text-sm text-gray-600">{stock.sector}</td>
                  <td className="py-2 px-3 text-right">
                    <span className={`text-sm font-medium ${
                      stock.changePercent > 0 ? 'text-red-500' : 
                      stock.changePercent < 0 ? 'text-green-500' : 'text-gray-500'
                    }`}>
                      {stock.changePercent > 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 风险提示 */}
      <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-medium text-amber-800">风险提示</span>
        </div>
        <p className="text-sm text-amber-700">
          以上分析基于历史数据，仅供参考，不构成投资建议。投资有风险，入市需谨慎。
        </p>
      </div>
    </div>
  );
};

export default WeeklyMarketAnalysis;
