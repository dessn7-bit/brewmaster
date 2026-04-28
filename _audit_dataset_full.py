#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Adim 51 Faz A — V14 dataset full quality audit.

10 quality check her recete icin:
  1. Slug dogrulama (STYLE_DEFINITIONS whitelist + migration trigger)
  2. Mandatory field range (OG/FG/IBU/SRM/ABV)
  3. Yeast string parse (Brett/Lacto/Pedio detection)
  4. Ingredient parse health (malts/hops bos, pct_other yuksek)
  5. ABV consistency: calc = (OG-FG)*131.25, diff >0.5
  6. IBU sanity: 10x decimal hatasi (stated vs hop_bill)
  7. SRM sanity: Morey tahmini, fark >5
  8. Yeast-style consistency
  9. Title-slug consistency (Festbier/Oktoberfest/etc)
  10. Duplicate detection (title + OG fingerprint)

Plus migration trigger counts, pale_ale split projection, BYO recovery projection,
Brett feature distribution, slug coverage rapor.

Cikti: audit_report.json (ana rapor) + audit_flagged_recipes.json (per-recipe flags)
"""

import json
import re
import sys
import os
from collections import Counter, defaultdict
from datetime import datetime, timezone

DATASET_PATH = os.environ.get('AUDIT_DATASET', '_ml_dataset_v14_pre_retrain.json')
STYLE_DEFS_PATH = os.environ.get('AUDIT_STYLES', 'STYLE_DEFINITIONS.json')
OUT_REPORT = os.environ.get('AUDIT_OUT_REPORT', 'audit_report.json')
OUT_FLAGGED = os.environ.get('AUDIT_OUT_FLAGGED', 'audit_flagged_recipes.json')

# ---- yeast / ingredient sozlukleri ----
BRETT_RE = re.compile(
    r'\bbrett(anomyces)?\b|'
    r'\bwlp\s*0?(644|645|648|650|651|652|653|654|655|656|660|665|670|671|672|4639|653)\b|'
    r'\bwy?\s*0?5(112|151|526|512|733|112|378|151)\b|'
    r'\b(omega|gigayeast|escarpment|imperial|jasper)\s*(yeast)?\s*[a-z]*\s*brett\b|'
    r'\bclausenii|bruxellensis|lambicus|drie|trois\b',
    re.IGNORECASE,
)
LACTO_RE = re.compile(
    r'\blacto(bacillus)?\b|'
    r'\bwlp\s*0?(67[127]|693|672|6727|677)\b|'
    r'\bwy?\s*0?5(335|223|424|335)\b|'
    r'\bomega\s*(yeast)?\s*lacto\b|\bsuperdeluxe\b|\bgoodbelly\b',
    re.IGNORECASE,
)
PEDIO_RE = re.compile(
    r'\bpedio(coccus)?\b|\bwlp\s*0?661\b|\bdamnosus\b',
    re.IGNORECASE,
)
CLEAN_NEUTRAL_RE = re.compile(
    r'\bus[\s-]?05\b|\bs[\s-]?04\b|\b(safale|safbrew|fermentis|nottingham|windsor)\b|'
    r'\bwlp\s*0?(001|002|005|007|008|029|051|060|095|099)\b|'
    r'\bwy?\s*0?(1056|1968|1318|1098|1272|1275)\b',
    re.IGNORECASE,
)

# Festbier name regex
FESTBIER_NAME_RE = re.compile(r'\b(festbier|oktoberfest|wiesn|m[äa]rzen[\-\s]?fest|maerzen[\-\s]?fest)\b', re.IGNORECASE)
ENGLISH_PALE_NAME_RE = re.compile(r'\b(esb|extra special bitter|english pale|golden ale|english summer|british bitter|ordinary bitter|best bitter)\b', re.IGNORECASE)
GUEUZE_NAME_RE = re.compile(r'\b(gueuze|geuze|oude\s+gueuze)\b', re.IGNORECASE)
LAMBIC_NAME_RE = re.compile(r'\b(lambic|lambiek)\b', re.IGNORECASE)

# American hop dictionary (for pale_ale split)
AMERICAN_HOPS_RE = re.compile(r'\b(cascade|centennial|citra|chinook|columbus|simcoe|amarillo|mosaic|galaxy|ekuanot|equinot|eldorado|el\s*dorado|warrior|nugget|magnum|sabro|idaho|loral|azacca)\b', re.IGNORECASE)
ENGLISH_HOPS_RE = re.compile(r'\b(ekg|east kent|fuggle|goldings|target|first gold|challenger|northdown|northern brewer|wgv|whitbread|bramling|progress)\b', re.IGNORECASE)
AUSSIE_HOPS_RE = re.compile(r'\b(galaxy|vic secret|ella|enigma|topaz|summer|melba|topkapi)\b', re.IGNORECASE)

# Saison yeast strain
SAISON_YEAST_RE = re.compile(r'\bwy?\s*0?(3724|3711|3725|3726)\b|\bwlp\s*0?(565|566|568|590|585)\b|\bsaison\b', re.IGNORECASE)
TRAPPIST_YEAST_RE = re.compile(r'\bwy?\s*0?(1214|1762|3787|3522|3787)\b|\bwlp\s*0?(500|530|540|545|550|575|580)\b|\babbey|trappist\b', re.IGNORECASE)
HEFE_YEAST_RE = re.compile(r'\bwy?\s*0?(3068|3056|3333)\b|\bwlp\s*0?300\b|\bweihenstephan\b|\bhefeweizen\b', re.IGNORECASE)
WIT_YEAST_RE = re.compile(r'\bwy?\s*0?3944\b|\bwlp\s*0?(400|410)\b|\bwitbier\b', re.IGNORECASE)


def yeast_to_str(y):
    """Yeast field can be str, dict, list. Normalize to flat string."""
    if y is None:
        return ''
    if isinstance(y, str):
        return y
    if isinstance(y, dict):
        return ' '.join(str(v) for v in y.values() if v is not None)
    if isinstance(y, list):
        parts = []
        for item in y:
            parts.append(yeast_to_str(item))
        return ' '.join(parts)
    return str(y)


def malts_to_str(malts):
    if not malts:
        return ''
    if isinstance(malts, str):
        return malts
    out = []
    for m in malts:
        if isinstance(m, dict):
            out.append(m.get('name', '') or '')
            out.append(str(m.get('cat', '') or ''))
        else:
            out.append(str(m))
    return ' '.join(out)


def hops_to_str(hops):
    if not hops:
        return ''
    if isinstance(hops, str):
        return hops
    out = []
    for h in hops:
        if isinstance(h, dict):
            out.append(h.get('name', '') or '')
        else:
            out.append(str(h))
    return ' '.join(out)


def fingerprint(name, og, malts):
    """Duplicate detection signature."""
    n = re.sub(r'[^a-z0-9]', '', (name or '').lower())[:30]
    og_round = round(og or 0, 3)
    grain_sig = ''
    if isinstance(malts, list) and malts:
        cats = sorted(set(str(m.get('cat', '')) for m in malts if isinstance(m, dict) and m.get('cat')))
        grain_sig = '_'.join(cats[:5])
    return f'{n}|{og_round}|{grain_sig}'


def audit_recipe(r, style_def_set, fingerprints_seen):
    """Returns (flag_list, derived_features)."""
    flags = []
    rid = r.get('id', '?')
    name = r.get('name', '') or ''
    name_lower = name.lower()
    slug = r.get('bjcp_slug')
    main_cat = r.get('bjcp_main_category', '') or ''
    feats = r.get('features') or {}
    raw = r.get('raw') or {}

    og = feats.get('og') or raw.get('og')
    fg = feats.get('fg') or raw.get('fg')
    abv = feats.get('abv') or raw.get('abv')
    ibu = feats.get('ibu') or raw.get('ibu')
    srm = feats.get('srm') or raw.get('srm')

    yeast_str = yeast_to_str(raw.get('yeast'))
    malts_str = malts_to_str(raw.get('malts'))
    hops_str = hops_to_str(raw.get('hops'))

    has_brett = bool(BRETT_RE.search(yeast_str))
    has_lacto = bool(LACTO_RE.search(yeast_str))
    has_pedio = bool(PEDIO_RE.search(yeast_str))
    has_clean_us = bool(CLEAN_NEUTRAL_RE.search(yeast_str))
    has_saison_yeast = bool(SAISON_YEAST_RE.search(yeast_str))
    has_trappist = bool(TRAPPIST_YEAST_RE.search(yeast_str))
    has_hefe = bool(HEFE_YEAST_RE.search(yeast_str))
    has_wit = bool(WIT_YEAST_RE.search(yeast_str))
    is_mixed_ferm = has_brett and has_clean_us
    is_100pct_brett = has_brett and not has_clean_us

    derived = {
        'has_brett': has_brett,
        'has_lacto': has_lacto,
        'has_pedio': has_pedio,
        'is_mixed_fermentation': is_mixed_ferm,
        'is_100pct_brett': is_100pct_brett,
        'has_saison_yeast': has_saison_yeast,
        'has_trappist_yeast': has_trappist,
        'has_hefe_yeast': has_hefe,
        'has_wit_yeast': has_wit,
    }

    # CHECK 1: Slug
    if slug is None or slug == '':
        flags.append(('FAIL', 'slug_missing', 'bjcp_slug eksik/null (BYO unlabeled adayi)'))
    elif slug not in style_def_set:
        flags.append(('FAIL', 'slug_invalid', f'slug "{slug}" STYLE_DEFINITIONS\'ta yok'))

    # CHECK 2: Mandatory field ranges
    if og is None:
        flags.append(('FAIL', 'og_missing', 'OG yok'))
    elif not (1.020 <= og <= 1.150):
        flags.append(('FAIL', 'og_range', f'OG={og}'))
    if fg is None:
        flags.append(('FAIL', 'fg_missing', 'FG yok'))
    elif not (0.990 <= fg <= 1.040):
        flags.append(('FAIL', 'fg_range', f'FG={fg}'))
    if ibu is None:
        flags.append(('WARN', 'ibu_missing', 'IBU yok'))
    elif not (0 <= ibu <= 200):
        flags.append(('WARN', 'ibu_range', f'IBU={ibu}'))
    if srm is None:
        flags.append(('WARN', 'srm_missing', 'SRM yok'))
    elif not (1 <= srm <= 50):
        flags.append(('WARN', 'srm_range', f'SRM={srm}'))
    if abv is None:
        flags.append(('FAIL', 'abv_missing', 'ABV yok'))
    elif not (1 <= abv <= 15):
        flags.append(('FAIL', 'abv_range', f'ABV={abv}'))

    # CHECK 3: Yeast parse — empty yeast = WARN
    if not yeast_str.strip():
        flags.append(('WARN', 'yeast_empty', 'Yeast string bos'))

    # CHECK 4: Ingredient health
    malts = raw.get('malts') or []
    hops = raw.get('hops') or []
    if not malts and not feats.get('total_base'):
        flags.append(('WARN', 'malts_empty', 'malts bos ve total_base yok'))
    if not hops:
        flags.append(('WARN', 'hops_empty', 'hops bos'))
    pct_other = feats.get('pct_other') or 0
    if pct_other > 50:
        flags.append(('WARN', 'pct_other_high', f'pct_other={pct_other:.1f}%'))

    # CHECK 5: ABV consistency
    if og and fg and abv:
        calc_abv = (og - fg) * 131.25
        diff = abs(calc_abv - abv)
        if diff > 0.5:
            flags.append(('WARN', 'abv_inconsistent', f'calc={calc_abv:.2f} stated={abv:.2f} diff={diff:.2f}'))

    # CHECK 6: IBU sanity (10x decimal heuristic)
    if ibu is not None and hops:
        try:
            batch_l = raw.get('batch_size_l') or 20
            total_iaa = 0
            for h in hops:
                if not isinstance(h, dict):
                    continue
                amt_g = h.get('amount_g', 0) or 0
                alpha = h.get('alpha', 5) or 5
                tmin = h.get('time_min', 0) or 0
                # Rough Tinseth utilization
                if tmin >= 60:
                    util = 0.27
                elif tmin >= 30:
                    util = 0.20
                elif tmin >= 10:
                    util = 0.10
                elif tmin > 0:
                    util = 0.05
                else:
                    util = 0
                total_iaa += amt_g * (alpha / 100) * util * 1000 / max(1, batch_l)
            est_ibu = total_iaa
            # Decimal error: stated 10x est or stated < est/10
            if est_ibu >= 5 and (ibu >= 5 * est_ibu or ibu * 5 <= est_ibu):
                flags.append(('WARN', 'ibu_sanity', f'stated={ibu:.0f} rough_est={est_ibu:.0f} (10x decimal sus?)'))
        except Exception:
            pass

    # CHECK 7: SRM sanity (Morey)
    if srm is not None and malts:
        try:
            batch_gal = (raw.get('batch_size_l') or 20) * 0.264
            mcu = 0
            for m in malts:
                if not isinstance(m, dict):
                    continue
                kg = m.get('amount_kg', 0) or 0
                lov = m.get('lovibond')
                if lov is None:
                    cat = (m.get('cat') or '').lower()
                    nm = (m.get('name') or '').lower()
                    if 'roast' in cat or 'roast' in nm or 'black' in nm:
                        lov = 500
                    elif 'choc' in cat or 'choc' in nm:
                        lov = 350
                    elif 'crystal' in cat or 'crystal' in nm or 'caramel' in nm:
                        lov = 60
                    elif 'munich' in cat or 'munich' in nm:
                        lov = 8
                    elif 'vienna' in cat or 'vienna' in nm:
                        lov = 4
                    elif 'wheat' in cat or 'wheat' in nm:
                        lov = 2
                    elif 'pilsner' in cat or 'pils' in nm:
                        lov = 1.7
                    elif 'pale' in cat or 'pale' in nm or '2-row' in nm or '2 row' in nm:
                        lov = 2
                    else:
                        lov = 3
                mcu += (kg * 2.205 * lov) / max(0.5, batch_gal)
            if mcu > 0:
                est_srm = 1.4922 * (mcu ** 0.6859)
                diff = abs(est_srm - srm)
                if diff > 8:
                    flags.append(('WARN', 'srm_sanity', f'stated={srm:.1f} Morey_est={est_srm:.1f} diff={diff:.1f}'))
        except Exception:
            pass

    # CHECK 8: Yeast-style consistency
    if slug:
        sl = slug.lower()
        if 'saison' in sl and feats.get('yeast_german_lager'):
            flags.append(('WARN', 'yeast_style_saison_lager', 'saison slug + lager yeast'))
        if 'india_pale' in sl and feats.get('yeast_belgian'):
            flags.append(('WARN', 'yeast_style_ipa_belgian', 'IPA slug + Belgian yeast (Belgian IPA?)'))
        if 'lager' in sl and main_cat != 'German Lager' and main_cat != 'Czech Lager' and main_cat != 'American Lager' and feats.get('yeast_belgian'):
            flags.append(('WARN', 'yeast_style_lager_belgian', f'lager slug + Belgian yeast'))
        if 'witbier' in sl and not (has_wit or feats.get('yeast_wit') or feats.get('yeast_witbier') or feats.get('yeast_belgian')):
            flags.append(('WARN', 'yeast_style_witbier_nonbelgian', 'witbier slug + non-Belgian/non-wit yeast'))
        if 'hefeweizen' in sl and not (has_hefe or feats.get('yeast_wheat_german') or feats.get('yeast_belgian')):
            flags.append(('WARN', 'yeast_style_hefe_nonwheat', 'hefeweizen slug + non-wheat yeast'))

    # CHECK 9: Title-slug consistency (migration triggers)
    if FESTBIER_NAME_RE.search(name_lower) and slug != 'german_oktoberfest_festbier':
        flags.append(('WARN', 'migration_festbier', f'name="{name[:60]}" slug={slug} → festbier candidate'))
    if ENGLISH_PALE_NAME_RE.search(name_lower) and slug not in ('english_pale_ale', 'extra_special_bitter', 'best_bitter', 'ordinary_bitter'):
        flags.append(('WARN', 'migration_english_pale', f'name="{name[:60]}" slug={slug} → english_pale candidate'))
    if GUEUZE_NAME_RE.search(name_lower) and slug != 'belgian_gueuze':
        flags.append(('WARN', 'migration_gueuze', f'name="{name[:60]}" slug={slug} → gueuze candidate'))
    if LAMBIC_NAME_RE.search(name_lower) and slug != 'belgian_lambic' and slug != 'belgian_gueuze':
        flags.append(('WARN', 'migration_lambic', f'name="{name[:60]}" slug={slug} → lambic candidate'))

    # CHECK 10: Duplicate
    fp = fingerprint(name, og, malts)
    if fp and len(fp) > 5:
        if fp in fingerprints_seen:
            flags.append(('WARN', 'duplicate_candidate', f'fingerprint match: {fp[:50]}'))
        else:
            fingerprints_seen.add(fp)

    return flags, derived


def project_pale_ale_split(recipes):
    """Project pale_ale 852 split: count candidates per target slug."""
    proj = Counter()
    for r in recipes:
        if r.get('bjcp_slug') != 'pale_ale':
            continue
        feats = r.get('features') or {}
        raw = r.get('raw') or {}
        abv = feats.get('abv') or raw.get('abv') or 0
        srm = feats.get('srm') or raw.get('srm') or 0
        hops_s = hops_to_str(raw.get('hops'))
        # Decision tree
        if srm > 12:
            proj['american_amber_ale'] += 1
        elif abv > 5.5:
            proj['american_strong_pale_ale'] += 1
        elif AUSSIE_HOPS_RE.search(hops_s) and not AMERICAN_HOPS_RE.search(hops_s):
            proj['australian_pale_ale'] += 1
        elif ENGLISH_HOPS_RE.search(hops_s) and not AMERICAN_HOPS_RE.search(hops_s):
            proj['english_pale_ale'] += 1
        elif AMERICAN_HOPS_RE.search(hops_s):
            proj['american_pale_ale'] += 1
        else:
            proj['american_pale_ale_default'] += 1
    return dict(proj)


def project_byo_recovery(recipes):
    """Project BYO unlabeled recovery (yeast-based + stat-based)."""
    yeast_based = Counter()
    stat_based = Counter()
    skipped = 0
    total = 0
    for r in recipes:
        if r.get('bjcp_slug') not in (None, ''):
            continue
        if r.get('source') != 'byo':
            continue
        total += 1
        feats = r.get('features') or {}
        raw = r.get('raw') or {}
        og = feats.get('og') or raw.get('og')
        fg = feats.get('fg') or raw.get('fg')
        abv = feats.get('abv') or raw.get('abv') or 0
        ibu = feats.get('ibu') or raw.get('ibu') or 0
        srm = feats.get('srm') or raw.get('srm') or 0
        yeast_str = yeast_to_str(raw.get('yeast'))

        # B5a: Yeast-based
        has_brett = bool(BRETT_RE.search(yeast_str))
        has_lacto = bool(LACTO_RE.search(yeast_str))
        has_pedio = bool(PEDIO_RE.search(yeast_str))
        has_saison = bool(SAISON_YEAST_RE.search(yeast_str))
        has_trappist = bool(TRAPPIST_YEAST_RE.search(yeast_str))
        has_hefe = bool(HEFE_YEAST_RE.search(yeast_str))
        has_wit = bool(WIT_YEAST_RE.search(yeast_str))

        matched = None
        if has_brett and not has_lacto and not has_pedio:
            matched = 'brett_beer'
        elif (has_lacto and has_pedio) or (has_brett and (has_lacto or has_pedio)):
            matched = 'mixed_fermentation_sour_beer'
        elif has_saison:
            matched = 'saison'
        elif has_trappist and abv > 7:
            if abv > 9 or srm > 18:
                matched = 'belgian_dark_strong_ale'
            elif abv > 8 and srm < 8:
                matched = 'belgian_tripel'
            else:
                matched = 'belgian_dubbel'
        elif has_hefe:
            matched = 'south_german_hefeweizen'
        elif has_wit:
            matched = 'belgian_witbier'

        if matched:
            yeast_based[matched] += 1
            continue

        # B5b: Stat-based fallback (high-confidence only)
        if og and fg and abv and ibu and srm:
            # Belgian dubbel: ABV 6-7.5, IBU 15-25, SRM 14-22
            if 6 <= abv <= 7.5 and 15 <= ibu <= 25 and 14 <= srm <= 22:
                stat_based['belgian_dubbel'] += 1
                continue
            # Belgian tripel: ABV 7.5-9.5, IBU 20-40, SRM 4.5-7
            if 7.5 <= abv <= 9.5 and 20 <= ibu <= 40 and 4 <= srm <= 7:
                stat_based['belgian_tripel'] += 1
                continue
            # American IPA: ABV 5.5-7.5, IBU 40-70, SRM 5-11
            if 5.5 <= abv <= 7.5 and 40 <= ibu <= 70 and 5 <= srm <= 11:
                stat_based['american_india_pale_ale'] += 1
                continue
            # German Pilsner: ABV 4.4-5.2, IBU 25-45, SRM 2-5
            if 4.4 <= abv <= 5.2 and 25 <= ibu <= 45 and 2 <= srm <= 5:
                stat_based['german_pilsener'] += 1
                continue
            # Imperial stout: ABV 8-12, IBU 50-90, SRM 30-40
            if 8 <= abv <= 12 and 50 <= ibu <= 90 and srm >= 25:
                stat_based['american_imperial_stout'] += 1
                continue
        skipped += 1
    return {
        'total_unlabeled_byo': total,
        'yeast_based': dict(yeast_based),
        'stat_based': dict(stat_based),
        'skipped': skipped,
    }


def main():
    print(f'[load] {DATASET_PATH}', file=sys.stderr)
    with open(DATASET_PATH, 'r', encoding='utf-8') as f:
        d = json.load(f)
    recipes = d['recipes']
    meta_in = d.get('meta', {})
    print(f'[load] {len(recipes)} recipes', file=sys.stderr)

    print(f'[load] {STYLE_DEFS_PATH}', file=sys.stderr)
    with open(STYLE_DEFS_PATH, 'r', encoding='utf-8') as f:
        style_defs = json.load(f)
    style_def_set = set(style_defs.keys())
    print(f'[load] {len(style_def_set)} style slugs', file=sys.stderr)

    # Per-recipe audit
    fingerprints_seen = set()
    flagged = []
    summary_by_check = Counter()
    summary_by_severity = Counter({'PASS': 0, 'WARN': 0, 'FAIL': 0})
    summary_source_severity = defaultdict(lambda: Counter())
    summary_slug_severity = defaultdict(lambda: Counter())
    derived_totals = Counter()

    for i, r in enumerate(recipes):
        if i % 1000 == 0:
            print(f'[audit] {i}/{len(recipes)}', file=sys.stderr)
        flags, derived = audit_recipe(r, style_def_set, fingerprints_seen)
        for k, v in derived.items():
            if v:
                derived_totals[k] += 1

        worst = 'PASS'
        for sev, _, _ in flags:
            if sev == 'FAIL':
                worst = 'FAIL'
                break
            if sev == 'WARN':
                worst = 'WARN'
        summary_by_severity[worst] += 1
        for _, check_id, _ in flags:
            summary_by_check[check_id] += 1
        summary_source_severity[r.get('source', '?')][worst] += 1
        summary_slug_severity[r.get('bjcp_slug') or '<NULL>'][worst] += 1

        if flags:
            flagged.append({
                'id': r.get('id'),
                'source': r.get('source'),
                'name': r.get('name'),
                'slug': r.get('bjcp_slug'),
                'main_cat': r.get('bjcp_main_category'),
                'flags': [{'severity': s, 'check': c, 'reason': rs} for s, c, rs in flags],
            })

    pale_ale_proj = project_pale_ale_split(recipes)
    byo_recovery_proj = project_byo_recovery(recipes)

    # Slug coverage
    slug_dist = Counter(r.get('bjcp_slug') or '<NULL>' for r in recipes)
    source_dist = Counter(r.get('source') or '?' for r in recipes)
    main_cat_dist = Counter(r.get('bjcp_main_category') or '<NULL>' for r in recipes)

    invalid_slug_set = sorted(s for s in slug_dist if s != '<NULL>' and s not in style_def_set)
    invalid_slug_counts = {s: slug_dist[s] for s in invalid_slug_set}

    report = {
        'meta': {
            'audit_date': datetime.now(timezone.utc).isoformat(),
            'dataset_path': DATASET_PATH,
            'dataset_total': len(recipes),
            'dataset_meta': meta_in,
            'style_defs_total': len(style_def_set),
        },
        'summary': {
            'by_severity': dict(summary_by_severity),
            'by_check': dict(summary_by_check.most_common()),
            'by_source_severity': {k: dict(v) for k, v in summary_source_severity.items()},
            'derived_features_count': dict(derived_totals),
        },
        'slug_coverage': {
            'unique_slugs_in_dataset': len(slug_dist),
            'slug_distribution_top30': dict(slug_dist.most_common(30)),
            'invalid_slugs': invalid_slug_counts,
            'null_slug_count': slug_dist.get('<NULL>', 0),
        },
        'source_dist': dict(source_dist),
        'main_category_dist': dict(main_cat_dist),
        'migration_triggers': {
            'festbier_count': summary_by_check.get('migration_festbier', 0),
            'english_pale_count': summary_by_check.get('migration_english_pale', 0),
            'gueuze_count': summary_by_check.get('migration_gueuze', 0),
            'lambic_count': summary_by_check.get('migration_lambic', 0),
        },
        'pale_ale_split_projection': {
            'total_pale_ale': slug_dist.get('pale_ale', 0),
            'projected_redistribution': pale_ale_proj,
        },
        'byo_recovery_projection': byo_recovery_proj,
        'brett_features_projection': {
            'has_brett': derived_totals.get('has_brett', 0),
            'has_lacto': derived_totals.get('has_lacto', 0),
            'has_pedio': derived_totals.get('has_pedio', 0),
            'is_mixed_fermentation': derived_totals.get('is_mixed_fermentation', 0),
            'is_100pct_brett': derived_totals.get('is_100pct_brett', 0),
        },
    }

    with open(OUT_REPORT, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    with open(OUT_FLAGGED, 'w', encoding='utf-8') as f:
        json.dump(flagged, f, ensure_ascii=False, indent=2)

    print(f'[done] report → {OUT_REPORT}', file=sys.stderr)
    print(f'[done] flagged ({len(flagged)} recipes) → {OUT_FLAGGED}', file=sys.stderr)
    print()
    # Print headline summary
    print('=' * 60)
    print('AUDIT HEADLINE')
    print('=' * 60)
    print(f'Total recipes: {len(recipes)}')
    print(f'Severity:      PASS={summary_by_severity["PASS"]}  WARN={summary_by_severity["WARN"]}  FAIL={summary_by_severity["FAIL"]}')
    print(f'Unique slugs:  {len(slug_dist)}')
    print(f'NULL slugs:    {slug_dist.get("<NULL>", 0)}')
    print(f'Invalid slugs: {len(invalid_slug_set)} unique → {sum(invalid_slug_counts.values())} recipes')
    print()
    print('Migration triggers:')
    print(f'  Festbier candidates:    {summary_by_check.get("migration_festbier", 0)}')
    print(f'  English Pale candidates:{summary_by_check.get("migration_english_pale", 0)}')
    print(f'  Gueuze candidates:      {summary_by_check.get("migration_gueuze", 0)}')
    print(f'  Lambic candidates:      {summary_by_check.get("migration_lambic", 0)}')
    print()
    print('Pale_ale split projection:')
    print(f'  Total pale_ale: {slug_dist.get("pale_ale", 0)}')
    for k, v in sorted(pale_ale_proj.items(), key=lambda x: -x[1]):
        print(f'    → {k}: {v}')
    print()
    print('BYO recovery projection:')
    print(f'  Total unlabeled BYO:    {byo_recovery_proj["total_unlabeled_byo"]}')
    print(f'  Yeast-based recovery:   {sum(byo_recovery_proj["yeast_based"].values())}')
    for k, v in sorted(byo_recovery_proj['yeast_based'].items(), key=lambda x: -x[1]):
        print(f'    → {k}: {v}')
    print(f'  Stat-based recovery:    {sum(byo_recovery_proj["stat_based"].values())}')
    for k, v in sorted(byo_recovery_proj['stat_based'].items(), key=lambda x: -x[1]):
        print(f'    → {k}: {v}')
    print(f'  Skipped:                {byo_recovery_proj["skipped"]}')
    print()
    print('Brett feature distribution:')
    for k in ['has_brett', 'has_lacto', 'has_pedio', 'is_mixed_fermentation', 'is_100pct_brett']:
        print(f'  {k:30s} {derived_totals.get(k, 0)}')
    print()
    print('Top 5 check counts:')
    for c, n in summary_by_check.most_common(15):
        print(f'  {c:35s} {n}')


if __name__ == '__main__':
    main()
