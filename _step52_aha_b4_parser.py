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
    'safbrew abbaye', 'lalbrew abbaye', 'lallemand abbaye', 'belle saison',
]
CLEAN_US05_PATTERNS = [
    'wyeast 1056', 'wy1056', 'wlp001', 'wlp 001', 'safale us-05',
    'safale us05', 'us-05', 'us05', 'bry-97', 'bry97', 'chico',
]
BRETT_RE = re.compile(
    # Adım 54 Faz 2 + Adim 18c-1 (2026-05-03): _step53_b3_to_v15_format.py ile identik
    r'brett(anomyces|y|ish|ed)?\b|'
    r'\bwlp\s*0?(644|645|648|650|651|652|653|654|655|656|660|665|670|671|672|4639)\b|'
    r'\bwy?\s*0?5(112|151|526|512|733|378)\b|'
    r'bruxellensis|lambicus|drie|trois|clausenii|'
    r'\bwild\s*(ale|yeast|fermentation|brew)\b|'
    r'wildbrew\s*sour|philly\s*sour|lallemand\s*wild|omega\s*(?:yeast\s*)?(?:cosmic|saisonstein|hothead)|'
    r'\bfoeder\b|funky|farmhouse\s*sour|barrel\s*(?:aged\s*)?sour|'
    r'amalgamation|cosmic|hothead\s*ale|all\s*the\s*bretts|funkwerks|saisonstein',
    re.IGNORECASE,
)
LACTO_RE = re.compile(
    r'\blacto(bacillus)?\b|\bwlp\s*0?(67[127]|693|672|6727|677)\b|'
    r'\bwy?\s*0?5(335|223|424)\b|'
    # Adim 18c-1 (2026-05-03): Philly Sour ek
    r'philly\s*sour',
    re.IGNORECASE,
)
PEDIO_RE = re.compile(r'\bpedio(coccus)?\b|\bwlp\s*0?661\b|damnosus', re.IGNORECASE)
CLEAN_NEUTRAL_RE = re.compile(
    r'\bus[\s-]?05\b|\bs[\s-]?04\b|\b(safale|safbrew|nottingham|windsor|bry[\s-]?97)\b|'
    r'\bwlp\s*0?(001|002|005|007|008|029|051|060|095|099)\b|'
    r'\bwy?\s*0?(1056|1968|1318|1098|1272|1275)\b',
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
    feats['yeast_belgian'] = 1 if (any(p in yeast_str for p in BELGIAN_YEAST_PATTERNS) or
        re.search(r'belgian\s*(saison|ale|abbey|trappist|tripel|dubbel|witbier|lambic|farmhouse)|imperial\s*b[\s\-]?\d+', yeast_str)) else 0
    feats['yeast_abbey'] = 1 if (any(s in yeast_str for s in ('abbey', 'trappist', '1762', '1214', '3787', 'wlp500', 'wlp530', 'wlp540', 'wlp575')) or
        re.search(r'abbaye|wyeast?\s*0?3789', yeast_str)) else 0
    feats['yeast_saison'] = 1 if re.search(r'saison|sasion|farmhouse|wallonia(n)?|saisonstein|saisonette|seizon|hommage|bugfarm|\b(3711|3724|3725|3726)\b|wlp\s*0?(565|566|568|590|585|670)|wy?\s*0?(3724|3711|3725|3726)', yeast_str) else 0
    feats['yeast_kveik'] = 1 if re.search(r'\bkveik\b|voss|hornindal|lida|laerdal|aurland|stranda|granvin|sigmund|ebbegarden|opshaug|midtbust|gjernes', yeast_str) else 0
    feats['yeast_english'] = 1 if re.search(r'\bwlp\s*0?(002|005|007|013|023|029)|\bwy?\s*0?(1098|1318|1968|1275)|english ale', yeast_str) else 0
    feats['yeast_american'] = 1 if any(p in yeast_str for p in CLEAN_US05_PATTERNS) else 0
    feats['yeast_german_lager'] = 1 if re.search(r'\bw-?34/70|\bs-?23\b|\bs-?189|2124 bohemian|2206 bavarian|wlp830 german|wlp838 southern|wlp802|wlp840', yeast_str) else 0
    feats['yeast_czech_lager'] = 1 if re.search(r'\bwy?\s*0?(2278|2272)|wlp802|bohemian', yeast_str) else 0
    feats['yeast_american_lager'] = 1 if re.search(r'\bwlp840|2007 pilsen|wy?2007', yeast_str) else 0
    feats['yeast_kolsch'] = 1 if re.search(r'k[oö]lsch|kolsch|wlp003|wlp029|wy?2565', yeast_str) else 0
    feats['yeast_altbier'] = 1 if re.search(r'altbier|wlp036|wy?1338', yeast_str) else 0
    feats['yeast_cal_common'] = 1 if re.search(r'california\s+lager|wlp810|wy?2112', yeast_str) else 0
    feats['yeast_brett'] = 1 if BRETT_RE.search(yeast_str_full) else 0
    feats['yeast_lacto'] = 1 if LACTO_RE.search(yeast_str_full) else 0
    feats['yeast_sour_blend'] = 1 if re.search(r'sour\s*blend|mixed\s*culture|wildbrew\s*sour|sour\s*pitch|amalgamation|wild\s*ale\s*blend|the\s*funk|barrel\s*blend', yeast_str_full) else 0
    feats['yeast_witbier'] = 1 if re.search(r'witbier|wlp\s*0?40[01]|wy?3944|hoegaarden|wit\s*ale|wit\s*yeast', yeast_str_full) else 0
    feats['yeast_wheat_german'] = 1 if re.search(r'weihenstephan|wlp300|wlp380|wy?3068|wb[\s\-]?06|hefeweizen|munich\s*wheat', yeast_str_full) else 0
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
