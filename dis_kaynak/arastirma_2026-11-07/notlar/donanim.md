# Homebrew donanım / IoT cihazları ve Brewmaster entegrasyon yolları (araştırma tarihi 2026-11-07)

Kapsam: Brewmaster (tek HTML PWA + Android APK, Cloudflare Worker ücretsiz plan: KV + R2 + 5 dk cron Web Push, Firebase RTDB) için otomatik yoğunluk / sıcaklık verisi sağlayabilecek cihazlar, Türkiye'den erişim, entegrasyon yolu ve karar (AL / DENE / İZLE / ALMA). Fiyatlar okunduğu günün tarihiyle verilmiştir. Kur: 5 Kasım 2026 USD/TRY 50,02, EUR/TRY 56,38 — [BloombergHT](https://www.bloomberght.com/dolar-ve-euro-kuru-bugun-ne-kadar-oldu-5-kasim-2026-doviz-fiyatlari-pkh2-3793584). TL karşılıkları bu kurla yapılmış KABA çevrimlerdir (kargo + gümrük HARİÇ).

## 1. Dijital hidrometreler (iSpindel / GravityMon, Tilt, RAPT Pill, Plaato, Floaty, EasyDens, BrewJacket, "Platinum Tilt") — ne ölçer, doğruluk, fiyat, durum, protokol

### Takeaway
2026'da gerçek seçenekler üç tane: RAPT Pill (hazır, ucuz, WiFi → RAPT bulutu → özel webhook ile herhangi bir URL'ye POST), iSpindel donanımı + GravityMon firmware (açık, doğrudan özel URL'ye HTTP POST, bulut gerektirmez, ama kendin yap / lehim ya da hazır alım) ve Tilt (BLE iBeacon; telefona ya da köprüye muhtaç, en pahalı). Plaato bitti; üretici doğruluk iddiaları (±0,002 SG) dışında bağımsız sayısal doğruluk karşılaştırması BULUNAMADI.

### Cited Findings
**iSpindel (orijinal proje)**
- Açık kaynak DIY yüzer hidrometre: yüzen silindirin eğim açısını (ivmeölçer) ve sıcaklığı ölçer, açı yoğunlukla değişir; Wemos (ESP8266) kart, DS18B20 sıcaklık sensörü; uykudan uyanıp veri gönderir; önerilen aralık ≈1800 sn — [GitHub universam1/iSpindel](https://github.com/universam1/iSpindel)
- Yoğunluk açıdan polinomla türetilir, her cihaz ayrı kalibre edilir ("The conversion polynom can be stored per iSpindel"); changelog'daki son sürüm 7.1.0 (10 Haziran 2021); lisans: "any commercial use is hereby prohibited" — [GitHub universam1/iSpindel](https://github.com/universam1/iSpindel)
- Desteklenen servisler: Ubidots, BierBot Bricks, CraftBeerPi, FHEM, iSpindel-TCP-Server; changelog'da InfluxDB, MQTT (Brewblox dahil), Prometheus, ThingSpeak, genel HTTP/TCP — [GitHub universam1/iSpindel](https://github.com/universam1/iSpindel)

**GravityMon (iSpindel yedek firmware'i — 2026'da aktif olan dal)**
- "100% compatible with the iSpindel hardware design"; ESP32-C3 mini, ESP32-S2 mini, ESP32-S3 mini de destekli; kurulum tarayıcıdan web.brewflasher.com — [GitHub mp-se/gravitymon](https://github.com/mp-se/gravitymon)
- v2.5.0 "Latest" (varlık zaman damgası 23 Haziran 2026): DS18B20 sahte çip testi, "Cuckoo Tilt" hedefi (ESP32-C3); v2.6.0 beta 1 (25 Ağustos): ESP32-S3 Zero kartı — [GitHub releases](https://github.com/mp-se/gravitymon/releases)
- Jiroskop: MPU-6050, MPU-6500, ICM-42670-P (otomatik algılama; ICM-42670-P "lower power consumption, higher accuracy"); cihazda formül oluşturma, 20 veri noktası; sıcaklık düzeltmesi formülden bağımsız ikinci adım — [GravityMon functionality](https://mp-se.github.io/gravitymon/functionality.html)
- Pil (WiFi, 2200 mAh): ESP8266 300 sn aralıkta ≈90 gün, 30 sn'de ≈9 gün; ESP32-C3 300 sn'de ≈43 gün; "Wifi consumes a lot of power so Bluetooth is a better option for long battery life" — [GravityMon functionality](https://mp-se.github.io/gravitymon/functionality.html)
- BLE yayını yalnız ESP32'de: Tilt, Tilt PRO, Gravmon Eddystone, Gravmon Service (tam iSpindel JSON), "RAPT v1 / v2" (RAPT pill biçimi) — [GravityMon functionality](https://mp-se.github.io/gravitymon/functionality.html)
- Push hedefleri: HTTP (POST/GET, isteğe bağlı SSL), InfluxDB v2, MQTT, Brewfather, Home Assistant, BrewSpy, Brewers Friend, Fermentrack, Ubidots, ThingSpeak — [GravityMon functionality](https://mp-se.github.io/gravitymon/functionality.html); ayrıntılı uç noktalar (Brewfather `log.brewfather.net/ispindel?id=` ve `/stream?id=`, Grainfather için aralık 910, BierBot `brewbricks.com/api/iot/v1`) ve "ESP8266 may crash when using SSL with the web server running" notu — [GravityMon services](https://mp-se.github.io/gravitymon/services.html)
- GravityMon Gateway (ESP32-S3 + TFT): GravityMon 2.0+ BLE verisini HTTP POST/GET, InfluxDB, MQTT'ye iletir; Tilt ve RAPT'ı "detect and display but not forward" — [GravityMon gateway](https://mp-se.github.io/gravitymon/gateway.html)
- Hazır iSpindel: Tindie "iSpindel pill" (nautilis) 1 adet 58 $ (≈2.900 TL), 18650 pil ve şarj aleti dahil değil, Türkiye kargo ücreti tanımsız (2026-11-07) — [Tindie](https://www.tindie.com/products/nautilis/ispindel-pill-electronic-hydrometer)
- Parça fiyatları TR (2026-11-07): Wemos D1 Mini klon 175,43 TL KDV dahil, direnc.net (stok bilgisi çelişkili) — [direnc.net](https://www.direnc.net/wemos-d1-mini-nodemcu-lua-wifi-esp8266-board-klon); MPU6050 GY-521 121,98 TL KDV dahil, Robotistan (stok çelişkili) — [Robotistan](https://www.robotistan.com/mpu6050-6-eksen-ivme-ve-gyro-sensoru-6-dof-3-axis-accelerometer-and-gyros)
- Homebrew Academy: iSpindel kiti "around 30 euros or 30 US dollars" (2020 makalesi, 2023 güncelleme) — [Homebrew Academy](https://homebrewacademy.com/digital-wireless-hydrometer-thermometer/)

**Tilt**
- Tilt 135 $ (≈6.750 TL), Tilt Pro Mini 175 $, Tilt Pico (BLE→WiFi köprü, micro-USB beslemeli) 45 $; Tilt ±0,002 SG (0,990–1,120), ±0,5 °C, pil 12–24 ay; yalnız Bluetooth; bulut: Google Sheets, Brewfather, Brewstat.us, Brewer's Friend; ABD dışındaki gümrük/vergiler alıcıda; özel URL seçeneği sayfada geçmiyor — [tilthydrometer.com](https://tilthydrometer.com/)
- Yayın biçimi iBeacon: üretici kimliği 0x004C, renk başına sabit UUID (Red `A495BB10C5B14B44B5121370F02D74DE` … Pink `A495BB80…`), major = sıcaklık °F, minor = SG×1000 (16 bit big-endian), son bayt tx gücü — [kvurd.com](https://kvurd.com/blog/tilt-hydrometer-ibeacon-data-format/); iotexpert'in tablosu major/minor'u ters yazıyor ama kodu kvurd ile uyumlu — [iotexpert](https://iotexpert.com/tilt-hydrometer-advertising-scanner-part-3/)
- Tilt'i WiFi'ye taşıyan açık köprü TiltBridge (ESP32): Fermentrack, BrewPi Remix, Brewers Friend, Google Sheets, Brewfather (15 dk'da 1), Grainfather, BrewStatus, Taplist.io, TiltBridge Cloud, Home Assistant/MQTT; genel HTTP/JSON hedefi sayfada yok — [TiltBridge docs](https://tiltbridge.readthedocs.io/en/stable/User%20Guide/cloud_services.html)

**RAPT Pill (KegLand)**
- 73,90 AUD (18650 dahil) — [KegLand AU](https://www.kegland.com.au/green-rapt-pill-hydrometer-thermometer-wifi-bluetooth.html); KegLand EU 59,00 € (≈3.330 TL), "30+ in stock", AB içi kargo "from €12.99", Türkiye/AB dışı gönderim sayfada belirtilmemiş (2026-11-07) — [kegland.eu](https://kegland.eu/products/yellow-rapt-pill-hydrometer-thermometer-wifi-bluetooth)
- ±0,002 SG, ±0,2 °C; WiFi doğrudan ağa bağlanır ("Requires a 2.4gHz network"); Bluetooth ile RAPT Fermentation Chamber / Temperature Controller'a sıcaklık + yoğunluk verir; BT + 60 dk aralıkla ≈12 ay pil; 1–2 nokta kalibrasyon, fermantör içindeyken de — [KegLand AU](https://www.kegland.com.au/green-rapt-pill-hydrometer-thermometer-wifi-bluetooth.html)
- Data Streams (eski adı webhooks): "All RAPT users get one Data Stream per device"; en sık 15 dk'da bir; hazır hedefler Brewfather, Grainfather, Brew Meister, Wine Meister + "Custom" — [RAPT docs](https://docs.rapt.io/equipment/rapt-pill-hydrometer-or-user-guide/data-streams-formerly-webhooks.md)
- Custom Webhook gerçek örneği (BierBot): RAPT portalında "Custom Webhook", URL + method POST, JSON şablonu `"chipid": "@device_name"`, `"s_number_wort_0": @gravity`, `"s_number_temp_0": @temperature`, `"s_number_batterypercent_0": @battery`, `"s_number_wifi_0": @rssi` — [BierBot docs](https://docs.bierbot.com/hardware/hardware/raptpill)
- RAPT API `https://api.rapt.io` (Swagger, bearer token, My Account ▸ Api Secrets); "unsupported", uç noktalar "subject to change without notice"; External Device için "This requires a RAPT Subscription" — [RAPT External Device](https://docs.rapt.io/equipment/external-device)
- Pill BLE: Broadcast Mode "actively broadcasting a Bluetooth beacon" (kayıt / bağlanma için, ≤10 dk); Smart Mode'da BT ile her an bağlanma; varsayılan BT telemetri 5 dk, WiFi 60 dk — [RAPT llms-full](https://docs.rapt.io/llms-full.txt)

**Plaato**
- Kasım 2023'te ev bira hattını bıraktığını duyurdu; uygulama desteği Kasım 2025'e kadar; "without the app, they are rendered useless" — [Brewgr](https://newsletter.brewgr.com/p/keg-management-is-it-worth-it)
- Brewfather: Plaato "has been discontinued by the manufacturer"; bulut kapandıktan sonra Airlock yalnız topluluk projesi `open-plaato-keg` ile destekleniyor — [Brewfather Plaato](https://docs.brewfather.app/integrations/plaato)
- Brewblox 2024/02/23 sürümü `add-plaato` komutunu kaldırdı: "the Plaato API will be shut down" — [Brewblox release notes](https://brewblox.netlify.com/user/release_notes)

**Floaty, EasyDens**
- Floaty: "DIY free-floating digital hydrometer and thermometer ... operates on WiFi"; Brewer's Friend'e `log.brewersfriend.com/Floaty/[API KEY]` (Plato) ya da `/Floaty_sg/[API KEY]`, aralık ≥900 sn; üretici/fiyat/doğruluk sayfada yok — [Brewer's Friend docs](https://docs.brewersfriend.com/devices/floaty)
- Anton Paar EasyDens: 599 $ (≈29.960 TL); salınımlı U-tüp, ~2 mL örnek; sulu çözeltide 0,001 SG, ±0,3 °P; BLE → Brew Meister uygulaması; dışa aktarma CSV e-posta; API geçmiyor; Brew Meister RAPT Pill ve Tilt verisini de toplayabiliyor — [MoreBeer](https://morebeer.com/products/easydens-anton-paar)

**Doğruluk / kalibrasyon kanıtı**
- Yüzer cihaz ilkesi hidrometreyle aynı; yoğunluk sıcaklıkla değişir (10 °P örneği: 60 °C 1.027, 20 °C 1.040, 4 °C 1.041) → soğuk çöktürmede düzeltme şart; "a third order polynomial is good enough", çoğu zaman 2 nokta (su + OG) yeterli; ölçülmüş hata sayısı verilmemiş — [vito.tw (BrewPiLess yazarı)](http://www.vito.tw/posts/temperature-and-calibrating-ispindel/)
- Pratik sorunlar: aktif fermantasyonda maya cihazı oynatır, kapakta kuruyan maya ağırlık yapar (en çok küçük Tilt etkilenir); iSpindel ve Float WiFi'si kalın paslanmaz KegLand Keg Mentor'dan geçmedi; Tilt her fermantasyon öncesi yeniden kalibre edildi; sayısal referans karşılaştırması YOK — [Homebrew Academy](https://homebrewacademy.com/digital-wireless-hydrometer-thermometer/)
- Hakemli: MBAA TQ 59(3) 2022, Dowdy & Mosher — dört yoğunluk yönteminden "the hydrometer was the least accurate and precise instrument" (özet; diğer üç yöntemin adı ve sayılar özette yok) — [MBAA TQ](https://mbaa.com/publications/tq/tqPastIssues/2022/Pages/TQ-59-3-1014-01.aspx)

### Inferences
- Brewmaster'ın "gerçek verim / gerçek attenuation öğrenme" kolu için en değerli veri OG ve FG noktalarıdır; yüzer hidrometrenin mutlak doğruluğu (±0,002 iddia) hidrometre okumasıyla kalibre edilmeden kullanılmamalı; eğri biçimi (fermantasyon hızı, durma tespiti) mutlak değerden daha güvenilir sinyaldir. Bu, kaynakların ortak ima ettiği ama sayıyla kanıtlamadığı bir çıkarımdır.
- Her üç kaynakta da sıcaklık düzeltmesi ve cihaz başı kalibrasyon vurgulanıyor → Brewmaster tarafında "cihaz kalibrasyon kaydı" (su noktası + OG anındaki hidrometre okuması) tutmak ve öğrenme koluna yalnız kalibre edilmiş, kararlı (ör. 24 saat değişmeyen) FG'yi vermek mantıklı.
- Plaato örneği: bulut bağımlı cihaz üretici çekilince ölü. RAPT Pill de bulut bağımlı (WiFi verisi RAPT bulutundan geçer); GravityMon ise doğrudan Worker'a yazar → uzun ömür açısından GravityMon daha sağlam, kullanım kolaylığı açısından RAPT daha sağlam.

### Gaps
- iSpindel / GravityMon / RAPT Pill / Tilt için hidrometre ya da yoğunluk ölçere karşı BAĞIMSIZ sayısal hata ölçümü bulamadım (MBAA makalesinin tam metni okunamadı).
- "Cuckoo Tilt" adlı cihazın ne olduğu (üretici, fiyat) bulunamadı — yalnız GravityMon sürüm notunda geçiyor.
- "Platinum Tilt" adıyla bir ürün bulamadım; Tilt sitesi Tilt, Tilt Pro, Tilt Pro Mini, Pico, Pi, Spirits, Float, Repeater listeliyor (Tilt Pro'nun fiyatı ve çözünürlük formatı okunamadı).
- BrewJacket Immersion Pro'nun 2026 durumu doğrulanamadı (yalnız güvenilmez bir aynada "DISCONTINUED" ilanı görüldü — kaynak olarak kullanılmadı).
- Anton Paar SmartRef fiyatı / özellikleri okunmadı.
- RAPT Pill'in KegLand EU'dan Türkiye'ye gönderilip gönderilmediği, Türkiye'de bayi olup olmadığı bulunamadı. BiraBurada sayfası bu oturumda okunamadı (önceki denemede araç kullanımı kullanıcı tarafından reddedildi; tekrar denenmedi).

## 2. Web Bluetooth: PWA / APK bir BLE cihazını (Tilt, RAPT Pill, BLE termometre) doğrudan okuyabilir mi?

### Takeaway
Stok Chrome Android'de bir PWA, Tilt gibi yalnız YAYIN (advertisement / iBeacon) yapan cihazları OKUYAMAZ: tarama API'si (requestLEScan) bayrak arkasında ve yarım, watchAdvertisements() ise "not planned to be shipped". Web Bluetooth yalnız kullanıcının seçiciden seçip GATT ile BAĞLANDIĞI cihazlarda çalışır; Android WebView'da hiç yok.

### Cited Findings
- requestLEScan ("Advertisements Scanning") için `chrome://flags/#enable-experimental-web-platform-features` gerekli, durum "Partial development"; watchAdvertisements() Android 85'ten beri bayraklı; "Android WebView: Will be supported in the future" (yani şu an yok) — [WebBluetoothCG implementation-status](https://github.com/WebBluetoothCG/web-bluetooth/blob/main/implementation-status.md)
- blink-dev Intent to Ship (22 Haziran 2020, 3 LGTM) → son mesaj 10 Ekim 2023: "BluetoothDevice.watchAdvertisements() is not planned to be shipped." — [blink-dev](https://groups.google.com/a/chromium.org/g/blink-dev/c/lqCQ63CTKEQ)
- requestDevice kullanıcı hareketi (tıklama) + HTTPS ister; `manufacturerData` filtresi Chrome 92'den beri; requestLEScan "What's next / still incomplete" — [Chrome Developers](https://developer.chrome.com/docs/capabilities/bluetooth)
- Tarayıcıdan Web Bluetooth ile BLE GATT işi pratikte yapılabiliyor: Xiaomi LYWSD03MMC termometreye pvvx firmware'i tarayıcıdaki Telink flasher sayfasıyla yükleniyor ("a browser that supports Web Bluetooth"); ancak yükleme sonrası veri BTHome yayınıyla (advertisement) gelir — [privatehomelab](https://privatehomelab.com/xiaomi-lywsd03mmc-home-assistant-local-pvvx-bthome/)
- Brewmaster APK'nın paketleme türü (TWA mı WebView mi) repoda kayıtlı değil: "APK paketleme: repoda TWA/WebView yapılandırması YOK → bilinmiyor" — yerel dosya `/home/claude/brewmaster/gorevler/SPRINT_GECMISI.md` (MASH1 notu)

### Inferences
- Tilt'i Brewmaster'a bağlamanın PWA-içi yolu yok; ya Tilt'in kendi uygulaması / Tilt Pico (45 $) / TiltBridge (ESP32) gibi bir köprü → bulut → Worker, ya da APK'ya yerel (native) BLE tarama eklentisi gerekir (ör. Capacitor tabanlı bir sarmalayıcı — bu, mevcut paketlemenin değişmesi demektir; maliyeti L). Kaynakla doğrulanmış bir "PWA'dan Tilt okuma" yolu bulunamadı.
- APK bir WebView sarmalayıcıysa Web Bluetooth tümüyle yok; TWA ise Chrome ile aynı kısıtlar geçerli. Önce APK türünü cihazda doğrulamak gerekiyor.
- GATT ile bağlanılabilen cihazlar (ör. "Open-source Bluetooth" diyen Hanna HALO2 pH cihazı, bkz. bölüm 5) teorik olarak PWA'dan okunabilir; ama her ölçümde kullanıcının seçiciden cihaz seçmesi gerekir (otomatik arka plan kaydı değil).
- Sonuç: Brewmaster için "otomatik veri" pratikte WiFi cihaz → HTTP POST → Worker yolundan gelir; BLE yolu ALMA (şimdilik).

### Gaps
- RAPT Pill'in BLE GATT servis/karakteristik yapısı kamuya açık mı, PWA'dan bağlanılabilir mi bulunamadı.
- Chrome 2026 sürümlerinde requestLEScan'in bayrak durumu için güncel (2026 tarihli) birincil kaynak bulunamadı; implementation-status sayfası tarihsiz.

## 3. Sıcaklık kontrolcüleri ve kontrol yazılımları (Inkbird, RAPT TC, BrewPi/Brewblox, Fermentrack, BrewPi-Remix, CraftBeerPi 4, Shelly, Sonoff/Tasmota/ESPHome)

### Takeaway
Fermantasyon sıcaklığını TUTMAK için en ucuz ve sağlam araç kapalı-kutu Inkbird ITC-308 (WiFi'siz); ama Inkbird'in WiFi modeli veri vermek için kötü bir kaynak (kapalı uygulama, Tuya, değer hataları, ESPHome için lehim). Veri isteniyorsa sıcaklığı zaten hidrometre (RAPT / iSpindel) gönderiyor. Raspberry Pi gerektiren yazılımlar (Brewblox, Fermentrack, CraftBeerPi 4) Brewmaster'ın Worker mimarisiyle çakışıyor; açık, yerel API'li tek ucuz kontrol aygıtı Shelly + Sensor Add-On.

### Cited Findings
**Inkbird**
- ITC-308 35,99 $ (US) / EU 38,99 $ (≈1.950 TL); ITC-308-WIFI 50,99 $ (US) / EU 49,99 $ (≈2.500 TL); ±1 °C; çift çıkış (ısıtma + soğutma), 220 V'ta en çok 2200 W; uzaktan izleme "INKBIRD app"; 2,4 GHz WiFi gerekli (kullanıcı yorumu); API / veri dışa aktarma belirtilmemiş (2026-11-07) — [Inkbird](https://inkbird.com/products/itc-308-wifi)
- Hepsiburada: "Ink Bird ITC-308 Sıcaklık Kontrol Cihazı (Wi-Fi)" 4.849 TL (3 × 1.616 TL), satıcı sayfada net değil (2026-11-07) — [Hepsiburada](https://www.hepsiburada.com/ara?q=inkbird+itc-308)
- Amazon.com.tr'de ITC-308 (110 V), "Inkbird WiFi ITC-308", "ITC-308-WIFI ... 220V", ITC-308S ilanları arama sonucunda görünüyor; fiyat sayfaları robots nedeniyle okunamadı — [Amazon.com.tr ITC-308-WIFI 220V](https://www.amazon.com.tr/Inkbird-termostat%C4%B1-ITC-308-WiFi-reg%C3%BClat%C3%B6r%C3%BC-%C3%BCzerinden/dp/B07MG45T73); Akakçe'de "inkbird itc-308" sonucu yok — [Akakçe](https://www.akakce.com/arama/?q=inkbird+itc-308)
- ITC-308-WIFI içi: eski üniteler Tuya TYWE3S (ESP8266), yeniler Tuya WBR3S (Realtek RTL8720DN) — "as of late 2023, LibreTiny, and therefore ESPHome, do not offer support for this particular chipset"; ESP12-S lehimlenerek değiştirilebilir, zorluk "Soldering required (4/5)"; Tuya datapoint'leri 104 sıcaklık (×0,1 °C), 106 set noktası, 115 röle (1 soğutma / 2 kapalı / 3 ısıtma) — [ESPHome devices](https://devices.esphome.io/devices/Inkbird-ITC-308-WIFI/)
- Home Assistant forumu (Ara 2020 – Mar 2021): ITC-308-WIFI Smart Life'ta çalışıyor ama HA Tuya entegrasyonunda sıcaklık ve set noktası yanlış geliyor; bölen ayarıyla düzelip sıcaklık değişince "totally wrong again" — [HA community](https://community.home-assistant.io/t/tuya-inkbird-itc-308-wifi-shows-wrong-state-data/250872)

**RAPT Temperature Controller / Fermentation Chamber**
- Pill, Bluetooth ile bu cihazlara bağlanıp sıcaklık sensörü olarak kullanılabiliyor ("Bluetooth telemetry control requires a compatible RAPT device such as a Fermentation Chamber or Temperature Controller") — [RAPT llms-full](https://docs.rapt.io/llms-full.txt); [KegLand AU](https://www.kegland.com.au/green-rapt-pill-hydrometer-thermometer-wifi-bluetooth.html)

**Brewblox / BrewPi Spark**
- Son sürüm notu 2024/03/26; Spark 4 2021'de çıktı; Tilt ve Tilt Pro servisi var; iSpindel / RAPT notlarda geçmiyor; fiyat / satış durumu yok — [Brewblox release notes](https://brewblox.netlify.com/user/release_notes)

**Fermentrack**
- "can track Tilt Hydrometers and iSpindel specific gravity sensors"; 1.063 commit, 81 açık issue; sayfada son sürüm tarihi ya da kullanımdan kaldırma notu görünmüyor — [GitHub thorrak/fermentrack](https://github.com/thorrak/fermentrack)

**CraftBeerPi 4**
- cbpi4 4.7.7 (13 Eylül 2026), 4.7.4 (28 Şubat 2026), 4.7.3 (8 Şubat 2026) → aktif geliştiriliyor — [PyPI cbpi4](https://pypi.org/project/cbpi4/); GravityMon CraftbeerPi'ye `http://<sunucu>/api/hydrometer/v1/data` ile eklentiyle gönderebiliyor — [GravityMon services](https://mp-se.github.io/gravitymon/services.html)

**BrewPi-Remix / Brewpiless**
- GravityMon BrewPi Remix'e `brewpi-api.php`, Brewpiless'a `http://ip/gravity` ile gönderebiliyor (yerel sunucu gerekir) — [GravityMon services](https://mp-se.github.io/gravitymon/services.html)

**Shelly (Gen2/Gen3) + Sensor Add-On**
- Add-On'u destekleyenler: Plus1, Plus1PM, Plus2PM, PlusI4, Plus10V, Shelly1G3, 1PMG3, 2PMG3, I4G3 vb.; DS18B20, DHT22, analog/dijital giriş; bileşen kimliği 100–199 (`temperature:100`), yerel RPC `<Component>.GetStatus()`; doğruluk bilgisi yok — [Shelly API docs](https://shelly-api-docs.shelly.cloud/gen2/Addons/ShellySensorAddon)

### Inferences
- Kaan'ın kontrol ihtiyacı ile veri ihtiyacı ayrılmalı: kontrol için WiFi'siz ITC-308 yeterli; veri için hidrometrenin kendi sıcaklık sensörü (RAPT ±0,2 °C) zaten sıvı içinden ölçüyor — Inkbird WiFi'ye 4.849 TL vermek veri açısından katkı sağlamaz.
- Shelly Plus 1 + Add-On + DS18B20, tek açık ve yerel API'li "röle + sensör" çözümü; ama Brewmaster bulutta (Worker) olduğu için Shelly'nin yerel RPC'si doğrudan işe yaramaz — Shelly'nin dışarı (Worker URL'sine) olay bildirimi göndermesi gerekir (Webhook/Script). Bu yetenek bu oturumda doğrulanamadı (bkz. Gaps).
- Sonoff/Tasmota/ESPHome yolu teknik olarak mümkün ama Kaan kod/lehim yapmadığı için bakım riski yüksek; doğrudan kaynak araştırması yapılmadı.

### Gaps
- Shelly Gen2 Webhook belgesi (`shelly-api-docs.shelly.cloud/gen2/ComponentsAndServices/Webhook`) bu oturumda açılamadı: istek izin beklemesinde zaman aşımına uğradı ("The user did not answer an earlier permission request in time"). Shelly'nin HTTPS URL'ye olay ile POST/GET atıp atamadığı ve şablon değişkenleri DOĞRULANMADI.
- Shelly Plus 1 / Add-On'un Türkiye fiyatı bulunamadı (yalnız AB/İngiltere satıcıları çıktı).
- Inkbird uygulamasının Tuya tabanlı olup olmadığı birincil kaynakla doğrulanamadı (HA forumu yalnız Smart Life ile çalıştığını gösteriyor). Tuya Cloud API'nin ücretli/ücretsiz durumu araştırılmadı.
- KegLand RAPT Temperature Controller ve Fermentation Chamber fiyatları okunmadı.
- BrewPi-Remix ve Sonoff/Tasmota için ayrı birincil kaynak okunmadı.

## 4. Bulldog Brewer (all-in-one): bağlantı ya da kontrolcü değişimi var mı?

### Takeaway
Bulldog Brewer için WiFi/Bluetooth, uygulama ya da yedek/akıllı kontrolcü hakkında HİÇBİR kaynak bulamadım; aramalar yalnız Bulldog Brews bira kitlerini ve Grainfather/BrewZilla kontrolcülerini getirdi.

### Cited Findings
- "Bulldog Brewer" aramaları Bulldog Brews kit ürünlerine çıkıyor (ör. Brew2Bottle kit sayfaları), cihaz bağlantısına değil — [Brew2Bottle](https://brew2bottle.co.uk/products/bulldog-brews-standard-beer-kits)
- jimsbeerkit'te bulunan konu Grainfather Connect uygulamasıyla ilgili (Kasım 2020), Bulldog'u anmıyor — [jimsbeerkit](https://www.jimsbeerkit.co.uk/forum/viewtopic.php?p=853759)
- Brewmaster'ın kendi notları Bulldog'u "ısıtıcılı all-in-one, 10–12 L" olarak modelliyor; ısıtma hızı alanı yok — yerel dosya `/home/claude/brewmaster/gorevler/SPRINT_GECMISI.md` (MASH1)

### Inferences
- Bulldog'un kendi kontrolcüsünden veri almak bilinen bir yol değil; brew-day (mash) sıcaklık kaydı için ayrı bir sensör gerekir (ör. suya dayanıklı DS18B20 + Shelly/ESP ya da Brewmaster'daki mevcut elle/sesle ölçüm kaydı). Bu alan için yeni donanım almak, fermantasyon verisine göre düşük öncelikli.

### Gaps
- Bulldog Brewer'ın üretici sayfası, kullanım kılavuzu, kontrolcü modeli, eleman gücü bulunamadı. Kaan'dan cihazın tam model adı / etiket fotoğrafı gerekir.

## 5. Diğer sensörler (pH, refraktometre, CO2 / airlock sayacı, yük hücresi, BLE termometreler)

### Takeaway
Bu kategoride Brewmaster'a OTOMATİK veri getiren ucuz ve doğrulanmış bir cihaz yok: Bluetooth pH (Hanna HALO2, 165 $) ve EasyDens (599 $) kendi uygulamasına bağlı; airlock sayaçları (Plaato bitti, Brew Bubbles eski) zayıf; yük hücresi araştırılamadı. Ucuz BLE ortam termometreleri (Xiaomi + pvvx) yayınla çalıştığı için PWA'dan okunamaz.

### Cited Findings
- Hanna HALO2 (HI9810312) bira pH test cihazı: 164,99 $ (≈8.250 TL); ±0,05 pH; çözünürlük 0,01; "Open-source Bluetooth allows easy integration into current data logging systems"; Hanna Lab App; BT açıkken 500 saat — [Hanna](https://hannainst.com/halo2-wireless-beer-ph-tester.html)
- EasyDens: 599 $, BLE, Brew Meister, CSV dışa aktarma, API yok — [MoreBeer](https://morebeer.com/products/easydens-anton-paar)
- Brewfather Custom Stream şeması `ph`, `bpm` (kabarcık/dk), `pressure`, `volume`, `count` alanlarını da taşıyor — yani bu sensörler için de-facto bir veri yeri var — [Brewfather Custom Stream](https://docs.brewfather.app/integrations/custom-stream)
- Plaato Airlock: üretici bıraktı, bulut kapandı, yalnız `open-plaato-keg` topluluk yolu — [Brewfather Plaato](https://docs.brewfather.app/integrations/plaato)
- Brew Bubbles (Lee C. Bussy, ESP8266 airlock sayacı): dokümantasyon telifi 2019–2021, ayar sayfası yalnız WiFi kurulumu anlatıyor — [Brew Bubbles docs](https://brew-bubbles.readthedocs.io/en/devel/setup/index.html)
- Xiaomi LYWSD03MMC + pvvx: tarayıcıdan Web Bluetooth ile firmware; BTHome v2 yayını; kalibrasyon ofseti; fiyat / doğruluk sayfada yok — [privatehomelab](https://privatehomelab.com/xiaomi-lywsd03mmc-home-assistant-local-pvvx-bthome/)
- Homebrew Academy incelemesinde Inkbird termometre/higrometre kaydedici 29,99 $; sıcaklık doğruluğu "questionable" — [Homebrew Academy](https://homebrewacademy.com/digital-wireless-hydrometer-thermometer/)

### Inferences
- Kabarcık sayımı (bpm) fermantasyonun yoğunluk yerine dolaylı göstergesi; yüzer hidrometre varken Brewmaster öğrenme kolu için ek değeri düşük.
- pH için Brewmaster'da zaten elle/sesle ölçüm kaydı var (MASH1); HALO2'nin "open-source Bluetooth" iddiası GATT ile PWA'dan okumayı mümkün kılabilir, ama protokol belgesi okunmadı → İZLE.

### Gaps
- Hanna HALO2 BLE protokolünün (GATT servis UUID'leri) belgesi bulunamadı/okunmadı.
- Uygulamalı refraktometreler (Anton Paar SmartRef vb.) fiyat ve veri çıkışı okunmadı.
- Keg seviyesi için yük hücresi (HX711 + ESP, ticari keg tartıları) araştırılmadı.
- Inkbird IBT / Govee BLE termometrelerinin yayın formatı ve GATT okunabilirliği araştırılmadı.

## 6. Toplayıcılar / standartlar (Brewfather Custom Stream, Brewer's Friend, iSpindel JSON, RAPT webhook, MQTT/Home Assistant) ve Cloudflare Worker'a bağlama yolu

### Takeaway
Sektörde iki fiili standart var: (1) iSpindel JSON (GravityMon, iSpindel, Floaty benzeri cihazlar) ve (2) Brewfather Custom Stream JSON (çok alanlı, `name` zorunlu, 15 dk'da en çok 1). RAPT bulutu şablonlu özel webhook ile istenen URL'ye POST atabiliyor. Brewmaster Worker'ı bu iki biçimi kabul eden tek bir `/ingest` ucu açarsa iSpindel/GravityMon, RAPT Pill ve (köprü üzerinden) Tilt verisi aynı yoldan gelir; ücretsiz KV sınırı (1.000 yazma/gün) 15 dk aralıkla rahat yeter ama mevcut yazımlarla paylaşılır.

### Cited Findings
- Brewfather Custom Stream: `POST https://log.brewfather.net/stream?id=…`, `Content-Type: application/json`; yalnız `name` zorunlu, en az bir değer alanı; alanlar temp, aux_temp, ext_temp, temp_unit (C/F/K), gravity, gravity_unit (G/P), pressure(+unit), ph, bpm, battery, angle, rssi, count, volume(+unit), device_state, temp_target, gravity_target, hysteresis, device_source, report_source…; "Never log more than once every 15 minutes per device name" — [Brewfather Custom Stream](https://docs.brewfather.app/integrations/custom-stream)
- iSpindel biçimi (GravityMon HTTP POST örneği): `name`, `ID`, `token`, `interval`, `temperature`, `temp_units`, `gravity`, `angle`, `battery`, `rssi`, ek alanlar `corr-gravity` (sıcaklık düzeltmeli), `gravity-unit` (G/P), `run-time` — [GravityMon data formats](https://mp-se.github.io/gravitymon/v0.9/data.html)
- GravityMon Brewfather'a iSpindel ucu `log.brewfather.net/ispindel?id=…` ile de gidebilir; SG için cihaz adı "[SG]" ile bitmeli, yoksa Plato varsayılır; Brewer's Friend `/ispindel` ya da `/ispindel_sg` + API anahtarı; MQTT ile Home Assistant otomatik keşif (ESP8266'da RAM nedeniyle önerilmiyor) ve BrewBlox `brewcast/history` — [GravityMon services](https://mp-se.github.io/gravitymon/services.html)
- RAPT Custom Webhook: POST, JSON şablonunda `@device_name`, `@gravity`, `@temperature`, `@battery`, `@rssi` — [BierBot docs](https://docs.bierbot.com/hardware/hardware/raptpill); cihaz başına 1 stream, 15 dk'da en çok 1 — [RAPT docs](https://docs.rapt.io/equipment/rapt-pill-hydrometer-or-user-guide/data-streams-formerly-webhooks.md)
- TiltBridge Brewfather'a 15 dk'da 1, Google Sheets'e 10 dk'da 1 gönderiyor — [TiltBridge docs](https://tiltbridge.readthedocs.io/en/stable/User%20Guide/cloud_services.html)
- Brewer's Friend Floaty ucu: `log.brewersfriend.com/Floaty/[API KEY]`, aralık ≥900 sn — [Brewer's Friend docs](https://docs.brewersfriend.com/devices/floaty)
- Cloudflare KV Free: 100.000 okuma/gün, "1,000 writes per day" (farklı anahtarlara), aynı anahtara 1/sn, 1 GB depolama, değer ≤25 MiB; çağrı başına 1.000 işlem — [Cloudflare KV limits](https://developers.cloudflare.com/kv/platform/limits)

### Inferences
- Önerilen Worker ucu (efor S): `POST /ingest/<cihaz-gizli-anahtarı>`; gövde iSpindel JSON (`angle`+`gravity`+`temperature`+`temp_units`) ya da Brewfather Custom Stream (`name`+`gravity`+`gravity_unit`+`temp`) ya da RAPT şablonu ise ayrıştır, birimi SG/°C'ye çevir, en son okumayı ve partiye bağlı seriyi sakla. Gizli anahtar URL'de (repo public olduğu için anahtar kodda tutulmaz; Worker secret / KV'de). iSpindel JSON'da `token` alanı zaten var (bkz. GravityMon formatı).
- KV hesabı: 1 cihaz × 15 dk = 96 yazma/gün; anahtar başına değil gün başına sınır olduğu için mevcut push / cron yazımlarıyla toplam ≤1.000 kalmalı. Seriyi her okumada ayrı anahtar yerine günlük tek bir R2 nesnesine eklemek ya da birkaç okumayı biriktirmek daha güvenli (R2 limitleri bu oturumda okunmadı).
- 5 dk cron, son okuma zamanını kontrol edip "veri kesildi" (pil bitti / WiFi yok) ve "FG sabitlendi" alarmı üretebilir → Web Push; böylece Brewmaster'ın öğrenme kolu (maya attenuation, verim) otomatik FG adayına kavuşur (Kaan onayıyla).
- Brewfather'ı ara katman yapmak gereksiz: hem 15 dk kısıtı hem ek hesap; cihazlar zaten doğrudan özel URL'ye yazabiliyor (GravityMon, RAPT).
- Firebase RTDB'ye doğrudan cihazdan yazmak yerine Worker üzerinden geçmek, RTDB güvenlik açığını (CLAUDE.md'de "Firebase RTDB güvenliği" açık iş) büyütmemek için tercih edilmeli (çıkarım).

### Gaps
- Workers Free günlük istek sınırı bu oturumda birincil kaynaktan okunmadı (KV sayfası listelemiyor).
- `workers.dev` alan adına düz HTTP (TLS'siz) POST'un kabul edilip edilmediği doğrulanmadı; ESP8266'da TLS sorun çıkarabildiği için önemli (GravityMon "optional SSL" destekliyor ama ESP8266 SSL çökme notu var).
- Brewfather'ın okuma çıkış API'si (Brewfather'dan Brewmaster'a veri çekme) araştırılmadı.
- RAPT Custom Webhook'un özel başlık (Authorization) desteği ve tam değişken listesi birincil RAPT belgesinden okunamadı (yalnız BierBot örneği).

## 7. Kaan için en ucuz sağlam yol (TR fiyat tahmini, nereden alınır) ve cihaz envanteri kararları

### Takeaway
Kaan kod ve lehim yapmadığı için en ucuz SAĞLAM yol: RAPT Pill (KegLand EU 59 € + kargo; ≈3.300 TL + kargo + gümrük) → RAPT Custom Webhook → Brewmaster Worker. Bulut bağımlılığı istenmiyorsa ikinci yol: hazır iSpindel (Tindie 58 $) ya da yerelde birine yaptırılmış iSpindel + GravityMon → doğrudan Worker. Tilt, Inkbird WiFi, Brewblox/Fermentrack/CraftBeerPi ve Plaato Kaan için ALMA. Türkiye'de bu hidrometrelerin satıldığı doğrulanmış bir yerel mağaza bulamadım; Ocak 2026'dan beri yurt dışı siparişlerde 30 € muafiyeti kalktı.

### Cited Findings
- Türkiye'de 30 € gümrük muafiyeti kaldırıldı (4458 sayılı Kanun md. 126'dan "30 Avro'ya aşan ancak" ibaresi çıkarıldı; Cumhurbaşkanı Kararı 10813, Ocak 2026; yürürlük tarihi makalede çelişkili: 6 Ocak 2026 / yayımdan 30 gün sonra); yeni vergi oranları makalede yok — [Webrazzi](https://webrazzi.com/2026/01/07/yurt-disi-alisverislerde-gumruk-muafiyeti-kaldirildi-30-euro-limiti-tarihe-karisti/)
- Bir haber başlığı "Çinli platformlardan kargo ile alışveriş fiilen sonlandırıldı" diyor (yalnız başlık görüldü, metin okunmadı) — [Ekonomi Gazetesi](https://www.ekonomigazetesi.com/ekonomi/cinli-platformlardan-kargo-ile-alisveris-fiilen-sonlandirildi-69316)
- RAPT Pill KegLand EU 59,00 €, stokta, AB içi kargo 12,99 €'dan; Türkiye belirtilmemiş — [kegland.eu](https://kegland.eu/products/yellow-rapt-pill-hydrometer-thermometer-wifi-bluetooth)
- Hazır iSpindel Tindie 58 $, pil hariç, Türkiye kargo ücreti tanımsız — [Tindie](https://www.tindie.com/products/nautilis/ispindel-pill-electronic-hydrometer)
- DIY ana parçalar TR: Wemos D1 Mini 175,43 TL ([direnc.net](https://www.direnc.net/wemos-d1-mini-nodemcu-lua-wifi-esp8266-board-klon)) + MPU6050 121,98 TL ([Robotistan](https://www.robotistan.com/mpu6050-6-eksen-ivme-ve-gyro-sensoru-6-dof-3-axis-accelerometer-and-gyros)) = ≈297 TL (2026-11-07); GravityMon tarayıcıdan yüklenir (web.brewflasher.com) — [GitHub mp-se/gravitymon](https://github.com/mp-se/gravitymon)
- Inkbird ITC-308-WIFI Hepsiburada 4.849 TL; ITC-308 (WiFi'siz) EU 38,99 $ — [Hepsiburada](https://www.hepsiburada.com/ara?q=inkbird+itc-308); [Inkbird](https://inkbird.com/products/itc-308-wifi)
- Tilt 135 $ + Pico 45 $ — [tilthydrometer.com](https://tilthydrometer.com/)

### Inferences
Envanter (karar = çıkarım; fiyatlar yukarıdaki kaynaklı satırlardan, TL kaba çevrim, kargo/gümrük hariç):

| Cihaz / yazılım | Ölçer | Fiyat (tarih) | 2026 durumu | Protokol / veri yolu | Brewmaster yolu | Efor | Karar |
|---|---|---|---|---|---|---|---|
| RAPT Pill | SG + °C (±0,002 / ±0,2 °C iddia) | 59 € ≈ 3.330 TL (kegland.eu, 2026-11-07) | Satışta | WiFi → RAPT bulutu → Custom Webhook (POST, @değişkenler); API "unsupported" | Webhook → Worker `/ingest` | S | AL (Kaan için en kolay; bulut riski kabul edilerek) |
| iSpindel donanımı + GravityMon | açı → SG + °C | parçalar ≈297 TL + pil/şarj/tüp (fiyatsız); hazır 58 $ ≈ 2.900 TL (Tindie) | GravityMon v2.5.0 Haz 2026, aktif | WiFi doğrudan HTTP POST (iSpindel JSON / özel şablon), MQTT; ESP32'de BLE | Doğrudan Worker | S (yazılım) + kurulum/kalibrasyon M | DENE (bulutsuz, uzun ömürlü; lehim için yardım ya da hazır alım şart) |
| Tilt (+ Pico/TiltBridge) | SG + °C | 135 $ + 45 $ ≈ 9.000 TL | Satışta | BLE iBeacon; PWA okuyamaz; köprü → Brewfather/Sheets | Köprü → Brewfather/özel? | M–L | ALMA (pahalı, köprü şart, PWA BLE yok) |
| Plaato Airlock/Keg | bpm / keg | — | Üretim ve bulut bitti | yalnız open-plaato-keg | — | — | ALMA |
| Floaty | SG + °C | bulunamadı | Brewer's Friend listeliyor | WiFi HTTP | ? | ? | İZLE (bilgi yetersiz) |
| EasyDens | yoğunluk (0,001 SG) | 599 $ ≈ 29.960 TL | Satışta | BLE → Brew Meister, CSV | Elle CSV içe aktarma | M | ALMA (fiyat/getiri) |
| Inkbird ITC-308 (WiFi'siz) | kontrol (±1 °C) | 38,99 $ ≈ 1.950 TL (EU, inkbird.com) | Satışta | veri yok | yok (yalnız kontrol) | — | AL (yalnız sıcaklık tutmak gerekiyorsa) |
| Inkbird ITC-308-WIFI | kontrol + uzaktan izleme | 4.849 TL (Hepsiburada) | Satışta | kapalı uygulama / Tuya; ESPHome için lehim | zor (Tuya bulutu) | L | ALMA (veri kaynağı olarak) |
| Shelly Plus 1 + Add-On + DS18B20 | röle + °C | TR fiyatı bulunamadı | Satışta (AB) | yerel RPC; dışa webhook doğrulanmadı | Shelly → Worker (doğrulanırsa) | M | İZLE (soğutucu/ısıtıcı otomasyonu gündeme gelirse) |
| Brewblox / Spark 4 | kontrol + kayıt | bulunamadı | son not Mar 2024 | yerel sunucu (Pi) | — | L | ALMA |
| Fermentrack | kontrol + kayıt | ücretsiz yazılım | durum belirsiz | Raspberry Pi | — | L | ALMA |
| CraftBeerPi 4 | brew-day otomasyon | ücretsiz | aktif (4.7.7 Eyl 2026) | Raspberry Pi | — | L | ALMA (Bulldog'un kendi kontrolcüsü var) |
| Hanna HALO2 pH | pH (±0,05) | 164,99 $ ≈ 8.250 TL | Satışta | BLE ("open-source Bluetooth") | PWA GATT (doğrulanmadı) | M | İZLE |
| Xiaomi LYWSD03MMC + pvvx | oda °C/nem | bulunamadı | topluluk firmware | BLE yayın (BTHome) | PWA okuyamaz | — | ALMA (Brewmaster için) |
| Brew Bubbles | bpm | — | dokümanlar 2019–2021 | ESP8266 WiFi | ? | M | ALMA |

- Kaan için sıralı öneri: (1) Worker'a `/ingest` ucu (S, ücretsiz) — cihazdan bağımsız, önce bu; (2) RAPT Pill (KegLand EU siparişi; Türkiye'ye gönderim ve gümrük, sipariş öncesi KegLand'e sorulmalı) ya da Türkiye'den biri hazır iSpindel yapıyorsa o; (3) kalibrasyon: su noktası + OG anında hidrometre okumasıyla 2 nokta, Brewmaster'da cihaz kalibrasyon kaydı; (4) öğrenme koluna otomatik FG yalnız "N saat sabit + Kaan onayı" ile girsin.
- Toplam en düşük nakit: hazır cihazda ≈3.300 TL (RAPT, kargo + gümrük hariç); DIY'da parça ≈297 TL + eksik parçalar, ama lehim emeği ve kalibrasyon riski Kaan'ın profiline uymuyor.

### Gaps
- Yurt dışından gelen pakette güncel vergi oranı (AB/AB dışı) ve KegLand EU'nun Türkiye'ye gönderim yapıp yapmadığı doğrulanamadı → RAPT'ın gerçek TL maliyeti BİLİNMİYOR.
- iSpindel DIY'ın eksik parçaları (DS18B20, 18650 hücre + yuva, TP4056 şarj kartı, PET tüp, direnç, anahtar) için TR fiyatları okunmadı.
- BiraBurada, Hepsiburada, Trendyol, Amazon.com.tr'de RAPT Pill / Tilt / iSpindel ilanı doğrulanamadı (Trendyol ve Amazon robots engeli; BiraBurada denenmedi).
- AliExpress'in 2026'da Türkiye'ye fiilen gönderim yapıp yapmadığı yalnız bir haber başlığına dayanıyor; doğrulanmadı.
