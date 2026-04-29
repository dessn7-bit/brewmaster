"""Adım 60a — V19 dataset'e 36 alias merge + 3 drop uygula.

Apply mantığı:
- Basit alias: 32 slug → mevcut slug (dict lookup)
- Conditional alias: 4 slug (other_belgian_ale, dark_lager, american_wild_ale, german_leichtbier)
- Drop: 1 slug (gluten_free_beer) + 2 reçete (FreiBier ABV 0.5)
- Standalone tut: brut_ipa (3 reçete, train edilemez n<10)

KURAL 5: her alias sonrası slug count diff raporla.
"""
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


# ==================== Alias mapping ====================

# 32 basit alias (one-to-one)
SIMPLE_ALIAS = {
    # IPA
    'west_coast_india_pale_ale': 'american_india_pale_ale',
    'session_india_pale_ale': 'american_india_pale_ale',
    'juicy_or_hazy_double_india_pale_ale': 'double_ipa',
    'imperial_red_ale': 'american_amber_red_ale',
    # Bitter
    'strong_bitter': 'extra_special_bitter',
    'scottish_heavy': 'scottish_export',
    'strong_ale': 'old_ale',
    # Stout/Porter
    'foreign_extra_stout': 'export_stout',
    'tropical_stout': 'export_stout',
    'smoke_porter': 'smoked_beer',
    'coffee_beer': 'specialty_beer',
    # Belgian
    'belgian_session_ale': 'belgian_blonde_ale',
    'strong_scotch_ale': 'scotch_ale_or_wee_heavy',
    # Cream/Brown
    'cream_ale': 'american_cream_ale',
    'english_brown_ale': 'brown_ale',
    # Lager
    'american_light_lager': 'american_lager',
    'international_pale_lager': 'american_lager',
    'czech_amber_lager': 'vienna_lager',
    'franconian_rotbier': 'vienna_lager',
    'new_zealand_pilsner': 'german_pilsener',
    'german_eisbock': 'german_doppelbock',
    # Pale Ale
    'australian_pale_ale': 'american_pale_ale',
    # Sour/Wild
    'american_fruited_sour_ale': 'mixed_fermentation_sour_beer',
    # Wheat
    'fruit_wheat_beer': 'fruit_beer',
    'piwo_grodziskie': 'smoked_beer',
    # Specialty
    'chocolate_or_cocoa_beer': 'specialty_beer',
    'pumpkin_spice_beer': 'specialty_beer',
    'pumpkin_squash_beer': 'specialty_beer',
    'specialty_honey_beer': 'specialty_beer',
    'specialty_historical': 'specialty_beer',
    'historical_beer': 'specialty_beer',
    'finnish_sahti': 'specialty_beer',
}

DROP_SLUGS = {'gluten_free_beer'}  # 1 reçete drop
DROP_RECIPE_IDS = {'braureka_30601', 'braureka_31814'}  # FreiBier alkolsüz (Leichtbier'den)

# 14cat cluster mapping (V19 train script'inden)
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
    'american_cream_ale': 'cream', 'common_beer': 'cream',
    'german_koelsch': 'cream', 'german_altbier': 'cream',
    'mild': 'mild', 'irish_red_ale': 'mild',
    'blonde_ale': 'cream',
    'ordinary_bitter': 'bitter', 'special_bitter_or_best_bitter': 'bitter',
    'extra_special_bitter': 'bitter', 'scottish_export': 'bitter', 'scotch_ale_or_wee_heavy': 'bitter',
    'old_ale': 'bitter',
    'american_barley_wine_ale': 'barleywine', 'british_barley_wine_ale': 'barleywine',
    'brut_ipa': 'ipa',  # Standalone tutulan, 14cat mapping ekle
}


# Conditional alias logic
def alias_other_belgian_ale(r):
    """OG bazlı 3 split."""
    og = get_metric(r, 'og') or 0
    if og >= 1.080:
        return 'belgian_strong_dark_ale'
    elif og >= 1.060:
        return 'belgian_dubbel'
    else:
        return 'belgian_blonde_ale'


def alias_dark_lager(r):
    """SRM bazlı split: ≤15 munich_dunkel, ≥15 schwarzbier (Kupferbier 19.3 dahil)."""
    srm = get_metric(r, 'srm') or 0
    if srm <= 15:
        return 'munich_dunkel'
    else:
        return 'german_schwarzbier'


def alias_american_wild_ale(r):
    """Name-based: Funky → brett_beer, geri kalan → mixed_ferm_sour."""
    name = (r.get('name') or '').lower()
    if 'funky' in name and 'big' in name:  # "Big Funky Beers"
        return 'brett_beer'
    if name == 'funky pale ale recipe':  # "Funky Pale Ale Recipe"
        return 'brett_beer'
    return 'mixed_fermentation_sour_beer'


def alias_german_leichtbier(r):
    """Profile-based: ABV>0.5 → pale_lager. Drop ABV=0.5 reçeteler DROP_RECIPE_IDS'de."""
    abv = get_metric(r, 'abv') or 0
    if abv > 0.5:
        return 'pale_lager'
    return None  # Drop


# ==================== Apply ====================
print('[1] Loading V19 dataset...', flush=True)
with open('working/_v19_dataset.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
recs = data['recipes']
print(f'  V19: {len(recs)} recipes', flush=True)

# Slug counts before
slug_before = Counter(r.get('bjcp_slug') for r in recs if r.get('bjcp_slug'))
print(f'  Slug count before: {len(slug_before)}', flush=True)

new_recs = []
alias_log = Counter()
drop_log = Counter()

for r in recs:
    rid = r.get('id', '')
    slug = r.get('bjcp_slug')

    # Drop checks
    if rid in DROP_RECIPE_IDS:
        drop_log['freibier_alkolsuz'] += 1
        continue
    if slug in DROP_SLUGS:
        drop_log[f'slug:{slug}'] += 1
        continue

    # Conditional alias
    new_slug = None
    if slug == 'other_belgian_ale':
        new_slug = alias_other_belgian_ale(r)
        alias_log[f'other_belgian_ale → {new_slug}'] += 1
    elif slug == 'dark_lager':
        new_slug = alias_dark_lager(r)
        alias_log[f'dark_lager → {new_slug}'] += 1
    elif slug == 'american_wild_ale':
        new_slug = alias_american_wild_ale(r)
        alias_log[f'american_wild_ale → {new_slug}'] += 1
    elif slug == 'german_leichtbier':
        new_slug = alias_german_leichtbier(r)
        if new_slug is None:
            drop_log['leichtbier_alkolsuz_unknown'] += 1
            continue
        alias_log[f'german_leichtbier → {new_slug}'] += 1
    elif slug in SIMPLE_ALIAS:
        new_slug = SIMPLE_ALIAS[slug]
        alias_log[f'{slug} → {new_slug}'] += 1

    if new_slug:
        r['bjcp_slug'] = new_slug
        # 14cat cluster mapping güncelle
        new_cluster = SLUG_TO_CLUSTER.get(new_slug, 'other')
        r['bjcp_main_category'] = new_cluster

    new_recs.append(r)

# Stats
slug_after = Counter(r.get('bjcp_slug') for r in new_recs if r.get('bjcp_slug'))
print(f'\n[2] Apply sonuçları:')
print(f'  Toplam reçete: {len(recs)} → {len(new_recs)} (drop: {len(recs) - len(new_recs)})')
print(f'  Slug count: {len(slug_before)} → {len(slug_after)}')

print(f'\n  Drop log:')
for k, v in drop_log.items():
    print(f'    {k}: {v}', flush=True)

print(f'\n  Alias log (count alias edilen reçete):')
for k, v in sorted(alias_log.items(), key=lambda x: -x[1]):
    print(f'    {k}: {v}', flush=True)

# Train edilebilir slug count
train_slugs = {s for s, c in slug_after.items() if c >= 10}
print(f'\n  Train edilebilir slug (≥10): {len(train_slugs)}')

# En düşük 10 slug
sorted_after = sorted(slug_after.items(), key=lambda x: x[1])
print(f'\n  En düşük 15 slug after alias:')
for s, c in sorted_after[:15]:
    print(f'    {s:<40} {c}', flush=True)


# Per-target slug değişim
print(f'\n[3] Target slug değişimi (alias merge etkisi):')
target_slugs = sorted(set(SIMPLE_ALIAS.values()) | {
    'belgian_blonde_ale', 'belgian_dubbel', 'belgian_strong_dark_ale',
    'munich_dunkel', 'german_schwarzbier',
    'brett_beer', 'mixed_fermentation_sour_beer',
    'pale_lager',
})
print(f'  {"slug":<40} {"before":>7} {"after":>7} {"Δ":>5}')
for s in target_slugs:
    before = slug_before.get(s, 0)
    after = slug_after.get(s, 0)
    delta = after - before
    if delta > 0:
        print(f'  {s:<40} {before:>7d} {after:>7d} +{delta}', flush=True)


# KURAL 1 sanity check
print(f'\n[4] KURAL 1 sanity check:')
metrics_summary = {'og': [], 'fg': [], 'ibu': [], 'srm': [], 'abv': []}
for r in new_recs:
    for k in metrics_summary:
        v = get_metric(r, k)
        if v is not None:
            metrics_summary[k].append(v)
for k, vals in metrics_summary.items():
    n = len(vals)
    mean = sum(vals) / n if n else 0
    var = sum((v-mean)**2 for v in vals) / n if n else 0
    std = var ** 0.5
    print(f'  {k.upper():>4}: n={n:>6d}  mean={mean:.4f}  std={std:.4f}', flush=True)


# Save
data['recipes'] = new_recs
data['meta']['count'] = len(new_recs)
data['meta']['version'] = 'V19-aliased'
data['meta']['alias_merge_applied'] = True
data['meta']['drops'] = dict(drop_log)
data['meta']['aliases'] = dict(alias_log)

print(f'\n[5] Saving working/_v19_aliased_dataset.json...', flush=True)
with open('working/_v19_aliased_dataset.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False)
import os
sz = os.path.getsize('working/_v19_aliased_dataset.json') / (1024*1024)
print(f'  Saved {len(new_recs)} recipes, {sz:.0f} MB', flush=True)


# Audit JSON
audit = {
    'before': {'total': len(recs), 'slug_count': len(slug_before)},
    'after': {'total': len(new_recs), 'slug_count': len(slug_after),
              'train_slugs_ge10': len(train_slugs)},
    'drops': dict(drop_log),
    'aliases': dict(alias_log),
    'lowest_15_after': dict(sorted_after[:15]),
    'sanity_check': {
        k: {'n': len(v), 'mean': round(sum(v)/len(v), 4) if v else 0,
            'std': round((sum((x-sum(v)/len(v))**2 for x in v) / len(v)) ** 0.5, 4) if v else 0}
        for k, v in metrics_summary.items()
    },
}
with open('_step60a_apply_aliases_audit.json', 'w', encoding='utf-8') as f:
    json.dump(audit, f, indent=2, ensure_ascii=False)
print(f'\n[DONE] _step60a_apply_aliases_audit.json yazıldı', flush=True)
