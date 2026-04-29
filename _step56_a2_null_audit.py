"""Faz A2 null-metric audit — V18.2 dataset full scan.

Outputs:
- Per-slug null rate (OG/FG/IBU/SRM/ABV)
- Per-source null rate per slug
- Fully-null recipe count per slug
- Metric-rich source counts per slug
- Sample 50 fully-null recipes (feature presence audit)
"""
import json
from collections import Counter, defaultdict

PATH = 'working/_v18_2_dataset.json'
OUT = '_step56_a2_audit_data.json'

print('Loading...', flush=True)
with open(PATH, 'r', encoding='utf-8') as f:
    d = json.load(f)
recs = d['recipes']
feat_list = d['meta'].get('feature_list', [])
print(f'Total recipes: {len(recs)}, features: {len(feat_list)}', flush=True)


def is_null(v):
    return v is None or v == 0 or v == ''


def get_src(r):
    src = r.get('source', '?')
    if src == 'rmwoods':
        sub = (r.get('raw') or {}).get('origin') or 'rmwoods?'
        return f'rmwoods/{sub}' if sub != 'rmwoods?' else 'rmwoods'
    return src


# Per-slug stats
slug_stats = defaultdict(lambda: {
    'total': 0,
    'og_null': 0, 'fg_null': 0, 'ibu_null': 0, 'srm_null': 0, 'abv_null': 0,
    'fully_null': 0,  # all 5 null
    'partial_null': 0,  # at least 1 null
    'metric_rich': 0,  # OG present (key metric)
    'sources': Counter(),
    'sources_metric_rich': Counter(),  # source with non-null OG
})

fully_null_samples = defaultdict(list)  # slug → first 5 fully-null
fully_null_global = []  # 50 globally for feature audit

for r in recs:
    slug = r.get('bjcp_slug')
    if not slug:
        continue
    raw = r.get('raw') or {}
    og = raw.get('og'); fg = raw.get('fg'); ibu = raw.get('ibu')
    srm = raw.get('srm'); abv = raw.get('abv')
    src = get_src(r)
    s = slug_stats[slug]
    s['total'] += 1
    s['sources'][src] += 1
    nulls = sum(1 for v in [og, fg, ibu, srm, abv] if is_null(v))
    if is_null(og): s['og_null'] += 1
    if is_null(fg): s['fg_null'] += 1
    if is_null(ibu): s['ibu_null'] += 1
    if is_null(srm): s['srm_null'] += 1
    if is_null(abv): s['abv_null'] += 1
    if nulls == 5:
        s['fully_null'] += 1
        if len(fully_null_samples[slug]) < 5:
            fully_null_samples[slug].append({
                'id': r.get('id'),
                'name': r.get('name', '')[:60],
                'source': src,
                'sorte_raw': r.get('sorte_raw', '')[:50],
                'feat_nonzero': sum(1 for k in feat_list if (r.get('features') or {}).get(k)),
                'feat_total': len(feat_list),
            })
        if len(fully_null_global) < 50:
            fully_null_global.append({
                'id': r.get('id'),
                'name': r.get('name', '')[:60],
                'slug': slug,
                'source': src,
                'sorte_raw': r.get('sorte_raw', '')[:50],
                'feat_nonzero': sum(1 for k in feat_list if (r.get('features') or {}).get(k)),
                'feat_sample': {k: (r.get('features') or {}).get(k)
                                for k in feat_list[:20] if (r.get('features') or {}).get(k)},
            })
    elif nulls > 0:
        s['partial_null'] += 1
    if not is_null(og):
        s['metric_rich'] += 1
        s['sources_metric_rich'][src] += 1


# Build report data — focus on weak slugs (≤500) + critical
TARGETS = [
    'dunkles_bock', 'brett_beer', 'german_oktoberfest_festbier', 'kellerbier',
    'belgian_quadrupel', 'gose', 'english_pale_ale', 'juicy_or_hazy_india_pale_ale',
    'belgian_ipa', 'rye_ipa', 'golden_or_blonde_ale', 'white_ipa',
    'mixed_fermentation_sour_beer', 'belgian_gueuze', 'red_ipa',
    'black_ipa', 'experimental_beer', 'dortmunder_european_export',
    'bamberg_maerzen_rauchbier', 'belgian_lambic', 'belgian_fruit_lambic',
    'oud_bruin', 'american_strong_pale_ale', 'pale_lager',
    'german_rye_ale', 'german_bock', 'flanders_red_ale',
    'french_biere_de_garde', 'munich_dunkel', 'porter',
    'south_german_weizenbock', 'smoked_beer', 'pre_prohibition_lager',
    'german_schwarzbier', 'german_heller_bock_maibock', 'munich_helles',
    'export_stout', 'german_doppelbock', 'british_barley_wine_ale',
]

# AHA + v15_orig categorized: source name in ['aha', 'recipator', 'braureka', 'mmum',
#   'byo', 'roerstok', 'tmf', 'twortwat', 'amervallei'] = metric-rich (non-rmwoods)
NON_RMWOODS = {'aha', 'recipator', 'braureka', 'mmum', 'byo', 'roerstok',
               'tmf', 'twortwat', 'amervallei'}

audit = {}
for slug in TARGETS:
    s = slug_stats.get(slug)
    if not s:
        audit[slug] = {'note': 'NOT IN DATASET'}
        continue
    n = s['total']
    nonrm = sum(c for src, c in s['sources'].items() if src in NON_RMWOODS or
                (not src.startswith('rmwoods') and src != '?'))
    nonrm_rich = sum(c for src, c in s['sources_metric_rich'].items()
                     if src in NON_RMWOODS or (not src.startswith('rmwoods') and src != '?'))
    bf = s['sources'].get('rmwoods/brewersfriend', 0)
    bt = s['sources'].get('rmwoods/brewtoad', 0)
    audit[slug] = {
        'total': n,
        'rmwoods_brewersfriend': bf,
        'rmwoods_brewersfriend_pct': round(100 * bf / n, 1),
        'rmwoods_brewtoad': bt,
        'rmwoods_brewtoad_pct': round(100 * bt / n, 1),
        'non_rmwoods_total': nonrm,
        'non_rmwoods_pct': round(100 * nonrm / n, 1),
        'non_rmwoods_metric_rich': nonrm_rich,
        'aha': s['sources'].get('aha', 0),
        'byo': s['sources'].get('byo', 0),
        'mmum': s['sources'].get('mmum', 0),
        'braureka': s['sources'].get('braureka', 0),
        'recipator': s['sources'].get('recipator', 0),
        'tmf': s['sources'].get('tmf', 0),
        'twortwat': s['sources'].get('twortwat', 0),
        'roerstok': s['sources'].get('roerstok', 0),
        'amervallei': s['sources'].get('amervallei', 0),
        'og_null_pct': round(100 * s['og_null'] / n, 1),
        'fg_null_pct': round(100 * s['fg_null'] / n, 1),
        'ibu_null_pct': round(100 * s['ibu_null'] / n, 1),
        'srm_null_pct': round(100 * s['srm_null'] / n, 1),
        'abv_null_pct': round(100 * s['abv_null'] / n, 1),
        'fully_null_count': s['fully_null'],
        'fully_null_pct': round(100 * s['fully_null'] / n, 1),
        'metric_rich_count': s['metric_rich'],
        'metric_rich_pct': round(100 * s['metric_rich'] / n, 1),
        'fully_null_samples': fully_null_samples.get(slug, []),
    }

out = {
    'total_recipes': len(recs),
    'total_slugs': len(slug_stats),
    'fully_null_global': fully_null_global,
    'audit': audit,
}
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
print(f'Wrote {OUT}', flush=True)

# Quick summary print
print('\n=== Top 15 slugs by fully-null % (≥30 recipes) ===')
flagged = [(slug, audit[slug]) for slug in TARGETS
           if audit[slug].get('total', 0) >= 30]
flagged.sort(key=lambda kv: -kv[1].get('fully_null_pct', 0))
for slug, a in flagged[:15]:
    print(f'  {slug:<40} n={a["total"]:>5d}  fully_null={a["fully_null_pct"]:>5.1f}%  '
          f'metric_rich={a["metric_rich_pct"]:>5.1f}%  bf%={a["rmwoods_brewersfriend_pct"]:>5.1f}')
