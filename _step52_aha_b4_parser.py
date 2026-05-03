#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""B-4 — AHA recipe_ingredients HTML parse + V15 buildFeatures format.

Input:  _aha_recipes_raw.json (1250 kept, post re-classify)
Output: _aha_recipes_v15_format.json (V15 format, B-5 validation input)

Schema:
  raw: { malts: [{name, amount_kg, cat, lovibond?}],
         hops: [{name, amount_g, alpha?, time_min?, use?}],
         yeast: str,
         og: float, fg: float, ibu: float, srm: float, abv: float,
         batch_size_l: float, mash_eff_pct: float? }
  features: V15 81-feature dict (computed from raw)
"""
import json
import re
import html
from collections import Counter

try:
    from bs4 import BeautifulSoup
except ImportError:
    import subprocess, sys
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-q', 'beautifulsoup4', 'lxml'])
    from bs4 import BeautifulSoup


# ── Numeric field parsers ──
def parse_gravity(s):
    """ '1.030 (7.5°P)' or '1.054' → 1.054"""
    if s is None: return None
    m = re.search(r'(\d+\.\d+)', str(s))
    return float(m.group(1)) if m else None


def parse_pct(s):
    """ '4.5%' or '4.5' → 4.5"""
    if s is None: return None
    m = re.search(r'(\d+\.?\d*)', str(s))
    return float(m.group(1)) if m else None


def parse_int(s):
    """ '5' or '30' → int"""
    if s is None: return None
    m = re.search(r'(\d+)', str(s))
    return int(m.group(1)) if m else None


def parse_volume_to_l(s):
    """ '5 US gal. (18.93 L)' → 18.93 (prefer L if shown, else convert from gal)"""
    if s is None: return None
    s_str = str(s)
    # Look for liters first
    m = re.search(r'(\d+\.?\d*)\s*L\b', s_str, re.I)
    if m:
        return float(m.group(1))
    # Fallback: gallons
    m = re.search(r'(\d+\.?\d*)\s*(?:US\s*)?gal', s_str, re.I)
    if m:
        return round(float(m.group(1)) * 3.78541, 2)
    # Just a number
    m = re.search(r'(\d+\.?\d*)', s_str)
    return float(m.group(1)) if m else None


# ── Ingredients HTML parser ──
WEIGHT_RE = re.compile(
    r'(?P<num>\d+\.?\d*)\s*(?P<unit>lb\.?|lbs?|oz\.?|kg|g|gallon)\b',
    re.IGNORECASE,
)


def to_kg(amount, unit):
    """Convert weight to kg. unit lower-case."""
    u = unit.lower().rstrip('.')
    if u in ('kg',):
        return amount
    if u in ('g',):
        return amount / 1000.0
    if u in ('lb', 'lbs'):
        return amount * 0.453592
    if u in ('oz',):
        return amount * 0.0283495
    return None


def to_g(amount, unit):
    u = unit.lower().rstrip('.')
    if u == 'g': return amount
    if u == 'kg': return amount * 1000
    if u == 'oz': return amount * 28.3495
    if u in ('lb', 'lbs'): return amount * 453.592
    return None


def classify_malt(name):
    """Return malt category for V15 pct_* features."""
    n = name.lower()
    if 'pilsner' in n or 'pils' in n or 'lager malt' in n: return 'pilsner'
    if '2-row' in n or '2 row' in n or 'two row' in n or 'pale ale malt' in n: return 'pale_ale'
    if 'pale malt' in n or 'pale 2-row' in n: return 'pale_ale'
    if '6-row' in n or '6 row' in n or 'six row' in n: return 'sixrow'
    if 'munich' in n or 'münch' in n: return 'munich'
    if 'vienna' in n: return 'vienna'
    if 'wheat' in n or 'weizen' in n or 'weiss' in n: return 'wheat'
    if 'oat' in n or 'oats' in n: return 'oats'
    if 'rye' in n or 'roggen' in n: return 'rye'
    if 'crystal' in n or 'caramel' in n or 'cara' in n: return 'crystal'
    if 'chocolate' in n or 'choc' in n: return 'choc'
    if 'roast' in n or 'black' in n: return 'roast'
    if 'smoke' in n or 'rauch' in n: return 'smoked'
    if 'corn' in n or 'flaked corn' in n or 'maize' in n: return 'corn'
    if 'rice' in n: return 'rice'
    if 'sugar' in n or 'dextrose' in n or 'candi' in n or 'syrup' in n or 'honey' in n or 'maple' in n: return 'sugar'
    if 'aromatic' in n or 'special b' in n or 'biscuit' in n or 'victory' in n or 'abbey' in n: return 'aromatic_abbey'
    return 'other'


SECTION_HEADERS = {
    'malts': {'MALTS', 'MALT', 'GRAINS', 'GRAIN', 'FERMENTABLES', 'EXTRACTS', 'MALTS & ADJUNCTS', 'MALT & ADJUNCTS', 'GRAIN BILL'},
    'hops':  {'HOPS', 'HOP'},
    'yeast': {'YEAST', 'YEASTS', 'CULTURE', 'BACTERIA', 'YEAST & BACTERIA', 'YEAST/BACTERIA'},
    'misc':  {'OTHER', 'MISC', 'MISCELLANEOUS', 'ADJUNCTS', 'EXTRAS', 'ADDITIONS', 'SPICES', 'FRUIT', 'SPICES/FRUIT', 'OTHER INGREDIENTS', 'SPICES & FRUIT'},
}


def classify_item(text):
    """Content-based item classification (yeast/hop/malt/misc/header)."""
    if not text:
        return 'unknown'
    tu = text.upper().strip(':').strip()
    for sec, headers in SECTION_HEADERS.items():
        if tu in headers:
            return f'header:{sec}'
    tl = text.lower()
    # Yeast: strain ID or yeast keyword
    if re.search(r'\b(wyeast|wlp\s*\d+|white\s*labs|safale|safbrew|safcider|safspirit|lallemand|fermentis|imperial\s*yeast|omega\s*(?:yeast)?|escarpment|gigayeast|jasper|hornindal|voss|kveik\s*\w+|lactobacillus|brettanomyces|\bbrett\b|pediococcus|sour\s*pitch|sour\s*blend|wildbrew|philly\s*sour)\b', tl):
        return 'yeast'
    # Yeast strain pattern e.g. "1 pack Wyeast 1056"
    if re.search(r'\b(?:pack|packet|pkg|tube|sachet)s?\b.*\b(?:yeast|culture|bacteria)\b', tl):
        return 'yeast'
    # Hop: AA% or hop-specific keywords or known hop names with weight + min
    has_hop_marker = bool(re.search(r'(\d+\.?\d*)\s*%\s*(?:AA|a\.a\.|alpha)', text, re.I))
    has_minutes = bool(re.search(r'\(\s*\d+\s*(?:min|sec)\b|\b\d+\s*(?:min|minute)s?\b', tl))
    has_hop_name = bool(re.search(r'\b(cascade|centennial|chinook|columbus|citra|simcoe|amarillo|mosaic|warrior|nugget|magnum|hallertau|tettnang|spalt|saaz|ekg|east kent|fuggle|goldings|target|first gold|challenger|northdown|northern brewer|whitbread|bramling|nelson|motueka|riwaka|wakatu|galaxy|ella|enigma|topaz|sabro|idaho|loral|azacca|ekuanot|equinot|el dorado|simcoe|pacific jade|pacifica|polaris|hersbruck|tradition)\b', tl))
    if (has_hop_marker or has_minutes) and re.search(r'\d+\.?\d*\s*(?:oz|g)\b', tl):
        return 'hop'
    if has_hop_name and re.search(r'\d+\.?\d*\s*(?:oz|g|lb|lbs|kg)\b', tl):
        return 'hop'
    # Misc/spice/adjunct
    if re.search(r'\b(coriander|cardamom|cinnamon|vanilla|ginger|orange peel|hibiscus|grains of paradise|irish moss|whirlfloc|tablet|moss|chipotle|jalape|habanero|chile|chili|pepper|salt|pumpkin|spice|herb|cocoa|cacao|chocolate|coffee|espresso|raspberry|blueberry|cherry|peach|mango|passionfruit|apricot|pineapple|strawberry|blackberry|lime|lemon)\b', tl) and not re.search(r'\b(malt|hop)\b', tl):
        return 'misc'
    # Malt: weight + malt-like keyword
    has_weight = bool(re.search(r'\d+\.?\d*\s*(?:lb|lbs|kg|oz|g|gallon)\b', tl))
    has_malt_kw = bool(re.search(r'\b(malt|pilsner|pale|munich|vienna|wheat|oats|rye|crystal|caramel|chocolate|roast|black|smok|rauch|honey|sugar|extract|dme|lme|6-row|2-row|flaked|rice|corn|maize|grain|biscuit|victory|aromatic|abbey|special b|carafa|midnight|melanoidin|barley|spelt|amber|brown|munich|cara)\b', tl))
    if has_weight and has_malt_kw:
        return 'malt'
    if has_weight:
        # Weight present but no malt keyword — could be sugar or other adjunct
        return 'malt'  # default to malt for nutrition
    return 'unknown'


def parse_ingredients_html(html_str):
    """Hybrid parser: header-based when available, content-based otherwise."""
    if not html_str:
        return {'malts': [], 'hops': [], 'yeast': '', 'misc': []}
    soup = BeautifulSoup(html_str, 'lxml')
    malts = []
    hops = []
    yeast_lines = []
    misc = []
    section = None  # current section from header

    for li in soup.find_all('li'):
        text = li.get_text(' ', strip=True)
        if not text:
            continue
        # Header detection (sets section context)
        cls = classify_item(text)
        if cls.startswith('header:'):
            section = cls.split(':', 1)[1]
            continue
        # If section is set, prefer it; else fallback to content-based
        actual_section = section if section else cls
        if actual_section == 'unknown':
            # If section context exists, use it; else skip
            if section:
                actual_section = section
            else:
                continue

        if actual_section == 'malts' or actual_section == 'malt':
            wm = WEIGHT_RE.search(text)
            kg = None
            name = text
            if wm:
                amount = float(wm.group('num'))
                unit = wm.group('unit')
                kg = to_kg(amount, unit)
                name = re.sub(r'\(\s*[\d.]+\s*(?:kg|g)\s*\)', '', text)
                name = WEIGHT_RE.sub('', name).strip(' .,—-')
            # Skip lines that are obviously hop/yeast even if we got here
            if re.search(r'\b(wyeast|wlp\s*\d+|safale|safbrew|brett|lacto|pedio)\b', name.lower()):
                yeast_lines.append(text)
                continue
            cat = classify_malt(name)
            malts.append({'name': name, 'amount_kg': kg, 'cat': cat})
        elif actual_section == 'hops' or actual_section == 'hop':
            wm = WEIGHT_RE.search(text)
            g = None
            name = text
            time_min = None
            alpha = None
            use = None
            if wm:
                amount = float(wm.group('num'))
                unit = wm.group('unit')
                g = to_g(amount, unit)
                name = re.sub(r'\(\s*[\d.]+\s*(?:kg|g)\s*\)', '', text)
                name = WEIGHT_RE.sub('', name).strip(' .,—-')
            tm = re.search(r'(\d+)\s*(?:min|minute)', text, re.I)
            if tm: time_min = int(tm.group(1))
            am = re.search(r'(\d+\.?\d*)\s*%\s*(?:AA|aa|alpha|a\.a\.)', text)
            if am: alpha = float(am.group(1))
            tlow = text.lower()
            if 'dry hop' in tlow or 'dry-hop' in tlow: use = 'dry_hop'
            elif 'whirlpool' in tlow or 'flame out' in tlow or 'flameout' in tlow: use = 'whirlpool'
            elif 'first wort' in tlow or 'fwh' in tlow: use = 'first_wort'
            elif tm or '(0 min' in tlow: use = 'boil'
            hops.append({'name': name, 'amount_g': g, 'alpha': alpha, 'time_min': time_min, 'use': use})
        elif actual_section == 'yeast':
            yeast_lines.append(text)
        elif actual_section == 'misc':
            misc.append(text)

    return {
        'malts': malts,
        'hops': hops,
        'yeast': ' | '.join(yeast_lines),
        'misc': misc,
    }


# ── V15 buildFeatures (Python port of HTML JS V85.buildFeatures + V12 Brett extension) ──
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
    # Adım 54 Faz 2 + Adim 18c-1 + 18c-1c-2 (2026-05-03): _step53 ile identik
    r'brett(anomyces|y|ish|ed)?\b|'
    r'\bwlp\s*0?(644|645|648|650|651|652|653|654|655|656|660|665|670|671|672|4639)\b|'
    r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?5(112|151|526|512|733|378)\b|'
    r'\b5(112|151|526|512|733|378)\b|'
    r'bruxellensis|lambicus|drie|trois|clausenii|'
    r'\bwild\s*(ale|yeast|fermentation|brew)\b|'
    r'wildbrew\s*sour|philly\s*sour|lallemand\s*wild|omega\s*(?:yeast\s*)?(?:cosmic|saisonstein|hothead)|'
    r'\bfoeder\b|funky|farmhouse\s*sour|barrel\s*(?:aged\s*)?sour|'
    r'amalgamation|cosmic|hothead\s*ale|all\s*the\s*bretts|funkwerks|saisonstein',
    # Adim 18c-1c-5d AŞAMA C revize (2026-05-04): Cellador pattern erteleme — Adim 18c-1c-7'ye tasindi (KURAL 2.4 ≥10 ihlali, 3 recete yetersiz orneklem)
    re.IGNORECASE,
)
LACTO_RE = re.compile(
    r'\blacto(bacillus)?\b|\bwlp\s*0?(67[127]|693|672|6727|677)\b|'
    # Adim 18c-1c-5: bare 5335 eklendi
    r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?5(335|223|424)\b|'
    r'\b5(335|223|424)\b|'
    # Adim 18c-1 (2026-05-03): Philly Sour ek
    r'philly\s*sour',
    re.IGNORECASE,
)
PEDIO_RE = re.compile(r'\bpedio(coccus)?\b|\bwlp\s*0?661\b|damnosus', re.IGNORECASE)
CLEAN_NEUTRAL_RE = re.compile(
    r'\bus[\s-]?05\b|\bs[\s-]?04\b|\b(safale|safbrew|nottingham|windsor|bry[\s-]?97)\b|'
    r'\bwlp\s*0?(001|002|005|007|008|029|051|060|095|099)\b|'
    r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?(1056|1968|1318|1098|1272|1275)\b',
    re.IGNORECASE,
)


def text_blob(rec):
    """Combine name + ingredients text + introduction for content-based features."""
    parts = []
    parts.append(rec.get('name', ''))
    parts.append(rec.get('aha_style_name', '') or '')
    raw = rec.get('raw') or {}
    for f in ('ingredients_html', 'introduction', 'content_html', 'additional_html'):
        v = raw.get(f) or ''
        if v:
            # Strip HTML
            soup = BeautifulSoup(v, 'lxml')
            parts.append(soup.get_text(' '))
    return ' '.join(parts).lower()


def detect_features(rec, parsed):
    """V15 81-feature dict."""
    text = text_blob(rec)
    yeast_str = (parsed.get('yeast') or '').lower()
    intro = (rec.get('raw', {}).get('introduction') or '').lower()
    yeast_str_full = yeast_str + ' ' + ' '.join(intro[:500].split())

    malts = parsed.get('malts') or []
    hops = parsed.get('hops') or []
    misc = parsed.get('misc') or []

    # Total base / malt %
    total_kg = sum((m.get('amount_kg') or 0) for m in malts)
    if total_kg <= 0:
        total_kg = 0.0001  # avoid div by zero

    pct = {'pilsner': 0, 'pale_ale': 0, 'munich': 0, 'vienna': 0, 'wheat': 0, 'oats': 0,
           'rye': 0, 'crystal': 0, 'choc': 0, 'roast': 0, 'smoked': 0, 'corn': 0, 'rice': 0,
           'sugar': 0, 'aromatic_abbey': 0, 'sixrow': 0, 'other': 0}
    for m in malts:
        kg = m.get('amount_kg') or 0
        c = m.get('cat') or 'other'
        if c in pct:
            pct[c] += kg

    pct_features = {f'pct_{k}': round(100 * v / total_kg, 2) for k, v in pct.items()}
    pct_features['total_base'] = round(total_kg * 2.20462, 2)  # kg → lbs (V15 convention?)

    # Yeast features — Adim 18c-1 (2026-05-03): 18 yeast pattern duzeltme (_step53 ile identik)
    feats = dict(pct_features)
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
    # Adim 18d-pre Sprint A (2026-05-04): K1 pattern eksik — BE-134, BE-256, M29, Lalbrew Farmhouse eklendi
    feats['yeast_saison'] = 1 if re.search(r'saison|sasion|farmhouse|wallonia(n)?|saisonstein|saisonette|seizon|hommage|bugfarm|\b(3711|3724|3725|3726)\b|wlp\s*0?(565|566|568|590|585|670)\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?(3724|3711|3725|3726)\b|\bbe[\s\-]?134\b|\bbe[\s\-]?256\b|\bm[\s\-]?29\b|\blalbrew\s+farmhouse\b', yeast_str) else 0
    feats['yeast_kveik'] = 1 if re.search(r'\bkveik\b|voss|hornindal|lida|laerdal|aurland|stranda|granvin|sigmund|ebbegarden|opshaug|midtbust|gjernes', yeast_str) else 0
    # Adim 18c-1c-5 (2026-05-03): +6 brand + bare numeric (Asama 1.6 spot test 21/21 TP)
    # Adim 18c-1c-5d C7 (2026-05-04): NB Neobritannia (Wyeast 1945, English ale yeast, 352 recete gap)
    feats['yeast_english'] = 1 if re.search(
        r'\bwlp\s*0?(002|005|007|011|013|023|029|037)\b|'
        r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?(1098|1187|1275|1318|1469|1945|1968)\b|'
        r'\b(1098|1187|1275|1318|1469|1945|1968)\b|'
        r'english\s+ale|burton\s+ale\s+yeast|ringwood\s+ale|west\s+yorkshire(\s+ale)?|'
        r'yorkshire\s+square\s+ale|manchester\s+ale\s+yeast|european\s+ale(\s+yeast)?|'
        r'\bneobritannia\b|nb[\s\-]+neobritannia',
        yeast_str) else 0
    # Adim 18c-1c-5 (2026-05-03): +7 brand (denny's, NW ale, pacman, san_diego, california_v, super_high_gravity, us_west_coast M44)
    # Adim 18c-1c-5d C8/C9/C11 (2026-05-04):
    #   +NorCal #1 (GigaYeast GY001, 6 recete)
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
    # Adim 18c-1c-1 + 18c-1c-2 (2026-05-03): KONSERVATIF + Düzeltme 1+2 — _step53 ile identik
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
    # Adim 18c-1c-5d C1 (2026-05-04): bare 2272 ek (Wyeast 2272 = North American Lager, czech_lager'dan tasindi)
    feats['yeast_american_lager'] = 1 if re.search(r'wlp\s*0?840\b|2007\s+pilsen|\b(?:wyeast|wy)\s*[\#\.]?\s*0?(2007|2272)\b|\b(2007|2272)\b', yeast_str) else 0
    # Adim 18c-1c-5d C2 (2026-05-04): word-boundary eklendi (sinir netligi KURAL 2.6), redundant kolsch|kolsh kaldirildi
    feats['yeast_kolsch'] = 1 if re.search(r'\bk[oö]ls(?:ch|h)\b|wlp\s*0?(003|029)\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?2565\b|\b2565\b', yeast_str) else 0
    feats['yeast_altbier'] = 1 if re.search(r'altbier|wlp\s*0?036\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?1338\b|\b1338\b', yeast_str) else 0
    feats['yeast_cal_common'] = 1 if re.search(r'california\s+lager|wlp\s*0?810\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?2112\b|\b2112\b', yeast_str) else 0
    feats['yeast_brett'] = 1 if BRETT_RE.search(yeast_str_full) else 0
    feats['yeast_lacto'] = 1 if LACTO_RE.search(yeast_str_full) else 0
    feats['yeast_sour_blend'] = 1 if re.search(r'sour\s*blend|mixed\s*culture|wildbrew\s*sour|sour\s*pitch|amalgamation|wild\s*ale\s*blend|the\s*funk|barrel\s*blend', yeast_str_full) else 0
    # Adim 18c-1c-5: +forbidden_fruit + brewferm_blanche + 5 wheat brand
    feats['yeast_witbier'] = 1 if re.search(r'witbier|wlp\s*0?40[01]\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?(3944|3463)\b|\b(3944|3463)\b|hoegaarden|wit\s*ale|wit\s*yeast|forbidden\s+fruit|brewferm\s+blanche', yeast_str_full) else 0
    feats['yeast_wheat_german'] = 1 if re.search(
        r'weihenstephan|wlp\s*0?(300|380)\b|'
        r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?(1010|3056|3068)\b|\b(1010|3056|3068)\b|'
        r'wb[\s\-]?06|hefeweizen|munich\s*wheat|munich\s+classic|'
        r'american\s+wheat(\s+ale)?(\s+yeast)?|bavarian\s+wheat(\s+blend)?|'
        r'danstar\s+munich|lallemand\s+munich(\s+wheat)?|'
        r'schneider\s*[-\s]?weisse|schneider.tap|'
        # Adim 18c-1c-5d C4 (2026-05-04): bell.{0,3}s -> bell'?s?, sinir netligi + apostrof+s opsiyonel (42 FP loose match dustu, KURAL 2.6)
        r"bell'?s?\s+oberon", yeast_str_full) else 0
    feats['yeast_wit'] = feats['yeast_witbier']

    # Hop features
    hops_text = ' '.join((h.get('name') or '').lower() for h in hops)
    feats['hop_american_c'] = 1 if re.search(r'cascade|centennial|columbus|chinook|citra|simcoe|amarillo|mosaic|warrior|nugget|magnum', hops_text) else 0
    feats['hop_english'] = 1 if re.search(r'ekg|east kent|fuggle|goldings|target|first gold|challenger|northdown|bramling|whitbread', hops_text) else 0
    feats['hop_german'] = 1 if re.search(r'hallertau|tettnang|tradition|spalt|magnum|polaris|hersbruck', hops_text) else 0
    feats['hop_czech_saaz'] = 1 if re.search(r'saaz|žatec|zatec', hops_text) else 0
    feats['hop_nz'] = 1 if re.search(r'nelson|motueka|riwaka|wakatu|pacific\s*jade|pacifica', hops_text) else 0
    feats['hop_aged'] = 1 if re.search(r'aged\s*hop|debittered', hops_text) else 0
    feats['hop_northern_brewer'] = 1 if 'northern brewer' in hops_text else 0

    # Adjunct/ingredient features
    misc_text = ' '.join(misc).lower() + ' ' + text
    feats['katki_fruit'] = 1 if re.search(r'\b(raspberry|blueberry|cherry|peach|mango|passionfruit|apricot|pineapple|strawberry|blackberry|orange|lime|lemon)\b', misc_text) else 0
    feats['katki_spice_herb'] = 1 if re.search(r'\b(coriander|cardamom|cinnamon|vanilla|black pepper|ginger|anise|nutmeg|clove|orange peel|hibiscus)\b', misc_text) else 0
    feats['katki_chocolate'] = 1 if re.search(r'\b(cacao|chocolate|cocoa)\b', misc_text) else 0
    feats['katki_coffee'] = 1 if re.search(r'\b(coffee|espresso|caffè)\b', misc_text) else 0
    feats['katki_chile'] = 1 if re.search(r'\b(chipotle|jalapeno|jalapeño|habanero|chili|chile|ancho)\b', misc_text) else 0
    feats['katki_smoke'] = 1 if re.search(r'\b(smoke|smoked|rauch|peat)\b', misc_text) else 0
    feats['katki_honey'] = 1 if re.search(r'\b(honey)\b', misc_text) else 0
    feats['katki_pumpkin'] = 1 if re.search(r'\b(pumpkin)\b', misc_text) else 0
    feats['katki_salt'] = 1 if re.search(r'\b(salt|sea salt|sodium chloride)\b', misc_text) else 0
    feats['katki_lactose'] = 1 if re.search(r'\b(lactose|milk sugar)\b', misc_text) else 0

    # Process features (mostly default — V15 dataset için optional)
    feats['mash_temp_c'] = 0
    feats['fermentation_temp_c'] = 0
    feats['yeast_attenuation'] = 0
    feats['boil_time_min'] = 60  # default
    feats['water_ca_ppm'] = 0
    feats['water_so4_ppm'] = 0
    feats['water_cl_ppm'] = 0
    feats['dry_hop_days'] = 0
    feats['mash_type_step'] = 0
    feats['mash_type_decoction'] = 0
    feats['lagering_days'] = 0

    # Content features (overlapping with katki_*)
    feats['has_coffee'] = feats['katki_coffee']
    feats['has_fruit'] = feats['katki_fruit']
    feats['has_spice'] = feats['katki_spice_herb']
    feats['has_chili'] = feats['katki_chile']
    feats['has_smoke'] = feats['katki_smoke']
    feats['has_belgian_yeast'] = feats['yeast_belgian']
    feats['has_clean_us05_isolate'] = 1 if any(p in yeast_str for p in CLEAN_US05_PATTERNS) else 0

    # Brett 5 boolean (Adım 51 B4)
    has_brett = bool(BRETT_RE.search(yeast_str_full))
    has_lacto = bool(LACTO_RE.search(yeast_str_full))
    has_pedio = bool(PEDIO_RE.search(yeast_str_full))
    has_clean_us = bool(CLEAN_NEUTRAL_RE.search(yeast_str_full))
    feats['has_brett'] = 1 if has_brett else 0
    feats['has_lacto'] = 1 if has_lacto else 0
    feats['has_pedio'] = 1 if has_pedio else 0
    feats['is_mixed_fermentation'] = 1 if (has_brett and has_clean_us) else 0
    feats['is_100pct_brett'] = 1 if (has_brett and not has_clean_us) else 0

    return feats


# ── Main ──
def main():
    with open('_aha_recipes_raw.json', 'r', encoding='utf-8') as f:
        raw = json.load(f)

    # V15 feature_list (81)
    with open('brewmaster_v15_cleaned.json', 'r', encoding='utf-8') as f:
        v15 = json.load(f)
    v15_feature_list = v15['meta']['feature_list']
    print(f'V15 feature_list: {len(v15_feature_list)} features')
    print(f'AHA records to parse: {len(raw)}')

    parsed_records = []
    parse_stats = Counter()

    for i, rec in enumerate(raw):
        if i % 200 == 0:
            print(f'  [{i}/{len(raw)}] parsing...')

        # Numeric fields
        og = parse_gravity(rec['raw'].get('og'))
        fg = parse_gravity(rec['raw'].get('fg'))
        ibu = parse_int(rec['raw'].get('ibu'))
        srm = parse_int(rec['raw'].get('srm'))
        abv = parse_pct(rec['raw'].get('abv'))
        volume_l = parse_volume_to_l(rec['raw'].get('volume'))
        eff = parse_pct(rec['raw'].get('efficiency'))

        # Ingredients HTML
        parsed_ing = parse_ingredients_html(rec['raw'].get('ingredients_html'))

        # V15 features (computed)
        all_feats = detect_features(rec, parsed_ing)
        # Add scalar features
        all_feats['og'] = og
        all_feats['fg'] = fg
        all_feats['abv'] = abv
        all_feats['ibu'] = ibu
        all_feats['srm'] = srm

        # Filter to V15 81-feature schema
        feats = {k: all_feats.get(k, 0) for k in v15_feature_list}

        # New record in V15 format
        new_rec = {
            'id': f'aha_{rec["source_id"]}',
            'source': 'aha',
            'source_id': rec['source_id'],
            'name': html.unescape(rec.get('name', '') or ''),
            'bjcp_slug': rec['v15_slug'],
            'bjcp_main_category': None,  # Filled at validation step
            'sorte_raw': rec.get('aha_style_name'),
            'raw': {
                'malts': parsed_ing['malts'],
                'hops': parsed_ing['hops'],
                'yeast': parsed_ing['yeast'],
                'og': og, 'fg': fg, 'abv': abv, 'ibu': ibu, 'srm': srm,
                'batch_size_l': volume_l,
                'mash_eff_pct': eff,
                'aha_extra': {
                    'is_nhc_winner': rec['raw'].get('is_nhc_winner'),
                    'is_proam_winner': rec['raw'].get('is_proam_winner'),
                    'medal_placement': rec['raw'].get('medal_placement'),
                    'brewer': rec['raw'].get('brewer'),
                    'introduction': rec['raw'].get('introduction'),
                    'misc': parsed_ing.get('misc'),
                },
            },
            'features': feats,
            'aha_pick_source': rec.get('picked_from'),
        }
        parsed_records.append(new_rec)

        # Stats
        if not parsed_ing['malts']: parse_stats['malt_empty'] += 1
        if not parsed_ing['hops']: parse_stats['hops_empty'] += 1
        if not parsed_ing['yeast']: parse_stats['yeast_empty'] += 1
        if og is None: parse_stats['og_missing'] += 1
        if abv is None: parse_stats['abv_missing'] += 1

    with open('_aha_recipes_v15_format.json', 'w', encoding='utf-8') as f:
        json.dump(parsed_records, f, indent=2, ensure_ascii=False)
    print(f'\n✓ {len(parsed_records)} records → _aha_recipes_v15_format.json')

    print('\n=== Parse stats ===')
    for k, v in parse_stats.most_common():
        print(f'  {k}: {v}/{len(raw)}')

    # Sample integrity
    print('\n=== Sample[0] (post-parse) ===')
    s = parsed_records[0]
    print(f'  id: {s["id"]}')
    print(f'  name: {s["name"][:50]}')
    print(f'  bjcp_slug: {s["bjcp_slug"]}')
    print(f'  malts ({len(s["raw"]["malts"])}):')
    for m in s['raw']['malts'][:5]:
        print(f'    {m["name"][:40]} — {m.get("amount_kg")} kg ({m.get("cat")})')
    print(f'  hops ({len(s["raw"]["hops"])}):')
    for h in s['raw']['hops'][:3]:
        print(f'    {h["name"][:40]} — {h.get("amount_g")} g, alpha={h.get("alpha")}, time={h.get("time_min")}min, use={h.get("use")}')
    print(f'  yeast: {s["raw"]["yeast"][:120]}')
    print(f'  features (top 10):')
    for k in list(s['features'])[:15]:
        v = s['features'][k]
        if v: print(f'    {k}: {v}')


if __name__ == '__main__':
    main()
