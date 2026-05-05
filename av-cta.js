/**
 * Adviuz CTA + Tracking Script — av-cta.js
 * Hosted at: https://latest-promo.com/av-cta.js
 * Deploy this file to Netlify alongside index - admin.html
 *
 * Loaded via: <script src="https://latest-promo.com/av-cta.js?slug=X&cid=Y&clid=Z&cfg=BASE64">
 */
(function () {
  "use strict";

  // ── Read params from script src URL ────────────────────────────────
  var me = document.currentScript || (function () {
    var scripts = document.querySelectorAll('script[src*="av-cta.js"]');
    return scripts[scripts.length - 1];
  })();
  if (!me) return;

  var params = new URLSearchParams(me.src.split("?")[1] || "");
  var slug   = params.get("slug")  || "";
  var cid    = params.get("cid")   || "";
  var clid   = params.get("clid")  || "";
  var cfgB64 = params.get("cfg")   || "";
  var src    = new URLSearchParams(location.search).get("utm_source") || "direct";

  // ── Parse config ────────────────────────────────────────────────────
  var cfg = {};
  try { cfg = JSON.parse(decodeURIComponent(escape(atob(cfgB64)))); } catch (e) {}

  var hasCall  = !!(cfg.cta_call && cfg.cta_call.number);
  var hasForm  = !!(cfg.cta_form && cfg.cta_form.fields && cfg.cta_form.fields.length > 0);
  var callNum  = hasCall ? cfg.cta_call.number.replace(/[^+0-9]/g, "") : "";
  var callLbl  = hasCall ? (cfg.cta_call.label || "Call now") : "";
  var formTitle = hasForm ? (cfg.cta_form.title || "Send an inquiry") : "";
  var formBtn  = hasForm ? (cfg.cta_form.btn || "Submit") : "";
  var fields   = hasForm ? (cfg.cta_form.fields || []) : [];

  var U = "https://crhvvfomwkrgwlnfruad.supabase.co";
  var K = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyaHZ2Zm9td2tyZ3dsbmZydWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMjA3MDYsImV4cCI6MjA5Mjc5NjcwNn0.lTHjU0bHTGGiTPJl04iefIenI6KiqiS3u2h_WyHZ0aw";

  var UUID = null, _paused = false;

  // ── Supabase insert ─────────────────────────────────────────────────
  function ins(table, data) {
    fetch(U + "/rest/v1/" + table, {
      method: "POST",
      headers: {
        apikey: K,
        "Authorization": "Bearer " + K,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(data)
    }).catch(function () {});
  }

  // ── View counting ───────────────────────────────────────────────────
  var _ck = "adv_v_" + cid;
  var _ts = parseInt(localStorage.getItem(_ck) || "0");
  var counted = _ts > 0 && Date.now() - _ts < 86400000;

  window.adviuzCountView = function () {
    if (counted || _paused) return;
    counted = true;
    localStorage.setItem(_ck, String(Date.now()));
    ins("view_events", {
      ad_id: UUID || null, client_id: clid || null, campaign_id: cid,
      utm_source: src, viewed_at: new Date().toISOString()
    });
    fetch(U + "/rest/v1/rpc/increment_campaign_views", {
      method: "POST",
      headers: { apikey: K, "Authorization": "Bearer " + K, "Content-Type": "application/json" },
      body: JSON.stringify({ p_campaign_id: cid })
    }).catch(function () {});
  };

  // ── Timer ────────────────────────────────────────────────────────────
  var DUR = 25000, elapsed = 0, done = false, tickId = null;
  var tabVis = !document.hidden, winFoc = true;

  function canRun() { return tabVis && winFoc && !done && !_paused; }

  function updateBar() {
    var pct = Math.min(100, elapsed / DUR * 100);
    var b = document.getElementById("adviuz-bar");
    if (b) {
      b.style.width = pct + "%";
      b.style.background = pct < 50 ? "#9ca3af" : pct < 75 ? "#eab308" : pct < 90 ? "#f97316" : "#22c55e";
    }
    if (pct >= 100 && !done) {
      done = true;
      if (b) b.classList.add("done");
      window.adviuzCountView();
      // Show popup 900ms after timer completes
      setTimeout(function () {
        var p = document.getElementById("av-popup");
        if (p) p.classList.add("open");
      }, 900);
    }
  }

  function startTick() {
    if (tickId || done) return;
    var t = Date.now();
    tickId = setInterval(function () {
      if (!canRun()) { stopTick(); return; }
      elapsed += Date.now() - t;
      t = Date.now();
      updateBar();
      if (done) stopTick();
    }, 100);
  }
  function stopTick() { clearInterval(tickId); tickId = null; }
  function chk() { if (canRun()) startTick(); else stopTick(); }

  document.addEventListener("visibilitychange", function () { tabVis = !document.hidden; chk(); });
  window.addEventListener("blur",  function () { winFoc = false; chk(); });
  window.addEventListener("focus", function () { winFoc = true;  chk(); });

  // ── Paused overlay ──────────────────────────────────────────────────
  function showPausedOv() {
    _paused = true;
    var w = document.getElementById("adviuz-bar-wrap"); if (w) w.style.display = "none";
    var f = document.getElementById("av-fab");           if (f) f.style.display = "none";
    var ov = document.createElement("div");
    ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:-apple-system,sans-serif";
    ov.innerHTML = [
      '<div style="text-align:center;padding:40px">',
        '<div style="font-size:56px;margin-bottom:16px">&#9208;</div>',
        '<div style="color:#fff;font-size:22px;font-weight:700;margin-bottom:10px">Ad paused</div>',
        '<div style="color:rgba(255,255,255,.4);font-size:14px">This campaign is temporarily unavailable.</div>',
      '</div>'
    ].join("");
    document.body.appendChild(ov);
  }

  // ── Init: check pause + detect country code ─────────────────────────
  async function init() {
    // Check ad pause status
    try {
      var r = await fetch(
        U + "/rest/v1/ads?ad_slug=eq." + encodeURIComponent(slug) + "&select=id,client_id,status",
        { headers: { apikey: K, "Authorization": "Bearer " + K } }
      );
      if (r.ok) {
        var d = await r.json();
        if (d[0]) {
          if (d[0].status === "paused") { showPausedOv(); return; }
          UUID = d[0].id;
        }
      }
    } catch (e) {}

    // Check campaign pause status
    try {
      var cr = await fetch(
        U + "/rest/v1/campaigns?id=eq." + cid + "&select=status",
        { headers: { apikey: K, "Authorization": "Bearer " + K } }
      );
      if (cr.ok) {
        var cd = await cr.json();
        if (cd[0] && cd[0].status === "paused") { showPausedOv(); return; }
      }
    } catch (e) {}

    // Auto-detect country code from IP
    if (hasForm) {
      fetch("https://ipapi.co/json/")
        .then(function (r) { return r.json(); })
        .then(function (d) {
          var cc = d.country_calling_code;
          if (!cc) return;
          document.querySelectorAll(".av-cc").forEach(function (s) {
            for (var i = 0; i < s.options.length; i++) {
              if (s.options[i].value === cc) { s.selectedIndex = i; break; }
            }
          });
        })
        .catch(function () {});
    }

    // Start timer
    chk();
  }

  // ── Inject CSS ───────────────────────────────────────────────────────
  if (hasCall || hasForm) {
    var style = document.createElement("style");
    style.id = "adviuz-cta-style";
    style.textContent = [
      "@keyframes av-pulse{0%,100%{box-shadow:0 0 0 0 rgba(200,16,46,.5)}60%{box-shadow:0 0 0 12px rgba(200,16,46,0)}}",
      ".av-fab{position:fixed;right:18px;bottom:80px;z-index:99990;display:flex;flex-direction:column;gap:14px;align-items:center}",
      ".av-btn{width:58px;height:58px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,.28);transition:transform .15s;-webkit-tap-highlight-color:transparent;position:relative}",
      ".av-btn:active{transform:scale(.88)}",
      ".av-btn-call{background:#C8102E;animation:av-pulse 2.5s ease-in-out infinite}",
      ".av-btn-form{background:#111827;animation:av-pulse 2.5s ease-in-out .5s infinite}",
      ".av-btn svg{width:26px;height:26px;pointer-events:none}",
      ".av-tip{position:absolute;right:68px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,.82);color:#fff;padding:5px 10px;border-radius:7px;font-size:12px;font-weight:600;white-space:nowrap;font-family:-apple-system,sans-serif;opacity:0;pointer-events:none;transition:opacity .2s}",
      ".av-btn:hover .av-tip{opacity:1}",
      ".av-ov{display:none;position:fixed;inset:0;z-index:999998;background:rgba(0,0,0,.6);backdrop-filter:blur(3px);align-items:flex-end;justify-content:center}",
      ".av-ov.open{display:flex}",
      "@keyframes av-up{from{transform:translateY(100%)}to{transform:translateY(0)}}",
      ".av-sheet{background:#fff;border-radius:22px 22px 0 0;padding:0 20px calc(28px + env(safe-area-inset-bottom));width:100%;max-width:500px;animation:av-up .32s cubic-bezier(.34,1.1,.64,1) forwards}",
      ".av-handle{width:40px;height:4px;background:#ddd;border-radius:2px;margin:14px auto 18px}",
      ".av-popup-icon{font-size:44px;text-align:center;margin-bottom:8px}",
      ".av-popup-title{font-size:20px;font-weight:800;color:#111;font-family:-apple-system,sans-serif;text-align:center;margin-bottom:4px}",
      ".av-popup-sub{font-size:14px;color:#888;font-family:-apple-system,sans-serif;text-align:center;margin-bottom:20px}",
      ".av-popup-btn{width:100%;padding:16px;border:none;border-radius:14px;font-size:16px;font-weight:700;cursor:pointer;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:10px;-webkit-tap-highlight-color:transparent}",
      ".av-popup-btn:active{opacity:.85}",
      ".av-popup-call{background:#C8102E;color:#fff}",
      ".av-popup-form{background:#111827;color:#fff}",
      ".av-popup-dismiss{text-align:center;font-size:14px;color:#aaa;cursor:pointer;padding:8px;font-family:-apple-system,sans-serif}",
      ".av-form-title{font-size:21px;font-weight:800;color:#111;font-family:-apple-system,sans-serif;margin-bottom:4px}",
      ".av-form-sub{font-size:13px;color:#888;font-family:-apple-system,sans-serif;margin-bottom:18px}",
      ".av-field{margin-bottom:14px}",
      ".av-label{display:block;font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#888;margin-bottom:6px;font-family:-apple-system,sans-serif}",
      ".av-err{font-size:11px;color:#C8102E;margin-top:4px;display:none;font-family:-apple-system,sans-serif}",
      ".av-input{width:100%;background:#f5f5f5;border:2px solid #e5e5e5;border-radius:12px;padding:13px 14px;font-size:16px;color:#111;font-family:-apple-system,sans-serif;outline:none;box-sizing:border-box;-webkit-appearance:none}",
      ".av-input:focus{border-color:#C8102E}",
      ".av-input.invalid{border-color:#C8102E!important}",
      ".av-phone-wrap{display:flex;gap:8px}",
      ".av-cc{background:#f5f5f5;border:2px solid #e5e5e5;border-radius:12px;padding:13px 10px;font-size:15px;font-family:-apple-system,sans-serif;outline:none;-webkit-appearance:none;cursor:pointer}",
      ".av-cc:focus{border-color:#C8102E}",
      ".av-phone-num{flex:1;min-width:0}",
      ".av-submit{width:100%;background:#C8102E;color:#fff;border:none;border-radius:50px;padding:16px;font-size:17px;font-weight:700;cursor:pointer;font-family:-apple-system,sans-serif;margin-top:4px;box-shadow:0 4px 20px rgba(200,16,46,.3)}",
      ".av-submit:active{opacity:.85}",
      ".av-submit:disabled{opacity:.6;cursor:not-allowed}",
      ".av-success{display:none;text-align:center;padding:10px 0 4px}",
      ".av-hp{opacity:0;position:absolute;top:0;left:0;height:0;width:0;z-index:-1}"
    ].join("");
    document.head.appendChild(style);
  }

  // ── Build CTA DOM ────────────────────────────────────────────────────
  function el(tag, props, children) {
    var e = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === "style")      e.style.cssText = props[k];
      else if (k === "text")  e.textContent   = props[k];
      else if (k === "html")  e.innerHTML      = props[k];
      else if (k === "click") e.addEventListener("click", props[k]);
      else                    e.setAttribute(k, props[k]);
    });
    (children || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }

  function svgCall() {
    var s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox","0 0 24 24"); s.setAttribute("fill","none");
    s.setAttribute("stroke","white"); s.setAttribute("stroke-width","2.2");
    s.setAttribute("stroke-linecap","round"); s.setAttribute("stroke-linejoin","round");
    s.style.width = "26px"; s.style.height = "26px";
    var p = document.createElementNS("http://www.w3.org/2000/svg","path");
    p.setAttribute("d","M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 11 19.79 19.79 0 01.11 2.38 2 2 0 012.11.5h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.09a16 16 0 006 6l.66-.65a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z");
    s.appendChild(p); return s;
  }

  if (hasCall || hasForm) {
    var root = document.createElement("div");

    // FAB (form above, call below = thumb position)
    var fab = el("div", { id: "av-fab", class: "av-fab" });
    if (hasForm) {
      var bForm = el("div", { class: "av-btn av-btn-form", role: "button", "aria-label": formTitle, click: function () { avOpenForm(); } });
      bForm.appendChild(el("span", { class: "av-tip", text: formTitle }));
      var si = document.createElementNS("http://www.w3.org/2000/svg","svg");
      si.setAttribute("viewBox","0 0 24 24"); si.setAttribute("fill","none");
      si.setAttribute("stroke","white"); si.setAttribute("stroke-width","2.2");
      si.setAttribute("stroke-linecap","round"); si.setAttribute("stroke-linejoin","round");
      si.style.cssText = "width:26px;height:26px;pointer-events:none";
      var pi = document.createElementNS("http://www.w3.org/2000/svg","path");
      pi.setAttribute("d","M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z");
      si.appendChild(pi); bForm.appendChild(si);
      fab.appendChild(bForm);
    }
    if (hasCall) {
      var bCall = el("div", { class: "av-btn av-btn-call", role: "button", "aria-label": callLbl, click: function () { avCall(); } });
      bCall.appendChild(el("span", { class: "av-tip", text: callLbl }));
      bCall.appendChild(svgCall());
      fab.appendChild(bCall);
    }
    root.appendChild(fab);

    // 25s popup
    var popup = el("div", { id: "av-popup", class: "av-ov", click: function (e) { if (e.target === popup) avClosePopup(); } });
    var pSheet = el("div", { class: "av-sheet" });
    pSheet.appendChild(el("div", { class: "av-handle" }));
    pSheet.appendChild(el("div", { class: "av-popup-icon", html: "&#9989;" }));
    pSheet.appendChild(el("div", { class: "av-popup-title", text: "You watched the full ad" }));
    pSheet.appendChild(el("div", { class: "av-popup-sub",   text: "Ready to take the next step?" }));
    if (hasCall) {
      var pb1 = el("button", { class: "av-popup-btn av-popup-call", click: function () { avCall(); } });
      pb1.appendChild(svgCall()); pb1.appendChild(document.createTextNode(" " + callLbl));
      pSheet.appendChild(pb1);
    }
    if (hasForm) {
      var pb2 = el("button", { class: "av-popup-btn av-popup-form", click: function () { avOpenForm(); avClosePopup(); } });
      pb2.textContent = formTitle;
      pSheet.appendChild(pb2);
    }
    pSheet.appendChild(el("div", { class: "av-popup-dismiss", text: "Maybe later", click: function () { avClosePopup(); } }));
    popup.appendChild(pSheet);
    root.appendChild(popup);

    // Form sheet
    if (hasForm) {
      var formOv = el("div", { id: "av-form-ov", class: "av-ov", click: function (e) { if (e.target === formOv) avCloseForm(); } });
      var fSheet = el("div", { class: "av-sheet", style: "max-height:88vh;overflow-y:auto" });
      var fBody  = el("div", { id: "av-form-body" });
      fBody.appendChild(el("div", { class: "av-form-title", text: formTitle }));
      fBody.appendChild(el("div", { class: "av-form-sub",   text: "We will be in touch shortly" }));

      // Build form fields
      fields.forEach(function (f) {
        var fid  = "avf-" + f.id;
        var wrap = el("div", { class: "av-field", id: fid + "-wrap" });
        var lbl  = el("label", { class: "av-label", for: fid, text: (f.label || "Field") + (f.required ? " " : "") });
        if (f.required) lbl.appendChild(el("span", { style: "color:#C8102E", text: "*" }));
        wrap.appendChild(lbl);

        var inp;
        if (f.type === "phone") {
          var pw  = el("div", { class: "av-phone-wrap" });
          var ccs = el("select", { class: "av-cc", id: fid + "-cc", autocomplete: "tel-country-code" });
          [
            ["+1",   "CA / US"],
            ["+91",  "India"],
            ["+44",  "UK"],
            ["+61",  "Australia"],
            ["+92",  "Pakistan"],
            ["+971", "UAE"],
            ["+49",  "Germany"],
            ["+33",  "France"],
            ["+880", "Bangladesh"]
          ].forEach(function (o) {
            var opt = el("option", { value: o[0], text: o[0] + " " + o[1] });
            ccs.appendChild(opt);
          });
          inp = el("input", { type: "tel", id: fid, class: "av-input av-phone-num", placeholder: "416 555 0100", maxlength: "15", inputmode: "numeric", autocomplete: "tel-national" });
          inp.addEventListener("input", function () { this.value = this.value.replace(/[^0-9 ()\-]/g, ""); });
          pw.appendChild(ccs); pw.appendChild(inp); wrap.appendChild(pw);
          inp = null; // already appended
        } else if (f.type === "email") {
          inp = el("input", { type: "email", id: fid, class: "av-input", placeholder: f.placeholder || "email@example.com", autocomplete: "email", inputmode: "email" });
        } else if (f.type === "name") {
          inp = el("input", { type: "text", id: fid, class: "av-input", placeholder: f.placeholder || "Your full name", autocomplete: "name", autocapitalize: "words" });
          inp.addEventListener("input", function () { this.value = this.value.replace(/[0-9!@#$%^&*()+={}\[\]|<>?]/g, ""); });
        } else if (f.type === "dropdown") {
          inp = el("select", { id: fid, class: "av-input" });
          inp.appendChild(el("option", { value: "", text: "Select an option..." }));
          (f.options || []).forEach(function (o) { inp.appendChild(el("option", { value: o, text: o })); });
        } else if (f.type === "date") {
          inp = el("input", { type: "date", id: fid, class: "av-input" });
        } else if (f.type === "time") {
          inp = el("input", { type: "time", id: fid, class: "av-input" });
        } else if (f.type === "textarea") {
          inp = el("textarea", { id: fid, class: "av-input", placeholder: f.placeholder || "", style: "height:80px;resize:none" });
        } else {
          inp = el("input", { type: "text", id: fid, class: "av-input", placeholder: f.placeholder || "" });
        }
        if (inp) wrap.appendChild(inp);
        wrap.appendChild(el("div", { class: "av-err", id: fid + "-err" }));
        fBody.appendChild(wrap);
      });

      // Honeypot
      fBody.appendChild(el("input", { class: "av-hp", type: "text", id: "av-hp", tabindex: "-1", autocomplete: "off", "aria-hidden": "true" }));

      var submitBtn = el("button", { class: "av-submit", id: "av-submit-btn", text: formBtn, click: function () { avSubmit(); } });
      fBody.appendChild(submitBtn);

      // Success state
      var succ = el("div", { class: "av-success", id: "av-success" });
      succ.innerHTML = '<div style="font-size:52px;margin-bottom:12px">&#127881;</div>' +
        '<div style="font-size:22px;font-weight:800;color:#111;font-family:-apple-system,sans-serif">Thank you!</div>' +
        '<div style="font-size:14px;color:#888;font-family:-apple-system,sans-serif;margin-top:6px">We will be in touch very shortly.</div>';
      if (hasCall) {
        var cLink = el("a", { href: "tel:" + callNum, style: "display:inline-flex;align-items:center;gap:8px;padding:13px 24px;background:#C8102E;color:#fff;border-radius:50px;font-size:15px;font-weight:700;text-decoration:none;font-family:-apple-system,sans-serif;margin-top:20px", text: "Or call now \u2192" });
        succ.appendChild(cLink);
      }

      fSheet.appendChild(fBody); fSheet.appendChild(succ);
      formOv.appendChild(fSheet);
      root.appendChild(formOv);
    }

    document.body.appendChild(root);
  }

  // ── CTA Actions ──────────────────────────────────────────────────────
  window.avCall = function () {
    if (!callNum) return;
    ins("click_events", { ad_id: UUID || null, client_id: clid || null, campaign_id: cid, cta_type: "call", clicked_at: new Date().toISOString() });
    window.location.href = "tel:" + callNum;
  };
  window.avOpenForm = function () {
    var o = document.getElementById("av-form-ov"); if (o) o.classList.add("open");
    ins("click_events", { ad_id: UUID || null, client_id: clid || null, campaign_id: cid, cta_type: "form", clicked_at: new Date().toISOString() });
  };
  window.avCloseForm   = function () { var o = document.getElementById("av-form-ov"); if (o) o.classList.remove("open"); };
  window.avClosePopup  = function () { var p = document.getElementById("av-popup");   if (p) p.classList.remove("open"); };

  // ── Validation ────────────────────────────────────────────────────────
  function valEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function valPhone(v) { var n = v.replace(/\D/g, ""); return n.length >= 6 && n.length <= 15; }

  function showErr(id, msg) {
    var e = document.getElementById(id + "-err"), i = document.getElementById(id);
    if (e) { e.textContent = msg; e.style.display = "block"; }
    if (i) i.classList.add("invalid");
  }
  function clrErr(id) {
    var e = document.getElementById(id + "-err"), i = document.getElementById(id);
    if (e) e.style.display = "none";
    if (i) i.classList.remove("invalid");
  }

  // ── Duplicate check ───────────────────────────────────────────────────
  async function isDup(phone, email) {
    try {
      var q = U + "/rest/v1/leads?campaign_id=eq." + cid + "&select=id";
      if (phone) q += "&phone=eq." + encodeURIComponent(phone);
      var r = await fetch(q, { headers: { apikey: K, "Authorization": "Bearer " + K } });
      if (r.ok) { var d = await r.json(); return d.length > 0; }
    } catch (e) {}
    return false;
  }

  // ── Form submit ───────────────────────────────────────────────────────
  window.avSubmit = async function () {
    var hp = document.getElementById("av-hp"); if (hp && hp.value.trim()) return;
    var ok = true, data = {};

    fields.forEach(function (f) {
      var fid = "avf-" + f.id; clrErr(fid);
      if (f.type === "phone") {
        var cc  = (document.getElementById(fid + "-cc") || { value: "+1" }).value;
        var num = ((document.getElementById(fid) || { value: "" }).value || "").replace(/\D/g, "");
        if (f.required && !num) { showErr(fid, "Phone number is required"); ok = false; return; }
        if (num && !valPhone(num)) { showErr(fid, "Please enter a valid phone number"); ok = false; return; }
        if (num) data.phone = cc + num;
      } else if (f.type === "email") {
        var v = ((document.getElementById(fid) || { value: "" }).value || "").trim();
        if (f.required && !v) { showErr(fid, "Email address is required"); ok = false; return; }
        if (v && !valEmail(v)) { showErr(fid, "Please enter a valid email address"); ok = false; return; }
        if (v) data.email = v;
      } else if (f.type === "name") {
        var v = ((document.getElementById(fid) || { value: "" }).value || "").trim();
        if (f.required && !v) { showErr(fid, "Name is required"); ok = false; return; }
        if (v && /[0-9!@#$%^&*()+={}\[\]|<>?]/.test(v)) { showErr(fid, "Name should only contain letters"); ok = false; return; }
        if (v) data.name = v;
      } else {
        var v = ((document.getElementById(fid) || { value: "" }).value || "").trim();
        if (f.required && !v) { showErr(fid, (f.label || "This field") + " is required"); ok = false; return; }
        if (v) data[f.id] = v;
      }
    });

    if (!ok) {
      var first = document.querySelector(".av-input.invalid");
      if (first) first.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }

    var btn = document.getElementById("av-submit-btn");
    if (btn) { btn.textContent = "Checking..."; btn.disabled = true; }

    var dup = await isDup(data.phone, data.email);
    if (dup) {
      if (btn) { btn.textContent = formBtn; btn.disabled = false; }
      alert("It looks like you have already submitted an inquiry. We will be in touch shortly!");
      return;
    }

    if (btn) btn.textContent = "Sending...";

    ins("leads", Object.assign({
      client_id: clid || null, campaign_id: cid, ad_id: UUID || null,
      source: src, stage: "New", ai_call_status: "pending",
      submitted_at: new Date().toISOString()
    }, data));

    // Notify via Edge Function
    fetch(U + "/functions/v1/notify-lead", {
      method: "POST",
      headers: { apikey: K, "Content-Type": "application/json" },
      body: JSON.stringify({ ad_id: UUID, name: data.name || "", phone: data.phone || "" })
    }).catch(function () {});

    setTimeout(function () {
      if (btn) { btn.textContent = formBtn; btn.disabled = false; }
      var body = document.getElementById("av-form-body"); if (body) body.style.display = "none";
      var succ = document.getElementById("av-success");   if (succ) succ.style.display = "block";
    }, 600);
  };

  // ── Start ─────────────────────────────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
