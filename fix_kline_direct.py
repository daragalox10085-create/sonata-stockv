import re

# Read the compiled JS
with open('dist/assets/index-CG-AkBfR.js', 'r', encoding='utf-8') as f:
    content = f.read()

# The problematic code pattern
old_pattern = r'async fetchKLineDataByPeriod\(t,e,r\)\{const i=await alt\.getKLineDataWithFallback\(t,e,r\);if\(i\.data&&i\.data\.klines&&i\.data\.klines\.length>0\)return i\.data\.klines\.map\(s=>\{const l=s\.split\(","\);return\{date:l\[0\],open:parseFloat\(l\[1\]\),close:parseFloat\(l\[2\]\),low:parseFloat\(l\[3\]\),high:parseFloat\(l\[4\]\),volume:parseInt\(l\[5\]\)\|\|0\}\}\)\.filter\(s=>!isNaN\(s\.open\)&&s\.open>0\);console\.warn\("\[[^\]]+K 线\] [^"]+"\);const a=await this\.fetchEastmoneyKLine\(t,e,r\);if\(a&&a\.length>0\)return a;const o=await this\.fetchTencentKLine\(t,r\);return o&&o\.length>0\?o:null\}'

# New implementation - directly call fetchEastmoneyKLine
new_impl = 'async fetchKLineDataByPeriod(t,e,r){const i=await this.fetchEastmoneyKLine(t,e,r);if(i&&i.length>0)return i;console.warn("[fetchKLineDataByPeriod] 东方财富K线失败，尝试腾讯");const a=await this.fetchTencentKLine(t,r);if(a&&a.length>0)return a;console.warn("[fetchKLineDataByPeriod] 所有API均失败");return null}'

# Try to replace
match = re.search(old_pattern, content)
if match:
    print(f'Found pattern at position {match.start()}')
    content = content[:match.start()] + new_impl + content[match.end():]
    print('Replacement successful')
else:
    print('Pattern not found, trying simpler approach...')
    # Simpler approach - just replace the method call
    old_call = 'await alt.getKLineDataWithFallback(t,e,r)'
    new_call = 'await this.fetchEastmoneyKLine(t,e,r)'
    if old_call in content:
        content = content.replace(old_call, new_call, 1)
        print('Simple replacement successful')
    else:
        print('Could not find the call to replace')

# Write back
with open('dist/assets/index-CG-AkBfR.js', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'File size: {len(content)} chars')

# Verify
if 'getKLineDataWithFallback' in content:
    print('WARNING: getKLineDataWithFallback still exists in the file')
else:
    print('SUCCESS: getKLineDataWithFallback has been removed')
