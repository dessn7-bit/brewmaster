"""Deney 1 — Eski V6 (1100 reçete) V19-aliased holdout cluster-level performans ölçümü.

Adımlar:
1. HTML'den eski V6 TRAINING_RECS extract
2. V19-aliased'tan 5K rastgele holdout (eski V6 name overlap kontrolü)
3. Eski V6 KNN model fit (slug-level, K=5, weighted='distance')
4. Holdout predict + slug → cluster post-mapping
5. Cluster-level top-1, top-3 hesapla
6. Per-cluster accuracy
"""
import json, sys, math, re, random
import numpy as np
from collections import Counter, defaultdict
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
random.seed(42); np.random.seed(42)


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

# Common feature subset (56) — V19 + eski V6 ortak
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


# === 1. Eski V6 extract from HTML ===
print('[1] Eski V6 extract from HTML...', flush=True)
with open('Brewmaster_v2_79_10.html', 'r', encoding='utf-8') as f:
    html = f.read()
m = re.search(r'const TRAINING_RECS = (\[.*?\]);', html, re.DOTALL)
old_v6_recs = json.loads(m.group(1))
print(f'  Eski V6: {len(old_v6_recs)} recipe', flush=True)

# Cluster-mapped subset
old_v6_with_cluster = []
old_v6_names = set()
for r in old_v6_recs:
    slug = r.get('label_slug')
    cluster = SLUG_TO_CLUSTER.get(slug)
    if cluster:
        old_v6_with_cluster.append({'features': r['features'], 'slug': slug, 'cluster': cluster, 'name': r['name']})
        old_v6_names.add((r['name'] or '').lower().strip())
print(f'  Cluster-mapped: {len(old_v6_with_cluster)}', flush=True)
print(f'  Unique names: {len(old_v6_names)}', flush=True)


# === 2. V19-aliased holdout (5K) ===
print('\n[2] V19-aliased holdout sample (5K, no overlap)...', flush=True)
with open('working/_v19_aliased_dataset.json', 'r', encoding='utf-8') as f:
    v19 = json.load(f)
v19_recs = v19['recipes']
print(f'  V19-aliased: {len(v19_recs)}', flush=True)

# Filter overlap (name match)
v19_no_overlap = []
overlap_count = 0
for r in v19_recs:
    rname = (r.get('name') or '').lower().strip()
    if rname and rname in old_v6_names:
        overlap_count += 1
        continue
    if r.get('bjcp_slug') in SLUG_TO_CLUSTER:
        v19_no_overlap.append(r)
print(f'  Overlap (name match): {overlap_count}', flush=True)
print(f'  V19-aliased no-overlap pool: {len(v19_no_overlap)}', flush=True)

random.seed(42)
holdout = random.sample(v19_no_overlap, 5000)
print(f'  Holdout: {len(holdout)} sampled', flush=True)


# === 3. Eski V6 KNN fit ===
print('\n[3] Eski V6 KNN model fit (slug-level, K=5, weighted=distance)...', flush=True)


def to_xy(recs, label_key='slug'):
    X = []
    y = []
    for r in recs:
        feats = r.get('features') if 'features' in r else (r.get('features') or {})
        if isinstance(r, dict) and 'features' in r:
            feats = r['features']
        vec = [feats.get(f, 0) or 0 for f in COMPACT_FEATURES]
        X.append(vec)
        if label_key == 'slug':
            y.append(r.get('slug') or r.get('bjcp_slug'))
        else:
            y.append(r.get('cluster') or SLUG_TO_CLUSTER.get(r.get('bjcp_slug')))
    return np.array(X, dtype=np.float32), np.array(y)


X_train_old, y_train_old_slug = to_xy(old_v6_with_cluster, 'slug')
print(f'  Train X shape: {X_train_old.shape}', flush=True)

scaler = StandardScaler()
X_train_s = scaler.fit_transform(X_train_old)

knn = KNeighborsClassifier(n_neighbors=5, weights='distance', n_jobs=-1)
knn.fit(X_train_s, y_train_old_slug)


# === 4. Holdout predict + slug → cluster post-mapping ===
print('\n[4] Holdout predict (slug-level, post-map cluster)...', flush=True)
X_holdout, y_holdout_slug_raw = to_xy([{'features': r.get('features') or {}, 'bjcp_slug': r.get('bjcp_slug')} for r in holdout], 'slug')
y_holdout_cluster = np.array([SLUG_TO_CLUSTER.get(s) for s in y_holdout_slug_raw])
X_holdout_s = scaler.transform(X_holdout)

# Predict slug
pred_slug = knn.predict(X_holdout_s)
# Map predicted slug → cluster
pred_cluster = np.array([SLUG_TO_CLUSTER.get(s) for s in pred_slug])

# Top-3 cluster (post-map)
proba = knn.predict_proba(X_holdout_s)
classes = knn.classes_

top1_correct = 0; top3_correct = 0
per_class_correct = Counter(); per_class_n = Counter()

for i in range(len(holdout)):
    true_cluster = y_holdout_cluster[i]
    if true_cluster is None:
        continue
    per_class_n[true_cluster] += 1

    # Top-1
    if pred_cluster[i] == true_cluster:
        top1_correct += 1
        per_class_correct[true_cluster] += 1

    # Top-3 cluster (slug proba'larını cluster'a aggregate et)
    cluster_probs = defaultdict(float)
    for ci, slug in enumerate(classes):
        c = SLUG_TO_CLUSTER.get(slug)
        if c:
            cluster_probs[c] += proba[i][ci]
    top_clusters = sorted(cluster_probs.items(), key=lambda x: -x[1])[:3]
    if true_cluster in [c for c, _ in top_clusters]:
        top3_correct += 1

n = sum(per_class_n.values())
top1_acc = top1_correct / n
top3_acc = top3_correct / n
print(f'\n  V19-aliased holdout (n={n}):', flush=True)
print(f'  TOP-1 cluster acc: {top1_acc*100:.2f}%', flush=True)
print(f'  TOP-3 cluster acc: {top3_acc*100:.2f}%', flush=True)


# Per-cluster
print(f'\n  Per-cluster accuracy:', flush=True)
print(f'  {"cluster":<12} {"n":>5} {"correct":>7} {"acc":>7}', flush=True)
for c in sorted(per_class_n.keys()):
    pn = per_class_n[c]
    pc = per_class_correct[c]
    print(f'  {c:<12} {pn:>5d} {pc:>7d} {100*pc/pn if pn else 0:>6.2f}%', flush=True)


# Save
results = {
    'experiment': 'D1 — Eski V6 baseline V19-aliased holdout',
    'old_v6_recipes': len(old_v6_with_cluster),
    'overlap_v19_old_v6': overlap_count,
    'v19_no_overlap_pool': len(v19_no_overlap),
    'holdout_n': n,
    'top1_cluster_acc': round(top1_acc, 4),
    'top3_cluster_acc': round(top3_acc, 4),
    'per_cluster': {c: {'n': per_class_n[c], 'correct': per_class_correct[c],
                        'acc': round(per_class_correct[c]/per_class_n[c] if per_class_n[c] else 0, 4)}
                    for c in per_class_n},
}
with open('_step60c_d1_old_v6_baseline.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2, ensure_ascii=False)
print(f'\n[DONE] _step60c_d1_old_v6_baseline.json yazıldı', flush=True)
