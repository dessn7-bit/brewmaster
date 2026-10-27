# CEV6 — araştırma modunda kalan doğruluk açıkları (gerçek koşu YOK)

Claude, 2026-10-27. CEV koşusu #5 (kosuId 1793108323940, Opus 5.5, 55 soru, 15,87 $, doğrulayıcı 7ef54d16-26640) Claude tarafından etiketlendi: birleşik KATI 18/437 = %4,12 (üst %6,05 > %5) · kapsama elle 127/166 = %76,5 (< %80) → KAPI GEÇEMEDİ. Koşu #4: katı 12/407 (üst %4,73), kapsama 116/166. Kapsama ve güçlü madde sayısı arttı (güçlü 2 → 33), ama gösterilen yanlış / sınırda madde sayısı da arttı.

18 hatalı maddenin sınıfları (ayrıntı: Claude'un etiket dosyası; CC held-out etiket dosyasını AÇMAZ, ana kesiti `tests/fixtures/cev_kosu5_2026-10-27_ana_etiket_claude.json` okunabilir):

- **Aynı değişkende farklı değerler "Ayrıca" ile tek maddede** (3). Uygulama aynı değişken anahtarlı maddeleri doğrulamadan ÖNCE birleştiriyor; değerler çakışmıyor ya da karşılaştırılamıyorsa (farklı birim) bu bir değer farkıdır, "Ayrıca" değil. Doğrulayıcı aday OLMAYAN birleşik maddelere de taraf + `celiski_turu` döndürüyor ve uygulama bunu YOK SAYIP maddeyi normal "Ayrıca" maddesi olarak gösteriyor: ana kesitinde bir `baglam` maddesi; held-out'ta (Claude ölçtü, dosyayı AÇMA) bir `deger_farki` ve iki taraf destekli bir `gercek_celiski: true` maddesi — sonuncusu kullanıcıya çelişki işareti olmadan "Ayrıca" ile gösterildi. Ölç: koşu #5 ana kesitinde `dogrulamaHam` içinde aday olmayan ama `gercek_celiski` true ya da `celiski_turu` ≠ yok dönen maddeler ve kartta nasıl göründükleri. Birleşik maddenin gücü iki farklı değerin kaynaklarından sayılınca yanlış "güçlü" de çıkıyor.
- **Değer atfı** (2 + 1 etki atfı). Başlıktaki "(değer: kurum)" listesinde, alıntısı o değeri SÖYLEMEYEN kurum var: bir kurum "60–90" derken "en az 90: …, <o kurum>" yazılmış; "1–2 gün" diyen kurum "iki gün"e bağlanmış. Atıf sayı eşleşmesiyle gevşek kuruluyor gibi — CC kodda nerede kurulduğunu bulsun.
- **Ayrık ikili / koşul düşmesi** (5): alıntı "A ya da B" ya da "eğer … ise A" derken madde ya da doğrudan cevap yalnız A'yı tek / baskın neden gibi sunuyor, ya da koşulu atıyor.
- **Ağırlık sözcüğü** (2): doğrudan cevap "çoğunlukla / genellikle X'ten kaynaklanır" diyor; alıntıda aynı özneye bağlı sıklık / ağırlık ifadesi yok.
- **Sıklık / oran anlamı** (1): alıntıdaki sıklık ifadesi Türkçeye farklı sıklıkla çevrildi (anlam değişti; sayı aynı kaldığı için hiçbir denetim yakalamadı).
- **Birleştirme / bağlam** (2) ve düşen ters yön (2) — bu sprintte kapsam dışı.

Kapsama tarafında: üst kısımda aynı etken ailesi birden çok yuva kaplıyor (aynı tür malzemenin üç ayrı maddesi, aynı işlemin üç ayrı sıcaklık maddesi), farklı etkenler katlı Ayrıntılar'a düşüyor ya da hiç özetlenmiyor. Onarım iyi çalıştı (23 soru, 29 aday → 39 yeni madde, hepsi gösterildi; kesik alıntı düşenlerinin 19/22'si yeniden yazıldı).

## Kurallar

- **Ön koşul:** git pull. Başka oturumun commit edilmemiş değişikliği varsa DUR. Bellek 6 GB altındaysa söyle.
- Set dosyaları, set imzaları, puanlama metinleri DEĞİŞMEZ. `tests/cev_seti_heldout.json` ve `tests/fixtures/*TAM_heldout_iceriyor*` AÇILMAZ.
- cev_seti beklenen listelerine göre ayar YOK. Görev metinlerine set sorusu, set alıntısı ya da set örneği GİRMEZ (E2) — kurallar örneksiz, genel tanımla yazılır.
- AI4 (2c9ebd9f-32461) ve araştırma denetleyicisi (92f59a3c-5776) DOKUNULMAZ. Doğrulayıcı (7ef54d16-26640) madde 3 için değişir → YENİDEN DONDUR, yeni imzayı raporla.
- Gerçek AI çağrısı YOK. Ölçümler koşu #5 ANA kesitinin kayıtlı `ozetHam` / `dogrulamaHam` / `onarimHam` / `dogrulamaHam2`'siyle AI'sız.

## Görev

**1. Farklı değerli aynı değişken "Ayrıca" olmaz (donmuş blok dışı).**
- Aynı değişken anahtarlı iki madde birleştirilirken iki değer de doluysa ve (a) aralıklar ayrıksa ya da (b) birimler / ölçü türü farklı olduğu için karşılaştırılamıyorsa → birleştirme YOK; çelişki adayı (değer tipi) olarak doğrulayıcıya gider, başlık CEV5B türünden gelir (`deger_farki` → "kaynaklar farklı değer veriyor — …"). Çakışan / eşit / biri boş → bugünkü gibi.
- Doğrulayıcı bir madde için `gercek_celiski: true` ya da `celiski_turu` ≠ `yok` döndürürse ve taraflar destekliyse, uygulama o maddeyi aday olarak işaretlemiş olsun olmasın ÇELİŞKİ / tek madde kuralıyla gösterir (CEV5B kalıpları). Normal "Ayrıca" maddesi olarak gösterilmez. Taraf bilgisi yoksa madde gösterilmez + rapor.
- Güç: farklı değerli taraflardan oluşan madde en zayıf tarafın gücünü alır (CEV5B kuralı aynen).
- Ölçüm: koşu #5 ana kesitinde değişen maddeler (önce → sonra), başka soruda değişen var mı.

**2. Değer atfı yalnız tam eşleşmeyle (donmuş blok dışı).**
- "(değer: kurum)" listesindeki her kurumun en az bir alıntısı o değer parçasını (";" ile ayrılan her parça ayrı) TAM söylemeli: parçadaki sayıların kümesi alıntıdaki ilgili sayı kümesine eşit (İngilizce sayı sözcükleri rakama çevrilir; °F ↔ °C, hafta ↔ gün çevirileri CEV3 kuralıyla) VE niteleyici uyumlu ("en az / at least" ↔ alt sınırı farklı bir aralık uyumsuz; "en çok / up to / maximum" ↔ üst sınır).
- Eşleşen kurum yoksa o parça kurum adı olmadan yazılır (yanlış atıf yerine atıfsız).
- Ölçüm: koşu #5 ana kesitinde atfı değişen başlıklar (önce → sonra) ve atfı düşen parça sayısı.

**3. Doğrulayıcı üç yeni denetim (DONMUŞ BLOK → yeniden dondur).** Görev metnine örneksiz tanım:
- `kosul_atildi` tanımı genişler: alıntı birden çok nedeni "ya da / veya / or" ile bağlarken maddenin bunlardan yalnız birini tek ya da baskın neden gibi sunması; alıntıdaki koşulun ("eğer / when / if / provided") düşmesi.
- Yeni `sorun: "agirlik"`: madde ya da doğrudan cevap "çoğunlukla / genellikle / en sık / başlıca / çoğu" gibi bir sıklık-ağırlık sözcüğü kullanıyor ama destekleyen alıntıda aynı özneye bağlı karşılığı (often / usually / most / generally / typically / commonly) yok → `kismi`.
- Yeni `sorun: "anlam"`: sayı, sıklık, oran ya da birim ifadesinin anlamı alıntıdakinden farklı (sayı aynı olsa bile) → `desteksiz`.
- `kosul_atildi` ve `agirlik` onarıma girer (mevcut onarım kuralı); `anlam` onarıma GİRMEZ.
- Paket güç / kurum sayısı taşımaz (E1) aynen; görev metninde set örneği yok (E2) — CC metni 6 sözcüklük dizi eşleşmesiyle set + koşu #3/#4/#5 metinlerine karşı tarar (0 olmalı).
- Eski kayıt (yeni sorun türleri yok) bugünkü gibi işlenir.

**4. Özetleyici kuralları (C.OZET_KURAL4'e ek, örneksiz).**
- Alıntı nedenleri "ya da / or" ile bağlıyorsa hepsini aynı maddede yaz; birini tek neden yapma. Alıntıdaki koşulu maddeye taşı.
- Alıntıda sıklık-ağırlık ifadesi yoksa "çoğunlukla / genellikle" yazma; varsa alıntıdakini birebir çevir. Sıklık ve oran ifadelerini anlamıyla birebir çevir.
- Aynı etken ailesini (aynı tür malzeme, aynı işlemin farklı değerleri) tek maddede topla; farklı etkenleri ayrı maddelere ayır — en çok sekiz maddede mümkün olan en çok FARKLI etkeni ver.
- Test kilidi yenilenir, yeni kilit raporlanır; E2 taraması 0.

**5. Küçük: kart üst metninde uygulama iç terimi.** Koşu #5'in jargon taramasında bir kart üst metninde "iskelet" geçti (uygulamanın iç terimi). Kaynağını bul, kullanıcıya sade sözcükle göster ("stilin tipik malt dağılımı" gibi); jargon taraması tüm kural kartlarında 0.

**6. Test + kayıt.**
- Sentetik (kasıtlı bozmalı): ayrık / karşılaştırılamaz değerler → aday; çakışan → Ayrıca; doğrulayıcı aday dışı maddede gercek_celiski true → çelişki gösterimi; değer atfı tam / kısmi / niteleyici uyumsuz / sayı sözcüğü; doğrulayıcı yeni sorun türleri (agirlik / anlam / genişlemiş kosul_atildi) → karar ve onarım uygunluğu.
- Kural yolu parmak izi d30af8de aynen, mock 55 soru tam tur, npm test (--parca).
- Maliyet satırı: şema / görev metni değişikliği tahmini değiştiriyorsa yaz (VARSAYIM).
- Commit + push (sw.js CACHE_VERSION +1), canlı md5, üç imza (AI4 / araştırma aynı, doğrulayıcı yeni), anahtar taraması 0.
- CLAUDE.md 1j3r satırının sonuna "CEV6 DURUM" ekle. Rapora ŞÜPHELER bölümü.

## Sonra

Claude CEV6 doğrulaması (sentetik + koşu #5 kayıtlarıyla) → CEV koşusu #6 (ana + held-out 1, Kaan'ın düğmesi). Kapı geçerse TAZE held-out 2 ile onay koşusu.
