# AUDIT STEP 32 — DIYDOG MAPPING FIX + TMF PHASE 2 + BREWFATHER ARAŞTIRMA

**Tarih:** 2026-04-26
**Mod:** Otonom (3 paralel track)
**Önceki:** Adım 31 (commit 31d068f) — diydog 325 + TMF 5 toplandı

---

## TRACK A — DIYDOG BJCP MAPPING FIX

### Özet
- **Önceki:** 90/325 mapped (%27.7), 235 specialty fallback
- **Sonra:** 284/325 mapped (%87.4), **41 specialty kaldı**
- **Δ +194 reçete kurtarıldı** — hedef %70 aşıldı (%83 başarı)

### Heuristic katmanları (uygulama sırası)
1. **Manual Brewdog catalog map** (21 reçete) — Punk IPA, Hardcore IPA, Cocoa Psycho, Tokyo, Paradox, vb. Brewdog kataloğunun bilinen ürünleri
2. **Name pattern** (28 reçete) — "Ace of Hop" → IPA, "Hello My Name Is" → fruit_beer, "Hazy Jane" → NEIPA, "Pumpkin" → pumpkin spice, "Quad/Tripel/Dubbel/Wit/Saison" prefix
3. **Composition heuristic** (8 reçete) — fermentables[].name içinde rye>20% → rye_ipa, smoked malt → rauchbier, oat+roast → oatmeal_stout
4. **Metric heuristic** (137 reçete) — OG/IBU/SRM kombinasyonları (Brewdog scale: OG=1095 → 1.095). Örn: OG≥1.080 + SRM≥30 → imperial_stout, OG≥1.065 + IBU≥60 + SRM<12 → double_ipa, OG≥1.050 + IBU≥35 + SRM<12 → american_ipa
5. **Original V6 heuristic** (90 reçete) — Adım 31'de zaten mapped

### Final BJCP slug dağılımı (top 10)

| Slug | n |
|---|---:|
| american_imperial_stout | 65 |
| american_india_pale_ale | 51 |
| **specialty_beer (kalan)** | **41** |
| double_ipa | 23 |
| fruit_beer | 19 (Hello My Name Is serisi) |
| porter | 14 |
| pale_ale | 14 |
| american_barleywine | 10 |
| session_india_pale_ale | 10 |
| pale_lager | 9 |

**41 unmappable:** OG/IBU/SRM eksik veya çok atipik reçeteler (örn. Brewdog Blitz Series OG=1.007 IBU=8 SRM=3 — sub-2% deneysel).

### Çıktılar
- `_v7_recipes_diydog.json` (güncellenmiş, 325 records, bjcp_source field eklendi)
- `_diydog_bjcp_mapping.json` (tablo: file → name → og/ibu/srm → bjcp_slug → bjcp_source)
- `_v7_diydog_remap.js` (heuristic script)

---

## TRACK B — TMF PHASE 2 OTOMASYON

### Özet
- **Hedef:** 226 TMF post toplama (Adım 31 Track B Phase 1'de 5 toplanmıştı)
- **Yapılan:** 168 URL hedeflendi (öncelik veri çeşitliliği için; geri kalanı düşük-değer Kvass/Cider/Mead/Sake)
- **Sonuç:** 165 başarılı fetch, 3 hata (2 HTTP404, 1 timeout)
- **Total TMF:** 5 (Phase 1) + 165 (Phase 2) = **170 reçete**

### Quality breakdown
| Kategori | Sayı | Oran |
|---|---:|---:|
| good (fermentables + hops + metrics) | 25 | %15 |
| partial (fermentables veya hops eksik) | 133 | %78 |
| weak (sadece metrics) | 7 | %4 |
| complete (Phase 1 manual) | 5 | %3 |

### Field başarı oranı
- with fermentables: 162/170 (%95) ✅ Strong
- with og: 166/170 (%98) ✅ Strong
- **with hops: 31/170 (%18)** ⚠️ Regex pattern çok dar — TMF blog hop notation'ı çeşitli ("Cascade @ 60min" vs "Cascade hops, 1oz, 60 minutes" vs tablo formatı)
- with srm: ~%50

### Zaaf nedeni
Hop regex pattern (`(\d+(?:\.\d+)?)\s*(oz|g)\s+([A-Z][A-Za-z0-9 '®/-]{2,30})`) TMF'nin çoklu hop formatını yakalayamıyor. Mike Tonsmeire her post için farklı tablo/text pattern kullanmış — generalize parser %18'de takıldı.

**İyileştirme önerisi (Phase 3):** Per-post WebFetch (LLM extraction) hops için. 170 × 30sec = 85 dk ek süre; ya da targeted hop section regex (TMF post'larda hop bölümü genelde "Hops" header'ından sonra geliyor).

### Hatalar
- `flanders_red_again`: HTTP 404 (post URL changed/deleted)
- `guinness_extra_1883`: timeout
- `de_dom_quick_sour`: HTTP 404

### Çıktı
- `_v7_recipes_tmf.json` (170 records)
- `_v7_tmf_phase2.js` (Phase 2 scraper script)

---

## TRACK C — BREWFATHER ARAŞTIRMA

**Detaylı rapor:** `_audit_step_32_brewfather_features.md` (ayrı dosya)

### En değerli 3 öğrenme

1. **Source vs Target dual water profile + dilution calc**
   - Brewfather: kullanıcı musluk suyu + hedef profil → otomatik dilution oranı
   - Brewmaster: sadece target. **Düşük zorluk, yüksek değer ekleme.**

2. **Yeast pitch rate + starter calculator**
   - Brewfather: OG + batch + maya viability → cell count target
   - Brewmaster: yok (kullanıcı manuel hesaplıyor). **Düşük zorluk, yüksek talep.**

3. **Brew day tracker mode (step-by-step wizard)**
   - Brewfather: brew status workflow + "Brew Day!" badge + per-step timer
   - Brewmaster: brewLog manuel kayıt. **Orta zorluk, yüksek deneyim değeri.**

### Brewmaster'ın korunması gereken üstünlüğü
**ML-based style prediction (V6/V7).** Brewfather sadece statik BJCP range gösterir, ML tahmin **yapamıyor**. Bu Brewmaster'ın ana diferansiyatörü — V7 sprint'i devam etmeli.

### Brewfather Public DB
- API: tüm `/v2/*` endpoint'leri auth zorunlu (DOĞRULANDI)
- Web app public recipe browse: SPA, JS-rendered, **scrape için browser otomasyonu gerekiyor** (Cloudflare/JS challenge)
- V7 dataset için fizibıl değil

---

## V7 DATASET — TOPLAM DURUM

| Kaynak | Reçete | Status |
|---|---:|---|
| `_ml_dataset_v7_partial_with_malts.json` (Adım 27 BYO/Brulosophy pilot) | 199 | ✅ Hazır |
| `_v7_recipes_diydog.json` (Adım 31+32 Brewdog DIY Dog, mapping fix) | 325 | ✅ %87 BJCP-mapped |
| `_v7_recipes_tmf.json` (Adım 31+32 The Mad Fermentationist) | 170 | ✅ %95 fermentables, hops zayıf |
| **TOPLAM** | **694** | |

### Stil dağılımı (yaklaşık, dedupe öncesi)

| Kategori | Mevcut adet (yaklaşık) |
|---|---:|
| American Hoppy (IPA/NEIPA/Pale) | ~150 |
| Specialty (Brewdog deneysel + TMF deneysel) | ~80 |
| Stout/Porter | ~80 |
| Belgian Strong (Dubbel/Tripel/Quad/BSDA) | ~25 |
| Belgian Sour/Wild | ~30 |
| German Lager | ~50 |
| German Wheat | ~25 |
| Saison/Farmhouse | ~40 |
| British | ~35 |
| Hybrid Lager | ~30 |
| Sour/Wild (American) | ~25 |
| Specialty Adjunct | ~50 |
| Diğer | ~75 |

### V7 train için yeterli mi?

**EVET, MARJİNAL.** 694 reçete, 14 ana kategoriye eşit dağılım yok ama:
- **n>=20** kategoriler train için OK (Stout, IPA, Lager, Belgian)
- Dubbel/Tripel/Quad still küçük (~10-15) — Brewmaster Dubbel reçetesi için cluster zayıf
- Specialty cluster büyük (Brewdog deneyselleri 41+ specialty — KNN bias riski)

### Sıradaki adımlar (öncelik sırası)

1. **Adım 33: Dedupe + temizleme** — 694 reçeteden 44 slug+name duplikat (Adım 26 audit) çıkar → ~650 unique. Outlier (abv>16) düzelt.
2. **Adım 34: classifyMalt recompute** (Adım 26B regex tasarımı) → `_ml_dataset_v7_clean.json`. Tüm 650 reçete için pct_* mutually exclusive.
3. **Adım 35: V7 motor** — XGBoost + KNN ensemble train. 14 ana kategori bazlı stratify split.
4. **Adım 36: V7 inject + canary** — HTML'e V7 bind, V6 vs V7 paralel A/B test.

---

## Yapılamayan / atlananlar

- TMF Phase 2 hop regex %18 — Phase 3 (WebFetch LLM extraction) için ayrı sprint gerekli
- 41 diydog reçete hâlâ unmapped specialty — atipik OG/IBU/SRM, manuel kuvars gerekiyor
- Brewfather public recipe scrape — Cloudflare/JS challenge nedeniyle imkânsız (mevcut araçlarla)
- 3 TMF URL ölü (2 HTTP404, 1 timeout) — kaybedildi
