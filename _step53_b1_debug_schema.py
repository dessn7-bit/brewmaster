#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Debug ingredients schema — row sample + per-type non-null counts."""
import pandas as pd
import warnings
warnings.filterwarnings('ignore')

ROOT = 'C:/Users/Kaan/brewmaster/external/_rmwoods_dataset'

print('Loading first 50K ingredients rows...')
df = pd.read_hdf(f'{ROOT}/all_recipes.h5', key='ingredients', start=0, stop=50000)
df = df.reset_index()
print(f'Cols ({len(df.columns)}): {list(df.columns)}\n')

# Per-column non-null counts (numeric) and non-empty (str/bytes)
print('Non-null/non-empty counts (50K sample):')
for c in df.columns:
    s = df[c]
    if s.dtype == object:
        # bytes or str — count non-empty
        nn = s.apply(lambda v: v not in (None, b'', '') and not pd.isna(v) if isinstance(v, (bytes, str)) or v is None else pd.notna(v)).sum()
    else:
        nn = s.notna().sum()
    print(f'  {c:30s} {nn:>6d}  ({100*nn/len(df):.1f}%)  dtype={s.dtype}')

# Sample 5 rows where each type might dominate
print('\n--- Row 0 ---')
for c in df.columns:
    v = df[c].iloc[0]
    print(f'  {c}: {repr(v)[:80]}')
print('\n--- Row 100 ---')
for c in df.columns:
    v = df[c].iloc[100]
    print(f'  {c}: {repr(v)[:80]}')
print('\n--- Row 1000 ---')
for c in df.columns:
    v = df[c].iloc[1000]
    print(f'  {c}: {repr(v)[:80]}')
