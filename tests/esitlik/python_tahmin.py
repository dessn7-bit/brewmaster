# EŞİTLİK TESTİ — Python referans tahminleri (eğitimdeki model dosyaları, eğitimdeki özellik vektörü)
# Salt okur. Girdi: ornek_veri.json (+ isteğe bağlı tarayici_ozellik.json: tarayıcı vektörleriyle Python modeli)
# Çıktı: python_tahmin.json
# tests/esitlik.mjs çağırır (depo kökünden). Klasör: ESITLIK_DIR
import json, os, sys, glob
import numpy as np
import xgboost as xgb
import lightgbm as lgb
import onnxruntime as ort
from sklearn.isotonic import IsotonicRegression

D = os.environ['ESITLIK_DIR']
W = 'working'
veri = json.load(open(f'{D}/ornek_veri.json', encoding='utf-8'))
F89 = veri['F89']

def boost(p):
    b = xgb.Booster(); b.load_model(p); return b

LE_C = json.load(open(f'{W}/_step105_v12cv5_label_encoder.json', encoding='utf-8'))
LE_S = json.load(open(f'{W}/v12slug_v5_label_encoder_2df2431a.json', encoding='utf-8'))
assert LE_C['feature_list'] == F89, 'V12c feature_list != eğitim F89'
assert LE_S['feature_list'] == F89, 'V12 slug feature_list != F89'
M_C = boost(f'{W}/_step105_v12cv5/fold1.json')
M_S = boost(f'{W}/v12slug_v5_model_2df2431a.json')
B1_LGB = lgb.Booster(model_file=f'{W}/_step105_b1v8/fold1.model')
B1_ONNX = ort.InferenceSession(f'{W}/_step105_b1v8_fold1.onnx', providers=['CPUExecutionProvider'])
B1_CL = json.load(open(f'{W}/_step105_label_encoder_14cat.json', encoding='utf-8'))['classes']
CAL = json.load(open(os.environ.get('ESITLIK_KAL') or f'{W}/_step105_calibration/calibration_params.json', encoding='utf-8'))  # Sprint 2: HTML'in istediği kalibrasyon
assert CAL['labels'] == B1_CL
ISO = []
for c in CAL['curves']:
    iso = IsotonicRegression(out_of_bounds='clip', y_min=0.0, y_max=1.0); iso.fit(np.array(c['x']), np.array(c['y'])); ISO.append(iso)

import re
# canlı V_cluster dosyaları = HTML'deki V_CLUSTER_URLS (aynı küme için eski SHA'lı dosyalar da working/'de duruyor — glob KULLANILMAZ)
_html = open(f'{D}/html/Brewmaster_v2_79_10.html', encoding='utf-8').read()
VC = {}
for m in sorted(set(re.findall(r"'([a-z_]+)':\s*WORKER_BASE \+ '/(v_cluster_[a-z_]+_[0-9a-f]{8})\.json'", _html))):
    ad, f = m
    VC[ad] = (boost(f'{W}/{f}.json'), json.load(open(f'{W}/{f}_le.json', encoding='utf-8')))
CANLI_VC = ['sour','bock','wheat','stout','strong_ale','ipa','pale_ale','saison','brown_ale','lager','lager_dark','pilsner','porter','specialty']
VC = {k: v for k, v in VC.items() if k in CANLI_VC}
assert sorted(VC) == sorted(CANLI_VC), sorted(VC)

def xgb_prob(m, X):
    return m.predict(xgb.DMatrix(np.asarray(X, dtype=np.float32), feature_names=None))

def b1_hepsi(v116):
    x = np.asarray([v116], dtype=np.float32)
    lg = B1_LGB.predict(x)[0]
    out = B1_ONNX.run(None, {B1_ONNX.get_inputs()[0].name: x})
    on = None
    for o in out:
        a = np.asarray(o) if not isinstance(o, list) else None
        if a is not None and a.ndim == 2 and a.shape[1] == 14: on = a[0]
        if isinstance(o, list) and o and isinstance(o[0], dict): on = np.array([o[0][k] for k in sorted(o[0])])
    cal = np.array([ISO[k].predict([on[k]])[0] for k in range(14)]); s = cal.sum(); cal = cal / s if s > 0 else cal
    return lg, on, cal

def tahmin(v116):
    v89 = v116[:89]
    pc = xgb_prob(M_C, [v89])[0]; ps = xgb_prob(M_S, [v89])[0]
    lg, on, cal = b1_hepsi(v116)
    top_b1 = B1_CL[int(np.argmax(cal))]
    vc = {}
    for c, (m, le) in VC.items():
        pr = xgb_prob(m, [v89])[0]; vc[c] = {'classes': le['classes'], 'probs': pr.tolist()}
    hier = None
    if top_b1 in vc:
        p = vc[top_b1]; hier = p['classes'][int(np.argmax(p['probs']))]
    return {'v12c': pc.tolist(), 'v12s': ps.tolist(), 'b1_lgb': lg.tolist(), 'b1_onnx': on.tolist(), 'b1_cal': cal.tolist(),
            'b1_top_cal': top_b1, 'vc': vc, 'hier_slug': hier}

sonuc = {'classes': {'v12c': LE_C['classes'], 'v12s': LE_S['classes'], 'b1': B1_CL},
         'vc_le_classes': {c: VC[c][1]['classes'] for c in VC}, 'egitim_vektoru': {}}
for r in veri['veri']:
    sonuc['egitim_vektoru'][r['id']] = tahmin(r['v116'])
# tarayıcının ürettiği vektörlerle aynı Python modeli (varsa): kullanıcı yolu farkını modelden ayırmak için
tf = f'{D}/tarayici_ozellik.json'
if os.path.exists(tf):
    T = json.load(open(tf, encoding='utf-8'))
    sonuc['tarayici_vektoru'] = {rid: tahmin(t['v116']) for rid, t in T.items() if t.get('v116') and len(t['v116']) == 116}
json.dump(sonuc, open(f'{D}/python_tahmin.json', 'w', encoding='utf-8'))
print('python tahmin:', len(sonuc['egitim_vektoru']), 'eğitim vektörü;', len(sonuc.get('tarayici_vektoru', {})), 'tarayıcı vektörü')
print('xgboost', xgb.__version__, 'lightgbm', lgb.__version__, 'onnxruntime', ort.__version__)
