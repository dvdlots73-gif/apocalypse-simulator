// ---------- BRAG TRAILER ----------  open index.html?trailer
// Every cue fires off the audio clock (audio.currentTime), so cuts stay locked to the music.
// Cue times come from the track itself: bass hits, the break at 51.2 s, the drop at 52.3 s, the peak at 80–86 s.
// Picture is a centred 16:9 frame; the camera layer adds shake, zoom kicks, slow push-ins and rumbles.
const TR={on:/[?&]trailer/.test(location.search),render:/[?&]render/.test(location.search),i:0,flash:0,black:1,blackTo:1};
const TRACK='Trailer Music - Apocalypse SIM edit.mp3';
const HITS=[21.5,34.9,51.3,52.3,54.5,62.7,67.6,74.1,80.4,82.1,83.8,85.5]; // flash + kick on each

// ---- camera: target zoom it eases toward, a slow drift on that target, decaying shake, timed rumbles ----
const CAM={zt:1,ease:3,drift:0,amp:0,rumble:0,rumbleTo:0};
const camTo=(z,ease=3)=>{CAM.zt=z;CAM.ease=ease};
const shake=a=>{CAM.amp=Math.max(CAM.amp,a)};
const kick=(a,zk=.06)=>{shake(a);zoom*=1+zk};                         // punch in; it eases back to the target
const rumble=(a,dur)=>{CAM.rumble=a;CAM.rumbleTo=TR.t+dur};
function trCam(lon,lat,z,{spin=true,drift=0}={}){rot=[-lon,-lat];flyTo=null;zoom=z;camTo(z);CAM.drift=drift;$('spin').checked=spin}

function trSpeed(v){const s=$('speed');s.value=v;s.dispatchEvent(new Event('input'))}
function trCard(html,cls=''){const c=$('trCard');c.className=cls;c.innerHTML=html;c.style.opacity=html?1:0}
function trBlack(on){TR.blackTo=on?1:0}
function trHud(on){$('hud').style.opacity=on?1:0}
function trFlash(a=.35){TR.flash=Math.max(TR.flash,a)}
const jump=hours=>{M.s=Math.log(1+hours)/.35}; // skip a disaster's clock ahead

// ---- 16:9 frame: the globe canvas, HUD and captions all live inside it; the rest is black ----
function trFrame(){
  const r=devicePixelRatio||1,ww=innerWidth,wh=innerHeight;let w=ww,h=ww*9/16;if(h>wh){h=wh;w=wh*16/9}
  const x=(ww-w)/2,y=(wh-h)/2;W=w;H=h;
  Object.assign(cv.style,{inset:'auto',left:x+'px',top:y+'px',width:w+'px',height:h+'px'});
  cv.width=w*r;cv.height=h*r;ctx.setTransform(r,0,0,r,0,0);
  Object.assign($('hud').style,{left:x+'px',right:(ww-x-w)+'px',top:y+'px'});
  Object.assign($('trFrame').style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'});
}

// --- scenes: each sets a mode up and (if needed) fast-forwards it to the dramatic part ---
const SC={
  plague(){setMode('plague');$('pathogen').value=0;disease=DISEASES[0];$('protocol').value='none';reset();setOrigin(nodes.find(n=>n.name==='Dhaka'));
    seed(origin,1);started=true;for(let k=0;k<75;k++)step();running=true;trSpeed(20)},
  zombie(city='New Delhi',days=8,sp=3){setMode('zombie');$('ztype').value=3;zSetOrigin(nodes.find(n=>n.name===city));zStart();for(let k=0;k<days;k++)zStep();Z.running=true;trSpeed(sp)},
  crop(){setMode('crop');$('cblight').value=6;$('cblight').onchange();cStart();for(let k=0;k<100;k++)cStep();C.running=true;trSpeed(25)},
  meteor(size,tgt,now){setMode('meteor');$('msize').value=size;$('mtarget').value=tgt;pickTarget();$('mwarn').value='0';meteorReset();launch();if(now)impact();flyTo=null},
  quake(){setMode('quake');$('qmag').value=3;$('qfault').value=2;meteorReset();quakePick();launch();trSpeed(8)},
  reactor(h){setMode('reactor');$('rtarget').value=-1;$('rines').value=2;reactorPick();reactorReset();launch();if(h)jump(h);trSpeed(14)},
  volcano(site,vei,h){setMode('volcano');$('vsite').value=site;$('vsite').onchange();$('vvei').value=vei;$('vvei').onchange();volcanoReset();launch();if(h)jump(h);trSpeed(10)},
  ice(end){setMode('ice');$('icap').value=2;$('ispeed').value=3;iceReset();iStart();if(end)iStep(I.span);else I.running=true;trSpeed(30)},
};

const CUES=[
  [0,()=>{trBlack(1);trHud(0);trCard('')}],
  [1.0,()=>trCard('APOCALYPSE<i>//</i>SIM','title glitch')],
  [4.4,()=>{trCard('Are you ready…','line');shake(6)}],
  [7.3,()=>{trCard('…for the end of the world?','line');shake(8)}],
  [9.8,()=>{trCard('');trBlack(0);setMode('plague');reset();origin=null;trCam(20,20,.55,{drift:.06});camTo(.85,.6);shake(10)}], // slow reveal push-in
  [11.5,()=>{trCard('Eight ways it all ends.','line over');kick(6,.04)}],
  [14.9,()=>{trCard('You choose.','line over big');kick(14,.1);trFlash(.4)}],
  [17.4,()=>{trCard('');trHud(1);SC.plague();trCam(85,22,1.15,{drift:.05});trCard('☣ PLAGUE','tag')}],
  [21.5,()=>{SC.zombie();trCam(78,25,1.0,{drift:.09});camTo(1.5,.35);trCard('🧟 ZOMBIES','tag')}],      // push in on the swarm
  [28.2,()=>{SC.crop();trCam(-95,35,1.6,{drift:-.04});camTo(1.15,.5);trCard('🌪 CROP FAILURE','tag')}], // pull back over the dust
  [33.1,()=>{SC.meteor(7,'o:6');trSpeed(14);trCam(-90,25,1.15,{spin:false,drift:.03});trCard('☄ METEOR','tag')}], // 1.8 s fall → lands on 34.9
  [34.9,()=>{kick(26,.22);rumble(5,2.5);camTo(1.55,1.2)}],                                             // IMPACT
  [43.0,()=>{SC.quake();trCam(140,37,1.3,{drift:.05});rumble(9,4);trCard('🌐 SUPER QUAKE','tag')}],
  [47.3,()=>{SC.reactor(30);trCam(60,45,.95,{drift:.06});trCard('☢ MELTDOWN','tag')}],
  [49.8,()=>trCard('Can you survive the apocalypse?','line over big')],
  [51.2,()=>{trHud(0);trBlack(1);CAM.amp=0}],
  [52.3,()=>{trBlack(0);trHud(1);SC.volcano(0,5);trCam(-105,40,2.4);camTo(1.25,.7);kick(30,.12);rumble(7,3);trCard('🌋 SUPERVOLCANO','tag')}], // THE DROP: pull back from the vent
  [62.7,()=>{SC.ice();trCam(-40,30,1.4);camTo(.95,.35);trCard('❄ ICE CAPS MELT','tag')}],              // slow pull-back as the seas rise
  [67.6,()=>{SC.meteor(8,'o:1',true);trSpeed(12);trCam(-35,30,1.0,{drift:.04});kick(34,.25);rumble(10,3);trCard('','tag')}],
  [74.1,()=>{SC.zombie('Lagos',18,2);trCam(15,10,.95,{drift:.1});camTo(1.45,.5)}],
  [80.4,()=>{SC.volcano(1,5,2000);trCam(95,5,1.3,{drift:.08})}],
  [82.1,()=>{SC.meteor(7,'o:6',true);jump(8760);trSpeed(10);trCam(-80,20,1.3,{drift:.08})}],
  [83.8,()=>{SC.ice(true);trCam(100,25,1.3,{drift:.08})}],
  [85.5,()=>{SC.reactor(400);trCam(110,35,1.3,{drift:.08});rumble(6,1.8)}],
  [87.3,()=>{trHud(0);trBlack(1);running=false;Z.running=false;C.running=false;CAM.amp=0;trCard('Human sacrifice.<br>Dogs and cats living together…','line')}],
  [89.8,()=>{trCard('MASS HYSTERIA.','line big');kick(12,0)}],
  [92.4,()=>trCard('APOCALYPSE<i>//</i>SIM<small>8 ways to end the world</small>','title')],
  [95.5,()=>{TR.playing=false;const e=document.createElement('div');e.id='trPlay';e.innerHTML='<button>↺ REPLAY</button>';document.body.append(e);
    e.querySelector('button').onclick=()=>{e.remove();TR.play()}}],
];

function trailerInit(){
  if(!TR.on||TR.inited)return;TR.inited=true;
  document.body.classList.add('trailer');if(TR.render)document.body.classList.add('render');
  const css=document.createElement('style');css.textContent=`
  body.trailer{background:#000}
  body.trailer #panel,body.trailer #log,body.trailer #tip,body.trailer #banner{display:none!important}
  body.trailer #hud{transition:opacity .4s}
  #trFrame{position:fixed;pointer-events:none;z-index:10;box-shadow:0 0 0 100vmax #000} /* above the black + flash layers so captions show over them */
  #trBlack{position:fixed;inset:0;background:#000;pointer-events:none;z-index:8}
  body.render *{transition:none!important;animation:none!important}
  #trFlash{position:fixed;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:9}
  #trCard{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;transition:opacity .25s;padding:0 16px;z-index:10;
    font:400 clamp(20px,3.6vw,44px) 'Share Tech Mono',monospace;letter-spacing:.2em;color:#e8fffb;text-shadow:0 0 14px var(--line)}
  #trCard.title{font-size:clamp(34px,7.5vw,96px);letter-spacing:.12em}
  #trCard.title i{color:var(--hot);font-style:normal}
  #trCard small{display:block;font-size:.22em;letter-spacing:.5em;margin-top:18px;opacity:.75;color:#9ff5e6}
  #trCard.big{font-size:clamp(28px,5.6vw,72px);color:#fff;text-shadow:0 0 18px var(--hot)}
  #trCard.over{text-shadow:0 0 8px #000,0 0 22px #000,0 0 14px var(--line)}
  #trCard.tag{top:auto;bottom:7%;transform:none;font-size:clamp(16px,2.4vw,30px);letter-spacing:.35em;color:var(--hot);text-shadow:0 0 12px var(--hot),0 0 4px #000}
  #trCard.glitch{animation:glitch 2.2s steps(1) infinite}
  @keyframes glitch{0%{text-shadow:2px 0 var(--hot),-2px 0 var(--line)}8%{text-shadow:-3px 1px var(--hot),3px -1px var(--line)}12%{text-shadow:0 0 14px var(--line)}60%{text-shadow:1px 0 var(--hot),-1px 0 var(--line)}64%{text-shadow:0 0 14px var(--line)}}
  #trPlay{position:fixed;inset:0;z-index:11;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:#000;color:#9ff5e6;font:14px 'Share Tech Mono',monospace;letter-spacing:.2em}
  #trPlay button{width:auto;padding:14px 34px;font-size:18px;color:var(--hot);border-color:var(--hot);box-shadow:0 0 14px #ff2a6d55}`;
  document.head.append(css);
  // the frame's huge box-shadow paints the letterbox bars; captions live inside it so they stay in 16:9
  const fr=document.createElement('div');fr.id='trFrame';document.body.append(fr);
  const card=document.createElement('div');card.id='trCard';fr.append(card);
  for(const id of ['trBlack','trFlash']){const d=document.createElement('div');d.id=id;document.body.append(d)}
  trFrame();addEventListener('resize',trFrame);
  const p=document.createElement('div');p.id='trPlay';
  p.innerHTML='<div>APOCALYPSE//SIM — TRAILER</div><button disabled>LOADING…</button><div style="opacity:.6;font-size:11px">16:9 · plays fullscreen · press Esc to exit</div>';
  document.body.append(p);
  const audio=new Audio(encodeURI(TRACK));audio.preload='auto';TR.audio=audio;
  if(!I.dem)iLoad(); // the ice scenes need the elevation data ready before 62.7 s
  const btn=p.querySelector('button');
  // ?trailer&render: start by itself on a frame-stepped clock, silent (the export muxes the MP3 in afterwards)
  const wait=setInterval(()=>{if(I.dem&&(TR.render||audio.readyState>=3)){clearInterval(wait);btn.disabled=false;btn.textContent='▶ PLAY TRAILER';if(TR.render){p.remove();play()}}},200);
  const play=TR.play=()=>{trCard('');TR.i=0;TR.h=0;CAM.amp=0;TR.playing=true;TR.endAt=null;TR.t0=performance.now();if(!TR.render){audio.currentTime=0;audio.play()}};
  btn.onclick=()=>{document.documentElement.requestFullscreen?.().catch(()=>{});p.remove();play()}; // don't wait on fullscreen: some browsers never settle it
  audio.onended=()=>{TR.endAt=performance.now()};
  let last=performance.now();
  (function loop(now){
    const dt=Math.min(.1,(now-last)/1000);last=now;
    if(TR.playing){const t=TR.t=TR.render?(now-TR.t0)/1000:TR.endAt?audio.duration+(now-TR.endAt)/1000:audio.currentTime;
      while(TR.i<CUES.length&&CUES[TR.i][0]<=t)try{CUES[TR.i++][1]()}catch(e){console.error('cue',CUES[TR.i-1][0],e)} // a bad cue mustn't stop the show
      while(TR.h<HITS.length&&HITS[TR.h]<=t){trFlash(.22);kick(8,.05);TR.h++}
      // camera: ease zoom toward target (+slow drift), decaying shake, rumble floor while it lasts
      CAM.zt*=1+CAM.drift*dt;zoom+=(CAM.zt-zoom)*(1-Math.exp(-dt*CAM.ease));
      CAM.amp=Math.max(CAM.amp*Math.exp(-dt*6),t<CAM.rumbleTo?CAM.rumble:0);
    }else CAM.amp=0;
    TR.flash*=Math.exp(-dt/.15);TR.black+=(TR.blackTo-TR.black)*(1-Math.exp(-dt/.1));
    $('trFlash').style.opacity=TR.flash<.01?0:TR.flash;$('trBlack').style.opacity=TR.black;
    window.CAMX=(Math.random()*2-1)*CAM.amp;window.CAMY=(Math.random()*2-1)*CAM.amp;
    requestAnimationFrame(loop)})(last);
}
if(land&&I.ready)trailerInit();
