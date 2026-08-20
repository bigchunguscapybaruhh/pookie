/** A scary-looking but profoundly unserious graveyard chaser. */
class GraveyardGoof {
  constructor(x, y) {
    this.x = x; this.y = y; this.width = 44; this.height = 58;
    this.state = 'idle'; this.soundTimer = 0; this.fartTimer = 900 + Math.random() * 1700; this.fartCloud = 0;
  }
  getCenter() { return { x: this.x + 22, y: this.y + 34 }; }
  update(deltaTime, map, player, onCatch) {
    if (this.state === 'done' || this.state === 'caught') return;
    const me = this.getCenter(), them = player.getCenter(); const distance = Math.hypot(them.x - me.x, them.y - me.y);
    if (this.state === 'idle' && distance < 155) { this.state = 'chasing'; Sound.playZombieGroan(); }
    if (this.state !== 'chasing') return;
    this.soundTimer += deltaTime; this.fartTimer -= deltaTime;
    if (this.soundTimer > 1150) { this.soundTimer = 0; Sound.playZombieGroan(); }
    if (this.fartTimer <= 0) { this.fartTimer = 1800 + Math.random() * 3100; this.fartCloud = 850; Sound.playFart(); }
    this.fartCloud = Math.max(0, this.fartCloud - deltaTime);
    if (distance < 34) { this.state = 'caught'; onCatch(); return; }
    const scale = Math.min(1.45, deltaTime / 16.67); const speed = 1.25 * scale;
    const dx = (them.x - me.x) / distance * speed, dy = (them.y - me.y) / distance * speed;
    const hitbox = { x: this.x + dx + 10, y: this.y + dy + 36, width: 24, height: 18 };
    if (!map.checkCollision(hitbox)) { this.x += dx; this.y += dy; }
  }
  giveUp() { this.state = 'done'; }
  render(ctx, camera) {
    const p = camera.worldToScreen(this.x, this.y);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.42)'; ctx.fillRect(p.x + 5, p.y + 51, 35, 5);
    // Crooked skeleton: oversized skull, uneven ribs, tiny limbs, very little dignity.
    ctx.fillStyle = '#211a29'; ctx.fillRect(p.x + 10, p.y + 5, 25, 22); ctx.fillStyle = '#e8dfc9'; ctx.fillRect(p.x + 12, p.y + 6, 21, 18); ctx.fillStyle = '#fff7da'; ctx.fillRect(p.x + 15, p.y + 7, 14, 4);
    ctx.fillStyle = '#20182a'; ctx.fillRect(p.x + 16, p.y + 13, 5, 5); ctx.fillRect(p.x + 27, p.y + 12, 5, 6); ctx.fillRect(p.x + 21, p.y + 21, 8, 3);
    ctx.fillStyle = '#d8cdaF'; ctx.fillRect(p.x + 21, p.y + 26, 4, 20); ctx.fillRect(p.x + 14, p.y + 30, 18, 3); ctx.fillRect(p.x + 14, p.y + 36, 18, 3); ctx.fillRect(p.x + 16, p.y + 42, 14, 3);
    ctx.fillStyle = '#e8dfc9'; ctx.fillRect(p.x + 4, p.y + 31, 13, 3); ctx.fillRect(p.x + 29, p.y + 36, 12, 3); ctx.fillRect(p.x + 13, p.y + 46, 8, 3); ctx.fillRect(p.x + 26, p.y + 46, 8, 3); ctx.fillRect(p.x + 10, p.y + 49, 4, 7); ctx.fillRect(p.x + 30, p.y + 49, 4, 7);
    if (this.state === 'chasing' && this.fartCloud > 0) { ctx.globalAlpha = this.fartCloud / 850; ctx.font = '18px sans-serif'; ctx.fillText('💨', p.x - 9, p.y + 31); }
    ctx.restore();
  }
}
