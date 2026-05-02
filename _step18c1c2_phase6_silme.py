#!/usr/bin/env python3
"""Adim 18c-1c-2 ASAMA 6 — V25 → V26 silme uygula + V26 ozet + wheat preview.

1. V25 → V26 silme (sıkı pattern uygulanmış 5084 placeholder)
2. V26 cluster özet
3. Wheat cluster preview (18c-1c-3 sprint hazirlik)
"""
import json, ijson, re, sys, os, time
from pathlib import Path
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
T0 = time.time()
def t(): return f'{time.time()-T0:.1f}s'

ROOT = Path('C:/Users/Kaan/brewmaster')
V25 = ROOT / 'working' / '_v25_aliased_dataset.json'
V26 = ROOT / 'working' / '_v26_aliased_dataset.json'
OUT_SUM = ROOT / 'working' / '_step18c1c2_phase6_v26_clusters_summary.json'
OUT_WHEAT = ROOT / 'working' / '_step18c1c2_phase6_wheat_preview.json'

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
YEAST_FLAGS = ['yeast_belgian','yeast_abbey','yeast_saison','yeast_kveik',
               'yeast_english','yeast_american','yeast_german_lager',
               'yeast_czech_lager','yeast_american_lager','yeast_kolsch',
               'yeast_altbier','yeast_cal_common','yeast_brett','yeast_lacto',
               'yeast_sour_blend','yeast_witbier','yeast_wheat_german','yeast_wit']

# Sıkı placeholder pattern: tüm string default kalıbı, semicolon hariç
STRICT_PLACEHOLDER_RE = re.compile(r'^[-\s]*\(?\s*(?:default|placeholder)\b[^;]*\)?\s*$', re.IGNORECASE)

def deep_clean(o):
    if isinstance(o, dict): return {k: deep_clean(v) for k, v in o.items()}
    if isinstance(o, list): return [deep_clean(x) for x in o]
    if hasattr(o, '__float__') and not isinstance(o, (bool, int, float)): return float(o)
    return o

# === V25 → V26 silme ===
print(f'[{t()}] V25 → V26 silme + cluster sayım + wheat preview')

total_v25 = 0
deleted = 0
written = 0

cluster_v25_total = Counter()
cluster_v26_total = Counter()
cluster_v26_no_yeast = Counter()
cluster_v25_deleted = Counter()

# Wheat preview
wheat_no_yeast_total = 0
wheat_total = 0
wheat_no_yeast_raws = Counter()
wheat_no_yeast_sources = Counter()
wheat_slug_dist = Counter()
wheat_no_yeast_slug = Counter()

with open(V25, 'rb') as fin, open(V26, 'w', encoding='utf-8') as fout:
    fout.write('{"recipes":[')
    first = False

    for r in ijson.items(fin, 'recipes.item'):
        total_v25 += 1
        if total_v25 % 50000 == 0:
            print(f'  [{t()}] scanned {total_v25}, written {written}, deleted {deleted}')
        slug = r.get('bjcp_slug')
        cluster = SLUG_TO_CLUSTER.get(slug, 'unmapped')
        cluster_v25_total[cluster] += 1
        raw = r.get('raw') or {}
        y = raw.get('yeast') or raw.get('yeasts')

        # Silme kararı: sıkı pattern
        delete = False
        if y is None:
            delete = True
        elif isinstance(y, str):
            ystr = y.strip()
            if not ystr or len(ystr) < 8 or STRICT_PLACEHOLDER_RE.match(ystr):
                delete = True

        if delete:
            deleted += 1
            cluster_v25_deleted[cluster] += 1
            continue

        cluster_v26_total[cluster] += 1
        feat = r.get('features') or {}
        active = sum(1 for k in YEAST_FLAGS if (feat.get(k) or 0) >= 0.5)
        if active == 0:
            cluster_v26_no_yeast[cluster] += 1

        # Wheat preview
        if cluster == 'wheat':
            wheat_total += 1
            wheat_slug_dist[slug] += 1
            if active == 0:
                wheat_no_yeast_total += 1
                wheat_no_yeast_slug[slug] += 1
                if isinstance(y, str):
                    wheat_no_yeast_raws[y.lower().strip()[:80]] += 1
                wheat_no_yeast_sources[r.get('source')] += 1

        if first: fout.write(',')
        else: first = True
        json.dump(deep_clean(r), fout, ensure_ascii=False)
        written += 1

    fout.write('],"meta":{"version":"v26","date":"2026-05-03","based_on":"v25_aliased","note":"5084 placeholder + null + short silindi"}}')

print(f'\n[{t()}] V25 → V26 tamam:')
print(f'  V25 total: {total_v25}')
print(f'  silinen  : {deleted}')
print(f'  V26 total: {written}')
print(f'  V26 dosya: {os.path.getsize(V26)/1024/1024:.1f} MB')

# === V26 cluster özet ===
print('\n' + '=' * 95)
print('A. V26 cluster özet')
print('=' * 95)
print(f"  {'cluster':<14}{'V25 total':>11}{'silinen':>10}{'V26 total':>11}{'V26 no_yeast':>14}{'no_y %':>9}")
clusters_order = ['bock','brown_ale','ipa','lager','lager_dark','pale_ale','pilsner',
                  'porter','saison','sour','specialty','stout','strong_ale','wheat','unmapped']
v26_summary = {}
for c in clusters_order:
    n25 = cluster_v25_total[c]; nd = cluster_v25_deleted[c]
    n26 = cluster_v26_total[c]; ny = cluster_v26_no_yeast[c]
    pct = ny/n26*100 if n26 else 0
    print(f"  {c:<14}{n25:>11}{nd:>10}{n26:>11}{ny:>14}{pct:>8.2f}%")
    v26_summary[c] = {'v25_total':n25,'deleted':nd,'v26_total':n26,'v26_no_yeast':ny,'no_yeast_pct':round(pct,2)}
print(f"  {'TOPLAM':<14}{total_v25:>11}{deleted:>10}{written:>11}{sum(cluster_v26_no_yeast.values()):>14}")

# === 18c-1c-2 toplam etki ===
print('\n' + '=' * 95)
print('B. Adim 18c-1c-2 toplam etki (V24 → V25 → V26)')
print('=' * 95)
# V24 cluster_total ve no_yeast (Adim 18c-1c-1 phase 5 sonu)
V24_NUMS = {  # Adim 18c-1c-1 Asama 5 raporundan
    'bock': (3574, 444),
    'brown_ale': (38095, 4839),
    'ipa': (76438, 10749),
    'lager': (16778, 3319),
    'lager_dark': (2253, 239),
    'pale_ale': (71352, 10483),
    'pilsner': (6606, 1610),
    'porter': (14735, 1615),
    'saison': (19009, 1582),
    'sour': (4853, 777),
    'specialty': (41236, 6902),
    'stout': (32732, 3910),
    'strong_ale': (27800, 4540),
    'wheat': (26465, 5581),
    'unmapped': (3, 1),
}
V25_NO_YEAST = {  # Asama 4 sonu (V25 no_yeast)
    'bock': 388, 'brown_ale': 4839, 'ipa': 10749, 'lager': 2943, 'lager_dark': 176,
    'pale_ale': 10483, 'pilsner': 384, 'porter': 1615, 'saison': 1582, 'sour': 777,
    'specialty': 6902, 'stout': 3910, 'strong_ale': 4540, 'wheat': 5581, 'unmapped': 1,
}
print(f"  {'cluster':<14}{'V24 tot':>9}{'V25 no_y':>10}{'V26 tot':>9}{'V26 no_y':>10}{'V24→V26 no_y Δ':>16}")
for c in clusters_order:
    v24t, v24ny = V24_NUMS.get(c, (0,0))
    v25ny = V25_NO_YEAST.get(c, 0)
    v26t = cluster_v26_total[c]
    v26ny = cluster_v26_no_yeast[c]
    delta = v26ny - v24ny  # V24 no_yeast - V26 no_yeast (azalma negatif Δ)
    print(f"  {c:<14}{v24t:>9}{v25ny:>10}{v26t:>9}{v26ny:>10}{delta:>+15}")

# === Wheat preview ===
print('\n' + '=' * 95)
print('C. Wheat cluster preview (Adim 18c-1c-3 hazirlik)')
print('=' * 95)
print(f'  wheat V26 total       : {wheat_total}')
print(f'  wheat V26 no_yeast    : {wheat_no_yeast_total} ({wheat_no_yeast_total/wheat_total*100:.2f}%)')

print(f'\n  Wheat V26 slug dağılımı:')
for s, n in wheat_slug_dist.most_common():
    pct = n/wheat_total*100
    print(f'    {s:<32} {n:>5}  ({pct:.1f}%)')

print(f'\n  Wheat no_yeast slug dağılımı:')
for s, n in wheat_no_yeast_slug.most_common():
    pct = n/wheat_no_yeast_total*100
    print(f'    {s:<32} {n:>5}  ({pct:.1f}%)')

print(f'\n  Wheat no_yeast source dağılımı:')
for s, n in wheat_no_yeast_sources.most_common():
    pct = n/wheat_no_yeast_total*100
    print(f'    {s:<14} {n:>5}  ({pct:.1f}%)')

print(f'\n  Wheat no_yeast top 25 raw.yeast pattern:')
for raw, n in wheat_no_yeast_raws.most_common(25):
    print(f'    {n:>4}× {raw[:75]}')

# === SAVE JSON ===
v26_summary['_meta'] = {'v25_total':total_v25,'deleted':deleted,'v26_total':written,
                        'expected_v26':381929-5084,'match':written==(381929-5084)}
with open(OUT_SUM, 'w', encoding='utf-8') as f:
    json.dump(v26_summary, f, ensure_ascii=False, indent=2)
print(f'\n  V26 cluster özet JSON: {OUT_SUM}')

wheat_preview = {
    'total': wheat_total,
    'no_yeast': wheat_no_yeast_total,
    'no_yeast_pct': round(wheat_no_yeast_total/wheat_total*100, 2),
    'slug_dist': dict(wheat_slug_dist),
    'no_yeast_slug_dist': dict(wheat_no_yeast_slug),
    'no_yeast_source_dist': dict(wheat_no_yeast_sources),
    'no_yeast_top25_raw': wheat_no_yeast_raws.most_common(25),
}
with open(OUT_WHEAT, 'w', encoding='utf-8') as f:
    json.dump(wheat_preview, f, ensure_ascii=False, indent=2)
print(f'  Wheat preview JSON: {OUT_WHEAT}')

print(f'\n[{t()}] AŞAMA 6 TAMAM')
