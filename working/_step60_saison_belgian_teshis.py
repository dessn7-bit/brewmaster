"""
Adim 60 — Saison/Belgian Dubbel overlap teşhis
V28b'de belgian_dubbel slug recetelerinde yeast_saison=1 dagilimi.
"""
import ijson, json, re, hashlib, sys
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

V27 = 'working/_v27_aliased_dataset.json'
V28B = 'working/_v28b_aliased_dataset.json'
OUT = 'working/_step60_saison_belgian_overlap_teshis.json'

V27_BASELINE = '8c2d132d1913a57203040a98c9ef1ceebc2e18ce771b0f233718e1215c12442d'
V28B_NEW_BASELINE = '8359f033338e9aeb399850b72e202f9e70577a1639a87f81d3dde75bf820ae8a'

# Parser yeast_saison pattern (commit e12c62b _step53_b3_to_v15_format.py line 234)
PARSER_SAISON_PATTERN_RAW = (
    r'saison|sasion|farmhouse|wallonia(n)?|saisonstein|saisonette|seizon|hommage|bugfarm|'
    r'\b(3711|3724|3725|3726)\b|'
    r'wlp\s*0?(565|566|568|590|585|670)\b|'
    r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?(3724|3711|3725|3726)\b'
)
# Pattern detail (anlasilir liste)
SAISON_KEYWORDS = {
    'kelimeler': ['saison', 'sasion (typo)', 'farmhouse', 'wallonia(n)', 'saisonstein', 'saisonette', 'seizon', 'hommage', 'bugfarm'],
    'wyeast_numara': ['3711 French Saison', '3724 Belgian Saison', '3725 Biere de Garde', '3726 Farmhouse'],
    'wlp_numara': ['WLP565 Belgian Saison I', 'WLP566 Belgian Saison II', 'WLP568 Belgian Saison Ale Blend', 'WLP585 Belgian Saison III', 'WLP590 French Saison', 'WLP670 Farmhouse Blend'],
    'eksik_olabilir': ['Lalbrew Farmhouse', 'Mangrove Jacks M29', 'BE-134 Saison', 'BE-256 Pale Saison'],
}

def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        while True:
            c = f.read(8 * 1024 * 1024)
            if not c: break
            h.update(c)
    return h.hexdigest()

# === STEP 1 — sha256 baseline
print('=== STEP 1 — sha256 ===', flush=True)
v27_sha = sha(V27); v28b_sha = sha(V28B)
print(f'V27 sha: {v27_sha} ({"esit" if v27_sha == V27_BASELINE else "FARK"})')
print(f'V28b sha: {v28b_sha} ({"esit" if v28b_sha == V28B_NEW_BASELINE else "FARK"})')
if v27_sha != V27_BASELINE or v28b_sha != V28B_NEW_BASELINE:
    raise SystemExit('SHA SAPMASI: teshis iptal')

# === STEP 2 — V28b belgian_dubbel slug recete tarama
print('\n=== STEP 2 — V28b belgian_dubbel scan ===', flush=True)
v28b_records = []
with open(V28B, 'rb') as f:
    parser = ijson.items(f, 'recipes.item', use_float=True)
    for r in parser:
        if r.get('bjcp_slug') == 'belgian_dubbel':
            feats = r.get('features', {}) or {}
            v28b_records.append({
                'id': r.get('id'),
                'raw_yeast': (r.get('raw',{}) or {}).get('yeast','') or '',
                'yeast_saison': int(feats.get('yeast_saison',0) or 0),
                'yeast_belgian': int(feats.get('yeast_belgian',0) or 0),
                'yeast_abbey': int(feats.get('yeast_abbey',0) or 0),
                'yeast_brett': int(feats.get('yeast_brett',0) or 0),
            })

total_v28b = len(v28b_records)
saison_v28b = sum(1 for r in v28b_records if r['yeast_saison']==1)
belgian_v28b = sum(1 for r in v28b_records if r['yeast_belgian']==1)
abbey_v28b = sum(1 for r in v28b_records if r['yeast_abbey']==1)
both_v28b = sum(1 for r in v28b_records if r['yeast_saison']==1 and r['yeast_belgian']==1)
saison_only_v28b = sum(1 for r in v28b_records if r['yeast_saison']==1 and r['yeast_belgian']==0)

print(f'belgian_dubbel total V28b: {total_v28b}')
print(f'  yeast_saison=1: {saison_v28b} ({saison_v28b/total_v28b*100:.1f}%)')
print(f'  yeast_belgian=1: {belgian_v28b} ({belgian_v28b/total_v28b*100:.1f}%)')
print(f'  yeast_abbey=1: {abbey_v28b} ({abbey_v28b/total_v28b*100:.1f}%)')
print(f'  yeast_saison=1 AND yeast_belgian=1: {both_v28b}')
print(f'  yeast_saison=1 AND yeast_belgian=0: {saison_only_v28b}')

# === STEP 3 — V27 belgian_dubbel cross-check
print('\n=== STEP 3 — V27 belgian_dubbel scan ===', flush=True)
v27_records = []
v27_map = {}
with open(V27, 'rb') as f:
    parser = ijson.items(f, 'recipes.item', use_float=True)
    for r in parser:
        if r.get('bjcp_slug') == 'belgian_dubbel':
            feats = r.get('features', {}) or {}
            rec = {
                'id': r.get('id'),
                'yeast_saison': int(feats.get('yeast_saison',0) or 0),
                'yeast_belgian': int(feats.get('yeast_belgian',0) or 0),
            }
            v27_records.append(rec)
            v27_map[r.get('id')] = rec

total_v27 = len(v27_records)
saison_v27 = sum(1 for r in v27_records if r['yeast_saison']==1)
belgian_v27 = sum(1 for r in v27_records if r['yeast_belgian']==1)
print(f'belgian_dubbel total V27: {total_v27}')
print(f'  yeast_saison=1 V27: {saison_v27} ({saison_v27/total_v27*100:.1f}%)')
print(f'  yeast_belgian=1 V27: {belgian_v27} ({belgian_v27/total_v27*100:.1f}%)')

# === STEP 4 — V27 -> V28b fark
print('\n=== STEP 4 — V27 -> V28b fark (belgian_dubbel) ===', flush=True)
saison_changed = 0
belgian_changed = 0
for r in v28b_records:
    rid = r['id']
    if rid in v27_map:
        if v27_map[rid]['yeast_saison'] != r['yeast_saison']:
            saison_changed += 1
        if v27_map[rid]['yeast_belgian'] != r['yeast_belgian']:
            belgian_changed += 1
print(f'yeast_saison V27 != V28b (belgian_dubbel): {saison_changed}')
print(f'yeast_belgian V27 != V28b (belgian_dubbel): {belgian_changed}')

# === STEP 5 — 10 sample (yeast_saison=1 olanlar) raw.yeast
print('\n=== STEP 5 — Saison=1 sample (10) ===', flush=True)
saison_samples = [r for r in v28b_records if r['yeast_saison']==1][:10]
for s in saison_samples:
    print(f"  id={s['id']:25s} sai={s['yeast_saison']} bel={s['yeast_belgian']} abbey={s['yeast_abbey']} raw={s['raw_yeast'][:120]}")

out = {
    'meta': {
        'sprint': 'Adim 60 Saison/Belgian Dubbel overlap teshis',
        'rule_refs': ['KURAL 1.4', 'KURAL 4.4', 'KURAL 9.2'],
        'parser_yeast_saison_pattern': PARSER_SAISON_PATTERN_RAW,
        'saison_keywords_listesi': SAISON_KEYWORDS,
    },
    'sha256_check': {
        'v27': v27_sha,
        'v28b': v28b_sha,
        'v27_intact': v27_sha == V27_BASELINE,
        'v28b_intact': v28b_sha == V28B_NEW_BASELINE,
    },
    'v28b_belgian_dubbel': {
        'total': total_v28b,
        'yeast_saison_1_count': saison_v28b,
        'yeast_saison_1_pct': round(saison_v28b/total_v28b*100, 1) if total_v28b else 0,
        'yeast_belgian_1_count': belgian_v28b,
        'yeast_belgian_1_pct': round(belgian_v28b/total_v28b*100, 1) if total_v28b else 0,
        'yeast_abbey_1_count': abbey_v28b,
        'yeast_abbey_1_pct': round(abbey_v28b/total_v28b*100, 1) if total_v28b else 0,
        'saison_AND_belgian': both_v28b,
        'saison_only_belgian_0': saison_only_v28b,
    },
    'v27_belgian_dubbel': {
        'total': total_v27,
        'yeast_saison_1_count': saison_v27,
        'yeast_saison_1_pct': round(saison_v27/total_v27*100, 1) if total_v27 else 0,
        'yeast_belgian_1_count': belgian_v27,
        'yeast_belgian_1_pct': round(belgian_v27/total_v27*100, 1) if total_v27 else 0,
    },
    'v27_to_v28b_change_in_belgian_dubbel': {
        'yeast_saison_changed': saison_changed,
        'yeast_belgian_changed': belgian_changed,
        'note': 'C3 belle saison kaldirma: yeast_belgian 1->0. C3 yeast_saison\'a dokunmadi.',
    },
    'samples_yeast_saison_1_belgian_dubbel': [
        {
            'id': s['id'],
            'raw_yeast': s['raw_yeast'][:250],
            'yeast_saison': s['yeast_saison'],
            'yeast_belgian': s['yeast_belgian'],
            'yeast_abbey': s['yeast_abbey'],
            'yeast_brett': s['yeast_brett'],
        }
        for s in saison_samples
    ],
}

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=2)

print(f'\nCikti: {OUT}')
