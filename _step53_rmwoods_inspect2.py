#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""rmwoods H5 inspection v2 — pandas/pytables ile."""
import h5py
import pickle
import json
import os
import warnings
warnings.filterwarnings('ignore')

ROOT = 'C:/Users/Kaan/Desktop/rmwoods'

# 1. all_recipes.h5 — PyTables structure
print('=' * 70)
print('all_recipes.h5')
print('=' * 70)

with h5py.File(f'{ROOT}/all_recipes.h5', 'r') as f:
    groups = list(f.keys())
    print(f'Top-level groups: {groups}')
    for g in groups:
        print(f'\n  Group: {g}')
        try:
            print(f'    Attrs: {dict(f[g].attrs)}')
        except: pass
        # Try table key
        if 'table' in f[g]:
            t = f[g]['table']
            print(f'    /table dtype names: {t.dtype.names}')
            print(f'    /table shape: {t.shape}')
            # Sample first 3 rows
            sample = t[:3]
            print(f'    First 3 rows:')
            for i, row in enumerate(sample):
                print(f'      row {i}:')
                for fname in t.dtype.names[:30]:
                    val = row[fname]
                    if isinstance(val, bytes):
                        val = val.decode('utf-8', errors='ignore')[:80]
                    print(f'        {fname}: {repr(val)[:100]}')
                print()

print('\n\n' + '=' * 70)
print('recipe_vecs.h5')
print('=' * 70)
with h5py.File(f'{ROOT}/recipe_vecs.h5', 'r') as f:
    if 'vecs' in f:
        v = f['vecs']
        if 'table' in v:
            t = v['table']
            print(f'vecs/table shape: {t.shape}')
            print(f'vecs/table dtype: {t.dtype.names}')
            sample = t[:2]
            for i, row in enumerate(sample):
                print(f'  row {i}: index={row["index"]}  values_block_0[:10]={row["values_block_0"][:10].tolist()}')

print('\n\n' + '=' * 70)
print('Pickle maps')
print('=' * 70)
for name in ('fermmap', 'hopmap', 'yeastmap', 'miscmap'):
    print(f'\n--- {name}.pickle ---')
    try:
        with open(f'{ROOT}/{name}.pickle', 'rb') as f:
            d = pickle.load(f)
        print(f'  Type: {type(d).__name__}')
        if isinstance(d, dict):
            print(f'  Total entries: {len(d)}')
            sample = list(d.items())[:8]
            for k, v in sample:
                kr = repr(k)[:50]
                vr = repr(v)[:80]
                print(f'    {kr:55s} → {vr}')
        elif isinstance(d, (list, tuple)):
            print(f'  Length: {len(d)}, first 5: {d[:5]}')
        else:
            print(f'  {str(d)[:300]}')
    except Exception as e:
        print(f'  FAIL: {e}')
