SPRINT CEV1 (AI5D SONRASI) — CEVAP ILKESI: her soruya sade, dogrudan, cok kaynakli cevap. Kaan karari 2026-10-22: "Evet kesinlikle her soruya bu şekilde cevap vermeli" (ornek: "daha muzlu weizen" sorusuna Claude'un verdigi cevap — etkenler guclüden zayifa, her biri uretici + ders kitabi kaynakli, celiski acikca, recetene uygulanisi, kaynak listesi).

Bu dosyada 7 numarali madde var. Ise baslamadan 7'sini de okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

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
