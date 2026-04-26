# Baseline Step 19 — V6 Motor (FIX ÖNCESİ)

## Amaç

Mevcut V6 motorunu, kütüphanedeki TÜM reçetelere koştur (pool filtre yok — S.stil boş olsa da çalışır). Top-3 tahmini topla, sonradan etiketleyip her fix'ten sonra regression test için baseline.

## Adımlar

1. https://dessn7-bit.github.io/brewmaster/Brewmaster_v2_79_10.html aç
2. Reçete Defteri'nden HERHANGİ bir reçeteyi düzenle ekranında aç (motorların init olması için)
3. F12 → Console
4. Şu tek satırı yapıştır + Enter:

       fetch("https://raw.githubusercontent.com/dessn7-bit/brewmaster/main/_baseline_step_19_v6.js?t="+Date.now()).then(r=>r.text()).then(eval)

5. Console'da `[bm19] Baseline başlıyor — N reçete` mesajı + bittiğinde `[bm19] DONE. Süre: X ms`. Otomatik indirme: `baseline_step_19_v6_report.md`
6. İndirilen dosyayı aç — her reçete için biraAd, ozet (og/fg/abv/ibu/srm), maya, V6 top-3 listelendi. Her birinin altında "Kullanıcı doğru stil etiketi: _______" boşluğu var, manuel doldur.
7. Etiketli rapor: gelecek fix'lerden sonra regression görmek için referans.

## Çıktılar

- `baseline_step_19_v6_report.md` (otomatik indirme)
- Console'da `console.table` özet (biraAd / GT / V6 top-1/2/3 + confidence)
- `localStorage._bm_baseline_step_19_v6_result` (full JSON cache)

## 17B harness ile farklar

- Pool filtre **YOK** — tüm KR (S.stil boş olsa bile)
- Sadece V6 motoru çağrılır (V2c, V5 atlanır)
- Ground truth otomatik karşılaştırma yok — kullanıcı manuel etiketleyecek
- Slug→BJCP normalize katmanı yok (V6 top-3 ham slug + displayTR)
- Mismatch tally yok

## Hata olursa

- Console'daki `[bm19]` prefix'li mesajları kopyala
- "Eksik global'ler" listesi varsa Claude'a göster
- 7 reçete için süre ~2-5 saniye olmalı
