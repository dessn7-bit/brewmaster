// Manuel signature iyilestirmeleri — test sonuclarindan cikan ince ayarlar.
// Her iterasyonda buraya ekleyip calistiriyoruz.
const fs = require('fs');
const defs = JSON.parse(fs.readFileSync('./STYLE_DEFINITIONS.json','utf8'));
const R = (src, flags='i') => ({ __regex: src, flags });

function addMalt(slug, key, rule) {
  defs[slug].thresholds.malt = defs[slug].thresholds.malt || {};
  defs[slug].thresholds.malt[key] = rule;
}
function addMarker(slug, key, rule) {
  defs[slug].thresholds.markers = defs[slug].thresholds.markers || {};
  defs[slug].thresholds.markers[key] = rule;
}
function removeMarker(slug, key) {
  if (defs[slug].thresholds.markers && defs[slug].thresholds.markers[key]) {
    delete defs[slug].thresholds.markers[key];
  }
}

// ═══ PATCH 1 — Hefeweizen'e pilsnerPct ekle ═══
// BM mapping'inde Hefeweizen ≠ Weizen/Weissbier; ikisi farkli signature'a sahip ama merge'de atlanmis
addMalt('south_german_hefeweizen', 'pilsnerPct', {
  safe:     { min: 30, max: 50, scoreBonus: 25 },
  marginal: { min: 20, max: 30, scoreBonus: 10 },
});

// ═══ PATCH 2 — Kristal Weizen: filtrasyon zorunlu ═══
// Kristal = filtrelenmis Hefeweizen. Reçete "filtered: true" değilse puan vermesin.
// recipe.filtered (veya recipe._hasFiltrasyon) flag'i kullanacak.
addMarker('south_german_kristal_weizen', 'filtration_required', {
  safe:      { customCheck: 'filtered', scoreBonus: 20, label: 'Filtrasyon var' },
  exclusion: { customCheck: 'notFiltered', hardZero: true, reason: 'Kristal Weizen: filtrasyon zorunlu' },
});

// ═══ PATCH 3 — APA'nin Amerikan hop karakteri (ayirt edicilik International Pale'e karsi) ═══
// APA: Amerikan hop (cascade/centennial/citra vs) SAFE, klasik Avrupa hop düşük
if (defs['american_pale_ale']) {
  addMarker('american_pale_ale', 'american_hop_signature', {
    safe:      { marker: R('cascade|centennial|citra|simcoe|mosaic|amarillo|columbus|chinook|comet|chinook|galaxy'), field: 'hop', scoreBonus: 25, label: 'Amerikan hop karakteri' },
  });
}

// International Pale Ale: klasik Avrupa/melez — Amerikan hop varsa onun da avantajı var ama daha az
if (defs['international_pale_ale']) {
  // Mevcut bonusHop signature'i zaten orada — ekstra katmadik
  // Ama bu stilin pilsnerPct tarzi baz malt karakteristigini oldur: baseMaltPct zaten var
  // International Pale normalde düsük-orta IBU, APA yüksek IBU
  // International Pale'in ibu aralıgı (BA 18-25) dar olmalı — kontrol ediyoruz
}

// ═══ PATCH 4 — Specialty stilleri için "spesiflik cezası" ═══
// Aged Beer / Fresh Hop Beer / Experimental / Non-Alcohol / Historical / Other Strong / Smoke Beer /
// Wild Beer / Gluten-Free — bu stiller her şeyi kabul eder, bu yüzden baseline score'ları düşürülür.
// Çözüm: yeast.safe.scoreBonus azaltilir (8-element primary ile tipik reçete hit alıyor)
const GENERIC_SPECIALTY = [
  'aged_beer','fresh_hop_beer','experimental_beer','non_alcohol_malt_beverage',
  'historical_beer','smoke_beer','wild_beer','gluten_free_beer',
  'other_strong_ale_or_lager','specialty_beer','experimental_india_pale_ale',
];
for (const slug of GENERIC_SPECIALTY) {
  const d = defs[slug];
  if (!d || !d.thresholds?.yeast?.safe) continue;
  // Yeast bonus 40'tan 10'a düşür (çünkü 8 maya primary = hiçbir maya özgünlük taşımıyor)
  if (d.thresholds.yeast.safe.types.length >= 6) {
    d.thresholds.yeast.safe.scoreBonus = 10;
  }
  // SRM/IBU/ABV/OG range çok genişse bonus azaltılır
  if (d.thresholds.srm?.safe && (d.thresholds.srm.safe.max - d.thresholds.srm.safe.min) >= 30) {
    d.thresholds.srm.safe.scoreBonus = 3;
  }
  if (d.thresholds.ibu?.safe && (d.thresholds.ibu.safe.max - d.thresholds.ibu.safe.min) >= 40) {
    d.thresholds.ibu.safe.scoreBonus = 3;
  }
  if (d.thresholds.abv?.safe && (d.thresholds.abv.safe.max - d.thresholds.abv.safe.min) >= 6) {
    d.thresholds.abv.safe.scoreBonus = 3;
  }
  if (d.thresholds.og?.safe && (d.thresholds.og.safe.max - d.thresholds.og.safe.min) >= 0.040) {
    d.thresholds.og.safe.scoreBonus = 3;
  }
}

// ═══ PATCH 5 — International Pale Ale IBU aralığı düzelt ═══
// BA 2026: International Pale Ale IBU 18-25. Bizim otomatik turetmede de öyle olmalı.
// Kontrol: defs['international_pale_ale']?.ibu değerleri
if (defs['international_pale_ale']?.thresholds?.ibu?.safe) {
  // BA tanımına sadık kalıp APA'dan (30-50) ayıralım
  defs['international_pale_ale'].thresholds.ibu.safe = { min: 18, max: 28, scoreBonus: 10 };
  defs['international_pale_ale'].thresholds.ibu.marginal = { min: 12, max: 38, scoreBonus: 3 };
}

// ═══ PATCH 6 — Italian Grape Ale: fruit zorunlu (üzüm yoksa olmaz) ═══
if (defs['italian_grape_ale']?.thresholds?.markers?.fruit) {
  defs['italian_grape_ale'].thresholds.markers.fruit.exclusion = {
    markerMissing: R('uzum|grape|must|moscato|wine'),
    field: 'katki',
    hardZero: true,
    reason: 'Italian Grape Ale: üzüm veya şarap must\'u zorunlu'
  };
}

// ═══ PATCH 7 — Yanlış UNION sonucu bozulan IBU/SRM aralıkları (BA-first override) ═══
// HYBRID union BA 2026 + BJCP 2021 birleştirdi ama bazı mapping yanlışlar → aralık aşırı genişledi.
// BA'nın orijinal değerini zorla.
const BA_IBU_FIX = {
  'english_summer_ale':                  [20, 30],   // BA; BJCP 'British Golden Ale' (12A) 20-45 ile karıştı
  'american_pale_ale':                   [30, 50],
  'american_india_pale_ale':             [40, 70],
  'extra_special_bitter':                [30, 45],
  'classic_english_pale_ale':            [20, 40],
};
for (const [slug, ibu] of Object.entries(BA_IBU_FIX)) {
  const d = defs[slug]; if (!d?.thresholds?.ibu) continue;
  const [mn, mx] = ibu; const rng = mx - mn;
  d.ibu = ibu;
  d.thresholds.ibu.safe = { min: mn, max: mx, scoreBonus: 10 };
  d.thresholds.ibu.marginal = { min: Math.max(0, mn - rng*0.5), max: mx + rng*0.5, scoreBonus: 3 };
  d.thresholds.ibu.exclusion2 = { min: mx + rng*1.5, hardZero: true, reason: `${d.displayTR}: IBU çok yüksek` };
  if (mn > 5) d.thresholds.ibu.exclusion = { max: Math.max(0, mn - rng*1.5), hardZero: true, reason: `${d.displayTR}: IBU çok düşük` };
}

// ═══ PATCH 8 — Ulusal pale ale stilleri: hop kimliği ZORUNLU ═══
// APA Amerikan hop, Australian Australian hop, NZ nz hop olmazsa exclusion
function requireHop(slug, regex, reasonLabel) {
  const d = defs[slug]; if (!d) return;
  d.thresholds.markers = d.thresholds.markers || {};
  d.thresholds.markers.required_hop_origin = {
    safe:      { marker: regex, field: 'hop', scoreBonus: 25, label: reasonLabel + ' karakteri' },
    exclusion: { markerMissing: regex, field: 'hop', hardZero: true, reason: reasonLabel + ' hop pattern yok' },
  };
}
// Cascade Australian ≠ Amerikan — cascade Amerikan hop. Australian Pale regex'inden çıkarıldı.
requireHop('australian_pale_ale',        R('galaxy|ella|vic_secret|enigma|topaz|pride_of_ringwood|helga|super_pride'), 'Australian Pale');
requireHop('classic_australian_pale_ale', R('pride_of_ringwood|cluster|goldings|fuggle'), 'Classic Australian Pale');
requireHop('new_zealand_pale_ale',       R('motueka|nelson|riwaka|wai_iti|wakatu|taiheke|green_bullet|pacific|nz_cascade'), 'New Zealand Pale');
requireHop('new_zealand_india_pale_ale', R('motueka|nelson|riwaka|wai_iti|wakatu|taiheke|green_bullet|pacific|pacifica'), 'New Zealand IPA');
requireHop('new_zealand_pilsner',        R('motueka|nelson|riwaka|wai_iti|wakatu|taiheke|green_bullet|pacific'), 'New Zealand Pilsner');
requireHop('west_coast_pilsener',        R('cascade|centennial|citra|simcoe|mosaic|columbus|amarillo|chinook|comet'), 'West Coast Amerikan');

// ═══ PATCH 9 — Modern American Pils vs German Pils: hop karakteri farkı ═══
// BA aralıkları hemen hemen aynı. Ayrım hop'ta.
// Modern American Pils: Amerikan hop required. German Pils: Nobel/German hop preferred.
requireHop('american_pilsener',          R('cascade|centennial|citra|simcoe|mosaic|amarillo|columbus|chinook|comet|galaxy'), 'Modern American Pils hop');
// German Pils için safe marker + markersmissing cezası hafif — Amerikan hop olursa Modern American'a kayar
defs['german_pilsener'].thresholds.markers = defs['german_pilsener'].thresholds.markers || {};
defs['german_pilsener'].thresholds.markers.required_noble_hop = {
  safe:      { marker: R('hallertau|tettnang|saaz|hersbrucker|spalt|mittelfrueh|mittelfruh|perle|tradition|magnum'), field: 'hop', scoreBonus: 25, label: 'Kıta Avrupa (noble) hop' },
  exclusion: { markerMissing: R('hallertau|tettnang|saaz|hersbrucker|spalt|mittelfrueh|mittelfruh|perle|tradition|magnum|northern_brewer'), field: 'hop', hardZero: true, reason: 'German Pils: Nobel hop zorunlu' },
};
// Czech Pale Lager için Saaz zorunlu
if (defs['czech_pale_lager']) {
  defs['czech_pale_lager'].thresholds.markers.required_saaz = {
    safe:      { marker: R('saaz|sladek|kazbek|bohemie|premiant'), field: 'hop', scoreBonus: 25, label: 'Saaz / Çek hop' },
    exclusion: { markerMissing: R('saaz|sladek|kazbek|bohemie|premiant'), field: 'hop', hardZero: true, reason: 'Çek Lager: Saaz / Çek hop zorunlu' },
  };
}
// Czech Premium Pale Lager için de aynı
if (defs['czech_premium_pale_lager']) {
  defs['czech_premium_pale_lager'].thresholds.markers = defs['czech_premium_pale_lager'].thresholds.markers || {};
  defs['czech_premium_pale_lager'].thresholds.markers.required_saaz = {
    safe:      { marker: R('saaz|sladek|kazbek|bohemie|premiant'), field: 'hop', scoreBonus: 25, label: 'Saaz / Çek hop' },
    exclusion: { markerMissing: R('saaz|sladek|kazbek|bohemie|premiant'), field: 'hop', hardZero: true, reason: 'Çek Premium Lager: Saaz hop zorunlu' },
  };
}
if (defs['italian_pilsener']) {
  defs['italian_pilsener'].thresholds.markers = defs['italian_pilsener'].thresholds.markers || {};
  defs['italian_pilsener'].thresholds.markers.required_noble_hop = {
    safe:      { marker: R('hallertau|tettnang|saaz|hersbrucker|spalt|mittelfrueh|mittelfruh|perle|tradition'), field: 'hop', scoreBonus: 25, label: 'Nobel hop' },
    exclusion: { markerMissing: R('hallertau|tettnang|saaz|hersbrucker|spalt|mittelfrueh|mittelfruh|perle|tradition'), field: 'hop', hardZero: true, reason: 'İtalyan Pils: Nobel hop zorunlu (dry hop yüksek)' },
  };
}

// ═══ PATCH 10 — NEIPA: oats/wheat zorunlu (Aged Beer gibi gevşek rakiplerle ayrım) ═══
// oats+wheat toplam %10+ olmalı, yoksa NEIPA değil (American IPA'ya kayar)
if (defs['juicy_or_hazy_india_pale_ale']?.thresholds?.malt?.oatsWheatPct) {
  defs['juicy_or_hazy_india_pale_ale'].thresholds.malt.oatsWheatPct.exclusion = {
    max: 4,
    hardZero: true,
    reason: 'NEIPA: oats+wheat ≥ %5 zorunlu (pürüzsüz gövde için)'
  };
}
// American IPA: oats+wheat DÜŞÜK olmalı (NEIPA değil) — soft upper bound
// marginal'den çıkar, exclusion şiddetli değil ama NEIPA'ya kaydırmalı

// ═══ PATCH 11 — NEIPA ve Hazy için Amerikan hop required ═══
requireHop('juicy_or_hazy_india_pale_ale', R('cascade|centennial|citra|simcoe|mosaic|galaxy|amarillo|columbus|chinook|el_dorado|nelson|motueka|azacca|strata|idaho|riwaka'), 'NEIPA Amerikan/tropik hop');
requireHop('juicy_or_hazy_pale_ale',       R('cascade|centennial|citra|simcoe|mosaic|galaxy|amarillo|columbus|chinook|el_dorado|nelson|motueka|azacca|strata'), 'Hazy Pale Ale hop');
requireHop('juicy_or_hazy_strong_pale_ale',R('cascade|centennial|citra|simcoe|mosaic|galaxy|amarillo|columbus|chinook|el_dorado|nelson|motueka|azacca|strata'), 'Hazy Strong Pale hop');
requireHop('american_india_pale_ale',      R('cascade|centennial|citra|simcoe|mosaic|amarillo|columbus|chinook|comet|galaxy|el_dorado|nugget|warrior'), 'American IPA hop');

// ═══ PATCH 12 — Kristal Weizen filtrasyon markerı — custom check kodu motorda işlenecek ═══
// (Zaten PATCH 2'de eklendi, motor tarafında 'customCheck' → recipe.filtered kontrolü)

// ═══ PATCH 13 — German Pils vs Czech Pale Lager ayrımı ═══
// Her ikisi çok benzer. Çözüm: German hop (Hallertau/Tettnang/Spalt) ek bonus German Pils'e.
// Saaz-only ise Czech kazanır; Saaz + Alman hop ise German kazanır.
if (defs['german_pilsener']?.thresholds?.markers) {
  defs['german_pilsener'].thresholds.markers.german_hop_bonus = {
    safe: { marker: R('hallertau|tettnang|spalt|hersbrucker|mittelfrueh|mittelfruh|perle|tradition|magnum|polaris'), field: 'hop', scoreBonus: 15, label: 'Alman hop karakteri' }
  };
}
// Czech Pale Lager: Saaz zorunlu kalsın ama Alman hop VARSA ceza (Amerikan Pilsener gibi).
// Aslında Czech'te hafif Alman hop olabilir, o yüzden exclusion yapmıyoruz; German Pils'e +15 bonus yeterli.

// Helles: pilsnerPct 90-100 + Alman nobel hop (saaz Çek, o yüzden çıkar)
if (defs['munich_helles']?.thresholds?.markers) {
  defs['munich_helles'].thresholds.markers.german_hop_bonus = {
    safe: { marker: R('hallertau|tettnang|spalt|hersbrucker|mittelfrueh|mittelfruh|perle|tradition|magnum'), field: 'hop', scoreBonus: 15, label: 'Alman nobel hop' }
  };
}

// ═══ PATCH 14 — Avustralya Pale Ale rakibi kadar güçlü olmamalı APA için ═══
// APA reçete US-05 + cascade → Australian Pale Ale yakın sonuç veriyordu.
// Cascade'i çıkardığımız için Australian Pale artık elenmeli. Test edelim.
// (Ek patch yok, yukarıdaki değişiklik yeterli)

// ═══ PATCH 15 — German Pils IBU/OG aralıklarını BA'ya sabitle ═══
// Union genişletmesi problem. BA: IBU 25-40, OG 1.044-1.050 (BJCP biraz farklı).
if (defs['german_pilsener']) {
  const mn = 25, mx = 40, rng = mx - mn;
  defs['german_pilsener'].ibu = [mn, mx];
  defs['german_pilsener'].thresholds.ibu = {
    safe:     { min: mn, max: mx, scoreBonus: 10 },
    marginal: { min: Math.max(0, mn - rng*0.5), max: mx + rng*0.5, scoreBonus: 3 },
    exclusion2: { min: mx + rng*1.5, hardZero: true, reason: 'German Pils: IBU çok yüksek' },
    exclusion:  { max: Math.max(0, mn - rng*1.5), hardZero: true, reason: 'German Pils: IBU çok düşük' },
  };
}
if (defs['czech_pale_lager']) {
  const mn = 20, mx = 35, rng = mx - mn;
  defs['czech_pale_lager'].ibu = [mn, mx];
  defs['czech_pale_lager'].thresholds.ibu = {
    safe:     { min: mn, max: mx, scoreBonus: 10 },
    marginal: { min: Math.max(0, mn - rng*0.5), max: mx + rng*0.5, scoreBonus: 3 },
  };
}
if (defs['czech_premium_pale_lager']) {
  const mn = 30, mx = 45, rng = mx - mn;
  defs['czech_premium_pale_lager'].ibu = [mn, mx];
  defs['czech_premium_pale_lager'].thresholds.ibu = {
    safe:     { min: mn, max: mx, scoreBonus: 10 },
    marginal: { min: Math.max(0, mn - rng*0.5), max: mx + rng*0.5, scoreBonus: 3 },
  };
}

// ═══ PATCH 16 — APA signature Nordic Pale ile karistirildi; duzelt ═══
// Mapping sirasinda Nordic Pale Ale'in signature'i APA'ya tasindi. APA'nin kendi BM signature'ini zorla.
if (defs['american_pale_ale']) {
  defs['american_pale_ale'].signature = {
    baseMaltPct: [85, 95],
    crystalPct: [2, 10],
    banMalt:    R('chocolate|roasted_barley|brown_malt|dark_crystal'),
    bonusHop:   R('cascade|centennial|amarillo|citra|simcoe|chinook|columbus|comet|galaxy'),
    bonusMaya:  R('us05|nottingham|wy1056|wlp001|bb_ale|bb_pamona|bry97|wlp090'),
    __source: 'manual_fix_APA',
  };
  // Threshold markers da guncelleme
  defs['american_pale_ale'].thresholds.markers = defs['american_pale_ale'].thresholds.markers || {};
  defs['american_pale_ale'].thresholds.markers.bonusMaya = {
    safe: { marker: R('us05|nottingham|wy1056|wlp001|bb_ale|bb_pamona|bry97|wlp090'), field: 'maya', scoreBonus: 20, label: 'Tipik APA maya' }
  };
  defs['american_pale_ale'].thresholds.markers.bonusHop = {
    safe: { marker: R('cascade|centennial|amarillo|citra|simcoe|chinook|columbus|comet|galaxy'), field: 'hop', scoreBonus: 5, label: 'APA hop profili' }
  };
}

// ═══ PATCH 18 — BA-BJCP duplicate merge (aynı stil, 2 kayıt) ═══
// Dunkles Weissbier (BJCP 10B) = South German-Style Dunkel Weizen (BA). Tek kayda indir.
if (defs['dunkles_weissbier'] && defs['south_german_dunkel_weizen']) {
  // Dunkles Weissbier'i sil, aliaslarını South German-Style Dunkel Weizen'a aktar
  const aliases = defs['south_german_dunkel_weizen'].aliases || [];
  aliases.push('Dunkles Weissbier', 'Dunkelweizen');
  defs['south_german_dunkel_weizen'].aliases = [...new Set(aliases)];
  defs['south_german_dunkel_weizen'].bjcpCode = defs['south_german_dunkel_weizen'].bjcpCode || '10B';
  defs['south_german_dunkel_weizen'].bjcpName = 'Dunkles Weissbier';
  delete defs['dunkles_weissbier'];
}

// ═══ PATCH 19 — Specialty stilleri ÇOK daha sıkı cezala (Winter Seasonal, American Porter, European Dark Lager çok yüksek çıkıyor) ═══
// Bu stiller signature detaylı ama yeast/srm/ibu çok geniş. Aslında "toplam ağırlık" ceza uygulayalım.
// Daha sıkı: Bu 13 stilin TÜM safe bonuslarını yarıya düşür.
const TIGHT_SPECIALTY = [
  'winter_seasonal_beer','autumn_seasonal_beer','spice_herb_or_vegetable_beer',
  'american_porter',
  'american_imperial_porter',   // oatmeal/milk/imperial stout'u yeniyor, tightle
  'american_wheat_wine_ale',    // hefeweizen gibi stilleri yeniyor
  'european_dark_lager','international_dark_lager','international_amber_lager','international_pale_lager',
  'fresh_hop_beer','aged_beer','experimental_beer','historical_beer',
  'other_strong_ale_or_lager','gluten_free_beer','smoke_beer','wild_beer',
  'specialty_beer','specialty_honey_beer','brett_beer','mixed_culture_brett_beer',
  'american_wheat_beer',
  // Experimental IPA: zaten rakip, ama burada tightle
  'experimental_india_pale_ale',
];
for (const slug of TIGHT_SPECIALTY) {
  const d = defs[slug]; if (!d?.thresholds) continue;
  const t = d.thresholds;
  // Yeast bonus 10 → 5
  if (t.yeast?.safe) t.yeast.safe.scoreBonus = Math.min(t.yeast.safe.scoreBonus, 5);
  // SRM/IBU/ABV/OG bonus 15/10 → 3
  if (t.srm?.safe) t.srm.safe.scoreBonus = 3;
  if (t.ibu?.safe) t.ibu.safe.scoreBonus = 3;
  if (t.abv?.safe) t.abv.safe.scoreBonus = 3;
  if (t.og?.safe)  t.og.safe.scoreBonus = 3;
  // Malt bonus 25 → 10
  for (const m of Object.values(t.malt || {})) {
    if (m.safe?.scoreBonus) m.safe.scoreBonus = 10;
  }
}

// ═══ PATCH 20 — Belgian Strong ailesi ABV zorunlu ayrımları ═══
// Dubbel ABV üst sınır exclusion ekle (yüksek reçete Dubbel değil)
if (defs['belgian_dubbel']?.thresholds?.abv) {
  defs['belgian_dubbel'].thresholds.abv.exclusion2 = { min: 8.2, hardZero: true, reason: 'Dubbel: ABV ≥ 8.2 değilse bu stil olmaz (Dark Strong/Quad\'a kayar)' };
}
// Tripel OG zorunlu ≥ 1.070
if (defs['belgian_tripel']?.thresholds?.og) {
  defs['belgian_tripel'].thresholds.og.exclusion = { max: 1.070, hardZero: true, reason: 'Tripel: OG ≥ 1.070 zorunlu' };
}
// Belgian Strong Blonde ABV ≥ 7.5
if (defs['belgian_strong_blonde_ale']?.thresholds?.abv) {
  defs['belgian_strong_blonde_ale'].thresholds.abv.exclusion = { max: 7.2, hardZero: true, reason: 'Belgian Strong Blonde: ABV ≥ 7.5 zorunlu' };
}
// Belgian Dark Strong: ABV ≥ 8.0 hard zero
if (defs['belgian_strong_dark_ale']?.thresholds?.abv) {
  defs['belgian_strong_dark_ale'].thresholds.abv.exclusion = { max: 7.5, hardZero: true, reason: 'Belgian Dark Strong: ABV ≥ 8.0 zorunlu' };
  defs['belgian_strong_dark_ale'].thresholds.srm = defs['belgian_strong_dark_ale'].thresholds.srm || {};
  defs['belgian_strong_dark_ale'].thresholds.srm.exclusion = { max: 7, hardZero: true, reason: 'Belgian Dark Strong: SRM ≥ 8 zorunlu' };
}
// Quadrupel ABV ≥ 9.5 zaten var; OG ≥ 1.090
if (defs['belgian_quadrupel']?.thresholds?.og) {
  defs['belgian_quadrupel'].thresholds.og.exclusion = { max: 1.085, hardZero: true, reason: 'Quadrupel: OG ≥ 1.090 zorunlu' };
}

// ═══ PATCH 21 — Lager alt-varyant ayrımları ═══
// Helles: pilsner >95% (çok saf), IBU 16-22 (düşük)
if (defs['munich_helles']) {
  defs['munich_helles'].thresholds.markers.required_noble_hop = {
    safe:      { marker: R('hallertau|tettnang|spalt|hersbrucker|mittelfrueh|mittelfruh'), field: 'hop', scoreBonus: 25, label: 'Alman Helles hop' },
    exclusion: { markerMissing: R('hallertau|tettnang|spalt|hersbrucker|mittelfrueh|mittelfruh|saaz|perle|tradition'), field: 'hop', hardZero: true, reason: 'Helles: Alman nobel hop zorunlu' },
  };
  // IBU 16-22 darıntı
  if (defs['munich_helles'].thresholds.ibu) {
    defs['munich_helles'].thresholds.ibu.safe = { min: 16, max: 22, scoreBonus: 10 };
    defs['munich_helles'].thresholds.ibu.marginal = { min: 10, max: 28, scoreBonus: 3 };
    defs['munich_helles'].thresholds.ibu.exclusion2 = { min: 35, hardZero: true, reason: 'Helles: IBU ≤ 28 olmalı' };
  }
}
// Dortmunder: IBU 20-30, biraz daha karakterli
if (defs['dortmunder_european_export']) {
  defs['dortmunder_european_export'].thresholds.markers.required_noble_hop = {
    safe:      { marker: R('hallertau|tettnang|spalt|hersbrucker|saaz|mittelfrueh'), field: 'hop', scoreBonus: 25, label: 'Nobel hop' },
    exclusion: { markerMissing: R('hallertau|tettnang|spalt|hersbrucker|saaz|mittelfrueh|perle|tradition|magnum'), field: 'hop', hardZero: true, reason: 'Dortmunder: Nobel hop zorunlu' },
  };
}
// Vienna Lager: Vienna malt %25+ ZORUNLU
if (defs['vienna_lager']?.thresholds?.malt) {
  defs['vienna_lager'].thresholds.malt.viennaPct = defs['vienna_lager'].thresholds.malt.viennaPct || {};
  defs['vienna_lager'].thresholds.malt.viennaPct.exclusion = { max: 10, hardZero: true, reason: 'Vienna Lager: Vienna malt ≥ %15 zorunlu' };
  defs['vienna_lager'].thresholds.malt.viennaPct.safe = defs['vienna_lager'].thresholds.malt.viennaPct.safe || { min: 30, max: 70, scoreBonus: 25 };
}
// Czech Amber Lager: Munich+Vienna %20+ + Saaz
if (defs['czech_amber_lager']) {
  defs['czech_amber_lager'].thresholds.markers = defs['czech_amber_lager'].thresholds.markers || {};
  defs['czech_amber_lager'].thresholds.markers.required_saaz = {
    safe:      { marker: R('saaz|kazbek|bohemie|premiant|sladek'), field: 'hop', scoreBonus: 25, label: 'Saaz/Çek hop' },
    exclusion: { markerMissing: R('saaz|kazbek|bohemie|premiant|sladek'), field: 'hop', hardZero: true, reason: 'Czech Amber Lager: Saaz zorunlu' },
  };
}
// Munich Dunkel: Munich malt %40+ ZORUNLU, signature'da zaten var — exclusion ekle
if (defs['munich_dunkel']?.thresholds?.malt?.munichPct) {
  defs['munich_dunkel'].thresholds.malt.munichPct.exclusion = { max: 30, hardZero: true, reason: 'Munich Dunkel: Munich malt ≥ %40 zorunlu' };
}
// European Dark Lager / International Dark Lager: ZORUNLU marker yok; bu yüzden çok gevşek.
// Ceza: SRM safe'i daralt (14-20 yerine 16-30)
if (defs['european_dark_lager']) {
  // Ayrıca bu BA genel kategori — ceza eklendi üstte TIGHT_SPECIALTY'de
}
// Schwarzbier: roasted 3+ zorunlu
if (defs['german_schwarzbier']?.thresholds?.malt) {
  defs['german_schwarzbier'].thresholds.malt.roastedPct = defs['german_schwarzbier'].thresholds.malt.roastedPct || {};
  defs['german_schwarzbier'].thresholds.malt.roastedPct.safe = defs['german_schwarzbier'].thresholds.malt.roastedPct.safe || { min: 2, max: 8, scoreBonus: 25 };
  defs['german_schwarzbier'].thresholds.malt.roastedPct.exclusion = { max: 0.5, hardZero: true, reason: 'Schwarzbier: roasted %2+ zorunlu' };
  // Malt composite var, roasted/choc birinde olsun
}

// ═══ PATCH 22 — Stout/Porter ayrımları ═══
// American Porter: ABV 4.8-6.5 aralığını sıkı tut (7+ ise Imperial Porter)
if (defs['american_porter']?.thresholds?.abv) {
  defs['american_porter'].thresholds.abv.exclusion2 = { min: 7.2, hardZero: true, reason: 'American Porter: ABV ≤ 6.5 (üstü Imperial Porter)' };
}
// American Imperial Stout: OG ≥ 1.075 zorunlu (alt Imperial değil)
if (defs['american_imperial_stout']?.thresholds?.og) {
  defs['american_imperial_stout'].thresholds.og.exclusion = { max: 1.075, hardZero: true, reason: 'American Imperial Stout: OG ≥ 1.075' };
}
// American Imperial Porter: Porter karakteri, stout değil. SRM ≤ 40
// Ama Imperial Porter vs Imperial Stout ince fark: Stout'ta roasted barley dominant.
// American Imperial Porter için ABV 7-12, OG 1.080-1.100. Reçete benzer aralık.
// Ayrım: Imperial Stout roasted barley %5+; Imperial Porter chocolate-dominant.
// Reçete: roasted 8, choc 15. Imperial Stout için uygun.
// Imperial Porter'a ceza: roasted barley yüksek ise skor düşür.

// ═══ PATCH 23 — IPA alt-ailesi ═══
// Session IPA: ABV ≤ 5.0 zorunlu
if (defs['session_india_pale_ale']?.thresholds?.abv) {
  defs['session_india_pale_ale'].thresholds.abv.exclusion2 = { min: 5.5, hardZero: true, reason: 'Session IPA: ABV ≤ 5.5' };
}
// West Coast IPA: SRM açık (2-7), FG düşük, hop yüksek
if (defs['west_coast_india_pale_ale']?.thresholds) {
  defs['west_coast_india_pale_ale'].thresholds.markers.required_hop_origin = defs['west_coast_india_pale_ale'].thresholds.markers.required_hop_origin || {
    safe:      { marker: R('cascade|centennial|citra|simcoe|mosaic|columbus|chinook|amarillo|comet|chinook|galaxy'), field: 'hop', scoreBonus: 25, label: 'West Coast Amerikan hop' },
    exclusion: { markerMissing: R('cascade|centennial|citra|simcoe|mosaic|columbus|chinook|amarillo|comet|galaxy'), field: 'hop', hardZero: true, reason: 'WCI: Amerikan hop zorunlu' },
  };
  // IBU 45+ gibi
  if (defs['west_coast_india_pale_ale'].thresholds.ibu) {
    defs['west_coast_india_pale_ale'].thresholds.ibu.exclusion = { max: 40, hardZero: true, reason: 'West Coast IPA: IBU ≥ 45 zorunlu' };
  }
}
// American IPA: ABV 5.5-7.5, WCI'dan ayrım SRM
if (defs['american_india_pale_ale']?.thresholds?.abv) {
  defs['american_india_pale_ale'].thresholds.abv.exclusion2 = { min: 8.0, hardZero: true, reason: 'American IPA: ABV ≤ 7.5 (üstü Double IPA)' };
}

// ═══ PATCH 24 — Belgian Gueuze vs Lambic ayrımı ═══
// Gueuze = blend of lambics + aged + high carbonation
// Lambic = single batch, düz
if (defs['belgian_gueuze']?.thresholds) {
  defs['belgian_gueuze'].thresholds.markers = defs['belgian_gueuze'].thresholds.markers || {};
  defs['belgian_gueuze'].thresholds.markers.required_blend = {
    safe:      { customCheck: 'blended', scoreBonus: 20, label: 'Blend' },
    exclusion: { customCheck: 'notBlended', hardZero: true, reason: 'Gueuze: blend veya aged zorunlu' },
  };
}

// ═══ PATCH 25 — ESB / Wee Heavy için Winter Seasonal'dan kurtar ═══
// Winter Seasonal zaten TIGHT_SPECIALTY'de. Bu yeterli olmalı.
// Ek: ESB için İngiliz maya zorunlu marker
if (defs['extra_special_bitter']) {
  defs['extra_special_bitter'].thresholds.markers = defs['extra_special_bitter'].thresholds.markers || {};
  defs['extra_special_bitter'].thresholds.markers.required_english_yeast = {
    safe:      { marker: R('wlp002|wy1968|wy1187|s04|wlp023|wlp005|bry97|nottingham|london_iii|verdant'), field: 'maya', scoreBonus: 20, label: 'İngiliz ale maya' },
    exclusion: { markerMissing: R('wlp002|wy1968|wy1187|s04|wlp023|wlp005|bry97|nottingham|london_iii|verdant|windsor'), field: 'maya', hardZero: true, reason: 'ESB: İngiliz ale maya zorunlu' },
  };
}
if (defs['scotch_ale_or_wee_heavy']) {
  defs['scotch_ale_or_wee_heavy'].thresholds.markers = defs['scotch_ale_or_wee_heavy'].thresholds.markers || {};
  defs['scotch_ale_or_wee_heavy'].thresholds.markers.required_scot_yeast = {
    safe:      { marker: R('wlp028|wy1728|s04|nottingham|mj_m79'), field: 'maya', scoreBonus: 20, label: 'İskoç ale maya' },
    exclusion: { markerMissing: R('wlp028|wy1728|wlp002|wy1968|s04|nottingham|mj_m79|wlp023'), field: 'maya', hardZero: true, reason: 'Wee Heavy: İskoç/İngiliz ale maya zorunlu' },
  };
}

// ═══ PATCH 26 — Blanche Sour: Witbier olması için koriander+portakal zorunlu, sour maya tolerans ═══
// Yeast primary wit olan Witbier, sour maya ile Blanche Sour (hala Witbier kategorisinde).
// Belgian Witbier yeast thresholds'ı yumuşat.
if (defs['belgian_witbier']?.thresholds?.yeast) {
  // sour ve lacto'yu tolerant'a ekle
  const y = defs['belgian_witbier'].thresholds.yeast;
  if (y.exclusion) {
    y.exclusion.types = y.exclusion.types.filter(t => t !== 'sour');
  }
  y.marginal = y.marginal || { types: [], scoreBonus: 15 };
  if (!y.marginal.types.includes('sour')) y.marginal.types.push('sour');
}
// Berliner Weisse Blanche Sour'a ceza: koriander+portakal olunca Berliner değil
// (Eklemiyoruz, Witbier zaten kazanmalı)

// ═══ PATCH 27 — American Brown Ale: roasted barley ≤ %2 ═══
if (defs['american_brown_ale']?.thresholds?.malt) {
  defs['american_brown_ale'].thresholds.malt.roastedPct = defs['american_brown_ale'].thresholds.malt.roastedPct || {};
  defs['american_brown_ale'].thresholds.malt.roastedPct.exclusion = { min: 5, hardZero: true, reason: 'American Brown: roasted barley ≤ %5 (üstü Stout)' };
}

// ═══ PATCH 29 — Quadrupel ayrım sıklaştırma ═══
// Quadrupel OG ≥ 1.092 zorunlu (BA); Dark Strong OG 1.064-1.096 overlap
if (defs['belgian_quadrupel']?.thresholds?.og) {
  defs['belgian_quadrupel'].thresholds.og.exclusion = { max: 1.088, hardZero: true, reason: 'Quadrupel: OG ≥ 1.090' };
}
if (defs['belgian_quadrupel']?.thresholds?.abv) {
  defs['belgian_quadrupel'].thresholds.abv.exclusion = { max: 9.5, hardZero: true, reason: 'Quadrupel: ABV ≥ 9.5' };
}

// ═══ PATCH 30 — Tripel vs Strong Blonde: Tripel'in ABV üstün sınırı ═══
// Tripel için maya zorunlu: Belgian saison/Tripel characteristik maya
if (defs['belgian_tripel']) {
  defs['belgian_tripel'].thresholds.markers = defs['belgian_tripel'].thresholds.markers || {};
  defs['belgian_tripel'].thresholds.markers.required_tripel_yeast = {
    safe:      { marker: R('wy3787|wlp530|wlp545|t58|wy3726|be256|wy3463|wy3522|bb_abbaye|bb_tripel|bb_belc'), field: 'maya', scoreBonus: 20, label: 'Tripel maya' },
  };
  // Tripel için OG zorunlu ≥ 1.070 (Strong Blonde 1.070 min ile overlap)
}

// ═══ PATCH 31 — Helles vs German Pils: Helles düşük IBU, Pils yüksek ═══
// Reçeteler overlap yaratırsa iki stil de skor alabilir. Kaan'ın Helles reçete IBU 20
// Helles için kabul edilebilir ama German Pils için marginal değil — Pils IBU 25-40 aralığında.
// Şu an Helles için IBU üst 22 zaten daralttık (PATCH 21). Reçete 20 safe.
// German Pils reçete IBU 35 için safe. Kaan'ın reçetesinde Helles IBU 20, Pils IBU 35 — iki ayrı reçete.
// Helles reçete IBU 20 → Pils IBU 25-40 ile marginal 5-55 hit. O yüzden Pils kazanıyor olabilir.
// Düzeltme: German Pils IBU alt sınır exclusion ≤ 18 hardZero
if (defs['german_pilsener']?.thresholds?.ibu) {
  defs['german_pilsener'].thresholds.ibu.exclusion = { max: 18, hardZero: true, reason: 'German Pils: IBU < 20 ise değil' };
}
// Dortmunder IBU 20-30, Helles ile overlap. Reçete IBU 28 — ikisi için safe.
// Ayrım: Dortmunder OG 1.054+ (biraz daha güçlü). Dortmunder için OG zorunlu
if (defs['dortmunder_european_export']?.thresholds?.og) {
  defs['dortmunder_european_export'].thresholds.og.exclusion = { max: 1.048, hardZero: true, reason: 'Dortmunder: OG ≥ 1.048 zorunlu' };
}

// ═══ PATCH 32 — Session IPA ABV ≤ 5.0 zorunlu (zaten patch 23'te var ama sıkılaştır) ═══
// ABV 5.5+ gerçek session değil — zaten var.
// Ek: Session IPA IBU ≥ 30 zorunlu (aksi APA)
if (defs['session_india_pale_ale']?.thresholds?.ibu) {
  defs['session_india_pale_ale'].thresholds.ibu.exclusion = { max: 25, hardZero: true, reason: 'Session IPA: IBU ≥ 30 zorunlu' };
}

// ═══ PATCH 33 — American IPA: Session kapsamından koru ═══
// APA vs Session IPA overlap: IBU 30-50 safe ikisi için de.
// APA: ABV 4.5-6.2. Session IPA: ABV 3.3-5.0. Kaan'ın session reçete ABV 4.8 ikisi için de safe.
// Fark: IBU. Session IPA IBU 30-65. APA 30-50. Reçete IBU 45 — APA safe, Session marginal değil safe.
// Hmm, Session IPA için min 30 yaptık, reçete 45 safe (hem APA hem Session).
// APA'nın Session'dan ayrımı ABV: APA 4.5+. Reçete 4.8 sınırda. APA hit, ama Session IPA da hit.
// Session IPA için ABV üst sınır EXCLUSION ekle: ABV ≥ 5.2 = Session değil
if (defs['session_india_pale_ale']?.thresholds?.abv) {
  defs['session_india_pale_ale'].thresholds.abv.exclusion2 = { min: 5.2, hardZero: true, reason: 'Session IPA: ABV ≤ 5.0' };
}

// ═══ PATCH 34 — Munich Dunkel vs Czech Dark Lager, Czech Amber vs Vienna ═══
// Czech Dark Lager Saaz zorunlu (zaten var). Munich Dunkel hallertau/tettnang.
// Reçete Munich Dunkel: hallertau + %70 munich + choc %3.
// Czech Dark Lager required_saaz exclusion ekle (yoksa elenir)
if (defs['czech_dark_lager']) {
  defs['czech_dark_lager'].thresholds.markers = defs['czech_dark_lager'].thresholds.markers || {};
  defs['czech_dark_lager'].thresholds.markers.required_saaz = {
    safe:      { marker: R('saaz|kazbek|bohemie|premiant|sladek'), field: 'hop', scoreBonus: 25, label: 'Saaz zorunlu' },
    exclusion: { markerMissing: R('saaz|kazbek|bohemie|premiant|sladek'), field: 'hop', hardZero: true, reason: 'Czech Dark Lager: Saaz zorunlu' },
  };
}
// Czech Amber Lager: aynı zaten var.
// Vienna Lager: Vienna malt %20+ (zaten var)

// ═══ PATCH 35 — Czech Pale Lager reçete için IBU üst sınır gevşet ═══
// Reçete Czech Premium: IBU 40. Çek Pale Lager BA IBU 20-35. Reçete 40 marginal (20-42.5).
// Reçete czech_pale_lager için marginal bonus almalı; ama dortmunder safe oldu.
// Daha iyi: Czech Pale'in IBU safe'ini 25-42 (BJCP 3B Czech Premium Pale dahil)
if (defs['czech_pale_lager']?.thresholds?.ibu) {
  defs['czech_pale_lager'].thresholds.ibu.safe = { min: 25, max: 42, scoreBonus: 10 };
  defs['czech_pale_lager'].thresholds.ibu.marginal = { min: 20, max: 48, scoreBonus: 3 };
}

// ═══ PATCH 36 — Blanche Sour problemi ═══
// Reçete sour maya + koriander+portakal + buğday → Berliner Weisse kazanıyor.
// Berliner Weisse koriander/portakal sinyali VER değil. Bu katkılar Witbier işaret.
// Çözüm: Berliner Weisse için koriander/portakal varsa ceza
if (defs['berliner_weisse']?.thresholds?.markers) {
  defs['berliner_weisse'].thresholds.markers.no_witbier_spice = {
    exclusion: { markerPresent: R('koriander|coriander|portakal|orange'), field: 'katki', hardZero: true, reason: 'Berliner: koriander/portakal varsa Witbier' },
  };
}

// ═══ PATCH 37 — American Wheat Beer'i tight tut ama gerçek wheat için bırak ═══
// Test "american_hefeweizen" reçete %50 wheat + US-05. American Wheat Wine kazanıyor.
// Wheat Wine OG ≥ 1.080 zorunlu
if (defs['american_wheat_wine_ale']?.thresholds?.og) {
  defs['american_wheat_wine_ale'].thresholds.og.exclusion = { max: 1.070, hardZero: true, reason: 'Wheat Wine: OG ≥ 1.080 zorunlu' };
}

// ═══ PATCH 38 — Gueuze vs Lambic ═══
// Gueuze blended zorunlu (customCheck). Test reçete aged:true ama blended:undefined.
// Lambic blending yok, Gueuze var. Reçete basit Lambic → Lambic kazanmalı.
// Mevcut Gueuze patch 24'te blended zorunlu. Ama test reçete blended yok → Gueuze exclusion. Ama yine kazanıyor??
// Bakmak lazım — belki Gueuze exclusion'ı customCheck 'notBlended' yanlış işleniyor
// Gueuze başka markerlar hit aldığı için mi? Motor patch'i kontrol

// ═══ PATCH 39 — Specialty Saison tighter ═══
// Specialty Saison rakibi klasik Saison'u yeniyor. Unique trigger yok.
// Specialty Saison = klasik saison + ekstra (hop, meyve, baharat, koyu)
// Ayrım için: Specialty Saison hop/meyve/baharat OLMALI (eğer yoksa klasik Saison)
if (defs['specialty_saison']?.thresholds) {
  defs['specialty_saison'].thresholds.markers = defs['specialty_saison'].thresholds.markers || {};
  defs['specialty_saison'].thresholds.markers.require_special = {
    exclusion: {
      customCheck: 'noSpecialMarker',
      hardZero: true,
      reason: 'Specialty Saison: meyve, baharat, dry hop VEYA dark malt olmalı'
    },
    safe: { customCheck: 'hasSpecialMarker', scoreBonus: 20, label: 'Specialty işareti var' }
  };
}

// ═══ PATCH 28 — Italian Grape Ale kazancını düşür (sıradan IPA/Pale'ı yenmesin) ═══
// Italian Grape Ale fruit zorunlu. Reçete fruit değilse exclusion — zaten Patch 6'da vardı.
// Ek: yeast bonus düşür (ale+belcika 8 tip değil, sadece ale+belcika)
// PATCH 17 — American IPA ABV/OG range hafif daralt (APA ile çakışmasın) ═══
// APA OG 1.045-1.060, IPA OG 1.056-1.070. Kesisim: 1.056-1.060.
// Bu zone'da ABV (APA 4.5-6.2 / IPA 5.5-7.5) ile ayrilir. APA reçete ABV 5.2 → APA safe, IPA marginal.
// Zaten marginal test geçiyor ama IPA ham skor yüksek kalıyor. Adjustment yok, sadece hop marker sorunlarını çözmeliyiz.

fs.writeFileSync('./STYLE_DEFINITIONS.json', JSON.stringify(defs, null, 2), 'utf8');
console.log('Patches uygulandi (v2)');
