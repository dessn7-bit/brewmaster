#!/usr/bin/env node

/**
 * BREWMASTER V6 - Alias Pattern Detection Script
 *
 * FAZ 1: Training data'daki slug alias pattern'larını tespit et.
 * Confusion matrix'in ~%30'u alias confusion'dan kaynaklanıyor.
 *
 * PATTERN TİPLERİ:
 * 1. Geographic prefix: american_pale_ale vs pale_ale
 * 2. Compound naming: french_belgian_saison vs belgian_saison
 * 3. Abbreviated vs full: ipa vs american_india_pale_ale
 * 4. Character variants: bi_re vs biere, koelsch vs kolsch
 * 5. Duplicate terms: doppelbock vs german_doppelbock
 */

const fs = require('fs');

// Load unique slugs
const slugList = fs.readFileSync('_unique_slugs.txt', 'utf8')
    .trim().split('\n').filter(s => s.length > 0);

console.log(`\n=== BREWMASTER V6 ALIAS PATTERN DETECTION ===`);
console.log(`Total slugs: ${slugList.length}`);

// Common geographic prefixes to strip
const GEO_PREFIXES = [
    'american_', 'english_', 'belgian_', 'german_', 'french_',
    'czech_', 'dutch_', 'irish_', 'scottish_', 'european_',
    'international_', 'south_german_', 'bavarian_', 'franconian_',
    'munich_', 'vienna_', 'kentucky_', 'california_'
];

// Common style suffixes/keywords
const STYLE_KEYWORDS = [
    'ale', 'lager', 'beer', 'stout', 'porter', 'ipa', 'pilsner', 'weizen',
    'bock', 'saison', 'lambic', 'witbier', 'gose', 'kolsch', 'altbier'
];

/**
 * Calculate edit distance for fuzzy matching
 */
function editDistance(a, b) {
    const dp = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(0));

    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            if (a[i-1] === b[j-1]) {
                dp[i][j] = dp[i-1][j-1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
            }
        }
    }
    return dp[a.length][b.length];
}

/**
 * Remove geographic prefix if present
 */
function stripGeoPrefix(slug) {
    for (const prefix of GEO_PREFIXES) {
        if (slug.startsWith(prefix)) {
            return slug.substring(prefix.length);
        }
    }
    return slug;
}

/**
 * Find alias candidates
 */
function findAliasCandidates() {
    const candidates = [];

    for (let i = 0; i < slugList.length; i++) {
        for (let j = i + 1; j < slugList.length; j++) {
            const slug1 = slugList[i];
            const slug2 = slugList[j];

            // Skip if identical
            if (slug1 === slug2) continue;

            let aliasType = null;
            let confidence = 0;

            // PATTERN 1: Geographic prefix variants
            const stripped1 = stripGeoPrefix(slug1);
            const stripped2 = stripGeoPrefix(slug2);

            if (stripped1 === stripped2 && stripped1 !== slug1 && stripped2 !== slug2) {
                aliasType = 'geographic_prefix';
                confidence = 0.9;
            }

            // PATTERN 2: One is prefix of another (compound naming)
            else if (slug1.includes(slug2) || slug2.includes(slug1)) {
                const shorter = slug1.length < slug2.length ? slug1 : slug2;
                const longer = slug1.length < slug2.length ? slug2 : slug1;

                if (longer.includes(shorter + '_') || longer.includes('_' + shorter) || longer === shorter) {
                    aliasType = 'compound_naming';
                    confidence = 0.8;
                }
            }

            // PATTERN 3: Fuzzy character variants (biere/bi_re, koelsch/kolsch)
            else if (editDistance(slug1, slug2) <= 3) {
                // Only if they share significant substring and reasonable length
                const longer = slug1.length > slug2.length ? slug1 : slug2;
                const shorter = slug1.length > slug2.length ? slug2 : slug1;

                if (longer.length > 6 && shorter.length > 6) {
                    aliasType = 'character_variant';
                    confidence = 0.6;
                }
            }

            // PATTERN 4: Common style keyword overlap
            else {
                const words1 = slug1.split('_');
                const words2 = slug2.split('_');
                const commonWords = words1.filter(w => words2.includes(w) && STYLE_KEYWORDS.includes(w));

                if (commonWords.length >= 2) {
                    aliasType = 'keyword_overlap';
                    confidence = 0.5;
                }
            }

            if (aliasType) {
                candidates.push({
                    slug1,
                    slug2,
                    type: aliasType,
                    confidence,
                    note: getAliasNote(slug1, slug2, aliasType)
                });
            }
        }
    }

    return candidates.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Generate explanation note for alias pair
 */
function getAliasNote(slug1, slug2, type) {
    switch(type) {
        case 'geographic_prefix':
            return `Geographic variant: ${stripGeoPrefix(slug1)} base form`;
        case 'compound_naming':
            const shorter = slug1.length < slug2.length ? slug1 : slug2;
            const longer = slug1.length < slug2.length ? slug2 : slug1;
            return `Compound: "${shorter}" contained in "${longer}"`;
        case 'character_variant':
            return `Character variant: edit distance ${editDistance(slug1, slug2)}`;
        case 'keyword_overlap':
            const words1 = slug1.split('_');
            const words2 = slug2.split('_');
            const common = words1.filter(w => words2.includes(w));
            return `Keyword overlap: [${common.join(', ')}]`;
        default:
            return 'Unknown pattern';
    }
}

// Run detection
const candidates = findAliasCandidates();

console.log(`\nFound ${candidates.length} alias candidates:\n`);

// Group by confidence
const highConf = candidates.filter(c => c.confidence >= 0.8);
const medConf = candidates.filter(c => c.confidence >= 0.6 && c.confidence < 0.8);
const lowConf = candidates.filter(c => c.confidence < 0.6);

console.log(`HIGH CONFIDENCE (${highConf.length}):`);
highConf.forEach(c => {
    console.log(`  ${c.slug1} ↔ ${c.slug2} (${c.type}, ${c.confidence})`);
    console.log(`    → ${c.note}`);
});

console.log(`\nMEDIUM CONFIDENCE (${medConf.length}):`);
medConf.forEach(c => {
    console.log(`  ${c.slug1} ↔ ${c.slug2} (${c.type}, ${c.confidence})`);
    console.log(`    → ${c.note}`);
});

console.log(`\nLOW CONFIDENCE (${lowConf.length}):`);
lowConf.forEach(c => {
    console.log(`  ${c.slug1} ↔ ${c.slug2} (${c.type}, ${c.confidence})`);
    console.log(`    → ${c.note}`);
});

// Output as JSON for further processing
fs.writeFileSync('_alias_candidates_v6.json', JSON.stringify(candidates, null, 2));

console.log(`\nAlias candidates saved to: _alias_candidates_v6.json`);
console.log(`\nNext: Review candidates and create normalization mapping.`);