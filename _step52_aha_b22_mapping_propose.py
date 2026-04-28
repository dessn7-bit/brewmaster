#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""B-2.2 — Manuel AHA_STYLE_TO_SLUG tablosu hazırla.
124 AHA term → V15 77 slug map (+ DROP non-beer + unmapped edge cases).
K4 sadık: fuzzy fallback YOK, Kaan onayına ham hali sunulur.
"""
import json
import html

with open('_aha_taxonomy_terms.json', 'r', encoding='utf-8') as f:
    terms = json.load(f)

with open('_v15_label_encoder_slug.json', 'r', encoding='utf-8') as f:
    le = json.load(f)
v15_slugs = set(le['classes'])
print(f'V15 slug count: {len(v15_slugs)}')
print(f'AHA term count: {len(terms)}')

# Manuel mapping — Kaan onayına sunulacak, K4 sadık
# Format: { "AHA Style Name (slug=aha-slug, count=N)": {"v15_slug": "...", "note": "..."} }
# v15_slug: V15'te canonical slug | "DROP" (non-beer) | "unmapped" (V15'te yok, Kaan karar)

# Manuel decision dict — slug:aha-slug → v15_slug + note
MAPPING = {
    # ── Direct match: V15'te tam karşılığı var ──
    'altbier': ('german_altbier', 'BJCP Altbier — V15 direct'),
    'amber-ale': ('american_amber_red_ale', 'AHA generic Amber → BJCP American Amber Ale / Red Ale'),
    'amber-lager': ('vienna_lager', 'AHA Amber Lager → Vienna Lager (BJCP)'),
    'american-amber-ale': ('american_amber_red_ale', 'V15 direct'),
    'american-brown-ale': ('american_brown_ale', 'V15 direct'),
    'american-ipa': ('american_india_pale_ale', 'V15 direct'),
    'american-lager': ('american_lager', 'V15 direct'),
    'american-pale-ale': ('american_pale_ale', 'V15 direct'),
    'american-pilsner': ('pre_prohibition_lager', 'AHA "American Pilsner" → BJCP Pre-Prohibition Lager (historical)'),
    'american-porter': ('porter', 'V15 generic porter — robust_porter ayrı slug ama "American Porter" generic'),
    'american-stout': ('stout', 'V15 generic stout slug — american_stout ayrı yok'),
    'american-wheat': ('american_wheat_ale', 'V15 direct (V15: american_wheat_ale)'),
    'baltic-porter': ('baltic_porter', 'V15 direct'),
    'barleywine': ('american_barleywine', 'AHA generic Barleywine → American Barleywine (V15 default)'),
    'belgian-blonde': ('belgian_blonde_ale', 'V15 direct (belgian_blonde_ale)'),
    'belgian-dark-strong-ale': ('belgian_strong_dark_ale', 'V15 direct'),
    'belgian-golden-strong-ale': ('belgian_strong_golden', 'V15 direct'),
    'belgian-ale': ('belgian_blonde_ale', 'AHA "Belgian Ale" geniş katch-all → en yakın V15 blonde_ale (edge case, multi-style etiketli reçetelerde primary-yoast tercih edilir)'),
    'belgian-pale-ale': ('belgian_blonde_ale', 'AHA "Belgian Pale Ale" → V15 yok (closest: belgian_blonde_ale), edge case'),
    'berliner-weisse': ('berliner_weisse', 'V15 direct'),
    'biere-de-garde': ('french_biere_de_garde', 'V15 direct'),
    'blonde-ale': ('blonde_ale', 'V15 direct (American Blonde generic)'),
    'bock': ('dunkles_bock', 'AHA generic Bock → V15 dunkles_bock (en yaygın)'),
    'brown-ale': ('brown_ale', 'V15 direct (English Brown Ale generic)'),
    'california-common': ('common_beer', 'V15 direct'),
    'dark-lager': ('munich_dunkel', 'AHA generic Dark Lager → BJCP Munich Dunkel (en yakın)'),
    'doppelbock': ('german_doppelbock', 'V15 direct'),
    'dortmunder-export': ('dortmunder_european_export', 'V15 direct'),
    'double-ipa': ('double_ipa', 'V15 direct'),
    'dunkelweizen': ('south_german_dunkel_weizen', 'V15 direct'),
    'dunkles-bock': ('dunkles_bock', 'V15 direct'),
    'eisbock': ('dunkles_bock', 'AHA Eisbock → V15 yok (closest: dunkles_bock), edge case'),
    'english-brown-ale': ('brown_ale', 'V15 direct'),
    'english-ipa': ('british_india_pale_ale', 'V15 direct'),
    'english-mild': ('mild', 'V15 direct (Mild = English Mild)'),
    'english-pale-ale': ('english_pale_ale', 'V15 direct'),
    'english-strong-ale': ('old_ale', 'AHA "English Strong Ale" → V15 old_ale (closest)'),
    'extra-special-bitter': ('extra_special_bitter', 'V15 direct (ESB)'),
    'farmhouse': ('french_belgian_saison', 'AHA generic Farmhouse → V15 french_belgian_saison (en yakın)'),
    'farmhouse-saison': ('french_belgian_saison', 'V15 direct'),
    'festbier': ('german_oktoberfest_festbier', 'V15 direct'),
    'flanders-brown-oud-bruin': ('oud_bruin', 'V15 direct'),
    'flanders-red': ('mixed_fermentation_sour_beer', 'AHA Flanders Red → V15 yok (Flanders Red ayrı slug yok), mixed_fermentation_sour_beer (Adım 51 K-Pre5 kararı sour aile geçici toplama)'),
    'foreign-tropical-stout': ('stout', 'AHA Foreign/Tropical Stout → V15 generic stout'),
    'fruit-beer': ('fruit_beer', 'V15 direct'),
    'german-pilsner': ('german_pilsener', 'V15 direct (typo "pilsner" vs "pilsener" — V15: pilsener)'),
    'gose': ('mixed_fermentation_sour_beer', 'AHA Gose → V15 standalone yok, mixed_fermentation_sour_beer (geçici, Adım 56 standalone slug)'),
    'golden-ale': ('blonde_ale', 'AHA Golden Ale → V15 blonde_ale (closest)'),
    'helles': ('munich_helles', 'V15 direct (Munich Helles)'),
    'helles-bock-maibock': ('german_heller_bock_maibock', 'V15 direct'),
    'historical-beer': ('experimental_beer', 'AHA "Historical Beer" geniş katch-all → V15 experimental_beer (edge case, hist/special category overlap)'),
    'hybrid-beer': ('common_beer', 'AHA generic Hybrid → V15 common_beer (Cream Ale veya California Common closest)'),
    'imperial-ipa': ('double_ipa', 'AHA Imperial IPA = Double IPA'),
    'imperial-pilsner': ('german_pilsener', 'AHA Imperial Pils → V15 german_pilsener (high-alcohol pilsener edge case)'),
    'imperial-porter': ('baltic_porter', 'AHA Imperial Porter → V15 baltic_porter (closest high-alcohol porter)'),
    'imperial-red-ale': ('american_amber_red_ale', 'AHA Imperial Red → V15 american_amber_red_ale (high-alcohol amber, edge case)'),
    'imperial-stout': ('american_imperial_stout', 'V15 direct'),
    'india-pale-ale': ('american_india_pale_ale', 'AHA generic IPA → V15 american_india_pale_ale (default)'),
    'ipa': ('american_india_pale_ale', 'AHA generic "IPA" → American IPA (default, en yaygın)'),
    'irish-red-ale': ('irish_red_ale', 'V15 direct'),
    'irish-stout': ('irish_dry_stout', 'V15 direct'),
    'juicy-or-hazy-ipa': ('juicy_or_hazy_india_pale_ale', 'V15 direct'),
    'koelsch': ('german_koelsch', 'V15 direct (Kölsch)'),
    'kolsch': ('german_koelsch', 'V15 direct (alternate spelling)'),
    'lambic-or-gueuze': ('belgian_lambic', 'AHA "Lambic / Gueuze" → V15 belgian_lambic (geniş, gueuze ayrı slug ama V15\'te 2 reçete var)'),
    'maibock-helles-bock': ('german_heller_bock_maibock', 'V15 direct'),
    'marzen-or-oktoberfest': ('german_maerzen', 'V15 direct (V15: german_maerzen)'),
    'munich-dunkel': ('munich_dunkel', 'V15 direct'),
    'munich-helles': ('munich_helles', 'V15 direct'),
    'oatmeal-stout': ('oatmeal_stout', 'V15 direct'),
    'old-ale': ('old_ale', 'V15 direct'),
    'ordinary-bitter': ('ordinary_bitter', 'V15 direct'),
    'oud-bruin': ('oud_bruin', 'V15 direct'),
    'pale-ale': ('american_pale_ale', 'AHA generic Pale Ale → V15 american_pale_ale (default)'),
    'pale-lager': ('pale_lager', 'V15 direct (generic American Pale Lager)'),
    'pilsner': ('german_pilsener', 'AHA generic Pilsner → V15 german_pilsener (default)'),
    'porter': ('porter', 'V15 direct (generic English Porter)'),
    'pre-prohibition-lager': ('pre_prohibition_lager', 'V15 direct'),
    'rauchbier': ('bamberg_maerzen_rauchbier', 'V15 direct (Bamberg Rauch)'),
    'red-ale': ('irish_red_ale', 'AHA generic Red → V15 irish_red_ale (closest)'),
    'roasted-beer': ('stout', 'AHA "Roasted Beer" generic → V15 stout (closest)'),
    'roggenbier': ('german_rye_ale', 'V15 direct'),
    'russian-imperial-stout': ('american_imperial_stout', 'AHA "Russian Imperial Stout" → V15 american_imperial_stout'),
    'saison': ('french_belgian_saison', 'V15 direct (saison)'),
    'schwarzbier': ('german_schwarzbier', 'V15 direct'),
    'scotch-ale-or-wee-heavy': ('scotch_ale_or_wee_heavy', 'V15 direct'),
    'scottish-export': ('scottish_export', 'V15 direct'),
    'session-ipa': ('american_india_pale_ale', 'AHA Session IPA → V15 american_india_pale_ale (low-ABV variant, edge case)'),
    'smoke-beer': ('smoked_beer', 'V15 direct'),
    'smoked-beer': ('smoked_beer', 'V15 direct'),
    'sour-ale': ('mixed_fermentation_sour_beer', 'AHA generic Sour → V15 mixed_fermentation_sour_beer (Adım 51 K-Pre5 geçici)'),
    'special-bitter-or-best-bitter': ('special_bitter_or_best_bitter', 'V15 direct'),
    'specialty-beer': ('specialty_beer', 'V15 direct'),
    'specialty-ipa': ('specialty_beer', 'AHA "Specialty IPA" → V15 yok (closest specialty_beer veya black_ipa, default specialty)'),
    'specialty-stout': ('specialty_beer', 'AHA generic Specialty Stout → V15 specialty_beer (specialty geniş)'),
    'spice-herb-beer': ('herb_and_spice_beer', 'V15 direct'),
    'spice-herb-vegetable-beer': ('herb_and_spice_beer', 'V15 direct'),
    'stout': ('stout', 'V15 direct (generic stout)'),
    'sweet-stout': ('sweet_stout', 'V15 direct'),
    'tripel': ('belgian_tripel', 'AHA Tripel → V15 belgian_tripel'),
    'belgian-tripel': ('belgian_tripel', 'V15 direct'),
    'belgian-dubbel': ('belgian_dubbel', 'V15 direct'),
    'dubbel': ('belgian_dubbel', 'AHA Dubbel → V15 belgian_dubbel'),
    'belgian-quadrupel': ('belgian_quadrupel', 'V15 direct'),
    'quadrupel': ('belgian_quadrupel', 'AHA Quad → V15 belgian_quadrupel'),
    'uk-us-strong-ale': ('american_strong_pale_ale', 'AHA "UK/US Strong Ale" geniş → V15 american_strong_pale_ale (closest, edge case multi-style)'),
    'vienna-lager': ('vienna_lager', 'V15 direct'),
    'wheat-rye-beer': ('south_german_hefeweizen', 'AHA "Wheat & Rye" generic → V15 south_german_hefeweizen (en yaygın, edge case Roggenbier ayrı)'),
    'weizenbock': ('south_german_weizenbock', 'V15 direct (V15: south_german_weizenbock)'),
    'witbier': ('belgian_witbier', 'V15 direct'),
    'belgian-witbier': ('belgian_witbier', 'V15 direct'),
    'winter-seasonal': ('winter_seasonal_beer', 'V15 direct'),
    'winter-warmer': ('winter_seasonal_beer', 'AHA Winter Warmer → V15 winter_seasonal_beer'),
    'wood-aged-beer': ('experimental_beer', 'AHA Wood-Aged → V15 experimental_beer (closest)'),
    'wee-heavy': ('scotch_ale_or_wee_heavy', 'V15 direct (alternate label)'),
    'kentucky-common': ('common_beer', 'AHA Kentucky Common → V15 common_beer (closest)'),
    'lichtenhainer': ('mixed_fermentation_sour_beer', 'AHA Lichtenhainer (sour wheat) → V15 mixed_fermentation_sour_beer (geçici)'),
    'gose-traditional': ('mixed_fermentation_sour_beer', 'AHA Gose Traditional → V15 mixed_fermentation_sour_beer (geçici)'),
    'fruited-sour': ('mixed_fermentation_sour_beer', 'AHA Fruited Sour → V15 mixed_fermentation_sour_beer (geçici)'),
    'wild-ale': ('brett_beer', 'AHA Wild Ale → V15 brett_beer (closest, edge case)'),
    'farmhouse-ale': ('french_belgian_saison', 'AHA Farmhouse Ale → V15 french_belgian_saison'),
    'pale-american-lager': ('american_lager', 'V15 direct'),
    'cream-ale': ('cream_ale', 'V15 direct'),
    'kellerbier': ('kellerbier', 'V15 direct'),
    'zwickelbier': ('kellerbier', 'AHA Zwickelbier → V15 kellerbier (similar unfiltered lager)'),
    'rye-ipa': ('american_india_pale_ale', 'AHA Rye IPA → V15 american_india_pale_ale (edge case)'),
    'rye-beer': ('german_rye_ale', 'V15 direct'),
    'mixed-fermentation-sour-beer': ('mixed_fermentation_sour_beer', 'V15 direct'),
    'flanders-style-sour': ('mixed_fermentation_sour_beer', 'V15 direct'),
    'brett-beer': ('brett_beer', 'V15 direct'),

    # ── DROP: non-beer (mead, cider, sake, braggot) ──
    'fruit-mead': ('DROP', 'mead — non-beer, dataset\'e eklenmez'),
    'standard-mead': ('DROP', 'mead'),
    'specialty-mead': ('DROP', 'mead'),
    'specialty-cider-perry': ('DROP', 'cider'),
    'standard-cider-perry': ('DROP', 'cider'),
    'herb-spice-mead': ('DROP', 'mead'),
    'experimental-mead': ('DROP', 'mead'),
    'sweet-mead': ('DROP', 'mead'),
    'traditional-cider-perry': ('DROP', 'cider'),
    'berry-mead': ('DROP', 'mead'),
    'stone-fruit-mead': ('DROP', 'mead'),
    'semi-sweet-mead': ('DROP', 'mead'),
    'cyser-apple-mead': ('DROP', 'mead'),
    'other-fruit-mead': ('DROP', 'mead'),
    'braggot': ('DROP', 'braggot — mead+beer hybrid, scope dışı'),
    'fruit-cider-perry-specialty-cider-perry': ('DROP', 'cider'),
    'historical-mead-specialty-mead': ('DROP', 'mead'),
    'new-england-cider': ('DROP', 'cider'),
    'pyment-grape-mead': ('DROP', 'mead'),
    'spiced-cider-perry-specialty-cider-perry': ('DROP', 'cider'),
    'dry-mead': ('DROP', 'mead'),
    'new-world-cider': ('DROP', 'cider'),
    'french-cider': ('DROP', 'cider'),
    'ice-cider': ('DROP', 'cider'),
    'english-cider': ('DROP', 'cider'),
    'hard-seltzer': ('DROP', 'seltzer — non-beer'),

    # ── Edge cases / unmapped ──
    'alternative-fermentation': ('unmapped', 'Generic alt-fermentation, V15\'te yok, count=0 zaten — Kaan karar (specialty_beer mu, mixed_fermentation_sour_beer mı?)'),

    # ── Slug isim farkı düzeltmeleri (B-2.2 ilk run\'da unmapped çıktı, V15\'te karşılığı VAR) ──
    'scottish-ale': ('scotch_ale_or_wee_heavy', 'AHA Scottish Ale → V15 scotch_ale_or_wee_heavy (Scottish + Wee Heavy aile)'),
    'hazy-new-england-ipa': ('juicy_or_hazy_india_pale_ale', 'V15 direct (NEIPA = Hazy IPA = Juicy IPA)'),
    'sweet-milk-stout': ('sweet_stout', 'V15 direct (Sweet/Milk Stout)'),
    'hefeweizen': ('south_german_hefeweizen', 'V15 direct'),
    'imperial-double-ipa': ('double_ipa', 'V15 direct (Imperial = Double IPA)'),
    'mild': ('mild', 'V15 direct'),
    'czech-boho-pils': ('german_pilsener', 'AHA Czech Pilsner → V15 yok (Czech ayrı slug yok), closest german_pilsener'),
    'helles-bock': ('german_heller_bock_maibock', 'V15 direct (Helles Bock = Maibock)'),
    'oktoberfest': ('german_oktoberfest_festbier', 'V15 direct'),
    'coffee-beer': ('herb_and_spice_beer', 'AHA Coffee Beer → V15 herb_and_spice_beer (closest specialty)'),
    'pumpkin-beer': ('herb_and_spice_beer', 'AHA Pumpkin Beer → V15 herb_and_spice_beer (closest specialty, edge case)'),
    'chocolate-beer': ('herb_and_spice_beer', 'AHA Chocolate Beer → V15 herb_and_spice_beer (closest specialty)'),
    'weizen-bock': ('south_german_weizenbock', 'V15 direct'),
    'marzen': ('german_maerzen', 'V15 direct (Märzen)'),
    'english-bitter': ('special_bitter_or_best_bitter', 'V15 direct (English Bitter generic = Best Bitter)'),
    'english-porter': ('brown_porter', 'V15 direct (English Porter = Brown Porter)'),
    'gueuze': ('belgian_lambic', 'AHA Gueuze → V15 belgian_lambic (V15\'te belgian_gueuze ayrı slug n=2, lambic geniş seçim)'),
    'lambic': ('belgian_lambic', 'V15 direct'),
    'california-common-hybrid-beer': ('common_beer', 'V15 direct (alternate slug)'),
}

# Build proposed table
output = []
unmapped_terms = []
for t in terms:
    aha_slug = t['slug']
    aha_name = html.unescape(t['name'])
    count = t.get('count', 0)
    if aha_slug in MAPPING:
        v15, note = MAPPING[aha_slug]
    else:
        v15 = 'unmapped'
        note = 'KAAN KARAR — V15 slug eşleştirmesi yok'
        unmapped_terms.append({'aha_slug': aha_slug, 'aha_name': aha_name, 'count': count})
    output.append({
        'aha_slug': aha_slug,
        'aha_name': aha_name,
        'count': count,
        'v15_slug': v15,
        'note': note,
    })

# Validate v15_slug values exist in V15 encoder (for non-DROP/non-unmapped)
problems = []
for entry in output:
    v = entry['v15_slug']
    if v not in ('DROP', 'unmapped') and v not in v15_slugs:
        problems.append(f'{entry["aha_slug"]} → "{v}" (V15\'te YOK)')

with open('_aha_style_to_slug_proposed.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

# Summary
v15_count = sum(1 for e in output if e['v15_slug'] not in ('DROP', 'unmapped'))
drop_count = sum(1 for e in output if e['v15_slug'] == 'DROP')
unmapped_count = sum(1 for e in output if e['v15_slug'] == 'unmapped')

print(f'\n=== Mapping Summary ===')
print(f'  V15 slug map  : {v15_count} entries')
print(f'  DROP non-beer : {drop_count} entries')
print(f'  Unmapped      : {unmapped_count} entries (Kaan karar)')
print(f'  Total         : {len(output)}')

if problems:
    print(f'\n⚠ PROBLEMS — V15\'te olmayan slug\'a map edilmiş:')
    for p in problems:
        print(f'  {p}')

if unmapped_terms:
    print(f'\n=== Unmapped terms (Kaan karar) ===')
    for u in unmapped_terms:
        print(f'  [{u["count"]:>3}] {u["aha_name"]:<40} (slug={u["aha_slug"]})')

# Recipe count distribution
beer_term_recipe_count = sum(e['count'] for e in output if e['v15_slug'] not in ('DROP', 'unmapped'))
drop_term_recipe_count = sum(e['count'] for e in output if e['v15_slug'] == 'DROP')
unmapped_term_recipe_count = sum(e['count'] for e in output if e['v15_slug'] == 'unmapped')
print(f'\n=== Recipe count breakdown (taxonomy term × count) ===')
print(f'  Beer mapped   : {beer_term_recipe_count} (recipes can have multi-style, overcounts)')
print(f'  DROP non-beer : {drop_term_recipe_count}')
print(f'  Unmapped      : {unmapped_term_recipe_count}')
