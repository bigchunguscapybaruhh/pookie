/**
 * =========================================================================
 * ⚙️ MYSTIC REALMS - CONFIGURATION & SETTINGS
 * =========================================================================
 * You can easily change the password, secret reward, and game settings below!
 */

const CONFIG = {
  // -----------------------------------------------------------------------
  // 🔑 PASSWORD & REWARD SETTINGS (Edit these anytime!)
  // -----------------------------------------------------------------------

  // The secret password needed to unlock the chest (case-insensitive):
  PASSWORD: "bitchass",

  // The secret reward message displayed when the chest is unlocked:
  SECRET_REWARD: "no ur the bitchass (i love you sooooooooooooooooooooooooo muchhh huehheheheh)",

  // Optional: Precomputed SHA-256 hash (updated automatically or used for strict hashing)
  PASSWORD_HASH: "b21a364177d612e528775fbbfa1799dc3e6804a9d70fbffcbafad90c9103c80a",

  // -----------------------------------------------------------------------
  // 🗺️ WORLD & GAMEPLAY SETTINGS
  // -----------------------------------------------------------------------
  TILE_SIZE: 48,           // Base tile size (crisp pixel integer scaling)
  MAP_WIDTH: 60,           // Map width in tiles
  MAP_HEIGHT: 45,          // Map height in tiles
  
  PLAYER_SPEED: 3.4,       // Walk speed (pixels per frame)
  PLAYER_RUN_SPEED: 5.4,   // Sprint speed (pixels per frame)
  
  CHEST_INTERACTION_RADIUS: 56, // Distance to interact with chest
  NPC_INTERACTION_RADIUS: 64,

  AUDIO_ENABLED_DEFAULT: true,
  AUDIO_VOLUME: 0.28
};

/**
 * Computes the SHA-256 hash of a string using Web Crypto API.
 */
async function hashPassword(message) {
  if (!message) return "";
  const encoder = new TextEncoder();
  const data = encoder.encode(message.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validates a user-provided password.
 * Checks against CONFIG.PASSWORD (case-insensitive) or SHA-256 hash for maximum flexibility and security.
 */
async function verifyPassword(candidatePassword) {
  if (!candidatePassword) return false;
  const cleaned = candidatePassword.trim().toLowerCase();

  // 1. Direct configuration match (easiest for custom editing)
  if (CONFIG.PASSWORD && cleaned === CONFIG.PASSWORD.trim().toLowerCase()) {
    return true;
  }

  // 2. Cryptographic SHA-256 hash match
  if (CONFIG.PASSWORD_HASH) {
    const candidateHash = await hashPassword(cleaned);
    if (candidateHash === CONFIG.PASSWORD_HASH.toLowerCase()) {
      return true;
    }
  }

  return false;
}
