// Hotfix verification — eski V6 (1100 reçete slug-level) çalışıyor mu
const fs = require('fs');
const html = fs.readFileSync('Brewmaster_v2_79_10.html', 'utf8');
const start = html.indexOf('<script id="bm-engine-v6-final">') + '<script id="bm-engine-v6-final">'.length;
const end = html.indexOf('</script>', start);
const v6Code = html.substring(start, end).trim();

global.window = global;
global.console = console;
eval(v6Code);

console.log('\n=== Eski V6 (rollback) verify ===');
const engine = global.window.BM_ENGINE_V6_FINAL;
console.log('VERSION:', engine.VERSION);
console.log('RECS_COUNT:', engine.RECS_COUNT);
console.log('FEATURES_COUNT:', engine.FEATURES_COUNT);

// Sample: Witbier (slug-level beklenir)
const t0 = Date.now();
const out = engine.classifyMulti({
    og: 1.048, fg: 1.010, abv: 4.8, ibu: 14, srm: 3,
    pct_pilsner: 50, pct_wheat: 50, pct_base: 50,
    yeast_belgian: 1, yeast_witbier: 1, yeast_wit: 1,
    has_coriander: 1
}, { k: 5 });
const elapsed = Date.now() - t0;

console.log('\nWitbier sample test:');
console.log('  Top-1:', out.top1 ? out.top1.slug : null);
console.log('  Top-3:', (out.top3 || []).map(t => t.slug));
console.log('  Latency:', elapsed, 'ms');
