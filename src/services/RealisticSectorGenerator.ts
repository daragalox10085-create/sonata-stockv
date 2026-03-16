// src/services/RealisticSectorGenerator.ts
// 生成真实感的热门板块数据（基于当前市场情况）

import { DynamicHotSector } from './DynamicSectorAnalyzer';

// 当前热门板块模板（基于2026年3月市场情况）
const SECTOR_TEMPLATES = [
  {
    code: 'BK0428',
    name: '半导体',
    baseScore: 85,
    trend: '强势热点' as const,
    topStocks: [
      { code: '688981', name: '中芯国际' },
      { code: '002371', name: '北方华创' },
      { code: '300782', name: '卓胜微' },
      { code: '603893', name: '瑞芯微' },
      { code: '688396', name: '华润微' },
      { code: '300661', name: '圣邦股份' }
    ]
  },
  {
    code: 'BK0733',
    name: '人工智能',
    baseScore: 82,
    trend: '持续热点' as const,
    topStocks: [
      { code: '002230', name: '科大讯飞' },
      { code: '300418', name: '昆仑万维' },
      { code: '000938', name: '中芯国际' },
      { code: '300308', name: '中际旭创' },
      { code: '002236', name: '大华股份' },
      { code: '300496', name: '中科创达' }
    ]
  },
  {
    code: 'BK0901',
    name: '新能源',
    baseScore: 78,
    trend: '持续热点' as const,
    topStocks: [
      { code: '300750', name: '宁德时代' },
      { code: '002594', name: '比亚迪' },
      { code: '601012', name: '隆基绿能' },
      { code: '600438', name: '通威股份' },
      { code: '300274', name: '阳光电源' },
      { code: '002812', name: '恩捷股份' }
    ]
  },
  {
    code: 'BK0484',
    name: '白酒',
    baseScore: 75,
    trend: '观察' as const,
    topStocks: [
      { code: '600519', name: '贵州茅台' },
      { code: '000858', name: '五粮液' },
      { code: '000568', name: '泸州老窖' },
      { code: '600809', name: '山西汾酒' },
      { code: '002304', name: '洋河股份' },
      { code: '603369', name: '今世缘' }
    ]
  },
  {
    code: 'BK0485',
    name: '医疗器械',
    baseScore: 72,
    trend: '观察' as const,
    topStocks: [
      { code: '300760', name: '迈瑞医疗' },
      { code: '688271', name: '联影医疗' },
      { code: '300003', name: '乐普医疗' },
      { code: '600276', name: '恒瑞医药' },
      { code: '603259', name: '药明康德' },
      { code: '300015', name: '爱尔眼科' }
    ]
  },
  {
    code: 'BK0486',
    name: '银行',
    baseScore: 70,
    trend: '观察' as const,
    topStocks: [
      { code: '600036', name: '招商银行' },
      { code: '601398', name: '工商银行' },
      { code: '601288', name: '农业银行' },
      { code: '601939', name: '建设银行' },
      { code: '601988', name: '中国银行' },
      { code: '601658', name: '邮储银行' }
    ]
  },
  {
    code: 'BK0487',
    name: '券商',
    baseScore: 68,
    trend: '观察' as const,
    topStocks: [
      { code: '600030', name: '中信证券' },
      { code: '601688', name: '华泰证券' },
      { code: '600837', name: '海通证券' },
      { code: '601211', name: '国泰君安' },
      { code: '000776', name: '广发证券' },
      { code: '600999', name: '招商证券' }
    ]
  },
  {
    code: 'BK0488',
    name: '军工',
    baseScore: 65,
    trend: '观察' as const,
    topStocks: [
      { code: '600893', name: '航发动力' },
      { code: '600760', name: '中航沈飞' },
      { code: '000768', name: '中航西飞' },
      { code: '600372', name: '中航电子' },
      { code: '600391', name: '航发科技' },
      { code: '600967', name: '内蒙一机' }
    ]
  }
];

export class RealisticSectorGenerator {
  /**
   * 生成真实感的热门板块数据
   * 基于当前时间生成不同的数据，模拟实时变化
   */
  static generateHotSectors(limit: number = 6): DynamicHotSector[] {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    // 根据时间生成不同的排序和波动
    const timeSeed = hour * 60 + minute;
    
    // 随机打乱板块顺序，但保持一定相关性
    const shuffled = [...SECTOR_TEMPLATES].sort((a, b) => {
      const randomA = Math.sin(timeSeed * 0.1 + a.baseScore) * 0.5;
      const randomB = Math.sin(timeSeed * 0.1 + b.baseScore) * 0.5;
      return (b.baseScore + randomA * 10) - (a.baseScore + randomB * 10);
    });
    
    return shuffled.slice(0, limit).map((template, index) => {
      // 生成基于时间的波动
      const volatility = Math.sin(timeSeed * 0.05 + index) * 2;
      const changePercent = Math.max(-2, Math.min(5, 2 + volatility));
      
      // 生成资金流入数据
      const mainForceNet = (3 + Math.random() * 2) * 100000000 * (1 + index * 0.2);
      
      // 生成板块得分
      const score = Math.round(template.baseScore + volatility * 2);
      
      // 生成成分股涨跌幅
      const topStocks = template.topStocks.map(stock => ({
        code: stock.code,
        name: stock.name,
        changePercent: Math.round((changePercent + (Math.random() - 0.5) * 3) * 100) / 100
      })).sort((a, b) => b.changePercent - a.changePercent);
      
      return {
        code: template.code,
        name: template.name,
        score: Math.min(100, Math.max(50, score)),
        rank: index + 1,
        changePercent: Math.round(changePercent * 100) / 100,
        dimensions: {
          momentum: Math.round(70 + Math.random() * 15),
          capital: Math.round(75 + Math.random() * 15),
          technical: Math.round(65 + Math.random() * 20),
          fundamental: Math.round(70 + Math.random() * 15)
        },
        trend: template.trend,
        topStocks: topStocks.slice(0, 6),
        metrics: {
          mainForceNet: Math.round(mainForceNet),
          turnoverRate: Math.round((2 + Math.random() * 3) * 10) / 10,
          rsi: Math.round(50 + Math.random() * 20),
          marketValue: Math.round((500 + Math.random() * 1000) * 100000000),
          peRatio: Math.round((20 + Math.random() * 30) * 10) / 10
        },
        source: 'generated',
        timestamp: now.toISOString()
      };
    });
  }
}
