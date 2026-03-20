with open('dist/assets/index-CG-AkBfR.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the exact location
idx = content.find('async fetchKLineDataByPeriod(t,e,r){const i=await alt.getKLineDataWithFallback(t,e,r);')
if idx < 0:
    print('Not found with alt.getKLineDataWithFallback')
    idx = content.find('async fetchKLineDataByPeriod(t,e,r)')
    if idx >= 0:
        print(f'Found basic method at {idx}')
        # Find the end of the method (next async keyword)
        end_idx = content.find('async fetchEastmoneyKLine', idx)
        if end_idx > 0:
            old_method = content[idx:end_idx]
            print(f'Old method length: {len(old_method)}')
            print('First 200 chars:')
            print(old_method[:200])
            
            new_impl = 'async fetchKLineDataByPeriod(t,e,r){const i=await this.fetchEastmoneyKLine(t,e,r);if(i&&i.length>0)return i;console.warn("[fetchKLineDataByPeriod] 东方财富 K 线失败，尝试腾讯");const a=await this.fetchTencentKLine(t,r);if(a&&a.length>0)return a;console.warn("[fetchKLineDataByPeriod] 所有 API 均失败");return null}'
            
            content = content[:idx] + new_impl + content[end_idx:]
            print('Replaced')
else:
    print(f'Found at {idx}')
    # Find the end
    end_idx = content.find('async fetchEastmoneyKLine', idx)
    if end_idx > 0:
        old_method = content[idx:end_idx]
        print(f'Old method length: {len(old_method)}')
        
        new_impl = 'async fetchKLineDataByPeriod(t,e,r){const i=await this.fetchEastmoneyKLine(t,e,r);if(i&&i.length>0)return i;console.warn("[fetchKLineDataByPeriod] 东方财富 K 线失败，尝试腾讯");const a=await this.fetchTencentKLine(t,r);if(a&&a.length>0)return a;console.warn("[fetchKLineDataByPeriod] 所有 API 均失败");return null}'
        
        content = content[:idx] + new_impl + content[end_idx:]
        print('Replaced')

with open('dist/assets/index-CG-AkBfR.js', 'w', encoding='utf-8') as f:
    f.write(content)

if 'getKLineDataWithFallback' in content:
    print('WARNING: getKLineDataWithFallback still exists')
else:
    print('SUCCESS')
