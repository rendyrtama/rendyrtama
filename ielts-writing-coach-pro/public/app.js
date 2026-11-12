// Writing Coach for IELTS: page logic. Data and prompt code shared with the server live in core.js.
import {
  CRIT, BAND0, KEY_CRITERIA, T1TYPES, T2TYPES, GT_TYPES, ALLT1, BANK1, BANK1G, BANK2,
  T1_TIPS, T1_PARTS, T1_CHECK, T1_SAMPLE, T2_STRUCT, T2_COMMON_CHECK, T2_FLOW_END,
  LETTER_TIPS, LETTER_PARTS, LETTER_CHECK, LETTER_SAMPLE,
  isGT, typeOf, blueprint, critOf, typeLabel, blueprintHTML, blueprintText, checklistHTML, sentences, paragraphs, structureMeter,
  esc, words, roundBand, fmtBand, pick, store, fmtTime, fmtDate, LIMITS,
  renderVisual, describeVisual, rubric, FREE_TESTS, PACKAGES, rupiah
} from "./core.js";
import { legalHTML, footerHTML, LEGAL_PAGES } from "./legal.js";

/* ---------------- State ---------------- */
const $ = (s, r=document) => r.querySelector(s);
const app = $("#app");
const setup = Object.assign({module:"academic", showGuide:true, t1typeGT:"any", source:"random", mode:"both", timed:true, t1type:"any", t2type:"any", customTask:1, customText:"", customDesc:""}, store.get("iwc.setup", {}));
let customImage = null; // {blob, url}
let current = store.get("iwc.current", null);
let tick = null;
let view = "home";
let cfg = null, sb = null, session = null, me = null, bootError = null;
let pendingStart = null; // a test waiting for credits; started again after payment

/* ---------------- Server, sign-in and account ---------------- */
async function api(path, body, method){
  const headers = {"Content-Type":"application/json"};
  if (session?.access_token) headers.Authorization = "Bearer " + session.access_token;
  let r;
  try { r = await fetch(path, {method: method || (body ? "POST" : "GET"), headers, body: body ? JSON.stringify(body) : undefined}); }
  catch { throw {status:0, error:"No connection to the server. Check your internet and try again."}; }
  const data = await r.json().catch(()=>({}));
  if (!r.ok) throw {status:r.status, ...data, error: data.error || "Something went wrong on the server. Try again."};
  return data;
}
async function boot(){
  try {
    cfg = await api("/api/config");
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    const {data} = await sb.auth.getSession(); session = data.session;
    sb.auth.onAuthStateChange((_e, s) => { const changed = (s?.user?.id||null) !== (session?.user?.id||null); session = s; if (changed) refreshMe(); });
  } catch(e){ bootError = e?.error || "The app isn't fully set up yet: sign-in and payments are unavailable."; }
  await refreshMe();
}
async function refreshMe(){
  if (!session){ me = null; }
  else { try { me = await api("/api/me"); } catch(e){ me = null; if (e.status===401){ await sb.auth.signOut(); session = null; } } }
  renderAccount();
  if (view==="home") renderHome(); else if (view==="buy") renderBuy();
}
function signIn(){ if (sb) sb.auth.signInWithOAuth({provider:"google", options:{redirectTo: location.origin + location.pathname}}); }
async function signOut(){ if (sb) await sb.auth.signOut(); session = null; me = null; renderAccount(); nav("home"); }
function renderAccount(){
  const el = $("#account"); if (!el) return;
  if (!sb){ el.innerHTML = ""; return; }
  if (!session){ el.innerHTML = `<button class="btn small primary" id="signin">Sign in with Google</button>`; $("#signin").onclick = signIn; return; }
  el.innerHTML = `<span class="acct" title="${esc(session.user?.email||"")}"><b>${me?me.freeTests:"–"}</b> free · <b>${me?me.credits:"–"}</b> credits</span><button class="btn small" id="buybtn">Buy credits</button><button class="btn small ghost" id="signout">Sign out</button>`;
  $("#buybtn").onclick = () => nav("buy"); $("#signout").onclick = signOut;
}
function accountBanner(){
  if (bootError) return `<div class="banner warn" style="margin-top:18px">${esc(bootError)} You can still practise and read the structure guide.</div>`;
  if (!sb) return "";
  if (!session) return `<div class="banner info" style="margin-top:18px"><span><b>Your first ${FREE_TESTS} tests are free.</b> Sign in with Google to start a marked test.</span><button class="btn small primary" style="margin-left:auto" data-act="signin">Sign in with Google</button></div>`;
  if (!me) return "";
  return `<div class="banner info" style="margin-top:18px"><span>You have <b>${me.freeTests}</b> free test${me.freeTests===1?"":"s"} and <b>${me.credits}</b> credit${me.credits===1?"":"s"}. ${me.freeTests>0?"Your next test is free.":"A Task 1 or Task 2 test uses 1 credit; a full test uses 2."}</span><button class="btn small" style="margin-left:auto" data-act="buy">Buy credits</button></div>`;
}
/* Shrinks an uploaded picture to at most 1600 px and returns {mediaType, data(base64)}. */
async function imageForUpload(blob){
  const bmp = await createImageBitmap(blob); const s = Math.min(1, 1600/Math.max(bmp.width, bmp.height));
  const cv = document.createElement("canvas"); cv.width = Math.round(bmp.width*s); cv.height = Math.round(bmp.height*s);
  cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
  const out = await new Promise(r => cv.toBlob(r, "image/jpeg", 0.85));
  const buf = new Uint8Array(await out.arrayBuffer()); let bin = ""; for (let i=0;i<buf.length;i+=0x8000) bin += String.fromCharCode(...buf.subarray(i,i+0x8000));
  return {mediaType:"image/jpeg", data: btoa(bin)};
}

function saveSetup(){ const {customText,customDesc,...rest} = setup; store.set("iwc.setup", {...rest, customText, customDesc}); }
function saveCurrent(){ if (current) store.set("iwc.current", current); else store.del("iwc.current"); }
function history(){ return store.get("iwc.history", []); }

function nav(to){
  view = to;
  document.querySelectorAll("nav.tabs button").forEach(b=>b.setAttribute("aria-current", String(b.dataset.nav===(to==="result"?"history":to==="test"?"home":to))));
  if (tick && to!=="test"){ clearInterval(tick); tick=null; }
  window.scrollTo(0,0);
  if (to==="home") renderHome(); else if (to==="guide") renderGuide(); else if (to==="buy") renderBuy(); else if (to==="history") renderHistory(); else if (to==="desc") renderDesc(); else if (to==="test") renderTest(); else if (to==="result") renderResult();
  else if (to in LEGAL_PAGES){ app.innerHTML = legalHTML(to); if (location.pathname !== "/"+to) window.history.replaceState(null, "", "/"+to); return; }
  if ((location.hash && location.hash.slice(1) in LEGAL_PAGES) || location.pathname.replace(/^\/+|\/+$/g, "") in LEGAL_PAGES) window.history.replaceState(null, "", "/");
}
document.querySelectorAll("nav.tabs button").forEach(b=>b.addEventListener("click",()=>{ if (view==="test" && !confirmLeave()) return; nav(b.dataset.nav); }));
function confirmLeave(){ return true; } // drafts are autosaved; the test can be resumed from Practice

/* ---------------- Home ---------------- */
function segBtn(group, val, label, sub, cur){ return `<button type="button" data-g="${group}" data-v="${val}" aria-pressed="${cur===val}">${label}${sub?`<small>${sub}</small>`:""}</button>`; }
function renderHome(){
  const H = history();
  const mins = LIMITS[setup.mode];
  const random = setup.source==="random";
  const modeSeg = random
    ? [segBtn("mode","t1","Task 1 only",`${LIMITS.t1} min · 150+ words`,setup.mode),segBtn("mode","t2","Task 2 only",`${LIMITS.t2} min · 250+ words`,setup.mode),segBtn("mode","both","Full test",`${LIMITS.both} min · both tasks`,setup.mode)].join("")
    : [segBtn("customTask","1","Task 1 question",`${LIMITS.t1} min · 150+ words`,String(setup.customTask)),segBtn("customTask","2","Task 2 question",`${LIMITS.t2} min · 250+ words`,String(setup.customTask))].join("");
  const timeMins = random ? mins : (setup.customTask==1?LIMITS.t1:LIMITS.t2);
  app.innerHTML = `<main class="wrap"><div class="home">
   <section>
    <div class="hero"><div class="eyebrow">${setup.module==="general"?"General Training":"Academic"} Writing practice</div><h1>Sit a writing test, then get it marked band by band.</h1>
     <p>Pick a random exam-style question or paste one you found. Write against the clock, and Claude marks it on the four official criteria with corrections and a path to the next band.</p></div>
    ${current && !current.submitted ? `<div class="banner info" style="margin-top:18px"><span>You have an unfinished ${current.mode==="both"?"full test":current.mode==="t1"?"Task 1":"Task 2"} from ${fmtDate(current.startedAt)}.</span><span style="margin-left:auto;display:flex;gap:8px"><button class="btn small primary" id="resume">Resume</button><button class="btn small" id="discard">Discard</button></span></div>`:""}
    ${accountBanner()}
    <div class="panel setup" style="margin-top:20px">
     <div class="field"><span class="lbl">Test module</span><div class="seg">${segBtn("module","academic","Academic","Task 1: graph, chart, table, diagram, map",setup.module)}${segBtn("module","general","General Training","Task 1: letter",setup.module)}</div></div>
     <div class="field"><span class="lbl">Question source</span><div class="seg">${segBtn("source","random","Random question","from the practice bank",setup.source)}${segBtn("source","custom","My own question","paste a prompt you found",setup.source)}</div></div>
     <div class="field"><span class="lbl">${random?"What to practise":"Which task is it?"}</span><div class="seg">${modeSeg}</div></div>
     ${random && setup.mode!=="t2" ? (setup.module==="general"
       ? `<div class="field"><span class="lbl">Task 1 letter type</span><div class="chips">${[["any","Any (random)"],...Object.entries(GT_TYPES)].map(([k,l])=>`<button type="button" data-g="t1typeGT" data-v="${k}" aria-pressed="${setup.t1typeGT===k}">${l}</button>`).join("")}</div></div>`
       : `<div class="field"><span class="lbl">Task 1 type</span><div class="chips">${[["any","Any (random)"],...Object.entries(T1TYPES)].map(([k,l])=>`<button type="button" data-g="t1type" data-v="${k}" aria-pressed="${setup.t1type===k}">${l}</button>`).join("")}</div></div>`):""}
     ${random && setup.mode!=="t1" ? `<div class="field"><span class="lbl">Task 2 essay type</span><div class="chips">${[["any","Any (random)"],...Object.entries(T2TYPES)].map(([k,l])=>`<button type="button" data-g="t2type" data-v="${k}" aria-pressed="${setup.t2type===k}">${l}</button>`).join("")}</div></div>`:""}
     ${!random ? `<div class="field"><label for="ctext">Question text</label><textarea id="ctext" class="input" placeholder="${setup.customTask==1&&setup.module==="general"?"e.g. You recently stayed at a hotel and left a bag there. Write a letter to the hotel manager. In your letter • describe the bag… Begin your letter as follows: Dear Sir or Madam,":setup.customTask==1?"e.g. The chart below shows the percentage of people who used public libraries in four countries between 2000 and 2020. Summarise the information…":"e.g. Some people think that all teenagers should be required to do unpaid work in their free time. To what extent do you agree or disagree?"}">${esc(setup.customText)}</textarea></div>
       ${setup.customTask==1 && setup.module!=="general" ? `<div class="field"><span class="lbl">Chart, table, diagram or map</span>
         <div class="drop" id="drop">${customImage?`<img src="${customImage.url}" alt="Uploaded task visual">`:""}<div style="display:grid;gap:6px;flex:1;min-width:200px"><span class="muted" style="font-size:13px">Upload a screenshot or photo so the examiner can check your figures (PNG, JPG, WebP).</span><span style="display:flex;gap:8px;flex-wrap:wrap"><label class="btn small" for="cimg">${customImage?"Replace image":"Choose image"}</label>${customImage?`<button class="btn small" id="cimgx" type="button">Remove</button>`:""}</span><input type="file" id="cimg" accept="image/png,image/jpeg,image/webp,image/gif" hidden></div></div>
         <textarea id="cdesc" class="input" style="min-height:80px" placeholder="Optional: type the key figures (e.g. Canada 2000 = 45%, 2020 = 30%…). This helps the examiner judge accuracy.">${esc(setup.customDesc)}</textarea></div>`:""}`:""}
     <div class="field"><span class="lbl">Timing</span><div class="seg">${segBtn("timed","true","Exam timing",`${timeMins}:00 countdown`,String(setup.timed))}${segBtn("timed","false","No time limit","stopwatch only",String(setup.timed))}</div></div>
     <div class="field"><span class="lbl">Structure help</span><div class="seg">${segBtn("showGuide","true","Show structure while writing","blueprint + live paragraph check",String(setup.showGuide))}${segBtn("showGuide","false","Hide it","closer to the real exam",String(setup.showGuide))}</div></div>
     <div class="startrow"><button class="btn primary" id="start">${random?"Start test":"Start writing"}</button><span class="muted" style="font-size:13px" id="startmeta">${random?`${setup.mode==="both"?"Task 1 + Task 2":setup.mode==="t1"?"One Task 1 question":"One Task 2 question"} · ${setup.timed?timeMins+" minutes":"untimed"}`:"Your question · "+(setup.timed?timeMins+" minutes":"untimed")} · ${(random?setup.mode==="both":false)?"2 credits":"1 credit"} if your free tests are used</span></div>
     <div id="startmsg" class="muted" style="font-size:14px" aria-live="polite"></div>
    </div>
   </section>
   <aside class="side">
    <div class="panel"><div class="eyebrow">Your progress</div>${progressHTML(H)}</div>
    <div class="panel"><div class="eyebrow">How marking works</div>
     <ol class="steps"><li>Each task gets a whole band (0–9) on four criteria, matched against the official descriptors.</li><li>Task band = average of the four, rounded to the nearest half band.</li><li>Overall writing band: Task 2 counts twice as much as Task 1.</li><li>Under 150 / 250 words is penalised in Task Achievement / Response, as examiners do.</li></ol>
     <p class="muted" style="font-size:12px;margin:12px 0 0">Scores are estimates from an AI examiner (Claude), not official IELTS results.</p></div>
   </aside></div>
   <p class="foot">Practice questions are original and written in the style of common exam topics. All figures in charts, tables and maps are invented for practice. Not affiliated with or endorsed by IELTS, the British Council, IDP or Cambridge University Press &amp; Assessment.</p></main>`;
  app.querySelectorAll(".seg button,.chips button").forEach(b=>b.addEventListener("click",()=>{
    const g=b.dataset.g, v=b.dataset.v; setup[g] = (g==="timed"||g==="showGuide") ? v==="true" : g==="customTask" ? Number(v) : v; saveSetup(); renderHome();
  }));
  const ct=$("#ctext"); ct && ct.addEventListener("input",()=>{ setup.customText=ct.value; saveSetup(); });
  const cd=$("#cdesc"); cd && cd.addEventListener("input",()=>{ setup.customDesc=cd.value; saveSetup(); });
  const ci=$("#cimg"); ci && ci.addEventListener("change",()=>{ const f=ci.files[0]; if(!f) return; if(customImage) URL.revokeObjectURL(customImage.url); customImage={blob:f,url:URL.createObjectURL(f)}; renderHome(); });
  const cx=$("#cimgx"); cx && cx.addEventListener("click",()=>{ URL.revokeObjectURL(customImage.url); customImage=null; renderHome(); });
  const drop=$("#drop"); if (drop){ drop.addEventListener("dragover",e=>{e.preventDefault();}); drop.addEventListener("drop",e=>{ e.preventDefault(); const f=e.dataTransfer.files[0]; if(f && f.type.startsWith("image/")){ if(customImage) URL.revokeObjectURL(customImage.url); customImage={blob:f,url:URL.createObjectURL(f)}; renderHome(); } }); }
  $("#start").addEventListener("click", () => startTest());
  bindActs();
  const r=$("#resume"); r && r.addEventListener("click",()=>nav("test"));
  const d=$("#discard"); d && d.addEventListener("click",()=>{ current=null; saveCurrent(); renderHome(); });
  app.querySelectorAll(".hist").forEach(b=>b.addEventListener("click",()=>openHistory(b.dataset.id)));
}
function progressHTML(H){
  if (!H.length) return `<div class="empty">No marked tests yet. Your band scores, criterion averages and past essays will appear here after your first test.</div>`;
  const keys = [["TA/TR","Task Achievement / Response"],["CC","Coherence & Cohesion"],["LR","Lexical Resource"],["GRA","Grammar"]];
  const acc = {"TA/TR":[],CC:[],LR:[],GRA:[]};
  H.slice(0,10).forEach(h=>h.tasks.forEach(t=>t.result?.criteria?.forEach(c=>{ const k = (c.key==="TA"||c.key==="TR")?"TA/TR":c.key; if (acc[k] && typeof c.band==="number") acc[k].push(c.band); })));
  const avg = a => a.length ? a.reduce((x,y)=>x+y,0)/a.length : null;
  const rows = keys.map(([k,l])=>{ const a=avg(acc[k]); return `<div class="row"><span>${l}</span><div class="meter"><i style="width:${a?a/9*100:0}%"></i></div><b style="font-family:var(--f-mono);font-variant-numeric:tabular-nums">${a?a.toFixed(1):"–"}</b></div>`; }).join("");
  const weakest = keys.map(([k,l])=>[l,avg(acc[k])]).filter(x=>x[1]!=null).sort((a,b)=>a[1]-b[1])[0];
  return `<div class="critavg">${rows}</div>${weakest?`<p style="font-size:13px;margin:10px 0 0">Focus area: <b>${weakest[0]}</b> (average over your last ${Math.min(10,H.length)} tests).</p>`:""}
   <div class="hist-list">${H.slice(0,4).map(histRow).join("")}</div>${H.length>4?`<button class="btn small" style="margin-top:10px" onclick="document.getElementById('nav-history').click()">See all ${H.length} tests</button>`:""}`;
}
function histRow(h){
  const label = (h.module==="general"?"GT · ":"") + h.tasks.map(t=>typeLabel(t)?typeLabel(t).split(" (")[0]:`Task ${t.task} (own)`).join(" + ");
  return `<button class="hist" data-id="${h.id}"><span class="t">${esc(label)}</span>${h.tasks.some(t=>!t.result)?`<span class="bandchip unmarked">Not marked</span>`:`<span class="bandchip">${fmtBand(h.overall)}</span>`}<span class="d">${fmtDate(h.finishedAt)} · ${h.tasks.map(t=>`T${t.task} ${fmtBand(t.result?.taskBand)}`).join(" · ")}</span></button>`;
}

/* ---------------- Test ---------------- */
function buildDraft(){
  let tasks = [], mode;
  if (setup.source==="random"){
    mode = setup.mode;
    const recent = new Set(history().slice(0,15).flatMap(h=>h.tasks.map(t=>t.q.id)));
    const choose = (bank, type) => { let pool = bank.filter(q=>type==="any"||q.type===type); const fresh = pool.filter(q=>!recent.has(q.id)); return pick(fresh.length?fresh:pool); };
    if (mode!=="t2") tasks.push({task:1, q: setup.module==="general" ? choose(BANK1G, setup.t1typeGT) : choose(BANK1, setup.t1type), answer:""});
    if (mode!=="t1") tasks.push({task:2, q:choose(BANK2, setup.t2type), answer:""});
  } else {
    const text = setup.customText.trim();
    if (text.length<15){ const t=$("#ctext"); t.focus(); t.style.borderColor="var(--mark)"; t.placeholder="Paste or type the question first."; return null; }
    mode = setup.customTask==1 ? "t1" : "t2";
    tasks.push({task:setup.customTask, q:{id:"custom-"+Date.now(), custom:true, prompt:text, desc:setup.customTask==1?setup.customDesc.trim():"", hasImage: setup.customTask==1 && setup.module!=="general" && !!customImage}, answer:""});
  }
  tasks.forEach(t=>t.module=setup.module);
  return {module:setup.module, showGuide:setup.showGuide, mode, timed:setup.timed, tasks};
}
async function startTest(draft){
  draft = draft || buildDraft(); if (!draft) return;
  const msg = $("#startmsg");
  if (!sb){ if (msg) msg.textContent = bootError || "Sign-in isn't available right now."; return; }
  if (!session){ pendingStart = null; if (msg) msg.innerHTML = `Sign in first. <button class="btn small primary" data-act="signin">Sign in with Google</button>`; bindActs(); return; }
  const btn = $("#start"); if (btn){ btn.disabled = true; btn.textContent = "Starting…"; }
  try {
    const r = await api("/api/start", {module:draft.module, mode:draft.mode, tasks: draft.tasks.map(t => t.q.custom ? {task:t.task, custom:{prompt:t.q.prompt, desc:t.q.desc, hasImage:t.q.hasImage}} : {task:t.task, qid:t.q.id})});
    me = {...(me||{}), freeTests:r.freeTests, credits:r.credits}; renderAccount(); pendingStart = null;
    current = {id:"t"+Date.now(), testId:r.testId, paidWith:r.paidWith, ...draft, limit:LIMITS[draft.mode]*60, startedAt:Date.now(), active:0, submitted:false};
    saveCurrent(); nav("test");
  } catch(e){
    if (btn){ btn.disabled = false; btn.textContent = setup.source==="random"?"Start test":"Start writing"; }
    if (e.status===402){ me = {...(me||{}), freeTests:e.freeTests, credits:e.credits}; renderAccount(); pendingStart = draft; nav("buy"); return; }
    if (msg) msg.textContent = e.error;
  }
}
function guidePanelHTML(t,i){
  const bp = blueprint(t), ty = typeOf(t);
  const chooser = t.q.custom ? `<label style="display:flex;gap:8px;align-items:center;font-size:13px;margin-bottom:10px">Question type <select class="input" style="width:auto;padding:4px 8px" data-gtype="${i}">${Object.entries(t.task===1?(isGT(t)?GT_TYPES:T1TYPES):T2TYPES).map(([k,l])=>`<option value="${k}" ${k===ty?"selected":""}>${l}</option>`).join("")}</select></label>` : "";
  const tips = bp.tip ? `<div class="tips"><div><b>Approach:</b> ${bp.tip.approach==="Comparison"?"make comparisons":"describe stages/changes in order"}.</div><div><b>Useful language:</b> ${bp.tip.phrases.map(esc).join(" · ")}</div></div>`
    : bp.letter ? `<div class="tips"><div><b>Tone:</b> ${esc(bp.letter.tone)}</div><div><b>Open / close:</b> ${esc(bp.letter.greet)} → ${esc(bp.letter.close)}</div></div>`
    : `${bp.note?`<div class="tips"><div>${esc(bp.note)}</div></div>`:""}<div class="tips"><div><b>Plan first:</b></div></div><ul class="flow" style="margin-top:6px">${[...bp.flow,...T2_FLOW_END].map(f=>`<li>${esc(f)}</li>`).join("")}</ul>`;
  return `<details class="guide" open><summary>Recommended structure · ${esc(bp.label||"")}</summary>${chooser}${blueprintHTML(bp.parts)}${tips}
    <details style="margin-top:12px"><summary style="cursor:pointer;font-size:13px;font-weight:600">Checklist before you submit</summary><div style="margin-top:8px">${checklistHTML(bp.check,"ck"+i)}</div></details></details>`;
}
function renderTest(){
  if (!current){ nav("home"); return; }
  const c = current;
  app.innerHTML = `<div class="testbar"><div class="wrap">
     <div><div class="timer" id="timer">--:--</div></div>
     <div class="timer-sub" id="tsub"></div>
     ${c.tasks.length>1?`<div class="tasktabs" role="tablist">${c.tasks.map((t,i)=>`<button role="tab" data-i="${i}" aria-current="${c.active===i}">Task ${t.task} <small id="tw${i}">${words(t.answer)}w</small></button>`).join("")}</div>`:`<div style="margin-left:auto"></div>`}
     <button class="btn primary" id="submit">Submit for marking</button>
   </div></div>
   <main class="wrap" style="padding-top:0">
     <div id="tup"></div>
     ${c.tasks.map((t,i)=>{ const r=rubric(t); return `<div class="desk" data-pane="${i}" ${c.active===i?"":"hidden"}>
       <section class="qpaper"><div class="eyebrow">${r.head}${typeLabel(t)?` · ${typeLabel(t)}`:" · your question"}</div>
         <p class="rubric">${r.spend}</p>${r.pre?`<p class="rubric" style="margin-bottom:0">${r.pre}</p>`:""}
         <div class="prompt">${esc(t.q.prompt)}</div>
         ${t.task===1&&!t.q.custom?`<p class="req">${r.req}</p>`:""}${t.task===2&&!t.q.custom?`<p class="req">${r.req}</p>`:""}<p class="req">${r.min}</p>
         ${t.q.visual?`<div class="visual">${renderVisual(t.q.visual)}</div>`:""}
         ${t.q.custom && t.q.hasImage && customImage?`<div class="visual"><img src="${customImage.url}" alt="Task visual you uploaded" style="border-radius:8px;border:1px solid var(--line)"></div>`:""}
         ${t.q.custom && t.q.desc?`<div class="visual"><div class="vt" style="text-align:left">Key data you entered</div><div style="white-space:pre-wrap;font-size:14px">${esc(t.q.desc)}</div></div>`:""}
         ${c.showGuide!==false?guidePanelHTML(t,i):""}
       </section>
       <section class="sheet"><div class="sheet-head"><span class="eyebrow">Answer sheet · Task ${t.task}</span><span class="wc" id="wc${i}"></span></div>
         ${c.showGuide!==false?`<div class="smeter" id="sm${i}" aria-live="polite"></div>`:""}
         <textarea class="answer" id="ans${i}" spellcheck="false" autocomplete="off" aria-label="Your answer for Task ${t.task}" placeholder="Start writing here…">${esc(t.answer)}</textarea></section>
     </div>`; }).join("")}
     <p class="foot">Spell-check is off, as in the real test. Your writing is saved in this browser as you type.</p>
   </main>`;
  c.tasks.forEach((t,i)=>{
    const ta=$("#ans"+i);
    const upd=()=>{ t.answer=ta.value; const n=words(ta.value), tgt=rubric(t).target; const el=$("#wc"+i); el.className="wc "+(n>=tgt?"okc":"short"); el.innerHTML=`<b>${n}</b> / ${tgt} words`; const tw=$("#tw"+i); if(tw) tw.textContent=n+"w"; const sm=$("#sm"+i); if(sm) sm.innerHTML=`<span style="border:0;padding-left:0">Paragraphs (one per line):</span>`+structureMeter(t); };
    upd(); ta.addEventListener("input",()=>{ upd(); saveCurrent(); });
  });
  app.querySelectorAll(".tasktabs button").forEach(b=>b.addEventListener("click",()=>{ c.active=Number(b.dataset.i); saveCurrent();
    app.querySelectorAll(".tasktabs button").forEach(x=>x.setAttribute("aria-current",String(x===b))); app.querySelectorAll("[data-pane]").forEach(p=>p.hidden = Number(p.dataset.pane)!==c.active); }));
  $("#submit").addEventListener("click", submitTest);
  app.querySelectorAll("[data-gtype]").forEach(sel=>sel.addEventListener("change",()=>{ const t=c.tasks[Number(sel.dataset.gtype)]; t.q.guessType=sel.value; saveCurrent(); renderTest(); }));
  if (tick) clearInterval(tick);
  const update = () => {
    const el=$("#timer"); if(!el){ clearInterval(tick); tick=null; return; }
    const elapsed=(Date.now()-c.startedAt)/1000;
    if (!c.timed){ el.textContent=fmtTime(elapsed); $("#tsub").textContent="Untimed · elapsed"; return; }
    const left=c.limit-elapsed;
    el.textContent=fmtTime(left);
    el.className="timer"+(left<=0?" out":left<=300?" low":"");
    const s=$("#tsub");
    if (c.mode==="both") s.textContent = elapsed<20*60 ? "Suggested: move to Task 2 at 30:00 left" : "Remaining for both tasks";
    else s.textContent="Remaining";
    if (left<=0 && !c.timeUp){ c.timeUp=true; saveCurrent(); }
    if (c.timeUp && !c.overtime){ c.tasks.forEach((_,i)=>{ const ta=$("#ans"+i); if(ta) ta.readOnly=true; });
      const tu=$("#tup"); if (tu && !tu.firstChild){ tu.innerHTML=`<div class="banner bad" style="margin-top:16px"><b>Time is up.</b><span>Stop writing, as you would in the exam, and submit for marking.</span><span style="margin-left:auto;display:flex;gap:8px"><button class="btn small primary" id="sub2">Submit now</button><button class="btn small" id="ovt">Keep writing (not exam rules)</button></span></div>`;
        $("#sub2").onclick=submitTest; $("#ovt").onclick=()=>{ c.overtime=true; saveCurrent(); tu.innerHTML=""; c.tasks.forEach((_,i)=>{ const ta=$("#ans"+i); if(ta) ta.readOnly=false; }); }; } }
  };
  update(); tick=setInterval(update, 500);
}

/* ---------------- Marking ---------------- */
let resultCtx = null; // {test, results:[{status, data, error}], historyId}
async function submitTest(){
  if (!current) return;
  const c = current;
  if (c.tasks.every(t=>!t.answer.trim())){ const tu=$("#tup"); tu.innerHTML=`<div class="banner warn" style="margin-top:16px">Both answer sheets are empty. Write something before submitting.</div>`; return; }
  c.submitted = true; c.finishedAt = Date.now(); c.elapsed = Math.round((c.finishedAt-c.startedAt)/1000);
  const test = JSON.parse(JSON.stringify(c));
  let img = null;
  if (customImage && test.tasks.some(t=>t.q.hasImage)) { try { img = await imageForUpload(customImage.blob); } catch { img = null; } }
  current = null; saveCurrent();
  resultCtx = {test, results: test.tasks.map(()=>({status:"pending"})), historyId:null, img, models:[]};
  nav("result");
  test.tasks.forEach((t,i)=>gradeTask(i));
}
async function gradeTask(i){
  const ctx = resultCtx, t = ctx.test.tasks[i], slot = ctx.results[i];
  slot.status="pending"; slot.error=null; renderResult();
  try {
    const body = {testId:ctx.test.testId, index:i, answer:t.answer, guessType:t.q.guessType};
    if (t.q.hasImage && ctx.img) body.image = ctx.img;
    const r = await api("/api/grade", body);
    slot.status="done"; slot.data=r.result;
  } catch(e){
    slot.status="error";
    slot.error = e.status===401 ? "Your sign-in has expired. Sign in again, then use Try again." : (e.error || "Marking failed because of a connection problem. Try again.");
  }
  maybeSaveHistory(); renderResult();
}
function overallOf(test, results){
  const bands = test.tasks.map((t,i)=>results[i]?.data?.taskBand);
  if (bands.some(b=>b==null)) return null;
  if (test.tasks.length===1) return bands[0];
  const t1 = bands[test.tasks.findIndex(t=>t.task===1)], t2 = bands[test.tasks.findIndex(t=>t.task===2)];
  return roundBand((t1 + 2*t2)/3);
}
function maybeSaveHistory(){
  // Save as soon as no task is still being marked, including tasks whose marking failed,
  // so the user can reopen the test from History and press "Try again" later.
  const ctx = resultCtx; if (!ctx) return;
  if (ctx.results.some(r=>r.status==="pending")) return;
  const H = history();
  const entry = {id:ctx.test.id, testId:ctx.test.testId, module:ctx.test.module||"academic", mode:ctx.test.mode, timed:ctx.test.timed, elapsed:ctx.test.elapsed, finishedAt:ctx.test.finishedAt, overall:overallOf(ctx.test, ctx.results),
    tasks: ctx.test.tasks.map((t,i)=>({task:t.task, module:t.module, q:t.q, answer:t.answer, result:ctx.results[i].status==="done" ? ctx.results[i].data : null, model:(ctx.models||[])[i]?.text}))};
  const ix = H.findIndex(h=>h.id===entry.id); if (ix>=0) H[ix]=entry; else H.unshift(entry);
  store.set("iwc.history", H.slice(0,60));
}
function openHistory(id){
  const h = history().find(x=>x.id===id); if (!h) return;
  resultCtx = {fromHistory:true, test:{id:h.id, testId:h.testId, module:h.module, mode:h.mode, timed:h.timed, elapsed:h.elapsed, finishedAt:h.finishedAt, tasks:h.tasks.map(t=>({task:t.task,module:t.module||h.module,q:t.q,answer:t.answer}))}, results:h.tasks.map(t=>t.result ? {status:"done", data:t.result} : {status:"error", error:"This task hasn't been marked yet. Press Try again to mark it (no extra charge)."}), models:h.tasks.map(t=>t.model?{text:t.model}:null)};
  nav("result");
}
function highlightEssay(text, corrections){
  let html = esc(text);
  (corrections||[]).forEach((c,ix)=>{
    const o = String(c.original||"").trim(); if (o.length<2) return;
    const eo = esc(o); const pos = html.indexOf(eo); if (pos<0) return;
    // skip if inside an existing mark tag
    const before = html.slice(0,pos); if ((before.match(/<mark/g)||[]).length !== (before.match(/<\/mark>/g)||[]).length) return;
    html = before + `<mark class="err" title="${esc((c.corrected?"→ "+c.corrected+" · ":"")+(c.why||""))}">${eo}<sup style="font-family:var(--f-mono);font-size:10px;color:var(--mark)">${ix+1}</sup></mark>` + html.slice(pos+eo.length);
  });
  return html;
}
function renderResult(){
  const ctx = resultCtx; if (!ctx){ nav("home"); return; }
  const {test, results} = ctx;
  const overall = overallOf(test, results);
  const done = results.filter(r=>r.status==="done").length;
  const scroll = window.scrollY;
  app.innerHTML = `<main class="wrap">
   <div class="panel res-head">
     <div class="bigband"><small>${test.tasks.length>1?"Overall writing band":"Task "+test.tasks[0].task+" band"}</small>${overall!=null?fmtBand(overall):results.some(r=>r.status==="pending")?`<span class="spinner" style="width:40px;height:40px;border-width:4px"></span>`:"–"}</div>
     <div style="display:grid;gap:6px;min-width:0">
       <div class="eyebrow">${fmtDate(test.finishedAt)} · ${test.timed?"timed":"untimed"} · ${fmtTime(test.elapsed||0)} used</div>
       <h2 style="font-size:22px">${overall!=null ? bandWord(overall) : results.some(r=>r.status==="pending") ? `Marking ${test.tasks.length>1?"both tasks":"your answer"}… ${done}/${test.tasks.length} done` : "Marking incomplete"}</h2>
       ${test.tasks.length>1?`<div class="muted" style="font-size:14px">${test.tasks.map((t,i)=>`Task ${t.task}: <b style="font-family:var(--f-mono);color:var(--ink)">${fmtBand(results[i].data?.taskBand)}</b>`).join(" · ")} · Task 2 is weighted double.</div>`:""}
       <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px"><button class="btn small primary" id="again">New test</button><button class="btn small" id="tohist">All results</button></div>
     </div>
   </div>
   ${test.tasks.map((t,i)=>taskResultHTML(t,i,results[i])).join("")}
  </main>`;
  window.scrollTo(0, scroll);
  $("#again").onclick=()=>nav("home"); $("#tohist").onclick=()=>nav("history");
  app.querySelectorAll("[data-retry]").forEach(b=>b.onclick=()=>gradeTask(Number(b.dataset.retry)));
  app.querySelectorAll("[data-model]").forEach(b=>b.onclick=()=>modelAnswer(Number(b.dataset.model)));
  // restore model answers already produced
  (ctx.models||[]).forEach((m,i)=>{ if(m){ const el=$("#model"+i); if(el){ el.hidden=false; el.querySelector(".model").textContent=m.text; const b=app.querySelector(`[data-model="${i}"]`); if(b) b.hidden=true; } } });
}
function bandWord(b){ return b>=8.5?"Expert user":b>=7.5?"Very good user":b>=6.5?"Good user":b>=5.5?"Competent user":b>=4.5?"Modest user":b>=3.5?"Limited user":"Extremely limited user"; }
function taskResultHTML(t, i, r){
  const crit = critOf(t), n = words(t.answer), tgt = rubric(t).target;
  const head = `<div class="tr-head"><div style="min-width:0"><div class="eyebrow">Writing Task ${t.task}${typeLabel(t)?" · "+typeLabel(t):" · your question"}</div>
     <details class="q" style="margin-top:6px"><summary>${esc(t.q.prompt.split("\n")[0].slice(0,110))}${t.q.prompt.length>110?"…":""}</summary><div class="prompt" style="font-family:var(--f-serif);white-space:pre-wrap;margin-top:8px">${esc(t.q.prompt)}</div>${t.q.visual?`<div class="visual">${renderVisual(t.q.visual)}</div>`:""}</details></div>
     <div style="text-align:right"><div class="tr-band">${r.status==="done"?fmtBand(r.data.taskBand):"–"}</div><div class="wc ${n>=tgt?"okc":"short"}"><b>${n}</b> words${n<tgt?` · under ${tgt}`:""}</div></div></div>`;
  if (r.status==="pending") return `<section class="taskres"><div class="panel">${head}<div class="banner info"><span class="spinner"></span> The examiner is reading your answer against the Task ${t.task} descriptors. This usually takes 30–90 seconds.</div></div></section>`;
  if (r.status==="error") return `<section class="taskres"><div class="panel">${head}<div class="banner bad"><span>${esc(r.error)}</span><button class="btn small" style="margin-left:auto" data-retry="${i}">Try again</button></div><div><div class="eyebrow" style="margin-bottom:8px">Your answer</div><div class="essay">${esc(t.answer)}</div></div></div></section>`;
  const d = r.data;
  return `<section class="taskres"><div class="panel">${head}
    ${d.overallComment?`<p style="margin:0;font-size:15px;max-width:80ch">${esc(d.overallComment)}</p>`:""}
    <div class="crit">${d.criteria.map((c,ci)=>`<div class="c"><div class="c-top"><h3>${crit[ci].name}</h3><b>${c.band}</b></div>
       <div class="ticks" aria-hidden="true">${[1,2,3,4,5,6,7,8,9].map(k=>`<i class="${k<=c.band?"on":""}"></i>`).join("")}</div>
       <p>${esc(c.summary)}</p>${Array.isArray(c.evidence)&&c.evidence.length?`<ul>${c.evidence.slice(0,4).map(e=>`<li>${esc(e)}</li>`).join("")}</ul>`:""}
       ${c.toNextBand && c.band<9?`<div class="next"><b>To reach band ${c.band+1}:</b> ${esc(c.toNextBand)}</div>`:""}
       <details><summary class="muted" style="font-size:12px;cursor:pointer">Band ${c.band} descriptor</summary><p class="muted" style="font-size:12px;margin-top:6px">${esc(crit[ci].d[c.band]||BAND0)}</p></details></div>`).join("")}</div>
    ${structureResultHTML(t, d)}
    <div class="cols2">
      <div class="listbox"><h3>What worked</h3><ul>${(d.strengths||[]).map(s=>`<li>${esc(s)}</li>`).join("")||"<li class='muted'>None noted.</li>"}</ul></div>
      <div class="listbox"><h3>Fix these first</h3><ol>${(d.priorities||[]).map(s=>`<li>${esc(s)}</li>`).join("")||"<li class='muted'>None noted.</li>"}</ol></div>
    </div>
    <div><div class="eyebrow" style="margin-bottom:8px">Your answer, marked${(d.corrections||[]).length?" · hover a highlight to see the fix":""}</div><div class="essay">${highlightEssay(t.answer, d.corrections)}</div></div>
    ${(d.corrections||[]).length?`<div><div class="eyebrow" style="margin-bottom:8px">Corrections</div><div class="corr">${d.corrections.map((c,ci)=>`<div class="row"><div><span class="tag">${ci+1} · ${esc(c.type||"error")}</span><span class="from">${esc(c.original)}</span></div><div class="to">${esc(c.corrected)}</div>${c.why?`<div class="why">${esc(c.why)}</div>`:""}</div>`).join("")}</div></div>`:""}
    ${(d.upgrades||[]).length?`<div><div class="eyebrow" style="margin-bottom:8px">Vocabulary upgrades</div><div class="corr">${d.upgrades.map(c=>`<div class="row"><div><span class="tag">instead of</span><span style="font-family:var(--f-serif)">${esc(c.original)}</span></div><div class="to">${esc(c.better)}</div>${c.why?`<div class="why">${esc(c.why)}</div>`:""}</div>`).join("")}</div></div>`:""}
    <div><button class="btn" data-model="${i}">Show a band 9 model answer (1 included)</button>
      <div id="model${i}" hidden style="margin-top:14px"><div class="eyebrow" style="margin-bottom:8px">Model answer</div><div class="model"></div></div></div>
  </div></section>`;
}
function structureResultHTML(t, d){
  const bp = blueprint(t), st = d.structure, paras = paragraphs(t.answer);
  const rows = bp.parts.map((p,pi)=>{ const g = (st?.parts||[]).find(x=>String(x.part).toLowerCase()===p.name.toLowerCase()) || st?.parts?.[pi] || {};
    const status = ["yes","partial","no"].includes(g.status) ? g.status : null; const n = paras[pi] ? sentences(paras[pi]) : 0;
    return `<div class="row" style="grid-template-columns:minmax(0,1fr)"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b style="font-size:14px">${esc(p.name)}</b>${status?`<span class="stat ${status}">${status==="yes"?"In place":status==="partial"?"Partly":"Missing"}</span>`:""}<span class="muted" style="font-size:12px;font-family:var(--f-mono)">${n?n+" sentence"+(n>1?"s":""):"no paragraph"} · aim ${esc(p.sent)}</span></div>${g.note?`<div class="why">${esc(g.note)}</div>`:""}</div>`; }).join("");
  return `<div><div class="eyebrow" style="margin-bottom:8px">Structure check · ${esc(bp.label||"")} <span class="muted" style="text-transform:none;letter-spacing:0;font-weight:400">(study advice; it does not change your band)</span></div>${st?.comment?`<p style="margin:0 0 10px;font-size:14px">${esc(st.comment)}</p>`:""}<div class="corr">${rows}</div></div>`;
}
async function modelAnswer(i){
  const ctx = resultCtx, t = ctx.test.tasks[i];
  ctx.models = ctx.models || [];
  const box = $("#model"+i), out = box.querySelector(".model"), btn = app.querySelector(`[data-model="${i}"]`);
  box.hidden=false; out.innerHTML=`<span class="spinner"></span> Writing a model answer… this takes about 30–60 seconds.`; btn.disabled=true;
  try {
    const body = {testId:ctx.test.testId, index:i};
    if (t.q.hasImage && ctx.img) body.image = ctx.img;
    const r = await api("/api/model-answer", body);
    out.textContent = r.text; ctx.models[i] = {text:r.text}; btn.hidden = true;
    const H = history(), h = H.find(x=>x.id===ctx.test.id); if (h){ h.tasks[i].model = r.text; store.set("iwc.history", H); }
  } catch(e){ out.textContent = e.error || "Couldn't write a model answer this time. Try again."; btn.disabled = e.status===409; }
}

/* ---------------- Structure guide ---------------- */
const guideState = {task:"t1ac", t1:"line", t2:"opinion"};
function renderGuide(){
  const g = guideState, tabs = [["t1ac","Task 1 · Academic"],["t1gt","Task 1 · General Training"],["t2","Task 2 · Essays"]];
  let body = "";
  if (g.task==="t1ac"){
    const tip = T1_TIPS[g.t1], parts = T1_PARTS(tip), sq = BANK1.find(q=>q.id===T1_SAMPLE.q);
    body = `<div class="chips" style="margin-bottom:16px">${Object.entries(T1TYPES).map(([k,l])=>`<button type="button" data-gt1="${k}" aria-pressed="${g.t1===k}">${l}</button>`).join("")}</div>
     <div class="guide-grid"><section class="panel"><div class="eyebrow">Structure · ${T1TYPES[g.t1]} · at least 150 words</div><h2 style="font-size:20px;margin:6px 0 14px">Intro 1 · Overview 2 · Body 3–4 · Body 3–4</h2>${blueprintHTML(parts)}
       <div class="tips"><div><b>Approach for ${T1TYPES[g.t1].toLowerCase()}:</b> ${tip.approach==="Comparison"?"comparison: group similar data and compare, don't list every number.":"description: report stages or changes in a logical order, mostly in the passive voice."}</div><div><b>Useful language:</b> ${tip.phrases.map(esc).join(" · ")}</div></div></section>
      <section class="panel"><div class="eyebrow">Worked example · line graph</div><p class="muted" style="font-size:13px;margin:6px 0 10px">${esc(sq.prompt)}</p>
       <div class="sample-essay">${T1_SAMPLE.parts.map(([l,txt],ix)=>`<span class="lbl" style="color:var(--r-${["frame","op","a","b"][ix]})">${l}${ix===0?" · 1 sentence":ix===1?" · 2 sentences":" · "+sentences(txt)+" sentences"}</span><p>${esc(txt)}</p>`).join("")}</div>
       <p class="muted" style="font-size:12px;margin-top:10px">${words(T1_SAMPLE.parts.map(x=>x[1]).join(" "))} words</p></section></div>
     <section class="panel" style="margin-top:20px"><div class="eyebrow" style="margin-bottom:10px">Checklist</div>${checklistHTML(T1_CHECK,"g1c")}</section>`;
  } else if (g.task==="t1gt"){
    const sq = BANK1G.find(q=>q.id===LETTER_SAMPLE.q);
    body = `<div class="guide-grid"><section class="panel"><div class="eyebrow">Letter structure · at least 150 words</div><h2 style="font-size:20px;margin:6px 0 14px">Greeting · Purpose · 3 bullet paragraphs · Closing</h2>${blueprintHTML(LETTER_PARTS(LETTER_TIPS.formal))}
       <div class="tips">${Object.entries(LETTER_TIPS).map(([k,v])=>`<div><b>${GT_TYPES[k]}:</b> ${esc(v.greet)} → ${esc(v.close)} ${esc(v.tone)}</div>`).join("")}</div></section>
      <section class="panel"><div class="eyebrow">Worked example · formal letter</div><p class="muted" style="font-size:13px;margin:6px 0 10px;white-space:pre-wrap">${esc(sq.prompt)}</p>
       <div class="sample-essay">${LETTER_SAMPLE.parts.map(([l,txt],ix)=>`<span class="lbl" style="color:var(--r-${["frame","op","a","b","a","frame"][ix]})">${l}</span><p style="white-space:pre-wrap">${esc(txt)}</p>`).join("")}</div>
       <p class="muted" style="font-size:12px;margin-top:10px">${words(LETTER_SAMPLE.parts.map(x=>x[1]).join(" "))} words</p></section></div>
     <section class="panel" style="margin-top:20px"><div class="eyebrow" style="margin-bottom:10px">Checklist</div>${checklistHTML(LETTER_CHECK,"gtc")}</section>`;
  } else {
    const st = T2_STRUCT[g.t2], ex = BANK2.find(q=>q.id===st.example.q);
    body = `<div class="chips" style="margin-bottom:16px">${Object.entries(T2_STRUCT).map(([k,v])=>`<button type="button" data-gt2="${k}" aria-pressed="${g.t2===k}">${v.label}</button>`).join("")}</div>
     <section class="panel" style="margin-bottom:20px"><div class="eyebrow" style="margin-bottom:8px">Process · plan, draft, conclude, then check</div><ul class="flow">${[...st.flow,...T2_FLOW_END,"Move on"].map(f=>`<li>${esc(f)}</li>`).join("")}</ul></section>
     <div class="guide-grid"><section class="panel"><div class="eyebrow">Blank structure · at least 250 words</div><h2 style="font-size:20px;margin:6px 0 14px">${esc(st.label)}: Introduction · Body 1 · Body 2 · Conclusion</h2>${blueprintHTML(st.parts)}${st.note?`<div class="tips"><div>${esc(st.note)}</div></div>`:""}</section>
      <section class="panel"><div class="eyebrow">Populated structure · example plan</div><p class="muted" style="font-size:13px;margin:6px 0 12px;white-space:pre-wrap">${esc(ex.prompt)}</p>${blueprintHTML(st.parts, st.example.notes)}</section></div>
     <section class="panel" style="margin-top:20px"><div class="eyebrow" style="margin-bottom:10px">Checklist</div>${checklistHTML([...st.check,...T2_COMMON_CHECK],"g2c")}</section>`;
  }
  app.innerHTML = `<main class="wrap"><div class="eyebrow">Study</div><h1 style="font-size:28px;margin-top:4px">Structure guide</h1>
   <p class="muted" style="max-width:72ch">A paragraph-by-paragraph plan for every task type. Colours show each sentence's job: <span style="color:var(--r-frame);font-weight:600">frame</span>, <span style="color:var(--r-op);font-weight:600">overview / opinion</span>, <span style="color:var(--r-a);font-weight:600">main idea 1</span>, <span style="color:var(--r-b);font-weight:600">main idea 2</span>, <span style="color:var(--r-x);font-weight:600">support</span>. Task 2 uses five classic essay structures. They are templates, not formulas: use your own ideas and language.</p>
   <div class="tasktabs" style="margin:18px 0 18px;justify-content:flex-start">${tabs.map(([k,l])=>`<button data-gtab="${k}" aria-current="${g.task===k}">${l}</button>`).join("")}</div>${body}
   <div class="startrow" style="margin-top:20px"><button class="btn primary" id="gpractise">Practise this type</button></div></main>`;
  app.querySelectorAll("[data-gtab]").forEach(b=>b.onclick=()=>{ g.task=b.dataset.gtab; renderGuide(); });
  app.querySelectorAll("[data-gt1]").forEach(b=>b.onclick=()=>{ g.t1=b.dataset.gt1; renderGuide(); });
  app.querySelectorAll("[data-gt2]").forEach(b=>b.onclick=()=>{ g.t2=b.dataset.gt2; renderGuide(); });
  $("#gpractise").onclick=()=>{ setup.source="random"; if (g.task==="t2"){ setup.mode="t2"; setup.t2type=g.t2; } else { setup.mode="t1"; setup.module = g.task==="t1gt"?"general":"academic"; if (g.task==="t1ac") setup.t1type=g.t1; else setup.t1typeGT="any"; } saveSetup(); nav("home"); };
}

/* ---------------- History & descriptors ---------------- */
function renderHistory(){
  const H = history();
  app.innerHTML = `<main class="wrap"><div class="eyebrow">History</div><h1 style="font-size:28px;margin-top:4px">Your marked tests</h1>
   <div class="home" style="margin-top:18px"><section class="panel">${H.length?`<div class="hist-list" style="margin-top:0">${H.map(histRow).join("")}</div>`:`<div class="empty" style="margin-top:0">No marked tests yet. Finish a test and submit it for marking to see it here.</div>`}
   ${H.length?`<button class="btn small" id="clr" style="margin-top:14px">Clear history</button><span id="clrc"></span>`:""}</section>
   <aside class="panel"><div class="eyebrow">Criterion averages</div>${H.length?progressHTML(H).split('<div class="hist-list">')[0]:progressHTML(H)}</aside></div>
   <p class="foot">Your history list is kept in this browser; your marked tests are also saved to your account. Clearing site data or using another device starts a fresh history.</p></main>`;
  app.querySelectorAll(".hist").forEach(b=>b.addEventListener("click",()=>openHistory(b.dataset.id)));
  const c=$("#clr"); c && c.addEventListener("click",()=>{ $("#clrc").innerHTML=` <span style="font-size:13px">Delete all ${H.length} results? <button class="btn small" id="clry" style="border-color:var(--mark);color:var(--mark)">Delete</button></span>`; $("#clry").onclick=()=>{ store.del("iwc.history"); renderHistory(); }; });
}
function renderDesc(){
  const tbl = task => `<div class="desc-tbl"><table><thead><tr><th>Band</th>${CRIT[task].map(c=>`<th>${c.name}</th>`).join("")}</tr></thead><tbody>${[9,8,7,6,5,4,3,2,1].map(b=>`<tr><td class="b">${b}</td>${CRIT[task].map(c=>`<td>${esc(c.d[b])}</td>`).join("")}</tr>`).join("")}<tr><td class="b">0</td><td colspan="4">${esc(BAND0)}</td></tr></tbody></table></div>`;
  app.innerHTML = `<main class="wrap"><div class="eyebrow">Reference</div><h1 style="font-size:28px;margin-top:4px">Writing band descriptors</h1>
   <p class="muted" style="max-width:70ch">The examiner uses these exact descriptors (IELTS Writing Band Descriptors, updated May 2023) together with the official Writing Key Assessment Criteria. A script must fully fit the positive features of a band to be awarded it.</p>
   <div class="source" role="note"><b>Source:</b> IELTS Writing Band Descriptors (updated May 2023) and IELTS Writing Key Assessment Criteria, published by IELTS (British Council, IDP IELTS and Cambridge University Press &amp; Assessment). From <a href="https://ielts.org/take-a-test/your-results/ielts-scoring-in-detail" target="_blank" rel="noopener noreferrer">IELTS scoring in detail, ielts.org</a>. Check ielts.org for the latest version.</div>
   <h2 style="font-size:20px;margin-top:24px">What each criterion assesses</h2>
   <div class="cols2" style="margin-top:12px">${[["Task Achievement · Academic Task 1",KEY_CRITERIA.TA_ac],["Task Achievement · General Training Task 1",KEY_CRITERIA.TA_gt],["Task Response · Task 2",KEY_CRITERIA.TR],["Coherence & Cohesion",KEY_CRITERIA.CC],["Lexical Resource",KEY_CRITERIA.LR],["Grammatical Range & Accuracy",KEY_CRITERIA.GRA]].map(([h,x])=>`<div class="listbox"><h3>${h}</h3><p style="margin:0;font-size:14px">${esc(x)}</p></div>`).join("")}</div>
   <div class="banner warn" style="margin-top:12px">${esc(KEY_CRITERIA.general)}</div>
   <h2 style="font-size:20px;margin-top:28px">Task 1 · Academic</h2>${tbl(1)}<h2 style="font-size:20px;margin-top:28px">Task 1 · General Training</h2>${tbl("g1")}<h2 style="font-size:20px;margin-top:28px">Task 2</h2>${tbl(2)}</main>`;
}

{ const f = document.getElementById("sitefoot"); if (f) f.innerHTML = footerHTML(); }
document.addEventListener("click", e => { const a = e.target.closest("a[data-legal]"); if (a && !e.ctrlKey && !e.metaKey){ e.preventDefault(); nav(a.dataset.legal); } });
function routeFromUrl(){ const p = location.pathname.replace(/^\/+|\/+$/g, ""), h = location.hash.slice(1); return h in LEGAL_PAGES ? h : p in LEGAL_PAGES ? p : null; }
window.addEventListener("popstate", () => { const r = routeFromUrl(); if (r) nav(r); else if (view in LEGAL_PAGES) nav("home"); });
nav(routeFromUrl() || "home");
boot();
/* ---------------- Buy credits ---------------- */
let paypalLoading = null, pollTimer = null, countdownTimer = null;
function loadPayPal(){
  if (!cfg?.paypalClientId) return Promise.reject();
  if (window.paypal) return Promise.resolve(window.paypal);
  return paypalLoading ??= new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(cfg.paypalClientId)}&currency=USD&intent=capture`;
    s.onload = () => res(window.paypal); s.onerror = rej; document.head.appendChild(s);
  });
}
function renderBuy(){
  const need = pendingStart ? (pendingStart.mode==="both"?2:1) : 0;
  const rec = need===2 ? "full1" : need===1 ? "task1" : null;
  app.innerHTML = `<main class="wrap"><div class="eyebrow">Credits</div><h1 style="font-size:28px;margin-top:4px">Buy credits</h1>
   <p class="muted" style="max-width:70ch">1 credit marks 1 task. A Task 1 or Task 2 test uses 1 credit; a full test (Task 1 + Task 2) uses 2. Each marked task includes one band 9 model answer. Credits don't expire.</p>
   ${need?`<div class="banner info" style="margin:14px 0"><span>Your ${pendingStart.mode==="both"?"full test":"test"} needs <b>${need} credit${need>1?"s":""}</b>. It starts automatically after you pay.</span></div>`:""}
   ${!session?`<div class="banner info" style="margin:14px 0"><span>Sign in with Google to buy credits.</span><button class="btn small primary" style="margin-left:auto" data-act="signin">Sign in with Google</button></div>`:""}
   ${bootError?`<div class="banner warn" style="margin:14px 0">${esc(bootError)}</div>`:""}
   ${me?`<p style="margin:10px 0 0">You have <b>${me.freeTests}</b> free test${me.freeTests===1?"":"s"} and <b>${me.credits}</b> credit${me.credits===1?"":"s"}.</p>`:""}
   <div class="pkgs">${Object.values(PACKAGES).map(p=>`<section class="pkg${p.id===rec?" rec":""}">
      ${p.id===rec?`<span class="pkg-flag">Fits your test</span>`:p.id==="bundle10"?`<span class="pkg-flag alt">Best value</span>`:""}
      <h2>${esc(p.label)}</h2><div class="pkg-price">${rupiah(p.idr)}</div>${p.usd?`<div class="muted" style="font-size:13px">or US$${p.usd} with PayPal</div>`:`<div class="muted" style="font-size:13px">QRIS</div>`}
      <p class="muted" style="font-size:13px;margin:6px 0 12px">${p.credits} credit${p.credits>1?"s":""} · ${esc(p.note)}</p>
      <button class="btn primary" data-qris="${p.id}" ${session&&sb?"":"disabled"}>Pay with QRIS</button>
      ${p.usd && cfg?.paypalClientId ? `<div class="pp" id="pp-${p.id}" ${session?"":"hidden"}></div>`:""}
    </section>`).join("")}</div>
   <p class="foot">QRIS works with DANA, GoPay, OVO, ShopeePay, LinkAja and Indonesian mobile banking apps. PayPal is offered for the bundles, charged in US dollars. Prices include all fees.</p></main>`;
  bindActs();
  app.querySelectorAll("[data-qris]").forEach(b => b.onclick = () => payQris(b.dataset.qris));
  if (session && cfg?.paypalClientId) loadPayPal().then(pp => {
    Object.values(PACKAGES).filter(p=>p.usd).forEach(p => {
      const el = $("#pp-"+p.id); if (!el) return; let ourId = null;
      pp.Buttons({ style:{layout:"horizontal", height:40, tagline:false, label:"paypal"},
        createOrder: async () => { const r = await api("/api/pay/paypal-create", {pkg:p.id}); ourId = r.orderId; return r.paypalOrderId; },
        onApprove: async () => { try { const r = await api("/api/pay/paypal-capture", {orderId:ourId}); paid(r, p); } catch(e){ showModal(`<h2>Payment not completed</h2><p>${esc(e.error)}</p><button class="btn" data-close>Close</button>`); } },
        onError: () => showModal(`<h2>PayPal error</h2><p>PayPal couldn't complete the payment. You have not been charged. Try again, or pay with QRIS.</p><button class="btn" data-close>Close</button>`)
      }).render(el).catch(()=>{});
    });
  }).catch(()=>{});
}
function showModal(html){
  let m = $("#modal");
  if (!m){ m = document.createElement("div"); m.id = "modal"; m.className = "modal"; m.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true"></div>`; document.body.appendChild(m); m.addEventListener("click", e => { if (e.target===m) closeModal(); }); }
  m.querySelector(".modal-box").innerHTML = html; m.hidden = false;
  m.querySelectorAll("[data-close]").forEach(b => b.onclick = closeModal);
  return m;
}
function closeModal(){ clearInterval(pollTimer); clearInterval(countdownTimer); const m = $("#modal"); if (m) m.hidden = true; }
async function payQris(pkgId){
  const p = PACKAGES[pkgId];
  showModal(`<h2>Pay ${rupiah(p.idr)}</h2><p class="muted"><span class="spinner"></span> Creating your QRIS code…</p>`);
  let r;
  try { r = await api("/api/pay/midtrans-create", {pkg:pkgId}); }
  catch(e){ showModal(`<h2>Couldn't create the payment</h2><p>${esc(e.error)}</p><button class="btn" data-close>Close</button>`); return; }
  const m = showModal(`<div class="eyebrow">QRIS · ${esc(p.label)}</div><h2 style="margin:4px 0 2px">${rupiah(p.idr)}</h2>
    <p class="muted" style="font-size:13px;margin:0 0 12px">Order ${esc(r.orderId)}</p>
    <div class="qr" id="qr">${r.qrUrl?`<img src="${esc(r.qrUrl)}" alt="QRIS payment code" width="240" height="240">`:""}</div>
    <p style="font-size:14px">Open DANA, GoPay, OVO, ShopeePay or your banking app, choose <b>Scan / QRIS</b>, and scan this code. Credits are added as soon as the payment arrives.</p>
    ${cfg?.midtransProduction?"":`<p class="banner warn" style="font-size:13px">Test mode: no real money. Pay using the Midtrans sandbox simulator.</p>`}
    <p id="paystate" class="muted"><span class="spinner"></span> Waiting for payment · <span id="paytime">15:00</span> left</p>
    <button class="btn" data-close>Cancel</button>`);
  if (!r.qrUrl && r.qrString) drawQr(r.qrString);
  const until = r.expiresAt ? new Date(r.expiresAt.replace(" ", "T") + "+07:00").getTime() : Date.now() + 15*60e3;
  countdownTimer = setInterval(() => { const el = $("#paytime"); if (el) el.textContent = fmtTime((until-Date.now())/1000); }, 1000);
  pollTimer = setInterval(async () => {
    if (m.hidden) return closeModal();
    try {
      const s = await api("/api/order?id=" + encodeURIComponent(r.orderId));
      if (s.status==="paid"){ closeModal(); paid(s, p); }
      else if (s.status==="expired" || s.status==="failed" || Date.now() > until + 60e3){ clearInterval(pollTimer); clearInterval(countdownTimer); $("#paystate").innerHTML = `This QR code has expired. <button class="btn small" id="newqr">Make a new code</button>`; $("#newqr").onclick = () => payQris(pkgId); }
    } catch {}
  }, 3000);
}
function drawQr(text){
  const go = () => { const el = $("#qr"); if (el && window.QRCode) new window.QRCode(el, {text, width:240, height:240}); };
  if (window.QRCode) return go();
  const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"; s.onload = go; document.head.appendChild(s);
}
function paid(r, p){
  me = {...(me||{}), freeTests:r.freeTests, credits:r.credits}; renderAccount();
  const draft = pendingStart;
  showModal(`<h2>Payment received</h2><p>${p.credits} credit${p.credits>1?"s were":" was"} added. You now have <b>${r.credits}</b> credit${r.credits===1?"":"s"}.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${draft?`<button class="btn primary" id="go">Start your test</button>`:`<button class="btn primary" id="go">Start a test</button>`}<button class="btn" data-close>Close</button></div>`);
  $("#go").onclick = () => { closeModal(); if (draft) startTest(draft); else nav("home"); };
}
function bindActs(){
  app.querySelectorAll("[data-act]").forEach(b => b.onclick = () => b.dataset.act==="signin" ? signIn() : nav("buy"));
}
