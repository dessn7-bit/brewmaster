// GT patch round 6 — 195 reçete confusion analizine dayalı sistematik fix
// Top fails: IPL magnet, Festbier vs Helles, Pumpkin, Brown, Saison, Porter, Bitter, Scottish
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'STYLE_DEFINITIONS.json');
const defs = JSON.parse(fs.readFileSync(file, 'utf8'));

let changes = [];
function tighten(slug, pth, val) {
  const parts = pth.split('.'); let obj = defs[slug]?.thresholds;
  if (!obj) return;
  for (let i=0;i<parts.length-1;i++) { obj[parts[i]] = obj[parts[i]] || {}; obj = obj[parts[i]]; }
  obj[parts[parts.length-1]] = Object.assign(obj[parts[parts.length-1]] || {}, val);
  changes.push(slug + ': ' + pth);
}
function setFull(slug, pth, val) { // replace completely
  const parts = pth.split('.'); let obj = defs[slug]?.thresholds;
  if (!obj) return;
  for (let i=0;i<parts.length-1;i++) { obj[parts[i]] = obj[parts[i]] || {}; obj = obj[parts[i]]; }
  obj[parts[parts.length-1]] = val;
  changes.push(slug + ': ' + pth + ' (replaced)');
}

// ═══ IPL magnet — American India Pale Lager ale reçetelerini yakalıyor ═══
// IPL lager yeast + hoppy. Ale yeast exclusion strict tut.
{
  const t = defs.american_india_pale_lager?.thresholds;
  if (t?.yeast) {
    t.yeast.marginal = undefined;
    t.yeast.exclusion = { types:['ale','wheat','wit','belcika','saison','brett','sour','kveik'], hardZero:true, reason:'American IPL: lager yeast zorunlu' };
    changes.push('american_india_pale_lager: yeast strict lager-only');
  }
}

// ═══ Festbier vs Helles — munich signature zorunlu ═══
// Festbier'de munich >5% zorunlu (Helles = tamamen pilsner)
tighten('german_oktoberfest_festbier', 'malt._SUM_munich_required', {
  exclusion:{keysSumAbove:['munichPct','viennaPct'], threshold:-0.1, reason:''} // placeholder
});
// Actually use standard malt rule — munichPct min requirement
tighten('german_oktoberfest_festbier', 'malt.munichPct', {
  safe:{min:5, max:40, scoreBonus:25},
  marginal:{min:2, max:5, scoreBonus:8}
});
// Helles shouldn't have significant Munich
tighten('munich_helles', 'malt._SUM_no_heavy_munich', {
  exclusion:{keysSumAbove:['munichPct'], threshold:25, reason:'Helles: munich >25% Märzen/Festbier territory'}
});

// ═══ Czech Pale vs German Pils — Saaz zorunlu Czech için ═══
// Saaz marker zaten var (önceki patch). Bonus artır.
tighten('czech_pale_lager', 'markers.required_saaz', {
  safe:{marker:{__regex:'saaz|zatec|sladek',flags:'i'}, field:'hop', scoreBonus:25, label:'Saaz zorunlu'}
});
// German Pils Saaz'dan kaçmalı (çoğunlukla Hallertau/Tettnang)
tighten('german_pilsener', 'markers.hallertau_tettnang_bonus', {
  safe:{marker:{__regex:'hallertau|tettnang|spalt|perle|saphir|hersbrucker',flags:'i'}, field:'hop', scoreBonus:15, label:'German noble hop'}
});

// ═══ Pumpkin Spice vs Pumpkin Squash ═══
// pumpkin_squash = pumpkin base (katki pumpkin)
// pumpkin_spice = pumpkin + baharat (cinnamon/nutmeg/allspice)
tighten('pumpkin_spice_beer', 'markers.required_spice', {
  safe:{marker:{__regex:'cinnamon|tarcin|nutmeg|muskat|allspice|yenibahar|clove|karanfil|zencefil|ginger',flags:'i'}, field:'katki', scoreBonus:25, label:'Baharat zorunlu'},
  exclusion:{markerMissing:{__regex:'cinnamon|tarcin|nutmeg|muskat|allspice|yenibahar|clove|karanfil|zencefil|ginger',flags:'i'}, field:'katki', reason:'Pumpkin Spice: baharat zorunlu'}
});

// ═══ English Brown vs American Brown — yeast discriminator ═══
// English brown: English ale yeast (WY1098, WLP002, WLP013, WLP017 Whitbread)
// American brown: American ale yeast
// Bu yeast ID seviyesinde ayrılmalı. "English" yeast marker.
tighten('english_brown_ale', 'markers.english_yeast', {
  safe:{marker:{__regex:'wy1028|wy1098|wy1099|wy1318|wy1335|wy1768|wy1968|wlp002|wlp005|wlp013|wlp017|wlp023|nottingham|windsor|london|british|whitbread|english ale',flags:'i'}, field:'maya', scoreBonus:20, label:'English ale yeast'}
});
tighten('american_brown_ale', 'markers.american_yeast', {
  safe:{marker:{__regex:'wy1056|wy1272|wy1450|wlp001|wlp051|us.?05|safale|chico|california|american ale|flagship|house',flags:'i'}, field:'maya', scoreBonus:20, label:'American ale yeast'}
});
// Boyut SRM: US Brown biraz daha dark olma eğiliminde
tighten('american_brown_ale', 'srm.safe', {min:18, max:30, scoreBonus:15});
tighten('english_brown_ale', 'srm.safe', {min:13, max:22, scoreBonus:15});

// ═══ Saison → rye_beer: rye_beer özel cap'i iyileştir ═══
// Saison da rye kullanıyor. rye_beer'in hard req çavdar malt — ama saisonda da rye var.
// rye_beer'in ABV sınırı yok — saison ABV 6.5 rye_beer territory'de.
// Fix: rye_beer FG sınırı ekle (saison FG çok düşük 1.002-1.006, rye_beer FG 1.008+)
tighten('rye_beer', 'fg.exclusion', {max:1.004, hardZero:true, reason:'Rye Beer: FG çok düşük (Saison territory)'});
// Ayrıca rye_beer yeast exclusion: saison yeast olmamalı
tighten('rye_beer', 'markers.no_saison_yeast', {
  exclusion:{markerPresent:{__regex:'saison|dupont|farmhouse|rustic|napoleon|wlp565|wlp566|wlp568|wlp590|wy3724|b47\\b|b64\\b|b56',flags:'i'}, field:'maya', reason:'Rye Beer: saison yeast → saison olmalı'}
});

// ═══ WCI → AIPA confusion — WCI için more distinguishing ═══
// WCI: dry, high IBU, Pacific hops. AIPA: malt-forward.
// WCI'da wheat + sugar + ultra dry (FG <1.010) ayırıcı
tighten('west_coast_india_pale_ale', 'fg.safe', {min:1.006, max:1.014, scoreBonus:15});
tighten('west_coast_india_pale_ale', 'fg.exclusion2', {min:1.018, hardZero:true, reason:'WCI: FG > 1.018 AIPA/DIPA territory'});

// ═══ American Imperial vs British Imperial Stout ═══
// American: American hops (Cascade, Citra, Columbus, Simcoe, Chinook)
// British: English yeast + UK hops (Fuggles, Goldings, Target)
tighten('american_imperial_stout', 'markers.american_hop', {
  safe:{marker:{__regex:'cascade|centennial|columbus|citra|mosaic|simcoe|chinook|nugget|warrior|amarillo|galaxy|strata|nelson',flags:'i'}, field:'hop', scoreBonus:15, label:'American hop'}
});
tighten('british_imperial_stout', 'markers.english_hop', {
  safe:{marker:{__regex:'fuggles|goldings|kent|ekg|target|challenger|bramling|northdown|east kent',flags:'i'}, field:'hop', scoreBonus:15, label:'English hop'}
});

// ═══ DIPA vs American Barleywine ═══
// DIPA IBU > 75, Barleywine IBU 40-70. Recipe Fred DIPA zaten halledildi ama genel.
tighten('american_barley_wine_ale', 'ibu.exclusion2', {min:80, hardZero:true, reason:'American Barleywine: IBU > 80 DIPA territory'});
// DIPA hop markerlarını güçlendir
tighten('double_ipa', 'markers.modern_hop', {
  safe:{marker:{__regex:'citra|mosaic|galaxy|nelson|simcoe|amarillo|columbus|chinook|centennial|warrior',flags:'i'}, field:'hop', scoreBonus:20, label:'Modern American hop'}
});

// ═══ Porter group 0/5 — porter thresholds tighten ═══
// Brown Porter: SRM 20-30, IBU 25-40, ABV 4-5.4
// American Porter: SRM 22-35, IBU 25-50, ABV 4.8-6.5
// Robust Porter: SRM 22-35 (wider), IBU 25-50, ABV 4.8-6.5
tighten('brown_porter', 'srm.safe', {min:20, max:30, scoreBonus:15});
tighten('brown_porter', 'srm.exclusion2', {min:36, hardZero:true, reason:'Brown Porter: SRM > 36 Stout territory'});
tighten('american_porter', 'srm.safe', {min:22, max:35, scoreBonus:15});
tighten('american_porter', 'abv.safe', {min:4.8, max:6.5, scoreBonus:10});
tighten('american_porter', 'abv.exclusion2', {min:7.5, hardZero:true, reason:'American Porter: ABV > 7.5 Imperial territory'});
tighten('robust_porter', 'srm.safe', {min:22, max:35, scoreBonus:15});

// ═══ Stout Dry 0/4 — dry stout thresholds ═══
tighten('irish_dry_stout', 'srm.safe', {min:25, max:40, scoreBonus:15});
tighten('irish_dry_stout', 'abv.safe', {min:3.8, max:5, scoreBonus:10});
tighten('irish_dry_stout', 'abv.exclusion2', {min:6, hardZero:true, reason:'Dry Stout: ABV > 6 Export/Imperial territory'});
tighten('export_stout', 'abv.safe', {min:5.5, max:8, scoreBonus:10});

// ═══ English Bitter 0/3 — bitter profile strict ═══
// All bitter styles: English ale yeast + Fuggles/Goldings marker
['ordinary_bitter','special_bitter_or_best_bitter','extra_special_bitter','english_pale_ale'].forEach(slug => {
  tighten(slug, 'markers.english_ingredients', {
    safe:{marker:{__regex:'fuggles|goldings|kent|ekg|target|challenger|bramling|northdown|east kent|maris otter|crystal|british|english',flags:'i'}, field:'hop', scoreBonus:15, label:'English hop/malt'}
  });
});

// ═══ Scottish 0/3 — Scottish ale yeast marker ═══
['scottish_export_ale','scotch_ale_or_wee_heavy','scottish_light_ale','scottish_heavy_ale'].forEach(slug => {
  tighten(slug, 'markers.scottish_yeast', {
    safe:{marker:{__regex:'wlp028|wy1728|edinburgh|scottish|tartan|a31',flags:'i'}, field:'maya', scoreBonus:20, label:'Scottish yeast'}
  });
  tighten(slug, 'markers.british_hop', {
    safe:{marker:{__regex:'fuggles|goldings|kent|ekg|target|challenger|bramling|northdown',flags:'i'}, field:'hop', scoreBonus:10, label:'British hop'}
  });
});

// ═══ Belgian Pale 0/3 — Belgian yeast zorunlu ═══
['belgian_blonde_ale','belgian_speciale_belge','belgian_session_ale','other_belgian_ale'].forEach(slug => {
  tighten(slug, 'markers.belgian_yeast', {
    safe:{marker:{__regex:'belgian|abbey|trappist|wy3787|wy3522|wy1762|wy1214|wlp500|wlp530|wlp540|wlp550|wlp570|b45|b48|b63',flags:'i'}, field:'maya', scoreBonus:20, label:'Belgian yeast'}
  });
});

// ═══ Lager Bock 0/3 — bock ABV range ═══
tighten('german_bock', 'abv.safe', {min:6.3, max:7.2, scoreBonus:10});
tighten('german_heller_bock_maibock', 'abv.safe', {min:6.3, max:7.5, scoreBonus:10});
tighten('german_doppelbock', 'abv.safe', {min:7, max:10, scoreBonus:10});

// ═══ Irish Red 0/3 — Irish ale yeast + slight roasted ═══
tighten('irish_red_ale', 'markers.irish_yeast', {
  safe:{marker:{__regex:'wy1084|wlp004|irish ale|irish|smithwick',flags:'i'}, field:'maya', scoreBonus:20, label:'Irish ale yeast'}
});

// ═══ Flanders 0/2 — Flanders profile (Brett/Lacto signature) ═══
tighten('flanders_red_ale', 'markers.sour_blend', {
  safe:{marker:{__regex:'lacto|plantarum|brett|roeselare|wy3763|blend|mixed|sour',flags:'i'}, field:'maya', scoreBonus:25, label:'Sour blend'}
});
tighten('oud_bruin', 'markers.sour_blend', {
  safe:{marker:{__regex:'lacto|plantarum|brett|brevis|roeselare|wy3763|blend|mixed|sour|wlp5\\d\\d',flags:'i'}, field:'maya', scoreBonus:25, label:'Sour blend'}
});

// ═══ Strong Ale English 0/2 — English yeast + ABV 6+ ═══
['strong_ale','old_ale'].forEach(slug => {
  tighten(slug, 'markers.english_yeast', {
    safe:{marker:{__regex:'wy1028|wy1098|wy1318|wy1968|wlp002|wlp013|wlp017|nottingham|london|british|english',flags:'i'}, field:'maya', scoreBonus:20, label:'English yeast'}
  });
});

// ═══ Saison/Farmhouse group — saison yeast zorunlu ═══
['french_belgian_saison','specialty_saison'].forEach(slug => {
  tighten(slug, 'markers.saison_yeast', {
    safe:{marker:{__regex:'wy3724|wy3711|wy3725|wy3726|wlp565|wlp566|wlp568|wlp590|wlp670|saison|dupont|farmhouse|rustic|b47|b56|b64|belle saison|napoleon',flags:'i'}, field:'maya', scoreBonus:25, label:'Saison yeast'}
  });
});
tighten('french_bi_re_de_garde', 'markers.french_yeast', {
  safe:{marker:{__regex:'wy3711|wy3725|wy3726|wlp072|wlp011|wlp890|french|garde|belle saison|thiriez|biere de garde',flags:'i'}, field:'maya', scoreBonus:20, label:'French ale yeast'}
});

fs.writeFileSync(file, JSON.stringify(defs, null, 2));
console.log('\n✓ ' + changes.length + ' değişiklik');
