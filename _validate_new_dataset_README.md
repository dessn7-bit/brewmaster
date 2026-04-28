# `_validate_new_dataset.py` — Yeni Dataset Validation Pipeline

**Versiyon:** Adım 51 Faz F çıktısı (2026-04-28)

Brewmaster ML dataset'ine yeni veri kaynaklarını (TMF, AHA, eBeer, vs.) entegre etmeden önce 5-check kalite süzgecinden geçirmek için yeniden-kullanılabilir CLI tool.

## Kullanım

```bash
python _validate_new_dataset.py <input.json>
```

Opsiyonel parametreler:

```bash
python _validate_new_dataset.py <input.json> \
    --reference brewmaster_v15_cleaned.json \
    --styles STYLE_DEFINITIONS.json \
    --out-dir ./
```

## Input formatı

`input.json` ya:

- `{ "meta": {...}, "recipes": [...] }` — Brewmaster standard
- veya direkt `[...]` (recipe list)

Her reçete schema:

```json
{
  "id": "...",
  "source": "tmf|aha|...",
  "source_id": "...",
  "name": "...",
  "bjcp_slug": "...",
  "bjcp_main_category": "...",
  "raw": {
    "malts": [{"name":"...","amount_kg":...,"cat":"..."}],
    "hops": [{"name":"...","amount_g":...,"alpha":...,"time_min":...}],
    "yeast": "...",
    "og": ..., "fg": ..., "abv": ..., "ibu": ..., "srm": ...,
    "batch_size_l": ...
  },
  "features": { ... 81 feature opsiyonel ... }
}
```

## 5-Check kalite süzgeci

| # | Check | FAIL trigger | WARN trigger |
|---|---|---|---|
| 1 | **Schema** | `name`/`og`/`fg` eksik, slug+main_cat ikisi de yok | – |
| 2 | **Quality** | OG 1.020-1.150 dışı, FG 0.990-1.040 dışı, ABV 1-15 dışı | IBU 0-200 dışı, SRM 1-50 dışı, ABV-OG/FG inconsistency >0.5, IBU >200 (10x decimal sus) |
| 3 | **Slug** | Slug ne canonical ne alias | Alias match (auto-migrate önerilir) |
| 4 | **Duplicate** | – | Reference dataset karşı fingerprint match |
| 5 | **Yeast** | – | Yeast string >500 char (prose leakage), yeast string boş |

## Çıktılar

| Dosya | İçerik | Sonraki adım |
|---|---|---|
| `validated_<basename>.json` | PASS reçeteler — Brett 5 feature ve cleanYeastString v2 ile zenginleştirilmiş | Doğrudan dataset'e merge |
| `manual_review_<basename>.json` | WARN reçeteler — flag detaylarıyla | Kaan onayı sonrası selectively merge |
| `rejected_<basename>.json` | FAIL reçeteler — flag detaylarıyla | Drop, kaynak data quality fix sonrası tekrar dene |

## Brett feature derivation

Validation sırasında her PASS/WARN reçete için 5 boolean otomatik türetilir:

- `has_brett` — Brettanomyces strain (WLP 644-672, WY 5XXX, omega/gigayeast brett, bruxellensis, lambicus, drie, trois, clausenii)
- `has_lacto` — Lactobacillus strain (WLP 67X-69X, WY 5335/5223/5424)
- `has_pedio` — Pediococcus strain (WLP661, damnosus)
- `is_mixed_fermentation` — Brett + clean US-05 isolate together
- `is_100pct_brett` — Brett alone (no clean ale yeast)

## cleanYeastString v2

Yeast string >500 char ise prose leakage temizler — sadece strain ID'leri (Wyeast/WLP/Fermentis/Mangrove Jack) ve Brett/Lacto/Pedio mention'ları korur.

## Adım 52+ entegrasyon adımları

1. Yeni veri scrape edilir → raw JSON
2. Brewmaster format'a dönüştür (örn `_byo_to_v14_format.js` benzeri converter)
3. **Bu pipeline'ı koş** → `validated_*.json`, `manual_review_*.json`, `rejected_*.json`
4. Manual review batch'ini Kaan'la geçir (DÜZELT/SİL/BIRAK)
5. PASS + onaylı WARN reçeteleri V15 dataset'e merge et
6. V16 retrain — beklenen iyileşme metrikleri ölç
7. Deploy karar (3 kriter: Top-1 +1pp / Sour +5pp / yeni slug fonksiyonel)

## Bağımlılıklar

- Python 3.10+ (stdlib only — numpy/sklearn gerekmez)
- `STYLE_DEFINITIONS.json` (canonical slug whitelist + alias map)
- `brewmaster_v15_cleaned.json` (reference — duplicate fingerprint check için, opsiyonel)

## Test

```bash
# V15 cleaned dataset üzerinde sanity test (kendi kendine validate)
python _validate_new_dataset.py brewmaster_v15_cleaned.json
# Beklenen: %100 PASS (cleaned dataset zaten geçmiş quality süzgeçinden)
```
