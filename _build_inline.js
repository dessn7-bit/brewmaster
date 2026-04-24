// Faz 2c motor entegrasyonu icin inline script uret.
// Ciktilar: _inline_snippet.html (HTML'e enjekte edilecek blok) ve _adapter_snippet.js (calc icine)
const fs = require('fs');

// 3 JSON'u minify et
const defs  = JSON.parse(fs.readFileSync(__dirname + '/STYLE_DEFINITIONS.json', 'utf8'));
const subs  = JSON.parse(fs.readFileSync(__dirname + '/SUBSTYLE_VARIANTS.json',   'utf8'));
const fams  = JSON.parse(fs.readFileSync(__dirname + '/STYLE_FAMILIES.json',      'utf8'));

const defsStr = JSON.stringify(defs);
const subsStr = JSON.stringify(subs);
const famsStr = JSON.stringify(fams);

console.log('Minified sizes:');
console.log('  STYLE_DEFINITIONS:', (defsStr.length/1024).toFixed(1), 'KB');
console.log('  SUBSTYLE_VARIANTS:', (subsStr.length/1024).toFixed(1), 'KB');
console.log('  STYLE_FAMILIES:   ', (famsStr.length/1024).toFixed(1), 'KB');
console.log('  TOPLAM:           ', ((defsStr.length+subsStr.length+famsStr.length)/1024).toFixed(1), 'KB');

// JSON'u JS template literal icinde guvenli tutmak icin kacis
// JSON.parse kullanacagiz, yani string icinde \` kacisi yeterli
const escape = (s) => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const engineCode = fs.readFileSync(__dirname + '/style_engine.js', 'utf8');

// Motor kodunu HTML icinde calisacak sekilde uyarla:
// - require('fs') ve fs.readFileSync satirlarini kaldir
// - defs, subs, FAM atamalarini yerlesik consts ile degistir
// - module.exports yerine window.*
const engineAdapted = engineCode
  .replace(/^const fs = require\(.+\);$/m, '')
  .replace(/^const defs = JSON\.parse\(fs\.readFileSync.+;$/m, 'const defs = __BM_DEFS;')
  .replace(/^const subs = JSON\.parse\(fs\.readFileSync.+;$/m, 'const subs = __BM_SUBS;')
  .replace(/^const FAM  = JSON\.parse\(fs\.readFileSync.+;$/m, 'const FAM  = __BM_FAMS;')
  .replace(/^module\.exports = .+$/m, 'window.BM_ENGINE = { styleMatchScore, findBestMatches, matchSubstyles, defs, subs };');

const inlineBlock = `<script id="bm-engine-v2c">
// ═══════════════════════════════════════════════════════════════════════════
// BREWMASTER FAZ 2c — yeni stil skorlama motoru + veri (inline)
// Uretim: node _build_inline.js
// Kullanim: window.BM_ENGINE.findBestMatches(recipe, topN)
// ═══════════════════════════════════════════════════════════════════════════
(function(){
  const __BM_DEFS = JSON.parse(\`${escape(defsStr)}\`);
  const __BM_SUBS = JSON.parse(\`${escape(subsStr)}\`);
  const __BM_FAMS = JSON.parse(\`${escape(famsStr)}\`);
${engineAdapted}
  console.log('[BM_ENGINE] yuklendi:', Object.keys(__BM_DEFS).length, 'stil,', Object.keys(__BM_FAMS.familyMap||{}).length, 'aile etiketi');
})();

// ═══════════════════════════════════════════════════════════════════════════
// FAZ 3 — Feedback Loop (Kaan stil override + log)
// localStorage anahtarı: bm_v2c_feedback
// Her kayıt: {ts, recipeSig, oldTop1, correctSlug, correctLabel, recipeName}
// ═══════════════════════════════════════════════════════════════════════════
window.bmV2cFeedback = function(slug, label, recipeSig, oldTop1, btn) {
  try {
    const log = JSON.parse(localStorage.getItem('bm_v2c_feedback')||'[]');
    const entry = { ts: Date.now(), recipeSig, oldTop1, correctSlug: slug, correctLabel: label };
    log.push(entry);
    localStorage.setItem('bm_v2c_feedback', JSON.stringify(log));
    if (btn) { btn.innerHTML = '✓'; btn.style.background = '#5A8F3E'; btn.title = 'Kaydedildi'; btn.disabled = true; }
    console.log('%c[V2c Feedback] kaydedildi:', 'background:#5A8F3E;color:#fff;padding:2px 6px', entry);
    if (typeof alertUI === 'function') alertUI({ tip:'basari', mesaj:'Düzeltme kaydedildi: ' + label });
  } catch(e) { console.warn('V2c feedback error:', e); }
};

window.bmV2cFeedbackOther = function(recipeSig, oldTop1) {
  const input = prompt('Doğru stil adı/slug? (Ör: south_german_hefeweizen, american_pale_ale)');
  if (!input) return;
  const slug = input.trim().toLowerCase().replace(/\\s+/g,'_');
  window.bmV2cFeedback(slug, input.trim(), recipeSig, oldTop1, null);
  alert('Kaydedildi: ' + input);
};

window.bmV2cShowFeedback = function() {
  try {
    const log = JSON.parse(localStorage.getItem('bm_v2c_feedback')||'[]');
    console.log('%c[V2c Feedback Log] '+log.length+' düzeltme', 'background:#C88A13;color:#fff;padding:2px 6px');
    console.table(log.map(e => ({
      tarih: new Date(e.ts).toLocaleDateString('tr-TR'),
      reçete: e.recipeSig,
      eski_öneri: e.oldTop1,
      düzeltme: e.correctLabel
    })));
    // Kopya için JSON dump
    console.log('Export JSON:', JSON.stringify(log, null, 2));
    alert(log.length + ' düzeltme var. Console\\'a yazdım.');
  } catch(e) { console.warn(e); }
};

window.bmV2cExportFeedback = function() {
  try {
    const log = localStorage.getItem('bm_v2c_feedback')||'[]';
    const blob = new Blob([log], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'bm_v2c_feedback_'+Date.now()+'.json';
    a.click();
    URL.revokeObjectURL(url);
  } catch(e) { console.warn(e); }
};
</script>`;

fs.writeFileSync(__dirname + '/_inline_snippet.html', inlineBlock);
console.log('\n→ _inline_snippet.html yazildi ('+(inlineBlock.length/1024).toFixed(1)+' KB)');

// Adapter snippet: calc() icinde, _hibritSorted'dan sonra eklenecek
const adapterSnippet = `
  // ══ FAZ 2c — Yeni motor paralel cagrisi (eski sistemin yaninda calisir) ══
  var __top3V2_engine = null;  // render template'inde kullanilacak
  try {
    if (window.BM_ENGINE && window.BM_ENGINE.findBestMatches) {
      // Reset recipe objesini yeni motor formatina donustur
      const __recipeV2 = {
        _og:_og, _fg:_fg, _ibu:_ibu, _srm:_srm, _abv:_abv, _mayaTip:_mayaTip,
        mayaId: S.mayaId||'', maya2Id: S.maya2Id||'',
        hopIds:   (S.hoplar   ||[]).map(h=>h&&h.id).filter(Boolean),
        maltIds:  (S.maltlar  ||[]).map(m=>m&&m.id).filter(Boolean),
        katkiIds: (S.katkilar ||[]).map(k=>k&&k.id).filter(Boolean),
        percents: {
          pilsnerPct:  _pctOf(/pilsner|pils|bohem|bel_pils|best_heidel|best_pale|briess_pale|chateau_pils|extra_pale|golden_promise|maris|pale_ale|synergy|thracian|viking_pale|viking_pils/i),
          wheatPct:    _pctOf(/wheat|bugday|weizen|weyermann_wheat|chateau_wheat|best_wheat/i),
          oatsWheatPct:_pctOf(/wheat|bugday|weizen|oat|yulaf/i),
          oatsPct:     _pctOf(/oat|yulaf/i),
          munichPct:   _pctOf(/munich|muenchner|munchner|weyermann_munich|best_munich/i),
          viennaPct:   _pctOf(/vienna|viyana|weyermann_vienna|best_vienna/i),
          crystalPct:  _pctOf(/crystal|caramel|cara[_-]?|kristal|caravienna|caramunich|carahell|caraamber|caraaroma/i),
          chocPct:     _pctOf(/choc|chocolate|cikolata|carafa|dehusked/i),
          roastPct:    _pctOf(/roast|kavrulmus|black|siyah|patent/i),
          cornPct:     _pctOf(/corn|misir|mais|flaked_corn/i),
          ricePct:     _pctOf(/rice|pirinc/i),
          sugarPct:    _pctOf(/sugar|seker|candi|candy|nobet|demerara|turbinado|molasses/i),
          aromaticMunichPct: _pctOf(/aromatic|melanoid/i),
          aromaticAbbeyMunichPct: _pctOf(/aromatic|abbey|special_b/i),
          baseMaltPct: _pctOf(/pilsner|pils|pale|maris|munich|vienna|best_heidel|golden|wheat/i),
        },
        lactose:   _hasKatki(/laktoz|lactose/i),
        filtered:  _hasFiltrasyon,
        aged:      (S.brewLog||[]).some(e=>e && e.tip==="aging"),
        dhPer10L:  0,
        blended:   false,
      };
      const __top3V2 = window.BM_ENGINE.findBestMatches(__recipeV2, 5);
      __top3V2_engine = __top3V2;  // UI render icin scope'a cikar
      // Eski sistem vs yeni sistem paralel log
      console.log('%c[BM V2c] Yeni motor vs Eski sistem', 'background:#0a6;color:#fff;padding:2px 6px;');
      console.log('  Eski kazanan:', stil_tah);
      console.log('  Yeni top-5  :');
      __top3V2.forEach((r,i)=>console.log('    '+(i+1)+'. '+r.slug+' ('+r.displayTR+') %'+r.normalized+' score='+r.score+(r._boosted?' [boost:'+r._boosted+']':'')));
      window.__lastV2Result = { eski: stil_tah, yeni: __top3V2, recipeObj: __recipeV2 };
    }
  } catch(e) { console.warn('[BM V2c] motor hatasi:', e && e.message); }
`;

fs.writeFileSync(__dirname + '/_adapter_snippet.js', adapterSnippet);
console.log('→ _adapter_snippet.js yazildi ('+(adapterSnippet.length/1024).toFixed(1)+' KB)');
