/* plans-link.js (2026-11-09, Ajax: SMS + email templates that send "how it works" with each lead's own link).
   Adds a merge field for templates:  SMS {plans_link}   ·   Email {{plans_link}}
   -> https://adviuz.com/start?lead=<this lead's id>
   On that link the lead watches the how-it-works video, skips the details form, sees the plans with the checkout
   already filled in, and Amber greets them by name. Loaded by operator-console; app.html / desktop.html unchanged. */
(function () {
  'use strict';
  if (window.__advPlansLink) return; window.__advPlansLink = 1;
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function link(l) {
    l = l || {};
    var id = l.dbId != null ? String(l.dbId) : (UUID.test(String(l.id || '')) ? String(l.id) : '');
    return id ? 'https://adviuz.com/start?lead=' + id : 'https://adviuz.com/start';
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
})();
