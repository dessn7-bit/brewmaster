#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""rmwoods inspect v3 — pandas read_hdf."""
import pandas as pd
import pickle
import warnings
warnings.filterwarnings('ignore')

ROOT = 'C:/Users/Kaan/Desktop/rmwoods'

# 1. core/table — recipe-level
print('=' * 70)
print('all_recipes.h5 — core (recipe-level)')
print('=' * 70)
df_core = pd.read_hdf(f'{ROOT}/all_recipes.h5', key='core', start=0, stop=10)
print(f'\ncore total rows: ', end='')
# Get full count via store
with pd.HDFStore(f'{ROOT}/all_recipes.h5', 'r') as store:
    print(store.get_storer('core').nrows)
    print(f'ingredients total rows: {store.get_storer("ingredients").nrows}')
print(f'\nColumns: {list(df_core.columns)}')
print(f'\nDtypes:\n{df_core.dtypes}')
print(f'\nFirst 5 rows:')
for col in df_core.columns:
    samples = df_core[col].head(5).tolist()
    samples = [s if not isinstance(s, bytes) else s.decode('utf-8', errors='ignore') for s in samples]
    print(f'  {col:25s} {samples}')

# Origin (source) breakdown — full pass
print(f'\n--- Source breakdown (full 403K pass) ---')
origin_counts = pd.Series(dtype='int64')
chunks_n = 0
for chunk in pd.read_hdf(f'{ROOT}/all_recipes.h5', key='core', columns=['origin'], chunksize=50000, iterator=True):
    chunks_n += 1
    counts = chunk['origin'].value_counts()
    origin_counts = origin_counts.add(counts, fill_value=0)
print('Origin counts:')
for src, c in origin_counts.sort_values(ascending=False).items():
    if isinstance(src, bytes):
        src = src.decode('utf-8', errors='ignore')
    print(f'  {src:30s} {int(c)}')

# Style guide / style name breakdown
print(f'\n--- Style guide breakdown ---')
sg_counts = pd.Series(dtype='int64')
for chunk in pd.read_hdf(f'{ROOT}/all_recipes.h5', key='core', columns=['style_guide'], chunksize=50000, iterator=True):
    counts = chunk['style_guide'].value_counts()
    sg_counts = sg_counts.add(counts, fill_value=0)
for s, c in sg_counts.sort_values(ascending=False).head(10).items():
    if isinstance(s, bytes): s = s.decode('utf-8', errors='ignore')
    print(f'  {s:40s} {int(c)}')

# 2. recipe_vecs.h5
print('\n\n' + '=' * 70)
print('recipe_vecs.h5')
print('=' * 70)
with pd.HDFStore(f'{ROOT}/recipe_vecs.h5', 'r') as store:
    print(f'Keys: {list(store.keys())}')
    print(f'vecs nrows: {store.get_storer("vecs").nrows}')

# 3. Pickle maps
print('\n\n' + '=' * 70)
print('Pickle maps')
print('=' * 70)
for name in ('fermmap', 'hopmap', 'yeastmap', 'miscmap'):
    print(f'\n--- {name}.pickle ---')
    with open(f'{ROOT}/{name}.pickle', 'rb') as f:
        d = pickle.load(f)
    print(f'  Type: {type(d).__name__}')
    if isinstance(d, dict):
        print(f'  Total entries: {len(d)}')
        sample = list(d.items())[:8]
        for k, v in sample:
            kr = repr(k)[:60]
            vr = repr(v)[:80]
            print(f'    {kr:65s} → {vr}')
