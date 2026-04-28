#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Adım 53 Faz B-2 — rmwoods style_name → V15 slug mapping table.

Strategy:
- style_guide hepsi 'bjcp' (BJCP 2008 + BJCP 2015 mix, kategori koduyla ayırt edilebilir)
- 226 (cat, name) → 82 V15 slug
- Cider/mead/perry/braggot SKIP (V15'te yok, V17 dataset dışı)
- Map (style_name) primary; (cat, name) override ambigous için
- Output: working/_rmwoods_style_to_v15slug.json
"""
import json
import os

OUT_DIR = 'C:/Users/Kaan/brewmaster/working'

# V15 82 slug listesi + V18 9 yeni slug (Adım 54)
V15_SLUGS = set(json.load(open('C:/Users/Kaan/brewmaster/_v16_label_encoder_slug.json', encoding='utf-8'))['classes'])
V18_NEW_SLUGS = {
    'flanders_red_ale', 'belgian_gueuze', 'belgian_fruit_lambic',
    'gose', 'export_stout',
    'red_ipa', 'white_ipa', 'rye_ipa', 'belgian_ipa',
}
V15_SLUGS = V15_SLUGS | V18_NEW_SLUGS  # 91 toplam

# (cat, name) → V15 slug. None = exclude (cider/mead/etc.)
# Sözlük key formatı: "cat::name" (cat boşsa sadece name).
MAPPING = {}

# style_name primary mapping (cat agnostic)
NAME_MAP = {
    # ===== Lagers =====
    'american light lager':         'american_lager',
    'lite american lager':          'american_lager',
    'light american lager':         'american_lager',
    'standard american lager':      'american_lager',
    'american lager':               'american_lager',
    'premium american lager':       'american_lager',
    'classic american pilsner':     'pre_prohibition_lager',
    'pre-prohibition lager':        'pre_prohibition_lager',
    'kentucky common':              'common_beer',
    'german pilsner (pils)':        'german_pilsener',
    'german pils':                  'german_pilsener',
    'bohemian pilsener':            'german_pilsener',
    'czech premium pale lager':     'german_pilsener',
    'czech pale lager':             'pale_lager',
    'czech amber lager':            'vienna_lager',
    'czech dark lager':             'munich_dunkel',
    'international pale lager':     'pale_lager',
    'international amber lager':    'vienna_lager',
    'international dark lager':     'munich_dunkel',
    'munich helles':                'munich_helles',
    'dortmunder export':            'dortmunder_european_export',
    'munich dunkel':                'munich_dunkel',
    'schwarzbier':                  'german_schwarzbier',
    'schwarzbier (black beer)':     'german_schwarzbier',
    'dark american lager':          'american_lager',
    'vienna lager':                 'vienna_lager',
    'oktoberfest/märzen':           'german_maerzen',
    'märzen':                       'german_maerzen',
    'festbier':                     'german_oktoberfest_festbier',
    'rauchbier':                    'bamberg_maerzen_rauchbier',
    'classic rauchbier':            'bamberg_maerzen_rauchbier',
    'maibock/helles bock':          'german_heller_bock_maibock',
    'helles bock':                  'german_heller_bock_maibock',
    'traditional bock':             'german_bock',
    'doppelbock':                   'german_doppelbock',
    'eisbock':                      'german_doppelbock',
    'dunkles bock':                 'dunkles_bock',
    'german leichtbier':            'american_lager',
    'german helles exportbier':     'dortmunder_european_export',
    'kellerbier: pale kellerbier':  'kellerbier',
    'kellerbier: amber kellerbier': 'kellerbier',

    # ===== German Wheat =====
    'weizen/weissbier':             'south_german_hefeweizen',
    'weissbier':                    'south_german_hefeweizen',
    'dunkelweizen':                 'south_german_dunkel_weizen',
    'dunkles weissbier':            'south_german_dunkel_weizen',
    'weizenbock':                   'south_german_weizenbock',
    'roggenbier (german rye beer)': 'german_rye_ale',
    'roggenbier':                   'german_rye_ale',

    # ===== German Ales =====
    'kölsch':                       'german_koelsch',
    'düsseldorf altbier':           'german_altbier',
    'altbier':                      'german_altbier',
    'northern german altbier':      'german_altbier',
    'north german altbier':         'german_altbier',
    'california common beer':       'common_beer',
    'california common':            'common_beer',
    'cream ale':                    'american_cream_ale',
    'blonde ale':                   'blonde_ale',
    'american wheat or rye beer':   'american_wheat_ale',
    'american wheat beer':          'american_wheat_ale',

    # ===== Britannic =====
    'standard/ordinary bitter':     'ordinary_bitter',
    'ordinary bitter':              'ordinary_bitter',
    'special/best/premium bitter':  'special_bitter_or_best_bitter',
    'best bitter':                  'special_bitter_or_best_bitter',
    'extra special/strong bitter (english pale ale)': 'extra_special_bitter',
    'extra special/strong bitter (esb)':              'extra_special_bitter',
    'strong bitter':                'extra_special_bitter',
    'mild':                         'mild',
    'dark mild':                    'mild',
    'london brown ale':             'mild',
    'northern english brown ale':   'brown_ale',
    'northern english brown':       'brown_ale',
    'british brown ale':            'brown_ale',
    'southern english brown':       'mild',
    'british golden ale':           'golden_or_blonde_ale',
    'british strong ale':           'old_ale',
    'old ale':                      'old_ale',
    'burton ale':                   'old_ale',
    'english pale ale':             'english_pale_ale',  # explicit if appears
    'australian sparkling ale':     'english_pale_ale',
    'irish red ale':                'irish_red_ale',
    'scottish light 60/-':          'scottish_export',
    'scottish heavy 70/-':          'scottish_export',
    'scottish heavy':               'scottish_export',
    'scottish light':               'scottish_export',
    'scottish export 80/-':         'scottish_export',
    'scottish export':              'scottish_export',
    'strong scotch ale':            'scotch_ale_or_wee_heavy',
    'wee heavy':                    'scotch_ale_or_wee_heavy',
    'english barleywine':           'british_barley_wine_ale',
    'american barleywine':          'american_barley_wine_ale',
    'wheatwine':                    'american_barley_wine_ale',
    'american strong ale':          'american_strong_pale_ale',

    # ===== Stouts/Porters =====
    'dry stout':                    'irish_dry_stout',
    'irish stout':                  'irish_dry_stout',
    'irish extra stout':            'foreign_extra_stout' if 'foreign_extra_stout' in V15_SLUGS else 'sweet_stout',
    'sweet stout':                  'sweet_stout',
    'oatmeal stout':                'oatmeal_stout',
    'foreign extra stout':          'export_stout',          # V18 Adım 54: ayrı slug (1A onayı)
    'tropical stout':               'sweet_stout',
    'american stout':               'stout',
    'imperial stout':               'american_imperial_stout',
    'russian imperial stout':       'american_imperial_stout',
    'brown porter':                 'brown_porter',
    'robust porter':                'robust_porter',
    'baltic porter':                'baltic_porter',
    'american porter':              'porter',
    'english porter':               'porter',
    'pre-prohibition porter':       'porter',
    'porter':                       'porter',

    # ===== American Hoppy =====
    'american pale ale':            'american_pale_ale',
    'american amber ale':           'american_amber_red_ale',
    'american brown ale':           'american_brown_ale',
    'american ipa':                 'american_india_pale_ale',
    'imperial ipa':                 'double_ipa',
    'double ipa':                   'double_ipa',
    'english ipa':                  'british_india_pale_ale',
    'specialty ipa: black ipa':     'black_ipa',
    'specialty ipa: red ipa':       'red_ipa',               # V18 Adım 54: ayrı slug
    'specialty ipa: rye ipa':       'rye_ipa',               # V18 Adım 54: ayrı slug
    'specialty ipa: white ipa':     'white_ipa',             # V18 Adım 54: ayrı slug
    'specialty ipa: belgian ipa':   'belgian_ipa',           # V18 Adım 54: ayrı slug
    'specialty ipa: brown ipa':     'american_brown_ale',
    'specialty ipa: new england ipa': 'juicy_or_hazy_india_pale_ale',

    # ===== Belgian =====
    'witbier':                      'belgian_witbier',
    'belgian pale ale':             'belgian_blonde_ale',
    'belgian blond ale':            'belgian_blonde_ale',
    'saison':                       'french_belgian_saison',
    'bière de garde':               'french_biere_de_garde',
    'belgian specialty ale':        'specialty_saison',
    'belgian dubbel':               'belgian_dubbel',
    'belgian tripel':               'belgian_tripel',
    'belgian golden strong ale':    'belgian_strong_golden',
    'belgian dark strong ale':      'belgian_strong_dark_ale',
    'trappist single':              'belgian_blonde_ale',

    # ===== Sour =====
    'berliner weisse':              'berliner_weisse',
    'gose':                         'gose',                  # V18 Adım 54: ayrı slug
    'flanders red ale':             'flanders_red_ale',      # V18 Adım 54: ayrı slug
    'flanders brown ale/oud bruin': 'oud_bruin',
    'oud bruin':                    'oud_bruin',
    'fruit lambic':                 'belgian_fruit_lambic',  # V18 Adım 54: ayrı slug
    'gueuze':                       'belgian_gueuze',        # V18 Adım 54: ayrı slug
    'lambic':                       'belgian_lambic',
    'straight (unblended) lambic':  'belgian_lambic',
    'mixed-fermentation sour beer': 'mixed_fermentation_sour_beer',
    'brett beer':                   'brett_beer',
    'wild specialty beer':          'mixed_fermentation_sour_beer',

    # ===== Specialty =====
    'fruit beer':                   'fruit_beer',
    'specialty fruit beer':         'fruit_beer',
    'fruit and spice beer':         'fruit_beer',
    'spice, herb, or vegetable beer': 'herb_and_spice_beer',
    'christmas/winter specialty spiced beer': 'winter_seasonal_beer',
    'holiday/winter special spiced beer': 'winter_seasonal_beer',
    'winter seasonal beer':         'winter_seasonal_beer',
    'autumn seasonal beer':         'winter_seasonal_beer',
    'other smoked beer':            'smoked_beer',
    'classic style smoked beer':    'smoked_beer',
    'specialty smoked beer':        'smoked_beer',
    'wood-aged beer':               'specialty_beer',
    'specialty wood-aged beer':     'specialty_beer',
    'mixed-style beer':             'specialty_beer',
    'clone beer':                   'specialty_beer',
    'experimental beer':            'experimental_beer',
    'specialty beer':               'specialty_beer',
    'alternative grain beer':       'specialty_beer',
    'alternative sugar beer':       'specialty_beer',
    'sahti':                        'specialty_beer',
    'piwo grodziskie':              'specialty_beer',
    'lichtenhainer':                'specialty_beer',
}

# Cider/mead/perry/braggot — skip
EXCLUDE_NAMES = {
    'no profile selected',
    'dry mead', 'semi-sweet mead', 'sweet mead', 'braggot', 'metheglin',
    'open category mead', 'cyser (apple melomel)', 'other fruit melomel',
    'pyment (grape melomel)', 'common cider', 'english cider', 'french cider',
    'traditional perry', 'new england cider', 'fruit cider', 'apple wine',
    'other specialty cider or perry',
}


def map_style(cat: str, name: str):
    """Return V15 slug or None if excluded."""
    name_clean = (name or '').strip().lower()
    if name_clean in EXCLUDE_NAMES:
        return None
    slug = NAME_MAP.get(name_clean)
    if slug and slug in V15_SLUGS:
        return slug
    return None


# Test against all (cat, name) pairs
if __name__ == '__main__':
    style_dist = json.load(open(f'{OUT_DIR}/_rmwoods_style_dist.json', encoding='utf-8'))
    mapped, excluded, unmapped = [], [], []
    total_recipes = sum(s['count'] for s in style_dist)
    for s in style_dist:
        slug = map_style(s['cat'], s['name'])
        rec = {'cat': s['cat'], 'name': s['name'], 'count': s['count'], 'slug': slug}
        if slug is None:
            if s['name'] in EXCLUDE_NAMES:
                excluded.append(rec)
            else:
                unmapped.append(rec)
        else:
            mapped.append(rec)

    n_mapped = sum(s['count'] for s in mapped)
    n_excluded = sum(s['count'] for s in excluded)
    n_unmapped = sum(s['count'] for s in unmapped)

    print(f'Total recipes: {total_recipes}')
    print(f'Mapped:    {n_mapped:>7d} ({100*n_mapped/total_recipes:.1f}%)')
    print(f'Excluded:  {n_excluded:>7d} ({100*n_excluded/total_recipes:.1f}%) [cider/mead/perry]')
    print(f'Unmapped:  {n_unmapped:>7d} ({100*n_unmapped/total_recipes:.1f}%)')
    if unmapped:
        print(f'\nTop unmapped:')
        for u in sorted(unmapped, key=lambda x: -x['count'])[:30]:
            print(f"  {u['cat']:6s} {u['name']:60s} {u['count']}")

    out = {
        'name_to_slug': NAME_MAP,
        'exclude_names': sorted(EXCLUDE_NAMES),
        'mapped': mapped,
        'excluded': excluded,
        'unmapped': unmapped,
        'stats': {
            'total': total_recipes,
            'mapped': n_mapped,
            'excluded': n_excluded,
            'unmapped': n_unmapped,
        }
    }
    out_path = f'{OUT_DIR}/_rmwoods_style_to_v15slug.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f'\nWritten {out_path}')
