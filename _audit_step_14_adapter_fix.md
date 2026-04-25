# Adım 14 — V6 adapter defaults eklendi (CHECKPOINT — push ÖNCESİ)

## Yapılan değişiklikler (lokal, henüz commit yok)

### 1. V6_DEFAULTS objesi — adapter try {}'inin hemen üstüne eklendi (line 13338-13346)

```js
var V6_DEFAULTS = {
  mash_temp_c: 66,
  fermentation_temp_c: 19,
  yeast_attenuation: 78,
  boil_time_min: 60,
  water_ca_ppm: 150,
  water_so4_ppm: 250,
  water_cl_ppm: 120
};
```

### 2. Feature builder — 7 fiziksel feature için default fallback (line 13396-13402)

Eski:
```js
f.mash_temp_c = 0; f.fermentation_temp_c = 0;
f.water_ca_ppm = 0; f.water_so4_ppm = 0; f.water_cl_ppm = 0;
f.yeast_attenuation = 0; f.boil_time_min = 0; f.dry_hop_days = (r.dhPer10L>0) ? 5 : 0;
```

Yeni:
```js
f.mash_temp_c = (r.mash_temp_c > 0) ? r.mash_temp_c : V6_DEFAULTS.mash_temp_c;
f.fermentation_temp_c = (r.fermentation_temp_c > 0) ? r.fermentation_temp_c : V6_DEFAULTS.fermentation_temp_c;
f.water_ca_ppm = (r.water_ca_ppm > 0) ? r.water_ca_ppm : V6_DEFAULTS.water_ca_ppm;
f.water_so4_ppm = (r.water_so4_ppm > 0) ? r.water_so4_ppm : V6_DEFAULTS.water_so4_ppm;
f.water_cl_ppm = (r.water_cl_ppm > 0) ? r.water_cl_ppm : V6_DEFAULTS.water_cl_ppm;
f.yeast_attenuation = (r.yeast_attenuation > 0) ? r.yeast_attenuation : V6_DEFAULTS.yeast_attenuation;
f.boil_time_min = (r.boil_time_min > 0) ? r.boil_time_min : V6_DEFAULTS.boil_time_min;
f.dry_hop_days = (r.dhPer10L>0) ? 5 : 0;
```

### 3. Debug log temizlendi

Adım 13a'da eklenen 2 satır console.log silindi.

## Doğrulama

### Parse-guard

```
Script #1 OK (468.8KB) <script id="bm-engine-v2c"
Script #2 OK (989.0KB) <script id="bm-engine-v5"
Script #3 OK (1612.6KB) <script id="bm-engine-v6-final"
Script #4 OK (1455.7KB) <script
Total scripts: 4, Errors: 0
```

### Smoke test (5 reçete)

```
5/5 top-1 doğru — önceki ile birebir aynı (defaults UI adapter için, smoke datasetten direkt feature alıyor)
```

### LOO test (5 reçete)

```
Top-1: 4/5  Top-3: 5/5 — önceki ile birebir aynı
```

### Muzo özel test (KRİTİK)

```
Adapter'in V6'ya gönderdiği kritik features:
  og: 1.065 | fg: 1.012 | abv: 6.93 | ibu: 4 | srm: 24.1
  yeast_belgian: 1 | yeast_abbey: 1
  dark_color: 1 | high_hop: 0
  mash_temp_c: 66 (default 66)
  fermentation_temp_c: 19 (default 19)
  yeast_attenuation: 78 (default 78)
  boil_time_min: 60 (default 60)
  water_ca_ppm: 150
  water_so4_ppm: 250
  water_cl_ppm: 120

V6 motor top-5:
  1. american_amber_red_ale (American Amber Red Ale) %25
  2. scotch_ale_or_wee_heavy (Scotch Ale Or Wee Heavy) %20
  3. irish_red_ale (Irish Red Ale) %19
  4. chocolate_or_cocoa_beer (Chocolate Or Cocoa Beer) %19
  5. winter_seasonal_beer (Winter Seasonal Beer) %17

Top-1: american_amber_red_ale
```

## Sonuç değerlendirme — KARIŞIK

| Hedef | Sonuç |
|---|---|
| ❌ Berliner Weisse top-1 olmasın (forbidden) | **✅ TUTTU** — Berliner top-5'te bile yok |
| ✅ Belgian ailesi top-1 (acceptable: belgian_dubbel, belgian_dark_strong_ale, belgian_strong_dark_ale, belgian_tripel, abbey_ale) | **❌ TUTMADI** — top-5'in tamamı non-Belgian |

**Top-5 analizi:** american_amber_red_ale (1.), scotch_ale_or_wee_heavy (2.), irish_red_ale (3.), chocolate_or_cocoa_beer (4.), winter_seasonal_beer (5.) — hepsi koyu renkli düşük-orta IBU stilleri ama **Belgian ailesi yok**.

**Olası sebep:** `water_so4_ppm: 250` American/Burton imzası, `fermentation_temp_c: 19` ale-mid (Belgian 22-26°C olur), `yeast_attenuation: 78` Belgian'ın 80-85'ine biraz düşük. Bu üç default Belgian komşulardan uzaklaştırıyor.

`yeast_belgian=1` ve `yeast_abbey=1` (her biri ENHANCED_FEATURE_WEIGHTS'da 3.0 boost) yeterli kuvvet sağlamıyor — su kimyası ve fermentation_temp Belgian'a doğru yön vermiyor.

## Opus'un emri vs sonuç

Opus'un rollback şartı: *"Hâlâ Berliner Weisse top-1: defaults yetersiz, BACKUP'a geri dön, BİLDİR, DUR."* — Berliner yok artık, **rollback şartı tetiklenmedi**.

Opus'un başarı kriteri: *"Beklenti: belgian_dubbel | belgian_dark_strong_ale | belgian_strong_dark_ale | belgian_tripel"* — **karşılanmadı**.

Adım C komutu: *"COMMIT + PUSH (Muzo testi geçerse)"* — testin "geçtiği" tartışmalı. Kaan'ın açıklaması "Belgian Dark Strong Ale çıkarsa da sorun değil, Berliner'den çıkmak ana hedef" — bu yumuşak yorumda **geçti** sayılır (Berliner kurtuldu); strict yorumda **geçmedi** (Belgian ailesi yok).

## Push edilmedi — Kaan kararı bekleniyor

3 seçenek:

**A) Mevcut hâliyle push et** — Berliner kurtarıldı, ama Muzo Belgian Dubbel yerine American Amber Red Ale görünür. Etiket eski "🎯 BETA V5" kalıyor (kozmetik, ayrı sprint). 1100 reçete dataset → V6 Muzo için "non-Belgian" diyor — bu motor sınırı, adapter sorunu değil olabilir.

**B) Daha agresif Belgian-bias defaults dene** — water_so4_ppm 250 → 50-80 (Belgian'a yakın), fermentation_temp_c 19 → 23 (Belgian/Saison'a yakın), yeast_attenuation 78 → 82. Bu 7 feature'ın "ortalama Belgian" değeri olur, ama yeast_belgian=0 olan reçeteler için bias yaratır (American Amber kullanıcıları artık Burton imzasında olmaz).

**C) Rollback** — backup'a dön, defaults çalışmadı sonucuyla, V6 adapter sorununu farklı yoldan çöz.

## Durum: ⚠️ KARIŞIK — KAAN ONAYI BEKLENİYOR

## Tek satır yorum

V6 defaults Berliner Weisse hatasını çözdü (top-5'te bile yok artık), ama Muzo için Belgian ailesi top-5'te de yok — top-1 American Amber Red Ale; Opus'un "Berliner top-1 → rollback" şartı tetiklenmedi ama "Belgian ailesi" başarı kriteri karşılanmadı, Kaan/Opus karar versin.

---

=== KAAN ONAYI BEKLENİYOR ===

Muzo testi karışık çıktı:
- ✅ Berliner Weisse hatası kurtarıldı (top-5'te bile yok)
- ❌ Belgian ailesi top-5'te yok (top-1: american_amber_red_ale %25)

3 seçenek:
- (A) Bu hâliyle push et (Berliner kurtuldu, American Amber kabul)
- (B) Daha agresif Belgian-bias defaults dene
- (C) Rollback, farklı yoldan çöz

**DURUYORUM.**
