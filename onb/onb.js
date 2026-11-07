/* onb-1 (2026-11-06, Ajax "approve onboarding design"): client setup wizard + status screens.
   Loaded on demand by app.html / desktop.html (onbGate) when a signed-in client has an unfinished
   client_onboarding row. All reads/writes go through the onboarding_* RPCs; uploads go to the
   private "onboarding" bucket under <client_id>/. Draft designs are only returned after Ajax approves. */
(function () {
  'use strict';
  var O = null, root = null, busy = false, errs = {};
  var ICON = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>',
    up: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>',
    doc: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
    pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>'
  };
  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var AGES = ['18\u201324', '25\u201334', '35\u201344', '45\u201354', '55\u201364', '65+'];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function A() { return O.answers || (O.answers = {}); }
  function v(k, d) { var x = A()[k]; return x == null ? (d == null ? '' : d) : x; }
  function isFly() { return O.kind === 'flyers' || O.kind === 'complete'; }

  // \u2500\u2500 steps \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  function steps() {
    var s = [];
    if (O.kind === 'ai') {
      s = [['biz_ai', 'Your business'], ['hours', 'Hours'], ['services', 'Services'], ['faqs', 'Questions'], ['bookings', 'Bookings'], ['review', 'Submit']];
    } else {
      s = [['biz', 'Your business'], ['contact', 'Lead contact'], ['message', 'Message'], ['audience', 'Audience'], ['brand', 'Brand'], ['media', 'Photos & videos']];
      if (O.kind === 'complete') s.push(['services', 'Services'], ['faqs', 'Questions'], ['bookings', 'Bookings']);
      s.push(['review', 'Submit']);
    }
    return s;
  }

  async function rpc(name, body) {
    var r = await sbFetch('/rest/v1/rpc/' + name, { method: 'POST', body: JSON.stringify(body || {}) });
    var j = await r.json().catch(function () { return null; });
    if (!r.ok) throw new Error((j && (j.message || j.error)) || ('HTTP ' + r.status));
    return j;
  }
  async function save(step) {
    try { var clean = (O.files || []).map(function (f) { return { slot: f.slot, path: f.path, name: f.name, type: f.type, size: f.size }; }); var o = await rpc('onboarding_save', { p_step: step, p_answers: O.answers, p_files: clean }); if (o) { O.step = o.step; } } catch (e) { console.warn('[onb] save', e); }
  }

  // \u2500\u2500 shell \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  function shell(inner, withRail) {
    var rail = '';
    if (withRail) {
      var st = steps(), cur = Math.min(O.step, st.length);
      rail = '<nav class="onb-rail" aria-label="Setup steps"><div class="onb-rail-h">Account setup</div>' + st.map(function (x, i) {
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
    if (O.status !== 'wizard') return renderStatus();
    var st = steps(); if (O.step > st.length) O.step = st.length; if (O.step < 1) O.step = 1;
    var key = st[O.step - 1][0], n = st.length;
    var pct = Math.round((O.step - 0.5) / n * 100);
    var body = '<div class="onb-prog"><div class="onb-prog-t"><span>Step ' + O.step + ' of ' + n + '</span><span>' + (O.kind === 'ai' ? 'AI Conversion Engine' : O.kind === 'complete' ? 'Digital Flyers + AI Conversion Engine' : 'Digital Flyers') + '</span></div><div class="onb-bar"><i style="width:' + pct + '%"></i></div></div>'
      + '<div class="onb-body"><div class="onb-col">' + (PANES[key] || function () { return ''; })() + '</div></div>'
      + '<div class="onb-nav">' + (O.step > 1 ? '<button type="button" class="onb-btn2" data-act="back">Back</button>' : '') + '<button type="button" class="onb-btn" data-act="next">' + (key === 'review' ? 'Submit' : 'Continue') + '</button></div>';
    shell(body, true);
    var b = root.querySelector('.onb-body'); if (b) b.scrollTop = 0;
  }
  function fld(k, label, ph, hint, type) {
    var e = errs[k];
    return '<div><label class="onb-lb" for="onb-' + k + '">' + esc(label) + '</label><input class="onb-in' + (e ? ' bad' : '') + '" id="onb-' + k + '" data-k="' + k + '" type="' + (type || 'text') + '" placeholder="' + esc(ph) + '" value="' + esc(v(k)) + '">' + (hint ? '<p class="onb-hp">' + esc(hint) + '</p>' : '') + (e ? '<div class="onb-err">' + esc(e) + '</div>' : '') + '</div>';
  }
  function area(k, label, ph, hint) {
    var e = errs[k];
    return '<div><label class="onb-lb" for="onb-' + k + '">' + esc(label) + '</label><textarea class="onb-ta' + (e ? ' bad' : '') + '" id="onb-' + k + '" data-k="' + k + '" placeholder="' + esc(ph) + '">' + esc(v(k)) + '</textarea>' + (hint ? '<p class="onb-hp">' + esc(hint) + '</p>' : '') + (e ? '<div class="onb-err">' + esc(e) + '</div>' : '') + '</div>';
  }
  function head(t, p) { return '<div><h1 class="onb-h">' + esc(t) + '</h1><p class="onb-p">' + esc(p) + '</p></div>'; }
  function hoursBlock(intro) {
    var h = v('hours', {});
    return head('Opening hours', intro) + '<div style="display:flex;flex-direction:column;gap:8px">' + DAYS.map(function (d) {
      var x = h[d] || {}, closed = !!x.closed;
      return '<div class="onb-day"><b>' + d + '</b>' + (closed ? '<span style="flex:1;font-size:14px;color:var(--sub,#667781)">Closed</span>' : '<input class="onb-in" data-hour="' + d + '" placeholder="9 AM \u2013 6 PM" value="' + esc(x.text || '') + '" aria-label="' + d + ' hours">') + '<button type="button" class="onb-chip' + (closed ? ' on' : '') + '" data-closed="' + d + '">Closed</button></div>';
    }).join('') + '</div>';
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

  var PANES = {
    biz: function () {
      return head('Your business', 'The basics, so your page and your AI get the details right.')
        + fld('biz_name', 'Business name', 'Bright Smile Dental') + fld('address', 'Business address', '111 2nd Ave S, Saskatoon, SK')
        + fld('website', 'Website (if you have one)', 'brightsmile.ca') + hoursBlock('When are you open?').replace('<h1 class="onb-h">Opening hours</h1>', '<span class="onb-lb">Opening hours</span>').replace(/<p class="onb-p">When are you open\?<\/p>/, '');
    },
    contact: function () {
      return head('Where should leads reach you?', "This is the number on your page's Call button, and the address for Get directions.")
        + fld('call_phone', 'Phone number for calls', '(306) 555-0123', 'Leads tap Call and reach this number.', 'tel')
        + fld('directions_address', 'Address for "Get directions"', 'Same as your business address', 'Leave empty to use your business address.')
        + fld('alert_email', 'Email for new-lead alerts', 'you@yourbusiness.ca', '', 'email');
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
    audience: function () {
      return head('Who should see your flyer?', 'We show your flyer only to the people you pick.')
        + fld('cities', 'Cities', 'Saskatoon, Martensville, Warman')
        + fld('postal_codes', 'Postal codes (optional)', 'S7K, S7H, S7N', 'The first 3 characters are enough.')
        + '<div><span class="onb-lb">Age groups</span>' + chips('ages', AGES, true) + '</div>'
        + '<div><span class="onb-lb">Gender</span>' + chips('gender', ['All', 'Women', 'Men'], false) + '</div>';
    },
    brand: function () {
      var cs = v('colors', ['#4000f3', '#111b21']);
      return head('Your brand', 'So your page looks like you.')
        + '<div><span class="onb-lb">Logo</span>' + uploader('logo', 'Upload your logo', 'PNG, SVG or JPG', 'image/*', false) + '</div>'
        + '<div><span class="onb-lb">Brand colours</span><div class="onb-sw">' + cs.map(function (c, i) {
          return '<label style="background:' + esc(c) + '" aria-label="Colour ' + (i + 1) + '"><input type="color" data-color="' + i + '" value="' + esc(c) + '"></label>';
        }).join('') + (cs.length < 4 ? '<button type="button" class="onb-chip" data-act="addcolor">+ Add colour</button>' : '') + '</div><p class="onb-hp">Not sure? Skip it. We\'ll take the colours from your logo.</p></div>'
        + '<div><span class="onb-lb">Brand guide (optional)</span>' + uploader('brand_guide', 'Upload a brand guide', 'PDF or image', 'application/pdf,image/*', false) + '</div>';
    },
    media: function () {
      return head('Photos and videos', 'Real photos of your work, team or place make your page stronger. Optional.')
        + uploader('media', 'Add photos or videos', 'Videos up to 2 minutes', 'image/*,video/*', true);
    },
    biz_ai: function () {
      return head('Your business', 'Your AI learns from this, so it answers like your own team.')
        + fld('biz_name', 'Business name', 'Hair Tattoo Clinic') + fld('website', 'Website', 'hairtattoo.ca', 'We read your website to train your AI.')
        + fld('address', 'Address', '123 Main St, Toronto, ON') + area('what_you_do', 'What do you do, in one or two lines?', 'Scalp micropigmentation for men and women with hair loss.');
    },
    hours: function () { return hoursBlock('Your AI books meetings only in these hours.'); },
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
    review: function () {
      var st = steps(), rows = [];
      function r(lbl, val, step) { rows.push('<button type="button" data-go="' + step + '"><span>' + esc(lbl) + '</span><span>' + esc(val || 'Not added') + '</span></button>'); }
      function idx(k) { for (var i = 0; i < st.length; i++) if (st[i][0] === k) return i + 1; return 1; }
      r('Business', v('biz_name'), idx(O.kind === 'ai' ? 'biz_ai' : 'biz'));
      if (isFly()) {
        r('Call number', v('call_phone'), idx('contact'));
        r('Punchline', v('punchline'), idx('message'));
        r('Reasons', (v('usps', []).filter(Boolean).length) + ' of 5 added', idx('message'));
        r('Audience', [v('cities'), (v('ages', []).length ? v('ages', []).length + ' age groups' : ''), v('gender')].filter(Boolean).join(' \u00b7 '), idx('audience'));
        r('Logo', (O.files || []).some(function (f) { return f.slot === 'logo'; }) ? 'Added' : '', idx('brand'));
        r('Photos and videos', String((O.files || []).filter(function (f) { return f.slot === 'media'; }).length), idx('media'));
      }
      if (O.kind !== 'flyers') {
        if (O.kind === 'ai') r('Website', v('website'), idx('biz_ai'));
        r('Services', String(v('services', []).filter(function (x) { return x && x.name; }).length), idx('services'));
        r('Questions', String(v('faqs', []).filter(function (x) { return x && x.q; }).length), idx('faqs'));
        r('Transfers to', v('transfer_phone'), idx('bookings'));
      }
      return head('Check and submit', 'Tap any line to change it.') + '<div class="onb-sum">' + rows.join('') + '</div>' + (errs._submit ? '<div class="onb-err">' + esc(errs._submit) + '</div>' : '');
    }
  };

  function validate(key) {
    errs = {};
    var digits = function (s) { return String(s || '').replace(/\D/g, '').length; };
    if ((key === 'biz' || key === 'biz_ai') && !String(v('biz_name')).trim()) errs.biz_name = 'Please add your business name.';
    if (key === 'biz_ai' && !String(v('website')).trim() && !String(v('what_you_do')).trim()) errs.website = 'Add your website, or tell us what you do below.';
    if (key === 'contact' && digits(v('call_phone')) < 10) errs.call_phone = 'Please add a 10-digit phone number.';
    if (key === 'contact' && v('alert_email') && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v('alert_email'))) errs.alert_email = 'Please check this email address.';
    if (key === 'message' && !String(v('punchline')).trim()) errs.punchline = 'Please add a punchline.';
    if (key === 'message' && v('usps', []).filter(function (x) { return String(x || '').trim(); }).length < 3) errs.usps = 'Please add at least 3 reasons.';
    if (key === 'audience' && !String(v('cities')).trim() && !String(v('postal_codes')).trim()) errs.cities = 'Add at least one city or postal code.';
    if (key === 'bookings' && v('transfer_phone') && digits(v('transfer_phone')) < 10) errs.transfer_phone = 'Please add a 10-digit phone number.';
    return Object.keys(errs).length === 0;
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
    var tl = ['Payment received', 'Setup wizard', O.kind === 'ai' ? 'AI setup' : 'Design', 'Account setup', 'Live'];
    if (O.kind === 'ai') tl = ['Payment received', 'Setup wizard', 'AI setup', 'Live'];
    return '<div class="onb-track">' + tl.map(function (l, i) {
      var c = i < curIdx ? 'done' : (i === curIdx ? 'cur' : '');
      return '<div class="onb-tk ' + c + '"><div class="onb-tk-c"><span class="onb-dot">' + (i < curIdx ? ICON.check : (i + 1)) + '</span>' + (i < tl.length - 1 ? '<span class="onb-ln"></span>' : '') + '</div><span class="onb-tk-l">' + esc(l) + '</span></div>';
    }).join('') + '</div>';
  }
  function renderStatus() {
    var s = O.status, card = '', cur = 2;
    if (s === 'submitted' || s === 'drafting' || s === 'draft_ready') {
      card = '<div class="onb-st"><div class="onb-icon">' + ICON.pen + '</div><h2>Our team is designing your page</h2><p class="onb-p">We have everything we need. You\'ll get a text and an email when your design is ready to review, usually within 2 business days.</p></div>';
    } else if (s === 'changes_requested') {
      card = '<div class="onb-st"><div class="onb-icon">' + ICON.pen + '</div><h2>We\'re making your changes</h2><p class="onb-p">Thanks for your notes. We\'ll text and email you when the updated design is ready.</p></div>';
    } else if (s === 'client_review') {
      cur = 2;
      card = '<div class="onb-st"><h2>Your design is ready</h2><p class="onb-p">Have a look. If you\'re happy, approve it and we\'ll get you live.</p>'
        + (O.draft_html ? '<iframe class="onb-frame" title="Your landing page design" sandbox="allow-scripts" srcdoc="' + esc(O.draft_html) + '"></iframe>' : '')
        + '<button type="button" class="onb-btn" data-act="approve">Approve design</button><button type="button" class="onb-btn2" data-act="changes">Request changes</button></div>';
    } else if (s === 'setup') {
      cur = O.kind === 'ai' ? 2 : 3;
      card = '<div class="onb-st"><div class="onb-icon">' + ICON.gear + '</div><h2>' + (O.kind === 'ai' ? 'Thanks! We\'re setting up your AI' : 'Design approved. Account setup in process') + '</h2><p class="onb-p">We\'re setting up your phone number, your AI and your campaign. We\'ll let you know the moment you go live.</p></div>';
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
      if (t.dataset.k) { A()[t.dataset.k] = t.value; if (errs[t.dataset.k]) { delete errs[t.dataset.k]; t.classList.remove('bad'); } }
      else if (t.dataset.usp != null) { var u = v('usps', ['', '', '', '', '']).slice(); u[+t.dataset.usp] = t.value; A().usps = u; }
      else if (t.dataset.hour) { var h = Object.assign({}, v('hours', {})); h[t.dataset.hour] = { closed: false, text: t.value }; A().hours = h; }
      else if (t.dataset.list) { var p = t.dataset.list.split(':'), arr = v(p[0], []).slice(); arr[+p[1]] = Object.assign({}, arr[+p[1]] || {}); arr[+p[1]][p[2]] = t.value; A()[p[0]] = arr; }
      else if (t.dataset.color != null) { var cs = v('colors', ['#4000f3', '#111b21']).slice(); cs[+t.dataset.color] = t.value; A().colors = cs; t.parentNode.style.background = t.value; }
    });
    root.addEventListener('change', function (e) { if (e.target.type === 'file' && e.target.dataset.slot) upload(e.target); });
    root.addEventListener('click', async function (e) {
      var el = e.target.closest ? e.target.closest('button,[data-go]') : null; if (!el) return;
      var act = el.getAttribute('data-act');
      if (act === 'out') { if (window.doLogout) doLogout(); else location.reload(); return; }
      if (el.hasAttribute('data-go')) { O.step = +el.getAttribute('data-go'); errs = {}; render(); save(O.step); return; }
      if (act === 'back') { O.step = Math.max(1, O.step - 1); errs = {}; render(); save(O.step); return; }
      if (act === 'next') {
        if (busy) return;
        var st = steps(), key = st[O.step - 1][0];
        if (key === 'review') {
          var bad = 0;
          for (var i = 0; i < st.length - 1; i++) { if (!validate(st[i][0])) { O.step = i + 1; bad = 1; break; } }
          if (bad) { render(); return; }
          busy = true; el.disabled = true; el.textContent = 'Submitting\u2026';
          try { await save(O.step); var o = await rpc('onboarding_submit', {}); Object.assign(O, o); errs = {}; render(); }
          catch (er) { errs._submit = "Couldn't submit. Please try again."; render(); }
          busy = false; return;
        }
        if (!validate(key)) { render(); return; }
        O.step++; render(); save(O.step); return;
      }
      if (el.dataset.closed) { var h = Object.assign({}, v('hours', {})), d = el.dataset.closed, was = h[d] && h[d].closed; h[d] = { closed: !was, text: (h[d] && h[d].text) || '' }; A().hours = h; render(); return; }
      if (el.dataset.chip) {
        var k = el.dataset.chip, val = el.dataset.val;
        if (el.dataset.multi === '1') { var c = v(k, []).slice(), ix = c.indexOf(val); if (ix > -1) c.splice(ix, 1); else c.push(val); A()[k] = c; } else A()[k] = val;
        render(); return;
      }
      if (el.dataset.addrow) { var a = v(el.dataset.addrow, []).slice(); a.push({}); A()[el.dataset.addrow] = a; render(); return; }
      if (el.dataset.rmrow) { var q = el.dataset.rmrow.split(':'), b = v(q[0], []).slice(); b.splice(+q[1], 1); A()[q[0]] = b; render(); return; }
      if (el.dataset.rmfile) { O.files = (O.files || []).filter(function (f) { return f.path !== el.dataset.rmfile; }); render(); save(O.step); return; }
      if (act === 'addcolor') { var cs = v('colors', ['#4000f3', '#111b21']).slice(); cs.push('#e65afc'); A().colors = cs; render(); return; }
      if (act === 'approve') { el.disabled = true; try { var o2 = await rpc('onboarding_decide', { p_approve: true, p_note: null }); Object.assign(O, o2); render(); } catch (er) { el.disabled = false; if (window.showToast) showToast("Couldn't approve. Please try again."); } return; }
      if (act === 'changes') { changesSheet(); return; }
    });
  }

  window.ONB = {
    start: function (o) {
      O = o; O.answers = O.answers || {}; O.files = Array.isArray(O.files) ? O.files : [];
      if (!O.answers.biz_name && O.business_name) O.answers.biz_name = O.business_name;
      if (!O.answers.gender) O.answers.gender = 'All';
      if (!O.answers.meeting_len) O.answers.meeting_len = '30 min';
      root = document.getElementById('onbRoot');
      if (!root) { root = document.createElement('div'); root.id = 'onbRoot'; document.body.appendChild(root); bind(); }
      render();
    }
  };
})();
