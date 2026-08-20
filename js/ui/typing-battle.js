/** Classic wandering encounter: win by finishing the shown phrase before the monster's 60 WPM typing. */
class TypingBattleController {
  constructor() {
    this.active = false;
    this.lossShowing = false;
    this.monsters = [
      { name: 'MOLDY BEEP', icon: '🫠', color: '#7fbb6c', line: 'the soup is looking at me' },
      { name: 'COUNT SPAGHETTI', icon: '🧛', color: '#b56d91', line: 'i have one thousand noodles' },
      { name: 'SIR BONKALOT', icon: '👹', color: '#bb8b50', line: 'my helmet is full of bees' }
    ];
    this.createDOM();
  }
  createDOM() {
    this.overlay = document.createElement('div'); this.overlay.className = 'battle-overlay hidden';
    this.overlay.innerHTML = `<div class="battle-box jrpg-window"><div class="battle-flash">⚡ A WILD WEIRDO APPEARED! ⚡</div><div id="battleMonster" class="battle-monster"></div><div id="battleName" class="battle-name"></div><p class="battle-rule">TYPE THE SPELL BEFORE THEY DO — they type at 60 WPM</p><div id="battleLine" class="battle-line"></div><input id="battleInput" class="battle-input" autocomplete="off" spellcheck="false" placeholder="type the line exactly..." /><div class="race-labels"><span>YOU</span><span>MONSTER</span></div><div class="race-track"><div id="playerRace" class="race-fill player-race"></div><div id="monsterRace" class="race-fill monster-race"></div></div><div id="battleStatus" class="battle-status"></div></div>`;
    document.body.appendChild(this.overlay);
    this.input = this.overlay.querySelector('#battleInput'); this.status = this.overlay.querySelector('#battleStatus');
    this.input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); } });
    this.input.addEventListener('input', () => this.onInput());

    this.lossOverlay = document.createElement('div'); this.lossOverlay.className = 'loser-overlay hidden';
    this.lossOverlay.innerHTML = `<div class="loser-card"><img src="loser-cat.png" alt="Laughing cat" class="loser-cat"><div class="loser-text">looool loser</div><div class="loser-hint">click anywhere to recover your dignity</div></div>`;
    document.body.appendChild(this.lossOverlay);
    this.lossOverlay.addEventListener('click', () => { this.lossShowing = false; this.lossOverlay.classList.add('hidden'); });
  }
  start() {
    this.active = true; this.monster = this.monsters[Math.floor(Math.random() * this.monsters.length)]; this.line = this.monster.line;
    ['up', 'down', 'left', 'right', 'action', 'shift'].forEach(key => Input.keys[key] = false);
    this.monsterProgress = 0; this.startTime = performance.now(); this.finished = false;
    this.overlay.querySelector('#battleMonster').textContent = this.monster.icon; this.overlay.querySelector('#battleMonster').style.color = this.monster.color;
    this.overlay.querySelector('#battleName').textContent = this.monster.name;
    this.overlay.querySelector('#battleLine').textContent = this.line;
    this.overlay.querySelector('#playerRace').style.width = '0%'; this.overlay.querySelector('#monsterRace').style.width = '0%';
    this.status.textContent = 'GO GO GO!!'; this.input.value = ''; this.overlay.classList.remove('hidden'); this.input.focus(); Sound.setBattleMusic(true); Sound.playError();
    requestAnimationFrame(t => this.tick(t));
  }
  tick(now) {
    if (!this.active || this.finished) return;
    // 60 words/minute ≈ 5 characters each second, including spaces.
    this.monsterProgress = Math.min(this.line.length, Math.floor((now - this.startTime) / 200));
    this.overlay.querySelector('#monsterRace').style.width = `${this.monsterProgress / this.line.length * 100}%`;
    if (this.monsterProgress >= this.line.length) { this.end(false); return; }
    requestAnimationFrame(t => this.tick(t));
  }
  onInput() {
    if (!this.active || this.finished) return;
    const typed = this.input.value;
    if (!this.line.startsWith(typed)) { this.input.value = typed.slice(0, -1); this.status.textContent = 'That letter escaped! Try again.'; Sound.playError(); return; }
    this.overlay.querySelector('#playerRace').style.width = `${typed.length / this.line.length * 100}%`;
    if (typed.length === this.line.length) this.end(true);
  }
  end(won) {
    this.finished = true; this.input.blur(); this.status.textContent = won ? `${this.monster.name} was out-typed! ✨` : `${this.monster.name} typed first... dramatic retreat!`;
    if (won) {
      Sound.playChestOpen();
      setTimeout(() => {
        this.active = false; this.overlay.classList.add('hidden'); Sound.setBattleMusic(false);
        ['up', 'down', 'left', 'right', 'action', 'shift'].forEach(key => Input.keys[key] = false);
        Input.isInputFocused = false;
      }, 1350);
    } else {
      Sound.playMenuCancel();
      setTimeout(() => { this.active = false; this.overlay.classList.add('hidden'); Sound.setBattleMusic(false); this.showLoss(); }, 650);
    }
  }
  showLoss() {
    this.lossShowing = true; this.lossOverlay.classList.remove('hidden'); Sound.playLoserLaugh();
    ['up', 'down', 'left', 'right', 'action', 'shift'].forEach(key => Input.keys[key] = false);
    Input.isInputFocused = false;
  }
}
const TypingBattle = new TypingBattleController();
