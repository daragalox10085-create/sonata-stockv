import re

content = open('src/services/realDataFetcher.ts', 'r', encoding='utf-8').read()

# Fix 1: Replace fetchHotSectors method
old_method = r'''  async fetchHotSectors\(\): Promise<SectorData\[\]> \{
    // f3=涨跌幅，f62=主力净流入，f8=换手率，f20=总市值，f184=RSI
    const url = `\$\{this\.EASTMONEY_BASE\}/qt/clist/get\?pn=1&pz=100&po=1&np=1&fltt=2&invt=2&fid=f62&fs=m:90\+t:2&fields=f12,f14,f3,f62,f8,f20,f184`;
    
    try \{
      const response = await fetch\(url\);
      const data = await response\.json\(\);
      
      if \(data\.data\?\.diff\) \{
        return Object\.values\(data\.data\.diff\)\.map\(\(sector: any\) => \({
          code: sector\.f12,
          name: sector\.f14,
          changePercent: this\.safeNumber\(sector\.f3\),
          mainForceNet: this\.safeNumber\(sector\.f62\),
          turnoverRate: this\.safeNumber\(sector\.f8\),
          marketValue: this\.safeNumber\(sector\.f20\),
          rsi: this\.safeRSI\(sector\.f184\), // 使用 safeRSI 处理 RSI 字段
          source: 'eastmoney' as DataSource,
          timestamp: new Date\(\)\.toISOString\(\)
        \}\)\);
      }
    \} catch \(error\) \{
      console\.error\('\[RealDataFetcher\] 板块数据获取失败:', error\);
    }'''

new_method = '''  async fetchHotSectors(): Promise<SectorData[]> {
    // 从静态数据获取
    const sectors = await sectorServiceStatic.getHotSectors();
    return sectors.map(s => ({
      code: s.code,
      name: s.name,
      changePercent: s.changePercent,
      mainForceNet: s.mainCapitalInflow,
      turnoverRate: s.turnoverRate,
      marketValue: s.marketValue,
      rsi: s.rsi,
      source: 'static' as DataSource,
      timestamp: s.timestamp
    }));
  }'''

content = re.sub(old_method, new_method, content, flags=re.MULTILINE)

open('src/services/realDataFetcher.ts', 'w', encoding='utf-8').write(content)
print('Fixed fetchHotSectors method')
