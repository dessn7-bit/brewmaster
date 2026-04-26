(async function bmBaseline19V6() {
  const REPORT = { meta:{}, env:{}, results:[], errors:[] };
  REPORT.meta.timestamp = new Date().toISOString();
  REPORT.meta.step = "19-baseline-v6";
  REPORT.meta.url = location.href;

  // ---- 1. PRE-CHECKS ----
  const need = {
    BM_ENGINE_V6_FINAL: typeof window.BM_ENGINE_V6_FINAL === "object" && typeof window.BM_ENGINE_V6_FINAL.classifyMulti === "function",
    KR: typeof KR !== "undefined" && Array.isArray(KR),
    S: typeof S === "object" && S !== null,
    calc: typeof calc === "function",
    rEditorGenel: typeof rEditorGenel === "function",
    render: typeof render === "function",
    MAYALAR: typeof MAYALAR !== "undefined" && Array.isArray(MAYALAR),
  };
  REPORT.env = need;
  const missing = Object.entries(need).filter(([_,v])=>!v).map(([k])=>k);
  if (missing.length) {
    console.error("[bm19] Eksik global'ler:", missing);
    REPORT.aborted = true;
    REPORT.reason = "missing_globals";
    REPORT.missing = missing;
    finalize(REPORT);
    return;
  }
  if (KR.length === 0) {
    console.warn("[bm19] KR boş — reçete yok.");
    REPORT.aborted = true;
    REPORT.reason = "empty_KR";
    finalize(REPORT);
    return;
  }

  console.log(`[bm19] Baseline başlıyor — ${KR.length} reçete (V6 only, pool filtre yok)`);

  // ---- 2. S BACKUP ----
  const S_BACKUP = JSON.parse(JSON.stringify(S));
  const _editId_backup = (typeof _editId !== "undefined") ? _editId : undefined;
  const t0 = performance.now();

  // ---- 3. ITERASYON ----
  for (let i = 0; i < KR.length; i++) {
    const r = KR[i];
    const row = {
      id: r && r.id,
      biraAd: r && r.biraAd,
      stil_user: (r && r.stil) || "",   // kullanıcının manuel etiketi (varsa) — referans
      mayaId: r && r.mayaId,
      maya2Id: (r && r.maya2Id) || "",
      ozet: null,
      v6: null,
    };

    try {
      // İzole klon + override bypass
      const klon = JSON.parse(JSON.stringify(r));
      klon.stil = "";
      for (const k in S) delete S[k];
      Object.assign(S, klon);

      // calc()
      let c;
      try {
        c = calc();
        row.ozet = {
          og: +c.og.toFixed(3),
          fg: +c.fg.toFixed(3),
          abv: +c.abv.toFixed(2),
          ibu: +c.ibu.toFixed(0),
          srm: +c.srm.toFixed(1),
        };
      } catch(e) {
        REPORT.errors.push({ id:r.id, phase:"calc", error: String(e && e.message || e) });
        row.v6 = { ok:false, error:"calc failed" };
        REPORT.results.push(row);
        continue;
      }

      // rEditorGenel köprüsü — V6'yı tetikler, window.__lastV6Result'a yazar
      try {
        try { window.__lastV6Result = null; } catch(e){}
        rEditorGenel(c.og, c.ogKaynak, c.srm, c.ibu, c.maya, c.fg, c.fgKaynak, c.abv, c.rk, '');
      } catch(e) {
        REPORT.errors.push({ id:r.id, phase:"rEditorGenel", error: String(e && e.message || e) });
      }

      // V6 sonuç oku
      try {
        const lr = window.__lastV6Result;
        const t3 = (lr && lr.top3 && Array.isArray(lr.top3)) ? lr.top3 : [];
        const top = t3.slice(0,3).map(x => ({
          slug: x && (x.slug || x.id || x.label),
          displayTR: x && x.displayTR,
          score: x && (typeof x.score === "number" ? +x.score.toFixed(4) : x.score),
          confidence: x && x.confidence,
        }));
        row.v6 = { ok:true, top };
      } catch(e) {
        row.v6 = { ok:false, error: String(e && e.message || e) };
      }

      REPORT.results.push(row);
    } catch(e) {
      REPORT.errors.push({ id:r.id, phase:"outer", error: String(e && e.message || e) });
    }
  }

  REPORT.meta.elapsed_ms = Math.round(performance.now() - t0);

  // ---- 4. S RESTORE ----
  try {
    for (const k in S) delete S[k];
    Object.assign(S, S_BACKUP);
    if (typeof _editId !== "undefined") {
      try { _editId = _editId_backup; } catch(e){}
    }
    if (typeof render === "function") render();
    console.log("[bm19] S restore + render OK");
  } catch(e) {
    console.error("[bm19] S restore HATA:", e);
    REPORT.errors.push({ phase:"restore", error: String(e && e.message || e) });
  }

  finalize(REPORT);

  // ---- 5. FINAL ----
  function finalize(R) {
    const md = renderMarkdown(R);
    try { localStorage.setItem("_bm_baseline_step_19_v6_result", JSON.stringify(R)); } catch(e){}
    try {
      const blob = new Blob([md], { type:"text/markdown;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "baseline_step_19_v6_report.md";
      document.body.appendChild(a); a.click(); a.remove();
    } catch(e) {
      console.error("[bm19] İndirme hatası:", e);
    }
    console.log("[bm19] DONE. Süre:", R.meta && R.meta.elapsed_ms, "ms");
    if (!R.aborted && R.results) {
      console.table(R.results.map(r => ({
        biraAd: r.biraAd,
        gt_user: r.stil_user || "(boş)",
        og: r.ozet && r.ozet.og,
        srm: r.ozet && r.ozet.srm,
        abv: r.ozet && r.ozet.abv,
        v6_top1: r.v6 && r.v6.ok && r.v6.top[0] ? (r.v6.top[0].displayTR || r.v6.top[0].slug) : "ERR",
        v6_top1_pct: r.v6 && r.v6.ok && r.v6.top[0] ? r.v6.top[0].confidence : "-",
        v6_top2: r.v6 && r.v6.ok && r.v6.top[1] ? (r.v6.top[1].displayTR || r.v6.top[1].slug) : "-",
        v6_top3: r.v6 && r.v6.ok && r.v6.top[2] ? (r.v6.top[2].displayTR || r.v6.top[2].slug) : "-",
      })));
    } else if (R.aborted) {
      console.warn("[bm19] ABORT:", R.reason, R.missing || "");
    }
    console.log("[bm19] Full report → localStorage._bm_baseline_step_19_v6_result");
    if (R.errors && R.errors.length) console.warn("[bm19]", R.errors.length, "hata var, raporda detay");
  }

  function renderMarkdown(R) {
    const L = [];
    L.push("# Baseline Step 19 — V6 Motor (FIX ÖNCESİ)");
    L.push("");
    L.push("**Tarih:** " + R.meta.timestamp);
    L.push("**URL:** " + R.meta.url);
    L.push("**Süre:** " + R.meta.elapsed_ms + " ms");
    L.push("**Reçete sayısı:** " + (R.results ? R.results.length : 0));
    L.push("");
    if (R.aborted) {
      L.push("## ABORT");
      L.push("- Sebep: " + R.reason);
      if (R.missing) L.push("- Eksik: " + R.missing.join(", "));
      return L.join("\n");
    }
    L.push("## Per-recipe V6 top-3");
    L.push("");
    for (const r of R.results) {
      const m = (typeof MAYALAR !== "undefined")
        ? (MAYALAR.find(y=>y && y.id===r.mayaId) || null)
        : null;
      const m2 = (r.maya2Id && typeof MAYALAR !== "undefined")
        ? (MAYALAR.find(y=>y && y.id===r.maya2Id) || null)
        : null;
      L.push("### " + (r.biraAd || "(isimsiz)") + "  `" + r.id + "`");
      if (r.stil_user) L.push("- **Kullanıcı stil etiketi (S.stil):** " + r.stil_user);
      else            L.push("- **Kullanıcı stil etiketi:** (boş — Otomatik)");
      if (r.ozet) {
        L.push("- **Ozet:** OG " + r.ozet.og + " | FG " + r.ozet.fg + " | ABV %" + r.ozet.abv + " | IBU " + r.ozet.ibu + " | SRM " + r.ozet.srm);
      }
      L.push("- **Maya:** " + (m ? (m.ad + " (" + m.tip + ")") : (r.mayaId || "(yok)")) + (m2 ? " + " + m2.ad + " (" + m2.tip + ")" : ""));
      if (r.v6 && r.v6.ok && r.v6.top.length) {
        L.push("- **V6 top-3:**");
        r.v6.top.forEach((t,i) => {
          L.push("  " + (i+1) + ". `" + t.slug + "`" + (t.displayTR ? " — " + t.displayTR : "") + " — confidence " + (t.confidence != null ? t.confidence + "%" : "(?)") + (t.score != null ? " (score " + t.score + ")" : ""));
        });
      } else if (r.v6 && r.v6.error) {
        L.push("- **V6:** ❌ HATA — " + r.v6.error);
      } else {
        L.push("- **V6:** (sonuç yok)");
      }
      L.push("");
      L.push("**Kullanıcı doğru stil etiketi (manuel doldur):** _____________");
      L.push("");
      L.push("---");
      L.push("");
    }

    L.push("## Hatalar");
    if (!R.errors.length) L.push("(yok)");
    else for (const er of R.errors) L.push("- [" + er.phase + "] " + (er.id||"") + ": " + er.error);
    L.push("");

    L.push("## Özet tablo");
    L.push("");
    L.push("| # | biraAd | GT (kullanıcı) | OG | SRM | ABV | V6 top-1 | conf% |");
    L.push("|---|---|---|---:|---:|---:|---|---:|");
    R.results.forEach((r, i) => {
      const t1 = r.v6 && r.v6.ok && r.v6.top[0] ? (r.v6.top[0].displayTR || r.v6.top[0].slug) : (r.v6 && r.v6.error ? "ERR" : "-");
      const c1 = r.v6 && r.v6.ok && r.v6.top[0] && r.v6.top[0].confidence != null ? r.v6.top[0].confidence : "-";
      L.push("| " + (i+1) + " | " + (r.biraAd||"").replace(/\|/g,"\\|") + " | " + (r.stil_user || "(boş)") + " | " + (r.ozet?r.ozet.og:"-") + " | " + (r.ozet?r.ozet.srm:"-") + " | " + (r.ozet?r.ozet.abv:"-") + " | " + t1 + " | " + c1 + " |");
    });

    return L.join("\n");
  }
})();
