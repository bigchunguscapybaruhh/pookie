// Mowzkitow braincell challenge — full game
(() => {
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const minimap = document.getElementById('minimap');
const mctx = minimap.getContext('2d');
mctx.imageSmoothingEnabled = false;
// night-lighting rig: offscreen darkness mask with holes punched for lights
const lightCv = document.createElement('canvas');
const lctx = lightCv.getContext('2d');

const TILE = 48; // rendered tile size (16x16 art scaled x3)
const COLS = 31, ROWS = 31; // big maze, odd numbers
let maze = [];
let orbs = [];
let cats = [];
let particles = [];
let braincells = 0;
let challengesDone = 0;
let startTime = 0, elapsed = 0, timerOn = false;
let gameStarted = false, gameWon = false, paused = false;
let cam = { x: 0, y: 0 };

// ---- AUDIO: goofy chiptune loop with WebAudio ----
let audioCtx = null, musicOn = true, musicTimer = null, step = 0;
function initAudio() {
  if (audioCtx) return;
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){}
}
function playNote(freq, dur=0.14, type='square', vol=0.06, when=0) {
  if (!audioCtx || !musicOn) return;
  const t = audioCtx.currentTime + when;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(t); o.stop(t + dur + 0.02);
}
function sfx(name) {
  if (!audioCtx) return;
  if (name==='pickup') { playNote(880,.1,'square',.08); playNote(1320,.12,'square',.08,.08); }
  if (name==='win') { [523,659,784,1046,1318,1568].forEach((f,i)=>playNote(f,.18,'square',.09,i*0.09)); }
  if (name==='hit') { playNote(160,.2,'sawtooth',.1); }
  if (name==='step') { playNote(220+Math.random()*80,.05,'square',.02); }
  if (name==='solve') { [784,988,1175,1568].forEach((f,i)=>playNote(f,.15,'triangle',.1,i*0.07)); }
  if (name==='meow') { playNote(600,.15,'sawtooth',.07); playNote(900,.2,'sawtooth',.07,.12); }
}
// Spooky skeleton-showtime loop: an ORIGINAL funky/gloopy/splunky swing tune
// in the spirit of Bonetrousle (bone-xylo stabs, bouncy tuba, shuffling
// skeleton drums) with a chiller halloween undertone: slower step, softer
// kit, tolling bell + ghost-choir glides drifting over the groove.
// Deliberately NOT the copyrighted melody — same vibe, different notes.
const noteFreq = n => { // note name -> freq
  const map={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  const m=/^([A-G])(#|b)?(\d)$/.exec(n); if(!m) return 0;
  const semi=map[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0);
  const midi=(+m[3]+1)*12+semi;
  return 440*Math.pow(2,(midi-69)/12);
};
// gloopy = pitch glides between notes; splunky = wet pluck with pitch drop
function playGlide(from, to, dur=0.12, type='square', vol=0.045, when=0) {
  if (!audioCtx || !musicOn) return;
  const t = audioCtx.currentTime + when;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(from, t);
  o.frequency.linearRampToValueAtTime(Math.max(20,to), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(t); o.stop(t + dur + 0.02);
}
function playPlunk(freq, dur=0.09, vol=0.05, when=0) {
  if (!audioCtx || !musicOn) return;
  const t = audioCtx.currentTime + when;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq*3, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(30,freq), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(t); o.stop(t + dur + 0.02);
}
// 32-step loop, heavy swing: stabs, doubles, octave pops, chromatic gloop run
const boneLead = [
  'A4',0,'A4','A4', 'C5',0,'A4',0, 'D5','D5',0,'C5', 'B4',0,'A4',0,
  'A4',0,'A4','A4', 'C5',0,'D5','E5', 'D5','C5','B4','G#4', 'A4',0,'A5~',0,
];
const boneBass = [
  'A2',0,'A3','A2', 0,'G2','G3','G2', 'F2',0,'F3','F2', 0,'E2','E3','E2',
  'A2',0,'A3','A2', 0,'G2','G3','G2', 'E2','E2','G#2','A2', 'A2~','A2',0,0,
];
function musicLoop() {
  if (musicOn && audioCtx && gameStarted && !paused) {
    const i = step % 32;
    const swing = (i % 2 === 1) ? 0.025 : 0; // shuffled skeleton swing
    const l = boneLead[i], b = boneBass[i];
    // bone-xylo lead: square stab + octave shimmer; '~' steps gloop-glide
    if (l) {
      if (String(l).endsWith('~')) { const n=String(l).slice(0,-1); playGlide(noteFreq(n)/2, noteFreq(n), 0.16, 'square', 0.042, swing); }
      else { playNote(noteFreq(l), 0.12, 'square', 0.042, swing); playNote(noteFreq(l)*2, 0.07, 'triangle', 0.02, swing); }
    }
    // tuba bass: fat triangle; '~' steps slide up gloopy-style
    if (b) {
      if (String(b).endsWith('~')) { const n=String(b).slice(0,-1); playGlide(noteFreq(n), noteFreq(n)*2, 0.26, 'triangle', 0.10, 0); }
      else playNote(noteFreq(b), 0.19, 'triangle', 0.10, 0);
    }
    // chiller skeleton kit: soft kick, rim backbeat, brushed hats
    if (i % 8 === 0 || i % 8 === 5) playNote(110, 0.08, 'sine', 0.085);
    if (i % 8 === 4) playNote(175, 0.06, 'square', 0.04);
    if (i % 2 === 1) playNote(6500, 0.025, 'square', 0.008);
    // splunky water-drop pluck every 2 bars
    if (i === 30) playPlunk(noteFreq('E5'), 0.12, 0.035);
    if (i === 14) playPlunk(noteFreq('C5'), 0.10, 0.028);
    // halloween undertone: tolling bell each bar + ghost choir every 2 loops
    if (i % 16 === 0) { playNote(noteFreq('A5'), 0.6, 'triangle', 0.022); playNote(noteFreq('E5'), 0.6, 'sine', 0.02); }
    if (i % 16 === 8) playNote(noteFreq('G5'), 0.5, 'triangle', 0.016);
    if (step % 64 === 0) playGlide(noteFreq('E6'), noteFreq('A5'), 1.3, 'sine', 0.022);
    if (step % 64 === 32) playGlide(noteFreq('C6'), noteFreq('G5'), 1.1, 'sine', 0.018);
  }
  step++;
}
function startMusic() { initAudio(); if (musicTimer) clearInterval(musicTimer); musicTimer = setInterval(musicLoop, 148); }

// ---- MAZE GEN ----
function genMaze() {
  maze = Array.from({length: ROWS}, () => Array(COLS).fill(0));
  function carve(x, y) {
    maze[y][x] = 1;
    const dirs = [[2,0],[-2,0],[0,2],[0,-2]].sort(()=>Math.random()-0.5);
    for (const [dx,dy] of dirs) {
      const nx = x+dx, ny = y+dy;
      if (nx>0 && ny>0 && nx<COLS-1 && ny<ROWS-1 && maze[ny][nx]===0) {
        maze[y+dy/2][x+dx/2]=1;
        carve(nx,ny);
      }
    }
  }
  carve(1,1);
  // braid: knock ~60 extra walls to add loops (casual-friendly but still big)
  let knocked=0, tries=0;
  while (knocked<60 && tries<2000) {
    tries++;
    const x = 1+Math.floor(Math.random()*(COLS-2));
    const y = 1+Math.floor(Math.random()*(ROWS-2));
    if (maze[y][x]===0) {
      // only knock if it connects two floors
      const h = (maze[y][x-1]===1 && maze[y][x+1]===1);
      const v = (maze[y-1] && maze[y+1] && maze[y-1][x]===1 && maze[y+1][x]===1);
      if (h||v) { maze[y][x]=1; knocked++; }
    }
  }
  maze[1][1]=1;
  maze[ROWS-2][COLS-2]=1;
  maze[ROWS-2][COLS-3]=1;
  placeOrbs();
  placeCats();
}
function openCells() {
  const cells=[];
  for (let y=1;y<ROWS-1;y++) for (let x=1;x<COLS-1;x++) if(maze[y][x]===1) cells.push({x,y});
  return cells;
}
function bfsDist() {
  const d = Array.from({length:ROWS},()=>Array(COLS).fill(-1));
  const q=[[1,1]]; d[1][1]=0;
  while(q.length){ const [x,y]=q.shift();
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy;
      if(nx>=0&&ny>=0&&nx<COLS&&ny<ROWS&&maze[ny][nx]===1&&d[ny][nx]===-1){d[ny][nx]=d[y][x]+1;q.push([nx,ny]);}
    }
  }
  return d;
}
// trial registry: every puzzle type owns a distinct stone look
const TRIALS = {
  zip:      { name:'ZIP',     color:'#35e0e6', glow:'rgba(53,224,230,.35)'  },
  typing:   { name:'TYPE',    color:'#fff3c4', glow:'rgba(255,243,196,.35)' },
  simon:    { name:'FOX',     color:'#c9a7ff', glow:'rgba(160,110,255,.4)'  },
  riddle:   { name:'RIDDLE',  color:'#ffd93d', glow:'rgba(255,217,61,.4)'   },
  scramble: { name:'RUNE',    color:'#ff9a3d', glow:'rgba(255,154,61,.4)'   },
  catch:    { name:'CATCH',   color:'#7bff9e', glow:'rgba(80,255,150,.35)'  },
};
const TRIAL_KEYS = Object.keys(TRIALS);
// shortest walk from START to GATE — stones sit ON it so they're in the way
function bfsPath(){
  const prev=Array.from({length:ROWS},()=>Array(COLS).fill(null));
  const seen=Array.from({length:ROWS},()=>Array(COLS).fill(false));
  const q=[[1,1]]; seen[1][1]=true;
  const ex=COLS-2, ey=ROWS-2;
  while(q.length){
    const [x,y]=q.shift();
    if(x===ex&&y===ey) break;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx, ny=y+dy;
      if(nx<0||ny<0||nx>=COLS||ny>=ROWS||seen[ny][nx]||maze[ny][nx]!==1) continue;
      seen[ny][nx]=true; prev[ny][nx]=[x,y]; q.push([nx,ny]);
    }
  }
  if(!seen[ey][ex]) return [];
  const path=[]; let cur=[ex,ey];
  while(cur){ path.push({x:cur[0],y:cur[1]}); const [cx,cy]=cur; cur=prev[cy][cx]; }
  return path.reverse(); // start -> gate
}
function placeOrbs() {
  const path=bfsPath();
  // walkable middle of the route only (never on START / GATE tiles)
  const usable=path.filter((c,i)=>i>4 && i<path.length-4 && !(c.x===1&&c.y===1));
  orbs=[];
  const N=10;
  // every puzzle type guaranteed at least one stone, shuffled along the route
  const deck=[...TRIAL_KEYS].sort(()=>Math.random()-0.5);
  while(deck.length<N) deck.push(TRIAL_KEYS[Math.floor(Math.random()*TRIAL_KEYS.length)]);
  deck.sort(()=>Math.random()-0.5);
  const picks=[];
  if(usable.length>=N){
    for(let i=0;i<N;i++){
      const idx=Math.min(usable.length-1, Math.floor((i+0.5)/N*usable.length));
      picks.push(usable[idx]);
    }
  } else {
    // fallback (shouldn't happen on 31x31): any open cells
    const cells=openCells().filter(c=>!(c.x===1&&c.y===1)&&!(c.x===COLS-2&&c.y===ROWS-2));
    cells.sort(()=>Math.random()-0.5);
    for(let i=0;i<N&&i<cells.length;i++) picks.push(cells[i]);
  }
  picks.forEach((c,i)=>{
    if(!c||orbs.some(o=>o.tx===c.x&&o.ty===c.y)) return;
    orbs.push({tx:c.x, ty:c.y, x:c.x*TILE+TILE/2, y:c.y*TILE+TILE/2, done:false, bob:Math.random()*6, type:deck[i%deck.length]});
  });
}
function placeCats() {
  cats=[];
  const cells=openCells().filter(c=>!(c.x===1&&c.y===1));
  for(let i=0;i<4;i++){
    const c=cells[Math.floor(Math.random()*cells.length)];
    cats.push({x:c.x*TILE+TILE/2, y:c.y*TILE+TILE/2, dir:Math.floor(Math.random()*4), t:0, color:['#ffffff','#ffbe5c','#8d8d8d','#ffb3d9'][i%4], meow:0});
  }
}

// ---- PLAYER ----
const player = { x: 1*TILE+TILE/2, y: 1*TILE+TILE/2, r: 13, speed: 165, vx:0, vy:0, dir:'down', moving:false, anim:0, stepSnd:0 };
const keys = {};
function isTypingTarget(el){
  return el && (el.tagName==='TEXTAREA' || el.tagName==='INPUT' || el.isContentEditable);
}
window.addEventListener('keydown', e => {
  // FIX: never hijack keys while typing in a challenge input (this was eating SPACE)
  if (isTypingTarget(e.target) || isTypingTarget(document.activeElement)) return;
  const k=e.key.toLowerCase();
  keys[k]=true;
  if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
});
window.addEventListener('keyup', e => {
  if (isTypingTarget(e.target)) return;
  keys[e.key.toLowerCase()]=false;
});

function isWallAt(px,py){
  const tx=Math.floor(px/TILE), ty=Math.floor(py/TILE);
  if(tx<0||ty<0||tx>=COLS||ty>=ROWS) return true;
  return maze[ty][tx]===0;
}
function collide(nx,ny){
  const r=player.r;
  // check 4 corners
  const pts=[[nx-r,ny-r],[nx+r,ny-r],[nx-r,ny+r],[nx+r,ny+r],[nx,ny]];
  for(const [px,py] of pts) if(isWallAt(px,py)) return true;
  return false;
}
function update(dt){
  if(!gameStarted||paused||gameWon) return;
  let dx=0,dy=0;
  if(keys['w']||keys['arrowup']) dy-=1;
  if(keys['s']||keys['arrowdown']) dy+=1;
  if(keys['a']||keys['arrowleft']) dx-=1;
  if(keys['d']||keys['arrowright']) dx+=1;
  if(dx!==0&&dy!==0){dx*=0.7071;dy*=0.7071;}
  player.moving=(dx!==0||dy!==0);
  if(dx<0) player.dir='left'; else if(dx>0) player.dir='right'; else if(dy<0) player.dir='up'; else if(dy>0) player.dir='down';
  if(player.moving){
    player.anim+=dt*9;
    player.stepSnd+=dt;
    if(player.stepSnd>0.28){player.stepSnd=0; sfx('step');}
  } else player.anim=0;
  const nx=player.x+dx*player.speed*dt;
  if(!collide(nx,player.y)) player.x=nx;
  const ny=player.y+dy*player.speed*dt;
  if(!collide(player.x,ny)) player.y=ny;

  // camera
  const vw=canvas.width, vh=canvas.height;
  cam.x=Math.max(0,Math.min(COLS*TILE-vw, player.x-vw/2));
  cam.y=Math.max(0,Math.min(ROWS*TILE-vh, player.y-vh/2));

  // trial stones sit mid-corridor and grab hard — generous radius, no tiptoeing past
  for(const o of orbs){
    o.bob+=dt*3;
    if(!o.done && Math.hypot(player.x-o.x,player.y-o.y)<36){
      triggerChallenge(o);
      break;
    }
  }
  // cats wander
  for(const c of cats){
    c.t+=dt;
    if(c.t>1.2+Math.random()*0.2){c.t=0;c.dir=Math.floor(Math.random()*4);}
    const sp=40*dt;
    let nx=c.x,ny=c.y;
    if(c.dir===0)ny-=sp; if(c.dir===1)ny+=sp; if(c.dir===2)nx-=sp; if(c.dir===3)nx+=sp;
    const tx=Math.floor(nx/TILE),ty=Math.floor(ny/TILE);
    if(tx>=0&&ty>=0&&tx<COLS&&ty<ROWS&&maze[ty][tx]===1){c.x=nx;c.y=ny;}
    else c.dir=Math.floor(Math.random()*4);
    if(Math.hypot(player.x-c.x,player.y-c.y)<26 && c.meow<=0){ c.meow=2; sfx('meow'); log('A field cat stares at you. Classic. (happiness +10)'); spawnHearts(c.x,c.y,4); }
    if(c.meow>0)c.meow-=dt;
  }
  // particles
  particles=particles.filter(p=>{p.life-=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; return p.life>0;});

  // exit check: meadow gate at COLS-2, ROWS-2
  const ex=(COLS-2)*TILE+TILE/2, ey=(ROWS-2)*TILE+TILE/2;
  if(Math.hypot(player.x-ex,player.y-ey)<26){ win(); }

  elapsed=(Date.now()-startTime)/1000;
  document.getElementById('hud-time').textContent=fmtTime(elapsed);
  drawMinimap();
}

// ---- PIXEL TILE RENDERING: open-world Whispering Fields (Stardew-like) ----
function hash2(x,y){ let h=(x*73856093 ^ y*19349663)>>>0; h=(h*1664525+1013904223)>>>0; return h/4294967295; }
function drawFloorTile(g, sx, sy, vx, vy){
  // open meadow: large soft biome patches, not checkerboard
  const region = Math.floor(vx/4) + Math.floor(vy/4)*7;
  const r1 = hash2(vx,vy), r2 = hash2(vx*3+11,vy*5+7), r3 = hash2(vx*7+3,vy*2+13);
  let base = '#8fd45e';
  if (r2 > 0.72) base = '#7ec850';       // lush hollow
  else if (r2 < 0.18) base = '#a5dd6f';  // sunlit meadow
  if ((vx+vy*2)%11===0 && r3>0.4) base = '#c9b86a'; // dry dirt patch
  if ((vx*2-vy)%23===0 && r1>0.6) base = '#6fb84f'; // deep grass
  g.fillStyle = base; g.fillRect(sx,sy,TILE,TILE);
  // subtle 4px texture
  let h=(vx*73856093 ^ vy*19349663)>>>0;
  const rnd=()=>{h=(h*1664525+1013904223)>>>0;return h/4294967295;};
  for(let i=0;i<7;i++){
    const px=sx+Math.floor(rnd()*11)*4, py=sy+Math.floor(rnd()*11)*4;
    g.fillStyle = rnd()>0.5 ? 'rgba(0,80,20,.14)' : 'rgba(255,255,220,.16)';
    g.fillRect(px,py,4,4);
  }
  // dirt speckles on path-like tiles (every few tiles)
  if ((vx+vy)%4===0){
    g.fillStyle='#b8935e';
    g.fillRect(sx+10,sy+30,8,4); g.fillRect(sx+28,sy+12,8,4);
    g.fillStyle='#8a6a3e';
    g.fillRect(sx+10,sy+32,8,2); g.fillRect(sx+28,sy+14,8,2);
  }
  // grass tufts
  for(let i=0;i<3;i++){
    if(rnd()>0.45){
      const gx=sx+4+Math.floor(rnd()*9)*4, gy=sy+6+Math.floor(rnd()*9)*4;
      g.fillStyle='#3e8e3a';
      g.fillRect(gx,gy,4,8); g.fillRect(gx+4,gy+4,4,4);
      g.fillStyle='#5cbf4e'; g.fillRect(gx,gy,4,4);
    }
  }
  // flowers / clover / stones / mushrooms — scattered farm-field feel
  if(r1>0.86){
    const fx=sx+8+Math.floor(r2*24), fy=sy+8+Math.floor(r3*24);
    const cols=['#ffffff','#ffd93d','#ff6fae','#ff8c42'];
    g.fillStyle=cols[Math.floor(r2*4)%4]; g.fillRect(fx,fy,6,6);
    g.fillStyle='#e63956'; g.fillRect(fx+2,fy+2,2,2);
    g.fillStyle='#3e8e3a'; g.fillRect(fx+1,fy+6,4,3);
  } else if(r1<0.08){
    const px2=sx+12+Math.floor(r2*20), py2=sy+12+Math.floor(r3*20);
    g.fillStyle='#9a9a9a'; g.fillRect(px2,py2,8,6);
    g.fillStyle='#c9c9c9'; g.fillRect(px2,py2,8,2);
  } else if(r1>0.80 && r1<=0.86){
    const mx=sx+16+Math.floor(r2*12), my=sy+16+Math.floor(r3*12);
    g.fillStyle='#e8e0d0'; g.fillRect(mx,my,6,6);
    g.fillStyle='#c1123b'; g.fillRect(mx,my-4,6,5);
    g.fillStyle='#fff'; g.fillRect(mx+1,my-3,2,2);
  }
  // tiny pond puddle cluster (walkable, just visual)
  if(hash2(Math.floor(vx/2),Math.floor(vy/2))>0.93 && r3>0.5){
    g.fillStyle='#6fb8d8'; g.fillRect(sx+8,sy+10,32,24);
    g.fillStyle='#a8dcf0'; g.fillRect(sx+10,sy+12,12,4);
    g.fillStyle='#4a8ab0'; g.fillRect(sx+8,sy+30,32,4);
  }
  // halloween: purple ground-mist drifting over some tiles
  if(hash2(vx+40,vy+77)>0.90){
    g.fillStyle='rgba(120,70,180,.22)'; g.fillRect(sx+2,sy+26,44,14);
    g.fillStyle='rgba(160,110,255,.20)'; g.fillRect(sx+8,sy+30,28,6);
  }
  // halloween: dead gray-purple blades among the grass
  if(r3<0.12){
    g.fillStyle='#5a4a6b'; g.fillRect(sx+6,sy+34,4,8); g.fillRect(sx+34,sy+10,4,8);
    g.fillStyle='#7a6a8b'; g.fillRect(sx+6,sy+34,4,3); g.fillRect(sx+34,sy+10,4,3);
  }
  // halloween: jack-o'-lantern grinning from the corner (flickers)
  if(hash2(vx*5+1,vy*5+3)>0.94){
    const px0=sx+26, py0=sy+24, fl=0.6+0.4*Math.abs(Math.sin(Date.now()/400+vx*2+vy));
    g.fillStyle=`rgba(255,150,40,${0.14*fl})`; g.fillRect(px0-6,py0-6,28,24);
    g.fillStyle='#c96a1e'; g.fillRect(px0,py0,16,13);
    g.fillStyle='#e8932e'; g.fillRect(px0+2,py0+2,5,9); g.fillRect(px0+9,py0+2,5,9);
    g.fillStyle='#5a3a1a'; g.fillRect(px0+7,py0-3,3,4); // stem
    g.fillStyle=`rgba(255,230,120,${0.5+0.5*fl})`;
    g.fillRect(px0+3,py0+4,4,4); g.fillRect(px0+10,py0+4,4,4); // eyes
    g.fillRect(px0+3,py0+10,11,2); g.fillRect(px0+6,py0+12,5,2); // jagged grin
  }
}
function drawWallTile(g,sx,sy,vx,vy){
  // haunted autumn thicket forming the maze — dark woods, halloween lights
  let h=(vx*83492791 ^ vy*2971215073)>>>0;
  const rnd=()=>{h=(h*1664525+1013904223)>>>0;return h/4294967295;};
  // soil base, a shade darker for spookiness
  g.fillStyle='#38281c'; g.fillRect(sx,sy,TILE,TILE);
  g.fillStyle='#4c3a26'; g.fillRect(sx+4,sy+4,TILE-8,TILE-8);
  const pine = hash2(vx,vy) > 0.62;
  const autumn = hash2(vx*3+5,vy*3+9) > 0.55; // some canopies turn pumpkin-orange
  function roundTree(cx,cy,s){
    g.fillStyle='#101f18'; g.fillRect(cx-s,cy-s,s*2,s*2);
    g.fillStyle=autumn?'#6b3a1e':'#1e4028'; g.fillRect(cx-s+2,cy-s+2,s*2-4,s*2-4);
    g.fillStyle=autumn?'#e8932e':'#4a7a5a'; g.fillRect(cx-s+3,cy-s+3,5,5);
    if(autumn){ g.fillStyle='#c96a1e'; g.fillRect(cx+s-8,cy+2,4,4); }
    g.fillStyle='#2c2013'; g.fillRect(cx-2,cy+s-2,4,8);
  }
  function pineTree(cx,cy){
    g.fillStyle='#2c2013'; g.fillRect(cx-2,cy+8,4,8);
    g.fillStyle='#101f18';
    g.fillRect(cx-10,cy+2,20,8); g.fillRect(cx-7,cy-6,14,8); g.fillRect(cx-4,cy-14,8,8);
    g.fillStyle=autumn?'#4a3a20':'#1e4028';
    g.fillRect(cx-8,cy+2,16,4); g.fillRect(cx-5,cy-6,10,4);
    g.fillStyle=autumn?'#e8932e':'#5a8a6a'; g.fillRect(cx-4,cy-4,3,3);
  }
  if(pine){ pineTree(sx+12,sy+20); pineTree(sx+34,sy+24); }
  else { roundTree(sx+12,sy+20,11); roundTree(sx+35,sy+22,10); roundTree(sx+24,sy+12,8); }
  // halloween: something's eyes glow back from the bushes on some tiles
  if(hash2(vx*9+4,vy*9+4)>0.88){
    const ex=sx+14+Math.floor(hash2(vx,vy*2)*16), ey=sy+16+Math.floor(hash2(vx*2,vy)*10);
    const gl=0.5+0.5*Math.abs(Math.sin(Date.now()/500+vx+vy));
    g.fillStyle=`rgba(255,220,90,${0.55+0.45*gl})`;
    g.fillRect(ex,ey,4,5); g.fillRect(ex+8,ey,4,5);
    g.fillStyle='#1a0f00'; g.fillRect(ex+1,ey+1,2,2); g.fillRect(ex+9,ey+1,2,2);
  }
  // will-o'-wisps: orange / violet / sickly green sparks
  for(let i=0;i<3;i++){
    if(rnd()>0.6){ const c=rnd(); g.fillStyle = c>0.66 ? '#ff9a3d' : (c>0.33 ? '#c9a7ff' : '#9dff6e'); g.fillRect(sx+4+Math.floor(rnd()*10)*4, sy+4+Math.floor(rnd()*10)*4, 3,3); }
  }
  // grass fringe where woods meet a path — sells the open-world edge
  try{
    if(maze[vy-1] && maze[vy-1][vx]===1){
      g.fillStyle='#8fd45e'; g.fillRect(sx,sy,TILE,6); g.fillStyle='#3e8e3a'; for(let x=0;x<6;x++){ if(rnd()>0.4) g.fillRect(sx+x*8,sy+6,4,5); }
      // halloween: spider web strung across some path-facing edges
      if(hash2(vx*7+2,vy*7+8)>0.78){
        g.fillStyle='rgba(230,230,240,.75)';
        g.fillRect(sx+2,sy,2,14); g.fillRect(sx+2,sy+6,14,2); g.fillRect(sx+8,sy,2,10);
        g.fillRect(sx+2,sy+12,10,1);
        g.fillStyle='#2b1b4d'; g.fillRect(sx+9,sy+8,4,4); // the spider. hi.
      }
    }
    if(maze[vy+1] && maze[vy+1][vx]===1){ g.fillStyle='rgba(0,0,0,.35)'; g.fillRect(sx,sy+TILE-6,TILE,6); }
    if(maze[vy] && maze[vy][vx-1]===1){ g.fillStyle='#8fd45e'; g.fillRect(sx,sy,5,TILE); }
    if(maze[vy] && maze[vy][vx+1]===1){ g.fillStyle='rgba(0,0,0,.25)'; g.fillRect(sx+TILE-5,sy,5,TILE); }
  }catch(_){}
}

// spooky vampire witch — 16x16 style pixel drawing, scaled
function drawWitch(g, px, py, dir, anim, moving){
  const s=3; // pixel size -> 16*3=48
  const bob = moving ? Math.floor(Math.sin(anim)*1) : 0;
  const hop = moving ? Math.abs(Math.sin(anim))*2 : Math.sin(Date.now()/500)*1.2;
  const ox=Math.floor(px-8*s), oy=Math.floor(py-8*s+bob+hop*0.4);
  const P=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(ox+x*s,oy+y*s,w*s,h*s);};
  // shadow
  g.fillStyle='rgba(0,0,0,.3)'; g.fillRect(px-14,py+20,28,6);
  // back hair (long dark)
  P(3,6,10,8,'#1d1030');
  P(2,8,2,6,'#1d1030'); P(12,8,2,6,'#1d1030');
  // purple streak
  P(4,8,1,6,'#9b5cff');
  // legs (animate)
  const legOff = moving ? Math.floor(Math.sin(anim)*1.4) : 0;
  P(6,14,2,2,'#f3d6e2'); P(8,14,2,2,'#f3d6e2');
  P(6+legOff*0.4,15,2,1,'#2b1b4d'); P(8-legOff*0.4,15,2,1,'#2b1b4d');
  // dress (black goth + red cape)
  P(4,11,8,4,'#241433');           // dress
  P(2,11,2,4,'#c1123b'); P(12,11,2,4,'#c1123b'); // cape sides
  P(5,12,2,2,'#7b2ff7'); P(9,12,1,1,'#ffd93d'); // brooch
  // arms
  P(3,11,1,3,'#f7c9d9'); P(12,11,1,3,'#f7c9d9');
  // head
  P(5,6,6,5,'#ffe3ec'); // face pale
  // hair fringe
  P(4,5,8,2,'#1d1030');
  P(5,7,1,1,'#1d1030'); P(10,7,1,1,'#1d1030');
  // eyes red spooky
  if(dir==='up'){ P(5,8,2,1,'#2b1b4d'); P(9,8,2,1,'#2b1b4d'); }
  else { P(5,8,2,2,'#ff0f3b'); P(9,8,2,2,'#ff0f3b'); P(5,8,1,1,'#fff'); P(9,8,1,1,'#fff'); P(6,9,1,1,'#5c0000'); P(10,9,1,1,'#5c0000'); }
  // fangs
  if(dir!=='up'){ P(7,10,1,1,'#fff'); P(8,10,1,1,'#fff'); }
  // blush
  P(4,9,1,1,'#ff9ed2'); P(11,9,1,1,'#ff9ed2');
  // witch hat (big)
  P(3,1,10,2,'#241433');
  P(4,0,8,1,'#241433');
  P(7, -1,2,1,'#241433');
  P(4,2,8,1,'#7b2ff7'); // band
  P(7,2,2,1,'#ffd93d'); // buckle
  P(5,1,1,1,'#9b5cff'); // shine
  // side hair by dir
  if(dir==='left'){ P(2,7,1,5,'#1d1030'); }
  if(dir==='right'){ P(13,7,1,5,'#1d1030'); }
  // bat wings when moving fast? tiny
  if(moving){ P(1,10,1,2,'#5a2d8f'); P(14,10,1,2,'#5a2d8f'); }
}
function drawCat(g,x,y,color,frame){
  const s=2; const ox=Math.floor(x-8*s), oy=Math.floor(y-8*s+Math.sin(Date.now()/300+x)*1.5);
  const P=(a,b,w,h,c)=>{g.fillStyle=c;g.fillRect(ox+a*s,oy+b*s,w*s,h*s);};
  g.fillStyle='rgba(0,0,0,.25)'; g.fillRect(x-10,y+12,20,4);
  P(3,10,10,4,color); P(4,9,8,2,color);
  P(3,7,2,3,color); P(11,7,2,3,color); // ears
  P(4,7,1,1,'#ff9ed2'); P(12,7,1,1,'#ff9ed2');
  P(5,10,2,2,'#1a0f2e'); P(9,10,2,2,'#1a0f2e'); // eyes
  P(7,12,2,1,'#ff6fae'); // nose
  const t=Math.floor(Date.now()/400)%2; // tail wag
  P(t?13:2,11,2,1,color);
  P(5,14,2,1,'#1a0f2e'); P(9,14,2,1,'#1a0f2e'); // feet (alternate)
  if(frame){ P(5,14,2,1,color); }
}
function drawOrb(g,o){
  // each trial owns its stone: mossy base + colored rune face + glyph + tag
  const meta=TRIALS[o.type]||TRIALS.riddle;
  const y=o.y+Math.sin(o.bob)*4;
  g.fillStyle='rgba(0,0,0,.3)';
  g.fillRect(o.x-13,o.y+15,26,6);
  const p=(Math.sin(Date.now()/350+o.bob)+1)/2;
  g.globalAlpha=0.35+p*0.4; g.fillStyle=meta.color; g.fillRect(o.x-17,y-17,34,34); g.globalAlpha=1;
  // stone body
  g.fillStyle='#5d5d5d'; g.fillRect(o.x-12,y-9,24,24);
  g.fillStyle='#8f8f8f'; g.fillRect(o.x-12,y-9,24,5);
  g.fillStyle='#3e8e3a'; g.fillRect(o.x-12,y+10,24,5); // moss foot
  g.fillStyle='#2b1b4d'; g.fillRect(o.x-9,y-5,18,16);
  // colored rune face
  g.fillStyle=meta.color; g.fillRect(o.x-7,y-3,14,12);
  const cx=o.x, cy=y+3;
  g.textAlign='center';
  if(o.type==='zip'){
    // mini path grid: white track with numbered ends
    g.fillStyle='#2b1b4d'; g.fillRect(cx-5,cy-4,10,8);
    g.fillStyle='#fff'; g.fillRect(cx-5,cy-1,10,2); g.fillRect(cx+1,cy-4,2,8);
    g.fillStyle='#ff6fae'; g.fillRect(cx-5,cy-4,3,3);
    g.fillStyle='#7bff9e'; g.fillRect(cx+2,cy+1,3,3);
  } else if(o.type==='typing'){
    // keyboard rows
    g.fillStyle='#2b1b4d';
    g.fillRect(cx-5,cy-4,10,2); g.fillRect(cx-5,cy-1,10,2); g.fillRect(cx-3,cy+2,6,2);
    g.fillStyle='#fff'; g.fillRect(cx-5,cy-4,2,2); g.fillRect(cx+1,cy-1,2,2);
  } else if(o.type==='simon'){
    // fox-memory 2x2 pads
    g.fillStyle='#ff9ed2'; g.fillRect(cx-5,cy-4,4,4);
    g.fillStyle='#fff3a3'; g.fillRect(cx,cy-4,5,4);
    g.fillStyle='#7bffef'; g.fillRect(cx-5,cy+1,4,4);
    g.fillStyle='#c9b8ff'; g.fillRect(cx,cy+1,5,4);
  } else if(o.type==='scramble'){
    // rune letters
    g.fillStyle='#2b1b4d'; g.font='bold 9px monospace';
    g.fillText('A⇄Z',cx,cy+4);
  } else if(o.type==='catch'){
    // loose braincell
    g.font='11px serif'; g.fillText('🧠',cx,cy+4);
  } else {
    // riddle: classic '?'
    g.fillStyle='#2b1b4d'; g.font='bold 11px monospace';
    g.fillText('?',cx,cy+4);
  }
  // name tag so the map is readable at a glance
  g.font='bold 8px monospace';
  const label=meta.name;
  const w=g.measureText(label).width+8;
  g.fillStyle='#1a0f2e'; g.fillRect(cx-w/2,y-26,w,11);
  g.fillStyle=meta.color; g.fillText(label,cx,y-17);
  const t=Date.now()/400;
  for(let i=0;i<2;i++){ const a=t+i*3.1; g.fillStyle='#fff8d0'; g.fillRect(o.x+Math.cos(a)*20-1, y+Math.sin(a)*20-1,3,3); }
}
function drawExitGate(g,ex,ey){
  // Old Meadow Gate: two mossy stones + oak arch + glowing field portal. Open-world, not town.
  g.fillStyle='rgba(0,0,0,.3)'; g.fillRect(ex-26,ey+18,52,8);
  const p=(Math.sin(Date.now()/400)+1)/2;
  g.fillStyle=`rgba(255,217,61,${0.12+p*0.18})`; g.fillRect(ex-30,ey-30,60,64);
  // stone pillars
  g.fillStyle='#6b6b6b'; g.fillRect(ex-22,ey-14,10,34); g.fillRect(ex+12,ey-14,10,34);
  g.fillStyle='#9a9a9a'; g.fillRect(ex-22,ey-14,10,4); g.fillRect(ex+12,ey-14,10,4);
  g.fillStyle='#4a4a4a'; g.fillRect(ex-22,ey+12,10,8); g.fillRect(ex+12,ey+12,10,8);
  // moss
  g.fillStyle='#3e8e3a'; g.fillRect(ex-22,ey-6,10,4); g.fillRect(ex+12,ey+2,10,4);
  g.fillRect(ex-22,ey+6,4,4); g.fillRect(ex+18,ey-10,4,6);
  // wooden beam across
  g.fillStyle='#6b4423'; g.fillRect(ex-26,ey-22,52,8);
  g.fillStyle='#8a6a3e'; g.fillRect(ex-26,ey-22,52,3);
  // hanging vines
  g.fillStyle='#2d6a4f'; g.fillRect(ex-14,ey-14,4,10); g.fillRect(ex+10,ey-14,4,14);
  g.fillStyle='#74c69d'; g.fillRect(ex-14,ey-8,4,3); g.fillRect(ex+10,ey-6,4,3);
  // portal glow between pillars
  g.fillStyle='#fff8d0'; g.fillRect(ex-10,ey-8,20,28);
  g.fillStyle='#ffd93d'; g.fillRect(ex-8,ey-6,16,24);
  g.fillStyle='#fff'; g.fillRect(ex-4,ey,8,10);
  g.fillStyle='#2b1b4d'; g.font='bold 11px monospace'; g.textAlign='center';
  g.fillStyle='#1d2b1d'; g.fillText('EXIT 出口', ex, ey+34);
}
function drawWoodSign(g,x,y,label){
  g.fillStyle='rgba(0,0,0,.3)'; g.fillRect(x-10,y+8,20,4);
  g.fillStyle='#6b4423'; g.fillRect(x-2,y-8,4,18);
  g.fillStyle='#a67c4a'; g.fillRect(x-14,y-16,28,12);
  g.fillStyle='#6b4423'; g.fillRect(x-14,y-16,28,2); g.fillRect(x-14,y-6,28,2);
  g.fillStyle='#2b1b14'; g.font='bold 8px monospace'; g.textAlign='center';
  g.fillText(label,x,y-7);
}
function drawTrailPost(g,x,y){
  // little farm trail marker with firefly jar
  g.fillStyle='#6b4423'; g.fillRect(x-2,y-10,4,20);
  g.fillStyle='#ffd93d'; g.fillRect(x-5,y-14,10,8);
  g.fillStyle='#fff8d0'; g.fillRect(x-3,y-12,6,4);
  g.fillStyle='#3e8e3a'; g.fillRect(x-5,y-6,10,2);
}
function drawPumpkin(g,x,y,big){
  // guardian jack-o'-lantern for START / GATE — flickers
  const s=big?1.4:1, fl=0.6+0.4*Math.abs(Math.sin(Date.now()/380+x*3+y));
  g.fillStyle='rgba(0,0,0,.3)'; g.fillRect(x-11*s,y+9*s,22*s,5);
  g.fillStyle=`rgba(255,150,40,${0.16*fl})`; g.fillRect(x-15*s,y-13*s,30*s,28*s);
  g.fillStyle='#c96a1e'; g.fillRect(x-10*s,y-8*s,20*s,17*s);
  g.fillStyle='#e8932e'; g.fillRect(x-7*s,y-6*s,6*s,13*s); g.fillRect(x+1*s,y-6*s,6*s,13*s);
  g.fillStyle='#4a2f14'; g.fillRect(x-2*s,y-13*s,4*s,6*s); // stem
  g.fillStyle=`rgba(255,235,130,${0.55+0.45*fl})`;
  g.fillRect(x-7*s,y-4*s,5*s,5*s); g.fillRect(x+2*s,y-4*s,5*s,5*s); // eyes
  g.fillRect(x-7*s,y+3*s,14*s,3*s); g.fillRect(x-4*s,y+6*s,8*s,2*s); // grin
}

function render(){
  // resize handling
  const r=canvas.getBoundingClientRect();
  const W=Math.max(320,Math.floor(r.width)), H=640;
  if(canvas.width!==W){canvas.width=W;canvas.height=H;}
  ctx.fillStyle='#3d6b3f'; ctx.fillRect(0,0,canvas.width,canvas.height); // night grass base
  const warmLights=[]; // {x,y,r,color} — every flame that pushes back the dark
  const nowT=Date.now();
  const x0=Math.max(0,Math.floor(cam.x/TILE)-1), y0=Math.max(0,Math.floor(cam.y/TILE)-1);
  const x1=Math.min(COLS-1,Math.ceil((cam.x+canvas.width)/TILE)+1), y1=Math.min(ROWS-1,Math.ceil((cam.y+canvas.height)/TILE)+1);
  for(let ty=y0;ty<=y1;ty++) for(let tx=x0;tx<=x1;tx++){
    const sx=Math.floor(tx*TILE-cam.x), sy=Math.floor(ty*TILE-cam.y);
    if(maze[ty][tx]===1){
      drawFloorTile(ctx,sx,sy,tx,ty);
      // field jack-o'-lanterns double as light sources (same hash as the art)
      if(hash2(tx*5+1,ty*5+3)>0.94) warmLights.push({x:sx+34,y:sy+30,r:100+14*Math.sin(nowT/380+tx*2+ty),color:'255,154,61'});
    }
    else drawWallTile(ctx,sx,sy,tx,ty);
  }
  // start meadow camp
  const ssx=Math.floor(1*TILE-cam.x), ssy=Math.floor(1*TILE-cam.y);
  ctx.fillStyle='rgba(150,115,70,.9)'; ctx.fillRect(ssx+4,ssy+28,TILE-8,16);
  ctx.fillStyle='#6b4e2c'; for(let i=0;i<5;i++) ctx.fillRect(ssx+6+i*8,ssy+30,4,12);
  drawWoodSign(ctx, ssx+TILE/2, ssy+16, 'START');
  // exit — old meadow gate
  const exS=Math.floor((COLS-2)*TILE+TILE/2-cam.x), eyS=Math.floor((ROWS-2)*TILE+TILE/2-cam.y);
  drawExitGate(ctx, exS, eyS);
  warmLights.push({x:exS,y:eyS,r:130+10*Math.sin(nowT/500),color:'255,217,61'}); // portal glow
  // trial stones (type passes through so each draws its own look)
  for(const o of orbs){
    if(o.done) continue;
    drawOrb(ctx,{x:o.x-cam.x,y:o.y-cam.y,bob:o.bob,type:o.type});
    const mc=(TRIALS[o.type]||TRIALS.riddle).color;
    const rgb=parseInt(mc.slice(1,3),16)+','+parseInt(mc.slice(3,5),16)+','+parseInt(mc.slice(5,7),16);
    warmLights.push({x:o.x-cam.x,y:o.y-cam.y,r:64,color:rgb});
  }
  // cats
  for(const c of cats) drawCat(ctx, c.x-cam.x, c.y-cam.y, c.color);
  // trail posts near start + exit
  drawTrailPost(ctx, ssx+TILE-8, ssy+TILE-10);
  drawTrailPost(ctx, exS+30, eyS+10);
  // halloween: guardian pumpkins at START and flanking the GATE
  drawPumpkin(ctx, ssx+8, ssy+30, false);
  drawPumpkin(ctx, exS-30, eyS+12, true);
  drawPumpkin(ctx, exS+30, eyS+14, false);
  warmLights.push({x:ssx+8,y:ssy+30,r:95,color:'255,154,61'});
  warmLights.push({x:exS-30,y:eyS+12,r:120,color:'255,154,61'});
  warmLights.push({x:exS+30,y:eyS+14,r:95,color:'255,154,61'});
  // player
  const plx=player.x-cam.x, ply=player.y-cam.y;
  drawWitch(ctx, plx, ply, player.dir, player.anim, player.moving);
  // particles
  for(const p of particles){ ctx.fillStyle=p.color; ctx.fillRect(p.x-cam.x-2,p.y-cam.y-2,4,4); }
  // ---- NIGHTFALL: darkness mask with light holes, then warm tint glows ----
  if(lightCv.width!==canvas.width||lightCv.height!==canvas.height){ lightCv.width=canvas.width; lightCv.height=canvas.height; }
  lctx.globalCompositeOperation='source-over';
  lctx.clearRect(0,0,lightCv.width,lightCv.height);
  lctx.fillStyle='rgba(10,5,26,0.66)'; // halloween night
  lctx.fillRect(0,0,lightCv.width,lightCv.height);
  lctx.globalCompositeOperation='destination-out'; // punch holes
  const hole=(x,y,r,a)=>{
    if(x<-r||y<-r||x>lightCv.width+r||y>lightCv.height+r) return;
    const gr=lctx.createRadialGradient(x,y,0,x,y,r);
    gr.addColorStop(0,`rgba(255,255,255,${a})`); gr.addColorStop(1,'rgba(255,255,255,0)');
    lctx.fillStyle=gr; lctx.beginPath(); lctx.arc(x,y,r,0,7); lctx.fill();
  };
  hole(plx,ply,175,0.95); // Mowzkitow's lantern-light
  for(const L of warmLights) hole(L.x,L.y,L.r,0.9);
  ctx.drawImage(lightCv,0,0);
  // warm color wash so lantern light feels orange, stones glow their color
  ctx.globalCompositeOperation='lighter';
  for(const L of warmLights){
    if(L.x<-L.r||L.y<-L.r||L.x>canvas.width+L.r||L.y>canvas.height+L.r) continue;
    const gr=ctx.createRadialGradient(L.x,L.y,0,L.x,L.y,L.r);
    gr.addColorStop(0,`rgba(${L.color},0.20)`); gr.addColorStop(1,`rgba(${L.color},0)`);
    ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(L.x,L.y,L.r,0,7); ctx.fill();
  }
  ctx.globalCompositeOperation='source-over';
  // vignette text
  if(!gameStarted) return;
  ctx.fillStyle='rgba(26,15,46,.85)'; ctx.fillRect(8,8,250,26);
  ctx.fillStyle='#ffd93d'; ctx.font='12px monospace'; ctx.textAlign='left';
  ctx.fillText(`🧠 x${braincells}  ✨ ${challengesDone}/${orbs.length}  ⏱ ${fmtTime(elapsed)}`,14,25);
}
function drawMinimap(){
  const w=minimap.width=220, h=minimap.height=220;
  mctx.fillStyle='#1a0f2e'; mctx.fillRect(0,0,w,h);
  const sx=w/COLS, sy=h/ROWS;
  for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){
    mctx.fillStyle=maze[y][x]===1?'#3f7a3a':'#101f18'; // night-tinted minimap
    mctx.fillRect(x*sx,y*sy,Math.ceil(sx),Math.ceil(sy));
  }
  for(const o of orbs){ if(o.done) continue; mctx.fillStyle=(TRIALS[o.type]||TRIALS.riddle).color; mctx.fillRect(o.tx*sx-1,o.ty*sy-1,4,4); }
  mctx.fillStyle='#fff8d0'; mctx.fillRect((COLS-2)*sx-1,(ROWS-2)*sy-1,5,5);
  mctx.fillStyle='#ffffff'; mctx.fillRect(Math.floor(player.x/TILE)*sx-1,Math.floor(player.y/TILE)*sy-1,4,4);
}
function spawnHearts(x,y,n){
  const cols=['#ff6fae','#ff0f7b','#ffd93d','#7bffef','#fff'];
  for(let i=0;i<n;i++) particles.push({x,y,vx:(Math.random()-0.5)*90,vy:-40-Math.random()*80,life:1+Math.random(),color:cols[i%cols.length]});
}
function log(msg){
  const el=document.getElementById('log');
  const d=document.createElement('div'); d.textContent='> '+msg; el.prepend(d);
}
function fmtTime(s){ s=Math.floor(s); const m=Math.floor(s/60); return `${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }

// ---- CHALLENGES ----
const modal=document.getElementById('challenge-modal');
const cTitle=document.getElementById('c-title'), cJp=document.getElementById('c-jp'), cBody=document.getElementById('c-body');
let currentOrb=null;
const zipSentences=[
  'Mowzkitow swears this maze is easy and immediately walks into a wall.',
  'The local vampire witch has one braincell and it is on vacation.',
  'Cats run the field gift shop and charge three naps per map.',
  'A wild trial stone appears! Mowzkitow pokes it with a stick.'
];
const riddles=[
  {q:'I am always hungry and must always be fed. The finger I touch soon turns red. What am I?', opts:['Fire','Cat','Water','Mushroom'], a:0},
  {q:'Mowzkitow has 1 braincell. She trades half of it for a snack, then finds 2 more in the grass. How many now?', opts:['2.5','3','1','0 — a crow took them'], a:1},
  {q:'What runs through the fields but never walks, has a mouth but never talks?', opts:['A river','A vampire','A broom','A zip path'], a:0},
  {q:'Which is heavier: 1kg of strawberries or 1kg of feathers?', opts:['Same, obviously','Strawberries','Feathers','The maze'], a:0},
  {q:'If 3 cats nap for 3 hours in 3 sunny spots, how long does 1 cat nap in 1 spot?', opts:['3 hours','1 hour','9 hours','Until dinner'], a:0},
  {q:'What number comes next: 1, 1, 2, 3, 5, 8, ...?', opts:['13','12','9','Potato'], a:0},
];
const STONE_LABEL={zip:'ZIP PATH',typing:'TYPING',simon:'FOX MEMORY',riddle:'RIDDLE',scramble:'RUNE SCRAMBLE',catch:'CATCH!'};
function triggerChallenge(orb){
  if(paused) return;
  for (const k in keys) keys[k]=false; // don't drift while modal is open
  currentOrb=orb; paused=true; sfx('hit');
  // each stone owns its trial — the look tells you what's inside
  const type = (orb.type && TRIALS[orb.type]) ? orb.type : TRIAL_KEYS[challengesDone % TRIAL_KEYS.length];
  showChallenge(type);
  toast(`🪨 ${STONE_LABEL[type]||type} stone! がんばれ!`);
}
function showChallenge(type){
  modal.classList.remove('hidden');
  cBody.innerHTML='';
  if(type==='zip') zipChallenge();
  else if(type==='typing') typingChallenge();
  else if(type==='simon') simonChallenge();
  else if(type==='scramble') scrambleChallenge();
  else if(type==='catch') catchChallenge();
  else riddleChallenge();
  document.getElementById('hud-task').textContent=`CHALLENGE: ${type.toUpperCase()}!`;
}
// judgment cat: appears on EVERY puzzle fail, vanishes 1s later. Never blocks input.
let judgeTimer=null;
function flashJudgeCat(){
  const el=document.getElementById('judge-flash');
  if(!el) return;
  el.classList.remove('hidden');
  el.style.animation='none'; void el.offsetWidth; el.style.animation=''; // replay pop
  clearTimeout(judgeTimer);
  judgeTimer=setTimeout(()=>el.classList.add('hidden'),1000);
}
function hideJudgeCat(){ clearTimeout(judgeTimer); const el=document.getElementById('judge-flash'); if(el) el.classList.add('hidden'); }
(function judgeImgFallback(){
  const img=document.getElementById('judge-img');
  if(!img) return;
  img.onerror=()=>{
    if(!img.dataset.triedJpg){ img.dataset.triedJpg='1'; img.src='judge-cat.jpg'; }
    else { img.style.display='none'; const f=document.getElementById('judge-fallback'); if(f) f.style.display='block'; }
  };
})();
function closeChallenge(success){
  modal.classList.add('hidden');
  hideJudgeCat();
  paused=false;
  document.getElementById('hud-task').textContent='Find the Meadow Gate at the far end! 出口を探せ!';
  if(success && currentOrb){
    currentOrb.done=true; braincells++; challengesDone++;
    document.getElementById('hud-brain').textContent=braincells;
    document.getElementById('hud-done').textContent=`${challengesDone}/${orbs.length}`;
    sfx('solve'); spawnHearts(player.x,player.y,16);
    log(`Challenge cleared! Braincell +1 (total ${braincells}) にゃー!`);
    toast('🧠 BRAINCELL GET! にゃーん! +1');
  }
  currentOrb=null;
}
// --- ZIP (LinkedIn-style, harder) ---
function zipChallenge(){
  cTitle.textContent='BRAINCELL TRIAL: ZIP PATH';
  cJp.textContent='ジップ パズル • 数字をつなげ!';
  const info=document.createElement('div');
  info.innerHTML=`<p><b>How to play (English):</b> Drag from <b>1</b> to fill <b>every square</b> with one continuous path. You must pass the numbers <b>1-6 in order</b>. No diagonals, no revisiting. The solution path winds — dead-ends mean back up and re-route! 🧠🐈</p><p style="background:#2b1b4d;color:#ff9ed2;padding:6px 8px">You seemed to like these so here u gooo &lt;3</p>`;
  cBody.appendChild(info);
  const SIZE=6, total=SIZE*SIZE;
  // Build a HARD guaranteed-solvable puzzle: start from a snake Hamiltonian
  // path, then scramble it with ~120 "backbite" rewirings. Result still covers
  // every square exactly once, but winds unpredictably — no more easy snake.
  let path=[]; for(let r=0;r<SIZE;r++){ if(r%2===0) for(let c=0;c<SIZE;c++) path.push(r*SIZE+c); else for(let c=SIZE-1;c>=0;c--) path.push(r*SIZE+c); }
  const nbs=i=>{ const r=Math.floor(i/SIZE), c=i%SIZE, o=[];
    if(r>0)o.push(i-SIZE); if(r<SIZE-1)o.push(i+SIZE); if(c>0)o.push(i-1); if(c<SIZE-1)o.push(i+1); return o; };
  for(let it=0;it<140;it++){
    if(Math.random()<0.5) path=[...path].reverse(); // randomize from both ends
    const end=path[path.length-1];
    const cands=nbs(end).filter(n=>n!==path[path.length-2] && path.includes(n));
    if(!cands.length) continue;
    const join=cands[Math.floor(Math.random()*cands.length)];
    const k=path.indexOf(join);
    path=[...path.slice(0,k+1), ...path.slice(k+1).reverse()];
  }
  const numCount=6; // more checkpoints = tighter constraints
  const spots=[0];
  let last=0;
  // irregular gaps force real route planning, not just wall-following
  for(let n=1;n<numCount-1;n++){ last+= 5+Math.floor(Math.random()*4); if(last>=total-2) last=total-3; spots.push(last); }
  spots.push(total-1);
  const numAt={}; spots.forEach((idx,i)=>numAt[path[idx]]=i+1);
  const grid=document.createElement('div'); grid.id='zip-grid';
  grid.style.gridTemplateColumns=`repeat(${SIZE},1fr)`;
  grid.style.maxWidth='420px';
  const cells=[];
  for(let i=0;i<total;i++){
    const d=document.createElement('div'); d.className='zip-cell'+(numAt[i]?' num':'');
    if(numAt[i]) d.textContent=numAt[i];
    d.dataset.i=i; cells.push(d); grid.appendChild(d);
  }
  cBody.appendChild(grid);
  const msg=document.createElement('p'); cBody.appendChild(msg);
  const btnRow=document.createElement('div');
  const reset=document.createElement('button'); reset.className='btn alt'; reset.textContent='RESET ↺';
  const give=document.createElement('button'); give.className='btn pink'; give.textContent='GIVE UP (retry later)';
  give.style.marginLeft='8px';
  btnRow.appendChild(reset); btnRow.appendChild(give); cBody.appendChild(btnRow);
  let cur=[]; let drawing=false;
  const rc=i=>({r:Math.floor(i/SIZE),c:i%SIZE});
  const adj=(a,b)=>{const A=rc(a),B=rc(b);return Math.abs(A.r-B.r)+Math.abs(A.c-B.c)===1;};
  function paint(){
    cells.forEach((d,i)=>{ d.classList.remove('path','active-head','path-num-ok'); if(!d.classList.contains('num')) d.textContent=''; });
    cur.forEach((idx,k)=>{ const d=cells[idx]; d.classList.add('path'); if(numAt[idx]) d.classList.add('path-num-ok'); if(k===cur.length-1) d.classList.add('active-head'); });
  }
  function validOrder(){
    let expect=1;
    for(const idx of cur){ if(numAt[idx]){ if(numAt[idx]!==expect) return false; expect++; } }
    // also cannot skip: if we passed 3 without 2 -> caught above; check we don't jump over unseen lower number... above covers
    return true;
  }
  function checkWin(){
    if(cur.length!==total) return false;
    let expect=1;
    for(const idx of cur){ if(numAt[idx]){ if(numAt[idx]!==expect) return false; expect++; } }
    return expect===numCount+1;
  }
  function startAt(i, ev){
    if(numAt[i]!==1){ msg.textContent='Start from 1! 1からスタート!'; return; }
    drawing=true; cur=[i]; paint(); if(ev)ev.preventDefault();
  }
  function moveTo(i){
    if(!drawing) return;
    if(cur.includes(i)){
      // backtrack
      const pos=cur.indexOf(i);
      if(pos===cur.length-2){ cur.pop(); paint(); }
      return;
    }
    if(!adj(cur[cur.length-1],i)) return;
    cur.push(i); paint();
    if(!validOrder()){ msg.textContent='Numbers must be in order! 順番通り!'; flashJudgeCat(); }
    else msg.textContent=`Path: ${cur.length}/${total}`;
    if(checkWin()){ sfx('win'); closeChallenge(true); }
  }
  cells.forEach(d=>{
    const i=+d.dataset.i;
    d.addEventListener('pointerdown',e=>{d.setPointerCapture&&e.pointerId!==undefined&&tryCapture(d,e);startAt(i,e);});
    d.addEventListener('pointerenter',e=>{ if(e.buttons>0) moveTo(i); });
    d.addEventListener('pointerover',()=>{ if(drawing) moveTo(i); });
  });
  function tryCapture(d,e){ try{d.setPointerCapture(e.pointerId);}catch(_){} }
  grid.addEventListener('pointermove',e=>{
    if(!drawing) return;
    const el=document.elementFromPoint(e.clientX,e.clientY);
    if(el&&el.classList&&el.classList.contains('zip-cell')) moveTo(+el.dataset.i);
  });
  window.addEventListener('pointerup',()=>{drawing=false;},{once:false});
  reset.onclick=()=>{cur=[];drawing=false;paint();msg.textContent='Reset! Try again!';};
  give.onclick=()=>{ modal.classList.add('hidden'); paused=false; currentOrb=null; log('Zip skipped — orb still waits for you...'); };
}
// --- TYPING ---
function typingChallenge(){
  cTitle.textContent='BRAINCELL TRIAL: NEKO TYPING';
  cJp.textContent='タイピング テスト • 猫の速さで!';
  const target=zipSentences[Math.floor(Math.random()*zipSentences.length)];
  const info=document.createElement('p');
  info.innerHTML=`<b>How to play (English):</b> Type the sentence <b>exactly</b> within <b>40 seconds</b>. Caps and punctuation matter. Go, speedy fingers! ⌨️🐾<br>We still gotta work on the typing 💜`;
  cBody.appendChild(info);
  const tdiv=document.createElement('div'); tdiv.id='typing-target';
  target.split('').forEach(ch=>{const s=document.createElement('span');s.textContent=ch;s.className='todo';tdiv.appendChild(s);});
  cBody.appendChild(tdiv);
  const area=document.createElement('textarea'); area.id='typing-area'; area.placeholder='Start typing here...'; cBody.appendChild(area);
  const stat=document.createElement('p'); stat.textContent='Time left: 40s'; cBody.appendChild(stat);
  const quit=document.createElement('button'); quit.className='btn pink'; quit.textContent='GIVE UP'; cBody.appendChild(quit);
  quit.onclick=()=>{clearInterval(iv);modal.classList.add('hidden');paused=false;currentOrb=null;};
  let left=40;
  const iv=setInterval(()=>{
    if(modal.classList.contains('hidden')){clearInterval(iv);return;}
    left-=0.25; stat.textContent=`Time left: ${Math.max(0,left).toFixed(1)}s`;
    if(left<=0){clearInterval(iv);stat.textContent='Too slow! The cats are laughing! Try again — orb still there.';flashJudgeCat();area.disabled=true;setTimeout(()=>{modal.classList.add('hidden');paused=false;currentOrb=null;},1200);}
  },250);
  area.addEventListener('input',()=>{
    const v=area.value;
    const spans=tdiv.querySelectorAll('span');
    spans.forEach((s,i)=>{ s.className = i<v.length ? (v[i]===target[i]?'done':'current') : (i===v.length?'current':'todo'); if(i<v.length&&v[i]!==target[i]) s.style.background='#ff0f3b'; else s.style.background=''; });
    if(v===target){clearInterval(iv);sfx('win');closeChallenge(true);}
    else if(v.length>=target.length || (v.length>0 && !target.startsWith(v.slice(0,Math.min(v.length, target.length)) ) && v!==target.slice(0,v.length))){
      // mark errors but allow backspace; check prefix
      if(target.slice(0,v.length)!==v){ stat.textContent='Oops! Typo! Fix it with backspace! 間違い!'; flashJudgeCat(); }
    }
  });
  setTimeout(()=>area.focus(),100);
}
// --- SIMON / MEMORY ---
function simonChallenge(){
  cTitle.textContent='BRAINCELL TRIAL: KITSUNE MEMORY';
  cJp.textContent='きつね メモリー • 覚えて!';
  const info=document.createElement('p');
  info.innerHTML=`<b>How to play (English):</b> Watch the glowing sequence, then repeat the <b>whole thing</b> by clicking. It grows one note per round until <b>6 notes</b>. A mistake replays the same round — no full reset! 🦊✨`;
  cBody.appendChild(info);
  const icons=[['🐈','#ffd6e8'],['💖','#ffc2dd'],['⭐','#fff3a3'],['🌙','#c9b8ff']];
  const LEN=6;
  const seq=Array.from({length:LEN},()=>Math.floor(Math.random()*4));
  const grid=document.createElement('div'); grid.className='simon-grid'; cBody.appendChild(grid);
  const stat=document.createElement('p'); cBody.appendChild(stat);
  const row=document.createElement('div'); row.style.display='flex'; row.style.gap='8px';
  const replay=document.createElement('button'); replay.className='btn alt'; replay.textContent='↻ REPLAY';
  const quit=document.createElement('button'); quit.className='btn pink'; quit.textContent='GIVE UP';
  row.appendChild(replay); row.appendChild(quit); cBody.appendChild(row);
  const btns=icons.map(([em,bg],i)=>{
    const b=document.createElement('div'); b.className='simon-btn'; b.textContent=em; b.style.background=bg; grid.appendChild(b);
    b.onclick=()=>{ if(!acceptInput) return; flash(i,200); press(i); };
    return b;
  });
  let acceptInput=false, level=1, inputPos=0, showId=0, closed=false;
  quit.onclick=()=>{ closed=true; showId++; modal.classList.add('hidden'); paused=false; currentOrb=null; };
  replay.onclick=()=>{ if(closed) return; showId++; show(); };
  function setLocked(locked){
    acceptInput=!locked;
    grid.style.opacity=locked?'0.55':'1';
    grid.style.pointerEvents=locked?'none':'auto';
    replay.disabled=locked;
  }
  function flash(i,ms){
    btns[i].classList.add('lit'); playNote([523,659,784,880][i],0.25,'square',0.08);
    setTimeout(()=>btns[i].classList.remove('lit'),ms);
  }
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  async function show(){
    const my=++showId;
    setLocked(true); inputPos=0;
    stat.textContent=`Round ${level}/${LEN} — watch... 見て!`;
    await wait(900);
    // slow demo: each note glows ~550ms with a clear ~300ms gap
    for(let k=0;k<level;k++){
      if(closed || my!==showId) return;
      flash(seq[k],550);
      await wait(850);
    }
    if(closed || my!==showId) return;
    setLocked(false);
    stat.textContent=`Your turn: repeat all ${level} note${level>1?'s':''}! (0/${level}) 真似して!`;
  }
  function press(i){
    if(i===seq[inputPos]){
      inputPos++;
      if(inputPos>=level){
        if(level>=LEN){ sfx('win'); closeChallenge(true); return; }
        level++; inputPos=0;
        setLocked(true);
        stat.textContent='Nice! Adding one more... すごい!';
        const my=++showId;
        setTimeout(()=>{ if(!closed && my===showId) show(); },900);
      } else {
        stat.textContent=`Your turn: repeat all ${level} notes! (${inputPos}/${level})`;
      }
    } else {
      sfx('hit'); flashJudgeCat();
      setLocked(true);
      stat.textContent='Oops — watch again, same round! もう一度見て!';
      const my=++showId;
      setTimeout(()=>{ if(!closed && my===showId) show(); },900);
    }
  }
  show();
}
// --- RIDDLE ---
function riddleChallenge(){
  cTitle.textContent='BRAINCELL TRIAL: FIELD RIDDLE';
  cJp.textContent='なぞなぞ • 頭を使え!';
  const r=riddles[Math.floor(Math.random()*riddles.length)];
  const info=document.createElement('p'); info.innerHTML=`<b>How to play (English):</b> Answer the riddle. A wrong answer just gets laughed at by a crow. Try again! 🐦`;
  cBody.appendChild(info);
  const q=document.createElement('h3'); q.textContent='❓ '+r.q; cBody.appendChild(q);
  r.opts.forEach((o,i)=>{
    const b=document.createElement('button'); b.className='riddle-opt'; b.textContent=`${'ABCD'[i]}. ${o}`;
    b.onclick=()=>{ if(i===r.a){ sfx('win'); closeChallenge(true);} else { sfx('hit'); flashJudgeCat(); b.style.background='#ff9aa8'; b.textContent+=' ✘ nope!'; } };
    cBody.appendChild(b);
  });
  const quit=document.createElement('button'); quit.className='btn pink'; quit.textContent='GIVE UP'; quit.style.marginTop='8px'; cBody.appendChild(quit);
  quit.onclick=()=>{modal.classList.add('hidden');paused=false;currentOrb=null;};
}
// --- WORD SCRAMBLE (new) ---
const scrambleWords=[
  {w:'VAMPIRE', hint:'Cape enthusiast, avoids garlic bread'},
  {w:'WITCH', hint:'Broom pilot'},
  {w:'FOREST', hint:'Lots of trees, easy to get lost in'},
  {w:'MEADOW', hint:'This field you are standing in'},
  {w:'BRAINS', hint:'Mowzkitow is collecting these (singular)'},
  {w:'LANTERN', hint:'Glowy jar on a post'},
  {w:'PORTAL', hint:'The shiny EXIT thing'},
  {w:'KITSUNE', hint:'Fox with extra tails and opinions'},
];
function scrambleChallenge(){
  cTitle.textContent='BRAINCELL TRIAL: RUNE SCRAMBLE';
  cJp.textContent='文字パズル • ならべかえ!';
  const pick=scrambleWords[Math.floor(Math.random()*scrambleWords.length)];
  const sh=pick.w.split('').sort(()=>Math.random()-0.5);
  if(sh.join('')===pick.w){ const t=sh.pop(); sh.unshift(t); }
  const info=document.createElement('p');
  info.innerHTML=`<b>How to play (English):</b> Unscramble the magic runes. Hint: <i>${pick.hint}</i>. Type the answer and hit CAST! 🔮`;
  cBody.appendChild(info);
  const big=document.createElement('div');
  big.style.cssText='font-family:monospace;font-size:34px;letter-spacing:8px;background:#2b1b4d;color:#ffd93d;padding:12px;text-align:center;border:3px solid #ffd93d;margin:8px 0';
  big.textContent=sh.join(' ');
  cBody.appendChild(big);
  const row=document.createElement('div'); row.style.display='flex'; row.style.gap='8px';
  const inp=document.createElement('input');
  inp.placeholder='Your answer...'; inp.maxLength=12;
  inp.style.cssText='flex:1;font-size:18px;padding:10px;border:3px solid #2b1b4d;text-transform:uppercase';
  const go=document.createElement('button'); go.className='btn'; go.textContent='CAST ✨';
  row.appendChild(inp); row.appendChild(go); cBody.appendChild(row);
  const msg=document.createElement('p'); cBody.appendChild(msg);
  const quit=document.createElement('button'); quit.className='btn pink'; quit.textContent='GIVE UP'; quit.style.marginTop='8px'; cBody.appendChild(quit);
  quit.onclick=()=>{modal.classList.add('hidden');paused=false;currentOrb=null;};
  function check(){
    if(inp.value.trim().toUpperCase()===pick.w){ sfx('win'); closeChallenge(true); }
    else { sfx('hit'); flashJudgeCat(); msg.textContent=`Nope! "${inp.value.trim().toUpperCase()||'…'}" fizzles. The runes giggle. Try again!`; }
  }
  go.onclick=check;
  inp.addEventListener('keydown',e=>{ if(e.key==='Enter') check(); e.stopPropagation(); });
  setTimeout(()=>inp.focus(),100);
}
// --- CATCH THE BRAINCELL (new, action) ---
function catchChallenge(){
  cTitle.textContent='BRAINCELL TRIAL: CATCH IT!';
  cJp.textContent='つかまえろ • ダッシュ!';
  const info=document.createElement('p');
  info.innerHTML=`<b>How to play (English):</b> A wild braincell is loose! Click it <b>8 times in 15 seconds</b> before it escapes. It teleports. It mocks you. 🧠💨`;
  cBody.appendChild(info);
  const stat=document.createElement('p'); stat.textContent='Caught: 0/8 • 15.0s'; cBody.appendChild(stat);
  const arena=document.createElement('div');
  arena.style.cssText='position:relative;height:260px;background:#1a0f2e;border:4px solid #2b1b4d;overflow:hidden;cursor:crosshair';
  cBody.appendChild(arena);
  const prey=document.createElement('button');
  prey.textContent='🧠'; prey.style.cssText='position:absolute;font-size:30px;background:#ffd93d;border:3px solid #2b1b4d;width:52px;height:52px;cursor:pointer;padding:0';
  arena.appendChild(prey);
  const quit=document.createElement('button'); quit.className='btn pink'; quit.textContent='GIVE UP'; quit.style.marginTop='8px'; cBody.appendChild(quit);
  let caught=0, left=15, over=false;
  function hop(){
    if(over) return;
    prey.style.left=Math.random()*(arena.clientWidth-56)+'px';
    prey.style.top=Math.random()*(arena.clientHeight-56)+'px';
  }
  prey.onclick=(e)=>{ e.stopPropagation(); if(over) return; caught++; sfx('pickup'); stat.textContent=`Caught: ${caught}/8 • ${left.toFixed(1)}s`; hop(); if(caught>=8){ over=true; clearInterval(iv); sfx('win'); closeChallenge(true); } };
  hop();
  const iv=setInterval(()=>{
    if(modal.classList.contains('hidden')){ clearInterval(iv); return; }
    left-=0.25;
    stat.textContent=`Caught: ${caught}/8 • ${Math.max(0,left).toFixed(1)}s`;
    if(Math.random()<0.35) hop();
    if(left<=0 && !over){ over=true; clearInterval(iv); stat.textContent=`It escaped with ${caught}/8! The stone keeps waiting...`; flashJudgeCat(); setTimeout(()=>{ if(!modal.classList.contains('hidden')){ modal.classList.add('hidden'); paused=false; currentOrb=null; } },1200); }
  },250);
  quit.onclick=()=>{ clearInterval(iv); modal.classList.add('hidden'); paused=false; currentOrb=null; };
}

// ---- WIN ----
function win(){
  if(gameWon) return; gameWon=true; paused=true; timerOn=false; hideJudgeCat();
  sfx('win'); setTimeout(()=>sfx('win'),400);
  document.getElementById('final-time').textContent=fmtTime(elapsed);
  document.getElementById('final-brain').textContent=braincells;
  document.getElementById('final-done').textContent=`${challengesDone}/${orbs.length}`;
  const v=document.getElementById('victory');
  v.classList.remove('hidden');
  // confetti spam
  const layer=document.getElementById('confetti-layer'); layer.innerHTML='';
  const emojis=['💖','💕','💗','🐈','🐱','🍰','🍓','✨','🌸','👑','🎉','🧠'];
  for(let i=0;i<90;i++){
    const s=document.createElement('span'); s.className='confetti';
    s.textContent=emojis[Math.floor(Math.random()*emojis.length)];
    s.style.left=Math.random()*100+'%'; s.style.top=(-10-Math.random()*40)+'%';
    s.style.animationDuration=(2+Math.random()*4)+'s'; s.style.animationDelay=(Math.random()*3)+'s';
    s.style.fontSize=(14+Math.random()*28)+'px';
    layer.appendChild(s);
  }
  log('ESCAPED! 脱出成功!');
}

// ---- FLOW ----
function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.style.display='block'; clearTimeout(t._h); t._h=setTimeout(()=>t.style.display='none',2200); }
function restart(){
  genMaze();
  player.x=1*TILE+TILE/2; player.y=1*TILE+TILE/2; player.dir='down';
  braincells=0; challengesDone=0; particles=[]; gameWon=false; paused=false;
  document.getElementById('hud-brain').textContent='0';
  document.getElementById('hud-done').textContent=`0/${orbs.length}`;
  document.getElementById('victory').classList.add('hidden');
  startTime=Date.now(); timerOn=true;
  log(`The fields re-grew into a new ${COLS}x${ROWS} maze. Good luck out there!`);
  toast('🌾 The fields shifted! New maze grown!');
  drawMinimap();
}
document.getElementById('btn-restart').onclick=()=>{restart();};
document.getElementById('btn-restart2').onclick=()=>{restart();};
document.getElementById('btn-again').onclick=()=>{restart();};
document.getElementById('btn-music').onclick=(e)=>{ musicOn=!musicOn; e.target.textContent=musicOn?'🎵 MUSIC: ON':'🎵 MUSIC: OFF'; initAudio(); if(audioCtx&&audioCtx.state==='suspended') audioCtx.resume(); };
document.getElementById('btn-help').onclick=()=>{ document.getElementById('start-overlay').classList.remove('hidden'); paused=true; };
document.getElementById('btn-start').onclick=()=>{
  initAudio(); if(audioCtx&&audioCtx.state==='suspended') audioCtx.resume();
  startMusic();
  document.getElementById('start-overlay').classList.add('hidden');
  if(!gameStarted){ gameStarted=true; startTime=Date.now(); timerOn=true; }
  paused=false;
  // draw witch preview
  drawPreview();
  log('Adventure start! Head for the old Meadow Gate, far corner of the fields!');
};
function drawPreview(){
  const c=document.getElementById('witch-preview'); const g=c.getContext('2d'); g.imageSmoothingEnabled=false;
  c.width=48; c.height=48; g.fillStyle='#ffd6e8'; g.fillRect(0,0,48,48);
  // reuse drawWitch with temp transform: draw at center
  const old=ctx; // draw manually small
  const s=3, ox=0, oy=2;
  const P=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(ox+x*s,oy+y*s,w*s,h*s);};
  P(3,6,10,8,'#1d1030'); P(5,6,6,5,'#ffe3ec'); P(4,5,8,2,'#1d1030');
  P(5,8,2,2,'#ff0f3b'); P(9,8,2,2,'#ff0f3b'); P(7,10,1,1,'#fff'); P(8,10,1,1,'#fff');
  P(3,1,10,2,'#241433'); P(4,0,8,1,'#241433'); P(4,2,8,1,'#7b2ff7'); P(7,2,2,1,'#ffd93d');
  P(4,11,8,4,'#241433'); P(2,11,2,4,'#c1123b'); P(12,11,2,4,'#c1123b');
}

// halloween drift bg: petals + bats + ghosts + pumpkins
(function petals(){
  const layer=document.getElementById('sakura-fall');
  const set=['🌸','🎃','🦇','👻','💜','✨','🍬'];
  for(let i=0;i<26;i++){ const s=document.createElement('span'); s.className='petal'; s.textContent=set[i%set.length]; s.style.left=Math.random()*100+'%'; s.style.animationDuration=(5+Math.random()*7)+'s'; s.style.animationDelay=(Math.random()*7)+'s'; layer.appendChild(s); }
})();

genMaze();
drawMinimap();
paused=true; // wait for start
let last=performance.now();
function loop(t){
  const dt=Math.min(0.05,(t-last)/1000); last=t;
  update(dt); render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
})();
