const ALLOWED_ORIGIN = 'https://dessn7-bit.github.io';

export default {
  async fetch(request, env) {
    // ── Faz 1 POC: web-push test endpoint (Faz 5'te güvenlik + kaldırma) ──
    if (new URL(request.url).pathname === '/push-test') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: {
          'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '3600' } });
      }
      if (request.method === 'POST') return handlePushTest(request, env);
      return new Response('Method not allowed', { status: 405 });
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

async function sendWebPush(sub, payloadStr, env) {
  const uaPublic = b64uDec(sub.keys.p256dh);
  const auth = b64uDec(sub.keys.auth);
  const eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cipher = await encryptBody(payloadStr, uaPublic, auth, eph.privateKey, asPublic, salt, 4096);
  const jwt = await vapidJwt(new URL(sub.endpoint).origin, env);
  return fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'TTL': '60',
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'Authorization': 'vapid t=' + jwt + ', k=' + VAPID_PUBLIC
    },
    body: cipher
  });
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
