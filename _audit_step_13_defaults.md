# Adım 13 — V6 feature defaults hesaplandı (CHECKPOINT)

## Komutlar

```
node _calc_v6_defaults.js
```

Yöntem: V6 dataset'inde (1100 reçete) 7 fiziksel feature için non-zero değerlerin median, p25, p75, mean, min, max istatistikleri.

## Ham çıktı

```
Total records: 1100

feature                | non-zero N | min   | p25   | median | p75   | max   | mean
-----------------------+-----------+-------+-------+--------+-------+-------+------
mash_temp_c            |      1100 |    63 |    65 |     66 |    66 |    68 | 65.82
fermentation_temp_c    |      1100 |     9 |    19 |     19 |    19 |    26 | 18.54
yeast_attenuation      |      1100 |    72 |    78 |     78 |    80 |    88 | 78.98
boil_time_min          |      1100 |    60 |    60 |     60 |    75 |    90 | 66.84
water_ca_ppm           |      1100 |    60 |   120 |    150 |   150 |   350 | 155.85
water_so4_ppm          |      1100 |    40 |   180 |    250 |   250 |   450 | 224.43
water_cl_ppm           |      1100 |    50 |   100 |    120 |   120 |  1000 | 127.99
```

## Önemli not

Tüm 1100 reçetede 7 feature'ın hepsi non-zero — yani dataset'te bu alanlar **eksiksiz** doldurulmuş. Median'lar güvenilir.

Min değerlerine bak: `mash_temp_c >= 63°C, fermentation_temp_c >= 9°C, yeast_attenuation >= 72%, boil_time_min >= 60dk, water_ppm'ler >= 40-60` — fiziksel imkansız 0 değerleri dataset'te yok. Adapter UI form'da 0 gönderdiği için V6 motoru bu boyutlarda **tüm 1100 reçeteden uzak** kalıyor → KNN tutarsız komşu seçiyor.

## Önerilen V6_DEFAULTS

```js
const V6_DEFAULTS = {
  mash_temp_c: 66,           // °C, klasik single-step mash
  fermentation_temp_c: 19,   // °C, ortalama ale fermantasyon
  yeast_attenuation: 78,     // %, ale mayası standart
  boil_time_min: 60,         // dk, klasik kaynama
  water_ca_ppm: 150,         // mg/L, orta sertlik
  water_so4_ppm: 250,        // mg/L, orta-yüksek (dataset ortalaması)
  water_cl_ppm: 120          // mg/L, orta (dataset ortalaması)
};
```

## Kısıt — dataset bias notu

Median'lar **dataset'in genel ortalamasını** yansıtır. Dataset 1100 reçetenin çoğunluğu American craft (IPA, Pale Ale) + Belgian + German karışımı. Defaults bu populasyonun ortancasıdır:
- `water_so4_ppm: 250` görece yüksek → American IPA/Burton-style'a yakın, Pilsner/Helles'e uzak
- `fermentation_temp_c: 19` ale-mid → lager (10-12°C) ya da Belgian (22-26°C) için orta uzak
- `mash_temp_c: 66` orta-kuru bitiş — saison/Belgian (yüksek attenuation hedefi) için biraz düşük

Bu defaults Berliner Weisse'den **uzaklaştırıyor** (Berliner ferm temp 22-32°C, attenuation 78-85, ama yeast_lacto=1 olur, Muzo'da 0). Belgian Dubbel'e (ferm 22-26°C, water Ca yüksek) **biraz daha yakın** ama mükemmel değil. Ana umut: yeast_belgian=1 + yeast_abbey=1 + dark_color=1 zaten set, bu varsayılanların eklenmesi V6'yı **dataset'in çoğunluğu olan "normal beer" cluster'ına** çekecek; Berliner aşırı uçtan kurtaracak.

Adım B'de Muzo özel testi yapılacak. Beklenti: belgian_dubbel veya belgian_dark_strong_ale.

## Durum: ✅ Defaults hesaplandı, CHECKPOINT

## Tek satır yorum

7 fiziksel feature'ın V6 dataset (1100 reçete) içindeki non-zero median'ları hesaplandı, hepsi tüm reçetelerde dolu (dataset eksik değil — sadece UI adapter 0 gönderiyordu); Belgian Dubbel için ideal değil ama Berliner Weisse aşırı uçtan kurtarmaya yetecek seviyede uygun, Muzo özel testi Adım B'de doğrulayacak.

---

=== KAAN ONAYI BEKLENİYOR ===

Feature defaults hesaplandı. Önerilen 7 değer:

```
  mash_temp_c:         66    (median, range 63-68)
  fermentation_temp_c: 19    (median, range 9-26)
  yeast_attenuation:   78    (median, range 72-88, %)
  boil_time_min:       60    (median, range 60-90)
  water_ca_ppm:        150   (median, range 60-350)
  water_so4_ppm:       250   (median, range 40-450)
  water_cl_ppm:        120   (median, range 50-1000)
```

Tüm değerler dataset'te eksiksiz (1100/1100 non-zero), median'lar güvenilir.

**Önemli kısıt:** `water_so4_ppm: 250` görece yüksek (American IPA/Burton-style imzası) — Belgian Dubbel gibi düşük sülfatlı stiller için ideal değil. Yine de UI adapter'in 0 göndermesinden çok daha iyi (V6'yı Berliner Weisse aşırı uçtan kurtarır).

Adım B'ye geçmek için Kaan onayı gerekli. **DURUYORUM.**
