#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Adım 53 Faz B-5 — V16 + rmwoods → V17 dataset (title dedup).

Strategy:
- Normalized title (lower + alnum + collapse): N(t)
- V16 öncelik (curated, smaller). rmwoods kendi içinde ilk gelene öncelik.
- Aynı N(t) varsa SKIP (V16 zaten varsa rmwoods atılır)
- 0/uzunluk title rmwoods kayıtları için title ile dedup mümkün değil → her biri unique sayılır

Output: _v17_dataset.json (V16 schema)
"""
import json
import re
import sys
import os
import time
from collections import Counter

sys.stdout.reconfigure(line_buffering=True)

ROOT = 'C:/Users/Kaan/brewmaster'
WORKING = f'{ROOT}/working'

T0 = time.time()
def t(): return time.time() - T0


def norm_title(s):
    if not s: return ''
    s = re.sub(r'[^a-z0-9]+', ' ', str(s).lower()).strip()
    return re.sub(r'\s+', ' ', s)


# ── V16 yükle ──
print(f'[1] Loading V16 ({t():.1f}s)...', flush=True)
v16 = json.load(open(f'{ROOT}/brewmaster_v16_dataset.json', encoding='utf-8'))
v16_recipes = v16.get('recipes', v16) if isinstance(v16, dict) else v16
print(f'  V16: {len(v16_recipes)} recipes ({t():.1f}s)', flush=True)

# ── rmwoods yükle ──
print(f'[2] Loading rmwoods V15 format ({t():.1f}s)...', flush=True)
rm = json.load(open(f'{WORKING}/_rmwoods_v15_format.json', encoding='utf-8'))
rm_recipes = rm['recipes']
feature_list = rm['meta']['feature_list']
print(f'  rmwoods: {len(rm_recipes)} recipes ({t():.1f}s)', flush=True)

# ── Dedup ──
print(f'\n[3] Dedup (title-based)... ({t():.1f}s)', flush=True)
seen = set()
v17 = []
src_counter = Counter()
slug_counter = Counter()
no_title_kept = 0

for r in v16_recipes:
    name = r.get('name') or ''
    nt = norm_title(name)
    if nt and nt in seen:
        continue
    if nt:
        seen.add(nt)
    v17.append(r)
    src_counter[r.get('source', 'v16')] += 1
    slug_counter[r.get('bjcp_slug')] += 1

print(f'  After V16: {len(v17)} ({t():.1f}s)', flush=True)

dup_rm = 0
for r in rm_recipes:
    name = r.get('name') or ''
    nt = norm_title(name)
    if nt and nt in seen:
        dup_rm += 1
        continue
    if nt:
        seen.add(nt)
    else:
        no_title_kept += 1
    v17.append(r)
    src_counter[r.get('source', 'rmwoods')] += 1
    slug_counter[r.get('bjcp_slug')] += 1

print(f'  rmwoods duplicate: {dup_rm} ({t():.1f}s)', flush=True)
print(f'  rmwoods no-title kept: {no_title_kept}', flush=True)
print(f'  Final V17: {len(v17)} recipes ({t():.1f}s)', flush=True)

# ── Stats ──
print(f'\n[4] Source distribution:', flush=True)
for k, v in sorted(src_counter.items(), key=lambda x: -x[1]):
    print(f'  {k:20s} {v:>7d} ({100*v/len(v17):.1f}%)', flush=True)

print(f'\n[5] Top 20 slug distribution:', flush=True)
for s, c in slug_counter.most_common(20):
    print(f'  {s:40s} {c:>7d} ({100*c/len(v17):.2f}%)', flush=True)

# Cluster (14-cat) — basit aile mapping
SLUG_TO_CLUSTER = {
    # Sour
    'belgian_lambic': 'sour', 'oud_bruin': 'sour', 'berliner_weisse': 'sour',
    'mixed_fermentation_sour_beer': 'sour', 'brett_beer': 'sour',
    # Specialty
    'fruit_beer': 'specialty', 'herb_and_spice_beer': 'specialty',
    'winter_seasonal_beer': 'specialty', 'smoked_beer': 'specialty',
    'specialty_beer': 'specialty', 'experimental_beer': 'specialty',
    # IPA
    'american_india_pale_ale': 'ipa', 'double_ipa': 'ipa', 'black_ipa': 'ipa',
    'juicy_or_hazy_india_pale_ale': 'ipa', 'british_india_pale_ale': 'ipa',
    # Stout
    'irish_dry_stout': 'stout', 'sweet_stout': 'stout', 'sweet_stout_or_cream_stout': 'stout',
    'oatmeal_stout': 'stout', 'stout': 'stout', 'american_imperial_stout': 'stout',
    # Porter
    'brown_porter': 'porter', 'robust_porter': 'porter', 'baltic_porter': 'porter', 'porter': 'porter',
    # Pale Ale
    'american_pale_ale': 'pale_ale', 'english_pale_ale': 'pale_ale', 'american_amber_red_ale': 'pale_ale',
    'american_strong_pale_ale': 'pale_ale',
    # Belgian
    'belgian_witbier': 'belgian', 'belgian_blonde_ale': 'belgian', 'belgian_dubbel': 'belgian',
    'belgian_tripel': 'belgian', 'belgian_strong_dark_ale': 'belgian', 'belgian_strong_golden': 'belgian',
    'belgian_quadrupel': 'belgian',
    # Saison
    'french_belgian_saison': 'saison', 'specialty_saison': 'saison', 'french_biere_de_garde': 'saison',
    # Wheat
    'south_german_hefeweizen': 'wheat', 'south_german_dunkel_weizen': 'wheat',
    'south_german_weizenbock': 'wheat', 'american_wheat_ale': 'wheat', 'german_rye_ale': 'wheat',
    # Lager
    'american_lager': 'lager', 'german_pilsener': 'lager', 'pale_lager': 'lager',
    'pre_prohibition_lager': 'lager', 'munich_helles': 'lager', 'munich_dunkel': 'lager',
    'vienna_lager': 'lager', 'german_maerzen': 'lager', 'german_oktoberfest_festbier': 'lager',
    'german_schwarzbier': 'lager', 'dortmunder_european_export': 'lager', 'kellerbier': 'lager',
    'bamberg_maerzen_rauchbier': 'lager',
    # Bock
    'german_bock': 'bock', 'german_doppelbock': 'bock', 'german_heller_bock_maibock': 'bock',
    'dunkles_bock': 'bock',
    # Ale (other)
    'american_brown_ale': 'ale', 'brown_ale': 'ale', 'american_cream_ale': 'ale',
    'cream_ale': 'ale', 'common_beer': 'ale', 'german_koelsch': 'ale', 'german_altbier': 'ale',
    'mild': 'ale', 'irish_red_ale': 'ale', 'blonde_ale': 'ale', 'golden_or_blonde_ale': 'ale',
    'ordinary_bitter': 'bitter', 'special_bitter_or_best_bitter': 'bitter', 'extra_special_bitter': 'bitter',
    'scottish_export': 'ale', 'scotch_ale_or_wee_heavy': 'ale', 'old_ale': 'ale',
    'american_barley_wine_ale': 'barleywine', 'american_barleywine': 'barleywine', 'british_barley_wine_ale': 'barleywine',
}

print(f'\n[6] Cluster distribution (14-cat-ish):', flush=True)
cluster_counter = Counter()
for r in v17:
    c = SLUG_TO_CLUSTER.get(r.get('bjcp_slug'), 'other')
    cluster_counter[c] += 1
for c, n in cluster_counter.most_common():
    print(f'  {c:15s} {n:>7d} ({100*n/len(v17):.1f}%)', flush=True)

# ── Save ──
out_path = f'{WORKING}/_v17_dataset.json'
print(f'\n[7] Writing {out_path}... ({t():.1f}s)', flush=True)
out = {
    'recipes': v17,
    'meta': {
        'feature_list': feature_list,
        'count': len(v17),
        'sources': dict(src_counter),
        'version': 'V17',
    }
}
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False)
size_mb = os.path.getsize(out_path) / (1024 * 1024)
print(f'  Saved {len(v17)} recipes, {size_mb:.0f} MB ({t():.1f}s)', flush=True)
print(f'\n[DONE] Total {t():.0f}s', flush=True)
