/**
 * 每周市场更新服务
 */

// 本地类型定义，避免循环依赖
interface StockData {
  code: string;
  name: string;
  sector: string;
  pe: number;
  peg: number;
  score: number;
  recommendation: string;
}

interface SectorData {
  name: string;
  hotScore: number;
  trend: string;
  capitalFlow: number;
}

function setLastUpdate(): void {
  localStorage.setItem('weeklyMarketLastUpdate', new Date().toISOString());
}

export interface UpdateStatus {
  lastUpdate: Date | null;
  isExpired: boolean;
  daysSinceUpdate: number;
  needsUpdate?: boolean;
}

export function getUpdateStatus(): UpdateStatus {
  const lastUpdateStr = localStorage.getItem('weeklyMarketLastUpdate');
  const lastUpdate = lastUpdateStr ? new Date(lastUpdateStr) : null;
  const now = new Date();
  const daysSinceUpdate = lastUpdate 
    ? Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24))
    : Infinity;
  
  return {
    lastUpdate,
    isExpired: daysSinceUpdate >= 7,
    daysSinceUpdate
  };
}

export async function forceUpdate(): Promise<{ stocks: StockData[]; sectors: SectorData[] }> {
  const stocks: StockData[] = [
    { code: '600519', name: '贵州茅台', sector: '白酒', pe: 28.5, peg: 1.8, score: 85, recommendation: '强烈推荐' },
    { code: '000858', name: '五粮液', sector: '白酒', pe: 18.2, peg: 1.2, score: 78, recommendation: '推荐' },
    { code: '002594', name: '比亚迪', sector: '新能源汽车', pe: 32.1, peg: 2.1, score: 72, recommendation: '推荐' },
    { code: '300750', name: '宁德时代', sector: '新能源', pe: 25.3, peg: 1.5, score: 68, recommendation: '谨慎推荐' },
    { code: '002415', name: '海康威视', sector: '安防', pe: 22.1, peg: 1.3, score: 65, recommendation: '谨慎推荐' },
  ];

  const sectors: SectorData[] = [
    { name: '人工智能', hotScore: 85, trend: 'up', capitalFlow: 25.5 },
    { name: '新能源汽车', hotScore: 78, trend: 'up', capitalFlow: 18.2 },
    { name: '半导体', hotScore: 72, trend: 'stable', capitalFlow: 12.5 },
    { name: '白酒', hotScore: 68, trend: 'stable', capitalFlow: 8.3 },
    { name: '医药', hotScore: 62, trend: 'down', capitalFlow: -5.2 },
  ];

  setLastUpdate();
  return { stocks, sectors };
}
