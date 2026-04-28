#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""B-2 — JSON-LD parse + Style label kaynak araması."""
import json
import re
from bs4 import BeautifulSoup


def explore(html_path, label):
    print('=' * 70)
    print(f'=== {label} ===')
    with open(html_path, 'r', encoding='utf-8') as f:
        html = f.read()
    soup = BeautifulSoup(html, 'lxml')

    # JSON-LD
    print('\n-- JSON-LD scripts (full content) --')
    for s in soup.find_all('script', type='application/ld+json'):
        try:
            d = json.loads(s.string or '{}')
            print(json.dumps(d, indent=2, ensure_ascii=False)[:1500])
        except Exception as e:
            print(f'  parse fail: {e}')

    # Recipe content area
    print('\n-- Style label kaynağı arama --')
    # 1. Search "Style:" in body content (excluding head/scripts)
    body = soup.find('body')
    if body:
        text = body.get_text()
        m = re.search(r'\bStyle\s*:?\s*([\w &\-\(\)/]{2,60})', text)
        if m:
            print(f'  Body "Style:" match: "{m.group(1)[:60]}"')
    # 2. Recipe-specific spec area
    specs = soup.select('.spec, .recipe-spec, [class*="recipe-spec"]')
    print(f'  .spec elements ({len(specs)}):')
    for s in specs[:15]:
        print(f'    [{s.get("class")}] {s.get_text().strip()[:80]}')
    # 3. .entry-content sub-structure
    print('\n-- .entry-content sub-structure (Ingredients/Specifications/Directions) --')
    entry = soup.select_one('.entry-content')
    if entry:
        # Find all h3/h4 with Ingredients/Specifications/Directions
        sections = {}
        cur = None
        for tag in entry.find_all(['h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li']):
            if tag.name in ('h2', 'h3', 'h4'):
                t = tag.get_text().strip()
                if any(s in t.lower() for s in ['ingredient', 'specification', 'direction', 'style', 'brewer', 'award', 'about']):
                    cur = t
                    sections[cur] = []
                else:
                    cur = None
            elif cur is not None:
                sections[cur].append(tag.get_text().strip()[:200])
        for sec, items in sections.items():
            print(f'  Section: <h*>{sec}</h*>')
            for it in items[:5]:
                if it:
                    print(f'    "{it[:120]}"')

    # 4. Tags/categories (often style/Brewer)
    print('\n-- Categories/Tags (links to /category/, /tag/, /beer-style/) --')
    style_links = soup.find_all('a', href=re.compile(r'/(beer-style|tag|category)/'))
    for l in style_links[:10]:
        print(f'  <a href="{l.get("href")}">{l.get_text().strip()[:50]}</a>')


for label, path in [('PUBLIC_REF (Ruddles)', '_aha_public_ref_body.html'),
                    ('SUSPECT (Flanders Brown)', '_aha_suspect_body.html')]:
    explore(path, label)
    print()
