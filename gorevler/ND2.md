SPRINT ND2 (897ddb2 uzerine) — Ne Demleyebilirim'i kullanilir hale getir: malt esleme, ornegin kendi malzemeleriyle recete, muadil disiplini

Bu dosyada 5 numarali madde var. Ise baslamadan 5'ini de okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

SORUN (ND1 raporundan): 991 ornekten yalniz 1'i ✅. Neden stok degil, esleme: K1-K3 malt satirlarinin yalniz %30-33'u kataloga eslendi. Ayrica ✅ gorunen ornekten "Yeni recete olustur" ornegin malzemelerini degil stil iskeletini kuruyor — ekran "bunu yapabilirsin" deyip baska bir recete veriyor. Ve muadil durumu "Maris Otter -> muadili stokta: Munich" gibi zayif esdegerleri de sayiyor.

1. MALT ESLEME ORANI
- ND1'in kuru donusumunde eslenemeyen malt satirlarini (K1-K3, benzersiz ad, frekansa gore sirali) cikar. En sik olanlardan baslayarak BV alias kuraliyla ("ayni urunun baska adi", ikame DEGIL) katalog kaydina bagla: dergi yazimlari ("2-row pale malt", "Crystal 40L", "Maris Otter pale malt", "flaked oats", "chocolate malt (350 °L)" vb.). Renk/°L bilgisi varsa katalogun r degeriyle tutarli olmali (crystal 40 -> 40°L kaydi; uymuyorsa baglama).
- Katalogda gercekten olmayan urun (urun yoksa) alias'la baska urune BAGLANMAZ; listele.
- Hedef: K1-K3 malt satiri esleme %80+. Ulasilamazsa nedenini olcumle yaz.
- Ayni calismayi maya satirlari icin yap (K1 %46, K3 %36): lab kodu (WLP001, Wyeast 1056, US-05...) -> katalog; ayni suşun farkli marka kodu esdegerligi YALNIZ maya koprusunun mevcut ✅ kuraliyla.
- BV kurallari aynen: her alias korpusta ya da ornek verisinde gercekten geciyor olmali; uydurma alias yok.

2. ORNEGIN KENDI MALZEMELERIYLE RECETE
- Onizlemeye ikinci olusturma eylemi: "✨ Bu ornegin malzemeleriyle olustur". YALNIZ su kosulda gorunur: tum malt/hop/maya kalemleri eslendi VE malt ve hop miktarlari kaynakta biliniyor (K1 AHA hop gramaji olmadigi icin bu orneklerde gorunmez).
- Recete ornegin kendi kalemleriyle kurulur, Kaan'in hacim/verimine olceklenir (ND1'in olcekleme kurali). Not alanina kaynak + kademe + "malzemeler ornekten, miktarlar senin hacmine olceklendi" yazilir. Eslenemeyen katki/ek kalemleri notta kalir.
- Mevcut "✨ Yeni recete olustur" (stil iskeletinden) kalir ama etiketi netlesir: "Stil iskeletinden olustur". Iki dugmenin ne yaptigi tek satirla yazili olsun.
- Uydurma gramaj YOK: miktari bilinmeyen kalem varsa bu yol hic acilmaz.

3. MUADIL DISIPLINI
- Stok analizinde "🔁 muadili stokta" yalniz MUADIL tablosunda fark alani ✅ ile baslayan esdegerler icin gecerli (Sprint 7 maya koprusuyle ayni kural). ⚠️ ve ❌ olanlar stok karsiligi SAYILMAZ; onizlemede bilgi olarak "yakin alternatif: X (⚠️)" diye gosterilebilir ama durumu iyilestirmez.
- Ayni kural malzeme aramasindaki "muadili Y kullanan N ornek" satirina da uygulanir.

4. CANLI STOKLA OLCUM
- Raporda kullanilacak stok: Firebase'deki guncel stok, SALT OKUMA (yazma yok). Okunamazsa en yeni yerel yedek, tarihi belirtilerek.
- Once/sonra: ✅/🟡/🔴 dagilimi, ✅ ilk 10, "bu ornegin malzemeleriyle olustur" acik olan ornek sayisi, Coffee Stout ornekleri.
- 🟡 icindeki neden dagilimi (1-2 kalem yok / miktar bilinmiyor / eslenemedi).

5. DOGRULAMA
- npm test yesil + yeni case'ler: alias'la eslenen dergi yazimlari (en az 10 gercek ornek), renk uyusmazliginda baglanmama, ornekten-malzemeyle olusturma (kalemler + olcekleme + not), miktar bilinmeyen ornekte dugmenin gorunmemesi, ⚠️ muadilin durumu iyilestirmemesi. En az 2 case kasitli bozmayla kirmizi.
- ND1 case'leri yesil kalir (KURU dahil: stok analizi hicbir yere yazmaz; yalniz "olustur" dugmeleri yazar).
- 390 ekran goruntusu: ✅ bir ornegin onizlemesi + "bu ornegin malzemeleriyle olustur" ile kurulan recetenin Malt sekmesi.
- ornek_veri.js degisirse CC5 builder yolu (elle ?v yazma yok). Canli curl, SW bump, APP_VERSION 'v2.79.10' SABIT, worker'a dokunma.

RAPOR: esleme orani once/sonra (malt/hop/maya/ek, kademe bazinda), katalogda olmayan sik urunler listesi, canli stokla dagilim once/sonra, SUPHE (zorunlu).
