import { cloneBoard, summonUnit, attackUnit, getAttackTargets, getMovable, activateCard, checkVictory } from './battle.js';
import { makeUnitFromCard, unitToCard, resolveTargets, applyAction, getEffectiveCost } from './effects.js';
import { applyConditionals } from './conditionals.js';
import { canUseActive } from './skills.js';
import { TYPES } from '../constants/index.js';

// ============================================================
// AI: 「行動の候補を全て試し、盤面評価が最も上がる手を選ぶ」を繰り返す
//   1. 召喚フェーズ: 召喚・成長・魔法・スキル
//   2. 行動フェーズ: 攻撃・移動・魔法・スキル
// 評価（evaluate）の重みを変えると、AIの性格が変わる
// ============================================================

const W = {
  coreHp: 6,          // コアHPの差（最重要）
  board: 1,           // 場のユニット価値の差
  myHand: 1.2,        // 自分の手札1枚
  foeHand: 0.6,       // 相手の手札1枚
  cost: 0.35,         // 余らせたコスト1
  foeCoreReach: 1.5,  // 相手が次ターンにこちらのコアへ与えうるダメージ
  myCoreReach: 1.0,   // こちらが次ターンに相手のコアへ与えうるダメージ
  exposure: 0.35,     // 自軍ユニットが削られる危険
  ready: 0.6,         // 未行動で攻撃できるユニット（攻撃力あたり）
  noise: 0.05,        // 同点時のばらつき
};

const K = side => (side === "blue"
  ? { hand: "playerHand", cost: "playerCost", grave: "playerGrave" }
  : { hand: "aiHand", cost: "aiCost", grave: "aiGrave" });
const other = s => (s === "blue" ? "red" : "blue");
const isSpell = c => c.type === TYPES.SPELL || c.type === TYPES.MAGIC;
const coreOf = (board, side) => board[side].flat().find(u => u?.isCore);

// AIが使う魔法・スペルの種類（一時強化・スタン・回復系の細かい判断は今回は対象外）
const USABLE_SPELL_ACTIONS = ["damage", "damage_multi", "heal", "draw"];

function validSpellTarget(card, me, side, unit) {
  if (!unit) return false;
  const ally = side === me;
  switch (card.targetType) {
    case "enemy":         return !ally;
    case "enemy_noncore": return !ally && !unit.isCore;
    case "ally":          return ally;
    case "ally_wall":     return ally && unit.attr === "wall";
    case "ally_machine":  return ally && unit.attr === "machine";
    default:              return false;
  }
}

// ===== ユニットの価値 =====
function unitValue(u) {
  if (!u || u.isCore || u.overclocked) return 0;
  const atk = Math.max(0, u.baseAtk ?? u.atk);   // 一時強化は数えない
  const range = u.rangeType === "diamond"
    ? (u.dRange || 1) * 1.2
    : (u.hRange || 1) * 0.3 + (u.vRange || 1) * 0.5;
  let v = u.hp + atk * 1.6 + range + (u.originalCost ?? 0) * 0.4;
  if (u.type === TYPES.TANK || u.tags?.includes("タンク")) v += 2;
  if (u.effect && ["turn_start", "passive", "active"].includes(u.effect.trigger)) v += 1.5;
  return v;
}

// aSide のユニットが tSide に与えうるダメージ（コア宛て・ユニット別）
function reach(state, aSide, tSide) {
  const per = new Map();
  let core = 0;
  state.board[aSide].forEach((col, c) => col.forEach((u, i) => {
    if (!u || u.atk <= 0) return;
    getAttackTargets(aSide, c, i, u, state.board).forEach(t => {
      const tu = state.board[tSide][t.col]?.[t.idx];
      if (!tu) return;
      per.set(tu.uid, (per.get(tu.uid) || 0) + u.atk);
      if (tu.isCore) core += u.atk;
    });
  }));
  return { core, per };
}

// ===== 盤面評価（me から見た有利さ） =====
function evaluate(state, me) {
  const foe = other(me);
  if (state.gameOver) return state.gameOver === me ? 1e6 : state.gameOver === "draw" ? 0 : -1e6;
  const myCore = coreOf(state.board, me);
  const foeCore = coreOf(state.board, foe);
  if (!foeCore) return 1e6;
  if (!myCore) return -1e6;
  const mk = K(me), fk = K(foe);

  let s = (myCore.hp - foeCore.hp) * W.coreHp;

  state.board[me].forEach(col => col.forEach(u => { s += W.board * unitValue(u); }));
  state.board[foe].forEach(col => col.forEach(u => { s -= W.board * unitValue(u); }));

  s += (state[mk.hand] || []).length * W.myHand - (state[fk.hand] || []).length * W.foeHand;
  s += (state[mk.cost] || 0) * W.cost;

  // 相手が次のターンに届かせられる攻撃（こちらのコアが落ちるなら大減点）
  const foeReach = reach(state, foe, me);
  s -= foeReach.core >= myCore.hp ? 400 : foeReach.core * W.foeCoreReach;

  // こちらが次のターンに届かせられる攻撃
  const myReach = reach(state, me, foe);
  s += myReach.core >= foeCore.hp ? 150 : myReach.core * W.myCoreReach;

  // 自軍ユニットの露出（削られやすい位置は減点）
  state.board[me].forEach(col => col.forEach(u => {
    if (!u || u.isCore) return;
    const inc = foeReach.per.get(u.uid) || 0;
    if (inc > 0) s -= Math.min(1, inc / Math.max(1, u.hp)) * unitValue(u) * W.exposure;
  }));

  // 未行動で攻撃できるユニット（行動を使い切る手より、攻撃を優先させるため）
  state.board[me].forEach((col, c) => col.forEach((u, i) => {
    if (!u || u.acted || u.stunned || u.atk <= 0) return;
    if (getAttackTargets(me, c, i, u, state.board).length > 0) s += u.atk * W.ready;
  }));

  return s;
}

// ===== AI用の操作（useBattle の処理と同じ内容） =====
function growUnit(state, me, col, uid, handIndex) {
  const mk = K(me);
  const board = cloneBoard(state.board);
  const gi = board[me][col].findIndex(u => u.uid === uid);
  if (gi < 0) return state;
  const gu = board[me][col][gi];
  const hand = [...state[mk.hand]];
  const card = hand[handIndex];
  const e = gu.effect;
  const attrs = Array.isArray(e.filter?.attr) ? e.filter.attr : [e.filter?.attr];
  if (!card || !attrs.includes(card.attr) || card.cost > (e.maxCost ?? 99)) return state;

  const grave = [...(state[mk.grave] || []), unitToCard(board[me][col].splice(gi, 1)[0])];
  const nu = makeUnitFromCard(card);
  nu.summonedTurn = state.turn;
  if (!nu.tags?.includes("先制")) { nu.rotateDeg = -90; nu.acted = true; }
  board[me][col].splice(Math.min(gi, board[me][col].length), 0, nu);
  hand.splice(handIndex, 1);
  const ns = { ...state, board, [mk.hand]: hand, [mk.grave]: grave,
    log: [...state.log, `${gu.name}が成長→${card.name}召喚`] };
  applyConditionals(ns, me);
  return ns;
}

function moveUnit(state, me, col, idx, dest) {
  const board = cloneBoard(state.board);
  const unit = board[me][col].splice(idx, 1)[0];
  if (!unit) return state;
  unit.moved = true;
  if (!unit.tags?.includes("速攻")) { unit.acted = true; unit.rotateDeg = (unit.rotateDeg || 0) - 90; }
  board[me][dest.col].splice(Math.min(dest.idx, board[me][dest.col].length), 0, unit);
  const ns = { ...state, board, log: [...state.log, `${unit.name}が移動した`] };
  applyConditionals(ns, me);
  return ns;
}

function useActiveSkill(state, me, col, idx) {
  const board = cloneBoard(state.board);
  const u = board[me][col]?.[idx];
  if (!u || !canUseActive(u)) return state;
  const e = u.effect;
  const log = [...state.log, `${u.name}がスキルを発動`];
  const ctx = { board, side: me, col, idx, log };
  let ns = applyAction(e, resolveTargets(e.target || "self", ctx), ctx, { ...state, board, log });
  const mine = ns.board[me].flat().find(x => x.uid === u.uid);
  if (mine) {
    mine.abilityUsed = true;
    if (e.consumesAction !== false) { mine.acted = true; mine.rotateDeg = (mine.rotateDeg || 0) - 90; }
  }
  const vc = checkVictory(ns.board, state.turn);
  if (vc.over && !ns.gameOver) ns = { ...ns, gameOver: vc.winner };
  applyConditionals(ns, me);
  return ns;
}

// ===== 候補手の生成（実行すると新しい状態を返す関数のリスト） =====
function candidates(state, me, stage) {
  const mk = K(me);
  const out = [];
  const hand = state[mk.hand] || [];

  // 魔法・スペル（両フェーズ）
  hand.forEach((card, i) => {
    if (!isSpell(card) || !USABLE_SPELL_ACTIONS.includes(card.effect?.action)) return;
    if (getEffectiveCost(card, me, state.board, state[mk.grave]) > state[mk.cost]) return;
    if (!card.targetType || card.targetType === "none") {
      out.push(() => activateCard(state, me, i, null));
      return;
    }
    ["blue", "red"].forEach(side => state.board[side].forEach((col, c) => col.forEach((u, idx) => {
      if (validSpellTarget(card, me, side, u)) out.push(() => activateCard(state, me, i, { side, col: c, idx }));
    })));
  });

  // 能動スキル（両フェーズ）
  state.board[me].forEach((col, c) => col.forEach((u, i) => {
    if (u && canUseActive(u)) out.push(() => useActiveSkill(state, me, c, i));
  }));

  if (stage === "summon") {
    // 召喚（ユニットは最後尾、施設は好きな位置）
    const seen = new Set();
    hand.forEach((card, i) => {
      if (isSpell(card)) return;
      if (getEffectiveCost(card, me, state.board, state[mk.grave]) > state[mk.cost]) return;
      for (let col = 0; col < 3; col++) {
        const len = state.board[me][col].length;
        if (len >= 3) continue;
        const positions = card.type === TYPES.FACILITY ? Array.from({ length: len + 1 }, (_, p) => p) : [len];
        positions.forEach(p => {
          const key = `${card.id}|${col}|${p}`;
          if (seen.has(key)) return;
          seen.add(key);
          out.push(() => summonUnit(state, me, i, col, p));
        });
      }
    });
    // 成長
    state.board[me].forEach((col, c) => col.forEach(u => {
      if (u?.effect?.action !== "growth" || u.acted || u.summonedTurn === state.turn) return;
      hand.forEach((card, hi) => out.push(() => growUnit(state, me, c, u.uid, hi)));
    }));
  } else {
    // 攻撃・移動
    state.board[me].forEach((col, c) => col.forEach((u, i) => {
      if (!u || u.acted || u.stunned) return;
      if (u.atk > 0) {
        getAttackTargets(me, c, i, u, state.board).forEach(t =>
          out.push(() => attackUnit(state, me, c, i, t.col, t.idx)));
      }
      if (!u.moved && !u.isFacility && !u.isCore) {
        getMovable(me, c, i, state.board).forEach(d => out.push(() => moveUnit(state, me, c, i, d)));
      }
    }));
  }
  return out;
}

// ===== 最も評価が上がる手を、上がらなくなるまで繰り返す =====
function greedy(state, me, stage, maxIter) {
  let s = state;
  for (let n = 0; n < maxIter && !s.gameOver; n++) {
    const base = evaluate(s, me);
    let best = null;
    let bestScore = base + 0.01;   // 改善しない手は打たない
    for (const make of candidates(s, me, stage)) {
      let ns;
      try { ns = make(); } catch (e) { continue; }
      if (!ns || ns === s) continue;
      const sc = evaluate(ns, me) + Math.random() * W.noise;
      if (sc > bestScore) { bestScore = sc; best = ns; }
    }
    if (!best) break;
    s = best;
  }
  return s;
}

// 1ターン分の行動を決めて、行動後の状態を返す
export function planTurn(state, me) {
  let s = { ...state, log: [...state.log] };
  s = greedy(s, me, "summon", 25);
  if (!s.gameOver) s = greedy(s, me, "action", 40);
  // 今回のAIの行動ログに「相手:」を付ける
  const added = s.log.slice(state.log.length).map(l => `相手: ${l}`);
  return { ...s, log: [...state.log, ...added], gameOver: s.gameOver || null };
}

// PvE: 赤（後攻）がAI。エラーが起きてもゲームが止まらないようにする
export function runAITurn(state) {
  try {
    return planTurn(state, "red");
  } catch (e) {
    console.error("AI error", e);
    return { ...state, gameOver: state.gameOver || null };
  }
      }
