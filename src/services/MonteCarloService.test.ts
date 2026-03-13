/**
 * 蒙特卡洛服务测试 - 验证概率一致性
 */

import { MonteCarloSimulator } from './MonteCarloService_fixed.js';

// 模拟历史价格数据（生成随机 walk）
function generateMockPrices(startPrice: number, days: number): number[] {
  const prices: number[] = [startPrice];
  let current = startPrice;
  
  for (let i = 1; i < days; i++) {
    // 随机游走，日波动约2%
    const change = (Math.random() - 0.48) * 0.04; // 略微偏向上涨
    current = current * (1 + change);
    prices.push(current);
  }
  
  return prices;
}

// 测试概率一致性
async function testProbabilityConsistency() {
  console.log('='.repeat(60));
  console.log('蒙特卡洛概率一致性测试');
  console.log('='.repeat(60));
  
  const simulator = new MonteCarloSimulator();
  const currentPrice = 100;
  const historicalPrices = generateMockPrices(95, 60); // 60天历史数据
  
  console.log(`\n测试参数:`);
  console.log(`- 当前价格: ¥${currentPrice}`);
  console.log(`- 历史数据天数: ${historicalPrices.length}`);
  console.log(`- 历史价格范围: ¥${Math.min(...historicalPrices).toFixed(2)} - ¥${Math.max(...historicalPrices).toFixed(2)}`);
  
  const result = await simulator.runMonteCarlo(currentPrice, historicalPrices);
  
  if (!result) {
    console.error('模拟失败');
    return;
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('测试结果');
  console.log('='.repeat(60));
  
  // 验证1: 上涨 + 下跌 = 100%
  const totalDirectionProb = result.upProbability + result.downProbability;
  console.log(`\n【验证1】涨跌概率:`);
  console.log(`  - 上涨概率: ${result.upProbability}%`);
  console.log(`  - 下跌概率: ${result.downProbability}%`);
  console.log(`  - 总和: ${totalDirectionProb}% ${totalDirectionProb === 100 ? '✓' : '✗'}`);
  
  // 验证2: 情景概率总和 = 100%
  const totalScenarioProb = result.scenarios.reduce((sum, s) => sum + s.probability, 0);
  console.log(`\n【验证2】情景概率:`);
  result.scenarios.forEach(s => {
    console.log(`  - ${s.type}: ${s.probability}%`);
  });
  console.log(`  - 总和: ${totalScenarioProb}% ${totalScenarioProb === 100 ? '✓' : '✗'}`);
  
  // 验证3: 情景定义合理性
  console.log(`\n【验证3】情景定义:`);
  result.scenarios.forEach(s => {
    const isReasonable = s.probability >= 10 && s.probability <= 60;
    console.log(`  - ${s.type}: ${s.probability}% ${isReasonable ? '✓' : '⚠'}`);
    console.log(`    价格区间: ¥${s.priceRange[0].toFixed(2)} - ¥${s.priceRange[1].toFixed(2)}`);
    console.log(`    期望收益: ${s.expectedReturn >= 0 ? '+' : ''}${s.expectedReturn}%`);
  });
  
  // 验证4: 上涨概率与情景的关系
  console.log(`\n【验证4】逻辑一致性:`);
  const optimisticProb = result.scenarios.find(s => s.type === '乐观')?.probability || 0;
  const baselineProb = result.scenarios.find(s => s.type === '基准')?.probability || 0;
  const pessimisticProb = result.scenarios.find(s => s.type === '悲观')?.probability || 0;
  
  console.log(`  - 上涨概率(${result.upProbability}%) 应该 >= 乐观概率(${optimisticProb}%)`);
  console.log(`    ${result.upProbability >= optimisticProb ? '✓' : '✗'}`);
  console.log(`  - 下跌概率(${result.downProbability}%) 应该 >= 悲观概率(${pessimisticProb}%)`);
  console.log(`    ${result.downProbability >= pessimisticProb ? '✓' : '✗'}`);
  
  // 验证5: 预期价格在合理范围内
  console.log(`\n【验证5】预期价格:`);
  console.log(`  - 预期价格: ¥${result.expectedPrice.toFixed(2)}`);
  const minScenarioPrice = Math.min(...result.scenarios.map(s => s.priceRange[0]));
  const maxScenarioPrice = Math.max(...result.scenarios.map(s => s.priceRange[1]));
  const isPriceReasonable = result.expectedPrice >= minScenarioPrice * 0.8 && result.expectedPrice <= maxScenarioPrice * 1.2;
  console.log(`  - 情景价格范围: ¥${minScenarioPrice.toFixed(2)} - ¥${maxScenarioPrice.toFixed(2)}`);
  console.log(`  - 预期价格在合理范围内: ${isPriceReasonable ? '✓' : '✗'}`);
  
  // 最终判定
  console.log(`\n${'='.repeat(60)}`);
  const allPassed = 
    totalDirectionProb === 100 && 
    totalScenarioProb === 100 && 
    result.upProbability >= optimisticProb &&
    result.downProbability >= pessimisticProb;
  
  if (allPassed) {
    console.log('✓ 所有验证通过！概率与情景一致。');
  } else {
    console.log('✗ 存在一致性问题，请检查代码。');
  }
  console.log('='.repeat(60));
  
  // 打印推导步骤
  console.log(`\n推导步骤:`);
  result.derivationSteps.forEach((step, idx) => {
    console.log(`  ${idx + 1}. ${step}`);
  });
}

// 运行多次测试验证稳定性
async function runMultipleTests(count: number = 5) {
  console.log('\n\n');
  console.log('#'.repeat(60));
  console.log(`运行 ${count} 次稳定性测试`);
  console.log('#'.repeat(60));
  
  let passCount = 0;
  
  for (let i = 0; i < count; i++) {
    console.log(`\n--- 测试 #${i + 1} ---`);
    const simulator = new MonteCarloSimulator();
    const currentPrice = 100 + Math.random() * 50; // 随机价格
    const historicalPrices = generateMockPrices(currentPrice * 0.95, 60);
    
    const result = await simulator.runMonteCarlo(currentPrice, historicalPrices);
    
    if (result) {
      const totalDirectionProb = result.upProbability + result.downProbability;
      const totalScenarioProb = result.scenarios.reduce((sum, s) => sum + s.probability, 0);
      
      if (totalDirectionProb === 100 && totalScenarioProb === 100) {
        passCount++;
        console.log(`✓ 通过 - 上涨:${result.upProbability}%, 情景总和:${totalScenarioProb}%`);
      } else {
        console.log(`✗ 失败 - 涨跌总和:${totalDirectionProb}%, 情景总和:${totalScenarioProb}%`);
      }
    }
  }
  
  console.log(`\n${'#'.repeat(60)}`);
  console.log(`测试结果: ${passCount}/${count} 通过 (${(passCount/count*100).toFixed(0)}%)`);
  console.log('#'.repeat(60));
}

// 执行测试
testProbabilityConsistency().then(() => {
  runMultipleTests(5);
});
