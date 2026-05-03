"""
Adim 60b — Saison cluster yeast_saison=0 6526 detayli analiz
Slug bazli + yeast flag dagilim + 30 sample + 5 kategori (K1..K5).
Read only V28b.
"""
import ijson, json, re, hashlib, sys, random
from collections import Counter

random.seed(42)
sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

V28B = 'working/_v28b_aliased_dataset.json'
V28B_SHA = '8359f033338e9aeb399850b72e202f9e70577a1639a87f81d3dde75bf820ae8a'
OUT = 'working/_step60b_saison_no_saison_detay.json'

SAISON_SLUGS = {'french_belgian_saison', 'specialty_saison', 'french_biere_de_garde'}

YEAST_FEATS = ['yeast_abbey','yeast_altbier','yeast_american','yeast_american_lager',
    'yeast_belgian','yeast_brett','yeast_cal_common','yeast_czech_lager','yeast_english',
    'yeast_german_lager','yeast_kolsch','yeast_kveik','yeast_lacto','yeast_saison',
    'yeast_sour_blend','yeast_wheat_german','yeast_wit','yeast_witbier']

# K1 — Saison parser eksik keyword'ler
PAT_K1_SAISON_EKSIK = re.compile(
    r'\blalbrew\s+farmhouse\b|'
    r'\bmangrove\s*jack[\'s]*\s+m\s*29\b|\bm\s*29\b|'
    r'\bbe[\s\-]?134\b|\bbe[\s\-]?256\b|'
    r'\bt[\s\-]?58\s+saison\b|'
    r'\b3711\b|\b3724\b|\b3725\b|\b3726\b|'  # parser bare numeric var ama sample'da kontrol et
    r'\bsuperyeast\s+saison\b|\bgigayeast\s+sps\b|\byeast\s+bay\s+saison\b|\bomega\s+saison\b',
    re.IGNORECASE
)

# K2/K3 — Belle Saison detector
PAT_BELLE_SAISON = re.compile(r'\bbelle\s+saison\b', re.IGNORECASE)

# K3 — Gerçek Belgian abbey/dubbel/tripel mayasi (Belle Saison HARIC)
PAT_BELGIAN_GERCEK = re.compile(
    r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?(1762|1214|1388|3787|3522|3864)\b|'
    r'\b(1762|1214|1388|3787|3522|3864)\b|'
    r'wlp\s*0?(500|510|515|530|540|545|550|575|590)\b|'
    r'\babbey\b|\btrappist\b|abbaye|'
    r'westmalle|chimay|achel|orval|rochefort|'
    r'belgian\s+(?:dubbel|tripel|abbey|trappist|strong\s+(?:dark|golden)|quadrupel)',
    re.IGNORECASE
)

def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        while True:
            c = f.read(8 * 1024 * 1024)
            if not c: break
            h.update(c)
    return h.hexdigest()

# === STEP 1 — sha256
print('=== STEP 1 — sha256 ===', flush=True)
v28b_sha = sha(V28B)
print(f'V28b sha: {v28b_sha} ({"esit" if v28b_sha == V28B_SHA else "FARK"})')
if v28b_sha != V28B_SHA:
    raise SystemExit('SHA SAPMASI: iptal')

# === STEP 2 — V28b stream + saison cluster + yeast_saison=0 toplama
print('\n=== STEP 2 — V28b stream + 6526 recete topla ===', flush=True)
records = []
with open(V28B, 'rb') as f:
    parser = ijson.items(f, 'recipes.item', use_float=True)
    for r in parser:
        slug = r.get('bjcp_slug') or ''
        if slug not in SAISON_SLUGS: continue
        feats = r.get('features', {}) or {}
        if int(feats.get('yeast_saison', 0) or 0) != 0: continue
        flags = {fk: int(feats.get(fk, 0) or 0) for fk in YEAST_FEATS}
        raw_y = (r.get('raw',{}) or {}).get('yeast','') or ''
        records.append({
            'id': r.get('id'),
            'slug': slug,
            'raw_yeast': raw_y,
            'flags': flags,
        })

total = len(records)
print(f'Total saison cluster + yeast_saison=0: {total}')

# === STEP 3 — Slug bazli ayirma
print('\n=== STEP 3 — Slug ayrimi ===', flush=True)
slug_count = Counter(r['slug'] for r in records)
for sl, cnt in slug_count.most_common():
    print(f'  {sl:35s} {cnt:6d} ({cnt/total*100:.1f}%)')

# === STEP 4 — Yeast flag dağılım
print('\n=== STEP 4 — Yeast flag dağılım (6526 recete) ===', flush=True)
yeast_dist = {fk: 0 for fk in YEAST_FEATS}
no_yeast_count = 0
for r in records:
    any_set = False
    for fk in YEAST_FEATS:
        if r['flags'][fk]:
            yeast_dist[fk] += 1
            any_set = True
    if not any_set:
        no_yeast_count += 1

for fk in sorted(yeast_dist, key=lambda k: -yeast_dist[k]):
    print(f'  {fk:25s} {yeast_dist[fk]:5d} ({yeast_dist[fk]/total*100:.1f}%)')
print(f'  no_yeast (hicbir flag set edilmemis): {no_yeast_count} ({no_yeast_count/total*100:.1f}%)')

# === STEP 5 — Kategori ayrimi (K1..K5) — sirali
print('\n=== STEP 5 — 5 kategori ayrimi ===', flush=True)
def classify(rec):
    raw = rec['raw_yeast']
    flags = rec['flags']
    any_yeast = any(flags[fk] for fk in YEAST_FEATS)
    raw_short = (not raw) or len(raw.strip()) < 8

    # K5 — no_yeast (hicbir flag set + raw bos veya cok kisa)
    if not any_yeast and raw_short:
        return 'K5_no_yeast_eksik_veri'

    # K1 — saison parser eksik keyword
    if PAT_K1_SAISON_EKSIK.search(raw):
        return 'K1_pattern_eksik'

    has_belle = bool(PAT_BELLE_SAISON.search(raw))
    has_belgian_gercek = bool(PAT_BELGIAN_GERCEK.search(raw))

    # K2 — multi-strain: Belle Saison + Belgian gercek + yeast_belgian=1
    if has_belle and (has_belgian_gercek or flags['yeast_belgian'] == 1 or flags['yeast_abbey'] == 1):
        return 'K2_multi_strain_belle_belgian'

    # K3 — Belgian abbey reslug (yeast_belgian=1 + Belgian gercek marker, Belle Saison HARIC)
    if not has_belle and (has_belgian_gercek or flags['yeast_belgian'] == 1 or flags['yeast_abbey'] == 1):
        return 'K3_reslug_belgian_abbey'

    # K4 — Brown ale reslug (yeast_english=1 veya yeast_american=1)
    if flags['yeast_english'] == 1 or flags['yeast_american'] == 1:
        return 'K4_reslug_brown_ale'

    # Kalan
    return 'K_OTHER_siniflandirilamayan'

categories = Counter()
samples_per_cat = {k: [] for k in ['K1_pattern_eksik','K2_multi_strain_belle_belgian','K3_reslug_belgian_abbey','K4_reslug_brown_ale','K5_no_yeast_eksik_veri','K_OTHER_siniflandirilamayan']}
for r in records:
    cat = classify(r)
    categories[cat] += 1
    if len(samples_per_cat[cat]) < 5:
        samples_per_cat[cat].append({
            'id': r['id'],
            'slug': r['slug'],
            'raw_yeast': r['raw_yeast'][:200],
            'flags_set': [fk for fk in YEAST_FEATS if r['flags'][fk]],
        })

print(f'\nKategori dagilimi:')
for cat, cnt in categories.most_common():
    print(f'  {cat:35s} {cnt:5d} ({cnt/total*100:.1f}%)')

# === STEP 6 — 30 sample (her slug 10)
print('\n=== STEP 6 — 30 sample (10/slug) ===', flush=True)
samples_per_slug = {sl: [] for sl in SAISON_SLUGS}
random.shuffle(records)
for r in records:
    if len(samples_per_slug[r['slug']]) < 10:
        samples_per_slug[r['slug']].append({
            'id': r['id'],
            'slug': r['slug'],
            'raw_yeast': r['raw_yeast'][:250],
            'flags_set': [fk for fk in YEAST_FEATS if r['flags'][fk]],
            'kategori': classify(r),
        })
    if all(len(samples_per_slug[s]) >= 10 for s in SAISON_SLUGS):
        break

out = {
    'meta': {
        'sprint': 'Adim 60b saison cluster no-saison-yeast detayli analiz',
        'rule_refs': ['KURAL 1.4', 'KURAL 4.4', 'KURAL 6.3'],
        'cluster_mapping': 'V19 SLUG_TO_CLUSTER',
        'random_seed': 42,
    },
    'sha256_check': {'v28b': v28b_sha},
    'total_no_saison_yeast': total,
    'slug_breakdown': dict(slug_count),
    'yeast_flag_distribution': {fk: {'count': c, 'pct': round(c/total*100, 1)} for fk, c in yeast_dist.items()},
    'no_yeast_count': no_yeast_count,
    'no_yeast_pct': round(no_yeast_count/total*100, 1),
    'kategori_ayrim': {
        'siralama': 'K5 (no_yeast) -> K1 (pattern eksik) -> K2 (multi-strain Belle+Belgian) -> K3 (reslug Belgian abbey) -> K4 (reslug brown ale) -> K_OTHER',
        'dagilim': dict(categories),
        'samples_per_kategori_5er': samples_per_cat,
    },
    'samples_per_slug_10er': samples_per_slug,
}

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=2)

print(f'\nCikti: {OUT}')
