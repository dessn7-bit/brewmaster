// FAZ 6B: Enhanced Feedback Collection System
// Advanced feedback analytics and V6 integration

const FAZ6B_ENHANCED_FEEDBACK = {

    // Enhanced feedback data structure
    createFeedbackEntry(data) {
        return {
            timestamp: Date.now(),
            sessionId: this.getSessionId(),
            motorVersion: data.motorVersion || 'V6', // V2, V3, V4, V5, V6
            recipe: {
                signature: data.recipeSignature,
                abv: data.abv,
                srm: data.srm,
                ibu: data.ibu,
                og_plato: data.og_plato,
                // Add key discriminative features
                fermentation_temp_c: data.fermentation_temp_c,
                yeast_attenuation: data.yeast_attenuation,
                dry_hop_days: data.dry_hop_days,
                water_so4_ppm: data.water_so4_ppm
            },
            prediction: {
                top1: data.predictedStyle,
                top3: data.top3Styles || [],
                confidence: data.confidence,
                predictionTime: data.predictionTime
            },
            correction: {
                correctStyle: data.correctStyle,
                correctLabel: data.correctLabel,
                correctionType: this.classifyCorrection(data.predictedStyle, data.correctStyle)
            },
            context: {
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
                pageUrl: window.location.href
            }
        };
    },

    // Classify type of correction for analytics
    classifyCorrection(predicted, correct) {
        if (predicted === correct) return 'no_correction';

        // Check if within same style family
        const families = this.getStyleFamilies();
        for (let family of families) {
            if (family.styles.includes(predicted) && family.styles.includes(correct)) {
                return 'family_correction'; // Same family, different style
            }
        }

        return 'family_change'; // Different family entirely
    },

    // Get session ID for tracking user sessions
    getSessionId() {
        let sessionId = sessionStorage.getItem('bm_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('bm_session_id', sessionId);
        }
        return sessionId;
    },

    // Enhanced feedback storage (extends existing V2c system)
    saveFeedback(feedbackData) {
        try {
            // Save to enhanced feedback log
            const enhancedLog = JSON.parse(localStorage.getItem('bm_v6_feedback') || '[]');
            const entry = this.createFeedbackEntry(feedbackData);
            enhancedLog.push(entry);

            // Keep last 1000 entries to prevent storage overflow
            if (enhancedLog.length > 1000) {
                enhancedLog.splice(0, enhancedLog.length - 1000);
            }

            localStorage.setItem('bm_v6_feedback', JSON.stringify(enhancedLog));

            // Also maintain backward compatibility with V2c system
            const v2cLog = JSON.parse(localStorage.getItem('bm_v2c_feedback') || '[]');
            v2cLog.push({
                ts: Date.now(),
                recipeSig: feedbackData.recipeSignature,
                oldTop1: feedbackData.predictedStyle,
                correctSlug: feedbackData.correctStyle,
                correctLabel: feedbackData.correctLabel
            });
            localStorage.setItem('bm_v2c_feedback', JSON.stringify(v2cLog));

            console.log('✅ Enhanced feedback saved:', entry.correction.correctionType);
            return true;

        } catch (error) {
            console.error('❌ Feedback save error:', error);
            return false;
        }
    },

    // Advanced analytics dashboard
    generateAnalytics() {
        try {
            const enhancedLog = JSON.parse(localStorage.getItem('bm_v6_feedback') || '[]');
            const v2cLog = JSON.parse(localStorage.getItem('bm_v2c_feedback') || '[]');

            if (enhancedLog.length === 0 && v2cLog.length === 0) {
                console.log('📊 No feedback data available yet');
                return null;
            }

            const analytics = {
                summary: {
                    totalFeedbacks: enhancedLog.length,
                    totalSessions: new Set(enhancedLog.map(e => e.sessionId)).size,
                    dateRange: this.getDateRange(enhancedLog),
                    motorVersions: this.countMotorVersions(enhancedLog)
                },
                corrections: this.analyzeCorrectionPatterns(enhancedLog),
                performance: this.analyzePerformanceMetrics(enhancedLog),
                styles: this.analyzeStyleAccuracy(enhancedLog),
                trends: this.analyzeTrends(enhancedLog),
                recommendations: this.generateRecommendations(enhancedLog)
            };

            return analytics;

        } catch (error) {
            console.error('❌ Analytics generation error:', error);
            return null;
        }
    },

    // Analyze correction patterns
    analyzeCorrectionPatterns(log) {
        const patterns = {
            noCorrectionRate: 0,
            familyCorrectionRate: 0,
            familyChangeRate: 0,
            topConfusionPairs: [],
            frequentCorrections: {}
        };

        if (log.length === 0) return patterns;

        const correctionCounts = {
            no_correction: 0,
            family_correction: 0,
            family_change: 0
        };

        const confusionPairs = {};
        const corrections = {};

        for (let entry of log) {
            const type = entry.correction.correctionType;
            correctionCounts[type]++;

            if (type !== 'no_correction') {
                const pair = `${entry.prediction.top1} → ${entry.correction.correctStyle}`;
                confusionPairs[pair] = (confusionPairs[pair] || 0) + 1;
                corrections[entry.prediction.top1] = (corrections[entry.prediction.top1] || 0) + 1;
            }
        }

        const total = log.length;
        patterns.noCorrectionRate = Math.round((correctionCounts.no_correction / total) * 100);
        patterns.familyCorrectionRate = Math.round((correctionCounts.family_correction / total) * 100);
        patterns.familyChangeRate = Math.round((correctionCounts.family_change / total) * 100);

        // Top confusion pairs
        patterns.topConfusionPairs = Object.entries(confusionPairs)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([pair, count]) => ({ pair, count }));

        patterns.frequentCorrections = corrections;

        return patterns;
    },

    // Analyze performance metrics
    analyzePerformanceMetrics(log) {
        const metrics = {
            avgConfidence: 0,
            avgPredictionTime: 0,
            confidenceDistribution: {},
            timeDistribution: {}
        };

        if (log.length === 0) return metrics;

        const confidences = log.map(e => e.prediction.confidence).filter(c => c);
        const times = log.map(e => e.prediction.predictionTime).filter(t => t);

        if (confidences.length > 0) {
            metrics.avgConfidence = Math.round((confidences.reduce((sum, c) => sum + c, 0) / confidences.length) * 100);
        }

        if (times.length > 0) {
            metrics.avgPredictionTime = Math.round(times.reduce((sum, t) => sum + t, 0) / times.length);
        }

        return metrics;
    },

    // Analyze style-specific accuracy
    analyzeStyleAccuracy(log) {
        const styleStats = {};

        for (let entry of log) {
            const style = entry.prediction.top1;
            if (!styleStats[style]) {
                styleStats[style] = { total: 0, correct: 0 };
            }

            styleStats[style].total++;
            if (entry.correction.correctionType === 'no_correction') {
                styleStats[style].correct++;
            }
        }

        // Calculate accuracy rates
        const accuracyRates = {};
        for (let [style, stats] of Object.entries(styleStats)) {
            accuracyRates[style] = {
                accuracy: Math.round((stats.correct / stats.total) * 100),
                sampleSize: stats.total
            };
        }

        return {
            byStyle: accuracyRates,
            topAccurate: Object.entries(accuracyRates)
                .filter(([,stats]) => stats.sampleSize >= 3)
                .sort(([,a], [,b]) => b.accuracy - a.accuracy)
                .slice(0, 10),
            needsWork: Object.entries(accuracyRates)
                .filter(([,stats]) => stats.sampleSize >= 3 && stats.accuracy < 70)
                .sort(([,a], [,b]) => a.accuracy - b.accuracy)
                .slice(0, 10)
        };
    },

    // Analyze trends over time
    analyzeTrends(log) {
        // Group by day
        const dailyStats = {};

        for (let entry of log) {
            const date = new Date(entry.timestamp).toISOString().split('T')[0];
            if (!dailyStats[date]) {
                dailyStats[date] = { total: 0, correct: 0 };
            }

            dailyStats[date].total++;
            if (entry.correction.correctionType === 'no_correction') {
                dailyStats[date].correct++;
            }
        }

        const trends = Object.entries(dailyStats).map(([date, stats]) => ({
            date,
            accuracy: Math.round((stats.correct / stats.total) * 100),
            volume: stats.total
        }));

        return trends.sort((a, b) => a.date.localeCompare(b.date));
    },

    // Generate improvement recommendations
    generateRecommendations(log) {
        const patterns = this.analyzeCorrectionPatterns(log);
        const styles = this.analyzeStyleAccuracy(log);
        const recommendations = [];

        // High confusion styles
        if (patterns.topConfusionPairs.length > 0) {
            const topConfusion = patterns.topConfusionPairs[0];
            recommendations.push({
                type: 'confusion_fix',
                priority: 'high',
                description: `Top confusion: ${topConfusion.pair} (${topConfusion.count} times)`,
                action: 'Add discriminative features or training data'
            });
        }

        // Low accuracy styles
        if (styles.needsWork.length > 0) {
            const worstStyle = styles.needsWork[0];
            recommendations.push({
                type: 'accuracy_improvement',
                priority: 'medium',
                description: `${worstStyle[0]}: ${worstStyle[1].accuracy}% accuracy`,
                action: 'Review feature weights and training examples'
            });
        }

        // Family corrections
        if (patterns.familyCorrectionRate > 20) {
            recommendations.push({
                type: 'family_refinement',
                priority: 'medium',
                description: `${patterns.familyCorrectionRate}% family-level corrections`,
                action: 'Improve intra-family discrimination features'
            });
        }

        return recommendations;
    },

    // Utility functions
    getDateRange(log) {
        if (log.length === 0) return null;
        const dates = log.map(e => e.timestamp).sort((a, b) => a - b);
        return {
            start: new Date(dates[0]).toISOString().split('T')[0],
            end: new Date(dates[dates.length - 1]).toISOString().split('T')[0],
            days: Math.ceil((dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24)) + 1
        };
    },

    countMotorVersions(log) {
        const versions = {};
        for (let entry of log) {
            const version = entry.motorVersion;
            versions[version] = (versions[version] || 0) + 1;
        }
        return versions;
    },

    // Style family definitions for correction classification
    getStyleFamilies() {
        return [
            {
                name: 'Belgian Ales',
                styles: ['belgian_dubbel', 'belgian_tripel', 'belgian_golden_strong', 'belgian_pale', 'belgian_dark_strong']
            },
            {
                name: 'Belgian Wheat',
                styles: ['belgian_witbier', 'belgian_white']
            },
            {
                name: 'American IPA',
                styles: ['american_ipa', 'double_ipa', 'session_ipa', 'juicy_ipa', 'hazy_ipa']
            },
            {
                name: 'German Lagers',
                styles: ['german_pilsner', 'munich_helles', 'marzen', 'oktoberfest']
            },
            {
                name: 'German Wheat',
                styles: ['weissbier', 'hefeweizen', 'weizenbock', 'kristalweizen']
            },
            {
                name: 'English Ales',
                styles: ['english_bitter', 'english_mild', 'english_ipa', 'english_barleywine']
            },
            {
                name: 'Stouts & Porters',
                styles: ['dry_stout', 'sweet_stout', 'imperial_stout', 'baltic_porter', 'robust_porter']
            }
        ];
    },

    // Enhanced export with analytics
    exportEnhancedFeedback() {
        try {
            const analytics = this.generateAnalytics();
            const rawData = JSON.parse(localStorage.getItem('bm_v6_feedback') || '[]');

            const exportData = {
                meta: {
                    exportDate: new Date().toISOString(),
                    version: 'V6_Enhanced',
                    totalRecords: rawData.length
                },
                analytics: analytics,
                rawFeedback: rawData
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `brewmaster_v6_feedback_enhanced_${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('📊 Enhanced feedback data exported');
            return true;

        } catch (error) {
            console.error('❌ Export error:', error);
            return false;
        }
    },

    // Display analytics in console (development)
    displayAnalytics() {
        const analytics = this.generateAnalytics();
        if (!analytics) return;

        console.log('\n📊 BREWMASTER V6 FEEDBACK ANALYTICS');
        console.log('=' .repeat(50));

        console.log('\n📈 Summary:');
        console.log(`  Total feedbacks: ${analytics.summary.totalFeedbacks}`);
        console.log(`  Unique sessions: ${analytics.summary.totalSessions}`);
        if (analytics.summary.dateRange) {
            console.log(`  Date range: ${analytics.summary.dateRange.start} to ${analytics.summary.dateRange.end}`);
        }

        console.log('\n🎯 Accuracy:');
        console.log(`  No correction needed: ${analytics.corrections.noCorrectionRate}%`);
        console.log(`  Family-level corrections: ${analytics.corrections.familyCorrectionRate}%`);
        console.log(`  Major corrections: ${analytics.corrections.familyChangeRate}%`);

        console.log('\n⚡ Performance:');
        console.log(`  Average confidence: ${analytics.performance.avgConfidence}%`);
        console.log(`  Average prediction time: ${analytics.performance.avgPredictionTime}ms`);

        if (analytics.corrections.topConfusionPairs.length > 0) {
            console.log('\n❌ Top Confusion Pairs:');
            analytics.corrections.topConfusionPairs.slice(0, 5).forEach((pair, i) => {
                console.log(`  ${i+1}. ${pair.pair} (${pair.count} times)`);
            });
        }

        if (analytics.recommendations.length > 0) {
            console.log('\n💡 Recommendations:');
            analytics.recommendations.forEach((rec, i) => {
                console.log(`  ${i+1}. [${rec.priority.toUpperCase()}] ${rec.description}`);
                console.log(`     → ${rec.action}`);
            });
        }

        console.log('\n🔧 Use: FAZ6B_ENHANCED_FEEDBACK.exportEnhancedFeedback() to download full analytics');
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.FAZ6B_ENHANCED_FEEDBACK = FAZ6B_ENHANCED_FEEDBACK;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FAZ6B_ENHANCED_FEEDBACK;
}