# CEV4B — zıt yön boşlukları (gerçek koşu YOK)

Claude, 2026-10-27. CEV4 (ab4d78d, SW v131-527) canlıda doğrulandı: md5 6bc6a533… = yerel, doğrulayıcı b4c7ce4a-16326, araştırma 92f59a3c-5776, AI4 2c9ebd9f-32461, anahtar 0, set dosyaları değişmedi. Parça destek / güç, onarım paketi (yalnız o maddenin alıntıları, soru metni ve güç gitmiyor), onarılan maddede alıntıda olmayan sayı → düşüyor, yedek cevap, C12 / C13 ⚖️ — hepsi DOĞRU.

Bağımsız sentetik denemede (Playwright, C.maddeIsle / C.dogrulaUygula / C.arastir mock) üç boşluk çıktı. Üçü de aynı ilkenin eksik kalan yerleri: **aynı değişken için zıt yön, çelişki olarak doğrulanmadan aynı kartta yan yana ya da tek maddede gösterilmez.**

## Bulgular

1. **Farklı fiil + zıt net yön hâlâ "Ayrıca" ile tek maddede.** "X artırılınca — köpük kalıcılığı artar (bjcp)" ve "X azaltılınca — köpük kalıcılığı artar (wiley)"; ikinci alıntıda yön sözcüğü yok → uygulama çelişkiyi doğrulayamıyor → rapor + `birlestirTek` → gösterilen: "X artırılınca — … artar. Ayrıca: X azaltılınca — … artar". C.tersEtki yalnız AYNI fiil + zıt etkiye bakıyor (CEV4 görev metni böyle yazmıştı — boşluk görevdeydi). Koşu #3 ana kesitinde bu desen 0 (yeniden kurulumla ölçüldü), ama oluşabilir.
2. **Çelişki adayında (tersAday) taraflardan biri desteklenmezse desteklenen taraf da kayboluyor.** gercek_celiski true, taraf 1 destekli, taraf 2 desteksiz → gösterilen 0, yalnız rapor. Karşı taraf düşünce çelişki kalmıyor; desteklenen taraf normal madde olmalı.
3. **Onarılan madde, gösterilen maddelerle karşılaştırılmıyor.** Onarım değişkeni değiştirebiliyor ya da birleşik maddeyi bölebiliyor. Denemede: gösterilen "mayalanma sıcaklığı artırılınca — ester artar {güçlü}" + onarılan "mayalanma sıcaklığı artırılınca — bu lager suşunda ester oluşumu azalabilir {olası}" → ikisi de gösterildi, çelişki etiketi yok. Aynı yönde ise aynı değişken iki ayrı madde (CC'nin ŞÜPHE 1'i; CEV3 madde 3 "aynı değişken tek madde" kuralına aykırı, 6 madde sınırını tüketir).

## Görevler

**0. Ön koşul.** git pull; başka oturumun commit edilmemiş değişikliği varsa DUR. Boş bellek 7 GB'ın altındaysa söyle. AI4 (2c9ebd9f-32461) ve araştırma denetleyicisi (92f59a3c-5776) DOKUNULMAZ. Set dosyaları, set imzaları, puanlama metinleri DEĞİŞMEZ. `tests/cev_seti_heldout.json` ve `tests/fixtures/*TAM_heldout_iceriyor*` AÇILMAZ. Özetleyici / onarım / doğrulayıcı görev metinlerine set örneği girmez (E2).

**1. Zıt yön asla "Ayrıca" olmaz (genel).** Aynı değişken anahtarındaki iki parça şu durumlardan birindeyse birleşmez: (a) iki net yön de okunuyor ve zıt, (b) aynı yapılan (yonDeg, 'bilgi' dahil) + zıt etki yönü (bugünkü tersEtki). Optimum ve etkisizlik istisnaları bugünkü sırayla önce uygulanır. Uygulama alıntıda doğrulayabiliyorsa normal çelişki maddesi; doğrulayamıyorsa çelişki ADAYI (tersAday) → doğrulayıcı. Test: kendi sentetik vakaların (farklı fiil + zıt net, ikinci alıntı yön sözcüksüz / yön sözcüklü) + koşu #3 ana kesiti AI'sız yeniden kurulum — gösterilenlerde değişen 0 olmalı (benim ölçümüm: bu desen 0); değişen varsa listele.

**2. Çelişki adayında taraf düşerse kalan taraf gösterilir.** tersAday maddesinde: gercek_celiski true + tüm taraflar destekli → ⚖️ (bugünkü); gercek_celiski false → taraflar gösterilmez, rapor (bugünkü); taraflardan biri ya da birkaçı destekli DEĞİL → kalan destekli taraflar aynı net yöndeyse (ya da tek taraf kaldıysa) normal madde olarak gösterilir (kaynak = destekleyen + parça, güç yalnız tam destekleyenden), düşen taraf `dusen`'e; kalanlar hâlâ zıtsa rapor. Bu `dogrulaUygula` içinde (donmuş blok) → YENİDEN DONDURMA; yeni imza raporda, önceki b4c7ce4a-16326. Henüz bu imzayla gerçek koşu yapılmadı.

**3. Onarılan maddeler kartla tutarlı.** İkinci doğrulamadan geçen her onarılmış madde, gösterilen tüm maddelerle (diğer onarılanlar dahil) aynı değişken anahtarıyla (C.degAnahtarKod) karşılaştırılır:
- madde 1'deki ölçüte göre ZIT ise onarılan madde GÖSTERİLMEZ → celiskiRapor ("onarılan madde gösterilen maddeyle zıt yönde; çelişki doğrulanmadı" + iki metin). Önceden gösterilen madde kalır. İki onarılan madde birbirine zıtsa ve ikisi de yeni ise ikisi de rapora. (Bilinçli seçim: bağlam farkı bu noktada denetlenmeden zıt yön yan yana gösterilmez; kapsama kaybı kabul.)
- AYNI yönde ise ayrı madde olmaz: mevcut maddeye eklenir (etki metni farklıysa "Ayrıca: …", kaynaklar birleşir). Güç = iki maddenin TAM destekleyen kimliklerinin (kaynaklar − parca) birleşimiyle `dogrulaGuc` — `gucHesap` (mekanik) KULLANILMAZ.
Test: sentetik mock (C.arastir) — zıt, aynı yön, farklı değişken (değişmez), iki onarılanın birbirine zıt olduğu durum; güç birleşiminde parça kimliği sayılmıyor.

**4. Değişmeyenler + rapor.** Kural yolu 12 soru parmak izi d30af8de. G seti / tuzak / DOG4B–H parmak izleri birebir. Mock tam tur 55 soru. Maliyet satırı değişmez (onarım çağrı sayısı aynı). npm test (--parca). Commit + push, canlı md5, yeni doğrulayıcı imzası, AI4 + araştırma imzaları aynı, anahtar 0. CLAUDE.md'de 1j3p satırının sonuna CEV4B durumu. ŞÜPHELER.

## Sonra

Claude doğrulaması → CEV koşusu #4 (ana 34 + held-out 1; puanlama cev_seti EK 2, değişmedi).
