/**
 * 格式化工具函数
 */

/**
 * 格式化价格
 */
export function formatPrice(price: number): string {
  return `¥${price.toFixed(2)}`;
}

/**
 * 格式化市值
 */
export function formatMarketCap(marketCap: number): string {
  if (marketCap >= 1000000000000) {
    return `${(marketCap / 1000000000000).toFixed(2)}万亿`;
  }
  if (marketCap >= 100000000) {
    return `${(marketCap / 100000000).toFixed(1)}亿`;
  }
  if (marketCap >= 10000) {
    return `${(marketCap / 10000).toFixed(0)}万`;
  }
  return marketCap.toFixed(0);
}

/**
 * 格式化成交量
 */
export function formatVolume(volume: number): string {
  if (volume >= 100000000) {
    return `${(volume / 100000000).toFixed(1)}亿`;
  }
  if (volume >= 10000) {
    return `${(volume / 10000).toFixed(0)}万`;
  }
  return volume.toFixed(0);
}

/**
 * 格式化百分比（带颜色）
 */
export function formatPercentWithColor(percent: number): string {
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
}

/**
 * 格式化百分比（不带颜色）
 */
export function formatPercent(percent: number): string {
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
}

/**
 * 格式化盈亏比
 */
export function formatRiskRewardRatio(ratio: number): string {
  return `1:${ratio.toFixed(2)}`;
}

/**
 * 获取盈亏比评级
 */
export function getRiskRewardRating(ratio: number): { color: string; description: string } {
  if (ratio >= 3) return { color: 'text-green-600', description: '盈亏比优秀' };
  if (ratio >= 2) return { color: 'text-green-500', description: '盈亏比良好' };
  if (ratio >= 1) return { color: 'text-yellow-600', description: '盈亏比一般' };
  return { color: 'text-red-600', description: '盈亏比较差' };
}
