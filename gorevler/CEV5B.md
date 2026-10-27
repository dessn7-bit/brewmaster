# CEV5B — tek madde başlığı doğrulayıcının nedeninden (gerçek koşu YOK)

Claude, 2026-10-27. CEV5 (71defc5, SW v131-534) doğrulandı: canlı md5 = yerel, üç imza (AI4 2c9ebd9f-32461 · araştırma 92f59a3c-5776 · doğrulayıcı 21cf0998-24444), anahtar 0, held-out sorgu stili Claude ölçtü (21 sorunun yalnız stil adı geçen 1'i stilli; önce 15), çalışma alanı 400 / kurum sırası / onarılan doğrudan cevap denetimi doğru.

Kalan tek sorun: gerçek olmayan çelişkide taraflar tek madde olunca başlığı **uygulama** seçiyor (`tekMadde`: değişken yönü zıt + etki yönü aynı → "hem yetersizi hem fazlası aynı sonucu veriyor", değilse "başka bağlamda"). Doğrulayıcının `not` alanında yazdığı NEDEN başka:

- C27 maya aşılama miktarı: doğrulayıcı "bağlam farkı (yalnız buğday birası, yüksek sıcaklıkla birlikte)" dedi → kart "hem yetersizi hem fazlası aynı sonucu veriyor" gösteriyor. Bu kaynakta olmayan bir genelleme; etiketçi bunu sınırda sayar.
- Held-out'ta aynı türden 3 madde daha var (Claude ölçtü; dosyayı AÇMA): doğrulayıcı "aralıklar çakışıyor / iki taraf da üst sınır veriyor" ya da "optimumun iki ucu" dediği hâlde kart "başka bağlamda" yazıyor.
- Ayrıca CEV3 `C.optimumMadde` (donmuş bloğun DIŞINDA) yalnız ilk tarafın etkisini yazıyor: iki tarafın etkisi farklıysa (ör. biri fusel, diğeri diasetil) ikinci etki kayboluyor ve madde ona da "fusel artar" demiş oluyor.

Koşu #4'te 9 tek maddenin 4'ünde başlık doğrulayıcının nedeniyle uyuşmuyor. Katı oran %2,95 (üst %4,73) sınıra yakın; bu sistematik hata koşu #5'ten önce kapanmalı.

## Kurallar

- **Ön koşul:** git pull. Başka oturumun commit edilmemiş değişikliği varsa DUR. Bellek 6 GB altındaysa söyle.
- Set dosyaları, set imzaları, puanlama metinleri DEĞİŞMEZ. `tests/cev_seti_heldout.json` ve `tests/fixtures/*TAM_heldout_iceriyor*` AÇILMAZ.
- cev_seti beklenen listelerine göre ayar YOK. Görev metinlerine set sorusu ya da set örneği GİRMEZ (E2).
- AI4 (2c9ebd9f-32461) ve araştırma denetleyicisi (92f59a3c-5776) DOKUNULMAZ. Doğrulayıcı (21cf0998-24444) madde 1 için değişir → YENİDEN DONDUR, yeni imzayı raporla.
- Gerçek AI çağrısı YOK.

## Görev

**1. Doğrulayıcı tek madde türünü söyler (donmuş blok).**
- Şemada çelişki maddesi başına `celiski_turu` enum: `gercek` · `optimum` (azı da fazlası da sorun) · `baglam` (taraflar farklı koşul / stil / suş / ölçek için geçerli) · `deger_farki` (kaynaklar farklı sayı / aralık / sınır veriyor, çakışıyor ya da yakın) · `farkli_sonuc` (aynı eylemin ayrı etkileri). Çelişki olmayan maddede alan `yok`.
- Görev metnine bu beş türün TANIMI (örneksiz). `gercek_celiski` aynen kalır; `celiski_turu` = `gercek` ise `gercek_celiski` true olmalı — uyuşmazsa uygulama `gercek_celiski`ye uyar, rapora "tür uyuşmadı" yazar.
- `tekMadde` başlığı türden gelir, uygulama yeni iddia KURMAZ:
  - `optimum` → "<değişken>: azı da fazlası da sorun olabilir — <taraf 1 (kurum)>; <taraf 2 (kurum)>" ("aynı sonucu veriyor" YOK — etkiler farklı olabilir).
  - `baglam` → "<değişken>: <taraf 1 (kurum)>; farklı koşulda: <taraf 2 (kurum)>".
  - `deger_farki` → "<değişken>: kaynaklar farklı değer veriyor — <taraf 1 (kurum)>; <taraf 2 (kurum)>".
  - `farkli_sonuc` → "<değişken>: <taraf 1 (kurum)>; ayrıca: <taraf 2 (kurum)>".
  - tür yok / tanınmıyor (eski kayıt) → `deger_farki` kalıbının tarafsız biçimi: "<değişken>: <taraf 1 (kurum)>; <taraf 2 (kurum)>" (bağlam ya da optimum İDDİA ETMEZ).
- Güç kuralı (en zayıf taraf), desteksiz taraf düşer, iki taraf desteksizse gizlenir — AYNEN.

**2. CEV3 optimum maddesi iki etkiyi de yazar (donmuş blok dışı).** `C.optimumMadde`: taraf etkileri katlanmış metinle farklıysa her etkiyi kendi kurumuyla yaz ("<değişken> hem yetersiz hem aşırı olunca — <etki 1 (kurum)>; <etki 2 (kurum)> (iki uç da sorun)"); aynıysa bugünkü gibi tek etki. Hiçbir etki kaybolmaz.

**3. Ölçüm (ana kesiti, kayıtlı kararlarla).** Kayıtlı `dogrulamaHam`'da `celiski_turu` YOK → madde 1'in eski kayıt kuralı uygulanır. Rapor: C15 / C25 / C26 / C27 tek madde metinleri önce → sonra; başka soruda değişen var mı. Uygulamanın kendi kurduğu "aynı sonucu veriyor" / "başka bağlamda" iddiası kalmadığını test et (metin taraması).

**4. Test + kayıt.**
- Sentetik: beş tür × (iki taraf destekli / biri desteksiz) + tür ↔ gercek_celiski uyuşmazlığı + eski kayıt + farklı etkili optimum (madde 2); her biri kasıtlı bozmayla.
- Kural yolu parmak izi d30af8de aynen, mock 55 soru tam tur, npm test (--parca).
- Maliyet satırı: şemaya tek enum alanı → tahmin değişmez (değişirse yaz).
- Commit + push (sw.js CACHE_VERSION +1), canlı md5, üç imza (AI4 / araştırma aynı, doğrulayıcı yeni), anahtar taraması 0.
- CLAUDE.md 1j3q satırının sonuna "CEV5B DURUM" ekle. Rapora ŞÜPHELER bölümü.

## Sonra

Claude CEV5B doğrulaması (held-out tek maddeleri dahil) → CEV koşusu #5 (ana + held-out 1, Kaan'ın düğmesi).
