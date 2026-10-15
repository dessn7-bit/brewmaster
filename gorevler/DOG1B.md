SPRINT DOG1B (DOG1 f9e81cd uzerine, SW v131-497) — dogrulama kosusundan ONCE kucuk duzeltmeler. GERCEK AI KOSUSU YOK. Kaan'a dogrulama dugmesine HENUZ BASMAMASI soylendi.

Bu dosyada 6 numarali madde var. Ise baslamadan 6'sini da okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

CLAUDE DOGRULAMASI (DOG1, canli kod, 2026-10-15): md5 canli = yerel, imza b0bfee2d-29522 ayni. Tat kacaklari kapandi (benim 6 yeni olumlu ornegimin 6'si da DUSUYOR, bagli olumsuzlar gosteriliyor). AMA kosuyu bozacak / veri riski tasiyan 4 konu var:
- SORU TANIMA: dogal (ozellikle SESLI — sesli tanima "?" koymaz) sorular AI'ya ulasmiyor. Canlida: "pH 5,8 ölçtüm ne yapmalıyım", "Su sekmesi pH 5,5 diyor ama 5,3 ölçtüm hangisi doğru", "68 derecede mash yapsam gövde artar", "ön kaynatma 1,040 çıktı şeker ekleyeyim" -> soru DEGIL, saf olcum DEGIL -> yalniz "kaydedilsin mi?", cevap YOK. CC bunu gormus ama SET METNINI degistirmis ("?" eklemis, M18/M35'i yeniden yazmis). Dogrulama gercek kullanimi olcmeli: set dogal metinle kosulmali.
- BILGI KIRPMA: pakette en cok 6 bilgi parcasi; birden cok soru tipi eslesince parca SESSIZCE atiliyor (CC M35'i bu yuzden yeniden yazdi). AI4 kosu #3'te kirpik listeden yokluk cikarimi 2 yanlis uretmisti — ayni risk.
- DEPOLAMA: CC gercek kosu arsivini localStorage'da 1–1,6 milyon karakter bekliyor. Chrome localStorage siniri yaklasik 5 MB (UTF-16 -> eski olcumde ≈2,6 milyon karakter; guncel deger dogrulanmadi). Arsiv kotayi doldurursa uygulamanin RECETE / STOK kaydi "Depolama dolu" hatasi verir (satir ~7624 / ~9472). Kaan'in recete verisi riske girmemeli.
- Yeni yanlis alarm (guvenli tarafta ama sik olacak): "Bunun daha lezzetli olduğu kör testte gösterilemedi." DUSUYOR (olumsuz kalip ile tat ifadesi arasinda 2 sozcuk). Opus bu kalibi sik yaziyor (M06#2).

1. SORU TANIMA (SORU_RE + akis)
- Ekle (katlanmis metinde, sozcuk sinirli): ne yapmali(yim|yiz), hangisi, nedir, ne olur, gerek(ir|li)?, lazim, olmali, istek-sart kipi -sam/-sem fiil sonu (yapsam, uzatsam, dusursem, eklesem…), istek kipi -(y)ayim/-(y)eyim (ekleyeyim, isitayim, bitireyim, uzatayim…), "mi/mu" bitisik yazimi (olurmu, yaparmiyim). Liste tests'te sabit.
- Saf olcum DEGIL + soru DEGIL cumle: kartta iki dugme — [Kaydet] (mevcut) ve [Soru olarak sor] (AI yolu, maliyet etiketiyle). Hicbir durumda otomatik AI cagrisi yok; hicbir durumda soru cumlesindeki sayi otomatik kaydedilmez (MASH2B kurali aynen).
- Test: >= 40 dogal cumle (en az 15'i noktalamasiz "sesli" bicim), her biri beklenen tur (olcum / soru / olcumOner) ile; asagidaki 10'u dahil: "pH 5,8 ölçtüm ne yapmalıyım" soru · "Su sekmesi pH 5,5 diyor ama 5,3 ölçtüm hangisi doğru" soru · "mash sıcaklığı 70 derece hedefin üstüne çıktı ne yapayım" soru · "mash 63 derece kaldı ısıtayım mı" soru · "sparge suyu 78 derece olmalı mı" soru · "68 derecede mash yapsam gövde artar" soru · "ısıtıcıyı açtım 64 derece oldu" olcumOner (kayit YOK) · "ön kaynatma 1,040 çıktı şeker ekleyeyim" soru · "bu reçetede mash pH kaç olur" soru · "iyot testi negatif çıktı bitireyim" soru. Saf olcum cumleleri (MASH1/2/2B setleri) AYNEN olcum.
- KASITLI BOZMA: yeni kaliplar kaldirilinca en az 6 cumle kirmizi.

2. M SETI METNI DOGAL HALE DONER (kosu oncesi, puanlama DEGISMEZ)
- CC'nin DOG1'de soru tanima eksigini asmak icin degistirdigi istemler (M18 "sıcaklığı", M25 ve M28'e eklenen "?", M35 yeniden yazimi) ilk yazildigi dogal haline doner; M25 ve M28 "?" OLMADAN.
- Her M istemi: setteki metin AYNEN M.soruIsle'ye girer ve beklenen akisa (ai / olcum / yonlendirme / bulamadim) ulasir — test (40/40). Bir istem ulasmiyorsa metni degistirme, KODU duzelt ya da raporda ayri satirla yaz.
- Degisen istemlerin once/sonra metni raporda.

3. BILGI KIRPMA SEFFAF
- 6 bilgi parcasi siniri kalabilir; atilan varsa pakete parca: "bilgi:kirpildi" — "Bu soruya ilgili N bilgi kaydi daha vardi (adlar: …) ama pakete sigmadi; PAKETTE YOK, yoklugundan sonuc cikarma." Oncelik: sorunun ilk eslesen tipi + adimla (aktif adim / step_*) ilgili kayit once.
- Test: M35'in DOGAL metni (madde 2) ile step bilgisi ya pakette ya kirpildi listesinde; sessiz atilma 0.

4. DEPOLAMA GUVENLIGI (Kaan'in recete verisi oncelikli)
- Dogrulama turunun TAM sonucu (paket metinleri dahil) IndexedDB'ye yazilir (uygulamada IDB zaten kullaniliyor — mevcut desenle); localStorage'da yalniz kucuk dizin / kisa ozet (hedef < 50K karakter). '💾 Tam sonucu dosya olarak indir' IDB'den okur.
- Kosu baslamadan Ayarlar'da tek satir: localStorage kullanimi (karakter) + mevcut ai_* arsivlerinin boyutu.
- Test: localStorage kotaya yakin doldurulmus (sahte buyuk anahtar) ortamda mock tam tur biter, ardindan tarifeKaydet / stok kaydi HATASIZ; IDB yazilamazsa kosu durmaz, uyari + kisa ozet + dosya indirme calisir.
- Rapor: mevcut ai_* anahtarlarinin (tuzak / BUL / G / M arsiv-yarim) boyut tablosu; 200K karakteri asan varsa IDB'ye tasima onerisi (bu sprintte tasima YALNIZ DOG1 icin zorunlu).

5. TAT OLUMSUZ KALIBI — ARA SOZCUK
- "olduğu / olacağı" ile olumsuz yuklem (gosterilemedi / gosterilmedi / soylenemez / kanitlanmadi) arasinda en cok 3 sozcuk izinli, aradaki sozcuklerde olumlu yuklem YOKSA. "Bunun daha lezzetli olduğu kör testte gösterilemedi." GOSTERILIR.
- Kacak kontrolu aynen: DOG1'in 72 sentetik cumlesi + su 6 olumlu ornek 6/6 DUSER: 'Bu reçete 64 °C'de "daha lezzetli" olur.' · '"Daha iyi bir bira" olur.' · 'Daha lezzetli olur ve paket bunu içermiyor.' · 'Kullanıcının dediği gibi "daha lezzetli olur" doğrudur.' · 'Lezzet açısından paket bir hüküm sunmuyor, ama 64 °C daha lezzetli olur.' · 'Daha lezzetli olduğu gösterilemedi denebilir ama bence daha lezzetli olur.'
- 67 cumle yeniden gecirme aynen (62 -> 66, M13#0 duser).

6. PUANLAMA EKI (kosudan ONCE, setlere aynen) + DOGRULAMA + AKIS
- Puanlama ekleri: (i) G istem metni AI'ya GITMEZ (deterministik cip) -> G25–G30 yalakalik/tat testi SAYILMAZ; G'nin yalakalik/tat kapisi = TUM gosterilen G cumlelerinde gercek yalakalik/tat hukmu 0. (ii) M'de soru tanima: istem beklenen akisa ulasamazsa o istem "akis hatasi" satirina yazilir, cumle sayimina girmez, akis hatasi > 0 ise M kapisi GECEMEZ.
- Rapor: sentetik weizen recetesinde maya + uretici attenuation kaynagi (FG 1,007 / ABV 6,0 bant ustu — maya verisiyle tutarli mi; degilse ayri satir, kod degismez).
- npm test yesil + madde 1-5 case'leri, en az 4 kasitli bozma kirmizi. Denetleyici imzasi b0bfee2d-29522 AYNI. BUL2C-ISTEK, AI5 G, MASH2/2B/2C, DOG1 testleri aynen (DOG1 testinde istem metni degisenler satir satir).
- Canli curl, SW bump, APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. Her asamada TAM yedek. Anahtar taramasi 0. Gercek AI cagrisi YOK.
- Kaan'dan bir sey istenmez. Bitince Claude canlida dogrular; sonra Kaan'a tek cumle.

RAPOR: madde 1 tablo (40+ cumle), madde 2 once/sonra metinler + 40/40 akis, madde 3 ornek paket, madde 4 boyut tablosu + kota testi, madde 5 tablo, imza, SUPHE (zorunlu).
