// V3 hiyerarsik motor inline snippet uret — HTML'e enjekte edilecek.
// Cikti: _inline_v3_snippet.html + _adapter_v3_snippet.js
const fs = require('fs');

const HIER = JSON.parse(fs.readFileSync(__dirname + '/hierarchy_map.json', 'utf8'));
const hierStr = JSON.stringify(HIER);

const engineV2Code = fs.readFileSync(__dirname + '/style_engine_v2.js', 'utf8');

// fs/require/module kaldir; HIER inline; defs/subs global window.BM_ENGINE'den
const escape = (s) => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const engineAdapted = engineV2Code
  .replace(/^const fs = require\(.+\);$/m, '')
  .replace(/^const path = require\(.+\);$/m, '')
  .replace(/^const defs = JSON\.parse\(fs\.readFileSync.+;$/m, 'const defs = window.BM_ENGINE && window.BM_ENGINE.defs;')
  .replace(/^const HIER = JSON\.parse\(fs\.readFileSync.+;$/m, 'const HIER = __BM_HIER;')
  .replace(/^const \{ styleMatchScore \} = require\(.+\);$/m, 'const { styleMatchScore } = window.BM_ENGINE;')
  // module.exports bloğunu komple sil (nested { } olduğundan açık-kapalı match gerek)
  .replace(/if \(typeof module !== 'undefined' && module\.exports\) \{[\s\S]*?^\}/m, '')
  // CLI test blogunu cikar
  .replace(/if \(require\.main === module\) \{[\s\S]*$/m, '');

const inlineBlock = `<script id="bm-engine-v3">
// ═══════════════════════════════════════════════════════════════════════════
// BREWMASTER V3 — Hiyerarşik stil motoru + hierarchy_map (inline)
// Uretim: node _build_inline_v3.js
// Kullanim: window.BM_ENGINE_V3.classifyHierarchical(recipe)
// ═══════════════════════════════════════════════════════════════════════════
(function(){
  const __BM_HIER = JSON.parse(\`${escape(hierStr)}\`);
${engineAdapted}
  window.BM_ENGINE_V3 = {
    classifyHierarchical, classifyFermType, classifyFamily,
    scoreWithinFamily, scoreFamily, FAMILY_SIGNATURES, HIER
  };
  console.log('[BM_ENGINE_V3] yuklendi:', Object.keys(__BM_HIER.styles||{}).length, 'stil,',
              Object.keys(__BM_HIER.ferm_types||{}).length, 'ferm_type');
})();
</script>`;

fs.writeFileSync(__dirname + '/_inline_v3_snippet.html', inlineBlock);
console.log('→ _inline_v3_snippet.html yazildi ('+(inlineBlock.length/1024).toFixed(1)+' KB)');

// Adapter snippet: __top3V2'nin yanina V3 cagrisi
const adapterV3 = `
  // ══ FAZ 4 — V3 Hiyerarşik motor paralel cagrisi ══
  var __top3V3_engine = null;
  var __v3_classification = null;
  try {
    if (window.BM_ENGINE_V3 && window.BM_ENGINE_V3.classifyHierarchical && typeof __recipeV2 !== 'undefined') {
      const __v3Result = window.BM_ENGINE_V3.classifyHierarchical(__recipeV2, { topN: 3 });
      __top3V3_engine = __v3Result.top3;
      __v3_classification = __v3Result;
      console.log('%c[BM V3] Hiyerarşik motor', 'background:#5A8F3E;color:#fff;padding:2px 6px;');
      console.log('  Seviye 1 (ferm_type):', __v3Result.ferm_type, '[' + (__v3Result.levels['1']?.reason||'') + ']');
      console.log('  Seviye 2 (family):   ', __v3Result.family, '[score=' + (__v3Result.levels['2']?.chosen_score||0) + ']');
      console.log('  Seviye 3 (top-3):');
      (__v3Result.top3||[]).forEach((r,i)=>console.log('    '+(i+1)+'. '+r.slug+' ('+r.displayTR+') %'+r.normalized));
      window.__lastV3Result = __v3Result;
    }
  } catch(e) { console.warn('[BM V3] motor hatasi:', e && e.message); }
`;

fs.writeFileSync(__dirname + '/_adapter_v3_snippet.js', adapterV3);
console.log('→ _adapter_v3_snippet.js yazildi ('+(adapterV3.length/1024).toFixed(1)+' KB)');
