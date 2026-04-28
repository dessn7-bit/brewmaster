#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""V16 dataset merge — V15 cleaned (8416) + AHA accepted (1136) = V16 (9552).

V15 train/test split korunacak (V15 reçeteleri için).
AHA reçeteleri stratified split (80% train, 20% test, V15 ile aynı seed).
"""
import json
import random
from collections import Counter

random.seed(42)

# Load V15
with open('brewmaster_v15_cleaned.json', 'r', encoding='utf-8') as f:
    v15 = json.load(f)
v15_recipes = v15['recipes']
print(f'V15 recipes: {len(v15_recipes)}')

# Load AHA accepted
with open('_aha_recipes_final.json', 'r', encoding='utf-8') as f:
    aha_accepted = json.load(f)
print(f'AHA accepted: {len(aha_accepted)}')

# Add bjcp_main_category to AHA recipes (from slug, V15 dataset reference)
slug_to_main = {}
for r in v15_recipes:
    slug = r.get('bjcp_slug')
    main = r.get('bjcp_main_category')
    if slug and main:
        slug_to_main.setdefault(slug, Counter())[main] += 1
# Take dominant
slug_to_main = {s: cnts.most_common(1)[0][0] for s, cnts in slug_to_main.items()}
print(f'V15 slug → main_cat mapping: {len(slug_to_main)} entries')

# Stratified split for AHA (per slug, 80/20)
aha_by_slug = {}
for r in aha_accepted:
    slug = r.get('bjcp_slug')
    aha_by_slug.setdefault(slug, []).append(r)

print('\n=== AHA split per slug ===')
aha_with_split = []
n_train = 0
n_test = 0
for slug, recs in aha_by_slug.items():
    random.shuffle(recs)
    test_count = max(1, int(len(recs) * 0.2)) if len(recs) >= 5 else 0
    for i, r in enumerate(recs):
        if i < test_count:
            r['in_split'] = 'test'
            n_test += 1
        else:
            r['in_split'] = 'train'
            n_train += 1
        # Set main_category from slug map (or fallback to AHA style metadata)
        if slug in slug_to_main:
            r['bjcp_main_category'] = slug_to_main[slug]
        else:
            r['bjcp_main_category'] = 'Specialty / Adjunct'  # fallback
        aha_with_split.append(r)

print(f'AHA train: {n_train}, test: {n_test}')

# V16 = V15 + AHA
v16_recipes = list(v15_recipes) + aha_with_split

# Update meta
v16_meta = dict(v15['meta'])
v16_meta['generated'] = '2026-04-28T19:00:00Z'
v16_meta['parent'] = 'brewmaster_v15_cleaned.json + _aha_recipes_final.json'
v16_meta['total_recipes'] = len(v16_recipes)
v16_meta['train_n'] = sum(1 for r in v16_recipes if r.get('in_split') == 'train')
v16_meta['test_n'] = sum(1 for r in v16_recipes if r.get('in_split') == 'test')
sources = Counter(r.get('source', '?') for r in v16_recipes)
v16_meta['sources'] = dict(sources)
v16_meta['v16_aha_added'] = len(aha_with_split)
v16_meta['v16_aha_train'] = n_train
v16_meta['v16_aha_test'] = n_test

print(f'\n=== V16 final ===')
print(f'Total: {len(v16_recipes)} (V15: {len(v15_recipes)} + AHA: {len(aha_with_split)})')
print(f'Train: {v16_meta["train_n"]}')
print(f'Test:  {v16_meta["test_n"]}')
print(f'Sources: {dict(sources)}')

# Slug dist before/after
v15_slug = Counter(r.get('bjcp_slug') for r in v15_recipes)
v16_slug = Counter(r.get('bjcp_slug') for r in v16_recipes)

# Brett/Sour family change
sour_family = ['brett_beer', 'mixed_fermentation_sour_beer', 'belgian_lambic',
               'belgian_gueuze', 'oud_bruin', 'berliner_weisse']
print(f'\n=== Brett/Sour family — V15 → V16 ===')
for s in sour_family:
    print(f'  {s:35s} {v15_slug.get(s, 0):4d} → {v16_slug.get(s, 0):4d}  (+{v16_slug.get(s,0) - v15_slug.get(s,0)})')

# Top 10 changed
print(f'\n=== Top 15 slug increase ===')
deltas = sorted([(s, v16_slug.get(s, 0) - v15_slug.get(s, 0)) for s in v16_slug.keys()],
                key=lambda x: -x[1])
for s, d in deltas[:15]:
    print(f'  {s:35s} +{d}  (V15={v15_slug.get(s,0)} → V16={v16_slug[s]})')

# Save
out = {'meta': v16_meta, 'recipes': v16_recipes}
with open('brewmaster_v16_dataset.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
print(f'\n✓ V16 dataset → brewmaster_v16_dataset.json ({len(v16_recipes)} recipes)')
