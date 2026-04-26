"""V8 dataset retrain — XGBoost 14cat + 73class kıyas"""
import json, os
import numpy as np
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import top_k_accuracy_score, accuracy_score
import xgboost as xgb

with open('_ml_dataset_v8_pre_retrain.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
recipes = data['recipes']
feat_list = data['meta']['feature_list']
print('V8 dataset:', len(recipes), 'recipes,', len(feat_list), 'features')
print('Sources:', data['meta']['sources'])
print('Train:', data['meta']['train_n'], '/ Test:', data['meta']['test_n'])

train_recs = [r for r in recipes if r['in_split'] == 'train']
test_recs = [r for r in recipes if r['in_split'] == 'test']

def to_xy(recs, label_field):
    X = np.array([[r['features'].get(k, 0) or 0 for k in feat_list] for r in recs], dtype=np.float32)
    y = [r[label_field] for r in recs]
    return X, y

belgian_main = 'Belgian Strong / Trappist'
belgian_slugs = ['belgian_dubbel','belgian_tripel','belgian_quadrupel','belgian_strong_dark_ale','belgian_blonde_ale','belgian_witbier']

def evaluate(name, X_train, y_train_str, X_test, y_test_str, model_factory):
    le = LabelEncoder()
    le.fit(y_train_str)
    train_classes = set(le.classes_)
    keep_idx = [i for i,s in enumerate(y_test_str) if s in train_classes]
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
    print(f"\n  [{name}] n_class={n_classes}, train={len(y_train)}, test={len(y_test)}, dropped={len(y_test_str)-len(keep_idx)}")
    print(f"    Train top-1: {t1_train:.4f}  Test top-1: {t1:.4f}  top-3: {t3:.4f}  top-5: {t5:.4f}")
    print(f"    Gap: {t1_train-t1:+.4f}")

    test_preds = proba_test.argmax(axis=1)
    if 'main' in name.lower():
        if belgian_main in le.classes_:
            cls_idx = list(le.classes_).index(belgian_main)
            in_test = [i for i,y in enumerate(y_test) if y==cls_idx]
            top1c = sum(1 for i in in_test if test_preds[i]==cls_idx)
            top3c = sum(1 for i in in_test if cls_idx in proba_test[i].argsort()[-3:])
            print(f"    Belgian Strong/Trappist: test_n={len(in_test)} top-1={top1c}/{len(in_test)} top-3={top3c}/{len(in_test)}")
    else:
        for bs in belgian_slugs:
            if bs in le.classes_:
                cls_idx = list(le.classes_).index(bs)
                in_test = [i for i,y in enumerate(y_test) if y==cls_idx]
                if in_test:
                    top1c = sum(1 for i in in_test if test_preds[i]==cls_idx)
                    top3c = sum(1 for i in in_test if cls_idx in proba_test[i].argsort()[-3:])
                    print(f"    {bs}: test_n={len(in_test)} top-1={top1c} top-3={top3c}")

    return {
        'config': name, 'n_classes': n_classes,
        'train_n': len(y_train), 'test_n': len(y_test), 'dropped': len(y_test_str)-len(keep_idx),
        'train_top1': t1_train, 'test_top1': t1, 'test_top3': t3, 'test_top5': t5,
        'overfit_gap': float(t1_train - t1) if t1 else 0
    }

X_tr_slug, y_tr_slug = to_xy(train_recs, 'bjcp_slug')
X_te_slug, y_te_slug = to_xy(test_recs, 'bjcp_slug')

X_tr_main, y_tr_main = to_xy(train_recs, 'bjcp_main_category')
X_te_main, y_te_main = to_xy(test_recs, 'bjcp_main_category')

# CV sweep on 14cat
print('\n' + '='*65)
print('CV SWEEP - 14 main_category')
print('='*65)
le_main = LabelEncoder(); le_main.fit(y_tr_main)
y_tr_main_enc = le_main.transform(y_tr_main)
n_main = len(le_main.classes_)
best = {'score': -1, 'params': None}
for depth in [3, 4, 5, 6]:
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
            except: pass
        mean = float(np.mean(scores)) if scores else 0
        print(f"  depth={depth} n_est={n_est} -> CV {mean:.4f}")
        if mean > best['score']:
            best['score'] = mean; best['params'] = {'depth':depth,'n_est':n_est}
print(f"\nBest 14cat CV: {best['params']} -> {best['score']:.4f}")

def v8_xgb_main(n_classes):
    return xgb.XGBClassifier(objective='multi:softprob', num_class=n_classes,
        max_depth=best['params']['depth'], learning_rate=0.1, n_estimators=best['params']['n_est'],
        subsample=0.8, colsample_bytree=0.8, tree_method='hist',
        eval_metric='mlogloss', random_state=42, verbosity=0,
        reg_lambda=1.0, reg_alpha=0.5)

print('\n' + '='*65)
print('V8 FINAL EVAL')
print('='*65)
results = []
results.append(evaluate('V8_XGB_73class', X_tr_slug, y_tr_slug, X_te_slug, y_te_slug, v8_xgb_main))
results.append(evaluate('V8_XGB_14cat_main', X_tr_main, y_tr_main, X_te_main, y_te_main, v8_xgb_main))

# Per-class breakdown for 14cat
print('\n--- V8 14cat per-main_category test accuracy ---')
le2 = LabelEncoder(); le2.fit(y_tr_main)
y_tr2 = le2.transform(y_tr_main)
keep2 = [i for i,s in enumerate(y_te_main) if s in set(le2.classes_)]
y_te2 = le2.transform([y_te_main[i] for i in keep2])
m2 = v8_xgb_main(len(le2.classes_))
m2.fit(X_tr_main, y_tr2)
proba2 = m2.predict_proba(X_te_main[keep2])
preds2 = proba2.argmax(axis=1)
sup, cor = {}, {}
for c in y_te2: sup[c] = sup.get(c,0)+1
for tc, pc in zip(y_te2, preds2):
    if tc==pc: cor[tc] = cor.get(tc,0)+1
per_class = []
for cls_idx in sorted(sup.keys(), key=lambda c: -sup[c]):
    nm = le2.classes_[cls_idx]
    n = sup[cls_idx]; c = cor.get(cls_idx, 0)
    per_class.append({'main_cat':nm, 'n':n, 'correct':c, 'acc':c/n})
    print(f"  {nm:<35} n={n:3d}  correct={c:3d}  acc={c/n:.2f}")

m2.get_booster().save_model('_v8_model_14cat.json')
sz = os.path.getsize('_v8_model_14cat.json') / 1024
print(f"\nWrote _v8_model_14cat.json ({sz:.0f} KB)")
with open('_v8_label_encoder_14cat.json', 'w', encoding='utf-8') as f:
    json.dump({'classes': le2.classes_.tolist(), 'n_classes': len(le2.classes_), 'feature_list': feat_list}, f, indent=2, ensure_ascii=False)

out = {'cv_best': best, 'results': results, 'per_class_14cat': per_class, 'sources': data['meta']['sources']}
with open('_v8_metrics.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
print('Wrote _v8_metrics.json')
