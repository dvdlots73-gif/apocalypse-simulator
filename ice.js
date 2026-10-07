// ---------- ICE CAPS MELT ----------
// Sea-level equivalents: Greenland ~7.4 m, Antarctica ~58 m, Arctic sea ice 0 m (it already floats).
// Melt curves are tuned so 2100 matches IPCC AR6 (≈0.3 m low · 0.6 m middle · 1.1 m high-end), then run to full melt.
// "Fingerprints": a melting ice sheet's gravity stops holding water near it, so local sea level falls nearby and
// rises ~20% above average far away. Flooding uses real elevation (AWS Terrain Tiles) on a 0.5° grid, with water
// spreading in from the open ocean only (inland basins below sea level stay dry unless the sea reaches them).
// Coastal population calibrated so land under 10 m holds ~900M people (CIESIN low-elevation coastal zone).
const ISPEEDS=[
 {name:'Slow — IPCC low emissions',TN:3000,TS:10000,th:.8},
 {name:'Medium — IPCC middle road',TN:1000,TS:5000,th:1.5},
 {name:'Fast — IPCC high end, ice cliffs collapse',TN:500,TS:2000,th:2.5},
 {name:'Extreme — hypothetical runaway melt',TN:150,TS:500,th:4},
];
const ICAPS=[{name:'❄ North — Arctic sea ice + Greenland',n:1,s:0},{name:'🧊 South — Antarctica',n:0,s:1},{name:'🌍 Both poles',n:1,s:1}];
const GW=720,GH=360,SNMAX=7.4,SSMAX=58,GREEN=[-40,72];
const I={ready:false,dem:null};
let coastFade=1;
const ismooth=x=>x<=0?0:x>=1?1:x*x*(3-2*x);

function iceInit(){
  if(I.ready)return;I.ready=true;if(!mask)buildMask();
  ICAPS.forEach((c,i)=>$('icap').add(new Option(c.name,i)));$('icap').value=2;
  ISPEEDS.forEach((s,i)=>$('ispeed').add(new Option(s.name,i)));$('ispeed').value=1;
  $('icap').onchange=$('ispeed').onchange=iceReset;
  $('igo').onclick=()=>{if(!I.dem)return;if(!I.started)iStart();I.running=!I.running;$('igo').textContent=I.running?'❚❚ PAUSE':'▶ RESUME'};
  $('ireset').onclick=iceReset;
}
// ---- elevation: 16 Terrarium tiles at zoom 2 → 0.5° grid ----
async function iLoad(){
  if(I.loading||I.dem)return;I.loading=true;$('igo').disabled=true;iInfo();
  const S=1024,cv=new OffscreenCanvas(S,S),g=cv.getContext('2d');
  await Promise.all(d3.range(16).map(k=>new Promise(res=>{const x=k%4,y=k/4|0,img=new Image();img.crossOrigin='anonymous';
    img.onload=()=>{g.drawImage(img,x*256,y*256);res()};img.onerror=res;img.src=`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/2/${x}/${y}.png`})));
  const px=g.getImageData(0,0,S,S).data,el=(lon,lat)=>{
    if(lat>85)return -3000;if(lat<-85)return 2500;
    const X=Math.min(S-1,(lon+180)/360*S|0),Y=Math.min(S-1,Math.max(0,(1-Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))/Math.PI)/2*S|0)),k=(Y*S+X)*4;
    return px[k]*256+px[k+1]+px[k+2]/256-32768};
  const E=new Float32Array(GW*GH),L=new Uint8Array(GW*GH),fN=new Float32Array(GW*GH),fS=new Float32Array(GW*GH);
  for(let j=0;j<GH;j++)for(let i=0;i<GW;i++){
    const k=j*GW+i,lon=-180+(i+.5)*.5,lat=90-(j+.5)*.5;L[k]=mask[k*4+3]>127?1:0;
    const e=el(lon,lat);E[k]=L[k]?Math.max(e,-50):Math.min(e,-1);
    // fingerprints: sea level near a melting sheet falls; far away it rises ~20% above the global mean
    fN[k]=Math.max(-.5,1.2-1.6*Math.exp(-d3.geoDistance([lon,lat],GREEN)*ER/2000));
    fS[k]=Math.max(-.5,1.2-1.6*Math.exp(-(lat+90)*111/2500));
  }
  // the open ocean: water connected to the Pacific (so the Caspian & other lakes don't act as seas)
  const sea=new Uint8Array(GW*GH),q=[ (90+30)*2*GW+20*2 ];sea[q[0]]=1;
  while(q.length){const k=q.pop(),i=k%GW,j=k/GW|0;for(const n of [j*GW+(i+1)%GW,j*GW+(i+GW-1)%GW,k-GW,k+GW])if(n>=0&&n<GW*GH&&!sea[n]&&!L[n]){sea[n]=1;q.push(n)}}
  // coastal people: weight low land by nearby cities, scaled so <10 m holds ~900M
  const W=new Float32Array(GW*GH),near=new Int16Array(GW*GH).fill(-1),area=j=>3091*Math.cos((90-(j+.5)*.5)*Math.PI/180);
  let w10=0;
  for(let j=0;j<GH;j++)for(let i=0;i<GW;i++){const k=j*GW+i;if(!L[k]||E[k]>90)continue;
    const lon=-180+(i+.5)*.5,lat=90-(j+.5)*.5,cl=Math.cos(lat*Math.PI/180);let w=0,best=1e9,bn=-1;
    for(const n of nodes){let dx=Math.abs(n.lon-lon);if(dx>180)dx=360-dx;const d=Math.hypot(dx*cl,n.lat-lat)*111;w+=n.N*Math.exp(-d/400);if(d<best){best=d;bn=n.i}}
    W[k]=w*area(j);near[k]=bn;if(E[k]<10)w10+=W[k]}
  const sc=9e8/w10;for(let k=0;k<W.length;k++)W[k]*=sc;
  for(const n of nodes){const i=Math.min(GW-1,(n.lon+180)*2|0),j=Math.min(GH-1,(90-n.lat)*2|0);n.iCell=j*GW+i;n.iElev=Math.max(1,el(n.lon,n.lat))}
  Object.assign(I,{dem:{E,L,fN,fS,sea,W,near},loading:false});$('igo').disabled=false;iceReset();
}
// ---- flood: water spreads inland from the open ocean through every cell below the local sea level ----
function iFlood(SN,SS,TH){
  const {E,L,fN,fS,sea,W,near}=I.dem,f=new Uint8Array(GW*GH),q=[],disp=new Float64Array(nodes.length);
  for(let k=0;k<f.length;k++)if(sea[k]){f[k]=1;q.push(k)}
  let lost=0,people=0;
  while(q.length){const k=q.pop(),i=k%GW,j=k/GW|0;
    for(const n of [j*GW+(i+1)%GW,j*GW+(i+GW-1)%GW,k-GW,k+GW]){
      if(n<0||n>=f.length||f[n])continue;if(!L[n]&&!sea[n]){if(E[n]<SN*fN[n]+SS*fS[n]+TH){f[n]=1;q.push(n)}continue}
      if(L[n]&&E[n]<SN*fN[n]+SS*fS[n]+TH){f[n]=1;q.push(n);if(I.baseF&&I.baseF[n])continue;lost+=3091*Math.cos((90-((n/GW|0)+.5)*.5)*Math.PI/180);people+=W[n];if(near[n]>=0)disp[near[n]]+=W[n]}}}
  // contours → map shapes (lost land filled red; the new coastline outlined in red)
  const grid=new Float64Array(GW*GH),grid2=new Float64Array(GW*GH);
  const B=I.baseF;for(let k=0;k<f.length;k++){const gone=L[k]&&f[k]&&!(B&&B[k]);grid[k]=gone?1:0;grid2[k]=L[k]&&!gone?1:0}
  const toGeo=mp=>{mp.coordinates=mp.coordinates.map(poly=>{const p=poly.map(r=>r.map(([x,y])=>[-180+x*.5,90-y*.5]));
    return d3.geoArea({type:'Polygon',coordinates:p})>2*Math.PI?p.map(r=>r.reverse()):p});return mp};
  const cont=d3.contours().size([GW,GH]).thresholds([.5]);
  I.lostShape=toGeo(cont(grid)[0]);I.newShape=toGeo(cont(grid2)[0]);I.f=f;
  return {lost,people,disp};
}
function iInfo(){
  const c=ICAPS[$('icap').value],s=ISPEEDS[$('ispeed').value];
  const at2100=(c.n?SNMAX*ismooth(74/s.TN):0)+(c.s?SSMAX*ismooth(74/s.TS):0)+s.th*(1-Math.exp(-74/300));
  const full=(c.n?SNMAX:0)+(c.s?SSMAX:0)+s.th;
  $('iinfo').innerHTML=(I.loading?'<em>Loading real elevation data…</em><br>':'')+
    `BY 2100 <em>+${at2100.toFixed(2)} m</em> · ALL OF IT <em>+${full.toFixed(0)} m</em> over ~${fmt(Math.max(c.n?s.TN:0,c.s?s.TS:0))} years<br>`+
    (c.n&&!c.s?'Arctic sea ice adds nothing (it floats) — the sea rise is Greenland’s 7.4 m.':c.s&&!c.n?'Antarctica holds 58 m of sea level — eight times Greenland.':'Greenland 7.4 m + Antarctica 58 m + warming water expanding.');
}
function iceReset(){
  if(!I.ready)return;if(!I.dem){iInfo();iLoad();return}
  Object.assign(I,{started:false,running:false,t:0,ended:false,logged:{},flows:[],sN:0,sS:0,th:0,lastS:-1,lost:0,people:0,dead:0});
  nodes.forEach(n=>Object.assign(n,{iDisp:0,iDrown:null,iU:null,iC:null,iDead:0,iFlee:-99}));
  I.baseF=null;iFlood(0,0,0);I.baseF=I.f;iFlood(0,0,0);I.base=0;I.baseLost=0; // second pass redraws the shapes against the baseline
  $('log').innerHTML='';$('banner').style.display='none';
  $('igo').disabled=false;$('igo').textContent='🌊 START MELT';$('icap').disabled=$('ispeed').disabled=$('ichaos').disabled=false;iInfo();iHud();
}
function iStart(){
  I.started=true;I.C=ICAPS[$('icap').value];I.S=ISPEEDS[$('ispeed').value];$('icap').disabled=$('ispeed').disabled=$('ichaos').disabled=true;
  I.span=Math.max(I.C.n?I.S.TN:0,I.C.s?I.S.TS:0)*1.05;
  log(`<b>🌡 The poles begin to melt</b> — ${I.C.name.slice(2)} · ${I.S.name.toLowerCase()}`);
}
const iYear=()=>2026+Math.floor(I.t||0);
function iStep(dtY){
  const C=I.C,S=I.S,prev=I.t;I.t=Math.min(I.span,I.t+dtY);const t=I.t;
  I.sN=C.n?SNMAX*ismooth(t/S.TN):0;I.sS=C.s?SSMAX*ismooth(t/S.TS):0;I.th=S.th*(1-Math.exp(-t/300));
  const sea=I.sN+I.sS+I.th;
  if(sea-I.lastS>=.15||t>=I.span){
    I.lastS=sea;const r=iFlood(I.sN,I.sS,I.th);
    I.lost=r.lost-I.baseLost;I.people=Math.max(I.people,r.people-I.base);
    for(const n of nodes){
      const d=Math.max(0,r.disp[n.i]),add=Math.max(0,d-n.iDisp);
      // the displaced die at rates set by where they end up: camps, conflict, nowhere to go
      n.iDead+=add*(.01+.05*n.frag*n.frag)*(n.iC!=null?2:1);n.iDisp=Math.max(n.iDisp,d);
      if(n.iDrown==null&&I.f[n.iCell]&&n.iElev<sea*1.5){n.iDrown=t;if(!n.village&&n.m>=1)log(`<span style="color:#ff4d5e">🌊 ${n.name} is lost to the sea (${fmt(n.m*1e6)} people)</span>`)}
    }
  }
  // collapse: mass displacement topples fragile states
  if($('ichaos').checked)for(const n of nodes){if(n.iC!=null||n.iDisp<1)continue;
    const stress=Math.min(1,8*n.iDisp/n.N),f2=n.frag*n.frag,p=r=>1-Math.exp(-r*dtY);
    if(n.iU==null){if(Math.random()<p(.4*f2*stress)){n.iU=t;log(`<span style="color:rgb(${RIOT})">⚠ Unrest in ${n.name} as the coast empties inland</span>`)}}
    else if(Math.random()<p(.12*f2*stress)){n.iC=t;log(`<span style="color:rgb(${RIOT})"><b>☠ ${n.name} collapses</b> under the weight of the displaced</span>`)}
  }
  for(const a of nodes){if(a.iDisp<.02*a.N||t-a.iFlee<I.span/40)continue;a.iFlee=t;
    const b=d3.least(nodes.filter(b=>b!==a&&b.iDrown==null&&!b.port),b=>kmTo(a.ll,b.ll));if(b)I.flows.push({a,b,ip:d3.geoInterpolate(a.ll,b.ll),d:kmTo(a.ll,b.ll),rt0:performance.now()})}
  // milestones
  const once=(k,c,m)=>{if(c&&!I.logged[k]){I.logged[k]=1;log(m)}};
  once('arctic',C.n&&t>Math.min(20,S.TN*.02),'❄ The Arctic Ocean is ice-free in summer — zero sea-level rise (it floats), but dark water now soaks up the sun’s heat');
  once('amoc',I.sN>1.5,'<b>🌀 Greenland meltwater stalls the Atlantic current (AMOC)</b> — Europe’s winters turn brutal while the tropics overheat');
  once('green',I.sN>SNMAX*.98,'🏔 Greenland is bare rock');
  once('wais',I.sS>3.3,'<b>🧊 The West Antarctic Ice Sheet has collapsed</b> — +3.3 m, landing hardest on North America and Europe');
  once('eais',I.sS>10,'🧊 East Antarctica — the largest ice on Earth — is going');
  for(const m of [1,2,5,10,20,40,60])once('s'+m,sea>=m,`🌊 Sea level <b>+${m} m</b> · ${fmt(I.people)} people displaced · ${fmt(I.lost)} km² of land gone`);
  I.dead=d3.sum(nodes,n=>n.iDead);
  if(t>=I.span){I.ended=true;I.running=false;$('igo').disabled=true;
    $('banner').innerHTML=`THE NEW MAP · ${iYear()}<br><small>SEA LEVEL +${sea.toFixed(1)} m · ${fmt(I.people)} DISPLACED · ${fmt(I.dead)} DEAD</small>`;$('banner').style.display='block'}
}
function iceTick(dt){
  coastFade=I.started?Math.max(.15,1-(I.sN+I.sS+I.th)/15):1;
  if(I.running&&!I.ended)iStep(dt*(I.span/80)*(+$('speed').value/5));
  iHud();
}
const iceStamp=()=>I.started?String(iYear()):'—';
function iHud(){
  const sea=(I.sN||0)+(I.sS||0)+(I.th||0);
  $('iYear').textContent=iYear();$('iSea').textContent=`+${sea.toFixed(sea<10?2:1)} m`;
  $('iN').textContent=Math.round((I.sN||0)/SNMAX*100)+'%';$('iS').textContent=Math.round((I.sS||0)/SSMAX*100)+'%';
  $('iLand').textContent=fmt(I.lost||0)+' km²';$('iDisp').textContent=fmt(I.people||0);$('iDead').textContent=fmt(I.dead||0);
  $('iCity').textContent=`${nodes.filter(n=>n.iDrown!=null).length}/${nodes.length}`;
  $('iRiot').textContent=`${nodes.filter(n=>n.iU!=null).length} · ${nodes.filter(n=>n.iC!=null).length}`;
}
function iceTip(n){
  const sea=(I.sN||0)*(I.dem?I.dem.fN[n.iCell]:1)+(I.sS||0)*(I.dem?I.dem.fS[n.iCell]:1)+(I.th||0);
  return `<b>${n.name}</b><br>${fmt(n.m*1e6)} people (metro) · ~${Math.round(n.iElev||0)} m above sea`+
    `<br>local sea level <b>+${sea.toFixed(2)} m</b>`+(n.iDrown!=null?`<br><span style="color:#ff4d5e">UNDERWATER since ${2026+Math.floor(n.iDrown)}</span>`:'')+
    (n.iDisp>=1?`<br>${fmt(n.iDisp)} displaced in this region`:'')+(n.iC!=null?'<br><span style="color:#ff6e28">COLLAPSED</span>':n.iU!=null?'<br><span style="color:#ff6e28">unrest</span>':'')+
    `<br><span style="opacity:.6">${n.country} · fragility ${n.fsi}/120</span>`;
}
function iceDraw(c){
  const now=performance.now();
  // ice sheets shrink
  for(const co of countries){const nm=co.properties.name;if(nm!=='Greenland'&&nm!=='Antarctica')continue;
    const left=nm==='Greenland'?1-(I.sN||0)/SNMAX:1-(I.sS||0)/SSMAX;
    ctx.beginPath();path(co);ctx.fillStyle=`rgba(225,245,255,${.08+.42*left})`;ctx.fill()}
  // land lost to the sea (red), then the new coastline
  if(I.started&&I.lostShape&&I.lostShape.coordinates.length){ctx.beginPath();path(I.lostShape);ctx.fillStyle='rgba(255,40,60,.38)';ctx.fill()}
  if(I.started&&I.newShape){ctx.beginPath();path(I.newShape);ctx.lineWidth=1.3;ctx.strokeStyle='rgba(255,77,94,.95)';ctx.shadowColor='#ff2a3c';ctx.shadowBlur=6;ctx.stroke();ctx.shadowBlur=0}
  // refugees heading inland
  I.flows=(I.flows||[]).filter(f=>now-f.rt0<3000);
  for(const f of I.flows){const p=Math.min(1,(now-f.rt0)/2000),fade=p<1?1:1-(now-f.rt0-2000)/1000,N=Math.max(6,Math.round(f.d/200));
    ctx.beginPath();let pen=false,head=null;
    for(let k=0;k<=N;k++){const ll=f.ip(p*k/N);if(!front(ll)){pen=false;continue}const [x,y]=proj(ll);pen?ctx.lineTo(x,y):ctx.moveTo(x,y);pen=true;head=k===N?[x,y]:null}
    ctx.setLineDash([1,3]);ctx.lineWidth=1.3;ctx.strokeStyle=`rgba(${FLEE},${.8*fade})`;ctx.stroke();ctx.setLineDash([]);
    if(head&&p<1){ctx.beginPath();ctx.arc(head[0],head[1],3.5,0,7);ctx.fillStyle='#fff';ctx.fill()}}
  // cities
  for(const n of nodes){
    if(!front(n.ll))continue;const [x,y]=proj(n.ll);
    if(n.iU!=null){const fl=.5+.5*Math.random();ctx.beginPath();for(let k=0;k<=16;k++){const a=k/16*Math.PI*2,rr=9+(k%2?3:0)*fl;ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}ctx.lineWidth=1.3;ctx.strokeStyle=`rgba(${RIOT},${n.iC!=null?.95:.5+.4*fl})`;ctx.stroke()}
    if(n.iDrown!=null){ctx.strokeStyle='#ff4d5e';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(x-4,y-4);ctx.lineTo(x+4,y+4);ctx.moveTo(x+4,y-4);ctx.lineTo(x-4,y+4);ctx.stroke()}
    else{ctx.fillStyle=n.iDisp>.01*n.N?'#ffb070':n.village?'#f5b700':'#19e6c1';ctx.beginPath();ctx.arc(x,y,1.7,0,7);ctx.fill()}
    if(n===hover||zoom>2.5||(n.iDrown!=null&&n.m>=5&&zoom>1.3)){ctx.font='11px "Share Tech Mono"';ctx.fillStyle=n.iDrown!=null?'#ff4d5e':'rgba(200,255,245,.8)';ctx.fillText(n.name.split(',')[0],x+6,y-5)}
  }
}
if(land)iceInit();
