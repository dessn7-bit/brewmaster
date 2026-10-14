SPRINT AI5B (AI5 fe331e9 uzerine, SW v131-487) — G grubu GERCEK KOSUSUNDAN ONCE: yon denetimi + aday siralamasi seffafligi + mash FG modeli olcumu. G kosusu bu sprint bitince TEK SEFER.

Bu dosyada 4 numarali madde var. Ise baslamadan 4'unu de okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

NEDEN (Claude degerlendirmesi 2026-10-14): AI5 raporunda kendi sahte-AI denemen Blonde icin yanlis "SRM bandin ustunde" cumlesinin denetimden GECTIGINI gosterdi. AI5'te AI'nin anlattigi seyin ozu yon (bandin ustu/alti, artar/azalir) ve uygulama bu yonu ZATEN biliyor (kiyas motoru). Genel anlam denetimi acik is olarak kalsin; ama YON deterministik olarak denetlenebilir. Bunu kosudan once yapmazsak G kosusu bildigimiz bir kacagi olcer ve tekrar gerekir (Kaan kurali: yapilmis testi tekrar ettirme). Kaan'a G dugmesine HENUZ BASMAMASI soylendi.

1. YON DENETIMI (deterministik; denetleyici degisir -> yeniden dondur)
- Paketteki her kiyas sapmasi ve her adayin onizlemesi bir yon tasir: parametre (OG / FG / ABV / IBU / SRM / renk / aci / govde / kuruluk) + yon (bandin ustu / alti / icinde; artar / azalir / degismez).
- Ozet cumlesinde parametre + yon kelimesi (TR + EN es anlamlilar: ustunde/yuksek/fazla/artar/above/higher; altinda/dusuk/az/azalir/below/lower; icinde/uygun/within) geciyorsa, cumlenin kaynak gosterdigi parcadaki yonle karsilastir: celisirse cumle DUSER ("yon celiskisi" etiketi, (b) sayimina girer). Parametre ya da yon cikarilamiyorsa bu kural uygulanmaz (yanlis alarm uretmesin).
- Turetilmis eslesmeler testli: "daha kuru" = FG azalir, "daha govdeli" = FG artar, "daha koyu" = SRM artar, "daha az aci" = IBU azalir.
- Mutasyon: G mock cumlelerinde yon kelimelerini ters cevir (ustunde<->altinda, artar<->azalir) -> hepsi DUSMELI; dogru yonlu cumlelerde yanlis alarm 0. Kosu #4 gercek cumleleri (tests/ dogrulama seti) yeni denetleyiciyle: karar degisen cumle sayisi raporda, her biri gerekceli (yeni yanlis alarm 0 hedef).
- Denetleyici YENIDEN DONDURULUR (yeni imza + commit), onceki e28f0da2-21632. AI4 tuzak seti (kosu #4) sonucu bu degisiklikten sonra yeniden puanlanmaz; yalniz karsilastirma raporu.

2. ADAY SIRALAMASI SEFFAFLIGI
- Raporundaki Dubbel "daha kuru" ornegi: (a) mash 66 -> 64 °C FG yalniz 1 puan, (b) seker payi %7,7 -> %12,7, (c) kristal %8 -> %4 "hesapta FG farki yok". Her aday icin hesaplanan hedef etkisi (orn. ΔFG puan) ve kanit gucu kartta ve raporda SAYIYLA yazsin; siralama formulu raporda acik.
- Hesapta etkisi 0 ya da yalniz yon olan aday, olculebilir etkili adaylarin ARKASINA; kartta "etkisi uygulamanin hesabinda gorunmuyor — yalniz kaynakli yon" etiketi.
- Raporda 4 ornek recetenin (Dubbel, Weizenbock, Saison, Blonde) aday tablosu: aday · ΔFG/ΔSRM/ΔIBU · kanit (n) · sira.

3. MASH FG MODELI — OLC, DEGISTIRME (karar Kaan'da)
- Kod (satir ~9601): 65-68 °C etkisiz kabul ediliyor; gerekce Brulosophy'nin ALGISAL sonucu. Ama ayni yorumdaki kaynak (brewmybeer: 148 / 152 / 158 °F -> FG 1.008 / 1.012 / 1.016) ve senin AI5 kural tablondaki Brulosophy deneyi (64 vs 73 °C: FG 1.008 vs 1.023) bu aralikta da OLCULEN FG farki gosteriyor. Algi farki yoklugu FG farki yoklugu degil.
- Kaan'in gercek partileri (tests/fixtures yedek dosyasi + bm_kaan_profil_v1 yapisi; repoya kisisel veri YAZMA, yalniz sayi ozeti): mash sicakligi kayitli olan partilerde tahmini FG vs olculen FG — (i) bugunku duz model, (ii) tum aralikta dogrusal model (kaynaklardan egim) icin ortalama mutlak hata. n kucukse acikca yaz.
- Kaynaklari yeniden oku (brewmybeer sayfasi ve Brulosophy 2018 deneyi; erisilemiyorsa "dogrulayamadim") ve egimi kaynakla yaz.
- KOD DEGISMEZ. Rapor + oneri; Kaan onaylarsa ayri sprint (tum recetelerin FG tahminini degistirir).

4. DOGRULAMA + AKIS
- npm test yesil + yeni case'ler (madde 1 yon kurali + mutasyonlar + yanlis alarm 0, madde 2 siralama), en az 2 kasitli bozma kirmizi.
- G grubu mock yeniden: yon mutasyonu yakalaniyor, aday listesi tarafsiz/yonlendirici esit.
- Canli curl, SW bump, APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. Her asamada TAM yedek. Anahtar taramasi 0.
- G kosucusunda da BUL'daki gibi "Kisa ozeti kopyala" (kontrol kodu + uzunluk) olsun; yoksa ekle. Tam sonuc ayrica dosya olarak indirilebilsin (yapistirma bozulmasina karsi).
- AKIS: bitince Kaan'a tek cumle: "Ayarlar ▸ AI ▸ 🛠️ G grubunu calistir'a bas, bitince KISA ozeti kopyala ile yapistir" (uzun JSON yapistirmada bozuluyor; kisa ozet + kontrol kodu yeterli degilse tam sonucu dosya olarak al). Sonuc gelince gosterilen cumlelerin TAMAMI elle etiket (AI4B EK).

RAPOR: yon denetimi kurali + mutasyon tablosu + kosu #4 karsilastirmasi, yeni denetleyici imzasi, aday tablolari, mash modeli olcumu (n, hata, kaynaklar), SUPHE (zorunlu).
