#!/usr/bin/env python3
"""Adim 18c-1c-2 ASAMA 4 — V24 → V25 UNION rebuild + 7 madde audit.

1. V24 → V25 UNION (Adim 18c-1c-2 5 düzeltme)
2. UNION garantisi (1→0 = 0)
3. 18 yeast feature distribution V24 vs V25
4. Pilsner cluster özet
5. Lager cluster ailesi özet
6. LAGER DIŞI 0→1 TAM AUDIT (yeast_german_lager + yeast_czech_lager + yeast_american_lager)
7. Etkilenen DİĞER feature'lar shadow audit
8. Silme adayı listesi (tüm dataset)
"""
import json, ijson, re, sys, os, time
from pathlib import Path
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
T0 = time.time()
def t(): return f'{time.time()-T0:.1f}s'

ROOT = Path('C:/Users/Kaan/brewmaster')
V24 = ROOT / 'working' / '_v24_aliased_dataset.json'
V25 = ROOT / 'working' / '_v25_aliased_dataset.json'
OUT_FULL_CHG = ROOT / 'working' / '_step18c1c2_phase4_full_changes.json'
OUT_LAGER_OUT = ROOT / 'working' / '_step18c1c2_phase4_lager_outside_audit.json'
OUT_OTHER = ROOT / 'working' / '_step18c1c2_phase4_other_features_audit.json'
OUT_DELETE = ROOT / 'working' / '_step18c1c2_delete_candidates.json'

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
YEAST_FLAGS = ['yeast_belgian','yeast_abbey','yeast_saison','yeast_kveik',
               'yeast_english','yeast_american','yeast_german_lager',
               'yeast_czech_lager','yeast_american_lager','yeast_kolsch',
               'yeast_altbier','yeast_cal_common','yeast_brett','yeast_lacto',
               'yeast_sour_blend','yeast_witbier','yeast_wheat_german','yeast_wit']

# === Adim 18c-1c-2 IDENTIK PATTERN'LER ===
BELGIAN_YEAST_PATTERNS = [
    'wyeast 1214','wy1214','wyeast 1762','wy1762','wyeast 1388','wy1388',
    'wyeast 3787','wy3787','wyeast 3522','wy3522','wyeast 3864','wy3864',
    'wlp500','wlp 500','wlp530','wlp 530','wlp540','wlp 540','wlp565',
    'wlp 565','wlp570','wlp 570','wlp575','wlp 575','wlp590','wlp 590',
    'safbrew abbaye','lalbrew abbaye','lallemand abbaye','belle saison',
]
CLEAN_US05_PATTERNS = [
    'wyeast 1056','wy1056','wlp001','wlp 001','safale us-05',
    'safale us05','us-05','us05','bry-97','bry97','chico',
]
ABBEY_SUBSTR = ('abbey','trappist','wlp500','wlp 500','wlp530','wlp 530','wlp540','wlp 540','wlp575','wlp 575')

BRETT_RE = re.compile(
    r'brett(anomyces|y|ish|ed)?\b|'
    r'\bwlp\s*0?(644|645|648|650|651|652|653|654|655|656|660|665|670|671|672|4639)\b|'
    r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?5(112|151|526|512|733|378)\b|'
    r'\b5(112|151|526|512|733|378)\b|'
    r'bruxellensis|lambicus|drie|trois|clausenii|'
    r'\bwild\s*(ale|yeast|fermentation|brew)\b|'
    r'wildbrew\s*sour|philly\s*sour|lallemand\s*wild|omega\s*(?:yeast\s*)?(?:cosmic|saisonstein|hothead)|'
    r'\bfoeder\b|funky|farmhouse\s*sour|barrel\s*(?:aged\s*)?sour|'
    r'amalgamation|cosmic|hothead\s*ale|all\s*the\s*bretts|funkwerks|saisonstein',
    re.IGNORECASE)
LACTO_RE = re.compile(
    r'\blacto(bacillus)?\b|\bwlp\s*0?(67[127]|693|672|6727|677)\b|'
    r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?5(335|223|424)\b|'
    r'\b5(223|424)\b|'
    r'philly\s*sour',
    re.IGNORECASE)


def compute_yeast_flags(yeast_str_full):
    if not isinstance(yeast_str_full, str) or not yeast_str_full.strip():
        return {f: 0 for f in YEAST_FLAGS}
    y = yeast_str_full.lower()
    f = {}
    f['yeast_belgian'] = 1 if (any(p in y for p in BELGIAN_YEAST_PATTERNS) or
        re.search(r'belgian\s*(saison|ale|abbey|trappist|tripel|dubbel|witbier|lambic|farmhouse)|imperial\s*b[\s\-]?\d+', y)) else 0
    f['yeast_abbey'] = 1 if (any(s in y for s in ABBEY_SUBSTR) or
        re.search(r'abbaye|\b(?:wyeast|wy)\s*[\#\.]?\s*0?(1214|1762|3787|3789)\b', y)) else 0
    f['yeast_saison'] = 1 if re.search(r'saison|sasion|farmhouse|wallonia(n)?|saisonstein|saisonette|seizon|hommage|bugfarm|\b(3711|3724|3725|3726)\b|wlp\s*0?(565|566|568|590|585|670)\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?(3724|3711|3725|3726)\b', y) else 0
    f['yeast_kveik'] = 1 if re.search(r'\bkveik\b|voss|hornindal|lida|laerdal|aurland|stranda|granvin|sigmund|ebbegarden|opshaug|midtbust|gjernes', y) else 0
    f['yeast_english'] = 1 if re.search(r'\bwlp\s*0?(002|005|007|013|023|029)\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?(1098|1318|1968|1275)\b|\b1098\b|english\s+ale', y) else 0
    f['yeast_american'] = 1 if any(p in y for p in CLEAN_US05_PATTERNS) else 0
    f['yeast_german_lager'] = 1 if re.search(
        r'\bw-?34/70|\bs-?23\b|\bs-?189|2124 bohemian|2206 bavarian|'
        r'saflager|'
        r'wlp\s*0?(800|802|820|830|833|835|838|840|850|860|885|940)\b|'
        r'\b(2001|2002|2007|2042|2112|2124|2206|2247|2272|2278|2308|2487|2633)\b|'
        r'mangrove\s*jack.{0,30}(m\s*54|m\s*76|m\s*84)|'
        r'\b(m54|m76|m84)\s+(bavarian|munich|bohemian|lager)|'
        r'imperial\s*l\s*(13|17|28)\b|'
        r'\b(bock|doppelbock|maibock|hella\s*bock|munich|vienna|bavarian|oktoberfest|festbier|maerzen|rauchbier|dortmund|helles|schwarzbier|dunkel|budvar|czech\s+(?:pils|budejovice)|pilsner|urquell|original\s*pilsner|danish|zurich|brewferm|diamond)(?:\s+(lager|yeast)|\s*\([^)]*lager)',
        y) else 0
    f['yeast_czech_lager'] = 1 if re.search(r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?(2278|2272)\b|\b2278\b|wlp\s*0?802\b|bohemian', y) else 0
    f['yeast_american_lager'] = 1 if re.search(r'wlp\s*0?840\b|2007\s+pilsen|\b(?:wyeast|wy)\s*[\#\.]?\s*0?2007\b', y) else 0
    f['yeast_kolsch'] = 1 if re.search(r'k[oö]lsch|kolsch|wlp\s*0?(003|029)\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?2565\b|\b2565\b', y) else 0
    f['yeast_altbier'] = 1 if re.search(r'altbier|wlp\s*0?036\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?1338\b|\b1338\b', y) else 0
    f['yeast_cal_common'] = 1 if re.search(r'california\s+lager|wlp\s*0?810\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?2112\b|\b2112\b', y) else 0
    f['yeast_brett'] = 1 if BRETT_RE.search(y) else 0
    f['yeast_lacto'] = 1 if LACTO_RE.search(y) else 0
    f['yeast_sour_blend'] = 1 if re.search(r'sour\s*blend|mixed\s*culture|wildbrew\s*sour|sour\s*pitch|amalgamation|wild\s*ale\s*blend|the\s*funk|barrel\s*blend', y) else 0
    f['yeast_witbier'] = 1 if re.search(r'witbier|wlp\s*0?40[01]\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?3944\b|\b3944\b|hoegaarden|wit\s*ale|wit\s*yeast', y) else 0
    f['yeast_wheat_german'] = 1 if re.search(r'weihenstephan|wlp\s*0?(300|380)\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?3068\b|\b3068\b|wb[\s\-]?06|hefeweizen|munich\s*wheat', y) else 0
    f['yeast_wit'] = f['yeast_witbier']
    return f

def deep_clean(o):
    if isinstance(o, dict): return {k: deep_clean(v) for k, v in o.items()}
    if isinstance(o, list): return [deep_clean(x) for x in o]
    if hasattr(o, '__float__') and not isinstance(o, (bool, int, float)): return float(o)
    return o

def detect_pattern_type(y):
    """Hangi alt-pattern eslesti (audit raporu icin)."""
    if not y: return 'no_yeast_str'
    y = y.lower()
    matches = []
    if 'saflager' in y: matches.append('saflager')
    if re.search(r'wlp\s*0?(800|802|820|830|833|835|838|840|850|860|885|940)\b', y): matches.append('wlp_8xx')
    if re.search(r'\b(2001|2002|2007|2042|2112|2124|2206|2247|2272|2278|2308|2487|2633)\b', y): matches.append('lager_2xxx_numeric')
    if re.search(r'mangrove\s*jack', y): matches.append('mangrove')
    if re.search(r'imperial\s*l', y): matches.append('imperial_L')
    if re.search(r'\b(czech\s+(?:pils|budejovice)|pilsner|urquell|original\s*pilsner)\b', y): matches.append('pilsner_kombo')
    if re.search(r'\b(bock|doppelbock|maibock|munich|vienna|bavarian|oktoberfest|festbier|maerzen|rauchbier|dortmund|helles|schwarzbier|dunkel|budvar|danish|zurich|brewferm|diamond)\b', y): matches.append('bock_style_kombo')
    if re.search(r'\bw-?34/70|\bs-?23\b|\bs-?189', y): matches.append('saflager_code')
    return ','.join(sorted(matches)) if matches else 'unknown'

# === ADIM 1: V24 → V25 UNION rebuild ===
print(f'[{t()}] V24 → V25 UNION rebuild')

total = 0
changed_count = 0
before_active = Counter()
after_active = Counter()
delta_zero_to_one = Counter()
delta_one_to_zero = Counter()

cluster_total = Counter()
# Cluster x feature matrix (V24 vs V25)
cluster_feat_before = defaultdict(lambda: Counter())
cluster_feat_after = defaultdict(lambda: Counter())
cluster_no_yeast_before = Counter()
cluster_no_yeast_after = Counter()

# Lager DIŞI yeast_GL/CL/AL = 1 (V24 0 → V25 1)
lager_outside_audit = []

# Diğer feature'lar shadow audit
other_feat_changes = defaultdict(list)  # feature -> [{recipe_id, source, slug, cluster, raw_yeast, pattern}]

# Silme adayları
delete_candidates = defaultdict(list)
DELETE_THRESHOLD = 8
PLACEHOLDER_PAT = re.compile(r'^[-\s]*(?:default|placeholder)?\s*[-,\s]*\(?\s*default', re.IGNORECASE)

# Tam değişiklik kayıt
full_changes = []

with open(V24, 'rb') as fin, open(V25, 'w', encoding='utf-8') as fout:
    fout.write('{"recipes":[')
    first = False

    for r in ijson.items(fin, 'recipes.item'):
        total += 1
        if total % 50000 == 0:
            print(f'  [{t()}] scanned {total}, changed {changed_count}, lager_outside {len(lager_outside_audit)}')
        slug = r.get('bjcp_slug')
        cluster = SLUG_TO_CLUSTER.get(slug, 'unmapped')
        cluster_total[cluster] += 1
        feat = r.get('features') or {}
        old = {k: int(feat.get(k) or 0) for k in YEAST_FLAGS}

        raw = r.get('raw') or {}
        y = raw.get('yeast') or raw.get('yeasts')
        new_pat = compute_yeast_flags(y if isinstance(y, str) else None)
        new = {k: 1 if (old[k]==1 or new_pat[k]==1) else 0 for k in YEAST_FLAGS}

        for k in YEAST_FLAGS:
            if old[k]: before_active[k] += 1
            if new[k]: after_active[k] += 1
            if old[k]==0 and new[k]==1: delta_zero_to_one[k] += 1
            if old[k]==1 and new[k]==0: delta_one_to_zero[k] += 1
            cluster_feat_before[cluster][k] += old[k]
            cluster_feat_after[cluster][k] += new[k]

        no_old = sum(1 for k in YEAST_FLAGS if old[k]) == 0
        no_new = sum(1 for k in YEAST_FLAGS if new[k]) == 0
        if no_old: cluster_no_yeast_before[cluster] += 1
        if no_new: cluster_no_yeast_after[cluster] += 1

        # Lager DIŞI 0→1 yakalama (yeast_german_lager veya yeast_czech_lager veya yeast_american_lager)
        for lager_feat in ('yeast_german_lager','yeast_czech_lager','yeast_american_lager'):
            if old[lager_feat]==0 and new[lager_feat]==1 and cluster not in LAGER_FAMILY:
                lager_outside_audit.append({
                    'recipe_id': r.get('id'),
                    'source': r.get('source'),
                    'slug': slug,
                    'cluster': cluster,
                    'feature_triggered': lager_feat,
                    'raw_yeast': y if isinstance(y, str) else (None if y is None else str(y)[:300]),
                    'pattern': detect_pattern_type(y),
                })

        # Diğer feature shadow audit (Düzeltme 3 etkisi)
        for other_feat in ('yeast_english','yeast_kolsch','yeast_altbier','yeast_cal_common',
                           'yeast_witbier','yeast_wheat_german','yeast_brett','yeast_lacto','yeast_abbey'):
            if old[other_feat]==0 and new[other_feat]==1:
                if len(other_feat_changes[other_feat]) < 50:
                    other_feat_changes[other_feat].append({
                        'recipe_id': r.get('id'),
                        'source': r.get('source'),
                        'slug': slug,
                        'cluster': cluster,
                        'raw_yeast': (y[:120] if isinstance(y, str) else None),
                    })

        # Silme adayı
        if y is None:
            delete_candidates[cluster].append({
                'recipe_id': r.get('id'),'source': r.get('source'),'slug': slug,
                'cluster': cluster,'raw_yeast': None,'reason': 'null',
            })
        elif isinstance(y, str):
            ys = y.strip()
            if not ys:
                delete_candidates[cluster].append({
                    'recipe_id': r.get('id'),'source': r.get('source'),'slug': slug,
                    'cluster': cluster,'raw_yeast': '','reason': 'empty',
                })
            elif len(ys) < DELETE_THRESHOLD:
                delete_candidates[cluster].append({
                    'recipe_id': r.get('id'),'source': r.get('source'),'slug': slug,
                    'cluster': cluster,'raw_yeast': y[:50],'reason': f'short_lt{DELETE_THRESHOLD}',
                })
            elif PLACEHOLDER_PAT.match(ys):
                delete_candidates[cluster].append({
                    'recipe_id': r.get('id'),'source': r.get('source'),'slug': slug,
                    'cluster': cluster,'raw_yeast': y[:80],'reason': 'placeholder',
                })

        if old != new:
            changed_count += 1
            full_changes.append({
                'recipe_id': r.get('id'),
                'source': r.get('source'),
                'slug': slug,
                'cluster': cluster,
                'raw_yeast': (y[:200] if isinstance(y, str) else None),
                'flags_v24': old, 'flags_v25': new,
                'delta_0_to_1': [k for k in YEAST_FLAGS if old[k]==0 and new[k]==1],
            })

        # Update + write V25
        for k in YEAST_FLAGS:
            feat[k] = new[k]
        r['features'] = feat
        if first: fout.write(',')
        else: first = True
        json.dump(deep_clean(r), fout, ensure_ascii=False)

    fout.write('],"meta":{"version":"v25","date":"2026-05-03","based_on":"v24_aliased","yeast_pattern_version":"adim_18c1c2_5_duzeltme_paketi"}}')

print(f'\n[{t()}] V24 → V25 tamam: total={total}, changed={changed_count}')
print(f'  V25: {os.path.getsize(V25)/1024/1024:.1f} MB')

# UNION garantisi
total_one_to_zero = sum(delta_one_to_zero.values())
print(f'\nUNION garantisi: 1→0 toplam = {total_one_to_zero}')

# === ADIM 3: 18 yeast feature distribution V24 vs V25 ===
print('\n' + '=' * 95)
print('B. 18 yeast feature distribution V24 vs V25')
print('=' * 95)
print(f"  {'feature':<22}{'V24':>10}{'V25':>10}{'delta':>10}{'0→1':>10}{'1→0':>8}")
for k in YEAST_FLAGS:
    print(f"  {k:<22}{before_active[k]:>10}{after_active[k]:>10}{after_active[k]-before_active[k]:>+10}{delta_zero_to_one[k]:>10}{delta_one_to_zero[k]:>8}")

# === ADIM 4: Pilsner cluster özet ===
print('\n' + '=' * 95)
print('C. Pilsner cluster özet')
print('=' * 95)
n = cluster_total['pilsner']
nyb = cluster_no_yeast_before['pilsner']; nya = cluster_no_yeast_after['pilsner']
print(f'  pilsner total       : {n}')
print(f'  no_yeast V24→V25    : {nyb} ({nyb/n*100:.2f}%) → {nya} ({nya/n*100:.2f}%)  Δ {nya-nyb:+}')
for f_lager in ('yeast_german_lager','yeast_czech_lager','yeast_american_lager'):
    fb = cluster_feat_before['pilsner'][f_lager]
    fa = cluster_feat_after['pilsner'][f_lager]
    print(f'  {f_lager:<22} {fb:>5} → {fa:>5}  Δ {fa-fb:+}')

# === ADIM 5: Lager cluster ailesi ===
print('\n' + '=' * 95)
print('D. Lager cluster ailesi (bock+lager+lager_dark+pilsner)')
print('=' * 95)
print(f"  {'cluster':<14}{'total':>8}{'no_y V24':>11}{'no_y V25':>11}{'Δ':>5}{'GL V24':>9}{'GL V25':>9}{'Δ':>5}")
for c in ('bock','lager','lager_dark','pilsner'):
    n = cluster_total[c]
    nb = cluster_no_yeast_before[c]; na = cluster_no_yeast_after[c]
    glb = cluster_feat_before[c]['yeast_german_lager']; gla = cluster_feat_after[c]['yeast_german_lager']
    print(f"  {c:<14}{n:>8}{nb:>11}{na:>11}{na-nb:>+5}{glb:>9}{gla:>9}{gla-glb:>+5}")

# === ADIM 6: LAGER DIŞI 0→1 TAM AUDIT ===
print('\n' + '=' * 95)
print(f'E. LAGER DIŞI 0→1 yeast_GL/CL/AL TAM AUDIT')
print('=' * 95)
print(f'  toplam: {len(lager_outside_audit)}')
out_cluster = Counter(rec['cluster'] for rec in lager_outside_audit)
out_slug = Counter(rec['slug'] for rec in lager_outside_audit)
out_source = Counter(rec['source'] for rec in lager_outside_audit)
out_feat = Counter(rec['feature_triggered'] for rec in lager_outside_audit)
out_pattern = Counter(rec['pattern'] for rec in lager_outside_audit)
print(f'\n  feature_triggered dagilimi:')
for f, n in out_feat.most_common():
    print(f'    {f:<22} {n}')
print(f'\n  cluster dagilimi:')
for c, n in out_cluster.most_common():
    print(f'    {c:<14} {n}')
print(f'\n  source dagilimi:')
for s, n in out_source.most_common():
    print(f'    {s:<12} {n}')
print(f'\n  slug top 15:')
for s, n in out_slug.most_common(15):
    print(f'    {s:<32} {n}')
print(f'\n  pattern dagilimi:')
for p, n in out_pattern.most_common(15):
    print(f'    {p:<55} {n}')

with open(OUT_LAGER_OUT, 'w', encoding='utf-8') as f:
    json.dump({
        'meta': {'total': len(lager_outside_audit)},
        'cluster_dist': dict(out_cluster),
        'source_dist': dict(out_source),
        'slug_dist': dict(out_slug),
        'feature_triggered_dist': dict(out_feat),
        'pattern_dist': dict(out_pattern),
        'records': lager_outside_audit,
    }, f, ensure_ascii=False, indent=2)
print(f'\n  JSON: {OUT_LAGER_OUT} ({os.path.getsize(OUT_LAGER_OUT)/1024:.1f} KB)')

# === ADIM 7: Diğer feature shadow audit ===
print('\n' + '=' * 95)
print('F. Diğer feature shadow audit (Düzeltme 3 etkisi)')
print('=' * 95)
print(f"  {'feature':<22}{'V24':>10}{'V25':>10}{'Δ':>8}{'orneklem (50)':>16}")
for of in ('yeast_english','yeast_kolsch','yeast_altbier','yeast_cal_common',
           'yeast_witbier','yeast_wheat_german','yeast_brett','yeast_lacto','yeast_abbey'):
    print(f"  {of:<22}{before_active[of]:>10}{after_active[of]:>10}{after_active[of]-before_active[of]:>+8}{len(other_feat_changes[of]):>16}")

# yeast_english cluster bazinda dağılım
print(f'\n  yeast_english 0→1 cluster dagilimi (top 10):')
eng_cluster = Counter(rec['cluster'] for rec in other_feat_changes['yeast_english'])
for c, n in eng_cluster.most_common(10):
    print(f'    {c:<14} {n}')

with open(OUT_OTHER, 'w', encoding='utf-8') as f:
    json.dump({of: other_feat_changes[of] for of in other_feat_changes}, f, ensure_ascii=False, indent=2)
print(f'\n  JSON: {OUT_OTHER} ({os.path.getsize(OUT_OTHER)/1024:.1f} KB)')

# === ADIM 8: Silme adayı listesi ===
print('\n' + '=' * 95)
print(f'G. Silme adayı listesi (raw.yeast null/empty/<8char/placeholder)')
print('=' * 95)
total_delete = sum(len(v) for v in delete_candidates.values())
print(f'  toplam: {total_delete}')
print(f"  {'cluster':<14}{'sayı':>8}{'cluster_total':>16}{'oran':>10}")
all_reason = Counter()
for c in ('bock','brown_ale','ipa','lager','lager_dark','pale_ale','pilsner','porter',
          'saison','sour','specialty','stout','strong_ale','wheat','unmapped'):
    n = len(delete_candidates[c])
    ct = cluster_total[c]
    pct = n/ct*100 if ct else 0
    print(f"  {c:<14}{n:>8}{ct:>16}{pct:>9.2f}%")
    for rec in delete_candidates[c]: all_reason[rec['reason']] += 1
print(f'\n  Reason dağılımı:')
for r, n in all_reason.most_common():
    print(f'    {r:<14} {n}')

flat_delete = []
for c, recs in delete_candidates.items(): flat_delete.extend(recs)
with open(OUT_DELETE, 'w', encoding='utf-8') as f:
    json.dump({
        'meta': {'total': total_delete,
                 'criteria': f'raw.yeast null OR empty OR <{DELETE_THRESHOLD} char OR placeholder',
                 'WARNING': 'HIÇBIR REÇETE SILINMEDI. Sadece liste.'},
        'cluster_counts': {c: len(delete_candidates[c]) for c in delete_candidates},
        'reason_counts': dict(all_reason),
        'records': flat_delete,
    }, f, ensure_ascii=False, indent=2)
print(f'\n  JSON: {OUT_DELETE} ({os.path.getsize(OUT_DELETE)/1024:.1f} KB)')

# Tam değişiklik
with open(OUT_FULL_CHG, 'w', encoding='utf-8') as f:
    json.dump(full_changes, f, ensure_ascii=False)
print(f'\n  Tam değişiklik JSON: {OUT_FULL_CHG} ({len(full_changes)} kayıt, {os.path.getsize(OUT_FULL_CHG)/1024/1024:.2f} MB)')

print(f'\n[{t()}] AUDIT TAMAM')
