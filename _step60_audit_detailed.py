"""Adım 60 detaylı audit — Rapor 1 (V6 subset analiz) + Rapor 2 (V19 lowest slugs)."""
import json, sys
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8')


# ==================== Load all datasets ====================
print('[Loading V19 dataset...]', flush=True)
with open('working/_v19_dataset.json', 'r', encoding='utf-8') as f:
    v19 = json.load(f)
v19_recs = v19['recipes']
v19_slugs = Counter(r['bjcp_slug'] for r in v19_recs if r.get('bjcp_slug'))
print(f'  V19: {len(v19_recs)} recipes, {len(v19_slugs)} unique slugs', flush=True)

print('[Loading V19 V6 subset...]', flush=True)
with open('working/_v19_v6_subset.json', 'r', encoding='utf-8') as f:
    v6 = json.load(f)
v6_recs = v6['recipes']
v6_slugs = Counter(r['bjcp_slug'] for r in v6_recs if r.get('bjcp_slug'))
v6_features = v6['meta']['feature_list']
v6_meta = v6.get('meta', {})
print(f'  V6 subset: {len(v6_recs)} recipes, full feature_list len={len(v6_features)}', flush=True)

print('[Loading V18.2 dataset (archived)...]', flush=True)
with open('working/archive/v18_2/_v18_2_dataset.json', 'r', encoding='utf-8') as f:
    v18_2 = json.load(f)
v18_2_slugs = Counter(r['bjcp_slug'] for r in v18_2['recipes'] if r.get('bjcp_slug'))
print(f'  V18.2: {len(v18_2["recipes"])} recipes, {len(v18_2_slugs)} slugs', flush=True)
del v18_2

print('[Loading V18.3 dataset (archived)...]', flush=True)
with open('working/archive/v18_3/_v18_3_dataset_clean.json', 'r', encoding='utf-8') as f:
    v18_3 = json.load(f)
v18_3_slugs = Counter(r['bjcp_slug'] for r in v18_3['recipes'] if r.get('bjcp_slug'))
print(f'  V18.3: {len(v18_3["recipes"])} recipes, {len(v18_3_slugs)} slugs', flush=True)
del v18_3


# ==================== Tier classification (DOĞRU sınırlar from _v19_v6_retrain.py) ====================
# def tier_of(n):
#     if n >= 5000: return 1
#     if n >= 1000: return 2
#     if n >= 200:  return 3
#     return 4
def tier_of(n):
    if n >= 5000: return 1
    if n >= 1000: return 2
    if n >= 200:  return 3
    return 4

SOUR_SLUGS = {'belgian_lambic', 'berliner_weisse', 'flanders_red_ale', 'oud_bruin',
              'belgian_fruit_lambic', 'belgian_gueuze', 'mixed_fermentation_sour_beer',
              'gose', 'brett_beer'}

# TARGET dict (from _v19_v6_retrain.py)
TARGET = {
    (1, False): 100, (2, False):  80, (3, False):  80, (4, False): 9999,
    (1, True):  500, (2, True):  500, (3, True):  500, (4, True):  9999,
}


# ==================== RAPOR 1 — V6 subset analiz ====================
print('\n\n================ RAPOR 1 — V6 SUBSET ================')

# A. Boyut
print(f'\nA. Dataset boyutu:')
print(f'  Toplam reçete: {len(v6_recs)}')
print(f'  Feature list (full): {len(v6_features)}')
print(f'  V6 inline compact features: 56 (ayrı liste in _v19_v6_retrain.py)')
print(f'  Sour ratio meta: {v6_meta.get("sour_ratio", "?")}')

# B. Tier mantığı
print(f'\nB. Tier sınırları (kod: _v19_v6_retrain.py):')
print('  def tier_of(n):')
print('      if n >= 5000: return 1   # Tier 1 (en büyük)')
print('      if n >= 1000: return 2   # Tier 2')
print('      if n >= 200:  return 3   # Tier 3')
print('      return 4                  # Tier 4 (en küçük, ≤199)')
print(f'\n  TARGET dict (slug başına alınan reçete sayısı):')
print(f'    (Tier 1, non-sour): 100')
print(f'    (Tier 2, non-sour): 80')
print(f'    (Tier 3, non-sour): 80')
print(f'    (Tier 4, non-sour): 9999 (= hepsi, slug ≥10 filter sonrası)')
print(f'    (Tier 1, sour):     500')
print(f'    (Tier 2, sour):     500')
print(f'    (Tier 3, sour):     500')
print(f'    (Tier 4, sour):     9999 (= hepsi)')

# C. Sour overrepresent
print(f'\nC. Sour overrepresent breakdown:')
print(f'  V19 dataset sour total: {sum(v19_slugs.get(s, 0) for s in SOUR_SLUGS)} ({100*sum(v19_slugs.get(s, 0) for s in SOUR_SLUGS)/len(v19_recs):.2f}% of {len(v19_recs)})')
print(f'  V6 subset sour total: {sum(v6_slugs.get(s, 0) for s in SOUR_SLUGS)} ({100*sum(v6_slugs.get(s, 0) for s in SOUR_SLUGS)/len(v6_recs):.2f}% of {len(v6_recs)})')
v19_sour_pct = 100*sum(v19_slugs.get(s, 0) for s in SOUR_SLUGS)/len(v19_recs)
v6_sour_pct = 100*sum(v6_slugs.get(s, 0) for s in SOUR_SLUGS)/len(v6_recs)
print(f'  Multiplier: V6 sour% / V19 sour% = {v6_sour_pct/v19_sour_pct:.1f}×')

print(f'\n  Per-sour-slug breakdown:')
print(f'  {"slug":<35} {"V19 n":>7} {"V19 %":>7} {"V6 n":>6} {"V6 %":>7} {"× boost":>8}')
for s in SOUR_SLUGS:
    v19_n = v19_slugs.get(s, 0)
    v6_n = v6_slugs.get(s, 0)
    v19_pct = 100 * v19_n / len(v19_recs)
    v6_pct = 100 * v6_n / len(v6_recs)
    boost = v6_pct / v19_pct if v19_pct > 0 else float('inf')
    tier = tier_of(v19_n)
    print(f'  {s:<35} {v19_n:>7d} {v19_pct:>6.2f}% {v6_n:>6d} {v6_pct:>6.2f}% {boost:>7.1f}× T{tier}')

# D. Slug-by-slug — TÜM SLUG (V19 sırası en çok → en az)
print(f'\nD. Slug-by-slug breakdown (TÜM slug, V19 büyükten küçüğe):')
print(f'  {"#":>3} {"slug":<40} {"V19 n":>7} {"V6 n":>6} {"V6 %":>6} {"tier":>4} {"sour":>5}')
slug_size_buckets = {'≥100': 0, '50-99': 0, '10-49': 0, '<10': 0}
for i, (s, v19_n) in enumerate(v19_slugs.most_common(), 1):
    v6_n = v6_slugs.get(s, 0)
    v6_pct = 100 * v6_n / max(1, v19_n)
    tier = tier_of(v19_n)
    is_sour = 'SOUR' if s in SOUR_SLUGS else ''
    print(f'  {i:>3d} {s:<40} {v19_n:>7d} {v6_n:>6d} {v6_pct:>5.1f}% T{tier} {is_sour}')
    if v6_n >= 100: slug_size_buckets['≥100'] += 1
    elif v6_n >= 50: slug_size_buckets['50-99'] += 1
    elif v6_n >= 10: slug_size_buckets['10-49'] += 1
    else: slug_size_buckets['<10'] += 1

print(f'\n  V6 subset slug bucket dağılımı:')
for bucket, count in slug_size_buckets.items():
    print(f'    {bucket:<10} {count} slug')

# Stratified mı sample-based mi
n_at_target_100 = sum(1 for s, n in v6_slugs.items() if n == 100)
n_at_target_80 = sum(1 for s, n in v6_slugs.items() if n == 80)
n_at_target_500 = sum(1 for s, n in v6_slugs.items() if n == 500)
print(f'\n  Sample at target value:')
print(f'    n=100 (Tier 1 non-sour): {n_at_target_100} slug')
print(f'    n=80 (Tier 2/3 non-sour): {n_at_target_80} slug')
print(f'    n=500 (sour Tier 1/2/3): {n_at_target_500} slug')


# ==================== RAPOR 2 — V19 lowest slugs ====================
print('\n\n================ RAPOR 2 — V19 LOWEST SLUGS ================')

# Sıralı tüm slug
sorted_slugs = sorted(v19_slugs.items(), key=lambda x: x[1])

# Cluster mapping (kısaltılmış, V19 train script'inden)
SLUG_TO_CLUSTER = {
    'belgian_lambic': 'sour', 'oud_bruin': 'sour', 'berliner_weisse': 'sour',
    'mixed_fermentation_sour_beer': 'sour', 'brett_beer': 'sour',
    'flanders_red_ale': 'sour', 'belgian_gueuze': 'sour',
    'belgian_fruit_lambic': 'sour', 'gose': 'sour',
    'fruit_beer': 'specialty', 'herb_and_spice_beer': 'specialty',
    'winter_seasonal_beer': 'specialty', 'smoked_beer': 'specialty',
    'specialty_beer': 'specialty', 'experimental_beer': 'specialty',
    'american_india_pale_ale': 'ipa', 'double_ipa': 'ipa', 'black_ipa': 'ipa',
    'juicy_or_hazy_india_pale_ale': 'ipa', 'british_india_pale_ale': 'ipa',
    'red_ipa': 'ipa', 'white_ipa': 'ipa', 'rye_ipa': 'ipa',
    'irish_dry_stout': 'stout', 'sweet_stout': 'stout',
    'oatmeal_stout': 'stout', 'stout': 'stout', 'american_imperial_stout': 'stout',
    'export_stout': 'stout',
    'brown_porter': 'porter', 'robust_porter': 'porter', 'baltic_porter': 'porter', 'porter': 'porter',
    'american_pale_ale': 'pale_ale', 'english_pale_ale': 'pale_ale',
    'american_amber_red_ale': 'pale_ale', 'american_strong_pale_ale': 'pale_ale',
    'belgian_witbier': 'belgian', 'belgian_blonde_ale': 'belgian', 'belgian_dubbel': 'belgian',
    'belgian_tripel': 'belgian', 'belgian_strong_dark_ale': 'belgian',
    'belgian_strong_golden': 'belgian', 'belgian_quadrupel': 'belgian',
    'belgian_ipa': 'belgian',
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
    'american_barley_wine_ale': 'barleywine', 'british_barley_wine_ale': 'barleywine',
}


# En düşük 25 slug
print(f'\nEn düşük 25 V19 slug (V18.2 + V18.3 trend):')
print(f'  {"#":>3} {"slug":<40} {"V19":>5} {"V18.3":>6} {"V18.2":>6} {"cluster":<10} {"tier":>4}')
for i, (s, n) in enumerate(sorted_slugs[:25], 1):
    n_v183 = v18_3_slugs.get(s, 0)
    n_v182 = v18_2_slugs.get(s, 0)
    cluster = SLUG_TO_CLUSTER.get(s, '?')
    tier = tier_of(n)
    print(f'  {i:>3d} {s:<40} {n:>5d} {n_v183:>6d} {n_v182:>6d} {cluster:<10} T{tier}')


# Bucket breakdown
print(f'\nBucket breakdown (V19 reçete sayısına göre):')
b_30 = [s for s, n in sorted_slugs if n <= 30]
b_100 = [s for s, n in sorted_slugs if 30 < n <= 100]
b_250 = [s for s, n in sorted_slugs if 100 < n <= 250]
b_1000 = [s for s, n in sorted_slugs if 250 < n <= 1000]
b_5000 = [s for s, n in sorted_slugs if 1000 < n <= 5000]
b_5000plus = [s for s, n in sorted_slugs if n > 5000]
print(f'  ≤30 (kritik):       {len(b_30)} slug — {b_30}')
print(f'  31-100:             {len(b_100)} slug — {b_100}')
print(f'  101-250:            {len(b_250)} slug — {b_250}')
print(f'  251-1000:           {len(b_1000)} slug')
print(f'  1001-5000:          {len(b_5000)} slug')
print(f'  >5000:              {len(b_5000plus)} slug')


# Save data
audit = {
    'rapor_1_v6_subset': {
        'total_recipes': len(v6_recs),
        'feature_list_full_len': len(v6_features),
        'sour_v19_pct': round(v19_sour_pct, 2),
        'sour_v6_pct': round(v6_sour_pct, 2),
        'sour_multiplier': round(v6_sour_pct / v19_sour_pct, 2),
        'sour_per_slug': {
            s: {
                'v19_n': v19_slugs.get(s, 0), 'v6_n': v6_slugs.get(s, 0),
                'v19_pct': round(100 * v19_slugs.get(s, 0) / len(v19_recs), 3),
                'v6_pct': round(100 * v6_slugs.get(s, 0) / len(v6_recs), 3),
                'tier': tier_of(v19_slugs.get(s, 0)),
            } for s in SOUR_SLUGS
        },
        'slug_size_buckets': slug_size_buckets,
        'all_slugs': [
            {'slug': s, 'v19_n': v19_slugs.get(s, 0), 'v6_n': v6_slugs.get(s, 0),
             'v6_pct': round(100 * v6_slugs.get(s, 0) / max(1, v19_slugs.get(s, 0)), 1),
             'tier': tier_of(v19_slugs.get(s, 0)), 'is_sour': s in SOUR_SLUGS}
            for s, _ in v19_slugs.most_common()
        ],
    },
    'rapor_2_v19_lowest': {
        'sorted_lowest_25': [
            {'rank': i, 'slug': s, 'v19_n': n,
             'v18_3_n': v18_3_slugs.get(s, 0), 'v18_2_n': v18_2_slugs.get(s, 0),
             'cluster': SLUG_TO_CLUSTER.get(s, '?'), 'tier': tier_of(n)}
            for i, (s, n) in enumerate(sorted_slugs[:25], 1)
        ],
        'bucket_30': b_30, 'bucket_31_100': b_100, 'bucket_101_250': b_250,
        'bucket_251_1000_count': len(b_1000), 'bucket_1001_5000_count': len(b_5000),
        'bucket_5000plus_count': len(b_5000plus),
    },
}
with open('_step60_audit_detailed_data.json', 'w', encoding='utf-8') as f:
    json.dump(audit, f, indent=2, ensure_ascii=False)
print(f'\n[DONE] _step60_audit_detailed_data.json yazıldı')
