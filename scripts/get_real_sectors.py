#!/usr/bin/env python3
# get_real_sectors.py - 使用AkShare获取真实热门板块数据

import sys
try:
    import akshare as ak
    import json
    from datetime import datetime
    
    # 获取行业板块数据
    df = ak.stock_board_industry_name_em()
    
    # 按主力净流入排序，取前10
    df = df.sort_values('主力净流入', ascending=False).head(10)
    
    sectors = []
    for _, row in df.iterrows():
        sector = {
            'name': row.get('板块名称', ''),
            'change': float(row.get('涨跌幅', 0)),
            'main_force': float(row.get('主力净流入', 0)),
            'turnover': float(row.get('换手率', 0))
        }
        sectors.append(sector)
    
    result = {
        'sectors': sectors,
        'timestamp': datetime.now().isoformat(),
        'source': 'akshare-real'
    }
    
    print(json.dumps(result, ensure_ascii=False, indent=2))
    
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    import traceback
    traceback.print_exc()
    sys.exit(1)
