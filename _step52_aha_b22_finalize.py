#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""B-2.2 finalize — Kaan revizyonları:
8 generic katch-all → unmapped (pale-ale, wheat-rye-beer, belgian-pale-ale,
uk-us-strong-ale, historical-beer, specialty-ipa, wood-aged-beer, hybrid-beer)
+ Eisbock fix (dunkles_bock → german_doppelbock)
"""
import json

with open('_aha_style_to_slug_proposed.json', 'r', encoding='utf-8') as f:
    proposed = json.load(f)

# Kaan revizyonları
UNMAPPED_SLUGS = {
    'pale-ale': 'Generic Pale Ale (APA/UK/Belgian belirsiz). Mevcut IPA/APA dataset volume yeterli.',
    'wheat-rye-beer': 'Wheat vs Rye belirsiz. Roggenbier ayrı slug var, mevcut wheat volume yeterli.',
    'belgian-pale-ale': 'V15\'te belgian_pale_ale yok. belgian_blonde\'a basmak yanlış sinyal verir.',
    'uk-us-strong-ale': 'Wee Heavy/Old Ale/Imperial Red ayrı stiller — tek slug\'a toplama yanlış.',
    'historical-beer': 'Pre-Prohibition/Sahti/Roggenbier karışım — experimental_beer\'a basmak yanlış.',
    'specialty-ipa': 'White/Black/Belgian/Brett/Brut IPA ayrı — specialty_beer katch-all yanlış.',
    'wood-aged-beer': 'Base style\'a göre etiketlenmeli — experimental yanlış.',
    'hybrid-beer': 'Cream/California Common/Kölsch/Altbier karışım — common_beer yanlış sinyal.',
}
EISBOCK_FIX = ('eisbock', 'german_doppelbock', 'AHA Eisbock = Doppelbock\'un dondurulmuş konsantresi (Kaan revize)')

# Apply changes
final = []
unmapped_count = 0
fixed_eisbock = False
for entry in proposed:
    slug = entry['aha_slug']
    if slug in UNMAPPED_SLUGS:
        entry['v15_slug'] = 'unmapped'
        entry['note'] = f'KAAN REVIZE — UNMAPPED: {UNMAPPED_SLUGS[slug]}'
        unmapped_count += 1
    elif slug == EISBOCK_FIX[0]:
        entry['v15_slug'] = EISBOCK_FIX[1]
        entry['note'] = EISBOCK_FIX[2]
        fixed_eisbock = True
    final.append(entry)

# Save final
with open('_aha_style_to_slug_FINAL.json', 'w', encoding='utf-8') as f:
    json.dump(final, f, indent=2, ensure_ascii=False)

# Summary
v15_count = sum(1 for e in final if e['v15_slug'] not in ('DROP', 'unmapped'))
drop_count = sum(1 for e in final if e['v15_slug'] == 'DROP')
unmapped_count_total = sum(1 for e in final if e['v15_slug'] == 'unmapped')

# Recipe count breakdown
v15_recipes = sum(e['count'] for e in final if e['v15_slug'] not in ('DROP', 'unmapped'))
drop_recipes = sum(e['count'] for e in final if e['v15_slug'] == 'DROP')
unmapped_recipes = sum(e['count'] for e in final if e['v15_slug'] == 'unmapped')

print('=' * 60)
print('FINAL MAPPING (Kaan revizyonu sonrası)')
print('=' * 60)
print(f'Total entries: {len(final)}')
print(f'  V15 slug map  : {v15_count} entries  ({v15_recipes} recipes — multi-style overcount)')
print(f'  DROP non-beer : {drop_count} entries  ({drop_recipes} recipes)')
print(f'  Unmapped      : {unmapped_count_total} entries  ({unmapped_recipes} recipes)')
print(f'\nKaan revize ettiği:')
print(f'  Unmapped\'e çekildi: {unmapped_count} entry')
print(f'  Eisbock fix uygulandı: {fixed_eisbock}')
print('\nFinal JSON: _aha_style_to_slug_FINAL.json')
