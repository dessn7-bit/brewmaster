#!/usr/bin/env python3
"""Adim 18c-1c-2 ASAMA 2.6 — V24 tam sayim + 18 yeast pattern hardcoded/grup audit.
KOD DEGISIKLIGI YOK.
"""
import json, ijson, re, sys, os, time
from pathlib import Path
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
T0 = time.time()
def t(): return f'{time.time()-T0:.1f}s'

ROOT = Path('C:/Users/Kaan/brewmaster')
V24 = ROOT / 'working' / '_v24_aliased_dataset.json'
OUT_COUNT = ROOT / 'working' / '_step18c1c2_phase26_v24_count.json'
OUT_AUDIT = ROOT / 'working' / '_step18c1c2_phase26_pattern_audit.json'

SLUG_TO_CLUSTER = {  # (truncated for brevity, will load via import)
    'german_pilsener':'pilsner','pre_prohibition_lager':'pilsner',
    'german_doppelbock':'bock','german_heller_bock_maibock':'bock','german_bock':'bock','dunkles_bock':'bock',
    'american_lager':'lager','german_maerzen':'lager','common_beer':'lager','vienna_lager':'lager',
    'munich_helles':'lager','pale_lager':'lager','dortmunder_european_export':'lager',
    'bamberg_maerzen_rauchbier':'lager','kellerbier':'lager','german_oktoberfest_festbier':'lager',
    'german_schwarzbier':'lager_dark','munich_dunkel':'lager_dark',
    'american_brown_ale':'brown_ale','mild':'brown_ale','brown_ale':'brown_ale',
    'irish_red_ale':'brown_ale','scottish_export':'brown_ale','american_amber_red_ale':'brown_ale',
    'german_altbier':'brown_ale','french_biere_de_garde':'brown_ale',
    'american_india_pale_ale':'ipa','double_ipa':'ipa','british_india_pale_ale':'ipa',
    'black_ipa':'ipa','white_ipa':'ipa','red_ipa':'ipa','rye_ipa':'ipa',
    'juicy_or_hazy_india_pale_ale':'ipa','belgian_ipa':'ipa',
    'american_pale_ale':'pale_ale','english_pale_ale':'pale_ale','blonde_ale':'pale_ale',
    'american_cream_ale':'pale_ale','german_koelsch':'pale_ale','extra_special_bitter':'pale_ale',
    'special_bitter_or_best_bitter':'pale_ale','ordinary_bitter':'pale_ale',
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

# === GÖREV 1 — V24 tam sayım: WLP 802 (boşluklu) + czech budejovice ===
print(f'[{t()}] GOREV 1 — V24 stream: WLP 802 (bosluklu) + czech budejovice tarama')

# Düzeltme 1: WLP 802 (\s*0? toleranslı)
WLP_802_RE = re.compile(r'wlp\s*0?802\b', re.IGNORECASE)
# Düzeltme 2: Czech budejovice
CZECH_BUDEJOVICE_RE = re.compile(r'czech\s+budejovice', re.IGNORECASE)
# Mevcut yeast_german_lager regex (Adim 18c-1c-1)
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

count_wlp802 = Counter()  # cluster -> count
count_czech_bud = Counter()
wlp802_currently_caught = 0
wlp802_not_caught = 0
czech_bud_currently_caught = 0
czech_bud_not_caught = 0
duzeltme1_outside_lager = 0
duzeltme2_outside_lager = 0
total = 0

with open(V24, 'rb') as f:
    for r in ijson.items(f, 'recipes.item'):
        total += 1
        if total % 50000 == 0:
            print(f'  [{t()}] scanned {total}')
        y = (r.get('raw') or {}).get('yeast') or (r.get('raw') or {}).get('yeasts')
        if not isinstance(y, str): continue
        ystr = y.lower()
        slug = r.get('bjcp_slug')
        cluster = SLUG_TO_CLUSTER.get(slug, 'unmapped')
        feat = r.get('features') or {}
        gl_active = (feat.get('yeast_german_lager') or 0) >= 0.5
        cz_active = (feat.get('yeast_czech_lager') or 0) >= 0.5

        wlp802_match = WLP_802_RE.search(ystr)
        old_gl_match = GERMAN_LAGER_RE.search(ystr)
        if wlp802_match:
            count_wlp802[cluster] += 1
            if gl_active: wlp802_currently_caught += 1
            else:
                wlp802_not_caught += 1
                if cluster not in LAGER_FAMILY: duzeltme1_outside_lager += 1

        czech_bud_match = CZECH_BUDEJOVICE_RE.search(ystr)
        if czech_bud_match:
            count_czech_bud[cluster] += 1
            if gl_active or cz_active: czech_bud_currently_caught += 1
            else:
                czech_bud_not_caught += 1
                if cluster not in LAGER_FAMILY: duzeltme2_outside_lager += 1

print(f'\n[{t()}] V24 tarama tamam: total={total}')

print(f'\n=== A. Düzeltme 1 etki: WLP 802 (\\s*0? toleranslı) ===')
print(f'  toplam reçete: {sum(count_wlp802.values())}')
print(f'  cluster bazinda:')
for c, n in count_wlp802.most_common():
    print(f'    {c:<14} {n}')
print(f'  mevcut yakalanan : {wlp802_currently_caught}')
print(f'  yakalanmayan     : {wlp802_not_caught}')
print(f'  bunlardan lager DIŞI: {duzeltme1_outside_lager}')
print(f'  Düzeltme 1 net 0->1 (pilsner+lager+bock+lager_dark): {wlp802_not_caught - duzeltme1_outside_lager}')

print(f'\n=== B. Düzeltme 2 etki: czech budejovice ===')
print(f'  toplam reçete: {sum(count_czech_bud.values())}')
print(f'  cluster bazinda:')
for c, n in count_czech_bud.most_common():
    print(f'    {c:<14} {n}')
print(f'  mevcut yakalanan (GL veya CZ): {czech_bud_currently_caught}')
print(f'  yakalanmayan                 : {czech_bud_not_caught}')
print(f'  bunlardan lager DIŞI         : {duzeltme2_outside_lager}')

# Save Görev 1 JSON
g1 = {
    'duzeltme_1_wlp802_bosluklu': {
        'total_recipes': sum(count_wlp802.values()),
        'cluster_dist': dict(count_wlp802),
        'currently_caught': wlp802_currently_caught,
        'not_caught': wlp802_not_caught,
        'not_caught_outside_lager_family': duzeltme1_outside_lager,
        'net_0_to_1_lager_family': wlp802_not_caught - duzeltme1_outside_lager,
    },
    'duzeltme_2_czech_budejovice': {
        'total_recipes': sum(count_czech_bud.values()),
        'cluster_dist': dict(count_czech_bud),
        'currently_caught': czech_bud_currently_caught,
        'not_caught': czech_bud_not_caught,
        'not_caught_outside_lager_family': duzeltme2_outside_lager,
    },
}
with open(OUT_COUNT, 'w', encoding='utf-8') as fp:
    json.dump(g1, fp, ensure_ascii=False, indent=2)
print(f'\n  JSON: {OUT_COUNT}')

# === GÖREV 2 — 18 yeast pattern hardcoded/grup audit ===
print(f'\n[{t()}] GOREV 2 — 18 yeast pattern HARDCODED/GRUP/BOSLUK AUDIT')
print('=' * 95)

# Mevcut pattern listesi (V24 = Adim 18c-1 + 18c-1c-1 sonrası)
PATTERNS_INFO = {
    'yeast_belgian': {
        'type': 'substr_list + regex_kombo',
        'substr': ['wyeast 1214','wy1214','wyeast 1762','wy1762','wyeast 1388','wy1388',
                   'wyeast 3787','wy3787','wyeast 3522','wy3522','wyeast 3864','wy3864',
                   'wlp500','wlp 500','wlp530','wlp 530','wlp540','wlp 540','wlp565',
                   'wlp 565','wlp570','wlp 570','wlp575','wlp 575','wlp590','wlp 590',
                   'safbrew abbaye','lalbrew abbaye','lallemand abbaye','belle saison'],
        'regex': r'belgian\s*(saison|ale|abbey|trappist|tripel|dubbel|witbier|lambic|farmhouse)|imperial\s*b[\s\-]?\d+',
        'tutarsizliklar': [
            'WLP 510 (Bastogne) liste\'de YOK',
            'WLP 545 Belgian Strong Ale liste\'de YOK',
            'WLP 550 hardcoded substring olarak YOK (regex kombo "belgian ale" yakalar?)',
        ],
    },
    'yeast_abbey': {
        'type': 'substr_list + regex_kombo',
        'substr': ['abbey','trappist','1762','1214','3787','wlp500','wlp530','wlp540','wlp575'],
        'regex': r'abbaye|wyeast?\s*0?3789',
        'tutarsizliklar': [
            'wlp500/530/540/575 BOSLUKLU varyant (\\\'wlp 500\\\' vs) substring listesinde YOK',
            'TUTARSIZLIK: yeast_belgian listesinde \\\'wlp500\\\'+\\\'wlp 500\\\' iki yazim, abbey\'de sadece bosluksuz',
            '1762/1214/3787 BARE numeric — FP riski (sadece sayi \"1214\" yeast string olmadan reçete metninde gecebilir)',
        ],
    },
    'yeast_saison': {
        'type': 'regex',
        'regex': r'saison|sasion|farmhouse|wallonia(n)?|saisonstein|saisonette|seizon|hommage|bugfarm|\b(3711|3724|3725|3726)\b|wlp\s*0?(565|566|568|590|585|670)|wy?\s*0?(3724|3711|3725|3726)',
        'tutarsizliklar': [
            'wy?\\s*0? prefix ile "wyeast 3711" yakalanmiyor (Adim 18c-1\\\'de bare numeric ile capraz cozumlemis)',
            'WLP 568 "Saison Yeast Blend" (zaten listede)',
        ],
    },
    'yeast_kveik': {
        'type': 'regex',
        'regex': r'\bkveik\b|voss|hornindal|lida|laerdal|aurland|stranda|granvin|sigmund|ebbegarden|opshaug|midtbust|gjernes',
        'tutarsizliklar': [
            'WLP 644 (artik brett, cikarildi)',
            'WLP 518 Opshaug Kveik liste\'de YOK',
            'Lallemand Voss / Lallemand Kveik brand kelime YOK',
        ],
    },
    'yeast_english': {
        'type': 'regex',
        'regex': r'\bwlp\s*0?(002|005|007|013|023|029)|\bwy?\s*0?(1098|1318|1968|1275)|english ale',
        'tutarsizliklar': [
            'wy?\\s*0? prefix problemi: "wyeast 1318" yakalanmiyor (boşluklu format)',
            'BARE numeric eksik: "\\\\b1318\\\\b" yok, sadece \\\'wy 1318\\\' veya \\\'w 1318\\\' yakali',
            'WLP 008 (East Coast Ale) liste\'de YOK',
            'WLP 022 (Essex Ale), WLP 037 (Yorkshire Square) YOK',
            'Wyeast 1469 (West Yorkshire), Wyeast 1099 (Whitbread), Wyeast 1187 (Ringwood) YOK',
            'TUTARSIZLIK: yeast_german_lager 18c-1c-1\\\'de bare numeric eklendi, yeast_english\\\'te eklenmedi',
        ],
    },
    'yeast_american': {
        'type': 'substr_list',
        'substr': ['wyeast 1056','wy1056','wlp001','wlp 001','safale us-05','safale us05','us-05','us05','bry-97','bry97','chico'],
        'tutarsizliklar': [
            'WLP 002 (English Ale) - yeast_english\\\'te zaten',
            'wlp001/wlp 001 iki varyant ✓',
            'safale us-05 / us05 iki varyant ✓',
            'bry-97 / bry97 iki varyant ✓',
            'us-05 / us05 iki varyant — fakat \\\'us 05\\\' (bosluklu) YOK',
            'Wyeast 1272 American Ale II liste\\\'de YOK',
        ],
    },
    'yeast_german_lager': {
        'type': 'KARISIK (hardcoded + grup + bare numeric)',
        'hardcoded': ['wlp830 german','wlp838 southern','wlp802','wlp840'],
        'grup': r'wlp\s*0?(820|830|833|835|838|840|850|860|885|940)\b',
        'bare': r'\b(2001|2002|2007|2042|2112|2124|2206|2247|2272|2278|2308|2487|2633)\b',
        'kombo': r'\b(bock|doppelbock|maibock|hella\s*bock|munich|...|czech\s*pils|...|diamond)\s+(lager|yeast)',
        'tutarsizliklar': [
            'Hardcoded \\\'wlp802\\\' boşluksuz, grup\\\'a 802 atlanmiş — Düzeltme 1 ile çözülüyor',
            'WLP 800 Pilsner Lager grup\\\'ta YOK — Düzeltme 1 ile çözülüyor',
            'czech\\\\s*pils kombo — \"czech budejovice lager yeast\" yakalamiyor — Düzeltme 2 ile çözülüyor',
        ],
    },
    'yeast_czech_lager': {
        'type': 'regex',
        'regex': r'\bwy?\s*0?(2278|2272)|wlp802|bohemian',
        'tutarsizliklar': [
            'wy?\\s*0? prefix "wyeast 2278" yakalamiyor',
            'BARE numeric \\\'\\\\b2278\\\\b\\\' yok',
            'wlp802 boşluksuz — Düzeltme 1 sonrası grup\\\'tan kapsanir',
            '\\\'bohemian\\\' bare — FP riski (bohemian style = czech)',
            'Wyeast 2001 Pilsner Urquell YOK (yeast_german_lager bare numeric\\\'te kapsali)',
        ],
    },
    'yeast_american_lager': {
        'type': 'regex',
        'regex': r'\bwlp840|2007 pilsen|wy?2007',
        'tutarsizliklar': [
            'wlp840 boşluksuz — Düzeltme 1 grup\\\'undan kapsali (zaten yeast_german_lager\\\'da)',
            '\\\'2007 pilsen\\\' boşluk + \\\'pilsen\\\' kombo — \\\'2007 lager\\\' yakalamaz',
            'wy?2007 problem',
            'BARE \\\'2007\\\' yeast_german_lager bare numeric\\\'te zaten',
            'Saflager S-23/S-189 — yeast_german_lager\\\'da var, american_lager\\\'da YOK',
        ],
    },
    'yeast_kolsch': {
        'type': 'regex',
        'regex': r'k[oö]lsch|kolsch|wlp003|wlp029|wy?2565',
        'tutarsizliklar': [
            'k[oö]lsch ✓ (kölsch + kolsch)',
            'wlp003/wlp029 boşluksuz — \\\'wlp 003\\\' yakalamaz',
            'wy?2565 problem (Adim 18c-1\\\'deki Kölsch)',
            'WLP 011 Euro Ale yok (kölsch tarz)',
            'Imperial G02 Kaiser yok',
        ],
    },
    'yeast_altbier': {
        'type': 'regex',
        'regex': r'altbier|wlp036|wy?1338',
        'tutarsizliklar': [
            'wlp036 boşluksuz, wy?1338 problem',
            'WLP 022 Essex / WLP 029 Kölsch (zaten kolsch\\\'ta)',
            'Imperial A24 Dry Hop yok',
        ],
    },
    'yeast_cal_common': {
        'type': 'regex',
        'regex': r'california\s+lager|wlp810|wy?2112',
        'tutarsizliklar': [
            'wlp810 boşluksuz, wy?2112 problem',
            'BARE \\\'2112\\\' yeast_german_lager bare numeric\\\'te zaten',
        ],
    },
    'yeast_brett': {
        'type': 'regex_kompleks',
        'regex': '(see BRETT_RE)',
        'tutarsizliklar': [
            'WLP grup ✓ \\\\bwlp\\\\s*0? toleransli',
            'wy?\\s*0? prefix problemi',
            'BARE numeric eksik (Wyeast 5112 vs)',
        ],
    },
    'yeast_lacto': {
        'type': 'regex',
        'regex': r'\blacto(bacillus)?\b|\bwlp\s*0?(67[127]|693|672|6727|677)\b|\bwy?\s*0?5(335|223|424)\b|philly\s*sour',
        'tutarsizliklar': [
            'WLP grup ✓ toleransli',
            'wy?\\s*0? prefix problemi',
            'BARE numeric eksik',
        ],
    },
    'yeast_sour_blend': {
        'type': 'regex',
        'regex': r'sour\s*blend|mixed\s*culture|wildbrew\s*sour|sour\s*pitch|amalgamation|wild\s*ale\s*blend|the\s*funk|barrel\s*blend',
        'tutarsizliklar': ['(brand kelimeler, numeric kod yok — sorun yok)'],
    },
    'yeast_witbier': {
        'type': 'regex',
        'regex': r'witbier|wlp\s*0?40[01]|wy?3944|hoegaarden|wit\s*ale|wit\s*yeast',
        'tutarsizliklar': [
            'wlp\\s*0?40[01] ✓ toleransli',
            'wy?3944 problem',
        ],
    },
    'yeast_wheat_german': {
        'type': 'regex',
        'regex': r'weihenstephan|wlp300|wlp380|wy?3068|wb[\s\-]?06|hefeweizen|munich\s*wheat',
        'tutarsizliklar': [
            'wlp300/wlp380 boşluksuz',
            'wy?3068 problem',
            'wb[\\s\\-]?06 ✓ toleransli (WB-06, WB 06, wb06)',
        ],
    },
    'yeast_wit': {'type': 'alias', 'note': 'yeast_witbier ile aynı'},
}

# Print pattern audit
for fname in ['yeast_belgian','yeast_abbey','yeast_saison','yeast_kveik',
              'yeast_english','yeast_american','yeast_german_lager','yeast_czech_lager',
              'yeast_american_lager','yeast_kolsch','yeast_altbier','yeast_cal_common',
              'yeast_brett','yeast_lacto','yeast_sour_blend','yeast_witbier',
              'yeast_wheat_german','yeast_wit']:
    info = PATTERNS_INFO[fname]
    print(f'\n{fname}: type={info["type"]}')
    if 'tutarsizliklar' in info:
        for tut in info['tutarsizliklar']:
            print(f'  • {tut}')

# Save audit
with open(OUT_AUDIT, 'w', encoding='utf-8') as fp:
    # Convert to safe dict (regex objects to str)
    safe = {}
    for k, v in PATTERNS_INFO.items():
        safe[k] = {key: val for key, val in v.items()}
    json.dump(safe, fp, ensure_ascii=False, indent=2)
print(f'\n  JSON: {OUT_AUDIT}')

# === GOREV 2 ek: wy?\s*0? PROBLEM tüm V24 sayım ===
print(f'\n[{t()}] EK SAYIM — wy?\\s*0? prefix problemi (\"wyeast XXXX\" boşluklu yakalanmiyor):')
WYEAST_NUMERIC_FORMATS = {
    'yeast_english': ['1098','1318','1968','1275'],
    'yeast_czech_lager': ['2278','2272'],
    'yeast_american_lager': ['2007'],
    'yeast_kolsch': ['2565'],
    'yeast_altbier': ['1338'],
    'yeast_cal_common': ['2112'],
    'yeast_witbier': ['3944'],
    'yeast_wheat_german': ['3068'],
}
# Test: "wyeast XXXX" formatında V24'te kaç reçete var
problem_counts = defaultdict(lambda: {'total': 0, 'caught': 0, 'not_caught': 0})

current_patterns = {
    'yeast_english': re.compile(r'\bwlp\s*0?(002|005|007|013|023|029)|\bwy?\s*0?(1098|1318|1968|1275)|english ale', re.IGNORECASE),
    'yeast_czech_lager': re.compile(r'\bwy?\s*0?(2278|2272)|wlp802|bohemian', re.IGNORECASE),
    'yeast_american_lager': re.compile(r'\bwlp840|2007 pilsen|wy?2007', re.IGNORECASE),
    'yeast_kolsch': re.compile(r'k[oö]lsch|kolsch|wlp003|wlp029|wy?2565', re.IGNORECASE),
    'yeast_altbier': re.compile(r'altbier|wlp036|wy?1338', re.IGNORECASE),
    'yeast_cal_common': re.compile(r'california\s+lager|wlp810|wy?2112', re.IGNORECASE),
    'yeast_witbier': re.compile(r'witbier|wlp\s*0?40[01]|wy?3944|hoegaarden|wit\s*ale|wit\s*yeast', re.IGNORECASE),
    'yeast_wheat_german': re.compile(r'weihenstephan|wlp300|wlp380|wy?3068|wb[\s\-]?06|hefeweizen|munich\s*wheat', re.IGNORECASE),
}

with open(V24, 'rb') as f:
    for r in ijson.items(f, 'recipes.item'):
        y = (r.get('raw') or {}).get('yeast') or (r.get('raw') or {}).get('yeasts')
        if not isinstance(y, str): continue
        ystr = y.lower()
        for fname, codes in WYEAST_NUMERIC_FORMATS.items():
            for code in codes:
                # "wyeast 1318" (boşluklu) format
                if re.search(rf'\bwyeast\s+0?{code}\b', ystr):
                    problem_counts[fname]['total'] += 1
                    if current_patterns[fname].search(ystr):
                        problem_counts[fname]['caught'] += 1
                    else:
                        problem_counts[fname]['not_caught'] += 1
                    break

print(f'\n  "wyeast XXXX" (bosluklu) format sayim — mevcut pattern yakalama testi:')
print(f"  {'feature':<24}{'total_wyeast_format':>20}{'caught':>10}{'not_caught':>14}")
for fname in current_patterns:
    pc = problem_counts[fname]
    print(f"  {fname:<24}{pc['total']:>20}{pc['caught']:>10}{pc['not_caught']:>14}")

print(f'\n[{t()}] AUDIT TAMAM')
