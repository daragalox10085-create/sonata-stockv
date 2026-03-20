import re

with open('dist/assets/index-CG-AkBfR.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the fetchSectorData method in iIt class
# Pattern: fetchSectorData(){var t;const e=`${this.EASTMONEY_BASE}/sector?...

old_pattern = r'fetchSectorData\(\)\{var t;const e=\`\$\{this\.EASTMONEY_BASE\}/sector\?[^`]+\`[^}]+\}'

# Replace with a simple static data return
new_method = '''fetchSectorData(){return Promise.resolve([{code:"BK0428",name:"渔业",changePercent:3.25,heatScore:78,mainCapitalInflow:285000000,turnoverRate:5.2,marketValue:12500000000,rsi:62,topStocks:[{code:"600257",name:"大湖股份",changePercent:5.82},{code:"300094",name:"国联水产",changePercent:4.15},{code:"000798",name:"中水渔业",changePercent:3.89}]}])}'''

content = re.sub(old_pattern, new_method, content)

# Check if replacement worked
if 'fetchSectorData(){return Promise.resolve' in content:
    print('Successfully replaced fetchSectorData with static data')
else:
    print('Pattern not found, trying alternative...')
    # Try to find any fetchSectorData and replace it
    content = re.sub(
        r'fetchSectorData\(\)\s*\{[^}]+\}[^}]+\}[^}]+\}',
        new_method,
        content
    )

with open('dist/assets/index-CG-AkBfR.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
