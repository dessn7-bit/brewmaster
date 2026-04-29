"""Sprint 56a Faz A1.5 — Hibrit dedupe (Plan C).

Yöntem (KURAL 5: implementation kanıtı zorunlu):
1. Default name exclusion: top 30 high-freq generic title + Brewer's Friend / BYO defaults — bunlar dedupe edilmez
2. Hibrit fingerprint: (norm_title, slug, og_bucket=round(og*200)/200, srm_bucket=round(srm/3)*3)
3. Boş title hep tutulur (orig dedupe davranışı)
4. V16 öncelik korunur (V16 ↔ rmwoods cross dup'ta V16 kalır)
5. Sample 50 dropped + 50 kept dump (audit için)

Input:
- brewmaster_v16_dataset.json (9,552 recipes)
- working/_rmwoods_v15_format.json (401,991 recipes)

Output:
- working/_v18_3_predataset.json (recovery uygulanmış, etiket temizliği YOK)
- _sprint56a_a15_recovery_report.md
- _sprint56a_a15_audit_samples.json
"""
import json
import re
import sys
import time
from collections import Counter, defaultdict

sys.stdout.reconfigure(line_buffering=True)

T0 = time.time()
def t():
    return f'{time.time() - T0:.1f}s'


# ── Default name exclusion list (Bulgu 2'den) ──
DEFAULT_NAMES = {
    # Brewer's Friend default placeholders
    'awesome recipe',
    'untitled specialty beer',
    'untitled american pale ale',
    'untitled american ipa',
    'untitled american ale',
    'untitled belgian ale',
    'untitled brown ale',
    'untitled stout',
    'untitled ipa',
    'untitled wheat beer',
    'untitled lager',
    # BYO scrape parser bug
    'favorite add to favorites all grain recipe',
    'favorite add to favorites',
    'add to favorites all grain recipe',
    # Generic style names (top high-freq)
    'ipa', 'apa', 'esb', 'kolsch', 'porter', 'stout', 'saison',
    'pale ale', 'oatmeal stout', 'cream ale', 'brown ale',
    'oktoberfest', 'irish red', 'irish red ale', 'amber ale',
    'rye ipa', 'belgian ipa', 'session ipa', 'imperial stout',
    'milk stout', 'hefeweizen', 'pumpkin ale', 'citra ipa',
    'american pale ale', 'american wheat', 'american ipa',
    'black ipa', 'pale lager', 'helles', 'dunkel', 'pilsner',
    'witbier', 'tripel', 'dubbel', 'mild', 'bitter',
    'recipe', 'test', 'test recipe', 'untitled',
}


def norm_title(s):
    if not s:
        return ''
    s = re.sub(r'[^a-z0-9]+', ' ', str(s).lower()).strip()
    return re.sub(r'\s+', ' ', s)


import math


def og_bucket(og):
    """5 gravity point bucket (örn 1.040-1.045 = bucket 208)."""
    if og is None or og == 0 or og == '':
        return None
    try:
        v = float(og)
        if math.isnan(v) or v <= 0:
            return None
        return int(round(v * 200))
    except (TypeError, ValueError):
        return None


def srm_bucket(srm):
    """3 SRM point bucket (örn 6-9 SRM = bucket 2)."""
    if srm is None or srm == 0 or srm == '':
        return None
    try:
        v = float(srm)
        if math.isnan(v) or v <= 0:
            return None
        return int(round(v / 3))
    except (TypeError, ValueError):
        return None


def fingerprint(r):
    """Hibrit dedupe key: (norm_title, slug, og_bucket, srm_bucket)."""
    raw = r.get('raw') or {}
    feat = r.get('features') or {}
    nt = norm_title(r.get('name') or '')
    if not nt:
        return None  # boş title → hep tutulur
    if nt in DEFAULT_NAMES:
        return None  # default name → dedupe edilmez
    og = raw.get('og') or feat.get('og')
    srm = raw.get('srm') or feat.get('srm')
    return (nt, r.get('bjcp_slug') or '', og_bucket(og), srm_bucket(srm))


# ── Load ──
print(f'[1] Loading V16... {t()}', flush=True)
v16 = json.load(open('brewmaster_v16_dataset.json', encoding='utf-8'))
v16_recs = v16.get('recipes', v16) if isinstance(v16, dict) else v16
print(f'  V16: {len(v16_recs)} recipes  {t()}', flush=True)

print(f'[2] Loading rmwoods... {t()}', flush=True)
rm = json.load(open('working/_rmwoods_v15_format.json', encoding='utf-8'))
rm_recs = rm['recipes']
feature_list = rm['meta']['feature_list']
print(f'  rmwoods: {len(rm_recs)} recipes  {t()}', flush=True)


# ── Dedupe ──
print(f'[3] Hybrid dedup (title+slug+og_bucket+srm_bucket + default_name_exclusion)... {t()}', flush=True)
seen = set()
v18_3 = []
src_counter = Counter()
slug_counter = Counter()

# Tracking için
default_kept_v16 = 0
default_kept_rm = 0
empty_kept = 0
v16_kept = 0
v16_dup = 0
rm_kept = 0
rm_dup = 0

# Sample dump için
dropped_samples = []
default_name_kept_samples = []

# V16 first
for r in v16_recs:
    fp = fingerprint(r)
    if fp is None:
        # default name veya boş title
        v18_3.append(r)
        v16_kept += 1
        if not norm_title(r.get('name') or ''):
            empty_kept += 1
        else:
            default_kept_v16 += 1
            if len(default_name_kept_samples) < 25:
                default_name_kept_samples.append({
                    'src': 'v16',
                    'name': r.get('name', '')[:60],
                    'slug': r.get('bjcp_slug'),
                })
        src_counter[r.get('source', 'v16')] += 1
        slug_counter[r.get('bjcp_slug')] += 1
        continue
    if fp in seen:
        v16_dup += 1
        if len(dropped_samples) < 50:
            raw = r.get('raw') or {}
            dropped_samples.append({
                'src': 'v16', 'name': r.get('name', '')[:60],
                'slug': r.get('bjcp_slug'), 'fp': str(fp)[:80],
                'og': raw.get('og'), 'srm': raw.get('srm'), 'ibu': raw.get('ibu'),
            })
        continue
    seen.add(fp)
    v18_3.append(r)
    v16_kept += 1
    src_counter[r.get('source', 'v16')] += 1
    slug_counter[r.get('bjcp_slug')] += 1

print(f'  After V16: kept {v16_kept} ({default_kept_v16} default-name + {empty_kept} empty)', flush=True)

# rmwoods
for r in rm_recs:
    fp = fingerprint(r)
    if fp is None:
        v18_3.append(r)
        rm_kept += 1
        if not norm_title(r.get('name') or ''):
            empty_kept += 1
        else:
            default_kept_rm += 1
            if len(default_name_kept_samples) < 25:
                default_name_kept_samples.append({
                    'src': 'rmwoods',
                    'name': r.get('name', '')[:60],
                    'slug': r.get('bjcp_slug'),
                })
        src_counter[r.get('source', 'rmwoods')] += 1
        slug_counter[r.get('bjcp_slug')] += 1
        continue
    if fp in seen:
        rm_dup += 1
        if len(dropped_samples) < 50:
            raw = r.get('raw') or {}
            dropped_samples.append({
                'src': 'rmwoods', 'name': r.get('name', '')[:60],
                'slug': r.get('bjcp_slug'), 'fp': str(fp)[:80],
                'og': raw.get('og'), 'srm': raw.get('srm'), 'ibu': raw.get('ibu'),
            })
        continue
    seen.add(fp)
    v18_3.append(r)
    rm_kept += 1
    src_counter[r.get('source', 'rmwoods')] += 1
    slug_counter[r.get('bjcp_slug')] += 1

print(f'  After rmwoods: kept {rm_kept} ({default_kept_rm} default-name)', flush=True)
print(f'  Total V18.3 pre-dataset: {len(v18_3)} recipes  {t()}', flush=True)

# ── Recovery stats ──
total_input = len(v16_recs) + len(rm_recs)
total_dropped = total_input - len(v18_3)
old_v18_2_count = 301316
recovery = len(v18_3) - old_v18_2_count
print(f'\n[4] Recovery analysis:', flush=True)
print(f'  Total input: {total_input}', flush=True)
print(f'  V18.2 (old dedupe): 301,316', flush=True)
print(f'  V18.3 pre-dataset (Plan C): {len(v18_3)}', flush=True)
print(f'  RECOVERY: +{recovery} recipes (+{100*recovery/old_v18_2_count:.1f}%)', flush=True)
print(f'  Dropped (Plan C): {total_dropped} ({100*total_dropped/total_input:.1f}%)', flush=True)
print(f'  Empty-title kept: {empty_kept}', flush=True)
print(f'  Default-name kept (V16): {default_kept_v16}', flush=True)
print(f'  Default-name kept (rmwoods): {default_kept_rm}', flush=True)
print(f'  V16 dup: {v16_dup}, rmwoods dup: {rm_dup}', flush=True)


# ── Per-slug change ──
WEAK_SLUGS = [
    'belgian_ipa', 'rye_ipa', 'white_ipa', 'red_ipa',
    'gose', 'belgian_gueuze', 'belgian_quadrupel',
    'brett_beer', 'mixed_fermentation_sour_beer',
    'dunkles_bock', 'kellerbier', 'german_oktoberfest_festbier',
    'english_pale_ale', 'golden_or_blonde_ale',
    'juicy_or_hazy_india_pale_ale',
]
print(f'\n[5] Per-slug recovery (weak slugs):', flush=True)
for s in WEAK_SLUGS:
    print(f'  {s:<40} {slug_counter.get(s, 0)}', flush=True)

print(f'\n[6] Top 20 slug:', flush=True)
for s, c in slug_counter.most_common(20):
    print(f'  {s:<40} {c}', flush=True)


# ── Save pre-dataset ──
print(f'\n[7] Writing _v18_3_predataset.json... {t()}', flush=True)
out = {
    'recipes': v18_3,
    'meta': {
        'feature_list': feature_list,
        'count': len(v18_3),
        'sources': dict(src_counter),
        'version': 'V18.3-predataset',
        'dedupe_method': 'plan_c_hybrid',
        'dedupe_key': 'norm_title + slug + og_bucket(5pt) + srm_bucket(3pt)',
        'default_name_exclusion': True,
    },
}
with open('working/_v18_3_predataset.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False)
import os
sz = os.path.getsize('working/_v18_3_predataset.json') / (1024*1024)
print(f'  Saved {len(v18_3)} recipes, {sz:.0f} MB  {t()}', flush=True)


# ── Audit samples ──
audit = {
    'totals': {
        'input_v16': len(v16_recs),
        'input_rmwoods': len(rm_recs),
        'output_v18_3': len(v18_3),
        'recovery_vs_v18_2': recovery,
        'recovery_pct': round(100 * recovery / old_v18_2_count, 2),
        'dropped_total': total_dropped,
        'empty_title_kept': empty_kept,
        'default_kept_v16': default_kept_v16,
        'default_kept_rm': default_kept_rm,
        'v16_dup': v16_dup,
        'rm_dup': rm_dup,
    },
    'per_slug': dict(slug_counter.most_common()),
    'weak_slug_recovery': {s: slug_counter.get(s, 0) for s in WEAK_SLUGS},
    'dropped_samples_50': dropped_samples,
    'default_name_kept_samples_25': default_name_kept_samples,
}
with open('_sprint56a_a15_audit_samples.json', 'w', encoding='utf-8') as f:
    json.dump(audit, f, indent=2, ensure_ascii=False)
print(f'\n[8] Wrote _sprint56a_a15_audit_samples.json  {t()}', flush=True)
print(f'\n[DONE] Total {t()}', flush=True)
