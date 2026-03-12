import React, { useState, useRef, useEffect } from 'react';
import { stockTerms } from '../data/stockTerms';

interface TermsTooltipProps {
  children: React.ReactNode;
  termId: string;
}

/**
 * 术语 Hover 提示组件
 * 用法：<TermsTooltip termId="macd"><span>MACD</span></TermsTooltip>
 */
export default function TermsTooltip({ children, termId }: TermsTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const term = stockTerms.find(t => t.id === termId);

  if (!term) {
    // 如果术语不存在，直接渲染子元素
    return <>{children}</>;
  }

  const showTooltip = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX + rect.width / 2
      });
      setIsVisible(true);
    }
  };

  const hideTooltip = () => {
    setIsVisible(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        hideTooltip();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible]);

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-block border-b border-dashed border-blue-400 cursor-help text-blue-600 hover:text-blue-800"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
      >
        {children}
      </span>

      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-50 max-w-xs p-3 bg-white border border-blue-200 rounded-lg shadow-lg"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="text-sm font-semibold text-gray-800 mb-1">{term.name}</div>
          <div className="text-xs text-gray-600 mb-2">{term.definition}</div>
          {term.example && (
            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
              💡 示例：{term.example}
            </div>
          )}
        </div>
      )}
    </>
  );
}
