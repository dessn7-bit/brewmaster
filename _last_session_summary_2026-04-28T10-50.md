# Brewmaster — Son Oturum Özeti

**Tarih:** 2026-04-28 10:50
**Sprint:** Adım 51 — Cleaning Sprint + V15 Deploy
**Sonuç:** ✅ V15 production'a deploy edildi (V12 motor default)

## Yapıldı
- Faz A audit (V14 8.518 reçete, 10 quality check)
- Faz B cleaning: 945 migration + 763 BYO recovery + 1.182 IBU 10x fix + 5 Brett feature
- Faz C name override (B5d 50) + canonical name recovery (B5e 8)
- Faz D drop 102 reçete → V15 cleaned 8.416
- Faz E V15 retrain (XGBoost depth=3 n_est=200) + HTML V12 motor embed
- Faz F validation pipeline `_validate_new_dataset.py` + README
- Faz G completion report

## V15 Metrikler
- **CV: 0.6987** (V10.1 +1.36pp ⭐)
- **Test top-3: 0.9007** (V10.1 +1.03pp ⭐)
- Test top-1: 0.6911 (V10.1 -0.09pp marjinal)
- **Sour cluster: %54 top-1** (V10.1 +23pp ⭐⭐⭐)
- **Brett 83% / Witbier 84% / Hefe 80% / Saison 75%** (slug model)
- Brett feature 43→63 (+20)

## Slug Coverage
- Canonical %62.2 → **%83.0** (+20.8pp ⭐)
- Active cluster (≥10): 71 → 77
- Yeni slug: american_pale_ale 497, american_strong_pale_ale 311, festbier 44, english_pale 39, brown_ale 33, weizenbock 36, gueuze, belgian_ipa, lambic

## Deploy
- HTML: `Brewmaster_v2_79_10.html` V12 motor embed (line 1109+)
- Default V6 → **V12** (V15 model)
- Toggle: V6/V8.5/V9/V10/V10.1/**V12** (6-way)
- Model dosyaları: `_v15_model_14cat.json` (3.0 MB), `_v15_label_encoder_14cat.json`
- V14 model rollback için diskte

## Adım 51 scope DIŞI bulgular
- 1.432 reçete generic slug (brown_ale 289, porter 179, stout 119, ...) → **Adım 55.5** önerisi
- 214 reçete yeast parser hatası (hefe_nonwheat 130, witbier_nonbelgian 45, ...) → **Adım 56**
- Specialty %9 top-1 → Adım 56 granularize

## DECISIONS (10)
1. B agresifliği ORTA (Generic taxonomy → Adım 55.5)
2. Festbier maerzen+name (68 trigger, +B5d 25 ek)
3. BYO recovery gevşek (821/883 %93)
4. WARN strateji (IBU 10x fix, diğerleri as-is)
5. V15 deploy ✅ (Sour +23pp transformative)
6. HTML default V6 → V12
7. V14 model rollback için saklandı
8. Specialty → Adım 56
9. Generic slug → Adım 55.5
10. Validation pipeline kalıcı (`_validate_new_dataset.py`)

## Pipeline çıktıları
- `_audit_dataset_full.py` (ENV-aware audit)
- `_apply_cleaning_v15.py` (B1-B5e+C1)
- `_v15_train.py` (14cat + slug)
- `_slug_dist_v14_vs_v15.py`
- `_validate_new_dataset.py` ⭐ (Adım 52+ tool)

## Sonraki
- Adım 52: yeni veri (rmwoods async, AHA, TMF) → validation pipeline'dan geçir
- Adım 55.5: Generic slug alias enrichment (1.432 reçete)
- Adım 56: Yeast parser fix + Specialty granularize
