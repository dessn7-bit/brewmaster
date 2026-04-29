"""Adım 60c — V6_C2 cluster-level pipeline.

1. Sampling: 16 cluster × 2000 stratified random
2. 5-fold CV cluster-level KNN
3. Eski V6 (1100 reçete slug→cluster) baseline simulasyon
4. Sample test 5 reçete
"""
import json, sys, math, time, random, os
import numpy as np
from collections import Counter, defaultdict
from sklearn.neighbors import KNeighborsClassifier
from sklearn.model_selection import StratifiedKFold
from sklearn.preprocessing import StandardScaler

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
random.seed(42); np.random.seed(42)
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


# === SAMPLING V6_C2 ===
print(f'[1] Loading V19-aliased dataset... {t()}', flush=True)
with open('working/_v19_aliased_dataset.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
recs = data['recipes']
features = data['meta']['feature_list']
print(f'  V19-aliased: {len(recs)} recipes, {len(features)} features  {t()}', flush=True)


print(f'\n[2] Sampling V6_C2 (16 cluster × 2000)... {t()}', flush=True)
recs_by_cluster = defaultdict(list)
for r in recs:
    slug = r.get('bjcp_slug')
    cluster = SLUG_TO_CLUSTER.get(slug)
    if cluster:
        recs_by_cluster[cluster].append(r)

random.seed(42)
selected = []
cluster_counts = {}
for cluster, pool in sorted(recs_by_cluster.items()):
    if len(pool) <= 2000:
        chosen = pool
    else:
        chosen = random.sample(pool, 2000)
    selected.extend(chosen)
    cluster_counts[cluster] = len(chosen)
    print(f'  {cluster:<12}: {len(pool):>6d} pool → {len(chosen):>5d} sampled', flush=True)

print(f'\n  Total: {len(selected)} recipes', flush=True)
total_v6c2 = len(selected)


# Save V6_C2 dataset
print(f'\n[3] Saving working/_v6_c2_dataset.json... {t()}', flush=True)
out = {'recipes': selected, 'meta': {
    'feature_list': features, 'count': len(selected),
    'strategy': 'V6_C2 cluster sabit M=2000',
    'clusters': len(cluster_counts),
    'cluster_counts': cluster_counts,
}}
with open('working/_v6_c2_dataset.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False)
sz_mb = os.path.getsize('working/_v6_c2_dataset.json') / (1024*1024)
print(f'  Saved {sz_mb:.0f} MB', flush=True)


# === RETRAIN: 5-fold CV cluster-level ===
print(f'\n[4] V6_C2 retrain — 5-fold CV cluster-level... {t()}', flush=True)


def to_xy_cluster(recs):
    X = np.array([[(r.get('features') or {}).get(f, 0) or 0 for f in COMPACT_FEATURES]
                   for r in recs], dtype=np.float32)
    y = np.array([SLUG_TO_CLUSTER.get(r.get('bjcp_slug'), 'other') for r in recs])
    return X, y


def cv_score(X, y, k=5, n_folds=5):
    scaler = StandardScaler()
    skf = StratifiedKFold(n_splits=n_folds, shuffle=True, random_state=42)
    top1_scores, top3_scores = [], []
    per_class_correct = Counter()
    per_class_n = Counter()
    for fold_i, (tr_idx, te_idx) in enumerate(skf.split(X, y), 1):
        X_tr, X_te = X[tr_idx], X[te_idx]
        y_tr, y_te = y[tr_idx], y[te_idx]
        X_tr_s = scaler.fit_transform(X_tr)
        X_te_s = scaler.transform(X_te)
        clf = KNeighborsClassifier(n_neighbors=k, weights='distance', n_jobs=-1)
        clf.fit(X_tr_s, y_tr)
        pred = clf.predict(X_te_s)
        top1 = float((pred == y_te).mean())
        # top3
        proba = clf.predict_proba(X_te_s)
        classes = clf.classes_
        top3_correct = 0
        for i, true_label in enumerate(y_te):
            top3_idx = np.argsort(-proba[i])[:3]
            top3_labels = classes[top3_idx]
            if true_label in top3_labels:
                top3_correct += 1
        top3 = top3_correct / len(y_te)
        top1_scores.append(top1); top3_scores.append(top3)
        for tl, pl in zip(y_te, pred):
            per_class_n[tl] += 1
            if tl == pl:
                per_class_correct[tl] += 1
        print(f'    fold {fold_i}: top1={top1:.4f} top3={top3:.4f}', flush=True)
    return {
        'top1_mean': float(np.mean(top1_scores)), 'top1_std': float(np.std(top1_scores)),
        'top3_mean': float(np.mean(top3_scores)), 'top3_std': float(np.std(top3_scores)),
        'per_class': {c: {'n': per_class_n[c], 'correct': per_class_correct[c],
                          'acc': per_class_correct[c]/per_class_n[c] if per_class_n[c] else 0}
                      for c in per_class_n},
    }


X_v6c2, y_v6c2 = to_xy_cluster(selected)
print(f'  X shape: {X_v6c2.shape}, classes: {len(set(y_v6c2))}', flush=True)
v6c2_cv = cv_score(X_v6c2, y_v6c2, k=5, n_folds=5)
print(f'\n  V6_C2 MEAN: top1={v6c2_cv["top1_mean"]:.4f} (±{v6c2_cv["top1_std"]:.4f})  '
      f'top3={v6c2_cv["top3_mean"]:.4f} (±{v6c2_cv["top3_std"]:.4f})', flush=True)

print(f'\n  V6_C2 per-class accuracy (16 cluster):', flush=True)
for c in sorted(v6c2_cv['per_class'].keys()):
    info = v6c2_cv['per_class'][c]
    print(f'    {c:<12} n={info["n"]:>5d} correct={info["correct"]:>5d} acc={info["acc"]*100:>6.2f}%', flush=True)


# === BASELINE: eski V6 (1100 reçete slug→cluster simulasyon) ===
# HTML'deki TRAINING_RECS'i çıkar, slug → cluster mapping yap, 5-fold CV cluster-level
print(f'\n[5] Eski V6 baseline simulasyon... {t()}', flush=True)
print('  HTML\'den TRAINING_RECS extract...', flush=True)

with open('Brewmaster_v2_79_10.html', 'r', encoding='utf-8') as f:
    html = f.read()
import re
m = re.search(r'const TRAINING_RECS = (\[.*?\]);', html, re.DOTALL)
if not m:
    print('  ❌ TRAINING_RECS bulunamadı', flush=True)
    old_v6_cv = None
else:
    old_recs_raw = json.loads(m.group(1))
    print(f'  Eski V6 reçete: {len(old_recs_raw)}', flush=True)

    # Convert to V19 dataset format with cluster
    old_X = []
    old_y = []
    for r in old_recs_raw:
        slug = r.get('label_slug')
        cluster = SLUG_TO_CLUSTER.get(slug)
        if not cluster: continue
        feats = r.get('features', {})
        # Map HTML features to COMPACT_FEATURES
        # HTML schema farklı (pct_base var ama V19 yok), eksik feature'lar 0
        vec = []
        for fn in COMPACT_FEATURES:
            v = feats.get(fn, 0) or 0
            vec.append(v)
        old_X.append(vec)
        old_y.append(cluster)
    old_X = np.array(old_X, dtype=np.float32)
    old_y = np.array(old_y)
    print(f'  Cluster mapped: {len(old_X)}, classes: {len(set(old_y))}', flush=True)

    # 5-fold CV
    old_v6_cv = cv_score(old_X, old_y, k=5, n_folds=5)
    print(f'\n  ESKİ V6 baseline: top1={old_v6_cv["top1_mean"]:.4f} (±{old_v6_cv["top1_std"]:.4f})  '
          f'top3={old_v6_cv["top3_mean"]:.4f} (±{old_v6_cv["top3_std"]:.4f})', flush=True)


# === SAMPLE TEST ===
print(f'\n[6] Sample test V6_C2 (cluster-level, 5 reçete)... {t()}', flush=True)

TEST_PROFILES = {
    'Witbier (Hoegaarden)': {
        'features': {'og': 1.048, 'fg': 1.010, 'abv': 4.8, 'ibu': 14, 'srm': 3,
                     'pct_pilsner': 50, 'pct_wheat': 50,
                     'yeast_belgian': 1, 'yeast_witbier': 1,
                     'has_coriander': 1, 'has_orange_peel': 1,
                     'late_hop_pct': 30},
        'expected': 'wheat',  # NOT: witbier→belgian cluster, ama Kaan beklenen "wheat" dedi (Belçika witbier yine de)
    },
    'American IPA (Sierra Nevada Pale)': {
        'features': {'og': 1.055, 'fg': 1.012, 'abv': 5.6, 'ibu': 38, 'srm': 8,
                     'pct_pale_ale': 90, 'pct_crystal': 10,
                     'yeast_american': 1, 'hop_american_c': 1,
                     'late_hop_pct': 50},
        'expected': 'pale_ale',  # APA Sierra Nevada → pale_ale cluster
    },
    'Brett Pale Ale (100% Brett)': {
        'features': {'og': 1.050, 'fg': 1.005, 'abv': 5.9, 'ibu': 30, 'srm': 5,
                     'pct_pale_ale': 70, 'pct_wheat': 20, 'pct_oats': 10,
                     'yeast_brett': 1, 'has_brett': 1,
                     'late_hop_pct': 40},
        'expected': 'sour',
    },
    'Belgian Quadrupel (Westvleteren 12)': {
        'features': {'og': 1.096, 'fg': 1.018, 'abv': 11.0, 'ibu': 30, 'srm': 22,
                     'pct_pilsner': 60, 'pct_munich': 5, 'pct_aromatic_abbey': 10,
                     'pct_sugar': 15, 'pct_crystal': 10,
                     'yeast_belgian': 1, 'yeast_abbey': 1,
                     'late_hop_pct': 20},
        'expected': 'belgian',
    },
    'Dortmunder (DAB tarzı)': {
        'features': {'og': 1.052, 'fg': 1.010, 'abv': 5.2, 'ibu': 25, 'srm': 5,
                     'pct_pilsner': 80, 'pct_munich': 15, 'pct_vienna': 5,
                     'yeast_german_lager': 1, 'hop_german': 1,
                     'late_hop_pct': 30},
        'expected': 'lager',
    },
}


# Train on all V6_C2 for sample test
scaler_full = StandardScaler()
X_v6c2_s = scaler_full.fit_transform(X_v6c2)
clf_full = KNeighborsClassifier(n_neighbors=5, weights='distance', n_jobs=-1)
clf_full.fit(X_v6c2_s, y_v6c2)

sample_results = {}
for name, prof in TEST_PROFILES.items():
    expected = prof['expected']
    test_vec = np.array([[prof['features'].get(f, 0) for f in COMPACT_FEATURES]], dtype=np.float32)
    test_s = scaler_full.transform(test_vec)
    proba = clf_full.predict_proba(test_s)[0]
    classes = clf_full.classes_
    top_idx = np.argsort(-proba)[:5]
    top5 = [(classes[i], float(proba[i])) for i in top_idx]
    match = top5[0][0] == expected
    in_top3 = expected in [c for c, _ in top5[:3]]
    print(f'\n  Test: {name} (beklenen: {expected})', flush=True)
    for i, (c, p) in enumerate(top5, 1):
        mark = '⭐' if c == expected else '  '
        print(f'    {mark} {i}. {c:<12} prob={p:.3f}', flush=True)
    print(f'    Match top-1: {match}, in_top3: {in_top3}', flush=True)
    sample_results[name] = {
        'expected': expected, 'top5': top5,
        'match_top1': match, 'in_top3': in_top3,
    }


# === SAVE RESULTS ===
print(f'\n[7] Saving results... {t()}', flush=True)
results = {
    'sampling': {
        'strategy': 'V6_C2 cluster sabit M=2000',
        'total_recipes': total_v6c2,
        'clusters': len(cluster_counts),
        'cluster_counts': cluster_counts,
    },
    'v6_c2_cv': {
        'top1_mean': round(v6c2_cv['top1_mean'], 4),
        'top1_std': round(v6c2_cv['top1_std'], 4),
        'top3_mean': round(v6c2_cv['top3_mean'], 4),
        'top3_std': round(v6c2_cv['top3_std'], 4),
        'per_class': {c: {'n': info['n'], 'correct': info['correct'], 'acc': round(info['acc'], 4)}
                      for c, info in v6c2_cv['per_class'].items()},
    },
    'old_v6_baseline': {
        'recipes': len(old_X) if old_v6_cv else 0,
        'top1_mean': round(old_v6_cv['top1_mean'], 4) if old_v6_cv else None,
        'top3_mean': round(old_v6_cv['top3_mean'], 4) if old_v6_cv else None,
        'per_class': {c: {'n': info['n'], 'correct': info['correct'], 'acc': round(info['acc'], 4)}
                      for c, info in old_v6_cv['per_class'].items()} if old_v6_cv else {},
    },
    'sample_test': {k: {'expected': v['expected'],
                         'top5': [(c, round(p, 4)) for c, p in v['top5']],
                         'match_top1': v['match_top1'], 'in_top3': v['in_top3']}
                    for k, v in sample_results.items()},
}
with open('_step60c_v6_c2_results.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2, ensure_ascii=False)
print(f'\n[DONE] {t()}', flush=True)
