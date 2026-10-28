/* Adviuz Hub — DESKTOP LAYER (desk-2, 2026-10-27). Pairs with desk.css.
   Rail logo + expand/collapse + bottom buttons, the empty "pick a lead" panel,
   full-width Reports/Dashboard, and the tidy lead-details grid.
   Does nothing below 1100px. */
(function(){
  var MQ = window.matchMedia('(min-width: 1100px)');
  var WIDE_TABS = { reports:1, dashboard:1, me:1 };
  var built = false;
  var I = {
    cog:'<path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.8l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7V20a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.8v-.5a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    expand:'<path d="M9 6l6 6-6 6"/>',
    mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    bolt:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>',
    users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14.2c2.1.7 3.5 2.6 3.5 5.8"/>',
    pin:'<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    tag:'<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    note:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>'
  };
  function svg(p, w){ return '<svg width="'+(w||21)+'" height="'+(w||21)+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>'; }
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
  function railOpen(on){
    document.documentElement.classList.toggle('dk-rail-open', !!on);
    try { localStorage.setItem('adviuz_dk_rail', on ? '1' : '0'); } catch(e){}
    var t = document.querySelector('.dk-rail-toggle');
    if (t) { t.title = on ? 'Collapse menu' : 'Expand menu'; t.setAttribute('aria-label', t.title); var l=t.querySelector('.dk-lbl'); if(l) l.textContent = 'Collapse'; }
  }

  // ── Lead details: label-above-value cells with thin icons (desktop only) ──
  function iconFor(label){
    var k = String(label||'').toLowerCase();
    if (/mail/.test(k)) return I.mail;
    if (/phone|mobile/.test(k)) return I.phone;
    if (/date|appointment|meeting|booked/.test(k)) return I.cal;
    if (/event|activity/.test(k)) return I.bolt;
    if (/partner|team/.test(k)) return I.users;
    if (/assign|owner|name/.test(k)) return I.user;
    if (/location|city|address|province/.test(k)) return I.pin;
    if (/source|campaign|website/.test(k)) return I.globe;
    if (/note|message|comment/.test(k)) return I.note;
    return I.tag;
  }
  function hookInfoRows(){
    if (typeof window.ldInfoRow !== 'function' || window.ldInfoRow._dk) return;
    var orig = window.ldInfoRow;
    window.ldInfoRow = function(icon, label, val){
      if (!MQ.matches) return orig.apply(this, arguments);
      var lbl = String(label||'');
      return '<div class="dk-irow"><span class="dk-ii">'+svg(iconFor(lbl),16)+'</span>'
        + '<div style="min-width:0;flex:1"><div class="dk-il">'+lbl.charAt(0).toUpperCase()+lbl.slice(1).toLowerCase()+'</div>'
        + '<div class="dk-iv">'+val+'</div></div></div>';
    };
    window.ldInfoRow._dk = true;
  }
  function markInfoCard(){
    if (!MQ.matches) return;
    var row = document.querySelector('#leadScreen .dk-irow');
    if (!row) return;
    // the white "lead info" card renderLeadScreen builds first (avatar row + info rows)
    var card = row.closest('div[style*="padding:16px 16px 14px"]') || row.parentElement && row.parentElement.parentElement;
    if (card && card.classList) card.classList.add('dk-info-card');
  }
  function hookLeadRender(){
    if (typeof window.renderLeadScreen !== 'function' || window.renderLeadScreen._dk) return;
    var orig = window.renderLeadScreen;
    window.renderLeadScreen = function(){
      var r = orig.apply(this, arguments);
      try { markInfoCard(); } catch(e){}
      return r;
    };
    window.renderLeadScreen._dk = true;
  }

  function build(){
    if (built) return;
    var bar = document.querySelector('.tabbar');
    if (!bar) return;
    built = true;
    try { railOpen(localStorage.getItem('adviuz_dk_rail') === '1'); } catch(e){}

    // Rail head: logo mark + wordmark (wordmark shows when expanded)
    var head = el('div', { 'class':'dk-rail-head' });
    var logo = el('button', { 'class':'dk-rail-logo', 'aria-label':'Refresh Adviuz', title:'Adviuz — click to refresh', type:'button' },
      '<svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><defs><linearGradient id="dkg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4000f3"/><stop offset="1" stop-color="#e65afc"/></linearGradient></defs><circle cx="6" cy="19.5" r="4" fill="url(#dkg)"/><path d="M11 4.5 L20.5 21" stroke="#190229" stroke-width="4.2" stroke-linecap="round"/></svg>');
    logo.addEventListener('click', function(){ location.reload(); });
    head.appendChild(logo);
    head.appendChild(el('span', { 'class':'dk-rail-word' }, 'adviuz'));
    bar.insertBefore(head, bar.firstChild);

    // Tooltips from the tab labels (useful while the rail is collapsed)
    bar.querySelectorAll('.tab').forEach(function(t){
      var l = t.querySelector('.tab-lbl');
      if (l && !t.title) { t.title = l.textContent.replace(/\s*\(\d+\)$/, ''); t.setAttribute('aria-label', t.title); }
    });

    // Rail bottom: expand/collapse, settings, profile
    var bottom = el('div', { 'class':'dk-rail-bottom' });
    var tog = el('button', { 'class':'dk-rail-btn dk-rail-toggle', type:'button', title:'Expand menu', 'aria-label':'Expand menu' },
      svg(I.expand) + '<span class="dk-lbl">Collapse</span>');
    tog.addEventListener('click', function(){ railOpen(!document.documentElement.classList.contains('dk-rail-open')); });
    var menu = el('button', { 'class':'dk-rail-btn', title:'Menu & settings', 'aria-label':'Menu and settings', type:'button' },
      svg(I.cog) + '<span class="dk-lbl">Settings</span>');
    menu.addEventListener('click', function(){ if (typeof openMenu === 'function') openMenu(); });
    var me = el('button', { 'class':'dk-rail-btn dk-me', title:'Your account', 'aria-label':'Your account', type:'button' },
      '<span class="dk-rail-av">'+initials()+'</span><span class="dk-lbl">Account</span>');
    me.addEventListener('click', function(){ if (typeof openMenu === 'function') openMenu(); });
    bottom.appendChild(tog); bottom.appendChild(menu); bottom.appendChild(me);
    bar.appendChild(bottom);
    railOpen(document.documentElement.classList.contains('dk-rail-open'));
    setTimeout(function(){ var a = me.querySelector('.dk-rail-av'); if (a) a.textContent = initials(); }, 4000);

    // Empty detail panel
    var empty = el('div', { 'class':'dk-empty', 'aria-hidden':'true' },
      '<img src="/brand/adviuz-logo-black.png" alt="">' +
      '<h2>Pick a lead to open it here</h2>' +
      '<p>Calls, texts, emails, notes and follow-ups for the lead you choose show up on this side, so your list stays in view.</p>' +
      '<div class="dk-empty-foot">Adviuz Support · Mon–Fri 10–6 CST · +1 647 250 1152</div>');
    document.body.appendChild(empty);

    // Full-width view for Reports / Dashboard; switching sections closes the open lead
    if (typeof window.goTab === 'function' && !window.goTab._dk) {
      var orig = window.goTab;
      window.goTab = function(name){
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

    hookInfoRows();
    hookLeadRender();
  }

  function apply(){ if (MQ.matches) build(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
  if (MQ.addEventListener) MQ.addEventListener('change', apply);
})();
