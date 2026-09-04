import { cloneBoard, getAttackTargets, checkVictory } from './battle.js';
import { makeUnitFromCard } from './effects.js';
import { TYPES } from '../constants/index.js';

export function runAITurn(state) {
  let board = cloneBoard(state.board);
  let hand = [...state.aiHand];
  let cost = state.aiCost;
  const log = [...state.log];
  let gameOver = null;

  // ── 召喚 ──
  let progress = true;
  while (progress) {
    progress = false;
    for (let i = 0; i < hand.length; i++) {
      const card = hand[i];
      const isSpellMagic = card.type === TYPES.SPELL || card.type === TYPES.MAGIC;
      if (isSpellMagic) continue;
      if (card.cost <= cost) {
        for (const c of [1, 0, 2]) {
          if (board.red[c].length < 3) {
            const unit = makeUnitFromCard(card);
            unit.summonedTurn = state.turn;
            board.red[c].push(unit);
            cost -= card.cost;
            hand.splice(i, 1);
            log.push(`相手が${card.name}を召喚した`);
            progress = true;
            break;
          }
        }
      }
      if (progress) break;
    }
  }

  // ── 攻撃 ──
  outer: for (let c = 0; c < 3; c++) {
    for (let idx = 0; idx < board.red[c].length; idx++) {
      const unit = board.red[c][idx];
      if (!unit || unit.atk <= 0 || unit.acted) continue;
      const valid = getAttackTargets("red", c, idx, unit, board);
      if (valid.length === 0) continue;

      const target = valid.find(t => board.blue[t.col][t.idx]?.isCore) || valid[0];
      const tUnit = board.blue[target.col][target.idx];
      tUnit.hp -= unit.atk;
      unit.acted = true;
      log.push(`${unit.name}→${tUnit.name}に${unit.atk}ダメージ`);

      if (tUnit.hp <= 0) {
        if (tUnit.isCore) { gameOver = "red"; log.push("コアを破壊した"); }
        else log.push(`${tUnit.name}を撃破`);
        board.blue[target.col].splice(target.idx, 1);
        if (gameOver) break outer;
      }
    }
  }

  const vc = checkVictory(board, state.turn);
  if (vc.over && !gameOver) { gameOver = vc.winner; log.push(vc.reason); }

  return { board, aiHand: hand, aiCost: cost, log, gameOver };
}