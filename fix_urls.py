import re

with open('dist/assets/index-CG-AkBfR.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Only replace URLs, not code structure
# Replace https://push2.eastmoney.com/api with /api/eastmoney
content = content.replace('https://push2.eastmoney.com/api', '/api/eastmoney')
content = content.replace('https://push2his.eastmoney.com/api', '/api/eastmoney')

# Fix double /api
content = content.replace('/api/eastmoney/api/', '/api/eastmoney/')
content = content.replace('/api/eastmoney/api', '/api/eastmoney')

# Replace qt/clist/get with sector (for the sector endpoint)
content = content.replace('/qt/clist/get', '/sector')

# Check
print('push2.eastmoney:', content.count('push2.eastmoney'))
print('qt/clist/get:', content.count('qt/clist/get'))
print('/api/eastmoney/api:', content.count('/api/eastmoney/api'))

with open('dist/assets/index-CG-AkBfR.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
