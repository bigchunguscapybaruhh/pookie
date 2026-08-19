/**
 * Gothic JRPG Dialogue & Password UI Controller
 * Mowskito's Realm
 */

class DialogController {
  constructor() {
    this.isOpen = false;
    this.typewriterInterval = null;
    this.isTyping = false;
    this.activeChest = null;

    // DOM Elements
    this.overlay = document.getElementById('dialogOverlay');
    this.dialogBox = document.querySelector('.dialog-box');
    this.speakerEl = document.getElementById('dialogSpeaker');
    this.textEl = document.getElementById('dialogText');
    this.passwordSection = document.getElementById('passwordSection');
    this.passwordInput = document.getElementById('passwordInput');
    this.passwordError = document.getElementById('passwordError');
    this.btnSubmit = document.getElementById('btnDialogSubmit');
    this.btnCancel = document.getElementById('btnDialogCancel');
    this.btnSubmitText = document.getElementById('btnSubmitText');
    this.toggleEyeBtn = document.getElementById('togglePasswordVisibility');
    this.nextIndicator = document.getElementById('dialogNextIndicator');

    // Reward Modal & Purrever & Contract
    this.rewardModal = document.getElementById('rewardModal');
    this.rewardContent = document.getElementById('rewardContent');
    this.btnYes1 = document.getElementById('btnYes1');
    this.btnYes2 = document.getElementById('btnYes2');
    this.purreverOverlay = document.getElementById('purreverOverlay');
    this.contractModal = document.getElementById('contractModal');
    this.btnCloseContract = document.getElementById('btnCloseContract');

    // Help Modal
    this.helpModal = document.getElementById('helpModal');
    this.btnHelp = document.getElementById('btnControlsHelp');
    this.btnCloseHelp = document.getElementById('btnCloseHelp');
    this.btnAudioToggle = document.getElementById('btnAudioToggle');

    // Proximity Prompt
    this.proximityPrompt = document.getElementById('proximityPrompt');

    this.initEvents();
  }

  initEvents() {
    // Submit password button
    this.btnSubmit.addEventListener('click', () => this.handlePasswordSubmit());

    // Cancel / Close button
    this.btnCancel.addEventListener('click', () => this.close());

    // Toggle password eye visibility
    this.toggleEyeBtn.addEventListener('click', () => {
      const type = this.passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      this.passwordInput.setAttribute('type', type);
      this.toggleEyeBtn.textContent = type === 'password' ? '👁️' : '🔒';
    });

    // Handle Purrever Choice Buttons ("yes" or "yes")
    const triggerPurrever = () => {
      Sound.playChestOpen();
      this.rewardModal.classList.add('hidden');
      this.purreverOverlay.classList.remove('hidden');
    };

    this.btnYes1?.addEventListener('click', triggerPurrever);
    this.btnYes2?.addEventListener('click', triggerPurrever);

    // Clicking anywhere on the purrever cat screen transitions to the goofy Contract!
    this.purreverOverlay?.addEventListener('click', () => {
      this.purreverOverlay.classList.add('hidden');
      Sound.playMenuSelect();
      this.contractModal?.classList.remove('hidden');
    });

    // Close / Complete contract modal
    this.btnCloseContract?.addEventListener('click', () => {
      Sound.playMenuSelect();
      this.contractModal?.classList.add('hidden');
    });

    // Toolbar Help button
    this.btnHelp?.addEventListener('click', () => {
      Sound.playMenuSelect();
      this.helpModal.classList.remove('hidden');
    });
    this.btnCloseHelp?.addEventListener('click', () => {
      Sound.playMenuCancel();
      this.helpModal.classList.add('hidden');
    });

    // Audio Toggle
    this.btnAudioToggle?.addEventListener('click', () => {
      const isMuted = Sound.toggleMute();
      document.getElementById('audioIcon').textContent = isMuted ? '🔇' : '🔊';
    });
  }

  /**
   * Opens the interactive password challenge for the treasure chest
   */
  openChestPrompt(chest) {
    this.activeChest = chest;
    this.isOpen = true;
    Sound.playMenuSelect();

    this.overlay.classList.remove('hidden');
    this.speakerEl.textContent = 'chest for mowskito';
    this.passwordSection.classList.remove('hidden');
    this.passwordError.classList.add('hidden');
    this.passwordInput.value = '';
    this.btnSubmitText.textContent = 'Unlock';

    const message = chest.isOpened
      ? "chest for mowskito: The seal is broken, and the secret message has been revealed!"
      : "chest for mowskito... A heavy iron lock seals this chest! Enter the password to open it:";

    this.typewrite(message, () => {
      if (!chest.isOpened) {
        setTimeout(() => this.passwordInput.focus(), 50);
      } else {
        this.passwordSection.classList.add('hidden');
      }
    });
  }

  /**
   * Typewriter text animation with retro sound blips
   */
  typewrite(text, onComplete) {
    clearInterval(this.typewriterInterval);
    this.textEl.textContent = '';
    this.isTyping = true;
    this.nextIndicator.classList.add('hidden');

    let i = 0;
    this.typewriterInterval = setInterval(() => {
      if (i < text.length) {
        this.textEl.textContent += text.charAt(i);
        if (i % 2 === 0 && text.charAt(i) !== ' ') {
          Sound.playTypewriter();
        }
        i++;
      } else {
        clearInterval(this.typewriterInterval);
        this.isTyping = false;
        this.nextIndicator.classList.remove('hidden');
        if (onComplete) onComplete();
      }
    }, 20);
  }

  /**
   * Handles password submission and verification
   */
  async handlePasswordSubmit() {
    if (this.activeChest && this.activeChest.isOpened) {
      this.close();
      this.showReward();
      return;
    }

    const candidate = this.passwordInput.value.trim();
    if (!candidate) {
      this.showError("Please enter a password!");
      return;
    }

    const isValid = await verifyPassword(candidate);

    if (isValid) {
      // Correct Password — launch lockpick minigame before revealing the reward
      const chestRef = this.activeChest;
      this.close();
      Lockpick.start(() => {
        if (chestRef) chestRef.unlock();
        setTimeout(() => this.showReward(), 500);
      });

    } else {
      // Incorrect Password!
      Sound.playError();
      this.showError("❌ The lock won't budge! Wrong pawsword.");
      this.dialogBox.classList.add('shake-element');
      setTimeout(() => {
        this.dialogBox.classList.remove('shake-element');
      }, 450);
      this.passwordInput.select();
    }
  }

  showError(msg) {
    this.passwordError.textContent = msg;
    this.passwordError.classList.remove('hidden');
  }

  showReward() {
    this.rewardContent.textContent = CONFIG.SECRET_REWARD;
    this.rewardModal.classList.remove('hidden');
  }

  close() {
    clearInterval(this.typewriterInterval);
    this.isOpen = false;
    this.overlay.classList.add('hidden');
    this.passwordInput.blur();
    Sound.playMenuCancel();
  }

  updateProximityPrompt(chest, player, camera) {
    if (this.isOpen || !chest || !this.proximityPrompt) return;

    if (chest.isNear(player)) {
      const screenPos = camera.worldToScreen(chest.x + chest.width / 2, chest.y - 12);
      this.proximityPrompt.style.left = `${screenPos.x}px`;
      this.proximityPrompt.style.top = `${screenPos.y}px`;
      this.proximityPrompt.classList.remove('hidden');
    } else {
      this.proximityPrompt.classList.add('hidden');
    }
  }
}

const Dialog = new DialogController();
