import requests
import json

# 东方财富热门板块 API
url = 'https://push2.eastmoney.com/api/qt/clist/get'
params = {
    'pn': 1,
    'pz': 6,
    'po': 1,
    'np': 1,
    'fltt': 2,
    'invt': 2,
    'fid': 'f62',
    'fs': 'm:90+t:2',
    'fields': 'f12,f14,f3,f62,f8,f20,f184'
}

try:
    resp = requests.get(url, params=params, timeout=10)
    data = resp.json()
    sectors = data.get('data', {}).get('diff', [])
    
    print('六大热门板块:')
    result = []
    for i, s in enumerate(sectors[:6], 1):
        code = s['f12']
        name = s['f14']
        change = s['f3']
        print(f"{i}. {name} ({code}): {change}%")
        result.append({'code': code, 'name': name, 'change': change})
    
    # 保存到文件
    with open('hot_sectors_latest.json', 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print('\n已保存到 hot_sectors_latest.json')
except Exception as e:
    print(f'Error: {e}')
