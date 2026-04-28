# Adım 54 Faz 2 — BRETT_RE Pattern Genişletme Önerisi

**Tarih:** 2026-04-28
**Hedef:** Brett feature hit rate'i artır (62% → ≥85%) → V18 brett_beer top-1 düzelt.

---

## Mevcut BRETT_RE pattern (Adım 51 + 53'te aynı)

`_step53_b3_to_v15_format.py:93-97`:

```python
BRETT_RE = re.compile(
    r'\bbrett(anomyces)?\b|'
    r'\bwlp\s*0?(644|645|648|650|651|652|653|654|655|656|660|665|670|671|672|4639)\b|'
    r'\bwy?\s*0?5(112|151|526|512|733|378)\b|'
    r'bruxellensis|lambicus|drie|trois|clausenii',
    re.IGNORECASE)
```

Aynı pattern: `_audit_dataset_full.py`, `_apply_cleaning_v15.py`, `_step52_aha_b4_parser.py`, `_validate_new_dataset.py`

---

## Hit rate (V17 dataset, 30 sample brett_beer + 20 mixed_ferm)

| Slug | Total | yeast_brett=1 | has_brett=1 |
|---|---|---|---|
| brett_beer | 76 | **47 (62%)** | 52 (68%) |
| mixed_fermentation_sour_beer | 213 | 66 (31%) | 64 (30%) |

**38% brett_beer reçetesi pattern'i tetiklemiyor** — model bu reçetelerde `yeast_brett=0` görüyor → brett özelliklerini öğrenemiyor.

---

## Sample analizi — kaçırılan brett_beer reçeteleri

| Recipe ID | Name (kısaltılmış) | yeast_brett | Kaçırma sebebi |
|---|---|---|---|
| rmwoods_337919 | birthday #02 - säsongen av lejon | 0 | yeast field belirsiz, recipe name'de yok |
| rmwoods_372840 | 12 gal orange sais | 0 | aslen saison etiketli |
| rmwoods_401100 | back o'er oregon **bretted** rainier cherry sour | 0 | **`\bbrett\b` "bretted"i yakalamıyor (kelime sınırı sorunu)** |
| rmwoods_404125 | saison with currant/gooseberry | 0 | brett yeast yok, mislabel? |
| rmwoods_357793 | birthday #01 - säsongen av lejon | 0 | aynı mislabel |
| rmwoods_359615 | farmhouse rye ale (254) | 0 | "farmhouse" ipucu ama pattern'da yok |
| rmwoods_399804 | english oud bruin maybe? | 0 | oud bruin yorum (sour ama brett değil?) |
| tmf_brett-pale-ale.html | Brett Pale Ale | 0 | URL'de "brett" var ama yeast field'ında yok? |
| aha_dregs-of-the-loon-wild-ale | Dregs Of The Loon **Wild Ale** | 0 | "wild ale" pattern'da yok |
| rmwoods_345338 | all the yeasts **wild** | 1 | Yakaladı (yeast field'da brett strain var) |

**Patterns kaçırılan kelimeler:**
1. `bretted` (geçmiş zaman fiil)
2. `bretty` (sıfat)
3. `wild ale`, `wild yeast`, `wild fermentation`
4. `funky`, `farmhouse sour`, `foeder`
5. Commercial blends: `wildbrew sour`, `philly sour`, `lallemand wild`, `omega cosmic punch`

---

## Önerilen yeni BRETT_RE

```python
BRETT_RE = re.compile(
    # Core brett kelimesi + tüm türevleri
    r'brett(anomyces|y|ish|ed)?\b|'
    # Spesifik strain ID'leri (mevcut)
    r'\bwlp\s*0?(644|645|648|650|651|652|653|654|655|656|660|665|670|671|672|4639)\b|'
    r'\bwy?\s*0?5(112|151|526|512|733|378)\b|'
    # Bilimsel ve coğrafi türevler (mevcut)
    r'bruxellensis|lambicus|drie|trois|clausenii|'
    # YENİ: Recipe name + yeast field "wild" terimleri
    r'\bwild\s*(ale|yeast|fermentation|brew)\b|'
    # YENİ: Commercial blends
    r'wildbrew\s*sour|philly\s*sour|lallemand\s*wild|omega\s*(?:yeast\s*)?(?:cosmic|saisonstein|hothead)|'
    # YENİ: Brewery/process language
    r'\bfoeder\b|funky|farmhouse\s*sour|barrel\s*(?:aged\s*)?sour',
    re.IGNORECASE)
```

### Test (sample brett_beer reçetelerinde)

| Reçete name | Mevcut RE | Yeni RE |
|---|---|---|
| "back o'er oregon bretted rainier cherry sour" | ❌ | ✅ (bretted) |
| "señor breto" | ❌ | ❌ (brett'in türevi değil, "breto" tek başına) |
| "schubrew bretty the brett brett" | ✅ | ✅ |
| "Dregs Of The Loon Wild Ale" | ❌ | ✅ (wild ale) |
| "farmhouse rye ale (254)" | ❌ | ❌ (farmhouse ale brett değil zorunlu olarak) |
| "blueberry brett" | ✅ | ✅ |
| "honey and pinecone wild ale" | ❌ | ✅ (wild ale) |

Tahmin: brett_beer hit rate **62% → 80-90%**.

---

## Ek değişiklik: `compute_features` yeast_str genişletme

`_step53_b3_to_v15_format.py:130-138`:

```python
# Şu an
yeast_parts = []
for y in (yeast_list or []):
    name = y.get('name_original') or y.get('name') or ''
    lab = y.get('lab') or ''
    pid = y.get('product_id') or ''
    ytype = y.get('type') or ''
    yeast_parts.append(f'{lab} {pid} {name} {ytype}')
yeast_str = ' '.join(yeast_parts).lower()
```

**Sorun:** Recipe name + sorte_raw bu yeast_str'a dahil değil. "Brett Pale Ale" recipe'si yeast field'ında brett strain ID'si yoksa kaçırılır.

**Düzeltme önerisi:**

```python
# Yeast text + recipe name + sorte_raw (brett ipuçları için)
yeast_parts = []
for y in (yeast_list or []):
    name = y.get('name_original') or y.get('name') or ''
    lab = y.get('lab') or ''
    pid = y.get('product_id') or ''
    ytype = y.get('type') or ''
    yeast_parts.append(f'{lab} {pid} {name} {ytype}')

# YENİ: recipe name + sorte_raw da yeast_str'a karışır (brett detection için)
recipe_name = (core.get('name') or '')
sorte = (core.get('style_name') or '')
yeast_str = (' '.join(yeast_parts) + ' ' + recipe_name + ' ' + sorte).lower()
```

**Etki:** "Brett Pale Ale" recipe'sinde recipe_name yeast_str'a dahil edilir → BRETT_RE tetiklenir.

**Risk:** False positive — "Brett's Wedding Beer" gibi kişi adı geçen reçeteler. Düşük ihtimal (V17 dataset'inde tespit edilmedi).

---

## V18 sonrası beklenen brett_beer top-1

- V16: 62.5% (n=8) — küçük örneklem güvenilmez
- V17: 6.7% (n=15) — küçük örneklem + bug
- V18 hedef: %50-65 (n=15+) — pattern fix sonrası model brett özellik dengesini öğrenir.

**Acil değil:** brett_beer 76 reçete az. Asıl kazanım Faz 1 taxonomy + Faz 5 V18 retrain'de.

---

## Onay 2 sorusu

- **Karar 2A** (önerilen): BRETT_RE genişletme + yeast_str'a recipe name dahil
- **Karar 2B** (muhafazakar): Sadece BRETT_RE genişletme, yeast_str dokunma (false positive riski yok)
- **Karar 2C** (skip): Brett pattern'i değiştirme, küçük n için odaklanmak verimsiz, Faz 5 V18 retrain ile bekle

V18 retrain başlatma onayı bekliyor.
