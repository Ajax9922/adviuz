/* plans-link.js (2026-11-09, Ajax: SMS + email templates that send "how it works" with each lead's own link).
   Adds a merge field for templates:  SMS {plans_link}   ·   Email {{plans_link}}
   -> https://adviuz.com/w/<short code of this lead>  (was /start?lead=<id> until 2026-11-13)
   On that link the lead watches the how-it-works video, skips the details form, sees the plans with the checkout
   already filled in, and Amber greets them by name. Loaded by operator-console; app.html / desktop.html unchanged.
   v2 (2026-11-10, Ajax: "a button ... send plans and pricing ... the moment I click on it, it should automatically send an
   email and a text message to the client"): a 4th option "Send plans link" in the lead's Quote sheet (under Custom
   proposal; Adviuz Sales leads, staff only). One tap shows what will go out, then sends the email + text with the lead's own pre-filled plans link.
   v5 (2026-11-10, Ajax: "separate option ... is not required ... it's directly proportional to the sales stage"): no choice —
   AI Call on a Meeting Done / Proposal Sent / Negotiating lead IS the after-demo follow-up; a short note says so.
   v4 (2026-11-10, Ajax: "keep it under the AI call button in communication section ... only if the stage is meeting done,
   proposal sent, negotiating"): the follow-up call moved out of the Quote sheet into the AI call sheet, as a choice
   ("After-demo follow-up" / "Regular AI call"), only for those three stages.
   v3 (2026-11-10, Ajax: "train Amber to handle post meeting follow up calls to take it to conversion"): a 5th option
   "Amber follow-up call" (Adviuz Sales leads after the demo, staff only). Amber calls now with the demo notes and the quote,
   answers questions, finds what is holding them back, and can text the secure payment link. You can listen live and jump in. */
(function () {
  'use strict';
  if (window.__advPlansLink) return; window.__advPlansLink = 1;
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function link(l) {
    l = l || {};
    var id = l.dbId != null ? String(l.dbId) : (UUID.test(String(l.id || '')) ? String(l.id) : '');
    /* 2026-11-13 (Ajax: "shorten the link for sms"): adviuz.com/w/<first 12 characters of the lead id> — the website
       turns it back into the lead, so tracking, journey and pre-filled checkout all still work */
    return id ? 'https://adviuz.com/w/' + id.replace(/-/g, '').slice(0, 12).toLowerCase() : 'https://adviuz.com/start';
  }
  window.advPlansLink = link;

  /* email templates: {{plans_link}} (handled before the hub's own merge, which leaves unknown fields blank) */
  if (typeof window._ceMerge === 'function') {
    var ceMerge = window._ceMerge;
    window._ceMerge = function (str, lead) {
      var l = lead || window._ceLead || {};
      return ceMerge.call(this, String(str || '').replace(/\{\{\s*plans_link\s*\}\}/gi, link(l)), lead);
    };
  }

  /* SMS templates: {plans_link} in the message box after a template is picked */
  function fixSms() {
    var ta = document.getElementById('smsCompose');
    if (ta && /\{plans_link\}/i.test(ta.value)) {
      ta.value = ta.value.replace(/\{plans_link\}/gi, link(window._smsLead));
      try { if (typeof smsGrow === 'function') smsGrow(ta); } catch (_) {}
    }
  }
  ['pickSmsTplIdx', 'useTplFromList'].forEach(function (fn) {
    var orig = window[fn];
    if (typeof orig !== 'function') return;
    window[fn] = function () { var r = orig.apply(this, arguments); fixSms(); return r; };
  });
  /* safety net: a typed or pasted {plans_link} is filled in before sending */
  document.addEventListener('input', function (e) { if (e.target && e.target.id === 'smsCompose' && /\{plans_link\}/i.test(e.target.value)) fixSms(); }, true);

  /* ── "Send plans" button (v2) ── */
  var HOUSE = '7d315d20-00af-4e7f-8d79-c89b3f2b5cf7';
  function first(n) { n = String(n || '').trim().split(/\s+/)[0] || ''; return /^(unknown|lead|test)$/i.test(n) ? '' : n; }
  function msgs(l) {
    var f = first(l.name), url = link(l);
    return {
      sms: 'Hi' + (f ? ' ' + f : '') + ', thanks for your time today. Here are the Adviuz plans we talked about. Your details are already filled in, so you can get started in about a minute:\n' + url + '\n\nQuestions? Reply here or tap "Have questions? Let\'s talk" on the page.\nReply STOP to opt out.',
      subj: 'Your Adviuz plans, as discussed today',
      email: 'Hi ' + (f || 'there') + ',\n\nThank you for your time today. As promised, here are the Adviuz plans we talked about.\n\nYour details are already filled in, so choosing your plan and getting started takes about a minute: one-time payment, no monthly fees and no contract.\n\n[button:See the plans and get started →|' + url + ']\n\nIf you have any questions, simply reply to this email, or tap "Have questions? Let\'s talk" on the page to speak with Amber right away.\n\nTeam Adviuz\n+1 647 250 1152 (24/7)',
      url: url
    };
  }
  function okLead(l) {
    if (!l || !window._isAdviuzStaff || window._viewingAsClient) return false;
    try { if (typeof isClientMode === 'function' && isClientMode()) return false; if (typeof isPartnerMode === 'function' && isPartnerMode()) return false; } catch (_) {}
    return !l.client_id || String(l.client_id) === HOUSE;
  }
  function curLead() { try { return typeof lsGetLead === 'function' ? lsGetLead() : null; } catch (_) { return null; } }
  function e(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var css = document.createElement('style');
  css.textContent = '#spOv{position:fixed;inset:0;z-index:9500;background:rgba(15,5,30,.5);display:flex;align-items:flex-end;justify-content:center}'
    + '@media(min-width:700px){#spOv{align-items:center}}'
    + '#spOv .sp{background:var(--white,#fff);color:var(--text,#190229);width:100%;max-width:520px;max-height:88vh;overflow:auto;border-radius:18px 18px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom,0px))}'
    + '@media(min-width:700px){#spOv .sp{border-radius:18px}}'
    + '#spOv h3{margin:0 0 4px;font-size:18px}#spOv .s{font-size:13px;color:var(--sub,#667781);margin:0 0 14px}'
    + '#spOv label{display:block;font-size:12px;font-weight:700;color:var(--sub,#667781);margin:12px 0 6px;text-transform:uppercase;letter-spacing:.04em}'
    + '#spOv .pv{background:var(--bg,#f0f2f5);border-radius:12px;padding:12px;font-size:13.5px;line-height:1.5;white-space:pre-wrap;word-break:break-word}'
    + '#spOv .bt{display:flex;gap:10px;margin-top:16px}#spOv button{flex:1;height:46px;border-radius:12px;font-weight:700;font-size:15px;cursor:pointer;border:1.5px solid var(--border,#e2e2e2);background:var(--white,#fff);color:var(--text,#190229)}'
    + '#spOv button.go{border:0;color:#fff;background:linear-gradient(90deg,#4000f3,#e65afc)}#spOv button:disabled{opacity:.6}';
  document.head.appendChild(css);
  window.advSendPlans = function (lid) {
    var l = lid != null && typeof leads !== 'undefined' ? leads.find(function (x) { return x.id === lid; }) : curLead(); if (!okLead(l)) return;
    var m = msgs(l), ph = String(l.ph || '').trim(), em = String(l.em || '').trim();
    var ov = document.createElement('div'); ov.id = 'spOv';
    ov.innerHTML = '<div class="sp" role="dialog" aria-label="Send plans and pricing"><h3>Send plans and pricing</h3><p class="s">' + e(l.name || 'This lead') + ' gets their own link with the plans and their details already filled in.</p>'
      + '<label>💬 Text' + (ph ? ' to ' + e(ph) : ' (no phone on file)') + '</label>' + (ph ? '<div class="pv">' + e(m.sms) + '</div>' : '')
      + '<label>✉️ Email' + (em ? ' to ' + e(em) : ' (no email on file)') + '</label>' + (em ? '<div class="pv"><b>' + e(m.subj) + '</b>\n\n' + e(m.email).replace(/\[button:([^|\]]+)\|[^\]]+\]/g, '[ $1 ]') + '</div>' : '')
      + '<div class="bt"><button type="button" data-x>Cancel</button><button type="button" class="go" data-go' + (!ph && !em ? ' disabled' : '') + '>Send now</button></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', async function (ev) {
      if (ev.target === ov || ev.target.closest('[data-x]')) { ov.remove(); return; }
      var go = ev.target.closest('[data-go]'); if (!go || go.disabled) return;
      go.disabled = true; go.textContent = 'Sending…';
      var ok = [], bad = [], jobs = [], cid = l.client_id || HOUSE;
      if (ph) jobs.push(sbFetch('/functions/v1/twilio-sms?action=send', { method: 'POST', body: JSON.stringify({ to: ph, message: m.sms, lead_id: l.dbId, purpose: 'manual' }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok || d.error || d.ok === false || d.success === false || d.blocked) throw 0; ok.push('text');
          return sbFetch('/rest/v1/lead_activity', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ lead_id: l.dbId, client_id: cid, activity_type: 'sms_sent', description: m.sms, direction: 'outbound', metadata: { handler: 'human', kind: 'plans_link' } }) }).catch(function () {}); }); })
        .catch(function () { bad.push('text'); }));
      if (em) jobs.push(sbFetch('/functions/v1/client-email', { method: 'POST', body: JSON.stringify({ client_id: cid, lead_id: l.dbId, campaign_id: l.campaign_id || null, to: em, subject: m.subj, message: m.email }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok || d.error || d.ok === false) throw 0; ok.push('email'); }); })
        .catch(function () { bad.push('email'); }));
      await Promise.all(jobs);
      if (ok.length) { try { logActivity({ lead_id: l.id, client_id: cid, type: 'note', label: '📨 Plans and pricing sent', body: 'Sent ' + ok.join(' + ') + ' with their plans link: ' + m.url, meta: { kind: 'plans_link' } }); } catch (_) {} }
      ov.remove();
      if (window.showToast) showToast(ok.length ? ('📨 Plans sent (' + ok.join(' + ') + ')' + (bad.length ? ' — ' + bad.join(' + ') + ' failed' : '')) : 'Could not send. Please try again.');
    });
  };

  /* ── After-demo follow-up call (v3, moved in v4) ──
     Lives in the AI call sheet (Communication → AI Call), not the Quote sheet. Shown only for Adviuz Sales leads at
     "6. Meeting Done", "7. Proposal Sent" or "8. Negotiating" (ai-call-lead v10 checks the same stages). */
  function afterDemo(l) { return /^\s*(6\.\s*meeting done|7\.\s*proposal sent|8\.\s*negotiating)\b/i.test(String(l && l.stage || '')); }
  async function runClosing(l) {
    var data = {}, ok = false;
    if (window.showToast) showToast('🤖 Starting Amber’s follow-up call…');
    try {
      var r = await sbFetch('/functions/v1/ai-call-lead', { method: 'POST', body: JSON.stringify({ lead_id: l.dbId, closing: true }) });
      data = await r.json().catch(function () { return {}; });
      ok = r.ok && data && data.ok && !data.blocked && !data.skipped && !data.deferred;
    } catch (_) {}
    var f = first(l.name) || 'the lead';
    if (ok) {
      if (window.showToast) showToast('🤖 Amber is calling ' + f + ' now (after-demo follow-up)');
      try { logActivity({ lead_id: l.id, client_id: l.client_id || HOUSE, type: 'note', label: '🤖 Amber follow-up call', body: 'Started Amber’s after-demo follow-up call', meta: { kind: 'closing_call' } }); } catch (_) {}
      if (data.call_id && typeof openLiveCall === 'function') { window._liveDetailAllow = 12; openLiveCall(data.call_id, f); }
    } else if (window.showToast) {
      showToast('🚫 Call did not start' + ((data && (data.skipped || data.error || data.reason)) ? ': ' + (data.skipped || data.error || data.reason) : ''));
    }
  }
  var ccPick = 'followup';
  if (typeof window.openAiCallSheet === 'function') {
    var oOpen = window.openAiCallSheet;
    window.openAiCallSheet = function (l) {
      var res = oOpen.apply(this, arguments);
      try {
        ccPick = 'regular';
        var gate = document.getElementById('aiCsGate'), go = document.getElementById('aiCsGo');
        if (!gate || !okLead(l) || !afterDemo(l) || (go && go.disabled)) return res;
        ccPick = 'followup';
        var box = document.createElement('div'); box.className = 'adv-cc-note';
        box.innerHTML = '<div style="margin-top:10px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:10px 12px;font-size:12.5px;color:#4c1d95;line-height:1.5">🎯 <b>After-demo follow-up</b> — this lead is past the demo, so Amber uses the demo notes and the quote, finds what is holding them back, and can text the payment link.</div>';
        gate.appendChild(box);
      } catch (_) {}
      return res;
    };
  }
  if (typeof window.aiCsConfirm === 'function') {
    var oConf = window.aiCsConfirm;
    window.aiCsConfirm = function () {
      var l = window._aiCsLead, go = document.getElementById('aiCsGo');
      if (ccPick === 'followup' && l && okLead(l) && afterDemo(l) && !(go && go.disabled)) {
        try { closeAiCallSheet(); } catch (_) {}
        ccPick = 'regular';
        return runClosing(l);
      }
      return oConf.apply(this, arguments);
    };
  }
  /* 4th option in the Quote sheet (openQuoteMenu → #sapMenu), under "Custom proposal" */
  var qLid = null;
  if (typeof window.openQuoteMenu === 'function') { var oq = window.openQuoteMenu; window.openQuoteMenu = function (lid) { qLid = lid; return oq.apply(this, arguments); }; }
  function addBtn() {
    var m = document.getElementById('sapMenu'); if (!m || m.querySelector('.adv-sp-opt')) return;
    var lid = qLid != null ? qLid : (typeof curLid !== 'undefined' ? curLid : null);
    var l = typeof leads !== 'undefined' ? leads.find(function (x) { return x.id === lid; }) : null; if (!okLead(l)) return;
    var opts = m.querySelectorAll('.sap-opt'); if (opts.length < 3) return;
    var last = opts[opts.length - 1], b = document.createElement('button');
    b.type = 'button'; b.className = 'sap-opt adv-sp-opt';
    b.innerHTML = '<span class="sap-ic"><svg fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg></span><span class="sap-tx"><b>Send plans link</b><small>Text + email with their own plans page, details filled in</small></span><span class="sap-ch">&rsaquo;</span>';
    b.addEventListener('click', function () { try { _sapClose('sapMenu'); } catch (_) {} window.advSendPlans(lid); });
    last.parentNode.insertBefore(b, last.nextSibling);
  }
  var tq = 0; new MutationObserver(function () { if (tq) return; tq = setTimeout(function () { tq = 0; addBtn(); }, 150); }).observe(document.body, { childList: true, subtree: true });
})();
