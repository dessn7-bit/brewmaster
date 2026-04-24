
  // ══ FAZ 2c — Yeni motor paralel cagrisi (eski sistemin yaninda calisir) ══
  var __top3V2_engine = null;  // render template'inde kullanilacak
  try {
    if (window.BM_ENGINE && window.BM_ENGINE.findBestMatches) {
      // Reset recipe objesini yeni motor formatina donustur
      const __recipeV2 = {
        _og:_og, _fg:_fg, _ibu:_ibu, _srm:_srm, _abv:_abv, _mayaTip:_mayaTip,
        mayaId: S.mayaId||'', maya2Id: S.maya2Id||'',
        hopIds:   (S.hoplar   ||[]).map(h=>h&&h.id).filter(Boolean),
        maltIds:  (S.maltlar  ||[]).map(m=>m&&m.id).filter(Boolean),
        katkiIds: (S.katkilar ||[]).map(k=>k&&k.id).filter(Boolean),
        percents: {
          pilsnerPct:  _pctOf(/pilsner|pils|bohem|bel_pils|best_heidel|best_pale|briess_pale|chateau_pils|extra_pale|golden_promise|maris|pale_ale|synergy|thracian|viking_pale|viking_pils/i),
          wheatPct:    _pctOf(/wheat|bugday|weizen|weyermann_wheat|chateau_wheat|best_wheat/i),
          oatsWheatPct:_pctOf(/wheat|bugday|weizen|oat|yulaf/i),
          oatsPct:     _pctOf(/oat|yulaf/i),
          munichPct:   _pctOf(/munich|muenchner|munchner|weyermann_munich|best_munich/i),
          viennaPct:   _pctOf(/vienna|viyana|weyermann_vienna|best_vienna/i),
          crystalPct:  _pctOf(/crystal|caramel|cara[_-]?|kristal|caravienna|caramunich|carahell|caraamber|caraaroma/i),
          chocPct:     _pctOf(/choc|chocolate|cikolata|carafa|dehusked/i),
          roastPct:    _pctOf(/roast|kavrulmus|black|siyah|patent/i),
          cornPct:     _pctOf(/corn|misir|mais|flaked_corn/i),
          ricePct:     _pctOf(/rice|pirinc/i),
          sugarPct:    _pctOf(/sugar|seker|candi|candy|nobet|demerara|turbinado|molasses/i),
          aromaticMunichPct: _pctOf(/aromatic|melanoid/i),
          aromaticAbbeyMunichPct: _pctOf(/aromatic|abbey|special_b/i),
          baseMaltPct: _pctOf(/pilsner|pils|pale|maris|munich|vienna|best_heidel|golden|wheat/i),
        },
        lactose:   _hasKatki(/laktoz|lactose/i),
        filtered:  _hasFiltrasyon,
        aged:      (S.brewLog||[]).some(e=>e && e.tip==="aging"),
        dhPer10L:  0,
        blended:   false,
      };
      const __top3V2 = window.BM_ENGINE.findBestMatches(__recipeV2, 5);
      __top3V2_engine = __top3V2;  // UI render icin scope'a cikar
      // Eski sistem vs yeni sistem paralel log
      console.log('%c[BM V2c] Yeni motor vs Eski sistem', 'background:#0a6;color:#fff;padding:2px 6px;');
      console.log('  Eski kazanan:', stil_tah);
      console.log('  Yeni top-5  :');
      __top3V2.forEach((r,i)=>console.log('    '+(i+1)+'. '+r.slug+' ('+r.displayTR+') %'+r.normalized+' score='+r.score+(r._boosted?' [boost:'+r._boosted+']':'')));
      window.__lastV2Result = { eski: stil_tah, yeni: __top3V2, recipeObj: __recipeV2 };
    }
  } catch(e) { console.warn('[BM V2c] motor hatasi:', e && e.message); }
