# CEV4C — onarım birleşiminde güç (tek satırlık düzeltme, gerçek koşu YOK)

Claude, 2026-10-27. CEV4B (78ec587, SW v131-528) canlıda doğrulandı: md5 614d7f1f… = yerel, doğrulayıcı 534be960-18088, araştırma 92f59a3c-5776, AI4 2c9ebd9f-32461, anahtar 0, cev_seti / held-out md5 değişmedi. Üç boşluk kapandı (farklı fiil + zıt net → çelişki adayı; aday tarafı düşünce kalan taraf gösteriliyor; onarılan zıt madde gösterilmiyor). Koşu #3 ana kesiti CEV4 ↔ CEV4B kodla AI'sız yeniden kurulum: 22 soruda gösterilen madde farkı 0.

## Bulgu (görev metnimin hatası)

`C.onarimBirlestir`: onarılan madde y, mevcut x'e **farklı etki** ile ("Ayrıca: …") eklendiğinde güç yine `tam(x) ∪ tam(y)` ile hesaplanıyor. y'nin kaynağı x'in iddiasını söylemiyor. Bu, koşu #3'teki (iii) güç hatası sınıfının aynısı.

Sentetik örnek:
- x = "mayalanma sıcaklığı artırılınca — ester artar", tek kaynak whitelabs → olası.
- y (onarılan) = "… bu lager suşunda ester oluşumu değişebilir", kaynak fermentis.
- Birleşim sonrası güç **güçlü, n 2** çıkıyor. Doğrusu olası, çünkü fermentis ana iddiayı söylemiyor.
- Aynı etki (aynı iddia) birleşiminde güçlü n 2 çıkması doğru.

## Görev

**0. Ön koşul.** git pull; başka oturumun commit edilmemiş değişikliği varsa DUR. Bellek 7 GB altındaysa söyle. Donmuş üç blok (AI4, araştırma denetleyicisi, doğrulayıcı 534be960-18088) DOKUNULMAZ. Set dosyaları, imzalar, puanlama metinleri DEĞİŞMEZ. Held-out dosyaları AÇILMAZ.

**1.** `C.onarimBirlestir` içinde güç birleşimi YALNIZ aynı iddiada yapılır, yani `ayni` true ise (etki aynı, değer aynı ya da boş). Farklı iddiada ("Ayrıca") ana maddenin gücü x.guc olarak AYNEN kalır. "Ayrıca" parçasının kaynağı metinde kendi adıyla durur (bugünkü gibi). Kaynak listesi birleşebilir; güce girmez.

Test:
- yukarıdaki iki sentetik vaka: farklı etki → olası n 1; aynı etki → güçlü n 2;
- bozma testi;
- CEV4B testleri yeşil;
- kural yolu parmak izi d30af8de, mock 55 soru, npm test (--parca).

**2.** Commit + push, canlı md5, imzalar aynı, anahtar 0. CLAUDE.md'de 1j3p satırının sonuna CEV4C durumu ekle. Rapora ŞÜPHELER bölümü yaz.

## Sonra

Claude kısa kontrol → CEV koşusu #4 (ana 34 + held-out 1).
