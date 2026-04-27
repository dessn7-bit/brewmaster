"""V13 retrain — V12 base + brett-protective cleanup (9 reçete recovered)
76 feature (brett coverage hâlâ %0.18, 47B feature ekleme yok)"""
import json, os
import numpy as np
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import top_k_accuracy_score, accuracy_score
import xgboost as xgb

with open('_ml_dataset_v13_pre_retrain.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
recipes = data['recipes']
feat_list = data['meta']['feature_list']
print('V13 dataset:', len(recipes), 'recipes,', len(feat_list), 'features')

# Recompute V11/V12 features (yeast biology + adjuncts) since 9 yeast strings changed
def recipeText(r):
    parts = []
    if r.get('name'): parts.append(str(r['name']))
    if r.get('sorte_raw'): parts.append(str(r['sorte_raw']))
    raw = r.get('raw') or {}
    if raw.get('notes'): parts.append(str(raw['notes']))
    if raw.get('author'): parts.append(str(raw['author']))
    if raw.get('malts'): parts.append(' '.join((m.get('name') or '') for m in raw['malts']))
    if raw.get('hops'): parts.append(' '.join((h.get('name') or '') for h in raw['hops']))
    if raw.get('yeast'): parts.append(str(raw['yeast']))
    return ' '.join(parts).lower()

import re as _re
def detect_features(r):
    text = recipeText(r)
    y = r.get('raw', {}).get('yeast', '')
    if isinstance(y, list): y = ' '.join(y)
    yLower = str(y).lower()
    BELGIAN = ['wyeast 1214','wy1214','wyeast 1762','wy1762','wyeast 1388','wy1388','wyeast 3787','wy3787','wyeast 3522','wy3522','wyeast 3864','wy3864','wlp500','wlp 500','wlp530','wlp 530','wlp540','wlp 540','wlp565','wlp 565','wlp570','wlp 570','wlp575','wlp 575','wlp590','wlp 590','safbrew abbaye','lalbrew abbaye','lallemand abbaye','belle saison']
    CLEAN_US05 = ['wyeast 1056','wy1056','wlp001','wlp 001','safale us-05','safale us05','us-05','us05','bry-97','bry97','chico']
    return {
        'has_coffee': 1 if _re.search(r'\b(coffee|espresso|cold[\s-]?brew|caffè)\b', text) else 0,
        'has_fruit': 1 if _re.search(r'\b(raspberry|blueberry|cherry|peach|mango|passionfruit|apricot|pineapple|strawberry|blackberry|lime|lemon zest|orange peel|frambozen|himbeere|kirsche|aardbei|pomegranate)\b', text) else 0,
        'has_spice': 1 if _re.search(r'\b(coriander|cardamom|cinnamon|vanilla bean|black pepper|ginger|anise|nutmeg|clove|kruidnagel|kaneel|gember)\b', text) else 0,
        'has_chili': 1 if _re.search(r'\b(chipotle|jalape[ñn]o|habanero|ghost pepper|chili pepper|chili|ancho|poblano|chile)\b', text) else 0,
        'has_smoke': 1 if _re.search(r'\b(smoke|smoked|rauch|peat|gerookt|isli)\b(?!\s*malt|\s*malz|mout)', text) else 0,
        'has_belgian_yeast': 1 if any(b in yLower for b in BELGIAN) else 0,
        'has_clean_us05_isolate': 1 if any(c in yLower for c in CLEAN_US05) else 0
    }

# Re-derive features
for r in recipes:
    feats = detect_features(r)
    for k, v in feats.items():
        r['features'][k] = v

print('\nFeature recompute done. Sample feature counts:')
for k in ['has_coffee','has_fruit','has_spice','has_chili','has_smoke','has_belgian_yeast','has_clean_us05_isolate']:
    n = sum(1 for r in recipes if r['features'].get(k))
    print(f'  {k:<28}{n}')

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
print(f'\n[V13 14cat] train: {t1_tr:.4f}  test t1: {t1:.4f}  t3: {t3:.4f}  t5: {t5:.4f}')
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

m.get_booster().save_model('_v13_model_14cat.json')
sz = os.path.getsize('_v13_model_14cat.json')/1024
print(f'\nWrote _v13_model_14cat.json ({sz:.0f} KB)')
with open('_v13_label_encoder_14cat.json','w',encoding='utf-8') as f:
    json.dump({'classes':le.classes_.tolist(),'n_classes':len(le.classes_),'feature_list':feat_list}, f, indent=2, ensure_ascii=False)
out = {'cv_mean':cv_mean,'train_top1':t1_tr,'test_top1':t1,'test_top3':t3,'test_top5':t5,'per_class_14cat':per_class,'sources':data['meta']['sources']}
with open('_v13_metrics.json','w',encoding='utf-8') as f: json.dump(out, f, indent=2, ensure_ascii=False)
print('Wrote _v13_metrics.json')
