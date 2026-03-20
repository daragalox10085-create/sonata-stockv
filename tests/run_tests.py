#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Sonata API 自动化测试运行器
生成测试报告
"""

import sys
import os
import json
import time
from datetime import datetime
from pathlib import Path

# 添加父目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from tests.config import BASE_URL, REPORT_CONFIG


def run_tests(output_dir: str = None, verbose: bool = True):
    """
    运行所有测试并生成报告
    
    Args:
        output_dir: 报告输出目录
        verbose: 是否显示详细输出
    
    Returns:
        dict: 测试结果摘要
    """
    if output_dir is None:
        output_dir = REPORT_CONFIG['output_dir']
    
    # 创建输出目录
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # 生成时间戳
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    # 配置 pytest 参数
    pytest_args = [
        'tests/',
        f'--json-report',
        f'--json-report-file={output_path}/report_{timestamp}.json',
        f'--html={output_path}/report_{timestamp}.html',
        '--self-contained-html',
    ]
    
    if verbose:
        pytest_args.append('-v')
    
    print("=" * 60)
    print("Sonata API 测试框架")
    print("=" * 60)
    print(f"API 基础 URL: {BASE_URL}")
    print(f"报告输出目录：{output_path}")
    print(f"测试开始时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # 运行测试
    start_time = time.time()
    exit_code = pytest.main(pytest_args)
    duration = time.time() - start_time
    
    # 生成摘要报告
    summary = generate_summary(output_path, timestamp, duration, exit_code)
    
    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)
    print(f"总耗时：{duration:.2f}秒")
    print(f"通过率：{summary['pass_rate']:.1f}%")
    print(f"详细报告：{output_path}/report_{timestamp}.html")
    print("=" * 60)
    
    return summary


def generate_summary(output_path: Path, timestamp: str, duration: float, exit_code: int) -> dict:
    """生成测试摘要"""
    summary = {
        'timestamp': timestamp,
        'duration_seconds': duration,
        'exit_code': exit_code,
        'base_url': BASE_URL,
        'status': 'passed' if exit_code == 0 else 'failed'
    }
    
    # 尝试读取 JSON 报告
    json_report_file = output_path / f'report_{timestamp}.json'
    if json_report_file.exists():
        with open(json_report_file, 'r', encoding='utf-8') as f:
            report_data = json.load(f)
            summary['tests'] = report_data.get('summary', {})
    
    # 保存摘要
    summary_file = output_path / f'summary_{timestamp}.json'
    with open(summary_file, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    
    # 生成文本报告
    text_report = generate_text_report(summary)
    text_file = output_path / f'report_{timestamp}.txt'
    with open(text_file, 'w', encoding='utf-8') as f:
        f.write(text_report)
    
    return summary


def generate_text_report(summary: dict) -> str:
    """生成文本格式测试报告"""
    lines = [
        "=" * 60,
        "Sonata API 测试报告",
        "=" * 60,
        "",
        f"测试时间：{summary['timestamp']}",
        f"API 地址：{summary['base_url']}",
        f"总耗时：{summary['duration_seconds']:.2f}秒",
        f"测试状态：{'✅ 通过' if summary['status'] == 'passed' else '❌ 失败'}",
        "",
        "-" * 60,
        "测试摘要",
        "-" * 60,
    ]
    
    if 'tests' in summary:
        tests = summary['tests']
        lines.extend([
            f"总测试数：{tests.get('total', 'N/A')}",
            f"通过：{tests.get('passed', 'N/A')}",
            f"失败：{tests.get('failed', 'N/A')}",
            f"跳过：{tests.get('skipped', 'N/A')}",
            f"错误：{tests.get('errors', 'N/A')}",
        ])
        
        if tests.get('total', 0) > 0:
            pass_rate = tests.get('passed', 0) / tests['total'] * 100
            lines.append(f"通过率：{pass_rate:.1f}%")
    
    lines.extend([
        "",
        "=" * 60,
        "报告结束",
        "=" * 60,
    ])
    
    return "\n".join(lines)


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Sonata API 测试运行器')
    parser.add_argument('--output', '-o', default=None, help='报告输出目录')
    parser.add_argument('--quiet', '-q', action='store_true', help='安静模式')
    parser.add_argument('--api-url', default=None, help='API 基础 URL')
    
    args = parser.parse_args()
    
    if args.api_url:
        os.environ['SONATA_API_BASE_URL'] = args.api_url
    
    run_tests(output_dir=args.output, verbose=not args.quiet)
