#!/usr/bin/env node
/**
 * K 线 API 测试脚本
 * 测试 513310 中韩半导体 ETF 的 K 线数据获取
 */

const testSymbol = '513310';
const testName = '中韩半导体 ETF';

console.log(`\n🧪 开始测试 ${testName} (${testSymbol}) 的 K 线 API\n`);

// 测试新浪财经 API
async function testSinaAPI() {
  const url = `http://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=sh${testSymbol}&scale=240&ma=no&datalen=360`;
  
  console.log(`📡 测试新浪财经 API...`);
  console.log(`   URL: ${url}\n`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log(`✅ 响应状态：${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      console.error(`❌ HTTP 错误：${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      console.error(`❌ 数据格式错误：不是数组`);
      return null;
    }
    
    console.log(`✅ 数据格式：数组，长度 ${data.length}`);
    
    if (data.length === 0) {
      console.error(`❌ 数据为空`);
      return null;
    }
    
    // 验证数据结构
    const firstItem = data[0];
    const requiredFields = ['day', 'open', 'high', 'low', 'close', 'volume'];
    const missingFields = requiredFields.filter(f => !(f in firstItem));
    
    if (missingFields.length > 0) {
      console.error(`❌ 数据字段缺失：${missingFields.join(', ')}`);
      return null;
    }
    
    console.log(`✅ 数据字段完整`);
    console.log(`\n📊 首条数据:`);
    console.log(`   日期：${firstItem.day}`);
    console.log(`   开盘：${firstItem.open}`);
    console.log(`   最高：${firstItem.high}`);
    console.log(`   最低：${firstItem.low}`);
    console.log(`   收盘：${firstItem.close}`);
    console.log(`   成交量：${firstItem.volume}`);
    
    // 验证最后一条数据（最新）
    const lastItem = data[data.length - 1];
    console.log(`\n📊 末条数据 (最新):`);
    console.log(`   日期：${lastItem.day}`);
    console.log(`   开盘：${lastItem.open}`);
    console.log(`   最高：${lastItem.high}`);
    console.log(`   最低：${lastItem.low}`);
    console.log(`   收盘：${lastItem.close}`);
    console.log(`   成交量：${lastItem.volume}`);
    
    // 验证数据有效性
    const validData = data.filter(item => {
      const open = parseFloat(item.open);
      return !isNaN(open) && open > 0;
    });
    
    console.log(`\n✅ 有效数据：${validData.length}/${data.length}`);
    
    if (validData.length < data.length) {
      console.warn(`⚠️ ${data.length - validData.length} 条数据无效`);
    }
    
    return {
      success: true,
      count: data.length,
      validCount: validData.length,
      firstDate: firstItem.day,
      lastDate: lastItem.day,
      latestPrice: {
        open: parseFloat(lastItem.open),
        high: parseFloat(lastItem.high),
        low: parseFloat(lastItem.low),
        close: parseFloat(lastItem.close)
      }
    };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ 请求失败：${errorMsg}`);
    
    if (errorMsg.includes('fetch')) {
      console.error(`\n💡 提示：可能是网络错误或 CORS 限制`);
      console.error(`   在生产环境中，需要通过 Vite 代理或后端转发请求`);
    }
    
    return {
      success: false,
      error: errorMsg
    };
  }
}

// 运行测试
(async () => {
  const result = await testSinaAPI();
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`测试总结:`);
  console.log(`${'='.repeat(60)}`);
  
  if (result?.success) {
    console.log(`✅ 新浪财经 API 测试通过`);
    console.log(`   数据条数：${result.count}`);
    console.log(`   有效数据：${result.validCount}`);
    console.log(`   日期范围：${result.firstDate} 至 ${result.lastDate}`);
    console.log(`   最新价格：¥${result.latestPrice.close}`);
    console.log(`\n🎉 K 线数据获取正常！\n`);
    process.exit(0);
  } else {
    console.log(`❌ 新浪财经 API 测试失败`);
    console.log(`   错误：${result?.error || '未知错误'}`);
    console.log(`\n💡 建议:`);
    console.log(`   1. 检查网络连接`);
    console.log(`   2. 确认 Vite 代理配置正确`);
    console.log(`   3. 在浏览器开发者工具中查看网络请求\n`);
    process.exit(1);
  }
})();
