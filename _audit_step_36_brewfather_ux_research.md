# AUDIT STEP 36 TRACK B — BREWFATHER UX/MEKANİK ARAŞTIRMA

**Tarih:** 2026-04-26
**Mod:** Otonom + Adım 32 + Adım 35 schema findings
**Kaynak:** docs.brewfather.app + recipe schema (Adım 35'te `_v2/recipes/:id` detail) + Adım 32 feature inventory
**Sonuç:** Brewfather'ın 8 değerli UX/mekanik feature'ı identifiye edildi. V8+ roadmap için top 5 öncelik sırası verildi. Brewmaster'ın 4 net diferansiyatörü teyit.

---

## B1 — Recipe schema'dan derinlemesine feature inventory

Adım 35'te Kaan'ın default sample reçetesinin **60+ field'lık** detail response'u alındı. Aşağıdaki feature'lar bu schema'dan çıkarıldı:

### water object — DETAYLI mineral profile
Brewmaster'da `S.suMineralleri` array (id, miktar gram). Brewfather'da **per-recipe water object**:

    water: {
      mashWaterAmount, spargeWaterAmount, totalWater,
      mashRetention, evaporationRate, boilOff,
      sourceTargetDiff: {ca, mg, na, cl, so4, hco3},
      sourceProfile: {name, ca, mg, na, cl, so4, hco3, alkalinity, ph, residualAlkalinity, hardness, sulfateChlorideRatio},
      targetProfile: {...},
      mashAdjustments: [{ingredient, amount, ...}],
      spargeAdjustments: [{...}],
      acidPhAdjustment, totalGypsum, totalCalcium, ...
    }

**Anahtar farklar:**
- Source vs Target dual profile (Brewmaster: tek)
- Mash vs Sparge ayrı su additions
- Otomatik dilution oranı (RO + tap su karışımı)
- 6 mineral + alkalinity + pH + residualAlkalinity hesabı (Brewmaster: 6 mineral var, residualAlkalinity hesabı pH tahmin için kullanılıyor)

### mash object — multi-step
Brewmaster'da `S.mashSc` (tek sıcaklık), `S.mashDk` (süre), `S.mashAdimlar` (boş array, kullanılmıyor).

Brewfather:

    mash: {
      name: "BIAB Single Infusion",
      steps: [
        {name: "Saccharification", type: "Infusion", stepTemp: 67, stepTime: 60, rampTime: 0, infuseAmount: 25.0, descriptionType: "Infusion"},
        {name: "Mash Out", type: "Temperature", stepTemp: 78, stepTime: 10, rampTime: 5}
      ]
    }

**Multi-step:** beta amylase rest (62°C) + saccharification (67°C) + mash-out (78°C) gibi step'ler. Brewmaster'da `S.mashAdimlar` yapısı VAR (BOS satır 3369) ama UI ve calc()'ta KULLANILMIYOR.

### fermentation object — Primary/Secondary/Conditioning
Brewfather:

    fermentation: {
      name: "Single Stage 18°C",
      steps: [
        {type: "Primary", stepTemp: 18, stepTime: 14, rampTime: 0, ...},
        {type: "Secondary", stepTemp: 4, stepTime: 7, ...},
        {type: "Conditioning", stepTemp: 12, stepTime: 14}
      ]
    }

Brewmaster'da: `S.primTemp`, `S.primVol` priming için. Fermentation step'leri YOK — `brewLog` manuel kayıt.

### styleConformity — agregat skor
Brewfather her reçete için style uyum 0-1 skoru + per-axis breakdown:

    styleConformity: 0.875,
    styleAbv: true, styleBuGu: true, styleColor: true,
    styleFg: true, styleIbu: true, styleOg: true, styleRbr: true

Brewmaster: BJCP göstergesi `✅⚠️` per-axis var (rEditorGenel `_inOG _inIBU` vb.) ama **agregat scalar conformity hesabı YOK**.

### miscs (additives/katki)
Brewfather: `miscs[]` separate from hops/yeasts. Maya besin, irish moss, gypsum, lactic acid, vs.
Brewmaster: `S.katkilar[]` benzer ama "boil/mash/whirlpool/fermentor" zaman ayrımı daha az detaylı.

### Yeast pitch + starter calc
Recipe schema yeast object'inde:

    yeasts[]: {
      name, type, attenuation, minTemp, maxTemp,
      flocculation, cellsPerPackage, productId,
      starter: {volume, gravity, cellGrowth, ...}
    }

Brewmaster'da: `S.mayaId`, `S.maya2Id`, `S.mayaYasAy`. Pitch rate ve starter calc YOK — kullanıcı manuel hesaplıyor.

### batch object (separate API)
`/v2/batches` endpoint'i — brewing day data:

    batch: {
      recipeId, brewDate, fermentationStartDate, packagingDate,
      measuredOg, measuredFg, measuredAbv, attenuation, efficiency,
      preBoilGravity, postBoilGravity,
      readings: [{type, value, time, comment}],
      taste: {appearance, aroma, taste, mouthfeel, overall, totalScore},
      cost: {grain, hop, yeast, misc, total}
    }

Brewmaster'da: `S.brewLog[]` manuel kayıt. Batch tracking ayrı bir varlık değil.

---

## B2 — Brewmaster vs Brewfather Karşılaştırma Matrisi

| # | Feature | Brewfather | Brewmaster | V8 Değer |
|---|---|---|---|---:|
| 1 | **Source vs Target water profile + dilution** | ✅ Detaylı dual + auto dilution | ⚠️ Sadece target | **Yüksek** |
| 2 | **Yeast pitch + starter calculator** | ✅ Cells/pkg + viability + starter vol | ❌ Yok | **Yüksek** |
| 3 | **Multi-step mash** | ✅ Saccharification + Mash-out + ramp | ⚠️ Schema var (mashAdimlar), UI yok | Orta |
| 4 | **Fermentation step profile** | ✅ Primary/Secondary/Conditioning | ❌ Sadece primTemp | Orta |
| 5 | **Brew day wizard** | ✅ Step-by-step timer + checklist | ❌ brewLog manuel | **Yüksek** |
| 6 | **styleConformity scalar** | ✅ Agregat 0-1 skor | ⚠️ Per-axis var, scalar yok | Düşük (kolay ek) |
| 7 | **brewedCount + rating** | ✅ Recipe history sayacı | ❌ Yok | Orta |
| 8 | **searchTags + folderRefs** | ✅ Multi-tag + hiyerarşi | ⚠️ Tek klasor field | Düşük |
| 9 | **Cost analysis** | ✅ Premium | ❌ STOK var, fiyat yok | Düşük |
| 10 | **Tilt/iSpindel integration** | ✅ Multiple devices | ❌ | Düşük (BLE Web API zor) |
| 11 | **BeerXML import** | ✅ | ❌ Sadece export | Düşük |
| 12 | **Style auto-suggest (ML)** | ❌ Sadece statik range | ✅ V6 motor | Brewmaster avantaj |
| 13 | **Türkçe BJCP UI** | ❌ İngilizce only | ⚠️ Eksik | Brewmaster fırsat |
| 14 | **Türkiye-spesifik malzeme** | ❌ Yok | ✅ BB markası, yerel hop | Brewmaster avantaj |
| 15 | **Inventory free tier** | ⚠️ Premium | ✅ Free | Brewmaster avantaj |
| 16 | **PWA offline** | ⚠️ Web-first | ✅ PWA, offline-first | Brewmaster avantaj |
| 17 | **Firebase sync free** | ⚠️ Premium API | ✅ Free (kullanıcı kendi Firebase) | Brewmaster avantaj |

---

## B3 — V8+ Top 5 Öncelik

### Top 1: Source vs Target Water Profile + Auto-Dilution
**Brewfather:** Source water (musluk, RO, mineral) → Target style profile → Otomatik dilution oranı + mineral addition önerisi (CaCO3, gypsum, CaCl2, vs.)

**Brewmaster mevcut:** `S.suMineralleri` array (target ekleme), `mineralOnerisiHesapla` fonksiyonu (eksik mineral g önerisi). Source profile yok.

**Implementation:**
- Yeni `S.suSource` field — ham musluk suyu (ca/mg/na/cl/so4/hco3 ppm)
- Su sekmesinde: source girilir → target style'a göre delta hesaplanır → dilution oranı (RO%) + mineral additions
- Tahmini efor: **8-12 saat** (UI 2 sekme, formül var, bağlam mevcut)
- UX taslağı: "Musluk suyumda Ca=80, SO4=30. American IPA için hedef Ca=100, SO4=200. Öneri: 30% RO seyret + 5g gypsum."

### Top 2: Yeast Pitch + Starter Calculator
**Brewfather:** OG + batch_size + maya viability (yaş+tarih) + maya tipi → ideal cell count + starter volume

**Brewmaster mevcut:** `S.mayaYasAy` (yaş ay olarak) var ama hesaplama yok. Pitch rate guideline'ı UI'da yok.

**Implementation:**
- Maya sekmesine "Pitch Calc" alt-paneli
- Formül: cells_target = OG_million * batch_L * pitch_rate (0.75 ale, 1.5 lager)
- viability = max(20, 100 - yas_ay * 21) (Brewer's Friend formülü)
- Eğer yetersiz → starter volume önerisi
- Tahmini efor: **4-6 saat** (formül net, UI küçük)
- UX taslağı: "OG 1.065, 11L batch, 1 paket WLP001 (3 ay, %37 viability) → 250 mL starter öneri."

### Top 3: Brew Day Wizard
**Brewfather:** Brew status workflow → "Bugün brew day" notification → adım-adım timer (mash 60dk → boil → fermentation transfer)

**Brewmaster mevcut:** brewLog manuel. "Yapımda" durumu var ama wizard UI yok.

**Implementation:**
- Yeni "Brew Day" ekranı (S.durum='yapimda' olduğunda primary CTA)
- Step list: Mash in (timer) → Sparge → Boil 60dk → Hop additions (timer) → Cool → Pitch → Fermentor
- Her step: önceki ölçümler (S.brewLog otomatik append)
- Notification API ile timer
- Tahmini efor: **16-24 saat** (yeni ekran, UX iş yükü, notification API)
- UX taslağı: Brew day sabahı app açar, Wizard başlar. Her step tamamlanınca "✓" + log entry.

### Top 4: Multi-Step Mash UI
**Brewfather:** Saccharification + Mash-out + ek step'ler, infusion vs decoction ayrımı

**Brewmaster mevcut:** `S.mashAdimlar` array (BOS'ta tanımlı) AMA UI'da YOK, calc()'ta tek `S.mashSc` kullanılıyor.

**Implementation:**
- Mash sekmesinde "Multi-step" toggle
- Açıkken: step list (sıcaklık + süre + ramp), "+ adım ekle" butonu
- Strike water hesabı multi-step'i destekleyecek şekilde güncellenmeli
- Tahmini efor: **8-12 saat** (mevcut schema kullan, UI ekle, hesap güncelle)
- UX taslağı: Single step default. "Çoklu mash adımı" toggle açılınca: Saccharif 67°C 60dk + Mash-out 78°C 10dk standart.

### Top 5: brewedCount + Rating + Favorites
**Brewfather:** brewedCount auto-increment + 5-star rating + favorite flag → recipe list'te öne çıkar

**Brewmaster mevcut:** S.durum='arsiv' var (Adım 15 audit) ama "kaç kez yapıldı" sayacı yok.

**Implementation:**
- Yeni S field: `brewCount` (her yapımda ++), `rating` (1-5), `isFavorite` (bool)
- KR list'te badge: ⭐ ile favorite, 🍺 ile brewed count
- Sort options: "Favorites first", "Most brewed", "Highest rated"
- Tahmini efor: **6-10 saat** (schema güncelleme + UI sort + badge)

---

## B4 — Brewmaster Diferansiyatörleri (KORUNMALI)

### 1. ⭐ ML-based style prediction (V6/V7)
- Brewfather sadece statik BJCP range gösterir
- Brewmaster V6 KNN/RF + V7 (geliştirilmekte) ML tahmin
- **Bu Brewmaster'ın temel diferansiyatörü** — V7 sprint'i devam etmeli (Adım 33-34 sonuçları + dataset toplama)

### 2. ⭐ Türkçe + Türkiye-spesifik
- Brewfather: İngilizce-only platform
- Brewmaster: tam Türkçe UI + BB markası mayalar (bb_abbaye, bb_belc serisi) + yerel hop'lar

### 3. ⭐ PWA offline-first + Firebase sync free
- Brewfather: web-first, offline modu sınırlı
- Brewmaster: PWA, IndexedDB backup, kullanıcı kendi Firebase ücretsiz
- Brewfather Premium API erişim için aylık fee

### 4. ⭐ Inventory yönetimi free tier
- Brewfather: Premium ($60/yıl) inventory için
- Brewmaster: STOK ücretsiz, IDB backup, sync

### 5. ⭐ Single-page HTML (kolay deployment)
- Brewfather: tam web app, server gerekli
- Brewmaster: tek HTML dosya, Netlify deploy, zero infra

---

## B5 — UX patterns Brewmaster için ders

### Calculation transparency
- Brewfather: hover'da formül gösterir, source pattern net
- Brewmaster: zaten transparent (yardım butonları stilttah, prim, OG/FG hesabı için)
- ✅ Yapılıyor

### Color coding & badges
- Brewfather: styleConformity ✅⚠️ per-axis, "in style" green, "out of style" red, badge sistemi
- Brewmaster: BJCP göstergesi ✅⚠️ var ama agregat skor yok
- **Eksik:** "Conformity 7/10" gibi scalar badge ekle

### Mobile-first
- Brewfather: responsive web app, mobil özel layout sınırlı
- Brewmaster: PWA, mobil-first design ile başlamış
- ✅ Brewmaster önde

### Async UI states
- Brewfather: loading spinners, async fetch
- Brewmaster: çoğu sync (local state), Firebase sync için "🟢 Senkron edildi" badge
- ✅ Yeterli

---

## B6 — Sıradaki adım önerisi (V7 + V8 paralel)

### V7 (motor düzeltme) sprint
- Adım 34 sonuçları: top-1 36% (V6 74%'ünden kötü)
- Adım 35: Brewfather'dan veri yok
- **Karar:** V7 sprint pause veya iyileştirme döngüsü?
- Önerim: **iyileştirme döngüsü** — Adım 34 raporundaki 3 fix uygula:
  1. n<5 stiller `bjcp_main_category` merge → 73 → 14 class
  2. Regularization (max_depth=3, n_estimators=100, reg_lambda=1)
  3. Veri toplama Adım 37'ye ertele (TBD kanal)

### V8 (UX modernization) sprint
- Adım 36 raporundaki top 5 feature
- Top 1 (water dual profile) en yüksek etki/efor — başla
- Top 2 (yeast pitch) küçük, hızlı kazanım
- Top 3 (brew day wizard) en büyük UX değer ama 16-24 saat

### Paralel mi sıralı mı?
- V7 motor düzeltme: ML iş, Brewmaster repo'da Python/Node
- V8 UX feature'lar: Brewmaster_v2_79_10.html UI iş, JS
- **İki sprint farklı domainde** → paralel çalışılabilir, çakışma düşük
- Önerim: **V8 öncelik** çünkü Adım 35-36 V7 için veri çıkmadı, V8 net iş yapılabilir

### Adım 37 hedefi (önerilen)
**Türkçe BJCP isim eklenmesi (AI çeviri ile)** — `__BM_DEFS`'teki 248 İngilizce key için Türkçe ad + main_category. Brewmaster UI'da BJCP göstergesi Türkçe görünür.
- Tahmini efor: 2-3 saat (Claude API translation + manuel review)
- Risk: düşük
- Kullanıcı değeri: yüksek (UI tutarlılığı)

### Adım 38+ hedefi
V8 feature roll-out: Top 1 → Top 2 → Top 3 sırayla.

---

## YASAKLAR — uyumlu

✅ Reçete fetch yapılmadı (Adım 35'te yapıldı, 1 sample, hesap boş)
✅ API key/username **HİÇ YERDE** raporlanmadı, env-only kullanıldı
✅ HTML değişmedi
