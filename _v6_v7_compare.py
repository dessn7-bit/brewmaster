"""
V6 KNN port + V7 XGBoost retrain — paralel kıyas
4 config: V6/V7 × (73 class bjcp_slug | 14 cat bjcp_main_category)
"""
import json, os
import numpy as np
from sklearn.preprocessing import LabelEncoder
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import top_k_accuracy_score, accuracy_score
from sklearn.model_selection import StratifiedKFold
import xgboost as xgb

print("=" * 65)
print("V6 + V7 PARALEL RETRAIN — 4 config")
print("=" * 65)

# === Load ===
with open('_ml_dataset_v7_clean.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
recipes = data['recipes']
feat_list = data['meta']['feature_list']
print(f"\nDataset: {len(recipes)} recipes, {len(feat_list)} features")

def to_xy(recs, label_field):
    X = np.array([[r['features'].get(k, 0) or 0 for k in feat_list] for r in recs], dtype=np.float32)
    y = [r[label_field] for r in recs]
    return X, y

train_recs = [r for r in recipes if r['in_split'] == 'train']
test_recs = [r for r in recipes if r['in_split'] == 'test']

# Belgian Trappist test isolation
belgian_main = 'Belgian Strong / Trappist'
belgian_slugs = ['belgian_dubbel','belgian_tripel','belgian_quadrupel','belgian_strong_dark_ale']

def evaluate(name, X_train, y_train_str, X_test, y_test_str, model_factory):
    """Generic eval. y_*_str = list of string labels. model_factory returns (model_with_fit_method)."""
    le = LabelEncoder()
    le.fit(y_train_str)
    train_classes = set(le.classes_)
    keep_idx = [i for i,s in enumerate(y_test_str) if s in train_classes]
    if len(keep_idx) < len(y_test_str):
        print(f"  [warn] dropping {len(y_test_str)-len(keep_idx)} test samples (class not in train)")
    X_t = X_test[keep_idx]
    y_t_str = [y_test_str[i] for i in keep_idx]
    y_train = le.transform(y_train_str)
    y_test = le.transform(y_t_str)
    n_classes = len(le.classes_)

    model = model_factory(n_classes)
    model.fit(X_train, y_train)
    proba_train = model.predict_proba(X_train)
    proba_test = model.predict_proba(X_t)
    labels_in_proba = list(range(n_classes))
    def topk(true_y, proba, k):
        try: return float(top_k_accuracy_score(true_y, proba, k=k, labels=labels_in_proba))
        except: return None

    t1_train = topk(y_train, proba_train, 1)
    t1 = topk(y_test, proba_test, 1)
    t3 = topk(y_test, proba_test, 3) if n_classes >= 3 else None
    t5 = topk(y_test, proba_test, 5) if n_classes >= 5 else None
    print(f"\n  [{name}]")
    print(f"    n_classes: {n_classes}, train: {len(y_train)}, test: {len(y_test)}")
    print(f"    Train top-1: {t1_train:.4f} (gap={(t1_train - t1) if t1 else 0:.4f})")
    print(f"    Test top-1:  {t1:.4f}")
    if t3 is not None: print(f"    Test top-3:  {t3:.4f}")
    if t5 is not None: print(f"    Test top-5:  {t5:.4f}")

    # Belgian focus
    test_preds = proba_test.argmax(axis=1)
    belgian_results = {}
    if 'main' in name.lower():
        if belgian_main in le.classes_:
            cls_idx = list(le.classes_).index(belgian_main)
            in_test = [i for i,y in enumerate(y_test) if y==cls_idx]
            top1c = sum(1 for i in in_test if test_preds[i]==cls_idx)
            top3c = sum(1 for i in in_test if cls_idx in proba_test[i].argsort()[-3:])
            print(f"    Belgian Strong/Trappist: test_n={len(in_test)} top-1={top1c}/{len(in_test)} top-3={top3c}/{len(in_test)}")
            belgian_results = {'category':belgian_main, 'test_n':len(in_test), 'top1':top1c, 'top3':top3c}
    else:
        # 73-class — per Belgian slug
        for bs in belgian_slugs:
            if bs in le.classes_:
                cls_idx = list(le.classes_).index(bs)
                in_test = [i for i,y in enumerate(y_test) if y==cls_idx]
                if in_test:
                    top1c = sum(1 for i in in_test if test_preds[i]==cls_idx)
                    top3c = sum(1 for i in in_test if cls_idx in proba_test[i].argsort()[-3:])
                    print(f"    {bs}: test_n={len(in_test)} top-1={top1c} top-3={top3c}")
                    belgian_results[bs] = {'test_n':len(in_test), 'top1':top1c, 'top3':top3c}
    return {
        'config': name, 'n_classes': n_classes, 'train_n': len(y_train), 'test_n': len(y_test),
        'train_top1': t1_train, 'test_top1': t1, 'test_top3': t3, 'test_top5': t5,
        'overfit_gap': float(t1_train - t1) if t1 else 0,
        'belgian': belgian_results
    }

# === Define model factories ===
def v6_knn_factory(n_classes):
    """V6-inspired: weighted Manhattan KNN, K=5. (Simplified — no multi-K aggregation, no veto rules.
    Real V6 uses K=3+5+7 ensemble + BJCP range veto. Port omits these for baseline.)"""
    return KNeighborsClassifier(n_neighbors=min(5, max(3, n_classes // 2)), metric='manhattan', weights='distance')

def v7_xgb_factory(n_classes):
    """V7 XGBoost — Adım 34 config, plus regularization."""
    return xgb.XGBClassifier(
        objective='multi:softprob', num_class=n_classes,
        max_depth=4, learning_rate=0.1, n_estimators=200,
        subsample=0.8, colsample_bytree=0.8, tree_method='hist',
        eval_metric='mlogloss', random_state=42, verbosity=0,
        reg_lambda=1.0, reg_alpha=0.5
    )

# === Run 4 configs ===
results = []

# 73 class — bjcp_slug
print("\n" + "=" * 65)
print("CONFIG 1: V6 (KNN) — 73 class (bjcp_slug)")
print("=" * 65)
X_tr_slug, y_tr_slug = to_xy(train_recs, 'bjcp_slug')
X_te_slug, y_te_slug = to_xy(test_recs, 'bjcp_slug')
results.append(evaluate('V6_KNN_73class', X_tr_slug, y_tr_slug, X_te_slug, y_te_slug, v6_knn_factory))

print("\n" + "=" * 65)
print("CONFIG 2: V7 (XGBoost) — 73 class (bjcp_slug, Adım 34 baseline tekrar)")
print("=" * 65)
results.append(evaluate('V7_XGB_73class', X_tr_slug, y_tr_slug, X_te_slug, y_te_slug, v7_xgb_factory))

# 14 cat — bjcp_main_category
print("\n" + "=" * 65)
print("CONFIG 3: V6 (KNN) — 14 main_category")
print("=" * 65)
X_tr_main, y_tr_main = to_xy(train_recs, 'bjcp_main_category')
X_te_main, y_te_main = to_xy(test_recs, 'bjcp_main_category')
results.append(evaluate('V6_KNN_14cat_main', X_tr_main, y_tr_main, X_te_main, y_te_main, v6_knn_factory))

print("\n" + "=" * 65)
print("CONFIG 4: V7 (XGBoost) — 14 main_category + regularization")
print("=" * 65)
results.append(evaluate('V7_XGB_14cat_main', X_tr_main, y_tr_main, X_te_main, y_te_main, v7_xgb_factory))

# === V7 14cat hyperparam sweep (CV) ===
print("\n" + "=" * 65)
print("CONFIG 4b: V7 5-fold CV hyperparameter sweep (14 cat, depth+n_est)")
print("=" * 65)
le_main = LabelEncoder()
le_main.fit(y_tr_main)
y_tr_main_enc = le_main.transform(y_tr_main)
n_main = len(le_main.classes_)

best_cv = {'score': -1, 'params': None}
for depth in [3, 4, 5]:
    for n_est in [100, 200, 400]:
        skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        scores = []
        for tr_idx, vl_idx in skf.split(X_tr_main, y_tr_main_enc):
            try:
                m = xgb.XGBClassifier(objective='multi:softprob', num_class=n_main,
                                       max_depth=depth, learning_rate=0.1, n_estimators=n_est,
                                       subsample=0.8, colsample_bytree=0.8, tree_method='hist',
                                       eval_metric='mlogloss', random_state=42, verbosity=0,
                                       reg_lambda=1.0, reg_alpha=0.5)
                m.fit(X_tr_main[tr_idx], y_tr_main_enc[tr_idx])
                preds = m.predict(X_tr_main[vl_idx])
                scores.append(accuracy_score(y_tr_main_enc[vl_idx], preds))
            except Exception as e:
                pass
        mean = float(np.mean(scores)) if scores else 0
        print(f"  depth={depth} n_est={n_est} -> CV {mean:.4f}")
        if mean > best_cv['score']:
            best_cv['score'] = mean; best_cv['params'] = {'depth':depth,'n_est':n_est}

print(f"\nBest 14cat CV: {best_cv['params']} -> {best_cv['score']:.4f}")

# Final V7 14cat with best CV params
def v7_xgb_best(n_classes):
    return xgb.XGBClassifier(
        objective='multi:softprob', num_class=n_classes,
        max_depth=best_cv['params']['depth'], learning_rate=0.1,
        n_estimators=best_cv['params']['n_est'],
        subsample=0.8, colsample_bytree=0.8, tree_method='hist',
        eval_metric='mlogloss', random_state=42, verbosity=0,
        reg_lambda=1.0, reg_alpha=0.5
    )

print("\n" + "=" * 65)
print("CONFIG 4c: V7 14cat — best CV params final eval")
print("=" * 65)
results.append(evaluate('V7_XGB_14cat_best', X_tr_main, y_tr_main, X_te_main, y_te_main, v7_xgb_best))

# === Save results ===
print("\n" + "=" * 65)
print("FINAL SUMMARY")
print("=" * 65)
print(f"\n{'Config':<25} {'n_class':<8} {'TopK':<5} {'Train':<8} {'Test':<8} {'Gap':<8}")
for r in results:
    print(f"{r['config']:<25} {r['n_classes']:<8} {'top1':<5} {r['train_top1']:.4f}   {r['test_top1']:.4f}   {r['overfit_gap']:+.4f}")
    if r['test_top3'] is not None:
        print(f"{'':<25} {'':<8} {'top3':<5} {'':<8}   {r['test_top3']:.4f}")

with open('_v6_v7_results.json', 'w', encoding='utf-8') as f:
    json.dump({'results': results, 'cv_sweep_best': best_cv}, f, indent=2, ensure_ascii=False)
print("\nWrote _v6_v7_results.json")
print("DONE")
