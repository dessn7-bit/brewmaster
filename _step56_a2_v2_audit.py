"""Faz A2 v2 — features.og bazlı null audit (raw değil)."""
import json
from collections import Counter, defaultdict

PATH = 'working/_v18_2_dataset.json'
OUT = '_step56_a2_audit_v2.json'

print('Loading...', flush=True)
with open(PATH, 'r', encoding='utf-8') as f:
    d = json.load(f)
recs = d['recipes']
print(f'Total recipes: {len(recs)}', flush=True)


def is_null(v):
    return v is None or v == 0 or v == ''


def get_src(r):
    src = r.get('source', '?')
    if src == 'rmwoods':
        sub = (r.get('raw') or {}).get('origin') or 'rmwoods?'
        return f'rmwoods/{sub}' if sub != 'rmwoods?' else 'rmwoods'
    return src


slug_stats = defaultdict(lambda: {
    'total': 0,
    'feat_og_null': 0, 'feat_ibu_null': 0, 'feat_srm_null': 0,
    'feat_fully_null': 0,  # all 3 metrics null in features
    'raw_og_null_but_feat_ok': 0,  # the "false positive" count
    'sources': Counter(),
    'truly_null_samples': [],
})

for r in recs:
    slug = r.get('bjcp_slug')
    if not slug:
        continue
    raw = r.get('raw') or {}
    feat = r.get('features') or {}
    src = get_src(r)
    s = slug_stats[slug]
    s['total'] += 1
    s['sources'][src] += 1

    raw_og = raw.get('og'); feat_og = feat.get('og')
    feat_ibu = feat.get('ibu'); feat_srm = feat.get('srm')

    if is_null(feat_og): s['feat_og_null'] += 1
    if is_null(feat_ibu): s['feat_ibu_null'] += 1
    if is_null(feat_srm): s['feat_srm_null'] += 1
    if is_null(feat_og) and is_null(feat_ibu) and is_null(feat_srm):
        s['feat_fully_null'] += 1
        if len(s['truly_null_samples']) < 5:
            s['truly_null_samples'].append({
                'id': r.get('id'),
                'name': r.get('name', '')[:60],
                'source': src,
                'sorte_raw': r.get('sorte_raw', '')[:50],
                'feat_count': sum(1 for v in feat.values() if v),
            })
    if is_null(raw_og) and not is_null(feat_og):
        s['raw_og_null_but_feat_ok'] += 1


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
    'south_german_weizenbock', 'smoked_beer', 'export_stout',
    'pre_prohibition_lager', 'german_schwarzbier', 'munich_helles',
    'german_doppelbock', 'german_heller_bock_maibock',
    'british_barley_wine_ale', 'specialty_saison',
]

audit = {}
for slug in TARGETS:
    s = slug_stats.get(slug)
    if not s:
        audit[slug] = {'note': 'NOT IN DATASET'}
        continue
    n = s['total']
    audit[slug] = {
        'total': n,
        'feat_og_null_pct': round(100 * s['feat_og_null'] / n, 1),
        'feat_ibu_null_pct': round(100 * s['feat_ibu_null'] / n, 1),
        'feat_srm_null_pct': round(100 * s['feat_srm_null'] / n, 1),
        'feat_fully_null_count': s['feat_fully_null'],
        'feat_fully_null_pct': round(100 * s['feat_fully_null'] / n, 1),
        'raw_null_but_feat_ok': s['raw_og_null_but_feat_ok'],
        'sources_top5': dict(s['sources'].most_common(5)),
        'truly_null_samples': s['truly_null_samples'],
    }

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(audit, f, indent=2, ensure_ascii=False)
print(f'Wrote {OUT}', flush=True)

# Globally truly-null
total_truly_null = sum(s['feat_fully_null'] for s in slug_stats.values())
total_recs = sum(s['total'] for s in slug_stats.values())
total_raw_null_feat_ok = sum(s['raw_og_null_but_feat_ok'] for s in slug_stats.values())
print(f'\nGlobal: total={total_recs}, truly_null(features.og missing)={total_truly_null} '
      f'({100*total_truly_null/total_recs:.1f}%), raw_null_but_feat_ok={total_raw_null_feat_ok}')

print('\nPer-target slug truly-null %:')
for slug in TARGETS:
    a = audit.get(slug, {})
    if 'total' in a:
        print(f'  {slug:<40} n={a["total"]:>5d}  feat_og_null={a["feat_og_null_pct"]:>5.1f}%  '
              f'truly_null={a["feat_fully_null_pct"]:>5.1f}%')
