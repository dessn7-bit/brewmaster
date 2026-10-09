# Brewmaster Proje Notları

## Proje
Brewmaster, Türkçe bir ev üretimi (homebrewing) web uygulaması. Tek dosya: Brewmaster_v2_79_10.html (~3,7 MB, ~36.850 satır — ölçüldü 2026-10-09). PWA/APK olarak deploy ediliyor.

## ÇOK ÖNEMLİ - Kullanıcı Kuralı
Kaan kod bilmiyor. Tüm kod okuma, yazma, düzenleme, deploy işlerini Claude yapar. Kaan'a asla "şunu kopyala/yapıştır" veya "şu satırı düzenle" denmez. Kaan sadece ne istediğini söyler (bug adı, özellik), gerisini Claude halleder.

## Workflow Kuralları
1. ASLA dosyayı tam `view` etme (token yakar, ~36.850 satır)
2. grep/findstr ile hedefli oku
3. str_replace ile düzenle
4. Değişiklikten sonra syntax kontrol yap (node -c gibi)
5. Tamamlandığında deploy et
6. Claude yerel git repo'su üzerinde çalışır, GitHub ile git pull/push senkron. Brewmaster'ın yedeği = GitHub.

## İletişim
- Dil: Türkçe
- Kaan'a "kralım" deme
- Direkt, dürüst, fikirli ol
- Bilimsel ol, tutarsız olma

## M Backlog
M1-M10 UX iyileştirmeleri var ama detayı şu an belirsiz, Kaan hatırladıkça eklenecek.

## Sprint Kuyruğu (2026-10-09, Kaan onaylı sıra — promptları Claude sırayla verir, Kaan karıştırmasın diye)
1. **ND5** — TAMAM (c015c0a, SW v131-456).
1b. **UYG1** — TAMAM (310a42b, SW v131-457). Bilinen açıklar UYG2'ye taşındı (maya köprüsü hatası, malt/hop benzerlik gevşekliği, az-var notu, satırlar arası toplam, SRM uyarı ayrımı, tahmini GU bayrağı). AHA örneklerinde hop gramajı yok → 991 örneğin yalnız 99'u uyarlanabiliyor: ISK1'de türetilmiş iskeletin rol bazlı g/L'siyle "varsayım" etiketli hop miktarı düşünülecek.
1c. **UYG2** — TAMAM (6c71499, SW v131-458).
1d. **KAT1** — TAMAM (74a8e24, SW v131-459). Takip: tek tüccar listesine (Charles Faram 2022 arşiv) dayanan hop ✅'leri ISK1 madde 7'de eşiğe tabi. Mayşe güçlendirici katalog dozu değişti ama Kaan'ın ürün kimliği (etiket) hâlâ teyitsiz.
1e. **ISK1** — TAMAM (SW v131-460). İskelet örnek verisinden türetilir (_isk_build.js → iskelet_veri.js; _cc_veri_yaz her yazımda yeniden üretir). Kapsam 63 → 236/239 stil (türetilmiş 75 · elle 30 · zayıf 116 · ödünç 15 · C 3). Açık: eşlenemeyen malt adları (caramunich / carafa ii / belgian pale…) zayıf iskeletin ana nedeni; hakem top-3 türetilmiş %82 vs elle %89 (aynı 56 stil). Sonra AI1.
1f. **ISK2** — TAMAM (b4c536b, SW v131-461). Coffee Stout baz → Thracian Pale; Dubbel D-90 → Hazkat 75 g + dekstroz 78 g; renk hesabı gram×1,3 hatası düzeltildi; iskelet 128/25/73/12/1; uyarlanabilir 132.
1g. **VERI1** — TAMAM (8470537, SW v131-462). BJCP 239 satır PDF'lerle karşılaştırıldı: 131 birebir, 33 düzeltildi, 105 kaynak yok; AHA gerçek hop gramı (464/485 örnek) → uyarlanabilir 156; iskelet hakem top-3 %75. Açık: AHA maya eşlemesi (184 örnek), WLP565 attenuation değeri (üretici verisiyle kontrol), German Pils renk modeli (SRM 4,1 > 4), 105 kaynaksız stil.
1h. **AI1** — TAMAM (ffd9287, SW v131-463). Asistan çekirdeği canlıda, beta anahtarı arkasında KAPALI; yalnız mock ile sınandı. Saison 3 güç (table/super OG ABV'den türetildi, super FG kaynakta yok). Tahmini soru maliyeti ≈0,037 $ + denetim 0,008 $. Kaan'ın 'Dark Belgian Dubbel' reçetesinde stil alanı boş.
1i. **AI2** — TAMAM (c609084, SW v131-464). korpus_kullanim.js 76 KB (346 kalem; katkı miktarları birimsiz → g/L yok); web_search_20250305, 18 izinli alan, max_uses 3; kanonik anahtar; Table Saison kaldırıldı (240 satır); tests/tuzak_seti.json 60 istem + tests/tuzak_kos.mjs.
1j. **AI3** (gorevler/AI3.md, 7 madde) — Claude set incelemesi: D gerçek iki tur değildi, tarafsızlaştırma baskıyı siliyor (ham yol eklenecek), C03/C04/C12/A12/B02 belirsiz → değişecek, B puanlama kuralı. Kaan harcama tavanını KURDU (2026-10-09); anahtarı Console'da göremiyor (yalnız uygulamada) → gerçek koşu UYGULAMA İÇİNDEN ('🧪 Tuzak testini çalıştır', anahtar uygulamadan çıkmaz, sonuç anahtarsız kopyalanıp CC'ye yapıştırılır), Models API + fiyat doğrulama, web gerçek doğrulama (+WLP565 değeri), açılış kararı. — DURUM (SW v131-466): gerçek koşu #1 (2026-10-09) 5,29 $ — 55 gerçek adımın 46'sı max_tokens kesilmesi (Sonnet 5.5 effort high + thinking; düzeltildi: between_tools + effort medium, max_tokens 3000 — CANLI DOĞRULANMADI), kalan 83 adım bakiye/limit hatası (koşucu artık durur, adımı saymaz, Devam yalnız hatalıları koşar). Gerçek adımlarda uydurma 2/9 (B08, B09) > eşik → Kaan kuralı: yeni harcama YOK, asistan KAPALI. Kaan bakiye yükleyene kadar gerçek API çağrısı yok.
1j2. **AI4** (gorevler/AI4.md, 9 madde, YENİDEN YAZILDI 2026-10-09) — KANIT-ÖNCE ASİSTAN (Kaan kararı: tat öznel, AI yorumu istenmiyor; "uygulama 376 bin reçetede arasın, sonuca göre internette araştırsın"). Korpus tablosu malzeme×stil tam sayım + kütle birimli g/L; kanıt paketi AI'sız; web sorgularını uygulama üretir; AI yalnız kaynaklı özet (Kaan'ın soru cümlesini görmez, tat hükmü yasak, yokluk olumsuz yorumlanmaz); yorum katmanı varsayılan KAPALI; kanıt yoksa "bulamadım" + BARDAK DENEMESİ (tentür, doz basamakları, partiye ölçek, sonuç kaydı → EVR1 kişisel kol). Uydurma önlemi (B08/B09), puanlama düzeltmesi, tuzak seti +T grubu (16 tat istemi), D ve ham yol bu koşuda yok. Gerçek koşu: ön kontrol → önce Haiku 5.5 tüm set 2 tur → kalan gruplar Sonnet 5.5. Bütçe kalan 6,71 $. — GERÇEK KOŞU #2 (2026-10-09, 2,15 $; tuzak toplam 7,44 / 12 $, kalan 4,56 $): ön kontrol GEÇTİ; Haiku yalakalık 0/40, kontrol 19/22, tat 0/32 ama uydurma 13/138 = %9,4 (üst %14,6) → KALDI, asistan KAPALI; Sonnet (T+C tekrarı) daha kötü (uydurma %43). İNCELEME: A/C düşüşlerindeki sayıların HEPSİ kanıt paketinde var (iki parçayı tek cümlede birleştirip tek kaynak etiketi + ürün adındaki rakam: WY3068, Crystal 40, 2-Row); T düşüşlerinin çoğu denetleyici yanlış pozitifi (Türkçe ad ↔ İngilizce alıntı: kişniş/coriander, portakal kabuğu/orange peel; genel ad "Buğday"); doğrulanamayan 1 (T06a %6,5). Web her T çiftinde ≥7 alıntı döndü → bulamadım/bardak gerçekte HİÇ çıkmadı. WLP565 whitelabs 65–75 % = katalog. Özet working/tuzak_sonuc_gercek_2.json. ÖNERİ (AI4-düzeltme, kod bedava): kaynaklar[] dizisi (1–3 ID, sayı birleşimde aranır), ad rakamları sayı sayılmaz, ürün denetimi EN alias + genel tek kelime adlar hariç, yokluk regex daraltma, web bulgusu yalnız kalem+stil birlikte geçen alıntı, özet max_tokens 2000, düşen cümlenin web alıntısı sonuca yazılır → doğrulama koşusu yalnız Haiku ≈ 1,8 $ (Kaan onayı gerekir). — DURUM (SW v131-467): KOD CANLI, mock ile sınandı (374/374), GERÇEK KOŞU KAAN'IN DÜĞMESİNİ BEKLİYOR. Korpus tablosu 78→166 KB (73 korpus stili; 240 BJCP anahtarının 35'i ad örtüşmesiyle yakın stile bağlı, sayısal profil yakınlığı reddedildi); rmwoods katkı miktarı BİRİMSİZ (309.385 satır, çevrilmedi), kütle birimli yalnız 31 AHA satırı → katkı g/L dağılımı yok. Deterministik çözüm setin A/C/T'sinin tamamı (C12 "Hitit Münih" alias). Önbellek KAPALI (şema enum çağrı başına → cache geçersiz; sabit önek < 512). Asistan beta KAPALI.
1j2a. **AI4B** (gorevler/AI4B.md, 6 madde; Claude değerlendirmesi 2026-10-10) — AI4 koşu #2 KALDI (Haiku uydurma 13/138; CC: çoğu denetleyici hatası). CC'nin 7 önerisi kabul + koşullar: çok kaynakta ürün–sayı bağlama, ürün adı rakamı yalnız katalog adıysa, web yalnız malzeme+stil birlikte geçerse "stile özgü". YENİ: denetleyici gerçek cümlelerle elle etiketli setle (yanlış alarm + KAÇAN uydurma) ve mutasyon testiyle doğrulanır, koşudan ÖNCE dondurulur (hash), sonra TAZE Haiku koşusu (kalan 4,56 $). Sonuç sonradan yorumla değişmez.
1j2b. **BUL1** (gorevler/BUL1.md, 7 madde; AI4 SONRASI, AI5'TEN ÖNCE — Kaan "kesinlikle istiyorum" 2026-10-09) — "Tarif et, uygulama bulsun": serbest tarif → sözlük (TR+EN, kaynaklı eşikler) + gerekirse Haiku enum seçimi → ekranda düzenlenebilir filtre çipleri → ödüllü örneklerde AI'sız arama → en fazla 5 sonuç + "Stoğumla oluştur". Belirsiz kelime iki seçenek, çelişkide sorar, enum dışı düşer, anahtarsız da çalışır. Test seti 24 tarif, gerçek koşu ≤0,50 $.
1j3. **AI5** (gorevler/AI5.md, 8 madde; BUL1 SONRASI) — "Bu reçeteyi nasıl geliştirebilirim?" (Kaan istedi 2026-10-09). Hedef çipleri (varsayılan stile/ödüllülere yaklaştır; daha kuru/gövdeli/acı/koyu…); kıyas motoru AI'sız (BJCP + iskelet + ödüllüler + korpus, p10–p90 + n); öneriyi KURAL MOTORU üretir (en fazla 3 tek değişkenli aday + önizleme + stok + kanıt; hedef→değişken tablosu kaynaklı); kişisel geçmiş (profil, maya kalibrasyonu, off-flavor, bardak denemesi); AI yalnız kaynaklı anlatır, aday ekleyemez. Bardak denemesi yalnız AI4 madde 5 üç şartıyla (Kaan: "her soruya bardak dene demeyecek"). Tuzak G grubu 8 istem, Haiku, ≤1 $.
1k. **Opus seçeneği** (Kaan sordu 2026-10-09) — AI3 sonucundan sonra: Ayarlar'da model seçimi (Sonnet 5.5 varsayılan / Opus 5.5 'daha dikkatli'); fiyat platform.claude.com pricing: Opus 5.5 $4/$20, Sonnet 5.5 $2/$10 (okundu 2026-10-09) → soru başı ≈2x. Karar tuzak testiyle: Sonnet geçerse Opus isteğe bağlı; kalırsa Opus ile kalan gruplar tekrar. AI4 TAHMİNİ (Opus bu sprintte YOK): AI4 setinin tamamı Opus 5.5 ile 2 tur ≈ 120 özet × (3000 giriş + 600 çıkış) = 2,9 $ + 34 web adımı × ≈ 0,12 $ = 4,1 $ → toplam ≈ 7 $ (Haiku ile aynı plan ≈ 1,2 $; pricing sayfası okundu 2026-10-09: Opus 5.5 $4/$20).
1f. **ISK2** (gorevler/ISK2.md, 6 madde) — ⚠️/özellik tek kademe + sınıf farkı (Coffee Stout'ta Maris Otter→Munich 3,69 kg hatası); şeker rolü ikamesi (Dubbel Candi D-90 → Hazkat koyu kaya ~77 g + dekstroz ~79 g); rol düzeyi eşleme (belirsiz malt adları, yalnız iskelet); zamansız hop satırları; hedef kırpma incelemesi. Sonra AI1.
   (KAT1 kapsamı:) — hop aroma satırında özellik benzerliği varsayılan değil + kaynaklı hop MUADIL genişletme; renk-eşdeğer miktar (kristal/kavrulmuş); MUADIL renk metni çelişkileri (9); katkı doz denetimi; sepet farkı (Amber Malt +3). Sonra ISK1 → AI1.
   (eski 1c metni:) — BİLEŞİK MUADİL (Kaan istedi 2026-10-09): tek muadili olmayan malt için stoktan 2-3 maltlık karışım (ör. CaraAroma 151 °L yerine aynı rolde stok kristal + rengi tamamlamak için en az miktarda kabuksuz kavrulmuş/Carafa). Kurallar: rol kütlesi korunur (kristal yerine kristal), renk açığı en az miktarda koyu maltla kapanır, OG/ekstrakt dengelenir; ⚠️ "bileşik muadil — hesapla kuruldu, doğrulanmış değil" etiketi + önce/sonra sayılar; ✅/🟡/🔴 durum sayımına GİRMEZ; yalnız malt (hop/maya/katkı yok). GÖRÜNÜRLÜK (Kaan şartı): uygulama bunu KENDİLİĞİNDEN söyler — önizleme satırında "✕ yok" yerine "⚠️ stoktan tamamlanabilir: CaraMunich I 277 g + Carafa III ~60 g" + renk/tat notu; Eksikler listesinde "alınacak" ile "stoktan tamamlanabilir" ayrı gruplarda; Stoğumla oluştur ve satır değiştirme listesinde de aday olarak çıkar. Kabul örneği: Ommegang Dubbel CaraAroma 277 g (11 L) → Kaan stoğu CaraMunich I 277 g + Carafa Special III ≈60 g (MCU eşitleme; Morey'de toplam MCU aynı → tahmini SRM aynı); not: CaraAroma'nın koyu karamel/kuru üzüm tadı tam gelmez, Carafa az da olsa kavrulmuşluk ekler. + ekran dili: ⚠️ yakın muadil varken "✕ yok" yerine "stokta daha açık bir Munich var (6 °L, örnek 10 °L)".
2. **Kalan birleşik iş** — UYG1'den sonra İKİ sprint: ISK1 (türetilmiş iskelet + katalog doz denetimi; eski ISK1.md silindi, UYG1 motoru üstüne yeniden yazılacak) → AI1 (asistan + tuzak testi). Başlangıç kapsamı:
   - Örnek verisinden türetilmiş iskelet (227 stil, kaynak izi, LOO + stil motoru hakem, kendiliğinden yeniden hesap).
   - "📦 Stoğumla oluştur": stokta → aynen, ✅ muadil → değiştir, ⚠️ → en yakını + ne değişeceği notu, yok → "alınacak"; maya en yakın suş; OG/IBU yeniden dengeleme, renk kayması uyarısı.
   - Satır değiştirme önizlemesi: "bunun yerine bunu koyarsan" → OG/FG/ABV/SRM/IBU önce/sonra (AI'sız, kaynaklı fark notu).
   - AI soru kutusu + "yeni reçete olarak aç" (yapılandırılmış taslak → katalog doğrulama → uygulama hesabı → Kaan basar; asla üstüne yazmaz; stil öğrenme sinyali yazılmaz).
   - Yalakalık/uydurma önlemleri: iddia-bazlı çıktı (veri/genel/bilmiyorum), sayısal iddia katalogla otomatik kontrol, soru tarafsızlaştırma, hesap-AI çelişki uyarısı, açmadan önce ikinci denetim çağrısı, ~30 tuzak soruluk test seti (eşik geçmeden canlı yok). Gerçek anahtarla test Kaan'ın onayına bağlı (~1 $).
   - AI reçetelerini işaretle → tadım sonuçlarıyla AI vs diğer karşılaştırması.
   - Cevap katmanları (Kaan kararı 2026-10-09): 📊 Veri (katalog/örnek, doğrulanmış) · 🧮 Hesap (uygulama) · 💬 Yorum ("bu benim yorumum, doğrulanmadı" — AI kendi bilgisiyle cevap VERİR, ör. "lavanta Dubbel'e ne kadar"). Yorumdaki miktar katalog maxDozgL'yi aşarsa uyarı; veriyle çelişirse veri kazanır + uyarı. Sayılar yine uygulamadan, verdict kuraldan. Tuzak seti 60 soru (≤%5 için), maliyet ≤12 $ — Kaan ONAYLADI (2026-10-09 09:12); koşmadan önce Anthropic Console harcama tavanı kurulu olmalı.
   - 🌐 Web katmanı (Kaan istedi): Anthropic web search server tool ($10/1000 arama + sonuç token'ı; atıflar her zaman var — docs platform.claude.com web-search-tool, okundu 2026-10-09). Kaan'ın isteğiyle açılan düğme ("İnternette de ara"), max_uses ~3, allowed_domains güvenilir biracılık kaynakları. Model desteği Models API'den (capabilities.server_tools.web_search) ve tarayıcıdan doğrudan çağrıda çalıştığı CC tarafından doğrulanacak. Web bulgusu 📊 Veri'yi ezmez; link + cited_text gösterilir.
   - Korpus kullanım tablosu: 376.810 reçetelik korpus (Kaan PC: working/_step105_dataset_v8_clean.json) uygulamada YÜKLÜ DEĞİL. Build-time'da malzeme başına kompakt tablo: kaç reçete, hangi stiller, doz dağılımı (g/L p10/medyan/p90) → 📊 Veri'ye "topluluk böyle yapmış" (tipiklik ≠ iyilik; kalite etiketi yalnız 539 reçetede). Korpusta katkı miktarı alanı var mı CC ölçecek.
   - Birleşik sprint büyük → muhtemel bölünme: A) iskelet + stoğa uyarla + değiştirme önizlemesi + katalog denetimleri; B) AI asistanı (katmanlar, web, korpus tablosu, yalakalık/uydurma önlemleri, tuzak testi).
   - Kaan stok cevapları (2026-10-09): "Candi şekeri" = KOYU KAYA ŞEKER (kristal, şurup DEĞİL) → D-180 şurubuna BAĞLANMAZ; katalogda koyu kaya candi kaydı yok, renk markaya göre değişiyor (tek değer bulunamadı) — ürün: Hazkat Profesyonel "Brewing Dark Candi Sugar" 250 g (satıcı sayfası ekran görüntüsü 2026-10-09; sayfada renk/EBC/üretici YOK, aramada da bulunamadı). KAAN KARARI: ortalama renk yeterli → katalog kaydı "Koyu Candi Şekeri (Kaya) — Hazkat" renk 360 EBC (≈183 SRM) TAHMİNİ, etiketli: iki üretici veri sayfasının orta noktası — Castle "Candy sugar dark (pieces)" 250–450 EBC (castlemalting.com/Publications/SugarProducts/SucreCandiBrunFT_en.pdf) ve Südzucker "candy sugar brown crushed" 150–600 EBC (brouwland.com/en/sugars/21016). Country Malt soft candi 700 EBC farklı form → dışarıda. Kayıtta aralık 150–600 EBC notu + SRM hesabında "tahmini renk" işareti. Satıcı EBC verirse güncellenir. "Kurutulmuş portakal" = DİLİM (portakal_kabuk kabuk kaydıdır, aynı ürün değil → refId yok, serbest metin kalır).
   - Kaan geri bildirimi (2026-10-09, Ommegang Dubbel önizlemesi): "Munich var, yok diyor" + "CaraAroma muadili var". Ölçüm: örnek "Munich malt (10 °L)" → dark_munich (r 9); Kaan'ın Hitit Münih'i 15-16 EBC ≈ 6 °L (hititmalt.com/munih-arpa-malti1) → ⚠️ doğru ama "✕ yok" yazısı yanıltıcı → ekran dili: "stokta daha açık bir Munich var (6 °L, örnek 10 °L)". CaraAroma r 151 °L; Kaan'ın en koyu kristalleri Hitit Koyu Kristal 60-80 EBC ≈ 27 °L (hititmalt.com/koyu-kristal-arpa-malti), CaraMunich I 35 °L → muadil YOK (5x açık). Fikir: bileşik ikame (kristal + az Carafa ile renk) — ⚠️ etiketli, ileride.
   - Katalog dozaj tutarlılık denetimi: ör. lavanta kaydında 3 farklı doz (acik "1-3g/10L" = 0.1-0.3 g/L; aynı metindeki "BYO 0.25-0.5 oz/5 gal" = 0.37-0.75 g/L; varsayDozgL 1 / maxDozgL 2) — tüm KATKILAR için acik metni ↔ varsay/max alanları karşılaştır, kaynakla düzelt.
   - Ek miktarı oz↔g çelişki kontrolü: ör. örnek verisinde "dried lavender 1/2 oz. (56 g)" (1/2 oz = 14 g) — iki birim %10'dan fazla çelişirse miktar BİLİNMİYOR sayılır (ND5 parantez-metrik kuralına ek).
3. **EVR1** — (ileride, Kaan "şu an değil" 2026-10-09: DENEY DEFTERİ — AI5 tek değişkenli önerisi → bağlı yeni reçete → üçgen kör tadım + binom anlamlılık → kişisel kanıt; EVR1 ile birleşebilir) 30 saniyelik tadım soruları (acılık/gövde/aroma az-tam-fazla + "tekrar yapar mısın") + tek değişkenli "sonraki deneme" önerisi; popülasyon önseli → Kaan verisine kayan ağırlık.
4. **Firebase RTDB güvenliği** — kurallar + oda rotasyonu (STK2 aktarım kodunu da gerçekten güvenli yapar).
5. **Mash asistanı AI** — mash süresince yardımcı yapay zekâ (Kaan istedi 2026-10-09, "işler bittikten sonra, unutmayalım").

## Önemli Tanımlar
- Kaan: Bankacı, ev üreticisi (homebrewer), betta breeder, yazar
- Bulldog Brewer, 10-12L batch boyutu
- Favori: Weizen/Weizenbock, Belçika Dubbel tarzları
- Ayrıca Domestic Betta Ansiklopedisi (8 cilt, ~930 sayfa, tamam) var — başka bir proje

## Stil Skorlama Motoru — İlerleme Notu (2026-04-23)
Faz 2a tamamlandı. styleMatchScore motoru JSON'da çalışıyor. Top-1 %70-80, Top-3 %89. Bilinen sorunlar: Session IPA↔APA, Blanche↔Sour↔Gose karışıklığı, Specialty agresif, aile içi (Vienna↔Czech Amber, Belgian Strong Golden↔Tripel) çakışmalar.

**Faz 2b tamamlandı (2026-04-23):** Aile içi tie-break motoru + specialty cap eklendi. 202 stil 33 aileye etiketlendi (`STYLE_FAMILIES.json`). Tie-break izole: aileler arası sıra korunur, sadece aile içi pozisyon değişir. Sonuç: **39/55 top-1 (%71), 49/55 top-3 (%89)**. +3 düzelme (best_bitter, wee_heavy, czech_permium), regresyon yok.

**Faz 2c tamamlandı (2026-04-23):** HTML'e V2c motor UI kutusu enjekte edildi (sarı beta kutu, top-3 öneri). %100 preset test oldu. Kaan gerçek Brewmaster'da test etti (Hoppy Wheat doğru yakaladı).

**Faz 2d — Ground Truth benchmark (2026-04-23):** Kaan'ın tautoloji uyarısı üzerine gerçek reçete havuzu kuruldu:
- **199 gerçek reçete** toplandı (Brulosophy + BYO clones + AHA NHC + Milk The Funk)
- Kaynaklar: Brulosophy (~40), BYO Magazine (~150), Brewery clones (Westmalle, Chimay, Orval, Duvel, Guinness, Sierra Nevada, Bell's, Stone, Firestone, Founders, Boulevard, New Belgium, Dogfish Head, Allagash, Hoegaarden, Ayinger, Schneider, Paulaner, Weihenstephaner, Lagunitas, Ommegang, AleSmith, vs.)
- Motor patch round'ları: %25 → %49 → %33 (veri büyüdükçe stabilize)
- **Son benchmark: 66/199 top-1 (%33), 94/199 top-3 (%47)**
- 55-test: 42/56 (stable), Preset: 15/15 (no regression)
- Dosyalar: `_gt_recipes_raw.js`, `_gt_convert.js`, `_confusion_analysis.js`, `_patch_gt2-6.js`

**Tespit:** Kural-tabanlı motor ~%33-39 tavanına yaklaşıyor. Rule-based rafineleme diminishing returns.

**A (Motor Rewrite) Denendi (2026-04-23):**
- Specificity-weighted scoring (dar safe zone = yüksek bonus) → regresyon (%33→%29). Revert.
- Magnet counter-exclusion (American Brown vb. British yeast exclude) → regresyon (%33→%31). Revert.
- **Sonuç:** Kural-tabanlı motor fundamental olarak rule-limitli. Marker vs scalar dengesizliği rule-based ile çözülemiyor. Gerçek çözüm ML veya hibrit ML+rule.

**✅ Faz 3 Feedback Loop — STİL KOLU BAĞLANDI (Sprint Z, 2026-07-30, commit 656b9a4, SW v131-388).**
Tarihçe: eski kayıt "TAMAM / veri birikiyor" diyordu (YANLIŞ, 2026-07-16'da düzeltildi); dış-kıyas denetimi (2026-07-15) kolu kopuk ölçtü (`bm_v2c_feedback` 0 geçiş, `stilSec` yalnız `S.stil` yazıyordu). Sprint Z v1 onarımı:
- **`bm_stil_ogren_v1`** (yeni user-authored key, cap 500): kayıt anında (`tarifeKaydet`) "motor ne dedi + Kaan ne seçti" sessizce dondurulur — rid-dedup son-yazan, DERIVED profile yazmaz.
- **4 kapı** (gürültü/zehirlenme): stil dolu + slug-seviye tahmin (`slugBranchHit`) + reçete tam (`_receteEksikler`) + tazelik İÇERİK-bazlı (malt-imza+maya+OG ±0.003). "İskeleti Doldur" = NİYET, sinyal yazılmaz.
- `uyumSira` AD-düzeyi (1=onay, 2-3=sıra yanlış, null) + `kapsamda` ayrımı (BJCP 239 > V12 91 slug) + kaynak bayrağı (stilSec/dropdown/null).
- Ayarlar ▸ Bildirim & Tanı: "🎯 Stil motoru isabet" satırı — motorun İLK gerçek-kullanım benchmark'ı.
- v1 SALT kayıt+ölçüm; öneri beslemesi **Z2** (n≥2 + soft recall, W2 dengi) açık iş.

Öğrenen sistemin 4 kolu da artık **canlı**: `bm_kaan_profil_v1` (verim/FG, Sprint Q) · `bm_maya_kalibrasyon` (maya attenuation) · `bm_off_ogren_v1` (off-flavor, Sprint W1) · `bm_stil_ogren_v1` (stil, Sprint Z).

**ML Pipeline tamam (2026-04-24): 1016 reçete + V5 Multi-Ensemble motor production'da.**
- LOOCV top-3 %76.6, top-5 %80.3 (rule başlangıcına göre +30 puan top-3)
- 4 motor paralel HTML'de: V2 (flat) / V3 (hiyerarşik) / V4 (ensemble) / **V5 (KNN+RF Multi)** ← ana
- V5 = 1016 KNN örneği + 50 RF ağacı (depth 15, rf=10), α=0.4 KNN + 0.6 RF + 0.0 rule
- Sıradaki kazanım: slug alias normalize (gueuze↔lambic, koelsch↔kolsch, hefeweizen↔weissbier)

**STİL SAYISI — tek "203" yok, 4 ayrı otorite var (ölçüldü 2026-07-15/16):**
| Kaynak | Sayı | Rol |
|---|---|---|
| `BJCP` (HTML içi, dropdown + bant kontrolü) | **240** (AI1: +Saison table/super · AI2: −Table Saison; önceki 239) | **OTORİTE** — kullanıcının gördüğü, hedef stil seçimi + uygunluk göstergesi |
| `STYLE_DEFINITIONS.json` (repo) | 202 | V2c motorunun kaynağı; motor HTML'den kaldırıldı (Sprint Y), dosya repoda yaşıyor |
| V12 ML motoru | 91 slug | Otomatik stil tahmini (top-3 öneri) |
| `STIL_ISKELET` | 63 (20 küratör + 43 korpus çıkarımı) | Elle iskelet — ISK1'den beri YEDEK; tek kaynak `_bmIskeletAl` (türetilmiş `iskelet_veri.js` > elle > zayıf > ödünç) |
| `SUBSTYLE_VARIANTS.json` | 58 | Alt-stil; **UI'da ölü** — `matchSubstyles` hiç çağrılmıyordu |
Eski "203 stil" ifadesi hiçbir kaynağa uymuyordu, kaldırıldı. Bir sayı yazarken hangi otoriteden bahsedildiği belirtilmeli.

**Temel dosyalar** (C:\Users\Kaan\brewmaster\):
- `STYLE_DEFINITIONS.json` — 202 stil, BA 2026 + BJCP 2021 hibrit, thresholds zone mantığıyla
- `SUBSTYLE_VARIANTS.json` — 58 alt-stil (Pastry Stout, Kveik NEIPA, Piña Colada Gose vs.)
- `STYLE_FAMILIES.json` — 33 aile + discriminator konfigi (Faz 2b)
- `style_engine.js` — Ana motor (findBestMatches, styleMatchScore, matchSubstyles)
- `FAZ2a_SONUC.md` — Detaylı sonuç raporu + yarın yapılacaklar listesi
- `_ml_dataset.json` — 1016 reçete × 61 feature (1.79 MB)
- `_ground_truth_v2_batch[1-8].json` — toplam 860 ek reçete (v1 199 + v2 batch 60+150+150+150+150+150+50)
- `_build_inline_v5.js`, `_inject_v5.js`, `_browser_sim_v5.js` — V5 pipeline

---

## UZUN VADELİ VİZYON — Kişiselleştirme ve Öğrenme

**Hedef:** Brewmaster'ı kural tabanlı bir hesap makinesinden, kullanıcı deneyimi ile öğrenen kişiselleştirilmiş bir sisteme dönüştürmek.

**Neden:** BeerSmith/Brewfather bu seviyede kişiselleştirme yapmıyor — Brewmaster'ın gerçek differentiate noktası bu olacak.

### Kapsam (her hesap/öneri için geri besleme)
- **Stil tayini** → kullanıcı manuel seçimi kaydedilir, benzer profillere önerilir
- **OG/FG tahmini** → kullanıcının gerçek hidrometre ölçümleri kaydedilir, attenuation profili kişiselleşir
- **SRM tahmini** → kullanıcının görsel/fotoğraf geri bildirimi
- **IBU algısı** → kullanıcı tat geri bildirimi (çok acı / normal / düşük)
- **Verim tahmini** → kullanıcının her batch'inde kendi sistem verimi öğrenilir (Kaan_verim ortalaması)
- **Maya attenuation** → Kaan'ın her mayayla gerçek aldığı attenuation öğrenilir

### Yaklaşım — Seviyeler
- **Seviye 1 (basit):** Manuel override + log + sonraki önerilerde kullan
- **Seviye 2 (orta):** Kullanıcı bazlı kalibrasyon dosyası (`kaan_profil.json`) — sistem verim offset, renk offset, FG offset
- **Seviye 3 (gerçek ML):** İlerisi — yeterli veri birikince

### Faz haritası
- **Faz 3:** Manuel stil seçimi + temel feedback log (Seviye 1)
- **Faz 4:** FG / SRM / verim feedback'leri
- **Faz 5:** Kişisel kalibrasyon profili (Seviye 2)
- **Faz 6:** ML (uzak gelecek, veri biriktikten sonra)

Bu vizyon arka planda, her yeni özellik tasarımında "bu ileride nasıl kişiselleşir?" sorusu akılda tutulacak.
