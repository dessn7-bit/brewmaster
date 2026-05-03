"""
Adim 18d-pre Sprint C — V28d build (V28c -> V28d, K3 4390 reslug)

V28c dataset input. K3 saison cluster + yeast_saison=0 + yeast_belgian/abbey=1 + Belle Saison yok.
- bjcp_slug update: belgian_dubbel / belgian_tripel / belgian_quadrupel / belgian_strong_dark_ale
- 18 yeast feature DOKUNULMAZ
- has_K3=False recetede bjcp_slug degismez
- Build etki esik 5000
"""
import ijson, json, re, time, hashlib, os, sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

V28C = 'working/_v28c_aliased_dataset.json'
V28D = 'working/_v28d_aliased_dataset.json'
AUDIT = 'working/_step18d_pre_v28d_audit.json'
V28C_BASELINE_SHA = '2659bbbea28834182a6930d95eff25c1c252264f94ce8254c4f680ef67fb30b4'

# Sprint B sonrasi V19 mapping: saison cluster = {french_belgian_saison, specialty_saison}
SAISON_SLUGS = {'french_belgian_saison', 'specialty_saison'}

# Belle Saison + saison eksik keyword (K3'ten haric tutulanlar)
PAT_SAISON_GENUINE = re.compile(
    r'\bbelle\s+saison\b|farmhouse|wallonia(n)?|saisonette|saisonstein|seizon|hommage|bugfarm|'
    r'\b(3711|3724|3725|3726)\b|wlp\s*0?(565|566|568|590|585|670)\b|'
    r'\bbe[\s\-]?134\b|\bbe[\s\-]?256\b|\bm[\s\-]?29\b|\blalbrew\s+farmhouse\b',
    re.IGNORECASE
)

# Slug atama anahtar pattern'leri (oncelikli sira)
PAT_TRIPEL = re.compile(r'\btripel\b|\btriple\b|wlp\s*0?530\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?3864\b|\b3864\b', re.IGNORECASE)
PAT_QUADRUPEL = re.compile(r'\bquadrupel\b|\bquad\b|\bwesvleteren\b|\brochefort\s*10\b', re.IGNORECASE)
PAT_STRONG_DARK = re.compile(r'\bstrong\s+dark\b|\bdark\s+strong\b|\brochefort\b|\bchimay\s+blue\b|\bgrand\s+cru\b', re.IGNORECASE)
PAT_STRONG_GOLDEN = re.compile(r'\bstrong\s+golden\b|\bgolden\s+strong\b|\bduvel\b|\bdelirium\b', re.IGNORECASE)
PAT_DUBBEL = re.compile(r'\bdubbel\b|\bdouble\b|\bchimay\s+red\b|\bwestmalle\s+dubbel\b|\babbey\s+ale\b', re.IGNORECASE)

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

def assign_new_slug(raw_yeast, raw_recipe_name=''):
    """Belgian abbey reslug: oncelik tripel > quadrupel > strong_dark > strong_golden > dubbel (default)"""
    text = (raw_yeast + ' ' + raw_recipe_name).lower()
    if PAT_TRIPEL.search(text):
        return 'belgian_tripel'
    if PAT_QUADRUPEL.search(text):
        return 'belgian_quadrupel'
    if PAT_STRONG_DARK.search(text):
        return 'belgian_strong_dark_ale'
    if PAT_STRONG_GOLDEN.search(text):
        return 'belgian_strong_golden'
    if PAT_DUBBEL.search(text):
        return 'belgian_dubbel'
    return 'belgian_strong_dark_ale'  # default fallback

# === STEP 1 — V28c baseline
print('=== STEP 1 — V28c baseline ===', flush=True)
v28c_sha = sha(V28C)
print(f'V28c sha: {v28c_sha} ({"esit" if v28c_sha == V28C_BASELINE_SHA else "FARK"})')
if v28c_sha != V28C_BASELINE_SHA:
    raise SystemExit('V28c SHA SAPMASI: BUILD IPTAL')

# === STEP 2 — Build V28d
print('\n=== STEP 2 — V28d build (K3 reslug) ===', flush=True)
t0 = time.time()
total = 0
exception_applied = 0
non_K3_drift_slug = 0
slug_change_dist = {}
samples = []

with open(V28C, 'rb') as fin, open(V28D, 'w', encoding='utf-8') as fout:
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
        v_belgian = int(feats.get('yeast_belgian',0) or 0)
        v_abbey = int(feats.get('yeast_abbey',0) or 0)

        # K3 koşulu: saison cluster (Sprint B mapping) + yeast_saison=0 + (belgian veya abbey=1) + saison genuine yok
        is_saison_cluster = slug_orig in SAISON_SLUGS
        has_saison_genuine = bool(PAT_SAISON_GENUINE.search(yeast_str))
        is_K3 = (is_saison_cluster and
                 v_saison == 0 and
                 (v_belgian == 1 or v_abbey == 1) and
                 not has_saison_genuine)

        if is_K3:
            new_slug = assign_new_slug(yeast_str, recipe_name)
            r['bjcp_slug'] = new_slug
            r['_orig_slug_v28c'] = slug_orig
            exception_applied += 1
            slug_change_dist[new_slug] = slug_change_dist.get(new_slug, 0) + 1
            if len(samples) < 15:
                samples.append({
                    'id': r.get('id'),
                    'orig_slug': slug_orig,
                    'new_slug': new_slug,
                    'raw_yeast': yeast_str[:200],
                    'yeast_belgian': v_belgian,
                    'yeast_abbey': v_abbey,
                })
        else:
            # Drift guard: bjcp_slug DEGISTI mi (K3 disi)
            if r.get('bjcp_slug') != slug_orig:
                non_K3_drift_slug += 1

        if not first: fout.write(',')
        fout.write(json.dumps(r, ensure_ascii=False, default=str))
        first = False

    fout.write(']}')

elapsed = time.time() - t0
print(f'V28d build: {elapsed:.1f}s, {total} recete')
print(f'K3 reslug exception: {exception_applied}')
print(f'non_K3_drift_slug: {non_K3_drift_slug} (beklenen 0)')
print(f'\nSlug change dist:')
for sl, cnt in sorted(slug_change_dist.items(), key=lambda x: -x[1]):
    print(f'  {sl:35s} {cnt}')

# Esik kontrol
if exception_applied > 5000:
    print(f'BUILD ETKI ANOMALI: {exception_applied} > 5000')
    if os.path.exists(V28D): os.remove(V28D)
    raise SystemExit('Build etki >5000 KAAN ONAYI BEKLE')

# === STEP 3 — V28c sha256 yeniden
v28c_post = sha(V28C)
v28c_intact = v28c_post == V28C_BASELINE_SHA
print(f'\nV28c post: {v28c_post} ({"esit" if v28c_intact else "FARK"})')

# === STEP 4 — V28d metric + meta
v28d_size_pre = os.path.getsize(V28D)
print(f'V28d boyut (pre-meta): {v28d_size_pre}')

# Meta ekleme (V19 meta'dan kopya)
with open('working/_v19_dataset.json','r',encoding='utf-8') as f:
    v19 = json.load(f)
v28d_meta = dict(v19['meta'])
v28d_meta['version'] = 'V28d'
v28d_meta['count'] = total
v28d_meta['v28d_built_from'] = 'V28c + Sprint C K3 reslug (4390 saison cluster -> belgian_*_ale)'
v28d_meta['v28d_sprint'] = 'Adim 18d-pre Sprint C'
del v19

# Stream rewrite ekleme
with open(V28D, 'rb') as f:
    f.seek(max(0, v28d_size_pre - 100))
    tail = f.read()
tail_str = tail.decode('utf-8', errors='replace')
trim_bytes = (len(tail) - len(tail_str.rstrip())) + 1
truncate = v28d_size_pre - trim_bytes

V28D_TMP = V28D + '.tmp'
meta_json = json.dumps(v28d_meta, ensure_ascii=False, separators=(',',':'))
with open(V28D, 'rb') as fin, open(V28D_TMP, 'wb') as fout:
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
os.replace(V28D_TMP, V28D)
v28d_final_sha = sha(V28D)
v28d_final_size = os.path.getsize(V28D)
print(f'V28d final sha: {v28d_final_sha}, size: {v28d_final_size}')

audit = {
    'meta': {
        'sprint': 'Adim 18d-pre Sprint C V28d build (K3 reslug)',
        'rule_refs': ['KURAL 1.4', 'KURAL 4.4', 'KURAL 12.1'],
        'build_seconds': round(elapsed,1),
    },
    'v28c_baseline': {
        'pre_sha': v28c_sha,
        'post_sha': v28c_post,
        'intact': v28c_intact,
    },
    'v28d': {
        'path': V28D,
        'sha256_final': v28d_final_sha,
        'size_bytes_final': v28d_final_size,
        'recipe_count': total,
    },
    'targeted_exception': {
        'kosul': 'saison cluster + yeast_saison=0 + (yeast_belgian=1 OR yeast_abbey=1) + Belle Saison/farmhouse vs YOK',
        'applied_count': exception_applied,
        'slug_change_dist': slug_change_dist,
        'samples_15': samples,
    },
    'drift_guard': {
        'non_K3_drift_slug': non_K3_drift_slug,
        'beklenen': 0,
    },
    'anomali_check': {
        'esik': 5000,
        'olcum': exception_applied,
        'anomali': exception_applied > 5000,
    },
}
with open(AUDIT, 'w', encoding='utf-8') as f:
    json.dump(audit, f, ensure_ascii=False, indent=2, default=str)

print(f'\nCikti: {AUDIT}')
