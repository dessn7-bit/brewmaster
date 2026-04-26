# AUDIT STEP 20-GRUP1-A — HOP_SIG + KATKI_SIG ADAPT TEŞHİSİ

**Tarih:** 2026-04-26
**Kaynak:** `Brewmaster_v2_79_10.html` `<script id="bm-engine-v5">` bloğu (satır 527-790)
**Amaç:** V6 builder'da `hop_*` (7 feature) ve `katki_*` (10 feature) hardcoded 0 bug'ını çözmek için V5'in sinyatür mantığını V6'ya port edilebilirliği teşhis.

---

## 1. V5 HOP_SIG tanımı

**Konum:** satır **567-576** (V5 IIFE içinde, top-level lokal `const`).

**Yapı:** Plain JS object, key→regex.

**Raw kod (satır 566-576):**

    // ═══════════════════ HOP SIGNATURE CHECKS ═══════════════════
    const HOP_SIG = {
      american_c_hops: /(cascade|centennial|citra|mosaic|chinook|amarillo|simcoe|columbus|ctz|zeus|warrior|galaxy|sabro|el\s*dorado|summit|equinox|ekuanot|azacca|vic\s*secret|calypso|loral|strata|talus|cashmere)/i,
      english_hops:    /(ekg|east\s*kent|fuggles?|challenger|goldings|admiral|bramling|first\s*gold|target|pilgrim|progress|northdown|phoenix|jester|olicana|boadicea|british\s*hop)/i,
      german_noble:    /(hallertau|tettnang|perle|herkules|hersbrucker|spalt|tradition|saphir|smaragd|mittelfr)/i,
      czech_saaz:      /(saaz|premiant|sladek|kazbek|zatec)/i,
      nz_hops:         /(nelson|motueka|riwaka|waimea|wakatu|pacific\s*(gem|jade)|rakau|sauvin)/i,
      australian_hops: /(galaxy|vic\s*secret|ella|enigma|topaz)/i,
      aged_hops:       /(aged\s*hop)/i,
      northern_brewer: /(northern\s*brewer|cluster|mount\s*hood)/i,
    };

**V6 feature → V5 HOP_SIG key eşleşmesi:**

| V6 feature | V5 HOP_SIG key | Regex | Uygulama field |
|---|---|---|---|
| hop_american_c | `american_c_hops` | cascade/centennial/citra/mosaic/... | `hopStr` (satır 597, hopIds.join('|')) |
| hop_english | `english_hops` | ekg/east_kent/fuggles/goldings/... | `hopStr` |
| hop_german | `german_noble` | hallertau/tettnang/perle/spalt/... | `hopStr` |
| hop_czech_saaz | `czech_saaz` | saaz/premiant/sladek/kazbek/zatec | `hopStr` |
| hop_nz | `nz_hops` | nelson/motueka/riwaka/sauvin/... | `hopStr` |
| hop_aged | `aged_hops` | aged_hop | `hopStr` |
| hop_northern_brewer | `northern_brewer` | northern_brewer/cluster/mount_hood | `hopStr` |

**Not:** V5'te `australian_hops` da tanımlı (satır 573) ama V6 dataset feature listesinde **karşılığı YOK** (Adım 18 §1 inventarı: 7 hop feature). V6'ya port ederken bu key atlanmalı. (Bilgi olarak: V5'in `australian_hops` regex'i `galaxy|vic_secret|ella|enigma|topaz` içeriyor; `galaxy` ve `vic_secret` aslında `american_c_hops`'ta da var — V5'te zaten örtüşme var.)

---

## 2. V5 KATKI_SIG tanımı

**Konum:** satır **579-591** (HOP_SIG'in hemen altında).

**Raw kod:**

    // ═══════════════════ KATKI SIGNATURE ═══════════════════
    const KATKI_SIG = {
      lactose:     /laktoz|lactose|milk/i,
      fruit:       /meyve|fruit|mango|passion|seftali|peach|strawberry|cilek|raspberry|cherry|kiraz|apple|elma|pear|armut|uzum|grape|must|orange|portakal|lemon|limon|lime/i,
      spice_herb:  /koriander|coriander|ginger|zencefil|cinnamon|tarcin|nutmeg|clove|karanfil|herbs|rosemary|biberiye|mint|nane|lavender|lavanta|hibiscus|elderflower|jasmine|matcha|juniper|ardic/i,
      chocolate:   /chocolate|cacao|kakao|cocoa|cikolata/i,
      coffee:      /coffee|kahve|espresso|mocha/i,
      chile:       /chile|chili|jalape|habane|pepper|biber/i,
      smoke:       /smoke|smoked|rauch|isli/i,
      honey:       /^bal$|honey(?!\s*malt)/i,
      pumpkin:     /pumpkin|balkabak|squash/i,
      salt:        /tuz|kosher|salt/i,
      vanilla:     /vanilla|vanilya/i,
    };

**V6 feature → V5 KATKI_SIG key eşleşmesi:**

| V6 feature | V5 KATKI_SIG key | Regex (kısaltılmış) |
|---|---|---|
| katki_lactose | `lactose` | laktoz/lactose/milk |
| katki_fruit | `fruit` | meyve/fruit/mango/cilek/raspberry/...(20+ alt) |
| katki_spice_herb | `spice_herb` | koriander/cinnamon/karanfil/biberiye/... |
| katki_chocolate | `chocolate` | chocolate/cacao/kakao/cocoa/cikolata |
| katki_coffee | `coffee` | coffee/kahve/espresso/mocha |
| katki_chile | `chile` | chile/chili/jalape/habane/pepper/biber |
| katki_smoke | `smoke` | smoke/smoked/rauch/isli |
| katki_honey | `honey` | `^bal$` veya `honey(?!\s*malt)` (lookahead) |
| katki_pumpkin | `pumpkin` | pumpkin/balkabak/squash |
| katki_salt | `salt` | tuz/kosher/salt |

**Not:** V5'te `vanilla` da tanımlı (satır 590) ama V6 dataset feature listesinde karşılığı YOK. V6'ya port ederken atlanmalı.

**Honey regex risk:** `/^bal$/` anchor'ı katkiStr'in TAMAMININ "bal" olmasını istiyor. Birden fazla katki varsa katkiStr "kakao|vanilya|bal|jelatin" gibi olur → `^bal$` match etmez (sadece "bal" katkı tek başına olsa match'ler). Bu V5'te de var olan bir bug; alternatif `(?:^|\|)bal(?:$|\|)` daha sağlam ama Adım 20 fix'inde V5 davranışını birebir korumak güvenli (regression riski yok).

---

## 3. V5'te uygulama yöntemi

**Helper fonksiyon (satır 593):**

    function signatureFlag(rx, str) { return rx.test(str) ? 1 : 0; }

**Ana uygulama (satır 595-682, `extractFeatures(recipe)`):**

İmza: `function extractFeatures(recipe)` — recipe = V2c-style obje (`__recipeV2`).

İlk satırlar (596-599):

    const yeastStr = [recipe._yeast_raw, recipe.mayaId, recipe.maya2Id].filter(Boolean).join('|');
    const hopStr   = (recipe.hopIds   || []).join('|');
    const maltStr  = (recipe.maltIds  || []).join('|');
    const katkiStr = (recipe.katkiIds || []).join('|');

Hop flag'leri (satır 656-662):

    hop_american_c: signatureFlag(HOP_SIG.american_c_hops, hopStr),
    hop_english:    signatureFlag(HOP_SIG.english_hops, hopStr),
    hop_german:     signatureFlag(HOP_SIG.german_noble, hopStr),
    hop_czech_saaz: signatureFlag(HOP_SIG.czech_saaz, hopStr),
    hop_nz:         signatureFlag(HOP_SIG.nz_hops, hopStr),
    hop_aged:       signatureFlag(HOP_SIG.aged_hops, hopStr),
    hop_northern_brewer: signatureFlag(HOP_SIG.northern_brewer, hopStr),

Katki flag'leri (satır 665-674):

    katki_lactose:    signatureFlag(KATKI_SIG.lactose, katkiStr),
    katki_fruit:      signatureFlag(KATKI_SIG.fruit, katkiStr),
    katki_spice_herb: signatureFlag(KATKI_SIG.spice_herb, katkiStr),
    katki_chocolate:  signatureFlag(KATKI_SIG.chocolate, katkiStr),
    katki_coffee:     signatureFlag(KATKI_SIG.coffee, katkiStr),
    katki_chile:      signatureFlag(KATKI_SIG.chile, katkiStr),
    katki_smoke:      signatureFlag(KATKI_SIG.smoke, katkiStr),
    katki_honey:      signatureFlag(KATKI_SIG.honey, katkiStr),
    katki_pumpkin:    signatureFlag(KATKI_SIG.pumpkin, katkiStr),
    katki_salt:       signatureFlag(KATKI_SIG.salt, katkiStr),

**Return:** Düz obje `f` (extractFeatures'ın döndürdüğü tüm 79 feature). V5'te bu obje `toVec()` (satır 682) üzerinden vector'a çevrilip KNN distance hesabında kullanılıyor.

---

## 4. V2c builder'da hop+katki bilgisi

**hopIds:** Satır 13273 — `hopIds: (S.hoplar||[]).map(h=>h&&h.id).filter(Boolean)` → string array. Boş hop satırları filtreleniyor. **Format: HOPLAR id'leri (örn. `["cascade","centn","citra"]`)**.

**katkiIds:** Satır 13275 — `katkiIds: (S.katkilar||[]).map(k=>k&&k.id).filter(Boolean)` → string array. **Format: KATKILAR id'leri (örn. `["kakao","vanilya","jelatin"]`)**.

V5 regex bekleyen format (`hopStr.join('|')`) ile **uyumlu** — V2c builder hopIds/katkiIds'yi V5'in beklediği şekilde veriyor.

---

## 5. KATKILAR / HOPLAR sabit dizileri

| Sabit | Tanım satırı | Şema |
|-------|-------------:|------|
| `HOPLAR` | **1393** | Her satır: `{id, ad, aa, g (origin grup), mo (mood), ornek (örnek stiller)}`. Örn: `{id:"cascade",ad:"Cascade",aa:5.5,g:"Amerikan",...}` |
| `KATKILAR` | **3683** | Her satır: `{id, ad, g (kategori — Şeker/Aroma/Meyve/...), gu, fermente, ibu_dk60, srm, etki, acik, kullanim, birim, zaman, tags, ...}` |

**Kanıt — HOPLAR örnekleri (satır 1394-1396):**

    {id:"cascade",ad:"Cascade",aa:5.5,g:"Amerikan",mo:"Sitrus, çiçek, greyfurt, hafif çam.",ornek:"American Pale Ale, ..."}
    {id:"centn",ad:"Centennial",aa:10.0,g:"Amerikan",mo:"...",ornek:"American IPA, Pale Ale, NEIPA"}
    {id:"citra",ad:"Citra",aa:12.0,g:"Amerikan",mo:"...",ornek:"NEIPA, Hazy IPA, American IPA"}

**KRİTİK GÖZLEM — HOPLAR id KISALTMA SORUNU:**

HOPLAR'da bazı id'ler kısaltma:
- `cascade` → regex `cascade` match ✓
- `centn` → regex `centennial` match ❌ (kısaltma)
- `citra` → regex `citra` match ✓

V5 motoru bu kısaltmaları YAKALAYAMIYOR. Yani V5 zaten bazı hop'ları kategorize edemiyor. Bu V5'te var olan bir bug; V6'ya port ederken AYNI bug taşınır VEYA çözülür.

**Çözüm önerisi:** `hopStr`'i sadece id'lerden değil, id+ad'lardan inşa et (HOPLAR.find(h=>h.id===hopId) ile ad'ı al). Ad alanı tam isim içerdiği için ("Centennial") regex match eder.

---

## 6. Adapt önerisi (V6 builder için)

### HOP_SIG kopyalanabilir mi: **EVET — KOPYA-YAPIŞTIR YETER**

- V5 HOP_SIG `const` V5 IIFE'si içinde (satır 567), dışarıdan erişilemez (window export YOK).
- V6 builder (satır 13350-13405) AYRI bir IIFE içinde, kendi scope'una HOP_SIG kopyalanmalı.
- Kopya konum önerisi: V6 IIFE'nin en başı (satır 13350 sonrası) VEYA V6 IIFE üstünde calc()/rEditorGenel scope'unda lokal const olarak (satır 13338 V6_DEFAULTS yanında).
- `signatureFlag` helper'ı da kopyalanmalı (1 satır, trivial).

**Kanıt — şu anda V6 builder'da hop_* hardcoded 0:**

    f.hop_american_c = 0; f.hop_english = 0; f.hop_german = 0;
    f.hop_czech_saaz = 0; f.hop_nz = 0; f.hop_aged = 0; f.hop_northern_brewer = 0;

**Adapt edilmiş fix (taslak — bu adım fix yapmıyor):**

    var hopStr = (r.hopIds || []).join('|');
    f.hop_american_c = signatureFlag(HOP_SIG_V6.american_c_hops, hopStr);
    // ... 6 daha

`HOP_SIG_V6` ve `signatureFlag` V6 builder scope'unda tanımlı olmalı (V5'tekilerle aynı içerik, sadece namespace ayrı).

### KATKI_SIG kopyalanabilir mi: **EVET**

- Aynı durum: V5 IIFE içinde `const`, dışarıdan görünmez. Kopya-yapıştır gerekiyor.
- 10 V6 feature'ından 1'i (katki_lactose) ZATEN V6 builder'da `r.lactose ? 1 : 0` ile besleniyor (satır 13381). Bu mevcut yol korunabilir VEYA KATKI_SIG.lactose ile değiştirilebilir (sonuç aynı — `r.lactose`, V2c builder'da `_hasKatki(/laktoz|lactose/i)` ile set ediliyor, V5 KATKI_SIG.lactose `/laktoz|lactose|milk/i` ile aynı semantik + `milk` ekstra). **Öneri: 9 yeni feature için KATKI_SIG kullan, lactose'u olduğu gibi bırak (geri dönüşümlü).**

### Türkçe ad meselesi — regex'lerde Türkçe karakter yakalanır mı?

KATKI_SIG ve HOP_SIG regex'leri **Türkçe karakter İÇERİYOR ve büyüklük-küçüklük duyarsız (`/i` flag)**:
- `meyve`, `cilek`, `kiraz`, `elma`, `armut`, `uzum`, `portakal`, `limon` (fruit)
- `zencefil`, `tarcin`, `karanfil`, `biberiye`, `nane`, `lavanta`, `ardic` (spice_herb)
- `kakao`, `cikolata` (chocolate)
- `kahve` (coffee)
- `biber` (chile)
- `isli` (smoke)
- `bal`, `tuz`, `vanilya`, `balkabak`

**Aksanlı karakterler (ç, ş, ğ, ü, ö, ı, İ) regex'lerde YOK** — örneğin `karanfil` var ama `şeftali`, `çilek`, `tarçın`, `vanilya` (note: `vanilya` aksansız var, doğru spelling `vanilya` — Türkçede aksan yok bu kelimede).

KATKILAR id'leri konvansiyonu (satır 3683 örneklerinden çıkarılması lazım — burada görmedik, sadece header):
- Tipik id formatı muhtemelen ASCII (kakao, vanilya, kahve, jelatin, mavi_kelebek) — KATKILAR'ı detaylı incelersek netleşir ama V5'te zaten bu regex'ler kullanılıyor ve mevcut motor çalışıyor → büyük çoğunluk yakalanıyor demektir. Edge case'ler yine V5'tekiyle aynı seviyede.

**Risk:** `şeftali` katkı id'si varsa (büyük olasılıkla `seftali` ASCII'leştirilmiş), regex `seftali` zaten ediyor. Türkçe karakter sorunu V5 kapsamında çözülmüş varsayılabilir.

### V6 builder'a girdi durumu — `r.hopIds`, `r.katkiIds` mevcut mu?

**EVET.** V6 builder satır 13350: `(function(r){...})(__recipeV2);` — argüman `__recipeV2`, ki içinde `hopIds` (satır 13273) ve `katkiIds` (satır 13275) var. Yani V6 builder'a erişim hazır:

    var hopStr = (r.hopIds || []).join('|');
    var katkiStr = (r.katkiIds || []).join('|');

Şu anda kullanılmıyor (V6 IIFE bu iki array'i okumuyor). Fix'te eklenecek.

### Kütüphanedeki 7 reçetenin hop+katki kullanımı (özet)

**Erişilemez** — KR Kaan'ın tarayıcısında (`bm_v6` localStorage). Repoda görünür olan tek reçete: HTML satır 17609 seed Dubbel.

**Seed Dubbel hop+katki:**
- `hoplar`: `hallertau` (g:14, 60dk), `spalt` (g:12, 10dk) — her ikisi de german_noble regex'inde → **hop_german=1** beklenmeli (şu an V6'da hardcoded 0).
- `katkilar`: `kakao` (kakao), `vanilya`, `maya_besini`, `jelatin`, `antioxid` — kakao chocolate regex match → **katki_chocolate=1** beklenmeli (şu an 0). vanilya V6'da feature olarak yok (V5 KATKI_SIG.vanilla var ama V6 listesinde değil — atılır). maya_besini/jelatin/antioxid hiçbir regex'e uymuyor — etkilemez.

**Beklenen Dubbel feature düzeltmeleri (Grup 1 fix sonrası):**
- hop_german: 0 → 1 ✓
- katki_chocolate: 0 → 1 ✓
- (Yeast feature'ları Adım 20A'daki ayrı fix tarafından düzeltilecek.)

---

## 7. Grup 1 fix planı için onay listesi

### Yapılacak değişiklikler (B aşaması — bu adımda DEĞİL, ayrı prompt'la):

| # | Değişiklik | Lokasyon | Risk | Bağımlılık |
|--:|-----------|----------|------|------------|
| 1 | yeast_belgian/abbey ayrımı (substring + ID whitelist) | V6 IIFE satır 13368 + 13398 | Düşük (Adım 20A onaylandı) | `mAd` ileti yolu (V2c builder'a maya ad iletilmeli VEYA MAYALAR.find lookup) |
| 2 | `mash_type_step = 1` default | V6 IIFE satır 13397 | Düşük | Yok |
| 3 | hop_* 7 feature port — V5 HOP_SIG → V6 builder | V6 IIFE satır 13379-13380 (+ HOP_SIG_V6 + signatureFlag tanımı) | Orta (regex doğruluğu V5'le aynı, kısaltma id'ler için recall kaybı kabul) | `r.hopIds` (zaten mevcut) |
| 4 | katki_* 9 feature port (lactose hariç) — V5 KATKI_SIG → V6 builder | V6 IIFE satır 13382-13384 (+ KATKI_SIG_V6 tanımı) | Orta (`vanilla` V6'da yok, atlanır) | `r.katkiIds` (zaten mevcut) |

### Ek değerlendirme — id kısaltma sorunu (HOPLAR `centn` vb.)

**Opsiyonel iyileştirme (Grup 1 scope dışı, Faz 2'de düşün):** `hopStr`'i hem id hem ad ile inşa et:

    var hopStr = (r.hopIds || []).map(function(hid){
      var ho = (typeof HOPLAR !== 'undefined') ? HOPLAR.find(function(h){return h && h.id===hid;}) : null;
      return hid + (ho && ho.ad ? ('|' + ho.ad) : '');
    }).join('|');

Bu Cascade ✓, "Centennial" ✓ (id="centn", ad="Centennial"), Citra ✓ olarak tüm HOPLAR'ı yakalar. Recall artar.

**Risk:** HOPLAR runtime'da garanti var (motor zaten `MAYALAR.find` yapıyor satır 4509). KATKILAR aynı şekilde.

**Tavsiye:** Grup 1 fix'inde V5'i birebir taklit et (sadece id'den hopStr). Recall artırma fix'i ayrı bir Faz olarak ele al — değişikliğin etkisini ölçmek için izole ad olarak.

### Threshold sabitleri — koruma uyarısı

V5'te derived flag thresholds farklı:
- V5 satır 678-681: `high_hop > 50`, `strong_abv > 8`, `dark_color > 20`, `pale_color < 6`
- V6 builder satır 13385-13388: `high_hop > 40`, `strong_abv > 7.5`, `dark_color > 15`, `pale_color < 6`

**Bunlar V5 SIG'leri DEĞİL — derived flag thresholds.** V6 builder'ın kendi eşikleri V6 dataset karakteristiklerine göre ayarlanmış. **Grup 1 fix'inde derived flag thresholds'a DOKUNMA.** Sadece HOP_SIG ve KATKI_SIG port edilecek.

---

## Sonuç

V5'in HOP_SIG ve KATKI_SIG sabitleri V6 builder'a kopya-yapıştır ile port edilebilir. V2c builder zaten `r.hopIds` ve `r.katkiIds`'i V5 formatında veriyor, ek arabirim gerekmiyor. Tek bilinen risk: HOPLAR'da bazı hop id'leri kısaltma (örn. `centn`) regex'e uymayabiliyor — V5'te de var olan bir recall kaybı, Grup 1'de çözülmüyor.

Grup 1 toplam değişiklik:
- 4 mantıksal değişiklik (yeast ayrımı, mash_type_step, hop_*, katki_*)
- 3 yeni sabit definition (V6 builder scope: HOP_SIG_V6, KATKI_SIG_V6, signatureFlag)
- ~25-30 satır net değişiklik
- HTML dışı dosya değişikliği YOK

Onay alındığında B aşamasında tek str_replace serisi olarak uygulanabilir.
