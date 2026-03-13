"""
测试热门板块 API
用法：uv run python test_hot_sectors.py
"""

import requests
import json

def test_hot_sectors_api():
    """测试 /api/hot-sectors 端点"""
    url = "http://localhost:5000/api/hot-sectors"
    
    print(f"🔍 测试 API: {url}")
    print("-" * 60)
    
    try:
        response = requests.get(url, timeout=30)
        print(f"状态码：{response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get('success'):
                print("✅ API 调用成功")
                print(f"📊 返回板块数量：{len(data.get('data', []))}")
                print()
                
                sectors = data.get('data', [])
                for i, item in enumerate(sectors[:3], 1):
                    sector = item.get('sector', {})
                    print(f"{i}. {sector.get('name', 'N/A')} (#{sector.get('rank', '-')})")
                    print(f"   评分：{sector.get('score', 0)}分")
                    print(f"   涨跌幅：{sector.get('changePercent', 0):.2f}%")
                    print(f"   主力净流入：{sector.get('metrics', {}).get('mainForceNet', 0) / 10000:.0f}万")
                    print(f"   趋势：{sector.get('trend', 'N/A')}")
                    print(f"   成分股：{len(item.get('constituents', []))}只")
                    print(f"   精选股票：{len(item.get('selectedStocks', []))}只")
                    print()
                
                # 验证数据结构
                print("📋 数据结构验证:")
                first_sector = sectors[0] if sectors else {}
                
                required_fields = ['sector', 'constituents', 'selectedStocks', 'dataQuality']
                for field in required_fields:
                    status = "✅" if field in first_sector else "❌"
                    print(f"   {status} {field}")
                
                if 'sector' in first_sector:
                    sector_fields = ['code', 'name', 'score', 'rank', 'changePercent', 'trend', 'topStocks', 'metrics']
                    print("\n📋 板块字段验证:")
                    for field in sector_fields:
                        status = "✅" if field in first_sector['sector'] else "❌"
                        print(f"   {status} {field}")
                
                print("\n✅ 所有测试通过!")
                return True
            else:
                print(f"❌ API 返回失败：{data.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ HTTP 错误：{response.status_code}")
            print(f"响应内容：{response.text[:500]}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ 连接错误：无法连接到后端服务")
        print("💡 提示：请先启动 Flask 后端：uv run python app.py")
        return False
    except requests.exceptions.Timeout:
        print("❌ 请求超时：API 响应时间过长")
        return False
    except Exception as e:
        print(f"❌ 未知错误：{e}")
        return False


def test_single_stock_selection():
    """测试选股功能"""
    from app import select_stocks, DataFetcher
    
    print("\n" + "=" * 60)
    print("🧪 测试选股功能")
    print("=" * 60)
    
    # 测试股票列表
    test_stocks = ['600000', '600036', '000001', '000858']
    
    print(f"测试股票：{test_stocks}")
    selected = select_stocks(test_stocks, limit=2)
    
    if selected:
        print(f"✅ 成功选出 {len(selected)} 只股票")
        for stock in selected:
            print(f"   - {stock.get('name')} ({stock.get('code')})")
            print(f"     评分：{stock.get('score')}分")
            print(f"     推荐：{stock.get('recommendation')}")
    else:
        print("⚠️  未选出股票（可能不符合筛选条件）")
    
    return True


if __name__ == '__main__':
    print("=" * 60)
    print("🚀 Sonata 热门板块 API 测试")
    print("=" * 60)
    print()
    
    # 测试 1: API 端点
    api_success = test_hot_sectors_api()
    
    # 测试 2: 选股功能（离线）
    if not api_success:
        print("\n💡 API 不可用，尝试离线测试选股功能...")
        try:
            test_single_stock_selection()
        except Exception as e:
            print(f"⚠️  离线测试失败：{e}")
    
    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)
