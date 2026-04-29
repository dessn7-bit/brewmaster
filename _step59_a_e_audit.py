"""Adım 59 Faz B pre-flight — A/B/C/D/E audit.

A. V19 zayıf slug tablosu (≤250 reçete bucket)
B. has_salt slug-level coverage (gose-only signal mi audit)
C. NEIPA collapse derin tanı (dry_hop_grams_per_liter dağılımı)
D. white_ipa ↔ witbier confusion (model prediction analiz)
E. brett strain detail (rmwoods raw yeast_product_id varlığı)

Output:
- _step59_audit_data.json
"""
import json, sys, pickle
import numpy as np
from collections import Counter, defaultdict
import xgboost as xgb

sys.stdout.reconfigure(encoding='utf-8')


print('[1] Loading V19 dataset...', flush=True)
with open('working/_v19_dataset.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
recs = data['recipes']
feat_list = data['meta']['feature_list']
print(f'  V19: {len(recs)} recipes, {len(feat_list)} features', flush=True)


# ==================== A. Zayıf slug tablosu ====================
print('\n[A] V19 zayıf slug tablosu (≤250 bucket)...', flush=True)
slug_counts = Counter(r.get('bjcp_slug') for r in recs if r.get('bjcp_slug'))
weak_slugs = sorted([(s, c) for s, c in slug_counts.items() if c <= 250 and c >= 10],
                    key=lambda x: x[1])
print(f'  Total slugs: {len(slug_counts)}, ≤250 bucket: {len(weak_slugs)}', flush=True)
for s, c in weak_slugs:
    print(f'  {s:<40} {c}', flush=True)

# V18.3 ve V19 karşılaştırma için hatırlatma
INTEREST = ['belgian_quadrupel', 'brett_beer', 'german_oktoberfest_festbier',
            'kellerbier', 'gose', 'english_pale_ale', 'belgian_ipa',
            'rye_ipa', 'white_ipa', 'red_ipa', 'mixed_fermentation_sour_beer',
            'belgian_gueuze', 'juicy_or_hazy_india_pale_ale', 'dunkles_bock']
print('\n  Interest slug counts:', flush=True)
for s in INTEREST:
    print(f'  {s:<40} {slug_counts.get(s, 0)}', flush=True)


# ==================== B. has_salt slug-level coverage ====================
print('\n[B] has_salt slug-level coverage audit...', flush=True)
salt_by_slug = defaultdict(int)
total_by_slug = defaultdict(int)
for r in recs:
    slug = r.get('bjcp_slug')
    if not slug:
        continue
    total_by_slug[slug] += 1
    feat = r.get('features') or {}
    if feat.get('has_salt'):
        salt_by_slug[slug] += 1

salt_pct_by_slug = {s: 100 * salt_by_slug[s] / total_by_slug[s]
                    for s in total_by_slug if total_by_slug[s] >= 10}
sorted_salt = sorted(salt_pct_by_slug.items(), key=lambda x: -x[1])
print(f'  Top 25 slugs by has_salt %:', flush=True)
for s, pct in sorted_salt[:25]:
    n_with_salt = salt_by_slug[s]
    n_total = total_by_slug[s]
    print(f'  {s:<40} n_total={n_total:>6d}  has_salt={n_with_salt:>5d} ({pct:>5.1f}%)', flush=True)

# Sample 20 non-gose recipes with has_salt true
print('\n  Sample 20 non-gose has_salt=true reçeteler:', flush=True)
salt_non_gose_samples = []
for r in recs:
    if (r.get('features') or {}).get('has_salt') and r.get('bjcp_slug') != 'gose':
        salt_non_gose_samples.append({
            'id': r.get('id'),
            'name': r.get('name', '')[:50],
            'slug': r.get('bjcp_slug'),
            'sorte_raw': r.get('sorte_raw', '')[:40],
        })
        if len(salt_non_gose_samples) >= 20:
            break
for s in salt_non_gose_samples:
    print(f'  {s["id"]:<22} slug={s["slug"]:<35} name={s["name"]}', flush=True)


# ==================== C. NEIPA collapse derin tanı ====================
print('\n[C] NEIPA collapse derin tanı...', flush=True)
neipa_recs = [r for r in recs if r.get('bjcp_slug') == 'juicy_or_hazy_india_pale_ale']
print(f'  NEIPA total: {len(neipa_recs)}', flush=True)

if neipa_recs:
    dpl = [(r.get('features') or {}).get('dry_hop_grams_per_liter', 0) for r in neipa_recs]
    lhp = [(r.get('features') or {}).get('late_hop_pct', 0) for r in neipa_recs]
    dpl_dist = sorted(dpl)
    lhp_dist = sorted(lhp)
    n = len(dpl_dist)
    print(f'  dry_hop_grams_per_liter: '
          f'p25={dpl_dist[n//4]:.2f}  p50={dpl_dist[n//2]:.2f}  '
          f'p75={dpl_dist[3*n//4]:.2f}  max={dpl_dist[-1]:.2f}', flush=True)
    print(f'  late_hop_pct: '
          f'p25={lhp_dist[n//4]:.1f}  p50={lhp_dist[n//2]:.1f}  '
          f'p75={lhp_dist[3*n//4]:.1f}  max={lhp_dist[-1]:.1f}', flush=True)
    nonzero_dpl = sum(1 for v in dpl if v > 0)
    nonzero_lhp = sum(1 for v in lhp if v > 0)
    print(f'  dpl > 0: {nonzero_dpl}/{n} ({100*nonzero_dpl/n:.1f}%)', flush=True)
    print(f'  lhp > 0: {nonzero_lhp}/{n} ({100*nonzero_lhp/n:.1f}%)', flush=True)

# AIPA control comparison
aipa_recs = [r for r in recs if r.get('bjcp_slug') == 'american_india_pale_ale']
if aipa_recs:
    aipa_dpl = [(r.get('features') or {}).get('dry_hop_grams_per_liter', 0) for r in aipa_recs]
    aipa_lhp = [(r.get('features') or {}).get('late_hop_pct', 0) for r in aipa_recs]
    print(f'\n  AIPA control (n={len(aipa_recs)}):', flush=True)
    aipa_dpl_s = sorted(aipa_dpl)
    aipa_lhp_s = sorted(aipa_lhp)
    n2 = len(aipa_dpl_s)
    print(f'  AIPA dpl: p50={aipa_dpl_s[n2//2]:.2f}  p75={aipa_dpl_s[3*n2//4]:.2f}', flush=True)
    print(f'  AIPA lhp: p50={aipa_lhp_s[n2//2]:.1f}  p75={aipa_lhp_s[3*n2//4]:.1f}', flush=True)

# Sample 10 NEIPA recipes
print('\n  Sample 10 NEIPA reçete (dpl, lhp, has_dry_hop_heavy, has_whirlpool_heavy):', flush=True)
for r in neipa_recs[:10]:
    f = r.get('features') or {}
    print(f'  {r.get("id"):<25} dpl={f.get("dry_hop_grams_per_liter", 0):>5.2f}  '
          f'lhp={f.get("late_hop_pct", 0):>5.1f}  '
          f'dry_h={f.get("has_dry_hop_heavy", 0)}  '
          f'wp_h={f.get("has_whirlpool_heavy", 0)}  '
          f'name={r.get("name", "")[:30]}', flush=True)


# ==================== D. white_ipa ↔ witbier confusion ====================
print('\n[D] white_ipa ↔ witbier confusion (V19 model üzerinde)...', flush=True)
m = xgb.Booster(); m.load_model('working/archive/v18_2/_v18_2_model_slug.json' if False else '_v19_model_slug.json')
le = json.load(open('_v19_label_encoder_slug.json', encoding='utf-8'))

# White IPA reçetelerini al, V19 model ile predict et
white_ipa_recs = [r for r in recs if r.get('bjcp_slug') == 'white_ipa']
print(f'  white_ipa total: {len(white_ipa_recs)}', flush=True)

if white_ipa_recs:
    X = np.array([[r['features'].get(k, 0) or 0 for k in le['feature_list']]
                   for r in white_ipa_recs], dtype=np.float32)
    d = xgb.DMatrix(X)
    proba = m.predict(d)
    pred_idx = proba.argmax(axis=1)
    pred_slugs = [le['classes'][i] for i in pred_idx]
    confusion = Counter(pred_slugs)
    print(f'  white_ipa prediction dağılımı:', flush=True)
    for s, c in confusion.most_common(10):
        print(f'    {s:<40} {c} ({100*c/len(white_ipa_recs):.1f}%)', flush=True)

    # has_coriander true olan white_ipa reçeteleri
    cor_count = sum(1 for r in white_ipa_recs if (r.get('features') or {}).get('has_coriander'))
    op_count = sum(1 for r in white_ipa_recs if (r.get('features') or {}).get('has_orange_peel'))
    yw_count = sum(1 for r in white_ipa_recs if (r.get('features') or {}).get('yeast_witbier'))
    print(f'\n  Feature coverage in white_ipa:', flush=True)
    print(f'    has_coriander: {cor_count}/{len(white_ipa_recs)} ({100*cor_count/len(white_ipa_recs):.1f}%)', flush=True)
    print(f'    has_orange_peel: {op_count}/{len(white_ipa_recs)} ({100*op_count/len(white_ipa_recs):.1f}%)', flush=True)
    print(f'    yeast_witbier: {yw_count}/{len(white_ipa_recs)} ({100*yw_count/len(white_ipa_recs):.1f}%)', flush=True)

    # Sample 10 white_ipa with feature breakdown
    print('\n  Sample 10 white_ipa reçete (features):', flush=True)
    for r in white_ipa_recs[:10]:
        f = r.get('features') or {}
        cor = f.get('has_coriander', 0)
        op = f.get('has_orange_peel', 0)
        yw = f.get('yeast_witbier', 0)
        ibu = f.get('ibu', 0)
        og = f.get('og', 0)
        dpl = f.get('dry_hop_grams_per_liter', 0)
        print(f'  {r.get("id"):<25} cor={cor} op={op} yw={yw} ibu={ibu:.0f} og={og:.3f} dpl={dpl:.2f}  '
              f'name={r.get("name", "")[:25]}', flush=True)


# ==================== E. brett strain detail ====================
print('\n[E] brett strain detail audit...', flush=True)

# Pickle'dan rmwoods yeast detail çek
print('  Loading rmwoods yeast pickle...', flush=True)
with open('working/_rmwoods_b1_parsed.pickle', 'rb') as f:
    rm_data = pickle.load(f)
recipe_yeast = rm_data['recipe_yeast']
print(f'  recipe_yeast: {len(recipe_yeast)} recipes', flush=True)

# brett_beer reçetelerinin rmwoods yeast detail
brett_recs = [r for r in recs if r.get('bjcp_slug') == 'brett_beer']
print(f'  brett_beer total: {len(brett_recs)}', flush=True)

# Strain detection patterns
WLP_BRETT = ['wlp644', 'wlp645', 'wlp648', 'wlp650', 'wlp651', 'wlp652', 'wlp653',
             'wlp654', 'wlp655', 'wlp656', 'wlp660', 'wlp665', 'wlp670', 'wlp671', 'wlp672']
WY_BRETT = ['5112', '5151', '5526', '5512', '5733', '5378']
BRUX_KW = ['bruxellensis', 'brux']
TROIS_KW = ['drie', 'trois']
CLAUSEN_KW = ['clausenii', 'clausen']
LAMBICUS_KW = ['lambicus']

strain_brux = 0
strain_trois = 0
strain_clausen = 0
strain_lambicus = 0
strain_wlp = 0
strain_wy = 0
strain_unknown = 0
yeast_samples = []

for r in brett_recs:
    rid = r.get('id', '')
    yeast_text = ''
    if rid.startswith('rmwoods_'):
        try:
            rec_id = int(rid.replace('rmwoods_', ''))
            yeasts = recipe_yeast.get(rec_id, [])
            for y in yeasts:
                if isinstance(y, dict):
                    yeast_text += ' '.join(str(v) for v in [
                        y.get('name'), y.get('name_original'),
                        y.get('lab'), y.get('product_id'), y.get('type')
                    ] if v).lower() + ' '
        except (ValueError, TypeError):
            pass

    detected = []
    if any(k in yeast_text for k in BRUX_KW):
        strain_brux += 1; detected.append('brux')
    if any(k in yeast_text for k in TROIS_KW):
        strain_trois += 1; detected.append('trois')
    if any(k in yeast_text for k in CLAUSEN_KW):
        strain_clausen += 1; detected.append('clausen')
    if any(k in yeast_text for k in LAMBICUS_KW):
        strain_lambicus += 1; detected.append('lambicus')
    if any(k in yeast_text for k in WLP_BRETT):
        strain_wlp += 1; detected.append('wlp_id')
    if any(k in yeast_text for k in WY_BRETT):
        strain_wy += 1; detected.append('wy_id')
    if not detected:
        strain_unknown += 1

    if len(yeast_samples) < 30:
        yeast_samples.append({
            'id': rid, 'name': r.get('name', '')[:40],
            'detected': detected, 'yeast_text': yeast_text[:120],
        })

print(f'\n  Brett strain breakdown (brett_beer n={len(brett_recs)}):', flush=True)
print(f'    bruxellensis keyword: {strain_brux} ({100*strain_brux/len(brett_recs):.1f}%)', flush=True)
print(f'    trois (3 yeasts): {strain_trois}', flush=True)
print(f'    clausenii: {strain_clausen}', flush=True)
print(f'    lambicus: {strain_lambicus}', flush=True)
print(f'    WLP brett ID match: {strain_wlp}', flush=True)
print(f'    Wyeast brett ID match: {strain_wy}', flush=True)
print(f'    No specific strain (only "brett" generic): {strain_unknown} ({100*strain_unknown/len(brett_recs):.1f}%)', flush=True)

print('\n  Sample 30 brett_beer yeast detail:', flush=True)
for s in yeast_samples[:30]:
    detected_str = ','.join(s['detected']) if s['detected'] else 'NONE'
    print(f'  {s["id"]:<25} [{detected_str:<25}] {s["yeast_text"][:80]}', flush=True)


# ==================== Save audit data ====================
audit = {
    'A_weak_slugs_v19': dict(weak_slugs),
    'A_interest_slug_counts': {s: slug_counts.get(s, 0) for s in INTEREST},
    'A_total_slugs': len(slug_counts),
    'A_dataset_size': len(recs),
    'B_salt_top25': dict(sorted_salt[:25]),
    'B_salt_non_gose_samples': salt_non_gose_samples,
    'C_neipa_total': len(neipa_recs),
    'C_neipa_dpl_p25_p50_p75_max': [dpl_dist[n//4], dpl_dist[n//2], dpl_dist[3*n//4], dpl_dist[-1]] if neipa_recs else [],
    'C_neipa_lhp_p25_p50_p75_max': [lhp_dist[n//4], lhp_dist[n//2], lhp_dist[3*n//4], lhp_dist[-1]] if neipa_recs else [],
    'C_aipa_dpl_p50_p75': [aipa_dpl_s[n2//2], aipa_dpl_s[3*n2//4]] if aipa_recs else [],
    'D_white_ipa_total': len(white_ipa_recs),
    'D_white_ipa_confusion': dict(confusion.most_common(10)) if white_ipa_recs else {},
    'D_white_ipa_features': {
        'has_coriander_pct': round(100*cor_count/len(white_ipa_recs), 1) if white_ipa_recs else 0,
        'has_orange_peel_pct': round(100*op_count/len(white_ipa_recs), 1) if white_ipa_recs else 0,
        'yeast_witbier_pct': round(100*yw_count/len(white_ipa_recs), 1) if white_ipa_recs else 0,
    } if white_ipa_recs else {},
    'E_brett_total': len(brett_recs),
    'E_brett_strain_breakdown': {
        'bruxellensis': strain_brux, 'trois': strain_trois,
        'clausenii': strain_clausen, 'lambicus': strain_lambicus,
        'wlp_id': strain_wlp, 'wy_id': strain_wy,
        'no_specific_strain': strain_unknown,
    },
    'E_brett_samples': yeast_samples,
}
with open('_step59_audit_data.json', 'w', encoding='utf-8') as f:
    json.dump(audit, f, indent=2, ensure_ascii=False)
print('\n[DONE] Wrote _step59_audit_data.json', flush=True)
