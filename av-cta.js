/**
 * Adviuz CTA + Tracking Script — av-cta.js v2
 * Hosted at: https://latest-promo.com/av-cta.js
 */
(function () {
  "use strict";

  var me = document.currentScript || (function () {
    var s = document.querySelectorAll('script[src*="av-cta.js"]');
    return s[s.length - 1];
  })();
  if (!me) return;

  var params    = new URLSearchParams(me.src.split("?")[1] || "");
  var slug      = params.get("slug")  || "";
  var cid       = params.get("cid")   || "";
  var clid      = params.get("clid")  || "";
  var cfgB64    = params.get("cfg")   || "";
  var utmSrc    = new URLSearchParams(location.search).get("utm_source") || "direct";

  var cfg = {};
  try { cfg = JSON.parse(decodeURIComponent(escape(atob(cfgB64)))); } catch (e) {}

  var hasCall   = !!(cfg.cta_call && cfg.cta_call.number);
  var hasForm   = !!(cfg.cta_form && cfg.cta_form.fields && cfg.cta_form.fields.length > 0);
  var callNum   = hasCall ? cfg.cta_call.number.replace(/[^+0-9]/g, "") : "";
  var callLbl   = hasCall ? (cfg.cta_call.label || "Call now") : "";
  var formTitle = hasForm ? (cfg.cta_form.title || "Send an inquiry") : "";
  var formBtn   = hasForm ? (cfg.cta_form.btn   || "Submit") : "";
  var fields    = hasForm ? (cfg.cta_form.fields || []) : [];

  var U    = "https://crhvvfomwkrgwlnfruad.supabase.co";
  var K    = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyaHZ2Zm9td2tyZ3dsbmZydWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMjA3MDYsImV4cCI6MjA5Mjc5NjcwNn0.lTHjU0bHTGGiTPJl04iefIenI6KiqiS3u2h_WyHZ0aw";
  var UUID = null, _paused = false;

  async function ins(t, d) {
    try {
      var r = await fetch(U + "/rest/v1/" + t, {
        method: "POST",
        headers: { apikey: K, "Authorization": "Bearer " + K, "Content-Type": "application/json", "Prefer": "return=minimal" },
        body: JSON.stringify(d)
      });
      if (!r.ok) { var err = await r.text(); console.error("[Adviuz] Insert failed:", r.status, err); }
      return r.ok;
    } catch(e) { console.error("[Adviuz] Insert error:", e); return false; }
  }

  // View counting
  var _ck = "adv_v_" + cid;
  var counted = parseInt(localStorage.getItem(_ck)||"0") > 0 && Date.now() - parseInt(localStorage.getItem(_ck)) < 86400000;
  window.adviuzCountView = function () {
    if (counted || _paused) return;
    counted = true; localStorage.setItem(_ck, String(Date.now()));
    ins("view_events", { ad_id:UUID||null, client_id:clid||null, campaign_id:cid, utm_source:utmSrc, viewed_at:new Date().toISOString() });
    fetch(U+"/rest/v1/rpc/increment_campaign_views",{method:"POST",headers:{apikey:K,"Authorization":"Bearer "+K,"Content-Type":"application/json"},body:JSON.stringify({p_campaign_id:cid})}).catch(function(){});
  };

  // Timer
  var DUR=25000,elapsed=0,done=false,tickId=null,tabVis=!document.hidden,winFoc=true;
  function canRun(){return tabVis&&winFoc&&!done&&!_paused;}
  function updateBar(){
    var pct=Math.min(100,elapsed/DUR*100);
    var b=document.getElementById("adviuz-bar");
    if(b){b.style.width=pct+"%";b.style.background=pct<50?"#94a3b8":pct<75?"#f59e0b":pct<90?"#f97316":"#22c55e";}
    if(pct>=100&&!done){done=true;if(b)b.classList.add("done");window.adviuzCountView();setTimeout(function(){var p=document.getElementById("av-popup");if(p)p.classList.add("open");},900);}
  }
  function startTick(){if(tickId||done)return;var t=Date.now();tickId=setInterval(function(){if(!canRun()){stopTick();return;}elapsed+=Date.now()-t;t=Date.now();updateBar();if(done)stopTick();},100);}
  function stopTick(){clearInterval(tickId);tickId=null;}
  function chk(){if(canRun())startTick();else stopTick();}
  document.addEventListener("visibilitychange",function(){tabVis=!document.hidden;chk();});
  window.addEventListener("blur",function(){winFoc=false;chk();});
  window.addEventListener("focus",function(){winFoc=true;chk();});

  // Paused overlay
  function showPausedOv(){
    _paused=true;
    var w=document.getElementById("adviuz-bar-wrap");if(w)w.style.display="none";
    var f=document.getElementById("av-fab");if(f)f.style.display="none";
    var ov=document.createElement("div");
    ov.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:-apple-system,sans-serif";
    ov.innerHTML='<div style="text-align:center;padding:40px"><div style="font-size:56px;margin-bottom:16px">&#9208;</div><div style="color:#fff;font-size:22px;font-weight:700;margin-bottom:10px">Ad paused</div><div style="color:rgba(255,255,255,.4);font-size:14px">This campaign is temporarily unavailable.</div></div>';
    document.body.appendChild(ov);
  }

  async function init(){
    try{var r=await fetch(U+"/rest/v1/ads?ad_slug=eq."+encodeURIComponent(slug)+"&select=id,client_id,status",{headers:{apikey:K,"Authorization":"Bearer "+K}});if(r.ok){var d=await r.json();if(d[0]){if(d[0].status==="paused"){showPausedOv();return;}UUID=d[0].id;}}}catch(e){}
    try{var cr=await fetch(U+"/rest/v1/campaigns?id=eq."+cid+"&select=status",{headers:{apikey:K,"Authorization":"Bearer "+K}});if(cr.ok){var cd=await cr.json();if(cd[0]&&cd[0].status==="paused"){showPausedOv();return;}}}catch(e){}
    if(hasForm){fetch("https://ipapi.co/json/").then(function(r){return r.json();}).then(function(d){var cc=d.country_calling_code;if(!cc)return;document.querySelectorAll(".av-cc").forEach(function(s){for(var i=0;i<s.options.length;i++){if(s.options[i].value===cc){s.selectedIndex=i;break;}}});}).catch(function(){});}
  }

  // CSS
  if(hasCall||hasForm){
    var style=document.createElement("style");
    style.id="adviuz-cta-style";
    style.textContent=[
      // FAB
      "@keyframes av-pulse{0%,100%{box-shadow:0 6px 28px rgba(200,16,46,.5)}50%{box-shadow:0 6px 40px rgba(200,16,46,.8)}}",
      ".av-fab{position:fixed;right:20px;bottom:90px;z-index:99990;display:flex;flex-direction:column;gap:10px;align-items:flex-end}",
      ".av-fab-btn{display:flex;align-items:center;gap:0;border:none;cursor:pointer;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;-webkit-tap-highlight-color:transparent;transition:transform .18s;white-space:nowrap;padding:0;background:none}",
      ".av-fab-btn:active{transform:scale(.92)}",
      ".av-fab-label{font-size:13px;font-weight:700;padding:0 14px 0 10px;letter-spacing:-.01em}",
      ".av-fab-icon{width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}",
      ".av-fab-call .av-fab-icon{background:#C8102E;animation:av-pulse 2.5s ease-in-out infinite}",
      ".av-fab-call .av-fab-label{background:#C8102E;color:#fff;border-radius:26px 0 0 26px;height:52px;display:flex;align-items:center}",
      ".av-fab-call{border-radius:26px;overflow:hidden;box-shadow:0 4px 20px rgba(200,16,46,.4)}",
      ".av-fab-form .av-fab-icon{background:#0f172a}",
      ".av-fab-form .av-fab-label{background:#0f172a;color:#fff;border-radius:26px 0 0 26px;height:52px;display:flex;align-items:center}",
      ".av-fab-form{border-radius:26px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.3)}",
      ".av-fab-btn svg{width:22px;height:22px;pointer-events:none}",
      // Overlay
      ".av-ov{display:none;position:fixed;inset:0;z-index:999998;background:rgba(15,23,42,.6);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);align-items:flex-end;justify-content:center}",
      ".av-ov.open{display:flex}",
      "@keyframes av-up{from{transform:translateY(48px);opacity:0}to{transform:translateY(0);opacity:1}}",
      // Popup
      ".av-popup{background:#fff;border-radius:28px 28px 0 0;padding:0 24px calc(36px + env(safe-area-inset-bottom));width:100%;max-width:460px;animation:av-up .35s cubic-bezier(.34,1.15,.64,1) forwards}",
      ".av-handle{width:44px;height:5px;background:#e2e8f0;border-radius:3px;margin:16px auto 24px}",
      ".av-popup-badge{width:72px;height:72px;background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;box-shadow:0 8px 24px rgba(34,197,94,.4)}",
      ".av-popup-title{font-size:22px;font-weight:800;color:#0f172a;text-align:center;margin-bottom:8px;letter-spacing:-.03em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.2}",
      ".av-popup-sub{font-size:15px;color:#64748b;text-align:center;margin-bottom:28px;font-family:-apple-system,sans-serif;line-height:1.55}",
      ".av-popup-btn{width:100%;padding:17px;border:none;border-radius:16px;font-size:16px;font-weight:700;cursor:pointer;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:10px;letter-spacing:-.01em;transition:opacity .15s}",
      ".av-popup-btn:active{opacity:.82}",
      ".av-popup-call{background:#C8102E;color:#fff;box-shadow:0 4px 20px rgba(200,16,46,.4)}",
      ".av-popup-form{background:#0f172a;color:#fff;box-shadow:0 4px 20px rgba(0,0,0,.25)}",
      ".av-popup-dismiss{text-align:center;font-size:14px;color:#94a3b8;cursor:pointer;padding:10px;font-family:-apple-system,sans-serif;font-weight:500;margin-top:-2px}",
      // Form
      ".av-form{background:#f1f5f9;border-radius:28px 28px 0 0;width:100%;max-width:460px;max-height:92vh;overflow-y:auto;animation:av-up .35s cubic-bezier(.34,1.15,.64,1) forwards}",
      ".av-form::-webkit-scrollbar{display:none}",
      ".av-form-head{background:linear-gradient(140deg,#0f172a 0%,#1e3a5f 100%);padding:20px 20px 24px;border-radius:28px 28px 0 0;position:relative}",
      ".av-form-close-btn{position:absolute;top:18px;right:18px;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.12);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.8);font-size:17px;font-family:sans-serif;transition:background .15s}",
      ".av-form-close-btn:hover{background:rgba(255,255,255,.2)}",
      ".av-form-head-icon{width:44px;height:44px;background:rgba(255,255,255,.12);border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:14px}",
      ".av-form-head-title{font-size:21px;font-weight:800;color:#fff;letter-spacing:-.03em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin-bottom:5px;line-height:1.2}",
      ".av-form-head-sub{font-size:13.5px;color:rgba(255,255,255,.5);font-family:-apple-system,sans-serif;line-height:1.5}",
      ".av-form-body{padding:22px 20px 8px}",
      ".av-field{margin-bottom:14px}",
      ".av-lbl{display:block;font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#64748b;margin-bottom:6px;font-family:-apple-system,sans-serif}",
      ".av-err{font-size:12px;color:#ef4444;margin-top:5px;display:none;font-family:-apple-system,sans-serif;font-weight:600}",
      ".av-inp{width:100%;background:#fff;border:2px solid #e2e8f0;border-radius:14px;padding:14px 16px;font-size:16px;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;outline:none;box-sizing:border-box;-webkit-appearance:none;transition:border-color .18s,box-shadow .18s;box-shadow:0 1px 3px rgba(0,0,0,.06)}",
      ".av-inp:focus{border-color:#C8102E;box-shadow:0 0 0 4px rgba(200,16,46,.1),0 1px 3px rgba(0,0,0,.06)}",
      ".av-inp.invalid{border-color:#ef4444;box-shadow:0 0 0 4px rgba(239,68,68,.1)}",
      ".av-inp::placeholder{color:#cbd5e1}",
      "select.av-inp{background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\");background-repeat:no-repeat;background-position:right 14px center;padding-right:44px;cursor:pointer}",
      ".av-phone-row{display:flex;gap:8px}",
      ".av-cc{background:#fff;border:2px solid #e2e8f0;border-radius:14px;padding:14px 10px;font-size:15px;color:#0f172a;font-family:-apple-system,sans-serif;outline:none;-webkit-appearance:none;cursor:pointer;transition:border-color .18s;flex-shrink:0;font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.06)}",
      ".av-cc:focus{border-color:#C8102E;box-shadow:0 0 0 4px rgba(200,16,46,.1)}",
      ".av-phone-inp{flex:1;min-width:0}",
      ".av-submit-area{padding:16px 20px calc(20px + env(safe-area-inset-bottom))}",
      ".av-submit{width:100%;background:linear-gradient(135deg,#C8102E 0%,#a50d26 100%);color:#fff;border:none;border-radius:16px;padding:17px;font-size:17px;font-weight:800;cursor:pointer;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:-.02em;box-shadow:0 4px 24px rgba(200,16,46,.45),inset 0 1px 0 rgba(255,255,255,.15);transition:transform .15s,box-shadow .15s}",
      ".av-submit:active{transform:scale(.97);box-shadow:0 2px 12px rgba(200,16,46,.3)}",
      ".av-submit:disabled{opacity:.6;cursor:not-allowed;transform:none}",
      ".av-privacy{text-align:center;font-size:12px;color:#94a3b8;margin-top:10px;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;gap:5px}","input[type=checkbox].av-consent{width:18px;height:18px;accent-color:#C8102E;cursor:pointer}",
      ".av-success{display:none;text-align:center;padding:32px 20px calc(32px + env(safe-area-inset-bottom))}",
      ".av-success-ring{width:88px;height:88px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;box-shadow:0 8px 32px rgba(34,197,94,.45)}",
      ".av-success-title{font-size:24px;font-weight:800;color:#0f172a;letter-spacing:-.04em;margin-bottom:10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}",
      ".av-success-sub{font-size:15px;color:#64748b;font-family:-apple-system,sans-serif;line-height:1.65;max-width:300px;margin:0 auto 28px}",
      ".av-call-link{display:inline-flex;align-items:center;gap:10px;padding:15px 28px;background:#C8102E;color:#fff;border-radius:14px;font-size:16px;font-weight:700;text-decoration:none;font-family:-apple-system,sans-serif;box-shadow:0 4px 20px rgba(200,16,46,.4)}",
      ".av-hp{opacity:0;position:absolute;top:0;left:0;height:0;width:0;z-index:-1}",
    ].join("");
    document.head.appendChild(style);
  }

  // SVG helpers
  function mkSvg(path, size, stroke) {
    var s=document.createElementNS("http://www.w3.org/2000/svg","svg");
    s.setAttribute("viewBox","0 0 24 24");s.setAttribute("fill","none");
    s.setAttribute("stroke",stroke||"white");s.setAttribute("stroke-width","2.2");
    s.setAttribute("stroke-linecap","round");s.setAttribute("stroke-linejoin","round");
    s.style.cssText="width:"+(size||22)+"px;height:"+(size||22)+"px;pointer-events:none;flex-shrink:0";
    var p=document.createElementNS("http://www.w3.org/2000/svg","path");p.setAttribute("d",path);s.appendChild(p);return s;
  }
  function mkPoly(points, size, stroke) {
    var s=document.createElementNS("http://www.w3.org/2000/svg","svg");
    s.setAttribute("viewBox","0 0 24 24");s.setAttribute("fill","none");
    s.setAttribute("stroke",stroke||"white");s.setAttribute("stroke-width","2.5");
    s.setAttribute("stroke-linecap","round");s.setAttribute("stroke-linejoin","round");
    s.style.cssText="width:"+(size||22)+"px;height:"+(size||22)+"px;pointer-events:none;flex-shrink:0";
    var p=document.createElementNS("http://www.w3.org/2000/svg","polyline");p.setAttribute("points",points);s.appendChild(p);return s;
  }
  var PATH_CALL="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 11 19.79 19.79 0 01.11 2.38 2 2 0 012.11.5h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.09a16 16 0 006 6l.66-.65a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z";
  var PATH_FORM="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z";

  // Build UI
  if(hasCall||hasForm){
    var root=document.createElement("div");

    // FAB
    var fab=document.createElement("div");fab.className="av-fab";fab.id="av-fab";
    if(hasForm){
      var bf=document.createElement("div");bf.className="av-fab-btn av-fab-form";
      var bfl=document.createElement("div");bfl.className="av-fab-label";bfl.textContent=formTitle;
      var bfi=document.createElement("div");bfi.className="av-fab-icon";bfi.appendChild(mkSvg(PATH_FORM));
      bf.appendChild(bfl);bf.appendChild(bfi);
      bf.onclick=function(){avOpenForm();};fab.appendChild(bf);
    }
    if(hasCall){
      var bc=document.createElement("div");bc.className="av-fab-btn av-fab-call";
      var bcl=document.createElement("div");bcl.className="av-fab-label";bcl.textContent=callLbl;
      var bci=document.createElement("div");bci.className="av-fab-icon";bci.appendChild(mkSvg(PATH_CALL));
      bc.appendChild(bcl);bc.appendChild(bci);
      bc.onclick=function(){avCall();};fab.appendChild(bc);
    }
    root.appendChild(fab);

    // 25s popup
    var popup=document.createElement("div");popup.className="av-ov";popup.id="av-popup";
    popup.onclick=function(e){if(e.target===popup)avClosePopup();};
    var pw=document.createElement("div");pw.className="av-popup";
    var ph=document.createElement("div");ph.className="av-handle";
    var pb=document.createElement("div");pb.className="av-popup-badge";pb.appendChild(mkPoly("20 6 9 17 4 12",36));
    var pt=document.createElement("div");pt.className="av-popup-title";pt.textContent="Interested in getting started?";
    var ps=document.createElement("div");ps.className="av-popup-sub";ps.textContent="Take 30 seconds to book a free consultation or call us directly.";
    pw.appendChild(ph);pw.appendChild(pb);pw.appendChild(pt);pw.appendChild(ps);
    if(hasCall){
      var pcb=document.createElement("button");pcb.className="av-popup-btn av-popup-call";
      pcb.appendChild(mkSvg(PATH_CALL,20));pcb.appendChild(document.createTextNode(" "+callLbl));
      pcb.onclick=function(){avCall();};pw.appendChild(pcb);
    }
    if(hasForm){
      var pfb=document.createElement("button");pfb.className="av-popup-btn av-popup-form";
      pfb.textContent=formTitle;pfb.onclick=function(){avOpenForm();avClosePopup();};pw.appendChild(pfb);
    }
    var pdm=document.createElement("div");pdm.className="av-popup-dismiss";pdm.textContent="Maybe later";
    pdm.onclick=function(){avClosePopup();};pw.appendChild(pdm);
    popup.appendChild(pw);root.appendChild(popup);

    // Form
    if(hasForm){
      var fo=document.createElement("div");fo.className="av-ov";fo.id="av-form-ov";
      fo.onclick=function(e){if(e.target===fo)avCloseForm();};
      var fw=document.createElement("div");fw.className="av-form";

      // Header
      var fh=document.createElement("div");fh.className="av-form-head";
      var fcb=document.createElement("button");fcb.className="av-form-close-btn";fcb.innerHTML="&#x2715;";fcb.onclick=function(){window.avCloseForm();};
      var fhi=document.createElement("div");fhi.className="av-form-head-icon";fhi.appendChild(mkSvg(PATH_FORM,24));
      var fht=document.createElement("div");fht.className="av-form-head-title";fht.textContent=formTitle;
      var fhs=document.createElement("div");fhs.className="av-form-head-sub";fhs.textContent="Fill in your details — we will reach out shortly";
      fh.appendChild(fcb);fh.appendChild(fhi);fh.appendChild(fht);fh.appendChild(fhs);

      // Fields
      var fb=document.createElement("div");fb.className="av-form-body";fb.id="av-form-body";
      fields.forEach(function(f){
        var fid="avf-"+f.id;
        var wrap=document.createElement("div");wrap.className="av-field";wrap.id=fid+"-wrap";
        var lbl=document.createElement("label");lbl.className="av-lbl";lbl.setAttribute("for",fid);
        lbl.textContent=f.label||"Field";
        if(f.required){var rq=document.createElement("span");rq.style.cssText="color:#ef4444;margin-left:2px";rq.textContent="*";lbl.appendChild(rq);}
        wrap.appendChild(lbl);
        var inp;
        if(f.type==="phone"){
          var pr=document.createElement("div");pr.className="av-phone-row";
          var cc=document.createElement("select");cc.className="av-cc";cc.id=fid+"-cc";cc.setAttribute("autocomplete","tel-country-code");
          [["+1","CA/US"],["+91","India"],["+44","UK"],["+61","AU"],["+92","PK"],["+971","UAE"],["+49","DE"],["+33","FR"],["+880","BD"]].forEach(function(o){var op=document.createElement("option");op.value=o[0];op.textContent=o[0]+" "+o[1];cc.appendChild(op);});
          inp=document.createElement("input");inp.type="tel";inp.id=fid;inp.className="av-inp av-phone-inp";
          inp.placeholder="416 555 0100";inp.maxLength=15;inp.setAttribute("inputmode","numeric");inp.setAttribute("autocomplete","tel-national");
          inp.oninput=function(){this.value=this.value.replace(/[^0-9 ()\-]/g,"");};
          pr.appendChild(cc);pr.appendChild(inp);wrap.appendChild(pr);inp=null;
        }else if(f.type==="email"){
          inp=document.createElement("input");inp.type="email";inp.id=fid;inp.className="av-inp";inp.placeholder=f.placeholder||"email@example.com";inp.setAttribute("autocomplete","email");inp.setAttribute("inputmode","email");
        }else if(f.type==="name"){
          inp=document.createElement("input");inp.type="text";inp.id=fid;inp.className="av-inp";inp.placeholder=f.placeholder||"Your full name";inp.setAttribute("autocomplete","name");inp.setAttribute("autocapitalize","words");
          inp.oninput=function(){this.value=this.value.replace(/[0-9!@#$%^&*()+={}\[\]|<>?\/\\]/g,"");};
        }else if(f.type==="dropdown"){
          inp=document.createElement("select");inp.id=fid;inp.className="av-inp";
          var dop=document.createElement("option");dop.value="";dop.textContent="Select an option";inp.appendChild(dop);
          (f.options||[]).forEach(function(o){var op=document.createElement("option");op.value=o;op.textContent=o;inp.appendChild(op);});
        }else if(f.type==="date"){
          inp=document.createElement("input");inp.type="date";inp.id=fid;inp.className="av-inp";inp.min=new Date().toISOString().slice(0,10);
        }else if(f.type==="time"){
          inp=document.createElement("input");inp.type="time";inp.id=fid;inp.className="av-inp";
        }else if(f.type==="textarea"){
          inp=document.createElement("textarea");inp.id=fid;inp.className="av-inp";inp.rows=3;inp.style.cssText="height:88px;resize:none;line-height:1.5";inp.placeholder=f.placeholder||"";
        }else{
          inp=document.createElement("input");inp.type="text";inp.id=fid;inp.className="av-inp";inp.placeholder=f.placeholder||"";
        }
        if(inp)wrap.appendChild(inp);
        var err=document.createElement("div");err.className="av-err";err.id=fid+"-err";wrap.appendChild(err);
        fb.appendChild(wrap);
      });

      var hp=document.createElement("input");hp.className="av-hp";hp.type="text";hp.id="av-hp";hp.tabIndex=-1;hp.setAttribute("autocomplete","off");hp.setAttribute("aria-hidden","true");fb.appendChild(hp);

      // Consent checkboxes (TCPA / CASL compliant)
      var consentWrap=document.createElement("div");consentWrap.style.cssText="padding:4px 0 12px";
      // Single consent row
      var row=document.createElement("label");row.style.cssText="display:flex;align-items:flex-start;gap:10px;cursor:pointer;font-family:-apple-system,sans-serif";
      var cb=document.createElement("input");cb.type="checkbox";cb.id="av-consent-all";cb.checked=true;
      cb.style.cssText="width:18px;height:18px;flex-shrink:0;accent-color:#C8102E;margin-top:2px;cursor:pointer";
      var lbl=document.createElement("span");lbl.style.cssText="font-size:12px;color:#64748b;line-height:1.6";
      lbl.textContent="I agree to receive SMS, emails and calls about my inquiry. Msg & data rates may apply. Reply STOP to opt out.";
      row.appendChild(cb);row.appendChild(lbl);consentWrap.appendChild(row);
      fb.appendChild(consentWrap);

      // Submit area
      var sa=document.createElement("div");sa.className="av-submit-area";
      var sbtn=document.createElement("button");sbtn.className="av-submit";sbtn.id="av-submit-btn";sbtn.textContent=formBtn;sbtn.onclick=function(){avSubmit();};
      var spn=document.createElement("div");spn.className="av-privacy";
      spn.innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> Your info is private and secure';
      sa.appendChild(sbtn);sa.appendChild(spn);

      // Success
      var succ=document.createElement("div");succ.className="av-success";succ.id="av-success";
      var sr=document.createElement("div");sr.className="av-success-ring";sr.appendChild(mkPoly("20 6 9 17 4 12",44));
      var sti=document.createElement("div");sti.className="av-success-title";sti.textContent="You are all set!";
      var ssu=document.createElement("div");ssu.className="av-success-sub";ssu.textContent="Thank you for reaching out. Our team will contact you very shortly.";
      succ.appendChild(sr);succ.appendChild(sti);succ.appendChild(ssu);
      if(hasCall){var cl=document.createElement("a");cl.href="tel:"+callNum;cl.className="av-call-link";cl.appendChild(mkSvg(PATH_CALL,18));cl.appendChild(document.createTextNode(" Call us now"));succ.appendChild(cl);}

      fw.appendChild(fh);fw.appendChild(fb);fw.appendChild(sa);fw.appendChild(succ);
      fo.appendChild(fw);root.appendChild(fo);
    }
    document.body.appendChild(root);
  }

  // Actions
  window.avCall=function(){if(!callNum)return;ins("click_events",{ad_id:UUID||null,client_id:clid||null,campaign_id:cid,cta_type:"call",clicked_at:new Date().toISOString()});window.location.href="tel:"+callNum;};
  window.avOpenForm=function(){var o=document.getElementById("av-form-ov");if(o)o.classList.add("open");ins("click_events",{ad_id:UUID||null,client_id:clid||null,campaign_id:cid,cta_type:"form",clicked_at:new Date().toISOString()});};
  window.avCloseForm=function(){var o=document.getElementById("av-form-ov");if(o)o.classList.remove("open");};
  window.avClosePopup=function(){var p=document.getElementById("av-popup");if(p)p.classList.remove("open");};

  // Validation
  function valEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);}
  function valPhone(v){var n=v.replace(/\D/g,"");return n.length>=6&&n.length<=15;}
  function showErr(id,msg){var e=document.getElementById(id+"-err"),i=document.getElementById(id);if(e){e.textContent=msg;e.style.display="block";}if(i)i.classList.add("invalid");}
  function clrErr(id){var e=document.getElementById(id+"-err"),i=document.getElementById(id);if(e)e.style.display="none";if(i)i.classList.remove("invalid");}

  async function isDup(phone,email){
    try{var q=U+"/rest/v1/leads?select=id";
    if(cid)q+="&campaign_id=eq."+cid;
    if(phone)q+="&phone=eq."+encodeURIComponent(phone);
    else if(email)q+="&email=eq."+encodeURIComponent(email);var r=await fetch(q,{headers:{apikey:K,"Authorization":"Bearer "+K}});if(r.ok){var d=await r.json();return d.length>0;}}catch(e){}return false;
  }

  window.avSubmit=async function(){
    var hp=document.getElementById("av-hp");if(hp&&hp.value.trim())return;
    var ok=true,data={};
    fields.forEach(function(f){
      var fid="avf-"+f.id;clrErr(fid);
      if(f.type==="phone"){
        var cc=(document.getElementById(fid+"-cc")||{value:"+1"}).value;
        var num=((document.getElementById(fid)||{value:""}).value||"").replace(/\D/g,"");
        if(f.required&&!num){showErr(fid,"Phone number is required");ok=false;return;}
        if(num&&!valPhone(num)){showErr(fid,"Please enter a valid phone number");ok=false;return;}
        if(num)data.phone=cc+num;
      }else if(f.type==="email"){
        var v=((document.getElementById(fid)||{value:""}).value||"").trim();
        if(f.required&&!v){showErr(fid,"Email address is required");ok=false;return;}
        if(v&&!valEmail(v)){showErr(fid,"Please enter a valid email address");ok=false;return;}
        if(v)data.email=v;
      }else if(f.type==="name"){
        var v=((document.getElementById(fid)||{value:""}).value||"").trim();
        if(f.required&&!v){showErr(fid,"Name is required");ok=false;return;}
        if(v&&/[0-9!@#$%^&*()+={}\[\]|<>?]/.test(v)){showErr(fid,"Name should only contain letters");ok=false;return;}
        if(v)data.name=v;
      }else{
        var v=((document.getElementById(fid)||{value:""}).value||"").trim();
        if(f.required&&!v){showErr(fid,(f.label||"This field")+" is required");ok=false;return;}
        if(v)data[f.id]=v;
      }
    });
    if(!ok){var fi=document.querySelector(".av-inp.invalid");if(fi)fi.scrollIntoView({block:"center",behavior:"smooth"});return;}
    var btn=document.getElementById("av-submit-btn");
    if(btn){btn.textContent="Checking...";btn.disabled=true;}
    var dup=await isDup(data.phone,data.email);
    if(dup){if(btn){btn.textContent=formBtn;btn.disabled=false;}alert("It looks like you have already submitted. We will be in touch shortly!");return;}
    if(btn)btn.textContent="Sending...";
    // Build lead record — campaign_id optional if not linked yet
    var consentEl = document.getElementById("av-consent-all");
    var leadRecord = Object.assign({
      client_id:      clid || null,
      campaign_id:    cid  || null,
      ad_id:          UUID || null,
      source:         utmSrc,
      stage:          "New",
      ai_call_status: "pending",
      submitted_at:   new Date().toISOString(),
      sms_consent:    consentEl ? consentEl.checked : false,
      email_consent:  consentEl ? consentEl.checked : false,
      ai_call_consent:consentEl ? consentEl.checked : false
    }, data);
    var saved = await ins("leads", leadRecord);
    console.log("[Adviuz] Lead saved:", saved, leadRecord);
    fetch(U+"/functions/v1/notify-lead",{method:"POST",headers:{apikey:K,"Content-Type":"application/json"},body:JSON.stringify({ad_id:UUID,name:data.name||"",phone:data.phone||""})}).catch(function(){});
    setTimeout(function(){
      if(btn){btn.textContent=formBtn;btn.disabled=false;}
      // Hide form body and submit area, show success
      var fb2=document.getElementById("av-form-body");if(fb2)fb2.style.display="none";
      var sa=document.querySelector(".av-submit-area");if(sa)sa.style.display="none";
      var succ=document.getElementById("av-success");
      if(succ){succ.style.display="block";succ.scrollIntoView({behavior:"smooth",block:"center"});}
    },600);
  };

  // Start timer immediately — before any async init
chk();
// Check pause status in background
if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",init);}else{init();}
})();
