#!/usr/bin/env python3
"""Adim 18c-1c-5 ASAMA 1.5 — FP %77 belirsizlik debug.
KOD DEGISIKLIGI YOK. SADECE DEBUG + ONERI.
"""
import json, ijson, re, sys, os, time
from pathlib import Path
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
T0 = time.time()
def t(): return f'{time.time()-T0:.1f}s'

ROOT = Path('C:/Users/Kaan/brewmaster')
V26 = ROOT / 'working' / '_v26_aliased_dataset.json'
OUT = ROOT / 'working' / '_step18c1c5_phase15_fp_clarification.json'

# 4 YUKSEK risk brand için pattern varyantları
PATTERN_VARIANTS = {
    'american_wheat_1010': {
        'A_onerilen_kombo': r'american\s+wheat(\s+ale)?(\s+yeast)?|wyeast\s*[\#\.]?\s*0?1010\b',
        'B_bare_numeric_only': r'\b1010\b',
        'C_dar_yeast_zorunlu': r'american\s+wheat\s+(ale\s+)?yeast|wyeast\s*[\#\.]?\s*0?1010\b',
        'D_super_dar': r'american\s+wheat(\s+ale)?\s+yeast|wyeast\s*[\#\.]?\s*0?1010\b|\bwy\s*1010\b',
    },
    'bavarian_wheat_3056': {
        'A_onerilen_kombo': r'bavarian\s+wheat(\s+blend)?|wyeast\s*[\#\.]?\s*0?3056\b',
        'B_bare_numeric_only': r'\b3056\b',
        'C_dar_yeast_zorunlu': r'bavarian\s+wheat(\s+blend)?\s+(yeast|ale)|wyeast\s*[\#\.]?\s*0?3056\b',
        'D_super_dar': r'bavarian\s+wheat\s+(blend\s+)?yeast|wyeast\s*[\#\.]?\s*0?3056\b',
    },
    'schneider_weisse': {
        'A_onerilen_kombo': r'schneider\s*[-\s]?weisse|schneider.tap',
        'C_dar_yeast_zorunlu': r'schneider\s*[-\s]?weisse\s+yeast|schneider.{0,5}tap.{0,3}\d',
    },
    'bells_oberon': {
        'A_onerilen_kombo': r"bell.{0,3}s\s+oberon",
        'C_dar_yeast_zorunlu': r"bell.{0,3}s\s+oberon\s+(yeast|ale)",
    },
}

def serialize_non_yeast(raw):
    parts = []
    for k, v in raw.items():
        if k in ('yeast','yeasts'): continue
        if isinstance(v, (str, int, float)): parts.append(str(v))
        elif isinstance(v, list):
            for item in v:
                if isinstance(item, dict):
                    for vv in item.values(): parts.append(str(vv))
                else: parts.append(str(item))
        elif isinstance(v, dict):
            for vv in v.values(): parts.append(str(vv))
    return ' '.join(parts).lower()

# Compile all variants
compiled = {}
for bid, variants in PATTERN_VARIANTS.items():
    compiled[bid] = {name: re.compile(pat, re.IGNORECASE) for name, pat in variants.items()}

# V26 stream + her brand için her varyant test
print(f'[{t()}] V26 stream + 4 brand × 4 varyant FP debug...')
results = {}
for bid in PATTERN_VARIANTS:
    results[bid] = {}
    for vname in PATTERN_VARIANTS[bid]:
        results[bid][vname] = {
            'yeast_match': 0, 'non_yeast_match': 0,
            'examples_yeast': [], 'examples_non_yeast': [],
        }

total = 0
with open(V26, 'rb') as f:
    for r in ijson.items(f, 'recipes.item'):
        total += 1
        if total % 50000 == 0:
            print(f'  [{t()}] scanned {total}')
        raw = r.get('raw') or {}
        y = raw.get('yeast') or raw.get('yeasts')
        ystr = (y if isinstance(y, str) else '').lower()
        non_yeast = serialize_non_yeast(raw) + ' ' + (r.get('name') or '').lower() + ' ' + (r.get('sorte_raw') or '').lower()

        for bid in PATTERN_VARIANTS:
            for vname, comp in compiled[bid].items():
                in_y = bool(comp.search(ystr))
                in_n = bool(comp.search(non_yeast))
                if in_y:
                    results[bid][vname]['yeast_match'] += 1
                    if len(results[bid][vname]['examples_yeast']) < 3:
                        results[bid][vname]['examples_yeast'].append({
                            'recipe_id': r.get('id'),'source': r.get('source'),
                            'slug': r.get('bjcp_slug'), 'raw_yeast': ystr[:100],
                        })
                if in_n and not in_y:
                    results[bid][vname]['non_yeast_match'] += 1
                    if len(results[bid][vname]['examples_non_yeast']) < 5:
                        # Match konumu çıkar
                        mat = comp.search(non_yeast)
                        excerpt_start = max(0, mat.start() - 30)
                        excerpt_end = min(len(non_yeast), mat.end() + 30)
                        excerpt = non_yeast[excerpt_start:excerpt_end]
                        results[bid][vname]['examples_non_yeast'].append({
                            'recipe_id': r.get('id'),'source': r.get('source'),
                            'raw_yeast': ystr[:80],
                            'non_yeast_excerpt': re.sub(r'\s+', ' ', excerpt),
                            'match': mat.group(),
                        })

print(f'\n[{t()}] V26 scan tamam: total={total}')

# === Sonuç tablosu ===
print('\n' + '=' * 95)
print('A. 4 brand × varyant FP TABLOSU')
print('=' * 95)
print(f"  {'brand':<25}{'varyant':<28}{'yeast':>8}{'non_yeast':>11}{'FP %':>9}")

def fp_pct(ym, nm):
    d = ym + nm
    return round(nm / d * 100, 2) if d else 0

for bid in PATTERN_VARIANTS:
    for vname in PATTERN_VARIANTS[bid]:
        r = results[bid][vname]
        ym, nm = r['yeast_match'], r['non_yeast_match']
        fp = fp_pct(ym, nm)
        r['fp_pct'] = fp
        print(f"  {bid:<25}{vname:<28}{ym:>8}{nm:>11}{fp:>8}%")
    print()

# === FP örnekleri ===
print('=' * 95)
print('B. FP örnekleri (her brand x A_onerilen kombo, 5 örnek)')
print('=' * 95)
for bid in PATTERN_VARIANTS:
    onerilen = results[bid].get('A_onerilen_kombo')
    if not onerilen or not onerilen['examples_non_yeast']: continue
    print(f'\n  {bid} A_onerilen FP örnekleri ({onerilen["non_yeast_match"]} toplam):')
    for ex in onerilen['examples_non_yeast'][:5]:
        print(f'    [{ex["source"]:<10}] raw_yeast=\"{ex["raw_yeast"][:60]}\"')
        print(f'      non_yeast_match=\"{ex["match"]}\" excerpt=\"...{ex["non_yeast_excerpt"][:120]}...\"')

# === SAVE ===
clean_results = {}
for bid, vd in results.items():
    clean_results[bid] = {}
    for vname, vr in vd.items():
        clean_results[bid][vname] = {k: v for k, v in vr.items()}

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(clean_results, f, ensure_ascii=False, indent=2)
print(f'\n  JSON: {OUT} ({os.path.getsize(OUT)/1024:.1f} KB)')

print(f'\n[{t()}] DEBUG TAMAM')
