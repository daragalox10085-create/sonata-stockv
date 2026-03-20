import re

# Read the compiled JS
with open('dist/assets/index-CG-AkBfR.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and fix fetchKLineDataByPeriod to not call getKLineDataWithFallback
# The pattern is: async fetchKLineDataByPeriod(t,e,r){const i=await alt.getKLineDataWithFallback(t,e,r);...
# We need to replace it with the actual implementation

# First, let's find the pattern
pattern = r'async fetchKLineDataByPeriod\(t,e,r\)\{const i=await alt\.getKLineDataWithFallback\(t,e,r\);if\(i\.data&&i\.data\.klines&&i\.data\.klines\.length>0\)return i\.data\.klines\.map\(s=>\{const l=s\.split\(","\);return\{date:l\[0\],open:parseFloat\(l\[1\]\),close:parseFloat\(l\[2\]\),low:parseFloat\(l\[3\]\),high:parseFloat\(l\[4\]\),volume:parseInt\(l\[5\]\)\|\|0\}\}\)\.filter\(s=>!isNaN\(s\.open\)&&s\.open>0\);console\.warn\("\[[^\]]+K 线\] [^"]+"\);const a=await this\.fetchEastmoneyKLine\(t,e,r\);if\(a&&a\.length>0\)return a;const o=await this\.fetchTencentKLine\(t,r\);return o&&o\.length>0\?o:null\}'

# Simpler approach: just replace the getKLineDataWithFallback call with direct implementation
old_code = 'async fetchKLineDataByPeriod(t,e,r){const i=await alt.getKLineDataWithFallback(t,e,r);'

new_code = '''async fetchKLineDataByPeriod(t,e,r){try{const i=await this.fetchEastmoneyKLine(t,e,r);if(i&&i.length>0)return i;console.warn("[fetchKLineDataByPeriod] 东方财富K线失败，尝试腾讯");const a=await this.fetchTencentKLine(t,r);if(a&&a.length>0)return a;console.warn("[fetchKLineDataByPeriod] 所有API均失败");return null}catch(i){return console.error("[fetchKLineDataByPeriod] 获取K线数据异常",i),null}}'''

# Find the full method and replace it
# Look for the pattern
full_pattern = r'async fetchKLineDataByPeriod\(t,e,r\)\{[^}]+\}'
match = re.search(full_pattern, content)

if match:
    print(f'Found fetchKLineDataByPeriod at position {match.start()}')
    # Replace with new implementation
    content = content[:match.start()] + new_code + content[match.end():]
    print('Replaced fetchKLineDataByPeriod implementation')
else:
    print('Could not find fetchKLineDataByPeriod method')

# Also fix the http://push2.eastmoney.com issue in the sector service
content = content.replace('http://push2.eastmoney.com', 'https://push2.eastmoney.com')

# Write back
with open('dist/assets/index-CG-AkBfR.js', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'File size: {len(content)} chars')
