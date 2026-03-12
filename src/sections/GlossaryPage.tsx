import { useState } from 'react';
import { stockTerms, StockTerm } from '../data/stockTerms';
import TermsTooltip from '../components/TermsTooltip';
import OnboardingGuide from '../components/OnboardingGuide';

/**
 * 术语表页面组件
 * 展示所有股票分析术语的完整解释
 */
export default function GlossaryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showOnboarding, setShowOnboarding] = useState(false);

  // 完成新手引导
  const handleOnboardingComplete = () => {
    localStorage.setItem('danny_road_onboarding_seen', 'true');
    setShowOnboarding(false);
  };

  // 跳过新手引导
  const handleOnboardingSkip = () => {
    localStorage.setItem('danny_road_onboarding_seen', 'true');
    setShowOnboarding(false);
  };

  // 重新显示新手引导（用于测试或用户主动触发）
  const handleShowOnboarding = () => {
    setShowOnboarding(true);
  };

  // 术语分类
  const categories = [
    { id: 'all', name: '全部', icon: '📚' },
    { id: 'trend', name: '趋势指标', icon: '📈' },
    { id: 'position', name: '位置分析', icon: '📍' },
    { id: 'momentum', name: '动量指标', icon: '⚡' },
    { id: 'volume', name: '量能分析', icon: '📊' },
    { id: 'decision', name: '交易决策', icon: '🎯' }
  ];

  // 术语分类映射
  const termCategories: Record<string, string[]> = {
    trend: ['macd', 'moving_average', 'ma_bullish', 'ma_bearish', 'golden_cross', 'death_cross'],
    position: ['fibonacci', 'support', 'resistance'],
    momentum: ['rsi'],
    volume: ['volume_ratio'],
    decision: ['stop_loss', 'take_profit', 'risk_reward', 'quant_score']
  };

  // 过滤术语
  const filteredTerms = stockTerms.filter(term => {
    // 搜索过滤
    const matchesSearch = searchQuery === '' || 
      term.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      term.definition.toLowerCase().includes(searchQuery.toLowerCase());
    
    // 分类过滤
    const matchesCategory = selectedCategory === 'all' ||
      termCategories[selectedCategory]?.includes(term.id);
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-bg-primary p-6">
      {/* 新手引导弹窗 */}
      {showOnboarding && (
        <OnboardingGuide 
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}

      <div className="max-w-5xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                📖 股票术语表
              </h1>
              <p className="text-sm text-gray-600">
                快速查找股票分析中常用的专业术语和指标解释
              </p>
            </div>
            <button
              onClick={handleShowOnboarding}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium"
            >
              🎓 新手引导
            </button>
          </div>
        </div>

        {/* 搜索框 */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 搜索术语..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 bg-white rounded-lg border border-border-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* 分类标签 */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === category.id
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-bg-surface text-gray-700 border border-border-light hover:bg-bg-primary'
              }`}
            >
              <span className="mr-1">{category.icon}</span>
              {category.name}
              {category.id !== 'all' && (
                <span className="ml-2 text-xs opacity-70">
                  ({termCategories[category.id]?.length || 0})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 术语列表 */}
        <div className="grid md:grid-cols-2 gap-4">
          {filteredTerms.map(term => (
            <GlossaryCard key={term.id} term={term} />
          ))}
        </div>

        {/* 空状态 */}
        {filteredTerms.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-gray-600">未找到匹配的术语</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              清除筛选
            </button>
          </div>
        )}

        {/* 底部提示 */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <span className="text-lg">💡</span>
            <div className="text-sm text-gray-700">
              <p className="font-semibold text-primary mb-1">使用提示</p>
              <p>在各页面中看到带下划线和 ❓ 图标的术语时，鼠标悬停或点击即可查看简短解释。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 术语卡片组件
 */
function GlossaryCard({ term }: { term: StockTerm }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-border-light p-5 hover:shadow-md transition-shadow">
      {/* 术语名称 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-gray-800">
          <TermsTooltip termId={term.id}>{term.name}</TermsTooltip>
        </h3>
        {term.relatedIds && term.relatedIds.length > 0 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-primary hover:text-primary-dark font-medium"
          >
            {isExpanded ? '收起 🔼' : '展开 🔽'}
          </button>
        )}
      </div>

      {/* 解释 */}
      <p className="text-sm text-gray-700 leading-relaxed mb-3">
        {term.definition}
      </p>

      {/* 示例 */}
      {term.example && (
        <div className="bg-blue-50 rounded p-3 mb-3">
          <div className="text-xs font-semibold text-primary mb-1">💡 示例</div>
          <p className="text-xs text-gray-700 leading-relaxed">
            {term.example}
          </p>
        </div>
      )}

      {/* 相关术语 */}
      {isExpanded && term.relatedIds && (
        <div className="border-t border-border-light pt-3">
          <div className="text-xs font-semibold text-gray-600 mb-2">🔗 相关术语</div>
          <div className="flex flex-wrap gap-1.5">
            {term.relatedIds.map((relatedId: string) => {
              // 这里简单显示名称，实际可以做成链接
              const relatedTerm = stockTerms.find(t => t.id === relatedId);
              return relatedTerm ? (
                <span
                  key={relatedId}
                  className="px-2 py-1 bg-bg-surface rounded text-xs text-primary border border-border-light"
                >
                  {relatedTerm.name}
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
