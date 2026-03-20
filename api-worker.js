// Cloudflare Worker - Sonata API 代理
// 独立部署，避免与 Pages 静态资源冲突

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // CORS 头
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // 腾讯实时行情 API
    if (path.startsWith('/api/tencent/quote')) {
      return handleTencentQuote(url, request, corsHeaders);
    }
    
    // 腾讯 K 线 API
    if (path.startsWith('/api/tencent/kline')) {
      return handleTencentKline(url, request, corsHeaders);
    }
    
    // 东方财富实时行情
    if (path.startsWith('/api/eastmoney/quote')) {
      return handleEastMoneyQuote(url, request, corsHeaders);
    }
    
    // 东方财富 K 线
    if (path.startsWith('/api/eastmoney/kline')) {
      return handleEastMoneyKline(url, request, corsHeaders);
    }
    
    // 东方财富板块数据
    if (path.startsWith('/api/eastmoney/sector')) {
      return handleEastMoneySector(url, request, corsHeaders);
    }
    
    // 新浪财经 K 线
    if (path.startsWith('/api/sina/')) {
      return handleSinaKline(url, request, corsHeaders);
    }
    
    // 搜索建议
    if (path.startsWith('/api/suggest')) {
      return handleSuggest(url, request, corsHeaders);
    }
    
    return new Response('Not Found', { status: 404, headers: corsHeaders });
  }
};

// 腾讯实时行情
async function handleTencentQuote(url, request, corsHeaders) {
  const symbol = url.searchParams.get('q') || '';
  const targetUrl = `https://qt.gtimg.cn/q=${symbol}`;
  
  try {
    const response = await fetch(targetUrl, {
      headers: {
        'Referer': 'https://finance.qq.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const data = await response.text();
    return new Response(data, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain; charset=gb2312'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// 腾讯 K 线
async function handleTencentKline(url, request, corsHeaders) {
  const code = url.searchParams.get('code') || '';
  const start = url.searchParams.get('start') || '';
  const end = url.searchParams.get('end') || '';
  const limit = url.searchParams.get('limit') || '240';
  const adjust = url.searchParams.get('adjust') || 'qfq';
  
  const targetUrl = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${code},day,${start},${end},${limit},${adjust}`;
  
  try {
    const response = await fetch(targetUrl);
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// 东方财富实时行情
async function handleEastMoneyQuote(url, request, corsHeaders) {
  const secid = url.searchParams.get('secid') || '';
  const fields = url.searchParams.get('fields') || 'f43,f44,f45,f46,f47,f48,f49,f57,f58,f60,f169,f170';
  
  const targetUrl = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=${fields}`;
  
  try {
    const response = await fetch(targetUrl, {
      headers: {
        'Referer': 'https://quote.eastmoney.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// 东方财富 K 线
async function handleEastMoneyKline(url, request, corsHeaders) {
  const secid = url.searchParams.get('secid') || '';
  const fields1 = url.searchParams.get('fields1') || 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13';
  const fields2 = url.searchParams.get('fields2') || 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61';
  const klt = url.searchParams.get('klt') || '240';
  const fqt = url.searchParams.get('fqt') || '1';
  const lmt = url.searchParams.get('lmt') || '240';
  
  const targetUrl = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&fields1=${fields1}&fields2=${fields2}&klt=${klt}&fqt=${fqt}&lmt=${lmt}`;
  
  try {
    const response = await fetch(targetUrl);
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// 东方财富板块数据
async function handleEastMoneySector(url, request, corsHeaders) {
  const queryString = url.searchParams.toString();
  const targetUrl = `https://push2.eastmoney.com/api/qt/clist/get?${queryString}`;
  
  try {
    const response = await fetch(targetUrl, {
      headers: {
        'Referer': 'https://quote.eastmoney.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// 新浪财经 K 线
async function handleSinaKline(url, request, corsHeaders) {
  const symbol = url.searchParams.get('symbol') || '';
  
  const targetUrl = `https://hq.sinajs.cn/list=${symbol}`;
  
  try {
    const response = await fetch(targetUrl, {
      headers: {
        'Referer': 'https://finance.sina.com.cn',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const text = await response.text();
    const match = text.match(/var hq_str_\w+="([^"]*)";/);
    if (match) {
      const data = match[1].split(',');
      const result = {
        symbol: symbol,
        name: data[0] || '',
        open: data[1] || '',
        close: data[2] || '',
        current: data[3] || '',
        high: data[4] || '',
        low: data[5] || '',
        raw: text
      };
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ error: 'Failed to parse sina data', raw: text }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// 搜索建议
async function handleSuggest(url, request, corsHeaders) {
  const key = url.searchParams.get('key') || '';
  const targetUrl = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(key)}&type=14&count=10`;
  
  try {
    const response = await fetch(targetUrl);
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
