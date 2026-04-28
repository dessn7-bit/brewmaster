#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Brewmaster — yeni dataset validation pipeline (Adım 51 Faz F çıktısı).

Adım 52+ scope'unda yeni veri kaynaklarını (TMF, AHA, eBeer, vs.) Brewmaster ML
dataset'ine entegre etmeden önce 5-check kalite süzgecinden geçirmek için
yeniden-kullanılabilir CLI tool.

Kullanım:
    python _validate_new_dataset.py <input.json> [--reference brewmaster_v15_cleaned.json]

Çıktılar:
    validated_<basename>.json     — PASS, merge candidate
    manual_review_<basename>.json — WARN (Kaan bakacak)
    rejected_<basename>.json      — FAIL (drop, log)

5-check:
    1. Schema      — mandatory fields (name, og, fg, bjcp_slug veya rahat
                     parse edilebilir bjcp_main_category)
    2. Quality     — range (OG 1.020-1.150, FG 0.990-1.040, IBU 0-200,
                     SRM 1-50, ABV 1-15) + ABV consistency (calc-stated diff
                     <0.5) + IBU sanity (10x decimal heuristic)
    3. Slug        — taxonomy uyum (STYLE_DEFINITIONS whitelist + alias map
                     + Adım 51 migration kuralları)
    4. Duplicate   — V15 dataset karşı title + OG + grain_bill_signature
                     fingerprint
    5. Yeast       — cleanYeastString v2 + 5 Brett feature derivation

Schema beklentisi (dataset.recipes[]):
    id, source, source_id, name, bjcp_slug, bjcp_main_category, sorte_raw,
    raw {malts, hops, yeast, og, fg, abv, ibu, srm, batch_size_l},
    features {... 81 feature opsiyonel},
    in_split {train|test} (opsiyonel)
"""

import argparse
import json
import os
import re
import sys
from collections import Counter
from datetime import datetime, timezone

# ===== CHECK 5: yeast pattern dictionaries (Adım 51 cleaning'le aynı) =====
BRETT_RE = re.compile(
    r'\bbrett(anomyces)?\b|'
    r'\bwlp\s*0?(644|645|648|650|651|652|653|654|655|656|660|665|670|671|672|4639)\b|'
    r'\bwy?\s*0?5(112|151|526|512|733|378)\b|'
    r'\b(omega|gigayeast|escarpment|imperial|jasper)\s*(yeast)?\s*[a-z]*\s*brett\b|'
    r'\bclausenii|bruxellensis|lambicus|drie|trois\b',
    re.IGNORECASE,
)
LACTO_RE = re.compile(
    r'\blacto(bacillus)?\b|\bwlp\s*0?(67[127]|693|672|6727|677)\b|'
    r'\bwy?\s*0?5(335|223|424)\b|\bomega\s*(yeast)?\s*lacto\b',
    re.IGNORECASE,
)
PEDIO_RE = re.compile(r'\bpedio(coccus)?\b|\bwlp\s*0?661\b|\bdamnosus\b', re.IGNORECASE)
CLEAN_NEUTRAL_RE = re.compile(
    r'\bus[\s-]?05\b|\bs[\s-]?04\b|\b(safale|safbrew|fermentis|nottingham|windsor|bry[\s-]?97)\b|'
    r'\bwlp\s*0?(001|002|005|007|008|029|051|060|095|099)\b|'
    r'\bwy?\s*0?(1056|1968|1318|1098|1272|1275)\b',
    re.IGNORECASE,
)


def yeast_to_str(y):
    if y is None:
        return ''
    if isinstance(y, str):
        return y
    if isinstance(y, dict):
        return ' '.join(str(v) for v in y.values() if v is not None)
    if isinstance(y, list):
        return ' '.join(yeast_to_str(item) for item in y)
    return str(y)


def clean_yeast_string_v2(raw_str):
    """Yeast normalize — strain ID extract, prose cleanup, brett/lacto/pedio mention preservation."""
    if not raw_str or not raw_str.strip():
        return ''
    s = raw_str.strip()
    if len(s) > 500:
        strain_pattern = re.compile(
            r'\b(?:wlp|wy|wyeast|white\s*labs)\s*0?\d{3,4}\b|'
            r'\b(?:safale|safbrew)\s*[a-z]?-?\s*\d+\b|'
            r'\b(?:us|s|t|w)-\d{2,3}\b|'
            r'\b(?:m\d{2,3})\b',
            re.IGNORECASE,
        )
        strains = strain_pattern.findall(s)
        markers = []
        if BRETT_RE.search(s):
            markers.append('brett')
        if LACTO_RE.search(s):
            markers.append('lacto')
        if PEDIO_RE.search(s):
            markers.append('pedio')
        return (' | '.join(strains[:5]) + (' | ' + ' '.join(markers) if markers else '')).strip(' |')
    return re.sub(r'\s+', ' ', s).strip()


def derive_brett_features(yeast_str):
    has_brett = bool(BRETT_RE.search(yeast_str))
    has_lacto = bool(LACTO_RE.search(yeast_str))
    has_pedio = bool(PEDIO_RE.search(yeast_str))
    has_clean_us = bool(CLEAN_NEUTRAL_RE.search(yeast_str))
    return {
        'has_brett': 1 if has_brett else 0,
        'has_lacto': 1 if has_lacto else 0,
        'has_pedio': 1 if has_pedio else 0,
        'is_mixed_fermentation': 1 if (has_brett and has_clean_us) else 0,
        'is_100pct_brett': 1 if (has_brett and not has_clean_us) else 0,
    }


def fingerprint(name, og, malts):
    n = re.sub(r'[^a-z0-9]', '', (name or '').lower())[:30]
    og_round = round(og or 0, 3)
    grain_sig = ''
    if isinstance(malts, list) and malts:
        cats = sorted(set(str(m.get('cat', '')) for m in malts if isinstance(m, dict) and m.get('cat')))
        grain_sig = '_'.join(cats[:5])
    return f'{n}|{og_round}|{grain_sig}'


# ===== Per-recipe validation =====
def validate(r, valid_slugs, alias_map, ref_fingerprints):
    """Returns (worst_severity, [flag dicts])."""
    flags = []
    rid = r.get('id', '?')
    name = r.get('name', '') or ''
    raw = r.get('raw') or {}
    feats = r.get('features') or {}

    og = feats.get('og') or raw.get('og')
    fg = feats.get('fg') or raw.get('fg')
    abv = feats.get('abv') or raw.get('abv')
    ibu = feats.get('ibu') or raw.get('ibu')
    srm = feats.get('srm') or raw.get('srm')
    yeast_s = yeast_to_str(raw.get('yeast'))

    # CHECK 1 — schema
    if not name.strip():
        flags.append({'severity': 'FAIL', 'check': 'schema_name', 'reason': 'name eksik'})
    if og is None:
        flags.append({'severity': 'FAIL', 'check': 'schema_og', 'reason': 'OG eksik'})
    if fg is None:
        flags.append({'severity': 'FAIL', 'check': 'schema_fg', 'reason': 'FG eksik'})
    if not r.get('bjcp_slug') and not r.get('bjcp_main_category'):
        flags.append({'severity': 'FAIL', 'check': 'schema_no_label',
                      'reason': 'bjcp_slug ve bjcp_main_category ikisi de yok'})

    # CHECK 2 — quality ranges
    if og is not None and not (1.020 <= og <= 1.150):
        flags.append({'severity': 'FAIL', 'check': 'quality_og_range', 'reason': f'OG={og}'})
    if fg is not None and not (0.990 <= fg <= 1.040):
        flags.append({'severity': 'FAIL', 'check': 'quality_fg_range', 'reason': f'FG={fg}'})
    if ibu is not None and not (0 <= ibu <= 200):
        flags.append({'severity': 'WARN', 'check': 'quality_ibu_range', 'reason': f'IBU={ibu}'})
    if srm is not None and not (1 <= srm <= 50):
        flags.append({'severity': 'WARN', 'check': 'quality_srm_range', 'reason': f'SRM={srm}'})
    if abv is not None and not (1 <= abv <= 15):
        flags.append({'severity': 'FAIL', 'check': 'quality_abv_range', 'reason': f'ABV={abv}'})
    # ABV consistency
    if og is not None and fg is not None and abv is not None:
        calc_abv = (og - fg) * 131.25
        if abs(calc_abv - abv) > 0.5:
            flags.append({'severity': 'WARN', 'check': 'quality_abv_consistency',
                          'reason': f'calc={calc_abv:.2f} stated={abv:.2f}'})
    # IBU sanity (10x decimal heuristic)
    hops = raw.get('hops') or []
    if ibu is not None and hops and ibu > 200:
        flags.append({'severity': 'WARN', 'check': 'quality_ibu_decimal',
                      'reason': f'IBU={ibu} (>200, 10x decimal sus)'})

    # CHECK 3 — slug
    slug = r.get('bjcp_slug')
    if slug:
        if slug in valid_slugs:
            pass
        elif slug in alias_map:
            flags.append({'severity': 'WARN', 'check': 'slug_alias',
                          'reason': f'"{slug}" alias of "{alias_map[slug]}" — auto-migrate'})
        else:
            flags.append({'severity': 'FAIL', 'check': 'slug_invalid',
                          'reason': f'slug "{slug}" ne canonical ne alias'})

    # CHECK 4 — duplicate (against reference dataset fingerprints)
    fp = fingerprint(name, og, raw.get('malts'))
    if fp and len(fp) > 5 and ref_fingerprints is not None and fp in ref_fingerprints:
        flags.append({'severity': 'WARN', 'check': 'duplicate_candidate',
                      'reason': f'fingerprint match: {fp[:60]}'})

    # CHECK 5 — yeast standardization
    if yeast_s.strip():
        cleaned = clean_yeast_string_v2(yeast_s)
        if cleaned != yeast_s and len(yeast_s) > 500:
            flags.append({'severity': 'WARN', 'check': 'yeast_prose_leakage',
                          'reason': 'yeast string normalized (cleanYeastString v2)'})
    else:
        flags.append({'severity': 'WARN', 'check': 'yeast_empty', 'reason': 'yeast string bos'})

    # Determine worst severity
    worst = 'PASS'
    for f in flags:
        if f['severity'] == 'FAIL':
            worst = 'FAIL'
            break
        if f['severity'] == 'WARN':
            worst = 'WARN'
    return worst, flags


def enrich_recipe(r):
    """Add 5 Brett features to features dict (idempotent)."""
    raw = r.get('raw') or {}
    yeast_s = yeast_to_str(raw.get('yeast'))
    feats = r.get('features') or {}
    feats.update(derive_brett_features(yeast_s))
    # cleanYeastString v2 if needed
    if yeast_s and len(yeast_s) > 500:
        cleaned = clean_yeast_string_v2(yeast_s)
        if cleaned != yeast_s:
            raw['yeast'] = cleaned
    r['features'] = feats


def build_alias_map(style_defs):
    alias_map = {}
    for slug, info in style_defs.items():
        for a in (info.get('aliases') or []):
            # snake-case the alias for slug-style match
            sn = re.sub(r'[^a-z0-9_]+', '_', a.lower()).strip('_')
            if sn:
                alias_map[sn] = slug
    return alias_map


def main():
    ap = argparse.ArgumentParser(description='Brewmaster yeni dataset validation pipeline (Adım 51 Faz F)')
    ap.add_argument('input', help='Input JSON file (must contain "recipes" list or be a list itself)')
    ap.add_argument('--reference', default='brewmaster_v15_cleaned.json',
                    help='Reference dataset for duplicate fingerprint check')
    ap.add_argument('--styles', default='STYLE_DEFINITIONS.json',
                    help='STYLE_DEFINITIONS slug whitelist')
    ap.add_argument('--out-dir', default='.', help='Output directory')
    args = ap.parse_args()

    if not os.path.exists(args.input):
        print(f'[fail] input not found: {args.input}', file=sys.stderr)
        sys.exit(2)

    with open(args.input, 'r', encoding='utf-8') as f:
        data = json.load(f)
    if isinstance(data, dict) and 'recipes' in data:
        recipes = data['recipes']
        meta_in = data.get('meta')
    elif isinstance(data, list):
        recipes = data
        meta_in = None
    else:
        print('[fail] input must be {recipes: [...]} or [...]', file=sys.stderr)
        sys.exit(2)
    print(f'[load] {len(recipes)} input recipes', file=sys.stderr)

    with open(args.styles, 'r', encoding='utf-8') as f:
        style_defs = json.load(f)
    valid_slugs = set(style_defs.keys())
    alias_map = build_alias_map(style_defs)
    print(f'[load] {len(valid_slugs)} canonical slugs, {len(alias_map)} aliases', file=sys.stderr)

    ref_fingerprints = set()
    if os.path.exists(args.reference):
        with open(args.reference, 'r', encoding='utf-8') as f:
            ref = json.load(f)
        ref_recs = ref['recipes'] if isinstance(ref, dict) else ref
        for rr in ref_recs:
            fp = fingerprint(rr.get('name'), (rr.get('features') or {}).get('og') or (rr.get('raw') or {}).get('og'),
                             (rr.get('raw') or {}).get('malts'))
            if fp:
                ref_fingerprints.add(fp)
        print(f'[load] {len(ref_fingerprints)} reference fingerprints', file=sys.stderr)
    else:
        print(f'[warn] reference {args.reference} not found — duplicate check disabled', file=sys.stderr)

    base = os.path.splitext(os.path.basename(args.input))[0]
    out_pass = os.path.join(args.out_dir, f'validated_{base}.json')
    out_warn = os.path.join(args.out_dir, f'manual_review_{base}.json')
    out_fail = os.path.join(args.out_dir, f'rejected_{base}.json')

    pass_recs, warn_recs, fail_recs = [], [], []
    summary = Counter()
    by_check = Counter()

    for r in recipes:
        worst, flags = validate(r, valid_slugs, alias_map, ref_fingerprints)
        if worst == 'PASS':
            enrich_recipe(r)
            pass_recs.append(r)
        elif worst == 'WARN':
            enrich_recipe(r)
            warn_recs.append({'recipe': r, 'flags': flags})
        else:
            fail_recs.append({'recipe': r, 'flags': flags})
        summary[worst] += 1
        for f in flags:
            by_check[f['check']] += 1

    # Write outputs
    pass_payload = {
        'meta': {
            'source_input': args.input,
            'validation_date': datetime.now(timezone.utc).isoformat(),
            'meta_input': meta_in,
            'count': len(pass_recs),
        },
        'recipes': pass_recs,
    }
    with open(out_pass, 'w', encoding='utf-8') as f:
        json.dump(pass_payload, f, ensure_ascii=False, indent=2)
    with open(out_warn, 'w', encoding='utf-8') as f:
        json.dump(warn_recs, f, ensure_ascii=False, indent=2)
    with open(out_fail, 'w', encoding='utf-8') as f:
        json.dump(fail_recs, f, ensure_ascii=False, indent=2)

    print()
    print('=' * 60)
    print(f'VALIDATION SUMMARY  ({args.input})')
    print('=' * 60)
    print(f'Total:  {len(recipes)}')
    print(f'PASS:   {summary["PASS"]:5d}  -> {out_pass}')
    print(f'WARN:   {summary["WARN"]:5d}  -> {out_warn}')
    print(f'FAIL:   {summary["FAIL"]:5d}  -> {out_fail}')
    print()
    print('Top check counts:')
    for c, n in by_check.most_common(15):
        print(f'  {c:35s} {n}')


if __name__ == '__main__':
    main()
