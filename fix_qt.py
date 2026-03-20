with open('dist/assets/index-CG-AkBfR.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace remaining qt/clist/get with /sector
content = content.replace('/qt/clist/get', '/sector')

with open('dist/assets/index-CG-AkBfR.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed qt/clist/get')
print(f'Remaining: {content.count("qt/clist/get")}')
