/**
 * Smooth Tracking Camera System
 * Mystic Realms - 2000s JRPG Web App
 */

class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;
    this.worldWidth = CONFIG.MAP_WIDTH * CONFIG.TILE_SIZE;
    this.worldHeight = CONFIG.MAP_HEIGHT * CONFIG.TILE_SIZE;
    this.zoom = 1; // Crisp integer scaling
    this.target = null;
    this.lerpSpeed = 0.12; // Smooth camera follow
  }

  resize(w, h) {
    this.viewportWidth = w;
    this.viewportHeight = h;
  }

  follow(targetEntity) {
    this.target = targetEntity;
  }

  update() {
    if (!this.target) return;

    // Desired camera position (centered on target)
    const targetCamX = this.target.x + this.target.width / 2 - this.viewportWidth / 2;
    const targetCamY = this.target.y + this.target.height / 2 - this.viewportHeight / 2;

    // Smooth Lerp
    this.x += (targetCamX - this.x) * this.lerpSpeed;
    this.y += (targetCamY - this.y) * this.lerpSpeed;

    // Clamp camera within map bounds
    if (this.worldWidth > this.viewportWidth) {
      this.x = Math.max(0, Math.min(this.x, this.worldWidth - this.viewportWidth));
    } else {
      this.x = (this.worldWidth - this.viewportWidth) / 2; // Center small maps
    }

    if (this.worldHeight > this.viewportHeight) {
      this.y = Math.max(0, Math.min(this.y, this.worldHeight - this.viewportHeight));
    } else {
      this.y = (this.worldHeight - this.viewportHeight) / 2;
    }
  }

  /**
   * Converts world coordinates to screen pixel coordinates
   */
  worldToScreen(worldX, worldY) {
    return {
      x: Math.round(worldX - this.x),
      y: Math.round(worldY - this.y)
    };
  }

  /**
   * Converts screen pixel coordinates (e.g. mouse click) to world coordinates
   */
  screenToWorld(screenX, screenY) {
    return {
      x: screenX + this.x,
      y: screenY + this.y
    };
  }
}
