// Cloudflare Pages Function — no-login VIDEO REVIEW page
//   https://hub.adviuz.ca/v/<code>     e.g. /v/maria-4f2a9c
// Each lead has ONE personal code (made by video_review_code() in the
// database; the playbook puts it in messages as {video_review_link}).
// The customer records a short selfie video right on this page (or picks one
// from their phone, or writes a few words instead). The video uploads
// straight into Adviuz's PRIVATE storage through a one-time link, and the
// business sees it in Adviuz Hub on the lead's screen.
// Data + saving: the video-review edge function. Link-preview crawlers
// (WhatsApp, iMessage, Facebook...) never count as an open.
const FN = 'https://crhvvfomwkrgwlnfruad.supabase.co/functions/v1/video-review';
const BOT = /bot|crawl|spider|preview|facebookexternalhit|whatsapp|slack|telegram|twitter|linkedin|discord|pinterest|skype|google-|bingpreview|embedly|quora|outbrain|vkshare|w3c_validator/i;

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
:root{--brand:#4000f3;--brand2:#e65afc;--bg:#f0f2f5;--card:#fff;--text:#0f172a;--sub:#64748b;--line:#e6eaf0;--green:#00a884;--red:#ef4444;--f:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif}
html,body{background:var(--bg);color:var(--text);font-family:var(--f);-webkit-font-smoothing:antialiased}
body{min-height:100vh;min-height:100dvh;padding:16px 16px calc(24px + env(safe-area-inset-bottom,0px))}
.wrap{max-width:480px;margin:0 auto}
.card{background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden}
.bar{height:5px;background:linear-gradient(90deg,var(--brand),var(--brand2))}
.head{padding:14px 20px;border-bottom:1px solid #eee;display:flex;align-items:center;min-height:48px}
.head img{height:16px;display:block}
.head b{font-size:15px;font-weight:800;letter-spacing:-.01em}
.body{padding:22px 20px 24px}
h1{font-size:21px;line-height:1.25;font-weight:800;letter-spacing:-.02em;margin-bottom:8px}
p{font-size:15px;line-height:1.55;color:#334155}
.muted{color:var(--sub);font-size:13px;line-height:1.5}
.tips{list-style:none;margin:16px 0 18px;padding:14px 16px;background:#f7f5ff;border-radius:14px;border:1px solid #ebe5ff}
.tips li{font-size:14px;line-height:1.5;color:#334155;padding:4px 0 4px 26px;position:relative}
.tips li b{position:absolute;left:0;top:4px;width:19px;height:19px;border-radius:50%;background:var(--brand);color:#fff;font-size:11px;display:flex;align-items:center;justify-content:center}
.btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:15px 16px;border-radius:14px;border:none;font-family:var(--f);font-size:16px;font-weight:700;cursor:pointer;text-decoration:none;-webkit-tap-highlight-color:transparent}
.btn:disabled{opacity:.5;cursor:default}
.btn-p{background:linear-gradient(90deg,var(--brand),#7b2cf6);color:#fff;box-shadow:0 6px 18px rgba(64,0,243,.25)}
.btn-s{background:#fff;color:var(--text);border:1.5px solid var(--line);margin-top:10px}
.btn-l{background:none;color:var(--brand);font-size:14px;font-weight:600;padding:12px;margin-top:4px}
.stage{position:relative;background:#000;border-radius:16px;overflow:hidden;aspect-ratio:3/4;width:100%}
.stage video{width:100%;height:100%;object-fit:cover;display:block;background:#000}
.stage .mirror{transform:scaleX(-1)}
.hud{position:absolute;left:0;right:0;top:0;padding:12px;display:flex;justify-content:space-between;align-items:flex-start;pointer-events:none}
.pill{pointer-events:auto;background:rgba(0,0,0,.55);color:#fff;font-size:13px;font-weight:700;padding:6px 11px;border-radius:20px;display:inline-flex;align-items:center;gap:6px;border:none;font-family:var(--f)}
.dot{width:9px;height:9px;border-radius:50%;background:var(--red);animation:blink 1s infinite}
@keyframes blink{50%{opacity:.25}}
.prompt{position:absolute;left:12px;right:12px;bottom:12px;background:rgba(0,0,0,.6);color:#fff;border-radius:12px;padding:10px 12px;font-size:14px;line-height:1.4;font-weight:600;text-align:center}
.ctrls{display:flex;align-items:center;justify-content:center;gap:28px;padding:18px 0 4px}
.rec{width:74px;height:74px;border-radius:50%;border:4px solid #fff;box-shadow:0 0 0 2px var(--line);background:var(--red);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .12s}
.rec:active{transform:scale(.94)}
.rec.on span{width:26px;height:26px;border-radius:6px;background:#fff;display:block}
.side{width:48px;height:48px;border-radius:50%;background:#f1f5f9;border:none;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.side[hidden]{visibility:hidden;display:flex}
label.fl{display:block;font-size:12px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:.05em;margin:16px 0 6px}
.inp{width:100%;padding:13px 14px;border:1.5px solid var(--line);border-radius:12px;font-size:16px;font-family:var(--f);color:var(--text);outline:none;background:#fff}
.inp:focus{border-color:var(--brand)}
textarea.inp{min-height:96px;resize:vertical;line-height:1.45}
.stars{display:flex;gap:6px}
.stars button{flex:1;font-size:30px;line-height:1;padding:8px 0;border-radius:12px;border:1.5px solid var(--line);background:#fff;color:#d1d5db;cursor:pointer}
.stars button.on{color:#f59e0b;border-color:#fde68a;background:#fffbeb}
.chk{display:flex;gap:12px;align-items:flex-start;margin-top:16px;padding:14px;border:1.5px solid var(--line);border-radius:12px;cursor:pointer}
.chk input{width:22px;height:22px;flex-shrink:0;margin-top:1px;accent-color:var(--brand)}
.chk span{font-size:14px;line-height:1.45;color:#334155}
.prog{height:10px;border-radius:6px;background:#eef2f7;overflow:hidden;margin:14px 0 8px}
.prog i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--brand),var(--brand2));transition:width .2s}
.err{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;border-radius:12px;padding:11px 13px;font-size:14px;line-height:1.45;margin-top:14px;display:none}
.err.show{display:block}
.big{font-size:52px;text-align:center;margin:6px 0 10px}
.center{text-align:center}
.foot{text-align:center;font-size:12px;color:var(--sub);margin-top:14px;line-height:1.6}
.foot a{color:var(--brand);text-decoration:none;font-weight:600}
[hidden]{display:none!important}
`;

// All client-side logic. Kept dependency-free and small; runs once per page.
const JS = `
(function(){
var D=window.__VR__||{}, FN=${JSON.stringify(FN)};
var $=function(id){return document.getElementById(id)};
var MAX_SEC=120, stream=null, rec=null, chunks=[], blob=null, blobMime='', dur=0, t0=0, tick=null, facing='user', rating=0, fileMode=false;
var PROMPTS=['Say your first name'+(D.house?' and your business':''),'What made you choose '+D.brand+'?','How did it go \\u2014 what changed for you?','Would you recommend '+D.brand+'? Why?'];
function show(id){['sIntro','sRec','sCheck','sForm','sUp','sDone','sOld'].forEach(function(k){var e=$(k);if(e)e.hidden=(k!==id)});window.scrollTo(0,0)}
function err(id,msg){var e=$(id);if(!e)return;e.textContent=msg||'';e.classList.toggle('show',!!msg)}
function stopStream(){if(stream){stream.getTracks().forEach(function(t){t.stop()});stream=null}}
function pickMime(){
  if(!window.MediaRecorder||!MediaRecorder.isTypeSupported)return '';
  var c=['video/mp4;codecs=avc1,mp4a','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  for(var i=0;i<c.length;i++){if(MediaRecorder.isTypeSupported(c[i]))return c[i]}
  return '';
}
async function openCam(){
  err('eRec','');
  stopStream();
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:facing,width:{ideal:1280},height:{ideal:720}},audio:{echoCancellation:true,noiseSuppression:true}});
  }catch(e){
    show('sIntro');
    err('eIntro','We couldn\\u2019t open your camera. Please allow camera and microphone access, or tap \\u201CUpload a video\\u201D to use your phone\\u2019s camera app instead.');
    return false;
  }
  var v=$('live');v.srcObject=stream;v.muted=true;v.classList.toggle('mirror',facing==='user');
  try{await v.play()}catch(_){}
  return true;
}
window.vrStart=async function(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||!pickMime()){ $('file').click(); return; }
  show('sRec'); $('recBtn').classList.remove('on'); $('timer').textContent='0:00 / 2:00'; $('recDot').hidden=true; $('prompt').textContent=PROMPTS[0];
  $('flip').hidden=false; $('cancel').hidden=false;
  await openCam();
};
window.vrFlip=async function(){ if(rec&&rec.state==='recording')return; facing=(facing==='user'?'environment':'user'); await openCam(); };
window.vrCancel=function(){ if(rec&&rec.state==='recording'){try{rec.onstop=null;rec.stop()}catch(_){}} clearInterval(tick); stopStream(); show('sIntro'); };
function fmt(s){s=Math.max(0,Math.floor(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
window.vrToggle=function(){
  if(rec&&rec.state==='recording'){ rec.stop(); return; }
  if(!stream)return;
  var mime=pickMime(); chunks=[];
  try{ rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2000000,audioBitsPerSecond:96000}); }
  catch(_){ try{ rec=new MediaRecorder(stream); }catch(e2){ err('eRec','Recording isn\\u2019t supported in this browser. Please tap Cancel and use \\u201CUpload a video\\u201D.'); return; } }
  blobMime=(rec.mimeType||mime||'video/webm').split(';')[0];
  rec.ondataavailable=function(e){ if(e.data&&e.data.size)chunks.push(e.data); };
  rec.onstop=function(){
    clearInterval(tick); dur=(Date.now()-t0)/1000;
    blob=new Blob(chunks,{type:blobMime}); stopStream(); fileMode=false;
    if(dur<3||blob.size<1000){ show('sIntro'); err('eIntro','That recording was too short. Please try again \\u2014 30 to 60 seconds is perfect.'); return; }
    var pv=$('playback'); pv.src=URL.createObjectURL(blob); pv.classList.toggle('mirror',false);
    $('checkLen').textContent=fmt(dur);
    show('sCheck');
  };
  rec.start(1000); t0=Date.now();
  $('recBtn').classList.add('on'); $('recDot').hidden=false; $('flip').hidden=true; $('cancel').hidden=true;
  var pi=0;
  tick=setInterval(function(){
    var s=(Date.now()-t0)/1000;
    $('timer').textContent=fmt(s)+' / 2:00';
    var np=Math.min(PROMPTS.length-1,Math.floor(s/12)); if(np!==pi){pi=np;$('prompt').textContent=PROMPTS[pi];}
    if(s>=MAX_SEC&&rec&&rec.state==='recording')rec.stop();
  },250);
};
window.vrRedo=function(){ blob=null; err('eIntro',''); if(fileMode){ $('file').value=''; $('file').click(); } else window.vrStart(); };
window.vrUse=function(){ $('formTitle').textContent='Almost done'; $('textLbl').textContent='Anything you\\u2019d like to add? (optional)'; show('sForm'); };
window.vrWrite=function(){ blob=null; $('formTitle').textContent='Write a quick review'; $('textLbl').textContent='Your review'; show('sForm'); setTimeout(function(){$('txt').focus()},50); };
function extMime(f){
  var t=(f.type||'').toLowerCase(); if(t.indexOf('video/')===0)return t;
  var e=(f.name.split('.').pop()||'').toLowerCase();
  return ({mp4:'video/mp4',m4v:'video/x-m4v',mov:'video/quicktime',webm:'video/webm','3gp':'video/3gpp',mkv:'video/x-matroska'})[e]||'';
}
window.vrFile=function(inp){
  var f=inp.files&&inp.files[0]; if(!f)return;
  err('eIntro','');
  var m=extMime(f);
  if(!m){ err('eIntro','Please pick a video file.'); return; }
  if(f.size>200*1024*1024){ err('eIntro','That video is too large. Please record a shorter one (under 2 minutes) \\u2014 tap \\u201CRecord a video\\u201D.'); return; }
  blob=f; blobMime=m; fileMode=true; dur=0;
  var pv=$('playback'); pv.classList.remove('mirror'); pv.src=URL.createObjectURL(f);
  pv.onloadedmetadata=function(){ dur=isFinite(pv.duration)?pv.duration:0; $('checkLen').textContent=dur?fmt(dur):''; };
  $('checkLen').textContent='';
  show('sCheck');
};
window.vrStar=function(n){ rating=n; var b=document.querySelectorAll('#stars button'); for(var i=0;i<b.length;i++)b[i].classList.toggle('on',i<n); };
async function post(body){
  var r=await fetch(FN,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({c:D.code},body))});
  var j={}; try{ j=await r.json(); }catch(_){}
  if(!r.ok||!j.ok) throw new Error(j.error||'Something went wrong. Please try again.');
  return j;
}
function putFile(url,file,mime){
  return new Promise(function(res,rej){
    var x=new XMLHttpRequest(); x.open('PUT',url);
    x.setRequestHeader('Content-Type',mime); x.setRequestHeader('x-upsert','false');
    x.upload.onprogress=function(e){ if(e.lengthComputable){ var p=Math.round(e.loaded/e.total*100); $('bar').style.width=p+'%'; $('pct').textContent=p+'%'; } };
    x.onload=function(){ (x.status>=200&&x.status<300)?res():rej(new Error(x.status===413?'That video is too large. Please record a shorter one here on this page.':'The upload didn\\u2019t finish. Please check your connection and try again.')); };
    x.onerror=function(){ rej(new Error('The upload didn\\u2019t finish. Please check your connection and try again.')); };
    x.send(file);
  });
}
window.vrSubmit=async function(){
  err('eForm','');
  var text=$('txt').value.trim(), name=$('nm').value.trim(), consent=$('ok').checked;
  if(!blob&&text.length<10){ err('eForm','Please write a few words (at least a sentence).'); return; }
  var btn=$('send'); btn.disabled=true;
  try{
    var path='';
    if(blob){
      show('sUp'); $('bar').style.width='0%'; $('pct').textContent='0%';
      var st=await post({action:'start',mime:blobMime,bytes:blob.size});
      await putFile(st.upload_url,blob,st.mime||blobMime);
      path=st.path;
    }
    await post({action:'finish',path:path,duration:Math.round(dur)||null,rating:rating||null,text:text,name:name,consent:consent});
    try{ var pv=$('playback'); pv.pause(); }catch(_){}
    show('sDone');
  }catch(e){
    show('sForm'); err('eForm',e.message||'Something went wrong. Please try again.');
  }finally{ btn.disabled=false; }
};
window.vrAgain=function(){ show('sIntro'); };
window.addEventListener('pagehide',stopStream);
if(D.state==='received')show('sOld'); else if(D.state==='done')show('sDone'); else show('sIntro');
})();
`;

function shell(title, desc, inner, data) {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
    + '<title>' + esc(title) + '</title>'
    + '<meta name="robots" content="noindex,nofollow">'
    + '<meta name="theme-color" content="#4000f3">'
    + '<meta property="og:title" content="' + esc(title) + '">'
    + '<meta property="og:description" content="' + esc(desc) + '">'
    + '<meta property="og:type" content="website">'
    + '<link rel="icon" href="/icon-192.png">'
    + '<style>' + CSS + '</style></head><body><div class="wrap">' + inner + '</div>'
    + (data ? '<script>window.__VR__=' + JSON.stringify(data).replace(/</g, '\\u003c') + ';</script><script>' + JST + '</script>' : '')
    + '</body></html>';
}
const JST = JS;

function header(d) {
  return '<div class="bar"></div><div class="head">'
    + (d && d.house ? '<img src="/brand/adviuz-logo-black.png" alt="Adviuz">' : '<b>' + esc(d && d.brand ? d.brand : '') + '</b>')
    + '</div>';
}
function note(d, heading, text) {
  return '<div class="card">' + header(d) + '<div class="body"><h1>' + heading + '</h1><p>' + text + '</p></div></div>';
}

function mainPage(d, code) {
  const brand = esc(d.brand);
  const hi = d.first_name ? 'Hi ' + esc(d.first_name) + ' 👋' : 'Hi there 👋';
  return '<div class="card">' + header(d) + '<div class="body">'
    // 1) Intro
    + '<div id="sIntro" hidden>'
    + '<h1>' + hi + '</h1>'
    + '<p>Would you share a quick video about your experience with <b>' + brand + '</b>? 30–60 seconds on your phone is perfect — no need to be polished.</p>'
    + '<ul class="tips"><li><b>1</b>Your first name' + (d.house ? ' and your business' : '') + '</li><li><b>2</b>Why you chose ' + brand + '</li><li><b>3</b>How it went — what changed for you</li><li><b>4</b>Would you recommend us?</li></ul>'
    + '<button class="btn btn-p" onclick="vrStart()">🎥 Record a video</button>'
    + '<button class="btn btn-s" onclick="document.getElementById(\'file\').click()">📁 Upload a video from my phone</button>'
    + '<button class="btn btn-l" onclick="vrWrite()">I’d rather write a few words</button>'
    + '<div class="err" id="eIntro"></div>'
    + '<input type="file" id="file" accept="video/*" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0" onchange="vrFile(this)">'
    + '</div>'
    // 2) Recorder
    + '<div id="sRec" hidden>'
    + '<div class="stage"><video id="live" playsinline autoplay muted class="mirror"></video>'
    + '<div class="hud"><span class="pill"><i class="dot" id="recDot" hidden></i><span id="timer">0:00 / 2:00</span></span><button class="pill" id="cancel" onclick="vrCancel()">✕ Cancel</button></div>'
    + '<div class="prompt" id="prompt"></div></div>'
    + '<div class="ctrls"><span class="side" hidden></span><button class="rec" id="recBtn" onclick="vrToggle()" aria-label="Start or stop recording"><span></span></button><button class="side" id="flip" onclick="vrFlip()" aria-label="Switch camera">🔄</button></div>'
    + '<p class="muted center">Tap the red button to start. Tap again to stop (2 minutes max).</p>'
    + '<div class="err" id="eRec"></div>'
    + '</div>'
    // 3) Check the video
    + '<div id="sCheck" hidden>'
    + '<h1>How does it look?</h1><p class="muted" style="margin-bottom:12px">Length: <span id="checkLen"></span></p>'
    + '<div class="stage"><video id="playback" playsinline controls></video></div>'
    + '<div style="height:14px"></div>'
    + '<button class="btn btn-p" onclick="vrUse()">✅ Use this video</button>'
    + '<button class="btn btn-s" onclick="vrRedo()">↺ Try again</button>'
    + '</div>'
    // 4) Details
    + '<div id="sForm" hidden>'
    + '<h1 id="formTitle">Almost done</h1>'
    + '<label class="fl">How would you rate ' + brand + '?</label>'
    + '<div class="stars" id="stars">' + [1, 2, 3, 4, 5].map((n) => '<button type="button" onclick="vrStar(' + n + ')" aria-label="' + n + ' star' + (n > 1 ? 's' : '') + '">★</button>').join('') + '</div>'
    + '<label class="fl" id="textLbl" for="txt">Anything you’d like to add? (optional)</label>'
    + '<textarea class="inp" id="txt" maxlength="3000" placeholder="A sentence or two is plenty"></textarea>'
    + '<label class="fl" for="nm">Your name as it should appear</label>'
    + '<input class="inp" id="nm" maxlength="80" autocomplete="name" value="' + esc(d.first_name || '') + '">'
    + '<label class="chk"><input type="checkbox" id="ok"><span>' + brand + ' may share my review on their website and social media.</span></label>'
    + '<div style="height:16px"></div>'
    + '<button class="btn btn-p" id="send" onclick="vrSubmit()">Send my review</button>'
    + '<div class="err" id="eForm"></div>'
    + '</div>'
    // 5) Uploading
    + '<div id="sUp" hidden class="center">'
    + '<div class="big">⬆️</div><h1>Sending your video…</h1>'
    + '<div class="prog"><i id="bar"></i></div><p class="muted"><span id="pct">0%</span> — please keep this page open.</p>'
    + '</div>'
    // 6) Done
    + '<div id="sDone" hidden class="center">'
    + '<div class="big">🙏</div><h1>Thank you' + (d.first_name ? ', ' + esc(d.first_name) : '') + '!</h1>'
    + '<p>Your review has been sent to ' + brand + '. It really means a lot.</p>'
    + '</div>'
    // 7) Already sent before
    + '<div id="sOld" hidden class="center">'
    + '<div class="big">🙏</div><h1>We already have your review</h1>'
    + '<p>Thank you' + (d.first_name ? ', ' + esc(d.first_name) : '') + '! If you’d like to replace it with a new one, you can.</p>'
    + '<div style="height:16px"></div><button class="btn btn-s" onclick="vrAgain()">Send a new one</button>'
    + '</div>'
    + '</div></div>'
    + '<div class="foot">Sent privately to ' + brand + '.' + (d.house ? '<br>Questions? <a href="tel:+16472501152">+1 647 250 1152</a>' : '') + '</div>';
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const parts = context.params.path;
  const code = String(Array.isArray(parts) ? parts[0] || '' : parts || '').toLowerCase();
  const headers = {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(self), microphone=(self)',
  };
  const bad = () => new Response(shell('Link not found', 'Share a quick video review.', note(null, 'This link doesn’t work', 'Please check the link in your message and try again.')), { status: 404, headers });
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(code) || code.length > 60) return bad();

  const ua = context.request.headers.get('user-agent') || '';
  const preview = url.searchParams.get('preview') === '1' || BOT.test(ua);
  let d = null;
  try {
    const r = await fetch(FN + '?c=' + encodeURIComponent(code) + (preview ? '&preview=1' : ''));
    d = await r.json();
  } catch (e) { d = null; }
  if (!d) return new Response(shell('Video review', 'Share a quick video review.', note(null, 'Something went wrong', 'We couldn’t load this page just now. Please try again in a minute.')), { status: 502, headers });
  if (!d.ok) return bad();

  const title = 'Share your experience with ' + d.brand;
  const desc = 'Record a quick 30-second video review — right from your phone.';
  if (d.state === 'done') {
    return new Response(shell(title, desc, note(d, 'Thank you' + (d.first_name ? ', ' + esc(d.first_name) : '') + '! 🙏', 'Your review has been received by ' + esc(d.brand) + '. It really means a lot.')), { status: 200, headers });
  }
  return new Response(shell(title, desc, mainPage(d, code), { code, brand: d.brand, first_name: d.first_name, house: !!d.house, state: d.state }), { status: 200, headers });
}
