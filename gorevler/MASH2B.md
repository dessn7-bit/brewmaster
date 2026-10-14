SPRINT MASH2B (MASH2 5858b69 uzerine, SW v131-494) — M GERCEK KOSUSUNDAN ONCE kucuk duzeltme. Gercek AI kosusu YOK. Kaan'a M dugmesine HENUZ BASMAMASI soylendi.

Bu dosyada 3 numarali madde var. Ise baslamadan 3'unu de okudugunu raporun ilk satirinda teyit et.
EFOR: medium
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

NEDEN (Claude canli dogrulamasi 2026-10-14): MASH2 dogrulandi (md5 canli = yerel, imza b0bfee2d-29522 ayni, bucuk / altmis-alti / yuzde-verim duzeltmeleri dogru). AMA: "yetmis bes derecede mash yaptim daha iyi olur degil mi" -> ayristirici 75 °C'yi (birimli oldugu icin) OLCUM olarak partiye YAZIYOR. Bu bir soru / gecmis ya da varsayimsal ifade; aktif partinin olcumu degil. Mash olcumleri (S.mashOlcumler, S.mashGercekSc) Kaan'in karariyla mash FG modelini ileride sinamak icin toplanan VERI — sorudan sizan sayi bu veriyi bozar. Ayni sorun M12 ("pH 5,0 olctum ama motor 5,5 diyor…") ve her "…'te yapsam / yaptim" sorusunda. Bu duzeltme AI'ya giden paketi degistirir -> gercek kosudan ONCE yapilmali.

1. SORUDAKI SAYI OTOMATIK KAYDEDILMEZ
- Yalniz SAF OLCUM ifadesi otomatik kaydedilir: ayristirici cumlenin tamamini tuketiyor (sayi + birim/tur + izinli dolgu kelimeleri: mash, olctum, kaldi, su an, simdi, sicaklik, ph, on kaynatma, litre, derece…). Listeyi testle sabitle.
- Cumlede baska icerik varsa (soru eki "mi/mu", "neden", "yapsam", "yaptim … degil mi", "ama", kosul/gecmis/varsayim): sayi KAYDEDILMEZ. Kartta "75 °C bu partinin olcumu olarak kaydedilsin mi? [Kaydet]" dugmesi (tek dokunus, geri al mevcut).
- AI paketine "soru:deger" parcasi (deger + birim + "kullanicinin sorusunda gecti, olcum olarak KAYDEDILMEDI"). Denetleyici bu sayiyi pakette bulur (sayi uydurma sayilmaz). Kaydedilirse normal olcum parcasi olur.
- Sesli girdide ayni kural.

2. TESTLER + M SETI
- Yeni case: "altmis dort derece" -> kayit · "mash altmis alti bucuk" -> kayit · "olctum 5,4" -> kayit · "yetmis bes derecede mash yaptim daha iyi olur degil mi" -> kayit YOK + soru:deger 75 · "pH 5,0 olctum ama motor 5,5 diyor, motor dogru degil mi" -> kayit YOK + soru:deger 5,0 ve 5,5 (5,5 motorun tahmini, olcum degil) · "64'te yapsam daha lezzetli olur mu" -> kayit YOK. Kasitli bozma: kural kaldirilinca M06 kaydi geri gelir -> kirmizi.
- M seti mock yeniden: akis 14/14, beklenen parcalar eksiksiz (M06 / M07 / M12 artik soru:deger parcasiyla). tests/mash_m_seti.json puanlama metni DEGISMEZ; yalniz beklenen parca listesi guncellenirse degisikligi raporda satir satir yaz.
- Denetleyici imzasi b0bfee2d-29522 AYNI kalmali (donmus bolgeye dokunma). BUL2C-ISTEK, AI5 G aynen.

3. AKIS
- Canli curl, SW bump, APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. Her asamada TAM yedek. Anahtar taramasi 0.
- Bitince Kaan'a tek cumle (MASH2'deki gibi): "Ayarlar ▸ AI ▸ 🧑‍🍳 M grubunu calistir'a bas, onayda yazan tutari gor, bitince Kisa ozeti kopyala ile yapistir (bozulursa tam sonucu dosya olarak indir)."

RAPOR: madde 1 once/sonra tablosu (6 cumle), izinli dolgu listesi, paket ornegi (M06), M seti mock sonucu, imza, SUPHE (zorunlu).
