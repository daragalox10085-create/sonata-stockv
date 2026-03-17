"""
修复所有Vite代理路径为直接API地址
"""
import re
import os

# 文件列表和对应的修复规则
files_to_fix = [
    {
        'path': 'src/services/UnifiedStockDataService.ts',
        'replacements': [
            (r"const url = `/api/tencent/quote\?q=\$\{market\}\$\{symbol\}`", 
             "const url = `https://qt.gtimg.cn/q=${market}${symbol}`"),
            (r"const url = `/api/eastmoney/quote\?secid=\$\{secid\}&fields=",
             "const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields="),
            (r"const url = `/api/sina\?list=\$\{market\}\$\{symbol\}`",
             "const url = `https://hq.sinajs.cn/list=${market}${symbol}`"),
            (r"const url = `/api/eastmoney/kline\?secid=\$\{secid\}&fields1=",
             "const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&fields1="),
            (r"const url = `/api/tencent/kline\?code=\$\{market\}\$\{symbol\}&start=",
             "const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${market}${symbol},day,${startDate},${endDate},${days},qfq`"),
        ]
    },
    {
        'path': 'src/services/klineApi.ts',
        'replacements': [
            (r"return `/api/sina/quotes_service/api/json_v2.php/CN_MarketData.getKLineData\?symbol=\$\{market\}\$\{symbol\}&scale=",
             "return `https://hq.sinajs.cn/list=${market}${symbol}`"),
        ]
    },
    {
        'path': 'src/services/marketAnalysisService.ts',
        'replacements': [
            (r"`/api/tencent/quote\?code=\$\{prefix\}\$\{code\}`",
             "`https://qt.gtimg.cn/q=${prefix}${code}`"),
            (r"`/api/eastmoney/quote\?secid=\$\{prefix === 'sh' \? '1\\.' : '0\\.'\}\$\{code\}`",
             "`https://push2.eastmoney.com/api/qt/stock/get?secid=${prefix === 'sh' ? '1.' : '0.'}${code}&fields=f43,f44,f45,f46,f47,f48,f49,f57,f58,f60,f169`"),
            (r"`/api/sina/list=\$\{prefix\}\$\{code\}`",
             "`https://hq.sinajs.cn/list=${prefix}${code}`"),
        ]
    },
    {
        'path': 'src/services/searchApi.ts',
        'replacements': [
            (r"`/api/eastmoney/api/suggest\?input=",
             "`https://searchapi.eastmoney.com/api/suggest/get?input="),
        ]
    }
]

def fix_file(file_info):
    """修复单个文件"""
    filepath = file_info['path']
    full_path = os.path.join('C:/Users/CCL/.openclaw/workspace/sonata-1.3', filepath)
    
    if not os.path.exists(full_path):
        print(f"❌ 文件不存在: {filepath}")
        return False
    
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    for pattern, replacement in file_info['replacements']:
        content = re.sub(pattern, replacement, content)
    
    if content != original_content:
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ 已修复: {filepath}")
        return True
    else:
        print(f"⏭️ 无需修改: {filepath}")
        return False

def main():
    print("🔧 修复API路径...\n")
    fixed_count = 0
    
    for file_info in files_to_fix:
        if fix_file(file_info):
            fixed_count += 1
    
    print(f"\n✨ 完成！修复了 {fixed_count} 个文件")

if __name__ == "__main__":
    main()
