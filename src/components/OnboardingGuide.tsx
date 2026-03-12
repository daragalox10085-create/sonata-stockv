import { useState } from 'react';

interface OnboardingGuideProps {
  onComplete: () => void;
  onSkip: () => void;
}

const steps = [
  {
    title: '欢迎使用 Danny Road',
    content: '这是一个专业的股票分析工具，基于量化模型为您提供买卖点决策、技术面分析和走势预测。',
    icon: '👋'
  },
  {
    title: '输入股票代码',
    content: '在搜索框输入 6 位 A 股代码（如 600519）或股票名称（如"茅台"），系统会自动识别并加载数据。',
    icon: '🔍'
  },
  {
    title: '查看分析结果',
    content: '系统会显示操作建议、建仓位置、趋势判断、关键价位和风险提示，帮助您做出投资决策。',
    icon: '📊'
  },
  {
    title: '理解量化评分',
    content: '量化评分基于趋势、位置、动量、量能、情绪五维度综合计算（0-100 分），>60 分建议买入，40-60 分观望，<40 分卖出。',
    icon: '💡'
  },
  {
    title: '使用术语表',
    content: '遇到不懂的专业术语？点击术语表图标或按 T 键，随时查看术语解释和示例。',
    icon: '📖'
  },
  {
    title: '开始分析',
    content: '现在您可以开始使用 Danny Road 进行股票分析了！祝您投资顺利！',
    icon: '🚀'
  }
];

export default function OnboardingGuide({ onComplete, onSkip }: OnboardingGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        {/* 进度条 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{step.icon}</span>
            <span className="text-sm text-gray-500">步骤 {currentStep + 1}/{steps.length}</span>
          </div>
          <button
            onClick={onSkip}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            跳过
          </button>
        </div>

        {/* 内容 */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-3">{step.title}</h3>
          <p className="text-gray-600 leading-relaxed">{step.content}</p>
        </div>

        {/* 导航按钮 */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              currentStep === 0
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            ← 上一步
          </button>

          <button
            onClick={handleNext}
            className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors"
          >
            {currentStep === steps.length - 1 ? '开始使用' : '下一步'}
          </button>
        </div>

        {/* 步骤指示器 */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentStep ? 'bg-primary' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
