import { ATTRS } from '../constants/index.js';

const attrList = f => (Array.isArray(f?.attr) ? f.attr : [f?.attr]);

// ===== ターゲット解決 =====
export function resolveTargets(target, ctx) {
  const { board, side, col, idx, hand } = ctx;
  const enem = side === "blue" ? "red" : "blue";
  const magnets = board[enem].flat().filter(u => u?.effect?.action === "magnet");

  const allEnemyUnits = () => {
    const list = [];
    board[enem].forEach((c, ci) => c.forEach((u, ii) => {
      if (u) list.push({ side: enem, col: ci, idx: ii });
    }));
    return list;
  };
  // 磁力持ちがいればランダム対象はそちらへ
  const pickRandom = list => {
    if (list.length === 0) return null;
    if (magnets.length > 0) {
      const m = list.filter(t => board[t.side][t.col][t.idx]?.effect?.action === "magnet");
      if (m.length > 0) return m[Math.floor(Math.random() * m.length)];
    }
    return list[Math.floor(Math.random() * list.length)];
  };
  const adjacent = [[col - 1, idx], [col + 1, idx], [col, idx - 1], [col, idx + 1]]
    .filter(([c, i]) => c >= 0 && c < 3 && i >= 0 && i < 3);

  switch (target) {
    case "self":
      return [{ side, col, idx }];
    case "random_enemy":
      return [pickRandom(allEnemyUnits())].filter(Boolean);
    case "all_enemy_front":
      return board[enem].map((c, ci) => (c[0] ? { side: enem, col: ci, idx: 0 } : null)).filter(Boolean);
    case "enemy_core":
      return board[enem].flatMap((c, ci) => c.map((u, ii) => (u?.isCore ? { side: enem, col: ci, idx: ii } : null))).filter(Boolean);
    case "adj_all": {
      const out = [];
      adjacent.forEach(([c, i]) => {
        if (board[side]?.[c]?.[i]) out.push({ side, col: c, idx: i });
        if (board[enem]?.[c]?.[i]) out.push({ side: enem, col: c, idx: i });
      });
      return out;
    }
    case "adj_wall":
      return adjacent
        .filter(([c, i]) => board[side]?.[c]?.[i]?.attr === ATTRS.WALL)
        .map(([c, i]) => ({ side, col: c, idx: i }));
    case "enemy_front_col":
      return board[enem][col]?.[0] ? [{ side: enem, col, idx: 0 }] : [];
    case "hand":
      return hand ? [{ hand: true }] : [];
    case "grave":
      return [{ grave: true }];
    default:
      return [];
  }
}

// ===== ユニット → 墓地・山札に置くカードの形へ =====
export function unitToCard(u) {
  if (u.src) return { ...u.src };
  return {
    id: u.cardId, name: u.name, cost: u.originalCost ?? u.cost,
    hp: u.maxHp, atk: u.baseAtk ?? u.atk,
    hRange: u.hRange, vRange: u.baseVRange ?? u.vRange,
    rangeType: u.rangeType, dRange: u.dRange,
    type: u.type, attr: u.attr, effect: u.effect, conditional: u.conditional,
    tags: u.baseTags || u.tags || [], desc: u.desc,
    image: u.image, skin: u.skin, _k: u._k,
  };
}

// ===== アクション実行 =====
export function applyAction(effect, targets, ctx, state) {
  const { side, col, idx, log } = ctx;
  let s = { ...state };
  const enem = side === "blue" ? "red" : "blue";
  const say = msg => { if (log) log.push(msg); };

  const dealDamage = (tside, tcol, tidx, amount) => {
    const u = s.board[tside]?.[tcol]?.[tidx];
    if (!u) return;
    u.hp -= amount;
    say(`${u.name}に${amount}ダメージ`);
    if (u.hp > 0) return;

    if (u.effect?.trigger === "on_death") {
      const dctx = { ...ctx, board: s.board, side: tside, col: tcol, idx: tidx };
      s = applyAction(u.effect, resolveTargets(u.effect.target, dctx), dctx, s);
    }
    if (u.isCore) s.gameOver = tside === "blue" ? "red" : "blue";

    const at = s.board[tside][tcol].indexOf(u);
    if (at >= 0) {
      s.board[tside][tcol].splice(at, 1);
      if (!u.isCore) {
        const gk = tside === "blue" ? "playerGrave" : "aiGrave";
        s = { ...s, [gk]: [...(s[gk] || []), unitToCard(u)] };
      }
    }
  };

  switch (effect.action) {
    case "damage":
      targets.forEach(t => dealDamage(t.side, t.col, t.idx, effect.amount));
      break;

    case "damage_multi": {
      const all = [];
      s.board[enem].forEach((c, ci) => c.forEach((u, ii) => { if (u) all.push({ col: ci, idx: ii, u }); }));
      const hits = new Map();
      for (let i = 0; i < (effect.times || 1) && all.length; i++) {
        const p = all[Math.floor(Math.random() * all.length)];
        hits.set(p.u, (hits.get(p.u) || 0) + 1);
      }
      hits.forEach((cnt, u) => {
        const ci = s.board[enem].findIndex(c => c.includes(u));
        if (ci >= 0) dealDamage(enem, ci, s.board[enem][ci].indexOf(u), effect.amount * cnt);
      });
      break;
    }

    case "heal":
      targets.forEach(t => {
        const u = s.board[t.side]?.[t.col]?.[t.idx];
        if (!u) return;
        const v = effect.amount === "damage_dealt" ? (ctx.damageDealt || 0) : effect.amount;
        u.hp = Math.min(u.maxHp, u.hp + v);
      });
      break;

    case "atk_up":
      // 永続のATK上昇（条件付き効果の再計算で消えないよう基礎値も上げる）
      targets.forEach(t => {
        const u = s.board[t.side]?.[t.col]?.[t.idx];
        if (!u) return;
        u.atk += effect.amount;
        if (u.baseAtk != null) u.baseAtk += effect.amount;
      });
      break;

    case "atk_up_temp":
      targets.forEach(t => {
        const u = s.board[t.side]?.[t.col]?.[t.idx];
        if (!u) return;
        u.atk += effect.amount;
        u.atkTempUp = (u.atkTempUp || 0) + effect.amount;
      });
      break;

    case "gain_cost":
      s = side === "blue"
        ? { ...s, playerCost: (s.playerCost || 0) + effect.amount }
        : { ...s, aiCost: (s.aiCost || 0) + effect.amount };
      say(`コスト+${effect.amount}獲得`);
      break;

    case "draw": {
      const dk = side === "blue" ? "playerDeck" : "aiDeck";
      const hk = side === "blue" ? "playerHand" : "aiHand";
      const deck = [...s[dk]];
      const drawn = deck.splice(0, effect.amount);
      s = { ...s, [dk]: deck, [hk]: [...s[hk], ...drawn] };
      say(`${drawn.length}枚ドロー`);
      break;
    }

    case "recycle": {
      const gk = side === "blue" ? "playerGrave" : "aiGrave";
      const dk = side === "blue" ? "playerDeck" : "aiDeck";
      const attrs = attrList(effect.filter);
      const grave = s[gk] || [];
      const back = grave.filter(c => attrs.includes(c.attr));
      const deck = [...s[dk]];
      back.forEach(c => deck.splice(Math.floor(Math.random() * (deck.length + 1)), 0, c));
      s = { ...s, [gk]: grave.filter(c => !attrs.includes(c.attr)), [dk]: deck };
      say(`墓地の${back.length}枚をデッキに戻した`);
      break;
    }

    case "swap": {
      // 召喚した自身と、対象（隣接する壁属性）の位置を入れ替える
      const t = targets[0];
      const me = s.board[side]?.[col]?.[idx];
      const other = t ? s.board[t.side]?.[t.col]?.[t.idx] : null;
      if (me && other) {
        s.board[t.side][t.col][t.idx] = me;
        s.board[side][col][idx] = other;
        say(`${me.name}が${other.name}と位置を入れ替えた`);
      }
      break;
    }

    case "stun":
      targets.forEach(t => {
        const u = s.board[t.side]?.[t.col]?.[t.idx];
        if (!u) return;
        u.acted = true; u.stunned = true; u.rotateDeg = -90;
        say(`${u.name}がスタンした`);
      });
      break;

    case "unrotate":
      targets.forEach(t => {
        const u = s.board[t.side]?.[t.col]?.[t.idx];
        if (!u) return;
        u.rotateDeg = Math.min(0, (u.rotateDeg || 0) + 90);
        u.acted = false; u.stunned = false; u.actCount = 0;
        say(`${u.name}が行動可能に`);
      });
      break;

    default:
      break;
  }
  return s;
}

// ===== コスト軽減（重複は無制限） =====
export function calcPassiveCostReduction(card, side, board, grave = []) {
  let reduction = 0;
  // 場にいる軽減持ち1体につき amount ずつ軽減（上限なし）
  board[side].flat().forEach(u => {
    const e = u?.effect;
    if (e?.action !== "cost_minus_attr") return;
    if (attrList(e.filter).includes(card.attr)) reduction += e.amount || 1;
  });
  // 手札のカード自身の効果: 墓地の指定属性の枚数ぶん軽減
  if (card.effect?.action === "cost_minus_by_grave") {
    const attrs = attrList(card.effect.filter);
    reduction += grave.filter(c => attrs.includes(c.attr)).length;
  }
  return reduction;
}

// 実際に払うコスト（手札の表示・出せるかの判定にも使う）
export function getEffectiveCost(card, side, board, grave) {
  return Math.max(0, card.cost - calcPassiveCostReduction(card, side, board, grave || []));
}

export function calcForgeBonus(side, col, idx, board) {
  const adj = [board[side][col - 1]?.[idx], board[side][col + 1]?.[idx],
               board[side][col]?.[idx - 1], board[side][col]?.[idx + 1]];
  return adj.some(u => u?.effect?.action === "forge_adj") ? 1 : 0;
}

// ===== ユニット生成 =====
let counter = 1;
export function makeUnitFromCard(card) {
  return {
    uid: "u" + Math.random().toString(36).slice(2, 8) + (counter++), // 端末間で衝突しないID
    cardId: card.id,
    name: card.name,
    hp: card.hp, maxHp: card.hp,
    atk: card.atk, baseAtk: card.atk, atkTempUp: 0,
    hRange: card.hRange || 1,
    vRange: card.vRange || 1, baseVRange: card.vRange || 1,
    rangeType: card.rangeType || "rect",
    dRange: card.dRange || 1,
    type: card.type, attr: card.attr,
    effect: card.effect || null,
    conditional: card.conditional || null,
    tags: [...(card.tags || [])], baseTags: [...(card.tags || [])],
    desc: card.desc || "",
    cost: card.cost, originalCost: card.cost,
    image: card.image || null,
    skin: card.skin || null,
    isCore: card.id === "core",
    isFacility: card.type === "facility",
    acted: false, moved: false, stunned: false, overclocked: false,
    rotateDeg: 0, actCount: 0,
    summonedTurn: null,
    src: { ...card },   // 墓地送り・山札戻しで元のカードに復元するため
    _k: card._k || ("k" + Math.random().toString(36).slice(2, 8) + (counter++)),
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

// ===== 条件付き効果・場の状況で変わるATK =====
function checkCondition(cond, ctx) {
  const { unit, ci, ri, board, side, cost, hand } = ctx;
  switch (cond.type) {
    case "cost_gte": return cost >= cond.value;
    case "cost_lte": return cost <= cond.value;
    case "hand_gte": return hand.length >= cond.value;
    case "hand_lte": return hand.length <= cond.value;
    case "hp_lte":   return unit.hp <= cond.value;
    case "hp_gte":   return unit.hp >= cond.value;
    case "row_eq":   return ri + 1 === cond.value;
    case "field_attr":
      return board[side].flat().filter(u => u && u.attr === cond.value).length >= (cond.count || 1);
    case "col_attr":
      return board[side][ci].filter(u => u && u.attr === cond.value).length >= (cond.count || 1);
    case "row_attr":
      return board[side].map(c => c[ri]).filter(u => u && u.attr === cond.value).length >= (cond.count || 1);
    default: return false;
  }
}

function applyCondEffect(effect, unit) {
  switch (effect.type) {
    case "atk_up":    unit.atk += effect.value; break;
    case "vrange_up": unit.vRange += effect.value; break;
    case "hp_up":     unit.hp = Math.min(unit.maxHp, unit.hp + effect.value); break;
    case "tag_add":   if (!unit.tags.includes(effect.value)) unit.tags.push(effect.value); break;
    default: break;
  }
}

// 行動のたびに再計算（基礎値 + 一時強化 + 場の状況 + 条件付き効果）
export function applyConditionals(state, side) {
  ["blue", "red"].forEach(s => {
    const cost = s === "blue" ? state.playerCost : state.aiCost;
    const hand = (s === "blue" ? state.playerHand : state.aiHand) || [];

    state.board[s].forEach((col, ci)
