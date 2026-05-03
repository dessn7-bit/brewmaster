"""
Adim 18d-pre P2 — pattern matrisi (V28d read-only).

Her aday pattern icin:
- regex
- hedef yeast feature
- V28d'de match count
- mevcut hedef flag=0 reçete sayisi (beklenen yeni 0->1 flag)
- 5 sample raw.yeast (200 char) + mevcut flag durumu
- cluster dagilim
"""
import ijson, json, hashlib, sys, time, re
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

V28D = 'working/_v28d_aliased_dataset.json'
SHA = 'efa0115a91fc3b571e529c58f3e5c48c325ab3647ef7a881da7cb637710c199f'

SLUG_TO_CLUSTER = {
    'american_brown_ale':'brown_ale','mild':'brown_ale','brown_ale':'brown_ale',
    'irish_red_ale':'brown_ale','scottish_export':'brown_ale',
    'american_amber_red_ale':'brown_ale','german_altbier':'brown_ale',
    'french_biere_de_garde':'brown_ale',
    'german_doppelbock':'bock','german_heller_bock_maibock':'bock',
    'german_bock':'bock','dunkles_bock':'bock',
    'american_india_pale_ale':'ipa','double_ipa':'ipa',
    'british_india_pale_ale':'ipa','black_ipa':'ipa','white_ipa':'ipa',
    'red_ipa':'ipa','rye_ipa':'ipa','juicy_or_hazy_india_pale_ale':'ipa',
    'belgian_ipa':'ipa',
    'american_lager':'lager','german_maerzen':'lager','common_beer':'lager',
    'vienna_lager':'lager','munich_helles':'lager','pale_lager':'lager',
    'dortmunder_european_export':'lager','bamberg_maerzen_rauchbier':'lager',
    'kellerbier':'lager','german_oktoberfest_festbier':'lager',
    'german_schwarzbier':'lager_dark','munich_dunkel':'lager_dark',
    'american_pale_ale':'pale_ale','english_pale_ale':'pale_ale',
    'blonde_ale':'pale_ale','american_cream_ale':'pale_ale',
    'german_koelsch':'pale_ale','extra_special_bitter':'pale_ale',
    'special_bitter_or_best_bitter':'pale_ale','ordinary_bitter':'pale_ale',
    'cream_ale':'pale_ale','golden_or_blonde_ale':'pale_ale',
    'german_pilsener':'pilsner','pre_prohibition_lager':'pilsner',
    'robust_porter':'porter','brown_porter':'porter',
    'baltic_porter':'porter','porter':'porter',
    'french_belgian_saison':'saison','specialty_saison':'saison',
    'berliner_weisse':'sour','flanders_red_ale':'sour','belgian_lambic':'sour',
    'belgian_fruit_lambic':'sour','oud_bruin':'sour',
    'mixed_fermentation_sour_beer':'sour','gose':'sour',
    'belgian_gueuze':'sour','brett_beer':'sour',
    'specialty_beer':'specialty','herb_and_spice_beer':'specialty',
    'fruit_beer':'specialty','winter_seasonal_beer':'specialty',
    'smoked_beer':'specialty','experimental_beer':'specialty',
    'american_imperial_stout':'stout','stout':'stout','oatmeal_stout':'stout',
    'sweet_stout':'stout','irish_dry_stout':'stout','export_stout':'stout',
    'sweet_stout_or_cream_stout':'stout',
    'belgian_tripel':'strong_ale','belgian_strong_dark_ale':'strong_ale',
    'american_barley_wine_ale':'strong_ale','scotch_ale_or_wee_heavy':'strong_ale',
    'belgian_strong_golden':'strong_ale','old_ale':'strong_ale',
    'british_barley_wine_ale':'strong_ale','american_strong_pale_ale':'strong_ale',
    'belgian_quadrupel':'strong_ale','belgian_blonde_ale':'strong_ale',
    'belgian_dubbel':'strong_ale',
    'american_barleywine':'strong_ale',
    'american_wheat_ale':'wheat','south_german_hefeweizen':'wheat',
    'south_german_dunkel_weizen':'wheat','south_german_weizenbock':'wheat',
    'german_rye_ale':'wheat','belgian_witbier':'wheat',
}

# Aday pattern'ler (taxonomy belirsizler '?' ile isaretli, Kaan onayi bekler)
PATTERNS = [
    # WHEAT — yeast_witbier hedefli
    {'id':'WIT_WLP410','target':'yeast_witbier','regex':r'wlp\s*0?410\b','kaynak':'WLP410 Belgian Wit II (White Labs datasheet)','tax':'kesin'},
    {'id':'WIT_WLP4015','target':'yeast_witbier','regex':r'wlp\s*0?4015\b','kaynak':'WLP4015 Classic Wit (White Labs)','tax':'kesin'},
    {'id':'WIT_M21','target':'yeast_witbier','regex':r'\bm[\s\-]?21\b|mangrove\s+jacks?\s+belgian\s+wit|mj\s+belgian\s+wit','kaynak':'Mangrove Jacks M21 Belgian Wit','tax':'kesin'},
    {'id':'WIT_LALBREW','target':'yeast_witbier','regex':r'lalbrew\s+wit\b','kaynak':'Lalbrew Wit Lallemand','tax':'kesin'},
    {'id':'WIT_IMPERIAL_B44','target':'yeast_witbier','regex':r'\bb[\s\-]?44\b|imperial\s+witbier','kaynak':'Imperial B44 Witbier','tax':'kesin'},
    {'id':'WIT_MUNICH_CLASSIC','target':'yeast_witbier_OR_wheat_german','regex':r'munich\s+classic','kaynak':'Lallemand Munich Classic','tax':'BELIRSIZ — currently in yeast_wheat_german pattern, witbier mi?'},

    # WHEAT — Wyeast 3942
    {'id':'WHEAT_3942','target':'yeast_witbier_OR_wheat_german','regex':r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?3942\b|\b3942\b','kaynak':'Wyeast 3942 Belgian Wheat','tax':'BELIRSIZ — Belgian Wheat: witbier mi wheat_german mi?'},

    # LAGER — Cry Havoc
    {'id':'LAGER_WLP862','target':'yeast_german_lager_OR_yeast_american','regex':r'wlp\s*0?862\b|cry\s+havoc','kaynak':'WLP862 Cry Havoc Lager (White Labs, lager-ale crossover)','tax':'BELIRSIZ — Cry Havoc lager OR ale?'},

    # SOUR — yeast_sour_blend hedefli
    {'id':'SOUR_WLP630','target':'yeast_sour_blend','regex':r'wlp\s*0?630\b|berliner\s+weisse\s+blend','kaynak':'WLP630 Berliner Weisse Blend','tax':'kesin'},
    {'id':'SOUR_WLP655','target':'yeast_sour_blend','regex':r'wlp\s*0?655\b','kaynak':'WLP655 Belgian Sour Blend','tax':'kesin'},
    {'id':'SOUR_WLP670','target':'yeast_sour_blend','regex':r'wlp\s*0?670\b','kaynak':'WLP670 American Farmhouse Blend','tax':'kesin'},
    {'id':'SOUR_3191','target':'yeast_sour_blend','regex':r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?3191\b|\b3191\b','kaynak':'Wyeast 3191 Berliner Blend','tax':'kesin'},
    {'id':'SOUR_ECY02','target':'yeast_brett_AND_sour_blend','regex':r'ecy\s*0?2\b|ecy[\s\-]?02|flemish\s+ale\s+blend','kaynak':'East Coast Yeast ECY02 Flemish Ale','tax':'kesin (mixed-ferm)'},
    {'id':'SOUR_3278','target':'yeast_sour_blend','regex':r'\b(?:wyeast|wy)\s*[\#\.]?\s*0?3278\b|\b3278\b','kaynak':'Wyeast 3278 Lambic Blend','tax':'kesin'},

    # GENEL — multi-cluster, en buyuk C2 grubu
    {'id':'GEN_VERMONT','target':'yeast_american','regex':r'yeast\s*bay\s*vermont|vermont\s*ale\s*\(?yeast\s*bay|\bvermont\s+ale\b','kaynak':'The Yeast Bay Vermont Ale (Conan strain)','tax':'kesin'},
    {'id':'GEN_EAST_COAST','target':'yeast_american','regex':r'wlp\s*0?072\b|east\s+coast\s+ale','kaynak':'WLP072 East Coast Ale','tax':'kesin'},
    {'id':'GEN_AUSTRALIAN','target':'yeast_english_OR_american','regex':r'wlp\s*0?029\b|australian\s+ale','kaynak':'WLP029 Australian Ale','tax':'BELIRSIZ — Australian taxonomy English mi American mi?'},
    {'id':'GEN_BASTOGNE','target':'yeast_belgian','regex':r'wlp\s*0?510\b|bastogne','kaynak':'WLP510 Bastogne Belgian Ale','tax':'kesin'},
    {'id':'GEN_BELGIAN_BLEND','target':'yeast_belgian','regex':r'wlp\s*0?575\b|belgian\s+style\s+ale\s+blend','kaynak':'WLP575 Belgian Style Ale Blend','tax':'kesin'},
    {'id':'GEN_CREAM_BLEND','target':'yeast_american','regex':r'wlp\s*0?080\b|cream\s+ale\s+(yeast\s+)?blend','kaynak':'WLP080 Cream Ale Yeast Blend','tax':'kesin'},
    {'id':'GEN_BURTON_UNION','target':'yeast_english','regex':r'mj\s*burton|burton\s+union\s*\(?\s*mj','kaynak':'Mangrove Jacks Burton Union','tax':'kesin'},
    {'id':'GEN_T58','target':'yeast_belgian_OR_abbey','regex':r'safbrew\s+t[\s\-]?58\b|\bt[\s\-]?58\b','kaynak':'Fermentis Safbrew T-58 (Belgian Trappist)','tax':'BELIRSIZ — yeast_belgian mi yeast_abbey mi?'},
    {'id':'GEN_S33','target':'yeast_belgian_OR_abbey','regex':r'safbrew\s+s[\s\-]?33\b|\bs[\s\-]?33\b','kaynak':'Fermentis Safbrew S-33 (Belgian generic)','tax':'BELIRSIZ — yeast_belgian mi yeast_abbey mi?'},
]

# Mevcut parser pattern'leri (collision check)
EXISTING = {
    'yeast_witbier': re.compile(r'witbier|wlp\s*0?40[01]\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?(3944|3463)\b|\b(3944|3463)\b|hoegaarden|wit\s*ale|wit\s*yeast|forbidden\s+fruit|brewferm\s+blanche', re.IGNORECASE),
    'yeast_wheat_german': re.compile(r'weihenstephan|wlp\s*0?(300|380)\b|\b(?:wyeast|wy)\s*[\#\.]?\s*0?(1010|3056|3068)\b|\b(1010|3056|3068)\b|wb[\s\-]?06|hefeweizen|munich\s*wheat|munich\s+classic|american\s+wheat(\s+ale)?(\s+yeast)?|bavarian\s+wheat(\s+blend)?|danstar\s+munich|lallemand\s+munich(\s+wheat)?|schneider\s*[-\s]?weisse|schneider.tap|bell\'?s?\s+oberon', re.IGNORECASE),
}

def sha(p):
    h = hashlib.sha256()
    with open(p,'rb') as f:
        while True:
            c=f.read(8*1024*1024)
            if not c: break
            h.update(c)
    return h.hexdigest()

print(f'V28d sha pre: {sha(V28D) == SHA}', flush=True)

# Compile patterns
for p in PATTERNS:
    p['_re'] = re.compile(p['regex'], re.IGNORECASE)
    p['match_count'] = 0
    p['match_no_target_flag'] = 0  # hedef flag=0 olan match
    p['cluster_dist'] = Counter()
    p['samples_5'] = []
    p['existing_witbier_overlap'] = 0
    p['existing_wheat_overlap'] = 0

t0 = time.time()
n = 0
with open(V28D,'rb') as fin:
    for r in ijson.items(fin, 'recipes.item', use_float=True):
        n += 1
        raw_yeast = (r.get('raw',{}) or {}).get('yeast','') or ''
        feats = r.get('features',{}) or {}
        slug = r.get('bjcp_slug') or ''
        cluster = SLUG_TO_CLUSTER.get(slug, 'other')

        for p in PATTERNS:
            if p['_re'].search(raw_yeast):
                p['match_count'] += 1
                p['cluster_dist'][cluster] += 1
                tgt = p['target']
                # Hedef flag=0 olanlar (yeni 0->1 olacak)
                if 'witbier' in tgt:
                    if int(feats.get('yeast_witbier',0) or 0) == 0:
                        p['match_no_target_flag'] += 1
                elif 'wheat_german' in tgt and 'witbier' not in tgt:
                    if int(feats.get('yeast_wheat_german',0) or 0) == 0:
                        p['match_no_target_flag'] += 1
                elif 'sour_blend' in tgt:
                    if int(feats.get('yeast_sour_blend',0) or 0) == 0:
                        p['match_no_target_flag'] += 1
                elif 'belgian' in tgt and 'abbey' not in tgt:
                    if int(feats.get('yeast_belgian',0) or 0) == 0:
                        p['match_no_target_flag'] += 1
                elif 'belgian_OR_abbey' in tgt or 'belgian_OR_abbey' in tgt:
                    if int(feats.get('yeast_belgian',0) or 0) == 0 and int(feats.get('yeast_abbey',0) or 0) == 0:
                        p['match_no_target_flag'] += 1
                elif 'german_lager_OR_yeast_american' in tgt:
                    if int(feats.get('yeast_german_lager',0) or 0) == 0 and int(feats.get('yeast_american',0) or 0) == 0:
                        p['match_no_target_flag'] += 1
                elif 'english_OR_american' in tgt:
                    if int(feats.get('yeast_english',0) or 0) == 0 and int(feats.get('yeast_american',0) or 0) == 0:
                        p['match_no_target_flag'] += 1
                elif tgt == 'yeast_american':
                    if int(feats.get('yeast_american',0) or 0) == 0:
                        p['match_no_target_flag'] += 1
                elif tgt == 'yeast_english':
                    if int(feats.get('yeast_english',0) or 0) == 0:
                        p['match_no_target_flag'] += 1

                # Mevcut parser overlap (witbier/wheat_german pattern'i bu raw_yeast'i zaten yakalamis mi?)
                if EXISTING['yeast_witbier'].search(raw_yeast):
                    p['existing_witbier_overlap'] += 1
                if EXISTING['yeast_wheat_german'].search(raw_yeast):
                    p['existing_wheat_overlap'] += 1

                if len(p['samples_5']) < 5:
                    p['samples_5'].append({
                        'id': r.get('id'),
                        'slug': slug,
                        'cluster': cluster,
                        'raw_yeast_first200': raw_yeast[:200],
                        'flag_witbier': int(feats.get('yeast_witbier',0) or 0),
                        'flag_wheat_german': int(feats.get('yeast_wheat_german',0) or 0),
                        'flag_belgian': int(feats.get('yeast_belgian',0) or 0),
                        'flag_abbey': int(feats.get('yeast_abbey',0) or 0),
                        'flag_american': int(feats.get('yeast_american',0) or 0),
                        'flag_english': int(feats.get('yeast_english',0) or 0),
                        'flag_german_lager': int(feats.get('yeast_german_lager',0) or 0),
                        'flag_sour_blend': int(feats.get('yeast_sour_blend',0) or 0),
                        'flag_brett': int(feats.get('yeast_brett',0) or 0),
                    })

elapsed = time.time() - t0
print(f'\nTarama bitti: {n} recete, {elapsed:.1f}s\n', flush=True)

print(f'{"id":22s} {"target":40s} {"match":>6s} {"new_flag":>8s} {"wit_ovr":>7s} {"wheat_ovr":>9s} {"top_cluster":12s}', flush=True)
print('-'*120, flush=True)
for p in PATTERNS:
    top_cluster = p['cluster_dist'].most_common(1)
    top_cl_str = f"{top_cluster[0][0]}({top_cluster[0][1]})" if top_cluster else '-'
    print(f'{p["id"]:22s} {p["target"]:40s} {p["match_count"]:>6d} {p["match_no_target_flag"]:>8d} {p["existing_witbier_overlap"]:>7d} {p["existing_wheat_overlap"]:>9d} {top_cl_str:12s}', flush=True)

# Beklenen toplam yeni 0->1 flag
total_new = sum(p['match_no_target_flag'] for p in PATTERNS)
print(f'\nBeklenen toplam yeni 0->1 flag: {total_new}', flush=True)

# JSON cikti
out = {
    'meta':{
        'sprint':'Adim 18d-pre P2 pattern matrisi',
        'kosul':'V28d read-only sha guard intact',
        'tarama_seconds': round(elapsed,1),
        'recete_total': n,
    },
    'patterns':[
        {
            'id': p['id'],
            'regex': p['regex'],
            'target': p['target'],
            'kaynak': p['kaynak'],
            'tax_durum': p['tax'],
            'match_count': p['match_count'],
            'match_target_flag_zero': p['match_no_target_flag'],
            'existing_witbier_pattern_overlap': p['existing_witbier_overlap'],
            'existing_wheat_german_pattern_overlap': p['existing_wheat_overlap'],
            'cluster_dist_top10': p['cluster_dist'].most_common(10),
            'samples_5': p['samples_5'],
        } for p in PATTERNS
    ],
    'total_expected_new_flag': total_new,
    'belirsiz_taxonomy_sorulari': [
        'WIT_MUNICH_CLASSIC: Munich Classic suanki yeast_wheat_german pattern, witbier mi taşınmalı?',
        'WHEAT_3942: Wyeast 3942 Belgian Wheat — yeast_witbier mi yeast_wheat_german mi?',
        'LAGER_WLP862: WLP862 Cry Havoc — yeast_german_lager mi yeast_american (ale) mi?',
        'GEN_AUSTRALIAN: WLP029 Australian Ale — yeast_english mi yeast_american mi?',
        'GEN_T58: Safbrew T-58 — yeast_belgian mi yeast_abbey mi?',
        'GEN_S33: Safbrew S-33 — yeast_belgian mi yeast_abbey mi?',
    ],
}
with open('working/_step18d_pre_p2_pattern_matrix.json','w',encoding='utf-8') as f:
    json.dump(out,f,ensure_ascii=False,indent=2,default=str)

print(f'\nV28d sha post: {sha(V28D) == SHA}', flush=True)
print(f'Cikti: working/_step18d_pre_p2_pattern_matrix.json', flush=True)
