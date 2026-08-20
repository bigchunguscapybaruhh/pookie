/** Timed square-pizza challenge: cut every square, then eat it with a fork. */
class PizzaMinigame {
  constructor() {
    this.active = false; this.failShowing = false; this.tool = 'knife'; this.pieces = Array(9).fill('whole'); this.timeLeft = 12;
    this.createDOM();
  }
  createDOM() {
    this.overlay = document.createElement('div'); this.overlay.className = 'pizza-overlay hidden';
    this.overlay.innerHTML = `<div class="pizza-box jrpg-window"><div class="pizza-title">🍕 IL FORKETTO FORBIDDENO 🍕</div><div class="pizza-timer">HURRY: <span id="pizzaTime">12.0</span>s</div><p id="pizzaInstruction" class="pizza-instruction">Use the knife to cut the pizza into neat little squares. Then fork each one into your mouth!</p><div class="pizza-tools"><button data-tool="knife" class="pizza-tool selected">🔪 CUT</button><button data-tool="fork" class="pizza-tool">🍴 EAT</button></div><div id="pizzaGrid" class="pizza-grid" aria-label="Nine square pizza pieces"></div></div>`;
    document.body.appendChild(this.overlay);
    this.instruction = this.overlay.querySelector('#pizzaInstruction'); this.grid = this.overlay.querySelector('#pizzaGrid'); this.timerEl = this.overlay.querySelector('#pizzaTime');
    this.overlay.querySelectorAll('[data-tool]').forEach(button => button.addEventListener('click', () => { this.tool = button.dataset.tool; this.render(); }));
    this.failOverlay = document.createElement('div'); this.failOverlay.className = 'pizza-fail-overlay hidden';
    this.failOverlay.innerHTML = `<div class="pizza-fail-card"><div class="chef-face">👨🏻‍🍳</div><div class="pizza-splat">🍕</div><div class="pizza-fail-text">PIZZA IN THE FACE!!</div><p>Chef Pizzaroni laughs like an absolute goblin.</p><button class="jrpg-btn primary">Try again, flour-face</button></div>`;
    document.body.appendChild(this.failOverlay);
    this.failOverlay.addEventListener('click', () => { this.failShowing = false; this.failOverlay.classList.add('hidden'); });
  }
  start(onComplete) {
    this.active = true; this.failShowing = false; this.onComplete = onComplete; this.tool = 'knife'; this.pieces = Array(9).fill('whole'); this.timeLeft = 12; this.lastTime = performance.now();
    this.overlay.classList.remove('hidden'); this.render(); Sound.playMenuSelect(); requestAnimationFrame(t => this.tick(t));
  }
  tick(now) {
    if (!this.active) return;
    this.timeLeft = Math.max(0, this.timeLeft - (now - this.lastTime) / 1000); this.lastTime = now; this.timerEl.textContent = this.timeLeft.toFixed(1);
    if (this.timeLeft <= 0) { this.fail(); return; }
    requestAnimationFrame(t => this.tick(t));
  }
  render() {
    this.grid.innerHTML = '';
    this.overlay.querySelectorAll('[data-tool]').forEach(button => button.classList.toggle('selected', button.dataset.tool === this.tool));
    this.pieces.forEach((state, index) => {
      const piece = document.createElement('button'); piece.className = `pizza-square ${state}`; piece.title = state === 'whole' ? 'Cut this square' : state === 'cut' ? 'Eat this square' : 'Eaten';
      piece.innerHTML = state === 'eaten' ? '✨' : state === 'cut' ? '🍕' : '🍅'; piece.disabled = state === 'eaten'; piece.addEventListener('click', () => this.usePiece(index)); this.grid.appendChild(piece);
    });
  }
  usePiece(index) {
    const state = this.pieces[index];
    if (state === 'whole' && this.tool === 'knife') { this.pieces[index] = 'cut'; this.instruction.textContent = 'Nice square! Switch to the fork whenever you want to eat a cut piece.'; Sound.playLockpickClick(); }
    else if (state === 'cut' && this.tool === 'fork') { this.pieces[index] = 'eaten'; this.instruction.textContent = 'Nom. Keep going before the chef loses patience!'; Sound.playMenuSelect(); }
    else { this.instruction.textContent = state === 'whole' ? 'That is uncut! Use the KNIFE first!' : 'That square is ready! Use the FORK to eat it!'; Sound.playError(); return; }
    this.render();
    if (this.pieces.every(piece => piece === 'eaten')) this.win();
  }
  win() {
    this.active = false; this.instruction.textContent = 'Perfetto! Not one hand touched the pizza.';
    setTimeout(() => { this.overlay.classList.add('hidden'); this.onComplete?.(); }, 550);
  }
  fail() {
    this.active = false; this.failShowing = true; this.overlay.classList.add('hidden'); this.failOverlay.classList.remove('hidden'); Sound.playChefLaugh();
  }
}
const PizzaGame = new PizzaMinigame();
