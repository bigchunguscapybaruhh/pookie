/** A suspiciously well-hidden chef, drawn in the game's hand-made pixel style. */
class PizzaChef {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 48;
    this.height = 58;
    this.bob = 0;
  }

  getCenter() { return { x: this.x + 24, y: this.y + 30 }; }
  isNear(player) {
    const a = this.getCenter(), b = player.getCenter();
    return Math.hypot(a.x - b.x, a.y - b.y) <= CONFIG.NPC_INTERACTION_RADIUS;
  }
  update(deltaTime) { this.bob += deltaTime * 0.004; }
  render(ctx, camera) {
    const p = camera.worldToScreen(this.x, this.y + Math.sin(this.bob) * 1.5);
    ctx.save();
    // shadow, floury coat, flamboyant hat and pizza tray
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(p.x + 7, p.y + 51, 35, 5);
    ctx.fillStyle = '#251526'; ctx.fillRect(p.x + 13, p.y + 11, 23, 21);
    ctx.fillStyle = '#f6d5b0'; ctx.fillRect(p.x + 16, p.y + 14, 17, 15);
    ctx.fillStyle = '#3b172c'; ctx.fillRect(p.x + 14, p.y + 18, 4, 4); ctx.fillRect(p.x + 31, p.y + 18, 4, 4);
    ctx.fillStyle = '#fff5dc'; ctx.fillRect(p.x + 10, p.y + 5, 29, 9); ctx.fillRect(p.x + 14, p.y, 8, 8); ctx.fillRect(p.x + 27, p.y + 1, 8, 7);
    ctx.fillStyle = '#c92243'; ctx.fillRect(p.x + 23, p.y + 27, 3, 4);
    ctx.fillStyle = '#f0e7dd'; ctx.fillRect(p.x + 11, p.y + 31, 26, 18); ctx.fillRect(p.x + 8, p.y + 34, 5, 13); ctx.fillRect(p.x + 37, p.y + 35, 5, 12);
    ctx.fillStyle = '#a51b34'; ctx.fillRect(p.x + 22, p.y + 32, 4, 17);
    ctx.fillStyle = '#2a1b2a'; ctx.fillRect(p.x + 14, p.y + 48, 8, 7); ctx.fillRect(p.x + 28, p.y + 48, 8, 7);
    ctx.fillStyle = '#d9ae78'; ctx.fillRect(p.x + 1, p.y + 38, 10, 3);
    ctx.fillStyle = '#dd8b30'; ctx.fillRect(p.x, p.y + 35, 11, 4); ctx.fillStyle = '#b92335'; ctx.fillRect(p.x + 4, p.y + 36, 2, 2);
    ctx.restore();
  }
}
