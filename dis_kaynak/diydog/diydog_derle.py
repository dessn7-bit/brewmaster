# DIY Dog (BrewDog) reçeteleri — alxiw/punkapi v3 verisini OLDUĞU GİBİ alır, yanına yalnız İŞARET (ek) bloğu ekler.
# Kullanım: python3 -I diydog_derle.py <alxiw_punkapi/data klasörü> <MAYALAR.json> <_v7_recipes_diydog.json> <çıktı.json>
# Ham alanlar değiştirilmez (og/fg yer değiştirmesi bile YAPILMAZ — yalnız işaretlenir). Stil adayı = BrewDog'un KENDİ
# metninde (ad + slogan, yoksa açıklama) geçen stil sözcüğü; OG/IBU/SRM'den stil TÜRETİLMEZ (döngüsel etiket olmasın).
import json, glob, re, sys, collections
D, MAYA, V7, OUT = sys.argv[1:5]
V = [json.load(open(f, encoding='utf-8')) for f in sorted(glob.glob(D + '/*.json'))]
M = json.load(open(MAYA, encoding='utf-8'))
n = lambda s: re.sub(r'[^a-z0-9]', '', re.sub(r'™|®', '', str(s).lower()))
idx = {}
for m in M:
    for k in [m['id'], m['ad']] + m.get('alias', []): idx.setdefault(n(k), m['id'])
kod = {}
for m in M:
    for t in re.findall(r'\b(wy|wlp)\s*-?\s*(\d{3,4})\b', (m['id'] + ' ' + m['ad'] + ' ' + ' '.join(m.get('alias', []))).lower()): kod.setdefault(t[0] + t[1], m['id'])
def maya(y):
    if not y: return []
    out = []
    for p in re.split(r'\s*&\s*', y):
        q = n(p)
        if q in idx: out.append(idx[q]); continue
        c = re.search(r'\b(wyeast|wlp)\s*-?\s*(\d{3,4})\b', p.lower())
        k = (('wy' if c.group(1) == 'wyeast' else 'wlp') + c.group(2)) if c else None
        out.append(kod.get(k) if k else next((mid for key, mid in idx.items() if len(q) >= 5 and len(key) >= 5 and (q in key or key in q)), None))
    return out
STIL = [('black_ipa', r'black ipa|india black ale'), ('double_ipa', r'double ipa|imperial ipa|triple ipa|\bdipa\b'), ('session_ipa', r'session ipa'),
        ('neipa', r'new england ipa|\bneipa\b|hazy ipa'), ('red_ipa', r'red ipa'), ('white_ipa', r'white ipa'), ('belgian_ipa', r'belgian ipa'), ('ipa', r'\bipa\b|india pale ale'),
        ('imperial_stout', r'imperial stout'), ('milk_stout', r'milk stout|sweet stout'), ('oatmeal_stout', r'oatmeal stout'), ('stout', r'\bstout\b'),
        ('baltic_porter', r'baltic porter'), ('porter', r'\bporter\b'), ('barleywine', r'barley ?wine'), ('saison', r'\bsaison\b|farmhouse'), ('berliner_weisse', r'berliner'),
        ('gose', r'\bgose\b'), ('witbier', r'\bwit\b|witbier'), ('weizen', r'hefeweizen|weizen|weissbier|wheat beer'), ('tripel', r'\btripel\b|\btripple\b'), ('dubbel', r'\bdubbel\b'),
        ('quadrupel', r'quadrupel|\bquad\b'), ('pilsner', r'\bpils(ner)?\b'), ('helles', r'\bhelles\b'), ('lager', r'\blager\b'), ('red_ale', r'red ale'), ('amber', r'\bamber\b'),
        ('brown_ale', r'brown ale'), ('scotch_ale', r'scotch ale|scoth ale|wee heavy'), ('doppelbock', r'doppelbock'), ('eisbock', r'eisbock'), ('bock', r'\bbock\b'), ('kolsch', r'k[oö]lsch'),
        ('lambic', r'lambic|gueuze|kriek'), ('sour', r'\bsour\b'), ('smoked', r'rauch|smoked'), ('pale_ale', r'pale ale'), ('blonde', r'\bblonde?\b|golden ale'), ('bitter', r'\besb\b|\bbitter\b'), ('old_ale', r'old ale')]
def stil(s):
    s = s.lower(); out = []
    for ad, rx in STIL:
        m = re.search(rx, s)
        if m: out.append([ad, m.group(0)]); s = s[:m.start()] + ' ' + s[m.end():]
    return out
v7 = {n(x['name']): x['source_file'] for x in json.load(open(V7, encoding='utf-8'))['records']}
say = collections.Counter(); R = []
for v in V:
    og, fg, ab = v.get('target_og'), v.get('target_fg'), v.get('abv'); an = []
    if og and fg and fg >= og: an.append('fg_og_ustunde (yer degismis olabilir)')
    if og and fg and og > fg and ab and abs((og - fg) / 1000 * 131.25 - ab) > 1.0: an.append('abv_og_fg_tutarsiz (fark %.1f)' % ((og - fg) / 1000 * 131.25 - ab))
    mt = v['method'].get('mash_temp') or []; ft = (v['method'].get('fermentation') or {}).get('temp', {}).get('value')
    if any((s.get('temp') or {}).get('value') in (0, None) for s in mt): an.append('mash_sicaklik_0_ya_da_bos')
    if ft is None: an.append('fermantasyon_sicaklik_bos')
    elif ft > 40: an.append('fermantasyon_sicaklik_asiri (%s)' % ft)
    if v.get('ebc') and v.get('srm') and abs(v['ebc'] / 1.97 - v['srm']) > 3: an.append('srm_ebc_tutarsiz')
    my = maya(v['ingredients'].get('yeast')); st_b = stil(v['name'] + ' . ' + v['tagline']); st = st_b if st_b else stil(v['description'])
    ek = {'maya_bm': my, 'maya_eslesme': 'tam' if my and all(my) else ('kismi' if any(my) else 'yok'),
          'stil_adayi': st, 'stil_adayi_yeri': 'ad_slogan' if st_b else ('aciklama' if st else None), 'stil_tek': len(st) == 1,
          'anomali': an, 'beerxml_v7_dosya': v7.get(n(v['name']))}
    for a in an: say[a.split(' ')[0]] += 1
    say['maya_' + ek['maya_eslesme']] += 1; say['stil_' + ('tek' if len(st) == 1 else 'cok' if st else 'yok')] += 1; say['beerxml_eslesen' if ek['beerxml_v7_dosya'] else 'beerxml_yok'] += 1
    R.append({'ham': v, 'ek': ek})
meta = {'kaynak': 'github.com/alxiw/punkapi data/*.json (v3; orijinal sammdec/punkapi 2024te kapandı)', 'kaynak_commit': sys.argv[5] if len(sys.argv) > 5 else None,
        'orijin': "BrewDog DIY Dog (BrewDog: 'copy them, tear them to pieces, bastardise them, adapt them' — tüm reçeteler ücretsiz)",
        'kayit': len(R), 'ozet': dict(sorted(say.items())), 'not': 'ham alanlar değiştirilmedi; ek = Claude işaretleri (stil adayı yalnız BrewDog metninden, eğitim etiketi DEĞİL — etiketleme ayrı iş)'}
json.dump({'meta': meta, 'kayitlar': R}, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps(meta, ensure_ascii=False, indent=1))
