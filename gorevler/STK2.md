SPRINT STK2 — Kiler'de miktar yazma + katki gruplari + AI anahtarini telefona aktarma

Bu dosyada 4 numarali madde var. Ise baslamadan 4'unu de okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

1. KILER'DE MIKTARI DOGRUDAN YAZMA
- Kiler satirinda miktara dokununca yazma alani acilsin (sayi klavyesi, birim gorunur: g / kg / adet / ml). Kaydet = ATAMA (yeni miktar budur), toplama degil. Bos birakip kapatmak degistirmez.
- "miktar ?" (Sprint CA) kalemlerde ayni alan miktari ilk kez girer.
- Turkce virgul kabul (1,5 -> 1.5). Negatif ve absurt deger (ornek > 100 kg) reddedilir, satirda uyari.
- +/- dugmeleri aynen kalir. STK1'in "uste ekle / miktari yap" secimi bozulmaz.
- Degisiklik mevcut stok yazim yolundan gecer (LS + IDB + senkron); yeni yazim yolu acma.
- 44 px dokunma hedefi, 390/360'ta tasma 0.

2. KATKI GRUPLARI
- STK1'de eklenen katkilarin bir kismi (maya besini, berraklastirici, yulaf ezmesi...) Kiler'de "Diger" grubuna dustu; cunku Kiler'in grup listesi katalogdaki gruplari (Fermantasyon / Berraklastirici / Adjunct vb.) tanimiyor.
- Katalog grubu -> Kiler grubu eslemesini tek tabloda kur; Kiler'de karsiligi olmayan katalog grubu icin Kiler'e grup ekle ya da en yakin mevcut gruba bagla — gerekcesiyle raporla.
- Mevcut stoktaki tum katki kalemleri (STK1'in 25'i dahil) bu eslemeyle dogru gruba tasinsin. Tasima uygulamanin kendi yazim yolundan (STK1 yontemi: headless uygulama + gercek senkron odasi, Firebase'e ham yazma YOK), once SALT OKUMA yedek.
- Ileride eklenen katkilar da formdan dogru gruba dussun.

3. AI ANAHTARINI TELEFONA AKTARMA (tek kullanici, ama anahtar acik bulutta duramaz)
- Kisit: Firebase RTDB su an herkese okunabilir (bilinen acik). Anahtar Firebase'e DUZ METIN olarak ASLA yazilmaz; normal senkrona ve yedege girmez (BW kurali aynen).
- Akis: Ayarlar ▸ AI Ozellikleri'nde anahtari olan cihazda "📱 Baska cihaza aktar" -> uygulama rastgele 8 karakterlik tek kullanimlik kod uretir (karistirilmayacak alfabe, ornek: buyuk harf + rakam, 0/O/1/I yok) ve ekranda gosterir. Anahtar bu kodla tarayicida sifrelenir (Web Crypto: PBKDF2-SHA256 yuksek tekrar + AES-GCM, rastgele salt/iv) ve yalniz sifreli paket ayri bir Firebase dugumune yazilir (ornek: brewmaster_<oda>_aktar; ana belge PUT'unu etkilemesin). Paket 5 dakika gecerli.
- Diger cihazda "📥 Kodla al" -> 8 karakteri girer -> paket cekilir, cozulur, anahtar o cihazin yerel depolamasina yazilir, paket HEMEN silinir. 5 dakika gecince ya da 3 yanlis denemede paket silinir.
- Kod hicbir yere yazilmaz ya da gonderilmez (yalniz ekranda). Basari/hatada net mesaj. Aktarimdan sonra otomatik "Baglanti testi" calissin ve sonucu gostersin.
- WebView/APK'da da calismali (kamera/QR gerektirmez).
- Testler: sifreli paket duz anahtar icermez (grep + runtime), yanlis kod cozmez, 5 dk sonra / kullanimdan sonra paket yok, anahtar yedege ve normal senkrona girmez, aktarim sonrasi hedef cihazda anahtar var.

4. DOGRULAMA
- npm test yesil + yeni case'ler (madde 1-3). En az 2 case kasitli bozmayla kirmizi.
- 390 ve 360 ekran goruntusu: Kiler miktar yazma alani, katki gruplari, AI aktarim ekrani (kod gosterimi + kodla al).
- Canli: SW bump, APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. Firebase'de aktarim dugumunun test sonrasi bos oldugunu dogrula.

RAPOR: miktar yazma davranisi, grup esleme tablosu + tasinan kalemler, aktarim akisi ve guvenlik ozellikleri, SUPHE (zorunlu).
