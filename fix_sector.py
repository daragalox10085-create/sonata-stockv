import re

with open('index-CG-AkBfR.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Replace http://push2.eastmoney.com with /api/eastmoney
content = re.sub(r'http://push2\.eastmoney\.com/api', '/api/eastmoney', content)
content = re.sub(r'https://push2\.eastmoney\.com/api', '/api/eastmoney', content)
content = re.sub(r'https://push2his\.eastmoney\.com/api', '/api/eastmoney', content)

# Fix 2: Replace qt/clist/get with sector
content = re.sub(r'/api/eastmoney/qt/clist/get', '/api/eastmoney/sector', content)

print('Fixed: Mixed Content errors for sector data')

with open('index-CG-AkBfR.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('File saved')
