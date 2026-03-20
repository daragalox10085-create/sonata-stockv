import requests
import json

# 读取板块列表
with open('hot_sectors_latest.json', 'r', encoding='utf-8') as f:
    sectors = json.load(f)

result = []

for sector in sectors:
    code = sector['code']
    name = sector['name']
    change = sector['change']
    
    print(f"获取 {name} ({code}) 成分股...")
    
    # 获取板块成分股
    url = 'https://push2.eastmoney.com/api/qt/clist/get'
    params = {
        'pn': 1,
        'pz': 6,
        'po': 1,
        'np': 1,
        'fltt': 2,
        'invt': 2,
        'fid': 'f12',
        'fs': f'b:{code}',
        'fields': 'f12,f14,f3'
    }
    
    try:
        resp = requests.get(url, params=params, timeout=10)
        data = resp.json()
        stocks = data.get('data', {}).get('diff', [])
        
        top_stocks = []
        for s in stocks[:6]:
            top_stocks.append({
                'code': s['f12'],
                'name': s['f14'],
                'changePercent': float(s['f3']) if s['f3'] else 0
            })
        
        result.append({
            'code': code,
            'name': name,
            'change': change,
            'topStocks': top_stocks
        })
        
        print(f"  获取到 {len(top_stocks)} 只成分股")
    except Exception as e:
        print(f"  Error: {e}")

# 保存完整数据
with open('sectors_with_stocks.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print('\n已保存到 sectors_with_stocks.json')
