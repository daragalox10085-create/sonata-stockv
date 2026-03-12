/**
 * 股票术语数据
 */

export interface StockTerm {
  id: string;
  name: string;
  definition: string;
  example: string;
  relatedIds: string[];
}

export interface TermDefinition {
  id: string;
  name: string;
  explanation: string;
  example: string;
  related: string[];
}

export const stockTerms: StockTerm[] = [
  {
    id: 'macd',
    name: 'MACD',
    definition: '平滑异同移动平均线，由快线（DIF）、慢线（DEA）和柱状图组成，用于判断趋势强度和转折。',
    example: '当 DIF 从下向上穿过 DEA 时形成"金叉"，通常是买入信号；反之形成"死叉"，通常是卖出信号。',
    relatedIds: ['dif', 'dea', 'golden-cross', 'death-cross']
  },
  {
    id: 'dif',
    name: 'DIF（快线）',
    definition: 'MACD 的快线，是 12 日 EMA 与 26 日 EMA 的差值。',
    example: 'DIF = EMA(12) - EMA(26)',
    relatedIds: ['macd', 'ema', 'dea']
  },
  {
    id: 'dea',
    name: 'DEA（慢线）',
    definition: 'MACD 的慢线，是 DIF 的 9 日 EMA。',
    example: 'DEA = EMA(DIF, 9)',
    relatedIds: ['macd', 'ema', 'dif']
  },
  {
    id: 'golden-cross',
    name: '金叉',
    definition: '短期均线从下向上穿过长期均线，或 MACD 快线从下向上穿过慢线，通常预示价格上涨。',
    example: '5 日均线上穿 20 日均线，或 DIF 上穿 DEA。',
    relatedIds: ['death-cross', 'moving-average', 'macd']
  },
  {
    id: 'death-cross',
    name: '死叉',
    definition: '短期均线从上向下穿过长期均线，或 MACD 快线从上向下穿过慢线，通常预示价格下跌。',
    example: '5 日均线下穿 20 日均线，或 DIF 下穿 DEA。',
    relatedIds: ['golden-cross', 'moving-average', 'macd']
  },
  {
    id: 'rsi',
    name: 'RSI',
    definition: '相对强弱指数，范围 0-100，用于衡量价格变动的速度和幅度，判断超买超卖状态。',
    example: 'RSI>70 为超买区，可能回调；RSI<30 为超卖区，可能反弹；RSI=50 为中性。',
    relatedIds: ['overbought', 'oversold']
  },
  {
    id: 'overbought',
    name: '超买',
    definition: '价格短期内上涨过快，RSI>70，可能面临回调压力。',
    example: 'RSI 达到 75，股价连续上涨 5 天，警惕回调。',
    relatedIds: ['rsi', 'oversold']
  },
  {
    id: 'oversold',
    name: '超卖',
    definition: '价格短期内下跌过快，RSI<30，可能面临反弹机会。',
    example: 'RSI 达到 25，股价连续下跌 5 天，关注反弹。',
    relatedIds: ['rsi', 'overbought']
  },
  {
    id: 'moving-average',
    name: '均线',
    definition: '移动平均线，将一定时期内的收盘价平均后连成的线，用于平滑价格波动、识别趋势。',
    example: '5 日均线=最近 5 个交易日收盘价之和÷5，反映短期趋势。',
    relatedIds: ['ema', 'golden-cross', 'death-cross']
  },
  {
    id: 'ema',
    name: 'EMA',
    definition: '指数移动平均线，对近期价格赋予更高权重，比普通均线更敏感。',
    example: 'EMA_today = (Price_today × α) + (EMA_yesterday × (1-α))，其中 α = 2/(N+1)',
    relatedIds: ['moving-average', 'macd']
  },
  {
    id: 'support',
    name: '支撑位',
    definition: '价格下跌时可能遇到支撑、难以跌破的价位，通常是前期低点、成交密集区或重要均线位置。',
    example: '股价多次在 15 元附近止跌反弹，15 元就是强支撑位。',
    relatedIds: ['resistance', 'fibonacci']
  },
  {
    id: 'resistance',
    name: '阻力位',
    definition: '价格上涨时可能遇到阻力、难以突破的价位，通常是前期高点、成交密集区或重要均线位置。',
    example: '股价多次在 25 元附近遇阻回落，25 元就是强阻力位。',
    relatedIds: ['support', 'fibonacci']
  },
  {
    id: 'fibonacci',
    name: '斐波那契回撤',
    definition: '基于黄金分割比例（0.236、0.382、0.5、0.618、0.786）的技术分析工具，用于预测价格可能的支撑位和阻力位。',
    example: '股价从 10 元涨到 20 元后回调，0.382 回撤位=20-(20-10)×0.382=16.18 元，可能是支撑位。',
    relatedIds: ['support', 'resistance']
  },
  {
    id: 'volume',
    name: '成交量',
    definition: '一定时期内的成交数量，反映市场活跃度和资金流向。',
    example: '成交量放大通常伴随价格突破，缩量回调通常是健康的。',
    relatedIds: ['volume-ratio', 'turnover-rate']
  },
  {
    id: 'volume-ratio',
    name: '量比',
    definition: '当日成交量与过去 5 日平均成交量的比值，用于衡量成交活跃度。量比>1 表示放量，<1 表示缩量。',
    example: '量比=2.5 表示当日成交量是 5 日均量的 2.5 倍，属于明显放量。',
    relatedIds: ['volume', 'turnover-rate']
  },
  {
    id: 'turnover-rate',
    name: '换手率',
    definition: '成交量与流通股本的比值，反映股票流通性和市场关注度。',
    example: '换手率>10% 表示交易活跃，<1% 表示交易清淡。',
    relatedIds: ['volume', 'volume-ratio']
  }
];
