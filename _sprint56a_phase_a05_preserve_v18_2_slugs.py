"""Sprint 56a Faz A0.5 — V18.2 slug taxonomy'sini V18.3 pre-dataset'e taşı.

V18.2'de alias merge + Trappist taşıma + 9 yeni slug uygulanmıştı (recipe.bjcp_slug değişti).
V18.3 pre-dataset hibrit dedupe sonrası ama orijinal slug taxonomy'de (V16 + rmwoods raw mapping).
Bu script V18.2'nin slug değişikliklerini V18.3 pre-dataset'e re-apply eder.

Yöntem:
1. V18.2 dataset'inden recipe.id → recipe.bjcp_slug map çıkar
2. V18.3 pre-dataset'teki her reçete için:
   - V18.2 map'te varsa → slug = V18.2'deki (alias merge / Trappist / 9 yeni slug efekti)
   - V18.2'de yoksa (dedupe recovery'den gelen yeni reçete) → orijinal slug korunur

Output: working/_v18_3_predataset_v2.json (V18.2 slug taxonomy uygulanmış)
"""
import json
import sys
import time
from collections import Counter

sys.stdout.reconfigure(line_buffering=True)
T0 = time.time()
def t(): return f'{time.time() - T0:.1f}s'


print(f'[1] Loading V18.2 dataset (602 MB)... {t()}', flush=True)
with open('working/_v18_2_dataset.json', 'r', encoding='utf-8') as f:
    v182 = json.load(f)
v182_recs = v182['recipes']
print(f'  V18.2: {len(v182_recs)} recipes  {t()}', flush=True)

# Build id → slug map
print(f'[2] Building id→slug map from V18.2... {t()}', flush=True)
id_to_slug = {}
v182_slug_count = Counter()
for r in v182_recs:
    rid = r.get('id')
    slug = r.get('bjcp_slug')
    if rid and slug:
        id_to_slug[rid] = slug
        v182_slug_count[slug] += 1
print(f'  Mapped {len(id_to_slug)} recipes  {t()}', flush=True)
del v182, v182_recs  # free memory

# Load V18.3 pre-dataset
print(f'[3] Loading V18.3 pre-dataset (667 MB)... {t()}', flush=True)
with open('working/_v18_3_predataset.json', 'r', encoding='utf-8') as f:
    v183 = json.load(f)
v183_recs = v183['recipes']
print(f'  V18.3 pre: {len(v183_recs)} recipes  {t()}', flush=True)

# Apply V18.2 slug taxonomy
print(f'[4] Applying V18.2 slug taxonomy... {t()}', flush=True)
preserved = 0
new_recipes = 0
slug_changed = 0
slug_unchanged = 0
new_slug_count = Counter()
for r in v183_recs:
    rid = r.get('id')
    orig_slug = r.get('bjcp_slug')
    if rid in id_to_slug:
        new_slug = id_to_slug[rid]
        if new_slug != orig_slug:
            slug_changed += 1
        else:
            slug_unchanged += 1
        r['bjcp_slug'] = new_slug
        preserved += 1
    else:
        # New recipe (dedupe recovery), keep original slug
        new_recipes += 1
    new_slug_count[r.get('bjcp_slug')] += 1

print(f'  Preserved (V18.2 ID match): {preserved}', flush=True)
print(f'    Slug changed: {slug_changed}, unchanged: {slug_unchanged}', flush=True)
print(f'  New recipes (dedupe recovery): {new_recipes}  {t()}', flush=True)


# Per-slug comparison V18.2 → V18.3
WEAK_SLUGS = [
    'belgian_ipa', 'rye_ipa', 'white_ipa', 'red_ipa',
    'gose', 'belgian_gueuze', 'belgian_quadrupel',
    'brett_beer', 'mixed_fermentation_sour_beer',
    'dunkles_bock', 'kellerbier', 'german_oktoberfest_festbier',
    'english_pale_ale', 'golden_or_blonde_ale',
    'juicy_or_hazy_india_pale_ale', 'flanders_red_ale',
    'belgian_fruit_lambic', 'belgian_lambic', 'export_stout',
    'oud_bruin', 'experimental_beer', 'specialty_saison',
]
print(f'\n[5] Per-slug comparison (V18.2 → V18.3 with V18.2 taxonomy):', flush=True)
print(f'  {"slug":<40} {"V18.2":>7} {"V18.3":>7} {"Δ":>7}', flush=True)
for s in WEAK_SLUGS:
    v2 = v182_slug_count.get(s, 0)
    v3 = new_slug_count.get(s, 0)
    delta = v3 - v2
    sign = '+' if delta >= 0 else ''
    print(f'  {s:<40} {v2:>7d} {v3:>7d} {sign}{delta:>6d}', flush=True)


# Save V18.3 pre-dataset v2
print(f'\n[6] Writing _v18_3_predataset_v2.json... {t()}', flush=True)
v183['meta']['version'] = 'V18.3-predataset-v2'
v183['meta']['v18_2_taxonomy_applied'] = True
v183['meta']['preserved_from_v18_2'] = preserved
v183['meta']['new_from_recovery'] = new_recipes
v183['meta']['slug_changed_from_orig'] = slug_changed
with open('working/_v18_3_predataset_v2.json', 'w', encoding='utf-8') as f:
    json.dump(v183, f, ensure_ascii=False)
import os
sz = os.path.getsize('working/_v18_3_predataset_v2.json') / (1024*1024)
print(f'  Saved {len(v183_recs)} recipes, {sz:.0f} MB  {t()}', flush=True)


# Audit summary
audit = {
    'totals': {
        'v18_2_recipes': len(id_to_slug),
        'v18_3_predataset': len(v183_recs),
        'preserved_from_v18_2': preserved,
        'new_from_recovery': new_recipes,
        'slug_changed_from_orig': slug_changed,
    },
    'per_slug_comparison': {
        s: {'v18_2': v182_slug_count.get(s, 0), 'v18_3': new_slug_count.get(s, 0),
            'delta': new_slug_count.get(s, 0) - v182_slug_count.get(s, 0)}
        for s in WEAK_SLUGS
    },
    'top_30_slugs_v18_3': dict(new_slug_count.most_common(30)),
}
with open('_sprint56a_a05_taxonomy_audit.json', 'w', encoding='utf-8') as f:
    json.dump(audit, f, indent=2, ensure_ascii=False)
print(f'\n[7] Wrote _sprint56a_a05_taxonomy_audit.json', flush=True)
print(f'\n[DONE] Total {t()}', flush=True)
