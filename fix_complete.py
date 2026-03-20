#!/usr/bin/env python3
"""
Sonata V2.5 Complete Fix
"""

with open('dist/assets/index-CG-AkBfR.js', 'r', encoding='utf-8') as f:
    content = f.read()

print("Fixing K-line methods...")
content = content.replace('alt.getKLineDataWithFallback(', 'alt.fetchKLineDataByPeriod(')

print("Fixing sector API calls...")
# Replace qt/clist/get with /sector (which returns static data)
content = content.replace('/api/eastmoney/qt/clist/get', '/api/eastmoney/sector')

print("Fixing BASE_URL configs...")
content = content.replace('BASE_URL":"https://push2.eastmoney.com/api"', 'BASE_URL":"/api/eastmoney"')
content = content.replace('EASTMONEY_BASE","https://push2.eastmoney.com/api"', 'EASTMONEY_BASE","/api/eastmoney"')

print("Fixing protocol issues...")
content = content.replace('http://api/eastmoney/', '/api/eastmoney/')

# Verify
print("\nVerifying...")
print(f"  getKLineDataWithFallback: {content.count('getKLineDataWithFallback')}")
print(f"  qt/clist/get: {content.count('qt/clist/get')}")
print(f"  push2.eastmoney.com: {content.count('push2.eastmoney.com')}")
print(f"  http://api/: {content.count('http://api/')}")

with open('dist/assets/index-CG-AkBfR.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("\nDone!")
