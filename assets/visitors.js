/* visitors.js (2026-11-09, Ajax: "a separate tab which keeps the database of the visitors on the page").
   Adds "Website Visitors" to the hub menu (Admin section, under All Leads) and opens a full-screen list of
   adviuz.com visitors: returning or new, how many visits, the lead once we know them, and what they did
   (talked to Amber, chatted, opened a checkout, went to pay). Data: website-visitor function, staff only.
   Loaded by operator-console (the hub's last script), so app.html / desktop.html are unchanged. */
(function () {
  'use strict';
  if (window.__advVisitors) return; window.__advVisitors = 1;
  var data = [], filt = 'all', q = '', open = '';
  var ICON = '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></svg>';

  function addMenu() {
    if (document.getElementById('advVisMenu')) return true;
    var sect = document.getElementById('adminMenuSection'); if (!sect) return false;
    var after = null;
    sect.querySelectorAll('.menu-item').forEach(function (m) { if (/allleads/.test(m.getAttribute('onclick') || '')) after = m; });
    var it = document.createElement('div');
    it.className = 'menu-item'; it.id = 'advVisMenu';
    it.innerHTML = ICON + 'Website Visitors';
    it.addEventListener('click', function () { try { closeMenu(); } catch (_) {} show(); });
    if (after && after.nextSibling) sect.insertBefore(it, after.nextSibling); else sect.appendChild(it);
    return true;
  }
  if (!addMenu()) { var n = 0, iv = setInterval(function () { if (addMenu() || ++n > 40) clearInterval(iv); }, 500); }

  var css = '#advVis{position:fixed;inset:0;z-index:9000;background:var(--bg,#f0f2f5);display:flex;flex-direction:column;font-family:inherit;color:var(--text,#190229)}'
    + '#advVis[hidden]{display:none}'
    + '#advVis .vh{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--white,#fff);border-bottom:1px solid var(--border,#e9edef)}'
    + '#advVis .vh b{font-size:17px;flex:1}#advVis .vb{border:0;background:none;font-size:15px;font-weight:600;color:var(--text);cursor:pointer;padding:6px 8px;border-radius:8px}'
    + '#advVis .vb:hover{background:var(--bg,#f0f2f5)}'
    + '#advVis .vs{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px 14px}'
    + '#advVis .vs div{background:var(--white);border-radius:12px;padding:10px;text-align:center}#advVis .vs b{display:block;font-size:20px}#advVis .vs span{font-size:11px;color:var(--sub,#667781)}'
    + '#advVis .vf{display:flex;gap:6px;padding:0 14px 10px;overflow-x:auto}#advVis .vf button{flex:none;border:1px solid var(--border);background:var(--white);border-radius:999px;padding:7px 12px;font-size:13px;cursor:pointer;color:var(--text)}'
    + '#advVis .vf button.on{background:#4000f3;border-color:#4000f3;color:#fff}'
    + '#advVis .vq{margin:0 14px 10px;padding:10px 12px;border:1px solid var(--border);border-radius:10px;font-size:15px;background:var(--white);color:var(--text)}'
    + '#advVis .vl{flex:1;overflow-y:auto;padding:0 14px 30px}'
    + '#advVis .vr{background:var(--white);border-radius:12px;padding:12px;margin-bottom:8px;cursor:pointer}'
    + '#advVis .vr .t{display:flex;align-items:center;gap:8px}#advVis .vr .n{font-weight:700;font-size:15px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
    + '#advVis .vr .w{font-size:12px;color:var(--sub)}#advVis .vr .m{font-size:12.5px;color:var(--sub);margin-top:4px}'
    + '#advVis .tag{font-size:11px;font-weight:700;padding:3px 8px;border-radius:999px;background:#eef2ff;color:#4000f3;white-space:nowrap}'
    + '#advVis .tag.r{background:#ecfdf5;color:#047857}#advVis .tag.p{background:#fff7ed;color:#c2410c}'
    + '#advVis .ev{margin-top:10px;border-top:1px solid var(--border);padding-top:8px;font-size:13px}#advVis .ev div{padding:3px 0;color:var(--text)}#advVis .ev i{color:var(--sub);font-style:normal;margin-right:6px}'
    + '#advVis .ol{margin-top:8px;border:0;background:#4000f3;color:#fff;border-radius:8px;padding:8px 12px;font-weight:700;cursor:pointer}'
    + '#advVis .em{text-align:center;color:var(--sub);padding:40px 10px}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var box = document.createElement('div'); box.id = 'advVis'; box.hidden = true;
  box.innerHTML = '<div class="vh"><button class="vb" data-x>&#8249; Back</button><b>Website Visitors</b><button class="vb" data-r>&#8635; Refresh</button></div>'
    + '<div class="vs"></div><div class="vf"></div><input class="vq" placeholder="Search name, business, phone, page…"><div class="vl"></div>';
  document.body.appendChild(box);
  var $ = function (s) { return box.querySelector(s); };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ago(t) {
    var s = Math.max(0, (Date.now() - Date.parse(t)) / 1000);
    if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    var d = Math.floor(s / 86400); return d === 1 ? 'yesterday' : d + 'd ago';
  }
  function when(t) { try { return new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (_) { return ''; } }
  var PLAN = { 'bf-pilot': 'Pilot', 'bf-growth': 'Growth', 'bf-scale': 'Scale', 'bf-pro': 'Pro' };
  var EV = { visit: '🌐 Visited', voice: '🎙 Talked to Amber', chat: '💬 Opened chat', checkout: '🛒 Opened checkout', pay: '💳 Went to pay', lead: '📝 Gave their details' };
  function where(v) {
    var tz = String(v.timezone || '').split('/').pop().replace(/_/g, ' ');
    return [v.device, tz || v.country].filter(Boolean).join(' · ');
  }
  function src(v) {
    var u = v.utm || {};
    if (u.utm_source) return u.utm_source + (u.utm_campaign ? ' / ' + u.utm_campaign : '');
    if (u.fbclid) return 'Facebook / Instagram ad'; if (u.gclid) return 'Google ad';
    if (v.referrer) { try { return new URL(v.referrer).host.replace(/^www\./, ''); } catch (_) { return 'link'; } }
    return 'direct';
  }
  function pass(v) {
    if (filt === 'ret' && !(v.visits > 1)) return false;
    if (filt === 'known' && !v.lead_id) return false;
    if (filt === 'voice' && !(v.voice_calls > 0)) return false;
    if (filt === 'pay' && !(v.went_to_pay || v.checkouts > 0)) return false;
    if (q) {
      var L = v.lead || {};
      var hay = [v.name, L.name, L.company, L.phone, L.email, v.last_page, v.first_page, src(v)].join(' ').toLowerCase();
      if (hay.indexOf(q) < 0) return false;
    }
    return true;
  }
  function draw() {
    var day = Date.now() - 86400000;
    var today = data.filter(function (v) { return Date.parse(v.last_seen) > day; });
    $('.vs').innerHTML = '<div><b>' + today.length + '</b><span>Last 24h</span></div><div><b>' + today.filter(function (v) { return v.visits > 1; }).length + '</b><span>Returning</span></div>'
      + '<div><b>' + today.filter(function (v) { return v.voice_calls > 0; }).length + '</b><span>Talked to Amber</span></div><div><b>' + today.filter(function (v) { return v.went_to_pay; }).length + '</b><span>Went to pay</span></div>';
    var F = [['all', 'All'], ['ret', 'Returning'], ['known', 'Known lead'], ['voice', 'Talked to Amber'], ['pay', 'Checkout / pay']];
    $('.vf').innerHTML = F.map(function (f) { return '<button data-f="' + f[0] + '" class="' + (filt === f[0] ? 'on' : '') + '">' + f[1] + '</button>'; }).join('');
    var list = data.filter(pass);
    if (!list.length) { $('.vl').innerHTML = '<div class="em">' + (data.length ? 'No visitors match.' : 'No website visitors yet.') + '</div>'; return; }
    $('.vl').innerHTML = list.map(function (v) {
      var L = v.lead || {}, nm = L.name || v.name || 'Anonymous visitor';
      var tags = (v.visits > 1 ? '<span class="tag r">' + v.visits + ' visits</span>' : '<span class="tag">New</span>') + (v.went_to_pay ? ' <span class="tag p">Went to pay</span>' : '');
      var acts = [];
      if (v.voice_calls) acts.push('🎙 ' + v.voice_calls); if (v.chats) acts.push('💬 ' + v.chats);
      if (v.checkouts) acts.push('🛒 ' + (PLAN[v.last_plan] || v.last_plan || '') );
      var m = [L.company, L.stage].filter(Boolean).map(esc).join(' · ');
      var h = '<div class="vr" data-v="' + esc(v.visitor_id) + '"><div class="t"><span class="n">' + esc(nm) + '</span>' + tags + '</div>'
        + '<div class="m">' + (m ? m + '<br>' : '') + esc(ago(v.last_seen)) + ' · ' + esc(v.last_page || '') + ' · from ' + esc(src(v)) + (where(v) ? ' · ' + esc(where(v)) : '') + (acts.length ? ' · ' + acts.join('  ') : '') + '</div>';
      if (open === v.visitor_id) {
        var ev = (Array.isArray(v.events) ? v.events.slice().reverse() : []).map(function (e) {
          return '<div><i>' + esc(when(e.t)) + '</i>' + (EV[e.e] || esc(e.e)) + (e.d && e.e !== 'visit' ? ' · ' + esc(PLAN[e.d] || e.d) : (e.e === 'visit' && e.d ? ' ' + esc(e.d) : '')) + '</div>';
        }).join('');
        h += '<div class="ev"><div><i>First seen</i>' + esc(when(v.first_seen)) + ' on ' + esc(v.first_page || '') + '</div>' + ev
          + (v.lead_id ? '<button class="ol" data-lead="' + esc(v.lead_id) + '">Open lead</button>' : '') + '</div>';
      }
      return h + '</div>';
    }).join('');
  }
  function load() {
    $('.vl').innerHTML = '<div class="em">Loading…</div>';
    sbFetch('/functions/v1/website-visitor', { method: 'POST', body: JSON.stringify({ action: 'list' }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        if (!x.ok) { $('.vl').innerHTML = '<div class="em">' + (x.j && x.j.error === 'staff only' ? 'Only Adviuz staff can see website visitors.' : 'Could not load visitors.') + '</div>'; return; }
        data = x.j.visitors || []; draw();
      }).catch(function () { $('.vl').innerHTML = '<div class="em">Could not load visitors.</div>'; });
  }
  function show() { box.hidden = false; load(); }
  box.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('[data-x]')) { box.hidden = true; return; }
    if (t.closest('[data-r]')) { load(); return; }
    var f = t.closest('[data-f]'); if (f) { filt = f.dataset.f; draw(); return; }
    var ol = t.closest('[data-lead]'); if (ol) { box.hidden = true; try { window.openLeadByDbId(ol.dataset.lead); } catch (_) {} return; }
    var r = t.closest('[data-v]'); if (r) { open = open === r.dataset.v ? '' : r.dataset.v; draw(); }
  });
  $('.vq').addEventListener('input', function () { q = this.value.trim().toLowerCase(); draw(); });
  window.openWebsiteVisitors = show;
})();
