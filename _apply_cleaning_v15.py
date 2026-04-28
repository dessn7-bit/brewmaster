#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Adim 51 Faz B — V14 dataset -> V15 cleaning pipeline.

B1. Slug taxonomy migration (zero-risk alias + Festbier 68 + English Pale + Gueuze + Amber + Lambic)
B2. Pale_ale 852 split (American/Strong/Amber/English/Australian)
B3. Yeast normalize (cleanYeastString v2)
B4. Brett 5 boolean feature
B5. BYO 883 recovery (gevsek: stat +/-%30, yeast Saison/Brett/Trappist/Hefe/Wit)
B6. IBU 10x decimal auto-fix
B7. Audit re-run

Input:  _ml_dataset_v14_pre_retrain.json
Output: brewmaster_v15_in_progress.json + _cleaning_report.json + migration_log.json
"""

import json
import re
import sys
import os
from collections import Counter, defaultdict
from datetime import datetime, timezone
from copy import deepcopy

DATASET_IN = '_ml_dataset_v14_pre_retrain.json'
STYLE_DEFS = 'STYLE_DEFINITIONS.json'
DATASET_OUT = 'brewmaster_v15_cleaned.json'
REPORT_OUT = '_cleaning_report.json'
LOG_OUT = '_migration_log.json'

# ===== yeast pattern dictionaries (audit'tekiyle ayni) =====
BRETT_RE = re.compile(
    r'\bbrett(anomyces)?\b|'
    r'\bwlp\s*0?(644|645|648|650|651|652|653|654|655|656|660|665|670|671|672|4639)\b|'
    r'\bwy?\s*0?5(112|151|526|512|733|378)\b|'
    r'\b(omega|gigayeast|escarpment|imperial|jasper)\s*(yeast)?\s*[a-z]*\s*brett\b|'
    r'\bclausenii|bruxellensis|lambicus|drie|trois\b',
    re.IGNORECASE,
)
LACTO_RE = re.compile(
    r'\blacto(bacillus)?\b|'
    r'\bwlp\s*0?(67[127]|693|672|6727|677)\b|'
    r'\bwy?\s*0?5(335|223|424)\b|'
    r'\bomega\s*(yeast)?\s*lacto\b|\bsuperdeluxe\b|\bgoodbelly\b',
    re.IGNORECASE,
)
PEDIO_RE = re.compile(
    r'\bpedio(coccus)?\b|\bwlp\s*0?661\b|\bdamnosus\b',
    re.IGNORECASE,
)
CLEAN_NEUTRAL_RE = re.compile(
    r'\bus[\s-]?05\b|\bs[\s-]?04\b|\b(safale|safbrew|fermentis|nottingham|windsor|bry[\s-]?97)\b|'
    r'\bwlp\s*0?(001|002|005|007|008|029|051|060|095|099)\b|'
    r'\bwy?\s*0?(1056|1968|1318|1098|1272|1275)\b',
    re.IGNORECASE,
)

SAISON_YEAST_RE = re.compile(r'\bwy?\s*0?(3724|3711|3725|3726)\b|\bwlp\s*0?(565|566|568|590|585)\b|\bsaison\b', re.IGNORECASE)
TRAPPIST_YEAST_RE = re.compile(r'\bwy?\s*0?(1214|1762|3787|3522)\b|\bwlp\s*0?(500|530|540|545|550|575|580)\b|\babbey|\btrappist\b', re.IGNORECASE)
HEFE_YEAST_RE = re.compile(r'\bwy?\s*0?(3068|3056|3333)\b|\bwlp\s*0?300\b|\bweihenstephan\b|\bhefeweizen\b', re.IGNORECASE)
WIT_YEAST_RE = re.compile(r'\bwy?\s*0?3944\b|\bwlp\s*0?(400|410)\b|\bwitbier\b', re.IGNORECASE)

FESTBIER_NAME_RE = re.compile(r'\b(festbier|oktoberfest|wiesn)\b', re.IGNORECASE)
ENGLISH_PALE_NAME_RE = re.compile(r'\b(esb|extra special bitter|english pale|english summer|british bitter|ordinary bitter|best bitter|english golden ale)\b', re.IGNORECASE)
GUEUZE_NAME_RE = re.compile(r'\b(gueuze|geuze|oude\s+gueuze)\b', re.IGNORECASE)
LAMBIC_NAME_RE = re.compile(r'\b(lambic|lambiek)\b', re.IGNORECASE)

AMERICAN_HOPS_RE = re.compile(r'\b(cascade|centennial|citra|chinook|columbus|simcoe|amarillo|mosaic|ekuanot|equinot|eldorado|el\s*dorado|warrior|nugget|magnum|sabro|idaho|loral|azacca)\b', re.IGNORECASE)
ENGLISH_HOPS_RE = re.compile(r'\b(ekg|east kent|fuggle|goldings|target|first gold|challenger|northdown|northern brewer|wgv|whitbread|bramling|progress)\b', re.IGNORECASE)
AUSSIE_HOPS_RE = re.compile(r'\b(galaxy|vic secret|ella|enigma|topaz|melba|topkapi)\b', re.IGNORECASE)

# Yeast strain pattern (Wyeast / WLP / Mangrove Jack / Lallemand / Fermentis)
YEAST_STRAIN_RE = re.compile(
    r'\b(?:wlp|wy|wyeast|white\s*labs)\s*0?\d{3,4}\b|'
    r'\b(?:safale|safbrew|safcider|safoeno|safspirit)\s*[a-z]?-?\s*\d+\b|'
    r'\b(?:us|s|t|w|wb|be|bcs|c2|f2|d2)-\d{2,3}\b|'
    r'\b(?:m\d{2,3}|mj\d{2,3})\b|'
    r'\b(?:lallemand|fermentis|mangrove\s*jack|imperial|omega|escarpment|gigayeast|jasper|bootleg|inland\s*island|propper|hornindal|voss|kveik)[\w\s-]{2,40}\b',
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


def hops_to_str(h):
    if not h:
        return ''
    if isinstance(h, str):
        return h
    out = []
    for it in h:
        if isinstance(it, dict):
            out.append(it.get('name', '') or '')
        else:
            out.append(str(it))
    return ' '.join(out)


def clean_yeast_string_v2(raw_str):
    """
    Yeast normalize:
    - Extract strain IDs (Wyeast/WLP/Fermentis/Mangrove Jack/Lallemand/Omega)
    - Preserve Brett/Lacto/Pedio mentions
    - Strip prose, paragraph leakage
    """
    if not raw_str or not raw_str.strip():
        return ''

    s = raw_str.strip()
    # If yeast string is suspiciously long (>500 chars), prose leakage; extract strains only
    if len(s) > 500:
        strains = YEAST_STRAIN_RE.findall(s)
        # Preserve brett/lacto/pedio mentions
        markers = []
        for m in (BRETT_RE.findall(s) or []):
            markers.append('brett')
        for m in (LACTO_RE.findall(s) or []):
            markers.append('lacto')
        for m in (PEDIO_RE.findall(s) or []):
            markers.append('pedio')
        cleaned = ' | '.join(strains[:5]) + (' | ' + ' '.join(set(markers)) if markers else '')
        return cleaned.strip(' |')

    # Normal-length: just normalize whitespace
    s = re.sub(r'\s+', ' ', s)
    s = re.sub(r'[\r\n\t]+', ' ', s)
    return s.strip()


# ===== migration kurallari =====
# Zero-risk alias map (audit'te STYLE_DEFINITIONS aliases'den buldugu)
ZERO_RISK_ALIAS = {
    'weizenbock': 'south_german_weizenbock',
    'festbier': 'german_oktoberfest_festbier',
    'eisbock': 'german_eisbock',
}

# B5d name-override priority rules (runs BEFORE B1/B2/B5)
# Any source, any current slug -> if name matches, override
# Each rule: (regex, target_slug, condition_fn or None, description)
NAME_OVERRIDE_RULES = [
    # Festbier (priority 1) - including BYO clones, any non-maerzen slug
    (re.compile(r'\b(festbier|oktoberfest|wiesn)\b', re.I),
     'german_oktoberfest_festbier', None, 'B5d_name_festbier'),
    # Gueuze (priority 2) - exclusive of fruit-gueuze
    (re.compile(r'\b(gueuze|geuze)\b', re.I),
     'belgian_gueuze', None, 'B5d_name_gueuze'),
    # Lambic (priority 3) - but exclude when fruit-lambic or gueuze
    (re.compile(r'\blambic\b(?!.*(fruit|cherry|raspberry|kriek|framboise|peche|peach|gueuze))', re.I),
     'belgian_lambic', None, 'B5d_name_lambic'),
    # Belgian IPA / Dubbel IPA (priority 4)
    (re.compile(r'\b(belgian|dubbel|tripel)\s+ipa\b', re.I),
     'belgian_ipa', None, 'B5d_name_belgian_ipa'),
    (re.compile(r'\bipabbey\b', re.I),
     'belgian_ipa', None, 'B5d_name_belgian_ipa'),
]


# B5e canonical-name recovery rules (runs after B5, on still-NULL recipes)
# Each rule: (regex, target_slug, condition_fn(r, abv, ibu, srm) or None, description)
def _strong_pale_cond(r, abv, ibu, srm):
    return (abv or 0) > 7 and (ibu or 0) > 70


def _ipa_session_cond(r, abv, ibu, srm):
    return (6 <= (abv or 0) <= 7.5) and (60 <= (ibu or 0) <= 100)


CANONICAL_NAME_RECOVERY = [
    (re.compile(r'\b(festbier|oktoberfest|wiesn)\b', re.I), 'german_oktoberfest_festbier', None, 'B5e_name_festbier'),
    (re.compile(r'\b(gueuze|geuze)\b', re.I), 'belgian_gueuze', None, 'B5e_name_gueuze'),
    (re.compile(r'\blambic\b', re.I), 'belgian_lambic', None, 'B5e_name_lambic'),
    (re.compile(r'\baltbier\b', re.I), 'german_altbier', None, 'B5e_name_altbier'),
    (re.compile(r'\bgose\b', re.I), 'gose', None, 'B5e_name_gose'),
    (re.compile(r'\bberliner\s*weisse?\b', re.I), 'berliner_weisse', None, 'B5e_name_berliner'),
    (re.compile(r'\b(imperial|russian\s+imperial)\s+stout\b', re.I), 'american_imperial_stout', None, 'B5e_name_imperial_stout'),
    (re.compile(r'\bweizenbock\b', re.I), 'south_german_weizenbock', None, 'B5e_name_weizenbock'),
    (re.compile(r'\bdoppelbock\b', re.I), 'german_doppelbock', None, 'B5e_name_doppelbock'),
    (re.compile(r'\bschwarzbier\b', re.I), 'german_schwarzbier', None, 'B5e_name_schwarzbier'),
    (re.compile(r'\bdunkel(weizen|weiss|weizen)\b', re.I), 'german_dunkles_weissbier', None, 'B5e_name_dunkelweizen'),
    (re.compile(r'\b(belgian|dubbel|tripel)\s+ipa\b|\bipabbey\b', re.I), 'belgian_ipa', None, 'B5e_name_belgian_ipa'),
    (re.compile(r'\bsaison\b', re.I), 'french_belgian_saison', None, 'B5e_name_saison'),
    (re.compile(r'\bdubbel\b', re.I), 'belgian_dubbel', None, 'B5e_name_dubbel'),
    (re.compile(r'\btripel\b', re.I), 'belgian_tripel', None, 'B5e_name_tripel'),
    (re.compile(r'\bquadrupel\b|\bquad\b', re.I), 'belgian_quadrupel', None, 'B5e_name_quadrupel'),
    (re.compile(r'\bwitbier\b|\bwit\s+beer\b', re.I), 'belgian_witbier', None, 'B5e_name_witbier'),
    (re.compile(r'\bhefeweizen\b|\bhefe\s+weiz', re.I), 'south_german_hefeweizen', None, 'B5e_name_hefe'),
    (re.compile(r'\bk[oö]lsch\b|\bkolsch\b', re.I), 'german_koelsch', None, 'B5e_name_kolsch'),
    (re.compile(r'\bvienna\s+lager\b', re.I), 'vienna_lager', None, 'B5e_name_vienna'),
    (re.compile(r'\bczech\s+pilsner|\b[cč]eské\s+pivo|\bbohemian\s+pilsner\b', re.I), 'czech_premium_pale_lager', None, 'B5e_name_czech_pils'),
    (re.compile(r'\bmunich\s+(helles|lager)\b|\bhelles\b', re.I), 'munich_helles', None, 'B5e_name_helles'),
    (re.compile(r'\bmunich\s+dunkel\b|\bdunkles\s+lager\b', re.I), 'munich_dunkel', None, 'B5e_name_dunkel'),
    (re.compile(r'\bmexican\s+lager\b', re.I), 'mexican_pale_lager', None, 'B5e_name_mexican'),
    (re.compile(r'\b(strong|imperial)\s+pale\s+ale\b', re.I), 'american_strong_pale_ale', _strong_pale_cond, 'B5e_name_strong_pale'),
    (re.compile(r'\b(american\s+ipa|ipa)\b', re.I), 'american_india_pale_ale', _ipa_session_cond, 'B5e_name_american_ipa'),
    (re.compile(r'\benglish\s+ipa|british\s+ipa\b', re.I), 'british_india_pale_ale', None, 'B5e_name_english_ipa'),
    (re.compile(r'\bbarleywine\b', re.I), 'american_barleywine', None, 'B5e_name_barleywine'),
    (re.compile(r'\bdark\s+strong\b|\bbelgian\s+dark\s+strong\b', re.I), 'belgian_strong_dark_ale', None, 'B5e_name_dark_strong'),
    (re.compile(r'\bgolden\s+strong\b|\bbelgian\s+golden\s+strong\b', re.I), 'belgian_strong_blonde_ale', None, 'B5e_name_golden_strong'),
    (re.compile(r'\bcream\s+ale\b', re.I), 'american_cream_ale', None, 'B5e_name_cream_ale'),
]


def apply_name_override(r, log, valid_slugs):
    """B5d: Name override priority. Runs BEFORE B1/B2/B5.
    Any reset only when the override target slug exists in STYLE_DEFINITIONS."""
    name = (r.get('name') or '')
    cur = r.get('bjcp_slug')
    for regex, target, cond, rule in NAME_OVERRIDE_RULES:
        if target not in valid_slugs:
            continue
        if cur == target:
            continue
        if regex.search(name):
            log.append({
                'id': r.get('id'), 'name': name, 'before': cur, 'after': target,
                'rule': rule,
            })
            r['bjcp_slug'] = target
            return True
    return False


def apply_canonical_name_recovery(r, log, valid_slugs):
    """B5e: Run on still-NULL recipes. Maps canonical BJCP names from title to slug.
    Returns True if recovered."""
    if r.get('bjcp_slug'):
        return False
    name = (r.get('name') or '')
    if not name.strip():
        return False
    feats = r.get('features') or {}
    raw = r.get('raw') or {}
    abv = feats.get('abv') or raw.get('abv')
    ibu = feats.get('ibu') or raw.get('ibu')
    srm = feats.get('srm') or raw.get('srm')
    for regex, target, cond, rule in CANONICAL_NAME_RECOVERY:
        if target not in valid_slugs:
            continue
        if not regex.search(name):
            continue
        if cond is not None and not cond(r, abv, ibu, srm):
            continue
        log.append({
            'id': r.get('id'), 'name': name, 'before': None, 'after': target,
            'rule': rule,
        })
        r['bjcp_slug'] = target
        return True
    return False


def migrate_recipe(r, log):
    """
    Mutates r in place.
    Applies B1 (taxonomy migration) + B2 (pale_ale split).
    Returns True if migrated.
    """
    rid = r.get('id', '?')
    name = r.get('name', '') or ''
    name_lower = name.lower()
    slug = r.get('bjcp_slug')
    if slug is None or slug == '':
        return False
    feats = r.get('features') or {}
    raw = r.get('raw') or {}
    abv = feats.get('abv') or raw.get('abv') or 0
    srm = feats.get('srm') or raw.get('srm') or 0
    hops_s = hops_to_str(raw.get('hops'))

    # ---- B1a: Zero-risk alias ----
    if slug in ZERO_RISK_ALIAS:
        new_slug = ZERO_RISK_ALIAS[slug]
        log.append({
            'id': rid, 'name': name, 'before': slug, 'after': new_slug,
            'rule': 'B1a_zero_risk_alias',
        })
        r['bjcp_slug'] = new_slug
        return True

    # ---- B1b: Festbier (Karar 2b: maerzen + name match) ----
    if slug == 'german_maerzen' and FESTBIER_NAME_RE.search(name_lower):
        log.append({
            'id': rid, 'name': name, 'before': slug, 'after': 'german_oktoberfest_festbier',
            'rule': 'B1b_festbier_maerzen_name',
        })
        r['bjcp_slug'] = 'german_oktoberfest_festbier'
        return True

    # ---- B1c: English Pale (name match across various slugs) ----
    if ENGLISH_PALE_NAME_RE.search(name_lower) and slug not in ('english_pale_ale', 'extra_special_bitter', 'best_bitter', 'ordinary_bitter', 'strong_bitter'):
        # Confirm with English hops if possible
        has_eng_hop = bool(ENGLISH_HOPS_RE.search(hops_s))
        feat_eng_yeast = bool(feats.get('yeast_english'))
        if has_eng_hop or feat_eng_yeast:
            log.append({
                'id': rid, 'name': name, 'before': slug, 'after': 'english_pale_ale',
                'rule': 'B1c_english_pale_name_hop',
            })
            r['bjcp_slug'] = 'english_pale_ale'
            return True

    # ---- B1d: Belgian Gueuze (lambic blend + age cue or just gueuze name) ----
    if GUEUZE_NAME_RE.search(name_lower) and slug != 'belgian_gueuze':
        log.append({
            'id': rid, 'name': name, 'before': slug, 'after': 'belgian_gueuze',
            'rule': 'B1d_gueuze_name',
        })
        r['bjcp_slug'] = 'belgian_gueuze'
        return True

    # ---- B1e: Belgian Lambic (lambic in name, no other lambic slug) ----
    if LAMBIC_NAME_RE.search(name_lower) and slug not in ('belgian_lambic', 'belgian_gueuze', 'belgian_fruit_lambic'):
        log.append({
            'id': rid, 'name': name, 'before': slug, 'after': 'belgian_lambic',
            'rule': 'B1e_lambic_name',
        })
        r['bjcp_slug'] = 'belgian_lambic'
        return True

    # ---- B2: pale_ale 852 split ----
    if slug == 'pale_ale':
        if srm and srm > 12:
            new_slug = 'american_amber_red_ale'
            rule = 'B2_amber_srm12'
        elif abv and abv > 5.5:
            new_slug = 'american_strong_pale_ale'
            rule = 'B2_strong_abv5.5'
        elif AUSSIE_HOPS_RE.search(hops_s) and not AMERICAN_HOPS_RE.search(hops_s):
            new_slug = 'australian_pale_ale'
            rule = 'B2_aussie_hops'
        elif ENGLISH_HOPS_RE.search(hops_s) and not AMERICAN_HOPS_RE.search(hops_s):
            new_slug = 'english_pale_ale'
            rule = 'B2_english_hops'
        elif AMERICAN_HOPS_RE.search(hops_s):
            new_slug = 'american_pale_ale'
            rule = 'B2_american_hops'
        else:
            new_slug = 'american_pale_ale'
            rule = 'B2_default'
        log.append({
            'id': rid, 'name': name, 'before': slug, 'after': new_slug,
            'rule': rule,
        })
        r['bjcp_slug'] = new_slug
        return True

    return False


def add_brett_features(r):
    """B4: 5 boolean Brett feature."""
    raw = r.get('raw') or {}
    yeast_str = yeast_to_str(raw.get('yeast'))
    feats = r.get('features') or {}
    has_brett = bool(BRETT_RE.search(yeast_str))
    has_lacto = bool(LACTO_RE.search(yeast_str))
    has_pedio = bool(PEDIO_RE.search(yeast_str))
    has_clean_us = bool(CLEAN_NEUTRAL_RE.search(yeast_str))
    is_mixed = has_brett and has_clean_us
    is_100brett = has_brett and not has_clean_us
    feats['has_brett'] = 1 if has_brett else 0
    feats['has_lacto'] = 1 if has_lacto else 0
    feats['has_pedio'] = 1 if has_pedio else 0
    feats['is_mixed_fermentation'] = 1 if is_mixed else 0
    feats['is_100pct_brett'] = 1 if is_100brett else 0
    r['features'] = feats


def normalize_yeast(r):
    """B3: cleanYeastString v2."""
    raw = r.get('raw') or {}
    y = raw.get('yeast')
    if y is None:
        return False
    raw_s = yeast_to_str(y)
    cleaned = clean_yeast_string_v2(raw_s)
    if cleaned != raw_s and len(raw_s) > 500:
        # Only persist when prose leakage was cleaned
        raw['yeast'] = cleaned
        return True
    return False


def fix_ibu_decimal(r, log):
    """B6: IBU 10x decimal auto-fix (kesin olanlar)."""
    raw = r.get('raw') or {}
    feats = r.get('features') or {}
    ibu = feats.get('ibu') or raw.get('ibu')
    if ibu is None:
        return False
    if not (ibu > 200):  # only fix >200 cases (10x decimal sus)
        return False
    hops = raw.get('hops') or []
    if not hops:
        return False
    try:
        batch_l = raw.get('batch_size_l') or 20
        total_iaa = 0
        for h in hops:
            if not isinstance(h, dict):
                continue
            amt_g = h.get('amount_g', 0) or 0
            alpha = h.get('alpha', 5) or 5
            tmin = h.get('time_min', 0) or 0
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
        # If IBU ~10x of est, fix
        if total_iaa > 5 and ibu > 5 * total_iaa:
            new_ibu = round(ibu / 10, 1)
            log.append({
                'id': r.get('id'), 'before_ibu': ibu, 'after_ibu': new_ibu,
                'rough_est': round(total_iaa, 1),
            })
            feats['ibu'] = new_ibu
            if 'ibu' in raw:
                raw['ibu'] = new_ibu
            return True
    except Exception:
        return False
    return False


def byo_recovery(r, log):
    """B5: BYO unlabeled recovery (gevsek: yeast Saison/Brett/Trappist/Hefe/Wit + stat +/-%30)."""
    if r.get('source') != 'byo':
        return False
    if r.get('bjcp_slug'):
        return False
    raw = r.get('raw') or {}
    feats = r.get('features') or {}
    yeast_str = yeast_to_str(raw.get('yeast'))
    abv = feats.get('abv') or raw.get('abv') or 0
    ibu = feats.get('ibu') or raw.get('ibu') or 0
    srm = feats.get('srm') or raw.get('srm') or 0
    og = feats.get('og') or raw.get('og') or 0
    name = r.get('name', '') or ''

    has_brett = bool(BRETT_RE.search(yeast_str))
    has_lacto = bool(LACTO_RE.search(yeast_str))
    has_pedio = bool(PEDIO_RE.search(yeast_str))
    has_saison = bool(SAISON_YEAST_RE.search(yeast_str))
    has_trappist = bool(TRAPPIST_YEAST_RE.search(yeast_str))
    has_hefe = bool(HEFE_YEAST_RE.search(yeast_str))
    has_wit = bool(WIT_YEAST_RE.search(yeast_str))

    # B5a: Yeast-based (Saison/Brett/Trappist/Hefeweizen/Witbier only — Karar 3)
    new_slug = None
    rule = None
    if has_brett and not has_lacto and not has_pedio:
        new_slug, rule = 'brett_beer', 'B5a_brett_only'
    elif (has_lacto and has_pedio) or (has_brett and (has_lacto or has_pedio)):
        new_slug, rule = 'mixed_fermentation_sour_beer', 'B5a_mixed_sour'
    elif has_saison:
        new_slug, rule = 'french_belgian_saison', 'B5a_saison_yeast'
    elif has_trappist and abv > 7:
        if abv > 9 or srm > 18:
            new_slug, rule = 'belgian_strong_dark_ale', 'B5a_trappist_dark_strong'
        elif abv > 8 and srm < 8:
            new_slug, rule = 'belgian_tripel', 'B5a_trappist_tripel'
        else:
            new_slug, rule = 'belgian_dubbel', 'B5a_trappist_dubbel'
    elif has_hefe:
        new_slug, rule = 'south_german_hefeweizen', 'B5a_hefe_yeast'
    elif has_wit:
        new_slug, rule = 'belgian_witbier', 'B5a_wit_yeast'

    # B5b: Stat-based fallback (zone +/-%30, Karar 3)
    if not new_slug and abv and ibu and srm:
        # Belgian dubbel: ABV 6-7.5 (loose 5.4-9.75), IBU 15-25 (loose 12-32.5), SRM 14-22 (loose 11-28.6)
        if 5.4 <= abv <= 9.75 and 12 <= ibu <= 32.5 and 11 <= srm <= 28.6:
            new_slug, rule = 'belgian_dubbel', 'B5b_stat_dubbel'
        elif 6.75 <= abv <= 12.35 and 16 <= ibu <= 52 and 3.5 <= srm <= 9.1:
            new_slug, rule = 'belgian_tripel', 'B5b_stat_tripel'
        # American IPA loose: ABV 4.95-9.75, IBU 28-91, SRM 4.2-14.3
        elif 4.95 <= abv <= 9.75 and 28 <= ibu <= 91 and 4.2 <= srm <= 14.3:
            new_slug, rule = 'american_india_pale_ale', 'B5b_stat_american_ipa'
        # German Pilsener loose: ABV 3.96-6.76, IBU 17.5-58.5, SRM 1.4-6.5
        elif 3.96 <= abv <= 6.76 and 17.5 <= ibu <= 58.5 and 1.4 <= srm <= 6.5:
            new_slug, rule = 'german_pilsener', 'B5b_stat_pilsener'
        # American Imperial Stout loose: ABV 7.2-15.6, IBU 35-117, SRM >=21
        elif 7.2 <= abv <= 15.6 and 35 <= ibu <= 117 and srm >= 21:
            new_slug, rule = 'american_imperial_stout', 'B5b_stat_imperial_stout'
        # American Pale Ale loose: ABV 3.85-6.76, IBU 21-65, SRM 3.5-13
        elif 3.85 <= abv <= 6.76 and 21 <= ibu <= 65 and 3.5 <= srm <= 13:
            new_slug, rule = 'american_pale_ale', 'B5b_stat_american_pale'
        # Munich Helles: ABV 3.96-5.85, IBU 11-24, SRM 2-5
        elif 3.96 <= abv <= 5.85 and 11 <= ibu <= 24 and 2 <= srm <= 5:
            new_slug, rule = 'munich_helles', 'B5b_stat_helles'
        # Saison loose: ABV 4.55-9.75, IBU 14-49, SRM 3.5-14
        elif 4.55 <= abv <= 9.75 and 14 <= ibu <= 49 and 3.5 <= srm <= 14:
            new_slug, rule = 'french_belgian_saison', 'B5b_stat_saison'
        # Stout (non-imperial): ABV 3.5-7.5, IBU 17-65, SRM >=22
        elif 3.5 <= abv <= 7.5 and 17 <= ibu <= 65 and srm >= 22:
            new_slug, rule = 'irish_dry_stout', 'B5b_stat_dry_stout'
        # Brown ale: ABV 3.85-6.76, IBU 15-39, SRM 14-30
        elif 3.85 <= abv <= 6.76 and 15 <= ibu <= 39 and 14 <= srm <= 30:
            new_slug, rule = 'american_brown_ale', 'B5b_stat_brown_ale'
        # Hefeweizen: ABV 3.55-6, IBU 6-23, SRM 2-7
        elif 3.55 <= abv <= 6 and 6 <= ibu <= 23 and 2 <= srm <= 7:
            new_slug, rule = 'south_german_hefeweizen', 'B5b_stat_hefe'
        # Belgian Witbier: ABV 3.85-6, IBU 6-23, SRM 2-5
        elif 3.85 <= abv <= 6 and 6 <= ibu <= 23 and 2 <= srm <= 5:
            new_slug, rule = 'belgian_witbier', 'B5b_stat_witbier'
        # Belgian Strong Blonde (a.k.a. Belgian Golden Strong Ale): ABV 6.75-12.35, IBU 17-50, SRM 3.5-7
        elif 6.75 <= abv <= 12.35 and 17 <= ibu <= 50 and 3.5 <= srm <= 7:
            new_slug, rule = 'belgian_strong_blonde_ale', 'B5b_stat_strong_blonde'
        # Pale lager (Mexican / International): ABV 3.6-5.85, IBU 8.5-25, SRM 2-5
        elif 3.6 <= abv <= 5.85 and 8.5 <= ibu <= 25 and 2 <= srm <= 5:
            new_slug, rule = 'international_pale_lager', 'B5b_stat_international_pale'

    if new_slug:
        log.append({
            'id': r.get('id'), 'name': name, 'before': None, 'after': new_slug,
            'rule': rule,
        })
        r['bjcp_slug'] = new_slug
        return True
    return False


def main():
    print(f'[load] {DATASET_IN}', file=sys.stderr)
    with open(DATASET_IN, 'r', encoding='utf-8') as f:
        d = json.load(f)
    recipes = d['recipes']
    print(f'[load] {len(recipes)} recipes', file=sys.stderr)

    print(f'[load] {STYLE_DEFS}', file=sys.stderr)
    with open(STYLE_DEFS, 'r', encoding='utf-8') as f:
        style_defs = json.load(f)
    style_def_set = set(style_defs.keys())

    out = deepcopy(d)
    out_recipes = out['recipes']

    migration_log = []
    byo_recovery_log = []
    ibu_fix_log = []
    yeast_norm_count = 0
    brett_feat_dist = Counter()

    # Pre-state slug dist
    pre_slug_dist = Counter(r.get('bjcp_slug') or '<NULL>' for r in out_recipes)

    print('[B5d] Name override priority (Festbier/Gueuze/Lambic/BelgianIPA name match)...', file=sys.stderr)
    name_override_log = []
    n_name_override = 0
    for r in out_recipes:
        if apply_name_override(r, name_override_log, style_def_set):
            n_name_override += 1
    print(f'  -> {n_name_override} recipes name-overridden', file=sys.stderr)

    print('[B1+B2] Migration + pale_ale split...', file=sys.stderr)
    n_migrated = 0
    for r in out_recipes:
        if migrate_recipe(r, migration_log):
            n_migrated += 1
    print(f'  -> {n_migrated} recipes migrated', file=sys.stderr)

    print('[B3] Yeast normalize (cleanYeastString v2)...', file=sys.stderr)
    for r in out_recipes:
        if normalize_yeast(r):
            yeast_norm_count += 1
    print(f'  -> {yeast_norm_count} yeast strings normalized (prose leakage cleanup)', file=sys.stderr)

    print('[B4] Brett 5 boolean features...', file=sys.stderr)
    for r in out_recipes:
        add_brett_features(r)
        feats = r.get('features') or {}
        for k in ('has_brett', 'has_lacto', 'has_pedio', 'is_mixed_fermentation', 'is_100pct_brett'):
            if feats.get(k):
                brett_feat_dist[k] += 1
    print(f'  -> Brett feature distribution: {dict(brett_feat_dist)}', file=sys.stderr)

    print('[B5] BYO unlabeled recovery (yeast + stat hybrid, gevsek)...', file=sys.stderr)
    n_recovered = 0
    for r in out_recipes:
        if byo_recovery(r, byo_recovery_log):
            n_recovered += 1
    print(f'  -> {n_recovered} BYO recipes recovered (B5a/B5b)', file=sys.stderr)

    print('[B5e] Canonical name pattern recovery (still-NULL only)...', file=sys.stderr)
    name_recovery_log = []
    n_name_recovered = 0
    for r in out_recipes:
        if apply_canonical_name_recovery(r, name_recovery_log, style_def_set):
            n_name_recovered += 1
    print(f'  -> {n_name_recovered} additional recipes recovered (B5e)', file=sys.stderr)

    print('[B6] IBU 10x decimal auto-fix...', file=sys.stderr)
    n_ibu_fixed = 0
    for r in out_recipes:
        if fix_ibu_decimal(r, ibu_fix_log):
            n_ibu_fixed += 1
    print(f'  -> {n_ibu_fixed} IBU values fixed', file=sys.stderr)

    print('[C1] Drop unrecovered (slug=NULL after B5+B5e)...', file=sys.stderr)
    pre_drop_count = len(out_recipes)
    rejected = []
    kept = []
    for r in out_recipes:
        if not r.get('bjcp_slug'):
            rejected.append({
                'id': r.get('id'),
                'source': r.get('source'),
                'name': r.get('name'),
                'reason': 'B5+B5e_unrecovered_null_slug',
                'features_subset': {
                    k: (r.get('features') or {}).get(k) or (r.get('raw') or {}).get(k)
                    for k in ('og', 'fg', 'abv', 'ibu', 'srm')
                },
            })
        else:
            kept.append(r)
    out_recipes = kept
    out['recipes'] = out_recipes
    n_dropped = pre_drop_count - len(out_recipes)
    print(f'  -> {n_dropped} recipes dropped (final dataset: {len(out_recipes)})', file=sys.stderr)

    # Save rejected log
    with open('_rejected_recipes.json', 'w', encoding='utf-8') as f:
        json.dump(rejected, f, ensure_ascii=False, indent=2)

    # Update meta + feature_list
    out_meta = out.get('meta') or {}
    feat_list = out_meta.get('feature_list') or []
    new_feats = ['has_brett', 'has_lacto', 'has_pedio', 'is_mixed_fermentation', 'is_100pct_brett']
    for nf in new_feats:
        if nf not in feat_list:
            feat_list.append(nf)
    out_meta['feature_list'] = feat_list
    out_meta['feature_count'] = len(feat_list)
    out_meta['cleaning_applied'] = datetime.now(timezone.utc).isoformat()
    out_meta['parent'] = DATASET_IN
    out_meta['total_recipes'] = len(out_recipes)
    out_meta['cleaning_dropped'] = n_dropped
    out['meta'] = out_meta

    # Post-state slug dist
    post_slug_dist = Counter(r.get('bjcp_slug') or '<NULL>' for r in out_recipes)

    # Coverage: how many slugs now exist in STYLE_DEFINITIONS
    invalid_pre = sum(c for s, c in pre_slug_dist.items() if s != '<NULL>' and s not in style_def_set)
    invalid_post = sum(c for s, c in post_slug_dist.items() if s != '<NULL>' and s not in style_def_set)
    null_pre = pre_slug_dist.get('<NULL>', 0)
    null_post = post_slug_dist.get('<NULL>', 0)

    # Migration breakdown by rule
    migration_by_rule = Counter(m['rule'] for m in migration_log)
    recovery_by_rule = Counter(m['rule'] for m in byo_recovery_log)

    name_override_by_rule = Counter(m['rule'] for m in name_override_log)
    name_recovery_by_rule = Counter(m['rule'] for m in name_recovery_log)

    cleaning_report = {
        'meta': {
            'date': datetime.now(timezone.utc).isoformat(),
            'input': DATASET_IN,
            'output': DATASET_OUT,
            'total_recipes_in': len(recipes),
            'total_recipes_out': len(out_recipes),
            'dropped': n_dropped,
        },
        'B5d_name_override': {
            'total_overridden': n_name_override,
            'by_rule': dict(name_override_by_rule),
        },
        'B1_B2_migration': {
            'total_migrated': n_migrated,
            'by_rule': dict(migration_by_rule),
        },
        'B3_yeast_normalize': {
            'cleaned': yeast_norm_count,
        },
        'B4_brett_features': {
            'distribution': dict(brett_feat_dist),
        },
        'B5_byo_recovery_yeast_stat': {
            'total_recovered': n_recovered,
            'by_rule': dict(recovery_by_rule),
            'pre_byo_unlabeled': sum(1 for r in recipes if r.get('source') == 'byo' and not r.get('bjcp_slug')),
        },
        'B5e_canonical_name_recovery': {
            'total_recovered': n_name_recovered,
            'by_rule': dict(name_recovery_by_rule),
        },
        'B6_ibu_fix': {
            'fixed': n_ibu_fixed,
        },
        'C1_drop': {
            'dropped': n_dropped,
            'rejected_log': '_rejected_recipes.json',
        },
        'slug_coverage': {
            'pre_invalid_slugs_total': invalid_pre,
            'post_invalid_slugs_total': invalid_post,
            'pre_null_slugs': null_pre,
            'post_null_slugs': null_post,
            'pre_unique_slugs': len(pre_slug_dist),
            'post_unique_slugs': len(post_slug_dist),
        },
        'pre_slug_dist_top30': dict(pre_slug_dist.most_common(30)),
        'post_slug_dist_top30': dict(post_slug_dist.most_common(30)),
    }

    print(f'[save] {DATASET_OUT}', file=sys.stderr)
    with open(DATASET_OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False)
    print(f'[save] {REPORT_OUT}', file=sys.stderr)
    with open(REPORT_OUT, 'w', encoding='utf-8') as f:
        json.dump(cleaning_report, f, ensure_ascii=False, indent=2)
    print(f'[save] {LOG_OUT}', file=sys.stderr)
    with open(LOG_OUT, 'w', encoding='utf-8') as f:
        json.dump({
            'name_override_log': name_override_log,
            'migration_log': migration_log,
            'byo_recovery_log': byo_recovery_log,
            'name_recovery_log': name_recovery_log,
            'ibu_fix_log': ibu_fix_log,
        }, f, ensure_ascii=False, indent=2)

    print()
    print('=' * 60)
    print('CLEANING SUMMARY')
    print('=' * 60)
    print(f'Total recipes IN:     {len(recipes)}')
    print(f'Total recipes OUT:    {len(out_recipes)} (dropped {n_dropped})')
    print(f'B5d name override:    {n_name_override}')
    print(f'B1+B2 migration:      {n_migrated}')
    print(f'B3 yeast normalize:   {yeast_norm_count}')
    print(f'B4 Brett features:    {dict(brett_feat_dist)}')
    print(f'B5 BYO recovery:      {n_recovered} (yeast/stat)')
    print(f'B5e name recovery:    {n_name_recovered} (canonical name match)')
    print(f'B6 IBU fix:           {n_ibu_fixed}')
    print(f'C1 drop:              {n_dropped}')
    print()
    print(f'Slug coverage:')
    print(f'  invalid pre/post: {invalid_pre} -> {invalid_post}')
    print(f'  null pre/post:    {null_pre} -> {null_post}')
    print(f'  unique pre/post:  {len(pre_slug_dist)} -> {len(post_slug_dist)}')
    print()
    print('Migration by rule:')
    for k, v in sorted(migration_by_rule.items(), key=lambda x: -x[1]):
        print(f'  {k:35s} {v}')
    print()
    print('BYO recovery by rule:')
    for k, v in sorted(recovery_by_rule.items(), key=lambda x: -x[1]):
        print(f'  {k:35s} {v}')


if __name__ == '__main__':
    main()
