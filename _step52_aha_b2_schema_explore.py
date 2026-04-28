#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""B-2 ilk adım — mevcut iki sample body parse et, AHA HTML schema çıkar."""
import re
import json
from collections import Counter

try:
    from bs4 import BeautifulSoup
except ImportError:
    import subprocess, sys
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-q', 'beautifulsoup4', 'lxml'])
    from bs4 import BeautifulSoup


def explore(html_path, label):
    with open(html_path, 'r', encoding='utf-8') as f:
        html = f.read()
    soup = BeautifulSoup(html, 'lxml')
    print('=' * 70)
    print(f'=== {label} ({html_path}, {len(html)} chars) ===')
    print('=' * 70)

    # Title
    t = soup.find('title')
    print(f'<title>: {t.get_text() if t else "?"}')

    # Recipe-specific class containers
    print('\n-- Probable recipe containers --')
    for sel in ['.recipe-content', '.aha-recipe', '.recipe-body',
                'article.recipe', '.recipe-card', '.entry-content',
                '[class*="recipe"]', 'div[itemtype*="Recipe"]']:
        items = soup.select(sel)
        if items:
            print(f'  {sel}: {len(items)} matches')

    # Definition lists (often used for OG/FG/IBU/SRM)
    print('\n-- <dl> definition lists --')
    for i, dl in enumerate(soup.find_all('dl')):
        dts = dl.find_all('dt')
        if dts:
            print(f'  dl #{i}: {[d.get_text().strip()[:30] for d in dts[:8]]}')

    # Tables (sometimes specs)
    print('\n-- <table> contents --')
    for i, tbl in enumerate(soup.find_all('table')[:5]):
        rows = tbl.find_all('tr')[:3]
        print(f'  table #{i}: {len(tbl.find_all("tr"))} rows')
        for r in rows:
            cells = [c.get_text().strip()[:30] for c in r.find_all(['td', 'th'])]
            if cells:
                print(f'    {cells}')

    # Strong/em labels — "Style:", "OG:", "IBU:" patterns
    print('\n-- Inline label patterns ("Style:", "OG:", etc) --')
    for label_re in [r'Style\s*:', r'\bOG\b', r'\bFG\b', r'\bIBU\b', r'\bSRM\b', r'\bABV\b',
                      r'Yeast\s*:', r'\bMalt(s)?\b', r'\bHop(s)?\b', r'Batch\s*Size']:
        m = re.search(label_re + r'[\s\S]{0,80}', html, re.I)
        if m:
            snippet = m.group(0)[:120].replace('\n', ' ').replace('\t', ' ')
            print(f'  /{label_re}/  → "{snippet}"')

    # Headers (h1-h4)
    print('\n-- Headers (h1-h4) --')
    for h in soup.find_all(['h1', 'h2', 'h3', 'h4'])[:20]:
        txt = h.get_text().strip()[:60]
        if txt:
            print(f'  <{h.name}> {txt}')

    # Schema.org Recipe (microdata)
    schema_recipe = soup.find(attrs={'itemtype': re.compile(r'Recipe', re.I)})
    print(f'\nSchema.org Recipe microdata: {"YES" if schema_recipe else "no"}')
    json_ld = soup.find_all('script', type='application/ld+json')
    print(f'JSON-LD <script>: {len(json_ld)} found')
    for s in json_ld[:2]:
        try:
            d = json.loads(s.string or '{}')
            if isinstance(d, dict):
                print(f'  JSON-LD type: {d.get("@type", "?")}')
            elif isinstance(d, list):
                for it in d:
                    print(f'  JSON-LD type: {it.get("@type", "?")}')
        except Exception as e:
            print(f'  JSON-LD parse fail: {e}')

    # Find specific sections by text content
    print('\n-- Sections containing key phrases --')
    for phrase in ['Specifications', 'Ingredients', 'Directions', 'Style', 'Brewer',
                   'Awards', 'Batch Size', 'Original Gravity', 'Final Gravity']:
        # Find first element containing this phrase
        elements = soup.find_all(string=re.compile(re.escape(phrase), re.I))
        if elements:
            parent = elements[0].parent if hasattr(elements[0], 'parent') else None
            tag = parent.name if parent else '?'
            following = ''
            if parent and parent.find_next_sibling():
                following = parent.find_next_sibling().get_text()[:80].replace('\n', ' ')
            print(f'  "{phrase}" in <{tag}>, next sibling: "{following}"')

    # Check for "member-only" / "locked" flags more carefully
    locked_indicators = soup.find_all(attrs={'class': re.compile(r'locked|members?-?only|paywall', re.I)})
    print(f'\nElements with "locked"/"member-only"/"paywall" class: {len(locked_indicators)}')
    for el in locked_indicators[:3]:
        print(f'  <{el.name} class="{el.get("class")}"> {el.get_text()[:60]}')


for label, path in [('PUBLIC_REF (Ruddles)', '_aha_public_ref_body.html'),
                    ('SUSPECT (Flanders Brown)', '_aha_suspect_body.html')]:
    explore(path, label)
    print()
