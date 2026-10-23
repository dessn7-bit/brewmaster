SPRINT CEV1B (CEV1 5198ed9 uzerine, SW v131-514) — YON HATASI + ARASTIRMA ALANI + TARAFSIZLASTIRMA. GERCEK AI KOSUSU YOK. Kaan'a "CEV seti" ve "Malzeme asistani dogrulama turu" dugmelerine HENUZ BASMAMASI soylendi.

Bu dosyada 7 numarali madde var (1-7). Ise baslamadan 7'sini de okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

CLAUDE DOGRULAMASI (CEV1, canli kod, 2026-10-23): md5 canli = yerel (3296f81b…), imza 2c9ebd9f-32461, anahtar 0, bm-cache-v131-514. Maya sicakliklari ureticiyle ayni (WY3068 18–24 Wyeast "64-75°F (18-24°C)", US-05 / S-04 / WB-06 18–26 Fermentis "ideally 18-26°C", W-34/70 12–18, HA-18 25–35 + atu 98–102, WY3787 18–26, WLP300 20–22, Lallemand Munich 17–25); BiraBurada / mj_m21 / lc_rye kaynak yok -> "paketine bak". Kart bicimi (Anladigim · dogrudan cevap · madde + kanit · Senin recetende) KABUL. tests/cev_seti.json beklenen listeleri Claude YAZDI ve imzaladi (beklenenImza 36708181; 34 soru, 116 etken: guclu 104 / olasi 3 / celiski 9; 286 alinti ham sayfa ya da WebFetch ile kelimesi kelimesine dogrulandi; puanlama EK'i eklendi). CC bu dosyayi DEGISTIREMEZ; kosKilit artik null.

HELD-OUT (Claude, AI5 kutusu, canli kod, 43 dogal istek):
  YANLIS YON (kendinden emin, en tehlikeli sinif) 10/22:
    "acılık çok sert" · "acılık hoşuma gitmedi" · "acılık biraz azalsın" · "acı az olsun" · "acı azalsın" · "acılık daha yumuşak olsun" -> hedef 'aci' -> "Acı hopu ARTIR — IBU 28 → 35"
    "rengi biraz koyu kaçtı" · "renk koyu geldi" -> 'koyu' -> "Crystal 60 artır — SRM 10,0 → 12,9"
    "kuru bitti, tatlı olsun" -> 'kuru' (daha kuru) · "daha az gövdeli" -> 'govde' (daha gövdeli)
  Kok neden: G.ESLEME satirlarinda YON'SUZ ciplak sozcuk ('aci', 'acilik', 'koyu', 'kuru', 'govdeli') ilk eslesen hedefi seciyor; "az / azalsın / yumuşak / kaçtı / geldi / fazla" okunmuyor.
  DOGRU olanlar (degismemeli): "acılığı yumuşat" -> azaci · "biraz daha acı olsun" -> aci · "biram çok kuru oldu" -> govde · "gövdesi çok ağır" / "çok gövdeli oldu" -> kuru · "biram çok tatlı kaldı, neden" -> kuru · C09/C10/C11/C21/C32.
  TUTARSIZ: "mash'i 72 derecede yaparsam daha gövdeli olur değil mi" (C34) -> govde, ama "mash 72 derece olursa gövde artar değil mi" -> AI hedef -> yok -> tanıyamadım.
  TARAFSIZLASTIRMA: "laktoz eklesem köpük artar, haklıyım değil mi" -> konu "laktoz eklesem köpük artar, haklıyım" (iddia + 'haklıyım' kaliyor) · "sert su kullanırsam bira daha güzel olur mu" -> "sert su kullanırsam bira mu" (bozuk).
  ARASTIRMA ALANI: C.ALAN_TUR howtobrew.com'u 'ders' sayiyor ama WEB.arastirma listesinde YOK -> arastirma modu Palmer'i hic bulamaz (beklenen listelerinde Palmer en sik kaynak).
  KOZMETIK: "Kaynaklara göre 3 yol var (2'i güçlü kanıtlı)" (dogrusu 2'si); C01 "Weizen'imde muz aroması daha fazla olsun" -> Anladigim satirinda "('aroması' kısmı bu araçta hesaplanmıyor — tat ve aroma ölçülemiyor.)" (istek tam da muz aromasi — celiskili); tanıyamadım metni "malzeme / maya sorusu sorabilirsin" diyor ama altinda arastirma dugmesi var.

1. YON (G.hedefEsle — en onemli madde)
- Eksen sozcugu (acı/acılık · renk/koyu/açık · kuru/gövde/tatlı/dolgun) + YON birlikte okunur; tek kaynak bir yon tablosu (G.aromaYon gibi): artir (daha X, X artsın/artır, biraz daha X, X olsun, X az [=yetersiz: "acılık az", "tatlılık az"]) · azalt (daha az X, X az olsun, X azalsın/azalt/düşür, X yumuşak/yumuşasın/yumuşat, X fazla/çok X/X çok, X kaçtı, X geldi, X oldu [şikayet], X sert/keskin/kalıcı [-> acılık algısı konusu, arastirma]).
- Yon OKUNAMAZSA ya da iki ters yon varsa -> belirsiz: iki cip ("daha az acı" / "daha acı") — ASLA varsayilan 'artir'. "hoşuma gitmedi / beğenmedim" tek basina yon DEGIL -> belirsiz.
- "daha az gövdeli" -> kuru; "kuru bitti, tatlı olsun" -> govde; "rengi koyu kaçtı / koyu geldi" -> acik; "acı az olsun / acı azalsın / acılık daha yumuşak olsun" -> azaci.
- C34 ile ayni anlam: "mash 72 derece olursa gövde artar değil mi" -> govde (ayni kart).
- Test: yukaridaki 22 + 3 ek (eksen x yon bicimi tablosundan URETILMIS set, dairesel olmasin: tablo eksen sozcugu + bicim + beklenen; CC'nin sozlugunden uretme) — YANLIS YON 0; dogru kalanlar aynen. Kasitli bozma: yon tablosu kapali -> kirmizi.
- DEGISMEMESI GEREKEN: G seti 30 istem (4615b7b9/3414), CEV setinde C09/C10/C11/C21/C32/C34 hedefi, tuzak 93 / DOG4B–H parmak izleri BIREBIR.

2. TARAFSIZLASTIRMA (C.tarafsiz)
- Konu sozlukte eslestiyse (G.konuEsle) ozetleyici + sorgu ureteci konusu = KONU ETIKETI + soruda gecen katalog malzemesi / sayi (ör. "köpük — sorulan: laktoz", "DMS — sorulan: kaynatmada kapak"), kullanicinin iddia fiili ("artar", "daha iyi olur", "haklıyım") GITMEZ.
- Eslesmezse mevcut yol + "haklıyım / haklı değil miyim / değil mi / öyle mi" ve "daha güzel olur mu"nun KALAN eki ('mu') temizlenir; bos kalirsa "soru konusu belirsiz".
- Test: C13, C20, C34 + yukaridaki 2 + 8 yeni yonlendirmeli soru (Claude listesi: "sülfat eklersem acılık daha iyi olur değil mi", "jelatin kesin işe yarar değil mi", "kapağı kapalı kaynatsam sorun olmaz değil mi", "laktoz köpüğü artırır bence", "herkes diasetil dinlenmesi şart diyor", "sıcak mayalanma fusel yapmaz değil mi", "karton tadı oksijenden değil bence", "mash'i 72'de yaparsam kesin gövdeli olur") -> konu metninde iddia fiili 0, yonlendirme sozcugu 0.

3. ARASTIRMA ALANI (Claude karari, olcumle)
- Olcum (Claude, beklenen listelerinden): 104 guclu etkenin yalniz 59'u mevcut WEB.arastirma listesinde >= 2 farkli kurumla bulunabilir. howtobrew.com eklenince 94, + brewingwithbriess.com 96, + mdpi.com + mbaa.com + asbcnet.org 100 / 104. ONEMLI: Briess'in gercek alan adi brewingwithbriess.com (listedeki briess.com Briess'in teknik sayfalarini ESLEMEZ).
- WEB.arastirma'ya EKLE: howtobrew.com, brewingwithbriess.com, mdpi.com, mbaa.com, asbcnet.org. C.ALAN_TUR: howtobrew.com ders (zaten), brewingwithbriess.com uretici, mdpi.com hakemli, mbaa.com hakemli (Technical Quarterly), asbcnet.org hakemli. Liste TEK kaynak kalir. AI4 web listesi (WEB.domainler, donmus bolgede kullaniliyorsa) DEGISMEZ — yalniz arastirma listesi; briess.com satiri silinmez (zarari yok).
- Not: howtobrew.com'un TLS sertifikasi suresi dolmus (curl reddediyor); web arama araci bunu nasil karsilar BILINMIYOR — gercek kosuda ilk soruda gorulur, raporda yaz.
- HATA (Claude, kodda goruldu): C.gucHesap kurumu C.host (tam alt alan adi) ile sayiyor -> admin.lallemandbrewing.com + lallemandbrewing.com ya da blog.whitelabs.com + whitelabs.com TEK kurumken 2 sayilir, madde 'guclu' etiketlenir (puanlama iii hatasi). Duzelt: kurum = C.ALAN_TUR'daki eslesen kok alan (C.kaynakTur ile ayni eslesme), eslesmeyen host kendisi. Test: bu iki cift + dev.bjcp.org/bjcp.org -> n 1 (olasi); lallemandbrewing.com + wyeastlab.com -> n 2.

4. KOZMETIK
- "N'i güçlü" -> Turkce ek dogru ("1'i, 2'si, 3'ü, 4'ü, 5'i").
- Muz/karanfil hedefi okunduysa "aroması" sozcugu "hesaplanmıyor" notuna GIRMEZ (G.asilSozler kalan listesi).
- tanıyamadım / kapsamDisi metni arastirma dugmesi varken "Kaynaklarda araştırabilirim" der; dugme yoksa (anahtar yok) eski metin.

5. KONU SOZLUGU (kucuk ek)
- G.KONULAR'a: kağıt/karton tadı -> oksidasyon (karton zaten var; "kağıt" ekle), lahana -> DMS/sulfur (ikisi de sozlukte; hangisi oldugunu SORMA, konu "DMS ya da sülfür"), ilaç/plastik/klor kokusu -> klorofenol (yeni etiket), "metal gibi" -> metalik, sirke -> ekşilik, fışkır/taşıyor/şişe patladı -> aşırı karbonasyon (yeni etiket). Yalniz etiket + arastirma dugmesi; kural tablosuna ekleme YOK.

6. KURAL YOLU KAPSAMI (yeni beklenen listeleriyle olculdu, mock, AI yok)
- Kural yolundaki 12 soruda kapsama 18/32 = %56 (tum set kapisi %80). Kacanlar: C01/C02/C06 OG (og_ester kurali AI5D'de var ama kartta cikmiyor — NEDEN olc), C03/C04 maya turu (POF+ / POF-negatif), C09/C10 bugday-yulaf, C10 klorur, C11 seker + yuksek attenuasyonlu maya + saglikli mayalanma, C21 kaynama suresi / hopu sonraya kaydir, C32 koyu candi, C34 72 °C sorusunun kendisi + Dubbel stil notu.
- Cozum CEVAP ILKESI'ne gore: kural kartinda hesaplanabilen adaylarin YANINDA, hesaplanamayan ama >= 2 bagimsiz kaynakli etkenler "yon" maddesi olarak (aday degil, onizleme yok; G.KURALLAR'a kaynakli satir; guc G.kuralGuc ile). Kaynak olarak tests/cev_seti.json'daki dogrulanmis alintilari kullanabilirsin (url + alinti aynen); kendi buldugun yeni kaynak ayni kurala uyar (>= 2 farkli kurum, alinti kelimesi kelimesine).
- Yeni malzeme kurali degismez: "seker ekle" gibi maddeler ADAY degil yon cumlesidir ("recetende seker yok; kaynaklara gore …").
- C34: kart once sorunun kendisine cevap verir ("72 °C: …") — ayni yuksek mash kartini gostermek yetmez.
- Kural kartinin altinda '🔎 Kaynaklarda arastir' dugmesi de olsun (kural tablosu konuyu kapsasa bile, arastirma ek madde getirebilir; kendiliginden AI yok).
- Olcum: CEV mock'ta kural yolu kapsamasi C.puan ile (anahtarlar Claude'un; DEGISTIRME). Hedef kural yolu >= %80; once/sonra soru basi tablo. Uydurma kontrolu: eklenen her yon maddesi kaynaginin alintisinda yaziyor mu (test).
- G seti 30 istem parmak izi DEGISIRSE her degisen satir + gerekce raporlanir (G kapisi 7/393 sonucu o metinlerle olculdu; degisen metin icin yeni olcum gerekecegini yaz).

7. DOGRULAMA + AKIS
- npm test TAM yesil. Imza 2c9ebd9f-32461 AYNI. Puanlama metinleri DEGISMEZ. AI4 plan (≈ 6,38 $ / tavan 13,08 $) degismez.
- tests/cev_seti.json'a DOKUNMA (beklenen + imza + puanlama EK'i Claude'un; kilit null kalmali). CEV mock tam tur yeniden: yol (kural / arastirma) dagilimi raporla; once/sonra degisen soru + gerekce.
- Canli curl, SW bump (v131-515), APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. TAM yedek. Anahtar 0. Gercek AI cagrisi YOK.

RAPOR: kural yolu kapsamasi once/sonra (soru basi), 22 yon istegi once/sonra, uretilmis set YANLIS YON sayisi, tarafsiz konu once/sonra (13 soru), madde 3 alan sayimi, parmak izleri, kasitli bozmalar, imza, SUPHE (zorunlu).
