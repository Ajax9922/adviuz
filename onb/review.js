/* onb-review-1 (2026-11-06, Ajax "approve onboarding design"): Ajax's screen for new clients.
   Staff only. Lists client_onboarding rows, shows what the client sent, the Claude draft, the ad copy,
   and the actions: make/revise draft, edit HTML, approve -> client, go live. Opens from the floating
   "New clients" chip or https://hub.adviuz.ca/?onb=review. */
(function () {
  'use strict';
  var FN = '/functions/v1/onboarding-draft';
  var rows = [], cur = null, root = null, timer = null;
  var ST = {
    wizard: ['Filling in the wizard', '#eef0f3', '#3d4852'], submitted: ['Submitted: needs a draft', '#fff4e5', '#8a4b00'],
    drafting: ['Claude is designing\u2026', '#f4f0ff', '#4000f3'], draft_ready: ['Draft ready: review it', '#fff4e5', '#8a4b00'],
    client_review: ['Waiting for client approval', '#eef0f3', '#3d4852'], changes_requested: ['Client asked for changes', '#fde8e8', '#a11'],
    details: ['Client approved: filling in part 2', '#eef0f3', '#3d4852'], setup: ['Ready: set up and go live', '#f4f0ff', '#4000f3'], live: ['Live', '#e6f7f1', '#0b6b52']
  };
  var KIND = { flyers: 'Digital Flyers', ai: 'AI Conversion Engine', complete: 'Digital Flyers + AI Engine' };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pill(s) { var x = ST[s] || [s, '#eef0f3', '#3d4852']; return '<span class="onr-pill" style="background:' + x[1] + ';color:' + x[2] + '">' + esc(x[0]) + '</span>'; }
  function toast(m) { if (window.showToast) showToast(m); }

  function css() {
    if (document.getElementById('onrCss')) return;
    var s = document.createElement('style'); s.id = 'onrCss';
    s.textContent = '#onrRoot{position:fixed;top:0;left:0;right:0;bottom:0;z-index:2000;background:var(--bg,#f0f2f5);display:flex;flex-direction:column;font-family:Inter,var(--f,system-ui),sans-serif;color:var(--text,#190229)}'
      + '#onrRoot *{box-sizing:border-box}'
      + '.onr-top{height:calc(56px + env(safe-area-inset-top,0px));padding:env(safe-area-inset-top,0px) 16px 0;display:flex;align-items:center;gap:10px;background:#fff;border-bottom:1px solid var(--border,#e9edef);flex-shrink:0}'
      + '.onr-top h1{flex:1;margin:0;font-size:17px;font-weight:700}'
      + '.onr-x{border:0;background:none;font:600 14px Inter,system-ui,sans-serif;color:#4000f3;cursor:pointer;padding:8px}'
      + '.onr-wrap{flex:1;min-height:0;display:flex}'
      + '.onr-list{width:100%;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px}'
      + '.onr-item{text-align:left;border:1px solid var(--border,#e9edef);background:#fff;border-radius:14px;padding:12px;cursor:pointer;display:flex;flex-direction:column;gap:6px;font-family:inherit;color:inherit}'
      + '.onr-item.on{border-color:#4000f3;background:#faf8ff}'
      + '.onr-item b{font-size:14px}.onr-item small{font-size:12px;color:var(--sub,#667781)}'
      + '.onr-pill{align-self:flex-start;font-size:11px;font-weight:600;padding:3px 8px;border-radius:8px}'
      + '.onr-det{display:none;flex:1;min-width:0;overflow-y:auto;padding:16px;flex-direction:column;gap:14px}'
      + '#onrRoot.detail .onr-list{display:none}#onrRoot.detail .onr-det{display:flex}'
      + '.onr-card{background:#fff;border:1px solid var(--border,#e9edef);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:8px}'
      + '.onr-card h3{margin:0;font-size:14px;font-weight:700}'
      + '.onr-kv{display:flex;justify-content:space-between;gap:12px;font-size:13px;padding:6px 0;border-bottom:1px solid #f1f2f4}.onr-kv:last-child{border-bottom:0}'
      + '.onr-kv span:first-child{color:var(--sub,#667781);flex-shrink:0}.onr-kv span:last-child{text-align:right;white-space:pre-wrap}'
      + '.onr-frame{width:100%;height:560px;border:1px solid var(--border,#e9edef);border-radius:12px;background:#fff}'
      + '.onr-acts{display:flex;flex-wrap:wrap;gap:8px}'
      + '.onr-btn{height:44px;border:0;border-radius:12px;background:linear-gradient(90deg,#4000f3,#8b2bf7,#e65afc);color:#fff;font:600 14px Inter,system-ui,sans-serif;cursor:pointer;padding:0 16px}'
      + '.onr-btn2{height:44px;border:1px solid #d9dee5;border-radius:12px;background:#fff;color:var(--text,#190229);font:600 14px Inter,system-ui,sans-serif;cursor:pointer;padding:0 14px}'
      + '.onr-ta{width:100%;min-height:80px;border:1px solid #d9dee5;border-radius:12px;padding:10px 12px;font:400 15px Inter,system-ui,sans-serif;resize:vertical}'
      + '.onr-files{display:flex;flex-wrap:wrap;gap:8px}.onr-files a{display:flex;align-items:center;gap:6px;font-size:12px;color:#4000f3;text-decoration:none;border:1px solid #e3e6eb;border-radius:10px;padding:6px 8px;max-width:100%}'
      + '.onr-files img{width:44px;height:44px;object-fit:cover;border-radius:8px}'
      + '.onr-note{font-size:13px;color:var(--sub,#667781);line-height:1.5}'
      + '.onr-back{display:inline-flex;border:0;background:none;color:#4000f3;font:600 14px Inter,system-ui,sans-serif;cursor:pointer;padding:0}'
      + '#onrChip{position:fixed;left:16px;bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:900;height:42px;padding:0 16px;border:0;border-radius:21px;background:linear-gradient(90deg,#4000f3,#8b2bf7,#e65afc);color:#fff;font:600 13px Inter,system-ui,sans-serif;cursor:pointer;box-shadow:0 6px 18px rgba(64,0,243,.25)}'
      + '@media(min-width:900px){.onr-list{width:340px;flex-shrink:0;border-right:1px solid var(--border,#e9edef);background:#fff}.onr-det{display:flex}#onrRoot.detail .onr-list{display:flex}.onr-back{display:none}#onrChip{bottom:24px;left:24px}}';
    document.head.appendChild(s);
  }

  async function load() {
    var r = await sbFetch('/rest/v1/client_onboarding?select=id,client_id,kind,status,step,answers,files,design_slug,draft_html,draft_ads,draft_log,change_request,submitted_at,created_at,updated_at,clients(business_name,contact_name,email,phone)&status=neq.live&order=updated_at.desc', { method: 'GET' });
    rows = r.ok ? await r.json() : [];
    return rows;
  }
  async function act(body) {
    var r = await sbFetch(FN, { method: 'POST', body: JSON.stringify(body) });
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok || j.ok === false) throw new Error(j.error || ('HTTP ' + r.status));
    return j;
  }
  async function signed(path) {
    try {
      var r = await sbFetch('/storage/v1/object/sign/onboarding/' + path, { method: 'POST', body: JSON.stringify({ expiresIn: 3600 }) });
      var j = await r.json(); return j.signedURL ? SB_URL + '/storage/v1' + j.signedURL : '';
    } catch (e) { return ''; }
  }

  function renderList() {
    return rows.length ? rows.map(function (o) {
      var c = o.clients || {};
      return '<button type="button" class="onr-item' + (cur && cur.id === o.id ? ' on' : '') + '" data-open="' + o.id + '"><b>' + esc(c.business_name || 'New client') + '</b><small>' + esc(KIND[o.kind] || o.kind) + ' \u00b7 ' + esc(c.email || '') + '</small>' + pill(o.status) + '</button>';
    }).join('') : '<div class="onr-note" style="padding:20px;text-align:center">No new clients waiting. When someone pays, they show up here.</div>';
  }
  function kv(k, v) { return v ? '<div class="onr-kv"><span>' + esc(k) + '</span><span>' + esc(v) + '</span></div>' : ''; }
  function answers(o) {
    var a = o.answers || {}, h = '';
    h += kv('Campaign', a.campaign_name) + kv('Brand', a.brand_name || a.biz_name) + kv('Target area', [a.region, a.postal_codes].filter(Boolean).join(' \u00b7 ')) + kv('Address', a.address) + kv('Website', a.website);
    if (a.hours) h += kv('Hours', Object.keys(a.hours).map(function (d) { var x = a.hours[d]; return d + ' ' + (x.closed ? 'closed' : (x.text || '')); }).join('\n'));
    h += kv('Hours note', a.hours_exceptions) + kv('Call number', a.call_phone) + kv('Lead alerts', [a.alert_email, a.alert_phone].filter(Boolean).join(' \u00b7 '));
    h += kv('Punchline', a.punchline) + kv('Sub-punchline', a.sub_punchline);
    if (a.usps) h += kv('5 reasons', a.usps.filter(Boolean).map(function (x, i) { return (i + 1) + '. ' + x; }).join('\n'));
    h += kv('Offer', a.offer) + kv('Ages', (a.ages || []).join(', ')) + kv('Gender', a.gender);
    if (a.colors) h += kv('Colours', a.colors.join('  '));
    h += kv('What they do', a.what_you_do);
    if (a.services) h += kv('Services', a.services.filter(function (x) { return x && x.name; }).map(function (x) { return x.name + (x.price ? ' \u2014 ' + x.price : ''); }).join('\n'));
    if (a.faqs) h += kv('Questions', a.faqs.filter(function (x) { return x && x.q; }).map(function (x) { return 'Q: ' + x.q + '\nA: ' + (x.a || ''); }).join('\n\n'));
    h += kv('Meeting length', a.meeting_len) + kv('Transfer to', a.transfer_phone) + kv('Booking alerts', a.alert_contact);
    return h || '<div class="onr-note">Nothing filled in yet.</div>';
  }
  function adsBlock(ads) {
    if (!ads) return '';
    if (ads.raw) return '<div class="onr-card"><h3>Ad copy</h3><div class="onr-note" style="white-space:pre-wrap">' + esc(ads.raw) + '</div></div>';
    var h = '';
    (ads.facebook || []).forEach(function (f, i) { h += kv('Facebook ' + (i + 1), [f.headline, f.primary_text, f.description].filter(Boolean).join('\n')); });
    if (ads.google) { h += kv('Google headlines', (ads.google.headlines || []).join('\n')); h += kv('Google descriptions', (ads.google.descriptions || []).join('\n')); }
    if (ads.sitelinks) h += kv('Sitelinks', ads.sitelinks.map(function (s) { return s.text + '  ' + s.anchor; }).join('\n'));
    return '<div class="onr-card"><h3>Ad copy (drafted by Claude)</h3>' + h + '</div>';
  }
  async function renderDetail() {
    var d = root.querySelector('.onr-det');
    if (!cur) { d.innerHTML = '<div class="onr-note" style="padding:20px">Pick a client on the left.</div>'; return; }
    var o = cur, c = o.clients || {}, last = (o.draft_log || []).slice(-1)[0] || {};
    var acts = '';
    if (o.status === 'submitted') acts = '<button type="button" class="onr-btn" data-do="draft">Make draft with Claude</button>';
    if (o.status === 'draft_ready' || o.status === 'changes_requested') acts = '<button type="button" class="onr-btn" data-do="approve">Approve design \u2192 send to client</button>';
    if (o.status === 'setup' || (o.kind === 'ai' && o.status === 'submitted')) acts = '<button type="button" class="onr-btn" data-do="golive">Go live</button>';
    if (o.draft_html) acts += '<button type="button" class="onr-btn2" data-do="copy">Copy HTML for Ad Builder</button><button type="button" class="onr-btn2" data-do="edit">Edit HTML</button>';
    var h = '<button type="button" class="onr-back" data-do="back">\u2190 All new clients</button>'
      + '<div class="onr-card"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div><div style="font-size:19px;font-weight:700">' + esc(c.business_name || 'New client') + '</div><div class="onr-note">' + esc(KIND[o.kind] || o.kind) + ' \u00b7 ' + esc(c.contact_name || '') + ' \u00b7 ' + esc(c.email || '') + ' \u00b7 ' + esc(c.phone || '') + '</div></div>' + pill(o.status) + '</div>'
      + (o.status === 'drafting' ? '<div class="onr-note">Claude is designing the page. This usually takes 2\u20135 minutes; this screen updates by itself.</div>' : '')
      + (last.error ? '<div class="onr-note" style="color:#a11">Last attempt failed: ' + esc(last.error) + '</div>' : '')
      + (o.status === 'changes_requested' && o.change_request ? '<div class="onr-note"><b style="color:var(--text,#190229)">Client asked:</b> ' + esc(o.change_request) + '</div>' : '')
      + (o.design_slug ? '<div class="onr-note">Design link: <a href="https://hub.adviuz.ca/d/' + esc(o.design_slug) + '" target="_blank" rel="noopener">hub.adviuz.ca/d/' + esc(o.design_slug) + '</a></div>' : '')
      + (o.status === 'setup' ? '<div class="onr-note">Before Go live: create the campaign and ad (paste the HTML into the Ad Builder), set up the phone number and the AI. Go live then shows the client their normal dashboard and texts them.</div>' : '')
      + '<div class="onr-acts">' + acts + '</div></div>';
    if (o.draft_html) h += '<div class="onr-card"><h3>Draft landing page (only you can see it until you approve)</h3><iframe class="onr-frame" title="Draft landing page" sandbox="allow-scripts" srcdoc="' + esc(o.draft_html) + '"></iframe>'
      + '<label class="onr-note" for="onrAsk">Ask Claude to change it</label><textarea class="onr-ta" id="onrAsk" placeholder="Make the headline bigger and add the Saturday hours.">' + esc(o.status === 'changes_requested' ? (o.change_request || '') : '') + '</textarea><div class="onr-acts"><button type="button" class="onr-btn2" data-do="revise">Update draft</button></div></div>';
    h += adsBlock(o.draft_ads);
    h += '<div class="onr-card"><h3>What the client sent</h3>' + answers(o) + '<div class="onr-files" id="onrFiles"></div></div>';
    d.innerHTML = h;
    var fs = Array.isArray(o.files) ? o.files : [], box = document.getElementById('onrFiles');
    for (var i = 0; i < fs.length; i++) {
      var f = fs[i], url = await signed(f.path); if (!url || !box) continue;
      box.insertAdjacentHTML('beforeend', '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + (/^image\//.test(f.type || '') ? '<img src="' + esc(url) + '" alt="">' : '') + '<span>' + esc(f.slot + ': ' + f.name) + '</span></a>');
    }
  }
  function render() {
    root.innerHTML = '<header class="onr-top"><h1>New clients</h1><button type="button" class="onr-x" data-do="close">Close</button></header><div class="onr-wrap"><nav class="onr-list">' + renderList() + '</nav><section class="onr-det"></section></div>';
    if (cur) root.classList.add('detail'); else root.classList.remove('detail');
    renderDetail();
  }
  function editSheet() {
    var ov = document.createElement('div');
    ov.className = 'onb-sheet-ov'; ov.style.zIndex = '2100';
    ov.innerHTML = '<div class="onb-sheet" style="max-width:900px"><div class="onb-grab"></div><b>Edit the page HTML</b><textarea class="onr-ta" id="onrHtml" style="min-height:50vh;font:12px ui-monospace,Menlo,monospace">' + esc(cur.draft_html || '') + '</textarea><div class="onr-acts"><button type="button" class="onr-btn" data-s="save">Save</button><button type="button" class="onr-btn2" data-s="cancel">Cancel</button></div></div>';
    ov.addEventListener('click', async function (e) {
      if (e.target === ov || (e.target.closest && e.target.closest('[data-s="cancel"]'))) { ov.remove(); return; }
      if (e.target.closest && e.target.closest('[data-s="save"]')) {
        try { await act({ action: 'save', id: cur.id, html: document.getElementById('onrHtml').value }); ov.remove(); toast('Saved'); await refresh(); } catch (er) { toast("Couldn't save: " + er.message); }
      }
    });
    document.body.appendChild(ov);
  }
  async function refresh() {
    await load();
    if (cur) cur = rows.filter(function (r) { return r.id === cur.id; })[0] || null;
    render();
    clearTimeout(timer);
    if (cur && cur.status === 'drafting') timer = setTimeout(refresh, 10000);
  }
  function bind() {
    root.addEventListener('click', async function (e) {
      var el = e.target.closest ? e.target.closest('[data-open],[data-do]') : null; if (!el) return;
      if (el.dataset.open) { cur = rows.filter(function (r) { return r.id === el.dataset.open; })[0]; render(); if (cur && cur.status === 'drafting') refresh(); return; }
      var d = el.dataset.do;
      if (d === 'close') { clearTimeout(timer); root.remove(); root = null; map(); return; }
      if (d === 'back') { cur = null; render(); return; }
      if (d === 'copy') { try { await navigator.clipboard.writeText(cur.draft_html); toast('HTML copied. Paste it into the Ad Builder.'); } catch (er) { editSheet(); } return; }
      if (d === 'edit') { editSheet(); return; }
      el.disabled = true;
      try {
        if (d === 'draft') { await act({ action: 'draft', id: cur.id }); toast('Claude is designing the page\u2026'); }
        if (d === 'revise') { var t = (document.getElementById('onrAsk') || {}).value || ''; if (!t.trim()) { toast('Type what to change first'); el.disabled = false; return; } await act({ action: 'revise', id: cur.id, instruction: t }); toast('Claude is updating the page\u2026'); }
        if (d === 'approve') { await act({ action: 'approve', id: cur.id }); toast('Sent to the client for approval'); }
        if (d === 'golive') { await act({ action: 'golive', id: cur.id }); toast('Live. The client now sees their dashboard.'); }
        setTimeout(refresh, 800);
      } catch (er) { el.disabled = false; toast("Couldn't do that: " + er.message); }
    });
  }
  async function open(id) {
    css();
    if (!root) { root = document.createElement('div'); root.id = 'onrRoot'; document.body.appendChild(root); bind(); }
    var ch = document.getElementById('onrChip'); if (ch) ch.remove();
    await load();
    cur = id ? rows.filter(function (r) { return r.id === id; })[0] || null : (window.innerWidth >= 900 ? rows[0] || null : null);
    render();
    if (cur && cur.status === 'drafting') refresh();
  }
  // onb-3 (Ajax 2026-11-07): no floating bar. New clients show in Dashboard > Clients with their setup status.
  var SHORT = { wizard: ['Filling in setup', '#667781'], submitted: ['Needs a draft', '#b45309'], drafting: ['Designing\u2026', '#4000f3'], draft_ready: ['Review the draft', '#b45309'], client_review: ['Client reviewing', '#667781'], changes_requested: ['Changes asked', '#cc0000'], details: ['Client finishing setup', '#667781'], setup: ['Ready to go live', '#4000f3'] };
  async function map() {
    var list = await load(), m = {};
    list.forEach(function (o) { var x = SHORT[o.status] || [o.status, '#667781']; m[o.client_id] = { id: o.id, status: o.status, label: x[0], color: x[1], waiting: ['submitted', 'draft_ready', 'changes_requested', 'setup'].indexOf(o.status) > -1 }; });
    window._onbMap = m;
    var el = document.getElementById('adClientsList');
    if (el && typeof adClientsHTML === 'function') { var tmp = document.createElement('div'); tmp.innerHTML = adClientsHTML(); if (tmp.firstChild) el.replaceWith(tmp.firstChild); }
  }
  function chip() { var old = document.getElementById('onrChip'); if (old) old.remove(); }
  window.ONBR = { open: open, chip: chip, map: map };
})();
