"""Faz A2 ek — dedupe re-audit. _step53_b5'in dropped reçetelerini incele."""
import json
import re
from collections import Counter, defaultdict
import random

V16 = 'brewmaster_v16_dataset.json'
RM = 'working/_rmwoods_v15_format.json'
OUT = '_step56_dedupe_audit_data.json'


def norm_title(s):
    if not s:
        return ''
    s = re.sub(r'[^a-z0-9]+', ' ', str(s).lower()).strip()
    return re.sub(r'\s+', ' ', s)


def get_origin(r):
    """rmwoods sub-source extract."""
    raw = r.get('raw') or {}
    return raw.get('origin') or 'unknown'


print('[1] Loading V16...', flush=True)
v16 = json.load(open(V16, encoding='utf-8'))
v16_recs = v16.get('recipes', v16) if isinstance(v16, dict) else v16
print(f'  V16: {len(v16_recs)} recipes', flush=True)

print('[2] Loading rmwoods (684MB, ~30s)...', flush=True)
rm = json.load(open(RM, encoding='utf-8'))
rm_recs = rm['recipes']
print(f'  rmwoods: {len(rm_recs)} recipes', flush=True)


# Re-run dedupe with full tracking
print('[3] Re-running dedup with audit tracking...', flush=True)

# Map norm_title → list of (source, recipe) — track ALL recipes per title
title_to_recipes = defaultdict(list)

# V16 first
for r in v16_recs:
    nt = norm_title(r.get('name', ''))
    if nt:
        title_to_recipes[nt].append(('v16', r))

# rmwoods after
for r in rm_recs:
    nt = norm_title(r.get('name', ''))
    if nt:
        title_to_recipes[nt].append(('rmwoods', r))

# Categorize
print('[4] Categorizing duplicates...', flush=True)
total_titles = len(title_to_recipes)
single_count = 0
multi_groups = []
for nt, recipes in title_to_recipes.items():
    if len(recipes) == 1:
        single_count += 1
    else:
        multi_groups.append((nt, recipes))

print(f'  Unique titles: {total_titles}', flush=True)
print(f'  Single-recipe titles (no dup): {single_count}', flush=True)
print(f'  Multi-recipe groups (dup): {len(multi_groups)}', flush=True)

# Group size distribution
size_dist = Counter(len(g[1]) for g in multi_groups)
print(f'  Dup group size dist (top 10): {sorted(size_dist.items())[:15]}', flush=True)

# How many recipes dropped total
total_dropped = sum(len(g[1]) - 1 for g in multi_groups)
print(f'  Total recipes dropped: {total_dropped}', flush=True)

# Categorize duplicate groups by source pattern
cat_counts = Counter()
cross_v16_rm = 0
brewtoad_self = 0
brewersfriend_self = 0
brewtoad_brewersfriend = 0
empty_title_kept = sum(1 for r in rm_recs if not norm_title(r.get('name', '')))

dropped_samples = []
high_freq_titles = []  # titles with 50+ duplicates (suspicious)

for nt, recipes in multi_groups:
    has_v16 = any(s == 'v16' for s, _ in recipes)
    rm_subs = [get_origin(r) for s, r in recipes if s == 'rmwoods']
    rm_sub_set = set(rm_subs)

    if has_v16 and any(s == 'rmwoods' for s, _ in recipes):
        cross_v16_rm += 1
    if 'brewtoad' in rm_sub_set and len(rm_subs) > 1:
        brewtoad_self += 1 if rm_sub_set == {'brewtoad'} else 0
    if 'brewersfriend' in rm_sub_set and len(rm_subs) > 1:
        brewersfriend_self += 1 if rm_sub_set == {'brewersfriend'} else 0
    if 'brewtoad' in rm_sub_set and 'brewersfriend' in rm_sub_set:
        brewtoad_brewersfriend += 1

    if len(recipes) >= 50:
        high_freq_titles.append((nt, len(recipes)))

# Sample 30 dropped recipes from random duplicate groups (size 2-5)
random.seed(42)
small_dup_groups = [g for g in multi_groups if 2 <= len(g[1]) <= 5]
sample_groups = random.sample(small_dup_groups, min(15, len(small_dup_groups)))

for nt, recipes in sample_groups:
    # Show all recipes in the group with their key metrics
    items = []
    for src, r in recipes[:5]:
        raw = r.get('raw') or {}
        feat = r.get('features') or {}
        items.append({
            'src': src,
            'origin': get_origin(r) if src == 'rmwoods' else None,
            'id': r.get('id', '?'),
            'name': r.get('name', '')[:60],
            'slug': r.get('bjcp_slug'),
            'og': raw.get('og') or feat.get('og'),
            'fg': raw.get('fg') or feat.get('fg'),
            'ibu': raw.get('ibu') or feat.get('ibu'),
            'srm': raw.get('srm') or feat.get('srm'),
            'abv': raw.get('abv') or feat.get('abv'),
        })
    dropped_samples.append({'norm_title': nt, 'group_size': len(recipes), 'recipes': items})

# Sample 15 large-group dropped recipes (suspicious)
large_dup_groups = [g for g in multi_groups if len(g[1]) >= 10]
sample_large = random.sample(large_dup_groups, min(15, len(large_dup_groups)))
large_samples = []
for nt, recipes in sample_large:
    items = []
    for src, r in recipes[:6]:
        raw = r.get('raw') or {}
        feat = r.get('features') or {}
        items.append({
            'src': src,
            'origin': get_origin(r) if src == 'rmwoods' else None,
            'id': r.get('id', '?'),
            'name': r.get('name', '')[:60],
            'slug': r.get('bjcp_slug'),
            'og': raw.get('og') or feat.get('og'),
            'ibu': raw.get('ibu') or feat.get('ibu'),
            'srm': raw.get('srm') or feat.get('srm'),
        })
    large_samples.append({'norm_title': nt, 'group_size': len(recipes), 'recipes': items})

# OG/IBU divergence in duplicate groups (real vs claimed dup)
og_divergence_samples = []
for nt, recipes in random.sample(small_dup_groups, min(50, len(small_dup_groups))):
    ogs = []
    for src, r in recipes:
        raw = r.get('raw') or {}
        feat = r.get('features') or {}
        og = raw.get('og') or feat.get('og')
        if og:
            ogs.append(og)
    if len(ogs) >= 2:
        og_range = max(ogs) - min(ogs)
        if og_range > 0.010:  # 10 gravity points difference = different beer
            og_divergence_samples.append({
                'norm_title': nt,
                'og_range': round(og_range, 4),
                'ogs': ogs,
                'group_size': len(recipes),
            })

audit = {
    'totals': {
        'v16': len(v16_recs),
        'rmwoods': len(rm_recs),
        'rmwoods_empty_title': empty_title_kept,
        'unique_titles': total_titles,
        'single_titles': single_count,
        'multi_groups': len(multi_groups),
        'total_dropped': total_dropped,
    },
    'group_size_distribution': dict(sorted(size_dist.items())[:20]),
    'category_breakdown': {
        'cross_v16_rmwoods': cross_v16_rm,
        'brewtoad_only_dup': brewtoad_self,
        'brewersfriend_only_dup': brewersfriend_self,
        'brewtoad_brewersfriend_cross': brewtoad_brewersfriend,
    },
    'high_freq_titles_50plus': sorted(high_freq_titles, key=lambda x: -x[1])[:30],
    'small_dup_samples_15': dropped_samples,
    'large_dup_samples_15': large_samples,
    'og_divergence_samples': og_divergence_samples[:20],
}

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(audit, f, indent=2, ensure_ascii=False, default=str)
print(f'\nWrote {OUT}', flush=True)

print(f'\n=== Audit summary ===')
print(f'Cross V16-rmwoods dup groups: {cross_v16_rm}')
print(f'Brewtoad-self only: {brewtoad_self}')
print(f'Brewersfriend-self only: {brewersfriend_self}')
print(f'Brewtoad+Brewersfriend cross: {brewtoad_brewersfriend}')
print(f'Empty-title rmwoods kept: {empty_title_kept}')
print(f'\nTop 10 high-freq titles (≥50 dups):')
for nt, cnt in sorted(high_freq_titles, key=lambda x: -x[1])[:10]:
    print(f'  {cnt:>5d}× "{nt[:60]}"')
print(f'\nOG divergence (Δ>0.010) samples: {len(og_divergence_samples)} of 50 sampled')
