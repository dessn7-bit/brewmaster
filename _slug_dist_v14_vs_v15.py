#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""V14 vs V15 slug coverage delta raporu (Faz D)."""

import json
from collections import Counter

with open('v14_pre_cleaning_backup.json', 'r', encoding='utf-8') as f:
    v14 = json.load(f)
with open('brewmaster_v15_cleaned.json', 'r', encoding='utf-8') as f:
    v15 = json.load(f)
with open('STYLE_DEFINITIONS.json', 'r', encoding='utf-8') as f:
    sd = json.load(f)

valid = set(sd.keys())
v14_dist = Counter((r.get('bjcp_slug') or '<NULL>') for r in v14['recipes'])
v15_dist = Counter((r.get('bjcp_slug') or '<NULL>') for r in v15['recipes'])

# Active production cluster: >=5 ve >=10
v14_active5 = sum(1 for s, c in v14_dist.items() if c >= 5 and s != '<NULL>')
v14_active10 = sum(1 for s, c in v14_dist.items() if c >= 10 and s != '<NULL>')
v15_active5 = sum(1 for s, c in v15_dist.items() if c >= 5 and s != '<NULL>')
v15_active10 = sum(1 for s, c in v15_dist.items() if c >= 10 and s != '<NULL>')

v14_canon = sum(c for s, c in v14_dist.items() if s in valid)
v15_canon = sum(c for s, c in v15_dist.items() if s in valid)

# Top 30 by absolute change
all_slugs = set(v14_dist) | set(v15_dist)
delta = []
for s in all_slugs:
    a = v14_dist.get(s, 0)
    b = v15_dist.get(s, 0)
    if a != b:
        delta.append((s, a, b, b - a))

delta_sorted = sorted(delta, key=lambda x: -abs(x[3]))

report = {
    'totals': {
        'v14': sum(v14_dist.values()),
        'v15': sum(v15_dist.values()),
        'dropped': sum(v14_dist.values()) - sum(v15_dist.values()),
    },
    'unique_slugs': {
        'v14': len(v14_dist),
        'v15': len(v15_dist),
    },
    'production_ready_clusters': {
        'v14_at_least_5': v14_active5,
        'v15_at_least_5': v15_active5,
        'v14_at_least_10': v14_active10,
        'v15_at_least_10': v15_active10,
    },
    'canonical_coverage': {
        'v14_canonical_recipes': v14_canon,
        'v14_canonical_pct': round(100 * v14_canon / sum(v14_dist.values()), 1),
        'v15_canonical_recipes': v15_canon,
        'v15_canonical_pct': round(100 * v15_canon / sum(v15_dist.values()), 1),
    },
    'top_30_changes': [
        {'slug': s, 'v14': a, 'v15': b, 'delta': d}
        for s, a, b, d in delta_sorted[:30]
    ],
    'new_slugs_in_v15': sorted([s for s in v15_dist if s not in v14_dist]),
    'gone_slugs_in_v15': sorted([s for s in v14_dist if s not in v15_dist]),
    'remaining_invalid_top10': sorted(
        [(s, c) for s, c in v15_dist.items() if s != '<NULL>' and s not in valid],
        key=lambda x: -x[1]
    )[:10],
}

with open('_slug_dist_v14_vs_v15.json', 'w', encoding='utf-8') as f:
    json.dump(report, f, ensure_ascii=False, indent=2)

print('=' * 60)
print('SLUG DISTRIBUTION: V14 vs V15')
print('=' * 60)
print(f'Total recipes: V14 {report["totals"]["v14"]} -> V15 {report["totals"]["v15"]} (dropped {report["totals"]["dropped"]})')
print(f'Unique slugs:  V14 {report["unique_slugs"]["v14"]} -> V15 {report["unique_slugs"]["v15"]}')
print(f'Active cluster (>=5):  V14 {v14_active5} -> V15 {v15_active5}')
print(f'Active cluster (>=10): V14 {v14_active10} -> V15 {v15_active10}')
print(f'Canonical coverage: V14 {v14_canon} ({report["canonical_coverage"]["v14_canonical_pct"]}%) -> V15 {v15_canon} ({report["canonical_coverage"]["v15_canonical_pct"]}%)')
print()
print(f'New slugs in V15: {len(report["new_slugs_in_v15"])} -> {report["new_slugs_in_v15"]}')
print(f'Gone slugs in V15: {len(report["gone_slugs_in_v15"])}')
print()
print('Top 25 absolute changes:')
for s, a, b, d in delta_sorted[:25]:
    sign = '+' if d > 0 else ''
    print(f'  {s:40s} V14={a:5d} V15={b:5d} {sign}{d}')
