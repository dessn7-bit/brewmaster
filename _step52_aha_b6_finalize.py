#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""B-6 finalize — 4 outlier'ı accepted'e ekle, 13'ü drop.

Kaan kararı (A onaylandı):
KABUL: #4 Rose's RIS, #5 Bellanio Wee Heavy, #6 The King of Eisbocks!, #17 Dogfish 120 IPA
REJECT: 13 diğer
"""
import json
import re

with open('_aha_accepted_for_merge.json', 'r', encoding='utf-8') as f:
    accepted = json.load(f)
with open('_aha_b6_edge_cases.json', 'r', encoding='utf-8') as f:
    edges = json.load(f)
with open('_aha_recipes_v15_format.json', 'r', encoding='utf-8') as f:
    all_aha = json.load(f)

print(f'Currently accepted: {len(accepted)}')
print(f'Edge cases:        {len(edges)}')

# Outliers to KABUL (Kaan A onayı)
KABUL_NAMES = {
    "Rose's Russian Imperial Stout",
    "Rose’s Russian Imperial Stout",  # smart quote variant
    "Bellanio Farms",
    "The King of Eisbocks!",
    "Dogfish Head 120 Minute IPA",
}

# Build name → recipe lookup from full AHA dataset
name_to_rec = {r.get('name'): r for r in all_aha}

added = []
for ec in edges:
    name = ec.get('recipe_name', '')
    if name in KABUL_NAMES:
        rec_id = ec.get('recipe_id')
        # Find by id (more reliable)
        full_rec = next((r for r in all_aha if r.get('id') == rec_id), None)
        if not full_rec:
            full_rec = name_to_rec.get(name)
        if full_rec:
            # Avoid duplicate add
            if not any(r.get('id') == full_rec.get('id') for r in accepted):
                accepted.append(full_rec)
                added.append(name)
                print(f'  + KABUL: {name}')
            else:
                print(f'  (already in accepted): {name}')

print(f'\nAdded outliers: {len(added)}')
print(f'Final accepted: {len(accepted)}')

# Save
with open('_aha_recipes_final.json', 'w', encoding='utf-8') as f:
    json.dump(accepted, f, indent=2, ensure_ascii=False)
print(f'\n✓ Final dataset → _aha_recipes_final.json')
