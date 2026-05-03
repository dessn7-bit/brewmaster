"""
Adim 18d-pre Sprint D — V28e build (V28d -> V28e, K4 brown ale reslug)

V28d dataset input. K4 saison cluster + yeast_saison=0 + (english=1 OR american=1) + K3 degil.
- bjcp_slug update: brown_ale (default fallback) veya french_biere_de_garde (eger raw'da bdg)
- 18 yeast feature DOKUNULMAZ
- bjcp_slug drift guard
- Build etki esik 200
"""
import ijson, json, re, time, hashlib, os, sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

V28D = 'working/_v28d_aliased_dataset.json'
V28E = 'working/_v28e_aliased_dataset.json'
AUDIT = 'working/_step18d_pre_v28e_audit.json'
V28D_BASELINE_SHA = 'efa0115a91fc3b571e529c58f3e5c48c325ab3647ef7a881da7cb637710c199f'

# V28d sonrasi saison cluster (Sprint B mapping)
SAISON_SLUGS = {'french_belgian_saison', 'specialty_saison'}

# K4 — yeast_english veya yeast_american flag
PAT_BIERE_DE_GARDE = re.compile(r'\bbiere\s+de\s+garde\b|\bbi[eè]re\s+de\s+garde\b', re.IGNORECASE)
PAT_BROWN_ALE = re.compile(r'\bbrown\s+ale\b|\bamerican\s+brown\b', re.IGNORECASE)

YEAST_FEATS = ['yeast_abbey','yeast_altbier','yeast_american','yeast_american_lager',
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

def assign_K4_slug(raw_yeast, recipe_name=''):
    text = (raw_yeast + ' ' + recipe_name).lower()
    if PAT_BIERE_DE_GARDE.search(text):
        return 'french_biere_de_garde'  # V6 mapping brown_ale cluster
    if PAT_BROWN_ALE.search(text):
        return 'american_brown_ale'
    return 'american_brown_ale'  # default fallback

# === STEP 1 — V28d baseline
print('=== STEP 1 — V28d baseline ===', flush=True)
v28d_sha = sha(V28D)
print(f'V28d sha: {v28d_sha} ({"esit" if v28d_sha == V28D_BASELINE_SHA else "FARK"})')
if v28d_sha != V28D_BASELINE_SHA:
    raise SystemExit('V28d SHA SAPMASI: BUILD IPTAL')

# === STEP 2 — Build V28e
print('\n=== STEP 2 — V28e build (K4 reslug) ===', flush=True)
t0 = time.time()
total = 0
exception_applied = 0
non_K4_drift_slug = 0
slug_change_dist = {}
samples = []

with open(V28D, 'rb') as fin, open(V28E, 'w', encoding='utf-8') as fout:
    fout.write('{"recipes":[')
    parser = ijson.items(fin, 'recipes.item', use_float=True)
    first = True
    for r in parser:
        total += 1
        slug_orig = r.get('bjcp_slug') or ''
        feats = r.get('features',{}) or {}
        yeast_str = (r.get('raw',{}) or {}).get('yeast','') or ''
        recipe_name = (r.get('name') or '').lower()
        v_saison = int(feats.get('yeast_saison',0) or 0)
        v_english = int(feats.get('yeast_english',0) or 0)
        v_american = int(feats.get('yeast_american',0) or 0)
        v_belgian = int(feats.get('yeast_belgian',0) or 0)
        v_abbey = int(feats.get('yeast_abbey',0) or 0)

        is_saison_cluster = slug_orig in SAISON_SLUGS
        has_belgian = (v_belgian == 1 or v_abbey == 1)
        has_english_or_american = (v_english == 1 or v_american == 1)

        # K4: saison cluster + yeast_saison=0 + ale yeast (english/american) + K3 degil (yani Belgian/abbey yok)
        is_K4 = (is_saison_cluster and
                 v_saison == 0 and
                 has_english_or_american and
                 not has_belgian)

        if is_K4:
            new_slug = assign_K4_slug(yeast_str, recipe_name)
            r['bjcp_slug'] = new_slug
            r['_orig_slug_v28d'] = slug_orig
            exception_applied += 1
            slug_change_dist[new_slug] = slug_change_dist.get(new_slug, 0) + 1
            if len(samples) < 15:
                samples.append({
                    'id': r.get('id'),
                    'orig_slug': slug_orig,
                    'new_slug': new_slug,
                    'raw_yeast': yeast_str[:200],
                    'yeast_english': v_english,
                    'yeast_american': v_american,
                })
        else:
            if r.get('bjcp_slug') != slug_orig:
                non_K4_drift_slug += 1

        if not first: fout.write(',')
        fout.write(json.dumps(r, ensure_ascii=False, default=str))
        first = False

    fout.write(']}')

elapsed = time.time() - t0
print(f'V28e build: {elapsed:.1f}s, {total} recete')
print(f'K4 reslug exception: {exception_applied}')
print(f'non_K4_drift_slug: {non_K4_drift_slug} (beklenen 0)')
print(f'\nSlug change dist:')
for sl, cnt in sorted(slug_change_dist.items(), key=lambda x: -x[1]):
    print(f'  {sl:30s} {cnt}')

if exception_applied > 200:
    print(f'BUILD ETKI ANOMALI: {exception_applied} > 200')
    if os.path.exists(V28E): os.remove(V28E)
    raise SystemExit('Build etki >200 KAAN ONAYI BEKLE')

# === STEP 3 — V28d sha256 yeniden
v28d_post = sha(V28D)
print(f'\nV28d post: {v28d_post} ({"esit" if v28d_post == V28D_BASELINE_SHA else "FARK"})')

# === STEP 4 — V28e + meta
v28e_size_pre = os.path.getsize(V28E)
print(f'V28e boyut (pre-meta): {v28e_size_pre}')

with open('working/_v19_dataset.json','r',encoding='utf-8') as f:
    v19 = json.load(f)
v28e_meta = dict(v19['meta'])
v28e_meta['version'] = 'V28e'
v28e_meta['count'] = total
v28e_meta['v28e_built_from'] = 'V28d + Sprint D K4 reslug (saison cluster + ale yeast -> brown_ale/biere_de_garde)'
v28e_meta['v28e_sprint'] = 'Adim 18d-pre Sprint D'
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
print(f'V28e final sha: {v28e_final_sha}, size: {v28e_final_size}')

audit = {
    'meta': {
        'sprint': 'Adim 18d-pre Sprint D V28e build (K4 reslug)',
        'rule_refs': ['KURAL 1.4', 'KURAL 4.4'],
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
    'targeted_exception': {
        'kosul': 'saison cluster + yeast_saison=0 + (yeast_english=1 OR yeast_american=1) + Belgian/abbey YOK (K3 disi)',
        'applied_count': exception_applied,
        'slug_change_dist': slug_change_dist,
        'samples_15': samples,
    },
    'drift_guard': {
        'non_K4_drift_slug': non_K4_drift_slug,
        'beklenen': 0,
    },
    'anomali_check': {
        'esik': 200,
        'olcum': exception_applied,
        'anomali': exception_applied > 200,
    },
}
with open(AUDIT, 'w', encoding='utf-8') as f:
    json.dump(audit, f, ensure_ascii=False, indent=2, default=str)

print(f'\nCikti: {AUDIT}')
