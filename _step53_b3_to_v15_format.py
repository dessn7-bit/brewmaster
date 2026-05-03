#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Adım 53 Faz B-3 — rmwoods → V15 81-feature format.

Pipeline:
  1. _rmwoods_b1_parsed.pickle yükle (core_records + recipe_ferm/hop/yeast/misc dicts)
  2. Style mapping (B-2 _rmwoods_style_to_v15slug.json) uygula
  3. Cider/mead/perry SKIP (slug=None)
  4. src_* NaN doldur:
     - ABV: (OG-FG) * 131.25
     - SRM: Morey from ferm list (color × kg → MCU → SRM)
     - IBU: Tinseth from hop list (alpha × g × time × utilization)
  5. V15 81-feature compute (AHA parser logic adapted)
  6. Output: working/_rmwoods_v15_format.json
"""
import pickle
import json
import re
import math
import sys
import os
import time
from collections import Counter

sys.stdout.reconfigure(line_buffering=True)

ROOT = 'C:/Users/Kaan/brewmaster'
WORKING = f'{ROOT}/working'

T0 = time.time()
def t(): return time.time() - T0


# ── Load ──
print(f'[1] Load _rmwoods_b1_parsed.pickle... ({t():.1f}s)', flush=True)
with open(f'{WORKING}/_rmwoods_b1_parsed.pickle', 'rb') as f:
    data = pickle.load(f)
core_records = data['core_records']
recipe_ferm = data['recipe_ferm']
recipe_hop = data['recipe_hop']
recipe_yeast = data['recipe_yeast']
recipe_misc = data['recipe_misc']
print(f'  core: {len(core_records)}, ferm: {len(recipe_ferm)}, hop: {len(recipe_hop)}, yeast: {len(recipe_yeast)}, misc: {len(recipe_misc)} ({t():.1f}s)', flush=True)

print(f'[2] Load style mapping...', flush=True)
style_map_data = json.load(open(f'{WORKING}/_rmwoods_style_to_v15slug.json', encoding='utf-8'))
NAME_TO_SLUG = style_map_data['name_to_slug']
EXCLUDE = set(style_map_data['exclude_names'])

# V15 81 features (V16 label encoder + V18 yeni 9 slug)
v15_lbl = json.load(open(f'{ROOT}/_v16_label_encoder_slug.json', encoding='utf-8'))
V15_FEATURE_LIST = v15_lbl['feature_list']
V15_SLUGS = set(v15_lbl['classes'])

# V18 Adım 54: 9 yeni slug ekle (B-2 mapping'in hedefleri)
V18_NEW_SLUGS = {
    'flanders_red_ale', 'belgian_gueuze', 'belgian_fruit_lambic',
    'gose', 'export_stout',
    'red_ipa', 'white_ipa', 'rye_ipa', 'belgian_ipa',
}
V15_SLUGS = V15_SLUGS | V18_NEW_SLUGS  # toplam 91 slug
print(f'  V15 features: {len(V15_FEATURE_LIST)}, V18 slugs: {len(V15_SLUGS)} ({t():.1f}s)', flush=True)


# ── Malt classify ──
def classify_malt(name):
    if not name: return 'other'
    n = name.lower()
    if 'pilsner' in n or 'pils' in n or 'lager malt' in n: return 'pilsner'
    if '2-row' in n or '2 row' in n or 'two row' in n or 'pale ale malt' in n: return 'pale_ale'
    if 'pale malt' in n or 'pale 2-row' in n or n.strip() == 'pale': return 'pale_ale'
    if '6-row' in n or '6 row' in n or 'six row' in n: return 'sixrow'
    if 'munich' in n or 'münch' in n: return 'munich'
    if 'vienna' in n: return 'vienna'
    if 'wheat' in n or 'weizen' in n or 'weiss' in n: return 'wheat'
    if 'oat' in n: return 'oats'
    if 'rye' in n or 'roggen' in n: return 'rye'
    if 'crystal' in n or 'caramel' in n or 'cara' in n: return 'crystal'
    if 'chocolate' in n or 'choc' in n: return 'choc'
    if 'roast' in n or 'black' in n: return 'roast'
    if 'smoke' in n or 'rauch' in n or 'peat' in n: return 'smoked'
    if 'corn' in n or 'maize' in n: return 'corn'
    if 'rice' in n: return 'rice'
    if 'sugar' in n or 'dextrose' in n or 'candi' in n or 'syrup' in n or 'honey' in n or 'maple' in n: return 'sugar'
    if 'aromatic' in n or 'special b' in n or 'biscuit' in n or 'victory' in n or 'abbey' in n: return 'aromatic_abbey'
    return 'other'


# ── Yeast/hop pattern detection (from AHA parser) ──
BELGIAN_YEAST_PATTERNS = [
    'wyeast 1214', 'wy1214', 'wyeast 1762', 'wy1762', 'wyeast 1388', 'wy1388',
    'wyeast 3787', 'wy3787', 'wyeast 3522', 'wy3522', 'wyeast 3864', 'wy3864',
    'wlp500', 'wlp 500', 'wlp530', 'wlp 530', 'wlp540', 'wlp 540', 'wlp565',
    'wlp 565', 'wlp570', 'wlp 570', 'wlp575', 'wlp 575', 'wlp590', 'wlp 590',
    'safbrew abbaye', 'lalbrew abbaye', 'lallemand abbaye',
    # Adim 18c-1c-5d C3 (2026-05-04): 'belle saison' cikarildi (yeast_saison'da yakali, lager cluster overflow nedeni)
]
CLEAN_US05_PATTERNS = [
    'wyeast 1056', 'wy1056', 'wlp001', 'wlp 001', 'safale us-05',
    'safale us05', 'us-05', 'us05', 'bry-97', 'bry97', 'chico',
]
BRETT_RE = re.compile(
    # Adım 54 Faz 2: kelime varyasyonları + commercial blend + brewery process
    r'brett(anomyces|y|ish|ed)?\b|'  # brett, brettanomyces, bretty, brettish, bretted (kelime sınırı kalktı)
    r'\bwlp\s*0?(644|645|648|650|651|652|653|654|655|656|660|665|670|671|672|4639)\b|'
    # Adim 18c-1c-2 (2026-05-03): wy? prefix fix (wyeast XXXX) + bare numeric
    r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?5(112|151|526|512|733|378)\b|'
    r'\b5(112|151|526|512|733|378)\b|'
    r'bruxellensis|lambicus|drie|trois|clausenii|'
    r'\bwild\s*(ale|yeast|fermentation|brew)\b|'
    r'wildbrew\s*sour|philly\s*sour|lallemand\s*wild|omega\s*(?:yeast\s*)?(?:cosmic|saisonstein|hothead)|'
    r'\bfoeder\b|funky|farmhouse\s*sour|barrel\s*(?:aged\s*)?sour|'
    # Adim 18c-1 (2026-05-03): commercial blend brand'leri ek
    r'amalgamation|cosmic|hothead\s*ale|all\s*the\s*bretts|funkwerks|saisonstein',
    # Adim 18c-1c-5d AŞAMA C revize (2026-05-04): Cellador pattern erteleme — Adim 18c-1c-7'ye tasindi (KURAL 2.4 ≥10 ihlali, 3 recete yetersiz orneklem)
    re.IGNORECASE)
LACTO_RE = re.compile(
    r'\blacto(bacillus)?\b|\bwlp\s*0?(67[127]|693|672|6727|677)\b|'
    # Adim 18c-1c-5 (2026-05-03): bare 5335 eklendi (Asama 1.6 spot 32 sour cluster TP, FP yanıltıcı metric idi)
    r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?5(335|223|424)\b|'
    r'\b5(335|223|424)\b|'
    # Adim 18c-1 (2026-05-03): Philly Sour Lacto-Brett Saccharomyces hibrit
    r'philly\s*sour',
    re.IGNORECASE)
PEDIO_RE = re.compile(r'\bpedio(coccus)?\b|\bwlp\s*0?661\b|damnosus', re.IGNORECASE)
CLEAN_NEUTRAL_RE = re.compile(
    r'\bus[\s-]?05\b|\bs[\s-]?04\b|\b(safale|safbrew|nottingham|windsor|bry[\s-]?97)\b|'
    r'\bwlp\s*0?(001|002|005|007|008|029|051|060|095|099)\b|'
    # Adim 18c-1c-2: wy? prefix fix
    r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?(1056|1968|1318|1098|1272|1275)\b', re.IGNORECASE)


# ── Calculation helpers ──
def calc_abv(og, fg):
    if og is None or fg is None or og <= 0 or fg <= 0: return None
    return round((og - fg) * 131.25, 2)


def calc_srm_morey(ferm_list, batch_l):
    """Morey SRM from ferm list. ferm.color = Lovibond? rmwoods stores in SRM/L (need check)."""
    if not ferm_list or not batch_l or batch_l <= 0:
        return None
    # rmwoods ferm_color is in Lovibond (typical PyTables BeerXML schema)
    # MCU = sum(color_lovibond × weight_lbs) / volume_gallons
    gallons = batch_l / 3.78541
    mcu = 0
    for f in ferm_list:
        color = f.get('color')
        kg = f.get('amount_kg')
        if color is None or kg is None: continue
        lbs = kg * 2.20462
        mcu += color * lbs
    if gallons <= 0: return None
    mcu /= gallons
    if mcu <= 0: return None
    srm = 1.4922 * (mcu ** 0.6859)
    return round(srm, 1)


def calc_ibu_tinseth(hop_list, og, batch_l):
    """Tinseth IBU."""
    if not hop_list or not og or og <= 1.0 or not batch_l or batch_l <= 0:
        return None
    boil_g = og  # approximate (no separate boil gravity in rmwoods)
    total_ibu = 0
    for h in hop_list:
        alpha = h.get('alpha')
        amount_g = h.get('amount_g')
        time_min = h.get('time_min')
        use = (h.get('use') or '').lower()
        if not alpha or not amount_g or time_min is None: continue
        # Skip dry hop / whirlpool < 5 min from IBU calc (Tinseth doesn't apply)
        if 'dry' in use or 'aroma' in use:
            continue
        if time_min <= 0:
            continue
        # alpha may be fractional (0.07) or pct (7.0). Normalize: if > 1, treat as pct.
        a = alpha if alpha < 1 else alpha / 100.0
        # Utilization
        f_g = 1.65 * (0.000125 ** (boil_g - 1))
        f_t = (1 - math.exp(-0.04 * time_min)) / 4.15
        util = f_g * f_t
        ibu_contrib = (a * amount_g * 1000) / batch_l * util  # ppm
        total_ibu += ibu_contrib
    return round(total_ibu, 1) if total_ibu > 0 else None


# ── 81-feature compute ──
def compute_features(core, ferm_list, hop_list, yeast_list, misc_list):
    # Yeast text
    yeast_parts = []
    for y in (yeast_list or []):
        name = y.get('name_original') or y.get('name') or ''
        lab = y.get('lab') or ''
        pid = y.get('product_id') or ''
        ytype = y.get('type') or ''
        yeast_parts.append(f'{lab} {pid} {name} {ytype}')
    yeast_str = ' '.join(yeast_parts).lower()

    # Misc + yeast text for content features
    misc_text = ' '.join((m.get('name_original') or m.get('name') or '') for m in (misc_list or [])).lower()
    misc_text = misc_text + ' ' + yeast_str

    # Total kg + per-cat
    pct = {'pilsner': 0, 'pale_ale': 0, 'munich': 0, 'vienna': 0, 'wheat': 0, 'oats': 0,
           'rye': 0, 'crystal': 0, 'choc': 0, 'roast': 0, 'smoked': 0, 'corn': 0, 'rice': 0,
           'sugar': 0, 'aromatic_abbey': 0, 'sixrow': 0, 'other': 0}
    total_kg = 0
    for f in (ferm_list or []):
        kg = f.get('amount_kg') or 0
        if kg <= 0: continue
        total_kg += kg
        # use canonical 'name' (mapped) primary, fallback name_original
        n = (f.get('name') or f.get('name_original') or '').lower()
        cat = classify_malt(n)
        pct[cat] += kg
    if total_kg <= 0: total_kg = 0.0001

    feats = {f'pct_{k}': round(100 * v / total_kg, 2) for k, v in pct.items()}
    feats['total_base'] = round(total_kg * 2.20462, 2)

    # Yeast — Adim 18c-1 (2026-05-03): 18 yeast pattern duzeltme
    # Adim 18c-1c-5 (2026-05-03): +safbrew T-58/S-33, +antwerp 515, +belgian golden 570
    feats['yeast_belgian'] = 1 if (any(p in yeast_str for p in BELGIAN_YEAST_PATTERNS) or
        re.search(r'belgian\s*(saison|ale|abbey|trappist|tripel|dubbel|witbier|lambic|farmhouse)|imperial\s*b[\s\-]?\d+|'
                  r'safbrew\s*[-\s]?[ts][\s-]?(58|33)|safbrew\s+(?:specialty|general/?belgian)\s+ale\s+yeast|'
                  r'antwerp\s+ale\s+yeast|'
                  r'wlp\s*0?(515|570|545)\b|'
                  r'belgian\s+golden\s+ale\s+yeast|belgian\s+strong\s+ale\s+yeast', yeast_str)) else 0
    # Adim 18c-1c-2: bare numeric (1762/1214/3787) cikar (FP riski), wlp 5xx bosluklu varyant ekle, wyeast prefix kombo
    feats['yeast_abbey'] = 1 if (any(s in yeast_str for s in ('abbey', 'trappist', 'wlp500', 'wlp 500', 'wlp530', 'wlp 530', 'wlp540', 'wlp 540', 'wlp575', 'wlp 575')) or
        re.search(r'abbaye|\b(?:wyeast|wy)\s*[\#\.]?\s*0?(1214|1762|3787|3789)\b', yeast_str)) else 0
    # Adim 18c-1c-2: wy? prefix fix
    feats['yeast_saison'] = 1 if re.search(r'saison|sasion|farmhouse|wallonia(n)?|saisonstein|saisonette|seizon|hommage|bugfarm|\b(3711|3724|3725|3726)\b|wlp\s*0?(565|566|568|590|585|670)\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?(3724|3711|3725|3726)\b', yeast_str) else 0
    feats['yeast_kveik'] = 1 if re.search(r'\bkveik\b|voss|hornindal|lida|laerdal|aurland|stranda|granvin|sigmund|ebbegarden|opshaug|midtbust|gjernes', yeast_str) else 0
    # Adim 18c-1c-5 (2026-05-03): +6 brand (burton/ringwood/west_yorkshire/yorkshire_square/manchester/european)
    # + bare numeric 1318/1968/1275/1187/1469 (Asama 1.6 spot test 21/21 TP, kombo prefix yetersiz)
    # WLP 011 (European) + WLP 037 (Yorkshire Square) eklendi
    # Adim 18c-1c-5d C7 (2026-05-04): NB Neobritannia (Wyeast 1945, English ale yeast, 352 recete gap)
    feats['yeast_english'] = 1 if re.search(
        r'\bwlp\s*0?(002|005|007|011|013|023|029|037)\b|'
        r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?(1098|1187|1275|1318|1469|1945|1968)\b|'
        r'\b(1098|1187|1275|1318|1469|1945|1968)\b|'
        r'english\s+ale|burton\s+ale\s+yeast|ringwood\s+ale|west\s+yorkshire(\s+ale)?|'
        r'yorkshire\s+square\s+ale|manchester\s+ale\s+yeast|european\s+ale(\s+yeast)?|'
        r'\bneobritannia\b|nb[\s\-]+neobritannia',
        yeast_str) else 0
    # Adim 18c-1c-5 (2026-05-03): +7 brand (denny's 50, NW ale 1332, pacman 1764, san_diego 090,
    # california_v 051, super_high_gravity 099, us_west_coast M44 (M44 ALE, lager DEGIL))
    # Adim 18c-1c-5d C8/C9/C11 (2026-05-04):
    #   +NorCal #1 (GigaYeast GY001, ipa cluster baskin, 6 recete)
    #   +Premium Gold (Muntons Premium Gold, neutral ale yeast, 309 recete)
    #   +Coopers Pure Brewers (Avustralya extract kit yeast, 36 recete)
    feats['yeast_american'] = 1 if (any(p in yeast_str for p in CLEAN_US05_PATTERNS) or
        re.search(r'denny.{0,3}s\s+favorite\s*50|'
                  r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?(1450|1332|1764)\b|\b(1450|1332|1764)\b|\(\s*1764\s*\)|'
                  r'wlp\s*0?(051|090|099)\b|'
                  r'northwest\s+ale|\bpac\s*man\b|'
                  r'san\s+diego\s+super(\s+yeast)?|'
                  r'california\s+v\s+ale\s+yeast|'
                  r'super\s+high\s+gravity(\s+ale)?|'
                  r'\bm\s*44(\s+(?:us|west|west\s+coast))?|u\.?s\.?\s+west\s+coast(\s+yeast)?(\s+m\s*44)?|mangrove\s*jack.{0,15}m\s*44|'
                  r'\bnorcal\s*#?\s*1\b|gigayeast.{0,10}norcal|\bgy\s*0?001\b|'
                  # Adim 18c-1c-5d AŞAMA C revize (2026-05-04): C9 muntons only — \bpremium\s+gold\b cikarildi (FP riski, "Premium Gold Wheat" recipe adlari)
                  r'muntons\s+premium\s+gold|'
                  r'coopers?\s+(?:brewery\s+)?pure\s+brewers?(\s+yeast)?',
                  yeast_str)) else 0
    # Adim 18c-1c-1 + 18c-1c-2 (2026-05-03): KONSERVATIF + Düzeltme 1+2 (WLP 800/802 grup, czech budejovice, pilsner/urquell, parantez içi lager kombo)
    feats['yeast_german_lager'] = 1 if re.search(
        r'\bw-?34/70|\bs-?23\b|\bs-?189|2124 bohemian|2206 bavarian|'
        r'saflager|'
        r'wlp\s*0?(800|802|820|830|833|835|838|840|850|860|885|940)\b|'
        # Adim 18c-1c-5d AŞAMA C revize (2026-05-04): bare 2272 cikarildi (Wyeast resmi 2272 = American Lager, German degil; C1 ek)
        # Kalan 12 numara (2001/2002/2007/2042/2112/2124/2206/2247/2278/2308/2487/2633) Adim 18c-1c-5e ayri sprint
        r'\b(2001|2002|2007|2042|2112|2124|2206|2247|2278|2308|2487|2633)\b|'
        r'mangrove\s*jack.{0,30}(m\s*54|m\s*76|m\s*84)|'
        r'\b(m54|m76|m84)\s+(bavarian|munich|bohemian|lager)|'
        r'imperial\s*l\s*(13|17|28)\b|'
        # Adim 18c-1c-5: +o(k|c)toberfest[/]m[äa]rzen (slash + k/c yazım), +mauribrew, +octoberfest
        # Adim 18c-1c-5d C5+C10 (2026-05-04): mauribrew → mauri\s*brew (94 recete kayip recovery), lalbrew\s+diamond explicit
        r'\b(bock|doppelbock|maibock|hella\s*bock|munich|vienna|bavarian|o(?:k|c)toberfest[/\s]+m[äa]rzen|o(?:k|c)toberfest|festbier|maerzen|rauchbier|dortmund|helles|schwarzbier|dunkel|budvar|czech\s+(?:pils|budejovice)|pilsner|urquell|original\s*pilsner|danish|zurich|brewferm|diamond|mauri\s*brew)(?:\s+(lager|yeast|blend)|\s*\([^)]*lager)|'
        r'\blalbrew\s+diamond\b|\blallemand\s+(?:premium\s+)?diamond\b|\bdiamond\s+lager(\s+yeast)?\b',
        yeast_str) else 0
    # Adim 18c-1c-2: wy? prefix fix + bare numeric (düşük FP) / kombo only (yüksek FP)
    # Adim 18c-1c-5d C1 (2026-05-04): bare 2272 cikarildi (Wyeast 2272 = North American Lager, czech degil; yeast_american_lager'a tasindi)
    feats['yeast_czech_lager'] = 1 if re.search(r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?2278\b|\b2278\b|wlp\s*0?802\b|bohemian', yeast_str) else 0
    # Adim 18c-1c-5: bare 2007 ek (Asama 1.6 spot test 5/5 TP, +76 reçete)
    # Adim 18c-1c-5d C1 (2026-05-04): bare 2272 ek (Wyeast 2272 = North American Lager, czech_lager'dan tasindi)
    feats['yeast_american_lager'] = 1 if re.search(r'wlp\s*0?840\b|2007\s+pilsen|\b(?:wyeast|wy)\s*[\#\.]?\s*0?(2007|2272)\b|\b(2007|2272)\b', yeast_str) else 0
    # Adim 18c-1c-5: kolsh typo (k[oö]ls[hc]h hem kölsch hem kölsh yakalar)
    # Adim 18c-1c-5d C2 (2026-05-04): word-boundary eklendi (sinir netligi KURAL 2.6), redundant kolsch|kolsh kaldirildi (k[oö]ls(?:ch|h) tarafindan zaten kapsanir)
    feats['yeast_kolsch'] = 1 if re.search(r'\bk[oö]ls(?:ch|h)\b|wlp\s*0?(003|029)\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?2565\b|\b2565\b', yeast_str) else 0
    feats['yeast_altbier'] = 1 if re.search(r'altbier|wlp\s*0?036\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?1338\b|\b1338\b', yeast_str) else 0
    feats['yeast_cal_common'] = 1 if re.search(r'california\s+lager|wlp\s*0?810\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?2112\b|\b2112\b', yeast_str) else 0
    feats['yeast_brett'] = 1 if BRETT_RE.search(yeast_str) else 0
    feats['yeast_lacto'] = 1 if LACTO_RE.search(yeast_str) else 0
    feats['yeast_sour_blend'] = 1 if re.search(r'sour\s*blend|mixed\s*culture|wildbrew\s*sour|sour\s*pitch|amalgamation|wild\s*ale\s*blend|the\s*funk|barrel\s*blend', yeast_str) else 0
    # Adim 18c-1c-5: +forbidden_fruit_3463, +brewferm_blanche
    feats['yeast_witbier'] = 1 if re.search(r'witbier|wlp\s*0?40[01]\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?(3944|3463)\b|\b(3944|3463)\b|hoegaarden|wit\s*ale|wit\s*yeast|forbidden\s+fruit|brewferm\s+blanche', yeast_str) else 0
    # Adim 18c-1c-5: +5 wheat brand (american_wheat 1010, bavarian_wheat 3056, danstar_munich, schneider_weisse, bells_oberon)
    feats['yeast_wheat_german'] = 1 if re.search(
        r'weihenstephan|wlp\s*0?(300|380)\b|'
        r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?(1010|3056|3068)\b|\b(1010|3056|3068)\b|'
        r'wb[\s\-]?06|hefeweizen|munich\s*wheat|munich\s+classic|'
        r'american\s+wheat(\s+ale)?(\s+yeast)?|bavarian\s+wheat(\s+blend)?|'
        r'danstar\s+munich|lallemand\s+munich(\s+wheat)?|'
        r'schneider\s*[-\s]?weisse|schneider.tap|'
        # Adim 18c-1c-5d C4 (2026-05-04): bell.{0,3}s -> bell'?s?, sinir netligi + apostrof+s opsiyonel (42 FP loose match dustu, KURAL 2.6)
        r"bell'?s?\s+oberon", yeast_str) else 0
    feats['yeast_wit'] = feats['yeast_witbier']

    # Hops
    hops_text = ' '.join((h.get('name') or h.get('name_original') or '').lower() for h in (hop_list or []))
    feats['hop_american_c'] = 1 if re.search(r'cascade|centennial|columbus|chinook|citra|simcoe|amarillo|mosaic|warrior|nugget|magnum', hops_text) else 0
    feats['hop_english'] = 1 if re.search(r'ekg|east kent|fuggle|goldings|target|first gold|challenger|northdown|bramling|whitbread', hops_text) else 0
    feats['hop_german'] = 1 if re.search(r'hallertau|tettnang|tradition|spalt|magnum|polaris|hersbruck', hops_text) else 0
    feats['hop_czech_saaz'] = 1 if re.search(r'saaz|žatec|zatec', hops_text) else 0
    feats['hop_nz'] = 1 if re.search(r'nelson|motueka|riwaka|wakatu|pacific\s*jade|pacifica', hops_text) else 0
    feats['hop_aged'] = 1 if re.search(r'aged\s*hop|debittered', hops_text) else 0
    feats['hop_northern_brewer'] = 1 if 'northern brewer' in hops_text else 0

    # Adjuncts/content
    content_text = misc_text  # misc + yeast
    feats['katki_fruit'] = 1 if re.search(r'\b(raspberry|blueberry|cherry|peach|mango|passionfruit|apricot|pineapple|strawberry|blackberry|orange|lime|lemon)\b', content_text) else 0
    feats['katki_spice_herb'] = 1 if re.search(r'\b(coriander|cardamom|cinnamon|vanilla|black pepper|ginger|anise|nutmeg|clove|orange peel|hibiscus)\b', content_text) else 0
    feats['katki_chocolate'] = 1 if re.search(r'\b(cacao|chocolate|cocoa)\b', content_text) else 0
    feats['katki_coffee'] = 1 if re.search(r'\b(coffee|espresso|caffè)\b', content_text) else 0
    feats['katki_chile'] = 1 if re.search(r'\b(chipotle|jalapeno|jalapeño|habanero|chili|chile|ancho)\b', content_text) else 0
    feats['katki_smoke'] = 1 if re.search(r'\b(smoke|smoked|rauch|peat)\b', content_text) else 0
    feats['katki_honey'] = 1 if re.search(r'\b(honey)\b', content_text) else 0
    feats['katki_pumpkin'] = 1 if re.search(r'\b(pumpkin)\b', content_text) else 0
    feats['katki_salt'] = 1 if re.search(r'\b(salt|sea salt|sodium chloride)\b', content_text) else 0
    feats['katki_lactose'] = 1 if re.search(r'\b(lactose|milk sugar)\b', content_text) else 0

    # Process (mostly defaults — rmwoods doesn't have explicit mash temp etc.)
    feats['mash_temp_c'] = 0
    feats['fermentation_temp_c'] = 0
    feats['boil_time_min'] = float(core.get('boil_time') or 60) if core.get('boil_time') else 60.0
    feats['water_ca_ppm'] = 0
    feats['water_so4_ppm'] = 0
    feats['water_cl_ppm'] = 0
    feats['mash_type_step'] = 0
    feats['mash_type_decoction'] = 0
    feats['lagering_days'] = 0

    # yeast_attenuation: avg of yeast_list attenuation
    atts = [y.get('attenuation') for y in (yeast_list or []) if y.get('attenuation')]
    feats['yeast_attenuation'] = round(sum(atts) / len(atts), 1) if atts else 0

    # Dry hop days: estimate from hop_use (any dry hop)
    feats['dry_hop_days'] = 5 if any('dry' in (h.get('use') or '').lower() for h in (hop_list or [])) else 0

    # Has flags
    feats['has_coffee'] = feats['katki_coffee']
    feats['has_fruit'] = feats['katki_fruit']
    feats['has_spice'] = feats['katki_spice_herb']
    feats['has_chili'] = feats['katki_chile']
    feats['has_smoke'] = feats['katki_smoke']
    feats['has_belgian_yeast'] = feats['yeast_belgian']
    feats['has_clean_us05_isolate'] = 1 if any(p in yeast_str for p in CLEAN_US05_PATTERNS) else 0

    # Brett 5
    has_brett = bool(BRETT_RE.search(yeast_str))
    has_lacto = bool(LACTO_RE.search(yeast_str))
    has_pedio = bool(PEDIO_RE.search(yeast_str))
    has_clean = bool(CLEAN_NEUTRAL_RE.search(yeast_str))
    feats['has_brett'] = 1 if has_brett else 0
    feats['has_lacto'] = 1 if has_lacto else 0
    feats['has_pedio'] = 1 if has_pedio else 0
    feats['is_mixed_fermentation'] = 1 if (has_brett and has_clean) else 0
    feats['is_100pct_brett'] = 1 if (has_brett and not has_clean) else 0

    return feats


# ── Process ──
print(f'[3] Processing {len(core_records)} recipes... ({t():.1f}s)', flush=True)
out_records = []
stats = Counter()
nan_filled = Counter()

for i, core in enumerate(core_records):
    if i % 50000 == 0 and i > 0:
        print(f'  [{i}/{len(core_records)}] mapped={stats["mapped"]} skip_style={stats["skip_style"]} ({t():.1f}s)', flush=True)

    rec_id = core['id']
    name = (core.get('name') or '').strip()
    style_name = (core.get('style_name') or '').strip().lower()
    style_cat = (core.get('style_category') or '').strip().lower()
    origin = core.get('origin') or ''

    # 1. Slug mapping
    if style_name in EXCLUDE:
        stats['skip_excluded'] += 1
        continue
    slug = NAME_TO_SLUG.get(style_name)
    if not slug or slug not in V15_SLUGS:
        stats['skip_unmapped'] += 1
        continue

    # 2. Pull ingredients
    ferm_list = recipe_ferm.get(rec_id, [])
    hop_list = recipe_hop.get(rec_id, [])
    yeast_list = recipe_yeast.get(rec_id, [])
    misc_list = recipe_misc.get(rec_id, [])

    if not ferm_list:
        stats['skip_no_ferm'] += 1
        continue

    # 3. src_* — read & fill NaN
    og = core.get('src_og')
    fg = core.get('src_fg')
    abv = core.get('src_abv')
    ibu = core.get('src_ibu')
    srm = core.get('src_color')
    batch_l = core.get('batch_size')  # liters

    # NaN check (numpy NaN returns False on truth)
    import math as _m
    def isnum(v):
        return v is not None and isinstance(v, (int, float)) and not _m.isnan(v)

    if not isnum(og): og = None
    if not isnum(fg): fg = None
    if not isnum(abv): abv = None
    if not isnum(ibu): ibu = None
    if not isnum(srm): srm = None
    if not isnum(batch_l): batch_l = 19.0  # default 5 gal

    # 3a. OG/FG estimate FIRST (lots of NaN, needed for IBU/ABV downstream)
    if og is None and ferm_list:
        tot_p_kg = sum(((f.get('potential') or 1.036) - 1.0) * (f.get('amount_kg') or 0) for f in ferm_list)
        if tot_p_kg > 0 and batch_l > 0:
            # FIX (Adım 54): efficiency hem decimal (rmwoods 0.75) hem pct (V16 75) kabul.
            # Adım 53 bug: 0.75 / 100 = 0.0075 → OG 100× düşük.
            eff_raw = core.get('efficiency')
            if eff_raw is None or eff_raw == 0:
                eff = 0.75
            elif eff_raw > 1:   # percentage form (75)
                eff = eff_raw / 100.0
            else:               # decimal form (0.75)
                eff = eff_raw
            og_est = 1 + (tot_p_kg * eff * 2.205 / (batch_l * 0.264))
            og = round(og_est, 4)
            nan_filled['og_est'] += 1
    if fg is None and og is not None:
        atts = [y.get('attenuation') for y in (yeast_list or []) if y.get('attenuation')]
        att = (sum(atts) / len(atts) / 100.0) if atts else 0.75
        fg = round(1 + (og - 1) * (1 - att), 4)
        nan_filled['fg_est'] += 1
    if abv is None and og is not None and fg is not None:
        abv = calc_abv(og, fg)
        if abv is not None: nan_filled['abv_est'] += 1

    if og is None or fg is None or abv is None:
        stats['skip_no_gravity'] += 1
        continue

    # 3b. Fill IBU from Tinseth (now that OG is set)
    if ibu is None:
        ibu = calc_ibu_tinseth(hop_list, og, batch_l)
        if ibu is not None: nan_filled['ibu'] += 1
    # 3c. Fill SRM from Morey
    if srm is None:
        srm = calc_srm_morey(ferm_list, batch_l)
        if srm is not None: nan_filled['srm'] += 1

    # Final defaults
    if srm is None: srm = 0
    if ibu is None: ibu = 0

    # 4. Compute 81 features
    feats = compute_features(core, ferm_list, hop_list, yeast_list, misc_list)
    feats['og'] = float(og)
    feats['fg'] = float(fg)
    feats['abv'] = float(abv)
    feats['ibu'] = float(ibu)
    feats['srm'] = float(srm)

    # Filter to V15 81-feature schema
    final_feats = {k: feats.get(k, 0) for k in V15_FEATURE_LIST}

    # 5. New record
    out_rec = {
        'id': f'rmwoods_{rec_id}',
        'source': 'rmwoods',
        'source_id': str(rec_id),
        'origin': origin,
        'name': name[:200],
        'bjcp_slug': slug,
        'sorte_raw': core.get('style_name'),
        'features': final_feats,
    }
    out_records.append(out_rec)
    stats['mapped'] += 1

print(f'\n[4] Processed in {t():.1f}s. Stats: {dict(stats)}', flush=True)
print(f'  NaN filled: {dict(nan_filled)}', flush=True)

# 5. Sanity check (Adım 54 — dataset rebuild sonrası zorunlu)
print(f'\n[5] SANITY CHECK — V18 dataset distribution ({t():.1f}s)', flush=True)
import statistics as _st
def stats(values):
    vals = [v for v in values if v is not None and v > 0]
    if not vals: return 'N/A'
    return f'mean={_st.mean(vals):.3f} std={_st.stdev(vals) if len(vals)>1 else 0:.3f} min={min(vals):.3f} max={max(vals):.3f} n={len(vals)}'

og_vals = [r['features']['og'] for r in out_records]
fg_vals = [r['features']['fg'] for r in out_records]
abv_vals = [r['features']['abv'] for r in out_records]
ibu_vals = [r['features']['ibu'] for r in out_records]
srm_vals = [r['features']['srm'] for r in out_records]

print(f'  OG:  {stats(og_vals)}')
print(f'  FG:  {stats(fg_vals)}')
print(f'  ABV: {stats(abv_vals)}')
print(f'  IBU: {stats(ibu_vals)}')
print(f'  SRM: {stats(srm_vals)}')

# BJCP plausibility check
og_mean = _st.mean([v for v in og_vals if v > 0])
abv_mean = _st.mean([v for v in abv_vals if v > 0])
if og_mean < 1.020 or og_mean > 1.100:
    print(f'  ⚠️  WARNING: OG mean {og_mean:.3f} BJCP plausible range (1.020-1.100) DIŞINDA — bug olabilir')
if abv_mean < 2.0 or abv_mean > 12.0:
    print(f'  ⚠️  WARNING: ABV mean {abv_mean:.2f}% BJCP plausible range (2-12%) DIŞINDA — bug olabilir')
if og_mean >= 1.020 and og_mean <= 1.100 and abv_mean >= 2.0 and abv_mean <= 12.0:
    print(f'  ✅ Sanity check OK — OG/ABV BJCP range içinde')

# 6. Save
out_path = f'{WORKING}/_rmwoods_v15_format.json'
print(f'\n[6] Writing {out_path}...', flush=True)
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump({'recipes': out_records, 'meta': {'feature_list': V15_FEATURE_LIST, 'count': len(out_records)}}, f, ensure_ascii=False)
size_mb = os.path.getsize(out_path) / (1024 * 1024)
print(f'  Saved {len(out_records)} records, {size_mb:.0f} MB ({t():.1f}s)', flush=True)

# 6. Slug distribution
print(f'\n[6] Slug distribution (top 20):', flush=True)
slug_counts = Counter(r['bjcp_slug'] for r in out_records)
for s, c in slug_counts.most_common(20):
    print(f'  {s:40s} {c}', flush=True)
print(f'\n[DONE] Total {t():.0f}s', flush=True)
