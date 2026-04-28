# Adım 54 Faz 1 — Taxonomy Proposal

**Tarih:** 2026-04-28
**Hedef:** V17'nin 82 slug'ına 9 yeni slug ekleyerek granül BJCP taksonomi geri kazan.

---

## Önemli keşif — STYLE_DEFINITIONS.json zaten 202 slug içeriyor

V15 ML modeli (V17'de hala kullanılan) 82 slug eğitimli, ama HTML motor `STYLE_DEFINITIONS.json` 202 slug ile zengin. Adım 54 Faz 1 hedef 9 slug'ın **çoğu zaten STYLE_DEFINITIONS'da kayıtlı**:

| Önerilen slug | STYLE_DEFINITIONS'da var mı? | Not |
|---|---|---|
| flanders_red_ale | ✅ VAR | OG/IBU/SRM/yeast tanımı mevcut |
| belgian_gueuze | ✅ VAR | — |
| belgian_fruit_lambic | ✅ VAR | — |
| gose | ✅ VAR | — |
| red_ipa | ✅ VAR | — |
| white_ipa | ✅ VAR | — |
| rye_ipa | ✅ VAR | — |
| belgian_ipa | ✅ VAR | — |
| **foreign_extra_stout** | ❌ **YOK** | `export_stout` var (BJCP 2008 alternatifi). İki seçenek: (a) `foreign_extra_stout` adıyla yeni ekle, (b) mapping'i `export_stout`'a yönlendir |

**Sonuç:** Faz 1'in ana işi STYLE_DEFINITIONS'a yeni eklenti DEĞİL — **B-2 mapping table'ı (`_step53_b2_style_mapping.py`) düzelterek rmwoods reçetelerini doğru slug'a yönlendirmek**.

---

## Onay 1 — B-2 mapping güncellemesi önerisi

`_step53_b2_style_mapping.py` `NAME_MAP` dict'inde aşağıdaki düzeltmeler:

```python
NAME_MAP = {
    # ... mevcut girdiler ...

    # === DEĞİŞİKLİKLER ===

    # Sour/Lambic granül ayrımı
    'flanders red ale':              'flanders_red_ale',     # oldu: 'belgian_lambic'
    'fruit lambic':                  'belgian_fruit_lambic', # oldu: 'belgian_lambic'
    'gueuze':                        'belgian_gueuze',       # oldu: 'belgian_lambic'

    # Berliner ailesinden gose ayrı
    'gose':                          'gose',                 # oldu: 'berliner_weisse'

    # Stout ailesinden foreign extra ayrı
    'foreign extra stout':           'export_stout',         # oldu: 'sweet_stout'
    # NOT: STYLE_DEFINITIONS'da 'foreign_extra_stout' yok, 'export_stout' var.
    # Karar 1A: 'export_stout'a yönlendir (mevcut taksonomi ile uyumlu)
    # Karar 1B: STYLE_DEFINITIONS'a 'foreign_extra_stout' ekle (BJCP 2008 ismi)
    # → 1A öneriliyor (basitlik)

    # Specialty IPA granül ayrımı
    'specialty ipa: red ipa':        'red_ipa',              # oldu: 'american_amber_red_ale'
    'specialty ipa: white ipa':      'white_ipa',            # oldu: 'belgian_witbier'
    'specialty ipa: rye ipa':        'rye_ipa',              # oldu: 'american_india_pale_ale'
    'specialty ipa: belgian ipa':    'belgian_ipa',          # oldu: 'belgian_strong_golden'
    # specialty ipa: black ipa zaten 'black_ipa' (değişmiyor)
    # specialty ipa: brown ipa → V15 listede 'brown_ipa' yok, 'american_brown_ale'a kalsın
    # specialty ipa: new england ipa zaten 'juicy_or_hazy_india_pale_ale'
}
```

---

## Yeni slug'ların V18 ML model boyutları (tahmini)

| New slug | Tahmini n | Bucket | OG/FG/IBU/SRM/ABV (BJCP referans) |
|---|---|---|---|
| **export_stout** (foreign_extra_stout map) | 1,221 | 500+ | OG 1.056-1.075, FG 1.010-1.018, IBU 50-70, SRM 30-40, ABV 5.5-8.0% |
| **flanders_red_ale** | 694 | 500+ | OG 1.048-1.057, FG 1.002-1.012, IBU 10-25, SRM 10-16, ABV 4.6-6.5% |
| belgian_fruit_lambic | 427 | 100-499 | OG 1.040-1.060, FG 1.000-1.010, IBU 0-10, SRM 5-10, ABV 5.0-7.0% |
| red_ipa | 308 | 100-499 | OG 1.056-1.070, FG 1.008-1.016, IBU 40-70, SRM 11-17, ABV 5.5-7.5% |
| belgian_gueuze | 301 | 100-499 | OG 1.040-1.060, FG 1.000-1.006, IBU 0-10, SRM 5-13, ABV 5.0-8.0% |
| white_ipa | 203 | 100-499 | OG 1.060-1.075, FG 1.010-1.016, IBU 40-70, SRM 5-8, ABV 5.5-7.0% |
| rye_ipa | 200 | 100-499 | OG 1.056-1.075, FG 1.008-1.014, IBU 50-75, SRM 6-15, ABV 5.5-8.0% |
| belgian_ipa | 146 | 100-499 | OG 1.058-1.080, FG 1.008-1.016, IBU 50-100, SRM 5-15, ABV 6.2-9.5% |
| gose | 102 | 100-499 | OG 1.036-1.056, FG 1.006-1.010, IBU 5-12, SRM 3-5, ABV 4.2-4.8% |

---

## Parent slug etkilenmesi (kayıp)

| Parent | Şu an | Faz 1 sonrası | Δ |
|---|---|---|---|
| belgian_lambic | 1,820 | 398 | -1,422 (yine train'de, hala 100-499) |
| sweet_stout | 5,301 | 4,080 | -1,221 |
| belgian_witbier | 4,917 | 4,714 | -203 |
| american_india_pale_ale | 44,407 | 44,207 | -200 |
| berliner_weisse | 1,479 | 1,377 | -102 |
| american_amber_red_ale | 9,399 | 9,091 | -308 |
| belgian_strong_golden | 1,935 | 1,789 | -146 |

**Kritik dikkat:** `belgian_lambic` 1,820 → 398, %78 kayıp. Hala train'de ama "klasik unblended lambic" reçetelerinin az olduğunu gösteriyor.

---

## V18 train sonrası beklenen değişimler

- **Slug count:** 82 → 91 (+9)
- **Model size:** 44.5 MB → ~52-58 MB (depth 4 × 300 trees × 91 class)
- **Slug top-1 beklenen:** Aynı veya marjinal düşüş (granül aileler arası confusion artar) — ama **specialty IPA kategorisinde +%2-5 kazanç** (kullanıcı "rye IPA" yazdığında specialty IPA top-3'e yansır).
- **Sour cluster:** belgian_lambic granül → flanders_red, gueuze, fruit_lambic ayrıştığı için "klasik lambic" daha temiz. Brett/mixed_ferm'a etkisi sınırlı (Faz 2 işi).

---

## Onay 1 sorusu

- **Karar 1A** (önerilen): `foreign extra stout` → `export_stout` (mevcut STYLE_DEFINITIONS slug). Ek STYLE_DEFINITIONS değişikliği yok.
- **Karar 1B** (alternatif): STYLE_DEFINITIONS'a `foreign_extra_stout` ekle, BJCP 2008 ismini koru.

V18 retrain başlatma onayı bekliyor.
