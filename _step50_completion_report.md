# STEP 50 — KAYNAK SPRINT COMPLETION REPORT

**Tarih:** 2026-04-28
**Sprint süresi:** ~6 saat (5 pre-flight + BYO scrape×2 + V14 retrain + eval)
**Sonuç:** ✅ **V14 build BAŞARILI, DEPLOY YOK** — Adım 51 cleaning sprint için input

V10.1 production canary kalıyor.

---

## 🎯 Sprint Özeti

5 yeni veri kaynağı pre-flight + BYO scrape + V14 retrain. Plan değişikliği: taxonomy bug raporu sonrası deploy ertelendi.

| Kaynak | Durum | Sonuç |
|---|---|---|
| 1️⃣ brewgr.com | ❌ NO-GO | Site KAPANMIŞ — `utm_campaign=brewgr_shutdown` redirect |
| 2️⃣ byo.com | ✅ GO + scrape | **1.407 reçete kazanıldı** (2 scrape: ilk run ingredients_raw bug fix sonrası re-scrape) |
| 3️⃣ rmwoods/beer.ai | ⏸ Issue draft | Kaan açacak (gün/hafta yanıt) |
| 4️⃣ archive.org BCS | 🔴 NO-GO | OCR text 401 (lending arkasında) |
| 5️⃣ Scribd byobook | 🔴 NO-GO | Paywall + BYO web ile %50-80 overlap |

**Net dataset:** 7.635 → 8.518 (+883 labeled, BYO 524 unlabeled skip → Adım 51 recovery)

---

## 📊 V14 Model Metrics (Faz 7 eval'den)

| Metric | V10.1 (canary) | V13 | **V14** | Δ vs V13 |
|---|---:|---:|---:|---:|
| Test top-1 | 0.6920 | 0.6764 | **0.6884** | **+1.20pp** |
| Test top-3 | 0.8904 | 0.8981 | **0.9009** | +0.28pp |
| **5-fold CV** | 0.6851 | 0.6884 | **0.6983** | **+0.99pp ⭐** |
| Train-test gap | +12.6pp | +14.1pp | +12.6pp | -1.5pp |
| Brett coverage | %0.17 | %0.16 | **%0.50** | 3.6x |

**Per-class kazanım:**
- 🔥 **Sour / Wild / Brett: %31 → %52** (+21pp top-1, +13pp top-3) — sprint headline
- Belgian Strong / Trappist: %66 → %71 (+5pp)
- Belgian Pale / Witbier: %42 → %47 (+5pp)
- Stout / Porter: %86 → %88 (+2pp)
- Saison: %54 → %56 (+1pp)
- Diğer cluster'lar = veya ±1-3pp split variance

Detay: `_step50_v14_eval_report.md`

---

## 🛑 Deploy Karar — ATLA

V14 metrikleri V10.1'den iyi (CV +1.32pp, Top-3 +1.05pp, Sour transformative), AMA:

**Adım 50 sırasında keşfedilen taxonomy bug'ları:**
- 148 reçete `german_maerzen` → aslında Festbier (Festbier slug 9'da)
- 125 reçete 18 farklı slug'a dağılmış → aslında English Pale Ale / Golden Ale
- 17 reçete Vienna Lager ile fuzzy → aslında Amber Lager
- Belgian Gueuze: V13'te 0 reçete (sour cluster eksik)

**305+ reçete yanlış slug'da. V14 = V13 + BYO ama V13 taxonomy bug'ları aynen geçti.**

**Karar:** V14 deploy ETME. Adım 51 cleaning sprint planı:
1. Festbier migration (148 reçete `german_maerzen` → `festbier`)
2. English Pale Ale taxonomy ekle (125 reçete redistribute)
3. Belgian Gueuze ekleme + Sour granularize
4. BYO unlabeled 524 reçete recovery (stat-based + yeast-based fallback)
5. Specialty cluster granularize (%9 top-1 hâlâ kötü)
6. **V15 = V14 + cleaning** → V15 deploy adayı

---

## 📦 Diskte Korunan Dosyalar (Adım 51 Input)

### V14 Model
- `_v14_model_14cat.json` (3.04 MB) — XGBoost trained
- `_v14_metrics.json` — Performance metrics
- `_v14_label_encoder_14cat.json` — Class labels
- `_v14_rebuild_train.py` — Train script
- `_ml_dataset_v14_pre_retrain.json` (~17 MB) — V13+BYO merged

### BYO Scrape Çıktıları
- `byo_recipes.json` (5 MB) — 1.407 parsed recipes
- `_byo_fetch_log.json` — Scrape log
- `_byo_fetch_progress.log` — Progress trail

### Kod
- `_byo_bulk_fetch.js` — Scraper (ingredients fix dahil)
- `_byo_ingredients_parser.js` — Reusable parser (malts/hops/pct_*)
- `_byo_to_v14_format.js` — V13 format converter

### Raporlar
- `_step50_brewgr_preflight.md` — NO-GO kayıt
- `_step50_byo_preflight.md` — GO + schema analiz
- `_step50_byo_scrape_report.md` — 1.405 ilk scrape
- `_step50_rmwoods_issue_draft.md` — Kaan'a Issue açma talimatı
- `_step50_bcs_preflight.md` — BCS lending notu
- `_step50_byo_book_preflight.md` — Scribd overlap notu
- `_step50_v14_eval_report.md` — V14 vs V13 detaylı eval
- `_step50_completion_report.md` — Bu rapor (master)
- `_faz6_inspection.txt` — 30 sample tam inspection (824 satır)

---

## 🚦 DECISION'lar

- **DECISION-1:** brewgr SKIP (site kapanmış, otomasyon imkansız)
- **DECISION-2:** BYO ingredients_raw v1 parser bug → re-scrape (47 dk ek). %90.0 sample success.
- **DECISION-3:** BCS + byobook SKIP (lending/paywall, Adım 52'de Kaan kitap satın alımıyla değerlendirilebilir)
- **DECISION-4:** rmwoods Issue draft hazır, Kaan açacak (gün/hafta yanıt — async)
- **DECISION-5:** V14 retrain 8.518 reçete üzerinde, Sour cluster +21pp top-1 transformative
- **DECISION-6:** V14 NOT DEPLOY — Adım 51 cleaning sprint için input olarak korundu
- **DECISION-7:** V10.1 production canary kalır (HTML değişmedi)
- **DECISION-8:** GitHub commit YAPILMADI (sprint plan kararı)

---

## 📋 Production Durumu

| | Durum |
|---|---|
| `Brewmaster_v2_79_10.html` | ❌ Değişiklik yok (V10.1 canary kalır) |
| Production canary | V10.1 (6.851 CV, 8.061 reçete) |
| GitHub | Commit yok |
| Netlify deploy | Yok (HTML değişmedi) |
| Drive push | Code yapamaz (MCP API yok) — Kaan manual |

---

## ⏭ Adım 51 Hedefler (Cleaning Sprint)

### Faz 1 — Taxonomy Migration
- Festbier: 148 maerzen → festbier (regex name match + main_cat=German Lager)
- English Pale Ale: golden_ale taxonomy ekle, 125 reçete redistribute
- Amber Lager: vienna fuzzy → amber clear (17)
- Belgian Gueuze: belgian_lambic alt-stil ekle (1+ recovery)

### Faz 2 — BYO Unlabeled Recovery (524 reçete)
- Stat-based fallback (OG/FG/IBU/SRM/ABV → cluster guess)
- Yeast-based (yeast_brett=1 → Sour, yeast_saison=1 → Saison)
- ML pseudo-labeling (V14 model unlabeled'a predict, high-confidence kabul)

### Faz 3 — Specialty Granularize
- Pumpkin / Smoked / Coffee / Vanilla / Fruit alt-stilleri
- Specialty cluster %9 top-1 → hedef %30+

### Faz 4 — V15 Retrain
- V14 dataset + cleaning + recovery + granularization
- Beklenen: Top-1 +2-3pp, Sour cluster +5-10pp ek, Specialty %30+

### Faz 5 — V15 Deploy Karar
- V15 Top-1 V10.1+1pp+ → BETA toggle deploy (6-way)
- V15 Sour Top-1 V10.1+10pp+ → bağımsız sebep deploy
- V15 Top-1 V10.1'den DÜŞÜK → V15 deploy ETME

---

## ÖZET — Kaan'ın okuyacağı

✅ **5-kaynak sprint TAMAM.** brewgr kapanmış (SKIP), BYO 1.407 reçete kazanıldı (re-scrape gerekti, parse bug). BCS/byobook lending/paywall SKIP. rmwoods Issue draft Kaan'da.

🎯 **V14 build BAŞARILI:** 8.518 reçete, CV +0.99pp, **Sour cluster %31→%52 (+21pp transformative).** Brett coverage 12→43 (3.6x).

🛑 **V14 DEPLOY YOK.** Adım 51 cleaning sprint için diskte korundu. Production HTML değişmedi (V10.1 canary), GitHub commit yok.

🐛 **Adım 51 hedefler:** 305+ reçete taxonomy migration (Festbier 148 + English Pale 125 + Amber Lager 17 + Gueuze ekleme), BYO 524 unlabeled recovery, Specialty granularize, V15 retrain.

🤖 **8 DECISION verildi.** Faz 1A NO-GO, Faz 2A GO, Faz 3A draft, Faz 4A NO-GO, Faz 5A NO-GO, Faz 6 retrain, Faz 7 eval, Faz 9 sprint close.

📅 **Süre:** ~6 saat (pre-flight'lar + 2x BYO scrape + V14 retrain + 30 sample inspect + eval).

---

**STEP 50 COMPLETE — V14 BUILD BAŞARILI, DEPLOY ERTELENDI. Commit: YOK.**
