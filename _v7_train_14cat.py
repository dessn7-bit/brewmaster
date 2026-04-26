"""V7 14cat best — final model + ONNX export attempt"""
import json, os
import numpy as np
from sklearn.preprocessing import LabelEncoder
import xgboost as xgb

with open('_ml_dataset_v7_clean.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
recipes = data['recipes']
feat_list = data['meta']['feature_list']

train_recs = [r for r in recipes if r['in_split'] == 'train']
test_recs = [r for r in recipes if r['in_split'] == 'test']

def to_xy(recs, label_field):
    X = np.array([[r['features'].get(k, 0) or 0 for k in feat_list] for r in recs], dtype=np.float32)
    y = [r[label_field] for r in recs]
    return X, y

X_tr, y_tr_str = to_xy(train_recs, 'bjcp_main_category')
X_te, y_te_str = to_xy(test_recs, 'bjcp_main_category')

le = LabelEncoder()
le.fit(y_tr_str)
y_tr = le.transform(y_tr_str)
y_te = le.transform(y_te_str)
n_classes = len(le.classes_)

# Best CV config
model = xgb.XGBClassifier(
    objective='multi:softprob', num_class=n_classes,
    max_depth=3, learning_rate=0.1, n_estimators=100,
    subsample=0.8, colsample_bytree=0.8, tree_method='hist',
    eval_metric='mlogloss', random_state=42, verbosity=0,
    reg_lambda=1.0, reg_alpha=0.5
)
model.fit(X_tr, y_tr)

# Save JSON model + label encoder
model.get_booster().save_model('_v7_model_14cat.json')
sz = os.path.getsize('_v7_model_14cat.json') / 1024
print(f"Wrote _v7_model_14cat.json ({sz:.0f} KB)")

with open('_v7_label_encoder_14cat.json', 'w', encoding='utf-8') as f:
    json.dump({'classes': le.classes_.tolist(), 'n_classes': n_classes, 'feature_list': feat_list}, f, indent=2, ensure_ascii=False)
print("Wrote _v7_label_encoder_14cat.json")

# ONNX retry — use opset=11 (old, safer)
print("\nONNX export attempt...")
try:
    from onnxmltools.convert import convert_xgboost
    from onnxmltools.convert.common.data_types import FloatTensorType
    initial_types = [('input', FloatTensorType([None, len(feat_list)]))]
    onnx_model = convert_xgboost(model, initial_types=initial_types, target_opset=11)
    with open('_v7_model_14cat.onnx', 'wb') as f:
        f.write(onnx_model.SerializeToString())
    sz = os.path.getsize('_v7_model_14cat.onnx') / 1024
    print(f"Wrote _v7_model_14cat.onnx ({sz:.0f} KB)")
    # Verify
    import onnxruntime as ort
    sess = ort.InferenceSession('_v7_model_14cat.onnx', providers=['CPUExecutionProvider'])
    n_check = min(5, len(X_te))
    out = sess.run(None, {sess.get_inputs()[0].name: X_te[:n_check]})
    xgb_pred = model.predict_proba(X_te[:n_check]).argmax(axis=1)
    onnx_pred = np.array(out[0]).flatten()
    matches = int(np.sum(onnx_pred == xgb_pred))
    print(f"ONNX vs XGB parity: {matches}/{n_check}")
except Exception as e:
    print(f"ONNX export FAILED: {e}")

# Per-class breakdown for 14 cat
proba = model.predict_proba(X_te)
preds = proba.argmax(axis=1)
print("\n--- Per-main_category test accuracy ---")
sup = {}
cor = {}
for c in y_te: sup[c] = sup.get(c,0)+1
for tc, pc in zip(y_te, preds):
    if tc==pc: cor[tc] = cor.get(tc,0)+1
per_class = []
for cls_idx in sorted(sup.keys(), key=lambda c: -sup[c]):
    nm = le.classes_[cls_idx]
    n = sup[cls_idx]
    c = cor.get(cls_idx, 0)
    per_class.append({'main_cat':nm, 'n':n, 'correct':c, 'acc':c/n})
    print(f"  {nm:<35} n={n:3d}  correct={c:3d}  acc={c/n:.2f}")

# Save metrics
with open('_v7_metrics_14cat.json', 'w', encoding='utf-8') as f:
    json.dump({'per_class': per_class, 'n_classes': n_classes,
               'config': {'max_depth':3,'lr':0.1,'n_est':100,'reg_lambda':1,'reg_alpha':0.5}}, f, indent=2, ensure_ascii=False)
print("\nWrote _v7_metrics_14cat.json")
