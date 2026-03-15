import React from 'react';
import { AlgorithmPrediction } from './types';
import { getPredictionColor, formatConfidence } from '../../utils/algorithmCalculations';

interface AlgorithmCardProps {
  prediction: AlgorithmPrediction;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export const AlgorithmCard: React.FC<AlgorithmCardProps> = ({ 
  prediction, 
  isExpanded = false,
  onToggle 
}) => {
  const { 
    algorithmName, 
    algorithmDescription,
    prediction: direction,
    confidence,
    weight,
    reasoning,
    historicalAccuracy
  } = prediction;

  const directionText = {
    bullish: '看涨',
    bearish: '看跌',
    neutral: '中性'
  }[direction];

  const directionColor = getPredictionColor(direction);
  
  return (
    <div 
      className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:border-slate-300 transition-colors cursor-pointer"
      onClick={onToggle}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="text-sm font-semibold text-slate-900">
                {algorithmName}
              </div>
              <div 
                className="px-2 py-0.5 text-xs font-medium rounded-full"
                style={{ 
                  backgroundColor: `${directionColor}15`,
                  color: directionColor
                }}
              >
                {directionText}
              </div>
            </div>
            
            <p className="text-xs text-slate-500 mb-3">
              {algorithmDescription}
            </p>
            
            <div className="flex items-center justify-between text-xs">
              <div className="space-y-1">
                <div className="text-slate-600">
                  置信度: <span className="font-semibold">{formatConfidence(confidence)}</span>
                </div>
                <div className="text-slate-600">
                  权重: <span className="font-semibold">{(weight * 100).toFixed(0)}%</span>
                </div>
              </div>
              
              <div className="text-right space-y-1">
                <div className="text-slate-600">
                  近7天准确率: <span className="font-semibold">{historicalAccuracy.last7Days}%</span>
                </div>
                <div className="text-slate-600">
                  对该股历史: <span className="font-semibold">{historicalAccuracy.stockSpecific}%</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="ml-4">
            <svg 
              className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="text-xs font-medium text-slate-700 mb-2">判断依据:</div>
            <ul className="space-y-1">
              {reasoning.map((reason, index) => (
                <li key={index} className="text-xs text-slate-600 flex items-start">
                  <span className="text-slate-400 mr-2">•</span>
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
