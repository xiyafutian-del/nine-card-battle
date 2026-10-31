import { TYPES, MAX_TURNS, getGeneratorCost } from '../constants/index.js';
import { makeUnitFromCard, shuffle, resolveTargets, applyAction,
         calcForgeBonus, calcPassiveCostReduction, getEffectiveCost,
         unitToCard, applyConditionals } from './effects.js';

export function cloneBoard(board) {
  return {
    blue: board.blue.map(col => col.map(u => ({ ...u }))),
    red:  board.red.map(col  => col.map(u => ({ ...u }))),
  };
}

// ===== 射程 =====
const isTank = u => u && (u.type === TYPES.TANK || u.tags?.includes("タンク"));

function effectiveVRange(attackerSide, targetCol, baseVRange, board) {
  const enem = attackerSide === "blue" ? "red" : "blue";
  for (let i = 0; i < board[enem][targetCol].length; i++) {
    if (isTank(board[enem][targetCol][i])) return Math.min(baseVRange, i + 1);
  }
  return baseVRange;
}

export function getValidTargets(side, col, idx, hRange, vRange, board) {
  const enem = side === "blue" ? "red" : "blue";
  const targets = [];
  const halfH = (hRange - 1) / 2;
  if (vRange - idx - 1 < 0) return targets;
  for (let c = 0; c < 3; c++) {
    if (Math.abs(c - col) > halfH) continue;
    const ev = effectiveVRange(side, c, vRange, board);
    const maxDepth = ev - idx - 1;
    if (maxDepth < 0) continue;
    for (let pe = 0; pe <= Math.min(2, maxDepth); pe++) {
      if (board[enem][c][pe]) targets.push({ col: c, idx: pe });
    }
  }
  return targets;
}

export function getDiamondTargets(side, col, idx, dRange, board) {
  const enem = side === "blue" ? "red" : "blue";
  const key = (s, c, i) => `${s},${c},${i}`;
  const dist = new Map([[key(side, col, idx), 0]]);
  const queue = [{ s: side, c: col, i: idx }];
  const targets = [];
  let qi = 0;
  while (qi < queue.length) {
    const cur = queue[qi++];
    const d = dist.get(key(cur.s, cur.c, cur.i));
    if (d >= dRange) continue;
    const nbs = [];
    if (cur.i > 0) nbs.push({ s: cur.s, c: cur.c, i: cur.i - 1 });
    if (cur.i < 2) nbs.push({ s: cur.s, c: cur.c, i: cur.i + 1 });
    if (cur.c > 0) nbs.push({ s: cur.s, c: cur.c - 1, i: cur.i });
    if (cur.c < 2) nbs.push({ s: cur.s, c: cur.c + 1, i: cur.i });
    if (cur.i === 0) nbs.push({ s: cur.s === "blue" ? "red" : "blue", c: cur.c, i: 0 });
    for (const nb of nbs) {
      if (nb.c < 0 || nb.c > 2 || nb.i < 0 || nb.i > 2) continue;
      const nk = key(nb.s, nb.c, nb.i);
      if (dist.has(nk)) continue;
      dist.set(nk, d + 1);
      const unit = board[nb.s][nb.c][nb.i];
      if (nb.s === enem && unit) targets.push({ col: nb.c, idx: nb.i });
      if (!isTank(unit)) queue.push(nb);
    }
  }
  return targets;
}

export function getAttackTargets(side, col, idx, unit, board) {
  if (!unit || unit.atk <= 0) return [];
  if (unit.rangeType === "diamond")
    return getDiamondTargets(side, col, idx, unit.dRange || 1, board);
  return getValidTargets(side, col, idx, unit.hRange, unit.vRange, board);
}

// ===== 移動 =====
// 縦移動は隣に別のユニットがいる場合のみ（入れ替え）。横移動は隣の列の空きがあれば可
export function getMovable(side, col, idx, board) {
  const unit = board[side][col][idx];
  if (!unit || unit.isFacility || unit.moved) return [];
  const result = [];
  [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([dc, di]) => {
    const nc = col + dc, ni = idx + di;
    if (nc < 0 || nc > 2 || ni < 0 || ni > 2) return;
    if (dc === 0) {
      if (ni < board[side][col].length) result.push({ col: nc, idx: ni });
    } else if (board[side][nc].length < 3) {
      result.push({ col: nc, idx: Math.min(ni, board[side][nc].length) });
    }
  });
  return result;
}

export function rowToCoord(row) {
  return row < 3 ? { side: "red", idx: 2 - row } : { side: "blue", idx: row - 3 };
}

export function buildDeck(pool, counts) {
  const list = [];
  pool.forEach(c => {
    const n = counts[c.id] || 0;
    for (let i = 0; i < n; i++) list.push({ ...c, _k: `k${Math.random()}` });
  });
  return shuffle(list);
}

// ===== 勝敗 =====
export function checkVictory(board, turn) {
  const blueCore = board.blue.flat().find(u => u?.isCore);
  const redCore  = board.red.flat().find(u => u?.isCore);
  if (!blueCore) return { over: true, winner: "red",  reason: "コア破壊" };
  if (!redCore)  return { over: true, winner: "blue", reason: "コア破壊" };
  if (turn > MAX_TURNS) {
    if (blueCore.hp > redCore.hp) return { over: true, winner: "blue", reason: "判定勝ち（コアHP）" };
    if (redCore.hp > blueCore.hp) return { over: true, winner: "red",  reason: "判定勝ち（コアHP）" };
    const bHP = board.blue.flat().reduce((s, u) => s + (u?.hp || 0), 0);
    const rHP = board.red.flat().reduce((s, u)  => s + (u?.hp || 0), 0);
    if (bHP > rHP) return { over: true, winner: "blue", reason: "判定勝ち（場HP合計）" };
    if (rHP > bHP) return { over: true, winner: "red",  reason: "判定勝ち（場HP合計）" };
    return { over: true, winner: "draw", reason: "引き分け" };
  }
  return { over: false };
}

// ===== ターン開始 =====
export function applyTurnStart(state, side, generatorType) {
  const hand = side === "blue" ? [...state.playerHand] : [...state.aiHand];
  const deck = side === "blue" ? [...state.playerDeck] : [...state.aiDeck];
  let cost = side === "blue" ? state.playerCost : state.aiCost;
  const log = [...state.log];
  const board = cloneBoard(state.board);

  if (deck.length > 0 && hand.length < 10) hand.push(deck.shift());

  const gained = getGeneratorCost(generatorType || "water", state.turn);
  cost += gained;
  log.push(`${side === "blue" ? "あなた" : "相手"}コスト+${gained}`);

  // 回転を時計回り90度戻す（0度は超えない）・行動状態リセット
  board[side].forEach(col => col.forEach(u => {
    if (!u) return;
    u.rotateDeg = Math.min(0, (u.rotateDeg || 0) + 90);
    u.acted = false; u.stunned = false; u.moved = false; u.actCount = 0;
  }));

  // 施設の毎ターン効果
  board[side].forEach((col, ci) => col.forEach((u, ii) => {
    if (u?.effect?.trigger !== "turn_start") return;
    const ctx = { board, side, col: ci, idx: ii, hand, log };
    const targets = resolveTargets(u.effect.target || "self", ctx);
    const ns = applyAction(u.effect, targets, ctx, {
      ...state, board, log,
      playerCost: side === "blue" ? cost : state.playerCost,
      aiCost: side === "red" ? cost : state.aiCost,
    });
    cost = side === "blue" ? ns.playerCost : ns.aiCost;
  }));

  const upd = side === "blue"
    ? { playerHand: hand, playerDeck: deck, playerCost: cost }
    : { aiHand: hand, aiDeck: deck, aiCost: cost };
  const newState = { ...state, board, log, ...upd, phase: "summon" };
  applyConditionals(newState, side);
  return newState;
}

// ===== 召喚 =====
export function summonUnit(state, side, handIndex, col, insertIdx) {
  const hand = side === "blue" ? [...state.playerHand] : [...state.aiHand];
  const card = hand[handIndex];
  if (!card) return state;
  if (state.board[side][col].length >= 3) return state;

  const cost = side === "blue" ? state.playerCost : state.aiCost;
  const grave = side === "blue" ? [...(state.playerGrave || [])] : [...(state.aiGrave || [])];

  const reduction = calcPassiveCostReduction(card, side, state.board, grave);
  const finalCost = Math.max(0, card.cost - reduction);
  if (cost < finalCost) return state;

  const board = cloneBoard(state.board);
  const log = [...state.log];
  const unit = makeUnitFromCard(card);
  unit.summonedTurn = state.turn;
  if (!unit.tags?.includes("先制")) { unit.rotateDeg = -90; unit.acted = true; }

  const at = Math.min(insertIdx, board[side][col].length);
  board[side][col].splice(at, 0, unit);
  hand.splice(handIndex, 1);
  log.push(`${card.name}を召喚`);

  const costUpd = side === "blue"
    ? { playerHand: hand, playerCost: cost - finalCost, playerGrave: grave }
    : { aiHand: hand, aiCost: cost - finalCost, aiGrave: grave };
  let ns = { ...state, board, log, ...costUpd };

  if (card.effect?.trigger === "on_summon") {
    const ctx = { board, side, col, idx: at, hand, grave, log };
    const targets = resolveTargets(card.effect.target, ctx);
    ns = applyAction(card.effect, targets, ctx, ns);
  }

  const vc = checkVictory(ns.board, state.turn);
  if (vc.over && !ns.gameOver) ns.gameOver = vc.winner;
  applyConditionals(ns, side);
  return ns;
}

// ===== 攻撃 =====
export function attackUnit(state, side, atkCol, atkIdx, defCol, defIdx) {
  const enem = side === "blue" ? "red" : "blue";
  const board = cloneBoard(state.board);
  const log = [...state.log];
  const attacker = board[side][atkCol][atkIdx];
  const defender = board[enem][defCol][defIdx];
  if (!attacker || !defender || attacker.atk <= 0) return state;

  const dmg = attacker.atk + calcForgeBonus(side, atkCol, atkIdx, board);
  defender.hp -= dmg;
  log.push(`${attacker.name}→${defender.name}に${dmg}ダメージ`);

  // 行動消費・回転
  attacker.actCount = (attacker.actCount || 0) + 1;
  const has2act = attacker.tags?.includes("2回行動");
  const recoil = attacker.tags?.includes("反動");
  if (!(has2act && attacker.actCount < 2)) {
    attacker.acted = true;
    attacker.rotateDeg = (attacker.rotateDeg || 0) - (recoil ? 180 : 90);
  }

  let ns = { ...state, board, log };

  // 機械属リンク
  if (attacker.attr === "machine") {
    [[atkCol - 1, atkIdx], [atkCol + 1, atkIdx], [atkCol, atkIdx - 1], [atkCol, atkIdx + 1]].forEach(([c2, i2]) => {
      const u = board[side][c2]?.[i2];
      if (!u || u.attr !== "machine" || u.effect?.trigger !== "link_machine") return;
      const ctx = { board, side, col: c2, idx: i2, log };
      ns = applyAction(u.effect, resolveTargets(u.effect.target, ctx), ctx, ns);
    });
  }

  // 攻撃時効果
  if (attacker.effect?.trigger === "on_attack") {
    const ctx = { board, side, col: atkCol, idx: atkIdx, log, damageDealt: dmg };
    ns = applyAction(attacker.effect, resolveTargets(attacker.effect.target, ctx), ctx, ns);
  }

  // 破壊
  if (defender.hp <= 0) {
    if (defender.effect?.trigger === "on_death") {
      const ctx = { board, side: enem, col: defCol, idx: defIdx, log };
      ns = applyAction(defender.effect, resolveTargets(defender.effect.target, ctx), ctx, ns);
    }
    if (defender.isCore) ns.gameOver = side;
    const di = board[enem][defCol].indexOf(defender);
    if (di >= 0) {
      board[enem][defCol].splice(di, 1);
      if (!defender.isCore) {
        const gk = enem === "blue" ? "playerGrave" : "aiGrave";
        ns = { ...ns, [gk]: [...(ns[gk] || []), unitToCard(defender)] };
      }
    }
  }

  const vc = checkVictory(board, state.turn);
  if (vc.over && !ns.gameOver) ns.gameOver = vc.winner;
  applyConditionals(ns, side);
  return ns;
}

// ===== スペル/魔法 =====
export function activateCard(state, side, handIndex, targetInfo) {
  const hand = side === "blue" ? [...state.playerHand] : [...state.aiHand];
  const card = hand[handIndex];
  if (!card) return state;

  const grave = side === "blue" ? [...(state.playerGrave || [])] : [...(state.aiGrave || [])];
  const cost = side === "blue" ? state.playerCost : state.aiCost;
  const effCost = getEffectiveCost(card, side, state.board, grave);
  if (cost < effCost) return state;

  const board = cloneBoard(state.board);
  const log = [...state.log, `${card.name}を使用`];
  const ctx = { board, side, col: targetInfo?.col, idx: targetInfo?.idx, hand, grave, log, selectedTarget: targetInfo };

  const e = card.effect;
  let targets = [];
  if (e) {
    targets = (targetInfo && e.target?.startsWith("select_"))
      ? [{ side: targetInfo.side, col: targetInfo.col, idx: targetInfo.idx }]
      : resolveTargets(e.target || "self", ctx);
  }

  const paid = side === "blue" ? { playerCost: cost - effCost } : { aiCost: cost - effCost };
  let ns = applyAction(e || {}, targets, ctx, { ...state, board, log, ...paid });

  if (card.type === "spell") {
    const hk = side === "blue" ? "playerHand" : "aiHand";
    const gk = side === "blue" ? "playerGrave" : "aiGrave";
    const h = [...ns[hk]];
    const hi = h.findIndex(c => c._k === card._k);
    if (hi >= 0) h.splice(hi, 1);
    ns = { ...ns, [hk]: h, [gk]: [...(ns[gk] || []), card] };
  }

  const vc = checkVictory(ns.board, state.turn);
  if (vc.over && !ns.gameOver) ns.gameOver = vc.winner;
  applyConditionals(ns, side);
  return ns;
           }
