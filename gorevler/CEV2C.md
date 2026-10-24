SPRINT CEV2C (CEV2B 68b9f7b uzerine, SW v131-519) — TEK MADDELIK KUCUK DUZELTME, CEV GERCEK KOSUSU #2'DEN ONCE. GERCEK AI KOSUSU YOK. Kaan'a "CEV seti" ve "Malzeme asistani dogrulama turu" dugmelerine HENUZ BASMAMASI soylendi.

Bu dosyada 0-3 numarali 4 madde var. Ise baslamadan 4'unu de okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

CLAUDE DOGRULAMASI (CEV2B, canli kod, 2026-10-24): md5 canli = yerel (a38a726f…), bm-cache-v131-519, AI4 imza 2c9ebd9f-32461, arastirma denetleyicisi 92f59a3c-5776 (calisma aninda da), anahtar 0, cev_seti 7befe7db.
- Claude'un sentetik C.maddeIsle denemesi: 'bilgi' + yonlu madde artik celiski DEGIL (iki ayri madde); gercek celiski (Lallemand Abbaye <-> White Labs) kaliyor ve iki taraf yonuyle okunuyor ("sicaklik azaltilinca … <-> artirilinca …"); WLP002 / WLP004 ayri; briess iki alan = 1 kurum; deger bir kez; madde metninde yon fiili ("maya miktari artirilinca — ester azalir"). KABUL.
- Yonlendirme: "kuru hop / kuru maya" artik kuruluk degil, "nasil anlarim" stil secmiyor, kusur konusu sorgu stilsiz. KABUL. SUPHE maddeleri (iki 'bilgi' tarafinda celiski kaybi, kapali dolgu listesi, eski sema, eksilik kusur listesi disi) KABUL.
- AMA yeni bir YAPISAL acik (madde 1).

0. DOKUNULMAZLAR
- AI4 denetleyicisi 2c9ebd9f-32461, arastirma denetleyicisi 92f59a3c-5776 DEGISMEZ. tests/cev_seti.json (7befe7db), G seti, tuzak, DOG4B-H setleri ve puanlama metinleri DEGISMEZ.

1. KONU ETIKETI SORUNUN GERI KALANINI SILIYOR (yanlis / genis konu arastiriliyor)
- C.tarafsiz bir konu etiketi ya da "sorulan" bulunca sorgu ureteci ve ozetleyici YALNIZ etiketi goruyor; sorunun asil icerigi atiliyor. Ornekler (ana set — CC'nin gordugu sorular):
  - C24 "sisede karbonasyon az kaldi, nedenleri neler" -> "karbonasyon" (AZ karbonasyon oldugu kayboluyor; fazla karbonasyon da arastirilabilir)
  - C15 "soguk bulanikligi (chill haze) nasil azaltirim" -> "berraklik" (soguk bulaniklik kayboluyor)
  - C18 "diasetil dinlenmesi gerekli mi, ne zaman yapilir" -> "… sorulan: diasetil dinlenmesi" ("ne zaman" kayboluyor)
  - C30 "lager'imda yumurta (sulfur) kokusu var, gecer mi" -> "sulfur" ("gecer mi" kayboluyor)
  - Genel sinif: "kuru hoptan sonra <olay>" / "kuru mayayi <islem>" -> konu yalniz "kuru hop" / "kuru maya"; olay ve islem kayboluyor, kuru hop / kuru maya HAKKINDA genel arastirma yapiliyor.
- DUZELT (yapisal, sozluk degil): soru YONLENDIRMESIZ ise (C.yonlendirmeVar(soru) false ve kanaat sozcugu yok) konu = etiket + temizlenmis soru metni: '"<etiket>" — soru: "<soru; yalniz soru isareti / bastaki-sondaki noktalama atilmis>"'. Soru yonlendirmeliyse (iddia / kanaat / "degil mi" / "daha iyi olur" …) BUGUNKU davranis aynen (yalniz etiket + sorulan) — yalakalik onlemi bozulmaz. Etiket yoksa bugunku temizleme yolu aynen.
- Ayni konu metni sorgu uretecine (C.SORGU_GOREV) VE ozetleyiciye (C.OZET_GOREV) gider; "Anladigim" satiri da bunu kullanir (etiket + soru; jargon yok).
- TEST:
  - (a) Icerik korunumu: yonlendirmesiz her sorunun icerik sozcukleri (dolgu / soru eki / kanaat disi, katlanmis) konu metninde geciyor — ana set 34 + CEV1B 13 + CEV1C 25 + CEV1D 20 tarafsizlastirma sorulari + testin kendi uretilmis 30 yonlendirmesiz sorusu ("kuru hoptan sonra / kuru mayayi / sisede / ne zaman / gecer mi" bicimleri).
  - (b) Yalakalik: yonlendirmeli sorularin (CEV1B / CEV1C / CEV1D testlerinin yonlendirmeli olanlari + C13 / C20 / C34) konu metninde iddia fiili / kanaat sozcugu 0 (bugunku testler AYNEN gecmeli); istekOzet.yonlendirmeGitti false.
  - (c) ana set yol (kural 12 / arastirma 22) DEGISMEZ; G seti 4615b7b9/3414 ve tuzak / DOG4B-H parmak izleri BIREBIR.
  - Kasitli bozma: yonlendirmeli soruya da soru metni eklenince (b) kirmizi; etiket-yalniz geri donunce (a) kirmizi.

2. RAPOR TABLOSU
- Ana setin 22 arastirma sorusu icin once / sonra konu metni (tam). Hangi sorular yonlendirmeli sayilip etiket-yalniz kaldi, listele.

3. DOGRULAMA + AKIS
- npm test TAM yesil. Imzalar ve parmak izleri AYNI (madde 0).
- Canli curl, SW bump (v131-520), APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. TAM yedek. Anahtar 0. Gercek AI cagrisi YOK.
- Maliyet satiri degismez (sorgu kolu sabit token varsayimi) — degisirse yaz.

RAPOR: madde 1 once/sonra + test sayilari, madde 2 tablosu, imzalar, SUPHE (zorunlu).
