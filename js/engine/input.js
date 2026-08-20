/**
 * Unified Input Controller (Keyboard, Mouse, Touch D-Pad)
 * Mystic Realms - 2000s JRPG Web App
 */

class InputController {
  constructor() {
    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false,
      action: false,
      shift: false
    };

    this.actionJustPressed = false;
    this.mouseTarget = null;
    this.isInputFocused = false;

    this.initListeners();
    this.checkTouchDevice();
  }

  initListeners() {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));

    // Handle focus state for text input fields
    const textInputs = document.querySelectorAll('input, textarea');
    textInputs.forEach(input => {
      input.addEventListener('focus', () => { this.isInputFocused = true; });
      input.addEventListener('blur', () => { this.isInputFocused = false; });
    });

    // Mobile Virtual D-Pad Touch Listeners
    this.initMobileControls();
  }

  handleKeyDown(e) {
    // First user gesture initializes audio
    Sound.ensureContext();

    // Inputs created by minigames are not present when this controller starts.
    this.isInputFocused = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);

    if (this.isInputFocused) {
      if (e.key === 'Enter') {
        // Trigger dialog submit if enter pressed in input
        const submitBtn = document.getElementById('btnDialogSubmit');
        if (submitBtn && !submitBtn.disabled) submitBtn.click();
      } else if (e.key === 'Escape') {
        Dialog.close();
      }
      return;
    }

    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.up = true;
        e.preventDefault();
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.down = true;
        e.preventDefault();
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = true;
        e.preventDefault();
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = true;
        e.preventDefault();
        break;
      case 'Space':
      case 'Enter':
      case 'KeyE':
        if (!this.keys.action) this.actionJustPressed = true;
        this.keys.action = true;
        e.preventDefault();
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.shift = true;
        break;
      case 'KeyM':
        const isMuted = Sound.toggleMute();
        const icon = document.getElementById('audioIcon');
        if (icon) icon.textContent = isMuted ? '🔇' : '🔊';
        break;
      case 'KeyH':
        const helpModal = document.getElementById('helpModal');
        if (helpModal) helpModal.classList.toggle('hidden');
        break;
      case 'Escape':
        Dialog.close();
        document.getElementById('helpModal')?.classList.add('hidden');
        document.getElementById('rewardModal')?.classList.add('hidden');
        document.getElementById('contractModal')?.classList.add('hidden');
        document.getElementById('purreverOverlay')?.classList.add('hidden');
        break;
    }
  }

  handleKeyUp(e) {
    if (this.isInputFocused) return;

    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.up = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.down = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = false;
        break;
      case 'Space':
      case 'Enter':
      case 'KeyE':
        this.keys.action = false;
        this.actionJustPressed = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.shift = false;
        break;
    }
  }

  /**
   * Reset action press after processing a frame
   */
  consumeAction() {
    const pressed = this.actionJustPressed;
    this.actionJustPressed = false;
    return pressed;
  }

  initMobileControls() {
    const dpadUp = document.getElementById('dpadUp');
    const dpadDown = document.getElementById('dpadDown');
    const dpadLeft = document.getElementById('dpadLeft');
    const dpadRight = document.getElementById('dpadRight');
    const actionBtn = document.getElementById('mobileActionBtn');

    const bindTouch = (el, key) => {
      if (!el) return;
      const start = (e) => {
        e.preventDefault();
        Sound.ensureContext();
        if (key === 'action') this.actionJustPressed = true;
        this.keys[key] = true;
      };
      const end = (e) => {
        e.preventDefault();
        this.keys[key] = false;
      };
      el.addEventListener('touchstart', start, { passive: false });
      el.addEventListener('touchend', end, { passive: false });
      el.addEventListener('mousedown', start);
      el.addEventListener('mouseup', end);
      el.addEventListener('mouseleave', end);
    };

    bindTouch(dpadUp, 'up');
    bindTouch(dpadDown, 'down');
    bindTouch(dpadLeft, 'left');
    bindTouch(dpadRight, 'right');
    bindTouch(actionBtn, 'action');
  }

  checkTouchDevice() {
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 800);
    const mobileControls = document.getElementById('mobileControls');
    if (mobileControls) {
      if (isTouch) {
        mobileControls.classList.remove('hidden');
      } else {
        mobileControls.classList.add('hidden');
      }
    }
  }
}

const Input = new InputController();
