/**
 * Sonata 数据修复测试脚本
 * 验证：1. 蒙特卡洛概率 2. 热门板块数量 3. 精选股票池
 */

import { dynamicAnalysisService } from './src/services/dynamicAnalysisService';
import { realDataFetcher } from './src/services/realDataFetcher';
import { stockSelector } from './src/services/stockSelector';

async function testFixes() {
  console.log('========================================');
  console.log('Sonata 数据修复测试');
  console.log('========================================\n');

  // ========== 测试1: 蒙特卡洛概率一致性 ==========
  console.log('【测试1】蒙特卡洛概率一致性');
  console.log('----------------------------------------');
  
  // 模拟历史价格数据
  const mockPrices: number[] = [];
  let price = 100;
  for (let i = 0; i < 60; i++) {
    price = price * (1 + (Math.random() - 0.5) * 0.02);
    mockPrices.push(price);
  }
  const currentPrice = mockPrices[mockPrices.length - 1];
  
  const monteCarloResult = await dynamicAnalysisService.runMonteCarlo(currentPrice, mockPrices);
  
  if (monteCarloResult) {
    const { upProbability, downProbability, scenarios } = monteCarloResult;
    const optimisticProb = scenarios.find(s => s.type === '乐观')?.probability || 0;
    const baselineProb = scenarios.find(s => s.type === '基准')?.probability || 0;
    
    // 计算基准上涨比例（P75到当前价格的比例）
    const p75 = scenarios.find(s => s.type === '乐观')?.priceRange[0] || currentPrice;
    const p40 = scenarios.find(s => s.type === '基准')?.priceRange[0] || currentPrice * 0.95;
    const baselineUpRatio = (p75 - currentPrice) / (p75 - p40);
    const calculatedUpProb = optimisticProb + baselineProb * baselineUpRatio;
    
    console.log(`上涨概率: ${upProbability}%`);
    console.log(`下跌概率: ${downProbability}%`);
    console.log(`乐观情景概率: ${optimisticProb}%`);
    console.log(`基准情景概率: ${baselineProb}%`);
    console.log(`基准上涨比例: ${(baselineUpRatio * 100).toFixed(1)}%`);
    console.log(`计算上涨概率: ${calculatedUpProb.toFixed(1)}%`);
    console.log(`概率差异: ${Math.abs(upProbability - calculatedUpProb).toFixed(1)}%`);
    
    const isConsistent = Math.abs(upProbability - calculatedUpProb) < 5;
    console.log(`✅ 概率一致性检查: ${isConsistent ? '通过' : '未通过'}`);
  } else {
    console.log('❌ 蒙特卡洛模拟失败');
  }
  
  console.log('\n');

  // ========== 测试2: 热门板块数量 ==========
  console.log('【测试2】热门板块数量');
  console.log('----------------------------------------');
  
  const sectors = await dynamicAnalysisService.getHotSectors();
  console.log(`获取到 ${sectors.length} 个热门板块`);
  
  sectors.forEach((sector, index) => {
    console.log(`  ${index + 1}. ${sector.name} - 评分: ${sector.score}, 趋势: ${sector.trend}`);
  });
  
  const sectorCountCorrect = sectors.length === 6;
  console.log(`✅ 板块数量检查: ${sectorCountCorrect ? '通过' : `未通过 (期望6个，实际${sectors.length}个)`}`);
  
  console.log('\n');

  // ========== 测试3: 精选股票池 ==========
  console.log('【测试3】精选股票池');
  console.log('----------------------------------------');
  
  const featuredStocks = await dynamicAnalysisService.getFeaturedStocks(5);
  console.log(`获取到 ${featuredStocks.length} 只精选股票`);
  
  featuredStocks.forEach((stock, index) => {
    console.log(`  ${index + 1}. ${stock.code} ${stock.name} - 评分: ${stock.score}, 推荐: ${stock.recommendation}`);
    console.log(`     价格: ¥${stock.metrics.currentPrice}, 距支撑: ${stock.metrics.distanceToSupport.toFixed(1)}%, 上涨空间: ${stock.metrics.upwardSpace.toFixed(1)}%`);
  });
  
  const hasFeaturedStocks = featuredStocks.length > 0;
  console.log(`✅ 精选股票池检查: ${hasFeaturedStocks ? '通过' : '未通过 (无符合条件的股票)'}`);
  
  console.log('\n========================================');
  console.log('测试完成');
  console.log('========================================');
}

// 运行测试
testFixes().catch(console.error);
