#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""V6 KNN retrain V19 dataset (KURAL 2 paralel)."""
import json, sys, os, random, time
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
random.seed(42)
T0 = time.time()
def t(): return time.time() - T0

print(f'[1] Loading V19... ({t():.1f}s)', flush=True)
data = json.load(open('working/_v19_dataset.json', encoding='utf-8'))
recipes = data['recipes']
features = data['meta']['feature_list']
print(f'  {len(recipes)} recipes, {len(features)} features', flush=True)

SOUR_SLUGS = {'belgian_lambic', 'berliner_weisse', 'flanders_red_ale', 'oud_bruin',
              'belgian_fruit_lambic', 'belgian_gueuze', 'mixed_fermentation_sour_beer',
              'gose', 'brett_beer'}

def tier_of(n):
    if n >= 5000: return 1
    if n >= 1000: return 2
    if n >= 200:  return 3
    return 4

slug_counts = Counter(r['bjcp_slug'] for r in recipes if r.get('bjcp_slug'))
slug_recipes = defaultdict(list)
for r in recipes:
    if r.get('bjcp_slug'):
        slug_recipes[r['bjcp_slug']].append(r)

TARGET = {
    (1, False): 100,  (2, False):  80,  (3, False):  80,  (4, False): 9999,
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
    chosen = recs if target >= len(recs) else random.sample(recs, target)
    selected.extend(chosen)
    slug_picked[slug] = len(chosen)

print(f'\n[2] Selection: {len(selected)} recipes', flush=True)
sour_count = sum(1 for r in selected if r['bjcp_slug'] in SOUR_SLUGS)
print(f'  Sour ratio: {100*sour_count/len(selected):.1f}%', flush=True)

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
    # V19 yeni
    'has_coriander', 'has_orange_peel', 'has_chamomile', 'has_salt',
    'has_dry_hop_heavy', 'has_whirlpool_heavy',
    'dry_hop_grams_per_liter', 'late_hop_pct',
]

recs_compact = []
for r in selected:
    f = r.get('features') or {}
    rec = {'sl': r['bjcp_slug'], 'sr': r.get('source', '?'),
           'f': [round((f.get(fn) or 0), 3) for fn in COMPACT_FEATURES]}
    recs_compact.append(rec)

with open('working/_v19_v6_subset.json', 'w', encoding='utf-8') as f:
    json.dump({'recipes': selected, 'meta': {'feature_list': features, 'count': len(selected),
        'sour_ratio': sour_count/len(selected)}}, f, ensure_ascii=False)

js = '// V6 KNN data — V19\n'
js += f'// Total: {len(recs_compact)}, sour {sour_count} ({100*sour_count/len(selected):.1f}%)\n'
js += f'// Features: {len(COMPACT_FEATURES)} (V19 = +8 new from rmwoods misc/hops merge)\n'
js += f'// Built: {time.strftime("%Y-%m-%d %H:%M:%S")}\n\n'
js += 'window.BM_V6_FKEYS = ' + json.dumps(COMPACT_FEATURES) + ';\n\n'
js += 'window.BM_V6_RECS = ' + json.dumps(recs_compact, ensure_ascii=False, separators=(',', ':')) + ';\n'
with open('_v19_v6_inline.js', 'w', encoding='utf-8') as f:
    f.write(js)
sz_js = os.path.getsize('_v19_v6_inline.js') / (1024*1024)
print(f'  Inline JS: {sz_js:.1f} MB', flush=True)
print(f'\n[DONE] {t():.0f}s', flush=True)
