/* live-retell.js (2026-11-09) — Listen / Take over for WEBSITE VOICE calls (and any live Retell call
   that has no phone-conference room) on the hub's Live Call screen.
   Phone calls keep the existing conference Listen / Jump-in exactly as before; this only takes over
   the Listen button when the open call has a Retell id (call_…) and no conf room.
   Operator only (_isOperatorListen). Audio runs in the browser through the Retell SDK
   (/assets/retell-sdk-3.0.3.js, loaded on first use); every control request goes through the
   live-voice-monitor function, so the Retell key never reaches the browser.
   Listen = silent (nobody hears you). Take over = Amber stops for good and you talk to the visitor. */
(function () {
  'use strict';
  if (typeof window.toggleLiveListen !== 'function') return;
  var SDK = '/assets/retell-sdk-3.0.3.js?v=1';
  var orig = { toggle: window.toggleLiveListen, stop: window.stopLiveListen, upd: window._updateListenBtn };
  var sdkP = null, watch = null, rs = 'off', muted = false, armT = 0, armed = false, kaT = 0;

  function toast(m) { try { showToast(m); } catch (_) {} }
  function btn() { return document.getElementById('lfListenBtn'); }
  function retellMode() {
    try {
      var id = String(window._liveDetailId || '');
      return /^call_/.test(id) && !window._liveConf && !window._lfEnded &&
        typeof _isOperatorListen === 'function' && _isOperatorListen();
    } catch (_) { return false; }
  }
  function loadSDK() {
    if (window.AdvRetell) return Promise.resolve();
    if (!sdkP) sdkP = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = SDK; s.async = true;
      s.onload = function () { window.AdvRetell ? res() : rej(new Error('Audio library missing')); };
      s.onerror = function () { sdkP = null; rej(new Error('Could not load audio')); };
      document.head.appendChild(s);
    });
    return sdkP;
  }
  function paint() {
    var b = btn(), lv = document.getElementById('lfLeaveBtn');
    if (!b) return;
    b.disabled = rs === 'joining' || rs === 'taking';
    b.style.background = ''; b.style.color = '';
    if (rs === 'off') { b.textContent = '🎧 Listen'; b.style.display = retellMode() ? '' : 'none'; }
    else if (rs === 'joining') b.textContent = 'Joining…';
    else if (rs === 'listening') b.textContent = armed ? '⚠️ Tap again: Amber stops, you talk' : '🔴 Listening · tap to take over';
    else if (rs === 'taking') b.textContent = 'Taking over…';
    else if (rs === 'talking') {
      b.textContent = muted ? '🔇 Muted · tap to unmute' : '🎙 Talking · tap to mute';
      if (!muted) { b.style.background = 'var(--green)'; b.style.color = '#fff'; }
    }
    if (rs !== 'off') b.style.display = '';
    if (lv) lv.style.display = rs === 'off' ? 'none' : '';
  }
  function reset() { watch = null; rs = 'off'; muted = false; armed = false; clearTimeout(armT); clearInterval(kaT); kaT = 0; paint(); }
  /* after a take-over the AI sends no more updates: keep the hub's live row 'ongoing' while you talk */
  function keepAlive(callId) {
    var ping = function () { sbFetch('/functions/v1/live-voice-monitor', { method: 'POST', body: JSON.stringify({ path: '/keepalive/' + callId }) }).catch(function () {}); };
    ping(); clearInterval(kaT); kaT = setInterval(ping, 15000);
  }

  /* every control request goes through our own function (staff only) */
  function proxyFetch(url, init) {
    var path = new URL(String(url)).pathname, body = {};
    try { body = init && init.body ? JSON.parse(init.body) : {}; } catch (_) {}
    return sbFetch('/functions/v1/live-voice-monitor', { method: 'POST', body: JSON.stringify({ path: path, body: body }) });
  }

  async function listen() {
    var callId = String(window._liveDetailId || '');
    rs = 'joining'; paint();
    try {
      await loadSDK();
      var client = new window.AdvRetell.RetellClient({ key: 'hub', fetch: proxyFetch });
      var w = client.monitorCall({
        call_id: callId, transcript: false, /* the hub already shows the live transcript */
        hooks: {
          onStatus: function (s) {
            if (watch !== w) return;
            if (s === 'ended') { reset(); if (typeof _markLiveCallEnded === 'function') _markLiveCallEnded(); }
          },
          onError: function (e) { if (watch !== w) return; console.warn('[live-retell]', e); }
        }
      });
      watch = w;
      await w.listen();
      if (watch !== w) return;
      rs = 'listening'; paint();
      toast('🎧 Listening — they can’t hear you');
    } catch (e) {
      try { if (watch) watch.disconnect(); } catch (_) {}
      reset();
      toast('❌ ' + ((e && e.message) || 'Listen failed'));
    }
  }
  async function takeOver() {
    var w = watch; if (!w) return;
    rs = 'taking'; armed = false; paint();
    try {
      await w.takeOver();
      if (watch !== w) return;
      rs = 'talking'; muted = false; paint(); keepAlive(w.callId || String(window._liveDetailId || ''));
      toast('🎙 You are IN the call — Amber has stopped, they can hear you');
    } catch (e) {
      if (watch !== w) return;
      if (w.status === 'listening') { rs = 'listening'; paint(); }
      else reset();
      toast('❌ ' + (/Permission|NotAllowed|denied/i.test(String(e && (e.name || e.message))) ? 'Allow the microphone to take over' : ((e && e.message) || 'Could not take over')));
    }
  }

  window.toggleLiveListen = function () {
    if (!watch && !retellMode()) return orig.toggle.apply(this, arguments);
    if (rs === 'off') return listen();
    if (rs === 'listening') {
      if (!armed) { armed = true; paint(); clearTimeout(armT); armT = setTimeout(function () { armed = false; paint(); }, 4000); return; }
      return takeOver();
    }
    if (rs === 'talking' && watch) {
      muted = !muted; try { muted ? watch.mute() : watch.unmute(); } catch (_) {}
      paint(); toast(muted ? '🔇 Muted — they can’t hear you' : '🎙 Unmuted');
    }
  };
  window.stopLiveListen = function () {
    if (!watch) return orig.stop.apply(this, arguments);
    var w = watch, wasTalking = rs === 'talking';
    reset();
    try { w.disconnect(); } catch (_) {}
    if (wasTalking) toast('📞 You left — the call has ended');
  };
  /* while YOU are talking, only the real end of the call (or Leave) closes the screen */
  var origEnd = window._markLiveCallEnded;
  if (typeof origEnd === 'function') window._markLiveCallEnded = function () {
    if (watch && rs === 'talking') return;
    return origEnd.apply(this, arguments);
  };
  window._updateListenBtn = function () {
    if (watch || retellMode()) return paint();
    return orig.upd.apply(this, arguments);
  };
  window.addEventListener('pagehide', function () { try { if (watch) watch.disconnect(); } catch (_) {} });
})();
