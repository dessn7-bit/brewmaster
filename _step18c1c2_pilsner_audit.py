#!/usr/bin/env python3
"""Adim 18c-1c-2 ASAMA 1+2 — Pilsner cluster yeast parser audit (V24).
- V24'te pilsner cluster no_yeast 1610 receteyi cek
- Source + raw.yeast kategorize
- yeastmap lookup
- Mevcut KONSERVATIF pattern + yeni pattern oneri
- 68 cluster_yanlis_slug reslug kaydi (Asama 5'ten)
KOD DEGISIKLIGI YOK.
"""
import json, ijson, pickle, re, sys, os, time
from collections import Counter, defaultdict
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
T0 = time.time()
def t(): return f'{time.time()-T0:.1f}s'

ROOT = Path('C:/Users/Kaan/brewmaster')
V24 = ROOT / 'working' / '_v24_aliased_dataset.json'
YEASTMAP = ROOT / 'external' / '_rmwoods_dataset' / 'yeastmap.pickle'
OUT_NOYEAST = ROOT / 'working' / '_step18c1c2_pilsner_no_yeast.json'
OUT_AUDIT = ROOT / 'working' / '_step18c1c2_audit_report.json'
SUSP_76 = ROOT / 'working' / '_step18c1c1_phase5_suspicious_76_audit.json'
OUT_RESLUG = ROOT / 'working' / '_to_reslug_lager_mayasi_yanlis_slug.json'

PILSNER_SLUGS = {'german_pilsener', 'pre_prohibition_lager'}

YEAST_FLAGS = ['yeast_belgian','yeast_abbey','yeast_saison','yeast_kveik',
               'yeast_english','yeast_american','yeast_german_lager',
               'yeast_czech_lager','yeast_american_lager','yeast_kolsch',
               'yeast_altbier','yeast_cal_common','yeast_brett','yeast_lacto',
               'yeast_sour_blend','yeast_witbier','yeast_wheat_german','yeast_wit']

# === Mevcut Adim 18c-1c-1 KONSERVATIF yeast_german_lager ===
GERMAN_LAGER_RE = re.compile(
    r'\bw-?34/70|\bs-?23\b|\bs-?189|2124 bohemian|2206 bavarian|wlp830 german|wlp838 southern|wlp802|wlp840|'
    r'saflager|'
    r'wlp\s*0?(820|830|833|835|838|840|850|860|885|940)\b|'
    r'\b(2001|2002|2007|2042|2112|2124|2206|2247|2272|2278|2308|2487|2633)\b|'
    r'mangrove\s*jack.{0,30}(m\s*54|m\s*76|m\s*84)|'
    r'\b(m54|m76|m84)\s+(bavarian|munich|bohemian|lager)|'
    r'imperial\s*l\s*(13|17|28)\b|'
    r'\b(bock|doppelbock|maibock|hella\s*bock|munich|vienna|bavarian|oktoberfest|festbier|maerzen|rauchbier|dortmund|helles|schwarzbier|dunkel|budvar|czech\s*pils|danish|zurich|brewferm|diamond)\s+(lager|yeast)',
    re.IGNORECASE)

CZECH_LAGER_RE = re.compile(r'\bwy?\s*0?(2278|2272)|wlp802|bohemian', re.IGNORECASE)
AMERICAN_LAGER_RE = re.compile(r'\bwlp840|2007 pilsen|wy?2007', re.IGNORECASE)

# === ÖNERİ — KONSERVATIF YENİ pattern (Adim 18c-1c-2) ===
# Pilsner için alternation grup genişlet + parantez içi lager kombo
NEW_GERMAN_LAGER_RE = re.compile(
    r'\bw-?34/70|\bs-?23\b|\bs-?189|2124 bohemian|2206 bavarian|wlp830 german|wlp838 southern|wlp802|wlp840|'
    r'saflager|'
    r'wlp\s*0?(800|820|830|833|835|838|840|850|860|885|940)\b|'  # 800 (Pilsner Lager) eklendi
    r'\b(2001|2002|2007|2042|2112|2124|2206|2247|2272|2278|2308|2487|2633)\b|'
    r'mangrove\s*jack.{0,30}(m\s*54|m\s*76|m\s*84)|'
    r'\b(m54|m76|m84)\s+(bavarian|munich|bohemian|lager)|'
    r'imperial\s*l\s*(13|17|28)\b|'
    # Kombo extend: \s+(lager|yeast) | \s*\([^)]*lager (parantez içi lager)
    r'\b(bock|doppelbock|maibock|hella\s*bock|munich|vienna|bavarian|oktoberfest|festbier|maerzen|rauchbier|dortmund|helles|schwarzbier|dunkel|budvar|czech\s*pils|pilsner|urquell|original\s*pilsner|danish|zurich|brewferm|diamond)(?:\s+(lager|yeast)|\s*\([^)]*lager)',
    re.IGNORECASE)

# Brand markeri (parse OK isareti)
YEAST_BRAND_RE = re.compile(
    r'wyeast|wlp|safale|safbrew|safeale|saflager|lalvin|fermentis|omega|imperial|mangrove|white\s*labs|danstar|lallemand|escarpment|bry[-\s]?97|nottingham|windsor|us[-\s]?0?5|s[-\s]?0?4|t-?58|cl380|brewtek|the\s*yeast\s*bay|bsi|gigayeast|east\s*coast|s[-\s]?23|s[-\s]?189|w[-\s]?34/70',
    re.IGNORECASE)

# === ADIM 1: yeastmap LAGER analiz ===
print(f'[{t()}] yeastmap.pickle yukleniyor...')
with open(YEASTMAP, 'rb') as f: YMAP = pickle.load(f)
print(f'  yeastmap entry: {len(YMAP)}')

lager_terms = ['lager','pilsen','bohemian','munich','vienna','bavarian','oktoberfest','festbier','maerzen','dortmund','bock','helles','schwarzbier','dunkel','saflager','s-23','s-189','w-34/70','urquell','pilsner']
pilsner_canonicals = Counter()
pilsner_entries = []
for k, v in YMAP.items():
    s = str(v).lower(); kl = str(k).lower()
    if 'pils' in s or 'urquell' in s or 'pils' in kl or 'urquell' in kl:
        pilsner_canonicals[v] += 1
        pilsner_entries.append((k, v))
print(f'  yeastmap PILSNER-related entry: {len(pilsner_entries)}')
print(f'  Top 10 pilsner canonical:')
for c, n in pilsner_canonicals.most_common(10):
    print(f'    {c!r}: {n} variant')

# === ADIM 2: V24 stream + pilsner cluster + no_yeast filtre ===
print(f'\n[{t()}] V24 stream + pilsner no_yeast filtre...')
pilsner_no_yeast = []
pilsner_total = 0

with open(V24, 'rb') as f:
    for r in ijson.items(f, 'recipes.item'):
        slug = r.get('bjcp_slug')
        if slug not in PILSNER_SLUGS: continue
        pilsner_total += 1
        feat = r.get('features') or {}
        active_count = sum(1 for ff in YEAST_FLAGS if (feat.get(ff) or 0) >= 0.5)
        if active_count == 0:
            y = (r.get('raw') or {}).get('yeast') or (r.get('raw') or {}).get('yeasts')
            pilsner_no_yeast.append({
                'recipe_id': r.get('id'),
                'source': r.get('source'),
                'source_id': str(r.get('source_id')),
                'slug': slug,
                'name': r.get('name'),
                'raw_yeast': y if isinstance(y, str) else (None if y is None else str(y)[:200]),
                'sorte_raw': r.get('sorte_raw'),
            })

print(f'  pilsner cluster total: {pilsner_total}')
print(f'  pilsner no_yeast    : {len(pilsner_no_yeast)}')

# Source dağılımı
src = Counter(r['source'] for r in pilsner_no_yeast)
slug_dist = Counter(r['slug'] for r in pilsner_no_yeast)
print(f'\nA. Source dagilimi:')
for s, n in src.most_common():
    print(f'  {s:<14} {n:>5}  ({n/len(pilsner_no_yeast)*100:.1f}%)')
print(f'\nSlug dagilimi:')
for s, n in slug_dist.most_common():
    print(f'  {s:<28} {n:>5}  ({n/len(pilsner_no_yeast)*100:.1f}%)')

# === ADIM 3: kategorize ===
DELETE_THRESHOLD = 8
categories = {
    'null': [], 'empty': [], 'short_lt8': [], 'placeholder': [],
    'mevcut_german_lager_pattern': [],
    'mevcut_czech_lager_pattern': [],
    'mevcut_american_lager_pattern': [],
    'YENI_pattern_kurtarir': [],
    'yeast_brand_marker_only': [],
    'unrecognized': [],
}
PLACEHOLDER_RE = re.compile(r'^[-\s]*(default|placeholder)?[-\s,]*\(?(default|ale|lager)?[\s\w]*\d', re.IGNORECASE)

for r in pilsner_no_yeast:
    y = r['raw_yeast']
    if y is None: categories['null'].append(r); continue
    if not y.strip(): categories['empty'].append(r); continue
    ystr = y.lower().strip()
    if len(ystr) < DELETE_THRESHOLD: categories['short_lt8'].append(r); continue
    # Placeholder ("- - (default, ale, 75.0%)")
    if ystr.startswith('- -') or ystr == '- -' or 'default' in ystr[:20]:
        categories['placeholder'].append(r); continue
    # Mevcut pattern testleri
    if GERMAN_LAGER_RE.search(ystr):
        categories['mevcut_german_lager_pattern'].append(r); continue
    if CZECH_LAGER_RE.search(ystr):
        categories['mevcut_czech_lager_pattern'].append(r); continue
    if AMERICAN_LAGER_RE.search(ystr):
        categories['mevcut_american_lager_pattern'].append(r); continue
    # YENI pattern testi
    if NEW_GERMAN_LAGER_RE.search(ystr):
        categories['YENI_pattern_kurtarir'].append(r); continue
    # Brand markeri
    if YEAST_BRAND_RE.search(ystr):
        categories['yeast_brand_marker_only'].append(r); continue
    categories['unrecognized'].append(r)

print(f'\nB. Raw.yeast kategorize:')
print(f"  {'kategori':<35}{'sayi':>6}  {'%':>6}")
total = sum(len(v) for v in categories.values())
for cat in ['null','empty','short_lt8','placeholder','mevcut_german_lager_pattern',
            'mevcut_czech_lager_pattern','mevcut_american_lager_pattern',
            'YENI_pattern_kurtarir','yeast_brand_marker_only','unrecognized']:
    n = len(categories[cat])
    pct = n/total*100 if total else 0
    print(f'  {cat:<35}{n:>6}  {pct:>5.1f}%')
print(f'  TOPLAM: {total}')

# Top örnekler her kategori
print(f'\n=== Kategori örnekleri (top 10/kategori) ===')
for cat in ['placeholder','YENI_pattern_kurtarir','yeast_brand_marker_only','unrecognized']:
    if not categories[cat]: continue
    print(f'\n  {cat} ({len(categories[cat])}):')
    seen = Counter()
    for r in categories[cat]:
        y = (r['raw_yeast'] or '')[:80].lower().strip()
        seen[y] += 1
    for y, n in seen.most_common(10):
        print(f'    {n:>4}× {y}')

# === ADIM 4: yeastmap substring (unrecognized + brand_marker) ===
print(f'\n=== C. yeastmap substring match (unrecognized + brand_marker) ===')
target_cats = ['yeast_brand_marker_only','unrecognized']
ymap_pairs = list(YMAP.items())
ym_lager = ym_other = ym_no = 0
ym_examples = {'lager': [], 'other': []}
for cat in target_cats:
    for r in categories[cat]:
        y = (r['raw_yeast'] or '').lower().strip()
        longest = None
        for kk, vv in ymap_pairs:
            klow = str(kk).lower()
            if len(klow) >= 4 and klow in y:
                if longest is None or len(klow) > len(longest[0]): longest = (klow, vv)
        if longest:
            cstr = str(longest[1]).lower()
            if any(term in cstr for term in lager_terms):
                ym_lager += 1
                if len(ym_examples['lager']) < 5: ym_examples['lager'].append((y[:70], longest))
            else:
                ym_other += 1
                if len(ym_examples['other']) < 5: ym_examples['other'].append((y[:70], longest))
        else:
            ym_no += 1
print(f'  yeastmap lager match : {ym_lager}')
print(f'  yeastmap other match : {ym_other}')
print(f'  no match             : {ym_no}')
print(f'  Lager match örnekleri:')
for y, (k,v) in ym_examples['lager']:
    print(f'    "{y}" -> partial="{k}" canonical="{v}"')
print(f'  Other match örnekleri:')
for y, (k,v) in ym_examples['other']:
    print(f'    "{y}" -> partial="{k}" canonical="{v}"')

# === ADIM 5: FULL DATASET FP riski ===
print(f'\n[{t()}] FULL V24 yeni pattern FP/etki taramasi...')
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
LAGER_FAMILY = {'bock','lager','lager_dark','pilsner'}

new_total = 0
new_outside_lager = 0
outside_clusters = Counter()
outside_examples = []

with open(V24, 'rb') as f:
    for r in ijson.items(f, 'recipes.item'):
        y = (r.get('raw') or {}).get('yeast') or (r.get('raw') or {}).get('yeasts')
        if not isinstance(y, str): continue
        ystr = y.lower()
        old_match = bool(GERMAN_LAGER_RE.search(ystr))
        new_match = bool(NEW_GERMAN_LAGER_RE.search(ystr))
        if new_match and not old_match:
            new_total += 1
            slug = r.get('bjcp_slug')
            cluster = SLUG_TO_CLUSTER.get(slug, 'unmapped')
            if cluster not in LAGER_FAMILY:
                new_outside_lager += 1
                outside_clusters[cluster] += 1
                if len(outside_examples) < 30:
                    outside_examples.append({
                        'id': r.get('id'),'source': r.get('source'),
                        'slug': slug, 'cluster': cluster, 'raw_yeast': y[:120]
                    })

print(f'  yeni pattern net 0->1 toplam   : {new_total}')
print(f'  bunlardan lager-clusterleri DIŞINDA: {new_outside_lager}')
print(f'  FP oranı (lager dışı / toplam) : {new_outside_lager/new_total*100:.1f}% (yaklaşık)' if new_total else '0%')
print(f'  Lager dışı cluster dagilimi:')
for c, n in outside_clusters.most_common():
    print(f'    {c:<14} {n}')

# === ADIM 6: Tahmini kurtarma ===
print(f'\n=== D. Tahmini kurtarma ===')
recoverable_pilsner = len(categories['YENI_pattern_kurtarir'])
print(f'  Pilsner cluster içi yeni pattern kurtarir: {recoverable_pilsner} (%{recoverable_pilsner/len(pilsner_no_yeast)*100:.1f})')
print(f'  FULL dataset yeni pattern net 0->1: {new_total}')
print(f'  Lager-cluster içi: {new_total - new_outside_lager}')
print(f'  Lager-cluster dışı (FP/karışım): {new_outside_lager}')

# === SAVE pilsner no_yeast ===
print(f'\n=== JSON OUTPUT ===')
with open(OUT_NOYEAST, 'w', encoding='utf-8') as fp:
    json.dump(pilsner_no_yeast, fp, ensure_ascii=False, indent=2)
print(f'  pilsner no_yeast JSON: {OUT_NOYEAST} ({os.path.getsize(OUT_NOYEAST)/1024:.1f} KB)')

audit = {
    'meta': {'pilsner_total': pilsner_total, 'no_yeast': len(pilsner_no_yeast)},
    'source_dist': dict(src),
    'slug_dist': dict(slug_dist),
    'category_counts': {cat: len(items) for cat, items in categories.items()},
    'yeastmap_substring_pilsner_unrecognized': {
        'lager_match': ym_lager, 'other_match': ym_other, 'no_match': ym_no,
    },
    'yeastmap_pilsner_entries_count': len(pilsner_entries),
    'yeastmap_pilsner_canonicals_top10': pilsner_canonicals.most_common(10),
    'new_pattern_etki': {
        'pilsner_recoverable': recoverable_pilsner,
        'full_dataset_new_total': new_total,
        'full_dataset_outside_lager': new_outside_lager,
        'fp_pct_yaklasik': round(new_outside_lager/new_total*100, 1) if new_total else 0,
        'outside_clusters_dist': dict(outside_clusters),
    },
    'outside_lager_examples_30': outside_examples,
}
with open(OUT_AUDIT, 'w', encoding='utf-8') as fp:
    json.dump(audit, fp, ensure_ascii=False, indent=2)
print(f'  audit raporu: {OUT_AUDIT} ({os.path.getsize(OUT_AUDIT)/1024:.1f} KB)')

# === BONUS: 68 cluster_yanlis_slug reslug kaydi (Aşama 5'ten) ===
print(f'\n[{t()}] 68 cluster_yanlis_slug reslug kaydi olustur...')
with open(SUSP_76, 'r', encoding='utf-8') as f:
    susp = json.load(f)
yanlis = [r for r in susp['records'] if r.get('_kategori_oneri') == 'cluster_yanlis_slug']
# Heuristik öneri slug
def suggest_slug(rec):
    y = (rec['raw_yeast'] or '').lower()
    flags = rec.get('all_active_yeast_flags', [])
    # Czech Pilsner mayası → german_pilsener
    if 'czech pils' in y or 'wyeast 2278' in y or 'budvar' in y:
        return 'german_pilsener'
    # Wyeast 2112 California Lager → common_beer (California Common cluster=lager)
    if 'wyeast 2112' in y or 'california lager' in y or 'wlp810' in y:
        return 'common_beer'
    # Brewferm Lager → genel lager
    if 'brewferm' in y or 'diamond lager' in y:
        return 'american_lager'
    # WLP 8xx lager veya Wyeast 2xxx → genel lager
    if 'yeast_german_lager' in flags:
        return 'american_lager'  # fallback
    return 'unknown'

reslug_records = []
for rec in yanlis:
    rec2 = dict(rec)
    rec2['_suggested_slug'] = suggest_slug(rec)
    reslug_records.append(rec2)

with open(OUT_RESLUG, 'w', encoding='utf-8') as fp:
    json.dump({
        'meta': {
            'total': len(reslug_records),
            'description': 'Adim 18c-1c-1 Asama 5\'te bulunan 68 cluster_yanlis_slug reçete + heuristik oneri slug',
            'WARNING': 'BU SPRINT\'TE DOKUNULMAZ. Adim 18d (saison reslug) zamani toplu islem.'
        },
        'suggested_slug_dist': dict(Counter(r['_suggested_slug'] for r in reslug_records)),
        'records': reslug_records,
    }, fp, ensure_ascii=False, indent=2)
print(f'  reslug kaydi: {OUT_RESLUG} ({len(reslug_records)} recete, {os.path.getsize(OUT_RESLUG)/1024:.1f} KB)')

print(f'\n[{t()}] AUDIT TAMAM')
