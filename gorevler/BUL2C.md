SPRINT BUL2C (BUL2B 35299b7 uzerine, SW v131-484) — kucuk duzeltmeler; BUL GERCEK KOSUSUNUN SONUCU GELDIKTEN SONRA uygulanir. AI'ya giden istemleri DEGISTIRMEZ (kosu sonucu gecerli kalir).

Bu dosyada 4 numarali madde var. Ise baslamadan 4'unu de okudugunu raporun ilk satirinda teyit et.
EFOR: medium
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

NEDEN: Claude BUL2B'yi canli kodda AI'siz denedi (2026-10-14, 34 tarif). Duzelenler dogrulandi: bal / muz / kadifemsi artik marka sayilmiyor ("Bal gibi" buyuk harfle de), Duvel -> 25C, Westmalle'nin koyusu -> 26B Dubbel, Rochefort 10 + hafif -> celiski, Paulaner + bock -> 9A, Chimay mavi -> belirsiz, kis 12 sonuc, fenolik korunuyor, ilk-5 cesitli. Kalan iki hata + bir puanlama kurali:

1. MARKA ∩ ACIK STIL BOS -> 0 SONUC (hata)
- Olculen: "Paulaner gibi bir weizen" -> stil:Weizen / Weissbier + bjcpOrnek belirsiz (4A/4B/5D/6A/9A/27) -> kesisim bos -> uyan 0, "bulunamadi" + gevsetme. BJCP 2021 Paulaner'i Weissbier ornekleri arasinda saymiyor (Paulaner gecen satirlar: 1826 Helles, 1899 Festbier, 2173 Pils, 2247 Marzen, 2679 Doppelbock, 6994 Kellerbier). Kaan'in favori stili Weizen; bu kalip ("X gibi bir weizen") sik kullanilir.
- Kural: kullanicinin ACIK yazdigi stil / aile cipi kazanir. Marka cipinin stilleriyle kesisim bossa marka cipi filtre olmaktan cikar, bilgi notu olur: "BJCP 2021 <marka>'yi <stil> ornekleri arasinda saymiyor (BJCP'de: Helles, Festbier, ...) — arama yalniz <stil> ile". Kesisim varsa bugunku davranis (daraltma) aynen.
- Test: "Paulaner gibi bir weizen" -> Weissbier ornekleri + not; "Westmalle gibi bir tripel" -> 26C (bugunku gibi); "Paulaner gibi bir bock" -> 9A (bugunku gibi).

2. KISA / YER ADI KATALOG KELIMESI (hata, senin raporundaki suphe dogrulandi)
- Olculen: "Ege'de yazin icilecek bir bira" -> malz:hop:tr_ege (sert) -> 0 sonuc.
- Katalogdaki <= 4 harfli ad / alias'lari ve Turkce yer adi / gundelik kelimeyle cakisanlari listele (raporda tablo). Bunlar yalniz malzeme baglaminda cip olur (ornek: yaninda hop / malt / maya / seker / katki kelimesi ya da "-lu/-li/-suz" eki: "Ege hopuyla", "ballı"); yer bildiren ekte ("Ege'de", "Ege'nin", "Ege'den") cip olmaz, kelime anlasilmayan listesine duser.
- Test: "Ege'de yazin icilecek bir bira" -> hop cipi YOK; "Ege hopuyla bir pale ale" -> hop:tr_ege; "ballı bir bira" -> bal (bugunku gibi).

3. KOSU SONUCU PUANLAMASI (kural Claude tarafindan kosudan ONCE yazildi, 2026-10-14; git tarihi kanit)
- B304 / B305 / B306 (mac / mangal / dedemin koyu) yasakKod "." -> AI gecerli bir kod secerse bugun "uydurma" sayiliyor. Tabloda bu ikiye ayrilir ve AYRI satirda raporlanir:
  (i) UYDURMA: enum disi kod, yasakKod'a takilan malzeme / koken kodu, ticari kipte stil disi ozellik.
  (ii) KAYNAKSIZ BAGLAM YORUMU: beklenen "anlayamadim" iken AI gecerli bir cip secti (ornek mac -> guc:hafif). Kaan'in kanit-once ilkesine gore istenmeyen davranis, ama uydurma degil.
- Model tablosu: model · cip isabeti · ilk-5 · (i) uydurma · (ii) kaynaksiz yorum · AI tahmini sayisi · cagri basi gercek maliyet · %95 ust sinirlar. n kucuk (15 istem/model): fark guven araliginda ortusuyorsa acikca yaz. Karar Kaan'da; CC oneri yazar, karar vermez.
- Ham sayilar (kosucunun kendi uydurma sayisi) de ayni tabloda kalir; bu kural yalniz ayrimi ekler, sonucu sonradan degistirmez.

4. DOGRULAMA + AKIS
- npm test yesil + madde 1-2 case'leri, en az 2 kasitli bozma kirmizi.
- ZORUNLU: AI'ya giden istem listesi ve her istemin AI'ya giden metni/kod listesi bu degisiklikten once ve sonra AYNI (test). Degisirse dur ve raporla — kosu sonucunun gecerliligi buna bagli.
- Tum set AI'siz, gercek kosunun AI kodlari aynen: beklenen ilk-5 orani dusmemeli.
- Canli curl, SW bump, APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. Her asamada TAM yedek. Anahtar taramasi 0.

RAPOR: madde 1-2 once/sonra, kisa katalog adi tablosu, AI istem listesi esitlik kaniti, model tablosu (madde 3 bicimi), SUPHE (zorunlu).
