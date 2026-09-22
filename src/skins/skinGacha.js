// ============ ガチャロジック ============
import { getMetalInfo } from './metalTexture.js';
import { getGemInfo } from './gemTexture.js';

export const GACHA_TYPES = {
  METAL: "metal",
  GEM: "gem",
};

// シード生成
function generateSeed() {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

// ガチャを1回引く
export function rollGacha(type) {
  const seed = generateSeed();
  if (type === GACHA_TYPES.METAL) {
    const info = getMetalInfo(seed);
    return {
      id: `${type}-${seed}`,
      type,
      seed,
      name: info.metal.name,
      rarity: info.metal.rarity,
      detail: {
        metalId: info.metal.id,
        oxidation: info.oxidation,
      },
    };
  } else {
    const info = getGemInfo(seed);
    return {
      id: `${type}-${seed}`,
      type,
      seed,
      name: info.gem.name,
      rarity: info.gem.rarity,
      detail: {
        gemId: info.gem.id,
        clarity: info.clarity,
        inclusion: info.inclusion,
      },
    };
  }
}

// レア度に応じた星表示
export function rarityStars(rarity) {
  // rarity: 5=★, 3=★★, 2=★★★, 1=★★★★
  if (rarity >= 5) return "★";
  if (rarity >= 3) return "★★";
  if (rarity >= 2) return "★★★";
  return "★★★★";
}

// レア度に応じた色
export function rarityColor(rarity) {
  if (rarity >= 5) return "#888";    // コモン: グレー
  if (rarity >= 3) return "#4a9";    // アンコモン: 緑
  if (rarity >= 2) return "#48f";    // レア: 青
  return "#f8a";                     // 最レア: ピンク
}
