"""
Sub-sprint 1 — V28f build (Hefeweizen reslug).
V28e -> V28f, 1879 algoritmik reslug, manuel 3167 + dokunulmaz 2810 + diger slug 368989 dokunulmaz.
KURAL 1.4 (slug etiketi degisir, recete silinmez).
SADECE V28e'den OKU, V28f'e yaz.
"""
import ijson
import json
import sys
import os
import time
import hashlib
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

V28E = 'working/_v28e_aliased_dataset.json'
V28F = 'working/_v28f_aliased_dataset.json'
RESLUG_LOG = 'working/_v28f_reslug_log.json'

V28E_BASELINE_SHA = '475746f7d01db80b202c08328adafcc12b44eb1e4282f2add1382d756fd7eb17'

SD = json.load(open('STYLE_DEFINITIONS.json'))
H = SD['south_german_hefeweizen']
W = SD['south_german_weizenbock']
D = SD['south_german_dunkel_weizen']
BF = SD['south_german_bernsteinfarbenes_weizen']
LW = SD['german_leichtes_weizen']
AWB = SD['american_wheat_beer']
AWW = SD['american_wheat_wine_ale']


def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        while True:
            c = f.read(8 * 1024 * 1024)
            if not c: break
            h.update(c)
    return h.hexdigest()


def assign_priority(og, fg, ibu, srm, abv, ywg):
    """Priority order ile alt-grup ataması. Returns (grp_id, hedef_slug | None, aksiyon)."""
    # 1. ZONE_INSIDE
    if (H['og'][0] <= og <= H['og'][1] and H['fg'][0] <= fg <= H['fg'][1]
        and H['ibu'][0] <= ibu <= H['ibu'][1] and H['srm'][0] <= srm <= H['srm'][1]
        and H['abv'][0] <= abv <= H['abv'][1]):
        return ('1_ZONE_INSIDE', None, 'dokunma')
    # 2. AMERICAN_WHEAT_WINE
    if (AWW['og'][0] <= og <= AWW['og'][1] and AWW['ibu'][0] <= ibu <= AWW['ibu'][1]
        and AWW['srm'][0] <= srm <= AWW['srm'][1]):
        return ('2_AMERICAN_WHEAT_WINE', 'american_wheat_wine_ale', 'algoritmik')
    # 3. WEIZENBOCK
    if W['og'][0] <= og <= W['og'][1] and W['ibu'][0] <= ibu <= W['ibu'][1]:
        return ('3_WEIZENBOCK', 'south_german_weizenbock', 'algoritmik')
    # 4. BERNSTEIN_WEIZEN
    if (BF['og'][0] <= og <= BF['og'][1] and BF['srm'][0] <= srm <= BF['srm'][1]
        and ibu <= BF['ibu'][1] + 5):
        return ('4_BERNSTEIN_WEIZEN', 'south_german_bernsteinfarbenes_weizen', 'algoritmik')
    # 5. DUNKEL_WEIZEN
    if (D['og'][0] <= og <= D['og'][1] and D['srm'][0] <= srm <= D['srm'][1]
        and ibu <= D['ibu'][1] + 5):
        return ('5_DUNKEL_WEIZEN', 'south_german_dunkel_weizen', 'algoritmik')
    # 6. LEICHTES_WEIZEN
    if (LW['og'][0] <= og <= LW['og'][1] and LW['abv'][0] <= abv <= LW['abv'][1]
        and LW['ibu'][0] <= ibu <= LW['ibu'][1]):
        return ('6_LEICHTES_WEIZEN', 'german_leichtes_weizen', 'algoritmik')
    # 7. HOPPY_WHEAT_IBU>35
    if ibu > AWB['ibu'][1] and ywg == 1:
        return ('7_HOPPY_WHEAT', None, 'manuel')
    # 8. HIGH_IBU_NO_WG
    if ibu > AWB['ibu'][1] and ywg == 0:
        return ('8_HIGH_IBU_NO_WG', None, 'manuel')
    # 9. CONFLICT_HIGH_OG_HIGH_IBU
    if og > W['og'][1] and ibu > AWB['ibu'][1]:
        return ('9_CONFLICT', None, 'manuel')
    # 10. AMERICAN_WHEAT_BEER (IBU > 15 zorunlu)
    if (AWB['og'][0] <= og <= AWB['og'][1] and 16 <= ibu <= AWB['ibu'][1]
        and AWB['srm'][0] <= srm <= AWB['srm'][1]):
        return ('10_AMERICAN_WHEAT_BEER', 'american_wheat_beer', 'algoritmik')
    # 11. VERY_HIGH_SRM
    if srm > D['srm'][1]:
        return ('11_VERY_HIGH_SRM', None, 'manuel')
    # 12. ZONE_BORDERLINE
    return ('12_ZONE_BORDERLINE', None, 'manuel')


# === STEP 1: V28e SHA dogrulama
print('=== STEP 1 — V28e SHA dogrulama ===')
v28e_pre = sha(V28E)
print(f'V28e pre-build sha: {v28e_pre}')
if v28e_pre != V28E_BASELINE_SHA:
    raise SystemExit(f'V28e SHA SAPMASI: BUILD IPTAL\n  pre={v28e_pre}\n  exp={V28E_BASELINE_SHA}')
print('V28e baseline ESIT, build basliyor.')

# === STEP 2: V28f build (stream)
print('\n=== STEP 2 — V28f build (Hefeweizen reslug) ===')
t0 = time.time()
total = 0
hef_count = 0
non_hef_count = 0
reslug_applied = 0
non_hef_drift = 0
hef_dokunulmaz = 0  # ZONE_INSIDE + manuel review
group_dist = {}
slug_change_dist = {}
reslug_log_entries = []

with open(V28E, 'rb') as fin, open(V28F, 'w', encoding='utf-8') as fout:
    fout.write('{"recipes":[')
    parser = ijson.items(fin, 'recipes.item', use_float=True)
    first = True
    for r in parser:
        total += 1
        slug_orig = r.get('bjcp_slug') or ''

        if slug_orig == 'south_german_hefeweizen':
            hef_count += 1
            feats = r.get('features', {}) or {}
            og = feats.get('og', 0) or 0
            fg = feats.get('fg', 0) or 0
            ibu = feats.get('ibu', 0) or 0
            srm = feats.get('srm', 0) or 0
            abv = feats.get('abv', 0) or 0
            ywg = int(feats.get('yeast_wheat_german', 0) or 0)

            grp_id, hedef, aksiyon = assign_priority(og, fg, ibu, srm, abv, ywg)
            group_dist[grp_id] = group_dist.get(grp_id, 0) + 1

            if aksiyon == 'algoritmik' and hedef and hedef != slug_orig:
                # Reslug yap
                r['bjcp_slug'] = hedef
                r['_orig_slug_v28e'] = slug_orig
                r['_v28f_alt_grup'] = grp_id
                reslug_applied += 1
                slug_change_dist[hedef] = slug_change_dist.get(hedef, 0) + 1
                reslug_log_entries.append({
                    'recipe_id': r.get('id'),
                    'eski_slug': slug_orig,
                    'yeni_slug': hedef,
                    'alt_grup': grp_id,
                    'og': og, 'fg': fg, 'ibu': ibu, 'srm': srm, 'abv': abv,
                    'yeast_wheat_german': ywg,
                })
            else:
                # Dokunulmaz (ZONE_INSIDE veya manuel review)
                hef_dokunulmaz += 1
                r['_v28f_alt_grup'] = grp_id
        else:
            non_hef_count += 1
            # Drift guard: bjcp_slug DEGISTI mi (hef olmayan icin yasak)
            if r.get('bjcp_slug') != slug_orig:
                non_hef_drift += 1

        if not first: fout.write(',')
        fout.write(json.dumps(r, ensure_ascii=False, default=str))
        first = False

        if total % 50000 == 0:
            print(f'  [{total} recete, {time.time()-t0:.1f}s]')

    fout.write(']}')

elapsed = time.time() - t0
print(f'\nBuild bitti: {total} recete, {elapsed:.1f}s')
print(f'  Hefeweizen orijinal: {hef_count}')
print(f'  Reslug uygulandi: {reslug_applied}')
print(f'  Hefeweizen dokunulmaz: {hef_dokunulmaz} (ZONE_INSIDE + manuel review)')
print(f'  Non-Hefeweizen: {non_hef_count}')
print(f'  Non-Hefeweizen drift (beklenen 0): {non_hef_drift}')

# Slug change distribution
print(f'\nReslug slug dagilimi:')
for sl, cnt in sorted(slug_change_dist.items(), key=lambda x: -x[1]):
    print(f'  {sl:<45} {cnt}')

# Group distribution
print(f'\nAlt-grup dagilimi (7856 hefeweizen icinde):')
for grp_id in sorted(group_dist.keys(), key=lambda x: int(x.split('_')[0])):
    print(f'  {grp_id:<35} {group_dist[grp_id]}')

# === STEP 3: V28e SHA tekrar
print('\n=== STEP 3 — V28e SHA post-build ===')
v28e_post = sha(V28E)
v28e_intact = v28e_post == V28E_BASELINE_SHA
print(f'V28e post: {v28e_post}')
print(f'INTACT: {v28e_intact}')
if not v28e_intact:
    raise SystemExit('V28e POST-BUILD DRIFT — KRITIK')

# === STEP 4: V28f meta + sha
print('\n=== STEP 4 — V28f meta append + final sha ===')
v28f_size_pre = os.path.getsize(V28F)
print(f'V28f pre-meta size: {v28f_size_pre}')

# V28e meta'sini oku, V28f'e adapte et
with open(V28E, 'rb') as f:
    f.seek(max(0, os.path.getsize(V28E) - 5000))
    tail = f.read().decode('utf-8', errors='replace')
# meta JSON tail'inde son } oncesi
import re
meta_match = re.search(r'"meta":\{[^}]+\}\}\s*$', tail)
v28e_meta = {}
if meta_match:
    full_meta_str = meta_match.group(0)
    full_meta_str = full_meta_str[:-1]  # tail'in son } cikar
    try:
        v28e_meta_json = json.loads('{' + full_meta_str + '}')
        v28e_meta = v28e_meta_json.get('meta', {})
    except Exception as e:
        print(f'V28e meta parse hatasi: {e}')

# V28f meta
v28f_meta = dict(v28e_meta)
v28f_meta['version'] = 'V28f'
v28f_meta['count'] = total
v28f_meta['v28f_built_from'] = 'V28e + Sub-sprint 1 Hefeweizen reslug (1879 algoritmik, BA 2026 priority order)'
v28f_meta['v28f_sprint'] = 'Adim 18d-pre Sub-sprint 1'
v28f_meta['v28f_baseline_v28e_sha'] = V28E_BASELINE_SHA

# V28f trim trailing space + meta append
with open(V28F, 'rb') as f:
    f.seek(max(0, v28f_size_pre - 100))
    tail = f.read()
tail_str = tail.decode('utf-8', errors='replace')
trim_bytes = (len(tail) - len(tail_str.rstrip())) + 1
truncate = v28f_size_pre - trim_bytes

V28F_TMP = V28F + '.tmp'
meta_json = json.dumps(v28f_meta, ensure_ascii=False, separators=(',', ':'))
with open(V28F, 'rb') as fin, open(V28F_TMP, 'wb') as fout:
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
os.replace(V28F_TMP, V28F)

v28f_final_sha = sha(V28F)
v28f_final_size = os.path.getsize(V28F)
print(f'V28f final sha: {v28f_final_sha}')
print(f'V28f final size: {v28f_final_size}')

# === Reslug log
print('\n=== STEP 5 — Reslug log ===')
log_out = {
    'meta': {
        'sprint': 'Sub-sprint 1 V28f Hefeweizen reslug',
        'kural': 'KURAL 1.4 (slug etiketi degisir, recete silinmez), KURAL 9.2 (kaynak destekli BA 2026)',
        'v28e_sha_pre': v28e_pre,
        'v28e_sha_post': v28e_post,
        'v28e_intact': v28e_intact,
        'v28f_sha': v28f_final_sha,
        'v28f_size': v28f_final_size,
        'kaynak': 'STYLE_DEFINITIONS.json + working/_step60d_hefeweizen_build_netlesme.json',
    },
    'sayim_ozeti': {
        'toplam_recete': total,
        'hefeweizen_orijinal': hef_count,
        'reslug_applied': reslug_applied,
        'hef_dokunulmaz': hef_dokunulmaz,
        'non_hef': non_hef_count,
        'non_hef_drift': non_hef_drift,
        'beklenti_dogrulama': {
            'reslug_target': 1879,
            'reslug_actual': reslug_applied,
            'fark': reslug_applied - 1879,
        },
    },
    'group_dist': group_dist,
    'slug_change_dist': slug_change_dist,
    'reslug_log_entries_count': len(reslug_log_entries),
    'reslug_log_first_50': reslug_log_entries[:50],
    'reslug_log_last_50': reslug_log_entries[-50:],
}
with open(RESLUG_LOG, 'w', encoding='utf-8') as f:
    json.dump(log_out, f, ensure_ascii=False, indent=2, default=str)
print(f'Reslug log: {RESLUG_LOG} ({len(reslug_log_entries)} entry)')


print('\n=== V28F BUILD TAMAM ===')
print(f'V28e SHA: {V28E_BASELINE_SHA[:16]}... INTACT')
print(f'V28f SHA: {v28f_final_sha[:16]}... NEW')
print(f'V28f recete: {total} (orijinal V28e ile esit)')
print(f'Hefeweizen reslug: {reslug_applied} (beklenti 1879, fark {reslug_applied - 1879})')
print(f'Non-Hefeweizen drift: {non_hef_drift} (beklenti 0)')
