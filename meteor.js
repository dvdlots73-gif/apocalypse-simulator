// ---------- METEOR IMPACT ----------
// Scaling: Collins, Melosh & Marcus (2005) "Earth Impact Effects Program" (crater, energy, seismic).
// Blast/thermal radii: nuclear-test scaling (5 psi ≈ 4.6 km·Mt^⅓, 1 psi ≈ 12 km·Mt^⅓, burns ≈ 6 km·Mt^0.41).
// Climate tiers: Toon et al. 1997, Chapman & Morrison 1994 (~2 km global threshold), Brugger et al. 2017 (Chicxulub −26 °C).
// Impactor: stony, 3,000 kg/m³, 20 km/s, 45°. Everything here is order-of-magnitude.
const MT=4.184e15, HALF=Math.PI*ER, DEG=Math.PI/180, RURAL=46; // people/km² of land outside the mapped cities
// clim: [sunlight blocked %, global ΔT °C, years of winter, famine share of survivors, global firestorm share]
const SIZES=[
 {d:20,name:'Chelyabinsk-class',every:'~50 years',note:'Airburst like Russia 2013: windows blown out across a city, ~1,500 injured.',air:{r2:0,r3:60,l2:0,l3:.000005}},
 {d:50,name:'Tunguska-class',every:'~1,000 years',note:'Airburst like Siberia 1908: 2,000 km² of forest flattened.',air:{r2:21,r3:55,l2:.5,l3:.02}},
 {d:140,name:'City killer',every:'~20,000 years',note:'NASA “potentially hazardous” size. Only ~40% of these have been found.'},
 {d:370,name:'Apophis-class',every:'~80,000 years',note:'Size of Apophis, which passes closer than our GPS satellites on 13 Apr 2029.',clim:[3,-.3,.5,0,0]},
 {d:1000,name:'Regional devastator',every:'~500,000 years',note:'Erases a country; a year of global cooling.',clim:[15,-2,1,.02,0]},
 {d:2000,name:'Civilization breaker',every:'~1 million years',note:'Past the ~2 km global-catastrophe threshold: harvests fail worldwide.',clim:[50,-8,3,.25,0]},
 {d:5000,name:'Mass extinction',every:'~10 million years',note:'Ejecta rains back down across the planet. Years of darkness.',clim:[85,-15,6,.6,.03]},
 {d:10000,name:'Chicxulub — dinosaur killer',every:'~100 million years',note:'66 million years ago: 75% of all species gone.',clim:[99,-26,10,.95,.25]},
 {d:50000,name:'Complex-life extinction',every:'none in 3.5 billion years',note:'The sky itself ignites. Nothing larger than a microbe survives on land.',clim:[100,'+300',100,1,1]},
 {d:500000,name:'Planet sterilizer (Vesta-size)',every:'not since ~4 billion years ago',note:'Rock-vapour atmosphere; the oceans boil away.',clim:[100,'+2000',1000,1,1]},
];
const OCEANS=[ // [name, lat, lon, depth m]
 ['Pacific Ocean (central)',20,-150,4500],['North Atlantic',35,-45,4000],['South Atlantic',-25,-15,4000],['Indian Ocean',-15,75,4000],
 ['Arctic Ocean',84,-30,3500],['Mediterranean Sea',35,18,3000],['Gulf of Mexico',25,-90,1600],['South China Sea',14,115,1200],
 ['North Sea (shallow)',56,3,95],['Tasman Sea',-38,160,4000]];
const TARGET_CITIES=['Jakarta','Dhaka','Tokyo','New Delhi','Shanghai','Cairo','Manila','Mumbai','Beijing','São Paulo','Mexico City','Lagos',
 'Istanbul','Moscow','London','Paris','New York','Los Angeles','Kinshasa','Sydney'];

// Share of each size class already found by NEO surveys (NASA, ~2024); an unfound one arrives unannounced
const DETECTED=[.01,.02,.4,.7,.95,.99,1,1,1,1];
// Kinetic-impactor (DART-style) deflection success with >=5 years' notice, by size
const DEFLECT=[1,1,.9,.8,.5,.3,.1,.03,0,0];
// Share of people in the blast/heat/tsunami zone who get out, by warning time (hours)
const evacFor=h=>h<=0?0:h<=24?.15:h<=24*14?.5:h<8760?.85:.95;
const logu=(a,b)=>Math.exp(Math.log(a)+Math.random()*(Math.log(b)-Math.log(a)));
const wfmt=h=>h<48?`${Math.round(h)} hours`:h<24*60?`${Math.round(h/24)} days`:h<8760*2?`${Math.round(h/730)} months`:`${(h/8760).toFixed(0)} years`;
// Post-disaster epidemics among survivors (cf. Haiti 2010 cholera, Surat 1994 plague after flood + quake).
// cfrU untreated / cfrT with basic care; care collapses when the state does.
const OUTBREAKS={
  cholera:{name:'Cholera',cfrU:.25,cfrT:.01,why:'flooded, contaminated water'},
  typhoid:{name:'Typhoid',cfrU:.15,cfrT:.01,why:'sewage seeping through the rubble'},
  measles:{name:'Measles',cfrU:.1,cfrT:.01,why:'packed refugee camps'},
  plague:{name:'Plague',cfrU:.5,cfrT:.1,why:'rats feeding on the dead and the starving'},
};
const famineRamp=t=>M.winter?Math.min(1,Math.max(0,(t-720)/(M.winter*.8*8760+4380))):0;
let M={}; // current impact state
const mtfmt=x=>x<1?Math.round(x*1000)+' kt':fmt(x)+' Mt';
// land mask: rasterise the map once to a 0.5° grid; geoContains is ~1 ms per call and impacts need thousands
let mask;
function buildMask(){
  const w=720,h=360,cv=new OffscreenCanvas(w,h),g=cv.getContext('2d');
  g.fillStyle='#fff';g.beginPath();d3.geoPath(d3.geoEquirectangular().fitSize([w,h],{type:'Sphere'}),g)(land);g.fill();
  mask=g.getImageData(0,0,w,h).data;
}
const isLand=([lon,lat])=>{const x=Math.min(719,Math.max(0,((lon+540)%360)*2|0)),y=Math.min(359,Math.max(0,(90-lat)*2|0));return mask[(y*720+x)*4+3]>127};
function dest([lon,lat],km,brg){ // point km away along bearing
  const d=km/ER,b=brg*DEG,p1=lat*DEG,l1=lon*DEG;
  const p2=Math.asin(Math.sin(p1)*Math.cos(d)+Math.cos(p1)*Math.sin(d)*Math.cos(b));
  return [(l1+Math.atan2(Math.sin(b)*Math.sin(d)*Math.cos(p1),Math.cos(d)-Math.sin(p1)*Math.sin(p2)))/DEG,p2/DEG];
}
function bearing([lo1,la1],[lo2,la2]){
  const p1=la1*DEG,p2=la2*DEG,dl=(lo2-lo1)*DEG;
  return Math.atan2(Math.sin(dl)*Math.cos(p2),Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl))/DEG;
}
const kmTo=(a,b)=>d3.geoDistance(a,b)*ER;
const circle=(ll,km)=>d3.geoCircle().center(ll).radius(Math.min(179.9,km/ER/DEG)).precision(2)();

function physics(s,water,depth){
  const L=s.d,v=2e4,E=.5*3000*Math.PI/6*L**3*v*v,Mt=E/MT,k=Mt**(1/3);
  const tc=(rho)=>1.161*(3000/rho)**(1/3)*L**.78*v**.44*9.81**-.22*Math.SQRT1_2**(1/3)/1000; // transient crater km
  const fin=D=>D*1.25<3.2?D*1.25:1.17*D**1.13/3.2**.13; // simple vs complex final crater
  const Dw=tc(1000), cavity=Dw*1000/2.8; // water cavity depth m
  const seabed=!water||cavity>depth*1.5;
  const crater=s.air?0:seabed?fin(tc(2500)):0;
  const cap=r=>Math.min(HALF,r);
  return {E,Mt,crater,Dw,cavity,seabed,quake:.67*Math.log10(E)-5.87,
    r1:cap(crater*.75),r2:cap(s.air?s.air.r2:4.6*k),r3:cap(s.air?s.air.r3:12*k),rT:s.air?0:cap(Math.min(3000,6*Mt**.41)),
    l2:s.air?s.air.l2:.5,l3:s.air?s.air.l3:.05};
}
function lethality(P,d){
  let l=0;
  if(d<P.r1)l=1;
  if(d<P.r2)l=Math.max(l,P.l2);
  if(d<P.rT)l=Math.max(l,.3);
  if(d<P.r3)l=Math.max(l,P.l3);
  return l;
}

function meteorInit(){
  if(M.ready)return;M.ready=true;buildMask();
  SIZES.forEach((s,i)=>$('msize').add(new Option(`${i+1}. ${s.d>=1000?s.d/1000+' km':s.d+' m'} — ${s.name}`,i)));
  $('msize').value=2;
  const sel=$('mtarget');sel.add(new Option('🎲 Random location','random'));
  let g=document.createElement('optgroup');g.label='20 CITIES';
  TARGET_CITIES.forEach(n=>g.append(new Option(n,'c:'+n)));sel.append(g);
  g=document.createElement('optgroup');g.label='10 OCEANS & SEAS';
  OCEANS.forEach((o,i)=>g.append(new Option(`${o[0]} · ${o[3].toLocaleString()} m deep`,'o:'+i)));sel.append(g);
  sel.value='c:New York';
  $('msize').onchange=()=>{meteorInfo();meteorReset()};
  sel.onchange=()=>{pickTarget();meteorReset()};
  $('mgo').onclick=launch;$('mreset').onclick=meteorReset;
  pickTarget();meteorInfo();meteorReset();
  typeof quakeInit==='function'&&quakeInit();
}
function meteorInfo(){
  const s=SIZES[$('msize').value],P=physics(s,false,0);
  $('minfo').innerHTML=`ENERGY <em>${mtfmt(P.Mt)}</em> · <em>${fmt(P.Mt/.015)}×</em> Hiroshima<br>`+
    `${s.air?'<em>Airburst</em> — explodes before reaching the ground':`CRATER <em>${P.crater<1?(P.crater*1000).toFixed(0)+' m':P.crater.toFixed(0)+' km'}</em> on land`}`+
    ` · HITS EARTH <em>${s.every}</em><br>${s.note}`;
}
function pickTarget(){
  const v=$('mtarget').value;
  if(v.startsWith('c:')){const n=nodes.find(n=>n.name===v.slice(2));M.target={name:n.name,ll:n.ll,water:false}}
  else if(v.startsWith('o:')){const o=OCEANS[+v.slice(2)];M.target={name:o[0],ll:[o[2],o[1]],water:true,depth:o[3]}}
  else M.target={name:'Random',random:true};
  if(M.target.ll)flyTo=[-M.target.ll[0],-M.target.ll[1]];
}
function meteorClick(e){
  if(M.state!=='armed'||mode==='quake')return;
  const ll=proj.invert([e.clientX,e.clientY]);if(!ll||!front(ll))return;
  const water=!isLand(ll);
  M.target={name:`${Math.abs(ll[1]).toFixed(1)}°${ll[1]>=0?'N':'S'} ${Math.abs(ll[0]).toFixed(1)}°${ll[0]>=0?'E':'W'} (${water?'ocean':'land'})`,ll,water,depth:3700};
  $('mtarget').value='random';log(`🎯 Target set: ${M.target.name}`);
}
function meteorReset(){
  Object.assign(M,{kind:mode,winter:0,famine:0,pulse:0,after:[],nukes:[],flashes:[],state:'armed',flows:[],tPrev:0,warnH:0,evac:0,deflected:false,wDart:0,wFood:0,wEvac:0,dim:0,dT:0,A0:0,t:0,s:0,u:0,events:[],fires:[],deaths:0,D0:0,tsu:0,maxWave:0,ended:false,P:null,flash:0});
  nodes.forEach(n=>{n.mL=0;n.mH=0;n.mArr=null;n.mDead=0;n.mTsu=0;n.mFlash=0;n.mU=n.mC=n.mDis=null;n.mStress=0;n.fw=1;n.qMMI=0});
  $('log').innerHTML='';$('banner').style.display='none';$('mgo').disabled=false;$('msize').disabled=$('mtarget').disabled=$('mwarn').disabled=$('mchaos').disabled=$('mdis').disabled=$('qmag').disabled=$('qfault').disabled=false;
  $('mgo').textContent=mode==='quake'?'🌐 RUPTURE':mode==='volcano'?'🌋 ERUPT':mode==='reactor'?'☢ MELTDOWN':'☄ IMPACT';
  meteorHud();
}

function launch(){
  if(M.state!=='armed')return;
  $('mgo').disabled=$('mchaos').disabled=$('mdis').disabled=true;
  if(mode==='quake')return quakeStart();
  if(mode==='volcano')return volcanoStart();
  if(mode==='reactor')return reactorStart();
  if(M.target.random){
    const u=Math.random(),v=Math.random(),ll=[v*360-180,Math.asin(2*u-1)/DEG],water=!isLand(ll);
    M.target={name:`Random: ${Math.abs(ll[1]).toFixed(1)}°${ll[1]>=0?'N':'S'} ${Math.abs(ll[0]).toFixed(1)}°${ll[0]>=0?'E':'W'} (${water?'ocean':'land'})`,ll,water,depth:3700};
  }
  flyTo=[-M.target.ll[0],-M.target.ll[1]];
  const i=+$('msize').value,w=$('mwarn').value;M.size=SIZES[i];M.u=0;M.wu=0;
  $('mgo').disabled=$('msize').disabled=$('mtarget').disabled=$('mwarn').disabled=$('mchaos').disabled=true;
  const h=w==='nasa'?(Math.random()<DETECTED[i]?(i<=1?logu(6,72):i<=3?logu(720,87600):logu(17520,438000)):0):+w;
  M.warnH=h;M.evac=evacFor(h);M.deflected=h>=8760*5&&Math.random()<DEFLECT[i];
  const nm=`${M.size.d>=1000?M.size.d/1000+' km':M.size.d+' m'} asteroid`;
  if(h>0){M.state='warning';log(`📡 ${nm} detected — impact predicted at <span style="color:#fff">${M.target.name}</span> in ${wfmt(h)}`)}
  else{M.state='incoming';log(`☄ ${nm} inbound → <span style="color:#fff">${M.target.name}</span> — <b>never detected, no warning</b>`+(w==='nasa'?` (only ${Math.round(DETECTED[i]*100)}% of this size have been found)`:''))}
}

function impact(){
  const s=M.size,T=M.target,P=physics(s,T.water,T.depth||0);M.P=P;M.state='impact';M.s=0;M.flash=performance.now();
  // --- local blast/heat deaths: mapped cities (metro pop spread over a disc) + rural land population ---
  let D0=0;
  for(const n of nodes){
    const d=kmTo(T.ll,n.ll),rc=6*Math.sqrt(n.m);
    let l=lethality(P,d);for(let k=0;k<6;k++)l+=lethality(P,kmTo(T.ll,dest(n.ll,rc*.7,k*60)));l/=7;
    n.mL=l;n.mDead=n.m*1e6*l*(1-M.evac);D0+=n.m*1e6*l;
  }
  const Rmax=Math.max(P.r1,P.r2,P.r3,P.rT),RINGS=40;
  for(let i=0;i<RINGS;i++){
    const a=Rmax*i/RINGS,b=Rmax*(i+1)/RINGS,mid=(a+b)/2,area=2*Math.PI*ER*ER*(Math.cos(a/ER)-Math.cos(b/ER));
    let lf=0;for(let k=0;k<10;k++)lf+=isLand(dest(T.ll,mid,k*36+i*7))?1:0;
    D0+=RURAL*area*lf/10*lethality(P,mid);
  }
  M.saved=D0*M.evac;M.D0=Math.min(WORLD,D0*(1-M.evac));
  M.tBlast=Math.max(.05,P.r3/1200); // blast wave ~ speed of sound
  // --- climate ---
  const c=s.clim||[0,0,0,0,0],soft=T.water&&!P.seabed&&s.d<10000?.5:1; // deep-ocean hits throw up less dust (more steam)
  M.dim=c[0]/100*soft;M.dT=typeof c[1]==='number'?c[1]*soft:c[1];M.winter=c[2];M.pulse=c[4];
  M.famine=c[3]*soft*(M.warnH>=8760?.75:M.warnH>=4380?.9:1); // stockpiles bought with months/years of notice
  // famine falls hardest on fragile states (food prices, no reserves); weights average to 1 across the world
  const norm=d3.sum(nodes,n=>(.6+.8*n.frag)*n.N)/WORLD;nodes.forEach(n=>n.fw=(.6+.8*n.frag)/norm);
  M.end=M.winter?Math.min(30,M.winter*2+1)*8760:48;
  // --- tsunami: wave from water cavity, decays ~1/r; 2× run-up on the coast; continents cast shadows ---
  if(T.water&&!s.air){
    const A0=Math.min(P.cavity/2,T.depth),Rc=P.Dw/2,c=3.6*Math.sqrt(9.81*T.depth);
    Object.assign(M,{A0,Rc,c,amp:r=>A0*Math.min(1,Rc/Math.max(r,.1))});
    for(const n of nodes){
      if(!n.port)continue;
      const d=kmTo(T.ll,n.ll);if(d<P.r1)continue;
      const ip=d3.geoInterpolate(T.ll,n.ll),stop=1-Math.min(.1,300/d);
      let blocked=false;for(let k=1;k<24&&!blocked;k++){const u=k/24*stop;if(u>.02&&isLand(ip(u)))blocked=true}
      const H=2*M.amp(d)*(blocked?.15:1);if(H<.5)continue;
      const exposed=Math.min(.3,H/400)/Math.sqrt(Math.max(1,n.m/4)),leth=Math.min(.7,Math.max(0,(H-1)/25))*(.4+.6*n.frag); // flood-zone share · drills/seawalls
      const alive=n.m*1e6-n.mDead,ev=Math.max(M.evac,d/c>2?.3:0); // ocean-buoy tsunami alerts give distant coasts ~30% evacuation even unwarned
      const raw=alive*exposed*leth+(n.N-n.m*1e6)*.003*leth,dead=raw*(1-ev);M.saved+=raw*M.evac;
      M.events.push({t:d/c,n,H,dead,blocked});
    }
    M.events.sort((a,b)=>a.t-b.t);
    if(M.events.length)M.end=Math.max(M.end,M.events.at(-1).t+2);
  }
  // --- fires: inside the thermal zone, plus worldwide where re-entering ejecta heats the sky ---
  const fireR=P.rT||P.r2;
  for(let k=0;k<160&&fireR>0;k++){const ll=dest(T.ll,fireR*Math.sqrt(Math.random()),Math.random()*360);if(isLand(ll))M.fires.push({ll,t0:Math.random()*.2,dur:24+Math.random()*300})}
  if(M.pulse||s.d>=5000)for(let k=0;k<1500&&M.fires.length<700;k++){
    const u=Math.random(),ll=[Math.random()*360-180,Math.asin(2*u-1)/DEG];
    if(isLand(ll))M.fires.push({ll,t0:.3+kmTo(T.ll,ll)/8000,dur:48+Math.random()*600});
  }
  // --- log ---
  const hz=fmt(P.Mt/.015);
  log(`<b>☄ IMPACT</b> — ${mtfmt(P.Mt)} (${hz}× Hiroshima) ${s.air?'airburst over':'into'} <span style="color:#fff">${T.name}</span>`);
  if(P.crater)log(`🕳 ${T.water?'Seabed crater':'Crater'} ${P.crater.toFixed(P.crater<10?1:0)} km wide · magnitude ${P.quake.toFixed(1)} earthquake`);
  else if(T.water)log(`🌊 Water cavity ${(P.Dw).toFixed(1)} km wide, ${Math.round(P.cavity)} m deep — seabed not reached`);
  if(P.rT)log(`🔥 Thermal pulse: 3rd-degree burns out to ${fmt(P.rT)} km · buildings flattened to ${fmt(P.r2)} km`);
  else log(`💥 Shock wave: ${P.r2?`buildings flattened to ${fmt(P.r2)} km, `:''}windows shattered to ${fmt(P.r3)} km`);
  if(M.A0)log(`🌊 Tsunami: ${Math.round(M.A0)} m at source, travelling ${Math.round(M.c)} km/h`);
  if(M.saved>=1)log(`<span style="color:#19e6c1">🚌 Evacuation saved ~${fmt(M.saved)} lives in the impact zone and on the coasts</span>`);
  M.logged={};
}

// deaths at time t (hours)
function deathsAt(t){
  const blast=M.D0*Math.min(1,t/M.tBlast);
  let tsu=0;for(const e of M.events)if(e.done)tsu+=e.dead;
  const pulse=M.pulse*(WORLD-M.D0)*Math.min(1,Math.max(0,(t-.5)/36));
  const left=Math.max(0,WORLD-M.D0-tsu-M.pulse*(WORLD-M.D0));
  const ramp=famineRamp(t);
  let famine=0;if(M.famine)for(const n of nodes){const share=left*n.N/WORLD;famine+=Math.min(share,M.famine*n.fw*(n.mC!=null?1.35:1)*share*ramp)}
  let dis=0;for(const n of nodes)if(n.mDis)dis+=n.mDis.dead*Math.min(1,Math.max(0,(t-n.mDis.t0)/n.mDis.dur));
  const slow=(M.slow||0)*Math.min(1,Math.max(0,t/(M.slowDur||87600)));
  return Math.min(WORLD,blast+tsu+pulse+famine+dis+slow);
}
// sunlight blocked / temperature envelope: rises (hours for ejecta, weeks for dust), holds through the winter, then clears
function envelope(t){
  if(!M.dim)return 0;
  const rise=M.size.d>=5000?12:24*14,hold=M.winter*.6*8760,clear=M.winter*8760;
  return t<rise?t/rise:t<hold?1:t<hold+clear?1-(t-hold)/clear:0;
}

function meteorTick(dt){
  if(M.state==='warning'){
    M.wu+=dt/5;const h=M.warnH,once=(k,c,msg)=>{if(c&&!M[k]){M[k]=1;log(msg)}};
    once('wDart',M.wu>.2&&h>=8760*5,'🚀 Kinetic-impactor spacecraft launched to nudge it off course (DART-style)');
    once('wFood',M.wu>.35&&h>=4380,'🌾 Governments stockpile grain and seed');
    once('wEvac',M.wu>.55&&M.evac>0,`<span style="color:#19e6c1">🚌 Evacuating the impact zone — about ${Math.round(M.evac*100)}% expected to get out</span>`);
    if(M.wu>=1){
      if(M.deflected){M.state='miss';M.u=0;log('<span style="color:#19e6c1"><b>✅ DEFLECTION SUCCEEDED</b> — the asteroid misses Earth</span>');
        $('banner').innerHTML='DEFLECTED<br><small>NEAR MISS · 0 DEAD</small>';$('banner').style.display='block'}
      else{if(h>=8760*5)log(`❌ Deflection failed — too massive to move in time (${Math.round(DEFLECT[SIZES.indexOf(M.size)]*100)}% odds)`);M.state='incoming'}
    }
  }
  else if(M.state==='miss')M.u=Math.min(1.2,M.u+dt/2.5);
  else if(M.state==='incoming'){M.u+=dt/1.8;if(M.u>=1)impact();}
  else if(M.state==='impact'&&!M.ended){
    M.s+=dt*(.4+$('speed').value/10);
    M.t=Math.expm1(M.s*.35); // exponential clock: minutes → hours → days → years
    for(const e of M.events)if(!e.done&&e.t<=M.t){
      e.done=true;e.n.mH=e.H;e.n.mArr=e.t;e.n.mTsu=e.dead;e.n.mFlash=performance.now();M.maxWave=Math.max(M.maxWave,e.H);
      if(e.dead>=1||e.H>=3)log(`<span style="color:#5ab4ff">🌊 ${e.n.name} — ${e.H.toFixed(e.H<10?1:0)} m wave${e.blocked?' (sheltered by land)':''} · ${fmt(e.dead)} dead</span>`);
    }
    if(M.kind==='quake')quakeTick();
    else if(M.kind==='volcano')volcanoTick();
    else if(M.kind==='reactor')reactorTick();
    collapse(M.t-M.tPrev);outbreaks(M.t-M.tPrev);M.tPrev=M.t;
    const once=(k,cond,msg)=>{if(cond&&!M.logged[k]){M.logged[k]=1;log(msg)}};
    once('order',nodes.filter(n=>n.mC!=null).length>=nodes.length/2,'<b style="color:#ff6e28">☠ Global order has broken down — most governments have fallen</b>');
    once('blast',M.t>=M.tBlast&&M.D0>=1,M.kind==='quake'?`☠ ${fmt(M.D0)} killed by collapsing buildings, landslides and fire`:M.kind==='volcano'?`☠ ${fmt(M.D0)} killed by pyroclastic flows and ashfall`:M.kind==='reactor'?`☠ ${fmt(M.D0)} acute & evacuation deaths so far`:`☠ ${fmt(M.D0)} killed by blast, heat and ejecta`);
    once('pulse',M.pulse&&M.t>2,`<b>🔥 Ejecta re-entering worldwide — the sky glows like an oven, global firestorms</b>`);
    once('dim',M.dim>=.1&&envelope(M.t)>.9,`🌑 Dust, ash and soot block ${Math.round(M.dim*100)}% of sunlight`);
    once('cold',M.dim>=.1&&M.t>720,typeof M.dT==='number'?`❄ Impact winter: global temperature ${M.dT} °C — photosynthesis collapses, harvests fail`:`🌡 Surface temperature ${M.dT} °C — the planet is uninhabitable`);
    once('acid',M.kind==='meteor'&&M.size.d>=1000&&M.t>240,'🌧 Acid rain from shock-heated air (nitric acid) and vaporised rock (sulfuric acid)');
    once('famine',M.famine&&M.t>720*3,`🌾 Global famine — ${Math.round(M.famine*100)}% of survivors expected to starve`);
    once('sun',M.dim>=.1&&M.winter<50&&envelope(M.t)<.3&&M.t>M.winter*.6*8760,'🌤 Skies clearing — sunlight returning');
    if(M.t>=M.end){
      M.ended=true;const D=deathsAt(M.t);
      $('banner').innerHTML=`${D>=WORLD*.999?'HUMANITY EXTINCT':'AFTERMATH'} · ${tfmt(M.t)}<br><small>${fmt(D)} DEAD · ${(D/WORLD*100).toFixed(D/WORLD<.01?3:1)}% OF HUMANITY</small>`;
      $('banner').style.display='block';
    }
  }
  meteorHud();
}
// riots → collapse, rolled continuously; stress = local losses + famine + darkness + refugees arriving
function collapse(dtH){
  if(!$('mchaos').checked||dtH<=0)return;
  const ramp=famineRamp(M.t),dark=M.dim*envelope(M.t);
  for(const n of nodes){
    if(n.mL>=.5||n.mC!=null)continue; // destroyed outright, or already fallen
    const lost=(n.mDead+n.mTsu)/(n.m*1e6),stress=Math.min(1,3*lost+1.5*M.famine*ramp+.5*dark+n.mStress),f2=n.frag*n.frag,days=dtH/24;
    if(n.mU==null){if(Math.random()<1-Math.exp(-.05*f2*stress*days)){n.mU=M.t;flee(n,2,.1);log(`<span style="color:rgb(${RIOT})">⚠ Food riots in ${n.name} (FSI ${n.fsi})</span>`)}}
    else if(Math.random()<1-Math.exp(-.008*f2*stress*days)){n.mC=M.t;flee(n,3,.2);log(`<span style="color:rgb(${RIOT})"><b>☠ ORDER COLLAPSES in ${n.name}</b> (${n.country}) — refugees flood neighbours</span>`)}
  }
}
function flee(a,k,push){ // refugees head for the nearest places still standing, raising tension there
  nodes.filter(b=>b!==a&&b.mL<.5&&b.mC==null).sort((x,y)=>kmTo(a.ll,x.ll)-kmTo(a.ll,y.ll)).slice(0,k)
    .forEach(b=>{
      b.mStress=Math.min(.6,b.mStress+push);
      const sick=a.mDis&&M.t-a.mDis.t0<a.mDis.dur&&$('mdis').checked;
      if(sick&&!b.mDis&&Math.random()<.4)startOutbreak(b,a);
      M.flows.push({a,b,sick,ip:d3.geoInterpolate(a.ll,b.ll),d:kmTo(a.ll,b.ll),rt0:performance.now()});
    });
}
// epidemics: risk from damage, flooding, collapse, refugee crowding and famine; poor states hit hardest
function outbreaks(dtH){
  if(!$('mdis').checked||dtH<=0)return;
  const fam=M.famine*famineRamp(M.t);
  for(const n of nodes){
    if(n.mDis||n.mL>=.5)continue;
    const lost=(n.mDead+n.mTsu)/(n.m*1e6),risk=Math.min(1,10*lost+(n.mC!=null?1:n.mU!=null?.4:0)+n.mStress+fam)*(.3+.7*n.frag);
    if(risk>0&&Math.random()<1-Math.exp(-.02*risk*dtH/24))startOutbreak(n,null);
  }
}
function startOutbreak(n,from){
  const type=from?from.mDis.type:n.mTsu>0?'cholera':M.famine*famineRamp(M.t)>.05&&Math.random()<.4?'plague':n.mStress>.15?'measles':'typhoid';
  const D=OUTBREAKS[type],care=n.mC!=null?.3:.7+.3*(1-n.frag); // aid and clinics, unless the state has fallen
  const attack=.01+.06*n.frag+(n.mC!=null?.08:0),cfr=D.cfrT*care+D.cfrU*(1-care);
  // the stricken city; the wider region only joins in once famine or collapse spreads it
  const hit=Math.min(1,20*(n.mDead+n.mTsu)/(n.m*1e6)+n.mStress+(n.mC!=null?1:0)+M.famine*famineRamp(M.t)); // share of the city living in the wreckage/camps
  const base=Math.max(0,n.m*1e6-n.mDead-n.mTsu)*hit+(n.N-n.m*1e6)*Math.min(1,M.famine*famineRamp(M.t)+(n.mC!=null?.3:0));
  n.mDis={type,t0:M.t,dur:24*(60+Math.random()*120),dead:base*attack*cfr};
  log(`<span style="color:#ff2a6d">🦠 ${D.name} outbreak in ${n.name} — ${from?`carried by refugees from ${from.name}`:D.why} (~${fmt(n.mDis.dead)} deaths expected)</span>`);
}
const meteorStamp=()=>M.state==='impact'?tfmt(M.t):M.state==='warning'?'T−'+wfmt(M.warnH*(1-M.wu)**2):'T−0';
function tfmt(t){
  if(t<1)return `T+${Math.round(t*60)}m`;
  if(t<48)return `T+${Math.floor(t)}h ${Math.round(t%1*60)}m`;
  if(t<24*60)return `T+${Math.round(t/24)}d`;
  if(t<8760*2)return `T+${Math.round(t/730)} mo`;
  return `T+${(t/8760).toFixed(1)} yr`;
}
function meteorHud(){
  const on=M.state==='impact',P=M.P,D=on?deathsAt(M.t):0,env=on?envelope(M.t):0;
  $('mT').textContent=on?tfmt(M.t):M.state==='warning'?'T−'+wfmt(M.warnH*(1-M.wu)**2):M.state==='incoming'?'INCOMING':M.state==='miss'?'MISSED':'T+0';
  $('mColl').textContent=`${nodes.filter(n=>n.mC!=null).length}/${nodes.length}`;
  $('mDis').textContent=on?`${nodes.filter(n=>n.mDis&&M.t-n.mDis.t0<n.mDis.dur).length} (${nodes.filter(n=>n.mDis).length})`:'0';
  if(M.kind==='quake')quakeHud();
  if(M.kind==='volcano')volcanoHud();
  if(M.kind==='reactor')reactorHud();
  $('mE').textContent=P?mtfmt(P.Mt):'–';
  $('mCrater').textContent=!P||M.kind==='quake'?'–':P.crater?(P.crater<1?(P.crater*1000).toFixed(0)+' m':P.crater.toFixed(0)+' km'):M.size.air?'airburst':'none';
  $('mQuake').textContent=P&&(P.crater||M.kind==='quake')?'M'+P.quake.toFixed(1):'–';
  $('mDead').textContent=fmt(D);$('mAlive').textContent=fmt(WORLD-D);
  $('mWave').textContent=M.maxWave?M.maxWave.toFixed(M.maxWave<10?1:0)+' m':'–';
  $('mSun').textContent=Math.round(100-M.dim*env*100)+'%';
  $('mTemp').textContent=typeof M.dT==='number'?(M.dT*env).toFixed(1)+' °C':env>.5?M.dT+' °C':'0 °C';
}
function meteorTip(n){
  if(M.kind==='volcano')return volcanoTip(n);
  if(M.kind==='reactor')return reactorTip(n);
  const d=M.target&&M.target.ll?kmTo(M.target.ll,n.ll):0;
  const q=M.kind==='quake';
  return `<b>${n.name}</b><br>${fmt(n.m*1e6)} people (metro)<br>${fmt(q&&n.qDist!=null?n.qDist:d)} km from ${q?'the rupture':'impact site'}`+
    (q&&n.qMMI>=2?`<br>shaking MMI ${roman(n.qMMI)} (${mmiWord(n.qMMI)})`:'')+
    (n.mL>=.5?'<br><span style="color:#ff6e28">DESTROYED</span>':n.mL>0?`<br><span style="color:#ff6e28">${(n.mL*100).toFixed(n.mL<.01?2:0)}% killed by ${q?'collapsing buildings':'blast/heat'}</span>`:'')+
    (n.mDis?`<br><span style="color:#ff2a6d">${OUTBREAKS[n.mDis.type].name} epidemic — ${fmt(n.mDis.dead)} deaths</span>`:'')+
    (n.mDead>=1?`<br>${fmt(n.mDead)} dead`:'')+
    (n.mH?`<br><span style="color:#5ab4ff">${n.mH.toFixed(1)} m wave at ${tfmt(n.mArr)}</span>`:'')+
    (n.mC!=null?`<br><span style="color:#ff6e28">ORDER COLLAPSED ${tfmt(n.mC)}</span>`:n.mU!=null?`<br><span style="color:#ff6e28">FOOD RIOTS since ${tfmt(n.mU)}</span>`:'')+
    `<br><span style="opacity:.6">fragility ${n.fsi}/120</span>`+
    `<br><span style="opacity:.6">${n.country}</span>`;
}

function drawFires(t){ // fires + smoke
  for(const f of M.fires){
    const age=t-f.t0;if(age<0||age>f.dur||!front(f.ll))continue;
    const [x,y]=proj(f.ll),fl=.6+.4*Math.random(),life=1-age/f.dur;
    ctx.beginPath();ctx.arc(x,y,3+8*(1-life),0,7);ctx.fillStyle=`rgba(80,70,65,${.25*life})`;ctx.fill();
    ctx.beginPath();ctx.arc(x,y,1.5+1.5*fl,0,7);ctx.fillStyle=`rgba(255,${120+80*fl|0},40,${.9*life})`;ctx.shadowColor='#ff8c28';ctx.shadowBlur=8;ctx.fill();ctx.shadowBlur=0;
  }
}
function meteorDraw(c){
  const T=M.target,now=performance.now();
  // target crosshair
  if(M.state==='armed'&&mode==='quake')quakePreview();
  else if(M.state==='armed'&&T.ll&&front(T.ll)){
    const [x,y]=proj(T.ll),p=6+3*Math.sin(now/200);
    ctx.strokeStyle='#ff2a6d';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(x,y,p,0,7);ctx.moveTo(x-p-6,y);ctx.lineTo(x+p+6,y);ctx.moveTo(x,y-p-6);ctx.lineTo(x,y+p+6);ctx.stroke();
    ctx.font='11px "Share Tech Mono"';ctx.fillStyle='#ff2a6d';ctx.fillText(T.name,x+12,y-10);
  }
  // incoming streak
  if(M.state==='incoming'&&front(T.ll)){
    const [x,y]=proj(T.ll),u=M.u*M.u,dx=-.75,dy=-.66,L=Math.hypot(W,H)*.6*(1-u),hx=x+dx*L,hy=y+dy*L,sz=2+Math.log10(M.size.d);
    const g=ctx.createLinearGradient(hx+dx*160,hy+dy*160,hx,hy);g.addColorStop(0,'rgba(255,140,40,0)');g.addColorStop(1,'rgba(255,220,160,.9)');
    ctx.beginPath();ctx.moveTo(hx+dx*160,hy+dy*160);ctx.lineTo(hx,hy);ctx.strokeStyle=g;ctx.lineWidth=sz;ctx.stroke();
    ctx.beginPath();ctx.arc(hx,hy,sz*1.4,0,7);ctx.fillStyle='#fff';ctx.shadowColor='#ffb070';ctx.shadowBlur=20;ctx.fill();ctx.shadowBlur=0;
  }
  if(M.state==='miss'){ // streak sweeps past the limb of the planet
    const R=proj.scale(),u=M.u,ax=c[0]-R*1.6,ay=c[1]-R*.9,bx=c[0]+R*1.6,by=c[1]-R*1.25,hx=ax+(bx-ax)*u,hy=ay+(by-ay)*u;
    ctx.beginPath();ctx.moveTo(hx-(bx-ax)*.15,hy-(by-ay)*.15);ctx.lineTo(hx,hy);ctx.strokeStyle='rgba(255,220,160,.8)';ctx.lineWidth=3;ctx.stroke();
    ctx.beginPath();ctx.arc(hx,hy,5,0,7);ctx.fillStyle='#fff';ctx.shadowColor='#ffb070';ctx.shadowBlur=20;ctx.fill();ctx.shadowBlur=0;
  }
  if(M.state==='impact'&&M.kind==='quake')quakeLayer(c);
  if(M.state==='impact'&&M.kind==='volcano')volcanoLayer(c);
  if(M.state==='impact'&&M.kind==='reactor')reactorLayer(c);
  if(M.state==='impact'&&M.kind==='meteor'){
    const P=M.P,t=M.t,ll=T.ll,geo=(km)=>{ctx.beginPath();path(circle(ll,km))};
    // fireball / thermal zone, then scorched earth
    if(P.rT){const r=P.rT*Math.min(1,t*6),a=t<2?.35:Math.max(T.water?0:.08,.35-t/400);geo(r);ctx.fillStyle=`rgba(255,150,60,${a})`;ctx.fill();ctx.strokeStyle='rgba(255,243,196,.6)';ctx.lineWidth=1;ctx.stroke()}
    // blast waves (speed of sound) and the flattened zone
    const rb=Math.min(P.r3,1200*t);
    if(rb<P.r3){geo(rb);ctx.strokeStyle='rgba(255,110,40,.9)';ctx.lineWidth=2;ctx.stroke()}
    if(P.r2){geo(Math.min(P.r2,rb));ctx.fillStyle='rgba(122,16,48,.35)';ctx.fill()}
    geo(Math.min(P.r3,rb));ctx.strokeStyle='rgba(255,110,40,.35)';ctx.lineWidth=1;ctx.setLineDash([4,4]);ctx.stroke();ctx.setLineDash([]);
    // ejecta curtain (≥1 km): ballistic debris racing out across the globe
    if(M.size.d>=1000){const reMax=M.size.d>=5000?HALF:P.r3*2,re=15000*t;if(re<reMax*.98){geo(re);ctx.strokeStyle='rgba(255,176,112,.8)';ctx.lineWidth=2;ctx.setLineDash([2,6]);ctx.stroke();ctx.setLineDash([])}}
    // crater
    if(P.crater){geo(Math.max(P.crater/2,proj.scale()?2/proj.scale()*ER:0));ctx.fillStyle='rgba(10,5,5,.95)';ctx.fill();ctx.strokeStyle='#ffb070';ctx.lineWidth=1.5;ctx.stroke()}
    // tsunami rings, clipped to the ocean
    if(M.A0){
      ctx.save();ctx.beginPath();path({type:'Sphere'});path(land);ctx.clip('evenodd');
      const lead=M.c*t;
      for(let k=0;k<4;k++){
        const r=lead-k*M.c*.4;if(r<=0||r>HALF)continue;const A=M.amp(r);if(A<.2)continue;
        geo(r);ctx.strokeStyle=`rgba(90,180,255,${Math.min(.9,.25+A/40)*(1-k*.22)})`;ctx.lineWidth=1+Math.min(4,A/15);ctx.stroke();
      }
      ctx.restore();
      if(lead<HALF&&M.amp(lead)>=.2){ // label on the side facing the viewer
        const vc=[-rot[0],-rot[1]],b=kmTo(ll,vc)<1?0:bearing(ll,vc),lp=dest(ll,lead,b);
        if(front(lp)){const [x,y]=proj(lp),A=M.amp(lead);ctx.font='12px "Share Tech Mono"';ctx.fillStyle='#bfe3ff';ctx.fillText(`${A.toFixed(A<10?1:0)} m · ${Math.round(M.c)} km/h`,x+6,y-6)}
      }
    }
    drawFires(t);
    // dust / ash / soot cloud spreading from the impact, then the whole sky dims
    const env=envelope(t);
    if(M.dim||P.rT){
      const ra=M.dim?Math.min(HALF,(M.size.d>=5000?3000:60)*t):Math.min((P.rT||P.r3)*1.5,40*t),a=M.dim?.5*M.dim*Math.max(env,.3):Math.max(0,.3-t/200);
      if(a>0)for(let k=0;k<3;k++){const ctr=k?dest(ll,ra*.15,k*137+t):ll;ctx.beginPath();path(circle(ctr,ra*(1-k*.12)));ctx.fillStyle=`rgba(70,58,50,${a*.45})`;ctx.fill()}
    }
    if(M.dim*env>0){ctx.beginPath();path({type:'Sphere'});ctx.fillStyle=`rgba(0,0,0,${.6*M.dim*env})`;ctx.fill()}
    if(typeof M.dT==='string'&&env>.3){ctx.beginPath();path({type:'Sphere'});ctx.fillStyle=`rgba(255,80,20,${.35*env})`;ctx.fill()}
  }
  // refugee flows
  M.flows=M.flows.filter(f=>now-f.rt0<3500);
  for(const f of M.flows){
    const p=Math.min(1,(now-f.rt0)/2500),fade=p<1?1:1-(now-f.rt0-2500)/1000,N=Math.max(6,Math.round(f.d/200));
    ctx.beginPath();let pen=false,head=null;
    for(let s=0;s<=N;s++){const ll=f.ip(p*s/N);if(!front(ll)){pen=false;continue}const [x,y]=proj(ll);pen?ctx.lineTo(x,y):ctx.moveTo(x,y);pen=true;head=s===N?[x,y]:null}
    const fc=f.sick?'255,42,109':FLEE;
    ctx.setLineDash([1,3]);ctx.lineWidth=1.3;ctx.strokeStyle=`rgba(${fc},${.8*fade})`;ctx.stroke();ctx.setLineDash([]);
    if(head&&p<1){ctx.beginPath();ctx.arc(head[0],head[1],3.5,0,7);ctx.fillStyle='#fff';ctx.shadowColor=`rgb(${fc})`;ctx.shadowBlur=10;ctx.fill();ctx.shadowBlur=0}
  }
  // cities
  for(const n of nodes){
    if(!front(n.ll))continue;const [x,y]=proj(n.ll);
    if(n.mFlash&&now-n.mFlash<1500){const k=(now-n.mFlash)/1500;ctx.beginPath();ctx.arc(x,y,4+k*22,0,7);ctx.strokeStyle=`rgba(90,180,255,${1-k})`;ctx.lineWidth=2;ctx.stroke()}
    if(n.mDis&&M.t-n.mDis.t0<n.mDis.dur){ // active epidemic: pulsing pink glow
      const r=5+2*Math.sin(now/300+n.i);ctx.beginPath();ctx.arc(x,y,r+4,0,7);ctx.fillStyle='rgba(255,42,109,.15)';ctx.fill();
      ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.strokeStyle='rgba(255,42,109,.85)';ctx.lineWidth=1.5;ctx.stroke();
    }
    if(n.mU!=null&&n.mL<.5){ // riots: flickering jagged ring; collapse: solid ring + cross
      const fl=.5+.5*Math.random();ctx.beginPath();for(let k=0;k<=16;k++){const a=k/16*Math.PI*2,rr=8+(k%2?3:0)*fl;ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}
      ctx.lineWidth=1.3;ctx.strokeStyle=`rgba(${RIOT},${n.mC!=null?.95:.5+.4*fl})`;ctx.stroke();
      if(n.mC!=null){ctx.beginPath();ctx.moveTo(x-4,y-4);ctx.lineTo(x+4,y+4);ctx.moveTo(x+4,y-4);ctx.lineTo(x-4,y+4);ctx.lineWidth=2;ctx.stroke()}
    }
    if(n.mL>=.5){ctx.strokeStyle='#ff6e28';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(x-4,y-4);ctx.lineTo(x+4,y+4);ctx.moveTo(x+4,y-4);ctx.lineTo(x-4,y+4);ctx.stroke();continue}
    ctx.fillStyle=n.mH>=3?'#5ab4ff':n.mL>0||n.qMMI>=7?'#ff6e28':n.village?'#f5b700':'#19e6c1';
    ctx.beginPath();ctx.arc(x,y,n.mH>=3?2.4:1.6,0,7);ctx.fill();
    if(n===hover||(zoom>2.5)){ctx.font='11px "Share Tech Mono"';ctx.fillStyle='rgba(200,255,245,.8)';ctx.fillText(n.name.split(',')[0],x+6,y-5)}
  }
  // impact flash
  const fe=(now-M.flash)/1000;
  if(M.state==='impact'&&M.kind==='meteor'&&fe<1.2){ctx.fillStyle=`rgba(255,250,235,${(1-fe/1.2)*Math.min(.95,.25+Math.log10(M.size.d)/6)})`;ctx.fillRect(0,0,W,H)}
}

if(land)meteorInit();
