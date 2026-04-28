#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Adım 53 Faz B-7 — V16 vs V17 karşılaştırma.

Input:
  _v16_metrics.json (V16 baseline)
  _v17_metrics.json (V17 yeni)

Output:
  _step53_v16_v17_compare.md (Markdown report)
"""
import json
import sys

sys.stdout.reconfigure(line_buffering=True)


def fmt_pct(v):
    if v is None: return 'N/A'
    return f'{100*v:.1f}%'


def fmt_diff(a, b):
    if a is None or b is None: return ''
    d = (b - a) * 100
    sign = '+' if d >= 0 else ''
    color = '🟢' if d > 1 else ('🔴' if d < -1 else '⚪')
    return f' ({color} {sign}{d:.1f}pp)'


v16 = json.load(open('_v16_metrics.json', encoding='utf-8'))
v17 = json.load(open('_v17_metrics.json', encoding='utf-8'))

lines = []
def line(s=''): lines.append(s); print(s, flush=True)

line('# V16 vs V17 karşılaştırma')
line()
line(f'- **V16**: {v16["dataset_recipes"]} reçete')
line(f'- **V17**: {v17["dataset_recipes"]} reçete  (×{v17["dataset_recipes"]/v16["dataset_recipes"]:.1f})')
line()

line('## 14-Category model')
line()
line('| Metric | V16 | V17 | Δ |')
line('|---|---|---|---|')
for k, lbl in [('test_top1', 'top-1'), ('test_top3', 'top-3'), ('test_top5', 'top-5')]:
    a = v16['14cat'].get(k); b = v17['14cat'].get(k)
    line(f'| {lbl} | {fmt_pct(a)} | {fmt_pct(b)}{fmt_diff(a, b)} |  |')
line()

# Per-cluster (V17 has more clusters than V16, match by name)
line('## Cluster (per-class top-1)')
line()
line('| Cluster | V16 n | V16 top-1 | V17 n | V17 top-1 | Δ |')
line('|---|---|---|---|---|---|')
v16_pc = {p['main_cat']: p for p in v16['14cat']['per_class']}
v17_pc = {p['main_cat']: p for p in v17['14cat']['per_class']}
all_clusters = sorted(set(v16_pc) | set(v17_pc), key=lambda c: -(v17_pc.get(c, {}).get('n', 0)))
for c in all_clusters:
    p16 = v16_pc.get(c, {})
    p17 = v17_pc.get(c, {})
    a = p16.get('acc'); b = p17.get('acc')
    line(f'| {c} | {p16.get("n", "—")} | {fmt_pct(a) if a is not None else "—"} | {p17.get("n", "—")} | {fmt_pct(b) if b is not None else "—"}{fmt_diff(a, b)} |')
line()

# Slug
line('## Slug model')
line()
line('| Metric | V16 | V17 | Δ |')
line('|---|---|---|---|')
for k, lbl in [('test_top1', 'top-1'), ('test_top3', 'top-3'), ('test_top5', 'top-5')]:
    a = v16['slug'].get(k); b = v17['slug'].get(k)
    line(f'| {lbl} | {fmt_pct(a)} | {fmt_pct(b)}{fmt_diff(a, b)} |  |')
line()

# Spotlight slug
line('## Spotlight slug (per-class top-1)')
line()
line('| Slug | V16 n / top-1 / top-3 | V17 n / top-1 / top-3 | Δ top-1 |')
line('|---|---|---|---|')
spotlight = list(v17['slug'].get('spotlight', {}).keys())
for sl in spotlight:
    v16s = v16['slug'].get('spotlight', {}).get(sl)
    v17s = v17['slug'].get('spotlight', {}).get(sl)
    if v16s is None and v17s is None:
        continue
    a = v16s.get('top1') if v16s else None
    b = v17s.get('top1') if v17s else None
    v16_str = (f'{v16s["n"]} / {fmt_pct(v16s["top1"])} / {fmt_pct(v16s["top3"])}'
               if v16s else '—')
    v17_str = (f'{v17s["n"]} / {fmt_pct(v17s["top1"])} / {fmt_pct(v17s["top3"])}'
               if v17s else '—')
    line(f'| {sl} | {v16_str} | {v17_str} | {fmt_diff(a, b)} |')
line()

line('## Sources')
line()
line(f'- V16: {v16.get("sources")}')
line(f'- V17: {v17.get("sources")}')

with open('_step53_v16_v17_compare.md', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
print('\n→ _step53_v16_v17_compare.md', flush=True)
