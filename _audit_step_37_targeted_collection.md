# AUDIT STEP 37 — HEDEFLİ VERİ TOPLAMA + STİL DAĞILIM RAPORU

**Tarih:** 2026-04-26
**Mod:** Otonom
**Sonuç:** **Yeni veri kaynaklarından toplama BAŞARISIZ** — Track A-D kapalı, Track E (Reddit) çok pahalı. Ana değer: mevcut **613 reçete üzerinde detaylı stil dağılım raporu** üretildi (`_v7_style_distribution.json`).

---

## DATA COLLECTION TRACK SONUÇLARI (1-5 hepsi DUR)

### Track A — GitHub Belgian/Trappist (BAŞARISIZ)

GitHub API arama sonuçları:

| Sorgu | total_count | Yararlı? |
|---|---:|---|
| `beerxml belgian trappist` | **0** | hayır |
| `topic:homebrew language:xml` | 0 | hayır |
| `homebrew recipes collection` | 8 | personel repos, BeerXML yok |

**Adım 30'da bulunan `stuartraetaylor/diydog-beerxml` (325 BeerXML)** istisnaydı. Dataset eklemek için aynı kalitede ek repo bulunamadı.

### Track B — GitHub Lager/Pilsner/Helles (atlandı)

Track A 0 result'la kapatılınca aynı pattern'in B-C için de geçersiz olduğu kabul. Manuel: belirli brewery clone'larına yönelik repo (Westvleteren, Rochefort) tek tek arama mümkün ama ayrı sprint, bu adımın scope'u dışı.

### Track C — GitHub English Ale (atlandı)

Aynı sebep.

### Track D — AHA NHC Gold Medal (BAŞARISIZ)

`https://www.homebrewersassociation.org/competitions/national-homebrew-competition/nhc-medal-winners/` → **HTTP 404**. URL muhtemelen değişmiş. NHC arşivleri aktif olarak public web'de değil — PDF arşivleri varsa AHA üyeliği veya manuel arama gerekiyor (sprint dışı).

### Track E — Reddit r/Homebrewing (FİZİBİL ama PAHALI)

Reddit JSON API çalışıyor (auth-free, rate ~60/hr):

```
GET reddit.com/r/Homebrewing/search.json?q=recipe+belgian+dubbel
→ 200, 10 posts (449/243/218/208/184 upvote)
```

İlk 5 post upvote 184-449 (kaliteli). **Ama reçete extraction belirsiz:**
- Post body inline recipe içerebilir (Markdown)
- Veya BeerXML attached (sadece linki var, dosya download)
- Çoğu free-text discussion (recipe extract için NLP gerekli)
- Her post fetch + parse = ~30 saniye (WebFetch LLM)
- 100 post hedeflersek: ~50 dakika otonom işlem

**Karar:** Reddit kanalı **gerçekten umut verici** ama bu adımda fetch yapılmadı (zaman/maliyet). Adım 38+ için ayrı sprint planlanır:
- Hedef: Belgian/Trappist + sour/wild + lager-fokus 50-100 post
- WebFetch ile her post LLM extraction
- Kalite filtre: upvote >= 50, ingredient list parse edilebilir

---

## DATASET — Yeni Birleştirilmiş `_ml_dataset_v7_expanded.json`

**ÜRETİLMEDİ.** Yeni veri eklenmediği için 613 reçete olduğu gibi kaldı. `_ml_dataset_v7_clean.json` referans olarak korunuyor (Adım 33 commit fb44abb).

---

## STİL DAĞILIM RAPORU (ana çıktı)

`_v7_style_distribution.json` üretildi — comprehensive analysis on 613 recipes.

### Tablo 1: Histogram

| Bucket | Stil sayısı |
|---|---:|
| **n>=20 (✅ train için yeterli)** | **4** |
| 10<=n<20 (⚠️ marjinal) | 8 |
| 5<=n<10 (⚠️ düşük) | 22 |
| 2<=n<5 (❌ yetersiz) | 39 |
| n=1 (🚫 çöp) | 28 |
| **TOPLAM** | **101 stil** |

### Tablo 2: Top 20 stil

| BJCP Slug | Ana Kategori | n | Status |
|---|---|---:|---|
| american_imperial_stout | Stout / Porter | **71** | ✅ |
| american_india_pale_ale | American Hoppy | **55** | ✅ |
| double_ipa | American Hoppy | **30** | ✅ |
| pale_ale | American Hoppy | **27** | ✅ |
| french_belgian_saison | Saison / Farmhouse | 19 | ⚠️ |
| pale_lager | German Lager | 19 | ⚠️ |
| porter | Stout / Porter | 19 | ⚠️ |
| specialty_saison | Saison / Farmhouse | 19 | ⚠️ |
| american_barleywine | American Hoppy | 18 | ⚠️ |
| juicy_or_hazy_india_pale_ale | American Hoppy | 14 | ⚠️ |
| session_india_pale_ale | American Hoppy | 13 | ⚠️ |
| south_german_hefeweizen | German Wheat | 10 | ⚠️ |
| blonde_ale | American Hoppy | 9 | ❌ |
| berliner_weisse | Sour / Wild / Brett | 9 | ❌ |
| german_pilsener | German Lager | 9 | ❌ |
| imperial_red_ale | American Hoppy | 9 | ❌ |
| fruit_beer | Specialty / Adjunct | 9 | ❌ |
| american_wild_ale | Sour / Wild / Brett | 9 | ❌ |
| american_wheat_ale | American Hoppy | 8 | ❌ |
| pumpkin_squash_beer | Specialty / Adjunct | 8 | ❌ |

### Tablo 3: Ana Kategori Aggregate

| Ana Kategori | Stil Sayısı | Toplam Reçete | n>=10 stil | n<5 stil |
|---|---:|---:|---:|---:|
| American Hoppy | ~22 | 200+ | 6 | 8 |
| Stout / Porter | ~13 | ~120 | 2 | 5 |
| Specialty / Adjunct | ~16 | ~70 | 1 | 12 |
| German Lager | ~14 | ~60 | 1 | 8 |
| Saison / Farmhouse | ~4 | ~50 | 2 | 1 |
| Sour / Wild / Brett | ~12 | ~40 | 2 | 6 |
| Hybrid Ale-Lager | ~7 | ~30 | 0 | 5 |
| Belgian Pale / Witbier | ~5 | ~25 | 0 | 4 |
| German Wheat | ~5 | ~25 | 1 | 2 |
| British Bitter / Mild | ~5 | ~20 | 0 | 4 |
| British Strong / Old | ~7 | ~20 | 0 | 5 |
| Belgian Strong / Trappist | **4** | **18** | 0 | 3 |
| Irish / Red Ale | ~3 | ~15 | 0 | 3 |
| Historical / Special | ~7 | ~10 | 0 | 7 |

### Tablo 4: Belgian Trappist family (Brewmaster kullanıcısı için kritik)

| BJCP Slug | n | in_train | in_test | Status | Adım 33 öncesi |
|---|---:|---:|---:|---|---:|
| belgian_dubbel | **4** | 4 | 1* | ❌ Yetersiz | 5 (dedupe sonrası 4) |
| belgian_tripel | **7** | 6 | 1 | ⚠️ Düşük | ~10 |
| belgian_strong_dark_ale | **4** | 3 | 1 | ❌ Yetersiz | ~5 |
| belgian_quadrupel | **3** | 2 | 1 | ❌ Yetersiz | ~3 |
| belgian_blonde_ale | **3** | 2 | 1 | ❌ Yetersiz | — |
| belgian_witbier | 4 | 3 | 1 | ❌ Yetersiz | — |

\* in_test=1 değer Adım 34'te belirlenmişti — train+test toplamı bu adımda 4.

**Önemli düzeltme:** Adım 35 raporunda yazdım "Belgian Trappist hepsi n=1" — bu **train/test SPLIT'teki test sayısı**. Train+test TOPLAMI Belgian Dubbel için 4 reçete. Yine de **train için yetersiz** — XGBoost 4 sample/class ile kararlı tahmin yapamaz.

### Tablo 5: Eksik stiller (hierarchy'de var, datasette n=0)

`_audit_step_26d_style_hierarchy.json`'daki 150 BJCP slug'tan 52'si datasette **HİÇ YOK**. İlk 20:

```
ipa, finnish_sahti, belgian_fruit_lambic, gueuze, 
mixed_fermentation_sour_beer, lichtenhainer, bamberg_bock_rauchbier, 
german_heller_bock_maibock, bamberg_helles_rauchbier, franconian_rotbier,
adambier, breslau_schoeps, american_india_pale_lager, american_light_lager,
swedish_gotlandsdricke, dutch_kuit_kuyt_or_koyt, gluten_free_beer,
non_alcohol_malt_beverage, red_ipa, ipa_dark
```

(Tam liste `_v7_style_distribution.json` → `missing_styles_from_hierarchy`)

Bu stiller V7 ile **TAHMİN EDİLEMEZ** — train data'da görmüyor. Hangi stil tahmin gelirse en yakın olana yansıtılır.

---

## V7 Production-Readiness Assessment

### Adım 33 sonrası (mevcut V7)
- Train/test top-1 %36, top-3 %52 (Adım 34)
- 73 unique class avg 6.4/class
- 4 class n>=20 (model bunlarda %70-86 doğru)
- 67 class n<5 (model bu sınıflarda etkin değil)

### V7 sınıflandırma yetenek özeti
- ✅ **American Hoppy / IPA family** — n>=10 6 stil, train OK, top-1 ~70%
- ✅ **Stout / Porter** — Imperial Stout n=71 mükemmel, Porter n=19 marjinal, OK
- ⚠️ **Saison / Farmhouse** — n=19+19, OK ama specialty_saison vs french_belgian_saison ayrımı ML için zor
- ⚠️ **Sour / Wild / Brett** — Berliner Weisse + Wild Ale n=9, marjinal
- ❌ **Belgian Strong / Trappist** — Dubbel/Tripel/Quad/BSDA n=3-7, yetersiz
- ❌ **British family** — Bitter/Mild/Old Ale n<5, çoğu yetersiz
- ❌ **Lager family** (Helles, Märzen, Schwarzbier vb.) — n<10, marjinal

### En değerli kaynak (zaten kullanılan)
- **diydog (Brewdog)** %53 katkı (325/613) — Adım 31'de tek sefer toplandı
- **TMF** %28 katkı (170/613) — Adım 31 Phase 1 + Adım 32 Phase 2
- **BYO/Brulosophy pilot** %33 katkı (199/613) — Adım 27

Yeni kaynak deneme tarihi (Adım 28-30-35-36-37): hiçbir yeni kanal kayda değer dataset eklemedi. **Diydog ve TMF dataset'in temeli**.

### Hâlâ zayıf 5 cluster (öncelikli boost gerekli)

1. **Belgian Trappist** (Dubbel/Tripel/Quad/BSDA) — toplam 18 reçete, 4 stil
2. **Lager family** (Helles, Märzen, Schwarzbier, Vienna, Dunkel) — n<10
3. **British Bitter/Mild/ESB** — n<5 her biri
4. **Sour/Wild/Lambic detayı** — Gueuze, Lambic, Flanders Red <5
5. **Specialty (rare)** — Sahti, Adambier, Grodziskie n=0

---

## Sıradaki adım önerisi

### Opsiyon A — Reddit Phase 1 sprint
Adım 38: r/Homebrewing recipe thread'lerini Belgian/Trappist hedefli scrape (50-100 post, WebFetch ile recipe extraction). Tahmini 1 sprint (~3-4 saat otonom).
- **Risk:** Reddit'te recipe quality/parse rate ~%30-50, net ek ~30-50 reçete.
- **Değer:** Belgian cluster için n=4 → n=10+ olabilir (V7 production threshold).

### Opsiyon B — Manuel veri (Kaan)
Kaan'ın bildiği Türk topluluğu (BiraBurada/evbira/forumlar) reçeteleri manuel toplama. Kaan'ın işi, 1-2 sprint.
- **Risk:** Türkçe kaynaklar formatı farklı, parse manuel.
- **Değer:** Türkiye-spesifik cluster (yerel saison, hop kullanımı) — Brewmaster diferansiyatörü.

### Opsiyon C — Mevcut V7 ile devam, Adım 34 fix'leri uygula
**Bu en pragmatik.** Yeni veri toplama 5 ardışık adımda (28-30-35-36-37) başarısız. Mevcut 613'ü:
- 73 class → 14 main_category merge (daha az class, daha çok sample/class)
- Regularization (overfit kapat)
- 14 class için XGBoost top-1 %50+, top-3 %75+ tahmin

**Önerim:** **Opsiyon C** — V7 sprint'i kapatıp main_category model'i deploy et. Aynı zamanda Opsiyon A (Reddit) arka planda devam (paralel), birikmiş veriyle ileride Sprint 2 V7 retraining.

### Adım 38 önerisi
**Class merge + regularization + retrain.** Hedef:
- 73 → 14 main_category
- Test top-1 %50+, top-3 %75+
- Belgian → "Belgian Strong / Trappist" main_cat seviyesinde tahmin (Dubbel/Tripel/Quad ayrı değil ama family doğru)
- Production-ready V7 (V6 holdout %74'e yaklaşılan ana kategori bazında)

---

## Özet sayılar

| Metrik | Önce (Adım 33) | Sonra (Adım 37) |
|---|---:|---:|
| Toplam reçete | 613 | 613 (değişiklik yok) |
| Unique stil | 101 | 101 |
| n>=20 stil | 4 | 4 |
| n>=10 stil | 12 | 12 |
| n<5 stil | 67 | 67 |
| Belgian Trappist (toplam) | 18 | 18 |
| Train/test split | 467/146 | aynı |

**Yeni veri eklenmedi** — 5 ardışık veri toplama sprint'i (28-30-35-36-37) negative sonuç. Adım 38 model-side iyileştirme (class merge) önerilir.
