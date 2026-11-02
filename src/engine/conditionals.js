// 条件付き効果・場の状況で変わるステータス（行動のたびに再計算）

const attrList = f => (Array.isArray(f?.attr) ? f.attr : [f?.attr]);

// 場のユニットが条件に合うか（attr / type / tag / name を組み合わせ可能）
function matchFilter(u, f = {}) {
  if (!u) return false;
  if (f.attr !== undefined && !attrList(f).includes(u.attr)) return false;
  if (f.type && u.type !== f.type) return false;
  if (f.tag && !(u.tags || []).includes(f.tag)) return false;
  if (f.name && u.name !== f.name) return false;
  return true;
}

// 場の該当ユニット数
//   scope: "own"（自分の場・既定）/ "enemy"（相手の場）/ "both"
//   includeSelf: false にすると自身を数えない（既定は数える）
function fieldCount(state, side, unit, e) {
  const other = side === "blue" ? "red" : "blue";
  const sides = e.scope === "enemy" ? [other] : e.scope === "both" ? [side, other] : [side];
  let n = 0;
  sides.forEach(sd => state.board[sd].flat().forEach(u => {
    if (!u) return;
    if (u === unit && e.includeSelf === false) return;
    if (matchFilter(u, e.filter)) n++;
  }));
  return n;
}

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

// 基礎値 + 一時強化 + 場の数による強化 + 条件付き効果 を再計算
export function applyConditionals(state, side) {
  ["blue", "red"].forEach(s => {
    const cost = s === "blue" ? state.playerCost : state.aiCost;
    const hand = (s === "blue" ? state.playerHand : state.aiHand) || [];

    state.board[s].forEach((col, ci) => col.forEach((unit, ri) => {
      if (!unit) return;
      const act = unit.effect?.action;
      const atkField = act === "atk_plus_by_field";
      const vField = act === "vrange_plus_by_field";
      if (!unit.conditional && !atkField && !vField) return;

      unit.atk    = (unit.baseAtk ?? unit.atk) + (unit.atkTempUp || 0);
      unit.vRange = unit.baseVRange ?? unit.vRange;
      unit.tags   = [...(unit.baseTags || unit.tags || [])];

      if (atkField) unit.atk    += fieldCount(state, s, unit, unit.effect) * (unit.effect.amount || 1);
      if (vField)   unit.vRange += fieldCount(state, s, unit, unit.effect) * (unit.effect.amount || 1);

      const list = Array.isArray(unit.conditional) ? unit.conditional
        : unit.conditional ? [unit.conditional] : [];
      list.forEach(({ condition, effect }) => {
        if (checkCondition(condition, { unit, ci, ri, board: state.board, side: s, cost, hand }))
          applyCondEffect(effect, unit);
      });
    }));
  });
  return state;
}
