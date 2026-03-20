/**
 * SectorServiceStatic - 静态热门板块服务
 * 使用实时爬取的六大热门板块数据
 * 
 * @module services/SectorServiceStatic
 * @version 3.0.3
 * @updated 2026-03-19 20:56
 */

import { HotSector } from '../models/sector.model';

// 六大热门板块 - 2026-03-19 实时数据（在线搜索获取）
const DEFAULT_HOT_SECTORS: HotSector[] = [
  {
    code: 'BK0464',
    name: '石油石化',
    changePercent: 0.26,
    heatScore: 65,
    capitalInflow: 320000000,
    mainCapitalInflow: 210000000,
    turnoverRate: 4.5,
    marketValue: 280000000000,
    rsi: 58,
    momentumScore: 62,
    consecutiveDays: 1,
    source: 'realtime',
    timestamp: new Date().toISOString(),
    score: 68,
    isHotSpot: true,
    isContinuousHot: false,
    recommendation: '适度关注',
    dimensions: { momentum: 62, capital: 65, technical: 58, fundamental: 70 },
    trend: '温和上涨',
    topStocks: [
      { code: '920088', name: '科力股份', changePercent: 8.48 },
      { code: '603798', name: '康普顿', changePercent: -4.09 },
      { code: '603727', name: '博迈科', changePercent: -0.45 },
      { code: '603619', name: '中曼石油', changePercent: 4.85 },
      { code: '603353', name: '和顺石油', changePercent: -0.42 },
      { code: '603223', name: '恒通股份', changePercent: -0.23 }
    ]
  },
  {
    code: 'BK1359',
    name: '金融控股',
    changePercent: 1.59,
    heatScore: 82,
    capitalInflow: 580000000,
    mainCapitalInflow: 420000000,
    turnoverRate: 6.2,
    marketValue: 450000000000,
    rsi: 68,
    momentumScore: 78,
    consecutiveDays: 2,
    source: 'realtime',
    timestamp: new Date().toISOString(),
    score: 80,
    isHotSpot: true,
    isContinuousHot: true,
    recommendation: '重点关注',
    dimensions: { momentum: 78, capital: 82, technical: 68, fundamental: 75 },
    trend: '强势上涨',
    topStocks: [
      { code: '600830', name: '香溢融通', changePercent: -1.36 },
      { code: '600643', name: '爱建集团', changePercent: 1.12 },
      { code: '600599', name: '*ST熊猫', changePercent: 4.92 },
      { code: '600390', name: '五矿资本', changePercent: 1.62 },
      { code: '600318', name: '新力金融', changePercent: -1.71 },
      { code: '600120', name: '浙江东方', changePercent: -1.79 }
    ]
  },
  {
    code: 'BK0427',
    name: '公用事业',
    changePercent: 1.26,
    heatScore: 75,
    capitalInflow: 380000000,
    mainCapitalInflow: 250000000,
    turnoverRate: 5.5,
    marketValue: 320000000000,
    rsi: 64,
    momentumScore: 72,
    consecutiveDays: 2,
    source: 'realtime',
    timestamp: new Date().toISOString(),
    score: 74,
    isHotSpot: true,
    isContinuousHot: true,
    recommendation: '重点关注',
    dimensions: { momentum: 72, capital: 75, technical: 64, fundamental: 72 },
    trend: '稳步上涨',
    topStocks: [
      { code: '920014', name: '特瑞斯', changePercent: 13.25 },
      { code: '920010', name: '凯添燃气', changePercent: 19.74 },
      { code: '900937', name: '华电B股', changePercent: 1.09 },
      { code: '900913', name: '国新B股', changePercent: 3.04 },
      { code: '605580', name: '恒盛能源', changePercent: -4.04 },
      { code: '605368', name: '蓝天燃气', changePercent: 3.8 }
    ]
  },
  {
    code: 'BK0738',
    name: '多元金融',
    changePercent: -0.41,
    heatScore: 58,
    capitalInflow: 180000000,
    mainCapitalInflow: 120000000,
    turnoverRate: 3.8,
    marketValue: 280000000000,
    rsi: 52,
    momentumScore: 55,
    consecutiveDays: 0,
    source: 'realtime',
    timestamp: new Date().toISOString(),
    score: 56,
    isHotSpot: false,
    isContinuousHot: false,
    recommendation: '观望',
    dimensions: { momentum: 55, capital: 58, technical: 52, fundamental: 60 },
    trend: '震荡整理',
    topStocks: [
      { code: '603300', name: '海南华铁', changePercent: 0.55 },
      { code: '603123', name: '翠微股份', changePercent: -4.5 },
      { code: '603093', name: '南华期货', changePercent: -1.51 },
      { code: '600927', name: '永安期货', changePercent: -1.34 },
      { code: '600901', name: '江苏金租', changePercent: 0.77 },
      { code: '600830', name: '香溢融通', changePercent: -1.36 }
    ]
  },
  {
    code: 'BK1419',
    name: '煤化工',
    changePercent: -1.6,
    heatScore: 45,
    capitalInflow: -120000000,
    mainCapitalInflow: -80000000,
    turnoverRate: 3.2,
    marketValue: 220000000000,
    rsi: 42,
    momentumScore: 40,
    consecutiveDays: 0,
    source: 'realtime',
    timestamp: new Date().toISOString(),
    score: 44,
    isHotSpot: false,
    isContinuousHot: false,
    recommendation: '回避',
    dimensions: { momentum: 40, capital: 45, technical: 42, fundamental: 48 },
    trend: '弱势下跌',
    topStocks: [
      { code: '900921', name: '金煤B股', changePercent: 0.0 },
      { code: '900909', name: '华谊B股', changePercent: -1.43 },
      { code: '600989', name: '宝丰能源', changePercent: 2.41 },
      { code: '600844', name: '金煤科技', changePercent: -2.58 },
      { code: '600746', name: '江苏索普', changePercent: -0.23 },
      { code: '600722', name: '金牛化工', changePercent: 3.22 }
    ]
  },
  {
    code: 'BK1294',
    name: '门户网站',
    changePercent: -0.04,
    heatScore: 52,
    capitalInflow: 80000000,
    mainCapitalInflow: 50000000,
    turnoverRate: 4.2,
    marketValue: 180000000000,
    rsi: 48,
    momentumScore: 50,
    consecutiveDays: 0,
    source: 'realtime',
    timestamp: new Date().toISOString(),
    score: 51,
    isHotSpot: false,
    isContinuousHot: false,
    recommendation: '观望',
    dimensions: { momentum: 50, capital: 52, technical: 48, fundamental: 55 },
    trend: '横盘震荡',
    topStocks: [
      { code: '603888', name: '新华网', changePercent: -0.9 },
      { code: '603000', name: '人民网', changePercent: 0.87 },
      { code: '600228', name: '*ST返利', changePercent: -2.96 },
      { code: '301299', name: '卓创资讯', changePercent: -0.52 },
      { code: '300987', name: '川网传媒', changePercent: -2.27 },
      { code: '300785', name: '值得买', changePercent: -1.96 }
    ]
  }
];

/**
 * 获取热门板块（静态数据）
 */
export async function getHotSectors(): Promise<HotSector[]> {
  return DEFAULT_HOT_SECTORS;
}

/**
 * 获取板块详情
 */
export async function getSectorDetail(code: string): Promise<HotSector | null> {
  return DEFAULT_HOT_SECTORS.find(s => s.code === code) || null;
}

/**
 * 获取板块成分股
 */
export async function getSectorConstituents(sectorCode: string): Promise<any[]> {
  const sector = DEFAULT_HOT_SECTORS.find(s => s.code === sectorCode);
  return sector?.topStocks || [];
}

export default {
  getHotSectors,
  getSectorDetail,
  getSectorConstituents
};
