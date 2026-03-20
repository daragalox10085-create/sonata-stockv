import re

with open('dist/assets/index-CG-AkBfR.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Check for HTTP push2.eastmoney.com URLs
matches = re.findall(r'http://push2\.eastmoney\.com/api/[^\s"\`\?]+', content)
print(f'Found {len(matches)} HTTP push2.eastmoney.com URLs:')
for m in matches[:10]:
    print('  ', m)

# Check for /api/eastmoney/sector
sector_matches = content.count('/api/eastmoney/sector')
print(f'\nFound {sector_matches} occurrences of /api/eastmoney/sector')

# Check for qt/clist/get
clist_matches = content.count('qt/clist/get')
print(f'Found {clist_matches} occurrences of qt/clist/get')
