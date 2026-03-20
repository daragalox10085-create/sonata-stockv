#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试热门板块更新是否有效
"""

import json
import requests
from datetime import datetime
import sys

# 确保使用 UTF-8 编码
reload(sys) if sys.version_info[0] < 3 else None

def test_sector_data():
    """测试板块数据"""
    print("[{}] 测试板块数据有效性...".format(datetime.now()))
    
    # 读取 SectorServiceStatic.ts 文件
    try:
        with open('src/services/SectorServiceStatic.ts', 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 检查是否包含必要的板块
        required_sectors = ['渔业', '种植业', '存储芯片', '半导体', '白酒', '人工智能']
        found_sectors = []
        
        for sector in required_sectors:
            if sector in content:
                found_sectors.append(sector)
                print("  [OK] 找到板块：{}".format(sector))
            else:
                print("  [FAIL] 未找到板块：{}".format(sector))
        
        print("\n找到 {}/{} 个板块".format(len(found_sectors), len(required_sectors)))
        
        # 检查最后更新时间
        if '最后更新' in content:
            print("  [OK] 包含更新时间戳")
        else:
            print("  [WARN] 未包含更新时间戳")
        
        # 检查数据格式
        if 'DEFAULT_HOT_SECTORS' in content:
            print("  [OK] 数据格式正确")
        else:
            print("  [FAIL] 数据格式错误")
        
        return len(found_sectors) == len(required_sectors)
        
    except FileNotFoundError:
        print("  [FAIL] 文件不存在")
        return False
    except Exception as e:
        print("  [FAIL] 测试失败：{}".format(e))
        return False

def test_deployment():
    """测试部署是否成功"""
    print("\n[{}] 测试部署...".format(datetime.now()))
    
    # 测试部署的 URL
    test_url = 'https://d81c03f3.sonata-stock.pages.dev'
    
    try:
        response = requests.get(test_url, timeout=10)
        
        if response.status_code == 200:
            print("  [OK] 部署成功：{}".format(test_url))
            
            # 检查页面是否包含热门板块
            if '热门板块' in response.text:
                print("  [OK] 页面包含热门板块")
            else:
                print("  [WARN] 页面未包含热门板块")
            
            return True
        else:
            print("  [FAIL] 部署失败：HTTP {}".format(response.status_code))
            return False
            
    except Exception as e:
        print("  [FAIL] 测试失败：{}".format(e))
        return False

if __name__ == '__main__':
    print("\n" + "="*60)
    print("热门板块更新测试")
    print("="*60 + "\n")
    
    # 测试数据
    data_ok = test_sector_data()
    
    # 测试部署
    deploy_ok = test_deployment()
    
    print("\n" + "="*60)
    print("测试结果:")
    print("  数据有效性：{} 通过".format('[OK]' if data_ok else '[FAIL]'))
    print("  部署测试：{} 通过".format('[OK]' if deploy_ok else '[FAIL]'))
    print("="*60 + "\n")
    
    if data_ok and deploy_ok:
        print("[OK] 所有测试通过!")
        sys.exit(0)
    else:
        print("[WARN] 部分测试失败，请检查")
        sys.exit(1)
