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

**Vurgu (v2.5 revize, Phase 2 ihlali sonrası):** Sentetik string compile testi (örnek: "WLP410 Belgian Wit II" string'i pattern eşleşiyor mu) **YETERSİZ**. Yeni eklenen her yeast pattern için **gerçek `raw.yeast` field'ında en az 5 sample manuel FP/TP kontrol zorunlu**. Sprint A K1 modeli (102 reçete manuel kontrol) standart, Phase 2 modeli (sentetik 24/24, raw.yeast spot test atlandı) ihlal. Pattern büyüklüğü ne olursa olsun (40 match veya 3000 match), sample testi atlanmaz.

**İhlal referansı:** Hata 1, 2, 60, **(Adim 18d-pre P2 — 2026-05-04: 8 pattern 8351 flag, raw.yeast manuel kontrol atlandi)**.

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

### Kural 4.6 — Deploy gate 5-stat gain zorunluluk (revize v2.5)
KURAL 4 deploy gate koşulu memory'de tanımlı: (a) slug gap <5pp, (b) 5-stat gain >%15 trend, (c) sensitivity V_n'den iyi. **5-stat gain monitoring deploy onayının şart koşulu** — headline metric (test_top1) tek başına yeterli değil, per-stat ölçüm zorunlu (top1, top3, top5, macroF1, per-class F1 spotlight). Standard deviation seviyesindeki kazanım (örn V6 cv ±0.005, V28e gain +0.0019) alarm; istatistiksel anlamlılık testi olmadan "deploy başarılı" ifadesi yasak. Memory'deki "alarm <%3" eşiği per-stat trend için, headline ortalama altındaki sprintler "kanıtlanamamış gain" notu ile rapora geçer.

**Atıf:** Adim 18d-pre P2 V28e — 2026-05-04: V28e deploy onayı sadece +0.11pp 14cat / +0.19pp V6 ile verildi, 5-stat gain analizi yapılmadı, kazanım std altında.

**İhlal referansı:** Hata 7 (kapanis audit).

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

**v2.5 revize (yumusatma yasagi, V28e KURAL 4 ihlali sonrası):** Sayısal eşik aşıldığında **"borderline / esnek / yaklaşık / sınırda"** gibi yumuşatma kelimeleri **yasak**. Eşik > X ise FAIL, FAIL yazılır. KURAL 4 slug gap eşiği <5.0pp; ölçüm 5.34pp ise → "FAIL" (5.34 > 5.00). "Esnek borderline" ifadesi numerik gerçeği örter, KARAR-makamına yanlış girdi sağlar.

**İhlal referansı:** Hata 41, 42, **(Adim 18d-pre P2 V28e — 2026-05-04: slug gap 5.34pp "borderline" diye sunuldu, açık fail)**.

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

### Kural 9.3 — Sprint sonrasi metric olcum zorunlu (yeni v2.5)
Sprint sonunda "X kazanim tahmini" yerine "P_n oncesi X, P_n sonrasi Y, fark Z" formati zorunlu. Olcum yapilmamis sprint kapali sayilmaz, "deploy edildi ama gain belirsiz" notu rapora gecer. Cluster A orani, B orani, C2 orani, slug bazli top1 — sprint hangi metrik etkiliyse o metrik yeniden olculur.

**Atif:** Adim 18d-pre P2 — 2026-05-04: 8351 flag 0->1 yapildi, V28e cluster A orani (sour/lager/wheat) olculmedi, "%2-3 kazanim tahmini" dogrulanmadi.

**Ihlal referansi:** Hata 4 (kapanis audit 12 hata).

### Kural 9.4 — Farkli train/test taban metric direkt kiyas yasagi (yeni v2.5)
V19 (tum dataset 80/20 split) ve V6 (28000 stratified balanced sample) farkli tabanlardan gelen sayilar **direkt sayisal kiyaslanamaz**. Yan yana sunulurken "farkli taban" notu zorunlu, baseline normalize edilmeden istatistiksel sonuc cikarilmaz.

**Atif:** Adim 18d-pre P2 V28e raporu — V19 14cat 0.6997 ile V6 cv_top1 0.6046 yan yana sunuldu, taban farki belirtilmedi.

**Ihlal referansi:** Hata 8 (kapanis audit).

### Kural 9.5 — Production deploy sonrasi canli UI test zorunlu (yeni v2.5)
Deploy dogrulamasi 2 katmanli: (a) HTTP test — `curl HTTP 200 + grep` (b) **Canli UI test** — Kaan tarayicida hard refresh + gercek recete tahmin ekran goruntusu. Sadece HTTP 200 yeterli degil, kullanicinin gerçek motoru calistirip cluster/slug ciktisi raporlanir.

**Atif:** Adim 18c-1c-5f V6 V28d displayTR fix sonrasi UI dogrulanmadan duruldu (sentetik K=5 raporu canli UI ciktisi degil). Adim 18d-pre P2 V28e deploy sonrasi UI test atlandi.

**Ihlal referansi:** Hata 9 (kapanis audit).

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

### Kural 12.2 — Her production deploy oncesi tam denetim zorunlu (revize v2.6)

Her production deploy oncesi tam denetim zorunlu:
- **KURAL 4**: 5-stat gain + slug gap kontrolu (PASS gerek)
- **KURAL 1.1**: Yeni pattern eklendiyse FP audit (raw.yeast 5+ sample manuel)
- **KURAL 9.5**: Canli UI test (deploy sonrasi hard refresh + ekran goruntusu)
- **Sha guard**: V27/V28b/V28d/V28e (ve son dataset) sha intact dogrulama
- **Working tree**: clean veya gerekçeli uncommitted dosya listesi

Deploy sayisi sinirsiz, denetim atlama yasak. **Hizli arka arkaya deploy KURAL 12.2 ihlali DEGIL**; **denetimsiz deploy KURAL 12.2 ihlalidir**.

**Atif (revize):** v2.5 'tek session 1 deploy' yanlis tanim. 24 saat icinde 4 deploy (V28d, V28d V6, displayTR fix, V28e) sayisal olarak ihlal degil — sebep her deploy oncesi denetim atlanmis olmasi (gain olculmemis, FP audit yok, UI test yok). v2.6 revize asil ihlali deploy sayisi degil denetim eksikligi olarak yeniden tanimlar.

**Ihlal referansi:** Hata 10 (kapanis audit) — revize formuyla yeniden yorumlanir: 4 deploy degil, 4 deploy'un her biri icin denetim atlanmasi ihlal.

**Tarihce:** v2.5'te yanlis tanim ('tek session 1 deploy'), v2.6'da revize edildi (Adim 18d-pre Oncelik 2.5 deploy hazirligi sirasinda Kaan tespit etti — sayisal sinirlama yerine denetim sart kosulu).

### Kural 12.3 — Build script versiyon arsivi (yeni v2.5)
Path edit ile yeniden kullanilan build/retrain scriptleri (V21→V28d→V28e gibi) her dataset icin **ayri kopya** olarak `working/archive/script_v_X/` altinda saklanir. Git diff sadece son state'i gosterir, dataset bazli reproducibility icin ara state'lerin bagimsiz kopyasi gerek. KURAL Code v2 baseline kaydi yetersiz, scriptin kendi tarihi de saklanir.

**Atif:** `_step6_v6_retrain_14cluster.py` 3 dataset icin path edit ile kullanildi (V21 Mayis 1, V28d Mayis 3, V28e Mayis 4); arsivde sadece son state mevcut, V21 baseline reproduce icin manuel geri cevirme gerek.

**Ihlal referansi:** Hata 11 (kapanis audit).

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

V28f (Sub-sprint 1, Hefeweizen reslug 1879 algoritmik, BUILT 2026-05-04):
sha256: 97bd61bdcda7bc19b7b4aff9ae9a4142476de31ea87d810f4f1a1b2f8f622e93
Boyut: 1329575246 bytes (~1.32 GB)
Recete: 376845 (V28e ile esit, sadece slug etiket degisikligi)
Kapsam: V28e + 1879 reslug (BA 2026 priority order, 12 alt-grup mutually exclusive):
  ZONE_INSIDE 2810 dokunulmaz (south_german_hefeweizen)
  AMERICAN_WHEAT_WINE 6 -> american_wheat_wine_ale (strong_ale cluster KAAN KARAR 1)
  WEIZENBOCK 194 -> south_german_weizenbock
  BERNSTEIN_WEIZEN 67 -> south_german_bernsteinfarbenes_weizen
  DUNKEL_WEIZEN 44 -> south_german_dunkel_weizen
  LEICHTES_WEIZEN 117 -> german_leichtes_weizen
  AMERICAN_WHEAT_BEER 1451 -> american_wheat_beer
  Manuel review 3167 (HOPPY 272 + HIGH_IBU_NO_WG 94 + VERY_HIGH_SRM 28 + ZONE_BORDERLINE 2773) — 18d kapsami
non_hef_drift: 0 (Hefeweizen disi 368989 recete dokunulmaz)
Yeni 4 slug: south_german_bernsteinfarbenes_weizen, german_leichtes_weizen, american_wheat_beer, american_wheat_wine_ale (slug filter ≥10 ile wheat_wine_ale n=6 dropped, training 90 slug)
V19 retrain V28f Senaryo 4 (V28f S4): 14cat top1 0.6990, slug top1 0.5719, gap 5.08pp FAIL
V19 retrain V28f Senaryo 5 (V28f S5, S4+S1 kombo subsample 0.6 colsample 0.6 gamma 0.5 mcw 6 reg_lambda 2.5): 14cat top1 0.6990, slug top1 0.5712, slug top3 0.8155, slug top5 0.8945, **gap 4.86pp PASS** (KURAL 4)
  Test top1 V28f_S4 baseline -0.0007 dususu std ±0.18pp altinda (gurultu, KURAL 7.1 yumusatma yok, kabul kosulu strict FAIL ama 4/5 PASS)
  Per-class: oktoberfest_festbier zero'dan cikti +5.6pp, leichtes_weizen +4.3pp, hefeweizen 0.799 stabil, belgian_lambic -5.7pp gerileme
  Zero slug 2 -> 1 (mimari kazanim)
V6 retrain V28f: cv_top1 0.6068 (+0.22pp V28e 0.6046'ya gore), cv_top3 0.7999, macroF1 0.6030, sanity 50: 33/50=0.66
  Wheat cluster F1 0.7931 (en yuksek), sour 0.7477, lager_dark 0.6992
Kaynak: STYLE_DEFINITIONS.json (BJCP 2021 + BA 2026 hibrit) + working/_step60d_hefeweizen_build_netlesme.json
Mutually exclusive priority order: 1_ZONE_INSIDE > 2_AWW > 3_WEIZENBOCK > 4_BERNSTEIN > 5_DUNKEL > 6_LEICHTES > 7-9 manuel > 10_AWB > 11-12 manuel
KAAN KARAR 1: AMERICAN_WHEAT_WINE -> strong_ale cluster (BA OG 1.08-1.12 + ABV 8-12.2 wheat yerine strong_ale uygunluk)
KAAN KARAR 2: V19 retrain Senaryo 4 ile basla — V28f_S4 gap FAIL, Senaryo 5 (S4+S1 kombo) ile gap PASS
KAAN KARAR 3 (DURMA 2 revize): S5 kabul, ASAMA 6 V6 retrain devam — gap PASS oldugu icin, test top1 -0.0007 gurultu
Production URL Brewmaster_v2_79_10.html (HTML 7 fetch URL guncellendi V28f isimlerine, hardcoded metin satir 14240/14248/13652 V28f S5 ile guncellendi)

V28e (Adim 18d-pre P2, 8 yeast pattern guncelleme, PRODUCTION):
sha256: 475746f7d01db80b202c08328adafcc12b44eb1e4282f2add1382d756fd7eb17
Boyut: 1329192654 bytes (~1.32 GB)
Recete: 376845
Kapsam: V28d + 8351 yeast flag 0->1 (UNION mantigi, 1->0 yasak)
  yeast_american 3865 (Vermont/East Coast/Cream Blend/WLP862)
  yeast_belgian 2221 (WLP510 Bastogne/WLP575/T-58/S-33)
  yeast_english 948 (Australian/Burton Union)
  yeast_sour_blend 877 (WLP630/655/670/3191/3278/ECY02)
  yeast_german_lager 285 (WLP862 Cry Havoc)
  yeast_witbier 63 (WLP410/4015/M21/Lalbrew/B44/3942)
  yeast_wheat_german 53 (Wyeast 3942)
  yeast_brett 39 (ECY02 Flemish Ale Blend)
non_p2_drift: 0 (P2 disi 18 yeast feature degismedi)
Parser commit: 0c3a704 (Adim 18d-pre P2 8 pattern guncelleme)
V19 retrain V28e: 14cat top1 0.6997 (V28d 0.6986 +0.11pp), slug top1 0.5724, slug t3 0.8154, slug gap 5.34pp (KURAL 4 esnek borderline)
V6 retrain V28e: cv_top1 0.6046 (V28d 0.6027 +0.19pp), cv_top3 0.7989, macroF1 0.6008
Production URL: Brewmaster_v2_79_10.html (HTML 7 fetch URL guncellendi V28e isimlerine)
V28d artifact'lar root'ta korundu rollback icin (_v19_v28d_*.json + _v6_v28d_*.json)

V6 reference V28d retrain (Adim 18c-1c-5f, 03.05.2026):
sha256 _v6_v28d_reference.json: c2b7c99bfd35c069...
Boyut _v6_v28d_reference.json: 10.84 MB
sha256 _v6_v28d_meta.json: 631ded9a08b58c1f473cd34dba3f6eaa1346d6e14f7157db67b5efe6413e07af (displayTR fix sonrasi)
Boyut _v6_v28d_meta.json: 1892 bytes
Cluster: 14 (V21 mirasiyla ayni mapping)
Sample: 28000 stratified slug-equal redistribution
Feature: 56 COMPACT_FEATURES
5-fold CV top1: 0.6027 (V21 baseline 0.5823, +2.04pp)
5-fold CV top3: 0.7987 (V21 baseline 0.7874, +1.13pp)
Macro F1: 0.5989 (V21 baseline 0.5788, +2.01pp)
Sanity 50 sample top1: 0.5800
Yansiyan: Sprint A K1 102 yeast_saison flag + Sprint C K3 4201 reslug
Production URL: Brewmaster_v2_79_10.html (V28d production, fetch URL guncellendi)
V21 mirasi korundu: working/archive/v6_step6/ (rollback) + root _v6_v21_*.json
V28d artifact dosyalari: _v6_v28d_reference.json + _v6_v28d_meta.json + _v6_v28d_scaler.json
displayTR fix (v2.3 baseline): _step6_v6_retrain_14cluster.py satir 441-458 displayTR yazma blogu kalici eklendi (gelecek retrain'lerde otomatik yazilir)

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
- v2.2 (2026-05-03 — Adim 18c-1c-5f sonrası): V6 reference V28d retrain baseline eklendi (cv_top1 0.6027, cv_top3 0.7987, macroF1 0.5989, V21 mirasi korundu archive'da).
- v2.3 (2026-05-03 — Adim 18c-1c-5f displayTR fix): _v6_v28d_meta.json'a displayTR field eklendi (14 cluster TR mapping, V21 formatından kopya). Script _step6_v6_retrain_14cluster.py satir 441-458 displayTR yazma bloğu kalıcı eklendi. Yeni meta sha256: 631ded9a..., boyut 1892 bytes.
- v2.4 (2026-05-04 — Adim 18d-pre P2 V28e deploy): V28e baseline + 8 yeast pattern guncelleme (UNION mantigi, 8351 flag 0->1, 1->0 yasak, drift 0). V19 retrain 14cat 0.6997 +0.11pp, V6 retrain cv_top1 0.6046 +0.19pp. SOUR/LAGER/WHEAT cluster A orani artisi.
- v2.5 (2026-05-04 — Code'un 12 hata kapanis audit'i): 3 madde revize (1.1 FP testi vurgu, 7.1 yumusatma yasagi, 4.6 deploy gate 5-stat gain) + 5 yeni madde (9.3 metric olcum zorunlu, 9.4 V19/V6 direkt kiyas yasagi, 9.5 canli UI test, 12.2 tek deploy session, 12.3 build script versiyon arsivi) + 3 risk kaydi (V21 NaN, P2 FP yuk, V28e gain belirsiz). 12 hata kaydi `_step60d_kapanis_audit.md`'ye eklendi.
- v2.5.1 (2026-05-04 — Oncelik 1A + 1B kapanis): P2 audit %100 kapsam tamam (81/81 TP, 0 FP — ilk 8 pattern 40 sample + ek 8 brand 36 sample + WLP670 5 sample). K3 603 keyword-eslesen audit (57 sample): Quadrupel %93 KABUL, Dubbel %53 KISMEN, Tripel %33 KRITIK, Strong Golden %25 KRITIK. 14 YANLIS recete + 4 hata pattern + 18d pattern matrisi yon (maya bazli + negatif baglam + profile zone + pattern genisletme) `_to_do_step18d.json`'a eklendi. V19 quadrupel 0.000 paradoksu = ML mimari sorunu (47 recete az + class weight eksigi), dataset temiz.
- v2.6 (2026-05-04 — KURAL 12.2 revize): v2.5'te 'tek session 1 deploy' yanlis tanim. Asil mesele her deploy oncesi tam denetim (KURAL 4 + 1.1 + 9.5 + sha guard + working tree clean). Hizli arka arkaya deploy ihlal degil; denetimsiz deploy ihlal. Deploy sayisi sinirsiz. Adim 18d-pre Oncelik 2.5 deploy hazirligi sirasinda Kaan tespit.

---

## 12 Hata Kapanis Audit (Adim 18d-pre P2 sonrasi, 2026-05-04)

Code'un kendi audit raporu sonucu Phase 2 ve V28e deploy sirasinda 12 ihlal/atlama kayda alindi. Detay `working/_step60d_kapanis_audit.md`.

**Onceki 5 hata (ilk Code raporu):**

1. **KURAL 4 slug gap FAIL (5.34 > 5.00)** — "Borderline" yumusatma yanlis. V28d 5.21 fail'di, V28e +0.13pp ile kotulesti. (Kural 7.1 v2.5 revize)
2. **HTML hardcoded eski metin** — Satir 14240/14248: "91 slug, 16cat 65.1" yazıyor, V28e gercek 87 slug / 14cat 0.6997. Production yanlis sayilar gosteriyor.
3. **K3 keyword-eslesen 603 recete audit edilmedi** — 453 dubbel + 91 tripel + 47 quadrupel + 12 strong_golden, sample dogrulama yok. Wyeast 3787 trappist tripel yanlis slug atanmis olabilir. (Kural 5 ihlal)
4. **P2 sonrasi cluster A orani olculmedi** — Sprint E V28d (sour 57.3/lager 67.2/wheat 70.3) baseline, V28e tekrar koşturulmadi. (Kural 9.3 v2.5)
5. **V21 NaN 4 recete (rmwoods OG/FG/ABV bos)** — Yapisal risk, V21'den retrain ederse parse hatasi. (Risk 1)

**Ilave 7 hata (Code'un ikinci raporu):**

6. **KURAL 1.1 ihlali — FP testi atlandi** — Phase 2'de 8 pattern 8351 flag, sentetik string compile testi yapildi (24/24), gercek raw.yeast manuel kontrol atlandi. T-58 601, S-33 491, Vermont 1448, East Coast 1015, Cream Blend 1007, Australian 685, Burton Union, M21. FP riski "Australian IPA" recete adi, "t-58" 58F notasyonu vs.
7. **KURAL 4 5-stat gain monitoring atlandi** — V28e onayi sadece headline +0.11pp/+0.19pp ile. 5-stat gain analizi yapilmadi, alarm <%3 trend hesaplanmadi. Kazanim std seviyesinde (V6 ±0.005). (Kural 4.6 v2.5)
8. **V19 vs V6 metric direkt kiyas yaniltici** — V19 14cat 0.6997 ve V6 cv_top1 0.6046 farkli tabanlardan. Yan yana sunum bilimsel olarak gecersiz. (Kural 9.4 v2.5)
9. **V28e deploy sonrasi UI test dogrulanmadi** — Hard refresh, V6 motor yuklemesi, displayTR mapping calismasi canli UI'da test edilmedi. Sentetik K=5 wheat 3/5 raporu gercek UI ciktisi degil. (Kural 9.5 v2.5)
10. **Sprint disiplini ihlali — 4 deploy tek session** — V28d, V28d V6, V28d displayTR, V28e — 24 saat icinde. Her deploy ayri analiz + onay gerek, hiz ugruna sikistirildi. (Kural 12.2 v2.5)
11. **V6 retrain script tarihce izi** — `_step6_v6_retrain_14cluster.py` 3 dataset icin path edit, git diff sadece son state. V21 baseline reproduce manuel geri cevirme gerek. (Kural 12.3 v2.5)
12. **V28e gain kanitlanamadi (kumulatif)** — 7 hata kumulatif: V28e production'a deploy edildi ama gercek deger uretip uretmedigi belirsiz. Cluster A orani #4, 5-stat gain #7, UI test #9, FP testi #6 — hicbiri olculmedi/yapilmadi.

**3 Risk Kaydi:**

- **Risk 1: V21 NaN 4 recete (rmwoods)** — Yapisal sorun, V21'den retrain ederse parse hatasi. Cozum onerisi: NaN -> 0 manuel duzeltme veya recete sil.
- **Risk 2: Phase 2 FP yuk** — ~8351 yeni flag, FP testi yapilmadi. Bilinmeyen sayi yanlis flag.
- **Risk 3: V28e gain belirsizlik** — Headline metric istatistiksel gurultu altinda. P2 sonrasi olçum yapilmadan V28e "basarili" sayilamaz.

---

## K3 603 keyword-eslesen audit (Adim 18d-pre Oncelik 1B, 2026-05-04)

P2 audit %100 kapsam tamamlandiktan sonra K3 reslug 603 reçete (4201 toplam K3'ten default fallback olmayanlar) audit edildi. Detay `working/_step18d_pre_p2_k3_603_audit.json`.

**Sonuc:**
- 57 sample manuel inceleme: 30 DOGRU / 13 TARTISMALI / 14 YANLIS — genel %53 dogru.
- belgian_quadrupel: 15 sample, %93 dogru, **KABUL**. V19 0.000 paradoksu ML mimari sorunu (class weight + 47 recete az), dataset temiz.
- belgian_dubbel: 15 sample, %53 dogru, KISMEN PROBLEM.
- belgian_tripel: 15 sample, %33 dogru, **KRITIK PROBLEM**.
- belgian_strong_golden: 12 sample, %25 dogru, **KRITIK PROBLEM**.

**4 hata patterni:**
1. FP negatif/generic kelime: 'double', 'triple', 'not a X', 'X light', 'X starter', 'X clone'
2. Profile zone uyumsuz: Patersbier 4-5% ABV dubbel atandi, light versiyonlar strong_golden atandi
3. Pattern eksik: 'westy db' Westvleteren 12 kisaltmasi yakalamadi
4. Maya/recete konflikt: WLP530 + saison recete -> tripel atandi

**14 YANLIS recete + 18d pattern matrisi yon** (maya bazli + negatif baglam + profile zone gate + pattern genisletme) `working/_to_do_step18d.json`'a eklendi. KARAR Kaan'da: 14 reçete 18d toplu reslug ile gider (mini-sprint maliyeti orantisiz).

---

## HTML hardcoded metin manuel update disiplini (Adim 18d-pre Hata #2, 2026-05-04)

Her V19 retrain sonrasi (slug t1, 14cat t1, gap, note alanlari) `Brewmaster_v2_79_10.html` satir 14240 + 14248 manuel `str_replace` ile guncellensin. Statik metin secimi yapildi (Secenek A — hizli, sonraki retrain manuel update gerek). Dinamik JS okuma (Secenek B) Kaan tarafindan reddedildi (kapsam fazlaligi).

**Format:**
- Satir 14240 (button hover tooltip): `btn('V12', 'V12 (V19) ⭐', '#6A1B9A', 'V12 DEFAULT — V19 XGBoost (<note>, <slug_count> slug, slug t1 <slug_t1> / 14cat <cat_t1>, gap <gap> PASS/FAIL)')`
- Satir 14248 (status badge label): `var lbl = m==='V12' ? 'V12 (V19) DEFAULT (<note>, <slug_count> slug, slug t1 <slug_t1> / 14cat <cat_t1>, gap <gap> PASS/FAIL)' : ...`

**Atif:** Adim 18d-pre Hata #2 — V19 ilk deploy era'sindan kalma metin (91 slug, 16cat 65.1, slug t1 55.4) V28e production'a kadar guncellenmedi. Senaryo 4 deploy ile birlikte duzeltildi (87 slug, 14cat 69.97, slug t1 57.28, gap 4.98 PASS).
