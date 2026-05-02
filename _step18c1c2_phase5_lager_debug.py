#!/usr/bin/env python3
"""Adim 18c-1c-2 ASAMA 5 — Lager cluster 1180 silme adayi debug.
KOD DEGISIKLIGI YOK. SILME YOK. SADECE DEBUG.
"""
import json, pickle, re, sys, os, time
from pathlib import Path
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
T0 = time.time()
def t(): return f'{time.time()-T0:.1f}s'

ROOT = Path('C:/Users/Kaan/brewmaster')
DELETE = ROOT / 'working' / '_step18c1c2_delete_candidates.json'
YEASTMAP = ROOT / 'external' / '_rmwoods_dataset' / 'yeastmap.pickle'
OUT_AUDIT = ROOT / 'working' / '_step18c1c2_phase5_lager_silme_audit.json'
OUT_CAT = ROOT / 'working' / '_step18c1c2_phase5_lager_categorize.json'

print(f'[{t()}] Silme listesi yukleniyor...')
data = json.load(open(DELETE, 'r', encoding='utf-8'))
all_records = data['records']
print(f'  toplam: {len(all_records)}')

lager = [r for r in all_records if r['cluster'] == 'lager']
print(f'  lager cluster: {len(lager)}')

# === Source + slug dagilimi ===
print(f'\n[{t()}] Source + slug dagilimi:')
src = Counter(r['source'] for r in lager)
slug = Counter(r['slug'] for r in lager)
print(f'  Source:')
for s, n in src.most_common():
    print(f'    {s:<14} {n:>5}  ({n/len(lager)*100:.1f}%)')
print(f'  Slug:')
for s, n in slug.most_common():
    print(f'    {s:<32} {n:>5}  ({n/len(lager)*100:.1f}%)')

# === Kategorize ===
print(f'\n[{t()}] Raw.yeast kategorize:')

# Pattern detayli
DEFAULT_ONLY_RE = re.compile(r'^[-\s]*\(?\s*default[\w\s,.\-%()]*\)?\s*$', re.IGNORECASE)
SEMICOLON_RE = re.compile(r';\s*(.+)$')

categories = {
    'pure_default_only': [],          # Sadece "- - (default, ale, X%)"
    'default_plus_yeast_brand': [],   # ;sonrası gerçek yeast brand (Nottingham, WLP, vs)
    'default_plus_unknown': [],       # ;sonrası anlamsız metin
    'no_default_keyword': [],         # default kelimesi yok ama liste'de (regex hatası)
    'multiple_default_blocks': [],    # birden fazla "(default, ...)" bloğu
}

# Yeast brand markeri (gerçek yeast var mı)
YEAST_BRAND_RE = re.compile(
    r'wyeast|wlp|safale|safbrew|safeale|saflager|lalvin|fermentis|omega|imperial|mangrove|white\s*labs|danstar|lallemand|escarpment|bry[-\s]?97|nottingham|windsor|us[-\s]?0?5|s[-\s]?0?4|t-?58|cl380|brewtek|the\s*yeast\s*bay|bsi|gigayeast|east\s*coast|s[-\s]?23|s[-\s]?189|w[-\s]?34/70|kveik|brett|lacto|ale\s*yeast|lager\s*yeast|m\s*\d{2}|wb[-\s]?06|hefeweizen|saison|belgian|pilsner\s*lager|abbey|trappist|pacman|denny|chico|california',
    re.IGNORECASE)

for r in lager:
    y = (r.get('raw_yeast') or '').strip()
    ylow = y.lower()
    if not y:
        # Empty (Aşama 4 silme listesinde 0 olmalı ama yine de güvenlik)
        categories['no_default_keyword'].append(r)
        continue
    if 'default' not in ylow and 'placeholder' not in ylow:
        categories['no_default_keyword'].append(r)
        continue
    # Multiple default blokları
    default_count = ylow.count('default')
    if default_count >= 2:
        categories['multiple_default_blocks'].append(r)
        continue
    # Sade default
    if DEFAULT_ONLY_RE.match(y):
        categories['pure_default_only'].append(r)
        continue
    # Default + sonrası
    sm = SEMICOLON_RE.search(y)
    after = (sm.group(1) if sm else '').strip().lower()
    if not after:
        # Parantez sonrası boşluk veya ek karakter ama yeast yok
        categories['pure_default_only'].append(r)
    elif YEAST_BRAND_RE.search(after):
        categories['default_plus_yeast_brand'].append(r)
    else:
        categories['default_plus_unknown'].append(r)

print(f"  {'kategori':<32}{'sayi':>6}{'%':>6}")
total = sum(len(v) for v in categories.values())
for cat in ['pure_default_only', 'default_plus_yeast_brand', 'default_plus_unknown',
            'no_default_keyword', 'multiple_default_blocks']:
    n = len(categories[cat])
    pct = n/total*100 if total else 0
    print(f"  {cat:<32}{n:>6}{pct:>5.1f}%")

# Her kategori top 10 örnekleri
print(f'\n=== Kategori örnekleri (top 10/kategori) ===')
for cat in ['pure_default_only', 'default_plus_yeast_brand', 'default_plus_unknown',
            'no_default_keyword', 'multiple_default_blocks']:
    if not categories[cat]: continue
    print(f'\n  {cat} ({len(categories[cat])}):')
    seen = Counter()
    for r in categories[cat]:
        y = (r.get('raw_yeast') or '')[:120].strip().lower()
        seen[y] += 1
    for y, n in seen.most_common(10):
        print(f'    {n:>4}× {y}')

# === Yeastmap cross-check ===
print(f'\n[{t()}] yeastmap.pickle yukleniyor...')
with open(YEASTMAP, 'rb') as f: YMAP = pickle.load(f)
ymap_pairs = list(YMAP.items())
print(f'  yeastmap entry: {len(YMAP)}')

print(f'\n[{t()}] Yeastmap substring match (1180 lager silme adayi):')
ym_match_lager = []
ym_match_other = []
ym_no_match = []
for r in lager:
    y = (r.get('raw_yeast') or '').lower().strip()
    longest = None
    for kk, vv in ymap_pairs:
        klow = str(kk).lower()
        if len(klow) >= 4 and klow in y:
            if longest is None or len(klow) > len(longest[0]):
                longest = (klow, vv)
    if longest:
        cstr = str(longest[1]).lower()
        if any(t in cstr for t in ['lager','pilsen','bohemian','munich','vienna','bavarian','oktoberfest','festbier','maerzen','dortmund','bock','helles','dunkel','saflager','urquell','pilsner']):
            ym_match_lager.append((r, longest))
        else:
            ym_match_other.append((r, longest))
    else:
        ym_no_match.append(r)

print(f'  yeastmap lager canonical match : {len(ym_match_lager)}')
print(f'  yeastmap other canonical match : {len(ym_match_other)}')
print(f'  no match                       : {len(ym_no_match)}')

print(f'\n  Lager match örnekleri:')
for r, (k,v) in ym_match_lager[:5]:
    print(f'    "{(r["raw_yeast"] or "")[:80]}" -> partial="{k}" canonical="{v}"')
print(f'\n  Other match örnekleri:')
for r, (k,v) in ym_match_other[:5]:
    print(f'    "{(r["raw_yeast"] or "")[:80]}" -> partial="{k}" canonical="{v}"')

# Anomali analizi: lager cluster'da default placeholder neden yüksek
print(f'\n[{t()}] Anomali analizi: lager cluster icinde slug bazinda silme orani')
# Her slug için: silme aday sayisi / cluster total
# Cluster total: V25 cluster_total (lager) = 16778
# Slug bazinda: silme adaylari + V25'teki tüm slug reçetelerinin oranı
# (Buradan sadece silme aday tarafini gosterebilirim)
print(f'  Lager cluster total (V25): 16778')
print(f'  Lager silme adayı: {len(lager)}')
print(f'  Slug top 10 silme aday sayisi:')
for s, n in slug.most_common(10):
    print(f'    {s:<32} {n:>4} silme aday')

# === SAVE ===
out_audit = {
    'meta': {'lager_silme_aday_total': len(lager), 'cluster_total_lager_V25': 16778},
    'source_dist': dict(src),
    'slug_dist': dict(slug),
    'category_counts': {cat: len(items) for cat, items in categories.items()},
    'yeastmap_match': {
        'lager_canonical': len(ym_match_lager),
        'other_canonical': len(ym_match_other),
        'no_match': len(ym_no_match),
    },
    'records': lager,
}
with open(OUT_AUDIT, 'w', encoding='utf-8') as f:
    json.dump(out_audit, f, ensure_ascii=False, indent=2)
print(f'\n  Audit JSON: {OUT_AUDIT} ({os.path.getsize(OUT_AUDIT)/1024:.1f} KB)')

# Kategorize kayıt
out_cat = {cat: items for cat, items in categories.items()}
with open(OUT_CAT, 'w', encoding='utf-8') as f:
    json.dump(out_cat, f, ensure_ascii=False, indent=2)
print(f'  Kategorize JSON: {OUT_CAT} ({os.path.getsize(OUT_CAT)/1024:.1f} KB)')

print(f'\n[{t()}] DEBUG TAMAM')
