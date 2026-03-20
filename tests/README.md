# Sonata API 测试框架

股票行情 API 自动化测试框架，基于 pytest 构建。

## 测试覆盖

### API 端点

| API | 端点 | 状态 |
|-----|------|------|
| 东方财富实时行情 | `/api/eastmoney/quote` | ✅ |
| 东方财富 K 线 | `/api/eastmoney/kline` | ✅ |
| 东方财富板块 | `/api/eastmoney/sector` | ✅ |
| 腾讯实时行情 | `/api/tencent/quote` | ✅ |
| 腾讯 K 线 | `/api/tencent/kline` | ✅ |
| 新浪实时行情 | `/api/sina/quote` | ✅ |

### 测试类型

- ✅ 正常情况测试
- ✅ 错误处理测试
- ✅ 超时测试
- ✅ 边界条件测试
- ✅ 并发测试
- ✅ 频率限制测试

## 快速开始

### 安装依赖

```bash
cd sonata-1.3
uv pip install pytest pytest-html pytest-json-report requests
```

### 运行测试

```bash
# 运行所有测试
uv run python -m pytest tests/ -v

# 运行特定测试文件
uv run python -m pytest tests/test_eastmoney.py -v

# 运行特定测试类
uv run python -m pytest tests/test_eastmoney.py::TestEastMoneyQuote -v

# 运行特定测试
uv run python -m pytest tests/test_eastmoney.py::TestEastMoneyQuote::test_quote_normal_sh -v

# 生成 HTML 报告
uv run python -m pytest tests/ --html=test_reports/report.html --self-contained-html

# 使用测试运行器脚本
uv run python tests/run_tests.py
```

### 配置

通过环境变量配置 API 地址：

```bash
# Windows PowerShell
$env:SONATA_API_BASE_URL="http://localhost:8787"

# Linux/Mac
export SONATA_API_BASE_URL="http://localhost:8787"
```

## 测试文件结构

```
tests/
├── __init__.py          # 包初始化
├── config.py            # 测试配置
├── test_client.py       # 测试客户端基类
├── conftest.py          # pytest 配置和 fixtures
├── run_tests.py         # 测试运行器
├── test_eastmoney.py    # 东方财富 API 测试
├── test_tencent.py      # 腾讯财经 API 测试
├── test_sina.py         # 新浪财经 API 测试
├── test_timeout.py      # 超时和压力测试
└── README.md            # 本文档
```

## 测试用例设计

### 正常情况测试
- 有效股票代码查询
- 不同市场股票 (A 股、港股、ETF)
- 不同参数组合

### 错误处理测试
- 无效股票代码
- 缺少必要参数
- 空参数值

### 超时测试
- 短超时 (1 秒)
- 正常超时 (10 秒)
- 长超时 (30 秒)

### 边界条件测试
- 指数行情
- 特殊字符处理
- 大数据量请求
- 分页边界

### 并发测试
- 多股票并发查询
- 多 API 类型同时请求
- 快速连续请求
- 突发请求

## 测试报告

测试完成后生成以下报告：

1. **HTML 报告** (`report_YYYYMMDD_HHMMSS.html`)
   - 可视化测试结果
   - 详细错误信息
   - 响应时间统计

2. **JSON 报告** (`report_YYYYMMDD_HHMMSS.json`)
   - 机器可读格式
   - 完整测试数据
   - 便于 CI/CD 集成

3. **文本摘要** (`report_YYYYMMDD_HHMMSS.txt`)
   - 快速查看测试结果
   - 通过率统计

## CI/CD 集成

示例 GitHub Actions 配置：

```yaml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install pytest pytest-html requests
      - run: pytest tests/ --html=report.html
      - uses: actions/upload-artifact@v3
        with:
          name: test-report
          path: report.html
```

## 常见问题

### Q: 测试失败怎么办？
A: 检查 API 服务是否运行，确认 `SONATA_API_BASE_URL` 配置正确。

### Q: 如何添加新测试？
A: 在对应测试文件中添加测试方法，遵循 `test_*` 命名规范。

### Q: 如何跳过某些测试？
A: 使用 `@pytest.mark.skip` 装饰器。

## 许可证

MIT License
