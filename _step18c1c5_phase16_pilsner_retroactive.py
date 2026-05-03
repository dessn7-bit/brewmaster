#!/usr/bin/env python3
"""Adim 18c-1c-5 ASAMA 1.6 — Pilsner geriye donuk FP audit (V26).
6 brand bare numeric: 1318, 1968, 1275, 2272, 2007, 5335
KOD DEGISIKLIGI YOK.
"""
import json, ijson, re, sys, os, time
from pathlib import Path
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
T0 = time.time()
def t(): return f'{time.time()-T0:.1f}s'

ROOT = Path('C:/Users/Kaan/brewmaster')
V26 = ROOT / 'working' / '_v26_aliased_dataset.json'
OUT = ROOT / 'working' / '_step18c1c5_phase16_pilsner_retroactive_fp.json'

SLUG_TO_CLUSTER = {
    'american_brown_ale':'brown_ale','mild':'brown_ale','brown_ale':'brown_ale',
    'irish_red_ale':'brown_ale','scottish_export':'brown_ale','american_amber_red_ale':'brown_ale',
    'german_altbier':'brown_ale','french_biere_de_garde':'brown_ale',
    'german_doppelbock':'bock','german_heller_bock_maibock':'bock','german_bock':'bock','dunkles_bock':'bock',
    'american_india_pale_ale':'ipa','double_ipa':'ipa','british_india_pale_ale':'ipa',
    'black_ipa':'ipa','white_ipa':'ipa','red_ipa':'ipa','rye_ipa':'ipa',
    'juicy_or_hazy_india_pale_ale':'ipa','belgian_ipa':'ipa',
    'american_lager':'lager','german_maerzen':'lager','common_beer':'lager','vienna_lager':'lager',
    'munich_helles':'lager','pale_lager':'lager','dortmunder_european_export':'lager',
    'bamberg_maerzen_rauchbier':'lager','kellerbier':'lager','german_oktoberfest_festbier':'lager',
    'german_schwarzbier':'lager_dark','munich_dunkel':'lager_dark',
    'american_pale_ale':'pale_ale','english_pale_ale':'pale_ale','blonde_ale':'pale_ale',
    'american_cream_ale':'pale_ale','german_koelsch':'pale_ale','extra_special_bitter':'pale_ale',
    'special_bitter_or_best_bitter':'pale_ale','ordinary_bitter':'pale_ale',
    'german_pilsener':'pilsner','pre_prohibition_lager':'pilsner',
    'robust_porter':'porter','brown_porter':'porter','baltic_porter':'porter','porter':'porter',
    'french_belgian_saison':'saison','specialty_saison':'saison',
    'berliner_weisse':'sour','flanders_red_ale':'sour','belgian_lambic':'sour',
    'belgian_fruit_lambic':'sour','oud_bruin':'sour','mixed_fermentation_sour_beer':'sour',
    'gose':'sour','belgian_gueuze':'sour','brett_beer':'sour',
    'specialty_beer':'specialty','herb_and_spice_beer':'specialty','fruit_beer':'specialty',
    'winter_seasonal_beer':'specialty','smoked_beer':'specialty','experimental_beer':'specialty',
    'american_imperial_stout':'stout','stout':'stout','oatmeal_stout':'stout','sweet_stout':'stout',
    'irish_dry_stout':'stout','export_stout':'stout',
    'belgian_tripel':'strong_ale','belgian_strong_dark_ale':'strong_ale',
    'american_barley_wine_ale':'strong_ale','scotch_ale_or_wee_heavy':'strong_ale',
    'belgian_strong_golden':'strong_ale','old_ale':'strong_ale','british_barley_wine_ale':'strong_ale',
    'american_strong_pale_ale':'strong_ale','belgian_quadrupel':'strong_ale',
    'belgian_blonde_ale':'strong_ale','belgian_dubbel':'strong_ale',
    'american_wheat_ale':'wheat','south_german_hefeweizen':'wheat',
    'south_german_dunkel_weizen':'wheat','south_german_weizenbock':'wheat',
    'german_rye_ale':'wheat','belgian_witbier':'wheat',
}

# 6 brand (Asama 18c-1c-2 Asama 2.7 kombo only kararlari)
BRANDS = {
    '1318': {
        'feature': 'yeast_english',
        'name': 'Wyeast 1318 London Ale III',
        'kombo_re': re.compile(r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?1318\b', re.IGNORECASE),
        'bare_re': re.compile(r'\b1318\b'),
    },
    '1968': {
        'feature': 'yeast_english',
        'name': 'Wyeast 1968 London ESB',
        'kombo_re': re.compile(r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?1968\b', re.IGNORECASE),
        'bare_re': re.compile(r'\b1968\b'),
    },
    '1275': {
        'feature': 'yeast_english',
        'name': 'Wyeast 1275 Thames Valley',
        'kombo_re': re.compile(r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?1275\b', re.IGNORECASE),
        'bare_re': re.compile(r'\b1275\b'),
    },
    '2272': {
        'feature': 'yeast_czech_lager',
        'name': 'Wyeast 2272 North American Lager',
        'kombo_re': re.compile(r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?2272\b', re.IGNORECASE),
        'bare_re': re.compile(r'\b2272\b'),
    },
    '2007': {
        'feature': 'yeast_american_lager',
        'name': 'Wyeast 2007 Pilsen Lager',
        'kombo_re': re.compile(r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?2007\b|2007\s+pilsen', re.IGNORECASE),
        'bare_re': re.compile(r'\b2007\b'),
    },
    '5335': {
        'feature': 'yeast_lacto',
        'name': 'Wyeast 5335 Lactobacillus',
        'kombo_re': re.compile(r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?5335\b', re.IGNORECASE),
        'bare_re': re.compile(r'\b5335\b'),
    },
}

# === V26 stream ===
print(f'[{t()}] V26 stream + 6 brand bare numeric audit...')
results = {bid: {
    'kombo_match': 0,                   # mevcut kombo
    'bare_only_match': 0,               # bare match ama kombo NO match (yeni yakalama potansiyel)
    'bare_total': 0,                    # bare match toplam (kombo + bare-only)
    'examples_bare_only_v26': [],       # bare ama kombo değil + V26 features=0
    'examples_bare_only_caught': [],    # bare ama kombo değil + V26 features=1 (zaten başka pattern yakalı)
    'cluster_dist_bare_only': defaultdict(int),
} for bid in BRANDS}
total = 0
with open(V26, 'rb') as f:
    for r in ijson.items(f, 'recipes.item'):
        total += 1
        if total % 50000 == 0:
            print(f'  [{t()}] scanned {total}')
        slug = r.get('bjcp_slug')
        cluster = SLUG_TO_CLUSTER.get(slug, 'unmapped')
        y = (r.get('raw') or {}).get('yeast') or (r.get('raw') or {}).get('yeasts')
        if not isinstance(y, str) or not y.strip(): continue
        ystr = y.lower()
        feat = r.get('features') or {}

        for bid, br in BRANDS.items():
            in_kombo = bool(br['kombo_re'].search(ystr))
            in_bare = bool(br['bare_re'].search(ystr))
            if in_kombo:
                results[bid]['kombo_match'] += 1
            if in_bare:
                results[bid]['bare_total'] += 1
            # bare ama kombo değil — bare ekleyince yeni yakalama
            if in_bare and not in_kombo:
                results[bid]['bare_only_match'] += 1
                results[bid]['cluster_dist_bare_only'][cluster] += 1
                # V26 mevcut feature durumu
                target_feat = (feat.get(br['feature']) or 0) >= 0.5
                if target_feat:
                    if len(results[bid]['examples_bare_only_caught']) < 5:
                        results[bid]['examples_bare_only_caught'].append({
                            'recipe_id': r.get('id'), 'source': r.get('source'),
                            'slug': slug, 'cluster': cluster,
                            'raw_yeast': y[:200],  # tam metin
                            f'features_{br["feature"]}': 1,
                        })
                else:
                    if len(results[bid]['examples_bare_only_v26']) < 10:
                        results[bid]['examples_bare_only_v26'].append({
                            'recipe_id': r.get('id'), 'source': r.get('source'),
                            'slug': slug, 'cluster': cluster,
                            'raw_yeast': y[:200],
                            f'features_{br["feature"]}': 0,
                        })

print(f'\n[{t()}] V26 scan tamam: total={total}')

# === Tablo ===
print('\n' + '=' * 95)
print('A. 6 BRAND TABLOSU (V26)')
print('=' * 95)
print(f"  {'brand':<8}{'feature':<22}{'mevcut(kombo)':>15}{'bare_total':>12}{'bare_only':>11}{'bare_eklem_kazanim':>20}")
for bid, br in BRANDS.items():
    rs = results[bid]
    print(f"  {bid:<8}{br['feature']:<22}{rs['kombo_match']:>15}{rs['bare_total']:>12}{rs['bare_only_match']:>11}{rs['bare_only_match']:>20}")

# === Spot check (bare_only_v26 örnekleri) ===
print('\n' + '=' * 95)
print('B. SPOT CHECK — bare match ama V26 features=0 (yeni yakalama potansiyeli)')
print('=' * 95)
for bid, br in BRANDS.items():
    rs = results[bid]
    if not rs['examples_bare_only_v26']: continue
    print(f'\n  {bid} ({br["name"]}) — bare_only V26=0 örnekleri ({rs["bare_only_match"]} toplam):')
    for ex in rs['examples_bare_only_v26'][:5]:
        print(f'    [{ex["source"]:<10}] {ex["cluster"]:<14} {ex["slug"]:<28}')
        print(f'      raw_yeast: "{ex["raw_yeast"]}"')

# === Spot check (bare_only_caught — pattern başka yerden yakaladı) ===
print('\n' + '=' * 95)
print('C. SPOT CHECK — bare match ama V26 features=1 (zaten başka pattern ile yakalanmış)')
print('=' * 95)
for bid, br in BRANDS.items():
    rs = results[bid]
    if not rs['examples_bare_only_caught']: continue
    print(f'\n  {bid} ({br["name"]}) — bare_only V26=1 örnekleri:')
    for ex in rs['examples_bare_only_caught'][:3]:
        print(f'    [{ex["source"]:<10}] {ex["cluster"]:<14} {ex["slug"]:<28}')
        print(f'      raw_yeast: "{ex["raw_yeast"]}"')

# === Cluster dağılımı (bare_only) ===
print('\n' + '=' * 95)
print('D. Cluster dağılımı (bare match ama kombo NOT — yeni yakalama dağılımı)')
print('=' * 95)
for bid, br in BRANDS.items():
    rs = results[bid]
    if rs['bare_only_match'] == 0: continue
    print(f'\n  {bid} ({br["name"]}):')
    for c, n in sorted(rs['cluster_dist_bare_only'].items(), key=lambda x:-x[1])[:10]:
        print(f'    {c:<14} {n}')

# === SAVE ===
clean = {}
for bid, rs in results.items():
    clean[bid] = {
        'feature': BRANDS[bid]['feature'],
        'name': BRANDS[bid]['name'],
        'kombo_match': rs['kombo_match'],
        'bare_total': rs['bare_total'],
        'bare_only_match': rs['bare_only_match'],
        'examples_bare_only_v26_features_0': rs['examples_bare_only_v26'],
        'examples_bare_only_v26_features_1': rs['examples_bare_only_caught'],
        'cluster_dist_bare_only': dict(rs['cluster_dist_bare_only']),
    }
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(clean, f, ensure_ascii=False, indent=2)
print(f'\n  JSON: {OUT} ({os.path.getsize(OUT)/1024:.1f} KB)')

print(f'\n[{t()}] DEBUG TAMAM')
