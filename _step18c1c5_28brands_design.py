#!/usr/bin/env python3
"""Adim 18c-1c-5 — 28 brand pattern tasarim + FP testi + risk siniflandirma (V26).
KOD DEGISIKLIGI YOK. ASAMA 2 ONAY BEKLIYOR.
"""
import json, ijson, re, sys, os, time
from pathlib import Path
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
T0 = time.time()
def t(): return f'{time.time()-T0:.1f}s'

ROOT = Path('C:/Users/Kaan/brewmaster')
V26 = ROOT / 'working' / '_v26_aliased_dataset.json'
OUT_DESIGN = ROOT / 'working' / '_step18c1c5_28brands_pattern_design.json'
OUT_FP = ROOT / 'working' / '_step18c1c5_28brands_fp_test.json'
OUT_RISK = ROOT / 'working' / '_step18c1c5_risk_classification.json'

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

# === BRAND TASARIM TABLOSU ===
# (brand_id, pattern_proposal, target_yeast_feature, ok_clusters, expected_type_note)
BRANDS = [
    # GRUP 1 — Ale yeast (14)
    ('safbrew_t58',
     r'safbrew\s*[-\s]?t[\s-]?58|safbrew\s+specialty\s+ale\s+yeast\s+t[\s-]?58',
     'yeast_belgian', ['strong_ale','wheat','specialty','sour','saison'],
     'Fermentis dry Belgian-style ale (Witbier/Saison/Dubbel için kullanılır)'),
    ('safbrew_s33',
     r'safbrew\s*[-\s]?s[\s-]?33|safbrew\s+general/?belgian\s+yeast\s+s[\s-]?33',
     'yeast_belgian', ['strong_ale','wheat','specialty','brown_ale','pale_ale','saison'],
     'Fermentis dry Trappist-style ale'),
    ('dennys_favorite_50',
     r"denny.{0,3}s\s+favorite\s*50|wyeast\s*[\#\.]?\s*0?1450\b",
     'yeast_american', ['ipa','pale_ale','brown_ale','stout','porter','strong_ale'],
     'Wyeast 1450 American Ale — clean'),
    ('burton_ale_023',
     r'burton\s+ale\s+yeast|wlp\s*0?023\b',
     'yeast_english', ['ipa','pale_ale','brown_ale','stout','porter','strong_ale'],
     'WLP023 Burton Ale — English'),
    ('northwest_ale_1332',
     r'northwest\s+ale|wyeast\s*[\#\.]?\s*0?1332\b',
     'yeast_american', ['ipa','pale_ale','brown_ale','stout','porter'],
     'Wyeast 1332 NW Ale — American'),
    ('ringwood_ale_1187',
     r'ringwood\s+ale|wyeast\s*[\#\.]?\s*0?1187\b',
     'yeast_english', ['ipa','pale_ale','brown_ale','stout','porter'],
     'Wyeast 1187 Ringwood — English'),
    ('pacman_1764',
     r'\bpac\s*man\b|wyeast\s*[\#\.]?\s*0?1764\b|\(\s*1764\s*\)',
     'yeast_american', ['ipa','pale_ale','brown_ale','stout','porter'],
     'Wyeast 1764 Pacman — American (Rogue brewery)'),
    ('san_diego_super_090',
     r'san\s+diego\s+super(\s+yeast)?|wlp\s*0?090\b',
     'yeast_american', ['ipa','pale_ale','strong_ale','stout'],
     'WLP090 San Diego Super — American clean'),
    ('california_v_051',
     r'california\s+v\s+ale\s+yeast|wlp\s*0?051\b',
     'yeast_american', ['ipa','pale_ale','strong_ale'],
     'WLP051 California Ale V — American'),
    ('super_high_gravity_099',
     r'super\s+high\s+gravity(\s+ale)?|wlp\s*0?099\b',
     'yeast_american', ['strong_ale','stout','ipa'],
     'WLP099 Super High Gravity — American'),
    ('antwerp_ale_515',
     r'antwerp\s+ale\s+yeast|wlp\s*0?515\b',
     'yeast_belgian', ['strong_ale','wheat','specialty','pale_ale'],
     'WLP515 Antwerp — Belgian (clean Belgian)'),
    ('west_yorkshire_1469',
     r'west\s+yorkshire(\s+ale)?|wyeast\s*[\#\.]?\s*0?1469\b',
     'yeast_english', ['ipa','pale_ale','brown_ale','porter','stout'],
     'Wyeast 1469 West Yorkshire — English'),
    ('yorkshire_square_037',
     r'yorkshire\s+square\s+ale|wlp\s*0?037\b',
     'yeast_english', ['ipa','pale_ale','brown_ale','porter','stout'],
     'WLP037 Yorkshire Square — English'),
    ('manchester_ale',
     r'manchester\s+ale\s+yeast',
     'yeast_english', ['ipa','pale_ale','brown_ale','porter','stout'],
     'Manchester Ale — English (Boddingtons strain)'),

    # GRUP 2 — Wheat (7)
    ('american_wheat_1010',
     r'american\s+wheat(\s+ale)?(\s+yeast)?|wyeast\s*[\#\.]?\s*0?1010\b',
     'yeast_wheat_german', ['wheat','specialty'],
     'Wyeast 1010 American Wheat'),
    ('bavarian_wheat_3056',
     r'bavarian\s+wheat(\s+blend)?|wyeast\s*[\#\.]?\s*0?3056\b',
     'yeast_wheat_german', ['wheat','specialty'],
     'Wyeast 3056 Bavarian Wheat (blend with Saccharomyces)'),
    ('forbidden_fruit_3463',
     r'forbidden\s+fruit|wyeast\s*[\#\.]?\s*0?3463\b',
     'yeast_witbier', ['wheat','specialty','strong_ale'],
     'Wyeast 3463 Forbidden Fruit — Witbier'),
    ('brewferm_blanche',
     r'brewferm\s+blanche',
     'yeast_witbier', ['wheat','specialty'],
     'Brewferm Blanche dry — Witbier'),
    ('danstar_munich',
     r'danstar\s+munich|lallemand\s+munich(\s+wheat)?|munich\s+classic',
     'yeast_wheat_german', ['wheat','lager','lager_dark'],
     'Lallemand/Danstar Munich — German Wheat'),
    ('schneider_weisse',
     r'schneider\s*[-\s]?weisse|schneider.tap',
     'yeast_wheat_german', ['wheat'],
     'Schneider Weisse strain — German Wheat'),
    ('bells_oberon',
     r"bell.{0,3}s\s+oberon",
     'yeast_wheat_german', ['wheat'],
     'Bell\'s Oberon — American Wheat'),

    # GRUP 3 — Belgian (3 unique, 3 cakisma)
    ('belgian_golden_570',
     r'belgian\s+golden\s+ale\s+yeast|wlp\s*0?570\b',
     'yeast_belgian', ['strong_ale','wheat','saison'],
     'WLP570 Belgian Golden Ale — Belgian Strong Golden / Tripel'),
    ('belgian_strong_545',
     r'belgian\s+strong\s+ale\s+yeast|wlp\s*0?545\b',
     'yeast_belgian', ['strong_ale','specialty'],
     'WLP545 Belgian Strong Ale — Tripel/Quad'),
    ('european_ale_011',
     r'european\s+ale(\s+yeast)?|wlp\s*0?011\b',
     'yeast_english', ['pale_ale','brown_ale','strong_ale'],
     'WLP011 European Ale — German/Belgian hybrid (English-like)'),

    # GRUP 4 — Lager (5)
    ('oktoberfest_marzen_slash',
     r'oktoberfest[/\s]m[äa]rzen\s+lager(\s+yeast)?',
     'yeast_german_lager', ['lager','bock','pilsner','lager_dark'],
     'WLP820 Oktoberfest/Märzen — German Lager (/ karakter sorunu)'),
    ('mauribrew_lager',
     r'mauribrew\s+lager(\s+\d+)?|mauri\s+brew\s+lager',
     'yeast_german_lager', ['lager','pilsner','bock'],
     'Mauribrew Lager 497 — German Lager'),
    ('cry_havoc_862',
     r'cry\s+havoc(\s+yeast)?(\s+\(?wlp\s*0?862\)?)?|wlp\s*0?862\b',
     'yeast_german_lager', ['lager','pale_ale','ipa','brown_ale'],
     'WLP862 Cry Havoc — HİBRİT (ale+lager). 18c-1c-1\'de bilincli cikartilmisti'),
    ('us_west_coast_m44',
     r'\bm\s*44(\s+(?:us|west|west\s+coast))?|u\.?s\.?\s+west\s+coast(\s+yeast)?(\s+m\s*44)?|mangrove\s*jack.{0,15}m\s*44',
     'yeast_american', ['ipa','pale_ale','strong_ale'],
     'Mangrove Jack M44 US West Coast — ALE (lager DEĞİL, taxonomy düzeltme)'),
    ('octoberfest_lager_blend',
     r'octoberfest\s+lager\s+blend|oktoberfest\s+lager\s+blend',
     'yeast_german_lager', ['lager','bock','pilsner','lager_dark'],
     'Wyeast 2633 Octoberfest Blend — bare 2633 zaten yakalanir, brand kelimesi de eklensin'),

    # GRUP 5 — Format/typo (2)
    ('kolsh_typo',
     r'\bk[öo]lsh\b',
     'yeast_kolsch', ['pale_ale'],
     'Kölsch typo (h ile değil ş ile yazilmis) — yeast_kolsch'),
    ('wyeast_bare_numeric_extra',
     None,  # Sadece kontrol — mevcut yeast_german_lager bare numeric'te kapsalı 2278/2007/vs
     'yeast_kolsch', ['multiple'],
     'Mevcut wyeast bare numeric kontrol (yakalanma orani)'),
]

# Ek brand mevcut V26 features hangi flag yakalanır onu test
YEAST_FLAGS = ['yeast_belgian','yeast_abbey','yeast_saison','yeast_kveik',
               'yeast_english','yeast_american','yeast_german_lager',
               'yeast_czech_lager','yeast_american_lager','yeast_kolsch',
               'yeast_altbier','yeast_cal_common','yeast_brett','yeast_lacto',
               'yeast_sour_blend','yeast_witbier','yeast_wheat_german','yeast_wit']


def serialize_non_yeast(raw):
    parts = []
    for k, v in raw.items():
        if k in ('yeast','yeasts'): continue
        if isinstance(v, (str, int, float)): parts.append(str(v))
        elif isinstance(v, list):
            for item in v:
                if isinstance(item, dict):
                    for vv in item.values(): parts.append(str(vv))
                else: parts.append(str(item))
        elif isinstance(v, dict):
            for vv in v.values(): parts.append(str(vv))
    return ' '.join(parts).lower()


# === V26 stream + her brand icin tarama ===
print(f'[{t()}] V26 stream + 28 brand pattern + FP test...')
brand_results = {}
for bid, pat, target, ok_c, note in BRANDS:
    if pat is None: continue
    brand_results[bid] = {
        'pattern': pat,
        'target_feature': target,
        'expected_clusters': ok_c,
        'note': note,
        'yeast_match': 0,
        'features_already_caught': 0,
        'features_not_caught_yet': 0,
        'non_yeast_match': 0,
        'cluster_dist': defaultdict(int),
        'wrong_cluster_count': 0,
        'examples_TP': [],  # raw.yeast match
        'examples_FP': [],  # non-yeast match
        'examples_wrong_cluster': [],
    }
    brand_results[bid]['_compiled'] = re.compile(pat, re.IGNORECASE)

total = 0
with open(V26, 'rb') as f:
    for r in ijson.items(f, 'recipes.item'):
        total += 1
        if total % 50000 == 0:
            print(f'  [{t()}] scanned {total}')
        slug = r.get('bjcp_slug')
        cluster = SLUG_TO_CLUSTER.get(slug, 'unmapped')
        feat = r.get('features') or {}
        any_active = any((feat.get(k) or 0) >= 0.5 for k in YEAST_FLAGS)

        raw = r.get('raw') or {}
        y = raw.get('yeast') or raw.get('yeasts')
        ystr = (y if isinstance(y, str) else '').lower()
        non_yeast = serialize_non_yeast(raw) + ' ' + (r.get('name') or '').lower() + ' ' + (r.get('sorte_raw') or '').lower()

        for bid, br in brand_results.items():
            comp = br['_compiled']
            in_yeast = bool(comp.search(ystr))
            in_non = bool(comp.search(non_yeast))
            if in_yeast:
                br['yeast_match'] += 1
                if any_active: br['features_already_caught'] += 1
                else: br['features_not_caught_yet'] += 1
                br['cluster_dist'][cluster] += 1
                if cluster not in br['expected_clusters'] and 'multiple' not in br['expected_clusters']:
                    br['wrong_cluster_count'] += 1
                    if len(br['examples_wrong_cluster']) < 3:
                        br['examples_wrong_cluster'].append({
                            'recipe_id': r.get('id'),'source':r.get('source'),'slug': slug, 'cluster': cluster,
                            'raw_yeast': ystr[:100],
                        })
                if len(br['examples_TP']) < 3:
                    br['examples_TP'].append({
                        'recipe_id': r.get('id'),'source':r.get('source'),'slug': slug, 'cluster': cluster,
                        'raw_yeast': ystr[:100],
                    })
            if in_non and not in_yeast:
                br['non_yeast_match'] += 1
                if len(br['examples_FP']) < 3:
                    br['examples_FP'].append({
                        'recipe_id': r.get('id'),'source':r.get('source'),
                        'raw_yeast': ystr[:80],
                        'non_yeast_match_excerpt': re.sub(r'\s+',' ',non_yeast)[:200],
                    })

print(f'\n[{t()}] V26 scan tamam: total={total}')

# === Risk siniflandirma ===
def risk_classify(br):
    ym = br['yeast_match']
    nm = br['non_yeast_match']
    denom = ym + nm
    fp_pct = (nm / denom * 100) if denom else 0
    if fp_pct > 15: risk = 'YUKSEK'
    elif fp_pct > 5: risk = 'ORTA'
    else: risk = 'DUSUK'
    return risk, fp_pct

# === Sonuc tabloları ===
print('\n' + '=' * 95)
print('A. 28 BRAND PATTERN TASARIM TABLOSU (V26)')
print('=' * 95)
print(f"  {'brand_id':<26}{'V26 yeast':>10}{'caught':>8}{'not_yet':>8}{'non_yeast(FP)':>15}{'fp%':>8}{'risk':>10}{'wrong_cluster':>15}")
for bid, br in brand_results.items():
    if 'pattern' not in br: continue
    risk, fp_pct = risk_classify(br)
    br['risk'] = risk
    br['fp_pct'] = round(fp_pct, 2)
    print(f"  {bid:<26}{br['yeast_match']:>10}{br['features_already_caught']:>8}{br['features_not_caught_yet']:>8}{br['non_yeast_match']:>15}{fp_pct:>7.1f}%{risk:>10}{br['wrong_cluster_count']:>15}")

print('\n' + '=' * 95)
print('B. RİSK SINIFLANDIRMA')
print('=' * 95)
risk_groups = {'DUSUK':[], 'ORTA':[], 'YUKSEK':[]}
for bid, br in brand_results.items():
    if 'risk' in br:
        risk_groups[br['risk']].append((bid, br['fp_pct'], br['yeast_match']))

for r_label in ('DUSUK','ORTA','YUKSEK'):
    print(f'\n  {r_label} RİSK ({len(risk_groups[r_label])} brand):')
    for bid, fp, ym in sorted(risk_groups[r_label], key=lambda x: -x[2]):
        print(f'    {bid:<28} FP={fp:>5}%   yeast_match={ym}')

print('\n' + '=' * 95)
print('C. CROSS-FEATURE ÇAKIŞMA')
print('=' * 95)
target_groups = defaultdict(list)
for bid, br in brand_results.items():
    if 'pattern' in br:
        target_groups[br['target_feature']].append(bid)
print(f'  Hangi yeast feature\'a hangi brand pattern eklenecek:')
for feat, brands in sorted(target_groups.items()):
    print(f'    {feat:<22} ({len(brands)} brand): {brands}')

print('\n' + '=' * 95)
print('D. EDGE CASE TESPITLERI')
print('=' * 95)
print('  (sadece tespit, oneri YOK):')
print(f'  - cry_havoc_862: 18c-1c-1\'de bilincli cikartilmis (HIBRIT). 28 brand listesinde yeniden değerlendirme.')
print(f'  - us_west_coast_m44: M44 ALE, "u.s. west coast" string lager kelimesi içermez. yeast_american target. '
      f'Adim 18c-1c-1 mangrove M-series spesifik (M54/M76/M84) yakalama vardı, M44 dışarıda tutuldu.')
print(f'  - kolsh_typo: 1815 reçete, ana cluster pale_ale 1160 (kölsch için DOĞRU). Sadece typo düzeltme.')
print(f'  - antwerp_ale: GRUP 1 + GRUP 3 çakışma, target yeast_belgian (Belgian-style).')
print(f'  - safbrew_t58 / s33: GRUP 1 + GRUP 3 çakışma, yeast_belgian.')
print(f'  - manchester_ale + yorkshire_square_037: aynı WLP037 paylaşır.')
print(f'  - bavarian_wheat_3056: BLEND (S. cerevisiae + brett). yeast_wheat_german + brett çakışma riski.')
print(f'  - belgian_strong_545: V26\'da features.yeast_belgian zaten 1439/1439 yakalı (Adim 18c-1c-1 belgian kombo).')
print(f'  - octoberfest_lager_blend: bare 2633 numeric mevcut yakalı, brand kelimesi ek katkı az.')

# === SAVE ===
# Decimal/regex temizle
def clean(o):
    if isinstance(o, dict): return {k: clean(v) for k, v in o.items() if k != '_compiled'}
    if isinstance(o, list): return [clean(x) for x in o]
    if isinstance(o, defaultdict): return dict(o)
    return o

design_out = {bid: clean(br) for bid, br in brand_results.items()}
with open(OUT_DESIGN, 'w', encoding='utf-8') as f:
    json.dump(design_out, f, ensure_ascii=False, indent=2)
print(f'\n  design JSON: {OUT_DESIGN} ({os.path.getsize(OUT_DESIGN)/1024:.1f} KB)')

fp_out = {bid: {'pattern': br.get('pattern'),'yeast_match': br['yeast_match'],
                'non_yeast_match': br['non_yeast_match'],
                'fp_pct': br.get('fp_pct',0), 'risk': br.get('risk','?'),
                'examples_FP': br['examples_FP']}
          for bid, br in brand_results.items()}
with open(OUT_FP, 'w', encoding='utf-8') as f:
    json.dump(fp_out, f, ensure_ascii=False, indent=2)
print(f'  FP JSON: {OUT_FP} ({os.path.getsize(OUT_FP)/1024:.1f} KB)')

risk_out = {r: [(bid, brand_results[bid]['fp_pct'], brand_results[bid]['yeast_match']) for bid, _, _ in risk_groups[r]]
            for r in risk_groups}
with open(OUT_RISK, 'w', encoding='utf-8') as f:
    json.dump(risk_out, f, ensure_ascii=False, indent=2)
print(f'  risk JSON: {OUT_RISK} ({os.path.getsize(OUT_RISK)/1024:.1f} KB)')

print(f'\n[{t()}] DESIGN TAMAM')
