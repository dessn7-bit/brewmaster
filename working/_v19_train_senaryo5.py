#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
V19 SLUG retrain — Senaryo 5 (S4 + S1 kombo, V28f).
Source: working/_v19_train_senaryo4.py + V28f path + mcw + reg_lambda revize
Degisiklikler (sadece slug, 14cat dokunulmaz):
  S4 korunur: subsample 0.6, colsample_bytree 0.6, gamma 0.5
  S1 ekleme: min_child_weight 4 -> 6, reg_lambda 1.85 -> 2.5
Diger sabit: max_depth=4, lr=0.1, n_est=350, reg_alpha=0.85, random_state=42

Cikti (working/ icinde, deploy YOK):
  - working/_v19_v28f_s5_model_slug.json
  - working/_v19_v28f_s5_label_encoder_slug.json
  - working/_v19_v28f_s5_metrics.json
"""
import json, os, sys, time
import numpy as np
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import top_k_accuracy_score
import xgboost as xgb
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

DATA_PATH = 'working/_v28f_aliased_dataset.json'
META_FALLBACK = 'working/_v28e_aliased_dataset.json'
OUT_MODEL = 'working/_v19_v28f_s5_model_slug.json'
OUT_LE = 'working/_v19_v28f_s5_label_encoder_slug.json'
OUT_METRICS = 'working/_v19_v28f_s5_metrics.json'

print(f'[1] Loading {DATA_PATH}...', flush=True)
t_load_0 = time.time()
with open(DATA_PATH, 'r', encoding='utf-8') as f:
    data = json.load(f)
recipes = data['recipes']
if 'meta' in data and 'feature_list' in data.get('meta', {}):
    feat_list = data['meta']['feature_list']
else:
    print(f'  V28f meta feature_list eksik, V28e fallback...', flush=True)
    import ijson
    feat_list = None
    with open(META_FALLBACK, 'rb') as f2:
        for k, v in ijson.kvitems(f2, 'meta'):
            if k == 'feature_list':
                feat_list = list(v)
                break
    if not feat_list:
        raise SystemExit('feature_list ne V28f ne V28e metada bulundu')
print(f'  V19: {len(recipes)} recipes, {len(feat_list)} features ({time.time()-t_load_0:.1f}s)', flush=True)

SLUG_TO_CLUSTER = {
    'american_brown_ale':'brown_ale','mild':'brown_ale','brown_ale':'brown_ale',
    'irish_red_ale':'brown_ale','scottish_export':'brown_ale',
    'american_amber_red_ale':'brown_ale','german_altbier':'brown_ale',
    'french_biere_de_garde':'brown_ale',
    'german_doppelbock':'bock','german_heller_bock_maibock':'bock',
    'german_bock':'bock','dunkles_bock':'bock',
    'american_india_pale_ale':'ipa','double_ipa':'ipa',
    'british_india_pale_ale':'ipa','black_ipa':'ipa','white_ipa':'ipa',
    'red_ipa':'ipa','rye_ipa':'ipa','juicy_or_hazy_india_pale_ale':'ipa',
    'belgian_ipa':'ipa',
    'american_lager':'lager','german_maerzen':'lager','common_beer':'lager',
    'vienna_lager':'lager','munich_helles':'lager','pale_lager':'lager',
    'dortmunder_european_export':'lager','bamberg_maerzen_rauchbier':'lager',
    'kellerbier':'lager','german_oktoberfest_festbier':'lager',
    'german_schwarzbier':'lager_dark','munich_dunkel':'lager_dark',
    'american_pale_ale':'pale_ale','english_pale_ale':'pale_ale',
    'blonde_ale':'pale_ale','american_cream_ale':'pale_ale',
    'german_koelsch':'pale_ale','extra_special_bitter':'pale_ale',
    'special_bitter_or_best_bitter':'pale_ale','ordinary_bitter':'pale_ale',
    'cream_ale':'pale_ale','golden_or_blonde_ale':'pale_ale',
    'german_pilsener':'pilsner','pre_prohibition_lager':'pilsner',
    'robust_porter':'porter','brown_porter':'porter',
    'baltic_porter':'porter','porter':'porter',
    'french_belgian_saison':'saison','specialty_saison':'saison',
    'berliner_weisse':'sour','flanders_red_ale':'sour','belgian_lambic':'sour',
    'belgian_fruit_lambic':'sour','oud_bruin':'sour',
    'mixed_fermentation_sour_beer':'sour','gose':'sour',
    'belgian_gueuze':'sour','brett_beer':'sour',
    'specialty_beer':'specialty','herb_and_spice_beer':'specialty',
    'fruit_beer':'specialty','winter_seasonal_beer':'specialty',
    'smoked_beer':'specialty','experimental_beer':'specialty',
    'american_imperial_stout':'stout','stout':'stout','oatmeal_stout':'stout',
    'sweet_stout':'stout','irish_dry_stout':'stout','export_stout':'stout',
    'sweet_stout_or_cream_stout':'stout',
    'belgian_tripel':'strong_ale','belgian_strong_dark_ale':'strong_ale',
    'american_barley_wine_ale':'strong_ale','scotch_ale_or_wee_heavy':'strong_ale',
    'belgian_strong_golden':'strong_ale','old_ale':'strong_ale',
    'british_barley_wine_ale':'strong_ale','american_strong_pale_ale':'strong_ale',
    'belgian_quadrupel':'strong_ale','belgian_blonde_ale':'strong_ale',
    'belgian_dubbel':'strong_ale',
    'american_barleywine':'strong_ale',
    'american_wheat_ale':'wheat','south_german_hefeweizen':'wheat',
    'south_german_dunkel_weizen':'wheat','south_german_weizenbock':'wheat',
    'german_rye_ale':'wheat','belgian_witbier':'wheat',
    # Sub-sprint 1 V28f Hefeweizen reslug yeni slug'lar (BA 2026 destekli)
    'south_german_bernsteinfarbenes_weizen':'wheat',
    'german_leichtes_weizen':'wheat',
    'american_wheat_beer':'wheat',
    # AMERICAN_WHEAT_WINE_ALE -> strong_ale (KAAN KARAR 1)
    'american_wheat_wine_ale':'strong_ale',
}

print(f'[2] Compute bjcp_main_category...', flush=True)
for r in recipes:
    r['bjcp_main_category'] = SLUG_TO_CLUSTER.get(r.get('bjcp_slug'), 'other')

slug_counts = Counter(r['bjcp_slug'] for r in recipes if r.get('bjcp_slug'))
slug_keep = {s for s, c in slug_counts.items() if c >= 10}
print(f'[3] Slug filter ≥10: {len(slug_keep)} slugs', flush=True)
recipes_slug = [r for r in recipes if r.get('bjcp_slug') in slug_keep]

print(f'[4] Stratified split 80/20 (random_state=42)...', flush=True)
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


print('\n' + '=' * 60)
print('V19 SLUG MODEL — Senaryo 5 V28f (S4 + S1 kombo: subsample 0.6, colsample 0.6, gamma 0.5, mcw 6, reg_lambda 2.5)')
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

t_train_0 = time.time()
print(f'Training V19 slug S5 V28f (depth=4, n_est=350, hist, subsample=0.6, colsample=0.6, gamma=0.5, mcw=6, reg_lambda=2.5)...', flush=True)
ms = xgb.XGBClassifier(
    objective='multi:softprob', num_class=len(le_s.classes_),
    max_depth=4, learning_rate=0.1, n_estimators=350,
    subsample=0.6, colsample_bytree=0.6, gamma=0.5,
    tree_method='hist',
    eval_metric='mlogloss', random_state=42, verbosity=1,
    reg_lambda=2.5, reg_alpha=0.85, min_child_weight=6, n_jobs=-1)
ms.fit(Xs_tr, ys_tr_enc)
train_seconds = time.time() - t_train_0
print(f'Train completed in {train_seconds:.1f}s', flush=True)

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
print(f'\n[V19 slug S5 V28f] train t1: {ts1_tr:.4f}  test t1: {ts1:.4f}  t3: {ts3:.4f}  t5: {ts5:.4f}', flush=True)
print(f'[V19 slug S5 V28f] TRAIN-TEST GAP: {slug_gap:.4f} ({slug_gap*100:+.2f}pp) — KURAL 4: <5pp threshold', flush=True)
if slug_gap < 0.05:
    print('  PASS', flush=True)
else:
    print(f'  FAIL — gap >= 5pp', flush=True)

slug_predictions = proba_s.argmax(axis=1)
slug_per = {}
for ci, sl in enumerate(le_s.classes_):
    n = int(sum(1 for v in ys_te_enc if v == ci))
    if n == 0: continue
    c1 = int(sum(1 for tc, pc in zip(ys_te_enc, slug_predictions) if tc == ci and pc == ci))
    c3 = int(sum(1 for tc, pr in zip(ys_te_enc, proba_s) if tc == ci and ci in pr.argsort()[-3:]))
    slug_per[sl] = {'n': n, 'top1': c1/n, 'top3': c3/n}

ms.get_booster().save_model(OUT_MODEL)
sz_s = os.path.getsize(OUT_MODEL) / 1024
print(f'\nWrote {OUT_MODEL} ({sz_s:.0f} KB)', flush=True)
with open(OUT_LE, 'w', encoding='utf-8') as f:
    json.dump({'classes': le_s.classes_.tolist(), 'n_classes': len(le_s.classes_), 'feature_list': feat_list},
              f, indent=2, ensure_ascii=False)

out = {
    'version': 'v19_s5_v28f',
    'senaryo': 'Senaryo 5 — S4 + S1 kombo (V28f, sampling + gamma + mcw + reg_lambda)',
    'parametre_degisiklikleri_v28f_baseline': {
        'subsample': '0.8 -> 0.6 (S4)',
        'colsample_bytree': '0.8 -> 0.6 (S4)',
        'gamma': '0 -> 0.5 (S4)',
        'min_child_weight': '4 -> 6 (S1)',
        'reg_lambda': '1.85 -> 2.5 (S1)',
    },
    'sabit_parametreler': {
        'max_depth': 4, 'learning_rate': 0.1, 'n_estimators': 350,
        'reg_alpha': 0.85, 'random_state': 42, 'tree_method': 'hist',
    },
    'dataset': {'recipes': len(recipes), 'features': len(feat_list), 'slug_classes': len(le_s.classes_)},
    'slug': {
        'classes': len(le_s.classes_),
        'train_top1': ts1_tr, 'test_top1': ts1, 'test_top3': ts3, 'test_top5': ts5,
        'gap': slug_gap, 'gate_pass': slug_gap < 0.05,
        'per_slug': slug_per,
    },
    'train_seconds': round(train_seconds, 1),
}
with open(OUT_METRICS, 'w', encoding='utf-8') as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
print(f'\nWrote {OUT_METRICS}', flush=True)
print('[V19 SENARYO 5 V28f SLUG TRAIN DONE]', flush=True)
