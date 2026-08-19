/**
 * =========================================================================
 * 🦇 altIC alt JRPG PIXEL ART ENGINE - MOWSKITO'S REALM
 * =========================================================================
 * Generates dark altic tiles, spooky graveyard tombstones, vampire manor,
 * gnarled trees, carved pumpkins, and the cool heroine Mowskito.
 */

class SpriteManager {
  constructor() {
    this.tileSize = CONFIG.TILE_SIZE; // 48px
    this.tileTextures = {};
    this.heroSprites = { down: [], up: [], left: [], right: [] };
    this.chestSprites = { closed: null, open: null };
    this.propTextures = {};
  }

  async init() {
    this.generateTerrainTiles();
    this.generatealticBuildingsAndProps();
    this.generateDisguisedChest();
    this.generateHeroSprites();
  }

  createOffscreen(w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return { canvas, ctx };
  }

  /**
   * Generates Dark altic & Graveyard Terrain Tiles:
   * - Twilight Mossy Grass with purple nightshade florets & blood roses
   * - Dark Cobblestone Paths
   * - Graveyard Soil & Crypt Stone Tiles
   */
  generateTerrainTiles() {
    const S = this.tileSize;

    // 1. BASE TWILIGHT MOSSY GRASS
    const grassVariations = ['grass_0', 'grass_purple_flower', 'grass_blood_rose', 'grass_mushrooms'];
    grassVariations.forEach((type, idx) => {
      const { canvas, ctx } = this.createOffscreen(S, S);

      // Dark moody mossy green
      ctx.fillStyle = '#3a4f34';
      ctx.fillRect(0, 0, S, S);

      // Dark shadow patches
      ctx.fillStyle = '#2b3b27';
      for (let y = 0; y < S; y += 8) {
        for (let x = 0; x < S; x += 8) {
          if ((x * 13 + y * 19 + idx * 7) % 3 === 0) {
            ctx.fillRect(x + 2, y + 4, 4, 3);
            ctx.fillRect(x + 4, y + 2, 3, 4);
          }
        }
      }

      ctx.fillStyle = '#4c6645';
      for (let y = 0; y < S; y += 12) {
        for (let x = 0; x < S; x += 12) {
          if ((x * 7 + y * 11 + idx * 13) % 4 === 0) {
            ctx.fillRect(x, y, 4, 2);
          }
        }
      }

      // Purple Nightshade Florets
      if (type === 'grass_purple_flower') {
        ctx.fillStyle = '#8e44ad';
        ctx.fillRect(14, 18, 4, 4);
        ctx.fillRect(12, 19, 8, 2);
        ctx.fillStyle = '#bb86fc';
        ctx.fillRect(15, 19, 2, 2);

        ctx.fillStyle = '#8e44ad';
        ctx.fillRect(34, 30, 4, 4);
        ctx.fillRect(32, 31, 8, 2);
        ctx.fillStyle = '#bb86fc';
        ctx.fillRect(35, 31, 2, 2);
      }

      // Blood-Red Rose Buds
      if (type === 'grass_blood_rose') {
        ctx.fillStyle = '#9e0d29';
        ctx.fillRect(18, 14, 5, 5);
        ctx.fillStyle = '#e81745';
        ctx.fillRect(19, 15, 3, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(19, 15, 1, 1);

        ctx.fillStyle = '#9e0d29';
        ctx.fillRect(36, 26, 5, 5);
        ctx.fillStyle = '#e81745';
        ctx.fillRect(37, 27, 3, 3);
      }

      // Spooky Glowing Mushrooms
      if (type === 'grass_mushrooms') {
        ctx.fillStyle = '#3498db';
        ctx.fillRect(20, 20, 5, 4);
        ctx.fillStyle = '#68d8d6';
        ctx.fillRect(21, 21, 3, 2);
        ctx.fillStyle = '#1b1424';
        ctx.fillRect(22, 24, 2, 4);
      }

      this.tileTextures[type] = canvas;
    });

    // 2. DARK COBBLESTONE & CRUSHED STONE PATH
    const { canvas: pathCanvas, ctx: pathCtx } = this.createOffscreen(S, S);
    pathCtx.fillStyle = '#403845'; // Dark slate violet
    pathCtx.fillRect(0, 0, S, S);
    pathCtx.fillStyle = '#2f2834';
    for (let y = 0; y < S; y += 6) {
      for (let x = 0; x < S; x += 6) {
        if ((x * 17 + y * 23) % 4 === 0) pathCtx.fillRect(x, y, 4, 3);
      }
    }
    pathCtx.fillStyle = '#564d5c';
    for (let y = 0; y < S; y += 8) {
      for (let x = 0; x < S; x += 8) {
        if ((x * 11 + y * 7) % 5 === 0) pathCtx.fillRect(x + 2, y + 2, 3, 2);
      }
    }
    // Worn cobblestone pavers
    pathCtx.fillStyle = '#221c26';
    pathCtx.fillRect(10, 14, 12, 8);
    pathCtx.fillStyle = '#4d4254';
    pathCtx.fillRect(11, 15, 10, 6);
    pathCtx.fillStyle = '#221c26';
    pathCtx.fillRect(28, 24, 14, 10);
    pathCtx.fillStyle = '#4d4254';
    pathCtx.fillRect(29, 25, 12, 8);
    this.tileTextures['path'] = pathCanvas;

    // 3. GRAVEYARD SOIL & TOMBSTONE GROUND
    const { canvas: graveSoilCanvas, ctx: gsCtx } = this.createOffscreen(S, S);
    gsCtx.fillStyle = '#2c262f';
    gsCtx.fillRect(0, 0, S, S);
    gsCtx.fillStyle = '#1c1720';
    for (let y = 0; y < S; y += 8) {
      gsCtx.fillRect(0, y, S, 4);
    }
    gsCtx.fillStyle = '#3f3844';
    for (let x = 4; x < S; x += 10) {
      gsCtx.fillRect(x, 4, 6, 6);
    }
    // Mossy overgrown patches
    gsCtx.fillStyle = '#2e422a';
    gsCtx.fillRect(12, 16, 8, 6);
    gsCtx.fillRect(28, 28, 10, 5);
    this.tileTextures['grave_soil'] = graveSoilCanvas;

    // 4. CRYPT STONE FLOOR
    const { canvas: cryptCanvas, ctx: cCtx } = this.createOffscreen(S, S);
    cCtx.fillStyle = '#2f343b';
    cCtx.fillRect(0, 0, S, S);
    cCtx.fillStyle = '#1a1d21';
    cCtx.fillRect(0, 0, S, 2);
    cCtx.fillRect(0, 0, 2, S);
    cCtx.fillStyle = '#454c57';
    cCtx.fillRect(2, 2, S - 4, 2);
    cCtx.fillRect(2, 2, 2, S - 4);
    this.tileTextures['crypt_floor'] = cryptCanvas;
  }

  /**
   * Generates Vampire Manor, Spooky Crypt, Graveyard Tombstones, Gnarled Trees, Pumpkins, Gargoyles
   */
  generatealticBuildingsAndProps() {
    // 1. GNARLED SPOOKY TREE (Dark twisted branches with crimson/purple leaves: 96x112px)
    const { canvas: treeCanvas, ctx: tCtx } = this.createOffscreen(96, 112);
    tCtx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    tCtx.beginPath();
    tCtx.ellipse(48, 102, 34, 8, 0, 0, Math.PI * 2);
    tCtx.fill();

    // Twisted Dark Charcoal Trunk
    tCtx.fillStyle = '#1b141a';
    tCtx.fillRect(38, 62, 20, 42);
    tCtx.fillStyle = '#2e222d';
    tCtx.fillRect(42, 62, 12, 40);
    // Root branches
    tCtx.fillRect(30, 96, 12, 8);
    tCtx.fillRect(54, 96, 12, 8);

    // Deep Velvet Purple & Crimson Foliage Clouds
    const drawSpookyFoliage = (cx, cy, r, baseCol, lightCol, outlineCol) => {
      tCtx.fillStyle = outlineCol;
      tCtx.beginPath();
      tCtx.arc(cx, cy, r + 2, 0, Math.PI * 2);
      tCtx.fill();
      tCtx.fillStyle = baseCol;
      tCtx.beginPath();
      tCtx.arc(cx, cy, r, 0, Math.PI * 2);
      tCtx.fill();
      tCtx.fillStyle = lightCol;
      tCtx.beginPath();
      tCtx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.65, 0, Math.PI * 2);
      tCtx.fill();
    };

    drawSpookyFoliage(32, 56, 26, '#3a1f38', '#572c54', '#1f0d1e');
    drawSpookyFoliage(64, 56, 26, '#3a1f38', '#572c54', '#1f0d1e');
    drawSpookyFoliage(48, 62, 28, '#3a1f38', '#572c54', '#1f0d1e');
    drawSpookyFoliage(34, 38, 25, '#4f1a3a', '#782357', '#2b0c1f');
    drawSpookyFoliage(62, 38, 25, '#4f1a3a', '#782357', '#2b0c1f');
    drawSpookyFoliage(48, 28, 27, '#631d3d', '#962b5c', '#330a1c');
    drawSpookyFoliage(48, 18, 18, '#821a42', '#b8275f', '#420a1f');

    this.propTextures['tree_spooky'] = treeCanvas;

    // 2. WEEPING altIC WILLOW TREE (Dark emerald/black foliage: 96x112px)
    const { canvas: willowCanvas, ctx: wCtx } = this.createOffscreen(96, 112);
    wCtx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    wCtx.beginPath();
    wCtx.ellipse(48, 102, 34, 8, 0, 0, Math.PI * 2);
    wCtx.fill();
    wCtx.fillStyle = '#1a1b14';
    wCtx.fillRect(40, 64, 16, 40);

    drawSpookyFoliage.call(null, 34, 54, 26, '#1d3324', '#2d4f38', '#0d1a11');
    drawSpookyFoliage.call(null, 62, 54, 26, '#1d3324', '#2d4f38', '#0d1a11');
    drawSpookyFoliage.call(null, 48, 36, 28, '#26422f', '#3b6649', '#112117');
    drawSpookyFoliage.call(null, 48, 20, 20, '#31543c', '#4a7d5b', '#172b1e');

    // Hanging weeping vines
    wCtx.fillStyle = '#1d3324';
    wCtx.fillRect(24, 60, 4, 24);
    wCtx.fillRect(36, 68, 3, 20);
    wCtx.fillRect(60, 64, 4, 22);
    wCtx.fillRect(72, 58, 3, 26);

    this.propTextures['tree_willow'] = willowCanvas;

    // 3. VAMPIRE MANOR (altic Castle Estate: 168x156px)
    const { canvas: manorCanvas, ctx: mCtx } = this.createOffscreen(172, 160);
    mCtx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    mCtx.fillRect(10, 144, 152, 14);

    // Dark Stone Brick Walls
    mCtx.fillStyle = '#18141f';
    mCtx.fillRect(14, 64, 144, 84);
    mCtx.fillStyle = '#2c2538';
    mCtx.fillRect(18, 68, 136, 76);

    // Brick texture lines
    mCtx.fillStyle = '#1f1929';
    for (let y = 74; y < 144; y += 12) {
      mCtx.fillRect(18, y, 136, 2);
    }

    // altic Pointed Spires & Slate Roof
    mCtx.fillStyle = '#110c17'; // Roof outline
    mCtx.beginPath();
    mCtx.moveTo(86, 6);
    mCtx.lineTo(166, 70);
    mCtx.lineTo(6, 70);
    mCtx.closePath();
    mCtx.fill();

    mCtx.fillStyle = '#421a36'; // Velvet Crimson Slate Roof
    mCtx.beginPath();
    mCtx.moveTo(86, 10);
    mCtx.lineTo(160, 66);
    mCtx.lineTo(12, 66);
    mCtx.closePath();
    mCtx.fill();

    // Bat Crest / Stained Glass on Roof
    mCtx.fillStyle = '#c91838';
    mCtx.beginPath();
    mCtx.arc(86, 42, 12, 0, Math.PI * 2);
    mCtx.fill();
    mCtx.fillStyle = '#ffffff';
    mCtx.fillRect(82, 40, 8, 4);

    // altic Arched Front Door with Iron Bars
    mCtx.fillStyle = '#110c17';
    mCtx.fillRect(68, 88, 36, 56);
    mCtx.fillStyle = '#591829'; // Blood wood door
    mCtx.fillRect(72, 92, 28, 50);
    mCtx.fillStyle = '#ff3b5c';
    mCtx.fillRect(78, 98, 16, 12); // Glowing crimson stained glass

    // Arched altic Windows with Stained Glass
    const drawalticWindow = (wx, wy) => {
      mCtx.fillStyle = '#110c17';
      mCtx.fillRect(wx, wy, 26, 32);
      mCtx.fillStyle = '#8e44ad'; // Purple glow
      mCtx.fillRect(wx + 3, wy + 3, 20, 26);
      mCtx.fillStyle = '#e81745';
      mCtx.fillRect(wx + 6, wy + 6, 14, 20);
      mCtx.fillStyle = '#110c17';
      mCtx.fillRect(wx + 12, wy + 3, 2, 26); // Window frame
      mCtx.fillRect(wx + 3, wy + 16, 20, 2);
    };
    drawalticWindow(26, 90);
    drawalticWindow(120, 90);

    this.propTextures['manor_vampire'] = manorCanvas;

    // 4. altIC GRAVEYARD TOMBSTONE (Cross headstone)
    const { canvas: tombCanvas1, ctx: tmCtx1 } = this.createOffscreen(48, 54);
    tmCtx1.fillStyle = 'rgba(0,0,0,0.3)';
    tmCtx1.ellipse(24, 46, 16, 4, 0, 0, Math.PI * 2);
    tmCtx1.fill();

    // Stone Cross Headstone
    tmCtx1.fillStyle = '#1c1d24'; // Outline
    tmCtx1.fillRect(18, 10, 12, 36);
    tmCtx1.fillRect(10, 18, 28, 12);
    tmCtx1.fillStyle = '#4a4d5e'; // Stone
    tmCtx1.fillRect(20, 12, 8, 32);
    tmCtx1.fillRect(12, 20, 24, 8);
    tmCtx1.fillStyle = '#7a7e99';
    tmCtx1.fillRect(20, 12, 3, 32);
    // Moss on stone
    tmCtx1.fillStyle = '#3a5435';
    tmCtx1.fillRect(14, 38, 8, 6);
    this.propTextures['tombstone_cross'] = tombCanvas1;

    // 5. altIC TOMBSTONE (Arched RIP Headstone)
    const { canvas: tombCanvas2, ctx: tmCtx2 } = this.createOffscreen(48, 54);
    tmCtx2.fillStyle = 'rgba(0,0,0,0.3)';
    tmCtx2.ellipse(24, 46, 16, 4, 0, 0, Math.PI * 2);
    tmCtx2.fill();

    tmCtx2.fillStyle = '#1c1d24';
    tmCtx2.beginPath();
    tmCtx2.arc(24, 22, 16, Math.PI, 0);
    tmCtx2.fill();
    tmCtx2.fillRect(8, 22, 32, 24);

    tmCtx2.fillStyle = '#4a4d5e';
    tmCtx2.beginPath();
    tmCtx2.arc(24, 22, 14, Math.PI, 0);
    tmCtx2.fill();
    tmCtx2.fillRect(10, 22, 28, 22);

    // Carved RIP text
    tmCtx2.fillStyle = '#1c1d24';
    tmCtx2.fillRect(16, 26, 16, 2);
    tmCtx2.fillRect(18, 32, 12, 2);
    this.propTextures['tombstone_rip'] = tombCanvas2;

    // 6. ANCIENT CRYPT / MAUSOLEUM (Spans 110x100px)
    const { canvas: cryptBldgCanvas, ctx: cbCtx } = this.createOffscreen(112, 104);
    cbCtx.fillStyle = 'rgba(0,0,0,0.4)';
    cbCtx.fillRect(6, 92, 100, 10);

    cbCtx.fillStyle = '#1c1d24';
    cbCtx.fillRect(10, 30, 92, 66);
    cbCtx.fillStyle = '#3d404d';
    cbCtx.fillRect(14, 34, 84, 58);

    // Crypt Pediment Roof
    cbCtx.fillStyle = '#1c1d24';
    cbCtx.beginPath();
    cbCtx.moveTo(56, 4);
    cbCtx.lineTo(108, 34);
    cbCtx.lineTo(4, 34);
    cbCtx.closePath();
    cbCtx.fill();

    cbCtx.fillStyle = '#525769';
    cbCtx.beginPath();
    cbCtx.moveTo(56, 8);
    cbCtx.lineTo(102, 30);
    cbCtx.lineTo(10, 30);
    cbCtx.closePath();
    cbCtx.fill();

    // Dark Iron Gate Entrance
    cbCtx.fillStyle = '#0a0a0f';
    cbCtx.fillRect(40, 48, 32, 44);
    cbCtx.fillStyle = '#7a7e99';
    for (let x = 44; x < 72; x += 6) {
      cbCtx.fillRect(x, 48, 2, 44);
    }
    this.propTextures['crypt_bldg'] = cryptBldgCanvas;

    // 7. GLOWING JACK-O'-LANTERN PUMPKIN
    const { canvas: pumpkinCanvas, ctx: pCtx } = this.createOffscreen(48, 48);
    pCtx.fillStyle = 'rgba(0,0,0,0.3)';
    pCtx.ellipse(24, 40, 16, 4, 0, 0, Math.PI * 2);
    pCtx.fill();

    // Pumpkin body
    pCtx.fillStyle = '#783506'; // Outline
    pCtx.beginPath();
    pCtx.arc(24, 26, 16, 0, Math.PI * 2);
    pCtx.fill();
    pCtx.fillStyle = '#e65100'; // Orange
    pCtx.beginPath();
    pCtx.arc(24, 26, 14, 0, Math.PI * 2);
    pCtx.fill();

    // Green Stem
    pCtx.fillStyle = '#2e7d32';
    pCtx.fillRect(22, 8, 4, 6);

    // Carved Glowing Face (Yellow/Gold glow)
    pCtx.fillStyle = '#fff59d';
    pCtx.fillRect(16, 20, 4, 4); // Eyes
    pCtx.fillRect(28, 20, 4, 4);
    pCtx.fillRect(22, 25, 4, 3); // Nose
    pCtx.fillRect(17, 31, 14, 3); // Mouth
    pCtx.fillStyle = '#ffffff';
    pCtx.fillRect(18, 32, 3, 2);
    pCtx.fillRect(27, 32, 3, 2);

    this.propTextures['pumpkin'] = pumpkinCanvas;

    // 8. SPOOKY BLACK CAT (with glowing yellow eyes)
    const { canvas: catCanvas, ctx: ctCtx } = this.createOffscreen(48, 48);
    ctCtx.fillStyle = 'rgba(0,0,0,0.25)';
    ctCtx.ellipse(24, 40, 14, 4, 0, 0, Math.PI * 2);
    ctCtx.fill();

    ctCtx.fillStyle = '#110e17'; // Cat Body & Tail
    ctCtx.beginPath();
    ctCtx.arc(24, 26, 12, 0, Math.PI * 2);
    ctCtx.fill();
    // Ears
    ctCtx.fillRect(16, 12, 5, 6);
    ctCtx.fillRect(27, 12, 5, 6);
    // Tail
    ctCtx.fillRect(34, 22, 4, 14);

    // Glowing Yellow Eyes
    ctCtx.fillStyle = '#ffea00';
    ctCtx.fillRect(18, 22, 3, 3);
    ctCtx.fillRect(27, 22, 3, 3);
    ctCtx.fillStyle = '#ffffff';
    ctCtx.fillRect(19, 22, 1, 1);
    ctCtx.fillRect(28, 22, 1, 1);

    this.propTextures['black_cat'] = catCanvas;

    // 9. IRON GRAVEYARD FENCE WITH SPIKES
    const { canvas: fenceCanvas, ctx: fCtx } = this.createOffscreen(48, 48);
    fCtx.fillStyle = '#110c17';
    fCtx.fillRect(4, 10, 6, 36);
    fCtx.fillRect(38, 10, 6, 36);
    fCtx.fillRect(0, 18, 48, 4);
    fCtx.fillRect(0, 32, 48, 4);
    // Spikes
    fCtx.fillStyle = '#7a7e99';
    fCtx.fillRect(5, 6, 4, 6);
    fCtx.fillRect(39, 6, 4, 6);
    fCtx.fillRect(21, 6, 4, 40);
    this.propTextures['fence_iron'] = fenceCanvas;
  }

  /**
   * Generates Ultra-Camouflaged Disguised Chest:
   * Looks like a dark weathered mossy stone slab / crypt root box that seamlessly blends into tombstones and dark trees!
   */
  generateDisguisedChest() {
    const W = 48;
    const H = 48;

    // 1. Camouflaged Closed Chest
    const { canvas: closedCanvas, ctx: cCtx } = this.createOffscreen(W, H);
    cCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    cCtx.beginPath();
    cCtx.ellipse(24, 42, 16, 4, 0, 0, Math.PI * 2);
    cCtx.fill();

    // Dark Weathered Slate Stone / Shadowy Wood
    cCtx.fillStyle = '#1c1b24';
    cCtx.fillRect(8, 16, 32, 24);
    cCtx.fillStyle = '#32303d';
    cCtx.fillRect(10, 18, 28, 20);

    // Weathered Stone Bevel
    cCtx.fillStyle = '#454254';
    cCtx.fillRect(10, 14, 28, 6);

    // Heavy Moss & Overgrown Dark Ivy Camouflage
    cCtx.fillStyle = '#2d4029';
    cCtx.fillRect(8, 14, 10, 12);
    cCtx.fillRect(14, 22, 8, 8);
    cCtx.fillRect(28, 16, 12, 8);
    cCtx.fillRect(32, 22, 6, 14);
    cCtx.fillStyle = '#435e3d';
    cCtx.fillRect(9, 15, 6, 6);
    cCtx.fillRect(29, 17, 7, 5);

    // Tiny Dark Iron Bat Latch (subtle visual cue!)
    cCtx.fillStyle = '#110e17';
    cCtx.fillRect(21, 24, 6, 8);
    cCtx.fillStyle = '#8f0d25'; // Subtle ruby eye
    cCtx.fillRect(23, 26, 2, 2);

    this.chestSprites.closed = closedCanvas;

    // 2. Open Chest
    const { canvas: openCanvas, ctx: oCtx } = this.createOffscreen(W, H);
    oCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    oCtx.beginPath();
    oCtx.ellipse(24, 42, 16, 4, 0, 0, Math.PI * 2);
    oCtx.fill();

    oCtx.fillStyle = '#1c1b24';
    oCtx.fillRect(8, 8, 32, 32);

    // Flipped Lid
    oCtx.fillStyle = '#32303d';
    oCtx.fillRect(8, 8, 32, 10);
    oCtx.fillStyle = '#2d4029';
    oCtx.fillRect(10, 8, 12, 6);

    // Glowing Velvet Crimson Interior & Silver Relic
    oCtx.fillStyle = '#8f0d25';
    oCtx.fillRect(10, 18, 28, 10);
    oCtx.fillStyle = '#ff3b5c';
    oCtx.fillRect(14, 19, 8, 4);
    oCtx.fillStyle = '#ffffff'; // Silver sparkle
    oCtx.fillRect(26, 20, 6, 3);
    oCtx.fillStyle = '#ffea00';
    oCtx.fillRect(18, 22, 4, 4);

    oCtx.fillStyle = '#454254';
    oCtx.fillRect(8, 26, 32, 14);
    oCtx.fillStyle = '#110e17';
    oCtx.fillRect(21, 26, 6, 8);

    this.chestSprites.open = openCanvas;
  }

  /**
   * =======================================================================
   * 🥀 MOWSKITO - REWORKED COOL altIC alt HEROINE
   * =======================================================================
   * - Light  skin tone (#ebd0b9 with #cca17a contour)
   * - Smokey altic eyeliner, dark lips, cool edgy expression (not doll-like!)
   * - Wavy neck-length jet-black hair with vibrant blood-red streaks & alt parting
   * - Dark altic alt attire: black velvet/leather trench jacket, silver chains/zippers,
   *   crimson corseted bodice, pleated dark skirt, fishnet/dark tights, heavy buckle boots
   * - 4 directions x 4 walking frames (Down, Up, Left, Right)
   */
  generateHeroSprites() {
    const W = 48;
    const H = 64;
    const directions = ['down', 'up', 'left', 'right'];

    const SKIN_LIGHT = '#f5dfd0';
    const SKIN_BASE = '#ebd0b9';
    const SKIN_SHADOW = '#c79c7d';

    const HAIR_BLACK = '#120f17';
    const HAIR_BODY = '#201b29';
    const HAIR_RED_HIGHLIGHT = '#c91838';
    const HAIR_RED_LIGHT = '#ff2b54';

    const CLOTH_BLACK = '#110e17';
    const CLOTH_DARK = '#1a1624';
    const CLOTH_CRIMSON = '#800c22';
    const SILVER_CHAIN = '#d4d8e8';
    const BOOT_LEATHER = '#0c0a10';
    const EYE_DARK = '#24120e';

    directions.forEach(dir => {
      this.heroSprites[dir] = [];

      for (let frame = 0; frame < 4; frame++) {
        const { canvas, ctx } = this.createOffscreen(W, H);

        const bob = (frame === 1 || frame === 3) ? 1 : 0;
        const legSwing = (frame === 0) ? -1 : (frame === 2) ? 1 : 0;

        // Dark Ground Drop Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(24, 58, 12, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        const baseY = 6 + bob;

        if (dir === 'down') {
          // --- FRONT VIEW (DOWN) ---
          // 1. Back Wavy Hair Curls (Deep black with blood-red streaks)
          ctx.fillStyle = HAIR_BLACK;
          ctx.beginPath();
          ctx.ellipse(14, baseY + 18, 6, 10, 0.15, 0, Math.PI * 2);
          ctx.ellipse(34, baseY + 18, 6, 10, -0.15, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = HAIR_RED_HIGHLIGHT;
          ctx.fillRect(10, baseY + 22, 4, 8);
          ctx.fillRect(34, baseY + 22, 4, 8);

          // 2. Heavy altic Buckle Platform Boots & Dark Tights
          ctx.fillStyle = '#1c1622'; // Dark tights
          const lLeg = 18 + (legSwing * 2);
          const rLeg = 26 - (legSwing * 2);
          ctx.fillRect(lLeg, baseY + 42, 4, 8);
          ctx.fillRect(rLeg, baseY + 42, 4, 8);
          // Heavy Boots
          ctx.fillStyle = BOOT_LEATHER;
          ctx.fillRect(lLeg - 1, baseY + 48, 6, 10);
          ctx.fillRect(rLeg - 1, baseY + 48, 6, 10);
          // Silver Boot Buckles
          ctx.fillStyle = SILVER_CHAIN;
          ctx.fillRect(lLeg, baseY + 50, 4, 2);
          ctx.fillRect(rLeg, baseY + 50, 4, 2);
          ctx.fillRect(lLeg, baseY + 54, 4, 2);
          ctx.fillRect(rLeg, baseY + 54, 4, 2);

          // 3. altic Pleated Skirt & Silver Chains
          ctx.fillStyle = CLOTH_BLACK;
          ctx.beginPath();
          ctx.moveTo(17, baseY + 28);
          ctx.lineTo(31, baseY + 28);
          ctx.lineTo(36, baseY + 42);
          ctx.lineTo(12, baseY + 42);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = CLOTH_CRIMSON;
          ctx.fillRect(13, baseY + 40, 22, 2);
          // Silver Chain Drape
          ctx.fillStyle = SILVER_CHAIN;
          ctx.fillRect(16, baseY + 32, 6, 2);
          ctx.fillRect(20, baseY + 34, 6, 2);

          // 4. Velvet/Leather altic Jacket & Corset
          ctx.fillStyle = CLOTH_BLACK;
          ctx.fillRect(16, baseY + 20, 16, 10);
          ctx.fillStyle = CLOTH_CRIMSON;
          ctx.fillRect(22, baseY + 22, 4, 6);
          // Silver Belt & Bat Choker
          ctx.fillStyle = SILVER_CHAIN;
          ctx.fillRect(16, baseY + 28, 16, 2);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(22, baseY + 27, 4, 4); // Silver belt buckle
          ctx.fillRect(22, baseY + 18, 4, 2); // Silver choker

          // 5. Arms & Leather Sleeves
          ctx.fillStyle = CLOTH_BLACK;
          ctx.fillRect(12 - legSwing, baseY + 21, 4, 11);
          ctx.fillRect(32 + legSwing, baseY + 21, 4, 11);
          ctx.fillStyle = SKIN_BASE;
          ctx.fillRect(12 - legSwing, baseY + 32, 4, 3);
          ctx.fillRect(32 + legSwing, baseY + 32, 4, 3);

          // 6. Cool Head & Face (mm Skin, altic Makeup)
          ctx.fillStyle = SKIN_SHADOW;
          ctx.fillRect(20, baseY + 18, 8, 3);
          ctx.fillStyle = SKIN_BASE;
          ctx.fillRect(15, baseY + 6, 18, 13);
          ctx.fillStyle = SKIN_LIGHT;
          ctx.fillRect(16, baseY + 7, 16, 10);

          // Smokey altic Eyes (Sharp dark eyeliner, cool confident gaze)
          ctx.fillStyle = '#08050b'; // Heavy black eyeliner/shadow
          ctx.fillRect(16, baseY + 9, 6, 5);
          ctx.fillRect(26, baseY + 9, 6, 5);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(17, baseY + 10, 4, 3);
          ctx.fillRect(27, baseY + 10, 4, 3);
          ctx.fillStyle = EYE_DARK;
          ctx.fillRect(18, baseY + 10, 3, 3);
          ctx.fillRect(28, baseY + 10, 3, 3);
          ctx.fillStyle = '#ffffff'; // Gint catchlight
          ctx.fillRect(18, baseY + 10, 1, 1);
          ctx.fillRect(28, baseY + 10, 1, 1);

          // Dark Berry altic Lips (Cool smirk)
          ctx.fillStyle = '#6e0f22';
          ctx.fillRect(22, baseY + 16, 5, 2);
          ctx.fillStyle = '#9e1834';
          ctx.fillRect(23, baseY + 16, 3, 1);

          // 7. Wavy Jet-Black Hair with Crimson alt Streaks & Bangs
          ctx.fillStyle = HAIR_BLACK;
          ctx.fillRect(13, baseY + 1, 22, 7);
          ctx.fillRect(12, baseY + 4, 4, 16); // Left lock
          ctx.fillRect(32, baseY + 4, 4, 16); // Right lock

          // Crimson Blood-Red Highlights & Swept Bangs
          ctx.fillStyle = HAIR_RED_HIGHLIGHT;
          ctx.fillRect(15, baseY + 3, 4, 7);
          ctx.fillRect(24, baseY + 2, 4, 8);
          ctx.fillRect(11, baseY + 12, 4, 10);
          ctx.fillRect(33, baseY + 12, 4, 10);
          ctx.fillStyle = HAIR_RED_LIGHT;
          ctx.fillRect(16, baseY + 4, 2, 5);
          ctx.fillRect(25, baseY + 3, 2, 6);

          // altic Silver Hair Clip
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(13, baseY + 3, 3, 3);

        } else if (dir === 'up') {
          // --- BACK VIEW (UP) ---
          ctx.fillStyle = BOOT_LEATHER;
          const lLeg = 18 + (legSwing * 2);
          const rLeg = 26 - (legSwing * 2);
          ctx.fillRect(lLeg - 1, baseY + 48, 6, 10);
          ctx.fillRect(rLeg - 1, baseY + 48, 6, 10);

          ctx.fillStyle = CLOTH_BLACK;
          ctx.beginPath();
          ctx.moveTo(17, baseY + 28);
          ctx.lineTo(31, baseY + 28);
          ctx.lineTo(36, baseY + 42);
          ctx.lineTo(12, baseY + 42);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = CLOTH_CRIMSON;
          ctx.fillRect(13, baseY + 40, 22, 2);

          // Back Jacket & Silver Chains
          ctx.fillStyle = CLOTH_DARK;
          ctx.fillRect(16, baseY + 20, 16, 10);
          ctx.fillStyle = SILVER_CHAIN;
          ctx.fillRect(20, baseY + 24, 8, 2);

          ctx.fillStyle = CLOTH_BLACK;
          ctx.fillRect(12 - legSwing, baseY + 21, 4, 12);
          ctx.fillRect(32 + legSwing, baseY + 21, 4, 12);

          // Full Wavy Black Hair Cascading Down Back
          ctx.fillStyle = HAIR_BLACK;
          ctx.beginPath();
          ctx.ellipse(24, baseY + 13, 11, 12, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(13, baseY + 10, 22, 16);
          ctx.fillRect(11, baseY + 14, 26, 10);

          // Blood-Red Streaks
          ctx.fillStyle = HAIR_RED_HIGHLIGHT;
          ctx.fillRect(15, baseY + 7, 3, 18);
          ctx.fillRect(23, baseY + 9, 4, 16);
          ctx.fillRect(29, baseY + 11, 3, 14);

        } else if (dir === 'left') {
          // --- SIDE VIEW (LEFT) ---
          ctx.fillStyle = BOOT_LEATHER;
          const fLeg = 19 - (legSwing * 4);
          const bLeg = 26 + (legSwing * 4);
          ctx.fillRect(fLeg, baseY + 46, 6, 12);
          ctx.fillRect(bLeg, baseY + 46, 5, 11);
          ctx.fillStyle = SILVER_CHAIN;
          ctx.fillRect(fLeg, baseY + 48, 5, 2);

          ctx.fillStyle = CLOTH_BLACK;
          ctx.beginPath();
          ctx.moveTo(19, baseY + 28);
          ctx.lineTo(29, baseY + 28);
          ctx.lineTo(33, baseY + 42);
          ctx.lineTo(15, baseY + 42);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = CLOTH_CRIMSON;
          ctx.fillRect(15, baseY + 40, 18, 2);

          ctx.fillStyle = CLOTH_DARK;
          ctx.fillRect(18, baseY + 20, 11, 9);
          ctx.fillStyle = SILVER_CHAIN;
          ctx.fillRect(17, baseY + 28, 13, 2);

          ctx.fillStyle = CLOTH_BLACK;
          ctx.fillRect(21 + (legSwing * 3), baseY + 21, 4, 10);
          ctx.fillStyle = SKIN_BASE;
          ctx.fillRect(21 + (legSwing * 3), baseY + 31, 4, 4);

          // Side Profile Face
          ctx.fillStyle = SKIN_BASE;
          ctx.fillRect(16, baseY + 6, 14, 13);
          ctx.fillStyle = SKIN_LIGHT;
          ctx.fillRect(15, baseY + 7, 10, 9);
          ctx.fillRect(14, baseY + 11, 2, 2); // Nose

          // altic Smokey Eye Profile
          ctx.fillStyle = '#08050b';
          ctx.fillRect(15, baseY + 8, 5, 4);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(16, baseY + 9, 3, 3);
          ctx.fillStyle = EYE_DARK;
          ctx.fillRect(16, baseY + 9, 2, 3);

          // Hair Profile
          ctx.fillStyle = HAIR_BLACK;
          ctx.fillRect(17, baseY + 1, 13, 8);
          ctx.fillRect(23, baseY + 5, 10, 19);
          ctx.fillRect(17, baseY + 18, 14, 8);

          ctx.fillStyle = HAIR_RED_HIGHLIGHT;
          ctx.fillRect(19, baseY + 3, 3, 6);
          ctx.fillRect(27, baseY + 10, 4, 14);
          ctx.fillRect(21, baseY + 20, 4, 6);

        } else if (dir === 'right') {
          // --- SIDE VIEW (RIGHT) ---
          ctx.fillStyle = BOOT_LEATHER;
          const fLeg = 24 + (legSwing * 4);
          const bLeg = 17 - (legSwing * 4);
          ctx.fillRect(fLeg, baseY + 46, 6, 12);
          ctx.fillRect(bLeg, baseY + 46, 5, 11);
          ctx.fillStyle = SILVER_CHAIN;
          ctx.fillRect(fLeg, baseY + 48, 5, 2);

          ctx.fillStyle = CLOTH_BLACK;
          ctx.beginPath();
          ctx.moveTo(19, baseY + 28);
          ctx.lineTo(29, baseY + 28);
          ctx.lineTo(33, baseY + 42);
          ctx.lineTo(15, baseY + 42);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = CLOTH_CRIMSON;
          ctx.fillRect(15, baseY + 40, 18, 2);

          ctx.fillStyle = CLOTH_DARK;
          ctx.fillRect(19, baseY + 20, 11, 9);
          ctx.fillStyle = SILVER_CHAIN;
          ctx.fillRect(18, baseY + 28, 13, 2);

          ctx.fillStyle = CLOTH_BLACK;
          ctx.fillRect(23 - (legSwing * 3), baseY + 21, 4, 10);
          ctx.fillStyle = SKIN_BASE;
          ctx.fillRect(23 - (legSwing * 3), baseY + 31, 4, 4);

          ctx.fillStyle = SKIN_BASE;
          ctx.fillRect(18, baseY + 6, 14, 13);
          ctx.fillStyle = SKIN_LIGHT;
          ctx.fillRect(23, baseY + 7, 10, 9);
          ctx.fillRect(32, baseY + 11, 2, 2);

          // altic Eye Right
          ctx.fillStyle = '#08050b';
          ctx.fillRect(28, baseY + 8, 5, 4);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(29, baseY + 9, 3, 3);
          ctx.fillStyle = EYE_DARK;
          ctx.fillRect(30, baseY + 9, 2, 3);

          ctx.fillStyle = HAIR_BLACK;
          ctx.fillRect(18, baseY + 1, 13, 8);
          ctx.fillRect(15, baseY + 5, 10, 19);
          ctx.fillRect(17, baseY + 18, 14, 8);

          ctx.fillStyle = HAIR_RED_HIGHLIGHT;
          ctx.fillRect(26, baseY + 3, 3, 6);
          ctx.fillRect(17, baseY + 10, 4, 14);
          ctx.fillRect(23, baseY + 20, 4, 6);
        }

        this.heroSprites[dir].push(canvas);
      }
    });
  }
}

const Sprites = new SpriteManager();
