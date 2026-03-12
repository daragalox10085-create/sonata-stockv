from flask import Flask, jsonify, request
import numpy as np
import requests
import re
from datetime import datetime, timedelta

app = Flask(__name__)

def convert_to_eastmoney_code(code):
    """转换为东方财富代码格式"""
    if code.startswith('sh'):
        return f"1.{code[2:]}"
    elif code.startswith('sz'):
        return f"0.{code[2:]}"
    elif code.startswith('6'):
        return f"1.{code}"
    else:
        return f"0.{code}"

def convert_to_tencent_code(code):
    """转换为腾讯代码格式"""
    if code.startswith('sh'):
        return f"sh{code[2:]}"
    elif code.startswith('sz'):
        return f"sz{code[2:]}"
    elif code.startswith('6'):
        return f"sh{code}"
    else:
        return f"sz{code}"

class DataFetcher:
    """多层级数据获取器 - 5层冗余"""
    
    @staticmethod
    def fetch_from_eastmoney(stock_code):
        """层级1: 东方财富获取数据"""
        try:
            secid = convert_to_eastmoney_code(stock_code)
            url = f'https://push2.eastmoney.com/api/qt/stock/get?secid={secid}&fields=f43,f44,f45,f46,f47,f48,f49,f50,f51,f52,f57,f58,f60,f170'
            response = requests.get(url, timeout=5)
            data = response.json()
            
            if data.get('data'):
                d = data['data']
                return {
                    'name': d.get('f58', ''),
                    'current_price': float(d.get('f43', 0)) / 100,
                    'open': float(d.get('f46', 0)) / 100,
                    'high': float(d.get('f44', 0)) / 100,
                    'low': float(d.get('f45', 0)) / 100,
                    'volume': int(d.get('f47', 0)),
                    'market_cap': float(d.get('f57', 0)) / 100000000,
                    'yesterday_close': float(d.get('f60', 0)) / 100,
                    'change_percent': float(d.get('f170', 0)) / 100
                }
        except Exception as e:
            print(f"东方财富API失败: {e}")
        return None
    
    @staticmethod
    def fetch_from_tencent(stock_code):
        """层级2: 腾讯获取数据"""
        try:
            tencent_code = convert_to_tencent_code(stock_code)
            url = f'http://qt.gtimg.cn/q={tencent_code}'
            response = requests.get(url, timeout=5)
            text = response.text
            
            match = re.search(r'v_(?:sh|sz)(\d+)="([^"]+)"', text)
            if match:
                fields = match.group(2).split('~')
                return {
                    'name': fields[1],
                    'current_price': float(fields[3]),
                    'open': float(fields[4]),
                    'high': float(fields[5]),
                    'low': float(fields[6]),
                    'volume': int(float(fields[7])),
                    'market_cap': float(fields[15]) if len(fields) > 15 else 0,
                    'yesterday_close': float(fields[2]),
                    'change_percent': float(fields[32]) if len(fields) > 32 else 0
                }
        except Exception as e:
            print(f"腾讯API失败: {e}")
        return None
    
    @staticmethod
    def fetch_from_sina(stock_code):
        """层级3: 新浪财经获取数据"""
        try:
            sina_code = convert_to_tencent_code(stock_code)
            url = f'https://hq.sinajs.cn/list={sina_code}'
            headers = {'Referer': 'https://finance.sina.com.cn'}
            response = requests.get(url, timeout=5, headers=headers)
            text = response.text
            
            match = re.search(r'var hq_str_(?:sh|sz)(\d+)="([^"]*)"', text)
            if match and match.group(2):
                fields = match.group(2).split(',')
                if len(fields) >= 8:
                    return {
                        'name': fields[0],
                        'current_price': float(fields[3]),
                        'open': float(fields[1]),
                        'high': float(fields[4]),
                        'low': float(fields[5]),
                        'volume': int(float(fields[8])),
                        'market_cap': 0,
                        'yesterday_close': float(fields[2]),
                        'change_percent': float(fields[3]) / float(fields[2]) * 100 - 100 if float(fields[2]) > 0 else 0
                    }
        except Exception as e:
            print(f"新浪API失败: {e}")
        return None
    
    @staticmethod
    def fetch_from_163(stock_code):
        """层级4: 网易财经获取数据"""
        try:
            code = stock_code[2:] if stock_code.startswith(('sh', 'sz')) else stock_code
            url = f'http://api.money.126.net/data/feed/{convert_to_tencent_code(stock_code)}'
            response = requests.get(url, timeout=5)
            data = response.json()
            
            key = list(data.keys())[0] if data else None
            if key and data[key]:
                d = data[key]
                return {
                    'name': d.get('name', ''),
                    'current_price': float(d.get('price', 0)),
                    'open': float(d.get('open', 0)),
                    'high': float(d.get('high', 0)),
                    'low': float(d.get('low', 0)),
                    'volume': int(d.get('volume', 0)),
                    'market_cap': 0,
                    'yesterday_close': float(d.get('yestclose', 0)),
                    'change_percent': float(d.get('updown', 0)) / float(d.get('yestclose', 1)) * 100
                }
        except Exception as e:
            print(f"网易API失败: {e}")
        return None
    
    @staticmethod
    def fetch_from_akshare(stock_code):
        """层级5: AkShare获取数据"""
        try:
            import akshare as ak
            code = stock_code[2:] if stock_code.startswith(('sh', 'sz')) else stock_code
            
            df = ak.stock_zh_a_spot_em()
            stock_row = df[df['代码'] == code]
            
            if not stock_row.empty:
                row = stock_row.iloc[0]
                return {
                    'name': row['名称'],
                    'current_price': float(row['最新价']),
                    'open': float(row['开盘价']),
                    'high': float(row['最高价']),
                    'low': float(row['最低价']),
                    'volume': int(row['成交量']),
                    'market_cap': float(row['总市值']) / 100000000,
                    'yesterday_close': float(row['昨收']),
                    'change_percent': float(row['涨跌幅'])
                }
        except Exception as e:
            print(f"AkShare失败: {e}")
        return None
    
    @staticmethod
    def fetch_historical_from_eastmoney(stock_code, days=60):
        """从东方财富获取历史K线数据"""
        try:
            secid = convert_to_eastmoney_code(stock_code)
            url = f'https://push2his.eastmoney.com/api/qt/stock/kline/get?secid={secid}&fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=101&fqt=0&end=20500101&lmt={days}'
            response = requests.get(url, timeout=10)
            data = response.json()
            
            if data.get('data') and data['data'].get('klines'):
                klines = data['data']['klines']
                prices = []
                for line in klines:
                    parts = line.split(',')
                    if len(parts) >= 6:
                        prices.append({
                            'date': parts[0],
                            'open': float(parts[1]),
                            'close': float(parts[2]),
                            'high': float(parts[3]),
                            'low': float(parts[4]),
                            'volume': int(float(parts[5]))
                        })
                return prices
        except Exception as e:
            print(f"东方财富历史数据失败: {e}")
        return None
    
    @staticmethod
    def fetch_all_data(stock_code):
        """多层级数据获取 - 5层冗余"""
        sources = [
            ('eastmoney', DataFetcher.fetch_from_eastmoney),
            ('tencent', DataFetcher.fetch_from_tencent),
            ('sina', DataFetcher.fetch_from_sina),
            ('163', DataFetcher.fetch_from_163),
            ('akshare', DataFetcher.fetch_from_akshare)
        ]
        
        data = None
        source_name = None
        
        for name, fetch_func in sources:
            data = fetch_func(stock_code)
            if data is not None:
                source_name = name
                print(f"数据获取成功: {name}")
                break
        
        historical = DataFetcher.fetch_historical_from_eastmoney(stock_code)
        
        return data, historical, source_name

def monte_carlo_simulation(stock_code, days=7, simulations=10000):
    """蒙特卡洛模拟股票未来价格"""
    data, historical, source = DataFetcher.fetch_all_data(stock_code)
    
    if data is None:
        return None
    
    if historical and len(historical) >= 30:
        returns = []
        for i in range(1, len(historical)):
            ret = (historical[i]['close'] - historical[i-1]['close']) / historical[i-1]['close']
            returns.append(ret)
        
        mean_return = np.mean(returns)
        std_return = np.std(returns)
        current_price = historical[-1]['close']
        
        today_data = {
            'open': historical[-1]['open'],
            'high': historical[-1]['high'],
            'low': historical[-1]['low'],
            'volume': int(historical[-1]['volume'] / 10000),
            'market_cap': data.get('market_cap', 0),
            'yesterday_close': historical[-2]['close'] if len(historical) > 1 else current_price
        }
    else:
        mean_return = 0.001
        std_return = 0.02
        current_price = data['current_price']
        today_data = {
            'open': data['open'],
            'high': data['high'],
            'low': data['low'],
            'volume': int(data['volume'] / 10000),
            'market_cap': data.get('market_cap', 0),
            'yesterday_close': data['yesterday_close']
        }
    
    simulation_results = []
    for _ in range(simulations):
        daily_returns = np.random.normal(mean_return, std_return, days)
        price_series = [current_price]
        for ret in daily_returns:
            price_series.append(price_series[-1] * (1 + ret))
        simulation_results.append(price_series[-1])
    
    sim_array = np.array(simulation_results)
    predicted_price = np.median(sim_array)
    price_5th = np.percentile(sim_array, 5)
    price_95th = np.percentile(sim_array, 95)
    
    change_pct = ((predicted_price - current_price) / current_price) * 100
    
    if change_pct > 5:
        suggestion = "强烈看多"
        suggestion_detail = f"价格¥{current_price:.2f}具有较大上涨空间，建议分批买入，仓位30-50%，止损¥{price_5th:.2f}"
        suggestion_color = "#FF6B00"
    elif change_pct > 2:
        suggestion = "中等"
        suggestion_detail = f"价格¥{current_price:.2f}位于支撑附近，建议分批买入，仓位30-50%，止损¥{price_5th:.2f}"
        suggestion_color = "#FF9500"
    elif change_pct > -2:
        suggestion = "观望"
        suggestion_detail = "技术面良好，价格处于震荡区间，具备较好安全边际。趋势向上，建议分批买入。"
        suggestion_color = "#999999"
    else:
        suggestion = "谨慎"
        suggestion_detail = "价格面临下行压力，建议观望或减仓，注意控制仓位，严格止损。"
        suggestion_color = "#999999"
    
    return {
        "current_price": round(current_price, 2),
        "predicted_price": round(predicted_price, 2),
        "change_pct": round(change_pct, 2),
        "price_range": {
            "low": round(price_5th, 2),
            "high": round(price_95th, 2)
        },
        "support": round(price_5th * 0.98, 2),
        "resistance": round(price_95th * 1.02, 2),
        "suggestion": suggestion,
        "suggestion_detail": suggestion_detail,
        "suggestion_color": suggestion_color,
        "today_data": {
            "open": round(today_data['open'], 2),
            "high": round(today_data['high'], 2),
            "low": round(today_data['low'], 2),
            "volume": today_data['volume'],
            "market_cap": round(today_data['market_cap'], 2),
            "yesterday_close": round(today_data['yesterday_close'], 2)
        },
        "data_source": source
    }

@app.route('/api/stock-analysis', methods=['GET'])
def stock_analysis():
    stock_code = request.args.get('code', 'sh600519')
    result = monte_carlo_simulation(stock_code)
    if result is None:
        return jsonify({"error": "无法获取股票数据，所有API源均失败"}), 400
    return jsonify(result)

@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({"status": "OK", "message": "Sonata API running"})

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting Flask backend on http://0.0.0.0:{port}")
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
