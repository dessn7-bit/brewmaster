// FAZ 6D: Advanced Features Development
// Enhanced user experience and modern functionality

const FAZ6D_ADVANCED_FEATURES = {

    // Style Confidence Calibration System
    confidenceCalibration: {

        // Calibrate prediction confidence based on historical accuracy
        calibrateConfidenceScore(rawConfidence, styleSlug, features) {
            const historicalAccuracy = this.getHistoricalAccuracy(styleSlug);
            const featureReliability = this.calculateFeatureReliability(features);
            const contextualModifier = this.getContextualModifier(styleSlug, features);

            // Weighted calibration formula
            const calibratedConfidence = rawConfidence *
                (0.4 * historicalAccuracy + 0.3 * featureReliability + 0.3 * contextualModifier);

            return Math.max(0.1, Math.min(0.99, calibratedConfidence));
        },

        getHistoricalAccuracy(styleSlug) {
            try {
                const feedbackData = JSON.parse(localStorage.getItem('bm_v6_feedback') || '[]');
                const styleFeedback = feedbackData.filter(entry => entry.prediction.top1 === styleSlug);

                if (styleFeedback.length < 3) {
                    return 0.8; // Default confidence for styles with limited data
                }

                const correct = styleFeedback.filter(entry =>
                    entry.correction.correctionType === 'no_correction'
                ).length;

                return correct / styleFeedback.length;
            } catch (error) {
                console.warn('Historical accuracy calculation failed:', error);
                return 0.8;
            }
        },

        calculateFeatureReliability(features) {
            // Features with high discriminative power get higher reliability
            const reliableFeatures = {
                'yeast_abbey': 0.95,
                'yeast_witbier': 0.95,
                'yeast_attenuation': 0.9,
                'fermentation_temp_c': 0.85,
                'dry_hop_days': 0.9,
                'lagering_days': 0.85,
                'water_so4_ppm': 0.8
            };

            let totalWeight = 0;
            let weightedReliability = 0;

            for (let [feature, value] of Object.entries(features)) {
                if (value > 0 && reliableFeatures[feature]) {
                    const weight = Math.min(value / 100, 1); // Normalize feature values
                    totalWeight += weight;
                    weightedReliability += reliableFeatures[feature] * weight;
                }
            }

            return totalWeight > 0 ? weightedReliability / totalWeight : 0.7;
        },

        getContextualModifier(styleSlug, features) {
            // Context-specific confidence adjustments
            const stylePatterns = {
                // Belgian styles - high confidence if yeast features present
                'belgian_dubbel': features.yeast_abbey > 0 ? 1.0 : 0.6,
                'belgian_tripel': features.yeast_abbey > 0 ? 1.0 : 0.6,
                'belgian_witbier': features.yeast_witbier > 0 ? 1.0 : 0.5,

                // IPA styles - confidence based on hop profile
                'american_ipa': features.dry_hop_days > 0 ? 0.9 : 0.7,
                'double_ipa': (features.abv > 7.5 && features.ibu > 60) ? 0.95 : 0.6,

                // Lagers - confidence based on process
                'german_pilsner': features.lagering_days > 20 ? 0.9 : 0.6,
                'munich_helles': features.fermentation_temp_c < 15 ? 0.9 : 0.6
            };

            return stylePatterns[styleSlug] || 0.8;
        }
    },

    // Multi-Language Style Support
    multiLanguageSupport: {

        styleTranslations: {
            'american_ipa': {
                'en': 'American IPA',
                'tr': 'Amerikan IPA',
                'de': 'Amerikanisches IPA',
                'fr': 'IPA Américaine',
                'es': 'IPA Americana'
            },
            'belgian_dubbel': {
                'en': 'Belgian Dubbel',
                'tr': 'Belçika Dubbel',
                'de': 'Belgischer Dubbel',
                'fr': 'Dubbel Belge',
                'es': 'Dubbel Belga'
            },
            'german_pilsner': {
                'en': 'German Pilsner',
                'tr': 'Alman Pilsner',
                'de': 'Deutsches Pilsner',
                'fr': 'Pilsner Allemande',
                'es': 'Pilsner Alemana'
            },
            'weissbier': {
                'en': 'German Hefeweizen',
                'tr': 'Alman Hefeweizen',
                'de': 'Deutsches Hefeweizen',
                'fr': 'Hefeweizen Allemande',
                'es': 'Hefeweizen Alemana'
            }
            // Add more styles as needed
        },

        getStyleName(styleSlug, language = 'tr') {
            const translations = this.styleTranslations[styleSlug];
            if (translations && translations[language]) {
                return translations[language];
            }
            // Fallback to English, then to slug
            return translations?.en || styleSlug.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        },

        detectUserLanguage() {
            // Detect from browser settings
            const browserLang = navigator.language || navigator.userLanguage;
            const langCode = browserLang.split('-')[0];

            // Support available languages
            const supportedLangs = ['en', 'tr', 'de', 'fr', 'es'];
            return supportedLangs.includes(langCode) ? langCode : 'tr'; // Default to Turkish
        }
    },

    // Specialty Style Expansion
    specialtyStyleSupport: {

        modernVariants: {
            'hazy_ipa': {
                baseStyle: 'american_ipa',
                discriminators: {
                    'dry_hop_days': { min: 3, weight: 4.0 },
                    'yeast_american': { min: 0.8, weight: 3.0 },
                    'water_cl_ppm': { min: 150, weight: 2.5 }
                },
                description: 'Hazy/Juicy IPA variant with late hopping'
            },
            'pastry_stout': {
                baseStyle: 'imperial_stout',
                discriminators: {
                    'katki_chocolate': { min: 0.8, weight: 4.0 },
                    'katki_lactose': { min: 0.8, weight: 3.5 },
                    'abv': { min: 8.0, weight: 2.0 }
                },
                description: 'Dessert-inspired imperial stout with adjuncts'
            },
            'kettle_sour': {
                baseStyle: 'sour_ale',
                discriminators: {
                    'yeast_lacto': { min: 0.8, weight: 4.0 },
                    'fermentation_temp_c': { max: 25, weight: 2.5 },
                    'katki_fruit': { min: 0.5, weight: 3.0 }
                },
                description: 'Quick-soured ale with fruit additions'
            },
            'session_ipa': {
                baseStyle: 'american_ipa',
                discriminators: {
                    'abv': { max: 4.5, weight: 4.0 },
                    'ibu': { min: 40, weight: 3.0 },
                    'dry_hop_days': { min: 2, weight: 2.5 }
                },
                description: 'Lower alcohol IPA with full hop character'
            }
        },

        detectSpecialtyVariant(prediction, features) {
            for (let [variantSlug, variantData] of Object.entries(this.modernVariants)) {
                if (prediction.style === variantData.baseStyle || prediction.style === variantSlug) {
                    const match = this.evaluateVariantMatch(features, variantData.discriminators);

                    if (match.score > 0.7) {
                        return {
                            variant: variantSlug,
                            baseStyle: variantData.baseStyle,
                            confidence: match.score,
                            description: variantData.description,
                            matchingFeatures: match.features
                        };
                    }
                }
            }
            return null;
        },

        evaluateVariantMatch(features, discriminators) {
            let totalWeight = 0;
            let matchWeight = 0;
            const matchingFeatures = [];

            for (let [feature, criteria] of Object.entries(discriminators)) {
                const value = features[feature] || 0;
                const weight = criteria.weight || 1.0;
                totalWeight += weight;

                let matches = false;
                if (criteria.min && value >= criteria.min) matches = true;
                if (criteria.max && value <= criteria.max) matches = true;
                if (criteria.exact && value === criteria.exact) matches = true;

                if (matches) {
                    matchWeight += weight;
                    matchingFeatures.push({
                        feature: feature,
                        value: value,
                        criteria: criteria
                    });
                }
            }

            return {
                score: totalWeight > 0 ? matchWeight / totalWeight : 0,
                features: matchingFeatures
            };
        }
    },

    // User Preference Learning System
    userPreferenceLearning: {

        // Track user preferences from feedback patterns
        analyzeUserPreferences() {
            try {
                const feedbackData = JSON.parse(localStorage.getItem('bm_v6_feedback') || '[]');

                if (feedbackData.length < 5) {
                    return { status: 'insufficient_data', preferences: null };
                }

                const preferences = {
                    favoriteStyles: this.identifyFavoriteStyles(feedbackData),
                    avoidedStyles: this.identifyAvoidedStyles(feedbackData),
                    preferredFeatures: this.identifyPreferredFeatures(feedbackData),
                    strengthPreference: this.identifyStrengthPreference(feedbackData),
                    styleCategories: this.identifyStyleCategoryPreferences(feedbackData)
                };

                return { status: 'analyzed', preferences: preferences };

            } catch (error) {
                console.error('User preference analysis failed:', error);
                return { status: 'error', preferences: null };
            }
        },

        identifyFavoriteStyles(feedbackData) {
            const styleFrequency = {};
            const styleAccuracy = {};

            for (let entry of feedbackData) {
                const style = entry.prediction.top1;
                styleFrequency[style] = (styleFrequency[style] || 0) + 1;

                if (entry.correction.correctionType === 'no_correction') {
                    styleAccuracy[style] = (styleAccuracy[style] || 0) + 1;
                }
            }

            // Styles frequently predicted correctly = user favorites
            const favorites = [];
            for (let style of Object.keys(styleFrequency)) {
                const frequency = styleFrequency[style];
                const accuracy = (styleAccuracy[style] || 0) / frequency;

                if (frequency >= 3 && accuracy >= 0.8) {
                    favorites.push({
                        style: style,
                        frequency: frequency,
                        accuracy: Math.round(accuracy * 100)
                    });
                }
            }

            return favorites.sort((a, b) => (b.frequency * b.accuracy) - (a.frequency * a.accuracy));
        },

        identifyAvoidedStyles(feedbackData) {
            const styleCorrections = {};
            const totalCorrections = {};

            for (let entry of feedbackData) {
                const predicted = entry.prediction.top1;
                totalCorrections[predicted] = (totalCorrections[predicted] || 0) + 1;

                if (entry.correction.correctionType !== 'no_correction') {
                    styleCorrections[predicted] = (styleCorrections[predicted] || 0) + 1;
                }
            }

            // Styles frequently corrected = user avoids
            const avoided = [];
            for (let style of Object.keys(totalCorrections)) {
                const total = totalCorrections[style];
                const corrections = styleCorrections[style] || 0;
                const errorRate = corrections / total;

                if (total >= 3 && errorRate >= 0.6) {
                    avoided.push({
                        style: style,
                        frequency: total,
                        errorRate: Math.round(errorRate * 100)
                    });
                }
            }

            return avoided.sort((a, b) => b.errorRate - a.errorRate);
        },

        identifyPreferredFeatures(feedbackData) {
            // Analyze recipe features from correct predictions
            const correctPredictions = feedbackData.filter(entry =>
                entry.correction.correctionType === 'no_correction'
            );

            if (correctPredictions.length < 3) return [];

            const featureRanges = {
                abv: [],
                srm: [],
                ibu: [],
                fermentation_temp_c: []
            };

            for (let entry of correctPredictions) {
                for (let feature of Object.keys(featureRanges)) {
                    if (entry.recipe[feature]) {
                        featureRanges[feature].push(entry.recipe[feature]);
                    }
                }
            }

            const preferences = {};
            for (let [feature, values] of Object.entries(featureRanges)) {
                if (values.length >= 3) {
                    values.sort((a, b) => a - b);
                    preferences[feature] = {
                        min: values[0],
                        max: values[values.length - 1],
                        avg: values.reduce((sum, v) => sum + v, 0) / values.length,
                        median: values[Math.floor(values.length / 2)]
                    };
                }
            }

            return preferences;
        },

        identifyStrengthPreference(feedbackData) {
            const correctPredictions = feedbackData.filter(entry =>
                entry.correction.correctionType === 'no_correction'
            );

            const abvValues = correctPredictions
                .map(entry => entry.recipe.abv)
                .filter(abv => abv && abv > 0);

            if (abvValues.length < 3) return null;

            const avgABV = abvValues.reduce((sum, abv) => sum + abv, 0) / abvValues.length;

            let category;
            if (avgABV < 4.5) category = 'session';
            else if (avgABV < 6.0) category = 'standard';
            else if (avgABV < 8.0) category = 'strong';
            else category = 'imperial';

            return {
                category: category,
                avgABV: Math.round(avgABV * 10) / 10,
                range: {
                    min: Math.min(...abvValues),
                    max: Math.max(...abvValues)
                }
            };
        },

        identifyStyleCategoryPreferences(feedbackData) {
            const categories = {
                'belgian': ['belgian_dubbel', 'belgian_tripel', 'belgian_witbier', 'belgian_golden_strong'],
                'ipa': ['american_ipa', 'double_ipa', 'session_ipa', 'hazy_ipa', 'english_ipa'],
                'lager': ['german_pilsner', 'czech_pilsner', 'munich_helles', 'marzen'],
                'wheat': ['weissbier', 'hefeweizen', 'belgian_witbier'],
                'dark': ['porter', 'stout', 'imperial_stout', 'brown_ale']
            };

            const categoryStats = {};

            for (let [category, styles] of Object.entries(categories)) {
                const categoryData = feedbackData.filter(entry =>
                    styles.includes(entry.prediction.top1)
                );

                if (categoryData.length > 0) {
                    const correct = categoryData.filter(entry =>
                        entry.correction.correctionType === 'no_correction'
                    ).length;

                    categoryStats[category] = {
                        total: categoryData.length,
                        correct: correct,
                        accuracy: Math.round((correct / categoryData.length) * 100)
                    };
                }
            }

            return Object.entries(categoryStats)
                .filter(([, stats]) => stats.total >= 2)
                .sort(([, a], [, b]) => b.accuracy - a.accuracy)
                .map(([category, stats]) => ({ category, ...stats }));
        },

        // Generate personalized recommendations
        generatePersonalizedRecommendations(currentRecipe) {
            const prefAnalysis = this.analyzeUserPreferences();

            if (prefAnalysis.status !== 'analyzed') {
                return null;
            }

            const recommendations = [];
            const prefs = prefAnalysis.preferences;

            // Favorite style recommendations
            if (prefs.favoriteStyles.length > 0) {
                const topFavorite = prefs.favoriteStyles[0];
                recommendations.push({
                    type: 'favorite_style',
                    suggestion: `Based on your history, you often brew ${topFavorite.style} successfully`,
                    confidence: topFavorite.accuracy
                });
            }

            // Feature-based recommendations
            if (prefs.preferredFeatures.abv) {
                const prefABV = prefs.preferredFeatures.abv.avg;
                const currentABV = currentRecipe.abv || 0;

                if (Math.abs(currentABV - prefABV) > 1.5) {
                    recommendations.push({
                        type: 'abv_preference',
                        suggestion: `Your typical ABV is ${prefABV.toFixed(1)}%, current is ${currentABV.toFixed(1)}%`,
                        recommendation: currentABV > prefABV ? 'Consider reducing alcohol content' : 'Consider increasing alcohol content'
                    });
                }
            }

            // Category preferences
            if (prefs.styleCategories.length > 0) {
                const topCategory = prefs.styleCategories[0];
                recommendations.push({
                    type: 'category_preference',
                    suggestion: `You have ${topCategory.accuracy}% accuracy with ${topCategory.category} styles`,
                    confidence: topCategory.accuracy
                });
            }

            return recommendations;
        }
    },

    // Main advanced features integration
    enhancePredictionResults(originalPrediction, features) {
        try {
            const enhanced = { ...originalPrediction };

            // Apply confidence calibration
            for (let prediction of enhanced.predictions) {
                prediction.calibratedConfidence = this.confidenceCalibration.calibrateConfidenceScore(
                    prediction.confidence, prediction.style, features
                );
            }

            // Detect specialty variants
            const specialtyVariant = this.specialtyStyleSupport.detectSpecialtyVariant(
                enhanced.predictions[0], features
            );

            if (specialtyVariant) {
                enhanced.specialtyVariant = specialtyVariant;
            }

            // Add personalized recommendations
            const personalRecs = this.userPreferenceLearning.generatePersonalizedRecommendations(features);
            if (personalRecs) {
                enhanced.personalizedRecommendations = personalRecs;
            }

            // Multi-language support
            const userLang = this.multiLanguageSupport.detectUserLanguage();
            enhanced.displayLanguage = userLang;

            for (let prediction of enhanced.predictions) {
                prediction.displayName = this.multiLanguageSupport.getStyleName(prediction.style, userLang);
            }

            return enhanced;

        } catch (error) {
            console.error('Prediction enhancement failed:', error);
            return originalPrediction;
        }
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.FAZ6D_ADVANCED_FEATURES = FAZ6D_ADVANCED_FEATURES;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FAZ6D_ADVANCED_FEATURES;
}