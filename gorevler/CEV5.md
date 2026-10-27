# CEV5 — kapsama: sorgu stili, kesik alıntı onarımı, gizlenen taraflar, güç (gerçek koşu YOK)

Claude, 2026-10-27. CEV koşusu #4 (kosuId 1793087313536, Opus 5.5, 55 soru, 14,76 $) Claude tarafından etiketlendi (CLAUDE.md 1j3q; etiket dosyası `tests/fixtures/cev_kosu4_2026-10-27_ana_etiket_claude.json` — yalnız ANA kesiti senin için; TAM dosyayı AÇMA).

Sonuç: birleşik KATI 12/407 = %2,95 (üst %4,73) → katı koşulu İLK KEZ geçti. Kapsama 116/166 = %69,9 < %80 → KAPI GEÇEMEDİ. Bu sprintin hedefi doğruluğu bozmadan kapsamayı artırmak. Bulgular (ana kesitten):

- **Düşen 52 maddenin 50'si içerik olarak doğru.** Çoğu `kesik_alinti` ile düştü (alıntının kesik kısmına dayanan küçük bir alt iddia yüzünden). Onarım turu bu türü almıyor; düşen doğrudan cevaplar da onarılmıyor. Ana örnek: C20 "kaynatmada kapak" maddesi ve C20 doğrudan cevabı — sorunun asıl cevabı — düştü, kart "doğrulamadan geçen madde çıkmadı" dedi.
- **Onarılan maddeler katlı "Ayrıntılar"a düşüyor.** C.sirala yalnız güce bakıyor; maddelerin 274'ünden 272'si "olası" olduğundan sıra = özet sırası, onarılanlar sona ekleniyor.
- **Doğrulayıcı "gerçek çelişki değil" deyince iki taraf da gizleniyor** (`dogrulaUygula`, `a.tersAday && j < nT` → return). Ana sette C15 (soğuk çöktürme) ve C26 (havalandırma — doğrulayıcı "optimum" dedi). Aynı "optimum" kararıyla C27 havalandırma iki ters normal madde olarak gösterildi (#0 / #4) — tutarsız. C29#3 / #4 (aynı değişken "pH azaltılınca", etki "daha az buruk" ↔ "burukluk hissi artar") çelişki adayına girmedi.
- **Güç neredeyse hiç "güçlü" değil.** Doğrulayıcı v2 yalnız maddenin TAMAMINI tek başına söyleyen kaynağı güce sayıyor. 3–4 kurumlu maddeler bile "olası" (ör. C19#0 "en az 60 dk güçlü kaynatma": lallemand, crispmalt, brewingscience, byo — değer ayrıntısı farklı olduğu için hepsi "parçalı"). CEVAP İLKESİ'ne göre kanıt olduğundan zayıf gösteriliyor.
- **Sorgu stili:** C.sorguStili konu, C.GENEL_KONU / C.KUSUR_KONU sözlüklerine düşmüyorsa reçete stilini sorguya ekliyor. Bu sözlükler ana setin konularından kuruldu. Held-out'ta (Claude ölçtü, sen açma) 21 sorunun 15'inde sorgulara reçete stili eklendi (14'ünde soru stili adlandırmıyordu); held-out kapsaması %57,8, ana araştırma %67,1. Bu, KOD DÜZEYİNDE AŞIRI UYUM.

## Kurallar

- **Ön koşul:** git pull. Başka oturumun commit edilmemiş değişikliği varsa DUR. Bellek 7 GB altındaysa söyle.
- Set dosyaları, set imzaları, puanlama metinleri DEĞİŞMEZ. `tests/cev_seti_heldout.json` ve `tests/fixtures/*TAM_heldout_iceriyor*` AÇILMAZ.
- cev_seti beklenen listelerine göre ayar YOK. Uygulamanın görev metinlerine / sözlüklerine set sorusu ya da set örneği GİRMEZ (E2).
- AI4 (2c9ebd9f-32461) ve araştırma denetleyicisi (92f59a3c-5776) DOKUNULMAZ. Doğrulayıcı (534be960-18088) madde 3–4 için değişir → YENİDEN DONDUR, yeni imzayı raporla.
- Gerçek AI çağrısı YOK. Ölçümler koşu #4 ana kesitinin kayıtlı `ozetHam` / `dogrulamaHam` verisiyle AI'sız yeniden kurulumla yapılır.

## Görev

**0. Anahtar hatası sınıfı.** Anthropic 400 "This API key is not scoped to a workspace … anthropic-workspace-id" yanıtı bugün "uygulama tarafı hata olabilir" diye görünüyor.
- Bunu anahtar sorunu olarak sınıfla (BM_AI.hataSinifla).
- Kullanıcı metni: "Anahtar bir çalışma alanına (workspace) bağlı değil — Console'da çalışma alanına bağlı anahtar oluştur."
- CEV koşucusunda C.KESINTI_TUR'a giren bir tür olsun (koşu durur, soru kaydedilmez).
- Test: sahte 400 gövdesiyle.

**1. Sorgu stili yalnız soru stili adlandırıyorsa.**
- C.sorguStili: stil, YALNIZ soru metni stilin adını ya da takma adını içeriyorsa sorguya girer (C.soruStilAdi). Kusur konusu kuralı (C.KUSUR_KONU → stilsiz) aynen kalır.
- C.GENEL_KONU'ya dayanan "konu genel değilse reçete stilini ekle" dalı KALKAR. Başka yerde kullanılıyorsa söyle.
- Rapor: ana 34 sorunun hangilerinde sorgu stili değişti (önce → sonra). Held-out'u Claude kontrol eder.
- Takma ad listesi (C.STIL_TAKMA) genişletilecekse kaynağı yaz (BJCP 2021 adları / yaygın Türkçe yazımlar). Set sorularından sözcük alma.

**2. Kesik alıntı + düşen doğrudan cevap onarımı; sıralama.**

(a) Onarım adayı genişler:
- `kismi` + `kesik_alinti` (bugünkü kosul_atildi / baglam_genellendi / birlestirme'ye ek);
- düşen doğrudan cevap (karar `kismi`).

Onarım görevine kural: "Alıntının kesik kısmına dayanan alt iddiayı AT; yalnız görünen metnin söylediğini yaz."
- `yon` / `yanlis_kaynak` / forum yine onarılmaz.
- Soru başı onarım çağrısı ≤ 1 ve ikinci doğrulama ≤ 1 (bugünkü gibi; adaylar tek çağrıda). Aynı donmuş doğrulayıcıyla denetlenir.
- Onarılan doğrudan cevap geçerse kartın başına; geçmezse bugünkü yedek cümle.

(b) C.sirala aynı güç içinde maddeyi destekleyen FARKLI KURUM sayısına göre (tam + parça, kök alan adı — C.kurum) azalan sıralasın. Eşitlikte özet sırası korunur. Onarılan madde bu kurala göre yerleşir, sona eklenmez.

Ölçüm (ana kesiti, kayıtlı kararlarla):
- kaç soruda kaç onarım adayı;
- sıralama değişince hangi maddeler gösterilen ↔ katlı arasında yer değiştirdi (liste).

Maliyet: aday soru sayısı × ölçülen çağrı başı maliyet (koşu #4: onarım 0,0791 $ / 2 çağrı, ikinci doğrulama 0,1210 $ / 2 çağrı). Soru başı tahmin ve 55 soru tavanı güncellenir (VARSAYIM etiketiyle).

**3. Gizlenen taraflar ve yakalanmayan zıt etki (donmuş blok).**

(a) Çelişki adayında doğrulayıcı `gercek_celiski` false derse ve taraflar destekliyse taraflar GİZLENMEZ, TEK madde olarak gösterilir:
- Taraflar net yönde zıtsa (azı da fazlası da aynı sonucu veriyorsa) optimum maddesi: "<değişken>: hem yetersizi hem fazlası <etki> — <taraf 1 (kurum)>; <taraf 2 (kurum)>".
- Değilse bağlam maddesi: "<değişken>: <taraf 1> (kurum); <bağlam>: <taraf 2> (kurum)".
- Öneri dili yok.
- Güç yalnız tam destekleyenlerden (madde 4).
- Desteksiz taraf düşer (bugünkü kural). Gizleme YALNIZ iki taraf da desteksizse.
- Aynı "optimum" kararı iki ayrı normal madde olarak da gösterilmez (C27 #0/#4 deseni), tek madde olur.

(b) C29#3/#4 deseni neden adaya girmedi, kayıtlı ozetHam'den bul (etki_yonu, yonDeg, yonTers değerleri). Genel düzeltme: aynı değişken anahtarı + aynı yapılan + zıt etki yönü → aday. "Ayrıca" ile birleştirilmiş zıt etki parçaları için de aynı.

Ölçüm (ana kesiti): C15, C26, C27, C29 sonra ne gösteriyor; başka soruda değişen var mı.

**4. Güç: çekirdek destek (donmuş blok).**

Doğrulayıcı şemasına madde başına `cekirdek` eklenir: maddenin ÇEKİRDEK iddiasını (değişken + yön + etki; değer hariç) tek başına söyleyen alıntılar.
- Güç = `cekirdek` içindeki farklı kurum sayısı (≥ 2 → güçlü). Forum / dergi bugünkü gibi sayılmaz.
- Değer (sayı, aralık) yalnız onu söyleyen alıntıyla gösterilir. Değer kaynakları farklıysa madde metninde değer kaynağının adıyla yazılır, ör. "(60–90 dk: kurum)".
- Değer hiçbir alıntıda yoksa bugünkü gibi düşer (araştırma denetleyicisi).
- Paket güç / kurum sayısı taşımaz (E1 aynen). Görev metninde set örneği yok (E2).
- Eski kayıt (`cekirdek` yok) bugünkü v2 gibi değerlendirilir.
- Ölçüm (ana kesiti, AI'sız ÜST SINIR): destekleyen + parça içinde ≥ 2 farklı kurum olan madde sayısı. Gerçek sayı yeni koşuda ölçülür.

**5. Teşhis soruları.** Özetleyici kuralına (C.OZET_KURAL4 test kilidiyle): soru bir şeyin NASIL ANLAŞILACAĞINI / belirtisini soruyorsa maddeler gözlenebilir işaretler olabilir (değişken = işaret, yon "bilgi"). Neden / önleme maddeleri ayrıca yazılabilir. Set örneği yok, kilit imzası güncellenir.

**6. Test + kayıt.**
- Her madde için sentetik test + kasıtlı bozma.
- Kural yolu parmak izi d30af8de aynen.
- Mock 55 soru tam tur.
- npm test (--parca).
- Commit + push (sw.js CACHE_VERSION +1), canlı md5, üç imza (AI4 / araştırma aynı, doğrulayıcı yeni), anahtar taraması 0.
- CLAUDE.md'ye 1j3q'nun sonuna "CEV5 DURUM" ekle.
- Rapora ŞÜPHELER bölümü yaz.

## Sonra

Claude CEV5 doğrulaması (held-out sorgu stili + sentetik testler) → CEV koşusu #5 (ana + held-out 1, Kaan'ın düğmesi). Koşu #5 kapıyı geçerse TAZE held-out H2 ile onay koşusu.
