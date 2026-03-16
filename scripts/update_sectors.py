#!/usr/bin/env python3
# update_sectors.py - 手动更新板块数据脚本
# 使用方法: python update_sectors.py

import json
import sys
from datetime import datetime

def main():
    print("=" * 60)
    print("Sonata 板块数据更新工具")
    print("=" * 60)
    print()
    
    # 这里应该实现真实的爬虫逻辑
    # 由于网络限制，目前生成模拟数据
    
    print("[INFO] 开始更新板块数据...")
    print("[INFO] 注意：由于网络限制，当前生成模拟数据")
    print()
    
    # 模拟板块数据
    sectors = [
        {
            "code": "BK1260",
            "name": "渔业",
            "score": 86,
            "rank": 1,
            "changePercent": 3.8,
            "trend": "强势热点",
            "topStocks": [
                {"code": "000798", "name": "中水渔业", "changePercent": 7.2},
                {"code": "002086", "name": "东方海洋", "changePercent": 5.8}
            ]
        },
        {
            "code": "BK1261",
            "name": "种植业",
            "score": 82,
            "rank": 2,
            "changePercent": 3.2,
            "trend": "强势热点",
            "topStocks": [
                {"code": "600313", "name": "农发种业", "changePercent": 10.0},
                {"code": "002041", "name": "登海种业", "changePercent": 6.5}
            ]
        },
        {
            "code": "BK1137",
            "name": "存储芯片",
            "score": 83,
            "rank": 3,
            "changePercent": 2.9,
            "trend": "强势热点",
            "topStocks": [
                {"code": "688525", "name": "佰维存储", "changePercent": 8.2},
                {"code": "300042", "name": "朗科科技", "changePercent": 7.5}
            ]
        },
        {
            "code": "BK1036",
            "name": "半导体",
            "score": 84,
            "rank": 4,
            "changePercent": 2.3,
            "trend": "持续热点",
            "topStocks": [
                {"code": "688981", "name": "中芯国际", "changePercent": 5.2},
                {"code": "603986", "name": "兆易创新", "changePercent": 4.8}
            ]
        },
        {
            "code": "BK0967",
            "name": "水产概念",
            "score": 85,
            "rank": 5,
            "changePercent": 2.8,
            "trend": "强势热点",
            "topStocks": [
                {"code": "002086", "name": "东方海洋", "changePercent": 10.1},
                {"code": "000798", "name": "中水渔业", "changePercent": 7.2}
            ]
        },
        {
            "code": "BK1277",
            "name": "白酒Ⅱ",
            "score": 80,
            "rank": 6,
            "changePercent": 1.8,
            "trend": "持续热点",
            "topStocks": [
                {"code": "600519", "name": "贵州茅台", "changePercent": 3.2},
                {"code": "000858", "name": "五粮液", "changePercent": 2.8}
            ]
        }
    ]
    
    # 构建数据
    data = {
        "sectors": sectors,
        "timestamp": datetime.now().isoformat(),
        "source": "manual-update",
        "updateType": "scheduled" if len(sys.argv) > 1 and sys.argv[1] == "--scheduled" else "manual"
    }
    
    # 保存到文件
    output_file = "public/sector_data.json"
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"[SUCCESS] 板块数据更新完成！")
        print(f"[INFO] 保存到: {output_file}")
        print(f"[INFO] 更新时间: {data['timestamp']}")
        print(f"[INFO] 板块数量: {len(sectors)}")
        print()
        print("板块列表:")
        for sector in sectors:
            print(f"  - {sector['name']}: +{sector['changePercent']}% ({sector['trend']})")
        
        return 0
    except Exception as e:
        print(f"[ERROR] 保存数据失败: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
