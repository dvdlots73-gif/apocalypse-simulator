// ---------- CROP FAILURE ----------
// Weekly steps over ~10 years. Each region gets most of its calories from a few staples (DIET), imports
// some of them (imp), and loses food two ways: its own harvest failing, and world prices it can't afford.
// Spores ride the wind (mostly eastward, rarely across the equator) and trade; fields only catch it in
// growing season. Famine deaths rise with the food gap and state fragility (Irish famine ≈ 3–4%/yr).
// Calorie shares & import dependence are rough FAO-style figures.
const DIET={
 'India':{w:.2,r:.3,imp:.05},'Bangladesh':{w:.1,r:.6,imp:.15},'Pakistan':{w:.45,r:.1,imp:.1},'Nepal':{w:.1,r:.35,m:.15,imp:.15},
 'Sri Lanka':{w:.1,r:.45,imp:.2},'China':{w:.25,r:.3,m:.05,imp:.15},'Japan':{w:.15,r:.25,imp:.6},'South Korea':{w:.15,r:.3,imp:.7},
 'Indonesia':{w:.1,r:.5,m:.05,imp:.15},'Philippines':{w:.05,r:.45,m:.05,b:.05,imp:.2},'Vietnam':{r:.55,imp:.05},'Thailand':{r:.5,imp:.05},
 'Malaysia':{w:.1,r:.35,imp:.4},'Egypt':{w:.45,r:.1,m:.1,imp:.5},'Iran':{w:.45,r:.1,imp:.35},'Iraq':{w:.4,r:.1,imp:.5},
 'Saudi Arabia':{w:.35,r:.15,imp:.8},'Turkey':{w:.45,imp:.15},'Morocco':{w:.5,imp:.45},'United Arab Emirates':{w:.3,r:.2,imp:.9},
 'Yemen':{w:.5,r:.05,imp:.9},'Sudan':{w:.2,m:.1,imp:.4},'Russia':{w:.35,p:.1,imp:0},'Germany':{w:.25,p:.08,imp:.1},
 'France':{w:.3,p:.05,imp:0},'United Kingdom':{w:.25,p:.08,imp:.3},'Spain':{w:.25,p:.05,imp:.3},'Italy':{w:.3,imp:.3},
 'Norway':{w:.25,p:.08,imp:.5},'Iceland':{w:.2,imp:.7},'Greenland':{w:.2,imp:.9},'United States of America':{w:.2,m:.12,p:.05,imp:0},
 'Canada':{w:.25,p:.06,imp:0},'Mexico':{w:.1,m:.4,imp:.3},'Brazil':{w:.12,r:.15,m:.1,imp:.05},'Argentina':{w:.3,m:.05,imp:0},
 'Colombia':{r:.2,m:.1,b:.05,p:.08,imp:.3},'Peru':{w:.12,r:.2,p:.15,m:.05,imp:.3},'Chile':{w:.3,p:.05,imp:.3},
 'Nigeria':{r:.1,m:.15,imp:.25},'Ghana':{r:.1,m:.2,imp:.25},'Senegal':{r:.3,w:.15,imp:.6},'Kenya':{m:.4,w:.1,b:.05,imp:.25},
 'Ethiopia':{w:.2,m:.25,imp:.15},'Dem. Rep. Congo':{m:.15,b:.1,imp:.2},'South Africa':{m:.35,w:.15,imp:.15},
 'Australia':{w:.25,imp:0},'New Zealand':{w:.25,imp:.1},'Fiji':{w:.2,r:.15,imp:.6},'Tuvalu':{r:.3,imp:.9},'French Polynesia':{w:.2,r:.15,imp:.8}};
const DIET0={w:.2,r:.15,m:.1,p:.04,b:0,imp:.3};
const EXPORTERS=new Set(['United States of America','Canada','Russia','Argentina','Brazil','Australia','France','Thailand','Vietnam','India']);
const CROPNAME={w:'wheat',r:'rice',m:'maize',p:'potatoes',b:'bananas'};
const BLIGHTS=[
 {name:'🌾 Wheat stem rust (Ug99-type)',crops:['w'],origin:'Nairobi',wind:2500,r:3,breed:5,
  src:'Real: Ug99 appeared in Uganda in 1999 and ~90% of the world’s wheat had no resistance. Its spores ride the wind across continents.'},
 {name:'🍚 Rice blast super-strain',crops:['r'],origin:'Dhaka',wind:1500,r:3,breed:4,
  src:'Real: rice blast already destroys enough rice each year to feed ~60 million people. Imagine a strain nothing resists.'},
 {name:'🌽 Southern corn leaf blight',crops:['m'],origin:'Chicago',wind:2000,r:3.5,breed:2,
  src:'Real: in 1970 it took 15% of the US corn crop in one summer — the fields were genetically identical.'},
 {name:'🥔 Late blight, new strain',crops:['p'],origin:'London',wind:1200,r:4,breed:3,
  src:'Real: Phytophthora caused the Irish famine of 1845–52 — a million dead, a million emigrated.'},
 {name:'🍌 Panama disease TR4',crops:['b'],origin:'Manila',wind:0,r:1.2,breed:8,
  src:'Real: a soil fungus killing the Cavendish banana, carried from Asia to Africa and Latin America on boots, soil and plants.'},
 {name:'🔥 Multiple breadbasket failure',crops:['w','r','m','p'],climate:1,breed:99,
  src:'Real risk: heat and drought striking the US, Russia, China and India in the same summer. Modelled as a 1-in-100-year event that is getting likelier.'},
 {name:'🌪 The Blight (Interstellar)',crops:['w'],seq:['w','p','r','b','m'],origin:'Chicago',wind:6000,r:5,breed:99,fiction:1,
  src:'Fiction, from Interstellar: a blight that jumps from crop to crop — corn last — while dust storms swallow the farms.'},
];
const BREADBASKETS=['Chicago','St Louis','Memphis','Moscow','Novosibirsk','Beijing','New Delhi','Lahore','Paris'];
const RUST='210,120,40',DUST='150,110,70';
const C={ready:false};

function cropInit(){
  if(C.ready)return;C.ready=true;if(!mask)buildMask();
  BLIGHTS.forEach((b,i)=>$('cblight').add(new Option(b.name,i)));$('cblight').value=0;
  nodes.filter(n=>!n.village).sort((a,b)=>a.name.localeCompare(b.name)).forEach(n=>$('corigin').add(new Option(n.name,n.i)));
  $('cblight').onchange=()=>{cInfo();const o=BLIGHTS[$('cblight').value].origin;if(o)cSetOrigin(nodes.find(n=>n.name===o));cropReset()};
  $('corigin').onchange=()=>cSetOrigin(nodes[$('corigin').value]);
  $('cgo').onclick=()=>{if(!C.started)cStart();C.running=!C.running;$('cgo').textContent=C.running?'❚❚ PAUSE':'▶ RESUME'};
  $('creset').onclick=cropReset;
  for(const n of nodes){
    n.diet=DIET[n.country]||DIET0;
    // neighbours within 6,000 km for wind-borne spores
    n.cNb=nodes.filter(b=>b!==n).map(b=>({b,d:kmTo(n.ll,b.ll),br:bearing(n.ll,b.ll)})).filter(x=>x.d<6000);
  }
  cInfo();cSetOrigin(nodes.find(n=>n.name===BLIGHTS[0].origin));cropReset();
}
function cInfo(){const b=BLIGHTS[$('cblight').value];$('cinfo').innerHTML=`${b.fiction?'<em>Fiction</em> · ':''}TARGETS <em>${(b.seq||b.crops).map(c=>CROPNAME[c]).join(' → ')}</em><br>${b.src}`;
  $('corigin').disabled=!!b.climate||C.started}
function cSetOrigin(n){if(!n)return;C.origin=n;$('corigin').value=n.i;flyTo=[-n.lon,-n.lat]}
function cropClick(){if(hover&&!C.started&&!BLIGHTS[$('cblight').value].climate)cSetOrigin(hover)}
function cropReset(){
  if(!C.ready)return;
  Object.assign(C,{started:false,running:false,acc:0,week:0,ended:false,logged:{},spores:[],flows:[],price:1,loss:0,detect:null,breedAt:null,active:[],peak:0});
  nodes.forEach(n=>Object.assign(n,{cI:0,cH:n.N,cD:0,cGap:0,cDet:null,cHit:null,cU:null,cC:null,cPush:0,cFlee:-99}));
  $('log').innerHTML='';$('banner').style.display='none';
  $('cgo').disabled=false;$('cgo').textContent='🌾 RELEASE';$('cblight').disabled=$('cchaos').disabled=false;cInfo();cHud();
}
function cStart(){
  C.started=true;C.B=BLIGHTS[$('cblight').value];C.active=[...C.B.crops];
  $('cblight').disabled=$('corigin').disabled=$('cchaos').disabled=true;
  if(C.B.climate){C.shockYear=-1;log('<b>🔥 A heat dome settles over the northern breadbaskets</b>')}
  else{C.origin.cI=.01;C.origin.cHit=0;log(`<b>${C.B.name.slice(0,2)} ${C.B.name.slice(2)}</b> appears in fields near <span style="color:#fff">${C.origin.name}</span>`)}
}

// calendar: week 0 = 7 Oct 2026; northern growing season Apr–Sep, southern Oct–Mar, tropics all year
const cDoy=()=>(280+C.week*7)%365;
const cDate=()=>{const d=new Date(2026,9,7+C.week*7);return d.toLocaleString('en',{month:'short',year:'numeric'})};
function cSeason(n){
  if(Math.abs(n.lat)<23.5)return .8;const d=cDoy(),north=d>=90&&d<273;
  return (n.lat>0)===north?1:.1;
}
const cShare=n=>C.active.reduce((s,c)=>s+(n.diet[c]||0),0);

function cStep(){
  const B=C.B,wk=1/52,yr=C.week/52;
  // climate shocks: a hot summer hits the breadbaskets; another one each year with 40% odds
  if(B.climate){const d=cDoy(),y=Math.floor((C.week*7+280-150)/365);
    if(d>=150&&d<157&&y!==C.shockYear){C.shockYear=y;if(y===0||Math.random()<.4){
      for(const name of BREADBASKETS){const n=nodes.find(x=>x.name===name);if(n){n.cI=Math.max(n.cI,.25+.25*Math.random());if(n.cHit==null)n.cHit=C.week}}
      log(y===0?'🔥 Harvests fail across the US, Russia, China and India at once':'🔥 Another heat-dome summer — the breadbaskets fail again')}}}
  // the Interstellar blight jumps to a new crop every 18 months
  if(B.seq&&C.week>0&&C.week%78===0&&C.active.length<B.seq.length){const c=B.seq[C.active.length];C.active.push(c);
    log(`<b style="color:rgb(${RUST})">🌪 The blight jumps to ${CROPNAME[c]}${c==='m'?' — corn is the last crop left':''}</b>`)}
  // growth in each region; response = fungicide + rotation once detected; resistant seed years later
  for(const n of nodes){
    if(n.cI<=0)continue;
    if(B.climate){n.cI=Math.max(0,n.cI-.35*n.cI*wk);continue}
    const bred=C.breedAt!=null&&C.week>=C.breedAt,g=B.fiction?1:cSeason(n),resp=bred?0:n.cDet!=null&&C.week>=n.cDet?1-.5*(1-n.frag):1;
    n.cI=Math.min(.95,n.cI+B.r*g*resp*n.cI*(1-n.cI)*wk);
    if(bred)n.cI=Math.max(0,n.cI-n.cI*3*(1-.5*n.frag)*wk); // poorer farmers get the new seed later
    if(n.cI<.002)n.cI=0;
    if(n.cDet==null&&n.cI>.05){n.cDet=C.week+Math.round(2+8*n.frag);
      if(C.detect==null){C.detect=C.week;C.breedAt=C.week+B.breed*52;log(`🔬 Agronomists confirm a new pathogen in ${n.name} — breeding resistant ${CROPNAME[B.crops[0]]} will take ~${B.breed} years`)}}
  }
  // spread: wind (eastward bias, equator barrier) and trade (grain, seed, soil on boots)
  if(!B.climate)for(const a of nodes){
    if(a.cI<.05)continue;
    if(B.wind)for(const {b,d,br} of a.cNb){
      if(b.cI>0||d>B.wind*2)continue;
      const east=Math.cos((br-90)*Math.PI/180),dir=1+.5*east,eq=!B.fiction&&a.lat*b.lat<0?.08:1;
      const p=.06*a.cI*(B.fiction?1:cSeason(b))*Math.exp(-d/B.wind)*dir*eq;
      if(Math.random()<p)cInfect(b,a,'wind');
    }
    for(const r of routes){if(r.mode==='ground'&&B.wind)continue;if(r.a!==a&&r.b!==a)continue;const b=r.a===a?r.b:r.a;if(b.cI>0)continue;
      if(Math.random()<.004*a.cI*(B.wind?1:4)*(B.fiction?1:cSeason(b)))cInfect(b,a,r.mode==='ground'?'soil':'trade')}
  }
  // world harvest loss → prices → export bans
  let lost=0,tot=0;
  const allStaples=n=>(n.diet.w||0)+(n.diet.r||0)+(n.diet.m||0)+(n.diet.p||0)+(n.diet.b||0);
  for(const n of nodes){const w=n.N*(EXPORTERS.has(n.country)?3:1),s=cShare(n),sub=B.fiction||B.climate||n.cHit==null?0:Math.min(.5,(C.week-n.cHit)/52*.12);
    tot+=w*allStaples(n);lost+=w*s*n.cI*(1-sub);n.cSub=sub}
  C.loss=tot?lost/tot:0;C.price=Math.min(8,1+6*C.loss);
  if(C.price>1.6&&!C.logged.ban){C.logged.ban=1;log('<b>🚫 Export bans — food exporters keep their grain at home; importers pay any price</b>')}
  if(C.price>2.5&&!C.logged.p25){C.logged.p25=1;log(`📈 World food prices ×${C.price.toFixed(1)} — the 2008 crisis was ×2`)}
  const ban=C.price>1.6?1.3:1;
  // food gap & famine deaths
  for(const n of nodes){
    const direct=cShare(n)*n.cI*(1-n.cSub),price=n.diet.imp*Math.min(1,C.price-1)*(.2+.8*n.frag)*ban;
    n.cGap=Math.min(.95,(direct+price+n.cPush)*(n.cC!=null?1.3:1));
    const rate=Math.min(.3,.25*n.cGap*n.cGap*(.02+n.frag*n.frag));
    const d=n.cH*rate*wk;n.cH-=d;n.cD+=d;n.cPush=Math.max(0,n.cPush-.05*wk);
  }
  // food riots → collapse → refugees
  if($('cchaos').checked)for(const n of nodes){
    if(n.cC!=null)continue;const stress=Math.min(1,2*n.cGap+.15*(C.price-1)),f2=n.frag*n.frag;
    if(n.cU==null){if(Math.random()<.03*f2*stress+.002*stress){n.cU=C.week;log(`<span style="color:rgb(${RIOT})">⚠ Bread riots in ${n.name} (FSI ${n.fsi})</span>`)}}
    else if(Math.random()<.006*f2*stress){n.cC=C.week;log(`<span style="color:rgb(${RIOT})"><b>☠ Government falls in ${n.name}</b> — hunger topples the state</span>`)}
  }
  for(const a of nodes){
    if(a.cGap<.35||C.week-a.cFlee<8)continue;a.cFlee=C.week;
    a.cNb.filter(x=>x.d<2500&&x.b.cGap<a.cGap).sort((x,y)=>x.d-y.d).slice(0,2).forEach(({b})=>{b.cPush=Math.min(.15,b.cPush+.02);
      C.flows.push({a,b,ip:d3.geoInterpolate(a.ll,b.ll),d:kmTo(a.ll,b.ll),rt0:performance.now()})});
  }
  // milestones
  const D=d3.sum(nodes,n=>n.cD);C.peak=Math.max(C.peak,C.loss);
  for(const m of [1e6,1e7,1e8,1e9])if(D>=m&&!C.logged['d'+m]){C.logged['d'+m]=1;log(`<b>☠ ${fmt(m)} dead from hunger</b>`)}
  if(C.breedAt!=null&&C.week===C.breedAt&&!B.fiction)log(`<span style="color:#19e6c1">🧬 Resistant ${CROPNAME[B.crops[0]]} seed reaches farmers — the blight starts to retreat</span>`);
  C.week++;
  const maxI=d3.max(nodes,n=>n.cI);
  if(C.week>=520)cEnd(B.fiction?'THE LAST HARVEST — time to look to the stars':'10 YEARS ON');
  else if(!B.climate&&C.detect!=null&&maxI<.003&&C.price<1.05)cEnd('HARVESTS RECOVER');
}
function cInfect(b,a,via){
  b.cI=.01;b.cHit=C.week;C.spores.push({a,b,via,ip:d3.geoInterpolate(a.ll,b.ll),d:kmTo(a.ll,b.ll),rt0:performance.now()});
  const how={wind:'spores blow in from',trade:'arrives in a grain shipment from',soil:'travels on soil and boots from'}[via];
  if(b.lat*a.lat<0&&!C.logged.eq){C.logged.eq=1;log(`<b>🌐 It crosses the equator</b> — ${b.name}`)}
  log(`<span style="color:rgb(${RUST})">🍂 Blight in ${b.name} — ${how} ${a.name}</span>`);
}
function cEnd(msg){
  C.ended=true;C.running=false;$('cgo').disabled=true;const D=d3.sum(nodes,n=>n.cD);
  $('banner').innerHTML=`${msg} · ${cDate()}<br><small>${fmt(D)} DEAD FROM HUNGER · PEAK HARVEST LOSS ${(C.peak*100).toFixed(0)}%</small>`;$('banner').style.display='block';log(msg);
}
function cropTick(dt){
  if(C.running){C.acc+=dt*+$('speed').value;while(C.acc>=1&&C.running){cStep();C.acc-=1}}
  cHud();
}
const cropStamp=()=>C.started?cDate():'—';
function cHud(){
  const D=d3.sum(nodes,n=>n.cD),hungry=d3.sum(nodes.filter(n=>n.cGap>.15),n=>n.cH);
  $('cDate').textContent=C.started?cDate():'Oct 2026';
  $('cCrop').textContent=C.started?C.active.map(c=>CROPNAME[c]).join(' + '):'–';
  $('cLoss').textContent=(C.loss*100).toFixed(C.loss<.1?1:0)+'%';
  $('cPrice').textContent='×'+C.price.toFixed(2);
  $('cHungry').textContent=fmt(hungry);$('cDead').textContent=fmt(D);
  $('cFamine').textContent=`${nodes.filter(n=>n.cGap>.3).length}/${nodes.length}`;
  $('cRiot').textContent=`${nodes.filter(n=>n.cU!=null).length} · ${nodes.filter(n=>n.cC!=null).length}`;
}
function cropTip(n){
  const d=n.diet,mix=Object.keys(CROPNAME).filter(c=>d[c]).map(c=>`${CROPNAME[c]} ${Math.round(d[c]*100)}%`).join(', ');
  return `<b>${n.name}</b><br>${fmt(n.cH)} people`+(n.cI>0?`<br><span style="color:rgb(${RUST})">blight in ${Math.round(n.cI*100)}% of fields</span>`:'')+
    `<br>food gap <b>${Math.round(n.cGap*100)}%</b>`+(n.cD>=1?`<br>${fmt(n.cD)} dead from hunger`:'')+
    (n.cC!=null?'<br><span style="color:#ff6e28">GOVERNMENT FALLEN</span>':n.cU!=null?'<br><span style="color:#ff6e28">bread riots</span>':'')+
    `<br><span style="opacity:.6">${n.country} · diet: ${mix||'mixed'} · imports ${Math.round(d.imp*100)}% of staples · ${n.lat>=0?'north':'south'}ern hemisphere</span>`+
    (!C.started&&!BLIGHTS[$('cblight').value].climate?'<br><span style="color:#ff2a6d">click to start the blight here</span>':'');
}

function cropDraw(c){
  const now=performance.now();
  // countries tinted by hunger: amber → dried-blood brown
  for(const co of countries){if(!co.nodes.length)continue;const g=d3.mean(co.nodes,n=>n.cGap);
    if(g>.02){ctx.beginPath();path(co);ctx.fillStyle=g>.3?`rgba(140,50,30,${Math.min(.6,.2+g)})`:`rgba(220,160,50,${.06+g})`;ctx.fill()}}
  // dust storms over failed farmland (drought + the Interstellar blight)
  if(C.B&&(C.B.fiction||C.B.climate))for(const n of nodes){if(n.cI<.3||!front(n.ll))continue;
    for(let k=0;k<5;k++){const ll=dest(n.ll,60+k*40+30*Math.sin(now/1500+k+n.i),(now/80+k*72+n.i*13)%360);if(!front(ll))continue;
      const [x,y]=proj(ll);ctx.beginPath();ctx.arc(x,y,6+n.cI*14,0,7);ctx.fillStyle=`rgba(${DUST},${.12*n.cI})`;ctx.fill()}}
  // spore drift and refugee lines
  C.spores=C.spores.filter(s=>now-s.rt0<3000);C.flows=C.flows.filter(f=>now-f.rt0<3000);
  for(const [list,col,dash] of [[C.spores,RUST,[2,4]],[C.flows,FLEE,[1,3]]])for(const s of list){
    const p=Math.min(1,(now-s.rt0)/2000),fade=p<1?1:1-(now-s.rt0-2000)/1000,N=Math.max(6,Math.round(s.d/200));
    ctx.beginPath();let pen=false,head=null;
    for(let k=0;k<=N;k++){const ll=s.ip(p*k/N);if(!front(ll)){pen=false;continue}const [x,y]=proj(ll);pen?ctx.lineTo(x,y):ctx.moveTo(x,y);pen=true;head=k===N?[x,y]:null}
    ctx.setLineDash(dash);ctx.lineWidth=1.5;ctx.strokeStyle=`rgba(${col},${.8*fade})`;ctx.stroke();ctx.setLineDash([]);
    if(head&&p<1){ctx.beginPath();ctx.arc(head[0],head[1],3.5,0,7);ctx.fillStyle='#fff';ctx.shadowColor=`rgb(${col})`;ctx.shadowBlur=10;ctx.fill();ctx.shadowBlur=0}
  }
  // regions
  for(const n of nodes){
    if(!front(n.ll))continue;const [x,y]=proj(n.ll);
    if(n.cI>0){const r=3+12*n.cI;ctx.beginPath();ctx.arc(x,y,r+3,0,7);ctx.fillStyle=`rgba(${RUST},.12)`;ctx.fill();
      ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.strokeStyle=`rgba(${RUST},${.4+.5*n.cI})`;ctx.lineWidth=1.5;ctx.stroke()}
    if(n.cU!=null){const fl=.5+.5*Math.random(),r=11+6*n.cI;ctx.beginPath();for(let k=0;k<=16;k++){const a=k/16*Math.PI*2,rr=r+(k%2?3:0)*fl;ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}
      ctx.lineWidth=1.3;ctx.strokeStyle=`rgba(${RIOT},${n.cC!=null?.95:.5+.4*fl})`;ctx.stroke();
      if(n.cC!=null){ctx.beginPath();ctx.moveTo(x-4,y-4);ctx.lineTo(x+4,y+4);ctx.moveTo(x+4,y-4);ctx.lineTo(x-4,y+4);ctx.lineWidth=2;ctx.stroke()}}
    ctx.fillStyle=n.cGap>.3?'#c0502a':n.cGap>.1?'#dca032':n.village?'#f5b700':'#19e6c1';ctx.beginPath();ctx.arc(x,y,1.7,0,7);ctx.fill();
    if(n===C.origin&&!C.B?.climate||n===hover||zoom>2.5){ctx.font='11px "Share Tech Mono"';ctx.fillStyle=n===C.origin?`rgb(${RUST})`:'rgba(200,255,245,.8)';ctx.fillText(n.name.split(',')[0],x+6,y-5)}
  }
  // equator line, faint — the barrier the spores rarely cross
  ctx.beginPath();path({type:'LineString',coordinates:d3.range(-180,181,5).map(l=>[l,0])});ctx.setLineDash([2,6]);ctx.strokeStyle='rgba(220,160,50,.25)';ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);
}

if(land)cropInit();
