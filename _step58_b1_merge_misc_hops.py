"""Adım 58 Faz B-1 — V18.3 base'e rmwoods misc/hops detail merge + 8 yeni feature compute.

Pipeline:
1. _rmwoods_b1_parsed.pickle yükle (recipe_misc, recipe_hop dict'leri)
2. V18.3 dataset (working/archive/v18_3/_v18_3_dataset_clean.json) yükle
3. Her rmwoods reçetesine raw.misc + raw.hops ekle (id eşleşmesi rec_id integer)
4. 8 yeni feature compute:
   - has_coriander, has_orange_peel, has_chamomile (Witbier kurtarma)
   - has_salt (gose ↔ Berliner ayrımı)
   - has_dry_hop_heavy (NEIPA imza, dry hop g/L >= 5)
   - has_whirlpool_heavy (modern IPA, whirlpool g/L >= 2.5)
   - dry_hop_grams_per_liter (continuous, NEIPA)
   - late_hop_pct (≤15 min boil hops % toplam, modern IPA)
5. Output: working/_v19_dataset.json

KURAL 5: her feature için coverage check (Witbier, NEIPA, gose).
"""
import json, pickle, sys, os, time, math
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
T0 = time.time()
def t(): return f'{time.time() - T0:.1f}s'


print(f'[1] Loading rmwoods pickle... {t()}', flush=True)
with open('working/_rmwoods_b1_parsed.pickle', 'rb') as f:
    rm_data = pickle.load(f)
recipe_misc = rm_data['recipe_misc']  # {fk: [{name, name_original, amount, use, time_min}, ...]}
recipe_hop = rm_data['recipe_hop']    # {fk: [{name, amount_g, alpha, time_min, use, form}, ...]}
core_records = rm_data['core_records']
core_id_col = rm_data.get('core_id_col', 'id')
print(f'  recipe_misc: {len(recipe_misc)} recipes, recipe_hop: {len(recipe_hop)} recipes', flush=True)

# Build core lookup for batch_size
core_by_id = {c[core_id_col]: c for c in core_records}
print(f'  core lookup: {len(core_by_id)} recipes  {t()}', flush=True)
del rm_data, core_records


print(f'\n[2] Loading V18.3 dataset... {t()}', flush=True)
with open('working/archive/v18_3/_v18_3_dataset_clean.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
recs = data['recipes']
feat_list = data['meta']['feature_list']
print(f'  V18.3: {len(recs)} recipes, {len(feat_list)} features  {t()}', flush=True)


# Keyword listeleri
CORIANDER_KW = ['coriander', 'koriander', 'kişniş', 'cilantro']
ORANGE_PEEL_KW = ['orange peel', 'orange zest', 'orangenschale', 'portakal',
                  'curaçao', 'curacao', 'bitter orange', 'sweet orange']
CHAMOMILE_KW = ['chamomile', 'kamille', 'papatya']
SALT_KW = ['salt', 'salz', 'sodium chloride', 'meersalz', 'sea salt', 'kosher salt']


def has_kw(misc_list, kws):
    if not misc_list:
        return 0
    for m in misc_list:
        if not isinstance(m, dict):
            continue
        n1 = (m.get('name') or '').lower()
        n2 = (m.get('name_original') or '').lower()
        for kw in kws:
            if kw in n1 or kw in n2:
                return 1
    return 0


def hop_metrics(hop_list, batch_l):
    """Returns: (has_dry_hop_heavy, has_whirlpool_heavy, dry_hop_grams_per_liter, late_hop_pct)"""
    if not hop_list or not batch_l or batch_l <= 0:
        return (0, 0, 0.0, 0.0)
    total_g = 0
    dry_g = 0
    whirl_g = 0
    late_g = 0
    for h in hop_list:
        if not isinstance(h, dict):
            continue
        amt = h.get('amount_g') or 0
        if not isinstance(amt, (int, float)):
            continue
        total_g += amt
        use = (h.get('use') or '').lower()
        time_min = h.get('time_min')
        if 'dry' in use:
            dry_g += amt
        if 'whirl' in use or 'flame' in use or 'aroma' in use or 'hop stand' in use:
            whirl_g += amt
        if isinstance(time_min, (int, float)) and time_min <= 15 and 'dry' not in use:
            late_g += amt
    dry_per_l = dry_g / batch_l if batch_l > 0 else 0
    whirl_per_l = whirl_g / batch_l if batch_l > 0 else 0
    has_dry_heavy = 1 if dry_per_l >= 5.0 else 0
    has_whirl_heavy = 1 if whirl_per_l >= 2.5 else 0
    late_pct = (100 * late_g / total_g) if total_g > 0 else 0
    return (has_dry_heavy, has_whirl_heavy, round(dry_per_l, 2), round(late_pct, 1))


# Process — every recipe
print(f'\n[3] Processing {len(recs)} recipes... {t()}', flush=True)
NEW_FEATURES = ['has_coriander', 'has_orange_peel', 'has_chamomile', 'has_salt',
                'has_dry_hop_heavy', 'has_whirlpool_heavy',
                'dry_hop_grams_per_liter', 'late_hop_pct']
counts = Counter()
rmwoods_processed = 0
non_rmwoods_processed = 0

for i, r in enumerate(recs):
    if i % 50000 == 0 and i > 0:
        print(f'  {i}/{len(recs)}  rm={rmwoods_processed} non-rm={non_rmwoods_processed}  {t()}', flush=True)
    rid = r.get('id', '')
    feat = r.get('features') or {}

    # Default to existing raw if non-rmwoods (V16 has raw, rmwoods doesn't)
    raw = r.get('raw') or {}
    misc_list = []
    hop_list = []
    batch_l = raw.get('batch_size_l') or raw.get('batch_size') or 19.0

    if rid.startswith('rmwoods_'):
        # rmwoods: pickle'dan çek
        try:
            rec_id = int(rid.replace('rmwoods_', ''))
            misc_list = recipe_misc.get(rec_id, [])
            hop_list = recipe_hop.get(rec_id, [])
            core = core_by_id.get(rec_id, {})
            bsz = core.get('batch_size')
            if bsz and isinstance(bsz, (int, float)) and not math.isnan(bsz) and bsz > 0:
                batch_l = bsz
        except (ValueError, TypeError):
            pass
        rmwoods_processed += 1
    else:
        # Non-rmwoods (V16 source): raw'dan çek
        misc_list = (raw.get('misc') or raw.get('miscs') or raw.get('adjuncts') or
                     raw.get('miscellaneous') or [])
        hop_list = raw.get('hops') or raw.get('hop') or []
        non_rmwoods_processed += 1

    # Compute 8 new features
    feat['has_coriander'] = has_kw(misc_list, CORIANDER_KW)
    feat['has_orange_peel'] = has_kw(misc_list, ORANGE_PEEL_KW)
    feat['has_chamomile'] = has_kw(misc_list, CHAMOMILE_KW)
    feat['has_salt'] = has_kw(misc_list, SALT_KW)
    hdh, hwh, dpl, lhp = hop_metrics(hop_list, batch_l)
    feat['has_dry_hop_heavy'] = hdh
    feat['has_whirlpool_heavy'] = hwh
    feat['dry_hop_grams_per_liter'] = dpl
    feat['late_hop_pct'] = lhp

    r['features'] = feat
    for f in NEW_FEATURES:
        v = feat[f]
        if v and (isinstance(v, int) or v > 0):
            counts[f] += 1


print(f'\n[4] Global feature distributions:', flush=True)
for f in NEW_FEATURES:
    n = counts[f]
    pct = 100 * n / len(recs)
    print(f'  {f:<30} {n:>7d} ({pct:.2f}%)', flush=True)


# Coverage per kritik slug
print(f'\n[5] Coverage check — kritik slug\'lar:', flush=True)
SLUG_CHECK = [
    ('belgian_witbier', 'Witbier'),
    ('juicy_or_hazy_india_pale_ale', 'NEIPA'),
    ('gose', 'Gose'),
    ('berliner_weisse', 'Berliner Weisse'),
    ('belgian_tripel', 'Tripel (control)'),
    ('belgian_dubbel', 'Dubbel (control)'),
    ('american_india_pale_ale', 'AIPA (NEIPA control)'),
    ('double_ipa', 'DIPA'),
    ('belgian_ipa', 'Belgian IPA'),
    ('white_ipa', 'White IPA'),
    ('rye_ipa', 'Rye IPA'),
    ('red_ipa', 'Red IPA'),
    ('mixed_fermentation_sour_beer', 'Mixed-Ferm Sour'),
]

for slug, name in SLUG_CHECK:
    sub = [r for r in recs if r.get('bjcp_slug') == slug]
    n = len(sub)
    if n == 0:
        continue
    cor = sum(1 for r in sub if (r.get('features') or {}).get('has_coriander'))
    op = sum(1 for r in sub if (r.get('features') or {}).get('has_orange_peel'))
    salt = sum(1 for r in sub if (r.get('features') or {}).get('has_salt'))
    dhh = sum(1 for r in sub if (r.get('features') or {}).get('has_dry_hop_heavy'))
    wph = sum(1 for r in sub if (r.get('features') or {}).get('has_whirlpool_heavy'))
    avg_dpl = sum((r.get('features') or {}).get('dry_hop_grams_per_liter', 0) for r in sub) / n
    avg_lhp = sum((r.get('features') or {}).get('late_hop_pct', 0) for r in sub) / n
    print(f'  {name:<25} n={n:>5d}  cor={100*cor/n:>5.1f}% op={100*op/n:>5.1f}% '
          f'salt={100*salt/n:>5.1f}% dry_h={100*dhh/n:>5.1f}% wp_h={100*wph/n:>5.1f}% '
          f'dpl_avg={avg_dpl:.2f}g/L late_avg={avg_lhp:.1f}%',
          flush=True)


# Save dataset
new_feat_list = feat_list + NEW_FEATURES
data['meta']['feature_list'] = new_feat_list
data['meta']['version'] = 'V19'
data['meta']['new_features_v19'] = NEW_FEATURES
data['meta']['rmwoods_misc_hops_merged'] = True

print(f'\n[6] Feature list: {len(feat_list)} → {len(new_feat_list)}', flush=True)
print(f'\n[7] Saving working/_v19_dataset.json... {t()}', flush=True)
with open('working/_v19_dataset.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False)
sz = os.path.getsize('working/_v19_dataset.json') / (1024*1024)
print(f'  Saved {len(recs)} recipes, {sz:.0f} MB  {t()}', flush=True)


# Audit save
audit = {
    'rmwoods_processed': rmwoods_processed,
    'non_rmwoods_processed': non_rmwoods_processed,
    'global_counts': dict(counts),
    'global_pct': {f: round(100*counts[f]/len(recs), 2) for f in NEW_FEATURES},
    'critical_slug_coverage': {},
}
for slug, name in SLUG_CHECK:
    sub = [r for r in recs if r.get('bjcp_slug') == slug]
    n = len(sub)
    if n == 0:
        continue
    audit['critical_slug_coverage'][slug] = {
        'n': n,
        'has_coriander_pct': round(100*sum(1 for r in sub if (r.get('features') or {}).get('has_coriander'))/n, 2),
        'has_orange_peel_pct': round(100*sum(1 for r in sub if (r.get('features') or {}).get('has_orange_peel'))/n, 2),
        'has_salt_pct': round(100*sum(1 for r in sub if (r.get('features') or {}).get('has_salt'))/n, 2),
        'has_dry_hop_heavy_pct': round(100*sum(1 for r in sub if (r.get('features') or {}).get('has_dry_hop_heavy'))/n, 2),
        'has_whirlpool_heavy_pct': round(100*sum(1 for r in sub if (r.get('features') or {}).get('has_whirlpool_heavy'))/n, 2),
        'dry_hop_gpl_avg': round(sum((r.get('features') or {}).get('dry_hop_grams_per_liter', 0) for r in sub) / n, 2),
        'late_hop_pct_avg': round(sum((r.get('features') or {}).get('late_hop_pct', 0) for r in sub) / n, 2),
    }
with open('_step58_b1_merge_audit.json', 'w', encoding='utf-8') as f:
    json.dump(audit, f, indent=2, ensure_ascii=False)
print(f'\n[DONE] {t()}', flush=True)
