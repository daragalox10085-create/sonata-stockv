with open('dist/assets/index-CG-AkBfR.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the EM class (UnifiedStockDataService) and add getKLineDataWithFallback method
# We need to add it after fetchKLineDataByPeriod method

# Method to inject
method_to_add = '''
  async getKLineDataWithFallback(t,e,r){try{return await this.fetchKLineDataByPeriod(t,e,r)}catch(i){return console.error("[getKLineDataWithFallback] failed",i),null}}'''

# Find a good place to inject - after fetchKLineDataByPeriod method
# Look for the pattern that ends fetchKLineDataByPeriod
import re

# Find fetchKLineDataByPeriod and add our method after it
pattern = r'(async\s+fetchKLineDataByPeriod\s*\([^)]*\)\s*\{[^}]+(?:\{[^}]*\}[^}]*)*\})'
match = re.search(pattern, content)

if match:
    end_pos = match.end()
    # Insert our method after fetchKLineDataByPeriod
    content = content[:end_pos] + method_to_add + content[end_pos:]
    print('Added getKLineDataWithFallback method')
else:
    print('Could not find fetchKLineDataByPeriod method')

# Also fix any remaining issues
content = content.replace('http://api/eastmoney/', '/api/eastmoney/')

with open('dist/assets/index-CG-AkBfR.js', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'File size: {len(content)} chars')
print(f'getKLineDataWithFallback calls: {content.count("getKLineDataWithFallback")}')
