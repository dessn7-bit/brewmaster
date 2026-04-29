"""Deney 3 — V6_C2 hyperparameter tuning grid search.

Dataset SABİT: working/_v6_c2_dataset.json (32K)
Tune: K + weight (sklearn KNN destekledikleri).
Veto + feature_weighting V6 engine HTML özelleştirmeleri, Python sklearn'de YOK — sabit.
"""
import json, sys, time
import numpy as np
from collections import Counter
from sklearn.neighbors import KNeighborsClassifier
from sklearn.model_selection import StratifiedKFold
from sklearn.preprocessing import StandardScaler

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
np.random.seed(42)
T0 = time.time()
def t(): return f'{time.time()-T0:.1f}s'


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
    'red_ipa': 'ipa', 'white_ipa': 'ipa', 'rye_ipa': 'ipa', 'brut_ipa': 'ipa',
    'irish_dry_stout': 'stout', 'sweet_stout': 'stout',
    'oatmeal_stout': 'stout', 'stout': 'stout', 'american_imperial_stout': 'stout',
    'export_stout': 'stout',
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
    'american_cream_ale': 'cream', 'common_beer': 'cream',
    'german_koelsch': 'cream', 'german_altbier': 'cream', 'blonde_ale': 'cream',
    'mild': 'mild', 'irish_red_ale': 'mild',
    'ordinary_bitter': 'bitter', 'special_bitter_or_best_bitter': 'bitter',
    'extra_special_bitter': 'bitter', 'scottish_export': 'bitter', 'scotch_ale_or_wee_heavy': 'bitter',
    'old_ale': 'bitter',
    'american_barley_wine_ale': 'barleywine', 'british_barley_wine_ale': 'barleywine',
}

COMPACT_FEATURES = [
    'og', 'fg', 'abv', 'ibu', 'srm',
    'pct_pilsner', 'pct_pale_ale', 'pct_munich', 'pct_vienna', 'pct_wheat',
    'pct_oats', 'pct_rye', 'pct_crystal', 'pct_choc', 'pct_roast', 'pct_smoked',
    'pct_corn', 'pct_rice', 'pct_sugar', 'pct_aromatic_abbey',
    'yeast_belgian', 'yeast_abbey', 'yeast_saison', 'yeast_kveik', 'yeast_english',
    'yeast_american', 'yeast_german_lager', 'yeast_kolsch', 'yeast_witbier',
    'yeast_wheat_german', 'yeast_brett', 'yeast_lacto', 'yeast_sour_blend',
    'hop_american_c', 'hop_english', 'hop_german', 'hop_czech_saaz', 'hop_nz',
    'katki_fruit', 'katki_spice_herb', 'katki_chocolate', 'katki_coffee',
    'katki_smoke', 'katki_lactose',
    'dry_hop_days', 'has_brett', 'has_lacto', 'is_mixed_fermentation',
    'has_coriander', 'has_orange_peel', 'has_chamomile', 'has_salt',
    'has_dry_hop_heavy', 'has_whirlpool_heavy',
    'dry_hop_grams_per_liter', 'late_hop_pct',
]


print(f'[1] Loading V6_C2 dataset... {t()}', flush=True)
with open('working/_v6_c2_dataset.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
recs = data['recipes']
print(f'  V6_C2: {len(recs)} recipes  {t()}', flush=True)

X = np.array([[(r.get('features') or {}).get(f, 0) or 0 for f in COMPACT_FEATURES]
               for r in recs], dtype=np.float32)
y = np.array([SLUG_TO_CLUSTER.get(r.get('bjcp_slug'), 'other') for r in recs])
print(f'  X shape: {X.shape}, classes: {len(set(y))}', flush=True)


def cv_score(X, y, k, weights, n_folds=5):
    scaler = StandardScaler()
    skf = StratifiedKFold(n_splits=n_folds, shuffle=True, random_state=42)
    top1_scores, top3_scores = [], []
    for tr_idx, te_idx in skf.split(X, y):
        X_tr, X_te = X[tr_idx], X[te_idx]
        y_tr, y_te = y[tr_idx], y[te_idx]
        X_tr_s = scaler.fit_transform(X_tr)
        X_te_s = scaler.transform(X_te)
        clf = KNeighborsClassifier(n_neighbors=k, weights=weights, n_jobs=-1)
        clf.fit(X_tr_s, y_tr)
        pred = clf.predict(X_te_s)
        top1 = float((pred == y_te).mean())
        proba = clf.predict_proba(X_te_s)
        classes = clf.classes_
        top3_correct = 0
        for i, true_label in enumerate(y_te):
            top3_idx = np.argsort(-proba[i])[:3]
            if true_label in classes[top3_idx]:
                top3_correct += 1
        top3 = top3_correct / len(y_te)
        top1_scores.append(top1); top3_scores.append(top3)
    return {
        'top1_mean': float(np.mean(top1_scores)),
        'top1_std': float(np.std(top1_scores)),
        'top3_mean': float(np.mean(top3_scores)),
        'top3_std': float(np.std(top3_scores)),
    }


# Grid: K × weights
K_values = [3, 5, 7, 10, 15, 20, 25, 30]
weight_values = ['uniform', 'distance']

print(f'\n[2] Grid search: {len(K_values) * len(weight_values)} combos', flush=True)
results = []
for k in K_values:
    for w in weight_values:
        t0 = time.time()
        cv = cv_score(X, y, k, w)
        elapsed = time.time() - t0
        result = {
            'K': k, 'weights': w,
            'top1_mean': round(cv['top1_mean'], 4),
            'top1_std': round(cv['top1_std'], 4),
            'top3_mean': round(cv['top3_mean'], 4),
            'top3_std': round(cv['top3_std'], 4),
            'time_sec': round(elapsed, 1),
        }
        results.append(result)
        print(f'  K={k:>3} weights={w:<10} top1={cv["top1_mean"]:.4f} (±{cv["top1_std"]:.4f})  '
              f'top3={cv["top3_mean"]:.4f} (±{cv["top3_std"]:.4f})  {elapsed:.1f}s', flush=True)


# Sort by top-1
results_sorted = sorted(results, key=lambda r: -r['top1_mean'])
print(f'\n[3] Top 5 combo (top-1 mean):')
print(f'  {"rank":>4} {"K":>3} {"weights":<10} {"top1_mean":>10} {"top1_std":>9} {"top3_mean":>10}', flush=True)
for i, r in enumerate(results_sorted[:5], 1):
    print(f'  {i:>4d} {r["K"]:>3d} {r["weights"]:<10} {r["top1_mean"]:>10.4f} {r["top1_std"]:>9.4f} {r["top3_mean"]:>10.4f}', flush=True)

print(f'\nBaseline V6_C2 (K=5, distance): top1=0.5386 ±0.0031, top3=0.7370')
best = results_sorted[0]
delta = best['top1_mean'] - 0.5386
print(f'Best HT combo: K={best["K"]} weights={best["weights"]} top1={best["top1_mean"]:.4f} (Δ {delta*100:+.2f}pp)')


# Save
with open('_step60c_d3_ht_grid.json', 'w', encoding='utf-8') as f:
    json.dump({
        'baseline': {'K': 5, 'weights': 'distance', 'top1_mean': 0.5386, 'top3_mean': 0.7370},
        'grid_results': results,
        'top5_by_top1': results_sorted[:5],
        'best': best,
        'delta_pp': round(delta * 100, 2),
    }, f, indent=2, ensure_ascii=False)
print(f'\n[DONE] _step60c_d3_ht_grid.json yazıldı  {t()}', flush=True)
