"""Adım 60a — 38 train-dışı slug için mapping audit (sample dump + alias merge önerisi)."""
import json, sys, math
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding='utf-8')


def safe_float(v):
    if v is None or v == '': return None
    try:
        x = float(v)
        if math.isnan(x): return None
        return x
    except (TypeError, ValueError):
        return None


def get_metric(r, key):
    feat = r.get('features') or {}
    raw = r.get('raw') or {}
    return safe_float(feat.get(key)) or safe_float(raw.get(key))


print('[1] Loading V19 dataset...', flush=True)
with open('working/_v19_dataset.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
recs = data['recipes']
print(f'  V19: {len(recs)} recipes', flush=True)


# 38 train-dışı slug
TARGET_SLUGS = [
    # n=1 (12)
    'juicy_or_hazy_double_india_pale_ale', 'smoke_porter', 'pumpkin_spice_beer',
    'english_brown_ale', 'chocolate_or_cocoa_beer', 'strong_scotch_ale',
    'gluten_free_beer', 'foreign_extra_stout', 'scottish_heavy',
    'piwo_grodziskie', 'historical_beer', 'international_pale_lager',
    # n=2 (8)
    'west_coast_india_pale_ale', 'pumpkin_squash_beer', 'american_fruited_sour_ale',
    'tropical_stout', 'finnish_sahti', 'cream_ale', 'czech_amber_lager', 'new_zealand_pilsner',
    # n=3 (6)
    'franconian_rotbier', 'australian_pale_ale', 'specialty_honey_beer',
    'american_light_lager', 'brut_ipa',
    # n=4-9 (12)
    'imperial_red_ale', 'coffee_beer', 'specialty_historical', 'german_eisbock',
    'belgian_session_ale', 'german_leichtbier', 'session_india_pale_ale', 'dark_lager',
    'other_belgian_ale', 'strong_bitter', 'fruit_wheat_beer', 'american_wild_ale',
    'strong_ale',
]


# Group recipes by slug
recs_by_slug = defaultdict(list)
for r in recs:
    s = r.get('bjcp_slug')
    if s in TARGET_SLUGS:
        recs_by_slug[s].append(r)


# Sample dump per slug
print('\n[2] Sample dump per slug:', flush=True)
all_samples = {}
for slug in TARGET_SLUGS:
    sub = recs_by_slug.get(slug, [])
    print(f'\n  === {slug} (n={len(sub)}) ===', flush=True)
    samples = []
    for r in sub:
        rid = r.get('id', '?')
        name = (r.get('name') or '')[:50]
        sorte = (r.get('sorte_raw') or '')[:50]
        og = get_metric(r, 'og')
        ibu = get_metric(r, 'ibu')
        srm = get_metric(r, 'srm')
        abv = get_metric(r, 'abv')
        src = r.get('source', '?')
        if src == 'rmwoods':
            sub_origin = (r.get('raw') or {}).get('origin') or '?'
            src = f'rmwoods/{sub_origin}'
        sample = {
            'id': rid, 'name': name, 'src': src, 'sorte_raw': sorte,
            'og': og, 'ibu': ibu, 'srm': srm, 'abv': abv,
        }
        samples.append(sample)
        og_str = f'{og:.3f}' if og else '-'
        ibu_str = f'{ibu:.0f}' if ibu else '-'
        srm_str = f'{srm:.1f}' if srm else '-'
        abv_str = f'{abv:.1f}' if abv else '-'
        print(f'    {rid:<35} src={src:<22} OG={og_str:<6} IBU={ibu_str:<5} SRM={srm_str:<5} ABV={abv_str:<4} sorte={sorte}', flush=True)
        if name:
            print(f'      name="{name}"', flush=True)
    all_samples[slug] = {'count': len(sub), 'samples': samples}


with open('_step60a_mapping_audit_data.json', 'w', encoding='utf-8') as f:
    json.dump(all_samples, f, indent=2, ensure_ascii=False)
print('\n[DONE] _step60a_mapping_audit_data.json yazıldı', flush=True)
