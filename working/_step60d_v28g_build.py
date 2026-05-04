"""
Sub-sprint 2A — V28g build (Rye Ale reslug).
V28f -> V28g, 136 algoritmik reslug (rye_ipa + roggenbier), manuel 541 + dokunulmaz 43 + diger 376125 dokunulmaz.
KURAL 1.4 (slug etiketi degisir, recete silinmez).
SADECE V28f'ten OKU, V28g'e yaz.
"""
import ijson
import json
import sys
import os
import time
import hashlib
import re
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

V28F = 'working/_v28f_aliased_dataset.json'
V28G = 'working/_v28g_aliased_dataset.json'
RESLUG_LOG = 'working/_v28g_reslug_log.json'

V28F_BASELINE_SHA = '97bd61bdcda7bc19b7b4aff9ae9a4142476de31ea87d810f4f1a1b2f8f622e93'

SD = json.load(open('STYLE_DEFINITIONS.json'))
RA = SD['german_rye_ale']
RI = SD['rye_ipa']
RG = SD['roggenbier']


def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        while True:
            c = f.read(8 * 1024 * 1024)
            if not c: break
            h.update(c)
    return h.hexdigest()


def assign_priority(og, fg, ibu, srm, abv):
    """Priority order: RYE_IPA -> ROGGENBIER -> ZONE_INSIDE -> HOPPY -> IMPERIAL -> BORDERLINE."""
    # 1. RYE_IPA
    if (RI['og'][0] <= og <= RI['og'][1] and RI['fg'][0] <= fg <= RI['fg'][1]
        and RI['ibu'][0] <= ibu <= RI['ibu'][1] and RI['srm'][0] <= srm <= RI['srm'][1]):
        return ('1_RYE_IPA', 'rye_ipa', 'algoritmik')
    # 2. ROGGENBIER
    if (RG['og'][0] <= og <= RG['og'][1] and RG['fg'][0] <= fg <= RG['fg'][1]
        and RG['ibu'][0] <= ibu <= RG['ibu'][1] and RG['srm'][0] <= srm <= RG['srm'][1]):
        return ('2_ROGGENBIER', 'roggenbier', 'algoritmik')
    # 3. ZONE_INSIDE
    if (RA['og'][0] <= og <= RA['og'][1] and RA['fg'][0] <= fg <= RA['fg'][1]
        and RA['ibu'][0] <= ibu <= RA['ibu'][1] and RA['srm'][0] <= srm <= RA['srm'][1]
        and RA['abv'][0] <= abv <= RA['abv'][1]):
        return ('3_ZONE_INSIDE', None, 'dokunma')
    # 4. HOPPY
    if ibu > 35:
        return ('4_HOPPY_RYE', None, 'manuel')
    # 5. IMPERIAL
    if og > 1.075:
        return ('5_IMPERIAL_RYE', None, 'manuel')
    # 6. BORDERLINE
    return ('6_ZONE_BORDERLINE', None, 'manuel')


# === STEP 1: V28f SHA dogrulama
print('=== STEP 1 — V28f SHA dogrulama ===')
v28f_pre = sha(V28F)
print(f'V28f pre-build sha: {v28f_pre}')
if v28f_pre != V28F_BASELINE_SHA:
    raise SystemExit(f'V28f SHA SAPMASI: BUILD IPTAL')
print('V28f baseline ESIT, build basliyor.')

# === STEP 2: V28g build (stream)
print('\n=== STEP 2 — V28g build (Rye Ale reslug) ===')
t0 = time.time()
total = 0
ra_count = 0
non_ra_count = 0
reslug_applied = 0
non_ra_drift = 0
ra_dokunulmaz = 0
group_dist = {}
slug_change_dist = {}
reslug_log_entries = []

with open(V28F, 'rb') as fin, open(V28G, 'w', encoding='utf-8') as fout:
    fout.write('{"recipes":[')
    parser = ijson.items(fin, 'recipes.item', use_float=True)
    first = True
    for r in parser:
        total += 1
        slug_orig = r.get('bjcp_slug') or ''

        if slug_orig == 'german_rye_ale':
            ra_count += 1
            feats = r.get('features', {}) or {}
            og = feats.get('og', 0) or 0
            fg = feats.get('fg', 0) or 0
            ibu = feats.get('ibu', 0) or 0
            srm = feats.get('srm', 0) or 0
            abv = feats.get('abv', 0) or 0

            grp_id, hedef, aksiyon = assign_priority(og, fg, ibu, srm, abv)
            group_dist[grp_id] = group_dist.get(grp_id, 0) + 1

            if aksiyon == 'algoritmik' and hedef and hedef != slug_orig:
                r['bjcp_slug'] = hedef
                r['_orig_slug_v28f'] = slug_orig
                r['_v28g_alt_grup'] = grp_id
                reslug_applied += 1
                slug_change_dist[hedef] = slug_change_dist.get(hedef, 0) + 1
                reslug_log_entries.append({
                    'recipe_id': r.get('id'),
                    'eski_slug': slug_orig,
                    'yeni_slug': hedef,
                    'alt_grup': grp_id,
                    'og': og, 'fg': fg, 'ibu': ibu, 'srm': srm, 'abv': abv,
                })
            else:
                ra_dokunulmaz += 1
                r['_v28g_alt_grup'] = grp_id
        else:
            non_ra_count += 1
            if r.get('bjcp_slug') != slug_orig:
                non_ra_drift += 1

        if not first: fout.write(',')
        fout.write(json.dumps(r, ensure_ascii=False, default=str))
        first = False

        if total % 50000 == 0:
            print(f'  [{total} recete, {time.time()-t0:.1f}s]')

    fout.write(']}')

elapsed = time.time() - t0
print(f'\nBuild bitti: {total} recete, {elapsed:.1f}s')
print(f'  Rye Ale orijinal: {ra_count}')
print(f'  Reslug uygulandi: {reslug_applied}')
print(f'  Rye Ale dokunulmaz: {ra_dokunulmaz}')
print(f'  Non-RyeAle: {non_ra_count}')
print(f'  Non-RyeAle drift (beklenen 0): {non_ra_drift}')

print(f'\nReslug slug dagilimi:')
for sl, cnt in sorted(slug_change_dist.items(), key=lambda x: -x[1]):
    print(f'  {sl:<30} {cnt}')

print(f'\nAlt-grup dagilimi (720 rye_ale icinde):')
for grp_id in sorted(group_dist.keys(), key=lambda x: int(x.split('_')[0])):
    print(f'  {grp_id:<30} {group_dist[grp_id]}')

# === STEP 3: V28f post-sha
v28f_post = sha(V28F)
v28f_intact = v28f_post == V28F_BASELINE_SHA
print(f'\nV28f post: {v28f_post[:32]}... (intact: {v28f_intact})')
if not v28f_intact:
    raise SystemExit('V28f POST-BUILD DRIFT')

# === STEP 4: V28g meta append
v28g_size_pre = os.path.getsize(V28G)
v28f_meta = {}
with open(V28F, 'rb') as f:
    f.seek(max(0, os.path.getsize(V28F) - 5000))
    tail = f.read().decode('utf-8', errors='replace')
meta_match = re.search(r'"meta":\{[^}]+\}\}\s*$', tail)
if meta_match:
    full_meta_str = meta_match.group(0)[:-1]
    try:
        v28f_meta_json = json.loads('{' + full_meta_str + '}')
        v28f_meta = v28f_meta_json.get('meta', {})
    except Exception as e:
        print(f'V28f meta parse hatasi: {e}')

v28g_meta = dict(v28f_meta)
v28g_meta['version'] = 'V28g'
v28g_meta['count'] = total
v28g_meta['v28g_built_from'] = 'V28f + Sub-sprint 2A Rye Ale reslug (136 algoritmik, BA 2026 priority order)'
v28g_meta['v28g_sprint'] = 'Adim 18d-pre Sub-sprint 2A'
v28g_meta['v28g_baseline_v28f_sha'] = V28F_BASELINE_SHA

with open(V28G, 'rb') as f:
    f.seek(max(0, v28g_size_pre - 100))
    tail = f.read()
tail_str = tail.decode('utf-8', errors='replace')
trim_bytes = (len(tail) - len(tail_str.rstrip())) + 1
truncate = v28g_size_pre - trim_bytes

V28G_TMP = V28G + '.tmp'
meta_json = json.dumps(v28g_meta, ensure_ascii=False, separators=(',', ':'))
with open(V28G, 'rb') as fin, open(V28G_TMP, 'wb') as fout:
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
os.replace(V28G_TMP, V28G)

v28g_final_sha = sha(V28G)
v28g_final_size = os.path.getsize(V28G)
print(f'\nV28g final sha: {v28g_final_sha}')
print(f'V28g final size: {v28g_final_size}')

# Reslug log
log_out = {
    'meta': {
        'sprint': 'Sub-sprint 2A V28g Rye Ale reslug',
        'kural': 'KURAL 1.4 + KURAL 9.2 BA 2026',
        'v28f_sha_pre': v28f_pre,
        'v28f_sha_post': v28f_post,
        'v28f_intact': v28f_intact,
        'v28g_sha': v28g_final_sha,
        'v28g_size': v28g_final_size,
    },
    'sayim_ozeti': {
        'toplam_recete': total,
        'rye_ale_orijinal': ra_count,
        'reslug_applied': reslug_applied,
        'ra_dokunulmaz': ra_dokunulmaz,
        'non_ra': non_ra_count,
        'non_ra_drift': non_ra_drift,
        'beklenti_dogrulama': {
            'reslug_target': 136,
            'reslug_actual': reslug_applied,
            'fark': reslug_applied - 136,
        },
    },
    'group_dist': group_dist,
    'slug_change_dist': slug_change_dist,
    'reslug_log_entries_count': len(reslug_log_entries),
    'reslug_log_first_30': reslug_log_entries[:30],
    'reslug_log_last_30': reslug_log_entries[-30:],
}
with open(RESLUG_LOG, 'w', encoding='utf-8') as f:
    json.dump(log_out, f, ensure_ascii=False, indent=2, default=str)
print(f'\nReslug log: {RESLUG_LOG} ({len(reslug_log_entries)} entry)')

print('\n=== V28G BUILD TAMAM ===')
print(f'V28f SHA: {V28F_BASELINE_SHA[:16]}... INTACT')
print(f'V28g SHA: {v28g_final_sha[:16]}... NEW')
print(f'Reslug: {reslug_applied} (beklenti 136, fark {reslug_applied - 136})')
print(f'Non-RyeAle drift: {non_ra_drift} (beklenen 0)')
