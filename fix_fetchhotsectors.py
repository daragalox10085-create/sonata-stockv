import re

with open('src/services/realDataFetcher.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the fetchHotSectors method
old_pattern = r'  async fetchHotSectors\(\): Promise<SectorData\[\]> \{[^}]+const url = `\$\{this\.EASTMONEY_BASE\}/qt/clist/get\?[^`]+`;[^}]+\}[^}]+\}[^}]+\}[^}]+\}'

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

# Simple string replacement
old_str = "  async fetchHotSectors(): Promise<SectorData[]> {\n    // f3=涨跌幅, f62=主力净流入, f8=换手率, f20=总市值, f184=RSI\n    const url = `${this.EASTMONEY_BASE}/qt/clist/get?pn=1&pz=100&po=1&np=1&fltt=2&invt=2&fid=f62&fs=m:90+t:2&fields=f12,f14,f3,f62,f8,f20,f184`;"
    
new_str = "  async fetchHotSectors(): Promise<SectorData[]> {\n    // 从静态数据获取\n    const sectors = await sectorServiceStatic.getHotSectors();\n    return sectors.map(s => ({\n      code: s.code,\n      name: s.name,\n      changePercent: s.changePercent,\n      mainForceNet: s.mainCapitalInflow,\n      turnoverRate: s.turnoverRate,\n      marketValue: s.marketValue,\n      rsi: s.rsi,\n      source: 'static' as DataSource,\n      timestamp: s.timestamp\n    }));"

if old_str in content:
    content = content.replace(old_str, new_str)
    print("Found and replaced fetchHotSectors method")
else:
    print("Pattern not found!")

with open('src/services/realDataFetcher.ts', 'w', encoding='utf-8') as f:
    f.write(content)