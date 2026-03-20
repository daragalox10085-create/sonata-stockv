import re

with open('dist/assets/index-CG-AkBfR.js', 'r', encoding='utf-8') as f:
    content = f.read()

# The issue: alt.getKLineDataWithFallback doesn't exist
# We need to replace it with a proper implementation
# Looking at the pattern: alt.getKLineDataWithFallback(t,e,r)
# This should call fetchKLineDataByPeriod but we need to avoid recursion

# Find the actual implementation of fetchKLineDataByPeriod and use it directly
# The pattern in compiled JS is something like:
# async fetchKLineDataByPeriod(t,e,r){...}

# Let's find and replace the problematic call
# Pattern: const i=await alt.getKLineDataWithFallback(t,e,r);if(i.data&&i.data
# The issue is that getKLineDataWithFallback calls fetchKLineDataByPeriod
# But in the minified code, fetchKLineDataByPeriod might be calling getKLineDataWithFallback

# Better approach: replace getKLineDataWithFallback with a direct implementation
old_call = 'alt.getKLineDataWithFallback(t,e,r)'
# Replace with direct call to the actual implementation
# We need to find what the actual method name is in the minified code

# Let's check what methods exist on alt (unifiedStockDataService)
import re
methods = re.findall(r'alt\.(\w+)', content)
unique_methods = set(methods)
print('Methods on alt:', list(unique_methods)[:20])

# Find fetchKLineDataByPeriod pattern
if 'fetchKLineDataByPeriod' in unique_methods:
    print('Found fetchKLineDataByPeriod')
    # Replace getKLineDataWithFallback with fetchKLineDataByPeriod
    content = content.replace('alt.getKLineDataWithFallback', 'alt.fetchKLineDataByPeriod')
else:
    print('fetchKLineDataByPeriod not found directly')
    # The method might be renamed, let's look for it
    for method in unique_methods:
        if 'KLine' in method or 'kline' in method.lower():
            print(f'  Found KLine method: {method}')

with open('dist/assets/index-CG-AkBfR.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
