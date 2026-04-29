"""V6 engine HTML'den extract et + Node.js test wrapper yaz (V6_C2 cluster-level)."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8')

with open('Brewmaster_v2_79_10.html', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = '<script id="bm-engine-v6-final">'
start_idx = content.find(start_marker)
script_start = start_idx + len(start_marker)
end_idx = content.find('</script>', script_start)
v6_code = content[script_start:end_idx].strip()
print(f'V6 engine code: {len(v6_code):,} chars ({len(v6_code)/1024/1024:.1f} MB)', flush=True)

wrapper = '''global.window = global;
global.console = console;

''' + v6_code + '''

// === SAMPLE TESTS (cluster-level) ===
const tests = [
    {
        name: 'Witbier (Hoegaarden)',
        expected: 'belgian',  // belgian_witbier slug → belgian cluster
        features: {
            og: 1.048, fg: 1.010, abv: 4.8, ibu: 14, srm: 3,
            pct_pilsner: 50, pct_wheat: 50,
            yeast_belgian: 1, yeast_witbier: 1,
            has_coriander: 1, has_orange_peel: 1,
            late_hop_pct: 30,
        }
    },
    {
        name: 'American IPA (Sierra Nevada Pale)',
        expected: 'pale_ale',
        features: {
            og: 1.055, fg: 1.012, abv: 5.6, ibu: 38, srm: 8,
            pct_pale_ale: 90, pct_crystal: 10,
            yeast_american: 1, hop_american_c: 1,
            late_hop_pct: 50,
        }
    },
    {
        name: 'Brett Pale Ale (100% Brett)',
        expected: 'sour',
        features: {
            og: 1.050, fg: 1.005, abv: 5.9, ibu: 30, srm: 5,
            pct_pale_ale: 70, pct_wheat: 20, pct_oats: 10,
            yeast_brett: 1, has_brett: 1,
            late_hop_pct: 40,
        }
    },
    {
        name: 'Belgian Quadrupel (Westvleteren 12)',
        expected: 'belgian',
        features: {
            og: 1.096, fg: 1.018, abv: 11.0, ibu: 36, srm: 23,
            pct_pilsner: 60, pct_aromatic_abbey: 10, pct_sugar: 15, pct_crystal: 10,
            yeast_belgian: 1, yeast_abbey: 1,
            late_hop_pct: 20,
        }
    },
    {
        name: 'Dortmunder (DAB)',
        expected: 'lager',
        features: {
            og: 1.052, fg: 1.010, abv: 5.2, ibu: 25, srm: 5,
            pct_pilsner: 80, pct_munich: 15, pct_vienna: 5,
            yeast_german_lager: 1, hop_german: 1,
            late_hop_pct: 30,
        }
    },
];

console.log('\\n=== V6_C2 Sample Test (cluster-level) ===\\n');
const engine = global.window.BM_ENGINE_V6_FINAL;
console.log('Version:', engine.VERSION);
console.log('Recipes:', engine.RECS_COUNT);
console.log('Features:', engine.FEATURES_COUNT);
console.log();

const results = [];
for (const test of tests) {
    const t0 = Date.now();
    const out = engine.classifyMulti(test.features, { k: 5 });
    const elapsed = Date.now() - t0;
    const top1 = out.top1 ? out.top1.slug : null;
    const top5 = out.top5 ? out.top5.map(t => t.slug) : [];
    const match_top1 = top1 === test.expected;
    const in_top3 = (out.top3 || []).map(t => t.slug).includes(test.expected);
    const in_top5 = top5.includes(test.expected);

    console.log(`Test: ${test.name}`);
    console.log(`  Expected cluster: ${test.expected}`);
    console.log(`  Top-1: ${top1} ${match_top1 ? '✓' : '✗'}`);
    console.log(`  Top-5: ${top5.join(', ')}`);
    console.log(`  in_top3: ${in_top3}, in_top5: ${in_top5}`);
    console.log(`  Latency: ${elapsed}ms`);
    console.log();

    results.push({test: test.name, expected: test.expected, top1, top5, match_top1, in_top3, in_top5, latency_ms: elapsed});
}

const matchCount = results.filter(r => r.match_top1).length;
const top3Count = results.filter(r => r.in_top3).length;
console.log(`Top-1 hit: ${matchCount}/5  Top-3 hit: ${top3Count}/5`);
console.log('\\n=== JSON ===');
console.log(JSON.stringify(results, null, 2));
'''

with open('_v6_c2_test_wrapper.js', 'w', encoding='utf-8') as f:
    f.write(wrapper)
print(f'Wrote _v6_c2_test_wrapper.js ({os.path.getsize("_v6_c2_test_wrapper.js")/1024/1024:.1f} MB)', flush=True)
