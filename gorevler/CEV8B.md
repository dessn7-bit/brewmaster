# CEV8B — değer atfı: parantezli eşdeğer birim ve "-e kadar" (gerçek koşu YOK, küçük)

Claude, 2026-10-29. CEV8 (df72658, SW v131-538) canlıda doğrulandı: üç imza aynı (AI4 2c9ebd9f-32461 · araştırma 92f59a3c-5776 · doğrulayıcı 6d7e6c6e-35582), koşu #7 TAM kaydı CEV8 kapalıyken 43/43 birebir, C19#0 ve C23#2 atıfları düzeldi, wort ekleri / kapsaIsle / grupSec / kullanilmayanDenetle sentetikte doğru. ŞÜPHE 1–7 KABUL.

Bağımsız sentetik denemede (Claude, canlı sayfa, `C.degerAtif`) iki hata çıktı. İkisi de held-out kaydında gerçek maddede görüldü; aşağıdaki örnekler Claude'un kurduğu sentetik biçimlerdir (set metni değil):

1. **Parantezli eşdeğer birim niteleyiciyi koparıyor.** Değer `15°C (59°F) altı`, alıntılar `Dry hop below 59°F / 15°C …` ve `… (to about 60°F/16°C)` → sonuç `15°C (59°F) altı: whitelabs.com, beerandbrewing.com` (ikinci kurum "yaklaşık 16 °C" diyor, "altı" demiyor — yanlış atıf, koşu #7'deki üç atıf hatasının biri). Neden: `altı` → `altinda` dönüşümü sayı (+ birim) ile niteleyici arasındaki parantezi geçemiyor; `altı` SAYI_SOZ ile 6 sayısına dönüyor, 15 °C niteleyicisiz kalıyor ve "yaklaşık" ile denk sayılıyor. Parantezsiz `15°C altı` doğru çalışıyor (yalnız whitelabs).
   Alıntı tarafında da aynı sorun: `below 59°F / 15°C` — niteleyici yalnız ilk sayıya bağlanıyor, eşdeğer ikinci sayı (`/ 15°C`, ya da `59°F (15°C)`) niteleyicisiz kalıyor. Parça tarafı düzelince bu yüzden doğru kurum da düşebilir.
2. **Türkçe "-e / -a kadar" tanınmıyor (GERİLEME).** Değer `36 saate kadar`, alıntı `… for up to 36 hours.` → CEV8 öncesi `36 saate kadar: wyeastlab.com` (doğru), CEV8 sonrası `36 saate kadar` (atıfsız — "up to" artık `ust`, parça niteleyicisiz). `en fazla 36 saat` doğru eşleşiyor.

## Kurallar
CEV8.md kuralları aynen (git pull; set / imza / puanlama değişmez; held-out dosyaları AÇILMAZ; üç donmuş blok DOKUNULMAZ; gerçek API çağrısı yok).

## Maddeler

**1. Eşdeğer birim çifti tek ifade (yalnız `C.degerIfadeler` — atıf yolu; aralık / çelişki yolu değişmez).**
- Sayı + birim ardından parantez içinde ya da `/` ile verilen EŞDEĞER birimli sayı (°C ↔ °F, L ↔ gal, kg ↔ lb, °P ↔ SG … dönüşümü tolerans içinde aynı değer) tek ifade sayılır; niteleyici çiftin önünde ya da arkasında (parantez / `/` sonrası) olabilir ve İKİSİNE de uygulanır. Hem Türkçe parçada (`15°C (59°F) altı`, `60 °C (140 °F) altına`) hem İngilizce alıntıda (`below 59°F / 15°C`, `above 70°F (21°C)`).
- Eşdeğer olmayan parantez içi sayı (ör. `(%6 buharlaşma)`) bu kurala girmez.
- Sayının ardındaki `altı / altında / altına` parantez araya girse de niteleyici; `altı` sayı sözcüğü olarak yalnız sayı yerinde (ör. `altı hafta`).

**2. Türkçe "-e / -a kadar" (ve "-e değin") = üst sınır, DAHİL (≈ up to / at most).** `36 saate kadar`, `5 ppm'e kadar`, `%10'a kadar`. Kesme işaretli ve kesmesiz biçimler.

**3. Test + ölçüm.**
- Sentetik (kasıtlı bozmalı): madde 1'in her biçimi (parça / alıntı, parantez / `/`, önde / arkada niteleyici, eşdeğer olmayan parantez), madde 2'nin biçimleri; `yaklaşık` ↔ `altı` eşleşmez; `up to` ↔ `-e kadar` eşleşir; `en az` ↔ `-e kadar` eşleşmez.
- Koşu #7 ANA kesiti yeniden kurulum: CEV8 kapalı 22/22 aynen; CEV8 + CEV8B açık: değişen atıflar tek tek (beklenen: C19, C23, C27 aynen; başka değişen varsa gerekçe). Kaybedilen doğru atıf 0 olmalı.
- Kural yolu parmak izi d30af8de, mock 55 tam tur, npm test (--parca).
- Commit + push (sw.js CACHE_VERSION +1), canlı md5, üç imza AYNI, anahtar taraması 0.
- CLAUDE.md artık KISA (sprint geçmişi gorevler/SPRINT_GECMISI.md'ye taşındı, Claude 2026-10-29): durumu CLAUDE.md "Güncel durum" bölümündeki CEV satırına 1–2 cümle olarak yaz, ayrıntılı "CEV8B DURUM" metnini SPRINT_GECMISI.md'nin SONUNA ekle. CLAUDE.md 150 bin karakteri geçmesin.

## Sonra
Claude kısa kontrolü (held-out kaydındaki iki gerçek madde dahil) → CEV koşusu #8 (Kaan'ın düğmesi; ana + held-out 1; Opus soru başı ≈ 0,55 $ VARSAYIM, gerçekçi ≈ 21 $).
