const ALLOWED_ORIGIN = 'https://dessn7-bit.github.io';

// #6 Sertlestirme: origin allowlist (Origin varsa) + shared-secret (env.WORKER_SECRET).
// Secret AYARLI DEGILSE fail-open (kod deploy edilip secret henuz eklenmediyse app KIRILMASIN); eklenince zorunlu.
// Origin YOKSA (curl/CC) origin katmani atlanir; secret ayarliysa X-BM-Auth yine gerekir.
function _bmAuthGate(request, env) {
  const origin = request.headers.get('Origin') || '';
  if (origin && origin !== ALLOWED_ORIGIN && origin.indexOf('http://localhost') !== 0) {
    return new Response(JSON.stringify({ error: 'origin reddedildi' }), { status: 403, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } });
  }
  const need = env.WORKER_SECRET;
  if (need) {
    const got = request.headers.get('X-BM-Auth') || '';
    if (got !== need) return new Response(JSON.stringify({ error: 'auth gerekli' }), { status: 401, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } });
  }
  return null;
}

export default {
  async fetch(request, env) {
    // ── Faz 1 POC: web-push test endpoint (Faz 5'te güvenlik + kaldırma) ──
    if (new URL(request.url).pathname === '/push-test') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: {
          'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-BM-Auth', 'Access-Control-Max-Age': '3600' } });
      }
      if (request.method === 'POST') { const _g = _bmAuthGate(request, env); if (_g) return _g; return handlePushTest(request, env); }
      return new Response('Method not allowed', { status: 405 });
    }

    // ── Faz 3: KV-tabanlı alarm + subscription deposu (TOFU oda-token) ──
    {
      const _kvp = new URL(request.url).pathname;
      if (_kvp === '/push-sub' || _kvp === '/alarms-sync' || _kvp === '/kv-peek' || _kvp === '/sub-remove') {
        return handleKvRoute(_kvp, request, env);
      }
    }

    const origin = request.headers.get('Origin') || '';
    const corsAllowed = origin === ALLOWED_ORIGIN;

    if (request.method === 'OPTIONS') {
      if (!corsAllowed) return new Response(null, { status: 403 });
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
          'Access-Control-Allow-Methods': 'GET, HEAD',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '3600',
        },
      });
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405 });
    }

    const url = new URL(request.url);
    const key = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    if (!key) return new Response('Missing object key', { status: 400 });

    const obj = await env.MODELS.get(key);
    if (!obj) return new Response('Not found', { status: 404 });

    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set('etag', obj.httpEtag);
    headers.set('Cache-Control', 'public, max-age=3600');
    if (corsAllowed) {
      headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
      headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Type, ETag');
    }

    return new Response(request.method === 'HEAD' ? null : obj.body, { headers });
  },

  // ── Faz 4: Cloudflare Cron — zamanı gelen alarmları push'la (idempotent: pushedTs) ──
  async scheduled(event, env, ctx) {
    ctx.waitUntil(_cronTick(env));
  },
};

// ═══ Faz 1 POC: saf crypto.subtle Web Push (RFC 8291 aes128gcm + RFC 8292 VAPID) ═══
// RFC 8291 §5 Known-Answer Test ile byte-byte doğrulandı (bm_webpush_kat.js).
const VAPID_PUBLIC = 'BAwdDDBhFd2iWYZxpNpGEc11FbNmKANLwrCj1eFNBQzau0nuubDUxpEIukeuARPwZWk_THmfwe8ffwX_kuYCRew';
const VAPID_SUBJECT = 'mailto:dessn7@gmail.com';

const b64uEnc = b => btoa(String.fromCharCode.apply(null, new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64uDec = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); s += '==='.slice((s.length + 3) % 4); const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
const _cat = (...arrs) => { let n = 0; for (const a of arrs) n += a.length; const o = new Uint8Array(n); let p = 0; for (const a of arrs) { o.set(a, p); p += a.length; } return o; };
const _s2u = s => new TextEncoder().encode(s);

async function _hkdf(salt, ikm, info, len) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8));
}

async function encryptBody(plaintextStr, uaPublic, auth, asPrivKey, asPublic, salt, rs) {
  const uaPub = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaPub }, asPrivKey, 256));
  const keyInfo = _cat(_s2u('WebPush: info'), new Uint8Array([0]), uaPublic, asPublic);
  const ikm = await _hkdf(auth, ecdh, keyInfo, 32);
  const cek = await _hkdf(salt, ikm, _cat(_s2u('Content-Encoding: aes128gcm'), new Uint8Array([0])), 16);
  const nonce = await _hkdf(salt, ikm, _cat(_s2u('Content-Encoding: nonce'), new Uint8Array([0])), 12);
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const padded = _cat(_s2u(plaintextStr), new Uint8Array([0x02]));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, padded));
  const rsBuf = new Uint8Array(4); new DataView(rsBuf.buffer).setUint32(0, rs);
  return _cat(salt, rsBuf, new Uint8Array([asPublic.length]), asPublic, ct);
}

async function vapidJwt(aud, env) {
  const enc = o => b64uEnc(_s2u(JSON.stringify(o)));
  const head = enc({ typ: 'JWT', alg: 'ES256' });
  const pay = enc({ aud, exp: Math.floor(Date.now() / 1000) + 43200, sub: VAPID_SUBJECT });
  const si = head + '.' + pay;
  const jwk = JSON.parse(env.VAPID_PRIVATE);
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, _s2u(si));
  return si + '.' + b64uEnc(sig);
}

async function sendWebPush(sub, payloadStr, env, opts) {
  const uaPublic = b64uDec(sub.keys.p256dh);
  const auth = b64uDec(sub.keys.auth);
  const eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cipher = await encryptBody(payloadStr, uaPublic, auth, eph.privateKey, asPublic, salt, 4096);
  const jwt = await vapidJwt(new URL(sub.endpoint).origin, env);
  const _h = {
    'TTL': String((opts && opts.ttl) || 60),
    'Content-Encoding': 'aes128gcm',
    'Content-Type': 'application/octet-stream',
    'Authorization': 'vapid t=' + jwt + ', k=' + VAPID_PUBLIC
  };
  if (opts && opts.urgency) _h['Urgency'] = opts.urgency;
  return fetch(sub.endpoint, { method: 'POST', headers: _h, body: cipher });
}

async function handlePushTest(request, env) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  try {
    if (!env.VAPID_PRIVATE) return new Response(JSON.stringify({ error: 'VAPID_PRIVATE secret tanımlı değil' }), { status: 500, headers: cors });
    const inp = await request.json();
    const sub = inp && inp.subscription;
    if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth)
      return new Response(JSON.stringify({ error: 'subscription (endpoint + keys.p256dh + keys.auth) gerekli' }), { status: 400, headers: cors });
    const payload = JSON.stringify({
      baslik: inp.baslik || '🍺 Brewmaster',
      body: inp.body || 'Test bildirimi',
      tag: inp.tag || 'bm-poc',
      data: { url: 'Brewmaster_v2_79_10.html' }
    });
    const res = await sendWebPush(sub, payload, env);
    const txt = await res.text().catch(() => '');
    return new Response(JSON.stringify({ pushStatus: res.status, pushStatusText: res.statusText, body: txt.slice(0, 300) }), { status: 200, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e && e.message) || e) }), { status: 500, headers: cors });
  }
}

// ═══ Faz 3: KV alarm + subscription deposu (TOFU oda-token) ═══
// /push-sub, /alarms-sync, /kv-peek — Faz 4 cron bu KV'yi okuyup push atacak.
const _KV_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-BM-Token, X-BM-Auth',
  'Access-Control-Max-Age': '3600'
};
function _kvJson(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { ..._KV_CORS, 'Content-Type': 'application/json' } });
}
const _slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'x';
const _TERMINAL = { tamamlandi: 1, atlandi: 1 };

async function _checkToken(oda, token, env, peek) {
  if (!oda || !token) return { ok: false, res: _kvJson({ error: 'oda + token gerekli' }, 400) };
  const cur = await env.BM_KV.get('roomtoken:' + oda);
  if (cur === null) {
    if (peek) return { ok: false, res: _kvJson({ error: 'oda yok' }, 404) };
    await env.BM_KV.put('roomtoken:' + oda, token); // TOFU: ilk-yazımda kilitle
    return { ok: true, claimed: true };
  }
  if (cur !== token) return { ok: false, res: _kvJson({ error: 'token eşleşmiyor' }, 403) };
  return { ok: true };
}

// SPRINT K K-PING: otomatik pseudo alarmlar ts'lerini cihaz-yerel girdilerden üretir
// (stok: tespit-anı Date.now; plan/stuck/maya: cihaz-yerel alarm-saati ayarı + sessiz-saat
// kaydırması + anchor fallback'i — bunlar Firebase'le SYNC'LENMEZ) → aynı mantıksal alarm
// için cihazlar farklı ts hesaplar → her çapraz sync'te ts değişir → pushedTs sıfırlanır
// (mükerrer push ping-pong) + Sprint H ts-eşit latch'i çözülür (terminal diriliş).
// Çözüm: aynı-nesil penceresi içinde ex.ts SABİT (ilk yazan kazanır) → alttaki pushedTs/durum
// kuralları ts-eşit görür. Pencere DIŞI fark = gerçek reschedule (mevcut davranış).
// stok: nesil sınırı grubun yaşam döngüsüdür (stok dolunca client grubu siler, K-TOMB
// KV'den düşürür; yeni düşüş = yeni grup) → sınırsız pencere. plan/stuck/maya: 12 saat —
// cihaz saat-ayarı farkını yutar, 1 günlük gerçek plan kaydırmasını (24h) YUTMAZ.
// 'manuel:' ve gerçek reçete alarmları KAPSAM DIŞI (snooze/re-arm/reschedule aynen).
const _PSEUDO_TOL_12H = 43200000;
function _pseudoTsTol(rid) {
  if (String(rid).indexOf('stok:') === 0) return Infinity;
  if (String(rid).indexOf('plan:') === 0 || String(rid).indexOf('stuck:') === 0 || String(rid).indexOf('maya:') === 0) return _PSEUDO_TOL_12H;
  return 0;
}
// alarmId = receteId-g-slug(aksiyon) deterministik; terminal durum (tamamlandi/atlandi) geri açılamaz; cron pushedTs korunur.
function _mergeAlarms(existing, incoming) {
  const out = {};
  for (const rid in existing) out[rid] = existing[rid];
  for (const rid in incoming) {
    const inc = incoming[rid] || {};
    const incAlarms = Array.isArray(inc.alarmlar) ? inc.alarmlar : [];
    const exGroup = out[rid] || {};
    const exAlarms = Array.isArray(exGroup.alarmlar) ? exGroup.alarmlar : [];
    const exById = {};
    for (const a of exAlarms) if (a && a.alarmId) exById[a.alarmId] = a;
    const mergedAlarms = incAlarms.map(a => {
      const alarmId = rid + '-' + (a.g | 0) + '-' + _slug(a.aksiyon);
      const ex = exById[alarmId];
      const o = { alarmId, g: a.g | 0, ts: a.ts, tip: a.tip, aksiyon: a.aksiyon, aciklama: a.aciklama, durum: a.durum };
      if (a.sicaklik != null) o.sicaklik = a.sicaklik; else if (ex && ex.sicaklik != null) o.sicaklik = ex.sicaklik; // İyileştirme 1: sicaklik koru (alarmId DEĞİŞMEZ)
      if (a.vibrate != null) o.vibrate = a.vibrate; else if (ex && ex.vibrate != null) o.vibrate = ex.vibrate; // Sprint3: titreşim deseni koru (tip-bazlı, client üretir)
      if (ex) {
        var _ktol = _pseudoTsTol(rid);
        if (_ktol && typeof o.ts === 'number' && typeof ex.ts === 'number' && o.ts !== ex.ts && Math.abs(o.ts - ex.ts) <= _ktol) o.ts = ex.ts; // SPRINT K K-PING: cihaz-farkı normalize — alttaki iki kural ts-eşit görür
        if (_TERMINAL[ex.durum] && !_TERMINAL[o.durum] && o.ts === ex.ts) o.durum = ex.durum; // tamamlananı bekliyor'a düşürme — YALNIZ ts AYNIYSA (Sprint H K2: ts değişti = meşru re-arm/reschedule → latch kırılır, tekrarlayan hatırlatma sonraki periyotta yeniden push'lanır; alttaki pushedTs kuralıyla aynı dil)
        if (ex.pushedTs && o.ts === ex.ts) o.pushedTs = ex.pushedTs; // cron izini koru — YALNIZ ts AYNIYSA (Sprint5: ts değişti=reschedule/snooze → pushedTs sıfırla → cron re-push)
      }
      return o;
    });
    out[rid] = {
      receteAd: inc.receteAd || exGroup.receteAd || '',
      pitchTs: (inc.pitchTs != null) ? inc.pitchTs : (exGroup.pitchTs != null ? exGroup.pitchTs : null),
      durum: inc.durum || exGroup.durum || 'aktif',
      alarmlar: mergedAlarms
    };
  }
  return out;
}

async function handleKvRoute(path, request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: _KV_CORS });
  { const _g = _bmAuthGate(request, env); if (_g) return _g; }
  if (!env.BM_KV) return _kvJson({ error: 'KV binding tanımlı değil' }, 500);
  try {
    if (path === '/kv-peek') {
      if (request.method !== 'GET') return _kvJson({ error: 'GET gerekli' }, 405);
      const u = new URL(request.url);
      const oda = u.searchParams.get('oda') || '';
      const token = request.headers.get('X-BM-Token') || '';
      const chk = await _checkToken(oda, token, env, true);
      if (!chk.ok) return chk.res;
      const sub = JSON.parse((await env.BM_KV.get('sub:' + oda)) || '[]');
      const alarm = JSON.parse((await env.BM_KV.get('alarm:' + oda)) || '{}');
      return _kvJson({ oda, sub, alarm });
    }
    if (request.method !== 'POST') return _kvJson({ error: 'POST gerekli' }, 405);
    const body = await request.json().catch(() => ({}));
    const oda = body.oda || '';
    const token = request.headers.get('X-BM-Token') || body.token || '';
    const chk = await _checkToken(oda, token, env);
    if (!chk.ok) return chk.res;

    if (path === '/push-sub') {
      const sub = body.subscription;
      if (!sub || !sub.endpoint || !sub.keys) return _kvJson({ error: 'subscription (endpoint+keys) gerekli' }, 400);
      const cihaz = String(body.cihaz || 'A');
      const list = JSON.parse((await env.BM_KV.get('sub:' + oda)) || '[]');
      const next = list.filter(x => x && x.cihaz !== cihaz); // cihaz-keyed upsert
      next.push({ endpoint: sub.endpoint, keys: sub.keys, cihaz, ts: Date.now() });
      await env.BM_KV.put('sub:' + oda, JSON.stringify(next));
      return _kvJson({ ok: true, count: next.length, claimed: !!chk.claimed });
    }

    if (path === '/alarms-sync') {
      const existing = JSON.parse((await env.BM_KV.get('alarm:' + oda)) || '{}');
      const merged = _mergeAlarms(existing, body.alarms || {});
      // SPRINT K K-TOMB: client'ın sildiği gruplar (reçete silindi, stuck çözüldü, stok doldu, plan kalktı)
      // KV'den de düşer — cron hayalet push üretmesin. Oda-token guard yukarıda; bilinmeyen rid no-op.
      let silinen = 0;
      (Array.isArray(body.sil) ? body.sil : []).forEach(function(rid){ if (rid && merged[String(rid)] !== undefined) { delete merged[String(rid)]; silinen++; } });
      await env.BM_KV.put('alarm:' + oda, JSON.stringify(merged));
      let n = 0; for (const r in merged) n += (merged[r].alarmlar || []).length;
      return _kvJson({ ok: true, receteler: Object.keys(merged).length, alarmlar: n, silinen: silinen, claimed: !!chk.claimed });
    }

    // Sprint 136: cihaz aboneliğini manuel sil (kullanıcı Bulut Senkron'dan). Yalnız kendi odası (token guard yukarıda).
    // endpoint öncelikli (kesin), yoksa cihaz adıyla (push-sub cihaz-keyed upsert ile tutarlı). Cron'un 404/410 oto-budamasından ayrı.
    if (path === '/sub-remove') {
      const ep = String(body.endpoint || '');
      const cihaz = String(body.cihaz || '');
      if (!ep && !cihaz) return _kvJson({ error: 'endpoint veya cihaz gerekli' }, 400);
      const list = JSON.parse((await env.BM_KV.get('sub:' + oda)) || '[]');
      const next = list.filter(x => x && (ep ? x.endpoint !== ep : x.cihaz !== cihaz));
      const removed = list.length - next.length;
      if (removed > 0) await env.BM_KV.put('sub:' + oda, JSON.stringify(next));
      return _kvJson({ ok: true, removed, count: next.length, claimed: !!chk.claimed });
    }
    return _kvJson({ error: 'bilinmeyen yol' }, 404);
  } catch (e) {
    return _kvJson({ error: String((e && e.message) || e) }, 500);
  }
}

// ═══ Faz 4: Cloudflare Cron — KV alarm:* tarar, zamanı geleni push'lar ═══
// */5dk tetiklenir. Idempotent: pushedTs işaretli alarm tekrar gönderilmez. TTL 24h + Urgency:high (Doze/app-kapalı).
async function _cronTick(env) {
  if (!env.BM_KV) return;
  const now = Date.now();
  let cursor;
  do {
    const lst = await env.BM_KV.list({ prefix: 'alarm:', cursor });
    cursor = lst.list_complete ? undefined : lst.cursor;
    await Promise.allSettled((lst.keys || []).map(k => _cronOda(k.name.slice('alarm:'.length), env, now)));
  } while (cursor);
}

function _cronPayload(receteAd, a) {
  let body = (receteAd ? receteAd + ' · ' : '') + 'Gün ' + (a.g | 0);
  if (a.sicaklik != null) body += ' · ' + a.sicaklik + '°C';     // sicaklik su an KV'de yok; varsa eklenir (defansif)
  if (a.aciklama) body += ' · ' + a.aciklama;
  const _p = { baslik: a.aksiyon || '🍺 Brewmaster', body: body, tag: a.alarmId || ('bm-' + (a.g | 0)), data: { url: 'Brewmaster_v2_79_10.html' } };
  if (a.vibrate != null) _p.vibrate = a.vibrate; // Sprint3: tip-bazlı titreşim deseni sw'ye geçir (vib OFF -> [])
  return _p;
}

async function _cronOda(oda, env, now) {
  if (!oda) return;
  const raw = await env.BM_KV.get('alarm:' + oda);
  if (!raw) return;
  let obj; try { obj = JSON.parse(raw) || {}; } catch (e) { return; }
  const due = [];
  for (const rid in obj) {
    const grp = obj[rid];
    if (!grp || typeof grp !== 'object') continue;
    if ((grp.durum || 'aktif') !== 'aktif') continue;                       // arşiv/biten reçete atla
    const arr = Array.isArray(grp.alarmlar) ? grp.alarmlar : [];
    for (const a of arr) {
      if (!a) continue;
      if (a.tip !== 'kritik' && a.tip !== 'kontrol') continue;             // pasif atla
      if (a.durum !== 'bekliyor') continue;                                // tamamlandi/atlandi atla
      if (a.pushedTs) continue;                                            // zaten push'landı (idempotent)
      if (!(typeof a.ts === 'number' && a.ts <= now)) continue;            // zamanı gelmedi
      due.push({ rid: rid, receteAd: grp.receteAd || '', a: a });
    }
  }
  if (!due.length) return;
  let subs;
  try { subs = JSON.parse((await env.BM_KV.get('sub:' + oda)) || '[]') || []; } catch (e) { subs = []; }
  if (!Array.isArray(subs) || !subs.length) return;                        // abone yok -> pushedTs işaretleme (sonra abone olursa kaçmasın)
  const dead = new Set();
  const pushedIds = [];
  for (const d of due) {
    const payload = JSON.stringify(_cronPayload(d.receteAd, d.a));
    const results = await Promise.allSettled(subs.map(s => sendWebPush(s, payload, env, { ttl: 86400, urgency: 'high' })));
    let okCount = 0;
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        const st = r.value && r.value.status;
        if (st >= 200 && st < 300) okCount++;
        else if (st === 404 || st === 410) dead.add(subs[i].endpoint);     // ölü subscription
      }
      // rejected veya 429/5xx: geçici -> sub kalır, pushedTs yazılmaz (sonraki cron retry)
    });
    if (okCount > 0 && d.a.alarmId) pushedIds.push(d.a.alarmId);
  }
  // ölü sub buda
  if (dead.size) {
    const next = subs.filter(s => s && !dead.has(s.endpoint));
    if (next.length !== subs.length) { try { await env.BM_KV.put('sub:' + oda, JSON.stringify(next)); } catch (e) {} }
  }
  // pushedTs yaz — dar read-modify-write (client /alarms-sync race penceresini küçült)
  if (pushedIds.length) {
    let obj2; try { obj2 = JSON.parse((await env.BM_KV.get('alarm:' + oda)) || '{}') || {}; } catch (e) { obj2 = obj; }
    const idset = new Set(pushedIds);
    let changed = false;
    for (const rid in obj2) {
      const g = obj2[rid];
      if (!g || !Array.isArray(g.alarmlar)) continue;
      for (const a of g.alarmlar) {
        if (a && a.alarmId && idset.has(a.alarmId) && !a.pushedTs) { a.pushedTs = now; changed = true; }
      }
    }
    if (changed) { try { await env.BM_KV.put('alarm:' + oda, JSON.stringify(obj2)); } catch (e) {} }
  }
}
