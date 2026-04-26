# AUDIT STEP 26 — DATASET AUDIT + REGEX RECOMPUTE + STIL HIERARCHY ÖZET

**Tarih:** 2026-04-26
**Mod:** Otonom (Kaan'a soru sorulmadı)
**Önceki adımlar:** 18 (V6 bug listesi), 20-23-25 (5 V6 bug fix)

---

## Yapılan işler

### İş A — Dataset audit ✅
Dosya: `_audit_step_26a_dataset_audit.md`

**Bulgular:**
- 1100 reçete, 150 stil
- Sum-of-pcts: 32.3% reçete sum>150 (regex çakışması), 52.1% sağlıklı
- 109/150 stil n<10 (stratify imkânsız)
- 76/150 stil n<5 (yetersiz)
- 44 slug+name duplikat, 22 feature vector duplikat
- 3 ABV outlier (b2_360 abv=32%, b2_445 abv=28%, b2_318 abv=18%)
- 25 SRM>60 (RIS/Imperial Stout için olağan, gerçek outlier değil)

**Pattern:** Çakışma İngiliz/Amerikan stillerinde (pale_ale-tabanlı) %90-100, Belçika/Alman'da (pilsner-tabanlı) <30%.

### İş B — Regex recompute tasarımı ✅
Dosya: `_audit_step_26b_regex_design.md`

**Karar:** Mevcut "her feature ayrı regex, her malt teste tabi" yöntemi → "tek classifier, malt başına TEK kategori" yöntemine geçiş.

**Yeni feature seti (16 → 18 pct feature):**
- `pct_pale_ale` (YENİ — pct_pilsner ve pct_base'den ayrılıyor)
- `pct_other` (YENİ — kategorize edilemeyen, %0 hedef)
- `total_base` (DERIVED — sum pilsner+pale_ale+munich+vienna+wheat)
- pct_base feature'ı **kaldırılıyor** (V6 builder'da hardcoded)

**Sınıflandırıcı pseudo-kod** (Adım 26B'de detay): 17 kategori, öncelik sırası en spesifik (Crystal, Chocolate, Smoked) → en genel (Pilsner, Pale Ale).

**Engel:** V7 motoru sıfırdan eğitilmeli (V6 79-feature ≠ V7 yeni feature seti).

### İş C — Recompute (yeni dataset üretme) ❌ YAPILAMADI
Dosya: YOK

**Sebep:** V6 dataset kayıtlarında raw malt listesi tutulmuyor — sadece computed features (`og`, `pct_pilsner` vb.). Recompute için kaynak veriler (raw recipe.malts arrays) gerekli. Mevcut dosyada YOK.

**Karar:** İş C atlanıyor. V7 için yeni dataset toplaması gerekiyor (BYO/Brulosophy/brewery clones tekrar download + raw malt parse). Ayrı bir sprint.

### İş D — Stil hierarchy ✅
Dosya: `_audit_step_26d_style_hierarchy.json` + `.md`

**Sonuç:** 150 alt stil, 14 ana kategoriye eşlendi. Eksik 0, yetim 0, duplicate 0 (validasyon geçti).

**Ana kategoriler (recipe sayısına göre azalan):**

| Ana Kategori | Alt Stil # | Reçete # |
|---|---:|---:|
| German Lager | 25 | 200+ |
| American Hoppy | 22 | 200+ |
| Stout / Porter | 13 | 130+ |
| Specialty / Adjunct | 16 | 80+ |
| Belgian Strong / Trappist | 4 | 68 |
| Sour / Wild / Brett | 12 | 100+ |
| Hybrid Ale-Lager | 12 | 50+ |
| Belgian Pale / Witbier | 5 | 50+ |
| Saison / Farmhouse | 4 | 60+ |
| German Wheat | 8 | 35+ |
| British Strong / Old | 9 | 30+ |
| British Bitter / Mild | 6 | 30+ |
| Irish / Red Ale | 3 | 40+ |
| Historical / Special | 9 | 15 |

**Belgian Strong / Trappist** ailesi (Dubbel/Tripel/BSDA/Quad) Kaan'ın isteğine göre AYRI kalıyor (merge yok).

### İş E — V7 hazırlık özeti

#### Kullanılabilir reçete sayısı (post-dedupe tahmini)
- Mevcut: 1100
- 44 slug+name duplikat çıkarılırsa: **~1056**
- 3 abv outlier çıkarılırsa: ~1053
- 22 feature vector duplikat (farklı slug — manuel review gerekiyor): borderline

#### Stil dağılımı (V7 için risk)
- n>=20: **8 stil** (sağlıklı train coverage)
- n>=10: 41 stil
- n>=5: 74 stil (zorlu ama mümkün)
- n<5: 76 stil (V7 train için problemli — ya merge ya outlier sınıfı)

#### Eksik / Türkiye'ye özel stiller
- Mevcut dataset Anglo-Saxon ve Belçika/Alman ağırlıklı.
- Türkiye'de yapılan tarzlar (Hoppy Wheat, Belgian-NEIPA hybrid, Türk usulü Saison) yok.
- BiraBurada/yerel reçeteler dataset'e eklenirse Türkiye'ye özel cluster'lar oluşur.

#### XGBoost training feature listesi (önerilen final)
1. **Scalar (5):** og, fg, abv, ibu, srm
2. **Pct mutually exclusive (18):** pct_pilsner, pct_pale_ale, pct_munich, pct_vienna, pct_wheat, pct_oats, pct_rye, pct_crystal, pct_choc, pct_roast, pct_smoked, pct_corn, pct_rice, pct_sugar, pct_aromatic_abbey, pct_sixrow, pct_other, total_base
3. **Yeast binary (16):** mevcut V6 listesi korunur (yeast_belgian/abbey ayrımı düzeltildi)
4. **Yeast specifik (7):** yeast_abbey, yeast_witbier, yeast_golden_strong, yeast_saison_3724, yeast_saison_dupont, yeast_english_bitter, yeast_english_mild
5. **Hop signature (7):** mevcut HOP_SIG portu (Adım 20)
6. **Katki (10):** mevcut KATKI_SIG portu
7. **Process (7):** mash_temp, ferm_temp, water_*, yeast_atten, boil_time
8. **Derived flag (4):** high_hop, strong_abv, dark_color, pale_color
9. **Other (4):** dry_hop_days, mash_type_step, mash_type_decoction, lagering_days

**Toplam V7 feature:** 78 (V6'nın 79'undan pct_base çıkarılıp pct_pale_ale + pct_other + total_base eklendi: net +2 → 81 yapılabilir, basitleştirme için pct_other ML'e verilmez = 80).

#### Sıralı V7 todo

1. ⬜ **Veri toplama** — kaynak reçete dosyaları (raw malts içeren). BYO archive, Brulosophy DB, brewery clone kitapları, MTF DB. Hedef: 1500+ reçete.
2. ⬜ **Dedupe** — 44 mevcut + yeni topladıklarımı slug+name+5-scalar bazlı tekleştir.
3. ⬜ **Outlier düzelt** — 3 abv outlier manuel düzelt veya çıkar.
4. ⬜ **Regex recompute** — Adım 26B'deki `classifyMalt` ile pct_* yeniden hesapla. Yeni dataset: `_ml_dataset_v7_clean.json`.
5. ⬜ **Stil hierarchy uyumlu split** — Adım 26D'deki 14 kategoriyi train/test stratify için kullan.
6. ⬜ **XGBoost train** — 80 feature, 14 kategori (ana) + 150 alt stil (multi-output veya hierarchical).
7. ⬜ **V7 motor inject** — V2c builder + V6 builder pattern'iyle V7 inline scripti HTML'e ekle.
8. ⬜ **Canary** — `engineMode` flag ile V6 vs V7 paralel koştur, A/B karşılaştır.
9. ⬜ **Migration** — V7 sağlam çalışırsa V6 dead-code'a indir, V7 default yap.

---

## V7'ye hazır mı?

**Tasarım hazır:** ✅ (regex tasarımı, hierarchy, feature listesi)
**Veri hazır:** ❌ (raw malt listesi yok — yeni veri toplama gerek)
**Code path hazır:** Kısmen (V7 motoru sıfırdan yazılacak ama V6'nın `BM_ENGINE_V6_FINAL.classifyMulti` API'si template olarak kullanılabilir)

**Kritik blocker:** Adım 26C (recompute) yapılamadı — raw malts gerekiyor. V7'nin önündeki tek engel **VERİ**, mantık değil.

**Tahmini iş yükü:**
- Veri toplama (raw malts dahil ~1500 reçete): 2-3 sprint
- Recompute + clean dataset: 1 sprint
- XGBoost train + tune: 1-2 sprint
- HTML inline + canary: 1 sprint
- **Toplam:** 5-7 sprint (V7 production'a hazır olana kadar)

---

## Sonraki acil adım

**Adım 27:** Mevcut V6 motorunu Faz 1+2+3+4 fix'lerinden sonra (Adım 19 baseline harness'ı tekrar) test et. Belgian Dubbel hâlâ doğru tahmin alıyor mu? Eğer hayır, sebep dataset/regex granülarite sorunu mu — bu Adım 26 raporunun hipotezini doğrular veya çürütür.
