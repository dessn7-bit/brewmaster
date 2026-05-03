"""
Adim 18c-1c-5d V28b TEK BUILD — 10 pattern (C2-C11) ardisik targeted exception.

V27 baseline -> V28b
Mantik:
1. DEFAULT UNION: v28b[fk] = v27[fk] (kopya)
2. 10 TARGETED EXCEPTION ardisik:
   C2 wheat overflow: PAT_KOLSCH + V27[yeast_wheat_german]=1 + V27[yeast_kolsch]=1 -> yeast_kolsch=0
   C2 stout overflow: PAT_KOLSCH + cluster='stout' + V27[yeast_kolsch]=1 -> yeast_kolsch=0
   C3 belle saison: PAT_BELLE_SAISON + V27[yeast_belgian]=1 -> yeast_belgian=0
   C4 bell oberon strict: PAT_BELL_LOOSE AND NOT PAT_BELL_STRICT + V27[yeast_wheat_german]=1 -> yeast_wheat_german=0
   C5 mauri brew space: PAT_MAURI_SPACE_ONLY + lager kontekst + V27[yeast_german_lager]=0 -> yeast_german_lager=1
   C6 NO-OP (Cellador erteleme, build bloku atlanir)
   C7 NB Neobritannia: PAT_NEOBRITANNIA + V27[yeast_english]=0 -> yeast_english=1
   C8 NorCal #1: PAT_NORCAL + V27[yeast_american]=0 -> yeast_american=1
   C9 Muntons Premium Gold: PAT_MUNTONS_PG + V27[yeast_american]=0 -> yeast_american=1
   C10 Lalbrew Diamond: PAT_LALBREW + V27[yeast_german_lager]=0 -> yeast_german_lager=1
   C11 Coopers Pure Brewers: PAT_COOPERS + V27[yeast_american]=0 -> yeast_american=1
3. has_ANY_C=False recetelerde HIC degisiklik (drift guard tek)
4. Toplam exception >5000 -> SystemExit + V28b dataset SIL

KARAR X (KURAL 4.5):
- Drift guard tek: has_ANY_C=False recetede v28b != v27 -> drift
- C8/C9/C11 cross-pattern collision: idempotent value, sayim double-count engeli
- C2 stout: yeast_stout feature yok, cluster='stout' V19 SLUG_TO_CLUSTER proxy
- C5 lager kontekst: parser line 266 ile ayni regex
- C6 no-op: build blok atlanir, audit'te kayit

CALISTIRMA YOK. Sadece denetim icin yazildi.
"""
import ijson, json, re, time, hashlib, os, sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

V27 = 'working/_v27_aliased_dataset.json'
V28B = 'working/_v28b_aliased_dataset.json'
AUDIT = 'working/_step18c1c5d_v28b_audit.json'

V27_BASELINE_SHA256 = '8c2d132d1913a57203040a98c9ef1ceebc2e18ce771b0f233718e1215c12442d'
V27_EXPECTED_SIZE = 1329002475
V27_EXPECTED_RECIPES = 376845

YEAST_FEATS = ['yeast_abbey','yeast_altbier','yeast_american','yeast_american_lager',
    'yeast_belgian','yeast_brett','yeast_cal_common','yeast_czech_lager','yeast_english',
    'yeast_german_lager','yeast_kolsch','yeast_kveik','yeast_lacto','yeast_saison',
    'yeast_sour_blend','yeast_wheat_german','yeast_wit','yeast_witbier']

# === Pattern regex tanimlari (10 pattern) ===
# C2 Kolsch overflow daraltma
PAT_KOLSCH = re.compile(r'\bk[oö]ls(?:ch|h)\b|kolsch|koelsch', re.IGNORECASE)

# C3 Belle saison kaldirma (yeast_belgian'dan)
PAT_BELLE_SAISON = re.compile(r'\bbelle\s+saison\b', re.IGNORECASE)

# C4 Bell oberon strict (loose AND NOT strict)
PAT_BELL_LOOSE = re.compile(r'bell.{0,3}s\s+oberon', re.IGNORECASE)
PAT_BELL_STRICT = re.compile(r"bell'?s?\s+oberon", re.IGNORECASE)

# C5 Mauri brew space variant (space var, mauribrew nospace yok) + lager kontekst
PAT_MAURI_SPACE = re.compile(r'\bmauri\s+brew\b', re.IGNORECASE)
PAT_MAURI_NOSPACE = re.compile(r'\bmauribrew\b', re.IGNORECASE)
# Lager kontekst (parser line 266 ile ayni): mauri brew sonrası lager/yeast/blend veya parantez içi lager
PAT_MAURI_LAGER_CONTEXT = re.compile(r'\bmauri\s+brew\s*(?:\s+(?:lager|yeast|blend)|\s*\([^)]*lager)', re.IGNORECASE)

# C7 NB Neobritannia (Wyeast 1945)
PAT_NEOBRITANNIA = re.compile(r'\bneobritannia\b|nb[\s\-]+neobritannia|\b(?:wyeast|wy)\s*[\#\.]?\s*0?1945\b|\b1945\b', re.IGNORECASE)

# C8 NorCal #1 (GigaYeast GY001)
PAT_NORCAL = re.compile(r'\bnorcal\s*#?\s*1\b|gigayeast.{0,10}norcal|\bgy\s*0?001\b', re.IGNORECASE)

# C9 Muntons Premium Gold (kombo zorunlu, premium gold tek başına FP riski nedeniyle revize)
PAT_MUNTONS_PG = re.compile(r'muntons\s+premium\s+gold', re.IGNORECASE)

# C10 Lalbrew Diamond / Lallemand (Premium) Diamond / Diamond Lager Yeast
PAT_LALBREW = re.compile(r'\blalbrew\s+diamond\b|\blallemand\s+(?:premium\s+)?diamond\b|\bdiamond\s+lager(?:\s+yeast)?\b', re.IGNORECASE)

# C11 Coopers Pure Brewers
PAT_COOPERS = re.compile(r'coopers?\s+(?:brewery\s+)?pure\s+brewers?(?:\s+yeast)?', re.IGNORECASE)

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

# =============================================================================
# STEP 1 — V27 baseline dogrulama
# =============================================================================
print('=== STEP 1 — V27 baseline ===', flush=True)
size = os.path.getsize(V27)
print(f'V27 boyut: {size} (beklenen {V27_EXPECTED_SIZE})')
if size != V27_EXPECTED_SIZE:
    raise SystemExit(f'V27 BOYUT SAPMASI: {size} != {V27_EXPECTED_SIZE}, BUILD IPTAL')
print('V27 sha256 hesaplaniyor...')
h = hashlib.sha256()
with open(V27, 'rb') as f:
    while True:
        c = f.read(8 * 1024 * 1024)
        if not c: break
        h.update(c)
v27_sha_pre = h.hexdigest()
print(f'V27 sha256 pre: {v27_sha_pre}')
if v27_sha_pre != V27_BASELINE_SHA256:
    raise SystemExit(f'V27 SHA256 SAPMASI, BUILD IPTAL')
print('V27 baseline dogrulandi.')

# =============================================================================
# STEP 2 — Build V28b (UNION default + 10 targeted exception)
# =============================================================================
print('\n=== STEP 2 — V28b build ===', flush=True)
t0 = time.time()

total = 0
exception_applied = {
    'C2_wheat_kolsch_1to0': 0,
    'C2_stout_kolsch_1to0': 0,
    'C3_belle_saison_belgian_1to0': 0,
    'C4_bell_oberon_loose_only_1to0': 0,
    'C5_mauri_space_german_lager_0to1': 0,
    'C7_neobritannia_english_0to1': 0,
    'C8_norcal_american_0to1': 0,
    'C9_muntons_pg_american_0to1': 0,
    'C10_lalbrew_diamond_german_lager_0to1': 0,
    'C11_coopers_american_0to1': 0,
}
samples_per_sub = {k: [] for k in exception_applied}
non_C_drift = 0  # tek drift guard

with open(V27, 'rb') as fin, open(V28B, 'w', encoding='utf-8') as fout:
    fout.write('{"recipes":[')
    parser = ijson.items(fin, 'recipes.item', use_float=True)
    first = True
    for r in parser:
        total += 1
        yeast_str = (r.get('raw', {}) or {}).get('yeast', '') or ''
        feats = r.get('features', {}) or {}
        slug = r.get('bjcp_slug') or ''
        cluster = SLUG_TO_CLUSTER.get(slug, 'other')

        v27_vals = {fk: int(feats.get(fk, 0) or 0) for fk in YEAST_FEATS}
        v28_vals = dict(v27_vals)  # DEFAULT UNION

        # Pattern hits (cache for reuse)
        has_kolsch = bool(PAT_KOLSCH.search(yeast_str))
        has_belle_saison = bool(PAT_BELLE_SAISON.search(yeast_str))
        has_bell_loose = bool(PAT_BELL_LOOSE.search(yeast_str))
        has_bell_strict = bool(PAT_BELL_STRICT.search(yeast_str))
        has_mauri_space = bool(PAT_MAURI_SPACE.search(yeast_str))
        has_mauri_nospace = bool(PAT_MAURI_NOSPACE.search(yeast_str))
        has_mauri_lager_ctx = bool(PAT_MAURI_LAGER_CONTEXT.search(yeast_str))
        has_neobritannia = bool(PAT_NEOBRITANNIA.search(yeast_str))
        has_norcal = bool(PAT_NORCAL.search(yeast_str))
        has_muntons_pg = bool(PAT_MUNTONS_PG.search(yeast_str))
        has_lalbrew = bool(PAT_LALBREW.search(yeast_str))
        has_coopers = bool(PAT_COOPERS.search(yeast_str))

        # === C2 Kolsch overflow (wheat + stout) ===
        has_C2_wheat = (has_kolsch and v27_vals['yeast_wheat_german'] == 1 and v27_vals['yeast_kolsch'] == 1)
        has_C2_stout = (has_kolsch and cluster == 'stout' and v27_vals['yeast_kolsch'] == 1)
        if has_C2_wheat:
            v28_vals['yeast_kolsch'] = 0
            exception_applied['C2_wheat_kolsch_1to0'] += 1
            if len(samples_per_sub['C2_wheat_kolsch_1to0']) < 10:
                samples_per_sub['C2_wheat_kolsch_1to0'].append({'id': r.get('id'), 'slug': slug, 'cluster': cluster, 'raw_yeast': yeast_str[:200]})
        if has_C2_stout and not has_C2_wheat:  # double-count engeli
            v28_vals['yeast_kolsch'] = 0
            exception_applied['C2_stout_kolsch_1to0'] += 1
            if len(samples_per_sub['C2_stout_kolsch_1to0']) < 10:
                samples_per_sub['C2_stout_kolsch_1to0'].append({'id': r.get('id'), 'slug': slug, 'cluster': cluster, 'raw_yeast': yeast_str[:200]})

        # === C3 Belle saison kaldirma (yeast_belgian'dan) ===
        has_C3 = (has_belle_saison and v27_vals['yeast_belgian'] == 1)
        if has_C3:
            v28_vals['yeast_belgian'] = 0
            exception_applied['C3_belle_saison_belgian_1to0'] += 1
            if len(samples_per_sub['C3_belle_saison_belgian_1to0']) < 10:
                samples_per_sub['C3_belle_saison_belgian_1to0'].append({'id': r.get('id'), 'slug': slug, 'cluster': cluster, 'raw_yeast': yeast_str[:200]})

        # === C4 Bell oberon strict (loose AND NOT strict) ===
        has_C4 = (has_bell_loose and not has_bell_strict and v27_vals['yeast_wheat_german'] == 1)
        if has_C4:
            v28_vals['yeast_wheat_german'] = 0
            exception_applied['C4_bell_oberon_loose_only_1to0'] += 1
            if len(samples_per_sub['C4_bell_oberon_loose_only_1to0']) < 10:
                samples_per_sub['C4_bell_oberon_loose_only_1to0'].append({'id': r.get('id'), 'slug': slug, 'cluster': cluster, 'raw_yeast': yeast_str[:200]})

        # === C5 Mauri brew space (mauri\s+brew var, mauribrew yok, lager kontekst) ===
        has_C5 = (has_mauri_space and not has_mauri_nospace and has_mauri_lager_ctx and v27_vals['yeast_german_lager'] == 0)
        if has_C5:
            v28_vals['yeast_german_lager'] = 1
            exception_applied['C5_mauri_space_german_lager_0to1'] += 1
            if len(samples_per_sub['C5_mauri_space_german_lager_0to1']) < 10:
                samples_per_sub['C5_mauri_space_german_lager_0to1'].append({'id': r.get('id'), 'slug': slug, 'cluster': cluster, 'raw_yeast': yeast_str[:200]})

        # === C6 NO-OP (Cellador erteleme, Adim 18c-1c-7) ===
        # Build bloku yok. BRETT_RE'den cellador pattern Aşama C revize'de cikarildi.

        # === C7 NB Neobritannia (yeast_english 0->1) ===
        has_C7 = (has_neobritannia and v27_vals['yeast_english'] == 0)
        if has_C7:
            v28_vals['yeast_english'] = 1
            exception_applied['C7_neobritannia_english_0to1'] += 1
            if len(samples_per_sub['C7_neobritannia_english_0to1']) < 10:
                samples_per_sub['C7_neobritannia_english_0to1'].append({'id': r.get('id'), 'slug': slug, 'cluster': cluster, 'raw_yeast': yeast_str[:200]})

        # === C8 NorCal #1 (yeast_american 0->1) ===
        has_C8 = (has_norcal and v27_vals['yeast_american'] == 0)
        if has_C8:
            v28_vals['yeast_american'] = 1
            exception_applied['C8_norcal_american_0to1'] += 1
            if len(samples_per_sub['C8_norcal_american_0to1']) < 10:
                samples_per_sub['C8_norcal_american_0to1'].append({'id': r.get('id'), 'slug': slug, 'cluster': cluster, 'raw_yeast': yeast_str[:200]})

        # === C9 Muntons Premium Gold (yeast_american 0->1) ===
        has_C9 = (has_muntons_pg and v27_vals['yeast_american'] == 0 and not has_C8)  # double-count engeli
        if has_C9:
            v28_vals['yeast_american'] = 1
            exception_applied['C9_muntons_pg_american_0to1'] += 1
            if len(samples_per_sub['C9_muntons_pg_american_0to1']) < 10:
                samples_per_sub['C9_muntons_pg_american_0to1'].append({'id': r.get('id'), 'slug': slug, 'cluster': cluster, 'raw_yeast': yeast_str[:200]})

        # === C10 Lalbrew Diamond (yeast_german_lager 0->1) ===
        has_C10 = (has_lalbrew and v27_vals['yeast_german_lager'] == 0 and not has_C5)  # C5 ile collision engeli
        if has_C10:
            v28_vals['yeast_german_lager'] = 1
            exception_applied['C10_lalbrew_diamond_german_lager_0to1'] += 1
            if len(samples_per_sub['C10_lalbrew_diamond_german_lager_0to1']) < 10:
                samples_per_sub['C10_lalbrew_diamond_german_lager_0to1'].append({'id': r.get('id'), 'slug': slug, 'cluster': cluster, 'raw_yeast': yeast_str[:200]})

        # === C11 Coopers Pure Brewers (yeast_american 0->1) ===
        has_C11 = (has_coopers and v27_vals['yeast_american'] == 0 and not has_C8 and not has_C9)  # collision engeli
        if has_C11:
            v28_vals['yeast_american'] = 1
            exception_applied['C11_coopers_american_0to1'] += 1
            if len(samples_per_sub['C11_coopers_american_0to1']) < 10:
                samples_per_sub['C11_coopers_american_0to1'].append({'id': r.get('id'), 'slug': slug, 'cluster': cluster, 'raw_yeast': yeast_str[:200]})

        # === Drift guard (TEK): has_ANY_C=False recetede v28 != v27 olamaz ===
        has_ANY_C = (has_C2_wheat or has_C2_stout or has_C3 or has_C4 or has_C5 or
                     has_C7 or has_C8 or has_C9 or has_C10 or has_C11)
        if not has_ANY_C:
            for fk in YEAST_FEATS:
                if v27_vals[fk] != v28_vals[fk]:
                    non_C_drift += 1

        # Update r.features (sadece 18 yeast feature)
        for fk in YEAST_FEATS:
            feats[fk] = v28_vals[fk]
        r['features'] = feats

        if not first:
            fout.write(',')
        fout.write(json.dumps(r, ensure_ascii=False, default=str))
        first = False

    fout.write(']}')

elapsed = time.time() - t0
print(f'V28b build tamamlandi: {elapsed:.1f}s, {total} recete')

# =============================================================================
# STEP 3 — Build etki buyuklugu kontrol (5000 esik)
# =============================================================================
total_exception = sum(exception_applied.values())
print(f'\n=== STEP 3 — Build etki kontrol ===')
print(f'Toplam exception: {total_exception} (esik 5000)')
build_etki_anomali = total_exception > 5000

if build_etki_anomali:
    print(f'BUILD ETKI ANOMALI: {total_exception} > 5000. V28b SILINIYOR.')
    # Audit raporu yaz (anomali kayit)
    with open(AUDIT, 'w', encoding='utf-8') as f:
        json.dump({
            'meta': {'sprint': 'Adim 18c-1c-5d V28b (build etki anomali)', 'total_recipes': total},
            'anomali': True,
            'total_exception': total_exception,
            'exception_applied': exception_applied,
            'non_C_drift': non_C_drift,
        }, f, ensure_ascii=False, indent=2)
    # V28b dataset SIL
    if os.path.exists(V28B):
        os.remove(V28B)
        print(f'V28b dataset silindi: {V28B}')
    raise SystemExit(f'Build etki >5000, KAAN ONAYI BEKLE. Audit: {AUDIT}')

# =============================================================================
# STEP 4 — V27 sha256 yeniden (write acilmadi mi)
# =============================================================================
print('\n=== STEP 4 — V27 sha256 yeniden ===')
h2 = hashlib.sha256()
with open(V27, 'rb') as f:
    while True:
        c = f.read(8 * 1024 * 1024)
        if not c: break
        h2.update(c)
v27_sha_post = h2.hexdigest()
v27_intact = (v27_sha_post == V27_BASELINE_SHA256)
print(f'V27 sha256 post: {v27_sha_post}')
print(f'V27 dokunulmadi: {v27_intact}')

# =============================================================================
# STEP 5 — V28b metric
# =============================================================================
print('\n=== STEP 5 — V28b metric ===')
v28_size = os.path.getsize(V28B)
h3 = hashlib.sha256()
with open(V28B, 'rb') as f:
    while True:
        c = f.read(8 * 1024 * 1024)
        if not c: break
        h3.update(c)
v28_sha = h3.hexdigest()
print(f'V28b boyut: {v28_size}')
print(f'V28b sha256: {v28_sha}')

# =============================================================================
# STEP 6 — Audit raporu
# =============================================================================
audit = {
    'meta': {
        'sprint': 'Adim 18c-1c-5d V28b TEK BUILD (10 pattern)',
        'build_seconds': round(elapsed, 1),
        'total_recipes': total,
        'karar_x_kural_4_5': {
            'drift_guard': 'TEK (has_ANY_C=False recetede drift, V28a deneyimi referansi)',
            'cross_pattern_collision': 'idempotent + sayim double-count engeli (has_C8/C9/C11 yeast_american 0->1)',
            'c2_stout_yeast_stout_yok': 'cluster=stout V19 SLUG_TO_CLUSTER proxy',
            'c5_lager_kontekst': 'parser line 266 ile ayni regex',
            'c6_no_op': 'Cellador erteleme, Adim 18c-1c-7',
        },
    },
    'v27_baseline_check': {
        'pre_build_sha256': v27_sha_pre,
        'post_build_sha256': v27_sha_post,
        'intact': v27_intact,
    },
    'v28b_metric': {
        'path': V28B,
        'size_bytes': v28_size,
        'sha256': v28_sha,
        'recipe_count': total,
    },
    'exception_applied': exception_applied,
    'total_exception': total_exception,
    'non_C_drift': non_C_drift,
    'samples': samples_per_sub,
    'anomali_check': {
        'build_etki_buyuklugu': total_exception,
        'build_etki_esik': 5000,
        'build_etki_anomali': build_etki_anomali,
        'drift_anomali': non_C_drift > 0,
    },
}

with open(AUDIT, 'w', encoding='utf-8') as f:
    json.dump(audit, f, ensure_ascii=False, indent=2)

print('\n=== AUDIT RAPORU ===')
print(f'Toplam exception: {total_exception}')
print(f'non_C_drift: {non_C_drift} (beklenen 0)')
print('Per pattern exception:')
for k, v in exception_applied.items():
    print(f'  {k}: {v}')
print(f'\nAudit raporu: {AUDIT}')
