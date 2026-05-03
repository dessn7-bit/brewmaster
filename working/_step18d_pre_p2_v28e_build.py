"""
Adim 18d-pre P2 — V28e build (V28d -> V28e, 8 pattern guncelleme).

V28d input. raw.yeast'e parser yeni regex'lerini uygula, yeast_* flag
update et. Slug DOKUNULMAZ. Drift guard: yeast feature disinda hicbir
sey degismez.
"""
import ijson, json, re, time, hashlib, os, sys
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

V28D = 'working/_v28d_aliased_dataset.json'
V28E = 'working/_v28e_aliased_dataset.json'
AUDIT = 'working/_step18d_pre_p2_v28e_audit.json'
V28D_BASELINE_SHA = 'efa0115a91fc3b571e529c58f3e5c48c325ab3647ef7a881da7cb637710c199f'

# Yeni pattern'ler (parser kodu satir 263-417 ile identik)
PAT_BELGIAN = re.compile(
    r'belgian\s*(saison|ale|abbey|trappist|tripel|dubbel|witbier|lambic|farmhouse)|imperial\s*b[\s\-]?\d+|'
    r'safbrew\s*[-\s]?[ts][\s-]?(58|33)|safbrew\s+(?:specialty|general/?belgian)\s+ale\s+yeast|'
    r'antwerp\s+ale\s+yeast|'
    r'wlp\s*0?(510|515|545|570|575)\b|'
    r'\bt[\s\-]?58\b|\bs[\s\-]?33\b|bastogne|belgian\s+style\s+ale\s+blend|'
    r'belgian\s+golden\s+ale\s+yeast|belgian\s+strong\s+ale\s+yeast', re.IGNORECASE)
BELGIAN_YEAST_PATTERNS = ('wlp500', 'wlp 500', 'wlp530', 'wlp 530', 'wlp540', 'wlp 540', 'wlp565',
    'wlp566', 'wlp568', 'wlp575', 'wlp 575', 'wlp590', 'wlp585', 'wlp670',
    'imperial b48', 'imperial b56', 'belgian abbey', 'belgian trappist',
    'belgian tripel', 'belgian dubbel', 'wallonian')

PAT_ENGLISH = re.compile(
    r'\bwlp\s*0?(002|005|007|011|013|023|029|037)\b|'
    r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?(1098|1187|1275|1318|1469|1945|1968)\b|'
    r'\b(1098|1187|1275|1318|1469|1945|1968)\b|'
    r'english\s+ale|burton\s+ale\s+yeast|ringwood\s+ale|west\s+yorkshire(\s+ale)?|'
    r'yorkshire\s+square\s+ale|manchester\s+ale\s+yeast|european\s+ale(\s+yeast)?|'
    r'\bneobritannia\b|nb[\s\-]+neobritannia|'
    r'australian\s+ale|burton\s+union\s*\(?\s*mangrove\s+jack', re.IGNORECASE)

PAT_AMERICAN = re.compile(
    r'denny.{0,3}s\s+favorite\s*50|'
    r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?(1450|1332|1764)\b|\b(1450|1332|1764)\b|\(\s*1764\s*\)|'
    r'wlp\s*0?(051|072|080|090|099|862)\b|'
    r'northwest\s+ale|\bpac\s*man\b|'
    r'san\s+diego\s+super(\s+yeast)?|'
    r'california\s+v\s+ale\s+yeast|'
    r'super\s+high\s+gravity(\s+ale)?|'
    r'\bm\s*44(\s+(?:us|west|west\s+coast))?|u\.?s\.?\s+west\s+coast(\s+yeast)?(\s+m\s*44)?|mangrove\s*jack.{0,15}m\s*44|'
    r'\bnorcal\s*#?\s*1\b|gigayeast.{0,10}norcal|\bgy\s*0?001\b|'
    r'vermont\s+ale|east\s+coast\s+ale|cream\s+ale\s+(?:yeast\s+)?blend|cry\s+havoc|'
    r'muntons\s+premium\s+gold|'
    r'coopers?\s+(?:brewery\s+)?pure\s+brewers?(\s+yeast)?', re.IGNORECASE)
CLEAN_US05_PATTERNS = ('wlp001', 'wlp 001', 'us-05', 'us05', 'safale us-05', 'safale us 05',
    'safale-us05', 'wyeast 1056', 'wy1056', '1056 american', 'american ale 1056',
    'chico', 'sierra nevada')

PAT_LAGER = re.compile(
    r'\bw-?34/70|\bs-?23\b|\bs-?189|2124 bohemian|2206 bavarian|'
    r'saflager|'
    r'wlp\s*0?(800|802|820|830|833|835|838|840|850|860|862|885|940)\b|'
    r'\b(2001|2002|2007|2042|2112|2124|2206|2247|2278|2308|2487|2633)\b|'
    r'mangrove\s*jack.{0,30}(m\s*54|m\s*76|m\s*84)|'
    r'\b(m54|m76|m84)\s+(bavarian|munich|bohemian|lager)|'
    r'imperial\s*l\s*(13|17|28)\b|'
    r'\b(bock|doppelbock|maibock|hella\s*bock|munich|vienna|bavarian|o(?:k|c)toberfest[/\s]+m[äa]rzen|o(?:k|c)toberfest|festbier|maerzen|rauchbier|dortmund|helles|schwarzbier|dunkel|budvar|czech\s+(?:pils|budejovice)|pilsner|urquell|original\s*pilsner|danish|zurich|brewferm|diamond|mauri\s*brew)(?:\s+(lager|yeast|blend)|\s*\([^)]*lager)|'
    r'\blalbrew\s+diamond\b|\blallemand\s+(?:premium\s+)?diamond\b|\bdiamond\s+lager(\s+yeast)?\b', re.IGNORECASE)

PAT_SOUR_BLEND = re.compile(
    r'sour\s*blend|mixed\s*culture|wildbrew\s*sour|sour\s*pitch|amalgamation|wild\s*ale\s*blend|the\s*funk|barrel\s*blend|'
    r'wlp\s*0?(630|655|670)\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?(3191|3278)\b|\b(3191|3278)\b|'
    r'ecy[\s\-]?0?2\b|flemish\s+ale\s+blend|berliner\s+weisse\s+blend', re.IGNORECASE)

PAT_WITBIER = re.compile(
    r'witbier|wlp\s*0?(400|401|410|4015)\b|'
    r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?(3944|3463|3942)\b|\b(3944|3463|3942)\b|'
    r'\bm[\s\-]?21\b|mangrove\s+jacks?\s+belgian\s+wit|lalbrew\s+wit\b|\bb[\s\-]?44\b|imperial\s+witbier|'
    r'hoegaarden|wit\s*ale|wit\s*yeast|forbidden\s+fruit|brewferm\s+blanche', re.IGNORECASE)

PAT_WHEAT_G = re.compile(
    r'weihenstephan|wlp\s*0?(300|380)\b|'
    r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?(1010|3056|3068|3942)\b|\b(1010|3056|3068|3942)\b|'
    r'wb[\s\-]?06|hefeweizen|munich\s*wheat|munich\s+classic|'
    r'american\s+wheat(\s+ale)?(\s+yeast)?|bavarian\s+wheat(\s+blend)?|'
    r'danstar\s+munich|lallemand\s+munich(\s+wheat)?|'
    r'schneider\s*[-\s]?weisse|schneider.tap|'
    r"bell'?s?\s+oberon", re.IGNORECASE)

# BRETT_RE _step52 ile identik + ECY02 ek
BRETT_RE = re.compile(
    r'brett(anomyces|y|ish|ed)?\b|'
    r'\bwlp\s*0?(644|645|648|650|651|652|653|654|655|656|660|665|670|671|672|4639)\b|'
    r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?5(112|151|526|512|733|378)\b|'
    r'\b5(112|151|526|512|733|378)\b|'
    r'bruxellensis|lambicus|drie|trois|clausenii|'
    r'\bwild\s*(ale|yeast|fermentation|brew)\b|'
    r'wildbrew\s*sour|philly\s*sour|lallemand\s*wild|omega\s*(?:yeast\s*)?(?:cosmic|saisonstein|hothead)|'
    r'\bfoeder\b|funky|farmhouse\s*sour|barrel\s*(?:aged\s*)?sour|'
    r'amalgamation|cosmic|hothead\s*ale|all\s*the\s*bretts|funkwerks|saisonstein|'
    r'ecy[\s\-]?0?2\b|flemish\s+ale\s+blend',
    re.IGNORECASE)

# Updated 8 yeast feature
P2_FEATURES = ['yeast_belgian','yeast_english','yeast_american','yeast_german_lager',
               'yeast_sour_blend','yeast_witbier','yeast_wheat_german','yeast_brett']
ALL_18 = ['yeast_abbey','yeast_altbier','yeast_american','yeast_american_lager',
          'yeast_belgian','yeast_brett','yeast_cal_common','yeast_czech_lager','yeast_english',
          'yeast_german_lager','yeast_kolsch','yeast_kveik','yeast_lacto','yeast_saison',
          'yeast_sour_blend','yeast_wheat_german','yeast_wit','yeast_witbier']

def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        while True:
            c = f.read(8 * 1024 * 1024)
            if not c: break
            h.update(c)
    return h.hexdigest()

def compute_p2_yeast(yeast_str_lower):
    out = {}
    out['yeast_belgian'] = 1 if (any(p in yeast_str_lower for p in BELGIAN_YEAST_PATTERNS) or PAT_BELGIAN.search(yeast_str_lower)) else 0
    out['yeast_english'] = 1 if PAT_ENGLISH.search(yeast_str_lower) else 0
    out['yeast_american'] = 1 if (any(p in yeast_str_lower for p in CLEAN_US05_PATTERNS) or PAT_AMERICAN.search(yeast_str_lower)) else 0
    out['yeast_german_lager'] = 1 if PAT_LAGER.search(yeast_str_lower) else 0
    out['yeast_sour_blend'] = 1 if PAT_SOUR_BLEND.search(yeast_str_lower) else 0
    out['yeast_witbier'] = 1 if PAT_WITBIER.search(yeast_str_lower) else 0
    out['yeast_wheat_german'] = 1 if PAT_WHEAT_G.search(yeast_str_lower) else 0
    out['yeast_brett'] = 1 if BRETT_RE.search(yeast_str_lower) else 0
    return out

# === STEP 1: V28d sha guard
print('=== STEP 1 — V28d sha guard ===', flush=True)
v28d_sha = sha(V28D)
print(f'V28d sha: {v28d_sha} ({"esit" if v28d_sha == V28D_BASELINE_SHA else "FARK"})', flush=True)
if v28d_sha != V28D_BASELINE_SHA:
    raise SystemExit('V28d SHA SAPMASI: BUILD IPTAL')

# === STEP 2: V28e build
print('\n=== STEP 2 — V28e build ===', flush=True)
t0 = time.time()
total = 0
flag_changes = Counter()  # (feature, 0->1 OR 1->0): count
flag_change_sample = {f:[] for f in P2_FEATURES}
non_p2_drift = 0  # Diger 18 yeast feature (saison/abbey/kolsch vs) degismemeli
slug_drift = 0   # bjcp_slug degismemeli (zaten yapmiyoruz)

with open(V28D, 'rb') as fin, open(V28E, 'w', encoding='utf-8') as fout:
    fout.write('{"recipes":[')
    parser = ijson.items(fin, 'recipes.item', use_float=True)
    first = True
    for r in parser:
        total += 1
        feats = r.get('features',{}) or {}
        raw_yeast = (r.get('raw',{}) or {}).get('yeast','') or ''
        yeast_lower = raw_yeast.lower()

        # Mevcut 18 flag'i sakla
        old_18 = {f: int(feats.get(f,0) or 0) for f in ALL_18}

        # Yeni 8 flag hesapla
        new_p2 = compute_p2_yeast(yeast_lower)

        # 8 pattern UNION uygula: new_flag = old_flag OR new_pattern_match
        # 1->0 yasak (eski parser flag'leri korunur, yeni pattern sadece 0->1 ekler)
        for f in P2_FEATURES:
            old_v = old_18[f]
            new_v = new_p2[f]
            union_v = old_v | new_v
            if old_v != union_v:
                # Sadece 0->1 olabilir (UNION mantigi)
                key = f'{f}_0->1'
                flag_changes[key] += 1
                feats[f] = union_v
                if len(flag_change_sample[f]) < 5:
                    flag_change_sample[f].append({
                        'id': r.get('id'),
                        'slug': r.get('bjcp_slug'),
                        'old': old_v,
                        'new': union_v,
                        'raw_yeast_first120': raw_yeast[:120],
                    })
        # yeast_wit alias
        if 'yeast_wit' in feats:
            feats['yeast_wit'] = feats.get('yeast_witbier',0)

        # Drift guard: P2 disi 18 feature degismemeli
        for f in ALL_18:
            if f in P2_FEATURES or f == 'yeast_wit': continue
            if int(feats.get(f,0) or 0) != old_18[f]:
                non_p2_drift += 1

        if not first: fout.write(',')
        fout.write(json.dumps(r, ensure_ascii=False, default=str))
        first = False

        if total % 50000 == 0:
            print(f'  [{total} recete, {time.time()-t0:.1f}s]', flush=True)

    fout.write(']}')

elapsed = time.time() - t0
print(f'\nV28e build: {elapsed:.1f}s, {total} recete', flush=True)
total_changes = sum(flag_changes.values())
print(f'Toplam flag degisiklik: {total_changes}', flush=True)
print(f'\nFlag degisiklik dagilim:', flush=True)
for k, v in sorted(flag_changes.items()):
    print(f'  {k:40s} {v}', flush=True)
print(f'\nnon_p2_drift (P2 disi yeast feature degisiklik, beklenen 0): {non_p2_drift}', flush=True)

# Esik kontrolu
if total_changes > 50000:
    print(f'BUILD ETKI ANOMALI: {total_changes} > 50000', flush=True)
    if os.path.exists(V28E): os.remove(V28E)
    raise SystemExit('BUILD ETKI ANOMALI: KAAN ONAY')

# === STEP 3: V28d post sha
v28d_post = sha(V28D)
print(f'\nV28d post-sha: {v28d_post} ({"esit" if v28d_post == V28D_BASELINE_SHA else "FARK"})', flush=True)

# === STEP 4: V28e meta + sha
v28e_size_pre = os.path.getsize(V28E)
print(f'V28e pre-meta size: {v28e_size_pre}', flush=True)

with open('working/_v19_dataset.json','r',encoding='utf-8') as f:
    v19 = json.load(f)
v28e_meta = dict(v19['meta'])
v28e_meta['version'] = 'V28e'
v28e_meta['count'] = total
v28e_meta['v28e_built_from'] = 'V28d + Adim 18d-pre P2 (8 yeast pattern guncelleme, slug dokunulmaz)'
v28e_meta['v28e_sprint'] = 'Adim 18d-pre P2'
del v19

with open(V28E, 'rb') as f:
    f.seek(max(0, v28e_size_pre - 100))
    tail = f.read()
tail_str = tail.decode('utf-8', errors='replace')
trim_bytes = (len(tail) - len(tail_str.rstrip())) + 1
truncate = v28e_size_pre - trim_bytes

V28E_TMP = V28E + '.tmp'
meta_json = json.dumps(v28e_meta, ensure_ascii=False, separators=(',',':'))
with open(V28E, 'rb') as fin, open(V28E_TMP, 'wb') as fout:
    rem = truncate
    while rem > 0:
        ch = min(8 * 1024 * 1024, rem)
        chunk = fin.read(ch)
        if not chunk: break
        fout.write(chunk)
        rem -= len(chunk)
    fout.write(b',"meta":')
    fout.write(meta_json.encode('utf-8'))
    fout.write(b'}')
os.replace(V28E_TMP, V28E)

v28e_final_sha = sha(V28E)
v28e_final_size = os.path.getsize(V28E)
print(f'V28e final sha: {v28e_final_sha}, size: {v28e_final_size}', flush=True)

audit = {
    'meta': {
        'sprint': 'Adim 18d-pre P2 V28e build',
        'rule_refs': ['KURAL 1.4','KURAL 4.4','KURAL 9.2'],
        'build_seconds': round(elapsed,1),
    },
    'v28d_baseline': {
        'pre_sha': v28d_sha,
        'post_sha': v28d_post,
        'intact': v28d_post == V28D_BASELINE_SHA,
    },
    'v28e': {
        'path': V28E,
        'sha256_final': v28e_final_sha,
        'size_bytes_final': v28e_final_size,
        'recipe_count': total,
    },
    'flag_changes': dict(flag_changes),
    'flag_change_total': total_changes,
    'flag_change_sample_5_per_feature': flag_change_sample,
    'drift_guard': {
        'non_p2_drift': non_p2_drift,
        'beklenen': 0,
    },
}
with open(AUDIT, 'w', encoding='utf-8') as f:
    json.dump(audit, f, ensure_ascii=False, indent=2, default=str)

print(f'\nCikti: {AUDIT}', flush=True)
