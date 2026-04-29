"""V6_C2 inline JSON oluştur + HTML embed.

HTML modifikasyonu:
1. TRAINING_RECS satır 1579: V6 production 1100 → V6_C2 32K
2. predictV6Enhanced: label_slug → label_family (cluster-level)
3. toV5Output _meta + cluster-level reflection
4. PERFORMANCE metrics + console log update
"""
import json, sys, re, os

sys.stdout.reconfigure(encoding='utf-8')


SLUG_TO_CLUSTER = {
    'belgian_lambic': 'sour', 'oud_bruin': 'sour', 'berliner_weisse': 'sour',
    'mixed_fermentation_sour_beer': 'sour', 'brett_beer': 'sour',
    'flanders_red_ale': 'sour', 'belgian_gueuze': 'sour',
    'belgian_fruit_lambic': 'sour', 'gose': 'sour',
    'fruit_beer': 'specialty', 'herb_and_spice_beer': 'specialty',
    'winter_seasonal_beer': 'specialty', 'smoked_beer': 'specialty',
    'specialty_beer': 'specialty', 'experimental_beer': 'specialty',
    'american_india_pale_ale': 'ipa', 'double_ipa': 'ipa', 'black_ipa': 'ipa',
    'juicy_or_hazy_india_pale_ale': 'ipa', 'british_india_pale_ale': 'ipa',
    'red_ipa': 'ipa', 'white_ipa': 'ipa', 'rye_ipa': 'ipa', 'brut_ipa': 'ipa',
    'irish_dry_stout': 'stout', 'sweet_stout': 'stout',
    'oatmeal_stout': 'stout', 'stout': 'stout', 'american_imperial_stout': 'stout',
    'export_stout': 'stout',
    'brown_porter': 'porter', 'robust_porter': 'porter', 'baltic_porter': 'porter', 'porter': 'porter',
    'american_pale_ale': 'pale_ale', 'english_pale_ale': 'pale_ale',
    'american_amber_red_ale': 'pale_ale', 'american_strong_pale_ale': 'pale_ale',
    'belgian_witbier': 'belgian', 'belgian_blonde_ale': 'belgian', 'belgian_dubbel': 'belgian',
    'belgian_tripel': 'belgian', 'belgian_strong_dark_ale': 'belgian',
    'belgian_strong_golden': 'belgian', 'belgian_quadrupel': 'belgian', 'belgian_ipa': 'belgian',
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
    'american_cream_ale': 'cream', 'common_beer': 'cream',
    'german_koelsch': 'cream', 'german_altbier': 'cream', 'blonde_ale': 'cream',
    'mild': 'mild', 'irish_red_ale': 'mild',
    'ordinary_bitter': 'bitter', 'special_bitter_or_best_bitter': 'bitter',
    'extra_special_bitter': 'bitter', 'scottish_export': 'bitter', 'scotch_ale_or_wee_heavy': 'bitter',
    'old_ale': 'bitter',
    'american_barley_wine_ale': 'barleywine', 'british_barley_wine_ale': 'barleywine',
}

# HTML schema feature (V6 engine genelinde tanınmayan field'ları sıfır kabul eder)
HTML_FEATURE_SCHEMA = [
    'og', 'fg', 'abv', 'ibu', 'srm',
    'pct_pilsner', 'pct_pale_ale', 'pct_munich', 'pct_vienna', 'pct_wheat',
    'pct_oats', 'pct_rye', 'pct_crystal', 'pct_choc', 'pct_roast', 'pct_smoked',
    'pct_corn', 'pct_rice', 'pct_sugar', 'pct_aromatic_abbey',
    'yeast_belgian', 'yeast_abbey', 'yeast_saison', 'yeast_kveik', 'yeast_english',
    'yeast_american', 'yeast_german_lager', 'yeast_kolsch', 'yeast_witbier',
    'yeast_wheat_german', 'yeast_brett', 'yeast_lacto', 'yeast_sour_blend',
    'hop_american_c', 'hop_english', 'hop_german', 'hop_czech_saaz', 'hop_nz',
    'katki_fruit', 'katki_spice_herb', 'katki_chocolate', 'katki_coffee',
    'katki_smoke', 'katki_lactose',
    'dry_hop_days', 'has_brett', 'has_lacto', 'is_mixed_fermentation',
    'has_coriander', 'has_orange_peel', 'has_chamomile', 'has_salt',
    'has_dry_hop_heavy', 'has_whirlpool_heavy',
    'dry_hop_grams_per_liter', 'late_hop_pct',
]


print('[1] Loading V6_C2 dataset...', flush=True)
with open('working/_v6_c2_dataset.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
recs = data['recipes']
print(f'  V6_C2: {len(recs)} recipes', flush=True)


print('\n[2] Building HTML inline TRAINING_RECS array (cluster-level)...', flush=True)
training_recs = []
for r in recs:
    slug = r.get('bjcp_slug') or ''
    cluster = SLUG_TO_CLUSTER.get(slug, 'other')
    feat = r.get('features') or {}
    name = (r.get('name') or '')[:60]
    features_out = {}
    for fname in HTML_FEATURE_SCHEMA:
        v = feat.get(fname)
        if v is None or (isinstance(v, float) and (v != v)):
            features_out[fname] = 0
        else:
            features_out[fname] = round(v, 4) if isinstance(v, float) else v
    training_recs.append({
        'name': name,
        'label_slug': slug,
        'label_family': cluster,  # ← V6 KNN bunu kullanacak
        'features': features_out,
    })
print(f'  Built {len(training_recs)} HTML-format records', flush=True)


# Save backup inline JS
inline_js_path = '_v6_c2_inline_html.js'
with open(inline_js_path, 'w', encoding='utf-8') as f:
    f.write('// V6_C2 KNN data — V19-aliased balanced cluster (16 × 2000 = 32,000 recipes)\n')
    f.write('// Built: 2026-04-29 (Adim 60c)\n')
    f.write('// 5-fold CV (seed 42, K=5, weighted): top-1 53.86%, top-3 73.70% (cluster-level)\n')
    f.write('// V19-aliased holdout baseline: eski V6 39.06% top-1 (V6_C2 +14.8pp)\n')
    f.write('// Method: cluster-level KNN (16-cat balanced)\n\n')
    f.write('const TRAINING_RECS = ' + json.dumps(training_recs, ensure_ascii=False, separators=(',', ':')) + ';\n')
sz = os.path.getsize(inline_js_path) / (1024*1024)
print(f'  Saved {inline_js_path} ({sz:.1f} MB)', flush=True)


# ==================== HTML embed ====================
print('\n[3] HTML embed — TRAINING_RECS satırı + predictV6Enhanced + metadata...', flush=True)
with open('Brewmaster_v2_79_10.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. TRAINING_RECS replace (satır 1579)
training_recs_line_idx = None
for i, line in enumerate(lines):
    if line.lstrip().startswith('const TRAINING_RECS = ['):
        training_recs_line_idx = i
        break
if training_recs_line_idx is None:
    print('  ❌ TRAINING_RECS bulunamadı', flush=True); sys.exit(1)
new_training_recs_json = json.dumps(training_recs, ensure_ascii=False, separators=(',', ':'))
lines[training_recs_line_idx] = f'  const TRAINING_RECS = {new_training_recs_json};\n'
print(f'  TRAINING_RECS satırı {training_recs_line_idx+1} replace', flush=True)


# 2. predictV6Enhanced — label_slug → label_family değişikliği (sadece styleVotes için)
# Önemli: trainRecipe.label_slug iki yerde kullanılıyor:
#   (a) yeast_style_contradiction(testRecipe, trainRecipe.label_slug)  — veto kuralı, slug istiyor
#   (b) styleVotes[neighbors[n].recipe.label_slug]  — voting, cluster'a değiştir
# Sadece (b) değişir, (a) korunur (veto kuralları slug seviyesinde).

# Önce v2 satır bulunca o korunuyor — sadece "styleVotes" bloğunu bul ve label_slug → label_family yap
voting_line_idx = None
for i, line in enumerate(lines):
    if 'const style = neighbors[n].recipe.label_slug' in line:
        voting_line_idx = i
        break
if voting_line_idx is None:
    print('  ❌ Voting label_slug satırı bulunamadı', flush=True); sys.exit(1)

lines[voting_line_idx] = lines[voting_line_idx].replace(
    'const style = neighbors[n].recipe.label_slug',
    'const style = neighbors[n].recipe.label_family'
)
print(f'  predictV6Enhanced voting satırı {voting_line_idx+1}: label_slug → label_family', flush=True)


# 3. PERFORMANCE metrics + console log + _meta updates
mods = 0
for i, line in enumerate(lines):
    if "FEATURES_COUNT: 79," in line:
        lines[i] = line.replace("FEATURES_COUNT: 79,", f"FEATURES_COUNT: {len(HTML_FEATURE_SCHEMA)},")
        mods += 1
    if "PERFORMANCE_5FOLD: { top1: 0.785," in line:
        lines[i] = '    PERFORMANCE_5FOLD: { top1: 0.5386, top3: 0.7370, top5: null, N: 32000, seed: 42, level: "cluster-16cat" },\n'
        mods += 1
    if "PERFORMANCE_HOLDOUT: { top1: 0.738," in line:
        lines[i] = '    PERFORMANCE_HOLDOUT: { top1: 0.5386, top3: 0.7370, holdout_old_v6_baseline: 0.3906, note: "V19-aliased holdout, V6_C2 +14.8pp vs old V6" }\n'
        mods += 1
    if "[BM_ENGINE_V6_FINAL] loaded:" in line and "79 features" in line:
        lines[i] = line.replace("'recipes, 79 features'", f"'recipes, {len(HTML_FEATURE_SCHEMA)} features (V6_C2 cluster-16cat)'")
        mods += 1
    if "5-fold CV (seed 42): top-1 78.5%, top-3 86.5%, top-5 87.3%" in line:
        lines[i] = line.replace(
            "5-fold CV (seed 42): top-1 78.5%, top-3 86.5%, top-5 87.3%",
            "5-fold CV (seed 42, V19-aliased balanced 16×2000=32K, cluster-level): top-1 53.86%, top-3 73.70%"
        )
        mods += 1
    if "holdout (840/260, seed 42): top-1 73.8%, top-3 80.8%, top-5 81.5%" in line:
        lines[i] = line.replace(
            "holdout (840/260, seed 42): top-1 73.8%, top-3 80.8%, top-5 81.5%",
            "V19-aliased holdout: V6_C2 53.86% vs old V6 39.06% (+14.8pp), Adim 60c cluster-level deploy"
        )
        mods += 1
    if "method: multi-K weighted KNN + veto rules + feature weighting (NO Random Forest)" in line:
        lines[i] = line.replace(
            "method: multi-K weighted KNN + veto rules + feature weighting (NO Random Forest)",
            "method: cluster-level KNN (16-cat) + veto + feature weighting (V19-aliased balanced M=2000)"
        )
        mods += 1
    if "method: 'multi-K weighted KNN + veto + feature weighting'" in line:
        lines[i] = line.replace(
            "method: 'multi-K weighted KNN + veto + feature weighting'",
            "method: 'cluster-level KNN (16-cat) + veto + feature weighting'"
        )
        mods += 1
    if "METHOD: 'multi-K weighted KNN + veto + feature weighting'" in line:
        lines[i] = line.replace(
            "METHOD: 'multi-K weighted KNN + veto + feature weighting'",
            "METHOD: 'cluster-level KNN (16-cat) + veto + feature weighting'"
        )
        mods += 1
print(f'  Metadata + console log: {mods} satır güncellendi', flush=True)


# Write
print('\n[4] Writing HTML...', flush=True)
with open('Brewmaster_v2_79_10.html', 'w', encoding='utf-8') as f:
    f.writelines(lines)
sz_html = os.path.getsize('Brewmaster_v2_79_10.html') / (1024*1024)
print(f'  HTML written ({sz_html:.1f} MB)', flush=True)
print('\n[DONE] V6_C2 cluster-level HTML embed tamamlandı.', flush=True)
