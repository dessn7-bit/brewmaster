"""Faz A2 v3 — feature coverage gap analizi (rmwoods vs metric-rich kaynaklar)."""
import json
from collections import defaultdict, Counter

PATH = 'working/_v18_2_dataset.json'
OUT = '_step56_a2_feature_coverage.json'

print('Loading...', flush=True)
with open(PATH, 'r', encoding='utf-8') as f:
    d = json.load(f)
recs = d['recipes']
feat_list = d['meta'].get('feature_list', [])
print(f'Total: {len(recs)}, features: {len(feat_list)}', flush=True)


def get_src(r):
    src = r.get('source', '?')
    if src == 'rmwoods':
        sub = (r.get('raw') or {}).get('origin') or 'rmwoods?'
        return f'rmwoods/{sub}' if sub != 'rmwoods?' else 'rmwoods'
    return src


# Group recipes by source category
SRC_CATEGORIES = {
    'rmwoods/brewtoad': 'rmwoods_brewtoad',
    'rmwoods/brewersfriend': 'rmwoods_brewersfriend',
    'rmwoods': 'rmwoods_other',
    'aha': 'aha',
    'byo': 'byo',
    'mmum': 'mmum',
    'braureka': 'braureka',
    'recipator': 'recipator',
    'tmf': 'tmf',
    'twortwat': 'twortwat',
    'roerstok': 'roerstok',
    'amervallei': 'amervallei',
}

# For each feature, count populated (non-zero, non-null) per source category
feat_pop_by_src = defaultdict(lambda: defaultdict(int))
src_total = defaultdict(int)

# Key advanced features we expect to be discriminative
KEY_FEATS = [
    'og', 'fg', 'ibu', 'srm', 'abv',  # basic
    'pct_pilsner', 'pct_pale_ale', 'pct_munich', 'pct_vienna', 'pct_wheat',
    'pct_crystal', 'pct_choc', 'pct_roast', 'pct_oats', 'pct_rye_high',  # grain
    'pct_oats_high', 'pct_smoked', 'pct_sugar',
    'has_dry_hop', 'has_whirlpool', 'has_fwh', 'has_late_hop',  # hop schedule
    'ibu_og_ratio', 'og_fg_ratio',  # ratios
    'katki_fruit', 'katki_fruit_strong', 'katki_spice', 'katki_brett',
    'has_brett', 'has_salt', 'has_coriander',  # ingredient markers
    'yeast_belgian', 'yeast_witbier', 'yeast_brett', 'yeast_saison',
    'yeast_lager', 'yeast_english', 'yeast_american',
    'yeast_lab_wyeast', 'yeast_lab_white_labs', 'yeast_lab_fermentis', 'yeast_lab_other',
    'srm_high_ibu_high', 'yeast_belgian_high_bu_gu', 'yeast_witbier_high_og_ibu',
    'mash_temp', 'mash_time', 'fermentation_temp',  # process
    'dry_hop_days', 'boil_time', 'efficiency',
]

available_keys = set(feat_list)
key_feats_present = [f for f in KEY_FEATS if f in available_keys]
key_feats_missing = [f for f in KEY_FEATS if f not in available_keys]

print(f'Key features in dataset: {len(key_feats_present)} / requested {len(KEY_FEATS)}')
print(f'  MISSING from dataset: {key_feats_missing}', flush=True)

for r in recs:
    src = get_src(r)
    cat = SRC_CATEGORIES.get(src, 'other')
    src_total[cat] += 1
    feat = r.get('features') or {}
    for k in key_feats_present:
        v = feat.get(k)
        if v is not None and v != 0 and v != '':
            feat_pop_by_src[cat][k] += 1


# Build coverage table: feature × source category, % populated
coverage = {}
for cat in src_total:
    total = src_total[cat]
    coverage[cat] = {
        'total_recipes': total,
        'feature_pop_pct': {
            f: round(100 * feat_pop_by_src[cat].get(f, 0) / total, 1)
            for f in key_feats_present
        },
    }

out = {
    'features_in_dataset': len(feat_list),
    'key_features_checked': len(key_feats_present),
    'missing_from_dataset': key_feats_missing,
    'src_total': dict(src_total),
    'coverage_pct': coverage,
}
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
print(f'Wrote {OUT}', flush=True)

# Print headline gap
print('\n=== Feature coverage % (rmwoods/brewersfriend vs aha) ===')
bf = coverage.get('rmwoods_brewersfriend', {}).get('feature_pop_pct', {})
aha = coverage.get('aha', {}).get('feature_pop_pct', {})
byo = coverage.get('byo', {}).get('feature_pop_pct', {})
mmum = coverage.get('mmum', {}).get('feature_pop_pct', {})
braureka = coverage.get('braureka', {}).get('feature_pop_pct', {})
for f in key_feats_present[:35]:
    print(f'  {f:<30} bf={bf.get(f, 0):>5.1f}%  aha={aha.get(f, 0):>5.1f}%  '
          f'byo={byo.get(f, 0):>5.1f}%  mmum={mmum.get(f, 0):>5.1f}%  braureka={braureka.get(f, 0):>5.1f}%')
