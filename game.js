// game.js — MOWZKITOW: Halloween open-world chapter (2000s Japanese town).
// No IIFE: shares scope with audio.js / minigames.js.
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const minimap = document.getElementById('minimap');
const mctx = minimap.getContext('2d');
mctx.imageSmoothingEnabled = false;
const lightCv = document.createElement('canvas');
const lctx = lightCv.getContext('2d');

const TILE = 48;
window.__gameStarted = false; window.__gamePaused = true;

// ---------- STATE ----------
let paused = true, modalOpen = false, gameStarted = false;
let dead = false, won = false, inMap = null; // null = town, 'pub' | 'cafe'
let hunger = 100, meowllars = 8, standing = 0, questStage = 0; // 0: meet vet, 1: rematch, 2: gang grind, 3: boss open, 4: cleared
let typingWins = 0, fish = 0;
function locMusic(){ return inMap==='pub'?'pub':(inMap==='cafe'?'cafe':'field'); }
let nowSec = 0, cam = { x: 0, y: 0 };
let bossSpawned = false;
function syncAudioFlags(){ window.__gameStarted = gameStarted; window.__gamePaused = paused || modalOpen || dead || won; }

// ---------- MODAL / UI helpers (used by minigames.js) ----------
const modal = document.getElementById('challenge-modal');
const cTitle = document.getElementById('c-title'), cJp = document.getElementById('c-jp'), cBody = document.getElementById('c-body');
function openModal(title, jp){
  if (dlgOff) { try{dlgOff();}catch(_){} dlgOff = null; } // never leak a dialogue listener into a minigame
  cTitle.textContent = title; cJp.textContent = jp || '';
  cBody.innerHTML = '';
  modal.classList.remove('hidden');
  paused = true; modalOpen = true; syncAudioFlags();
  for (const k in keys) keys[k] = false;
  return cBody;
}
function closeModal(){
  modal.classList.add('hidden');
  paused = false; modalOpen = false; syncAudioFlags();
  for (const k in keys) keys[k] = false;
}
function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.style.display='block'; clearTimeout(t._h); t._h=setTimeout(()=>t.style.display='none',2600); }
function log(msg){ const el=document.getElementById('log'); if(!el) return; const d=document.createElement('div'); d.textContent='> '+msg; el.prepend(d); }
function fmtClock(s){ s=Math.floor(s); return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); }
function questBanner(text){
  const b=document.getElementById('quest-banner'); b.innerHTML=text; b.classList.remove('hidden');
  clearTimeout(b._h); b._h=setTimeout(()=>b.classList.add('hidden'),6000);
}
function questText(){
  if (questStage===0) return '🔎 Speak to the veteran kitty at NEKO PUB (west side)';
  if (questStage===1) return '🍶 Rematch! Talk to the veteran again.';
  if (questStage===2) return `🐾 Cat gang member! Reach 50 standing (${standing}) — pet strays, beat raccoons`;
  if (questStage===3) return `🐟 Gang grub run: bring 3 fish to the veteran (have ${fish}/3)`;
  if (questStage===4) return '⚔️ Evil nyanner awaits in the EAST back alley!';
  return '👑 Town saved. Nya forever.';
}
function refreshHUD(){
  document.getElementById('hud-meow').textContent = meowllars;
  document.getElementById('hud-stand').textContent = standing;
  document.getElementById('hud-fish').textContent = fish;
  const hb=document.getElementById('hud-hunger-fill');
  if(hb){ hb.style.width=Math.max(0,hunger)+'%'; hb.style.background=hunger>50?'#7bff9e':(hunger>25?'#ffd93d':'#ff5a5a'); }
  document.getElementById('hud-hunger-num').textContent = Math.ceil(Math.max(0,hunger));
  document.getElementById('hud-quest').textContent = questText();
}
function addStanding(n){ standing=Math.max(0,standing+n); refreshHUD(); checkBossUnlock(); }
function addMeow(n){ meowllars=Math.max(0,meowllars+n); refreshHUD(); }
function checkBossUnlock(){
  if(questStage===2 && standing>=50){
    questStage=3; sfx('quest'); refreshHUD();
    questBanner('📜 NEW QUEST: <b>bring 3 pond fish to the veteran!</b><br>The gang needs strength to face Nyanner. SE pond, big sign — you have <b>'+fish+'/3</b>! 南東の池!');
    log('Fish quest! Bring 3 fish to the veteran!');
  }
}
// dialogue box inside the modal; advances on SPACE / click. hunger stays paused.
let dlgOff = null;
function showDialogue(name, lines, cb){
  const body = openModal(name, 'はなし • dialogue');
  let i = 0, born = performance.now();
  const nm = document.createElement('div'); nm.className='dlg-name'; nm.textContent = name; body.appendChild(nm);
  const tx = document.createElement('div'); tx.className='dlg-text'; body.appendChild(tx);
  const hint = document.createElement('div'); hint.className='dlg-hint'; hint.textContent = '[SPACE / click] ▶'; body.appendChild(hint);
  if (dlgOff) { dlgOff(); dlgOff = null; }
  const adv = () => {
    if (performance.now() - born < 250) return;
    i++;
    if (i >= lines.length) { if (dlgOff){dlgOff();dlgOff=null;} closeModal(); if(cb)cb(); }
    else { tx.innerHTML = lines[i]; born = performance.now(); }
  };
  tx.innerHTML = lines[0];
  tx.onclick = adv;
  dlgOff = _onKey(e => { if(e.code==='Space'||e.key===' '){ e.preventDefault(); adv(); } });
}

// ---------- MAP: open-world 2000s Japanese town (fixed layout) ----------
// ground: 0 night-grass, 1 asphalt road, 2 sidewalk, 3 alley dirt, 4 plaza stone
const TW = 56, TH = 40;
let ground = [];
let buildings = [];   // {x,y,w,h (px), kind, ...} solid
let doors = [];       // {x,y,r, to:'pub'|'cafe'|'ramen', label}
let machines = [];    // {x,y} vending machines (interact)
let signs = [];       // {x,y,text,jp} district signposts (visual)
let poles = [];       // {x,y} power poles (solid, wired)
let lamps = [];       // {x,y} street lamps (solid, cast light)
function T(x,y){ return {x:x*TILE, y:y*TILE}; }
function buildTown(){
  ground = Array.from({length:TH},()=>Array(TW).fill(0));
  buildings=[]; doors=[]; machines=[]; signs=[]; poles=[]; lamps=[];
  const R=(x0,y0,x1,y1,v)=>{ for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++) if(x>=0&&y>=0&&x<TW&&y<TH) ground[y][x]=v; };
  R(0,16,TW-1,18,1); R(26,0,28,TH-1,1);           // main roads
  R(0,15,TW-1,15,2); R(0,19,TW-1,19,2); R(25,0,25,TH-1,2); R(29,0,29,TH-1,2); // sidewalks
  R(24,22,32,26,4);                                 // koban plaza
  R(2,30,10,36,3); R(44,26,53,27,3); R(50,28,51,37,3); // alleys (west + east/boss)
  R(14,8,22,9,3);                                   // back alley behind shops
  const B=(tx,ty,tw,th,kind,o)=>{ const b=Object.assign({x:tx*TILE,y:ty*TILE,w:tw*TILE,h:th*TILE,kind},o||{}); buildings.push(b); return b; };
  // west pub block + houses
  B(8,8,7,4,'pub',{name:'NEKO PUB',jp:'ネコ'});
  doors.push({x:11.5*TILE,y:12.6*TILE,r:40,to:'pub',label:'NEKO PUB'});
  B(2,8,4,3,'house',{roof:'#3a4a6b'});
  B(20,8,5,4,'netcafe',{name:'NET CAFE 24H',jp:'ネット'});
  doors.push({x:22.5*TILE,y:12.6*TILE,r:44,to:'cafe',label:'NET CAFE'});
  B(16,9,3,3,'house',{roof:'#6b3a3a'});
  B(2,22,4,3,'house',{roof:'#3a5a3a'});
  // central shop row (north of main road)
  B(32,8,5,4,'shop',{name:'CONBINI',jp:'コンビニ',awning:'#ff5a5a'});
  B(38,8,7,4,'ramen',{name:'INU RAMEN',jp:'イヌ'});
  doors.push({x:41.5*TILE,y:12.6*TILE,r:44,to:'ramen',label:'RAMEN'});
  B(46,8,4,3,'shop',{name:'KARAOKE',jp:'カラオケ',awning:'#35e0e6'});
  B(32,22,3,3,'koban',{name:'KOBAN',jp:'交番'});
  // east houses + pawn shop
  B(46,12,5,3,'shop',{name:'PAWS PAWN',jp:'質屋',awning:'#c9a7ff'});
  B(48,29,2,7,'house',{roof:'#2a2a3a'}); B(52,29,2,7,'house',{roof:'#3a2a2a'}); // boss alley walls
  B(34,30,4,3,'house',{roof:'#4a3a6b'});
  B(40,32,4,3,'house',{roof:'#6b4a2a'});
  B(8,26,4,3,'house',{roof:'#2a4a5a'});
  B(16,30,4,3,'house',{roof:'#5a2a3a'});
  // graffiti dead-end wall art at boss alley end (visual handled in draw)
  machines.push({x:15.5*TILE,y:14.4*TILE},{x:36.5*TILE,y:14.4*TILE},{x:29.5*TILE,y:21.4*TILE},{x:48.5*TILE,y:28.4*TILE});
  signs.push({x:24*TILE,y:14*TILE,text:'SAKURA ST.',jp:'さくら'},
             {x:30*TILE,y:20*TILE,text:'KOBAN PLAZA',jp:'交番'},
             {x:49*TILE,y:25*TILE,text:'URA ALLEY',jp:'裏通り'});
  for(let x=4;x<TW-2;x+=8) poles.push({x:x*TILE,y:15.2*TILE});
  for(let x=6;x<TW-2;x+=8) poles.push({x:x*TILE,y:19.2*TILE});
  for(let x=7;x<TW-1;x+=7) lamps.push({x:x*TILE,y:14.5*TILE});
  for(let x=10;x<TW-1;x+=9) lamps.push({x:x*TILE,y:19.6*TILE});
  lamps.push({x:24.5*TILE,y:22.5*TILE},{x:31.5*TILE,y:25.5*TILE}); // koban plaza lamps
}
// interiors: sleazy pub + neon net cafe
const interiors = {
  pub:  { w:22, h:14, solids:[] },
  cafe: { w:20, h:12, solids:[] },
};
function buildInteriors(){
  const P=(x,y,w,h)=>interiors.pub.solids.push({x:x*TILE,y:y*TILE,w:w*TILE,h:h*TILE});
  P(0,0,22,1); P(0,13,22,1); P(0,0,1,14); P(21,0,1,14); // walls
  P(2,0,18,2);                        // counter row
  P(4,6,3,2); P(10,6,3,2); P(15,6,3,2); // tables
  P(2,10,2,2); P(8,10,2,2); P(14,10,2,2); P(18,10,2,2); // stools, crates, jukebox
  P(0,4,1,2); P(21,9,1,2);              // barrels + dartboard nook
  const C=(x,y,w,h)=>interiors.cafe.solids.push({x:x*TILE,y:y*TILE,w:w*TILE,h:h*TILE});
  C(0,0,20,1); C(0,11,20,1); C(0,0,1,12); C(19,0,1,12); // walls
  C(14,0,6,1);                          // clerk counter
  C(3,4,14,1); C(3,7,14,1);             // PC desk rows
  C(1,9,2,1);                           // snack shelf
}

// ---------- ENTITIES ----------
const player = { x: 27*TILE, y: 21*TILE, r: 12, speed: 168, dir:'down', moving:false, anim:0, stepSnd:0, immuneUntil:0 };
const keys = {};
function isTypingTarget(el){ return el && (el.tagName==='TEXTAREA'||el.tagName==='INPUT'||el.isContentEditable); }
window.addEventListener('keydown', e => {
  if (isTypingTarget(e.target) || isTypingTarget(document.activeElement)) return;
  keys[e.key.toLowerCase()] = true;
  if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())) e.preventDefault();
});
window.addEventListener('keyup', e => { if (isTypingTarget(e.target)) return; keys[e.key.toLowerCase()] = false; });

const strayLines = [
  'Nya. Nya nya nya. ...That is all. That is the whole update.',
  'Meow! (Translation: the vending machine on Sakura St. is watching me.)',
  'Nyaaa... I pay zero rent and I have never been happier.',
  'Pspsps? No. I approach YOU. Rules are rules.',
  'Meow meow! I buried the mayor\'s sandal. No further questions.',
  'Nya. The raccoon gang owes me 3 fish. Tell them Nya sent you.',
  'Mrrp! I saw a ghost and I simply chose not to perceive it.',
  'Meow!! This alley is MY alley. ...Okay, our alley. You can stay.',
];
let strays = [], raccoons = [], cops = [], guards = [], patrons = [];
let veteran = null, dogs = [], boss = null, clerk = null, hollow = null;
function px(tx,ty){ return {x:tx*TILE+TILE/2, y:ty*TILE+TILE/2}; }
function spawnNPCs(){
  const S=(tx,ty)=>{ const p=px(tx,ty); return {x:p.x,y:p.y,dir:Math.floor(Math.random()*4),t:Math.random(),nextOk:0,ph:Math.random()*6}; };
  strays = [
    Object.assign(S(20,17),{color:'#ffffff',name:'Pudding'}),
    Object.assign(S(33,17),{color:'#ffbe5c',name:'Miso'}),
    Object.assign(S(6,31),{color:'#8d8d8d',name:'Gutter'}),
    Object.assign(S(48,26.5),{color:'#ffb3d9',name:'Hime'}),
    Object.assign(S(12,17),{color:'#3a3a3a',name:'Soot'}),
    Object.assign(S(27,24),{color:'#e8d8b8',name:'Biscuit'}),
    Object.assign(S(45,17),{color:'#7ab8ff',name:'Sardine'}),
    Object.assign(S(18,32),{color:'#c9a7ff',name:'Plum'}),
  ];
  raccoons = [
    Object.assign(S(5,33),{hiddenUntil:0}),
    Object.assign(S(8,31),{hiddenUntil:0}),
    Object.assign(S(17,8.5),{hiddenUntil:0}),
    Object.assign(S(47,26.5),{hiddenUntil:0}),
    Object.assign(S(36,17),{hiddenUntil:0}),
    Object.assign(S(24,17.5),{hiddenUntil:0}),
  ];
  cops = [
    Object.assign(S(10,17),{name:'Nolan',color:'#2a3a6b',mode:'patrol',wx:10,wy:17,speed:132}),
    Object.assign(S(46,17),{name:'Chen',color:'#2a3a6b',mode:'patrol',wx:46,wy:17,speed:132}),
    Object.assign(S(27,33),{name:'Bradford',color:'#232f57',mode:'patrol',wx:27,wy:33,speed:138}),
  ];
  dogs = [Object.assign(S(40,12.4),{color:'#c98f4e',name:'Pochi'}),Object.assign(S(43,12.4),{color:'#8a6a3e',name:'Hachi'})];
  veteran = Object.assign({x:11*TILE,y:3.4*TILE},{color:'#d8c8a8',name:'Veteran'});
  patrons = [
    Object.assign({x:5*TILE,y:8.8*TILE},{color:'#b8b8d8',name:'Darts Dave',line:'"180! ...Okay, 26. The darts are haunted. Definitely haunted."'}),
    Object.assign({x:11*TILE,y:8.8*TILE},{color:'#8a6a9a',name:'Sleepy Mimi',line:'"Zzz... one more milk... make it... double... zzz..."'}),
    Object.assign({x:16*TILE,y:8.8*TILE},{color:'#d89a5a',name:'Jukebox Jo',line:'"I paid 100 yen for ONE song and the machine ate it. This is my villain origin story."'}),
    Object.assign({x:6*TILE,y:1.2*TILE},{color:'#e8b8a0',name:'Bartender Tama',line:'"Welcome to NEKO PUB! Wipe your feet. ...On what? Dunno. The air. It\'s sticky."'}),
  ];
  clerk = Object.assign({x:17*TILE,y:0.5*TILE},{color:'#7ab8ff',name:'Clerk Kon'});
  hollow = Object.assign({x:4.5*TILE,y:36*TILE},{name:'Hollow'});
  guards = []; boss = null; bossSpawned = false;
}
function spawnBoss(){
  bossSpawned = true;
  const p = px(50.5,35);
  boss = {x:p.x,y:p.y,dir:0,t:0};
  guards = [0,1,2,3].map(i=>{ const q=px(49.4+i*0.75,33.6); return {x:q.x,y:q.y,dir:i,ph:i*1.7,color:'#15151f'}; });
  setMusicMode('field');
  sfx('quest');
  questBanner('⚔️ QUEST: <b>Evil nyanner challenges you to a fight.</b><br>Find the dead-end of the EAST back alley (URA ALLEY)! 東の裏通り!');
  log('Boss spawned in the east back alley! 東!');
  refreshHUD();
}

// ---------- COLLISION ----------
const PONDS=[{tx:24,ty:31,tw:6,th:4}]; // definitely-not-fishing pond (SE meadow)
const POND_SIGN={x:22.4*TILE,y:30.2*TILE};
function pondRectPx(p){ return {x:p.tx*TILE+8,y:p.ty*TILE+10,w:p.tw*TILE-16,h:p.th*TILE-16}; }
function solidsFor(){
  if (inMap) return interiors[inMap].solids;
  const s = [{x:-TILE,y:-TILE,w:(TW+2)*TILE,h:TILE},{x:-TILE,y:TH*TILE,w:(TW+2)*TILE,h:TILE},
             {x:-TILE,y:0,w:TILE,h:TH*TILE},{x:TW*TILE,y:0,w:TILE,h:TH*TILE}];
  for (const b of buildings) s.push(b);
  for (const p of poles) s.push({x:p.x-5,y:p.y-14,w:10,h:20});
  for (const m of machines) s.push({x:m.x-11,y:m.y-20,w:22,h:30});
  for (const l of lamps) s.push({x:l.x-4,y:l.y-40,w:8,h:44});
  for (const p of PONDS) s.push(pondRectPx(p)); // no swimming. rules are rules.
  return s;
}
function hitSolid(nx,ny){
  const r = player.r;
  for (const s of solidsFor()){
    const cx = Math.max(s.x,Math.min(nx,s.x+s.w)), cy = Math.max(s.y,Math.min(ny,s.y+s.h));
    if ((nx-cx)*(nx-cx)+(ny-cy)*(ny-cy) < r*r) return true;
  }
  return false;
}

// ---------- PIXEL SPRITES ----------
function hash2(x,y){ let h=(x*73856093 ^ y*19349663)>>>0; h=(h*1664525+1013904223)>>>0; return h/4294967295; }
function drawWitch(g, pxp, pyp, dir, anim, moving){
  const s=3;
  const bob = moving ? Math.floor(Math.sin(anim)*1) : 0;
  const hop = moving ? Math.abs(Math.sin(anim))*2 : Math.sin(Date.now()/500)*1.2;
  const ox=Math.floor(pxp-8*s), oy=Math.floor(pyp-8*s+bob+hop*0.4);
  const P=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(ox+x*s,oy+y*s,w*s,h*s);};
  g.fillStyle='rgba(0,0,0,.35)'; g.fillRect(pxp-14,pyp+20,28,6);
  P(3,6,10,8,'#1d1030'); P(2,8,2,6,'#1d1030'); P(12,8,2,6,'#1d1030'); P(4,8,1,6,'#9b5cff');
  const legOff = moving ? Math.floor(Math.sin(anim)*1.4) : 0;
  P(6,14,2,2,'#f3d6e2'); P(8,14,2,2,'#f3d6e2');
  P(6+legOff*0.4,15,2,1,'#2b1b4d'); P(8-legOff*0.4,15,2,1,'#2b1b4d');
  P(4,11,8,4,'#241433'); P(2,11,2,4,'#c1123b'); P(12,11,2,4,'#c1123b');
  P(5,12,2,2,'#7b2ff7'); P(9,12,1,1,'#ffd93d');
  P(3,11,1,3,'#f7c9d9'); P(12,11,1,3,'#f7c9d9');
  P(5,6,6,5,'#ffe3ec'); P(4,5,8,2,'#1d1030'); P(5,7,1,1,'#1d1030'); P(10,7,1,1,'#1d1030');
  if(dir==='up'){ P(5,8,2,1,'#2b1b4d'); P(9,8,2,1,'#2b1b4d'); }
  else { P(5,8,2,2,'#ff0f3b'); P(9,8,2,2,'#ff0f3b'); P(5,8,1,1,'#fff'); P(9,8,1,1,'#fff'); P(6,9,1,1,'#5c0000'); P(10,9,1,1,'#5c0000'); }
  if(dir!=='up'){ P(7,10,1,1,'#fff'); P(8,10,1,1,'#fff'); }
  P(4,9,1,1,'#ff9ed2'); P(11,9,1,1,'#ff9ed2');
  P(7,0,2,1,'#241433'); P(5,1,6,2,'#241433'); P(4,3,8,1,'#7b2ff7');
  P(7,3,2,1,'#ffd93d'); P(3,4,10,1,'#241433'); P(5,1,1,1,'#9b5cff');
  if(dir==='left'){ P(2,7,1,5,'#1d1030'); } if(dir==='right'){ P(13,7,1,5,'#1d1030'); }
  if(moving){ P(1,10,1,2,'#5a2d8f'); P(14,10,1,2,'#5a2d8f'); }
  // Mowzkitow's little lantern-light
  g.fillStyle='rgba(255,200,120,.9)'; g.fillRect(pxp+12,pyp-2,5,7);
  g.fillStyle='#5a3a1a'; g.fillRect(pxp+12,pyp-4,5,2);
}
function drawCat(g,x,y,color,big){
  const s=big?3:2, ox=Math.floor(x-8*s), oy=Math.floor(y-8*s+Math.sin(Date.now()/300+x)*1.5);
  const P=(a,b,w,h,c)=>{g.fillStyle=c;g.fillRect(ox+a*s,oy+b*s,w*s,h*s);};
  g.fillStyle='rgba(0,0,0,.3)'; g.fillRect(x-10,y+12,20,4);
  P(3,10,10,4,color); P(4,9,8,2,color);
  P(3,7,2,3,color); P(11,7,2,3,color);
  P(4,7,1,1,'#ff9ed2'); P(12,7,1,1,'#ff9ed2');
  P(5,10,2,2,'#1a0f2e'); P(9,10,2,2,'#1a0f2e');
  P(7,12,2,1,'#ff6fae');
  P(Math.floor(Date.now()/400)%2?13:2,11,2,1,color);
  P(5,14,2,1,'#1a0f2e'); P(9,14,2,1,'#1a0f2e');
}
function drawVeteran(g,x,y){
  drawCat(g,x,y,'#d8c8a8',true);
  const s=3, ox=Math.floor(x-8*s), oy=Math.floor(y-8*s);
  g.fillStyle='#5a1e1e'; g.fillRect(ox+5*s,oy+8*s,3*s,1*s); // scar
  g.fillStyle='#7a4a1e'; g.fillRect(ox+13*s,oy+10*s,2*s,4*s); // sake bottle
  g.fillStyle='#e8d8b8'; g.fillRect(ox+13*s,oy+9*s,2*s,1*s);
  // quest marker
  const b=Math.sin(Date.now()/300)*3;
  g.fillStyle='#ffd93d'; g.font='bold 20px monospace'; g.textAlign='center';
  g.fillText('!',x,y-52+b);
}
function drawRaccoon(g,x,y){
  const s=2, ox=Math.floor(x-8*s), oy=Math.floor(y-8*s+Math.sin(Date.now()/260+x)*1.5);
  const P=(a,b,w,h,c)=>{g.fillStyle=c;g.fillRect(ox+a*s,oy+b*s,w*s,h*s);};
  g.fillStyle='rgba(0,0,0,.3)'; g.fillRect(x-12,y+12,24,4);
  P(3,10,10,4,'#8a8a8a'); P(4,9,8,3,'#9a9a9a');
  P(3,7,2,2,'#6a6a6a'); P(11,7,2,2,'#6a6a6a');
  P(4,9,8,2,'#2b2b2b'); P(6,9,1,2,'#8a8a8a'); P(9,9,1,2,'#8a8a8a'); // mask
  P(5,10,1,1,'#fff'); P(10,10,1,1,'#fff');
  P(7,12,2,1,'#1a1a1a');
  for(let i=0;i<3;i++){ P(13+i,10+(i%2),1,2,i%2?'#3a3a3a':'#8a8a8a'); } // ringed tail
  P(5,14,2,1,'#2b2b2b'); P(9,14,2,1,'#2b2b2b');
}
function drawDog(g,x,y,color){
  const s=2, ox=Math.floor(x-8*s), oy=Math.floor(y-8*s);
  const P=(a,b,w,h,c)=>{g.fillStyle=c;g.fillRect(ox+a*s,oy+b*s,w*s,h*s);};
  g.fillStyle='rgba(0,0,0,.3)'; g.fillRect(x-10,y+12,20,4);
  P(3,10,10,4,color); P(4,8,8,4,'#e8c890');
  P(3,6,2,3,color); P(11,6,2,3,color); // floppy ears
  P(5,10,2,2,'#1a0f2e'); P(9,10,2,2,'#1a0f2e');
  P(7,12,2,2,'#1a0f2e');
  P(2,12,2,1,'#fff'); // headband tails (ramen chef!)
  P(4,6,8,1,'#fff');
  P(5,14,2,1,'#1a0f2e'); P(9,14,2,1,'#1a0f2e');
}
function drawCop(g,x,y,name){
  const s=2, ox=Math.floor(x-8*s), oy=Math.floor(y-8*s);
  const P=(a,b,w,h,c)=>{g.fillStyle=c;g.fillRect(ox+a*s,oy+b*s,w*s,h*s);};
  g.fillStyle='rgba(0,0,0,.3)'; g.fillRect(x-10,y+16,20,4);
  P(5,4,6,3,'#f0c8a0');                       // face
  P(4,2,8,2,'#1a2a5a'); P(6,1,4,1,'#1a2a5a'); // cap
  g.fillStyle='#ffd93d'; g.fillRect(ox+7*s,oy+2*s,2*s,1*s); // badge glint
  P(5,7,6,2,'#2a3a6b');                        // uniform
  P(4,9,8,4,'#22335c'); P(7,9,2,4,'#101a3a'); // torso + tie
  P(7,9,2,1,'#c9184a');
  P(5,13,2,3,'#141428'); P(9,13,2,3,'#141428'); // legs
  g.fillStyle='#0a0514'; g.font='bold 8px monospace'; g.textAlign='center';
  g.fillText(name.toUpperCase(),x,y+28);
}
function drawBossCat(g,x,y){
  const t=Date.now()/400;
  g.fillStyle=`rgba(255,15,60,${.12+.08*Math.sin(t)})`; g.fillRect(x-40,y-46,80,92);
  const s=3, ox=Math.floor(x-8*s), oy=Math.floor(y-8*s+Math.sin(t)*2);
  const P=(a,b,w,h,c)=>{g.fillStyle=c;g.fillRect(ox+a*s,oy+b*s,w*s,h*s);};
  g.fillStyle='rgba(0,0,0,.4)'; g.fillRect(x-14,y+22,28,6);
  P(3,9,10,5,'#15151f'); P(4,8,8,3,'#1d1d2a');
  P(2,5,3,4,'#15151f'); P(11,5,3,4,'#15151f'); // ears
  P(2,5,1,2,'#3a0a14'); P(13,5,1,2,'#3a0a14');
  const gl=.6+.4*Math.sin(t*2); // pulsing red judgment eyes
  g.fillStyle=`rgba(255,20,50,${gl})`;
  g.fillRect(ox+5*s,oy+9*s,2*s,2*s); g.fillRect(ox+9*s,oy+9*s,2*s,2*s);
  g.fillStyle='#ffd93d'; // tiny golden crown
  g.fillRect(ox+6*s,oy+1*s,4*s,2*s); g.fillRect(ox+6*s,oy+0,1*s,1*s); g.fillRect(ox+8*s,oy+0,1*s,1*s); g.fillRect(ox+10*s,oy+0,1*s,1*s);
  P(7,12,2,1,'#3a0a14');
}
// ---- buildings: 2000s Japanese town, night version ----
function drawBuilding(g,b){
  const {x,y,w,h}=b;
  g.fillStyle='rgba(0,0,0,.4)'; g.fillRect(x-4,y+h-2,w+8,8);
  if(b.kind==='house'){
    g.fillStyle='#3a3348'; g.fillRect(x,y+14,w,h-14);           // plaster wall
    g.fillStyle='#2c2538'; for(let i=0;i<w/12;i++) g.fillRect(x+6+i*12,y+22,4,h-30); // siding
    g.fillStyle=b.roof||'#3a4a6b';
    g.fillRect(x-6,y,w+12,18);                                    // tiled roof
    g.fillStyle='rgba(255,255,255,.08)'; g.fillRect(x-6,y,w+12,4);
    g.fillStyle='#14101f'; for(let i=0;i<w/10;i++) g.fillRect(x+i*10,y+8,3,10); // tiles
    g.fillStyle='#ffd98a'; g.fillRect(x+w/2-10,y+34,20,24);       // warm window
    g.fillStyle='#2b1b14'; g.fillRect(x+w/2-10,y+34,20,3); g.fillRect(x+w/2-2,y+34,4,24);
    g.fillStyle='#1a2030'; g.fillRect(x+w-34,y+36,18,18);          // dark window (someone asleep)
    g.fillStyle='#2b1b14'; g.fillRect(x+w-34,y+36,18,3);
    g.fillStyle='#6a6a75'; g.fillRect(x+10,y+44,16,12);            // AC outdoor unit
    g.fillStyle='#3a3a45'; g.fillRect(x+12,y+46,12,3); g.fillRect(x+12,y+51,12,2);
    g.fillStyle='#4a3320'; g.fillRect(x+12,y+h-34,22,34);         // door
    g.fillStyle='#ffd98a'; g.fillRect(x+14,y+h-30,6,6);           // door lamp
  } else if(b.kind==='shop'){
    g.fillStyle='#2e2a3e'; g.fillRect(x,y+20,w,h-20);
    g.fillStyle=b.awning||'#ff5a5a'; g.fillRect(x-4,y+20,w+8,12); // awning
    g.fillStyle='rgba(255,255,255,.25)'; for(let i=0;i<w/14;i++) g.fillRect(x+i*14,y+20,6,12);
    g.fillStyle='#14101f'; g.fillRect(x,y,w,22);                  // signboard
    g.fillStyle=b.awning||'#ff5a5a'; g.font='bold 13px monospace'; g.textAlign='center';
    g.fillText(b.name||'SHOP',x+w/2,y+15);
    g.fillStyle='#8a7a9a'; g.font='10px monospace'; g.fillText(b.jp||'',x+w/2,y+28);
    g.fillStyle='#bfe8ff'; g.fillRect(x+8,y+44,w-16,34);          // glass front
    g.fillStyle='#2b1b14'; g.fillRect(x+8,y+44,w-16,4);
    g.fillStyle='rgba(255,255,255,.35)'; g.fillRect(x+12,y+48,6,26);
    g.fillStyle='#ff5a5a'; g.fillRect(x+16,y+56,10,10); g.fillStyle='#ffd93d'; g.fillRect(x+30,y+56,10,10); g.fillStyle='#7bff9e'; g.fillRect(x+44,y+56,10,10); // display goods
    g.fillStyle='#4a2c14'; g.fillRect(x+w-34,y+h-40,24,40);        // door
    // hanging vertical sign — peak shotengai
    g.fillStyle='#0e0a14'; g.fillRect(x-16,y+8,14,52);
    g.fillStyle=b.awning||'#ff5a5a'; g.fillRect(x-15,y+9,12,50);
    g.fillStyle='#fff'; g.font='bold 10px monospace'; g.textAlign='center';
    const vn=(b.name||'S').slice(0,3).split('');
    vn.forEach((ch,i)=>g.fillText(ch,x-9,y+24+i*13));
  } else if(b.kind==='netcafe'){
    g.fillStyle='#1a1a2e'; g.fillRect(x,y+18,w,h-18);
    g.fillStyle='#14101f'; g.fillRect(x,y,w,26);
    g.fillStyle='#35e0e6'; g.font='bold 14px monospace'; g.textAlign='center';
    g.fillText('NET CAFE 24H',x+w/2,y+15);
    g.fillStyle='#c9a7ff'; g.font='11px monospace'; g.fillText('ネット • 24時間',x+w/2,y+30);
    // glowing monitor windows in a row
    for(let i=0;i<5;i++){
      const wx=x+14+i*((w-28)/5);
      const cols=['#35e0e6','#7bffef','#c9a7ff','#ffd93d','#ff9ed2'];
      g.fillStyle='#0e0a14'; g.fillRect(wx,y+40,(w-28)/5-6,30);
      g.fillStyle=cols[i%5]; g.fillRect(wx+2,y+42,(w-28)/5-10,20);
      g.fillStyle='rgba(255,255,255,.5)'; g.fillRect(wx+4,y+44,(w-28)/5-14,3);
    }
    g.fillStyle='#0e1420'; g.fillRect(x-16,y+8,14,52);            // vertical sign
    g.fillStyle='#35e0e6'; g.fillRect(x-15,y+9,12,50);
    g.fillStyle='#0e1420'; g.font='bold 10px monospace';
    ['ネ','ッ','ト'].forEach((ch,i)=>g.fillText(ch,x-9,y+24+i*13));
    g.fillStyle='#4a2c14'; g.fillRect(x+w/2-16,y+h-40,32,40);     // door
    g.fillStyle='#35e0e6'; g.fillRect(x+w/2-12,y+h-34,24,5);
  } else if(b.kind==='pub'){
    g.fillStyle='#241019'; g.fillRect(x,y+16,w,h-16);            // dark wood
    g.fillStyle='#3a1c26'; for(let i=0;i<w/16;i++) g.fillRect(x+i*16,y+20,4,h-24);
    g.fillStyle='#14101f'; g.fillRect(x,y,w,26);
    g.fillStyle='#ff5a5a'; g.font='bold 16px monospace'; g.textAlign='center';
    g.fillText('NEKO PUB',x+w/2,y+17);
    g.fillStyle='#ff9ed2'; g.font='11px monospace'; g.fillText('ネコ • 酒',x+w/2,y+31);
    // red paper lanterns flanking the door
    for(const lx of [x+w/2-52,x+w/2+52]){
      g.fillStyle=`rgba(255,80,60,${.25+.1*Math.sin(Date.now()/350+lx)})`; g.fillRect(lx-14,y+30,28,44);
      g.fillStyle='#ff3b30'; g.fillRect(lx-8,y+36,16,26);
      g.fillStyle='#2b1b14'; g.fillRect(lx-8,y+33,16,3); g.fillRect(lx-8,y+62,16,3);
      g.fillStyle='#ffe8a8'; g.font='bold 10px monospace'; g.fillText('酒',lx,y+52);
    }
    g.fillStyle='#4a2c14'; g.fillRect(x+w/2-16,y+h-46,32,46);     // door
    g.fillStyle='#ffd98a'; g.fillRect(x+w/2-12,y+h-40,24,6);
  } else if(b.kind==='ramen'){
    g.fillStyle='#2a2018'; g.fillRect(x,y+18,w,h-18);
    g.fillStyle='#14101f'; g.fillRect(x,y,w,24);
    g.fillStyle='#ffd93d'; g.font='bold 15px monospace'; g.textAlign='center';
    g.fillText('INU RAMEN',x+w/2,y+16);
    g.fillStyle='#7bffef'; g.font='11px monospace'; g.fillText('イヌ • ラーメン',x+w/2,y+30);
    // noren curtain + steaming counter window
    const cols=['#24365e','#c9184a','#e8e0d0'];
    for(let i=0;i<7;i++){ g.fillStyle=cols[i%3]; g.fillRect(x+20+i*((w-40)/7),y+36,(w-40)/7-3,26); }
    g.fillStyle='#0e0a14'; g.fillRect(x+24,y+66,w-48,34);
    g.fillStyle='#ffb35c'; g.fillRect(x+28,y+70,w-56,6);
    g.fillStyle='rgba(220,220,230,.5)';
    const st=Date.now()/500; for(let i=0;i<4;i++){ g.fillRect(x+40+i*40+Math.sin(st+i)*6,y+56+((st*10+i*7)%14),4,8); }
    g.fillStyle='#4a2c14'; g.fillRect(x+w/2-16,y+h-40,32,40);
  } else if(b.kind==='koban'){
    g.fillStyle='#2a3550'; g.fillRect(x,y+14,w,h-14);
    g.fillStyle='#e8e8f0'; g.fillRect(x,y,w,16);
    g.fillStyle='#c9184a'; g.font='bold 13px monospace'; g.textAlign='center'; g.fillText('交番 KOBAN',x+w/2,y+13);
    g.fillStyle='#bfe8ff'; g.fillRect(x+10,y+34,w-20,30);
    g.fillStyle='#c9184a'; g.fillRect(x+w/2-2,y+34,4,30);
    g.fillStyle='#141428'; g.fillRect(x+w/2-14,y+h-36,28,36);
  }
}
function drawVending(g,m){
  const {x,y}=m;
  g.fillStyle='rgba(0,0,0,.4)'; g.fillRect(x-13,y+8,26,5);
  const fl=.7+.3*Math.sin(Date.now()/300+x);
  g.fillStyle=`rgba(140,220,255,${.18*fl})`; g.fillRect(x-18,y-30,36,44);
  g.fillStyle='#1c4a6b'; g.fillRect(x-11,y-22,22,32);
  g.fillStyle='#bfe8ff'; g.fillRect(x-8,y-19,16,20);
  const cols=['#ff5a5a','#ffd93d','#7bff9e','#ff9ed2'];
  for(let r=0;r<3;r++) for(let c=0;c<2;c++){ g.fillStyle=cols[(r*2+c)%4]; g.fillRect(x-7+c*8,y-17+r*6,6,4); }
  g.fillStyle='#0e1420'; g.fillRect(x-11,y+10,22,4);
  g.fillStyle='#fff'; g.font='bold 7px monospace'; g.textAlign='center'; g.fillText('のみもの',x,y-25);
}
function drawLamp(g,x,y){
  g.fillStyle='rgba(0,0,0,.4)'; g.fillRect(x-6,y+2,12,4);
  g.fillStyle='#1c2230'; g.fillRect(x-3,y-40,6,44);               // pole
  g.fillStyle='#1c2230'; g.fillRect(x-3,y-44,16,4);               // arm
  const fl=.75+.25*Math.sin(Date.now()/400+x);
  g.fillStyle=`rgba(255,220,150,${.16*fl})`; g.fillRect(x-2,y-38,30,30);
  g.fillStyle='#2b1b14'; g.fillRect(x+5,y-40,12,10);              // head
  g.fillStyle=`rgba(255,230,170,${.6+.4*fl})`; g.fillRect(x+6,y-38,10,6);
}
function drawPond(g,x,y,w,h){
  const t=Date.now()/600;
  g.fillStyle='#0e2a3a'; g.fillRect(x-8,y-6,w+16,h+14);      // muddy shore
  g.fillStyle='#5a4a33'; g.fillRect(x-8,y-6,w+16,5);
  g.fillStyle='#123a52'; g.fillRect(x,y,w,h);                 // water
  g.fillStyle='#1c5a7a';
  for(let i=0;i<6;i++){ const wx=x+((i*67+t*22)%(w+40))-20; g.fillRect(wx,y+12+i*((h-20)/6),30,3); }
  g.fillStyle='#2d6a4f';                                      // lily pads
  g.fillRect(x+30,y+20,16,8); g.fillRect(x+w-60,y+h-30,20,10);
  g.fillStyle='#ff9ed2'; g.fillRect(x+35,y+18,5,5);
  g.fillStyle='#3e8e3a';                                      // reeds
  for(let i=0;i<4;i++){ g.fillRect(x-4+i*7,y-22,4,20); g.fillRect(x+w-2+i*7,y+h-4,4,20); }
  g.fillStyle=`rgba(160,220,255,${.12+.06*Math.sin(t)})`; g.fillRect(x,y,w,h); // moon shimmer
}
function drawPondSign(g,x,y){
  g.fillStyle='rgba(0,0,0,.35)'; g.fillRect(x-70,y+30,140,6);
  g.fillStyle='#5a3a1a'; g.fillRect(x-52,y-6,10,40); g.fillRect(x+42,y-6,10,40);
  g.fillStyle='#a67c4a'; g.fillRect(x-72,y-52,144,50);
  g.fillStyle='#5a3a1a'; g.fillRect(x-72,y-52,144,4); g.fillRect(x-72,y-6,144,4);
  g.fillStyle='#2b1408'; g.font='bold 13px monospace'; g.textAlign='center';
  g.fillText('DEFINITELY NOT A',x,y-34);
  g.fillText('FISHING MINIGAME!',x,y-18);
  g.fillStyle='#5a2a3a'; g.font='9px monospace'; g.fillText('(shhh. press SPACE at the shore.)',x,y-8);
}
function drawHollow(g,x,y){
  // starving skinny kitty + tragically empty bowl
  const bob=Math.sin(Date.now()/400)*1.5;
  g.fillStyle='rgba(0,0,0,.3)'; g.fillRect(x-12,y+14,26,4);
  g.fillStyle='#8a8a9a'; g.fillRect(x+16,y+8,20,8);           // bowl
  g.fillStyle='#5a5a6a'; g.fillRect(x+16,y+8,20,3);
  g.fillStyle='#ff9ed2'; g.font='bold 9px monospace'; g.textAlign='center'; g.fillText('EMPTY',x+26,y+2);
  const s=2, ox=Math.floor(x-8*s), oy=Math.floor(y-8*s+bob);
  const P=(a,b,w,h,c)=>{g.fillStyle=c;g.fillRect(ox+a*s,oy+b*s,w*s,h*s);};
  P(4,10,7,4,'#9a9aa8'); P(5,8,5,4,'#ababba');                // thin body + head
  P(4,6,2,3,'#9a9aa8'); P(8,6,2,3,'#9a9aa8');                 // ears
  P(6,9,1,2,'#0a0514'); P(8,9,1,2,'#0a0514');                 // HUGE begging eyes
  g.fillStyle='#fff'; g.fillRect(ox+6*s,oy+9*s,1*s,1*s);
  P(3,13,2,1,'#5a5a6a'); P(9,13,2,1,'#5a5a6a');               // ribs (he is FINE. allegedly.)
  P(4,11,1,3,'#7a7a8a');
  g.fillStyle='#ffd93d'; g.font='bold 9px monospace'; g.fillText('...food?...',x,y-18+bob);
}
function drawMailbox(g,x,y){
  g.fillStyle='rgba(0,0,0,.35)'; g.fillRect(x-9,y+8,18,4);
  g.fillStyle='#c9184a'; g.fillRect(x-8,y-12,16,20);
  g.fillStyle='#e63956'; g.fillRect(x-8,y-12,16,4);
  g.fillStyle='#fff'; g.fillRect(x-5,y-6,10,6);
  g.fillStyle='#c9184a'; g.font='bold 7px monospace'; g.textAlign='center'; g.fillText('〒',x,y);
}
function drawSign(g,s){
  g.fillStyle='#5a3a1a'; g.fillRect(s.x-2,s.y-22,4,26);
  g.fillStyle='#a67c4a'; g.fillRect(s.x-34,s.y-36,68,18);
  g.fillStyle='#2b1b14'; g.font='bold 9px monospace'; g.textAlign='center';
  g.fillText(s.text,s.x,s.y-29); g.fillStyle='#5a3a6b'; g.font='8px monospace'; g.fillText(s.jp,s.x,s.y-21);
}
function drawPumpkin(g,x,y,big){
  const s=big?1.4:1, fl=0.6+0.4*Math.abs(Math.sin(Date.now()/380+x*3+y));
  g.fillStyle='rgba(0,0,0,.35)'; g.fillRect(x-11*s,y+9*s,22*s,5);
  g.fillStyle=`rgba(255,150,40,${0.16*fl})`; g.fillRect(x-15*s,y-13*s,30*s,28*s);
  g.fillStyle='#c96a1e'; g.fillRect(x-10*s,y-8*s,20*s,17*s);
  g.fillStyle='#e8932e'; g.fillRect(x-7*s,y-6*s,6*s,13*s); g.fillRect(x+1*s,y-6*s,6*s,13*s);
  g.fillStyle='#4a2f14'; g.fillRect(x-2*s,y-13*s,4*s,6*s);
  g.fillStyle=`rgba(255,235,130,${0.55+0.45*fl})`;
  g.fillRect(x-7*s,y-4*s,5*s,5*s); g.fillRect(x+2*s,y-4*s,5*s,5*s);
  g.fillRect(x-7*s,y+3*s,14*s,3*s); g.fillRect(x-4*s,y+6*s,8*s,2*s);
}
function drawGround(g,sx,sy,vx,vy,v){
  let base = v===1?'#23232e':(v===2?'#33333f':(v===3?'#2e2419':'#1d2b1d'));
  if(v===0){ const r2=hash2(vx*3+11,vy*5+7); base = r2>0.72?'#1a2b1c':(r2<0.18?'#223622':'#1d2b1d'); }
  g.fillStyle=base; g.fillRect(sx,sy,TILE,TILE);
  let h=(vx*73856093 ^ vy*19349663)>>>0;
  const rnd=()=>{h=(h*1664525+1013904223)>>>0;return h/4294967295;};
  for(let i=0;i<5;i++){ const px2=sx+Math.floor(rnd()*11)*4, py2=sy+Math.floor(rnd()*11)*4;
    g.fillStyle=rnd()>0.5?'rgba(0,0,0,.25)':'rgba(255,255,255,.05)'; g.fillRect(px2,py2,4,4); }
  if(v===1&&(vx%2===0)&&!(vx>=26&&vx<=28&&vy>=16&&vy<=18)){ g.fillStyle='#8a7a2a'; g.fillRect(sx+TILE/2-6,sy+TILE/2-2,12,4); } // lane dashes
  if(v===1&&vx>=26&&vx<=28&&vy>=16&&vy<=18){ // zebra crossing at the scramble
    g.fillStyle='#c9c9d4';
    for(let i=0;i<4;i++) g.fillRect(sx+4+i*11,sy+6,6,36);
    g.fillStyle='rgba(0,0,0,.25)'; for(let i=0;i<4;i++) g.fillRect(sx+4+i*11,sy+6,6,4);
  }
  if(v===1&&(vy===16||vy===18)){ g.fillStyle='rgba(0,0,0,.4)'; g.fillRect(sx,sy+(vy===16?TILE-4:0),TILE,4); } // gutters
  if(v===1&&hash2(vx*3,vy*7)>0.9){ // manhole
    g.fillStyle='#17171f'; g.fillRect(sx+12,sy+12,24,24);
    g.fillStyle='#2c2c38'; g.fillRect(sx+14,sy+14,20,20);
    g.fillStyle='#17171f'; g.fillRect(sx+22,sy+14,4,20); g.fillRect(sx+14,sy+22,20,4);
  }
  if(v===2&&(vy===15||vy===19)){ // tactile paving strips — tidy cozy sidewalks
    g.fillStyle='#5a5228'; g.fillRect(sx,sy+TILE/2-5,TILE,10);
    g.fillStyle='#8a7c33'; for(let i=0;i<6;i++){ g.fillRect(sx+2+i*8,sy+TILE/2-3,4,6); }
  }
  if(v===2&&hash2(vx+9,vy+3)>0.94){ // planter box with night bush
    g.fillStyle='#5a3a1a'; g.fillRect(sx+8,sy+24,32,12);
    g.fillStyle='#1e4028'; g.fillRect(sx+10,sy+12,28,16);
    g.fillStyle='#2d6a4f'; g.fillRect(sx+12,sy+14,8,6); g.fillRect(sx+26,sy+16,8,6);
  }
  if(v===4){ g.fillStyle='rgba(255,255,255,.06)'; g.fillRect(sx,sy,TILE,3); g.fillRect(sx,sy,3,TILE); } // plaza grout
  if(v===3&&rnd()>0.6){ g.fillStyle='#4a3b28'; g.fillRect(sx+8+rnd()*24,sy+8+rnd()*24,8,5); } // alley junk
  if(v===0&&hash2(vx*5+1,vy*5+3)>0.94){ // jack-o'-lantern in the grass
    const px0=sx+26, py0=sy+24, fl=0.6+0.4*Math.abs(Math.sin(Date.now()/400+vx*2+vy));
    g.fillStyle=`rgba(255,150,40,${0.14*fl})`; g.fillRect(px0-6,py0-6,28,24);
    g.fillStyle='#c96a1e'; g.fillRect(px0,py0,16,13);
    g.fillStyle=`rgba(255,230,120,${0.5+0.5*fl})`;
    g.fillRect(px0+3,py0+4,4,4); g.fillRect(px0+10,py0+4,4,4); g.fillRect(px0+3,py0+10,11,2);
  }
  if(hash2(vx+40,vy+77)>0.90){ g.fillStyle='rgba(120,70,180,.20)'; g.fillRect(sx+2,sy+26,44,14); } // mist
}
function drawPubInterior(g,sx,sy,vx,vy){
  g.fillStyle=((vx+vy)%2===0)?'#3a2818':'#342416'; g.fillRect(sx,sy,TILE,TILE);
  if(hash2(vx,vy)>0.9){ g.fillStyle='rgba(0,0,0,.3)'; g.fillRect(sx+6,sy+6,8,5); } // stains. sleazy.
}
function drawCafeFloor(g,sx,sy,vx,vy){
  g.fillStyle=((vx+vy)%2===0)?'#141428':'#101020'; g.fillRect(sx,sy,TILE,TILE);
  g.fillStyle='rgba(53,224,230,.07)'; g.fillRect(sx,sy,TILE,4);
  if(hash2(vx*2,vy*3)>0.92){ g.fillStyle='rgba(0,0,0,.35)'; g.fillRect(sx+10,sy+30,14,6); } // cable spaghetti
}

// ---------- UPDATE ----------
let spaceEdge = false, spaceWas = false;
function nearest(list, maxD){
  let best=null, bd=maxD;
  for(const e of list){ const d=Math.hypot(player.x-e.x,player.y-e.y); if(d<bd){bd=d;best=e;} }
  return best;
}
function wander(e, dt, speed, bounds){
  e.t+=dt;
  if(e.t>1.4+Math.random()*0.3){ e.t=0; e.dir=Math.floor(Math.random()*4); }
  const sp=(speed||40)*dt;
  let nx=e.x, ny=e.y;
  if(e.dir===0)ny-=sp; if(e.dir===1)ny+=sp; if(e.dir===2)nx-=sp; if(e.dir===3)nx+=sp;
  const ok=bounds?bounds(nx,ny):!hitSolidNPC(nx,ny);
  if(ok){ e.x=nx; e.y=ny; } else e.dir=Math.floor(Math.random()*4);
}
function hitSolidNPC(nx,ny){
  const r=10;
  for(const s of solidsFor()){
    const cx=Math.max(s.x,Math.min(nx,s.x+s.w)), cy=Math.max(s.y,Math.min(ny,s.y+s.h));
    if((nx-cx)*(nx-cx)+(ny-cy)*(ny-cy)<r*r) return true;
  }
  return false;
}
function update(dt){
  if(!gameStarted||paused||modalOpen||dead||won) return;
  nowSec+=dt;
  // movement
  let dx=0,dy=0;
  if(keys['w']||keys['arrowup'])dy-=1; if(keys['s']||keys['arrowdown'])dy+=1;
  if(keys['a']||keys['arrowleft'])dx-=1; if(keys['d']||keys['arrowright'])dx+=1;
  if(dx&&dy){dx*=.7071;dy*=.7071;}
  player.moving=!!(dx||dy);
  if(dx<0)player.dir='left'; else if(dx>0)player.dir='right'; else if(dy<0)player.dir='up'; else if(dy>0)player.dir='down';
  if(player.moving){ player.anim+=dt*9; player.stepSnd+=dt; if(player.stepSnd>.28){player.stepSnd=0;sfx('step');} } else player.anim=0;
  const nx=player.x+dx*player.speed*dt;
  if(!hitSolid(nx,player.y))player.x=nx;
  const ny=player.y+dy*player.speed*dt;
  if(!hitSolid(player.x,ny))player.y=ny;
  // space edge
  const sp=!!keys[' '];
  spaceEdge=sp&&!spaceWas; spaceWas=sp;
  if(spaceEdge) tryInteract();
  // hunger (paused automatically while modal/paused)
  hunger-=dt*(100/480);
  if(hunger<=0){ hunger=0; die(); return; }
  // camera
  const MW=inMap?interiors[inMap].w:TW, MH=inMap?interiors[inMap].h:TH;
  const W=MW*TILE, H=MH*TILE;
  cam.x=Math.max(0,Math.min(W-canvas.width,player.x-canvas.width/2));
  cam.y=Math.max(0,Math.min(H-canvas.height,player.y-canvas.height/2));
  // NPCs
  for(const c of strays) wander(c,dt,36);
  for(const r of raccoons){ if(nowSec*1000<r.hiddenUntil)continue; wander(r,dt,30); }
  for(const g of guards){ g.ph+=dt; const a=g.ph; g.x+=Math.cos(a)*8*dt; g.y+=Math.sin(a)*8*dt; }
  updateCops(dt);
  drawMinimapThrottled();
  refreshHUD();
}
const copLectures = {
  Nolan:['Officer Nolan here — yes, THE forty-something rookie. Even I know better than to tangle with the raccoon gang after dark.','Look, the kitty gang runs these alleys and the raccoons run the trash. You? You run along home. That\'s an order... ish. Nolan out.'],
  Chen:['Officer Chen. Undercover rule one: blend in. You, glowing witch, do NOT blend in.','The raccoons have a whole trash economy and the cats tax it. Fascinating. Still illegal-ish. Move along, citizen.'],
  Bradford:['Officer Bradford. Boot, listen up: strays are fine. Raccoons are a menace. The black-cat crew in the east alley? Do NOT engage.','Tough love time: I just saved you a trip to the Watch Commander. Grey already has paperwork with your name on it. Beat it.'],
};
function updateCops(dt){
  for(const c of cops){
    const d=Math.hypot(player.x-c.x,player.y-c.y);
    const immune=nowSec*1000<player.immuneUntil;
    if(!inMap && !immune && d<190){ // chase! (a beat slower than you — run!)
      c.mode='chase';
      const a=Math.atan2(player.y-c.y,player.x-c.x);
      const nx=c.x+Math.cos(a)*(c.speed||135)*dt, ny=c.y+Math.sin(a)*(c.speed||135)*dt;
      if(!hitSolidNPC(nx,ny)){ c.x=nx; c.y=ny; }
      if(d<28){ caughtByCop(c); return; }
    } else {
      c.mode='patrol';
      c.t+=dt;
      if(c.t>2){ c.t=0; c.dir=Math.floor(Math.random()*4); }
      // drift toward waypoint, wander otherwise
      const wx=c.wx*TILE, wy=c.wy*TILE;
      const dd=Math.hypot(wx-c.x,wy-c.y);
      let nx=c.x, ny=c.y;
      if(dd>60){ const a=Math.atan2(wy-c.y,wx-c.x); nx+=Math.cos(a)*55*dt; ny+=Math.sin(a)*55*dt; }
      else { const sp2=55*dt; if(c.dir===0)ny-=sp2; if(c.dir===1)ny+=sp2; if(c.dir===2)nx-=sp2; if(c.dir===3)nx+=sp2; }
      if(!hitSolidNPC(nx,ny)){ c.x=nx; c.y=ny; }
    }
  }
}
function caughtByCop(c){
  for(const k in keys)keys[k]=false;
  sfx('siren');
  const L=copLectures[c.name]||copLectures.Nolan;
  showDialogue('Officer '+c.name+' 🚔',[L[0],L[1],'<i>(He escorts you a few steps down the street and tells Grey over the radio it\'s handled.)</i>'],()=>{
    const a=Math.atan2(player.y-c.y,player.x-c.x)||0;
    player.x+=Math.cos(a)*110; player.y+=Math.sin(a)*110;
    player.immuneUntil=nowSec*1000+6000;
  });
}

// ---------- INTERACTION ----------
const EXIT_MATS={pub:{x:11,y:13},cafe:{x:10,y:11}};
function tryInteract(){
  // doors first
  for(const d of (inMap?[]:doors)){
    if(Math.hypot(player.x-d.x,player.y-d.y)<d.r){
      if(d.to==='pub'){ enterMap('pub',11,12,'up','🍶 NEKO PUB — sleazy, sticky, perfect. Veteran waits at the back.','Entered the pub!'); return; }
      if(d.to==='cafe'){ enterMap('cafe',10,9.6,'up','💻 NET CAFE 24H — ozone, melon soda, glowing screens.','Entered the net cafe!'); return; }
      if(d.to==='ramen'){ ramenMenu(); return; }
    }
  }
  if(inMap){
    const m=EXIT_MATS[inMap];
    if(Math.hypot(player.x-m.x*TILE,player.y-m.y*TILE)<44){ exitMap(); return; }
    if(inMap==='pub'){
      if(Math.hypot(player.x-veteran.x,player.y-veteran.y)<64){ talkVeteran(); return; }
      const pt=nearest(patrons,56); if(pt){ talkPatron(pt); return; }
    } else {
      if(clerk&&Math.hypot(player.x-clerk.x,player.y-clerk.y)<58){ talkClerk(); return; }
      if(Math.hypot(player.x-10*TILE,player.y-5.4*TILE)<54){ computerMenu(); return; }
    }
    return;
  }
  const cat=nearest(strays.filter(c=>true),46);
  if(cat){ petCat(cat); return; }
  const rc=nearest(raccoons.filter(r=>nowSec*1000>=r.hiddenUntil),46);
  if(rc){ fightRaccoon(rc); return; }
  if(boss && Math.hypot(player.x-boss.x,player.y-boss.y)<60){ talkBoss(); return; }
  for(const gd of guards){ if(Math.hypot(player.x-gd.x,player.y-gd.y)<40){ showDialogue('Black cat',['...Hssss.','(It says nothing else. It doesn\'t have to.)']); return; } }
  for(const dg of dogs){ if(Math.hypot(player.x-dg.x,player.y-dg.y)<52){ ramenMenu(); return; } }
  for(const m of machines){ if(Math.hypot(player.x-m.x,player.y-m.y)<44){ vendMenu(m); return; } }
  for(const p of PONDS){
    const r=pondRectPx(p);
    const cx=Math.max(r.x,Math.min(player.x,r.x+r.w)), cy=Math.max(r.y,Math.min(player.y,r.y+r.h));
    if(Math.hypot(player.x-cx,player.y-cy)<70){ goFishing(); return; }
  }
  if(hollow&&Math.hypot(player.x-hollow.x,player.y-hollow.y)<54){ meetHollow(); return; }
}
function petCat(cat){
  const again = nowSec < cat.nextOk;
  const line = strayLines[Math.floor(Math.random()*strayLines.length)];
  sfx('meow');
  if(!again && questStage>=2){
    cat.nextOk = nowSec + 120;
    addStanding(2);
    showDialogue(cat.name||'Stray',['"'+line+'"',`<i>(+2 cat-gang standing! Come back in 2 minutes for more. Now: ${standing})</i>`]);
  } else if(!again){
    cat.nextOk = nowSec + 120;
    showDialogue(cat.name||'Stray',['"'+line+'"',`<i>(The cat gang isn't watching yet — join them first and pets like this earn standing!)</i>`]);
  } else {
    const s=Math.ceil(cat.nextOk-nowSec);
    showDialogue(cat.name||'Stray',['"'+line+'"',`<i>(This one needs a nap. Standing again in ${s}s.)</i>`]);
  }
}
// ----- veteran + drinking quest -----
function talkVeteran(){
  if(questStage===0){
    showDialogue('Veteran Kitty 🍶',[
      '"...Well well. The forest witch. Heard you collected all ten braincells. Big deal."',
      '"Name\'s Veteran. I run with the CAT GANG. Meanest litter in town. And you, short stuff... you got potential."',
      '"Here\'s the offer: join the gang. BUT. First you gotta beat ME. At drinking. Milk. A whole bowl."',
      '"Chug faster than this old tom and you\'re family. Lose... and you come back when your paws stop shaking. DEAL?"',
    ],()=>{ drinkOffer(); });
  } else if(questStage===1){
    showDialogue('Veteran Kitty 🍶',['"Back for another bowl, huh? Liquid courage. I respect it. SIT."'],()=>{ drinkOffer(); });
  } else if(questStage===3){
    if(fish>=3){
      showDialogue('Veteran Kitty 🍶',[
        '"Sniff sniff... is that FRESH pond fish?! THREE of them?! You beautiful menace!"',
        '"Hand \'em over and the gang feasts tonight. Strength of ten alleys! You in?"',
      ],()=>{ fishTurnIn(); });
    } else {
      showDialogue('Veteran Kitty 🍶',[
        `"The gang runs on fish, kid. We need THREE pond swimmers to get strong enough for Nyanner. You got ${fish}/3."`,
        '"SE pond. Big sign. Can\'t miss it. The sign says it\'s NOT a fishing minigame — that\'s how you know it IS."',
      ]);
    }
  } else {
    const lines=['"My newest soldier! The gang loves you already."'];
    if(questStage>=4) lines.push('"Heard Nyanner himself wants a piece of you. East alley. Don\'t die, kid. I\'m too old to cry."');
    else lines.push(`"Get that standing up, kid. Pet strays, slap raccoons. Come back famous. (${standing}/50)"`);
    showDialogue('Veteran Kitty 🍶',lines);
  }
}
function fishTurnIn(){
  const body=openModal('FEED THE GANG','さかな • ぐん!');
  const p=document.createElement('p');
  p.innerHTML=`Veteran eyes your <b>3 fish</b> like treasure. The whole pub leans in. Someone whispers <i>"the feast... the fabled feast..."</i><br>Hand over the fish? 🐟🐟🐟`;
  body.appendChild(p);
  const go=_btn(`HAND OVER 3 FISH 🐟 (have ${fish})`); go.style.width='100%'; go.style.marginTop='6px';
  const no=_btn('Hold on','pink'); no.style.width='100%'; no.style.marginTop='6px';
  go.onclick=()=>{
    if(fish<3){ sfx('hit'); toast('Not enough fish! The gang can smell the shortfall.'); return; }
    fish-=3; questStage=4; refreshHUD(); spawnBoss(); refreshHUD();
    showDialogue('Veteran Kitty 🍶',[
      '"THE GANG FEASTS TONIGHT!! Ohhh, we\'re strong now. Feel that? That\'s fish power."',
      '"Which means... it\'s time. NYANNER sent word. He waits in the east back alley. End him, kid. For the gang."',
    ]);
    log('Fish delivered! Boss invitation received!');
  };
  no.onclick=closeModal;
  body.appendChild(go); body.appendChild(no);
}
function drinkOffer(){
  const body=openModal('JOIN THE CAT GANG?','なかま • さけ!');
  const p=document.createElement('p');
  p.innerHTML='Veteran slides a giant bowl of milk across the counter. The whole pub goes quiet. A one-eyed cat faints.<br><b>Accept his drinking challenge?</b> 🥛';
  body.appendChild(p);
  const row=document.createElement('div'); row.style.display='flex'; row.style.gap='8px';
  const yes=_btn('CHUG! 🥛'); yes.style.flex='1';
  const no=_btn('Not yet','pink'); no.style.flex='1';
  row.appendChild(yes); row.appendChild(no); body.appendChild(row);
  yes.onclick=()=>{ drinkGame(win=>{
    if(win){
      questStage=2; sfx('quest'); refreshHUD(); checkBossUnlock(); // in case 50 standing was ground out early
      showDialogue('Veteran Kitty 🍶',['" ... ... ... GAAAH! FINE! You win! You chug like a raccoon in a dumpster!"','"Welcome to the CAT GANG, kid! Pet strays (+2), beat raccoons (+5, +5Ⓜ). Get to 30 standing and make us legends!"']);
      log('Joined the CAT GANG! 猫組!');
    } else {
      questStage=1; refreshHUD();
      showDialogue('Veteran Kitty 🍶',['"HA! Milk ran down your chin! Classic rookie spill!"','"Go practice on a juice box. Then come back and talk to me for a rematch."']);
    }
  },{rival:'Veteran Kitty'}); };
  no.onclick=()=>{ closeModal(); };
}
// ----- ramen + vending -----
function ramenMenu(){
  const body=openModal('INU RAMEN 🍜','ラーメン • いぬ!');
  body.appendChild(Object.assign(document.createElement('p'),{innerHTML:'<b>Pochi:</b> "WAN! Welcome to INU RAMEN! Dogs cook it, witches eat it! Rules are rules!"<br><b>Hachi:</b> "Wan wan! (He says the pork broth took 14 hours.)"'}));
  const row=document.createElement('div');
  const buy=_btn(`🍜 RAMEN — 5Ⓜ (hunger → 100%, now ${Math.floor(hunger)}%)`);
  buy.style.width='100%'; buy.style.marginTop='6px';
  buy.onclick=()=>{
    if(meowllars<5){ sfx('hit'); toast('Not enough Meowllars! Raccoons carry cash... 🦝'); return; }
    addMeow(-5); hunger=100; sfx('slurp'); refreshHUD(); closeModal();
    toast('🍜 Slurped! Hunger 100%! Dogs bark approvingly! WAN!');
    log('Ate ramen. Hunger full!');
  };
  const lv=_btn('Leave','pink'); lv.style.width='100%'; lv.style.marginTop='6px'; lv.onclick=closeModal;
  row.appendChild(buy); row.appendChild(lv); body.appendChild(row);
}
function vendMenu(){
  const body=openModal('VENDING MACHINE','じはんき • かう!');
  const p=document.createElement('p');
  p.innerHTML='The machine hums a lonely 2AM song. Something glows inside...';
  body.appendChild(p);
  const mk=(label,can,fn)=>{
    const b=_btn(label); b.style.width='100%'; b.style.marginTop='6px'; b.disabled=!can;
    b.onclick=fn; body.appendChild(b);
  };
  mk(`🥤 MILK SODA — 2Ⓜ (+40% hunger)${meowllars<2?' [broke]':''}`,meowllars>=2,()=>{
    addMeow(-2); hunger=Math.min(100,hunger+40); sfx('gulp'); refreshHUD(); closeModal(); toast('🥤 Fizzy milk?! +40% hunger. Somehow good.'); });
  mk(`🍙 ONIGIRI — 3Ⓜ (+50% hunger)${meowllars<3?' [broke]':''}`,meowllars>=3,()=>{
    addMeow(-3); hunger=Math.min(100,hunger+50); sfx('gulp'); refreshHUD(); closeModal(); toast('🍙 Tuna-mayo triangle acquired! +50% hunger.'); });
  const lv=_btn('Walk away','pink'); lv.style.width='100%'; lv.style.marginTop='6px'; lv.onclick=closeModal; body.appendChild(lv);
}
function goFishing(){
  fishingGame(win=>{
    closeModal();
    if(win){
      fish++; refreshHUD(); sfx('coin');
      toast(`🐟 Caught one! Totally normal pond fish. (Fish: ${fish})`);
      log(`Caught a fish! Total: ${fish}`);
    } else {
      toast('The pond keeps its secrets. This time.');
    }
  });
}
function meetHollow(){
  if(fish<=0){
    sfx('hit');
    showDialogue('Hollow 🍽',[
      '"...is that... no fish? NO FISH?!"',
      '"Look at this bowl. EMPTY. I have counted every speck of dust in it. Twice."',
      '"Come back with a fish from the pond — you know, the one that is DEFINITELY not a fishing minigame — or don\'t come back. Shoo!"',
    ]);
    return;
  }
  const body=openModal('HOLLOW IS STARVING','はらぺこ • えさ!');
  const p=document.createElement('p');
  p.innerHTML=`Hollow stares at your <b>${fish} fish</b> the way poets stare at the moon.<br>Offer <b>1 fish</b> for a feeding game? Land it in the mouth (<b>3 throws, need 1</b>) for <b>+10 cat-gang standing</b>! 🐟`;
  body.appendChild(p);
  const go=_btn(`THROW A FISH 🐟 (have ${fish})`); go.style.width='100%'; go.style.marginTop='6px';
  const no=_btn('Not yet','pink'); no.style.width='100%'; no.style.marginTop='6px';
  go.onclick=()=>{
    fish--; refreshHUD();
    feedingGame(win=>{
      if(win){
        addStanding(10); refreshHUD(); sfx('quest');
        showDialogue('Hollow 🍽',['"...!! ...crunch crunch crunch..."','"Okay. OKAY. That was... adequate. The gang will hear of this generosity."',`<i>(+10 standing! Hollow licks the bowl for 40 minutes. Now: ${standing})</i>`]);
        log('Fed Hollow! +10 standing!');
      } else {
        showDialogue('Hollow 🍽',['"The fish is on the GROUND. It lives there now."','"No standing. The bowl remains a metaphor. Bring another fish and redeem yourself."']);
      }
    });
  };
  no.onclick=closeModal;
  body.appendChild(go); body.appendChild(no);
}
// ----- raccoons -----
function fightRaccoon(rc){
  const body=openModal('RACCOON AMBUSH!','あらいぐま • たたかい!');
  body.appendChild(Object.assign(document.createElement('p'),{innerHTML:'A trash-panda burst from the shadows, pockets full of YOUR snacks!<br>"Heh heh heh... let\'s DANCE, witch." 🦝'}));
  const go=_btn('THROW DOWN 👊'); go.style.width='100%'; go.style.marginTop='8px';
  const run=_btn('Back away slowly','pink'); run.style.width='100%'; run.style.marginTop='6px';
  go.onclick=()=>{
    raccoonFight(win=>{
      if(win){
        rc.hiddenUntil=nowSec*1000+120000;
        if(questStage>=2){
          addStanding(5); addMeow(5); sfx('coin'); refreshHUD();
          showDialogue('Raccoon',['"Okay okay!! Take your snacks back! And... uh... here, gang respects strength. Tell no one."',`<i>(+5 standing, +5Ⓜ Meowllars! It respawns in 2 minutes. Now: ${standing} standing, ${meowllars}Ⓜ)</i>`]);
          log('Beat a raccoon! +5 standing +5M!');
        } else {
          sfx('lose'); refreshHUD();
          showDialogue('Raccoon',['"Not bad, kid! Real scrappy!"','"BUT. Payouts are for GANG MEMBERS ONLY. Join the cat gang at NEKO PUB first — then every raccoon you beat pays +5 standing and +5Ⓜ. Scram!"']);
          log('Beat a raccoon, but no payout — not gang yet!');
        }
      } else {
        sfx('lose');
        showDialogue('Raccoon',['"HA! Better luck next trash day, witch!"','<i>(It scampers off with your dignity. It\'ll be back in the same spot... it always comes back.)</i>']);
      }
    });
  };
  run.onclick=closeModal;
  body.appendChild(go); body.appendChild(run);
}
// ----- boss -----
function talkBoss(){
  const body=openModal('EVIL NYANNER','ボス • さばき!');
  const img=document.createElement('img');
  img.src='judge-cat.png'; img.alt='Evil Nyanner';
  img.style.cssText='width:220px;display:block;margin:0 auto;border:4px solid #0a0514;box-shadow:6px 6px 0 #000;background:#fff';
  img.onerror=()=>{ img.style.display='none'; const f=document.createElement('div'); f.style.fontSize='90px'; f.style.textAlign='center'; f.textContent='🐈'; body.prepend(f); };
  body.appendChild(img);
  const p=document.createElement('p');
  p.innerHTML='<b>Evil Nyanner:</b> "So. The braincell collector crawls into MY alley. With MY runaway fan club."<br>"Three trials. Pong. Paws. REQUIEM. Win them all... or feed my legend."';
  body.appendChild(p);
  const go=_btn('FIGHT THE OVERLORD ⚔️'); go.style.width='100%'; go.style.marginTop='8px';
  const no=_btn('Not yet...','pink'); no.style.width='100%'; no.style.marginTop='6px';
  go.onclick=()=>{
    bossChain(win=>{
      if(win){ winGame(); }
      else {
        hunger=hunger*0.3;
        const stolen=Math.ceil(meowllars/2); addMeow(-stolen);
        sfx('lose'); refreshHUD();
        if(hunger<=0){ hunger=0; die(); return; }
        showDialogue('Evil Nyanner',['"Pathetic. I\'ll take 70% of your lunch and HALF your coins for my trouble."',`<i>(-${stolen}Ⓜ, hunger devastated. Talk to him to retry!)</i>`]);
      }
    });
  };
  no.onclick=closeModal;
  body.appendChild(go); body.appendChild(no);
}
let returnPos=null;
function enterMap(m,x,y,dir,toastMsg,logMsg){
  returnPos={x:player.x,y:player.y};
  inMap=m; player.x=x*TILE; player.y=y*TILE; player.dir=dir||'up';
  setMusicMode(locMusic());
  toast(toastMsg); log(logMsg); sfx('pickup');
}
function talkPatron(pt){ showDialogue(pt.name+' 🍶',[pt.line,'<i>(The pub regulars nod at you with great respect and zero coordination.)</i>']); }
function talkClerk(){
  showDialogue('Clerk Kon 💻',[
    '"Welcome to NET CAFE 24H! Free PC, middle row, green screen. Can\'t miss it."',
    `"Word on the street: some witch named Mowskito keeps climbing our typing ranks... ${typingWins>0?`YOU have ${typingWins} win(s) already?! The regulars are FURIOUS.`:'No wins yet. The leaderboard yawns.'}"`,
  ]);
}
const RACERS=[{wpm:40,npc:'Slowpoke Sota'},{wpm:60,npc:'Office Oka'},{wpm:80,npc:'Turbo Tamaki'},{wpm:100,npc:'The Nyanner Fan'}];
function computerMenu(){
  const body=openModal('FREE PC — TYPING RACE','ネット • 勝負!');
  const p=document.createElement('p');
  p.innerHTML=`The CRT hums. A sticky note reads <i>"MOWSKITO WUZ HERE (typing gets better every day, news is spreading!)"</i><br>Your cafe record: <b>${typingWins} win(s)</b>. Pick your victim: 💻`;
  body.appendChild(p);
  for(const r of RACERS){
    const b=_btn(`⌨️ ${r.npc} — ${r.wpm} WPM`); b.style.width='100%'; b.style.marginTop='6px';
    b.onclick=()=>{
      typingRace(win=>{
        if(win){
          typingWins++; addMeow(3); refreshHUD(); sfx('coin');
          showDialogue('Free PC',[`"${r.npc} stares at your time, then slowly closes the laptop."`,`<i>(+3Ⓜ! ${typingWins} win(s) total — the news of Mowskito's typing spreads across town!)</i>`]);
          log(`Won a typing race vs ${r.npc}!`);
        } else {
          showDialogue('Free PC',[`"${r.npc} leans back, arms crossed. 'Cute. Come back when your fingers evolve.'"`,`<i>(No prize. The CRT flickers judgmentally.)</i>`]);
        }
      },{wpm:r.wpm,npc:r.npc});
    };
    body.appendChild(b);
  }
  const lv=_btn('Log off','pink'); lv.style.width='100%'; lv.style.marginTop='6px'; lv.onclick=closeModal; body.appendChild(lv);
}
function exitMap(){
  inMap=null;
  if(returnPos){ player.x=returnPos.x; player.y=returnPos.y+22; }
  player.dir='down';
  setMusicMode(locMusic());
  toast('🌃 Back outside. The night smells like rain and karaoke.'); sfx('pickup');
}
function exitPub(){
  exitMap();
}

// ---------- DEATH & ENDING ----------
function die(){
  if(dead||won) return; dead=true;
  for(const k in keys)keys[k]=false;
  setMusicMode('sad');
  const v=document.getElementById('death'); v.classList.remove('hidden');
  document.getElementById('death-stats').textContent=`Survived with ${standing} standing and ${meowllars}Ⓜ Meowllars. The cats hold a tiny funeral. There are tiny sandwiches.`;
  log('STARVED! 死亡!');
  syncAudioFlags();
}
function winGame(){
  if(won) return; won=true; questStage=4;
  for(const k in keys)keys[k]=false;
  closeModal(); setMusicMode('sad');
  document.getElementById('final-stats').textContent=`Standing ${standing} • ${meowllars}Ⓜ Meowllars • Hunger ${Math.ceil(hunger)}%`;
  document.getElementById('victory').classList.remove('hidden');
  sfx('win'); log('BOSS DOWN! 勝利!');
  syncAudioFlags();
}
function resetGame(){
  closeModal();
  document.getElementById('quest-banner').classList.add('hidden');
  hunger=100; meowllars=8; standing=0; questStage=0; nowSec=0; fish=0; typingWins=0;
  dead=false; won=false; inMap=null; bossSpawned=false; typingWins=0;
  player.x=27*TILE; player.y=21*TILE; player.dir='down'; player.immuneUntil=0;
  spawnNPCs();
  document.getElementById('death').classList.add('hidden');
  document.getElementById('victory').classList.add('hidden');
  paused=false; modalOpen=false; setMusicMode('field'); syncAudioFlags(); refreshHUD();
  log('New life in town! はじめ!');
  toast('🌃 Fresh night. Find the NEKO PUB, west side!');
}

// ---------- RENDER ----------
let mmTick = 0;
function drawMinimapThrottled(){ mmTick++; if(mmTick%20===0) drawMinimap(); }
function drawMinimap(){
  const w=minimap.width=220, h=minimap.height=220;
  mctx.fillStyle='#0d0618'; mctx.fillRect(0,0,w,h);
  if(inMap){
    mctx.fillStyle=inMap==='cafe'?'#141428':'#3a2818'; mctx.fillRect(10,10,w-20,h-20);
    mctx.fillStyle='#ffd93d'; mctx.font='10px monospace';
    mctx.fillText(inMap==='cafe'?'NET CAFE':'NEKO PUB',20,30);
    mctx.fillStyle='#ff9ed2'; mctx.fillRect(100,40,10,10);
    mctx.fillStyle='#7bffef'; mctx.fillRect(100,170,10,10);
    return;
  }
  const sx=w/TW, sy=h/TH;
  for(let y=0;y<TH;y++) for(let x=0;x<TW;x++){
    const v=ground[y][x];
    mctx.fillStyle=v===1?'#3a3a48':(v===2?'#55555f':(v===3?'#4a3b28':'#1d2b1d'));
    mctx.fillRect(x*sx,y*sy,Math.ceil(sx),Math.ceil(sy));
  }
  mctx.fillStyle='#ff8c42';
  for(const b of buildings) mctx.fillRect(b.x/TILE*sx-1,b.y/TILE*sy-1,Math.max(2,b.w/TILE*sx),Math.max(2,b.h/TILE*sy));
  mctx.fillStyle='#7bff9e';
  for(const m of machines) mctx.fillRect(m.x/TILE*sx-1,m.y/TILE*sy-1,3,3);
  mctx.fillStyle='#ffd93d';
  for(const r of raccoons){ if(nowSec*1000<r.hiddenUntil)continue; mctx.fillRect(r.x/TILE*sx-1,r.y/TILE*sy-1,3,3); }
  if(boss){ mctx.fillStyle='#ff0f3b'; mctx.fillRect(boss.x/TILE*sx-2,boss.y/TILE*sy-2,6,6); }
  mctx.fillStyle='#fff'; mctx.fillRect(player.x/TILE*sx-1,player.y/TILE*sy-1,4,4);
}
function spawnHearts(x,y,n){
  // kept tiny for cop-catch sparkle reuse
  for(let i=0;i<n;i++) parts.push({x,y,vx:(Math.random()-.5)*90,vy:-40-Math.random()*80,life:1+Math.random(),color:'#ff9ed2'});
}
let parts=[];
function render(){
  const r=canvas.getBoundingClientRect();
  const W=Math.max(320,Math.floor(r.width)), H=Math.max(240,Math.floor(r.height));
  if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}
  const warm=[]; const nowT=Date.now();
  if(!inMap){
    ctx.fillStyle='#141f16'; ctx.fillRect(0,0,canvas.width,canvas.height);
    const mw=TW*TILE, mh=TH*TILE;
    const x0=Math.max(0,Math.floor(cam.x/TILE)-1), y0=Math.max(0,Math.floor(cam.y/TILE)-1);
    const x1=Math.min(TW-1,Math.ceil((cam.x+canvas.width)/TILE)+1), y1=Math.min(TH-1,Math.ceil((cam.y+canvas.height)/TILE)+1);
    for(let ty=y0;ty<=y1;ty++) for(let tx=x0;tx<=x1;tx++){
      const sx2=Math.floor(tx*TILE-cam.x), sy2=Math.floor(ty*TILE-cam.y);
      drawGround(ctx,sx2,sy2,tx,ty,ground[ty][tx]);
      if(ground[ty][tx]===1&&hash2(tx*5+1,ty*5+3)>0.965) warm.push({x:sx2+34,y:sy2+30,r:95,color:'255,154,61'});
    }
    // power poles + sagging wires (peak 2000s streetscape)
    ctx.strokeStyle='rgba(10,10,16,.9)'; ctx.lineWidth=2;
    for(let i=0;i<poles.length-1;i++){
      const a=poles[i], b=poles[i+1];
      if(Math.abs(a.y-b.y)<4&&Math.abs(a.x-b.x)<500){
        const ax=a.x-cam.x, ay=a.y-46-cam.y, bx=b.x-cam.x, by=b.y-46-cam.y;
        ctx.beginPath(); ctx.moveTo(ax,ay); ctx.quadraticCurveTo((ax+bx)/2,Math.max(ay,by)+16,bx,by); ctx.stroke();
      }
    }
    for(const p of poles){
      const px2=p.x-cam.x, py2=p.y-cam.y;
      ctx.fillStyle='#241a12'; ctx.fillRect(px2-3,py2-50,6,60);
      ctx.fillStyle='#33241a'; ctx.fillRect(px2-14,py2-48,28,4);
    }
    for(const s of signs){ if(s.x-cam.x<-60||s.x-cam.x>canvas.width+60)continue; drawSign(ctx,{x:s.x-cam.x,y:s.y-cam.y,text:s.text,jp:s.jp}); }
    for(const b of buildings){
      if(b.x-cam.x+b.w<-50||b.x-cam.x>canvas.width+50||b.y-cam.y+b.h<-50||b.y-cam.y>canvas.height+50)continue;
      drawBuilding(ctx,{x:b.x-cam.x,y:b.y-cam.y,w:b.w,h:b.h,kind:b.kind,name:b.name,jp:b.jp,awning:b.awning,roof:b.roof});
    }
    // boss alley graffiti
    {
      const gx=50*TILE-cam.x, gy=37.4*TILE-cam.y;
      if(gx>-200&&gx<canvas.width+200){
        ctx.fillStyle='#1a1a24'; ctx.fillRect(gx-60,gy-24,220,40);
        ctx.fillStyle='#ff0f5a'; ctx.font='bold 15px monospace'; ctx.textAlign='left';
        ctx.fillText('NYANNER WAS HERE',gx-50,gy+2);
        ctx.fillStyle='#35e0e6'; ctx.font='10px monospace'; ctx.fillText('裏 • にゃん',gx+110,gy+2);
        for(let i=0;i<3;i++){ ctx.fillStyle=`rgba(255,150,40,${.5+.3*Math.sin(nowT/400+i*2)})`; ctx.fillRect(gx-40+i*70,gy-14,5,10); }
      }
    }
    for(const m of machines){
      const mx=m.x-cam.x, my=m.y-cam.y;
      if(mx<-40||mx>canvas.width+40)continue;
      drawVending(ctx,{x:mx,y:my});
      warm.push({x:mx,y:my-8,r:80,color:'140,220,255'});
    }
    for(const l of lamps){
      const lx=l.x-cam.x, ly=l.y-cam.y;
      if(lx<-50||lx>canvas.width+50||ly<-70||ly>canvas.height+50)continue;
      drawLamp(ctx,lx,ly);
      warm.push({x:lx+8,y:ly-34,r:125,color:'255,220,150'});
    }
    drawMailbox(ctx,35.7*TILE-cam.x,21.2*TILE-cam.y); // koban mailbox 〒
    for(const p of PONDS){
      const r=pondRectPx(p), px2=r.x-cam.x, py2=r.y-cam.y;
      if(px2<-320||py2<-240||px2>canvas.width+320||py2>canvas.height+240)continue;
      drawPond(ctx,px2,py2,r.w,r.h);
      warm.push({x:px2+r.w/2,y:py2+r.h/2,r:110,color:'140,200,255'});
    }
    drawPondSign(ctx,POND_SIGN.x-cam.x,POND_SIGN.y-cam.y);
    for(const s of strays) drawCat(ctx,s.x-cam.x,s.y-cam.y,s.color,false);
    for(const rc of raccoons){ if(nowSec*1000<rc.hiddenUntil)continue; drawRaccoon(ctx,rc.x-cam.x,rc.y-cam.y); }
    if(hollow) drawHollow(ctx,hollow.x-cam.x,hollow.y-cam.y);
    for(const d of dogs) drawDog(ctx,d.x-cam.x,d.y-cam.y,d.color);
    for(const c of cops) drawCop(ctx,c.x-cam.x,c.y-cam.y,c.name);
    for(const gd of guards) drawCat(ctx,gd.x-cam.x,gd.y-cam.y,gd.color,false);
    if(boss) drawBossCat(ctx,boss.x-cam.x,boss.y-cam.y);
    drawPumpkin(ctx,27*TILE-cam.x,20.2*TILE-cam.y,false);
    warm.push({x:27*TILE-cam.x,y:20.2*TILE-cam.y,r:90,color:'255,154,61'});
    // doors hint
    ctx.fillStyle='#ffd93d'; ctx.font='bold 10px monospace'; ctx.textAlign='center';
    for(const d of doors){ ctx.fillText('▼ '+d.label,d.x-cam.x,d.y-cam.y-34); }
    // vending markers — obviously interactable
    const vbob=Math.sin(nowT/350)*3;
    for(const m of machines){
      const mx=m.x-cam.x, my=m.y-cam.y-40+vbob;
      ctx.fillStyle='#0e0a14'; ctx.fillRect(mx-44,my-12,88,15);
      ctx.fillStyle='#7bff9e'; ctx.fillText('▼ SODA • ONIGIRI ▼',mx,my);
    }
    if(hollow){ ctx.fillStyle='#ff9ed2'; ctx.fillText('▼ ...food?...',hollow.x-cam.x,hollow.y-cam.y-30+vbob); }
  } else if(inMap==='pub'){
    // ---- pub interior: sleazy but loved ----
    ctx.fillStyle='#241610'; ctx.fillRect(0,0,canvas.width,canvas.height);
    const x0=Math.max(0,Math.floor(cam.x/TILE)-1), y0=Math.max(0,Math.floor(cam.y/TILE)-1);
    const x1=Math.min(21,Math.ceil((cam.x+canvas.width)/TILE)+1), y1=Math.min(13,Math.ceil((cam.y+canvas.height)/TILE)+1);
    for(let ty=y0;ty<=y1;ty++) for(let tx=x0;tx<=x1;tx++) drawPubInterior(ctx,Math.floor(tx*TILE-cam.x),Math.floor(ty*TILE-cam.y),tx,ty);
    // tatami corner (the one clean spot)
    ctx.fillStyle='#4a5a3a'; ctx.fillRect(17*TILE-cam.x,10*TILE-cam.y,4*TILE,3*TILE);
    ctx.fillStyle='#5a6a48'; for(let i=0;i<4;i++) ctx.fillRect((17+i)*TILE-cam.x,10*TILE-cam.y,3,3*TILE);
    // posters on the back wall
    const posters=[{x:3,c:'#ff5a5a',t:'MILK!'},{x:7,c:'#35e0e6',t:'LIVE'},{x:13,c:'#c9a7ff',t:'WANTED'},{x:17,c:'#ffd93d',t:'祭'}];
    for(const p of posters){
      const px2=p.x*TILE-cam.x;
      ctx.fillStyle='#0e0a14'; ctx.fillRect(px2,8-cam.y,34,44);
      ctx.fillStyle=p.c; ctx.fillRect(px2+2,10-cam.y,30,40);
      ctx.fillStyle='#0e0a14'; ctx.font='bold 10px monospace'; ctx.textAlign='center'; ctx.fillText(p.t,px2+17,32-cam.y);
    }
    if(hash2(3,7)>0.3){ ctx.fillStyle='#0e0a14'; ctx.font='8px monospace'; ctx.textAlign='center'; ctx.fillText('RACCOON: ¥500',15.5*TILE-cam.x,44-cam.y); }
    // counter + bottles + cups
    ctx.fillStyle='#4a2c14'; ctx.fillRect(2*TILE-cam.x,0*TILE-cam.y,18*TILE,2*TILE);
    ctx.fillStyle='#6b4423'; ctx.fillRect(2*TILE-cam.x,0*TILE-cam.y,18*TILE,8);
    for(let i=0;i<6;i++){ ctx.fillStyle=i%2?'#3a6a8a':'#8a6a3e'; ctx.fillRect((3+i*3)*TILE-cam.x,10-cam.y,20,26); }
    ctx.fillStyle='#e8e0d0'; for(let i=0;i<5;i++) ctx.fillRect((4+i*3.4)*TILE-cam.x,2.4*TILE-cam.y,10,8); // cups on counter
    // furniture
    for(const s of interiors.pub.solids){
      if(s.w>=22*TILE||s.h>=14*TILE)continue;
      const sx2=s.x-cam.x, sy2=s.y-cam.y;
      if(s.x===0||s.x===21*TILE){ ctx.fillStyle='#5a3a1a'; ctx.fillRect(sx2,sy2,s.w,s.h); ctx.fillStyle='#7a5228'; ctx.fillRect(sx2+4,sy2+6,s.w-8,10); continue; } // barrels
      if(s.x===18*TILE){ // jukebox!
        const fl=.6+.4*Math.sin(nowT/300);
        ctx.fillStyle=`rgba(255,80,180,${.25*fl})`; ctx.fillRect(sx2-8,sy2-8,s.w+16,s.h+16);
        ctx.fillStyle='#c9188a'; ctx.fillRect(sx2,sy2,s.w,s.h);
        ctx.fillStyle='#ffd93d'; ctx.fillRect(sx2+8,sy2+8,s.w-16,14);
        ctx.fillStyle='#0e0a14'; ctx.font='bold 9px monospace'; ctx.textAlign='center'; ctx.fillText('♪',sx2+s.w/2,sy2+20);
        warm.push({x:sx2+s.w/2,y:sy2+s.h/2,r:70,color:'255,80,180'});
        continue;
      }
      ctx.fillStyle='#5a3a1a'; ctx.fillRect(sx2,sy2,s.w,s.h);
      ctx.fillStyle='#7a5228'; ctx.fillRect(sx2,sy2,s.w,5);
      if(s.y===6*TILE){ ctx.fillStyle='#e8e0d0'; ctx.fillRect(sx2+14,sy2+14,12,8); ctx.fillRect(sx2+s.w-30,sy2+20,12,8); } // cups on tables
    }
    // dartboard nook (right wall)
    {
      const dx=21*TILE-cam.x, dy=9.6*TILE-cam.y;
      ctx.fillStyle='#e8e0d0'; ctx.fillRect(dx-16,dy-16,24,32);
      ctx.fillStyle='#c9184a'; ctx.fillRect(dx-12,dy-12,16,24);
      ctx.fillStyle='#e8e0d0'; ctx.fillRect(dx-8,dy-6,8,12);
      ctx.fillStyle='#c9184a'; ctx.fillRect(dx-5,dy-2,3,4);
    }
    // hanging lamps
    for(const lx of [5,11,17]){
      const x=lx*TILE-cam.x;
      ctx.fillStyle='#2b1b14'; ctx.fillRect(x,40-cam.y,3,30);
      const fl=.7+.3*Math.sin(nowT/350+lx);
      ctx.fillStyle=`rgba(255,180,100,${.2*fl})`; ctx.fillRect(x-30,70-cam.y,60,50);
      ctx.fillStyle='#ff9a3d'; ctx.fillRect(x-7,70-cam.y,14,18);
      warm.push({x,y:88-cam.y,r:110,color:'255,170,80'});
    }
    for(const pt of patrons) drawCat(ctx,pt.x-cam.x,pt.y-cam.y,pt.color,false);
    drawCat(ctx,veteran.x-cam.x,veteran.y-cam.y,veteran.color,true);
    drawVeteran(ctx,veteran.x-cam.x,veteran.y-cam.y);
    ctx.fillStyle='#7bffef'; ctx.font='bold 10px monospace'; ctx.textAlign='center';
    ctx.fillText('▼ EXIT',11*TILE-cam.x,13.2*TILE-cam.y);
  } else {
    // ---- net cafe interior: hum of a hundred CRTs ----
    ctx.fillStyle='#0b0b18'; ctx.fillRect(0,0,canvas.width,canvas.height);
    const x0=Math.max(0,Math.floor(cam.x/TILE)-1), y0=Math.max(0,Math.floor(cam.y/TILE)-1);
    const x1=Math.min(19,Math.ceil((cam.x+canvas.width)/TILE)+1), y1=Math.min(11,Math.ceil((cam.y+canvas.height)/TILE)+1);
    for(let ty=y0;ty<=y1;ty++) for(let tx=x0;tx<=x1;tx++) drawCafeFloor(ctx,Math.floor(tx*TILE-cam.x),Math.floor(ty*TILE-cam.y),tx,ty);
    // LED ceiling strips
    for(const ly of [2,6,9]){
      const y=ly*TILE-cam.y;
      ctx.fillStyle=`rgba(53,224,230,${.25+.1*Math.sin(nowT/500+ly)})`; ctx.fillRect(0,y,canvas.width,4);
    }
    // clerk counter
    ctx.fillStyle='#23233a'; ctx.fillRect(14*TILE-cam.x,0*TILE-cam.y,6*TILE,1*TILE);
    ctx.fillStyle='#35e0e6'; ctx.fillRect(14*TILE-cam.x,0*TILE-cam.y,6*TILE,4);
    ctx.fillStyle='#0e0a14'; ctx.font='bold 10px monospace'; ctx.textAlign='center';
    ctx.fillText('受付 COUNTER',17*TILE-cam.x,14-cam.y+1*TILE);
    drawCat(ctx,clerk.x-cam.x,clerk.y-cam.y,clerk.color,false);
    // PC desks + monitors (free PC glows green at x=10)
    for(const ry of [4,7]){
      const dy=ry*TILE-cam.y;
      ctx.fillStyle='#23233a'; ctx.fillRect(3*TILE-cam.x,dy,14*TILE,1*TILE);
      for(let dx=4;dx<=16;dx+=2){
        const mx=dx*TILE-cam.x, free=(dx===10&&ry===4);
        ctx.fillStyle='#0e0a14'; ctx.fillRect(mx,dy-24,30,26);
        const cols=['#35e0e6','#7bffef','#c9a7ff','#ffd93d','#ff9ed2'];
        ctx.fillStyle=free?'#7bff9e':cols[(dx+ry)%5];
        ctx.fillRect(mx+2,dy-22,26,18);
        ctx.fillStyle='rgba(255,255,255,.55)'; ctx.fillRect(mx+4,dy-20,18,3);
        ctx.fillStyle='#0e0a14'; ctx.fillRect(mx+12,dy+2,6,8); // stand
        if(free){
          ctx.fillStyle='#0e0a14'; ctx.font='bold 9px monospace'; ctx.textAlign='center';
          ctx.fillText('FREE! 使える',mx+15,dy-28);
          warm.push({x:mx+15,y:dy-10,r:80,color:'123,255,158'});
        } else warm.push({x:mx+15,y:dy-10,r:46,color:'53,224,230'});
      }
    }
    // snack shelf
    ctx.fillStyle='#3a2c14'; ctx.fillRect(1*TILE-cam.x,9*TILE-cam.y,2*TILE,1*TILE);
    const snk=['#ff5a5a','#ffd93d','#7bff9e','#35e0e6'];
    for(let i=0;i<4;i++){ ctx.fillStyle=snk[i]; ctx.fillRect((1.2+i*0.4)*TILE-cam.x,9.2*TILE-cam.y,12,20); }
    ctx.fillStyle='#7bffef'; ctx.font='bold 10px monospace'; ctx.textAlign='center';
    ctx.fillText('▼ USE FREE PC',10*TILE-cam.x,5.9*TILE-cam.y);
    ctx.fillText('▼ EXIT',10*TILE-cam.x,11.2*TILE-cam.y);
  }
  drawWitch(ctx,player.x-cam.x,player.y-cam.y,player.dir,player.anim,player.moving);
  for(const p of parts){ ctx.fillStyle=p.color; ctx.fillRect(p.x-cam.x-2,p.y-cam.y-2,4,4); }
  // ---- NIGHTFALL ----
  if(lightCv.width!==canvas.width||lightCv.height!==canvas.height){ lightCv.width=canvas.width; lightCv.height=canvas.height; }
  lctx.globalCompositeOperation='source-over';
  lctx.clearRect(0,0,lightCv.width,lightCv.height);
  lctx.fillStyle='rgba(10,5,26,0.50)'; // a touch brighter — cozy night, not cave
  lctx.fillRect(0,0,lightCv.width,lightCv.height);
  lctx.globalCompositeOperation='destination-out';
  const hole=(x,y,rr,a)=>{
    if(x<-rr||y<-rr||x>lightCv.width+rr||y>lightCv.height+rr)return;
    const gr=lctx.createRadialGradient(x,y,0,x,y,rr);
    gr.addColorStop(0,`rgba(255,255,255,${a})`); gr.addColorStop(1,'rgba(255,255,255,0)');
    lctx.fillStyle=gr; lctx.beginPath(); lctx.arc(x,y,rr,0,7); lctx.fill();
  };
  hole(player.x-cam.x,player.y-cam.y,205,0.95);
  for(const L of warm) hole(L.x,L.y,L.r,0.92);
  ctx.drawImage(lightCv,0,0);
  ctx.globalCompositeOperation='lighter';
  for(const L of warm){
    if(L.x<-L.r||L.y<-L.r||L.x>canvas.width+L.r||L.y>canvas.height+L.r)continue;
    const gr=ctx.createRadialGradient(L.x,L.y,0,L.x,L.y,L.r);
    gr.addColorStop(0,`rgba(${L.color},0.20)`); gr.addColorStop(1,`rgba(${L.color},0)`);
    ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(L.x,L.y,L.r,0,7); ctx.fill();
  }
  ctx.globalCompositeOperation='source-over';
  if(!gameStarted) return;
  ctx.fillStyle='rgba(10,5,26,.88)'; ctx.fillRect(8,8,310,26);
  ctx.fillStyle='#ffb35c'; ctx.font='12px monospace'; ctx.textAlign='left';
  const where=inMap?(inMap==='pub'?'🍶PUB':'💻CAFE'):'🌃TOWN';
  ctx.fillText(`Ⓜ${meowllars}  🐾${standing}  🍖${Math.ceil(Math.max(0,hunger))}%  ${where}`,14,25);
  // interaction hints
  ctx.fillStyle='rgba(10,5,26,.7)'; ctx.fillRect(8,canvas.height-28,330,20);
  ctx.fillStyle='#c9b8ff'; ctx.font='11px monospace';
  ctx.fillText('[SPACE] talk / fight / buy / enter',14,canvas.height-13);
}

// ---------- FLOW ----------
function toastStart(){ toast('🌃 Fresh night. Find the NEKO PUB, west side!'); }
document.getElementById('btn-music').onclick=(e)=>{ musicOn=!musicOn; e.target.textContent=musicOn?'🎵 MUSIC: ON':'🎵 MUSIC: OFF'; initAudio(); if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume(); };
document.getElementById('btn-help').onclick=()=>{ document.getElementById('start-overlay').classList.remove('hidden'); paused=true; syncAudioFlags(); };
document.getElementById('btn-hud').onclick=(e)=>{ document.body.classList.toggle('hud-hidden'); e.target.textContent=document.body.classList.contains('hud-hidden')?'👁 SHOW HUD':'👁 HUD'; };
document.querySelectorAll('#side .panel h3').forEach(h=>{ h.title='click to collapse / expand'; h.onclick=()=>h.parentElement.classList.toggle('collapsed'); });
document.getElementById('btn-unstuck').onclick=()=>{
  if(!gameStarted||dead||won||modalOpen) return;
  const body=openModal('UNSTUCK?!','たすけて!');
  const p=document.createElement('p');
  p.innerHTML='<b>NO CHEATING!!!! Only use when actually stuck!!!!</b><br><br>Beam yourself to the middle of the map? (Does NOT restart anything — stats, hunger, quest all stay.) 🛸';
  body.appendChild(p);
  const row=document.createElement('div'); row.style.display='flex'; row.style.gap='8px';
  const yes=_btn('YES, BEAM ME'); yes.style.flex='1';
  const no=_btn('No, I\'m fine','pink'); no.style.flex='1';
  row.appendChild(yes); row.appendChild(no); body.appendChild(row);
  yes.onclick=()=>{
    for(const k in keys)keys[k]=false;
    if(inMap){ const IM=interiors[inMap]; player.x=IM.w/2*TILE; player.y=(IM.h/2+1)*TILE; }
    else { player.x=27.5*TILE; player.y=20.5*TILE; }
    player.dir='down'; player.immuneUntil=nowSec*1000+3000;
    closeModal(); sfx('quest'); toast('🛸 Beamed to the middle! No questions asked. ...Suspicious.');
    log('Used UNSTUCK. The town pretends not to notice.');
  };
  no.onclick=closeModal;
};
document.getElementById('btn-start').onclick=()=>{
  initAudio(); if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume();
  startMusic();
  document.getElementById('start-overlay').classList.add('hidden');
  if(!gameStarted){ gameStarted=true; }
  paused=false; modalOpen=false; syncAudioFlags();
  log('New life in town! Speak to the veteran kitty at NEKO PUB!');
  toastStart();
};
document.getElementById('btn-restart2').onclick=()=>{ resetGame(); };
document.getElementById('btn-again-death').onclick=()=>{ resetGame(); };
document.getElementById('btn-again-win').onclick=()=>{ resetGame(); };
(function petals(){
  const layer=document.getElementById('sakura-fall');
  const set=['🦇','🦇','👻','🎃','💜','🌸','🍬'];
  for(let i=0;i<26;i++){ const s=document.createElement('span'); s.className='petal'; s.textContent=set[i%set.length]; s.style.left=Math.random()*100+'%'; s.style.animationDuration=(5+Math.random()*7)+'s'; s.style.animationDelay=(Math.random()*7)+'s'; layer.appendChild(s); }
})();

buildTown(); buildInteriors(); spawnNPCs(); refreshHUD(); drawMinimap(); syncAudioFlags();
paused=true;
let last=performance.now();
function loop(t){
  const dt=Math.min(0.05,(t-last)/1000); last=t;
  parts=parts.filter(p=>{p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;return p.life>0;});
  update(dt); render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
