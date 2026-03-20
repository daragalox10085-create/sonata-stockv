with open('dist/assets/index-CG-AkBfR.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix BASE_URL in config
content = content.replace('BASE_URL:"https://push2.eastmoney.com/api"', 'BASE_URL:"/api/eastmoney"')
content = content.replace('EASTMONEY_BASE","https://push2.eastmoney.com/api"', 'EASTMONEY_BASE","/api/eastmoney"')

with open('dist/assets/index-CG-AkBfR.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed BASE_URL configs')
print(f'Remaining: {content.count("push2.eastmoney.com")}')
