(async function bmBenchmark17B() {
  const REPORT = { meta:{}, env:{}, pool:{}, results:[], aggregate:{}, mismatches:{}, errors:[] };
  REPORT.meta.timestamp = new Date().toISOString();
  REPORT.meta.step = "17B";
  REPORT.meta.url = location.href;

  // ---- 1. PRE-CHECKS ----
  const need = {
    BM_ENGINE: typeof window.BM_ENGINE === "object" && typeof window.BM_ENGINE.findBestMatches === "function",
    BM_ENGINE_V5: typeof window.BM_ENGINE_V5 === "object" && typeof window.BM_ENGINE_V5.classifyMulti === "function",
    BM_ENGINE_V6_FINAL: typeof window.BM_ENGINE_V6_FINAL === "object" && typeof window.BM_ENGINE_V6_FINAL.classifyMulti === "function",
    BJCP: typeof BJCP === "object" && BJCP !== null,
    __BM_DEFS: typeof __BM_DEFS === "object" && __BM_DEFS !== null,
    _v5ToBjcpKey: typeof _v5ToBjcpKey === "function",
    KR: typeof KR !== "undefined" && Array.isArray(KR),
    S: typeof S === "object" && S !== null,
    calc: typeof calc === "function",
    rEditorGenel: typeof rEditorGenel === "function",
    render: typeof render === "function",
  };
  REPORT.env = need;
  const missing = Object.entries(need).filter(([_,v])=>!v).map(([k])=>k);
  if (missing.length) {
    console.error("[bm17b] Eksik global'ler:", missing);
    REPORT.aggregate.aborted = true;
    REPORT.aggregate.reason = "missing_globals";
    REPORT.aggregate.missing = missing;
    finalize(REPORT);
    return;
  }

  // ---- 2. POOL FİLTRE ----
  const pool = KR.filter(r => r && r.stil && String(r.stil).trim() && BJCP[r.stil]);
  const gtUnknown = KR.filter(r => r && r.stil && String(r.stil).trim() && !BJCP[r.stil])
                      .map(r => ({ id:r.id, biraAd:r.biraAd, stil:r.stil }));
  const gtEmpty = KR.filter(r => !r || !r.stil || !String(r.stil).trim()).length;
  REPORT.pool = {
    KR_total: KR.length,
    eligible: pool.length,
    gt_empty_or_auto: gtEmpty,
    gt_unknown_to_BJCP: gtUnknown,
  };
  if (pool.length === 0) {
    REPORT.aggregate.aborted = true;
    REPORT.aggregate.reason = "empty_pool";
    finalize(REPORT);
    return;
  }
  console.log(`[bm17b] Pool: ${pool.length} reçete (toplam ${KR.length}, gt boş ${gtEmpty}, gt BJCP-bilinmez ${gtUnknown.length})`);

  // ---- 3. NORMALIZE ----
  function slugToBjcpName(slug, displayTR) {
    if (!slug) return { name: null, layer: "none" };
    try {
      if (__BM_DEFS[slug] && __BM_DEFS[slug].bjcpName && BJCP[__BM_DEFS[slug].bjcpName]) {
        return { name: __BM_DEFS[slug].bjcpName, layer: "L1_BM_DEFS" };
      }
    } catch(e){}
    try {
      const fuzzy = _v5ToBjcpKey(slug, displayTR);
      if (fuzzy && BJCP[fuzzy]) return { name: fuzzy, layer: "L2_fuzzy" };
    } catch(e){}
    return { name: null, layer: "unmapped" };
  }

  // ---- 4. S BACKUP ----
  const S_BACKUP = JSON.parse(JSON.stringify(S));
  const _editId_backup = (typeof _editId !== "undefined") ? _editId : undefined;

  // ---- 5. ITERASYON ----
  const aggInit = () => ({ n:0, top1:0, top3:0, unmapped:0, error:0 });
  const agg = { v2c:aggInit(), v5:aggInit(), v6:aggInit() };
  const mismatchTally = { v2c:{}, v5:{}, v6:{} };
  const t0 = performance.now();

  for (let i = 0; i < pool.length; i++) {
    const r = pool[i];
    const gt = r.stil;
    const row = { id:r.id, biraAd:r.biraAd, stil_gt:gt, v2c:null, v5:null, v6:null };

    try {
      // S izole klon, override bypass
      const klon = JSON.parse(JSON.stringify(r));
      klon.stil = ""; // manuel override bypass
      // S üzerine assign (referansı korumak için)
      for (const k in S) delete S[k];
      Object.assign(S, klon);

      // calc()
      let c;
      try {
        c = calc();
      } catch(e) {
        REPORT.errors.push({ id:r.id, phase:"calc", error: String(e && e.message || e) });
        agg.v2c.n++; agg.v2c.error++;
        agg.v5.n++; agg.v5.error++;
        agg.v6.n++; agg.v6.error++;
        row.v2c = { ok:false, error:"calc failed" };
        row.v5  = { ok:false, error:"calc failed" };
        row.v6  = { ok:false, error:"calc failed" };
        REPORT.results.push(row);
        continue;
      }

      // rEditorGenel (motorları çağırır, window.__last*'a yazar)
      try {
        // Önceki window.__last* sonuçlarını temizle (cross-recipe sızıntı önleme)
        try { window.__lastV2Result = null; } catch(e){}
        try { window.__lastV6Result = null; } catch(e){}

        rEditorGenel(c.og, c.ogKaynak, c.srm, c.ibu, c.maya, c.fg, c.fgKaynak, c.abv, c.rk, '');
      } catch(e) {
        REPORT.errors.push({ id:r.id, phase:"rEditorGenel", error: String(e && e.message || e) });
        // Devam et — V5'i hala manuel deneyebiliriz
      }

      // V2c sonuç
      try {
        const lr = window.__lastV2Result;
        const arr = (lr && Array.isArray(lr.yeni)) ? lr.yeni : [];
        const top = arr.slice(0,3).map(x => ({
          slug: x && x.slug, displayTR: x && x.displayTR, score: x && x.score,
          ...slugToBjcpName(x && x.slug, x && x.displayTR)
        }));
        row.v2c = { ok:true, top };
        tally("v2c", agg, mismatchTally, top, gt);
      } catch(e) {
        row.v2c = { ok:false, error: String(e && e.message || e) };
        agg.v2c.n++; agg.v2c.error++;
      }

      // V6 sonuç
      try {
        const lr = window.__lastV6Result;
        const t3 = (lr && lr.top3 && Array.isArray(lr.top3)) ? lr.top3 : [];
        const top = t3.slice(0,3).map(x => ({
          slug: x && (x.slug || x.id || x.label),
          displayTR: x && x.displayTR,
          score: x && x.score,
          ...slugToBjcpName(x && (x.slug || x.id || x.label), x && x.displayTR)
        }));
        row.v6 = { ok:true, top };
        tally("v6", agg, mismatchTally, top, gt);
      } catch(e) {
        row.v6 = { ok:false, error: String(e && e.message || e) };
        agg.v6.n++; agg.v6.error++;
      }

      // V5 manuel çağrı
      try {
        const recipeObj = window.__lastV2Result && window.__lastV2Result.recipeObj;
        if (!recipeObj) throw new Error("recipeObj yok (rEditorGenel patladı?)");
        const v5res = window.BM_ENGINE_V5.classifyMulti(recipeObj, { k:5 });
        const t3 = (v5res && v5res.top3 && Array.isArray(v5res.top3)) ? v5res.top3 : [];
        const top = t3.slice(0,3).map(x => ({
          slug: x && (x.slug || x.id || x.label),
          displayTR: x && x.displayTR,
          score: x && x.score,
          ...slugToBjcpName(x && (x.slug || x.id || x.label), x && x.displayTR)
        }));
        row.v5 = { ok:true, top };
        tally("v5", agg, mismatchTally, top, gt);
      } catch(e) {
        row.v5 = { ok:false, error: String(e && e.message || e) };
        agg.v5.n++; agg.v5.error++;
      }

      REPORT.results.push(row);

      if ((i+1) % 25 === 0 || i === pool.length-1) {
        console.log(`[bm17b] ${i+1}/${pool.length}`);
        // microtask yield — UI'yi tıkanmaktan kurtar
        await new Promise(res => setTimeout(res, 0));
      }
    } catch(e) {
      REPORT.errors.push({ id:r.id, phase:"outer", error: String(e && e.message || e) });
    }
  }

  REPORT.meta.elapsed_ms = Math.round(performance.now() - t0);

  // ---- 6. AGGREGATE + MISMATCH ----
  function tally(engine, agg, miss, top, gt) {
    agg[engine].n++;
    const names = top.map(t => t && t.name).filter(Boolean);
    if (names.length === 0) { agg[engine].unmapped++; return; }
    if (top[0] && top[0].name === gt) agg[engine].top1++;
    if (names.includes(gt)) agg[engine].top3++;
    else {
      const wrong = top[0] && top[0].name;
      if (wrong) {
        const k = `${gt} → ${wrong}`;
        miss[engine][k] = (miss[engine][k]||0) + 1;
      }
    }
  }
  REPORT.aggregate = agg;
  REPORT.mismatches = {
    v2c: topN(mismatchTally.v2c, 15),
    v5:  topN(mismatchTally.v5, 15),
    v6:  topN(mismatchTally.v6, 15),
  };
  function topN(o, n){ return Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,n).map(([k,v])=>({pair:k,count:v})); }

  // ---- 7. S RESTORE ----
  try {
    for (const k in S) delete S[k];
    Object.assign(S, S_BACKUP);
    if (typeof _editId !== "undefined") {
      try { _editId = _editId_backup; } catch(e){}
    }
    if (typeof render === "function") render();
    console.log("[bm17b] S restore + render OK");
  } catch(e) {
    console.error("[bm17b] S restore HATA:", e);
    REPORT.errors.push({ phase:"restore", error: String(e && e.message || e) });
  }

  finalize(REPORT);

  // ---- 8. FİNAL ----
  function finalize(R) {
    const md = renderMarkdown(R);
    try { localStorage.setItem("_bm_benchmark_step_17b_result", JSON.stringify(R)); } catch(e){}
    try {
      const blob = new Blob([md], { type:"text/markdown;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "benchmark_step_17b_report.md";
      document.body.appendChild(a); a.click(); a.remove();
    } catch(e) {
      console.error("[bm17b] İndirme hatası:", e);
    }
    console.log("[bm17b] DONE. Süre:", R.meta.elapsed_ms, "ms");
    console.table([
      { motor:"V2c", n:R.aggregate.v2c.n, top1:R.aggregate.v2c.top1, top3:R.aggregate.v2c.top3, unmapped:R.aggregate.v2c.unmapped, error:R.aggregate.v2c.error },
      { motor:"V5",  n:R.aggregate.v5.n,  top1:R.aggregate.v5.top1,  top3:R.aggregate.v5.top3,  unmapped:R.aggregate.v5.unmapped,  error:R.aggregate.v5.error },
      { motor:"V6",  n:R.aggregate.v6.n,  top1:R.aggregate.v6.top1,  top3:R.aggregate.v6.top3,  unmapped:R.aggregate.v6.unmapped,  error:R.aggregate.v6.error },
    ]);
    console.log("[bm17b] Full report → localStorage._bm_benchmark_step_17b_result");
    if (R.errors && R.errors.length) console.warn("[bm17b]", R.errors.length, "hata var, raporda detay");
  }

  function renderMarkdown(R) {
    const L = [];
    L.push("# Benchmark Step 17B — 3 Motor × Kütüphane");
    L.push("");
    L.push("**Tarih:** " + R.meta.timestamp);
    L.push("**URL:** " + R.meta.url);
    L.push("**Süre:** " + R.meta.elapsed_ms + " ms");
    L.push("");
    if (R.aggregate.aborted) {
      L.push("## ABORT");
      L.push("- Sebep: " + R.aggregate.reason);
      if (R.aggregate.missing) L.push("- Eksik: " + R.aggregate.missing.join(", "));
      return L.join("\n");
    }
    L.push("## Pool");
    L.push("- KR_total: " + R.pool.KR_total);
    L.push("- Eligible: " + R.pool.eligible);
    L.push("- gt_empty_or_auto: " + R.pool.gt_empty_or_auto);
    L.push("- gt_unknown_to_BJCP: " + R.pool.gt_unknown_to_BJCP.length);
    if (R.pool.gt_unknown_to_BJCP.length) {
      L.push("");
      L.push("### BJCP-bilinmez ground truth değerleri");
      for (const g of R.pool.gt_unknown_to_BJCP) {
        L.push(`- "${g.stil}" — ${g.biraAd} (${g.id})`);
      }
    }
    L.push("");
    L.push("## Aggregate");
    L.push("");
    L.push("| Motor | N | Top-1 | Top-1 % | Top-3 | Top-3 % | Unmapped | Error |");
    L.push("|---|---:|---:|---:|---:|---:|---:|---:|");
    for (const e of ["v2c","v5","v6"]) {
      const a = R.aggregate[e];
      const p1 = a.n ? (100*a.top1/a.n).toFixed(1) : "-";
      const p3 = a.n ? (100*a.top3/a.n).toFixed(1) : "-";
      L.push(`| ${e.toUpperCase()} | ${a.n} | ${a.top1} | ${p1}% | ${a.top3} | ${p3}% | ${a.unmapped} | ${a.error} |`);
    }
    L.push("");
    L.push("## Top mismatches (gt → wrong-top1)");
    for (const e of ["v2c","v5","v6"]) {
      L.push("### " + e.toUpperCase());
      const m = R.mismatches[e];
      if (!m.length) { L.push("(yok)"); L.push(""); continue; }
      for (const x of m) L.push(`- ${x.pair} ×${x.count}`);
      L.push("");
    }
    L.push("## Hatalar");
    if (!R.errors.length) L.push("(yok)");
    else for (const er of R.errors) L.push(`- [${er.phase}] ${er.id||""}: ${er.error}`);
    L.push("");
    L.push("## Per-recipe detay");
    L.push("");
    L.push("| ID | biraAd | GT | V2c top-1 | V5 top-1 | V6 top-1 | V2c hit | V5 hit | V6 hit |");
    L.push("|---|---|---|---|---|---|---|---|---|");
    for (const r of R.results) {
      const t1 = x => (x && x.ok && x.top && x.top[0]) ? (x.top[0].name || `(${x.top[0].slug})`) : (x && x.error ? "ERR" : "-");
      const h1 = (x,gt) => (x && x.ok && x.top && x.top[0] && x.top[0].name===gt) ? "✅" : (x && x.ok && x.top && x.top.some(t=>t&&t.name===gt) ? "top3" : "-");
      L.push(`| ${r.id} | ${(r.biraAd||"").replace(/\|/g,"\\|")} | ${r.stil_gt} | ${t1(r.v2c)} | ${t1(r.v5)} | ${t1(r.v6)} | ${h1(r.v2c,r.stil_gt)} | ${h1(r.v5,r.stil_gt)} | ${h1(r.v6,r.stil_gt)} |`);
    }
    return L.join("\n");
  }
})();
