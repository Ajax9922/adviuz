// Cloudflare Pages Function — /proposal/
// Fills the page <title> and social-preview tags (WhatsApp, iMessage,
// Facebook link cards) with the proposal's real subject, so a shared
// link shows e.g. "Individual Agent Proposal — Adviuz" instead of the
// generic "Proposal — Adviuz". Link-preview crawlers do not run
// JavaScript, so this has to happen server-side.
// Uses proposal-data with preview=1 so a crawler fetch NEVER marks the
// proposal as viewed — only the client-side fetch (no preview flag) does.
export async function onRequest(context) {
  const res = await context.next(); // the static proposal page
  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id') || '';
    const ct = res.headers.get('content-type') || '';
    if (!id || !/text\/html/i.test(ct)) return res;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return res;

    const r = await fetch(
      'https://crhvvfomwkrgwlnfruad.supabase.co/functions/v1/proposal-data?id=' + encodeURIComponent(id) + '&preview=1',
      { cf: { cacheTtl: 60, cacheEverything: false } }
    );
    const j = await r.json().catch(() => null);
    const p = j && j.ok && j.proposal ? j.proposal : null;
    if (!p) return res;

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
    return new Response(html, { status: res.status, headers });
  } catch (e) {
    return res;
  }
}
