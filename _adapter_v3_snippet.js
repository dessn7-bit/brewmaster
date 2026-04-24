
  // ══ FAZ 4 — V3 Hiyerarşik motor paralel cagrisi ══
  var __top3V3_engine = null;
  var __v3_classification = null;
  try {
    if (window.BM_ENGINE_V3 && window.BM_ENGINE_V3.classifyHierarchical && typeof __recipeV2 !== 'undefined') {
      const __v3Result = window.BM_ENGINE_V3.classifyHierarchical(__recipeV2, { topN: 3 });
      __top3V3_engine = __v3Result.top3;
      __v3_classification = __v3Result;
      console.log('%c[BM V3] Hiyerarşik motor', 'background:#5A8F3E;color:#fff;padding:2px 6px;');
      console.log('  Seviye 1 (ferm_type):', __v3Result.ferm_type, '[' + (__v3Result.levels['1']?.reason||'') + ']');
      console.log('  Seviye 2 (family):   ', __v3Result.family, '[score=' + (__v3Result.levels['2']?.chosen_score||0) + ']');
      console.log('  Seviye 3 (top-3):');
      (__v3Result.top3||[]).forEach((r,i)=>console.log('    '+(i+1)+'. '+r.slug+' ('+r.displayTR+') %'+r.normalized));
      window.__lastV3Result = __v3Result;
    }
  } catch(e) { console.warn('[BM V3] motor hatasi:', e && e.message); }
