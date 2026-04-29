"""Sprint 56a Faz A1 — Etiket temizliği.

4 task (Kaan kararı):
1. golden_or_blonde_ale → blonde_ale merge (tam, alias mapping)
2. english_pale_ale temizlik: sorte_raw "Bitter" olanları special_bitter_or_best_bitter'a
3. belgian_quadrupel filter sıkılaştırma: ABV<8.5 OR OG<1.085 olanları geri gönder
4. belgian_gueuze tarama: kriek→fruit_lambic, gose pun→gose, berliner gueuze→berliner_weisse

Input: working/_v18_3_predataset_v2.json (V18.2 slug taxonomy applied)
Output: working/_v18_3_dataset.json (final V18.3, alias merge + dedupe + cleanup)
       _sprint56a_a1_cleanup_audit.json (sample dump, change counts)

KURAL 5: her task için sample 5 dump (before/after slug + reasoning).
"""
import json
import re
import sys
import time
import math
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding='utf-8')
T0 = time.time()
def t(): return f'{time.time() - T0:.1f}s'


def safe_float(v):
    if v is None or v == '':
        return None
    try:
        x = float(v)
        if math.isnan(x):
            return None
        return x
    except (TypeError, ValueError):
        return None


def get_metric(r, key):
    """OG/FG/IBU/SRM/ABV — try features first then raw."""
    feat = r.get('features') or {}
    raw = r.get('raw') or {}
    return safe_float(feat.get(key)) or safe_float(raw.get(key))


print(f'[1] Loading V18.3 pre-dataset v2... {t()}', flush=True)
with open('working/_v18_3_predataset_v2.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
recs = data['recipes']
print(f'  Loaded {len(recs)} recipes  {t()}', flush=True)


# ── TASK 1: golden_or_blonde_ale → blonde_ale merge ──
print(f'\n[2] TASK 1: golden_or_blonde_ale → blonde_ale merge... {t()}', flush=True)
task1_count = 0
task1_samples = []
for r in recs:
    if r.get('bjcp_slug') == 'golden_or_blonde_ale':
        if len(task1_samples) < 5:
            task1_samples.append({
                'id': r.get('id'), 'name': r.get('name', '')[:50],
                'before_slug': 'golden_or_blonde_ale', 'after_slug': 'blonde_ale',
                'og': get_metric(r, 'og'), 'srm': get_metric(r, 'srm'),
            })
        r['bjcp_slug'] = 'blonde_ale'
        task1_count += 1
print(f'  Migrated {task1_count} recipes  {t()}', flush=True)


# ── TASK 2: english_pale_ale → bitter (sorte_raw "Bitter") ──
print(f'\n[3] TASK 2: english_pale_ale Bitter cleanup... {t()}', flush=True)
task2_count_to_sbb = 0  # special_bitter_or_best_bitter
task2_count_to_esb = 0  # extra_special_bitter
task2_count_to_ord = 0  # ordinary_bitter
task2_kept_in_epa = 0
task2_samples = []

for r in recs:
    if r.get('bjcp_slug') != 'english_pale_ale':
        continue
    sorte = (r.get('sorte_raw') or '').lower()
    name = (r.get('name') or '').lower()
    og = get_metric(r, 'og') or 0
    ibu = get_metric(r, 'ibu') or 0

    new_slug = None
    reason = ''
    # ESB markers
    if 'esb' in sorte or 'extra special bitter' in sorte or 'extra special' in sorte:
        new_slug = 'extra_special_bitter'
        reason = 'sorte_raw=ESB'
    # Best Bitter / Special Bitter markers
    elif 'best bitter' in sorte or 'special bitter' in sorte or 'best (special)' in sorte:
        new_slug = 'special_bitter_or_best_bitter'
        reason = 'sorte_raw=BestBitter'
    # Ordinary Bitter
    elif sorte == 'bitter' and og > 0 and og < 1.040:
        new_slug = 'ordinary_bitter'
        reason = 'sorte_raw=Bitter + OG<1.040'
    # Plain "bitter" — default to ordinary if low OG, ESB if high OG, special otherwise
    elif sorte == 'bitter':
        if og >= 1.048:
            new_slug = 'extra_special_bitter'
            reason = 'sorte_raw=Bitter + OG≥1.048'
        elif og >= 1.040:
            new_slug = 'special_bitter_or_best_bitter'
            reason = 'sorte_raw=Bitter + 1.040≤OG<1.048'
        else:
            new_slug = 'ordinary_bitter'
            reason = 'sorte_raw=Bitter + OG<1.040'

    if new_slug:
        if len(task2_samples) < 10:
            task2_samples.append({
                'id': r.get('id'), 'name': r.get('name', '')[:50],
                'sorte_raw': r.get('sorte_raw', '')[:50],
                'before_slug': 'english_pale_ale', 'after_slug': new_slug,
                'og': og, 'ibu': ibu, 'reason': reason,
            })
        r['bjcp_slug'] = new_slug
        if new_slug == 'special_bitter_or_best_bitter':
            task2_count_to_sbb += 1
        elif new_slug == 'extra_special_bitter':
            task2_count_to_esb += 1
        elif new_slug == 'ordinary_bitter':
            task2_count_to_ord += 1
    else:
        task2_kept_in_epa += 1

print(f'  → special_bitter_or_best_bitter: {task2_count_to_sbb}', flush=True)
print(f'  → extra_special_bitter: {task2_count_to_esb}', flush=True)
print(f'  → ordinary_bitter: {task2_count_to_ord}', flush=True)
print(f'  Kept in english_pale_ale: {task2_kept_in_epa}  {t()}', flush=True)


# ── TASK 3: belgian_quadrupel filter sıkılaştırma ──
# Kural: ABV ≥ 8.5 AND OG ≥ 1.085 olanlar kalır
# Diğerleri:
#   - OG ≥ 1.075 AND ABV ≥ 7.0 → belgian_strong_dark_ale
#   - OG ≥ 1.075 AND ABV < 8.0 + light SRM → belgian_tripel
#   - OG < 1.075 → belgian_blonde_ale veya orig sorte_raw'a göre
print(f'\n[4] TASK 3: belgian_quadrupel filter sıkılaştırma... {t()}', flush=True)
task3_kept = 0
task3_to_bsda = 0
task3_to_tripel = 0
task3_to_dubbel = 0
task3_to_bpa = 0
task3_to_blonde = 0
task3_samples = []

for r in recs:
    if r.get('bjcp_slug') != 'belgian_quadrupel':
        continue
    og = get_metric(r, 'og') or 0
    abv = get_metric(r, 'abv') or 0
    srm = get_metric(r, 'srm') or 0
    name = (r.get('name') or '').lower()
    sorte = (r.get('sorte_raw') or '').lower()

    # Westvleteren / Rochefort / Westmalle / Chimay name = canonical Quad
    canonical_quad = any(brand in name for brand in ['westvleteren', 'rochefort 10', 'rochefort10',
        'gulden draak', 'st. bernardus 12', 'la trappe quad'])

    # Sıkı Quad kriteri: ABV ≥ 8.5 AND OG ≥ 1.085 (Kaan kararı)
    # OR canonical brand name
    if canonical_quad or (abv >= 8.5 and og >= 1.085):
        task3_kept += 1
        if len(task3_samples) < 10:
            task3_samples.append({
                'id': r.get('id'), 'name': r.get('name', '')[:50],
                'sorte_raw': r.get('sorte_raw', '')[:50],
                'before_slug': 'belgian_quadrupel', 'after_slug': 'belgian_quadrupel',
                'og': og, 'abv': abv, 'srm': srm, 'reason': 'KEPT: canonical or strict criteria',
            })
        continue

    # Yanlış sızanlar — yeniden sınıflandır
    if og >= 1.080 and abv >= 7.5 and srm >= 15:
        new_slug = 'belgian_strong_dark_ale'
        reason = 'OG≥1.080 AND ABV≥7.5 AND SRM≥15'
        task3_to_bsda += 1
    elif og >= 1.075 and srm < 10:
        new_slug = 'belgian_tripel'
        reason = 'OG≥1.075 AND SRM<10 (light color = Tripel)'
        task3_to_tripel += 1
    elif og >= 1.060 and srm >= 12:
        new_slug = 'belgian_dubbel'
        reason = 'OG≥1.060 AND SRM≥12 (medium dark = Dubbel)'
        task3_to_dubbel += 1
    elif og >= 1.060:
        new_slug = 'belgian_blonde_ale'
        reason = 'OG≥1.060 fallback (light blonde)'
        task3_to_blonde += 1
    else:
        # Çok düşük OG — Belgian Pale Ale olarak gönder
        new_slug = 'belgian_blonde_ale'
        reason = 'OG<1.060 (low)'
        task3_to_bpa += 1

    if len(task3_samples) < 10:
        task3_samples.append({
            'id': r.get('id'), 'name': r.get('name', '')[:50],
            'sorte_raw': r.get('sorte_raw', '')[:50],
            'before_slug': 'belgian_quadrupel', 'after_slug': new_slug,
            'og': og, 'abv': abv, 'srm': srm, 'reason': reason,
        })
    r['bjcp_slug'] = new_slug

print(f'  KEPT in belgian_quadrupel: {task3_kept}', flush=True)
print(f'  → belgian_strong_dark_ale: {task3_to_bsda}', flush=True)
print(f'  → belgian_tripel: {task3_to_tripel}', flush=True)
print(f'  → belgian_dubbel: {task3_to_dubbel}', flush=True)
print(f'  → belgian_blonde_ale: {task3_to_blonde + task3_to_bpa}  {t()}', flush=True)


# ── TASK 4: belgian_gueuze tam tarama ──
# Kural:
#   - "kriek"/"framboise"/"fruit lambic"/"raspberry"/"cherry" name/sorte → belgian_fruit_lambic
#   - "gose" name (her ikisi sorte_raw=gueuze AND name=gose, tipik pun) → gose
#   - "berliner" name AND sorte_raw=gueuze → berliner_weisse
#   - Sadece gerçek gueuze (Cantillon/Drie Fonteinen/Boon clones, sorte_raw="gueuze" + no fruit/gose/berliner) kalır
print(f'\n[5] TASK 4: belgian_gueuze tam tarama... {t()}', flush=True)
task4_kept = 0
task4_to_fruit = 0
task4_to_gose = 0
task4_to_berliner = 0
task4_to_lambic = 0
task4_samples = []

for r in recs:
    if r.get('bjcp_slug') != 'belgian_gueuze':
        continue
    name = (r.get('name') or '').lower()
    sorte = (r.get('sorte_raw') or '').lower()

    # Fruit lambic markers
    if any(k in name for k in ['kriek', 'framboise', 'raspberry', 'cherry', 'apricot',
                                 'peach', 'fruit lambic', 'plum', 'currant']):
        new_slug = 'belgian_fruit_lambic'
        reason = 'fruit name marker'
        task4_to_fruit += 1
    # Gose pun (very common: "there she gose", "sew it gose")
    elif 'gose' in name or 'goes' in name:
        new_slug = 'gose'
        reason = 'gose name marker (pun mistake)'
        task4_to_gose += 1
    # Berliner gueuze (mistake: berliner weisse labeled as gueuze)
    elif 'berliner' in name:
        new_slug = 'berliner_weisse'
        reason = 'berliner name marker'
        task4_to_berliner += 1
    # Plain "lambic" (not gueuze blend) → belgian_lambic
    elif sorte == 'gueuze' and 'lambic' in name and 'gueuze' not in name and 'blend' not in name:
        new_slug = 'belgian_lambic'
        reason = 'lambic (unblended) name marker'
        task4_to_lambic += 1
    else:
        # Gerçek gueuze
        task4_kept += 1
        if len(task4_samples) < 10:
            task4_samples.append({
                'id': r.get('id'), 'name': r.get('name', '')[:50],
                'sorte_raw': r.get('sorte_raw', '')[:50],
                'before_slug': 'belgian_gueuze', 'after_slug': 'belgian_gueuze',
                'reason': 'KEPT: real gueuze',
            })
        continue

    if len(task4_samples) < 20:
        task4_samples.append({
            'id': r.get('id'), 'name': r.get('name', '')[:50],
            'sorte_raw': r.get('sorte_raw', '')[:50],
            'before_slug': 'belgian_gueuze', 'after_slug': new_slug,
            'reason': reason,
        })
    r['bjcp_slug'] = new_slug

print(f'  KEPT in belgian_gueuze: {task4_kept}', flush=True)
print(f'  → belgian_fruit_lambic: {task4_to_fruit}', flush=True)
print(f'  → gose: {task4_to_gose}', flush=True)
print(f'  → berliner_weisse: {task4_to_berliner}', flush=True)
print(f'  → belgian_lambic: {task4_to_lambic}  {t()}', flush=True)


# ── Final slug distribution ──
print(f'\n[6] Final slug distribution (key slugs):', flush=True)
slug_counter = Counter(r.get('bjcp_slug') for r in recs if r.get('bjcp_slug'))
WEAK_SLUGS = [
    'belgian_ipa', 'rye_ipa', 'white_ipa', 'red_ipa',
    'gose', 'belgian_gueuze', 'belgian_quadrupel',
    'brett_beer', 'mixed_fermentation_sour_beer',
    'dunkles_bock', 'kellerbier', 'german_oktoberfest_festbier',
    'english_pale_ale', 'special_bitter_or_best_bitter', 'extra_special_bitter',
    'ordinary_bitter', 'blonde_ale', 'golden_or_blonde_ale',
    'belgian_strong_dark_ale', 'belgian_tripel', 'belgian_dubbel',
    'belgian_blonde_ale', 'belgian_fruit_lambic', 'belgian_lambic',
    'berliner_weisse', 'flanders_red_ale', 'export_stout', 'specialty_saison',
]
for s in WEAK_SLUGS:
    print(f'  {s:<40} {slug_counter.get(s, 0)}', flush=True)


# ── Save ──
print(f'\n[7] Writing _v18_3_dataset.json... {t()}', flush=True)
data['meta']['version'] = 'V18.3'
data['meta']['cleanup_applied'] = {
    'task1_golden_to_blonde': task1_count,
    'task2_epa_bitter_cleanup': task2_count_to_sbb + task2_count_to_esb + task2_count_to_ord,
    'task3_quadrupel_strict': task3_to_bsda + task3_to_tripel + task3_to_dubbel + task3_to_blonde + task3_to_bpa,
    'task4_gueuze_cleanup': task4_to_fruit + task4_to_gose + task4_to_berliner + task4_to_lambic,
}
with open('working/_v18_3_dataset.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False)
import os
sz = os.path.getsize('working/_v18_3_dataset.json') / (1024*1024)
print(f'  Saved {len(recs)} recipes, {sz:.0f} MB  {t()}', flush=True)


# ── Audit ──
audit = {
    'totals': {
        'input_recipes': len(recs),
        'task1_count': task1_count,
        'task2_to_sbb': task2_count_to_sbb,
        'task2_to_esb': task2_count_to_esb,
        'task2_to_ord': task2_count_to_ord,
        'task2_kept_epa': task2_kept_in_epa,
        'task3_kept': task3_kept,
        'task3_to_bsda': task3_to_bsda,
        'task3_to_tripel': task3_to_tripel,
        'task3_to_dubbel': task3_to_dubbel,
        'task3_to_blonde': task3_to_blonde + task3_to_bpa,
        'task4_kept': task4_kept,
        'task4_to_fruit': task4_to_fruit,
        'task4_to_gose': task4_to_gose,
        'task4_to_berliner': task4_to_berliner,
        'task4_to_lambic': task4_to_lambic,
    },
    'task1_samples': task1_samples,
    'task2_samples': task2_samples,
    'task3_samples': task3_samples,
    'task4_samples': task4_samples,
    'final_slug_counts': dict(slug_counter.most_common()),
}
with open('_sprint56a_a1_cleanup_audit.json', 'w', encoding='utf-8') as f:
    json.dump(audit, f, indent=2, ensure_ascii=False)
print(f'\n[8] Wrote _sprint56a_a1_cleanup_audit.json', flush=True)
print(f'\n[DONE] Total {t()}', flush=True)
