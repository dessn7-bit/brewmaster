# CEV7 — araştırma modu: kesik alıntı, tek madde başlığı, bağımsız iddia ve kullanılmayan alıntı (gerçek koşu YOK)

Claude, 2026-10-28. CEV koşusu #6 (kosuId 1793131362637, Opus 5.5, 55 soru, 16,71 $, doğrulayıcı 33762479-30573) Claude tarafından etiketlendi: birleşik KATI 18/438 = %4,11 (üst %6,03 > %5) · kapsama elle 128/166 = %77,1 (< %80) → KAPI GEÇEMEDİ. Koşu #5: 18/437 (üst %6,05), 127/166. Gösterilende c 2 → 0 (CEV6 değer atfı / ağırlık düzeltmeleri tuttu), ama hata sayısı yerinde kaldı. Ana kesiti etiketi: `tests/fixtures/cev_kosu6_2026-10-27_ana_etiket_claude.json` (okunabilir). Held-out dosyalarını AÇMA.

Ölçülen kaynaklar (Claude, koşu #6 tam kaydı):

- **Kesik alıntı.** Web arama aracının `cited_text` alanı ~150 karakterde kesiliyor: 1297 alıntının 614'ü (%47) "..." ile bitiyor, 89'u zamirle (this / it / they / these / that / such / which) başlıyor. Özetleyici kesik ya da öznesi alıntıda olmayan cümleden madde yazıyor: düşen 64 maddenin 28'i `kesik_alinti`; içerik olarak YANLIŞ 5 düşen maddenin 3'ü öznesi belirsiz / yüklemi kesik alıntıdan (ters yön ya da alıntıda olmayan özne), gösterilen sınırdaların 1'i kesik bağlamdan.
- **Tek madde başlığı.** CEV5B kalıpları ("farklı koşulda: …", "kaynaklar farklı değer veriyor — …") 3 gösterilen maddede yanlış iddia kurdu: iki taraf aynı koşulda (aynı hedef, aynı işlem) ya da farklı amaçlar için verilen değerler. Doğru olan 2 kullanımda da taraf metinleri kendi koşulunu zaten taşıyordu. "azı da fazlası da sorun olabilir" (optimum) kullanımları doğru.
- **Bağımsız iddianın tek maddeye gömülmesi.** Held-out bir soruda özetleyici 8 maddenin 7'sini aynı değişken adıyla yazdı; kartta optimum tek maddesi + "Ayrıca" ile 3 parça daha → güç "iki tarafın zayıf olanı" (olası, n 0). İçindeki bir parçayı 3 kurum tam destekliyordu; ayrı madde olsaydı güçlü görünecekti, kapsamada da 1 etken kayboldu.
- **Doğrulayıcının kaçırdıkları (gösterilen 13 sınırda).** Alıntıda olmayan ek nitelik / koşul / kıyas nesnesi (2), çekince düşmesi (alıntıda "may", "tradition has it", "inappropriate use" türü sınırlama maddede yok) (3), sözcük anlamı kayması (flavor → aroma) (1), değişkeni gösterme sözcüğüyle belirsiz madde ("bu birleşim") ya da alıntıdaki kavramdan farklı değişken (2), birleştirme (1), tür başlığı (3), kesik bağlam (1).
- **Kapsama.** Kaçan 38 güçlü etkenin: 7'si katlı Ayrıntılar'da, 5'i düşende, 26'sı cevapta hiç yok. O 26'nın 11'i web alıntılarında AÇIKÇA var ve 10'u özetleyicinin ham çıktısında hiç madde olmamış (özetleyici o alıntıyı kullanmamış); 11'i yalnız kesik / kısmi alıntıda; 4'ü web'de yok.

## Kurallar

- **Ön koşul:** git pull. Başka oturumun commit edilmemiş değişikliği varsa DUR. Bellek 6 GB altındaysa söyle.
- Set dosyaları, set imzaları, puanlama metinleri DEĞİŞMEZ. `tests/cev_seti_heldout.json` ve `tests/fixtures/*TAM_heldout_iceriyor*` AÇILMAZ.
- cev_seti beklenen listelerine göre ayar YOK; beklenen listeleriyle kapsama ölçümü YAPMA (yalnız Claude ölçer). Görev metinlerine set sorusu, set alıntısı ya da set örneği GİRMEZ (E2) — kurallar örneksiz, genel tanımla.
- AI4 (2c9ebd9f-32461) ve araştırma denetleyicisi (92f59a3c-5776) DOKUNULMAZ. Doğrulayıcı (33762479-30573) madde 2 ve 4 için değişir → YENİDEN DONDUR, yeni imzayı raporla.
- Gerçek AI çağrısı YOK. Ölçümler koşu #6 ANA kesitinin (`tests/fixtures/cev_kosu6_2026-10-27_ana.json`) kayıtlı `ozetHam` / `dogrulamaHam` / `onarimHam` / `dogrulamaHam2`'siyle AI'sız. Önce CEV7 kapalıyken kayıtla 22/22 birebir yeniden kurulum.

## Görev

**1. Kesik ve öznesiz alıntı işareti (donmuş blok dışı; özet, onarım ve doğrulayıcı paketlerine aynı işaret).**
- Alıntı metni "..." / "…" ile bitiyorsa ya da cümle sonu noktalaması olmadan bitiyorsa paket satırına `[KESİK]`; ilk sözcüğü zamirse (İngilizce: this, it, they, these, those, that, such, which, he, she; Türkçe karşılıkları) `[ÖZNE ALINTIDA YOK]`.
- Özetleyici kuralı (C.OZET_KURAL4'e, örneksiz): `[KESİK]` alıntıda yalnız kesilmeden ÖNCE tamamlanmış önerme kullanılır; kesik yüklemden ya da kesilen yerden sonra gelebilecek şeyden madde yazılmaz. `[ÖZNE ALINTIDA YOK]` alıntının öznesi başka bir alıntıdan ya da sorudan tamamlanmaz; öznesi okunmuyorsa o alıntıdan madde yazılmaz.
- Doğrulayıcıya: işaretli alıntı, maddenin işaretin yasakladığı kısmını destekleyemez (kesik kısım / alıntıda olmayan özne → `kesik_alinti`, mevcut sorun türü).
- Ölçüm: koşu #6 ana kesitinde işaretlenen alıntı sayısı (iki tür ayrı); kayıtlı düşenlerden `kesik_alinti` olanların kaçının dayanağı işaretli alıntı. İşaret metninin paket boyunu ne kadar büyüttüğü (karakter).

**2. Tek madde başlığı yalnız optimumda (DONMUŞ BLOK → yeniden dondur).**
- `celiski_turu` `optimum` → "azı da fazlası da sorun olabilir — t1; t2" aynen.
- `baglam`, `deger_farki`, `farkli_sonuc` → başlıksız tarafsız kalıp "t1; t2" (her taraf kendi kurumuyla; taraf metinleri koşullarını zaten taşıyorsa onlar görünür). Uygulama iki tarafın ilişkisi hakkında iddia KURMAZ.
- `gercek` (⚖️) ve güç kuralları aynen.
- Ölçüm: koşu #6 ana kesitinde değişen başlıklar (önce → sonra), başka değişen yok.

**3. Tek madde yalnız taraflardan oluşur (donmuş blok dışı ise dışında, içindeyse madde 2 ile aynı dondurmada).**
- Optimum / bağlam / değer farkı tek maddesine, çelişki taraflarından OLMAYAN aynı değişkenli parçalar "Ayrıca" ile EKLENMEZ: kendi doğrulama kararı ve kendi gücüyle ayrı madde olarak kalır (CEV4C kuralı: farklı iddianın gücü ayrı sayılır).
- "Ayrıca" ile birleşen normal maddede ana iddianın gücü CEV4C ile aynen; ama birleşen parça, ana maddeden DAHA GÜÇLÜ desteklenmişse (tam destekleyen kurum sayısı fazla) birleştirme yapılmaz, ayrı madde kalır.
- Ölçüm: koşu #6 ana kesitinde ayrılan maddeler (önce → sonra, güçleri) ve gösterilen 6'nın değişimi.

**4. Doğrulayıcı: iki yeni sorun türü + çekince (DONMUŞ BLOK → madde 2 ile aynı dondurma).** Örneksiz tanım:
- Yeni `sorun: "ek"`: madde ya da doğrudan cevap, destekleyen alıntılarda karşılığı olmayan bir nitelik, koşul, zaman, sıcaklık, kıyas nesnesi ya da kapsam ekliyor → `kismi`, ONARILIR (onarım: eklenen kısmı çıkar).
- Yeni `sorun: "degisken"`: maddenin değişkeni gösterme sözcüğüyle belirsiz ("bu / şu / o" + ad, adı alıntıda geçmeyen birleşim) ya da alıntıdaki kavramla aynı olduğu alıntıdan okunmuyor → `desteksiz`, onarılmaz.
- `kosul_atildi` tanımına çekince: alıntıdaki olasılık / sınırlama ifadesi (may, might, can, some, tradition, inappropriate / improper / excessive use gibi kullanım koşulu) maddeye taşınmamış → `kosul_atildi` (mevcut, onarılır).
- `anlam` tanımına: alıntıdaki duyusal / teknik terimin daha geniş ya da farklı bir terimle çevrilmesi (anlamı değiştiriyorsa).
- Paket güç / kurum sayısı taşımaz (E1) aynen; görev metninde set örneği yok (E2) — 6 sözcüklük dizi taraması set + koşu #3–#6 metinlerine karşı 0.
- Eski kayıt (yeni sorun türleri yok) bugünkü gibi işlenir.

**5. Kullanılmayan alıntı (özetleyici şeması; donmuş blok dışı).**
- Özetleyici şemasına `kullanilmayan: [{id, neden}]` (neden enum: `konu_disi`, `kesik`, `ozne_yok`, `baska_maddede`, `forum`, `yinelenen`): maddelerde kaynak olarak geçmeyen HER alıntı ya burada gerekçesiyle ya da bir maddede. Uygulama denetler: ikisinde de olmayan alıntı sayısı kayda yazılır (görünür değil).
- Özetleyici kuralı: konu dışı olmayan, kesik ya da öznesiz olmayan ve başka maddede söylenmeyen bir alıntı, en çok 8 madde sınırı dolmadıkça kullanılmadan bırakılmaz; sınır doluysa en az alıntıyla desteklenen maddeyle yer değiştirmesi değerlendirilir (aynı etken ailesi CEV6 (12) kuralıyla tek maddede).
- Sıralama (C.sirala): aynı güçte, maddeyi destekleyen ya da parçasını destekleyen alıntıların FARKLI kurum sayısı fazla olan önce (bugün yalnız tam destekleyen sayılıyor — CC kodda doğrulasın, farklıysa raporla). Kural yolu (urller yok) aynen.
- Ölçüm: koşu #6 ana kesitinde kayıtlı özette hiçbir maddede kaynak olmayan alıntı sayısı ve oranı (soru başı ortalama; 4 sınıf ayrı); sıralama kuralının gösterilen 6 ↔ katlı yer değiştirmesi. Beklenen listelerine BAKMA.
- Maliyet: şema alanı özet çıktısını büyütür → özet token tahminini güncelle (VARSAYIM yaz).

**6. Küçük:** madde metninde İngilizce "wort" (koşu #6: 6 madde; özetleyici çıktısı) → C.sade "şıra" (ek uyumlu); jargon taraması 0.

**7. Test + kayıt.**
- Sentetik (kasıtlı bozmalı): kesik / öznesiz işaret (rakam, tırnak, Markdown satırı, Türkçe zamir); optimum başlığı kalır, diğer üç tür tarafsız; tek maddeye taraf olmayan parça eklenmez; daha güçlü parça ayrı kalır; `ek` → kismi + onarım adayı, `degisken` → desteksiz onarımsız, çekince → kosul_atildi; `kullanilmayan` eksik / fazla / bilinmeyen kimlik; sıralama.
- Kural yolu parmak izi d30af8de aynen, mock 55 soru tam tur, npm test (--parca).
- Commit + push (sw.js CACHE_VERSION +1), canlı md5, üç imza (AI4 / araştırma aynı, doğrulayıcı yeni), anahtar taraması 0.
- CLAUDE.md 1j3s satırının sonuna "CEV7 DURUM" ekle. Rapora ŞÜPHELER bölümü.

## Sonra

Claude CEV7 doğrulaması (sentetik + koşu #6 kayıtlarıyla) → CEV koşusu #7 (ana + held-out 1, Kaan'ın düğmesi). Kapı geçerse TAZE held-out 2 ile onay koşusu. CEV7 kesik alıntı sorununu çözmezse sonraki kaldıraç: kesik alıntının sayfasından tam cümleyi almak (web_fetch sunucu aracı; maliyet ayrıca ölçülür).
