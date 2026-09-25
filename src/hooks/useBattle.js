import { useState, useEffect } from 'react';
import { CORE_CARD } from '../constants/cards.js';
import { getGeneratorCost } from '../constants/index.js';
import { makeUnitFromCard } from '../engine/effects.js';
import { cloneBoard, buildDeck, checkVictory, applyTurnStart,
         summonUnit, attackUnit, activateCard,
         getAttackTargets, getMovable, rowToCoord } from '../engine/battle.js';
import { runAITurn } from '../engine/ai.js';
function initBattle(mode, cardPool, deckCounts, playerGenerator, deckSkins, ownedSkins, deckName) {
  const pDeck = buildDeck(cardPool, deckCounts);
  const rDeck = buildDeck(cardPool, deckCounts);

  // スキンをデッキカードに付与
  const idx = {};
  pDeck.forEach(card => {
    const i = idx[card.id] || 0;
    idx[card.id] = i + 1;
    const key = `${deckName||"noname"}-${card.id}-${i}`;
    const instanceId = deckSkins?.[key];
    card.skin = instanceId ? (ownedSkins||[]).find(s => s.instanceId === instanceId) || null : null;
  });

  const pHand = pDeck.splice(0, 4);
  const rHand = rDeck.splice(0, 4);
  const board = { blue: [[], [], []], red: [[], [], []] };
  board.blue[1] = [{ ...makeUnitFromCard(CORE_CARD), uid: "core-blue", atk: 0 }];
  board.red[1]  = [{ ...makeUnitFromCard(CORE_CARD), uid: "core-red",  atk: 0 }];

  // コアスキン
  const coreKey = `${deckName||"noname"}-core-0`;
  const coreInstanceId = deckSkins?.[coreKey];
  const coreSkin = coreInstanceId ? (ownedSkins||[]).find(s => s.instanceId === coreInstanceId) || null : null;
  if (coreSkin) {
    board.blue[1][0].skin = coreSkin;
  }

  let state = {
    board,
    playerDeck: pDeck, aiDeck: rDeck,
    playerHand: pHand, aiHand: rHand,
    playerCost: 0, aiCost: 0,
    playerGrave: [], aiGrave: [],
    turn: 1, active: "blue", firstPlayer: "blue",
    playerGenerator, aiGenerator: "water",
    mode,
    selectedUnit: null, selectedSpell: null, selectedGrowth: null,
    log: ["バトル開始！"], gameOver: null,
  };
  state = applyTurnStart(state, "blue", playerGenerator);
  return state;
}

export function useBattle(cardPool, deckCounts, playerGenerator, onAction, deckSkins, ownedSkins, deckName) {
 const [battle, setBattle] = useState(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  useEffect(() => {
    if (battle?.mode === "pve" && battle.active === "red" && !battle.gameOver) {
      const t = setTimeout(() => {
        setBattle(prev => {
          if (!prev || prev.gameOver || prev.active !== "red") return prev;
          const result = runAITurn(prev);
          let ns = { ...prev, ...result };
          if (!result.gameOver) {
            ns.board.blue.forEach(col => col.forEach(u => u && (u.acted = false)));
            ns = { ...ns, active: "blue", turn: prev.turn + 1, selectedUnit: null, selectedSpell: null, selectedGrowth: null };
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

  function endTurn() {
    setBattle(prev => {
      if (!prev || prev.gameOver) return prev;
      const board = cloneBoard(prev.board);
      const next = prev.active === "blue" ? "red" : "blue";
      board[next].forEach(col => col.forEach(u => {
        if (!u) return;
        u.rotateDeg = Math.min(0, (u.rotateDeg || 0) + 90);
        u.actCount = 0;
        u.stunned = false;
      }));
      board[next].forEach(col => col.forEach(u => {
        if (u?.atkTempUp) { u.atk -= u.atkTempUp; u.atkTempUp = 0; }
      }));
      const vc = checkVictory(board, prev.turn);
      if (vc.over) return { ...prev, board, gameOver: vc.winner, log: [...prev.log, vc.reason] };
      let ns = { ...prev, board, active: next, turn: prev.turn + 1, selectedUnit: null, selectedSpell: null, selectedGrowth: null };
      ns = applyTurnStart(ns, next, next === "blue" ? prev.playerGenerator : prev.aiGenerator);
      ns.log = [...ns.log, `${next==="blue"?"あなた":"相手"}のターン (Turn ${ns.turn})`];
      return ns;
    });
    setTimeout(() => onAction?.(), 50);
  }

  function handleCellClick(row, col, extra) {
    setBattle(prev => {
      if (!prev || prev.gameOver) return prev;
      if (prev.mode === "pve" && prev.active === "red") return prev;

      // 盤面外タップ → 全選択キャンセル
      if (row === -1 && !extra?.spell) {
        return { ...prev, selectedUnit: null, selectedSpell: null, selectedGrowth: null };
      }

      const { side, idx } = rowToCoord(row);
      const { active, selectedUnit, selectedSpell, selectedGrowth } = prev;
      const enem = active === "blue" ? "red" : "blue";
      const turn1block = prev.turn === 1 && active === prev.firstPlayer;

      // スペル対象指定中
      if (selectedSpell) {
        const { handIndex, card } = selectedSpell;
        const unit = prev.board[side]?.[col]?.[idx];
        if (!unit) return { ...prev, selectedSpell: null };
        const tType = card.targetType;
        if (tType === "enemy" && side !== enem) return { ...prev, selectedSpell: null };
        if (tType === "enemy_noncore" && (side !== enem || unit.isCore)) return { ...prev, selectedSpell: null };
        if (tType === "ally" && side !== active) return { ...prev, selectedSpell: null };
        if (tType === "ally_wall" && (side !== active || unit.attr !== "wall")) return { ...prev, selectedSpell: null };
        const ns = activateCard(prev, active, handIndex, { side, col, idx });
        setTimeout(() => onAction?.(), 50);
        return { ...ns, selectedSpell: null };
      }

      if (selectedUnit) {
        const su = selectedUnit;
        const attacker = prev.board[active][su.col]?.[su.idx];
        if (!attacker) return { ...prev, selectedUnit: null };

        // 攻撃
        if (side === enem) {
          const valid = getAttackTargets(active, su.col, su.idx, attacker, prev.board);
          if (valid.some(t => t.col === col && t.idx === idx)) {
            const ns = attackUnit(prev, active, su.col, su.idx, col, idx);
            setTimeout(() => onAction?.(), 50);
            return { ...ns, selectedUnit: null };
          }
          return { ...prev, selectedUnit: null };
        }

        // 移動
        if (side === active) {
          const movable = getMovable(active, su.col, su.idx, prev.board);
          if (movable.some(m => m.col === col && m.idx === idx)) {
            const board = cloneBoard(prev.board);
            const unit = board[active][su.col].splice(su.idx, 1)[0];
            unit.acted = true;
            unit.rotateDeg = (unit.rotateDeg || 0) - 90;
            board[active][col].splice(idx, 0, unit);
            const ns = { ...prev, board, selectedUnit: null, log: [...prev.log, `${unit.name}が移動した`] };
            setTimeout(() => onAction?.(), 50);
            return ns;
          }
          // 成長効果
          const u = prev.board[side][col][idx];
          if (u?.effect?.action === "growth" && !u.acted && u.summonedTurn !== prev.turn) {
            return { ...prev, selectedGrowth: { col, idx, unit: u }, selectedUnit: null };
          }
          if (u && !u.acted && !u.stunned && !turn1block) return { ...prev, selectedUnit: { col, idx } };
          return { ...prev, selectedUnit: null };
        }
        return { ...prev, selectedUnit: null };
      }

      // 成長選択中に盤面タップ → キャンセル
      if (selectedGrowth) {
        return { ...prev, selectedGrowth: null };
      }

      // 成長カードをタップ
      if (side === active && !turn1block) {
        const u = prev.board[side][col][idx];
        if (u?.effect?.action === "growth" && !u.acted && u.summonedTurn !== prev.turn) {
          return { ...prev, selectedGrowth: { col, idx, unit: u }, selectedUnit: null };
        }
        if (u && !u.acted && !u.stunned) return { ...prev, selectedUnit: { col, idx } };
      }
      return prev;
    });
  }

  function handleGrowthSelect(handIndex) {
    setBattle(prev => {
      if (!prev || !prev.selectedGrowth) return prev;
      const { active, selectedGrowth } = prev;
      const { col, idx, unit: growthUnit } = selectedGrowth;
      const hand = active === "blue" ? [...prev.playerHand] : [...prev.aiHand];
      const grave = active === "blue" ? [...(prev.playerGrave||[])] : [...(prev.aiGrave||[])];
      const log = [...prev.log];
      const board = cloneBoard(prev.board);

      const card = hand[handIndex];
      if (!card) return prev;

      const e = growthUnit.effect;
      const attrs = Array.isArray(e.filter?.attr) ? e.filter.attr : [e.filter?.attr];
      if (!attrs.includes(card.attr) || card.cost > (e.maxCost || 99)) return prev;

      const growthIdx = board[active][col].findIndex(u => u.uid === growthUnit.uid);
      if (growthIdx === -1) return prev;
      const removed = board[active][col].splice(growthIdx, 1)[0];
      grave.push(removed);

      const newUnit = makeUnitFromCard(card);
      newUnit.summonedTurn = prev.turn;
      if (!newUnit.tags?.includes("先制")) {
        newUnit.rotateDeg = -90;
        newUnit.acted = true;
      }
      board[active][col].splice(Math.min(growthIdx, board[active][col].length), 0, newUnit);
      hand.splice(handIndex, 1);
      log.push(`${growthUnit.name}が成長→${card.name}召喚`);

      const costUpd = active === "blue"
        ? { playerHand: hand, playerGrave: grave }
        : { aiHand: hand, aiGrave: grave };

      setTimeout(() => onAction?.(), 50);
      return { ...prev, board, log, selectedGrowth: null, selectedUnit: null, ...costUpd };
    });
  }

  function handleSummon(handIndex, row, col) {
    setBattle(prev => {
      if (!prev || prev.gameOver) return prev;
      const { active } = prev;

      if (row === -1) {
        const hand = active === "blue" ? prev.playerHand : prev.aiHand;
        const card = hand[handIndex];
        if (!card) return prev;
        if (card.type === "spell" || card.type === "magic") {
          if (!card.targetType || card.targetType === "none") {
            const ns = activateCard(prev, active, handIndex, null);
            setTimeout(() => onAction?.(), 50);
            return ns;
          }
          return { ...prev, selectedSpell: { handIndex, card } };
        }
        return prev;
      }

      const { side, idx } = rowToCoord(row);
      if (side !== active) return prev;
      const hand = active === "blue" ? prev.playerHand : prev.aiHand;
      const card = hand[handIndex];
      if (!card) return prev;

      if (card.type === "spell" || card.type === "magic") {
        if (!card.targetType || card.targetType === "none") {
          const ns = activateCard(prev, active, handIndex, null);
          setTimeout(() => onAction?.(), 50);
          return ns;
        }
        return { ...prev, selectedSpell: { handIndex, card } };
      }

      const ns = summonUnit(prev, active, handIndex, col, idx);
      setTimeout(() => onAction?.(), 50);
      return ns;
    });
  }

  return {
    battle, confirmLeave,
    startBattle, requestBack, leaveToLobby, endTurn,
    handleCellClick, handleSummon, handleGrowthSelect,
    setConfirmLeave, setBattle,
  };
    }
