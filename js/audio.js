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
}

const Sound = new SoundSystem();
