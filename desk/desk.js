/* Adviuz Hub — DESKTOP LAYER (desk-1, 2026-10-27). Pairs with desk.css.
   Adds the rail logo + bottom buttons, the empty "pick a lead" panel, tooltips,
   and switches Reports/Dashboard to a full-width view. Does nothing below 1100px. */
(function(){
  var MQ = window.matchMedia('(min-width: 1100px)');
  var WIDE_TABS = { reports:1, dashboard:1, me:1 };
  var built = false;

  function el(tag, attrs, html){
    var e = document.createElement(tag);
    for (var k in (attrs||{})) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function initials(){
    try{
      var n = (window._clientName || (window.currentUser && currentUser.email) || 'A').trim();
      var p = n.split(/[\s@._-]+/).filter(Boolean);
      return ((p[0]||'A').charAt(0) + (p[1]||'').charAt(0)).toUpperCase();
    }catch(e){ return 'A'; }
  }

  function build(){
    if (built) return;
    var bar = document.querySelector('.tabbar');
    if (!bar) return;
    built = true;

    // Rail: logo on top
    var logo = el('button', { 'class':'dk-rail-logo', 'aria-label':'Refresh Adviuz', title:'Adviuz — tap to refresh', type:'button' },
      '<svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><defs><linearGradient id="dkg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4000f3"/><stop offset="1" stop-color="#e65afc"/></linearGradient></defs><circle cx="6" cy="19.5" r="4" fill="url(#dkg)"/><path d="M11 4.5 L20.5 21" stroke="#190229" stroke-width="4.2" stroke-linecap="round"/></svg>');
    logo.addEventListener('click', function(){ location.reload(); });
    bar.insertBefore(logo, bar.firstChild);

    // Tooltips from the tab labels
    bar.querySelectorAll('.tab').forEach(function(t){
      var l = t.querySelector('.tab-lbl');
      if (l && !t.title) { t.title = l.textContent.replace(/\s*\(\d+\)$/, ''); t.setAttribute('aria-label', t.title); }
    });

    // Rail bottom: menu (settings) + profile
    var bottom = el('div', { 'class':'dk-rail-bottom' });
    var menu = el('button', { 'class':'dk-rail-btn', title:'Menu & settings', 'aria-label':'Menu and settings', type:'button' },
      '<svg fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>');
    menu.addEventListener('click', function(){ if (typeof openMenu === 'function') openMenu(); });
    var av = el('button', { 'class':'dk-rail-av', title:'Your account', 'aria-label':'Your account', type:'button' }, initials());
    av.addEventListener('click', function(){ if (typeof openMenu === 'function') openMenu(); });
    bottom.appendChild(menu); bottom.appendChild(av);
    bar.appendChild(bottom);
    setTimeout(function(){ av.textContent = initials(); }, 4000);

    // Empty detail panel
    var empty = el('div', { 'class':'dk-empty', 'aria-hidden':'true' },
      '<img src="/brand/adviuz-logo-black.png" alt="">' +
      '<h2>Pick a lead to open it here</h2>' +
      '<p>Calls, texts, emails, notes and follow-ups for the lead you choose show up on this side, so your list stays in view.</p>' +
      '<div class="dk-empty-foot">Adviuz Support · Mon–Fri 10–6 CST · +1 647 250 1152</div>');
    document.body.appendChild(empty);

    // Full-width view for Reports / Dashboard
    if (typeof window.goTab === 'function' && !window.goTab._dk) {
      var orig = window.goTab;
      window.goTab = function(name){
        // Switching sections from the rail closes the open lead (the phone did this
        // by hiding the tab bar while a lead was open).
        try {
          var ls = document.getElementById('leadScreen');
          if (!window._dkClosing && MQ.matches && ls && ls.classList.contains('open') && typeof closeLead === 'function') {
            window._dkClosing = true; try { closeLead(); } finally { window._dkClosing = false; }
          }
        } catch(e){}
        var r = orig.apply(this, arguments);
        try { document.body.classList.toggle('dk-wide', !!WIDE_TABS[name]); } catch(e){}
        return r;
      };
      window.goTab._dk = true;
    }
    try { document.body.classList.toggle('dk-wide', !!WIDE_TABS[window.curTab]); } catch(e){}
  }

  function apply(){
    if (MQ.matches) build();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
  if (MQ.addEventListener) MQ.addEventListener('change', apply);
})();
