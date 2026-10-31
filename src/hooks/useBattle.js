import { useState, useEffect } from 'react';
import { CORE_CARD } from '../constants/cards.js';
import { makeUnitFromCard, applyConditionals, unitToCard } from '../engine/effects.js';
import { cloneBoard, buildDeck, checkVictory, applyTurnStart,
         summonUnit, attackUnit, activateCard,
         getAttackTargets, getMovable, rowToCoord } from '../engine/battle.js';
import { runAITurn } from '../engine/ai.js';

// 対象指定スペルの有効対象判定（ドロップ時・タップ時で共通）
function isValidSpellTarget(card, active, side, unit) {
  if (!unit) return false;
  const ally = side === active;
  switch (card.targetType) {
    case "enemy":         return !ally;
    case "enemy_noncore": return !ally && !unit.isCore;
    case "ally":          return ally;
    case "ally_wall":     return ally && unit.attr === "wall";
    case "ally_machine":  return ally && unit.attr === "machine";
    default:              return false;
  }
}

// 場の能力（サンドゴーレム: 壁と位置を入れ替え）を持つか
const hasAbility = u => u?.effect?.trigger === "activate" && u?.effect?.action === "swap_self";

const findSkin = (deckSkins, ownedSkins, key) => {
  const id = deckSkins?.[key];
  return id ? (ownedSkins || []).find(s => s.instanceId === id) || null : null;
};

// フェーズは「召喚 → 行動（移動・攻撃）」の2段階。戻れない
const PHASE_ORDER = ["summon", "action"];
const CLEAR_SEL = { selectedUnit: null, selectedSpell: null, selectedGrowth: null, selectedAbility: null };

function initBattle(mode, cardPool, deckCounts, playerGenerator, deckSkins, ownedSkins, deckName) {
  const name = deckName || "noname";
  const pDeck = buildDeck(cardPool, deckCounts);
  const rDeck = buildDeck(cardPool, deckCounts);

  const idx = {};
  pDeck.forEach(card => {
    const i = idx[card.id] || 0;
    idx[card.id] = i + 1;
    card.skin = findSkin(deckSkins, ownedSkins, `${name}-${card.id}-${i}`);
  });

  const pHand = pDeck.splice(0, 4);
  const rHand = rDeck.splice(0, 4);

  const board = { blue: [[], [], []], red: [[], [], []] };
  board.blue[1] = [{ ...makeUnitFromCard(CORE_CARD), uid: "core-blue", atk: 0 }];
  board.red[1]  = [{ ...makeUnitFromCard(CORE_CARD), uid: "core-red",  atk: 0 }];
  const coreSkin = findSkin(deckSkins, ownedSkins, `${name}-core-0`);
  if (coreSkin) board.blue[1][0].skin = coreSkin;

  const state = {
    board,
    playerDeck: pDeck, aiDeck: rDeck,
    playerHand: pHand, aiHand: rHand,
    playerCost: 0, aiCost: 0,
    playerGrave: [], aiGrave: [],
    turn: 1, active: "blue", firstPlayer: "blue",
    playerGenerator, aiGenerator: "water",
    mode, phase: "summon",
    ...CLEAR_SEL,
    log: ["バトル開始！"], gameOver: null,
  };
  return applyTurnStart(state, "blue", playerGenerator);
}

export function useBattle(cardPool, deckCounts, playerGenerator, onAction, deckSkins, ownedSkins, deckName) {
  const [battle, setBattle] = useState(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const push = () => setTimeout(() => onAction?.(), 50);

  // ===== AIターン =====
  useEffect(() => {
    if (battle?.mode === "pve" && battle.active === "red" && !battle.gameOver) {
      const t = setTimeout(() => {
        setBattle(prev => {
          if (!prev || prev.gameOver || prev.active !== "red") return prev;
          const result = runAITurn(prev);
          let ns = { ...prev, ...result };
          if (!result.gameOver) {
            const board = cloneBoard(ns.board);
            board.red.forEach(col => col.forEach(u => {
              if (u?.atkTempUp) { u.atk -= u.atkTempUp; u.atkTempUp = 0; }
            }));
            ns = { ...ns, board, active: "blue", turn: prev.turn + 1, ...CLEAR_SEL };
            ns = applyTurnStart(ns, "blue", prev.playerGenerator);
            ns.log = [...ns.log, `あなたのターン (Turn ${ns.turn})`];
          }
          return ns;
        });
      }, 800);
      return () => clearTimeout(t);
    }
  }, [battle?.active, battle?.turn]);

  function startBattle(mode) {
    setConfirmLeave(false);
    setBattle(initBattle(mode, cardPool, deckCounts, playerGenerator, deckSkins, ownedSkins, deckName));
  }

  function requestBack() {
    if (battle && !battle.gameOver) { setConfirmLeave(true); return; }
    leaveToLobby();
  }

  function leaveToLobby() {
    setBattle(null);
    setConfirmLeave(false);
  }

  // ===== フェーズ進行（戻れない） =====
  function nextPhase() {
    setBattle(prev => {
      if (!prev || prev.gameOver) return prev;
      const i = PHASE_ORDER.indexOf(prev.phase || "summon");
      if (i < 0 || i >= PHASE_ORDER.length - 1) return prev;
      return { ...prev, phase: PHASE_ORDER[i + 1], ...CLEAR_SEL };
    });
    push();
  }

  // ===== ターン終了 =====
  function endTurn() {
    setBattle(prev => {
      if (!prev || prev.gameOver) return prev;
      const board = cloneBoard(prev.board);
      const cur = prev.active;
      const next = cur === "blue" ? "red" : "blue";
      const gk = cur === "blue" ? "playerGrave" : "aiGrave";
      const grave = [...(prev[gk] || [])];
      const log = [...prev.log];

      // 手番側: 一時ATK解除 / オーバークロック持ちを破壊
      board[cur].forEach(col => {
        for (let i = col.length - 1; i >= 0; i--) {
          const u = col[i];
          if (!u) continue;
          if (u.atkTempUp) { u.atk -= u.atkTempUp; u.atkTempUp = 0; }
          if (u.overclocked) {
            grave.push(unitToCard(col.splice(i, 1)[0]));
            log.push(`${u.name}はオーバークロックで破壊された`);
          }
        }
      });

      const vc = checkVictory(board, prev.turn);
      if (vc.over) return { ...prev, board, [gk]: grave, gameOver: vc.winner, log: [...log, vc.reason] };

      let ns = { ...prev, board, [gk]: grave, log, active: next, turn: prev.turn + 1, ...CLEAR_SEL };
      ns = applyTurnStart(ns, next, next === "blue" ? prev.playerGenerator : prev.aiGenerator);
      ns.log = [...ns.log, `${next === "blue" ? "あなた" : "相手"}のターン (Turn ${ns.turn})`];
      return ns;
    });
    push();
  }

  // ===== 場の能力の発動準備（選択中のユニットから） =====
  function handleAbility() {
    setBattle(prev => {
      if (!prev || prev.gameOver || !prev.selectedUnit) return prev;
      const { col, idx } = prev.selectedUnit;
      const u = prev.board[prev.active]?.[col]?.[idx];
      if (!hasAbility(u)) return prev;
      return { ...prev, ...CLEAR_SEL, selectedAbility: { col, idx } };
    });
  }

  // ===== セルタップ =====
  function handleCellClick(row, col, extra) {
    setBattle(prev => {
      if (!prev || prev.gameOver) return prev;
      if (prev.mode === "pve" && prev.active === "red") return prev;

      // 盤面外タップ: 全選択キャンセル（extra.spell は対象選択状態へ）
      if (row === -1) {
        if (extra?.spell) {
          return { ...prev, ...CLEAR_SEL, selectedSpell: { handIndex: extra.handIndex, card: extra.card } };
        }
        return { ...prev, ...CLEAR_SEL };
      }

      const phase = prev.phase || "summon";
      const { side, idx } = rowToCoord(row);
      const { active, selectedUnit, selectedSpell, selectedGrowth, selectedAbility } = prev;
      const enem = active === "blue" ? "red" : "blue";
      const turn1block = prev.turn === 1 && active === prev.firstPlayer;
      const tapped = prev.board[side]?.[col]?.[idx];

      // 場の能力: 入れ替える壁を選択中
      if (selectedAbility) {
        const same = selectedAbility.col === col && selectedAbility.idx === idx;
        if (side === active && tapped?.attr === "wall" && !same) {
          const board = cloneBoard(prev.board);
          const a = board[active][selectedAbility.col][selectedAbility.idx];
          const b = board[active][col][idx];
          if (a && b) {
            board[active][selectedAbility.col][selectedAbility.idx] = b;
            board[active][col][idx] = a;
            const ns = { ...prev, board, ...CLEAR_SEL, log: [...prev.log, `${a.name}が${b.name}と位置を入れ替えた`] };
            applyConditionals(ns, active);
            push();
            return ns;
          }
        }
        return { ...prev, ...CLEAR_SEL };
      }

      // オーバークロック発動（行動済みの自軍ユニットをタップ）
      if (!selectedSpell && side === active && tapped?.tags?.includes("オーバークロック")
          && tapped.acted && !tapped.overclocked) {
        const board = cloneBoard(prev.board);
        const u = board[active][col][idx];
        u.acted = false; u.stunned = false; u.actCount = 0; u.moved = false;
        u.rotateDeg = 0; u.overclocked = true;
        push();
        return { ...prev, board, ...CLEAR_SEL, log: [...prev.log, `${u.name}がオーバークロック`] };
      }

      // スペル対象指定中
      if (selectedSpell) {
        const { handIndex, card } = selectedSpell;
        if (!isValidSpellTarget(card, active, side, tapped)) return { ...prev, selectedSpell: null };
        const ns = activateCard(prev, active, handIndex, { side, col, idx });
        push();
        return { ...ns, selectedSpell: null };
      }

      // 選択できるか: 行動フェーズで未行動 / 場の能力持ちはいつでも
      const canSelect = u => !!u && (
        (!u.acted && !u.stunned && phase !== "summon" && !turn1block) || hasAbility(u)
      );

      // ユニット選択中
      if (selectedUnit) {
        const su = selectedUnit;
        const attacker = prev.board[active][su.col]?.[su.idx];
        if (!attacker) return { ...prev, selectedUnit: null };
        const canAct = phase === "action" && !turn1block && !attacker.acted && !attacker.stunned;

        // 攻撃（行動フェーズ）
        if (side === enem) {
          if (canAct) {
            const valid = getAttackTargets(active, su.col, su.idx, attacker, prev.board);
            if (valid.some(t => t.col === col && t.idx === idx)) {
              const ns = attackUnit(prev, active, su.col, su.idx, col, idx);
              push();
              return { ...ns, selectedUnit: null };
            }
          }
          return { ...prev, selectedUnit: null };
        }

        if (side === active) {
          // 移動（行動フェーズ・1回のみ）
          if (canAct && !attacker.moved) {
            const movable = getMovable(active, su.col, su.idx, prev.board);
            if (movable.some(m => m.col === col && m.idx === idx)) {
              const board = cloneBoard(prev.board);
              const unit = board[active][su.col].splice(su.idx, 1)[0];
              unit.moved = true;
              // 速攻持ちは移動しても回転・行動済みにならない
              if (!unit.tags?.includes("速攻")) {
                unit.acted = true;
                unit.rotateDeg = (unit.rotateDeg || 0) - 90;
              }
              board[active][col].splice(Math.min(idx, board[active][col].length), 0, unit);
              const ns = { ...prev, board, selectedUnit: null, log: [...prev.log, `${unit.name}が移動した`] };
              applyConditionals(ns, active);
              push();
              return ns;
            }
          }
          // 別ユニットに選択切替
          const same = su.col === col && su.idx === idx;
          if (!same && canSelect(tapped)) return { ...prev, selectedUnit: { col, idx } };
        }
        return { ...prev, selectedUnit: null };
      }

      // 成長（召喚フェーズのみ）
      const growthOk = side === active && tapped?.effect?.action === "growth"
        && !tapped.acted && tapped.summonedTurn !== prev.turn && phase === "summon";
      if (growthOk) return { ...prev, ...CLEAR_SEL, selectedGrowth: { col, idx, unit: tapped } };
      if (selectedGrowth) return { ...prev, selectedGrowth: null };

      // 新規選択
      if (side === active && canSelect(tapped)) return { ...prev, selectedUnit: { col, idx } };

      return prev;
    });
  }

  // ===== 成長: 手札から選んで召喚 =====
  function handleGrowthSelect(handIndex) {
    setBattle(prev => {
      if (!prev || !prev.selectedGrowth) return prev;
      if ((prev.phase || "summon") !== "summon") return prev;
      const { active, selectedGrowth } = prev;
      const { col, unit: gu } = selectedGrowth;
      const hk = active === "blue" ? "playerHand" : "aiHand";
      const gk = active === "blue" ? "playerGrave" : "aiGrave";
      const hand = [...prev[hk]];
      const grave = [...(prev[gk] || [])];
      const board = cloneBoard(prev.board);
      const log = [...prev.log];

      const card = hand[handIndex];
      if (!card) return prev;
      const e = gu.effect;
      const attrs = Array.isArray(e.filter?.attr) ? e.filter.attr : [e.filter?.attr];
      if (!attrs.includes(card.attr) || card.cost > (e.maxCost ?? 99)) return prev;

      const gi = board[active][col].findIndex(u => u.uid === gu.uid);
      if (gi === -1) return prev;
      grave.push(unitToCard(board[active][col].splice(gi, 1)[0]));

      const nu = makeUnitFromCard(card);
      nu.summonedTurn = prev.turn;
      if (!nu.tags?.includes("先制")) { nu.rotateDeg = -90; nu.acted = true; }
      board[active][col].splice(Math.min(gi, board[active][col].length), 0, nu);
      hand.splice(handIndex, 1);
      log.push(`${gu.name}が成長→${card.name}召喚`);

      const ns = { ...prev, board, log, [hk]: hand, [gk]: grave, ...CLEAR_SEL };
      applyConditionals(ns, active);
      push();
      return ns;
    });
  }

  // ===== 召喚・スペル発動（手札からのドロップ） =====
  function handleSummon(handIndex, row, col) {
    setBattle(prev => {
      if (!prev || prev.gameOver) return prev;
      if (prev.mode === "pve" && prev.active === "red") return prev;
      const { active } = prev;
      const hand = active === "blue" ? prev.playerHand : prev.aiHand;
      const card = hand[handIndex];
      if (!card) return prev;
      const isSpell = card.type === "spell" || card.type === "magic";

      // スペル・魔法はいつでも（盤面へのドロップで使用）
      if (isSpell) {
        if (!card.targetType || card.targetType === "none") {
          const ns = activateCard(prev, active, handIndex, null);
          push();
          return ns;
        }
        if (row >= 0) {
          const { side, idx } = rowToCoord(row);
          const target = prev.board[side]?.[col]?.[idx];
          if (isValidSpellTarget(card, active, side, target)) {
            const ns = activateCard(prev, active, handIndex, { side, col, idx });
            push();
            return ns;
          }
        }
        return { ...prev, ...CLEAR_SEL, selectedSpell: { handIndex, card } };
      }

      // ユニット・施設は召喚フェーズのみ
      if ((prev.phase || "summon") !== "summon") return prev;
      if (row < 0) return prev;
      const { side, idx } = rowToCoord(row);
      if (side !== active) return prev;
      const len = prev.board[active][col].length;
      if (len >= 3) return prev;
      // ユニットは最後尾、施設はどこでも
      const insertIdx = card.type === "facility" ? Math.min(idx, len) : len;
      const ns = summonUnit(prev, active, handIndex, col, insertIdx);
      push();
      return ns;
    });
  }

  return {
    battle, confirmLeave,
    startBattle, requestBack, leaveToLobby, endTurn, nextPhase,
    handleCellClick, handleSummon, handleGrowthSelect, handleAbility,
    setConfirmLeave, setBattle,
  };
                  }
