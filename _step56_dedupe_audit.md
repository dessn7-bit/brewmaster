# Adım 56 — Dedupe Audit Raporu

**Tarih:** 2026-04-29  
**Audit kapsamı:** Adım 53 (rmwoods entegrasyonu) `_step53_b5_dedup_merge.py` script'inin gerçek dedupe yöntemi, dropped reçete kalitesi, geri kazanım potansiyeli.  
**Veri:** V16 (9,552 reçete) + rmwoods (401,991 reçete) → V17 (301,316 reçete). 110,227 dropped (%26.8).

---

## ⚠️ KRİTİK BULGU — K5 KARARI UYGULANMAMIŞ

`_step53_completion_report.md` "K5=B style_name primary slug mapping" diyor — bu farklı bir karar (slug mapping). Ama Kaan'ın talebi K5 = "B - title + cosine" idi (dedupe için).

**Gerçek dedupe yöntemi (kod):** `_step53_b5_dedup_merge.py` satır 29-32 + 49-86

```python
def norm_title(s):
    s = re.sub(r'[^a-z0-9]+', ' ', str(s).lower()).strip()
    return re.sub(r'\s+', ' ', s)

# set membership only — no cosine, no metric, no slug check
seen = set()
for r in v16: ...   # V16 first added
for r in rm:
    if nt in seen: drop
    else: keep
```

**Yöntem özeti:**
- **Sadece title fingerprint** (lowercase + alfanumerik dışını space + collapse).
- **Cosine HİÇ uygulanmamış** — `recipe_vecs.h5` (793-dim, 171K curated subset) açılmamış bile.
- V16 öncelik (V16 + rmwoods'da çakışırsa V16 kalır).
- Boş title (187 rmwoods reçete): hep tutuldu.
- Slug, OG, IBU, SRM dahil hiçbir metric karşılaştırması YOK.

**Sonuç:** K5 "title + cosine" kararı uygulanmadı, sadece title set membership uygulandı. Bu **en agresif dedupe yöntemi**.

---

## 1. Sayısal Özet

| Metrik | Değer |
|---|---|
| V16 girdi | 9,552 reçete |
| rmwoods girdi (cider/mead skip sonrası) | 401,991 reçete |
| **Toplam girdi** | **411,543** |
| Unique title sayısı | 301,129 |
| Single-recipe titles (zero dup) | 276,650 |
| Multi-recipe groups (dup içerir) | 24,479 |
| **Dropped (atılan)** | **110,227 (%26.8)** |
| V17 final | 301,316 reçete |

### Dup grup büyüklüğü dağılımı (top 20)

| Group size | Count | Total dropped (size-1 each) |
|---|---|---|
| 2 | 14,130 | 14,130 |
| 3 | 3,828 | 7,656 |
| 4 | 1,844 | 5,532 |
| 5 | 1,144 | 4,576 |
| 6 | 672 | 3,360 |
| 7 | 447 | 2,682 |
| 8-10 | 796 | 6,736 |
| 11-20 | 821 | ~10,000 |
| 21+ | 798 | ~50,000 |

**Bulgu:** Group size dağılımı **uzun kuyruk** (long tail). 21+ grupların 798'i ~50K dropped'a karşılık geliyor — en büyük kayıp burada.

### Kategori breakdown

| Kategori | Count |
|---|---|
| V16 ↔ rmwoods cross-source dup | 1,600 |
| rmwoods boş-title (her zaman tutuldu) | 187 |

⚠️ **Brewtoad/Brewersfriend subsource breakdown YAPILAMADI** çünkü `_rmwoods_v15_format.json`'da `origin` field korunmamış. Sadece V18.2 dataset'inde subsource info var (ayrı pipeline'dan eklenmiş).

---

## 2. KATASTROFİK BULGU — Default-Name Collision

### Top 30 high-frequency duplicate titles

| Title | Group size | "Açıklama" |
|---|---|---|
| **awesome recipe** | **1,265** | Brewer's Friend default name |
| ipa | 1,091 | Generic style |
| black ipa | 909 | Generic style |
| saison | 828 | Generic style |
| oatmeal stout | 747 | Generic style |
| pale ale | 698 | Generic style |
| **untitled specialty beer** | **580** | Brewer's Friend default |
| pumpkin ale | 561 | Seasonal generic |
| esb | 552 | Generic style |
| kolsch | 517 | Generic style |
| porter | 512 | Generic style |
| stout | 473 | Generic style |
| cream ale | 453 | Generic style |
| brown ale | 431 | Generic style |
| oktoberfest | 393 | Generic style |
| irish red | 374 | Generic style |
| amber ale | 354 | Generic style |
| rye ipa | 345 | Generic style |
| hefeweizen | 335 | Generic style |
| milk stout | 334 | Generic style |
| belgian ipa | 325 | Generic style |
| **untitled american pale ale** | **317** | Brewer's Friend default |
| american pale ale | 312 | Generic style |
| session ipa | 311 | Generic style |
| imperial stout | 310 | Generic style |
| citra ipa | 303 | Generic style |
| **untitled american ipa** | **297** | Brewer's Friend default |
| irish red ale | 289 | Generic style |
| apa | 272 | Generic style |
| american wheat | 267 | Generic style |

**Toplam top 30 generic title:** ~14,983 reçete grup, ~14,953 dropped.

### Skandal: "favorite add to favorites all grain recipe" — group of 119

BYO blog parser **bug**: reçete adı çekilirken UI text "Favorite Add to Favorites All-Grain Recipe" name field'ına yazılmış. 119 BYO clone reçetesi (Silk Robes Rice Lager, 20-30 Vision Helles Bock, Shenandoah Saison, American Imperial Stout, American Oatmeal Stout, vs.) hepsi aynı default isim. **118 değerli BYO clone ATILDI**.

---

## 3. Sample Dropped Reçete Dump'ları

### Sample 1: "all that razz" (4 reçete grup, 3 atıldı)

| ID | Slug | OG | IBU | SRM | ABV |
|---|---|---|---|---|---|
| rmwoods_57916 ✓ tutuldu | sweet_stout | 1.0513 | 28.9 | 35.4 | 4.99 |
| rmwoods_181813 ❌ atıldı | american_wheat_ale | 1.0479 | 23.1 | **3.8** | 5.16 |
| rmwoods_228196 ❌ atıldı | american_imperial_stout | **1.0997** | **60.0** | **81.1** | **9.82** |
| rmwoods_271108 ❌ atıldı | sweet_stout | 1.0515 | 29.0 | 35.5 | 5.0 |

3 atılan reçeteden 2'si **tamamen farklı bira** (wheat ale ve imperial stout, sadece adı sweet stout ile çakışmış). 1 tanesi (#271108) gerçek near-dup.

**Tahmini değer kaybı: 2/3 = %66**

### Sample 2: "sn clone" (Sierra Nevada Clone, 4 reçete, 3 atıldı)

| ID | Slug | OG | IBU | SRM | ABV |
|---|---|---|---|---|---|
| rmwoods_19879 ✓ | american_india_pale_ale | 1.0551 | 28.6 | 6.8 | 5.42 |
| rmwoods_36176 ❌ | american_india_pale_ale | 1.0698 | 44.6 | 6.1 | 7.84 |
| rmwoods_42071 ❌ | american_pale_ale | 1.055 | 35.0 | 9.0 | 5.49 |
| rmwoods_238186 ❌ | american_pale_ale | 1.0542 | 33.3 | 6.7 | 5.41 |

4 farklı brewer'ın 4 farklı SN clone yorumu — OG aralığı 1.054-1.069, IBU 28-44. **3 farklı reçete kaybı**.

### Sample 3: "interstellar ipa" (3 reçete, 2 atıldı)

| ID | Slug | OG | IBU | ABV |
|---|---|---|---|---|
| rmwoods_65326 ✓ | american_india_pale_ale | 1.0456 | 69.9 | 5.12 |
| rmwoods_306418 ❌ | double_ipa | 1.0696 | 82.7 | 7.13 |
| rmwoods_403379 ❌ | american_india_pale_ale | 1.067 | 64.1 | 7.43 |

3 farklı reçete, 1 tanesi DIPA bile — OG 1.046 vs 1.067 vs 1.069. **2 farklı reçete kaybı**.

### Sample 4: "oh yeah" (3 reçete, 2 atıldı) — punctuation collision

| ID | Original name | Slug | OG | IBU |
|---|---|---|---|---|
| rmwoods_142145 ✓ | "oh, yeah..." | aipa | 1.0631 | 55.6 |
| rmwoods_221650 ❌ | "oh yeah!" | aipa | 1.0533 | 38.5 |
| rmwoods_266246 ❌ | "oh yeah?" | aipa | 1.0699 | 57.4 |

Punctuation farklı (`.,!?`) ama norm_title hepsini "oh yeah" yapıyor. 3 farklı reçete (OG 1.053-1.070), **2 kayıp**.

### Sample 5: "fat cat" (4 reçete, 3 atıldı)

| ID | Slug | OG | IBU | ABV |
|---|---|---|---|---|
| rmwoods_56220 ✓ | double_ipa | 1.0725 | 158.7 | 7.14 |
| rmwoods_57198 ❌ | double_ipa | 1.0834 | 68.3 | 8.2 |
| rmwoods_338562 ❌ | double_ipa | 1.079 | 104.2 | 8.56 |
| rmwoods_403615 ❌ | aipa | 1.07 | 173.1 | 6.31 |

IBU 68 vs 158 vs 173 — açıkça farklı reçeteler. **3 kayıp**.

### Sample 6: "hoppy pale" (21 reçete, 20 atıldı)

İlk 6 örnek:

| ID | Slug | OG | IBU | SRM |
|---|---|---|---|---|
| rmwoods_10634 ✓ | apa | 1.0439 | 103.5 | 8.5 |
| rmwoods_17851 ❌ | apa | 1.047 | 89.2 | 4.8 |
| rmwoods_51649 ❌ | apa | 1.044 | 103.6 | 8.5 |
| rmwoods_72134 ❌ | specialty | 1.0426 | 100.0 | 5.4 |
| rmwoods_89801 ❌ | apa | 1.0444 | 48.5 | 5.6 |
| rmwoods_117626 ❌ | apa | 1.0591 | **28.4** | **2.5** |

IBU 28 vs 103, SRM 2.5 vs 8.5 — açıkça farklı reçeteler. 21'den 20'si atılmış, çoğu **gerçek farklı reçete**.

### Slug divergence sayısı (sample-50'de)

50 random small-dup grup tarandı; **OG range > 0.010 (10 gravity points)** olanlar = açıkça farklı reçete:
- 20+ örnek bu eşik altında (OG fark çok büyük)
- Yani size-2 grupların %40+'sı gerçek farklı reçete

---

## 4. "Değerli Reçete Kaybı" Tahmini

Konservatif sınıflandırma:

| Kategori | Tahmini count | Açıklama |
|---|---|---|
| **Default name collision** | ~15,000-18,000 | "awesome recipe", "untitled X", "favorite add to favorites" — kesin değerli kayıp |
| **Generic style names** (IPA, saison, porter, etc.) | ~13,000 | Top 30 high-freq generic — büyük olasılıkla değerli |
| **Clone recipes** (SN clone, Pliny clone, etc.) | ~10,000 | Farklı brewer yorumları — orta değer |
| **Slug divergence** size 2+ | ~30,000 | OG/IBU aralık geniş, açıkça farklı reçete |
| **Punctuation collision** | ~5,000 | Tahmini, sample'a göre extrapole |
| **Real near-duplicates** | ~30,000-35,000 | Drop justifable — same recipe re-imported by same brewer |

**Toplam tahmini değerli kayıp: ~70,000-75,000 reçete (%63-68 of all dropped)**

Bu, dropped 110K'nın yaklaşık 2/3'ünün gerçek değerli farklı reçete olduğu anlamına gelir.

---

## 5. Bu Hangi Slug'ları En Çok Vurdu?

110K dropped'un slug dağılımı için tam sayı yok ama indikator:
- **AIPA/APA dominant (top high-freq):** american_india_pale_ale, american_pale_ale, double_ipa — bu sınıflarda zaten 30K+ örnek var, marjinal kayıp
- **Saison ailesi:** "saison" 828× → ~800 saison reçetesi atıldı — french_belgian_saison 10K'da kalsa marjinal
- **ESB ve EPA:** "esb" 552× → 550 ESB atıldı — extra_special_bitter 6K'da, ama english_pale_ale 102'de — etkilenebilir
- **Belgian IPA:** "belgian ipa" 325× → 324 atıldı — belgian_ipa V18.2'de 146! **Bu slug için ÇOK büyük kayıp** (potansiyel 470 reçete olabilirdi)
- **Rye IPA:** "rye ipa" 345× → 344 atıldı — rye_ipa V18.2'de 200, **olası 540+ reçete kayıp**
- **Hefeweizen:** "hefeweizen" 335× → 334 atıldı — south_german_hefeweizen 6,448'de marjinal
- **Cream Ale:** "cream ale" 453× → 452 atıldı — american_cream_ale 3,397'de marjinal
- **Imperial Stout:** "imperial stout" 310× → 309 atıldı

**Net etki:** Zayıf slug'lar (belgian_ipa, rye_ipa, brett_beer, gose) için **default name collision** orantısız zarar verdi. Büyük slug'lar için marjinal.

---

## 6. Geri Kazanım Önerisi

### Öneri 1: Quick fix — default name exclusion (4 saat)

Title fingerprint'e koşul ekle:
```python
DEFAULT_NAMES = {
    'awesome recipe', 'ipa', 'saison', 'porter', 'stout',
    'untitled specialty beer', 'untitled american pale ale',
    'untitled american ipa', 'favorite add to favorites all grain recipe',
    'pale ale', 'oatmeal stout', 'belgian ipa', 'rye ipa', 'hefeweizen', ...
}
if nt in DEFAULT_NAMES:
    keep_always = True  # never dedup
```

**Beklenen geri kazanım:** ~13,000-18,000 reçete  
**Etki:** zayıf slug'lar (belgian_ipa, rye_ipa, vb) için orantısız faydalı

### Öneri 2: Title + slug + key metric fingerprint (8 saat)

```python
def fp(r):
    return (
        norm_title(r.name),
        r.bjcp_slug,                    # slug match şart
        round(r.features.og or 0, 3),   # OG 3 ondalık
        round(r.features.srm or 0, 1),  # SRM 1 ondalık
    )
```

Aynı title + aynı slug + close OG + close SRM = real dup. Farklı slug/OG/SRM = farklı reçete.

**Beklenen geri kazanım:** ~50,000-60,000 reçete  
**Risk:** OG/SRM null olan reçeteler için fallback gerek (rmwoods'ta features.og populated olduğu için risk düşük, sadece TMF gibi truly-null kaynaklarda sorun)

### Öneri 3: Cosine similarity (K5'in orijinal planı, 12 saat)

`recipe_vecs.h5` (793-dim) açılır, cosine ≥0.95 = dup. Sadece 171K curated subset için, kalan ~230K için fallback metric-based (Öneri 2).

**Beklenen geri kazanım:** Öneri 2'ye yakın (~55,000-65,000)  
**Effort fazla, marjinal fayda** — Öneri 2 yeterli olabilir

### Öneri 4: HİÇ DEDUP YAPMA (radikal)

411K girdi → 411K dataset. Duplicate'ler model'i biased yapabilir ama:
- XGBoost depth=4 zaten regularize ediyor (KURAL 4)
- Real near-dups model'in "popular recipes" örüntüsünü öğrenmesini sağlar (zarar değil)
- Sadece V16 ↔ rmwoods cross-source 1,600 dup için V16 öncelik tutulur

**Beklenen V18.3 dataset:** ~410K reçete (+%36)  
**Risk:** Model boyutu büyür (44 MB → ~55 MB), train süresi uzar  
**Fayda:** Maximum coverage, küçük slug için %30+ ek örnek

---

## 7. V18.3 İçin Önerilen Dedupe Stratejisi

**Hibrit yaklaşım (Öneri 1 + Öneri 2):**

1. **Default name exclusion** (Öneri 1) → 1265× "awesome recipe" hep tutulur
2. **Title + slug + OG + SRM fingerprint** (Öneri 2) → near-duplicate'ler atılır, farklı slug/OG/SRM olanlar tutulur
3. **V16 öncelik korunur** — V16 ↔ rmwoods dup'larda V16 kalır
4. **Boş title hep tutulur** (mevcut davranış)

**Beklenen V18.3 dataset:** 301K → **350-380K reçete** (+50-80K)  
**Effort:** 6 saat (rebuild + smoke test)  
**Risk:** Düşük — duplicate fingerprint daha sıkı, false-positive dup azalır

### Slug bazında beklenen etki

| Slug | V18.2 | V18.3 tahmin (yumuşak dedupe) | Δ |
|---|---|---|---|
| belgian_ipa | 146 | 350-450 | +200-300 ⭐⭐ |
| rye_ipa | 200 | 400-500 | +200-300 ⭐⭐ |
| brett_beer | 76 | 100-130 | +25-50 ⭐ |
| white_ipa | 203 | 280-330 | +80-130 ⭐ |
| red_ipa | 308 | 450-550 | +150-250 ⭐ |
| gose | 102 | 130-160 | +30-60 |
| dunkles_bock | 69 | 80-95 | +15-25 |
| Total dataset | 301K | 350-380K | +50-80K |

---

## 8. Karar İçin Özet (Kaan)

### Bulgular özeti
1. **Dedupe yöntem TITLE-ONLY** uygulanmış (cosine YOK, K5 kararı uygulanmamış)
2. **110K dropped'un %63-68'i değerli farklı reçete** (~70-75K kayıp)
3. **Default name collision** (1265× "awesome recipe", 119× "favorite add to favorites") en büyük problem
4. **Zayıf slug'lar orantısız vurulmuş** — belgian_ipa potansiyeli 146 yerine 470, rye_ipa 200 yerine 540

### Karar opsiyonları

| Plan | Effort | Beklenen recovery | Adım 56 etki |
|---|---|---|---|
| **A. Mevcut dedupe koru** | 0s | 0 reçete | Sprint 56a normal devam |
| **B. Default name exclusion (Öneri 1)** | 4s | ~15K reçete | Sprint 56a + ek 4s, V18.3'e ekleyebiliriz |
| **C. Hibrit: title+slug+OG+SRM (Öneri 1+2)** | 6s | ~50-80K reçete | Sprint 56a + ek 6s, V18.3 dataset rebuild zorunlu |
| **D. Cosine similarity (Öneri 3)** | 12s | ~55-65K reçete | Sprint 56b'ye ekle, yüksek effort |
| **E. Hiç dedupe (Öneri 4)** | 2s | ~110K reçete | Risk: gürültü, model boyut |

### Sıralama önerisi

**Sprint 56a yeniden tanımı:**
- Faz A1 etiket temizliği (10s) — gueuze + quadrupel + EPA + golden merge
- **Faz A1.5 dedupe revizyon (6s)** — Öneri C (hibrit) uygula

V18.3 dataset = etiket-temiz + dedupe-revize. Tek deploy, tek KURAL 4 gate.

**Beklenen V18.3 t1 gain (kümülatif):**
- A1 etiket temizliği: +3-5pp slug top-1 (gueuze/quadrupel/EPA cleanup)
- A1.5 dedupe recovery: +2-4pp (small slugs için %5-10pp ek)
- **Toplam V18.3 t1 hedef: 55.3% → ~62-65%**

---

**Audit sonu.** Veri: `_step56_dedupe_audit_data.json` (~80 KB, 30 sample dump + 30 high-freq title + group dist).
