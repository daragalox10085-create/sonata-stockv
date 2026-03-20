import re

with open('dist/assets/index-CG-AkBfR.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the method and replace it completely
# Pattern: async fetchKLineDataByPeriod(t,e,r){...}
pattern = r'async fetchKLineDataByPeriod\(t,e,r\)\{[^}]+\}(?=async fetchEastmoneyKLine)'

new_impl = 'async fetchKLineDataByPeriod(t,e,r){const i=await this.fetchEastmoneyKLine(t,e,r);if(i&&i.length>0)return i;console.warn("[fetchKLineDataByPeriod] 东方财富 K 线失败，尝试腾讯");const a=await this.fetchTencentKLine(t,r);if(a&&a.length>0)return a;console.warn("[fetchKLineDataByPeriod] 所有 API 均失败");return null}'

match = re.search(pattern, content)
if match:
    print(f'Found at {match.start()}')
    print('Old code:')
    print(match.group(0)[:200])
    content = content[:match.start()] + new_impl + content[match.end():]
    print('Replacement successful')
else:
    print('Pattern not found')

with open('dist/assets/index-CG-AkBfR.js', 'w', encoding='utf-8') as f:
    f.write(content)

# Verify
if 'getKLineDataWithFallback' in content:
    print('WARNING: getKLineDataWithFallback still exists')
else:
    print('SUCCESS: getKLineDataWithFallback removed')
