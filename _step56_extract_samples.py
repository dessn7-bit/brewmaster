"""Throwaway: V18.2 dataset slug count + sample recipe dump for Step 56 report."""
import json, sys
from collections import Counter

PATH = 'working/_v18_2_dataset.json'
TARGETS = [
    'dunkles_bock', 'brett_beer', 'german_oktoberfest_festbier', 'kellerbier',
    'belgian_quadrupel', 'gose', 'english_pale_ale', 'juicy_or_hazy_india_pale_ale',
    'belgian_ipa', 'rye_ipa', 'golden_or_blonde_ale', 'white_ipa',
    'mixed_fermentation_sour_beer', 'belgian_gueuze', 'red_ipa',
    'american_barley_wine_ale', 'sweet_stout', 'american_cream_ale',
]
SAMPLES_PER = 8

print('Loading...', flush=True)
with open(PATH, 'r', encoding='utf-8') as f:
    d = json.load(f)
recs = d['recipes']
print(f'Total recipes: {len(recs)}', flush=True)

slug_cnt = Counter()
samples = {s: [] for s in TARGETS}
src_by_slug = {s: Counter() for s in TARGETS}

for r in recs:
    slug = r.get('bjcp_slug')
    if not slug:
        continue
    slug_cnt[slug] += 1
    if slug in samples:
        src = r.get('source', '?')
        # If rmwoods, try to read 'origin' subfield (brewtoad, brewersfriend, etc.)
        if src == 'rmwoods':
            sub = (r.get('raw') or {}).get('origin') or r.get('origin') or 'rmwoods?'
            src = f'rmwoods/{sub}' if sub != 'rmwoods?' else 'rmwoods'
        src_by_slug[slug][src] += 1
        if len(samples[slug]) < SAMPLES_PER:
            raw = r.get('raw') or {}
            samples[slug].append({
                'id': r.get('id'),
                'name': r.get('name', '')[:80],
                'source': src,
                'og': raw.get('og'), 'fg': raw.get('fg'),
                'abv': raw.get('abv'), 'ibu': raw.get('ibu'), 'srm': raw.get('srm'),
                'batch_l': raw.get('batch_size_l'),
                'sorte_raw': r.get('sorte_raw', '')[:60],
            })

out = {
    'total_slugs': len(slug_cnt),
    'top_slugs': slug_cnt.most_common(),
    'targets': {
        s: {
            'count': slug_cnt.get(s, 0),
            'sources': dict(src_by_slug[s].most_common()),
            'samples': samples[s],
        } for s in TARGETS
    },
}
with open('_step56_samples_v18_2.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
print(f'Wrote _step56_samples_v18_2.json — {len(slug_cnt)} unique slugs', flush=True)
print(f'\nTop 10: {slug_cnt.most_common(10)}', flush=True)
print(f'\nTarget counts:', flush=True)
for s in TARGETS:
    print(f'  {s:<40} {slug_cnt.get(s, 0)}  | sources: {dict(src_by_slug[s].most_common(3))}', flush=True)
