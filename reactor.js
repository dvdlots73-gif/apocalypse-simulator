// ---------- REACTOR MELTDOWN ----------
// Civilian nuclear-plant disaster (loss of cooling → core melt → radioactive release), à la Chernobyl 1986 /
// Fukushima 2011. Release in PBq of Cs-137-equivalent; deaths = acute + evacuation stress + long-term cancer
// (linear-no-threshold, emerging over ~10 years). NOT weapons — contamination and fallout only. Order-of-magnitude.
// Severity on the INES scale: 5 ≈ Three Mile Island (contained), 6, 7 ≈ Chernobyl/Fukushima (containment breach).
const INES=[
 {ines:5,name:'INES 5 — partial melt, contained',rel:.02,note:'Like Three Mile Island 1979: core damage, little escapes.'},
 {ines:6,name:'INES 6 — serious release',rel:.25,note:'Like Kyshtym 1957.'},
 {ines:7,name:'INES 7 — meltdown + containment breach',rel:1,note:'Like Chernobyl 1986 / Fukushima 2011: the worst on the scale.'},
];
// 20 of the world's largest nuclear plants by net capacity, + Chernobyl & Fukushima Daiichi. [name, lat, lon, GW]
const PLANTS_R=[
 ['Kashiwazaki-Kariwa, Japan',37.43,138.60,7.9],['Kori / Shin-Kori, South Korea',35.32,129.29,7.5],
 ['Bruce, Canada',44.32,-81.60,6.8],['Hongyanhe, China',39.80,121.48,6.7],['Tianwan, China',34.69,119.46,6.7],
 ['Yangjiang, China',21.71,112.26,6.5],['Hanul (Uljin), South Korea',37.09,129.38,6.2],
 ['Hanbit (Yeonggwang), South Korea',35.42,126.42,6.1],['Zaporizhzhia, Ukraine',47.51,34.59,5.7],
 ['Gravelines, France',51.01,2.14,5.5],['Paluel, France',49.86,0.63,5.3],['Cattenom, France',49.42,6.22,5.2],
 ['Fuqing, China',25.45,119.45,5.1],['Fukushima Daini, Japan',37.32,141.02,4.4],
 ['Vogtle, USA',33.14,-81.76,4.5],['Rostov, Russia',47.60,42.38,4.0],['Balakovo, Russia',52.09,47.95,4.0],
 ['Palo Verde, USA',33.39,-112.86,3.9],['Browns Ferry, USA',34.70,-87.12,3.8],['Taishan, China',21.92,112.97,3.5],
 ['Fukushima Daiichi, Japan',37.42,141.03,4.7],['Chernobyl, Ukraine',51.39,30.10,4.0],
];
const RAD='120,230,80';
let R={ready:false};

function reactorInit(){
  if(R.ready)return;R.ready=true;if(!mask)buildMask();
  const tgt=$('rtarget');tgt.add(new Option('⚡ Grid blackout — ALL 22 plants melt down',-1));tgt.add(new Option('🎲 Random single plant',-2));
  const g=document.createElement('optgroup');g.label='SINGLE PLANT (largest first)';
  PLANTS_R.forEach((p,i)=>g.append(new Option(`${p[0]} · ${p[3]} GW`,i)));tgt.append(g);
  tgt.value=21; // Chernobyl by default
  INES.forEach((s,i)=>$('rines').add(new Option(s.name,i)));$('rines').value=2;
  $('rines').onchange=$('rtarget').onchange=()=>{reactorPick();reactorReset()};
  reactorPick();reactorReset();
}
function reactorPick(){
  const v=+$('rtarget').value,s=INES[+$('rines').value];
  if(v>=0){const p=PLANTS_R[v];M.target={name:p[0].split(',')[0],ll:[p[2],p[1]]};flyTo=[-p[2],-p[1]]}
  else{M.target={name:v===-1?'ALL 22 plants (grid blackout)':'Random plant',ll:v===-1?[30,45]:null};if(v===-1)flyTo=[-30,-45]}
  const big=v<0;
  $('rinfo').innerHTML=`${s.note}<br>${big?(v===-1?'Every plant loses cooling at once — a cascade of meltdowns.':'A single plant chosen at random.'):`Release ~<em>${fmt(PLANTS_R[v][3]*22*s.rel)} PBq</em> of Cs-137 · fallout blows downwind (east)`}`;
}
// downwind deposition lobe (prevailing westerlies push the plume east), Gaussian across-wind
function lobe(site,ll){
  const d=kmTo(site.ll,ll);if(d>site.Rc)return 0;
  const br=bearing(site.ll,ll),along=d*Math.cos((br-90)*DEG),cross=d*Math.sin((br-90)*DEG);
  return (along<0?.12:1)*Math.exp(-Math.abs(along)/(site.Rc/3))*Math.exp(-cross*cross/(2*(site.Rc/5)**2));
}
function reactorReset(){
  if(!R.ready)return;
  meteorReset();M.kind='reactor';M.state='armed';
  nodes.forEach(n=>{n.rDose=0;n.rEvac=false});
  reactorPick();meteorHud();reactorHud();
}
function reactorStart(){
  const v=+$('rtarget').value,sev=INES[+$('rines').value],now=performance.now();
  $('rines').disabled=$('rtarget').disabled=$('mchaos').disabled=$('mdis').disabled=true;
  let list;
  if(v===-1)list=PLANTS_R.map((p,i)=>({p,meltAt:i<20?Math.random()*72:999}));      // cascade over ~3 days; the two historic sites spared
  else if(v===-2)list=[{p:PLANTS_R[Math.random()*20|0],meltAt:0}];
  else list=[{p:PLANTS_R[v],meltAt:0}];
  M.sites=list.map(({p,meltAt})=>{
    const rel=p[3]*22*sev.rel,Rc=250*Math.pow(rel/88,.4),Re=30*Math.pow(rel/88,.4);
    return {name:p[0],ll:[p[2],p[1]],gw:p[3],rel,Rc,Re:Math.max(10,Re),meltAt,done:false};
  });
  Object.assign(M,{kind:'reactor',state:'impact',s:0,t:0,tPrev:0,flash:now,logged:{},size:{d:0},
    P:{Mt:0,quake:0,crater:0},target:M.target,dim:0,dT:0,winter:0,famine:0,pulse:0,
    D0:0,slow:0,slowDur:87600,displaced:0,released:0,tBlast:1,end:87600});
  M.famine=v===-1?.004:0; // many contaminated breadbaskets at once → some food shortage
  const norm=d3.sum(nodes,n=>(.6+.8*n.frag)*n.N)/WORLD;nodes.forEach(n=>n.fw=(.6+.8*n.frag)/norm);
  log(v===-1?'<b>⚡ Station blackout — 20 reactors lose cooling at once</b>':`<b>☢ Meltdown begins at ${M.sites[0].name}</b>`);
}
function meltSite(site){
  site.done=true;M.released+=site.rel;
  let acute=50*site.rel/88,evac=0,cancer=0,disp=0;
  const land=r=>{let lf=0;for(let k=0;k<8;k++)lf+=isLand(dest(site.ll,r,k*45))?1:0;return lf/8};
  // exclusion zone: everyone within Re is evacuated (rural density + any mapped city)
  const ez=Math.PI*site.Re*site.Re*land(site.Re*.6)*RURAL;disp+=ez;
  for(const n of nodes){
    const e=lobe(site,n.ll);if(e<=0)continue;const d=kmTo(site.ll,n.ll);
    n.rDose=Math.min(1,n.rDose+e);
    if(d<site.Re&&!n.rEvac){n.rEvac=true;disp+=n.N}
    cancer+=n.N*.012*e; // eventual cancers (LNT); coefficient tuned so Chernobyl ≈ WHO estimate
    if(d<15)acute+=n.m*1e6*.02*e;
  }
  for(let i=0;i<24;i++){const a=site.Rc*i/24,b=site.Rc*(i+1)/24,mid=(a+b)/2,e=lobe(site,dest(site.ll,mid,90));
    cancer+=RURAL*Math.PI*(b*b-a*a)*.5*land(mid)*.012*e}
  evac=disp*.012*(.5+.7*d3.mean(nodes,n=>n.frag)); // evacuation-stress deaths
  M.displaced+=disp;
  M.D0+=acute+evac;M.slow+=cancer;
  log(`<span style="color:rgb(${RAD})">☢ ${site.name.split(',')[0]} melts down — ${fmt(site.rel)} PBq released, ${fmt(M.displaced)} displaced so far</span>`);
}
function reactorTick(){
  for(const site of M.sites)if(!site.done&&site.meltAt<=M.t)meltSite(site);
  const once=(k,c,msg)=>{if(c&&!M.logged[k]){M.logged[k]=1;log(msg)}};
  once('plume',M.t>6&&M.released>0,`☁ Fallout plumes drift downwind — exclusion zones and farmland bans spread`);
  once('cancer',M.t>8760,`🩺 Cancers climbing across the contaminated zones — a toll that mounts for decades`);
  once('food',M.famine&&M.t>720,'🌾 Contaminated farmland condemned across several countries — food shortages');
}
function reactorHud(){
  $('rRel').textContent=M.released?fmt(M.released)+' PBq':'–';
  $('rMelt').textContent=M.sites?`${M.sites.filter(s=>s.done).length}/${M.sites.length}`:'–';
  $('rDisp').textContent=fmt(M.displaced||0);
  for(const id of ['mE','mQuake','mWave','mSun','mTemp'])$(id).textContent='–';
}
function reactorTip(n){
  const d=M.target&&M.target.ll?kmTo(M.target.ll,n.ll):0;
  return `<b>${n.name}</b><br>${fmt(n.N)} people`+
    (n.rEvac?'<br><span style="color:'+`rgb(${RAD})`+'">EVACUATED — inside an exclusion zone</span>':'')+
    (n.rDose>.01?`<br><span style="color:rgb(${RAD})">contamination ${n.rDose<.1?'light':n.rDose<.4?'moderate':'heavy'} (dose ${(n.rDose*100).toFixed(0)}%)</span>`:'')+
    (n.mDis?`<br><span style="color:#ff2a6d">${OUTBREAKS[n.mDis.type].name} in evacuation camps</span>`:'')+
    (n.mC!=null?'<br><span style="color:#ff6e28">ORDER COLLAPSED</span>':'')+
    `<br><span style="opacity:.6">${n.country} · fragility ${n.fsi}/120</span>`;
}
function reactorLayer(c){
  const t=M.t,now=performance.now();
  for(const site of M.sites){
    if(!front(site.ll))continue;const [x,y]=proj(site.ll);
    if(!site.done){ // armed plant: small amber marker
      ctx.font='12px sans-serif';ctx.fillStyle='rgba(255,225,77,.6)';ctx.fillText('⚛',x-6,y+4);continue;
    }
    const grow=Math.min(1,(t-site.meltAt)/48);
    // downwind contamination lobe (teardrop pointing east), drawn as stacked offset ellipses
    for(let k=4;k>=1;k--){
      const reach=site.Rc*grow*k/4,e=dest(site.ll,reach*.5,90);if(!front(e))continue;
      ctx.beginPath();path(circle(dest(site.ll,reach*.45,90),reach*.55));ctx.fillStyle=`rgba(${RAD},${.05+.05*k})`;ctx.fill();
    }
    // exclusion zone
    ctx.beginPath();path(circle(site.ll,site.Re));ctx.strokeStyle=`rgba(${RAD},.9)`;ctx.lineWidth=1.5;ctx.setLineDash([3,3]);ctx.stroke();ctx.setLineDash([]);
    // glowing core + ☢
    const pul=.6+.4*Math.sin(now/200);ctx.beginPath();ctx.arc(x,y,4+2*pul,0,7);ctx.fillStyle='#fff';ctx.shadowColor=`rgb(${RAD})`;ctx.shadowBlur=16*pul;ctx.fill();ctx.shadowBlur=0;
    ctx.font='12px sans-serif';ctx.fillStyle=`rgb(${RAD})`;ctx.fillText('☢',x-6,y-6);
  }
  // cities
  for(const n of nodes){
    if(!front(n.ll))continue;const [x,y]=proj(n.ll);
    if(n.mDis&&M.t-n.mDis.t0<n.mDis.dur){const r=5+2*Math.sin(now/300+n.i);ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.strokeStyle='rgba(255,42,109,.8)';ctx.lineWidth=1.3;ctx.stroke()}
    if(n.mU!=null){const fl=.5+.5*Math.random();ctx.beginPath();for(let k=0;k<=16;k++){const a=k/16*Math.PI*2,rr=8+(k%2?3:0)*fl;ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}ctx.lineWidth=1.3;ctx.strokeStyle=`rgba(${RIOT},${n.mC!=null?.9:.5+.3*fl})`;ctx.stroke()}
    ctx.fillStyle=n.rEvac?`rgb(${RAD})`:n.rDose>.1?'#8aa85a':n.village?'#f5b700':'#19e6c1';ctx.beginPath();ctx.arc(x,y,1.6,0,7);ctx.fill();
    if(n===hover||zoom>2.5){ctx.font='11px "Share Tech Mono"';ctx.fillStyle='rgba(200,255,245,.8)';ctx.fillText(n.name.split(',')[0],x+6,y-5)}
  }
}
if(land)reactorInit();
