# Benchmark Step 17B — Çalıştırma

## Adımlar

1. https://dessn7-bit.github.io/brewmaster/Brewmaster_v2_79_10.html aç
2. Reçete Defteri'nden HERHANGİ bir reçeteyi düzenle ekranında aç (motorların init olması için)
3. F12 → Console
4. Şu tek satırı yapıştır + Enter:

       fetch("https://raw.githubusercontent.com/dessn7-bit/brewmaster/main/_benchmark_step_17b_runner.js?t="+Date.now()).then(r=>r.text()).then(eval)

5. Console'da `[bm17b] Pool: N reçete` mesajı + her 25 reçetede ilerleme. Bittiğinde otomatik indirme: `benchmark_step_17b_report.md`
6. İndirilen dosyayı Claude'a yapıştır

## Çıktılar
- `benchmark_step_17b_report.md` (otomatik indirme)
- Console'da `console.table` özet
- `localStorage._bm_benchmark_step_17b_result` (full JSON cache)

## Hata olursa
- Console'daki `[bm17b]` prefix'li mesajları kopyala
- "Eksik global'ler" listesi varsa Claude'a göster
- 1000+ reçete varsa süre uzun olabilir (her reçete ~50-200ms tahmini)
