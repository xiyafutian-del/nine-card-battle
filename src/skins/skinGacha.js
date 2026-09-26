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
    const mainMetal = info.metals[0];

    return {
      id: `${type}-${seed}`,
      type,
      seed,
      detail: {
        metalId: mainMetal ? mainMetal.id : "iron",
        isPureNugget: info.isPureNugget,
      },
    };
  } else {
    try {
      const info = getGemInfo(seed);
      const mainGem = info.gem || (info.gems && info.gems[0]);
      return {
        id: `${type}-${seed}`,
        type,
        seed,
        detail: {
          gemId: mainGem ? mainGem.id : "raw",
          clarity: info.clarity || 0,
          inclusion: info.inclusion || 0,
        },
      };
    } catch {
      return {
        id: `${type}-${seed}`,
        type,
        seed,
        detail: {},
      };
    }
  }
}
