#!/usr/bin/env python3
"""Adım 6 — V6 14-cluster retrain (KURAL Code 3 katmanlı uygulama).

Eski 17-cluster mimari → yeni 14-cluster (belgian/cream/amber_ale silindi,
slug'lar yeniden organize edildi).

Stratified mantık: cluster içi slug-eşit bölüşüm (M=2000 / n_slug).
Yetersiz slug → mevcut max kullan + eksik kapasite cluster'daki yeterli
slug'lara eşit dağıtılır (redistribution).

KATMAN 1: Pre-kod statik (mapping doğrulama, spotlight)
KATMAN 2: 5-fold CV + sample sanity
KATMAN 3: Save artifacts (Adım 5.7 sonrası HTML embed için)
"""

import json, time, sys, random, math, os
import numpy as np
from pathlib import Path
from collections import Counter, defaultdict
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import StratifiedKFold
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import f1_score

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

DATASET = Path('C:/Users/Kaan/brewmaster/working/_v28d_aliased_dataset.json')
ARCH = Path('C:/Users/Kaan/brewmaster/working/archive/v6_step6_v28d')
ARCH.mkdir(parents=True, exist_ok=True)

T0 = time.time()
def t(): return f'{time.time()-T0:.1f}s'


# === KAAN ADIM 6 — 14-CLUSTER MAPPING ===
SLUG_TO_NEW_CLUSTER = {
    # CLUSTER 1: brown_ale (8 slug)
    'american_brown_ale':'brown_ale','mild':'brown_ale','brown_ale':'brown_ale',
    'irish_red_ale':'brown_ale','scottish_export':'brown_ale',
    'american_amber_red_ale':'brown_ale','german_altbier':'brown_ale',
    'french_biere_de_garde':'brown_ale',
    # CLUSTER 2: bock (4 slug, korundu)
    'german_doppelbock':'bock','german_heller_bock_maibock':'bock',
    'german_bock':'bock','dunkles_bock':'bock',
    # CLUSTER 3: ipa (9 slug, +belgian_ipa)
    'american_india_pale_ale':'ipa','double_ipa':'ipa',
    'british_india_pale_ale':'ipa','black_ipa':'ipa','white_ipa':'ipa',
    'red_ipa':'ipa','rye_ipa':'ipa','juicy_or_hazy_india_pale_ale':'ipa',
    'belgian_ipa':'ipa',
    # CLUSTER 4: lager (10 slug, eski lager_pale_amber rename)
    'american_lager':'lager','german_maerzen':'lager','common_beer':'lager',
    'vienna_lager':'lager','munich_helles':'lager','pale_lager':'lager',
    'dortmunder_european_export':'lager','bamberg_maerzen_rauchbier':'lager',
    'kellerbier':'lager','german_oktoberfest_festbier':'lager',
    # CLUSTER 5: lager_dark (2 slug, korundu)
    'german_schwarzbier':'lager_dark','munich_dunkel':'lager_dark',
    # CLUSTER 6: pale_ale (8 slug, cream + bitter ailesinden genişletildi)
    'american_pale_ale':'pale_ale','english_pale_ale':'pale_ale',
    'blonde_ale':'pale_ale','american_cream_ale':'pale_ale',
    'german_koelsch':'pale_ale','extra_special_bitter':'pale_ale',
    'special_bitter_or_best_bitter':'pale_ale','ordinary_bitter':'pale_ale',
    # CLUSTER 7: pilsner (2 slug, korundu)
    'german_pilsener':'pilsner','pre_prohibition_lager':'pilsner',
    # CLUSTER 8: porter (4 slug, korundu)
    'robust_porter':'porter','brown_porter':'porter',
    'baltic_porter':'porter','porter':'porter',
    # CLUSTER 9: saison (2 slug, korundu)
    'french_belgian_saison':'saison','specialty_saison':'saison',
    # CLUSTER 10: sour (9 slug, korundu)
    'berliner_weisse':'sour','flanders_red_ale':'sour','belgian_lambic':'sour',
    'belgian_fruit_lambic':'sour','oud_bruin':'sour',
    'mixed_fermentation_sour_beer':'sour','gose':'sour',
    'belgian_gueuze':'sour','brett_beer':'sour',
    # CLUSTER 11: specialty (6 slug, korundu)
    'specialty_beer':'specialty','herb_and_spice_beer':'specialty',
    'fruit_beer':'specialty','winter_seasonal_beer':'specialty',
    'smoked_beer':'specialty','experimental_beer':'specialty',
    # CLUSTER 12: stout (6 slug, korundu)
    'american_imperial_stout':'stout','stout':'stout','oatmeal_stout':'stout',
    'sweet_stout':'stout','irish_dry_stout':'stout','export_stout':'stout',
    # CLUSTER 13: strong_ale (11 slug, +Belgian dubbel/blonde)
    'belgian_tripel':'strong_ale','belgian_strong_dark_ale':'strong_ale',
    'american_barley_wine_ale':'strong_ale','scotch_ale_or_wee_heavy':'strong_ale',
    'belgian_strong_golden':'strong_ale','old_ale':'strong_ale',
    'british_barley_wine_ale':'strong_ale','american_strong_pale_ale':'strong_ale',
    'belgian_quadrupel':'strong_ale','belgian_blonde_ale':'strong_ale',
    'belgian_dubbel':'strong_ale',
    # CLUSTER 14: wheat (6 slug, +belgian_witbier)
    'american_wheat_ale':'wheat','south_german_hefeweizen':'wheat',
    'south_german_dunkel_weizen':'wheat','south_german_weizenbock':'wheat',
    'german_rye_ale':'wheat','belgian_witbier':'wheat',
}


def label_family(slug):
    return SLUG_TO_NEW_CLUSTER.get(slug, 'other')


COMPACT_FEATURES = [
    'og','fg','abv','ibu','srm',
    'pct_pilsner','pct_pale_ale','pct_munich','pct_vienna','pct_wheat',
    'pct_oats','pct_rye','pct_crystal','pct_choc','pct_roast','pct_smoked',
    'pct_corn','pct_rice','pct_sugar','pct_aromatic_abbey',
    'yeast_belgian','yeast_abbey','yeast_saison','yeast_kveik','yeast_english',
    'yeast_american','yeast_german_lager','yeast_kolsch','yeast_witbier',
    'yeast_wheat_german','yeast_brett','yeast_lacto','yeast_sour_blend',
    'hop_american_c','hop_english','hop_german','hop_czech_saaz','hop_nz',
    'katki_fruit','katki_spice_herb','katki_chocolate','katki_coffee',
    'katki_smoke','katki_lactose',
    'dry_hop_days','has_brett','has_lacto','is_mixed_fermentation',
    'has_coriander','has_orange_peel','has_chamomile','has_salt',
    'has_dry_hop_heavy','has_whirlpool_heavy',
    'dry_hop_grams_per_liter','late_hop_pct',
]


def safe(v):
    if v is None: return 0.0
    if isinstance(v, float) and math.isnan(v): return 0.0
    if isinstance(v, bool): return 1.0 if v else 0.0
    try:
        f = float(v)
        if math.isnan(f): return 0.0
        return f
    except (TypeError, ValueError):
        return 0.0


def stratified_redistribute(slugs, slug_n, M_total):
    """Cluster içi slug-eşit bölüşüm + yetersiz slug eksiğini yeterli slug'lara dağıt."""
    insufficient_used = {}
    sufficient = list(slugs)
    while sufficient:
        per_target = (M_total - sum(insufficient_used.values())) // len(sufficient)
        new_insuff = [s for s in sufficient if slug_n.get(s, 0) < per_target]
        if not new_insuff:
            break
        for s in new_insuff:
            insufficient_used[s] = slug_n.get(s, 0)
            sufficient.remove(s)
    if not sufficient:
        return insufficient_used, {}
    remaining = M_total - sum(insufficient_used.values())
    base = remaining // len(sufficient)
    extra = remaining - base * len(sufficient)
    sufficient_used = {}
    for i, s in enumerate(sorted(sufficient)):
        sufficient_used[s] = base + (1 if i < extra else 0)
    return insufficient_used, sufficient_used


# === KATMAN 1 — STATIK ANALIZ ===
print(f'\n========== KATMAN 1 — STATIK ANALIZ ==========\n')

all_slugs = sorted(SLUG_TO_NEW_CLUSTER.keys())
new_clusters = sorted(set(SLUG_TO_NEW_CLUSTER.values()))
print(f'Mapping slug count: {len(SLUG_TO_NEW_CLUSTER)}')
print(f'Unique cluster: {len(new_clusters)}')
print(f'Cluster listesi: {new_clusters}')

EXPECTED_CLUSTERS = 14
if len(new_clusters) != EXPECTED_CLUSTERS:
    print(f'KRITIK: {len(new_clusters)} cluster, beklenen {EXPECTED_CLUSTERS}')
    sys.exit(1)
print(f'PASS: Cluster sayisi {len(new_clusters)} (beklenen 14)')

silenecek = ['belgian', 'cream', 'amber_ale']
for s in silenecek:
    if s in new_clusters:
        print(f'KRITIK: {s} cluster hala var, silinmesi gerekiyor!')
        sys.exit(1)
print(f'PASS: belgian/cream/amber_ale silindi')


# === Spotlight test ===
print(f'\n[1.0.3] Spotlight (Adim 6 yeni mapping):\n')
spotlight = [
    # Belgian taşımaları
    ('belgian_witbier', 'wheat', 'belgian -> wheat'),
    ('belgian_blonde_ale', 'strong_ale', 'belgian -> strong_ale'),
    ('belgian_ipa', 'ipa', 'belgian -> ipa'),
    ('belgian_dubbel', 'strong_ale', 'amber_ale -> strong_ale'),
    ('belgian_tripel', 'strong_ale', 'korundu strong_ale'),
    ('belgian_strong_dark_ale', 'strong_ale', 'korundu strong_ale'),
    ('belgian_strong_golden', 'strong_ale', 'korundu strong_ale'),
    ('belgian_quadrupel', 'strong_ale', 'korundu strong_ale'),
    # Cream silindi
    ('blonde_ale', 'pale_ale', 'cream -> pale_ale'),
    ('american_cream_ale', 'pale_ale', 'cream -> pale_ale'),
    ('german_koelsch', 'pale_ale', 'cream -> pale_ale'),
    # Amber_ale silindi
    ('extra_special_bitter', 'pale_ale', 'amber_ale -> pale_ale'),
    ('ordinary_bitter', 'pale_ale', 'amber_ale -> pale_ale'),
    ('special_bitter_or_best_bitter', 'pale_ale', 'amber_ale -> pale_ale'),
    ('irish_red_ale', 'brown_ale', 'amber_ale -> brown_ale'),
    ('scottish_export', 'brown_ale', 'amber_ale -> brown_ale'),
    ('american_amber_red_ale', 'brown_ale', 'amber_ale -> brown_ale'),
    ('german_altbier', 'brown_ale', 'amber_ale -> brown_ale'),
    ('french_biere_de_garde', 'brown_ale', 'amber_ale -> brown_ale'),
    # Korundu
    ('mild', 'brown_ale', 'korundu brown_ale'),
    ('munich_dunkel', 'lager_dark', 'korundu lager_dark'),
    ('german_pilsener', 'pilsner', 'korundu pilsner'),
    ('berliner_weisse', 'sour', 'korundu sour'),
    ('french_belgian_saison', 'saison', 'korundu saison'),
    ('american_pale_ale', 'pale_ale', 'korundu pale_ale'),
]

print(f'{"slug":40s} {"expected":15s} {"actual":15s} {"durum":4s} {"not":35s}')
fail_count = 0
for slug, expected, note in spotlight:
    actual = label_family(slug)
    ok = 'PASS' if actual == expected else 'FAIL'
    if actual != expected:
        fail_count += 1
    print(f'{slug:40s} {expected:15s} {actual:15s} {ok:4s} {note:35s}')

if fail_count > 0:
    print(f'\nKRITIK: {fail_count} mapping hatasi!')
    sys.exit(1)
print(f'\nPASS: Spotlight {len(spotlight)}/{len(spotlight)}')


# === Load V21 ===
print(f'\n[1.1] V21 dataset yukleniyor... {t()}')
with open(DATASET, 'r', encoding='utf-8') as f:
    data = json.load(f)
recipes_all = data['recipes']
print(f'  V21: {len(recipes_all)} recipes  {t()}')

slug_counts = Counter(r['bjcp_slug'] for r in recipes_all if r.get('bjcp_slug'))
slug_keep = {s: c for s, c in slug_counts.items() if c >= 10}
recipes_all = [r for r in recipes_all if r.get('bjcp_slug') in slug_keep]
print(f'  >=10 filter: {len(recipes_all)} recipes, {len(slug_keep)} slugs  {t()}')


# === KATMAN 2 — RETRAIN ===
print(f'\n========== KATMAN 2 — V6 RETRAIN (14 cluster x M=2000) ==========\n')

M = 2000
cluster_slugs = defaultdict(list)
for slug, cl in SLUG_TO_NEW_CLUSTER.items():
    cluster_slugs[cl].append(slug)

# Stratified + redistribution: her cluster için slug bazlı kota hesapla
print(f'Stratified + redistribution slug kotalari:')
slug_quota = {}
for cl in sorted(cluster_slugs.keys()):
    slugs = cluster_slugs[cl]
    insuff, suff = stratified_redistribute(slugs, slug_keep, M)
    cluster_total = 0
    for s in slugs:
        q = insuff.get(s) if s in insuff else suff.get(s, 0)
        slug_quota[s] = q
        cluster_total += q
    print(f'  {cl:14s} ({len(slugs)} slug, {cluster_total} reçete):')
    for s in slugs:
        actual = slug_keep.get(s, 0)
        used = slug_quota[s]
        flag = 'YETERSIZ' if s in insuff else 'OK'
        print(f'    {s:38s} dataset_n={actual:>6d} used={used:>5d} {flag}')


# Slug bazlı stratified sample
print(f'\nSampling reference set... {t()}')
recipes_by_slug = defaultdict(list)
for r in recipes_all:
    recipes_by_slug[r['bjcp_slug']].append(r)

random.seed(42)
sampled_recipes = []
slug_sample_counts = {}
for slug, quota in slug_quota.items():
    pool = recipes_by_slug.get(slug, [])
    if len(pool) <= quota:
        chosen = pool
    else:
        chosen = random.sample(pool, quota)
    sampled_recipes.extend(chosen)
    slug_sample_counts[slug] = len(chosen)

print(f'  Total sampled: {len(sampled_recipes)} recipes  {t()}')


# Build feature matrix
print(f'\n[2.1] Feature matrix... {t()}')
X = np.array([[safe((r.get('features') or {}).get(f)) for f in COMPACT_FEATURES] for r in sampled_recipes], dtype=np.float32)
y = np.array([label_family(r['bjcp_slug']) for r in sampled_recipes])
print(f'  X: {X.shape}, y: {y.shape}  {t()}')


# 5-fold CV
print(f'\n[2.2] 5-fold CV (KNN K=5, weights=distance)... {t()}')
skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
fold_top1, fold_top3, fold_macro_f1 = [], [], []
all_y_true, all_y_pred = [], []

for fold_idx, (tr_idx, te_idx) in enumerate(skf.split(X, y)):
    sc_scaler = StandardScaler()
    Xt = sc_scaler.fit_transform(X[tr_idx])
    Xe = sc_scaler.transform(X[te_idx])
    clf = KNeighborsClassifier(n_neighbors=5, weights='distance', n_jobs=-1)
    clf.fit(Xt, y[tr_idx])
    preds = clf.predict(Xe)
    proba = clf.predict_proba(Xe)
    classes = clf.classes_

    top1 = float((preds == y[te_idx]).mean())
    top3_correct = 0
    for i, true_l in enumerate(y[te_idx]):
        top3_arr = classes[np.argsort(-proba[i])[:3]]
        if true_l in top3_arr: top3_correct += 1
    top3 = top3_correct / len(y[te_idx])
    macro_f1 = f1_score(y[te_idx], preds, average='macro', zero_division=0)

    fold_top1.append(top1)
    fold_top3.append(top3)
    fold_macro_f1.append(macro_f1)
    all_y_true.extend(y[te_idx].tolist())
    all_y_pred.extend(preds.tolist())
    print(f'  Fold {fold_idx+1}: top1={top1:.4f} top3={top3:.4f} macroF1={macro_f1:.4f}')

cv_top1 = float(np.mean(fold_top1))
cv_top1_std = float(np.std(fold_top1))
cv_top3 = float(np.mean(fold_top3))
cv_macro_f1 = float(np.mean(fold_macro_f1))
print(f'\nMEAN: top1={cv_top1:.4f} (+-{cv_top1_std:.4f}) top3={cv_top3:.4f} macroF1={cv_macro_f1:.4f}')


# Per-cluster F1
print(f'\n[2.3] Per-cluster F1... {t()}')
per_cluster_f1 = {}
per_cluster_n = {}
for cl in set(all_y_true):
    yt = [1 if t_ == cl else 0 for t_ in all_y_true]
    yp = [1 if p == cl else 0 for p in all_y_pred]
    per_cluster_f1[cl] = f1_score(yt, yp, zero_division=0)
    per_cluster_n[cl] = sum(yt)

print(f'\n{"Cluster":15s} {"n_test":>8s} {"F1":>8s}')
for cl in sorted(per_cluster_f1, key=lambda x: -per_cluster_f1[x]):
    print(f'{cl:15s} {per_cluster_n[cl]:>8d} {per_cluster_f1[cl]:>8.4f}')


# Confusion: hangi cluster'lar karistiriliyor
print(f'\n[2.4] Confusion top-pairs (top-10 yanlis)... {t()}')
confusion = Counter()
for t_, p in zip(all_y_true, all_y_pred):
    if t_ != p:
        confusion[(t_, p)] += 1
print(f'{"true":15s} {"pred":15s} {"n":>6s}')
for (t_, p), n in confusion.most_common(15):
    print(f'{t_:15s} {p:15s} {n:>6d}')


# Sanity 50 sample
print(f'\n[2.5] 50 sample sanity prediction... {t()}')
random.seed(43)
sanity_sample = random.sample(recipes_all, 50)
sc_full = StandardScaler()
X_full_s = sc_full.fit_transform(X)
clf_full = KNeighborsClassifier(n_neighbors=5, weights='distance', n_jobs=-1)
clf_full.fit(X_full_s, y)
X_sanity = np.array([[safe((r.get('features') or {}).get(f)) for f in COMPACT_FEATURES] for r in sanity_sample], dtype=np.float32)
y_sanity_true = [label_family(r['bjcp_slug']) for r in sanity_sample]
X_sanity_s = sc_full.transform(X_sanity)
y_sanity_pred = clf_full.predict(X_sanity_s)
correct = sum(1 for t_, p in zip(y_sanity_true, y_sanity_pred) if t_ == p)
print(f'Sanity 50 sample top-1: {correct}/50 = {correct/50:.4f}')


# === KATMAN 3 — SAVE ARTIFACTS ===
print(f'\n========== KATMAN 3 — SAVE ARTIFACTS ==========\n')

import joblib
joblib.dump({
    'clf': clf_full, 'scaler': sc_full, 'features': COMPACT_FEATURES,
    'classes': clf_full.classes_.tolist(),
    'slug_quota': slug_quota,
    'meta': {
        'version': 'v2.81.0',
        'cluster_count': 14,
        'sample_size': len(sampled_recipes),
        'M_total': M, 'K': 5, 'weights': 'distance',
        'random_state': 42,
        'stratified': 'redistribution_equal',
    }
}, ARCH / 'v6_reference.joblib')

with open(ARCH / 'eval_report.json', 'w', encoding='utf-8') as f:
    json.dump({
        'cv_top1_mean': cv_top1,
        'cv_top1_std': cv_top1_std,
        'cv_top3_mean': cv_top3,
        'cv_macro_f1': cv_macro_f1,
        'fold_top1': fold_top1,
        'per_cluster_f1': per_cluster_f1,
        'per_cluster_n': per_cluster_n,
        'slug_sample_counts': slug_sample_counts,
        'confusion_top15': [{'true': t_, 'pred': p, 'n': n} for (t_, p), n in confusion.most_common(15)],
        'sanity_top1': correct / 50,
        'cluster_count': 14,
    }, f, indent=2, default=str)

inline_recipes = []
for r in sampled_recipes:
    feat = r.get('features') or {}
    inline_recipes.append({
        'name': r.get('name', ''),
        'label_slug': r.get('bjcp_slug', ''),
        'label_family': label_family(r['bjcp_slug']),
        'features': {k: feat.get(k, 0) for k in COMPACT_FEATURES},
    })

with open(ARCH / 'v6_reference_inline.json', 'w', encoding='utf-8') as f:
    json.dump({
        'meta': {
            'version': 'v2.81.0',
            'cluster_count': 14,
            'recipe_count': len(inline_recipes),
            'features': COMPACT_FEATURES,
            'M_total': M, 'K': 5,
            'stratified': 'redistribution_equal',
            'date': '2026-05-01',
        },
        'recipes': inline_recipes,
    }, f, ensure_ascii=False)

# HTML embed format (X + y arrays)
X_inline = X.tolist()
y_inline = y.tolist()
with open(ARCH / 'v6_reference.json', 'w', encoding='utf-8') as f:
    json.dump({'X': X_inline, 'y': y_inline}, f)

# Meta + scaler
mean_arr = sc_full.mean_.tolist()
scale_arr = sc_full.scale_.tolist()
with open(ARCH / '_v6_scaler.json', 'w', encoding='utf-8') as f:
    json.dump({'mean': mean_arr, 'scale': scale_arr, 'features': COMPACT_FEATURES}, f)

with open(ARCH / '_v6_meta.json', 'w', encoding='utf-8') as f:
    json.dump({
        'version': 'v2.81.0',
        'cluster_count': 14,
        'recipe_count': len(sampled_recipes),
        'features': COMPACT_FEATURES,
        'classes': sorted(set(y.tolist())),
        'date': '2026-05-01',
    }, f, indent=2)

ref_sz = (ARCH / 'v6_reference.json').stat().st_size / (1024**2)
inl_sz = (ARCH / 'v6_reference_inline.json').stat().st_size / (1024**2)
print(f'  v6_reference.json (X+y): {ref_sz:.2f} MB')
print(f'  v6_reference_inline.json: {inl_sz:.2f} MB')
print(f'  v6_reference.joblib, eval_report.json, _v6_scaler.json, _v6_meta.json kaydedildi')


print(f'\n[DONE] Total: {t()}')
print(f'\n========== ADIM 6 ÖZET ==========')
print(f'  Cluster sayisi: 14')
print(f'  Recete: {len(sampled_recipes)} (M_total={M*14}, redistribution ile)')
print(f'  5-fold CV top-1: {cv_top1:.4f} (+-{cv_top1_std:.4f})')
print(f'  5-fold CV top-3: {cv_top3:.4f}')
print(f'  Macro F1: {cv_macro_f1:.4f}')
print(f'  Sanity 50: {correct/50:.4f}')
print(f'  Adim 1 baseline (17 cluster) referans: 0.5588')
print(f'  Yetersiz slug: {sum(1 for s,q in slug_quota.items() if slug_keep.get(s,0)<q)} (max kullanildi)')
