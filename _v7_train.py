"""V7 XGBoost Training Pipeline."""
import json
import os
import numpy as np
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import top_k_accuracy_score, accuracy_score
import xgboost as xgb

print("=" * 60)
print("V7 XGBoost Training")
print("=" * 60)

with open('_ml_dataset_v7_clean.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
recipes = data['recipes']
feat_list = data['meta']['feature_list']
print(f"\nLoaded {len(recipes)} recipes, {len(feat_list)} features")

def to_matrix(recs):
    X, y = [], []
    for r in recs:
        row = [r['features'].get(k, 0) or 0 for k in feat_list]
        X.append(row)
        y.append(r['bjcp_slug'])
    return np.array(X, dtype=np.float32), y

train_recs = [r for r in recipes if r['in_split'] == 'train']
test_recs = [r for r in recipes if r['in_split'] == 'test']

X_train, y_train_str = to_matrix(train_recs)
X_test, y_test_str = to_matrix(test_recs)

# XGBoost expects classes 0..n-1 contiguous. Encode based on TRAIN ONLY.
# Drop test samples whose class is not in train.
le = LabelEncoder()
le.fit(y_train_str)
train_classes = set(le.classes_)
print(f"Train unique classes: {len(train_classes)}")

# Filter test
keep_idx = [i for i, s in enumerate(y_test_str) if s in train_classes]
dropped = len(y_test_str) - len(keep_idx)
if dropped > 0:
    print(f"Dropping {dropped} test samples with classes not in train")
    X_test = X_test[keep_idx]
    y_test_str = [y_test_str[i] for i in keep_idx]

y_train = le.transform(y_train_str)
y_test = le.transform(y_test_str)
n_classes = len(le.classes_)
print(f"Classes (train-only): {n_classes}")
print(f"X_train: {X_train.shape} | X_test: {X_test.shape}")

with open('_v7_label_encoder.json', 'w', encoding='utf-8') as f:
    json.dump({'classes': le.classes_.tolist(), 'n_classes': n_classes, 'feature_list': feat_list}, f, indent=2, ensure_ascii=False)
print("Wrote _v7_label_encoder.json")

# Hyperparameter sweep
print("\n" + "=" * 60)
print("HYPERPARAMETER SWEEP (5-fold CV on train)")
print("=" * 60)

param_grid = [
    {'max_depth': 4, 'learning_rate': 0.1, 'n_estimators': 200},
    {'max_depth': 6, 'learning_rate': 0.1, 'n_estimators': 200},
    {'max_depth': 6, 'learning_rate': 0.05, 'n_estimators': 400},
    {'max_depth': 8, 'learning_rate': 0.05, 'n_estimators': 400},
]

best = {'cv_score': -1, 'config': None}
for params in param_grid:
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    fold_scores = []
    for fold, (tr_idx, vl_idx) in enumerate(skf.split(X_train, y_train)):
        try:
            model = xgb.XGBClassifier(
                objective='multi:softprob', num_class=n_classes,
                max_depth=params['max_depth'], learning_rate=params['learning_rate'],
                n_estimators=params['n_estimators'], subsample=0.8, colsample_bytree=0.8,
                tree_method='hist', eval_metric='mlogloss', random_state=42, verbosity=0
            )
            model.fit(X_train[tr_idx], y_train[tr_idx])
            preds = model.predict(X_train[vl_idx])
            fold_scores.append(accuracy_score(y_train[vl_idx], preds))
        except Exception as e:
            print(f"  fold {fold} ERR: {e}")
    mean_acc = float(np.mean(fold_scores)) if fold_scores else 0
    print(f"  {params} -> CV acc: {mean_acc:.4f}")
    if mean_acc > best['cv_score']:
        best['cv_score'] = mean_acc
        best['config'] = params

print(f"\nBest config: {best['config']} (CV {best['cv_score']:.4f})")

# Final train
print("\n" + "=" * 60)
print("FINAL TRAIN")
print("=" * 60)
final_model = xgb.XGBClassifier(
    objective='multi:softprob', num_class=n_classes,
    max_depth=best['config']['max_depth'],
    learning_rate=best['config']['learning_rate'],
    n_estimators=best['config']['n_estimators'],
    subsample=0.8, colsample_bytree=0.8,
    tree_method='hist', eval_metric='mlogloss', random_state=42, verbosity=0
)
final_model.fit(X_train, y_train)
print(f"Trained with {best['config']['n_estimators']} trees")

# Evaluation
print("\n" + "=" * 60)
print("EVALUATION")
print("=" * 60)
proba_test = final_model.predict_proba(X_test)
proba_train = final_model.predict_proba(X_train)
labels_in_proba = list(range(n_classes))

def topk(true_y, proba, k):
    return float(top_k_accuracy_score(true_y, proba, k=k, labels=labels_in_proba))

train_top1 = topk(y_train, proba_train, 1)
train_top3 = topk(y_train, proba_train, 3)
test_top1 = topk(y_test, proba_test, 1)
test_top3 = topk(y_test, proba_test, 3)
test_top5 = topk(y_test, proba_test, 5)

print(f"Train top-1: {train_top1:.4f} (overfit if very high)")
print(f"Train top-3: {train_top3:.4f}")
print(f"Test top-1:  {test_top1:.4f}")
print(f"Test top-3:  {test_top3:.4f}")
print(f"Test top-5:  {test_top5:.4f}")

# Per-class
print("\n--- Per-class (test, sorted by support) ---")
test_preds = proba_test.argmax(axis=1)
class_support = {}
for c in y_test:
    class_support[c] = class_support.get(c, 0) + 1
class_correct = {}
for true_c, pred_c in zip(y_test, test_preds):
    if true_c == pred_c:
        class_correct[true_c] = class_correct.get(true_c, 0) + 1

per_class = []
for cls_idx in sorted(class_support.keys(), key=lambda c: -class_support[c]):
    slug = le.classes_[cls_idx]
    n = class_support[cls_idx]
    correct = class_correct.get(cls_idx, 0)
    per_class.append({'slug': slug, 'support': n, 'correct': correct, 'acc': correct/n if n else 0})

for p in per_class[:25]:
    print(f"  {p['slug'][:38]:<38} n={p['support']:3d}  c={p['correct']:3d}  acc={p['acc']:.2f}")

# Belgian special
print("\n--- Belgian special check ---")
belgian = ['belgian_dubbel', 'belgian_tripel', 'belgian_quadrupel',
           'belgian_strong_dark_ale', 'belgian_blonde_ale']
for bs in belgian:
    if bs not in le.classes_:
        print(f"  {bs:<30} (not in train)")
        continue
    cls_idx = list(le.classes_).index(bs)
    in_test = [i for i, y in enumerate(y_test) if y == cls_idx]
    if not in_test:
        print(f"  {bs:<30} (not in test)")
        continue
    top1_c = sum(1 for i in in_test if test_preds[i] == cls_idx)
    top3_c = 0
    for i in in_test:
        top3_idx = proba_test[i].argsort()[-3:][::-1]
        if cls_idx in top3_idx:
            top3_c += 1
    print(f"  {bs:<30} test n={len(in_test)}  top-1={top1_c}/{len(in_test)}  top-3={top3_c}/{len(in_test)}")

# Feature importance
print("\n" + "=" * 60)
print("FEATURE IMPORTANCE")
print("=" * 60)
importance = final_model.feature_importances_
feat_imp = sorted(zip(feat_list, importance), key=lambda x: -x[1])
print("Top 25:")
for f, imp in feat_imp[:25]:
    print(f"  {f:<35} {imp:.4f}")

groups = {
    'scalar': ['og', 'fg', 'abv', 'ibu', 'srm'],
    'pct': [f for f in feat_list if f.startswith('pct_')] + ['total_base'],
    'yeast': [f for f in feat_list if f.startswith('yeast_')],
    'hop': [f for f in feat_list if f.startswith('hop_')],
    'katki': [f for f in feat_list if f.startswith('katki_')],
    'process': ['mash_temp_c', 'fermentation_temp_c', 'yeast_attenuation', 'boil_time_min',
                'water_ca_ppm', 'water_so4_ppm', 'water_cl_ppm'],
    'derived': ['dry_hop_days', 'mash_type_step', 'mash_type_decoction', 'lagering_days']
}
print("\nGroup totals:")
for grp, fs in groups.items():
    grp_imp = sum(importance[feat_list.index(f)] for f in fs if f in feat_list)
    print(f"  {grp:<10} ({len(fs):2d} feat)  {grp_imp:.4f}")

# Save XGBoost native
final_model.get_booster().save_model('_v7_model.json')
print("\nWrote _v7_model.json")

# ONNX export
print("\n" + "=" * 60)
print("ONNX EXPORT")
print("=" * 60)
# Try ONNX via onnxmltools (may fail with newer XGBoost) — fallback to JSON-only
onnx_ok = False
try:
    from onnxmltools.convert import convert_xgboost
    from onnxmltools.convert.common.data_types import FloatTensorType
    initial_types = [('input', FloatTensorType([None, len(feat_list)]))]
    onnx_model = convert_xgboost(final_model, initial_types=initial_types, target_opset=12)
    with open('_v7_model.onnx', 'wb') as f:
        f.write(onnx_model.SerializeToString())
    sz = os.path.getsize('_v7_model.onnx') / 1024
    print(f"Wrote _v7_model.onnx ({sz:.0f} KB) — under 10MB: {sz < 10240}")

    import onnxruntime as ort
    sess = ort.InferenceSession('_v7_model.onnx', providers=['CPUExecutionProvider'])
    input_name = sess.get_inputs()[0].name
    n_check = min(5, X_test.shape[0])
    onnx_outs = sess.run(None, {input_name: X_test[:n_check]})
    xgb_labels = final_model.predict_proba(X_test[:n_check]).argmax(axis=1)
    onnx_labels = np.array(onnx_outs[0]).flatten()
    matches = int(np.sum(onnx_labels == xgb_labels))
    print(f"ONNX vs Python parity (5 samples): {matches}/{n_check} match")
    onnx_ok = True
except Exception as e:
    print(f"ONNX export FAILED ({e}) — using JSON-only fallback for browser inference")

if not onnx_ok:
    # JSON model already saved via final_model.get_booster().save_model('_v7_model.json')
    sz = os.path.getsize('_v7_model.json') / 1024
    print(f"_v7_model.json size: {sz:.0f} KB (browser will use xgboost-tree-eval JS)")

# Save metrics
report_data = {
    'cv_best_config': best['config'],
    'cv_best_score': best['cv_score'],
    'train_top1': train_top1, 'train_top3': train_top3,
    'test_top1': test_top1, 'test_top3': test_top3, 'test_top5': test_top5,
    'test_n': int(len(y_test)), 'train_n': int(len(y_train)), 'n_classes': n_classes,
    'per_class_top30': per_class[:30],
    'top_features': [{'feature': f, 'importance': float(i)} for f, i in feat_imp[:25]],
    'group_importance': {grp: float(sum(importance[feat_list.index(f)] for f in fs if f in feat_list))
                         for grp, fs in groups.items()},
}
with open('_v7_metrics.json', 'w', encoding='utf-8') as f:
    json.dump(report_data, f, indent=2, ensure_ascii=False)
print("\nWrote _v7_metrics.json")
print("\nDONE")
