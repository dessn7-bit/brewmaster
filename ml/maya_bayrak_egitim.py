# EŞİTLİK SPRINT 3 (kusur 7) — ADIM 1/2: eğitim verisindeki maya dizgeleri ve gerçek maya bayrakları
#
# Ne yapar: v8 eğitim veri setini AKIŞLA okur (json.load yok), her ham maya dizgesi için reçete sayısını ve
#   18 yeast_* bayrağının eğitimdeki oranını sayar; en sık N dizgeyi yazar. Model eğitmez, veri setini değiştirmez.
# Neden: eğitimdeki maya bayrakları tek bir regex'ten değil, birden çok kuralın birleşiminden gelir
#   (_step18c1c5_phase3_rebuild.py: yeni = eski bayrak VEYA yeni desen). Tarayıcının hedefi bu GERÇEK bayraklardır.
#
# Çalıştırma (depo kökünden):
#   python ml/maya_bayrak_egitim.py [--veri working/_step105_dataset_v8_clean.json] [--cikti working/_esitlik/s3/maya_top.json] [--n 20000]
# Girdi: v8 veri seti (repoda YOK — ticari olmayan lisanslı veri; Drive yedeği Brewmaster_ML_Yedek_2026-10-26)
# Çıktı: maya_top.json (ham dizgeler içerir → working/ altında kalır, repoya GİRMEZ)
# Sonraki adım: node ml/maya_bayrak_tablosu.mjs → ml/maya_bayrak_egitim.json (yalnız katalog kimliği + sayı + bayrak)
import argparse, json, sys
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding='utf-8')
ap = argparse.ArgumentParser()
ap.add_argument('--veri', default='working/_step105_dataset_v8_clean.json')
ap.add_argument('--cikti', default='working/_esitlik/s3/maya_top.json')
ap.add_argument('--n', type=int, default=20000)
A = ap.parse_args()

YF = ['yeast_belgian', 'yeast_abbey', 'yeast_saison', 'yeast_kveik', 'yeast_english', 'yeast_american', 'yeast_german_lager',
      'yeast_czech_lager', 'yeast_american_lager', 'yeast_kolsch', 'yeast_altbier', 'yeast_cal_common', 'yeast_brett', 'yeast_lacto',
      'yeast_sour_blend', 'yeast_witbier', 'yeast_wheat_german', 'yeast_wit']


def akis(path):
    """{"recipes": [ {...}, ... ]} dosyasını tek tek kayıt olarak okur (tests/esitlik/ornekle.py ile aynı)."""
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


sayi, bayrak, N = Counter(), defaultdict(Counter), 0
for r in akis(A.veri):
    N += 1
    raw = r.get('raw') or {}
    y = raw.get('yeast') if raw.get('yeast') is not None else raw.get('yeasts')
    if isinstance(y, list):
        y = ' + '.join((x.get('name', '') + ' ' + x.get('lab', '')) if isinstance(x, dict) else str(x) for x in y)
    if not isinstance(y, str):
        continue
    k = ' '.join(y.lower().split())
    sayi[k] += 1
    f = r.get('features') or {}
    for x in YF:
        if f.get(x):
            bayrak[k][x] += 1
top = [{'s': k, 'n': n, 'f': {x: round(v / n, 3) for x, v in bayrak[k].items()}} for k, n in sayi.most_common(A.n)]
json.dump({'recete': N, 'farkli_dizge': len(sayi), 'top': top}, open(A.cikti, 'w', encoding='utf-8'), ensure_ascii=False)
print('reçete', N, 'farklı dizge', len(sayi), 'yazılan', len(top), '→', A.cikti)
