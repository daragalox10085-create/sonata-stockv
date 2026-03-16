import React from 'react';
import { ConsensusMetrics } from './types';
import { COLOR_SCHEME } from '../../utils/constants';
import { getConsensusDescription } from '../../utils/algorithmCalculations';

interface ConsensusIndicatorProps {
  consensus: ConsensusMetrics;
  timeHorizon: number;
}

export const ConsensusIndicator: React.FC<ConsensusIndicatorProps> = ({ 
  consensus,
  timeHorizon 
}) => {
  const consensusColor = COLOR_SCHEME.CONSENSUS[consensus.consensusLevel];
  const consensusDescription = getConsensusDescription(consensus.consensusLevel);
  
  return (
    <div className="bg-gradient-to-r from-slate-50 to-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-slate-900">
            多模型共识
          </div>
          <div 
            className="px-2 py-0.5 text-xs font-medium rounded-full"
            style={{ 
              backgroundColor: `${consensusColor}15`,
              color: consensusColor
            }}
          >
            {consensusDescription}
          </div>
        </div>
        
        <div className="px-3 py-1.5 bg-amber-100 border border-amber-300 rounded-lg">
          <span className="text-sm font-bold text-amber-800">预测周期: {timeHorizon}天</span>
        </div>
      </div>
      
      {/* 概率分布 */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
          <span>上涨概率</span>
          <span className="font-semibold" style={{ color: COLOR_SCHEME.BULLISH.primary }}>
            {consensus.bullishProbability}%
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${consensus.bullishProbability}%`,
              backgroundColor: COLOR_SCHEME.BULLISH.primary
            }}
          />
        </div>
        
        <div className="flex items-center justify-between text-xs text-slate-600 mt-3 mb-2">
          <span>下跌概率</span>
          <span className="font-semibold" style={{ color: COLOR_SCHEME.BEARISH.primary }}>
            {consensus.bearishProbability}%
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${consensus.bearishProbability}%`,
              backgroundColor: COLOR_SCHEME.BEARISH.primary
            }}
          />
        </div>
        
        <div className="flex items-center justify-between text-xs text-slate-600 mt-3 mb-2">
          <span>横盘概率</span>
          <span className="font-semibold" style={{ color: COLOR_SCHEME.NEUTRAL.primary }}>
            {consensus.neutralProbability}%
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${consensus.neutralProbability}%`,
              backgroundColor: COLOR_SCHEME.NEUTRAL.primary
            }}
          />
        </div>
      </div>
      
      {/* 共识详情 */}
      <div className="text-xs text-slate-600">
        <div className="flex items-center justify-between">
          <span>算法同意度</span>
          <span className="font-semibold">
            {consensus.algorithmsInAgreement}/{consensus.totalAlgorithms}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span>共识分数</span>
          <span className="font-semibold">{consensus.consensusScore}/100</span>
        </div>
      </div>
    </div>
  );
};
