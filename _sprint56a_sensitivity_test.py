"""Sprint 56a Sensitivity Test (KURAL 3) — V18.2 vs V18.3 karşılaştırma.

İki test:
1. 5 stat feature gain karşılaştırma (V18.2 vs V18.3 XGBoost feature_importances_)
   - 5 stat = og, fg, abv, ibu, srm
   - Hipotez: V18.2'de ABV outlier bug 5 stat gain'i bastırdı; V18.3 outlier drop sonrası gain artmalı
2. 4 reçete profili × OG sweep matrisi (V18.2 vs V18.3 top-1 prediction comparison)
   - Profiller: NEIPA, Saison, Imperial Stout, Belgian Witbier
   - OG range: 1.040-1.090 (5 nokta)
"""
import json, sys, os, math
import numpy as np
import xgboost as xgb

sys.stdout.reconfigure(encoding='utf-8')

print('[1] Loading V18.2 + V18.3 models + label encoders...', flush=True)
m_v2 = xgb.Booster(); m_v2.load_model('_v18_2_model_slug.json')
m_v3 = xgb.Booster(); m_v3.load_model('_v18_3_model_slug.json')
le_v2 = json.load(open('_v18_2_label_encoder_slug.json', encoding='utf-8'))
le_v3 = json.load(open('_v18_3_label_encoder_slug.json', encoding='utf-8'))
print(f'  V18.2 classes={le_v2["n_classes"]}, features={len(le_v2["feature_list"])}')
print(f'  V18.3 classes={le_v3["n_classes"]}, features={len(le_v3["feature_list"])}')


# ── Test 1: Feature gain comparison ──
print('\n=== TEST 1: 5 stat feature gain (V18.2 vs V18.3) ===', flush=True)
gain_v2 = m_v2.get_score(importance_type='gain')
gain_v3 = m_v3.get_score(importance_type='gain')

# XGBoost uses f0, f1, ... naming — map to feature names
def feat_gains(gain_dict, feat_list):
    out = {}
    for k, v in gain_dict.items():
        if k.startswith('f'):
            try:
                idx = int(k[1:])
                if idx < len(feat_list):
                    out[feat_list[idx]] = v
            except ValueError:
                pass
        else:
            out[k] = v
    return out

g2 = feat_gains(gain_v2, le_v2['feature_list'])
g3 = feat_gains(gain_v3, le_v3['feature_list'])

# 5 stat
STATS = ['og', 'fg', 'abv', 'ibu', 'srm']
print(f'\n{"feature":<10} {"V18.2 gain":>14} {"V18.3 gain":>14} {"Δ":>10} {"Δ%":>8}')
v2_total = sum(g2.values())
v3_total = sum(g3.values())
print(f'{"TOTAL":<10} {v2_total:>14.2f} {v3_total:>14.2f}')

stat_gain_v2 = 0
stat_gain_v3 = 0
for f in STATS:
    g_v2 = g2.get(f, 0)
    g_v3 = g3.get(f, 0)
    pct_v2 = 100 * g_v2 / v2_total if v2_total else 0
    pct_v3 = 100 * g_v3 / v3_total if v3_total else 0
    stat_gain_v2 += g_v2
    stat_gain_v3 += g_v3
    print(f'{f:<10} {g_v2:>14.2f} {g_v3:>14.2f} {g_v3-g_v2:>+10.2f} {pct_v3-pct_v2:>+7.2f}pp')

stat_pct_v2 = 100 * stat_gain_v2 / v2_total if v2_total else 0
stat_pct_v3 = 100 * stat_gain_v3 / v3_total if v3_total else 0
print(f'\n5-STAT TOTAL: V18.2={stat_pct_v2:.2f}%  V18.3={stat_pct_v3:.2f}%  Δ={stat_pct_v3-stat_pct_v2:+.2f}pp')

# Top 20 features V18.3
print(f'\nTop 20 features V18.3 (by gain%):')
top20 = sorted(g3.items(), key=lambda x: -x[1])[:20]
for f, g in top20:
    pct = 100 * g / v3_total
    print(f'  {f:<30} {pct:>6.2f}%  {g:>10.2f}')


# ── Test 2: 4 profile x OG sweep ──
print('\n\n=== TEST 2: 4 profile × OG sweep ===', flush=True)


def make_features(feat_list, base):
    """Create feature vector from base dict (only specified populated)."""
    return np.array([[base.get(k, 0) for k in feat_list]], dtype=np.float32)


PROFILES = {
    'NEIPA': {  # Juicy/Hazy IPA tipik
        'fg': 1.014, 'abv': 6.0, 'ibu': 60, 'srm': 4,
        'pct_pale_ale': 70, 'pct_oats': 10, 'pct_wheat': 15,
        'has_dry_hop': 1, 'has_whirlpool': 1, 'yeast_american': 1,
        'ibu_og_ratio': 1.0, 'og_fg_ratio': 0.78,
    },
    'Saison': {
        'fg': 1.005, 'abv': 6.5, 'ibu': 30, 'srm': 4,
        'pct_pilsner': 60, 'pct_wheat': 10, 'pct_munich': 10,
        'yeast_saison': 1, 'has_late_hop': 1,
        'ibu_og_ratio': 0.5, 'og_fg_ratio': 0.92,
    },
    'Imperial_Stout': {
        'fg': 1.025, 'abv': 9.5, 'ibu': 60, 'srm': 50,
        'pct_pale_ale': 65, 'pct_choc': 8, 'pct_roast': 6, 'pct_crystal': 10, 'pct_oats': 5,
        'yeast_american': 1, 'has_late_hop': 1,
        'ibu_og_ratio': 0.6, 'og_fg_ratio': 0.74,
    },
    'Belgian_Witbier': {
        'fg': 1.010, 'abv': 5.0, 'ibu': 15, 'srm': 4,
        'pct_pilsner': 50, 'pct_wheat': 50,
        'yeast_belgian': 1, 'yeast_witbier': 1,
        'ibu_og_ratio': 0.3, 'og_fg_ratio': 0.79,
    },
}
OG_RANGE = [1.040, 1.050, 1.060, 1.075, 1.090]

# Per profile
for pname, base in PROFILES.items():
    print(f'\n--- {pname} ---')
    print(f'{"OG":<8} {"V18.2 top-1":<35} {"V18.3 top-1":<35} {"match":<7}')
    for og in OG_RANGE:
        b = dict(base)
        b['og'] = og
        # Recompute ibu_og_ratio if OG changes
        if 'ibu' in b and og > 1.0:
            b['ibu_og_ratio'] = b['ibu'] / ((og - 1.0) * 1000)

        # V18.2 prediction
        x_v2 = make_features(le_v2['feature_list'], b)
        d_v2 = xgb.DMatrix(x_v2)
        p_v2 = m_v2.predict(d_v2)[0]
        top1_v2 = le_v2['classes'][int(p_v2.argmax())]

        # V18.3 prediction
        x_v3 = make_features(le_v3['feature_list'], b)
        d_v3 = xgb.DMatrix(x_v3)
        p_v3 = m_v3.predict(d_v3)[0]
        top1_v3 = le_v3['classes'][int(p_v3.argmax())]

        match = '✓' if top1_v2 == top1_v3 else 'Δ'
        print(f'{og:<8} {top1_v2:<35} {top1_v3:<35} {match}')


# ── Test 3: Per-slug holdout comparison (zayıf slug'lar) ──
print('\n\n=== TEST 3: Per-slug holdout t1/t3 (V18.2 vs V18.3) ===', flush=True)
v2_metrics = json.load(open('_v18_2_metrics.json', encoding='utf-8'))
v3_metrics = json.load(open('_v18_3_metrics.json', encoding='utf-8'))

WEAK_SLUGS = [
    'belgian_ipa', 'rye_ipa', 'white_ipa', 'red_ipa',
    'gose', 'belgian_gueuze', 'belgian_quadrupel',
    'brett_beer', 'mixed_fermentation_sour_beer',
    'dunkles_bock', 'kellerbier', 'german_oktoberfest_festbier',
    'english_pale_ale', 'special_bitter_or_best_bitter',
    'belgian_strong_dark_ale', 'flanders_red_ale',
    'belgian_lambic', 'belgian_fruit_lambic',
    'oud_bruin', 'export_stout',
    'juicy_or_hazy_india_pale_ale', 'black_ipa',
]

v2_slug = v2_metrics['slug'].get('spotlight', {}) or v2_metrics['slug'].get('per_slug', {})
v3_slug = v3_metrics['slug'].get('per_slug', {})

print(f'\n{"slug":<40} {"V18.2 n":>8} {"V18.2 t1":>10} {"V18.3 n":>8} {"V18.3 t1":>10} {"Δt1":>8}  {"V18.2 t3":>10} {"V18.3 t3":>10} {"Δt3":>8}')
for s in WEAK_SLUGS:
    v2 = v2_slug.get(s, {})
    v3 = v3_slug.get(s, {})
    if not v2 or not v3:
        v2_n = v2.get('n', '-') if v2 else '-'
        v3_n = v3.get('n', '-') if v3 else '-'
        print(f'{s:<40} {v2_n:>8} {"":>10} {v3_n:>8} {"":>10} (data missing)')
        continue
    v2_t1 = v2.get('top1', 0) * 100
    v3_t1 = v3.get('top1', 0) * 100
    v2_t3 = v2.get('top3', 0) * 100
    v3_t3 = v3.get('top3', 0) * 100
    dt1 = v3_t1 - v2_t1
    dt3 = v3_t3 - v2_t3
    print(f'{s:<40} {v2.get("n", 0):>8} {v2_t1:>9.1f}% {v3.get("n", 0):>8} {v3_t1:>9.1f}% {dt1:>+7.1f}pp  {v2_t3:>9.1f}% {v3_t3:>9.1f}% {dt3:>+7.1f}pp')


# Headline metrics
print('\n\n=== HEADLINE METRICS ===')
print(f'V18.2 slug top-1: {v2_metrics["slug"]["test_top1"]*100:.2f}%')
print(f'V18.3 slug top-1: {v3_metrics["slug"]["test_top1"]*100:.2f}%')
print(f'Δ = {(v3_metrics["slug"]["test_top1"] - v2_metrics["slug"]["test_top1"])*100:+.2f}pp')
print()
print(f'V18.2 slug top-3: {v2_metrics["slug"]["test_top3"]*100:.2f}%')
print(f'V18.3 slug top-3: {v3_metrics["slug"]["test_top3"]*100:.2f}%')
print(f'Δ = {(v3_metrics["slug"]["test_top3"] - v2_metrics["slug"]["test_top3"])*100:+.2f}pp')
print()
print(f'V18.2 14cat top-1: {v2_metrics["14cat"]["test_top1"]*100:.2f}%')
print(f'V18.3 14cat top-1: {v3_metrics["14cat"]["test_top1"]*100:.2f}%')

print('\n[SENSITIVITY TEST DONE]')
