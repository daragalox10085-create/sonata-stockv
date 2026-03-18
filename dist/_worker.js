export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // 只处理 API 请求
    if (pathname.startsWith('/api/')) {
      // 东方财富搜索建议
      if (pathname.includes('/suggest')) {
        const targetUrl = `https://searchapi.eastmoney.com/api/suggest/get${url.search}`;
        try {
          const response = await fetch(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Referer': 'https://quote.eastmoney.com/'
            }
          });
          const body = await response.arrayBuffer();
          return new Response(body, {
            status: response.status,
            headers: {
              'Content-Type': response.headers.get('Content-Type') || 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      
      // 其他 API 端点...
      if (pathname.includes('/quote') || pathname.includes('/clist') || pathname.includes('/kline') || pathname.startsWith('/api/eastmoney/')) {
        // 构建目标 URL
        let targetUrl;
        if (pathname.includes('/kline')) {
          targetUrl = `https://push2his.eastmoney.com/api/qt/stock/kline/get${url.search}`;
        } else if (pathname.includes('/quote')) {
          targetUrl = `https://push2.eastmoney.com/api/qt/stock/get${url.search}`;
        } else if (pathname.includes('/clist')) {
          targetUrl = `https://push2.eastmoney.com/api/qt/clist/get${url.search}`;
        } else {
          // 通用处理
          let path = pathname.substring('/api/eastmoney/'.length);
          if (!path.startsWith('api/') && !path.startsWith('qt/')) {
            path = 'api/' + path;
          }
          targetUrl = `https://push2.eastmoney.com/${path}${url.search}`;
        }
        
        try {
          const response = await fetch(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Referer': 'https://quote.eastmoney.com/'
            }
          });
          const body = await response.arrayBuffer();
          return new Response(body, {
            status: response.status,
            headers: {
              'Content-Type': response.headers.get('Content-Type') || 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }
    
    // 所有非 API 请求都交给 Pages 处理静态资源
    return env.ASSETS.fetch(request);
  }
};