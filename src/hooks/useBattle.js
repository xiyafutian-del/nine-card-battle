import { useState, useEffect } from 'react';
import { CORE_CARD, INITIAL_CARDS } from '../constants/cards.js';
import { getGeneratorCost } from '../constants/index.js';
import { makeUnitFromCard } from '../engine/effects.js';
import { cloneBoard, buildDeck, checkVictory, applyTurnStart,
         summonUnit, attackUnit, activateCard,
         getAttackTargets, getMovable, rowToCoord } from '../engine/battle.js';
import { runAITurn } from '../engine/ai.js';

function initBattle(mode, cardPool, deckCounts, playerGenerator) {
  const pDeck = buildDeck(cardPool, deckCounts);
  const rDeck = buildDeck(cardPool, deckCounts); // AIも同じデッキを使う
  const pHand = pDeck.splice(0, 4);
  const rHand = rDeck.splice(0, 4);
  const board = { blue: [[], [], []], red: [[], [], []] };
  board.blue[1] = [{ ...makeUnitFromCard(CORE_CARD), uid: "core-blue" }];
  board.red[1]  = [{ ...makeUnitFromCard(CORE_CARD), uid: "core-red" }];
  let state = {
    board,
    playerDeck: pDeck, aiDeck: rDeck,
    playerHand: pHand, aiHand: rHand,
    playerCost: 0, aiCost: 0,
    playerGrave: [], aiGrave: [],
    turn: 1, active: "blue", firstPlayer: "blue",
    playerGenerator, aiGenerator: "water",
    mode, selectedUnit: null, selectedSpell: null,
    log: ["バトル開始！"], gameOver: null,
  };
  state = applyTurnStart(state, "blue", playerGenerator);
  return state;
}

export function useBattle(cardPool, deckCounts, playerGenerator, onAction) {
  const [battle, setBattle] = useState(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  // AI ターン
  useEffect(() => {
    if (battle?.mode === "pve" && battle.active === "red" && !battle.gameOver) {
      const t = setTimeout(() => {
        setBattle(prev => {
          if (!prev || prev.gameOver || prev.active !== "red") return prev;
          const result = runAITurn(prev);
          let ns = { ...prev, ...result };
          if (!result.gameOver) {
            ns.board.blue.forEach(col => col.forEach(u => u && (u.acted = false)));
            ns = { ...ns, active: "blue", turn: prev.turn + 1, selectedUnit: null, selectedSpell: null };
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
    setBattle(initBattle(mode, cardPool, deckCounts, playerGenerator));
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
      board[next].forEach(col => col.forEach(u => u && (u.acted = false)));
      // temp ATK リセット
      board[next].forEach(col => col.forEach(u => {
        if (u?.atkTempUp) { u.atk -= u.atkTempUp; u.atkTempUp = 0; }
      }));
      const vc = checkVictory(board, prev.turn);
      if (vc.over) return { ...prev, board, gameOver: vc.winner, log: [...prev.log, vc.reason] };
      let ns = { ...prev, board, active: next, turn: prev.turn + 1, selectedUnit: null, selectedSpell: null };
      ns = applyTurnStart(ns, next, next === "blue" ? prev.playerGenerator : prev.aiGenerator);
      ns.log = [...ns.log, `${next==="blue"?"あなた":"相手"}のターン (Turn ${ns.turn})`];
      return ns;
    });
    // ターン終了は常に送信
    setTimeout(() => onAction?.(), 50);
  }

  function handleCellClick(row, col, extra) {
    setBattle(prev => {
      if (!prev || prev.gameOver) return prev;
      if (prev.mode === "pve" && prev.active === "red") return prev;

      // 盤面外タップ（row=-1）→ 選択キャンセル
      if (row === -1 && !extra?.spell) {
        return { ...prev, selectedUnit: null, selectedSpell: null };
      }

      const { side, idx } = rowToCoord(row);
      const { active, selectedUnit, selectedSpell } = prev;
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
            board[active][col].splice(idx, 0, unit);
            const ns = { ...prev, board, selectedUnit: null, log: [...prev.log, `${unit.name}が移動した`] };
            setTimeout(() => onAction?.(), 50);
            return ns;
          }
          // 成長効果
          const u = prev.board[side][col][idx];
          if (u?.effect?.action === "growth" && !u.acted && u.summonedTurn !== prev.turn) {
            const board2 = cloneBoard(prev.board);
            const hand2 = active === "blue" ? [...prev.playerHand] : [...prev.aiHand];
            const grave2 = active === "blue" ? [...(prev.playerGrave||[])] : [...(prev.aiGrave||[])];
            const log2 = [...prev.log];
            const e = u.effect;
            const attrs = Array.isArray(e.filter?.attr) ? e.filter.attr : [e.filter?.attr];
            const candidates = hand2.filter(c => attrs.includes(c.attr) && c.cost <= (e.maxCost||99))
                                    .sort((a,b) => b.cost - a.cost);
            if (candidates.length > 0) {
              const card = candidates[0];
              const hi = hand2.findIndex(c => c._k === card._k);
              const self = board2[active][col].splice(idx, 1)[0];
              if (self) grave2.push(self);
              board2[active][col].splice(Math.min(idx, board2[active][col].length), 0, makeUnitFromCard(card));
              hand2.splice(hi, 1);
              log2.push(`${self?.name}が成長→${card.name}召喚`);
              const costUpd = active === "blue"
                ? { playerHand: hand2, playerGrave: grave2 }
                : { aiHand: hand2, aiGrave: grave2 };
              const ns = { ...prev, board: board2, log: log2, selectedUnit: null, ...costUpd };
              setTimeout(() => onAction?.(), 50);
              return ns;
            }
            return { ...prev, log: [...prev.log, "成長: 条件カードなし"], selectedUnit: null };
          }
          // 別ユニット選択
          if (u && !u.acted && !turn1block) return { ...prev, selectedUnit: { col, idx } };
          return { ...prev, selectedUnit: null };
        }
        return { ...prev, selectedUnit: null };
      }

      // 新規選択
      if (side === active && !turn1block) {
        const u = prev.board[side][col][idx];
        if (u && !u.acted) return { ...prev, selectedUnit: { col, idx } };
      }
      return prev;
    });
  }

  function handleSummon(handIndex, row, col) {
    setBattle(prev => {
      if (!prev || prev.gameOver) return prev;
      const { active } = prev;

      // row=-1 はスペル発動（盤面外）
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
    handleCellClick, handleSummon,
    setConfirmLeave, setBattle,
  };
                                     }
