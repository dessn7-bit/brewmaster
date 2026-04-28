# Brewmaster Proje Notları

## Proje
Brewmaster, Türkçe bir ev üretimi (homebrewing) web uygulaması. Tek dosya: Brewmaster_v2_79_10.html (~2MB, ~17500 satır). PWA/APK olarak deploy ediliyor. Drive folder: 18sZbIP7ELOzkEQ-GQoXiHTAWFIEgTkR-.

## ÇOK ÖNEMLİ - Kullanıcı Kuralı
Kaan kod bilmiyor. Tüm kod okuma, yazma, düzenleme, deploy işlerini Claude yapar. Kaan'a asla "şunu kopyala/yapıştır" veya "şu satırı düzenle" denmez. Kaan sadece ne istediğini söyler (bug adı, özellik), gerisini Claude halleder.

## Workflow Kuralları
1. ASLA dosyayı tam `view` etme (token yakar, 17500 satır büyük)
2. grep/findstr ile hedefli oku
3. str_replace ile düzenle
4. Değişiklikten sonra syntax kontrol yap (node -c gibi)
5. Tamamlandığında deploy et
6. Her major iş bitiminde Drive'a push (parent 18sZbIP7ELOzkEQ-GQoXiHTAWFIEgTkR-).
7. Drive push kuralı (MCP API update yok):
   - Küçük raporlar (.md, .json < 100KB): dosya adına ISO tarih suffix ekle. Örn: `_last_session_summary_2026-04-23T18-30.md`
   - Büyük dosyalar (Brewmaster HTML, STYLE_DEFINITIONS.json): aynı isim, duplicate oluşsun. Okuyan taraf modifiedTime desc ile en güncelini alır.

## İletişim
- Dil: Türkçe
- Kaan'a "kralım" deme
- Direkt, dürüst, fikirli ol
- Bilimsel ol, tutarsız olma

## H Bug Listesi (kritik)
- H1: 81 adet defansif olmayan .find çağrısı (null check eksik)
- H2: rice_hulls grist hesaplamasında hata
- H3: hSRM'de post-fermentation dkFactor sorunu
- H4: m.mo null handling eksik
- H5: hOG'da mL case problemi
- H6: maltEkle'de duplicate satır oluşuyor

## M Backlog
M1-M10 UX iyileştirmeleri var ama detayı şu an belirsiz, Kaan hatırladıkça eklenecek.

## Önemli Tanımlar
- Kaan: Bankacı, ev üreticisi (homebrewer), betta breeder, yazar
- Bulldog Brewer, 10-12L batch boyutu
- Favori: Weizen/Weizenbock, Belçika Dubbel tarzları
- Ayrıca Domestic Betta Ansiklopedisi (8 cilt, ~930 sayfa, tamam) var — başka bir proje

## Stil Skorlama Motoru — İlerleme Notu (2026-04-23)
Faz 2a tamamlandı. styleMatchScore motoru JSON'da çalışıyor. Top-1 %70-80, Top-3 %89. Bilinen sorunlar: Session IPA↔APA, Blanche↔Sour↔Gose karışıklığı, Specialty agresif, aile içi (Vienna↔Czech Amber, Belgian Strong Golden↔Tripel) çakışmalar.

**Faz 2b tamamlandı (2026-04-23):** Aile içi tie-break motoru + specialty cap eklendi. 202 stil 33 aileye etiketlendi (`STYLE_FAMILIES.json`). Tie-break izole: aileler arası sıra korunur, sadece aile içi pozisyon değişir. Sonuç: **39/55 top-1 (%71), 49/55 top-3 (%89)**. +3 düzelme (best_bitter, wee_heavy, czech_permium), regresyon yok.

**Faz 2c tamamlandı (2026-04-23):** HTML'e V2c motor UI kutusu enjekte edildi (sarı beta kutu, top-3 öneri). %100 preset test oldu. Kaan gerçek Brewmaster'da test etti (Hoppy Wheat doğru yakaladı).

**Faz 2d — Ground Truth benchmark (2026-04-23):** Kaan'ın tautoloji uyarısı üzerine gerçek reçete havuzu kuruldu:
- **199 gerçek reçete** toplandı (Brulosophy + BYO clones + AHA NHC + Milk The Funk)
- Kaynaklar: Brulosophy (~40), BYO Magazine (~150), Brewery clones (Westmalle, Chimay, Orval, Duvel, Guinness, Sierra Nevada, Bell's, Stone, Firestone, Founders, Boulevard, New Belgium, Dogfish Head, Allagash, Hoegaarden, Ayinger, Schneider, Paulaner, Weihenstephaner, Lagunitas, Ommegang, AleSmith, vs.)
- Motor patch round'ları: %25 → %49 → %33 (veri büyüdükçe stabilize)
- **Son benchmark: 66/199 top-1 (%33), 94/199 top-3 (%47)**
- 55-test: 42/56 (stable), Preset: 15/15 (no regression)
- Dosyalar: `_gt_recipes_raw.js`, `_gt_convert.js`, `_confusion_analysis.js`, `_patch_gt2-6.js`

**Tespit:** Kural-tabanlı motor ~%33-39 tavanına yaklaşıyor. Rule-based rafineleme diminishing returns.

**A (Motor Rewrite) Denendi (2026-04-23):**
- Specificity-weighted scoring (dar safe zone = yüksek bonus) → regresyon (%33→%29). Revert.
- Magnet counter-exclusion (American Brown vb. British yeast exclude) → regresyon (%33→%31). Revert.
- **Sonuç:** Kural-tabanlı motor fundamental olarak rule-limitli. Marker vs scalar dengesizliği rule-based ile çözülemiyor. Gerçek çözüm ML veya hibrit ML+rule.

**Faz 3 Feedback Loop UI TAMAM (2026-04-23):**
- V2c kutusunda her stilin yanında ✓ butonu + "Başka stil" butonu
- `bm_v2c_feedback` localStorage key'ine override kayıt
- Format: `{ts, recipeSig, oldTop1, correctSlug, correctLabel}`
- `window.bmV2cShowFeedback()` — console'da tablo görünür
- `window.bmV2cExportFeedback()` — JSON download
- Son düzeltme kutuda görünür ("Son düzeltme: X → Y")

**Bu veri birikiyor. Kaan her kullanımda feedback verebilir. İleride motor için ML training veri kaynağı.**

SIRADAKİ: Kaan gerçek kullanımda biriktirsin. Sonra motor patch döngüsü feedback'e göre.

**ML Pipeline tamam (2026-04-24): 1016 reçete + V5 Multi-Ensemble motor production'da.**
- LOOCV top-3 %76.6, top-5 %80.3 (rule başlangıcına göre +30 puan top-3)
- 4 motor paralel HTML'de: V2 (flat) / V3 (hiyerarşik) / V4 (ensemble) / **V5 (KNN+RF Multi)** ← ana
- V5 = 1016 KNN örneği + 50 RF ağacı (depth 15, rf=10), α=0.4 KNN + 0.6 RF + 0.0 rule
- Sıradaki kazanım: slug alias normalize (gueuze↔lambic, koelsch↔kolsch, hefeweizen↔weissbier)

**Temel dosyalar** (C:\Users\Kaan\brewmaster\):
- `STYLE_DEFINITIONS.json` — 203 stil, BA 2026 + BJCP 2021 hibrit, thresholds zone mantığıyla
- `SUBSTYLE_VARIANTS.json` — 58 alt-stil (Pastry Stout, Kveik NEIPA, Piña Colada Gose vs.)
- `STYLE_FAMILIES.json` — 33 aile + discriminator konfigi (Faz 2b)
- `style_engine.js` — Ana motor (findBestMatches, styleMatchScore, matchSubstyles)
- `FAZ2a_SONUC.md` — Detaylı sonuç raporu + yarın yapılacaklar listesi
- `_ml_dataset.json` — 1016 reçete × 61 feature (1.79 MB)
- `_ground_truth_v2_batch[1-8].json` — toplam 860 ek reçete (v1 199 + v2 batch 60+150+150+150+150+150+50)
- `_build_inline_v5.js`, `_inject_v5.js`, `_browser_sim_v5.js` — V5 pipeline

---

## UZUN VADELİ VİZYON — Kişiselleştirme ve Öğrenme

**Hedef:** Brewmaster'ı kural tabanlı bir hesap makinesinden, kullanıcı deneyimi ile öğrenen kişiselleştirilmiş bir sisteme dönüştürmek.

**Neden:** BeerSmith/Brewfather bu seviyede kişiselleştirme yapmıyor — Brewmaster'ın gerçek differentiate noktası bu olacak.

### Kapsam (her hesap/öneri için geri besleme)
- **Stil tayini** → kullanıcı manuel seçimi kaydedilir, benzer profillere önerilir
- **OG/FG tahmini** → kullanıcının gerçek hidrometre ölçümleri kaydedilir, attenuation profili kişiselleşir
- **SRM tahmini** → kullanıcının görsel/fotoğraf geri bildirimi
- **IBU algısı** → kullanıcı tat geri bildirimi (çok acı / normal / düşük)
- **Verim tahmini** → kullanıcının her batch'inde kendi sistem verimi öğrenilir (Kaan_verim ortalaması)
- **Maya attenuation** → Kaan'ın her mayayla gerçek aldığı attenuation öğrenilir

### Yaklaşım — Seviyeler
- **Seviye 1 (basit):** Manuel override + log + sonraki önerilerde kullan
- **Seviye 2 (orta):** Kullanıcı bazlı kalibrasyon dosyası (`kaan_profil.json`) — sistem verim offset, renk offset, FG offset
- **Seviye 3 (gerçek ML):** İlerisi — yeterli veri birikince

### Faz haritası
- **Faz 3:** Manuel stil seçimi + temel feedback log (Seviye 1)
- **Faz 4:** FG / SRM / verim feedback'leri
- **Faz 5:** Kişisel kalibrasyon profili (Seviye 2)
- **Faz 6:** ML (uzak gelecek, veri biriktikten sonra)

Bu vizyon arka planda, her yeni özellik tasarımında "bu ileride nasıl kişiselleşir?" sorusu akılda tutulacak.
