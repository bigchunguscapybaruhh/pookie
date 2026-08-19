/**
 * Disguised Hidden Treasure Chest Entity
 * Mystic Realms - Cozy JRPG Web App
 */

class TreasureChest {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 48;
    this.height = 48;
    this.isOpened = false;

    // Subtle, occasional glint particle
    this.sparkles = [];
    this.sparkleTimer = 0;
    this.burstParticles = [];
  }

  getCenter() {
    return {
      x: this.x + this.width / 2,
      y: this.y + this.height / 2
    };
  }

  getHitbox() {
    return {
      x: this.x + 6,
      y: this.y + 14,
      width: 36,
      height: 30
    };
  }

  isNear(player) {
    const chestCenter = this.getCenter();
    const playerCenter = player.getCenter();
    const dist = Math.hypot(chestCenter.x - playerCenter.x, chestCenter.y - playerCenter.y);
    return dist <= CONFIG.CHEST_INTERACTION_RADIUS;
  }

  unlock() {
    this.isOpened = true;
    Sound.playChestOpen();

    // Celebration burst
    const center = this.getCenter();
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 5.0;
      const colors = ['#ffea00', '#ff80ab', '#ffffff', '#ff4081', '#00e5ff', '#76ff03'];
      this.burstParticles.push({
        x: center.x,
        y: center.y - 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.8,
        size: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1.0,
        decay: 0.015 + Math.random() * 0.02
      });
    }
  }

  update(deltaTime) {
    // Occasional subtle glint to give observant players a hint
    this.sparkleTimer += deltaTime;
    if (this.sparkleTimer > 1800) { // Glint every 1.8 seconds
      this.sparkleTimer = 0;
      this.sparkles.push({
        x: this.x + 18 + Math.random() * 12,
        y: this.y + 18 + Math.random() * 10,
        vy: -0.2,
        size: 2,
        alpha: 0.9,
        color: '#ffea52'
      });
    }

    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const p = this.sparkles[i];
      p.y += p.vy;
      p.alpha -= 0.03;
      if (p.alpha <= 0) {
        this.sparkles.splice(i, 1);
      }
    }

    // Update burst particles
    for (let i = this.burstParticles.length - 1; i >= 0; i--) {
      const p = this.burstParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= p.decay;
      if (p.life <= 0) {
        this.burstParticles.splice(i, 1);
      }
    }
  }

  render(ctx, camera) {
    const screenPos = camera.worldToScreen(this.x, this.y);

    // Disguised Chest Sprite
    const sprite = this.isOpened ? Sprites.chestSprites.open : Sprites.chestSprites.closed;
    if (sprite) {
      ctx.drawImage(sprite, screenPos.x, screenPos.y, this.width, this.height);
    }

    // Subtle Glint Pixel
    this.sparkles.forEach(p => {
      const pScreen = camera.worldToScreen(p.x, p.y);
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(pScreen.x - p.size, pScreen.y, p.size * 2, 1);
      ctx.fillRect(pScreen.x, pScreen.y - p.size, 1, p.size * 2);
      ctx.restore();
    });

    // Celebration burst particles
    this.burstParticles.forEach(p => {
      const pScreen = camera.worldToScreen(p.x, p.y);
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(pScreen.x, pScreen.y, p.size, p.size);
      ctx.restore();
    });
  }
}
