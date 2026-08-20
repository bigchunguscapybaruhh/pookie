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
    this.activeChef = null;
    this.activeGraveyardGoof = null;
    this.activeCaveCat = null;
    this.activeClown = null;
    this.dialogLocked = false;
    this.chefStep = 0;

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
    this.btnCancel.addEventListener('click', () => {
      if (this.activeChef && this.chefStep === 1) this.advanceChefDialog();
      else this.close();
    });

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

  openPizzaChef(chef) {
    this.activeChef = chef; this.chefStep = 0; this.isOpen = true;
    this.overlay.classList.remove('hidden'); this.speakerEl.textContent = 'CHEF PIZZARONI';
    this.passwordSection.classList.add('hidden'); this.passwordError.classList.add('hidden');
    this.btnCancel.textContent = 'Leave'; this.btnSubmitText.textContent = 'Continue';
    this.typewrite("EYYYY, hungry little bat! Your boyfriend ate here already and exploded the whole toilet with diarrhea. I am hoping you don't do the same thing.");
  }

  openGraveyardGoof(goof) {
    this.activeGraveyardGoof = goof; this.goofStep = 0; this.dialogLocked = true; this.isOpen = true;
    this.overlay.classList.remove('hidden'); this.speakerEl.textContent = 'THE GRAVEYARD GOOF';
    this.passwordSection.classList.add('hidden'); this.passwordError.classList.add('hidden');
    this.btnCancel.classList.add('hidden'); this.btnSubmitText.textContent = '...okay';
    this.typewrite("bro how slow are you to let me catch you, you didn't even make an effort zzzzzzzzz");
  }

  openCaveCat(cat, number) {
    this.activeCaveCat = cat; this.caveStep = 0; this.caveNumber = number; this.isOpen = true;
    this.overlay.classList.remove('hidden'); this.speakerEl.textContent = cat.name;
    this.passwordSection.classList.add('hidden'); this.passwordError.classList.add('hidden'); this.btnCancel.classList.add('hidden'); this.btnSubmitText.textContent = 'Continue';
    this.typewrite(cat.lines[0]);
  }
  openFrogClown(clown) {
    this.activeClown=clown;this.clownStep=0;this.isOpen=true;this.overlay.classList.remove('hidden');this.speakerEl.textContent='THE FROG CLOWN';this.passwordSection.classList.add('hidden');this.passwordError.classList.add('hidden');this.btnCancel.classList.add('hidden');this.btnSubmitText.textContent='...rude';
    Sound.setClownMusic(true);
    this.typewrite('WOW. A frog that used to be a person. Did the witch run out of normal punishments or did you simply dodge with your face?');
  }
  advanceClown(){if(this.isTyping)return;const lines=['Your outfit is very damp. Your career as a human has been replaced by one strong hop and an alarming croak.','I have seen bread dodge better than you. A wet bread roll. It was in a bag and still had more tactical awareness.','Luckily for you, I am licensed in reverse-clownification. Complete my very honest test and I will turn you back. Probably.'];if(this.clownStep<lines.length){this.clownStep++;this.btnSubmitText.textContent=this.clownStep===lines.length?'Do the test':'Keep yapping';this.typewrite(lines[this.clownStep-1]);}else{this.close();ClownGame.start(()=>window.gameInstance.cureFrog());}}
  advanceCaveCat() {
    if (this.isTyping) return;
    this.caveStep++;
    if (this.caveStep < this.activeCaveCat.lines.length) this.typewrite(this.activeCaveCat.lines[this.caveStep]);
    else { this.dialogLocked = false; this.close(); }
  }

  advanceGraveyardGoofDialog() {
    if (this.isTyping) return;
    const nonsense = [
      "now that we're here anyway, let me tell you about my business idea: haunted socks. They scream when wet, which is basically customer feedback.",
      "My cousin is a decorative spoon. He is doing great, except he keeps trying to pay rent in soup. The landlord is a bat, so it gets complicated.",
      "Also I once tried to scare a pigeon, but it stared at me so hard I apologised and gave it my lunch money.",
      "Anyway, thanks for attending my seminar. I have no pamphlets because I ate them. You may leave now."
    ];
    if (this.goofStep < nonsense.length) {
      this.goofStep++; this.btnSubmitText.textContent = this.goofStep === nonsense.length ? 'Finally...' : 'Please stop...';
      this.typewrite(nonsense[this.goofStep - 1]);
    } else { this.dialogLocked = false; this.close(); }
  }

  advanceChefDialog() {
    if (this.isTyping) return;
    if (this.chefStep === 0) {
      this.chefStep = 1; this.btnSubmitText.textContent = 'Tuna pizza'; this.btnCancel.textContent = 'Chicken pizza';
      this.typewrite('Choose your destiny: a tuna pizza, or a chicken pizza? Both are medically adventurous.');
    } else if (this.chefStep === 1) {
      this.chefStep = 2; this.btnCancel.classList.add('hidden'); this.btnSubmitText.textContent = 'Start eating';
      this.typewrite('Perfetto, but you will need to eat the pizza with a knife and fork! No hands allowed!!');
    } else {
      this.close(); this.btnCancel.classList.remove('hidden'); PizzaGame.start(() => window.gameInstance.finishPizzaQuest());
    }
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
    if (this.activeClown) { this.advanceClown(); return; }
    if (this.activeCaveCat) { this.advanceCaveCat(); return; }
    if (this.activeGraveyardGoof) { this.advanceGraveyardGoofDialog(); return; }
    if (this.activeChef) { this.advanceChefDialog(); return; }
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
    if (this.dialogLocked) return;
    clearInterval(this.typewriterInterval);
    this.isOpen = false;
    this.overlay.classList.add('hidden');
    this.passwordInput.blur();
    if (this.activeGraveyardGoof) this.activeGraveyardGoof.giveUp();
    if (this.activeClown) Sound.setClownMusic(false);
    this.activeGraveyardGoof = null;
    this.activeCaveCat = null;
    this.activeClown = null;
    this.dialogLocked = false;
    this.activeChef = null;
    this.btnCancel.textContent = 'Cancel';
    this.btnCancel.classList.remove('hidden');
    Sound.playMenuCancel();
  }

  updateProximityPrompt(chest, player, camera, chef) {
    if (this.isOpen || !this.proximityPrompt) return;

    if (chef && chef.isNear(player)) {
      const screenPos = camera.worldToScreen(chef.x + chef.width / 2, chef.y - 12);
      this.proximityPrompt.style.left = `${screenPos.x}px`; this.proximityPrompt.style.top = `${screenPos.y}px`;
      this.proximityPrompt.querySelector('.prompt-text').textContent = 'Talk to chef'; this.proximityPrompt.classList.remove('hidden'); return;
    }

    if (!chest) { this.proximityPrompt.classList.add('hidden'); return; }

    if (chest.isNear(player)) {
      const screenPos = camera.worldToScreen(chest.x + chest.width / 2, chest.y - 12);
      this.proximityPrompt.style.left = `${screenPos.x}px`;
      this.proximityPrompt.style.top = `${screenPos.y}px`;
      this.proximityPrompt.querySelector('.prompt-text').textContent = 'Examine';
      this.proximityPrompt.classList.remove('hidden');
    } else {
      this.proximityPrompt.classList.add('hidden');
    }
  }
}

const Dialog = new DialogController();
