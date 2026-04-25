// FAZ 6B: Enhanced Feedback UI Integration
// Enhances existing V2c feedback system for V6 motor

const FAZ6B_UI_INTEGRATION = {

    // Enhanced feedback UI HTML template
    createEnhancedFeedbackUI() {
        return `
        <div id="enhanced-feedback-section" style="
            margin-top: 20px;
            padding: 15px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 8px;
            border-left: 4px solid #28a745;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        ">
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <h4 style="margin: 0; color: #495057; font-size: 16px;">
                    📊 Feedback & Analytics
                </h4>
                <span style="
                    margin-left: auto;
                    font-size: 12px;
                    color: #6c757d;
                    background: #fff;
                    padding: 2px 8px;
                    border-radius: 12px;
                ">V6 Enhanced</span>
            </div>

            <div id="feedback-content" style="display: none;">
                <div style="margin-bottom: 15px; padding: 10px; background: white; border-radius: 5px; border: 1px solid #dee2e6;">
                    <div style="font-weight: bold; margin-bottom: 5px; color: #495057;">Prediction Results:</div>
                    <div id="prediction-summary" style="font-size: 14px; color: #6c757d;"></div>
                </div>

                <div style="margin-bottom: 15px;">
                    <div style="font-weight: bold; margin-bottom: 8px; color: #495057;">Was this prediction correct?</div>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button onclick="handleFeedback('correct')" style="
                            background: #28a745;
                            color: white;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 5px;
                            cursor: pointer;
                            font-size: 14px;
                            transition: all 0.3s;
                        " onmouseover="this.style.background='#218838'" onmouseout="this.style.background='#28a745'">
                            ✅ Doğru
                        </button>

                        <button onclick="handleFeedback('close')" style="
                            background: #ffc107;
                            color: #212529;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 5px;
                            cursor: pointer;
                            font-size: 14px;
                            transition: all 0.3s;
                        " onmouseover="this.style.background='#e0a800'" onmouseout="this.style.background='#ffc107'">
                            ⚠️ Yakın
                        </button>

                        <button onclick="showStyleSelector()" style="
                            background: #dc3545;
                            color: white;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 5px;
                            cursor: pointer;
                            font-size: 14px;
                            transition: all 0.3s;
                        " onmouseover="this.style.background='#c82333'" onmouseout="this.style.background='#dc3545'">
                            ❌ Başka Stil
                        </button>
                    </div>
                </div>

                <div id="style-selector" style="display: none; margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                    <div style="font-weight: bold; margin-bottom: 8px; color: #495057;">Doğru stil hangisi?</div>
                    <select id="correct-style-select" style="
                        width: 100%;
                        padding: 8px;
                        border: 1px solid #ced4da;
                        border-radius: 4px;
                        font-size: 14px;
                        margin-bottom: 10px;
                    ">
                        <option value="">Stil seçiniz...</option>
                    </select>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="submitCorrection()" style="
                            background: #007bff;
                            color: white;
                            border: none;
                            padding: 6px 12px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 14px;
                        ">💾 Kaydet</button>
                        <button onclick="cancelCorrection()" style="
                            background: #6c757d;
                            color: white;
                            border: none;
                            padding: 6px 12px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 14px;
                        ">❌ İptal</button>
                    </div>
                </div>

                <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #dee2e6;">
                    <div style="display: flex; gap: 10px; flex-wrap: wrap; font-size: 13px;">
                        <button onclick="showAnalytics()" style="
                            background: #17a2b8;
                            color: white;
                            border: none;
                            padding: 5px 10px;
                            border-radius: 3px;
                            cursor: pointer;
                            font-size: 12px;
                        ">📊 Analytics</button>

                        <button onclick="exportFeedback()" style="
                            background: #6f42c1;
                            color: white;
                            border: none;
                            padding: 5px 10px;
                            border-radius: 3px;
                            cursor: pointer;
                            font-size: 12px;
                        ">💾 Export Data</button>

                        <span style="color: #6c757d; margin-left: auto; font-size: 11px;">
                            Session: <span id="session-id-display"></span>
                        </span>
                    </div>
                </div>
            </div>

            <div id="feedback-trigger" style="text-align: center;">
                <button onclick="activateFeedback()" style="
                    background: #28a745;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.3s;
                " onmouseover="this.style.background='#218838'" onmouseout="this.style.background='#28a745'">
                    📝 Feedback Ver
                </button>
            </div>
        </div>`;
    },

    // Style definitions for dropdown
    getStyleDefinitions() {
        return [
            { slug: 'american_ipa', label: 'American IPA' },
            { slug: 'belgian_dubbel', label: 'Belgian Dubbel' },
            { slug: 'belgian_tripel', label: 'Belgian Tripel' },
            { slug: 'belgian_witbier', label: 'Belgian Witbier' },
            { slug: 'german_pilsner', label: 'German Pilsner' },
            { slug: 'munich_helles', label: 'Munich Helles' },
            { slug: 'weissbier', label: 'German Hefeweizen' },
            { slug: 'american_pale_ale', label: 'American Pale Ale' },
            { slug: 'english_bitter', label: 'English Bitter' },
            { slug: 'dry_stout', label: 'Irish Dry Stout' },
            { slug: 'imperial_stout', label: 'Imperial Stout' },
            { slug: 'double_ipa', label: 'Double/Imperial IPA' },
            { slug: 'saison', label: 'Saison' },
            { slug: 'belgian_golden_strong', label: 'Belgian Golden Strong' },
            { slug: 'oktoberfest', label: 'Oktoberfest/Märzen' },
            { slug: 'czech_pilsner', label: 'Czech Pilsner' },
            { slug: 'kolsch', label: 'Kölsch' },
            { slug: 'altbier', label: 'German Altbier' },
            { slug: 'porter', label: 'Porter' },
            { slug: 'brown_ale', label: 'Brown Ale' },
            // Add more as needed
        ].sort((a, b) => a.label.localeCompare(b.label));
    },

    // Integration functions for browser
    createBrowserIntegration() {
        return `
        <script>
        // FAZ 6B: Enhanced Feedback Integration Functions

        let currentPredictionData = null;

        // Activate feedback collection
        function activateFeedback() {
            const trigger = document.getElementById('feedback-trigger');
            const content = document.getElementById('feedback-content');
            const sessionDisplay = document.getElementById('session-id-display');

            if (!currentPredictionData) {
                alert('Önce bir tahmin yapın!');
                return;
            }

            trigger.style.display = 'none';
            content.style.display = 'block';

            // Show session ID
            const sessionId = FAZ6B_ENHANCED_FEEDBACK.getSessionId();
            sessionDisplay.textContent = sessionId.substr(-8);

            // Populate prediction summary
            const summary = document.getElementById('prediction-summary');
            summary.innerHTML = \`
                <strong>Tahmin:</strong> \${currentPredictionData.top1Style} (\${currentPredictionData.confidence}%)<br>
                <strong>Top 3:</strong> \${currentPredictionData.top3Styles.join(', ')}<br>
                <strong>Süre:</strong> \${currentPredictionData.predictionTime}ms
            \`;

            // Populate style selector
            populateStyleSelector();
        }

        // Handle feedback buttons
        function handleFeedback(type) {
            if (!currentPredictionData) return;

            const feedbackData = {
                motorVersion: 'V6',
                recipeSignature: currentPredictionData.recipeSignature,
                predictedStyle: currentPredictionData.top1Style,
                correctStyle: currentPredictionData.top1Style, // Same as predicted
                correctLabel: getStyleLabel(currentPredictionData.top1Style),
                confidence: currentPredictionData.confidence,
                predictionTime: currentPredictionData.predictionTime,
                top3Styles: currentPredictionData.top3Styles,
                abv: currentPredictionData.recipe.abv,
                srm: currentPredictionData.recipe.srm,
                ibu: currentPredictionData.recipe.ibu,
                og_plato: currentPredictionData.recipe.og_plato
            };

            if (type === 'correct') {
                // No correction needed
                FAZ6B_ENHANCED_FEEDBACK.saveFeedback(feedbackData);
                showFeedbackMessage('✅ Teşekkürler! Feedback kaydedildi.', 'success');
            } else if (type === 'close') {
                // Close but not exact - still save as correct for now
                FAZ6B_ENHANCED_FEEDBACK.saveFeedback(feedbackData);
                showFeedbackMessage('⚠️ Yakın tahmin olarak kaydedildi.', 'warning');
            }

            resetFeedbackUI();
        }

        // Show style selector
        function showStyleSelector() {
            document.getElementById('style-selector').style.display = 'block';
        }

        // Populate style selector dropdown
        function populateStyleSelector() {
            const select = document.getElementById('correct-style-select');
            const styles = FAZ6B_UI_INTEGRATION.getStyleDefinitions();

            select.innerHTML = '<option value="">Stil seçiniz...</option>';
            styles.forEach(style => {
                const option = document.createElement('option');
                option.value = style.slug;
                option.textContent = style.label;
                select.appendChild(option);
            });
        }

        // Submit correction
        function submitCorrection() {
            const select = document.getElementById('correct-style-select');
            const correctStyle = select.value;

            if (!correctStyle) {
                alert('Lütfen doğru stili seçin!');
                return;
            }

            const feedbackData = {
                motorVersion: 'V6',
                recipeSignature: currentPredictionData.recipeSignature,
                predictedStyle: currentPredictionData.top1Style,
                correctStyle: correctStyle,
                correctLabel: getStyleLabel(correctStyle),
                confidence: currentPredictionData.confidence,
                predictionTime: currentPredictionData.predictionTime,
                top3Styles: currentPredictionData.top3Styles,
                abv: currentPredictionData.recipe.abv,
                srm: currentPredictionData.recipe.srm,
                ibu: currentPredictionData.recipe.ibu,
                og_plato: currentPredictionData.recipe.og_plato
            };

            FAZ6B_ENHANCED_FEEDBACK.saveFeedback(feedbackData);
            showFeedbackMessage(\`✅ Düzeltme kaydedildi: \${getStyleLabel(correctStyle)}\`, 'success');
            resetFeedbackUI();
        }

        // Cancel correction
        function cancelCorrection() {
            document.getElementById('style-selector').style.display = 'none';
        }

        // Show analytics
        function showAnalytics() {
            FAZ6B_ENHANCED_FEEDBACK.displayAnalytics();
            showFeedbackMessage('📊 Analytics console\'da gösteriliyor', 'info');
        }

        // Export feedback data
        function exportFeedback() {
            const success = FAZ6B_ENHANCED_FEEDBACK.exportEnhancedFeedback();
            if (success) {
                showFeedbackMessage('💾 Feedback data indiriliyor', 'success');
            } else {
                showFeedbackMessage('❌ Export hatası', 'error');
            }
        }

        // Utility functions
        function getStyleLabel(styleSlug) {
            const styles = FAZ6B_UI_INTEGRATION.getStyleDefinitions();
            const style = styles.find(s => s.slug === styleSlug);
            return style ? style.label : styleSlug;
        }

        function showFeedbackMessage(message, type) {
            // Create temporary message
            const messageDiv = document.createElement('div');
            messageDiv.innerHTML = message;
            messageDiv.style.cssText = \`
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 10px 15px;
                border-radius: 5px;
                color: white;
                font-weight: bold;
                z-index: 10000;
                transition: all 0.3s;
                \${type === 'success' ? 'background: #28a745;' :
                  type === 'warning' ? 'background: #ffc107; color: #212529;' :
                  type === 'error' ? 'background: #dc3545;' : 'background: #17a2b8;'}
            \`;

            document.body.appendChild(messageDiv);

            setTimeout(() => {
                messageDiv.style.opacity = '0';
                setTimeout(() => document.body.removeChild(messageDiv), 300);
            }, 3000);
        }

        function resetFeedbackUI() {
            document.getElementById('feedback-trigger').style.display = 'block';
            document.getElementById('feedback-content').style.display = 'none';
            document.getElementById('style-selector').style.display = 'none';
        }

        // Hook into V6 prediction function to capture data
        const originalV6Prediction = window.runV6StylePrediction;
        window.runV6StylePrediction = function() {
            const startTime = performance.now();
            const result = originalV6Prediction();
            const endTime = performance.now();

            // Capture prediction data for feedback
            const features = extractV6Features();
            currentPredictionData = {
                top1Style: result?.predictions?.[0]?.style || 'unknown',
                confidence: Math.round((result?.predictions?.[0]?.confidence || 0) * 100),
                top3Styles: result?.predictions?.slice(0,3)?.map(p => p.style) || [],
                predictionTime: Math.round(endTime - startTime),
                recipeSignature: generateRecipeSignature(features),
                recipe: {
                    abv: features.abv || 0,
                    srm: features.srm || 0,
                    ibu: features.ibu || 0,
                    og_plato: features.og_plato || 0
                }
            };

            // Enable feedback button
            const feedbackSection = document.getElementById('enhanced-feedback-section');
            if (feedbackSection) {
                feedbackSection.style.display = 'block';
            }

            return result;
        };

        function generateRecipeSignature(features) {
            return \`\${features.abv || 0}|\${features.srm || 0}|\${features.ibu || 0}|\${Date.now()}\`;
        }

        console.log('📊 Enhanced Feedback System loaded');
        </script>`;
    },

    // Integration into existing Brewmaster HTML
    integrateIntoBrewmaster() {
        const integrationScript = `
        // FAZ 6B: Auto-integrate enhanced feedback system
        (function() {
            // Find V6 motor section and add enhanced feedback
            const v6Section = document.querySelector('[style*="#4169e1"]')?.closest('div');
            if (v6Section) {
                const feedbackHTML = \`${this.createEnhancedFeedbackUI()}\`;
                v6Section.insertAdjacentHTML('afterend', feedbackHTML);
                console.log('✅ Enhanced feedback UI integrated');
            }

            // Add integration functions
            ${this.createBrowserIntegration()}
        })();`;

        return integrationScript;
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.FAZ6B_UI_INTEGRATION = FAZ6B_UI_INTEGRATION;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FAZ6B_UI_INTEGRATION;
}