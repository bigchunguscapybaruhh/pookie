/**
 * =========================================================================
 * 🦇 GOTHIC EMO WORLD MAP GENERATOR - MOWSKITO'S REALM
 * =========================================================================
 * Generates an expansive gothic map featuring:
 * - Gothic Graveyard with Crypts, Cross Headstones, and Spiked Fences
 * - Vampire Manor Castle with crimson slate roof
 * - Spooky Pumpkin Patch with glowing Jack-o'-Lanterns and Black Cats
 * - Dense Gnarled & Willow Forest with camouflaged hidden chest hiding spots
 */

const TILE_TYPES = {
  GRASS_0: 0,
  GRASS_PURPLE_FLOWER: 1,
  GRASS_BLOOD_ROSE: 2,
  GRASS_MUSHROOMS: 3,
  PATH: 4,
  GRAVE_SOIL: 5,
  CRYPT_FLOOR: 6
};

class GameMap {
  constructor() {
    this.width = CONFIG.MAP_WIDTH;   // 60
    this.height = CONFIG.MAP_HEIGHT; // 45
    this.tileSize = CONFIG.TILE_SIZE;// 48
    this.tiles = [];
    this.collisionMap = [];
    this.trees = [];
    this.props = [];
    this.buildings = [];
    this.spawnPoint = { x: 26, y: 24 }; // Crossroads entrance
    this.chestSpawnPoint = null;
  }

  init() {
    this.generateLayout();
    this.generateGothicEstate();
    this.pickCamouflagedChestLocation();
  }

  generateLayout() {
    this.tiles = Array(this.height).fill(null).map(() => Array(this.width).fill(TILE_TYPES.GRASS_0));
    this.collisionMap = Array(this.height).fill(null).map(() => Array(this.width).fill(0));

    // 1. Twilight Mossy Lawn with Blood-Red Roses & Purple Nightshade
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const rand = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
        if (rand > 0.85) this.tiles[y][x] = TILE_TYPES.GRASS_BLOOD_ROSE;
        else if (rand > 0.72) this.tiles[y][x] = TILE_TYPES.GRASS_PURPLE_FLOWER;
        else if (rand > 0.60) this.tiles[y][x] = TILE_TYPES.GRASS_MUSHROOMS;
        else this.tiles[y][x] = TILE_TYPES.GRASS_0;
      }
    }

    // 2. Dark Slate Cobblestone Roads
    // Main East-West road (y: 22 to 25)
    for (let x = 2; x < this.width - 2; x++) {
      const py = 23 + Math.round(Math.sin(x * 0.16) * 1.5);
      this.tiles[py][x] = TILE_TYPES.PATH;
      this.tiles[py + 1][x] = TILE_TYPES.PATH;
      if (py - 1 >= 0) this.tiles[py - 1][x] = TILE_TYPES.PATH;
    }

    // North Road to Vampire Manor & Graveyard (x: 24 to 27)
    for (let y = 4; y < this.height - 4; y++) {
      const px = 25 + Math.round(Math.sin(y * 0.22) * 1.2);
      this.tiles[y][px] = TILE_TYPES.PATH;
      this.tiles[y][px + 1] = TILE_TYPES.PATH;
      if (px - 1 >= 0) this.tiles[y][px - 1] = TILE_TYPES.PATH;
    }

    // Path to Graveyard (Northwest branch: x: 6 to 24, y: 12)
    for (let x = 6; x <= 24; x++) {
      const py = 12 + Math.round(Math.cos(x * 0.2) * 1.2);
      this.tiles[py][x] = TILE_TYPES.PATH;
      this.tiles[py + 1][x] = TILE_TYPES.PATH;
    }

    // Path to South Pumpkin Patch & Willow Grove (x: 32 to 54, y: 32 to 34)
    for (let x = 32; x < this.width - 4; x++) {
      const py = 32 + Math.round(Math.sin(x * 0.2) * 1.5);
      this.tiles[py][x] = TILE_TYPES.PATH;
      this.tiles[py + 1][x] = TILE_TYPES.PATH;
    }

    // 3. Spooky Graveyard Ground (Northwest zone: x: 4 to 20, y: 4 to 12)
    for (let y = 4; y <= 11; y++) {
      for (let x = 4; x <= 20; x++) {
        this.tiles[y][x] = TILE_TYPES.GRAVE_SOIL;
      }
    }

    // Crypt Floor Area (x: 6 to 11, y: 4 to 6)
    for (let y = 4; y <= 6; y++) {
      for (let x = 6; x <= 11; x++) {
        this.tiles[y][x] = TILE_TYPES.CRYPT_FLOOR;
      }
    }
  }

  generateGothicEstate() {
    this.trees = [];
    this.props = [];
    this.buildings = [];

    const S = this.tileSize;

    // 1. Vampire Manor (Northeast castle: x: 38 * S, y: 5 * S)
    this.addBuilding('manor_vampire', 38 * S, 5 * S, 172, 160);

    // 2. Ancient Mausoleum / Crypt (Inside Graveyard: x: 6 * S, y: 3 * S)
    this.addBuilding('crypt_bldg', 6 * S, 3 * S, 112, 104);

    // 3. Graveyard Headstones & Crosses
    const graves = [
      { x: 13, y: 5, type: 'tombstone_cross' },
      { x: 16, y: 5, type: 'tombstone_rip' },
      { x: 19, y: 5, type: 'tombstone_cross' },
      { x: 13, y: 8, type: 'tombstone_rip' },
      { x: 16, y: 8, type: 'tombstone_cross' },
      { x: 19, y: 8, type: 'tombstone_rip' },
      { x: 6, y: 9, type: 'tombstone_cross' },
      { x: 9, y: 9, type: 'tombstone_rip' }
    ];
    graves.forEach(g => {
      this.addProp(g.type, g.x * S, g.y * S, 48, 54);
    });

    // 4. Spiked Iron Graveyard Perimeter Fences
    for (let x = 4; x <= 20; x += 1) {
      if (x !== 11 && x !== 12) { // Gate entrance gap
        this.addProp('fence_iron', x * S, 12 * S, 48, 48);
      }
    }

    // 5. Jack-o'-Lanterns (Scattered in pumpkin patch & manor grounds)
    const pumpkins = [
      { x: 36, y: 28 }, { x: 39, y: 30 }, { x: 42, y: 27 }, { x: 45, y: 31 },
      { x: 48, y: 28 }, { x: 36, y: 12 }, { x: 52, y: 12 }, { x: 11, y: 13 }
    ];
    pumpkins.forEach(p => {
      this.addProp('pumpkin', p.x * S, p.y * S, 48, 48);
    });

    // 6. Spooky Black Cats (near graveyard & crossroads)
    this.addProp('black_cat', 10 * S, 12 * S, 48, 48);
    this.addProp('black_cat', 34 * S, 8 * S, 48, 48);
    this.addProp('black_cat', 28 * S, 21 * S, 48, 48);

    // 7. Dense Gnarled Spooky Trees & Weeping Willows (Heavy forest cover to hide chest!)
    const spookyForest = [
      // Graveyard outskirts
      { x: 2, y: 2, type: 'willow' }, { x: 21, y: 2, type: 'spooky' }, { x: 2, y: 8, type: 'spooky' },
      // Manor grounds
      { x: 33, y: 3, type: 'willow' }, { x: 53, y: 3, type: 'spooky' }, { x: 53, y: 9, type: 'willow' },
      // Central forest
      { x: 16, y: 16, type: 'spooky' }, { x: 20, y: 17, type: 'willow' }, { x: 32, y: 17, type: 'spooky' },
      // Southeast haunted grove
      { x: 34, y: 24, type: 'willow' }, { x: 40, y: 23, type: 'spooky' }, { x: 48, y: 23, type: 'willow' },
      { x: 52, y: 28, type: 'spooky' }, { x: 44, y: 34, type: 'willow' }, { x: 50, y: 36, type: 'spooky' },
      // Southwest woods
      { x: 4, y: 26, type: 'spooky' }, { x: 10, y: 30, type: 'willow' }, { x: 16, y: 28, type: 'spooky' },
      { x: 6, y: 36, type: 'willow' }, { x: 14, y: 36, type: 'spooky' }
    ];
    spookyForest.forEach(t => {
      this.addTree(t.x * S, t.y * S, t.type);
    });

    // Dense outer perimeter forest
    for (let x = 0; x < this.width; x += 2) {
      this.addTree(x * S, 0, (x % 4 === 0) ? 'willow' : 'spooky');
      this.addTree(x * S, (this.height - 3) * S, (x % 4 === 0) ? 'spooky' : 'willow');
    }
    for (let y = 2; y < this.height - 3; y += 2) {
      this.addTree(0, y * S, 'spooky');
      this.addTree(1 * S, y * S, 'willow');
      this.addTree((this.width - 3) * S, y * S, 'willow');
      this.addTree((this.width - 2) * S, y * S, 'spooky');
    }
  }

  addBuilding(type, worldX, worldY, w, h) {
    const tileStartX = Math.floor(worldX / this.tileSize);
    const tileEndX = Math.floor((worldX + w) / this.tileSize);
    const tileStartY = Math.floor((worldY + 70) / this.tileSize);
    const tileEndY = Math.floor((worldY + h) / this.tileSize);

    for (let ty = tileStartY; ty <= tileEndY; ty++) {
      for (let tx = tileStartX; tx <= tileEndX; tx++) {
        if (ty >= 0 && ty < this.height && tx >= 0 && tx < this.width) {
          this.collisionMap[ty][tx] = 1;
        }
      }
    }

    this.buildings.push({
      type,
      x: worldX,
      y: worldY,
      width: w,
      height: h,
      depthY: worldY + h - 10
    });
  }

  addTree(worldX, worldY, type = 'spooky') {
    const tileX = Math.floor((worldX + 42) / this.tileSize);
    const tileY = Math.floor((worldY + 84) / this.tileSize);

    if (tileX >= 0 && tileX < this.width && tileY >= 0 && tileY < this.height) {
      this.collisionMap[tileY][tileX] = 1;
    }

    this.trees.push({
      type: type === 'willow' ? 'tree_willow' : 'tree_spooky',
      x: worldX,
      y: worldY,
      width: 96,
      height: 112,
      depthY: worldY + 98
    });
  }

  addProp(type, worldX, worldY, w, h) {
    const tileX = Math.floor(worldX / this.tileSize);
    const tileY = Math.floor(worldY / this.tileSize);

    if (tileX >= 0 && tileX < this.width && tileY >= 0 && tileY < this.height) {
      this.collisionMap[tileY][tileX] = 1;
    }

    this.props.push({
      type,
      x: worldX,
      y: worldY,
      width: w,
      height: h,
      depthY: worldY + h
    });
  }

  /**
   * Spawns the camouflaged chest tucked deep behind tombstones, crypts, or gnarled willow trees!
   */
  pickCamouflagedChestLocation() {
    const spookyHideouts = [
      // Spot 1: Tucked right behind the Graveyard Tombstone (x: 18 * S, y: 4 * S)
      { x: 18, y: 4, offsetX: 12, offsetY: -4 },
      // Spot 2: Tucked behind the Ancient Crypt wall (x: 10, y: 3 * S)
      { x: 10, y: 3, offsetX: 14, offsetY: 2 },
      // Spot 3: Behind the Spooky Willow in Southeast Grove (x: 48 * S, y: 22 * S)
      { x: 48, y: 22, offsetX: 16, offsetY: -6 },
      // Spot 4: Behind the Vampire Manor West Spire (x: 35 * S, y: 6 * S)
      { x: 35, y: 6, offsetX: 10, offsetY: 0 },
      // Spot 5: Behind Southwest Gnarled Tree (x: 10 * S, y: 29 * S)
      { x: 10, y: 29, offsetX: 14, offsetY: -8 }
    ];

    const chosen = spookyHideouts[Math.floor(Math.random() * spookyHideouts.length)];
    this.chestSpawnPoint = {
      worldX: chosen.x * this.tileSize + chosen.offsetX,
      worldY: chosen.y * this.tileSize + chosen.offsetY
    };

    return this.chestSpawnPoint;
  }

  checkCollision(rect) {
    const minTileX = Math.floor(rect.x / this.tileSize);
    const maxTileX = Math.floor((rect.x + rect.width - 1) / this.tileSize);
    const minTileY = Math.floor(rect.y / this.tileSize);
    const maxTileY = Math.floor((rect.y + rect.height - 1) / this.tileSize);

    if (minTileX < 0 || maxTileX >= this.width || minTileY < 0 || maxTileY >= this.height) {
      return true;
    }

    for (let ty = minTileY; ty <= maxTileY; ty++) {
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        if (this.collisionMap[ty] && this.collisionMap[ty][tx] === 1) {
          return true;
        }
      }
    }

    return false;
  }

  renderGround(ctx, camera) {
    const startCol = Math.max(0, Math.floor(camera.x / this.tileSize));
    const endCol = Math.min(this.width - 1, Math.ceil((camera.x + camera.viewportWidth) / this.tileSize));
    const startRow = Math.max(0, Math.floor(camera.y / this.tileSize));
    const endRow = Math.min(this.height - 1, Math.ceil((camera.y + camera.viewportHeight) / this.tileSize));

    const S = this.tileSize;

    for (let y = startRow; y <= endRow; y++) {
      for (let x = startCol; x <= endCol; x++) {
        const screenPos = camera.worldToScreen(x * S, y * S);
        const tileType = this.tiles[y][x];

        let tex = null;
        switch (tileType) {
          case TILE_TYPES.GRASS_0: tex = Sprites.tileTextures['grass_0']; break;
          case TILE_TYPES.GRASS_PURPLE_FLOWER: tex = Sprites.tileTextures['grass_purple_flower']; break;
          case TILE_TYPES.GRASS_BLOOD_ROSE: tex = Sprites.tileTextures['grass_blood_rose']; break;
          case TILE_TYPES.GRASS_MUSHROOMS: tex = Sprites.tileTextures['grass_mushrooms']; break;
          case TILE_TYPES.PATH: tex = Sprites.tileTextures['path']; break;
          case TILE_TYPES.GRAVE_SOIL: tex = Sprites.tileTextures['grave_soil']; break;
          case TILE_TYPES.CRYPT_FLOOR: tex = Sprites.tileTextures['crypt_floor']; break;
          default: tex = Sprites.tileTextures['grass_0']; break;
        }

        if (tex) {
          ctx.drawImage(tex, screenPos.x, screenPos.y, S, S);
        }
      }
    }
  }
}
