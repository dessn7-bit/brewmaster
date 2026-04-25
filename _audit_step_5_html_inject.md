# Adım 5 — production HTML'e enjekte

## Komutlar

```
cp Brewmaster_v2_79_10.html Brewmaster_v2_79_10.BACKUP_PRE_V6_FINAL.html
node _inject_v6_final.js
grep -oE 'id="bm-engine-[a-z0-9.-]+"' Brewmaster_v2_79_10.html | sort | uniq -c
node -e "<vm.Script syntax check>"
```

## Ham çıktı

### Backup oluştu

```
-rw-r--r-- 1 Kaan 197121 3810685 Apr 25 23:13 Brewmaster_v2_79_10.BACKUP_PRE_V6_FINAL.html
```

### Enjekte sırasında ne oldu

```
- V3 motor blok silindi (39843 byte)
- V4 motor blok silindi (62233 byte)
- V7 motor blok silindi (128775 byte)
- V3 adapter silindi (910 byte)
- V4 adapter silindi (1037 byte)
- V7 adapter silindi+V6 adapter eklendi (918 byte → V6)
- __top3V5_engine → __top3V6_engine rename: 11 → 14 occurrence
+ V6 final motor enjekte edildi (V5 sonrasına): 1651309 byte

HTML before: 3740509 chars
HTML after:  5163136 chars
Delta:       +1422627 chars
```

### Kalan motor blokları

```
1 id="bm-engine-v2c"        (rule-based UI box, eski — Opus dokunmadı)
1 id="bm-engine-v5"         (fallback — KORUNDU)
1 id="bm-engine-v6-final"   (yeni production motor — V5 sonrasına enjekte)
```

### Orphan referanslar temizlendi

```
BM_ENGINE_V3 / V4 / V7 referansı: 0 (tümü silindi)
BM_ENGINE_V5 / V6_FINAL referansı: 10
__top3V5_engine / __top3V7_engine: 0
__top3V6_engine: 8 (1 var def + 3 V6 adapter + 4 downstream stil_tah)
```

### Önemli yan bulgu — V7'nin gizli bug'ı

V7 deploy yapılırken downstream `stil_tah` logic'i `__top3V5_engine`'ı (atanmamış değişkeni) okuyordu. Bu nedenle V7 motor sonuçları **production'da hiçbir zaman `stil_tah`'a yansımıyordu**, sadece console.log'a düşüyordu. Görüntülenen stil etiketi legacy rule-based fallback (line 25296) idi.

V6 enjekte edilirken `__top3V6_engine` ile rename yapıldı — V6 sonuçları artık downstream logic'e doğru aktarılıyor (line 13817, 13914 referansları artık tanımlı değişkene bakıyor).

### V6 adapter — recipe → V6 features çevirimi

Brewmaster UI'sinin form state objesi (`__recipeV2`) V6 motorunun beklediği 79 feature'dan farklı şekilde. Adapter `__v6Features` builder ekledi:
- og/fg/abv/ibu/srm — direkt
- pct_* — `r.percents` mapping
- yeast_* — `r._mayaTip` + `r.mayaId` boolean projection
- katki_lactose — `r.lactose`
- high_hop / strong_abv / dark_color / pale_color — eşik tabanlı
- hop_* / katki_* (lactose hariç) — UI form'da yok, default 0
- mash_temp_c, water_*, fermentation_temp_c, boil_time_min — UI form'da yok, default 0
- yeast_abbey, yeast_witbier, yeast_saison_3724/dupont, lagering_days — maya tipinden türetildi

NOT: V6'nın 18 ekstra feature'ından çoğu Brewmaster UI'sinde girdi olarak yok. Bu feature'lar default 0 değer alıyor — V6 motorunun çalışmasını engellemiyor (Manhattan distance 0 vs 0 = 0 katkı), ama bu feature'lardan beslenen veto rules ve weighted scoring kısmen etkisiz kalıyor (yeast_abbey gibi feature için ENHANCED_FEATURE_WEIGHTS 3.0 boost'u 0 değerli feature için anlamsız).

### Syntax kontrol

```
bm-engine-v2c parse OK (468.8KB)
bm-engine-v5 parse OK (989.0KB)
bm-engine-v6-final parse OK (1612.6KB)
```

## Durum: ✅

## Tek satır yorum

V3/V4/V7 motorları + adapter'ları silindi (toplam ~233KB), V5 fallback olarak korundu, V6 final motor (1.61MB) V5 sonrasına enjekte edildi, V7 deploy'unun sebep olduğu `__top3V5_engine` orphan referansı V6'ya yönlendirildi (V7'nin gizli bug'ı düzeltildi), tüm script blokları parse OK; yeni HTML 5.16MB.
