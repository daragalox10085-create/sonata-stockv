#!/usr/bin/env python3
# get_sectors.py - 使用AkShare获取热门板块数据

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
            "code": row.get('板块代码', ''),
            "name": row.get('板块名称', ''),
            "changePercent": float(row.get('涨跌幅', 0)),
            "mainForceNet": float(row.get('主力净流入', 0)),
            "turnoverRate": float(row.get('换手率', 0)),
            "rank": len(sectors) + 1
        }
        sectors.append(sector)
    
    result = {
        "sectors": sectors,
        "timestamp": datetime.now().isoformat(),
        "source": "akshare"
    }
    
    print(json.dumps(result, ensure_ascii=False, indent=2))
    
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
