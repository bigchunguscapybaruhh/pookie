/**
 * Lockpick Minigame
 * Mowskito's Realm - Spinning dial skill check that triggers after
 * the correct password is entered, before the chest reward is shown.
 *
 * 3 rounds, each faster and with a smaller green zone.
 * Press SPACE (or tap) when the spinning needle lands in the green zone.
 */

class LockpickMinigame {
  constructor() {
    this.isActive   = false;
    this.onSuccess  = null;

    // ---- Game state ----
    this.round      = 0;      // current round index (0–2)
    this.hits       = 0;      // successful picks so far
    this.angle      = 0;      // needle angle in radians (accumulates freely)
    this.greenStart = 0;      // start of green zone [0, 2π]

    // ---- Feedback state ----
    this.flashType  = null;   // 'hit' | 'miss' | 'complete' | null
    this.flashTimer = 0;      // ms remaining for current flash
    this.shakeTimer = 0;
    this.shakeX     = 0;
    this.shakeY     = 0;
    this.blocked    = false;  // debounce input during flash

    /**
     * Round config — speed (rad/s) and green zone size (radians).
     * Approximate reaction windows:
     *   Round 1 → ~290 ms  (warm-up)
     *   Round 2 → ~210 ms  (getting harder)
     *   Round 3 → ~160 ms  (genuinely difficult)
     */
    this.rounds = [
      { speed: 5.0, greenArc: 12 * Math.PI / 180 },
      { speed: 6.5, greenArc: 8 * Math.PI / 180 },
      { speed: 8, greenArc: 4 * Math.PI / 180 },
    ];

    // ---- Rendering ----
    this.overlay    = null;
    this.canvas     = null;
    this.canvasCtx  = null;
    this.animFrame  = null;
    this.lastTime   = 0;

    this._createDOM();
    this._bindEvents();
  }

  // ---------------------------------------------------------------------------
  // Setup
  // ---------------------------------------------------------------------------

  _createDOM() {
    this.overlay = document.createElement('div');
    this.overlay.id        = 'lockpickOverlay';
    this.overlay.className = 'lockpick-overlay hidden';

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'lockpickCanvas';
    this.overlay.appendChild(this.canvas);

    document.body.appendChild(this.overlay);
    this.canvasCtx = this.canvas.getContext('2d');
  }

  _bindEvents() {
    // Keyboard: Space / Enter
    this._onKeyDown = (e) => {
      if (!this.isActive) return;
      if (e.code === 'Space' || e.code === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this._attempt();
      }
    };
    document.addEventListener('keydown', this._onKeyDown);

    // Mobile / mouse tap anywhere on overlay
    this.overlay.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.isActive) this._attempt();
    });
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Begin the minigame.
   * @param {Function} onSuccess - called after all 3 picks succeed
   */
  start(onSuccess) {
    this.onSuccess  = onSuccess;
    this.isActive   = true;
    this.round      = 0;
    this.hits       = 0;
    this.angle      = -Math.PI / 2;  // Start at 12 o'clock
    this.flashType  = null;
    this.flashTimer = 0;
    this.shakeTimer = 0;
    this.blocked    = false;

    this._randomizeGreenZone();
    this._resize();
    this.overlay.classList.remove('hidden');

    Sound.ensureContext();
    Sound.playMenuSelect();

    this.lastTime  = performance.now();
    this.animFrame = requestAnimationFrame((t) => this._loop(t));
  }

  /** Hide overlay and stop the animation loop. */
  stop() {
    this.isActive = false;
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
    this.overlay.classList.add('hidden');
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  _resize() {
    const size = Math.round(Math.min(
      window.innerWidth  * 0.86,
      window.innerHeight * 0.78,
      500
    ));
    this.canvas.width  = size;
    this.canvas.height = size;
  }

  _randomizeGreenZone() {
    // Keep zone away from the very top so it's never at the starting position
    this.greenStart = 0.5 + Math.random() * (Math.PI * 2 - 1.0);
  }

  // ---------------------------------------------------------------------------
  // Input handling
  // ---------------------------------------------------------------------------

  _attempt() {
    if (this.blocked) return;

    const config = this.rounds[Math.min(this.round, 2)];

    // Normalise the accumulating needle angle to [0, 2π]
    const norm = ((this.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const gEnd = (this.greenStart + config.greenArc) % (Math.PI * 2);

    const inZone = this.greenStart < gEnd
      ? norm >= this.greenStart && norm <= gEnd
      : norm >= this.greenStart || norm <= gEnd;  // zone wraps past 2π

    if (inZone) {
      this._onHit();
    } else {
      this._onMiss();
    }
  }

  _onHit() {
    this.hits++;
    this.blocked   = true;
    Sound.playLockpickClick();

    if (this.hits >= 3) {
      // All 3 picks done — transition to reward
      this.flashType  = 'complete';
      this.flashTimer = 900;
      setTimeout(() => {
        this.stop();
        if (this.onSuccess) this.onSuccess();
      }, 950);
    } else {
      // Advance to next (harder) round
      this.flashType  = 'hit';
      this.flashTimer = 520;
      setTimeout(() => {
        this.round++;
        this._randomizeGreenZone();
        this.flashType  = null;
        this.flashTimer = 0;
        this.blocked    = false;
      }, 520);
    }
  }

  _onMiss() {
    this.blocked    = true;
    this.flashType  = 'miss';
    this.flashTimer = 360;
    this.shakeTimer = 360;
    Sound.playLockpickMiss();
    setTimeout(() => {
      this.flashType  = null;
      this.flashTimer = 0;
      this.blocked    = false;
    }, 360);
  }

  // ---------------------------------------------------------------------------
  // Game loop
  // ---------------------------------------------------------------------------

  _loop(t) {
    if (!this.isActive) return;

    const dt = Math.min(t - this.lastTime, 100);
    this.lastTime = t;

    // Spin needle — freeze during final 'complete' flash for drama
    if (this.flashType !== 'complete') {
      const config = this.rounds[Math.min(this.round, 2)];
      this.angle += config.speed * (dt / 1000);
    }

    if (this.flashTimer > 0) this.flashTimer = Math.max(0, this.flashTimer - dt);

    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
      this.shakeX = (Math.random() - 0.5) * 10;
      this.shakeY = (Math.random() - 0.5) * 10;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }

    this._render();
    this.animFrame = requestAnimationFrame((t) => this._loop(t));
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  _render() {
    const cvs = this.canvas;
    const ctx = this.canvasCtx;
    const W   = cvs.width;
    const H   = cvs.height;
    const cx  = W / 2 + this.shakeX;
    const cy  = H / 2 + this.shakeY;

    const R  = Math.min(W, H) * 0.33;   // ring radius
    const TW = Math.max(13, R * 0.115); // track width

    ctx.clearRect(0, 0, W, H);

    // ---- Background disc ----
    const bgG = ctx.createRadialGradient(cx, cy, 0, cx, cy, R + TW + 30);
    bgG.addColorStop(0, 'rgba(31, 20, 48, 0.98)');
    bgG.addColorStop(1, 'rgba(10, 5, 18, 0.88)');
    ctx.beginPath();
    ctx.arc(cx, cy, R + TW + 26, 0, Math.PI * 2);
    ctx.fillStyle = bgG;
    ctx.fill();

    // ---- Rim border (changes colour on flash) ----
    const rimColor = this.flashType === 'miss'
      ? '#ff4455'
      : (this.flashType === 'hit' || this.flashType === 'complete')
        ? '#44ff88'
        : '#d4d8e8';
    ctx.beginPath();
    ctx.arc(cx, cy, R + TW + 18, 0, Math.PI * 2);
    ctx.lineWidth   = 3;
    ctx.strokeStyle = rimColor;
    ctx.stroke();

    // ---- Full track ring (dark base) ----
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.lineWidth   = TW;
    ctx.strokeStyle = '#190c26';
    ctx.stroke();

    // ---- Tick marks ----
    for (let i = 0; i < 36; i++) {
      const ta  = (i / 36) * Math.PI * 2;
      const big = i % 3 === 0;
      const r1  = R - TW / 2 + 1;
      const r2  = R + TW / 2 - 1;
      const x1  = cx + Math.cos(ta) * r1;
      const y1  = cy + Math.sin(ta) * r1;
      const x2  = cx + Math.cos(ta) * (big ? r2 : r1 + (r2 - r1) * 0.45);
      const y2  = cy + Math.sin(ta) * (big ? r2 : r1 + (r2 - r1) * 0.45);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth   = big ? 1.5 : 0.8;
      ctx.strokeStyle = `rgba(212,216,232,${big ? 0.18 : 0.07})`;
      ctx.stroke();
    }

    // ---- Green zone ----
    const config = this.rounds[Math.min(this.round, 2)];
    const zColor = (this.flashType === 'hit' || this.flashType === 'complete')
      ? '#ffff44'
      : this.flashType === 'miss'
        ? '#ff5533'
        : '#22ff66';

    // Outer glow
    ctx.beginPath();
    ctx.arc(cx, cy, R, this.greenStart, this.greenStart + config.greenArc);
    ctx.lineWidth   = TW + 12;
    ctx.strokeStyle = (this.flashType === 'hit' || this.flashType === 'complete')
      ? 'rgba(255,255,100,0.38)'
      : 'rgba(34,255,102,0.18)';
    ctx.stroke();

    // Zone arc
    ctx.beginPath();
    ctx.arc(cx, cy, R, this.greenStart, this.greenStart + config.greenArc);
    ctx.lineWidth   = TW;
    ctx.strokeStyle = zColor;
    ctx.lineCap     = 'round';
    ctx.stroke();
    ctx.lineCap     = 'butt';

    // ---- Needle ----
    const nX = cx + Math.cos(this.angle) * R;
    const nY = cy + Math.sin(this.angle) * R;

    // Is needle currently inside the zone? (highlight it)
    const norm = ((this.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const gEnd = (this.greenStart + config.greenArc) % (Math.PI * 2);
    const inZ  = this.greenStart < gEnd
      ? norm >= this.greenStart && norm <= gEnd
      : norm >= this.greenStart || norm <= gEnd;

    const nColor = (this.flashType === 'hit' || this.flashType === 'complete')
      ? '#ffff44'
      : this.flashType === 'miss'
        ? '#ff4444'
        : inZ ? '#88ffaa' : '#ffffff';

    // Drop shadow
    ctx.beginPath();
    ctx.moveTo(cx + 2, cy + 2);
    ctx.lineTo(nX + 2, nY + 2);
    ctx.lineWidth   = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineCap     = 'round';
    ctx.stroke();

    // Needle line
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nX, nY);
    ctx.lineWidth   = 3;
    ctx.strokeStyle = nColor;
    ctx.lineCap     = 'round';
    ctx.stroke();
    ctx.lineCap     = 'butt';

    // Tip dot
    ctx.beginPath();
    ctx.arc(nX, nY, 6, 0, Math.PI * 2);
    ctx.fillStyle   = (this.flashType === 'hit' || this.flashType === 'complete')
      ? '#ffff44'
      : this.flashType === 'miss' ? '#ff4444' : '#ff3b5c';
    ctx.fill();
    ctx.lineWidth   = 1.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Centre pivot
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#d4d8e8';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ff3b5c';
    ctx.fill();

    // ---- Progress pips (3 circles) ----
    const pipY  = cy - R - TW - 28;
    const pipSp = 30;
    for (let i = 0; i < 3; i++) {
      const px = cx + (i - 1) * pipSp;
      ctx.beginPath();
      ctx.arc(px, pipY, 9, 0, Math.PI * 2);
      ctx.fillStyle = i < this.hits
        ? '#22ff66'
        : i === this.hits
          ? (this.flashType === 'miss' ? '#ff4444' : '#ff3b5c')
          : '#1a0d28';
      ctx.fill();
      ctx.lineWidth   = 2;
      ctx.strokeStyle = i < this.hits ? '#44ffaa' : '#d4d8e8';
      ctx.stroke();

      // Checkmark on completed pips
      if (i < this.hits) {
        ctx.font         = '10px sans-serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle    = '#000000';
        ctx.fillText('✓', px, pipY);
      }
    }

    // ---- Title label ----
    const fs = Math.max(7, Math.round(R * 0.09));
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.font         = `${fs}px 'Press Start 2P', monospace`;
    ctx.fillStyle    = '#000000';
    ctx.fillText('LOCKPICKING', cx + 2, pipY - 28 + 1);
    ctx.fillStyle    = '#ff859d';
    ctx.fillText('LOCKPICKING', cx,     pipY - 28);

    // ---- Flash feedback text (centre of dial) ----
    if (this.flashType && this.flashTimer > 80) {
      const label = this.flashType === 'complete' ? 'UNLOCKED!'
        : this.flashType === 'hit' ? 'CLICK!'
        : 'MISS!';
      const fCol = this.flashType === 'miss' ? '#ff4444' : '#ffff44';
      const ffs  = Math.max(9, Math.round(R * 0.135));
      ctx.font      = `${ffs}px 'Press Start 2P', monospace`;
      ctx.fillStyle = '#000000';
      ctx.fillText(label, cx + 2, cy + 2);
      ctx.fillStyle = fCol;
      ctx.fillText(label, cx, cy);
    }

    // ---- Bottom labels ----
    const botY = cy + R + TW + 20;
    const sfs  = Math.max(6, Math.round(R * 0.075));
    ctx.font   = `${sfs}px 'Press Start 2P', monospace`;

    // Blinking spacebar hint
    if (Math.floor(Date.now() / 480) % 2 === 0 && !this.flashType) {
      ctx.fillStyle = '#e0ddef';
      ctx.fillText('[ SPACE ] TO PICK', cx, botY);
    }

    // Round counter
    ctx.fillStyle = '#ff859d';
    ctx.fillText(`ROUND  ${this.round + 1}  /  3`, cx, botY + sfs + 16);
  }
}

const Lockpick = new LockpickMinigame();
