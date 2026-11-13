SPRINT ND8 — Her kalemin muadil yolu: kaynaklı MUADIL kapsamı (gerçek API çağrısı YOK)

Claude, 2026-11-11. Kaan: "bütün hepsini program tanıyıp ayrıca muadillerle eşleştirmeli". ND7'den SONRA verilir: ND7 her satırı bir kimliğe (ürün ya da sınıf) bağlar, ND8 her kimliğin muadil yolunu kurar.
Bu dosyada 6 madde var (0–5). İşe başlamadan 6'sını da okuduğunu raporun ilk satırında teyit et.
EFOR: high. MODEL: model-bağımsız; modelini ilk satırda belirt. Kaynak araştırması çok; paralel alt ajan kullan (her biri ayrı parti, aynı ölçüt).

## DURUM (Claude ölçtü, 2026-11-11; ND6 + ND7 sonrası değerleri sen yeniden ölç)

- MUADIL tablosunda kaydı olan katalog kalemi:
  - malt: 182 / 187
  - hop: 77 / 77
  - maya: 129 / 132
- Katkılar ölçülmedi. "diğer" grupta ✅ 40, ⚠️ 157, ❌ 7 kayıt var.
- ✅ kayıtların kaynak durumu:
  - 503 ✅ kaydın yalnız 10'unda kaynak alanı var.
  - Kör doğrulamada 107 kayıttan 32'si ✅ çıktı (dis_kaynak/muadil_dogrulama_2026-11-11/).
  - ND6 kaynaksız ✅'leri ⚠️ "(kaynak bekliyor)" yapıyor. Sonuç: ND6'dan sonra kaynaklı ✅ sayısı çok az.
- Yeni kalemler: ND7 kataloğa yeni ürünler ve SINIF kalemleri ekliyor. Bunların muadil kaydı yok.
- İkame motoru (_bmIkameAday) her kalem için stokta derecelendirilmiş aday arıyor:
  - aynen > ✅ > ⚠️ > ≈ özellik benzerliği > bileşik
  - ≈ ve bileşik adaylar tablodan değil hesaptan gelir.
  - Tabloda kaynaklı ✅ / ⚠️ yoksa motor ya ≈ adayla kalır ya da "alınacak" der.

## KURALLAR

- ND6'nın KURALLAR bölümü aynen geçerli:
  - heldout açılmaz;
  - üç imza AYNI;
  - gerçek API yok;
  - Firebase yok;
  - Kaan'dan iş istenmez;
  - bayrak kapalıyken eski davranış.
- ✅ ölçütü dis_kaynak/muadil_dogrulama_2026-11-11/TALIMAT.md ile BİREBİR aynı. Ölçüt değiştirilmez, gevşetilmez. Özeti:
  - Malt: iki ürünün üretici değeriyle aynı sınıf. Renk 6 °L altında ±1,5 °L, üstünde ±%25.
  - Hop: en az bir yetiştirici ya da tüccar ikame tablosu + aroma örtüşmesi.
  - Maya: aynı suş kanıtı (üretici beyanı ya da iki bağımsız güvenilir kaynak; satıcı beyanı tek başına değil).
- Her ✅ ve ⚠️ kaydın kaynak alanı dolu olur: url + ≤15 sözcük birebir alıntı + karşılaştırılan sayılar.
  - ⚠️ kaydın fark metni sayıyla yazılır, örnek: "renk 27 °L ↔ 60 °L, yarı renk; aynı rengi tutmak için ≈2,2 kat koy".
  - "Benzer", "yakın" gibi sayısız ifade yazılmaz.
- Kaynak bulunamazsa:
  - kayıt yazılmaz;
  - kalem için "kaynaklı muadil bulunamadı" notu düşülür;
  - motor ≈ aday ile devam eder.
  - Tahminle ✅ YOK. Tahminle ⚠️ de YOK.
- Muadil gerçekten yoksa (ör. Brett, belirli bir is/duman maltı, sıra dışı katkı) kalem "muadili yok — alınmalı" diye işaretlenir. Bu da bir eşleme sonucudur.
- Repo PUBLIC: yalnız ürün verisi ve ≤15 sözcük alıntı; telifli metin kopyalanmaz.

## MADDELER

### 0. ÖLÇÜM (tests/nd8_kapsam.mjs)

- Her katalog kalemi için ayrı ayrı (malt / hop / maya / katkı / sınıf):
  - kaynaklı ✅ sayısı;
  - kaynaklı ⚠️ sayısı;
  - "muadili yok" işareti;
  - hiçbir yolu olmayan kalem.
- Örnek verisi düzeyinde:
  - 988 örneğin satırlarında, stokta karşılığı aranan kalemlerin yüzde kaçının kaynaklı muadil yolu var.
  - Kaan fixture stoğuyla "Stoğumla oluştur" sonuçları:
    - tam;
    - ⚠️ ile tam;
    - ≈ ile tam;
    - alınacak dağılımı.
- Önce/sonra tablosu raporda.

### 1. KAYNAK BEKLEYEN KAYITLARIN YENİDEN DOĞRULANMASI

- ND6'nın ⚠️ "(kaynak bekliyor)" yaptığı her kayıt, ölçütle yeniden denetlenir.
- Kaynak tutarsa kayıt kaynaklı ✅ ya da kaynaklı ⚠️ olur, aksi hâlde kaldırılır.
- Kaldırılanlar raporda listelenir.
- Sıra: önce örnek verisinde ve iskeletlerde en sık geçen kalemler.

### 2. KAPSAM — HER KALEMİN EN AZ BİR YOLU

- Hedef: her katalog kalemi için şunlardan biri.
  - En az bir kaynaklı ✅ ya da ⚠️ kayıt.
  - Ya da gerekçeli "muadili yok" işareti.
- Bu hedef ND7'nin yeni ürünleri ve SINIF kalemleri için de geçerli.
- Sınıf kaleminin muadil yolu üyelik kuralıdır: stoktaki o sınıftan herhangi bir kalem karşılar. Ek tablo kaydı gerekmez, yalnız üyelik listesinin doğruluğu denetlenir.
- Yerel ürünlere öncelik: katalogdaki Türkiye'de satılan kalemlerle (Hitit, Thracian, Viking, BestMalz, BiraBurada kayıtları vb.) iki yönlü yol önce kurulur. Kaan'ın stoğu bunlardan oluşuyor.
- BiraBurada mayaları için kimlik yalnız satıcı beyanına dayanıyorsa kayıt ⚠️ olur, fark metnine "satıcı beyanı" yazılır. Doğrulamada BB-34, BB-22 No1/No2 ve BB Philly Sour ürün sayfaları bulunamamıştı. Bulunamayan ürün yine öyle işaretlenir.

### 3. MAYA ÖZEL

- Maya ✅ yalnız aynı suşa verilir.
- Aynı stil için kullanılan ama farklı olan suşlar ⚠️ olur. Fark metninde sayısal karşılaştırma bulunur:
  - zayıflama;
  - sıcaklık;
  - fenol (POF+/−);
  - flokülasyon.
- Hakemli genetik çalışmalar geçerli kaynaktır. Örnek: J. ASBC 2022 parmak izi çalışması.
  - Bu çalışmada WLP001, OYL-004, WY1056 ve IY-A07'nin parmak izleri 15 dizi etiketini ortak taşıyor ("Chico" grubu).
  - Aynı çalışmada US-05'in deseni bu gruptan farklı çıkmış.
  - Kararı kendin, çalışmanın tam metninden ver.
- Maya köprüsünün (stokYetersizMaya / _mayaKod) yalnız kaynaklı ✅ zinciri kullandığını test et.

### 4. EKRAN

- "Stoğumla oluştur" ve satır değiştirme listesinde her aday şunları gösterir:
  - derece;
  - sayısal fark;
  - 🔗 kaynak (_bmKaynakHTML).
- "Muadili yok" kalemde metin: "Bunun yerine geçen bir ürün bulunamadı — alınması gerekir".

### 5. TEST + KAYIT

- Sentetik testler:
  - kaynaksız kayıt ✅ olamaz;
  - ✅ kayıtta kaynak alanı boş olamaz (veri testi, tüm tablo);
  - sınıf üyeliği;
  - maya köprüsü yalnız ✅ zinciri;
  - bayrak kapalı → eski.
- npm test 6 dilim (--parca), CEV mock 55, üç imza AYNI, kural yolu d30af8de.
  - Bunlardan biri değişirse liste + neden yazılır.
  - Beklenen değer AYARLANMAZ; Claude karar verir.
- Commit ve yayın kuralları:
  - commit + push;
  - sw.js CACHE_VERSION +1;
  - canlı md5 = yerel;
  - eklenen satırlarda anahtar taraması 0;
  - fixture içeriği diff'te 0.
- BAĞIMSIZ DOĞRULAMA (Kaan kuralı, ZORUNLU): rapordan önce işi GÖRMEMİŞ bir doğrulayıcı alt ajan kendi başına şunlara bakar.
  - Rastgele 40 yeni ya da değişen kayıt: url açılıyor mu, alıntı sayfada birebir geçiyor mu, sayılar ölçütü sağlıyor mu.
  - Rastgele 10 "muadili yok" kararı: gerçekten kaynak yok mu.
  - nd8_kapsam önce/sonra (kendisi koşar).
  - Sızıntı grep'i.
  - Bulgular raporda ayrı bölüm.
- CLAUDE.md'ye 1–3 satır, ayrıntı gorevler/SPRINT_GECMISI.md sonuna.
- SONRA: Claude, ND6'daki gibi kör alt ajanlarla rastgele 50 kaydı yeniden doğrular. ✅ isabeti %90'ın altındaysa tur tekrarlanır.

## ND7K SONRASI EK (Claude, 2026-11-13) — yukarıdakilerle çelişirse BU bölüm geçerli

1. DURUM yeniden ölçülür: ND7K kataloğa 76 kaynaklı ürün ekledi (hop 30 · maya 27 · malt 19; tests/nd7k_urun.json). Bunların muadil kaydı yok; madde 2'nin kapsam hedefi bunlar için de geçerli. Önce/sonra tablosu v131-546'ya göre.
2. Bayrak: yeni davranış BM_ND8 içinde (kapalıyken MUADIL ve ikame motoru v131-546 ile birebir). Dondurulmuş AI geri oynatmaları (ND6_ONCESI / ND7K_ONCESI listelerindekiler: AI2-TUZAK, AI4-ONKONTROL, AI5B-YON, DOG4-K4, DOG4D–H-COZUM, BUL2C-ISTEK) BM_ND8 KAPALI koşar; yeni davranışı ayrı vaka sınar. Canlı AI yolları yeni tabloyu kullanır (kaynaklı muadil istenen davranış); AI4 kanıt paketi ve A1 kalem bulucu farkını ND7K Ö6 ölçümüyle aynı yöntemle ölç ve raporla (beklenti: yalnız MUADIL'e dayanan satırlar değişir).
3. Çalışma yolu (ND7K'daki gibi): dal nd8-calisma; main'e DOKUNMA, yayın yok. Yerelde yalnız ND8 vakaları + doğrudan etkilenen gruplar (ND3, ND6, UYG, ISK) --case ile, her koşudan önce boş bellek ≥ 2 GB. Tam paketi Claude bulutta koşar; "main'e al" dedikten sonra yayın + canlı md5 + asıl doğrulayıcı. Madde 5'teki "npm test 6 dilim" yerelde KOŞULMAZ.
4. Kaynak araştırması: 429 / 403 dönen sitelerde ısrar yok — kayıt "sırada" listesine, raporda ayrı. Alıntı ≤ 15 sözcük; httpbin vb. üçüncü taraf ağ isteği yok.
5. Doğrulayıcı raporu CLAUDE.md "Çalışma disiplini"ndeki iki bölümlü biçimde (Talimat / Kural).
6. Kör doğrulamadan bilinenler: dis_kaynak/muadil_dogrulama_2026-11-11/kararlar.json'daki 107 karar ND6'da uygulandı; o kararlar yeniden tartışılmaz, yalnız kaynak alanı eksikse tamamlanır.
