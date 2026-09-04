import { TYPES, MAX_TURNS, getGeneratorCost } from '../constants/index.js';
import { makeUnitFromCard, shuffle, resolveTargets, applyAction, calcForgeBonus, calcPassiveCostReduction } from './effects.js';

// ============ 盤面クローン ============
export function cloneBoard(board) {
  return {
    blue: board.blue.map(col => col.map(u => ({ ...u }))),
    red:  board.red.map(col  => col.map(u => ({ ...u }))),
  };
}

// ============ 射程計算 ============
function effectiveVRange(attackerSide, targetCol, baseVRange, board) {
  const enem = attackerSide === "blue" ? "red" : "blue";
  for (let i = 0; i < board[enem][targetCol].length; i++) {
    if (board[enem][targetCol][i].type === TYPES.TANK)
      return Math.min(baseVRange, i + 1);
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

// BFS（距離射程）
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
    const neighbors = [];
    if (cur.i > 0) neighbors.push({ s: cur.s, c: cur.c, i: cur.i - 1 });
    if (cur.i < 2) neighbors.push({ s: cur.s, c: cur.c, i: cur.i + 1 });
    if (cur.c > 0) neighbors.push({ s: cur.s, c: cur.c - 1, i: cur.i });
    if (cur.c < 2) neighbors.push({ s: cur.s, c: cur.c + 1, i: cur.i });
    // 陣をまたぐ（前→敵陣）
    if (cur.i === 0) {
      const os = cur.s === "blue" ? "red" : "blue";
      neighbors.push({ s: os, c: cur.c, i: 0 });
    }
    for (const nb of neighbors) {
      if (nb.c < 0 || nb.c > 2 || nb.i < 0 || nb.i > 2) continue;
      const nk = key(nb.s, nb.c, nb.i);
      if (dist.has(nk)) continue;
      dist.set(nk, d + 1);
      const unit = board[nb.s][nb.c][nb.i];
      if (nb.s === enem && unit) targets.push({ col: nb.c, idx: nb.i });
      if (!unit || unit.type !== TYPES.TANK) queue.push(nb);
    }
  }
  return targets;
}

export function getAttackTargets(side, col, idx, unit, board) {
  if (unit.rangeType === "diamond")
    return getDiamondTargets(side, col, idx, unit.dRange || 1, board);
  return getValidTargets(side, col, idx, unit.hRange, unit.vRange, board);
}

// ============ 移動可能マス ============
export function getMovable(side, col, idx, board) {
  const unit = board[side][col][idx];
  if (!unit || unit.isFacility) return [];
  const result = [];
  [[0,-1],[0,1],[-1,0],[1,0]].forEach(([dc, di]) => {
    const nc = col + dc, ni = idx + di;
    if (nc < 0 || nc > 2 || ni < 0 || ni > 2) return;
    if (dc === 0) result.push({ col: nc, idx: ni });
    else if (board[side][nc].length < 3) result.push({ col: nc, idx: Math.min(ni, board[side][nc].length) });
  });
  return result;
}

// ============ 行変換 ============
export function rowToCoord(row) {
  return row < 3 ? { side: "red", idx: 2 - row } : { side: "blue", idx: row - 3 };
}

// ============ デッキ構築 ============
export function buildDeck(pool, counts) {
  const list = [];
  pool.forEach(c => {
    const n = counts[c.id] || 0;
    for (let i = 0; i < n; i++) list.push({ ...c, _k: `k${Math.random()}` });
  });
  return shuffle(list);
}

// ============ 勝敗判定 ============
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

// ============ ターン開始処理 ============
export function applyTurnStart(state, side, generatorType) {
  let hand = side === "blue" ? [...state.playerHand] : [...state.aiHand];
  let deck = side === "blue" ? [...state.playerDeck] : [...state.aiDeck];
  let cost = side === "blue" ? state.playerCost : state.aiCost;
  const log = [...state.log];
  const board = cloneBoard(state.board);

  // ドロー
  if (deck.length > 0 && hand.length < 10) hand.push(deck.shift());

  // 発電機コスト
  const gained = getGeneratorCost(generatorType || "water", state.turn);
  cost += gained;
  log.push(`${side === "blue" ? "あなた" : "相手"}コスト+${gained}`);

  // 施設の毎ターン効果
  board[side].forEach((col, ci) => col.forEach((u, ii) => {
    if (!u?.effect) return;
    const e = u.effect;
    if (e.trigger === "turn_start") {
      const ctx = { board, side, col: ci, idx: ii, hand, log };
      const targets = resolveTargets(e.target || "self", ctx);
      const ns = applyAction(e, targets, ctx, { ...state, board, playerCost: cost, aiCost: cost, log });
      cost = side === "blue" ? ns.playerCost : ns.aiCost;
    }
  }));

  const upd = side === "blue"
    ? { playerHand: hand, playerDeck: deck, playerCost: cost }
    : { aiHand: hand, aiDeck: deck, aiCost: cost };
  return { ...state, board, log, ...upd };
}

// ============ 召喚処理 ============
export function summonUnit(state, side, handIndex, col, insertIdx) {
  const hand = side === "blue" ? [...state.playerHand] : [...state.aiHand];
  const card = hand[handIndex];
  if (!card) return state;

  const cost = side === "blue" ? state.playerCost : state.aiCost;
  const grave = side === "blue" ? [...(state.playerGrave || [])] : [...(state.aiGrave || [])];

  // コスト計算（パッシブ減少）
  const reduction = calcPassiveCostReduction(card, side, state.board, grave);
  const finalCost = Math.max(0, card.cost - reduction);
  if (cost < finalCost) return state;

  const board = cloneBoard(state.board);
  const log = [...state.log];
  const unit = makeUnitFromCard(card);
  unit.summonedTurn = state.turn;

  board[side][col].splice(insertIdx, 0, unit);
  hand.splice(handIndex, 1);
  log.push(`${card.name}を召喚`);

  // 召喚時効果
  if (card.effect?.trigger === "on_summon") {
    const ctx = { board, side, col, idx: insertIdx, hand, grave, log };
    const targets = resolveTargets(card.effect.target, ctx);
    Object.assign(state, applyAction(card.effect, targets, ctx, { ...state, board, log }));
  }

  const costUpd = side === "blue"
    ? { playerHand: hand, playerCost: cost - finalCost, playerGrave: grave }
    : { aiHand: hand, aiCost: cost - finalCost, aiGrave: grave };

  const ns = { ...state, board, log, ...costUpd };
  return checkVictory(board, state.turn).over ? { ...ns, gameOver: checkVictory(board, state.turn).winner } : ns;
}

// ============ 攻撃処理 ============
export function attackUnit(state, side, atkCol, atkIdx, defCol, defIdx) {
  const enem = side === "blue" ? "red" : "blue";
  const board = cloneBoard(state.board);
  const log = [...state.log];
  const attacker = board[side][atkCol][atkIdx];
  const defender = board[enem][defCol][defIdx];
  if (!attacker || !defender) return state;

  const bonus = calcForgeBonus(side, atkCol, atkIdx, board);
  const dmg = attacker.atk + bonus;
  defender.hp -= dmg;
  attacker.acted = true;
  log.push(`${attacker.name}→${defender.name}に${dmg}ダメージ`);

  // 機械属リンク
  if (attacker.attr === "machine") {
    [[atkCol-1,atkIdx],[atkCol+1,atkIdx],[atkCol,atkIdx-1],[atkCol,atkIdx+1]].forEach(([c2,i2]) => {
      const u = board[side][c2]?.[i2];
      if (!u || u.attr !== "machine" || !u.effect) return;
      const ctx = { board, side, col: c2, idx: i2, log };
      const targets = resolveTargets(u.effect.trigger === "link_machine" ? u.effect.target : "self", ctx);
      applyAction(u.effect, targets, ctx, state);
    });
  }

  // 攻撃時効果
  if (attacker.effect?.trigger === "on_attack") {
    const ctx = { board, side, col: atkCol, idx: atkIdx, log, damageDealt: dmg };
    const targets = resolveTargets(attacker.effect.target, ctx);
    Object.assign(state, applyAction(attacker.effect, targets, ctx, { ...state, board, log }));
  }

  let ns = { ...state, board, log };

  if (defender.hp <= 0) {
    // 破壊時効果
    if (defender.effect?.trigger === "on_death") {
      const ctx = { board, side: enem, col: defCol, idx: defIdx, log };
      const targets = resolveTargets(defender.effect.target, ctx);
      ns = applyAction(defender.effect, targets, ctx, ns);
    }
    if (defender.isCore) ns.gameOver = side;
    board[enem][defCol].splice(defIdx, 1);
  }

  const vc = checkVictory(board, state.turn);
  if (vc.over && !ns.gameOver) ns.gameOver = vc.winner;
  return ns;
}

// ============ スペル/魔法発動 ============
export function activateCard(state, side, handIndex, targetInfo) {
  const hand = side === "blue" ? [...state.playerHand] : [...state.aiHand];
  const card = hand[handIndex];
  if (!card) return state;

  const cost = side === "blue" ? state.playerCost : state.aiCost;
  if (cost < card.cost) return state;

  const board = cloneBoard(state.board);
  const log = [...state.log];
  const grave = side === "blue" ? [...(state.playerGrave || [])] : [...(state.aiGrave || [])];

  log.push(`${card.name}を使用`);

  // targetInfo があれば selectedTarget として context に渡す
  const ctx = { board, side, col: targetInfo?.col, idx: targetInfo?.idx, hand, grave, log, selectedTarget: targetInfo };

  let targets = [];
  const e = card.effect;
  if (e) {
    if (targetInfo && e.target?.startsWith("select_")) {
      targets = [{ side: targetInfo.side, col: targetInfo.col, idx: targetInfo.idx }];
    } else {
      targets = resolveTargets(e.target || "self", ctx);
    }
  }

  let ns = applyAction(e || {}, targets, ctx, { ...state, board, log });

  // スペルは墓地へ、魔法は手札に残る
  if (card.type === "spell") {
    hand.splice(handIndex, 1);
    grave.push(card);
  }

  const costUpd = side === "blue"
    ? { playerHand: hand, playerCost: cost - card.cost, playerGrave: grave }
    : { aiHand: hand, aiCost: cost - card.cost, aiGrave: grave };

  ns = { ...ns, ...costUpd };
  const vc = checkVictory(board, state.turn);
  if (vc.over && !ns.gameOver) ns.gameOver = vc.winner;
  return ns;
}