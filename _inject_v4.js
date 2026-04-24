// V4 motoru HTML'e enjekte et (V3 sonrası, BM_ENGINE_V3'ten sonra yüklenir)
// Adapter: __top3V3 adapterin yanına V4 adapter ekle
const fs = require('fs');
const path = require('path');

const HTML = path.join(__dirname, 'Brewmaster_v2_79_10.html');
const V4_SNIPPET = fs.readFileSync(path.join(__dirname, '_inline_v4_snippet.html'), 'utf8');

let html = fs.readFileSync(HTML, 'utf8');

// 1) Mevcut V4 script'i varsa sil
html = html.replace(/<script id="bm-engine-v4">[\s\S]*?<\/script>\n?/, '');

// 2) V3 kapanisindan sonra V4 ekle
const V3_MARK = '<script id="bm-engine-v3">';
const v3Start = html.indexOf(V3_MARK);
if (v3Start < 0) throw new Error('bm-engine-v3 bulunamadi');
const v3End = html.indexOf('</script>\n', v3Start);
if (v3End < 0) throw new Error('bm-engine-v3 kapanisi bulunamadi');
const insertAt = v3End + '</script>\n'.length;
html = html.slice(0, insertAt) + V4_SNIPPET + '\n' + html.slice(insertAt);

// 3) V4 adapter ekle — V3 adapter sonrasina
const V3_ADAPTER_TAIL = "} catch(e) { console.warn('[BM V3] motor hatasi:', e && e.message); }";
const v3AdapterIdx = html.indexOf(V3_ADAPTER_TAIL);
if (v3AdapterIdx < 0) throw new Error('V3 adapter tail bulunamadi');

const V4_ADAPTER = `
  // ══ V4 Ensemble motor (KNN + rule) ══
  var __top3V4_engine = null;
  var __v4_meta = null;
  try {
    if (window.BM_ENGINE_V4 && window.BM_ENGINE_V4.classifyEnsemble && typeof __recipeV2 !== 'undefined') {
      const __v4Result = window.BM_ENGINE_V4.classifyEnsemble(__recipeV2, { alpha: 0.2, k: 5 });
      __top3V4_engine = __v4Result.top3.map(x => ({
        slug: x.slug,
        score: x.score,
        normalized: x.confidence,
        displayTR: (window.BM_ENGINE && window.BM_ENGINE.defs && window.BM_ENGINE.defs[x.slug])
          ? window.BM_ENGINE.defs[x.slug].displayTR : x.slug
      }));
      __v4_meta = __v4Result._meta;
      console.log('%c[BM V4] Ensemble (KNN+rule)', 'background:#7B4E8A;color:#fff;padding:2px 6px;');
      console.log('  alpha:', __v4_meta.alpha, 'k:', __v4_meta.k);
      console.log('  top-3:');
      __top3V4_engine.forEach((r,i)=>console.log('    '+(i+1)+'. '+r.slug+' ('+r.displayTR+') %'+r.normalized));
      window.__lastV4Result = __v4Result;
    }
  } catch(e) { console.warn('[BM V4] motor hatasi:', e && e.message); }
`;

// V4 adapter mevcut ise sil
html = html.replace(/\n  \/\/ ══ V4 Ensemble motor[\s\S]*?\} catch\(e\) \{ console\.warn\('\[BM V4\] motor hatasi:', e && e\.message\); \}\n/, '\n');

const afterV3 = v3AdapterIdx + V3_ADAPTER_TAIL.length;
html = html.slice(0, afterV3) + V4_ADAPTER + html.slice(afterV3);

fs.writeFileSync(HTML, html);
console.log('✓ HTML guncellendi. Yeni boyut: ' + fs.statSync(HTML).size + ' bytes');
