"""Adım 60a 3 itiraz sample dump — dark_lager, american_wild_ale, german_leichtbier."""
import json, sys, math, pickle
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8')


def safe_float(v):
    if v is None or v == '': return None
    try:
        x = float(v)
        if math.isnan(x): return None
        return x
    except (TypeError, ValueError):
        return None


def get_metric(r, key):
    feat = r.get('features') or {}
    raw = r.get('raw') or {}
    return safe_float(feat.get(key)) or safe_float(raw.get(key))


print('[1] Loading V19 dataset...', flush=True)
with open('working/_v19_dataset.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
recs = data['recipes']
print(f'  V19: {len(recs)} recipes', flush=True)


# Pickle'dan rmwoods yeast detail çek (american_wild_ale için)
print('[2] Loading rmwoods yeast pickle (for wild_ale yeast detail)...', flush=True)
with open('working/_rmwoods_b1_parsed.pickle', 'rb') as f:
    rm_data = pickle.load(f)
recipe_yeast = rm_data['recipe_yeast']
print(f'  recipe_yeast: {len(recipe_yeast)} recipes', flush=True)


def get_rmwoods_yeast(rid):
    if not rid.startswith('rmwoods_'):
        return None
    try:
        rec_id = int(rid.replace('rmwoods_', ''))
        yeasts = recipe_yeast.get(rec_id, [])
        out = []
        for y in yeasts:
            if isinstance(y, dict):
                parts = [str(v) for v in [y.get('lab'), y.get('product_id'), y.get('name'), y.get('type')] if v]
                out.append(' '.join(parts))
        return ' | '.join(out) if out else None
    except (ValueError, TypeError):
        return None


# ==================== 1. dark_lager (n=5) — SRM split ====================
print('\n\n=== ITIRAZ 1 — dark_lager (n=5) SRM split ===', flush=True)
dark_recs = [r for r in recs if r.get('bjcp_slug') == 'dark_lager']
# Sort by SRM
dark_sorted = sorted(dark_recs, key=lambda r: get_metric(r, 'srm') or 0)
print(f'\n  SRM artan sıralı:', flush=True)
print(f'  {"id":<35} {"src":<12} {"OG":>7} {"IBU":>5} {"SRM":>6} {"ABV":>5} {"sorte_raw":<35} {"name"}', flush=True)
for r in dark_sorted:
    rid = r.get('id', '?')
    src = r.get('source', '?')
    if src == 'rmwoods':
        sub = (r.get('raw') or {}).get('origin') or '?'
        src = f'rmwoods/{sub}'
    og = get_metric(r, 'og'); ibu = get_metric(r, 'ibu'); srm = get_metric(r, 'srm'); abv = get_metric(r, 'abv')
    sorte = (r.get('sorte_raw') or '')[:35]
    name = (r.get('name') or '')[:50]
    og_s = f'{og:.3f}' if og else '-'
    ibu_s = f'{ibu:.0f}' if ibu else '-'
    srm_s = f'{srm:.1f}' if srm else '-'
    abv_s = f'{abv:.1f}' if abv else '-'
    print(f'  {rid:<35} {src:<12} {og_s:>7} {ibu_s:>5} {srm_s:>6} {abv_s:>5} {sorte:<35} "{name}"', flush=True)


# ==================== 2. american_wild_ale (n=7) — yeast detail ====================
print('\n\n=== ITIRAZ 2 — american_wild_ale (n=7) yeast detail ===', flush=True)
wild_recs = [r for r in recs if r.get('bjcp_slug') == 'american_wild_ale']
print(f'  {"id":<45} {"src":<12} {"yeast_brett":>11} {"yeast_lacto":>11} {"yeast_pedio":>11} {"is_mixed":>9}', flush=True)
for r in wild_recs:
    rid = r.get('id', '?')
    src = r.get('source', '?')
    if src == 'rmwoods':
        sub = (r.get('raw') or {}).get('origin') or '?'
        src = f'rmwoods/{sub}'
    f = r.get('features') or {}
    name = (r.get('name') or '')[:60]
    print(f'\n  {rid:<45} {src:<12} y_brett={f.get("yeast_brett", 0)} y_lacto={f.get("yeast_lacto", 0)} y_pedio={f.get("yeast_pedio", 0)} is_mixed={f.get("is_mixed_fermentation", 0)}', flush=True)
    print(f'    name="{name}"', flush=True)
    # Try to get rmwoods yeast detail
    yeast_text = get_rmwoods_yeast(rid)
    if yeast_text:
        print(f'    yeast_detail: {yeast_text[:150]}', flush=True)
    else:
        # Non-rmwoods, try raw.yeast
        raw_yeast = (r.get('raw') or {}).get('yeast') or (r.get('raw') or {}).get('yeasts')
        if raw_yeast:
            print(f'    raw.yeast: {str(raw_yeast)[:150]}', flush=True)
        else:
            print(f'    yeast_detail: (rmwoods/non-rmwoods detail YOK, sadece feature flag\'leri)', flush=True)


# ==================== 3. german_leichtbier (n=4) — OG/IBU/SRM ====================
print('\n\n=== ITIRAZ 3 — german_leichtbier (n=4) profil ===', flush=True)
leicht_recs = [r for r in recs if r.get('bjcp_slug') == 'german_leichtbier']
print(f'  {"id":<35} {"src":<12} {"OG":>7} {"FG":>7} {"IBU":>5} {"SRM":>6} {"ABV":>5} {"sorte_raw":<35} {"name"}', flush=True)
for r in leicht_recs:
    rid = r.get('id', '?')
    src = r.get('source', '?')
    if src == 'rmwoods':
        sub = (r.get('raw') or {}).get('origin') or '?'
        src = f'rmwoods/{sub}'
    og = get_metric(r, 'og'); fg = get_metric(r, 'fg'); ibu = get_metric(r, 'ibu')
    srm = get_metric(r, 'srm'); abv = get_metric(r, 'abv')
    sorte = (r.get('sorte_raw') or '')[:35]
    name = (r.get('name') or '')[:50]
    og_s = f'{og:.4f}' if og else '-'
    fg_s = f'{fg:.4f}' if fg else '-'
    ibu_s = f'{ibu:.0f}' if ibu else '-'
    srm_s = f'{srm:.1f}' if srm else '-'
    abv_s = f'{abv:.1f}' if abv else '-'
    print(f'  {rid:<35} {src:<12} {og_s:>7} {fg_s:>7} {ibu_s:>5} {srm_s:>6} {abv_s:>5} {sorte:<35} "{name}"', flush=True)


# ==================== Helles Lager slug kontrol ====================
print('\n\n=== german_leichtbier hedef slug kontrol — Helles Lager mevcut mu? ===', flush=True)
all_slugs = set(r.get('bjcp_slug') for r in recs if r.get('bjcp_slug'))
helles_candidates = [s for s in all_slugs if 'helles' in s.lower() or 'helle' in s.lower()]
print(f'  "helles/helle" içeren slug\'lar: {helles_candidates}', flush=True)
print(f'  munich_helles count: {sum(1 for r in recs if r.get("bjcp_slug") == "munich_helles")}', flush=True)
print(f'  pale_lager count: {sum(1 for r in recs if r.get("bjcp_slug") == "pale_lager")}', flush=True)
print(f'  german_pilsener count: {sum(1 for r in recs if r.get("bjcp_slug") == "german_pilsener")}', flush=True)
