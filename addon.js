/* =====================================================================
   addon.js · My Devices tab + 9 new games for Table Trainer
   Loaded as a plain script after the main app scripts. Uses the app's own globals:
   U, P, X, $, esc, ago, fmt, MODES, plusMode, goTab, gate, rmLogin, editLoginModal, copyTxt, toast, dev, GN, GENS, LABG, CAT, SHS, R, rnd, pick.
   No new Firestore collections: it only reads accounts/{uid}.logins and removes logins with the app's own rmLogin().
   ===================================================================== */
(function(){
"use strict";
if(typeof GN==="undefined"||typeof MODES==="undefined"||window.__ttAddon)return;
window.__ttAddon=1;

/* ---------------------------------------------------------------
   1. MY DEVICES
   --------------------------------------------------------------- */
const css=document.createElement("style");
css.textContent=`
.dv-row{border:1px solid var(--line);border-radius:14px;padding:12px 14px;background:var(--card);display:flex;flex-direction:column;gap:6px;margin-top:10px}
.dv-row.sus{border-color:#d9822b;background:rgba(217,130,43,.08)}
.dv-row.me{border-color:var(--acc)}
.dv-top{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.dv-top b{font-size:1.02rem;word-break:break-all}
.dv-meta{font-size:.82rem;color:var(--mute);line-height:1.5}
.dv-fl{display:flex;gap:6px;flex-wrap:wrap}
.dv-fl span{font-size:.74rem;font-weight:700;border-radius:99px;padding:2px 10px;background:var(--line)}
.dv-fl .w{background:#d9822b;color:#fff}.dv-fl .g{background:var(--ok2);color:var(--ok)}
.dv-act{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}
.dv-sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin-top:10px}
.dv-sum div{border:1px solid var(--line);border-radius:12px;padding:8px 10px;text-align:center}
.dv-sum b{display:block;font-size:1.3rem}.dv-sum small{color:var(--mute)}
@media print{body *{visibility:hidden}#dvprint,#dvprint *{visibility:visible}#dvprint{position:absolute;left:0;top:0;width:100%}}`;
document.head.appendChild(css);

const DAY=864e5;
const rkOf=h=>{try{return({super:"Super admin",admin:"Admin",member:"Member"})[U.roles[h]]||"Member"}catch(e){return"Member"}};

/* Look at every login and decide whether anything about it deserves a second look. */
function assess(list){
  const now=Date.now();
  const devCount={};list.forEach(([h,l])=>{const d=l.dev||"";devCount[d]=(devCount[d]||0)+1});
  const recentAdds=list.filter(([h,l])=>l.add&&now-l.add<DAY).length;
  return list.map(([h,l])=>{
    const w=[];
    const age=l.add?now-l.add:Infinity,idle=l.last?now-l.last:Infinity;
    if(h!==U.h){
      if(l.add&&age<2*DAY&&!(l.s&&l.s.ans))w.push("Added in the last 2 days and has never practised");
      else if(l.add&&age<DAY)w.push("Added in the last 24 hours");
      if(!l.dev)w.push("No device information was recorded");
      if(l.last&&idle>60*DAY&&l.s&&!l.s.ans)w.push("Not used for over 60 days");
      if(recentAdds>=3&&l.add&&age<DAY)w.push(recentAdds+" logins were added at once");
      if(l.chg&&now-l.chg<2*DAY)w.push("Email or phone on this login was changed recently");
    }
    return{h,l,w,sus:w.length>0}})}

/* Plain-text list a person can keep somewhere safe. Only masked IDs are ever shown. */
function remindText(rows){
  return "My Table Trainer logins ("+new Date().toISOString().slice(0,10)+")\nGuild: "+(U.name||"")+"  ·  ID "+U.uid+"\n\n"+
    rows.map(({h,l})=>(l.t==="email"?"Email: ":"Phone: ")+l.m+(l.lb?"  ("+l.lb+")":"")+"  · "+(l.dev||"unknown device")+"  · last used "+ago(l.last)).join("\n")+
    "\n\nSign in with any of these. Table Trainer has no passwords.\n"}

function devT(){
  if(!U)return gate("📱 My Devices");
  const ents=Object.entries(U.logins||{}).filter(([h,l])=>l&&l.t);
  ents.sort((a,b)=>(a[0]===U.h?-1:b[0]===U.h?1:(b[1].last||0)-(a[1].last||0)));
  const rows=assess(ents),nSus=rows.filter(r=>r.sus).length;
  const emails=rows.filter(r=>r.l.t==="email").length,phones=rows.length-emails;
  const canRm=h=>{const vr=({super:2,admin:1,member:0})[U.roles[U.h]]||0,tr=({super:2,admin:1,member:0})[U.roles[h]]||0;return h===U.h||vr===2||(vr===1&&tr===0)};
  const card=({h,l,w,sus})=>{
    const me=h===U.h;
    return`<div class="dv-row ${sus?"sus":""} ${me?"me":""}">
      <div class="dv-top"><span aria-hidden="true" style="font-size:1.4rem">${l.t==="email"?"✉️":"📱"}</span><b>${esc(l.m)}</b>${l.lb?`<span class="tg">🏷️ ${esc(l.lb)}</span>`:""}</div>
      <div class="dv-fl">${me?`<span class="g">This device</span>`:""}<span>${esc(rkOf(h))}</span>${sus?`<span class="w">⚠️ Check this</span>`:""}</div>
      <div class="dv-meta">🖥️ ${esc(l.dev||"Unknown device")}<br>➕ Added ${ago(l.add)} · 🕒 Last active ${ago(l.last)}${l.s&&l.s.xp?`<br>⭐ ${fmt(l.s.xp)} XP · ${fmt(l.s.ans||0)} answers`:""}</div>
      ${sus?`<div class="dv-meta" style="color:#c2681a"><b>Why:</b> ${w.map(esc).join("; ")}.</div>`:""}
      <div class="dv-act"><button class="sm" data-dl="${h}">🏷️ Label / change</button>${canRm(h)?`<button class="sm ${sus?"pri":""}" data-dr="${h}">${me?"Leave with this login":"🗑️ Remove this login"}</button>`:""}</div>
    </div>`};
  $("view").innerHTML=`<div class="card"><div class="bar2" style="margin:0"><h2 style="margin:0">📱 My Devices</h2></div>
    <p class="hint" style="margin:6px 0 0">Every email and phone number that can open <b>${esc(U.name||"your guild")}</b>. Keep this list so you remember which one you used. If you see a login you do not know, remove it. Table Trainer never shows full emails or numbers, only masked ones.</p>
    <div class="dv-sum"><div><b>${rows.length}</b><small>logins</small></div><div><b>${emails}</b><small>emails</small></div><div><b>${phones}</b><small>phones</small></div><div><b style="${nSus?"color:#d9822b":""}">${nSus}</b><small>to check</small></div></div></div>
  ${nSus?`<div class="tip" style="margin-top:14px"><span>⚠️ ${nSus} login${nSus>1?"s look":" looks"} unusual (very new, no device info, or changed recently). That is not proof of a problem. If you do not recognise one, remove it.</span></div>`:`<div class="tip" style="margin-top:14px"><span>✅ Everything looks normal. Check back now and then.</span></div>`}
  ${rows.map(card).join("")}
  <div class="card" style="margin-top:14px"><h3 style="margin:0 0 6px">📝 Remember my logins</h3><p class="hint" style="margin:0 0 8px">Copy or print the masked list and keep it somewhere safe.</p>
    <div class="dv-act"><button class="sm" id="dvcp">📋 Copy list</button><button class="sm" id="dvpr">🖨️ Print</button></div></div>
  <div class="card" style="margin-top:14px"><h3 style="margin:0 0 6px">🔐 Safety tips</h3><p class="hint" style="margin:0">Only add logins you own. Admins can remove members; only a Super admin can remove admins. If you remove a login you do not know, choose “subtract” when asked, so its scores leave the guild total. Anyone who knows an email or phone linked here can sign in, so keep them private.</p></div>
  <div id="dvprint" hidden></div>`;
  const v=$("view");
  v.querySelectorAll("[data-dl]").forEach(b=>b.onclick=()=>editLoginModal(b.dataset.dl));
  v.querySelectorAll("[data-dr]").forEach(b=>b.onclick=async()=>{
    b.disabled=true;
    try{await rmLogin(b.dataset.dr)}catch(e){}
    if(U&&mode==="devices"){try{A().hidden=true}catch(e){}devT()}});
  $("dvcp").onclick=()=>{const t=remindText(rows);if(typeof copyTxt==="function")copyTxt(t);else navigator.clipboard&&navigator.clipboard.writeText(t)};
  $("dvpr").onclick=()=>{const p=$("dvprint");p.hidden=false;p.innerHTML=`<pre style="white-space:pre-wrap;font:14px/1.5 system-ui">${esc(remindText(rows))}</pre>`;window.print();setTimeout(()=>{p.hidden=true},500)};
}
window.devT=devT;

MODES.push(["devices","📱 My Devices"]);
{const _pm=plusMode;plusMode=function(m){
  if(m==="devices"){document.body.classList.add("jr");devT();return true}
  return _pm.apply(this,arguments)}}
{const b=document.createElement("button");b.className="umi tab";b.setAttribute("role","menuitem");b.dataset.k="devices";b.textContent="📱 My Devices";
 b.onclick=()=>goTab(b);const mm=$("moremenu");if(mm)mm.appendChild(b)}
/* shortcut inside the account dropdown */
if(typeof UM!=="undefined"){
  const r0=UM.render;UM.render=function(){r0.apply(this,arguments);
    const out=UM.el().querySelector('[data-um="out"]');if(!out||UM.el().querySelector('[data-um="devices"]'))return;
    const b=document.createElement("button");b.className="umi";b.setAttribute("role","menuitem");b.dataset.um="devices";b.innerHTML='<span aria-hidden="true">📱</span>My Devices';
    out.parentNode.insertBefore(b,out.previousElementSibling||out)};
  const g0=UM.go;UM.go=function(k){if(k==="devices"){UM.close();try{closePV()}catch(e){}try{A().hidden=true}catch(e){}mode="devices";start();window.scrollTo({top:0,behavior:"smooth"});return}return g0.apply(this,arguments)}}

/* ---------------------------------------------------------------
   2. NINE NEW GAMES   (same contract as the built-in generators)
   --------------------------------------------------------------- */
const RIs=(lo,hi)=>lo+Math.floor(Math.random()*(Math.max(lo,hi)-lo+1));
const NG={
 /* 🪜 Nth multiple */
 sk:{r:L=>{const n=[5,7,9,12,15][L-1]||15;return[RIs(2,[5,9,12,12,15][L-1]||15),RIs(3,n+3)]},
  mk:(a,n)=>({g:"sk",k:"sk:"+a+":"+n,t:`The ${n}${n%10===1&&n!==11?"st":n%10===2&&n!==12?"nd":n%10===3&&n!==13?"rd":"th"} multiple of ${a} = <span>?</span>`,a:a*n,
    h:f=>f?`${a} × ${n} = ${a*n}`:`Count in ${a}s ${n} times, or work out ${a} × ${n}`}),fk:p=>[+p[1],+p[2]]},
 /* ⏭️ Next multiple */
 nxm:{r:L=>{const m=RIs(3,[6,9,12,15,19][L-1]||19),b=RIs(m+1,[60,120,300,700,999][L-1]||999);return[m,b%m===0?b+1:b]},
  mk:(m,b)=>{const a=(Math.floor(b/m)+1)*m;return{g:"nxm",k:"nxm:"+m+":"+b,t:`Next multiple of ${m} after ${b} = <span>?</span>`,a,
    h:f=>f?`${b} ÷ ${m} = ${Math.floor(b/m)} remainder ${b%m}, so go up ${m-b%m} to ${a}`:`Divide ${b} by ${m}, then go up to the next whole number of ${m}s`}},fk:p=>[+p[1],+p[2]]},
 /* 🏛️ Place value */
 plv:{r:L=>{const n=[RIs(100,999),RIs(1000,9999),RIs(10000,99999),RIs(100000,999999),RIs(1000000,9999999)][L-1],u=pick(L<=2?[10,100]:[10,100,1000,10000]);return[n,u]},
  mk:(n,u)=>({g:"plv",k:"plv:"+n+":"+u,t:`How many ${u===10?"tens":u===100?"hundreds":u===1000?"thousands":"ten-thousands"} fit in ${n.toLocaleString("en-US")}? <small>(whole ones)</small>`,a:Math.floor(n/u),
    h:f=>f?`${n} ÷ ${u} → drop the last ${String(u).length-1} digit${u>10?"s":""} = ${Math.floor(n/u)}`:`Cover the last ${String(u).length-1} digit${u>10?"s":""}. What is left?`}),fk:p=>[+p[1],+p[2]]},
 /* 💰 Making change */
 chg:{r:L=>{const pay=pick([[20,50],[50,100],[100,200],[200,500],[500,1000]][L-1]||[1000,2000]),c=RIs(Math.ceil(pay*.12),pay-1);return[pay,L<=2?Math.round(c/5)*5||5:c]},
  mk:(pay,c)=>({g:"chg",k:"chg:"+pay+":"+c,t:`You pay ${pay} for something that costs ${c}. Change = <span>?</span>`,a:pay-c,
    h:f=>f?`${pay} − ${c} = ${pay-c}`:`Count up from ${c} to ${pay}: first to the next 10, then the rest`}),fk:p=>[+p[1],+p[2]]},
 /* 📦 Word problems */
 box:{r:L=>{const a=RIs(2,[6,9,12,15,25][L-1]||25),b=RIs(2,[6,9,12,15,20][L-1]||20),it=pick(["pencils","stickers","marbles","cards","coins","apples"]);return[a,b,it]},
  mk:(a,b,it)=>({g:"box",k:"box:"+a+":"+b+":"+it,t:`${a} boxes with ${b} ${it} in each. How many ${it} in all? <span>?</span>`,a:a*b,
    h:f=>f?`${a} × ${b} = ${a*b}`:`Equal groups: multiply the number of boxes by the amount in each`}),fk:p=>[+p[1],+p[2],p[3]]},
 /* ⬇️ Square root, rounded down */
 fsq:{r:L=>[RIs(5,[40,150,400,900,2500][L-1]||2500)],
  mk:n=>{const s=Math.floor(Math.sqrt(n));return{g:"fsq",k:"fsq:"+n,t:`Biggest whole number whose square is at most ${n} = <span>?</span>`,a:s,
    h:f=>f?`${s}² = ${s*s} and ${s+1}² = ${(s+1)*(s+1)}, which is too big`:`Find the two perfect squares that ${n} sits between`}},fk:p=>[+p[1]]},
 /* ➕ Gauss sum */
 gss:{r:L=>[pick([[4,5,6,8,10],[10,12,15,20],[20,25,30,40,50],[50,60,80,100],[100,120,150,200]][L-1]||[100,200])],
  mk:n=>({g:"gss",k:"gss:"+n,t:`1 + 2 + 3 + … + ${n} = <span>?</span>`,a:n*(n+1)/2,
    h:f=>f?`${n} × ${n+1} ÷ 2 = ${n*(n+1)/2}`:`Pair first and last: 1+${n}, 2+${n-1}… each pair makes ${n+1}`}),fk:p=>[+p[1]]},
 /* ➗ Remainders */
 rem:{r:L=>{const d=RIs(3,[6,9,12,15,25][L-1]||25),q=RIs(2,[8,12,15,20,40][L-1]||40),r=RIs(1,d-1);return[d*q+r,d]},
  mk:(n,d)=>({g:"rem",k:"rem:"+n+":"+d,t:`${n} ÷ ${d} leaves remainder <span>?</span>`,a:n%d,
    h:f=>f?`${d} × ${Math.floor(n/d)} = ${d*Math.floor(n/d)}, and ${n} − ${d*Math.floor(n/d)} = ${n%d}`:`Find the biggest multiple of ${d} that fits, then see what is left`}),fk:p=>[+p[1],+p[2]]},
 /* ⚡ Trick multiplications: ×9, ×11, ×99, ×5, ×25 */
 trk:{r:L=>{const m=pick([[5,9],[5,9,11],[5,9,11,25],[9,11,25,99],[9,11,25,99,101]][L-1]||[99,101]);return[m,m===11||m===101?RIs(12,[40,99,99,99,99][L-1]||99):RIs(12,[40,99,99,150,300][L-1]||300)]},
  mk:(m,x)=>({g:"trk",k:"trk:"+m+":"+x,t:`${x} × ${m} = <span>?</span>`,a:x*m,
    h:f=>f?`${x} × ${m} = ${x*m}`:(m===9?`${x} × 10 − ${x}`:m===99?`${x} × 100 − ${x}`:m===5?`${x} × 10 ÷ 2`:m===25?`${x} × 100 ÷ 4`:m===101?`${x} × 100 + ${x}`:`${x} × 10 + ${x}`)}),fk:p=>[+p[1],+p[2]]}
};
const NEWG2=[
 ["sk","🪜","Nth multiple","What is the 7th multiple of 6?"],
 ["nxm","⏭️","Next multiple","Round up to the next multiple"],
 ["plv","🏛️","Place value","How many tens, hundreds, thousands fit?"],
 ["chg","💰","Making change","Pay, price, change"],
 ["box","📦","Equal groups","Short word problems with boxes"],
 ["fsq","⬇️","Nearest square root","Biggest whole number whose square fits"],
 ["gss","➕","Gauss sum","Add 1 to n the clever way"],
 ["rem","➗","Remainders","What is left after dividing?"],
 ["trk","⚡","Trick multiplying","×5, ×9, ×11, ×25, ×99 shortcuts"]];
for(const k in NG){const o=NG[k].r;NG[k].r=L=>o(Math.max(1,Math.min(5,L|0||1)))}
Object.assign(GN,NG);
for(const[k]of NEWG2)GENS[k]=L=>genQ(k,L);
LABG.splice(LABG.length-1,0,...NEWG2);
for(const[k,i,n]of NEWG2){CAT.push([k,i+" "+n]);if(typeof SHS!=="undefined"&&!SHS.some(s=>s[0]===k)&&!["plv","gss"].includes(k))SHS.push([k,i+" "+n])}
})();
