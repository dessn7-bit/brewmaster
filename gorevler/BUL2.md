SPRINT BUL2 (BUL1 tur 4 + AI6 uzerine) — "Tarif et" kalite duzeltmeleri: anlasilmayan tarifte sonuc dokmeme, ticari bira adi, mevsim/ozel gun birasi, cift kod, kacan beklenen ornekler + Haiku/Opus BUL karsilastirmasi

Bu dosyada 7 numarali madde var. Ise baslamadan 7'sini de okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

NEDEN: BUL gercek kosusu (2026-10-13, kosuId 1791915710593, Haiku, 0,0115 $): AI cip 17/20, beklenen ornek ilk-5'te 4/8, celiski 3/3, uydurma 0. Acik bulgular (CLAUDE.md BUL1 TUR 4): A06 "Pliny the Elder benzeri" 0 cipte 5 alakasiz Altbier gosterdi; AI ayni kodu iki kez dondurdu (guc:hafif x2); A04 Christmas + fenolik + baharat bulunamadi; "yazin terasta" cozulemedi. Kaan onayi: BUL2 once, sonra AI5 (2026-10-14).
ILKE (BUL1 aynen): arama ve siralama AI'SIZ; AI yalniz tarifi ciplere cevirir; uydurma recete yok; cipler ekranda ve duzenlenebilir.

1. CIPSIZ TARIFTE SONUC YOK
- Tarifin hicbir kismi cipe donusmediyse (sozluk + AI) arama YAPILMAZ ve ornek GOSTERILMEZ. Kart: "Bunu anlayamadim: '<metin>'. Su ciplerden secebilirsin: ..." (renk / guc / kuruluk / aci / maya karakteri / koken / stil secici).
- Kismi anlama: anlasilmayan kelimeler ayrica listelenir ("bunlari dikkate alamadim: ..."); arama yalniz anlasilan ciplerle yapilir ve kartta bu acikca yazar.
- Test: A06 tipi tarif -> 0 sonuc + "anlayamadim"; eski davranis (5 Altbier) kasitli geri getirilince kirmizi.

2. TICARI BIRA ADI ("X benzeri", "X gibi")
- Once DETERMINISTIK: ornek_veri'de ad / bira fabrikasi / klon adi eslesmesi (ornek: BYO / marka klonlari). Bulunursa o ornek(ler) ilk sirada, "adi gecen biranin klonu" etiketiyle.
- Bulunamazsa AI (beta acikken, kullanicinin "AI ile coz" dugmesiyle) yalniz STIL cipi onerebilir; cip "AI tahmini — dogrulanmadi" etiketiyle gelir ve Kaan onaylamadan aramaya girmez. Stil disinda ozellik (IBU, ABV sayisi) uydurmaz.
- Kaynakli dogrulama istenirse (dugme): web aramasi izinli alanlarda "<bira adi> style" — bulunan alinti cipin yaninda link + cited_text ile; bulunamazsa "dogrulayamadim".

3. MEVSIM / OZEL GUN / KULLANIM BAGLAMI ("Christmas", "kis", "yazin terasta")
- Sozluge baglam girisleri: Christmas / Noel / kis -> BJCP Winter Seasonal Beer / Spiced Beer ailesi + baharat; yaz / terasta / sicakta -> hafif + acik + ferah (yuksek gorunur attenuasyon). Her giris "uygulama varsayimi" etiketli (kaynak varsa BJCP metninden alinti: Winter Seasonal tanimi); Ayarlar ▸ "Tarif et sozlugu"nde gorunur.
- A04 kok nedeni: beklenen ornek veride var miydi, hangi cip onu eledi (sert filtre mi, isim eslesmesi mi)? Duzelt ve raporla.

4. CIFT KOD + AI CIKTI TEMIZLIGI
- AI'dan donen kodlar tekillestirilir; ayni eksende celisen iki kod (ornek guc:hafif + guc:guclu) celiski kuralina girer (soru sorar).
- Test: gercek kayittaki guc:hafif x2 durumu (tests/fixtures/bul_kosu_2026-10-13.json) -> tek cip.

5. KACAN BEKLENEN ORNEKLER (4/8)
- Gercek kayittaki 4 kacak icin tek tek: neden (cip hatasi / siralama / beklenen setin kendisi tartismali). Siralama kaynakli olanlari duzelt; beklenen set tartismaliysa ESKI SETI DEGISTIRME — yeni gruba (madde 6) dogru tanimli istem ekle ve raporda gerekce yaz.
- Duzeltme sonrasi gercek kayit uzerinde AI'siz tekrar degerlendirme (kayitli AI ciplerini aynen kullanarak): beklenen ilk-5 once/sonra.

6. TEST SETI + KOSU
- tests/bul_seti.json: eski 24 tarif DEGISMEZ (karsilastirilabilirlik). Yeni grup "B2" 6 tarif: 2 ticari bira adi (biri veride klonu olan, biri olmayan), 2 mevsim/baglam, 1 tamamen anlasilmaz, 1 kismi anlasilir. Her birinin beklenen sonucu veriden (ornek id) ya da kuraldan ("0 sonuc + anlayamadim").
- Gercek kosu (Kaan'in dugmesi): AI gerektiren eski 12 + B2'nin AI gerektirenleri, IKI MODELLE sirayla: Haiku 5.5 ve Opus 5.5. Tahmini maliyet raporda (2x payla; tavan kredi donemi 30 $ icinde). Arsiv/yarim korumalari aynen; model basina ayri metrik: cip isabeti, beklenen ilk-5, celiski, uydurma, "AI tahmini" cip sayisi.
- KARAR: BUL'un AI modeli icin Kaan secer (tablo: model · cip isabeti · ilk-5 · uydurma · cagri basi maliyet). CC oneri yazar, karar vermez.

7. DOGRULAMA + AKIS
- npm test yesil + yeni case'ler (madde 1-5 her biri), en az 2 kasitli bozma kirmizi.
- 390/360 ekran goruntusu: "anlayamadim" karti, "AI tahmini — dogrulanmadi" cipi, klon etiketi.
- Canli curl, SW bump, APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. Her asamada TAM yedek. Anahtar taramasi 0.
- AKIS: madde 1-5 + canli -> Kaan'a tek cumle (dugme + Sonucu kopyala). Sonuc gelince tabloyu kur, Kaan'a model kararini sor.

RAPOR: her madde once/sonra ornek, A04 ve 4 kacak ornek kok nedenleri, eski 12 istemde AI'siz yeniden degerlendirme, kosu tablosu (Haiku / Opus), maliyet, SUPHE (zorunlu).
