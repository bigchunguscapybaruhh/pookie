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
    this.bossHouse = null;
    this.rabbitHole = null;
    this.caveMode = false;
    this.caveCats = []; this.caveDog = null; this.caveNumbers = [];
    this.caveMap = { checkCollision: rect => rect.x < 40 || rect.x + rect.width > 920 || rect.y < 80 || rect.y + rect.height > 600 };
    this.isFrog = false;
    this.frogClown = null;
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
    this.bossHouse = new BossHouse(51 * CONFIG.TILE_SIZE, 36 * CONFIG.TILE_SIZE);
    this.rabbitHole = new RabbitHole(5 * CONFIG.TILE_SIZE, 31 * CONFIG.TILE_SIZE);
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
    if (!this.player || Dialog.isOpen || Lockpick.isActive || PizzaGame.active || PizzaGame.failShowing || BossBattle.active || NumberDog.active) return;

    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPos = this.camera.screenToWorld(screenX, screenY);

    const clickedSpider = this.spiders.find(spider => !spider.collected && spider.isNear(this.player) && Math.hypot(worldPos.x - spider.getCenter().x, worldPos.y - spider.getCenter().y) < 38);
    if (clickedSpider) { this.collectSpider(clickedSpider); return; }

    if (this.isFrog && this.frogClown?.isNear(this.player) && Math.hypot(worldPos.x-(this.frogClown.x+24),worldPos.y-(this.frogClown.y+30))<48) { Dialog.openFrogClown(this.frogClown); return; }

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
    if (!this.isFrog && this.bossHouse && this.bossHouse.isNear(this.player) && Math.hypot(worldPos.x - this.bossHouse.getCenter().x, worldPos.y - this.bossHouse.getCenter().y) < 90) BossBattle.start();
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
  turnIntoFrog() { this.isFrog = true; this.frogClown = new FrogClown(30 * CONFIG.TILE_SIZE, 19 * CONFIG.TILE_SIZE); Sound.playError(); }
  cureFrog() { this.isFrog=false;this.frogClown=null;Sound.playChestOpen(); }
  enterCave() {
    this.caveMode = true; this.caveNumbers = []; this.caveCats = [];
    const names = ['SIR MEOWINGTON','PUDDLES','LORD CRUMB','BINGUS PRIME','MRS. WHISKERBLAST']; const colors = ['#e8a4b5','#d9c475','#9ec2df','#d5a5ec','#eab082'];
    const positions = [[170,170],[430,140],[700,185],[275,410],[650,430]];
    const yaps = [
      ['I invented a new sport called competitive blinking. I am undefeated because everyone keeps missing the important part.','My coach is a lampshade. He says I need to believe in myself, but he is plugged into nothing.'],
      ['I tried to bake a cake using only vibes and a library card. It tasted like a very disappointed bookshelf.','Then the cake sued me for emotional damages. The judge was a hamster wearing glasses.'],
      ['Do you ever look at a spoon and wonder if it is just a tiny shovel for soup emergencies?','I asked the cave wall that exact question and now it will not make eye contact with me.'],
      ['I own a business selling invisible hats for ghosts. Sales are terrible, but the customers are incredibly transparent.','My accountant is a frog, which sounds relevant, but I refuse to explain why.'],
      ['Yesterday I got into an argument with a sock. It said I was being too foot-focused.','Anyway, I am taking a personal day to process this betrayal and eat one crunchy moon pebble.']
    ];
    positions.forEach((p,i) => { let n; do { n = 1 + Math.floor(Math.random()*25); } while (this.caveNumbers.includes(n)); this.caveNumbers.push(n); const cat = new CaveCat(p[0],p[1],colors[i],names[i],i); cat.lines=[...yaps[i],`oh yeah all of that aside, the number ${n} is pretty cool. wink wink. Remember it.`]; this.caveCats.push(cat); });
    this.caveDog = new CaveDog(842,260); this.player.x=95; this.player.y=305; this.camera.x=0; this.camera.y=0; Sound.setCaveMusic(true);
  }
  exitCave() { this.caveMode=false; this.player.x=this.rabbitHole.x+80; this.player.y=this.rabbitHole.y+30; Sound.setCaveMusic(false); }

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
    if (this.caveMode) { this.walkingTime = 0; return; }
    if (TypingBattle.active || TypingBattle.lossShowing || BossBattle.active || Dialog.isOpen || Lockpick.isActive || PizzaGame.active || PizzaGame.failShowing) return;
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
    this.player.update(deltaTime, this.caveMode ? this.caveMap : this.map);

    // 2. Update Chest & Particles
    if (this.chest) {
      this.chest.update(deltaTime);
    }
    if (this.pizzaChef) this.pizzaChef.update(deltaTime);
    if (this.caveMode === false && this.frogClown === null && !this.isFrog) { /* clown only exists for frogs */ }
    if (this.caveMode && this.rabbitHole) { /* cave is intentionally quiet except for cats and dog */ }
    if (!this.caveMode && this.graveyardGoof && !Dialog.isOpen && !TypingBattle.active && !TypingBattle.lossShowing && !PizzaGame.active && !PizzaGame.failShowing) {
      this.graveyardGoof.update(deltaTime, this.map, this.player, () => Dialog.openGraveyardGoof(this.graveyardGoof));
    }
    this.updateEncounters(deltaTime);

    // 3. Handle Chest Interaction via Action Key (Space / Enter / Mobile button)
    if (Input.consumeAction() && !Dialog.isOpen && !Lockpick.isActive && !PizzaGame.active && !PizzaGame.failShowing && !TypingBattle.active && !TypingBattle.lossShowing && !BossBattle.active && !NumberDog.active) {
      if (this.caveMode) { const cat=this.caveCats.find(c=>c.isNear(this.player)); if(cat) Dialog.openCaveCat(cat,this.caveNumbers[cat.index]); else if(this.caveDog?.isNear(this.player)) NumberDog.start(this.caveNumbers,()=>this.exitCave()); return; }
      const spider = this.nearbySpider();
      if (spider) this.collectSpider(spider);
      else if (this.isFrog && this.frogClown?.isNear(this.player)) Dialog.openFrogClown(this.frogClown);
      else if (!this.isFrog && this.bossHouse && this.bossHouse.isNear(this.player)) BossBattle.start();
      else if (this.pizzaChef && this.pizzaChef.isNear(this.player)) Dialog.openPizzaChef(this.pizzaChef);
      else if (this.chest && this.chest.isNear(this.player)) Dialog.openChestPrompt(this.chest);
    }

    // 4. Update Camera
    this.camera.update();
    if (this.caveMode) { this.camera.x = 0; this.camera.y = 0; }

    // 5. Update UI Proximity Indicators
    if (!this.caveMode) Dialog.updateProximityPrompt(this.chest, this.player, this.camera, this.pizzaChef);
    else {
      const prompt=document.getElementById('proximityPrompt'); const cat=this.caveCats.find(c=>c.isNear(this.player));
      if (cat) { const screen=this.camera.worldToScreen(cat.x+22,cat.y-5);prompt.style.left=`${screen.x}px`;prompt.style.top=`${screen.y}px`;prompt.querySelector('.prompt-text').textContent='Listen to cat';prompt.classList.remove('hidden'); }
      else if(this.caveDog?.isNear(this.player)){const screen=this.camera.worldToScreen(this.caveDog.x+34,this.caveDog.y-5);prompt.style.left=`${screen.x}px`;prompt.style.top=`${screen.y}px`;prompt.querySelector('.prompt-text').textContent='Ask dog about ladder';prompt.classList.remove('hidden');}else prompt.classList.add('hidden');
    }
    if (!this.caveMode && this.rabbitHole?.isNear(this.player)) this.enterCave();
    const spider = this.nearbySpider();
    if (spider && !Dialog.isOpen && !Lockpick.isActive && !PizzaGame.active && !PizzaGame.failShowing && !TypingBattle.active && !TypingBattle.lossShowing && !BossBattle.active) {
      const screen = this.camera.worldToScreen(spider.x + 14, spider.y - 8);
      const prompt = document.getElementById('proximityPrompt');
      prompt.style.left = `${screen.x}px`; prompt.style.top = `${screen.y}px`;
      prompt.querySelector('.prompt-text').textContent = 'Catch spooder'; prompt.classList.remove('hidden');
    }
    if (!spider && !this.isFrog && this.bossHouse && this.bossHouse.isNear(this.player) && !BossBattle.active) {
      const screen = this.camera.worldToScreen(this.bossHouse.x + 78, this.bossHouse.y + 85);
      const prompt = document.getElementById('proximityPrompt');
      prompt.style.left = `${screen.x}px`; prompt.style.top = `${screen.y}px`;
      prompt.querySelector('.prompt-text').textContent = 'Definitely do not enter'; prompt.classList.remove('hidden');
    }
    if (!spider && this.isFrog && this.frogClown?.isNear(this.player)) { const screen=this.camera.worldToScreen(this.frogClown.x+24,this.frogClown.y-5);const prompt=document.getElementById('proximityPrompt');prompt.style.left=`${screen.x}px`;prompt.style.top=`${screen.y}px`;prompt.querySelector('.prompt-text').textContent='Ask clown for help';prompt.classList.remove('hidden'); }
  }

  render() {
    const ctx = this.ctx;
    const camera = this.camera;

    if (this.caveMode) { this.renderCave(ctx); return; }
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
    if (this.bossHouse) renderList.push({ depthY: this.bossHouse.y + this.bossHouse.height, render: () => this.bossHouse.render(ctx, camera) });
    if (this.frogClown) renderList.push({ depthY:this.frogClown.y+this.frogClown.height,render:()=>this.frogClown.render(ctx,camera) });
    if (this.rabbitHole) renderList.push({ depthY: this.rabbitHole.y + this.rabbitHole.height, render: () => this.rabbitHole.render(ctx, camera) });

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

  renderCave(ctx) {
    ctx.fillStyle='#110d1a';ctx.fillRect(0,0,this.canvas.width,this.canvas.height);ctx.fillStyle='#31243a';ctx.fillRect(35,75,900,540);ctx.fillStyle='#251a2c';for(let x=50;x<920;x+=52)for(let y=95;y<590;y+=48){ctx.fillRect(x,y,34,22);}
    ctx.fillStyle='#d1a464';ctx.fillRect(870,180,18,210);ctx.fillRect(822,190,66,7);ctx.fillRect(822,250,66,7);ctx.fillRect(822,310,66,7);ctx.fillStyle='#fff0ae';ctx.font='13px monospace';ctx.fillText('THE LADDER OUT (DOG SAYS NO)',760,160);
    const list=[...this.caveCats.map(c=>({d:c.y+45,r:()=>c.render(ctx,this.camera)})),{d:this.caveDog.y+60,r:()=>this.caveDog.render(ctx,this.camera)},{d:this.player.y+64,r:()=>this.player.render(ctx,this.camera)}];list.sort((a,b)=>a.d-b.d).forEach(x=>x.r());
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
