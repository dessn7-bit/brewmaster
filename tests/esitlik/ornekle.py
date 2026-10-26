# EŞİTLİK TESTİ — ADIM 2: örneklem + Python tarafı özellik vektörleri (eğitimle AYNI kod yolu)
# Salt okur. Çıktı: ornek_liste.json, ornek_veri.json (bu klasöre).
# tests/esitlik.mjs çağırır (depo kökünden). Çıktı klasörü: ESITLIK_DIR
import json, os, random, sys, time, importlib.util
from collections import Counter, defaultdict
import numpy as np
from sklearn.model_selection import StratifiedKFold

T0 = time.time()
OUT = os.environ['ESITLIK_DIR']
DATASET = 'working/_step105_dataset_v8_clean.json'
NPY = 'working/_step79_new_features_376k.npy'
SEED = int(os.environ.get('ESITLIK_SEED', '20261026'))
PER_CLUSTER = int(os.environ.get('ESITLIK_KUME', '15'))   # 14 küme x 15 = 210

# extract_new_20 + NEW_FEATURES_* eğitim betiğinden AYNEN alınır (kopya değil, kaynaktan yüklenir)
src = open('working/_step105_b1v8_retrain.py', encoding='utf-8').read()
start = src.index('# Adim 67 B1_v3 ek 20 feature listesi')
end = src.index('# LOAD: encoder + dataset + NEW_FEATURES_7 npy')
ns = {}
exec('import re\n' + src[start:end].rsplit('# ====', 1)[0], ns)
extract_new_20, NEW20, NEW7 = ns['extract_new_20'], ns['NEW_FEATURES_20'], ns['NEW_FEATURES_7']

LE89 = json.load(open('working/_v19_v28j_a_label_encoder_14cat.json', encoding='utf-8'))
F89 = LE89['feature_list']
CL14 = json.load(open('working/_step105_label_encoder_14cat.json', encoding='utf-8'))['classes']
assert len(F89) == 89 and len(CL14) == 14


def akis(path):
    """{"recipes": [ {...}, ... ]} dosyasını tek tek kayıt olarak okur (tümünü belleğe almadan)."""
    dec = json.JSONDecoder()
    with open(path, encoding='utf-8') as f:
        buf = f.read(1 << 22)
        i = buf.index('[') + 1
        while True:
            while True:
                while i < len(buf) and buf[i] in ' \r\n\t,':
                    i += 1
                if i < len(buf):
                    break
                more = f.read(1 << 22)
                if not more:
                    return
                buf, i = buf[i:] + more, 0
            if buf[i] == ']':
                return
            try:
                obj, j = dec.raw_decode(buf, i)
            except json.JSONDecodeError:
                more = f.read(1 << 24)
                if not more:
                    raise
                buf, i = buf[i:] + more, 0
                continue
            yield obj
            i = j
            if i > (1 << 23):
                buf, i = buf[i:], 0


# geçiş 1: slug sayımı (eğitimdeki slug_keep ile aynı)
cnt = Counter()
for r in akis(DATASET):
    if r.get('bjcp_slug'):
        cnt[r['bjcp_slug']] += 1
keep = {s for s, c in cnt.items() if c >= 10}
print(f'[{time.time()-T0:.0f}s] geçiş 1: {sum(cnt.values()):,} slug etiketi, keep {len(keep)}', flush=True)

# geçiş 2: eğitim sırasındaki indeks + etiket + V16 aday havuzu
y_all, aday = [], defaultdict(list)
SUREC = ['mash_type_step','mash_temp_c','water_ca_ppm','water_so4_ppm','water_cl_ppm','fermentation_temp_c','lagering_days','boil_time_min','yeast_attenuation']
dagilim = {k: {'rmwoods': Counter(), 'V16': Counter()} for k in SUREC}
idx = 0
for r in akis(DATASET):
    if r.get('bjcp_slug') not in keep:
        continue
    _f = r.get('features') or {}; _g = 'rmwoods' if r.get('source') == 'rmwoods' else 'V16'
    for _k in SUREC: dagilim[_k][_g][round(float(_f.get(_k, 0) or 0), 1)] += 1
    lab = r.get('label_v8')
    y_all.append(CL14.index(lab) if lab in CL14 else -1)
    if r.get('source') != 'rmwoods' and lab in CL14:
        aday[lab].append(idx)
    idx += 1
N = idx
y = np.array(y_all)
assert (y >= 0).all(), 'eğitimde düşen etiket var (drops beklenmiyordu: 0)'
print(f'[{time.time()-T0:.0f}s] geçiş 2: N={N:,} (log: 376,801), V16 aday {sum(len(v) for v in aday.values()):,}', flush=True)

# fold ataması — eğitimle aynı (StratifiedKFold 5, shuffle, 42); canlı model = fold1 (1. bölmenin val kümesi dışında eğitildi)
skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
fold_of = np.zeros(N, dtype=np.int8)
for k, (_, va) in enumerate(skf.split(np.zeros(N), y), 1):
    fold_of[va] = k

rng = random.Random(SEED)
secim = []
for lab in CL14:
    havuz = sorted(aday.get(lab, []))
    secim += [(lab, i) for i in rng.sample(havuz, min(PER_CLUSTER, len(havuz)))]
sec_idx = {i: lab for lab, i in secim}

new7 = np.load(NPY)
assert new7.shape[0] == N
veri, idx = [], 0
for r in akis(DATASET):
    if r.get('bjcp_slug') not in keep:
        continue
    if idx in sec_idx:
        feats = r.get('features', {}) or {}
        v89 = [float(feats.get(fn, 0) or 0) for fn in F89]
        n20 = extract_new_20(r)
        v20 = [float(n20.get(fn, 0) or 0) for fn in NEW20]
        v7 = [float(x) for x in new7[idx]]
        veri.append({'idx': idx, 'id': r.get('id'), 'source': r.get('source'), 'name': r.get('name'),
                     'bjcp_slug': r.get('bjcp_slug'), 'label_v8': r.get('label_v8'), 'fold': int(fold_of[idx]),
                     'raw': r.get('raw'), 'features': feats, 'v116': v89 + v20 + v7})
    idx += 1
veri.sort(key=lambda x: x['idx'])
liste = [{k: v[k] for k in ('idx', 'id', 'source', 'name', 'bjcp_slug', 'label_v8', 'fold')} for v in veri]
json.dump({'egitim_surec_dagilimi': {k: {g: {str(v): n for v, n in c.most_common(5)} for g, c in d.items()} for k, d in dagilim.items()},
           'seed': SEED, 'per_cluster': PER_CLUSTER, 'N_egitim': N, 'kaynak_filtresi': 'source != rmwoods (V16)',
           'katman': 'label_v8 (14 küme)', 'sayim': Counter(v['label_v8'] for v in veri), 'ornekler': liste},
          open(os.path.join(OUT, 'ornek_liste.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump({'F89': F89, 'NEW20': NEW20, 'NEW7': NEW7, 'veri': veri},
          open(os.path.join(OUT, 'ornek_veri.json'), 'w', encoding='utf-8'), ensure_ascii=False)
print(f'[{time.time()-T0:.0f}s] seçilen {len(veri)}; küme başına: {dict(Counter(v["label_v8"] for v in veri))}', flush=True)
print('fold1 val (canlı model için örneklem dışı):', sum(1 for v in veri if v['fold'] == 1), flush=True)
