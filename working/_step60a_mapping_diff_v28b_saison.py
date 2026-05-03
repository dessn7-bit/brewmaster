"""
Adim 60a — V19/V6 mapping diff + V28b saison cluster guncel sayim
Read only. sha256 dogrulama.
"""
import ijson, json, hashlib, sys
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

V28B = 'working/_v28b_aliased_dataset.json'
V28B_SHA = '8359f033338e9aeb399850b72e202f9e70577a1639a87f81d3dde75bf820ae8a'
OUT_DIFF = 'working/_step60a_v19_v6_mapping_diff.json'
OUT_SAISON = 'working/_step60a_v28b_saison_guncel.json'

# V19 SLUG_TO_CLUSTER (16 cluster, _v19_train.py line 24-65)
V19_MAP = {
    'belgian_lambic': 'sour', 'oud_bruin': 'sour', 'berliner_weisse': 'sour',
    'mixed_fermentation_sour_beer': 'sour', 'brett_beer': 'sour',
    'fruit_beer': 'specialty', 'herb_and_spice_beer': 'specialty',
    'winter_seasonal_beer': 'specialty', 'smoked_beer': 'specialty',
    'specialty_beer': 'specialty', 'experimental_beer': 'specialty',
    'american_india_pale_ale': 'ipa', 'double_ipa': 'ipa', 'black_ipa': 'ipa',
    'juicy_or_hazy_india_pale_ale': 'ipa', 'british_india_pale_ale': 'ipa',
    'irish_dry_stout': 'stout', 'sweet_stout': 'stout', 'sweet_stout_or_cream_stout': 'stout',
    'oatmeal_stout': 'stout', 'stout': 'stout', 'american_imperial_stout': 'stout',
    'brown_porter': 'porter', 'robust_porter': 'porter', 'baltic_porter': 'porter', 'porter': 'porter',
    'american_pale_ale': 'pale_ale', 'english_pale_ale': 'pale_ale',
    'american_amber_red_ale': 'pale_ale', 'american_strong_pale_ale': 'pale_ale',
    'belgian_witbier': 'belgian', 'belgian_blonde_ale': 'belgian', 'belgian_dubbel': 'belgian',
    'belgian_tripel': 'belgian', 'belgian_strong_dark_ale': 'belgian',
    'belgian_strong_golden': 'belgian', 'belgian_quadrupel': 'belgian',
    'french_belgian_saison': 'saison', 'specialty_saison': 'saison', 'french_biere_de_garde': 'saison',
    'south_german_hefeweizen': 'wheat', 'south_german_dunkel_weizen': 'wheat',
    'south_german_weizenbock': 'wheat', 'american_wheat_ale': 'wheat', 'german_rye_ale': 'wheat',
    'american_lager': 'lager', 'german_pilsener': 'lager', 'pale_lager': 'lager',
    'pre_prohibition_lager': 'lager', 'munich_helles': 'lager', 'munich_dunkel': 'lager',
    'vienna_lager': 'lager', 'german_maerzen': 'lager', 'german_oktoberfest_festbier': 'lager',
    'german_schwarzbier': 'lager', 'dortmunder_european_export': 'lager', 'kellerbier': 'lager',
    'bamberg_maerzen_rauchbier': 'lager',
    'german_bock': 'bock', 'german_doppelbock': 'bock', 'german_heller_bock_maibock': 'bock',
    'dunkles_bock': 'bock',
    'american_brown_ale': 'brown', 'brown_ale': 'brown',
    'american_cream_ale': 'cream', 'cream_ale': 'cream', 'common_beer': 'cream',
    'german_koelsch': 'cream', 'german_altbier': 'cream',
    'mild': 'mild', 'irish_red_ale': 'mild',
    'blonde_ale': 'cream', 'golden_or_blonde_ale': 'cream',
    'ordinary_bitter': 'bitter', 'special_bitter_or_best_bitter': 'bitter',
    'extra_special_bitter': 'bitter', 'scottish_export': 'bitter', 'scotch_ale_or_wee_heavy': 'bitter',
    'old_ale': 'bitter',
    'american_barley_wine_ale': 'barleywine', 'american_barleywine': 'barleywine',
    'british_barley_wine_ale': 'barleywine',
    'flanders_red_ale': 'sour', 'belgian_gueuze': 'sour',
    'belgian_fruit_lambic': 'sour', 'gose': 'sour',
    'export_stout': 'stout',
    'red_ipa': 'ipa', 'white_ipa': 'ipa', 'rye_ipa': 'ipa',
    'belgian_ipa': 'belgian',
}

# V6 SLUG_TO_NEW_CLUSTER (14 cluster, _step6_v6_retrain_14cluster.py line 36-92)
V6_MAP = {
    'american_brown_ale':'brown_ale','mild':'brown_ale','brown_ale':'brown_ale',
    'irish_red_ale':'brown_ale','scottish_export':'brown_ale',
    'american_amber_red_ale':'brown_ale','german_altbier':'brown_ale',
    'french_biere_de_garde':'brown_ale',
    'german_doppelbock':'bock','german_heller_bock_maibock':'bock',
    'german_bock':'bock','dunkles_bock':'bock',
    'american_india_pale_ale':'ipa','double_ipa':'ipa',
    'british_india_pale_ale':'ipa','black_ipa':'ipa','white_ipa':'ipa',
    'red_ipa':'ipa','rye_ipa':'ipa','juicy_or_hazy_india_pale_ale':'ipa',
    'belgian_ipa':'ipa',
    'american_lager':'lager','german_maerzen':'lager','common_beer':'lager',
    'vienna_lager':'lager','munich_helles':'lager','pale_lager':'lager',
    'dortmunder_european_export':'lager','bamberg_maerzen_rauchbier':'lager',
    'kellerbier':'lager','german_oktoberfest_festbier':'lager',
    'german_schwarzbier':'lager_dark','munich_dunkel':'lager_dark',
    'american_pale_ale':'pale_ale','english_pale_ale':'pale_ale',
    'blonde_ale':'pale_ale','american_cream_ale':'pale_ale',
    'german_koelsch':'pale_ale','extra_special_bitter':'pale_ale',
    'special_bitter_or_best_bitter':'pale_ale','ordinary_bitter':'pale_ale',
    'german_pilsener':'pilsner','pre_prohibition_lager':'pilsner',
    'robust_porter':'porter','brown_porter':'porter',
    'baltic_porter':'porter','porter':'porter',
    'french_belgian_saison':'saison','specialty_saison':'saison',
    'berliner_weisse':'sour','flanders_red_ale':'sour','belgian_lambic':'sour',
    'belgian_fruit_lambic':'sour','oud_bruin':'sour',
    'mixed_fermentation_sour_beer':'sour','gose':'sour',
    'belgian_gueuze':'sour','brett_beer':'sour',
    'specialty_beer':'specialty','herb_and_spice_beer':'specialty',
    'fruit_beer':'specialty','winter_seasonal_beer':'specialty',
    'smoked_beer':'specialty','experimental_beer':'specialty',
    'american_imperial_stout':'stout','stout':'stout','oatmeal_stout':'stout',
    'sweet_stout':'stout','irish_dry_stout':'stout','export_stout':'stout',
    'belgian_tripel':'strong_ale','belgian_strong_dark_ale':'strong_ale',
    'american_barley_wine_ale':'strong_ale','scotch_ale_or_wee_heavy':'strong_ale',
    'belgian_strong_golden':'strong_ale','old_ale':'strong_ale',
    'british_barley_wine_ale':'strong_ale','american_strong_pale_ale':'strong_ale',
    'belgian_quadrupel':'strong_ale','belgian_blonde_ale':'strong_ale',
    'belgian_dubbel':'strong_ale',
    'american_wheat_ale':'wheat','south_german_hefeweizen':'wheat',
    'south_german_dunkel_weizen':'wheat','south_german_weizenbock':'wheat',
    'german_rye_ale':'wheat','belgian_witbier':'wheat',
}

YEAST_FEATS = ['yeast_abbey','yeast_altbier','yeast_american','yeast_american_lager',
    'yeast_belgian','yeast_brett','yeast_cal_common','yeast_czech_lager','yeast_english',
    'yeast_german_lager','yeast_kolsch','yeast_kveik','yeast_lacto','yeast_saison',
    'yeast_sour_blend','yeast_wheat_german','yeast_wit','yeast_witbier']

def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        while True:
            c = f.read(8 * 1024 * 1024)
            if not c: break
            h.update(c)
    return h.hexdigest()

# === STEP 1 — sha256
print('=== STEP 1 — sha256 ===', flush=True)
v28b_sha = sha(V28B)
print(f'V28b sha: {v28b_sha} ({"esit" if v28b_sha == V28B_SHA else "FARK"})')
if v28b_sha != V28B_SHA:
    raise SystemExit('SHA SAPMASI: iptal')

# === STEP 2 — V19 vs V6 mapping diff
print('\n=== STEP 2 — V19 vs V6 mapping diff ===', flush=True)
all_slugs = sorted(set(V19_MAP.keys()) | set(V6_MAP.keys()))
diff_table = []
v19_only = []
v6_only = []
same = 0
diff = 0

for slug in all_slugs:
    v19_c = V19_MAP.get(slug, 'YOK')
    v6_c = V6_MAP.get(slug, 'YOK')
    if v19_c == 'YOK':
        v6_only.append({'slug': slug, 'v6_cluster': v6_c})
    elif v6_c == 'YOK':
        v19_only.append({'slug': slug, 'v19_cluster': v19_c})
    elif v19_c != v6_c:
        diff += 1
        diff_table.append({
            'slug': slug,
            'v19_cluster': v19_c,
            'v6_cluster': v6_c,
        })
    else:
        same += 1

print(f'Toplam slug: {len(all_slugs)}')
print(f'V19 + V6 ortak ayni cluster: {same}')
print(f'V19 + V6 ortak farkli cluster: {diff}')
print(f'Sadece V19: {len(v19_only)}')
print(f'Sadece V6: {len(v6_only)}')
print()
print('Farkli mapping (diff slug listesi):')
for d in diff_table:
    print(f"  {d['slug']:35s} V19={d['v19_cluster']:12s} V6={d['v6_cluster']}")
print()
print('Sadece V19 (V6\'da yok):')
for d in v19_only:
    print(f"  {d['slug']:35s} V19={d['v19_cluster']}")
print('Sadece V6 (V19\'da yok):')
for d in v6_only:
    print(f"  {d['slug']:35s} V6={d['v6_cluster']}")

# Cluster bazli silinen kategoriler (V6'da olmayan)
v19_clusters = set(V19_MAP.values())
v6_clusters = set(V6_MAP.values())
v19_only_clusters = v19_clusters - v6_clusters
v6_only_clusters = v6_clusters - v19_clusters
print(f'\nV19 cluster set: {sorted(v19_clusters)}')
print(f'V6 cluster set: {sorted(v6_clusters)}')
print(f'V19\'da olup V6\'da olmayan cluster\'lar: {sorted(v19_only_clusters)}')
print(f'V6\'da olup V19\'da olmayan cluster\'lar: {sorted(v6_only_clusters)}')

# V19'da bu cluster'larda olan slug'lar V6'da hangi cluster'a gidiyor
v19_silinen_cluster_slugs = {}
for slug, v19c in V19_MAP.items():
    if v19c in v19_only_clusters:
        v6c = V6_MAP.get(slug, 'YOK')
        v19_silinen_cluster_slugs.setdefault(v19c, []).append({'slug': slug, 'v6_cluster': v6c})

print(f'\nV19\'da bulunup V6\'da olmayan cluster\'lardaki slug\'lar V6\'da:')
for v19c, slugs in v19_silinen_cluster_slugs.items():
    print(f'\n  V19 cluster {v19c} ({len(slugs)} slug):')
    for s in slugs:
        print(f"    {s['slug']:35s} V6 = {s['v6_cluster']}")

out_diff = {
    'meta': {
        'sprint': 'Adim 60a V19 vs V6 mapping diff',
        'rule_refs': ['KURAL 1.4', 'KURAL 4.4'],
    },
    'sha256_check': {'v28b': v28b_sha},
    'mapping_summary': {
        'v19_slug_count': len(V19_MAP),
        'v6_slug_count': len(V6_MAP),
        'common_same_cluster': same,
        'common_diff_cluster': diff,
        'v19_only_slugs': len(v19_only),
        'v6_only_slugs': len(v6_only),
        'v19_clusters': sorted(v19_clusters),
        'v6_clusters': sorted(v6_clusters),
        'v19_silinen_clusters_v6': sorted(v19_only_clusters),
        'v6_silinen_clusters_v19': sorted(v6_only_clusters),
    },
    'diff_table': diff_table,
    'v19_only_slugs': v19_only,
    'v6_only_slugs': v6_only,
    'v19_silinen_clusters_redirect': v19_silinen_cluster_slugs,
}

with open(OUT_DIFF, 'w', encoding='utf-8') as f:
    json.dump(out_diff, f, ensure_ascii=False, indent=2)

# === STEP 3 — V28b saison cluster guncel sayim (V19 mapping)
print('\n=== STEP 3 — V28b saison cluster guncel sayim ===', flush=True)
saison_slugs_v19 = [s for s, c in V19_MAP.items() if c == 'saison']
print(f'V19 saison cluster slug listesi: {saison_slugs_v19}')

slug_count = Counter()
yeast_dist = {fk: 0 for fk in YEAST_FEATS}
total_saison = 0
saison_no_saison_yeast = 0

with open(V28B, 'rb') as f:
    parser = ijson.items(f, 'recipes.item', use_float=True)
    for r in parser:
        slug = r.get('bjcp_slug') or ''
        if V19_MAP.get(slug) != 'saison':
            continue
        total_saison += 1
        slug_count[slug] += 1
        feats = r.get('features', {}) or {}
        for fk in YEAST_FEATS:
            if int(feats.get(fk, 0) or 0):
                yeast_dist[fk] += 1
        if int(feats.get('yeast_saison', 0) or 0) == 0:
            saison_no_saison_yeast += 1

def pct(n):
    return round(n/total_saison*100, 1) if total_saison else 0

print(f'\nV28b saison cluster total: {total_saison}')
print(f'\nSlug bazli dagilim:')
for slug, cnt in slug_count.most_common():
    print(f'  {slug:40s} {cnt:6d} ({pct(cnt)}%)')
print(f'\nYeast feature dagilimi:')
for fk in sorted(yeast_dist, key=lambda k: -yeast_dist[k]):
    print(f'  {fk:25s} {yeast_dist[fk]:6d} ({pct(yeast_dist[fk])}%)')
print(f'\nyeast_saison=0 (saison cluster icinde): {saison_no_saison_yeast} ({pct(saison_no_saison_yeast)}%)')

# Onceki rapor karsilastirma (working/_step60_saison_lager_yeast_dagilim_teshis.json)
import os
prev_rap = 'working/_step60_saison_lager_yeast_dagilim_teshis.json'
prev_compare = None
if os.path.exists(prev_rap):
    with open(prev_rap, 'r', encoding='utf-8') as f:
        prev = json.load(f)
    prev_total = prev['saison_cluster']['total']
    prev_no_saison = prev['saison_cluster']['no_saison_yeast_count']
    prev_compare = {
        'prev_total': prev_total,
        'guncel_total': total_saison,
        'fark': total_saison - prev_total,
        'prev_no_saison': prev_no_saison,
        'guncel_no_saison': saison_no_saison_yeast,
        'fark_no_saison': saison_no_saison_yeast - prev_no_saison,
        'guncel_mi': total_saison == prev_total and saison_no_saison_yeast == prev_no_saison,
    }
    print(f'\nOnceki rapor karsilastirma:')
    print(f'  total V28b: prev={prev_total} guncel={total_saison} fark={total_saison - prev_total}')
    print(f'  no_saison: prev={prev_no_saison} guncel={saison_no_saison_yeast} fark={saison_no_saison_yeast - prev_no_saison}')

out_saison = {
    'meta': {
        'sprint': 'Adim 60a V28b saison cluster guncel sayim',
        'rule_refs': ['KURAL 1.4', 'KURAL 4.4'],
        'cluster_mapping': 'V19 SLUG_TO_CLUSTER',
    },
    'sha256_check': {'v28b': v28b_sha, 'v28b_intact': v28b_sha == V28B_SHA},
    'v19_saison_slug_listesi': saison_slugs_v19,
    'v28b_saison_total': total_saison,
    'slug_breakdown': dict(slug_count),
    'yeast_distribution': {fk: {'count': c, 'pct': pct(c)} for fk, c in yeast_dist.items()},
    'yeast_saison_eq_0_count': saison_no_saison_yeast,
    'yeast_saison_eq_0_pct': pct(saison_no_saison_yeast),
    'onceki_rapor_karsilastirma': prev_compare,
}

with open(OUT_SAISON, 'w', encoding='utf-8') as f:
    json.dump(out_saison, f, ensure_ascii=False, indent=2)

print(f'\nCikti diff: {OUT_DIFF}')
print(f'Cikti saison: {OUT_SAISON}')
