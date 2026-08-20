/**
 * Heroine Player Entity
 * Mystic Realms - 2000s JRPG Web App
 */

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 48;
    this.height = 64;

    // Movement & Direction
    this.direction = 'down'; // 'down', 'up', 'left', 'right'
    this.vx = 0;
    this.vy = 0;
    this.isMoving = false;

    // Animation frames
    this.frameIndex = 0;
    this.animTimer = 0;
    this.frameSpeed = 140; // ms per walk frame

    // Footstep audio timing
    this.footstepTimer = 0;
  }

  /**
   * Collision bounding box (ground footprint)
   */
  getHitbox(targetX = this.x, targetY = this.y) {
    return {
      x: targetX + 12,
      y: targetY + 44,
      width: 24,
      height: 18
    };
  }

  /**
   * Center coordinate of the character
   */
  getCenter() {
    return {
      x: this.x + this.width / 2,
      y: this.y + this.height / 2
    };
  }

  update(deltaTime, map) {
    // If dialogue modal or settings are open, halt player movement
    if (window.gameInstance?.isDead || Dialog.isOpen || TypingBattle.active || TypingBattle.lossShowing || PizzaGame.active || PizzaGame.failShowing) {
      this.isMoving = false;
      this.frameIndex = 0;
      return;
    }

    let dx = 0;
    let dy = 0;

    if (Input.keys.up) dy -= 1;
    if (Input.keys.down) dy += 1;
    if (Input.keys.left) dx -= 1;
    if (Input.keys.right) dx += 1;

    this.isMoving = (dx !== 0 || dy !== 0);

    this.movedThisFrame = false;
    if (this.isMoving) {
      // Determine primary direction
      if (Math.abs(dx) > Math.abs(dy)) {
        this.direction = dx > 0 ? 'right' : 'left';
      } else {
        this.direction = dy > 0 ? 'down' : 'up';
      }

      // Normalize diagonal speed
      if (dx !== 0 && dy !== 0) {
        const length = Math.SQRT2;
        dx /= length;
        dy /= length;
      }

      const speed = Input.keys.shift ? CONFIG.PLAYER_RUN_SPEED : CONFIG.PLAYER_SPEED;
      const moveX = dx * speed;
      const moveY = dy * speed;

      // Axis-separated collision detection for smooth gliding along obstacles
      // 1. Try X movement
      const newHitboxX = this.getHitbox(this.x + moveX, this.y);
      if (!map.checkCollision(newHitboxX)) {
        this.x += moveX;
        this.movedThisFrame = true;
      }

      // 2. Try Y movement
      const newHitboxY = this.getHitbox(this.x, this.y + moveY);
      if (!map.checkCollision(newHitboxY)) {
        this.y += moveY;
        this.movedThisFrame = true;
      }

      // Animation frame advancement
      this.animTimer += deltaTime;
      const currentSpeed = Input.keys.shift ? (this.frameSpeed * 0.7) : this.frameSpeed;
      if (this.animTimer > currentSpeed) {
        this.animTimer = 0;
        this.frameIndex = (this.frameIndex + 1) % 4;
      }

      // Footstep sound
      this.footstepTimer += deltaTime;
      if (this.footstepTimer > (Input.keys.shift ? 220 : 320)) {
        this.footstepTimer = 0;
        Sound.playStep();
      }
    } else {
      // Idle state
      this.frameIndex = 0;
      this.animTimer = 0;
      this.footstepTimer = 0;
    }
  }

  render(ctx, camera) {
    const screenPos = camera.worldToScreen(this.x, this.y);
    const spritesList = Sprites.heroSprites[this.direction];
    const sprite = (spritesList && spritesList[this.frameIndex]) ? spritesList[this.frameIndex] : spritesList[0];

    if (sprite) {
      ctx.drawImage(sprite, screenPos.x, screenPos.y, this.width, this.height);
    }
  }
}
