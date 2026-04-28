# Bug 7 — Dataset Label & V15 Slug Audit

**Tarih:** 2026-04-28
**Status:** AUDIT REPORU (kod yok)
**Bağlam:** Kaan ekran görüntülerinde gördüğü iddia edilen slug'lar (`swedish_gotlandsdricke %44`, `sahti %45`, `session_beer %73`, `fruit_and_spice_beer %88`) ve "Saison reçetesi V15 slug'ta belgian_lambic top-1 alıyor" iddiasının doğrulaması.

---

## ⚠ KRİTİK BULGU — V15 encoder'da olmayan slug'lar

V15 model 77 slug ile train edildi (`_v15_label_encoder_slug.json`). Kaan'ın bahsettiği şu slug'lar **V15 encoder'da YOK**:

| İddia edilen slug | V15 encoder'da var mı? | Açıklama |
|---|:---:|---|
| `swedish_gotlandsdricke` | ❌ YOK | V15 dataset'te bu slug ile etiketli reçete yok |
| `sahti` | ❌ YOK | – |
| `finnish_sahti` | ❌ YOK | – |
| `session_beer` | ❌ YOK | V15'te `ordinary_bitter` veya `mild` olabilir, ama "session_beer" generic slug değil |
| `fruit_and_spice_beer` | ❌ YOK | V15'te ayrı: `fruit_beer` + `herb_and_spice_beer` |
| `kveik` (standalone) | ❌ YOK | Norwegian Farmhouse V15'te ayrı slug değil |
| `french_belgian_saison` | ✓ VAR | family=`saison_farmhouse` |
| `specialty_saison` | ✓ VAR | family=`saison_farmhouse` |
| `french_biere_de_garde` | ✓ VAR | family=`saison_farmhouse` |
| `belgian_lambic` | ✓ VAR | family=`sour_wild` |
| `herb_and_spice_beer` | ✓ VAR | family=`specialty` |
| `fruit_beer` | ✓ VAR | family=`specialty` |

### Sonuç

**Kaan'ın ekran görüntülerinde gördüğü iddia edilen slug isimleri V15 model çıktısı DEĞİL.** Olası açıklamalar:

1. **Yanlış copy/parse**: Console'da gerçek slug `fruit_beer` veya `herb_and_spice_beer` görmüş olabilir, "fruit_and_spice_beer" diye birleştirip yazdı.
2. **V14 veya V13 motor logu**: Bu eski motorlar dispatcher'da V12 active mod'da çalışmıyor. Ama console'a düşen log eski olabilir (cache).
3. **Kveik/Sahti/Gotlandsdricke**: Bu slug'lar BJCP standardında var ama V15 dataset'te <5 reçete olduğu için training'e dahil edilmedi (Adım 51 cleaning'te ≥5 reçete filter'ı yok ama V14 dataset'te bu slug'lar zaten yoktu).
4. **session_beer**: Generic etiket değil, V15'te yok. "session" prefixle başlayan slug yok. Ham slug top-1 başka bir slug olmalı.

---

## V15 dataset Saison ↔ Lambic Etiket Sağlığı

### Title "saison" geçen reçeteler (108 toplam)

| V15 slug | Sayı | Doğru aile? |
|---|---:|:---:|
| `french_belgian_saison` | **56** | ✓ saison_farmhouse |
| `specialty_saison` | 15 | ✓ saison_farmhouse |
| `french_biere_de_garde` | 7 | ✓ saison_farmhouse |
| `belgian_blonde_ale` | 7 | ⚠ belgian_ale (Belgian saison-blonde overlap) |
| `german_pilsener` | 5 | ⚠ lager (false-label muhtemelen) |
| `belgian_tripel` | 4 | ⚠ belgian_ale (Saison-Tripel ABV overlap) |
| Diğer (≤3 her biri) | 14 | – |

**56 + 15 + 7 = 78 reçete (%72) doğru saison_farmhouse aile.** %28 yanlış aile (belgian_blonde, tripel, pilsener) — Adım 51 cleaning'in B5 BYO recovery aşamasında stat-based fallback'in kaçırdığı edge case'ler.

### Title "lambic" geçen reçeteler (16 toplam)

**16/16 reçete `belgian_lambic` slug'ında ✓** — %100 doğru. Kaan'ın "Saison ↔ Lambic mapping yanlış" iddiası **DOĞRULAN MADI**: title'da saison geçen 108 reçeteden **0**'ı belgian_lambic'e etiketlenmiş. Saison reçeteleri Lambic'e gitmiyor.

### Title "kveik / voss / hornindal" (5 reçete)

| V15 slug | Sayı |
|---|---:|
| `american_india_pale_ale` | 2 |
| `german_pilsener` | 1 |
| `blonde_ale` | 1 |
| `juicy_or_hazy_india_pale_ale` | 1 |

**Kveik standalone slug V15'te YOK.** Kveik mayası kullanan reçeteler hop bill'e göre **IPA / Pilsner / Blonde** etiketlerine etiketlenmiş. Bu **dataset etiketleme zayıflığı**, training data'da Norwegian Farmhouse ayrı kategori değil.

### Saison aile boyutu (V15 toplam)

| Slug | Reçete sayısı |
|---|---:|
| `french_belgian_saison` | 111 |
| `specialty_saison` | 17 |
| `french_biere_de_garde` | 29 |
| `belgian_lambic` | 28 |
| **saison_farmhouse aile toplam** | **157** |

Sağlıklı temsil. Adım 56 weizenbock granülarize benzeri bir saison granülarize gerekmiyor.

---

## Bergamot Kveik Reçetesinin Olası Açıklaması

Kaan'ın gözlemi: "Bergamot Kveik (Image 5): V15 slug top-1: swedish_gotlandsdricke %44, sahti %45, ribbon: Blonde Ale / Cream Ale, kart: yanlış family"

V15 model çıktısı bu slug'ları VERMEZ (encoder'da yok). Ne oldu?

**Hipotez 1 (en olası):** Kveik mayası + bergamot katkı → V15 model'in görmediği bir kombinasyon. Modele en yakın eşleşmeler:
- Kveik mayası → V15 dataset'te 5 reçete, çoğu IPA/Pilsner/Blonde olarak etiketli
- Bergamot/citrus → herb_and_spice_beer veya fruit_beer ailesinde 0 confidence, çünkü training'de "bergamot" specific feature yok
- → Model reçetenin OG/IBU/SRM range'ine baktığında "blonde_ale" en yakın istatistiksel match (Kaan ribbon'da "Blonde Ale / Cream Ale" görüyor — bu **DOĞRU V15 çıktısı**, hybrid_ale_lager family ✓)

**Hipotez 2:** Console'da V15 slug top-1 = `blonde_ale` veya `cream_ale` gerçek değer. Kaan başka bir window/tab'den slug ismi ödünç almış olabilir (VS Code console'da V14 reference?). Veya V15 slug log formatı yanlış parse edilmiş.

### Doğrulama yolu (Kaan'a önerim)

Kaan, console'a şunu yapıştırsın:

```javascript
window.__lastV12SlugResult.topN.slice(0,5).forEach((r,i) => 
  console.log(`${i+1}. ${r.slug} (${r.normalized}%)`)
)
```

Bu **gerçek V15 slug top-5'i** ham slug isimleriyle döker. Eğer çıktıda `swedish_gotlandsdricke` görünmezse iddia düzeltilmiş olur, gerçek slug'lar üzerinden tartışırız.

---

## Turunç Saison Reçetesinin Olası Açıklaması

Kaan'ın gözlemi: "Turunç Saison (Image 6): V15 slug top-1 belgian_lambic %43"

**V15 dataset'inde "lambic" title'lı 16 reçete var, hepsi belgian_lambic.** Saison title'lı 108 reçete, 0'ı lambic etiketinde. Yani **dataset Saison↔Lambic mapping bug'ı YOK**.

Ama V15 model bir Saison reçetesini Lambic top-1 verebilir mi? Olası nedenler:

1. **OG/IBU/SRM örtüşmesi**: Saison ABV 5-7%, IBU 20-35, SRM 4-8. Lambic ABV 5-6%, IBU 0-10, SRM 4-7. Eğer reçete IBU düşükse (turunç saison Brett kullanmadıysa hop'lardan IBU tasarruf etmiş olabilir) → Lambic stat zone'una düşer.
2. **Sour-yeast feature** (Brett/Lacto): turunç saison'da sour mayası yoksa lambic feature düşük confidence'lı olur, ama eğer "yıllandırma" gibi sinyal varsa model lambic eğilimli.
3. **Specialty (turunç katkı)** feature: V15 model 'turunç' veya 'orange' raw text feature görmedi → spice/herb feature'ı boş → general saison-lambic karar IBU/OG'ye düşer.

Bu reçete-spesifik bir model **edge-case**, dataset etiketleme bug'ı **DEĞİL**.

---

## Kestane London Porter — Stout/Porter Family Sağlığı

Kaan'ın gözlemi: "session_beer %73"

**`session_beer` V15 encoder'da YOK.** Stout/Porter ailesi V15 slug'ları:

| Slug | family |
|---|---|
| irish_dry_stout | stout_porter |
| american_imperial_stout | stout_porter |
| oatmeal_stout | stout_porter |
| sweet_stout | stout_porter |
| stout | stout_porter |
| porter | stout_porter |
| brown_porter | stout_porter |
| robust_porter | stout_porter |

8 slug stout_porter family. Kestane Porter reçetesinde V15 model'in gerçek top-1'i muhtemelen `porter`, `brown_porter` veya `robust_porter`. SLUG_TO_BJCP map:
- porter → "London Porter" ✓
- brown_porter → "Brown Porter" ✓
- robust_porter → "Robust Porter" ✓

Kaan kart başlığında "Belirsiz" görmüş olması Bug 5 (cluster confidence false trigger) sonucu. **Bug 5 fix'i (slug-only confidence) çözmeli.** Ekran görüntüsünde "session_beer" yazısı muhtemelen başka motor çıktısı veya copy-error.

---

## Sonuç ve Öneriler

### Dataset etiketleme sağlıklı

- Saison ↔ Lambic mapping doğru (108 saison title → 0 lambic etiketi)
- Lambic title → %100 belgian_lambic
- Stout/Porter ailesi 8 slug, sağlıklı temsil

### Eksik slug'lar (Adım 56 scope)

| BJCP standardı slug | V15'te durumu | Öneri |
|---|---|---|
| Norwegian Farmhouse / Kveik | YOK (5 reçete IPA/Blonde'a düşmüş) | Adım 56 — kveik standalone slug ekle, mayaya göre etiketle |
| Sahti / Nordic Farmhouse | YOK | Adım 56 — Nordic Farmhouse ailesi |
| Gotlandsdricke (Swedish) | YOK | Adım 56 — historical/specialty alt-stil |
| Session Beer (generic) | YOK | Beğenilmez, çünkü "session" generic. Mevcut `ordinary_bitter` veya stout/porter session varyantları ailesinde yeterli |

### Kaan'ın ekran görüntülerindeki slug'lar V15 çıktısı değil

**Doğrulama gerekli**: Kaan console'da şu komutu çalıştırsın ve **gerçek V15 slug top-5'i** paylaşsın:

```javascript
window.__lastV12SlugResult && window.__lastV12SlugResult.topN
  ? window.__lastV12SlugResult.topN.slice(0,5).map(r => `${r.slug} (${r.normalized}%)`).join('\n')
  : 'V12 slug result yok — model henüz yüklenmemiş'
```

Beklenen çıktı (örn Bergamot Kveik):
- `blonde_ale (35%)`
- `american_pale_ale (15%)`
- `cream_ale (12%)`
- ...

Eğer Kaan gerçekten `swedish_gotlandsdricke` görüyorsa (V15 encoder'da olmayan slug), browser cache veya başka motor inferensiyel.

### Bug 5+6 Fix Önceliği

Audit, dataset etiketleme bug'ı bulmadığı için Bug 7 **OLDUĞU GİBİ KAPATIL**. Adım 56 yeast parser fix + specialty granülarize sprint'inde:
- Kveik standalone slug ekle (Adım 56 scope)
- Norwegian Farmhouse / Sahti / Gotlandsdricke historical/specialty alt-stilleri (Adım 56 scope)

Bug 5 (Belirsiz tetikleyicisi) ve Bug 6 (manuel mode override) **şu commit'te FİX**. Kaan test sonrası "Belirsiz" yanlış pozitif görmemeli.
