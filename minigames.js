// minigames.js — all trial / fight / boss games. Each calls done(win:boolean) exactly once.
// Requires from game.js: openModal(title,jp)->body, closeModal(), sfx, playNote, noteFreq, setMusicMode.
function _onKey(fn){ const h=e=>fn(e); window.addEventListener('keydown',h); return ()=>window.removeEventListener('keydown',h); }
function _once(done){ let d=false; return v=>{ if(d) return; d=true; try{done(v);}catch(e){console.error(e);} }; }
function _btn(label, cls){ const b=document.createElement('button'); b.className='btn '+(cls||''); b.textContent=label; return b; }
function _quitRow(onQuit){
  const row=document.createElement('div'); row.style.marginTop='10px';
  const q=_btn('GIVE UP','pink'); q.onclick=onQuit; row.appendChild(q); return row;
}
// ---------- DRINKING GAME: spam SPACE (no key-repeat!) or click to chug milk ----------
function drinkGame(done, opts){
  done=_once(done);
  opts=opts||{};
  const TARGET=opts.target||50, TIME=opts.time||12;
  const rivalName=opts.rival||'Veteran Kitty';
  const body=openModal('MILK CHUG SHOWDOWN','のみくらべ • のめ!');
  const info=document.createElement('p');
  info.innerHTML=`<b>How to play (English):</b> Out-drink <b>${rivalName}</b>! Mash <b>SPACEBAR</b> (or click the bowl) to chug. First to <b>${TARGET} gulps</b> in ${TIME}s wins. Holding space doesn't count — real mashing only! 🥛🐈`;
  body.appendChild(info);
  const mkRow=(name,color)=>{
    const w=document.createElement('div'); w.style.margin='8px 0';
    w.innerHTML=`<b>${name}</b> <span></span>`;
    const bar=document.createElement('div'); bar.style.cssText='background:#1a0f2e;border:3px solid #2b1b4d;height:26px';
    const fill=document.createElement('div'); fill.style.cssText=`background:${color};height:100%;width:0%`;
    bar.appendChild(fill); w.appendChild(bar);
    return {wrap:w, span:w.querySelector('span'), fill};
  };
  const you=mkRow('Mowzkitow','#7bffef'), riv=mkRow(rivalName,'#ff9a3d');
  body.appendChild(you.wrap); body.appendChild(riv.wrap);
  const bowl=document.createElement('button');
  bowl.style.cssText='font-size:64px;background:#fff;border:4px solid #2b1b4d;width:100%;padding:10px;cursor:pointer';
  bowl.textContent='🥛'; body.appendChild(bowl);
  const stat=document.createElement('p'); stat.textContent=`${TIME}.0s — CHUG!`; body.appendChild(stat);
  let yp=0, rp=0, left=TIME, over=false;
  const paint=()=>{ you.fill.style.width=(100*yp/TARGET)+'%'; you.span.textContent=`${yp}/${TARGET}`; riv.fill.style.width=(100*rp/TARGET)+'%'; riv.span.textContent=`${rp}/${TARGET}`; };
  const finish=(win)=>{ if(over) return; over=true; clearInterval(iv); clearInterval(ai); off(); sfx(win?'win':'lose'); done(win); };
  function chug(){ if(over) return; yp++; if(yp%10===0) sfx('slurp'); else sfx('gulp'); bowl.style.transform=`rotate(${(Math.random()*10-5).toFixed(1)}deg)`; paint(); if(yp>=TARGET) finish(true); }
  bowl.onclick=chug;
  const off=_onKey(e=>{ if(e.code==='Space'||e.key===' '){ e.preventDefault(); if(!e.repeat) chug(); } });
  const ai=setInterval(()=>{ if(over) return; if(Math.random()<0.62){ rp++; paint(); if(rp>=TARGET) finish(false); } },140);
  const iv=setInterval(()=>{
    if(over) return; left-=0.25; stat.textContent=`${Math.max(0,left).toFixed(1)}s — CHUG!`;
    if(left<=0){ finish(yp>=rp); }
  },250);
  paint();
  body.appendChild(_quitRow(()=>{ over=true; clearInterval(iv); clearInterval(ai); off(); done(false); }));
}
// ---------- LETTER DUEL: press the shown letter, 4 rounds, shrinking time ----------
function letterFight(done){
  done=_once(done);
  const body=openModal('RACCOON TYPE-OFF','もじバトル • おせ!');
  const info=document.createElement('p');
  info.innerHTML=`<b>How to play (English):</b> A letter flashes — smash that key before time runs out! 4 rounds, faster every time. Wrong key or timeout = you lose. ⌨️🦝`;
  body.appendChild(info);
  const big=document.createElement('div');
  big.style.cssText='font-family:monospace;font-size:90px;text-align:center;background:#1a0f2e;color:#ffd93d;border:4px solid #ffd93d;padding:10px;margin:8px 0';
  body.appendChild(big);
  const barW=document.createElement('div'); barW.style.cssText='background:#1a0f2e;border:3px solid #2b1b4d;height:16px';
  const bar=document.createElement('div'); bar.style.cssText='background:#7bff9e;height:100%;width:100%'; barW.appendChild(bar); body.appendChild(barW);
  const stat=document.createElement('p'); body.appendChild(stat);
  const limits=[1.6,1.2,0.9,0.65];
  let round=0, left=0, over=false, raf=0, lastT=0;
  const ABC='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let want='';
  const off=_onKey(e=>{
    if(over||e.repeat) return;
    const k=(e.key||'').toUpperCase();
    if(k.length!==1||ABC.indexOf(k)<0) return;
    if(k===want){ next(); } else { end(false,'Wrong key! The raccoon cackles!'); }
  });
  function end(win,msg){ if(over) return; over=true; cancelAnimationFrame(raf); off(); stat.textContent=msg; sfx(win?'win':'lose'); setTimeout(()=>done(win),700); }
  function next(){
    round++;
    if(round>4){ end(true,'4 for 4! Flawless fingers!'); return; }
    want=ABC[Math.floor(Math.random()*26)];
    big.textContent=want; left=limits[round-1];
    stat.textContent=`Round ${round}/4 — GO!`;
    lastT=performance.now();
    const tick=(t)=>{
      if(over) return;
      left-=(t-lastT)/1000; lastT=t;
      bar.style.width=Math.max(0,100*left/limits[round-1])+'%';
      bar.style.background=left<0.4?'#ff5a5a':'#7bff9e';
      if(left<=0){ end(false,`Too slow! It wanted ${want}!`); return; }
      raf=requestAnimationFrame(tick);
    };
    cancelAnimationFrame(raf); raf=requestAnimationFrame(tick);
  }
  body.appendChild(_quitRow(()=>{ over=true; cancelAnimationFrame(raf); off(); done(false); }));
  next();
}
// ---------- DODGE ARENA: undertale-style survival (trash / paws / boss) ----------
function dodgeGame(done, opts){
  done=_once(done);
  opts=opts||{};
  const DUR=opts.duration||10, LIVES=opts.lives||2;
  const theme=opts.theme||'trash';
  const epic=theme==='boss';
  const body=openModal(opts.title||'DODGE!','よけろ • たたか!');
  const info=document.createElement('p'); info.innerHTML=opts.how||`<b>How to play (English):</b> Move with <b>WASD / arrows</b>. Survive <b>${DUR}s</b>! You have <b>${LIVES} lives</b>. 💜`;
  body.appendChild(info);
  const cv=document.createElement('canvas'); cv.width=440; cv.height=320;
  cv.style.cssText='width:100%;border:4px solid #2b1b4d;background:#0b0616;display:block';
  body.appendChild(cv);
  const stat=document.createElement('p'); body.appendChild(stat);
  const g=cv.getContext('2d'); g.imageSmoothingEnabled=false;
  const P={x:220,y:200,r:7,hp:LIVES,ifr:0};
  const keys={}; const off=_onKey(e=>{ keys[e.key.toLowerCase()]=true; if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())) e.preventDefault(); });
  const up=e=>{ if(e&&e.key) keys[e.key.toLowerCase()]=false; }; // per-key! releasing one key must not kill the others
  window.addEventListener('keyup',up);
  let bullets=[], parts=[], t=0, over=false, raf=0, lastT=performance.now(), spawnT=0, ringT=0, shake=0, flash=0;
  const spd=opts.speed||1;
  function spawn(aimed){
    const side=Math.floor(Math.random()*4);
    let x,y; if(side===0){x=Math.random()*440;y=-10;} else if(side===1){x=Math.random()*440;y=330;} else if(side===2){x=-10;y=Math.random()*320;} else {x=450;y=Math.random()*320;}
    const a=aimed?Math.atan2(P.y-y,P.x-x):Math.atan2(160-y,220-x)+(Math.random()-.5)*.9;
    const s=(90+Math.random()*60)*spd*(epic?1.5:1);
    bullets.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,paw:theme!=='trash',rot:Math.random()*6});
  }
  function ring(n){
    const cx=220, cy=160;
    for(let i=0;i<n;i++){ const a=i/n*Math.PI*2+t; bullets.push({x:cx,y:cy,vx:Math.cos(a)*130*spd,vy:Math.sin(a)*130*spd,paw:true,rot:a}); }
  }
  function burst(x,y,n,col){ for(let i=0;i<n;i++) parts.push({x,y,vx:(Math.random()-.5)*160,vy:(Math.random()-.5)*160,life:.6,color:col||'#ffd93d'}); }
  function end(win,msg){ if(over) return; over=true; cancelAnimationFrame(raf); off(); window.removeEventListener('keyup',up); stat.textContent=msg; sfx(win?'win':'lose'); setTimeout(()=>done(win),900); }
  function loop(tms){
    if(over) return;
    const dt=Math.min(.05,(tms-lastT)/1000); lastT=tms; t+=dt;
    let dx=0,dy=0;
    if(keys['a']||keys['arrowleft'])dx-=1; if(keys['d']||keys['arrowright'])dx+=1;
    if(keys['w']||keys['arrowup'])dy-=1; if(keys['s']||keys['arrowdown'])dy+=1;
    if(dx||dy){ const m=Math.hypot(dx,dy); P.x+=dx/m*175*dt; P.y+=dy/m*175*dt; }
    P.x=Math.max(14,Math.min(426,P.x)); P.y=Math.max(14,Math.min(306,P.y));
    if(P.ifr>0)P.ifr-=dt;
    spawnT-=dt;
    const interval=epic?0.5:0.9;
    if(spawnT<=0){ spawnT=interval; spawn(true); if(epic&&Math.random()<.5)spawn(false); }
    if(epic){ ringT-=dt; if(ringT<=0){ ringT=3; ring(10); sfx('hit'); } }
    for(const b of bullets){ b.x+=b.vx*dt; b.y+=b.vy*dt; b.rot+=dt*4; }
    bullets=bullets.filter(b=>b.x>-20&&b.y>-20&&b.x<460&&b.y<340);
    for(const b of bullets){
      if(P.ifr<=0 && Math.hypot(P.x-b.x,P.y-b.y)<13){
        P.hp--; P.ifr=1.2; shake=epic?10:5; flash=.35; burst(P.x,P.y,14,'#ff5a5a'); sfx('hurt');
        bullets=bullets.filter(q=>q!==b);
        if(P.hp<=0){ end(false,`${opts.loseMsg||'Bonked!'} (${P.hp} lives left: 0)`); return; }
        break;
      }
    }
    parts=parts.filter(p=>{p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;return p.life>0;});
    if(shake>0)shake-=dt*30;
    if(flash>0)flash-=dt;
    // draw
    g.save();
    if(shake>0) g.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
    g.fillStyle=epic?'#12041f':'#0b0616'; g.fillRect(-20,-20,480,360);
    if(epic){ // starfield + pulsing danger border
      g.fillStyle='#fff'; for(let i=0;i<30;i++){ const sx=(i*97+t*12)%440, sy=(i*57)%320; g.fillRect(sx,sy,2,2); }
      g.strokeStyle=`rgba(255,15,90,${.5+.5*Math.sin(t*6)})`; g.lineWidth=6; g.strokeRect(4,4,432,312);
      g.fillStyle='#ff0f5a'; g.font='bold 13px monospace'; g.textAlign='center'; g.fillText('★ NYANNER REQUIEM ★',220,24);
    } else { g.strokeStyle='#7b2ff7'; g.lineWidth=4; g.strokeRect(4,4,432,312); }
    for(const b of bullets){
      if(b.paw){ // kitty paw: pad + 3 toes
        g.fillStyle='#ff9ed2';
        g.fillRect(b.x-4,b.y-3,8,8); g.fillRect(b.x-5,b.y-8,4,4); g.fillRect(b.x-1,b.y-9,4,4); g.fillRect(b.x+3,b.y-8,4,4);
        g.fillStyle='#c9184a'; g.fillRect(b.x-1,b.y,3,3);
      } else { g.fillStyle='#8a8a8a'; g.fillRect(b.x-5,b.y-5,10,10); g.fillStyle='#c9c9c9'; g.fillRect(b.x-5,b.y-5,10,3); g.fillStyle='#4a4a4a'; g.fillRect(b.x-2,b.y,4,4); }
    }
    for(const p of parts){ g.fillStyle=p.color; g.fillRect(p.x-2,p.y-2,4,4); }
    // soul
    if(!(P.ifr>0&&Math.floor(t*12)%2===0)){ g.fillStyle='#ff0f3b'; g.fillRect(P.x-7,P.y-7,14,14); g.fillStyle='#fff'; g.fillRect(P.x-7,P.y-7,14,4); }
    if(flash>0){ g.fillStyle=`rgba(255,30,60,${flash})`; g.fillRect(-20,-20,480,360); }
    g.restore();
    const left=Math.max(0,DUR-t);
    stat.textContent=`⏱ ${left.toFixed(1)}s left • ${'💜'.repeat(Math.max(0,P.hp))||'💔'} ${epic?`• brooms dodged: ${Math.floor(t*2)}`:''}`;
    if(t>=DUR){ burst(P.x,P.y,24,'#7bff9e'); end(true,opts.winMsg||'Survived! Untouchable!'); return; }
    raf=requestAnimationFrame(loop);
  }
  body.appendChild(_quitRow(()=>{ over=true; cancelAnimationFrame(raf); off(); window.removeEventListener('keyup',up); done(false); }));
  raf=requestAnimationFrame(loop);
}
// ---------- TRASH RACE: click trash before the raccoon snags it (first to 6) ----------
function trashRace(done){
  done=_once(done);
  const body=openModal('TRASH GRAB RACE','ゴミとり • はやく!');
  const info=document.createElement('p');
  info.innerHTML=`<b>How to play (English):</b> Trash pops up around the lot — <b>click it fast</b>! The raccoon grabs some too. First to <b>6 pieces</b> wins. He cheats. Obviously. 🗑️🦝`;
  body.appendChild(info);
  const stat=document.createElement('p'); body.appendChild(stat);
  const arena=document.createElement('div');
  arena.style.cssText='display:grid;grid-template-columns:repeat(8,1fr);gap:4px;background:#1a0f2e;border:4px solid #2b1b4d;padding:6px';
  body.appendChild(arena);
  const cells=[];
  for(let i=0;i<48;i++){ const d=document.createElement('div'); d.style.cssText='aspect-ratio:1/1;background:#241433;border:2px solid #3a2b5a;display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer;user-select:none'; arena.appendChild(d); cells.push(d); }
  const EM=['🍖','🐟','🧦','📰','🍕','🥫','🍩','🧃'];
  let you=0, cpu=0, over=false;
  const paint=()=>{ stat.textContent=`YOU ${you} — ${cpu} RACCOON (first to 6)`; };
  const finish=(win,msg)=>{ if(over) return; over=true; clearInterval(sp); clearInterval(ai); stat.textContent=msg; sfx(win?'win':'lose'); setTimeout(()=>done(win),800); };
  function pop(){
    if(over) return;
    const free=cells.filter(c=>!c.dataset.live);
    if(!free.length) return;
    const c=free[Math.floor(Math.random()*free.length)];
    c.dataset.live='1'; c.textContent=EM[Math.floor(Math.random()*EM.length)];
    c.onclick=()=>{ if(over||!c.dataset.live) return; delete c.dataset.live; c.textContent=''; you++; sfx('pickup'); paint(); if(you>=6) finish(true,'6 pieces! You out-trash the trash panda!'); };
    setTimeout(()=>{ if(c.dataset.live){ delete c.dataset.live; c.textContent=''; } },1150);
  }
  const sp=setInterval(pop,650); pop(); pop();
  const ai=setInterval(()=>{
    if(over) return;
    if(Math.random()<0.68){
      const live=cells.filter(c=>c.dataset.live);
      if(live.length){ const c=live[Math.floor(Math.random()*live.length)]; delete c.dataset.live; c.textContent=''; cpu++; sfx('gulp'); paint(); if(cpu>=6) finish(false,'Raccoon got 6! He is doing a victory wiggle. Rude.'); }
    }
  },900);
  paint();
  body.appendChild(_quitRow(()=>{ over=true; clearInterval(sp); clearInterval(ai); done(false); }));
}
// ---------- PONG vs the boss kitty: score once on his side to win ----------
function pongGame(done){
  done=_once(done);
  const body=openModal('BOSS PHASE 1 — PONG','ポン • ねこ!');
  const info=document.createElement('p');
  info.innerHTML=`<b>How to play (English):</b> Classic pong! Move with <b>W/S, arrows, or mouse</b>. Get the ball past the kitty <b>once</b> to win. If he scores on you, you lose. 🏓🐈`;
  body.appendChild(info);
  const cv=document.createElement('canvas'); cv.width=480; cv.height=300;
  cv.style.cssText='width:100%;border:4px solid #2b1b4d;background:#0b0616;display:block;cursor:none';
  body.appendChild(cv);
  const stat=document.createElement('p'); stat.textContent='First to 1! 猫に勝て!'; body.appendChild(stat);
  const g=cv.getContext('2d');
  const P={y:130}, E={y:130}, B={x:240,y:150,vx:0,vy:0};
  const keys={}; let mouseY=null;
  const off=_onKey(e=>{ keys[e.key.toLowerCase()]=true; if(['arrowup','arrowdown',' '].includes(e.key.toLowerCase())) e.preventDefault(); });
  const up=e=>{ if(e&&e.key) keys[e.key.toLowerCase()]=false; };
  const mm=e=>{ const r=cv.getBoundingClientRect(); mouseY=(e.clientY-r.top)*(300/r.height); };
  cv.addEventListener('mousemove',mm);
  window.addEventListener('keyup',up);
  let over=false, raf=0, lastT=performance.now(), serveT=1;
  function serve(dir){ B.x=240; B.y=100+Math.random()*100; const a=(Math.random()-.5)*.8; B.vx=Math.cos(a)*270*dir; B.vy=Math.sin(a)*270; }
  function end(win,msg){ if(over) return; over=true; cancelAnimationFrame(raf); off(); window.removeEventListener('keyup',up); cv.removeEventListener('mousemove',mm); stat.textContent=msg; sfx(win?'win':'lose'); setTimeout(()=>done(win),900); }
  function loop(tms){
    if(over) return;
    const dt=Math.min(.05,(tms-lastT)/1000); lastT=tms;
    if(keys['w']||keys['arrowup'])P.y-=300*dt; if(keys['s']||keys['arrowdown'])P.y+=300*dt;
    if(mouseY!==null)P.y+=(mouseY-30-P.y)*Math.min(1,dt*12);
    P.y=Math.max(0,Math.min(240,P.y));
    // kitty AI: tracks with error + max speed so it's beatable
    const err=Math.sin(tms/700)*26;
    if(E.y+30<B.y+err-8)E.y+=215*dt; else if(E.y+30>B.y+err+8)E.y-=215*dt;
    E.y=Math.max(0,Math.min(240,E.y));
    if(serveT>0){ serveT-=dt; if(serveT<=0) serve(Math.random()<.5?1:-1); }
    else {
      B.x+=B.vx*dt; B.y+=B.vy*dt;
      if(B.y<4||B.y>296){ B.y=Math.max(4,Math.min(296,B.y)); B.vy*=-1; }
      if(B.vx<0&&B.x<22&&B.x>8&&B.y>P.y-6&&B.y<P.y+66){ const r=(B.y-P.y-30)/30; const sp=Math.min(420,Math.hypot(B.vx,B.vy)+18); B.vx=Math.abs(Math.cos(r*.9))*sp; B.vy=Math.sin(r*.9)*sp; sfx('gulp'); }
      if(B.vx>0&&B.x>458&&B.x<472&&B.y>E.y-6&&B.y<E.y+66){ const r=(B.y-E.y-30)/30; const sp=Math.min(420,Math.hypot(B.vx,B.vy)+18); B.vx=-Math.abs(Math.cos(r*.9))*sp; B.vy=Math.sin(r*.9)*sp; }
      if(B.x<-8) end(false,'The kitty scores! He is smug about it.');
      if(B.x>488) end(true,'GOOOAL! Past the kitty! Phase 1 clear!');
    }
    g.fillStyle='#0b0616'; g.fillRect(0,0,480,300);
    g.fillStyle='#3a2b5a'; for(let y=0;y<300;y+=16) g.fillRect(238,y,4,8);
    g.fillStyle='#7bffef'; g.fillRect(10,P.y,12,60);
    g.fillStyle='#ff9ed2'; g.fillRect(458,E.y,12,60);
    g.font='20px serif'; g.fillText('🐈',452,E.y-8);
    g.fillStyle='#ffd93d'; g.fillRect(B.x-5,B.y-5,10,10);
    raf=requestAnimationFrame(loop);
  }
  body.appendChild(_quitRow(()=>{ over=true; cancelAnimationFrame(raf); off(); window.removeEventListener('keyup',up); cv.removeEventListener('mousemove',mm); done(false); }));
  raf=requestAnimationFrame(loop);
}
// ---------- SIDE DODGE: move sideways only, paws rain from the front ----------
function sideDodge(done){
  done=_once(done);
  const body=openModal('BOSS PHASE 2 — PAW STORM','にくきゅう • よけろ!');
  const info=document.createElement('p');
  info.innerHTML=`<b>How to play (English):</b> You can only shuffle <b>LEFT / RIGHT</b> (arrows, A/D, or mouse). Kitty paws rain from above for <b>15s</b>! 3 lives. It gets mean. 🐾💨`;
  body.appendChild(info);
  const cv=document.createElement('canvas'); cv.width=420; cv.height=320;
  cv.style.cssText='width:100%;border:4px solid #2b1b4d;background:#0b0616;display:block;cursor:none';
  body.appendChild(cv);
  const stat=document.createElement('p'); body.appendChild(stat);
  const g=cv.getContext('2d');
  const P={x:210,hp:3,ifr:0};
  const keys={}; let mouseX=null;
  const off=_onKey(e=>{ keys[e.key.toLowerCase()]=true; if(['arrowleft','arrowright',' '].includes(e.key.toLowerCase())) e.preventDefault(); });
  const up=e=>{ if(e&&e.key) keys[e.key.toLowerCase()]=false; };
  const mm=e=>{ const r=cv.getBoundingClientRect(); mouseX=(e.clientX-r.left)*(420/r.width); };
  cv.addEventListener('mousemove',mm);
  window.addEventListener('keyup',up);
  let paws=[],t=0,over=false,raf=0,lastT=performance.now(),spawnT=0;
  function end(win,msg){ if(over) return; over=true; cancelAnimationFrame(raf); off(); window.removeEventListener('keyup',up); cv.removeEventListener('mousemove',mm); stat.textContent=msg; sfx(win?'win':'lose'); setTimeout(()=>done(win),900); }
  function loop(tms){
    if(over) return;
    const dt=Math.min(.05,(tms-lastT)/1000); lastT=tms; t+=dt;
    if(keys['a']||keys['arrowleft'])P.x-=260*dt; if(keys['d']||keys['arrowright'])P.x+=260*dt;
    if(mouseX!==null)P.x+=(mouseX-P.x)*Math.min(1,dt*14);
    P.x=Math.max(16,Math.min(404,P.x));
    if(P.ifr>0)P.ifr-=dt;
    spawnT-=dt;
    if(spawnT<=0){ spawnT=Math.max(.32,.7-t*.025); paws.push({x:P.x+(Math.random()-.5)*160,y:-14,vy:170+t*9,vx:(Math.random()-.5)*40}); if(t>8&&Math.random()<.4)paws.push({x:Math.random()*420,y:-14,vy:190+t*8,vx:0}); }
    for(const p of paws){ p.x+=p.vx*dt; p.y+=p.vy*dt; }
    paws=paws.filter(p=>p.y<340);
    for(const p of paws){
      if(P.ifr<=0&&Math.abs(P.x-p.x)<16&&Math.abs(292-p.y)<18){
        P.hp--; P.ifr=1.1; sfx('hurt'); paws=paws.filter(q=>q!==p);
        if(P.hp<=0){ end(false,'Flattened by paws! The kitty applauds himself.'); return; }
        break;
      }
    }
    g.fillStyle='#0b0616'; g.fillRect(0,0,420,320);
    g.fillStyle='#fff'; for(let i=0;i<24;i++){ g.fillRect((i*89+t*8)%420,(i*47)%320,2,2); }
    g.strokeStyle='rgba(255,158,210,.6)'; g.lineWidth=3; g.strokeRect(3,3,414,314);
    for(const p of paws){ g.fillStyle='#ff9ed2'; g.fillRect(p.x-6,p.y-4,12,11); g.fillRect(p.x-7,p.y-11,6,6); g.fillRect(p.x-1,p.y-13,6,6); g.fillRect(p.x+4,p.y-11,6,6); g.fillStyle='#c9184a'; g.fillRect(p.x-2,p.y,5,4); }
    if(!(P.ifr>0&&Math.floor(t*12)%2===0)){ g.fillStyle='#7bffef'; g.fillRect(P.x-10,282,20,20); g.fillStyle='#2b1b4d'; g.fillRect(P.x-4,288,8,8); }
    const left=Math.max(0,15-t);
    stat.textContent=`⏱ ${left.toFixed(1)}s • ${'💜'.repeat(Math.max(0,P.hp))||'💔'}`;
    if(t>=15){ end(true,'Weathered the paw storm! Unreal footwork!'); return; }
    raf=requestAnimationFrame(loop);
  }
  body.appendChild(_quitRow(()=>{ over=true; cancelAnimationFrame(raf); off(); window.removeEventListener('keyup',up); cv.removeEventListener('mousemove',mm); done(false); }));
  raf=requestAnimationFrame(loop);
}
// ---------- TYPING RACE: out-type an NPC (side activity, net cafe) ----------
const raceSentences=[
  'Mowzkitow swears this keyboard is haunted and types faster anyway.',
  'The cyber cafe smells like ozone, melon soda and bad decisions.',
  'A raccoon watches through the window, taking notes, probably cheating.',
  'Neon buzzes outside while Mowzkitow breaks another speed record.',
  'The veteran kitty claims he types with his paws. Nobody believes him.',
];
function typingRace(done, opts){
  done=_once(done);
  opts=opts||{};
  const wpm=opts.wpm||40, npc=opts.npc||'Rival';
  const target=raceSentences[Math.floor(Math.random()*raceSentences.length)];
  const npcCps=wpm*5/60;
  const body=openModal('TYPING RACE vs '+npc.toUpperCase(),'タイプ対決 • 勝負!');
  const info=document.createElement('p');
  info.innerHTML=`<b>How to play (English):</b> Type the sentence <b>exactly</b>. <b>${npc} (${wpm} WPM)</b> is typing the same text — finish first! Backspace to fix typos. ⌨️💨`;
  body.appendChild(info);
  const mkRow=(name,color)=>{
    const w=document.createElement('div'); w.style.margin='6px 0';
    w.innerHTML=`<b>${name}</b> <span></span>`;
    const bar=document.createElement('div'); bar.style.cssText='background:#1a0f2e;border:3px solid #2b1b4d;height:22px';
    const fill=document.createElement('div'); fill.style.cssText=`background:${color};height:100%;width:0%`;
    bar.appendChild(fill); w.appendChild(bar);
    return {wrap:w,span:w.querySelector('span'),fill};
  };
  const you=mkRow('Mowzkitow','#7bffef'), riv=mkRow(`${npc} (${wpm} WPM)`,'#ff9a3d');
  body.appendChild(you.wrap); body.appendChild(riv.wrap);
  const tdiv=document.createElement('div'); tdiv.id='typing-target';
  target.split('').forEach(ch=>{const s=document.createElement('span');s.textContent=ch;s.className='todo';tdiv.appendChild(s);});
  body.appendChild(tdiv);
  const area=document.createElement('textarea'); area.id='typing-area'; area.placeholder='Type here... race start!'; body.appendChild(area);
  const stat=document.createElement('p'); stat.textContent='GO!'; body.appendChild(stat);
  let over=false, npcProg=0; const t0=performance.now();
  const paint=()=>{ you.fill.style.width=(100*youProg()/target.length)+'%'; riv.fill.style.width=(100*Math.min(1,npcProg/target.length))+'%'; };
  const youProg=()=>{ const v=area.value; let n=0; while(n<v.length&&n<target.length&&v[n]===target[n])n++; return n; };
  const finish=(win,msg)=>{ if(over)return; over=true; clearInterval(iv); stat.textContent=msg; sfx(win?'win':'lose'); setTimeout(()=>done(win),900); };
  paint();
  const iv=setInterval(()=>{
    if(over||modal.classList.contains('hidden'))return;
    npcProg+=(npcCps*0.25);
    const yp=youProg();
    you.span.textContent=`${yp}/${target.length}`;
    riv.span.textContent=`${Math.floor(Math.min(target.length,npcProg))}/${target.length}`;
    paint();
    const secs=(performance.now()-t0)/1000;
    stat.textContent=`You: ${(yp/5/Math.max(secs,0.1)*60).toFixed(0)} WPM • ${npc}: ${wpm} WPM`;
    if(npcProg>=target.length) finish(false,`${npc} finished first! The cafe regulars oooh. Rematch?`);
  },250);
  area.addEventListener('input',()=>{
    if(over)return;
    const v=area.value, spans=tdiv.querySelectorAll('span');
    spans.forEach((s,i)=>{ s.className=i<v.length?(v[i]===target[i]?'done':'current'):(i===v.length?'current':'todo'); s.style.background=(i<v.length&&v[i]!==target[i])?'#ff0f3b':''; });
    if(v===target) finish(true,'FINISH! You smoked them! The whole cafe heard about it!');
  });
  body.appendChild(_quitRow(()=>{ over=true; clearInterval(iv); done(false); }));
  setTimeout(()=>area.focus(),100);
}
// ---------- FISHING: stardew-style — keep the fish in the green zone ----------
function fishingGame(done){
  done=_once(done);
  const body=openModal('DEFINITELY NOT FISHING','つり • しーっ!');
  const info=document.createElement('p');
  info.innerHTML=`<b>How to play (English):</b> Move the <b style="color:green">green net</b> with <b>mouse / arrows / A,D</b> and keep the 🐟 inside it! Fill the bar to land the fish. You have <b>25s</b> — the bar drains when the fish escapes. (This is normal pond behavior. Nothing to see here.) 🎣`;
  body.appendChild(info);
  const cv=document.createElement('canvas'); cv.width=480; cv.height=220;
  cv.style.cssText='width:100%;border:4px solid #2b1b4d;background:#0e2a3a;display:block;cursor:none';
  body.appendChild(cv);
  const stat=document.createElement('p'); body.appendChild(stat);
  const g=cv.getContext('2d');
  const F={x:240,vx:120,dir:1,retarget:0,dash:0};
  const NET={x:240,w:84};
  const keys={}; let mouseX=null;
  const off=_onKey(e=>{ keys[e.key.toLowerCase()]=true; if(['arrowleft','arrowright',' '].includes(e.key.toLowerCase())) e.preventDefault(); });
  const up=e=>{ if(e&&e.key) keys[e.key.toLowerCase()]=false; };
  const mm=e=>{ const r=cv.getBoundingClientRect(); mouseX=(e.clientX-r.left)*(480/r.width); };
  cv.addEventListener('mousemove',mm);
  window.addEventListener('keyup',up);
  let prog=0.25, left=25, over=false, raf=0, lastT=performance.now();
  const bar=document.createElement('div'); bar.style.cssText='background:#1a0f2e;border:3px solid #2b1b4d;height:18px;margin-top:6px';
  const fill=document.createElement('div'); fill.style.cssText='background:#7bff9e;height:100%;width:25%'; bar.appendChild(fill); body.appendChild(bar);
  function end(win,msg){ if(over)return; over=true; cancelAnimationFrame(raf); off(); window.removeEventListener('keyup',up); cv.removeEventListener('mousemove',mm); stat.textContent=msg; sfx(win?'win':'lose'); setTimeout(()=>done(win),900); }
  function loop(tms){
    if(over)return;
    const dt=Math.min(.05,(tms-lastT)/1000); lastT=tms;
    F.retarget-=dt;
    if(F.retarget<=0){
      F.retarget=.5+Math.random()*.9; // changes mind constantly now
      F.dir=Math.random()<.5?-1:1;
      if(Math.random()<.3){ F.vx=(250+Math.random()*110)*F.dir; F.dash=.45; } // sudden DART!
      else F.vx=(100+Math.random()*120)*F.dir;
    }
    if(F.dash>0){ F.dash-=dt; if(Math.random()<.07){ F.dir*=-1; F.vx=Math.abs(F.vx)*F.dir; } } // mid-dart juke
    F.x+=F.vx*dt;
    if(F.x<24){F.x=24;F.dir=1;F.vx=Math.abs(F.vx);} if(F.x>456){F.x=456;F.dir=-1;F.vx=-Math.abs(F.vx);}
    if(keys['a']||keys['arrowleft'])NET.x-=280*dt; if(keys['d']||keys['arrowright'])NET.x+=280*dt;
    if(mouseX!==null)NET.x+=(mouseX-NET.x)*Math.min(1,dt*10);
    NET.x=Math.max(NET.w/2,Math.min(480-NET.w/2,NET.x));
    const inside=Math.abs(F.x-NET.x)<NET.w/2;
    prog+=dt*(inside?1/4:-1/3.2); prog=Math.max(0,Math.min(1,prog));
    left-=dt;
    // draw: pond line
    g.fillStyle='#0e2a3a'; g.fillRect(0,0,480,220);
    g.fillStyle='#164a63'; for(let i=0;i<12;i++){ const wx=(i*67+tms/700)%520-20; g.fillRect(wx,20+(i*37)%180,26,3); }
    g.fillStyle='#0a1a26'; g.fillRect(0,0,480,10); g.fillRect(0,210,480,10);
    g.fillStyle='rgba(20,60,80,.9)'; g.fillRect(0,96,480,28); // the line
    g.fillStyle='#8a6a3e'; g.fillRect(0,90,480,4);
    // net zone
    g.fillStyle=inside?'rgba(80,255,140,.5)':'rgba(80,255,140,.25)';
    g.fillRect(NET.x-NET.w/2,88,NET.w,44);
    g.strokeStyle='#7bff9e'; g.lineWidth=3; g.strokeRect(NET.x-NET.w/2,88,NET.w,44);
    // fish
    const fl=Math.sin(tms/150)*3;
    g.font='24px serif'; g.textAlign='center';
    g.fillText(F.dir<0?'🐟':'🐠',F.x,116+fl);
    fill.style.width=(100*prog)+'%';
    fill.style.background=inside?'#7bff9e':'#ffd93d';
    stat.textContent=`⏱ ${Math.max(0,left).toFixed(1)}s • ${inside?'IN THE NET! KEEP IT THERE!':'...where did it go...'} • ${(100*prog).toFixed(0)}%`;
    if(prog>=1){ end(true,'SPLASH! Fish landed! Bent the laws of ponds doing it!'); return; }
    if(left<=0){ end(false,'It got away... It is telling the other fish about you right now.'); return; }
    raf=requestAnimationFrame(loop);
  }
  body.appendChild(_quitRow(()=>{ over=true; cancelAnimationFrame(raf); off(); window.removeEventListener('keyup',up); cv.removeEventListener('mousemove',mm); done(false); }));
  raf=requestAnimationFrame(loop);
}
// ---------- FISH TOSS: arc a fish into a very judgy mouth (3 throws, need 1) ----------
function feedingGame(done){
  done=_once(done);
  const body=openModal('FEED HOLLOW — FISH TOSS','えさ投げ • ねらえ!');
  const info=document.createElement('p');
  info.innerHTML=`<b>How to play (English):</b> Aim with the <b>mouse</b>, then <b>HOLD click / SPACE to charge</b> and <b>release to throw</b>! Longer hold = harder throw (watch the POWER bar). The mouth drifts and dodges. Land <b>1 of 3 fish</b> in the mouth. Gravity is real. So is the judgment. 🐟😾`;
  body.appendChild(info);
  const cv=document.createElement('canvas'); cv.width=480; cv.height=300;
  cv.style.cssText='width:100%;border:4px solid #2b1b4d;background:#141428;display:block;cursor:crosshair';
  body.appendChild(cv);
  const stat=document.createElement('p'); body.appendChild(stat);
  const taunt=document.createElement('p'); taunt.style.minHeight='22px'; taunt.style.color='#ff9ed2'; body.appendChild(taunt);
  const g=cv.getContext('2d');
  const TAUNTS=['"My grandma throws better. She is a ROCK."','"Was that wind? Aim DOWNWIND of my beauty."','"The bowl is RIGHT HERE. It has never moved."','"Wow. Air. My favorite."','"I have seen raccoons with better arcs."'];
  let mouthY=180, jumpT=0, throws=3, caught=0, over=false, raf=0, lastT=performance.now();
  let flying=null, mx=240, my=150, ti=0, charging=false, charge=0;
  const off=_onKey(e=>{ if(e.code==='Space'||e.key===' '){ e.preventDefault(); if(!e.repeat) startCharge(); } });
  const offUp=e=>{ if(e.code==='Space'||e.key===' ') releaseThrow(); };
  window.addEventListener('keyup',offUp);
  const mm=e=>{ const r=cv.getBoundingClientRect(); mx=(e.clientX-r.left)*(480/r.width); my=(e.clientY-r.top)*(300/r.height); };
  const md=e=>{ e.preventDefault(); startCharge(); };
  const mu=()=>releaseThrow();
  cv.addEventListener('mousemove',mm);
  cv.addEventListener('mousedown',md);
  window.addEventListener('mouseup',mu);
  function cleanupKeys(){ off(); window.removeEventListener('keyup',offUp); window.removeEventListener('mouseup',mu); cv.removeEventListener('mousemove',mm); cv.removeEventListener('mousedown',md); }
  function startCharge(){ if(over||flying||throws<=0||charging)return; charging=true; charge=0; sfx('gulp'); }
  function releaseThrow(){
    if(!charging||over)return; charging=false;
    if(flying||throws<=0){ charge=0; return; }
    throws--;
    const a=Math.atan2(my-250,mx-40);
    const sp=250+450*charge; // hold longer = harder throw
    charge=0;
    flying={x:40,y:250,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,rot:0};
    sfx('gulp');
  }
  function end(win,msg){ if(over)return; over=true; cancelAnimationFrame(raf); cleanupKeys(); stat.textContent=msg; sfx(win?'win':'lose'); setTimeout(()=>done(win),1000); }
  function loop(tms){
    if(over)return;
    const dt=Math.min(.05,(tms-lastT)/1000); lastT=tms; ti+=dt;
    if(charging) charge=Math.min(1,charge+dt/1.1); // ~1.1s to full power
    jumpT-=dt;
    mouthY=180+Math.sin(ti*1.7)*46;
    if(jumpT<=0){ jumpT=2.2+Math.random(); mouthY+= (Math.random()<.5?-1:1)*36; mouthY=Math.max(110,Math.min(250,mouthY)); }
    if(flying){
      flying.vy+=520*dt; flying.x+=flying.vx*dt; flying.y+=flying.vy*dt; flying.rot+=dt*9;
      if(Math.hypot(flying.x-392,flying.y-mouthY)<20){
        caught++; flying=null; sfx('slurp');
        taunt.textContent='"...!! ...crunch crunch... okay. OKAY. That one counts."';
        if(caught>=1){ end(true,'FISH DELIVERED! Hollow is fed! (+10 standing)'); return; }
      } else if(flying.y>292||flying.x>476){
        flying=null; sfx('hit');
        taunt.textContent=TAUNTS[Math.floor(Math.random()*TAUNTS.length)];
      }
    }
    stat.textContent=`🐟 throws left: ${throws} • caught: ${caught}/1 needed`;
    if(throws<=0&&!flying){ end(false,'Out of fish! Hollow eats a napkin out of spite. No standing for you.'); return; }
    // draw
    g.fillStyle='#141428'; g.fillRect(0,0,480,300);
    g.fillStyle='#1e1e38'; for(let i=0;i<8;i++) g.fillRect(0,i*40,480,2);
    // thrower witch hand
    g.font='30px serif'; g.textAlign='center'; g.fillText('🧙',40,262);
    if(throws>0&&!flying){ g.font='22px serif'; g.fillText('🐟',40,236+Math.sin(ti*4)*3); }
    // crosshair
    g.strokeStyle='#7bffef'; g.lineWidth=2;
    g.beginPath(); g.arc(mx,my,10,0,7); g.stroke();
    g.fillRect(mx-1,my-14,2,6); g.fillRect(mx-1,my+8,2,6); g.fillRect(mx-14,my-1,6,2); g.fillRect(mx+8,my-1,6,2);
    // Hollow: big skinny judgy cat, mouth wide
    g.fillStyle='#3a3a48'; g.fillRect(392,60,56,190);       // body
    g.fillStyle='#2c2c38'; g.fillRect(392,60,56,10);
    g.fillStyle='#3a3a48'; g.fillRect(384,40,20,24); g.fillRect(436,40,20,24); // ears
    g.fillStyle='#ff9ed2'; g.fillRect(388,44,10,10); g.fillRect(440,44,10,10);
    g.fillStyle='#ffd93d'; g.fillRect(398,84,12,12); g.fillRect(426,84,12,12); // huge hungry eyes
    g.fillStyle='#0a0514'; g.fillRect(401,87,6,6); g.fillRect(429,87,6,6);
    g.fillStyle='#0a0514'; g.fillRect(384,mouthY-12,32,26);  // MOUTH (the goal)
    g.fillStyle='#c9184a'; g.fillRect(388,mouthY+2,24,8);
    g.fillStyle='#fff'; g.font='bold 10px monospace'; g.fillText('HOLLOW',420,52);
    if(flying){ g.save(); g.translate(flying.x,flying.y); g.rotate(flying.rot); g.font='22px serif'; g.fillText('🐟',0,0); g.restore(); }
    // POWER gauge
    g.fillStyle='#0a0514'; g.fillRect(90,272,300,18);
    g.fillStyle=charge<.4?'#7bff9e':(charge<.75?'#ffd93d':'#ff5a5a');
    g.fillRect(92,274,296*charge,14);
    g.fillStyle='#fff'; g.font='bold 11px monospace'; g.textAlign='center';
    g.fillText(charging?`POWER ${(100*charge).toFixed(0)}% — RELEASE!`:'HOLD CLICK / SPACE TO CHARGE',240,285);
    raf=requestAnimationFrame(loop);
  }
  body.appendChild(_quitRow(()=>{ over=true; charging=false; cancelAnimationFrame(raf); cleanupKeys(); done(false); }));
  raf=requestAnimationFrame(loop);
}
// ---------- RACCOON FIGHT: 1 of 3 at random ----------
function raccoonFight(done){
  const pick=Math.floor(Math.random()*3);
  if(pick===0) letterFight(done);
  else if(pick===1) dodgeGame(done,{title:'RACCOON TRASH DODGE',duration:10,lives:2,speed:1,theme:'trash',winMsg:'10 seconds of garbage weathered!',loseMsg:'Buried in garbage!'});
  else trashRace(done);
}
// ---------- BOSS CHAIN: pong -> paw storm -> epic bullet hell ----------
function bossChain(done){
  done=_once(done);
  setMusicMode('boss');
  const finish=(win)=>{ setMusicMode((typeof locMusic==='function')?locMusic():'field'); done(win); };
  const intro=(title,lines,next)=>{
    const body=openModal(title,'ボス • 決戦!');
    for(const ln of lines){ const p=document.createElement('p'); p.innerHTML=ln; body.appendChild(p); }
    const go=_btn('FIGHT! ⚔️'); go.style.width='100%'; go.style.marginTop='8px';
    go.onclick=next; body.appendChild(go);
  };
  intro('EVIL NYANNER — PHASE 1/3',[
    `<b>Evil Nyanner</b> floats down, judging you harder than ever. "Mongrel. We settle this... with TABLE TENNIS."`,
  ],()=>{
    pongGame(p1=>{
      if(!p1){ finish(false); return; }
      intro('EVIL NYANNER — PHASE 2/3',[
        `"LUCK." The alley darkens. A thousand paws blot out the moon. "DODGE."`,
      ],()=>{
        sideDodge(p2=>{
          if(!p2){ finish(false); return; }
          intro('EVIL NYANNER — FINAL PHASE',[
            `"ENOUGH." The sky cracks open. The <b>NYANNER REQUIEM</b> begins. Survive <b>15 seconds</b> of everything he has!`,
          ],()=>{
            dodgeGame(finish,{title:'FINAL — NYANNER REQUIEM',duration:15,lives:3,speed:1.15,theme:'boss',winMsg:'REQUIEM SILENCED! The overlord falls!',loseMsg:'Consumed by the requiem...'});
          });
        });
      });
    });
  });
}
