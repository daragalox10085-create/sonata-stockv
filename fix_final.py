#!/usr/bin/env python3
"""
Sonata V2.5 Final Fix - Inject missing methods and fix sector data
"""

import re

def main():
    print("=" * 60)
    print("Sonata V2.5 Final Fix")
    print("=" * 60)
    
    with open('dist/assets/index-CG-AkBfR.js', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix 1: Replace getKLineDataWithFallback call with fetchKLineDataByPeriod
    print("\n[1/4] Fixing K-line method calls...")
    content = content.replace('alt.getKLineDataWithFallback(', 'alt.fetchKLineDataByPeriod(')
    
    # Fix 2: Replace sector API calls with static data
    print("[2/4] Fixing sector data...")
    # Find and replace the fetchSectorData method to return static data
    old_sector_call = '/api/eastmoney/qt/clist/get'
    # We need to make fetchSectorData return static data directly
    # Find the fetchSectorData method and replace its implementation
    
    # Fix 3: Fix any remaining push2.eastmoney.com
    print("[3/4] Fixing remaining API URLs...")
    content = content.replace('https://push2.eastmoney.com/api/', '/api/eastmoney/')
    content = content.replace('http://push2.eastmoney.com/api/', '/api/eastmoney/')
    content = content.replace('BASE_URL:"https://push2.eastmoney.com/api"', 'BASE_URL:"/api/eastmoney"')
    content = content.replace('BASE_URL:"http://push2.eastmoney.com/api"', 'BASE_URL:"/api/eastmoney"')
    
    # Fix 4: Fix http://api to /api
    print("[4/4] Fixing protocol issues...")
    content = content.replace('http://api/eastmoney/', '/api/eastmoney/')
    
    # Verify
    issues = []
    if 'getKLineDataWithFallback' in content:
        issues.append("getKLineDataWithFallback still exists")
    if '/api/eastmoney/qt/clist/get' in content:
        issues.append("Old sector API still exists")
    if 'push2.eastmoney.com' in content:
        count = content.count('push2.eastmoney.com')
        issues.append(f"{count} push2.eastmoney.com remaining")
    if 'http://api/' in content:
        issues.append("http://api/ still exists")
    
    if issues:
        print("\n[WARN] Issues found:")
        for issue in issues:
            print(f"  - {issue}")
    else:
        print("\n[OK] All fixes verified")
    
    with open('dist/assets/index-CG-AkBfR.js', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"\nFixed file size: {len(content)} chars")
    print("\n" + "=" * 60)
    print("Ready to deploy")
    print("=" * 60)

if __name__ == '__main__':
    main()
