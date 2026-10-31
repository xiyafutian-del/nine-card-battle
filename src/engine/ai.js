import { summonUnit, attackUnit, getAttackTargets } from './battle.js';
import { getEffectiveCost } from './effects.js';
import { TYPES } from '../constants/index.js';

// 簡易AI（強化前）: 出せるユニットを最後尾に召喚 → 攻撃（コア優先）
export function runAITurn(state) {
  let s = { ...state, log: [...state.log] };

  // ── 召喚（スペル・魔法は使わない）──
  let progress = true;
  while (progress && !s.gameOver) {
    progress = false;
    for (let i = 0; i < s.aiHand.length; i++) {
      const card = s.aiHand[i];
      if (card.type === TYPES.SPELL || card.type === TYPES.MAGIC) continue;
      if (getEffectiveCost(card, "red", s.board, s.aiGrave) > s.aiCost) continue;
      const col = [1, 0, 2].find(c => s.board.red[c].length < 3);
      if (col === undefined) break;
      const ns = summonUnit(s, "red", i, col, s.board.red[col].length);
      if (ns !== s) { s = ns; progress = true; break; }
    }
  }

  // ── 攻撃 ──
  const findUnit = uid => {
    for (let c = 0; c < 3; c++) {
      const idx = s.board.red[c].findIndex(u => u.uid === uid);
      if (idx >= 0) return { col: c, idx, unit: s.board.red[c][idx] };
    }
    return null;
  };
  const uids = s.board.red.flat().map(u => u.uid);

  for (const uid of uids) {
    for (let n = 0; n < 3 && !s.gameOver; n++) {
      const pos = findUnit(uid);
      if (!pos || pos.unit.acted || pos.unit.atk <= 0) break;
      const targets = getAttackTargets("red", pos.col, pos.idx, pos.unit, s.board);
      if (targets.length === 0) break;
      const pick = targets.find(t => s.board.blue[t.col][t.idx]?.isCore) || targets[0];
      s = attackUnit(s, "red", pos.col, pos.idx, pick.col, pick.idx);
    }
    if (s.gameOver) break;
  }

  return { ...s, gameOver: s.gameOver || null };
}
