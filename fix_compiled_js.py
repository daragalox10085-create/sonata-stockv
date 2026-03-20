import re

# Read the compiled JS file
with open('dist/assets/index-CG-AkBfR.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Replace EASTMONEY_BASE config value
content = content.replace('EASTMONEY_BASE","https://push2.eastmoney.com/api"', 'EASTMONEY_BASE","/api/eastmoney"')

# Fix 2: Replace qt/clist/get with sector
content = content.replace('/qt/clist/get', '/sector')

# Fix 3: Replace http://push2.eastmoney.com with /api/eastmoney
content = content.replace('http://push2.eastmoney.com', '/api/eastmoney')

# Fix 4: Replace https://push2.eastmoney.com with /api/eastmoney
content = content.replace('https://push2.eastmoney.com', '/api/eastmoney')

# Fix 5: Replace https://push2his.eastmoney.com with /api/eastmoney
content = content.replace('https://push2his.eastmoney.com', '/api/eastmoney')

# Count remaining occurrences
print('push2.eastmoney.com:', content.count('push2.eastmoney.com'))
print('qt/clist/get:', content.count('qt/clist/get'))

# Save
with open('dist/assets/index-CG-AkBfR.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('File saved')