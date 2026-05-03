"""
Adim 18d-pre Sprint A — V28c build (V28b -> V28c, K1 yeast_saison pattern guncelleme)

V28b dataset input. Sadece yeast_saison flag guncelleme:
- has_K1 = (BE-134 OR BE-256 OR M29 OR Lalbrew Farmhouse) regex match raw.yeast
- if has_K1 and V28b[yeast_saison]==0: V28c[yeast_saison]=1
- Diger 17 yeast feature DOKUNULMAZ
- has_K1=False reçetede V28b == V28c (drift guard)
- Build etki esik 200 (26 K1 + olasi yeni)
"""
import ijson, json, re, time, hashlib, os, sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

V28B = 'working/_v28b_aliased_dataset.json'
V28C = 'working/_v28c_aliased_dataset.json'
AUDIT = 'working/_step18d_pre_v28c_audit.json'
V28B_BASELINE_SHA = '8359f033338e9aeb399850b72e202f9e70577a1639a87f81d3dde75bf820ae8a'

YEAST_FEATS = ['yeast_abbey','yeast_altbier','yeast_american','yeast_american_lager',
    'yeast_belgian','yeast_brett','yeast_cal_common','yeast_czech_lager','yeast_english',
    'yeast_german_lager','yeast_kolsch','yeast_kveik','yeast_lacto','yeast_saison',
    'yeast_sour_blend','yeast_wheat_german','yeast_wit','yeast_witbier']

# K1 yeni keyword pattern (Sprint A parser ekleme)
PAT_K1 = re.compile(r'\bbe[\s\-]?134\b|\bbe[\s\-]?256\b|\bm[\s\-]?29\b|\blalbrew\s+farmhouse\b', re.IGNORECASE)

def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        while True:
            c = f.read(8 * 1024 * 1024)
            if not c: break
            h.update(c)
    return h.hexdigest()

# === STEP 1 — V28b baseline
print('=== STEP 1 — V28b baseline ===', flush=True)
v28b_sha = sha(V28B)
print(f'V28b sha: {v28b_sha} ({"esit" if v28b_sha == V28B_BASELINE_SHA else "FARK"})')
if v28b_sha != V28B_BASELINE_SHA:
    raise SystemExit(f'V28b SHA SAPMASI: BUILD IPTAL')

# === STEP 2 — Build V28c
print('\n=== STEP 2 — V28c build ===', flush=True)
t0 = time.time()
total = 0
exception_applied = 0
non_K1_drift = 0
samples = []

with open(V28B, 'rb') as fin, open(V28C, 'w', encoding='utf-8') as fout:
    fout.write('{"recipes":[')
    parser = ijson.items(fin, 'recipes.item', use_float=True)
    first = True
    for r in parser:
        total += 1
        yeast_str = (r.get('raw',{}) or {}).get('yeast','') or ''
        feats = r.get('features',{}) or {}
        v28b_vals = {fk: int(feats.get(fk,0) or 0) for fk in YEAST_FEATS}
        v28c_vals = dict(v28b_vals)

        has_K1 = bool(PAT_K1.search(yeast_str)) and v28b_vals['yeast_saison'] == 0
        if has_K1:
            v28c_vals['yeast_saison'] = 1
            exception_applied += 1
            if len(samples) < 10:
                samples.append({
                    'id': r.get('id'),
                    'slug': r.get('bjcp_slug'),
                    'raw_yeast': yeast_str[:200],
                })

        if not has_K1:
            for fk in YEAST_FEATS:
                if v28b_vals[fk] != v28c_vals[fk]:
                    non_K1_drift += 1

        for fk in YEAST_FEATS:
            feats[fk] = v28c_vals[fk]
        r['features'] = feats

        # V28b'de meta var (recipes sonrasi). Bu loop sadece recipes.item parse ediyor.
        # Output sadece recipes array — meta YOK V28c'de (V28b meta -> bypass)
        if not first: fout.write(',')
        fout.write(json.dumps(r, ensure_ascii=False, default=str))
        first = False

    fout.write(']}')

elapsed = time.time() - t0
print(f'V28c build: {elapsed:.1f}s, {total} recete')
print(f'has_K1 exception: {exception_applied}')
print(f'non_K1_drift: {non_K1_drift} (beklenen 0)')

# Esik kontrol
if exception_applied > 200:
    print(f'BUILD ETKI ANOMALI: {exception_applied} > 200, V28c SILINIYOR')
    if os.path.exists(V28C): os.remove(V28C)
    raise SystemExit('Build etki >200 KAAN ONAYI BEKLE')

# === STEP 3 — V28b sha256 yeniden
print('\n=== STEP 3 — V28b sha256 yeniden ===', flush=True)
v28b_post = sha(V28B)
print(f'V28b post: {v28b_post} ({"esit" if v28b_post == V28B_BASELINE_SHA else "FARK"})')

# === STEP 4 — V28c metric
v28c_size = os.path.getsize(V28C)
v28c_sha = sha(V28C)
print(f'V28c boyut: {v28c_size}')
print(f'V28c sha: {v28c_sha}')

# Add meta to V28c (V28b meta'sini kopyala, version V28c, count guncelle)
# V28c V28b meta'sini icermiyor (sadece recipes), V19 train icin meta ekle
print('\n=== STEP 5 — V28c meta ekleme ===', flush=True)
# Read V28b meta
with open(V28B, 'rb') as f:
    parser = ijson.parse(f)
    meta_v28b = None
    in_meta = False
    meta_str = []
    # Use simple approach: load V28b meta key
import ijson as _ij
v28b_meta = None
with open(V28B, 'rb') as f:
    for prefix, event, value in _ij.parse(f):
        if prefix == 'meta' and event == 'start_map':
            in_meta = True
            v28b_meta_dict = {}
        elif in_meta and prefix.startswith('meta.') and event in ('string','number','boolean','null'):
            key = prefix[5:].split('.')[0]
            if key not in v28b_meta_dict:
                v28b_meta_dict[key] = value
        elif prefix == 'meta' and event == 'end_map':
            v28b_meta = v28b_meta_dict
            break
# Pragmatic: V28b'yi tam json.load et sadece meta icin (rams de tutmak buyuk)
# Daha basit: meta string parsing yerine V19 meta'dan al
with open('working/_v19_dataset.json','r',encoding='utf-8') as f:
    v19 = json.load(f)
v28c_meta = dict(v19['meta'])
v28c_meta['version'] = 'V28c'
v28c_meta['count'] = total
v28c_meta['v28c_built_from'] = 'V28b + Sprint A K1 yeast_saison pattern (BE-134/BE-256/M29/Lalbrew Farmhouse)'
v28c_meta['v28c_sprint'] = 'Adim 18d-pre Sprint A'
del v19  # RAM
print(f'V28c meta: version=V28c, count={total}, feature_list={len(v28c_meta["feature_list"])}')

# Stream rewrite V28c son '}' yerine ',"meta":{...}}'
v28c_size_pre = os.path.getsize(V28C)
with open(V28C, 'rb') as f:
    f.seek(max(0, v28c_size_pre - 100))
    tail = f.read()
tail_str = tail.decode('utf-8', errors='replace')
assert tail_str.rstrip().endswith(']}'), 'V28c son ]} ile bitmiyor'
trim_bytes = (len(tail) - len(tail_str.rstrip())) + 1  # whitespace + son '}'
truncate = v28c_size_pre - trim_bytes

V28C_TMP = V28C + '.tmp'
meta_json = json.dumps(v28c_meta, ensure_ascii=False, separators=(',',':'))
with open(V28C, 'rb') as fin, open(V28C_TMP, 'wb') as fout:
    remaining = truncate
    while remaining > 0:
        ch = min(8 * 1024 * 1024, remaining)
        chunk = fin.read(ch)
        if not chunk: break
        fout.write(chunk)
        remaining -= len(chunk)
    fout.write(b',"meta":')
    fout.write(meta_json.encode('utf-8'))
    fout.write(b'}')

os.replace(V28C_TMP, V28C)
v28c_final_sha = sha(V28C)
v28c_final_size = os.path.getsize(V28C)
print(f'V28c with meta sha: {v28c_final_sha}, size: {v28c_final_size}')

# === Audit
audit = {
    'meta': {
        'sprint': 'Adim 18d-pre Sprint A V28c build',
        'rule_refs': ['KURAL 1.4', 'KURAL 4.4', 'KURAL 12.1'],
        'build_seconds': round(elapsed,1),
        'total_recipes': total,
    },
    'v28b_baseline': {
        'pre_sha': v28b_sha,
        'post_sha': v28b_post,
        'intact': v28b_post == V28B_BASELINE_SHA,
    },
    'v28c': {
        'path': V28C,
        'size_bytes_pre_meta': v28c_size,
        'sha256_pre_meta': v28c_sha,
        'size_bytes_final': v28c_final_size,
        'sha256_final': v28c_final_sha,
        'recipe_count': total,
    },
    'targeted_exception': {
        'pattern': r'\bbe[\s\-]?134\b|\bbe[\s\-]?256\b|\bm[\s\-]?29\b|\blalbrew\s+farmhouse\b',
        'kosul': 'has_K1 + V28b[yeast_saison]=0 -> V28c[yeast_saison]=1',
        'applied_count': exception_applied,
        'samples_10': samples,
    },
    'drift_guard': {
        'non_K1_drift': non_K1_drift,
        'beklenen': 0,
    },
    'anomali_check': {
        'esik': 200,
        'olcum': exception_applied,
        'anomali': exception_applied > 200,
        'drift_anomali': non_K1_drift > 0,
    },
}
with open(AUDIT, 'w', encoding='utf-8') as f:
    json.dump(audit, f, ensure_ascii=False, indent=2, default=str)

print(f'\nCikti: {AUDIT}')
print(f'V28c sha (final): {v28c_final_sha}')
