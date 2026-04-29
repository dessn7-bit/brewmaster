"""Sprint 56a sanity check (KURAL 1) — V18.3 dataset distribution + plausibility."""
import json
import math
import sys
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8')


def safe_float(v):
    if v is None or v == '':
        return None
    try:
        x = float(v)
        if math.isnan(x):
            return None
        return x
    except (TypeError, ValueError):
        return None


def get_metric(r, key):
    feat = r.get('features') or {}
    raw = r.get('raw') or {}
    return safe_float(feat.get(key)) or safe_float(raw.get(key))


def stats(values):
    if not values:
        return {'n': 0}
    n = len(values)
    mean = sum(values) / n
    var = sum((v - mean) ** 2 for v in values) / n
    std = math.sqrt(var)
    sorted_v = sorted(values)
    return {
        'n': n,
        'mean': round(mean, 4),
        'std': round(std, 4),
        'min': round(sorted_v[0], 4),
        'p5': round(sorted_v[int(n * 0.05)], 4),
        'p25': round(sorted_v[int(n * 0.25)], 4),
        'p50': round(sorted_v[int(n * 0.50)], 4),
        'p75': round(sorted_v[int(n * 0.75)], 4),
        'p95': round(sorted_v[int(n * 0.95)], 4),
        'max': round(sorted_v[-1], 4),
    }


print('Loading V18.3...', flush=True)
with open('working/_v18_3_dataset.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
recs = data['recipes']
print(f'Total: {len(recs)} recipes', flush=True)

# Collect metrics
metrics = {'og': [], 'fg': [], 'ibu': [], 'srm': [], 'abv': []}
for r in recs:
    for k in metrics:
        v = get_metric(r, k)
        if v is not None:
            metrics[k].append(v)

print('\n=== Metric distributions ===')
for k, vs in metrics.items():
    s = stats(vs)
    print(f'{k.upper():>4}: n={s["n"]:>6d}  mean={s["mean"]:.4f}  std={s["std"]:.4f}  '
          f'p5={s["p5"]:.4f}  p50={s["p50"]:.4f}  p95={s["p95"]:.4f}  '
          f'min={s["min"]:.4f}  max={s["max"]:.4f}')

# BJCP plausibility checks
print('\n=== BJCP plausibility (outlier flag) ===')
og_outlier = sum(1 for v in metrics['og'] if v < 1.020 or v > 1.150)
fg_outlier = sum(1 for v in metrics['fg'] if v < 0.990 or v > 1.060)
ibu_outlier = sum(1 for v in metrics['ibu'] if v > 200)
srm_outlier = sum(1 for v in metrics['srm'] if v > 100)
abv_outlier = sum(1 for v in metrics['abv'] if v < 0.5 or v > 20)
print(f'OG outliers (<1.020 or >1.150): {og_outlier} ({100*og_outlier/len(metrics["og"]):.2f}%)')
print(f'FG outliers (<0.990 or >1.060): {fg_outlier} ({100*fg_outlier/len(metrics["fg"]):.2f}%)')
print(f'IBU outliers (>200): {ibu_outlier} ({100*ibu_outlier/len(metrics["ibu"]):.2f}%)')
print(f'SRM outliers (>100): {srm_outlier} ({100*srm_outlier/len(metrics["srm"]):.2f}%)')
print(f'ABV outliers (<0.5 or >20): {abv_outlier} ({100*abv_outlier/len(metrics["abv"]):.2f}%)')

# Compare with V18.2 stats (KURAL 1 reference)
print('\n=== V18.2 reference (from previous metrics file) ===')
# V18.2 dataset for comparison
print('Loading V18.2 for comparison...', flush=True)
with open('working/_v18_2_dataset.json', 'r', encoding='utf-8') as f:
    v18_2 = json.load(f)
v18_2_recs = v18_2['recipes']
v18_2_metrics = {'og': [], 'fg': [], 'ibu': [], 'srm': [], 'abv': []}
for r in v18_2_recs:
    for k in v18_2_metrics:
        v = get_metric(r, k)
        if v is not None:
            v18_2_metrics[k].append(v)

print(f'\n{"":4} {"V18.2 mean":>12} {"V18.2 std":>11} {"V18.3 mean":>12} {"V18.3 std":>11} {"Δmean":>8} {"Δstd%":>7}')
for k in ['og', 'fg', 'ibu', 'srm', 'abv']:
    v2_mean = sum(v18_2_metrics[k]) / len(v18_2_metrics[k]) if v18_2_metrics[k] else 0
    v2_std = math.sqrt(sum((v - v2_mean)**2 for v in v18_2_metrics[k]) / len(v18_2_metrics[k])) if v18_2_metrics[k] else 0
    v3_mean = sum(metrics[k]) / len(metrics[k]) if metrics[k] else 0
    v3_std = math.sqrt(sum((v - v3_mean)**2 for v in metrics[k]) / len(metrics[k])) if metrics[k] else 0
    delta_mean = v3_mean - v2_mean
    delta_std_pct = 100 * (v3_std - v2_std) / v2_std if v2_std else 0
    print(f'{k.upper():>4} {v2_mean:>12.4f} {v2_std:>11.4f} {v3_mean:>12.4f} {v3_std:>11.4f} '
          f'{delta_mean:>+8.4f} {delta_std_pct:>+7.2f}%')

# Slug count comparison
print('\n=== Slug count comparison (top 30) ===')
v18_3_slugs = Counter(r.get('bjcp_slug') for r in recs if r.get('bjcp_slug'))
v18_2_slugs = Counter(r.get('bjcp_slug') for r in v18_2_recs if r.get('bjcp_slug'))
print(f'{"slug":<40} {"V18.2":>8} {"V18.3":>8} {"Δ":>8}  {"%change":>8}')
for s, c3 in v18_3_slugs.most_common(30):
    c2 = v18_2_slugs.get(s, 0)
    delta = c3 - c2
    pct = (100 * delta / c2) if c2 else 0
    print(f'{s:<40} {c2:>8d} {c3:>8d} {delta:>+8d}  {pct:>+7.1f}%')

print('\n=== Cluster distribution ===')
SLUG_TO_CLUSTER = {
    'belgian_lambic': 'sour', 'oud_bruin': 'sour', 'berliner_weisse': 'sour',
    'mixed_fermentation_sour_beer': 'sour', 'brett_beer': 'sour',
    'flanders_red_ale': 'sour', 'belgian_gueuze': 'sour', 'belgian_fruit_lambic': 'sour', 'gose': 'sour',
    'fruit_beer': 'specialty', 'herb_and_spice_beer': 'specialty',
    'winter_seasonal_beer': 'specialty', 'smoked_beer': 'specialty',
    'specialty_beer': 'specialty', 'experimental_beer': 'specialty',
    'american_india_pale_ale': 'ipa', 'double_ipa': 'ipa', 'black_ipa': 'ipa',
    'juicy_or_hazy_india_pale_ale': 'ipa', 'british_india_pale_ale': 'ipa',
    'red_ipa': 'ipa', 'white_ipa': 'ipa', 'rye_ipa': 'ipa',
    'irish_dry_stout': 'stout', 'sweet_stout': 'stout', 'sweet_stout_or_cream_stout': 'stout',
    'oatmeal_stout': 'stout', 'stout': 'stout', 'american_imperial_stout': 'stout', 'export_stout': 'stout',
    'brown_porter': 'porter', 'robust_porter': 'porter', 'baltic_porter': 'porter', 'porter': 'porter',
    'american_pale_ale': 'pale_ale', 'english_pale_ale': 'pale_ale',
    'american_amber_red_ale': 'pale_ale', 'american_strong_pale_ale': 'pale_ale',
    'belgian_witbier': 'belgian', 'belgian_blonde_ale': 'belgian', 'belgian_dubbel': 'belgian',
    'belgian_tripel': 'belgian', 'belgian_strong_dark_ale': 'belgian',
    'belgian_strong_golden': 'belgian', 'belgian_quadrupel': 'belgian', 'belgian_ipa': 'belgian',
    'french_belgian_saison': 'saison', 'specialty_saison': 'saison', 'french_biere_de_garde': 'saison',
    'south_german_hefeweizen': 'wheat', 'south_german_dunkel_weizen': 'wheat',
    'south_german_weizenbock': 'wheat', 'american_wheat_ale': 'wheat', 'german_rye_ale': 'wheat',
    'american_lager': 'lager', 'german_pilsener': 'lager', 'pale_lager': 'lager',
    'pre_prohibition_lager': 'lager', 'munich_helles': 'lager', 'munich_dunkel': 'lager',
    'vienna_lager': 'lager', 'german_maerzen': 'lager', 'german_oktoberfest_festbier': 'lager',
    'german_schwarzbier': 'lager', 'dortmunder_european_export': 'lager', 'kellerbier': 'lager',
    'bamberg_maerzen_rauchbier': 'lager',
    'german_bock': 'bock', 'german_doppelbock': 'bock', 'german_heller_bock_maibock': 'bock',
    'dunkles_bock': 'bock',
    'american_brown_ale': 'brown', 'brown_ale': 'brown',
    'american_cream_ale': 'cream', 'cream_ale': 'cream', 'common_beer': 'cream',
    'german_koelsch': 'cream', 'german_altbier': 'cream',
    'mild': 'mild', 'irish_red_ale': 'mild',
    'blonde_ale': 'cream', 'golden_or_blonde_ale': 'cream',
    'ordinary_bitter': 'bitter', 'special_bitter_or_best_bitter': 'bitter',
    'extra_special_bitter': 'bitter', 'scottish_export': 'bitter', 'scotch_ale_or_wee_heavy': 'bitter',
    'old_ale': 'bitter',
    'american_barley_wine_ale': 'barleywine', 'american_barleywine': 'barleywine',
    'british_barley_wine_ale': 'barleywine',
}
v3_clusters = Counter(SLUG_TO_CLUSTER.get(s, 'other') for s in
                      [r.get('bjcp_slug') for r in recs if r.get('bjcp_slug')])
v2_clusters = Counter(SLUG_TO_CLUSTER.get(s, 'other') for s in
                      [r.get('bjcp_slug') for r in v18_2_recs if r.get('bjcp_slug')])
for c, n3 in v3_clusters.most_common():
    n2 = v2_clusters.get(c, 0)
    delta = n3 - n2
    pct = (100 * delta / n2) if n2 else 0
    print(f'  {c:<15} V18.2={n2:>7d}  V18.3={n3:>7d}  Δ={delta:>+7d} ({pct:>+5.1f}%)')

print('\n[DONE]')
