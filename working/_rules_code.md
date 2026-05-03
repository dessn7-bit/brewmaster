# KURAL Code — Brewmaster Sprint Disiplin Kuralları

**Oluşturma:** 2026-05-04
**Kaynak:** Adım 18c-1c-1 → 18c-1c-5 öz-değerlendirme (82 hata)
**Amaç:** Bu sprintten sonraki tüm dataset/parser/feature işlerinde uygulanacak yazılı disiplin kuralları. Bu dosya kalıcıdır. Yeni hata tipleri çıkarsa bu dosyaya eklenir, eski kurallar silinmez (revize edilirse versiyon notu düşülür).

**Yasak sözcük listesi (raporlarda):** "VAR", "PASS", "OK", "doğru", "tamam", "✓", "✗", "✅", "❌", "geçti", "kaldı", "başarılı", "başarısız". Bunlar anlamsız onay tonu yaratır; yerine sayı + kaynak (dosya:satır, dataset query) kullanılır. Bu dosyanın kendisi de bu kurala uyar — yasak sözcükler sadece "yasak listesi" tanımı içinde geçer.

---

## Bölüm 1 — Ölçüm doğruluğu

### Kural 1.1 — FP testi raw.yeast field'ına uygulanır
Yeast pattern FP/TP testi `raw.yeast` (veya raw.yeast_name / raw.recipe.yeast.name) field'ında çalıştırılır. `non_yeast` veya başka birleşik field'da çalışan test sonucu bağlamsızdır, sayım yanıltır.

**Örnek:** Aşama 1'de pattern bell.{0,3}s\\s+oberon raw.yeast'te 22 reçete yakalıyorsa, aynı pattern raw.notes'ta 47 reçete yakalayabilir — bu 47'nin %X TP olduğu yeast pattern testi DEĞİL.

**İhlal referansı:** Hata 1, 2, 60.

### Kural 1.2 — Sayım tek seferde 3 kaynaktan ölçülür
Bir reçete sayısı raporlanmadan önce: (a) kaynak dosyada doğrudan filter, (b) bağımsız script ile recompute, (c) örneklem kontrolü ile beklenen aralık karşılaştırması yapılır. 3 ölçüm uyuşmuyorsa SAYI YAYIMLANMAZ, kök sebep bulunur.

**Örnek:** "21/21 TP" iddiası sonradan ~19 çıkmıştır (sample yeniden açılmamış, regex extract bug'ı). Çıkan iki sayı kaydedilmeli, üçüncü kaynak istenir.

**İhlal referansı:** Hata 4, 31, 33, 34.

### Kural 1.3 — Önceki sprint metric'i devralırken sorgulanır
Bir sprintten gelen sayı (ör. "Aşama 2.7 32574 yakalama") yeni sprintte kullanılacaksa, ilk iş o sayıyı kendi script'inle yeniden hesaplamaktır. Devralınan sayı sprint kararına input olamaz.

**Örnek:** Adım 18c-1c-2 Aşama 2.7'nin "yakalama" metric'i Adım 18c-1c-5'te recompute edilmeden devralındı.

**İhlal referansı:** Hata 2, 60, 61, 62.

### Kural 1.4 — "Reçete silindi" vs "feature flag 1→0 yapıldı" ayrımı zorunlu
Dataset'ten reçete silinmesi ile flag güncellenmesi farklı işlemler. Yanlış terminoloji etki büyüklüğü algısını çarpıtır.

**Atıf:** V28 anomali rapor terminoloji düzeltmesi 03.05.2026.

---

## Bölüm 2 — Pattern tasarım disiplini

### Kural 2.1 — Boşluk/punktuasyon varyant zorunlu
Yeast brand pattern yazılırken: `BRAND\s+CODE`, `BRANDCODE` (boşluksuz), `BRAND-CODE` (tireli), `BRAND.CODE` (noktalı), `BRAND['s]?\s+CODE` (apostroflu) varyantlarının her biri test edilir. Pattern tek varyant ile yazılırsa eksik yakalar; aşırı geniş yazılırsa FP üretir.

**Örnek:** WLP 802 boşluklu varyantı pattern'e geç eklenmiş (Aşama 2.5). bell.{0,3}s\s+oberon → bell['s]?\\s+oberon önerilir (sınır netliği).

**İhlal referansı:** Hata 13, 53, 55, 57, 59.

### Kural 2.2 — Pattern compile başarısı geçerli anlam değildir
Regex'in syntax açısından compile etmesi anlamın geçerli olduğunu göstermez. Pattern compile sonrası: (a) gerçek dataset'te 5+ örnek üzerinde TP kontrolü, (b) 5+ negatif örnek üzerinde FP kontrolü, (c) sınır vakaları (boşluksuz, eksik harf, ek karakter) ayrı raporlanır.

**Örnek:** "Pattern compile" → "test sonucu yeterli" zinciri Adım 18c-1c-3'te bağlantısız raporlandı. Compile = sadece syntax. Anlam = dataset spot test.

**İhlal referansı:** Hata 49, 50, 82.

### Kural 2.3 — Sentetik test dataset doğrulama yerine geçmez
Test fixture'ında "115/115 yakalama" gibi sayı, gerçek dataset'te aynı oranı garanti etmez. Sentetik test ayrı raporlanır, gerçek dataset spot testi (raw.yeast'ten random 5+ reçete) ayrı raporlanır.

**Örnek:** Aşama 2'de 115/115 sentetik fixture, V27 raw.yeast'te 28 brand × 5 reçete = 140 sample ile karşılaştırılmadı.

**İhlal referansı:** Hata 14, 50.

### Kural 2.4 — Spot test minimum örneklem
Bir brand pattern'inin TP/FP kararı için: minimum 5 reçete TP-aday + 5 reçete FP-aday raw.yeast okuması yapılır. Minimum 10 reçete altında karar yayımlanmaz. 28 brand'lık paket için: 28×5 = 140 minimum spot test sayısı.

**Örnek:** Adım 18c-1c-3'te spot test örneklem büyüklüğü brand başına belirsiz, bazı brand'lar 1-2 sample ile geçilmiş.

**İhlal referansı:** Hata 4, 14, 79.

### Kural 2.5 — Cross-feature negatif test her pattern için zorunlu
Yeni bir yeast pattern yeast_X feature'ını flag'liyorsa, aynı reçetelerde diğer 16 yeast feature'ının (yeast_Y) flag'i kontrol edilir. Ör: yeast_witbier=1 olan reçetede yeast_wheat_german=1 ise overlap demek. 28 brand × 17 feature = 578 olası çakışmadan minimum 50 anomali kombinasyonu örneklenir.

**Örnek:** yeast_witbier (3463|3944) ile yeast_wheat_german (1010|3056|3068) overlap kontrolü hiç yapılmadı.

**İhlal referansı:** Hata 15, 22, 54, 80.

### Kural 2.6 — Pattern sınırı (\\b veya açık delimiter) zorunlu
.{0,3} gibi esnek glob'lar word-boundary olmadan kullanılırsa beklenmedik şeyler yakalar. Pattern: `bell.{0,3}s\\s+oberon` yerine `\\bbell['s]?\\s+oberon\\b` tercih edilir. Sınır karakteri olmayan pattern yayımlanmaz.

**İhlal referansı:** Hata 53.

---

## Bölüm 3 — Veri vs tahmin ayrımı

### Kural 3.1 — Tahmin sayısı raporda kaynak ile etiketlenir
Bir sayı raporlanırken yanına: `[veri: dataset_query]` veya `[tahmin: gerekçe]` etiketi konur. "Etki tahmini ~9097" gibi etiketsiz sayı yayımlanmaz. Tahmin değeri Kaan kararına input olamaz, sadece yön belirtir.

**Örnek:** "9097 reslug aday" tahminseldi ama "tahmin" etiketi taşımıyordu, karar input'u gibi sunuldu.

**İhlal referansı:** Hata 3, 6, 8, 9.

### Kural 3.2 — ok_clusters benzeri liste empirik
Bir cluster'ın "kabul edilebilir" sayılması brewing-bilgi-tahmini değil, dataset'te o cluster için brand'ın çoğunluk dağılımına bakılarak yapılır. Brewing-bilgi-temelli liste hipotez olarak işaretlenir, dataset query ile doğrulanır.

**Örnek:** Aşama 1'de 28 brand × 5-7 cluster ok_clusters listesi tahminseldi, V27 cluster çoğunluk dağılımı sonradan da hesaplanmadı.

**İhlal referansı:** Hata 3, 6, 81.

### Kural 3.3 — Süre tahmini de tahmin
"Aşama 1: 60-125s" gibi süre verisi tahminseldir, kaynak `_*_progress.log` zaman damgaları ile doğrulanır. Karar input'u olamaz.

**İhlal referansı:** Hata 9.

---

## Bölüm 4 — KARAR yasağı ve scope

### Kural 4.1 — KARAR Kaan'a aittir
Pattern eklemek/eklememek, brand'ı scope'a almak/almamak, threshold belirlemek — bunlar KARAR. Code: veri analiz eder, seçenek listeler, hipotez sunar. KARAR yazmaz, onay vermez, "Pattern eklensin" demez. "Şu seçenekler var: A (etki=X, risk=Y), B (etki=Z, risk=W)" formatı kullanılır.

**Örnek:** Adım 18c-1c-4 görev "veri toplama" iken pattern öneri yapıldı. Aşama 1'de 28 brand listesi onay alınmadan ben seçtim.

**İhlal referansı:** Hata 10, 11, 51, 52.

### Kural 4.2 — Scope dışı brand sessizce eklenmez
Yeni bir brand (ör. Cellador House Blends, NB Neobritannia) sprint sırasında akla gelirse: ayrı bir hipotez maddesi olarak yazılır, Kaan onayı beklenir. Sprint kapsamına otomatik girmez.

**Örnek:** 6 brand (Cellador House Blends, NB Neobritannia, NorCal #1, Premium Gold, Lalbrew Diamond, Coopers Pure Brewers) Adım 18c-1c-5 kapsamına alınmadı, hipotez olarak Kaan'a sunulmadı.

**İhlal referansı:** Hata 16, 17, 18, 19, 20, 21, 23.

### Kural 4.3 — "Onay/red" tonu kullanılmaz
"Bu pattern eklenmeli" / "FP riski kabul edilebilir" / "Aşama bitti, geçilebilir" gibi cümleler Code çıktısında yer almaz. Code: "FP riski %X (sample N=Y)" raporlar. Karar fiili Kaan'a aittir.

**İhlal referansı:** Hata 51, 52.

### Kural 4.4 — Seçenek listesinde öneri etiketi yasağı
Seçenek listesinde hiçbir seçeneğin yanına "önerilir / tercih / uygun / mantıklı" etiketi yazılmaz. Maddeler nötr listelenir. Karar yazısı sadece Kaan'da.

**Atıf:** V28 rollback rapor 03.05.2026.

### Kural 4.5 — KARAR yasağı kapsam ayrımı

KARAR yasağı kapsamı: strateji yönü, dataset karar(lar)ı, kapsam genişletme/kısaltma, sprint sıralaması. Bunlar Kaan'da.

KARAR yasağı KAPSAMI DIŞINDA: Build script teknik detay, anomali eşik tasarımı, defensive guard kalibrasyonu, retrain parametre seçimi, performans/doğruluk trade-off'u. Bunlar Claude araştırır + karar verir + gerekçesini sunar. Kaan teknik detayda onay/red verir, üretmez.

Belirsiz alanlar: Süphede Claude soru sorar, ama "A/B/C hangisi?" tipi açık uçlu soru değil — "Karar X, gerekçe Y, itiraz var mı?" formatı.

**Atıf:** 03.05.2026 V28a sonrası iletişim disiplini düzeltmesi.

---

## Bölüm 5 — Süreç ve görev yönetimi

### Kural 5.1 — TaskCreate her aşama için zorunlu
Sprint'in her aşamasına ayrı TaskCreate açılır. system-reminder TaskCreate önerirken atlanmaz. Aşama bittiğinde TaskUpdate ile completed'a alınır.

**İhlal referansı:** Hata 26, 78.

### Kural 5.2 — DURMA noktası Kaan onayı zorunlu
Sprint planında "DUR" yazan noktada Code yeni iş başlatmaz. Kaan inceler, onay verir, sonra geçilir. Onay yok ise bekleme tonunda kalınır.

### Kural 5.3 — Önceki commit mesajına sorgusuz güven yok
Önceki sprintin commit mesajındaki sayım/iddia (ör. "+32574 yakalama") yeni sprinte input olacaksa Kural 1.3 uygulanır. Commit mesajı dokümandır, ölçüm değildir.

**İhlal referansı:** Hata 30, 24.

### Kural 5.4 — "Yavaş, risk en az" emri ihlal edilmez
Kaan "yavaş" dediyse: her aşamada Kural 1.2 (3 kaynak ölçüm) + Kural 2.4 (minimum 10 spot) uygulanır. 60-125s'lik sprint hız sayısı bu emri ihlal göstergesidir.

**İhlal referansı:** Hata 29.

---

## Bölüm 6 — Etki ölçümü ve doğrulama

### Kural 6.1 — Pattern paketi için model retrain etki testi
Yeni 28 brand × yeast feature paket dataset'e işlendiyse, dataset etkisini görmek için minimum: V12 + V6_C2 retrain + 5fold CV + V16 holdout drop ölçümü yapılır. Retrain yoksa "etki" iddia edilmez.

**Örnek:** V27 sonrası V19/V12/V6 retrain hiç yapılmadı, ama "Wheat cluster %20→%2.88" raporlandı — bu sayı dataset düzeltme metric'i, model etkisi değil.

**İhlal referansı:** Hata 36, 37, 38.

### Kural 6.2 — Cluster-feature mantık tutarlılığı kontrolü
Yeni dataset versiyonu (V_n+1) doğduğunda saçma kombinasyonlar için query çalıştırılır:
- saison cluster + yeast_american=1
- lager cluster + yeast_belgian=1
- stout cluster + yeast_kolsch=1
- wheat cluster + yeast_lacto=1 (sour değilse)

Bulunan anomali sayısı ve örnek 5 reçete listelenir.

**İhlal referansı:** Hata 40.

### Kural 6.3 — TP/FP istatistiksel örneklem
Bir paket sonrası 0→1 değişen N reçete için: minimum 100 random reçete (her brand ağırlıklı, brand başına minimum 3) raw.yeast okunarak TP/FP ayrılır. %95 güven aralığı ile FP oran raporlanır.

**Örnek:** Adım 18c-1c-5'te +32574 yeni flag toplam, ama TP doğrulama 100 sample ile yapılmadı.

**İhlal referansı:** Hata 5, 39.

### Kural 6.4 — Sabit kalan feature'lar audit edilir
Sprint içinde dokunulmayan ama sayısı sabit kalan feature'lar (yeast_kveik 262, yeast_abbey 12971, yeast_saison 16818, yeast_brett 4878, yeast_lacto 1322, yeast_sour_blend 2384) için: pattern eksiklik var mı sorgusu açılır. Sabit sayı tek başına kabul nedeni değildir.

**Örnek:** yeast_kveik 262 sabit. Kveik mayası popüler, 262 az. Pattern yetersizliği hipotezi açılmadı.

**İhlal referansı:** Hata 69, 70, 71, 72, 73, 74, 75, 76.

### Kural 6.5 — Cross-feature kontaminasyon raporu
Her V_n+1 dataset versiyonunda 578 olası feature çakışmasından minimum 50 anomali kombinasyonu listelenip Kaan'a sunulur. Sıfır anomali iddiası tek başına yetersiz, query log'u eklenir.

**İhlal referansı:** Hata 15.

---

## Bölüm 7 — Raporlama formatı

### Kural 7.1 — Yasak sözcük listesi
Raporlarda yasak: VAR, PASS, OK, doğru, tamam, ✓, ✗, ✅, ❌, geçti, kaldı, başarılı, başarısız. Yerine: sayı + kaynak (dosya:satır, dataset query, sample N=X).

**İhlal referansı:** Hata 41, 42.

### Kural 7.2 — Sayı + kaynak zorunlu
Her sayı için kaynak: `(dataset query: filter X, file: working/_v27_aliased_dataset.json)` veya `(spot test, raw.yeast, sample N=10)`. Kaynaksız sayı yayımlanmaz.

### Kural 7.3 — Cevap formatı kapsama bağlı
Kaan kapsam belirtmediyse uzun rapor üretilmez. "Aşama X bitti" tek cümle yeterli olabilir. Detay Kaan istediğinde verilir.

**İhlal referansı:** Hata 48.

### Kural 7.4 — Hata sayım tutarlı
Bir liste içindeki madde sayısı bir kez sayılır. "20, 28, 36, 40, 41, 75, 82" gibi sayım kayması — sayım her revizyonda yeniden hesaplanır, fark açıklanır ("82 = 75 + 7 yeni madde, kaynak: bölüm N").

**İhlal referansı:** Hata 35, 67.

---

## Bölüm 8 — Bilişsel önyargılar

### Kural 8.1 — Confirmation bias
"Hata bulundu, kapatabiliriz" cümlesi yasak. Hata bulunduğunda: kök sebep hipotezi + 2 ek ölçüm + benzer hata varlığı taraması açılır. Kapanış kararı Kaan'a aittir.

**İhlal referansı:** Hata 43, 44, 68.

### Kural 8.2 — "Biz yaptık" yasağı
Kaan inisiyatifiyle yapılan iş Code raporunda "yaptık/biz" diliyle sunulmaz. Kaynak: "Kaan tespit etti, Code uyguladı" formatı.

**İhlal referansı:** Hata 45.

### Kural 8.3 — Hata sayısı dürüstlük göstergesi değil
"Çok hata buldum, dürüstüm" tonu confirmation bias. Hata listesi: bulunan + henüz bulunmayan ayrımı, "kapsamlı" iddia edilmez.

**İhlal referansı:** Hata 47, 66.

### Kural 8.4 — Sorumluluğu sistemleştirme yasağı
"Disiplin uyarı" gibi etiketle sorumluluğu sistemleştirip kişisel hesap vermekten kaçınma yasak. Hata = hata. Kuralın eksikliği değil, uygulamanın eksikliği raporlanır.

**İhlal referansı:** Hata 46.

---

## Bölüm 9 — Memory ve önceki sprint mirası

### Kural 9.1 — Memory stale sorgusu
Memory'den çağrılan bir sayı/iddia (örn "1016 reçete", "V19 production") sprint başında verify edilir. Read/git log/dataset query ile günümüz durumu kontrol edilir. Stale ise memory update edilir, sprint kararına stale sayı input olamaz.

**İhlal referansı:** Hata 30.

### Kural 9.2 — Önceki sprint kararını kalıcı kabul etme
Adım N'de verilen bir karar (ör. cry_havoc çıkarılması, Aşama 2.7 metric kabulü) Adım N+1'de yeniden değerlendirme listesine girer. "Önceki sprint dedi ki" cümlesi karar input'u değil, hipotez girdisidir.

**İhlal referansı:** Hata 24, 32, 61, 62.

---

## Bölüm 10 — Öz-değerlendirme

### Kural 10.1 — Öz-değerlendirme iteratif tek-seferlik değil
Sprint sonunda tek seferde 82 hata listesi çıkarılamaz. İteratif zorlama gerekiyorsa kural eksik. Sprint sırasında her aşama sonunda 5 dakikalık öz-değerlendirme açılır, bulgular sprint raporuna girer.

**İhlal referansı:** Hata 63, 64, 65, 66.

### Kural 10.2 — Öz-değerlendirme listesi kapsamlı iddia etmez
"Toplam X hata, hepsi bu" iddiası yasak. "Bulunan X hata, ek tarama gerek" formatı kullanılır.

**İhlal referansı:** Hata 66.

---

## Ek — İhlal referans tablosu (82 hata → kural eşleme)

| Hata# | Kategori | Kural |
|-------|----------|-------|
| 1, 2, 60 | Tahmin/yüzeysel | 1.1, 1.3 |
| 3, 6, 8, 9 | Tahmin/yüzeysel | 3.1, 3.2, 3.3 |
| 4 | Tahmin/yüzeysel | 1.2, 2.4 |
| 5, 39 | Etki ölçümü | 6.3 |
| 7 | Tahmin/yüzeysel | 6.5, B7 audit |
| 10, 11, 51, 52 | KARAR yasağı | 4.1, 4.3 |
| 12, 79, 80, 82 | 3 katman doğrulama | 1.2, 2.2, 2.4, 2.5 |
| 13, 53, 55, 57, 59 | Pattern detay | 2.1, 2.6 |
| 14, 50 | Sentetik vs gerçek | 2.3 |
| 15, 22, 54 | Cross-feature | 2.5, 6.5 |
| 16-21, 23 | Kapsam atlama | 4.2 |
| 24, 30 | Memory stale | 9.1, 9.2 |
| 25 | Etki ölçümü | 6.1 |
| 26, 78 | Süreç | 5.1 |
| 27 | Süreç | (Kaan tespit) |
| 28, 77 | Süreç | (bu dosya) |
| 29 | Süreç | 5.4 |
| 31, 33, 34 | Sayım | 1.2 |
| 32, 61, 62 | Önceki sprint | 9.2 |
| 35, 67 | Sayım | 7.4 |
| 36, 37, 38 | Etki ölçümü | 6.1 |
| 40 | Cluster mantık | 6.2 |
| 41, 42 | Yasak sözcük | 7.1 |
| 43, 44, 68 | Bilişsel | 8.1 |
| 45 | Bilişsel | 8.2 |
| 46 | Bilişsel | 8.4 |
| 47, 66 | Bilişsel | 8.3, 10.2 |
| 48 | Format | 7.3 |
| 49 | Pattern compile | 2.2 |
| 56, 58 | Pattern detay | 2.4, 2.6 |
| 63, 64, 65 | Öz-değerlendirme | 10.1 |
| 69-76 | Sabit feature | 6.4 |
| 81 | Veri vs tahmin | 3.2 |

---

## Hipotez iptal kayıt

### Hata 22 — IPTAL (2026-05-04, AŞAMA C başlangıcı)

**Eski iddia:** "Wyeast 3056 = Saccharomyces + Brettanomyces karışım (Bavarian Wheat 3056 Brett blend)"

**Doğrulama:** wyeastlab.com/yeast-strain/bavarian-wheat-blend/ (fetch 2026-05-04). Resmi açıklama: "Saccharomyces cerevisiae blend (top-fermenting neutral ale strain + Bavarian wheat strain)". Brettanomyces / Brett kelime resmi sayfada geçmemektedir.

**Sonuç:** Hata 22 hipotezi iptal. Wyeast 3056 = Saccharomyces saf blend (iki Saccharomyces cerevisiae suşu). BRETT_RE'ye 3056 ekleme önerisi resmi kaynak tarafından desteklenmiyor.

**Disiplin notu:** Brewing-bilgi-temelli iddialar (memory, forum, dedikodu) Bölüm 3 Kural 1 (kaynak URL etiketi) ve Bölüm 9 Kural 1 (memory verify) kapsamında resmi kaynakla doğrulanmadan karar input'u olamaz. Hata 22 örneği: memory'de "Wyeast 3056 Brett blend" iddiası verify edilmeden sprint planına input olmuştur. KURAL 9.1 sprint başında verify rutini eksikti.

**Memory güncelleme:** Bu kayıt sonrası B1 audit dosyası (working/_step18c1c5d_b1b_wyeast_3056_official.json) referans olarak kalır. Wyeast 3056 ile ilgili herhangi bir gelecek sprint planlamasında bu veri öncelikli kaynak.

---

## Anomali esik kalibrasyon notu

V28a 8 etkilenen recete deneyiminde tasarlanan "cluster diff etkilenen disinda 100+ bayrak" esigi V28b 2827 etkilenen icin yanlis kalibre. ML retrain decision boundary kaymasi etki buyuklugu ile nonlineer artar.

**Yeni rehber:** Cluster diff anomali kriteri etki orani VE transition yon dogrulamasi birlikte olmalidir. Sadece sayim yetersiz.

- Etkilenen recete cluster diff orani: %5 ust sinir (V28b %4.4)
- Etkilenmemis recete cluster diff orani: %3 ust sinir (V28b %1.5)
- Top-N transition yon mantikli mi (yakin komsu cluster mi): hizli audit gerek

**Atif:** V28b cluster diff incelemesi 03.05.2026.

---

## Cluster transition siniflandirma notu

Yakin komsu cluster ciftleri:
- pale_ale <-> ipa (hop yogunlugu spektrumu)
- porter <-> stout (roast yogunlugu)
- brown <-> porter
- bitter <-> mild
- pale_ale <-> bitter (ortak ale tabani, hop fark)
- pale_ale <-> cream (ortak ale tabani, ABV/IBU fark)
- belgian <-> saison
- lager <-> pilsner
- barleywine <-> ipa (high ABV imperial)

Specialty cluster (fruit/herb/spice/winter/smoked/experimental) "diger" kategori — her cluster ile yakin komsu sayilir.

**Atif:** V28b transition audit 03.05.2026.

---

## Bolum 12 — Denetim ekrana yazma protokolu

### Kural 12.1 — Kritik blok odakli ekrana yazma

Build script veya kritik kod denetiminde Code, KRITIK MANTIK BLOKLARINI mesaj govdesinde markdown code blok olarak satir numarali ekrana yazar.

**Kritik bloklar:**
- Default UNION/kopya tanimi
- Targeted exception kosul ve uygulama
- Drift guard sayim ve kontrol
- Pattern regex tanimlari
- Sha256 baseline kontrol

**Kritik olmayan:** import, audit JSON yazimi, log print, baseline metric tanimi gibi rutin kisimlar Code'un raporuna guven olur, ekrana yazilmaz.

Hicbir kritik satir atlanmaz, "..." kisaltmasi yok, yorum satirlari dahil. Token/uzunluk sinirinda tasma olursa Code mesaji bolup ardisik mesajlarda devam eder.

**Atif:** V28a + V28b_C2 denetim protokolu uygulama deneyimi 03.05.2026.

---

## Bolum 11 — Cross-dataset lookup disiplini

### Kural 11.1 — Cross-dataset lookup eslesme garantisi

Cross-dataset lookup yontemi kullanirken (V6 reference ↔ V19 dataset, V21 ↔ V27 vb.) ID semasi ve tuple eslesme garantisi onceden dogrulanmalı. Eslesme orani %100'den dusukse "eslesmedi" kayit olarak raporlanmali, eslesen sonuclar dataset geneli icin temsili sayilmamali.

**Atif:** Adim 18c-1c-5d Madde c v1 raporu yontem hatasi 03.05.2026.

---

## Dataset Baseline Kayitlari

V27 (Adim 18c-1c-5 Asama 3, commit 6c93aeb):
sha256: 8c2d132d1913a57203040a98c9ef1ceebc2e18ce771b0f233718e1215c12442d
Boyut: 1267.4 MB
Recete: 376845

V28a (Adim 18c-1c-5d C1 izole, commit edilmedi):
sha256: 5dfcc4ccecac8bb3d250f5a4f552b39a2d0fd475a582fb98993507f1824cf301
Boyut: 1267.4 MB (V27'den 126 byte farkli)
Recete: 376845
Kapsam: C1 Wyeast 2272 izole (3 feature, 8 recete etkilendi)

V28b (Adim 18c-1c-5d kapanis, commit edildi):
sha256: bc8a7b0dd900019ff79900e9f871641bfe162d1c41bbd85cb7f2f37a4b938024
Boyut: 1267.4 MB
Recete: 376845
Kapsam: 9 aktif pattern, 2827 exception
Bilincli kayit: 237 multi-strain FP + C4/C5 0 etki -> Adim 18d
Bilincli kayit: V6 reference V21 mirasi -> Adim 18c-1c-5f
Bilincli kayit: V2c yeast okumuyor -> Adim 18c-1c-5g
Bilincli kayit: 12 numara Wyeast audit -> Adim 18c-1c-5e

V28c (Adim 18d-pre Sprint A, K1 yeast_saison pattern guncelleme):
sha256: 2659bbbea28834182a6930d95eff25c1c252264f94ce8254c4f680ef67fb30b4
Boyut: 1267.4 MB
Recete: 376845
Kapsam: V28b + 102 yeast_saison 0->1 (BE-134/BE-256/M29/Lalbrew Farmhouse)
Parser commit: 6a8e1d7

V19 SLUG_TO_CLUSTER V6 ile hizalandi (Adim 18d-pre Sprint B 2026-05-04):
Eski 16 cluster (cream/amber_ale/belgian/bitter/brown/mild/barleywine), yeni 14 cluster.
French_biere_de_garde saison -> brown_ale tasindi.
4 V19-only slug yonlendirme: cream_ale->pale_ale, golden_or_blonde_ale->pale_ale,
american_barleywine->strong_ale, sweet_stout_or_cream_stout->stout.
Atif: working/_step60a_v19_v6_mapping_diff.json (32 farkli mapping tablosu).

V28d (Adim 18d-pre Sprint C, K3 reslug, PRODUCTION):
sha256: efa0115a91fc3b571e529c58f3e5c48c325ab3647ef7a881da7cb637710c199f
Boyut: 1.32 GB
Recete: 376845
Kapsam: V28c + 4201 K3 reslug saison cluster -> Belgian abbey/dubbel/tripel/quadrupel/strong_dark/strong_golden
V19 retrain V28d 14 cluster top1 0.6986 gap +0.30
Production URL: Brewmaster_v2_79_12.html (commit d1e5986, 03.05.2026)
Eski URL korundu rollback: Brewmaster_v2_79_11.html (V28b), Brewmaster_v2_79_10.html (V27)
Sprint D K4 iptal -> Adim 18d kayit (486 reçete algoritmik kriter yetersiz)

V28b production deploy (Adim 59, commit 73daae9):
HTML: Brewmaster_v2_79_11.html (URL: https://dessn7-bit.github.io/brewmaster/Brewmaster_v2_79_11.html)
sha256 V28b dataset post-meta: 8359f033338e9aeb399850b72e202f9e70577a1639a87f81d3dde75bf820ae8a
Model dosyalari (4): _v19_v28b_model_14cat.json (3.7 MB), _v19_v28b_model_slug.json (51 MB), 2 label encoder
V19 retrain V28b uzerinde: 14cat top1 0.6512, slug top1 0.5718, slug t3 0.8140, gap 5.14%
Tarih: 2026-05-04 (Adim 59 deploy)
Eski URL korundu rollback icin: Brewmaster_v2_79_10.html + _v19_model_*.json (V27 V19 era)

---

## Versiyon

- v1 (2026-05-04): İlk taslak. 82 hatadan çıkarılan 10 bölüm, 38 kural. Tablo 82/82 hata atıflı (Hata 25 6.1'e bağlandı).
- v2 (2026-05-04 — AŞAMA C başlangıcı): Hipotez iptal kayıt bölümü eklendi. Hata 22 (Wyeast 3056 Brett blend) iptal — Wyeast resmi kaynak Saccharomyces saf blend doğrulamasıyla. Bölüm 9 Kural 1 (memory verify) ve Bölüm 3 Kural 1 (kaynak URL etiketi) referansı pekiştirildi.
- v2.1 (2026-05-04 — V28a build sonrası): Dataset Baseline Kayıtları bölümü eklendi (V27 + V28a sha256, boyut, reçete sayısı, etkilenen reçete kapsamı).
