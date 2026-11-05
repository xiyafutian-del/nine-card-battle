// ============ スキン所持管理 ============
// localStorageで所持スキンを管理。1個 = 1枚のカードに適用可能

const STORAGE_KEY = "ownedSkins";
const DECK_SKIN_KEY = "deckSkins"; // { `${デッキ名}-${カードid}-${何枚目}`: スキンのinstanceId }

export function getOwnedSkins() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch { return []; }
}

// スキンを追加（ガチャで入手）
export function addSkin(skin) {
  const skins = getOwnedSkins();
  const newSkin = { ...skin, instanceId: `${skin.id}-${Date.now()}-${Math.random()}` };
  skins.push(newSkin);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(skins));
  return newSkin;
}

// スキンを削除（そのスキンの割り当ても解除）
export function removeSkin(instanceId) {
  const skins = getOwnedSkins().filter(s => s.instanceId !== instanceId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(skins));
  const cur = getDeckSkins();
  const next = {};
  Object.entries(cur).forEach(([k, v]) => { if (v !== instanceId) next[k] = v; });
  localStorage.setItem(DECK_SKIN_KEY, JSON.stringify(next));
}

export function getDeckSkins() {
  try {
    return JSON.parse(localStorage.getItem(DECK_SKIN_KEY) || "{}");
  } catch { return {}; }
}

// カードにスキンを設定（instanceId が null なら解除）
export function setCardSkin(cardKey, instanceId) {
  const skins = getDeckSkins();
  if (instanceId === null) delete skins[cardKey];
  else skins[cardKey] = instanceId;
  localStorage.setItem(DECK_SKIN_KEY, JSON.stringify(skins));
}

export function getCardSkin(cardKey) {
  const instanceId = getDeckSkins()[cardKey];
  if (!instanceId) return null;
  return getOwnedSkins().find(s => s.instanceId === instanceId) || null;
}

// 使用中のスキンID（同じスキンを複数カードに使えないように）
export function getUsedSkinIds() {
  return new Set(Object.values(getDeckSkins()));
}

// 保存済みデッキに存在するカードの割り当てだけ残し、不要な割り当てを解除する
// （枚数を減らした・デッキを削除した・保存せず閉じた分が「使用中」のまま残るのを防ぐ）
export function pruneDeckSkins(decks) {
  const valid = new Set();
  (decks || []).forEach(d => {
    const name = d.name || "noname";
    valid.add(`${name}-core-0`);
    Object.entries(d.counts || {}).forEach(([id, n]) => {
      for (let i = 0; i < n; i++) valid.add(`${name}-${id}-${i}`);
    });
  });
  const next = {};
  Object.entries(getDeckSkins()).forEach(([k, v]) => { if (valid.has(k)) next[k] = v; });
  localStorage.setItem(DECK_SKIN_KEY, JSON.stringify(next));
  return next;
}

// デッキ名を変えたとき、スキンの割り当てを新しい名前へ引き継ぐ
export function renameDeckSkins(oldName, newName) {
  if (!oldName || oldName === newName) return;
  const cur = getDeckSkins();
  const next = {};
  Object.entries(cur).forEach(([k, v]) => {
    const rest = k.slice(oldName.length);
    const isOld = k.startsWith(oldName) && /^-(core|\d+)-\d+$/.test(rest);
    if (!isOld) { next[k] = v; return; }
    const nk = newName + rest;
    if (cur[nk] === undefined) next[nk] = v;   // 新しい名前側に既にあればそちらを優先
  });
  localStorage.setItem(DECK_SKIN_KEY, JSON.stringify(next));
}
