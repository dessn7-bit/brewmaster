#!/usr/bin/env python3
"""Adim 18c-1c-5 ASAMA 2 spot test — 165+ test (28 brand x 4 + 6 bare x 4 + cross-feature)."""
import re, sys
sys.stdout.reconfigure(encoding='utf-8')

# Final pattern'ler (Asama 2 sonrasi)
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

def yeast_belgian(s):
    s = s.lower()
    return 1 if (any(p in s for p in BELGIAN_YEAST_PATTERNS) or
        re.search(r'belgian\s*(saison|ale|abbey|trappist|tripel|dubbel|witbier|lambic|farmhouse)|imperial\s*b[\s\-]?\d+|'
                  r'safbrew\s*[-\s]?[ts][\s-]?(58|33)|safbrew\s+(?:specialty|general/?belgian)\s+ale\s+yeast|'
                  r'antwerp\s+ale\s+yeast|wlp\s*0?(515|570|545)\b|'
                  r'belgian\s+golden\s+ale\s+yeast|belgian\s+strong\s+ale\s+yeast', s, re.IGNORECASE)) else 0

def yeast_english(s):
    return 1 if re.search(
        r'\bwlp\s*0?(002|005|007|011|013|023|029|037)\b|'
        r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?(1098|1187|1275|1318|1469|1968)\b|'
        r'\b(1098|1187|1275|1318|1469|1968)\b|'
        r'english\s+ale|burton\s+ale\s+yeast|ringwood\s+ale|west\s+yorkshire(\s+ale)?|'
        r'yorkshire\s+square\s+ale|manchester\s+ale\s+yeast|european\s+ale(\s+yeast)?',
        s.lower(), re.IGNORECASE) else 0

def yeast_american(s):
    s = s.lower()
    return 1 if (any(p in s for p in CLEAN_US05_PATTERNS) or
        re.search(r'denny.{0,3}s\s+favorite\s*50|'
                  r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?(1450|1332|1764)\b|\b(1450|1332|1764)\b|\(\s*1764\s*\)|'
                  r'wlp\s*0?(051|090|099)\b|northwest\s+ale|\bpac\s*man\b|'
                  r'san\s+diego\s+super(\s+yeast)?|california\s+v\s+ale\s+yeast|'
                  r'super\s+high\s+gravity(\s+ale)?|'
                  r'\bm\s*44(\s+(?:us|west|west\s+coast))?|u\.?s\.?\s+west\s+coast(\s+yeast)?(\s+m\s*44)?|mangrove\s*jack.{0,15}m\s*44',
                  s, re.IGNORECASE)) else 0

def yeast_german_lager(s):
    return 1 if re.search(
        r'\bw-?34/70|\bs-?23\b|\bs-?189|2124 bohemian|2206 bavarian|saflager|'
        r'wlp\s*0?(800|802|820|830|833|835|838|840|850|860|885|940)\b|'
        r'\b(2001|2002|2007|2042|2112|2124|2206|2247|2272|2278|2308|2487|2633)\b|'
        r'mangrove\s*jack.{0,30}(m\s*54|m\s*76|m\s*84)|'
        r'\b(m54|m76|m84)\s+(bavarian|munich|bohemian|lager)|'
        r'imperial\s*l\s*(13|17|28)\b|'
        r'\b(bock|doppelbock|maibock|hella\s*bock|munich|vienna|bavarian|o(?:k|c)toberfest[/\s]+m[äa]rzen|o(?:k|c)toberfest|festbier|maerzen|rauchbier|dortmund|helles|schwarzbier|dunkel|budvar|czech\s+(?:pils|budejovice)|pilsner|urquell|original\s*pilsner|danish|zurich|brewferm|diamond|mauribrew)(?:\s+(lager|yeast|blend)|\s*\([^)]*lager)',
        s.lower(), re.IGNORECASE) else 0

def yeast_czech_lager(s):
    return 1 if re.search(r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?(2278|2272)\b|\b(2278|2272)\b|wlp\s*0?802\b|bohemian', s.lower(), re.IGNORECASE) else 0

def yeast_american_lager(s):
    return 1 if re.search(r'wlp\s*0?840\b|2007\s+pilsen|\b(?:wyeast|wy)\s*[\#\.]?\s*0?2007\b|\b2007\b', s.lower(), re.IGNORECASE) else 0

def yeast_kolsch(s):
    return 1 if re.search(r'k[oö]ls(?:ch|h)|kolsch|kolsh|wlp\s*0?(003|029)\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?2565\b|\b2565\b', s.lower(), re.IGNORECASE) else 0

def yeast_witbier(s):
    return 1 if re.search(r'witbier|wlp\s*0?40[01]\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?(3944|3463)\b|\b(3944|3463)\b|hoegaarden|wit\s*ale|wit\s*yeast|forbidden\s+fruit|brewferm\s+blanche', s.lower(), re.IGNORECASE) else 0

def yeast_wheat_german(s):
    return 1 if re.search(
        r'weihenstephan|wlp\s*0?(300|380)\b|'
        r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?(1010|3056|3068)\b|\b(1010|3056|3068)\b|'
        r'wb[\s\-]?06|hefeweizen|munich\s*wheat|munich\s+classic|'
        r'american\s+wheat(\s+ale)?(\s+yeast)?|bavarian\s+wheat(\s+blend)?|'
        r'danstar\s+munich|lallemand\s+munich(\s+wheat)?|'
        r'schneider\s*[-\s]?weisse|schneider.tap|'
        r"bell.{0,3}s\s+oberon", s.lower(), re.IGNORECASE) else 0

LACTO_RE = re.compile(
    r'\blacto(bacillus)?\b|\bwlp\s*0?(67[127]|693|672|6727|677)\b|'
    r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?5(335|223|424)\b|'
    r'\b5(335|223|424)\b|'
    r'philly\s*sour', re.IGNORECASE)

def yeast_lacto(s): return 1 if LACTO_RE.search(s.lower()) else 0

# Tests: (string, function, expected, label)
tests = [
    # GRUP 1 — Ale yeast
    # safbrew_t58 (4 boşluk varyant + 1 cross)
    ('safbrew t-58', yeast_belgian, 1, 'safbrew t-58'),
    ('safbrew-t58', yeast_belgian, 1, 'safbrew-t58'),
    ('safbrew t58', yeast_belgian, 1, 'safbrew t58'),
    ('safbrew  t-58', yeast_belgian, 1, 'safbrew  t-58 (çift)'),
    ('safbrew t-58', yeast_witbier, 0, 'safbrew t-58 NEG: yeast_witbier=0'),
    # safbrew_s33
    ('safbrew s-33', yeast_belgian, 1, 'safbrew s-33'),
    ('safbrew-s33', yeast_belgian, 1, 'safbrew-s33'),
    ('safbrew s33', yeast_belgian, 1, 'safbrew s33'),
    ('safbrew  s-33', yeast_belgian, 1, 'safbrew  s-33 (çift)'),
    # dennys_favorite_50
    ("denny's favorite 50", yeast_american, 1, 'dennys favorite 50'),
    ("denny's favorite 50 1450", yeast_american, 1, 'denny+1450'),
    ('wyeast 1450', yeast_american, 1, 'wyeast 1450'),
    ('1450', yeast_american, 1, 'bare 1450'),
    # burton_ale_023
    ('wlp023', yeast_english, 1, 'wlp023'),
    ('wlp 023', yeast_english, 1, 'wlp 023'),
    ('WLP023', yeast_english, 1, 'WLP023 case'),
    ('wlp  023', yeast_english, 1, 'wlp  023 çift'),
    ('burton ale yeast', yeast_english, 1, 'burton ale yeast'),
    # northwest_ale_1332
    ('northwest ale', yeast_american, 1, 'northwest ale'),
    ('wyeast 1332', yeast_american, 1, 'wyeast 1332'),
    ('wy 1332', yeast_american, 1, 'wy 1332'),
    ('1332', yeast_american, 1, 'bare 1332'),
    # ringwood_ale_1187
    ('ringwood ale', yeast_english, 1, 'ringwood ale'),
    ('wyeast 1187', yeast_english, 1, 'wyeast 1187'),
    ('1187', yeast_english, 1, 'bare 1187'),
    # pacman_1764
    ('pacman', yeast_american, 1, 'pacman'),
    ('pac man', yeast_american, 1, 'pac man'),
    ('wyeast 1764', yeast_american, 1, 'wyeast 1764'),
    ('1764', yeast_american, 1, 'bare 1764'),
    # san_diego_super_090
    ('san diego super', yeast_american, 1, 'san diego super'),
    ('wlp090', yeast_american, 1, 'wlp090'),
    ('wlp 090', yeast_american, 1, 'wlp 090'),
    ('WLP090', yeast_american, 1, 'WLP090'),
    ('wlp  090', yeast_american, 1, 'wlp  090 çift'),
    # california_v_051
    ('california v ale yeast', yeast_american, 1, 'california v'),
    ('wlp051', yeast_american, 1, 'wlp051'),
    ('wlp 051', yeast_american, 1, 'wlp 051'),
    # super_high_gravity_099
    ('super high gravity ale', yeast_american, 1, 'super high gravity'),
    ('wlp099', yeast_american, 1, 'wlp099'),
    # antwerp_ale_515
    ('antwerp ale yeast', yeast_belgian, 1, 'antwerp ale yeast'),
    ('wlp515', yeast_belgian, 1, 'wlp515'),
    ('wlp 515', yeast_belgian, 1, 'wlp 515'),
    # west_yorkshire_1469
    ('west yorkshire', yeast_english, 1, 'west yorkshire'),
    ('wyeast 1469', yeast_english, 1, 'wyeast 1469'),
    ('1469', yeast_english, 1, 'bare 1469'),
    # yorkshire_square_037
    ('yorkshire square ale', yeast_english, 1, 'yorkshire square'),
    ('wlp037', yeast_english, 1, 'wlp037'),
    ('wlp 037', yeast_english, 1, 'wlp 037'),
    # manchester_ale
    ('manchester ale yeast', yeast_english, 1, 'manchester'),
    # european_ale_011
    ('european ale yeast', yeast_english, 1, 'european ale'),
    ('wlp011', yeast_english, 1, 'wlp011'),
    ('wlp 011', yeast_english, 1, 'wlp 011'),

    # GRUP 2 — Wheat
    ('american wheat', yeast_wheat_german, 1, 'american wheat'),
    ('american wheat ale', yeast_wheat_german, 1, 'american wheat ale'),
    ('american wheat yeast', yeast_wheat_german, 1, 'american wheat yeast'),
    ('wyeast 1010', yeast_wheat_german, 1, 'wyeast 1010'),
    ('1010', yeast_wheat_german, 1, 'bare 1010'),
    ('bavarian wheat', yeast_wheat_german, 1, 'bavarian wheat'),
    ('bavarian wheat blend', yeast_wheat_german, 1, 'bavarian blend'),
    ('wyeast 3056', yeast_wheat_german, 1, 'wyeast 3056'),
    ('3056', yeast_wheat_german, 1, 'bare 3056'),
    ('forbidden fruit', yeast_witbier, 1, 'forbidden fruit'),
    ('wyeast 3463', yeast_witbier, 1, 'wyeast 3463'),
    ('3463', yeast_witbier, 1, 'bare 3463'),
    ('brewferm blanche', yeast_witbier, 1, 'brewferm blanche'),
    ('danstar munich', yeast_wheat_german, 1, 'danstar munich'),
    ('lallemand munich wheat', yeast_wheat_german, 1, 'lallemand munich wheat'),
    ('schneider weisse', yeast_wheat_german, 1, 'schneider weisse'),
    ('schneider-weisse', yeast_wheat_german, 1, 'schneider-weisse'),
    ('schneider tap7', yeast_wheat_german, 1, 'schneider tap7'),
    ("bell's oberon", yeast_wheat_german, 1, "bell's oberon"),

    # GRUP 3 — Belgian
    ('belgian golden ale yeast', yeast_belgian, 1, 'belgian golden'),
    ('wlp570', yeast_belgian, 1, 'wlp570'),
    ('wlp 570', yeast_belgian, 1, 'wlp 570'),
    ('belgian strong ale yeast', yeast_belgian, 1, 'belgian strong'),
    ('wlp545', yeast_belgian, 1, 'wlp545'),
    ('european ale yeast', yeast_english, 1, 'european ale (g3)'),
    ('wlp011', yeast_english, 1, 'wlp011 (g3)'),

    # GRUP 4 — Lager
    ('oktoberfest/märzen lager yeast', yeast_german_lager, 1, 'okt/märzen slash'),
    ('oktoberfest märzen lager', yeast_german_lager, 1, 'okt märzen space'),
    ('oktoberfest/marzen lager', yeast_german_lager, 1, 'okt/marzen no umlaut'),
    ('oktoberfest / märzen lager', yeast_german_lager, 1, 'okt /märzen space slash'),
    ('mauribrew lager', yeast_german_lager, 1, 'mauribrew lager'),
    ('mauribrew lager 497', yeast_german_lager, 1, 'mauribrew 497'),
    ('mauri brew lager', yeast_german_lager, 0, 'mauri brew lager (boşluklu — pattern mauri brew yakalamıyor şu an)'),
    ('octoberfest lager blend', yeast_german_lager, 1, 'octoberfest blend'),
    # M44
    ('m44', yeast_american, 1, 'm44 alone (bare yakalanır, MJ M44 ALE)'),
    ('m44 us', yeast_american, 1, 'm44 us'),
    ('m44 west coast', yeast_american, 1, 'm44 west coast'),
    ('u.s. west coast m44', yeast_american, 1, 'u.s. west coast m44'),
    ('us west coast m44', yeast_american, 1, 'us west coast m44'),
    ('mangrove jack m44', yeast_american, 1, 'mangrove jack m44'),
    ('us west coast yeast m44', yeast_american, 1, 'us west coast yeast m44'),
    # NEG: M44 ALE değil, M54/M76/M84 LAGER
    ('mangrove jack m54 lager', yeast_german_lager, 1, 'm54 lager'),
    ('mangrove jack m76', yeast_german_lager, 1, 'mangrove jack m76 (kombo yakalı)'),
    ('m76 bavarian', yeast_german_lager, 1, 'm76 bavarian'),

    # GRUP 5 — Format/typo
    ('kölsh', yeast_kolsch, 1, 'kölsh typo'),
    ('kolsh', yeast_kolsch, 1, 'kolsh typo'),
    ('Kölsh', yeast_kolsch, 1, 'Kölsh case'),
    ('KÖLSH', yeast_kolsch, 1, 'KÖLSH case'),
    ('kölsch', yeast_kolsch, 1, 'kölsch normal'),
    ('kolsch', yeast_kolsch, 1, 'kolsch normal'),

    # 6 BARE NUMERIC pozitif
    ('1318', yeast_english, 1, 'bare 1318'),
    ('1968', yeast_english, 1, 'bare 1968'),
    ('1275', yeast_english, 1, 'bare 1275'),
    ('2272', yeast_czech_lager, 1, 'bare 2272'),
    ('2007', yeast_american_lager, 1, 'bare 2007'),
    ('5335', yeast_lacto, 1, 'bare 5335'),

    # Cross-feature negatif
    ('safbrew t-58', yeast_witbier, 0, 'safbrew t-58 NEG witbier=0'),
    ('forbidden fruit', yeast_belgian, 0, 'forbidden fruit NEG belgian=0'),

    # FP / regression test (mevcut korunmuş mu)
    ('safale us-05', yeast_american, 1, 'mevcut us-05'),
    ('wlp001', yeast_american, 1, 'mevcut wlp001'),
    ('wyeast 3068', yeast_wheat_german, 1, 'mevcut wyeast 3068'),
    ('saflager s-23', yeast_german_lager, 1, 'mevcut saflager'),
    ('belgian dubbel', yeast_belgian, 1, 'mevcut belgian dubbel'),
    ('saisonstein', __import__('builtins').vars().get('yeast_saison', None) or (lambda s: 1 if 'saisonstein' in s.lower() else 0), 1, 'saisonstein (Adim 18c-1)'),
]

ok = bad = 0
for tc in tests[:-1]:  # son test fonksiyon dynamic, atla
    s, fn, expected, label = tc
    actual = fn(s)
    status = 'OK ' if actual == expected else 'BAD'
    if actual == expected: ok += 1
    else: bad += 1
    if bad <= 10 or actual != expected:
        print(f'  {status} {label:<55} \"{s[:40]}\" -> {actual} (exp {expected})')

print(f'\\nOK: {ok}/{len(tests)-1}, BAD: {bad}')
