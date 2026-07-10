// ═══════════════════════════════════════════════════════════════
// Cloudflare Pages Function
// Serves Supabase Storage files under a branded path:
//   https://hub.adviuz.ca/storage/<path>  ->  Supabase public object
//
// File location in the hub repo:  functions/storage/[[path]].js
// (the [[path]] catch-all handles /storage/anything/anything.pdf)
// ═══════════════════════════════════════════════════════════════

const SUPABASE_PUBLIC =
  'https://crhvvfomwkrgwlnfruad.supabase.co/storage/v1/object/public/adviuz-files';

export async function onRequest(context) {
  const parts = context.params.path;
  const path = Array.isArray(parts) ? parts.join('/') : (parts || '');

  if (!path) {
    return new Response('Not found', { status: 404 });
  }

  const target = `${SUPABASE_PUBLIC}/${path}`;

  const upstream = await fetch(target, {
    method: 'GET',
    cf: { cacheEverything: true, cacheTtl: 3600 },
  });

  if (!upstream.ok) {
    return new Response('File not found', { status: upstream.status });
  }

  const headers = new Headers(upstream.headers);
  headers.set('Cache-Control', 'public, max-age=3600');
  headers.delete('set-cookie');

  return new Response(upstream.body, { status: 200, headers });
}
