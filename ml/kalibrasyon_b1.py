# B1 (LightGBM, 116 alan, 14 küme) İZOTONİK KALİBRASYONU — Eşitlik Sprint 2 (kusur 3) betiği, repo sürümü (Eşitlik Sprint 3)
#
# Ne yapar: B1 YENİDEN EĞİTİLMEZ. Mevcut 5 fold modeliyle eğitim verisinin OOF (fold dışı) olasılıklarını, eğitimle AYNI 116 alanlık
#   Python girdisiyle (v8 features + eğitim betiğinin kendi extract_new_20'si + _step79 npy son-7) üretir; küme başına izotonik eğri
#   uydurur. Uydurma Python tarafı model çıktılarıyla yapılır (tarayıcı çıktısı KULLANILMAZ). Çapraz uydurmalı ECE / top-1 raporu yazar.
#
# Çalıştırma (depo kökünden; yollar depo köküne göre ya da komut satırından):
#   python ml/kalibrasyon_b1.py [--working working] [--cikti working/_esitlik/kal]
# Girdiler (hepsi --working altında; repoda YOK — ticari olmayan lisanslı veri, Drive yedeği Brewmaster_ML_Yedek_2026-10-26):
#   _step105_dataset_v8_clean.json · _step79_new_features_376k.npy · _step105_label_encoder_14cat.json · _step105_b1v8_feature_list.json
#   _step105_b1v8_retrain.py (extract_new_20 kaynağı) · _step105_b1v8/fold1..5.model · _step105_calibration/calibration_params.json (eski, kıyas için)
# Çıktılar (--cikti altında): b1_v8_calibration_<sha256-8>.json (LF satır sonu — ad içeriğin sha256'sının ilk 8'i; Sprint 2 sonucu
#   b1_v8_calibration_697eb644.json, depoda HTML'in yanında) · kalibrasyon_rapor.json · oof_yeni.npy / oof_eski.npy / y.npy / kaynak.npy
# Bellek: veri seti AKIŞLA okunur (json.load yok); 376k × 116 float32 iki dizi ≈ 0,35 GB. Python 3.12 + numpy, scikit-learn, lightgbm.
import json, os, sys, time, hashlib, importlib
import numpy as np
from collections import Counter
from sklearn.model_selection import StratifiedKFold
from sklearn.isotonic import IsotonicRegression
import lightgbm as lgb
sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
import argparse
ap = argparse.ArgumentParser(); ap.add_argument('--working', default='working'); ap.add_argument('--cikti', default='working/_esitlik/kal'); ARG = ap.parse_args(); WK = ARG.working
T0 = time.time(); OUT = ARG.cikti; os.makedirs(OUT, exist_ok=True)
DS = f'{WK}/_step105_dataset_v8_clean.json'; NPY = f'{WK}/_step79_new_features_376k.npy'
LE = json.load(open(f'{WK}/_step105_label_encoder_14cat.json', encoding='utf-8')); CL = LE['classes']; F89 = LE['feature_list']
FL = json.load(open(f'{WK}/_step105_b1v8_feature_list.json', encoding='utf-8'))['features_list_116']
assert len(CL) == 14 and len(FL) == 116 and FL[:89] == F89
# eğitim betiğinin KENDİ extract_new_20'si (kopya değil, kaynaktan)
src = open(f'{WK}/_step105_b1v8_retrain.py', encoding='utf-8').read()
a, b = src.index('# Adim 67 B1_v3 ek 20 feature listesi'), src.index('# LOAD: encoder + dataset + NEW_FEATURES_7 npy')
ns = {}; exec('import re\n' + src[a:b].rsplit('# ====', 1)[0], ns); extract_new_20, NEW20 = ns['extract_new_20'], ns['NEW_FEATURES_20']
assert FL[89:109] == NEW20
def akis(path):
    dec = json.JSONDecoder()
    with open(path, encoding='utf-8') as f:
        buf = f.read(1 << 22); i = buf.index('[') + 1
        while True:
            while True:
                while i < len(buf) and buf[i] in ' \r\n\t,': i += 1
                if i < len(buf): break
                more = f.read(1 << 22)
                if not more: return
                buf, i = buf[i:] + more, 0
            if buf[i] == ']': return
            try: obj, j = dec.raw_decode(buf, i)
            except json.JSONDecodeError:
                more = f.read(1 << 24)
                if not more: raise
                buf, i = buf[i:] + more, 0; continue
            yield obj; i = j
            if i > (1 << 23): buf, i = buf[i:], 0
# geçiş 1: slug sayımı (eğitimle aynı filtre: slug ≥ 10)
cnt = Counter(r.get('bjcp_slug') for r in akis(DS) if r.get('bjcp_slug')); keep = {s for s, c in cnt.items() if c >= 10}
print(f'[{time.time()-T0:.0f}s] slug_keep {len(keep)}', flush=True)
new7 = np.load(NPY); ci = {c: i for i, c in enumerate(CL)}
# geçiş 2: eğitim X (extract_new_20, npy[i] i = slug filtresi sonrası sıra) ve ESKİ kalibrasyon X (features.get → ext 0, npy[j] j = etiket filtresi sonrası sıra)
NM = sum(c for s_, c in cnt.items() if s_ in keep); Xn = np.zeros((NM, 116), np.float32); Xo = np.zeros((NM, 116), np.float32); y = np.zeros(NM, np.int32); src_ = []; i = j = 0; dus = 0; ext_feat_var = 0
for r in akis(DS):
    if r.get('bjcp_slug') not in keep: continue
    lab = r.get('label_v8')
    if lab not in ci: dus += 1; i += 1; continue
    fe = r.get('features') or {}; base = [float(fe.get(f, 0) or 0) for f in F89]
    e20 = extract_new_20(r); rn = base + [float(e20.get(f, 0) or 0) for f in NEW20] + list(new7[i].astype(np.float32))
    ro = base + [float(fe.get(f, 0) or 0) for f in FL[89:109]] + list(new7[j].astype(np.float32))
    if any(f in fe for f in NEW20): ext_feat_var += 1
    Xn[j] = rn; Xo[j] = ro; y[j] = ci[lab]; src_.append(r.get('source')); i += 1; j += 1
Xn, Xo, y, src_ = Xn[:j], Xo[:j], y[:j], np.array(src_)
print(f'[{time.time()-T0:.0f}s] N {len(y):,} · etiket dışı düşen {dus} · npy satırı {new7.shape[0]:,} (slug filtreli {i:,}) · features içinde ek-20 anahtarı olan kayıt {ext_feat_var} · son-7 eski/yeni aynı satır {int((Xo[:,109:]==Xn[:,109:]).all(1).sum()):,}', flush=True)
folds = list(StratifiedKFold(5, shuffle=True, random_state=42).split(Xn, y))
oofN = np.zeros((len(y), 14), np.float32); oofO = np.zeros_like(oofN)
for fi, (tr, va) in enumerate(folds, 1):
    bo = lgb.Booster(model_file=f'{WK}/_step105_b1v8/fold{fi}.model'); oofN[va] = bo.predict(Xn[va]); oofO[va] = bo.predict(Xo[va]); del bo
    print(f'[{time.time()-T0:.0f}s] fold {fi} OOF', flush=True)
np.save(f'{OUT}/oof_yeni.npy', oofN); np.save(f'{OUT}/oof_eski.npy', oofO); np.save(f'{OUT}/y.npy', y); np.save(f'{OUT}/kaynak.npy', src_)
def uydur(P, Y): return [ (lambda iso: {'cluster': CL[k], 'x': iso.X_thresholds_.tolist(), 'y': iso.y_thresholds_.tolist()})(IsotonicRegression(out_of_bounds='clip', y_min=0.0, y_max=1.0).fit(P[:, k], (Y == k).astype(np.float32))) for k in range(14)]
def uygula(P, curves):  # tarayıcının applyCalibration'ı: doğrusal ara değer + uçlarda kırp + yeniden normalle
    Q = np.stack([np.interp(P[:, k], np.array(c['x']), np.array(c['y'])) for k, c in enumerate(curves)], 1); s = Q.sum(1, keepdims=True); s[s == 0] = 1; return Q / s
def ece(P, Y, nb=10):
    pr, cf = P.argmax(1), P.max(1); ok = (pr == Y).astype(np.float64); b = np.linspace(0, 1, nb + 1); e = 0.0
    for t in range(nb):
        m = (cf >= b[t]) & (cf < b[t + 1]) if t < nb - 1 else (cf >= b[t]) & (cf <= b[t + 1])
        if m.sum(): e += abs(ok[m].mean() - cf[m].mean()) * m.sum() / len(P)
    return float(e)
acc = lambda P, Y: float((P.argmax(1) == Y).mean())
canli = json.load(open(f'{WK}/_step105_calibration/calibration_params.json', encoding='utf-8'))['curves']
eskiYeniden = uydur(oofO, y)
fark = max(float(np.abs(np.interp(np.linspace(0, 1, 2001), np.array(a_['x']), np.array(a_['y'])) - np.interp(np.linspace(0, 1, 2001), np.array(b_['x']), np.array(b_['y']))).max()) for a_, b_ in zip(eskiYeniden, canli))
yeni = uydur(oofN, y)
par = {'method': 'isotonic', 'n_classes': 14, 'labels': CL, 'curves': yeni, 'n_train': int(len(y)), 'cv_folds': 5,
       'not': 'Eşitlik Sprint 2 (kusur 3): OOF girdisi eğitimle aynı 116 alan (extract_new_20 + npy slug-filtre sırası); B1 fold modelleri aynı'}
metin = json.dumps(par, ensure_ascii=False, indent=2)  # LF satır sonu: ad = baytların sha256-8'i (Windows CRLF yazımı adı bozar — Sprint 2 dersi)
sha8 = hashlib.sha256(metin.encode('utf-8')).hexdigest()[:8]; ps = f'{OUT}/b1_v8_calibration_{sha8}.json'
open(ps, 'w', encoding='utf-8', newline=chr(10)).write(metin)
# çapraz uydurma: 4 fold'un OOF'una uydur, 5.'de ölç (5 kez döndür)
R = {'eski_kal__eski_girdi': [], 'eski_kal__dogru_girdi': [], 'yeni_kal__dogru_girdi': [], 'kalibresiz__dogru_girdi': [], 'kalibresiz__eski_girdi': []}
A = {k: [] for k in R}; capraz = {k: np.zeros_like(oofN) for k in R}
for fi, (tr, va) in enumerate(folds):
    cO, cN = uydur(oofO[tr], y[tr]), uydur(oofN[tr], y[tr])
    out = {'eski_kal__eski_girdi': uygula(oofO[va], cO), 'eski_kal__dogru_girdi': uygula(oofN[va], cO), 'yeni_kal__dogru_girdi': uygula(oofN[va], cN), 'kalibresiz__dogru_girdi': oofN[va], 'kalibresiz__eski_girdi': oofO[va]}
    for k, P in out.items(): R[k].append(ece(P, y[va])); A[k].append(acc(P, y[va])); capraz[k][va] = P
v16 = src_ != 'rmwoods'
ozet = {k: {'ece_ort': float(np.mean(R[k])), 'ece_sapma': float(np.std(R[k])), 'top1_ort': float(np.mean(A[k])), 'top1_sapma': float(np.std(A[k])),
            'v16_ece': ece(capraz[k][v16], y[v16]), 'v16_top1': acc(capraz[k][v16], y[v16])} for k in R}
grid = np.linspace(0, 1, 201)
sinif = {CL[k]: {'egri_ort_mutlak_fark': float(np.abs(np.interp(grid, np.array(yeni[k]['x']), np.array(yeni[k]['y'])) - np.interp(grid, np.array(canli[k]['x']), np.array(canli[k]['y']))).mean()),
                 'egri_maks_fark': float(np.abs(np.interp(grid, np.array(yeni[k]['x']), np.array(yeni[k]['y'])) - np.interp(grid, np.array(canli[k]['x']), np.array(canli[k]['y']))).max()),
                 'kume_payi': float((y == k).mean())} for k in range(14)}
res = {'n': int(len(y)), 'v16_n': int(v16.sum()), 'etiket_disi_dusen': dus, 'eski_kalibrasyon_yeniden_uretildi_maks_egri_farki': float(fark),
       'yeni_dosya': ps, 'yeni_sha8': sha8, 'in_sample_BILGI': {'canli_kal__eski_oof': ece(uygula(oofO, canli), y), 'yeni_kal__yeni_oof': ece(uygula(oofN, yeni), y)},
       'capraz': ozet, 'sinif': sinif, 'oof_top1_ham': {'eski_girdi': acc(oofO, y), 'dogru_girdi': acc(oofN, y)}, 'sure_s': round(time.time() - T0)}
json.dump(res, open(f'{OUT}/kalibrasyon_rapor.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps(res, ensure_ascii=False, indent=1))
