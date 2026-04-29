#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""V19 retrain — V18.3 + 8 yeni feature (rmwoods misc/hops merged) + sweet spot reg tuning."""
import json, os, sys
import numpy as np
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import top_k_accuracy_score
import xgboost as xgb
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

DATA_PATH = 'working/_v19_dataset.json'

print(f'[1] Loading {DATA_PATH}...', flush=True)
with open(DATA_PATH, 'r', encoding='utf-8') as f:
    data = json.load(f)
recipes = data['recipes']
feat_list = data['meta']['feature_list']
print(f'  V19: {len(recipes)} recipes, {len(feat_list)} features', flush=True)


SLUG_TO_CLUSTER = {
    'belgian_lambic': 'sour', 'oud_bruin': 'sour', 'berliner_weisse': 'sour',
    'mixed_fermentation_sour_beer': 'sour', 'brett_beer': 'sour',
    'fruit_beer': 'specialty', 'herb_and_spice_beer': 'specialty',
    'winter_seasonal_beer': 'specialty', 'smoked_beer': 'specialty',
    'specialty_beer': 'specialty', 'experimental_beer': 'specialty',
    'american_india_pale_ale': 'ipa', 'double_ipa': 'ipa', 'black_ipa': 'ipa',
    'juicy_or_hazy_india_pale_ale': 'ipa', 'british_india_pale_ale': 'ipa',
    'irish_dry_stout': 'stout', 'sweet_stout': 'stout', 'sweet_stout_or_cream_stout': 'stout',
    'oatmeal_stout': 'stout', 'stout': 'stout', 'american_imperial_stout': 'stout',
    'brown_porter': 'porter', 'robust_porter': 'porter', 'baltic_porter': 'porter', 'porter': 'porter',
    'american_pale_ale': 'pale_ale', 'english_pale_ale': 'pale_ale',
    'american_amber_red_ale': 'pale_ale', 'american_strong_pale_ale': 'pale_ale',
    'belgian_witbier': 'belgian', 'belgian_blonde_ale': 'belgian', 'belgian_dubbel': 'belgian',
    'belgian_tripel': 'belgian', 'belgian_strong_dark_ale': 'belgian',
    'belgian_strong_golden': 'belgian', 'belgian_quadrupel': 'belgian',
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
    'american_barley_wine_ale': 'barleywine', 'american_barleywine': 'barleywine',
    'british_barley_wine_ale': 'barleywine',
    'flanders_red_ale': 'sour', 'belgian_gueuze': 'sour',
    'belgian_fruit_lambic': 'sour', 'gose': 'sour',
    'export_stout': 'stout',
    'red_ipa': 'ipa', 'white_ipa': 'ipa', 'rye_ipa': 'ipa',
    'belgian_ipa': 'belgian',
}

print(f'[2] Compute bjcp_main_category...', flush=True)
for r in recipes:
    r['bjcp_main_category'] = SLUG_TO_CLUSTER.get(r.get('bjcp_slug'), 'other')
print(f'  main_cat counts: {Counter(r["bjcp_main_category"] for r in recipes)}', flush=True)

slug_counts = Counter(r['bjcp_slug'] for r in recipes if r.get('bjcp_slug'))
slug_keep = {s for s, c in slug_counts.items() if c >= 10}
print(f'[3] Slug filter ≥10: {len(slug_keep)} slugs', flush=True)
recipes_slug = [r for r in recipes if r.get('bjcp_slug') in slug_keep]

print(f'[4] Stratified split 80/20...', flush=True)
all_idx = list(range(len(recipes_slug)))
y_all = [r['bjcp_slug'] for r in recipes_slug]
tr_idx, te_idx = train_test_split(all_idx, test_size=0.2, random_state=42, stratify=y_all)
train_set = set(tr_idx)
for i, r in enumerate(recipes_slug):
    r['_in_split'] = 'train' if i in train_set else 'test'

train_recs = [r for r in recipes_slug if r.get('_in_split') == 'train']
test_recs = [r for r in recipes_slug if r.get('_in_split') == 'test']
print(f'  train: {len(train_recs)}  test: {len(test_recs)}', flush=True)


def to_xy(recs, lf):
    X = np.array([[r['features'].get(k, 0) or 0 for k in feat_list] for r in recs], dtype=np.float32)
    y = [r[lf] for r in recs]
    return X, y


# 14cat
print('\n' + '=' * 60)
print('V19 14-CATEGORY MODEL')
print('=' * 60, flush=True)
X_tr, y_tr = to_xy(train_recs, 'bjcp_main_category')
X_te, y_te = to_xy(test_recs, 'bjcp_main_category')
le = LabelEncoder(); le.fit(y_tr)
y_tr_enc = le.transform(y_tr)
keep = [i for i, s in enumerate(y_te) if s in set(le.classes_)]
y_te_enc = le.transform([y_te[i] for i in keep])
X_te_kept = X_te[keep]
print(f'Classes: {len(le.classes_)}, train n={len(X_tr)}, test n={len(X_te_kept)}', flush=True)

print(f'Training V19 14cat (depth=3, n_est=200, hist) — sweet spot reg: alpha=0.85 lambda=1.85...', flush=True)
m = xgb.XGBClassifier(objective='multi:softprob', num_class=len(le.classes_),
    max_depth=3, learning_rate=0.1, n_estimators=200,
    subsample=0.8, colsample_bytree=0.8, tree_method='hist',
    eval_metric='mlogloss', random_state=42, verbosity=1,
    reg_lambda=1.85, reg_alpha=0.85, n_jobs=-1)
m.fit(X_tr, y_tr_enc)
proba_tr = m.predict_proba(X_tr)
proba = m.predict_proba(X_te_kept)
labels = list(range(len(le.classes_)))


def topk(y, p, k):
    return float(top_k_accuracy_score(y, p, k=k, labels=labels))


t1_tr = topk(y_tr_enc, proba_tr, 1)
t1 = topk(y_te_enc, proba, 1)
t3 = topk(y_te_enc, proba, 3)
t5 = topk(y_te_enc, proba, 5)
print(f'\n[V19 14cat] train: {t1_tr:.4f}  test t1: {t1:.4f}  t3: {t3:.4f}  t5: {t5:.4f}', flush=True)
print(f'Gap: {t1_tr - t1:+.4f}', flush=True)

preds = proba.argmax(axis=1)
sup, cor, t3cor = {}, {}, {}
for c in y_te_enc: sup[c] = sup.get(c, 0) + 1
for tc, pc, prob in zip(y_te_enc, preds, proba):
    if tc == pc: cor[tc] = cor.get(tc, 0) + 1
    if tc in prob.argsort()[-3:]: t3cor[tc] = t3cor.get(tc, 0) + 1

per_class = []
print('\nPer-class:', flush=True)
for ci in sorted(sup.keys(), key=lambda c: -sup[c]):
    nm = le.classes_[ci]; n = sup[ci]; c = cor.get(ci, 0); t3v = t3cor.get(ci, 0)
    per_class.append({'main_cat': nm, 'n': n, 'correct': c, 'top3': t3v,
                      'acc': c/n if n else 0, 'top3_acc': t3v/n if n else 0})
    print(f'  {nm:<15} n={n:>6d}  top1={c:>6d} ({c/n:.3f})  top3={t3v:>6d} ({t3v/n:.3f})', flush=True)

m.get_booster().save_model('_v19_model_14cat.json')
sz = os.path.getsize('_v19_model_14cat.json') / 1024
print(f'\nWrote _v19_model_14cat.json ({sz:.0f} KB)', flush=True)
with open('_v19_label_encoder_14cat.json', 'w', encoding='utf-8') as f:
    json.dump({'classes': le.classes_.tolist(), 'n_classes': len(le.classes_), 'feature_list': feat_list},
              f, indent=2, ensure_ascii=False)


# Slug
print('\n' + '=' * 60)
print('V19 SLUG MODEL')
print('=' * 60, flush=True)
print(f'Slugs ≥10: {len(slug_keep)}', flush=True)

Xs_tr, ys_tr = to_xy(train_recs, 'bjcp_slug')
Xs_te, ys_te = to_xy(test_recs, 'bjcp_slug')
le_s = LabelEncoder(); le_s.fit(ys_tr)
ys_tr_enc = le_s.transform(ys_tr)
keep_s = [i for i, s in enumerate(ys_te) if s in set(le_s.classes_)]
ys_te_enc = le_s.transform([ys_te[i] for i in keep_s])
Xs_te_kept = Xs_te[keep_s]
print(f'  Slug train: {len(Xs_tr)}  test: {len(Xs_te_kept)}', flush=True)

print(f'Training V19 slug (depth=4, n_est=350, hist) — sweet spot reg: alpha=0.85 lambda=1.85 mcw=4...', flush=True)
ms = xgb.XGBClassifier(objective='multi:softprob', num_class=len(le_s.classes_),
    max_depth=4, learning_rate=0.1, n_estimators=350,
    subsample=0.8, colsample_bytree=0.8, tree_method='hist',
    eval_metric='mlogloss', random_state=42, verbosity=1,
    reg_lambda=1.85, reg_alpha=0.85, min_child_weight=4, n_jobs=-1)
ms.fit(Xs_tr, ys_tr_enc)
proba_s = ms.predict_proba(Xs_te_kept)
labels_s = list(range(len(le_s.classes_)))


def topk_s(y, p, k):
    return float(top_k_accuracy_score(y, p, k=k, labels=labels_s))


proba_s_tr = ms.predict_proba(Xs_tr)
ts1_tr = topk_s(ys_tr_enc, proba_s_tr, 1)
ts1 = topk_s(ys_te_enc, proba_s, 1)
ts3 = topk_s(ys_te_enc, proba_s, 3)
ts5 = topk_s(ys_te_enc, proba_s, 5)
slug_gap = ts1_tr - ts1
print(f'\n[V19 slug] train t1: {ts1_tr:.4f}  test t1: {ts1:.4f}  t3: {ts3:.4f}  t5: {ts5:.4f}', flush=True)
print(f'[V19 slug] TRAIN-TEST GAP: {slug_gap:.4f} ({slug_gap*100:+.2f}pp) — KURAL 4: <5pp PASS', flush=True)
if slug_gap < 0.05:
    print('  ✅ PASS', flush=True)
else:
    print(f'  🔴 FAIL — gap >= 5pp', flush=True)

slug_predictions = proba_s.argmax(axis=1)
slug_per = {}
for ci, sl in enumerate(le_s.classes_):
    n = int(sum(1 for v in ys_te_enc if v == ci))
    if n == 0: continue
    c1 = int(sum(1 for tc, pc in zip(ys_te_enc, slug_predictions) if tc == ci and pc == ci))
    c3 = int(sum(1 for tc, pr in zip(ys_te_enc, proba_s) if tc == ci and ci in pr.argsort()[-3:]))
    slug_per[sl] = {'n': n, 'top1': c1/n, 'top3': c3/n}

SPOTLIGHT = ['american_india_pale_ale', 'american_pale_ale', 'specialty_beer',
             'french_belgian_saison', 'south_german_hefeweizen', 'belgian_witbier',
             'belgian_dubbel', 'belgian_tripel', 'belgian_quadrupel',
             'belgian_strong_dark_ale', 'belgian_strong_golden', 'belgian_blonde_ale',
             'belgian_ipa', 'rye_ipa', 'white_ipa', 'red_ipa', 'black_ipa',
             'juicy_or_hazy_india_pale_ale', 'gose', 'belgian_gueuze',
             'belgian_lambic', 'belgian_fruit_lambic', 'flanders_red_ale',
             'oud_bruin', 'berliner_weisse', 'mixed_fermentation_sour_beer',
             'brett_beer', 'dunkles_bock', 'german_oktoberfest_festbier',
             'kellerbier', 'english_pale_ale', 'extra_special_bitter',
             'special_bitter_or_best_bitter', 'ordinary_bitter',
             'blonde_ale', 'export_stout', 'specialty_saison']

print('\nSpotlight slug metrics:', flush=True)
for sl in SPOTLIGHT:
    if sl in slug_per:
        v = slug_per[sl]
        print(f'  {sl:<40} n={v["n"]:>6d}  top1={v["top1"]:.3f}  top3={v["top3"]:.3f}', flush=True)

ms.get_booster().save_model('_v19_model_slug.json')
sz_s = os.path.getsize('_v19_model_slug.json') / 1024
print(f'\nWrote _v19_model_slug.json ({sz_s:.0f} KB)', flush=True)
with open('_v19_label_encoder_slug.json', 'w', encoding='utf-8') as f:
    json.dump({'classes': le_s.classes_.tolist(), 'n_classes': len(le_s.classes_), 'feature_list': feat_list},
              f, indent=2, ensure_ascii=False)

out = {
    'version': 'v19',
    'dataset_recipes': len(recipes),
    'dataset_features': len(feat_list),
    '14cat': {
        'train_top1': t1_tr, 'test_top1': t1, 'test_top3': t3, 'test_top5': t5,
        'gap': t1_tr - t1, 'per_class': per_class,
    },
    'slug': {
        'classes': len(le_s.classes_),
        'train_top1': ts1_tr, 'test_top1': ts1, 'test_top3': ts3, 'test_top5': ts5,
        'gap': slug_gap, 'gate_pass': slug_gap < 0.05,
        'per_slug': slug_per,
    },
    'reg_tuning': {'alpha': 0.85, 'lambda': 1.85, 'mcw': 4, 'n_estimators': 350, 'max_depth': 4},
}
with open('_v19_metrics.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
print('\nWrote _v19_metrics.json', flush=True)
print('[V19 TRAIN DONE]', flush=True)
