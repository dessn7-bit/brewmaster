SPRINT CEV1 (AI5D SONRASI) — CEVAP ILKESI: her soruya sade, dogrudan, cok kaynakli cevap. Kaan karari 2026-10-22: "Evet kesinlikle her soruya bu şekilde cevap vermeli" (ornek: "daha muzlu weizen" sorusuna Claude'un verdigi cevap — etkenler guclüden zayifa, her biri uretici + ders kitabi kaynakli, celiski acikca, recetene uygulanisi, kaynak listesi).

Bu dosyada 8 numarali madde var (0–7). Ise baslamadan 8'ini de okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

GUNCELLEME (Claude, 2026-10-23 — once bunu oku): AI5E (9235a5c, SW v131-513) Claude canlida dogruladi: md5 canli = yerel (02569d12…), imza 2c9ebd9f-32461, anahtar 0; ters katalog notu 0, ters yon istekleri cevaplaniyor (AI cagrisi 0), "daha kuru" mash satiri güçlü + ayri tadim notu + MASH_NOT. KABUL: baz malt "hesapla" sapmasi, "serin mayalanma" iliski okumasi, Muller 2000 / Oxford Companion / Warminster kaynaklari. Bu dosyaya MADDE 0 (on is) eklendi; toplam 8 madde (0–7). SW bump v131-514.

0. ON IS — MAYA SICAKLIK ALANLARI + KUCUK ACIKLAR (CEV1 madde 4 bu alanlari "Senin reçetende"de kullanacak; once dogru olmali)
- CANLI HATA: weizen + WY3068 recetesinde "daha az muz" karti "Mayalanmayı mayanın aralığının alt ucunda (17 °C) yap" diyor. Katalog sc:[17,22], ama Wyeast 3068 urun metni "64-75 TEMPERATURE RANGE" (°F ≈ 18–24 °C) — oneri ureticinin ALT SINIRININ ALTINDA. Muz yonundeki "ust uc 22 °C" de ureticinin 24'unden dar.
- AI5E'deki attenuation taramasi gibi: TUM maya kayitlarinin sc alanini uretici sayfasiyla karsilastir (CC kaynaklari KENDISI acar; °F → °C yuvarlama kuralini yaz). Celisen alan ureticiye gore duzeltilir; uretici sayfasi bulunamayan maya (BiraBurada vb.) "aralık doğrulanmadı" isareti alir → kart o maya icin SAYI vermez ("mayanın üretici aralığını bulamadım — paketine bak", CEV1 madde 4 metni).
- HA-18: atu alani uretici degerine (Fermentis 98–102, glukoamilaz iceriyor) getir; dogrulayicinin %95 tavani YALNIZ enzim iceren (diastaticus / glukoamilaz) mayalar icin gerekceli acilir; FG hesabinin sonucu olc ve raporla (absurd degerse alan yerine kartta "bu maya enzim içerir — FG tahmini güvenilmez" notu).
- Kucuk: "hem muz hem karanfil daha çok" → tanıyamadım yerine iki hedef birlikte (muz: maya/sicaklik güçlü — karanfile etkisi celiskili notuyla; karanfil: ferulik uzat olası). AI cagrisi 0.
- Rapor: degisen her maya satiri once/sonra + kaynak; kartin WY3068 ve BB Alman Bugday No1 "daha az muz" / "daha muzlu" cumleleri once/sonra. G seti 30 / tuzak v5 / DOG4B parmak izleri BIREBIR (degisen yalniz sicaklik sayisi iceren metin satiri ise liste + gerekce).


KAPSAM: uc asistan — malzeme asistani (AI4), "Bu receteyi nasil gelistirebilirim?" (AI5), mash asistani (MASH). Denetleyici (imza 2c9ebd9f-32461) ve dogrulama puanlamasi DEGISMEZ; degisirse yeniden dondurma + Claude onayi.

1. CEVAP BICIMI (tum asistanlar, ust kisim, sade Turkce)
- (a) "Anladığım: …" tek satir.
- (b) Dogrudan cevap 1–2 cumle.
- (c) Etkenler/oneriler GUCLUDEN ZAYIFA en cok 5 madde; her madde: ne yapilir + ne degisir + kanit gucu sozcugu ("güçlü — üreticiler ve ders kitabı aynı şeyi söylüyor" / "olası — tek kaynak ya da deney ayırt edemedi" / "kaynaklar çelişiyor").
- (d) "Senin reçetende:" — recetenin kendi degerleriyle 1–2 cumle (ornek: "OG 1,054 zaten bu sınırda").
- (e) Kaynaklar listesi (ad + link) ve tum teknik ayrinti (tablo, alinti, model, maliyet, dogrulama seridi) "▸ Ayrıntılar ve kaynaklar" altinda KATLI.
- Jargon yasagi (ust kisim): p10–p90, n, iskelet, grist, enum, kiyas:… etiketleri YOK; zorunlu terim parantezle aciklanir ("başlangıç yoğunluğu (OG)").

2. KANIT KURALI
- Her etken en az IKI bagimsiz kaynakla "güçlü" sayilir (uretici teknik belgesi, ders kitabi / egitim kurumu notu, hakemli makale, kontrollu deney). Tek kaynak = "olası". Tek deney TEK BASINA yeterli degil.
- Kaynaklar celisirse etken yazilir ama "kaynaklar çelişiyor" etiketiyle ve oneri olarak SUNULMAZ (ornek: havalandirma — Lallemand metni vs tablosu).
- "Bulamadım" yalniz madde 3'teki arama da sonuc vermezse; once ara, sonra bulamadim.

3. ARASTIRMA YOLU (kural tablosunda olmayan soru)
- Uygulamanin kaynakli kural tablosu (G.KURALLAR + AI4 kanit paketi + MASH bilgi tabani) once. Kapsamiyorsa ARASTIRMA modu:
  * Sorgu ureteci: soru metninden YALNIZ arama sorgulari uretir (Ingilizce, en cok 3, sablon: "<stil> <etken/aroma> <üretici|study|BYO>"); cevap YAZMAZ. Model: ozet modeli (varsayilan Opus).
  * Izinli alanlar: mevcut 18 izinli alan + uretici teknik belgeleri (lallemandbrewing.com, fermentis.com, whitelabs.com, wyeastlab.com, weyermann.de), egitim (brewingscience.com), hakemli (onlinelibrary.wiley.com/journal JIB, tandfonline ASBC), brulosophy.com, byo.com. Liste kodda tek yerde, raporda tam liste.
  * Ozetleyici: soruyu TARAFSIZLASTIRILMIS bicimde gorur ("weizen'de muz aromasını etkileyen etkenler") — kullanicinin yonlendirmesi (ör. "değil mi?", "daha iyi olur") cikarilir; yalakalik onlemi AI4 ilkesiyle ayni. Cikti semasi madde 1 (c) maddeleri: { etken, yon, kaynaklar[] (alinti ID 1–3), guc } — guc uygulama tarafindan kaynak sayisi ve turunden HESAPLANIR, AI'nin yazdigi guc sozcugu kullanilmaz.
  * Donmus denetleyici her maddeyi alintilara karsi denetler (sayi/urun/kaynak); dusen madde gosterilmez.
- Maliyet kartta (Ayrintilar icinde) gercek tutar; tavan: soru basi ≈ tahmin × 2, asilirsa durur.

4. URUN/MAYA BILGISI KULLANIMI
- Recetedeki mayanin katalog araligi (sicaklik, attenuation) ve uretici notu cevapta "Senin reçetende" satirinda kullanilir; katalogda yoksa "mayanın aralığını bulamadım — paketine bak" denir (ornek: BB Alman Buğday No1).

5. TEST SETI (dogrulama turu icin, koşudan ONCE puanlama yazilir)
- tests/cev_seti.json ≥ 30 "kolay" soru: weizen muz/karanfil, Dubbel kuru üzüm/koyu meyve, gövde/ağız dolgunluğu, köpük tutma, berraklık, diasetil, DMS, acılık algısı, karbonasyon, sıcak alkol tadı… Her soru icin Claude ONCEDEN beklenen etken listesi + en az 2 kaynak yazar (dosyada; CC degistiremez).
- Puanlama: (i) beklenen GÜÇLÜ etkenlerin cevapta bulunmasi (kapsama ≥ %80), (ii) kaynaksiz ya da yanlis kaynakli madde (c) — AI4C kurallari aynen, (iii) "güçlü" etiketli madde tek kaynakliysa hata, (iv) yalakalik 0, tat hukmu 0, (v) jargon taramasi ust kisimda 0.
- Gercek kosu Kaan'in dugmesiyle (Opus, tavan hesaplanir); gosterilen maddelerin TAMAMI Claude elle etiket.

6. MEVCUT KARTLARIN UYUMU
- AI5D'nin sade gorunumu (madde 7) bu bicimin ilk uygulamasi; AI4 ve MASH kartlari ayni bicime getirilir. Mevcut dogrulama setleri (AI4 v5 93, G v2 30, M v2 40) paket/cozum parmak izleri DEGISMEMELI — yalniz gorunum katmani degisir; degisen olursa dur + rapor.

7. DOGRULAMA + AKIS
- npm test TAM yesil, imza 2c9ebd9f-32461 AYNI, mock tam tur (cev seti), 360 px ekran goruntuleri (once/sonra, uc asistan). Canli curl, SW bump, APP_VERSION SABIT, worker'a dokunma, TAM yedek, anahtar 0, gercek AI cagrisi YOK.

RAPOR: madde 1-6 once/sonra ekran goruntuleri, izinli alan listesi, sorgu ureteci ornekleri (5 soru → sorgular), parmak izleri, SUPHE (zorunlu).
