"""Adım 60a — KURAL 1 sanity check + STYLE_DEFINITIONS güncelleme."""
import json, sys, math
from collections import Counter

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


# ==================== Load V19-aliased ====================
print('[1] Loading V19-aliased dataset...', flush=True)
with open('working/_v19_aliased_dataset.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
recs = data['recipes']
print(f'  V19-aliased: {len(recs)} recipes', flush=True)


# ==================== KURAL 1 SANITY CHECK ====================
print('\n[2] KURAL 1 sanity check (V19 vs V19-aliased karşılaştırma):', flush=True)

# V19 reference (zaten audit'lerde var, hardcoded V19 değerleri)
V19_BASELINE = {
    'og': {'mean': 1.0591, 'std': 0.0163},
    'fg': {'mean': 1.0142, 'std': 0.0048},
    'ibu': {'mean': 43.65, 'std': 28.22},
    'srm': {'mean': 14.47, 'std': 13.30},
    'abv': {'mean': 5.90, 'std': 1.67},
}

metrics = {'og': [], 'fg': [], 'ibu': [], 'srm': [], 'abv': []}
for r in recs:
    for k in metrics:
        v = get_metric(r, k)
        if v is not None:
            metrics[k].append(v)

print(f'\n  {"metric":<6} {"n":>7} {"V19-aliased":>15} {"V19":>10} {"Δ mean":>9} {"Δ std":>9} {"min":>8} {"max":>8}', flush=True)
sanity_results = {}
for k, vals in metrics.items():
    n = len(vals)
    mean = sum(vals) / n if n else 0
    var = sum((v-mean)**2 for v in vals) / n if n else 0
    std = math.sqrt(var)
    sorted_v = sorted(vals)
    mn = sorted_v[0]; mx = sorted_v[-1]
    v19_mean = V19_BASELINE[k]['mean']
    v19_std = V19_BASELINE[k]['std']
    d_mean = mean - v19_mean
    d_std_pct = 100 * (std - v19_std) / v19_std if v19_std else 0
    print(f'  {k.upper():<6} {n:>7d} mean={mean:.4f} std={std:.4f}  V19=mean={v19_mean:.4f} '
          f'Δmean={d_mean:+.4f} Δstd%={d_std_pct:+.2f}%  min={mn:.4f} max={mx:.4f}', flush=True)
    sanity_results[k] = {
        'n': n, 'mean': round(mean, 4), 'std': round(std, 4),
        'min': round(mn, 4), 'max': round(mx, 4),
        'v19_mean': v19_mean, 'v19_std': v19_std,
        'delta_mean': round(d_mean, 4), 'delta_std_pct': round(d_std_pct, 2),
    }


# Outlier check (KURAL 1 BJCP plausibility)
print(f'\n  Outlier check (BJCP plausibility):', flush=True)
og_outliers = sum(1 for v in metrics['og'] if v < 1.020 or v > 1.150)
fg_outliers = sum(1 for v in metrics['fg'] if v < 0.990 or v > 1.060)
ibu_outliers = sum(1 for v in metrics['ibu'] if v > 200)
srm_outliers = sum(1 for v in metrics['srm'] if v > 100)
abv_outliers = sum(1 for v in metrics['abv'] if v < 0.5 or v > 20)
print(f'    OG outliers (<1.020 or >1.150): {og_outliers}', flush=True)
print(f'    FG outliers (<0.990 or >1.060): {fg_outliers}', flush=True)
print(f'    IBU outliers (>200): {ibu_outliers}', flush=True)
print(f'    SRM outliers (>100): {srm_outliers}', flush=True)
print(f'    ABV outliers (<0.5 or >20): {abv_outliers}', flush=True)

# 10x deviation check
deviations = []
for k, r in sanity_results.items():
    if r['v19_std'] > 0 and r['std'] > 10 * r['v19_std']:
        deviations.append(k)
    elif r['v19_std'] > 0 and r['std'] < r['v19_std'] / 10:
        deviations.append(k)

print(f'\n  KURAL 1 alarm (10× deviation): {deviations if deviations else "YOK ✓ PASS"}', flush=True)


# ==================== ALIAS MAPPING KALICI KAYIT ====================
print('\n[3] Alias mapping kalıcı kayıt (_v19_alias_mapping.json)...', flush=True)

ALIAS_MAPPING = {
    'meta': {
        'created': '2026-04-29',
        'sprint': 'Adim 60a',
        'source_dataset': 'V19',
        'output_dataset': 'V19-aliased',
        'commit_ref': 'fc952aa (Adim 59 sonrasi)',
    },
    'simple_aliases': {
        'west_coast_india_pale_ale': {'target': 'american_india_pale_ale', 'reason': 'BJCP 21A varyant', 'count': 2},
        'session_india_pale_ale': {'target': 'american_india_pale_ale', 'reason': 'düşük ABV AIPA varyantı', 'count': 5},
        'juicy_or_hazy_double_india_pale_ale': {'target': 'double_ipa', 'reason': 'NEIPA+DIPA combo', 'count': 1},
        'imperial_red_ale': {'target': 'american_amber_red_ale', 'reason': 'modern amber-IPA crossover', 'count': 4},
        'strong_bitter': {'target': 'extra_special_bitter', 'reason': 'BJCP 11C ESB profil eşdeğeri', 'count': 6},
        'scottish_heavy': {'target': 'scottish_export', 'reason': 'BJCP 14B varyant', 'count': 1},
        'strong_ale': {'target': 'old_ale', 'reason': 'BJCP 17B Old Ale profil', 'count': 7},
        'foreign_extra_stout': {'target': 'export_stout', 'reason': 'BJCP 16D, mevcut export_stout slug', 'count': 1},
        'tropical_stout': {'target': 'export_stout', 'reason': 'BJCP 16D foreign extra varyantı', 'count': 2},
        'smoke_porter': {'target': 'smoked_beer', 'reason': 'porter+smoke', 'count': 1},
        'coffee_beer': {'target': 'specialty_beer', 'reason': 'specialty cluster, katki_coffee feature mevcut', 'count': 4},
        'belgian_session_ale': {'target': 'belgian_blonde_ale', 'reason': 'düşük ABV Belgian Single', 'count': 4},
        'strong_scotch_ale': {'target': 'scotch_ale_or_wee_heavy', 'reason': 'BJCP 17C', 'count': 1},
        'cream_ale': {'target': 'american_cream_ale', 'reason': 'Adım 54 alias merge devamı', 'count': 2},
        'english_brown_ale': {'target': 'brown_ale', 'reason': 'BJCP 13B', 'count': 1},
        'american_light_lager': {'target': 'american_lager', 'reason': 'düşük alkol American Lager varyantı', 'count': 3},
        'international_pale_lager': {'target': 'american_lager', 'reason': 'generic', 'count': 1},
        'czech_amber_lager': {'target': 'vienna_lager', 'reason': 'BJCP 3A amber-Continental', 'count': 2},
        'franconian_rotbier': {'target': 'vienna_lager', 'reason': 'German amber', 'count': 3},
        'new_zealand_pilsner': {'target': 'german_pilsener', 'reason': 'NZ hop dışı pilsner profili', 'count': 2},
        'german_eisbock': {'target': 'german_doppelbock', 'reason': 'BJCP 9C konsantre doppelbock', 'count': 4},
        'australian_pale_ale': {'target': 'american_pale_ale', 'reason': 'modern APA hop varyantı (Pacific Ale)', 'count': 3},
        'american_fruited_sour_ale': {'target': 'mixed_fermentation_sour_beer', 'reason': 'sour+fruit', 'count': 2},
        'fruit_wheat_beer': {'target': 'fruit_beer', 'reason': 'fruit cluster, katki_fruit feature mevcut', 'count': 7},
        'piwo_grodziskie': {'target': 'smoked_beer', 'reason': 'Polish smoked wheat (BJCP X3)', 'count': 1},
        'chocolate_or_cocoa_beer': {'target': 'specialty_beer', 'reason': 'specialty cluster', 'count': 1},
        'pumpkin_spice_beer': {'target': 'specialty_beer', 'reason': 'katki_pumpkin feature mevcut', 'count': 1},
        'pumpkin_squash_beer': {'target': 'specialty_beer', 'reason': 'katki_pumpkin feature mevcut', 'count': 2},
        'specialty_honey_beer': {'target': 'specialty_beer', 'reason': 'specialty cluster', 'count': 3},
        'specialty_historical': {'target': 'specialty_beer', 'reason': 'specialty cluster (TMF Adambier vs)', 'count': 4},
        'historical_beer': {'target': 'specialty_beer', 'reason': 'generic specialty', 'count': 1},
        'finnish_sahti': {'target': 'specialty_beer', 'reason': 'BJCP 27 niş historical', 'count': 2},
    },
    'conditional_aliases': {
        'other_belgian_ale': {
            'method': 'OG-based 3-split',
            'rules': [
                {'condition': 'OG >= 1.080', 'target': 'belgian_strong_dark_ale', 'count': 2},
                {'condition': '1.060 <= OG < 1.080', 'target': 'belgian_dubbel', 'count': 1},
                {'condition': 'OG < 1.060', 'target': 'belgian_blonde_ale', 'count': 3},
            ],
            'total': 6,
        },
        'dark_lager': {
            'method': 'SRM-based split',
            'rules': [
                {'condition': 'SRM <= 15', 'target': 'munich_dunkel', 'count': 1},
                {'condition': 'SRM > 15', 'target': 'german_schwarzbier', 'count': 4},
            ],
            'total': 5,
        },
        'american_wild_ale': {
            'method': 'Recipe name infer',
            'rules': [
                {'condition': 'name contains "funky" + ("big" or pale)', 'target': 'brett_beer', 'count': 2,
                 'samples': ['Funky Pale Ale Recipe', 'Big Funky Beers']},
                {'condition': 'default (sour/solera/beatification)', 'target': 'mixed_fermentation_sour_beer', 'count': 5,
                 'samples': ['Beatification Clone', 'Sour Bourbon Barrel Porter', 'Apple Brandy Solera',
                             'Buckwheat Sour Amber', 'Sour Solera Beer Barrel']},
            ],
            'total': 7,
            'note': 'TMF parser yeast detail %0 extract — name-based infer geçici çözüm. Adım 61+ TMF parser fix.',
        },
        'german_leichtbier': {
            'method': 'ABV-based split + drop',
            'rules': [
                {'condition': 'ABV > 0.5 (gerçek leichtbier)', 'target': 'pale_lager', 'count': 2,
                 'samples': ['Meister Hölle No 1 (ABV 2.6)', 'Hersbrucker Leichter Stopfer (ABV 4.0)']},
                {'condition': 'ABV == 0.5 (FreiBier alkolsüz)', 'target': 'DROP', 'count': 2,
                 'samples': ['FreiBier [2]', 'FreiBier [IPA Simcoe]']},
            ],
            'total': 4,
            'note': 'munich_helles profile-uyumsuz (OG 1.044-1.048 sample 1.024-1.039). pale_lager BJCP 1A profile-uyumlu.',
        },
    },
    'drops': {
        'gluten_free_beer': {'count': 1, 'reason': 'Beslenme-bazlı (sorghum/millet/rice malt), BJCP slug\'larına alias edilemez'},
        'braureka_30601': {'slug': 'german_leichtbier', 'reason': 'FreiBier alkolsüz (ABV 0.5)'},
        'braureka_31814': {'slug': 'german_leichtbier', 'reason': 'FreiBier IPA Simcoe alkolsüz (ABV 0.5)'},
    },
    'standalone_kept': {
        'brut_ipa': {'count': 3, 'reason': 'BJCP X4 modern style, train ≥10 filter ile train edilemez ama dataset\'te kalır',
                     'next_step': 'Adım 61+ ek scrape (BYO/AHA brut_ipa search) ile ≥10 yapılır'},
    },
}

with open('_v19_alias_mapping.json', 'w', encoding='utf-8') as f:
    json.dump(ALIAS_MAPPING, f, indent=2, ensure_ascii=False)
print(f'  Wrote _v19_alias_mapping.json (kalıcı kayıt)', flush=True)


# ==================== STYLE_DEFINITIONS update ====================
print('\n[4] STYLE_DEFINITIONS güncelleme...', flush=True)
with open('STYLE_DEFINITIONS.json', 'r', encoding='utf-8') as f:
    style_defs = json.load(f)
print(f'  STYLE_DEFINITIONS yüklendi: {len(style_defs)} slug', flush=True)

# Build full alias map
all_aliases = {}
for src, info in ALIAS_MAPPING['simple_aliases'].items():
    all_aliases[src] = info['target']
# Conditional alias kaynakları için "_aliased_to" field'ı koy ama hedef özel (multi-target)
conditional_sources = list(ALIAS_MAPPING['conditional_aliases'].keys())

aliased_in_def = 0
not_in_def = []
for src, target in all_aliases.items():
    if src in style_defs:
        if isinstance(style_defs[src], dict):
            style_defs[src]['_aliased_to'] = target
            style_defs[src]['_alias_step'] = 'Adim 60a (V19-aliased)'
            aliased_in_def += 1
        else:
            print(f'  WARN: {src} not dict in STYLE_DEFINITIONS', flush=True)
    else:
        not_in_def.append(src)

# Conditional aliases
for src in conditional_sources:
    if src in style_defs and isinstance(style_defs[src], dict):
        info = ALIAS_MAPPING['conditional_aliases'][src]
        style_defs[src]['_aliased_to'] = f'multi-target ({info["method"]})'
        style_defs[src]['_alias_step'] = 'Adim 60a (V19-aliased)'
        style_defs[src]['_conditional_rules'] = info['rules']
        aliased_in_def += 1
    elif src not in style_defs:
        not_in_def.append(src)

# Drop slug
for src in ALIAS_MAPPING['drops']:
    if src in style_defs and isinstance(style_defs[src], dict):
        style_defs[src]['_dropped'] = True
        style_defs[src]['_drop_step'] = 'Adim 60a (V19-aliased)'

print(f'  STYLE_DEFINITIONS\'de güncellenen alias slug: {aliased_in_def}', flush=True)
if not_in_def:
    print(f'  STYLE_DEFINITIONS\'de OLMAYAN alias slug: {not_in_def}', flush=True)

with open('STYLE_DEFINITIONS.json', 'w', encoding='utf-8') as f:
    json.dump(style_defs, f, ensure_ascii=False, indent=2)
import os
sz = os.path.getsize('STYLE_DEFINITIONS.json') / 1024
print(f'  STYLE_DEFINITIONS.json yazıldı: {sz:.0f} KB', flush=True)


# Save sanity summary
sanity_summary = {
    'sanity_metrics': sanity_results,
    'outliers': {
        'og_lt_1_020_or_gt_1_150': og_outliers,
        'fg_lt_0_990_or_gt_1_060': fg_outliers,
        'ibu_gt_200': ibu_outliers,
        'srm_gt_100': srm_outliers,
        'abv_lt_0_5_or_gt_20': abv_outliers,
    },
    'kural1_alarm_10x_deviation': deviations,
    'kural1_pass': len(deviations) == 0,
    'aliased_in_style_defs': aliased_in_def,
    'aliased_not_in_style_defs': not_in_def,
}
with open('_step60a_sanity_audit.json', 'w', encoding='utf-8') as f:
    json.dump(sanity_summary, f, indent=2, ensure_ascii=False)
print(f'\n[DONE] _step60a_sanity_audit.json yazıldı', flush=True)
