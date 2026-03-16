#!/usr/bin/env python3
# test_akshare_sources.py - 测试AkShare不同数据源

import sys
try:
    import akshare as ak
    import json
    from datetime import datetime
    
    print("=== 测试AkShare不同数据源 ===\n")
    
    # 1. 东方财富行业板块（可能被封）
    print("1. 尝试东方财富行业板块...")
    try:
        df = ak.stock_board_industry_name_em()
        print(f"✅ 成功！获取到 {len(df)} 个板块")
        print(df.head(3)[['板块名称', '涨跌幅', '主力净流入']].to_string())
    except Exception as e:
        print(f"❌ 失败: {e}\n")
    
    # 2. 同花顺行业板块
    print("\n2. 尝试同花顺行业板块...")
    try:
        df = ak.stock_board_industry_ths()
        print(f"✅ 成功！获取到 {len(df)} 个板块")
        print(df.head(3).to_string())
    except Exception as e:
        print(f"❌ 失败: {e}\n")
    
    # 3. 新浪行业板块
    print("\n3. 尝试新浪行业板块...")
    try:
        df = ak.stock_sector_detail(symbol="hangye_ZL01")
        print(f"✅ 成功！获取到 {len(df)} 个板块")
        print(df.head(3).to_string())
    except Exception as e:
        print(f"❌ 失败: {e}\n")
    
    # 4. 东方财富概念板块
    print("\n4. 尝试东方财富概念板块...")
    try:
        df = ak.stock_board_concept_name_em()
        print(f"✅ 成功！获取到 {len(df)} 个概念")
        print(df.head(3)[['板块名称', '涨跌幅', '主力净流入']].to_string())
    except Exception as e:
        print(f"❌ 失败: {e}\n")
    
    # 5. 个股行业分类（备用方案）
    print("\n5. 尝试获取个股行业分类...")
    try:
        df = ak.stock_individual_info_em(symbol="600519")
        print(f"✅ 成功！")
        print(df.to_string())
    except Exception as e:
        print(f"❌ 失败: {e}\n")
    
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    import traceback
    traceback.print_exc()
    sys.exit(1)
