// SPRINT BUL2B madde 2 — BJCP 2021 "Commercial Examples:" satırları → ticari bira adı indeksi (AI'SIZ, kaynaklı).
// Kaynak: BJCP_2021_raw.txt (BJCP_2021_Guidelines.pdf metni). Satır kırılmaları birleştirilir ("Westmalle\nExtra" → "Westmalle Extra"),
// satır sonu tirelemesi birleştirilir. Her bira için: BJCP 2021 stil kodu + adı + "Commercial Examples:" satırının numarası (1 tabanlı).
// Stil eşlemesi ÇALIŞMA ANINDA: uygulama anahtarı = _BUL_ETIKET'te aynı kod VE aynı BJCP adı. 34A/34B/34C (sepet stiller) ve uygulamada
// karşılığı olmayan stiller çip üretmez (uygulama "BJCP bu birayı kendi stiline koymuyor" der).
// Çıktı: stdout'a JSON [{ b:bira, kod, ad, satir }], stderr'e özet. Elle bira / stil EKLENMEZ.
const fs = require('fs'), path = require('path');
const raw = fs.readFileSync(path.join(__dirname, 'BJCP_2021_raw.txt'), 'utf8').split(/\r?\n/);
const out = []; let cur = null, stilN = 0;
const ALAN = /^(Tags|Overall Impression|Aroma|Appearance|Flavor|Mouthfeel|Comments|History|Characteristic Ingredients|Style Comparison|Vital Statistics|Entry Instructions|Commercial Examples|Strength classifications|Variations):/;
for (let i = 0; i < raw.length; i++) {
  const L = raw[i].trim();
  const h = /^(\d{1,2}[A-Z]|X\d)\.\s+(.+)$/.exec(L), h2 = /^(Specialty IPA|Historical Beer):\s+(.+)$/.exec(L);
  if (h && !/\.{4,}/.test(L)) { cur = { kod: h[1], ad: h[2].trim() }; continue; }
  if (h2) { cur = { kod: h2[1] === 'Specialty IPA' ? '21B' : '27', ad: h2[2].trim() }; continue; }
  if (cur && /^Commercial Examples:/.test(L)) {
    const satir = i + 1; let s = L.replace(/^Commercial Examples:\s*/, '');
    while (i + 1 < raw.length) { const n = raw[i + 1].trim(); if (!n || ALAN.test(n) || /^(\d{1,2}[A-Z])\.\s/.test(n)) break; i++; s = /[A-Za-z]-$/.test(s) ? s.slice(0, -1) + n : s + ' ' + n; }
    // ayraç: virgül, noktalı virgül, cümle sonu; "Dark Versions – ", "English – " gibi alt başlık önekleri atılır; küçük harfle başlayan / cümle parçası öğe atılır
    const adlar = s.replace(/\.\s*$/, '').split(/[;,]\s*|\.\s+(?=[A-Z])/).map(x => x.replace(/\s+/g, ' ').replace(/^[^–]*–\s*/, '').trim())
      .filter(x => x && /^[A-Z0-9ÀÁÂÄÇÉÈÍÎÖÓÔÜŠŽ]/.test(x) && !/^(none|n\/a)$/i.test(x) && !/\b(in the|as this|have|from|typically|such as)\b/i.test(x));
    if (adlar.length) stilN++;
    adlar.forEach(b => { if (!out.some(o => o.b === b && o.kod === cur.kod)) out.push({ b, kod: cur.kod, ad: cur.ad, satir }); });
  }
}
process.stderr.write('BJCP 2021 Commercial Examples: ' + stilN + ' stil · ' + out.length + ' bira adı\n');
process.stdout.write(JSON.stringify(out));
