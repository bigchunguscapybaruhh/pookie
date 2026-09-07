// audio.js — SFX + adaptive music (field / boss / sad). All original tunes.
let audioCtx = null, musicOn = true, musicTimer = null, step = 0;
let musicMode = 'field'; // 'field' | 'boss' | 'sad'
function setMusicMode(m){ musicMode = m; }
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
const noteFreq = n => {
  const map={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  const m=/^([A-G])(#|b)?(\d)$/.exec(n); if(!m) return 0;
  const semi=map[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0);
  const midi=(+m[3]+1)*12+semi;
  return 440*Math.pow(2,(midi-69)/12);
};
function sfx(name) {
  if (!audioCtx) return;
  if (name==='pickup') { playNote(880,.1,'square',.08); playNote(1320,.12,'square',.08,.08); }
  if (name==='coin') { playNote(988,.08,'square',.07); playNote(1319,.15,'square',.07,.07); }
  if (name==='slurp') { playGlide(300,900,.18,'sine',.09); playGlide(400,1100,.15,'sine',.08,.15); }
  if (name==='gulp') { playPlunk(500,.12,.09); }
  if (name==='win') { [523,659,784,1046,1318,1568].forEach((f,i)=>playNote(f,.18,'square',.09,i*0.09)); }
  if (name==='lose') { [400,350,300,200].forEach((f,i)=>playNote(f,.2,'sawtooth',.07,i*0.12)); }
  if (name==='hit') { playNote(160,.2,'sawtooth',.1); }
  if (name==='hurt') { playNote(140,.25,'sawtooth',.12); playNote(90,.3,'square',.1,.05); }
  if (name==='step') { playNote(220+Math.random()*80,.05,'square',.02); }
  if (name==='solve') { [784,988,1175,1568].forEach((f,i)=>playNote(f,.15,'triangle',.1,i*0.07)); }
  if (name==='meow') { playNote(600,.15,'sawtooth',.07); playNote(900,.2,'sawtooth',.07,.12); }
  if (name==='quest') { [659,784,988,784,1046].forEach((f,i)=>playNote(f,.14,'triangle',.09,i*0.08)); }
  if (name==='siren') { playGlide(600,1200,.4,'sawtooth',.05); }
}
// ---- FIELD: "Moshi Moshi Town" — soft upbeat cute J-pop (original).
// I–V–vi–IV bounce, music-box lead, telephone-blip motif. Verse -> chorus.
const boneLead = [
  'E5',0,'G5',0, 'A5',0,'G5','E5', 'D5',0,'E5',0, 'G5',0,0,0,
  'E5',0,'G5',0, 'A5',0,'C6',0,  'B5',0,'A5','G5', 'E5',0,'D5',0,
  'E5',0,'G5',0, 'A5',0,'G5',0,  'C6',0,'B5','A5', 'G5',0,'E5',0,
  'D5',0,'E5','F5', 'E5',0,'D5',0, 'C5',0,'D5','E5', 'C5~',0,0,0,
];
const boneBass = [
  'C3',0,'G2',0, 'C3',0,'G2',0,  'G2',0,'D3',0, 'G2',0,'D3',0,
  'A2',0,'E3',0, 'A2',0,'E3',0,  'F2',0,'C3',0, 'F2',0,'C3',0,
  'C3',0,'G2',0, 'C3',0,'G2',0,  'A2',0,'E3',0, 'A2',0,'E3',0,
  'F2',0,'C3',0, 'G2',0,'D3',0,  'C3',0,'G2',0, 'C3~',0,0,0,
];
function fieldStep(i){
  const swing = (i % 2 === 1) ? 0.02 : 0;
  const chorus = i >= 32;
  const l = boneLead[i], b = boneBass[i];
  if (l) { // cute music-box lead, sparkling octave, brighter in chorus
    if (String(l).endsWith('~')) { const n=String(l).slice(0,-1); playGlide(noteFreq(n)/2, noteFreq(n), 0.3, 'triangle', 0.034, swing); }
    else { playNote(noteFreq(l), 0.15, 'triangle', chorus?0.037:0.031, swing); playNote(noteFreq(l)*2, 0.07, 'sine', 0.011, swing); }
  }
  if (b) { // bouncy root-fifth J-pop bassline
    if (String(b).endsWith('~')) { const n=String(b).slice(0,-1); playGlide(noteFreq(n), noteFreq(n)*2, 0.4, 'triangle', 0.07, 0); }
    else playNote(noteFreq(b), 0.16, 'triangle', 0.07, 0);
  }
  // soft pop kit: pillowy kick, whisper hats, gentle clap
  if (i % 8 === 0 || i % 8 === 4) playNote(105, 0.09, 'sine', 0.055);
  if (i % 2 === 1) playNote(7200, 0.02, 'square', 0.005);
  if (i % 16 === 12) playNote(950, 0.04, 'square', 0.022);
  if (i === 46) playPlunk(noteFreq('G5'), 0.1, 0.022);
  // "moshi moshi" telephone blips — cute hello every verse
  if (i % 32 === 24) { playNote(noteFreq('E6'), 0.09, 'sine', 0.02); playNote(noteFreq('G6'), 0.12, 'sine', 0.02, 0.11); }
  if (i % 32 === 0) { playNote(noteFreq('C6'), 0.7, 'triangle', 0.014); playNote(noteFreq('G5'), 0.7, 'sine', 0.012); }
}
// ---- BOSS: driving showdown (original) — gallop bass, stab lead, alarm ----
const bossLead = [
  'E5',0,'E5','G5', 'A5',0,'G5','E5', 'D5',0,'D5','E5', 'C5',0,'D5',0,
  'E5',0,'E5','G5', 'A5',0,'B5','A5', 'G5','F#5','G5','A5', 'B5',0,'A5~',0,
];
const bossBass = [
  'E2','E2','E2','E3', 'E2','E2','G2','G2', 'D2','D2','D2','D3', 'D2','D2','A2','A2',
  'E2','E2','E2','E3', 'E2','E2','G2','G2', 'A2','A2','B2','B2', 'E3','E3','E2',0,
];
function bossStep(i){
  const l = bossLead[i], b = bossBass[i];
  if (l) {
    if (String(l).endsWith('~')) { const n=String(l).slice(0,-1); playGlide(noteFreq(n)/2, noteFreq(n), 0.2, 'sawtooth', 0.05); }
    else { playNote(noteFreq(l), 0.1, 'square', 0.055); playNote(noteFreq(l)/2, 0.1, 'sawtooth', 0.03); }
  }
  if (b) playNote(noteFreq(b), 0.11, 'triangle', 0.12);
  if (i % 4 === 0) playNote(130, 0.07, 'sine', 0.12);      // driving kick
  if (i % 8 === 4) playNote(220, 0.07, 'square', 0.06);    // snare crack
  if (i % 2 === 1) playNote(8000, 0.02, 'square', 0.014);  // frantic hats
  if (i === 0) playGlide(500,1500,.3,'sawtooth',.025);     // battle alarm each loop
}
// ---- PUB: funky oompah drinking song (original) — tuba + claps ----
const pubLead = [
  'C5',0,'E5',0, 'G5',0,'E5',0, 'A5',0,'G5',0, 'E5',0,'D5',0,
  'C5',0,'E5',0, 'G5',0,'A5',0, 'G5',0,'E5',0, 'D5',0,'C5',0,
];
const pubBass = [
  'C3',0,'G2',0, 'C3',0,'G2',0, 'F2',0,'C3',0, 'G2',0,'D3',0,
  'C3',0,'G2',0, 'C3',0,'G2',0, 'F2',0,'G2',0, 'C3',0,'C3',0,
];
function pubStep(i){
  const l = pubLead[i], b = pubBass[i];
  if (l) { playNote(noteFreq(l), 0.12, 'square', 0.04); playNote(noteFreq(l)/2, 0.12, 'triangle', 0.03); }
  if (b) playNote(noteFreq(b), 0.14, 'triangle', 0.10);
  if (i % 4 === 0) playNote(95, 0.08, 'sine', 0.09);                    // tuba stomp
  if (i % 4 === 2) playNote(900, 0.04, 'square', 0.03);                 // drunk claps
  if (i % 8 === 6) playPlunk(noteFreq('G5'), 0.08, 0.02);               // glass clink
  if (i % 16 === 0) playGlide(noteFreq('C6'), noteFreq('G5'), 0.5, 'sine', 0.015);
}
// ---- CAFE: funky gaming electro (original) — arps + four-on-floor ----
const cafeLead = [
  'A4','C5','E5','A5', 'G5','E5','C5','E5', 'F4','A4','C5','F5', 'E5','C5','A4','C5',
  'A4','C5','E5','A5', 'B5','A5','G5','E5', 'D5','E5','F5','E5', 'D5','C5','B4','A4',
];
const cafeBass = [
  'A1',0,0,0, 'A1',0,0,0, 'F1',0,0,0, 'F1',0,0,0,
  'G1',0,0,0, 'G1',0,0,0, 'E1',0,'E2',0, 'A1',0,'A2',0,
];
function cafeStep(i){
  const l = cafeLead[i], b = cafeBass[i];
  if (l) playNote(noteFreq(l), 0.09, 'square', 0.032);
  if (i % 2 === 0) playNote(noteFreq(cafeLead[(i+8)%32]), 0.06, 'triangle', 0.014); // echo arp
  if (b) playNote(noteFreq(b), 0.14, 'triangle', 0.10);
  if (i % 4 === 0) playNote(120, 0.06, 'sine', 0.09);                   // four-on-floor
  if (i % 8 === 4) playNote(200, 0.05, 'square', 0.035);                // snare
  if (i % 2 === 1) playNote(9000, 0.02, 'square', 0.009);               // hats
  if (i === 24) playPlunk(noteFreq('A5'), 0.1, 0.025);                  // coin sfx-ish
}
// ---- CAVE: very funky goofy brew music (original) — wobbles, slides, boings ----
const caveLead = [
  'E5',0,'G5',0, 'A5~',0,'G5',0, 'E5',0,'C5',0, 'D5',0,'E5',0,
  'F5',0,'F#5',0, 'G5',0,'A5~',0, 'G5',0,'E5',0, 'D5~',0,'C5',0,
];
const caveBass = [
  'C2~',0,'G2',0, 'A2~',0,'E2',0, 'F2',0,'C3',0, 'G2',0,'G2',0,
  'C2~',0,'G2',0, 'F2~',0,'E2',0, 'D2',0,'G2',0, 'C2~',0,0,0,
];
function caveStep(i){
  const l = caveLead[i], b = caveBass[i];
  if (l) {
    if (String(l).endsWith('~')) { const n=String(l).slice(0,-1); playGlide(noteFreq(n)/2, noteFreq(n), 0.22, 'square', 0.05); }
    else { playNote(noteFreq(l), 0.11, 'square', 0.05); playNote(noteFreq(l)*2, 0.06, 'triangle', 0.02); }
  }
  if (b) {
    if (String(b).endsWith('~')) { const n=String(b).slice(0,-1); playGlide(noteFreq(n), noteFreq(n)*2, 0.24, 'triangle', 0.11, 0); }
    else playNote(noteFreq(b), 0.15, 'triangle', 0.11, 0);
  }
  if (i % 4 === 0) playNote(125, 0.07, 'sine', 0.10);                   // stompy kick
  if (i % 4 === 2) playNote(850, 0.03, 'square', 0.028);                // wobbly claps
  if (i % 8 === 7) playPlunk(noteFreq('C6'), 0.1, 0.03);                // drip drop
  if (i % 16 === 8) playGlide(noteFreq('G4'), noteFreq('G6'), 0.4, 'sine', 0.03); // slide-whistleoo
  if (i === 28) playGlide(noteFreq('E6'), noteFreq('C5'), 0.35, 'sawtooth', 0.03); // cauldron bubble-burp
}
// ---- SAD: slow 8-bit elegy for the credits (original) ----
const sadLine = ['A4',0,0,0, 'F4',0,0,0, 'C5',0,'B4',0, 'A4',0,0,0,
                 'G4',0,0,0, 'E4',0,0,0, 'A4',0,0,0, 'E4',0,0,0];
function sadStep(i){
  const n = sadLine[i % sadLine.length];
  if (n) { playNote(noteFreq(n), 0.5, 'square', 0.04); playNote(noteFreq(n)/2, 0.6, 'triangle', 0.03, 0.02); }
  if (i % 16 === 0) playNote(noteFreq('A2'), 1.2, 'triangle', 0.05);
}
const MODE_LEN = { field: 64, boss: 32, sad: 32, pub: 32, cafe: 32, cave: 32 };
const MODE_TICK = { field: 152, boss: 108, sad: 300, pub: 132, cafe: 118, cave: 124 };
let currentTick = 148;
function musicLoop() {
  if (musicOn && audioCtx && window.__gameStarted && !window.__gamePaused) {
    const len = MODE_LEN[musicMode] || 32;
    const i = step % len;
    if (musicMode === 'boss') bossStep(i);
    else if (musicMode === 'sad') sadStep(i);
    else if (musicMode === 'pub') pubStep(i);
    else if (musicMode === 'cafe') cafeStep(i);
    else if (musicMode === 'cave') caveStep(i);
    else fieldStep(i);
  }
  step++;
}
function startMusic() {
  initAudio();
  if (musicTimer) clearInterval(musicTimer);
  const tick = () => {
    const want = MODE_TICK[musicMode] || 148;
    if (want !== currentTick) { currentTick = want; startMusic(); return; }
    musicLoop();
  };
  currentTick = MODE_TICK[musicMode] || 148;
  musicTimer = setInterval(tick, currentTick);
}
