"""Adım 59 Faz B-1 — 4 yeni feature compute (KURAL 5: sample test ile doğrula).

4 feature:
1. white_ipa_signal: (yeast_witbier OR has_coriander OR has_orange_peel) AND ibu>40 AND dpl>2
2. has_neipa_name: name regex (neipa|hazy|juicy|new england|northeast)
3. neipa_og_ibu_combo: og 1.055-1.075 AND ibu>50 AND dpl>3 AND srm<6
4. late_hop_extreme: late_hop_pct >= 70

Input: working/_v19_dataset.json (89 feature)
Output: working/_v19_1_dataset.json (93 feature)
Audit: _step59_b1_feature_audit.json
"""
import json, sys, re, os
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding='utf-8')


print('[1] Loading V19 dataset...', flush=True)
with open('working/_v19_dataset.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
recs = data['recipes']
feat_list = data['meta']['feature_list']
print(f'  V19: {len(recs)} recipes, {len(feat_list)} features', flush=True)


# Feature compute logic
NEIPA_NAME_RE = re.compile(r'\b(neipa|hazy|juicy|new\s*england|northeast|n\.?e\.?\s*ipa)\b', re.IGNORECASE)


def compute_features(r):
    f = r.get('features') or {}
    name = (r.get('name') or '').lower()

    # Pull existing features
    yw = f.get('yeast_witbier', 0) or 0
    cor = f.get('has_coriander', 0) or 0
    op = f.get('has_orange_peel', 0) or 0
    ibu = f.get('ibu', 0) or 0
    og = f.get('og', 0) or 0
    srm = f.get('srm', 0) or 0
    dpl = f.get('dry_hop_grams_per_liter', 0) or 0
    lhp = f.get('late_hop_pct', 0) or 0

    # 1. white_ipa_signal
    f['white_ipa_signal'] = 1 if ((yw or cor or op) and ibu > 40 and dpl > 2) else 0

    # 2. has_neipa_name
    f['has_neipa_name'] = 1 if NEIPA_NAME_RE.search(name) else 0

    # 3. neipa_og_ibu_combo
    f['neipa_og_ibu_combo'] = 1 if (
        1.055 <= og <= 1.075 and ibu > 50 and dpl > 3 and srm < 6
    ) else 0

    # 4. late_hop_extreme
    f['late_hop_extreme'] = 1 if lhp >= 70 else 0

    r['features'] = f
    return f


print('\n[2] Computing 4 new features...', flush=True)
counts = Counter()
NEW = ['white_ipa_signal', 'has_neipa_name', 'neipa_og_ibu_combo', 'late_hop_extreme']
for i, r in enumerate(recs):
    if i % 50000 == 0 and i > 0:
        print(f'  {i}/{len(recs)}', flush=True)
    f = compute_features(r)
    for fn in NEW:
        if f.get(fn):
            counts[fn] += 1

print(f'\n[3] Global feature distributions:', flush=True)
for fn in NEW:
    n = counts[fn]
    print(f'  {fn:<25} {n:>7d} ({100*n/len(recs):.2f}%)', flush=True)


# ==================== KURAL 5 — Sample test ====================
print('\n[KURAL 5] Sample tests:', flush=True)

# A. white_ipa_signal coverage check
print('\n  A. white_ipa_signal coverage:', flush=True)
test_slugs_a = ['white_ipa', 'belgian_witbier', 'american_india_pale_ale',
                'belgian_ipa', 'rye_ipa', 'red_ipa', 'double_ipa',
                'belgian_tripel', 'specialty_beer']
for s in test_slugs_a:
    sub = [r for r in recs if r.get('bjcp_slug') == s]
    if not sub:
        continue
    n = len(sub)
    pos = sum(1 for r in sub if (r.get('features') or {}).get('white_ipa_signal'))
    print(f'    {s:<40} n={n:>6d}  white_ipa_signal={pos:>4d} ({100*pos/n:.1f}%)', flush=True)

# White IPA sample (10)
print('\n    Sample 10 white_ipa with white_ipa_signal breakdown:', flush=True)
wipa_recs = [r for r in recs if r.get('bjcp_slug') == 'white_ipa']
for r in wipa_recs[:10]:
    f = r.get('features') or {}
    print(f'    {r.get("id"):<25} sig={f.get("white_ipa_signal", 0)} '
          f'yw={f.get("yeast_witbier", 0)} cor={f.get("has_coriander", 0)} '
          f'op={f.get("has_orange_peel", 0)} ibu={f.get("ibu", 0):.0f} '
          f'dpl={f.get("dry_hop_grams_per_liter", 0):.2f}  name={r.get("name", "")[:25]}',
          flush=True)


# B. has_neipa_name coverage
print('\n  B. has_neipa_name coverage:', flush=True)
test_slugs_b = ['juicy_or_hazy_india_pale_ale', 'american_india_pale_ale',
                'american_pale_ale', 'double_ipa', 'belgian_ipa',
                'white_ipa', 'rye_ipa']
for s in test_slugs_b:
    sub = [r for r in recs if r.get('bjcp_slug') == s]
    if not sub:
        continue
    n = len(sub)
    pos = sum(1 for r in sub if (r.get('features') or {}).get('has_neipa_name'))
    print(f'    {s:<40} n={n:>6d}  has_neipa_name={pos:>4d} ({100*pos/n:.1f}%)', flush=True)

# NEIPA sample (10) — özellikle TMF tabanlı (dpl=0 olanlar)
print('\n    Sample 10 NEIPA dpl=0 (TMF parser fail):', flush=True)
neipa_recs = [r for r in recs if r.get('bjcp_slug') == 'juicy_or_hazy_india_pale_ale']
neipa_dpl0 = [r for r in neipa_recs if (r.get('features') or {}).get('dry_hop_grams_per_liter', 0) == 0]
for r in neipa_dpl0[:10]:
    f = r.get('features') or {}
    print(f'    {r.get("id"):<35} hnn={f.get("has_neipa_name", 0)}  '
          f'name={r.get("name", "")[:40]}', flush=True)

# AIPA false positive check
print('\n    Sample 5 AIPA with has_neipa_name=true (false positive check):', flush=True)
aipa_neipa_name = [r for r in recs if r.get('bjcp_slug') == 'american_india_pale_ale'
                   and (r.get('features') or {}).get('has_neipa_name')]
print(f'    Total AIPA with has_neipa_name: {len(aipa_neipa_name)}', flush=True)
for r in aipa_neipa_name[:5]:
    print(f'    {r.get("id"):<25} name={r.get("name", "")[:50]}', flush=True)


# C. neipa_og_ibu_combo coverage
print('\n  C. neipa_og_ibu_combo coverage:', flush=True)
test_slugs_c = ['juicy_or_hazy_india_pale_ale', 'american_india_pale_ale',
                'double_ipa', 'belgian_ipa', 'white_ipa', 'red_ipa',
                'rye_ipa', 'session_india_pale_ale']
for s in test_slugs_c:
    sub = [r for r in recs if r.get('bjcp_slug') == s]
    if not sub:
        continue
    n = len(sub)
    pos = sum(1 for r in sub if (r.get('features') or {}).get('neipa_og_ibu_combo'))
    print(f'    {s:<40} n={n:>6d}  neipa_og_ibu_combo={pos:>4d} ({100*pos/n:.1f}%)', flush=True)


# D. late_hop_extreme coverage
print('\n  D. late_hop_extreme coverage (lhp >= 70):', flush=True)
late_by_slug = defaultdict(int)
total_by_slug = defaultdict(int)
for r in recs:
    slug = r.get('bjcp_slug')
    if not slug:
        continue
    total_by_slug[slug] += 1
    if (r.get('features') or {}).get('late_hop_extreme'):
        late_by_slug[slug] += 1

late_pct = {s: 100*late_by_slug[s]/total_by_slug[s] for s in total_by_slug if total_by_slug[s] >= 10}
sorted_late = sorted(late_pct.items(), key=lambda x: -x[1])
print(f'    Top 25 slugs by late_hop_extreme %:', flush=True)
for s, pct in sorted_late[:25]:
    print(f'    {s:<40} n_total={total_by_slug[s]:>6d}  late_extreme={late_by_slug[s]:>5d} ({pct:>5.1f}%)', flush=True)

# Check NEIPA + AIPA specifically
neipa_late = late_by_slug.get('juicy_or_hazy_india_pale_ale', 0)
neipa_total = total_by_slug.get('juicy_or_hazy_india_pale_ale', 0)
aipa_late = late_by_slug.get('american_india_pale_ale', 0)
aipa_total = total_by_slug.get('american_india_pale_ale', 0)
print(f'\n    NEIPA late_extreme: {neipa_late}/{neipa_total} ({100*neipa_late/neipa_total:.1f}%)', flush=True)
print(f'    AIPA late_extreme: {aipa_late}/{aipa_total} ({100*aipa_late/aipa_total:.1f}%)', flush=True)


# Save dataset
new_feat_list = feat_list + NEW
data['meta']['feature_list'] = new_feat_list
data['meta']['version'] = 'V19.1'
data['meta']['new_features_v19_1'] = NEW
print(f'\n[4] Feature list: {len(feat_list)} → {len(new_feat_list)}', flush=True)

print(f'\n[5] Saving working/_v19_1_dataset.json...', flush=True)
with open('working/_v19_1_dataset.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False)
sz = os.path.getsize('working/_v19_1_dataset.json') / (1024*1024)
print(f'  Saved {len(recs)} recipes, {sz:.0f} MB', flush=True)


# Audit save
audit = {
    'global_counts': dict(counts),
    'global_pct': {fn: round(100*counts[fn]/len(recs), 2) for fn in NEW},
    'white_ipa_signal_per_slug': {
        s: {'n': len([r for r in recs if r.get('bjcp_slug') == s]),
            'pos': sum(1 for r in recs if r.get('bjcp_slug') == s and (r.get('features') or {}).get('white_ipa_signal')),
            'pct': round(100 * sum(1 for r in recs if r.get('bjcp_slug') == s and (r.get('features') or {}).get('white_ipa_signal')) / max(1, len([r for r in recs if r.get('bjcp_slug') == s])), 1)}
        for s in test_slugs_a if any(r.get('bjcp_slug') == s for r in recs)
    },
    'has_neipa_name_per_slug': {
        s: {'n': total_by_slug.get(s, 0),
            'pos': sum(1 for r in recs if r.get('bjcp_slug') == s and (r.get('features') or {}).get('has_neipa_name')),
            'pct': round(100 * sum(1 for r in recs if r.get('bjcp_slug') == s and (r.get('features') or {}).get('has_neipa_name')) / max(1, total_by_slug.get(s, 1)), 1)}
        for s in test_slugs_b if total_by_slug.get(s, 0) > 0
    },
    'neipa_og_ibu_combo_per_slug': {
        s: {'n': total_by_slug.get(s, 0),
            'pos': sum(1 for r in recs if r.get('bjcp_slug') == s and (r.get('features') or {}).get('neipa_og_ibu_combo')),
            'pct': round(100 * sum(1 for r in recs if r.get('bjcp_slug') == s and (r.get('features') or {}).get('neipa_og_ibu_combo')) / max(1, total_by_slug.get(s, 1)), 1)}
        for s in test_slugs_c if total_by_slug.get(s, 0) > 0
    },
    'late_hop_extreme_top25': dict(sorted_late[:25]),
    'late_hop_extreme_neipa_vs_aipa': {
        'neipa': {'n': neipa_total, 'pos': neipa_late, 'pct': round(100*neipa_late/max(1,neipa_total), 1)},
        'aipa': {'n': aipa_total, 'pos': aipa_late, 'pct': round(100*aipa_late/max(1,aipa_total), 1)},
    },
}
with open('_step59_b1_feature_audit.json', 'w', encoding='utf-8') as f:
    json.dump(audit, f, indent=2, ensure_ascii=False)
print('\n[DONE] Wrote _step59_b1_feature_audit.json')
