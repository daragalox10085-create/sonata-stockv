# Sonata 板块数据更新指南

## 更新方式

### 方式一：自动更新（定时任务）

系统已配置自动更新任务：
- **时间**: 每周二 11:00
- **方式**: 自动尝试获取最新板块数据
- **状态**: 可在 SectorUpdatePanel 组件中查看

### 方式二：手动更新（推荐）

#### 方法1：使用批处理脚本（最简单）

1. 双击运行 `scripts/update_sectors.bat`
2. 等待脚本执行完成
3. 刷新网页查看更新后的数据

#### 方法2：使用Python脚本

```bash
# 进入项目目录
cd sonata-1.3

# 执行更新脚本
python scripts/update_sectors.py

# 或者使用定时任务模式
python scripts/update_sectors.py --scheduled
```

#### 方法3：在网页中手动更新

1. 打开 Sonata 网页
2. 进入"板块数据更新"页面（如果有）
3. 点击"立即手动更新"按钮

## 数据文件位置

更新后的板块数据保存在：
```
public/sector_data.json
```

## 数据格式

```json
{
  "sectors": [
    {
      "code": "BK1260",
      "name": "渔业",
      "score": 86,
      "rank": 1,
      "changePercent": 3.8,
      "trend": "强势热点",
      "topStocks": [
        {"code": "000798", "name": "中水渔业", "changePercent": 7.2}
      ]
    }
  ],
  "timestamp": "2026-03-16T11:00:00",
  "source": "manual-update"
}
```

## 注意事项

1. **网络限制**: 由于东方财富API有反爬机制，自动更新可能无法获取真实数据
2. **手动更新**: 建议定期手动执行更新脚本
3. **数据备份**: 更新前建议备份 `public/sector_data.json` 文件
4. **更新频率**: 建议每周更新一次，或在市场重大变化时更新

## 获取真实数据的替代方案

### 方案1：使用代理/VPN
配置代理服务器绕过反爬限制

### 方案2：使用付费数据服务
- Wind、Choice等专业金融数据服务
- 需要购买API授权

### 方案3：手动从网站导出
1. 访问东方财富网站
2. 查看板块涨幅排行
3. 手动编辑 `public/sector_data.json` 文件

## 故障排查

### 更新后数据未显示
1. 检查 `public/sector_data.json` 文件是否存在
2. 检查文件格式是否正确
3. 刷新网页或重启服务器

### 更新脚本执行失败
1. 检查Python是否安装
2. 检查是否有写入权限
3. 查看错误日志

---
_文档更新时间: 2026-03-16_
