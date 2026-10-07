// ---------- SUPERVOLCANO ----------
// VEI (Volcanic Explosivity Index) 4–8. Erupted volume, ashfall footprint and sulfur loading from the USGS/
// Smithsonian GVP scale; climate tiers from Pinatubo 1991 (−0.5 °C), Tambora 1815 ("year without a summer"),
// Toba ~74 ka (near-extinction bottleneck) and Yellowstone studies. Order-of-magnitude.
// [VEI, volume km³, pyroclastic-flow radius km, ash e-folding scale km, sulfur Tg, dim%, ΔT °C, winter yr, famine frac]
const VEIS=[
 {vei:4,vol:.3,rPF:12,ash:110,so2:1,clim:[1,-.1,.3,0]},
 {vei:5,vol:3,rPF:30,ash:260,so2:5,clim:[3,-.3,.5,0]},
 {vei:6,vol:15,rPF:70,ash:520,so2:20,clim:[8,-.5,2,0]},
 {vei:7,vol:160,rPF:150,ash:1100,so2:60,clim:[25,-1.5,3,.006]},
 {vei:8,vol:1000,rPF:350,ash:2500,so2:200,clim:[70,-8,6,.3]},
 {vei:'8+',vol:2800,rPF:600,ash:4200,so2:520,clim:[90,-12,10,.6]},
];
// [name, lat, lon, maxVEI, note]  real calderas (VEI 7–8 capable) + famous historic eruptions
const VOLCANOES=[
 ['Yellowstone (USA)',44.43,-110.67,5,'A VEI-8 caldera. Last super-eruption 640,000 years ago.'],
 ['Toba (Sumatra, Indonesia)',2.68,98.88,5,'The ~74,000-year-ago eruption may have cut humanity to a few thousand people.'],
 ['Campi Flegrei (Naples, Italy)',40.83,14.14,3,'A restless caldera directly beneath a city of 3 million. Showing unrest.'],
 ['Taupō (New Zealand)',-38.82,176,4,'Its 232 AD eruption was the most violent of the last 5,000 years.'],
 ['Long Valley (California)',37.7,-118.87,3,'A caldera near Mammoth Lakes that still inflates and swarms.'],
 ['Aira / Sakurajima (Japan)',31.59,130.66,3,'Looms over Kagoshima; erupts almost constantly.'],
 ['Rabaul (Papua New Guinea)',-4.27,152.2,2,'A caldera ringed by a town; erupted in 1994.'],
 ['Tambora (Indonesia)',-8.25,118,3,'1815, VEI-7: ~100,000 dead and the global "year without a summer".'],
 ['Krakatoa (Indonesia)',-6.1,105.42,2,'1883, VEI-6: heard 4,800 km away.'],
 ['Pinatubo (Philippines)',15.13,120.35,2,'1991, VEI-6: cooled the whole planet by ~0.5 °C.'],
 ['Vesuvius (Naples, Italy)',40.82,14.43,1,'79 AD: buried Pompeii. 3 million now live in the danger zone.'],
 ['Mount St. Helens (USA)',46.19,-122.19,1,'1980, VEI-5: the deadliest eruption in US history.'],
];
const ASHC='120,110,96', LAVA='255,120,40';
let V={ready:false};

function volcanoInit(){
  if(V.ready)return;V.ready=true;if(!mask)buildMask();
  VEIS.forEach((v,i)=>$('vvei').add(new Option(`VEI ${v.vei} — ${v.vol>=1000?v.vol/1000+',000':v.vol} km³ ejecta`,i)));
  VOLCANOES.forEach((v,i)=>$('vsite').add(new Option(v[0],i)));
  $('vsite').value=0;$('vvei').value=4;
  $('vvei').onchange=()=>{meteorReset();volcanoPick()};
  $('vsite').onchange=()=>{$('vvei').value=Math.min(+$('vvei').value,VOLCANOES[+$('vsite').value][3]);meteorReset();volcanoPick()};
  volcanoPick();volcanoReset();
}
function volcanoSel(){
  const site=VOLCANOES[+$('vsite').value],vi=Math.min(+$('vvei').value,site[3]),v=VEIS[vi];
  return {site,v,ll:[site[2],site[1]]};
}
function volcanoPick(){
  const {site,v,ll}=volcanoSel();M.target={name:site[0].split(' (')[0],ll};flyTo=[-ll[0],-ll[1]];
  const capped=+$('vvei').value>site[3];
  $('vinfo').innerHTML=`ASHFALL to <em>${fmt(v.ash*1.5)} km</em> · SULFUR <em>${v.so2} Tg</em> → ${v.clim[0]}% dimming, <em>${v.clim[1]} °C</em><br>${site[4]}`+
    (capped?`<br><span style="color:#ff6e28">${site[0].split(' (')[0]} tops out at VEI ${VEIS[site[3]].vei}.</span>`:'');
}
function volcanoReset(){
  if(!V.ready)return;
  meteorReset();M.kind='volcano';M.state='armed';
  nodes.forEach(n=>{n.vAsh=0;n.vArr=null});
  $('vvei').disabled=$('vsite').disabled=false;
  volcanoPick();meteorHud();volcanoHud();
}
const ashThick=(d,v)=>v.vol*8*Math.exp(-d/v.ash)/(1+d/40); // cm at distance d (crude)

function volcanoStart(){
  const {site,v,ll}=volcanoSel(),now=performance.now();
  $('vvei').disabled=$('vsite').disabled=$('mchaos').disabled=$('mdis').disabled=true;
  Object.assign(M,{kind:'volcano',state:'impact',s:0,t:0,tPrev:0,flash:now,logged:{},vei:v.vei,vol:v.vol,rPF:v.rPF,ashScale:v.ash,
    size:{d:0},P:{Mt:v.vol*1e9*2.5e3*1e6/4.184e15,quake:0,crater:0},target:{name:site[0].split(' (')[0],ll}});
  // local deaths: pyroclastic flows (near-total) + ashfall roof-collapse & suffocation across the footprint
  let D0=0;
  for(const n of nodes){
    const d=kmTo(ll,n.ll),th=ashThick(d,v);n.vAsh=th;
    let l=d<v.rPF?.9:0; // pyroclastic flow
    if(th>=1)l=Math.max(l,Math.min(.4,(th/200)*(.4+.8*n.frag))); // heavy ash: weak roofs collapse, lungs fail
    n.mL=l;n.mDead=n.m*1e6*l;D0+=n.mDead;
  }
  const RINGS=40,Rmax=v.ash*4;
  for(let i=0;i<RINGS;i++){
    const a=Rmax*i/RINGS,b=Rmax*(i+1)/RINGS,mid=(a+b)/2,area=2*Math.PI*ER*ER*(Math.cos(a/ER)-Math.cos(b/ER)),th=ashThick(mid,v);
    let lf=0;for(let k=0;k<10;k++)lf+=isLand(dest(ll,mid,k*36+i*7))?1:0;
    const l=mid<v.rPF?.9:th>=1?Math.min(.3,th/250):0;
    D0+=RURAL*area*lf/10*l;
  }
  M.D0=Math.min(WORLD,D0);M.tBlast=Math.max(.1,v.rPF/400); // pyroclastic flows race out in minutes
  // climate: sulfur veil → dimming, volcanic winter, famine (hits fragile, low-reserve states hardest)
  const c=v.clim;M.dim=c[0]/100;M.dT=c[1];M.winter=c[2];M.famine=c[3];M.pulse=0;
  M.end=M.winter?Math.min(30,M.winter*2+1)*8760:72;
  const norm=d3.sum(nodes,n=>(.6+.8*n.frag)*n.N)/WORLD;nodes.forEach(n=>n.fw=(.6+.8*n.frag)/norm);
  // ash plume drifts east on the prevailing stratospheric winds
  M.plume=[];for(let k=0;k<120;k++)M.plume.push({off:Math.random(),lat:(Math.random()-.5)*14,sp:.5+Math.random()});
  log(`<b>🌋 ${site[0].split(' (')[0]} erupts — VEI ${v.vei}</b>: ${v.vol>=1000?v.vol/1000+',000':v.vol} km³ of rock and ash blasted out`);
  log(`🌋 Pyroclastic flows destroy everything within ${v.rPF} km · ${v.so2} Tg of sulfur injected into the stratosphere`);
  if(v.ash>=500)log(`☁ Ash grounds aviation across the hemisphere · heavy ashfall buries land out to ~${fmt(v.ash)} km`);
}

function volcanoTick(){
  const once=(k,c,msg)=>{if(c&&!M.logged[k]){M.logged[k]=1;log(msg)}};
  once('ash',M.t>6,`☁ Ashfall collapses roofs and poisons farmland across ${fmt(M.ashScale)}+ km`);
  once('lahar',M.t>24,'🌊 Rain turns the ash to lahars — mudflows bury valleys downstream');
  once('cool',M.dim>=.03&&M.t>720,typeof M.dT==='number'&&M.dT<=-1?`❄ Volcanic winter: global temperature ${M.dT} °C — summer frosts, failed harvests`:'🌫 A sulfur haze dims the sun worldwide');
}
function volcanoHud(){
  const on=M.state==='impact';
  $('vVEI').textContent=on?'VEI '+M.vei:'–';$('vVol').textContent=on?fmt(M.vol)+' km³':'–';
  for(const id of ['mE','mQuake','mWave'])$(id).textContent='–';
}
function volcanoTip(n){
  const d=M.target&&M.target.ll?kmTo(M.target.ll,n.ll):0;
  return `<b>${n.name}</b><br>${fmt(n.m*1e6)} people (metro)<br>${fmt(d)} km from the vent`+
    (n.mL>=.5?'<br><span style="color:#ff6e28">DESTROYED by pyroclastic flow</span>':n.mL>0?`<br><span style="color:#ff6e28">${Math.round(n.mL*100)}% killed by ashfall</span>`:'')+
    (n.vAsh>=1?`<br>ash depth ~${n.vAsh<10?n.vAsh.toFixed(1):Math.round(n.vAsh)} cm`:'')+
    (n.mDis?`<br><span style="color:#ff2a6d">${OUTBREAKS[n.mDis.type].name} epidemic</span>`:'')+
    (n.mC!=null?'<br><span style="color:#ff6e28">ORDER COLLAPSED</span>':'')+
    `<br><span style="opacity:.6">${n.country} · fragility ${n.fsi}/120</span>`;
}

function volcanoLayer(c){
  const t=M.t,ll=M.target.ll,now=performance.now(),geo=km=>{ctx.beginPath();path(circle(ll,km))};
  const env=envelope(t);
  // ashfall footprint spreading out
  const reach=Math.min(M.ashScale*4,M.ashScale*Math.min(1,t/48)+M.rPF);
  for(let k=3;k>=1;k--){const r=reach*k/3;if(r<1)continue;geo(r);ctx.fillStyle=`rgba(${ASHC},${.05+.06*k})`;ctx.fill()}
  // ash plume drifting east
  if(M.plume)for(const p of M.plume){
    const dist=(M.rPF+p.sp*reach*(p.off+t/72))%(M.ashScale*3);
    const q=dest([ll[0]+dist/111/Math.cos(ll[1]*Math.PI/180),ll[1]+p.lat],0,0);
    if(!front(q))continue;const [x,y]=proj(q);ctx.fillStyle=`rgba(${ASHC},.25)`;ctx.beginPath();ctx.arc(x,y,2+4*p.sp,0,7);ctx.fill();
  }
  // pyroclastic flow zone
  geo(Math.min(M.rPF,M.rPF*Math.min(1,t*4)));ctx.fillStyle='rgba(60,20,10,.6)';ctx.fill();ctx.strokeStyle=`rgba(${LAVA},.8)`;ctx.lineWidth=2;ctx.stroke();
  // glowing vent
  if(front(ll)){const [x,y]=proj(ll),pul=.6+.4*Math.sin(now/200);ctx.beginPath();ctx.arc(x,y,4+2*pul,0,7);ctx.fillStyle='#fff';ctx.shadowColor=`rgb(${LAVA})`;ctx.shadowBlur=18*pul;ctx.fill();ctx.shadowBlur=0}
  // global dimming from the sulfur veil
  if(M.dim*env>0){ctx.beginPath();path({type:'Sphere'});ctx.fillStyle=`rgba(20,16,12,${.7*M.dim*env})`;ctx.fill()}
  // cities
  for(const n of nodes){
    if(!front(n.ll))continue;const [x,y]=proj(n.ll);
    if(n.mDis&&M.t-n.mDis.t0<n.mDis.dur){const r=5+2*Math.sin(now/300+n.i);ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.strokeStyle='rgba(255,42,109,.8)';ctx.lineWidth=1.3;ctx.stroke()}
    if(n.mU!=null&&n.mL<.5){const fl=.5+.5*Math.random();ctx.beginPath();for(let k=0;k<=16;k++){const a=k/16*Math.PI*2,rr=8+(k%2?3:0)*fl;ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}ctx.lineWidth=1.3;ctx.strokeStyle=`rgba(${RIOT},${n.mC!=null?.9:.5+.3*fl})`;ctx.stroke()}
    if(n.mL>=.5){ctx.strokeStyle=`rgb(${LAVA})`;ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(x-4,y-4);ctx.lineTo(x+4,y+4);ctx.moveTo(x+4,y-4);ctx.lineTo(x-4,y+4);ctx.stroke();continue}
    ctx.fillStyle=n.vAsh>=5?'#8a8070':n.mL>0?'#ff6e28':n.village?'#f5b700':'#19e6c1';ctx.beginPath();ctx.arc(x,y,1.6,0,7);ctx.fill();
    if(n===hover||zoom>2.5){ctx.font='11px "Share Tech Mono"';ctx.fillStyle='rgba(200,255,245,.8)';ctx.fillText(n.name.split(',')[0],x+6,y-5)}
  }
}

if(land)volcanoInit();
