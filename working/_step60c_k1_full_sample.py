"""
K1 26 recete tam liste — pattern eklemek icin keyword cesitliligi.
"""
import ijson, json, re, sys
sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

V28B = 'working/_v28b_aliased_dataset.json'
SAISON_SLUGS = {'french_belgian_saison', 'specialty_saison', 'french_biere_de_garde'}
PAT_K1 = re.compile(
    r'\blalbrew\s+farmhouse\b|'
    r'\bmangrove\s*jack[\'s]*\s+m\s*29\b|\bm\s*29\b|'
    r'\bbe[\s\-]?134\b|\bbe[\s\-]?256\b|'
    r'\bt[\s\-]?58\s+saison\b|'
    r'\b3711\b|\b3724\b|\b3725\b|\b3726\b|'
    r'\bsuperyeast\s+saison\b|\bgigayeast\s+sps\b|\byeast\s+bay\s+saison\b|\bomega\s+saison\b',
    re.IGNORECASE
)

records = []
with open(V28B, 'rb') as f:
    parser = ijson.items(f, 'recipes.item', use_float=True)
    for r in parser:
        if r.get('bjcp_slug') not in SAISON_SLUGS: continue
        feats = r.get('features', {}) or {}
        if int(feats.get('yeast_saison',0) or 0) != 0: continue
        raw_y = (r.get('raw',{}) or {}).get('yeast','') or ''
        if PAT_K1.search(raw_y):
            records.append({
                'id': r.get('id'),
                'slug': r.get('bjcp_slug'),
                'raw_yeast': raw_y[:200],
            })

print(f'K1 total: {len(records)}')
for s in records:
    print(f"  {s['id']:25s} slug={s['slug']:35s} raw={s['raw_yeast']}")
