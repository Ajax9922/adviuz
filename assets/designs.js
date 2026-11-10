/* designs.js (2026-11-09, Ajax: "keep the Library private ... so that I can show them on desktop only during the demo").
   Adds "Design Library" to the hub menu (Admin section, under Website Visitors). Opens a full-screen, Google-style
   library: search + industry, latest designs first, no counts. Tapping a design opens it on screen for the demo.
   Data: table design_library (staff-only RLS). Designs open sandboxed: forms, calls, WhatsApp and pop-ups are
   switched off, and the latest landing pages open in the ad server's preview mode (no paid view is counted).
   Replaces the public adviuz.com/showcase page. Loaded by operator-console (the hub's last script). */
(function () {
  'use strict';
  if (window.__advDesigns) return; window.__advDesigns = 1;
  var WIX = 'https://adviuz.wixsite.com/', CROP = 50;
  var data = [], loaded = false;
  var ICON = '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>';

  function addMenu() {
    if (document.getElementById('advDesMenu')) return true;
    var sect = document.getElementById('adminMenuSection'); if (!sect) return false;
    var it = document.createElement('div');
    it.className = 'menu-item'; it.id = 'advDesMenu';
    it.innerHTML = ICON + 'Design Library';
    it.addEventListener('click', function () { try { closeMenu(); } catch (_) {} show(); });
    var vis = document.getElementById('advVisMenu');
    if (vis && vis.parentNode === sect) sect.insertBefore(it, vis.nextSibling); else sect.appendChild(it);
    return true;
  }
  if (!addMenu()) { var n = 0, iv = setInterval(function () { if (addMenu() || ++n > 40) clearInterval(iv); }, 500); }
  else setTimeout(addMenu, 3000);

  var css = '#advDes{position:fixed;inset:0;z-index:9000;background:var(--bg,#f0f2f5);display:flex;flex-direction:column;color:var(--text,#190229)}'
    + '#advDes[hidden]{display:none}'
    + '#advDes .dh{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--white,#fff);border-bottom:1px solid var(--border,#e9edef)}'
    + '#advDes .dh b{font-size:17px;flex:1}#advDes .db{border:0;background:none;font-size:15px;font-weight:600;color:var(--text);cursor:pointer;padding:6px 8px;border-radius:8px}'
    + '#advDes .db:hover{background:var(--bg,#f0f2f5)}'
    + '#advDes .dw{flex:1;overflow-y:auto}#advDes .di{max-width:760px;margin:0 auto;padding:22px 16px 40px}'
    + '#advDes .dbar{display:grid;grid-template-columns:1fr auto;gap:10px}'
    + '#advDes .dq,#advDes .dc{height:48px;border:1.5px solid var(--border,#e2e2e2);border-radius:14px;padding:0 14px;font-size:16px;background:var(--white,#fff);color:var(--text)}'
    + '#advDes .dq:focus,#advDes .dc:focus{outline:none;border-color:#7a3bff}'
    + '#advDes .dt{font-size:12.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--sub,#667781);margin:18px 2px 10px}#advDes .dt:empty{display:none}'
    + '#advDes .dl{display:grid;gap:8px}#advDes .dr{display:grid;grid-template-columns:1fr auto;align-items:center;gap:12px;background:var(--white,#fff);border:1px solid var(--border,#e9edef);border-radius:14px;padding:12px 15px;cursor:pointer;text-align:left;width:100%;font:inherit;color:inherit}'
    + '#advDes .dr:hover{border-color:#7a3bff}#advDes .dr b{display:block;font-size:15px}#advDes .dr small{display:block;font-size:13px;color:var(--sub,#667781);margin-top:2px}'
    + '#advDes .tg{font-size:11.5px;font-weight:700;color:#4000f3;background:#f3efff;border-radius:999px;padding:4px 10px;white-space:nowrap}#advDes .tg.lt{color:#fff;background:linear-gradient(135deg,#4000f3,#e65afc)}'
    + '#advDes .em{text-align:center;color:var(--sub);padding:40px 10px}'
    + '#advDesV{position:fixed;inset:0;z-index:9001;background:#fff;overflow:hidden}#advDesV[hidden]{display:none}'
    + '#advDesV iframe{position:absolute;left:0;width:100%;border:0;top:calc(-1 * var(--crop,0px));height:calc(100% + var(--crop,0px))}'
    + '#advDesV .vx{position:fixed;z-index:2;left:14px;bottom:14px;height:40px;border-radius:999px;border:0;background:rgba(25,2,41,.75);color:#fff;font-weight:700;padding:0 16px;cursor:pointer;opacity:.5;transition:opacity .2s}'
    + '#advDesV .vx:hover{opacity:1}#advDesV .vn{position:fixed;z-index:2;left:50%;transform:translateX(-50%);bottom:14px;background:rgba(25,2,41,.72);color:#fff;font-size:12px;font-weight:600;padding:7px 12px;border-radius:999px;pointer-events:none;white-space:nowrap}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var box = document.createElement('div'); box.id = 'advDes'; box.hidden = true;
  box.innerHTML = '<div class="dh"><button class="db" data-x>&#8249; Back</button><b>Design Library</b></div>'
    + '<div class="dw"><div class="di"><div class="dbar"><input class="dq" type="search" placeholder="Search designs" autocomplete="off" spellcheck="false">'
    + '<select class="dc"><option value="">All industries</option></select></div><div class="dt"></div><div class="dl"></div></div></div>';
  document.body.appendChild(box);
  var vw = document.createElement('div'); vw.id = 'advDesV'; vw.hidden = true;
  vw.innerHTML = '<iframe title="Design" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin" allow="autoplay; fullscreen"></iframe>'
    + '<button class="vx" type="button">&#8249; Back to library</button><div class="vn">Preview only · forms and calls are switched off</div>';
  document.body.appendChild(vw);
  var $ = function (s) { return box.querySelector(s); }, fr = vw.querySelector('iframe');

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function draw() {
    var words = $('.dq').value.toLowerCase().trim().split(/\s+/).filter(Boolean), c = $('.dc').value, idle = !words.length && !c;
    var xs = idle ? data.filter(function (d) { return d.latest; }) : data.filter(function (d) { return (!c || d.category === c) && words.every(function (w) { return d._t.indexOf(w) > -1; }); });
    $('.dt').textContent = idle ? 'Latest designs' : '';
    if (!xs.length) { $('.dl').innerHTML = '<div class="em">No designs match that search.</div>'; return; }
    $('.dl').innerHTML = xs.slice(0, 200).map(function (d) {
      return '<button class="dr" type="button" data-k="' + esc(d.slug) + '"><span><b>' + esc(d.name) + '</b><small>' + esc([d.sub, d.location].filter(Boolean).join(' · ') || '—') + '</small></span>'
        + '<span class="tg' + (d.latest ? ' lt">Latest' : '">' + esc(d.category)) + '</span></button>';
    }).join('');
  }
  function load() {
    $('.dl').innerHTML = '<div class="em">Loading…</div>';
    sbFetch('/rest/v1/design_library?select=slug,name,category,sub,location,url,latest,sort&order=sort.asc&limit=2000')
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        if (!x.ok || !Array.isArray(x.j)) { $('.dl').innerHTML = '<div class="em">Could not load the library.</div>'; return; }
        if (!x.j.length) { $('.dl').innerHTML = '<div class="em">Only Adviuz staff can see the design library.</div>'; return; }
        data = x.j; data.forEach(function (d) { d._t = (d.name + ' ' + d.category + ' ' + d.sub + ' ' + d.location).toLowerCase(); });
        var cats = {}; data.forEach(function (d) { cats[d.category] = 1; });
        $('.dc').innerHTML = '<option value="">All industries</option>' + Object.keys(cats).sort().map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');
        loaded = true; draw();
      }).catch(function () { $('.dl').innerHTML = '<div class="em">Could not load the library.</div>'; });
  }
  function show() { box.hidden = false; if (!loaded) load(); setTimeout(function () { $('.dq').focus(); }, 50); }
  function openD(k) {
    var d = data.filter(function (x) { return x.slug === k; })[0]; if (!d) return;
    vw.style.setProperty('--crop', (d.url ? 0 : CROP) + 'px');
    fr.src = d.url || WIX + encodeURIComponent(d.slug); vw.hidden = false;
  }
  function closeD() { vw.hidden = true; fr.src = 'about:blank'; }
  var tmr; $('.dq').addEventListener('input', function () { clearTimeout(tmr); tmr = setTimeout(draw, 80); });
  $('.dc').addEventListener('change', draw);
  box.addEventListener('click', function (e) {
    if (e.target.closest('[data-x]')) { box.hidden = true; return; }
    var r = e.target.closest('[data-k]'); if (r) openD(r.getAttribute('data-k'));
  });
  vw.querySelector('.vx').addEventListener('click', closeD);
  document.addEventListener('keydown', function (e) { if (e.key !== 'Escape') return; if (!vw.hidden) closeD(); else if (!box.hidden) box.hidden = true; });
  window.advDesignLibrary = show;
})();
