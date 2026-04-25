// FAZ 6C: Model Refinement Pipeline
// Dynamic model improvement based on user feedback

const FAZ6C_MODEL_REFINEMENT = {

    // Analyze feedback patterns for model improvement
    analyzeFeedbackPatterns() {
        try {
            const feedbackData = JSON.parse(localStorage.getItem('bm_v6_feedback') || '[]');

            if (feedbackData.length < 10) {
                console.log('📊 Insufficient feedback data for refinement (need 10+, have ' + feedbackData.length + ')');
                return null;
            }

            const analysis = {
                summary: {
                    totalFeedback: feedbackData.length,
                    accuracyRate: this.calculateAccuracyRate(feedbackData),
                    avgConfidence: this.calculateAvgConfidence(feedbackData)
                },
                confusionPatterns: this.identifyConfusionPatterns(feedbackData),
                styleAccuracy: this.analyzeStyleAccuracy(feedbackData),
                featureImportance: this.inferFeatureImportance(feedbackData),
                recommendations: this.generateRefinementRecommendations(feedbackData)
            };

            console.log('🔬 Feedback pattern analysis complete:', analysis.summary);
            return analysis;

        } catch (error) {
            console.error('❌ Feedback analysis error:', error);
            return null;
        }
    },

    // Calculate overall accuracy rate from feedback
    calculateAccuracyRate(feedbackData) {
        const correctPredictions = feedbackData.filter(entry =>
            entry.correction.correctionType === 'no_correction'
        ).length;

        return Math.round((correctPredictions / feedbackData.length) * 100);
    },

    // Calculate average confidence for predictions
    calculateAvgConfidence(feedbackData) {
        const confidences = feedbackData
            .map(entry => entry.prediction.confidence)
            .filter(conf => conf > 0);

        if (confidences.length === 0) return 0;

        return Math.round(confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length);
    },

    // Identify confusion patterns for targeted improvement
    identifyConfusionPatterns(feedbackData) {
        const confusionMatrix = {};
        const styleConfusion = {};

        for (let entry of feedbackData) {
            if (entry.correction.correctionType !== 'no_correction') {
                const predicted = entry.prediction.top1;
                const correct = entry.correction.correctStyle;
                const pair = `${predicted}→${correct}`;

                confusionMatrix[pair] = (confusionMatrix[pair] || 0) + 1;

                // Track individual style error rates
                styleConfusion[predicted] = (styleConfusion[predicted] || 0) + 1;
            }
        }

        // Sort by frequency
        const topConfusions = Object.entries(confusionMatrix)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([pair, count]) => ({
                pair: pair,
                count: count,
                frequency: Math.round((count / feedbackData.length) * 100)
            }));

        const problematicStyles = Object.entries(styleConfusion)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([style, errors]) => ({
                style: style,
                errorCount: errors,
                errorRate: Math.round((errors / feedbackData.filter(e => e.prediction.top1 === style).length) * 100)
            }));

        return {
            topConfusions: topConfusions,
            problematicStyles: problematicStyles,
            totalConfusionPairs: Object.keys(confusionMatrix).length
        };
    },

    // Analyze accuracy by individual styles
    analyzeStyleAccuracy(feedbackData) {
        const styleStats = {};

        for (let entry of feedbackData) {
            const style = entry.prediction.top1;
            if (!styleStats[style]) {
                styleStats[style] = { total: 0, correct: 0, avgConfidence: 0, confidenceSum: 0 };
            }

            styleStats[style].total++;
            styleStats[style].confidenceSum += entry.prediction.confidence || 0;

            if (entry.correction.correctionType === 'no_correction') {
                styleStats[style].correct++;
            }
        }

        // Calculate metrics for each style
        const styleAccuracy = {};
        for (let [style, stats] of Object.entries(styleStats)) {
            styleAccuracy[style] = {
                accuracy: Math.round((stats.correct / stats.total) * 100),
                sampleSize: stats.total,
                avgConfidence: Math.round(stats.confidenceSum / stats.total),
                needsWork: stats.total >= 3 && (stats.correct / stats.total) < 0.7
            };
        }

        return {
            byStyle: styleAccuracy,
            topPerforming: Object.entries(styleAccuracy)
                .filter(([,stats]) => stats.sampleSize >= 3)
                .sort(([,a], [,b]) => b.accuracy - a.accuracy)
                .slice(0, 10)
                .map(([style, stats]) => ({ style, ...stats })),
            needsImprovement: Object.entries(styleAccuracy)
                .filter(([,stats]) => stats.needsWork)
                .sort(([,a], [,b]) => a.accuracy - b.accuracy)
                .slice(0, 10)
                .map(([style, stats]) => ({ style, ...stats }))
        };
    },

    // Infer feature importance from correction patterns
    inferFeatureImportance(feedbackData) {
        const featureAnalysis = {
            belgianDiscrimination: this.analyzeBelgianDiscrimination(feedbackData),
            ipaVariants: this.analyzeIPAVariants(feedbackData),
            lagerTypes: this.analyzeLagerTypes(feedbackData),
            strengthCategories: this.analyzeStrengthCategories(feedbackData)
        };

        return featureAnalysis;
    },

    // Analyze Belgian family discrimination effectiveness
    analyzeBelgianDiscrimination(feedbackData) {
        const belgianStyles = ['belgian_dubbel', 'belgian_tripel', 'belgian_witbier', 'belgian_golden_strong'];
        const belgianFeedback = feedbackData.filter(entry =>
            belgianStyles.includes(entry.prediction.top1) || belgianStyles.includes(entry.correction.correctStyle)
        );

        if (belgianFeedback.length === 0) {
            return { status: 'no_data', accuracy: 0, confusions: [] };
        }

        const correct = belgianFeedback.filter(entry => entry.correction.correctionType === 'no_correction').length;
        const accuracy = Math.round((correct / belgianFeedback.length) * 100);

        const confusions = belgianFeedback
            .filter(entry => entry.correction.correctionType !== 'no_correction')
            .map(entry => `${entry.prediction.top1}→${entry.correction.correctStyle}`);

        return {
            status: 'analyzed',
            accuracy: accuracy,
            sampleSize: belgianFeedback.length,
            confusions: [...new Set(confusions)]
        };
    },

    // Analyze IPA variant discrimination
    analyzeIPAVariants(feedbackData) {
        const ipaStyles = ['american_ipa', 'double_ipa', 'session_ipa', 'juicy_ipa', 'hazy_ipa', 'english_ipa'];
        const ipaFeedback = feedbackData.filter(entry =>
            ipaStyles.includes(entry.prediction.top1) || ipaStyles.includes(entry.correction.correctStyle)
        );

        if (ipaFeedback.length === 0) {
            return { status: 'no_data', accuracy: 0 };
        }

        const correct = ipaFeedback.filter(entry => entry.correction.correctionType === 'no_correction').length;
        const accuracy = Math.round((correct / ipaFeedback.length) * 100);

        return {
            status: 'analyzed',
            accuracy: accuracy,
            sampleSize: ipaFeedback.length
        };
    },

    // Analyze lager type discrimination
    analyzeLagerTypes(feedbackData) {
        const lagerStyles = ['german_pilsner', 'czech_pilsner', 'munich_helles', 'marzen', 'oktoberfest'];
        const lagerFeedback = feedbackData.filter(entry =>
            lagerStyles.includes(entry.prediction.top1) || lagerStyles.includes(entry.correction.correctStyle)
        );

        if (lagerFeedback.length === 0) {
            return { status: 'no_data', accuracy: 0 };
        }

        const correct = lagerFeedback.filter(entry => entry.correction.correctionType === 'no_correction').length;
        const accuracy = Math.round((correct / lagerFeedback.length) * 100);

        return {
            status: 'analyzed',
            accuracy: accuracy,
            sampleSize: lagerFeedback.length
        };
    },

    // Analyze strength category discrimination
    analyzeStrengthCategories(feedbackData) {
        const categories = {
            session: feedbackData.filter(e => e.recipe.abv < 4.5),
            standard: feedbackData.filter(e => e.recipe.abv >= 4.5 && e.recipe.abv < 6.0),
            strong: feedbackData.filter(e => e.recipe.abv >= 6.0 && e.recipe.abv < 8.0),
            imperial: feedbackData.filter(e => e.recipe.abv >= 8.0)
        };

        const results = {};
        for (let [category, data] of Object.entries(categories)) {
            if (data.length > 0) {
                const correct = data.filter(entry => entry.correction.correctionType === 'no_correction').length;
                results[category] = {
                    accuracy: Math.round((correct / data.length) * 100),
                    sampleSize: data.length
                };
            } else {
                results[category] = { accuracy: 0, sampleSize: 0 };
            }
        }

        return results;
    },

    // Generate specific recommendations for model improvement
    generateRefinementRecommendations(feedbackData) {
        const recommendations = [];
        const patterns = this.identifyConfusionPatterns(feedbackData);
        const styleAccuracy = this.analyzeStyleAccuracy(feedbackData);
        const featureImportance = this.inferFeatureImportance(feedbackData);

        // High-frequency confusion pairs
        if (patterns.topConfusions.length > 0) {
            const topConfusion = patterns.topConfusions[0];
            recommendations.push({
                type: 'feature_enhancement',
                priority: 'high',
                target: topConfusion.pair,
                description: `Most frequent confusion: ${topConfusion.pair} (${topConfusion.frequency}% of predictions)`,
                action: 'Add discriminative features or increase weight for distinguishing characteristics',
                implementation: this.suggestFeatureEnhancement(topConfusion.pair)
            });
        }

        // Low accuracy styles
        if (styleAccuracy.needsImprovement.length > 0) {
            const worstStyle = styleAccuracy.needsImprovement[0];
            recommendations.push({
                type: 'training_data',
                priority: 'medium',
                target: worstStyle.style,
                description: `Low accuracy style: ${worstStyle.style} (${worstStyle.accuracy}% accuracy)`,
                action: 'Add more training examples or review feature weights',
                implementation: this.suggestTrainingEnhancement(worstStyle.style)
            });
        }

        // Belgian discrimination check
        if (featureImportance.belgianDiscrimination.status === 'analyzed' &&
            featureImportance.belgianDiscrimination.accuracy < 90) {
            recommendations.push({
                type: 'belgian_refinement',
                priority: 'high',
                target: 'belgian_family',
                description: `Belgian discrimination below target: ${featureImportance.belgianDiscrimination.accuracy}%`,
                action: 'Review yeast and process features for Belgian styles',
                implementation: {
                    features: ['yeast_abbey', 'yeast_witbier', 'fermentation_temp_c', 'yeast_attenuation'],
                    weightAdjustment: 'increase'
                }
            });
        }

        // Overall accuracy check
        const overallAccuracy = this.calculateAccuracyRate(feedbackData);
        if (overallAccuracy < 70) {
            recommendations.push({
                type: 'model_overhaul',
                priority: 'critical',
                target: 'overall_model',
                description: `Overall accuracy below threshold: ${overallAccuracy}%`,
                action: 'Consider model architecture changes or comprehensive retraining',
                implementation: {
                    approach: 'systematic_review',
                    focus: ['feature_selection', 'training_data_quality', 'hyperparameters']
                }
            });
        }

        return recommendations;
    },

    // Suggest specific feature enhancements for confusion pairs
    suggestFeatureEnhancement(confusionPair) {
        const enhancementMap = {
            'belgian_dubbel→belgian_tripel': {
                features: ['yeast_attenuation', 'og_plato', 'fermentation_temp_c'],
                weights: { yeast_attenuation: 4.0, og_plato: 3.5 },
                reason: 'Dubbel vs Tripel differentiation needs stronger gravity and attenuation signals'
            },
            'american_ipa→double_ipa': {
                features: ['abv', 'ibu', 'og_plato', 'dry_hop_days'],
                weights: { abv: 4.0, ibu: 3.5, og_plato: 3.5 },
                reason: 'IPA vs Double IPA needs stronger alcohol and bitterness discrimination'
            },
            'german_pilsner→czech_pilsner': {
                features: ['water_so4_ppm', 'fermentation_temp_c', 'lagering_days'],
                weights: { water_so4_ppm: 3.0, fermentation_temp_c: 2.5 },
                reason: 'Pilsner variants need water chemistry and process differentiation'
            }
        };

        return enhancementMap[confusionPair] || {
            features: ['generic_review_needed'],
            weights: {},
            reason: 'Specific enhancement mapping not available for this pair'
        };
    },

    // Suggest training data enhancements
    suggestTrainingEnhancement(style) {
        return {
            approach: 'targeted_examples',
            target: style,
            needed: 'Add 10+ examples with varied feature profiles',
            focus: 'Ensure representative ABV, SRM, IBU range for this style'
        };
    },

    // Generate dynamic feature weight adjustments
    generateWeightAdjustments(analysisResults) {
        if (!analysisResults || !analysisResults.recommendations) {
            return null;
        }

        const adjustments = {};

        for (let rec of analysisResults.recommendations) {
            if (rec.implementation && rec.implementation.features) {
                for (let feature of rec.implementation.features) {
                    const currentWeight = this.getCurrentFeatureWeight(feature);
                    let newWeight = currentWeight;

                    if (rec.implementation.weightAdjustment === 'increase') {
                        newWeight = Math.min(currentWeight * 1.2, 5.0); // Cap at 5.0
                    } else if (rec.implementation.weightAdjustment === 'decrease') {
                        newWeight = Math.max(currentWeight * 0.8, 0.5); // Floor at 0.5
                    }

                    if (newWeight !== currentWeight) {
                        adjustments[feature] = {
                            old: currentWeight,
                            new: Math.round(newWeight * 10) / 10, // Round to 1 decimal
                            change: Math.round((newWeight - currentWeight) * 10) / 10,
                            reason: rec.description
                        };
                    }
                }
            }
        }

        return Object.keys(adjustments).length > 0 ? adjustments : null;
    },

    // Get current feature weight from V6 model
    getCurrentFeatureWeight(feature) {
        if (typeof V6_ENHANCED_MODEL !== 'undefined' && V6_ENHANCED_MODEL.weights) {
            return V6_ENHANCED_MODEL.weights[feature] || 1.0;
        }
        return 1.0; // Default weight
    },

    // Apply weight adjustments to model (experimental)
    applyWeightAdjustments(adjustments) {
        if (!adjustments || typeof V6_ENHANCED_MODEL === 'undefined') {
            console.log('⚠️ Cannot apply adjustments - model not available');
            return false;
        }

        console.log('🔧 Applying dynamic weight adjustments...');

        for (let [feature, adjustment] of Object.entries(adjustments)) {
            if (V6_ENHANCED_MODEL.weights) {
                V6_ENHANCED_MODEL.weights[feature] = adjustment.new;
                console.log(`  ${feature}: ${adjustment.old} → ${adjustment.new} (${adjustment.change > 0 ? '+' : ''}${adjustment.change})`);
            }
        }

        console.log('✅ Weight adjustments applied to V6 model');
        return true;
    },

    // Generate comprehensive refinement report
    generateRefinementReport() {
        const analysis = this.analyzeFeedbackPatterns();

        if (!analysis) {
            return {
                status: 'insufficient_data',
                message: 'Need more feedback data for meaningful analysis'
            };
        }

        const weightAdjustments = this.generateWeightAdjustments(analysis);

        return {
            status: 'analysis_complete',
            timestamp: new Date().toISOString(),
            analysis: analysis,
            weightAdjustments: weightAdjustments,
            summary: {
                currentAccuracy: analysis.summary.accuracyRate,
                feedbackCount: analysis.summary.totalFeedback,
                topIssues: analysis.recommendations.slice(0, 3),
                recommendedActions: analysis.recommendations.length
            }
        };
    },

    // Export refinement recommendations
    exportRefinementReport() {
        try {
            const report = this.generateRefinementReport();

            const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `brewmaster_v6_refinement_report_${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('📊 Model refinement report exported');
            return true;

        } catch (error) {
            console.error('❌ Export error:', error);
            return false;
        }
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.FAZ6C_MODEL_REFINEMENT = FAZ6C_MODEL_REFINEMENT;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FAZ6C_MODEL_REFINEMENT;
}