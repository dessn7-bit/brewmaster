#!/usr/bin/env python3
"""
Append Belgian Dubbel boost recipes to ML dataset
"""
import json
import sys

def main():
    # Load existing dataset
    print("Loading existing ML dataset...")
    with open('_ml_dataset.json', 'r', encoding='utf-8') as f:
        dataset = json.load(f)

    # Load new Dubbel recipes
    print("Loading Dubbel boost recipes...")
    with open('_dubbel_boost_recipes.json', 'r', encoding='utf-8') as f:
        new_recipes = json.load(f)

    # Get current recipe count
    original_count = len(dataset.get('data', []))
    print(f"Original dataset: {original_count} recipes")

    # Find 'data' key in dataset structure
    if 'data' in dataset:
        data_key = 'data'
    else:
        # Check if recipes are stored directly or under different key
        for key in dataset:
            if isinstance(dataset[key], list) and len(dataset[key]) > 0:
                if isinstance(dataset[key][0], dict) and 'label_slug' in dataset[key][0]:
                    data_key = key
                    break
        else:
            print("ERROR: Could not find recipes data in dataset")
            sys.exit(1)

    # Append new recipes
    dataset[data_key].extend(new_recipes)

    # Update metadata
    new_count = len(dataset[data_key])
    print(f"After boost: {new_count} recipes (+{new_count - original_count})")

    if '_meta' in dataset:
        dataset['_meta']['count'] = new_count
        dataset['_meta']['version'] = 'dubbel_boost_v1'
        dataset['_meta']['source'] = dataset['_meta'].get('source', '') + ' + dubbel_boost_15'

    # Write back
    print("Writing updated dataset...")
    with open('_ml_dataset.json', 'w', encoding='utf-8') as f:
        json.dump(dataset, f, indent=2)

    print("✅ Dubbel data boost complete!")
    print(f"Belgian Dubbel count should be: {11 + 15} = 26 recipes")

if __name__ == '__main__':
    main()