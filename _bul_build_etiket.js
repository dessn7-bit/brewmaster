// SPRINT BUL1 — BJCP 2021 stil etiketleri (Style Tag Reference, PDF s. xiii–xiv) → uygulamanın BJCP anahtarları.
// Kaynak: BJCP_2021_raw.txt (BJCP_2021_Guidelines.pdf metni). Her stilin "Tags:" satırı AYNEN okunur; eşleme yalnız ad üzerinden.
// Çıktı: stdout'a JSON { anahtar: { kod, ad, t:[etiketler] } } + eşlenemeyenler listesi (stderr). Elle etiket UYDURULMAZ:
// eşlenemeyen stilin etiketi yok sayılır (köken/aile çipi o stili "bilinmiyor" görür).
const fs = require('fs'), path = require('path');
const KOK = __dirname;
const raw = fs.readFileSync(path.join(KOK, 'BJCP_2021_raw.txt'), 'utf8').split(/\r?\n/);
const html = fs.readFileSync(path.join(KOK, 'Brewmaster_v2_79_10.html'), 'utf8');
const i0 = html.indexOf('const BJCP = {'), i1 = html.indexOf('\n};', i0);
const BJCP = new Function('return ' + html.slice(i0 + 13, i1 + 2))();

// 1) stil başlıkları + etiketler
const stiller = []; let cur = null;
for (let i = 0; i < raw.length; i++) {
  const L = raw[i].trim();
  const h = /^(\d{1,2}[A-Z])\.\s+(.+)$/.exec(L), h2 = /^(Specialty IPA|Historical Beer):\s+(.+)$/.exec(L);
  if (h && !/\.{4,}/.test(L)) { cur = { kod: h[1], ad: h[2].trim(), t: null }; stiller.push(cur); continue; }
  if (h2) { cur = { kod: h2[1] === 'Specialty IPA' ? '21B' : '27', ad: h2[2].trim(), t: null }; stiller.push(cur); continue; }
  if (cur && /^Tags:/.test(L) && !cur.t) {
    let s = L.replace(/^Tags:\s*/, '');
    while (/[,-]$/.test(s) && i + 1 < raw.length) { i++; const n = raw[i].trim(); s = /-$/.test(s) ? s + n : s + ' ' + n; }
    cur.t = s.split(/,\s*/).map(x => x.trim()).filter(Boolean);
  }
}
const etiketli = stiller.filter(s => s.t);

// 2) uygulama anahtarı → BJCP 2021 stili (ad eşleme; normalize)
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, ' ').trim();
const adHarita = {}; etiketli.forEach(s => { adHarita[norm(s.ad)] = s; });
// Elle eşleme: yalnız aynı stilin farklı yazımı (BJCP 2021 adı ile birebir aynı stil). Yeni stil UYDURULMAZ.
const ELLE = {
  'Saison / Farmhouse Ale': 'Saison', 'Saison (table)': 'Saison', 'Saison (super)': 'Saison',
  'Witbier / Belgian White': 'Witbier', 'Weizen / Weissbier': 'Weissbier', 'Helles / Münchner Hell': 'Munich Helles',
  'Festbier / Wiesn': 'Festbier', 'Munich Märzen / Oktoberfest': 'Märzen', 'Rauchbier / Bamberg Smoked': 'Rauchbier',
  'Kellerbier / Zwickelbier': null, 'Dortmunder Export': 'German Helles Exportbier', 'Maibock / Helles Bock': 'Helles Bock',
  'California Common / Steam Beer': 'California Common', 'Grodziskie / Grätzer': 'Piwo Grodziskie', 'Altbier / Düsseldorf Altbier': 'Altbier',
  'Belgian Quadrupel / Abt': 'Belgian Dark Strong Ale', 'Norwegian Farmhouse / Kveik': null, 'Scottish Ale / 60 Shilling': 'Scottish Light',
  'Scottish Ale / 80 Shilling': 'Scottish Export', 'Scottish Ale / Wee Heavy': 'Wee Heavy', 'American Amber Ale / Red Ale': 'American Amber Ale',
  'Imperial IPA / DIPA': 'Double IPA', 'NEIPA / Hazy IPA': 'Hazy IPA', 'Imperial / Russian Imperial Stout': 'Imperial Stout',
  'Milk Stout / Sweet Stout': 'Sweet Stout', 'Winter Warmer / Old Ale': 'Old Ale', 'Blonde Ale / Cream Ale': 'Blonde Ale',
  // BJCP 2021'de AYNI stilin yeni / farklı adı (BJCP metni: Strong Bitter = eski ESB, American Porter = eski Robust Porter,
  // English Porter = eski Brown Porter, Dunkles Bock = eski Traditional Bock). Yalnız birebir aynı stil.
  'Dubbel': 'Belgian Dubbel', 'Tripel': 'Belgian Tripel', 'Belgian Blonde Ale': 'Belgian Blond Ale', 'Belgian Strong Golden Ale': 'Belgian Golden Strong Ale',
  'Trappist Single / Abbey Ale': 'Belgian Single', 'Bock': 'Dunkles Bock', 'Dunkelweizen': 'Dunkles Weissbier', 'English Bitter / ESB': 'Strong Bitter',
  'English Brown Ale': 'British Brown Ale', 'English Barleywine': 'English Barley Wine', 'Brown Porter': 'English Porter', 'Robust Porter': 'American Porter',
  'Dry Irish Stout': 'Irish Stout', 'Roggenbier / Rye Beer': 'Roggenbier', 'Sahti / Nordic Farmhouse': 'Sahti', 'Black IPA / Cascadian Dark Ale': 'Black IPA',
  'American Amber IPA / Red IPA': 'Red IPA', 'Herb & Spice Beer': 'Spice, Herb, or Vegetable Beer', 'Christmas / Holiday Beer': 'Winter Seasonal Beer',
  'Mixed Fermentation Sour': 'Mixed-Fermentation Sour Beer', 'Sour Ale / Kettle Sour': 'Straight Sour Beer', 'Belgian Witbier': 'Witbier'
};
const out = {}, yok = [];
Object.keys(BJCP).forEach(k => {
  let s = null;
  if (Object.prototype.hasOwnProperty.call(ELLE, k)) s = ELLE[k] ? adHarita[norm(ELLE[k])] : null;
  if (!s) s = adHarita[norm(k)];
  if (!s) for (const p of k.split(' / ')) { if (adHarita[norm(p)]) { s = adHarita[norm(p)]; break; } }
  if (s) out[k] = { kod: s.kod, ad: s.ad, t: s.t }; else yok.push(k);
});
process.stderr.write('BJCP 2021 stil başlığı ' + stiller.length + ' · etiketli ' + etiketli.length + ' · uygulama anahtarı ' + Object.keys(BJCP).length + ' · eşlenen ' + Object.keys(out).length + ' · eşlenemeyen ' + yok.length + '\n');
if (process.argv.includes('--yok')) process.stderr.write(yok.join(' | ') + '\n');
const elleKotu = Object.keys(ELLE).filter(k => ELLE[k] && !adHarita[norm(ELLE[k])]);
if (elleKotu.length) { process.stderr.write('ABORT: elle eşlemedeki BJCP adı metinde yok: ' + elleKotu.join(', ') + '\n'); process.exit(1); }
process.stdout.write(JSON.stringify(out));
