/**
 * 股票名称服务
 */

const stockNameMap: Record<string, string> = {
  '600519': '贵州茅台',
  '000858': '五粮液',
  '002594': '比亚迪',
  '300750': '宁德时代',
  '002415': '海康威视',
  '601318': '中国平安',
  '600036': '招商银行',
  '601012': '隆基绿能',
  '000333': '美的集团',
  '600276': '恒瑞医药',
  '600887': '伊利股份',
  '000568': '泸州老窖',
  '002714': '牧原股份',
  '300760': '迈瑞医疗',
  '603288': '海天味业',
};

export function getStockName(code: string): string {
  return stockNameMap[code] || code;
}

export function searchStockByName(name: string): string[] {
  const results: string[] = [];
  for (const [code, stockName] of Object.entries(stockNameMap)) {
    if (stockName.includes(name)) {
      results.push(code);
    }
  }
  return results;
}
