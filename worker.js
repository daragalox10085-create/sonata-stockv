/**
 * Cloudflare Worker - API代理
 * 解决跨域和API路径问题
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // 腾讯API代理
    if (url.pathname.startsWith('/api/tencent/')) {
      const targetUrl = 'https://qt.gtimg.cn' + url.pathname.replace('/api/tencent', '');
      return proxyRequest(targetUrl, request);
    }
    
    // 东方财富API代理
    if (url.pathname.startsWith('/api/eastmoney/')) {
      const targetUrl = 'https://push2.eastmoney.com' + url.pathname.replace('/api/eastmoney', '');
      return proxyRequest(targetUrl, request);
    }
    
    // 新浪财经API代理
    if (url.pathname.startsWith('/api/sina/')) {
      const targetUrl = 'https://hq.sinajs.cn' + url.pathname.replace('/api/sina', '');
      return proxyRequest(targetUrl, request);
    }
    
    // 默认返回静态文件
    return fetch(request);
  }
};

async function proxyRequest(targetUrl, request) {
  const response = await fetch(targetUrl, {
    method: request.method,
    headers: {
      ...request.headers,
      'Origin': 'https://qt.gtimg.cn'
    }
  });
  
  // 添加CORS头
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Access-Control-Allow-Origin', '*');
  newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  newHeaders.set('Access-Control-Allow-Headers', 'Content-Type');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}
