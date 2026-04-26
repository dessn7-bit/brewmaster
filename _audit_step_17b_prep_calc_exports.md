# AUDIT STEP 17B-PREP — CALC() EXPORTS

**Tarih:** 2026-04-26
**Hedef dosya:** `Brewmaster_v2_79_10.html`
**Önceki adım:** 17A (commit 272564b)

---

## ÖNEMLİ DÜZELTME — 17A raporundaki yanlış bağlam

17A raporu, V2c builder ve V6 builder'ın "calc() içinde inline" olduğunu söylüyordu. **Bu yanlıştır.**

`function calc()` (satır 4488) gövdesinin tam aralığı **4488-4561** (74 satır). İçerik: yalnızca metrik hesabı (OG/FG/SRM/IBU/ABV, mash temp düzeltme, attenuation, ABV Balling formülü, katkı timing uyarıları). Top-level return (satır 4560):
```
return{og,ogHesap,ogKaynak,srm,ibu,maya,maya2,fg,fgHesap,fgKaynak,abv,topMalt,rk:srmR(srm),aromaUyari,_nfg};
```

Motor çağrıları (V2c satır 13299, V6 satır 13406), `__recipeV2` ve `__v6Features` builder'ları **`function rEditorGenel(...)` (satır 11460-14798)** içinde — yani UI render template'inde, calc()'tan ÇOK SONRA. 17A tablosundaki "13270-13298" ve "13350-13405" satır aralıkları doğru ama "calc() içinde" ifadesi yanlış; doğrusu **`rEditorGenel` içinde**.

Bu tespit 17B-PREP'in temel sorusunu (`window` exports calc()'tan mı?) doğrudan etkiliyor — aşağıdaki tüm bölümler önce calc() (4488-4561), sonra rEditorGenel (11460-14798) için ayrı listelenmiştir.

---

## 1. window.__* atamaları

### calc() içinde (satır 4488-4561)

| Satır | Özellik | Değer (raw) |
|------:|---------|-------------|
| — | — | **BULUNAMADI** (`awk 'NR>=4488 && NR<=4561 && /window\.__/'` 0 eşleşme) |

### rEditorGenel içinde (satır 11460-14798) — bonus, premise düzeltmesi için

| Satır | Özellik | Değer (raw) |
|------:|---------|-------------|
| 13306 | `window.__lastV2Result` | `{ eski: stil_tah, yeni: __top3V2, recipeObj: __recipeV2 }` |
| 13414 | `window.__lastV6Result` | `__v6Result` (V6 motor çıktısı: `{top1, top3, top5, _meta}`) |

---

## 2. window._bm* atamaları

### calc() içinde (satır 4488-4561)

| Satır | Özellik | Değer |
|------:|---------|-------|
| — | — | **BULUNAMADI** (`awk '... /window\._bm/'` 0 eşleşme) |

### rEditorGenel içinde (satır 11460-14798)

| Satır | Özellik | Değer |
|------:|---------|-------|
| — | — | **BULUNAMADI** |

---

## 3. window.* diğer atamalar

### calc() içinde (satır 4488-4561)

| Satır | Özellik | Değer |
|------:|---------|-------|
| — | — | **BULUNAMADI** (`awk '... /window\.[a-zA-Z_]+[[:space:]]*=/'` 0 eşleşme) |

### rEditorGenel içinde (satır 11460-14798) — bonus

| Satır | Özellik | Değer (raw) |
|------:|---------|-------------|
| 13498 | `window._lastStilTah` | `stil_tah` (lokal değişken — manuel override sonrası nihai stil etiketi: BJCP_ad veya slug fallback) |
| 13499 | `window._lastAltStil` | `alt_stil` (lokal değişken — alt-stil önerisi, varsa) |

---

## 4. calc() return değer(ler)i

calc() gövdesi (4488-4561) içindeki `return` ifadeleri:

| Satır | İç closure mu? | Raw kod |
|------:|----------------|---------|
| 4502 | EVET (`_atuAgrlk` arrow body) | `function _atuAgrlk(a){ return (a[0]*2 + a[1]) / 3; }` |
| 4504 | EVET (`reduce` callback) | `return s+((kk&&kk.attenBoost)?kk.attenBoost:0);` |
| 4542 | EVET (`reduce` callback) | `return (!ml||ml.g==="Şeker"||m.id==="rice")?s:s+m.kg;` |
| 4547 | EVET (forEach erken çıkış) | `if(!kat)return;` |
| 4550 | EVET (forEach erken çıkış) | `if(!_inBoil||k.dk==null)return;` |
| **4560** | **HAYIR — TOP-LEVEL** | `return{og,ogHesap,ogKaynak,srm,ibu,maya,maya2,fg,fgHesap,fgKaynak,abv,topMalt,rk:srmR(srm),aromaUyari,_nfg};` |

**calc()'in dış-dünyaya verdiği tek şey** — satır 4560'taki 15-alanlı return objesi (15 alan: `og, ogHesap, ogKaynak, srm, ibu, maya, maya2, fg, fgHesap, fgKaynak, abv, topMalt, rk, aromaUyari, _nfg`). Motor çıktısı / stil tahmini / V2c veya V6 sonucu **YOK**.

---

## 5. DOM / render side effect

### calc() içinde (satır 4488-4561)

**Net cevap: YOK.**

Grep sonuçları (`awk 'NR>=4488 && NR<=4561 && /(document\.|innerHTML|render\(|getElementById)/'`): **0 eşleşme**.

calc() saf hesaplama fonksiyonu — DOM dokunmuyor, render tetiklemiyor, S mutate etmiyor. Side effect olarak tek görünebilen şey: dış scope'taki `MAYALAR.find()`, `MALTLAR.find()`, `KATKILAR.find()` gibi tablo lookup'ları (read-only).

### rEditorGenel içinde (satır 11460-14798) — harness için kritik

DOM-pattern grep'lerinde (`document.|innerHTML|render(|getElementById|setTimeout`): **0 eşleşme** (kendisi DOM yapmıyor; HTML string üretiyor).

**Ama:** rEditorGenel çağrıldığında **`S.stilTah = stil_tah` (satır 13423)** yazıyor — yani S mutate ediyor. Bu, harness için bir göz önünde tutulmalı: arka arkaya farklı reçeteler için rEditorGenel çağrılırsa S.stilTah üzerine yazılır.

Ek: rEditorGenel sonucu HTML string — `render()` tarafından DOM'a inject edilir. Standalone `rEditorGenel(...)` çağrısı **DOM'u değiştirmez** (sadece string döner ve global state'e (window + S) yazar).

---

## 6. Motor çıktılarının nereye gittiği

### V2c sonucu — `__top3V2`

- **Lokal değişken (rEditorGenel scope):** `const __top3V2 = window.BM_ENGINE.findBestMatches(__recipeV2, 5);` — satır **13299**.
- **Outer scope sızıntı:** `__top3V2_engine = __top3V2;` — satır **13300** (rEditorGenel'in dış lokal scope'ta tanımlı `var __top3V2_engine = null;` — satır 13265).
- **window export:** `window.__lastV2Result = { eski: stil_tah, yeni: __top3V2, recipeObj: __recipeV2 };` — satır **13306**. ← Harness için kritik.

### V5 sonucu

- **Çağrı YOK** (re-grep: `awk 'NR>=11460 && NR<=14798 && /BM_ENGINE/'` sadece V2c (13268, 13299) ve V6 (13348, 13406) eşleşmesi verdi). 17A'nın "V5 calc/rEditorGenel'de çağrılmıyor" bulgusu **doğrulandı**. Adım 16'daki ilave kanıt: `BM_ENGINE_V5\.` regex'i tüm dosyada sadece tanım (781) + yorum (532) + console.log (789) eşleşmesi veriyordu.
- **Harness V5 için window export bekleyemez** — V5 hiç çağrılmadığı için window'a hiçbir şey yazmıyor. V5 sonucunu almak için harness motoru direkt çağırmalı: `BM_ENGINE_V5.classifyMulti(__recipeV2, {k:5})`.

### V6 sonucu — `__v6Result`

- **Lokal değişken:** `var __v6Result = window.BM_ENGINE_V6_FINAL.classifyMulti(__v6Features, { k: 5 });` — satır **13406**.
- **Outer scope sızıntıları:**
  - `__top3V6_engine = __v6Result.top3.map(...)` — satır 13407 (`var __top3V6_engine = null;` satır 13335).
  - `__v6_meta = __v6Result._meta;` — satır 13410 (`var __v6_meta = null;` satır 13336).
- **window export:** `window.__lastV6Result = __v6Result;` — satır **13414**. ← Harness için kritik.
- **S export:** `S.stilTah = stil_tah;` — satır **13423** (V6 top-1 + V2c manuel override sonrası nihai etiket; her render'da S.stilTah yazılıyor).

### Ek window exports (motor değil ama stil ekseni)

- `window._lastStilTah = stil_tah;` — satır 13498 (manuel override + V6 fuzzy mapping sonrası BJCP_ad).
- `window._lastAltStil = alt_stil;` — satır 13499 (alt-stil etiketi — varsa).

---

## 7. Harness için sonuç

### Kullanıcının orijinal hipotezi:
> "calc() motor input/output'larını window'a bırakıyorsa, harness hiç builder kopyalamadan, sadece S = recipe; calc(); diyerek sonuçları yakalayabilir."

### Cevap: **HAYIR** — bu strateji çalışmaz.

**Gerekçe:** calc() (4488-4561) saf metrik hesabı yapıyor. Motor çağrıları, `__recipeV2`, `__v6Features` builder'ları ve tüm `window.__last*` exports **`rEditorGenel` (11460-14798)** içinde. `S = recipe; calc();` çağrısı:
- ✅ OG/FG/IBU/SRM/ABV metrik objesi döndürür (15-alanlı return).
- ❌ V2c motorunu çağırmaz → `window.__lastV2Result` güncellenmez.
- ❌ V6 motorunu çağırmaz → `window.__lastV6Result` güncellenmez.
- ❌ V5 hiçbir yerde çağrılmıyor → harness her durumda V5'i kendi çağırmalı.

### Cevap (genişletilmiş): **KISMEN ÇALIŞIR — ama calc() değil, rEditorGenel kullanılırsa.**

Harness için 3 reel seçenek:

#### Opsiyon A — `S = recipe; calc-sonuc = calc(); rEditorGenel(...calc-sonuc); window.__lastV2Result + window.__lastV6Result`
- **Artı:** Builder kopyalama gerekmez. UI'nin tam çağrı yolu kullanılır → V2c+V6 sonuçları doğal şekilde window'a düşer.
- **Eksi 1:** rEditorGenel çağırması için ona arg geçmek gerekiyor — imzası `(og, ogKaynak, srm, ibu, maya, fg, fgKaynak, abv, rk, uy)` (10 arg, satır 11460). Hepsini calc() return'ünden türetip uy=`'' (boş)` verilebilir.
- **Eksi 2:** rEditorGenel HTML string döner — kullanılmıyor (atılır), sorun değil. DOM dokunmaz.
- **Eksi 3:** rEditorGenel her çağrıda `S.stilTah = stil_tah` yazıyor → S mutate. Her reçete iterasyonu öncesi S'i tamamen reset etmek gerekir (`S = JSON.parse(JSON.stringify(recipe))`).
- **Eksi 4:** V5 yine yok — harness V5'i ayrıca çağırmalı.
- **Eksi 5:** rEditorGenel ÇOK büyük (3338 satır içerik üretiyor) — performans yükü ciddi (her reçete için tüm UI render compute koşar, sadece motor çağrılarından çok daha pahalı).

#### Opsiyon B — Builder bloklarını standalone fonksiyon olarak harness'a kopyala
- **Artı:** Sadece motor çağrı bloklarını koşar — performans yüksek.
- **Eksi:** Builder'lar inline ve `S` + calc() lokalleri + `_pctOf`/`_hasKatki`/`_hasFiltrasyon`/`_toplamMaltKg`/`_mayaTip`/`MAYALAR`/`MALTLAR`/`KATKILAR` gibi onlarca dependency'e bağlı (17A §V2c bağımlılık listesi). Doğru kopyalama için 100+ satır + 5+ helper. Bug riski Adım 17A'da işaretlenmişti — hâlâ geçerli.

#### Opsiyon C — `__top3V2_engine` / `__top3V6_engine` outer scope ifşası kullan
- Bu değişkenler `rEditorGenel` içinde `var` ile tanımlı (satır 13265, 13335), sadece kendi scope'unda görünür → dışarıdan erişilemez.
- **Kullanılamaz.** Sadece window.__lastV2Result.yeni ve window.__lastV6Result.top3 dış erişim için.

### Önerilen yol — A (rEditorGenel köprüsü)

Performans dezavantajına rağmen Opsiyon A en az hata riski. Pseudocode:
```
for each recipe in KR:
  S = JSON.parse(JSON.stringify(recipe))   // izole et
  const c = calc()                         // og/fg/ibu/srm/abv hesapla
  rEditorGenel(c.og, c.ogKaynak, c.srm, c.ibu, c.maya, c.fg, c.fgKaynak, c.abv, c.rk, '')
  // window.__lastV2Result.yeni = V2c top-5 array
  // window.__lastV6Result.top3 = V6 top-3 array
  // V5 manuel:
  const v5 = window.BM_ENGINE_V5.classifyMulti(window.__lastV2Result.recipeObj, {k:5})
  // (recipeObj __lastV2Result içinde — Adım 17A §V2c builder DIRTY problemini bypass ediyor)
```
**Önemli yan-bonus:** `window.__lastV2Result.recipeObj = __recipeV2` ifşası (satır 13306), V5 için ayrı builder kopyalama ihtiyacını da ortadan kaldırıyor — V2c builder'ın çıktısını harness yeniden kullanabilir.

### Açık riskler
- Opsiyon A'nın performans yükü (1000+ reçete × tam UI render compute) — sınırı belirsiz, deneyle ölçülmeli.
- rEditorGenel'in `S.stilTah` yazımı, manuel override (`if(S.stil && BJCP[S.stil]) stil_tah=S.stil`) ile birleşince — reçetede S.stil dolu varsa motor çıktısı override ediliyor, yani window.__lastV6Result yine motor sonucu içerir AMA window._lastStilTah manuel etiketle dönüyor. Harness top-1 değerini __lastV6Result.top1.slug'tan almalı (override öncesi), `_lastStilTah`'tan değil.
- Dosyada başka render path varsa (reçete listesi, doktor kartı gibi), aynı motor çağrılarını ek yerlerde yapıyor olabilir — harness'ın iterasyonu sırasında window.__last* tek yerden değişir ama doğrulama önerilir.

---

**Adım 17B-PREP bitti. Adım 17B'ye geçilmedi — DUR.**
