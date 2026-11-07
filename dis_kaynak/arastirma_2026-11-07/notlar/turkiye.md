# Türkiye'ye özgü kaynaklar — Brewmaster için dış araç taraması (erişim tarihi 2026-11-07)

Kapsam notu: Önceki (yarıda kesilen) araştırmacının bulguları dahil edildi. Bu ortamdan iski.istanbul (WebFetch "robots_disallowed", curl "connection reset"), mevzuat.gov.tr ve eskisehir-eski.gov.tr (robots_disallowed), web.archive.org (site blocked) ve data.ibb.gov.tr API (erişim reddedildi) okunamadı. Bu, o sayfaların yok olduğu anlamına gelmiyor; normal bir tarayıcıdan büyük olasılıkla açılır. Fiyatlar TL, 2026-11-07 tarihli liste fiyatlarıdır.
Karar kodları: AL = al, DENE = dene, İZLE = izle, ALMA = alma. Emek: S = küçük (≤1 oturum), M = orta, L = büyük.

## 1. İstanbul şebeke suyu analizleri (İSKİ), hangi tesis hangi ilçe, makinece okunur veri; Ankara / İzmir

### Takeaway
İSKİ tesis bazında su kalitesi raporu yayımlıyor, ama bu ortamdan okunamadı. Ulaşılabilen en sağlam ikincil kaynak 2019 tarihli hakemli bir derleme. O derlemede İstanbul için klorür ≈37, sülfat ≈48, sodyum ≈20 mg/L ve sertlik ≈151 mg/L CaCO3 var. Kalsiyum, magnezyum ve bikarbonat (alkalinite) şehir bazında verilmemiş; oysa mash pH hesabı için en kritik değer bikarbonat. İBB Açık Veri'de su kalitesi veri seti yok. Bu yüzden Brewmaster'a "İstanbul (kaba, 2019)" başlangıç profili ve kullanıcının kendi raporundan elle değer girmesi en gerçekçi yol; otomatik veri çekme şu an mümkün görünmüyor.

### Cited Findings
- İSKİ su analiz raporlarını kendi sitesinde bir "su kalitesi raporları" sayfasında yayımlıyor. Ağustos 2018 raporu ≈35 kimyasal parametre içeriyordu. Örnek alma noktaları Büyükçekmece, İkitelli, Kâğıthane gibi yerleşim yerleri. Yazara göre ilgili kimyasalların en az %80'i analiz kapsamında değil. Yazı 25.09.2018 tarihli; Ca, Mg, Na, Cl, SO4, sertlik, alkalinite ya da pH değeri vermiyor — [bianet, Bülent Şık, "Kamusal Bilim 3"](https://bianet.org/yazi/kamusal-bilim-3-iski-nin-su-analizleri-ne-kadar-guvenilir-201103)
- İstanbul şebeke suyunun 2019 değerleri, İSKİ'nin yayımladığı sonuçlardan derlenmiş (6 bölge, Ocak ve Temmuz 2019, ortalama±SS, medyan (min–maks)):
  - pH 7,16±0,19 (6,83–7,47)
  - klorür 36,92±14,68 mg/L; medyan 28,6 (22,2–74,6)
  - sülfat 48,33±24,88; medyan 41,45 (16,3–94,3)
  - sodyum 19,70±10,88; medyan 14,8 (11,0–47,2)
  - toplam sertlik 15,08±2,63 °Fr (11,4–21,4 °Fr)
  - nitrat 2,99; florür 0,08
  - Ca, Mg ve HCO3 şehir bazında YOK. Üç şehrin toplamında Ca 48,05±6,96 mg/L, Mg 7,53±3,13 mg/L, K 2,91.
  - Aynı makalede İzmir: klorür 29,4, sülfat 44,1, Na 34,3, sertlik 27,9 °Fr, nitrat 16,4. Ankara: sülfat 71,7±68,3 (3,1–190), iletkenlik 53 mS/m, kalıntı klor 0,51 mg/L.
  - Bunlar yazarın kendi ölçümü değil, ASKİ/İSKİ/İZSU'nun yayımladığı sonuçlar. Makalede metin ile tablo arasında birim tutarsızlıkları var (klorür µg/L ↔ mg/L).
  — [Koçak C., Turk J Public Health 18(3):210–225, 2020, DOI 10.20518/tjph.745908](https://dergipark.org.tr/tr/download/article-file/1128441)
- İstanbul 2017 içme ve kullanma suları (39 ilçe, toplu): pH 6,95±0,14 (6,62–7,28); tartışma bölümünde başka bir değer veriliyor, yani makale kendi içinde tutarsız. İletkenlik 376±79 µS/cm (282–614). Serbest klor ölçümlerinin %0,04'ü 0,2 ppm'in altında. Ca, Mg, Na, Cl, SO4 ve HCO3 yok — [Güner & Önal, ESTÜDAM Halk Sağlığı Derg. 6(2):130–7, 2021](https://dergipark.org.tr/en/download/article-file/1519961)
- Şubat 2011 arıtma tesisi çıkış ortalamaları. Bir forum kullanıcısı, eşinin İSKİ tesisinde çalıştığını söyleyerek aktarmış; resmî belge değil:
  - toplam sertlik (mg/L CaCO3): Büyükçekmece 214, İkitelli 138, Kağıthane 149, Ömerli-Emirli 129, Ömerli-Muradiye/Orhaniye 103, Ömerli-Osmaniye 110, Elmalı 127
  - klorür 20–44 mg/L; tesis çıkışında serbest klor 1,0–1,6 mg/L (kullanıcıya göre şebekede 0,1–0,5); pH 6,9–7,4
  - Eski İSKİ aylık rapor linki: iski.gov.tr/Web/statik.aspx?KID=1000811
  — [akvaryum.com forum, 17.02.2011](https://www.akvaryum.com/forum/istanbul_sebeke_suyu_degerleri_subat_ayi_k448779.asp) (DOĞRULANMAMIŞ ikincil kaynak, 15 yıllık)
- Su arıtma cihazı satan bir firmanın sitesi (09.06.2026): İSKİ şebekesinde serbest klor 0,2–0,5 mg/L, pH 7–8, su "orta sert–sert", tek bir değer yok, raporlar tesis bazında. Tesis düzeyinde sayı vermiyor — [overwater.com.tr](https://www.overwater.com.tr/istanbul-musluk-suyu-icilir-mi-su-sertligi-ve-kirec-rehberi) (satıcı; güveni düşük)
- İstanbul suyunun %97'si barajlardan gelen yüzey suyu. İki ana sistem var: Anadolu yakasında Ömerli–Darlık, Avrupa yakasında Terkos–Alibeyköy. Ek kaynaklar Istranca barajları, Yeşilçay regülatörü ve Melen (1. aşama 2007). Sayfa tesis–ilçe eşleşmesi vermiyor — [Wikiwand: Water supply and sanitation in Istanbul](https://www.wikiwand.com/en/articles/Water_supply_and_sanitation_in_Istanbul)
- İBB Açık Veri Portalı'nda İSKİ'nin "su" etiketli tek veri seti, Melen ve Yeşilçay regülatörlerinden kullanılan yıllık su miktarı (m³, 2014–2021). İçme suyu kalitesi, analiz ya da arıtma tesisi veri seti görünmüyor — [data.ibb.gov.tr](https://data.ibb.gov.tr/en/organization/97037a3e-bed5-4002-b3f2-9a0f97437d2d?tags=su)
- İSKİ 17.10.2026'da "şebeke suyuna kanalizasyon suyu karıştı" iddialarının gerçeği yansıtmadığını açıkladı — [Evrensel, 17.10.2026](https://www.evrensel.net/haber/6005354/iskiden-aciklama-istanbulun-sebeke-suyuna-kanalizasyon-suyu-karisti-iddialari-gercegi-yansitmiyor)
- (Kullanıcının mahalle/ilçe tespiti bu repo kopyasından çıkarıldı — kişisel konum public repoya girmez. Sonuç: Anadolu yakasında bir ilçe.)
- Başka şehirlerden örnekler: Adana ASKİ'nin "İçme Suyu Analiz Sonuçları" sayfası var — [adana-aski.gov.tr](https://www.adana-aski.gov.tr/web/icmesuyuanaliz.aspx). Eskişehir ESKİ aylık "İçmesuyu Arıtma Tesisi Laboratuvarı Kimyasal Analiz Raporu" PDF'i yayımlıyor (Mayıs ve Ağustos 2026 dosyaları arama sonucunda görüldü, içerik okunamadı) — [ESKİ Ağustos 2026](https://eskisehir-eski.gov.tr/uploads/laboratuvar/aylik_rapor/Agustos2026.pdf). Ankara (ASKİ) için aramada yalnız salgın iddialarına verilen basın açıklamaları çıktı — [NTV](https://www.ntv.com.tr/turkiye/galeri-ankarada-su-kaynakli-salgin-iddiasina-askiden-aciklama-verileri-tek-tek-paylasti-1734983).
- Brewmaster'ın içi (yerel repo grep, Brewmaster_v2_79_10.html):
  - Satır ≈4894–4920: SU_PROFILLERI yorumunda kaynak olarak "GISA Türkiye su raporları" yazıyor, ama listede İstanbul/Türkiye şebeke ya da Türk şişe suyu profili YOK. Profiller: Burton, Pilsen, Dublin, Munich, …, RO/damıtık, RO+remin.
  - Satır ≈30855–30859 (klorofenol teşhisi): "musluk suyu + Campden bilgisi programda henüz kayıtlı değil" ve "kloramin UÇMAZ" uyarısı var.

### Inferences
- 2019 ortalama sertliği (≈151 mg/L CaCO3) ve üç şehrin toplu Mg değeri (≈7,5) ile hesaplanırsa İstanbul Ca ≈48 mg/L çıkar; bu, toplu Ca ortalamasıyla tutarlı. HCO3 hiçbir kaynakta yok. İletkenlik (≈376 µS/cm) ve sertlik düzeyi, HCO3'ün orta düzeyde olduğunu düşündürüyor, ama bu bir TAHMİN. Kalıntı alkalinite hesaplanamadığı için mash pH önerileri İstanbul suyunda belirsiz kalır.
- Tesis değerleri ve mevsim arasında fark büyük: sertlik 103–214 (2011), sülfat 16–94 (2019). Tek bir "İstanbul profili" yanıltıcı olur. Profil ancak "kaba başlangıç, kendi raporunu gir" uyarısıyla kullanılmalı.
- kullanıcının ilçesi Anadolu yakasında olduğu için suyunun Ömerli–Darlık sistemi (Ömerli ya da Elmalı tesisleri) ve/veya Melen'den gelmesi beklenir. Bu bir ÇIKARIM; tesis–ilçe eşleşmesini doğrulayan kaynak bulunamadı.
- Kullanıcı tarafı için öneri: İSKİ sayfası bu ortama kapalı, ama Kaan'ın kendi tarayıcısından (ya da Claude in Chrome ile) okunabilir. Değerler bir kez elle alınıp "Benim suyum" profiline girilebilir.
- Envanter:
  - [AL, S] Brewmaster'a "İstanbul şebeke (2019 ort., kaba)" profili ekle: Cl 37, SO4 48, Na 20, Ca ≈48 (türetilmiş), Mg ≈7,5 (toplu), HCO3 "bilinmiyor". Profil kaynak ve tarih etiketi, ayrıca "HCO3/alkaliniteyi kendi raporundan ya da test kitinden gir" uyarısı taşısın.
  - [AL, S] "Benim suyum" girişine tesis seçimi ve rapor tarihi alanı ekle. Kaan'ın iki büyük önceliği, kaynaklı değer ve tarih, böylece görünür olur.
  - [DENE, S] İSKİ tesis raporunun güncel PDF'ini Kaan'ın tarayıcısıyla al ve Ömerli/Elmalı için gerçek iyonları doğrula; HCO3/alkalinite raporda var mı, kontrol et.
  - [İZLE] İBB Açık Veri (su kalitesi veri seti yok), ESKİ/Adana gibi aylık PDF yayımlayan kurumlar. Otomatik çekme yalnız İstanbul dışı kullanıcı çıkarsa anlamlı.
  - [ALMA] Satıcı blogları (overwater vb.) ve 2011 forum tablosu birincil veri değil; yalnız "aralık bilgisi" olarak anılabilir.
  - [DENE, S] Klorofenol teşhisine "İstanbul şebeke suyu klorlu; kullanılan dezenfektan türü (klor mu, kloramin mi) doğrulanmadı" notu ekle. İSKİ kloramin kullanıyor mu, bulamadım (bkz. Gaps).

### Gaps
- Bulamadım: İSKİ'nin güncel (2025–2026) tesis bazlı raporundaki Ca, Mg, HCO3/alkalinite değerleri. Site robots ile kapalı, Wayback Machine engelli.
- Bulamadım: hangi arıtma tesisinin hangi ilçeye (kullanıcının ilçesi dahil) su verdiği; resmî bir harita ya da tablo yok.
- Bulamadım: İSKİ'nin dezenfeksiyonda klor mu kloramin mi kullandığı. Aramada konuyu doğrudan söyleyen bir kaynak çıkmadı.
- Bulamadım: yayın sıklığı (aylık mı?). 2011 forumu "aylık" diyor, 2018 bianet aylık rapordan söz ediyor, ama 2026 için doğrulanmadı.
- kullanıcının mahallesinin İstanbul'da başka ilçede de olup olmadığı tam taranmadı; yalnız kullanıcının ilçesi kaydı doğrulandı.
- Ankara ASKİ ve İZSU'nun tesis bazlı iyon raporları: doğrudan bir yayın sayfası bulunamadı (yalnız 2019 derlemesi var).

## 2. Türk ambalajlı (şişe / damacana) su markalarının mineral analizleri

### Takeaway
Türkiye'deki doğal kaynak sularının çoğu çok düşük mineralli; ortanca değerler Ca ≈6–14, SO4 ≈4, Cl ≈2 mg/L. Bu da onları "yumuşak baz su" (Pilsen benzeri) olarak kullanışlı yapıyor. Ancak marka bazında, güncel ve resmî bir etiket tablosu bulunamadı. Hakemli çalışmalar markaları anonim kodlarla veriyor; perakende sayfaları (Migros) analizi göstermiyor. En sağlam yol, kullanıcının şişe etiketinden değer girmesi.

### Cited Findings
- 2019 bakanlık izin listesi ve firma analizlerinden derlenen grup özetleri (marka adı YOK):
  - doğal kaynak suyu (n=244), medyan: Ca 6,55 mg/L (2,8–62,6), Mg 2,32, Na 3,21, K 0,55, Cl 2,03, SO4 4,03, HCO3 122 (75–753), pH 7,43, iletkenlik 8,3 mS/m
  - doğal mineralli su (n=59): Ca 19,4, Mg 3,4, Na 6,55, SO4 6,5, HCO3 107 (12–3026)
  - işlenmiş içme suyu (n=35): Na 3,8, Cl 3,0, SO4 0,66
  - Değerler firmaların beyanı; il sağlık müdürlüğü onaylı analizler ve etiketler kullanılmış.
  — [Koçak 2020](https://dergipark.org.tr/tr/download/article-file/1128441)
- 70 marka, 2007'de 8 ilden satın alınan şişeler, LABORATUVAR ölçümü, markalar kodlu (anonim):
  - aralıklar (medyan): Ca 0–50,9 (13,6), Mg 0,1–19 (2,4), Na 0,1–76,8 (4,9), SO4 0–62 (4,0), Cl 0–23,3 (1,6), HCO3 2–189 (73,5), pH 6,07–9,16 (7,78)
  - en düşük mineralli örnekler: kod 68 Ca 1,1 / Mg 0,2 / Na 1,6 / SO4 0 / Cl 0,3 / HCO3 6; kod 38 Ca 1,7 / HCO3 9; kod 53 (ters ozmozla işlenmiş) neredeyse sıfır, pH 6,07
  — [Güler & Alpaslan, J Food Compos Anal 22:728–737, 2009](https://www.literature.wolkersdorfer.info/literature/Mineral%20content%20of%2070%20bottled%20water%20brands%20sold%20on%20the%20Turkish%20market%20Assessment%20of%20their%20compliance%20with%20current%20regulations.pdf)
- Migros'un Erikli 1 L ürün sayfası mineral analizi göstermiyor; yalnız "Doğal Kaynak Suyu" yazıyor ve besin değerleri 0 (2026-11-07) — [migros.com.tr](https://www.migros.com.tr/erikli-su-1-l-p-7b04fa)
- Ekşi Şeyler'de "Erikli mi, Saka mı, Hayat mı, Pınar mı: etikette nelere bakılmalı" yazısı var, fakat sayfa açılamadı (client_error) — [eksiseyler.com](https://eksiseyler.com/erikli-mi-saka-mi-hayat-mi-pinar-mi-su-secerken-etikette-nelere-bakilmali)

### Inferences
- Koçak 2020'deki doğal kaynak suyu medyanları iyon dengesini tutmuyor: Ca 6,55 + Mg 2,3 + Na 3,2 mg/L ≈0,65 meq/L katyon, buna karşılık HCO3 122 mg/L ≈2 meq/L. HCO3 sütununda bir veri hatası olabilir. Güler & Alpaslan'ın laboratuvar medyanı (HCO3 73,5, Ca 13,6) daha tutarlı.
- Doğal kaynak suları genelde Pilsen profiline yakın, yani soluk lager ve Weizen için iyi bir baz. Koyu stillerde ise alkalinite eksik kalabilir.
- Envanter:
  - [AL, S] Brewmaster'a "Türk doğal kaynak suyu (tipik, düşük mineral)" genel profili ekle; kaynak: Güler & Alpaslan 2009 laboratuvar medyanları, tarih etiketiyle. Marka adı KOYMA.
  - [AL, S] "Şişe etiketinden gir" formu ekle: Ca, Mg, Na, Cl, SO4, HCO3, pH ve etiket tarihi. Damacana ya da şişe seçilince profil kaydedilsin.
  - [ALMA] "En iyi su markaları" listeleri (eniyimarka, listeledik vb.): reklam/SEO içerikli, analiz kaynağı yok.
  - [İZLE] Marka sitelerindeki resmî analiz PDF'leri (Erikli, Hayat, Pınar, Saka, Sırma vb.) bu taramada açılmadı; tek tek doğrulanırsa adlı profiller eklenebilir.

### Gaps
- Bulamadım: Erikli, Hayat, Pınar, Saka, Sırma, Damla, Hamidiye vb. için güncel ve resmî marka bazlı iyon değerleri (etiket ya da firma PDF'i).
- Sağlık Bakanlığı'nın marka bazlı izin/analiz listesi (Koçak'ın kullandığı) çevrimiçi bulunamadı.

## 3. Türk ev biracılığı tedarikçileri, katalogları, Hitit, Türk şerbetçiotu, Thracian, Anadolu Efes; teknik föy ve fiyatlar

### Takeaway
Türk dükkânları (BiraBurada, biradas, egemalt, vinomarket) ürün liste sayfalarında EBC, alfa asit ya da hasat yılı yayımlamıyor ve makinece okunur katalog sunmuyor. Bilecik/Pazaryeri şerbetçiotu gerçek: çeşitler "aroma, brewers gold, Erciyes, Ege, Pazaryeri". Ama Türk Brewers Gold'un alfa asidi satıcıya göre %8–9 ile %12,5 arasında değişiyor. Ege, Erciyes ve Pazaryeri için hiçbir alfa değeri ve "TARBES" tescili bulunamadı. "Thracian Malt" Yunan malı; Brewmaster bunu zaten doğru etiketlemiş. Hitit Malt'ın web varlığı ise bulunamadı.

### Cited Findings
- Bilecik Pazaryeri'nde yetiştirilen çeşitler: "aroma", "brewers gold", "Erciyes", "Ege", "Pazaryeri". Ekim alanı ≈1.400 dekar. Ürün Pazaryeri kooperatifinde (OT-GÜL KOOP) ve özel bir şirkette işleniyor. 2024 alış fiyatı kg başına 69 TL (aroma) ve 67 TL (diğerleri). Haber, çeşitlerin Türkiye'de ıslah edildiğini SÖYLEMİYOR ve alfa asit vermiyor — [AA, 21.08.2024](https://www.aa.com.tr/tr/yasam/turkiyede-sadece-bilecikte-yetistirilen-serbetci-otu-hasat-ediliyor/3309515)
- Bilecik şerbetçiotu coğrafi işaret tescili aldı — [AA](https://www.aa.com.tr/tr/turkiye/bilecikin-serbetci-otu-cografi-isaret-tescil-belgesi-aldi/2092520) (tescil tarihi bu taramada doğrulanmadı)
- Türk Brewers Gold'un alfa asit değerleri ÇELİŞİYOR:
  - biradas.com, "Brewers Gold Şerbetçi Otu 50 g": Pazaryeri/Bilecik, OTGÜL-KOOP, pellet, alfa %12,5, üretim 2024, son tüketim 2028 — [biradas.com](https://www.biradas.com/brewers-gold-serbetci-otu-50-gr.-serbrews)
  - vinomarket.com.tr, "Brewer's Gold - Aroma - 50 gr" (FERMENTİUM markası, "%100 yerli Bilecik pellet"): alfa %8–9 — [vinomarket.com.tr](https://vinomarket.com.tr/brewer-s-gold-aroma-serbetciotu-50-gr)
  - Brewers Gold için genel değer %5,5–6,5 (brouwland'dan çeviri, Sertaç Akar, site 2015) — [evdebirayapimi.wixsite.com](https://evdebirayapimi.wixsite.com/evdebirayapimi/sotu-cesitleri)
- egemalt.com, "Aroma Şerbetçiotu 100 g": Bilecik kökenli, alfa ≈%3–6, 199,90 TL, stokta yok, 100 g vakumlu alüminyum paket. Beta asit, yağ ve hasat yılı yok. Dükkânda malt özü (Bandit Crow vb.), maya, kit ve ekipman da var. Malt teknik verisi (EBC, ekstrakt, nem) görünmüyor — [egemalt.com](https://egemalt.com/urun/aroma-serbetci-otu/)
- BiraBurada genel (2026-11-07): ana bileşenler ve çoğunluğu Kegland marka ekipman; blog ve "Bira Tarifleri" sayfası var. Forum ya da yarışma görünmüyor. WhatsApp hattı ve bir lokasyon sayfası (/sayfa/biraburada-depo) var. Kategoriler /kategori/maltlar, /serbetci-otlari, /mayalar, /tam-tahil-set, /malt-ozut — [biraburada.com](https://www.biraburada.com/)
- BiraBurada maltları (21 ürün; liste sayfasında EBC YOK):
  - Weyermann: Pilsener 5 kg 799,07 TL; Pale 5 kg 728,89; Pale Wheat 5 kg 631,56; Vienna 5 kg 684,00; Munich 1 kg 189,01; Caramunich I 278,16; Caramunich III 194,37; Carafa II 185,25; Carafa III Special 222,22; Melanoidin 191,71; Abbey 224,52; Rye 169,83
  - Best Chocolate 1 kg 140,41 (indirimli); "Melanoidin Ruby Malt Thracian" 154,05
  - TÜKENDİ: Thracian Pale ve Thracian Pilsener (5 kg 535,80), Viking Pilsner (5 kg 446,17), Weyermann Extra Pale
  - HİTİT malt listede YOK.
  — [biraburada.com/kategori/maltlar](https://www.biraburada.com/kategori/maltlar)
- BiraBurada şerbetçiotları (sayfa 1, 30 ürün, hepsi 100 g; alfa asit, hasat yılı ve menşe YOK):
  - Barth-Haas: Magnum 197,75 TL; Perle 279,68; EKG 332,28; Saaz 361,60; Hallertauer Mittelfrüh 372,90; Cascade 358,66; Mosaic 443,02; Citra 514,15; Callista 312,44
  - Yakima Chief: Nelson Sauvin, Motueka, Krush 509,01; Riwaka 704,78
  - "TnT" ve "Aloha Şerbetçiotu Karışımı" 274,30 (TÜKENDİ, Barth-Haas markasıyla listelenmiş)
  - Türk/Bilecik şerbetçiotu sayfa 1'de YOK.
  — [biraburada.com/kategori/serbetci-otlari](https://www.biraburada.com/kategori/serbetci-otlari)
- BiraBurada mayaları (15 ürün):
  - BiraBurada markalı: "Maya İngiliz - NEIPA No04" 196,65 TL; "Maya Belçika Tipi" 203,21; "Maya Amerikan Ale" 196,65; "Maya Belçika - NEIPA No33" (TÜKENDİ); "Maya Alman Weisbier" 203,21 (TÜKENDİ); "Maya Lager Tipi" 229,43 (TÜKENDİ)
  - Markası yazılmayan diğerleri: Farmhouse, NewLager, Abbaye, London, American West Coast (10 g), Pomona, Tripel
  - BiraBurada mayaları için incelme (attenuation), sıcaklık, çökelme (flokülasyon), ticari suş eşdeğeri ya da üretici BELİRTİLMEMİŞ.
  — [biraburada.com/kategori/mayalar](https://www.biraburada.com/kategori/mayalar)
- biradas.com kendi adıyla maya satıyor ("Biradaş 18 Ale buğday", "Biradaş 27 Lager", "Biradaş Kveik"); ayrıca Fermentis US-05 ve BE-58, tam tahıl paketleri, danışmanlık. İletişim destek@biradas.com; kargo Pazartesi, Çarşamba, Cuma — [biradas.com](https://www.biradas.com/brewers-gold-serbetci-otu-50-gr.-serbrews)
- "Thracian Malt" Yunan üretimi: Macedonian Thrace Brewery S.A. (Vergina markası). Thracian Malt Blonde soluk bir baz malt, 3,0–4,5 EBC; arpa Doğu Makedonya ve Trakya'dan. Wheat, Dark, Pale Ale, Ruby ve Organic çeşitleri de var — [verginabeer.com](https://www.verginabeer.com/en/malt/thracian-malt-blonde/)
- Brewer's Friend'de "Hitit Malt" kullanan halka açık reçeteler var (Hitit Pilsner; Hitit Pilsner/Munich/Brewers Gold) — [brewersfriend 1107688](https://www.brewersfriend.com/homebrew/recipe/view/1107688/hitit-malt-pilsner-munich-brewers-gold), [brewersfriend 1455378](https://www.brewersfriend.com/homebrew/recipe/view/1455378/hitit-pilsner)
- Anadolu Efes'in tarım kitabı ve sürdürülebilirlik raporları, şirketin sözleşmeli arpa ve şerbetçiotu üretimini anlatıyor (içerik bu taramada okunmadı) — [efes_tarim_kitap.pdf](https://www.anadoluefes.com/Upload/Docs/efes_tarim_kitap.pdf), [Sürdürülebilirlik Raporu 2018](https://anadoluefes.com.tr/admin/images/Sustainability/2018.pdf), [Cumhuriyet: Anadolu Efes'ten 11 milyon liralık şerbetçiotu](https://www.cumhuriyet.com.tr/haber/anadolu-efesten-11-milyon-liralik-serbetciotu-1762568)
- Brewmaster'ın içi (yerel grep, Brewmaster_v2_79_10.html):
  - satır 4494–4498: hitit_aroma aa 9,0; hitit_bg aa 9,0; tr_ege aa 11,0; tr_erciyes aa 12,0; tr_pazaryeri aa 10,0. Son üçünde "Spec tahmini — resmi PDF yok" notu var.
  - satır 10688–10690: "TARBES A.Ş. (Anadolu Efes) tescilli" deniyor, kaynak yok.
  - satır 1587–1588 (yedek dosya): TnT/Aloha "BiraBurada harman" aa 8,0.
  - satır 4559–4568: BiraBurada mayaları US-05, WB-06, BE-256, W-34/70 ve S-04 "eşdeğeri" olarak kayıtlı; kendi notlarında "kimlik doğrulanmadı — üretici kaynağı yok" yazıyor.
  - Thracian maltları zaten "Yunanistan" olarak etiketli (satır ≈1445–1453).

### Inferences
- Brewmaster'daki Ege %11, Erciyes %12, Pazaryeri %10 ve "TARBES A.Ş. (Anadolu Efes) tescilli" bilgileri kaynaksız. Kaan'ın "bulamadım de, uydurma" kuralına göre alfa alanı "bilinmiyor / paket etiketinden gir" olmalı ve TARBES iddiası kaldırılmalı ya da "doğrulanmadı" diye işaretlenmeli.
- "Hitit Aroma aa 9,0" egemalt'ın Bilecik Aroma değeriyle (%3–6) çelişiyor. Brewers Gold için %8–9 ile %12,5 arası değerler partiye ve satıcıya bağlı. Brewmaster sabit değer yerine "paketteki alfa" girişini zorunlu kılmalı; sabit değer yalnız gösterge olarak kalsın.
- TnT/Aloha karışımları site üzerinde Barth-Haas markalı görünüyor ve alfa yok. Brewmaster'daki "BiraBurada harman, aa 8,0" iddiası kaynaksız.
- BiraBurada mayalarının ticari suş eşdeğerliği hiçbir sayfada yazmıyor. Brewmaster bunu zaten "doğrulanmadı" diye işaretlemiş; bu doğru ve korunmalı.
- Envanter:
  - [AL, S] Türk şerbetçiotu kayıtlarını düzelt: alfa için "satıcıya göre %3–6 (Aroma), %8–12,5 (Brewers Gold)" aralığı ve kaynak linkleri. Ege/Erciyes/Pazaryeri → "alfa bulamadım". TARBES iddiası → "doğrulanmadı".
  - [AL, S] Fiyat alanı için BiraBurada liste fiyatlarını (2026-11-07) tarih damgasıyla ekle; güncelliği gösterilsin.
  - [DENE, M] Dükkânlardan (BiraBurada, biradas, egemalt, vinomarket) elle fiyat/stok güncellemesi. Otomatik tarama ALMA: makinece okunur katalog yok, ayrıca sayfa yapısı kırılgan ve bu, dükkânların kullanım şartları sorusunu doğurur.
  - [İZLE] Anadolu Efes tarım kitabı: Türk şerbetçiotu çeşitlerinin kökeni ve alfa değeri için olası birincil kaynak; okunmalı.
  - [ALMA] "Hitit Malt" EBC değerleri (Brewmaster'da çok sayıda kayıt) için web'de kaynak bulunamadı. Kaynak bulunana dek "üretici föyü yok" etiketi şart.

### Gaps
- Bulamadım: Hitit Malt'ın üreticisi, sitesi ya da teknik föyü. Hitit ürünleri BiraBurada'da da yok.
- Bulamadım: "TARBES" diye bir kurum ya da tescil kaydı; Ege, Erciyes ve Pazaryeri çeşitlerinin alfa/beta/yağ değerleri ve ıslah kökeni.
- BiraBurada şerbetçiotu listesinin 2. sayfası ve ürün detay sayfaları (alfa yazıyor olabilir) okunmadı.
- Anadolu Efes'in malt ürünleri (homebrew için satılıyor mu?) bulunamadı.

## 4. Türk ev biracılığı toplulukları, forumlar, Telegram/Facebook, Türkçe kitaplar, terim sözlükleri, yarışmalar

### Takeaway
Görünür, aktif ve kurumsal bir Türk ev biracılığı topluluğu, yarışması ya da Türkçe bira terimleri standardı bulunamadı. Kalıntılar dağınık: Ekşi Sözlük başlıkları, kişisel siteler (evdebirayapimi, 2015), dükkân blogları ve Ankara Üniversitesi açık ders malzemeleri. Bu yüzden Brewmaster'ın terim sözlüğü kendi içinde tanımlanmak zorunda.

### Cited Findings
- Kişisel Türkçe ev biracılığı sitesi: Sertaç Akar, 2015; şerbetçiotu listesi brouwland.com'dan çeviri — [evdebirayapimi.wixsite.com](https://evdebirayapimi.wixsite.com/evdebirayapimi/sotu-cesitleri)
- Bianet'te Tamer Karalar'ın "Evde bira yapımı: kolay, ucuz, leziz" yazısı — [bianet](https://bianet.org/yazi/evde-bira-yapimi-kolay-ucuz-leziz-195121)
- Ekşi Sözlük'te "evde bira yapımı" başlıkları (yalnız işaret, kaynak değil) — [eksisozluk 58980773](https://eksisozluk.com/entry/58980773), [eksisozluk 52443175](https://eksisozluk.com/entry/52443175)
- Bira Akademisi şerbetçiotu rehberi (Türkçe) — [biraakademisi.com](https://www.biraakademisi.com/serbetciotu-rehberi/)
- Brewer's Friend'de "EvBiracisi" adlı bir Türk kullanıcı profili var — [brewersfriend](https://www.brewersfriend.com/homebrew/brewer/85976/EvBiracisi)
- Ankara Üniversitesi açık ders sisteminde bira ve malt teknolojisi malzemeleri arama sonuçlarında çıktı (içerik okunmadı) — [acikders.ankara.edu.tr 49316](https://acikders.ankara.edu.tr/mod/resource/view.php?id=49316), [4743](https://acikders.ankara.edu.tr/mod/resource/view.php?id=4743)
- Yarışma aramasında yalnız ABD (AHA NHC) ve Hırvatistan sonuçları çıktı, Türkiye'den yok — [AHA NHC 2026](https://homebrewersassociation.org/news/get-ready-for-the-2026-national-homebrew-competition-nhc), [Croatia Week](https://www.croatiaweek.com/12th-croatian-homebrew-championship-set-to-take-place/)

### Inferences
- [İZLE] Ekşi ve dükkân blogları terim kullanımını gözlemek için işe yarar (ör. "mayşe", "şıra"); ama standart değiller.
- [DENE, S] Brewmaster içinde "Brewmaster Terim Sözlüğü" oluştur: her teknik terime tek bir sade Türkçe karşılık ve bir kısa açıklama. Bu, 7. maddedeki jargon denetimine sözlük olarak beslenir.
- [ALMA] Yarışma entegrasyonu: Türkiye'de bulunabilen bir yarışma yok.

### Gaps
- Bulamadım: aktif Türk Telegram/Facebook/Discord grupları (adı ve üye sayısıyla), Türk ev biracıları derneği, Türkiye'deki ev biracılığı yarışmaları.
- Bulamadım: TDK Terim Sözlükleri'nde ya da bir TSE standardında bira terimleri (mash, wort, sparge karşılıkları); aramada Türkçe bira terim sözlüğü çıkmadı.
- Türkçe ev biracılığı kitapları (çeviri ya da telif) bu taramada aranamadı.

## 5. Yasal çerçeve (ev üretimi, TAPDK), gümrük / e-ticaret 2026, Firebase senkronu ve KVKK

### Takeaway
İkincil kaynaklara göre Türkiye'de ticari amaç olmadan, yılda 350 litreyi aşmamak kaydıyla, evde bira/şarap gibi fermente içki yapmak yasal; damıtma (rakı) yasak. Kanun maddesinin birincil metni bu ortamdan doğrulanamadı. TAPDK'nin görevleri artık Tarım ve Orman Bakanlığı'nda (TADAB). Yurt dışı e-ticaretteki 30 € muafiyeti, 7 Ocak 2026 tarihli Cumhurbaşkanı Kararı'yla kaldırıldı. KVKK'da yalnız kişinin kendisi ve aynı evdeki ailesi için yaptığı işleme "tam istisna" sayılıyor. Uygulama başkalarına açılırsa, Firebase'e (yurt dışı) aktarım için 2024 sonrası rejim, yani standart sözleşme ve 5 iş günü içinde bildirim, gündeme gelir.

### Cited Findings
- Köşe yazısına göre (t24, Mehmet Yalçın; tarih sayfada yok, Özilhan tartışması dönemi) yasa bira ve şarap gibi fermente içkilerin "Ticarî amaç olmaksızın ve 350 litreyi aşmamak kaydıyla" yapılmasına izin veriyor; rakı (damıtma) evde yasak. Türk ev biracıları maltı Almanya ve İngiltere'deki dükkânlardan sipariş ediyor — [t24](https://t24.com.tr/yazarlar/mehmet-yalcin/evde-bira-firtinasi,19084)
- Al-Monitor (Mehmet Çetingüleç, Kasım 2017): 2008'deki bir yasa değişikliği kişilerin yılda 350 L'ye kadar fermente içki (şarap, bira) üretmesine izin verdi; şart "yalnız kişisel tüketim". Satış ve damıtık içki üretimi yasak. Kaynak, eski TAPDK kurul üyesi Nazime Gürkan; yasanın adı ve maddesi verilmiyor — [al-monitor.com](https://al-monitor.com/pulse/originals/2017/11/turkey-boom-in-homemade-booze.html)
- Anadolu Efes yöneticisi Tuncay Özilhan evde bira yapımının "vergi kaybına" yol açtığını söyledi, sonra geri adım attı — [Diken](https://www.diken.com.tr/?p=533255), [BirGün](https://www.birgun.net/haber/anadolu-efes-ten-geri-adim-202809)
- Alkol piyasasıyla ilgili görevler Tarım ve Orman Bakanlığı Alkol ve Alkollü İçkiler Daire Başkanlığı'nın (TADAB) sayfasında yer alıyor — [tarimorman.gov.tr/TADAB](https://www.tarimorman.gov.tr/TADAB/Menu/23/Alkol-Ve-Alkollu-Ickiler-Daire-Baskanligi)
- Yurt dışından alışverişte muafiyet: 2024'te muafiyet sınırı 150 €'dan 30 €'ya indi; sonra kargo ücreti de sınıra dahil edildi (fiilen ≈27 €). 6 Ocak 2026 tarihli, 10813 sayılı Cumhurbaşkanı Kararı (Resmî Gazete 7 Ocak 2026) 4458 sayılı Gümrük Kanunu'nun 126. maddesinden "30 Avro'yu aşan ancak" ifadesini çıkardı, yani muafiyet kalktı. Karar yayımdan 30 gün sonra yürürlüğe giriyor. Haberde gıda/maya kısıtı ya da yeni vergi oranları yok — [Webrazzi, 07.01.2026](https://webrazzi.com/2026/01/07/yurt-disi-alisverislerde-gumruk-muafiyeti-kaldirildi-30-euro-limiti-tarihe-karisti/); Ticaret Bakanlığı basın açıklaması — [ticaret.gov.tr](https://ticaret.gov.tr/haberler/e-ithalatta-basitlestirilmis-gumruk-beyannamesi-kapsaminin-degistirilmesine-iliskin-yeni-duzenleme-hakkinda-basin-aciklamasi)
- KVKK 28. madde tam istisnası: kişisel verilerin "üçüncü kişilere verilmemek ve veri güvenliğine ilişkin yükümlülüklere uyulmak kaydıyla gerçek kişiler tarafından tamamen kendisiyle veya aynı konutta yaşayan aile fertleriyle ilgili faaliyetler kapsamında işlenmesi" halinde Kanun uygulanmaz — [KVKK SSS, Kişisel Verileri Koruma Kurumu, Mart 2018 (ODTÜ kopyası)](https://kvkk.metu.edu.tr/tr/system/files/kisisel_verilerin_korunmasi_kanunu_hakkinda_sikca_sorulan_sorular.pdf)
- 7499 sayılı Kanun ile KVKK 9. madde (yurt dışına aktarım) değişti, yürürlük 1 Haziran 2024. Yeni yollar: yeterlilik kararı; uygun güvenceler (Kurul'un ilan ettiği standart sözleşme, bağlayıcı şirket kuralları, yazılı taahhüt + izin); arızi aktarım (açık rıza vb.; sürekli olmayan). Standart sözleşme imzalandıktan sonra 5 iş günü içinde Kurul'a bildirilmeli; bildirilmezse hem veri sorumlusu hem veri işleyen idari para cezası alır — [Mondaq / BO Bener Hukuk, 27.03.2024](https://www.mondaq.com/turkey/data-protection/1443842/newsletter-on-important-changes-in-the-transfer-of-personal-data-abroad-and-processing-of-sensitive-personal-data); KVKK "Standart Sözleşme Bildirim Modülü" duyurusu (sayfa açılamadı) — [kvkk.gov.tr 8043](https://www.kvkk.gov.tr/Icerik/8043/Standart-Sozlesme-Bildirim-Modulu-Hakkinda-Kamuoyu-Duyurusu), [alomaliye 30.10.2024](https://www.alomaliye.com/2024/10/30/kvkk-standart-sozlesme-bildirim-modulu/)

### Inferences
- 10–12 L'lik partilerle yılda 350 L sınırına ulaşmak için ≈30 parti gerekir. Bu bilgi Brewmaster'a "yıllık toplam litre" göstergesi olarak eklenebilir; litre üzerinden hesaplanan basit bir sayaçtır. Hukuki tavsiye değil, bilgi notu. [DENE, S]
- Firebase senkronu yalnız Kaan ve aynı evdeki eşi tarafından kullanıldığı sürece KVKK 28/1-a istisnası makul görünüyor. Uygulama başka kullanıcılara açılırsa (BASH videoları, PWA yayını vb.) aydınlatma metni ve yurt dışı aktarım (standart sözleşme) yükümlülükleri doğar. Bu, hukukçu değerlendirmesi gerektirir. [İZLE]
- Malt, şerbetçiotu ve maya alkol değil. Ama 2026'dan itibaren yurt dışı siparişlerde her paket vergiye giriyor; bu Türk dükkânlarını (BiraBurada vb.) fiyatta daha rekabetçi yapabilir. Bu bir çıkarım; vergi oranları doğrulanmadı.
- [ALMA] isitlegaldb.pages.dev ("2026 Policy Reforms") gibi kaynağı belirsiz siteler.

### Gaps
- Bulamadım (birincil metin): "350 litre / ticari amaç olmaksızın" kuralının bugünkü kanun ya da yönetmelik maddesi ve en son hâli. mevzuat.gov.tr robots ile kapalı; ikincil kaynaklar madde numarası vermiyor.
- 2026'daki e-ticaret ithalat vergi oranları (AB ve diğer ülkeler) ve maya/bitki ürünleri (şerbetçiotu) için fitosaniter kısıtlar doğrulanmadı.
- KVKK'nın Google/Firebase ile ilgili özel bir kararı ya da rehberi aranmadı.

## 6. Yerel malzeme (Türk buğdayı, arpa çeşitleri, bal türleri, meyveler)

### Takeaway
Türkiye'de tescilli maltlık arpa çeşitleri var (ör. Sabribey 2019, Tarm-92, Larende), ama hakemli çalışmalar yerli materyalin protein değerinin sanayi ölçütünün (%9–11,5) üstünde kaldığını ve malt şirketlerinin zaman zaman kaliteli arpa ithal ettiğini söylüyor. Bal ve meyve için bu taramada kaynak toplanamadı.

### Cited Findings
- Maltlık arpa ıslahı: Sabribey 2019'da tescil edildi (Geçit Kuşağı Tarımsal Araştırma Enstitüsü, Eskişehir). Kontrol çeşitleri İnce-04, Larende, Tarm-92, Ünver, Özdemir-05, Erginel-90, Keser. Ölçülen değerler: tane proteini %12,42–13,63; hektolitre ağırlığı 62,1–64,1 kg/hL; nişasta %53,7–55,3; dolgun tane %75,5–83,6. Sanayi ölçütü: >65 kg/hL, protein %9–11,5, nişasta %55–65, dolgun tane >%75. Yerli malt şirketleri zaman zaman kaliteli maltlık arpa ithal etmek zorunda kalıyor — [Sönmez ve ark., Black Sea J Agric 3(2):155–161, 2020](https://dergipark.org.tr/en/download/article-file/995531)
- Tarım ve Orman Bakanlığı Tarla Bitkileri Merkez Araştırma Enstitüsü'nün çeşit sayfası (içerik okunmadı) — [arastirma.tarimorman.gov.tr](https://arastirma.tarimorman.gov.tr/tarlabitkileri/Sayfalar/Detay.aspx?SayfaId=3)

### Inferences
- [İZLE] Türk arpa ve buğday çeşitleri, ev biracısı için doğrudan bir girdi değil (malt olarak satılmıyorlar). Brewmaster için değeri, "Hitit/yerli malt" bilgisinin bağlamı. Çeşit verisi uygulamaya alınmamalı.
- [DENE, M] Türk meyveleri ve balları (vişne, nar, kayısı, incir, kestane/çam balı) için "katkı" kataloğu kurulacaksa, her şeker/asit değeri için TÜRKOMP (ulusal gıda kompozisyon veritabanı) gibi birincil kaynak gerekir. Bu taramada TÜRKOMP doğrulanmadı.

### Gaps
- Bulamadım (aranmadı): Türk bal türlerinin şeker profili, Türk meyvelerinin şeker/asit değerleri, Türk buğday maltı üretimi.
- Türk malt üreticileri (Anadolu Efes malt tesisleri, Türk Tuborg) ve bunların homebrew için malt satıp satmadığı doğrulanmadı.

## 7. "Sade Türkçe" denetimi için Türkçe araçlar (okunabilirlik formülleri, TDK, Zemberek, terim sözlükleri, jargon işaretleme)

### Takeaway
Türkçe için doğrulanmış üç okunabilirlik formülü var: Ateşman 1997, Çetinkaya 2010 ve Bezirci–Yılmaz 2010. Üçü de yalnız hece/kelime/cümle sayımına dayandığı için saf JavaScript ile, harici bağımlılık olmadan uygulanabilir. 2026 tarihli TOMA çalışması, Çetinkaya formülünün Ateşman'dan daha geçerli olduğunu aktarıyor. Jargonu yakalamak için okunabilirlik formülü yetmez; Brewmaster'ın kendi "yasak terim → sade karşılık" listesi gerekir. Zemberek (Java, Apache 2.0) ve TDK uç noktaları (resmî olmayan) PWA'ya uygun değil.

### Cited Findings
- Ateşman (1997): Okunabilirlik = 198,825 − 40,175 × (hece/kelime) − 2,610 × (kelime/cümle). Bantlar: 90–100 çok kolay, 70–89 kolay, 50–69 orta güçlükte, 30–49 zor, 1–29 çok zor. Bezirci–Yılmaz (2010) "YOD" formülü H3×0,84 + H4×1,5 + H5×3,5 + H6×26,25 katsayılarını (3, 4, 5 ve 6+ heceli kelimelerin cümle başına ortalaması) ve OKS'yi (cümle başına ortalama kelime) kullanıyor, sonucu sınıf düzeyi olarak veriyor (ör. 7,34 → 7–8. sınıf). Makaleye göre Türkçe için Ateşman dışında formül yoktu (2010) — [Bezirci & Yılmaz, DEÜ Müh. Fak. Fen Bil. Derg. 12(3):49–62, 2010](https://dergipark.org.tr/en/download/article-file/589339)
- TOMA (2026), Türkçe okunabilirlik yazılımı:
  - Ateşman = 198,825 − 40,175(OSU) − 2,610(OCU); Flesch formülünün Türkçe uyarlaması.
  - Çetinkaya (2010) = 118,823 − 25,987 × OSU − 0,971 × OCU; Kalyoncu & Memiş (2024)'e göre Ateşman'dan daha geçerli.
  - Bezirci–Yılmaz = √OCU × [(H3×0,84) + (H4×1,5) + (H5×3,5) + (H6×26,35)]. NOT: H6 katsayısı TOMA'da 26,35, 2010 makalesinde 26,25 → ÇELİŞKİ, asıl PDF'ten doğrulanmalı.
  - Formüller birbiriyle her zaman uyuşmuyor; Türkçe eklemeli bir dil olduğu için hece uzunluğu zayıf bir değişken.
  - Önceki web aracı okunabilirlikindeksi.com yanlış sonuç veriyordu.
  - TOMA Python 3.11 ile yazılmış (Zeyrek, Stanza, Zemberek, BERTurk). Kod ve veri GitHub'da: mrkalyoncu/TOMA-Turkce-Okunabilirlik-ve-Metin-Analizi-Programi; güncellemeler okunabilirlik.com.tr'de.
  - Sınırlılık: aynı 57 metinlik derlem hem geliştirme hem değerlendirmede kullanıldı.
  — [Kalyoncu, Memiş, Kurudayıoğlu, Doğan, IJLET 14:294–309, 2026, DOI 10.71084/ijlet.1991409](https://dergipark.org.tr/tr/download/article-file/6207577)
- Zemberek-NLP: Apache 2.0, Java; son sürüm 0.17.1 (23.07.2019); "slow maintenance mode". Morfoloji, normalizasyon/yazım denetimi, tokenizasyon/cümle sınırı ve dil tanıma modülleri var; diğer diller için gRPC sunucusu sunuyor; resmî JS portu yok — [github.com/ahmetaa/zemberek-nlp](https://www.github.com/ahmetaa/zemberek-nlp). Python karşılıkları: zemberek-python ve Zeyrek — [PyPI zemberek-python](https://pypi.org/project/zemberek-python/), [Zeyrek](https://zeyrek.readthedocs.io/)
- tdk-py 2.0.1: TDK sözlüklerine (Güncel Türkçe Sözlük, öneriler, indeks) erişen bir Python paketi; "TDK's APIs" diyor ama resmî olduğunu iddia etmiyor; kullanım şartlarından bahsetmiyor; hece sayımı yok — [tdk-py.readthedocs.io](https://tdk-py.readthedocs.io/en/stable/). GitHub'da başka TDK GTS istemcileri de var — [TDK-GTS-CLI](https://www.github.com/sanalzio/TDK-GTS-CLI), [github topics/tdk](https://www.github.com/topics/tdk)

### Inferences
- [AL, S] Brewmaster AI cevaplarına saf JS ile "okunabilirlik puanı" ekle: Çetinkaya (birincil) + Ateşman (yedek). Türkçede hece = ünlü harf sayısı, bu kural basit ve güvenilir (genel dil bilgisi). Çıktı yalnız ölçüm olarak kaydedilsin. Mevcut "mekanik tat / jargon ölçümü" çerçevesine (CEV9) uyar; puanlama kapısına eklenirse eşik koşudan ÖNCE yazılmalı.
- [AL, S] Asıl iş jargon listesi: "yasak/teknik terim → sade karşılık" sözlüğü (ör. attenuation → incelme / şekerin ne kadarının yendiği; flokülasyon → çökelme; IBU → acılık birimi). Okunabilirlik formülleri jargonu yakalamaz; çünkü "IBU" ya da "mash" kısa kelimelerdir ve puanı düşürmez. Bu bir çıkarım; TOMA'nın "hece uzunluğu zayıf değişken" bulgusuyla tutarlı.
- [ALMA] Zemberek'i PWA'ya gömmek: Java/gRPC, 2019'dan beri yavaş bakım, büyük dosya.
- [ALMA] TDK uç noktalarını canlı çağırmak: resmî API değil, CORS ve kullanım şartları belirsiz; ayrıca çevrimdışı PWA ile uyumsuz.
- [İZLE] TOMA (2026, GitHub): masaüstü/Python aracı. Formül uygulamasını doğrulamak için referans olarak kullanılabilir; Brewmaster'a gömülmez. Lisansı kontrol edilmedi.

### Gaps
- Bezirci–Yılmaz formülünün kesin yapısı ve H6 katsayısı (26,25 mi 26,35 mi) asıl PDF'ten doğrulanmadı.
- Okunabilirlik formüllerinin teknik/bilimsel kısa metinlerde (AI cevapları gibi) geçerliliği hakkında kaynak bulunamadı; çalışmalar ders kitabı ve edebî metin üzerine.
- TDK Terim Sözlükleri'nde bira terimleri ve TDK'nın resmî bir API'si olup olmadığı doğrulanmadı.
- TOMA'nın lisansı ve JS'e taşınabilirliği kontrol edilmedi.
