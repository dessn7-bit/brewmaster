// V6.2 motoru HTML'e enjekte et - Faz 2 complete
const fs = require('fs');
const path = require('path');

const HTML = path.join(__dirname, 'Brewmaster_v2_79_10.html');
const V6_2_SNIPPET = fs.readFileSync(path.join(__dirname, '_inline_v6_2_snippet.html'), 'utf8');

let html = fs.readFileSync(HTML, 'utf8');

// Mevcut V5/V6 sil
html = html.replace(/<script id="bm-engine-v5">[\s\S]*?<\/script>\n?/, '');
html = html.replace(/<script id="bm-engine-v6">[\s\S]*?<\/script>\n?/, '');
html = html.replace(/<script id="bm-engine-v6-1">[\s\S]*?<\/script>\n?/, '');
html = html.replace(/<script id="bm-engine-v6-2">[\s\S]*?<\/script>\n?/, '');

// V4 kapanışından sonra V6.2 ekle
const V4_MARK = '<script id="bm-engine-v4">';
const v4Start = html.indexOf(V4_MARK);
if (v4Start < 0) throw new Error('bm-engine-v4 bulunamadi');
const v4End = html.indexOf('</script>\n', v4Start);
const insertAt = v4End + '</script>\n'.length;
html = html.slice(0, insertAt) + V6_2_SNIPPET + '\n' + html.slice(insertAt);

// V5/V6.x adapter mevcut ise sil
html = html.replace(/\n  \/\/ ══ V5 Multi-model ensemble[\s\S]*?\} catch\(e\) \{ console\.warn\('\[BM V5\] motor hatasi:', e && e\.message\); \}\n/, '\n');
html = html.replace(/\n  \/\/ ══ V6\.2 Multi-model ensemble[\s\S]*?\} catch\(e\) \{ console\.warn\('\[BM V6\.2\] motor hatasi:', e && e\.message\); \}\n/, '\n');

// V4 adapter sonrasina V6.2 adapter ekle
const V4_ADAPTER_TAIL = "} catch(e) { console.warn('[BM V4] motor hatasi:', e && e.message); }";
const v4AdapterIdx = html.indexOf(V4_ADAPTER_TAIL);
if (v4AdapterIdx < 0) throw new Error('V4 adapter tail bulunamadi');

const V6_2_ADAPTER = `
  // ══ V6.2 Multi-model ensemble (Faz 2 complete: alias norm + tier1+2 expansion) ══
  var __top3V6_2_engine = null;
  var __v6_2_meta = null;
  try {
    if (window.BM_ENGINE_V5 && window.BM_ENGINE_V5.classifyMulti && typeof __recipeV2 !== 'undefined') {
      const __v6_2Result = window.BM_ENGINE_V5.classifyMulti(__recipeV2, { k: 5, w_knn: 0.4, w_rf: 0.6, w_rule: 0.0 });
      __top3V6_2_engine = __v6_2Result.top3.map(x => ({
        slug: x.slug, score: x.score, normalized: x.confidence, displayTR: x.displayTR
      }));
      __v6_2_meta = __v6_2Result._meta;
      console.log('%c[BM V6.2] Faz 2 Complete (1071 recipes, alias+tier1+2)', 'background:#20A060;color:#fff;padding:2px 6px;');
      __top3V6_2_engine.forEach((r,i)=>console.log('    '+(i+1)+'. '+r.slug+' ('+r.displayTR+') %'+r.normalized));
      window.__lastV6_2Result = __v6_2Result;
    }
  } catch(e) { console.warn('[BM V6.2] motor hatasi:', e && e.message); }
`;

const afterV4 = v4AdapterIdx + V4_ADAPTER_TAIL.length;
html = html.slice(0, afterV4) + V6_2_ADAPTER + html.slice(afterV4);

fs.writeFileSync(HTML, html);
console.log('✓ HTML guncellendi. Yeni boyut:', fs.statSync(HTML).size, 'bytes');
