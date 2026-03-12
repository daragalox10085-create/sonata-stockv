/**
 * 样式常量和函数
 */

// 类型定义
export type DecisionType = 'buy' | 'hold' | 'sell';
export type ImportanceLevel = 'high' | 'medium' | 'low';

export interface DecisionStyle {
  label: string;
  color: string;
  isPositive: boolean;
}

export interface ImportanceStyle {
  bgClass: string;
  textClass: string;
  label: string;
}

export interface DimensionConfig {
  id: string;
  name: string;
  icon: string;
  weight: number;
}

export interface PriceLevelType {
  type: string;
  label: string;
}

export interface PriceLevelStyle {
  color: string;
  lineStyle: string;
}

// 维度配置
export const DIMENSIONS: DimensionConfig[] = [
  { id: 'trend', name: '趋势', icon: '📈', weight: 0.25 },
  { id: 'position', name: '位置', icon: '📍', weight: 0.20 },
  { id: 'momentum', name: '动量', icon: '⚡', weight: 0.20 },
  { id: 'volume', name: '量能', icon: '📊', weight: 0.15 },
  { id: 'sentiment', name: '情绪', icon: '😊', weight: 0.20 }
];

// 获取决策标签样式
export function getDecisionStyle(quantScore: number): DecisionStyle {
  if (quantScore > 60) {
    return {
      label: '🟢 买入',
      color: 'text-green-700',
      isPositive: true
    };
  } else if (quantScore >= 40) {
    return {
      label: '🟡 观望',
      color: 'text-yellow-700',
      isPositive: false
    };
  } else {
    return {
      label: '🔴 卖出',
      color: 'text-red-700',
      isPositive: false
    };
  }
}

// 获取重要程度样式
export function getImportanceStyle(level: ImportanceLevel): ImportanceStyle {
  switch (level) {
    case 'high':
      return {
        bgClass: 'bg-red-100',
        textClass: 'text-red-700',
        label: '🔴 重要'
      };
    case 'medium':
      return {
        bgClass: 'bg-yellow-100',
        textClass: 'text-yellow-700',
        label: '🟡 中等'
      };
    default:
      return {
        bgClass: 'bg-blue-100',
        textClass: 'text-blue-700',
        label: '🔵 一般'
      };
  }
}

// 获取价格级别样式
export function getPriceLevelStyle(type: string): PriceLevelStyle {
  switch (type) {
    case 'current':
      return { color: '#3b82f6', lineStyle: 'solid' };
    case 'stop-loss':
      return { color: '#ef4444', lineStyle: 'dashed' };
    case 'support':
      return { color: '#6b7280', lineStyle: 'dotted' };
    case 'resistance':
      return { color: '#6b7280', lineStyle: 'dotted' };
    case 'take-profit-1':
      return { color: '#22c55e', lineStyle: 'dashed' };
    case 'take-profit-2':
      return { color: '#16a34a', lineStyle: 'dashed' };
    default:
      return { color: '#6b7280', lineStyle: 'solid' };
  }
}

// 样式类常量
export const GLASS_CARD_CLASS = 'glass-card rounded-2xl p-6 mb-6 animate-slide-in';
export const BASE_CARD_CLASS = 'bg-white rounded border border-gray-200';
export const HIGHLIGHT_CARD_CLASS = 'bg-primary/5 rounded-xl p-4 mb-4';
export const PRIMARY_BUTTON_CLASS = 'px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded font-medium transition-colors';
export const SECONDARY_BUTTON_CLASS = 'px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-medium transition-colors';
export const SUCCESS_BUTTON_CLASS = 'px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded font-medium transition-colors';
export const DANGER_BUTTON_CLASS = 'px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded font-medium transition-colors';
export const GRID_6_CLASS = 'grid grid-cols-3 sm:grid-cols-6 gap-3';
export const GRID_3_CLASS = 'grid grid-cols-3 gap-3';
export const GRID_2_RESPONSIVE_CLASS = 'grid grid-cols-2 md:grid-cols-4 gap-3';
export const TITLE_CLASS = 'text-2xl font-bold text-gray-800';
export const SUBTITLE_CLASS = 'text-lg font-semibold text-gray-700';
export const PRIMARY_VALUE_CLASS = 'text-xl font-bold text-gray-800';
export const SECONDARY_VALUE_CLASS = 'text-sm text-gray-600';
export const MARGIN_BOTTOM_CLASS = 'mb-4';
export const MARGIN_BOTTOM_LARGE_CLASS = 'mb-6';
export const PADDING_CLASS = 'p-4';
export const PADDING_LARGE_CLASS = 'p-6';
