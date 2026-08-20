/** Tiny static collectible spiders, in assorted suspicious colors. */
class CollectibleSpider {
  constructor(x, y, color) {
    this.x = x; this.y = y; this.width = 28; this.height = 22; this.color = color; this.collected = false;
  }
  getCenter() { return { x: this.x + 14, y: this.y + 12 }; }
  isNear(player) { const a = this.getCenter(), b = player.getCenter(); return Math.hypot(a.x - b.x, a.y - b.y) < 48; }
  render(ctx, camera) {
    if (this.collected) return;
    const p = camera.worldToScreen(this.x, this.y);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.fillRect(p.x + 3, p.y + 17, 22, 3);
    ctx.strokeStyle = this.color; ctx.lineWidth = 2;
    [[7,11,1,6], [9,13,4,19], [19,11,25,6], [17,13,22,19]].forEach(a => { ctx.beginPath(); ctx.moveTo(p.x + a[0], p.y + a[1]); ctx.lineTo(p.x + a[2], p.y + a[3]); ctx.stroke(); });
    ctx.fillStyle = '#1b1022'; ctx.fillRect(p.x + 8, p.y + 7, 12, 10); ctx.fillStyle = this.color; ctx.fillRect(p.x + 10, p.y + 8, 8, 8);
    ctx.fillStyle = '#f8f5d0'; ctx.fillRect(p.x + 11, p.y + 9, 2, 2); ctx.fillRect(p.x + 16, p.y + 9, 2, 2);
    ctx.restore();
  }
}
