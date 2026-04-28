#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""B-6 — Otomatik kabul + edge case extraction.

Strateji (Kaan A+ onayı):
- PASS direkt kabul
- WARN slug_alias → otomatik fix (alias → canonical)
- WARN abv_consistency / srm_range → kabul
- FAIL slug_invalid (V15 generic) → kabul
- FAIL yeast_empty → kabul
- FAIL schema_fg → FG hesapla (OG - ABV/131.25)
- FAIL schema_og → DROP

Edge case extraction (Kaan ~10 dk review):
- Multi-style etiketli (aha_all_style_ids ≥3) + picked_from=first_valid_term
- FG hesaplama mantıksız (calc <0.990 veya >1.040)
- Duplicate flag (V15 overlap)
- Alias chain ambiguous

Çıktı:
- _aha_accepted_for_merge.json — V16 dataset'e merge candidate
- _aha_b6_edge_cases.json — Kaan review listesi
- _aha_b6_dropped.json — schema_og drop log
"""
import json
import re
import os

# Inputs
PASS_PATH = 'validated__aha_recipes_v15_format.json'
WARN_PATH = 'manual_review__aha_recipes_v15_format.json'
FAIL_PATH = 'rejected__aha_recipes_v15_format.json'

print(f'[load] PASS:  {PASS_PATH}')
with open(PASS_PATH, 'r', encoding='utf-8') as f:
    pass_data = json.load(f)
pass_recs = pass_data.get('recipes', []) if isinstance(pass_data, dict) else pass_data
print(f'  {len(pass_recs)} PASS')

print(f'[load] WARN:  {WARN_PATH}')
with open(WARN_PATH, 'r', encoding='utf-8') as f:
    warn_recs = json.load(f)
print(f'  {len(warn_recs)} WARN')

print(f'[load] FAIL:  {FAIL_PATH}')
with open(FAIL_PATH, 'r', encoding='utf-8') as f:
    fail_recs = json.load(f)
print(f'  {len(fail_recs)} FAIL')

# Load V15 valid slug list (encoder, 77 slug)
with open('_v15_label_encoder_slug.json', 'r', encoding='utf-8') as f:
    le = json.load(f)
v15_slug_list = set(le['classes'])
print(f'[load] V15 encoder: {len(v15_slug_list)} slugs')

# Process
accepted = []
edge_cases = []
dropped = []
fg_calc_count = 0
alias_fix_count = 0


def has_check(flags, name):
    return any(f.get('check') == name for f in flags)


def get_check(flags, name):
    for f in flags:
        if f.get('check') == name: return f
    return None


def calc_fg(og, abv):
    """FG = OG - ABV/131.25 (rough estimate)."""
    if og is None or abv is None: return None
    return round(og - abv / 131.25, 4)


# 1. PASS — direct accept
for rec in pass_recs:
    accepted.append(rec)

# 2. WARN — auto-fix slug_alias, tolerate abv/srm
for w in warn_recs:
    rec = w['recipe']
    flags = w['flags']
    has_alias = has_check(flags, 'slug_alias')
    has_abv = has_check(flags, 'quality_abv_consistency')
    has_srm = has_check(flags, 'quality_srm_range')
    has_dup = has_check(flags, 'duplicate_candidate')
    has_yeast_warn = has_check(flags, 'yeast_empty') or has_check(flags, 'yeast_prose_leakage')
    has_ibu_warn = has_check(flags, 'quality_ibu_range') or has_check(flags, 'quality_ibu_decimal')
    has_fg_warn = has_check(flags, 'quality_fg_range')

    # Edge: duplicate (V15 overlap) → manual review
    if has_dup:
        edge_cases.append({
            'recipe_name': rec.get('name', '?'),
            'recipe_id': rec.get('id'),
            'aha_style': rec.get('sorte_raw'),
            'assigned_slug': rec.get('bjcp_slug'),
            'reason': 'duplicate_candidate (V15 fingerprint overlap)',
            'flags': [f['reason'] for f in flags],
            'code_recommendation': 'reject (V15 ZATEN VAR, dataset overlap)',
        })
        continue

    # Auto-fix slug_alias
    if has_alias:
        f_alias = get_check(flags, 'slug_alias')
        if f_alias:
            m = re.search(r'alias of "([^"]+)"', f_alias['reason'])
            if m:
                canonical = m.group(1)
                rec['bjcp_slug'] = canonical
                alias_fix_count += 1

    accepted.append(rec)

# 3. FAIL — selective accept
for f in fail_recs:
    rec = f['recipe']
    flags = f['flags']
    has_og_missing = has_check(flags, 'schema_og')
    has_fg_missing = has_check(flags, 'schema_fg')
    has_slug_invalid = has_check(flags, 'slug_invalid')
    has_yeast_empty = has_check(flags, 'yeast_empty')
    has_abv_range = has_check(flags, 'quality_abv_range')
    has_og_range = has_check(flags, 'quality_og_range')
    has_fg_range = has_check(flags, 'quality_fg_range')
    has_no_label = has_check(flags, 'schema_no_label')

    # DROP: fundamental missing
    if has_og_missing or has_no_label:
        dropped.append({
            'recipe_name': rec.get('name', '?'),
            'recipe_id': rec.get('id'),
            'reason': 'schema_og_missing' if has_og_missing else 'schema_no_label',
        })
        continue

    # FG calc if missing
    if has_fg_missing:
        og = (rec.get('features') or {}).get('og') or (rec.get('raw') or {}).get('og')
        abv = (rec.get('features') or {}).get('abv') or (rec.get('raw') or {}).get('abv')
        if og and abv:
            fg = calc_fg(og, abv)
            if fg and 0.990 <= fg <= 1.040:
                rec.setdefault('raw', {})['fg'] = fg
                rec.setdefault('features', {})['fg'] = fg
                fg_calc_count += 1
            else:
                # Calc out of range — edge case
                edge_cases.append({
                    'recipe_name': rec.get('name', '?'),
                    'recipe_id': rec.get('id'),
                    'aha_style': rec.get('sorte_raw'),
                    'assigned_slug': rec.get('bjcp_slug'),
                    'reason': f'FG calc out of range: OG={og}, ABV={abv}%, calc_FG={fg}',
                    'code_recommendation': 'reject (FG calc unrealistic)',
                })
                continue
        else:
            # OG or ABV also missing — drop
            dropped.append({
                'recipe_name': rec.get('name', '?'),
                'recipe_id': rec.get('id'),
                'reason': 'fg_missing + og_or_abv_also_missing',
            })
            continue

    # Reality range fail (OG/ABV/FG dışında) → edge case
    if has_abv_range or has_og_range or has_fg_range:
        edge_cases.append({
            'recipe_name': rec.get('name', '?'),
            'recipe_id': rec.get('id'),
            'aha_style': rec.get('sorte_raw'),
            'assigned_slug': rec.get('bjcp_slug'),
            'reason': f'numeric range violation: {[fl["reason"] for fl in flags if fl["check"].startswith("quality_")]}',
            'code_recommendation': 'review — outlier reçete (festbier specials, big stout, etc)',
        })
        continue

    # slug_invalid + yeast_empty kabul (V15 norma uygun)
    accepted.append(rec)

# Multi-style edge cases (içinden seç) — Kaan edge case onaylı
# AHA pick source 'first_valid_term' + multi-tag (≥3 ID) + saison/lambic ailesi → review
for rec in list(accepted):  # iterate copy
    pick_src = rec.get('aha_pick_source')
    style_ids = (rec.get('raw') or {}).get('aha_extra', {}).get('aha_all_style_ids') or []
    aha_style = rec.get('sorte_raw') or ''
    if pick_src == 'first_valid_term' and len(style_ids) >= 3:
        # Saison/Lambic family is sensitive
        if re.search(r'saison|lambic|gueuze|wild|brett|sour', aha_style.lower()):
            # Already corrected by recipe_style_name fix? Check by primary
            edge_cases.append({
                'recipe_name': rec.get('name', '?')[:60],
                'recipe_id': rec.get('id'),
                'aha_style': aha_style,
                'assigned_slug': rec.get('bjcp_slug'),
                'reason': f'Multi-style ({len(style_ids)} tags), pick_source=first_valid_term, sensitive family',
                'code_recommendation': f'verify slug={rec.get("bjcp_slug")} matches recipe_style_name "{aha_style}"',
            })
            # Don't remove from accepted — Kaan can override

# Save outputs
with open('_aha_accepted_for_merge.json', 'w', encoding='utf-8') as fout:
    json.dump(accepted, fout, indent=2, ensure_ascii=False)
with open('_aha_b6_edge_cases.json', 'w', encoding='utf-8') as fout:
    json.dump(edge_cases, fout, indent=2, ensure_ascii=False)
with open('_aha_b6_dropped.json', 'w', encoding='utf-8') as fout:
    json.dump(dropped, fout, indent=2, ensure_ascii=False)

# Summary
print(f'\n=== B-6 Auto-Accept Summary ===')
print(f'  PASS direct:        {len(pass_recs)}')
print(f'  WARN auto-fixed:    {len(warn_recs) - sum(1 for w in warn_recs if has_check(w["flags"], "duplicate_candidate"))}')
print(f'    alias_fix applied:  {alias_fix_count}')
print(f'  FAIL recovered:     {len(accepted) - len(pass_recs) - (len(warn_recs) - sum(1 for w in warn_recs if has_check(w["flags"], "duplicate_candidate")))}')
print(f'    fg_calc applied:    {fg_calc_count}')
print(f'  ----')
print(f'  TOTAL ACCEPTED:     {len(accepted)} → _aha_accepted_for_merge.json')
print(f'  EDGE CASES (Kaan):  {len(edge_cases)} → _aha_b6_edge_cases.json')
print(f'  DROPPED:            {len(dropped)} → _aha_b6_dropped.json')
