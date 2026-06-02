# Brewmaster — Proje Notları (AI asistanları için)

> Bu dosya Claude Code / AI asistanların projeye hızlı ve doğru girmesi için yazıldı.
> Kodu okumadan önce buradan başla. Talimatlar varsayılan davranışı **ezer**, harfiyen uy.

## 1. Proje Nedir

Brewmaster, Türkçe bir **ev üretimi (homebrewing)** hesap ve reçete uygulaması.
Tek bir kullanıcı (Kaan) için yazılmış kapalı bir araç; ticari hedefi yok.

- **Ana ürün:** `Brewmaster_v2_79_10.html` — tek dosya, inline JS (vanilla, framework yok), ~3.3 MB, ~25.500 satır.
- **Dağıtım:** PWA (telefona kurulabilir) + APK. Canlı: Netlify (`magical-sopapillas-bef055.netlify.app`).
- **Ölçek:** Bulldog Brewer, 10–12 L batch. Favori stiller: Weizen/Weizenbock, Belçika Dubbel.
- **Drive klasörü:** `18sZbIP7ELOzkEQ-GQoXiHTAWFIEgTkR-`

Ne yapar: reçete tasarımı (malt/şerbetçiotu/maya), OG/FG/ABV/IBU/SRM hesabı, mash/sparge/kaynama/fermantasyon akışı, fiziksel renk motoru, otomatik stil tahmini (ML), reçete kütüphanesi, batch günlüğü, bulut senkron.

## 2. ÇOK ÖNEMLİ — Kullanıcı Kuralı

**Kaan kod bilmiyor.** Tüm kod okuma/yazma/düzenleme/deploy işlerini Claude yapar.
Kaan'a asla "şunu kopyala/yapıştır" veya "şu satırı düzenle" denmez. Kaan sadece ne istediğini
söyler (bug adı, özellik); gerisini Claude halleder.

## 3. İletişim Kuralları

- **Dil: Türkçe.**
- Kaan'a "kralım" deme. Direkt, dürüst, fikirli ol.
- Bilimsel ol, tutarsız olma. Sonuçları dürüst raporla (test geçmediyse söyle, atladıysan söyle).
- Etiketleme dürüstlüğü kritik: motorda "RF" gibi sahte iddialar geçmişte temizlendi (bkz. §6).

## 4. Workflow Kuralları (HTML'de çalışırken)

1. **ASLA dosyayı tam `Read` etme** — ~25.500 satır, token yakar. Hedefli `grep`/`Read offset` kullan.
2. Düzenleme: `Edit` (str_replace) ile cerrahi değişiklik. Geniş yeniden yazımdan kaçın.
3. **Değişiklikten sonra syntax kontrol yap.** HTML inline JS olduğu için ilgili script bloğunu çıkarıp
   `node --check` ile doğrula (tam dosyaya `node -c` çalışmaz, HTML'dir).
4. UI/davranış değiştiren her deploy'da **service worker `CACHE_VERSION`'ı artır** (`sw.js`, şu an
   `bm-cache-v131-191`). Aksi halde kullanıcıda eski sürüm cache'lenir.
5. İş bitince commit + push. Netlify GitHub'dan continuous deploy yapar.
6. Her major iş bitiminde Drive'a push (parent `18sZbIP7ELOzkEQ-GQoXiHTAWFIEgTkR-`).

### Drive push kuralı (MCP API'da `update` yok)
- Küçük raporlar (`.md`/`.json` < 100 KB): dosya adına ISO tarih suffix ekle.
  Örn: `_last_session_summary_2026-04-23T18-30.md`
- Büyük dosyalar (Brewmaster HTML, `STYLE_DEFINITIONS.json`): aynı isim, duplicate oluşsun.
  Okuyan taraf `modifiedTime desc` ile en güncelini alır.

### Commit konvansiyonu
Bu repo'da commit'ler kümülatif sprint kaydı tutar:
- `Adim N: <kısa açıklama>` — sıralı feature/bugfix adımları (şu an ~Adim 149'da).
- `Sprint N[.x]: <açıklama>` — UI/görsel/altsistem sprintleri.
- Sık sık `+ sw v131-NNN` eki ile SW versiyon bump'ı belirtilir.
Aynı stili koru: kısa, açıklayıcı, Türkçe (geçmiş commit'ler aksanı ASCII'ye sadeleştiriyor).

## 5. Repo Yapısı

Repo aynı zamanda canlı ML/veri çalışma alanı. **~790 dosya tracked**, çoğu `_`-prefiksli scratch.

### Ürün / runtime dosyaları (önemli olanlar)
- `Brewmaster_v2_79_10.html` — **uygulama (asıl ürün).**
- `sw.js` — service worker (cache stratejisi + versiyonlama, Adım 123 mimarisi).
- `manifest.webmanifest`, `icon-192.png`, `icon-512.png`, `.nojekyll` — PWA varlıkları.
- `fonts/` — Cinzel, Fraunces, HankenGrotesk woff2.
- `netlify.toml`, `_redirects` — Netlify (publish `.`, `/` → HTML 200 rewrite, NODE 20).
- `_cf_worker/` — Cloudflare Worker (`brewmaster-models.dessn7.workers.dev`), versiyonlu ML model JSON serve eder.

### Stil & veri tanımları (motorun girdisi)
- `STYLE_DEFINITIONS.json` — 203 stil, BA 2026 + BJCP 2021 hibrit, zone-mantıklı threshold'lar.
- `STYLE_FAMILIES.json` — 33 aile + tie-break discriminator (`familyMap`).
- `SUBSTYLE_VARIANTS.json` — 58 alt-stil (Pastry Stout, Kveik NEIPA, Piña Colada Gose vb.).
- `style_aliases.json` — slug normalizasyon (gueuze↔lambic, hefeweizen↔weissbier, koelsch↔kolsch).
- `BA_2026_styles.json`, `BJCP_2021_styles.json`, `HYBRID_styles.json` — kaynak stil verileri.
- `BM_signatures.json`, `hierarchy_map.json` — imza/hiyerarşi yardımcıları.

### Motor kaynak (HTML'e inline gömülür, runtime'da ayrı yüklenmez)
- `style_engine.js`, `style_engine_v2.js` — kural-tabanlı eşleme (`findBestMatches`, `styleMatchScore`, `matchSubstyles`).
- ML pipeline: `_ml_dataset*.json` (dataset versiyonları), `_v*_train.py` (sklearn eğitim),
  `_build_inline_v*.js` / `_inject_v*.js` (motoru HTML'e gömme), `_browser_sim_v*.js` (LOOCV/CV testi).

### Scratch / pipeline konvansiyonu (`_` prefiksi)
- `_`-prefiksli her dosya **scratch / pipeline artefaktı** (audit, benchmark, ground-truth batch, dataset
  versiyonu, eğitim scripti, session özeti). `.gitignore` artık `_*.{js,py,json,md,html,...}` desenini
  yakalıyor (Adım 142–143), yani **yeni** `_` dosyaları otomatik commit'lenmez — ama mevcut 700+ tanesi
  geçmişte commit'lendiği için hâlâ tracked. `git status`'u temiz tutmak için yeni scratch'i `_` ile adlandır.
- `working/`, `archive/`, `external/` — daha büyük pipeline/model artefakt dizinleri.

### Dokümantasyon
- `README.md` — kısa proje özeti + V6 motor durumu (genelde CLAUDE.md ile birlikte güncel tutulur).
- `FAZ2a_SONUC.md`, `_audit_step_*.md`, `_faz*_*.md`, `_sprint*_kapanis_*.md` — sprint/faz raporları.

## 6. Stil Skorlama Motoru — Güncel Durum

Production motoru **V6: saf weighted KNN ensemble** (Random Forest YOK — eski "RF/V7" iddiaları
placeholder/mock'tu, temizlendi).

- **1100 gerçek reçete** üzerinde eğitilmiş (Brulosophy + BYO + brewery clone'ları + AHA NHC +
  Milk The Funk + V6 expansion).
- **Multi-K weighted KNN + veto kuralları + feature weighting** (k=5, Manhattan distance, inverse-distance voting).
- **79 feature** (orijinal 61 + 18 ekstra: mash/ferment sıcaklığı, su kimyası, maya alt türleri, lagering, dry-hop).
- **5-fold CV (seed 42):** top-1 %78.5, top-3 %86.5, top-5 %87.3.
- **Holdout (840/260):** top-1 %73.8, top-3 %80.8, top-5 %81.5.
- Tüm motor (reçeteler + KNN + veto + ağırlıklar) HTML'e **inline gömülü** — ek runtime/sunucu yok.
- HTML'de birden çok motor sürümü paralel duruyor (V2 flat, V5 fallback, V6 ana, ayrıca V12/V20 deneysel
  inline bloklar). Default = V6.
- **Bilinen kısıt:** az örnekli specialty kategorileri (örn. `pumpkin_spice_beer` 1 örnek) top-1'de zayıf.
  Kural-tabanlı motor ~%33–39 tavanına vurmuştu; gerçek kazanç ML ile geldi.

Production dataset: `_ml_dataset_v6_final_comprehensive.json` (1100 × 79).
Önceki referanslar: `_ml_dataset_v6_normalized.json` (1016 × 61, V5), `_ml_dataset.json` (V5 baseline).

## 7. Mimari & Altsistemler (HTML içinde)

- **State:** localStorage tabanlı (reçete kütüphanesi, ölçümler, feedback). Anahtarlar `bm_*` (örn. `bm_v2c_feedback`).
- **Bulut senkron:** Firebase Realtime DB. Strateji "pull-first + dirty-guard + son-yazan-kazanır"
  (Faz 2.5; çok-cihaz mutual destruction kapatıldı). `beforeunload`/`pagehide` keepalive flush.
- **ML modelleri:** Cloudflare Worker'dan versiyonlu URL (`_<sha8>.json`, immutable, SW Cache First).
- **Renk motoru (Sprint X):** fiziksel — malt tabanı + pigment spektral absorbans (eps/pH/doz duyarlı),
  `aktif_renk_hex` + `renk_band_tr/en` → `motorRenk`. SRM 16 bant BJCP deLange paleti.
- **Malt sekmesi:** Grist Denetimi (kategori dağılımı + diastatik güç DP kontrolü), Hedefe Ölçekle.
- **Hop sekmesi:** Hop Denetimi (IBU vs BJCP, BU:GU), Hop Zaman Çizelgesi (FWH/Boil/Whirlpool/Dry),
  IBU'ya Ölçekle, legacy hop tür normalizasyonu (`_migrateLegacyKatkiIds`).

## 8. Bilinen Bug / Backlog Notları

H bug listesi (kritik, kademeli kapanıyor):
- H1: defansif olmayan `.find` çağrıları (null check eksik)
- H2: `rice_hulls` grist hesabı (Bulgu 1+2'de kısmen ele alındı)
- H3: hSRM post-fermentation dkFactor
- H4: `m.mo` null handling
- H5: hOG mL case problemi
- H6: `maltEkle` duplicate satır

M1–M10: UX iyileştirmeleri (detay belirsiz, Kaan hatırladıkça eklenir).

## 9. Uzun Vadeli Vizyon — Kişiselleştirme

Brewmaster'ı kural-tabanlı hesap makinesinden, kullanım geri beslemesiyle **öğrenen kişiselleştirilmiş**
sisteme dönüştürmek (BeerSmith/Brewfather bunu yapmıyor — gerçek differentiate noktası).

Kapsam: stil tayini, OG/FG tahmini, SRM, IBU algısı, sistem verimi, maya attenuation — her biri için
kullanıcı geri bildirimi kaydedilir.

Seviyeler: (1) manuel override + log, (2) kişisel kalibrasyon dosyası (`kaan_profil.json`: verim/renk/FG offset),
(3) gerçek ML (veri birikince).

Faz haritası: Faz 3 (manuel stil seçimi + feedback log — **TAMAM**, `bm_v2c_feedback` localStorage),
Faz 4 (FG/SRM/verim feedback), Faz 5 (kişisel kalibrasyon), Faz 6 (ML, uzak gelecek).

> Her yeni özellik tasarımında "bu ileride nasıl kişiselleşir?" sorusu akılda tutulur.

## 10. Kullanıcı Bağlamı

- **Kaan:** Bankacı, ev üreticisi (homebrewer), betta breeder, yazar.
- Ayrı bir projesi: **Domestic Betta Ansiklopedisi** (8 cilt, ~930 sayfa, tamam) — bu repo'yla ilgisi yok.
