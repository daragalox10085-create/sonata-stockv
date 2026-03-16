import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5177,
    host: true,
    proxy: {
      // ========== KIMI修复：Vite代理配置 ==========
      
      // 腾讯K线数据 (FQ Kline API)
      '/api/tencent/kline': {
        target: 'https://web.ifzq.gtimg.cn',
        changeOrigin: true,
        rewrite: (path) => {
          // 使用腾讯 FQ K 线 API: /appstock/app/fqkline/get
          // 格式: param=sz002594,day,2025-01-01,2026-03-13,240,qfq
          const params = new URLSearchParams(path.split('?')[1] || '');
          const code = params.get('code') || '';
          const start = params.get('start') || '';
          const end = params.get('end') || '';
          const limit = params.get('limit') || '240';
          const adjust = params.get('adjust') || 'qfq';
          
          // FQ K 线 API 格式
          return `/appstock/app/fqkline/get?param=${code},day,${start},${end},${limit},${adjust}`;
        },
        secure: false
      },
      
      // 腾讯实时行情
      '/api/tencent/quote': {
        target: 'https://qt.gtimg.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tencent\/quote/, '/q'),
        secure: false
      },
      
      // 东方财富K线数据
      '/api/eastmoney/kline': {
        target: 'https://push2his.eastmoney.com',
        changeOrigin: true,
        rewrite: (path) => {
          // 保留完整的查询参数
          return path.replace(/^\/api\/eastmoney\/kline/, '/api/qt/stock/kline/get');
        },
        secure: false
      },
      
      // 东方财富实时行情
      '/api/eastmoney/quote': {
        target: 'https://push2.eastmoney.com',
        changeOrigin: true,
        rewrite: (path) => {
          // 保留完整的查询参数
          return path.replace(/^\/api\/eastmoney\/quote/, '/api/qt/stock/get');
        },
        secure: false
      },
      
      // 腾讯财经搜索 API
      '/api/tencent/suggest': {
        target: 'https://suggest3.sinajs.cn',
        changeOrigin: true,
        rewrite: (path) => {
          const query = path.split('?')[1] || '';
          return `/suggest/type=11,12,14,15&key=${query.replace(/^q=/, '')}`;
        },
        secure: false
      },
      
      // 东方财富搜索 API  
      '/api/eastmoney/suggest': {
        target: 'https://searchapi.eastmoney.com/api/suggest/get',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/eastmoney\/suggest/, ''),
        secure: false
      },
      
      // ========== 新增：新浪财经实时行情 ==========
      '/api/sina': {
        target: 'https://hq.sinajs.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sina/, ''),
        secure: false,
        headers: {
          'Referer': 'https://finance.sina.com.cn'
        }
      },
      
      // ========== 新增：东方财富批量股票数据 ==========
      '/api/eastmoney/stock-batch': {
        target: 'https://push2.eastmoney.com',
        changeOrigin: true,
        secure: false
      },

      // ========== 新增：东方财富板块数据 ==========
      '/api/eastmoney/sector': {
        target: 'https://push2.eastmoney.com',
        changeOrigin: true,
        secure: false
      },
      
      // ========== Flask 后端 API ==========
      '/api/stock-analysis': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      },
      
      // ========== 热门板块 API ==========
      '/api/hot-sectors': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      },
    }
  }
})
