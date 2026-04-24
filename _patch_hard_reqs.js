// Malzeme-zorunlu specialty stillere hard requirement ekler.
// Bu stilller ilgili katki/malt yoksa skor 0 verir.
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'STYLE_DEFINITIONS.json');
const defs = JSON.parse(fs.readFileSync(file, 'utf8'));

// Regex ortak havuzu
const RX = {
  fruit:     'meyve|fruit|mango|passion|seftali|peach|strawberry|cilek|çilek|raspberry|ahududu|cherry|kiraz|apricot|kayisi|pineapple|ananas|lemon|limon|blueberry|yabanmersini|uzum|üzüm|grape|muz(?!_maya)|banana|elma|apple|incir|fig|karpuz|watermelon|nar|pomegranate|mulberry|dut',
  grape:     'uzum|üzüm|grape|wine|must|moscato|sangiovese|montepulciano|malvasia|chardonnay|pinot',
  pumpkin:   'pumpkin|kabak|squash|butternut|balkabak|balkabagi|balkabağı|winter_squash',
  chocolate: 'choc|kakao|cocoa|cacao|cikolata|çikolata', // katki VEYA malt
  coffee:    'coffee|kahve|espresso|cold_brew|mocha|moka',
  chili:     'chili|pepper|jalapeno|jalapeño|habanero|chipotle|aci_biber|aci|acı|ancho|poblano|ghost_pepper|carolina|serrano',
  spice:     'koriander|coriander|tarcin|tarçın|cinnamon|zencefil|ginger|clove|karanfil|muskat|cardamom|kakule|vanilla|vanilya|allspice|yenibahar|kimyon|kimyen|anise|basil|fesleğen|fesleyen|mint|nane|herb|baharat|lavender|lavanta|thyme|kekik|rosemary|biberiye|sage|adaçayı|elderflower|mürver|hibiscus|rose|gül|chamomile|papatya|portakal|orange|cilek',
  honey:     'honey|bal_|^bal$|mead',
  smoke_malt:'rauch|smoke|smoked|tutsulenmis|tütsülenmiş|cherry_wood|beech|kirazli|huş|alder',
  rye_malt:  'rye|cavdar|çavdar|rye_malt|chateau_rye|weyermann_rye|briess_rye|rye_flaked',
  sake_yeast:'sake|ginjo|koji|sake_yeast|wyeast_sake|wlp_sake',
  fresh_hop: 'fresh_hop|yas_hop|yaş_hop|wet_hop|fresh|taze_hop',
  vegetable: 'sebze|vegetable|corn|misir|kabak|patates|potato|carrot|havuç|beet|pancar|lahana|kraut|cilantro|kişniş|tomato|domates|kuşkonmaz|asparagus|pumpkin|squash|chili|pepper|biber',
};

// Stil → zorunlu marker tanimlari
// Her kayit: { field: 'katki'|'malt'|'maya', rx: regex, reason: string, bonus?: number }
const REQUIREMENTS = {
  fruit_wheat_beer:          { field:'katki', rx:RX.fruit,     reason:'Fruit Wheat: meyve katkisi zorunlu', bonus:15 },
  fruit_beer:                { field:'katki', rx:RX.fruit,     reason:'Fruit Beer: meyve katkisi zorunlu', bonus:15 },
  american_fruit_beer:       { field:'katki', rx:RX.fruit,     reason:'American Fruit Beer: meyve katkisi zorunlu', bonus:15 },
  belgian_fruit_beer:        { field:'katki', rx:RX.fruit,     reason:'Belgian Fruit Beer: meyve katkisi zorunlu', bonus:15 },
  belgian_fruit_lambic:      { field:'katki', rx:RX.fruit,     reason:'Fruit Lambic: meyve katkisi zorunlu', bonus:15 },
  grape_ale:                 { field:'katki', rx:RX.grape,     reason:'Grape Ale: uzum/sarap katkisi zorunlu', bonus:15 },
  italian_grape_ale:         { field:'katki', rx:RX.grape,     reason:'Italian Grape Ale: uzum/sarap katkisi zorunlu', bonus:15 },

  pumpkin_squash_beer:       { field:'katki', rx:RX.pumpkin,   reason:'Pumpkin/Squash: balkabagi/kabak zorunlu', bonus:15 },
  pumpkin_spice_beer:        { field:'katki', rx:RX.pumpkin,   reason:'Pumpkin Spice: balkabagi zorunlu', bonus:15 },

  chocolate_or_cocoa_beer:   { field:'katki', rx:RX.chocolate, reason:'Chocolate Beer: kakao/cikolata zorunlu (katki)', bonus:15 },
  coffee_beer:               { field:'katki', rx:RX.coffee,    reason:'Coffee Beer: kahve katkisi zorunlu', bonus:15 },
  chili_pepper_beer:         { field:'katki', rx:RX.chili,     reason:'Chili Beer: aci biber zorunlu', bonus:15 },

  herb_and_spice_beer:       { field:'katki', rx:RX.spice,     reason:'Herb & Spice: bitki/baharat zorunlu', bonus:15 },
  fruit_and_spice_beer:      { field:'katki', rx:RX.fruit+'|'+RX.spice, reason:'Fruit & Spice: meyve veya baharat zorunlu', bonus:15 },
  spice_herb_or_vegetable_beer: { field:'katki', rx:RX.spice+'|'+RX.vegetable, reason:'Spice/Herb/Vegetable: baharat/sebze zorunlu', bonus:15 },
  field_beer:                { field:'katki', rx:RX.vegetable, reason:'Field Beer: sebze katkisi zorunlu', bonus:15 },

  specialty_honey_beer:      { field:'katki', rx:RX.honey,     reason:'Honey Beer: bal zorunlu', bonus:15 },

  specialty_smoked_beer:     { field:'malt',  rx:RX.smoke_malt, reason:'Smoked Beer: tütsülenmiş malt zorunlu', bonus:15 },
  style_smoked_beer:         { field:'malt',  rx:RX.smoke_malt, reason:'Style Smoked Beer: tütsülenmiş malt zorunlu', bonus:15 },
  smoke_beer:                { field:'malt',  rx:RX.smoke_malt, reason:'Smoke Beer: tütsülenmiş malt zorunlu', bonus:15 },
  smoke_porter:              { field:'malt',  rx:RX.smoke_malt, reason:'Smoke Porter: tütsülenmiş malt zorunlu', bonus:15 },

  rye_beer:                  { field:'malt',  rx:RX.rye_malt,  reason:'Rye Beer: çavdar maltı zorunlu', bonus:15 },
  roggenbier:                { field:'malt',  rx:RX.rye_malt,  reason:'Roggenbier: çavdar maltı zorunlu', bonus:15 },
  rye_ipa:                   { field:'malt',  rx:RX.rye_malt,  reason:'Rye IPA: çavdar maltı zorunlu', bonus:15 },

  fresh_hop_beer:            { field:'hop',   rx:RX.fresh_hop, reason:'Fresh Hop: taze/yaş hop zorunlu', bonus:15 },
  ginjo_beer_or_sake_yeast_beer: { field:'maya', rx:RX.sake_yeast, reason:'Ginjo/Sake Yeast: sake mayası zorunlu', bonus:15 },

  // Tarihsel / bolgesel smoked stiller
  grodziskie:                { field:'malt',  rx:RX.smoke_malt, reason:'Grodziskie: tütsülenmiş malt zorunlu', bonus:15 },
  piwo_grodziskie:           { field:'malt',  rx:RX.smoke_malt, reason:'Piwo Grodziskie: tütsülenmiş malt zorunlu', bonus:15 },
  lichtenhainer:             { field:'malt',  rx:RX.smoke_malt, reason:'Lichtenhainer: tütsülenmiş malt zorunlu', bonus:15 },

  // Gose — salt + lactic. Salt markeri zorunlu.
  gose:                      { field:'katki', rx:'tuz|salt|deniz_tuzu|sea_salt', reason:'Gose: tuz zorunlu', bonus:15 },
  leipzig_gose:              { field:'katki', rx:'tuz|salt|deniz_tuzu|sea_salt', reason:'Leipzig Gose: tuz zorunlu', bonus:15 },

  // Sour fruited — meyve zorunlu
  american_fruited_sour_ale: { field:'katki', rx:RX.fruit,     reason:'Fruited Sour: meyve katkisi zorunlu', bonus:15 },

  // German Rye Ale — çavdar zorunlu
  german_rye_ale:            { field:'malt',  rx:RX.rye_malt,  reason:'German Rye Ale: çavdar maltı zorunlu', bonus:15 },

  // Breslau Schoeps tarihsel — çok dar ABV (6-7) + wheat + Broyhan mayası kullanilan profil.
  // En belirgin discriminator: historical_beer olarak etiketli olmali (manuel override icin).
  // Otomatik tespit icin: wheat yuksek ama 'tarihsel' markerı yoksa autoMatchten dus.
  // Simdilik skip — tight ABV yeterli.
};

// Aged flag gerektirenler (custom check)
const AGED_REQUIRED = [
  'wood_aged_beer',
  'specialty_wood_aged_beer',
  'wood_and_barrel_aged_beer',
  'wood_and_barrel_aged_sour_beer',
  'aged_beer',
];

let patched = 0, skipped = 0;

// 1) Marker-bazli gereksinimler
for (const [slug, req] of Object.entries(REQUIREMENTS)) {
  const def = defs[slug];
  if (!def) { console.log('YOK:',slug); skipped++; continue; }
  def.thresholds = def.thresholds || {};
  def.thresholds.markers = def.thresholds.markers || {};
  def.thresholds.markers.required_ingredient = {
    safe: {
      marker: { __regex: req.rx, flags:'i' },
      field: req.field,
      scoreBonus: req.bonus,
      label: 'Zorunlu malzeme',
    },
    exclusion: {
      markerMissing: { __regex: req.rx, flags:'i' },
      field: req.field,
      reason: req.reason,
    },
  };
  patched++;
}

// 2) Aged flag gereksinimi — customCheck=notAged
for (const slug of AGED_REQUIRED) {
  const def = defs[slug];
  if (!def) { console.log('YOK (aged):',slug); skipped++; continue; }
  def.thresholds = def.thresholds || {};
  def.thresholds.markers = def.thresholds.markers || {};
  def.thresholds.markers.required_aged = {
    exclusion: {
      customCheck: 'notAged',
      reason: (def.displayTR||slug)+': ahşap/fıçı/yaşlandırma zorunlu',
    },
  };
  patched++;
}

console.log('\n→ '+patched+' stil patch edildi,', skipped, 'atlandi');

fs.writeFileSync(file, JSON.stringify(defs, null, 2));
console.log('STYLE_DEFINITIONS.json yazildi. Boyut:', (fs.statSync(file).size/1024).toFixed(1), 'KB');
