# CEV9 — üst kısım önceliği, özet kesilmesi, niteleyici çevirisi (gerçek koşu YOK)

Claude, 2026-10-30. CEV gerçek koşusu #8 (kosuId 1793304687068, SW v131-539, Opus 5.5, 55 soru, 22,90 $) Claude tarafından TAMAMI etiketlendi (499 araştırma maddesi; 12 kör alt-etiketçi + 27 Claude kararı; 25/25 yeniden denetim; 35 güçlü madde tek tek). Sonuç:

- **KATI GEÇTİ:** birleşik 16/543, üst %4,44 (katlı hariç 12/394, üst %4,89). Değer atfı hatası 3 → 2.
- **KAPSAMA GEÇEMEDİ:** 129/166 = %77,7 (eşik %80; koşu #7 132). Ana 85/102, held-out 44/64.

Kaçan 37 güçlü etkenin yeri (Claude elle):
- **12'si KATLI bölümde** — madde doğrulanmış, ama ilk 6'ya girmemiş.
- 4'ü düşen.
- 17'si cevapta hiç yok. Web alıntısında açık olan 6, yalnız kesik ya da öznesiz olan 9, hiç olmayan 6 (H14'ün 4 maddesi dahil).
- 4'ü H14: özet alınamadı.

Üç kod bulgusu:

1. **Kapsama turunun yeni maddeleri neredeyse hep katlıya düşüyor.** 109 yeni maddeden yalnız 27'si gösterilene girdi. Neden: yeni maddeler özetin 8 maddesinin ARDINA ekleniyor. `C.sirala` sırası güç → kurum sayısı (`C.kurumSay`) → özet sırası. Tek kurumlu yeni madde, aynı güçteki tek kurumlu özet maddelerinin hep arkasında kalıyor. Bu arada ilk 6'yı çoğu zaman şunlar dolduruyor:
   - bir terimin tanımı ya da duyusal tarifi,
   - eşik değeri ya da ölçüm ayrıntısı,
   - bir bileşiğin adı.

   Sorunun cevabı olan etken (neden / çare / teşhis belirtisi) ise katlıda kalıyor.
2. **H14: `durum: 'hata'`, `neden: 'özet alınamadı: '` (mesaj boş).**
   - Özet çağrısı `ok:true` döndü ama veri yok. 0,197 $ ile setin en pahalı özeti.
   - `cevozet` maxTokens 2000. Öteki özet çıktıları 2.000–4.200 karakter.
   - Büyük olasılıkla çıktı sınırda kesildi ve JSON geçersiz kaldı. Ham metin ve stop_reason kaydedilmediği için kesin değil.
3. **Niteleyici çevirisi ve birleşik değer atfı:**
   - H11#0'da kaynak "upwards of 50%" (= %50'den fazla) diyor, madde "%50'ye varan" (üst sınır) yazmış.
   - C17#3'te "birkaç °P ya da 2–5 SG puanı" tek ifade sayılmış, ikisi birden tek siteye yazılmış. Oysa birinci parça başka bir sitenin alıntısında.

   Ayrıca bir özet maddesi, İngilizce bir terimi sözcük sözcük çevirdiği için anlamı değişip DÜŞTÜ: teknik terim, alkol oranı gibi okunmuş. Bu, beklenen bir etkeni kaybettirdi.

## Kurallar
CEV8.md kuralları aynen:
- git pull.
- Set, imza ve puanlama değişmez.
- `tests/cev_seti_heldout.json` ve `tests/fixtures/*TAM_heldout_iceriyor*` AÇILMAZ.
- Beklenen listelerine göre ayar YOK.
- Görev metinlerine set sorusu, set alıntısı ya da set örneği GİRMEZ (E2).
- AI4, araştırma denetleyicisi ve doğrulayıcı blokları DOKUNULMAZ. Değişen madde blok dışıysa üç imza AYNI kalmalı; değişirse önce gerekçe yaz, sonra yeniden dondur ve raporla.
- Gerçek API çağrısı YOK.

Koşu #8 kayıtları:
- `tests/fixtures/cev_kosu8_2026-10-29_ana.json` — ana kesit, CC kullanabilir.
- `cev_kosu8_2026-10-29_ana_etiket_claude.json` — Claude etiketi, ana.
- `…TAM_heldout_iceriyor…` — AÇILMAZ.

## Maddeler

**1. Üst kısım önceliği — kapsama turuna (c) `oncelik` (bayrak `C.CEV9.oncelik`; kapalıyken davranış BİREBİR eski).**
- `C.KAPSA_GOREV`'e üçüncü iş eklenir: (c) `oncelik`.
  - Ne listelenir: MEVCUT MADDELER (1..n) ile bu çağrının yeni maddeleri (n+1.., yazıldıkları sırayla) arasından, KONU'yu EN DOĞRUDAN cevaplayan ve birbirinden FARKLI etkenleri taşıyan en çok 6 numara, önem sırasıyla.
  - Önce gelenler: neden, çare, teşhis belirtisi.
  - Sona kalanlar: bir terimin tanımı, duyusal tarif, eşik değeri, ölçüm ayrıntısı, bağlam ya da tarihçe notu.
  - Aynı `ayni_etken` grubundan en çok bir numara.
- Şema `kapsaSema`: `oncelik: { type:'array', items:{ type:'integer' } }`, required'a eklenir.
- `C.kapsaIsle` doğrular:
  - tam sayı, 1..n+yeni, tekil, en çok 6 (fazlası atılır);
  - atılan yeni maddenin numarası listeden düşer.
  - Sonuç madde başına `oncelikSira` olarak taşınır. Birleşik maddede bileşenlerin EN İYİSİ alınır (ozetNo / kapsama numarası eşlemesi).
  - Geçersiz giriş sayısı kayda `kapsama.oncelikGecersiz` olarak yazılır.
- `C.sirala`:
  - **güç katmanı ilk ölçüt olarak AYNEN kalır** (CEVAP İLKESİ güçlüden zayıfa: güçlü madde öncelikte olmasa da üstte);
  - aynı güç içinde önce `oncelikSira` (listede olan önce, kendi sırasıyla);
  - sonra kurum sayısı;
  - sonra özet sırası.

  `C.grupSec` aynen.
- `C.KAPSA_GOREV` (a) yeni maddeler: "Yeni madde bir ETKEN olmalı (biracının değiştirebileceği bir şey ya da teşhiste kullanılan bir belirti); bir terimin tanımı ya da duyusal tarifi yeni madde değildir; birden çok aday varsa konuyu en doğrudan cevaplayanı önce yaz."
- Kayıt: soru başına `kapsama.oncelik` (ham liste) ve gösterilen 6'nın kaçının `oncelik`ten geldiği.

**2. Özet kesilmesi (H14).**
- `cevozet` maxTokens 2000 → 4000 (cevkapsa / cevdogrula ile aynı).
- Özet yanıtında stop_reason `max_tokens` ise ya da JSON geçersizse:
  - kayıtta `R.ozetHata = { neden:'kesildi'|'json'|'bos'|…, cikti_uzunluk, bas:<ilk 300 karakter>, son:<son 300 karakter> }`;
  - `R.neden` artık boş kalmaz.
- BİR KEZ yeniden deneme: aynı istek, maxTokens 6000, maliyet tavanı denetimiyle. Yine olmazsa `hata`.
- Aynı stop_reason denetimi cevkapsa, cevdogrula ve cevonar için de kayda yazılır (yeniden deneme yalnız özet için).
- Rapor: koşu #8 ana kesitinde özet çıktı uzunluğu dağılımı (karakter: en küçük / medyan / en büyük). Mock'ta kesik özet → yeniden deneme → başarı ve iki kez kesik → `hata` + ozetHata yolları.

**3. Niteleyici çevirisi ve birleşik değer atfı.**
- `C.OZET_KURAL9` (özet + onarım + kapsama görevlerine; örneksiz genel kural, set örneği YOK):
  - (a) Sayı niteleyicisini anlamını koruyarak çevir:
    - "fazlası / -den fazla / -in üzerinde" (alt sınır) ile "-e kadar / -e varan / en fazla" (üst sınır) birbirine dönüştürülmez;
    - "yaklaşık" kesin sınıra çevrilmez.
  - (b) İngilizce teknik terimi sözcük sözcük çevirmek anlamı değiştiriyorsa, terimin biracılıktaki karşılığını yaz. Örnek (set dışı): "dry hopping" = kuru şerbetçiotlama, "kuru bira" değil.
  - (c) `deger` alanında iki seçenek "ya da / veya" ile birleşiyorsa, her seçenek kendi kaynağıyla ayrı değer olarak yazılır.
- `C.NIT_ATIF_ONCE/SONRA`:
  - "upwards of", "in excess of", "more than" → alt, kesin;
  - Türkçe "-e varan / -a varan" → üst, dahil ("-e kadar" ile aynı sınıf).
- `C.degerIfadeler`: "ya da / veya / or" ile birleşen değer ifadesi parçalara bölünür; site yalnız alıntısının söylediği parçaya yazılır. Sayı içermeyen parça ("birkaç °P" gibi) atıf almaz. Sitenin alıntısı ifadenin tümünü söylemiyorsa site tüm ifadeye yazılmaz.

**4. Mekanik denetim yanlış alarmları (yalnız ölçüm; uygulama metni değişmez).**
- jargon `kat:` etiketi: sayı sözcüğü ya da sayıdan sonra gelen "kat" ("iki kat,", "üç kat:") jargon değil.
- tat: koşu #8'de 4 yanlış alarm ("önerilir" / "öneriliyor" geçen kaynaklı maddeler). Tat hükmü yalnız lezzet / kalite yargısı ("daha lezzetli", "daha iyi bira") olsun.
- Koşu #8 ana kesitinde önce ve sonra sayıları raporlanır.

**5. Test + ölçüm.**
- Sentetik (kasıtlı bozmalı):
  - `oncelik`: geçersiz / yinelenen / 7+ numara, atılan yeni maddenin numarası, aynı gruptan iki numara;
  - `sirala`:
    - güçlü madde öncelikte olmasa da üstte;
    - olası içinde öncelik sırası;
    - öncelik yoksa eski sıra;
  - madde 3'ün her biçimi:
    - "upwards of 50%" ↔ "%50'den fazla" eşleşir;
    - ↔ "%50'ye varan" eşleşmez;
    - "-e varan" ↔ "up to" eşleşir;
    - "ya da" bölme.
- Koşu #8 ANA kesiti yeniden kurulum:
  - CEV9 kapalı: 22/22 aynen + kural yolu 12;
  - CEV9 açık: kayıtta `oncelik` olmadığı için sıra aynı;
  - değer atfı yolu değişen atıflar tek tek (beklenen: C17#3'ün byo atfı kalkar; başka değişen varsa gerekçe; kaybedilen doğru atıf 0).
- Kural yolu parmak izi d30af8de, mock 55 tam tur, npm test (--parca).
- Maliyet: `C.KAPSA_TOK` çıktı payı +~150 token (öncelik). Soru başı yeni tahmin VARSAYIM olarak yazılır.
- Commit + push (sw.js CACHE_VERSION +1), canlı md5, üç imza AYNI, anahtar taraması 0.
- CLAUDE.md "Güncel durum" CEV satırına 1–2 cümle, ayrıntılı "CEV9 DURUM" gorevler/SPRINT_GECMISI.md SONUNA. CLAUDE.md 150 bin karakteri geçmesin.

## Sonra
1. Claude kontrolü (sentetik + koşu #8 ana kesiti; held-out kaydı Claude'da).
2. CEV gerçek koşusu #9 (Kaan'ın düğmesi; ana + held-out 1; ≈ 24 $ VARSAYIM).
3. Kapı geçerse TAZE held-out 2 onay koşusu (Claude yeni soruları ve beklenenleri yazar, imzalar).
