SPRINT MASH1 (KUC1 95b5594 uzerine, SW v131-492) — MASH ASISTANI, birinci yari: AI'SIZ cekirdek (sapma hesaplari, olcum kaydi, hatirlatici, ses). Gercek AI kosusu YOK, para harcanmaz. AI soru-cevap + kanitli yorum MASH2'de (bu sprint bitip Claude dogrulayinca yazilir).

Bu dosyada 8 numarali madde var. Ise baslamadan 8'ini de okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

KAAN ISTEGI (2026-10-14, secimleri): mash sirasinda asistan (1) sapma duzeltme, (2) soru sor-cevapla, (3) olcum kaydi, (4) hatirlatici; ses: KONUSARAK sorabilsin + cevap sesli okunsun. Ek (Kaan): "yorum yapabilir, dogru oldugu surece — kanitli yorum, uydurma degil; baska yerlere de koyabiliriz" -> MASH2 + sonraki is.
ILKE (degismez): sayilari ve hukmu UYGULAMA uretir, kaynakli kural tablosuyla; AI yalniz anlatir (MASH2). Kaynak bulunamayan hesap yapilmaz, "bulamadim" yazilir. Tat hukmu yok.

0. KESIF (once, kod yazmadan; raporun basinda tablo)
- Mevcut Brewday modu (brewdayBaslat / brewdayRender / timeline / timer / brewdayAjandaUret) ne yapiyor, mash adimlari nereden geliyor (mashAdimlar), hangi adimlar var.
- Partide zaten olan olcum alanlari: preboilOG, spargeL, mashPh, mashPhSic, brewLog (icerigi?), OG/FG manuel. Mash SICAKLIK olcumu kaydedilen bir alan var mi?
- Ekipman profili: Bulldog (all-in-one, isitici) — hacim, kaynama kaybi L/sa, olu hacim, isitma hizi alani var mi.
- Mevcut mash pH motoru (_suMashPHHTML, maltPH/maltBuf) ve su tuzlari: duzeltme (asit / baz miktari) HESAPLIYOR mu, yoksa yalniz tahmin mi.
- Kaan uygulamayi APK mi, Chrome PWA mi kullaniyor (APK paketleme turu: TWA mi WebView mi)? SpeechRecognition / speechSynthesis bu ortamda var mi (Android WebView'de SpeechRecognition YOK — kontrol et). Repoda paketleme dosyasi yoksa raporda "bilinmiyor" yaz.
- Yeni alan ancak mevcut olan yetmezse; mevcut alani YENIDEN KULLAN.

1. MASH SICAKLIGI SAPMASI (hesap, kaynakli)
- Olcum girilir (adim + sicaklik). Hedef = aktif mash adimi. Fark |Δ| ≤ 1 °C -> "hedefte" (esik UYGULAMA VARSAYIMI, kartta yazar).
- Dusuk: ekipman isiticiliysa (Bulldog) "isiticiyla hedefe getir" + varsa isitma hizindan tahmini dakika (yoksa dakika YAZMA). Isiticisiz/izolasyonlu kapta: sicak su ilavesi Palmer denklemiyle.
- Yuksek: soguk su ilavesi (ayni denklem, Tw = su sicakligi) + "karistir / kapak ac" (sayi yok, yalniz yon).
- DENKLEM (Claude okudu 2026-10-14, howtobrew.com/section-3/chapter-16, Palmer): Wm = G × (0,4 + R) × (T2 − T1) / (Tw − T2); Wv = Wm / ρ, ρ = 0,985 kg/L (sicak su); R = su/tane agirlik orani (kg/kg), G kg tane; "These equations also work for liters, kilograms and degrees Celsius"; 0,4 = tanenin isi kapasitesi suyun ~%40'i. Sayfayi kendin de oku, sogutma (soguk su) icin ayni denklemin gecerliligini kaynakla teyit et; bulamazsan sogutma hesabini "denklem isitma icin yazilmis, sogutmada yaklasik" etiketiyle ver.
- Su ilavesi hacmi degistirir: yeni R, on kaynatma hacmi ve tahmini OG etkisi (uygulamanin mevcut hesabiyla) kartta "bunu yaparsan" onizlemesi.
- Test: Palmer sayfasindaki ornek varsa birebir; yoksa elle hesapli 3 vaka (64->66, 70->66 soguk 15 °C, Bulldog dusuk -> yalniz isitici).

2. ON KAYNATMA GRAVITESI / HACMI SAPMASI (hesap, kaynakli)
- Girdi: olculen preboilOG (+ sicaklik duzeltmesi; uygulamada hidrometre sicaklik duzeltmesi varsa onu kullan) ve hacim. Beklenen: recetenin verimiyle hesaplanan on kaynatma OG/hacim.
- Gravite puani × hacim korunur (GP×V sabit) — kaynakla yaz (Palmer ya da esdegeri; okudugun sayfa + tarih).
  - Dusuk: (a) kaynamayi uzat: hedef hacim = GP×V / GP_hedef, ek dakika = ΔV / kaynama kaybi (ekipman profilinde yoksa dakika YAZMA), (b) STOKTA olan seker/DME ile tamamla: kg = (GP_hedef − GP) × V / PKL (puan·L/kg; sukroz 46 PPG = 384, DME 44 PPG — Palmer tablosundan teyit et, kaynak satiriyla). Stokta yoksa "alinacak" (yeni malzeme ONERILMEZ, AI5 kurali).
  - Yuksek: su ekle: V_ek = V × (GP / GP_hedef − 1).
  - Her secenekte uygulamanin mevcut hesabiyla OG / ABV / IBU onizlemesi (kaynama uzarsa / hacim degisirse IBU degisir — mevcut IBU hesabi ne diyorsa).
- Verim: olculen on kaynatma degerinden mash verimi hesaplanir, partiye yazilir (mevcut profil mekanizmasi bm_kaan_profil_v1 neyi bekliyorsa ona uygun; yeni ogrenme mantigi YAZMA, yalniz veri).

3. MASH pH (yalniz uygulamanin mevcut motoru ne yapabiliyorsa)
- Olcum + olcum sicakligi (mashPhSic mevcut). Hedef bant uygulamada nasil tanimliysa o (kaynagi raporda).
- Mevcut motor asit/baz miktari HESAPLIYORSA onu goster (onizleme). HESAPLAMIYORSA sayi verme: "pH hedefin X uzerinde; uygulamada su raporu / duzeltme hesabi yok — kucuk adimla ekle, 10 dk sonra yeniden olc" (adim buyuklugu yazilmaz). Kaynaksiz doz YOK.

4. OLCUM KAYDI
- Mash boyunca her olcum (zaman, adim, sicaklik / pH / on kaynatma OG / hacim) partiye kaydedilir; mevcut alanlar (preboilOG, mashPh, brewLog) once. Mash sicakligi icin alan yoksa parti icinde tek yeni dizi (or. mashOlcumler [{t, adim, sicaklik}]); senkrona parti ile girer (KR icinde).
- AMAC (Kaan karari, mash FG modeli): "gercek ortalama ana adim sicakligi" partiye yazilir; ileride olculen FG ile (EVR1) mash FG modelini sinamak icin veri. Simdi model DEGISMEZ.
- Kayit geri alinabilir (son olcumu sil) ve parti ekraninda listelenir.

5. HATIRLATICI (adim degisiminde, deterministik)
- Mevcut Brewday timeline/timer'a baglan: adim baslarken / bitmeden once kisa kontrol listesi (or. "10 dk sonra sicakligi olc", "karistir", ana adim bitince "on kaynatma ornegi al"). Metinler uygulamanin mevcut kaynakli iceriginden (stilBaglami vb.) ya da yeni ise kaynakli; kaynaksiz "ipucu" YAZMA.
- Iyot testi hatirlatmasi varsa: kaynakli aciklama (iyot testi nisastanin donusumunu gosterir, fermente edilebilirligi gostermez — kaynak bulursan; bulamazsan yalniz "iyot testi" satiri, aciklama yok).
- Sesli okuma acikken hatirlatici da sesli okunur.

6. SES (Kaan: konusarak sorayim + sesli cevap)
- Buyuk "🎤 Basili tut / dokun-konus" dugmesi (islak el: buyuk hedef). Web Speech API SpeechRecognition, lang 'tr-TR'; YOKSA dugme gizlenir ve tek satir neden ("bu tarayici/APK konusma tanimayi desteklemiyor — Chrome'da ac"). Surekli dinleme YOK (pil + gizlilik).
- Gizlilik notu (tek satir, ilk kullanimda): Chrome konusma tanima sesi Google sunucusunda isler; internet gerekir. Kaynakla teyit et (MDN / Chrome dokumani), bulamazsan "dogrulayamadim" yaz.
- Deterministik konusma ayristirici (AI'SIZ): Turkce sayi sozcukleri ("altmis dort derece", "bir nokta kirk iki", "on dort litre", "pH bes nokta dort") -> sayi + birim + tur (sicaklik / gravite / hacim / pH). Taninirsa ilgili hesap (madde 1-3) acilir; taninmazsa yaziya doker, "anlayamadim" + metni gosterir (MASH2'de AI'ya gidecek).
- Sesli okuma: speechSynthesis, Turkce ses varsa; yoksa yalniz yazi + neden. Ayar: sesli okuma ac/kapa (cihaz-yerel tercih).
- Test: ayristirici 30+ cumle (sayi sozcukleri, ondalik "nokta/virgul", birim yok/var, "derece" vs "°C", karisik rakam+sozcuk), yanlis tur 0.

7. EKRAN
- Brewday modunda mash adimi sirasinda "🧑‍🍳 Mash asistani" paneli: aktif adim + hedef, olcum giris (yazi + ses), son olcumler, sapma karti (secenekler + onizleme + kaynak), hatirlatici.
- Her sayinin yaninda kaynak/varsayim etiketi; varsayimlar (±1 °C esigi vb.) "uygulama varsayimi".
- Brewday disinda da (parti ekranindan) acilabilsin.
- Kucuk duzeltme (KUC1 kalani): "Bell's Oberon gibi" cozulurken "oberon" anlasilmayan listesinde gorunmesin (cozulen marka kelimeleri listeden cikar). BUL2C-ISTEK testi birebir kalmali.

8. DOGRULAMA + AKIS
- npm test yesil + yeni case'ler: madde 1 (3 vaka + Palmer ornegi), madde 2 (dusuk/yuksek, stokta var/yok, kaynama kaybi yok -> dakika yok), madde 3 (motor hesapliyorsa / hesaplamiyorsa sayi yok), madde 4 (kayit + geri al + senkron yapisi), madde 6 (ayristirici 30+). En az 3 kasitli bozma kirmizi.
- 390/360 ekran goruntusu: panel, sapma karti, ses dugmesi (destek yoksa gizli hali).
- Canli curl, SW bump, APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. Her asamada TAM yedek. Anahtar taramasi 0. AI cagrisi YOK.
- Kaan'dan bir sey istenmez. Bitince Claude canlida dogrular, sonra MASH2 (AI soru-cevap + kanitli yorum + M tuzak grubu + Opus gercek kosu Kaan'in dugmesiyle).

RAPOR: kesif tablosu (madde 0), formul + kaynak satirlari (her sayi icin okunan sayfa + tarih), vaka tablolari, ses destek durumu (APK/PWA), ekran goruntuleri, SUPHE (zorunlu).
