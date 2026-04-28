#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Adım 53 Faz A — rmwoods/beer.ai dataset schema inspection.
KOD YAZMA AMACI YOK — sadece schema raporu, V17 retrain planı için input.
"""
import h5py
import pickle
import json
import os

ROOT = 'C:/Users/Kaan/Desktop/rmwoods'

print('='*70)
print('Adım 53 Faz A — rmwoods/beer.ai Dataset Inspection')
print('='*70)

# 1. all_recipes.h5
print('\n--- 1. all_recipes.h5 ---')
with h5py.File(f'{ROOT}/all_recipes.h5', 'r') as f:
    print(f'Keys: {list(f.keys())}')
    print(f'Attributes: {dict(f.attrs)}')

    # Walk through structure
    def walk(name, obj):
        if isinstance(obj, h5py.Dataset):
            print(f'  Dataset: {name}  shape={obj.shape}  dtype={obj.dtype}')
        elif isinstance(obj, h5py.Group):
            print(f'  Group:   {name}/  attrs={dict(obj.attrs)}')
    f.visititems(walk)

print('\n--- 2. recipe_vecs.h5 ---')
with h5py.File(f'{ROOT}/recipe_vecs.h5', 'r') as f:
    print(f'Keys: {list(f.keys())}')
    print(f'Attributes: {dict(f.attrs)}')
    def walk2(name, obj):
        if isinstance(obj, h5py.Dataset):
            print(f'  Dataset: {name}  shape={obj.shape}  dtype={obj.dtype}')
            # Sample values
            if obj.shape[0] >= 1:
                if len(obj.shape) == 2:
                    print(f'    sample[0][:10]: {obj[0][:10].tolist()}')
                else:
                    print(f'    sample[:5]: {obj[:5].tolist() if obj.shape[0] >= 5 else obj[:].tolist()}')
        elif isinstance(obj, h5py.Group):
            print(f'  Group:   {name}/')
    f.visititems(walk2)

# 3. Pickle maps
for name in ('fermmap', 'hopmap', 'yeastmap', 'miscmap'):
    print(f'\n--- 3. {name}.pickle ---')
    try:
        with open(f'{ROOT}/{name}.pickle', 'rb') as f:
            d = pickle.load(f)
        print(f'  Type: {type(d).__name__}')
        if isinstance(d, dict):
            print(f'  Total entries: {len(d)}')
            sample = list(d.items())[:5]
            for k, v in sample:
                print(f'    {repr(k)[:60]:65s} → {repr(v)[:80]}')
        elif isinstance(d, (list, tuple)):
            print(f'  Length: {len(d)}')
            print(f'  Sample[:5]: {d[:5]}')
        else:
            print(f'  Content (first 300 char): {str(d)[:300]}')
    except Exception as e:
        print(f'  FAIL: {e}')
