import re

with open('index-CG-AkBfR.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix: Replace qt/clist/get with sector
old_pattern = '/api/eastmoney/qt/clist/get'
new_pattern = '/api/eastmoney/sector'

count = content.count(old_pattern)
print(f'Found {count} occurrences of "{old_pattern}"')

content = content.replace(old_pattern, new_pattern)

print(f'Replaced with "{new_pattern}"')

with open('index-CG-AkBfR.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('File saved')
