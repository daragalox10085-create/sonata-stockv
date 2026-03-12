#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
K 线历史数据 API 测试脚本
测试腾讯财经和新浪财经的历史 K 线接口
确保获取 3 个月（约 90 天）真实交易数据
"""

import requests
import json
import sys
from datetime import datetime, timedelta
import re

# 修复 Windows 控制台编码问题
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# 测试配置
TEST_SYMBOLS = {
    'A 股': '513310',  # 中韩半导体 ETF
    '港股': '00700',   # 腾讯控股
}

def test_tencent_kline(symbol, market='sh', days=360):
    """
    测试腾讯财经 API 历史 K 线接口
    
    Args:
        symbol: 股票代码
        market: 市场前缀 (sh/sz/hk)
        days: 请求天数
    
    Returns:
        dict: 测试结果
    """
    print(f"\n{'='*60}")
    print(f"测试腾讯财经 API - {symbol}")
    print(f"{'='*60}")
    
    # A 股和港股使用不同的 API
    if market == 'hk':
        url = f"http://web.ifzq.gtimg.cn/appstock/app/hkfqkline/get?_var=kline_dayqfq&param=hk{symbol},day,,,{days},qfq"
    else:
        # A 股使用这个 API (需要验证)
        url = f"http://web.ifzq.gtimg.cn/appstock/app/fqkline/get?_var=kline_dayqfq&param={market}{symbol},day,,,{days},qfq"
    
    try:
        print(f"请求 URL: {url}")
        response = requests.get(url, timeout=10)
        response.encoding = 'utf-8'
        
        print(f"状态码：{response.status_code}")
        print(f"响应长度：{len(response.text)} 字符")
        
        # 解析响应 (腾讯 API 返回 JSONP 格式)
        content = response.text
        match = re.search(r'kline_dayqfq=(.+)', content)
        if match:
            json_str = match.group(1)
            data = json.loads(json_str)
            
            # 检查数据结构
            if data.get('code') == 0:
                print("✅ API 调用成功")
                
                # 提取 K 线数据
                kline_data = None
                if market == 'hk':
                    kline_key = f'hk{symbol}'
                    kline_data = data.get('data', {}).get(kline_key, {}).get('qfqday', [])
                else:
                    kline_key = f'{market}{symbol}'
                    kline_data = data.get('data', {}).get(kline_key, {}).get('qfqday', [])
                
                if kline_data:
                    print(f"✅ 获取到 {len(kline_data)} 条 K 线数据")
                    
                    # 验证数据质量
                    if len(kline_data) >= 90:
                        print(f"✅ 数据量充足 (≥90 天)")
                    else:
                        print(f"⚠️ 数据量不足 (仅{len(kline_data)}天，需要≥90 天)")
                    
                    # 显示最近 5 条数据
                    print("\n最近 5 条 K 线数据:")
                    print(f"{'日期':<12} {'开盘':<10} {'收盘':<10} {'最高':<10} {'最低':<10} {'成交量':<15}")
                    for item in kline_data[-5:]:
                        date = item[0]
                        open_p = item[1]
                        close_p = item[2]
                        high_p = item[3]
                        low_p = item[4]
                        volume = item[5]
                        print(f"{date:<12} {open_p:<10} {close_p:<10} {high_p:<10} {low_p:<10} {volume:<15}")
                    
                    # 计算日期范围
                    if len(kline_data) > 0:
                        first_date = kline_data[0][0]
                        last_date = kline_data[-1][0]
                        print(f"\n数据日期范围：{first_date} 至 {last_date}")
                    
                    return {
                        'success': True,
                        'data_count': len(kline_data),
                        'data': kline_data,
                        'first_date': kline_data[0][0] if kline_data else None,
                        'last_date': kline_data[-1][0] if kline_data else None
                    }
                else:
                    print("❌ 未找到 K 线数据")
                    return {'success': False, 'error': 'No kline data'}
            else:
                print(f"❌ API 返回错误：{data.get('msg', 'Unknown error')}")
                return {'success': False, 'error': data.get('msg', 'API error')}
        else:
            print("❌ 无法解析响应")
            print(f"响应内容：{content[:500]}")
            return {'success': False, 'error': 'Parse error'}
            
    except Exception as e:
        print(f"❌ 请求失败：{str(e)}")
        return {'success': False, 'error': str(e)}


def test_sina_kline(symbol, market='sh', days=360):
    """
    测试新浪财经 API 历史 K 线接口
    
    Args:
        symbol: 股票代码
        market: 市场前缀 (sh/sz)
        days: 请求周期 (day/week/month)
    
    Returns:
        dict: 测试结果
    """
    print(f"\n{'='*60}")
    print(f"测试新浪财经 API - {symbol}")
    print(f"{'='*60}")
    
    # 新浪财经 K 线 API
    url = f"http://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol={market}{symbol}&scale=240&ma=no&datalen={days}"
    
    try:
        print(f"请求 URL: {url}")
        response = requests.get(url, timeout=10)
        response.encoding = 'utf-8'
        
        print(f"状态码：{response.status_code}")
        print(f"响应长度：{len(response.text)} 字符")
        
        # 解析 JSON
        data = response.json()
        
        if isinstance(data, list) and len(data) > 0:
            print("✅ API 调用成功")
            print(f"✅ 获取到 {len(data)} 条 K 线数据")
            
            if len(data) >= 90:
                print(f"✅ 数据量充足 (≥90 天)")
            else:
                print(f"⚠️ 数据量不足 (仅{len(data)}天，需要≥90 天)")
            
            # 显示数据结构
            print("\n数据示例 (最近 5 条):")
            print(f"{'日期':<12} {'开盘':<10} {'最高':<10} {'最低':<10} {'收盘':<10} {'成交量':<15}")
            for item in data[-5:]:
                date = item.get('day', '')
                open_p = item.get('open', 0)
                high_p = item.get('high', 0)
                low_p = item.get('low', 0)
                close_p = item.get('close', 0)
                volume = item.get('volume', 0)
                print(f"{date:<12} {open_p:<10} {high_p:<10} {low_p:<10} {close_p:<10} {volume:<15}")
            
            return {
                'success': True,
                'data_count': len(data),
                'data': data
            }
        else:
            print("❌ 返回数据格式异常")
            return {'success': False, 'error': 'Invalid data format'}
            
    except Exception as e:
        print(f"❌ 请求失败：{str(e)}")
        return {'success': False, 'error': str(e)}


def main():
    """主测试函数"""
    print("="*60)
    print("K 线历史数据 API 测试")
    print(f"测试时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)
    
    results = {
        'tencent': {},
        'sina': {}
    }
    
    # 测试腾讯财经 API (港股)
    print("\n" + "="*60)
    print("第一部分：腾讯财经 API 测试 (港股)")
    print("="*60)
    results['tencent']['hk'] = test_tencent_kline('00700', market='hk', days=360)
    
    # 测试腾讯财经 API (A 股 ETF)
    print("\n" + "="*60)
    print("第二部分：腾讯财经 API 测试 (A 股 ETF)")
    print("="*60)
    results['tencent']['a_share'] = test_tencent_kline('513310', market='sh', days=360)
    
    # 测试新浪财经 API
    print("\n" + "="*60)
    print("第三部分：新浪财经 API 测试")
    print("="*60)
    results['sina']['a_share'] = test_sina_kline('513310', market='sh', days=360)
    
    # 生成测试报告
    print("\n" + "="*60)
    print("测试报告总结")
    print("="*60)
    
    report = []
    report.append(f"测试时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report.append("")
    
    # 腾讯港股
    if results['tencent']['hk'].get('success'):
        count = results['tencent']['hk']['data_count']
        report.append(f"✅ 腾讯财经 (港股 00700): {count}条数据")
    else:
        report.append(f"❌ 腾讯财经 (港股 00700): 失败 - {results['tencent']['hk'].get('error', 'Unknown')}")
    
    # 腾讯 A 股
    if results['tencent']['a_share'].get('success'):
        count = results['tencent']['a_share']['data_count']
        report.append(f"✅ 腾讯财经 (A 股 513310): {count}条数据")
    else:
        report.append(f"❌ 腾讯财经 (A 股 513310): 失败 - {results['tencent']['a_share'].get('error', 'Unknown')}")
    
    # 新浪 A 股
    if results['sina']['a_share'].get('success'):
        count = results['sina']['a_share']['data_count']
        report.append(f"✅ 新浪财经 (A 股 513310): {count}条数据")
    else:
        report.append(f"❌ 新浪财经 (A 股 513310): 失败 - {results['sina']['a_share'].get('error', 'Unknown')}")
    
    report.append("")
    report.append("="*60)
    report.append("结论:")
    report.append("="*60)
    
    # 判断哪个 API 可用
    available_apis = []
    if results['tencent']['a_share'].get('success') and results['tencent']['a_share']['data_count'] >= 90:
        available_apis.append("腾讯财经 (A 股)")
    if results['sina']['a_share'].get('success') and results['sina']['a_share']['data_count'] >= 90:
        available_apis.append("新浪财经 (A 股)")
    
    if available_apis:
        report.append(f"✅ 可用 API: {', '.join(available_apis)}")
        report.append("✅ 可以获取 3 个月以上真实 K 线数据")
    else:
        report.append("⚠️ 所有 API 都有问题，需要降级方案")
    
    report_text = "\n".join(report)
    print(report_text)
    
    # 保存测试报告
    report_file = "kline_api_test_report.txt"
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(report_text)
        f.write("\n\n详细数据:\n")
        f.write(json.dumps(results, indent=2, ensure_ascii=False))
    
    print(f"\n测试报告已保存：{report_file}")
    
    return results


if __name__ == '__main__':
    results = main()
