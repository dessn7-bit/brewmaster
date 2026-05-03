#!/usr/bin/env python3
"""Adim 18c-1c-5 ASAMA 3 — V26 → V27 UNION rebuild + 7 madde audit.

1. V26 → V27 UNION (Adim 18c-1c-5 34 pattern paketi)
2. UNION garantisi (1→0 = 0)
3. 18 yeast feature distribution V26 vs V27
4. 13 cluster özet
5. Lager-cluster DIŞI 0→1 tam audit
6. Wheat cluster özet
7. 34 brand shadow audit + reslug aday
"""
import json, ijson, re, sys, os, time
from pathlib import Path
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
T0 = time.time()
def t(): return f'{time.time()-T0:.1f}s'

ROOT = Path('C:/Users/Kaan/brewmaster')
V26 = ROOT / 'working' / '_v26_aliased_dataset.json'
V27 = ROOT / 'working' / '_v27_aliased_dataset.json'
OUT_FULL = ROOT / 'working' / '_step18c1c5_phase3_full_changes.json'
OUT_LAGER = ROOT / 'working' / '_step18c1c5_phase3_lager_outside_audit.json'
OUT_WHEAT = ROOT / 'working' / '_step18c1c5_phase3_wheat_summary.json'
OUT_BRAND = ROOT / 'working' / '_step18c1c5_phase3_34brands_shadow_audit.json'
OUT_RESLUG = ROOT / 'working' / '_step18c1c5_phase3_reslug_candidates.json'

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

# === Adim 18c-1c-5 PATTERN'ler (commit bedf403 ile identik) ===
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
    r'\b5(335|223|424)\b|'
    r'philly\s*sour',
    re.IGNORECASE)


def compute_yeast_flags(yeast_str_full):
    if not isinstance(yeast_str_full, str) or not yeast_str_full.strip():
        return {f: 0 for f in YEAST_FLAGS}
    y = yeast_str_full.lower()
    f = {}
    f['yeast_belgian'] = 1 if (any(p in y for p in BELGIAN_YEAST_PATTERNS) or
        re.search(r'belgian\s*(saison|ale|abbey|trappist|tripel|dubbel|witbier|lambic|farmhouse)|imperial\s*b[\s\-]?\d+|'
                  r'safbrew\s*[-\s]?[ts][\s-]?(58|33)|safbrew\s+(?:specialty|general/?belgian)\s+ale\s+yeast|'
                  r'antwerp\s+ale\s+yeast|'
                  r'wlp\s*0?(515|570|545)\b|'
                  r'belgian\s+golden\s+ale\s+yeast|belgian\s+strong\s+ale\s+yeast', y)) else 0
    f['yeast_abbey'] = 1 if (any(s in y for s in ABBEY_SUBSTR) or
        re.search(r'abbaye|\b(?:wyeast|wy)\s*[\#\.]?\s*0?(1214|1762|3787|3789)\b', y)) else 0
    f['yeast_saison'] = 1 if re.search(r'saison|sasion|farmhouse|wallonia(n)?|saisonstein|saisonette|seizon|hommage|bugfarm|\b(3711|3724|3725|3726)\b|wlp\s*0?(565|566|568|590|585|670)\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?(3724|3711|3725|3726)\b', y) else 0
    f['yeast_kveik'] = 1 if re.search(r'\bkveik\b|voss|hornindal|lida|laerdal|aurland|stranda|granvin|sigmund|ebbegarden|opshaug|midtbust|gjernes', y) else 0
    f['yeast_english'] = 1 if re.search(
        r'\bwlp\s*0?(002|005|007|011|013|023|029|037)\b|'
        r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?(1098|1187|1275|1318|1469|1968)\b|'
        r'\b(1098|1187|1275|1318|1469|1968)\b|'
        r'english\s+ale|burton\s+ale\s+yeast|ringwood\s+ale|west\s+yorkshire(\s+ale)?|'
        r'yorkshire\s+square\s+ale|manchester\s+ale\s+yeast|european\s+ale(\s+yeast)?', y) else 0
    f['yeast_american'] = 1 if (any(p in y for p in CLEAN_US05_PATTERNS) or
        re.search(r'denny.{0,3}s\s+favorite\s*50|'
                  r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?(1450|1332|1764)\b|\b(1450|1332|1764)\b|\(\s*1764\s*\)|'
                  r'wlp\s*0?(051|090|099)\b|'
                  r'northwest\s+ale|\bpac\s*man\b|'
                  r'san\s+diego\s+super(\s+yeast)?|'
                  r'california\s+v\s+ale\s+yeast|'
                  r'super\s+high\s+gravity(\s+ale)?|'
                  r'\bm\s*44(\s+(?:us|west|west\s+coast))?|u\.?s\.?\s+west\s+coast(\s+yeast)?(\s+m\s*44)?|mangrove\s*jack.{0,15}m\s*44',
                  y)) else 0
    f['yeast_german_lager'] = 1 if re.search(
        r'\bw-?34/70|\bs-?23\b|\bs-?189|2124 bohemian|2206 bavarian|saflager|'
        r'wlp\s*0?(800|802|820|830|833|835|838|840|850|860|885|940)\b|'
        r'\b(2001|2002|2007|2042|2112|2124|2206|2247|2272|2278|2308|2487|2633)\b|'
        r'mangrove\s*jack.{0,30}(m\s*54|m\s*76|m\s*84)|'
        r'\b(m54|m76|m84)\s+(bavarian|munich|bohemian|lager)|'
        r'imperial\s*l\s*(13|17|28)\b|'
        r'\b(bock|doppelbock|maibock|hella\s*bock|munich|vienna|bavarian|o(?:k|c)toberfest[/\s]+m[äa]rzen|o(?:k|c)toberfest|festbier|maerzen|rauchbier|dortmund|helles|schwarzbier|dunkel|budvar|czech\s+(?:pils|budejovice)|pilsner|urquell|original\s*pilsner|danish|zurich|brewferm|diamond|mauribrew)(?:\s+(lager|yeast|blend)|\s*\([^)]*lager)',
        y) else 0
    f['yeast_czech_lager'] = 1 if re.search(r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?(2278|2272)\b|\b(2278|2272)\b|wlp\s*0?802\b|bohemian', y) else 0
    f['yeast_american_lager'] = 1 if re.search(r'wlp\s*0?840\b|2007\s+pilsen|\b(?:wyeast|wy)\s*[\#\.]?\s*0?2007\b|\b2007\b', y) else 0
    f['yeast_kolsch'] = 1 if re.search(r'k[oö]ls(?:ch|h)|kolsch|kolsh|wlp\s*0?(003|029)\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?2565\b|\b2565\b', y) else 0
    f['yeast_altbier'] = 1 if re.search(r'altbier|wlp\s*0?036\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?1338\b|\b1338\b', y) else 0
    f['yeast_cal_common'] = 1 if re.search(r'california\s+lager|wlp\s*0?810\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?2112\b|\b2112\b', y) else 0
    f['yeast_brett'] = 1 if BRETT_RE.search(y) else 0
    f['yeast_lacto'] = 1 if LACTO_RE.search(y) else 0
    f['yeast_sour_blend'] = 1 if re.search(r'sour\s*blend|mixed\s*culture|wildbrew\s*sour|sour\s*pitch|amalgamation|wild\s*ale\s*blend|the\s*funk|barrel\s*blend', y) else 0
    f['yeast_witbier'] = 1 if re.search(r'witbier|wlp\s*0?40[01]\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?(3944|3463)\b|\b(3944|3463)\b|hoegaarden|wit\s*ale|wit\s*yeast|forbidden\s+fruit|brewferm\s+blanche', y) else 0
    f['yeast_wheat_german'] = 1 if re.search(
        r'weihenstephan|wlp\s*0?(300|380)\b|'
        r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?(1010|3056|3068)\b|\b(1010|3056|3068)\b|'
        r'wb[\s\-]?06|hefeweizen|munich\s*wheat|munich\s+classic|'
        r'american\s+wheat(\s+ale)?(\s+yeast)?|bavarian\s+wheat(\s+blend)?|'
        r'danstar\s+munich|lallemand\s+munich(\s+wheat)?|'
        r'schneider\s*[-\s]?weisse|schneider.tap|'
        r"bell.{0,3}s\s+oberon", y) else 0
    f['yeast_wit'] = f['yeast_witbier']
    return f

# 34 brand pattern detector (kayıt için)
BRAND_DETECT = {
    'safbrew_t58': re.compile(r'safbrew\s*[-\s]?t[\s-]?58|safbrew\s+specialty\s+ale\s+yeast', re.IGNORECASE),
    'safbrew_s33': re.compile(r'safbrew\s*[-\s]?s[\s-]?33|safbrew\s+general/?belgian\s+yeast', re.IGNORECASE),
    'dennys_favorite_50': re.compile(r"denny.{0,3}s\s+favorite\s*50|wyeast\s*[\#\.]?\s*0?1450\b|\b1450\b", re.IGNORECASE),
    'burton_ale_023': re.compile(r'burton\s+ale\s+yeast|wlp\s*0?023\b', re.IGNORECASE),
    'northwest_ale_1332': re.compile(r'northwest\s+ale|wyeast\s*[\#\.]?\s*0?1332\b|\b1332\b', re.IGNORECASE),
    'ringwood_ale_1187': re.compile(r'ringwood\s+ale|wyeast\s*[\#\.]?\s*0?1187\b|\b1187\b', re.IGNORECASE),
    'pacman_1764': re.compile(r'\bpac\s*man\b|wyeast\s*[\#\.]?\s*0?1764\b|\b1764\b', re.IGNORECASE),
    'san_diego_super_090': re.compile(r'san\s+diego\s+super|wlp\s*0?090\b', re.IGNORECASE),
    'california_v_051': re.compile(r'california\s+v\s+ale\s+yeast|wlp\s*0?051\b', re.IGNORECASE),
    'super_high_gravity_099': re.compile(r'super\s+high\s+gravity|wlp\s*0?099\b', re.IGNORECASE),
    'antwerp_ale_515': re.compile(r'antwerp\s+ale\s+yeast|wlp\s*0?515\b', re.IGNORECASE),
    'west_yorkshire_1469': re.compile(r'west\s+yorkshire|wyeast\s*[\#\.]?\s*0?1469\b|\b1469\b', re.IGNORECASE),
    'yorkshire_square_037': re.compile(r'yorkshire\s+square\s+ale|wlp\s*0?037\b', re.IGNORECASE),
    'manchester_ale': re.compile(r'manchester\s+ale\s+yeast', re.IGNORECASE),
    'american_wheat_1010': re.compile(r'american\s+wheat|wyeast\s*[\#\.]?\s*0?1010\b|\b1010\b', re.IGNORECASE),
    'bavarian_wheat_3056': re.compile(r'bavarian\s+wheat|wyeast\s*[\#\.]?\s*0?3056\b|\b3056\b', re.IGNORECASE),
    'forbidden_fruit_3463': re.compile(r'forbidden\s+fruit|wyeast\s*[\#\.]?\s*0?3463\b|\b3463\b', re.IGNORECASE),
    'brewferm_blanche': re.compile(r'brewferm\s+blanche', re.IGNORECASE),
    'danstar_munich': re.compile(r'danstar\s+munich|lallemand\s+munich(\s+wheat)?', re.IGNORECASE),
    'schneider_weisse': re.compile(r'schneider\s*[-\s]?weisse|schneider.tap', re.IGNORECASE),
    'bells_oberon': re.compile(r"bell.{0,3}s\s+oberon", re.IGNORECASE),
    'belgian_golden_570': re.compile(r'belgian\s+golden\s+ale\s+yeast|wlp\s*0?570\b', re.IGNORECASE),
    'belgian_strong_545': re.compile(r'belgian\s+strong\s+ale\s+yeast|wlp\s*0?545\b', re.IGNORECASE),
    'european_ale_011': re.compile(r'european\s+ale|wlp\s*0?011\b', re.IGNORECASE),
    'oktoberfest_marzen_slash': re.compile(r'o(?:k|c)toberfest[/\s]+m[äa]rzen', re.IGNORECASE),
    'mauribrew_lager': re.compile(r'mauribrew\s+lager', re.IGNORECASE),
    'octoberfest_lager_blend': re.compile(r'o(?:k|c)toberfest\s+lager\s+blend', re.IGNORECASE),
    'us_west_coast_m44': re.compile(r'\bm\s*44(\s+(?:us|west))?|u\.?s\.?\s+west\s+coast', re.IGNORECASE),
    'kolsh_typo': re.compile(r'\bk[oö]lsh\b', re.IGNORECASE),
    'bare_1318': re.compile(r'\b1318\b'),
    'bare_1968': re.compile(r'\b1968\b'),
    'bare_1275': re.compile(r'\b1275\b'),
    'bare_2272': re.compile(r'\b2272\b'),
    'bare_2007': re.compile(r'\b2007\b'),
    'bare_5335': re.compile(r'\b5335\b'),
}

def deep_clean(o):
    if isinstance(o, dict): return {k: deep_clean(v) for k, v in o.items()}
    if isinstance(o, list): return [deep_clean(x) for x in o]
    if hasattr(o, '__float__') and not isinstance(o, (bool, int, float)): return float(o)
    return o


# === V26 → V27 UNION rebuild ===
print(f'[{t()}] V26 → V27 UNION rebuild + 7 madde audit')

total = 0
changed_count = 0
before_active = Counter()
after_active = Counter()
delta_zero_to_one = Counter()
delta_one_to_zero = Counter()

cluster_total = Counter()
cluster_no_yeast_before = Counter()
cluster_no_yeast_after = Counter()
cluster_feat_after = defaultdict(lambda: Counter())  # cluster -> feature -> after

# Wheat detay
wheat_no_yeast_after_slug = Counter()

# Lager DIŞI 0→1 yakalama
lager_outside = []

# 34 brand cluster bazinda (V27 yakalama + cluster yanlış slug aday)
brand_cluster_dist = defaultdict(lambda: Counter())
brand_target_feat = {
    'safbrew_t58':'yeast_belgian','safbrew_s33':'yeast_belgian','dennys_favorite_50':'yeast_american',
    'burton_ale_023':'yeast_english','northwest_ale_1332':'yeast_american','ringwood_ale_1187':'yeast_english',
    'pacman_1764':'yeast_american','san_diego_super_090':'yeast_american','california_v_051':'yeast_american',
    'super_high_gravity_099':'yeast_american','antwerp_ale_515':'yeast_belgian',
    'west_yorkshire_1469':'yeast_english','yorkshire_square_037':'yeast_english','manchester_ale':'yeast_english',
    'american_wheat_1010':'yeast_wheat_german','bavarian_wheat_3056':'yeast_wheat_german',
    'forbidden_fruit_3463':'yeast_witbier','brewferm_blanche':'yeast_witbier',
    'danstar_munich':'yeast_wheat_german','schneider_weisse':'yeast_wheat_german','bells_oberon':'yeast_wheat_german',
    'belgian_golden_570':'yeast_belgian','belgian_strong_545':'yeast_belgian','european_ale_011':'yeast_english',
    'oktoberfest_marzen_slash':'yeast_german_lager','mauribrew_lager':'yeast_german_lager',
    'octoberfest_lager_blend':'yeast_german_lager','us_west_coast_m44':'yeast_american',
    'kolsh_typo':'yeast_kolsch',
    'bare_1318':'yeast_english','bare_1968':'yeast_english','bare_1275':'yeast_english',
    'bare_2272':'yeast_czech_lager','bare_2007':'yeast_american_lager','bare_5335':'yeast_lacto',
}
brand_ok_clusters = {
    'safbrew_t58':['strong_ale','wheat','specialty','sour','saison'],
    'safbrew_s33':['strong_ale','wheat','specialty','brown_ale','pale_ale','saison'],
    'dennys_favorite_50':['ipa','pale_ale','brown_ale','stout','porter','strong_ale'],
    'burton_ale_023':['ipa','pale_ale','brown_ale','stout','porter','strong_ale'],
    'northwest_ale_1332':['ipa','pale_ale','brown_ale','stout','porter'],
    'ringwood_ale_1187':['ipa','pale_ale','brown_ale','stout','porter'],
    'pacman_1764':['ipa','pale_ale','brown_ale','stout','porter'],
    'san_diego_super_090':['ipa','pale_ale','strong_ale','stout'],
    'california_v_051':['ipa','pale_ale','strong_ale'],
    'super_high_gravity_099':['strong_ale','stout','ipa'],
    'antwerp_ale_515':['strong_ale','wheat','specialty','pale_ale'],
    'west_yorkshire_1469':['ipa','pale_ale','brown_ale','porter','stout'],
    'yorkshire_square_037':['ipa','pale_ale','brown_ale','porter','stout'],
    'manchester_ale':['ipa','pale_ale','brown_ale','porter','stout'],
    'american_wheat_1010':['wheat','specialty'],
    'bavarian_wheat_3056':['wheat','specialty'],
    'forbidden_fruit_3463':['wheat','specialty','strong_ale'],
    'brewferm_blanche':['wheat','specialty'],
    'danstar_munich':['wheat','lager','lager_dark'],
    'schneider_weisse':['wheat'],
    'bells_oberon':['wheat'],
    'belgian_golden_570':['strong_ale','wheat','saison'],
    'belgian_strong_545':['strong_ale','specialty'],
    'european_ale_011':['pale_ale','brown_ale','strong_ale'],
    'oktoberfest_marzen_slash':['lager','bock','pilsner','lager_dark'],
    'mauribrew_lager':['lager','pilsner','bock'],
    'octoberfest_lager_blend':['lager','bock','pilsner','lager_dark'],
    'us_west_coast_m44':['ipa','pale_ale','strong_ale'],
    'kolsh_typo':['pale_ale'],
    'bare_1318':'multiple','bare_1968':'multiple','bare_1275':'multiple',
    'bare_2272':'multiple','bare_2007':'multiple','bare_5335':'multiple',
}

reslug_candidates = []  # tüm cluster_yanlis_slug aday

# Tam değişiklik
full_changes = []

WHEAT_SLUG_NO_YEAST = Counter()

with open(V26, 'rb') as fin, open(V27, 'w', encoding='utf-8') as fout:
    fout.write('{"recipes":[')
    first = False

    for r in ijson.items(fin, 'recipes.item'):
        total += 1
        if total % 50000 == 0:
            print(f'  [{t()}] scanned {total}, changed {changed_count}, lager_outside {len(lager_outside)}')
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
            if new[k]:
                after_active[k] += 1
                cluster_feat_after[cluster][k] += 1
            if old[k]==0 and new[k]==1: delta_zero_to_one[k] += 1
            if old[k]==1 and new[k]==0: delta_one_to_zero[k] += 1

        no_old = sum(1 for k in YEAST_FLAGS if old[k]) == 0
        no_new = sum(1 for k in YEAST_FLAGS if new[k]) == 0
        if no_old: cluster_no_yeast_before[cluster] += 1
        if no_new:
            cluster_no_yeast_after[cluster] += 1
            if cluster == 'wheat': WHEAT_SLUG_NO_YEAST[slug] += 1

        # Lager DIŞI 0→1 (3 lager feature)
        for lf in ('yeast_german_lager','yeast_czech_lager','yeast_american_lager'):
            if old[lf]==0 and new[lf]==1 and cluster not in LAGER_FAMILY:
                lager_outside.append({
                    'recipe_id': r.get('id'),'source': r.get('source'),
                    'slug': slug,'cluster': cluster,'feature_triggered': lf,
                    'raw_yeast': y if isinstance(y, str) else None,
                })

        # 34 brand: hangi cluster'larda match
        if isinstance(y, str):
            ystr = y.lower()
            for bid, pat in BRAND_DETECT.items():
                if pat.search(ystr):
                    brand_cluster_dist[bid][cluster] += 1
                    # Reslug aday: brand bilinen tipiyle uyumsuz cluster
                    ok = brand_ok_clusters.get(bid, [])
                    if ok != 'multiple' and cluster not in ok:
                        reslug_candidates.append({
                            'recipe_id': r.get('id'),'source': r.get('source'),
                            'slug': slug,'cluster': cluster,'brand': bid,
                            'expected_clusters': ok,'raw_yeast': ystr[:120],
                        })

        # Değişiklik kayıt
        if old != new:
            changed_count += 1
            full_changes.append({
                'recipe_id': r.get('id'),'source': r.get('source'),'slug': slug,'cluster': cluster,
                'raw_yeast': (y[:200] if isinstance(y, str) else None),
                'flags_v26': old,'flags_v27': new,
                'delta_0_to_1': [k for k in YEAST_FLAGS if old[k]==0 and new[k]==1],
            })

        # Update + write V27
        for k in YEAST_FLAGS:
            feat[k] = new[k]
        r['features'] = feat
        if first: fout.write(',')
        else: first = True
        json.dump(deep_clean(r), fout, ensure_ascii=False)

    fout.write('],"meta":{"version":"v27","date":"2026-05-03","based_on":"v26_aliased","yeast_pattern_version":"adim_18c1c5_34_pattern_paketi"}}')

print(f'\n[{t()}] V26 → V27 tamam: total={total}, changed={changed_count}')
print(f'  V27: {os.path.getsize(V27)/1024/1024:.1f} MB')

# UNION garantisi
total_one_to_zero = sum(delta_one_to_zero.values())
print(f'\nUNION garantisi: 1→0 toplam = {total_one_to_zero}')

# === GÖREV 2: 18 yeast feature distribution ===
print('\n' + '=' * 95)
print('B. 18 yeast feature distribution V26 vs V27')
print('=' * 95)
print(f"  {'feature':<22}{'V26':>10}{'V27':>10}{'delta':>10}{'0→1':>10}{'1→0':>8}")
for k in YEAST_FLAGS:
    print(f"  {k:<22}{before_active[k]:>10}{after_active[k]:>10}{after_active[k]-before_active[k]:>+10}{delta_zero_to_one[k]:>10}{delta_one_to_zero[k]:>8}")

# === GÖREV 3: 13 cluster özet ===
print('\n' + '=' * 95)
print('C. 13 cluster özet V26 vs V27')
print('=' * 95)
print(f"  {'cluster':<14}{'total':>8}{'no_y V26':>11}{'no_y V27':>11}{'delta':>8}{'no_y % V27':>12}")
clusters = ['wheat','specialty','strong_ale','sour','pale_ale','ipa','brown_ale',
            'lager','stout','bock','porter','lager_dark','saison','pilsner','unmapped']
for c in clusters:
    n = cluster_total[c]
    nb = cluster_no_yeast_before[c]; na = cluster_no_yeast_after[c]
    pct = na/n*100 if n else 0
    print(f"  {c:<14}{n:>8}{nb:>11}{na:>11}{na-nb:>+8}{pct:>11.2f}%")

# === GÖREV 4: Lager DIŞI 0→1 ===
print('\n' + '=' * 95)
print('D. Lager DIŞI 0→1 TAM AUDIT (yeast_GL/CL/AL)')
print('=' * 95)
print(f'  toplam: {len(lager_outside)}')
out_feat = Counter(rec['feature_triggered'] for rec in lager_outside)
out_cluster = Counter(rec['cluster'] for rec in lager_outside)
out_slug = Counter(rec['slug'] for rec in lager_outside)
print(f'\n  feature_triggered:')
for f_, n in out_feat.most_common(): print(f'    {f_:<22} {n}')
print(f'\n  cluster:')
for c, n in out_cluster.most_common(): print(f'    {c:<14} {n}')
print(f'\n  slug top 15:')
for s, n in out_slug.most_common(15): print(f'    {s:<32} {n}')

with open(OUT_LAGER, 'w', encoding='utf-8') as f:
    json.dump({'meta':{'total':len(lager_outside)},
               'feature_triggered_dist':dict(out_feat),
               'cluster_dist':dict(out_cluster),
               'slug_dist':dict(out_slug),
               'records':lager_outside}, f, ensure_ascii=False, indent=2)
print(f'\n  JSON: {OUT_LAGER} ({os.path.getsize(OUT_LAGER)/1024:.1f} KB)')

# === GÖREV 5: Wheat cluster özet ===
print('\n' + '=' * 95)
print('E. Wheat cluster özet V26 vs V27')
print('=' * 95)
n = cluster_total['wheat']; nb = cluster_no_yeast_before['wheat']; na = cluster_no_yeast_after['wheat']
print(f'  total: {n}')
print(f'  no_yeast V26→V27: {nb} ({nb/n*100:.2f}%) → {na} ({na/n*100:.2f}%)  Δ {na-nb:+}')
print(f'\n  yeast_wheat_german aktif (V27): {cluster_feat_after["wheat"]["yeast_wheat_german"]}')
print(f'  yeast_witbier aktif (V27): {cluster_feat_after["wheat"]["yeast_witbier"]}')
print(f'\n  V27 wheat no_yeast slug dağılımı:')
for s, count in WHEAT_SLUG_NO_YEAST.most_common():
    print(f'    {s:<32} {count}')
with open(OUT_WHEAT, 'w', encoding='utf-8') as f:
    json.dump({'total':n,'no_yeast_v26':nb,'no_yeast_v27':na,
               'no_yeast_slug':dict(WHEAT_SLUG_NO_YEAST),
               'yeast_wheat_german_v27':cluster_feat_after['wheat']['yeast_wheat_german'],
               'yeast_witbier_v27':cluster_feat_after['wheat']['yeast_witbier']},
              f, ensure_ascii=False, indent=2)
print(f'  JSON: {OUT_WHEAT}')

# === GÖREV 6: 34 brand shadow audit ===
print('\n' + '=' * 95)
print('F. 34 brand shadow audit (V27 cluster bazında)')
print('=' * 95)
print(f"  {'brand':<26}{'toplam':>8}{'top_cluster':<22}{'cluster_yanlis':>14}")
brand_summary = {}
for bid in BRAND_DETECT:
    cd = brand_cluster_dist[bid]
    total_b = sum(cd.values())
    top = cd.most_common(1)[0] if cd else ('-', 0)
    ok_c = brand_ok_clusters.get(bid, [])
    yanlis = sum(n for c, n in cd.items() if (ok_c != 'multiple' and c not in ok_c))
    print(f"  {bid:<26}{total_b:>8}{top[0]+' ('+str(top[1])+')':<22}{yanlis:>14}")
    brand_summary[bid] = {'total':total_b,'cluster_dist':dict(cd),'cluster_yanlis':yanlis}
with open(OUT_BRAND, 'w', encoding='utf-8') as f:
    json.dump(brand_summary, f, ensure_ascii=False, indent=2)
print(f'\n  JSON: {OUT_BRAND}')

# === GÖREV 7: Reslug aday ===
print('\n' + '=' * 95)
print('G. Reslug aday özet')
print('=' * 95)
print(f'  toplam aday: {len(reslug_candidates)}')
res_cluster = Counter(rec['cluster'] for rec in reslug_candidates)
res_brand = Counter(rec['brand'] for rec in reslug_candidates)
print(f'\n  cluster dağılımı:')
for c, n in res_cluster.most_common():
    print(f'    {c:<14} {n}')
print(f'\n  brand dağılımı (top 10):')
for b, n in res_brand.most_common(10):
    print(f'    {b:<26} {n}')
with open(OUT_RESLUG, 'w', encoding='utf-8') as f:
    json.dump({'meta':{'total':len(reslug_candidates)},
               'cluster_dist':dict(res_cluster),'brand_dist':dict(res_brand),
               'records':reslug_candidates[:5000]},  # ilk 5000 örnek
              f, ensure_ascii=False, indent=2)
print(f'  JSON: {OUT_RESLUG}')

# Tam değişiklik
with open(OUT_FULL, 'w', encoding='utf-8') as f:
    json.dump(full_changes, f, ensure_ascii=False)
print(f'\nFull changes: {OUT_FULL} ({len(full_changes)} kayit, {os.path.getsize(OUT_FULL)/1024/1024:.2f} MB)')

print(f'\n[{t()}] AUDIT TAMAM')
