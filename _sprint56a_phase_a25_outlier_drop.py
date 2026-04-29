"""Sprint 56a Faz A2.5 — Outlier reject (KURAL 1 trigger sonrası).

V18.3 dataset rebuild sonrası std 8× büyüdü (OG std 0.022 → 0.180).
Sebep: ~3K parse-hatalı reçete dedupe recovery ile geldi (OG 111, IBU 43372 gibi).
V18.2 dedupe agresifti, bunları default-name'lere bastırıp dropped'tı; Plan C recovery ile geri geldi.

Drop kuralları (BJCP üst sınır + safety margin):
- OG < 1.020 or > 1.150
- FG < 0.990 or > 1.060
- IBU > 200 (BJCP max 120)
- SRM > 100 (BJCP max 50)
- ABV < 0.5 or > 20

Output: working/_v18_3_dataset_clean.json
"""
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


print('Loading V18.3 dirty...', flush=True)
with open('working/_v18_3_dataset.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
recs = data['recipes']
print(f'Input: {len(recs)} recipes', flush=True)

drop_count = 0
drop_reasons = Counter()
drop_samples = []
clean_recs = []

for r in recs:
    og = get_metric(r, 'og')
    fg = get_metric(r, 'fg')
    ibu = get_metric(r, 'ibu')
    srm = get_metric(r, 'srm')
    abv = get_metric(r, 'abv')

    drop = False
    reasons = []
    if og is not None and (og < 1.020 or og > 1.150):
        drop = True
        reasons.append(f'OG={og}')
    if fg is not None and (fg < 0.990 or fg > 1.060):
        drop = True
        reasons.append(f'FG={fg}')
    if ibu is not None and ibu > 200:
        drop = True
        reasons.append(f'IBU={ibu}')
    if srm is not None and srm > 100:
        drop = True
        reasons.append(f'SRM={srm}')
    if abv is not None and (abv < 0.5 or abv > 20):
        drop = True
        reasons.append(f'ABV={abv}')

    if drop:
        drop_count += 1
        for reason in reasons:
            drop_reasons[reason.split('=')[0]] += 1
        if len(drop_samples) < 30:
            drop_samples.append({
                'id': r.get('id'), 'name': r.get('name', '')[:50],
                'slug': r.get('bjcp_slug'),
                'og': og, 'fg': fg, 'ibu': ibu, 'srm': srm, 'abv': abv,
                'reasons': reasons,
            })
    else:
        clean_recs.append(r)

print(f'Dropped: {drop_count} ({100*drop_count/len(recs):.2f}%)')
print(f'Clean: {len(clean_recs)}')
print(f'\nDrop reason breakdown:')
for reason, cnt in drop_reasons.most_common():
    print(f'  {reason}: {cnt}')


# Re-stat
print(f'\n=== V18.3 clean metric distributions ===')
metrics = {'og': [], 'fg': [], 'ibu': [], 'srm': [], 'abv': []}
for r in clean_recs:
    for k in metrics:
        v = get_metric(r, k)
        if v is not None:
            metrics[k].append(v)

for k, vs in metrics.items():
    n = len(vs)
    mean = sum(vs) / n if n else 0
    std = math.sqrt(sum((v-mean)**2 for v in vs)/n) if n else 0
    sorted_v = sorted(vs)
    p5 = sorted_v[int(n*0.05)] if n else 0
    p50 = sorted_v[int(n*0.50)] if n else 0
    p95 = sorted_v[int(n*0.95)] if n else 0
    print(f'{k.upper():>4}: n={n:>6d}  mean={mean:.4f}  std={std:.4f}  '
          f'p5={p5:.4f}  p50={p50:.4f}  p95={p95:.4f}  '
          f'min={sorted_v[0]:.4f}  max={sorted_v[-1]:.4f}')


# Slug count after clean
slug_counter = Counter(r.get('bjcp_slug') for r in clean_recs if r.get('bjcp_slug'))
WEAK_SLUGS = [
    'belgian_ipa', 'rye_ipa', 'white_ipa', 'red_ipa',
    'gose', 'belgian_gueuze', 'belgian_quadrupel',
    'brett_beer', 'mixed_fermentation_sour_beer',
    'dunkles_bock', 'kellerbier', 'german_oktoberfest_festbier',
    'english_pale_ale', 'special_bitter_or_best_bitter',
    'blonde_ale', 'belgian_strong_dark_ale', 'belgian_tripel',
    'flanders_red_ale', 'export_stout', 'specialty_saison',
]
print(f'\n=== Weak slug counts after outlier drop ===')
for s in WEAK_SLUGS:
    print(f'  {s:<40} {slug_counter.get(s, 0)}')

print(f'\n=== Sample dropped (top 15) ===')
for s in drop_samples[:15]:
    print(f'  {s["id"]:<25} slug={s["slug"]:<30} reasons={",".join(s["reasons"][:2])}')


# Save clean
data['recipes'] = clean_recs
data['meta']['count'] = len(clean_recs)
data['meta']['outliers_dropped'] = drop_count
data['meta']['version'] = 'V18.3-clean'

print(f'\nWriting _v18_3_dataset_clean.json...', flush=True)
with open('working/_v18_3_dataset_clean.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False)
import os
sz = os.path.getsize('working/_v18_3_dataset_clean.json') / (1024*1024)
print(f'Saved {len(clean_recs)} recipes, {sz:.0f} MB')


# Save audit
audit = {
    'input': len(recs),
    'output': len(clean_recs),
    'dropped': drop_count,
    'drop_pct': round(100*drop_count/len(recs), 3),
    'drop_reasons': dict(drop_reasons.most_common()),
    'samples': drop_samples,
}
with open('_sprint56a_a25_outlier_audit.json', 'w', encoding='utf-8') as f:
    json.dump(audit, f, indent=2, ensure_ascii=False)
print(f'Wrote _sprint56a_a25_outlier_audit.json')
