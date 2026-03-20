with open('dist/assets/index-CG-AkBfR.js', 'r', encoding='utf-8') as f:
    content = f.read()

# The old code pattern - calls alt.getKLineDataWithFallback and expects {data: {klines: [...]}}
# But fetchEastmoneyKLine returns KLinePoint[] directly

# Find and replace the fetchKLineDataByPeriod method
old_code = 'async fetchKLineDataByPeriod(t,e,r){const i=await this.fetchEastmoneyKLine(t,e,r);if(i.data&&i.data.klines&&i.data.klines.length>0)return i.data.klines.map(s=>{const l=s.split(",");return{date:l[0],open:parseFloat(l[1]),close:parseFloat(l[2]),low:parseFloat(l[3]),high:parseFloat(l[4]),volume:parseInt(l[5])||0}}).filter(s=>!isNaN(s.open)&&s.open>0);console.warn("[UnifiedStockDataService] ͳһ APIͻʧܣʹþɷ");const a=await this.fetchEastmoneyKLine(t,e,r);if(a&&a.length>0)return a;const o=await this.fetchTencentKLine(t,r);return o&&o.length>0?o:null}'

# New code - directly use fetchEastmoneyKLine result
new_code = 'async fetchKLineDataByPeriod(t,e,r){const i=await this.fetchEastmoneyKLine(t,e,r);if(i&&i.length>0)return i;console.warn("[fetchKLineDataByPeriod] 东方财富 K 线失败，尝试腾讯");const a=await this.fetchTencentKLine(t,r);if(a&&a.length>0)return a;console.warn("[fetchKLineDataByPeriod] 所有 API 均失败");return null}'

if old_code in content:
    content = content.replace(old_code, new_code)
    print('Replacement successful')
else:
    print('Old code not found, searching...')
    # Try to find the method
    idx = content.find('async fetchKLineDataByPeriod')
    if idx > 0:
        print(f'Found at {idx}')
        print('Current code (first 300 chars):')
        print(content[idx:idx+300])

with open('dist/assets/index-CG-AkBfR.js', 'w', encoding='utf-8') as f:
    f.write(content)

# Verify
if 'getKLineDataWithFallback' in content:
    print('WARNING: getKLineDataWithFallback still exists')
else:
    print('SUCCESS: getKLineDataWithFallback removed')
