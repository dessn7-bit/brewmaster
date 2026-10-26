# EŞİTLİK TESTİ — analiz + iddialar. tests/esitlik.mjs çağırır (depo kökünden). Klasör: ESITLIK_DIR
# Girdi: ornek_liste.json, ornek_veri.json, tarayici_sonuc.json, python_tahmin.json → rapor.json (+ ekrana özet, PASS/FAIL)
import json, os, re, sys
from collections import Counter, defaultdict
import numpy as np
import xgboost as xgb
import onnxruntime as ort
from sklearn.isotonic import IsotonicRegression

D = os.environ['ESITLIK_DIR']; W = 'working'
V = json.load(open(f'{D}/ornek_veri.json', encoding='utf-8'))
L = json.load(open(f'{D}/ornek_liste.json', encoding='utf-8'))
T = json.load(open(f'{D}/tarayici_sonuc.json', encoding='utf-8'))
P = json.load(open(f'{D}/python_tahmin.json', encoding='utf-8'))
HTML = open(f'{D}/html/Brewmaster_v2_79_10.html', encoding='utf-8').read()
F = V['F89'] + V['NEW20'] + V['NEW7']; CL = P['classes']
REC = {r['id']: r for r in V['veri']}
ids = [i for i in REC if i in T['holdout'] and not T['holdout'][i].get('hata')]
TOL_ABS = TOL_REL = 1e-6
R = {'n_ornek': len(REC), 'n_olculen': len(ids), 'tolerans': {'abs': TOL_ABS, 'rel': TOL_REL}, 'html_md5': T.get('htmlMd5'), 'iddialar': []}
def iddia(kod, ad, ok, kanit, bilgi=False):  # bilgi=True: çıkış koduna girmez (dönüştürmeye bağlı ölçüm)
    R['iddialar'].append({'kod': kod, 'ad': ad, 'sonuc': ('BILGI' if bilgi else 'PASS' if ok else 'FAIL'), 'kanit': kanit})
def satir(desen):  # HTML'de desenin geçtiği satır numarası (kanıt için)
    m = re.search(desen, HTML); return HTML.count('\n', 0, m.start()) + 1 if m else None

def farkli(a, b): return abs(a - b) > max(TOL_ABS, TOL_REL * max(abs(a), abs(b)))
def grup(f):
    j = F.index(f)
    if j >= 109: return 'B1_ext7'
    if j >= 89: return 'B1_ext20'
    if f in ('og', 'fg', 'abv', 'ibu', 'srm'): return 'parametre'
    if f.startswith('pct_') or f == 'total_base': return 'tane_yuzde'
    if f.startswith('yeast_') or f in ('has_belgian_yeast', 'has_clean_us05_isolate', 'has_brett', 'has_lacto', 'has_pedio', 'is_mixed_fermentation', 'is_100pct_brett'): return 'maya'
    if f.startswith('hop_') or f in ('dry_hop_grams_per_liter', 'late_hop_pct', 'has_dry_hop_heavy', 'has_whirlpool_heavy', 'dry_hop_days'): return 'hop'
    if f.startswith('katki_') or f.startswith('has_'): return 'katki_isaret'
    return 'surec_varsayilan'
def kars(a, b):
    a, b = np.asarray(a, float), np.asarray(b, float); d = np.abs(a - b)
    return int(np.argmax(a) == np.argmax(b)), float(d.mean()), float(d.max())
def ozet(rows):
    if not rows: return None
    t = np.array(rows); return {'n': len(rows), 'top1_uyusma': int(t[:, 0].sum()), 'ort_mutlak_fark': float(t[:, 1].mean()), 'en_buyuk_fark': float(t[:, 2].max())}

# ── A. dönüştürme kapsamı
mk = mt = hk = ht = yk = yt = 0; mkg = mtkg = 0.0
for i in ids:
    e = T['holdout'][i]['eslesme']
    for m in e['malt']: mt += 1; kg = float(m.get('kg') or 0); mtkg += kg; mk += bool(m.get('id')); mkg += kg if m.get('id') else 0
    for h in e['hop']: ht += 1; hk += bool(h.get('id'))
    if e.get('maya'): yt += 1; yk += bool(e['maya'].get('id'))
TAM = sorted(i for i in ids if all(m.get('id') for m in T['holdout'][i]['eslesme']['malt']) and (not T['holdout'][i]['eslesme'].get('maya') or T['holdout'][i]['eslesme']['maya'].get('id')))
R['eslesme'] = {'malt_satir': [mk, mt], 'malt_kg_payi': round(mkg / mtkg, 4) if mtkg else None, 'hop_satir': [hk, ht], 'maya': [yk, yt], 'tam_eslenen_recete': [len(TAM), len(ids)]}

# ── B. özellik eşitliği
def ozellik(alt):
    tam = 0; say = Counter(); grp = Counter(); orn = []
    for i in alt:
        p, b = REC[i]['v116'], T['holdout'][i]['v116']
        fk = [j for j in range(116) if farkli(float(p[j]), float(b[j]))]
        tam += not fk
        for j in fk:
            say[F[j]] += 1; grp[grup(F[j])] += 1; orn.append((abs(float(p[j]) - float(b[j])), F[j], i, float(p[j]), float(b[j])))
    orn.sort(reverse=True)
    return {'n': len(alt), 'tam_eslesen_recete': tam, 'farkli_ozellik_sayisi': len(say), 'ozellik_basina_farkli_recete': dict(say.most_common()),
            'grup_basina_fark': dict(grp.most_common()), 'en_buyuk_10': [{'ozellik': f, 'recete': i, 'python': pv, 'tarayici': bv, 'fark': round(d, 6)} for d, f, i, pv, bv in orn[:10]]}
R['ozellik_tum'] = ozellik(ids); R['ozellik_tam_eslenen'] = ozellik(TAM)
sabit = {}
for j, f in enumerate(F):
    bv = {round(float(T['holdout'][i]['v116'][j]), 6) for i in ids}; pv = {round(float(REC[i]['v116'][j]), 6) for i in ids}
    if len(bv) == 1 and len(pv) > 1: sabit[f] = {'tarayici_hep': next(iter(bv)), 'python_farkli_deger_sayisi': len(pv)}
R['tarayicida_sabit_python_degisken'] = sabit

# ── C. çıkarım motoru (aynı Python vektörü → JS vs Python)
mot = defaultdict(list)
for i in ids:
    js, py = T['motor'][i], P['egitim_vektoru'][i]
    mot['V12c'].append(kars(js['v12c'], py['v12c'])); mot['V12_slug'].append(kars(js['v12s'], py['v12s'])); mot['B1_ONNX'].append(kars(js['b1Onnx'], py['b1_onnx']))
    for c, pr in js['vc'].items(): mot['V_cluster'].append(kars(pr, py['vc'][c]['probs']))
R['motor_esitligi'] = {k: ozet(v) for k, v in mot.items()}
CAL = json.load(open(os.environ.get('ESITLIK_KAL') or f'{W}/_step105_calibration/calibration_params.json', encoding='utf-8')); ISO = []  # Sprint 2: HTML'in istediği kalibrasyon
for c in CAL['curves']:
    iso = IsotonicRegression(out_of_bounds='clip', y_min=0.0, y_max=1.0); iso.fit(np.array(c['x']), np.array(c['y'])); ISO.append(iso)
def pycal(raw):
    c = np.array([ISO[k].predict([raw[k]])[0] for k in range(14)]); s = c.sum(); return c / s if s > 0 else c
ovr = [i for i in ids if T['holdout'][i].get('b1Override')]
R['kalibrasyon_kodu'] = ozet([kars(T['holdout'][i]['b1Cal'], pycal(T['holdout'][i]['b1Raw'])) for i in ids if i not in ovr])
R['kalibrasyon_override_ile_degisen'] = {i: T['holdout'][i]['b1Override'] for i in ovr}
# K1 kanıtı: yaprak değeri — JS base_weights okur; XGBoost yaprakta split_conditions kullanır
live = dict(re.findall(r"'([a-z_]+)':\s*WORKER_BASE \+ '/(v_cluster_[a-z_]+_[0-9a-f]{8})\.json'", HTML))
def yaprak_farki(f):
    m = json.load(open(f'{W}/{f}.json')); return sum(sum(1 for n, l in enumerate(t['left_children']) if l == -1 and t['base_weights'][n] != t['split_conditions'][n]) for t in m['learner']['gradient_booster']['model']['trees'])
R['yaprak_base_weights_ne_split_conditions'] = {'V12c': yaprak_farki('_step105_v12cv5/fold1'), 'V12_slug': yaprak_farki('v12slug_v5_model_2df2431a'), **{'V_' + c: yaprak_farki(f) for c, f in live.items()}}

# ── D. kullanıcı yolu
def am(v, cls): return cls[int(np.argmax(v))]
yol = defaultdict(list); acc = defaultdict(lambda: [0, 0, 0])
for i in ids:
    t, py = T['holdout'][i], P['egitim_vektoru'][i]
    yol['V12c'].append(kars(t['v12c'], py['v12c'])); yol['V12_slug_ham'].append(kars(t['v12sRaw'], py['v12s']))
    yol['B1_ham'].append(kars(t['b1Raw'], py['b1_onnx'])); yol['B1_kalibre'].append(kars(t['b1Cal'], py['b1_cal']))
    yol['V12_slug_son_vs_python_ham'].append((int(t['v12sFinTop'] == am(py['v12s'], CL['v12s'])), 0, 0))
    yol['B1_son_vs_python_kalibre'].append((int(t['b1Top'] == py['b1_top_cal']), 0, 0))
    yol['StrategyC_son_vs_python_B1_Vcluster_argmax'].append((int(t.get('stcTop') == py.get('hier_slug')), 0, 0))
    f1 = REC[i]['fold'] == 1
    for ad, pyt, brt, hedef in (('kume_V12c', am(py['v12c'], CL['v12c']), am(t['v12c'], CL['v12c']), REC[i]['label_v8']), ('kume_B1_son', py['b1_top_cal'], t['b1Top'], REC[i]['label_v8']),
                                ('slug_V12_son', am(py['v12s'], CL['v12s']), t['v12sFinTop'], REC[i]['bjcp_slug']), ('slug_StrategyC', py.get('hier_slug'), t.get('stcTop'), REC[i]['bjcp_slug'])):
        for k in ([ad + '|tum', ad + '|fold1_val'] if f1 else [ad + '|tum']):
            a = acc[k]; a[0] += 1; a[1] += int(pyt == hedef); a[2] += int(brt == hedef)
R['kullanici_yolu'] = {k: ozet(v) for k, v in yol.items()}
R['dogruluk_etikete_gore'] = {k: {'n': a[0], 'python_egitim_yolu': a[1], 'tarayici_kullanici_yolu': a[2]} for k, a in acc.items()}
if 'tarayici_vektoru' in P:
    ay = defaultdict(list)
    for i in ids:
        q = P['tarayici_vektoru'].get(i); t = T['holdout'][i]
        if q: ay['V12c'].append(kars(t['v12c'], q['v12c'])); ay['B1_ham'].append(kars(t['b1Raw'], q['b1_onnx']))
    R['python_model_tarayici_vektoru'] = {k: ozet(v) for k, v in ay.items()}

# ── E. kök neden etkisi: grup değiş-tokuşu + süreç alanı duyarlılığı (Python V12c + B1; motorları JS ile eşit)
MC = xgb.Booster(); MC.load_model(f'{W}/_step105_v12cv5/fold1.json')
SO = ort.InferenceSession(f'{W}/_step105_b1v8_fold1.onnx', providers=['CPUExecutionProvider']); SO.set_providers(['CPUExecutionProvider'])
def tah(X):
    X = np.asarray(X, np.float32); pc = MC.predict(xgb.DMatrix(X[:, :89]))
    raw = [np.asarray(o) for o in SO.run(None, {SO.get_inputs()[0].name: X}) if not isinstance(o, list) and np.asarray(o).ndim == 2][0]
    cal = np.stack([ISO[k].predict(raw[:, k]) for k in range(14)], 1); cal /= cal.sum(1, keepdims=True); return pc.argmax(1), cal.argmax(1)
Pm = np.array([REC[i]['v116'] for i in ids], np.float32); Bm = np.array([T['holdout'][i]['v116'] for i in ids], np.float32)
p0c, p0b = tah(Pm); b0c, b0b = tah(Bm)
G = defaultdict(list)
for j, f in enumerate(F): G[grup(f)].append(j)
abl = {'taban': {'V12c': int((b0c == p0c).sum()), 'B1': int((b0b == p0b).sum())}}
for g, js in G.items():
    X = Bm.copy(); X[:, js] = Pm[:, js]; c, b = tah(X); abl['yalniz_' + g] = {'V12c': int((c == p0c).sum()), 'B1': int((b == p0b).sum())}
    X = Pm.copy(); X[:, js] = Bm[:, js]; c, b = tah(X); abl['egitim_vektorunde_yalniz_tarayici_' + g] = {'V12c': int((c == p0c).sum()), 'B1': int((b == p0b).sum())}
R['grup_degis_tokus'] = abl
SUREC = ['mash_type_step', 'mash_temp_c', 'water_ca_ppm', 'water_so4_ppm', 'water_cl_ppm', 'fermentation_temp_c', 'lagering_days']
J = [F.index(f) for f in SUREC]
def duyarlilik(B):
    Z = B.copy(); Z[:, J] = 0; a, b = tah(B); c, d = tah(Z); return int((a != c).sum()), int((b != d).sum())
R['surec_alani_0_olunca_degisen'] = {'holdout': duyarlilik(Bm), 'n': len(ids)}
KAAN = [k for k, v in T.get('kaan', {}).items() if not v.get('hata')]
if KAAN:
    Kb = np.array([T['kaan'][k]['v116'] for k in KAAN], np.float32); R['surec_alani_0_olunca_degisen']['kaan'] = duyarlilik(Kb); R['surec_alani_0_olunca_degisen']['kaan_n'] = len(KAAN)
R['egitim_surec_dagilimi'] = L.get('egitim_surec_dagilimi')

# ── F. Kaan reçeteleri
K = {}
for rid in KAAN:
    t = T['kaan'][rid]; q = P.get('tarayici_vektoru', {}).get('KAAN:' + rid)
    K[rid] = {'ad': t.get('ad'), 'maya': t.get('mayaId'), 'katki': t.get('katki'), 'V12c_top': am(t['v12c'], CL['v12c']),
              'B1_kalibre': {c: round(x, 4) for c, x in zip(CL['b1'], t['b1Cal']) if x > 0.01}, 'B1_top': t.get('b1Top'), 'slug_son': t.get('v12sFinTop'), 'strategyC': t.get('stcTop'),
              'ayni_vektorde_python_B1_ham_maks_fark': (float(np.max(np.abs(np.array(q['b1_onnx']) - np.array(t['b1Raw'])))) if q else None),
              'ozellik_sifir_olmayan': {F[j]: round(t['v116'][j], 4) for j in range(116) if t['v116'][j]}}
R['kaan_receteleri'] = K

# ── G. kod kaynaklı kusurların doğrudan kontrolleri
PCT = [f for f in V['F89'] if f.startswith('pct_') and f != 'pct_other']
asan = [i for i in ids if sum(T['holdout'][i]['v116'][F.index(f)] for f in PCT) > 100.5]
R['pct_toplami_100u_asan'] = {'tarayici': asan, 'python': [i for i in ids if sum(REC[i]['v116'][F.index(f)] for f in PCT) > 100.5]}
HOPF = ['hop_bittering_amount_total_g', 'hop_aroma_amount_total_g', 'hop_bitter_to_aroma_ratio', 'hop_dry_hop_phase_count']
R['b1_hop_alanlari_sifir_olmayan'] = {f: {'python': sum(1 for i in ids if REC[i]['v116'][F.index(f)]), 'tarayici': sum(1 for i in ids if T['holdout'][i]['v116'][F.index(f)])} for f in HOPF}
R['kod_satirlari'] = {'evalTree_baseW': satir(r"return baseW\[nid\];"), 'build20_hop_gr': satir(r"var amt = \+h\.gr \|\| 0"), 'build20_dry_t': satir(r"h\.t === 0 \|\| h\.tip === 'dryhop'"),
                      'S_hoplar_g_dk_tur_ornek': satir(r"S\.hoplar\.push\(\{id:hop\.id, g:parsed\.gram, dk:_newDk, tur:'boil'"), 'victory_pale': satir(r"var _PALE_ALE_IDS = \["), 'victory_roast': satir(r"var _ROAST_IDS = \["),
                      'surec_varsayilan': satir(r"mash_type_step: 1, mash_type_decoction: 0"), 'ibu_25': satir(r"ibu: r\._ibu \|\| 25"), 'buildText7_maya': satir(r"if \(uiR\.maya\) mayaId"),
                      'katki_active_count': satir(r"var katkiActive = katkiIds\.length;"), 'mash_steps_1': satir(r"var mashSteps = \+\(uiR && uiR\.mash_steps\) \|\| 1;"), 'yeast_english': satir(r"var yeast_english = \(mt === 'ale'")}

# ── iddialar (bugünkü durum ölçülür; düzeltme bu testin işi DEĞİL)
for k, lim in (('V12c', 1e-5), ('V12_slug', 1e-5), ('B1_ONNX', 1e-5), ('V_cluster', 1e-5)):
    o = R['motor_esitligi'][k]; iddia('M-' + k, f'{k}: aynı vektörde JS = Python (top-1 tam, maks fark ≤ {lim})', o['top1_uyusma'] == o['n'] and o['en_buyuk_fark'] <= lim, o)
o = R['kalibrasyon_kodu']; iddia('M-KAL', 'isotonic kalibrasyon kodu JS = Python (override hariç)', o['top1_uyusma'] == o['n'] and o['en_buyuk_fark'] <= 1e-6, o)
iddia('K-HOP', 'B1 hop gramaj alanları tarayıcıda hesaplanıyor (Python sıfırdan farklıysa tarayıcı da)', all(v['tarayici'] > 0 or v['python'] == 0 for v in R['b1_hop_alanlari_sifir_olmayan'].values()), R['b1_hop_alanlari_sifir_olmayan'])
iddia('K-PCT', 'tane yüzdeleri toplamı %100\'ü aşmıyor', not asan, {'asan': asan[:10], 'n': len(asan)})
o = R['surec_alani_0_olunca_degisen']; iddia('K-SUREC', 'süreç alanlarının eğitim kaynağı imzası kararı değiştirmiyor (0 yapılınca top-1 aynı)', o['holdout'] == (0, 0), o)
o = R['kullanici_yolu']['V12c']; iddia('Y-V12c', 'kullanıcı yolu: tarayıcı V12c top-1 = eğitim yolu (dönüştürme kayıplı → yalnız bilgi)', o['top1_uyusma'] == o['n'], o, bilgi=True)

json.dump(R, open(f'{D}/rapor.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for x in R['iddialar']: print(f"  {x['sonuc']}  {x['kod']:10s} {x['ad']}")
print('eşleme:', R['eslesme']); print('motor:', json.dumps(R['motor_esitligi'])); print('kullanıcı yolu:', json.dumps(R['kullanici_yolu']))
print('özellik (tümü): tam eşleşen', R['ozellik_tum']['tam_eslesen_recete'], '/', R['ozellik_tum']['n'], '| grup', R['ozellik_tum']['grup_basina_fark'])
print('yaprak base_weights≠split_conditions:', R['yaprak_base_weights_ne_split_conditions'])
print('grup değiş-tokuşu:', json.dumps(R['grup_degis_tokus']))
print('süreç alanı 0:', R['surec_alani_0_olunca_degisen'])
print('rapor:', f'{D}/rapor.json')
sys.exit(0 if all(x['sonuc'] != 'FAIL' for x in R['iddialar']) else 1)
