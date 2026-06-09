---
name: brewmaster-dev
description: Brewmaster tek-dosya PWA (Brewmaster_v2_79_10.html) ve sw.js uzerinde kod/veri degisikligi, regex veya str_replace duzenlemesi, dogrulama ya da deploy yapilirken KULLAN. CRLF-aware edit, assert-once guvenligi, node-check + grep + runtime spot-check dogrulama, SW cache bump, dogrudan-production deploy ve kaynak-dogrulama kurallarini icerir.
---

# Brewmaster gelistirme protokolu

Brewmaster: tek-dosya Turkce ev-yapimi bira recete PWA'si. Bu dosyalara dokunan her isde bu protokole uy.

## Proje
- Ana dosya: Brewmaster_v2_79_10.html (~25.9k satir, ~3.5MB, tek dosya).
- Repo: github.com/dessn7-bit/brewmaster (public), branch main, GitHub Pages.
- sw.js: const CACHE_VERSION='bm-cache-v131-N'. HER HTML degisiminde N'yi bir artir.
- Dosya cok buyuk: tam cat / tam-dosya view YAPMA (token israfi). Hedefli grep, sed -n, satir-arali view kullan.

## Duzenleme protokolu
- Tercih sirasi: tek-satir string replace > hedefli node-regex > str_replace.
- CRLF: working-tree CRLF (core.autocrlf=true; blob LF). Cok-satir node-regex'te satir sonunu \r?\n ile yaz. Icinde newline OLMAYAN tek-satir replace CRLF-immune'dur; mumkunse onu sec.
- ASSERT-ONCE: her replace oncesi eslesme sayisini say; 1 degilse ABORT (process.exit) ve DOSYAYI YAZMA. writeFileSync EN SONDA, tum replace'ler PASS ettikten sonra -> tek abort = sifir yazim.
- JS String.replace'te $ ozeldir: function-replacer kullan (s.replace(find,function(){return repl;})). JS string literal'inde regex backslash icin cift yaz (orn iki ters-bolu + d).
- Turkce/ozel karakter eslestirmekten kacin: id-anchored regex + [^}]*? sinifi ile aralarindan gec.
- Naive bare-alan replace YAPMA (S.maya -> S.mayaId global replace maya2Id/mayaYasAy'i bozar). Her zaman tam-ifade anchor kullan.

## Commit oncesi dogrulama (HEPSI PASS olmadan commit YOK)
1. node --check: tum inline script bloklari + sw.js PASS.
2. grep sayim: yeni/degisen desenler beklenen sayida; eski desen = 0; bozulma-sanity = 0.
3. RUNTIME spot-check: degistirilen fonksiyonu izole calistir (kaynak slice + node eval) ve CIKTI DEGERLERINI dogrula. grep + syntax tek basina YETMEZ.
4. git diff --stat --ignore-cr-at-eol: yalniz beklenen dosya + beklenen hunk; baska hunk YOK; CRLF artefakti gorunmesin.

## Deploy
- Dogrudan production: commit + push origin main. Rollback = git revert.
- Test HTML, lokal _teshis/ klasoru, gecici kopya YASAK.
- Commit mesaji: ne + nicin + SW vN. Sonra commit hash + grep + runtime + git diff --stat raporla.

## Veri ve deger dogrulama
- Her sayisal/kimyasal deger GERCEK kaynaktan (datasheet, resmi/akademik PDF); tercihen 2-3 bagimsiz kaynak.
- Kaynak yoksa "bulamadim" de; HAFIZADAN UYDURMA.
- Kanitsiz "dogru / PASS / tamam / kapandi" YASAK.

## Baska sistemi besleyen koda dikkat
- Renk/SRM/pigment motoru (aktif_pigment, motorRenk, _KR_GRUP, PIG) gorunur cikti uretir; kor degistirme.
- Bir fonksiyon/degiskeni silmeden once 0-cagri oldugunu grep ile dogrula.
- Iki ayri pH motoru var, KARISTIRMA: (a) maltPH/maltBuf = mash pH (buffer-weighted, Riffe), _suMashPHHTML IIFE icinde; (b) __bm_finishedPH = renk pigmenti icin finished-beer pH (sour 3.4 / normal 4.3).

## Calisma bicimi
- Kullaniciya "kopyala/yapistir" veya "su satiri duzenle" deme; tum okuma/yazma/deploy CC'de.
- Belirsizlikte sor, kor degistirme.

## Playwright / runtime test notlari
- Recipe state S closure-bound const; window.S ile AYNI referans olmayabilir. Test/otomasyonda state mutasyonu eval('S.xxx = ...') ile yapilmali; window.S.xxx = ... calc/render zincirine ulasmaz.
- Engine fonksiyonlari page context'te dogrudan cagrilabilir: motorRenk, aktif_pigment, __bm_finishedPH, aktif_renk_hex, rEditorHesap.
- Editor ile etkilesim localStorage.bm_draft_v1 auto-draft buffer'ina yazar (KR/Firebase degil, ephemeral) -- "kayit" sayilmaz.
- pH-bagimli renk render yollari: tarifKart, Genel profil text, Hesap kart swatch+band, sticky band. Sticky swatch #ss-renk SRM-only/pigment-kor (acik konu B).
- **Screenshot kurali**: Playwright test screenshot'larini her zaman `.playwright-mcp/` altina yaz (zaten .gitignore'lu). Repo kokune PNG BIRAKMA -- her yeni isim ayri pattern eklemeyi gerektirir, gitignore sismesi olur. `browser_take_screenshot.filename` parametresine `.playwright-mcp/<name>.png` ver.

## Süzülmüş ek disiplinler

1) Kendini-kandırma red-flag listesi (şu cümleyi düşünürsen DUR ve doğrula):
- "Zaten elle test ettim" -> DUR, runtime kanıt üret.
- "Bu sefer farklı, çünkü..." -> DUR, kuralı uygula.
- "Geçmesi lazım / muhtemelen geçer" -> DUR, çalıştır, çıktıyı oku.
- "Küçük değişiklik, doğrulamaya gerek yok" -> DUR, 3-katman doğrula.
- "Uygulandı" (spot-check yapmadan) -> DUR, KURAL 5: applied != applied + spot-checked.

2) Playwright: sabit bekleme yerine koşul bekleme:
- sleep / sabit timeout YASAK.
- await page.waitForFunction / waitForSelector ile koşula bağlı bekle.
- Görsel testte screenshot'tan önce ilgili element görünür + stabil olana kadar bekle, sleep(ms) ile değil.

3) Subagent fan-out kısa formu:
- Paralel iş (örn. çok-cluster fix) için subagent fan-out kullanılabilir.
- Sub-sprint disiplini DEĞİŞMEZ: 1 sub-sprint = 1 commit + 1 SW bump + 1 memory kaydı. Subagent'lar paralel çalışır, sonuç TEK commit'te toplanır; her subagent ayrı commit/SW bump AÇMAZ.
- Her subagent çıktısı ana akışta 3-katman doğrulamadan geçer.
