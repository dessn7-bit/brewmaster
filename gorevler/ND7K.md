SPRINT ND7K — Katalogda olmayan gerçek ürünlerin KAYNAKLI eklenmesi (KAT-C + KAT-D birleşik; gerçek API çağrısı YOK)

Claude, 2026-11-11. ND7'den SONRA verilir. ND7 bu sprintin girdisini hazırlar: tests/nd7k_aday.json. Bu dosya, örnek verisinde adı geçen ama katalogda olmayan ürünlerin listesidir. ND7'de bu ürünlerin satırları geçici olarak "katalog_bekliyor" sınıfına bağlanmıştır.

ND7B SONRASI EK (Claude, 2026-11-13; Kaan kararı: ND7B biter bitmez aynı oturumda ND7K'ya geçilecek)
- BAŞLAMA ŞARTI: ND7B commit + push edilmiş, canlı md5 = yerel, tam regresyon son kodla koşulmuş, ND7B doğrulayıcısı bitmiş ve ND7B raporu yazılmış olmalı.
  - ND7B'de çözülemeyen kırmızı test ya da "Claude kararı bekleyen ve ND7K'yı etkileyen" bir madde varsa ND7K'ya BAŞLAMA. Durumu yazıp dur.
  - Etkileyen maddeler: fark işareti (a), kaybolan satırlar (c), renk düzeltmeleri (f), ND7 katmanının kapsamı (j).
- ND7B'nin (a) maddesi: marka ürünü katalogda yoksa satır fark='marka' ile aynı türden kayda geçici bağlanmış ve ürün tests/nd7k_aday.json'a eklenmiştir.
  - ND7K bu ürünü kaynakla eklerse satır ürüne yeniden bağlanır ve fark alanı KALKAR.
  - Eklenemezse fark='marka' kalır.
- ND7B'nin (f) maddesinde düzeltilen katalog renklerine dokunma. Yeni eklenen Dingemans ve Castle ürünlerinde birimi (EBC ↔ °L) üretici sayfasından AYRICA doğrula.
- KATALOG ORTAK: Yeni ürünler MALTLAR / HOPLAR / MAYALAR / KATKILAR'a girer. Eski sözlük çözücüsü de bunları tanıyacağı için AI yolları da etkilenir: asistanın kalem bulucusu, soru çözücü, AI4 / CEV kanıt paketi.
  - Bu bilinçli bir değişikliktir ama ÖLÇÜLÜR. tests/nd7b_a1_karsilastir.mjs ile A1 kalem bulucusunu önce / sonra karşılaştır (G seti + tuzak seti istemleri).
  - Değişen her istemi listele.
  - G seti / tuzak / CEV mock 55 / kural yolu d30af8de geri oynatmalarında değişen sonuç olursa liste + neden yaz. Beklenen değer AYARLANMAZ, karar Claude'da.
- Ürünlerin hepsi tek oturumda bitmeyebilir. Sıra: önce satır sayısı en yüksek ürünler.
  - Bitmeyenler sınıfta kalır ve raporda "sırada" diye listelenir.
  - Yarım iş commit edilmez. Her commit kendi içinde tutarlı olur, testleri geçer ve yayına hazırdır.

Bu dosyada 5 madde var (0–4). İşe başlamadan 5'ini de okuduğunu raporun ilk satırında teyit et; modelini yaz.

EFOR: high.
Kaynak araştırması çok olduğu için paralel alt ajanlar kullan:
- her alt ajan ayrı bir parti alır;
- hepsi aynı ölçütle çalışır;
- her alt ajan kendi bulduğu alıntıyı sayfada birebir arar.

KURALLAR
- ND6 KURALLAR bölümü aynen geçerli: heldout açılmaz, üç imza AYNI, gerçek API yok, Firebase yok, Kaan'dan iş istenmez, bayrak kapalıyken eski davranış (BM_ND7K).
- AĞ: bekleme ya da deneme için üçüncü taraf servislere istek ATILMAZ. Dış istek yalnız GitHub'a ve kaynak doğrulaması için üretici, yetiştirici ya da satıcı sayfalarına.
- Kataloğa giren her ürünün her sayısal değeri için şunlar zorunlu:
  - üretici ya da yetiştirici sayfasının url'si;
  - ≤15 sözcük birebir alıntı.
- Hangi kaynaklar sayılmaz:
  - HopDatabase, Beer Maverick ve topluluk listeleri tek başına kaynak sayılmaz. HopDatabase'de Nectaron hatası görüldü.
  - Satıcı sayfası yalnız satıcının kendi ürünü için kaynaktır (ör. BiraBurada ürünleri).
- Değeri bulunamayan alan BOŞ kalır; tahmin yazılmaz.
  - Ürünün kendisinin var olduğu bile gösterilemiyorsa ürün EKLENMEZ, satırları sınıfta kalır.
- MUADIL kaydı YAZILMAZ. Muadil yolu ND8'in işi. Hiçbir yeni ürüne ✅ yazılmaz.
- Repo PUBLIC: yalnız ürün verisi ve ≤15 sözcük alıntı; telifli metin kopyalanmaz.

0. ÖLÇÜM
- Başlangıçta nd7_tanima (ND7) ve nd6_olcum koş.
- tests/nd7k_aday.json'daki aday sayısını tür başına ver: hop / maya / malt / ekstrakt / katkı.

1. EKLEME
- Her aday için bir katalog kaydı oluştur. Alanlar uygulamanın mevcut kayıt biçimini izler.
  - Hop:
    - alfa ve beta aralığı;
    - toplam yağ;
    - köken;
    - kullanım (acılık / aroma / çift);
    - aroma tanımı (yetiştiricinin sözcükleriyle, kısa).
  - Maya:
    - tür (ale / lager / kveik / Brett / bakteri);
    - zayıflama aralığı;
    - sıcaklık aralığı;
    - flokülasyon;
    - fenol (POF) varsa;
    - alkol toleransı.
  - Malt / ekstrakt:
    - sınıf;
    - renk (°L ya da EBC, üreticinin birimiyle; ikisini de yaz);
    - ekstrakt;
    - en fazla kullanım oranı varsa.
  - Katkı:
    - tür;
    - kullanım biçimi.
- Eklenen her kayıt "kaynak" alanı taşır: url + alıntı. Değeri birden çok sayfadan geldiyse url + alıntı listesi.

2. YENİDEN BAĞLAMA
- "katalog_bekliyor" satırları yeni ürüne bağlanır. Eşleme tablosunda kural "yeni_kayit" olur.
- Eklenemeyen ürünlerin satırları sınıfta kalır. Raporda her biri için neden yazılır:
  - ürün bulunamadı;
  - üretici sayfası yok;
  - üretim dışı ve arşiv yok.
- iskelet_veri.js'i yeniden üret.
  - Yalnız maya ya da hop alanı değişen stiller listelenir.
  - Boşalan alan 0 olmalı.

3. ÖLÇÜM (önce/sonra)
- nd7_tanima ölçümleri:
  - ürüne bağlı satır oranı (tür başına);
  - sınıfta kalan satır;
  - tanınmayan satır (0 kalmalı).
- nd6_olcum ölçümleri (fixture stok):
  - iskelet-stok rozeti;
  - örnek rozeti;
  - "Stoğumla oluştur" tam sayısı.
- Eklenen / eklenemeyen ürün listesi, tür başına.

4. TEST + KAYIT
- Sentetik testler:
  - kaynaksız alan olmaz (veri testi, tüm yeni kayıtlar);
  - yeni ürüne bağlı satır stok kontrolünde doğru id ile aranır;
  - bayrak kapalı → eski.
- npm test 6 dilim (--parca).
- CEV mock 55, üç imza AYNI, kural yolu d30af8de.
  - Değişirse liste + neden yazılır.
  - Beklenen değer AYARLANMAZ; karar Claude'da.
- Commit + push.
- sw.js CACHE_VERSION +1.
- Canlı md5 = yerel.
- Eklenen satırlarda anahtar taraması 0.
- Fixture içeriği diff'te 0.
- BAĞIMSIZ DOĞRULAMA (Kaan kuralı, ZORUNLU): rapordan önce işi GÖRMEMİŞ bir doğrulayıcı alt ajan kendi başına şunlara bakar:
  - rastgele 40 yeni kayıt: url açılıyor mu, alıntı sayfada birebir geçiyor mu, değer alıntıyla aynı mı;
  - rastgele 10 eklenemedi kararı: gerçekten kaynak yok mu;
  - yeniden bağlanan rastgele 30 satır: aynı ürün mü;
  - üç imza;
  - sızıntı grep'i.
  Bulgular raporda ayrı bölüm olur.
- CLAUDE.md'ye 1–2 satır yaz; ayrıntı gorevler/SPRINT_GECMISI.md sonuna.
- SONRA: Claude rastgele 50 yeni kaydı kör alt ajanlarla yeniden doğrular.
