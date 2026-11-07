# Brewmaster için açık/ücretsiz bira veri kaynakları ve bilimsel literatür API'leri (durum: 2026-11-07)

Yöntem notu: Ölçümler bu oturumdaki curl/WebFetch çağrılarından (2026-11-07, 16:51–19:35 UTC) ve önceki araştırmacının kayıtlı çağrılarından ("ÖNCEKİ" işaretli) alındı. Kod çalıştırılmadı, hesap açılmadı, anahtar kullanılmadı. Bazı sayfalar okunamadı (izin zaman aşımı, bot koruması, proxy reddi); bunlar "Gaps" altında. Zaten değerlendirilmiş kaynaklar (DIY Dog, HopDatabase, bjcp-json, brewers-almanack, Open Brewery DB, Untappd, PunkAPI, rustybeer, Scrapling, public-apis, free-for-dev) yeniden araştırılmadı. Karar etiketleri: AL / DENE / İZLE / ALMA; çaba S/M/L.

## Soru 1 — Kullanılanların ötesinde büyük açık reçete veri setleri (lisans, süreç alanları)

### Takeaway
Yeni ve lisansı temiz iki reçete seti bulundu: Kaggle "Brewer's Friend Beer Recipes" (75 000 reçete, CC0, süreç alanları VAR ama malzeme YOK) ve Zenodo'daki Bonatto 2025 seti (62 121 Brewer's Friend reçetesi, CC BY 4.0, malzeme MİKTARLARI var). En büyük toplayıcı Beer Analytics (~1,16 milyon reçete) ham veriyi "hukuki nedenlerle" vermiyor; Hugging Face, GitHub BeerXML koleksiyonları ve Brewfather API'si yeni reçete kaynağı sağlamıyor.

### Cited Findings
- Kaggle "Brewer's Friend Beer Recipes" (jtrofe/beer-recipes): lisans "CC0: Public Domain"; yayın 2018-03-07, son değişiklik 2018-04-12; arşiv 3,784 MB; recipeData.csv sütunları: BeerID, Name, URL, Style, StyleID, Size(L), OG, FG, ABV, IBU, Color, BoilSize, BoilTime, BoilGravity, Efficiency, MashThickness, SugarScale, BrewMethod, PitchRate, PrimaryTemp, PrimingMethod, PrimingAmount, UserId — yani malzeme listesi (malt/hop/maya) YOK, ama birincil fermantasyon sıcaklığı, mash kalınlığı, aşılama oranı, verim VAR — [Kaggle Croissant metadata](https://www.kaggle.com/datasets/jtrofe/beer-recipes/croissant/download), [Kaggle sayfası](https://www.kaggle.com/datasets/jtrofe/beer-recipes)
- Aynı setin açıklaması: "75,000 homebrewed beers with over 176 different styles… user-reported… scraped from Brewer's Friend"; her kayıtta en az OG, FG, ABV, IBU, Color dolu; "Priming Method/Amount" serbest metin — [Kaggle Croissant metadata](https://www.kaggle.com/datasets/jtrofe/beer-recipes/croissant/download)
- Zenodo 15498451 (Diego Bonatto, 2025-05-23, CC BY 4.0): "raw beer recipe data obtained from Brewer's Friend" — malt, hop, katkı türleri ve MİKTARLARI, ABV, SRM, OG, FG, IBU, hop kullanımı + stil kategorisi, menşe ülke/bölge, süper-küme/küme etiketi; tek dosya Table_S1.txt, 371 073 426 bayt — [Zenodo 15498451](https://zenodo.org/records/15498451)
- Bağlı makale: Bonatto, "A new classification system of beer categories and styles based on large-scale data mining and self-organizing maps of beer recipes", arXiv 2505.17039, 2025-05-13; 62 121 reçete; "ingredient profiles, fermentation parameters, and recipe vital statistics"; 4 süper-küme (soğuk fermente stiller tahıl/hop bileşiminde muhafazakâr, sıcak fermente olanlar heterojen) — [arXiv 2505.17039](https://arxiv.org/abs/2505.17039v1)
- Beer Analytics: ~1 157 969 reçete; hop/maya/fermentable/stil başına istatistik (hop sayfasında reçete sayısı, amaç, alfa, menşe, eşleşen hoplar, doz, stiller); içerik "Creative Commons Attribution-ShareAlike 4.0" (aksi belirtilmedikçe); indirme/API sözü yok; kaynaklar adlandırılmamış ("homebrewing community") — [Beer Analytics](https://www.beer-analytics.com/)
- scheb/beer-analytics (kodu): GPL-3.0; "For legal reasons the project does not come with any recipe data included"; içe aktarma biçimleri BeerXML, MMUM (maischemalzundmehr.de), BeerSmith (beersmithrecipes.com); hop verisi için kasperg3 (HopDatabase) teşekkürü; map_styles / map_hops / map_fermentables / map_yeasts eşleme komutları; 972 commit — [GitHub scheb/beer-analytics](https://github.com/scheb/beer-analytics)
- Hugging Face "beer" araması: reçete seti yok; yorum setleri (SWilliams20/Kaggle_Beer_Reviews 393 indirme), görüntü ve eşleştirme setleri; "brew" araması da kahve/çay/LLM setleri döndü — [HF datasets API beer](https://huggingface.co/api/datasets?search=beer&limit=40), [HF datasets API brew](https://huggingface.co/api/datasets?search=brew&limit=20)
- GitHub "beerxml recipes" 28 repo, çoğu araç: stone/beerxml (MIT, Go okuyucu), stuartraetaylor/diydog-beerxml (DIY Dog BeerXML, son push 2023-09-06), jonpacker/beerxml-to-json; "homebrew recipes dataset" yalnız 1 küçük analiz reposu — [GitHub search API](https://api.github.com/search/repositories?q=beerxml+recipes&sort=stars)
- BeerJSON standardı (beerjson/beerjson): MIT, 165 yıldız, son push 2026-11-06 → aktif; GregRR/fermentation-json yeni "FermentationJSON" şeması (2026-09-17, 1 yıldız) — [GitHub search API beerjson](https://api.github.com/search/repositories?q=beerjson&sort=stars)
- Brewfather API: yalnız kullanıcının KENDİ partileri/reçeteleri/envanteri; herkese açık reçete kütüphanesi uç noktası yok; anahtar kullanıcı hesabından (userid:apikey Basic auth); 500 çağrı/saat/anahtar — [Brewfather API docs](https://docs.brewfather.app/api)
- beerproto/dataset: MIT; klasörler color, culture, equipment, fermentables, fermentation, hops, intensity, json, mash, miscellaneous, packaging, styles, water; README kaynak göstermiyor; 111 commit; son push 2022-08-23 — [GitHub beerproto/dataset](https://github.com/beerproto/dataset), [GitHub search API](https://api.github.com/search/repositories?q=brewing+dataset&sort=stars)
- Zenodo "beer recipes" araması 6 740 kayıt, ilk 10'un çoğu ilgisiz (çevre etkisi, pazar); ilgili olanlar Bonatto seti ve BA taksonomisi — [Zenodo API](https://zenodo.org/api/records?q=beer%20recipes&size=10)
- Polonya PSPD sitesinde stil sayfaları (ör. Polish Wheat) ve yarışma belgeleri var; açık reçete veritabanı bulunamadı — [PSPD Polish Wheat](https://pspd.org.pl/style-piwa/polish-wheat)

### Inferences
- Kaggle Brewer's Friend (CC0) — DENE, S. Brewmaster'ın açık işi "ML kusur 4 (süreç alanları)" için doğrudan değerli: stil başına gerçek PrimaryTemp / MashThickness / PitchRate / Efficiency dağılımı. Malzeme yok, bu yüzden stil tahmin modeline özellik olarak tek başına yetmez; "stilin tipik fermantasyon sıcaklığı" gibi uyarı/öneri bantları ve kişisel verim karşılaştırması için uygun. Risk: kullanıcı beyanı (gürültü), 2018'de donmuş, rmwoods setiyle (o da Brewer's Friend içeriyor olabilir) çakışma olasılığı → URL/BeerID ile tekilleştirme şart.
- Bonatto/Zenodo (CC BY 4.0) — DENE, M. Malzeme miktarlı 62 121 reçete; CC BY atıfla public repoya girebilir. Önce 371 MB dosyada maya ve mash/fermantasyon sütunu gerçekten var mı, kaç tanesi rmwoods/Brewer's Friend ile aynı, kontrol edilmeli. Küme etiketleri (4 süper-küme) "stil ailesi" doğrulaması için ikinci görüş olabilir; ama stil etiketleri yine kullanıcı seçimi (döngüsellik riski yok, gürültü riski var).
- Beer Analytics — İZLE (veri olarak), DENE (S) yalnız elle kontrol kaynağı olarak: stil başına "en çok kullanılan hop / doz" sayfaları, Brewmaster'ın "Senin reçetende" satırı için kıyas olabilir. Toplu kazıma önerilmez: API yok, Yasal Bildirim okunmadı, CC BY-SA "share-alike" türetilmiş içeriği aynı lisansa bağlar.
- BeerJSON — İZLE/DENE (M): veri değil biçim; Brewfather/Brewtarget kullanıcılarının reçetelerini içe aktarma için en aktif açık standart. Brewfather API ise yalnız kullanıcının kendi anahtarıyla, "kendi reçeteni içe aktar" özelliği olarak anlamlı (veri seti değil) — İZLE.
- Hugging Face, GitHub BeerXML koleksiyonları, diydog-beerxml (DIY Dog zaten alındı) — ALMA: yeni reçete yok.
- beerproto/dataset — ALMA (kaynaksız, 2022'den beri durgun); en fazla kontrol listesi.

### Gaps
- Brewer's Friend'in kendi kullanım şartları (kazıma/yeniden dağıtım) okunmadı; Kaggle setinin CC0 beyanı yükleyenin beyanıdır, Brewer's Friend'in iznini kanıtlamaz.
- rmwoods setinin Brewer's Friend kayıtlarını içerip içermediği bu oturumda doğrulanmadı (çakışma oranı bilinmiyor).
- Bonatto Table_S1.txt indirilmedi (371 MB); maya/sıcaklık sütunu varlığı doğrulanmadı.
- Grainfather topluluk reçeteleri, BeerSmith Recipe Cloud (beersmithrecipes.com) kullanım şartları ve erişim yolları araştırılamadı.
- Çekya, Brezilya (Acerva) ulusal kulüp arşivleri için kaynak bulunamadı; Almanya (MMUM) ve Hollanda (roerstok) zaten kullanılıyor.
- Ev üretimi yarışma sonuç veri seti (AHA NHC dışında, ör. BCOE&M dışa aktarımları) bulunamadı.

## Soru 2 — Makine okunur malzeme veritabanları (hop, maya, malt, su)

### Takeaway
Hop için en güvenilir kaynaklar hâlâ ıslahçı/tüccar veri sayfaları (Hopsteiner, BarthHaas, HPA, Haas) ve bunlar ARALIK veriyor (Brewmaster tek alfa değeri taşıyor); toplu açık bir "doğrulanmış" hop/maya/malt veritabanı yok. Brewtarget'ın GPL'li BeerJSON içeriği (282 hop, 296 maya) eksik suşları bulmak için iyi bir kontrol listesi, ama değerler üreticiden tek tek doğrulanmalı; BrewUnited gibi topluluk tabloları görünür hatalar içeriyor.

### Cited Findings
- Brewtarget DefaultContent003-Ingredients-Hops-Yeasts.json (develop dalı, 699 077 bayt): BeerJSON 2.01; 282 hop çeşidi (alfa/beta TEK değer — aralık içeren 0/282; yağ bileşimi: toplam yağ, hümulen, karyofilen, ko-hümulon, myrsen, farnesen; menşe: ABD 114, UK 34, Almanya 33, NZ 22, Avustralya 16, Çekya 15, Slovenya 13, G. Afrika 9); 296 maya (White Labs 97, Wyeast 80, Imperial 27, RVA 24, Fermentum Mobile 18, East Coast Yeast 13, Fermentis 9, Mangrove Jack's 9, Lallemand 7, Yeast Bay 5…); maya alanları attenuation_range, temperature_range, flocculation, alcohol_tolerance, best_for, form; dosya başlığı: "Hop and Yeast details from public sources, including https://github.com/brewerwall/yeasts… a number of manual corrections… using data from the producing lab's website"; depo lisansı GNU GPL v3 — [Brewtarget DefaultContent003](https://raw.githubusercontent.com/Brewtarget/brewtarget/develop/data/DefaultContent003-Ingredients-Hops-Yeasts.json), [Brewtarget LICENSE](https://raw.githubusercontent.com/Brewtarget/brewtarget/develop/LICENSE)
- brewerwall/yeasts ve brewerwall/styles README: "Feel free to fork and use however"; veri brewerwall.com/api/v1/yeasts üzerinden sunuluyordu; LICENSE dosyası bulunamadı; brewerwall.com bu oturumda proxy tarafından reddedildi (canlılığı doğrulanamadı) — [brewerwall/yeasts README](https://raw.githubusercontent.com/brewerwall/yeasts/master/README.md), [brewerwall/styles README](https://raw.githubusercontent.com/brewerwall/styles/master/README.md)
- BrewUnited Yeast Database: ~250 satır (sayfada 254 `<tr>`), sütunlar Name, Lab, Type, Form, Temp, Attenuation, Flocculation, Notes; görünür hatalar: "Nottingham Ale Yeast — White Labs — Liquid — 32°F - 32°F — 77.5% — Array"; sitede ayrıca Grain Database ve Hop Database var — [BrewUnited Yeast Database](http://www.brewunited.com/yeast_database.php)
- Hopsteiner çeşit veri sayfası (Chinook örneği): ARALIK değerler — alfa 12,0–14,0 %, beta 3,0–4,0 %, ko-hümulon 29–34 % rel., hard resins, ksantohumol 0,4–0,5, toplam yağ 1,5–2,5 ml/100 g, farnesen 0,00–1,00 %, linalool 0,2–0,4 %, linalool:alfa 0,01–0,02; tek değer β-karyofilen:hümulen 0,44; myrsen ve geraniol YOK; PDF indirme sözü yok — [Hopsteiner Chinook](https://hopsteiner.com/variety-data-sheets/Chinook)
- BarthHaas çeşit genel bakışı: 100 çeşit listeleniyor (+ "show all"), menşe ve ~5 aroma tanımı; alfa/beta/toplam yağ filtreleri; "Hop table as PDF" bağlantısı; her çeşide ayrı sayfa; Genel Şartlar PDF'i "Version May 2026" — [BarthHaas hop varieties overview](https://www.barthhaas.com/hops-and-products/hop-varieties-overview)
- BarthHaas ayrıca yıllık Hop Harvest Guide / ürün rehberi PDF'leri yayınlıyor (ör. 2022) — [BarthHaas Hop Harvest Guide 2022](https://barthhaas.com/fileadmin/user_upload/01-barthhaas-2022/Downloads/Reports_Broschures/Hop_Harvest_Guide/English/BarthHaas_Hop_Harvest_Guide_2022.pdf)
- HPA (Hop Products Australia) Avrupa çeşitleri dahil PDF veri sayfaları yayınlıyor (Hallertau Blanc, Huell Classic, Hersbrucker) — [HPA Hersbrucker Data Sheet](https://hops.com.au/downloads/data-sheet/europe/Hersbrucker-Data-Sheet.pdf)
- John I. Haas "Hops Companion" PDF (2021) — [Haas Hops Companion](https://www.johnihaas.com/wp-content/uploads/2021/11/HAAS_HopsCompanion-Final-ForWeb.pdf)
- USA Hops (Hop Growers of America): ana sayfada güncel Variety Manual yok, "Hop Finder / Sensory Finder" bağlantıları; bilinen PDF 2018 tarihli — [usahops.org](https://www.usahops.org/), [USAHops Variety Manual 2018](https://www.usahops.org/cabinet/data/USAHops_VarietyManual_2018_Web.pdf)
- Türk su idareleri aylık laboratuvar PDF'leri yayınlıyor (arama sonucu başlıkları: Eskişehir ESKİ "aylik_rapor/Subat2026.pdf", ASKİ "Analiz_Sonucu_3_Temmuz.pdf", TİSKİ galerisi PDF'leri); ESKİ ve iski.istanbul bu ortamdan "connection reset" verdi, içerik okunamadı — [ESKİ Şubat 2026 raporu](https://www.eskisehir-eski.gov.tr/uploads/laboratuvar/aylik_rapor/Subat2026.pdf), [ASKİ analiz sonucu](https://www.aski.gov.tr/Yukle/Resim/Haber/2020Haber/Analiz_Sonucu_3_Temmuz.pdf)
- (ÖNCEKİ, yerel değerlendirme) HopDatabase 220 kayıt ve Nectaron hatası; brewers-almanack maya değerlerinde üreticiyle çelişkiler (US-05 18–23 vs Fermentis 18–26) — [yerel dosya dis_kaynak/DEGERLENDIRME_2026-11-07.md](file:///home/claude/brewmaster/dis_kaynak/DEGERLENDIRME_2026-11-07.md)

### Inferences
- Hopsteiner + BarthHaas + HPA + Haas veri sayfaları — AL (doğrulama kaynağı olarak), M: KAT-C (34 eksik hop) eklemeleri ve mevcut 77 hopun tek alfa değerini "alfa aralığı + toplam yağ + ana yağlar" yapısına genişletmek için birincil kaynak. Toplu indirme yok → çeşit başına elle/yarı otomatik okuma; her değere kaynak linki. Ranges, Brewmaster'ın CEVAP İLKESİ'ndeki "≥2 bağımsız kaynak" kuralına doğal uyuyor (ıslahçı + tüccar).
- Brewtarget içeriği — DENE, S (yalnız kontrol listesi): Brewmaster'da olmayan suşları (ör. RVA, East Coast Yeast, Fermentum Mobile, Imperial'ın tamamı) ve hop yağ bileşimi eksiklerini listelemek için. Değerleri doğrudan kopyalamak önerilmez: GPL v3 derleme lisansı tek dosyalı HTML'e lisans yükü getirebilir, değerler "public sources" + brewerwall kökenli ve tekil (aralıksız).
- brewerwall/yeasts — ALMA (Brewtarget onu zaten içermiş; lisans dosyası yok; API ulaşılamadı).
- BrewUnited (maya/tahıl/hop tabloları) — ALMA: görünür veri hataları, kaynak yok.
- Malt: toplu açık malt veritabanı bulunamadı; Brewmaster'ın 187 maltı (tampon kapasitesi dahil) zaten bilinen açık kaynaklardan zengin (ÖNCEKİ yerel değerlendirme). Üretici spec sheet'leri (Weyermann, Briess, Castle, Crisp, Simpsons, Dingemans, BestMalz, Viking) tek tek doğrulama kaynağı olarak kalır — İZLE.
- Su: Türk belediyelerinin aylık PDF raporları — DENE, M: "Kendi şehir suyunu gir" yardımcısı veya 81 il yerine büyükşehirlerden başlayan bir "TR şebeke suyu profilleri" tablosu (Ca, Mg, Na, Cl, SO4, HCO3/alkalinite). Her değer PDF'ten elle doğrulanmalı; raporlar ilçe/kaynak bazında değişir; dönemsel.

### Gaps
- BeerMaverick (hop/maya sayfaları), Crossref belgeleri (WebFetch ile), OpenAlex docs: izin isteği zaman aşımına uğradı, okunamadı. BeerMaverick'in veri kaynağı ve kullanım şartları bilinmiyor.
- Yakima Chief, NZ Hops, Fermentis, Lallemand, White Labs, Wyeast, Imperial, Omega, Escarpment, Mangrove Jack's, Bulldog/BiraBurada sayfaları bu oturumda tek tek açılmadı (Brewmaster'ın 132 mayası zaten üretici kaynaklı); toplu/makine okunur maya verisi yayınlayan üretici bulunamadı.
- Malt üreticileri için toplu, makine okunur spec veritabanı aranıp bulunamadı (yalnız PDF'ler bilinir; bu oturumda doğrulanmadı).
- İSKİ (İstanbul) su analiz raporlarının yeri ve biçimi doğrulanamadı (site bu ortamdan erişilemedi). Kaan'ın ilçesi için veri olup olmadığı bilinmiyor.
- Brewtarget'ın fermentable (malt) içerik dosyası bulunamadı (dosya adı bilinmiyor; Debian kaynak sayfası "AI scrapers" engeli verdi).

## Soru 3 — Bilimsel literatür API'leri, açık erişimli bira dergileri ve kısa alıntı sorunu

### Takeaway
Tarayıcıdan (CORS `*`) anahtarsız çağrılabilen ve TAM özet/tam metin veren üç sağlam yol var: Europe PMC (özet + açık erişim makalelerde tam metin XML, CC BY), Crossref (DOI metadatası; MDPI'de ~%100 özet), DOAJ (açık erişim makale özetleri). OpenAlex verisi CC0 ama anahtarsız bütçe IP başına paylaşılıyor (bu ağda tükenmişti); Semantic Scholar ve CORE anahtarsız pratikte kullanılamıyor. Bunlar araştırma modunda "web aramasının ~150 karakterlik alıntısı" yerine tam özet/paragraf getirmek için kullanılabilir.

### Cited Findings
- Europe PMC REST: CORS `*`, anahtarsız; "diacetyl beer" 740 kayıt; resultType=core özet içeriyor (ÖNCEKİ) — [Europe PMC search](https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=diacetyl%20beer&format=json&pageSize=1&resultType=core)
- Europe PMC fullTextXML: PMC13564787 (Foods, "Characterization of the Major Odorants in Non-Alcoholic Beers…") tam metin 134 546 bayt, lisans etiketi creativecommons.org/licenses/by/4.0; fullTextXML uç noktası da `access-control-allow-origin: *` döndü — [EPMC fullTextXML](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC13564787/fullTextXML)
- Europe PMC kapsamı: Foods + (beer OR brewing) + IN_EPMC tam metin 2 063; JASBC (0361-0470) 766 kayıt, örneklerde özet 1 376–1 537 karakter, kaynak AGR (AGRICOLA), açık erişim değil; JIB 1 288 kayıt, yalnız 1'i tam metin; MDPI Fermentation (2311-5637) 0 kayıt, Beverages (2306-5710) 1 kayıt — [EPMC JASBC](https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=ISSN:%220361-0470%22&format=json&pageSize=3&resultType=core), [EPMC Fermentation](https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=ISSN:%222311-5637%22&format=json&pageSize=1)
- Crossref REST: CORS `*`, kayıt gerekmez; "almost none of the metadata is subject to copyright, and you may use it for any purpose. Some abstracts contained in the metadata may be subject to copyright by publishers or authors."; polite pool için `mailto` parametresi — [Crossref REST API docs](https://www.crossref.org/documentation/retrieve-metadata/rest-api/), [Crossref works](https://api.crossref.org/works?query=diacetyl+beer&rows=1)
- Crossref dergi kapsamı (ÖNCEKİ ölçüm): JIB yeni platform (2050-0416, CIBD) 211 kayıt / 78 özetli / CC BY-NC-ND 4.0 / son 2026-10-11; JIB eski Wiley (0046-9750) 8 409 / 0 özet / son 2022; JASBC (T&F) 2 385 + 3 330 / 0 özet / son 2026-10-22; MDPI Beverages 1 074 / 1 073 özetli / CC BY 4.0; MDPI Fermentation 4 419 / 4 418 özetli / CC BY 4.0; MDPI Foods 27 494 / 27 493 özetli; Kvasny Prumysl 2 455 / 0 özet / Crossref'te son 2018; BrewingScience (1613-2041), MBAA TQ (1946-2468) Crossref'te yok — [Crossref 2050-0416](https://api.crossref.org/journals/2050-0416/works?rows=0), [Crossref 2311-5637](https://api.crossref.org/journals/2311-5637/works?rows=0), [Crossref 1943-7854](https://api.crossref.org/journals/1943-7854/works?rows=0)
- JIB yeni platform (jib.cibd.org.uk, OJS): Crossref kaydında PDF indirme bağlantıları var (ör. 10.58430/jib.v130i4.62 "Comparative analysis of four hop cultivars grown in Brazil and the USA by GC-MS-based metabolomics", CC BY-NC-ND 4.0); PDF bağlantısı HTTP 200 application/pdf döndü, CORS başlığı görünmedi; OAI-PMH uç noktası canlı (2026-11-07 yanıtı) — [Crossref JIB örnek](https://api.crossref.org/journals/2050-0416/works?rows=1&filter=has-abstract:true), [JIB PDF](https://jib.cibd.org.uk/index.php/jib/article/download/62/96), [JIB OAI Identify](https://jib.cibd.org.uk/index.php/jib/oai?verb=Identify)
- OpenAlex: "Every record is released under a CC0 public-domain license… through the API ($1 of usage a day, free), or download the whole database in the snapshot, refreshed every quarter." — [OpenAlex Pricing](https://help.openalex.org/hc/en-us/articles/24397762024087-Pricing)
- OpenAlex kimlik doğrulama (son güncelleme 15 Ekim 2026): anahtarsız 10 istek/s, ücretsiz anahtarla 30; ücretsiz anahtar günlük bütçeyi 10× artırır; anahtarsız yalnız ilk sayfa, sayfalama 10 000 sonuçla sınırlı; anlamsal arama 1 istek/s (ÖNCEKİ) — [OpenAlex Authentication](https://help.openalex.org/api/authentication/)
- OpenAlex anahtarsız istek bu ağda: CORS `*`, "Insufficient budget… counts against the free daily budget shared by everyone on your network's IP address… resets at midnight UTC", istek başı 0,001 USD / 10 kredi (ÖNCEKİ) — [OpenAlex works](https://api.openalex.org/works?search=diacetyl)
- OpenAlex "about the data": başlıkları "and abstracts and full text in many cases" tutuyor (her eserde değil) — [OpenAlex About the data](https://help.openalex.org/hc/en-us/articles/24397285563671-About-the-data)
- Semantic Scholar: anahtarsız kullanıcılar tek havuzu paylaşıyor ("1000 requests per second shared among all unauthenticated users"); kişisel anahtar 1 istek/s; S2AG ve S2ORC veri setleri "free and open resources"; paper/search, snippet/search ve swagger.json bu ağdan tekrar tekrar 429 — [S2 product/api](https://www.semanticscholar.org/product/api), [S2 tutorial](https://www.semanticscholar.org/product/api/tutorial), [S2 snippet search](https://api.semanticscholar.org/graph/v1/snippet/search?query=diacetyl+rest&limit=1)
- PubMed E-utilities: CORS `*`, anahtarsız 3 istek/s; "diacetyl beer" 82 kayıt (ÖNCEKİ) — [NCBI esearch](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=diacetyl+beer&retmode=json&retmax=1)
- PMC web sitesi (pmc.ncbi.nlm.nih.gov) WebFetch'e reCAPTCHA ("Checking your browser") ara sayfası döndü → programla PMC yerine Europe PMC API kullanılmalı — [PMC tablo](https://pmc.ncbi.nlm.nih.gov/articles/PMC3836583/table/t1)
- DOAJ: CORS `*`, anahtarsız; "diacetyl beer" 43 makale (ÖNCEKİ); "Fermentation AND beer" 130 makale, örnek kayıtta 1 181 karakterlik tam özet + MDPI bağlantısı — [DOAJ API](https://doaj.org/api/search/articles/bibjson.journal.title:Fermentation%20AND%20beer?pageSize=1)
- MDPI: makale sayfası curl'e HTTP 403 (Akamai); ama MDPI OAI-PMH uç noktası canlı — [MDPI makale](https://www.mdpi.com/2311-5637/8/4/144/htm), [MDPI OAI Identify](https://oai.mdpi.com/oai/oai2.php?verb=Identify)
- Unpaywall: CORS `*`; sahte e-posta reddedildi (422 "Please use your own email address") (ÖNCEKİ) — [Unpaywall API](https://api.unpaywall.org/v2/10.3390/fermentation8040144?email=test@example.com)
- CORE v3: x-ratelimit-limit 10, anahtarsız hemen 0 kaldı (ÖNCEKİ) — [CORE API](https://api.core.ac.uk/v3/search/works?q=diacetyl%20beer&limit=1)
- arXiv API çalışıyor; bira içeriği az (ÖNCEKİ) — [arXiv API](https://export.arxiv.org/api/query?search_query=all:beer%20brewing&max_results=1)
- BrewingScience: "peer-reviewed open access journal"; son sayı Vol. 79 No. 9/10 (2026-10-30); DOI'ler 10.23763 önekli ve kayıt ajansı mEDRA (Crossref değil) → Crossref'te görünmemesinin nedeni bu; CC lisansı sayfada görünmedi — [BrewingScience](https://www.brewingscience.de/), [doi.org RA 10.23763](https://doi.org/ra/10.23763)
- MBAA TQ: mbaa.com geçmiş sayı özet sayfaları serbestçe okunuyor (ör. Meilgaard, "Flavor chemistry of beer: part II: flavour and threshold of 239 aroma volatiles", TQ 1975); tam metin erişimi sayfada belirtilmemiş — [MBAA TQ 1975 özet](https://mbaa.com/publications/tq/tqPastIssues/1975/Abstracts/tq75ab19.htm)
- ASBC Journal eski özet sayfaları asbcnet.org'da (ör. DOI 10.1094/ASBCJ-36-0073) — [ASBC özet 36-17](https://www.asbcnet.org/publications/journal/vol/Abstracts/36-17.htm)

### Inferences
- Europe PMC — AL, M: kısa alıntı sorununun en doğrudan çözümü. Akış: Claude web aramasıyla DOI/PMCID bulur → uygulama (veya Claude'un çağırdığı istemci tarafı araç) EPMC'den TAM özeti, açık erişimli ise fullTextXML'den ilgili paragrafı getirir → Claude alıntıyı tam metinden yapar. Foods (2 063 bira/demleme tam metni) ve AGRICOLA özetleri (JASBC 766) kapsamı iyi; MDPI Fermentation/Beverages EPMC'de YOK.
- Crossref — AL, S: DOI doğrulama (atıf gerçek mi, yıl/dergi doğru mu) + MDPI ve yeni JIB özetleri. Anahtarsız, CORS açık; `mailto` ile polite pool. Özetlerin bir kısmı yayıncı telifli → kısa alıntı + atıf.
- DOAJ — DENE, S: yalnız açık erişimli makaleler, tam özet; MDPI Fermentation/Beverages için EPMC açığını kapatır.
- OpenAlex — DENE, M: CC0, tek arayüzde keşif + özet; ama anahtarsız bütçe IP paylaşımlı (bu sunucuda tükendi). Kaan'ın telefonundan/IP'sinden tek kullanıcı için yeterli olabilir; ücretsiz anahtar e-posta gerektirir → karar Kaan'da. Anahtar uygulamaya gömülmez (repo PUBLIC kuralı).
- JIB yeni platform — AL, S: araştırma modu allowlist'ine jib.cibd.org.uk eklenmeli (eski jib.ibd.org.uk 302 ile yönleniyor); PDF'ler açık, CC BY-NC-ND (ticari olmayan proje için uygun, değiştirmeden atıfla).
- BrewingScience — DENE, S: açık erişim, güncel (2026-10); Crossref'te olmadığı için Crossref tabanlı keşif onu kaçırır → allowlist'e doğrudan eklenmeli.
- MBAA TQ ve ASBC özet sayfaları — DENE, S: ücretsiz özetler allowlist'e; tam metin üyelik gerektiriyor olabilir.
- Unpaywall — DENE, S: DOI → yasal açık PDF konumu; Kaan'ın gerçek e-postası parametre olarak gerekir (anahtar değil).
- Semantic Scholar — İZLE: snippet/search uç noktası var (404 değil 429 döndü), metin parçası döndüren bir arama tam da kısa alıntı sorununa uygun görünüyor; ancak anahtarsız havuz sürekli dolu, anahtar 1 istek/s ve başvuru gerektiriyor; belgeleri okunamadı.
- CORE — İZLE (anahtar gerekli pratikte); PubMed — ALMA (EPMC zaten kapsıyor); arXiv — ALMA (bira içeriği yok denecek kadar az).
- JASBC (T&F) — DENE yalnız EPMC/AGRICOLA özetleri üzerinden; Crossref'te özet yok, tam metin abonelikli.

### Gaps
- Semantic Scholar snippet/search'ün döndürdüğü metin uzunluğu, kapsamı (tam metin mi özet mi) ve lisansı birincil kaynaktan doğrulanamadı (dokümantasyon 429/erişim hatası).
- OpenAlex'in abstract_inverted_index alanı bu oturumda yanıt içinde görülmedi (bütçe tükenmişti); BrewingScience'ın OpenAlex'te indekslenip indekslenmediği doğrulanmadı.
- Europe PMC'nin resmi hız sınırı ve kullanım şartları okunmadı.
- BrewingScience'ın açık erişim beyanının lisans türü (CC BY? BY-NC?) okunmadı; MBAA TQ tam metin erişim koşulları okunmadı.
- Claude API tarafında getirilen tam metnin "belge" olarak verilip alıntının oradan yapılması mekanizması bu oturumda doğrulanmadı (Anthropic ürün belgesinden ayrıca kontrol edilmeli).
- MDPI OAI-PMH'nin özet/tam metin biçimi (oai_dc mi JATS mi) ve küme adları doğrulanmadı.

## Soru 4 — Lezzet/duyusal referans verisi, BJCP dışı stil verisi, ticari bira veritabanları

### Takeaway
Off-flavor bilgi tabanı için en işe yarar açık kaynak PubChem'in bileşik başına koku/tat/eşik notları (CORS açık, anahtarsız) ve Meilgaard'ın 239 uçucu bileşik eşik çalışması (özeti açık); FooDB yeniden dağıtımı izne bağlı. BA 2026 kılavuzu yalnız PDF. BeerAdvocate yorum seti kaldırılmış; RateBeer seti (RelBench) CC BY-NC-SA ve reçete/süreç değil yorum verisi.

### Cited Findings
- PubChem PUG-View (diacetyl, CID 650): Odor 3 kayıt ("Very strong buttery odor in dilute solution"), Taste 3 kayıt ("Taste characteristics at 50 ppm: sweet, buttery, creamy and milky"; sudaki tat eşiği 5,40×10⁻³ ppm), Odor Threshold "8.6 ppb"; kaynak Hazardous Substances Data Bank (HSDB); CORS `*` — [PubChem PUG-View Odor](https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/650/JSON?heading=Odor), [PubChem PUG-View Odor Threshold](https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/650/JSON?heading=Odor%20Threshold)
- Meilgaard, "Flavor chemistry of beer: part II: flavour and threshold of 239 aroma volatiles" (MBAA TQ 1975), özet mbaa.com'da açık — [MBAA TQ 1975 özet](https://mbaa.com/publications/tq/tqPastIssues/1975/Abstracts/tq75ab19.htm)
- FooDB: halka açık; "Commercial use or redistribution, in whole or in part, requires explicit permission"; atıf zorunlu; kimyasal kayıtlarında renk, aroma, tat alanları; sürüm 1.0 — [FooDB about](https://foodb.ca/about)
- FlavorDB2 (IIIT-Delhi CoSyLab), güncellenmiş lezzet molekülü veritabanı, 2022 — [FlavorDB2](https://cosylab.iiitd.edu.in/flavordb2), [arXiv 2205.05451](https://arxiv.org/abs/2205.05451v1)
- BA 2026 Beer Style Guidelines: yalnız PDF ("Download 2026 Edition"), makine okunur sürüm yok; sayfa son değişiklik 2026-01-06; ~168 stil (Ale ~94, Lager ~36, Hybrid/Mixed 32 — araç sayımı, resmi toplam verilmiyor); OG/FG °Plato, ABW/ABV, IBU, SRM/EBC; "Rice Lager" var; World Beer Cup/GABF eşlemesi sayfada yok; çoğaltma şartı görünen kısımda yok — [BA Guidelines 2026](https://www.brewersassociation.org/edu/brewers-association-beer-style-guidelines/), [BA haber](https://www.brewersassociation.org/association-news/2026-beer-style-guidelines-now-available/)
- Zenodo "Brewers Association of American Beer Taxonomy" (Shawn L. Day, 2023-09-18, CC BY 4.0): BA ontolojisi 3 seviye, ExplorerBAA.csv 16 581 bayt — [Zenodo 8355588](https://zenodo.org/records/8355588)
- SNAP web-BeerAdvocate: "As per request from BeerAdvocate the data is no longer available." (1 586 259 yorum, 1998–2011) — [SNAP](https://snap.stanford.edu/data/web-BeerAdvocate.html)
- RelBench rel-ratebeer: 13 tablo, 13 787 005 satır, 221 sütun; 2000-04-02'den; CC BY-NC-SA 4.0; Python relbench paketiyle yükleniyor — [RelBench rel-ratebeer](https://relbench.stanford.edu/datasets/rel-ratebeer)
- Zenodo "Irish Craft Beers, 2010-2025" (Shawn L. Day): İrlanda zanaat biralarının özellikleri; lisans alanı boş — [Zenodo 17663420](https://zenodo.org/records/17663420)

### Inferences
- PubChem — DENE, S: off-flavor ailelerinin (diasetil, DMS, asetaldehit, izovalerik asit vb.) bileşik kartları için koku tanımı + eşik. Dikkat: eşikler su/sütte ölçülmüş olabilir (diacetyl örneği), bira eşiği değildir; kaynak (HSDB) her satırda gösterilmeli. KAT-E (eksik 5 off-flavor ailesi) için bileşik adlarını doğrulamada yararlı.
- Meilgaard 1975 — DENE, M: bira matrisinde eşik tablosunun klasik kaynağı; tam metin erişimi bulunursa off-flavor KB'deki eşikler buna bağlanmalı (ikinci bağımsız kaynakla).
- FooDB — ALMA (gömme için): yeniden dağıtım izne bağlı; yalnız elle başvuru.
- FlavorDB2 — İZLE: lisans doğrulanmadı.
- BA 2026 — DENE, M: BJCP dışında ikinci stil otoritesi (ör. Rice Lager, BA'ya özgü kategoriler). PDF'ten elle aktarılmalı; °Plato → SG dönüşümü; telif/çoğaltma koşulu okunmadan tam metin kopyalanmamalı (yalnız sayısal aralıklar + atıf). Zenodo BA taksonomi CSV'si (CC BY) hiyerarşi için küçük bir başlangıç ama 2023 tarihli.
- RelBench rel-ratebeer, SNAP BeerAdvocate, HF yorum setleri — ALMA: Brewmaster reçete/süreç uygulaması; yorum verisi stil tahmini veya hesaplara katkı sağlamaz; NC-SA lisansı ayrıca kısıtlayıcı.

### Gaps
- ASBC/Meilgaard lezzet çarkı terimlerinin makine okunur, lisanslı bir sürümü bulunamadı; ASBC Methods of Analysis (Sensory) erişimi araştırılmadı.
- Bira matrisinde ölçülmüş eşiklerin açık bir veri seti (CSV/JSON) bulunamadı; PMC'deki eşik tablosu (PMC3836583) reCAPTCHA nedeniyle okunamadı.
- World Beer Cup 2026 kategori listesinin makine okunur sürümü araştırılmadı.
- Open Food Facts "beers" kategorisi sorgusu JSON döndürmedi (muhtemelen engel); Türk ticari biraları için açık veri doğrulanamadı.
- BeerAdvocate/RateBeer eşleştirilmiş Lederrey & West (EPFL) setinin güncel erişimi ve lisansı doğrulanmadı.

## Soru 5 — Bir bira uygulamasının yararlanabileceği diğer veri kaynakları

### Takeaway
Veri setinden çok "biçim ve köprü" kazanımları öne çıkıyor: BeerJSON ile içe/dışa aktarma, Brewfather API ile kullanıcının kendi reçetelerini çekme, Türk su idarelerinin aylık analizleri ve JIB/BrewingScience gibi açık dergilerin allowlist'e eklenmesi.

### Cited Findings
- BeerJSON standardı aktif geliştiriliyor (MIT, son push 2026-11-06); Brewtarget varsayılan içeriği BeerJSON 2.01 biçiminde dağıtıyor — [GitHub search API beerjson](https://api.github.com/search/repositories?q=beerjson&sort=stars), [Brewtarget DefaultContent003](https://raw.githubusercontent.com/Brewtarget/brewtarget/develop/data/DefaultContent003-Ingredients-Hops-Yeasts.json)
- Brewfather API kullanıcının kendi reçete/parti/envanterini veriyor (500 çağrı/saat/anahtar) — [Brewfather API docs](https://docs.brewfather.app/api)
- jackmisner/BrewTracker (GPL-3.0, son push 2026-11-02) aktif bir açık kaynak ev üretimi uygulaması — [GitHub search API](https://api.github.com/search/repositories?q=beerxml+recipes&sort=stars)
- FermentationJSON (GregRR/fermentation-json, 2026-09-17): fermantasyon verisi için yeni, versiyonlu JSON Schema standardı — [GitHub search API beerjson](https://api.github.com/search/repositories?q=beerjson&sort=stars)
- Türk su idareleri aylık laboratuvar raporları PDF olarak yayınlanıyor (ESKİ, ASKİ, TİSKİ örnekleri; içerik bu ortamdan okunamadı) — [ESKİ Şubat 2026](https://www.eskisehir-eski.gov.tr/uploads/laboratuvar/aylik_rapor/Subat2026.pdf)

### Inferences
- BeerJSON içe/dışa aktarma — DENE, M: Brewfather/Brewtarget/BrewTracker kullanıcılarına köprü; Kaan'ın Brewfather kullanıp kullanmadığına bağlı.
- Brewfather "kendi reçeteni getir" — İZLE: kullanıcı anahtarı gerektirir; anahtar uygulamadan çıkmamalı (CLAUDE.md kuralı).
- FermentationJSON — İZLE: çok yeni, benimsenme yok (1 yıldız); EVR1 deney defteri ileride bu tür bir şemadan yararlanabilir.
- BrewTracker — İZLE: rakip/örnek uygulama; içerik kaynağı olarak doğrulanmadı.

### Gaps
- Kaan'ın Brewfather/BeerSmith/Grainfather kullanıp kullanmadığı bilinmiyor (içe aktarma önceliği buna bağlı).
- USDA/HGA hop istatistikleri, malt fiyat endeksleri gibi pazar verileri bu oturumda araştırılmadı (Brewmaster için düşük öncelik varsayımı, doğrulanmadı).
