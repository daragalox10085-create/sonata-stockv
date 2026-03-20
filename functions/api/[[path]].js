// Cloudflare Pages Functions - API 代理
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // 路由分发
  if (path.includes('/tencent/quote')) {
    return handleTencentQuote(url, corsHeaders);
  }
  if (path.includes('/tencent/kline')) {
    return handleTencentKline(url, corsHeaders);
  }
  if (path.includes('/eastmoney/quote')) {
    return handleEastMoneyQuote(url, corsHeaders);
  }
  if (path.includes('/eastmoney/kline')) {
    return handleEastMoneyKline(url, corsHeaders);
  }
  if (path.includes('/eastmoney/sector')) {
    return handleEastMoneySector(url, corsHeaders);
  }
  if (path.includes('/sina/')) {
    return handleSinaKline(url, corsHeaders);
  }
  if (path.includes('/suggest')) {
    return handleSuggest(url, corsHeaders);
  }
  
  return new Response('Not Found', { status: 404, headers: corsHeaders });
}

async function handleTencentQuote(url, corsHeaders) {
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
    return new Response(data, { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=gb2312' }});
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }
}

async function handleTencentKline(url, corsHeaders) {
  const code = url.searchParams.get('code') || '';
  const start = url.searchParams.get('start') || '';
  const end = url.searchParams.get('end') || '';
  const limit = url.searchParams.get('limit') || '240';
  const adjust = url.searchParams.get('adjust') || 'qfq';
  
  const targetUrl = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${code},day,${start},${end},${limit},${adjust}`;
  
  try {
    const response = await fetch(targetUrl, {
      headers: {
        'Referer': 'https://finance.qq.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const data = await response.json();
    return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }
}

async function handleEastMoneyQuote(url, corsHeaders) {
  const secid = url.searchParams.get('secid') || '';
  const fields = url.searchParams.get('fields') || 'f43,f57,f58,f169,f170';
  const targetUrl = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=${fields}`;
  
  try {
    const response = await fetch(targetUrl, {
      headers: {
        'Referer': 'https://quote.eastmoney.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const data = await response.json();
    return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }
}

async function handleEastMoneyKline(url, corsHeaders) {
  const secid = url.searchParams.get('secid') || '';
  const klt = url.searchParams.get('klt') || '101';
  const fqt = url.searchParams.get('fqt') || '1';
  const lmt = url.searchParams.get('lmt') || '365';
  const fields1 = url.searchParams.get('fields1') || 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13';
  const fields2 = url.searchParams.get('fields2') || 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61';
  const end = url.searchParams.get('end') || '20500101';
  const targetUrl = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&fields1=${fields1}&fields2=${fields2}&klt=${klt}&fqt=${fqt}&lmt=${lmt}&end=${end}`;
  
  try {
    const response = await fetch(targetUrl, {
      headers: {
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Referer': 'https://quote.eastmoney.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  } catch (error) {
    console.error('K线获取失败:', error.message);
    return new Response(JSON.stringify({ rc: 0, data: null, error: error.message }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }
}

async function handleEastMoneySector(url, corsHeaders) {
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
    return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }
}

// 新浪财经 K 线 - 修复端点
async function handleSinaKline(url, corsHeaders) {
  const symbol = url.searchParams.get('symbol') || '';
  const scale = url.searchParams.get('scale') || '240';
  const datalen = url.searchParams.get('datalen') || '365';
  
  // 修复：使用正确的 K 线 API 端点
  const targetUrl = `https://quotes.sina.cn/cn/api/quotes.php?symbol=${symbol}&scale=${scale}&ma=no&datalen=${datalen}`;
  
  try {
    const response = await fetch(targetUrl, {
      headers: {
        'Referer': 'https://finance.sina.com.cn',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const data = await response.json();
    return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }
}

async function handleSuggest(url, corsHeaders) {
  const input = url.searchParams.get('input') || '';
  const targetUrl = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(input)}&type=14&count=10`;
  
  try {
    const response = await fetch(targetUrl);
    const data = await response.json();
    return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }
}