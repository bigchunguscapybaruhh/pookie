/**
 * Main Game Loop & Coordinator
 * Mystic Realms - Cozy JRPG Web App
 */

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this.map = new GameMap();
    this.camera = new Camera();
    this.player = null;
    this.chest = null;

    this.lastTime = 0;
    this.isRunning = false;

    window.gameInstance = this;
  }

  async init() {
    // 1. Resize canvas to full window
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());

    // 2. Initialize Sprites & Textures
    await Sprites.init();

    // 3. Initialize Map & Village Placement
    this.map.init();

    // 4. Initialize Player at spawn point
    const spawnWorldX = this.map.spawnPoint.x * CONFIG.TILE_SIZE;
    const spawnWorldY = this.map.spawnPoint.y * CONFIG.TILE_SIZE;
    this.player = new Player(spawnWorldX, spawnWorldY);

    // 5. Initialize Disguised Treasure Chest
    this.spawnChest();

    // 6. Hook camera to player
    this.camera.follow(this.player);

    // 7. Mouse/Touch Click to interact with chest
    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

    // 8. Start Game Loop
    this.isRunning = true;
    this.lastTime = performance.now();
    requestAnimationFrame((time) => this.loop(time));

    console.log("🌸 Mystic Village initialized successfully!");
  }

  handleResize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx.imageSmoothingEnabled = false;
    this.camera.resize(this.canvas.width, this.canvas.height);
    Input.checkTouchDevice();
  }

  spawnChest() {
    const chestPos = this.map.pickCamouflagedChestLocation();
    this.chest = new TreasureChest(chestPos.worldX, chestPos.worldY);
  }

  respawnChest() {
    this.spawnChest();
  }

  handleCanvasClick(e) {
    Sound.ensureContext();
    if (!this.chest || !this.player || Dialog.isOpen) return;

    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPos = this.camera.screenToWorld(screenX, screenY);

    const chestCenter = this.chest.getCenter();
    const clickDist = Math.hypot(worldPos.x - chestCenter.x, worldPos.y - chestCenter.y);

    if (clickDist < 48 && this.chest.isNear(this.player)) {
      Dialog.openChestPrompt(this.chest);
    }
  }

  update(deltaTime) {
    // 1. Update Player
    this.player.update(deltaTime, this.map);

    // 2. Update Chest & Particles
    if (this.chest) {
      this.chest.update(deltaTime);
    }

    // 3. Handle Chest Interaction via Action Key (Space / Enter / Mobile button)
    if (Input.consumeAction() && this.chest && this.chest.isNear(this.player)) {
      if (!Dialog.isOpen) {
        Dialog.openChestPrompt(this.chest);
      }
    }

    // 4. Update Camera
    this.camera.update();

    // 5. Update UI Proximity Indicators
    Dialog.updateProximityPrompt(this.chest, this.player, this.camera);
  }

  render() {
    const ctx = this.ctx;
    const camera = this.camera;

    // Clear Canvas with spring green background
    ctx.fillStyle = '#a3dc72';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. Render Ground Terrain Tiles (Grass, Dirt Paths, Gardens, Crops)
    this.map.renderGround(ctx, camera);

    // 2. Depth-Sorted Rendering (Y-Sorting) for Entities, Buildings, Trees, and Props
    const renderList = [];

    // Add Player
    renderList.push({
      depthY: this.player.y + this.player.height,
      render: () => this.player.render(ctx, camera)
    });

    // Add Chest
    if (this.chest) {
      renderList.push({
        depthY: this.chest.y + this.chest.height,
        render: () => this.chest.render(ctx, camera)
      });
    }

    // Add Village Buildings (Blue Crescent House, Pink Cottage, Farmhouse)
    this.map.buildings.forEach(bldg => {
      const screenPos = camera.worldToScreen(bldg.x, bldg.y);
      if (screenPos.x > -bldg.width && screenPos.x < camera.viewportWidth + bldg.width &&
          screenPos.y > -bldg.height && screenPos.y < camera.viewportHeight + bldg.height) {
        renderList.push({
          depthY: bldg.depthY,
          render: () => {
            const tex = Sprites.propTextures[bldg.type];
            if (tex) ctx.drawImage(tex, screenPos.x, screenPos.y, bldg.width, bldg.height);
          }
        });
      }
    });

    // Add Trees (Fluffy Cherry & Apple Trees)
    this.map.trees.forEach(tree => {
      const screenPos = camera.worldToScreen(tree.x, tree.y);
      if (screenPos.x > -tree.width && screenPos.x < camera.viewportWidth + tree.width &&
          screenPos.y > -tree.height && screenPos.y < camera.viewportHeight + tree.height) {
        renderList.push({
          depthY: tree.depthY,
          render: () => {
            const tex = Sprites.propTextures[tree.type];
            if (tex) ctx.drawImage(tex, screenPos.x, screenPos.y, tree.width, tree.height);
          }
        });
      }
    });

    // Add Props (Fences, Giant Mushroom, Sheep, Worktable)
    this.map.props.forEach(prop => {
      const screenPos = camera.worldToScreen(prop.x, prop.y);
      if (screenPos.x > -prop.width && screenPos.x < camera.viewportWidth + prop.width &&
          screenPos.y > -prop.height && screenPos.y < camera.viewportHeight + prop.height) {
        renderList.push({
          depthY: prop.depthY,
          render: () => {
            const tex = Sprites.propTextures[prop.type];
            if (tex) ctx.drawImage(tex, screenPos.x, screenPos.y, prop.width, prop.height);
          }
        });
      }
    });

    // Sort by depthY ascending
    renderList.sort((a, b) => a.depthY - b.depthY);

    // Execute render calls in sorted order
    renderList.forEach(item => item.render());
  }

  loop(currentTime) {
    if (!this.isRunning) return;

    const deltaTime = Math.min(currentTime - this.lastTime, 100);
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame((time) => this.loop(time));
  }
}

// Start Game on Page Load
window.addEventListener('load', () => {
  const game = new Game();
  game.init();
});
