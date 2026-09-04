import { ATTRS } from '../constants/index.js';

// ============ ターゲット解決 ============
export function resolveTargets(target, ctx) {
  const { board, side, col, idx, hand, grave } = ctx;
  const enem = side === "blue" ? "red" : "blue";

  // 磁力持ちがいれば random 系はそちらに向く
  const magnets = board[enem].flat().filter(u => u?.effect?.action === "magnet");

  function allEnemyUnits() {
    const units = [];
    board[enem].forEach((c, ci) => c.forEach((u, ii) => { if (u) units.push({ side: enem, col: ci, idx: ii, unit: u }); }));
    return units;
  }
  function pickRandom(list) {
    if (list.length === 0) return null;
    if (magnets.length > 0) {
      const mList = list.filter(t => magnets.some(m => board[t.side][t.col][t.idx]?.uid === m.uid));
      if (mList.length > 0) return mList[Math.floor(Math.random() * mList.length)];
    }
    return list[Math.floor(Math.random() * list.length)];
  }

  switch (target) {
    case "self":              return [{ side, col, idx }];
    case "random_enemy":      return [pickRandom(allEnemyUnits())].filter(Boolean);
    case "all_enemy_front":   return board[enem].map((c, ci) => c[0] ? { side: enem, col: ci, idx: 0 } : null).filter(Boolean);
    case "enemy_core":        return board[enem].flatMap((c, ci) => c.map((u, ii) => u?.isCore ? { side: enem, col: ci, idx: ii } : null)).filter(Boolean);
    case "adj_all": {
      const adj = [];
      [[col-1,idx],[col+1,idx],[col,idx-1],[col,idx+1]].forEach(([c2,i2]) => {
        if (c2 >= 0 && c2 < 3 && i2 >= 0 && i2 < 3) {
          if (board[side][c2]?.[i2])  adj.push({ side, col: c2, idx: i2 });
          if (board[enem][c2]?.[i2]) adj.push({ side: enem, col: c2, idx: i2 });
        }
      });
      return adj;
    }
    case "adj_wall": {
      const adj = [];
      [[col-1,idx],[col+1,idx],[col,idx-1],[col,idx+1]].forEach(([c2,i2]) => {
        if (c2 >= 0 && c2 < 3 && i2 >= 0 && i2 < 3 && board[side][c2]?.[i2]?.attr === ATTRS.WALL)
          adj.push({ side, col: c2, idx: i2 });
      });
      return adj;
    }
    case "enemy_front_col":   return board[enem][col]?.[0] ? [{ side: enem, col, idx: 0 }] : [];
    case "hand":              return hand ? [{ hand: true }] : [];
    case "grave":             return [{ grave: true }];
    default:                  return [];
  }
}

// ============ アクション実行 ============
// state を受け取り新しい state を返す（immutable）
export function applyAction(effect, targets, ctx, state) {
  const { board, side, col, idx, hand, grave, log } = ctx;
  let s = { ...state };
  const enem = side === "blue" ? "red" : "blue";

  const dealDamage = (tside, tcol, tidx, amount) => {
    const u = s.board[tside][tcol][tidx];
    if (!u) return false;
    u.hp -= amount;
    log.push(`${u.name}に${amount}ダメージ`);
    if (u.hp <= 0) {
      // on_death 効果
      if (u.effect?.trigger === "on_death") {
        const deathCtx = { ...ctx, board: s.board, side: tside, col: tcol, idx: tidx, log };
        const deathTargets = resolveTargets(u.effect.target, deathCtx);
        s = applyAction(u.effect, deathTargets, deathCtx, s);
      }
      if (u.isCore) s.gameOver = side;
      s.board[tside][tcol].splice(tidx, 1);
      return true;
    }
    return false;
  };

  switch (effect.action) {
    case "damage":
      targets.forEach(t => { dealDamage(t.side, t.col, t.idx, effect.amount); });
      break;

    case "damage_multi": {
      const allEn = [];
      s.board[enem].forEach((c, ci) => c.forEach((u, ii) => { if (u) allEn.push({ side: enem, col: ci, idx: ii }); }));
      const hits = {};
      for (let i = 0; i < (effect.times || 1); i++) {
        const picked = allEn[Math.floor(Math.random() * allEn.length)];
        if (picked) { const k = `${picked.col},${picked.idx}`; hits[k] = (hits[k] || 0) + 1; }
      }
      Object.entries(hits).forEach(([k, cnt]) => {
        const [ci, ii] = k.split(",").map(Number);
        dealDamage(enem, ci, ii, effect.amount * cnt);
      });
      break;
    }

    case "heal":
      targets.forEach(t => {
        const u = s.board[t.side][t.col][t.idx];
        if (u) { u.hp = Math.min(u.maxHp, u.hp + (effect.amount === "damage_dealt" ? ctx.damageDealt || 0 : effect.amount)); }
      });
      break;

    case "atk_up":
      targets.forEach(t => { const u = s.board[t.side][t.col][t.idx]; if (u) u.atk += effect.amount; });
      break;

    case "atk_up_temp":
      targets.forEach(t => { const u = s.board[t.side][t.col][t.idx]; if (u) { u.atk += effect.amount; u.atkTempUp = (u.atkTempUp || 0) + effect.amount; } });
      break;

    case "gain_cost":
      if (side === "blue") s.playerCost += effect.amount;
      else s.aiCost += effect.amount;
      log.push(`コスト+${effect.amount}獲得`);
      break;

    case "draw": {
      const deck = side === "blue" ? [...s.playerDeck] : [...s.aiDeck];
      const drawn = deck.splice(0, effect.amount);
      if (side === "blue") { s.playerDeck = deck; s.playerHand = [...s.playerHand, ...drawn]; }
      else                 { s.aiDeck = deck;     s.aiHand    = [...s.aiHand,    ...drawn]; }
      log.push(`${drawn.length}枚ドロー`);
      break;
    }

    case "recycle": {
      const gr = side === "blue" ? [...s.playerGrave] : [...s.aiGrave];
      const attrs = Array.isArray(effect.filter?.attr) ? effect.filter.attr : [effect.filter?.attr];
      const recycled = gr.filter(c => attrs.includes(c.attr));
      const remaining = gr.filter(c => !attrs.includes(c.attr));
      const deck = side === "blue" ? [...s.playerDeck] : [...s.aiDeck];
      recycled.forEach(c => deck.splice(Math.floor(Math.random() * deck.length), 0, c));
      if (side === "blue") { s.playerGrave = remaining; s.playerDeck = deck; }
      else                 { s.aiGrave = remaining;     s.aiDeck = deck; }
      log.push(`墓地の${recycled.length}枚をデッキに戻した`);
      break;
    }

    case "free_summon": {
      const h = side === "blue" ? [...s.playerHand] : [...s.aiHand];
      const filter = effect.filter || {};
      const attrs = filter.attr ? (Array.isArray(filter.attr) ? filter.attr : [filter.attr]) : null;
      const hi = h.findIndex(c =>
        (!attrs || attrs.includes(c.attr)) &&
        (!filter.name || c.name === filter.name) &&
        (filter.maxCost === undefined || c.cost <= filter.maxCost)
      );
      if (hi >= 0) {
        const card = h[hi];
        for (let ci = 0; ci < 3; ci++) {
          if (s.board[side][ci].length < 3) {
            s.board[side][ci].push(makeUnitFromCard(card));
            h.splice(hi, 1);
            log.push(`${card.name}を無償召喚`);
            break;
          }
        }
        if (side === "blue") s.playerHand = h; else s.aiHand = h;
      }
      break;
    }

    case "growth": {
      const h = side === "blue" ? [...s.playerHand] : [...s.aiHand];
      const gr = side === "blue" ? [...s.playerGrave] : [...s.aiGrave];
      const attrs = Array.isArray(effect.filter?.attr) ? effect.filter.attr : [effect.filter?.attr];
      const candidates = h.filter(c => attrs.includes(c.attr) && c.cost <= (effect.maxCost || 99))
                          .sort((a, b) => b.cost - a.cost);
      if (candidates.length > 0) {
        const card = candidates[0];
        const hi2 = h.findIndex(c => c._k === card._k);
        const self = s.board[side][col].splice(idx, 1)[0];
        if (self) gr.push(self);
        s.board[side][col].splice(Math.min(idx, s.board[side][col].length), 0, makeUnitFromCard(card));
        h.splice(hi2, 1);
        log.push(`${self?.name}が成長→${card.name}召喚`);
        if (side === "blue") { s.playerHand = h; s.playerGrave = gr; } else { s.aiHand = h; s.aiGrave = gr; }
      } else {
        log.push("成長: 手札に条件カードなし");
      }
      break;
    }

    case "forge_adj":
      // passive: 鍛冶場の隣接ATK+1は攻撃時に参照
      break;

    default:
      break;
  }

  return s;
}

// ============ パッシブ効果の計算 ============
export function calcPassiveCostReduction(card, side, board, grave) {
  let reduction = 0;
  const effects = Array.isArray(board[side].flat().map(u => u?.effect).filter(Boolean))
    ? board[side].flat().map(u => u?.effect).filter(Boolean)
    : [];

  board[side].flat().forEach(u => {
    if (!u?.effect) return;
    const e = u.effect;
    if (e.action === "cost_minus_attr") {
      const attrs = Array.isArray(e.filter?.attr) ? e.filter.attr : [e.filter?.attr];
      if (attrs.includes(card.attr)) {
        const stack = board[side].flat().filter(x => x?.effect?.action === "cost_minus_attr" && JSON.stringify(x.effect.filter) === JSON.stringify(e.filter)).length;
        reduction += Math.min(e.maxStack || 99, stack) * (e.amount || 1);
        return; // 同種は一度だけカウント
      }
    }
    if (e.action === "cost_minus_by_grave" && card.attr === u.attr) {
      const attrs2 = Array.isArray(e.filter?.attr) ? e.filter.attr : [e.filter?.attr];
      reduction += grave.filter(c => attrs2.includes(c.attr)).length;
    }
  });
  return reduction;
}

export function calcForgeBonus(side, col, idx, board) {
  const adj = [board[side][col-1]?.[idx], board[side][col+1]?.[idx], board[side][col]?.[idx-1], board[side][col]?.[idx+1]];
  return adj.filter(u => u?.effect?.action === "forge_adj").length > 0 ? 1 : 0;
}

// ============ ユニット生成 ============
let uid = 1;
const nextKey = () => "k" + uid++;
export function makeUnitFromCard(card) {
  return {
    uid: "u" + uid++,
    cardId: card.id,
    name: card.name,
    hp: card.hp,
    maxHp: card.hp,
    atk: card.atk,
    hRange: card.hRange || 1,
    vRange: card.vRange || 1,
    rangeType: card.rangeType || "rect",
    dRange: card.dRange || 1,
    type: card.type,
    attr: card.attr,
    effect: card.effect || null,
    isCore: card.id === "core",
    isFacility: card.type === "facility",
    acted: false,
    summonedTurn: null,
    image: card.image || null,
    _k: card._k || nextKey(),
  };
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}