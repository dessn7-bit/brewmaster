# CEV4 — Araştırma modu: koşu #3 bulguları (gerçek koşu YOK)

Claude, 2026-10-27. Kaynak: CEV gerçek koşusu #3 (kosuId 1793041009511, Opus 5.5, 55 soru, 12,88 $, AI4 2c9ebd9f-32461 + araştırma 92f59a3c-5776 + doğrulayıcı 5ac684b3-13526), Claude etiketi (12 kör alt-etiketçi, her paket 2 bağımsız + Claude kararı).

## Sonuç (önceden kayıtlı puanlama, cev_seti EK 2)

| | N | c | sınırda | b | KATI | üst %95 |
|---|---|---|---|---|---|---|
| ana (kural 44 + araştırma 189) | 233 | 2 | 9 | 1 | 12 = %5,15 | %8,21 |
| held-out | 181 | 0 | 13 | 4 | 17 = %9,39 | %13,76 |
| birleşik | 414 | 2 | 22 | 5 | 29 = %7,00 | %9,43 |

Koşu #2: birleşik katı %19,6 (üst %23,7). Kapsama (elle) birleşik 120/166 = %72,3 (koşu #2 %71,7). (iii) güç hatası 10/51 güçlü araştırma maddesi. (vii) 6. Yalakalık 0 · tat 0 · jargon 0. KAPI GEÇEMEDİ (katı > %5, kapsama < %80).

Etiket dosyaları: `tests/fixtures/cev_kosu3_2026-10-26_ana.json` + `…_ana_etiket_claude.json` (CC bunları kullanabilir). `…_TAM_heldout_iceriyor.json` dosyalarını ve `tests/cev_seti_heldout.json`'u AÇMA (yalnız imza / soru sayısı). `tests/cev_seti.json` beklenen etkenlerine göre talimat / sorgu ayarı YAPMA (genel kural yaz; aşırı uyum held-out'ta ölçülür).

## Kök nedenler (yalnız ana set örnekleri)

1. **Özetleyici çekinceyi ve kapsamı düşürüyor → doğrulayıcı düşürüyor → kapsama kaybı.** Düşen 135 maddenin sorun dağılımı: kosul_atildi 41 · baglam_genellendi 25 · kesik_alinti 23 · birlestirme 15 · diğer 31. Kör etiketçiler düşenlerin 130'unu içerik olarak alıntılarda var saydı. Kapsamada bulunamayan 49 güçlü etkenin 15'i bu düşürülen maddelerdeydi (ör. C13 lipit 'can cause' → 'yol açar'; C28 sıcak saklama 'It is generally agreed' düşmüş; C31 hop saklama sıcaklığı kapsam genellenmiş).
2. **"Ayrıca" ters yönü birleştiriyor (c, 2 madde).** C12#0 ve C13#0: "Başlangıç yoğunluğu artırılınca — köpük kalıcılığını destekler (bjcp) … Ayrıca: … yüksek yoğunlukla demlenen bira daha zayıf köpük (wiley)" — tek 'güçlü' madde, iki zıt yön, çelişki olarak gösterilmiyor.
3. **Değişken + fiil şablonu anlamı ters çeviriyor (sınırda).** C17#0 "FAN … artırılınca — Daha düşük FAN içerikli şıralar daha az diasetil üretir"; C29#4 "tanen uzaklaştırılması eklenince — … şırada kalırsa burukluk"; C16#3 "polifenol ve protein eklenince" (alıntı: varlıkları/çökmeleri). C30#3: alıntı "Increased lagering temperatures …", madde yönsüz ("lagering sıcaklığı ve fermentör yüksekliği — katkıda bulunur").
4. **Güç parça destekle sayılıyor.** Doğrulayıcının `destekleyen` listesi maddenin yalnız bir parçasını söyleyen kaynakları da içeriyor: C33#0 (MDPI giderme / Wyeast önce temizlik), C16#0 (her kurum bir yarı), C12#0/C13#0 (iki kurum zıt şey söylüyor). 10/51 güçlü madde.
5. **Uygulama yedek cevabı yanıltıcı.** C16#D "bulunan kaynaklı maddelerin hiçbiri jelatinden söz etmiyor" — jelatin alıntılarda var, maddeleri doğrulayıcıda düştü.

## Görevler

**0. Ön koşul.** git pull; başka oturumun commit edilmemiş değişikliği varsa DUR. Bellek ≥ 7 GB değilse dur ve söyle (Chrome açık olabilir). AI4 denetleyicisi (2c9ebd9f-32461) ve araştırma denetleyicisi (92f59a3c-5776) DOKUNULMAZ. Puanlama metinleri, set dosyaları, imzalar DEĞİŞMEZ.

**1. Özetleyici talimatı (donmuş değil).** Kurallar ekle:
- Alıntıdaki çekince maddede korunur: may / can / could / might → "-abilir"; usually / typically / often / generally / in general → "genellikle / çoğunlukla"; "it is generally agreed" → "genel kabule göre"; tek kişinin deneyimi ("my preferred", "I found") → "bir yazara göre".
- Kapsam maddeye yazılır: stil, maya suşu, ürün adı, lager/ale, endüstriyel/ev ölçeği, deney koşulu. Kapsamı farklı değerler aynı maddeye konmaz.
- İki kaynağın parçası tek iddiada birleştirilmez; her iddia en az bir alıntıda TAMAMIYLA yazılı olmalı.
- `degisken` = biracının değiştirdiği şey (malzeme, sıcaklık, süre, miktar, işlem). Sonuç ya da ölçü (etkinlik, uzaklaştırma, oluşum) değişken olamaz. `yon` etkideki düzeyle tutarlı olmalı ("düşük X → …" ise yon azaltmak).
- Alıntı yön veriyorsa ("increased", "higher", "lower") madde yönsüz bırakılmaz.
Test: talimat metninde set örneği YOK (E2 kuralı); kural metinleri test kilidinde.

**2. Onarım turu (yeni, soru başı en çok 1 çağrı + doğrulayıcı tekrar).** Doğrulayıcı `kismi` + sorun ∈ {kosul_atildi, baglam_genellendi, birlestirme} olan maddeler için tek onarım çağrısı (özet modeli): girdi = madde + doğrulayıcının notu + yalnız o maddenin alıntıları; görev = notu gidererek yeniden yaz (çekince / kapsam ekle, birleşimi ayır) ya da `birak`. Onarılan maddeler AYNI donmuş doğrulayıcıdan ikinci kez geçer (tek çağrı, yalnız onarılanlar); destekli değilse düşer. Onarılan madde ikinci kez onarılmaz. Kayıt: `onarimHam`, `dogrulamaHam2`. kesik_alinti / yalniz_forum / yon onarılmaz.
Ölçüm (AI'sız): koşu #3 ana kesitinde onarım adayı sayısı, soru başı ortalama; maliyet tahmini (koşu #3 ölçülen çağrı başı fiyatlarla), Ayarlar'daki soru başı tahmin satırı güncellenir.

**3. "Ayrıca" yalnız aynı yön.** Aynı değişkenin ek parçası yalnız ana kısımla AYNI etki yönündeyse "Ayrıca" olur. Ters etki yönü (artırır ↔ azaltır, aynı değişken + aynı fiil) asla "Ayrıca" olmaz: çelişki adayıdır → doğrulayıcının `gercek_celiski` kararıyla ⚖️ çelişki maddesi; doğrulanmazsa `celiskiRapor`'a gider, iki taraf normal madde olarak gösterilmez. Test: koşu #3 ana kesitinin kayıtlı `ozetHam` + `dogrulamaHam`'ı ile AI'sız yeniden kurulum → C12#0 ve C13#0'da tek maddede iki zıt yön 0; diğer ana maddelerde değişen yalnız bu ikisi (fark listesi raporda).

**4. Doğrulayıcı v2 (YENİDEN DONDURMA).** Donmuş blokta:
- `destekleyen` = alıntısı maddenin TAMAMINI tek başına söyleyen kaynaklar. Yalnız bir parçayı söyleyenler ayrı `parca` listesine. Parçalar birlikte maddeyi tam karşılıyorsa madde destekli kalır ama güç = tam destekleyen kurum sayısı (0 ise "olası — parçalı destek").
- Yön denetimi: maddede değişkene uygulanan fiil (artırılınca / azaltılınca / eklenince / çıkarılınca) alıntıdaki yönle aynı olmalı; "değişken + fiil + etki" birlikte okunduğunda alıntıyla ters ya da kendi içinde çelişik anlam → kismi/yon. Alıntı yön veriyor, madde yönsüz → kismi/yon.
- Görev metninde set örneği YOK (E2). Paket içeriği değişmez (güç / kurum sayısı yine GİTMEZ, E1).
Yeni imza; önceki 5ac684b3-13526 rapora. Testler: sentetik paketler (CC'nin kendi ürettiği; ana set metinleri kullanılabilir, held-out kullanılamaz) — parça destek, ters şablon, yönsüz madde, zıt "Ayrıca" — her biri doğru kararla; bozma testleri kırmızı.

**5. Yedek doğrudan cevap dürüst.** "Sorulan X hiçbir maddede yok" durumunda: düşen maddelerde ya da alıntılarda X geçiyorsa "Kaynaklarda X geçiyor ama doğrulamadan geçen madde çıkmadı" (+ 🔎 ayrıntıda düşenler); hiç geçmiyorsa bugünkü cümle. Test: C16 kayıtlı verisiyle yeni cümle.

**6. Değişmeyenler + rapor.** Kural yolu 12 soru çıktısı birebir (parmak izi d30af8de). G seti / tuzak / DOG4B–H parmak izleri birebir. Mock tam tur 55 soru (onarım dahil). Maliyet: soru başı + 55 soru tavanı. npm test --parca. Commit + push + canlı md5 + imzalar + anahtar 0. CLAUDE.md'ye durum satırı (1j3p). ŞÜPHELER.

## Sonraki koşu

CEV koşusu #4 = ana 34 + held-out 1 (21), puanlama aynı (cev_seti EK 2). Kapı geçerse 'erken test' kalkmadan önce TAZE held-out 2 ile onay koşusu (Claude kurar, CC görmez).
