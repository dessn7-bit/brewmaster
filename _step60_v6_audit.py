"""Adım 60 V6 strateji audit — V19 V6 dataset breakdown + KNN distance impact."""
import json, sys, math
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding='utf-8')


# Load V19 V6 subset
print('[1] Loading V19 V6 subset...', flush=True)
with open('working/_v19_v6_subset.json', 'r', encoding='utf-8') as f:
    v6 = json.load(f)
recs = v6['recipes']
features = v6['meta']['feature_list']  # full 89
print(f'  V6 subset: {len(recs)} recipes, full feature_list {len(features)}', flush=True)


# Tier breakdown
print('\n[2] Slug & tier breakdown:', flush=True)
slug_counts = Counter(r['bjcp_slug'] for r in recs if r.get('bjcp_slug'))
tier_a = []  # >= 1000 in V19
tier_b = []  # 250-999
tier_c = []  # 10-249

# V19 dataset slug counts (full)
print('  Loading V19 full dataset for tier classification...', flush=True)
with open('working/_v19_dataset.json', 'r', encoding='utf-8') as f:
    v19 = json.load(f)
v19_recs = v19['recipes']
v19_slug_full = Counter(r['bjcp_slug'] for r in v19_recs if r.get('bjcp_slug'))
print(f'  V19 full: {len(v19_recs)} recipes, {len(v19_slug_full)} slugs', flush=True)

# Tier classify based on V19 full counts
for s, n_v19 in v19_slug_full.items():
    n_v6 = slug_counts.get(s, 0)
    if n_v19 >= 1000:
        tier_a.append((s, n_v19, n_v6))
    elif n_v19 >= 250:
        tier_b.append((s, n_v19, n_v6))
    elif n_v19 >= 10:
        tier_c.append((s, n_v19, n_v6))

print(f'\n  Tier A (≥1000 in V19): {len(tier_a)} slugs', flush=True)
print(f'  Tier B (250-999):       {len(tier_b)} slugs', flush=True)
print(f'  Tier C (10-249):        {len(tier_c)} slugs', flush=True)

print('\n  Tier A sample (top 10):', flush=True)
for s, n_v19, n_v6 in sorted(tier_a, key=lambda x: -x[1])[:10]:
    print(f'    {s:<40} V19={n_v19:>6d}  V6_subset={n_v6:>4d} ({100*n_v6/n_v19:.1f}%)', flush=True)

print('\n  Tier B sample (10):', flush=True)
for s, n_v19, n_v6 in sorted(tier_b, key=lambda x: -x[1])[:10]:
    print(f'    {s:<40} V19={n_v19:>6d}  V6_subset={n_v6:>4d} ({100*n_v6/n_v19:.1f}%)', flush=True)

print('\n  Tier C sample (top 15 by V19 count):', flush=True)
for s, n_v19, n_v6 in sorted(tier_c, key=lambda x: -x[1])[:15]:
    print(f'    {s:<40} V19={n_v19:>6d}  V6_subset={n_v6:>4d} ({100*n_v6/n_v19:.1f}%)', flush=True)


# Sour cluster
SOUR_SLUGS = {'belgian_lambic', 'berliner_weisse', 'flanders_red_ale', 'oud_bruin',
              'belgian_fruit_lambic', 'belgian_gueuze', 'mixed_fermentation_sour_beer',
              'gose', 'brett_beer'}
sour_v6 = sum(slug_counts.get(s, 0) for s in SOUR_SLUGS)
sour_v19 = sum(v19_slug_full.get(s, 0) for s in SOUR_SLUGS)
print(f'\n  Sour cluster: V19 {sour_v19} ({100*sour_v19/len(v19_recs):.1f}%), V6_subset {sour_v6} ({100*sour_v6/len(recs):.1f}%)', flush=True)


# Compact feature list (V6 inline)
COMPACT_FEATURES = [
    'og', 'fg', 'abv', 'ibu', 'srm',
    'pct_pilsner', 'pct_pale_ale', 'pct_munich', 'pct_vienna', 'pct_wheat',
    'pct_oats', 'pct_rye', 'pct_crystal', 'pct_choc', 'pct_roast', 'pct_smoked',
    'pct_corn', 'pct_rice', 'pct_sugar', 'pct_aromatic_abbey',
    'yeast_belgian', 'yeast_abbey', 'yeast_saison', 'yeast_kveik', 'yeast_english',
    'yeast_american', 'yeast_german_lager', 'yeast_kolsch', 'yeast_witbier',
    'yeast_wheat_german', 'yeast_brett', 'yeast_lacto', 'yeast_sour_blend',
    'hop_american_c', 'hop_english', 'hop_german', 'hop_czech_saaz', 'hop_nz',
    'katki_fruit', 'katki_spice_herb', 'katki_chocolate', 'katki_coffee',
    'katki_smoke', 'katki_lactose',
    'dry_hop_days', 'has_brett', 'has_lacto', 'is_mixed_fermentation',
    'has_coriander', 'has_orange_peel', 'has_chamomile', 'has_salt',
    'has_dry_hop_heavy', 'has_whirlpool_heavy',
    'dry_hop_grams_per_liter', 'late_hop_pct',
]
print(f'\n[3] V6 compact features: {len(COMPACT_FEATURES)} (full {len(features)})', flush=True)


# Feature scale analiz — KNN distance impact
print('\n[4] Feature scale & distribution (KNN distance impact):', flush=True)
print(f'  {"feature":<30} {"min":>8} {"max":>8} {"mean":>8} {"std":>8} {"binary?"}', flush=True)
for f in COMPACT_FEATURES:
    vals = [(r.get('features') or {}).get(f, 0) or 0 for r in recs]
    if not vals:
        continue
    mn = min(vals); mx = max(vals)
    mean = sum(vals) / len(vals)
    var = sum((v - mean)**2 for v in vals) / len(vals)
    std = math.sqrt(var)
    is_binary = 'BINARY' if mn in (0, 0.0) and mx in (0, 1, 1.0) else ''
    print(f'  {f:<30} {mn:>8.3f} {mx:>8.3f} {mean:>8.3f} {std:>8.3f} {is_binary}', flush=True)


# KNN distance impact — sample 5 reçeteler için 89 feature normalize
print('\n[5] KNN distance impact — sample 5 reçete için L2 dist top-5 nearest:', flush=True)

# Compact feature vectors
import numpy as np
X = np.array([[(r.get('features') or {}).get(f, 0) or 0 for f in COMPACT_FEATURES] for r in recs],
             dtype=np.float32)

# Normalize (z-score)
mean = X.mean(axis=0)
std = X.std(axis=0)
std[std == 0] = 1
X_norm = (X - mean) / std
print(f'  X shape: {X.shape}, normalized', flush=True)

# Sample 3 reçete: NEIPA, Witbier, Brett
test_slugs = ['juicy_or_hazy_india_pale_ale', 'belgian_witbier', 'brett_beer']
for tslug in test_slugs:
    samples = [(i, r) for i, r in enumerate(recs) if r['bjcp_slug'] == tslug][:1]
    if not samples:
        continue
    idx, r = samples[0]
    print(f'\n  Sample: {r.get("name", "")[:40]} (slug={tslug}, idx={idx})', flush=True)

    # Compute distances to all
    dists = np.sqrt(((X_norm - X_norm[idx])**2).sum(axis=1))
    # Top 6 (kendisi + 5 nearest)
    top6 = dists.argsort()[:6]
    for ti in top6:
        print(f'    dist={dists[ti]:>6.3f}  slug={recs[ti]["bjcp_slug"]:<40}  name={recs[ti].get("name", "")[:30]}', flush=True)


# Save audit
audit = {
    'v19_total': len(v19_recs),
    'v6_subset_total': len(recs),
    'v19_slug_count': len(v19_slug_full),
    'tier_a_count': len(tier_a),
    'tier_b_count': len(tier_b),
    'tier_c_count': len(tier_c),
    'sour_v19_pct': round(100*sour_v19/len(v19_recs), 1),
    'sour_v6_subset_pct': round(100*sour_v6/len(recs), 1),
    'compact_features_count': len(COMPACT_FEATURES),
    'full_features_count': len(features),
    'tier_a_top10': [(s, n_v19, n_v6) for s, n_v19, n_v6 in sorted(tier_a, key=lambda x: -x[1])[:10]],
    'tier_b_top10': [(s, n_v19, n_v6) for s, n_v19, n_v6 in sorted(tier_b, key=lambda x: -x[1])[:10]],
    'tier_c_top15': [(s, n_v19, n_v6) for s, n_v19, n_v6 in sorted(tier_c, key=lambda x: -x[1])[:15]],
}
with open('_step60_v6_audit_data.json', 'w', encoding='utf-8') as f:
    json.dump(audit, f, indent=2, ensure_ascii=False)
print('\n[DONE] _step60_v6_audit_data.json yazıldı', flush=True)
