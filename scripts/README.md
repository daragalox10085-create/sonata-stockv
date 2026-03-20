# 热门板块自动更新

## 概述

本脚本每 3 天自动搜索最新的 A 股六大潜力板块，并更新到 `SectorServiceStatic.ts` 文件中。

## 文件结构

```
scripts/
├── update_sectors.py    # 主更新脚本
├── test_update.py       # 测试脚本
├── crontab.txt         # Cron 配置示例
└── README.md           # 本文档

.github/workflows/
└── update-sectors.yml  # GitHub Actions 工作流
```

## 使用方法

### 本地手动更新

```bash
# 1. 设置搜索 API Key（使用 Tavily API）
export SEARCH_API_KEY="your_api_key_here"

# 2. 运行更新脚本
cd sonata-1.3
uv run python scripts/update_sectors.py

# 3. 测试更新结果
uv run python scripts/test_update.py

# 4. 构建并部署
npm run build
npx wrangler pages deploy dist --project-name=sonata-stock
```

### 自动更新（GitHub Actions）

1. 在 GitHub 仓库中设置 Secrets：
   - `TAVILY_API_KEY`: Tavily 搜索 API 密钥
   - `CLOUDFLARE_API_TOKEN`: Cloudflare 部署令牌

2. GitHub Actions 会每 3 天自动执行：
   - 搜索最新热门板块
   - 更新 `SectorServiceStatic.ts`
   - 提交代码
   - 自动部署到 Cloudflare Pages

### 自动更新（本地 Cron）

```bash
# 编辑 crontab
crontab -e

# 添加以下行（每 3 天凌晨 3 点执行）
0 3 */3 * * cd /path/to/sonata-1.3 && uv run python scripts/update_sectors.py >> logs/cron_update.log 2>&1
```

## 搜索 API

默认使用 Tavily API（https://tavily.com/），也支持其他搜索 API：

- Tavily: AI 优化的搜索 API
- Bing Search API: 微软必应搜索
- SerpAPI: Google 搜索 API

修改 `update_sectors.py` 中的 `SEARCH_ENDPOINT` 和请求格式即可切换。

## 测试

```bash
# 运行测试脚本
uv run python scripts/test_update.py
```

测试内容包括：
- ✅ 板块数据完整性（6 大板块）
- ✅ 数据格式正确性
- ✅ 更新时间戳
- ✅ 部署是否成功
- ✅ 页面是否包含热门板块

## 日志

更新日志保存在 `logs/sector_update.log`，包含：
- 更新时间
- 搜索到的板块
- 测试结果
- 推荐股票

## 故障排除

### 搜索失败

检查 API Key 是否正确：
```bash
echo $SEARCH_API_KEY
```

### 部署失败

检查 Cloudflare 项目是否存在：
```bash
npx wrangler pages project list
```

### 测试失败

查看详细日志：
```bash
cat logs/sector_update.log
```

## 自定义板块

如果需要自定义板块列表，直接编辑 `src/services/SectorServiceStatic.ts`：

```typescript
const DEFAULT_HOT_SECTORS: HotSector[] = [
  {
    code: 'BK0428',
    name: '渔业',  // 修改板块名称
    changePercent: 3.25,
    // ... 其他字段
  },
  // ...
];
```

## 版本历史

- v1.0 (2026-03-19): 初始版本
  - 支持 Tavily API 搜索
  - 自动更新 6 大潜力板块
  - GitHub Actions 自动部署
  - 本地 Cron 支持
