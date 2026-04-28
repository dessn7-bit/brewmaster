#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""V6 KNN retrain — 4A B+ tier-based + sour 3× boost.

Hedef: ~10K reçete, sour cluster %28-30.
Output:
  _v18_v6_subset.json (~10K reçete, V6 KNN için)
  _v18_v6_inline.js (compact JS array, HTML embed için)
"""
import json, sys, os, random, time
from collections import Counter, defaultdict

sys.stdout.reconfigure(line_buffering=True)
random.seed(42)
T0 = time.time()
def t(): return time.time() - T0

print(f'[1] Loading V18 dataset... ({t():.1f}s)', flush=True)
data = json.load(open('working/_v18_dataset.json', encoding='utf-8'))
recipes = data['recipes']
features = data['meta']['feature_list']
print(f'  {len(recipes)} recipes', flush=True)

SOUR_SLUGS = {'belgian_lambic', 'berliner_weisse', 'flanders_red_ale', 'oud_bruin',
              'belgian_fruit_lambic', 'belgian_gueuze', 'mixed_fermentation_sour_beer',
              'gose', 'brett_beer'}

def tier_of(n):
    if n >= 5000: return 1
    if n >= 1000: return 2
    if n >= 200:  return 3
    return 4

slug_counts = Counter(r['bjcp_slug'] for r in recipes)
slug_recipes = defaultdict(list)
for r in recipes:
    if r.get('bjcp_slug'):
        slug_recipes[r['bjcp_slug']].append(r)

# Tier B+ targets (Karar 4A onayı, sour %28-30 hedef)
# Non-sour küçültüldü, sour daha agresif boost
TARGET = {
    (1, False): 100,  (2, False):  80,  (3, False):  80,  (4, False): 9999,  # all
    (1, True):  500,  (2, True):  500,  (3, True):  500,  (4, True):  9999,
}

selected = []
slug_picked = Counter()
for slug, recs in slug_recipes.items():
    if slug_counts[slug] < 10:
        continue
    is_sour = slug in SOUR_SLUGS
    tier = tier_of(slug_counts[slug])
    target = TARGET[(tier, is_sour)]
    if target >= len(recs):
        chosen = recs
    else:
        chosen = random.sample(recs, target)
    selected.extend(chosen)
    slug_picked[slug] = len(chosen)

print(f'\n[2] Selection complete ({t():.1f}s)', flush=True)
print(f'  Total selected: {len(selected)}')
sour_count = sum(1 for r in selected if r['bjcp_slug'] in SOUR_SLUGS)
print(f'  Sour count: {sour_count}, ratio: {100*sour_count/len(selected):.1f}%')
print(f'  Slugs covered: {len(slug_picked)}')

# Tier breakdown
tier_breakdown = Counter()
for slug, n in slug_picked.items():
    tier_breakdown[tier_of(slug_counts[slug])] += n
print(f'  Tier breakdown: {dict(tier_breakdown)}')

# Top 20 slug picked
print(f'\nTop 20 slug picked:')
for slug, n in slug_picked.most_common(20):
    is_s = '🟣' if slug in SOUR_SLUGS else ' '
    print(f'  {is_s} {slug}: {n} (of {slug_counts[slug]})')

# 3. Save full subset (JSON, sanity)
out_subset = 'working/_v18_v6_subset.json'
print(f'\n[3] Save subset → {out_subset}', flush=True)
with open(out_subset, 'w', encoding='utf-8') as f:
    json.dump({'recipes': selected, 'meta': {'feature_list': features, 'count': len(selected),
        'strategy': '4A B+ tier-based + sour 3× boost', 'sour_ratio': sour_count/len(selected)}}, f, ensure_ascii=False)
sz = os.path.getsize(out_subset) / (1024 * 1024)
print(f'  {sz:.0f} MB ({t():.1f}s)', flush=True)

# 4. Build compact inline JS (HTML embed)
out_js = '_v18_v6_inline.js'
print(f'\n[4] Build inline JS → {out_js}', flush=True)
# Compact format: minimize feature payload — drop zero-importance features
# V18 critical features: top 30 by gain (yeast/hop/malt main, og/fg/abv/ibu/srm)
COMPACT_FEATURES = [
    'og', 'fg', 'abv', 'ibu', 'srm',
    'pct_pilsner', 'pct_pale_ale', 'pct_munich', 'pct_vienna', 'pct_wheat',
    'pct_oats', 'pct_rye', 'pct_crystal', 'pct_choc', 'pct_roast', 'pct_smoked',
    'pct_corn', 'pct_rice', 'pct_sugar', 'pct_aromatic_abbey',
    'yeast_belgian', 'yeast_abbey', 'yeast_saison', 'yeast_kveik', 'yeast_english',
    'yeast_american', 'yeast_german_lager', 'yeast_kolsch', 'yeast_witbier',
    'yeast_wheat_german', 'yeast_brett', 'yeast_lacto', 'yeast_sour_blend',
    'hop_american_c', 'hop_english', 'hop_german', 'hop_czech_saaz', 'hop_nz',
    'katki_fruit', 'katki_spice_herb', 'katki_chocolate', 'katki_coffee',
    'katki_smoke', 'katki_lactose',
    'dry_hop_days', 'has_brett', 'has_lacto', 'is_mixed_fermentation',
]
print(f'  Compact features: {len(COMPACT_FEATURES)}/{len(features)}', flush=True)

# Build minimal JSON array for inline
recs_compact = []
for r in selected:
    f = r.get('features', {})
    rec = {
        'sl': r['bjcp_slug'],  # slug
        'sr': r.get('source', '?'),  # source for debug
        'f': [round((f.get(fn) or 0), 3) for fn in COMPACT_FEATURES]
    }
    recs_compact.append(rec)

# JS file format
js_content = '// V6 KNN data — V18 (Adım 54), 4A B+ tier-based + sour 3× boost\n'
js_content += f'// Total: {len(recs_compact)} recipes, sour {sour_count} ({100*sour_count/len(selected):.1f}%)\n'
js_content += f'// Built: {time.strftime("%Y-%m-%d %H:%M:%S")}\n\n'
js_content += 'window.BM_V6_FKEYS = ' + json.dumps(COMPACT_FEATURES) + ';\n\n'
js_content += 'window.BM_V6_RECS = ' + json.dumps(recs_compact, ensure_ascii=False, separators=(',', ':')) + ';\n'

with open(out_js, 'w', encoding='utf-8') as f:
    f.write(js_content)
sz_js = os.path.getsize(out_js) / (1024 * 1024)
print(f'  Inline JS: {sz_js:.1f} MB ({t():.1f}s)', flush=True)

print(f'\n[DONE] {t():.0f}s', flush=True)
