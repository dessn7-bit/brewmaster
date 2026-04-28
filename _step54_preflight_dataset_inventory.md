# Adım 54 Pre-flight — V17 dataset slug breakdown

**Tarih:** 2026-04-28
**Dataset:** `_v17_dataset.json` (521 MB, 301,316 reçete, 127 unique slug)
**V17 train ≥10 filter:** 82 slug aktif eğitildi, 45 slug drop edildi

---

## Özet bulgular

- **127 unique slug** dataset'te ham olarak; 82'si production XGBoost modelinde (≥10 filter)
- **97.02% rmwoods** kaynaklı (292,337 reçete) — V17 efektif olarak rmwoods dataset'i
- **Sour cluster %1.34** total → kritik dengesizlik kaynağı
- **45 slug <10 reçete** (kritik) — model'de yok, çoğu V16 kaynaklı az örnek
- **Hiç slug "non_rm yüksek + rmwoods düşük" kombinasyonunda DEĞİL** — rmwoods her stilde dominant

---

## 1. Slug breakdown (top 30, tam liste sonda)

| Slug | Cluster | n | %total |
|---|---|---|---|
| american_india_pale_ale | ipa | 44,407 | 14.74% |
| american_pale_ale | pale_ale | 34,560 | 11.47% |
| specialty_beer | specialty | 21,961 | 7.29% |
| double_ipa | ipa | 12,664 | 4.20% |
| french_belgian_saison | saison | 10,667 | 3.54% |
| american_amber_red_ale | pale_ale | 9,399 | 3.12% |
| american_imperial_stout | stout | 7,139 | 2.37% |
| american_wheat_ale | wheat | 7,001 | 2.32% |
| american_brown_ale | brown | 6,937 | 2.30% |
| robust_porter | porter | 6,610 | 2.19% |
| south_german_hefeweizen | wheat | 6,448 | 2.14% |
| extra_special_bitter | bitter | 6,002 | 1.99% |
| blonde_ale | cream | 5,834 | 1.94% |
| sweet_stout | stout | 5,301 | 1.76% |
| stout | stout | 5,229 | 1.74% |
| belgian_witbier | belgian | 4,917 | 1.63% |
| irish_red_ale | mild | 4,632 | 1.54% |
| belgian_blonde_ale | belgian | 4,601 | 1.53% |
| german_pilsener | lager | 4,585 | 1.52% |
| american_lager | lager | 4,037 | 1.34% |
| oatmeal_stout | stout | 3,983 | 1.32% |
| specialty_saison | saison | 3,940 | 1.31% |
| herb_and_spice_beer | specialty | 3,448 | 1.14% |
| american_cream_ale | cream | 3,335 | 1.11% |
| british_india_pale_ale | ipa | 3,170 | 1.05% |
| german_koelsch | cream | 3,066 | 1.02% |
| fruit_beer | specialty | 2,867 | 0.95% |
| german_maerzen | lager | 2,851 | 0.95% |
| belgian_tripel | belgian | 2,708 | 0.90% |
| mild | mild | 2,636 | 0.87% |

(Tam 127 slug listesi: `working/_step54_inventory_raw.txt`)

---

## 2. Cluster (16-cat) özeti

| Cluster | slug_count | n | %total |
|---|---|---|---|
| ipa | 5 | 60,775 | 20.17% |
| pale_ale | 4 | 44,514 | 14.77% |
| specialty | 6 | 31,688 | 10.52% |
| stout | 6 | 24,264 | 8.05% |
| belgian | 7 | 19,282 | 6.40% |
| lager | 13 | 18,227 | 6.05% |
| wheat | 5 | 16,568 | 5.50% |
| cream | 7 | 16,309 | 5.41% |
| bitter | 6 | 15,738 | 5.22% |
| saison | 3 | 15,370 | 5.10% |
| porter | 4 | 10,959 | 3.64% |
| brown | 2 | 9,440 | 3.13% |
| mild | 2 | 7,268 | 2.41% |
| **sour** | **5** | **4,025** | **1.34%** |
| barleywine | 3 | 3,764 | 1.25% |
| bock | 4 | 2,983 | 0.99% |
| OTHER (unmapped, train'de yok) | 45 | 142 | 0.05% |

**Gözlem:** ipa+pale_ale toplam %35 — V17 dataset bira tanıma ağırlıklı orta-üst gravite Amerikan stilleri için kuvvetli. Sour kategorisi ezici azınlık (%1.34) ama 5 alt-slug'a bölünmüş.

---

## 3. Source breakdown

| Source | n | %total |
|---|---|---|
| **rmwoods** | **292,337** | **97.02%** |
| recipator | 3,935 | 1.31% |
| braureka | 1,939 | 0.64% |
| mmum | 1,120 | 0.37% |
| aha | 1,104 | 0.37% |
| byo | 427 | 0.14% |
| twortwat | 210 | 0.07% |
| tmf | 164 | 0.05% |
| roerstok | 76 | 0.03% |
| amervallei | 4 | 0.00% |
| **non-rmwoods toplam** | **8,979** | **2.98%** |

**NOT:** `rmwoods` source field'ı tek monolitik etiket. Orjinal H5 dataset'inde `origin` field'ında `brewtoad / brewersfriend / homebrewersassociation / smokemonster` gibi 4 alt-kaynak var ama V17 schema'sında ayrılmadı. Brewtoad ~330K, Brewersfriend ~72K (preflight).

---

## 4. Tehlike sinyalleri

### <10 reçete (KRİTİK — modelde yok, train'e girmedi)

**45 slug, 142 reçete toplam (%0.05).** Hepsi V16 kaynaklı (rmwoods mapping bunları en yakın V15 slug'a topladı, ham olarak girmedi).

Yüksek-değer mağdur (kategoriyel olarak önemli ama train'de yok):

| Slug | n | Not |
|---|---|---|
| **flanders_red_ale** | 7 | V16'da var, rmwoods'taki 950 reçete `belgian_lambic`'e map edildi |
| **gose** | 5 | rmwoods'taki 146 reçete `berliner_weisse`'e map edildi |
| **belgian_gueuze** | 2 | rmwoods'taki 373 reçete `belgian_lambic`'e map edildi |
| **belgian_fruit_lambic** | 2 | rmwoods'taki 536 reçete `belgian_lambic`'e map edildi |
| **american_wild_ale** | 7 | mapping yok, kayıp |
| **foreign_extra_stout** | 2 | rmwoods'taki 1,611 reçete `sweet_stout`'a map edildi |
| **white_ipa** | 2 | rmwoods'taki 274 `belgian_witbier`'e map edildi |
| **red_ipa** | 2 | rmwoods'taki 439 `american_amber_red_ale`'e map edildi |
| **rye_ipa** | 3 | rmwoods'taki 313 `american_india_pale_ale`'e map edildi |
| **belgian_ipa** | 5 | rmwoods'taki 214 `belgian_strong_golden`'e map edildi |
| **finnish_sahti** | 2 | mapping yok, kayıp |
| **piwo_grodziskie** | 1 | mapping yok, kayıp |

(Tam liste 45 slug: `working/_step54_inventory_raw.txt`)

**Anlam:** B-2 mapping (Adım 53) ana V15 slug setini koruma kararı verdi → granül stiller ana stillere "yutuldu". Adım 54 fırsatı: Bu yutulan alt-stilleri ayrı slug yapma.

### 10-49 reçete (zayıf — train mümkün ama gürültülü)

| Slug | n |
|---|---|
| sweet_stout_or_cream_stout | 19 |
| american_barleywine | 16 |
| belgian_quadrupel | 15 |

**Not:** `american_barleywine` ile `american_barley_wine_ale` (2,483 reçete) iki ayrı slug — büyük olasılıkla ufak alias varyantı, birleştirilebilir.

### 50-99 reçete (sınır — model öğrenir ama yetersiz)

| Slug | n |
|---|---|
| kellerbier | 89 |
| german_oktoberfest_festbier | 80 |
| **brett_beer** | **76** |
| dunkles_bock | 69 |
| cream_ale | 62 |

**brett_beer 76 reçete** — V17 train'deki en küçük "öğrenilen" kategorilerden biri. Test n=15. Adım 53 raporundaki −55.8pp regresyonun istatistiksel-bütünlük açısından şüpheli olmasının sebebi.

---

## 5. Source contrast

### rmwoods >=5K AND non-rmwoods <100 (rmwoods baskınlık)

| Slug | rmwoods | non_rm | rmwoods oranı |
|---|---|---|---|
| double_ipa | 12,620 | 44 | %99.7 |
| american_brown_ale | 6,914 | 23 | %99.7 |
| robust_porter | 6,591 | 19 | %99.7 |
| blonde_ale | 5,759 | 75 | %98.7 |
| sweet_stout | 5,228 | 73 | %98.6 |

**Anlam:** Bu 5 slug için V17 model **neredeyse tamamen rmwoods'a güveniyor.** rmwoods kalitesi düşükse, bu slug'lar regresyon riski taşır. Adım 53'te `american_pale_ale` regresyonu (V16 64.6% → V17 62.6%) bu sınıfta.

### non-rmwoods >=200 AND rmwoods <50

**Hiç slug yok.**

V16 hiçbir slug için rmwoods'tan korunmuş büyük örneklem sağlamıyor. Tüm dataset rmwoods'a kaymış.

**Strateji etkisi:** V17 V16'dan farklı bir modeldir, V16'nın yerini almıştır — rollback haricinde V16 katkısı görünmez seviyede.

---

## 6. Brett/Sour cluster özel breakdown

| Slug | total | rmwoods | non_rm | V15'te train edildi |
|---|---|---|---|---|
| **brett_beer** | 76 | 48 | 28 | YES (76≥10) |
| **mixed_fermentation_sour_beer** | 213 | 152 | 61 | YES |
| **belgian_lambic** | 1,820 | 1,792 | 28 | YES |
| **oud_bruin** | 437 | 425 | 12 | YES |
| **berliner_weisse** | 1,479 | 1,459 | 20 | YES |
| flanders_red_ale | 7 | 0 | 7 | **NO (drop <10)** |
| gose | 5 | 0 | 5 | **NO (drop <10)** |
| belgian_gueuze | 2 | 0 | 2 | NO (drop) |
| belgian_fruit_lambic | 2 | 0 | 2 | NO (drop) |
| american_wild_ale | 7 | 0 | 7 | NO (drop) |

### Adım 53'teki "Brett −55.8pp" regresyonun kaynağı

V17 train'de brett_beer:
- 76 toplam → train ~61, test 15 (V17 80/20 split)
- Test 15 reçeteden 14'ü yanlış sınıflandırıldı → top-1 6.7%
- 28 non_rm reçete V16 kaynaklı (curated, V16'da %62.5 top-1)
- 48 rmwoods reçetesi — rmwoods'ta brett strain explicit gösterilmemiş muhtemel (yeast_name "wildbrew sour" gibi commercial isimler olabilir)

**Hipotez:** rmwoods'ın 48 brett reçetesi BRETT_RE pattern'i tetiklemiyor → `yeast_brett` feature 0 → model brett özelliklerini öğrenemiyor → mixed_fermentation_sour_beer ile karışıyor.

### `mixed_fermentation_sour_beer` (-55.3pp regresyon)

213 toplam → train 170, test 43. Daha güvenilir n. Yine de V16'nın 14 test reçetesindeki %78.6 top-1'den V17'nin 43'teki %23.3'e düştü.

**Hipotez:** rmwoods'ın 152 mixed_ferm reçetesi de düzensiz yeast metadatasına sahip → confusion matrix'te `belgian_lambic` ve `oud_bruin`'le karışıyor (her ikisi sour cluster'da büyük örneklem).

### "Eksik" sour aileleri

V17'de `gose` (5), `flanders_red_ale` (7), `belgian_gueuze` (2), `belgian_fruit_lambic` (2), `american_wild_ale` (7) toplam 23 reçete <10 filter ile train'e girmedi.

**Adım 53 mapping etkisi:** rmwoods'ta bu kategoriler vardı:
- gose → `berliner_weisse` (146 reçete kaybedildi)
- flanders_red_ale → `belgian_lambic` (950)
- belgian_gueuze → `belgian_lambic` (373)
- belgian_fruit_lambic → `belgian_lambic` (536+)
- foreign_extra_stout → `sweet_stout` (1,611)

Toplam ~3,600 reçete potansiyel granül slug'lara ayrılabilirdi ama mapping kararıyla yutuldu. Adım 54'te bu mapping reverse edilebilir.

---

## Adım 54 stratejisi — pre-flight çıkarımları

### Veri-temelli öncelik sıralaması

**Yüksek değer / düşük risk:**

1. **flanders_red_ale ayrı slug** (~950 rmwoods reçete kazan)
2. **belgian_gueuze ayrı slug** (~373 reçete)
3. **gose ayrı slug** (~146 reçete)
4. **foreign_extra_stout ayrı slug** (~1,611 reçete) — `sweet_stout`'tan ayır
5. **brett_beer için yeast pattern güçlendirme** — rmwoods 48 reçeteyi BRETT_RE patternine yakalama

**Orta öncelik:**

6. `red_ipa`, `rye_ipa`, `white_ipa`, `belgian_ipa`, `black_ipa` → `specialty_ipa` parent slug oluştur
7. `american_barley_wine_ale` ↔ `american_barleywine` alias birleştirme

**Düşük öncelik (data yok):**

8. `american_wild_ale`, `finnish_sahti`, `piwo_grodziskie` — reçete sayısı zaten az, V17'de mapping yok

### Özel risk: rmwoods baskınlık testi

5 slug %99 rmwoods (double_ipa, american_brown_ale, robust_porter, blonde_ale, sweet_stout). **Adım 54 ek pre-flight:** Bu slug'lardan örnek 50-100 reçeteye prediction yap, gerçek tat profili eşleşiyor mu kontrol et. Eğer rmwoods bu kategorilerde gürültülüyse model kararsız olur.

### Sour cluster gerçek boyutu

Sour 4,025 (≥10 filter sonrası train'e giren) ama:
- `belgian_lambic` 1,820 — **flanders/gueuze/fruit lambic mix**
- `berliner_weisse` 1,479 — **gose dahil**
- `oud_bruin` 437
- `mixed_fermentation_sour_beer` 213
- `brett_beer` 76

Mapping ayrıldığında: lambic ~545, gueuze ~373, flanders_red ~950, fruit_lambic ~536, gose ~146 = sour cluster +2,550 efektif (toplam ~6,575) ve daha granül.

---

## Sıradaki pre-flight (kullanıcı belirtti)

V6 KNN 290K hız testi — ayrı pre-flight, ayrı koşu. Bu rapor sadece slug dağılımı için.

---

## Çıktı dosyaları

- `_step54_preflight_dataset_inventory.md` (bu rapor)
- `working/_step54_inventory.py` (analiz script — tek seferlik, working/ git'lenmemiş)
- `working/_step54_inventory_raw.txt` (tam 127-slug listesi + ham çıktı)
