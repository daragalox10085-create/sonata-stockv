

interface ErrorPageProps {
  errorType: 'format' | 'invalid' | 'network';
  errorMessage: string;
  symbol?: string;
  onBack: () => void;
}

export default function ErrorPage({ errorType, errorMessage, symbol, onBack }: ErrorPageProps) {
  // 根据错误类型选择图标和颜色
  const getErrorConfig = () => {
    switch (errorType) {
      case 'format':
        return {
          icon: (
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          ),
          title: '格式错误',
          color: 'text-orange-500',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        };
      case 'invalid':
        return {
          icon: (
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          title: '股票代码无效',
          color: 'text-red-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case 'network':
        return {
          icon: (
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          ),
          title: '网络错误',
          color: 'text-blue-500',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      default:
        return {
          icon: (
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
          title: '错误',
          color: 'text-gray-500',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  const config = getErrorConfig();

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Error Card */}
        <div className={`bg-white rounded-2xl shadow-lg border-2 ${config.borderColor} overflow-hidden`}>
          {/* Header with Icon */}
          <div className={`${config.bgColor} px-6 py-8 text-center`}>
            <div className={`${config.color} mx-auto`}>
              {config.icon}
            </div>
            <h2 className={`mt-4 text-2xl font-bold ${config.color}`}>
              {config.title}
            </h2>
          </div>

          {/* Error Message */}
          <div className="px-6 py-6">
            <div className="text-center mb-6">
              {symbol && (
                <div className="mb-3">
                  <span className="text-sm text-gray-500">股票代码</span>
                  <div className="mt-1 text-3xl font-bold text-gray-900 tracking-wider">
                    {symbol}
                  </div>
                </div>
              )}
              <p className="text-base text-gray-700 leading-relaxed">
                {errorMessage}
              </p>
            </div>

            {/* Common Issues */}
            {errorType === 'format' && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">💡 正确格式示例：</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 沪市主板：600760（中航光电）</li>
                  <li>• 深市主板：000858（五粮液）</li>
                  <li>• 创业板：300750（宁德时代）</li>
                  <li>• 科创板：688001（华兴源创）</li>
                  <li>• ETF 基金：513310（中韩半导体 ETF）</li>
                </ul>
              </div>
            )}

            {errorType === 'invalid' && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">🔍 可能的原因：</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 该股票代码不存在</li>
                  <li>• 非 A 股市场代码（如港股、美股）</li>
                  <li>• 代码已退市</li>
                  <li>• 输入了错误的代码</li>
                </ul>
              </div>
            )}

            {/* Back Button */}
            <button
              onClick={onBack}
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>返回重新输入</span>
            </button>
          </div>
        </div>

        {/* Help Tip */}
        <p className="mt-6 text-center text-sm text-gray-500">
          💡 提示：A 股代码为 6 位数字，沪市以 60/68 开头，深市以 00/30 开头
        </p>
      </div>
    </div>
  );
}
