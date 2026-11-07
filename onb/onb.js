/* onb-2 (2026-11-06, Ajax): client setup wizard + status screens.
   Part 1 (right after payment) asks only what the design needs; part 2 (after the client approves the design)
   asks the rest. AI-only plans get one short wizard. "Fill in from my website" pre-fills empty fields.
   Loaded on demand by app.html / desktop.html (onbGate). All reads/writes go through the onboarding_* RPCs;
   uploads go to the private "onboarding" bucket under <client_id>/. Drafts are only returned after Ajax approves. */
(function () {
  'use strict';
  var O = null, root = null, busy = false, errs = {};
  var ICON = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>',
    up: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>',
    doc: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
    pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>',
    globe: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
    ext: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>'
  };
  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var AGES = ['18\u201324', '25\u201334', '35\u201344', '45\u201354', '55\u201364', '65+'];
  var TIMES = (function () { var t = []; for (var h = 6; h <= 23; h++) { [0, 30].forEach(function (m) { var hh = h % 12 || 12, ap = h < 12 ? 'AM' : 'PM'; t.push(hh + ':' + (m ? '30' : '00') + ' ' + ap); }); } return t; })();

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function A() { return O.answers || (O.answers = {}); }
  function v(k, d) { var x = A()[k]; return x == null ? (d == null ? '' : d) : x; }
  function isFly() { return O.kind === 'flyers' || O.kind === 'complete'; }

  // \u2500\u2500 steps: part 1 = what the design needs; part 2 (status "details") = the rest \u2500\u2500
  function steps() {
    if (O.kind === 'ai') return [['basics_ai', 'Your business'], ['hours', 'Hours'], ['services', 'Services'], ['faqs', 'Questions'], ['bookings', 'Bookings'], ['review', 'Submit']];
    if (O.status === 'details') {
      var p2 = [['audience', 'Audience'], ['hours', 'Hours'], ['alerts', 'Lead alerts']];
      if (O.kind === 'complete') p2.push(['services', 'Services'], ['faqs', 'Questions'], ['bookings', 'Bookings']);
      p2.push(['review2', 'Submit']);
      return p2;
    }
    return [['basics', 'Basics'], ['message', 'Your message'], ['contact', 'On the page'], ['look', 'Look'], ['review', 'Submit']];
  }

  async function rpc(name, body) {
    var r = await sbFetch('/rest/v1/rpc/' + name, { method: 'POST', body: JSON.stringify(body || {}) });
    var j = await r.json().catch(function () { return null; });
    if (!r.ok) throw new Error((j && (j.message || j.error)) || ('HTTP ' + r.status));
    return j;
  }
  async function save(step) {
    try {
      var clean = (O.files || []).map(function (f) { return { slot: f.slot, path: f.path, name: f.name, type: f.type, size: f.size }; });
      var o = await rpc('onboarding_save', { p_step: step, p_answers: O.answers, p_files: clean });
      if (o) O.step = o.step;
    } catch (e) { console.warn('[onb] save', e); }
  }

  // \u2500\u2500 shell \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  function shell(inner, withRail) {
    var rail = '';
    if (withRail) {
      var st = steps(), cur = Math.min(O.step, st.length);
      rail = '<nav class="onb-rail" aria-label="Setup steps"><div class="onb-rail-h">' + (O.status === 'details' ? 'Finish your setup' : 'Account setup') + '</div>' + st.map(function (x, i) {
        var k = i + 1, c = k === cur ? 'cur' : (k < cur ? 'done' : '');
        return '<button type="button" class="' + c + '" data-go="' + k + '"><span class="onb-dot">' + (k < cur ? ICON.check : k) + '</span><span>' + esc(x[1]) + '</span></button>';
      }).join('') + '<div class="onb-rail-f">Your answers save as you go. You can come back anytime.</div></nav>';
    }
    root.innerHTML = '<header class="onb-top"><div class="onb-brand"><span class="onb-mark"></span><span>Adviuz</span></div>'
      + '<button type="button" class="onb-out" data-act="out">Sign out</button></header>'
      + '<div class="onb-wrap">' + rail + '<div class="onb-main">' + inner + '</div></div>';
  }

  // \u2500\u2500 wizard \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  function render() {
    if (O.status !== 'wizard' && O.status !== 'details') return renderStatus();
    var st = steps(); if (O.step > st.length) O.step = st.length; if (O.step < 1) O.step = 1;
    var key = st[O.step - 1][0], n = st.length;
    var pct = Math.round((O.step - 0.5) / n * 100);
    var partLbl = O.kind === 'ai' ? 'AI Conversion Engine' : (O.status === 'details' ? 'Part 2: finish your setup' : 'Part 1: your design');
    var body = '<div class="onb-prog"><div class="onb-prog-t"><span>Step ' + O.step + ' of ' + n + '</span><span>' + partLbl + '</span></div><div class="onb-bar"><i style="width:' + pct + '%"></i></div></div>'
      + '<div class="onb-body"><div class="onb-col">' + (PANES[key] || function () { return ''; })() + '</div></div>'
      + '<div class="onb-nav">' + (O.step > 1 ? '<button type="button" class="onb-btn2" data-act="back">Back</button>' : '') + '<button type="button" class="onb-btn" data-act="next">' + (/^review/.test(key) ? 'Submit' : 'Continue') + '</button></div>';
    shell(body, true);
    var b = root.querySelector('.onb-body'); if (b) b.scrollTop = 0;
  }
  function fld(k, label, ph, hint, type, extra) {
    var e = errs[k];
    return '<div><label class="onb-lb" for="onb-' + k + '">' + esc(label) + '</label><input class="onb-in' + (e ? ' bad' : '') + '" id="onb-' + k + '" data-k="' + k + '" type="' + (type || 'text') + '" placeholder="' + esc(ph) + '" value="' + esc(v(k)) + '"' + (extra || '') + '>' + (hint ? '<p class="onb-hp">' + esc(hint) + '</p>' : '') + (e ? '<div class="onb-err">' + esc(e) + '</div>' : '') + '</div>';
  }
  function area(k, label, ph, hint) {
    var e = errs[k];
    return '<div><label class="onb-lb" for="onb-' + k + '">' + esc(label) + '</label><textarea class="onb-ta' + (e ? ' bad' : '') + '" id="onb-' + k + '" data-k="' + k + '" placeholder="' + esc(ph) + '">' + esc(v(k)) + '</textarea>' + (hint ? '<p class="onb-hp">' + esc(hint) + '</p>' : '') + (e ? '<div class="onb-err">' + esc(e) + '</div>' : '') + '</div>';
  }
  function head(t, p) { return '<div><h1 class="onb-h">' + esc(t) + '</h1><p class="onb-p">' + esc(p) + '</p></div>'; }
  function siteBlock() {
    return '<div><label class="onb-lb" for="onb-website">Website (if you have one)</label><div class="onb-row"><input class="onb-in" id="onb-website" data-k="website" placeholder="yourbusiness.ca" value="' + esc(v('website')) + '"><button type="button" class="onb-btn2" data-act="site" style="flex-shrink:0;display:flex;align-items:center;gap:6px;white-space:nowrap">' + ICON.globe + '<span>Fill in for me</span></button></div><p class="onb-hp" id="onbSiteMsg">We\'ll read your website and fill in what we can. You can change anything.</p></div>';
  }
  // simple hours: open days + one opening and closing time + an optional note for exceptions
  function syncHours() {
    var days = v('open_days', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']), op = v('open_time', '9:00 AM'), cl = v('close_time', '6:00 PM'), h = {};
    DAYS.forEach(function (d) { h[d] = days.indexOf(d) > -1 ? { closed: false, text: op + ' \u2013 ' + cl } : { closed: true, text: '' }; });
    A().hours = h;
  }
  function hoursPane(intro) {
    var days = v('open_days', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    return head('Opening hours', intro)
      + '<div><span class="onb-lb">Open on</span><div class="onb-chips">' + DAYS.map(function (d) { var on = days.indexOf(d) > -1; return '<button type="button" class="onb-chip' + (on ? ' on' : '') + '" data-day="' + d + '" aria-pressed="' + on + '">' + d + '</button>'; }).join('') + '</div></div>'
      + '<div class="onb-row" style="gap:12px"><div style="flex:1"><span class="onb-lb">Opens</span><button type="button" class="onb-in" data-time="open_time" style="text-align:left;cursor:pointer">' + esc(v('open_time', '9:00 AM')) + '</button></div>'
      + '<div style="flex:1"><span class="onb-lb">Closes</span><button type="button" class="onb-in" data-time="close_time" style="text-align:left;cursor:pointer">' + esc(v('close_time', '6:00 PM')) + '</button></div></div>'
      + fld('hours_exceptions', 'Different hours on some days? (optional)', 'Saturday 10 AM \u2013 2 PM');
  }
  function timeSheet(key) {
    var cur = v(key, key === 'open_time' ? '9:00 AM' : '6:00 PM');
    var ov = document.createElement('div'); ov.className = 'onb-sheet-ov';
    ov.innerHTML = '<div class="onb-sheet" role="dialog" aria-label="Pick a time"><div class="onb-grab"></div><b style="font-size:16px">' + (key === 'open_time' ? 'Opens at' : 'Closes at') + '</b><div class="onb-chips" style="max-height:50vh;overflow-y:auto">' + TIMES.map(function (t) { return '<button type="button" class="onb-chip' + (t === cur ? ' on' : '') + '" data-t="' + t + '">' + t + '</button>'; }).join('') + '</div><button type="button" class="onb-btn2" data-t="">Cancel</button></div>';
    ov.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-t]') : null;
      if (e.target === ov || (b && !b.dataset.t)) { ov.remove(); return; }
      if (b) { A()[key] = b.dataset.t; syncHours(); ov.remove(); render(); save(O.step); }
    });
    document.body.appendChild(ov);
  }
  function fileList(slot) {
    var fs = (O.files || []).filter(function (f) { return f.slot === slot; });
    if (!fs.length) return '';
    return '<div class="onb-files">' + fs.map(function (f) {
      var img = /^image\//.test(f.type || '') && f._url ? '<img src="' + esc(f._url) + '" alt="">' : '<span class="onb-num" style="width:40px;height:40px;border-radius:8px">' + ICON.doc + '</span>';
      return '<div class="onb-file">' + img + '<span>' + esc(f.name) + '</span><button type="button" data-rmfile="' + esc(f.path) + '">Remove</button></div>';
    }).join('') + '</div>';
  }
  function uploader(slot, label, sub, accept, multi) {
    return '<label class="onb-up">' + ICON.up + '<span>' + esc(label) + '</span><small>' + esc(sub) + '</small><input type="file" data-slot="' + slot + '" accept="' + accept + '"' + (multi ? ' multiple' : '') + '></label>' + fileList(slot);
  }
  function listBlock(k, fields, addLabel) {
    var arr = v(k, []); if (!arr.length) arr = [{}];
    A()[k] = arr;
    return arr.map(function (it, i) {
      return '<div class="onb-card">' + (arr.length > 1 ? '<button type="button" class="onb-x" data-rmrow="' + k + ':' + i + '">Remove</button>' : '') + fields.map(function (f) {
        var val = esc(it[f[0]] || '');
        return f[2] === 'ta' ? '<textarea class="onb-ta" data-list="' + k + ':' + i + ':' + f[0] + '" placeholder="' + esc(f[1]) + '" aria-label="' + esc(f[1]) + '">' + val + '</textarea>'
          : '<input class="onb-in" data-list="' + k + ':' + i + ':' + f[0] + '" placeholder="' + esc(f[1]) + '" aria-label="' + esc(f[1]) + '" value="' + val + '">';
      }).join('') + '</div>';
    }).join('') + '<button type="button" class="onb-add" data-addrow="' + k + '">+ ' + esc(addLabel) + '</button>';
  }
  function chips(k, opts, multi) {
    var cur = v(k, multi ? [] : '');
    return '<div class="onb-chips">' + opts.map(function (o) {
      var on = multi ? cur.indexOf(o) > -1 : cur === o;
      return '<button type="button" class="onb-chip' + (on ? ' on' : '') + '" data-chip="' + k + '" data-val="' + esc(o) + '" data-multi="' + (multi ? 1 : 0) + '" aria-pressed="' + on + '">' + esc(o) + '</button>';
    }).join('') + '</div>';
  }
  function addrField(k, label, ph, hint) {
    return '<div style="position:relative">' + fld(k, label, ph, hint, 'text', ' autocomplete="off" data-addr="1"') + '<div class="onb-sugg" id="onbSugg-' + k + '" style="display:none"></div></div>';
  }

  var PANES = {
    basics: function () {
      return head('The basics', 'A few details so we can design your page.')
        + siteBlock()
        + fld('campaign_name', 'Campaign name', 'Spring Invisalign offer', 'Just for you and us, so we can tell your campaigns apart.')
        + fld('brand_name', 'Brand name', 'Bright Smile Dental', 'The name people should see on your page.')
        + fld('region', 'Region or city to target', 'Saskatoon, SK')
        + fld('postal_codes', 'Postal codes (optional)', 'S7K, S7H, S7N', 'The first 3 characters are enough.');
    },
    message: function () {
      var u = v('usps', ['', '', '', '', '']), ph = ['20+ years of experience', 'Same-week appointments', 'Payment plans available', 'Free parking', '5-star Google reviews'];
      return head('Your message', 'What people see first. Short and clear works best.')
        + fld('punchline', 'Punchline', 'Straighter teeth, without metal braces', 'One line. The big headline at the top of your page.')
        + fld('sub_punchline', 'Sub-punchline', 'Free consultation and 3D smile preview this month')
        + '<div><span class="onb-lb">5 reasons to choose you</span><div style="display:flex;flex-direction:column;gap:8px">' + [0, 1, 2, 3, 4].map(function (i) {
          return '<div class="onb-row"><span class="onb-num">' + (i + 1) + '</span><input class="onb-in" data-usp="' + i + '" placeholder="' + ph[i] + '" aria-label="Reason ' + (i + 1) + '" value="' + esc(u[i] || '') + '"></div>';
        }).join('') + '</div>' + (errs.usps ? '<div class="onb-err">' + esc(errs.usps) + '</div>' : '') + '</div>'
        + area('offer', 'Services and offer', 'Invisalign, whitening, check-ups. Offer: free consultation + $500 off Invisalign until Dec 31.');
    },
    contact: function () {
      return head('On your page', "The number on your page's Call button, and the address for Get directions.")
        + fld('call_phone', 'Phone number for calls', '(306) 555-0123', 'Leads tap Call and reach this number.', 'tel')
        + addrField('address', 'Business address', 'Start typing, e.g. 125 Stonebridge', 'Used for the Get directions button.');
    },
    look: function () {
      var cs = v('colors', ['#4000f3', '#111b21']);
      return head('The look', 'So your page looks like you.')
        + '<div><span class="onb-lb">Logo</span>' + uploader('logo', 'Upload your logo', 'PNG, SVG or JPG', 'image/*', false) + '</div>'
        + '<div><span class="onb-lb">Brand colours</span><div class="onb-sw">' + cs.map(function (c, i) {
          return '<label style="background:' + esc(c) + '" aria-label="Colour ' + (i + 1) + '"><input type="color" data-color="' + i + '" value="' + esc(c) + '"></label>';
        }).join('') + (cs.length < 4 ? '<button type="button" class="onb-chip" data-act="addcolor">+ Add colour</button>' : '') + '</div><p class="onb-hp">Not sure? Skip it. We\'ll take the colours from your logo.</p></div>'
        + '<div><span class="onb-lb">Photos and videos (optional)</span>' + uploader('media', 'Add photos or videos', 'Real photos of your work, team or place. Videos up to 2 minutes.', 'image/*,video/*', true) + '</div>';
    },
    audience: function () {
      return head('Who should see your flyer?', 'We show your flyer only to the people you pick.')
        + fld('region', 'Region or city', 'Saskatoon, SK') + fld('postal_codes', 'Postal codes (optional)', 'S7K, S7H, S7N', 'The first 3 characters are enough.')
        + '<div><span class="onb-lb">Age groups</span>' + chips('ages', AGES, true) + '</div>'
        + '<div><span class="onb-lb">Gender</span>' + chips('gender', ['All', 'Women', 'Men'], false) + '</div>';
    },
    hours: function () { return hoursPane(O.kind === 'ai' ? 'Your AI books meetings only in these hours.' : 'Three taps. Add any exceptions below.'); },
    alerts: function () {
      return head('Where should we send new leads?', 'You get a message the moment someone asks about your offer.')
        + fld('alert_email', 'Email for new-lead alerts', 'you@yourbusiness.ca', '', 'email')
        + fld('alert_phone', 'Mobile number for text alerts', '(306) 555-0123', '', 'tel');
    },
    basics_ai: function () {
      return head('Your business', 'Your AI learns from this, so it answers like your own team.')
        + siteBlock() + fld('brand_name', 'Business name', 'Hair Tattoo Clinic')
        + addrField('address', 'Address', 'Start typing, e.g. 123 Main St')
        + area('what_you_do', 'What do you do, in one or two lines?', 'Scalp micropigmentation for men and women with hair loss.');
    },
    services: function () {
      return head('Services and prices', 'Add what you offer. Prices are optional. Your AI only shares a price if you add one.')
        + listBlock('services', [['name', 'Service, e.g. Free consultation'], ['price', 'Price (optional), e.g. Free']], 'Add another service');
    },
    faqs: function () {
      return head('Common questions', 'The questions customers ask you most, with your answers.')
        + listBlock('faqs', [['q', 'Question, e.g. Does it hurt?'], ['a', 'Your answer', 'ta']], 'Add another question');
    },
    bookings: function () {
      return head('Bookings and transfers', 'How your AI should book people in, and when to pass a call to you.')
        + '<div><span class="onb-lb">Meeting length</span>' + chips('meeting_len', ['15 min', '30 min', '45 min', '60 min'], false) + '</div>'
        + fld('transfer_phone', 'Number to transfer hot calls to', '(416) 555-0199', 'When a caller is ready, the AI can put them through to you.', 'tel')
        + fld('alert_contact', 'Who gets new-booking alerts?', 'Name and mobile number');
    },
    review: function () { return summary(); },
    review2: function () { return summary(); }
  };
  function summary() {
    var st = steps(), rows = [];
    function r(lbl, val, key) { var ix = 1; for (var i = 0; i < st.length; i++) if (st[i][0] === key) ix = i + 1; rows.push('<button type="button" data-go="' + ix + '"><span>' + esc(lbl) + '</span><span>' + esc(val || 'Not added') + '</span></button>'); }
    var keys = st.map(function (x) { return x[0]; });
    if (keys.indexOf('basics') > -1) { r('Campaign', v('campaign_name'), 'basics'); r('Brand', v('brand_name'), 'basics'); r('Target area', [v('region'), v('postal_codes')].filter(Boolean).join(' \u00b7 '), 'basics'); }
    if (keys.indexOf('message') > -1) { r('Punchline', v('punchline'), 'message'); r('Reasons', v('usps', []).filter(Boolean).length + ' of 5 added', 'message'); }
    if (keys.indexOf('contact') > -1) { r('Call number', v('call_phone'), 'contact'); r('Address', v('address'), 'contact'); }
    if (keys.indexOf('look') > -1) { r('Logo', (O.files || []).some(function (f) { return f.slot === 'logo'; }) ? 'Added' : '', 'look'); r('Photos and videos', String((O.files || []).filter(function (f) { return f.slot === 'media'; }).length), 'look'); }
    if (keys.indexOf('basics_ai') > -1) { r('Business', v('brand_name'), 'basics_ai'); r('Website', v('website'), 'basics_ai'); }
    if (keys.indexOf('audience') > -1) r('Audience', [v('region'), (v('ages', []).length ? v('ages', []).length + ' age groups' : ''), v('gender')].filter(Boolean).join(' \u00b7 '), 'audience');
    if (keys.indexOf('hours') > -1) r('Hours', v('open_days', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']).join(', ') + ' \u00b7 ' + v('open_time', '9:00 AM') + ' \u2013 ' + v('close_time', '6:00 PM'), 'hours');
    if (keys.indexOf('alerts') > -1) r('Lead alerts', [v('alert_email'), v('alert_phone')].filter(Boolean).join(' \u00b7 '), 'alerts');
    if (keys.indexOf('services') > -1) r('Services', String(v('services', []).filter(function (x) { return x && x.name; }).length), 'services');
    if (keys.indexOf('faqs') > -1) r('Questions', String(v('faqs', []).filter(function (x) { return x && x.q; }).length), 'faqs');
    if (keys.indexOf('bookings') > -1) r('Transfers to', v('transfer_phone'), 'bookings');
    return head('Check and submit', 'Tap any line to change it.') + '<div class="onb-sum">' + rows.join('') + '</div>' + (errs._submit ? '<div class="onb-err">' + esc(errs._submit) + '</div>' : '');
  }

  function validate(key) {
    errs = {};
    var digits = function (s) { return String(s || '').replace(/\D/g, '').length; };
    if (key === 'basics' && !String(v('brand_name')).trim()) errs.brand_name = 'Please add your brand name.';
    if (key === 'basics' && !String(v('region')).trim() && !String(v('postal_codes')).trim()) errs.region = 'Add a region, city or postal code.';
    if (key === 'basics_ai' && !String(v('brand_name')).trim()) errs.brand_name = 'Please add your business name.';
    if (key === 'contact' && digits(v('call_phone')) < 10) errs.call_phone = 'Please add a 10-digit phone number.';
    if (key === 'message' && !String(v('punchline')).trim()) errs.punchline = 'Please add a punchline.';
    if (key === 'message' && v('usps', []).filter(function (x) { return String(x || '').trim(); }).length < 3) errs.usps = 'Please add at least 3 reasons.';
    if (key === 'alerts' && v('alert_email') && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v('alert_email'))) errs.alert_email = 'Please check this email address.';
    if (key === 'alerts' && !v('alert_email') && digits(v('alert_phone')) < 10) errs.alert_email = 'Add an email or a mobile number for alerts.';
    if (key === 'bookings' && v('transfer_phone') && digits(v('transfer_phone')) < 10) errs.transfer_phone = 'Please add a 10-digit phone number.';
    return Object.keys(errs).length === 0;
  }

  // \u2500\u2500 "Fill in from my website" \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  function to12(t) { return String(t || '').trim(); }
  async function fillFromSite(btn) {
    var url = String(v('website')).trim(), msg = document.getElementById('onbSiteMsg');
    if (!url) { if (msg) { msg.style.color = 'var(--red,#cc0000)'; msg.textContent = 'Type your website first.'; } return; }
    btn.disabled = true; if (msg) { msg.style.color = ''; msg.textContent = 'Reading your website\u2026 this takes about 20 seconds.'; }
    try {
      var r = await sbFetch('/functions/v1/onboarding-draft', { method: 'POST', body: JSON.stringify({ action: 'site', url: url }) });
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok || !j.ok) throw new Error(j.error || 'failed');
      var f = j.facts || {}, a = A(), got = 0;
      function put(k, val) { if (val && !String(a[k] || '').trim()) { a[k] = val; got++; } }
      put('brand_name', f.brand_name); put('call_phone', f.phone); put('address', f.address); put('offer', f.offer); put('what_you_do', f.what_you_do);
      if (Array.isArray(f.usps) && f.usps.length && !(a.usps || []).some(Boolean)) { a.usps = f.usps.slice(0, 5).concat(['', '', '', '', '']).slice(0, 5); got++; }
      if (Array.isArray(f.services) && f.services.length && !(a.services || []).some(function (x) { return x && x.name; })) { a.services = f.services.slice(0, 12); got++; }
      if (Array.isArray(f.faqs) && f.faqs.length && !(a.faqs || []).some(function (x) { return x && x.q; })) { a.faqs = f.faqs.slice(0, 12); got++; }
      if (f.hours && typeof f.hours === 'object' && !a.open_days) {
        var open = DAYS.filter(function (d) { return f.hours[d] && !f.hours[d].closed && f.hours[d].open; });
        if (open.length) { a.open_days = open; a.open_time = to12(f.hours[open[0]].open) || '9:00 AM'; a.close_time = to12(f.hours[open[0]].close) || '6:00 PM'; syncHours(); got++; }
      }
      await save(O.step); render();
      var m2 = document.getElementById('onbSiteMsg');
      if (m2) m2.textContent = got ? 'Done. We filled in ' + got + ' item' + (got > 1 ? 's' : '') + ' from your website. Please check them as you go.' : "We read your website but didn't find details to add.";
    } catch (e) {
      btn.disabled = false;
      if (msg) { msg.style.color = 'var(--red,#cc0000)'; msg.textContent = "We couldn't read that website. Please check the address, or fill in the details yourself."; }
    }
  }

  // \u2500\u2500 address suggestions (Google, through our server; quietly off if not set up) \u2500\u2500
  var _addrT = null, _addrOff = false;
  function addrSuggest(input) {
    clearTimeout(_addrT);
    var k = input.dataset.k, box = document.getElementById('onbSugg-' + k), q = input.value.trim();
    if (!box) return;
    if (_addrOff || q.length < 3) { box.style.display = 'none'; return; }
    _addrT = setTimeout(async function () {
      try {
        var r = await sbFetch('/functions/v1/onboarding-draft', { method: 'POST', body: JSON.stringify({ action: 'addr', q: q }) });
        var j = await r.json().catch(function () { return {}; });
        if (!j.ok) { if (j.error === 'not_configured') _addrOff = true; box.style.display = 'none'; return; }
        var list = j.suggestions || [];
        if (!list.length) { box.style.display = 'none'; return; }
        box.innerHTML = list.slice(0, 5).map(function (s) { return '<button type="button" data-addrpick="' + esc(k) + '" data-v="' + esc(s) + '">' + esc(s) + '</button>'; }).join('');
        box.style.display = 'flex';
      } catch (e) { box.style.display = 'none'; }
    }, 280);
  }

  // \u2500\u2500 uploads \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  async function upload(input) {
    var slot = input.getAttribute('data-slot'), list = Array.prototype.slice.call(input.files || []);
    if (!list.length) return;
    var multi = input.hasAttribute('multiple');
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      if (f.size > 200 * 1024 * 1024) { if (window.showToast) showToast(f.name + ' is too large (max 200 MB)'); continue; }
      var safe = f.name.replace(/[^A-Za-z0-9._-]+/g, '-').slice(-80);
      var path = O.client_id + '/' + slot + '/' + Date.now() + '-' + safe;
      if (window.showToast) showToast('Uploading ' + f.name + '\u2026');
      try {
        var r = await fetch(SB_URL + '/storage/v1/object/onboarding/' + path, { method: 'POST', headers: { apikey: SB_ANON, Authorization: 'Bearer ' + (authToken || SB_ANON), 'Content-Type': f.type || 'application/octet-stream', 'x-upsert': 'true' }, body: f });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        if (!multi) O.files = (O.files || []).filter(function (x) { return x.slot !== slot; });
        O.files = (O.files || []).concat([{ slot: slot, path: path, name: f.name, type: f.type, size: f.size, _url: /^image\//.test(f.type) ? URL.createObjectURL(f) : '' }]);
      } catch (e) { if (window.showToast) showToast("Couldn't upload " + f.name + '. Please try again.'); }
    }
    await save(O.step); render();
  }

  // \u2500\u2500 status screens \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  function track(curIdx) {
    var tl = O.kind === 'ai' ? ['Payment received', 'Setup wizard', 'AI setup', 'Live'] : ['Payment received', 'Design details', 'Design', 'Finish setup', 'Account setup', 'Live'];
    return '<div class="onb-track">' + tl.map(function (l, i) {
      var c = i < curIdx ? 'done' : (i === curIdx ? 'cur' : '');
      return '<div class="onb-tk ' + c + '"><div class="onb-tk-c"><span class="onb-dot">' + (i < curIdx ? ICON.check : (i + 1)) + '</span>' + (i < tl.length - 1 ? '<span class="onb-ln"></span>' : '') + '</div><span class="onb-tk-l">' + esc(l) + '</span></div>';
    }).join('') + '</div>';
  }
  function renderStatus() {
    var s = O.status, card = '', cur = 2;
    if (s === 'submitted' || s === 'drafting' || s === 'draft_ready') {
      card = '<div class="onb-st"><div class="onb-icon">' + ICON.pen + '</div><h2>Our team is designing your page</h2><p class="onb-p">We have everything we need for your design. You\'ll get a text and an email when it\'s ready to review, usually within 2 business days.</p></div>';
    } else if (s === 'changes_requested') {
      card = '<div class="onb-st"><div class="onb-icon">' + ICON.pen + '</div><h2>We\'re making your changes</h2><p class="onb-p">Thanks for your notes. We\'ll text and email you when the updated design is ready.</p></div>';
    } else if (s === 'client_review') {
      card = '<div class="onb-st"><h2>Your design is ready</h2><p class="onb-p">Have a look. If you\'re happy, approve it and we\'ll finish setting you up.</p>'
        + (O.design_url ? '<a class="onb-btn2" href="' + esc(O.design_url) + '" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none">Open my design ' + ICON.ext + '</a>' : '')
        + (O.draft_html ? '<iframe class="onb-frame" title="Your landing page design" sandbox="allow-scripts" srcdoc="' + esc(O.draft_html) + '"></iframe>' : '')
        + '<button type="button" class="onb-btn" data-act="approve">Approve design</button><button type="button" class="onb-btn2" data-act="changes">Request changes</button></div>';
    } else if (s === 'setup') {
      cur = O.kind === 'ai' ? 2 : 4;
      card = '<div class="onb-st"><div class="onb-icon">' + ICON.gear + '</div><h2>' + (O.kind === 'ai' ? 'Thanks! We\'re setting up your AI' : 'All set. Account setup in process') + '</h2><p class="onb-p">We\'re setting up your phone number, your AI and your campaign. We\'ll let you know the moment you go live.</p></div>';
    }
    shell('<div class="onb-body"><div class="onb-col">' + track(cur) + card + '</div></div>', false);
  }
  function changesSheet() {
    var ov = document.createElement('div');
    ov.className = 'onb-sheet-ov';
    ov.innerHTML = '<div class="onb-sheet" role="dialog" aria-label="Request changes"><div class="onb-grab"></div><label class="onb-lb" for="onbChg" style="font-size:16px">What would you like changed?</label><textarea class="onb-ta" id="onbChg" placeholder="Use our blue logo and add our Saturday hours."></textarea><div class="onb-err" id="onbChgErr" style="display:none">Please tell us what to change.</div><button type="button" class="onb-btn" data-act="sendchg">Send to the design team</button><button type="button" class="onb-btn2" data-act="closechg">Cancel</button></div>';
    ov.addEventListener('click', async function (e) {
      if (e.target === ov || (e.target.closest && e.target.closest('[data-act="closechg"]'))) { ov.remove(); return; }
      if (e.target.closest && e.target.closest('[data-act="sendchg"]')) {
        var t = document.getElementById('onbChg').value.trim();
        if (!t) { document.getElementById('onbChgErr').style.display = 'block'; return; }
        try { var o = await rpc('onboarding_decide', { p_approve: false, p_note: t }); Object.assign(O, o); ov.remove(); render(); } catch (er) { if (window.showToast) showToast("Couldn't send. Please try again."); }
      }
    });
    document.body.appendChild(ov);
    setTimeout(function () { var x = document.getElementById('onbChg'); if (x) x.focus(); }, 50);
  }

  // \u2500\u2500 events \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  function bind() {
    root.addEventListener('input', function (e) {
      var t = e.target;
      if (t.dataset.k) { A()[t.dataset.k] = t.value; if (errs[t.dataset.k]) { delete errs[t.dataset.k]; t.classList.remove('bad'); } if (t.dataset.addr) addrSuggest(t); }
      else if (t.dataset.usp != null) { var u = v('usps', ['', '', '', '', '']).slice(); u[+t.dataset.usp] = t.value; A().usps = u; }
      else if (t.dataset.list) { var p = t.dataset.list.split(':'), arr = v(p[0], []).slice(); arr[+p[1]] = Object.assign({}, arr[+p[1]] || {}); arr[+p[1]][p[2]] = t.value; A()[p[0]] = arr; }
      else if (t.dataset.color != null) { var cs = v('colors', ['#4000f3', '#111b21']).slice(); cs[+t.dataset.color] = t.value; A().colors = cs; t.parentNode.style.background = t.value; }
    });
    root.addEventListener('change', function (e) { if (e.target.type === 'file' && e.target.dataset.slot) upload(e.target); });
    root.addEventListener('click', async function (e) {
      var el = e.target.closest ? e.target.closest('button,[data-go]') : null; if (!el) return;
      var act = el.getAttribute('data-act');
      if (act === 'out') { if (window.doLogout) doLogout(); else location.reload(); return; }
      if (el.dataset.addrpick) { A()[el.dataset.addrpick] = el.dataset.v; var bx = document.getElementById('onbSugg-' + el.dataset.addrpick); if (bx) bx.style.display = 'none'; var inp = document.getElementById('onb-' + el.dataset.addrpick); if (inp) inp.value = el.dataset.v; save(O.step); return; }
      if (el.hasAttribute('data-go')) { O.step = +el.getAttribute('data-go'); errs = {}; render(); save(O.step); return; }
      if (act === 'back') { O.step = Math.max(1, O.step - 1); errs = {}; render(); save(O.step); return; }
      if (act === 'site') { fillFromSite(el); return; }
      if (el.dataset.time) { timeSheet(el.dataset.time); return; }
      if (el.dataset.day) { var ds = v('open_days', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']).slice(), di = ds.indexOf(el.dataset.day); if (di > -1) ds.splice(di, 1); else ds.push(el.dataset.day); A().open_days = DAYS.filter(function (d) { return ds.indexOf(d) > -1; }); syncHours(); render(); return; }
      if (act === 'next') {
        if (busy) return;
        var st = steps(), key = st[O.step - 1][0];
        if (/^review/.test(key)) {
          var bad = 0;
          for (var i = 0; i < st.length - 1; i++) { if (!validate(st[i][0])) { O.step = i + 1; bad = 1; break; } }
          if (bad) { render(); return; }
          if (st.some(function (x) { return x[0] === 'hours'; }) && !A().hours) syncHours();
          busy = true; el.disabled = true; el.textContent = 'Submitting\u2026';
          try { await save(O.step); var o = await rpc('onboarding_submit', {}); Object.assign(O, o); errs = {}; render(); }
          catch (er) { errs._submit = "Couldn't submit. Please try again."; render(); }
          busy = false; return;
        }
        if (!validate(key)) { render(); return; }
        if (key === 'hours') syncHours();
        O.step++; render(); save(O.step); return;
      }
      if (el.dataset.chip) {
        var k = el.dataset.chip, val = el.dataset.val;
        if (el.dataset.multi === '1') { var c = v(k, []).slice(), ix = c.indexOf(val); if (ix > -1) c.splice(ix, 1); else c.push(val); A()[k] = c; } else A()[k] = val;
        render(); return;
      }
      if (el.dataset.addrow) { var a2 = v(el.dataset.addrow, []).slice(); a2.push({}); A()[el.dataset.addrow] = a2; render(); return; }
      if (el.dataset.rmrow) { var q = el.dataset.rmrow.split(':'), b2 = v(q[0], []).slice(); b2.splice(+q[1], 1); A()[q[0]] = b2; render(); return; }
      if (el.dataset.rmfile) { O.files = (O.files || []).filter(function (f) { return f.path !== el.dataset.rmfile; }); render(); save(O.step); return; }
      if (act === 'addcolor') { var cs = v('colors', ['#4000f3', '#111b21']).slice(); cs.push('#e65afc'); A().colors = cs; render(); return; }
      if (act === 'approve') { el.disabled = true; try { var o2 = await rpc('onboarding_decide', { p_approve: true, p_note: null }); Object.assign(O, o2); render(); } catch (er) { el.disabled = false; if (window.showToast) showToast("Couldn't approve. Please try again."); } return; }
      if (act === 'changes') { changesSheet(); return; }
    });
  }

  window.ONB = {
    start: function (o) {
      O = o; O.answers = O.answers || {}; O.files = Array.isArray(O.files) ? O.files : [];
      var a = O.answers;
      if (!a.brand_name && (a.biz_name || O.business_name)) a.brand_name = a.biz_name || O.business_name;
      if (!a.gender) a.gender = 'All';
      if (!a.meeting_len) a.meeting_len = '30 min';
      root = document.getElementById('onbRoot');
      if (!root) { root = document.createElement('div'); root.id = 'onbRoot'; document.body.appendChild(root); bind(); }
      render();
    }
  };
})();
