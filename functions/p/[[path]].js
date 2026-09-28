// Cloudflare Pages Function — short proposal links
//   https://hub.adviuz.ca/p/<slug>   e.g. /p/remax-individual
// Serves the normal proposal page (/proposal/) — the page itself reads the
// slug from the address and loads the proposal by it. Like
// functions/proposal/index.js, it also fills the <title> and link-preview
// tags (WhatsApp / iMessage / Facebook cards) with the real subject.
// Uses proposal-data with preview=1 so a crawler fetch NEVER marks the
// proposal as viewed — only the page's own fetch (no preview flag) does.
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const parts = context.params.path;
  const slug = String(Array.isArray(parts) ? parts[0] || '' : parts || '').toLowerCase();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 60) {
    return new Response('Not found', { status: 404 });
  }

  // The static proposal page, fetched straight from the assets (skips functions).
  let res = await context.env.ASSETS.fetch(new URL('/proposal/', url.origin));
  if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
    res = await context.env.ASSETS.fetch(new URL(res.headers.get('location'), url.origin));
  }
  try {
    const ct = res.headers.get('content-type') || '';
    if (!/text\/html/i.test(ct)) return res;
    const r = await fetch(
      'https://crhvvfomwkrgwlnfruad.supabase.co/functions/v1/proposal-data?s=' + encodeURIComponent(slug) + '&preview=1',
      { cf: { cacheTtl: 60, cacheEverything: false } }
    );
    const j = await r.json().catch(() => null);
    const p = j && j.ok && j.proposal ? j.proposal : null;
    if (!p) return res; // page shows its own "could not find" message

    const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
    const subj = (p.content && p.content.subject ? String(p.content.subject) : 'Proposal').slice(0, 140);
    const who = p.company || p.lead_name || '';
    const title = esc(subj + ' — Adviuz');
    const desc = esc('Proposal prepared for ' + (who || 'you') + ' by Adviuz.');

    let html = await res.text();
    html = html.replace(
      /<title>[^<]*<\/title>/i,
      '<title>' + title + '</title>'
        + '<meta property="og:title" content="' + title + '">'
        + '<meta property="og:description" content="' + desc + '">'
        + '<meta property="og:type" content="website">'
        + '<meta name="twitter:card" content="summary">'
    );
    const headers = new Headers(res.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    return new Response(html, { status: 200, headers });
  } catch (e) {
    return res;
  }
}
