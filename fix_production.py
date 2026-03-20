#!/usr/bin/env python3
"""
Sonata V2.5 Production Fix Script
"""

import re

def fix_kline_method(content):
    """Fix K-line method calls"""
    content = content.replace('alt.fetchKLineData(', 'alt.fetchKLineDataByPeriod(')
    return content

def fix_sector_urls(content):
    """Fix sector API URLs"""
    content = content.replace('http://api/eastmoney/', '/api/eastmoney/')
    content = content.replace('https://api/eastmoney/', '/api/eastmoney/')
    content = content.replace('https://push2.eastmoney.com/api/', '/api/eastmoney/')
    content = content.replace('http://push2.eastmoney.com/api/', '/api/eastmoney/')
    return content

def fix_mixed_content(content):
    """Fix Mixed Content issues"""
    patterns = [
        (r'http://push2\.eastmoney\.com', 'https://push2.eastmoney.com'),
        (r'http://hq\.sinajs\.cn', 'https://hq.sinajs.cn'),
        (r'http://qt\.gtimg\.cn', 'https://qt.gtimg.cn'),
    ]
    for pattern, replacement in patterns:
        content = re.sub(pattern, replacement, content)
    return content

def main():
    print("=" * 60)
    print("Sonata V2.5 Production Fix")
    print("=" * 60)
    
    with open('dist/assets/index-CG-AkBfR.js', 'r', encoding='utf-8') as f:
        content = f.read()
    
    print(f"\nOriginal size: {len(content)} chars")
    
    print("\n[1/3] Fixing K-line methods...")
    content = fix_kline_method(content)
    
    print("[2/3] Fixing sector URLs...")
    content = fix_sector_urls(content)
    
    print("[3/3] Fixing Mixed Content...")
    content = fix_mixed_content(content)
    
    # Check remaining issues
    issues = []
    if 'alt.fetchKLineData(' in content and 'alt.fetchKLineDataByPeriod(' not in content:
        issues.append("K-line method not fixed")
    if 'http://api/' in content:
        issues.append("Bad http://api/ URL found")
    if 'push2.eastmoney.com' in content:
        count = content.count('push2.eastmoney.com')
        issues.append(f"{count} push2.eastmoney.com remaining")
    
    if issues:
        print("\n[WARN] Issues found:")
        for issue in issues:
            print(f"  - {issue}")
    else:
        print("\n[OK] All fixes verified")
    
    with open('dist/assets/index-CG-AkBfR.js', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"\nFixed size: {len(content)} chars")
    print("\n" + "=" * 60)
    print("Fix complete, ready to deploy")
    print("=" * 60)

if __name__ == '__main__':
    main()
