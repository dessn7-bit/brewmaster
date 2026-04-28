#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Adım 53 Faz B-1 — rmwoods dataset parse → V15 format (intermediate).

KRİTİK SCHEMA NOTU (debug sonrası):
- ingredients/table denormalized wide: her row'da ferm_/hop_/misc_/yeast_ AYRI alanlar
- Bir row birden fazla ingredient type taşıyabilir (örn. row 0: ferm+hop+misc+yeast hepsi dolu)
- FK: 'id' (recipe index'ine bağ); core'da reset_index sonrası 'index' veya 'id' olur
- Her type için bağımsız filtre: name notna + (amount notna or > 0)
"""
import h5py
import pandas as pd
import pickle
import json
import os
import time
import warnings
warnings.filterwarnings('ignore')

ROOT = 'C:/Users/Kaan/brewmaster/external/_rmwoods_dataset'
OUT_DIR = 'C:/Users/Kaan/brewmaster/working'
os.makedirs(OUT_DIR, exist_ok=True)

import sys
sys.stdout.reconfigure(line_buffering=True)
print('Python:', sys.version.split()[0], '| pandas:', pd.__version__, '| h5py:', h5py.__version__, flush=True)


def t():
    return time.time()


T0 = t()

# 1. Pickle maps
print('\n[1] Loading pickle maps...')
with open(f'{ROOT}/fermmap.pickle', 'rb') as f: ferm_map = pickle.load(f)
with open(f'{ROOT}/hopmap.pickle', 'rb') as f: hop_map = pickle.load(f)
with open(f'{ROOT}/yeastmap.pickle', 'rb') as f: yeast_map = pickle.load(f)
with open(f'{ROOT}/miscmap.pickle', 'rb') as f: misc_map = pickle.load(f)
print(f'  ferm_map: {len(ferm_map)}, hop_map: {len(hop_map)}, yeast_map: {len(yeast_map)}, misc_map: {len(misc_map)}')


def map_ingredient(name, mapping):
    if name is None or pd.isna(name):
        return None
    s = str(name).strip().lower()
    return mapping.get(s, s)


# 2. core/table
print(f'\n[2] Loading core/table... ({t() - T0:.1f}s)')
df_core = pd.read_hdf(f'{ROOT}/all_recipes.h5', key='core')
df_core = df_core.reset_index()
core_id_col = 'id' if 'id' in df_core.columns else 'index'
print(f'  core: {len(df_core)} rows, id_col={core_id_col!r}, columns: {list(df_core.columns)}  ({t() - T0:.1f}s)')

# Decode bytes/object columns to clean str
str_cols_core = ['brewer', 'name', 'origin', 'recipe_file', 'style_category', 'style_guide', 'style_name']
for c in str_cols_core:
    if c in df_core.columns:
        df_core[c] = df_core[c].astype(str)

# 3. ingredients/table
print(f'\n[3] Loading ingredients/table... ({t() - T0:.1f}s)')
df_ing = pd.read_hdf(f'{ROOT}/all_recipes.h5', key='ingredients')
df_ing = df_ing.reset_index()
ing_fk = 'id' if 'id' in df_ing.columns else 'index'
print(f'  ingredients: {len(df_ing)} rows, fk={ing_fk!r}  ({t() - T0:.1f}s)')

# 4. Per-type filter (bağımsız, exclusive değil)
print(f'\n[4] Filter per-type (independent)... ({t() - T0:.1f}s)')

ferm_rows = df_ing[df_ing['ferm_name'].notna() & (df_ing['ferm_amount'] > 0)]
hop_rows = df_ing[df_ing['hop_name'].notna() & (df_ing['hop_amount'] > 0)]
yeast_rows = df_ing[df_ing['yeast_name'].notna()]
misc_rows = df_ing[df_ing['misc_name'].notna()]

n_recipes = len(df_core)
print(f'  ferm rows:  {len(ferm_rows):>8d}  (avg/recipe: {len(ferm_rows)/n_recipes:.2f})')
print(f'  hop rows:   {len(hop_rows):>8d}  (avg/recipe: {len(hop_rows)/n_recipes:.2f})')
print(f'  yeast rows: {len(yeast_rows):>8d}  (avg/recipe: {len(yeast_rows)/n_recipes:.2f})')
print(f'  misc rows:  {len(misc_rows):>8d}  (avg/recipe: {len(misc_rows)/n_recipes:.2f})  ({t() - T0:.1f}s)')


# 5. Build per-recipe ingredient dicts
print(f'\n[5] Building per-recipe ingredient lists... ({t() - T0:.1f}s)')

def safe_float(v):
    return float(v) if pd.notna(v) else None


def safe_str(v):
    return str(v) if pd.notna(v) else None


def build_dict(rows, fk_col, builder):
    """Vectorized: select needed cols, to_dict orient=records, group by fk."""
    out = {}
    records = rows.to_dict('records')
    for r in records:
        fk = int(r[fk_col])
        out.setdefault(fk, []).append(builder(r))
    return out


print('  Building ferm dict...', flush=True)
ferm_cols = [ing_fk, 'ferm_name', 'ferm_amount', 'ferm_color', 'ferm_type', 'ferm_potential']
recipe_ferm = build_dict(
    ferm_rows[ferm_cols], ing_fk,
    lambda r: {
        'name': map_ingredient(r['ferm_name'], ferm_map),
        'name_original': safe_str(r['ferm_name']),
        'amount_kg': safe_float(r['ferm_amount']),
        'color': safe_float(r['ferm_color']),
        'type': safe_str(r['ferm_type']),
        'potential': safe_float(r['ferm_potential']),
    }
)
print(f'    ferm dict: {len(recipe_ferm)} recipes  ({t() - T0:.1f}s)', flush=True)

print('  Building hop dict...', flush=True)
hop_cols = [ing_fk, 'hop_name', 'hop_amount', 'hop_alpha', 'hop_time', 'hop_use', 'hop_form']
recipe_hop = build_dict(
    hop_rows[hop_cols], ing_fk,
    lambda r: {
        'name': map_ingredient(r['hop_name'], hop_map),
        'name_original': safe_str(r['hop_name']),
        'amount_g': float(r['hop_amount']) * 1000,
        'alpha': safe_float(r['hop_alpha']),
        'time_min': safe_float(r['hop_time']),
        'use': safe_str(r['hop_use']),
        'form': safe_str(r['hop_form']),
    }
)
print(f'    hop dict: {len(recipe_hop)} recipes  ({t() - T0:.1f}s)', flush=True)

print('  Building yeast dict...', flush=True)
yeast_cols = [ing_fk, 'yeast_name', 'yeast_laboratory', 'yeast_product_id', 'yeast_type',
              'yeast_attenuation', 'yeast_form']
recipe_yeast = build_dict(
    yeast_rows[yeast_cols], ing_fk,
    lambda r: {
        'name': map_ingredient(r['yeast_name'], yeast_map),
        'name_original': safe_str(r['yeast_name']),
        'lab': safe_str(r['yeast_laboratory']),
        'product_id': safe_str(r['yeast_product_id']),
        'type': safe_str(r['yeast_type']),
        'attenuation': safe_float(r['yeast_attenuation']),
        'form': safe_str(r['yeast_form']),
    }
)
print(f'    yeast dict: {len(recipe_yeast)} recipes  ({t() - T0:.1f}s)', flush=True)

print('  Building misc dict...', flush=True)
misc_cols = [ing_fk, 'misc_name', 'misc_amount', 'misc_use', 'misc_time']
recipe_misc = build_dict(
    misc_rows[misc_cols], ing_fk,
    lambda r: {
        'name': map_ingredient(r['misc_name'], misc_map),
        'name_original': safe_str(r['misc_name']),
        'amount': safe_float(r['misc_amount']),
        'use': safe_str(r['misc_use']),
        'time_min': safe_float(r['misc_time']),
    }
)
print(f'    misc dict: {len(recipe_misc)} recipes  ({t() - T0:.1f}s)', flush=True)


# 6. Save intermediate
out_path = f'{OUT_DIR}/_rmwoods_b1_parsed.pickle'
print(f'\n[6] Saving intermediate parsed dict → {out_path}...')

core_fields = [core_id_col, 'batch_size', 'boil_time', 'brewer', 'efficiency', 'name', 'origin',
               'recipe_file', 'src_abv', 'src_color', 'src_fg', 'src_ibu', 'src_og',
               'style_category', 'style_guide', 'style_name']
core_fields = [c for c in core_fields if c in df_core.columns]

intermediate = {
    'core_records': df_core[core_fields].to_dict('records'),
    'core_id_col': core_id_col,
    'recipe_ferm': recipe_ferm,
    'recipe_hop': recipe_hop,
    'recipe_yeast': recipe_yeast,
    'recipe_misc': recipe_misc,
}
with open(out_path, 'wb') as f:
    pickle.dump(intermediate, f, protocol=pickle.HIGHEST_PROTOCOL)
size_mb = os.path.getsize(out_path) / (1024 * 1024)
print(f'  saved {size_mb:.0f} MB  ({t() - T0:.1f}s)')


# 7. Statistics
print(f'\n[7] Statistics ({t() - T0:.1f}s):')
print(f'  Total recipes (core): {n_recipes}')
print(f'  Recipes with ferm:    {len(recipe_ferm)} ({100*len(recipe_ferm)/n_recipes:.1f}%)')
print(f'  Recipes with hop:     {len(recipe_hop)} ({100*len(recipe_hop)/n_recipes:.1f}%)')
print(f'  Recipes with yeast:   {len(recipe_yeast)} ({100*len(recipe_yeast)/n_recipes:.1f}%)')
print(f'  Recipes with misc:    {len(recipe_misc)} ({100*len(recipe_misc)/n_recipes:.1f}%)')

# Origin breakdown
print(f'\n  Origin breakdown:')
origin_counts = df_core['origin'].value_counts()
for src, c in origin_counts.head(20).items():
    print(f'    {str(src)[:40]:40s} {c}')

# Style guide
print(f'\n  Style guide (top 10):')
sg_counts = df_core['style_guide'].value_counts()
for sg, c in sg_counts.head(10).items():
    print(f'    {str(sg)[:40]:40s} {c}')

# src_* NaN
print(f'\n  src_* NaN oranı:')
for col in ['src_abv', 'src_og', 'src_fg', 'src_ibu', 'src_color']:
    if col in df_core.columns:
        nan_pct = df_core[col].isna().mean() * 100
        print(f'    {col}: {nan_pct:.1f}%')

print(f'\n[DONE] Faz B-1 tamam ({t() - T0:.0f}s = {(t() - T0)/60:.1f} dk)')
