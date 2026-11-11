SPRINT ND7B — ND7 takip: "aynı ürün değil" işareti, kaybolan satırlar, katalog renk hataları (gerçek API çağrısı YOK)

Claude, 2026-11-12. ND7 raporu (4642980, SW v131-544) Claude tarafından doğrulandı. Doğrulama sonuçları ve kararlar gorevler/SPRINT_GECMISI.md 1j3z12'de.
Bu sprint ND7K'dan ÖNCE verilir.
Bu dosyada 4 madde var (0–3). İşe başlamadan 4'ünü de okuduğunu raporun ilk satırında teyit et; modelini yaz.
EFOR: high.

DURUM (Claude ölçtü)
- Claude'un kendi ortamında 6 dilim tam regresyon koşuldu, kod v131-544: sonuç 1j3z12'de.
- nd7_tanima sayıları raporla birebir aynı:
  - tanınmayan satır 0;
  - malzemeli örnek 985;
  - malt / hop / maya / ek: ürün, sınıf, bekliyor ve proses dağılımları aynı.
- Kör eşleme denetimi: eşleme dökümünden 104 tekil eşleme seçildi (seed 20261112). "Sözlük" ve "proses" kuralları örnekleme dışında tutuldu. Kararlar:

  | Karar | Anlamı | Sayı |
  |---|---|---|
  | A | aynı ürün | 33 |
  | B | aynı tür, farklı üretici ya da köken | 20 |
  | C | aynı aile, farklı renk ya da ürün | 8 |
  | D | yanlış tür | 0 |
  | E | sınıf doğru | 10 |
  | F | sınıf yanlış | 2 |
  | G | katalog bekliyor, doğru | 18 |
  | H | bekliyor ama katalogda var | 3 |
  | I | artık, doğru | 6 |
  | J | artık, ama gerçek malzeme kayboluyor | 3 |
  | — | belirsiz | 1 |

- Kurala göre kırılım:

  | Kural | Kararlar |
  |---|---|
  | okuyucu-marka | 10/10 B (marka ayıklanınca HEP başka üreticinin ürününe gidiyor) |
  | okuyucu-köken | A 5 · B 3 · C 2 |
  | renk | A 4 · B 3 · C 5 |
  | okuyucu (biçim / parantez) | A 11 · B 1 |
  | maya-kod | A 10 |
  | sınıf | E 10 · F 2 |
  | katalog_bekliyor | G 9 · H 2 · belirsiz 1 |
  | artık | I 5 · J 3 |

- Sonuç: yanlış tür bağlaması (D) yok. Ama ürüne bağlanan satırların neredeyse yarısı "aynı ürün değil" (B + C).
  - Bunlar bugün birebir rozetinde "aynen" sayılıyor. Bu, ND6'da kapatılan "olduğundan fazla var deme" hatasının tanıma tarafındaki karşılığı.

KURALLAR
- ND6 KURALLAR bölümü aynen geçerli:
  - heldout açılmaz;
  - üç imza AYNI (2c9ebd9f-32461 · 92f59a3c-5776 · 6d7e6c6e-35582);
  - gerçek API yok, Firebase yok;
  - fixture içeriği hiçbir yere yazılmaz;
  - Kaan'dan iş istenmez;
  - bayrak kapalıyken eski davranış (BM_ND7B).
- AĞ: bekleme ya da deneme için üçüncü taraf servislere istek ATILMAZ (ND7'de httpbin.org'a 7 istek atıldı; bir daha olmayacak). Bekleme yerel yapılır. Dış istek yalnız şunlara:
  - GitHub (push, Pages md5);
  - kaynak doğrulaması gereken üretici sayfaları.

0. CLAUDE KARARLARI (uygula)

(a) FARK İŞARETİ
- Eşleme tablosuna `fark` alanı eklenir: 'marka' | 'koken' | 'renk' | 'bicim' | boş.
- Kural: tarifin adlandırdığı ürün ile bağlanan katalog kaydı aynı üretici + aynı nominal ürün DEĞİLSE fark doludur.
  - okuyucu-marka kuralıyla gelen her satır 'marka' alır. İstisna: katalog kaydı aynı markanın aynı ürünüyse.
  - renk kuralı: nominal renk aynı değilse 'renk' (ör. tarif 90 °L, kayıt 80 °L).
  - köken kuralı: kayıt aynı kökenli jenerik değilse 'koken'.
- Birebir rozetinde (yayımlanmış tarifi aynen) fark dolu satır "aynen" sayılmaz, "yakın" (🟨) sayılır.
- "Stoğumla kur" ve "Stoğumla oluştur" notu: "tarif X diyor; katalogdaki Y kullanıldı (fark: marka / renk n °L …)".
- Marka ürünü katalogda yoksa:
  - satır geçici olarak aynı türden katalog kaydına fark='marka' ile bağlanır;
  - ürün tests/nd7k_aday.json'a eklenir;
  - ND7K ürünü ekleyince satır yeniden bağlanır ve fark kalkar.
  - Aynı ürünün tüm yazımları AYNI yoldan gider. Denetimde tutarsızlık bulundu: "Rahr 2-row" yazımlarının biri bekliyor, üçü briess_pale.

(b) BİÇİM (taze / yaş / homegrown / aged hop)
- Kimlik aynı çeşittir, fark='bicim'.
- Taze / yaş (wet, fresh, green) hopta miktar kuru hopa 1:1 AKTARILMAZ. Çevrim oranı yalnız kaynakla kullanılır: yetiştirici ya da üniversite yayını, url + ≤15 sözcük alıntı.
  - Kaynak yoksa satır notu: "taze hop: kuru karşılığı senin kararın".
  - Bu satır IBU hesabına sessizce 1:1 girmez.
- Homegrown: notu "alfa değeri bilinmiyor; katalog değeri kullanıldı".

(c) KAYBOLAN SATIRLAR (artık)
- Denetim, yanlış listeye yazıldığı için "artık" sayılan 3 gerçek hop satırı buldu:
  - malt listesinde "German Blanc, FWH" → Hallertau Blanc, ilk şıra hopu;
  - maya listesinde 7,5 g Galaxy;
  - malt listesinde Fuggles pellet.
- Tüm "artık" satırları yeniden incele. Gerçek malzeme doğru listeye taşınır. Hiçbir gerçek malzeme kaybolmaz.
- Liste raporda olsun: örnek, satır, nereden nereye.

(d) MAYA KARIŞIMI
- Maya satırında "and / ve / + / blend / together" ile iki maya birlikte kullanılıyorsa bu VEYA DEĞİLDİR. İki maya satırı olur.
  - Denetimde örnek: "Wyeast 1056 … and Wyeast 1968"; ikinci maya kayboluyordu.
- Etkilenen örnekleri listele.

(e) DENETİM DÜZELTMELERİ (her biri kaynakla doğrula; doğrulanamazsa uygulama, listele)
- "Brewer's Gold" (köken yok): katalogda hitit_bg var. fark='koken' ile bağla, bekliyor'dan çıkar.
- "Caravienne": Dingemans Cara 20'nin satış adı olarak geçiyor (satıcı sayfası). Üretici sayfasından doğrula; doğrulanırsa dingemans_cara20'ye bağla.
- "soured wort": satın alınan ürün değil, evde yapılır. Asıl malzeme light DME → dme. Not: "ekşitilmiş şıra (evde)".
- Escarpment "Kveik" (kodsuz): snf_maya_kveik. Escarpment'ın tek bir "Kveik" ürünü yok.
- "Imperial Global": Imperial L13 Global; katalog_bekliyor "Imperial L13 Global".
- Markasız "debittered black malt": jenerik dehusked_black kaydı. Dingemans'a özel kayıt değil.
- "U.S. pale malt": katalogdaki ABD baz pale (2-row) kaydı varsa ona, fark='marka'. Kayıt renkleri üretici sayfasından. Yoksa bekliyor.
- "SafLager W34/70" (tiresiz yazım) koda okunmuyor. Kod okuyucu tiresiz biçimi de okusun.
- "Baker's dark": belirsiz. snf_b_katki "Baker's dark chocolate" ve not.

(f) KATALOG RENK HATALARI (Dingemans EBC ↔ °L karışıklığı şüphesi)
- Denetimin işaret ettikleri:

  | Kayıt | Katalogda | Ürün |
  |---|---|---|
  | dingemans_cara20 | 8 °L | Cara 20 ≈ 50 EBC ≈ 19 °L |
  | cara45 (Cara 45 MD) | 45 °L | 45 EBC ≈ 17 °L |
  | dingemans_cara8 | 8 °L | 8 EBC ≈ 3,5 °L |
  | amber | 30 °L | Crisp Amber ≈ 50 EBC ≈ 19 °L |

  Bunlar DOĞRULANMADI.
- Katalogdaki TÜM Dingemans ve Castle kayıtlarını üretici sayfasıyla karşılaştır. Rengi ve birimi düzelt (url + alıntı). Kaynak bulunamayana dokunma, listele.
- Düzeltmenin etkisini ölç: değişen SRM hesapları ve muadil renk kontrolleri.

(g) OG HESAPLANAMAYAN ÖRNEKLER
- Şu durumda "Stoğumla oluştur" düğmesi kapalı olur:
  - grist ağırlığının %20'sinden fazlası ekstrakt değeri olmayan satırlardan oluşuyorsa (katalog_bekliyor ya da üyesiz sınıf);
  - ya da hesaplanan OG 1,010'un altındaysa.
- Kapalı düğmenin yanında neden yazar: "Bu tarifin maltları kataloğa eklenince açılacak".
- Sayıyı raporla. ND7K'dan sonra yeniden ölçülecek.

(h) MAYŞE HOPU (3 örnek)
- Editör mayşe hopunu destekliyorsa satır mayşe hopu olarak taşınır.
- Desteklemiyorsa satır not olarak taşınır: "mayşe hopu X g — editörde mayşe kullanımı yok, IBU'ya katılmadı".
- Düğme açılır.

(i) İSKELETTE EŞİT PAYLI MAYA
- Eşitlikte seçim sırası:
  1. katalog kaydının stil listesinde bu stili adıyla anan maya;
  2. o da yoksa önceki iskeletteki maya korunur.
- Örnek sayısı 3'ün altında olan stilde türetilmiş maya önceki seçimi değiştirmez. Önceki seçim yoksa doldurur ve "zayıf" etiketi taşır.
- Değişen stil listesini raporla.

1. ESKİ VAKALARIN YENİ SÜRÜMLERİ
- ND7_ONCESI'ndeki 15 vaka ile ND6_ONCESI'ne eklenen 2 vakanın (CB1-ARAMA, ND1-GIRIS) bayraklar açık sürümü yazılır. Ad: <kod>-ND7.
- Beklenti ND7 / ND7B kuralından türetilir, ölçülen değerden DEĞİL. Her vakanın başında tek satır yorum: "eski → yeni, çünkü <kural>".
- Kuraldan türetilemeyen beklenti yazılmaz, raporda listelenir.

2. ÖLÇÜM (önce / sonra)
- nd7_tanima: kural dağılımı + fark alanı dağılımı (marka / koken / renk / bicim).
- nd6_olcum (fixture stok):
  - örnek birebir rozeti;
  - stil rozeti;
  - "Stoğumla oluştur" görünen / tam / kapalı (g).
- Düzeltilen katalog renkleri: kayıt, eski, yeni, kaynak.

3. TEST + KAYIT
- npm test 6 dilim (--parca), yeni vakalar dahil. Tam paket SON kodla koşulur.
  - Bellek yetmezse dilimler sırayla, küçük parçalarla koşulur; kapsamın tam olduğu raporda gösterilir.
- CEV mock 55, üç imza AYNI, kural yolu d30af8de.
- Commit + push, sw.js CACHE_VERSION +1, canlı md5 = yerel, eklenen satırlarda anahtar taraması 0, fixture içeriği diff'te 0.
- BAĞIMSIZ DOĞRULAMA (Kaan kuralı, ZORUNLU): rapordan önce işi GÖRMEMİŞ bir doğrulayıcı alt ajan kendi başına bakar. Bulgular raporda ayrı bölüm. Bakacakları:
  - diff ve üç imza;
  - fark alanı: okuyucu-marka satırlarının tamamında dolu mu;
  - rastgele 30 farklı satır: fark türü doğru mu;
  - (c)'deki taşınan satırlar;
  - (f)'deki her renk düzeltmesinin url'si ve alıntısı;
  - 17 yeni vakanın kural → beklenti satırları;
  - sızıntı ve üçüncü taraf ağ isteği grep'i.
- CLAUDE.md'ye 1–2 satır; ayrıntı gorevler/SPRINT_GECMISI.md sonuna.
