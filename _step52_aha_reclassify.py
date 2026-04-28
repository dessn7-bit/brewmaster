#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""B-3 sonrası mapping FIX:
recipe_style_name (recipe-level primary, AHA editor seçimi) →
    Yoast primary → first_valid_term

Bug 7 audit dersi: multi-style first_valid_term yanlış primary seçiyor
(Saison Du Mont → belgian_blonde_ale yanlışı).
"""
import json
import html
import re
from collections import Counter


def slugify(name: str) -> str:
    """AHA recipe_style_name string → AHA slug (taxonomy lookup için)."""
    if not name:
        return ''
    s = html.unescape(name).lower().strip()
    s = re.sub(r'[&]', '', s)            # "Wheat & Rye Beer" → "wheat  rye beer"
    s = re.sub(r'[^a-z0-9]+', '-', s)    # spaces/punct → single hyphen
    s = re.sub(r'-+', '-', s).strip('-')
    return s


def main():
    with open('_aha_recipes_raw.json', 'r', encoding='utf-8') as f:
        raw = json.load(f)
    with open('_aha_recipes_rejected.json', 'r', encoding='utf-8') as f:
        rejected = json.load(f)

    with open('_aha_taxonomy_terms.json', 'r', encoding='utf-8') as f:
        taxonomy = json.load(f)
    id_to_aha = {t['id']: t['slug'] for t in taxonomy}

    with open('_aha_style_to_slug_FINAL.json', 'r', encoding='utf-8') as f:
        mapping = json.load(f)
    aha_to_v15 = {m['aha_slug']: {'v15': m['v15_slug'], 'note': m['note']} for m in mapping}

    # Combine all 1485 records (kept + rejected) for re-classify
    all_recs = raw + [r for r in rejected if 'aha_primary_slug' in r or r.get('reason') == 'unmapped_style' or r.get('reason') == 'drop_non_beer']
    # Note: fetch_exception ones don't have full data — skip them
    fetch_errors = [r for r in rejected if r.get('reason') == 'fetch_exception']
    print(f'Total records to re-classify: {len(all_recs)}')
    print(f'Fetch errors (skipped): {len(fetch_errors)}')

    new_kept = []
    new_rejected = []

    pick_source_stats = Counter()
    changed_count = 0
    saison_examples = []
    pale_ale_examples = []

    for rec in all_recs:
        aha_style_name = rec.get('aha_style_name')  # e.g. "Saison" or "Wheat &amp; Rye Beer"
        beer_style_ids = rec.get('aha_all_style_ids', [])
        # Note: yoast field saklanmadı raw'da, sadece picked_from var

        new_v15 = None
        new_aha_slug = None
        new_picked_from = None
        new_note = None

        # NEW: 1. recipe_style_name → slugify → AHA mapping (if V15 valid)
        if aha_style_name:
            slug_from_name = slugify(aha_style_name)
            if slug_from_name in aha_to_v15:
                m = aha_to_v15[slug_from_name]
                if m['v15'] not in ('DROP', 'unmapped'):
                    new_aha_slug = slug_from_name
                    new_v15 = m['v15']
                    new_note = m['note']
                    new_picked_from = 'recipe_style_name'

        # 2. (Yoast primary skipped — not saved in raw, but pick source 'yoast_primary' indicates was used)
        # Eski algoritmada yoast varsa kullanılmıştı, fix'te recipe_style_name öncelikli

        # 3. First valid V15-mapped term
        if not new_v15:
            for term_id in beer_style_ids:
                aha_slug = id_to_aha.get(term_id)
                if not aha_slug:
                    continue
                m = aha_to_v15.get(aha_slug)
                if not m:
                    continue
                if m['v15'] not in ('DROP', 'unmapped'):
                    new_aha_slug = aha_slug
                    new_v15 = m['v15']
                    new_note = m['note']
                    new_picked_from = 'first_valid_term'
                    break

        # 4. If still nothing, try to record AHA slug from recipe_style_name (for reject reason)
        if not new_aha_slug and aha_style_name:
            new_aha_slug = slugify(aha_style_name)
            if new_aha_slug in aha_to_v15:
                m = aha_to_v15[new_aha_slug]
                new_v15 = m['v15']  # 'DROP' or 'unmapped'
                new_note = m['note']
                new_picked_from = 'recipe_style_name_unmapped'

        # 5. Track changes (compare with old mapping)
        old_v15 = rec.get('v15_slug')
        if old_v15 != new_v15:
            changed_count += 1
            if 'saison' in (aha_style_name or '').lower() and old_v15 == 'belgian_blonde_ale':
                saison_examples.append({
                    'name': rec.get('name', '?')[:50],
                    'aha_style_name': aha_style_name,
                    'old_v15': old_v15,
                    'new_v15': new_v15,
                })
            if (aha_style_name or '').lower() == 'pale ale':
                pale_ale_examples.append({
                    'name': rec.get('name', '?')[:50],
                    'old_v15': old_v15,
                    'new_v15': new_v15,
                })

        # Update record
        rec['v15_slug'] = new_v15
        rec['aha_primary_slug'] = new_aha_slug
        rec['picked_from'] = new_picked_from
        rec['v15_mapping_note'] = new_note

        # Decide kept/rejected
        if new_v15 and new_v15 not in ('DROP', 'unmapped'):
            new_kept.append(rec)
            pick_source_stats[new_picked_from] += 1
        else:
            reason = 'drop_non_beer' if new_v15 == 'DROP' else 'unmapped_style'
            rec['reason'] = reason
            new_rejected.append(rec)

    # Add fetch errors back
    new_rejected.extend(fetch_errors)

    # Stats
    old_kept = len(raw)
    old_rejected = len(rejected) - len(fetch_errors)
    new_kept_count = len(new_kept)
    new_rejected_count = len(new_rejected) - len(fetch_errors)

    print(f'\n=== Re-classify Stats ===')
    print(f'Old:  {old_kept} kept + {old_rejected} rejected (+{len(fetch_errors)} errors)')
    print(f'New:  {new_kept_count} kept + {new_rejected_count} rejected (+{len(fetch_errors)} errors)')
    print(f'Δ kept: {new_kept_count - old_kept:+d}')
    print(f'Records with v15_slug change: {changed_count}')

    print(f'\n=== Pick source distribution (new kept) ===')
    for k, v in pick_source_stats.most_common():
        print(f'  {k}: {v}')

    # Top 25 V15 slug (new)
    sd = Counter(r['v15_slug'] for r in new_kept)
    print(f'\n=== New kept top 25 V15 slug ===')
    for s, c in sd.most_common(25):
        print(f'  {s.ljust(40)} {c}')

    # Saison Du Mont fix verification
    print(f'\n=== Saison fix examples (eski belgian_blonde_ale → yeni V15) ===')
    for ex in saison_examples[:10]:
        print(f'  "{ex["name"]}"  ({ex["aha_style_name"]}): {ex["old_v15"]} → {ex["new_v15"]}')

    # Save
    with open('_aha_recipes_raw.json', 'w', encoding='utf-8') as f:
        json.dump(new_kept, f, indent=2, ensure_ascii=False)
    with open('_aha_recipes_rejected.json', 'w', encoding='utf-8') as f:
        json.dump(new_rejected, f, indent=2, ensure_ascii=False)
    print(f'\n✓ Re-classified data saved (overwrote raw + rejected)')


if __name__ == '__main__':
    main()
