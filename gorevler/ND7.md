SPRINT ND7 — 988 örneğin hepsi "Stoğumla oluştur"a açılsın: malzeme TANIMA (gerçek API çağrısı YOK)

Claude, 2026-11-11. Kaan: "bütün 988 reçetenin yapılabilir olması … neden program tanımıyor". ND6'dan SONRA verilir.
Bu dosyada 7 madde var (0–6). İşe başlamadan 7'sini de okuduğunu raporun ilk satırında teyit et.
EFOR: high. MODEL: model-bağımsız; modelini ilk satırda belirt.

DURUM (Claude yerelde ölçtü, Playwright, ağ kapalı; sen kendi ölçümünle teyit et)

Satır düzeyi tanıma:
- malt: 4383 satırın 827'si tanınmıyor; 623 farklı yazım, 520'si tek sefer geçiyor.
- hop: 3310 satırın 495'i tanınmıyor; 199 farklı yazım.
- maya: 967 satırın 414'ü tanınmıyor; 373 farklı yazım.
- ek: 385 satırın 136'sı tanınmıyor.

Örnek düzeyi:
- Malt, hop ve mayası tamamen tanınan örnek: 200/988.
- Ek kalemler de sayılınca: 154.
- "📦 Stoğumla oluştur" düğmesi 156 örnekte görünüyor (_bmOrnekMalzemeliMi).
- Düğmeyi kapatan neden, tek neden olduğu durumlarda: malt tanınmadı 161 · maya tanınmadı 96 · hop tanınmadı 69.
- Miktar eksikliği yalnız 8 örnekte tek engel. Yani asıl engel MİKTAR DEĞİL, TANIMA.

Neden tanınmıyor (_bmKatCoz = normalize edilmiş adın sözlükte BİREBİR aranması; maya için ayrıca kod taraması):
- (a) Ad farklı yazılmış, ürün katalogda var:
  - "pilsner malt" → pilsner, ama "briess pilsner malt" → YOK.
  - "munich malt" → munich, ama "munich malt 10l" → YOK.
  - "citra" → citra, ama "citra (fresh)" → YOK.
  - Nedeni: marka, renk ve biçim sözcükleri birebir aramayı bozuyor.
- (b) Belirsiz genel ad:
  - "crystal malt" 57 satır, renk yok.
  - "caramunich malt" 18 satır; I/II/III'ten hangisi olduğu belli değil.
  - "caramel munich malt" 24 satır.
  - "carafa ii/iii" 30+ satır; kabuklu mu, Special mı belli değil.
- (c) Katalogda hiç yok:
  - Hoplar: Hersbrucker 40, Cluster 25, Crystal 20, Mt. Hood 21, Sorachi Ace 12, Liberty 11, Vanguard 10 …
  - Mayalar: WLP833, WLP940, WLP810, WY2007, WY1007, WLP090, WLP013 …
  - Maltlar ve ekstraktlar: red wheat, DME/LME çeşitleri, CaraVienne, Golden Naked Oats, CaraAmber, Carastan …
- (d) Maya satırı iki seçenekli: "WLP830 or Wyeast 2124". İkisi de katalogda, ama ✅-eşdeğer değiller diye satır eşlenmiyor (ND6 madde 4 bunu stok tarafında çözer).
- (e) Ürüne bağlanamayacak satırlar: "fruit", "honey (type not specified)", şişeden üretilmiş maya, probiyotik.

Claude simülasyonu (TAHMİN, kaba kurallarla; malt + hop + maya tamamen tanınan örnek sayısı):

| Adım | Örnek |
|---|---|
| Bugün | 200 |
| Marka / renk / biçim sözcüğü ayıklanırsa | 240 |
| Maya VEYA kuralı eklenirse | 254 |
| ≈32 eksik hop kataloğa eklenirse | 312 |

Kalan engel ağırlıkla kristal/karamel ailesinin belirsiz adları (madde 2) ve eksik maya kodları (madde 3).

KURALLAR
- ND6'nın KURALLAR bölümü aynen geçerli: heldout açılmaz, üç imza AYNI (2c9ebd9f-32461 · 92f59a3c-5776 · 6d7e6c6e-35582), gerçek API yok, Firebase yok, Kaan'dan iş istenmez, bayrak kapalıyken BİREBİR eski davranış.
- BV kuralı aynen: eşleme AYNI ÜRÜN içindir, ikame değildir. Benzerlik ikame motorunun (_bmIkameAday) işi.
- Bugün tanınan hiçbir satırın kimliği değişmez. Test: bugün tanınan tüm satırlar (≈7.170: malt 3556 + hop 2815 + maya 553 + ek 249) okuyucu açıkken AYNI id'yi almalı. Değişen varsa liste + neden; varsayılan cevap: değiştirme.
- Kataloğa eklenen her kayıt üretici/yetiştirici sayfasından: değer + url + ≤15 sözcük alıntı. Kaynak yoksa EKLENMEZ, listede "kaynak bulunamadı" kalır. HopDatabase gibi derlemeler tek başına kaynak sayılmaz (Nectaron hatası görüldü).
- Repo PUBLIC: örnek verisinden yalnız malzeme adı + miktar (olgu); yeni kazıma yok.

0. ÖLÇÜM ALTYAPISI
- tests/nd7_tanima.mjs. Ölçülecekler:
  - satır düzeyi tanıma (tip başına);
  - tamamen tanınan örnek sayısı;
  - _bmOrnekMalzemeliMi sayısı;
  - kalan tanınmayan adların sıklık listesi (ilk 100);
  - her eşlemenin hangi kuraldan geldiği (sözlük / okuyucu / sınıf / katalog-yeni / VEYA).
- Önce/sonra raporda tablo.

1. OKUYUCU (BM_ND7.okuyucu) — aramadan önce adı temizle
- Ayıklananlar:
  - malt evi ve marka adları (katalogdaki üretici adlarından ve örnek verisinden derlenen liste);
  - parantez içi notlar;
  - başlatıcı / paket / miktar notları;
  - "fresh / wet / whole / pellet / leaf / homegrown" biçim sözcükleri. Hop çeşidi aynı kalır, biçim satırda not olur.
- Renk okuma: renk yazıyorsa (°L / L / EBC / SRM), aynı aileden katalog kayıtları arasında en yakın renkli olan seçilir. Fark ±%25'i (6 °L altında ±1,5 °L'yi) aşıyorsa eşleme YOK.
- Konsantre biçimler AYRI üründür, sessizce pellet'e BAĞLANMAZ: Cryo, LupoMax, Incognito, lupulin tozu. Katalogda karşılığı varsa ona bağlanır (cc, cm …), yoksa madde 3'e aday olur.
- Tek ve aynı noktada çalışır (_bmKatCoz'un önünde). Arama (_bmMalzemeAra) ve ND aynı sonucu görür.

2. SINIF KURALI — belirsiz genel adlar (BM_ND7.sinif)
- Renk vermeyen "crystal malt / caramel malt / caramunich / caramel munich / medium crystal" satırı bir ürüne bağlanmaz. Satır "kristal/karamel maltı — renk belirtilmemiş" SINIF kalemi olur.
  - "Birebir" rozetinde ❔ kalır (yayımlanmış tarif belirsiz).
  - "Stoğumla oluştur"da stoktaki bir kristal/karamel maltıyla doldurulur ve ⚠️ işaretlenir: "tarif rengi vermiyor; stoktaki X (n °L) konuldu".
- Örneğin hedef SRM'si biliniyorsa, renk seçimi önce/sonra SRM'yi en az kaydıran stok kalemi olsun.
- "Carafa II / III" (Special ya da dehusked sözcüğü yok): Weyermann'ın kabuklu ve Special türlerinin rengi aynı aralıkta. SINIF kalemi "Carafa Type N (kabuklu ya da Special)" olur; stokta hangisi varsa o, not ile. Renk aynılığını Weyermann ürün belgesinden kendin doğrula (url: dis_kaynak/muadil_dogrulama_2026-11-11/kararlar.json); doğrulanamazsa sınıf kalemi kurulmaz.

3. KATALOG EKLEMELERİ (KAT-C + KAT-D birleşik; veri)
- Kapsam: tanınmayan satırlarda EN AZ 2 kez geçen hop, maya, malt ve ekstraktlar. Liste nd7_tanima çıktısından gelir.
- Hop: alfa, beta, yağ, köken, aroma tanımı — yetiştirici sayfasından.
- Maya: tür, zayıflama, sıcaklık, flokülasyon, fenol (POF) — üretici sayfasından. Hiçbir yeni mayaya ✅ MUADIL yazılmaz; ✅ ancak "aynı suş" kanıtıyla (ND6 madde 3 kuralı).
- Malt / ekstrakt: renk, ekstrakt, sınıf — üretici belgesinden.
- Raporda: eklenen / kaynak bulunamayan / bilerek eklenmeyen listesi + nedenleri.

4. MAYA SATIRI OKUMA (BM_ND7.maya)
- Tüm kodlar çıkarılır: "WLP 833", "Wyeast No. 2007", "OYL-402", "W-34/70" gibi boşluklu ya da noktalı yazımlar da.
- ND6 VEYA kuralı stok tarafında; kimlik tarafında satır İLK katalog koduna bağlanır, diğer seçenekler satırda "ya da" notu olarak görünür.
- Kodsuz tanımlayıcı satır ("belgian wit ale yeast (white labs …)", "german ale (wyeast …)"):
  - üretici + ürün adı, ÜRETİCİNİN KENDİ kataloğunda o adla TEK ürüne karşılık geliyorsa o koda bağlanır (kaynak url'si eşleme tablosunda);
  - birden çok ürüne karşılık geliyorsa bağlanmaz.

5. TANINAMAYAN SATIR ENGEL OLMASIN (BM_ND7.ozel)
- Okuyucu + sınıf + katalog sonrası hâlâ ürüne bağlanamayan satır "özel kalem — senin seçimin" olur. Örnekler: "fruit", "honey (type not specified)", şişeden üretilmiş maya.
  - "Stoğumla oluştur"da satır yerinde kalır, adı ve kaynaktaki miktarı görünür, Kaan stoktan bir kalem seçebilir ya da boş bırakır.
  - Bu satır düğmeyi KAPATMAZ.
- Miktarı kaynakta olmayan satır: ISK1 deseniyle stil iskeletinin g/L medyanından "varsayım" etiketli miktar alır; o da yoksa "miktar senin kararın".
- Hedef: malt + hop + maya satırı olan HER örnekte "📦 Stoğumla oluştur" görünür (hop satırı hiç olmayan 31 örnek ayrı listelenir).
- "Birebir" rozeti (yayımlanmış tarifi aynen) bu satırları ❔ saymaya devam eder; dürüstlük için ayrı.

6. TEST + KAYIT
- Sentetik testler:
  - okuyucu (marka, renk, biçim, konsantre biçim);
  - renk toleransı sınırı;
  - sınıf kalemi → stoktan doldurma + ⚠️ notu;
  - maya kod çıkarma (boşluklu / "No." / çok kodlu);
  - özel kalem düğmeyi kapatmıyor;
  - bugün tanınan satırların kimliği AYNI;
  - bayrak kapalı → eski.
- npm test 6 dilim (--parca), CEV mock 55, üç imza AYNI, kural yolu d30af8de (değişirse liste + neden; beklenen değer AYARLANMAZ, Claude karar verir).
- Commit + push, sw.js CACHE_VERSION +1, canlı md5 = yerel, eklenen satırlarda anahtar taraması 0, fixture içeriği diff'te 0.
- BAĞIMSIZ DOĞRULAMA (Kaan kuralı, ZORUNLU): rapordan önce işi GÖRMEMİŞ bir doğrulayıcı alt ajan kendi başına bakar:
  - diff ve üç imza;
  - nd7_tanima önce/sonra (kendisi koşar);
  - rastgele 30 yeni eşleme: aynı ürün mü, kural doğru mu;
  - rastgele 10 yeni katalog kaydı: url açılıyor mu, değer sayfada var mı;
  - bugün tanınan satırlarda kimlik değişimi 0;
  - sızıntı grep'i.
  Bulgular raporda ayrı bölüm.
- CLAUDE.md'ye 1–3 satır; ayrıntı gorevler/SPRINT_GECMISI.md sonuna.
