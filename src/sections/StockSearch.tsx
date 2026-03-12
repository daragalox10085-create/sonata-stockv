import React, { useState, useEffect } from 'react';
import { useStock } from '../contexts/StockContext';
import OnboardingGuide from '../components/OnboardingGuide';

interface StockSearchResult { code: string; name: string; market: string; }

const stockPrefixMap: Record<string, string> = {
  '600': '沪市主板', '601': '沪市主板', '603': '沪市主板', '605': '沪市主板', '688': '科创板',
  '000': '深市主板', '001': '深市主板', '002': '深市中小板', '003': '深市主板',
  '300': '创业板', '301': '创业板',
  '510': 'ETF', '511': 'ETF', '512': 'ETF', '513': 'ETF', '515': 'ETF', '516': 'ETF', '518': 'ETF', '519': 'ETF'
};

async function searchStockByName(keyword: string): Promise<StockSearchResult[]> {
  if (!keyword.trim() || keyword.length < 2) return [];
  try {
    const url = `/api/eastmoney/suggest?input=${encodeURIComponent(keyword)}&type=14&count=10`;
    const response = await fetch(url, { headers: { 'Accept': '*/*' } });
    if (!response.ok) return [];
    const text = await response.text();
    if (!text) return [];
    const data = JSON.parse(text);
    const quotationTable = data?.QuotationCodeTable;
    if (!quotationTable?.Data?.length) return [];
    return quotationTable.Data.map((item: any) => {
      const code = item.Code, name = item.Name;
      const prefix = code.substring(0, 3);
      return { code, name, market: stockPrefixMap[prefix] || '其他' };
    }).filter((item: StockSearchResult) => stockPrefixMap[item.code.substring(0, 3)]);
  } catch { return []; }
}

export default function StockSearch({ onStartAnalysis }: { onStartAnalysis: (symbol: string, name: string) => void }) {
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { isLoading: contextLoading } = useStock();

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchKeyword.trim().length >= 2) {
        setIsSearching(true);
        const results = await searchStockByName(searchKeyword);
        setSearchResults(results);
        setIsSearching(false);
      } else { setSearchResults([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  const handleStart = async () => {
    if (!symbol.trim()) { alert('请输入股票代码'); return; }
    if (!/^\d{6}$/.test(symbol.trim())) { alert('请输入 6 位数字的股票代码'); return; }
    setIsLoading(true);
    try { await onStartAnalysis(symbol.trim(), name.trim() || symbol.trim()); } finally { setIsLoading(false); }
  };

  const hotStocks = [
    { code: '600519', name: '贵州茅台' }, { code: '000858', name: '五粮液' }, { code: '300750', name: '宁德时代' },
    { code: '002594', name: '比亚迪' }, { code: '510300', name: '沪深300ETF' }, { code: '513310', name: '中韩半导体ETF' }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header - 专业化扁平设计 */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo - 扁平化方形 */}
            <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center">
              <span className="text-slate-900 font-bold text-sm">S</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-900">Sonata</h1>
              <p className="text-[10px] text-slate-500">专业量化分析</p>
            </div>
          </div>
          <button 
            onClick={() => setShowGuide(true)} 
            className="text-xs text-slate-500 hover:text-amber-600 transition-colors"
          >
            使用指南
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        {/* Hero */}
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 mb-2 sm:mb-3">专业量化分析平台</h2>
          <p className="text-slate-500 text-sm px-4">基于蒙特卡洛模拟与多维度技术指标，提供精准买卖点决策</p>
        </div>

        {/* Search Card */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">股票代码</label>
              <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="请输入 6 位 A 股代码" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all" />
              <p className="mt-1 text-[10px] text-slate-400">如：600519（贵州茅台）</p>
            </div>
            <div className="relative">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">股票名称搜索</label>
              <input type="text" value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} placeholder="输入名称模糊搜索" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all" />
              {isSearching && <div className="absolute right-3 top-8"><div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div></div>}
              {searchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {searchResults.map((result, idx) => (
                    <button key={idx} onClick={() => { setSymbol(result.code); setName(result.name); setSearchKeyword(result.name); setSearchResults([]); }} className="w-full px-3 py-2 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors">
                      <div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-700">{result.name}</span><span className="text-xs text-slate-400">{result.code}</span></div>
                      <span className="text-[10px] text-slate-400">{result.market}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* 金色开始分析按钮 */}
          <button onClick={handleStart} disabled={isLoading || contextLoading || symbol.length !== 6} className="w-full py-2.5 sm:py-3 bg-amber-500 text-slate-900 text-sm font-semibold rounded-lg hover:bg-amber-400 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors">
            {isLoading || contextLoading ? '分析中...' : '开始分析'}
          </button>
        </div>

        {/* Hot Stocks */}
        <div className="mb-8 sm:mb-12">
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">热门股票</h3>
          <div className="flex flex-wrap gap-2">
            {hotStocks.map((stock) => (
              <button key={stock.code} onClick={() => { setSymbol(stock.code); setName(stock.name); setSearchKeyword(stock.name); }} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 hover:border-amber-500 hover:text-amber-600 transition-colors">
                <span className="font-mono text-slate-400 mr-1.5">{stock.code}</span>{stock.name}
              </button>
            ))}
          </div>
        </div>

        {/* 三大核心功能 - 扁平化设计 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: 'S', title: '量化决策引擎', desc: '五维模型智能计算买卖点与风险控制位', color: 'bg-blue-50 text-blue-600' },
            { icon: 'K', title: 'K线及分析，买入点建议', desc: '360天历史数据，自动标注关键价位', color: 'bg-amber-50 text-amber-600' },
            { icon: 'M', title: '蒙特卡洛预测', desc: '万次模拟，概率化预测未来一周走势', color: 'bg-green-50 text-green-600' }
          ].map((feat, idx) => (
            <div key={idx} className="bg-white rounded-lg p-5 border border-slate-200 hover:border-slate-300 transition-all">
              <div className={`w-10 h-10 ${feat.color} rounded-lg flex items-center justify-center text-lg font-bold mb-3`}>
                {feat.icon}
              </div>
              <h3 className="text-sm font-semibold text-slate-800 mb-1">{feat.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-slate-200 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-slate-400">
          <p>© 2026 Sonata. Professional Stock Analysis.</p>
          <p className="mt-1">风险提示：以上分析仅供参考，不构成投资建议。</p>
        </div>
      </footer>

      {showGuide && <OnboardingGuide onComplete={() => setShowGuide(false)} onSkip={() => setShowGuide(false)} />}
    </div>
  );
}
