/**
 * Zero-Dependency 2000s JRPG Sound Effects Synthesizer (Web Audio API)
 * Mystic Realms
 */

class SoundSystem {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterGain = null;
    this.initialized = false;
    this.lastStepTime = 0;
    this.musicTimer = null;
    this.musicStep = 0;
    this.battleMusic = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(CONFIG.AUDIO_VOLUME, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn("AudioContext could not be initialized:", e);
    }
  }

  ensureContext() {
    if (!this.initialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.startBackgroundMusic();
  }

  /** A quiet, original, spooky-but-silly 8-bit wandering loop. Starts after first interaction. */
  startBackgroundMusic() {
    if (!this.ctx || this.musicTimer) return;
    // Original haunted picnic tune: mellow, bouncy, and lightly mischievous.
    const melody = [392, 440, 523.25, 440, 349.23, 392, 493.88, 440, 329.63, 392, 466.16, 440, 293.66, 349.23, 392, 329.63];
    const bass = [98, 98, 87.31, 87.31, 82.41, 82.41, 73.42, 73.42];
    const battleMelody = [523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 493.88, 587.33, 698.46, 783.99, 880, 783.99, 659.25, 587.33, 523.25, 493.88];
    const battleBass = [130.81, 130.81, 146.83, 146.83, 110, 110, 123.47, 123.47];
    const tick = () => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const activeMelody = this.battleMusic ? battleMelody : melody;
      const activeBass = this.battleMusic ? battleBass : bass;
      const note = activeMelody[this.musicStep % activeMelody.length];
      const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
      osc.type = this.battleMusic ? 'square' : 'triangle'; osc.frequency.setValueAtTime(note, t);
      gain.gain.setValueAtTime(this.battleMusic ? 0.05 : 0.034, t); gain.gain.exponentialRampToValueAtTime(0.0001, t + (this.battleMusic ? 0.13 : 0.24));
      osc.connect(gain); gain.connect(this.masterGain); osc.start(t); osc.stop(t + 0.2);
      if (this.musicStep % 2 === 0) {
        const low = this.ctx.createOscillator(), lowGain = this.ctx.createGain();
        low.type = this.battleMusic ? 'sawtooth' : 'sine'; low.frequency.setValueAtTime(activeBass[Math.floor(this.musicStep / 2) % activeBass.length], t);
        lowGain.gain.setValueAtTime(this.battleMusic ? 0.045 : 0.035, t); lowGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
        low.connect(lowGain); lowGain.connect(this.masterGain); low.start(t); low.stop(t + 0.34);
      }
      // A tiny clownish bell ping every fourth beat; deliberately subtle under movement and effects.
      if (!this.battleMusic && this.musicStep % 4 === 3) {
        const ping = this.ctx.createOscillator(), pingGain = this.ctx.createGain();
        ping.type = 'sine'; ping.frequency.setValueAtTime(note * 2, t);
        pingGain.gain.setValueAtTime(.018, t); pingGain.gain.exponentialRampToValueAtTime(.0001, t + .1);
        ping.connect(pingGain); pingGain.connect(this.masterGain); ping.start(t); ping.stop(t + .11);
      }
      this.musicStep++;
      this.musicTimer = setTimeout(tick, this.battleMusic ? 155 : 255);
    };
    tick();
  }

  setBattleMusic(active) { this.battleMusic = active; }

  playSpiderCollect() {
    if (this.isMuted) return;
    this.ensureContext(); if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [740, 1040, 1480].forEach((freq, i) => {
      const osc = this.ctx.createOscillator(), gain = this.ctx.createGain(), at = t + i * 0.055;
      osc.type = 'square'; osc.frequency.setValueAtTime(freq, at); gain.gain.setValueAtTime(.065, at); gain.gain.exponentialRampToValueAtTime(.0001, at + .12);
      osc.connect(gain); gain.connect(this.masterGain); osc.start(at); osc.stop(at + .13);
    });
  }

  /** Loud, original cartoon chef cackle, paired with the pizza-face fail screen. */
  playChefLaugh() {
    if (this.isMuted) return;
    this.ensureContext(); if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [0, .14, .28, .42, .62, .76, .9].forEach((offset, i) => {
      const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
      osc.type = i % 2 ? 'sawtooth' : 'square'; osc.frequency.setValueAtTime(570 - (i % 3) * 105, t + offset);
      osc.frequency.exponentialRampToValueAtTime(220 + (i % 2) * 35, t + offset + .12);
      gain.gain.setValueAtTime(.17, t + offset); gain.gain.exponentialRampToValueAtTime(.0001, t + offset + .145);
      osc.connect(gain); gain.connect(this.masterGain); osc.start(t + offset); osc.stop(t + offset + .16);
      const chuckle = this.ctx.createOscillator(), chuckleGain = this.ctx.createGain();
      chuckle.type = 'triangle'; chuckle.frequency.setValueAtTime(860 - i * 28, t + offset);
      chuckleGain.gain.setValueAtTime(.055, t + offset); chuckleGain.gain.exponentialRampToValueAtTime(.0001, t + offset + .1);
      chuckle.connect(chuckleGain); chuckleGain.connect(this.masterGain); chuckle.start(t + offset); chuckle.stop(t + offset + .11);
    });
  }

  playHungerDeath() {
    if (this.isMuted) return;
    this.ensureContext(); if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [392, 311.13, 233.08, 155.56].forEach((freq, i) => {
      const osc = this.ctx.createOscillator(), gain = this.ctx.createGain(), at = t + i * .16;
      osc.type = i === 3 ? 'sawtooth' : 'triangle'; osc.frequency.setValueAtTime(freq, at);
      gain.gain.setValueAtTime(.08, at); gain.gain.exponentialRampToValueAtTime(.0001, at + .28);
      osc.connect(gain); gain.connect(this.masterGain); osc.start(at); osc.stop(at + .3);
    });
  }

  playZombieGroan() {
    if (this.isMuted) return;
    this.ensureContext(); if (!this.ctx) return;
    const t = this.ctx.currentTime, osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(105 + Math.random() * 38, t); osc.frequency.linearRampToValueAtTime(68, t + .32);
    gain.gain.setValueAtTime(.055, t); gain.gain.exponentialRampToValueAtTime(.0001, t + .35);
    osc.connect(gain); gain.connect(this.masterGain); osc.start(t); osc.stop(t + .36);
  }

  playFart() {
    if (this.isMuted) return;
    this.ensureContext(); if (!this.ctx) return;
    // Filtered noise produces a far less "bleep"-like and far more embarrassing fart.
    const t = this.ctx.currentTime, duration = .48, frames = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate), data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      const envelope = Math.pow(1 - i / frames, .55);
      data[i] = (Math.random() * 2 - 1) * envelope * (0.58 + .42 * Math.sin(i * .014));
    }
    const source = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain();
    source.buffer = buffer; filter.type = 'bandpass'; filter.frequency.setValueAtTime(155, t); filter.frequency.exponentialRampToValueAtTime(68, t + duration); filter.Q.value = 2.4;
    gain.gain.setValueAtTime(.16, t); gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
    source.connect(filter); filter.connect(gain); gain.connect(this.masterGain); source.start(t);
  }

  /** Goofy synthetic wheeze-laugh for the defeat cat. */
  playLoserLaugh() {
    if (this.isMuted) return;
    this.ensureContext(); if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 11; i++) {
      const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
      const start = t + i * 0.115;
      osc.type = i % 3 === 0 ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(180 + (i % 4) * 55, start);
      osc.frequency.exponentialRampToValueAtTime(95 + (i % 2) * 20, start + 0.09);
      gain.gain.setValueAtTime(0.055, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.11);
      osc.connect(gain); gain.connect(this.masterGain); osc.start(start); osc.stop(start + 0.12);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(
        this.isMuted ? 0 : CONFIG.AUDIO_VOLUME, 
        this.ctx.currentTime
      );
    }
    return this.isMuted;
  }

  /**
   * Footstep sound (gentle grassy rustle)
   */
  playStep() {
    if (this.isMuted) return;
    const now = Date.now();
    if (now - this.lastStepTime < 240) return; // Debounce footsteps
    this.lastStepTime = now;

    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80 + Math.random() * 30, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.08);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, t);

    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  /**
   * Dialogue typing blip (classic 2000s JRPG text bleep)
   */
  playTypewriter() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const pitch = 520 + (Math.random() * 60 - 30);
    osc.frequency.setValueAtTime(pitch, t);

    gain.gain.setValueAtTime(0.035, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.04);
  }

  /**
   * Classic JRPG Window Open / Menu Select Chime
   */
  playMenuSelect() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    
    // Two-tone rising harmonic chime
    [
      { f: 587.33, start: 0, dur: 0.12 },     // D5
      { f: 880.00, start: 0.06, dur: 0.22 },   // A5
      { f: 1174.66, start: 0.12, dur: 0.28 }  // D6
    ].forEach(note => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(note.f, t + note.start);

      // Smooth soft envelope for 16-bit warmth
      gain.gain.setValueAtTime(0.05, t + note.start);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + note.start + note.dur);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t + note.start);
      osc.stop(t + note.start + note.dur);
    });
  }

  /**
   * Menu cancel / close sound
   */
  playMenuCancel() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.12);

    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  /**
   * Wrong password error buzzer
   */
  playError() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    
    // Low dissonant buzz
    [130.81, 138.59].forEach(freq => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.setValueAtTime(0.08, t + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.35);
    });
  }

  /**
   * Spectacular Victory Fanfare & Chest Opening Arpeggio
   */
  playChestOpen() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Iconic JRPG Victory Arpeggio (C Major -> High Flourish)
    const notes = [
      { f: 523.25, start: 0.00, dur: 0.15 }, // C5
      { f: 659.25, start: 0.10, dur: 0.15 }, // E5
      { f: 783.99, start: 0.20, dur: 0.15 }, // G5
      { f: 1046.50, start: 0.30, dur: 0.25 }, // C6
      { f: 1318.51, start: 0.45, dur: 0.25 }, // E6
      { f: 1567.98, start: 0.60, dur: 0.60 }  // G6 (held fanfare)
    ];

    notes.forEach(note => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(note.f, t + note.start);

      gain.gain.setValueAtTime(0.07, t + note.start);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + note.start + note.dur);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t + note.start);
      osc.stop(t + note.start + note.dur);
    });

    // Shimmering sparkle overlay
    for (let i = 0; i < 6; i++) {
      const sparkleOsc = this.ctx.createOscillator();
      const sparkleGain = this.ctx.createGain();
      const startTime = t + 0.65 + i * 0.08;

      sparkleOsc.type = 'sine';
      sparkleOsc.frequency.setValueAtTime(1800 + i * 220, startTime);

      sparkleGain.gain.setValueAtTime(0.04, startTime);
      sparkleGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.15);

      sparkleOsc.connect(sparkleGain);
      sparkleGain.connect(this.masterGain);

      sparkleOsc.start(startTime);
      sparkleOsc.stop(startTime + 0.15);
    }
  }

  /**
   * Lockpick success — satisfying metallic "tink" click
   */
  playLockpickClick() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Main metallic triangle wave
    const osc1 = this.ctx.createOscillator();
    const g1   = this.ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(1300, t);
    osc1.frequency.exponentialRampToValueAtTime(950, t + 0.09);
    g1.gain.setValueAtTime(0.13, t);
    g1.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc1.connect(g1);
    g1.connect(this.masterGain);
    osc1.start(t);
    osc1.stop(t + 0.18);

    // High sparkle harmonic
    const osc2 = this.ctx.createOscillator();
    const g2   = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2600, t);
    g2.gain.setValueAtTime(0.05, t);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.10);
    osc2.connect(g2);
    g2.connect(this.masterGain);
    osc2.start(t);
    osc2.stop(t + 0.10);
  }

  /**
   * Lockpick miss — short sharp downward buzz
   */
  playLockpickMiss() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t   = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g   = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.20);

    g.gain.setValueAtTime(0.10, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);

    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.24);
  }
}

const Sound = new SoundSystem();
