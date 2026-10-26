import { UnitCell } from './CardDesign.jsx';
import { rowToCoord, getAttackTargets, getMovable } from '../engine/battle.js';

const CELL = 90;
const COLS = 3;
const ROWS = 6;
const W = CELL * COLS;
const H = CELL * ROWS;

export function Board({
  board, active, phase = "summon",
  selectedUnit, selectedSpell, selectedGrowth, gameOver,
  mode, turn, firstPlayer,
  draggingCard, onCellClick, onDragOver, onDrop, onDragLeave,
  dropPreview, playerGrave, aiGrave, playerDeck, aiDeck,
  flipped = false,
}) {
  const enem = active === "blue" ? "red" : "blue";
  const turn1block = turn === 1 && active === firstPlayer;
  const rowOf = i => (active === "blue" ? 3 + i : 2 - i); // 自陣のidx→行

  const attackSet = new Set();
  const moveSet = new Set();
  const selSet = new Set();
  const growthSet = new Set();
  const spellSet = new Set();

  // 選択ユニット: 攻撃フェーズ=攻撃先 / 移動フェーズ=移動先
  if (selectedUnit && !turn1block) {
    const su = selectedUnit;
    const att = board[active][su.col]?.[su.idx];
    selSet.add(`${active}-${su.col}-${su.idx}`);
    if (att) {
      if (phase === "attack")
        getAttackTargets(active, su.col, su.idx, att, board)
          .forEach(t => attackSet.add(`${enem}-${t.col}-${t.idx}`));
      if (phase === "move" && !att.moved)
        getMovable(active, su.col, su.idx, board)
          .forEach(m => moveSet.add(`${active}-${m.col}-${m.idx}`));
    }
  }

  // 成長（召喚フェーズのみ）
  if (phase === "summon" && !gameOver && !(mode === "pve" && active === "red")) {
    board[active].forEach((colArr, c) => colArr.forEach((u, i) => {
      if (u?.effect?.action === "growth" && !u.acted && u.summonedTurn !== turn)
        growthSet.add(`${active}-${c}-${i}`);
    }));
  }
  if (selectedGrowth) selSet.add(`${active}-${selectedGrowth.col}-${selectedGrowth.idx}`);

    // 対象指定スペルの対象候補（選択中 または ドラッグ中）
  const dragSpell = draggingCard && (draggingCard.card.type === "spell" || draggingCard.card.type === "magic")
    ? draggingCard.card : null;
  const spellCard = selectedSpell?.card || dragSpell;
  if (spellCard) {
    const t = spellCard.targetType;
    ["blue", "red"].forEach(s => board[s].forEach((colArr, c) => colArr.forEach((u, i) => {
      if (!u) return;
      const ally = s === active;
      const ok = (t === "enemy" && !ally)
        || (t === "enemy_noncore" && !ally && !u.isCore)
        || (t === "ally" && ally)
        || (t === "ally_wall" && ally && u.attr === "wall")
        || (t === "ally_machine" && ally && u.attr === "machine");
      if (ok) spellSet.add(`${s}-${c}-${i}`);
    })));
  }

  // ドロップ可能マス: ユニット=最後尾の1マス / 施設=列内どこでも
  const dropableSet = new Set();
    if (draggingCard && !dragSpell && phase === "summon") {
    const isFac = draggingCard.card.type === "facility";
    for (let c = 0; c < 3; c++) {
      const len = board[active][c].length;
      if (len >= 3) continue;
      if (isFac) for (let i = 0; i <= len; i++) dropableSet.add(`${rowOf(i)}-${c}`);
      else dropableSet.add(`${rowOf(len)}-${c}`);
    }
  }

  // 施設の割り込みで押し出されるユニット
  const pushedUnits = new Set();
  if (dropPreview) {
    board[active][dropPreview.col]?.forEach((u, i) => {
      if (i >= dropPreview.insertIdx && u) pushedUnits.add(u.uid);
    });
  }

  const rowOrder = flipped ? [5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5];

  return (
    <div className="flex gap-1 mx-auto flex-shrink-0" style={{ width: "fit-content" }}>
      <div className="relative flex-shrink-0 bg-white border border-black"
        style={{ width: `${W}px`, height: `${H}px`, touchAction: "none" }}
        onDragLeave={onDragLeave}>

        <svg className="absolute inset-0 pointer-events-none" width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ zIndex: 0 }}>
          {[CELL, CELL * 2].map(x => <line key={x} x1={x} y1="0" x2={x} y2={H} stroke="black" strokeWidth="1"/>)}
          {[1, 2, 3, 4, 5].map(r => (
            <line key={r} x1="0" y1={r * CELL} x2={W} y2={r * CELL} stroke="black" strokeWidth={r === 3 ? "2" : "1"}/>
          ))}
        </svg>

        <div className="absolute inset-0 grid"
          style={{ gridTemplateColumns: `repeat(${COLS},${CELL}px)`, gridTemplateRows: `repeat(${ROWS},${CELL}px)` }}>
          {rowOrder.flatMap(row =>
            Array.from({ length: COLS }).map((_, col) => {
              const { side, idx } = rowToCoord(row);
              const unitKey = `${side}-${col}-${idx}`;
              const unit = board[side][col][idx];
              const isDrop = dropableSet.has(`${row}-${col}`);
              const isInsert = dropPreview && side === active && col === dropPreview.col && idx === dropPreview.insertIdx;

              let bg = "transparent";
              if (selSet.has(unitKey)) bg = "rgba(0,0,0,0.10)";
              else if (attackSet.has(unitKey)) bg = "rgba(255,100,0,0.18)";
              else if (moveSet.has(unitKey)) bg = "rgba(0,180,0,0.15)";
              else if (spellSet.has(unitKey)) bg = "rgba(255,190,0,0.22)";
              else if (isDrop) bg = "rgba(100,0,200,0.10)";
              else if (growthSet.has(unitKey)) bg = "rgba(0,160,0,0.10)";

              return (
                <div key={`${row}-${col}`}
                  data-cell="1" data-row={row} data-col={col}
                  style={{ width: `${CELL}px`, height: `${CELL}px`, backgroundColor: bg, position: "relative", zIndex: 1 }}
                  onClick={e => { e.stopPropagation(); if (!gameOver) onCellClick(row, col); }}
                  onDragOver={e => onDragOver(e, row, col)}
                  onDrop={e => onDrop(e, row, col)}>
                  {isDrop && !unit && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400"
                      style={{ fontSize: "1.6rem" }}>＋</div>
                  )}
                  {isInsert && unit && (
                    <div className="absolute top-0 left-0 right-0 flex justify-center z-20 pointer-events-none">
                      <div className="text-black text-xs font-bold">▼</div>
                    </div>
                  )}
                  {unit && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <UnitCell unit={unit} pushed={pushedUnits.has(unit.uid)}/>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* サイドパネル */}
      <div className="flex flex-col justify-between flex-shrink-0" style={{ width: "36px" }}>
        <div className="flex flex-col gap-1">
          <SideBox label="デッキ" count={flipped ? playerDeck : aiDeck}/>
          <SideBox label="墓地" count={(flipped ? playerGrave : aiGrave || []).length}/>
        </div>
        <div className="text-center text-gray-400" style={{ fontSize: "0.5rem" }}>前<br/>線</div>
        <div className="flex flex-col gap-1">
          <SideBox label="墓地" count={(flipped ? aiGrave : playerGrave || []).length}/>
          <SideBox label="デッキ" count={flipped ? aiDeck : playerDeck}/>
        </div>
      </div>
    </div>
  );
}

function SideBox({ label, count }) {
  return (
    <div className="border border-black text-center" style={{ width: "36px", height: "52px", fontSize: "0.5rem" }}>
      <div className="font-bold border-b border-black">{label}</div>
      <div className="text-lg font-bold leading-tight">{count}</div>
    </div>
  );
}
