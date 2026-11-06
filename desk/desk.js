/* Adviuz Hub — DESKTOP LAYER (desk-2, 2026-10-27; desk-13 compact lead rows 2026-10-31). Pairs with desk.css.
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
  // ── 3-column lead view: Activity moves to its own scrollable column (desk-4) ──
  var MQ3 = window.matchMedia('(min-width: 1280px)');
  function actColumn(){
    var scr = document.getElementById('leadScreen');
    var body = document.getElementById('lsBody');
    if (!scr || !body) return;
    var col = document.getElementById('dkActCol');
    if (!MQ.matches || !MQ3.matches) { scr.classList.remove('dk-3col'); if (col) col.innerHTML = ''; return; }
    var chips = body.querySelector('.act-chips');
    var sec = chips;
    while (sec && sec.parentElement !== body) sec = sec.parentElement;
    if (!sec) { scr.classList.remove('dk-3col'); return; }
    if (!col) { col = document.createElement('aside'); col.id = 'dkActCol'; col.setAttribute('aria-label','Activity'); scr.appendChild(col); }
    col.innerHTML = '';
    sec.classList.add('dk-act-sec');
    col.appendChild(sec);
    scr.classList.add('dk-3col');
  }
  // Quotes / Invoices / Proposal: line icons instead of coloured emoji tiles
  var QB = {
    openLeadQuotes:     ['Quotes',   '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'],
    openLeadInvoices:   ['Invoices', '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>'],
    openProposalWizard: ['Proposal', '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v2h6V3M9 11h6M9 15h6"/>']
  };
  function tidyQuickBtns(){
    if (!MQ.matches) return;
    Object.keys(QB).forEach(function(fn){
      var b = document.querySelector('#leadScreen button[onclick^="' + fn + '"]');
      if (!b || b.classList.contains('dk-qbtn')) return;
      b.classList.add('dk-qbtn');
      b.innerHTML = svg(QB[fn][1], 17) + QB[fn][0];
    });
  }
  // Email / SMS / WhatsApp / Meeting / AI Call / Call move into the lead's top bar (desk-10)
  function actionsToTop(){
    var scr = document.getElementById('leadScreen'), body = document.getElementById('lsBody');
    var top = scr && scr.querySelector('.ls-topbar');
    var old = document.getElementById('dkTopActs'); if (old) old.remove();
    if (!MQ.matches || !top || !body) return;
    var grids = [].slice.call(body.querySelectorAll(':scope > div > div[style*="grid-template-columns:repeat(3,1fr)"]'))
      .filter(function(g){ return !g.querySelector('button[onclick^="openLeadQuotes"],button[onclick^="openLeadInvoices"]'); });
    if (!grids.length) return;
    var sec = grids[0].parentElement;
    var bar = document.createElement('div'); bar.id = 'dkTopActs';
    grids.forEach(function(g){ [].slice.call(g.children).forEach(function(b){
      var t = (b.textContent || '').trim(); if (t) { b.title = t; b.setAttribute('aria-label', t); }
      bar.appendChild(b);
    }); });
    var nav = top.querySelector('.ls-nav');
    top.insertBefore(bar, nav || null);
    sec.remove();
  }

  // ── desk-15: WhatsApp-style open lead (Ajax 2026-10-31). Header with call actions,
  // pinned last recording, activity as a chat (newest at the bottom), a work bar at the
  // bottom for note + stage + follow-up with ONE Save, and a Contact info panel on the right.
  function sectionOf(el, body){ while (el && el.parentElement !== body) el = el.parentElement; return el; }
  function actKind(it){
    var dot = it.querySelector(':scope > .ld-act-dot'), d = dot ? dot.textContent : '';
    if (/📩|📥/.test(d)) return 'in';
    if (/📝/.test(d)) return 'note';
    if (/🕐/.test(d)) return 'sched';
    if (/💬|📧|📄|🧾|💳|📋|📅|👁|✅|⏰|💰/.test(d)) return 'out';
    if (!dot) { var t = it.textContent || ''; if (/Incoming/.test(t)) return 'in'; if (/Outgoing/.test(t)) return 'out'; }
    return 'sys';
  }
  function dkSave(lid){
    var ta = document.getElementById('lsNoteInp'), fu = document.getElementById('lsFuDatetime');
    var note = ta ? ta.value.trim() : '', when = fu ? fu.value : '';
    if (!note && !when) { if (typeof showToast === 'function') showToast('Write a note or pick a follow-up date'); return; }
    if (when && typeof lsQuickSaveFu === 'function') lsQuickSaveFu(lid);
    if (note && typeof lsAddNote === 'function') { var t2 = document.getElementById('lsNoteInp'); if (t2) t2.value = note; lsAddNote(lid); }
  }
  window.dkSave = dkSave;
  function waLayout(){
    var scr = document.getElementById('leadScreen'), body = document.getElementById('lsBody');
    var main = document.getElementById('dkMain');
    if (!scr || !body || !MQ.matches || !MQ3.matches) { scr && scr.classList.remove('dk-wa'); if (main) main.remove(); return; }
    var col = document.getElementById('dkActCol');
    if (!col) return;
    var lid = window.curLid, y = col.scrollTop;
    if (!main) { main = el('div', { id:'dkMain' }); scr.appendChild(main); }
    main.innerHTML = '';
    var pin = el('div', { id:'dkPin' }), work = el('div', { id:'dkWork' });
    main.appendChild(pin); main.appendChild(col); main.appendChild(work);
    scr.classList.remove('dk-3col'); scr.classList.add('dk-wa');

    // 1 · desk-wa2 (Ajax 2026-11-06): no pinned recording on top — each call bubble has its own player
    var none = [].slice.call(body.children).filter(function(c){ return /Recent Call Recording/i.test(c.textContent||''); })[0]; if (none) none.remove();
    var rec0 = body.querySelector('#recAudio0, #recPlayBtn0'); if (rec0) { var rs0 = sectionOf(rec0, body); if (rs0 && rs0 !== body) rs0.remove(); }
    pin.style.display = 'none';

    // 2 · activity as chat bubbles, newest at the bottom
    var sec = col.querySelector('.dk-act-sec');
    if (sec) {
      var items = [].slice.call(sec.querySelectorAll(':scope > .ld-act-item'));
      var n = items.length;
      // desk-wa2: WhatsApp look — day pills ("Today", "Yesterday", "Wed, Nov 4"), time in the bubble corner
      var now = new Date(), dkey = function(d){ return d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate(); };
      var tk = dkey(now), yk = dkey(new Date(now.getTime()-864e5));
      var dayLbl = function(d){ var k = dkey(d); if (k===tk) return 'Today'; if (k===yk) return 'Yesterday';
        return d.toLocaleDateString('en-CA', (now - d < 6*864e5) ? { weekday:'long' } : { weekday:'short', month:'short', day:'numeric', year: d.getFullYear()===now.getFullYear() ? undefined : 'numeric' }); };
      var pillDates = {}, prevDate;
      items.forEach(function(it){ var d0 = new Date(it.getAttribute('data-t') || ''); if (!isNaN(d0.getTime())) pillDates[dkey(d0)] = d0; });
      [].slice.call(sec.querySelectorAll(':scope > .dk-day')).forEach(function(p){ p.remove(); });
      var prevKey = null, prevOrder = 0;
      items.forEach(function(it, i){
        var k = actKind(it);
        it.classList.add('dk-b', 'dk-b-' + k);
        var ord = 2*(n - i) + 20; it.style.order = String(ord);
        var d = new Date(it.getAttribute('data-t') || ''), ok = !isNaN(d.getTime());
        // short clock time in the bottom-right corner
        var bd = it.querySelector(':scope > .ld-act-body');
        if (ok && bd && k !== 'sys') {
          var tt = el('span', { 'class':'dk-b-time' }, d.toLocaleTimeString('en-CA', { hour:'numeric', minute:'2-digit' }));
          bd.appendChild(tt); it.classList.add('dk-has-t');
        }
        // items run newest → oldest; a pill goes above the OLDEST item of each day
        var key = ok ? dkey(d) : prevKey;
        if (prevKey !== null && key !== prevKey) addPill(prevKey, prevOrder);
        if (ok) { prevKey = key; prevOrder = ord; prevDate = d; }
      });
      if (prevKey !== null) addPill(prevKey, prevOrder);
      function addPill(key, ord){
        var d = pillDates[key]; if (!d) return;
        var p = el('div', { 'class':'dk-day' }, '<span>' + dayLbl(d) + '</span>'); p.style.order = String(ord - 1);
        sec.appendChild(p);
      }
    }

    // 3 · composer (desk-18): one calm row like WhatsApp — [+] [note] [Call].
    // Focusing the note opens "log this call": quick outcomes, stage, follow-up, Save.
    var ta = body.querySelector('#lsNoteInp'), stSel = body.querySelector('#lsStageSelect'), fuIn = body.querySelector('#lsFuDatetime');
    var stageSec = sectionOf(stSel, body), notesSec = sectionOf(ta, body);
    var tb = [].slice.call(scr.querySelectorAll('#dkTopActs > button'));
    var pick = function(rx){ return tb.filter(function(b){ return rx.test((b.textContent||'') + ' ' + (b.title||'')); })[0]; };
    // upcoming follow-ups → one quiet line above the composer
    if (stageSec) {
      var pend = [].slice.call(stageSec.children).filter(function(c){ return !c.matches('select') && !/text-transform:uppercase/.test(c.getAttribute('style')||'') && !c.querySelector('#lsFuDatetime'); });
      pend.forEach(function(pdiv){ pdiv.classList.add('dk-c-next'); work.appendChild(pdiv); });
    }
    var box = el('div', { 'class':'dk-c' });
    // log panel (hidden until the note is focused)
    var panel = el('div', { 'class':'dk-c-panel' });
    var sug = el('div', { 'class':'dk-c-sug' }, '<span class="dk-c-k">Outcome</span>');
    [].slice.call(body.querySelectorAll('.note-tpl')).forEach(function(t){
      var b = el('button', { type:'button', 'class':'dk-c-chip' }, (t.textContent||'').replace(/^[^A-Za-z]+/, ''));
      b.addEventListener('click', function(){ t.click(); open(); var x = document.getElementById('lsNoteInp'); if (x) { x.focus(); x.setSelectionRange(x.value.length, x.value.length); } update(); });
      sug.appendChild(b);
    });
    panel.appendChild(sug);
    var fields = el('div', { 'class':'dk-c-fields' });
    if (stSel) { var f1 = el('label', { 'class':'dk-c-f' }, '<span class="dk-c-k">Stage</span>'); f1.appendChild(stSel); fields.appendChild(f1); }
    if (fuIn) { var f2 = el('label', { 'class':'dk-c-f' }, '<span class="dk-c-k">Follow-up</span>'); f2.appendChild(fuIn); fuIn.addEventListener('input', update); fields.appendChild(f2); }
    var sv = el('button', { type:'button', 'class':'dk-save' }, 'Save');
    sv.addEventListener('click', function(){ dkSave(lid); });
    var cancel = el('button', { type:'button', 'class':'dk-c-cancel' }, 'Cancel');
    cancel.addEventListener('click', function(){ var x = document.getElementById('lsNoteInp'); if (x) x.value = ''; if (fuIn) fuIn.value = ''; close(); });
    fields.appendChild(el('span', { 'class':'dk-c-sp' })); fields.appendChild(cancel); fields.appendChild(sv);
    panel.appendChild(fields);
    box.appendChild(panel);
    // desk-19: ways to write are tabs on the message box (Note · Text · Email · WhatsApp);
    // Book appointment · AI call · Call live in the header. Nothing is sent from here —
    // Text and Email open the app's own window pre-filled, so every guard and preview still runs.
    var lead = (typeof lsGetLead === 'function') ? lsGetLead() : null;
    var first = lead ? String(_nmShow(lead.name,'') || lead.company || '').split(/\s+/)[0] : '';
    var MODE = {
      note:['Write a note about this lead…', 'Only your team sees notes', 'Save note'],
      sms:['Text ' + (first || 'this lead') + '…', 'Opens your text window to review and send', 'Continue in text window'],
      email:['Write an email to ' + (first || 'this lead') + '…', 'Opens the email window to review and send', 'Continue in email window'],
      wa:['WhatsApp message to ' + (first || 'this lead') + '…', 'Opens WhatsApp with this message', 'Open in WhatsApp']
    };
    var tabs = el('div', { 'class':'dk-c-tabs', role:'tablist' });
    var TI = { note:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>', sms:'<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z"/>', email:I.mail, wa:'<path d="M3 21l1.6-4.7A9 9 0 1 1 8 19.6z"/>' };
    var TL = { note:'Note', sms:'Text', email:'Email', wa:'WhatsApp' };
    var mode = window._dkMode && MODE[window._dkMode] ? window._dkMode : 'note';
    var from = el('span', { 'class':'dk-c-from' });
    Object.keys(MODE).forEach(function(m){
      var b = el('button', { type:'button', role:'tab', 'data-m':m }, svg(TI[m], 15) + TL[m]);
      b.addEventListener('click', function(){ setMode(m); var x = document.getElementById('lsNoteInp'); if (x) x.focus(); });
      tabs.appendChild(b);
    });
    tabs.appendChild(from);
    box.insertBefore(tabs, box.firstChild);
    var row = el('div', { 'class':'dk-c-row' });
    var subj = el('input', { 'class':'dk-c-subj', placeholder:'Subject', type:'text' });
    var inp = el('div', { 'class':'dk-c-inp' });
    if (ta) { ta.rows = 1; inp.appendChild(ta); ta.addEventListener('focus', function(){ if (mode === 'note') open(); }); ta.addEventListener('input', function(){ ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'; update(); }); ta.addEventListener('keydown', function(e){ if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); } if (e.key === 'Escape') ta.blur(); }); }
    var go = el('button', { type:'button', 'class':'dk-c-send' }, svg('<path d="M5 12h14M13 6l6 6-6 6"/>', 18));
    go.addEventListener('click', send);
    row.appendChild(subj); row.appendChild(inp); row.appendChild(go);
    function setMode(m){
      mode = m; window._dkMode = m;
      [].forEach.call(tabs.querySelectorAll('[data-m]'), function(b){ b.classList.toggle('on', b.getAttribute('data-m') === m); b.setAttribute('aria-selected', b.getAttribute('data-m') === m ? 'true' : 'false'); });
      box.className = 'dk-c m-' + m;
      if (ta) ta.placeholder = MODE[m][0];
      from.textContent = MODE[m][1]; go.title = MODE[m][2]; go.setAttribute('aria-label', MODE[m][2]);
      if (m !== 'note') work.classList.remove('dk-c-open');
    }
    function send(){
      var x = document.getElementById('lsNoteInp'), v = x ? x.value.trim() : '';
      if (mode === 'note') { open(); if (v || (fuIn && fuIn.value)) dkSave(lid); else if (x) x.focus(); return; }
      if (lead && lead.do_not_contact && typeof dncInfo === 'function') { dncInfo(lead.id); return; }
      if (mode === 'sms') {
        var sb = pick(/sms/i); if (!sb) return; sb.click();
        setTimeout(function(){ var c = document.getElementById('smsCompose'); if (c && v) { c.value = v; if (typeof smsGrow === 'function') smsGrow(c); c.focus(); } }, 60);
      } else if (mode === 'email') {
        var canCompose = typeof openEmail === 'function' && !(typeof isClientMode === 'function' && isClientMode()) && !window._isTelecaller;
        if (canCompose && lead) {
          openEmail(lead.id);
          setTimeout(function(){ var sj = document.getElementById('emailSubj'), bd = document.getElementById('emailBody'); if (sj && subj.value.trim()) { sj.value = subj.value.trim(); if (typeof subjValidate === 'function') subjValidate(); } if (bd && v) { bd.textContent = 'Hi ' + (first || 'there') + ',\n\n' + v; } }, 80);
        } else { var eb = pick(/email/i); if (eb) eb.click(); }
      } else if (mode === 'wa') {
        if (typeof _maskBlock === 'function' && _maskBlock('WhatsApp')) return;
        if (!lead || !lead.ph) { if (typeof showToast === 'function') showToast('No phone on file'); return; }
        window.open('https://wa.me/' + String(lead.ph).replace(/[^0-9]/g,'') + (v ? '?text=' + encodeURIComponent(v) : ''), '_blank');
      }
      if (x) { x.value = ''; x.style.height = ''; } subj.value = ''; update();
    }
    setMode(mode);
    box.appendChild(row);
    work.appendChild(box);
    function open(){ work.classList.add('dk-c-open'); }
    function close(){ work.classList.remove('dk-c-open'); update(); }
    function update(){ var x = document.getElementById('lsNoteInp'); sv.disabled = !((x && x.value.trim()) || (fuIn && fuIn.value)); }
    update();
    // click outside an empty composer folds it away again
    work.addEventListener('focusout', function(){ setTimeout(function(){ var x = document.getElementById('lsNoteInp'); if (!work.contains(document.activeElement) && !(x && x.value.trim()) && !(fuIn && fuIn.value)) close(); }, 150); });
    if (notesSec) notesSec.remove();
    if (stageSec) stageSec.remove();

    // 4 · Contact info panel (what's left in the body) + Book appointment
    body.classList.add('dk-side');
    var info = body.querySelector('.dk-info-card');
    var _tbs = [].slice.call(scr.querySelectorAll('#dkTopActs > button')); var meet = _tbs.filter(function(b){ return /appointment/i.test(b.textContent||''); })[0] || _tbs.filter(function(b){ return /meeting/i.test(b.textContent||''); })[0];
    _tbs.forEach(function(b){ if (/ai call/i.test(b.textContent||'')) b.classList.add('dk-aic'); });
    if (meet) {
      meet.classList.add('dk-book'); meet.title = 'Book appointment'; meet.setAttribute('aria-label','Book appointment');
      var lbl = [].slice.call(meet.childNodes).filter(function(c){ return c.nodeType === 3 && c.textContent.trim(); })[0]; if (lbl) lbl.textContent = 'Book appointment';
      var bk = el('button', { type:'button', 'class':'dk-book-big' }, svg(I.cal, 17) + 'Book appointment');
      bk.addEventListener('click', function(){ meet.click(); });
      if (info && info.parentElement === body) body.insertBefore(bk, info.nextSibling); else body.insertBefore(bk, body.firstChild);
    }
    var head = el('div', { 'class':'dk-side-h' }, 'Contact info');
    body.insertBefore(head, body.firstChild);

    // open a new lead at the newest message; keep the reader's place on re-renders
    if (window._dkWaLid !== lid) { window._dkWaLid = lid; requestAnimationFrame(function(){ col.scrollTop = col.scrollHeight; }); }
    else col.scrollTop = y;
  }


  // ── desk-16: show very little, like WhatsApp — header = avatar + name, Book, Call, ⋮ menu.
  // Contact info panel is hidden until you click the name or "Contact info" in the menu.
  var MI = {
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    more:'<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',
    x:'<path d="M6 6l12 12M18 6 6 18"/>',
    up:'<path d="M15 18l-6-6 6-6"/>', down:'<path d="M9 6l6 6-6 6"/>',
    ref:'<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
    robot:'<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01"/>'
  };
  function infoOn(on){
    var scr = document.getElementById('leadScreen'); if (!scr) return;
    scr.classList.toggle('dk-info-on', !!on);
    try { localStorage.setItem('adviuz_dk_info', on ? '1' : '0'); } catch(e){}
  }
  window.dkInfo = infoOn;
  function closeMenu(){ var m = document.getElementById('dkMenu'); if (m) m.classList.remove('open'); }
  document.addEventListener('click', function(e){ if (!e.target.closest || !e.target.closest('#dkMore,#dkMenu')) closeMenu(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeMenu(); });
  function waHeader(){
    var scr = document.getElementById('leadScreen'), top = scr && scr.querySelector('.ls-topbar');
    if (!top) return;
    ['dkMore','dkMenu','dkHAv'].forEach(function(id){ var o = document.getElementById(id); if (o) o.remove(); });
    if (!scr.classList.contains('dk-wa')) return;
    var acts = document.getElementById('dkTopActs');
    var btns = acts ? [].slice.call(acts.children) : [];
    var find = function(rx){ return btns.filter(function(b){ return rx.test((b.textContent||'') + ' ' + (b.title||'')); })[0]; };
    var body = document.getElementById('lsBody');
    var q = function(sel){ return body && body.querySelector(sel); };
    // avatar + name → Contact info
    var title = top.querySelector('.ls-title');
    if (title) {
      var nm = (document.getElementById('lsName')||{}).textContent || '';
      var p = nm.trim().split(/\s+/).filter(Boolean);
      var av = el('button', { id:'dkHAv', type:'button', title:'Contact info', 'aria-label':'Contact info' }, ((p[0]||'?').charAt(0) + (p[1]||'').charAt(0)).toUpperCase());
      av.addEventListener('click', function(){ infoOn(!scr.classList.contains('dk-info-on')); });
      top.insertBefore(av, title);
      if (!title._dk) { title._dk = 1; title.style.cursor = 'pointer'; title.title = 'Contact info'; title.addEventListener('click', function(){ if (scr.classList.contains('dk-wa')) infoOn(!scr.classList.contains('dk-info-on')); }); }
    }
    // ⋮ menu
    var more = el('button', { id:'dkMore', type:'button', title:'More', 'aria-label':'More options', 'aria-haspopup':'menu' }, svg(MI.more, 20));
    var menu = el('div', { id:'dkMenu', role:'menu' });
    var item = function(icon, label, fn){ if (!fn) return; var b = el('button', { type:'button', role:'menuitem' }, svg(icon, 18) + '<span>'+label+'</span>'); b.addEventListener('click', function(){ closeMenu(); fn(); }); menu.appendChild(b); };
    var sep = function(){ menu.appendChild(el('div', { 'class':'dk-msep' })); };
    var clk = function(b){ return b ? function(){ b.click(); } : null; };
    item(MI.info, 'Contact info', function(){ infoOn(true); });
    var bk = find(/appointment/i) || find(/meeting|book/i); item(I.cal, 'Book appointment', clk(bk));
    sep();
    item(I.mail, 'Send email', clk(find(/email/i)));
    item('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z"/>', 'Send text (SMS)', clk(find(/sms/i)));
    item('<path d="M3 21l1.6-4.7A9 9 0 1 1 8 19.6z"/>', 'WhatsApp', clk(find(/whatsapp/i)));
    item(MI.robot, 'AI call', clk(find(/ai call/i)));
    sep();
    item('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>', 'Quotes', clk(q('button[onclick^="openLeadQuotes"]')));
    item('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>', 'Invoices', clk(q('button[onclick^="openLeadInvoices"]')));
    item('<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 11h6M9 15h6"/>', 'Proposal', clk(q('button[onclick^="openProposalWizard"]')));
    var ap = q('div[onclick^="apGoToAiSettings"],div[onclick^="openApSheet"],div[onclick^="apStopInfo"]');
    item(MI.robot, 'AI Autopilot', ap ? function(){ infoOn(true); setTimeout(function(){ ap.scrollIntoView({ block:'center', behavior:'smooth' }); }, 50); } : null);
    sep();
    item(MI.ref, 'Refresh lead', clk(document.getElementById('lsRefresh')));
    item(MI.up, 'Previous lead', clk(document.getElementById('lsPrev')));
    item(MI.down, 'Next lead', clk(document.getElementById('lsNext')));
    item(MI.x, 'Close lead', typeof closeLead === 'function' ? function(){ closeLead(); } : null);
    more.addEventListener('click', function(e){ e.stopPropagation(); menu.classList.toggle('open'); });
    top.appendChild(more); top.appendChild(menu);
    if (bk) { bk.classList.add('dk-book'); bk.title = 'Book appointment'; }
    // Contact info header gets a close (×)
    var h = body && body.querySelector('.dk-side-h');
    if (h && !h.querySelector('button')) { var x = el('button', { type:'button', 'aria-label':'Close contact info', title:'Close' }, svg(MI.x, 18)); x.addEventListener('click', function(){ infoOn(false); }); h.appendChild(x); }
    var saved = null; try { saved = localStorage.getItem('adviuz_dk_info'); } catch(e){}
    scr.classList.toggle('dk-info-on', saved === '1');
  }

  function hookLeadRender(){
    if (typeof window.renderLeadScreen !== 'function' || window.renderLeadScreen._dk) return;
    var orig = window.renderLeadScreen;
    window.renderLeadScreen = function(){
      // the Activity column has room for the whole history
      if (MQ.matches && MQ3.matches) window._actExpand = true;
      var col = document.getElementById('dkActCol'), y = col ? col.scrollTop : 0;
      var r = orig.apply(this, arguments);
      try { markInfoCard(); } catch(e){}
      try { actColumn(); col = document.getElementById('dkActCol'); if (col) col.scrollTop = y; } catch(e){}
      try { tidyQuickBtns(); } catch(e){}
      try { actionsToTop(); } catch(e){}
      try { waLayout(); } catch(e){ if (window.console) console.warn('dk waLayout', e); }
      try { waHeader(); } catch(e){ if (window.console) console.warn('dk waHeader', e); }
      return r;
    };
    window.renderLeadScreen._dk = true;
    if (MQ3.addEventListener) MQ3.addEventListener('change', function(){ try { var id = window.curLid; if (id != null && document.getElementById('leadScreen').classList.contains('open')) window.renderLeadScreen(id); } catch(e){} });
  }

  // ── Leads filters: first 3 shown, "+N more" opens the rest; stage chips get arrows ──
  function hookFilterPills(){
    if (typeof window._lfPillsHTML !== 'function' || window._lfPillsHTML._dk) return;
    var orig = window._lfPillsHTML, LIM = 3;
    window._lfPillsHTML = function(){
      var html = orig.apply(this, arguments);
      if (!MQ.matches) return html;
      var all = html.match(/class="lf-(pill|react)\b[^"]*"/g) || [];
      var n = all.length;
      if (n <= LIM + 1) return html;
      var hiddenOn = all.slice(LIM).filter(function(c){ return /\bon\b/.test(c); }).length;
      var open = !!window._dkLfMore;
      var lbl = open ? 'Fewer filters' : ('+' + (n - LIM) + ' more' + (hiddenOn ? ' · ' + hiddenOn + ' on' : ''));
      var btn = '<button class="lf-pill dk-lf-more' + (hiddenOn && !open ? ' on' : '') + '" onclick="window._dkLfMore=!window._dkLfMore;render()">'
        + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="' + (open ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6') + '"/></svg>' + lbl + '</button>';
      html = html.replace('class="lf-row lf-pills"', 'class="lf-row lf-pills' + (open ? '' : ' dk-lf-collapsed') + '"');
      return html.replace(/<\/div>\s*$/, btn + '</div>');
    };
    window._lfPillsHTML._dk = true;
  }
  function stageArrows(){
    if (!MQ.matches) return;
    document.querySelectorAll('.lf-stages, .lf-pills').forEach(function(row){
      if (row.parentElement && row.parentElement.classList.contains('dk-stagewrap')) { syncArrows(row); return; }
      var wrap = document.createElement('div'); wrap.className = 'dk-stagewrap';
      row.parentNode.insertBefore(wrap, row); wrap.appendChild(row);
      ['l','r'].forEach(function(d){
        var b = document.createElement('button'); b.type = 'button'; b.className = 'dk-sarrow dk-sarrow-' + d;
        b.setAttribute('aria-label', d === 'l' ? 'Scroll back' : 'Show more');
        b.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="' + (d === 'l' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6') + '"/></svg>';
        b.addEventListener('click', function(){ row.scrollBy({ left: (d === 'l' ? -1 : 1) * Math.max(160, row.clientWidth * .7), behavior: 'smooth' }); });
        wrap.appendChild(b);
      });
      row.addEventListener('scroll', function(){ syncArrows(row); }, { passive: true });
      syncArrows(row);
    });
  }
  function syncArrows(row){
    var w = row.parentElement; if (!w) return;
    w.classList.toggle('dk-can-l', row.scrollLeft > 4);
    w.classList.toggle('dk-can-r', row.scrollLeft + row.clientWidth < row.scrollWidth - 4);
  }


  // ── desk-13: WhatsApp-style two-line lead rows (list only; other lRow callers untouched) ──
  var TEMP_DOT = { hot:'#4000f3', warm:'#d97706', cold:'#94a3b8' };
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function ini(t){ var p=String(t||'').replace(/[^\p{L}\p{N}\s]/gu,' ').trim().split(/\s+/).filter(Boolean); return ((p[0]||'?').charAt(0)+(p[1]||'').charAt(0)).toUpperCase(); }
  function tint(hex, a){ var m=/^#([0-9a-f]{6})$/i.exec(String(hex||'')); return m ? '#'+m[1]+a : 'rgba(102,119,129,.12)'; }
  function preview(l){
    try{
      if (window._leadSort==='opened'){ var o=(window._openByDb||{})[l.dbId]; if(o) return '<b>Opened an email</b> · '+esc(timeAgo(o)); }
      var acts=leadAct[l.id]||[], a=acts[0];
      if (a){
        var lbl=cleanActLabel(a), ai=String(a.type||'').toLowerCase()==='ai_analysis', g=ai?_aiGist(a.body):'', cx=ai?_aiCallCtx(a,acts):null;
        lbl = cx ? cx.lbl : _byLbl(a,lbl);
        var body = ai ? g : (a.body ? String(a.body).trim() : '');
        return '<b>'+esc(lbl)+'</b>'+(body?' — '+esc(body.replace(/\s+/g,' ')):'');
      }
      if (l.note) return '<b>Note</b> — '+esc(l.note);
    }catch(e){}
    return esc(l.svc||l.location||'No activity yet');
  }
  function dkRow(l, anySel){
    var company=(l.company||'').trim(), person=_nmShow(l.name,'');
    var title, sub='';
    if (company && person && company.toLowerCase()!==person.toLowerCase()){ title=company; sub=person; } else title = company||person||'Unnamed';
    var col=stgColor(l.stage), isSel=selIds.has(l.id);
    var on = (window.curLid===l.id) && document.getElementById('leadScreen') && document.getElementById('leadScreen').classList.contains('open');
    var tAt=(window._touchAt||{})[String(l.dbId||'')], tl=tAt?timeAgo(new Date(tAt).toISOString()):(l.t||'');
    var fI=l.first_inquiry_at||l.created_at, cA=l.created_at;
    var back = fI && cA && (new Date(cA)-new Date(fI) > 36*3600*1000);
    var tp=leadTemp(l.stage), dot=TEMP_DOT[tp], stName=String(l.stage||'').replace(/^\d+\.\s*/,'');
    var cb='<div class="l-cb'+(anySel?' vis':'')+(isSel?' chk':'')+'" onclick="event.stopPropagation();toggleSel('+l.id+')"></div>';
    return '<div class="dk-lr'+(isSel?' sel':'')+(on?' dk-on':'')+'" data-lid="'+l.id+'" '
      +'onclick="'+(anySel?'toggleSel('+l.id+')':'openLead('+l.id+')')+'" oncontextmenu="event.preventDefault();startSel('+l.id+')">'
      +(anySel?cb:'')
      +'<div class="dk-av" style="background:'+tint(col,'1f')+';color:'+col+'">'+esc(ini(title))+'</div>'
      +'<div class="dk-lr-main">'
        +'<div class="dk-lr-1"><span class="dk-lr-nm" title="'+esc(title+(sub?' · '+sub:''))+'">'+esc(title)+(sub?'<span class="dk-lr-p"> · '+esc(sub)+'</span>':'')+'</span>'
          +(l.do_not_contact?'<span class="dk-dnd">DND</span>':'')
          +'<span class="dk-lr-t"'+(back?' title="Returning lead"':'')+'>'+(back?'↩ ':'')+esc(tl)+'</span></div>'
        +'<div class="dk-lr-2"><span class="dk-lr-pv">'+preview(l)+'</span>'
          +(stName?'<span class="dk-lr-st" style="background:'+tint(col,'14')+';color:'+col+'"'+(dot?' title="'+tp.charAt(0).toUpperCase()+tp.slice(1)+' lead"':'')+'>'+(dot?'<span class="dk-lr-dot" style="background:'+dot+'"></span>':'')+esc(stName)+'</span>':'')
        +'</div>'
      +'</div></div>';
  }
  function hookLeadRow(){
    if (typeof window.lRow !== 'function' || window.lRow._dk) return;
    var orig = window.lRow;
    window.lRow = function(l, anySel){
      if (MQ.matches && arguments.length <= 2 && l) { try { return dkRow(l, anySel); } catch(e){} }
      return orig.apply(this, arguments);
    };
    window.lRow._dk = true;
  }
  function markOpen(){
    var ls=document.getElementById('leadScreen'), open=ls && ls.classList.contains('open');
    document.querySelectorAll('.dk-lr').forEach(function(r){ r.classList.toggle('dk-on', !!open && String(window.curLid)===r.getAttribute('data-lid')); });
  }
  function hookOpenClose(){
    ['openLead','closeLead'].forEach(function(fn){
      if (typeof window[fn] !== 'function' || window[fn]._dk) return;
      var o = window[fn];
      window[fn] = function(){ var r = o.apply(this, arguments); try { markOpen(); setTimeout(markOpen, 60); } catch(e){} return r; };
      window[fn]._dk = true;
    });
  }
  // stage chips: first 5 + "+N more" (the selected one always stays visible)
  function tidyFilters(){
    if (!MQ.matches) return;
    hookFilterSheet();
    // filter pills: Campaigns + Locations (or Time) up front, the rest behind "More filters"
    document.querySelectorAll('.lf-pills').forEach(function(row){
      if (row.getAttribute('data-dkt')) return; row.setAttribute('data-dkt','1');
      var pills=[].slice.call(row.querySelectorAll(':scope > .lf-pill:not(.dk-lf-more)'));
      var hasLoc=pills.some(function(b){ return /lfPick\('loc'\)/.test(b.getAttribute('onclick')||''); });
      var keep=hasLoc ? /lfPick\('(camp|loc)'\)/ : /lfPick\('(camp|time)'\)/;
      var hidden=0, hiddenOn=0;
      pills.forEach(function(b){
        if (keep.test(b.getAttribute('onclick')||'')) return;
        if (b.classList.contains('on')) { hiddenOn++; return; }
        b.classList.add('dk-pf-x'); hidden++;
      });
      if (!hidden) return;
      var m=document.createElement('button'); m.type='button'; m.className='lf-pill dk-pf-more';
      var set=function(){ row.classList.toggle('dk-pf-open', !!window._dkPfMore); m.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg><span>'+(window._dkPfMore?'Fewer':'More filters')+'</span>'; };
      m.addEventListener('click', function(e){ e.stopPropagation(); window._dkPfMore=!window._dkPfMore; set(); });
      var react=row.querySelector(':scope > .lf-react');
      row.insertBefore(m, null); set();
    });
    // desk-15: stage chips sit on ONE line — as many as fit, the rest behind "+N more"
    document.querySelectorAll('.lf-stages').forEach(function(row){
      if (row.getAttribute('data-dkt')) return; row.setAttribute('data-dkt','1');
      fitStages(row);
    });
  }
  function _stSel(b){ return /color:#fff|color:#4000f3/.test(b.getAttribute('style')||''); }
  function fitStages(row){
    var old=row.querySelector(':scope > .dk-st-more'); if (old) old.remove();
    var kids=[].slice.call(row.children);
    kids.forEach(function(b){ b.classList.remove('dk-st-x'); });
    var open=!!window._dkStMore;
    row.classList.toggle('dk-st-open', open);
    var mk=function(txt){ var m=document.createElement('button'); m.type='button'; m.className='dk-st-more'; m.textContent=txt;
      m.addEventListener('click', function(e){ e.stopPropagation(); window._dkStMore=!window._dkStMore; fitStages(row); }); row.appendChild(m); };
    if (open) { mk('Fewer'); return; }
    if (!kids.length) return;
    // read every position first, then write (no layout thrash)
    var cs=getComputedStyle(row), W=row.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);
    if (W<=0) return;
    var x0=kids[0].offsetLeft, rights=kids.map(function(b){ return b.offsetLeft - x0 + b.offsetWidth; });
    if (rights[rights.length-1] <= W) return;           // everything fits — no button
    var avail=W-96, hide=[];
    kids.forEach(function(b,i){ if (rights[i] > avail && !_stSel(b)) hide.push(b); });
    hide.forEach(function(b){ b.classList.add('dk-st-x'); });
    if (hide.length) mk('+' + hide.length + ' more');
  }
  var _stRT=null;
  window.addEventListener('resize', function(){
    if (!MQ.matches) return; clearTimeout(_stRT);
    _stRT=setTimeout(function(){ document.querySelectorAll('.lf-stages').forEach(fitStages); }, 150);
  });
  // desk-15: Re-activate leads moves into the Filter sheet (the pills row is hidden on desktop)
  function hookFilterSheet(){
    if (typeof window.openGlobalFilter !== 'function' || window.openGlobalFilter._dk) return;
    var o=window.openGlobalFilter;
    window.openGlobalFilter=function(){
      var r=o.apply(this, arguments);
      try {
        var body=document.getElementById('gfsBody'), ex=document.getElementById('dkGfsRx');
        if (ex) ex.remove();
        var rx=window._lfRx;
        if (MQ.matches && window.curTab==='leads' && body && typeof window.lfReactSheet==='function' && rx && (rx.sms||rx.em||rx.call||rx.ce)) {
          var b=document.createElement('button'); b.id='dkGfsRx'; b.type='button'; b.className='dk-gfs-rx';
          b.innerHTML='<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>Re-activate leads';
          b.addEventListener('click', function(){ var ov=document.getElementById('gfsOverlay'); if (ov) ov.style.display='none'; window.lfReactSheet(); });
          body.parentNode.insertBefore(b, body);
        }
      } catch(e){}
      return r;
    };
    window.openGlobalFilter._dk=true;
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
      '<img src="/desk/mark.png?v=2" alt="" width="22" height="22">');
    logo.addEventListener('click', function(){ location.reload(); });
    head.appendChild(logo);
    var word = el('img', { 'class':'dk-rail-word', src:'/adviuz-logo-purple.png', alt:'Adviuz' });
    word.addEventListener('click', function(){ location.reload(); });
    head.appendChild(word);
    bar.insertBefore(head, bar.firstChild);

    // Brand icon set (one stroke weight, one size) + short labels under each icon
    var NAV = {
      'tab-leads':     ['Leads',      '<circle cx="9" cy="8" r="3.4"/><path d="M3 19.5c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 4.8a3.2 3.2 0 0 1 0 6.4"/><path d="M18 14.3c1.8.6 3 2.5 3 5.2"/>'],
      'tab-followups': ['Follow-ups', '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/><path d="m9 15 2 2 4-4"/>'],
      'tab-reports':   ['Reports',    '<path d="M4 20h16"/><rect x="5.5" y="12" width="3" height="5.5" rx="1"/><rect x="10.5" y="7" width="3" height="10.5" rx="1"/><rect x="15.5" y="9.5" width="3" height="8" rx="1"/>'],
      'tab-calls':     ['Inbox',      '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V17h0A2.5 2.5 0 0 1 4 14.5z"/><path d="M8.5 9.5h7M8.5 12.5h4.5"/>'],
      'tab-dashboard': ['Dashboard',  '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>'],
      'tab-me':        ['Me',         '<circle cx="12" cy="8.5" r="3.8"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/>']
    };
    bar.querySelectorAll('.tab').forEach(function(t){
      var cfg = NAV[t.id];
      var old = t.querySelector('svg');
      if (cfg && old) {
        var ns = document.createElement('span'); ns.className = 'dk-ico';
        ns.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + cfg[1] + '</svg>';
        old.replaceWith(ns);
      }
      var l = t.querySelector('.tab-lbl');
      var name = cfg ? cfg[0] : (l ? l.textContent.replace(/\s*\(\d+\)$/, '') : '');
      if (!t.querySelector('.dk-mini')) { var m = document.createElement('span'); m.className = 'dk-mini'; m.textContent = name; t.appendChild(m); }
      if (name) { t.title = name; t.setAttribute('aria-label', name); }
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
    var bell = document.getElementById('tbNotifBtn');
    if (bell) { bell.title = 'Notifications'; bell.setAttribute('aria-label','Notifications'); bottom.appendChild(bell); }
    bottom.appendChild(tog); bottom.appendChild(menu); bottom.appendChild(me);
    bar.appendChild(bottom);
    railOpen(document.documentElement.classList.contains('dk-rail-open'));
    setTimeout(function(){ var a = me.querySelector('.dk-rail-av'); if (a) a.textContent = initials(); }, 4000);

    // Empty detail panel
    var empty = el('div', { 'class':'dk-empty', 'aria-hidden':'true' },
      '<img src="/adviuz-logo-purple.png" alt="">' +
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
        try { document.body.classList.toggle('dk-wide', !!WIDE_TABS[name]); document.body.classList.toggle('dk-tab-leads', name === 'leads'); } catch(e){}
        return r;
      };
      window.goTab._dk = true;
    }
    try { document.body.classList.toggle('dk-wide', !!WIDE_TABS[window.curTab]); document.body.classList.toggle('dk-tab-leads', (window.curTab || 'leads') === 'leads'); } catch(e){}

    hookInfoRows();
    hookLeadRender();
    hookLeadRow();
    hookOpenClose();
    hookFilterSheet();
    try { if (curTab === 'leads' && typeof render === 'function') render(); } catch(e){}
    var content = document.getElementById('content');
    if (content && window.MutationObserver) {
      var t = null;
      new MutationObserver(function(){ clearTimeout(t); t = setTimeout(tidyFilters, 30); }).observe(content, { childList: true, subtree: true });
    }
    tidyFilters();
  }

  function apply(){ if (MQ.matches) build(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
  if (MQ.addEventListener) MQ.addEventListener('change', apply);
})();
