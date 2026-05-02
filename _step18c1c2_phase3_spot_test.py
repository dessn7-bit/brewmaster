#!/usr/bin/env python3
"""Adim 18c-1c-2 ASAMA 3 spot test — 50+ test case (boşluk + FP).
"""
import re, sys
sys.stdout.reconfigure(encoding='utf-8')

# Final pattern'ler (Aşama 3 sonrası)
GERMAN_LAGER_RE = re.compile(
    r'\bw-?34/70|\bs-?23\b|\bs-?189|2124 bohemian|2206 bavarian|'
    r'saflager|'
    r'wlp\s*0?(800|802|820|830|833|835|838|840|850|860|885|940)\b|'
    r'\b(2001|2002|2007|2042|2112|2124|2206|2247|2272|2278|2308|2487|2633)\b|'
    r'mangrove\s*jack.{0,30}(m\s*54|m\s*76|m\s*84)|'
    r'\b(m54|m76|m84)\s+(bavarian|munich|bohemian|lager)|'
    r'imperial\s*l\s*(13|17|28)\b|'
    r'\b(bock|doppelbock|maibock|hella\s*bock|munich|vienna|bavarian|oktoberfest|festbier|maerzen|rauchbier|dortmund|helles|schwarzbier|dunkel|budvar|czech\s+(?:pils|budejovice)|pilsner|urquell|original\s*pilsner|danish|zurich|brewferm|diamond)(?:\s+(lager|yeast)|\s*\([^)]*lager)',
    re.IGNORECASE)
CZECH_LAGER_RE = re.compile(r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?(2278|2272)\b|\b2278\b|wlp\s*0?802\b|bohemian', re.IGNORECASE)
AMERICAN_LAGER_RE = re.compile(r'wlp\s*0?840\b|2007\s+pilsen|\b(?:wyeast|wy)\s*[\#\.]?\s*0?2007\b', re.IGNORECASE)
ENGLISH_RE = re.compile(r'\bwlp\s*0?(002|005|007|013|023|029)\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?(1098|1318|1968|1275)\b|\b1098\b|english\s+ale', re.IGNORECASE)
KOLSCH_RE = re.compile(r'k[oö]lsch|kolsch|wlp\s*0?(003|029)\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?2565\b|\b2565\b', re.IGNORECASE)
ALTBIER_RE = re.compile(r'altbier|wlp\s*0?036\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?1338\b|\b1338\b', re.IGNORECASE)
CAL_COMMON_RE = re.compile(r'california\s+lager|wlp\s*0?810\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?2112\b|\b2112\b', re.IGNORECASE)
WITBIER_RE = re.compile(r'witbier|wlp\s*0?40[01]\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?3944\b|\b3944\b|hoegaarden|wit\s*ale|wit\s*yeast', re.IGNORECASE)
WHEAT_GERMAN_RE = re.compile(r'weihenstephan|wlp\s*0?(300|380)\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?3068\b|\b3068\b|wb[\s\-]?06|hefeweizen|munich\s*wheat', re.IGNORECASE)
SAISON_RE = re.compile(r'saison|sasion|farmhouse|wallonia(n)?|saisonstein|saisonette|seizon|hommage|bugfarm|\b(3711|3724|3725|3726)\b|wlp\s*0?(565|566|568|590|585|670)\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?(3724|3711|3725|3726)\b', re.IGNORECASE)
ABBEY_SUBSTR = ('abbey','trappist','wlp500','wlp 500','wlp530','wlp 530','wlp540','wlp 540','wlp575','wlp 575')
ABBEY_RE = re.compile(r'abbaye|\b(?:wyeast|wy)\s*[\#\.]?\s*0?(1214|1762|3787|3789)\b', re.IGNORECASE)
def is_abbey(s):
    s = s.lower()
    return any(p in s for p in ABBEY_SUBSTR) or bool(ABBEY_RE.search(s))

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

# Spot test (50+)
tests = [
    # Düzeltme 1 — WLP 802 boşluk varyantları
    ('wlp802', GERMAN_LAGER_RE, 1, 'D1 wlp802'),
    ('WLP802', GERMAN_LAGER_RE, 1, 'D1 WLP802 case'),
    ('wlp 802', GERMAN_LAGER_RE, 1, 'D1 wlp 802 boşluk'),
    ('WLP 802', GERMAN_LAGER_RE, 1, 'D1 WLP 802 case+boşluk'),
    ('wlp  802', GERMAN_LAGER_RE, 1, 'D1 wlp çift boşluk'),
    ('wlp0802', GERMAN_LAGER_RE, 1, 'D1 wlp0802 sıfır prefix'),
    ('white labs wlp 802 czech budejovice lager yeast', GERMAN_LAGER_RE, 1, 'D1 + D2 birlikte'),
    # WLP 800 ek
    ('wlp800 pilsner lager', GERMAN_LAGER_RE, 1, 'D1 wlp800'),
    ('wlp 800', GERMAN_LAGER_RE, 1, 'D1 wlp 800 boşluk'),
    # Düzeltme 2 — Czech budejovice
    ('czech budejovice lager yeast', GERMAN_LAGER_RE, 1, 'D2 czech budejovice'),
    ('czech pils lager', GERMAN_LAGER_RE, 1, 'D2 czech pils kombo (eski korunuyor)'),
    # Düzeltme 2 — Pilsner alternation grup
    ('pilsner lager yeast (white labs, lager, 74.5%)', GERMAN_LAGER_RE, 1, 'D2 pilsner kombo'),
    ('urquell lager (wyeast, lager, 74.0%)', GERMAN_LAGER_RE, 1, 'D2 urquell'),
    ('original pilsner (73.0%)', GERMAN_LAGER_RE, 1, 'D2 original pilsner parantez kombo'),
    ('czech pils (wyeast, lager, 72.0%)', GERMAN_LAGER_RE, 1, 'D2 czech pils parantez içi lager'),
    # Düzeltme 3a — wy? prefix fix (yeast_english 1318)
    ('wyeast 1318', ENGLISH_RE, 1, 'D3a wyeast 1318'),
    ('wyeast  1318', ENGLISH_RE, 1, 'D3a wyeast çift boşluk'),
    ('wyeast#1318', ENGLISH_RE, 1, 'D3a wyeast#'),
    ('wyeast.1318', ENGLISH_RE, 1, 'D3a wyeast.'),
    ('wy 1318', ENGLISH_RE, 1, 'D3a wy 1318'),
    ('wy1318', ENGLISH_RE, 1, 'D3a wy1318'),
    ('Wyeast 1318', ENGLISH_RE, 1, 'D3a Wyeast (case)'),
    ('Wyeast 1318 london ale iii', ENGLISH_RE, 1, 'D3a tam isim'),
    # Düzeltme 3a — wy? prefix fix (yeast_czech 2278)
    ('wyeast 2278 czech pilsner', CZECH_LAGER_RE, 1, 'D3a wyeast 2278'),
    ('wy 2278', CZECH_LAGER_RE, 1, 'D3a wy 2278'),
    # Düzeltme 3a — yeast_kolsch 2565
    ('wyeast 2565 kolsch', KOLSCH_RE, 1, 'D3a wyeast 2565'),
    ('wyeast #2565', KOLSCH_RE, 1, 'D3a wyeast #2565'),
    # Düzeltme 3a — yeast_altbier 1338
    ('wyeast 1338 alt', ALTBIER_RE, 1, 'D3a wyeast 1338'),
    # Düzeltme 3a — yeast_cal_common 2112
    ('wyeast 2112 california lager', CAL_COMMON_RE, 1, 'D3a wyeast 2112'),
    # Düzeltme 3a — yeast_witbier 3944
    ('wyeast 3944 belgian witbier', WITBIER_RE, 1, 'D3a wyeast 3944'),
    # Düzeltme 3a — yeast_wheat_german 3068
    ('wyeast 3068 weihenstephan', WHEAT_GERMAN_RE, 1, 'D3a wyeast 3068'),
    # Düzeltme 3a — yeast_american_lager 2007 (KOMBO ONLY)
    ('wyeast 2007 pilsen lager', AMERICAN_LAGER_RE, 1, 'D3a wyeast 2007'),
    # Düzeltme 3a — saison
    ('wyeast 3711 french saison', SAISON_RE, 1, 'D3a saison wyeast 3711'),

    # Düzeltme 3b — DÜŞÜK FP bare numeric
    ('1098', ENGLISH_RE, 1, 'D3b bare 1098'),
    ('2278', CZECH_LAGER_RE, 1, 'D3b bare 2278'),
    ('2565', KOLSCH_RE, 1, 'D3b bare 2565'),
    ('1338', ALTBIER_RE, 1, 'D3b bare 1338'),
    ('2112', CAL_COMMON_RE, 1, 'D3b bare 2112'),
    ('3944', WITBIER_RE, 1, 'D3b bare 3944'),
    ('3068', WHEAT_GERMAN_RE, 1, 'D3b bare 3068'),
    ('5112', BRETT_RE, 1, 'D3b bare 5112'),
    ('5223', LACTO_RE, 1, 'D3b bare 5223 (5335 hariç)'),

    # Düzeltme 3c — YÜKSEK FP bare YOK
    ('1318', ENGLISH_RE, 0, 'D3c bare 1318 (FP %20.4 — bare yakalama YOK)'),
    ('1275', ENGLISH_RE, 0, 'D3c bare 1275 (FP %64.6 — bare yakalama YOK)'),
    ('1968', ENGLISH_RE, 0, 'D3c bare 1968 (FP %10.3 — bare yakalama YOK)'),
    ('2272', CZECH_LAGER_RE, 0, 'D3c bare 2272 (FP %11 — bare yakalama YOK)'),
    ('2007', AMERICAN_LAGER_RE, 0, 'D3c bare 2007 (FP %22.8 — bare yakalama YOK)'),
    ('5335', LACTO_RE, 0, 'D3c bare 5335 (FP %12.2 — bare yakalama YOK)'),
    # FP test — gram/ml ölçü olarak geçen sayılar yakalanmıyor
    ('1318.25 g amarillo', ENGLISH_RE, 0, 'FP gram ölçüsü 1318.25 (bare yakalanmıyor — nokta var word boundary kırılır)'),
    ('1275.7275 g hop', ENGLISH_RE, 0, 'FP gram ölçüsü 1275.7275'),
    ('1968 ml batch', ENGLISH_RE, 0, 'FP ml ölçüsü 1968'),

    # Düzeltme 4+5 — yeast_abbey
    ('wlp 500 belgian abbey', None, None, 'D4 wlp 500 boşluklu'),  # is_abbey kullan
    ('wlp500', None, None, 'D4 wlp500 boşluksuz'),
    ('1214', None, None, 'D5 bare 1214 ÇIKARILDI'),
    ('1762', None, None, 'D5 bare 1762 ÇIKARILDI'),
    ('wyeast 1214 belgian abbey ale', None, None, 'D5 kombo wyeast 1214'),
]

# Run tests
print(f'SPOT TEST ({len(tests)} test):')
ok = bad = 0
for tc in tests:
    s, pat, expected, label = tc
    if pat is None:
        # is_abbey
        actual = 1 if is_abbey(s) else 0
        if 'D5 bare 1214' in label or 'D5 bare 1762' in label:
            expected = 0
        else:
            expected = 1
    else:
        actual = 1 if pat.search(s) else 0
    status = 'OK ' if actual == expected else 'BAD'
    if actual == expected: ok += 1
    else: bad += 1
    print(f'  {status} {label:<55} \"{s[:50]}\" -> {actual} (exp {expected})')

print(f'\\nOK: {ok}/{len(tests)}, BAD: {bad}')
