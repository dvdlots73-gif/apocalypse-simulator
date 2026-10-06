// ---------- SUPER QUAKE ----------
// Rupture length: Wells & Coppersmith 1994 (log L = −2.44 + 0.59 M). Average slip ≈ 10^(−4.8 + 0.69 M) m; seafloor uplift ≈ 30% of slip.
// Shaking: intensity attenuation loosely fitted to USGS ShakeMaps (MMI vs distance from the rupture).
// Deaths: USGS PAGER-style curve — fatality rate rises ~10× per MMI step, steeper for weak buildings (fragile states).
// Volcanic flank collapse: Ward & Day 2001 (La Palma worst case) vs later models (Løvholt 2008, Abadie 2020) ~10× smaller.
const QMAGS=[
 {m:7.0,name:'Haiti 2010-class',note:'Shallow, under a city of weak buildings: 160,000+ dead.'},
 {m:7.8,name:'Turkey–Syria 2023-class',note:'59,000 dead as apartment blocks pancaked.'},
 {m:8.5,name:'Great quake',note:'Roughly one of these somewhere on Earth every few years.'},
 {m:9.0,name:'Tōhoku 2011-class',note:'40 m tsunami, Fukushima meltdown, 18,500 dead.'},
 {m:9.5,name:'Valdivia 1960 — largest ever recorded',note:'1,000 km of Chile ruptured; its tsunami killed 140 people in Japan 22 hours later.'},
 {m:10,name:'Hypothetical megaquake',note:'~3,000 km of fault slipping at once. Thought possible, but extraordinarily rare.'},
 {m:11,name:'Impossible planet-cracker',note:'No fault on Earth is long enough. Pure fiction.'},
];
// [name, lat, lon, strike°, type, note, extra]  type: sub(duction) · ss strike-slip · thrust · intra(plate) · slide (volcanic collapse)
const FAULTS=[
 ['Cascadia (Seattle · Portland · Vancouver)',45.5,-125.2,0,'sub','Last ruptured 26 Jan 1700 (M~9). The tsunami reached Japan.'],
 ['San Andreas (California)',35.6,-120.4,320,'ss','“The Big One”: Los Angeles to San Francisco.'],
 ['Japan Trench (Tōhoku)',38.3,142.4,15,'sub','2011 M9.0 — Fukushima.'],
 ['Nankai Trough (Tokyo–Osaka)',33.2,135.8,60,'sub','~70–80% odds of M8–9 within 30 years (Japanese government).'],
 ['Himalayan Front (Nepal–India)',28.2,84.7,290,'thrust','2015 Gorkha M7.8; a great M8.5+ is overdue. Landslides.',{mtn:1}],
 ['North Anatolian (Istanbul)',40.8,28.9,90,'ss','Istanbul expects M7+ within decades.'],
 ['Chile Trench',-38.2,-73.5,5,'sub','1960 Valdivia M9.5.',{mtn:1}],
 ['Sunda Megathrust (Sumatra)',3.3,95.9,330,'sub','2004 M9.1 — 230,000 dead around the Indian Ocean.'],
 ['Alaska–Aleutian',61,-147.7,60,'sub','1964 Good Friday M9.2.'],
 ['Mexican Subduction (Mexico City)',17,-100,290,'sub','1985 M8.0 killed ~10,000 in Mexico City 350 km away — soft lake-bed soils amplify shaking.'],
 ['Tehran (Iran)',35.7,51.4,100,'thrust','9 million people on several active faults.',{mtn:1}],
 ['New Madrid (central USA)',36.5,-89.6,40,'intra','1811–12 quakes rang church bells in Boston.'],
 ['La Palma flank collapse — worst case (Ward & Day 2001)',28.57,-17.84,0,'slide','Cumbre Vieja’s west flank (~500 km³) slides into the Atlantic. Famous, and disputed.',{A0:600,R0:30,name:'La Palma'}],
 ['La Palma flank collapse — modern estimate',28.57,-17.84,0,'slide','Same collapse, newer physics: the slide moves slower and the waves disperse. ~10× smaller across the Atlantic.',{A0:72,R0:30,name:'La Palma'}],
 ['Krakatoa caldera collapse (Indonesia)',-6.1,105.42,0,'slide','1883: the volcano blew itself apart; 30–40 m waves killed ~36,000.',{A0:60,R0:10,name:'Krakatoa'}],
];
// [name, lat, lon, coastal]
const PLANTS=[['Fukushima Daiichi',37.42,141.03,1],['Hamaoka',34.62,138.14,1],['Kashiwazaki-Kariwa',37.43,138.6,1],['Ōi',35.54,135.65,1],
 ['Diablo Canyon',35.21,-120.85,1],['Columbia (Washington)',46.47,-119.33,0],['Kori (Busan)',35.32,129.29,1],['Akkuyu (Turkey)',36.14,33.54,1],
 ['Bushehr (Iran)',28.83,50.89,1],['Kudankulam (India)',8.17,77.71,1],['Daya Bay (Hong Kong)',22.6,114.55,1],['Laguna Verde (Mexico)',19.72,-96.41,1],
 ['KANUPP (Karachi)',24.85,66.79,1],['Tarapur (Mumbai)',19.83,72.66,1],['Angra (Brazil)',-23.01,-44.46,1],['Koeberg (Cape Town)',-33.68,18.43,1]];
const SOFT={'Mexico City':1.5,'Kathmandu':.5,'Lima':.3}; // basin/lake-bed amplification (MMI units)
const MMIW=['','not felt','weak','weak','light','moderate','strong','very strong','severe','violent','extreme','extreme','extreme'];
const roman=I=>['','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][Math.max(1,Math.min(12,Math.round(I)))];
const mmiWord=I=>MMIW[Math.max(1,Math.min(12,Math.round(I)))];
const mmi=(Mg,r)=>Math.min(12,Math.max(1,2.2+1.5*Mg-3*Math.log10(Math.hypot(r,15))-.0015*r));
const qRate=(I,v)=>I<6?0:Math.min(.6,1e-5*10**((I-6)*(.4+.8*v)));
const ZONES=[[9,'122,16,48',.45],[8,'255,42,109',.28],[7,'255,110,40',.2],[6,'245,183,0',.12]]; // MMI, colour, alpha

function quakeInit(){
  if(M.qReady)return;M.qReady=true;
  QMAGS.forEach((q,i)=>$('qmag').add(new Option(`M${q.m.toFixed(1)} — ${q.name}`,i)));$('qmag').value=3;
  FAULTS.forEach((f,i)=>$('qfault').add(new Option(f[0],i)));$('qfault').value=2;
  $('qmag').onchange=$('qfault').onchange=()=>{meteorReset();quakePick()};
  quakePick();
}
function quakeSel(){
  const f=FAULTS[+$('qfault').value],slide=f[4]==='slide',Mg=slide?6.5:QMAGS[+$('qmag').value].m;
  return {f,slide,Mg,L:slide?0:Math.min(8000,10**(-2.44+.59*Mg))};
}
function quakePick(){
  const {f,slide,Mg,L}=quakeSel(),q=QMAGS[+$('qmag').value];
  M.target={name:f[6]?.name||f[0],ll:[f[2],f[1]]};flyTo=[-f[2],-f[1]];
  $('qmag').disabled=slide;
  $('qinfo').innerHTML=slide?`<em>Volcanic collapse</em> — magnitude doesn't apply; the danger is the landslide tsunami.<br>${f[5]}`
    :`ENERGY <em>${mtfmt(10**(1.5*Mg+4.8)/MT)}</em> · RUPTURE <em>${fmt(L)} km</em><br>${q.note}<br><span style="opacity:.75">${f[5]}</span>`;
}
function faultLine(f,L){
  const ll=[f[2],f[1]];if(!L)return [ll];
  const n=Math.max(2,Math.min(200,Math.round(L/15)));
  return d3.range(n+1).map(i=>dest(ll,(i/n-.5)*L,f[3]));
}
const lineDist=(line,p)=>{let m=Infinity,k=0;line.forEach((q,i)=>{const d=kmTo(q,p);if(d<m){m=d;k=i}});return [m,k]};
function stadium(line,r){ // all points within r of the rupture line
  if(line.length<2)return circle(line[0],r);
  const step=Math.max(1,Math.floor(line.length/40)),L=line.filter((_,i)=>i%step===0||i===line.length-1),n=L.length-1;
  const b=i=>i<n?bearing(L[i],L[i+1]):bearing(L[n-1],L[n]),pts=[];
  for(let i=0;i<=n;i++)pts.push(dest(L[i],r,b(i)+90));
  for(let k=1;k<12;k++)pts.push(dest(L[n],r,b(n)+90-180*k/12));
  for(let i=n;i>=0;i--)pts.push(dest(L[i],r,b(i)-90));
  for(let k=1;k<12;k++)pts.push(dest(L[0],r,b(0)-90-180*k/12));
  pts.push(pts[0]);
  const poly={type:'Polygon',coordinates:[pts]};
  if(d3.geoArea(poly)>2*Math.PI)pts.reverse();
  return poly;
}

function quakeStart(){
  const {f,slide,Mg,L}=quakeSel(),ep=[f[2],f[1]],line=faultLine(f,L),now=performance.now(),x=f[6]||{};
  $('qmag').disabled=$('qfault').disabled=true;
  Object.assign(M,{kind:'quake',state:'impact',s:0,t:0,tPrev:0,flash:now,A0:0,amp:null,dir:null,line,L,mag:Mg,fault:f,size:{d:0},logged:{},
    P:{Mt:10**(1.5*Mg+4.8)/MT,quake:Mg,crater:0}});
  const v=d3.least(nodes,n=>kmTo(n.ll,ep)).frag,mtn=x.mtn?1.15:1;
  // cities: shaking at distance from the rupture, soft-soil boost, fire after gas mains break
  let D0=0,peak=0,peakN=null;
  for(const n of nodes){
    const [d]=lineDist(line,n.ll),I=Math.min(12,mmi(Mg,d)+(SOFT[n.name]||0));
    n.qDist=d;n.qMMI=I;n.mL=qRate(I,n.frag)*(I>=8.5?1.2:1)*(I>=8?mtn:1);n.mDead=n.m*1e6*n.mL;D0+=n.mDead;
    if(I>peak){peak=I;peakN=n}
  }
  // countryside: bands around the rupture, land fraction sampled
  let Rmax=0;while(mmi(Mg,Rmax)>=6&&Rmax<6000)Rmax+=10;
  for(let i=0;i<30;i++){
    const a=Rmax*i/30,b=Rmax*(i+1)/30,mid=(a+b)/2,area=2*L*(b-a)+Math.PI*(b*b-a*a);
    let lf=0;for(let k=0;k<12;k++){const p=line[Math.random()*line.length|0],br=line.length>1?bearing(line[0],line.at(-1)):0;lf+=isLand(dest(p,mid,br+(k%2?90:-90)))?1:0}
    D0+=RURAL*area*lf/12*qRate(mmi(Mg,mid),v)*mtn;
  }
  M.D0=Math.min(WORLD,D0);M.Rmax=Rmax;M.tBlast=Math.max(.02,Rmax/12600);M.peak=peak;M.end=365*24;
  M.zones=ZONES.map(([I,col,a])=>{let r=0;while(mmi(Mg,r)>=I&&r<6000)r+=5;return {r,col,a}});
  // tsunami: subduction uplift (line source, cylindrical spreading) or volcanic landslide (point source)
  const sub=f[4]==='sub'&&Mg>=7.5;
  if(sub||slide){
    const c=3.6*Math.sqrt(9.81*3000),W=Math.max(1,L/2),A0=Math.min(300,.3*10**(-4.8+.69*Mg));
    const amp=slide?r=>x.A0*(x.R0/(x.R0+r))**.75:r=>A0*(W/(W+r))**.75,run=slide?2:3;
    // directivity: a long rupture beams its wave out sideways; along-strike coasts get ~30%
    const dir=q=>slide?1:.3+.7*Math.abs(Math.sin((bearing(ep,q)-f[3])*DEG));M.dir=dir;
    Object.assign(M,{A0:amp(0),c,amp});
    for(const n of nodes){
      if(!n.port)continue;
      const [d,k]=lineDist(line,n.ll),src=line[k],ip=d3.geoInterpolate(src,n.ll),stop=1-Math.min(.1,300/Math.max(d,1));
      let blocked=false;for(let j=1;j<24&&!blocked&&d>50;j++){const u=j/24*stop;if(u>.02&&isLand(ip(u)))blocked=true}
      const H=run*amp(d)*dir(n.ll)*(blocked?.15:1);if(H<.5)continue;
      const exposed=Math.min(.3,H/400)/Math.sqrt(Math.max(1,n.m/4)),leth=Math.min(.7,Math.max(0,(H-1)/25))*(.4+.6*n.frag); // flood-zone share · drills/seawalls
      const ev=d/c>2?.3:d/c>.5?.1:0; // distant coasts get warnings; near-field waves arrive in minutes
      const alive=n.m*1e6-n.mDead,dead=(alive*exposed*leth+(n.N-n.m*1e6)*.003*leth)*(1-ev);
      M.events.push({t:d/c,n,H,dead,blocked});
    }
    M.events.sort((a,b)=>a.t-b.t);
  }
  // fires where shaking ≥ VIII (1906 San Francisco, 1923 Tokyo burned more than they shook)
  for(const n of nodes)if(n.qMMI>=8)for(let k=0;k<4+(n.qMMI-8)*6;k++)M.fires.push({ll:dest(n.ll,30*Math.sqrt(Math.random()),Math.random()*360),t0:.05+Math.random()*6,dur:24+Math.random()*96});
  // aftershocks: Båth's law (largest ≈ M−1.2), Gutenberg–Richter sizes, Omori decay in time
  if(!slide)for(let k=0;k<40;k++){const m=Mg-1.2+Math.log10(Math.random());if(m>=5.5)M.after.push({t:.05*10**(Math.random()*4.2),m,ll:dest(line[Math.random()*line.length|0],Math.random()*60,Math.random()*360)})}
  M.after.sort((a,b)=>a.t-b.t);
  // nuclear plants: strong shaking or a big wave → meltdown risk (Fukushima: 14 m wave flooded the backup generators)
  for(const [name,lat,lon,coast] of PLANTS){
    const ll=[lon,lat],[d,k]=lineDist(line,ll),I=mmi(Mg,d),ip=d3.geoInterpolate(line[k],ll);
    let shade=1;if(d>50)for(let j=2;j<22;j++)if(isLand(ip(j/24))){shade=.15;break}
    const H=coast&&M.amp?(slide?2:3)*M.amp(d)*M.dir(ll)*shade:0,p=Math.min(.9,(I>=9?.5:I>=8?.1:0)+(H>=12?.6:H>=8?.15:0));
    if(Math.random()<p)M.nukes.push({name,ll,t:(H>=5?d/(M.c||1):d/12600)+24+Math.random()*48,done:false});
  }
  // log
  if(slide)log(x.name==='Krakatoa'?'<b>🌋 Krakatoa erupts and its caldera collapses into the sea</b>':'<b>🌋 Cumbre Vieja’s west flank gives way — ~500 km³ of rock slides into the Atlantic</b>');
  else log(`<b>🌐 M${Mg.toFixed(1)} earthquake — ${f[0]}</b>: ${fmt(L)} km of fault ruptures in ~${Math.max(1,Math.round(L/2.5/60))} min · ${mtfmt(M.P.Mt)} released`);
  if(peakN&&peak>=6)log(`↯ Strongest shaking in a mapped city: MMI ${roman(peak)} (${mmiWord(peak)}) in ${peakN.name}`);
  if(M.A0)log(`🌊 Tsunami: ${Math.round(M.A0)} m at source, travelling ${Math.round(M.c)} km/h`);
  if(slide&&x.A0>=600)log('⚠ This is the 2001 worst case. Most later models give waves ~10× smaller by the time they cross the Atlantic.');
}

function quakeTick(){
  const once=(k,cond,msg)=>{if(cond&&!M.logged[k]){M.logged[k]=1;log(msg)}};
  for(const a of M.after)if(!a.done&&a.t<=M.t){a.done=true;M.flashes.push({ll:a.ll,rt0:performance.now(),m:a.m});if(a.m>=6.5)log(`↯ Aftershock M${a.m.toFixed(1)}`)}
  for(const k of M.nukes)if(!k.done&&k.t<=M.t){
    k.done=true;const n=d3.least(nodes,n=>kmTo(n.ll,k.ll));n.mStress=Math.min(.6,n.mStress+.3);flee(n,2,.1);
    log(`<span style="color:#ffe14d">☢ Meltdown at ${k.name} — cooling lost, 30 km exclusion zone, ${n.name} evacuating</span>`);
  }
  once('fire',M.fires.length&&M.t>1,'🔥 Gas mains and stoves ignite — fires spread through shattered cities');
  once('slide',M.fault[6]?.mtn&&M.peak>=8&&M.t>.5,'⛰ Landslides bury villages and dam rivers');
}
function quakeHud(){
  $('qRupt').textContent=M.state!=='impact'?'–':M.L?fmt(M.L)+' km':'landslide';
  $('qPeak').textContent=M.state!=='impact'?'–':`${roman(M.peak)} ${mmiWord(M.peak)}`;
}
function quakePreview(){
  const {f,L}=quakeSel(),line=faultLine(f,L);
  ctx.beginPath();path({type:'LineString',coordinates:line.length>1?line:[line[0],dest(line[0],1,0)]});
  ctx.setLineDash([6,4]);ctx.strokeStyle='#ff2a6d';ctx.lineWidth=2.5;ctx.stroke();ctx.setLineDash([]);
  if(front(line[0])){const [x,y]=proj([f[2],f[1]]),p=6+3*Math.sin(performance.now()/200);ctx.beginPath();ctx.arc(x,y,p,0,7);ctx.strokeStyle='#ff2a6d';ctx.lineWidth=1.2;ctx.stroke();
    ctx.font='11px "Share Tech Mono"';ctx.fillStyle='#ff2a6d';ctx.fillText(f[6]?.name||f[0].split(' (')[0],x+12,y-10)}
}
function quakeLayer(c){
  const t=M.t,line=M.line,now=performance.now();
  // shaking zones, revealed as the seismic waves sweep outward
  const front_=12600*t;
  for(let i=ZONES.length-1;i>=0;i--){const z=M.zones[i],r=Math.min(z.r,front_);if(r<=0)continue;ctx.beginPath();path(stadium(line,r));ctx.fillStyle=`rgba(${z.col},${z.a})`;ctx.fill()}
  if(front_<M.Rmax*1.6){ctx.beginPath();path(stadium(line,front_));ctx.strokeStyle=`rgba(232,255,251,${.8*(1-front_/(M.Rmax*1.6))})`;ctx.lineWidth=1.5;ctx.stroke()}
  // rupture unzipping both ways from the epicentre at ~2.5 km/s
  if(line.length>1){
    const p=Math.min(1,t*9000/(M.L/2)),h=(line.length-1)/2,a=Math.floor(h*(1-p)),b=Math.ceil(h*(1+p));
    ctx.beginPath();path({type:'LineString',coordinates:line.slice(a,b+1)});ctx.strokeStyle='#ff2a6d';ctx.lineWidth=3.5;ctx.shadowColor='#ff2a6d';ctx.shadowBlur=12;ctx.stroke();ctx.shadowBlur=0;
  }else if(front(line[0])){const [x,y]=proj(line[0]);ctx.beginPath();ctx.arc(x,y,6,0,7);ctx.fillStyle='#ff2a6d';ctx.shadowColor='#ff2a6d';ctx.shadowBlur=14;ctx.fill();ctx.shadowBlur=0}
  // tsunami
  if(M.A0){
    ctx.save();ctx.beginPath();path({type:'Sphere'});path(land);ctx.clip('evenodd');
    const lead=M.c*t;
    for(let k=0;k<4;k++){
      const r=lead-k*M.c*.4;if(r<=0||r>Math.min(HALF,line.length>1?11000:HALF))continue;const A=M.amp(r);if(A<.2)continue;
      ctx.beginPath();path(stadium(line,r));ctx.strokeStyle=`rgba(90,180,255,${Math.min(.9,.25+A/40)*(1-k*.22)})`;ctx.lineWidth=1+Math.min(4,A/15);ctx.stroke();
    }
    ctx.restore();
    const ep=[M.fault[2],M.fault[1]];
    if(lead<HALF&&M.amp(lead)>=.2){const vc=[-rot[0],-rot[1]],b=kmTo(ep,vc)<1?0:bearing(ep,vc),lp=dest(ep,lead,b);
      if(front(lp)){const [x,y]=proj(lp),A=M.amp(lead);ctx.font='12px "Share Tech Mono"';ctx.fillStyle='#bfe3ff';ctx.fillText(`${A.toFixed(A<10?1:0)} m · ${Math.round(M.c)} km/h`,x+6,y-6)}}
  }
  drawFires(t);
  // aftershock flashes
  M.flashes=M.flashes.filter(f=>now-f.rt0<1500);
  for(const f of M.flashes){if(!front(f.ll))continue;const [x,y]=proj(f.ll),k=(now-f.rt0)/1500;ctx.beginPath();ctx.arc(x,y,3+k*(f.m-4)*6,0,7);ctx.strokeStyle=`rgba(232,255,251,${1-k})`;ctx.lineWidth=1.5;ctx.stroke()}
  // melted-down reactors
  for(const k of M.nukes){if(!k.done||!front(k.ll))continue;const [x,y]=proj(k.ll),p=8+3*Math.sin(now/250);
    ctx.beginPath();ctx.arc(x,y,p,0,7);ctx.strokeStyle='rgba(255,225,77,.9)';ctx.lineWidth=1.5;ctx.stroke();ctx.font='13px sans-serif';ctx.fillStyle='#ffe14d';ctx.fillText('☢',x-6,y+5)}
}

if(M.ready)quakeInit();
