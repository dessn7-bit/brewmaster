"""
Adim 60 — Saison/Lager cluster yeast dagilim teşhis.
V28b'de cluster bazli 18 yeast feature oran + cross-cluster yeast problem sayim.
"""
import ijson, json, hashlib, sys
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

V28B = 'working/_v28b_aliased_dataset.json'
V28B_NEW_BASELINE = '8359f033338e9aeb399850b72e202f9e70577a1639a87f81d3dde75bf820ae8a'
V19_GAIN_AUDIT = 'working/_step18c1c5d_v28b_a_xgboost_gain_diff.json'
OUT = 'working/_step60_saison_lager_yeast_dagilim_teshis.json'

# V19 SLUG_TO_CLUSTER (16 cluster, b madde script ile ayni)
SLUG_TO_CLUSTER = {
    'belgian_lambic': 'sour', 'oud_bruin': 'sour', 'berliner_weisse': 'sour',
    'mixed_fermentation_sour_beer': 'sour', 'brett_beer': 'sour',
    'fruit_beer': 'specialty', 'herb_and_spice_beer': 'specialty',
    'winter_seasonal_beer': 'specialty', 'smoked_beer': 'specialty',
    'specialty_beer': 'specialty', 'experimental_beer': 'specialty',
    'american_india_pale_ale': 'ipa', 'double_ipa': 'ipa', 'black_ipa': 'ipa',
    'juicy_or_hazy_india_pale_ale': 'ipa', 'british_india_pale_ale': 'ipa',
    'irish_dry_stout': 'stout', 'sweet_stout': 'stout', 'sweet_stout_or_cream_stout': 'stout',
    'oatmeal_stout': 'stout', 'stout': 'stout', 'american_imperial_stout': 'stout',
    'brown_porter': 'porter', 'robust_porter': 'porter', 'baltic_porter': 'porter', 'porter': 'porter',
    'american_pale_ale': 'pale_ale', 'english_pale_ale': 'pale_ale',
    'american_amber_red_ale': 'pale_ale', 'american_strong_pale_ale': 'pale_ale',
    'belgian_witbier': 'belgian', 'belgian_blonde_ale': 'belgian', 'belgian_dubbel': 'belgian',
    'belgian_tripel': 'belgian', 'belgian_strong_dark_ale': 'belgian',
    'belgian_strong_golden': 'belgian', 'belgian_quadrupel': 'belgian',
    'french_belgian_saison': 'saison', 'specialty_saison': 'saison', 'french_biere_de_garde': 'saison',
    'south_german_hefeweizen': 'wheat', 'south_german_dunkel_weizen': 'wheat',
    'south_german_weizenbock': 'wheat', 'american_wheat_ale': 'wheat', 'german_rye_ale': 'wheat',
    'american_lager': 'lager', 'german_pilsener': 'lager', 'pale_lager': 'lager',
    'pre_prohibition_lager': 'lager', 'munich_helles': 'lager', 'munich_dunkel': 'lager',
    'vienna_lager': 'lager', 'german_maerzen': 'lager', 'german_oktoberfest_festbier': 'lager',
    'german_schwarzbier': 'lager', 'dortmunder_european_export': 'lager', 'kellerbier': 'lager',
    'bamberg_maerzen_rauchbier': 'lager',
    'german_bock': 'bock', 'german_doppelbock': 'bock', 'german_heller_bock_maibock': 'bock',
    'dunkles_bock': 'bock',
    'american_brown_ale': 'brown', 'brown_ale': 'brown',
    'american_cream_ale': 'cream', 'cream_ale': 'cream', 'common_beer': 'cream',
    'german_koelsch': 'cream', 'german_altbier': 'cream',
    'mild': 'mild', 'irish_red_ale': 'mild',
    'blonde_ale': 'cream', 'golden_or_blonde_ale': 'cream',
    'ordinary_bitter': 'bitter', 'special_bitter_or_best_bitter': 'bitter',
    'extra_special_bitter': 'bitter', 'scottish_export': 'bitter', 'scotch_ale_or_wee_heavy': 'bitter',
    'old_ale': 'bitter',
    'american_barley_wine_ale': 'barleywine', 'american_barleywine': 'barleywine',
    'british_barley_wine_ale': 'barleywine',
    'flanders_red_ale': 'sour', 'belgian_gueuze': 'sour',
    'belgian_fruit_lambic': 'sour', 'gose': 'sour',
    'export_stout': 'stout',
    'red_ipa': 'ipa', 'white_ipa': 'ipa', 'rye_ipa': 'ipa',
    'belgian_ipa': 'belgian',
}

YEAST_FEATS = ['yeast_abbey','yeast_altbier','yeast_american','yeast_american_lager',
    'yeast_belgian','yeast_brett','yeast_cal_common','yeast_czech_lager','yeast_english',
    'yeast_german_lager','yeast_kolsch','yeast_kveik','yeast_lacto','yeast_saison',
    'yeast_sour_blend','yeast_wheat_german','yeast_wit','yeast_witbier']

LAGER_YEASTS = ['yeast_german_lager','yeast_american_lager','yeast_czech_lager']
LAGER_RELATED = LAGER_YEASTS + ['yeast_cal_common']  # cal_common steam yeast lager

def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        while True:
            c = f.read(8 * 1024 * 1024)
            if not c: break
            h.update(c)
    return h.hexdigest()

# === STEP 1 — sha256
print('=== STEP 1 — sha256 ===', flush=True)
v28b_sha = sha(V28B)
print(f'V28b sha: {v28b_sha} ({"esit" if v28b_sha == V28B_NEW_BASELINE else "FARK"})')
if v28b_sha != V28B_NEW_BASELINE:
    raise SystemExit('SHA SAPMASI: iptal')

# === STEP 2 — V28b stream + cluster bazli yeast sayim
print('\n=== STEP 2 — V28b stream + cluster bazli yeast ===', flush=True)
saison_yeast_count = {fk: 0 for fk in YEAST_FEATS}
lager_yeast_count = {fk: 0 for fk in YEAST_FEATS}
saison_total = 0
lager_total = 0
saison_no_saison = 0  # saison cluster + yeast_saison=0
lager_no_lager = 0    # lager cluster + tum 3 lager yeast 0
saison_no_saison_samples = []
lager_no_lager_samples = []

with open(V28B, 'rb') as f:
    parser = ijson.items(f, 'recipes.item', use_float=True)
    for r in parser:
        slug = r.get('bjcp_slug') or ''
        cluster = SLUG_TO_CLUSTER.get(slug, 'other')
        if cluster not in ('saison', 'lager'):
            continue
        feats = r.get('features', {}) or {}
        flags = {fk: int(feats.get(fk, 0) or 0) for fk in YEAST_FEATS}

        if cluster == 'saison':
            saison_total += 1
            for fk in YEAST_FEATS:
                if flags[fk]: saison_yeast_count[fk] += 1
            if flags['yeast_saison'] == 0:
                saison_no_saison += 1
                if len(saison_no_saison_samples) < 10:
                    saison_no_saison_samples.append({
                        'id': r.get('id'),
                        'slug': slug,
                        'raw_yeast': ((r.get('raw',{}) or {}).get('yeast','') or '')[:200],
                        'yeast_belgian': flags['yeast_belgian'],
                        'yeast_abbey': flags['yeast_abbey'],
                        'yeast_brett': flags['yeast_brett'],
                    })
        elif cluster == 'lager':
            lager_total += 1
            for fk in YEAST_FEATS:
                if flags[fk]: lager_yeast_count[fk] += 1
            any_lager = any(flags[fk] for fk in LAGER_YEASTS)
            if not any_lager:
                lager_no_lager += 1
                if len(lager_no_lager_samples) < 10:
                    lager_no_lager_samples.append({
                        'id': r.get('id'),
                        'slug': slug,
                        'raw_yeast': ((r.get('raw',{}) or {}).get('yeast','') or '')[:200],
                        'yeast_american': flags['yeast_american'],
                        'yeast_english': flags['yeast_english'],
                        'yeast_belgian': flags['yeast_belgian'],
                    })

# Pct hesap
def pct(n, total):
    return round(n/total*100, 1) if total else 0

saison_dist = {fk: {'count': c, 'pct': pct(c, saison_total)} for fk, c in saison_yeast_count.items()}
lager_dist = {fk: {'count': c, 'pct': pct(c, lager_total)} for fk, c in lager_yeast_count.items()}

print(f'\nSaison cluster total: {saison_total}')
print('Top 8 yeast oran:')
for fk in sorted(saison_yeast_count, key=lambda k: -saison_yeast_count[k])[:8]:
    print(f'  {fk:25s} {saison_yeast_count[fk]:6d} ({pct(saison_yeast_count[fk], saison_total)}%)')

print(f'\nLager cluster total: {lager_total}')
print('Top 8 yeast oran:')
for fk in sorted(lager_yeast_count, key=lambda k: -lager_yeast_count[k])[:8]:
    print(f'  {fk:25s} {lager_yeast_count[fk]:6d} ({pct(lager_yeast_count[fk], lager_total)}%)')

# === STEP 3 — Cross-cluster yeast problem
print(f'\n=== STEP 3 — Cross-cluster ===', flush=True)
print(f'Saison cluster + yeast_saison=0: {saison_no_saison} ({pct(saison_no_saison, saison_total)}%)')
print(f'Lager cluster + tum 3 lager_yeast=0: {lager_no_lager} ({pct(lager_no_lager, lager_total)}%)')

# === STEP 4 — V19 gain bagi
with open(V19_GAIN_AUDIT, 'r', encoding='utf-8') as f:
    gain_audit = json.load(f)
top10_v28b = gain_audit['top10_v28b']
all_features_gain = gain_audit['all_features_gain']
yeast_saison_gain = next((f for f in all_features_gain if f['feature']=='yeast_saison'), None)
print(f'\n=== STEP 4 — V19 gain ===', flush=True)
print(f'Top-10 V28b: {top10_v28b}')
print(f'yeast_saison gain V28b: {yeast_saison_gain}')

out = {
    'meta': {
        'sprint': 'Adim 60 saison/lager cluster yeast dagilim teshis',
        'rule_refs': ['KURAL 1.4', 'KURAL 4.4', 'KURAL 9.2'],
        'cluster_mapping_source': 'V19 SLUG_TO_CLUSTER',
    },
    'sha256_check': {'v28b': v28b_sha, 'v28b_intact': v28b_sha == V28B_NEW_BASELINE},
    'saison_cluster': {
        'total': saison_total,
        'yeast_distribution': saison_dist,
        'no_saison_yeast_count': saison_no_saison,
        'no_saison_yeast_pct': pct(saison_no_saison, saison_total),
        'samples_no_saison': saison_no_saison_samples,
    },
    'lager_cluster': {
        'total': lager_total,
        'yeast_distribution': lager_dist,
        'no_lager_yeast_count': lager_no_lager,
        'no_lager_yeast_pct': pct(lager_no_lager, lager_total),
        'samples_no_lager': lager_no_lager_samples,
    },
    'cross_cluster_reslug_aday_aday': {
        'saison_no_saison_yeast': saison_no_saison,
        'lager_no_lager_yeast': lager_no_lager,
        'toplam': saison_no_saison + lager_no_lager,
    },
    'v19_gain_baglam': {
        'top10_v28b': top10_v28b,
        'yeast_saison_gain': yeast_saison_gain,
    },
}

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=2)

print(f'\nCikti: {OUT}')
