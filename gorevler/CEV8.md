# CEV8 — araştırma modu: değer atfı niteleyicisi, kapsama turu, kesik / öznesiz işaret düzeltmesi (gerçek koşu YOK)

Claude, 2026-10-29. CEV koşusu #7 (kosuId 1793267582911, Opus 5.5, 55 soru, 17,34 $, doğrulayıcı 6d7e6c6e-35582) Claude tarafından etiketlendi: birleşik KATI 16/427 = %3,75 (üst %5,64 > %5) · kapsama elle 132/166 = %79,5 (< %80) → KAPI GEÇEMEDİ, iki koşul da sınırda. Koşu #6: 18/438 (üst %6,03), 128/166. Ana kesiti etiketi: `tests/fixtures/cev_kosu7_2026-10-29_ana_etiket_claude.json` + kayıt `tests/fixtures/cev_kosu7_2026-10-29_ana.json` (okunabilir). Held-out dosyalarını AÇMA.

CEV7'nin tuttuğu: düşen `kesik_alinti` 27 → 9, tek madde başlığı tür hatası 3 → 0, düşen madde 62 → 39, gösterilende (c + sınırda) 14 / 385.

Ölçülen kaynaklar (Claude, koşu #7 tam kaydı):

- **Değer atfı (katı hataların 3'ü, hepsi `c`).** "(değer: kurum)" listesinde kurum, değerin NİTELEYİCİSİNİ söylemeyen alıntıya bağlanıyor. Ana kesitte: C19#0 "pilsner maltında standart 60 dakikadan uzun: brulosophy.com, crispmalt.com" — Crisp alıntısı "Boil for a minimum 60min" (en az 60 ≠ 60'tan uzun; üstelik pilsner demiyor); C23#2 ">1: beerandbrewing.com, mdpi.com" — Beer & Brewing alıntısı yalnız "2:1 or higher". Held-out'ta aynı sınıftan 1 tane daha. Kod okuması (Claude, CEV6 kodu): `C.ifadeEs` niteleyiciyi YALNIZ madde tarafında `alt`/`ust` ise karşılaştırıyor (niteleyicisiz parça niteleyicili alıntıya, `yak` her şeye bağlanıyor); `C.NIT_SONRA` Türkçe ek niteleyicileri tanımıyor ("15 °C altı", "60 dakikadan uzun / fazla / kısa / az"); `C.degerIfadeler` "2:1" oranını iki ayrı sayı okuyor ("1 or higher" → `1 alt`). Bu üç hata düzelseydi katı 13/427, üst %4,80.
- **Kapsama (kaçan 34 güçlü etken).** Katlı 3, düşen 2, cevapta yok 29. Web alıntılarıyla karşılaştırma (kör ajan + Claude): 9'u bir alıntıda AÇIKÇA var, 17'si yalnız kesik / öznesiz alıntıda, 8'i web'de yok. Açık 9'un özetleyicinin `kullanilmayan` alanındaki nedeni: `konu_disi` 3 (ana: C13 laktozun mayalanmadığını söyleyen alıntı — sorunun konusu laktoz; C23 kalsiyum klorürün dolgunluk verdiğini söyleyen alıntı), `baska_maddede` 3 (ana: C26 "serin başla, sonra serbest yükselsin", C27 "maya suşları fusel üretiminde farklıdır" — bu iddialar HİÇBİR maddede yok), `kesik` 1 (C24: kesilmeden önceki önerme tam — "en az iki hafta 15–25 °C"), maddede ama katlı / düşen 2. Yani `kullanilmayan` gerekçesi güvenilir değil: kural (15) `kesik`'i tam önermesi olan alıntı için de geçerli neden sayıyor, `baska_maddede` denetlenmiyor.
- **Sınır dolu ve aynı etken tekrarı.** Özetleyici 43 sorunun 41'inde 8 madde yazdı (sınır), gösterilen 6. Yuvalar aynı etkenin varyantlarına gidiyor (ana: C08'de 8 maddenin 5'i kristal malt türü — "kristal malt", "koyu kristal kullanım oranı", "Special B", "Kristal 80 + 120 + Special B", "Dark Crystal"; C16'da 5 jelatin maddesi); farklı etkenler katlıya düşüyor ya da hiç yazılmıyor.
- **Zamir işareti yanlış pozitif.** `[ÖZNE ALINTIDA YOK]` kukla özneyi ("It is recommended …", "It's best to …"), "That said, …" bağlacını ve gösterme sıfatı + isim ("This yeast …", "These strains …"; sayfa başlığı ürünü adlandırıyor) de işaretliyor. Özetleyici 126 alıntıyı `ozne_yok` diye kullanmadı.
- **Güç hatası 2/34 (kapı ölçütü değil, raporlanır).** İki güçlü maddede ikinci "kurum" brulosophy.com (`C.ALAN_TUR` → `deney`, sayılır) — ama alıntılar deney sonucu değil, makale metni (ana: C29#0 "off-flavor series" yazısı; C20#0). CEVAP İLKESİ "kontrollü deney" sayar; deney olmayan yazı dergi gibidir. Koşu #6 H15#0 aynı sınıf.
- **Bağlam genellemesi (gösterilen 3 sınırda).** Başka içecek rehberinden (bal şarabı) ya da tek bir okurun sistemine verilen uzman cevabından alınan alıntı, bağlamı yazılmadan genel kural gibi sunuldu (ana: C33#5). Başlık / URL pakette var.
- **Küçük:** "wort" 5 maddede kaldı: `C.WORT_EK` iyelik + hâl eklerini ("wort'undaki", "wort'undan", "wort'unu") yanlış çeviriyor ("şıranındaki" → doğrusu "şırasındaki").

## Kurallar

- **Ön koşul:** git pull. Başka oturumun commit edilmemiş değişikliği varsa DUR. Bellek 6 GB altındaysa söyle.
- Set dosyaları, set imzaları, puanlama metinleri DEĞİŞMEZ. `tests/cev_seti_heldout.json` ve `tests/fixtures/*TAM_heldout_iceriyor*` AÇILMAZ.
- cev_seti beklenen listelerine göre ayar YOK; beklenen listeleriyle kapsama ölçümü YAPMA (yalnız Claude ölçer). Görev metinlerine set sorusu, set alıntısı ya da set örneği GİRMEZ (E2) — kurallar örneksiz, genel tanımla.
- AI4 (2c9ebd9f-32461) ve araştırma denetleyicisi (92f59a3c-5776) DOKUNULMAZ. Doğrulayıcı (6d7e6c6e-35582) bu sprintte DEĞİŞMEMELİ — madde 1–6'nın hepsi blok dışı; değişmesi gerekirse önce gerekçe yaz, yeniden dondur, imzayı raporla.
- Gerçek API çağrısı YOK (mock + kayıtlı koşu kayıtları).

## Maddeler

**1. Değer atfı niteleyicisi (blok dışı: `C.degerIfadeler`, `C.ifadeEs`, `C.NIT_*`).**
- Karşılaştırma SİMETRİK: parçanın ve alıntının niteleyicisi aynı olmalı (`alt` ↔ `alt`, `ust` ↔ `ust`); niteleyicisiz ile `yak` birbirine denk sayılabilir, ama `alt` / `ust` niteleyicisiz ya da `yak` ile EŞLEŞMEZ — iki yönde de.
- Türkçe ek niteleyiciler: sayı (+ birim) ardından "-dan / -den / -tan / -ten" + uzun / fazla / çok / yüksek / büyük / sıcak → `alt`; + kısa / az / düşük / küçük / soğuk → `ust`; "altı / altında / aşağısı" → `ust`; "üstü / üzeri / üstünde" (var). İngilizce tarafta eksik varsa ekle ("minimum" var; "or longer / or more" var).
- Oran "a:b" (ve "a/b" oran bağlamında) TEK ifade (değer a/b, tür `oran`); "a:b or higher" → oran `alt`. Oran ile düz sayı eşleşmez.
- Ölçüm (ana kesit, kayıtlı özet + doğrulayıcı kararlarıyla AI'sız yeniden kurulum): C19#0 ve C23#2 atıfları düzelir (niteleyicisi tutmayan kurum parçadan düşer; parçayı söyleyen kurum kalmazsa parça atıfsız); TÜM atıflarda değişen sayısı + listesi (kaybedilen doğru atıf var mı — tek tek raporla).

**2. Kullanılmayan alıntı gerekçesi (özetleyici kuralı + şema, blok dışı).**
- Kural (15) düzelt: `kesik` gerekçesi yalnız kesilmeden ÖNCE tam önerme YOKSA geçerli; kesilmeden önce tam önerme varsa alıntı kullanılır (kural (14) ile aynı ölçüt).
- `baska_maddede` gerekçesi hangi maddede söylendiğini de verir (şemada `madde` numarası). Uygulama denetler: o madde yoksa ya da o maddenin kaynaklarında bu alıntı yoksa kayda `baska_maddede_dayanaksiz` sayısı yazılır (görünür değil); bu alıntılar madde 3'ün girdisine girer.

**3. KAPSAMA TURU (yeni çağrı, blok dışı; özetten SONRA, doğrulayıcıdan ÖNCE).**
- Girdi: soru konusu (C.tarafsiz ile, soru metni gitmez — mevcut özet girdisiyle aynı ilke), özetin maddeleri (numaralı: değişken — etki, tek satır), ve hiçbir maddede kaynak olmayan alıntılar (forum ve yinelenen hariç; `konu_disi`, `kesik`, `ozne_yok`, `baska_maddede` gerekçeliler DAHİL), işaretleriyle ve başlıklarıyla.
- Görev (örneksiz): (a) bu alıntılardan, listedeki maddelerin HİÇBİRİNDE olmayan bir etken (biracının değiştirebileceği bir şey ya da teşhiste kullanılan bir belirti) söyleyenler varsa EN ÇOK 4 yeni madde — özet şemasının aynısı, aynı kurallar (14) dahil; yoksa boş. (b) listedeki maddelerden AYNI etkenin varyantı olanları gruplar (`ayni_etken: [[i, j, …], …]`) — "aynı etken" = biracının değiştirdiği aynı şey (aynı malzeme ailesi, aynı işlem adımı), yalnız sözcük benzerliği değil.
- Yeni maddeler aday havuzuna eklenir ve AYNI doğrulayıcı çağrısından geçer (ayrı doğrulayıcı çağrısı yok); onarım turu aynen.
- Gösterim: `ayni_etken` grubunda gösterilen 6'ya yalnız sıralamada en üstteki girer, diğerleri katlıya (metin birleştirilmez, silinmez). Grup bilgisi geçersizse (numara yok / tek elemanlı) yok sayılır. Sıralama kuralı (C.sirala) başka değişmez.
- Maliyet: yeni çağrı token tahmini (VARSAYIM yaz: girdi ≈ kullanılmayan alıntılar + madde listesi); doğrulayıcı girdisi büyür. Soru başı ve 55 soru tavanı yeni değerle; koşu #7 ölçümü (özet çağrısı ortalaması) ile kıyasla.
- Ölçüm (AI'sız yapılabilen): ana kesitte kayıtlı özetle kapsama turu girdisinin boyutu (soru başı alıntı sayısı, karakter); mock tam tur.

**4. Zamir işareti (blok dışı: `C.alintiIsaret`).** Kukla özne ("It is / It's / It was" + sıfat ya da edilgen + "to / that"), "That said" / "That is" bağlaçları ve gösterme sıfatı + isim ("This / These / That / Those" + isim; isim = ardından gelen sözcük fiil / yardımcı fiil / edat değil) `ÖZNE ALINTIDA YOK` almaz. Gerçek zamir (it / they / this / these … + fiil ya da noktalama) alır. Ölçüm: koşu #7 ana kesitinde işaret alan alıntı sayısı önce / sonra, değişenlerin listesi (ilk 20) — elle bak, yanlış negatif var mı.

**5. Güç: `deney` sınıfı yalnız deney sayfası (blok dışı: `C.kaynakTur`).** brulosophy.com yalnız URL yolunda "exbeeriment" geçen sayfada `deney`; diğer sayfaları `dergi`. Ölçüm: koşu #7 ana kesitinde (kayıtlı kararlarla) güçlü → olası düşen maddeler listesi.

**6. Bağlam (özetleyici kuralı, blok dışı).** Alıntının başlığı / URL'si başka bir içecekle (bal şarabı, elma şarabı, şarap, damıtık içki) ya da tek bir okurun sorusuna verilen uzman cevabıyla ilgiliyse madde bu bağlamı yazar (genel kural gibi sunmaz). Örneksiz kural; E2 denetimi.

**7. Küçük: `C.WORT_EK` iyelik eki.** "wort'u" (belirtme) → "şırayı", "wort'unun" → "şırasının", "wort'unu" → "şırasını", "wort'una" → "şırasına", "wort'unda" → "şırasında", "wort'undan" → "şırasından", "wort'undaki" → "şırasındaki"; mevcut doğru biçimler aynen (test tablosu).

**8. Test + kayıt.**
- Sentetik (kasıtlı bozmalı): niteleyici simetrisi (alt ↔ yok, ust ↔ yak, yak ↔ yok), Türkçe ekler, oran; `baska_maddede` dayanaksız sayımı; kapsama turu şeması + `ayni_etken` gösterimi (geçersiz grup yok sayılır); zamir / kukla özne / gösterme sıfatı; brulosophy sınıfı; wort ekleri.
- Ana kesit yeniden kurulumu: madde 1, 4, 5 ölçümleri; kural yolu parmak izi d30af8de aynen; mock 55 soru tam tur (kapsama turu dahil); npm test (--parca).
- Commit + push (sw.js CACHE_VERSION +1), canlı md5, üç imza (üçü de AYNI olmalı), anahtar taraması 0.
- CLAUDE.md'ye "1j3t" satırının sonuna "CEV8 DURUM" ekle. Rapora ŞÜPHELER bölümü.

## Sonra

Claude CEV8 doğrulaması (sentetik + koşu #7 kayıtlarıyla) → CEV koşusu #8 (ana + held-out 1, Kaan'ın düğmesi). Kapı geçerse TAZE held-out 2 ile onay koşusu.
