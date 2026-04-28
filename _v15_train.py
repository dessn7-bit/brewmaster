#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""V15 retrain — V14 + cleaning + BYO recovery + 5 Brett feature.
Input: brewmaster_v15_cleaned.json (8416 reçete, 81 feature)
Output: _v15_model_14cat.json, _v15_label_encoder_14cat.json, _v15_metrics.json
"""

import json
import os
import re as _re
import numpy as np
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import top_k_accuracy_score, accuracy_score
import xgboost as xgb

DATA_PATH = 'brewmaster_v15_cleaned.json'

with open(DATA_PATH, 'r', encoding='utf-8') as f:
    data = json.load(f)
recipes = data['recipes']
feat_list = data['meta']['feature_list']
print(f'V15 dataset: {len(recipes)} recipes, {len(feat_list)} features')


def recipe_text(r):
    parts = []
    if r.get('name'):
        parts.append(str(r['name']))
    if r.get('sorte_raw'):
        parts.append(str(r['sorte_raw']))
    raw = r.get('raw') or {}
    if raw.get('notes'):
        parts.append(str(raw['notes']))
    if raw.get('author'):
        parts.append(str(raw['author']))
    if raw.get('malts'):
        parts.append(' '.join((m.get('name') or '') for m in raw['malts'] if isinstance(m, dict)))
    if raw.get('hops'):
        parts.append(' '.join((h.get('name') or '') for h in raw['hops'] if isinstance(h, dict)))
    if raw.get('yeast'):
        parts.append(str(raw['yeast']))
    return ' '.join(parts).lower()


def detect_features(r):
    """V14 feature recompute: ingredient & yeast pattern features."""
    text = recipe_text(r)
    y = r.get('raw', {}).get('yeast', '')
    if isinstance(y, list):
        y = ' '.join(str(x) for x in y)
    yLower = str(y).lower()
    BELGIAN = ['wyeast 1214', 'wy1214', 'wyeast 1762', 'wy1762', 'wyeast 1388', 'wy1388',
               'wyeast 3787', 'wy3787', 'wyeast 3522', 'wy3522', 'wyeast 3864', 'wy3864',
               'wlp500', 'wlp 500', 'wlp530', 'wlp 530', 'wlp540', 'wlp 540', 'wlp565',
               'wlp 565', 'wlp570', 'wlp 570', 'wlp575', 'wlp 575', 'wlp590', 'wlp 590',
               'safbrew abbaye', 'lalbrew abbaye', 'lallemand abbaye', 'belle saison']
    CLEAN_US05 = ['wyeast 1056', 'wy1056', 'wlp001', 'wlp 001', 'safale us-05',
                  'safale us05', 'us-05', 'us05', 'bry-97', 'bry97', 'chico']
    return {
        'has_coffee': 1 if _re.search(r'\b(coffee|espresso|cold[\s-]?brew|caffè)\b', text) else 0,
        'has_fruit': 1 if _re.search(r'\b(raspberry|blueberry|cherry|peach|mango|passionfruit|apricot|pineapple|strawberry|blackberry|lime|lemon zest|orange peel|frambozen|himbeere|kirsche|aardbei|pomegranate)\b', text) else 0,
        'has_spice': 1 if _re.search(r'\b(coriander|cardamom|cinnamon|vanilla bean|black pepper|ginger|anise|nutmeg|clove|kruidnagel|kaneel|gember)\b', text) else 0,
        'has_chili': 1 if _re.search(r'\b(chipotle|jalape[ñn]o|habanero|ghost pepper|chili pepper|chili|ancho|poblano|chile)\b', text) else 0,
        'has_smoke': 1 if _re.search(r'\b(smoke|smoked|rauch|peat|gerookt|isli)\b(?!\s*malt|\s*malz|mout)', text) else 0,
        'has_belgian_yeast': 1 if any(b in yLower for b in BELGIAN) else 0,
        'has_clean_us05_isolate': 1 if any(c in yLower for c in CLEAN_US05) else 0,
    }


# Re-derive feature additions (don't touch Brett features, those are already set by cleaning)
for r in recipes:
    feats = detect_features(r)
    for k, v in feats.items():
        r['features'][k] = v

print('\nFeature recompute done. Sample feature counts:')
for k in ('has_coffee', 'has_fruit', 'has_spice', 'has_chili', 'has_smoke',
          'has_belgian_yeast', 'has_clean_us05_isolate',
          'has_brett', 'has_lacto', 'has_pedio', 'is_mixed_fermentation', 'is_100pct_brett'):
    n = sum(1 for r in recipes if r['features'].get(k))
    print(f'  {k:<28} {n}')

train_recs = [r for r in recipes if r.get('in_split') == 'train']
test_recs = [r for r in recipes if r.get('in_split') == 'test']
print(f'\nSplit: train={len(train_recs)} test={len(test_recs)}')


def to_xy(recs, lf):
    X = np.array([[r['features'].get(k, 0) or 0 for k in feat_list] for r in recs], dtype=np.float32)
    y = [r[lf] for r in recs]
    return X, y


# ==================== 14-category model (main_category) ====================
print('\n' + '=' * 60)
print('V15 14-CATEGORY MODEL (bjcp_main_category)')
print('=' * 60)
X_tr, y_tr = to_xy(train_recs, 'bjcp_main_category')
X_te, y_te = to_xy(test_recs, 'bjcp_main_category')
le = LabelEncoder()
le.fit(y_tr)
y_tr_enc = le.transform(y_tr)
keep = [i for i, s in enumerate(y_te) if s in set(le.classes_)]
y_te_enc = le.transform([y_te[i] for i in keep])
X_te_kept = X_te[keep]
print(f'Classes: {len(le.classes_)}')

print('\nCV (5-fold)')
skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
cv = []
for tr_i, vl_i in skf.split(X_tr, y_tr_enc):
    m = xgb.XGBClassifier(
        objective='multi:softprob', num_class=len(le.classes_),
        max_depth=3, learning_rate=0.1, n_estimators=200,
        subsample=0.8, colsample_bytree=0.8, tree_method='hist',
        eval_metric='mlogloss', random_state=42, verbosity=0,
        reg_lambda=1.0, reg_alpha=0.5,
    )
    m.fit(X_tr[tr_i], y_tr_enc[tr_i])
    cv.append(accuracy_score(y_tr_enc[vl_i], m.predict(X_tr[vl_i])))
cv_mean = float(np.mean(cv))
print(f'CV mean: {cv_mean:.4f}')

m = xgb.XGBClassifier(
    objective='multi:softprob', num_class=len(le.classes_),
    max_depth=3, learning_rate=0.1, n_estimators=200,
    subsample=0.8, colsample_bytree=0.8, tree_method='hist',
    eval_metric='mlogloss', random_state=42, verbosity=0,
    reg_lambda=1.0, reg_alpha=0.5,
)
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
print(f'\n[V15 14cat] train: {t1_tr:.4f}  test t1: {t1:.4f}  t3: {t3:.4f}  t5: {t5:.4f}')
print(f'Gap: {t1_tr - t1:+.4f}')

preds = proba.argmax(axis=1)
sup, cor, t3cor = {}, {}, {}
for c in y_te_enc:
    sup[c] = sup.get(c, 0) + 1
for tc, pc, prob in zip(y_te_enc, preds, proba):
    if tc == pc:
        cor[tc] = cor.get(tc, 0) + 1
    if tc in prob.argsort()[-3:]:
        t3cor[tc] = t3cor.get(tc, 0) + 1
per_class = []
print('\nPer-class:')
for ci in sorted(sup.keys(), key=lambda c: -sup[c]):
    nm = le.classes_[ci]
    n = sup[ci]
    c = cor.get(ci, 0)
    t3v = t3cor.get(ci, 0)
    per_class.append({
        'main_cat': nm, 'n': n, 'correct': c, 'top3': t3v,
        'acc': c / n if n else 0, 'top3_acc': t3v / n if n else 0,
    })
    print(f'  {nm:<35} n={n:3d}  top1={c:3d} ({c/n:.2f})  top3={t3v:3d} ({t3v/n:.2f})')

m.get_booster().save_model('_v15_model_14cat.json')
sz = os.path.getsize('_v15_model_14cat.json') / 1024
print(f'\nWrote _v15_model_14cat.json ({sz:.0f} KB)')
with open('_v15_label_encoder_14cat.json', 'w', encoding='utf-8') as f:
    json.dump({'classes': le.classes_.tolist(), 'n_classes': len(le.classes_), 'feature_list': feat_list},
              f, indent=2, ensure_ascii=False)

# ==================== Slug-level model (multi-class slug) ====================
print('\n' + '=' * 60)
print('V15 SLUG MODEL (bjcp_slug, >=10 recipes/slug only)')
print('=' * 60)
from collections import Counter
slug_counts = Counter(r['bjcp_slug'] for r in recipes if r.get('bjcp_slug'))
slug_keep = {s for s, c in slug_counts.items() if c >= 10}
print(f'Slugs with >=10 recipes: {len(slug_keep)}')

train_slug = [r for r in train_recs if r.get('bjcp_slug') in slug_keep]
test_slug = [r for r in test_recs if r.get('bjcp_slug') in slug_keep]
print(f'Train: {len(train_slug)} Test: {len(test_slug)}')
Xs_tr, ys_tr = to_xy(train_slug, 'bjcp_slug')
Xs_te, ys_te = to_xy(test_slug, 'bjcp_slug')
le_s = LabelEncoder()
le_s.fit(ys_tr)
ys_tr_enc = le_s.transform(ys_tr)
keep_s = [i for i, s in enumerate(ys_te) if s in set(le_s.classes_)]
ys_te_enc = le_s.transform([ys_te[i] for i in keep_s])
Xs_te_kept = Xs_te[keep_s]

ms = xgb.XGBClassifier(
    objective='multi:softprob', num_class=len(le_s.classes_),
    max_depth=4, learning_rate=0.1, n_estimators=300,
    subsample=0.8, colsample_bytree=0.8, tree_method='hist',
    eval_metric='mlogloss', random_state=42, verbosity=0,
    reg_lambda=1.0, reg_alpha=0.5,
)
ms.fit(Xs_tr, ys_tr_enc)
proba_s = ms.predict_proba(Xs_te_kept)
labels_s = list(range(len(le_s.classes_)))


def topk_s(y, p, k):
    return float(top_k_accuracy_score(y, p, k=k, labels=labels_s))


ts1 = topk_s(ys_te_enc, proba_s, 1)
ts3 = topk_s(ys_te_enc, proba_s, 3)
ts5 = topk_s(ys_te_enc, proba_s, 5)
print(f'[V15 slug] test t1: {ts1:.4f}  t3: {ts3:.4f}  t5: {ts5:.4f}')

# Per-slug metrics for spotlight slugs
spotlight = ['german_oktoberfest_festbier', 'belgian_gueuze', 'belgian_lambic',
             'english_pale_ale', 'american_pale_ale', 'american_strong_pale_ale',
             'brett_beer', 'mixed_fermentation_sour_beer',
             'french_belgian_saison', 'belgian_dubbel', 'belgian_tripel',
             'south_german_hefeweizen', 'belgian_witbier']
slug_predictions = proba_s.argmax(axis=1)
slug_per = {}
for ci, sl in enumerate(le_s.classes_):
    n = sum(1 for v in ys_te_enc if v == ci)
    if n == 0:
        continue
    c1 = sum(1 for tc, pc in zip(ys_te_enc, slug_predictions) if tc == ci and pc == ci)
    c3 = sum(1 for tc, pr in zip(ys_te_enc, proba_s) if tc == ci and ci in pr.argsort()[-3:])
    slug_per[sl] = {'n': n, 'top1': c1 / n, 'top3': c3 / n}

print('\nSpotlight slug metrics:')
for sl in spotlight:
    if sl in slug_per:
        v = slug_per[sl]
        print(f'  {sl:<40} n={v["n"]:3d}  top1={v["top1"]:.2f}  top3={v["top3"]:.2f}')
    else:
        print(f'  {sl:<40} (not in test split or <10 train)')

ms.get_booster().save_model('_v15_model_slug.json')
sz_s = os.path.getsize('_v15_model_slug.json') / 1024
print(f'\nWrote _v15_model_slug.json ({sz_s:.0f} KB)')
with open('_v15_label_encoder_slug.json', 'w', encoding='utf-8') as f:
    json.dump({'classes': le_s.classes_.tolist(), 'n_classes': len(le_s.classes_), 'feature_list': feat_list},
              f, indent=2, ensure_ascii=False)

# ==================== Save metrics ====================
out = {
    'version': 'v15',
    'dataset_recipes': len(recipes),
    'dataset_features': len(feat_list),
    '14cat': {
        'cv_mean': cv_mean,
        'train_top1': t1_tr,
        'test_top1': t1,
        'test_top3': t3,
        'test_top5': t5,
        'gap': t1_tr - t1,
        'per_class': per_class,
    },
    'slug': {
        'classes': len(le_s.classes_),
        'test_top1': ts1,
        'test_top3': ts3,
        'test_top5': ts5,
        'spotlight': {sl: slug_per.get(sl) for sl in spotlight},
    },
    'sources': data['meta'].get('sources'),
}
with open('_v15_metrics.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
print('Wrote _v15_metrics.json')
