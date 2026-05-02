#!/usr/bin/env python3
"""Adim 18c-1c-2 ASAMA 2.7 — Bare numeric FP testi (V24).
Her numara icin: raw.yeast match vs diger alan match -> FP riski.
KOD DEGISIKLIGI YOK.
"""
import json, ijson, re, sys, os, time
from pathlib import Path
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
T0 = time.time()
def t(): return f'{time.time()-T0:.1f}s'

ROOT = Path('C:/Users/Kaan/brewmaster')
V24 = ROOT / 'working' / '_v24_aliased_dataset.json'
OUT = ROOT / 'working' / '_step18c1c2_phase27_fp_test.json'

# Test edilecek bare numeric'ler
NUMBERS = {
    'yeast_english': ['1098','1318','1968','1275'],
    'yeast_czech_lager': ['2278','2272'],
    'yeast_american_lager': ['2007'],
    'yeast_kolsch': ['2565'],
    'yeast_altbier': ['1338'],
    'yeast_cal_common': ['2112'],
    'yeast_witbier': ['3944'],
    'yeast_wheat_german': ['3068'],
    'BRETT_RE': ['5112','5151','5526','5512','5733','5378'],
    'LACTO_RE': ['5335','5223','5424'],
}
ALL_NUMBERS = set()
for v in NUMBERS.values():
    ALL_NUMBERS.update(v)
print(f'Test edilecek numara: {len(ALL_NUMBERS)}')

# Her numara için derleme
NUM_RE = {n: re.compile(rf'\b{n}\b') for n in ALL_NUMBERS}

# Her numara için sayım
yeast_match = Counter()  # raw.yeast'te match
non_yeast_match = Counter()  # diger alanlarda match
both_match = Counter()
only_non_yeast = Counter()  # sadece non-yeast — FP RISKI
total_recipes = 0

# Spot örnekler (her numara 5 only_non_yeast)
spot_only_non_yeast = defaultdict(list)
spot_yeast_only = defaultdict(list)

def serialize_non_yeast(raw):
    """raw'in yeast disindaki alanlarini birlestir."""
    parts = []
    for k, v in raw.items():
        if k in ('yeast','yeasts'): continue
        if isinstance(v, (str, int, float)):
            parts.append(str(v))
        elif isinstance(v, list):
            for item in v:
                if isinstance(item, dict):
                    for vv in item.values():
                        parts.append(str(vv))
                else:
                    parts.append(str(item))
        elif isinstance(v, dict):
            for vv in v.values():
                parts.append(str(vv))
    return ' '.join(parts).lower()

print(f'\n[{t()}] V24 stream — bare numeric FP tarama...')
with open(V24, 'rb') as f:
    for r in ijson.items(f, 'recipes.item'):
        total_recipes += 1
        if total_recipes % 50000 == 0:
            print(f'  [{t()}] scanned {total_recipes}')
        raw = r.get('raw') or {}
        y = raw.get('yeast') or raw.get('yeasts')
        ystr = (y if isinstance(y, str) else (str(y) if y else '')).lower()
        non_yeast_text = serialize_non_yeast(raw)
        # Ek alanlar (raw disinda)
        non_yeast_text += ' ' + (r.get('name') or '').lower() + ' ' + (r.get('sorte_raw') or '').lower() + ' ' + (r.get('bjcp_main_category') or '').lower()

        for num, pat in NUM_RE.items():
            in_y = bool(pat.search(ystr))
            in_n = bool(pat.search(non_yeast_text))
            if in_y: yeast_match[num] += 1
            if in_n: non_yeast_match[num] += 1
            if in_y and in_n: both_match[num] += 1
            if in_n and not in_y:
                only_non_yeast[num] += 1
                if len(spot_only_non_yeast[num]) < 5:
                    # FP örneği
                    spot_only_non_yeast[num].append({
                        'recipe_id': r.get('id'),
                        'source': r.get('source'),
                        'slug': r.get('bjcp_slug'),
                        'raw_yeast': ystr[:120],
                        'non_yeast_excerpt': re.sub(r'\s+', ' ', non_yeast_text)[:300],
                    })
            if in_y and not in_n:
                if len(spot_yeast_only[num]) < 3:
                    spot_yeast_only[num].append({
                        'recipe_id': r.get('id'),
                        'source': r.get('source'),
                        'slug': r.get('bjcp_slug'),
                        'raw_yeast': ystr[:120],
                    })

print(f'\n[{t()}] V24 tarama tamam: total={total_recipes}')

# Sonuç tablosu
print('\n' + '=' * 95)
print('A+B. Bare numeric FP testi — her numara için sayım')
print('=' * 95)
print(f"  {'feature':<22}{'numara':>8}{'yeast_match':>14}{'non_yeast':>11}{'both':>8}{'ONLY_non_y':>12}{'fp_risk':>10}")

result_table = {}
for fname, nums in NUMBERS.items():
    for n in nums:
        ym = yeast_match[n]
        nm = non_yeast_match[n]
        bm = both_match[n]
        ony = only_non_yeast[n]
        # FP risk: only_non_yeast / (yeast_match + only_non_yeast)
        denom = ym + ony
        fp_pct = (ony / denom * 100) if denom else 0
        if fp_pct > 20: risk = 'YUKSEK'
        elif fp_pct > 5: risk = 'orta'
        else: risk = 'dusuk'
        print(f"  {fname:<22}{n:>8}{ym:>14}{nm:>11}{bm:>8}{ony:>12}  {risk} ({fp_pct:.1f}%)")
        result_table[n] = {
            'feature': fname, 'yeast_match': ym, 'non_yeast_match': nm,
            'both_match': bm, 'only_non_yeast': ony, 'fp_pct': round(fp_pct, 1), 'risk': risk,
        }

# Spot örnekler — only_non_yeast (FP)
print('\n' + '=' * 95)
print('C. Spot örnekler — only_non_yeast (potansiyel FP)')
print('=' * 95)
for fname, nums in NUMBERS.items():
    for n in nums:
        if not spot_only_non_yeast[n]: continue
        print(f'\n  {n} ({fname}) — only_non_yeast {only_non_yeast[n]} reçete:')
        for ex in spot_only_non_yeast[n][:5]:
            print(f'    [{ex["source"]:<10}] {ex["slug"]:<28}')
            print(f'      raw_yeast: "{ex["raw_yeast"]}"')
            # numara non_yeast_excerpt'ta nerede geciyor — etrafindaki kelimeler
            excerpt = ex['non_yeast_excerpt']
            mat = re.search(rf'.{{0,40}}\b{n}\b.{{0,40}}', excerpt)
            if mat:
                print(f'      non_yeast match: "...{mat.group()}..."')

# Spot örnekler — yeast_only (TP)
print('\n' + '=' * 95)
print('D. Spot örnekler — yeast_only (gerçek TP)')
print('=' * 95)
for fname, nums in NUMBERS.items():
    for n in nums:
        if not spot_yeast_only[n]: continue
        print(f'\n  {n} ({fname}) — yeast_only:')
        for ex in spot_yeast_only[n][:3]:
            print(f'    [{ex["source"]:<10}] {ex["slug"]:<28} raw="{ex["raw_yeast"]}"')

# === KARAR ÖNERİSİ ===
print('\n' + '=' * 95)
print('E. KARAR ÖNERİSİ — Her numara için')
print('=' * 95)
print(f"  {'numara':>8}  {'feature':<22}{'fp_pct':>10}  {'karar_oneri':<40}")
karar = {}
for fname, nums in NUMBERS.items():
    for n in nums:
        r = result_table[n]
        if r['risk'] == 'dusuk':
            decision = 'BARE numeric ekle (FP düşük)'
        elif r['risk'] == 'orta':
            decision = 'KOMBO öneri: wyeast\\s+%s | %s\\s+(ale|lager|...)' % (n, n)
        else:
            decision = 'BARE EKLEMEZ — sadece kombo "wyeast %s" zorunlu' % n
        print(f'  {n:>8}  {fname:<22}{r["fp_pct"]:>9.1f}%  {decision}')
        karar[n] = {'fp_pct': r['fp_pct'], 'risk': r['risk'], 'decision': decision}

# Save JSON
output = {
    'meta': {'total_recipes': total_recipes, 'numbers_tested': len(ALL_NUMBERS)},
    'result_table': result_table,
    'karar_oneri': karar,
    'spot_only_non_yeast': {n: spot_only_non_yeast[n] for n in ALL_NUMBERS if spot_only_non_yeast[n]},
    'spot_yeast_only': {n: spot_yeast_only[n] for n in ALL_NUMBERS if spot_yeast_only[n]},
}
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)
print(f'\n  JSON: {OUT}')

print(f'\n[{t()}] FP TESTI TAMAM')
