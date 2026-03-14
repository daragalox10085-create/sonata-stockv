/**
 * Sonata V2.0 - 专业股票分析终端
 * 
 * 版本历史:
 * V2.0 (2026-03-14) - 全面修复版
 *   - 修复核心算法 (RSI、布林带、夏普比率、盈亏比)
 *   - 修复导出长图和导出PDF功能
 *   - 修复K线图数据一致性
 *   - 优化数字格式化 (2位小数)
 *   - 增强股票代码验证
 * 
 * V1.0 - 初始版本
 */

import { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { StockProvider, useStock } from './contexts/StockContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import StockSearch from './sections/StockSearch';
import ErrorPage from './sections/ErrorPage';
import StockHeader from './sections/StockHeader';
import StockChart4H from './sections/StockChart-4H';
import PositionAnalysis from './sections/PositionAnalysis';
import StockAnalysis from './sections/StockAnalysis';
import WeeklyMarketAnalysis from './sections/WeeklyMarketAnalysis';
import GlossaryPage from './sections/GlossaryPage';

function AppContent() {
  const { stockData, isLoading, error, errorType, loadStock, clearStock, changeTimeframe } = useStock();
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorState, setErrorState] = useState<{ type: 'format' | 'invalid' | 'network'; message: string; symbol?: string } | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [showGlossary, setShowGlossary] = useState(false);
  const [expandedModules, setExpandedModules] = useState({ prediction: true, market: true });
  const [showQuantDetails, setShowQuantDetails] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const toggleModule = (key: string) => {
    setExpandedModules(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  };

  // 导出长图
  const handleExportLongImage = async () => {
    console.log('[导出长图] 开始导出...');
    
    if (!contentRef.current) {
      console.error('[导出长图] contentRef.current 为空');
      alert('页面内容未加载完成，请稍后重试');
      return;
    }
    
    if (!stockData) {
      console.error('[导出长图] stockData 为空');
      alert('请先加载股票数据');
      return;
    }
    
    const originalExpanded = { ...expandedModules };
    
    try {
      setDownloadProgress(0);
      
      // 展开所有模块
      setExpandedModules({ prediction: true, market: true });
      console.log('[导出长图] 已展开所有模块');
      
      // 等待DOM更新
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const element = contentRef.current;
      console.log('[导出长图] 目标元素:', element);
      console.log('[导出长图] 元素尺寸:', element.scrollWidth, 'x', element.scrollHeight);
      
      // 保存原始样式
      const originalWidth = element.style.width;
      const originalHeight = element.style.height;
      const originalOverflow = element.style.overflow;
      
      // 设置固定宽度以确保一致性
      element.style.width = '1200px';
      element.style.height = 'auto';
      element.style.overflow = 'visible';
      
      setDownloadProgress(20);
      
      // 等待样式应用
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log('[导出长图] 开始生成canvas...');
      
      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        logging: true, // 开启调试日志
        windowWidth: 1200,
        width: 1200,
        height: element.scrollHeight,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0, // 修正scrollY
        onclone: (clonedDoc) => {
          console.log('[导出长图] DOM已克隆');
        }
      });
      
      console.log('[导出长图] Canvas生成成功:', canvas.width, 'x', canvas.height);
      
      // 恢复原始样式
      element.style.width = originalWidth;
      element.style.height = originalHeight;
      element.style.overflow = originalOverflow;
      
      setDownloadProgress(60);
      
      // 下载 PNG
      const link = document.createElement('a');
      const fileName = `${stockData.name || stockData.symbol}_${stockData.symbol}_Sonata分析报告.png`;
      link.download = fileName;
      console.log('[导出长图] 文件名:', fileName);
      
      // 转换为DataURL
      const dataUrl = canvas.toDataURL('image/png');
      console.log('[导出长图] DataURL长度:', dataUrl.length);
      
      link.href = dataUrl;
      
      // 触发下载
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('[导出长图] 下载已触发');
      
      setDownloadProgress(100);
      
      setTimeout(() => {
        setDownloadProgress(null);
        setExpandedModules(originalExpanded);
        console.log('[导出长图] 导出完成');
      }, 1500);
      
    } catch (error) {
      console.error('[导出长图] 导出失败:', error);
      alert('导出失败: ' + (error instanceof Error ? error.message : '未知错误'));
      setDownloadProgress(null);
      setExpandedModules(originalExpanded);
    }
  };

  // 导出 PDF
  const handleExportPDF = async () => {
    console.log('[导出PDF] 开始导出...');
    
    if (!contentRef.current) {
      console.error('[导出PDF] contentRef.current 为空');
      alert('页面内容未加载完成，请稍后重试');
      return;
    }
    
    if (!stockData) {
      console.error('[导出PDF] stockData 为空');
      alert('请先加载股票数据');
      return;
    }
    
    const originalExpanded = { ...expandedModules };
    
    try {
      setDownloadProgress(0);
      
      // 展开所有模块
      setExpandedModules({ prediction: true, market: true });
      console.log('[导出PDF] 已展开所有模块');
      
      // 等待DOM更新
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const element = contentRef.current;
      console.log('[导出PDF] 目标元素:', element);
      
      // 保存原始样式
      const originalWidth = element.style.width;
      const originalHeight = element.style.height;
      const originalOverflow = element.style.overflow;
      
      // 设置固定宽度
      element.style.width = '1200px';
      element.style.height = 'auto';
      element.style.overflow = 'visible';
      
      setDownloadProgress(20);
      
      // 等待样式应用
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log('[导出PDF] 开始生成canvas...');
      
      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        logging: true,
        windowWidth: 1200,
        width: 1200,
        height: element.scrollHeight,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0
      });
      
      console.log('[导出PDF] Canvas生成成功:', canvas.width, 'x', canvas.height);
      
      // 恢复原始样式
      element.style.width = originalWidth;
      element.style.height = originalHeight;
      element.style.overflow = originalOverflow;
      
      setDownloadProgress(60);
      
      // 生成 PDF
      console.log('[导出PDF] 开始生成PDF...');
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdfWidth = 210; // A4 宽度 mm
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      console.log('[导出PDF] PDF尺寸:', pdfWidth, 'x', pdfHeight, 'mm');
      
      const pdf = new jsPDF({
        orientation: pdfHeight > 297 ? 'portrait' : 'portrait', // 如果超过A4高度，使用纵向
        unit: 'mm',
        format: 'a4' // 使用标准A4，自动分页
      });
      
      // 计算分页
      const pageHeight = 297; // A4高度 mm
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      // 添加第一页
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // 如果内容超过一页，添加更多页
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      const fileName = `${stockData.name || stockData.symbol}_${stockData.symbol}_Sonata分析报告.pdf`;
      console.log('[导出PDF] 文件名:', fileName);
      
      pdf.save(fileName);
      
      console.log('[导出PDF] 下载已触发');
      
      setDownloadProgress(100);
      
      setTimeout(() => {
        setDownloadProgress(null);
        setExpandedModules(originalExpanded);
        console.log('[导出PDF] 导出完成');
      }, 1500);
      
    } catch (error) {
      console.error('[导出PDF] 导出失败:', error);
      alert('导出失败: ' + (error instanceof Error ? error.message : '未知错误'));
      setDownloadProgress(null);
      setExpandedModules(originalExpanded);
    }
  };

  const handleStartAnalysis = async (symbol: string, name: string) => {
    setShowError(false);
    setErrorState(null);
    await loadStock(symbol, name);
    if (error) {
      setErrorState({ type: errorType || 'invalid', message: error, symbol });
      setShowError(true);
      setShowAnalysis(false);
      return;
    }
    setShowAnalysis(true);
  };

  const handleBackToSearch = () => {
    setShowAnalysis(false);
    setShowError(false);
    setErrorState(null);
    clearStock();
  };

  if (showError && errorState) {
    return <ErrorPage errorType={errorState.type} errorMessage={errorState.message} symbol={errorState.symbol} onBack={handleBackToSearch} />;
  }

  if (!showAnalysis || !stockData) {
    return <StockSearch onStartAnalysis={handleStartAnalysis} />;
  }

  if (showGlossary) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header onBack={() => setShowGlossary(false)} />
        <GlossaryPage />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" ref={contentRef}>
      <Header stockData={stockData} downloadProgress={downloadProgress} onExportLongImage={handleExportLongImage} onExportPDF={handleExportPDF} onBack={handleBackToSearch} onShowGlossary={() => setShowGlossary(true)} />

      <main className="max-w-6xl mx-auto px-4 py-4">
        <StockHeader data={stockData} />

        {/* 核心模块：K线图 + 右侧量化建议 */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mt-4">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-sm font-semibold text-slate-800">技术分析</h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                {stockData.kLineData && stockData.kLineData.length > 0 ? (
                  <StockChart4H
                    data={stockData.kLineData}
                    currentPrice={stockData.currentPrice}
                    stopLoss={stockData.stopLoss}
                    support={stockData.support}
                    resistance={stockData.resistance}
                    isLoading={isLoading}
                    multiTimeframeData={stockData.kLineDataMulti}
                    currentTimeframe={stockData.currentTimeframe}
                    onTimeframeChange={changeTimeframe}
                  />
                ) : (
                  <div className="w-full h-[400px] bg-gray-50 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto mb-3"></div>
                      <p className="text-gray-500 text-sm">加载 K 线数据...</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="lg:col-span-1 space-y-4">
                {/* 持仓/买入分析 - 第一位 */}
                <PositionAnalysis data={stockData} />

                {/* 关键价位 */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="text-xs font-medium text-slate-500 mb-3">关键价位</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">现价</span>
                      <span className="font-mono font-medium text-slate-800">¥{stockData.currentPrice?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">止损</span>
                      <span className="font-mono font-medium text-red-600">¥{stockData.stopLoss?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">支撑</span>
                      <span className="font-mono font-medium text-green-600">¥{stockData.support?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">压力</span>
                      <span className="font-mono font-medium text-amber-600">¥{stockData.resistance?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>



        {/* 该股一周走势预测（蒙特卡洛） */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mt-4">
          <button 
            onClick={() => toggleModule('prediction')}
            className="w-full px-4 py-3 flex items-center justify-between bg-slate-50/50 border-b border-slate-100 hover:bg-slate-100/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-800">{stockData.name}一周走势预测</h2>
            </div>
            <svg className={`w-5 h-5 text-slate-400 transition-transform ${expandedModules.prediction ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedModules.prediction && (
            <div className="p-4">
              <WeeklyMarketAnalysis showStockPicker={false} currentPrice={stockData.currentPrice} />
            </div>
          )}
        </div>

        {/* 热门板块 & 精选股票池 */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mt-4">
          <button 
            onClick={() => toggleModule('market')}
            className="w-full px-4 py-3 flex items-center justify-between bg-slate-50/50 border-b border-slate-100 hover:bg-slate-100/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-800">热门板块 & 精选股票池</h2>
            </div>
            <svg className={`w-5 h-5 text-slate-400 transition-transform ${expandedModules.market ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedModules.market && (
            <div className="p-4">
              <WeeklyMarketAnalysis showStockPicker={true} />
            </div>
          )}
        </div>

        <footer className="mt-8 border-t border-slate-200 pt-6 text-center text-xs text-slate-400">
          <p>© 2026 Sonata. Professional Stock Analysis.</p>
          <p className="mt-1">风险提示：以上分析仅供参考，不构成投资建议。</p>
        </footer>
      </main>
    </div>
  );
}

function Header({ stockData, downloadProgress, onExportLongImage, onExportPDF, onBack, onShowGlossary }: any) {
  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Logo - 扁平化方形，与首页统一 */}
          <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center">
            <span className="text-slate-900 font-bold text-sm">S</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-900">Sonata</h1>
            <p className="text-[10px] text-slate-500 hidden sm:block">专业量化分析</p>
          </div>
        </div>
        
        {stockData && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-600 hidden md:inline font-medium">{stockData.name}</span>
            <span className="text-slate-400 hidden md:inline">{stockData.symbol}</span>
            <span className={`font-mono font-semibold ${stockData.change >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              ¥{stockData.currentPrice?.toFixed(2) || '-'}
            </span>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          {onShowGlossary && (
            <button onClick={onShowGlossary} className="px-2.5 py-1 text-xs text-slate-500 hover:text-amber-600 transition-colors hidden sm:block">
              术语表
            </button>
          )}
          {onExportLongImage && (
            <button 
              onClick={onExportLongImage} 
              disabled={downloadProgress !== null} 
              className="px-3 py-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 rounded transition-colors disabled:opacity-50"
            >
              {downloadProgress !== null ? `${downloadProgress}%` : '导出长图'}
            </button>
          )}
          {onExportPDF && (
            <button 
              onClick={onExportPDF} 
              disabled={downloadProgress !== null} 
              className="px-3 py-1 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 rounded transition-colors disabled:opacity-50"
            >
              {downloadProgress !== null ? `${downloadProgress}%` : '导出 PDF'}
            </button>
          )}
          <button onClick={onBack} className="px-3 py-1 text-xs text-slate-500 hover:text-slate-800 transition-colors">
            返回
          </button>
        </div>
      </div>
    </header>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <StockProvider>
        <AppContent />
      </StockProvider>
    </ErrorBoundary>
  );
}

export default App;
