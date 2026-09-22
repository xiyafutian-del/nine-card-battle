// ============ スキン所持管理 ============
// localStorageで所持スキンを管理
// 1個 = 1枚のカードに適用可能

const STORAGE_KEY = "ownedSkins";
const DECK_SKIN_KEY = "deckSkins"; // { deckCardKey: skinId }

// 所持スキン一覧を取得
export function getOwnedSkins() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch { return []; }
}

// スキンを追加（ガチャで入手）
export function addSkin(skin) {
  const skins = getOwnedSkins();
  // 同シードでも別個体（idにuuidを付与）
  const newSkin = { ...skin, instanceId: `${skin.id}-${Date.now()}-${Math.random()}` };
  skins.push(newSkin);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(skins));
  return newSkin;
}

// スキンを削除（カードに適用済みを外したとき等）
export function removeSkin(instanceId) {
  const skins = getOwnedSkins().filter(s => s.instanceId !== instanceId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(skins));
}

// デッキのカードスキン設定を取得
// key: `${deckName}-${cardId}-${cardIndex}`
export function getDeckSkins() {
  try {
    return JSON.parse(localStorage.getItem(DECK_SKIN_KEY) || "{}");
  } catch { return {}; }
}

// カードにスキンを設定
// cardKey: デッキ内のカードを一意に識別するキー
// instanceId: スキンのinstanceId（nullで解除）
export function setCardSkin(cardKey, instanceId) {
  const skins = getDeckSkins();
  if (instanceId === null) {
    delete skins[cardKey];
  } else {
    skins[cardKey] = instanceId;
  }
  localStorage.setItem(DECK_SKIN_KEY, JSON.stringify(skins));
}

// カードのスキンを取得
export function getCardSkin(cardKey) {
  const skins = getDeckSkins();
  const instanceId = skins[cardKey];
  if (!instanceId) return null;
  const owned = getOwnedSkins();
  return owned.find(s => s.instanceId === instanceId) || null;
}

// 使用中のinstanceIdセット（同じスキンを複数カードに使えないように）
export function getUsedSkinIds() {
  const skins = getDeckSkins();
  return new Set(Object.values(skins));
}
