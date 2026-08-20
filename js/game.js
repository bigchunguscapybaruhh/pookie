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
    this.pizzaChef = null;
    this.hunger = 20;
    this.hungerTimer = 0;
    this.isDead = false;
    this.spiders = [];
    this.spiderCount = 0;
    this.graveyardGoof = null;
    this.walkingTime = 0;
    this.encounterAt = this.rollEncounterDistance();

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
    // He is tucked in the southeast grove, between the trees and off the main path.
    this.pizzaChef = new PizzaChef(50 * CONFIG.TILE_SIZE, 26 * CONFIG.TILE_SIZE);
    this.spawnSpiders();
    // Hanging around the graveyard's lower edge, where it can sneak up from behind headstones.
    this.graveyardGoof = new GraveyardGoof(14 * CONFIG.TILE_SIZE, 10 * CONFIG.TILE_SIZE);
    this.updateHungerUI();
    this.updateSpiderUI();

    // 6. Hook camera to player
    this.camera.follow(this.player);

    // 7. Mouse/Touch Click to interact with chest
    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

    // 8. Start Game Loop
    this.isRunning = true;
    this.lastTime = performance.now();
    requestAnimationFrame((time) => this.loop(time));

    document.getElementById('deathOverlay').addEventListener('click', () => window.location.reload());

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
    if (!this.player || Dialog.isOpen || Lockpick.isActive || PizzaGame.active || PizzaGame.failShowing) return;

    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPos = this.camera.screenToWorld(screenX, screenY);

    const clickedSpider = this.spiders.find(spider => !spider.collected && spider.isNear(this.player) && Math.hypot(worldPos.x - spider.getCenter().x, worldPos.y - spider.getCenter().y) < 38);
    if (clickedSpider) { this.collectSpider(clickedSpider); return; }

    const chestCenter = this.chest.getCenter();
    const clickDist = Math.hypot(worldPos.x - chestCenter.x, worldPos.y - chestCenter.y);

    if (clickDist < 48 && this.chest.isNear(this.player)) {
      Dialog.openChestPrompt(this.chest);
    }

    if (this.pizzaChef) {
      const chefCenter = this.pizzaChef.getCenter();
      if (Math.hypot(worldPos.x - chefCenter.x, worldPos.y - chefCenter.y) < 52 && this.pizzaChef.isNear(this.player)) {
        Dialog.openPizzaChef(this.pizzaChef);
      }
    }
  }

  updateHungerUI() {
    const value = document.getElementById('hungerValue');
    const fill = document.getElementById('hungerFill');
    const quest = document.getElementById('hungerQuest');
    if (value) value.textContent = this.hunger;
    if (fill) fill.style.width = `${this.hunger}%`;
    if (quest) quest.textContent = this.hunger >= 100 ? 'Quest complete: gloriously full. 🍕' : 'Quest: find something suspiciously edible...';
  }

  finishPizzaQuest() { this.hunger = 100; this.updateHungerUI(); }

  updateHunger(deltaTime) {
    this.hungerTimer += deltaTime;
    while (this.hungerTimer >= 5000 && this.hunger > 0) {
      this.hungerTimer -= 5000; this.hunger--; this.updateHungerUI();
    }
    if (this.hunger <= 0 && !this.isDead) this.dieOfHunger();
  }

  dieOfHunger() {
    this.isDead = true; this.hunger = 0; this.updateHungerUI();
    document.getElementById('deathOverlay').classList.remove('hidden'); Sound.playHungerDeath();
  }

  spawnSpiders() {
    const colors = ['#f05b82', '#8ad768', '#a67cf3', '#f0c44d', '#56c8d8', '#f08d4d', '#e9e9f0', '#8c5e44'];
    const spots = [];
    const S = CONFIG.TILE_SIZE;
    let attempts = 0;
    while (spots.length < 8 && attempts++ < 900) {
      const tx = 3 + Math.floor(Math.random() * (this.map.width - 6));
      const ty = 3 + Math.floor(Math.random() * (this.map.height - 6));
      const x = tx * S + 10, y = ty * S + 18;
      const fromSpawn = Math.hypot(tx - this.map.spawnPoint.x, ty - this.map.spawnPoint.y);
      const tooClose = spots.some(s => Math.hypot(s.x - x, s.y - y) < S * 5);
      // Grass only keeps them away from the obvious roads; collision check keeps every spider reachable.
      if (fromSpawn < 11 || tooClose || this.map.tiles[ty][tx] === TILE_TYPES.PATH || this.map.checkCollision({ x: x + 5, y: y + 5, width: 16, height: 16 })) continue;
      spots.push({ x, y });
    }
    this.spiders = spots.map((spot, index) => new CollectibleSpider(spot.x, spot.y, colors[index]));
  }

  updateSpiderUI() { const count = document.getElementById('spiderCount'); if (count) count.textContent = this.spiderCount; }

  collectSpider(spider) {
    if (!spider || spider.collected) return;
    spider.collected = true; this.spiderCount++; this.updateSpiderUI(); Sound.playSpiderCollect();
    if (this.spiderCount === this.spiders.length) this.showSpiderAchievement();
  }

  showSpiderAchievement() {
    const achievement = document.createElement('div'); achievement.className = 'spider-achievement';
    achievement.innerHTML = '<div>🏆 SPOODER ACHIEVEMENT UNLOCKED 🏆</div><strong>congratz you beat your fear of spooders (u freak)</strong>';
    document.body.appendChild(achievement); setTimeout(() => achievement.remove(), 5200);
  }

  nearbySpider() { return this.spiders.find(spider => !spider.collected && spider.isNear(this.player)); }

  rollEncounterDistance() { return 4500 + Math.random() * 2000; }

  updateEncounters(deltaTime) {
    if (TypingBattle.active || TypingBattle.lossShowing || Dialog.isOpen || Lockpick.isActive || PizzaGame.active || PizzaGame.failShowing) return;
    // The streak only counts real movement. Bumping into a wall or stopping resets it.
    if (this.player.movedThisFrame) {
      this.walkingTime += deltaTime;
      if (this.walkingTime >= this.encounterAt) {
        this.walkingTime = 0; this.encounterAt = this.rollEncounterDistance(); TypingBattle.start();
      }
    } else this.walkingTime = 0;
  }

  update(deltaTime) {
    if (this.isDead) return;
    this.updateHunger(deltaTime);
    if (this.isDead) return;
    // 1. Update Player
    this.player.update(deltaTime, this.map);

    // 2. Update Chest & Particles
    if (this.chest) {
      this.chest.update(deltaTime);
    }
    if (this.pizzaChef) this.pizzaChef.update(deltaTime);
    if (this.graveyardGoof && !Dialog.isOpen && !TypingBattle.active && !TypingBattle.lossShowing && !PizzaGame.active && !PizzaGame.failShowing) {
      this.graveyardGoof.update(deltaTime, this.map, this.player, () => Dialog.openGraveyardGoof(this.graveyardGoof));
    }
    this.updateEncounters(deltaTime);

    // 3. Handle Chest Interaction via Action Key (Space / Enter / Mobile button)
    if (Input.consumeAction() && !Dialog.isOpen && !Lockpick.isActive && !PizzaGame.active && !PizzaGame.failShowing && !TypingBattle.active && !TypingBattle.lossShowing) {
      const spider = this.nearbySpider();
      if (spider) this.collectSpider(spider);
      else if (this.pizzaChef && this.pizzaChef.isNear(this.player)) Dialog.openPizzaChef(this.pizzaChef);
      else if (this.chest && this.chest.isNear(this.player)) Dialog.openChestPrompt(this.chest);
    }

    // 4. Update Camera
    this.camera.update();

    // 5. Update UI Proximity Indicators
    Dialog.updateProximityPrompt(this.chest, this.player, this.camera, this.pizzaChef);
    const spider = this.nearbySpider();
    if (spider && !Dialog.isOpen && !Lockpick.isActive && !PizzaGame.active && !PizzaGame.failShowing && !TypingBattle.active && !TypingBattle.lossShowing) {
      const screen = this.camera.worldToScreen(spider.x + 14, spider.y - 8);
      const prompt = document.getElementById('proximityPrompt');
      prompt.style.left = `${screen.x}px`; prompt.style.top = `${screen.y}px`;
      prompt.querySelector('.prompt-text').textContent = 'Catch spooder'; prompt.classList.remove('hidden');
    }
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

    if (this.pizzaChef) {
      renderList.push({ depthY: this.pizzaChef.y + this.pizzaChef.height, render: () => this.pizzaChef.render(ctx, camera) });
    }

    if (this.graveyardGoof) {
      renderList.push({ depthY: this.graveyardGoof.y + this.graveyardGoof.height, render: () => this.graveyardGoof.render(ctx, camera) });
    }

    this.spiders.forEach(spider => renderList.push({ depthY: spider.y + spider.height, render: () => spider.render(ctx, camera) }));

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
