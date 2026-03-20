import re

with open('index-CG-AkBfR.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix: Replace /api/eastmoney/qt/clist/get with /api/eastmoney/sector
old = '/api/eastmoney/qt/clist/get'
new = '/api/eastmoney/sector'

count = content.count(old)
print(f'Found {count} occurrences')

content = content.replace(old, new)

with open('index-CG-AkBfR.js', 'w', encoding='utf-8') as f:
    f.write(content)
print(f'Replaced with "{new}"')
print('File saved')
