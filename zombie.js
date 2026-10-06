// ---------- ZOMBIES ----------
// Core model: Munz et al. (2009) "When zombies attack!" — humans H, bitten E, zombies Z.
// Encounters are frequency-dependent (H·Z/(H+Z)): each encounter is a bite (β) or a destroyed zombie (α).
// α grows once a region's army responds, scaled by military strength + gun ownership; collapse guts it.
// Hordes walk the ground routes (water stops them — except slow ones, who walk the seabed, as in World War Z).
// The bitten fly and sail until they turn; fast types turn too quickly to make it onto a plane.
const ZTYPES=[
 {name:'🐌 Slow shufflers',src:'Night of the Living Dead · The Walking Dead',kmh:3,turn:36,beta:.5,alpha:2,eaten:.25,rise:.5,rot:1/(3*365),seabed:1,board:0,
  note:'Shamble at 3 km/h. A bite takes ~36 hours to turn you — long enough to board a plane. Half of those eaten rise again.'},
 {name:'🚶 Medium walkers',src:'World War Z (book) · Resident Evil',kmh:6,turn:8,beta:1.1,alpha:1.2,eaten:.25,rise:.3,rot:1/(2*365),board:.02,
  note:'Walk at 6 km/h and never stop. Turn in ~8 hours.'},
 {name:'🏃 Fast runners',src:'28 Days Later · Dawn of the Dead (2004)',kmh:20,turn:.25,beta:2.5,alpha:.8,eaten:.15,rise:0,rot:1/35,board:.08,
  note:'Sprint at 20 km/h; turn in ~15 minutes. But they’re alive — with nothing left to eat they starve in about 5 weeks.'},
 {name:'⚡ Superfast swarm',src:'World War Z (film) · Train to Busan',kmh:35,turn:.005,beta:5,alpha:.45,eaten:.1,rise:0,rot:1/365,board:.25,
  note:'Swarm at 35 km/h and pile over walls. Turn in 12 seconds — no bitten passenger ever makes it onto a plane.'},
];
// Military strength + civilian gun ownership, 0–1 (rough blend of Global Firepower 2024 and the Small Arms Survey)
const MIL={'United States of America':1,'Russia':.9,'China':.85,'South Korea':.85,'India':.65,'Pakistan':.6,'Turkey':.7,'Iran':.6,
 'Egypt':.55,'France':.7,'United Kingdom':.65,'Japan':.45,'Germany':.5,'Italy':.5,'Spain':.5,'Brazil':.45,'Indonesia':.5,'Saudi Arabia':.55,
 'Vietnam':.6,'Thailand':.5,'Mexico':.45,'Nigeria':.35,'Iraq':.5,'Colombia':.5,'Australia':.6,'Canada':.55,'Norway':.6,'Philippines':.4,
 'Bangladesh':.35,'Ethiopia':.35,'Dem. Rep. Congo':.15,'Sudan':.3,'Yemen':.35,'Kenya':.3,'Chile':.45,'Argentina':.45,'Peru':.4,'South Africa':.45};
const ZG='120,220,60';
const Z={trips:[],flashes:[],stage:0,started:false,running:false,acc:0};

function zombieInit(){
  if(Z.ready)return;Z.ready=true;if(!mask)buildMask();
  ZTYPES.forEach((t,i)=>$('ztype').add(new Option(t.name,i)));$('ztype').value=1;
  for(const [label,f] of [['10 MOST POPULOUS CITIES','top'],['10 MOST REMOTE VILLAGES (1K+)','village']]){
    const g=document.createElement('optgroup');g.label=label;nodes.filter(n=>n[f]).forEach(n=>g.append(new Option(n.name,n.i)));$('zorigin').append(g);
  }
  $('zorigin').value=nodes.find(n=>n.name==='New Delhi').i;
  $('ztype').onchange=zInfo;$('zorigin').onchange=()=>zSetOrigin(nodes[$('zorigin').value]);
  $('zgo').onclick=()=>{if(!Z.started)zStart();Z.running=!Z.running;$('zgo').textContent=Z.running?'❚❚ PAUSE':'▶ RESUME'};
  $('zreset').onclick=zombieReset;
  // can a horde walk this route? sample the path for open water
  for(const r of routes)if(r.mode==='ground'){const ip=d3.geoInterpolate(r.a.ll,r.b.ll);r.dry=d3.range(1,12).every(k=>isLand(ip(k/12)))}
  nodes.forEach(n=>n.mil=MIL[n.country]??.35);
  zInfo();zombieReset();
}
function zInfo(){const t=ZTYPES[$('ztype').value];$('zinfo').innerHTML=`SPEED <em>${t.kmh} km/h</em> · TURNS IN <em>${t.turn>=1?t.turn+' h':t.turn>=.1?Math.round(t.turn*60)+' min':Math.round(t.turn*3600)+' s'}</em><br>${t.note}<br><span style="opacity:.7">${t.src}</span>`}
function zSetOrigin(n){Z.origin=n;$('zorigin').value=n.i;flyTo=[-n.lon,-n.lat]}
function zombieClick(){if(hover&&!Z.started)zSetOrigin(hover)}
function zombieReset(){
  if(!Z.ready)return;
  Object.assign(Z,{trips:[],flashes:[],stage:0,stageAt:[],started:false,running:false,acc:0,ended:false,logged:{}});
  day=0;nodes.forEach(n=>Object.assign(n,{zH:n.N,zE:0,zZ:0,zD:0,zK:0,zHit:null,zDet:null,zFall:null,zClear:null,zU:null,zC:null,zPeak:0,zFlee:-99}));
  for(const r of routes)r.zBusy={};
  $('log').innerHTML='';$('banner').style.display='none';
  $('zgo').disabled=false;$('zgo').textContent='🧟 UNLEASH';$('ztype').disabled=$('zorigin').disabled=$('zchaos').disabled=$('zwinter').disabled=false;
  zSetOrigin(Z.origin||nodes[$('zorigin').value]);zHud();
}
function zStart(){
  Z.started=true;Z.T=ZTYPES[$('ztype').value];$('ztype').disabled=$('zorigin').disabled=$('zchaos').disabled=$('zwinter').disabled=true;
  const o=Z.origin;o.zH-=3;o.zZ=3;o.zHit=0; // patient zero and the family
  log(`<span style="color:rgb(${ZG})"><b>🧟 Patient zero turns in ${o.name}</b> — ${Z.T.name.slice(2).toLowerCase()}</span>`);
}

// northern winter Dec–Feb, southern Jun–Aug (day 0 = 6 Oct); the dead freeze solid at high latitudes
const zDoy=()=>(279+day)%365;
const zCold=n=>$('zwinter').checked&&((n.lat>45&&(zDoy()>=335||zDoy()<60))||(n.lat<-45&&zDoy()>=152&&zDoy()<244))?.15:1;
const zResp=n=>n.zDet==null||day<n.zDet?0:Math.min(1,(day-n.zDet)/5);

function zStep(){
  const T=Z.T,h=1/24,ban=Z.stage>=2;
  for(const n of nodes){
    if(n.zZ+n.zE<=0)continue;
    const cold=zCold(n),b=T.beta*cold*(n.zC!=null?1.3:1),a=T.alpha*(.15+zResp(n)*(.3+1.2*n.mil))*(n.zC!=null?.4:1)*(1/cold>1?2:1);
    for(let s=0;s<24;s++){
      const enc=n.zH*n.zZ/(n.zH+n.zZ+1),bites=Math.min(n.zH,b*enc*h),kills=Math.min(n.zZ,a*enc*h);
      // bitten turn at 1/turn per hour; when turning takes under an hour, only that sliver of the hour's victims is still "human"
      const eaten=bites*T.eaten,fresh=bites-eaten,f=1-Math.exp(-1/T.turn),quick=T.turn<1,rot=n.zZ*T.rot*h;
      const turn=n.zE*f+(quick?fresh*(1-T.turn):0);
      n.zH-=bites;n.zD+=eaten*(1-T.rise);n.zE+=(quick?fresh*T.turn:fresh)-n.zE*f;
      n.zZ+=turn+eaten*T.rise-kills-rot;n.zK+=kills+rot;
    }
    if(n.zZ<.5&&n.zE<.5){n.zK+=n.zZ;n.zH+=n.zE;n.zZ=n.zE=0}
    n.zPeak=Math.max(n.zPeak,n.zZ);
    // first written off as riots or rabies; fragile states take longer to send in the army
    if(n.zDet==null&&n.zZ>=300){n.zDet=day+Math.round(2+6*n.frag);if(!Z.stageAt[1]){Z.stage=1;Z.stageAt[1]=day;log(`📡 Reports of the dead attacking the living in ${n.name}`)}}
    if(n.zDet===day)log(`<span style="color:#19e6c1">🪖 Army deployed in ${n.name} (strength ${Math.round(n.mil*100)}%)</span>`);
    if(n.zFall==null&&n.zH<.02*n.N){n.zFall=day;log(`<span style="color:rgb(${ZG})"><b>☠ ${n.name} has fallen</b> — fewer than 2% of people left</span>`)}
    if(n.zClear==null&&n.zPeak>=100&&n.zZ===0&&n.zE===0&&n.zFall==null){n.zClear=day;log(`<span style="color:#19e6c1">✅ ${n.name} cleared — the last zombie destroyed</span>`)}
  }
  // global response: once the outbreak is undeniable, flights and shipping are grounded
  const totZ=d3.sum(nodes,n=>n.zZ);
  if(Z.stage===1&&totZ>=1e4){Z.stage=2;Z.stageAt[2]=day;log('<b style="color:#19e6c1">🌐 WHO declares a global emergency — flights grounded (−90%), ports closed (−80%)</b>')}
  // travel: hordes walk, the bitten fly and sail
  for(const r of routes)for(const [a,b] of [[r.a,r.b],[r.b,r.a]]){
    if(r.mode==='ground'){
      if(a.zZ<50||b.zFall!=null||r.zBusy[a.i])continue;
      const seabed=!r.dry&&T.seabed;if(!r.dry&&!seabed)continue;
      const cold=zCold(a),p=Math.min(1,a.zZ/2e4)*cold*(seabed?.1:1);
      if(Math.random()<p){
        const k=Math.max(5,a.zZ*.003*T.kmh/5);a.zZ-=k;r.zBusy[a.i]=1;
        const days=Math.max(1,Math.round(r.d/(T.kmh*24*cold)*(seabed?3:1)));
        zTrip(a,b,'horde',k,days,r);
        if(seabed&&!Z.logged.seabed){Z.logged.seabed=1;log(`🌊 Zombies walk into the sea at ${a.name} — and out of it at ${b.name}`)}
      }
      continue;
    }
    const fe=a.zE/(a.zH+a.zE+1);if(fe<=0||b.zFall!=null)continue;
    const hrs=r.mode==='air'?r.d/800+3:r.days*24,live=Math.exp(-hrs/T.turn);
    const mult=(r.mode==='air'?(a.zC!=null?.1:ban?.1:1):(a.zC!=null?1:ban?.2:1))*(zResp(a)>0&&a.zC==null?.3:1);
    const lamCarry=r.pax*mult*fe*live,lamTurn=r.pax*mult*fe*(1-live);
    if(Math.random()<1-Math.exp(-lamCarry))zTrip(a,b,r.mode==='air'?'bitten':'ship',Math.max(1,Math.round(lamCarry)),r.days,r);
    if(Math.random()<1-Math.exp(-lamTurn)){
      if(r.mode==='air'&&Math.random()<.85){const ip=d3.geoInterpolate(a.ll,b.ll);Z.flashes.push({ll:ip(.3+Math.random()*.4),rt0:performance.now()});
        if(!Z.logged['crash'+a.i]){Z.logged['crash'+a.i]=1;log(`<span style="color:#ff6e28">✸ Flight ${a.name} → ${b.name} goes down — a passenger turned mid-air</span>`)}}
      else zTrip(a,b,r.mode==='air'?'zplane':'ghost',r.mode==='air'?40:20,r.days,r);
    }
  }
  // swarms storm the airport/docks of overrun cities and ride out on whatever is still leaving
  for(const a of nodes){
    if(!T.board||a.zZ<a.zH||a.zZ<1e4||Math.random()>T.board)continue;
    const out=routes.filter(r=>(r.mode==='air'||(r.mode==='sea'&&a.port))&&(r.a===a||r.b===a));if(!out.length)continue;
    const r=out[Math.random()*out.length|0],b=r.a===a?r.b:r.a;if(b.zFall!=null||b.village)continue; // no airliner lands on a village strip
    zTrip(a,b,r.mode==='air'?'zplane':'ghost',r.mode==='air'?40:20,r.days,r);
    if(!Z.logged['board'+a.i]){Z.logged['board'+a.i]=1;log(`<span style="color:rgb(${ZG})">🧟 The swarm storms the ${r.mode==='air'?'airport':'docks'} in ${a.name}</span>`)}
  }
  // refugees: people flee overrun places overland — some of them already bitten
  for(const a of nodes){
    if(a.zZ/(a.zH+1)<.02||a.zH<1e4||day-a.zFlee<4||a.zFall!=null)continue;a.zFlee=day;
    routes.filter(r=>r.mode==='ground'&&r.dry&&(r.a===a||r.b===a)).map(r=>r.a===a?r.b:r.a).filter(b=>b.zFall==null).slice(0,3)
      .forEach(b=>{const k=a.zE*.02*(a.zC!=null?3:1);if(k>=.5){a.zE-=k;zTrip(a,b,'refugee',k,1+Math.round(kmTo(a.ll,b.ll)/400),null)}});
  }
  // collapse: governments fall where the dead outnumber the living's capacity to fight
  if($('zchaos').checked)for(const n of nodes){
    if(n.zC!=null||n.zZ<1)continue;
    const stress=Math.min(1,5*n.zZ/(n.zH+1)+5*n.zD/n.N),f2=n.frag*n.frag;
    if(n.zU==null){if(Math.random()<.15*f2*stress+.02*stress){n.zU=day;log(`<span style="color:rgb(${RIOT})">⚠ Panic and looting in ${n.name}</span>`)}}
    else if(Math.random()<.05*f2*stress+.005*stress){n.zC=day;log(`<span style="color:rgb(${RIOT})"><b>☠ Government collapses in ${n.name}</b> (${n.country}) — the army scatters</span>`)}
  }
  day++;
  for(const t of Z.trips)if(!t.done&&t.t1<=day){t.done=true;zArrive(t)}
  Z.trips=Z.trips.filter(t=>!t.done||performance.now()-t.rt0<t.dur+FADE);
  // winter
  const d=zDoy();
  if($('zwinter').checked&&d===335)log('❄ Northern winter — zombies above 45°N freeze solid. Humans counter-attack.');
  if($('zwinter').checked&&d===60&&day>1)log('🌡 Spring thaw in the north — the frozen dead begin to move again');
  // endings
  const H=d3.sum(nodes,n=>n.zH+n.zE),Zt=d3.sum(nodes,n=>n.zZ),Et=d3.sum(nodes,n=>n.zE);
  const holdouts=nodes.filter(n=>n.village&&n.zFall==null);
  if(H<1e3)zEnd('HUMANITY FALLS');
  else if(nodes.every(n=>n.village||n.zFall!=null))zEnd(holdouts.length?`CIVILISATION FALLS — ${holdouts.length} remote villages hold out`:'HUMANITY FALLS',holdouts);
  else if(Zt<.5&&Et<.5&&!Z.trips.some(t=>!t.done))zEnd('THE DEAD ARE GONE — HUMANITY SURVIVES');
  else if(day>=1095)zEnd('3 YEARS ON');
}
function zTrip(a,b,kind,k,days,r){
  const show=b.zHit==null||Math.random()<.05;
  Z.trips.push({a,b,kind,k,t1:day+Math.max(1,days),ip:d3.geoInterpolate(a.ll,b.ll),d:kmTo(a.ll,b.ll),rt0:performance.now(),dur:Math.max(1000,days/+$('speed').value*1000),show});
}
function zArrive(t){
  const b=t.b;
  if(t.kind==='horde'||t.kind==='zplane'||t.kind==='ghost')b.zZ+=t.k;
  else{const k=Math.min(t.k,b.zH);b.zH-=k;b.zE+=k}
  if(b.zHit==null){b.zHit=day;
    const msg={horde:`🧟 A horde from ${t.a.name} reaches <span style="color:#fff">${b.name}</span>`,bitten:`✈ A bitten passenger lands in <span style="color:#fff">${b.name}</span> from ${t.a.name}`,
      ship:`⚓ A ship from ${t.a.name} docks at <span style="color:#fff">${b.name}</span> with the bitten aboard`,zplane:`✈ <b>A plane from ${t.a.name} lands in ${b.name} — everyone aboard has turned</b>`,
      ghost:`⚓ <b>A ghost ship drifts into ${b.name} — crew all turned</b>`,refugee:`🏃 Refugees from ${t.a.name} bring the bitten to <span style="color:#fff">${b.name}</span>`}[t.kind];
    log(`<span style="color:rgb(${ZG})">${msg}</span>`);
  }
}
function zEnd(msg,holdouts){
  Z.ended=true;Z.running=false;$('zgo').disabled=true;
  if(holdouts&&holdouts.length)log(`<span style="color:#19e6c1">🏔 Last outposts of humanity: ${holdouts.map(n=>n.name.split(',')[0]).join(', ')}</span>`);
  const H=d3.sum(nodes,n=>n.zH+n.zE);
  $('banner').innerHTML=`${msg} · DAY ${day}<br><small>${fmt(H)} HUMANS LEFT · ${fmt(WORLD-H)} DEAD OR TURNED</small>`;$('banner').style.display='block';log(msg);
}
function zombieTick(dt){
  if(Z.running){Z.acc+=dt*+$('speed').value;while(Z.acc>=1&&Z.running){zStep();Z.acc-=1}}
  zHud();
}
function zHud(){
  const H=d3.sum(nodes,n=>n.zH+n.zE);
  $('zDay').textContent=day;$('zZ').textContent=fmt(d3.sum(nodes,n=>n.zZ));$('zH').textContent=fmt(H);$('zDead').textContent=fmt(WORLD-H);
  $('zKill').textContent=fmt(d3.sum(nodes,n=>n.zK));$('zFall').textContent=`${nodes.filter(n=>n.zFall!=null).length}/${nodes.length}`;
  $('zStage').textContent=['QUIET','OUTBREAK','GLOBAL EMERGENCY'][Z.stage];
}
function zombieTip(n){
  return `<b>${n.name}</b><br>humans ${fmt(n.zH)}<br>bitten (not yet turned) ${fmt(n.zE)}<br><span style="color:rgb(${ZG})">zombies ${fmt(n.zZ)}</span><br>destroyed ${fmt(n.zK)}`+
    (n.zFall!=null?`<br><span style="color:rgb(${ZG})">FALLEN day ${n.zFall}</span>`:n.zClear!=null?`<br><span style="color:#19e6c1">CLEARED day ${n.zClear}</span>`:zResp(n)>0?`<br><span style="color:#19e6c1">army fighting since day ${n.zDet}</span>`:'')+
    (n.zC!=null?`<br><span style="color:#ff6e28">GOVERNMENT COLLAPSED day ${n.zC}</span>`:'')+(zCold(n)<1?'<br>❄ frozen — zombies dormant':'')+
    `<br><span style="opacity:.6">${n.country} · military ${Math.round(n.mil*100)}% · fragility ${n.fsi}/120</span>`+(!Z.started?'<br><span style="color:#ff2a6d">click to set patient zero</span>':'');
}

function zombieDraw(c){
  const now=performance.now();
  // countries tinted by how much of them the dead hold
  for(const co of countries){if(!co.nodes.length)continue;const z=d3.sum(co.nodes,n=>n.zZ+(n.zFall!=null?n.N*.3:0))/d3.sum(co.nodes,n=>n.N);
    if(z>1e-7){ctx.beginPath();path(co);ctx.fillStyle=`rgba(${ZG},${Math.min(.55,.06+.5*Math.sqrt(z))})`;ctx.fill()}}
  // trips
  for(const t of Z.trips){
    if(!t.show)continue;
    const el=now-t.rt0,p=Math.min(1,el/t.dur),fade=el>t.dur?Math.max(0,1-(el-t.dur)/FADE):1;if(p<=0||!fade)continue;
    const air=t.kind==='bitten'||t.kind==='zplane',lift=air?.2*Math.min(1,t.d/6000):0,N=Math.max(8,Math.round(t.d/250));
    ctx.beginPath();let pen=false,head=null;
    for(let s=0;s<=N;s++){const u=p*s/N,ll=t.ip(u);if(!front(ll)){pen=false;continue}let [x,y]=proj(ll);const m=1+lift*Math.sin(Math.PI*u);x=c[0]+(x-c[0])*m;y=c[1]+(y-c[1])*m;pen?ctx.lineTo(x,y):ctx.moveTo(x,y);pen=true;head=s===N?[x,y]:null}
    const col={horde:ZG,ship:'245,183,0',ghost:ZG,refugee:FLEE,zplane:ZG}[t.kind]||'255,42,109';
    ctx.setLineDash({horde:[2,3],ship:[4,4],ghost:[4,4],refugee:[1,3]}[t.kind]||[]);ctx.lineWidth=t.kind==='horde'?2:1.3;ctx.strokeStyle=`rgba(${col},${.8*fade})`;ctx.stroke();ctx.setLineDash([]);
    if(head&&p<1){ctx.beginPath();ctx.arc(head[0],head[1],t.kind==='horde'?3+Math.min(5,Math.log10(t.k)):4,0,7);ctx.fillStyle=t.kind==='horde'?`rgb(${ZG})`:'#fff';ctx.shadowColor=`rgb(${col})`;ctx.shadowBlur=12;ctx.fill();ctx.shadowBlur=0}
  }
  // plane crashes
  Z.flashes=Z.flashes.filter(f=>now-f.rt0<1800);
  for(const f of Z.flashes){if(!front(f.ll))continue;const [x,y]=proj(f.ll),k=(now-f.rt0)/1800;ctx.beginPath();ctx.arc(x,y,3+k*16,0,7);ctx.strokeStyle=`rgba(255,110,40,${1-k})`;ctx.lineWidth=2;ctx.stroke()}
  // nodes
  for(const n of nodes){
    if(!front(n.ll))continue;const [x,y]=proj(n.ll);
    if(n.zZ>=1){const r=2+2.2*Math.log10(1+n.zZ);ctx.beginPath();ctx.arc(x,y,r*1.8,0,7);ctx.fillStyle=`rgba(${ZG},.12)`;ctx.fill();ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fillStyle=`rgba(${ZG},${zCold(n)<1?.25:.6})`;ctx.fill()}
    if(zResp(n)>0&&n.zZ>=1&&n.zC==null){const r=7+2.2*Math.log10(1+n.zZ);ctx.setLineDash([3,3]);ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.lineWidth=1.2;ctx.strokeStyle='rgba(25,230,193,.8)';ctx.stroke();ctx.setLineDash([])}
    if(n.zU!=null){const fl=.5+.5*Math.random(),r=10+2*Math.log10(1+n.zZ);ctx.beginPath();for(let k=0;k<=16;k++){const a=k/16*Math.PI*2,rr=r+(k%2?3:0)*fl;ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}
      ctx.lineWidth=1.3;ctx.strokeStyle=`rgba(${RIOT},${n.zC!=null?.95:.5+.4*fl})`;ctx.stroke()}
    if(n.zFall!=null){ctx.font='13px sans-serif';ctx.fillStyle=`rgb(${ZG})`;ctx.fillText('☠',x-6,y+5);continue}
    if(n.zClear!=null){ctx.font='12px sans-serif';ctx.fillStyle='#19e6c1';ctx.fillText('✓',x-4,y+4);continue}
    ctx.fillStyle=n.village?'#f5b700':'#19e6c1';ctx.beginPath();ctx.arc(x,y,1.6,0,7);ctx.fill();
    if(n===Z.origin||n===hover||(n.zZ>1e6&&zoom>1.4)){ctx.font='11px "Share Tech Mono"';ctx.fillStyle=n===Z.origin?`rgb(${ZG})`:'rgba(200,255,245,.8)';ctx.fillText(n.name.split(',')[0],x+6,y-5)}
  }
}

if(land)zombieInit();
