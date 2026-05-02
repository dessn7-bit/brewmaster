#!/usr/bin/env python3
"""Adim 18c-1c-1 ASAMA 5 — V23 → V24 silme + 76 supheli audit + V24 cluster ozet.

1. V23 -> V24 (1402 silme adayi cikar)
2. 76 supheli (apa 35 + aipa 30 + altbier 11) tek tek audit
3. V24 15 cluster ozet + pilsner top raw.yeast pattern
"""
import json, ijson, re, sys, os, time
from pathlib import Path
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
T0 = time.time()
def t(): return f'{time.time()-T0:.1f}s'

ROOT = Path('C:/Users/Kaan/brewmaster')
V23 = ROOT / 'working' / '_v23_aliased_dataset.json'
V24 = ROOT / 'working' / '_v24_aliased_dataset.json'
DELETE_LIST = ROOT / 'working' / '_step18c1c1_delete_candidates.json'
LAGER_OUTSIDE = ROOT / 'working' / '_step18c1c1_phase4_lager_outside_audit.json'
OUT_SUSP = ROOT / 'working' / '_step18c1c1_phase5_suspicious_76_audit.json'
OUT_V24_SUM = ROOT / 'working' / '_step18c1c1_phase5_v24_clusters_summary.json'

SLUG_TO_CLUSTER = {
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

YEAST_FLAGS = ['yeast_belgian','yeast_abbey','yeast_saison','yeast_kveik',
               'yeast_english','yeast_american','yeast_german_lager',
               'yeast_czech_lager','yeast_american_lager','yeast_kolsch',
               'yeast_altbier','yeast_cal_common','yeast_brett','yeast_lacto',
               'yeast_sour_blend','yeast_witbier','yeast_wheat_german','yeast_wit']

# === ADIM A: Silme listesi ID set ===
print(f'[{t()}] silme listesi yukleniyor...')
with open(DELETE_LIST, 'r', encoding='utf-8') as f:
    delete_data = json.load(f)
delete_ids = set(rec['recipe_id'] for rec in delete_data['records'])
print(f'  silinecek ID sayisi: {len(delete_ids)}')

# === ADIM B: 76 supheli reçete ID set ===
print(f'\n[{t()}] 76 supheli reçete listesi (lager_outside_audit\'tan)...')
with open(LAGER_OUTSIDE, 'r', encoding='utf-8') as f:
    lager_out = json.load(f)
SUSP_SLUGS = {'american_pale_ale', 'american_india_pale_ale', 'german_altbier'}
suspicious_records = [rec for rec in lager_out['records'] if rec['slug'] in SUSP_SLUGS]
suspicious_ids = set(rec['recipe_id'] for rec in suspicious_records)
print(f'  76 supheli ID sayisi: {len(suspicious_ids)}')

# === Pattern alt kategori belirleyici ===
def detect_pattern(yeast_str):
    if not yeast_str: return 'no_yeast_str'
    y = yeast_str.lower()
    matches = []
    if 'saflager' in y: matches.append('saflager')
    if re.search(r'wlp\s*0?(820|830|833|835|838|840|850|860|885|940)\b', y): matches.append('wlp_8xx')
    if re.search(r'\b(2001|2002|2007|2042|2112|2124|2206|2247|2272|2278|2308|2487|2633)\b', y): matches.append('wyeast_2xxx_numeric')
    if re.search(r'mangrove\s*jack.{0,30}(m\s*54|m\s*76|m\s*84)|\b(m54|m76|m84)\s+(bavarian|munich|bohemian|lager)', y): matches.append('mangrove_M')
    if re.search(r'imperial\s*l\s*(13|17|28)\b', y): matches.append('imperial_L')
    if re.search(r'\b(bock|doppelbock|maibock|hella\s*bock|munich|vienna|bavarian|oktoberfest|festbier|maerzen|rauchbier|dortmund|helles|schwarzbier|dunkel|budvar|czech\s*pils|danish|zurich|brewferm|diamond)\s+(lager|yeast)', y): matches.append('bock_style_kombo')
    if re.search(r'\bw-?34/70|\bs-?23\b|\bs-?189|2124 bohemian|2206 bavarian|wlp830 german|wlp838 southern|wlp802|wlp840', y): matches.append('mevcut_pattern_ESKI')
    return ','.join(sorted(matches)) if matches else 'no_pattern'

def deep_clean(o):
    if isinstance(o, dict): return {k: deep_clean(v) for k, v in o.items()}
    if isinstance(o, list): return [deep_clean(x) for x in o]
    if hasattr(o, '__float__') and not isinstance(o, (bool, int, float)): return float(o)
    return o

# === ADIM 1+3: V23 stream → V24 yaz + V24 cluster sayım + 76 detay topla ===
print(f'\n[{t()}] V23 stream → V24 yaz + sayım + 76 detay')

total_v23 = 0
deleted = 0
written_v24 = 0

cluster_total = Counter()
cluster_no_yeast = Counter()
cluster_yeast_german_lager = Counter()

# Pilsner: top raw.yeast pattern + source
pilsner_no_yeast_raws = Counter()
pilsner_no_yeast_sources = Counter()
pilsner_no_yeast_total = 0

# 76 supheli detay
suspicious_detail = []

with open(V23, 'rb') as fin, open(V24, 'w', encoding='utf-8') as fout:
    fout.write('{"recipes":[')
    first = False

    for r in ijson.items(fin, 'recipes.item'):
        total_v23 += 1
        if total_v23 % 50000 == 0:
            print(f'  [{t()}] v23 scanned {total_v23}, written {written_v24}, deleted {deleted}')
        rid = r.get('id')

        # 76 supheli detay topla (silinmeden once)
        if rid in suspicious_ids:
            raw = r.get('raw') or {}
            y = raw.get('yeast') or raw.get('yeasts')
            feat = r.get('features') or {}
            active = [fname for fname in YEAST_FLAGS if (feat.get(fname) or 0) >= 0.5]
            slug = r.get('bjcp_slug')
            cluster = SLUG_TO_CLUSTER.get(slug, 'unmapped')
            suspicious_detail.append({
                'recipe_id': rid,
                'source': r.get('source'),
                'source_id': str(r.get('source_id')),
                'name': r.get('name'),
                'slug': slug,
                'cluster': cluster,
                'raw_yeast': y if isinstance(y, str) else (None if y is None else str(y)[:300]),
                'pattern_detected': detect_pattern(y if isinstance(y, str) else None),
                'all_active_yeast_flags': active,
                'sorte_raw': r.get('sorte_raw'),
            })

        # Silinecek mi
        if rid in delete_ids:
            deleted += 1
            continue

        # V24'e yaz
        slug = r.get('bjcp_slug')
        cluster = SLUG_TO_CLUSTER.get(slug, 'unmapped')
        cluster_total[cluster] += 1

        feat = r.get('features') or {}
        active_count = sum(1 for fname in YEAST_FLAGS if (feat.get(fname) or 0) >= 0.5)
        if active_count == 0:
            cluster_no_yeast[cluster] += 1
            if cluster == 'pilsner':
                raw = r.get('raw') or {}
                y = raw.get('yeast') or raw.get('yeasts')
                if isinstance(y, str):
                    pilsner_no_yeast_raws[y.lower().strip()[:80]] += 1
                pilsner_no_yeast_sources[r.get('source')] += 1
                pilsner_no_yeast_total += 1
        if (feat.get('yeast_german_lager') or 0) >= 0.5:
            cluster_yeast_german_lager[cluster] += 1

        if first: fout.write(',')
        else: first = True
        json.dump(deep_clean(r), fout, ensure_ascii=False)
        written_v24 += 1

    fout.write('],"meta":{"version":"v24","date":"2026-05-03","based_on":"v23_aliased","note":"1402 receipt deleted (raw.yeast null/empty/<8char)"}}')

print(f'\n[{t()}] V23 → V24 tamam:')
print(f'  V23 total: {total_v23}')
print(f'  silinen  : {deleted}')
print(f'  V24 total: {written_v24} (beklenen 381929: {written_v24==381929})')
print(f'  V24 dosya boyutu: {os.path.getsize(V24)/1024/1024:.1f} MB')

# === KATMAN 2 — 76 supheli kategori ===
print('\n' + '=' * 95)
print('B. 76 SUPHELI RECETE TEK TEK AUDIT')
print('=' * 95)
print(f'  toplam: {len(suspicious_detail)}')
slug_counter = Counter(rec['slug'] for rec in suspicious_detail)
print(f'  slug dagilimi:')
for s, n in slug_counter.most_common():
    print(f'    {s:<32} {n}')

# Pattern dagilimi (hangi pattern eslesti)
pat_counter = Counter(rec['pattern_detected'] for rec in suspicious_detail)
print(f'\n  Pattern dagilimi:')
for p, n in pat_counter.most_common():
    print(f'    {p:<40} {n}')

# Manuel kategori (heuristik): cluster yanlış slug / gerçek karışım / FP / belirsiz
def categorize(rec):
    """Heuristik kategoriler — Kaan onayi sonrasi son karar.
    - cluster_yanlis_slug: slug yanlış sınıflandırılmış (örn. APA slug ama gerçek lager reçetesi).
      Sinyal: pattern saflager/wlp 8xx/wyeast 2xxx numeric (lager-spesifik brand)
    - gercek_karisim: hibrit reçete (Cold IPA, Cream Ale + lager yeast)
      Sinyal: bock_style_kombo + ALE clean yeast da var
    - FP: pattern yanlış eslesti
      Sinyal: bock_style_kombo + sadece ale brand string
    - belirsiz
    """
    p = rec['pattern_detected']
    raw = (rec['raw_yeast'] or '').lower()
    flags = rec['all_active_yeast_flags']
    has_ale_yeast = any(f in flags for f in ['yeast_american','yeast_english','yeast_kolsch','yeast_altbier'])

    if 'saflager' in p or 'wlp_8xx' in p or 'wyeast_2xxx_numeric' in p or 'mangrove_M' in p or 'imperial_L' in p:
        # Lager-spesifik brand var
        if has_ale_yeast:
            return 'gercek_karisim'
        else:
            return 'cluster_yanlis_slug'
    elif 'bock_style_kombo' in p:
        # Sadece kombo — bock-style isim + lager/yeast
        # german_altbier slug → altbier ALE (cluster brown_ale doğru)
        if rec['slug'] == 'german_altbier':
            # "altbier yeast" pattern: altbier ALE, lager flag YANLIŞ olabilir
            return 'FP_altbier_ale'
        else:
            # Cold IPA / Cream Ale gerçek karışım olabilir
            if has_ale_yeast:
                return 'gercek_karisim'
            else:
                return 'cluster_yanlis_slug'
    else:
        return 'belirsiz'

cat_counter = Counter()
cat_examples = defaultdict(list)
for rec in suspicious_detail:
    cat = categorize(rec)
    rec['_kategori_oneri'] = cat
    cat_counter[cat] += 1
    if len(cat_examples[cat]) < 5:
        cat_examples[cat].append(rec)

print(f'\n  Heuristik kategori önerisi:')
for c, n in cat_counter.most_common():
    print(f'    {c:<28} {n}')

print('\n  Kategori örnekleri (5/kategori):')
for cat, exs in cat_examples.items():
    print(f'\n  === {cat} ({cat_counter[cat]}) ===')
    for rec in exs:
        raw = (rec['raw_yeast'] or '')[:90]
        print(f'    [{rec["source"]:<10}] {rec["slug"]:<28} raw="{raw}"')
        print(f'      pattern={rec["pattern_detected"]}  flags={rec["all_active_yeast_flags"]}')

# 76 supheli JSON
with open(OUT_SUSP, 'w', encoding='utf-8') as f:
    json.dump({
        'meta': {'total': len(suspicious_detail)},
        'slug_counts': dict(slug_counter),
        'pattern_counts': dict(pat_counter),
        'category_counts': dict(cat_counter),
        'records': suspicious_detail,
    }, f, ensure_ascii=False, indent=2)
print(f'\n  76 supheli JSON: {OUT_SUSP} ({os.path.getsize(OUT_SUSP)/1024:.1f} KB)')

# === KATMAN 3 — V24 cluster özet ===
print('\n' + '=' * 95)
print('C. V24 15 cluster özet (V23 ile karsilastirma)')
print('=' * 95)
print(f"  {'cluster':<14}{'V24_total':>12}{'V24_no_yeast':>16}{'no_yeast %':>14}{'yeast_GL aktif':>18}")
clusters_order = ['bock','brown_ale','ipa','lager','lager_dark','pale_ale','pilsner',
                  'porter','saison','sour','specialty','stout','strong_ale','wheat','unmapped']
v24_summary = {}
for c in clusters_order:
    n = cluster_total[c]
    ny = cluster_no_yeast[c]
    gl = cluster_yeast_german_lager[c]
    pct = ny/n*100 if n>0 else 0
    print(f"  {c:<14}{n:>12}{ny:>16}{pct:>13.2f}%{gl:>18}")
    v24_summary[c] = {'total':n,'no_yeast':ny,'no_yeast_pct':round(pct,2),'yeast_german_lager':gl}
print(f'  {"TOPLAM":<14}{sum(cluster_total.values()):>12}{sum(cluster_no_yeast.values()):>16}')

# === Pilsner detay ===
print('\n' + '=' * 95)
print('D. PILSNER cluster detay (Adim 18c-1c-2 hazirlik)')
print('=' * 95)
print(f'  pilsner V24 total       : {cluster_total["pilsner"]}')
print(f'  pilsner V24 no_yeast    : {cluster_no_yeast["pilsner"]} ({cluster_no_yeast["pilsner"]/cluster_total["pilsner"]*100:.2f}%)')
print(f'  pilsner V24 yeast_GL    : {cluster_yeast_german_lager["pilsner"]}')
print(f'\n  V23 vs V24 (silme etki):')
print(f'    V23 pilsner: 6656 total, 1649 no_yeast (24.78%)')
print(f'    V24 pilsner: {cluster_total["pilsner"]} total, {cluster_no_yeast["pilsner"]} no_yeast ({cluster_no_yeast["pilsner"]/cluster_total["pilsner"]*100:.2f}%)')
print(f'    silindi (raw.yeast eksik): {6656 - cluster_total["pilsner"]}')

print(f'\n  Pilsner no_yeast source dagilimi:')
for s, n in pilsner_no_yeast_sources.most_common():
    pct = n/pilsner_no_yeast_total*100 if pilsner_no_yeast_total else 0
    print(f'    {s:<14} {n:>5}  ({pct:.1f}%)')

print(f'\n  Pilsner no_yeast top 25 raw.yeast pattern (en sık):')
for raw, n in pilsner_no_yeast_raws.most_common(25):
    print(f'    {n:>5}× {raw[:75]}')

# V24 cluster özet JSON
with open(OUT_V24_SUM, 'w', encoding='utf-8') as f:
    json.dump({
        'meta': {
            'v23_total': total_v23,
            'deleted': deleted,
            'v24_total': written_v24,
            'expected_v24': 381929,
            'match': written_v24 == 381929,
        },
        'v24_cluster_summary': v24_summary,
        'pilsner_detail': {
            'total': cluster_total['pilsner'],
            'no_yeast': cluster_no_yeast['pilsner'],
            'no_yeast_pct': round(cluster_no_yeast['pilsner']/cluster_total['pilsner']*100, 2) if cluster_total['pilsner'] else 0,
            'yeast_german_lager': cluster_yeast_german_lager['pilsner'],
            'no_yeast_sources': dict(pilsner_no_yeast_sources),
            'no_yeast_top_raw_25': pilsner_no_yeast_raws.most_common(25),
        },
    }, f, ensure_ascii=False, indent=2)
print(f'\n  V24 cluster özet JSON: {OUT_V24_SUM} ({os.path.getsize(OUT_V24_SUM)/1024:.1f} KB)')

print(f'\n[{t()}] AUDIT TAMAM')
