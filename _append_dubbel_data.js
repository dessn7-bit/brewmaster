#!/usr/bin/env node
/**
 * Append Belgian Dubbel boost recipes to ML dataset
 */
const fs = require('fs');

function main() {
    try {
        // Load existing dataset
        console.log("Loading existing ML dataset...");
        const dataset = JSON.parse(fs.readFileSync('_ml_dataset.json', 'utf8'));

        // Load new Dubbel recipes
        console.log("Loading Dubbel boost recipes...");
        const newRecipes = JSON.parse(fs.readFileSync('_dubbel_boost_recipes.json', 'utf8'));

        // Find data array in dataset
        let dataKey = null;
        if ('data' in dataset) {
            dataKey = 'data';
        } else {
            // Search for array of recipes
            for (const key in dataset) {
                if (Array.isArray(dataset[key]) && dataset[key].length > 0) {
                    if (typeof dataset[key][0] === 'object' && 'label_slug' in dataset[key][0]) {
                        dataKey = key;
                        break;
                    }
                }
            }
        }

        if (!dataKey) {
            console.error("ERROR: Could not find recipes data in dataset");
            process.exit(1);
        }

        const originalCount = dataset[dataKey].length;
        console.log(`Original dataset: ${originalCount} recipes`);

        // Append new recipes
        dataset[dataKey] = dataset[dataKey].concat(newRecipes);

        const newCount = dataset[dataKey].length;
        console.log(`After boost: ${newCount} recipes (+${newCount - originalCount})`);

        // Update metadata
        if (dataset._meta) {
            dataset._meta.count = newCount;
            dataset._meta.version = 'dubbel_boost_v1';
            dataset._meta.source = (dataset._meta.source || '') + ' + dubbel_boost_15';
        }

        // Write back
        console.log("Writing updated dataset...");
        fs.writeFileSync('_ml_dataset.json', JSON.stringify(dataset, null, 2));

        console.log("✅ Dubbel data boost complete!");
        console.log(`Belgian Dubbel count should be: 11 + 15 = 26 recipes`);

    } catch (error) {
        console.error("ERROR:", error.message);
        process.exit(1);
    }
}

main();