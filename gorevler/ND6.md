SPRINT ND6 — "Ne Demleyebilirim?" stok-öncelikli + muadil disiplini (gerçek API çağrısı YOK)

Claude, 2026-11-11. Kaan şikâyeti (2026-11-11): "o kadar malzeme var bi türlü eksiksiz reçete çıkmıyor, muadiller doğru mu".
Bu dosyada 8 madde var (0–7). İşe başlamadan 8'ini de okuduğunu raporun ilk satırında teyit et.
EFOR: high. MODEL: model-bağımsız; modelini ilk satırda belirt.

DURUM (Claude yerelde ölçtü, Playwright, ağ kapalı; stok = Kaan'ın 26 Haziran yedeği tests/fixtures/brewmaster_yedek_2026-06-26.json, 56 kalem, hacim 11 L. Sen aynı fixture ile kendi ölçümünle teyit et; fixture KİŞİSEL VERİ — içeriği hiçbir dosyaya, commit'e, rapora yazılmaz, yalnız sayılar):
- Ekranın ana düğmesi stil satırındaki "✨ Yeni reçete" (_brYeniIx → _bmStildenYeniRecete → _stilIskeletHesap). Bu yol STOĞA HİÇ BAKMAZ: iskeletin sabit katalog kimliklerini koyar. 239 stilin iskeletinden yalnız 9'u bu stokla eksiksiz; çoğunda 2–5 kalem eksik.
- Stoğa bakan yol zaten var ama gömülü: "📦 İskeleti stoğumla oluştur" (_bmIskeletStokumla → _bmStokumlaOlustur('isk', stil, 0) → _bmStokUyarla). Aynı stokla 239 stilin 191'inde plan çıkıyor; 87'sinde alınacak 0, 62'si tam (alınacak 0 + miktar yetiyor). 48 stilde _bmStokUyarla('isk', stil, 0) null dönüyor (düğme çalışmıyor). 239 stilin tamamı ≈0,9 sn.
- Satırdaki ✅/🟡/🔴 sayıları "yayımlanmış örneği BİREBİR yapabilir misin" sayımı: 988 örnekte ✅ 13 · 🟡 462 · 🔴 513. Tavan: katalogdaki HER malzeme bol miktarda stokta olsa bile yalnız 171/988 ✅, çünkü 817 örnekte en az bir kalem kataloğa eşlenemiyor (❔) ve ND4 kuralıyla ❔ olan örnek asla ✅ olamaz. 817'nin dağılımı: malt ❔ 516 örnekte, maya ❔ 414, hop ❔ 289, katkı ❔ 100.
- Maya ❔ satırlarının 74'ü birden çok kod taşıyor ("WLP830 or Wyeast 2124" gibi); 38'inde kodlardan en az biri katalogda. Bugünkü kural (ND2) kodların HEPSİ birbirinin ✅-muadili değilse satırı eşlemiyor. Oysa tarifte "A ya da B" yazmak yazarın iki suşu da kabul ettiği anlamına gelir.
- "📦 Stoğumla oluştur" (örnek önizlemesi) yalnız 156/988 örnekte görünüyor (_bmOrnekMalzemeliMi); bunların 59'u tam.
- MUADIL: 503 ✅ kaydın yalnız 10'unda kaynak alanı var. AI4 kanıt paketi yine de her ✅'yi "MUADIL tablosunda kaynaklı muadil" diye anlatıyor (A4.MUADIL_KOD 'kaynakli_muadil', satır ~33357 / ~34575).
- Claude kör doğrulaması (5 kör alt ajan, üretici / yetiştirici belgeleri ve hakemli çalışma, alıntılı; ölçüt koşudan önce yazıldı): 107 ✅ kayıt (83 seçilmiş + 24 rastgele) → ✅ doğru 32 · ⚠️ olmalı 59 · ❌ yanlış 10 · kaynak bulunamadı 6. Rastgele 24'te bile ✅ 8 (≈%33). Seçilmiş kümedeki 21 maya ✅'sinin hiçbiri "aynı suş" kanıtı taşımıyor. Örnek: Hitit Koyu Kristal EBC 60–80 (≈27 °L) katalogda Crystal 60, Crystal 80 ve CaraMunich II için ✅; Hitit Kristal EBC 7–9 (≈3,5 °L) Crystal 20 ve CaraHell için ✅. Tüm kararlar ve kaynaklar: dis_kaynak/muadil_dogrulama_2026-11-11/kararlar.json (her kayıtta aranan_id → yerine_id, karar, gerekçe, url + ≤15 sözcük alıntı) + OZET.md + TALIMAT.md.

KURALLAR
- git pull ile başla.
- tests/cev_seti_heldout.json ve tests/fixtures/*TAM_heldout_iceriyor* AÇILMAZ.
- AI4, araştırma denetleyicisi ve doğrulayıcı blokları DOKUNULMAZ; üç imza AYNI kalmalı: 2c9ebd9f-32461 · 92f59a3c-5776 · 6d7e6c6e-35582. Set metinleri, imzalar, puanlama değişmez.
- Gerçek Anthropic API çağrısı YOK. Firebase'e OKUMA da YAZMA da yok (ölçüm yalnız fixture ile).
- Kaan'dan kopyala, yapıştır, düzenleme ya da dosya indirme İSTENMEZ.
- Her kod maddesi kendi bayrağıyla (BM_ND6.<ad>); bayrak kapalıyken davranış BİREBİR eski. Madde 3 veri değişikliği: eski tablo bayrak kapalıyken kullanılabilir kalsın (MUADIL_ESKI ya da eşdeğeri), ölçümde ikisi kıyaslansın.
- Uydurma yok: kaynak bulunamayan değer "kaynak yok" diye kalır.

0. ÖLÇÜM ALTYAPISI
- Claude'un ölçümünü tekrar üret: tests/nd6_olcum.mjs (fixture stoğuyla, ağ kapalı): (a) örnek rozetleri ✅/🟡/🔴/❔; (b) "✨ Yeni reçete" iskeletinin stokYetersizTam eksik dağılımı; (c) _bmStokUyarla('isk') tam / alınacak dağılımı + null olan stiller; (d) seçilen ikame derecelerinin dağılımı (aynen/✅/⚠️/≈/bileşik/alınacak).
- Önce/sonra tablosu bu betikten çıkar; rapora sayılar girer, stok içeriği girmez.

1. ANA DÜĞME STOK-ÖNCELİKLİ (BM_ND6.ana)
- Stil satırının ana düğmesi "📦 Stoğumla kur" olur (_bmIskeletStokumla yolu, açık reçete korunur). "✨ Boş iskelet" ikincil, küçük düğme olarak kalır (bugünkü _brYeniIx).
- Satıra iskelet-stok durumu rozeti: "✅ Stoğunla eksiksiz" (tüm satırlar aynen ya da kaynaklı ✅, miktar yetiyor) · "🟨 Muadille eksiksiz — n satır yakın muadil" (⚠️ / özellik / bileşik kullanıldı, alınacak yok) · "🟡 n kalem alınacak" (1–2) · "🔴 n kalem alınacak" (3+) · miktar yetmiyorsa "az var" eki.
- Bugünkü örnek sayımı ikinci satıra iner ve adı açık yazılır: "Yayımlanmış reçeteler (birebir): ✅ n · 🟡 n · 🔴 n · ❔ n".
- "Yalnız yapabileceklerim" süzgeci iskelet-stok durumunu kullanır: 1 = ✅ ya da 🟨; 2 = bunlar + en çok 2 alınacak. Sıralamaya "stoğuma en uygun önce" seçeneği (varsayılan bugünkü yaygınlık sırası).
- Hesap tembel/parçalı (_ndHazirlaTum deseni); stok imzası değişince yenilenir.
- Rozetin dayandığı plan, düğmeye basınca kurulan reçeteyle AYNI olmalı (test: 20 stilde rozet ↔ kurulan reçetenin alınacak sayısı birebir).

2. İSKELET-STOK YOLU 48 STİLDE ÇALIŞMIYOR (BM_ND6.isk)
- _bmStokUyarla('isk', stil, 0) null dönen stillerin listesi + her biri için neden (_bmOrnekMalzemeliMi hangi koşulda düşüyor).
- Düzeltilebilecek olanı düzelt (ör. hop satırı olmayan stil, miktarsız katkı); düzeltilemeyende düğme dürüst metinle: "Bu stilin iskeleti stokla kurulamıyor: <neden>". Uydurma gramaj yok.

3. MUADIL ✅ DİSİPLİNİ (veri; BM_ND6.muadil)
- Kural (Kaan'ın doğrulama kuralı + KAT1 "tahminle ✅ YOK"): ✅ yalnız kaynakla.
  - Malt: iki ürünün de üretici değeriyle aynı sınıf ve renk farkı < 6 °L'de ±1,5 °L, üstünde ±%25.
  - Hop: en az bir yetiştirici/tüccar ikame tablosu + aroma tanımı örtüşmesi.
  - Maya: aynı suş kanıtı (üretici beyanı ya da iki bağımsız güvenilir kaynak; satıcı beyanı tek başına yetmez).
- (a) dis_kaynak/muadil_dogrulama_2026-11-11/kararlar.json içindeki kararları uygula. Eşleme MUADIL[aranan_id] içindeki id === yerine_id kaydıdır. "karar" alanı geçerlidir, "dogrulayici_karari" değil; 7 kayıtta Claude kararı farklı, gerekçesi "claude_notu" alanında. Kurallar: ✅ doğru → ✅ kalır + kaynak alanı (url + alıntı); ⚠️ olmalı → ⚠️; ❌ yanlış → kayıt ❌ olur (fark metninde kısa gerekçe); bulamadım → ⚠️ "(kaynak bulunamadı)".
- (b) Kalan, kaynak alanı OLMAYAN tüm ✅ kayıtlar → ⚠️ "(kaynak bekliyor)". Yeniden ✅ yapmak ayrı, kaynaklı bir sprint işi (bu sprintte değil).
- (c) Doğrulamanın bulduğu veri hataları: CaraHell EBC, Carapils EBC, CaraMunich II ↔ Koyu Kristal "benzer aralık", Torrified Wheat "enzim gerektirmez", Fawcett Dark Crystal II değerleri, iki maya kaydında yer değiştirmiş notlar (MJ M36 ↔ BB İngiliz No04), Kazbek → Saaz gramaj yönü, BB Pamona tanımı. Her düzeltme kaynakla; kaynak listesi dosyada.
- (d) AI4 kanıt paketi metni: 'kaynakli_muadil' etiketi yalnız kaynak alanı olan ✅ için. Bu, AI4 denetleyici bloğunun DIŞINDAYSA düzelt; bloğun İÇİNDEYSE dokunma, raporda "dondurulmuş blokta, Claude kararı bekliyor" yaz.
- Maya köprüsü (stokYetersizMaya, _mayaKod) ve _bmKatCoz ✅ zinciri yeni tabloyu okur → etkisini ölç: kaç örnek / iskelet durum değiştirdi (önce/sonra).
- G seti / mock 55 / kural yolu d30af8de geri oynatmasında değişen madde olursa: liste + neden (veri değişikliği). Testi geçirmek için beklenen değer AYARLANMAZ; Claude karar verir.

4. MAYA "A YA DA B" SATIRI (BM_ND6.maya)
- Birden çok kod taşıyan maya satırında stok kontrolü VEYA anlamında: kodlardan biri katalogda ve stokta (doğrudan ya da kaynaklı ✅ ile) ise satır stokta sayılır; hangi seçenekle karşılandığı satırda yazılır.
- Hiçbiri stokta değilse satır ilk katalog koduna bağlanır (alınacak olarak); hiçbiri katalogda değilse ❔ kalır.
- Kimlik eşlemesi (_bmKatCoz) başka yerlerde değişmez.

5. ❔ AYRI DURUM (BM_ND6.es)
- Örnekte "yok" ya da "az" kalem yoksa ama ❔ kalem varsa rozet "🟡 Neredeyse" DEĞİL, "❔ n kalem tanınmadı — kontrol edilemedi" olur. Süzgeçte ayrı sayılır.

6. EKRAN DİLİ (sade Türkçe, jargon yok)
- Ekranın üstünde iki satırlık açıklama: "📦 Stoğumla kur: stilin temel reçetesini senin stoğundaki malzemelerle kurar; yerine konan her malzeme işaretli." · "Yayımlanmış reçeteler: ödüllü / yayınlanmış bir tarifi birebir yapıp yapamayacağın."
- Kurulan reçetede notlar: her değişen satır "X yerine Y (✅ kaynaklı / ⚠️ yakın, fark: …)".

7. TEST + KAYIT
- Sentetik testler: rozet ↔ kurulan reçete aynılığı; bayrak kapalıyken eski çıktı; maya VEYA kuralı (biri stokta / hiçbiri / hiçbiri katalogda değil); ❔ ayrı durum; ✅ → ⚠️ dönüşümünün ölçüm etkisi.
- npm test 6 dilim (--parca), CEV mock 55, üç imza AYNI, kural yolu d30af8de (değişirse madde 3'teki kural).
- Commit + push, sw.js CACHE_VERSION +1, canlı md5 = yerel, eklenen satırlarda anahtar taraması 0, fixture içeriği diff'te 0.
- BAĞIMSIZ DOĞRULAMA (Kaan kuralı, ZORUNLU): rapordan önce işi GÖRMEMİŞ bir doğrulayıcı alt ajan kendi başına bakar: diff, üç imza, nd6_olcum önce/sonra sayıları (kendisi koşar), 10 rastgele stilde rozet ↔ kurulan reçete, 10 rastgele MUADIL değişikliğinin dosyadaki kararla aynılığı, sızıntı grep'i. Bulgular raporda ayrı bölüm.
- CLAUDE.md'ye 1–3 satır durum; ayrıntı gorevler/SPRINT_GECMISI.md sonuna.

SONRA (bu sprintte DEĞİL): KAT-C eksik hoplar (Hersbrucker, Cluster, Crystal, Mt. Hood, Liberty, Sorachi Ace … — ❔ hopların ana nedeni) · KAT-D eksik mayalar (WLP833, WLP940, WLP810, WY2007 …) · belirsiz malt adları (caramunich / crystal / carafa ii) için rol düzeyi eşleme · kalan ⚠️ "(kaynak bekliyor)" kayıtlarının kaynaklı yeniden ✅ turu.
