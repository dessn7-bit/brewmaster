"""V12 retrain — V11 feature set (76) on cleaned data (7635 reçete, diydog/pilot dropped)"""
import json, os
import numpy as np
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import top_k_accuracy_score, accuracy_score
import xgboost as xgb

with open('_ml_dataset_v12_pre_retrain.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
recipes = data['recipes']
feat_list = data['meta']['feature_list']
print('V12 dataset:', len(recipes), 'recipes,', len(feat_list), 'features')
print('Sources:', data['meta']['sources'])

train_recs = [r for r in recipes if r['in_split']=='train']
test_recs = [r for r in recipes if r['in_split']=='test']

def to_xy(recs, lf):
    X = np.array([[r['features'].get(k,0) or 0 for k in feat_list] for r in recs], dtype=np.float32)
    y = [r[lf] for r in recs]
    return X, y

X_tr, y_tr = to_xy(train_recs, 'bjcp_main_category')
X_te, y_te = to_xy(test_recs, 'bjcp_main_category')
le = LabelEncoder(); le.fit(y_tr)
y_tr_enc = le.transform(y_tr)
keep = [i for i,s in enumerate(y_te) if s in set(le.classes_)]
y_te_enc = le.transform([y_te[i] for i in keep])
X_te_kept = X_te[keep]

print('\nCV (5-fold)')
skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
cv = []
for tr_i, vl_i in skf.split(X_tr, y_tr_enc):
    m = xgb.XGBClassifier(objective='multi:softprob', num_class=len(le.classes_), max_depth=3, learning_rate=0.1, n_estimators=200,
        subsample=0.8, colsample_bytree=0.8, tree_method='hist', eval_metric='mlogloss', random_state=42, verbosity=0,
        reg_lambda=1.0, reg_alpha=0.5)
    m.fit(X_tr[tr_i], y_tr_enc[tr_i])
    cv.append(accuracy_score(y_tr_enc[vl_i], m.predict(X_tr[vl_i])))
cv_mean = float(np.mean(cv))
print(f'CV mean: {cv_mean:.4f}')

m = xgb.XGBClassifier(objective='multi:softprob', num_class=len(le.classes_), max_depth=3, learning_rate=0.1, n_estimators=200,
    subsample=0.8, colsample_bytree=0.8, tree_method='hist', eval_metric='mlogloss', random_state=42, verbosity=0,
    reg_lambda=1.0, reg_alpha=0.5)
m.fit(X_tr, y_tr_enc)
proba_tr = m.predict_proba(X_tr)
proba = m.predict_proba(X_te_kept)
labels = list(range(len(le.classes_)))
def topk(y, p, k):
    return float(top_k_accuracy_score(y, p, k=k, labels=labels))
t1_tr = topk(y_tr_enc, proba_tr, 1)
t1 = topk(y_te_enc, proba, 1); t3 = topk(y_te_enc, proba, 3); t5 = topk(y_te_enc, proba, 5)
print(f'\n[V12 14cat] train: {t1_tr:.4f}  test t1: {t1:.4f}  t3: {t3:.4f}  t5: {t5:.4f}')
print(f'Gap: {t1_tr-t1:+.4f}')

preds = proba.argmax(axis=1)
sup, cor, t3cor = {}, {}, {}
for c in y_te_enc: sup[c]=sup.get(c,0)+1
for tc, pc, prob in zip(y_te_enc, preds, proba):
    if tc==pc: cor[tc]=cor.get(tc,0)+1
    if tc in prob.argsort()[-3:]: t3cor[tc]=t3cor.get(tc,0)+1
per_class = []
print('\nPer-class:')
for ci in sorted(sup.keys(), key=lambda c:-sup[c]):
    nm=le.classes_[ci]; n=sup[ci]; c=cor.get(ci,0); t3=t3cor.get(ci,0)
    per_class.append({'main_cat':nm,'n':n,'correct':c,'top3':t3,'acc':c/n,'top3_acc':t3/n})
    print(f'  {nm:<35} n={n:3d}  top1={c:3d} ({c/n:.2f})  top3={t3:3d} ({t3/n:.2f})')

m.get_booster().save_model('_v12_model_14cat.json')
sz = os.path.getsize('_v12_model_14cat.json')/1024
print(f'\nWrote _v12_model_14cat.json ({sz:.0f} KB)')
with open('_v12_label_encoder_14cat.json','w',encoding='utf-8') as f:
    json.dump({'classes':le.classes_.tolist(),'n_classes':len(le.classes_),'feature_list':feat_list}, f, indent=2, ensure_ascii=False)
out = {'cv_mean':cv_mean,'train_top1':t1_tr,'test_top1':t1,'test_top3':t3,'test_top5':t5,'per_class_14cat':per_class,'sources':data['meta']['sources']}
with open('_v12_metrics.json','w',encoding='utf-8') as f: json.dump(out, f, indent=2, ensure_ascii=False)
print('Wrote _v12_metrics.json')
