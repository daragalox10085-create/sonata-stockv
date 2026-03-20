with open('dist/assets/index-CG-AkBfR.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('BASE_URL:"http://push2.eastmoney.com/api"', 'BASE_URL:"/api/eastmoney"')

with open('dist/assets/index-CG-AkBfR.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed config BASE_URL')