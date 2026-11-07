// Cloudflare Pages Function — temporary design links for new clients (onb-2, 2026-11-06, Ajax)
//   https://hub.adviuz.ca/d/<slug>
// Shows the client's landing-page design once Ajax has approved it (client_review and later).
// Before that, or for an unknown name, it shows a plain "not ready" page. noindex: this is a preview link.
const SB = 'https://crhvvfomwkrgwlnfruad.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyaHZ2Zm9td2tyZ3dsbmZydWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMjA3MDYsImV4cCI6MjA5Mjc5NjcwNn0.lTHjU0bHTGGiTPJl04iefIenI6KiqiS3u2h_WyHZ0aw';
export async function onRequest(context) {
  const parts = context.params.path;
  const slug = String(Array.isArray(parts) ? parts[0] || '' : parts || '').toLowerCase();
  const notReady = () => new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Design not ready</title><body style="font-family:Inter,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f7f8fa;color:#190229"><div style="text-align:center;padding:24px"><div style="font-size:20px;font-weight:700;margin-bottom:6px">This design isn\'t ready yet</div><div style="color:#667781">Please check back soon.</div></div></body>', { status: 404, headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex' } });
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 60) return notReady();
  try {
    const r = await fetch(SB + '/rest/v1/rpc/design_by_slug', {
      method: 'POST',
      headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_slug: slug }),
    });
    const html = r.ok ? await r.json() : null;
    if (!html || typeof html !== 'string') return notReady();
    return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex, nofollow', 'cache-control': 'no-store' } });
  } catch (e) {
    return notReady();
  }
}
