const ALLOWED_ORIGIN = 'https://dessn7-bit.github.io';

export default {
  async fetch(request, env) {
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
