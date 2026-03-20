import re

with open('dist/assets/index-CG-AkBfR.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix: Replace alt.getKLineDataWithFallback call with direct implementation
# The pattern is: const i=await alt.getKLineDataWithFallback(t,e,r);if(i.data&&i.data.
# We need to replace it with direct fetchKLineDataByPeriod call

# Find and replace the problematic pattern
old_pattern = r'const i=await alt\.getKLineDataWithFallback\(t,e,r\);if\(i\.data&&i\.data'
new_code = 'const i=await this.fetchKLineDataByPeriod(t,e,r);if(i&&i.length'

content = re.sub(old_pattern, new_code, content)

# Also fix other occurrences
content = content.replace('alt.getKLineDataWithFallback', 'this.fetchKLineDataByPeriod')

print('Fixed getKLineDataWithFallback calls')

with open('dist/assets/index-CG-AkBfR.js', 'w', encoding='utf-8') as f:
    f.write(content)
