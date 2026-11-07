# Dış kaynak değerlendirmesi (Claude, 2026-11-07)

Kaan'ın isteği: "BrewDog'ları alalım; diğerlerine önyargısız, ayrıntılı bak."

Yöntem: her repo klonlandı. Brewmaster kataloğu canlı HTML'den (md5 0159c786…) Playwright ile döküldü:
- MALTLAR 187 · HOPLAR 77 · MAYALAR 132 · MAYA_ATU_KAYNAK 87 · SU_PROFILLERI 15 · BJCP 240 · KATKILAR 199 · _OFF_TESHIS 15 aile.

Karşılaştırma programla yapıldı. Farklar üretici sayfası ya da repodaki BJCP 2021 metniyle doğrulandı; doğrulanamayan "askıda".

| Kaynak | Ne | Durum | Değer |
|---|---|---|---|
| alxiw/punkapi v3 (DIY Dog) | 415 BrewDog reçetesi; mash + fermantasyon sıcaklığı, pH, maya adı | ALINDI → `dis_kaynak/diydog/` | YÜKSEK |
| beerjson/bjcp-json | BJCP 2021, 110 stil, makine okunur | çapraz kontrol yapıldı | ORTA (1 hata + 9 eksik stil) |
| kasperg3/HopDatabase | 220 hop (README "500+" diyor, gerçekte 220), her kayıtta üretici linki | çapraz kontrol yapıldı | ORTA–YÜKSEK (34 yaygın eksik çeşit) |
| gregario/brewers-almanack | 85 stil, 113 hop, 37 malt, 33 maya, 20 su, 25 off-flavor, 20 katkı, 23 eşleştirme, UK dükkân fiyatları | çapraz kontrol yapıldı | ORTA (kontrol listesi olarak; içeriği kaynaksız) |
| drodil/rustybeer | Rust hesaplayıcılar (ABV, Tinseth, priming, hidrometre, kalori, maya canlılığı) | incelendi | DÜŞÜK (formüller Brewmaster'da aynı; kalori yok) |
| public-apis içindeki öteki bira girdileri | Open Brewery DB (fabrika adresleri), Untappd (OAuth), TheCocktailDB | incelendi | YOK |
| awesome-mcp-servers | bira ile ilgili tek sunucu brewers-almanack | incelendi | — |

## 1. DIY Dog (BrewDog) — alındı
- 415 reçete. Nisan'daki 325'lik BeerXML'den 98 fazla; 317'si adla eşleşiyor.
- Alan doluluğu:
  - ABV 415, OG / FG 414, IBU 409, pH 403, attenüasyon 404
  - **mash sıcaklığı 414** (süre 357; çok adımlı 24), **fermantasyon sıcaklığı 403**, maya adı 414
  - kuru hop 192, "twist" (özel işlem) 178, bira ustası notu 415, yemek eşleştirmesi 415 × 3
- Maya: 363/415 Brewmaster kataloğuna tam eşleşiyor.
- **Adım 48'in "maya alanı boş" gerekçesi yanlıştı:** maya adları vardı. DIY Dog bu yüzden veri setinden çıkarılmıştı (v13 / v16'da 0 kayıt).
- Stil: BrewDog'un kendi ad / slogan / açıklamasında tek stil sözcüğü olan 342 kayıt var. Nisan'daki etiketin 137'si OG / IBU / SRM eşiğinden türetilmişti (döngüsel).
- Anomali: 14 FG ≥ OG; 48 ABV tutarsız (dondurarak damıtma ve fıçı dahil); 5 mash 0; 12 fermantasyon sıcaklığı boş.
- **Kullanım (öneri, sıra):**
  - (a) Etiketleme: yalnız BrewDog metni, kör alt-etiketçiler + Claude, Brewmaster slug'ına.
  - (b) "Üretici reçetesi" örnek tablosu: stil başına BrewDog'un kendi reçetesi; K2 / K3 kaynaklı örnek sınıfı.
  - (c) ML yeniden eğitiminde rmwoods dışı süreç verisi. Kusur 4'e değer, çünkü mash ve fermantasyon sıcaklığı gerçek ve tek kaynaklı değil. Karar Kaan'ın yeniden eğitim kararına bağlı.
  - (d) Bira ustası notu ve yemek eşleştirmesi: BrewDog atfıyla içerik.

## 2. BJCP (bjcp-json ↔ Brewmaster BJCP tablosu)
- 80 stil eşleşti, 77 birebir aynı.
- **HATA (doğrulandı):** X4 Catharina Sour, Brewmaster'da FG 1.002–1.008, SRM 2–7.
  - BJCP 2021 metni (repo BJCP_2021_raw.txt, s. 84) ve bjcp-json: **FG 1.004–1.012, SRM 2–6**.
- Birleşik anahtar farkları (hata değil, tasarım):
  - "Lambic / Gueuze" Lambic değerlerini taşıyor. 23E Gueuze'de FG 1.000–1.006, SRM 5–6, ABV 5–8 kayboluyor.
  - "Saison / Farmhouse Ale" SRM 5–22 (BJCP: açık 5–14, koyu 15–22).
- **Brewmaster'da OLMAYAN BJCP 2021 stilleri:**
  - 1A American Light Lager. "American Lager / Light Lager" 1B değerlerini taşıyor.
  - 2C International Dark Lager · 12A British Golden Ale · 14B Scottish Heavy · 15C Irish Extra Stout · 23E Gueuze (ayrı) · X1 Dorada Pampeana · X2 IPA Argenta · X3 Italian Grape Ale.
  - Değerler repodaki BJCP 2021 metninden alınır (VERI1 deseni).

## 3. Hop (HopDatabase ↔ HOPLAR 77)
- Eşleşen 65 hopun 61'inin alfası, HopDatabase aralığının içinde. Dışta kalan 4:
  - **Eclipse:** Brewmaster 15. BarthHaas sayfası 15,7–19,1 → Brewmaster değeri düşük. DOĞRULANDI.
  - **Nectaron:** Brewmaster 13. HopDatabase 21–27, bu HopDatabase'in hatası. YCH sayfasının kendisi iki değer veriyor: tablo 10–15, "typical" 21–27 (Cryo'ya benziyor). Brewmaster 10–15 içinde.
  - **Strata:** Brewmaster 13. Crosby 11–12,5; Haas spec 12,1 → hafif yüksek (askıda, üretici Indie Hops).
  - **Cryo Mosaic:** Brewmaster 22. YCH LupuLN2 23–27 → hafif düşük.
- **Brewmaster'da olmayan yaygın çeşitler (34; Jester, Olicana ve Anchovy HopDatabase'de de yok, 31'i var):** Hersbrucker, Summit, Bravo, Apollo, Mt. Hood, Liberty, Sorachi Ace, Northdown, First Gold, Bramling Cross, Pride of Ringwood, Galena, Cluster, Crystal, Glacier, Horizon, Ahtanum, Admiral, Jester, Olicana, Phoenix, Sovereign, Celeia, Bobek, Marynka, Palisade, Zappa, Trident, Eureka, Santiam, Lotus, Vista, Ariana, Anchovy. HopDatabase'de toplam 148 çeşit Brewmaster'da yok; bir kısmı ad varyantı.
- Bu eksiklerden First Gold (47 kullanım), Ahtanum (44), Bramling Cross (37), Sorachi Ace (34), Hersbrucker (8), Crystal (6), Bravo (5) DIY Dog reçetelerinde de geçiyor.
- HopDatabase'de hata olduğu görüldü (Nectaron). Her ekleme, kayıttaki üretici linkinden ayrı ayrı doğrulanır; HopDatabase değeri doğrudan alınmaz.

## 4. brewers-almanack (kontrol listesi olarak)
- **Maya:**
  - 33 suşun 23'ü Brewmaster'da. Brewmaster'ın 87 suşu üretici linkli.
  - Farklılıkların çoğunda almanack yanlış. Örnek: US-05 sıcaklığı 18–23; Fermentis 18–26.
  - Almanack'ın üreticiyle uyuştuğu yerler: WB-06 86–90, T-58 72–78, BRY-97 78–84. Brewmaster'ın `atu` değerleri burada KENDİ kaynağından (MAYA_ATU_KAYNAK) farklı; bu bilinen "28 maya" açığı.
  - Eksik 10 White Labs suşu: WLP028, 090, 400, 530, 802, 833, 940, 650, 644, 677. Değerler whitelabs.com'dan alınır.
- **Malt:** Brewmaster çok daha zengin (187, tampon kapasitesi dahil). Almanack'ta hatalar var: Roasted Barley 300 °L (Crisp ~500), Special B 150 °L.
  - Brewmaster'da olmayan: Simpsons Coffee Malt, "CaraVienne".
  - Almanack'ın "fermentability" alanı kaynaksız, alınmaz.
- **Su:**
  - Klasik şehir profilleri kaynağa göre çok değişiyor. Örnek: Burton SO₄ Brewmaster 610, almanack 800, Palmer tablosu (BJCP sitesi) 820.
  - Almanack'ın eklediği şehirler: Köln (Kölsch), Düsseldorf (Altbier), Brüksel, Bamberg, Yorkshire, Denver vb. Ancak kaynaklı bir tablo gerekir (askıda).
- **Off-flavor — Brewmaster'da AİLE OLARAK YOK:**
  - otoliz (etimsi / et suyu / soya / lastik), izovalerik (eski hop → peynir / ter), sabunumsu, tahıl / kabuk, bitkisel / çimen.
  - Yalnız atıf ya da dağınık geçiyorlar: otoliz bir "farklı teşhis" notunda, "eski peynir" enfeksiyon dilinde.
  - Not: CEV setindeki sorular tam da bunları soruyor (mayamsı / etimsi, sabunumsu, eski hop).
  - İçerik kaynaklı yazılır (BJCP off-flavor açıklamaları / Siebel / ASBC); almanack metni alınmaz.
- **Katkı:** eksik yok.
- **Eşleştirme:** Brewmaster'da yemek eşleştirme yok. Almanack metni kaynaksız; DIY Dog'un BrewDog atıflı eşleştirmeleri var.
- **geb-inventory:** UK dükkân fiyatları, ilgisiz.

## 5. Rustybeer
- Son commit 2021; Heroku sunucusu kapalı (ücretsiz plan 2022'de bitti).
- Priming (artık CO₂) ve hidrometre sıcaklık düzeltmesi Brewmaster'daki formüllerle aynı.
- Brewmaster'da kalori hesabı yok. Rustybeer'in formülü: 1881,22·FG·(OG−FG)/(1,775−OG) + 3550·FG·(0,1808·OG + 0,8192·FG − 1,0004). İstenirse kaynağı ayrıca doğrulanır.

## 6. Önerilen işler (CEV bittikten sonra, sırayla)
- **KAT-A (küçük düzeltme):**
  - Catharina Sour FG / SRM.
  - Eclipse alfa (BarthHaas 15,7–19,1).
  - Strata ve Cryo Mosaic üretici sayfasıyla kontrol.
- **KAT-B (BJCP tamlığı):** 9 eksik 2021 stili + Gueuze'yi ayırma. Değerler BJCP_2021_raw.txt'den.
- **KAT-C (hop):** 34 yaygın çeşit; HopDatabase linkinden üretici değeri; alias'lar.
- **KAT-D (maya):**
  - 10 White Labs + DIY Dog'da geçen eksik suşlar (Wyeast 2007, 1010, WLP013, 099, 351, 4000, S-189) üretici sayfasından.
  - DIY Dog maya eşleşmesini 363'ten yaklaşık 400'e çıkarır.
- **KAT-E (off-flavor):** 5 yeni aile, kaynaklı içerik.
- **DD-1 (DIY Dog):** metin etiketleme → (b) örnek tablosu → (c) ML (Kaan'ın kusur 4 kararıyla).

## 7. Ek: öteki sohbetin ikinci listesi (Claude, 2026-11-07 19:30)
- **Claude Code Remote Control — KABUL.**
  - Resmî belge (code.claude.com/docs/en/remote-control): Pro / Max / Team / Enterprise'da var, API anahtarıyla çalışmaz.
  - Laptopta çalışan CC oturumu telefondan (Claude uygulaması) ya da claude.ai/code'dan sürdürülür. Dosya ve araçlar laptopta kalır.
  - Laptop uyursa ya da ağ koparsa, makine dönünce kendisi yeniden bağlanır. CC kapatılınca oturum yaklaşık 4 saat geri getirilebilir.
  - DEVIR_2026-10-27 "Kaan uzaktayken CC'ye prompt veremez" sorununu çözer.
  - Kullanım: CC içinde `/remote-control` (ya da `/config` içinden otomatik bağlanma). Laptop açık ve CC çalışır durumda kalmalı.
  - Kural aynen: gerçek CEV koşusu sürerken CC'ye sprint verilmez.
- **LLM Panel (OpenAI + Anthropic + Google) — KOŞULLU KABUL, yalnız onay koşusunda.**
  - Bugünkü kör etiketçilerin ikisi de Claude; kör noktaları ortak olabilir. 25/25 yeniden denetimi ben yapıyorum, o da aynı aile.
  - Öneri: TAZE held-out 2 onay koşusunda bir kez, başka şirketin modeliyle (bir tane yeter) karar maddelerinin tamamı + rastgele 60 kabul edilen madde etiketlenir. Kabul maddelerindeki uyuşmazlık oranı raporlanır.
  - Maliyet kabaca 3–6 $ (VARSAYIM: yaklaşık 2 M giriş token'ı). OpenAI ya da Google API anahtarı gerekir; anahtarlar Kaan'ın laptopunda kalır, betiği CC koşturur. Hesap ve harcama kararı Kaan'ın.
- **Scrapling — RET (gerekçe düzeltildi).** "28 maya" açığı sayfa bulamamaktan değil, MAYA_ATU_KAYNAK'taki 87 üretici linkli alıntı ile katalog `atu` değerinin uyuşmamasından kaynaklanıyor. Yani bir uzlaştırma işi; toplu tarama gerekmiyor. Yeni suşlar (KAT-D) da sayfa sayfa okunabiliyor (BarthHaas / White Labs sayfaları bu oturumda okundu).
- **healthchecks.io — KABUL (kuyruk (c) push işine).**
  - Worker `brewmaster-models`'te 5 dakikalık cron var (`_cronTick`: KV'deki alarmları push'lar). Cron durursa ya da push'lar topluca 404 / 410 dönerse kimse fark etmiyor.
  - Öneri: başarılı tick'te ping, toplu hatada `/fail`. Ping adresi worker secret'ı olur, public repoya girmez. Ücretsiz hesabı Kaan açar (e-posta ister).
- **Cloudflare MCP — ŞİMDİLİK RET.** Worker R2 (modeller) + KV (alarmlar) + cron kullanıyor. Push sorununa (c) bakarken worker loglarını okumak için işe yarayabilir; o iş açılınca yeniden değerlendirilir.
- **HopDatabase sayısı:** öteki sohbet 113 dedi. 113, brewers-almanack'ın HopDatabase'den aldığı alt küme; HopDatabase'in kendisinde 220 kayıt var (website/public/data/hops.json).
