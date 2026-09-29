// Cloudflare Pages Function — no-login top-up page
//   https://hub.adviuz.ca/t/<code>   e.g. /t/vitiligo-mq7dk
// The code is made by campaign-topup-nudge when a campaign runs out of views
// and is sent to the client by SMS. The page shows the same content as the
// campaign report email (results + top-up packages that go straight to Stripe).
// Data comes from the topup-page edge function. Link-preview crawlers
// (WhatsApp, iMessage, Facebook...) and ?preview=1 never count as an open.
const FN = 'https://crhvvfomwkrgwlnfruad.supabase.co/functions/v1/topup-page';
const BOT = /bot|crawl|spider|preview|facebookexternalhit|whatsapp|slack|telegram|twitter|linkedin|discord|pinterest|skype|google-|bingpreview|embedly|quora|outbrain|vkshare|w3c_validator/i;

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

function page(title, body, desc) {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>' + esc(title) + '</title>'
    + '<meta name="robots" content="noindex,nofollow">'
    + '<meta property="og:title" content="' + esc(title) + '">'
    + '<meta property="og:description" content="' + esc(desc || 'Your Adviuz campaign results and top-up options.') + '">'
    + '<meta property="og:type" content="website">'
    + '<link rel="icon" href="/icon-192.png">'
    + '<style>html,body{margin:0;padding:0;background:#f0f2f5}img{max-width:100%}</style>'
    + '</head><body>' + body + '</body></html>';
}

function note(heading, text) {
  return '<div style="background:#f0f2f5;padding:24px 12px;min-height:100vh;box-sizing:border-box">'
    + '<div style="max-width:560px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#0f172a;background:#ffffff;border:1px solid #e6eaf0;border-radius:16px;overflow:hidden">'
    + '<div style="height:5px;background:#4000f3;background:linear-gradient(90deg,#4000f3,#e65afc)"></div>'
    + '<div style="padding:16px 24px;border-bottom:1px solid #eeeeee"><img src="/brand/adviuz-logo-black.png" alt="Adviuz" style="height:16px;display:block;border:0"></div>'
    + '<div style="padding:28px 28px 30px">'
    + '<p style="margin:0 0 10px;font-size:18px;font-weight:800;color:#0f172a">' + heading + '</p>'
    + '<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#334155">' + text + '</p>'
    + '<p style="margin:0;font-size:13px;line-height:1.6;color:#64748b">Questions? Call or text us at <a href="tel:+16472501152" style="color:#4000f3;text-decoration:none;font-weight:600">+1 647 250 1152</a> &middot; Monday to Friday, 10 AM &ndash; 6 PM CST.</p>'
    + '</div></div></div>';
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const parts = context.params.path;
  const code = String(Array.isArray(parts) ? parts[0] || '' : parts || '').toLowerCase();
  const headers = {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
    'Referrer-Policy': 'no-referrer',
  };
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(code) || code.length > 60) {
    return new Response(page('Link not found — Adviuz', note('This link doesn’t work', 'Please check the link in your text message, or open the Adviuz hub to top up.')), { status: 404, headers });
  }

  const ua = context.request.headers.get('user-agent') || '';
  const preview = url.searchParams.get('preview') === '1' || BOT.test(ua);

  let j = null;
  try {
    const r = await fetch(FN + '?c=' + encodeURIComponent(code) + (preview ? '&preview=1' : ''));
    j = await r.json();
  } catch (e) { j = null; }

  if (!j) {
    return new Response(page('Adviuz', note('Something went wrong', 'We couldn’t load this page just now. Please try again in a minute.')), { status: 502, headers });
  }
  const camp = j.campaign || 'your campaign';
  if (j.state === 'live' && j.html) {
    return new Response(page(camp + ' — Top up | Adviuz', j.html, 'Results for ' + camp + ' and your top-up options.'), { status: 200, headers });
  }
  if (j.state === 'topped_up') {
    return new Response(page(camp + ' — Adviuz', note('Thank you — you’re all set', 'Your top-up for <strong>' + esc(camp) + '</strong> has been received and your campaign is live again. Your invoice has been emailed to you.')), { status: 200, headers });
  }
  if (j.state === 'expired') {
    return new Response(page(camp + ' — Adviuz', note('This link has expired', 'Top-up links stay open for 30 days. Please open the Adviuz hub to top up <strong>' + esc(camp) + '</strong>, or contact us and we’ll send you a new link.')), { status: 200, headers });
  }
  return new Response(page('Link not found — Adviuz', note('This link doesn’t work', 'Please check the link in your text message, or open the Adviuz hub to top up.')), { status: 404, headers });
}
